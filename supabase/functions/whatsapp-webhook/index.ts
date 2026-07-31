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

// Copia local de src/lib/vialux/telefono.ts (el edge function no comparte bundle
// con la app). Reduce cualquier formato a los últimos 10 dígitos: el número
// nacional mexicano, que es lo comparable entre el wa_id y clientes.telefono.
function normalizarTelefono(valor: string | null | undefined): string | null {
  const digitos = (valor ?? "").replace(/\D/g, "");
  return digitos.length < 10 ? null : digitos.slice(-10);
}

/**
 * Busca en el directorio un cliente cuyo teléfono coincida con el wa_id.
 * Se compara en código (no en SQL) porque el teléfono se captura a mano y
 * llega en formatos libres. Devuelve null si no hay match o si hay ambigüedad.
 */
// deno-lint-ignore no-explicit-any
async function buscarClientePorTelefono(supabase: any, waId: string): Promise<string | null> {
  const objetivo = normalizarTelefono(waId);
  if (!objetivo) return null;
  const { data } = await supabase
    .from("clientes")
    .select("id, telefono")
    .not("telefono", "is", null)
    .neq("telefono", "");
  const matches = (data ?? []).filter(
    (c: { telefono: string | null }) => normalizarTelefono(c.telefono) === objetivo,
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
    const body = await req.json();
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
          const { data: nueva } = await supabase
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
          conversacionId = nueva?.id;
        } else {
          // Si aún no tiene cliente ligado, se reintenta (pudo darse de alta después).
          const patch: Record<string, unknown> = {
            nombre_contacto: m.nombre || undefined,
            ultimo_mensaje: m.texto,
            ultima_actividad: m.ts,
            no_leidos: (conv?.no_leidos ?? 0) + 1,
            archivada: false,
          };
          if (!conv?.cliente_id) {
            const clienteId = await buscarClientePorTelefono(supabase, m.wa_id);
            if (clienteId) patch.cliente_id = clienteId;
          }
          await supabase.from("wa_conversaciones").update(patch).eq("id", conversacionId);
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
            );
        }
      }

      for (const s of statuses) {
        await supabase
          .from("wa_mensajes")
          .update({ estado: s.estado })
          .eq("wa_message_id", s.wa_message_id);
      }
    }

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { ...CORS, "Content-Type": "application/json" },
    });
  } catch (_e) {
    // Aun con error respondemos 200 para que Meta no entre en bucle de reintentos.
    return new Response(JSON.stringify({ ok: false }), {
      status: 200,
      headers: { ...CORS, "Content-Type": "application/json" },
    });
  }
});
