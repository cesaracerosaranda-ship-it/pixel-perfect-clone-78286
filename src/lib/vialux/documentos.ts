import { supabase } from "@/integrations/supabase/client";

export const DOC_TIPOS = [
  { value: "cotizacion", label: "COTIZACIÓN PDF" },
  { value: "guia_envio", label: "GUÍA DE ENVÍO" },
  { value: "comprobante_pago", label: "COMPROBANTE DE PAGO" },
  { value: "factura", label: "FACTURA" },
  { value: "cotizacion_flete", label: "COTIZACIÓN DE FLETE" },
  { value: "otro", label: "OTRO" },
] as const;

export function docTipoLabel(tipo: string): string {
  return DOC_TIPOS.find((t) => t.value === tipo)?.label ?? tipo.toUpperCase();
}

export type Documento = {
  id: string;
  cliente_id: string;
  cotizacion_id: string | null;
  tipo: string;
  nombre_archivo: string;
  storage_path: string;
  mime_type: string | null;
  size_bytes: number | null;
  created_at: string;
};

/** Documento con URL firmada lista para abrir (el bucket es privado). */
export type DocumentoConUrl = Documento & { url: string | null };

// La tabla `documentos` todavía no está en los tipos generados de Supabase
// (se crea vía migración); este cast evita pelear con el codegen.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = () => supabase as any;

function migracionHint(msg: string): Error {
  if (/bucket|documentos.*schema cache|not found|does not exist/i.test(msg)) {
    return new Error(
      "El expediente documental aún no está configurado en Supabase — aplica la migración 'documentos_expediente' desde Lovable.",
    );
  }
  return new Error(msg);
}

export async function listDocumentos(clienteId: string): Promise<DocumentoConUrl[]> {
  const { data, error } = await db()
    .from("documentos")
    .select("*")
    .eq("cliente_id", clienteId)
    .order("created_at", { ascending: false });
  if (error) throw migracionHint(error.message);
  const docs = (data ?? []) as Documento[];
  if (docs.length === 0) return [];

  // El bucket es privado (el workspace de Lovable bloquea buckets públicos):
  // se generan URLs firmadas por lote, válidas 1 hora — más que suficiente
  // porque la lista se regenera al abrir la ficha del cliente.
  const { data: signed } = await supabase.storage
    .from("documentos")
    .createSignedUrls(docs.map((d) => d.storage_path), 3600);
  const byPath = new Map(
    (signed ?? []).filter((s) => s.path && s.signedUrl).map((s) => [s.path as string, s.signedUrl]),
  );
  return docs.map((d) => ({ ...d, url: byPath.get(d.storage_path) ?? null }));
}

export async function subirDocumento(args: {
  clienteId: string;
  cotizacionId?: string | null;
  tipo: string;
  file: File | Blob;
  nombre?: string;
}): Promise<void> {
  const nombre =
    args.nombre ?? (args.file instanceof File ? args.file.name : "documento.pdf");
  const safe = nombre.replace(/[^A-Za-z0-9._-]+/g, "_");
  const path = `${args.clienteId}/${Date.now()}_${safe}`;
  const mime =
    (args.file instanceof File ? args.file.type : "") || "application/octet-stream";

  const { error: upErr } = await supabase.storage
    .from("documentos")
    .upload(path, args.file, { contentType: mime });
  if (upErr) throw migracionHint(upErr.message);

  const { error } = await db().from("documentos").insert({
    cliente_id: args.clienteId,
    cotizacion_id: args.cotizacionId ?? null,
    tipo: args.tipo,
    nombre_archivo: nombre,
    storage_path: path,
    mime_type: mime,
    size_bytes: args.file.size,
  });
  if (error) {
    // No dejar archivos huérfanos en storage si falla el registro
    await supabase.storage.from("documentos").remove([path]);
    throw migracionHint(error.message);
  }
}

/** Archiva el PDF de una cotización una sola vez (idempotente por cotización). */
export async function archivarCotizacionPdf(args: {
  clienteId: string;
  cotizacionId: string;
  blob: Blob;
  nombre: string;
}): Promise<boolean> {
  const { data } = await db()
    .from("documentos")
    .select("id")
    .eq("cotizacion_id", args.cotizacionId)
    .eq("tipo", "cotizacion")
    .limit(1);
  if (data && data.length > 0) return false;
  await subirDocumento({
    clienteId: args.clienteId,
    cotizacionId: args.cotizacionId,
    tipo: "cotizacion",
    file: args.blob,
    nombre: args.nombre,
  });
  return true;
}

export async function eliminarDocumento(d: Documento): Promise<void> {
  await supabase.storage.from("documentos").remove([d.storage_path]);
  const { error } = await db().from("documentos").delete().eq("id", d.id);
  if (error) throw new Error(error.message);
}
