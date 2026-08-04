import { useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { formatMoney } from "@/lib/vialux/constants";
import type { Tables } from "@/integrations/supabase/types";
import { RailSection } from "@/components/RailSection";
import { MotivoPerdidaModal } from "@/components/MotivoPerdidaModal";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChevronDown, Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";

type Estado = "cotizado" | "enviado" | "cerrado" | "perdido";
type Cot = Tables<"cotizaciones">;

// El orden ES el embudo: de izquierda a derecha se avanza.
const COLUMNAS: { key: Estado; label: string; acento: string; barra: string }[] = [
  { key: "cotizado", label: "COTIZADO", acento: "text-[#8A6508]", barra: "bg-[#EDBA1A]" },
  { key: "enviado", label: "ENVIADO", acento: "text-[#4A6274]", barra: "bg-[#57524A]" },
  { key: "cerrado", label: "CERRADO", acento: "text-[#12843C]", barra: "bg-[#10B981]" },
  { key: "perdido", label: "PERDIDO", acento: "text-[#DC2626]", barra: "bg-[#DC2626]" },
];

function diasDesde(fecha: string): number {
  const ms = Date.now() - new Date(fecha).getTime();
  return Math.max(0, Math.floor(ms / 86_400_000));
}

function motivoDe(r: Cot): string | null {
  const v = (r as { motivo_perdida?: string | null }).motivo_perdida;
  return v && v.trim() ? v : null;
}

export function TableroEmbudo() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [arrastrando, setArrastrando] = useState<string | null>(null);
  const [sobre, setSobre] = useState<Estado | null>(null);
  const [perdidaRow, setPerdidaRow] = useState<Cot | null>(null);
  const [busqueda, setBusqueda] = useState("");

  const cotsQuery = useQuery({
    queryKey: ["cotizaciones"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cotizaciones")
        .select("*")
        .order("fecha", { ascending: false })
        .limit(2000);
      if (error) throw error;
      return (data ?? []) as Cot[];
    },
  });

  const invQuery = useQuery({
    queryKey: ["inventario"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("inventario")
        .select("*")
        .eq("id", 1)
        .maybeSingle();
      if (error) throw error;
      return data as { boyas_disponibles: number } | null;
    },
    staleTime: 30_000,
  });

  useEffect(() => {
    const ch = supabase
      .channel("pipeline-cots")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "cotizaciones" },
        () => qc.invalidateQueries({ queryKey: ["cotizaciones"] }),
      )
      .subscribe();
    return () => { void supabase.removeChannel(ch); };
  }, [qc]);

  const porColumna = useMemo(() => {
    const base: Record<Estado, Cot[]> = {
      cotizado: [], enviado: [], cerrado: [], perdido: [],
    };
    // El filtro se aplica ANTES de repartir: así los totales de cada columna
    // reflejan lo que se está viendo, no el universo completo.
    const q = busqueda.trim().toLowerCase();
    const fuente = q
      ? (cotsQuery.data ?? []).filter(
          (r) =>
            r.folio.toLowerCase().includes(q) ||
            r.cliente_nombre.toLowerCase().includes(q) ||
            (r.cliente_empresa ?? "").toLowerCase().includes(q),
        )
      : (cotsQuery.data ?? []);
    for (const r of fuente) {
      const e = r.estado as Estado;
      if (base[e]) base[e].push(r);
    }
    return base;
  }, [cotsQuery.data, busqueda]);

  const totales = useMemo(() => {
    const t = {} as Record<Estado, { n: number; monto: number }>;
    for (const c of COLUMNAS) {
      const filas = porColumna[c.key];
      t[c.key] = {
        n: filas.length,
        monto: filas.reduce((s, r) => s + Number(r.total), 0),
      };
    }
    return t;
  }, [porColumna]);

  const winRate = useMemo(() => {
    const decididas = totales.cerrado.n + totales.perdido.n;
    return decididas ? Math.round((totales.cerrado.n / decididas) * 100) : null;
  }, [totales]);

  const aplicarEstado = async (id: string, estado: Estado, motivo?: string | null) => {
    const patch: { estado: Estado; motivo_perdida?: string | null } = { estado };
    patch.motivo_perdida = estado === "perdido" ? (motivo ?? null) : null;

    const { error } = await supabase
      .from("cotizaciones")
      .update(patch as never)
      .eq("id", id);

    if (error) {
      if (error.message.includes("Stock insuficiente")) {
        toast.error(`Sin stock — solo ${invQuery.data?.boyas_disponibles ?? "?"} boyas disponibles`);
      } else {
        toast.error(error.message);
      }
      return false;
    }
    toast.success(`Movida a ${estado.toUpperCase()}`);
    return true;
  };

  /**
   * Único camino para cambiar de etapa: lo usan por igual el arrastre y el menú
   * de la tarjeta, para que los candados no dependan de cómo se disparó la
   * acción.
   */
  const mover = async (row: Cot, destino: Estado) => {
    if (row.estado === destino) return;

    // Mismo candado que Historial: no se cierra lo que no se puede surtir.
    if (destino === "cerrado") {
      const inv = invQuery.data?.boyas_disponibles ?? 0;
      if (!row.es_historica && inv < row.cantidad) {
        toast.error(`Sin stock — ${inv} disponibles, se requieren ${row.cantidad}`);
        return;
      }
    }
    // Y perder siempre exige motivo.
    if (destino === "perdido") {
      setPerdidaRow(row);
      return;
    }
    await aplicarEstado(row.id, destino);
  };

  const soltar = async (destino: Estado) => {
    const id = arrastrando;
    setArrastrando(null);
    setSobre(null);
    if (!id) return;
    const row = cotsQuery.data?.find((r) => r.id === id);
    if (row) await mover(row, destino);
  };

  return (
    <div>
      <div className="flex items-center gap-2 border border-border bg-card px-4 py-2.5">
        <Search className="h-4 w-4 shrink-0 text-[#767066]" aria-hidden="true" />
        <Input
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          placeholder="Buscar folio, cliente o empresa…"
          aria-label="Buscar en el embudo"
          className="h-8 border-0 bg-transparent px-0 text-[13px] shadow-none focus-visible:ring-0"
        />
        {busqueda && (
          <button
            type="button"
            onClick={() => setBusqueda("")}
            aria-label="Limpiar búsqueda"
            className="shrink-0 p-1 text-[#767066] transition-colors hover:text-[#2E2B27]"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      <div className="mt-3 border border-border bg-card">
        <RailSection num="00" label="EMBUDO" padded={false} last>
          <div className="grid grid-cols-1 gap-px bg-border md:grid-cols-2 xl:grid-cols-4">
            {COLUMNAS.map((col) => {
              const filas = porColumna[col.key];
              const activo = sobre === col.key;
              return (
                <div
                  key={col.key}
                  onDragOver={(e) => { e.preventDefault(); setSobre(col.key); }}
                  onDragLeave={() => setSobre((s) => (s === col.key ? null : s))}
                  onDrop={(e) => { e.preventDefault(); void soltar(col.key); }}
                  className={`min-h-[420px] bg-card transition-colors ${
                    activo ? "bg-[#EDBA1A]/[0.07]" : ""
                  }`}
                >
                  <div className={`h-1 ${col.barra}`} />
                  <div className="border-b border-border px-4 py-3">
                    <div className={`font-mono text-[11px] font-bold uppercase tracking-[0.2em] ${col.acento}`}>
                      {col.label}
                    </div>
                    <div className="mt-1 font-mono text-base font-extrabold tabular-nums">
                      {formatMoney(totales[col.key].monto)}
                    </div>
                    <div className="font-mono text-[11px] tracking-[0.08em] text-[#6B665C]">
                      {totales[col.key].n}{" "}
                      {totales[col.key].n === 1 ? "COTIZACIÓN" : "COTIZACIONES"}
                    </div>
                  </div>

                  <div className="space-y-2 p-3">
                    {filas.length === 0 ? (
                      <p className="px-1 py-6 text-center font-mono text-[11px] uppercase tracking-[0.14em] text-[#767066]">
                        Vacío
                      </p>
                    ) : (
                      filas.slice(0, 40).map((r) => {
                        const dias = diasDesde(r.fecha);
                        // En proceso, el tiempo es riesgo: la vigencia es de 7 días.
                        const enProceso = col.key === "cotizado" || col.key === "enviado";
                        const vencida = enProceso && dias > 7;
                        return (
                          <div
                            key={r.id}
                            draggable
                            onDragStart={() => setArrastrando(r.id)}
                            onDragEnd={() => { setArrastrando(null); setSobre(null); }}
                            className={`group cursor-grab border bg-card p-3 transition-shadow hover:shadow-[0_2px_10px_rgba(0,0,0,0.08)] active:cursor-grabbing ${
                              arrastrando === r.id ? "opacity-40" : ""
                            } ${vencida ? "border-[#DC2626]/40" : "border-border"}`}
                          >
                            <div className="flex items-baseline justify-between gap-2">
                              <span className="font-mono text-[12px] font-bold text-[#8A6508]">
                                {r.folio}
                              </span>
                              <span className="font-mono text-xs font-bold tabular-nums">
                                {formatMoney(Number(r.total))}
                              </span>
                            </div>
                            <div className="mt-1 truncate text-[13px] font-bold uppercase">
                              {r.cliente_nombre}
                            </div>
                            {r.cliente_empresa && (
                              <div className="truncate text-[12px] text-muted-foreground">
                                {r.cliente_empresa}
                              </div>
                            )}
                            <div className="mt-1.5 flex items-center justify-between font-mono text-[11px] text-[#57524A]">
                              <span>{r.cantidad} PZS</span>
                              <span className={vencida ? "font-bold text-[#DC2626]" : ""}>
                                {dias === 0 ? "HOY" : `${dias}D`}
                                {vencida ? " · VENCIDA" : ""}
                              </span>
                            </div>
                            {col.key === "perdido" && motivoDe(r) && (
                              <div className="mt-1.5 border-t border-[#EFEDE8] pt-1.5 font-mono text-[11px] leading-snug text-[#DC2626]">
                                {motivoDe(r)}
                              </div>
                            )}

                            {/* Acciones explícitas: arrastrar es un atajo, no el único
                                camino. Antes, cambiar de estado era imposible con
                                teclado y el clic en la tarjeta duplicaba sin avisar. */}
                            <div className="mt-2.5 flex items-center gap-1.5 border-t border-[#EFEDE8] pt-2">
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <button
                                    type="button"
                                    aria-label={`Mover ${r.folio} a otra etapa`}
                                    className="flex items-center gap-1 px-1.5 py-1 font-mono text-[11px] uppercase tracking-[0.12em] text-[#57524A] transition-colors hover:bg-[#F1EFEA] hover:text-[#2E2B27] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[#8A6508]"
                                  >
                                    Mover <ChevronDown className="h-3 w-3" aria-hidden="true" />
                                  </button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="start">
                                  {COLUMNAS.filter((c) => c.key !== col.key).map((c) => (
                                    <DropdownMenuItem
                                      key={c.key}
                                      onClick={() => void mover(r, c.key)}
                                      className="font-mono text-[12px] uppercase tracking-[0.1em]"
                                    >
                                      {c.label}
                                    </DropdownMenuItem>
                                  ))}
                                </DropdownMenuContent>
                              </DropdownMenu>

                              <button
                                type="button"
                                aria-label={`Duplicar ${r.folio} en el cotizador`}
                                onClick={() =>
                                  navigate({ to: "/", search: { duplicate: r.id, clienteId: undefined } })
                                }
                                className="ml-auto px-1.5 py-1 font-mono text-[11px] uppercase tracking-[0.12em] text-[#57524A] transition-colors hover:bg-[#F1EFEA] hover:text-[#2E2B27] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[#8A6508]"
                              >
                                Cotizar
                              </button>
                            </div>
                          </div>
                        );
                      })
                    )}
                    {filas.length > 40 && (
                      <p className="pt-1 text-center font-mono text-[11px] uppercase tracking-[0.12em] text-[#57524A]">
                        +{filas.length - 40} más — ver en Historial
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </RailSection>
      </div>

      <p className="mt-3 font-mono text-[11px] uppercase tracking-[0.14em] text-[#57524A]">
        Arrastra una tarjeta entre columnas para cambiar su estado · Clic para
        duplicarla en el cotizador · Las de más de 7 días en proceso se marcan
        vencidas
      </p>

      <MotivoPerdidaModal
        row={perdidaRow}
        onOpenChange={(v) => { if (!v) setPerdidaRow(null); }}
        onConfirm={async (motivo) => {
          if (!perdidaRow) return;
          const ok = await aplicarEstado(perdidaRow.id, "perdido", motivo);
          if (ok) setPerdidaRow(null);
        }}
      />
    </div>
  );
}
