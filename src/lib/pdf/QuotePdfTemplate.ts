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

// Riel lateral: celda con número de sección + etiqueta vertical.
// La rotación usa transform (soportado por html2canvas); writing-mode no lo es.
function railCell(num: string, label: string, extraStyle = "") {
  return `<td style="width:56px;min-width:56px;border-right:1px solid #E5E3DE;vertical-align:top;padding:14px 0 0;${extraStyle}">
    <div style="text-align:center;font-weight:800;font-size:10px;color:#EDBA1A;">${num}</div>
    <div style="position:relative;height:85px;margin-top:10px;">
      <div style="position:absolute;top:0;left:31px;transform:rotate(90deg);transform-origin:0 0;white-space:nowrap;font-size:7px;letter-spacing:0.3em;color:#A8A29A;">${label}</div>
    </div>
  </td>`;
}

const SEP = "border-top:1px solid #E5E3DE;";

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

  // Grid técnico 4 columnas × 2 filas (orden de SPECS por bloques de 4)
  const specRows: Array<typeof SPECS> = [SPECS.slice(0, 4), SPECS.slice(4, 8)];

  const lugarDestino = state.municipio && state.estadoNombre
    ? ` — ${esc(state.municipio.toUpperCase())}, ${esc(state.estadoNombre.toUpperCase())}`
    : "";
  const fleteDestino = state.cp ? `, A CP ${esc(state.cp)}${lugarDestino}` : "";

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

  const fleteRow = state.incluyeFlete
    ? `<tr>
        <td style="padding:10px 16px 10px 0;${SEP}vertical-align:top;">
          <div style="font-weight:700;font-size:10px;line-height:1.5;">ENVÍO VÍA ${esc(
            (state.fletePaqueteria || "PAQUETERÍA").toUpperCase(),
          )} — ${esc(state.fleteModalidad)}${fleteDestino}</div>
        </td>
        <td style="padding:10px 0;${SEP}text-align:center;font-size:10px;">1</td>
        <td style="padding:10px 0;${SEP}text-align:right;font-size:10px;">—</td>
        <td style="padding:10px 0;${SEP}text-align:right;font-weight:700;font-size:10px;">${formatMoney(
          calc.subtotalFlete,
        )}</td>
      </tr>`
    : "";

  const ivaRow = state.requiereFactura
    ? `<tr>
        <td colspan="2"></td>
        <td style="padding:4px 0;text-align:right;color:#8F8A80;letter-spacing:0.14em;font-size:8.5px;">IVA (16%)</td>
        <td style="padding:4px 0;text-align:right;font-size:10.5px;">${formatMoney(calc.iva)}</td>
      </tr>`
    : "";

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;600;700;800&family=JetBrains+Mono:wght@400;500;700;800&display=swap" rel="stylesheet">
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'JetBrains Mono', monospace; background: #fff; -webkit-print-color-adjust: exact; }
</style>
</head>
<body>
  <div style="font-family:'JetBrains Mono',monospace;color:#1B1A17;background:#ffffff;width:816px;">

    <!-- HEADER -->
    <div style="background:#343331;padding:16px 40px;">
      <table style="width:100%;border-collapse:collapse;">
        <tr>
          <td style="vertical-align:bottom;padding:0;">
            <img src="${logoDataUrl}" alt="VIALUX" style="height:auto;max-height:56px;width:auto;max-width:190px;display:block;" />
          </td>
          <td style="vertical-align:bottom;text-align:right;padding:0 0 2px;">
            <div style="font-size:8px;letter-spacing:0.24em;color:#8F8A80;">DOCUMENTO COMERCIAL · 2026 · FOLIO ${esc(folio)}</div>
            <div style="margin-top:6px;font-size:19px;font-weight:400;letter-spacing:0.3em;color:#ffffff;line-height:1;">COTIZACIÓN <span style="color:#EDBA1A;">COMERCIAL</span></div>
          </td>
        </tr>
      </table>
    </div>
    <div style="height:5px;background:#EDBA1A;"></div>

    <!-- CUERPO CON RIEL LATERAL -->
    <table style="width:100%;border-collapse:collapse;">

      <!-- 00 CLIENTE -->
      <tr>
        ${railCell("00", "CLIENTE")}
        <td style="vertical-align:top;padding:16px 40px 14px 28px;">
          <table style="width:100%;border-collapse:collapse;">
            <tr>
              <td style="vertical-align:top;">
                <div style="font-size:8px;letter-spacing:0.24em;color:#8F8A80;">COTIZACIÓN PARA:</div>
                <div style="font-size:20px;font-weight:800;margin-top:7px;line-height:1.2;letter-spacing:0.02em;">${esc(state.cliente.toUpperCase())}</div>
                <div style="margin-top:7px;color:#75716A;font-size:8.5px;letter-spacing:0.12em;">ATENDIDO POR: ${EJECUTIVO}</div>
              </td>
              <td style="vertical-align:top;text-align:right;width:36%;">
                <div style="font-size:11px;font-weight:700;">${fechaLarga(hoy)}</div>
                <div style="font-size:8px;color:#8F8A80;margin-top:6px;letter-spacing:0.08em;">VÁLIDA HASTA ${fechaLarga(vence)}</div>
              </td>
            </tr>
          </table>
          <table style="width:auto;border-collapse:collapse;margin-top:10px;">
            <tr>
              <td style="padding:0;">
                <span style="background:#EDBA1A;color:#1B1A17;padding:5px 12px;border-radius:3px;font-weight:800;font-size:8.5px;letter-spacing:0.16em;display:inline-block;">SEÑALIZACIÓN VIAL</span>
              </td>
              <td style="padding:0 0 0 12px;">
                <span style="color:#8F8A80;font-size:9.5px;letter-spacing:0.08em;">FOLIO: ${esc(folio)}</span>
              </td>
            </tr>
          </table>
        </td>
      </tr>

      <!-- 01 PARTIDAS -->
      <tr>
        ${railCell("01", "PARTIDAS", SEP)}
        <td style="vertical-align:top;padding:14px 40px 12px 28px;${SEP}">
          <table style="width:100%;border-collapse:collapse;">
            <thead>
              <tr style="letter-spacing:0.16em;font-size:8px;color:#1B1A17;">
                <th style="padding:0 0 10px;text-align:left;font-weight:700;">DESCRIPCIÓN</th>
                <th style="padding:0 0 10px;text-align:center;font-weight:700;width:14%;">CANTIDAD</th>
                <th style="padding:0 0 10px;text-align:right;font-weight:700;width:16%;">PRECIO/PZA</th>
                <th style="padding:0 0 10px;text-align:right;font-weight:700;width:18%;">SUBTOTAL</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style="padding:12px 16px 12px 0;${SEP}vertical-align:top;">
                  <div style="font-weight:700;line-height:1.55;font-size:10px;">${esc(prod.descripcion)}</div>
                  <div style="color:#A8A29A;font-size:8px;margin-top:6px;letter-spacing:0.06em;line-height:1.6;"><span style="color:#C99B0E;font-weight:700;">${esc(prod.sku)}</span> · ${esc(shortSpec(state.producto))}</div>
                </td>
                <td style="padding:12px 0;${SEP}text-align:center;font-size:10px;">${formatInt(state.cantidad)}</td>
                <td style="padding:12px 0;${SEP}text-align:right;font-size:10px;">${formatMoney(calc.precioUnitario)}</td>
                <td style="padding:12px 0;${SEP}text-align:right;font-weight:700;font-size:10px;">${formatMoney(calc.subtotalProducto)}</td>
              </tr>
              ${fleteRow}
              <tr>
                <td colspan="2"></td>
                <td style="padding:10px 0 3px;text-align:right;color:#8F8A80;letter-spacing:0.14em;font-size:8.5px;">SUBTOTAL</td>
                <td style="padding:10px 0 3px;text-align:right;font-size:10.5px;">${formatMoney(calc.subtotalGeneral)}</td>
              </tr>
              ${ivaRow}
              <tr>
                <td colspan="2"></td>
                <td colspan="2" style="padding:5px 0 0;"><div style="height:2px;background:#EDBA1A;"></div></td>
              </tr>
              <tr>
                <td colspan="2"></td>
                <td style="padding:8px 0 0;text-align:right;font-weight:700;font-size:13px;letter-spacing:0.1em;">TOTAL</td>
                <td style="padding:8px 0 0;text-align:right;font-weight:800;font-size:19px;color:#C99B0E;">${formatMoney(calc.total)}</td>
              </tr>
              <tr>
                <td colspan="2"></td>
                <td colspan="2" style="padding:4px 0 0;text-align:right;color:#A8A29A;font-size:7.5px;letter-spacing:0.2em;">MXN · PESOS MEXICANOS</td>
              </tr>
            </tbody>
          </table>
        </td>
      </tr>

      <!-- 02 CONDICIONES -->
      <tr>
        ${railCell("02", "CONDICIONES", SEP)}
        <td style="vertical-align:top;padding:14px 40px 12px 28px;${SEP}">
          <table style="width:100%;border-collapse:separate;border-spacing:12px 0;margin:0 -12px;">
            <tr>
              <td style="width:50%;vertical-align:top;border:1px solid #E5E3DE;border-radius:4px;padding:12px 16px;">
                <div style="font-size:8px;letter-spacing:0.2em;font-weight:700;color:#C99B0E;">TIEMPO DE ENTREGA</div>
                <div style="font-weight:700;font-size:10.5px;margin-top:9px;line-height:1.5;">${deliveryMain}</div>
                ${deliverySub
                  ? `<div style="color:#75716A;font-size:8.5px;margin-top:5px;letter-spacing:0.04em;">${deliverySub}</div>`
                  : ""
                }
              </td>
              <td style="width:50%;vertical-align:top;border:1px solid #E5E3DE;border-radius:4px;padding:12px 16px;">
                <div style="font-size:8px;letter-spacing:0.2em;font-weight:700;color:#C99B0E;">FORMA DE PAGO</div>
                <div style="font-weight:700;font-size:10.5px;margin-top:9px;line-height:1.5;">TRANSFERENCIA BANCARIA</div>
                <div style="color:#75716A;font-size:8.5px;margin-top:5px;letter-spacing:0.04em;line-height:1.6;">PAGO ANTICIPADO REQUERIDO · DATOS BANCARIOS AL CONFIRMAR ORDEN</div>
              </td>
            </tr>
          </table>
        </td>
      </tr>

      <!-- 03 TÉCNICO -->
      <tr>
        ${railCell("03", "TÉCNICO", SEP)}
        <td style="vertical-align:top;padding:14px 40px 14px 28px;${SEP}">
          <table style="width:100%;border-collapse:collapse;">
            ${specRows.map((row) => `
              <tr>
                ${row.map((s) => `
                  <td style="width:25%;border:1px solid #E5E3DE;padding:8px 11px;vertical-align:top;">
                    <div style="color:#C99B0E;font-weight:700;letter-spacing:0.14em;font-size:7.5px;">${esc(s.label)}</div>
                    <div style="font-size:8.5px;margin-top:6px;line-height:1.5;font-weight:500;">${esc(s.value)}</div>
                  </td>`).join("")}
              </tr>`).join("")}
          </table>
        </td>
      </tr>

      <!-- 04 TÉRMINOS -->
      <tr>
        ${railCell("04", "TÉRMINOS", SEP)}
        <td style="vertical-align:top;padding:14px 40px 16px 28px;${SEP}">
          <div style="font-size:8.5px;color:#75716A;line-height:1.7;">
            <span style="color:#C99B0E;font-weight:700;letter-spacing:0.1em;">POLÍTICA DE CAMBIOS Y DEVOLUCIONES — </span>UNA VEZ ENTREGADO EL PRODUCTO, NO SE ACEPTAN CAMBIOS NI DEVOLUCIONES, SALVO DEFECTO DE FABRICACIÓN NOTIFICADO AL MOMENTO DE LA ENTREGA.
          </div>
          <div style="margin-top:9px;font-size:8.5px;color:#75716A;line-height:1.7;">
            <span style="color:#C99B0E;font-weight:700;letter-spacing:0.1em;">ACEPTACIÓN DE LOS TÉRMINOS — </span>LA ACEPTACIÓN DE ESTA COTIZACIÓN IMPLICA CONFORMIDAD TOTAL CON LOS TÉRMINOS ESTABLECIDOS. LA ORDEN DEBE RECIBIRSE POR ESCRITO.
          </div>
          <div style="margin-top:10px;background:#F0EFEB;padding:8px 14px;border-radius:3px;font-size:8px;color:#75716A;letter-spacing:0.04em;line-height:1.6;">
            <span style="color:#1B1A17;font-weight:700;">NOTA:</span> PRECIOS SUJETOS A CAMBIO SIN PREVIO AVISO UNA VEZ VENCIDA LA VIGENCIA DE ESTA COTIZACIÓN.
          </div>
        </td>
      </tr>

    </table>

    <!-- FOOTER-SPACER -->

    <!-- FOOTER: CONTACTO -->
    <div style="background:#F0EFEB;padding:10px 40px;text-align:center;font-size:8px;letter-spacing:0.18em;">
      <span style="color:#8F8A80;">COTIZACIONES</span> <span style="font-weight:700;color:#1B1A17;">${CONTACT_EMAIL}</span> <span style="color:#8F8A80;">· TEL</span> <span style="font-weight:700;color:#1B1A17;">${CONTACT_TEL}</span>
    </div>

    <!-- FOOTER: MARCA -->
    <div style="background:#343331;color:#fff;padding:12px 40px;text-align:center;">
      <div style="font-weight:700;font-size:9px;letter-spacing:0.24em;">SEÑALIZACIÓN VIAL DE PRECISIÓN · DISPONIBILIDAD INMEDIATA · ENVÍO NACIONAL</div>
      <div style="color:#8F8A80;margin-top:5px;font-size:7.5px;letter-spacing:0.3em;">MONTERREY, NUEVO LEÓN, MÉXICO</div>
    </div>

  </div>
</body>
</html>`;
}
