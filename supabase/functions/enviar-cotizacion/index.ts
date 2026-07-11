// Envía la cotización por correo desde la cuenta de Google Workspace de VIALUX
// (cotizaciones@vialuxmty.com) con el PDF adjunto, usando la plantilla comercial
// de la empresa en HTML de marca + versión de texto plano.
// Secretos requeridos (configurar en Supabase/Lovable):
//   GMAIL_USER          — cotizaciones@vialuxmty.com
//   GMAIL_APP_PASSWORD  — contraseña de aplicación de Google (16 caracteres)
import { createClient } from "npm:@supabase/supabase-js@2";
import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// Paleta VIALUX (misma del PDF)
const INK = "#2E2B27";
const GOLD = "#C79100";
const YELLOW = "#F2B90D";
const BORDER = "#E5E2DC";
const GRAY = "#9B968E";
const GRAY_DARK = "#6D6860";
const PAPER = "#FAF9F7";
const STRIP = "#F1EFEA";

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  });
}

function descripcionProducto(producto: string): string {
  switch (producto) {
    case "boya":
      return "fabricadas en acero al carbón calibre 1/8, con pintura electrostática en color amarillo tráfico";
    case "boya_clavos":
      return "fabricadas en acero al carbón calibre 1/8, con pintura electrostática en color amarillo tráfico y sus clavos de alta resistencia";
    case "boya_clavos_refl":
      return "fabricadas en acero al carbón calibre 1/8, con pintura electrostática en color amarillo tráfico, clavos de alta resistencia y sus respectivos reflejantes";
    default:
      return "fabricadas en acero al carbón calibre 1/8, con pintura electrostática en color amarillo tráfico";
  }
}

const MONO = "'Courier New',Courier,monospace";
const SANS = "Arial,Helvetica,sans-serif";

function kpiCell(label: string, value: string, valueColor = INK): string {
  return `<td style="padding:12px 16px;border-right:1px solid ${BORDER};">
    <div style="font-family:${MONO};font-size:9px;letter-spacing:2px;color:${GRAY};">${label}</div>
    <div style="font-family:${MONO};font-size:14px;font-weight:bold;color:${valueColor};padding-top:4px;white-space:nowrap;">${value}</div>
  </td>`;
}

function buildHtml(args: {
  cantidad: string;
  desc: string;
  folio: string;
  totalFmt: string;
  vigencia: string;
  logoUrl: string | null;
}): string {
  const P = `margin:0 0 16px;font-family:${SANS};font-size:14px;line-height:1.6;color:${INK};`;
  const brand = args.logoUrl
    ? `<img src="${args.logoUrl}" alt="VIALUX" height="36" style="display:block;height:36px;width:auto;border:0;">`
    : `<span style="font-family:${SANS};font-size:20px;font-weight:bold;color:#FFFFFF;letter-spacing:3px;">VIALUX</span>`;
  return `<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background:${STRIP};">
<table width="100%" cellpadding="0" cellspacing="0" style="background:${STRIP};">
  <tr><td align="center" style="padding:28px 12px;">
    <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#FFFFFF;border:1px solid ${BORDER};">

      <!-- Header -->
      <tr><td style="background:${INK};padding:18px 28px;">
        <table width="100%" cellpadding="0" cellspacing="0"><tr>
          <td>${brand}</td>
          <td align="right" style="font-family:${MONO};font-size:10px;letter-spacing:2px;color:${GRAY};">COTIZACIÓN <span style="color:${YELLOW};">COMERCIAL</span></td>
        </tr></table>
      </td></tr>
      <tr><td style="height:4px;background:${YELLOW};font-size:0;line-height:0;">&nbsp;</td></tr>

      <!-- Cuerpo -->
      <tr><td style="padding:28px;">
        <p style="${P}">Buenos días,</p>
        <p style="${P}">De acuerdo con su solicitud, le compartimos la <b>cotización formal</b> correspondiente a <b>${args.cantidad} boyas metálicas VIALUX</b>, ${args.desc}.</p>

        <!-- Tarjeta de resumen -->
        <table width="100%" cellpadding="0" cellspacing="0" style="background:${PAPER};border:1px solid ${BORDER};margin:4px 0 20px;">
          <tr>
            ${kpiCell("FOLIO", args.folio, GOLD)}
            ${kpiCell("CANTIDAD", `${args.cantidad} PZAS`)}
            ${kpiCell("TOTAL", `${args.totalFmt} MXN`, GOLD)}
            <td style="padding:12px 16px;">
              <div style="font-family:${MONO};font-size:9px;letter-spacing:2px;color:${GRAY};">VIGENCIA</div>
              <div style="font-family:${MONO};font-size:14px;font-weight:bold;color:${INK};padding-top:4px;white-space:nowrap;">${args.vigencia} DÍAS</div>
            </td>
          </tr>
        </table>

        <p style="${P}">Adjunto encontrará el documento en formato <b>PDF</b> con el detalle de precios.</p>
        <p style="${P}">Quedamos atentos a su confirmación para avanzar con el pedido o resolver cualquier duda adicional que pueda tener.</p>
        <p style="${P}">Agradecemos su confianza en <b>VIALUX</b> y esperamos poder atender su proyecto.</p>
        <p style="${P}margin-bottom:6px;">Saludos cordiales,</p>

        <!-- Firma -->
        <table cellpadding="0" cellspacing="0" style="margin-top:14px;">
          <tr>
            <td style="width:3px;background:${YELLOW};font-size:0;">&nbsp;</td>
            <td style="padding:4px 0 4px 16px;">
              <div style="font-family:${SANS};font-size:15px;font-weight:bold;color:${INK};">Augusto Robles</div>
              <div style="font-family:${MONO};font-size:10px;letter-spacing:2px;color:${GRAY_DARK};padding-top:2px;">VENTAS · VIALUX</div>
              <div style="font-family:${SANS};font-size:12px;color:${GRAY_DARK};padding-top:8px;line-height:1.7;">
                Tel. <a href="tel:+528130730586" style="color:${GOLD};text-decoration:none;">+52 81 3073 0586</a><br>
                <a href="mailto:cotizaciones@vialuxmty.com" style="color:${GOLD};text-decoration:none;">cotizaciones@vialuxmty.com</a>
              </div>
            </td>
          </tr>
        </table>
      </td></tr>

      <!-- Footer -->
      <tr><td style="background:${INK};padding:14px 28px;" align="center">
        <div style="font-family:${MONO};font-size:10px;font-weight:bold;letter-spacing:2px;color:#FFFFFF;">SEÑALIZACIÓN VIAL DE PRECISIÓN <span style="color:${YELLOW};">·</span> DISPONIBILIDAD INMEDIATA <span style="color:${YELLOW};">·</span> ENVÍO NACIONAL</div>
        <div style="font-family:${MONO};font-size:9px;letter-spacing:3px;color:${GRAY};padding-top:5px;">MONTERREY, NUEVO LEÓN, MÉXICO</div>
      </td></tr>

    </table>
  </td></tr>
</table>
</body>
</html>`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });

  try {
    const gmailUser = Deno.env.get("GMAIL_USER");
    const gmailPass = Deno.env.get("GMAIL_APP_PASSWORD");
    if (!gmailUser || !gmailPass) {
      return json(
        { error: "Faltan los secretos GMAIL_USER / GMAIL_APP_PASSWORD" },
        503,
      );
    }

    const { cotizacion_id } = await req.json();
    if (!cotizacion_id) return json({ error: "Falta cotizacion_id" }, 400);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Cotización + correo del cliente
    const { data: cot, error: e1 } = await supabase
      .from("cotizaciones")
      .select("id, folio, cantidad, producto, total, estado, cliente_id, cliente_nombre")
      .eq("id", cotizacion_id)
      .single();
    if (e1 || !cot) return json({ error: "Cotización no encontrada" }, 404);

    let email = "";
    if (cot.cliente_id) {
      const { data: cli } = await supabase
        .from("clientes")
        .select("email")
        .eq("id", cot.cliente_id)
        .maybeSingle();
      email = (cli?.email ?? "").trim();
    }
    if (!email) {
      return json({ error: "El cliente no tiene correo registrado" }, 400);
    }

    // PDF archivado en el expediente
    const { data: docs } = await supabase
      .from("documentos")
      .select("storage_path, nombre_archivo")
      .eq("cotizacion_id", cotizacion_id)
      .eq("tipo", "cotizacion")
      .limit(1);
    const doc = docs?.[0];
    if (!doc) {
      return json(
        { error: "La cotización no tiene PDF archivado todavía" },
        409,
      );
    }
    const { data: file, error: e2 } = await supabase.storage
      .from("documentos")
      .download(doc.storage_path);
    if (e2 || !file) return json({ error: "No se pudo leer el PDF" }, 500);
    const pdfBytes = new Uint8Array(await file.arrayBuffer());

    // Logo hospedado en el bucket (liga firmada de 1 año); si falla,
    // la plantilla cae al wordmark de texto
    let logoUrl: string | null = null;
    try {
      const { data: signedLogo } = await supabase.storage
        .from("documentos")
        .createSignedUrl("_brand/vialux-logo-email.png", 60 * 60 * 24 * 365);
      logoUrl = signedLogo?.signedUrl ?? null;
    } catch (_) { /* sin logo, con texto */ }

    // Plantilla comercial VIALUX
    const cantidad = new Intl.NumberFormat("es-MX").format(cot.cantidad);
    const totalFmt = new Intl.NumberFormat("es-MX", {
      style: "currency",
      currency: "MXN",
    }).format(Number(cot.total));
    const subject = `COTIZACIÓN ${cantidad} BOYAS VIALUX — ${cot.folio}`;
    const desc = descripcionProducto(cot.producto);
    const texto = `Buenos días,

De acuerdo con su solicitud, le compartimos la cotización formal correspondiente a ${cantidad} boyas metálicas VIALUX, ${desc}.

FOLIO: ${cot.folio} · CANTIDAD: ${cantidad} PZAS · TOTAL: ${totalFmt} MXN · VIGENCIA: 7 DÍAS

Adjunto encontrará el documento en formato PDF con el detalle de precios.

Quedamos atentos a su confirmación para avanzar con el pedido o resolver cualquier duda adicional que pueda tener.

Agradecemos su confianza en VIALUX y esperamos poder atender su proyecto.

Saludos cordiales,

Augusto Robles
Ventas · VIALUX
Tel. +52 81 3073 0586
cotizaciones@vialuxmty.com`;
    const html = buildHtml({ cantidad, desc, folio: cot.folio, totalFmt, vigencia: "7", logoUrl });

    const client = new SMTPClient({
      connection: {
        hostname: "smtp.gmail.com",
        port: 465,
        tls: true,
        auth: { username: gmailUser, password: gmailPass },
      },
    });
    try {
      await client.send({
        from: `Augusto Robles · VIALUX <${gmailUser}>`,
        to: email,
        subject,
        content: texto,
        html,
        attachments: [
          {
            filename: doc.nombre_archivo,
            content: pdfBytes,
            encoding: "binary",
            contentType: "application/pdf",
          },
        ],
      });
    } finally {
      await client.close();
    }

    // La cotización pasa a "enviado" (solo si sigue en cotizado)
    if (cot.estado === "cotizado") {
      await supabase
        .from("cotizaciones")
        .update({ estado: "enviado" })
        .eq("id", cotizacion_id);
    }

    return json({ ok: true, email, folio: cot.folio });
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});
