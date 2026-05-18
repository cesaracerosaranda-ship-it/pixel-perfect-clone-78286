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

  const logoDataUrl = await toDataUrl(logoUrl);
  const html = renderQuoteHtml({ ...args, logoDataUrl });

  const mod = await import("html2pdf.js");
  // Soporta tanto ESM interop (mod.default) como CJS directo (mod)
  const html2pdf = (mod as any).default ?? (mod as any);

  const filename = `${folio}_${sanitize(state.cliente || "CLIENTE")}_${
    state.cantidad || 0
  }PZS.pdf`;

  // Pasamos el HTML como string — html2pdf 0.14 maneja su propio overlay
  // con posicionamiento y dimensiones correctas. Evita el problema de
  // offsetWidth=0 cuando el container se inyecta manualmente fuera del viewport.
  await html2pdf()
    .from(html, "string")
    .set({
      margin: 0,
      filename,
      image: { type: "jpeg", quality: 0.98 },
      html2canvas: { scale: 2, backgroundColor: "#ffffff", imageTimeout: 15000 },
      jsPDF: { unit: "pt", format: "a4", orientation: "portrait" },
    })
    .save();

  void calc;
}
