import { supabase } from "@/integrations/supabase/client";

/**
 * Bitácora de contacto.
 *
 * `contactos` no entra a types.ts hasta que Lovable aplique la migración
 * 20260804120000, así que se accede con un tipo mínimo propio. Igual que con
 * `pagos`: el build no depende de la regeneración de tipos y la UI degrada sin
 * romperse si la tabla aún no existe.
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

type Res<T> = { data: T | null; error: { message: string } | null };
type Filtro = { eq: (c: string, v: string) => PromiseLike<Res<Contacto[]>> } & PromiseLike<Res<Contacto[]>>;
type Api = {
  select: (cols: string) => {
    order: (c: string, o: { ascending: boolean }) => { limit: (n: number) => PromiseLike<Res<Contacto[]>> };
    eq: (c: string, v: string) => {
      order: (c: string, o: { ascending: boolean }) => PromiseLike<Res<Contacto[]>>;
    };
  };
  insert: (row: Record<string, unknown>) => PromiseLike<Res<null>>;
  update: (row: Record<string, unknown>) => { eq: (c: string, v: string) => PromiseLike<Res<null>> };
  delete: () => { eq: (c: string, v: string) => PromiseLike<Res<null>> };
};

export const tablaContactos = (): Api =>
  (supabase as unknown as { from: (t: string) => Api }).from("contactos");

/** Bitácora de un cliente, de lo más reciente a lo más viejo. */
export async function contactosDe(clienteId: string): Promise<Contacto[]> {
  const { data, error } = await tablaContactos()
    .select("*")
    .eq("cliente_id", clienteId)
    .order("fecha", { ascending: false });
  if (error) return [];
  return data ?? [];
}

/** Todos los contactos recientes — alimenta las colas de Inicio. */
export async function contactosRecientes(limite = 3000): Promise<Contacto[]> {
  const { data, error } = await tablaContactos()
    .select("*")
    .order("fecha", { ascending: false })
    .limit(limite);
  if (error) return [];
  return data ?? [];
}

export async function registrarContacto(c: {
  cliente_id: string;
  cotizacion_id?: string | null;
  tipo: TipoContacto;
  nota: string;
  proxima_accion?: string | null;
  proxima_fecha?: string | null;
}): Promise<string | null> {
  const { error } = await tablaContactos().insert({
    cliente_id: c.cliente_id,
    cotizacion_id: c.cotizacion_id ?? null,
    tipo: c.tipo,
    nota: c.nota.trim(),
    proxima_accion: c.proxima_accion?.trim() || null,
    proxima_fecha: c.proxima_fecha || null,
  });
  return error ? error.message : null;
}

export async function marcarCumplida(id: string): Promise<string | null> {
  const { error } = await tablaContactos().update({ cumplida: true }).eq("id", id);
  return error ? error.message : null;
}

export async function borrarContacto(id: string): Promise<string | null> {
  const { error } = await tablaContactos().delete().eq("id", id);
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
 * Sirve para lo más importante del panel: si ya hablaste con alguien ayer, Inicio
 * NO debe seguir empujándote a perseguirlo. Sin esto, las colas son solo
 * inferencias de fechas y te mandan a molestar a gente con la que ya cerraste
 * el siguiente paso.
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
