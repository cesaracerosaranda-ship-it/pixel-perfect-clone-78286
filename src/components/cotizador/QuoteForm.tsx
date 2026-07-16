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
import { Minus, Plus, Search } from "lucide-react";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PRODUCTOS, formatMoney } from "@/lib/vialux/constants";
import type { QuoteState } from "@/hooks/useQuoteState";
import { useCpLookup } from "@/hooks/useCpLookup";
import { CarriersPanel } from "./CarriersPanel";
import { CpDistanceTool } from "./CpDistanceTool";
import { RailSection } from "@/components/RailSection";

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
      <Label className="font-mono text-[8px] uppercase tracking-[0.2em] text-[#8A857C]">
        {label}
      </Label>
      {children}
      {error && <p className="text-xs text-[#DC2626]">{error}</p>}
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-[#C79100]">
      {children}
    </div>
  );
}

type ClienteOption = {
  id: string; nombre: string; empresa: string; telefono: string; email: string;
  contacto_nombre: string; contacto_telefono: string;
};

function ClientSearch({ onSelect }: { onSelect: (c: ClienteOption) => void }) {
  const [open, setOpen] = useState(false);
  const [clientes, setClientes] = useState<ClienteOption[]>([]);

  useEffect(() => {
    if (!open) return;
    supabase
      .from("clientes")
      .select("id, nombre, empresa, telefono, email, contacto_nombre, contacto_telefono")
      .order("nombre")
      .then(({ data }) => setClientes((data as ClienteOption[]) ?? []));
  }, [open]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="gap-2 font-mono text-[9px] uppercase tracking-[0.15em] text-[#8A857C]"
        >
          <Search className="h-3 w-3" /> Buscar cliente existente
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
                      <div className="mt-0.5 text-[10px] text-[#8A857C]">
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
    <div className="space-y-4">
      <div className="border border-border bg-card">
        {/* 00 CLIENTE */}
        <RailSection num="00" label="CLIENTE">
          <div className="mb-4 flex items-center justify-between">
            <SectionLabel>Datos del cliente</SectionLabel>
            <ClientSearch
              onSelect={(c) => {
                update("cliente", c.nombre);
                update("empresa", c.empresa);
                update("telefono", c.telefono);
                update("email", c.email || "");
              }}
            />
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Field label="Nombre del cliente *" error={errors.cliente}>
              <Input
                value={state.cliente}
                onChange={(e) => update("cliente", e.target.value)}
                placeholder="EJ. JUAN PÉREZ"
                className={`bg-background font-semibold${errors.cliente ? " border-[#DC2626]" : ""}`}
              />
            </Field>
            <Field label="Empresa">
              <Input
                value={state.empresa}
                onChange={(e) => update("empresa", e.target.value)}
                placeholder="—"
                className="bg-background"
              />
            </Field>
            <Field label="Teléfono">
              <Input
                value={state.telefono}
                onChange={(e) => update("telefono", e.target.value)}
                placeholder="8112345678"
                className="bg-background font-mono"
              />
            </Field>
            <Field label="Correo electrónico">
              <Input
                type="email"
                value={state.email}
                onChange={(e) => update("email", e.target.value)}
                placeholder="correo@ejemplo.com"
                className="bg-background font-mono"
              />
            </Field>
            <Field label="Código postal de destino">
              <Input
                value={state.cp}
                onChange={(e) =>
                  update("cp", e.target.value.replace(/\D/g, "").slice(0, 5))
                }
                placeholder="64000"
                className="bg-background font-mono"
                maxLength={5}
              />
              {state.cp.length === 5 && cpData && (
                <p className="mt-1 font-mono text-[10px] uppercase tracking-wide text-[#7C766A]">
                  · {cpData.municipio}, {cpData.estado}
                </p>
              )}
            </Field>
          </div>
        </RailSection>

        {/* 01 PRODUCTO */}
        <RailSection num="01" label="PRODUCTO">
          <div className="mb-4">
            <SectionLabel>Configuración</SectionLabel>
          </div>
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
                  className={`flex cursor-pointer items-center justify-between gap-4 border px-4 py-3 transition-colors ${
                    active
                      ? "border-[#EDBA1A] bg-[#EDBA1A]/5"
                      : "border-border bg-card hover:bg-muted/40"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <RadioGroupItem value={k} id={`p-${k}`} />
                    <div className="space-y-0.5">
                      <div className="text-[13px] font-bold uppercase tracking-[0.06em]">
                        {p.label}
                      </div>
                      <div className="font-mono text-[9px] tracking-[0.08em] text-[#C99B0E]">
                        {p.sku}
                      </div>
                    </div>
                  </div>
                  <div className="font-mono text-[11px] text-[#8C867A]">
                    <span className="text-[#C79100]">C/F</span>{" "}
                    {formatMoney(p.conFactura)} ·{" "}
                    <span className="text-[#8A857C]">S/F</span>{" "}
                    {formatMoney(p.sinFactura)}
                  </div>
                </label>
              );
            })}
          </RadioGroup>

          <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3">
            <Field label="Cantidad *" error={errors.cantidad}>
              <div className="flex items-stretch">
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
                  className={`border-x-0 bg-muted text-center font-mono font-bold${errors.cantidad ? " border-[#DC2626]" : ""}`}
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
              <div className="flex h-9 items-center gap-3 border border-input bg-background px-3">
                <Switch
                  checked={state.requiereFactura}
                  onCheckedChange={(v) => update("requiereFactura", v)}
                />
                <span className="text-sm font-semibold">
                  {state.requiereFactura ? "SÍ — IVA 16%" : "NO — sin IVA"}
                </span>
              </div>
            </Field>
            <Field label="Revisión">
              <div className="flex items-stretch">
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => update("revision", Math.max(0, state.revision - 1))}
                >
                  <Minus className="h-4 w-4" />
                </Button>
                <div className="flex h-9 flex-1 items-center justify-center border-y border-input bg-muted font-mono text-sm">
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
              <div className="flex items-center gap-3 border border-input bg-background px-3 py-2">
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
                  className="border-0 bg-transparent font-mono shadow-none"
                />
              </div>
            </Field>
            <Field label="Notas internas (no aparece en PDF)">
              <Textarea
                value={state.notas}
                onChange={(e) => update("notas", e.target.value)}
                rows={2}
                className="bg-background"
              />
            </Field>
          </div>
        </RailSection>

        {/* 02 FLETE */}
        <RailSection num="02" label="FLETE" last>
          <div className="mb-3.5 flex items-center justify-between">
            <SectionLabel>Envío</SectionLabel>
            <div className="flex items-center gap-2.5">
              <Switch
                checked={state.incluyeFlete}
                onCheckedChange={(v) => update("incluyeFlete", v)}
              />
              <span className="font-mono text-[9px] uppercase tracking-[0.2em] text-[#8C867A]">
                Incluir flete
              </span>
            </div>
          </div>
          {state.incluyeFlete ? (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <Field label="Paquetería">
                <Input
                  value={state.fletePaqueteria}
                  onChange={(e) => update("fletePaqueteria", e.target.value)}
                  placeholder="TRES GUERRAS"
                  className="bg-background"
                />
              </Field>
              <Field label="Modalidad">
                <Select
                  value={state.fleteModalidad}
                  onValueChange={(v) =>
                    update("fleteModalidad", v as QuoteState["fleteModalidad"])
                  }
                >
                  <SelectTrigger className="bg-background">
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
                  className="bg-background font-mono"
                />
              </Field>
            </div>
          ) : (
            <div className="font-mono text-[10px] uppercase tracking-[0.08em] text-[#7C766A]">
              Sin flete — se cotiza por separado
            </div>
          )}
        </RailSection>
      </div>

      <CarriersPanel cp={state.cp} clientLat={cpData?.lat ?? null} clientLng={cpData?.lng ?? null} />

      <CpDistanceTool
        originCp={state.cp}
        originMunicipio={cpData?.municipio ?? ""}
        originEstado={cpData?.estado ?? ""}
        originLat={cpData?.lat ?? null}
        originLng={cpData?.lng ?? null}
      />
    </div>
  );
}
