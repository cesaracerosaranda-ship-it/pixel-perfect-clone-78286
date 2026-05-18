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

  const Row = ({ k, v, dim }: { k: string; v: string; dim?: boolean }) => (
    <div className="flex items-center justify-between">
      <span
        className={`text-xs uppercase tracking-[0.14em] ${dim ? "text-[#6B8899]" : "text-[#9aa3ad]"}`}
      >
        {k}
      </span>
      <span className="font-mono text-sm">{v}</span>
    </div>
  );

  return (
    <div className="space-y-4 rounded-lg border border-border bg-card p-5">
      <div>
        <div className="text-[10px] uppercase tracking-[0.2em] text-[#6B8899]">
          Resumen
        </div>
        <div className="mt-3 space-y-1.5">
          <Row k="Precio/pza" v={formatMoney(calc.precioUnitario)} dim />
          <Row k="Subtotal producto" v={formatMoney(calc.subtotalProducto)} dim />
          {incluyeFlete && (
            <Row k="Flete" v={formatMoney(calc.subtotalFlete)} dim />
          )}
          <Row k="Subtotal" v={formatMoney(calc.subtotalGeneral)} />
          {requiereFactura && <Row k="IVA 16%" v={formatMoney(calc.iva)} />}
        </div>
      </div>

      <div className="h-[2px] bg-[#EDBA1A]" />

      <div className="flex items-baseline justify-between">
        <div className="text-xs font-bold uppercase tracking-[0.16em] text-[#C99B0E]">
          Total
        </div>
        <div className="font-mono text-2xl font-bold text-[#EDBA1A]">
          {formatMoney(calc.total)}
        </div>
      </div>

      <div className="rounded-md border border-border bg-background/40 p-3">
        <div className="flex items-center justify-between">
          <span className="text-[10px] uppercase tracking-[0.18em] text-[#6B8899]">
            Margen por pieza
          </span>
          <span className={`font-mono text-sm font-bold ${margenColor}`}>
            {m.toFixed(1)}%
          </span>
        </div>
        <div className="mt-1 text-[10px] text-muted-foreground">
          Costo base $32/pza (interno)
        </div>
      </div>

      <div className="rounded-md border border-[#EDBA1A]/30 bg-[#EDBA1A]/5 p-3">
        <div className="text-[10px] uppercase tracking-[0.18em] text-[#C99B0E]">
          Tiempo de entrega
        </div>
        <div className="mt-1 text-xs font-semibold">{deliveryMsg}</div>
      </div>
    </div>
  );
}
