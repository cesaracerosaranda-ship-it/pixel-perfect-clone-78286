import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { formatMoney } from "@/lib/vialux/constants";
import type { Tables } from "@/integrations/supabase/types";
import { RailSection, PageTitle } from "@/components/RailSection";
import { MotivoPerdidaModal } from "@/components/MotivoPerdidaModal";

export const Route = createFileRoute("/_authenticated/pipeline")({
  component: PipelinePage,
});

type Estado = "cotizado" | "enviado" | "cerrado" | "perdido";
type Cot = Tables<"cotizaciones">;

// El orden ES el embudo: de izquierda a derecha se avanza.
const COLUMNAS: { key: Estado; label: string; acento: string; barra: string }[] = [
  { key: "cotizado", label: "COTIZADO", acento: "text-[#C99B0E]", barra: "bg-[#EDBA1A]" },
  { key: "enviado", label: "ENVIADO", acento: "text-[#4A6274]", barra: "bg-[#8A857C]" },
  { key: "cerrado", label: "CERRADO", acento: "text-[#16A34A]", barra: "bg-[#10B981]" },
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

function PipelinePage() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [arrastrando, setArrastrando] = useState<string | null>(null);
  const [sobre, setSobre] = useState<Estado | null>(null);
  const [perdidaRow, setPerdidaRow] = useState<Cot | null>(null);

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
    for (const r of cotsQuery.data ?? []) {
      const e = r.estado as Estado;
      if (base[e]) base[e].push(r);
    }
    return base;
  }, [cotsQuery.data]);

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

  const soltar = async (destino: Estado) => {
    const id = arrastrando;
    setArrastrando(null);
    setSobre(null);
    if (!id) return;

    const row = cotsQuery.data?.find((r) => r.id === id);
    if (!row || row.estado === destino) return;

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
    await aplicarEstado(id, destino);
  };

  return (
    <div className="mx-auto w-full max-w-[1600px] px-6 py-8">
      <PageTitle
        kicker="MÓDULO · EMBUDO"
        title="PIPELINE"
        right={
          <div className="flex items-baseline gap-2">
            <span className="font-mono text-[9px] uppercase tracking-[0.2em] text-[#8A857C]">
              Tasa de cierre
            </span>
            <span
              className={`font-mono text-lg font-extrabold tabular-nums ${
                winRate === null
                  ? "text-[#8A857C]"
                  : winRate >= 50
                    ? "text-[#16A34A]"
                    : winRate >= 30
                      ? "text-[#C79100]"
                      : "text-[#DC2626]"
              }`}
            >
              {winRate === null ? "—" : `${winRate}%`}
            </span>
          </div>
        }
      />

      <div className="mt-6 border border-border bg-card">
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
                    <div className={`font-mono text-[9px] font-bold uppercase tracking-[0.2em] ${col.acento}`}>
                      {col.label}
                    </div>
                    <div className="mt-1 font-mono text-base font-extrabold tabular-nums">
                      {formatMoney(totales[col.key].monto)}
                    </div>
                    <div className="font-mono text-[9px] tracking-[0.08em] text-[#7C766A]">
                      {totales[col.key].n}{" "}
                      {totales[col.key].n === 1 ? "COTIZACIÓN" : "COTIZACIONES"}
                    </div>
                  </div>

                  <div className="space-y-2 p-3">
                    {filas.length === 0 ? (
                      <p className="px-1 py-6 text-center font-mono text-[9px] uppercase tracking-[0.14em] text-[#B5B0A6]">
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
                            onClick={() =>
                              navigate({ to: "/", search: { duplicate: r.id, clienteId: undefined } })
                            }
                            title="Arrastra para cambiar estado · clic para duplicar en el cotizador"
                            className={`cursor-grab border bg-card p-3 transition-shadow hover:shadow-[0_2px_10px_rgba(0,0,0,0.08)] active:cursor-grabbing ${
                              arrastrando === r.id ? "opacity-40" : ""
                            } ${vencida ? "border-[#DC2626]/40" : "border-border"}`}
                          >
                            <div className="flex items-baseline justify-between gap-2">
                              <span className="font-mono text-[10px] font-bold text-[#C79100]">
                                {r.folio}
                              </span>
                              <span className="font-mono text-xs font-bold tabular-nums">
                                {formatMoney(Number(r.total))}
                              </span>
                            </div>
                            <div className="mt-1 truncate text-[11px] font-bold uppercase">
                              {r.cliente_nombre}
                            </div>
                            {r.cliente_empresa && (
                              <div className="truncate text-[10px] text-muted-foreground">
                                {r.cliente_empresa}
                              </div>
                            )}
                            <div className="mt-1.5 flex items-center justify-between font-mono text-[9px] text-[#8A857C]">
                              <span>{r.cantidad} PZS</span>
                              <span className={vencida ? "font-bold text-[#DC2626]" : ""}>
                                {dias === 0 ? "HOY" : `${dias}D`}
                                {vencida ? " · VENCIDA" : ""}
                              </span>
                            </div>
                            {col.key === "perdido" && motivoDe(r) && (
                              <div className="mt-1.5 border-t border-[#EFEDE8] pt-1.5 font-mono text-[9px] leading-snug text-[#DC2626]">
                                {motivoDe(r)}
                              </div>
                            )}
                          </div>
                        );
                      })
                    )}
                    {filas.length > 40 && (
                      <p className="pt-1 text-center font-mono text-[9px] uppercase tracking-[0.12em] text-[#8A857C]">
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

      <p className="mt-3 font-mono text-[9px] uppercase tracking-[0.14em] text-[#8A857C]">
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
