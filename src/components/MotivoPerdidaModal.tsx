import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
 * Ventas los agrupa por la parte anterior al guión largo).
 *
 * La lista viene de las etiquetas reales de WhatsApp Business, no de un catálogo
 * genérico. El cambio de fondo: "no responde" era UN motivo y en la operación
 * real son DOS problemas distintos, con arreglos distintos —
 *   · post-campaña: llegó del anuncio, se le saludó y nunca contestó
 *     → es calidad de lead, se corrige en la segmentación del anuncio
 *   · post-contacto: hubo conversación de verdad y luego silencio
 *     → es proceso de venta, se corrige en el seguimiento
 * Mezclarlos escondía cuál de los dos está sangrando.
 *
 * Se agrupan para que la lista larga siga siendo escaneable.
 */
export const GRUPOS_MOTIVO = [
  {
    grupo: "Sin respuesta",
    motivos: ["Sin respuesta post-campaña", "Sin respuesta post-contacto"],
  },
  {
    grupo: "Objeción comercial",
    motivos: [
      "Precio",
      "Costo del flete",
      "Tiempo de entrega",
      "Sin inventario",
      "Eligió competencia",
    ],
  },
  {
    grupo: "No calificaba",
    motivos: ["No era cliente", "Buscaba otro producto", "Es proveedor"],
  },
  { grupo: "Otro", motivos: ["Otro"] },
] as const;

export const MOTIVOS_PERDIDA = GRUPOS_MOTIVO.flatMap((g) => g.motivos);

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
              <div className="font-mono text-[12px] uppercase tracking-[0.16em] text-[#57524A]">
                {row.folio} · {row.cantidad} PZS · {formatMoney(Number(row.total))}
              </div>
              <div className="mt-0.5 text-xs font-bold uppercase">
                {row.cliente_nombre}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#57524A]">
                Motivo
              </Label>
              <Select value={motivo} onValueChange={setMotivo}>
                <SelectTrigger className="text-[13px]">
                  <SelectValue placeholder="Elige el motivo…" />
                </SelectTrigger>
                <SelectContent>
                  {GRUPOS_MOTIVO.map((g) => (
                    <SelectGroup key={g.grupo}>
                      <SelectLabel className="font-mono text-[10px] uppercase tracking-[0.18em] text-[#8A6508]">
                        {g.grupo}
                      </SelectLabel>
                      {g.motivos.map((m) => (
                        <SelectItem key={m} value={m} className="text-[13px]">
                          {m}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#57524A]">
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
