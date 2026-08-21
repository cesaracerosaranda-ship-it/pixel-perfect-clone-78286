import { supabase } from "@/integrations/supabase/client";

/**
 * Corte de inventario.
 *
 * Un saldo sin historial no se puede auditar: cuando el contador no coincidía
 * con la bodega no había manera de saber si faltaba producto, si una venta se
 * descontó dos veces o si el conteo anterior estaba mal. La tabla
 * `movimientos_inventario` guarda cada cambio con su origen, y este módulo la
 * lee para armar el corte desde la última recaptura.
 */

/** Clavos que consume una boya. Vive aquí y en el trigger; si cambia, cambian ambos. */
export const CLAVOS_POR_BOYA = 4;

export type OrigenMovimiento = "venta" | "ajuste";

export type Movimiento = {
  id: string;
  fecha: string;
  origen: OrigenMovimiento;
  cotizacion_id: string | null;
  delta_boyas: number;
  delta_clavos: number;
  boyas_despues: number;
  clavos_despues: number;
};

// La tabla es nueva y `types.ts` lo regenera Lovable, no el repo. Se accede con
// un cliente sin tipar para que el build no dependa de ese paso.
const api = supabase as unknown as {
  from: (t: string) => {
    select: (c: string) => {
      order: (
        c: string,
        o: { ascending: boolean },
      ) => {
        limit: (n: number) => Promise<{ data: Movimiento[] | null; error: { message: string } | null }>;
      };
    };
  };
};

/**
 * Los movimientos más recientes.
 *
 * Se traen de una sola vez y el corte se calcula en memoria: con un puñado de
 * ventas al día, doscientas filas cubren meses y evitan tres consultas.
 */
export async function movimientosRecientes(limite = 200): Promise<Movimiento[]> {
  const { data, error } = await api
    .from("movimientos_inventario")
    .select("*")
    .order("fecha", { ascending: false })
    .limit(limite);
  if (error) throw new Error(error.message);
  return data ?? [];
}

export type Corte = {
  /** Última recaptura manual: el punto desde el que tiene sentido comparar. */
  referencia: Movimiento | null;
  ventas: number;
  boyasVendidas: number;
  clavosConsumidos: number;
  /**
   * Lo que se corrigió EN esa recaptura (contado menos esperado).
   *
   * Vive en la referencia y no en los movimientos posteriores por una razón
   * estructural: como la referencia es siempre el ajuste más reciente, cualquier
   * corrección posterior pasaría a ser la nueva referencia. El número que
   * interesa —cuánto se movió el contador al enfrentarlo con la bodega— es
   * justamente el delta de ese ajuste.
   */
  correccionBoyas: number;
  correccionClavos: number;
  movimientos: Movimiento[];
};

/**
 * Arma el corte a partir de la última recaptura manual.
 *
 * Se toma ese punto como origen porque es el único momento en que el contador
 * se comparó contra algo real: alguien fue, contó, y capturó lo que había.
 * Todo lo anterior es aritmética sobre una cifra que ya nadie puede verificar.
 *
 * Sin ninguna recaptura todavía se reporta el histórico completo disponible, que
 * es lo más honesto que se puede decir: no hay punto de comparación.
 */
export function calcularCorte(movs: Movimiento[]): Corte {
  const orden = [...movs].sort((a, b) => b.fecha.localeCompare(a.fecha));
  const referencia = orden.find((m) => m.origen === "ajuste") ?? null;

  const desde = referencia ? orden.filter((m) => m.fecha > referencia.fecha) : orden;
  const ventas = desde.filter((m) => m.origen === "venta");

  return {
    referencia,
    ventas: ventas.length,
    // Los deltas de venta son negativos; se reportan en positivo como "salidas".
    boyasVendidas: -ventas.reduce((s, m) => s + m.delta_boyas, 0),
    clavosConsumidos: -ventas.reduce((s, m) => s + m.delta_clavos, 0),
    correccionBoyas: referencia?.delta_boyas ?? 0,
    correccionClavos: referencia?.delta_clavos ?? 0,
    movimientos: desde,
  };
}
