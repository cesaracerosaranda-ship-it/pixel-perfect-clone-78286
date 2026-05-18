import {
  EJECUTIVO,
  FORMA_DE_PAGO,
  PRODUCTOS,
  SPECS,
  TERMINOS,
  formatInt,
  formatMoney,
} from "@/lib/vialux/constants";
import type { QuoteState } from "@/hooks/useQuoteState";
import type { QuoteCalc } from "./generateQuotePdf";

function esc(s: string) {
  return (s || "").replace(/[&<>"]/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c] as string,
  );
}

export function renderQuoteHtml(args: {
  folio: string;
  state: QuoteState;
  calc: QuoteCalc;
  deliveryMsg: string;
}) {
  const { folio, state, calc, deliveryMsg } = args;
  const prod = PRODUCTOS[state.producto];
  const fecha = new Date().toLocaleDateString("es-MX", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

  const fleteRow = state.incluyeFlete
    ? `<tr>
        <td style="padding:14px 12px;border-top:1px solid #eee;vertical-align:top;">
          ENVÍO VÍA ${esc(state.fletePaqueteria.toUpperCase() || "PAQUETERÍA")} — ${esc(
            state.fleteModalidad,
          )} A CP ${esc(state.cp)}
        </td>
        <td style="padding:14px 12px;border-top:1px solid #eee;text-align:center;">—</td>
        <td style="padding:14px 12px;border-top:1px solid #eee;text-align:right;font-family:'JetBrains Mono',monospace;">—</td>
        <td style="padding:14px 12px;border-top:1px solid #eee;text-align:right;font-family:'JetBrains Mono',monospace;">${formatMoney(
          calc.subtotalFlete,
        )}</td>
      </tr>`
    : "";

  const ivaRow = state.requiereFactura
    ? `<tr><td style="padding:4px 0;color:#555;">IVA (16%)</td><td style="padding:4px 0;text-align:right;font-family:'JetBrains Mono',monospace;">${formatMoney(
        calc.iva,
      )}</td></tr>`
    : "";

  return `
  <div style="font-family:'Manrope',Arial,sans-serif;color:#1C1E22;background:#ffffff;width:794px;">
    <div style="background:#343331;padding:24px 32px;display:flex;align-items:center;">
      <div style="display:flex;align-items:center;gap:14px;">
        <div style="width:64px;height:64px;border-radius:10px;background:#EDBA1A;color:#1C1E22;display:flex;align-items:center;justify-content:center;font-family:'JetBrains Mono',monospace;font-weight:800;font-size:22px;">VX</div>
        <div style="color:#fff;">
          <div style="font-weight:800;letter-spacing:0.18em;font-size:22px;">VIALUX</div>
          <div style="font-size:10px;letter-spacing:0.3em;color:#9aa3ad;text-transform:uppercase;">Señalización Vial</div>
        </div>
      </div>
    </div>
    <div style="height:4px;background:#EDBA1A;"></div>

    <div style="padding:28px 32px;">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;">
        <div>
          <div style="font-size:11px;letter-spacing:0.18em;color:#7A8090;text-transform:uppercase;">Cotización para</div>
          <div style="font-size:20px;font-weight:800;margin-top:4px;">${esc(
            state.cliente.toUpperCase(),
          )}</div>
          ${state.empresa ? `<div style="color:#4A6274;font-weight:600;margin-top:2px;">${esc(state.empresa.toUpperCase())}</div>` : ""}
          ${state.telefono ? `<div style="color:#6B8899;font-size:12px;margin-top:2px;font-family:'JetBrains Mono',monospace;">${esc(state.telefono)}</div>` : ""}
          <div style="margin-top:10px;color:#6B8899;font-size:11px;letter-spacing:0.12em;text-transform:uppercase;">Atendido por: <span style="color:#1C1E22;font-weight:700;">${EJECUTIVO}</span></div>
        </div>
        <div style="text-align:right;">
          <div style="font-size:11px;letter-spacing:0.18em;color:#7A8090;text-transform:uppercase;">Fecha</div>
          <div style="font-family:'JetBrains Mono',monospace;font-size:13px;margin-top:4px;text-transform:uppercase;">${esc(fecha)}</div>
          <div style="margin-top:12px;display:inline-flex;align-items:center;gap:8px;background:#EDBA1A;color:#1C1E22;padding:6px 12px;border-radius:999px;font-weight:700;font-size:11px;letter-spacing:0.14em;">SEÑALIZACIÓN VIAL · <span style="font-family:'JetBrains Mono',monospace;">${esc(folio)}</span></div>
        </div>
      </div>

      <table style="width:100%;border-collapse:collapse;margin-top:26px;font-size:12px;">
        <thead>
          <tr style="background:#F0EFEB;color:#4A6274;text-transform:uppercase;letter-spacing:0.12em;font-size:10px;">
            <th style="padding:10px 12px;text-align:left;">Descripción</th>
            <th style="padding:10px 12px;text-align:center;">Cantidad (pzas)</th>
            <th style="padding:10px 12px;text-align:right;">Precio/pza</th>
            <th style="padding:10px 12px;text-align:right;">Subtotal</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style="padding:14px 12px;border-top:1px solid #eee;vertical-align:top;">
              <div style="font-weight:700;">${esc(prod.descripcion)}</div>
              <div style="color:#7A8090;font-size:10px;margin-top:4px;letter-spacing:0.06em;">ACERO C 1/8 · PINTURA ELECTROSTÁTICA · 22×22×5.5 CM · 1.2 KG · 18 T</div>
            </td>
            <td style="padding:14px 12px;border-top:1px solid #eee;text-align:center;font-family:'JetBrains Mono',monospace;">${formatInt(
              state.cantidad,
            )}</td>
            <td style="padding:14px 12px;border-top:1px solid #eee;text-align:right;font-family:'JetBrains Mono',monospace;">${formatMoney(
              calc.precioUnitario,
            )}</td>
            <td style="padding:14px 12px;border-top:1px solid #eee;text-align:right;font-family:'JetBrains Mono',monospace;">${formatMoney(
              calc.subtotalProducto,
            )}</td>
          </tr>
          ${fleteRow}
        </tbody>
      </table>

      <div style="display:flex;justify-content:flex-end;margin-top:18px;">
        <table style="font-size:12px;min-width:280px;">
          <tr><td style="padding:4px 0;color:#555;">Subtotal</td><td style="padding:4px 0;text-align:right;font-family:'JetBrains Mono',monospace;">${formatMoney(
            calc.subtotalGeneral,
          )}</td></tr>
          ${ivaRow}
          <tr><td colspan="2" style="padding:6px 0 4px;"><div style="height:2px;background:#EDBA1A;"></div></td></tr>
          <tr>
            <td style="padding:4px 0;font-weight:800;color:#C99B0E;text-transform:uppercase;letter-spacing:0.14em;">Total</td>
            <td style="padding:4px 0;text-align:right;font-weight:800;color:#C99B0E;font-family:'JetBrains Mono',monospace;font-size:18px;">${formatMoney(
              calc.total,
            )}</td>
          </tr>
        </table>
      </div>

      <div style="display:flex;gap:14px;margin-top:24px;">
        <div style="flex:1;">
          <div style="font-size:10px;letter-spacing:0.18em;color:#7A8090;text-transform:uppercase;margin-bottom:6px;">Tiempo de entrega</div>
          <div style="border:1px solid #E8E7E3;padding:14px;border-radius:6px;font-size:12px;font-weight:600;">${esc(
            deliveryMsg,
          )}</div>
        </div>
        <div style="flex:1;">
          <div style="font-size:10px;letter-spacing:0.18em;color:#7A8090;text-transform:uppercase;margin-bottom:6px;">Forma de pago</div>
          <div style="border:1px solid #E8E7E3;padding:14px;border-radius:6px;font-size:12px;font-weight:600;">${FORMA_DE_PAGO}</div>
        </div>
      </div>

      <div style="margin-top:24px;">
        <div style="font-size:10px;letter-spacing:0.18em;color:#7A8090;text-transform:uppercase;margin-bottom:10px;">Especificaciones del producto</div>
        <table style="width:100%;font-size:11px;border-collapse:collapse;">
          ${SPECS.map(
            (s, i) =>
              `<tr>${i % 2 === 0 ? "" : ""}<td style="padding:6px 0;color:#C99B0E;font-weight:700;letter-spacing:0.08em;width:32%;">${esc(s.label)}</td><td style="padding:6px 0;">${esc(s.value)}</td></tr>`,
          ).join("")}
        </table>
      </div>

      <div style="margin-top:24px;font-size:10px;color:#7A8090;line-height:1.5;">
        <div style="font-size:10px;letter-spacing:0.18em;color:#4A6274;text-transform:uppercase;margin-bottom:6px;font-weight:700;">Términos y condiciones</div>
        ${TERMINOS.map((t) => `<div>• ${esc(t)}</div>`).join("")}
      </div>
    </div>

    <div style="background:#343331;color:#fff;padding:18px 32px;text-align:center;font-size:11px;letter-spacing:0.18em;text-transform:uppercase;">
      Señalización Vial de Precisión · Disponibilidad Inmediata · Envío Nacional
      <div style="color:#9aa3ad;margin-top:4px;font-size:10px;">Monterrey, Nuevo León, México</div>
    </div>
  </div>`;
}
