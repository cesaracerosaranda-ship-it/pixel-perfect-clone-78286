import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { calcular, type QuoteState, initialQuote } from "@/hooks/useQuoteState";
import { deliveryMessage } from "@/lib/vialux/constants";
import { buildWhatsAppUrl, buildMailto } from "@/lib/vialux/quote-actions";
import { generateQuotePdf } from "@/lib/pdf/generateQuotePdf";
import { archivarCotizacionPdf, ligaPdfCotizacion } from "@/lib/vialux/documentos";

type Cot = Tables<"cotizaciones">;

/**
 * Reenviar una cotización YA GUARDADA sin crear otra revisión.
 *
 * El cotizador solo sabe trabajar sobre el formulario vivo; abrir una fila de
 * Historial ahí pasaría por `duplicate` y nacería una R+1 que nadie pidió.
 * Estas funciones reconstruyen el documento DESDE LA FILA, con una regla de
 * fidelidad: el precio unitario guardado se fuerza como precio especial, para
 * que el PDF reproduzca el documento emitido aunque la lista de precios haya
 * cambiado desde entonces. Reenviar jamás re-cotiza.
 */
export function estadoDesdeFila(row: Cot, email = ""): QuoteState {
  return {
    ...initialQuote,
    cliente: row.cliente_nombre,
    empresa: row.cliente_empresa === "-" ? "" : (row.cliente_empresa ?? ""),
    telefono: row.cliente_telefono ?? "",
    email,
    cp: row.cp_destino ?? "",
    municipio: row.municipio ?? "",
    estadoNombre: row.estado_destino ?? "",
    producto: (row.producto as QuoteState["producto"]) ?? "boya_clavos",
    cantidad: row.cantidad,
    requiereFactura: row.requiere_factura,
    precioEspecialOn: true,
    precioEspecial: Number(row.precio_unitario),
    notas: row.notas_internas ?? "",
    revision: row.revision ?? 0,
    folioPadre: row.folio_padre,
    incluyeFlete: row.incluye_flete,
    fletePaqueteria: row.flete_paqueteria ?? "",
    fleteModalidad:
      (row.flete_modalidad as QuoteState["fleteModalidad"]) || "ENTREGA A DOMICILIO",
    fleteCosto: Number(row.flete_costo ?? 0),
  };
}

async function emailDeFila(row: Cot): Promise<string> {
  if (!row.cliente_id) return "";
  const { data } = await supabase
    .from("clientes")
    .select("email")
    .eq("id", row.cliente_id)
    .maybeSingle();
  return (data?.email ?? "").trim();
}

/**
 * Garantiza el PDF archivado de la fila y devuelve una liga firmada de 30 días.
 *
 * Antes de regenerar verifica que el recálculo reproduzca el total guardado:
 * si no cuadra (fila histórica con reglas viejas), se aborta con error en vez
 * de emitir un PDF con cifras distintas a las del documento original.
 */
export async function ligaPdfDeFila(
  row: Cot,
): Promise<{ url: string | null; error: string | null }> {
  try {
    let url = await ligaPdfCotizacion(row.id);
    if (url) return { url, error: null };

    if (!row.cliente_id) {
      return { url: null, error: "La fila no tiene cliente ligado; no hay expediente donde archivar el PDF" };
    }
    const state = estadoDesdeFila(row);
    const calc = calcular(state);
    if (Math.abs(calc.total - Number(row.total)) > 0.01) {
      return {
        url: null,
        error: `El recálculo (${calc.total.toFixed(2)}) no cuadra con el total guardado (${Number(row.total).toFixed(2)}); no se regenera el PDF para no alterar el documento`,
      };
    }
    const { filename, blob } = await generateQuotePdf({
      folio: row.folio,
      state,
      calc,
      deliveryMsg: deliveryMessage(state.cp, state.cantidad),
      download: false,
    });
    await archivarCotizacionPdf({
      clienteId: row.cliente_id,
      cotizacionId: row.id,
      blob,
      nombre: filename,
    });
    url = await ligaPdfCotizacion(row.id);
    return { url, error: null };
  } catch (e) {
    return { url: null, error: (e as Error).message };
  }
}

/** wa.me con el resumen del documento y su liga. Null si no hay teléfono. */
export async function whatsappDeFila(row: Cot): Promise<{ url: string | null; error: string | null }> {
  if (!(row.cliente_telefono ?? "").trim()) {
    return { url: null, error: "La fila no tiene teléfono" };
  }
  const { url: pdfUrl } = await ligaPdfDeFila(row);
  const state = estadoDesdeFila(row);
  return { url: buildWhatsAppUrl(state, row.folio, Number(row.total), pdfUrl), error: null };
}

/**
 * Envío por correo con la misma jerarquía que el cotizador: primero la función
 * (Gmail de VIALUX con PDF adjunto), y si no puede, el borrador mailto con la
 * liga. Devuelve a qué correo salió y por cuál vía.
 */
export async function correoDeFila(
  row: Cot,
): Promise<{ via: "funcion" | "borrador"; email: string } > {
  const email = await emailDeFila(row);

  try {
    const { data, error } = await supabase.functions.invoke("enviar-cotizacion", {
      body: { cotizacion_id: row.id },
    });
    if (error) {
      let motivo = error.message;
      const ctx = (error as { context?: Response }).context;
      if (ctx && typeof ctx.json === "function") {
        try {
          const body = (await ctx.json()) as { error?: string };
          if (body?.error) motivo = body.error;
        } catch { /* cuerpo no-JSON */ }
      }
      throw new Error(motivo);
    }
    if (data?.error) throw new Error(data.error);
    return { via: "funcion", email: data?.email ?? email };
  } catch (err) {
    if (!email) throw err instanceof Error ? err : new Error(String(err));
    const { url: pdfUrl } = await ligaPdfDeFila(row);
    const state = estadoDesdeFila(row, email);
    window.location.href = buildMailto(state, row.folio, Number(row.total), pdfUrl);
    return { via: "borrador", email };
  }
}

/**
 * Filas sustituidas por una revisión más nueva de la misma cadena de folio.
 *
 * Se DERIVA, no se guarda: en cuanto existe la R+1, la anterior deja de contar
 * — sin estados nuevos ni sincronización que se pudra. Solo aplica a filas
 * abiertas (cotizado/enviado): una cerrada o perdida es historia y se respeta.
 */
export function idsSustituidas(rows: Pick<Cot, "id" | "folio" | "folio_padre" | "revision" | "estado">[]): Set<string> {
  const maxRev = new Map<string, number>();
  for (const r of rows) {
    const raiz = r.folio_padre ?? r.folio;
    const rev = r.revision ?? 0;
    if ((maxRev.get(raiz) ?? -1) < rev) maxRev.set(raiz, rev);
  }
  const out = new Set<string>();
  for (const r of rows) {
    if (r.estado !== "cotizado" && r.estado !== "enviado") continue;
    const raiz = r.folio_padre ?? r.folio;
    if ((r.revision ?? 0) < (maxRev.get(raiz) ?? 0)) out.add(r.id);
  }
  return out;
}

/** El folio de la revisión más nueva de la cadena a la que pertenece la fila. */
export function folioSucesor(
  row: Pick<Cot, "folio" | "folio_padre" | "revision">,
  rows: Pick<Cot, "folio" | "folio_padre" | "revision">[],
): string | null {
  const raiz = row.folio_padre ?? row.folio;
  let mejor: { folio: string; rev: number } | null = null;
  for (const r of rows) {
    if ((r.folio_padre ?? r.folio) !== raiz) continue;
    const rev = r.revision ?? 0;
    if (rev > (row.revision ?? 0) && (!mejor || rev > mejor.rev)) {
      mejor = { folio: r.folio, rev };
    }
  }
  return mejor?.folio ?? null;
}
