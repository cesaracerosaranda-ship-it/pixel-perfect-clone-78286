import { renderFichaHtml } from "./FichaTecnicaTemplate";
import { CONTACT_EMAIL, CONTACT_TEL } from "@/lib/vialux/constants";
import logoUrl from "@/assets/vialux-logo-t.png";

/**
 * Genera la ficha técnica del producto.
 *
 * Se genera cada vez en lugar de guardar un PDF fijo y reenviarlo: WhatsApp
 * marca los archivos reenviados con "reenviado muchas veces", que le quita
 * seriedad a un documento comercial. Cada llamada produce un archivo nuevo.
 */
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

export async function generateFichaPdf(opts: { download?: boolean } = {}): Promise<{
  filename: string;
  blob: Blob;
}> {
  const fontsLoaded = document.head.querySelector("#vialux-pdf-fonts");
  if (!fontsLoaded) {
    const link = document.createElement("link");
    link.id = "vialux-pdf-fonts";
    link.rel = "stylesheet";
    link.href =
      "https://fonts.googleapis.com/css2?family=JetBrains+Mono:ital,wght@0,400;0,500;0,700;0,800;1,400&display=swap";
    document.head.appendChild(link);
  }
  await document.fonts.ready;

  const logoDataUrl = await toDataUrl(logoUrl);
  const html = renderFichaHtml({
    logoDataUrl,
    correo: CONTACT_EMAIL.toLowerCase(),
    telefono: CONTACT_TEL,
  });

  const mod = await import("html2pdf.js");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const html2pdf = (mod as any).default ?? (mod as any);

  // El nombre lleva el año y no la fecha completa: el cliente no debe pensar
  // que recibió una versión "de ayer" si la comparte con un colega.
  const filename = `VIALUX_Ficha_Tecnica_${new Date().getFullYear()}.pdf`;

  const worker = html2pdf()
    .from(html, "string")
    .set({
      margin: 0,
      filename,
      image: { type: "jpeg", quality: 0.98 },
      html2canvas: { scale: 3, backgroundColor: "#ffffff", imageTimeout: 15000 },
      jsPDF: { unit: "pt", format: "letter", orientation: "portrait" },
    });

  const pdf = await worker.toPdf().get("pdf");
  if (opts.download !== false) pdf.save(filename);
  const blob: Blob = pdf.output("blob");
  return { filename, blob };
}
