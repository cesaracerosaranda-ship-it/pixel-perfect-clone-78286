import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatMoney } from "@/lib/vialux/constants";
import type { Tables } from "@/integrations/supabase/types";

type Cot = Tables<"cotizaciones">;

/**
 * Marcar PERDIDO sin decir por qué tira la información más valiosa del embudo.
 * Los motivos son canónicos para que el dato sea agregable después (el panel de
 * Historial los agrupa por la parte anterior al guión largo).
 */
export const MOTIVOS_PERDIDA = [
  "Precio",
  "Tiempo de entrega",
  "Sin inventario",
  "Eligió competencia",
  "No responde",
  "Otro",
] as const;

/** Lectura defensiva: la columna existe solo tras la migración 20260802190000. */
export function motivoPerdidaDe(r: Cot): string | null {
  const v = (r as { motivo_perdida?: string | null }).motivo_perdida;
  return v && v.trim() ? v : null;
}

export function MotivoPerdidaModal({
  row,
  onOpenChange,
  onConfirm,
}: {
  row: Cot | null;
  onOpenChange: (v: boolean) => void;
  onConfirm: (motivo: string) => Promise<void>;
}) {
  const [motivo, setMotivo] = useState<string>("");
  const [detalle, setDetalle] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (row) {
      setMotivo("");
      setDetalle("");
    }
  }, [row]);

  const guardar = async () => {
    if (!motivo) return;
    // "Otro" sin detalle no aporta nada: se exige la explicación.
    if (motivo === "Otro" && !detalle.trim()) {
      toast.error("Describe el motivo");
      return;
    }
    const texto = detalle.trim() ? `${motivo} — ${detalle.trim()}` : motivo;
    setSaving(true);
    await onConfirm(texto);
    setSaving(false);
  };

  return (
    <Dialog open={!!row} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="uppercase tracking-wider">
            ¿Por qué se perdió?
          </DialogTitle>
        </DialogHeader>

        {row && (
          <div className="space-y-4 py-1">
            <div className="border border-border bg-[#FAF9F7] px-3 py-2">
              <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-[#8A857C]">
                {row.folio} · {row.cantidad} PZS · {formatMoney(Number(row.total))}
              </div>
              <div className="mt-0.5 text-xs font-bold uppercase">
                {row.cliente_nombre}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {MOTIVOS_PERDIDA.map((m) => {
                const activo = motivo === m;
                return (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setMotivo(m)}
                    className={`border px-3 py-2.5 text-left text-xs font-semibold transition-colors ${
                      activo
                        ? "border-[#DC2626] bg-[#DC2626]/10 text-[#DC2626]"
                        : "border-border bg-card text-[#2E2B27] hover:border-[#8A857C]"
                    }`}
                  >
                    {m}
                  </button>
                );
              })}
            </div>

            <div className="space-y-1.5">
              <Label className="font-mono text-[8px] uppercase tracking-[0.2em] text-[#8A857C]">
                Detalle {motivo === "Otro" ? "(requerido)" : "(opcional)"}
              </Label>
              <Textarea
                value={detalle}
                onChange={(e) => setDetalle(e.target.value)}
                rows={2}
                placeholder="Ej. pidió $42, se fue con Semex, obra pospuesta…"
                className="text-xs"
              />
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            onClick={guardar}
            disabled={!motivo || saving}
            className="bg-[#DC2626] text-white hover:bg-[#DC2626]/90"
          >
            {saving ? "Guardando…" : "Marcar como perdida"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
