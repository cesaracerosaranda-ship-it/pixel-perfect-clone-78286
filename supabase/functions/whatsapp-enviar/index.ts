// Envía un mensaje de texto por la WhatsApp Cloud API y lo registra en el hilo.
//
// La llama la bandeja de VIALUX Control (usuario autenticado), por lo que esta
// función SÍ requiere JWT — a diferencia del webhook, que es público.
//
// Secretos requeridos (configurar en Lovable/Supabase):
//   WHATSAPP_TOKEN            — token de acceso (idealmente permanente, de System User)
//   WHATSAPP_PHONE_NUMBER_ID  — id del número emisor (p.ej. el de prueba)
import { createClient } from "npm:@supabase/supabase-js@2";

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

/**
 * Traduce los errores de Meta a algo accionable para el vendedor.
 * El más frecuente es el 131047: fuera de la ventana de 24 h, WhatsApp no
 * permite texto libre y exige una plantilla aprobada.
 */
function mensajeDeError(err: { code?: number; message?: string } | undefined): string {
  const code = err?.code;
  if (code === 131047 || code === 131026) {
    return "Pasaron más de 24 h desde el último mensaje del cliente: WhatsApp ya no permite texto libre en esta conversación. Hay que retomarla con una plantilla aprobada.";
  }
  if (code === 190) {
    return "El token de WhatsApp expiró o es inválido. Hay que generar uno nuevo (permanente) y actualizarlo en los secretos.";
  }
  if (code === 131030) {
    return "El destinatario no está en la lista autorizada. Los números de PRUEBA de Meta solo pueden escribir a destinatarios verificados (máximo 5), aunque la app ya esté publicada. Agrégalo en Meta → Step 1 → Recipient.";
  }
  return err?.message ?? "No se pudo enviar el mensaje.";
}

/**
 * Variantes del número de destino a intentar.
 *
 * WhatsApp entrega los wa_id de México como 521XXXXXXXXXX: ese "1" después del
 * 52 es una herencia histórica que NO forma parte del número real, y Meta suele
 * registrar el destinatario en su forma E.164 (52XXXXXXXXXX). Como para Meta son
 * dos identificadores distintos, se prueban ambos: primero el wa_id tal cual y,
 * si el número no resulta reconocido, la variante sin/con el "1".
 * (Argentina, +54, tiene el mismo comportamiento con el "9".)
 */
function variantesDestino(waId: string): string[] {
  const d = (waId ?? "").replace(/\D/g, "");
  const variantes = [d];
  if (d.startsWith("521") && d.length === 13) variantes.push("52" + d.slice(3));
  else if (d.startsWith("52") && d.length === 12) variantes.push("521" + d.slice(2));
  else if (d.startsWith("549") && d.length === 13) variantes.push("54" + d.slice(3));
  else if (d.startsWith("54") && d.length === 12) variantes.push("549" + d.slice(2));
  return variantes;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ error: "method not allowed" }, 405);

  try {
    const token = Deno.env.get("WHATSAPP_TOKEN");
    const phoneNumberId = Deno.env.get("WHATSAPP_PHONE_NUMBER_ID");
    if (!token || !phoneNumberId) {
      return json(
        { error: "Faltan los secretos WHATSAPP_TOKEN / WHATSAPP_PHONE_NUMBER_ID" },
        503,
      );
    }

    const { conversacion_id, texto } = await req.json();
    if (!conversacion_id || !String(texto ?? "").trim()) {
      return json({ error: "Falta conversacion_id o texto" }, 400);
    }
    const cuerpo = String(texto).trim();

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: conv, error: convErr } = await supabase
      .from("wa_conversaciones")
      .select("id, wa_id")
      .eq("id", conversacion_id)
      .single();
    if (convErr || !conv) return json({ error: "Conversación no encontrada" }, 404);

    // Envío vía Graph API. Se intentan las variantes del número (ver
    // variantesDestino): si Meta no reconoce el destinatario con el wa_id tal
    // cual, se reintenta con la forma E.164 equivalente antes de darse por vencido.
    const destinos = variantesDestino(conv.wa_id);
    let resultado: { error?: { code?: number; message?: string }; messages?: Array<{ id?: string }> } = {};
    let enviado = false;

    for (const destino of destinos) {
      const resp = await fetch(
        `https://graph.facebook.com/v21.0/${phoneNumberId}/messages`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            messaging_product: "whatsapp",
            recipient_type: "individual",
            to: destino,
            type: "text",
            text: { preview_url: true, body: cuerpo },
          }),
        },
      );
      resultado = await resp.json();
      if (resp.ok) {
        enviado = true;
        break;
      }
      // Solo tiene sentido reintentar cuando el problema es el identificador
      // del destinatario; ante token vencido o ventana de 24 h no cambia nada.
      const code = resultado?.error?.code;
      if (code !== 131030 && code !== 131026) break;
      console.warn(`[whatsapp-enviar] destino ${destino} rechazado (code ${code}); probando variante`);
    }

    if (!enviado) {
      return json({ error: mensajeDeError(resultado?.error) }, 400);
    }

    const waMessageId = resultado?.messages?.[0]?.id ?? null;
    const ahora = new Date().toISOString();

    // Se registra en el hilo para que quede el historial completo
    await supabase.from("wa_mensajes").insert({
      conversacion_id: conv.id,
      wa_message_id: waMessageId,
      direccion: "out",
      tipo: "text",
      texto: cuerpo,
      estado: "sent",
      timestamp_wa: ahora,
    });

    await supabase
      .from("wa_conversaciones")
      .update({ ultimo_mensaje: cuerpo, ultima_actividad: ahora, archivada: false })
      .eq("id", conv.id);

    return json({ ok: true, wa_message_id: waMessageId });
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});
