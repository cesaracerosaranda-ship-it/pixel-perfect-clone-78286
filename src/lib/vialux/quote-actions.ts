import { supabase } from "@/integrations/supabase/client";
import { formatMoney, VIGENCIA_DIAS } from "./constants";
import type { QuoteState } from "@/hooks/useQuoteState";

export async function generateFolio(revision: number, parent?: string | null): Promise<string> {
  if (revision > 0 && parent) {
    return `${parent}-R${revision}`;
  }
  const year = new Date().getFullYear();
  const { data, error } = await supabase.rpc("next_folio", { p_year: year });
  if (error || !data) throw new Error(error?.message ?? "No se pudo generar el folio");
  return data as unknown as string;
}

export type QuoteRow = {
  id?: string;
  folio: string;
  fecha?: string;
  cliente_id?: string | null;
  cliente_nombre: string;
  cliente_empresa: string;
  cliente_telefono: string;
  cp_destino: string;
  municipio: string;
  estado_destino: string;
  producto: string;
  descripcion_producto: string;
  cantidad: number;
  precio_unitario: number;
  requiere_factura: boolean;
  precio_especial: boolean;
  subtotal_producto: number;
  incluye_flete: boolean;
  flete_paqueteria: string;
  flete_modalidad: string;
  flete_costo: number;
  subtotal_general: number;
  iva: number;
  total: number;
  margen_porcentaje: number;
  estado: "cotizado" | "cerrado" | "enviado" | "perdido";
  revision: number;
  folio_padre: string | null;
  notas_internas: string;
};

export function buildWhatsAppUrl(state: QuoteState, folio: string, total: number) {
  const tel = (state.telefono || "").replace(/\D/g, "");
  const msg = `Hola ${state.cliente}, le comparto la cotización ${folio} de VIALUX por un total de ${formatMoney(
    total,
  )} MXN. Vigencia: ${VIGENCIA_DIAS} días. — Augusto Robles.`;
  return `https://wa.me/${tel}?text=${encodeURIComponent(msg)}`;
}

export function buildMailto(state: QuoteState, folio: string, total: number) {
  const subject = `Cotización ${folio} — VIALUX`;
  const body = `Estimado(a) ${state.cliente},\n\nAdjunto encontrará la cotización ${folio} de VIALUX por un total de ${formatMoney(
    total,
  )} MXN.\nVigencia: ${VIGENCIA_DIAS} días naturales.\n\nQuedo atento,\nAugusto Robles\nVIALUX — Señalización Vial`;
  return `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}
