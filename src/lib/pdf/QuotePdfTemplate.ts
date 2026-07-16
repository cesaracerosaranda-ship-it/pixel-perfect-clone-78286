import {
  CONTACT_EMAIL,
  CONTACT_TEL,
  EJECUTIVO,
  PRODUCTOS,
  SPECS,
  VIGENCIA_DIAS,
  formatInt,
  formatMoney,
} from "@/lib/vialux/constants";
import type { QuoteState } from "@/hooks/useQuoteState";
import type { QuoteCalc } from "./generateQuotePdf";

// Paleta del documento (referencia: design_handoff_vialux/Cotización VIALUX.dc.html)
const INK = "#2E2B27";
const GOLD = "#C79100";
const YELLOW = "#F2B90D";
const BORDER = "#E5E2DC";
const GRAY = "#9B968E";
const GRAY_DARK = "#6D6860";
const STRIP = "#F1EFEA";

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
  switch (key) {
    case "boya":
      return "ACERO C 1/8 · PINTURA ELECTROSTÁTICA · 22×22×5.5 CM · 1.2 KG";
    case "boya_clavos":
      return "ACERO C 1/8 · PINTURA ELECTROSTÁTICA · 22×22×5.5 CM · 1.2 KG";
    case "boya_clavos_refl":
      return "ACERO C 1/8 · PINTURA ELECTROSTÁTICA · REFLEJANTES ÁMBAR/PLATA · 22×22×5.5 CM";
  }
}

// Riel lateral: número + etiqueta vertical centrados juntos en la sección.
// La referencia usa writing-mode, pero html2canvas no lo pinta bien — se replica
// con transform: rotate(-90deg) translate(-50%,-50%) dentro de un wrapper cuya
// altura se calcula del largo del texto (mono 7.5px + tracking 1.5px ≈ 6px/carácter),
// para que el grupo fluya centrado sin chocar con el número ni salirse del recuadro.
function rail(num: string, label: string) {
  const len = Math.ceil(label.length * 6) + 6;
  return `<div style="border-right:1px solid ${BORDER};padding:10px 0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px;">
    <div style="font-size:13px;font-weight:700;color:${GOLD};">${num}</div>
    <div style="position:relative;width:12px;height:${len}px;">
      <div style="position:absolute;top:50%;left:50%;transform:rotate(-90deg) translate(-50%,-50%);transform-origin:0 0;white-space:nowrap;font-size:7.5px;letter-spacing:1.5px;color:${GRAY};">${label}</div>
    </div>
  </div>`;
}

const CELL = `padding:8px 10px;border-right:1px solid ${BORDER};border-bottom:1px solid ${BORDER};`;

export function renderQuoteHtml(args: {
  folio: string;
  state: QuoteState;
  calc: QuoteCalc;
  deliveryMsg: string;
  logoDataUrl: string;
}) {
  const { folio, state, calc, logoDataUrl } = args;
  const prod = PRODUCTOS[state.producto];
  const hoy = new Date();
  const vence = new Date(hoy.getTime() + VIGENCIA_DIAS * 24 * 60 * 60 * 1000);

  const lugarDestino = state.municipio && state.estadoNombre
    ? ` — ${esc(state.municipio.toUpperCase())}, ${esc(state.estadoNombre.toUpperCase())}`
    : "";
  const fleteDestino = state.cp ? `, A CP ${esc(state.cp)}${lugarDestino}` : "";

  // Línea de empresa bajo el nombre del cliente (útil cuando el cliente es
  // "A QUIEN CORRESPONDA" y la cotización va dirigida a una empresa).
  const empresaClean = (state.empresa || "").trim();
  const empresaLine =
    empresaClean && empresaClean !== "-" && empresaClean !== "—"
      ? `<div style="font-size:10px;letter-spacing:1px;color:${GRAY_DARK};"><span style="color:${GOLD};font-weight:700;">EMPRESA:</span> ${esc(empresaClean.toUpperCase())}</div>`
      : "";

  // Sección TIEMPO DE ENTREGA: comportamiento diferenciado por escenario
  const isLocalCp = /^6[4-7]/.test(state.cp || "");
  const deliveryMain = state.incluyeFlete
    ? `${(state.fleteModalidad || "ENTREGA A DOMICILIO").toUpperCase()} VÍA ${esc(
        (state.fletePaqueteria || "PAQUETERÍA").toUpperCase(),
      )}`
    : esc(args.deliveryMsg);
  const deliverySub = state.incluyeFlete
    ? state.cp
      ? `DESTINO: CP ${esc(state.cp)}${lugarDestino}`
      : ""
    : isLocalCp
      ? "RECOLECCIÓN EN PLANTA"
      : state.cp && state.municipio
        ? `CP ${esc(state.cp)}${lugarDestino}`
        : "FLETE SE COTIZA POR SEPARADO";

  const ROW_GRID = "display:grid;grid-template-columns:1fr 110px 110px 120px;gap:12px;";

  const fleteRow = state.incluyeFlete
    ? `<div style="${ROW_GRID}padding:11px 0 12px;border-bottom:1px solid ${BORDER};align-items:start;">
        <div style="font-size:10.5px;font-weight:700;line-height:1.5;">ENVÍO VÍA ${esc(
          (state.fletePaqueteria || "PAQUETERÍA").toUpperCase(),
        )} — ${esc(state.fleteModalidad)}${fleteDestino}</div>
        <div style="font-size:12px;font-weight:500;text-align:right;padding-top:2px;">1</div>
        <div style="font-size:12px;font-weight:500;text-align:right;padding-top:2px;">—</div>
        <div style="font-size:12px;font-weight:700;text-align:right;padding-top:2px;">${formatMoney(
          calc.subtotalFlete,
        )}</div>
      </div>`
    : "";

  const ivaCells = state.requiereFactura
    ? `<div style="font-size:10px;letter-spacing:2px;color:${GRAY};text-align:right;">IVA (16%)</div>
       <div style="font-size:12px;font-weight:500;text-align:right;">${formatMoney(calc.iva)}</div>`
    : "";

  const specCells = SPECS.map(
    (s) => `<div style="${CELL}display:flex;flex-direction:column;gap:4px;">
      <div style="font-size:7px;font-weight:700;letter-spacing:1.5px;color:${GOLD};">${esc(s.label)}</div>
      <div style="font-size:9px;font-weight:700;line-height:1.4;">${esc(s.value)}</div>
    </div>`,
  ).join("");

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:ital,wght@0,400;0,500;0,700;0,800;1,400&display=swap" rel="stylesheet">
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'JetBrains Mono', monospace; background: #fff; -webkit-print-color-adjust: exact; }
</style>
</head>
<body>
  <div style="font-family:'JetBrains Mono',monospace;width:816px;min-height:1055px;background:#FFFFFF;color:${INK};display:flex;flex-direction:column;">

    <!-- HEADER -->
    <div style="background:${INK};color:#FFFFFF;padding:16px 40px 14px;">
      <table style="width:100%;border-collapse:collapse;">
        <tr>
          <td style="vertical-align:bottom;padding:0;">
            <img src="${logoDataUrl}" alt="VIALUX" style="height:58px;width:auto;display:block;" />
          </td>
          <td style="vertical-align:bottom;text-align:right;padding:0;">
            <div style="font-size:9px;letter-spacing:3px;color:${GRAY};">DOCUMENTO COMERCIAL · 2026 · FOLIO ${esc(folio)}</div>
            <div style="margin-top:7px;font-size:22px;font-weight:400;letter-spacing:4px;line-height:1;">COTIZACIÓN <span style="color:${YELLOW};">COMERCIAL</span></div>
          </td>
        </tr>
      </table>
    </div>
    <div style="height:5px;background:${YELLOW};"></div>

    <!-- 00 · CLIENTE -->
    <div style="display:grid;grid-template-columns:88px 1fr;border-bottom:1px solid ${BORDER};">
      ${rail("00", "CLIENTE")}
      <div style="padding:11px 40px 11px 32px;display:flex;justify-content:space-between;gap:24px;">
        <div style="display:flex;flex-direction:column;gap:5px;min-width:0;">
          <div style="font-size:9px;letter-spacing:3px;color:${GRAY};">COTIZACIÓN PARA:</div>
          <div style="font-size:22px;font-weight:800;letter-spacing:0.5px;line-height:1.15;">${esc(state.cliente.toUpperCase())}</div>
          ${empresaLine}
          <div style="font-size:10px;letter-spacing:1px;color:${GRAY_DARK};">ATENDIDO POR: ${EJECUTIVO}</div>
          <div style="display:flex;align-items:center;gap:12px;margin-top:4px;">
            <div style="background:${YELLOW};color:${INK};font-size:9px;font-weight:700;letter-spacing:2px;padding:5px 10px;">SEÑALIZACIÓN VIAL</div>
            <div style="font-size:10px;letter-spacing:1.5px;color:${GRAY_DARK};">FOLIO: ${esc(folio)}</div>
          </div>
        </div>
        <div style="text-align:right;display:flex;flex-direction:column;gap:5px;flex-shrink:0;padding-top:14px;">
          <div style="font-size:13px;font-weight:700;letter-spacing:1.5px;">${fechaLarga(hoy)}</div>
          <div style="font-size:10px;color:${GRAY};">VÁLIDA HASTA ${fechaLarga(vence)}</div>
        </div>
      </div>
    </div>

    <!-- 01 · PARTIDAS -->
    <div style="display:grid;grid-template-columns:88px 1fr;border-bottom:1px solid ${BORDER};">
      ${rail("01", "PARTIDAS")}
      <div style="padding:14px 40px 14px 32px;">
        <div style="${ROW_GRID}border-bottom:2px solid ${INK};padding-bottom:7px;">
          <div style="font-size:9px;font-weight:700;letter-spacing:2px;">DESCRIPCIÓN</div>
          <div style="font-size:9px;font-weight:700;letter-spacing:2px;text-align:right;">CANTIDAD</div>
          <div style="font-size:9px;font-weight:700;letter-spacing:2px;text-align:right;">PRECIO/PZA</div>
          <div style="font-size:9px;font-weight:700;letter-spacing:2px;text-align:right;">SUBTOTAL</div>
        </div>
        <div style="${ROW_GRID}padding:11px 0 12px;border-bottom:1px solid ${BORDER};align-items:start;">
          <div style="display:flex;flex-direction:column;gap:6px;">
            <div style="font-size:11px;font-weight:700;line-height:1.45;">${esc(prod.descripcion)}</div>
            <div style="font-size:9px;letter-spacing:1px;color:${GRAY};line-height:1.7;"><span style="color:${GOLD};font-weight:700;">${esc(prod.sku)}</span> · ${esc(shortSpec(state.producto))}</div>
          </div>
          <div style="font-size:12px;font-weight:500;text-align:right;padding-top:2px;">${formatInt(state.cantidad)}</div>
          <div style="font-size:12px;font-weight:500;text-align:right;padding-top:2px;">${formatMoney(calc.precioUnitario)}</div>
          <div style="font-size:12px;font-weight:700;text-align:right;padding-top:2px;">${formatMoney(calc.subtotalProducto)}</div>
        </div>
        ${fleteRow}
        <div style="display:flex;flex-direction:column;align-items:flex-end;gap:7px;padding-top:11px;">
          <div style="display:grid;grid-template-columns:140px 140px;gap:8px;">
            <div style="font-size:10px;letter-spacing:2px;color:${GRAY};text-align:right;">SUBTOTAL</div>
            <div style="font-size:12px;font-weight:500;text-align:right;">${formatMoney(calc.subtotalGeneral)}</div>
            ${ivaCells}
          </div>
          <div style="width:288px;height:3px;background:${YELLOW};"></div>
          <div style="display:flex;align-items:baseline;gap:18px;">
            <div style="font-size:13px;font-weight:800;letter-spacing:2px;">TOTAL</div>
            <div style="font-size:20px;font-weight:800;color:${GOLD};">${formatMoney(calc.total)}</div>
          </div>
          <div style="font-size:9px;letter-spacing:1.5px;color:${GRAY};">MXN · PESOS MEXICANOS</div>
        </div>
      </div>
    </div>

    <!-- 02 · CONDICIONES -->
    <div style="display:grid;grid-template-columns:88px 1fr;border-bottom:1px solid ${BORDER};">
      ${rail("02", "CONDICIONES")}
      <div style="padding:14px 40px 14px 32px;display:grid;grid-template-columns:1fr 1fr;gap:14px;">
        <div style="border:1px solid ${BORDER};padding:12px 15px;display:flex;flex-direction:column;gap:6px;">
          <div style="font-size:8px;font-weight:700;letter-spacing:2px;color:${GOLD};">TIEMPO DE ENTREGA</div>
          <div style="font-size:12px;font-weight:700;">${deliveryMain}</div>
          ${deliverySub ? `<div style="font-size:9px;letter-spacing:0.5px;color:${GRAY_DARK};">${deliverySub}</div>` : ""}
        </div>
        <div style="border:1px solid ${BORDER};padding:12px 15px;display:flex;flex-direction:column;gap:6px;">
          <div style="font-size:8px;font-weight:700;letter-spacing:2px;color:${GOLD};">FORMA DE PAGO</div>
          <div style="font-size:12px;font-weight:700;">TRANSFERENCIA BANCARIA</div>
          <div style="font-size:9px;letter-spacing:0.5px;color:${GRAY_DARK};line-height:1.6;">PAGO ANTICIPADO REQUERIDO · DATOS BANCARIOS AL CONFIRMAR ORDEN</div>
        </div>
      </div>
    </div>

    <!-- 03 · TÉCNICO -->
    <div style="display:grid;grid-template-columns:88px 1fr;border-bottom:1px solid ${BORDER};">
      ${rail("03", "TÉCNICO")}
      <div style="padding:14px 40px 14px 32px;">
        <div style="display:grid;grid-template-columns:repeat(4,1fr);border:1px solid ${BORDER};border-right:0;border-bottom:0;">
          ${specCells}
        </div>
      </div>
    </div>

    <!-- 04 · TÉRMINOS (flex:1 absorbe el espacio restante; el contenido se
         reparte verticalmente para no dejar vacío al fondo) -->
    <div style="display:grid;grid-template-columns:88px 1fr;flex:1;">
      ${rail("04", "TÉRMINOS")}
      <div style="padding:14px 40px 14px 32px;display:flex;flex-direction:column;justify-content:space-evenly;">
        <div style="font-size:10px;line-height:1.75;color:#4A463F;"><span style="color:${GOLD};font-weight:700;letter-spacing:1px;">POLÍTICA DE CAMBIOS Y DEVOLUCIONES —</span> UNA VEZ ENTREGADO EL PRODUCTO, NO SE ACEPTAN CAMBIOS NI DEVOLUCIONES, SALVO DEFECTO DE FABRICACIÓN NOTIFICADO AL MOMENTO DE LA ENTREGA.</div>
        <div style="font-size:10px;line-height:1.75;color:#4A463F;"><span style="color:${GOLD};font-weight:700;letter-spacing:1px;">ACEPTACIÓN DE LOS TÉRMINOS —</span> LA ACEPTACIÓN DE ESTA COTIZACIÓN IMPLICA CONFORMIDAD TOTAL CON LOS TÉRMINOS ESTABLECIDOS. LA ORDEN DEBE RECIBIRSE POR ESCRITO.</div>
        <div style="background:${STRIP};padding:10px 14px;font-size:9.5px;line-height:1.7;color:${GRAY_DARK};"><span style="font-weight:700;color:${INK};">NOTA:</span> PRECIOS SUJETOS A CAMBIO SIN PREVIO AVISO UNA VEZ VENCIDA LA VIGENCIA DE ESTA COTIZACIÓN.</div>
      </div>
    </div>

    <!-- FOOTER -->
    <div style="background:${STRIP};padding:10px 40px;text-align:center;font-size:9px;letter-spacing:2px;">
      <span style="color:${GRAY};">COTIZACIONES</span> <span style="font-weight:700;">${CONTACT_EMAIL}</span> <span style="color:${GOLD};">·</span> <span style="color:${GRAY};">TEL</span> <span style="font-weight:700;">${CONTACT_TEL}</span>
    </div>
    <div style="background:${INK};color:#FFFFFF;padding:12px 40px 13px;text-align:center;">
      <div style="font-size:9.5px;font-weight:700;letter-spacing:3px;">SEÑALIZACIÓN VIAL DE PRECISIÓN <span style="color:${YELLOW};">·</span> DISPONIBILIDAD INMEDIATA <span style="color:${YELLOW};">·</span> ENVÍO NACIONAL</div>
      <div style="margin-top:4px;font-size:8px;letter-spacing:3px;color:${GRAY};">MONTERREY, NUEVO LEÓN, MÉXICO</div>
    </div>

  </div>
</body>
</html>`;
}
