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

// Altura de página carta en px CSS (816px de ancho → 612pt, escala 0.75)
const PAGE_HEIGHT_PX = 1056;

// Mide la altura real del HTML renderizado en un iframe oculto para poder
// empujar el footer al borde inferior exacto de la hoja.
function measureHtmlHeight(html: string): Promise<number> {
  return new Promise((resolve) => {
    const iframe = document.createElement("iframe");
    iframe.style.cssText =
      "position:fixed;left:-9999px;top:0;width:816px;height:1200px;visibility:hidden;border:0;";
    iframe.onload = async () => {
      try {
        const doc = iframe.contentDocument;
        if (!doc) return resolve(0);
        await (doc as Document & { fonts?: FontFaceSet }).fonts?.ready;
        const h =
          doc.body.firstElementChild?.getBoundingClientRect().height ?? 0;
        resolve(Math.ceil(h));
      } catch {
        resolve(0);
      } finally {
        document.body.removeChild(iframe);
      }
    };
    document.body.appendChild(iframe);
    iframe.srcdoc = html;
  });
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

  // Precarga Manrope y JetBrains Mono en el documento principal para que
  // estén en caché cuando html2canvas renderice el contenido del PDF.
  const fontsLoaded = document.head.querySelector("#vialux-pdf-fonts");
  if (!fontsLoaded) {
    const link = document.createElement("link");
    link.id = "vialux-pdf-fonts";
    link.rel = "stylesheet";
    link.href =
      "https://fonts.googleapis.com/css2?family=Manrope:wght@400;600;700;800&family=JetBrains+Mono:wght@400;500;700;800&display=swap";
    document.head.appendChild(link);
  }
  await document.fonts.ready;

  const logoDataUrl = await toDataUrl(logoUrl);
  let html = renderQuoteHtml({ ...args, logoDataUrl });

  // Footer al fondo de la hoja: mide el contenido y rellena el faltante.
  // Los 4px de holgura evitan que un redondeo genere una página extra en blanco.
  const contentHeight = await measureHtmlHeight(html);
  if (contentHeight > 0) {
    const pages = Math.max(1, Math.ceil(contentHeight / PAGE_HEIGHT_PX));
    const pad = pages * PAGE_HEIGHT_PX - contentHeight - 4;
    if (pad > 0) {
      html = html.replace(
        "<!-- FOOTER-SPACER -->",
        `<div style="height:${pad}px;"></div>`,
      );
    }
  }

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
      // Carta: 612×792pt; el HTML mide 816px de ancho → escala exacta 0.75,
      // presupuesto de altura por página: 1056px.
      jsPDF: { unit: "pt", format: "letter", orientation: "portrait" },
    })
    .save();

  void calc;
}
