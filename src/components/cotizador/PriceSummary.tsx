import { formatMoney } from "@/lib/vialux/constants";

type Calc = {
  precioUnitario: number;
  subtotalProducto: number;
  subtotalFlete: number;
  subtotalGeneral: number;
  iva: number;
  total: number;
  margen: number;
};

export function PriceSummary({
  calc,
  requiereFactura,
  incluyeFlete,
  deliveryMsg,
}: {
  calc: Calc;
  requiereFactura: boolean;
  incluyeFlete: boolean;
  deliveryMsg: string;
}) {
  const m = calc.margen;
  const margenColor =
    m >= 27
      ? "text-emerald-400"
      : m >= 20
        ? "text-[#EDBA1A]"
        : "text-red-400";

  const margenBarColor =
    m >= 27 ? "bg-emerald-400" : m >= 20 ? "bg-[#EDBA1A]" : "bg-red-400";

  const Row = ({ k, v, dim }: { k: string; v: string; dim?: boolean }) => (
    <div className="flex items-center justify-between">
      <span
        className={`text-xs uppercase tracking-[0.13em] ${dim ? "text-[#6B8899]" : "text-[#9aa3ad]"}`}
      >
        {k}
      </span>
      <span className="font-mono text-sm tabular-nums">{v}</span>
    </div>
  );

  return (
    <div
      className="overflow-hidden rounded-xl border border-border"
      style={{
        background: "linear-gradient(145deg, #3D4148 0%, #363A41 100%)",
      }}
    >
      {/* Header strip */}
      <div className="flex items-center gap-2.5 border-b border-border/50 px-5 py-3">
        <div className="h-3.5 w-[3px] rounded-full bg-[#EDBA1A]" />
        <span className="text-[10px] font-bold uppercase tracking-[0.22em] text-[#6B8899]">
          Resumen
        </span>
      </div>

      <div className="space-y-4 p-5">
        {/* Price breakdown */}
        <div className="space-y-2">
          <Row k="Precio / pza" v={formatMoney(calc.precioUnitario)} dim />
          <Row k="Subtotal producto" v={formatMoney(calc.subtotalProducto)} dim />
          {incluyeFlete && (
            <Row k="Flete" v={formatMoney(calc.subtotalFlete)} dim />
          )}
          <div className="my-1 h-px bg-border/50" />
          <Row k="Subtotal" v={formatMoney(calc.subtotalGeneral)} />
          {requiereFactura && <Row k="IVA 16%" v={formatMoney(calc.iva)} />}
        </div>

        {/* Total panel */}
        <div className="rounded-lg bg-[#1C1E22] px-4 py-4">
          <div className="mb-1 text-[9px] uppercase tracking-[0.24em] text-[#424856]">
            Total cotización
          </div>
          <div className="font-mono text-3xl font-black tracking-tight text-[#EDBA1A] tabular-nums">
            {formatMoney(calc.total)}
          </div>
        </div>

        {/* Margen */}
        <div className="rounded-lg border border-border bg-background/30 p-3">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-[10px] uppercase tracking-[0.18em] text-[#6B8899]">
              Margen por pieza
            </span>
            <span className={`font-mono text-sm font-bold tabular-nums ${margenColor}`}>
              {m.toFixed(1)}%
            </span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-background/60">
            <div
              className={`h-full rounded-full transition-all duration-500 ${margenBarColor}`}
              style={{ width: `${Math.min(100, (m / 40) * 100)}%` }}
            />
          </div>
          <div className="mt-1.5 text-[10px] text-muted-foreground">
            Costo base $32/pza — interno
          </div>
        </div>

        {/* Delivery */}
        <div className="rounded-lg border border-[#EDBA1A]/20 bg-[#EDBA1A]/5 p-3">
          <div className="mb-1 flex items-center gap-1.5">
            <div className="h-1 w-1 rounded-full bg-[#EDBA1A]" />
            <div className="text-[10px] uppercase tracking-[0.18em] text-[#C99B0E]">
              Tiempo de entrega
            </div>
          </div>
          <div className="text-xs font-semibold leading-snug">{deliveryMsg}</div>
        </div>
      </div>
    </div>
  );
}
