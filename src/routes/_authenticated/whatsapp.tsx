import { createFileRoute, useNavigate } from "@tanstack/react-router";
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
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { PageTitle } from "@/components/RailSection";
import { formatMoney } from "@/lib/vialux/constants";
import { mismoTelefono } from "@/lib/vialux/telefono";
import { Search, MessageCircle, Link2, Calculator, X, Send, Loader2 } from "lucide-react";

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

type ClienteLite = { id: string; nombre: string; empresa: string; telefono: string };
type CotizacionLite = {
  id: string;
  folio: string;
  fecha: string;
  total: number;
  estado: string;
  cantidad: number;
};

/** Panel del cliente ligado: sus cotizaciones + acceso directo a cotizar. */
function ClientePanel({
  conv,
  onLigar,
}: {
  conv: Conversacion;
  onLigar: (clienteId: string | null) => void;
}) {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [clientes, setClientes] = useState<ClienteLite[]>([]);

  const cotsQuery = useQuery({
    queryKey: ["wa_cliente_cots", conv.cliente_id],
    enabled: !!conv.cliente_id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cotizaciones")
        .select("id, folio, fecha, total, estado, cantidad")
        .eq("cliente_id", conv.cliente_id)
        .order("fecha", { ascending: false })
        .limit(4);
      if (error) throw error;
      return (data ?? []) as CotizacionLite[];
    },
  });

  useEffect(() => {
    if (!open) return;
    supabase
      .from("clientes")
      .select("id, nombre, empresa, telefono")
      .order("nombre")
      .then(({ data }) => setClientes((data as ClienteLite[]) ?? []));
  }, [open]);

  // Sugerencia: cliente cuyo teléfono coincide con el wa_id de la conversación
  const sugerido = useMemo(
    () => clientes.find((c) => mismoTelefono(conv.wa_id, c.telefono)) ?? null,
    [clientes, conv.wa_id],
  );

  if (!conv.cliente_id) {
    return (
      <div className="flex items-center justify-between gap-3 border-b border-border bg-[#FAF9F7] px-3 py-2">
        <span className="font-mono text-[9px] uppercase tracking-[0.15em] text-[#8A857C]">
          Sin cliente ligado
        </span>
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="h-7 gap-1.5 font-mono text-[9px] uppercase tracking-[0.15em]"
            >
              <Link2 className="h-3 w-3" /> Ligar cliente
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80 p-0" align="end">
            <Command>
              <CommandInput placeholder="Buscar cliente…" />
              <CommandList>
                <CommandEmpty>Sin resultados.</CommandEmpty>
                {sugerido && (
                  <CommandGroup heading="Coincide por teléfono">
                    <CommandItem
                      value={`sug ${sugerido.nombre}`}
                      onSelect={() => { onLigar(sugerido.id); setOpen(false); }}
                    >
                      <div>
                        <div className="text-xs font-bold uppercase">{sugerido.nombre}</div>
                        <div className="font-mono text-[10px] text-[#C79100]">
                          {sugerido.telefono}
                        </div>
                      </div>
                    </CommandItem>
                  </CommandGroup>
                )}
                <CommandGroup heading="Todos">
                  {clientes.map((c) => (
                    <CommandItem
                      key={c.id}
                      value={`${c.nombre} ${c.empresa}`}
                      onSelect={() => { onLigar(c.id); setOpen(false); }}
                    >
                      <div>
                        <div className="text-xs font-semibold uppercase">{c.nombre}</div>
                        {c.empresa && (
                          <div className="text-[10px] text-muted-foreground">{c.empresa}</div>
                        )}
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      </div>
    );
  }

  const cots = cotsQuery.data ?? [];
  return (
    <div className="border-b border-border bg-[#FAF9F7] px-3 py-2">
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <span className="font-mono text-[9px] uppercase tracking-[0.15em] text-[#C79100]">
          Cliente · {conv.clientes?.nombre ?? "—"}
        </span>
        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="sm"
            className="h-7 gap-1.5 font-mono text-[9px] uppercase tracking-[0.15em]"
            onClick={() =>
              navigate({
                to: "/",
                search: { clienteId: conv.cliente_id, duplicate: undefined } as never,
              })
            }
          >
            <Calculator className="h-3 w-3" /> Cotizar
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            title="Desligar cliente"
            onClick={() => onLigar(null)}
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      </div>
      {cots.length === 0 ? (
        <p className="font-mono text-[9px] text-muted-foreground">
          SIN COTIZACIONES REGISTRADAS
        </p>
      ) : (
        <div className="flex flex-wrap gap-1.5">
          {cots.map((q) => (
            <div
              key={q.id}
              className="border border-border bg-white px-2 py-1"
              title={`${q.cantidad} pzas · ${q.estado}`}
            >
              <span className="font-mono text-[9px] font-bold text-[#C79100]">{q.folio}</span>
              <span className="ml-1.5 font-mono text-[9px]">{formatMoney(Number(q.total))}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function WhatsAppPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [selId, setSelId] = useState<string | null>(null);
  const [borrador, setBorrador] = useState("");
  const [enviando, setEnviando] = useState(false);
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
    setBorrador(""); // el borrador no se arrastra entre conversaciones
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

  const enviar = async () => {
    const texto = borrador.trim();
    if (!selId || !texto) return;
    setEnviando(true);
    try {
      const { data, error } = await supabase.functions.invoke("whatsapp-enviar", {
        body: { conversacion_id: selId, texto },
      });
      if (error) {
        // Ante un status != 2xx, supabase-js sólo expone "non-2xx status code".
        // El motivo real (token vencido, fuera de la ventana de 24 h, etc.) viene
        // en el cuerpo de la respuesta, que llega en error.context.
        let motivo = error.message;
        try {
          const body = await (error as { context?: Response }).context?.json();
          if (body?.error) motivo = body.error as string;
        } catch {
          /* si no se puede leer el cuerpo, queda el mensaje genérico */
        }
        throw new Error(motivo);
      }
      if (data?.error) throw new Error(data.error);
      setBorrador("");
      qc.invalidateQueries({ queryKey: ["wa_mensajes"] });
      qc.invalidateQueries({ queryKey: ["wa_conversaciones"] });
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setEnviando(false);
    }
  };

  const ligarCliente = async (id: string, clienteId: string | null) => {
    const { error } = await supabase
      .from("wa_conversaciones")
      .update({ cliente_id: clienteId })
      .eq("id", id);
    if (error) return toast.error(error.message);
    toast.success(clienteId ? "Conversación ligada al cliente" : "Cliente desligado");
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

              {/* Cliente ligado + sus cotizaciones */}
              <ClientePanel
                conv={sel}
                onLigar={(clienteId) => ligarCliente(sel.id, clienteId)}
              />

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

              {/* Composer */}
              <div className="border-t border-border bg-card p-3">
                <form
                  onSubmit={(e) => { e.preventDefault(); enviar(); }}
                  className="flex items-center gap-2"
                >
                  <Input
                    value={borrador}
                    onChange={(e) => setBorrador(e.target.value)}
                    placeholder="Escribe un mensaje…"
                    disabled={enviando}
                    className="bg-background"
                  />
                  <Button
                    type="submit"
                    disabled={enviando || !borrador.trim()}
                    className="shrink-0 bg-[#EDBA1A] font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-[#1B1A17] hover:bg-[#EDBA1A]/90"
                  >
                    {enviando ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <><Send className="mr-1.5 h-3.5 w-3.5" /> Enviar</>
                    )}
                  </Button>
                </form>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
