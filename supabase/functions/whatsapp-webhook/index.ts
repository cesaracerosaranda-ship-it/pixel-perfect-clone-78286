// Webhook de la WhatsApp Cloud API: recibe mensajes entrantes y recibos de
// estado de Meta, y los guarda en wa_conversaciones / wa_mensajes.
//
// IMPORTANTE (config en Lovable/Supabase): esta función debe ser PÚBLICA
// (verify_jwt = false) porque Meta la llama sin sesión de Supabase.
// Secretos requeridos:
//   WHATSAPP_VERIFY_TOKEN  — cadena que tú inventas; se pega igual en Meta
//   (el token de envío WHATSAPP_TOKEN y PHONE_NUMBER_ID se usan al ENVIAR,
//    en otra función; aquí solo recibimos)
import { createClient } from "npm:@supabase/supabase-js@2";

type IncomingMsg = {
  wa_id: string;
  nombre: string;
  texto: string;
  tipo: string;
  wa_message_id: string;
  ts: string; // ISO
};
type StatusUpdate = { wa_message_id: string; estado: string };

// ── Parseo puro del payload de Meta (testeable sin DB) ─────────────────────
export function parseWebhook(body: unknown): {
  incoming: IncomingMsg[];
  statuses: StatusUpdate[];
} {
  const incoming: IncomingMsg[] = [];
  const statuses: StatusUpdate[] = [];
  const b = body as any;
  const entries = Array.isArray(b?.entry) ? b.entry : [];
  for (const entry of entries) {
    const changes = Array.isArray(entry?.changes) ? entry.changes : [];
    for (const change of changes) {
      const value = change?.value ?? {};
      // Mapa wa_id → nombre de contacto
      const nombres = new Map<string, string>();
      for (const c of value.contacts ?? []) {
        if (c?.wa_id) nombres.set(String(c.wa_id), c?.profile?.name ?? "");
      }
      // Mensajes entrantes
      for (const m of value.messages ?? []) {
        const wa_id = String(m?.from ?? "");
        if (!wa_id || !m?.id) continue;
        const tipo = String(m?.type ?? "text");
        let texto = "";
        if (tipo === "text") texto = m?.text?.body ?? "";
        else if (tipo === "button") texto = m?.button?.text ?? "";
        else if (tipo === "interactive")
          texto =
            m?.interactive?.button_reply?.title ??
            m?.interactive?.list_reply?.title ??
            "";
        else if (m?.[tipo]?.caption) texto = m[tipo].caption;
        else texto = `[${tipo}]`;
        const tsNum = Number(m?.timestamp);
        incoming.push({
          wa_id,
          nombre: nombres.get(wa_id) ?? "",
          texto,
          tipo,
          wa_message_id: String(m.id),
          ts: Number.isFinite(tsNum)
            ? new Date(tsNum * 1000).toISOString()
            : new Date().toISOString(),
        });
      }
      // Recibos de estado (mensajes salientes)
      for (const s of value.statuses ?? []) {
        if (s?.id && s?.status)
          statuses.push({ wa_message_id: String(s.id), estado: String(s.status) });
      }
    }
  }
  return { incoming, statuses };
}

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/**
 * Verifica que el POST venga realmente de Meta (firma HMAC-SHA256 del cuerpo
 * con el App Secret, header X-Hub-Signature-256). Sin esto, cualquiera que
 * conozca la URL podría inyectar conversaciones falsas en los hilos de clientes
 * reales. Comparación en tiempo constante para no filtrar la firma.
 *
 * Si WHATSAPP_APP_SECRET aún no está configurado, se acepta el evento pero se
 * deja constancia en logs — así el despliegue no rompe la operación en curso;
 * en cuanto se configura el secreto, la validación pasa a ser obligatoria.
 */
async function firmaValida(rawBody: string, signatureHeader: string | null): Promise<boolean> {
  const appSecret = Deno.env.get("WHATSAPP_APP_SECRET");
  if (!appSecret) {
    console.warn("[whatsapp-webhook] WHATSAPP_APP_SECRET sin configurar: se acepta sin verificar firma");
    return true;
  }
  if (!signatureHeader?.startsWith("sha256=")) return false;

  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(appSecret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const mac = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(rawBody));
  const esperado = Array.from(new Uint8Array(mac))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  const recibido = signatureHeader.slice("sha256=".length);

  // Comparación en tiempo constante
  if (recibido.length !== esperado.length) return false;
  let diff = 0;
  for (let i = 0; i < esperado.length; i++) diff |= esperado.charCodeAt(i) ^ recibido.charCodeAt(i);
  return diff === 0;
}

// Copia local de src/lib/vialux/telefono.ts (el edge function no comparte bundle
// con la app). Reduce cualquier formato a los últimos 10 dígitos: el número
// nacional mexicano, que es lo comparable entre el wa_id y clientes.telefono.
function normalizarTelefono(valor: string | null | undefined): string | null {
  const digitos = (valor ?? "").replace(/\D/g, "");
  return digitos.length < 10 ? null : digitos.slice(-10);
}

/**
 * El sobrante antes de los últimos 10 dígitos debe ser vacío o lada de México.
 * Sin esto, un teléfono de EE.UU. (+1 818 123 4567) colisionaría con un wa_id
 * mexicano (52 818 123 4567) y ligaría el chat al expediente de OTRO cliente.
 */
function prefijoMexicano(valor: string | null | undefined): boolean {
  const digitos = (valor ?? "").replace(/\D/g, "");
  if (digitos.length < 10) return false;
  const prefijo = digitos.slice(0, -10);
  return prefijo === "" || prefijo === "52" || prefijo === "521";
}

/**
 * Busca en el directorio un cliente cuyo teléfono coincida con el wa_id.
 * Se compara en código (no en SQL) porque el teléfono se captura a mano y
 * llega en formatos libres. Devuelve null si no hay match o si hay ambigüedad.
 */
// deno-lint-ignore no-explicit-any
async function buscarClientePorTelefono(supabase: any, waId: string): Promise<string | null> {
  const objetivo = normalizarTelefono(waId);
  if (!objetivo || !prefijoMexicano(waId)) return null;
  const { data, error } = await supabase
    .from("clientes")
    .select("id, telefono")
    .not("telefono", "is", null)
    .neq("telefono", "")
    .limit(5000); // explícito: PostgREST corta en 1000 por defecto y ligaría de menos en silencio
  if (error) {
    console.error("[whatsapp-webhook] error consultando clientes:", error.message);
    return null;
  }
  const matches = (data ?? []).filter(
    (c: { telefono: string | null }) =>
      normalizarTelefono(c.telefono) === objetivo && prefijoMexicano(c.telefono),
  );
  // Solo se liga cuando el match es inequívoco.
  return matches.length === 1 ? (matches[0].id as string) : null;
}

Deno.serve(async (req) => {
  const url = new URL(req.url);

  // ── Handshake de verificación (Meta hace GET al configurar el webhook) ──
  if (req.method === "GET") {
    const mode = url.searchParams.get("hub.mode");
    const token = url.searchParams.get("hub.verify_token");
    const challenge = url.searchParams.get("hub.challenge");
    const expected = Deno.env.get("WHATSAPP_VERIFY_TOKEN");
    if (mode === "subscribe" && token && expected && token === expected) {
      return new Response(challenge ?? "", { status: 200 });
    }
    return new Response("forbidden", { status: 403 });
  }

  if (req.method !== "POST") {
    return new Response("method not allowed", { status: 405, headers: CORS });
  }

  // Meta reintenta si no recibe 200 pronto: guardamos y respondemos 200 siempre
  // que el payload sea válido (los errores internos se registran, no se propagan).
  try {
    // El cuerpo se lee crudo para poder verificar la firma sobre los bytes exactos.
    const rawBody = await req.text();
    if (!(await firmaValida(rawBody, req.headers.get("x-hub-signature-256")))) {
      console.error("[whatsapp-webhook] firma inválida — evento descartado");
      return new Response("invalid signature", { status: 401, headers: CORS });
    }

    const body = JSON.parse(rawBody);
    const { incoming, statuses } = parseWebhook(body);

    if (incoming.length || statuses.length) {
      const supabase = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      );

      for (const m of incoming) {
        // Conversación (crea o actualiza por wa_id)
        const { data: conv } = await supabase
          .from("wa_conversaciones")
          .select("id, no_leidos, cliente_id")
          .eq("wa_id", m.wa_id)
          .maybeSingle();

        let conversacionId = conv?.id as string | undefined;
        if (!conversacionId) {
          // Conversación nueva: se intenta ligar al cliente del directorio
          // cuyo teléfono coincida, para que el chat aparezca junto a sus
          // cotizaciones y expediente.
          const clienteId = await buscarClientePorTelefono(supabase, m.wa_id);
          const { data: nueva, error: insErr } = await supabase
            .from("wa_conversaciones")
            .insert({
              wa_id: m.wa_id,
              nombre_contacto: m.nombre,
              cliente_id: clienteId,
              ultimo_mensaje: m.texto,
              ultima_actividad: m.ts,
              no_leidos: 1,
            })
            .select("id")
            .single();
          if (insErr) {
            // Carrera: otra entrega simultánea del mismo contacto ya la creó
            // (choca con el UNIQUE de wa_id). Se recupera en vez de perder el mensaje.
            const { data: existente } = await supabase
              .from("wa_conversaciones")
              .select("id")
              .eq("wa_id", m.wa_id)
              .maybeSingle();
            conversacionId = existente?.id;
            if (!conversacionId) {
              console.error(
                "[whatsapp-webhook] no se pudo crear ni recuperar la conversación:",
                insErr.message,
              );
            }
          } else {
            conversacionId = nueva?.id;
          }
        } else {
          // Si aún no tiene cliente ligado, se reintenta (pudo darse de alta después).
          const patch: Record<string, unknown> = {
            ultimo_mensaje: m.texto,
            ultima_actividad: m.ts,
            no_leidos: (conv?.no_leidos ?? 0) + 1,
            archivada: false,
          };
          if (m.nombre) patch.nombre_contacto = m.nombre;
          if (!conv?.cliente_id) {
            const clienteId = await buscarClientePorTelefono(supabase, m.wa_id);
            if (clienteId) patch.cliente_id = clienteId;
          }
          const { error: updErr } = await supabase
            .from("wa_conversaciones")
            .update(patch)
            .eq("id", conversacionId);
          if (updErr) console.error("[whatsapp-webhook] update conversación:", updErr.message);
        }

        if (conversacionId) {
          // Mensaje (idempotente por wa_message_id)
          await supabase
            .from("wa_mensajes")
            .upsert(
              {
                conversacion_id: conversacionId,
                wa_message_id: m.wa_message_id,
                direccion: "in",
                tipo: m.tipo,
                texto: m.texto,
                timestamp_wa: m.ts,
                estado: "read",
              },
              { onConflict: "wa_message_id", ignoreDuplicates: true },
            )
            .then(({ error }: { error: { message: string } | null }) => {
              if (error) console.error("[whatsapp-webhook] insert mensaje:", error.message);
            });
        }
      }

      for (const s of statuses) {
        // Los recibos aplican solo a mensajes que NOSOTROS enviamos.
        const { error: stErr } = await supabase
          .from("wa_mensajes")
          .update({ estado: s.estado })
          .eq("wa_message_id", s.wa_message_id)
          .eq("direccion", "out");
        if (stErr) console.error("[whatsapp-webhook] update estado:", stErr.message);
      }
    }

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { ...CORS, "Content-Type": "application/json" },
    });
  } catch (e) {
    // Se registra para poder diagnosticar; aun así respondemos 200 para que
    // Meta no entre en bucle de reintentos por un payload que no vamos a poder
    // procesar de todos modos.
    console.error("[whatsapp-webhook] excepción procesando evento:", (e as Error).message);
    return new Response(JSON.stringify({ ok: false }), {
      status: 200,
      headers: { ...CORS, "Content-Type": "application/json" },
    });
  }
});
