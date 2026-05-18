import { renderQuoteHtml } from "./QuotePdfTemplate";
import type { QuoteState } from "@/hooks/useQuoteState";
import logoUrl from "@/assets/vialux-logo.png";

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

async function toDataUrl(url: string): Promise<string> {
  const res = await fetch(url);
  const blob = await res.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

export async function generateQuotePdf(args: {
  folio: string;
  state: QuoteState;
  calc: QuoteCalc;
  deliveryMsg: string;
}) {
  const { folio, state, calc } = args;

  // Embed logo as base64 so html2canvas no necesita hacer fetch
  const logoDataUrl = await toDataUrl(logoUrl);
  const html = renderQuoteHtml({ ...args, logoDataUrl });

  // position: absolute + top fuera de la página (no fixed + left negativo)
  // html2canvas no captura elementos con position:fixed muy fuera del viewport
  const container = document.createElement("div");
  container.style.cssText = `
    position: absolute;
    top: ${document.documentElement.scrollHeight + 200}px;
    left: 0;
    width: 794px;
    z-index: -1;
    pointer-events: none;
  `;
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
        html2canvas: { scale: 2, backgroundColor: "#ffffff" },
        jsPDF: { unit: "pt", format: "a4", orientation: "portrait" },
      })
      .save();
  } finally {
    document.body.removeChild(container);
  }
  void calc;
}
