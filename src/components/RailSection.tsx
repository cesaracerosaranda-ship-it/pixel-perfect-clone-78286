import type { ReactNode } from "react";

/**
 * Sección con riel lateral numerado — lenguaje "documento técnico" de la ficha.
 *
 * El riel va tintado y no en blanco: con todo el lienzo en blanco las secciones
 * se fundían entre sí y solo las separaba una línea de 1px. Un margen con color
 * propio funciona como el lomo de un documento — se ve dónde empieza y termina
 * cada bloque de un vistazo, sin agregar peso visual al contenido.
 *
 * `titulo` es opcional: cuando se usa, la sección abre con una banda de
 * encabezado. Antes cada pantalla resolvía eso por su cuenta y ninguna se
 * parecía a la otra.
 */
export function RailSection({
  num,
  label,
  titulo,
  descripcion,
  meta,
  last = false,
  padded = true,
  children,
}: {
  num: string;
  label: string;
  titulo?: string;
  descripcion?: string;
  meta?: ReactNode;
  last?: boolean;
  padded?: boolean;
  children: ReactNode;
}) {
  return (
    <div className={`grid grid-cols-[64px_1fr] ${last ? "" : "border-b-2 border-border"}`}>
      <div className="flex flex-col items-center gap-2.5 border-r border-border bg-[#F5F3EF] pt-[18px]">
        {/* Marca amarilla: ancla el número y da al riel un punto de entrada. */}
        <div className="h-[3px] w-5 bg-[#EDBA1A]" aria-hidden="true" />
        <div className="font-mono text-xs font-bold text-[#8A6508]">{num}</div>
        <div
          className="font-mono text-[10px] uppercase tracking-[0.3em] text-[#6B665C]"
          style={{ writingMode: "vertical-rl", transform: "rotate(180deg)" }}
        >
          {label}
        </div>
      </div>

      <div className="min-w-0">
        {titulo && (
          <div className="border-b border-border bg-[#FAF9F7] px-5 py-3">
            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <h2 className="font-mono text-[12px] font-bold uppercase tracking-[0.2em] text-[#8A6508]">
                {titulo}
              </h2>
              {meta}
            </div>
            {descripcion && (
              <p className="mt-1 text-[12px] text-muted-foreground">{descripcion}</p>
            )}
          </div>
        )}
        <div className={padded ? "px-6 pb-5 pt-[18px]" : ""}>{children}</div>
      </div>
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
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4 border-b-2 border-border pb-4">
      <div className="space-y-1">
        <div className="font-mono text-[11px] uppercase tracking-[0.3em] text-[#6B665C]">
          {kicker}
        </div>
        <h1 className="text-2xl font-extrabold uppercase tracking-[0.08em]">{title}</h1>
      </div>
      {right}
    </div>
  );
}
