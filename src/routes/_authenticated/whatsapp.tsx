import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { PageTitle } from "@/components/RailSection";
import { Search, MessageCircle, User } from "lucide-react";

export const Route = createFileRoute("/_authenticated/whatsapp")({
  component: WhatsAppPage,
});

type Conversacion = {
  id: string;
  wa_id: string;
  nombre_contacto: string;
  cliente_id: string | null;
  pipeline: string;
  no_leidos: number;
  ultimo_mensaje: string;
  ultima_actividad: string;
  archivada: boolean;
  clientes?: { nombre: string } | null;
};

type Mensaje = {
  id: string;
  conversacion_id: string;
  direccion: string;
  tipo: string;
  texto: string;
  estado: string;
  timestamp_wa: string;
};

const PIPELINE = [
  { value: "nuevo", label: "NUEVO", cls: "bg-[#EDBA1A] text-[#1B1A17]" },
  { value: "potencial", label: "POTENCIAL", cls: "bg-[#F1EFEA] text-[#8A857C]" },
  { value: "seguimiento", label: "SEGUIMIENTO", cls: "bg-[#C79100] text-white" },
  { value: "vendido", label: "VENDIDO", cls: "bg-[#10B981] text-white" },
  { value: "perdido", label: "PERDIDO", cls: "bg-[#DC2626] text-white" },
];
const pipeCls = (p: string) =>
  PIPELINE.find((x) => x.value === p)?.cls ?? "bg-[#F1EFEA] text-[#8A857C]";

function iniciales(nombre: string, wa_id: string) {
  const base = (nombre || "").trim();
  if (base) {
    return base.split(" ").slice(0, 2).map((w) => w[0]).join("").toUpperCase();
  }
  return wa_id.slice(-2);
}

function horaCorta(iso: string) {
  const d = new Date(iso);
  const hoy = new Date();
  const mismoDia = d.toDateString() === hoy.toDateString();
  return mismoDia
    ? d.toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" })
    : d.toLocaleDateString("es-MX", { day: "2-digit", month: "2-digit" });
}

function WhatsAppPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [selId, setSelId] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const convQuery = useQuery({
    queryKey: ["wa_conversaciones"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("wa_conversaciones")
        .select("*, clientes(nombre)")
        .eq("archivada", false)
        .order("ultima_actividad", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Conversacion[];
    },
  });

  const msgQuery = useQuery({
    queryKey: ["wa_mensajes", selId],
    enabled: !!selId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("wa_mensajes")
        .select("*")
        .eq("conversacion_id", selId)
        .order("timestamp_wa", { ascending: true });
      if (error) throw error;
      return (data ?? []) as Mensaje[];
    },
  });

  // Realtime: refresca conversaciones y mensajes al vuelo
  useEffect(() => {
    const ch = supabase
      .channel("wa-inbox")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "wa_conversaciones" },
        () => qc.invalidateQueries({ queryKey: ["wa_conversaciones"] }),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "wa_mensajes" },
        () => {
          qc.invalidateQueries({ queryKey: ["wa_mensajes"] });
          qc.invalidateQueries({ queryKey: ["wa_conversaciones"] });
        },
      )
      .subscribe();
    return () => { void supabase.removeChannel(ch); };
  }, [qc]);

  // Autoscroll al último mensaje
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [msgQuery.data, selId]);

  const conversaciones = useMemo(() => {
    const all = convQuery.data ?? [];
    if (!search) return all;
    const q = search.toLowerCase();
    return all.filter(
      (c) =>
        c.nombre_contacto.toLowerCase().includes(q) ||
        c.wa_id.includes(q) ||
        (c.clientes?.nombre ?? "").toLowerCase().includes(q),
    );
  }, [convQuery.data, search]);

  const sel = conversaciones.find((c) => c.id === selId) ??
    (convQuery.data ?? []).find((c) => c.id === selId) ?? null;

  const abrir = async (c: Conversacion) => {
    setSelId(c.id);
    if (c.no_leidos > 0) {
      await supabase.from("wa_conversaciones").update({ no_leidos: 0 }).eq("id", c.id);
      qc.invalidateQueries({ queryKey: ["wa_conversaciones"] });
    }
  };

  const cambiarPipeline = async (id: string, pipeline: string) => {
    const { error } = await supabase
      .from("wa_conversaciones")
      .update({ pipeline })
      .eq("id", id);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["wa_conversaciones"] });
  };

  const totalNoLeidos = (convQuery.data ?? []).reduce((s, c) => s + c.no_leidos, 0);

  return (
    <div className="mx-auto w-full max-w-7xl px-6 py-8">
      <PageTitle
        kicker="Módulo · Conversaciones"
        title="WhatsApp"
        right={
          totalNoLeidos > 0 ? (
            <div className="bg-[#EDBA1A] px-3 py-1.5 font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-[#1B1A17]">
              {totalNoLeidos} sin leer
            </div>
          ) : undefined
        }
      />

      <div className="grid grid-cols-1 border border-border bg-card md:grid-cols-[340px_1fr]">
        {/* Lista de conversaciones */}
        <div className="border-b border-border md:border-b-0 md:border-r">
          <div className="border-b border-border p-3">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="BUSCAR CONTACTO O CLIENTE…"
                className="bg-background pl-9 font-mono text-xs"
              />
            </div>
          </div>
          <div className="max-h-[560px] overflow-y-auto">
            {convQuery.isLoading ? (
              <p className="p-6 text-center text-xs text-muted-foreground">Cargando…</p>
            ) : conversaciones.length === 0 ? (
              <div className="p-6 text-center">
                <MessageCircle className="mx-auto mb-2 h-6 w-6 text-[#D8D5CE]" />
                <p className="text-xs text-muted-foreground">
                  Aún no hay conversaciones. Llegarán aquí en cuanto un cliente escriba
                  al número conectado.
                </p>
              </div>
            ) : (
              conversaciones.map((c) => {
                const activa = c.id === selId;
                return (
                  <button
                    key={c.id}
                    onClick={() => abrir(c)}
                    className={`flex w-full items-start gap-3 border-b border-[#EFEDE8] px-3 py-3 text-left transition-colors ${
                      activa ? "bg-[#EDBA1A]/[0.06]" : "hover:bg-muted/50"
                    }`}
                  >
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center bg-[#EDBA1A] font-mono text-[11px] font-extrabold text-[#1B1A17]">
                      {iniciales(c.nombre_contacto, c.wa_id)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="truncate text-xs font-bold">
                          {c.nombre_contacto || c.wa_id}
                        </span>
                        <span className="shrink-0 font-mono text-[9px] text-muted-foreground">
                          {horaCorta(c.ultima_actividad)}
                        </span>
                      </div>
                      <div className="mt-0.5 flex items-center gap-1.5">
                        <span className="truncate text-[11px] text-muted-foreground">
                          {c.ultimo_mensaje || "—"}
                        </span>
                        {c.no_leidos > 0 && (
                          <span className="ml-auto flex h-4 min-w-4 shrink-0 items-center justify-center bg-[#10B981] px-1 font-mono text-[9px] font-bold text-white">
                            {c.no_leidos}
                          </span>
                        )}
                      </div>
                      <div className="mt-1 flex items-center gap-1.5">
                        <span className={`px-1.5 py-0.5 font-mono text-[8px] font-bold uppercase tracking-wider ${pipeCls(c.pipeline)}`}>
                          {PIPELINE.find((p) => p.value === c.pipeline)?.label ?? c.pipeline}
                        </span>
                        {c.clientes?.nombre && (
                          <span className="truncate font-mono text-[8px] uppercase tracking-wider text-[#C79100]">
                            · {c.clientes.nombre}
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Hilo de mensajes */}
        <div className="flex min-h-[560px] flex-col">
          {!sel ? (
            <div className="flex flex-1 flex-col items-center justify-center p-8 text-center">
              <MessageCircle className="mb-3 h-8 w-8 text-[#D8D5CE]" />
              <p className="text-sm text-muted-foreground">
                Selecciona una conversación para ver los mensajes.
              </p>
            </div>
          ) : (
            <>
              {/* Encabezado */}
              <div className="flex items-center justify-between gap-3 border-b border-border p-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center bg-[#EDBA1A] font-mono text-[11px] font-extrabold text-[#1B1A17]">
                    {iniciales(sel.nombre_contacto, sel.wa_id)}
                  </div>
                  <div>
                    <div className="text-sm font-bold">
                      {sel.nombre_contacto || sel.wa_id}
                    </div>
                    <div className="font-mono text-[10px] text-muted-foreground">
                      +{sel.wa_id}
                      {sel.clientes?.nombre && (
                        <span className="text-[#C79100]"> · {sel.clientes.nombre}</span>
                      )}
                    </div>
                  </div>
                </div>
                <Select
                  value={sel.pipeline}
                  onValueChange={(v) => cambiarPipeline(sel.id, v)}
                >
                  <SelectTrigger className="w-[150px] bg-background font-mono text-[10px] uppercase">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PIPELINE.map((p) => (
                      <SelectItem key={p.value} value={p.value}>
                        {p.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Mensajes */}
              <div className="flex-1 space-y-2 overflow-y-auto bg-[#FAF9F7] p-4">
                {msgQuery.isLoading ? (
                  <p className="text-center text-xs text-muted-foreground">Cargando…</p>
                ) : (msgQuery.data ?? []).length === 0 ? (
                  <p className="text-center text-xs text-muted-foreground">
                    Sin mensajes en esta conversación.
                  </p>
                ) : (
                  (msgQuery.data ?? []).map((m) => {
                    const saliente = m.direccion === "out";
                    return (
                      <div
                        key={m.id}
                        className={`flex ${saliente ? "justify-end" : "justify-start"}`}
                      >
                        <div
                          className={`max-w-[75%] px-3 py-2 text-[13px] leading-snug ${
                            saliente
                              ? "bg-[#EDBA1A] text-[#1B1A17]"
                              : "border border-border bg-white text-[#2E2B27]"
                          }`}
                        >
                          <div className="whitespace-pre-wrap break-words">{m.texto}</div>
                          <div
                            className={`mt-1 text-right font-mono text-[8px] ${saliente ? "text-[#1B1A17]/60" : "text-muted-foreground"}`}
                          >
                            {horaCorta(m.timestamp_wa)}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={bottomRef} />
              </div>

              {/* Composer (envío se habilita al conectar el número de producción) */}
              <div className="border-t border-border bg-card p-3">
                <div className="flex items-center gap-2 border border-border bg-muted px-3 py-2 text-muted-foreground">
                  <User className="h-3.5 w-3.5" />
                  <span className="font-mono text-[10px] uppercase tracking-wide">
                    El envío desde aquí se habilita al conectar el número de producción
                  </span>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
