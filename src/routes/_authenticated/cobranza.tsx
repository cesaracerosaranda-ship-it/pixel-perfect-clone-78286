import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { formatMoney } from "@/lib/vialux/constants";
import type { Tables } from "@/integrations/supabase/types";
import { RailSection, PageTitle } from "@/components/RailSection";
import { TelefonoCliente } from "@/components/TelefonoCliente";
import { BandaCargando, BandaError, textoError } from "@/components/EstadoConsulta";

export const Route = createFileRoute("/_authenticated/cobranza")({
  component: CobranzaPage,
});

type Cot = Tables<"cotizaciones">;
type Pago = {
  id: string;
  cotizacion_id: string;
  monto: number;
  fecha: string;
  metodo: string;
  nota: string | null;
};

const METODOS = ["TRANSFERENCIA", "EFECTIVO", "CHEQUE", "DEPÓSITO", "OTRO"];

/**
 * `pagos` no entra a types.ts hasta que Lovable aplique la migración
 * 20260803140000. Se accede con un tipo mínimo propio: así el build no depende
 * de la regeneración de tipos y el resto del archivo conserva su tipado.
 */
type Res<T> = { data: T | null; error: { message: string } | null };
type PagosApi = {
  select: (cols: string) => {
    order: (col: string, opts: { ascending: boolean }) => {
      limit: (n: number) => PromiseLike<Res<Pago[]>>;
    };
  };
  insert: (row: Record<string, unknown>) => PromiseLike<Res<null>>;
  delete: () => { eq: (col: string, val: string) => PromiseLike<Res<null>> };
};
const tablaPagos = (): PagosApi =>
  (supabase as unknown as { from: (t: string) => PagosApi }).from("pagos");

function diasDesde(fecha: string): number {
  return Math.max(0, Math.floor((Date.now() - new Date(fecha).getTime()) / 86_400_000));
}

/** Antigüedad de la deuda: lo que cambia la urgencia de la llamada. */
function bucketDe(dias: number): "corriente" | "medio" | "vencido" {
  if (dias <= 7) return "corriente";
  if (dias <= 30) return "medio";
  return "vencido";
}

const BUCKET_COLOR = {
  corriente: "text-[#12843C]",
  medio: "text-[#8A6508]",
  vencido: "text-[#DC2626]",
} as const;

// ─── Modal de registro de pago ───────────────────────────────────────────────

function RegistrarPagoModal({
  venta, saldo, onOpenChange, onDone,
}: {
  venta: Cot | null;
  saldo: number;
  onOpenChange: (v: boolean) => void;
  onDone: () => void;
}) {
  const [monto, setMonto] = useState<string>("");
  const [metodo, setMetodo] = useState(METODOS[0]);
  const [fecha, setFecha] = useState("");
  const [nota, setNota] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (venta) {
      setMonto("");
      setMetodo(METODOS[0]);
      setFecha(new Date().toISOString().slice(0, 10));
      setNota("");
    }
  }, [venta]);

  const guardar = async () => {
    const n = Number(monto);
    if (!Number.isFinite(n) || n <= 0) {
      toast.error("Ingresa un monto válido");
      return;
    }
    // Se permite pagar de más (redondeos, propina de flete), pero se avisa.
    if (n > saldo + 0.01) {
      toast.warning(`El monto excede el saldo de ${formatMoney(saldo)}`);
    }
    setSaving(true);
    const { error } = await tablaPagos().insert({
      cotizacion_id: venta!.id,
      monto: n,
      fecha,
      metodo,
      nota: nota.trim() || null,
    });
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(`Pago de ${formatMoney(n)} registrado`);
    onOpenChange(false);
    onDone();
  };

  return (
    <Dialog open={!!venta} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="uppercase tracking-wider">Registrar pago</DialogTitle>
        </DialogHeader>

        {venta && (
          <div className="space-y-4 py-1">
            <div className="border border-border bg-[#FAF9F7] px-3 py-2">
              <div className="font-mono text-[12px] uppercase tracking-[0.16em] text-[#57524A]">
                {venta.folio} · TOTAL {formatMoney(Number(venta.total))}
              </div>
              <div className="mt-0.5 text-xs font-bold uppercase">{venta.cliente_nombre}</div>
              <div className="mt-1 font-mono text-[13px] font-bold text-[#DC2626]">
                SALDO {formatMoney(saldo)}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#57524A]">
                  Monto
                </Label>
                <Input
                  type="number"
                  value={monto}
                  onChange={(e) => setMonto(e.target.value)}
                  placeholder="0.00"
                  className="font-mono"
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => setMonto(String(saldo.toFixed(2)))}
                  className="font-mono text-[11px] uppercase tracking-[0.14em] text-[#8A6508] hover:underline"
                >
                  Liquidar — {formatMoney(saldo)}
                </button>
              </div>
              <div className="space-y-1.5">
                <Label className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#57524A]">
                  Fecha
                </Label>
                <Input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} className="font-mono" />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#57524A]">
                Método
              </Label>
              <Select value={metodo} onValueChange={setMetodo}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {METODOS.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#57524A]">
                Nota (opcional)
              </Label>
              <Textarea
                value={nota}
                onChange={(e) => setNota(e.target.value)}
                rows={2}
                placeholder="Ej. referencia 4471, anticipo 50%…"
                className="text-xs"
              />
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={guardar} disabled={saving} className="bg-[#12843C] text-white hover:bg-[#12843C]/90">
            {saving ? "Guardando…" : "Registrar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Página ──────────────────────────────────────────────────────────────────

function CobranzaPage() {
  const qc = useQueryClient();
  const [pagoVenta, setPagoVenta] = useState<Cot | null>(null);
  const [detalle, setDetalle] = useState<string | null>(null);

  const ventasQuery = useQuery({
    queryKey: ["cotizaciones"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cotizaciones")
        .select("*")
        .eq("estado", "cerrado")
        .order("fecha", { ascending: true })
        .limit(2000);
      if (error) throw error;
      return (data ?? []) as Cot[];
    },
  });

  const pagosQuery = useQuery({
    queryKey: ["pagos"],
    queryFn: async () => {
      const { data, error } = await tablaPagos()
        .select("*")
        .order("fecha", { ascending: false })
        .limit(5000);
      // La tabla existe solo tras la migración 20260803140000: sin ella la
      // página sigue viva mostrando todo como pendiente, no truena.
      if (error) return [] as Pago[];
      return data ?? [];
    },
  });

  useEffect(() => {
    const ch = supabase
      .channel("cobranza")
      .on("postgres_changes", { event: "*", schema: "public", table: "pagos" },
        () => qc.invalidateQueries({ queryKey: ["pagos"] }))
      .on("postgres_changes", { event: "*", schema: "public", table: "cotizaciones" },
        () => qc.invalidateQueries({ queryKey: ["cotizaciones"] }))
      .subscribe();
    return () => { void supabase.removeChannel(ch); };
  }, [qc]);

  const pagosPorVenta = useMemo(() => {
    const m = new Map<string, Pago[]>();
    for (const p of pagosQuery.data ?? []) {
      const arr = m.get(p.cotizacion_id) ?? [];
      arr.push(p);
      m.set(p.cotizacion_id, arr);
    }
    return m;
  }, [pagosQuery.data]);

  const filas = useMemo(() => {
    // Una venta cerrada YA ESTÁ COBRADA salvo que se marque lo contrario: en
    // VIALUX el pago ocurre antes de cerrar. Sin este filtro el módulo tomaba
    // todo el histórico como deuda vencida.
    return (ventasQuery.data ?? [])
      .filter((v) => v.cobro_pendiente)
      .map((v) => {
        const pagos = pagosPorVenta.get(v.id) ?? [];
        const pagado = pagos.reduce((s, p) => s + Number(p.monto), 0);
        const total = Number(v.total);
        const saldo = Math.max(0, total - pagado);
        const dias = diasDesde(v.fecha);
        return { venta: v, pagos, pagado, total, saldo, dias, bucket: bucketDe(dias) };
      })
      .filter((f) => f.saldo > 0.01)
      .sort((a, b) => b.dias - a.dias);
  }, [ventasQuery.data, pagosPorVenta]);

  /** Ingresos registrados, por mes. El historial real de dinero que entró. */
  const ingresos = useMemo(() => {
    const pagos = pagosQuery.data ?? [];
    const porMes = new Map<string, number>();
    for (const p of pagos) {
      const k = p.fecha.slice(0, 7);
      porMes.set(k, (porMes.get(k) ?? 0) + Number(p.monto));
    }
    const meses = [...porMes.entries()].sort((a, b) => (a[0] < b[0] ? 1 : -1)).slice(0, 6);
    const total = pagos.reduce((s, p) => s + Number(p.monto), 0);
    const ahora = new Date();
    const claveMes = `${ahora.getFullYear()}-${String(ahora.getMonth() + 1).padStart(2, "0")}`;
    return { meses, total, mesActual: porMes.get(claveMes) ?? 0, n: pagos.length };
  }, [pagosQuery.data]);

  const kpis = useMemo(() => {
    const porCobrar = filas.reduce((s, f) => s + f.saldo, 0);
    const vencido = filas.filter((f) => f.bucket === "vencido").reduce((s, f) => s + f.saldo, 0);
    const ahora = new Date();
    const cobradoMes = (pagosQuery.data ?? [])
      .filter((p) => {
        const d = new Date(p.fecha);
        return d.getFullYear() === ahora.getFullYear() && d.getMonth() === ahora.getMonth();
      })
      .reduce((s, p) => s + Number(p.monto), 0);
    const buckets = {
      corriente: filas.filter((f) => f.bucket === "corriente").reduce((s, f) => s + f.saldo, 0),
      medio: filas.filter((f) => f.bucket === "medio").reduce((s, f) => s + f.saldo, 0),
      vencido,
    };
    return { porCobrar, vencido, cobradoMes, buckets, n: filas.length };
  }, [filas, pagosQuery.data]);

  const borrarPago = async (id: string) => {
    const { error } = await tablaPagos().delete().eq("id", id);
    if (error) toast.error(error.message);
    else toast.success("Pago eliminado");
  };

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["pagos"] });
    qc.invalidateQueries({ queryKey: ["cotizaciones"] });
  };

  return (
    <div className="mx-auto w-full max-w-6xl px-6 py-8">
      <PageTitle
        kicker="MÓDULO · COBRANZA"
        title="POR COBRAR"
        right={
          <div className="text-right">
            <div className="font-mono text-[11px] uppercase tracking-[0.2em] text-[#57524A]">
              Saldo total
            </div>
            <div className="font-mono text-xl font-extrabold tabular-nums text-[#DC2626]">
              {formatMoney(kpis.porCobrar)}
            </div>
          </div>
        }
      />

      {ventasQuery.isLoading && <BandaCargando mensaje="Cargando saldos por cobrar…" />}
      {ventasQuery.isError && (
        <BandaError
          mensaje={textoError(ventasQuery.error)}
          onReintentar={() => void ventasQuery.refetch()}
        />
      )}

      <div className="border border-border bg-card">
        {/* 00 RESUMEN */}
        <RailSection
          num="00"
          label="RESUMEN"
          titulo="Ingresos registrados"
          descripcion="Historial del dinero que ha entrado, por mes. Se alimenta de los pagos que registres en cada venta — sirve como respaldo de la operación, no como lista de cobro."
          padded={false}
        >
          <div className="grid grid-cols-2 md:grid-cols-4">
            <div className="border-r border-border p-4 md:px-5">
              <div className="mb-1.5 font-mono text-[10px] uppercase tracking-[0.2em] text-[#8A6508]">
                Cobrado este mes
              </div>
              <div className="font-mono text-[22px] font-extrabold leading-none tabular-nums text-[#12843C]">
                {formatMoney(ingresos.mesActual)}
              </div>
            </div>
            <div className="border-r border-border p-4 md:px-5">
              <div className="mb-1.5 font-mono text-[10px] uppercase tracking-[0.2em] text-[#8A6508]">
                Total registrado
              </div>
              <div className="font-mono text-[22px] font-extrabold leading-none tabular-nums">
                {formatMoney(ingresos.total)}
              </div>
              <div className="mt-0.5 font-mono text-[10px] tracking-[0.08em] text-[#6B665C]">
                {ingresos.n} {ingresos.n === 1 ? "PAGO" : "PAGOS"}
              </div>
            </div>
            <div className="border-r border-border p-4 md:px-5">
              <div className="mb-1.5 font-mono text-[10px] uppercase tracking-[0.2em] text-[#8A6508]">
                Con saldo abierto
              </div>
              <div
                className={`font-mono text-[22px] font-extrabold leading-none tabular-nums ${
                  kpis.porCobrar > 0 ? "text-[#DC2626]" : "text-[#12843C]"
                }`}
              >
                {formatMoney(kpis.porCobrar)}
              </div>
              <div className="mt-0.5 font-mono text-[10px] tracking-[0.08em] text-[#6B665C]">
                SOLO VENTAS MARCADAS
              </div>
            </div>
            <div className="p-4 md:px-5">
              <div className="mb-2 font-mono text-[10px] uppercase tracking-[0.2em] text-[#8A6508]">
                Últimos meses
              </div>
              {ingresos.meses.length === 0 ? (
                <p className="font-mono text-[10px] text-[#767066]">SIN PAGOS REGISTRADOS</p>
              ) : (
                <div className="space-y-1 font-mono text-[10px] tabular-nums">
                  {ingresos.meses.slice(0, 3).map(([m, v]) => (
                    <div key={m} className="flex justify-between gap-2">
                      <span className="text-[#57524A]">
                        {new Date(`${m}-15T12:00:00`).toLocaleDateString("es-MX", {
                          month: "short",
                          year: "2-digit",
                        }).toUpperCase()}
                      </span>
                      <span>{formatMoney(v)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </RailSection>

        {/* 01 SALDOS */}
        <RailSection
          num="01"
          label="SALDOS"
          titulo="Con saldo abierto"
          descripcion="Solo las ventas marcadas con cobro pendiente — crédito o anticipo. Lo normal es que esté vacía: en VIALUX se cobra antes de cerrar."
          meta={
            <span className="font-mono text-[11px] tracking-[0.08em] text-[#57524A]">
              {filas.length} {filas.length === 1 ? "VENTA" : "VENTAS"}
            </span>
          }
          padded={false}
          last
        >
          {filas.length === 0 ? (
            <div className="px-6 py-14 text-center">
              <p className="font-mono text-[13px] uppercase tracking-[0.14em] text-[#12843C]">
                Todo cobrado
              </p>
              <p className="mt-1.5 font-mono text-[11px] uppercase tracking-[0.1em] text-[#767066]">
Ninguna venta quedó con saldo. Si alguna se va a crédito, márcala desde Ventas y aparecerá aquí
              </p>
            </div>
          ) : (
            <div className="divide-y divide-[#EFEDE8]">
              {filas.map((f) => {
                const abierto = detalle === f.venta.id;
                const pct = f.total ? Math.round((f.pagado / f.total) * 100) : 0;
                return (
                  <div key={f.venta.id}>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 px-5 py-3.5 transition-colors hover:bg-[#EDBA1A]/[0.04]">
                      <div className="min-w-[190px] flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-bold text-[#8A6508]">
                            {f.venta.folio}
                          </span>
                          <span className={`font-mono text-[11px] font-bold tabular-nums ${BUCKET_COLOR[f.bucket]}`}>
                            {f.dias}D
                          </span>
                        </div>
                        <div className="mt-0.5 text-xs font-bold uppercase">
                          {f.venta.cliente_nombre}
                        </div>
                        {f.venta.cliente_empresa && (
                          <div className="text-[12px] text-muted-foreground">
                            {f.venta.cliente_empresa}
                          </div>
                        )}
                        <TelefonoCliente
                          tel={f.venta.cliente_telefono}
                          className="mt-0.5 text-[11px] text-[#57524A]"
                        />
                      </div>

                      {/* Avance de cobro */}
                      <div className="w-40">
                        <div className="h-2 bg-[#F1EFEA]">
                          <div className="h-full bg-[#12843C]" style={{ width: `${pct}%` }} />
                        </div>
                        <div className="mt-1 font-mono text-[11px] text-[#6B665C]">
                          {pct}% · {formatMoney(f.pagado)} DE {formatMoney(f.total)}
                        </div>
                      </div>

                      <div className="w-32 text-right">
                        <div className="font-mono text-sm font-bold tabular-nums text-[#DC2626]">
                          {formatMoney(f.saldo)}
                        </div>
                        <div className="font-mono text-[10px] uppercase tracking-[0.12em] text-[#6B665C]">
                          Saldo
                        </div>
                      </div>

                      <div className="flex gap-1.5">
                        {f.pagos.length > 0 && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setDetalle(abierto ? null : f.venta.id)}
                            className="font-mono text-[11px] uppercase tracking-[0.1em]"
                          >
                            {f.pagos.length} {f.pagos.length === 1 ? "pago" : "pagos"}
                          </Button>
                        )}
                        <Button
                          size="sm"
                          onClick={() => setPagoVenta(f.venta)}
                          className="bg-[#EDBA1A] font-mono text-[11px] uppercase tracking-[0.1em] text-[#1B1A17] hover:bg-[#EDBA1A]/90"
                        >
                          Registrar pago
                        </Button>
                      </div>
                    </div>

                    {abierto && f.pagos.length > 0 && (
                      <div className="border-t border-[#EFEDE8] bg-[#FAF9F7] px-5 py-3">
                        <div className="space-y-1.5">
                          {f.pagos.map((p) => (
                            <div key={p.id} className="flex items-center gap-3 font-mono text-[12px]">
                              <span className="w-24 text-[#6B665C]">
                                {new Date(p.fecha).toLocaleDateString("es-MX")}
                              </span>
                              <span className="w-28 font-bold tabular-nums text-[#12843C]">
                                {formatMoney(Number(p.monto))}
                              </span>
                              <span className="w-32 text-[#57524A]">{p.metodo}</span>
                              <span className="flex-1 truncate text-[#57524A]">{p.nota ?? ""}</span>
                              <button
                                onClick={() => borrarPago(p.id)}
                                aria-label="Eliminar pago"
                                title="Eliminar pago"
                                className="text-[#767066] transition-colors hover:text-[#DC2626]"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </RailSection>
      </div>

      <RegistrarPagoModal
        venta={pagoVenta}
        saldo={filas.find((f) => f.venta.id === pagoVenta?.id)?.saldo ?? 0}
        onOpenChange={(v) => { if (!v) setPagoVenta(null); }}
        onDone={invalidate}
      />
    </div>
  );
}
