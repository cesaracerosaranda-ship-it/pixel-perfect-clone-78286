import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Minus, Plus, Users } from "lucide-react";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PRODUCTOS, formatMoney } from "@/lib/vialux/constants";
import type { QuoteState } from "@/hooks/useQuoteState";
import { useCpLookup } from "@/hooks/useCpLookup";
import { CarriersPanel } from "./CarriersPanel";

type Props = {
  state: QuoteState;
  update: <K extends keyof QuoteState>(k: K, v: QuoteState[K]) => void;
  errors?: Record<string, string>;
};

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-[10px] uppercase tracking-[0.16em] text-[#6B8899]">
        {label}
      </Label>
      {children}
      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  );
}

type ClienteOption = {
  id: string; nombre: string; empresa: string; telefono: string;
  contacto_nombre: string; contacto_telefono: string;
};

function ClientSearch({ onSelect }: { onSelect: (c: ClienteOption) => void }) {
  const [open, setOpen] = useState(false);
  const [clientes, setClientes] = useState<ClienteOption[]>([]);

  useEffect(() => {
    if (!open) return;
    supabase
      .from("clientes")
      .select("id, nombre, empresa, telefono, contacto_nombre, contacto_telefono")
      .order("nombre")
      .then(({ data }) => setClientes((data as ClienteOption[]) ?? []));
  }, [open]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2 text-[10px] uppercase tracking-[0.14em]">
          <Users className="h-3.5 w-3.5" /> Buscar cliente existente
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-96 p-0" align="start">
        <Command>
          <CommandInput placeholder="Nombre, empresa o contacto..." />
          <CommandList>
            <CommandEmpty>Sin resultados.</CommandEmpty>
            <CommandGroup>
              {clientes.map((c) => (
                <CommandItem
                  key={c.id}
                  value={`${c.nombre} ${c.empresa} ${c.contacto_nombre}`}
                  onSelect={() => { onSelect(c); setOpen(false); }}
                >
                  <div className="w-full">
                    <div className="font-semibold uppercase">{c.nombre}</div>
                    {c.empresa && <div className="text-xs text-muted-foreground">{c.empresa}</div>}
                    {c.contacto_nombre && (
                      <div className="mt-0.5 text-[10px] text-[#6B8899]">
                        Solicita: {c.contacto_nombre}
                        {c.contacto_telefono && ` · ${c.contacto_telefono}`}
                      </div>
                    )}
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

export function QuoteForm({ state, update, errors = {} }: Props) {
  const { data: cpData } = useCpLookup(state.cp);

  useEffect(() => {
    if (state.cp.length === 5 && cpData) {
      update("municipio", cpData.municipio);
      update("estadoNombre", cpData.estado);
    } else if (state.cp.length < 5) {
      update("municipio", "");
      update("estadoNombre", "");
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.cp, cpData]);

  return (
    <div className="space-y-6">
      <section className="rounded-lg border border-border bg-card p-5">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-xs font-bold uppercase tracking-[0.18em] text-[#EDBA1A]">
            Cliente
          </h3>
          <ClientSearch
            onSelect={(c) => {
              update("cliente", c.nombre);
              update("empresa", c.empresa);
              update("telefono", c.telefono);
            }}
          />
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Field label="Nombre del cliente *" error={errors.cliente}>
            <Input
              value={state.cliente}
              onChange={(e) => update("cliente", e.target.value)}
              placeholder="EJ. JUAN PÉREZ"
              className={errors.cliente ? "border-red-400" : ""}
            />
          </Field>
          <Field label="Empresa">
            <Input
              value={state.empresa}
              onChange={(e) => update("empresa", e.target.value)}
              placeholder="-"
            />
          </Field>
          <Field label="Teléfono">
            <Input
              value={state.telefono}
              onChange={(e) => update("telefono", e.target.value)}
              placeholder="8112345678"
              className="font-mono"
            />
          </Field>
          <Field label="Código postal de destino">
            <Input
              value={state.cp}
              onChange={(e) =>
                update("cp", e.target.value.replace(/\D/g, "").slice(0, 5))
              }
              placeholder="64000"
              className="font-mono"
              maxLength={5}
            />
            {state.cp.length === 5 && cpData && (
              <p className="mt-1 font-mono text-[11px] uppercase tracking-wide text-[#6B8899]">
                {cpData.municipio}, {cpData.estado}
              </p>
            )}
          </Field>
        </div>
      </section>

      <CarriersPanel cp={state.cp} clientLat={cpData?.lat ?? null} clientLng={cpData?.lng ?? null} />

      <section className="rounded-lg border border-border bg-card p-5">
        <h3 className="mb-4 text-xs font-bold uppercase tracking-[0.18em] text-[#EDBA1A]">
          Producto
        </h3>
        <RadioGroup
          value={state.producto}
          onValueChange={(v) => update("producto", v as QuoteState["producto"])}
          className="grid gap-2"
        >
          {(Object.keys(PRODUCTOS) as Array<keyof typeof PRODUCTOS>).map((k) => {
            const p = PRODUCTOS[k];
            const active = state.producto === k;
            return (
              <label
                key={k}
                className={`flex cursor-pointer items-center justify-between gap-4 rounded-md border p-3 transition-colors ${
                  active
                    ? "border-[#EDBA1A] bg-[#EDBA1A]/5"
                    : "border-border hover:bg-muted/30"
                }`}
              >
                <div className="flex items-center gap-3">
                  <RadioGroupItem value={k} id={`p-${k}`} />
                  <div>
                    <div className="text-sm font-semibold uppercase tracking-wide">
                      {p.label}
                    </div>
                  </div>
                </div>
                <div className="font-mono text-xs text-muted-foreground">
                  <span className="text-[#EDBA1A]">C/F</span>{" "}
                  {formatMoney(p.conFactura)} ·{" "}
                  <span className="text-[#6B8899]">S/F</span>{" "}
                  {formatMoney(p.sinFactura)}
                </div>
              </label>
            );
          })}
        </RadioGroup>

        <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-3">
          <Field label="Cantidad *" error={errors.cantidad}>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => update("cantidad", Math.max(0, state.cantidad - 50))}
              >
                <Minus className="h-4 w-4" />
              </Button>
              <Input
                type="number"
                min={0}
                value={state.cantidad || ""}
                onChange={(e) => update("cantidad", Number(e.target.value) || 0)}
                className={`font-mono text-center${errors.cantidad ? " border-red-400" : ""}`}
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => update("cantidad", state.cantidad + 50)}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </Field>
          <Field label="¿Requiere factura?">
            <div className="flex h-10 items-center gap-3 rounded-md border border-input bg-background px-3">
              <Switch
                checked={state.requiereFactura}
                onCheckedChange={(v) => update("requiereFactura", v)}
              />
              <span className="text-sm font-medium">
                {state.requiereFactura ? "SÍ — IVA 16%" : "NO — sin IVA"}
              </span>
            </div>
          </Field>
          <Field label="Revisión">
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => update("revision", Math.max(0, state.revision - 1))}
              >
                <Minus className="h-4 w-4" />
              </Button>
              <div className="flex h-10 flex-1 items-center justify-center rounded-md border border-input bg-background font-mono text-sm">
                {state.revision === 0 ? "NUEVA" : `R${state.revision}`}
              </div>
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => update("revision", state.revision + 1)}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </Field>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
          <Field label="Precio especial">
            <div className="flex items-center gap-3 rounded-md border border-input bg-background px-3 py-2">
              <Switch
                checked={state.precioEspecialOn}
                onCheckedChange={(v) => update("precioEspecialOn", v)}
              />
              <Input
                type="number"
                disabled={!state.precioEspecialOn}
                value={state.precioEspecial || ""}
                onChange={(e) =>
                  update("precioEspecial", Number(e.target.value) || 0)
                }
                placeholder="Sobrescribir precio"
                className="font-mono"
              />
            </div>
          </Field>
          <Field label="Notas internas (no aparece en PDF)">
            <Textarea
              value={state.notas}
              onChange={(e) => update("notas", e.target.value)}
              rows={2}
            />
          </Field>
        </div>
      </section>

      <section className="rounded-lg border border-border bg-card p-5">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-xs font-bold uppercase tracking-[0.18em] text-[#EDBA1A]">
            Flete
          </h3>
          <div className="flex items-center gap-2">
            <Switch
              checked={state.incluyeFlete}
              onCheckedChange={(v) => update("incluyeFlete", v)}
            />
            <span className="text-xs uppercase tracking-wider text-muted-foreground">
              Incluir flete
            </span>
          </div>
        </div>
        {state.incluyeFlete && (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <Field label="Paquetería">
              <Input
                value={state.fletePaqueteria}
                onChange={(e) => update("fletePaqueteria", e.target.value)}
                placeholder="TRES GUERRAS"
              />
            </Field>
            <Field label="Modalidad">
              <Select
                value={state.fleteModalidad}
                onValueChange={(v) =>
                  update("fleteModalidad", v as QuoteState["fleteModalidad"])
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ENTREGA A DOMICILIO">
                    ENTREGA A DOMICILIO
                  </SelectItem>
                  <SelectItem value="OCURRE">OCURRE</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field label="Costo del flete (MXN)">
              <Input
                type="number"
                value={state.fleteCosto || ""}
                onChange={(e) => update("fleteCosto", Number(e.target.value) || 0)}
                className="font-mono"
              />
            </Field>
          </div>
        )}
      </section>
    </div>
  );
}
