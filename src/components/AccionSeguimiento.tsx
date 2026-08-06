import { useState } from "react";
import { toast } from "sonner";
import { Check, Loader2 } from "lucide-react";
import {
  registrarSeguimiento, completarSeguimiento, marcarCumplida,
} from "@/lib/vialux/contactos";

/**
 * Registrar que ya se le dio seguimiento a un lead, de un solo clic.
 *
 * El clic inserta el contacto y se acabó: sin modal ni confirmación. La nota y
 * el próximo paso son opcionales y llegan DESPUÉS, en la tira que se despliega
 * — si se pidieran antes, con prisa nadie registraría nada y la bitácora
 * quedaría vacía, que es justo lo que se quiere evitar.
 *
 * Por eso tampoco se refresca la lista al registrar: la fila tiene que seguir
 * ahí para que haya dónde escribir. Cae sola cuando el padre invalida, ya con
 * `onListo`.
 */

const ATAJOS: { label: string; dias: number }[] = [
  { label: "Mañana", dias: 1 },
  { label: "En 3 días", dias: 3 },
  { label: "En 1 semana", dias: 7 },
];

function fechaEnDias(d: number): string {
  const x = new Date();
  x.setDate(x.getDate() + d);
  return x.toISOString().slice(0, 10);
}

const CLASES_BOTON =
  "flex items-center gap-1.5 border border-border px-2.5 py-1.5 font-mono text-[11px] uppercase tracking-[0.1em] text-[#57524A] transition-colors hover:border-[#8A6508] hover:bg-[#F1EFEA] hover:text-[#2E2B27] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[#8A6508] disabled:cursor-not-allowed disabled:opacity-50";

export function BotonSeguimiento({
  nombre, clienteId, empresa, telefono, cotizacionId, recordatorioId, onRegistrado,
}: {
  nombre: string;
  clienteId: string | null;
  empresa?: string | null;
  telefono?: string | null;
  cotizacionId?: string | null;
  /** Si la fila viene de un compromiso, el mismo clic lo da por cumplido. */
  recordatorioId?: string | null;
  onRegistrado: (contactoId: string) => void;
}) {
  const [guardando, setGuardando] = useState(false);

  const registrar = async () => {
    setGuardando(true);
    const { id, error } = await registrarSeguimiento({
      clienteId, nombre, empresa, telefono, cotizacionId,
    });
    if (error || !id) {
      setGuardando(false);
      toast.error(error ?? "No se pudo registrar el seguimiento");
      return;
    }
    // El compromiso se cierra con el mismo clic: prometiste hablarle y ya lo
    // hiciste. Si esto falla, el seguimiento igual quedó — se avisa y ya.
    if (recordatorioId) {
      const e = await marcarCumplida(recordatorioId);
      if (e) toast.error(`Se registró, pero el recordatorio sigue abierto: ${e}`);
    }
    setGuardando(false);
    onRegistrado(id);
  };

  return (
    <button
      type="button"
      onClick={() => void registrar()}
      disabled={guardando}
      aria-label={`Registrar que ya le diste seguimiento a ${nombre}`}
      className={CLASES_BOTON}
    >
      {guardando ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
      ) : (
        <Check className="h-3.5 w-3.5" aria-hidden="true" />
      )}
      Seguimiento
    </button>
  );
}

export function TiraSeguimiento({
  contactoId, onListo,
}: {
  contactoId: string;
  onListo: () => void;
}) {
  const [nota, setNota] = useState("");
  const [guardando, setGuardando] = useState(false);

  const cerrar = async (proximaFecha?: string) => {
    setGuardando(true);
    const error = await completarSeguimiento(contactoId, {
      nota,
      ...(proximaFecha
        ? { proxima_fecha: proximaFecha, proxima_accion: "Dar seguimiento" }
        : {}),
    });
    setGuardando(false);
    // El contacto ya está guardado; esto solo le adjunta detalle. Si falla, se
    // avisa pero el seguimiento cuenta igual.
    if (error) toast.error(`No se pudo guardar el detalle: ${error}`);
    else if (proximaFecha) toast.success("Recordatorio agendado");
    onListo();
  };

  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-2 border-t border-[#EFEDE8] bg-[#F1EFEA] px-5 py-2.5">
      <span className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.14em] text-[#12843C]">
        <Check className="h-3 w-3" aria-hidden="true" /> Registrado
      </span>

      <input
        value={nota}
        onChange={(e) => setNota(e.target.value)}
        placeholder="¿Qué se habló? (opcional)"
        aria-label="Nota del seguimiento"
        className="min-w-[180px] flex-1 border border-[#E5E2DC] bg-white px-2.5 py-1 text-[12px] text-[#2E2B27] placeholder:text-[#767066] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[#8A6508]"
      />

      <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-[#6B665C]">
        Recordar
      </span>
      {ATAJOS.map((a) => (
        <button
          key={a.dias}
          type="button"
          disabled={guardando}
          onClick={() => void cerrar(fechaEnDias(a.dias))}
          className={CLASES_BOTON}
        >
          {a.label}
        </button>
      ))}

      <button
        type="button"
        disabled={guardando}
        onClick={() => void cerrar()}
        className="border border-[#8A6508] bg-[#EDBA1A] px-2.5 py-1.5 font-mono text-[11px] uppercase tracking-[0.1em] text-[#1B1A17] transition-opacity hover:opacity-90 disabled:opacity-50"
      >
        {guardando ? "Guardando…" : "Listo"}
      </button>
    </div>
  );
}
