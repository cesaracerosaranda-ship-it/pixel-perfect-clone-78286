import { Loader2, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Bandas de carga y error compartidas por los módulos que leen de Supabase.
 *
 * Antes cada vista resolvía esto por su cuenta o no lo resolvía: con red lenta
 * se veían tablas vacías y KPIs en $0.00 —indistinguibles de "no hay datos"— y
 * si la consulta fallaba no había ni aviso ni forma de reintentar.
 */

export function BandaCargando({ mensaje }: { mensaje: string }) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="mb-4 flex items-center gap-3 border border-border bg-card px-5 py-3.5"
    >
      <Loader2 className="h-4 w-4 shrink-0 animate-spin text-[#8A6508]" aria-hidden="true" />
      <span className="font-mono text-[12px] uppercase tracking-[0.16em] text-[#57524A]">
        {mensaje}
      </span>
    </div>
  );
}

export function BandaError({
  mensaje,
  onReintentar,
}: {
  mensaje: string;
  onReintentar: () => void;
}) {
  return (
    <div
      role="alert"
      className="mb-4 flex flex-wrap items-center justify-between gap-3 border border-[#DC2626]/40 bg-[#DC2626]/[0.06] px-5 py-3.5"
    >
      <div className="flex items-start gap-3">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-[#DC2626]" aria-hidden="true" />
        <div>
          <p className="text-[13px] font-semibold text-[#DC2626]">
            No se pudieron cargar los datos
          </p>
          {/* El motivo real, no un "algo salió mal": sin él no hay forma de
              distinguir una caída de red de un problema de permisos. */}
          <p className="mt-0.5 font-mono text-[11px] text-[#57524A]">{mensaje}</p>
        </div>
      </div>
      <Button
        size="sm"
        variant="outline"
        onClick={onReintentar}
        className="font-mono text-[11px] uppercase tracking-[0.14em]"
      >
        Reintentar
      </Button>
    </div>
  );
}

/** Mensaje corto para una consulta fallida, sin exponer detalles internos. */
export function textoError(e: unknown): string {
  if (e instanceof Error) return e.message;
  return "Error desconocido de conexión";
}
