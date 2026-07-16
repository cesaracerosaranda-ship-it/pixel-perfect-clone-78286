// Renderiza el HTML del PDF con escenarios worst-case y lo guarda para
// medir su altura con Chrome headless. Presupuesto carta: 1056px a 816px de ancho.
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { renderQuoteHtml } from "../src/lib/pdf/QuotePdfTemplate";
import type { QuoteState } from "../src/hooks/useQuoteState";

const logo = readFileSync("src/assets/vialux-logo.png").toString("base64");
const logoDataUrl = `data:image/png;base64,${logo}`;

const baseState: QuoteState = {
  cliente: "JOAQUIN DEL ANGEL AZUETA",
  empresa: "MANUFACTURAS VIALES DE SEÑALES Y LINEAS",
  telefono: "",
  cp: "92800",
  municipio: "",
  estadoNombre: "",
  producto: "boya_clavos_refl",
  cantidad: 1000,
  requiereFactura: true,
  precioEspecialOn: false,
  precioEspecial: 0,
  notas: "",
  revision: 0,
  folioPadre: null,
  incluyeFlete: false,
  fletePaqueteria: "",
  fleteModalidad: "ENTREGA A DOMICILIO",
  fleteCosto: 0,
};

const MEASURE_SCRIPT = `<script>
window.addEventListener("load", async () => {
  await document.fonts.ready;
  await new Promise((r) => setTimeout(r, 300));
  const h = document.querySelector("body > div").getBoundingClientRect().height;
  const meta = document.createElement("meta");
  meta.name = "measured-height";
  meta.content = String(Math.ceil(h));
  document.head.appendChild(meta);
});
</script>`;

const scenarios: Array<{ name: string; state: QuoteState; calc: any; deliveryMsg: string }> = [
  {
    // El caso exacto del PDF VX-2026-0035 que genera segunda hoja
    name: "refl-factura-sinflete",
    state: baseState,
    calc: {
      precioUnitario: 53,
      subtotalProducto: 53000,
      subtotalFlete: 0,
      subtotalGeneral: 53000,
      iva: 8480,
      total: 61480,
    },
    deliveryMsg: "CONSOLIDADO — 3 A 5 DÍAS HÁBILES",
  },
  {
    // Worst case absoluto: refl + factura + flete (fila extra en la tabla)
    name: "refl-factura-flete",
    state: {
      ...baseState,
      municipio: "Tuxpan",
      estadoNombre: "Veracruz",
      incluyeFlete: true,
      fletePaqueteria: "Castores",
      fleteCosto: 4500,
    },
    calc: {
      precioUnitario: 53,
      subtotalProducto: 53000,
      subtotalFlete: 4500,
      subtotalGeneral: 57500,
      iva: 9200,
      total: 66700,
    },
    deliveryMsg: "CONSOLIDADO — 3 A 5 DÍAS HÁBILES",
  },
];

mkdirSync("/tmp/vialux-pdf-test", { recursive: true });
for (const s of scenarios) {
  const html = renderQuoteHtml({
    folio: "VX-2026-0035",
    state: s.state,
    calc: s.calc,
    deliveryMsg: s.deliveryMsg,
    logoDataUrl,
  }).replace("</body>", `${MEASURE_SCRIPT}</body>`);
  writeFileSync(`/tmp/vialux-pdf-test/${s.name}.html`, html);
  console.log(`wrote /tmp/vialux-pdf-test/${s.name}.html`);
}
