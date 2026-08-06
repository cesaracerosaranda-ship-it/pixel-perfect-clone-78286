import { supabase } from "@/integrations/supabase/client";
import { upsertCliente } from "@/lib/vialux/clientes";

/**
 * Bitácora de contacto.
 *
 * Una tarea siempre nace de una conversación, por eso vive en una sola tabla:
 * lo que se habló (`nota`) y lo que se prometió (`proxima_accion` +
 * `proxima_fecha`) son el mismo registro.
 */

export type TipoContacto = "whatsapp" | "llamada" | "correo" | "visita" | "nota";

export const TIPOS_CONTACTO: { key: TipoContacto; label: string }[] = [
  { key: "whatsapp", label: "WhatsApp" },
  { key: "llamada", label: "Llamada" },
  { key: "correo", label: "Correo" },
  { key: "visita", label: "Visita" },
  { key: "nota", label: "Nota" },
];

export type Contacto = {
  id: string;
  cliente_id: string;
  cotizacion_id: string | null;
  fecha: string;
  tipo: TipoContacto;
  nota: string;
  proxima_accion: string | null;
  proxima_fecha: string | null;
  cumplida: boolean;
};

/** Bitácora de un cliente, de lo más reciente a lo más viejo. */
export async function contactosDe(clienteId: string): Promise<Contacto[]> {
  const { data, error } = await supabase
    .from("contactos")
    .select("*")
    .eq("cliente_id", clienteId)
    .order("fecha", { ascending: false });
  if (error) return [];
  return (data ?? []) as Contacto[];
}

/** Todos los contactos recientes — alimenta la lista de Inicio. */
export async function contactosRecientes(limite = 3000): Promise<Contacto[]> {
  const { data, error } = await supabase
    .from("contactos")
    .select("*")
    .order("fecha", { ascending: false })
    .limit(limite);
  if (error) return [];
  return (data ?? []) as Contacto[];
}

/**
 * Inserta un contacto y devuelve su id.
 *
 * El id importa porque quien registra desde Inicio lo hace con un solo clic y
 * la nota llega después: hay que saber a qué fila adjuntarla.
 */
export async function registrarContacto(c: {
  cliente_id: string;
  cotizacion_id?: string | null;
  tipo: TipoContacto;
  nota: string;
  proxima_accion?: string | null;
  proxima_fecha?: string | null;
}): Promise<{ id: string | null; error: string | null }> {
  const { data, error } = await supabase
    .from("contactos")
    .insert({
      cliente_id: c.cliente_id,
      cotizacion_id: c.cotizacion_id ?? null,
      tipo: c.tipo,
      nota: c.nota.trim(),
      proxima_accion: c.proxima_accion?.trim() || null,
      proxima_fecha: c.proxima_fecha || null,
    })
    .select("id")
    .single();
  return { id: data?.id ?? null, error: error ? error.message : null };
}

/**
 * Registra un seguimiento desde Inicio, de un clic.
 *
 * Las filas de Inicio son cotizaciones y `cotizaciones.cliente_id` admite nulo,
 * pero `contactos.cliente_id` es obligatorio y tiene llave foránea. En las
 * cotizaciones viejas sin cliente ligado el insert fallaría, así que aquí se
 * resuelve primero con `upsertCliente`: lo busca por nombre y si no existe lo
 * crea. De paso el directorio se va completando solo.
 */
export async function registrarSeguimiento(args: {
  clienteId: string | null;
  nombre: string;
  empresa?: string | null;
  telefono?: string | null;
  cotizacionId?: string | null;
  tipo?: TipoContacto;
}): Promise<{ id: string | null; error: string | null }> {
  let clienteId = args.clienteId;

  if (!clienteId) {
    clienteId = await upsertCliente({
      nombre: args.nombre,
      empresa: args.empresa ?? undefined,
      telefono: args.telefono ?? undefined,
    });
    if (!clienteId) {
      return { id: null, error: "Falta ligar el cliente: la cotización no trae nombre utilizable" };
    }
  }

  return registrarContacto({
    cliente_id: clienteId,
    cotizacion_id: args.cotizacionId ?? null,
    tipo: args.tipo ?? "whatsapp",
    nota: "",
  });
}

/**
 * Completa un seguimiento ya registrado con la nota y/o el próximo paso.
 *
 * Va aparte del registro porque el clic tiene que ser uno solo: primero queda
 * la constancia, y si César escribe algo se adjunta después.
 */
export async function completarSeguimiento(
  id: string,
  patch: { nota?: string; proxima_accion?: string | null; proxima_fecha?: string | null },
): Promise<string | null> {
  const fields: { nota?: string; proxima_accion?: string | null; proxima_fecha?: string | null } = {};
  if (patch.nota !== undefined) fields.nota = patch.nota.trim();
  if (patch.proxima_accion !== undefined) fields.proxima_accion = patch.proxima_accion?.trim() || null;
  if (patch.proxima_fecha !== undefined) fields.proxima_fecha = patch.proxima_fecha || null;
  if (!Object.keys(fields).length) return null;

  const { error } = await supabase.from("contactos").update(fields).eq("id", id);
  return error ? error.message : null;
}

export async function marcarCumplida(id: string): Promise<string | null> {
  const { error } = await supabase.from("contactos").update({ cumplida: true }).eq("id", id);
  return error ? error.message : null;
}

export async function borrarContacto(id: string): Promise<string | null> {
  const { error } = await supabase.from("contactos").delete().eq("id", id);
  return error ? error.message : null;
}

/** Días transcurridos desde una fecha ISO. */
export function diasDesde(iso: string | null | undefined): number {
  if (!iso) return Number.POSITIVE_INFINITY;
  return Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000));
}

/**
 * Último contacto registrado por cliente.
 *
 * Es lo que permite que la lista de Inicio no te empuje a perseguir a alguien
 * con quien ya hablaste ayer. Sin esto la lista es pura inferencia de fechas.
 */
export function ultimoContactoPorCliente(cs: Contacto[]): Map<string, Contacto> {
  const m = new Map<string, Contacto>();
  for (const c of cs) {
    const prev = m.get(c.cliente_id);
    if (!prev || new Date(c.fecha) > new Date(prev.fecha)) m.set(c.cliente_id, c);
  }
  return m;
}

/** Recordatorios vencidos o que caen hoy, del más atrasado al más reciente. */
export function recordatoriosVigentes(cs: Contacto[]): Contacto[] {
  const hoy = new Date().toISOString().slice(0, 10);
  return cs
    .filter((c) => !c.cumplida && c.proxima_fecha && c.proxima_fecha <= hoy)
    .sort((a, b) => (a.proxima_fecha! < b.proxima_fecha! ? -1 : 1));
}
