import { supabase } from "@/integrations/supabase/client";

/**
 * Busca el cliente por nombre y devuelve su id para ligar la cotización.
 * Si no existe, lo crea. Si existe, rellena/actualiza teléfono y empresa
 * cuando la cotización trae datos más recientes (backfill) — sin esto,
 * el teléfono capturado en el cotizador nunca llega al directorio.
 */
export async function upsertCliente(input: {
  nombre: string;
  empresa?: string;
  telefono?: string;
  email?: string;
}): Promise<string | null> {
  const nombre = (input.nombre || "").trim().toUpperCase();
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
