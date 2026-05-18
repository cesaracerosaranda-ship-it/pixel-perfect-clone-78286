import { renderQuoteHtml } from "./QuotePdfTemplate";
import type { QuoteState } from "@/hooks/useQuoteState";

export type QuoteCalc = {
  precioUnitario: number;
  subtotalProducto: number;
  subtotalFlete: number;
  subtotalGeneral: number;
  iva: number;
  total: number;
};

function sanitize(s: string) {
  return (s || "")
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

export async function generateQuotePdf(args: {
  folio: string;
  state: QuoteState;
  calc: QuoteCalc;
  deliveryMsg: string;
}) {
  const { folio, state, calc } = args;
  const html = renderQuoteHtml(args);

  const container = document.createElement("div");
  container.style.position = "fixed";
  container.style.left = "-10000px";
  container.style.top = "0";
  container.style.width = "794px"; // A4 width in px @ 96dpi
  container.innerHTML = html;
  document.body.appendChild(container);

  try {
    const mod = (await import("html2pdf.js")) as unknown as {
      default: (...args: unknown[]) => any;
    };
    const html2pdf = mod.default;
    const filename = `${folio}_${sanitize(state.cliente || "CLIENTE")}_${
      state.cantidad || 0
    }PZS.pdf`;
    await html2pdf()
      .from(container)
      .set({
        margin: 0,
        filename,
        image: { type: "jpeg", quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, backgroundColor: "#ffffff" },
        jsPDF: { unit: "pt", format: "a4", orientation: "portrait" },
      })
      .save();
  } finally {
    document.body.removeChild(container);
  }
  void calc;
}
