import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, ClipboardCheck, PackageCheck } from "lucide-react";
import {
  calcularCorte,
  movimientosRecientes,
  type Movimiento,
} from "@/lib/vialux/inventario";

/**
 * Corte de inventario — el estado de cuenta del material.
 *
 * Se lee como un estado de cuenta bancario a propósito: de qué saldo partió,
 * qué salió por ventas, qué se corrigió a mano y qué queda. Esa secuencia es la
 * que faltaba: con un saldo suelto, una diferencia contra la bodega no tenía
 * dónde buscarse y terminaba en "los números no cuadran" sin más.
 *
 * El corte arranca en la última recaptura manual porque es el único momento en
 * que el contador se comparó contra algo real: alguien contó y capturó lo que
 * había. Antes de eso es aritmética sobre una cifra que ya nadie puede verificar.
 */

const fmt = (n: number) => n.toLocaleString("es-MX");

function fechaCorta(iso: string) {
  return new Date(iso).toLocaleDateString("es-MX", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function Cifra({
  label,
  valor,
  sub,
  tono = "normal",
}: {
  label: string;
  valor: string;
  sub?: string;
  tono?: "normal" | "alerta" | "bien";
}) {
  const color =
    tono === "alerta" ? "text-[#DC2626]" : tono === "bien" ? "text-[#12843C]" : "text-[#8A6508]";
  return (
    <div className="border-r border-border p-4 last:border-r-0 md:px-5">
      <div className="mb-1.5 font-mono text-[10px] uppercase tracking-[0.2em] text-[#8A6508]">
        {label}
      </div>
      <div className={`font-mono text-[22px] font-extrabold leading-none tabular-nums ${color}`}>
        {valor}
      </div>
      {sub && <div className="mt-1 font-mono text-[10px] text-[#6B665C]">{sub}</div>}
    </div>
  );
}

function FilaMovimiento({ m }: { m: Movimiento }) {
  const esVenta = m.origen === "venta";
  const delta = (n: number) =>
    n === 0 ? "—" : `${n > 0 ? "+" : ""}${fmt(n)}`;
  return (
    <tr className="border-b border-[#EFEDE8] last:border-b-0">
      <td className="px-3 py-2 font-mono text-[11px] text-[#57524A] tabular-nums">
        {fechaCorta(m.fecha)}
      </td>
      <td className="px-3 py-2">
        <span
          className={`font-mono text-[10px] uppercase tracking-[0.12em] ${
            esVenta ? "text-[#57524A]" : "text-[#8A6508]"
          }`}
        >
          {esVenta ? "Venta" : "Recaptura"}
        </span>
      </td>
      <td className="px-3 py-2 text-right font-mono text-[12px] tabular-nums text-[#2E2B27]">
        {delta(m.delta_boyas)}
      </td>
      <td className="px-3 py-2 text-right font-mono text-[12px] tabular-nums text-[#2E2B27]">
        {delta(m.delta_clavos)}
      </td>
      <td className="px-3 py-2 text-right font-mono text-[11px] tabular-nums text-[#6B665C]">
        {fmt(m.boyas_despues)} · {fmt(m.clavos_despues)}
      </td>
    </tr>
  );
}

export function CorteInventario({
  boyasHoy,
  clavosHoy,
}: {
  boyasHoy: number;
  clavosHoy: number;
}) {
  const { data, isLoading, error } = useQuery({
    queryKey: ["movimientos-inventario"],
    queryFn: () => movimientosRecientes(),
    retry: false,
  });

  // La tabla la crea una migración que aplica Lovable. Mientras no exista, la
  // consulta falla y el panel lo dice en lugar de fingir que no hay movimientos.
  if (error) {
    return (
      <div className="flex items-start gap-3 p-5 text-[13px] text-[#57524A]">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-[#8A6508]" />
        <div>
          <p className="font-medium text-[#2E2B27]">Falta aplicar la migración</p>
          <p className="mt-1">
            La bitácora de inventario todavía no existe en la base. Pídele a Lovable que
            ejecute <span className="font-mono text-[12px]">20260821200000_movimientos_inventario.sql</span>.
          </p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return <div className="p-5 font-mono text-[11px] text-[#6B665C]">CARGANDO CORTE…</div>;
  }

  const corte = calcularCorte(data ?? []);

  if (!corte.referencia && corte.movimientos.length === 0) {
    return (
      <div className="flex items-start gap-3 p-5 text-[13px] text-[#57524A]">
        <ClipboardCheck className="mt-0.5 h-4 w-4 shrink-0 text-[#948D80]" />
        <div>
          <p className="font-medium text-[#2E2B27]">El corte arranca en tu próxima recaptura</p>
          <p className="mt-1">
            La bitácora empieza a registrar desde ahora, así que no hay historial previo.
            Cuenta el material, captúralo con el botón de inventario, y a partir de ese
            momento cada venta y cada corrección quedan aquí con su fecha.
          </p>
        </div>
      </div>
    );
  }

  const huboCorreccion = corte.correccionBoyas !== 0 || corte.correccionClavos !== 0;
  const hayFaltante = corte.correccionClavos < 0 || corte.correccionBoyas < 0;

  return (
    <div>
      <div className="grid grid-cols-2 border-b border-border md:grid-cols-4">
        <Cifra
          label="Desde"
          valor={corte.referencia ? fechaCorta(corte.referencia.fecha).split(",")[0] : "—"}
          sub={
            corte.referencia
              ? `arrancó con ${fmt(corte.referencia.boyas_despues)} boyas · ${fmt(corte.referencia.clavos_despues)} clavos`
              : "sin recaptura previa"
          }
        />
        <Cifra
          label="Salió por ventas"
          valor={fmt(corte.boyasVendidas)}
          sub={`boyas en ${corte.ventas} ${corte.ventas === 1 ? "venta" : "ventas"}`}
        />
        <Cifra
          label="Clavos consumidos"
          valor={fmt(corte.clavosConsumidos)}
          sub="piezas · 4 por boya"
        />
        <Cifra
          label="Hay hoy"
          valor={fmt(clavosHoy)}
          sub={`clavos · ${fmt(boyasHoy)} boyas`}
          tono={clavosHoy < 0 ? "alerta" : "normal"}
        />
      </div>

      {huboCorreccion && (
        <div
          className={`flex items-start gap-3 border-b border-border px-5 py-3 text-[12px] ${
            hayFaltante ? "bg-[#DC2626]/5" : "bg-[#F5F3EF]"
          }`}
        >
          {hayFaltante ? (
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-[#DC2626]" />
          ) : (
            <PackageCheck className="mt-0.5 h-4 w-4 shrink-0 text-[#12843C]" />
          )}
          <div className="text-[#57524A]">
            <span className="font-medium text-[#2E2B27]">Al contar se corrigió</span>{" "}
            <span className="font-mono tabular-nums">
              {corte.correccionBoyas >= 0 ? "+" : ""}
              {fmt(corte.correccionBoyas)} boyas · {corte.correccionClavos >= 0 ? "+" : ""}
              {fmt(corte.correccionClavos)} clavos
            </span>
            .{" "}
            {hayFaltante
              ? "Un ajuste negativo es material que el sistema daba por existente y no apareció en la bodega."
              : "Positivo es material que entró: recepción de proveedor, o un conteo anterior que salió corto."}
          </div>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full min-w-[520px]">
          <thead className="bg-[#F5F3EF]">
            <tr className="border-b border-border">
              {["Fecha", "Origen", "Boyas", "Clavos", "Saldo tras el movimiento"].map((h, i) => (
                <th
                  key={h}
                  className={`px-3 py-2 font-mono text-[10px] uppercase tracking-[0.12em] text-[#57524A] ${
                    i >= 2 ? "text-right" : "text-left"
                  }`}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {corte.movimientos.slice(0, 15).map((m) => (
              <FilaMovimiento key={m.id} m={m} />
            ))}
          </tbody>
        </table>
      </div>

      {corte.movimientos.length > 15 && (
        <div className="border-t border-border px-3 py-2 font-mono text-[10px] text-[#6B665C]">
          MOSTRANDO 15 DE {corte.movimientos.length} MOVIMIENTOS DEL PERIODO
        </div>
      )}
    </div>
  );
}
