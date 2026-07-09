import type { ReactNode } from "react";

/**
 * Sección con riel lateral numerado — lenguaje "documento técnico" de la ficha.
 * Número dorado + etiqueta vertical en mono, contenido a la derecha.
 */
export function RailSection({
  num,
  label,
  last = false,
  padded = true,
  children,
}: {
  num: string;
  label: string;
  last?: boolean;
  padded?: boolean;
  children: ReactNode;
}) {
  return (
    <div
      className={`grid grid-cols-[64px_1fr] ${last ? "" : "border-b border-border"}`}
    >
      <div className="flex flex-col items-center gap-2.5 border-r border-border pt-[18px]">
        <div className="font-mono text-xs font-bold text-[#C79100]">{num}</div>
        <div
          className="font-mono text-[8px] uppercase tracking-[0.3em] text-[#7C766A]"
          style={{ writingMode: "vertical-rl", transform: "rotate(180deg)" }}
        >
          {label}
        </div>
      </div>
      <div className={padded ? "px-6 pb-5 pt-[18px]" : "min-w-0"}>{children}</div>
    </div>
  );
}

/** Kicker + título de página en el lenguaje del rediseño. */
export function PageTitle({
  kicker,
  title,
  right,
}: {
  kicker: string;
  title: string;
  right?: ReactNode;
}) {
  return (
    <div className="mb-6 flex items-end justify-between">
      <div className="space-y-1">
        <div className="font-mono text-[9px] uppercase tracking-[0.3em] text-[#7C766A]">
          {kicker}
        </div>
        <h1 className="text-2xl font-extrabold uppercase tracking-[0.08em]">{title}</h1>
      </div>
      {right}
    </div>
  );
}
