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
  // Semáforo de margen sobre blanco: verde ≥27%, dorado 20–26%, rojo <20%
  const margenColor =
    m >= 27 ? "text-[#16A34A]" : m >= 20 ? "text-[#C79100]" : "text-[#DC2626]";
  const margenBarColor =
    m >= 27 ? "bg-[#16A34A]" : m >= 20 ? "bg-[#C79100]" : "bg-[#DC2626]";

  const Row = ({ k, v, strong }: { k: string; v: string; strong?: boolean }) => (
    <div className="flex items-center justify-between">
      <span
        className={`font-mono text-[9px] uppercase tracking-[0.15em] ${strong ? "text-foreground" : "text-[#8A857C]"}`}
      >
        {k}
      </span>
      <span className="font-mono text-xs tabular-nums">{v}</span>
    </div>
  );

  return (
    <div className="border border-border bg-card">
      {/* Header strip */}
      <div className="flex items-center justify-between border-b border-border px-[18px] py-3">
        <span className="font-mono text-[9px] font-bold uppercase tracking-[0.3em] text-[#8A857C]">
          Resumen
        </span>
        <span className="font-mono text-[9px] uppercase tracking-[0.2em] text-[#C99B0E]">
          R·00
        </span>
      </div>

      {/* Breakdown */}
      <div className="space-y-2.5 px-[18px] py-4">
        <Row k="Precio / pza" v={formatMoney(calc.precioUnitario)} />
        <Row k="Subtotal producto" v={formatMoney(calc.subtotalProducto)} />
        {incluyeFlete && <Row k="Flete" v={formatMoney(calc.subtotalFlete)} />}
        <div className="h-px bg-border" />
        <Row k="Subtotal" v={formatMoney(calc.subtotalGeneral)} strong />
        {requiereFactura && <Row k="IVA 16%" v={formatMoney(calc.iva)} strong />}
      </div>

      {/* Total panel */}
      <div className="mx-[18px] bg-[#1B1A17] px-4 py-3.5">
        <div className="mb-1 font-mono text-[8px] uppercase tracking-[0.3em] text-[#7C766A]">
          Total cotización
        </div>
        <div className="font-mono text-[28px] font-extrabold leading-none tracking-tight text-[#EDBA1A] tabular-nums">
          {formatMoney(calc.total)}
        </div>
      </div>

      <div className="space-y-2.5 px-[18px] py-3.5">
        {/* Margen */}
        <div className="border border-border px-3 py-2.5">
          <div className="mb-2 flex items-center justify-between">
            <span className="font-mono text-[8px] uppercase tracking-[0.2em] text-[#8A857C]">
              Margen por pieza
            </span>
            <span className={`font-mono text-xs font-bold tabular-nums ${margenColor}`}>
              {m.toFixed(1)}%
            </span>
          </div>
          <div className="h-1 w-full bg-[#EFEDE8]">
            <div
              className={`h-full transition-all duration-500 ${margenBarColor}`}
              style={{ width: `${Math.min(100, (m / 40) * 100)}%` }}
            />
          </div>
          <div className="mt-1.5 font-mono text-[8px] text-[#7C766A]">
            COSTO BASE $32/PZA — INTERNO
          </div>
        </div>

        {/* Delivery */}
        <div className="border border-[#EDBA1A]/25 bg-[#EDBA1A]/5 px-3 py-2.5">
          <div className="mb-1 font-mono text-[8px] uppercase tracking-[0.2em] text-[#C99B0E]">
            Tiempo de entrega
          </div>
          <div className="text-xs font-bold leading-snug">{deliveryMsg}</div>
        </div>
      </div>
    </div>
  );
}
