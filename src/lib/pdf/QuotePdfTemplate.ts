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
      return "ACERO C 1/8 · PINTURA ELECTROSTÁTICA · REFLEJANTES AMBAR/PLATA · 22×22×5.5 CM";
  }
}

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

  const pairs: Array<[typeof SPECS[number], typeof SPECS[number] | undefined]> = [];
  for (let i = 0; i < SPECS.length; i += 2) pairs.push([SPECS[i], SPECS[i + 1]]);

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
        <td style="padding:16px 20px 16px 0;border-top:1px solid #E8E8E8;vertical-align:top;">
          <div style="font-weight:700;font-size:11.5px;">ENVÍO VÍA ${esc(
            (state.fletePaqueteria || "PAQUETERÍA").toUpperCase(),
          )} — ${esc(state.fleteModalidad)}${fleteDestino}</div>
        </td>
        <td style="padding:16px 0;border-top:1px solid #E8E8E8;text-align:center;font-family:'JetBrains Mono',monospace;font-size:11.5px;">1</td>
        <td style="padding:16px 0;border-top:1px solid #E8E8E8;text-align:right;font-family:'JetBrains Mono',monospace;font-size:11.5px;">—</td>
        <td style="padding:16px 0;border-top:1px solid #E8E8E8;text-align:right;font-weight:700;font-family:'JetBrains Mono',monospace;font-size:11.5px;">${formatMoney(
          calc.subtotalFlete,
        )}</td>
      </tr>`
    : "";

  const ivaRow = state.requiereFactura
    ? `<tr>
        <td colspan="2"></td>
        <td style="padding:6px 0;text-align:right;color:#6B7280;letter-spacing:0.06em;font-size:10.5px;">IVA (16%)</td>
        <td style="padding:6px 0;text-align:right;font-family:'JetBrains Mono',monospace;font-size:11.5px;">${formatMoney(
          calc.iva,
        )}</td>
      </tr>`
    : "";

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;600;700;800&family=JetBrains+Mono:wght@400;700&display=swap" rel="stylesheet">
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Manrope', Arial, sans-serif; background: #fff; -webkit-print-color-adjust: exact; }
</style>
</head>
<body>
  <div style="font-family:'Manrope',Arial,sans-serif;color:#1C1E22;background:#ffffff;width:794px;">

    <!-- HEADER -->
    <div style="background:#343331;padding:28px 48px 30px;">
      <img src="${logoDataUrl}" alt="VIALUX" style="height:auto;max-height:80px;width:auto;max-width:240px;display:block;" />
    </div>
    <div style="height:5px;background:#EDBA1A;"></div>

    <div style="padding:32px 48px 24px;">

      <!-- CLIENTE + FECHA -->
      <table style="width:100%;border-collapse:collapse;">
        <tr>
          <td style="vertical-align:top;">
            <div style="font-size:9.5px;letter-spacing:0.2em;color:#8A8F99;text-transform:uppercase;">Cotización para:</div>
            <div style="font-size:25px;font-weight:800;margin-top:5px;line-height:1.1;letter-spacing:-0.01em;">${esc(state.cliente.toUpperCase())}</div>
            <div style="margin-top:5px;color:#6B7280;font-size:10.5px;letter-spacing:0.08em;">ATENDIDO POR: ${EJECUTIVO}</div>
          </td>
          <td style="vertical-align:top;text-align:right;width:38%;">
            <div style="font-family:'JetBrains Mono',monospace;font-size:11.5px;color:#1C1E22;font-weight:700;">${fechaLarga(hoy)}</div>
            <div style="font-size:9.5px;color:#8A8F99;font-style:italic;margin-top:5px;">VÁLIDA HASTA ${fechaLarga(vence)}</div>
          </td>
        </tr>
      </table>

      <!-- BADGE + FOLIO -->
      <table style="width:auto;border-collapse:collapse;margin-top:18px;">
        <tr>
          <td style="padding:0;">
            <span style="background:#EDBA1A;color:#1C1E22;padding:6px 14px;border-radius:5px;font-weight:800;font-size:10.5px;letter-spacing:0.14em;display:inline-block;">SEÑALIZACIÓN VIAL</span>
          </td>
          <td style="padding:0 0 0 14px;">
            <span style="font-family:'JetBrains Mono',monospace;color:#8A8F99;font-size:11.5px;">FOLIO: ${esc(folio)}</span>
          </td>
        </tr>
      </table>

      <div style="height:1px;background:#1C1E22;margin-top:22px;"></div>

      <!-- TABLA PRINCIPAL -->
      <table style="width:100%;border-collapse:collapse;margin-top:14px;font-size:11.5px;">
        <thead>
          <tr style="color:#1C1E22;text-transform:uppercase;letter-spacing:0.1em;font-size:10px;">
            <th style="padding:12px 0;text-align:left;font-weight:800;">Descripción</th>
            <th style="padding:12px 0;text-align:center;font-weight:800;width:18%;">Cantidad (Pzas)</th>
            <th style="padding:12px 0;text-align:right;font-weight:800;width:16%;">Precio/Pza</th>
            <th style="padding:12px 0;text-align:right;font-weight:800;width:18%;">Subtotal</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style="padding:18px 20px 18px 0;border-top:1px solid #E8E8E8;vertical-align:top;">
              <div style="font-weight:700;line-height:1.35;font-size:11.5px;">${esc(prod.descripcion)}</div>
              <div style="color:#9CA3AF;font-size:9.5px;margin-top:5px;letter-spacing:0.04em;font-family:'JetBrains Mono',monospace;">${esc(shortSpec(state.producto))}</div>
            </td>
            <td style="padding:18px 0;border-top:1px solid #E8E8E8;text-align:center;font-family:'JetBrains Mono',monospace;">${formatInt(state.cantidad)}</td>
            <td style="padding:18px 0;border-top:1px solid #E8E8E8;text-align:right;font-family:'JetBrains Mono',monospace;">${formatMoney(calc.precioUnitario)}</td>
            <td style="padding:18px 0;border-top:1px solid #E8E8E8;text-align:right;font-weight:700;font-family:'JetBrains Mono',monospace;">${formatMoney(calc.subtotalProducto)}</td>
          </tr>
          ${fleteRow}
          <!-- Totales -->
          <tr>
            <td colspan="2"></td>
            <td style="padding:16px 0 6px;text-align:right;color:#6B7280;letter-spacing:0.08em;font-size:10.5px;">SUBTOTAL</td>
            <td style="padding:16px 0 6px;text-align:right;font-family:'JetBrains Mono',monospace;font-size:11.5px;">${formatMoney(calc.subtotalGeneral)}</td>
          </tr>
          ${ivaRow}
          <tr>
            <td colspan="2"></td>
            <td colspan="2" style="padding:5px 0 0;"><div style="height:2px;background:#EDBA1A;"></div></td>
          </tr>
          <tr>
            <td colspan="2"></td>
            <td style="padding:11px 0;text-align:right;font-weight:800;font-size:16px;">TOTAL</td>
            <td style="padding:11px 0;text-align:right;font-weight:800;font-size:18px;color:#C99B0E;font-family:'JetBrains Mono',monospace;">${formatMoney(calc.total)}</td>
          </tr>
        </tbody>
      </table>

      <!-- Entrega + Pago -->
      <table style="width:100%;border-collapse:separate;border-spacing:14px 0;margin-top:24px;">
        <tr>
          <td style="width:50%;vertical-align:top;padding:0;">
            <div style="font-size:9.5px;letter-spacing:0.16em;font-weight:800;color:#1C1E22;margin-bottom:7px;text-transform:uppercase;">Tiempo de Entrega</div>
            <div style="border:1px solid #E5E7EB;border-radius:8px;padding:18px 18px;">
              <div style="font-weight:700;letter-spacing:0.04em;font-size:11.5px;">${deliveryMain}</div>
              ${deliverySub
                ? `<div style="color:#6B7280;font-size:10.5px;margin-top:5px;">${deliverySub}</div>`
                : ""
              }
            </div>
          </td>
          <td style="width:50%;vertical-align:top;padding:0;">
            <div style="font-size:9.5px;letter-spacing:0.16em;font-weight:800;color:#1C1E22;margin-bottom:7px;text-transform:uppercase;">Forma de Pago</div>
            <div style="border:1px solid #E5E7EB;border-radius:8px;padding:18px 18px;">
              <div style="font-weight:700;letter-spacing:0.04em;font-size:11.5px;">TRANSFERENCIA BANCARIA</div>
              <div style="color:#6B7280;font-size:10.5px;margin-top:5px;">PAGO ANTICIPADO REQUERIDO</div>
              <div style="color:#6B7280;font-size:10.5px;margin-top:3px;">DATOS BANCARIOS AL CONFIRMAR ORDEN</div>
            </div>
          </td>
        </tr>
      </table>

      <!-- Especificaciones -->
      <div style="margin-top:24px;">
        <div style="font-size:9.5px;letter-spacing:0.16em;font-weight:800;color:#1C1E22;margin-bottom:8px;text-transform:uppercase;">Especificaciones del Producto</div>
        <div style="height:1px;background:#E8E8E8;"></div>
        <table style="width:100%;font-size:10.5px;border-collapse:collapse;margin-top:8px;">
          ${pairs.map(([a, b]) => `
            <tr>
              <td style="padding:6px 0;color:#C99B0E;font-weight:800;letter-spacing:0.06em;width:15%;font-size:9.5px;">${esc(a.label)}</td>
              <td style="padding:6px 0;width:35%;font-size:10.5px;">${esc(a.value)}</td>
              <td style="padding:6px 0;color:#C99B0E;font-weight:800;letter-spacing:0.06em;width:15%;font-size:9.5px;">${b ? esc(b.label) : ""}</td>
              <td style="padding:6px 0;width:35%;font-size:10.5px;">${b ? esc(b.value) : ""}</td>
            </tr>`).join("")}
        </table>
      </div>

      <!-- Términos -->
      <div style="margin-top:24px;">
        <div style="height:1px;background:#E8E8E8;"></div>
        <div style="font-size:9.5px;letter-spacing:0.16em;font-weight:800;color:#1C1E22;margin-top:12px;text-transform:uppercase;">Términos y Condiciones</div>
        <div style="margin-top:12px;font-size:10px;color:#6B7280;line-height:1.5;">
          <span style="color:#4A6274;font-weight:800;letter-spacing:0.08em;font-size:9.5px;">POLÍTICA DE CAMBIOS Y DEVOLUCIONES — </span>UNA VEZ ENTREGADO EL PRODUCTO, NO SE ACEPTAN CAMBIOS NI DEVOLUCIONES, SALVO DEFECTO DE FABRICACIÓN NOTIFICADO AL MOMENTO DE LA ENTREGA.
        </div>
        <div style="margin-top:10px;font-size:10px;color:#6B7280;line-height:1.5;">
          <span style="color:#4A6274;font-weight:800;letter-spacing:0.08em;font-size:9.5px;">ACEPTACIÓN DE LOS TÉRMINOS — </span>LA ACEPTACIÓN DE ESTA COTIZACIÓN IMPLICA CONFORMIDAD TOTAL CON LOS TÉRMINOS ESTABLECIDOS. LA ORDEN DEBE RECIBIRSE POR ESCRITO.
        </div>
      </div>

    </div>

    <!-- FOOTER -->
    <div style="background:#343331;color:#fff;padding:16px 48px;text-align:center;font-size:10px;letter-spacing:0.18em;text-transform:uppercase;">
      <div style="font-weight:700;">SEÑALIZACIÓN VIAL DE PRECISIÓN · DISPONIBILIDAD INMEDIATA · ENVÍO NACIONAL</div>
      <div style="color:#9aa3ad;margin-top:6px;font-size:9.5px;letter-spacing:0.22em;">MONTERREY, NUEVO LEÓN, MÉXICO</div>
    </div>

  </div>
</body>
</html>`;
}
