// Envía la cotización por correo desde la cuenta de Gmail de VIALUX con el
// PDF adjunto, usando la plantilla real de correos comerciales de la empresa.
// Secretos requeridos (configurar en Supabase/Lovable):
//   GMAIL_USER          — cotizaciones.vialuxmty@gmail.com
//   GMAIL_APP_PASSWORD  — contraseña de aplicación de Google (16 caracteres)
import { createClient } from "npm:@supabase/supabase-js@2";
import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

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

    // Plantilla real de correos comerciales VIALUX
    const cantidad = new Intl.NumberFormat("es-MX").format(cot.cantidad);
    const subject = `COTIZACIÓN ${cantidad} BOYAS VIALUX — ${cot.folio}`;
    const desc = descripcionProducto(cot.producto);
    const texto = `Buenos días,

De acuerdo con su solicitud, le compartimos la cotización formal correspondiente a ${cantidad} boyas metálicas VIALUX, ${desc}.

Adjunto encontrará el documento en formato PDF con el detalle de precios.

Quedamos atentos a su confirmación para avanzar con el pedido o resolver cualquier duda adicional que pueda tener.

Agradecemos su confianza en VIALUX y esperamos poder atender su proyecto.

Saludos cordiales,

Augusto Robles
Ventas
VIALUX
+52 81 3073 0586`;
    const html = texto
      .split("\n\n")
      .map((p) =>
        `<p style="margin:0 0 14px;font-family:Arial,sans-serif;font-size:14px;line-height:1.5;color:#2E2B27;">${
          p.replaceAll("\n", "<br>")
            .replace("cotización formal", "<b>cotización formal</b>")
            .replace(`${cantidad} boyas metálicas VIALUX`, `<b>${cantidad} boyas metálicas VIALUX</b>`)
            .replace("Agradecemos su confianza en VIALUX", "Agradecemos su confianza en <b>VIALUX</b>")
        }</p>`,
      )
      .join("");

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
        from: `Augusto Robles <${gmailUser}>`,
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
