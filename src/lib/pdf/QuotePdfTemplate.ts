import {
  EJECUTIVO,
  PRODUCTOS,
  SPECS,
  VIGENCIA_DIAS,
  formatInt,
  formatMoney,
} from "@/lib/vialux/constants";
import type { QuoteState } from "@/hooks/useQuoteState";
import type { QuoteCalc } from "./generateQuotePdf";
import logoUrl from "@/assets/vialux-logo.png";

function esc(s: string) {
  return (s || "").replace(/[&<>"]/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c] as string,
  );
}

function fechaLarga(d: Date) {
  return d
    .toLocaleDateString("es-MX", { day: "2-digit", month: "long", year: "numeric" })
    .toUpperCase();
}

function shortSpec(key: QuoteState["producto"]) {
  // línea pequeña debajo de la descripción del producto
  switch (key) {
    case "boya":
      return "ACERO C 1/8 · PINTURA ELECTROSTÁTICA · 22×22×5.5 CM · 1.2 KG · 18 T";
    case "boya_clavos":
      return "ACERO C 1/8 · PINTURA ELECTROSTÁTICA · 22×22×5.5 CM · 1.2 KG · 18 T";
    case "boya_clavos_refl":
      return "ACERO C 1/8 · PINTURA ELECTROSTÁTICA · REFLEJANTES AMBAR/PLATA · 22×22×5.5 CM · 18 T";
  }
}

export function renderQuoteHtml(args: {
  folio: string;
  state: QuoteState;
  calc: QuoteCalc;
  deliveryMsg: string;
}) {
  const { folio, state, calc } = args;
  const prod = PRODUCTOS[state.producto];
  const hoy = new Date();
  const vence = new Date(hoy.getTime() + VIGENCIA_DIAS * 24 * 60 * 60 * 1000);

  // SPECS en pares para 2 columnas
  const pairs: Array<[typeof SPECS[number], typeof SPECS[number] | undefined]> = [];
  for (let i = 0; i < SPECS.length; i += 2) pairs.push([SPECS[i], SPECS[i + 1]]);

  const fleteDestino = [state.cp ? `CP ${esc(state.cp)}` : "", ""]
    .filter(Boolean)
    .join(", ");

  const fleteRow = state.incluyeFlete
    ? `<tr>
        <td style="padding:16px 0;border-top:1px solid #ECECEC;vertical-align:top;">
          <div style="font-weight:800;">ENVÍO VÍA ${esc(
            (state.fletePaqueteria || "PAQUETERÍA").toUpperCase(),
          )} — ${esc(state.fleteModalidad)}${fleteDestino ? " A " + fleteDestino : ""}</div>
        </td>
        <td style="padding:16px 0;border-top:1px solid #ECECEC;text-align:center;font-family:'JetBrains Mono',monospace;">1</td>
        <td style="padding:16px 0;border-top:1px solid #ECECEC;text-align:right;font-family:'JetBrains Mono',monospace;">${formatMoney(
          calc.subtotalFlete,
        )}</td>
        <td style="padding:16px 0;border-top:1px solid #ECECEC;text-align:right;font-weight:800;font-family:'JetBrains Mono',monospace;">${formatMoney(
          calc.subtotalFlete,
        )}</td>
      </tr>`
    : "";

  const ivaRow = state.requiereFactura
    ? `<tr>
        <td colspan="2"></td>
        <td style="padding:6px 0;text-align:right;color:#6B7280;letter-spacing:0.08em;font-size:11px;">IVA (16%)</td>
        <td style="padding:6px 0;text-align:right;font-family:'JetBrains Mono',monospace;">${formatMoney(
          calc.iva,
        )}</td>
      </tr>`
    : "";

  return `
  <div style="font-family:'Manrope',Arial,sans-serif;color:#1C1E22;background:#ffffff;width:794px;">

    <!-- HEADER -->
    <div style="background:#343331;padding:32px 56px 36px;">
      <img src="${logoUrl}" alt="VIALUX" style="height:78px;display:block;" />
    </div>
    <div style="height:6px;background:#EDBA1A;"></div>

    <div style="padding:36px 56px 24px;">
      <!-- CLIENTE + FECHA -->
      <table style="width:100%;border-collapse:collapse;">
        <tr>
          <td style="vertical-align:top;">
            <div style="font-size:11px;letter-spacing:0.18em;color:#8A8F99;text-transform:uppercase;">Cotización para:</div>
            <div style="font-size:28px;font-weight:800;margin-top:6px;line-height:1.1;">${esc(
              state.cliente.toUpperCase(),
            )}</div>
            <div style="margin-top:6px;color:#6B7280;font-size:12px;letter-spacing:0.06em;">ATENDIDO POR: ${EJECUTIVO}</div>
          </td>
          <td style="vertical-align:top;text-align:right;width:35%;">
            <div style="font-family:'JetBrains Mono',monospace;font-size:13px;color:#1C1E22;">${fechaLarga(
              hoy,
            )}</div>
            <div style="font-size:11px;color:#8A8F99;font-style:italic;margin-top:6px;">*VÁLIDA HASTA ${fechaLarga(
              vence,
            )}*</div>
          </td>
        </tr>
      </table>

      <div style="margin-top:18px;display:flex;align-items:center;gap:14px;">
        <span style="background:#EDBA1A;color:#1C1E22;padding:8px 16px;border-radius:6px;font-weight:800;font-size:12px;letter-spacing:0.14em;">SEÑALIZACIÓN VIAL</span>
        <span style="font-family:'JetBrains Mono',monospace;color:#8A8F99;font-size:13px;">FOLIO: ${esc(
          folio,
        )}</span>
      </div>

      <div style="height:1px;background:#1C1E22;margin-top:22px;"></div>

      <!-- TABLA PRINCIPAL -->
      <table style="width:100%;border-collapse:collapse;margin-top:14px;font-size:12px;">
        <thead>
          <tr style="color:#1C1E22;text-transform:uppercase;letter-spacing:0.12em;font-size:11px;">
            <th style="padding:14px 0;text-align:left;font-weight:800;">DESCRIPCIÓN</th>
            <th style="padding:14px 0;text-align:center;font-weight:800;width:18%;">CANTIDAD (PZAS)</th>
            <th style="padding:14px 0;text-align:right;font-weight:800;width:16%;">PRECIO/PZA</th>
            <th style="padding:14px 0;text-align:right;font-weight:800;width:18%;">SUBTOTAL</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style="padding:16px 0;border-top:1px solid #ECECEC;vertical-align:top;padding-right:24px;">
              <div style="font-weight:800;line-height:1.35;">${esc(prod.descripcion)}</div>
              <div style="color:#9CA3AF;font-size:10px;margin-top:6px;letter-spacing:0.04em;font-family:'JetBrains Mono',monospace;">${esc(
                shortSpec(state.producto),
              )}</div>
            </td>
            <td style="padding:16px 0;border-top:1px solid #ECECEC;text-align:center;font-family:'JetBrains Mono',monospace;">${formatInt(
              state.cantidad,
            )}</td>
            <td style="padding:16px 0;border-top:1px solid #ECECEC;text-align:right;font-family:'JetBrains Mono',monospace;">${formatMoney(
              calc.precioUnitario,
            )}</td>
            <td style="padding:16px 0;border-top:1px solid #ECECEC;text-align:right;font-weight:800;font-family:'JetBrains Mono',monospace;">${formatMoney(
              calc.subtotalProducto,
            )}</td>
          </tr>
          ${fleteRow}

          <!-- Totales -->
          <tr>
            <td colspan="2"></td>
            <td style="padding:14px 0 6px;text-align:right;color:#6B7280;letter-spacing:0.08em;font-size:11px;">SUBTOTAL</td>
            <td style="padding:14px 0 6px;text-align:right;font-family:'JetBrains Mono',monospace;">${formatMoney(
              calc.subtotalGeneral,
            )}</td>
          </tr>
          ${ivaRow}
          <tr>
            <td colspan="2"></td>
            <td colspan="2" style="padding:6px 0 0;"><div style="height:2px;background:#EDBA1A;"></div></td>
          </tr>
          <tr>
            <td colspan="2"></td>
            <td style="padding:10px 0;text-align:right;font-weight:800;font-size:18px;">TOTAL</td>
            <td style="padding:10px 0;text-align:right;font-weight:800;font-size:20px;color:#C99B0E;font-family:'JetBrains Mono',monospace;">${formatMoney(
              calc.total,
            )}</td>
          </tr>
        </tbody>
      </table>

      <!-- Entrega + Pago -->
      <table style="width:100%;border-collapse:separate;border-spacing:14px 0;margin-top:18px;">
        <tr>
          <td style="width:50%;vertical-align:top;padding:0;">
            <div style="font-size:11px;letter-spacing:0.16em;font-weight:800;color:#1C1E22;margin-bottom:8px;">TIEMPO DE ENTREGA</div>
            <div style="border:1px solid #E5E7EB;border-radius:10px;padding:16px 18px;">
              <div style="font-weight:800;letter-spacing:0.06em;">${esc(
                args.deliveryMsg,
              )}</div>
              ${
                state.incluyeFlete
                  ? `<div style="color:#6B7280;font-size:11px;margin-top:6px;">ENTREGA VÍA ${esc(
                      (state.fletePaqueteria || "PAQUETERÍA").toUpperCase(),
                    )}</div>${
                      state.cp
                        ? `<div style="color:#6B7280;font-size:11px;">CP ${esc(state.cp)}</div>`
                        : ""
                    }`
                  : `<div style="color:#6B7280;font-size:11px;margin-top:6px;">RECOLECCIÓN EN PLANTA</div>`
              }
            </div>
          </td>
          <td style="width:50%;vertical-align:top;padding:0;">
            <div style="font-size:11px;letter-spacing:0.16em;font-weight:800;color:#1C1E22;margin-bottom:8px;">FORMA DE PAGO</div>
            <div style="border:1px solid #E5E7EB;border-radius:10px;padding:16px 18px;">
              <div style="font-weight:800;letter-spacing:0.06em;">TRANSFERENCIA BANCARIA</div>
              <div style="color:#6B7280;font-size:11px;margin-top:6px;">PAGO ANTICIPADO REQUERIDO</div>
              <div style="color:#6B7280;font-size:11px;">DATOS BANCARIOS AL CONFIRMAR ORDEN</div>
            </div>
          </td>
        </tr>
      </table>

      <!-- Especificaciones -->
      <div style="margin-top:26px;">
        <div style="font-size:12px;letter-spacing:0.16em;font-weight:800;color:#1C1E22;margin-bottom:10px;">ESPECIFICACIONES DEL PRODUCTO</div>
        <div style="height:1px;background:#ECECEC;"></div>
        <table style="width:100%;font-size:11px;border-collapse:collapse;margin-top:8px;">
          ${pairs
            .map(
              ([a, b]) => `
            <tr>
              <td style="padding:6px 0;color:#C99B0E;font-weight:800;letter-spacing:0.08em;width:16%;">${esc(
                a.label,
              )}</td>
              <td style="padding:6px 0;width:34%;">${esc(a.value)}</td>
              <td style="padding:6px 0;color:#C99B0E;font-weight:800;letter-spacing:0.08em;width:16%;">${
                b ? esc(b.label) : ""
              }</td>
              <td style="padding:6px 0;width:34%;">${b ? esc(b.value) : ""}</td>
            </tr>
          `,
            )
            .join("")}
        </table>
      </div>

      <!-- Términos -->
      <div style="margin-top:24px;">
        <div style="height:1px;background:#ECECEC;"></div>
        <div style="font-size:12px;letter-spacing:0.16em;font-weight:800;color:#1C1E22;margin-top:14px;">TÉRMINOS Y CONDICIONES</div>
        <div style="margin-top:10px;font-size:11px;color:#6B7280;line-height:1.55;">
          <div style="color:#4A6274;font-weight:800;letter-spacing:0.1em;">POLÍTICA DE CAMBIOS Y DEVOLUCIONES</div>
          <div style="margin-top:2px;">UNA VEZ ENTREGADO EL PRODUCTO, NO SE ACEPTAN CAMBIOS NI DEVOLUCIONES, SALVO DEFECTO DE FABRICACIÓN NOTIFICADO AL MOMENTO DE LA ENTREGA.</div>
          <div style="color:#4A6274;font-weight:800;letter-spacing:0.1em;margin-top:10px;">ACEPTACIÓN DE LOS TÉRMINOS</div>
          <div style="margin-top:2px;">LA ACEPTACIÓN DE ESTA COTIZACIÓN IMPLICA CONFORMIDAD TOTAL CON LOS TÉRMINOS ESTABLECIDOS. LA ORDEN DEBE RECIBIRSE POR ESCRITO.</div>
        </div>
      </div>
    </div>

    <!-- FOOTER -->
    <div style="background:#343331;color:#fff;padding:18px 56px;text-align:center;font-size:11px;letter-spacing:0.18em;text-transform:uppercase;">
      <div style="font-weight:700;">SEÑALIZACIÓN VIAL DE PRECISIÓN · DISPONIBILIDAD INMEDIATA · ENVÍO NACIONAL</div>
      <div style="color:#9aa3ad;margin-top:6px;font-size:10px;letter-spacing:0.22em;">MONTERREY, NUEVO LEÓN, MÉXICO</div>
    </div>
  </div>`;
}
