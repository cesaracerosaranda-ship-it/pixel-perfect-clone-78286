import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Plus, Trash2, Check, Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  contactosDe, registrarContacto, marcarCumplida, borrarContacto,
  TIPOS_CONTACTO, type Contacto, type TipoContacto,
} from "@/lib/vialux/contactos";

const TIPO_LABEL: Record<TipoContacto, string> = {
  whatsapp: "WHATSAPP", llamada: "LLAMADA", correo: "CORREO",
  visita: "VISITA", nota: "NOTA",
};

function fechaCorta(iso: string) {
  return new Date(iso).toLocaleDateString("es-MX", { day: "2-digit", month: "short" });
}

// ─── Modal de registro ───────────────────────────────────────────────────────

function RegistrarContactoModal({
  clienteId, abierto, onOpenChange, onDone,
}: {
  clienteId: string;
  abierto: boolean;
  onOpenChange: (v: boolean) => void;
  onDone: () => void;
}) {
  const [tipo, setTipo] = useState<TipoContacto>("whatsapp");
  const [nota, setNota] = useState("");
  const [accion, setAccion] = useState("");
  const [fecha, setFecha] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (abierto) { setTipo("whatsapp"); setNota(""); setAccion(""); setFecha(""); }
  }, [abierto]);

  const guardar = async () => {
    if (!nota.trim()) { toast.error("Escribe qué se habló"); return; }
    // Una acción sin fecha nunca entra a la cola: sería un recordatorio que no
    // recuerda. Se pide la fecha o se descarta la acción.
    if (accion.trim() && !fecha) { toast.error("Ponle fecha a la próxima acción"); return; }
    setSaving(true);
    const { error } = await registrarContacto({
      cliente_id: clienteId, tipo, nota,
      proxima_accion: accion, proxima_fecha: fecha,
    });
    setSaving(false);
    if (error) { toast.error(error); return; }
    toast.success(fecha ? "Contacto y recordatorio guardados" : "Contacto registrado");
    onOpenChange(false);
    onDone();
  };

  const enDias = (d: number) => {
    const x = new Date(); x.setDate(x.getDate() + d);
    setFecha(x.toISOString().slice(0, 10));
  };

  return (
    <Dialog open={abierto} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="uppercase tracking-wider">Registrar contacto</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-1">
          <div className="space-y-1.5">
            <Label className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#57524A]">Medio</Label>
            <div className="grid grid-cols-5 gap-1.5">
              {TIPOS_CONTACTO.map((t) => (
                <button
                  key={t.key}
                  type="button"
                  onClick={() => setTipo(t.key)}
                  className={`border px-2 py-2 text-[11px] font-semibold transition-colors ${
                    tipo === t.key
                      ? "border-[#8A6508] bg-[#EDBA1A]/10 text-[#8A6508]"
                      : "border-border bg-card hover:border-[#57524A]"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#57524A]">
              ¿Qué se habló?
            </Label>
            <Textarea
              value={nota}
              onChange={(e) => setNota(e.target.value)}
              rows={3}
              autoFocus
              placeholder="Ej. pidió precio por 800 pzas, lo revisa con su jefe"
              className="text-[13px]"
            />
          </div>

          <div className="border-t border-border pt-3.5">
            <div className="mb-2 flex items-center gap-2">
              <Bell className="h-3.5 w-3.5 text-[#8A6508]" aria-hidden="true" />
              <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#8A6508]">
                Próxima acción (opcional)
              </span>
            </div>
            <Input
              value={accion}
              onChange={(e) => setAccion(e.target.value)}
              placeholder="Ej. llamarle para confirmar la orden"
              className="text-[13px]"
            />
            {/* Atajos: el 90% de los seguimientos caen en estos plazos y
                escribir la fecha a mano es fricción que hace que no se use. */}
            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              {[
                { l: "Mañana", d: 1 },
                { l: "En 3 días", d: 3 },
                { l: "En 1 semana", d: 7 },
                { l: "En 15 días", d: 15 },
              ].map((o) => (
                <button
                  key={o.l}
                  type="button"
                  onClick={() => enDias(o.d)}
                  className="border border-border px-2 py-1 font-mono text-[10px] uppercase tracking-[0.1em] text-[#57524A] transition-colors hover:border-[#8A6508] hover:text-[#2E2B27]"
                >
                  {o.l}
                </button>
              ))}
              <Input
                type="date"
                value={fecha}
                onChange={(e) => setFecha(e.target.value)}
                aria-label="Fecha de la próxima acción"
                className="ml-auto h-8 w-36 font-mono text-[11px]"
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button
            onClick={guardar}
            disabled={saving}
            className="bg-[#EDBA1A] text-[#1B1A17] hover:bg-[#EDBA1A]/90"
          >
            {saving ? "Guardando…" : "Guardar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Bitácora ────────────────────────────────────────────────────────────────

export function BitacoraCliente({ clienteId }: { clienteId: string }) {
  const [items, setItems] = useState<Contacto[] | null>(null);
  const [abierto, setAbierto] = useState(false);

  const cargar = async () => setItems(await contactosDe(clienteId));
  useEffect(() => { void cargar(); /* eslint-disable-next-line */ }, [clienteId]);

  const hoy = new Date().toISOString().slice(0, 10);

  return (
    <div>
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <h3 className="font-mono text-[12px] font-bold uppercase tracking-[0.2em] text-[#8A6508]">
            Bitácora
          </h3>
          <p className="mt-0.5 text-[12px] text-muted-foreground">
            Qué se habló y qué sigue. Los recordatorios aparecen en Inicio el día que tocan.
          </p>
        </div>
        <Button
          size="sm"
          onClick={() => setAbierto(true)}
          className="shrink-0 bg-[#EDBA1A] font-mono text-[11px] uppercase tracking-[0.1em] text-[#1B1A17] hover:bg-[#EDBA1A]/90"
        >
          <Plus className="mr-1 h-3.5 w-3.5" aria-hidden="true" /> Registrar
        </Button>
      </div>

      {items === null ? (
        <p className="py-6 text-center font-mono text-[11px] uppercase tracking-[0.14em] text-[#767066]">
          Cargando…
        </p>
      ) : items.length === 0 ? (
        <div className="border border-dashed border-border px-4 py-7 text-center">
          <p className="text-[13px] font-semibold">Sin contactos registrados</p>
          <p className="mt-1 text-[12px] text-muted-foreground">
            Cada vez que hables con este cliente, regístralo aquí. Es lo que
            evita que el seguimiento dependa de tu memoria.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {items.map((c) => {
            const vencido = !!c.proxima_fecha && !c.cumplida && c.proxima_fecha <= hoy;
            return (
              <div
                key={c.id}
                className={`border p-3 ${vencido ? "border-[#8A6508]/50 bg-[#EDBA1A]/[0.05]" : "border-border bg-card"}`}
              >
                <div className="flex items-baseline justify-between gap-3">
                  <span className="font-mono text-[10px] font-bold uppercase tracking-[0.16em] text-[#8A6508]">
                    {TIPO_LABEL[c.tipo]}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[11px] text-[#57524A]">{fechaCorta(c.fecha)}</span>
                    <button
                      type="button"
                      aria-label="Eliminar entrada de la bitácora"
                      onClick={async () => {
                        const e = await borrarContacto(c.id);
                        if (e) toast.error(e); else { toast.success("Entrada eliminada"); void cargar(); }
                      }}
                      className="text-[#948D80] transition-colors hover:text-[#DC2626]"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>

                <p className="mt-1.5 whitespace-pre-wrap text-[13px] leading-relaxed">{c.nota}</p>

                {c.proxima_accion && (
                  <div className="mt-2.5 flex flex-wrap items-center gap-2 border-t border-[#EFEDE8] pt-2">
                    <Bell
                      className={`h-3.5 w-3.5 shrink-0 ${c.cumplida ? "text-[#948D80]" : "text-[#8A6508]"}`}
                      aria-hidden="true"
                    />
                    <span
                      className={`text-[12px] ${c.cumplida ? "text-muted-foreground line-through" : "font-semibold"}`}
                    >
                      {c.proxima_accion}
                    </span>
                    {c.proxima_fecha && (
                      <span
                        className={`font-mono text-[11px] ${vencido ? "font-bold text-[#DC2626]" : "text-[#57524A]"}`}
                      >
                        {new Date(`${c.proxima_fecha}T12:00:00`).toLocaleDateString("es-MX")}
                        {vencido ? " · TOCA" : ""}
                      </span>
                    )}
                    {!c.cumplida && (
                      <button
                        type="button"
                        onClick={async () => {
                          const e = await marcarCumplida(c.id);
                          if (e) toast.error(e); else { toast.success("Marcada como hecha"); void cargar(); }
                        }}
                        className="ml-auto flex items-center gap-1 border border-border px-2 py-1 font-mono text-[10px] uppercase tracking-[0.1em] text-[#57524A] transition-colors hover:border-[#12843C] hover:text-[#12843C]"
                      >
                        <Check className="h-3 w-3" aria-hidden="true" /> Hecha
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <RegistrarContactoModal
        clienteId={clienteId}
        abierto={abierto}
        onOpenChange={setAbierto}
        onDone={cargar}
      />
    </div>
  );
}
