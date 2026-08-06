import { supabase } from "@/integrations/supabase/client";

/**
 * Nombres que no identifican a nadie.
 *
 * Cotizar "A QUIEN CORRESPONDA" es el caso normal cuando quien llama no da sus
 * datos. El problema es que el directorio empareja por nombre: sin esto, TODAS
 * las cotizaciones a quien corresponda colapsan en un solo cliente y se
 * mezclan las bitácoras de empresas que no tienen nada que ver.
 */
const NOMBRES_GENERICOS = new Set([
  "", "-", "—", "A QUIEN CORRESPONDA", "QUIEN CORRESPONDA", "SIN NOMBRE", "N/A", "NA",
]);

export function esNombreGenerico(valor: string | null | undefined): boolean {
  return NOMBRES_GENERICOS.has((valor ?? "").trim().toUpperCase());
}

/**
 * Con qué nombre vive este cliente en el directorio.
 *
 * Si hay persona, manda la persona. Si no la hay pero sí empresa, manda la
 * empresa — que en B2B industrial es de todos modos la entidad que perdura.
 * Si no hay ninguna de las dos, no se puede identificar y no se crea nada.
 */
export function identidadCliente(input: {
  nombre?: string | null;
  empresa?: string | null;
}): string | null {
  const nombre = (input.nombre ?? "").trim().toUpperCase();
  if (!esNombreGenerico(nombre)) return nombre;
  const empresa = (input.empresa ?? "").trim().toUpperCase();
  if (!esNombreGenerico(empresa)) return empresa;
  return null;
}

/** Cómo se muestra en pantalla: la empresa cuando la persona es anónima. */
export function nombreParaMostrar(input: {
  nombre?: string | null;
  empresa?: string | null;
}): string {
  const id = identidadCliente(input);
  if (id) return id;
  return (input.nombre ?? "").trim().toUpperCase() || "SIN NOMBRE";
}

/**
 * Busca el cliente y devuelve su id para ligar la cotización.
 * Si no existe, lo crea. Si existe, rellena/actualiza teléfono y empresa
 * cuando la cotización trae datos más recientes (backfill) — sin esto,
 * el teléfono capturado en el cotizador nunca llega al directorio.
 *
 * Empareja por `identidadCliente`, no por el nombre crudo.
 */
export async function upsertCliente(input: {
  nombre: string;
  empresa?: string;
  telefono?: string;
  email?: string;
}): Promise<string | null> {
  const nombre = identidadCliente(input);
  if (!nombre) return null;
  const empresaRaw = (input.empresa || "").trim().toUpperCase();
  const empresa = empresaRaw === "-" || empresaRaw === "—" ? "" : empresaRaw;
  const telefono = (input.telefono || "").trim();
  const email = (input.email || "").trim();

  const { data: existing } = await supabase
    .from("clientes")
    .select("id, empresa, telefono, email")
    .eq("nombre", nombre)
    .maybeSingle();

  if (existing) {
    const patch: { telefono?: string; empresa?: string; email?: string } = {};
    if (telefono && telefono !== existing.telefono) patch.telefono = telefono;
    if (empresa && empresa !== existing.empresa) patch.empresa = empresa;
    if (email && email !== existing.email) patch.email = email;
    if (Object.keys(patch).length) {
      await supabase.from("clientes").update(patch).eq("id", existing.id);
    }
    return existing.id;
  }

  const { data: created } = await supabase
    .from("clientes")
    .insert({ nombre, empresa, telefono, email })
    .select("id")
    .single();
  return created?.id ?? null;
}
