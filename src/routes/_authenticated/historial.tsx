import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Copy, Trash2, Search, Truck, History, Pencil, Minus, Plus } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { formatMoney, IVA_RATE, PRODUCTOS } from "@/lib/vialux/constants";
import type { ProductoKey } from "@/lib/vialux/constants";
import { generateFolio } from "@/lib/vialux/quote-actions";
import type { Tables } from "@/integrations/supabase/types";
import { RailSection, PageTitle } from "@/components/RailSection";
import { upsertCliente } from "@/lib/vialux/clientes";
import {
  MotivoPerdidaModal,
  motivoPerdidaDe as motivoDe,
} from "@/components/MotivoPerdidaModal";

export const Route = createFileRoute("/_authenticated/historial")({
  component: HistorialPage,
});

type Estado = "cotizado" | "cerrado" | "enviado" | "perdido";
type CotizacionRow = Tables<"cotizaciones">;

const ESTADO_LABEL: Record<Estado, string> = {
  cotizado: "COTIZADO",
  cerrado: "CERRADO",
  enviado: "ENVIADO",
  perdido: "PERDIDO",
};
const ESTADO_CLASS: Record<Estado, string> = {
  cotizado: "bg-[#EDBA1A] text-[#1B1A17]",
  cerrado: "bg-[#10B981] text-white",
  enviado: "bg-[#E5E2DC] text-[#1B1A17]",
  perdido: "bg-[#DC2626] text-white",
};

// ─── Agregar Flete Modal (Escenario C) ───────────────────────────────────────

const FLETE_INIT = {
  paqueteria: "",
  modalidad: "ENTREGA A DOMICILIO" as "ENTREGA A DOMICILIO" | "OCURRE",
  costo: 0,
};

function AgregarFleteModal({
  row,
  open,
  onOpenChange,
  onDone,
}: {
  row: CotizacionRow;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onDone: () => void;
}) {
  const [form, setForm] = useState(FLETE_INIT);
  const [saving, setSaving] = useState(false);

  const f = <K extends keyof typeof FLETE_INIT>(k: K, v: (typeof FLETE_INIT)[K]) =>
    setForm((prev) => ({ ...prev, [k]: v }));

  const subtotalProducto = Number(row.subtotal_producto);
  const subtotalFlete = form.costo;
  const subtotalGeneral = subtotalProducto + subtotalFlete;
  const iva = row.requiere_factura ? subtotalGeneral * IVA_RATE : 0;
  const totalNuevo = subtotalGeneral + iva;

  const save = async () => {
    if (!form.paqueteria.trim()) { toast.error("Ingresa la paquetería"); return; }
    if (!form.costo || form.costo <= 0) { toast.error("Ingresa el costo del flete"); return; }
    setSaving(true);
    try {
      const folioPadre = row.folio_padre || row.folio;
      const nextRevision = (row.revision || 0) + 1;
      const newFolio = await generateFolio(nextRevision, folioPadre);

      const { error: insErr } = await supabase.from("cotizaciones").insert({
        folio: newFolio,
        folio_padre: folioPadre,
        revision: nextRevision,
        cliente_id: row.cliente_id,
        cliente_nombre: row.cliente_nombre,
        cliente_empresa: row.cliente_empresa,
        cliente_telefono: row.cliente_telefono,
        cp_destino: row.cp_destino,
        municipio: row.municipio,
        estado_destino: row.estado_destino,
        producto: row.producto,
        descripcion_producto: row.descripcion_producto,
        cantidad: row.cantidad,
        precio_unitario: Number(row.precio_unitario),
        requiere_factura: row.requiere_factura,
        precio_especial: row.precio_especial,
        subtotal_producto: subtotalProducto,
        incluye_flete: true,
        flete_paqueteria: form.paqueteria.trim().toUpperCase(),
        flete_modalidad: form.modalidad,
        flete_costo: subtotalFlete,
        subtotal_general: subtotalGeneral,
        iva,
        total: totalNuevo,
        margen_porcentaje: Number(row.margen_porcentaje ?? 0),
        estado: "cotizado",
        notas_internas: row.notas_internas || "",
      });
      if (insErr) throw insErr;

      const notaActual = (row.notas_internas || "").trim();
      await supabase
        .from("cotizaciones")
        .update({
          notas_internas: notaActual
            ? `${notaActual}\nREEMPLAZADA POR ${newFolio}`
            : `REEMPLAZADA POR ${newFolio}`,
        })
        .eq("id", row.id);

      toast.success(`Revisión ${newFolio} creada`);
      setForm(FLETE_INIT);
      onOpenChange(false);
      onDone();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) setForm(FLETE_INIT); onOpenChange(v); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="uppercase tracking-wider">
            Agregar flete — {row.folio}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label className="text-[12px] uppercase tracking-[0.14em] text-[#57524A]">
              Paquetería
            </Label>
            <Input
              value={form.paqueteria}
              onChange={(e) => f("paqueteria", e.target.value)}
              placeholder="EJ. TRES GUERRAS"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-[12px] uppercase tracking-[0.14em] text-[#57524A]">
                Modalidad
              </Label>
              <Select value={form.modalidad} onValueChange={(v) => f("modalidad", v as typeof form.modalidad)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ENTREGA A DOMICILIO">ENTREGA A DOMICILIO</SelectItem>
                  <SelectItem value="OCURRE">OCURRE</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-[12px] uppercase tracking-[0.14em] text-[#57524A]">
                Costo del flete (MXN)
              </Label>
              <Input
                type="number"
                value={form.costo || ""}
                onChange={(e) => f("costo", Number(e.target.value) || 0)}
                className="font-mono"
                placeholder="0.00"
              />
            </div>
          </div>

          {form.costo > 0 && (
            <div className="rounded-md border border-border bg-background/40 p-3 space-y-1.5">
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Subtotal producto</span>
                <span className="font-mono">{formatMoney(subtotalProducto)}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Flete</span>
                <span className="font-mono">{formatMoney(subtotalFlete)}</span>
              </div>
              {row.requiere_factura && (
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">IVA (16%)</span>
                  <span className="font-mono">{formatMoney(iva)}</span>
                </div>
              )}
              <div className="flex justify-between border-t border-border pt-1.5">
                <span className="text-xs font-bold uppercase tracking-wide">Nuevo total</span>
                <span className="font-mono font-bold text-[#8A6508]">{formatMoney(totalNuevo)}</span>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button
            onClick={save}
            disabled={saving}
            className="bg-[#EDBA1A] text-[#1B1A17] hover:bg-[#EDBA1A]/90"
          >
            {saving ? "Guardando..." : "Crear revisión"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Registrar Venta Histórica Modal ─────────────────────────────────────────

function todayISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

const HISTORICA_INIT = {
  fecha: todayISO(),
  cliente_nombre: "",
  cliente_empresa: "",
  producto: "boya_clavos" as ProductoKey,
  cantidad: 0,
  precio_unitario: 0,
  requiere_factura: true,
  cp_destino: "",
  notas_internas: "",
};

function RegistrarHistoricaModal({
  open,
  onOpenChange,
  onDone,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onDone: () => void;
}) {
  const [form, setForm] = useState(HISTORICA_INIT);
  const [saving, setSaving] = useState(false);

  const f = <K extends keyof typeof HISTORICA_INIT>(k: K, v: (typeof HISTORICA_INIT)[K]) =>
    setForm((prev) => ({ ...prev, [k]: v }));

  const subtotalProducto = form.precio_unitario * form.cantidad;
  const iva = form.requiere_factura ? subtotalProducto * IVA_RATE : 0;
  const total = subtotalProducto + iva;

  const save = async () => {
    if (!form.cliente_nombre.trim()) { toast.error("El nombre del cliente es requerido"); return; }
    if (!form.cantidad || form.cantidad <= 0) { toast.error("La cantidad es requerida"); return; }
    if (!form.precio_unitario || form.precio_unitario <= 0) { toast.error("El precio unitario es requerido"); return; }
    if (!form.fecha) { toast.error("La fecha es requerida"); return; }

    setSaving(true);
    try {
      const [folio, clienteId] = await Promise.all([
        generateFolio(0, null),
        upsertCliente({
          nombre: form.cliente_nombre,
          empresa: form.cliente_empresa,
        }),
      ]);
      const [year, month, day] = form.fecha.split("-").map(Number);
      const fechaISO = new Date(year, month - 1, day, 12, 0, 0).toISOString();

      const { error } = await supabase.from("cotizaciones").insert({
        folio,
        fecha: fechaISO,
        cliente_id: clienteId,
        cliente_nombre: form.cliente_nombre.trim().toUpperCase(),
        cliente_empresa: (form.cliente_empresa || "").trim().toUpperCase(),
        cp_destino: form.cp_destino.trim() || null,
        producto: form.producto,
        descripcion_producto: PRODUCTOS[form.producto].descripcion,
        cantidad: form.cantidad,
        precio_unitario: form.precio_unitario,
        requiere_factura: form.requiere_factura,
        precio_especial: false,
        subtotal_producto: subtotalProducto,
        incluye_flete: false,
        flete_costo: 0,
        subtotal_general: subtotalProducto,
        iva,
        total,
        margen_porcentaje: 0,
        estado: "cerrado",
        es_historica: true,
        revision: 0,
        notas_internas: form.notas_internas.trim(),
      });
      if (error) throw error;

      toast.success(`Venta histórica ${folio} registrada`);
      setForm({ ...HISTORICA_INIT, fecha: todayISO() });
      onOpenChange(false);
      onDone();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) setForm({ ...HISTORICA_INIT, fecha: todayISO() }); onOpenChange(v); }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="uppercase tracking-wider">
            Registrar venta histórica
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-[12px] uppercase tracking-[0.14em] text-[#57524A]">
                Fecha de la venta *
              </Label>
              <Input
                type="date"
                value={form.fecha}
                onChange={(e) => f("fecha", e.target.value)}
                className="font-mono"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[12px] uppercase tracking-[0.14em] text-[#57524A]">
                ¿Incluye factura?
              </Label>
              <div className="flex h-10 items-center gap-3 rounded-md border border-input bg-background px-3">
                <Switch
                  checked={form.requiere_factura}
                  onCheckedChange={(v) => f("requiere_factura", v)}
                />
                <span className="text-sm font-medium">
                  {form.requiere_factura ? "SÍ — IVA 16%" : "NO — sin IVA"}
                </span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-[12px] uppercase tracking-[0.14em] text-[#57524A]">
                Cliente *
              </Label>
              <Input
                value={form.cliente_nombre}
                onChange={(e) => f("cliente_nombre", e.target.value)}
                placeholder="NOMBRE DEL CLIENTE"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[12px] uppercase tracking-[0.14em] text-[#57524A]">
                Empresa
              </Label>
              <Input
                value={form.cliente_empresa}
                onChange={(e) => f("cliente_empresa", e.target.value)}
                placeholder="—"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-[12px] uppercase tracking-[0.14em] text-[#57524A]">
              Producto *
            </Label>
            <Select value={form.producto} onValueChange={(v) => f("producto", v as ProductoKey)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {(Object.keys(PRODUCTOS) as ProductoKey[]).map((k) => (
                  <SelectItem key={k} value={k}>{PRODUCTOS[k].label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label className="text-[12px] uppercase tracking-[0.14em] text-[#57524A]">
                Cantidad *
              </Label>
              <Input
                type="number"
                value={form.cantidad || ""}
                onChange={(e) => f("cantidad", Number(e.target.value) || 0)}
                className="font-mono"
                placeholder="0"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[12px] uppercase tracking-[0.14em] text-[#57524A]">
                Precio unitario *
              </Label>
              <Input
                type="number"
                value={form.precio_unitario || ""}
                onChange={(e) => f("precio_unitario", Number(e.target.value) || 0)}
                className="font-mono"
                placeholder="0.00"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[12px] uppercase tracking-[0.14em] text-[#57524A]">
                CP destino
              </Label>
              <Input
                value={form.cp_destino}
                onChange={(e) => f("cp_destino", e.target.value.replace(/\D/g, "").slice(0, 5))}
                className="font-mono"
                placeholder="64000"
                maxLength={5}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-[12px] uppercase tracking-[0.14em] text-[#57524A]">
              Notas internas
            </Label>
            <Textarea
              value={form.notas_internas}
              onChange={(e) => f("notas_internas", e.target.value)}
              rows={2}
              placeholder="Referencia, observaciones..."
            />
          </div>

          {form.cantidad > 0 && form.precio_unitario > 0 && (
            <div className="rounded-md border border-border bg-background/40 p-3 space-y-1.5">
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Subtotal</span>
                <span className="font-mono">{formatMoney(subtotalProducto)}</span>
              </div>
              {form.requiere_factura && (
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">IVA (16%)</span>
                  <span className="font-mono">{formatMoney(iva)}</span>
                </div>
              )}
              <div className="flex justify-between border-t border-border pt-1.5">
                <span className="text-xs font-bold uppercase tracking-wide">Total</span>
                <span className="font-mono font-bold text-[#8A6508]">{formatMoney(total)}</span>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button
            onClick={save}
            disabled={saving}
            className="bg-[#EDBA1A] text-[#1B1A17] hover:bg-[#EDBA1A]/90"
          >
            {saving ? "Guardando..." : "Registrar venta"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Actualizar Inventario Modal ─────────────────────────────────────────────

function StepperInput({
  label,
  value,
  onChange,
  paso,
  autoFocus,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  paso: number;
  autoFocus?: boolean;
}) {
  // Un campo vacío vale NaN, NO 0: Number("") es 0, así que emitir el valor
  // crudo convertía el gesto más común —borrar para reescribir— en un cero
  // que pasaba la validación y se guardaba en el inventario.
  const base = Number.isFinite(value) ? Math.round(value) : 0;

  return (
    <div className="space-y-1.5">
      <Label className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#57524A]">
        {label}
      </Label>
      <div className="flex items-stretch">
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={() => onChange(Math.max(0, base - paso))}
        >
          <Minus className="h-4 w-4" />
        </Button>
        <Input
          type="number"
          min={0}
          value={Number.isFinite(value) ? value : ""}
          onChange={(e) => {
            const texto = e.target.value.trim();
            onChange(texto === "" ? NaN : Number(texto));
          }}
          className="border-x-0 bg-muted text-center font-mono font-bold"
          autoFocus={autoFocus}
        />
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={() => onChange(Math.max(0, base + paso))}
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

function ActualizarInventarioModal({
  open,
  onOpenChange,
  boyasActual,
  clavosActual,
  clavosSupported,
  onDone,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  boyasActual: number;
  clavosActual: number;
  clavosSupported: boolean;
  onDone: () => void;
}) {
  const [boyas, setBoyas] = useState(boyasActual);
  const [clavos, setClavos] = useState(clavosActual);
  const [saving, setSaving] = useState(false);
  const [tocado, setTocado] = useState(false);

  // Mientras el usuario no escriba, el modal sigue reflejando los valores
  // vigentes (la consulta puede resolver después de abrirlo). En cuanto toca un
  // campo deja de re-sincronizarse: la suscripción en tiempo real refresca esta
  // tabla y, si no, borraría lo que está capturando.
  useEffect(() => {
    if (!open) {
      setTocado(false);
      return;
    }
    if (tocado) return;
    setBoyas(boyasActual);
    setClavos(clavosActual);
  }, [open, boyasActual, clavosActual, tocado]);

  const save = async () => {
    const b = Math.round(boyas);
    const c = Math.round(clavos);
    if (!Number.isFinite(b) || b < 0 || (clavosSupported && (!Number.isFinite(c) || c < 0))) {
      toast.error("Ingresa cantidades válidas (0 o mayor)");
      return;
    }
    setSaving(true);
    // clavos_disponibles solo se escribe si la columna existe (post-migración);
    // así la edición de boyas nunca se rompe si aún no se aplica.
    const payload: { boyas_disponibles: number; clavos_disponibles?: number } = {
      boyas_disponibles: b,
    };
    if (clavosSupported) payload.clavos_disponibles = c;
    const { error } = await supabase.from("inventario").update(payload as never).eq("id", 1);
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(
      clavosSupported
        ? `Inventario actualizado: ${b.toLocaleString("es-MX")} boyas, ${c.toLocaleString("es-MX")} clavos`
        : `Inventario actualizado: ${b.toLocaleString("es-MX")} boyas disponibles`,
    );
    onOpenChange(false);
    onDone();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="uppercase tracking-wider">
            Actualizar inventario
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className={clavosSupported ? "grid grid-cols-2 gap-3" : ""}>
            <StepperInput
              label="Boyas disponibles"
              value={boyas}
              onChange={(v) => { setTocado(true); setBoyas(v); }}
              paso={50}
              autoFocus
            />
            {clavosSupported && (
              <StepperInput
                label="Clavos disponibles"
                value={clavos}
                onChange={(v) => { setTocado(true); setClavos(v); }}
                paso={200}
              />
            )}
          </div>
          <p className="font-mono text-[12px] leading-relaxed text-[#6B665C]">
            AL CERRAR UNA VENTA SE DESCUENTAN LAS BOYAS Y, SI LA CONFIGURACIÓN
            LLEVA CLAVOS, UN JUEGO DE CLAVOS POR BOYA. LOS CLAVOS PUEDEN QUEDAR
            EN NEGATIVO (JUEGOS COMPROMETIDOS POR LLEGAR). USA ESTO PARA
            REABASTECIMIENTOS O CORRECCIONES DE CONTEO.
          </p>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button
            onClick={save}
            disabled={saving}
            className="bg-[#EDBA1A] text-[#1B1A17] hover:bg-[#EDBA1A]/90"
          >
            {saving ? "Guardando..." : "Actualizar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

function HistorialPage() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | Estado>("all");
  const [fleteRow, setFleteRow] = useState<CotizacionRow | null>(null);
  const [perdidaRow, setPerdidaRow] = useState<CotizacionRow | null>(null);
  const [showHistorica, setShowHistorica] = useState(false);
  const [showInventario, setShowInventario] = useState(false);

  const cotizacionesQuery = useQuery({
    queryKey: ["cotizaciones"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cotizaciones")
        .select("*")
        .order("fecha", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const inventarioQuery = useQuery({
    queryKey: ["inventario"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("inventario")
        .select("*")
        .eq("id", 1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  // clavos_disponibles existe solo tras la migración; se detecta por la presencia
  // de la llave en la fila (.select("*")). Antes de la migración, la UI de clavos
  // se muestra en "—" y no se escribe, para no romper la edición de boyas.
  const invData = inventarioQuery.data as
    | { boyas_disponibles: number; clavos_disponibles?: number }
    | null
    | undefined;
  const clavosSupported = !!invData && "clavos_disponibles" in invData;
  const clavosDisponibles = invData?.clavos_disponibles ?? 0;

  useEffect(() => {
    const ch = supabase
      .channel("cotizaciones-rt")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "cotizaciones" },
        () => qc.invalidateQueries({ queryKey: ["cotizaciones"] }),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "inventario" },
        () => qc.invalidateQueries({ queryKey: ["inventario"] }),
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(ch);
    };
  }, [qc]);

  const rows = useMemo(() => {
    const all = cotizacionesQuery.data ?? [];
    return all.filter((r) => {
      if (filter !== "all" && r.estado !== filter) return false;
      if (search) {
        const q = search.toLowerCase();
        return (
          r.folio.toLowerCase().includes(q) ||
          r.cliente_nombre.toLowerCase().includes(q) ||
          (r.cliente_empresa ?? "").toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [cotizacionesQuery.data, search, filter]);

  const kpis = useMemo(() => {
    const all = cotizacionesQuery.data ?? [];
    const cerradas = all.filter((r) => r.estado === "cerrado");
    const enProceso = all.filter(
      (r) => r.estado === "cotizado" || r.estado === "enviado",
    );
    const perdidas = all.filter((r) => r.estado === "perdido");

    // Motivos agregados: se agrupa por la parte canónica (antes del guión largo),
    // ordenados por DINERO perdido, no por número de casos — un motivo que
    // tumba una venta grande importa más que tres chicas.
    const porMotivo = new Map<string, { n: number; monto: number }>();
    for (const r of perdidas) {
      const m = motivoDe(r);
      if (!m) continue;
      const clave = m.split("—")[0].trim();
      const acc = porMotivo.get(clave) ?? { n: 0, monto: 0 };
      acc.n += 1;
      acc.monto += Number(r.total);
      porMotivo.set(clave, acc);
    }

    const decididas = cerradas.length + perdidas.length;
    return {
      total: all.length,
      valorCerrado: cerradas.reduce((s, r) => s + Number(r.total), 0),
      cierres: cerradas.length,
      enProcesoMonto: enProceso.reduce((s, r) => s + Number(r.total), 0),
      enProceso: enProceso.length,
      perdidas: perdidas.length,
      montoPerdido: perdidas.reduce((s, r) => s + Number(r.total), 0),
      // Tasa de cierre sobre lo YA decidido; las que siguen en proceso no
      // deben castigar el número.
      winRate: decididas ? Math.round((cerradas.length / decididas) * 100) : null,
      motivos: [...porMotivo.entries()]
        .map(([motivo, v]) => ({ motivo, ...v }))
        .sort((a, b) => b.monto - a.monto),
      sinMotivo: perdidas.filter((r) => !motivoDe(r)).length,
    };
  }, [cotizacionesQuery.data]);

  const aplicarEstado = async (
    id: string,
    estado: Estado,
    motivoPerdida?: string | null,
  ) => {
    // Al salir de "perdido" se limpia el motivo: dejarlo pegado confundiría.
    const patch: { estado: Estado; motivo_perdida?: string | null } = { estado };
    if (estado === "perdido") patch.motivo_perdida = motivoPerdida ?? null;
    else patch.motivo_perdida = null;

    const { error } = await supabase
      .from("cotizaciones")
      .update(patch as never)
      .eq("id", id);

    if (error) {
      if (error.message.includes("Stock insuficiente")) {
        const inv = inventarioQuery.data?.boyas_disponibles ?? "?";
        toast.error(`Sin stock — solo ${inv} boyas disponibles`);
      } else {
        toast.error(error.message);
      }
      return false;
    }
    toast.success(`Estado: ${ESTADO_LABEL[estado]}`);
    return true;
  };

  const changeStatus = async (id: string, estado: Estado) => {
    const row = cotizacionesQuery.data?.find((r) => r.id === id);

    if (estado === "cerrado") {
      const inv = inventarioQuery.data?.boyas_disponibles ?? 0;
      if (row && row.estado !== "cerrado" && !row.es_historica && inv < row.cantidad) {
        toast.error(
          `Sin stock suficiente — ${inv} boyas disponibles, se requieren ${row.cantidad}`,
        );
        return;
      }
    }

    // PERDIDO pasa por el modal: no se puede perder una venta sin decir por qué.
    if (estado === "perdido" && row && row.estado !== "perdido") {
      setPerdidaRow(row);
      return;
    }

    await aplicarEstado(id, estado);
  };

  const removeRow = async (id: string) => {
    const { error } = await supabase.from("cotizaciones").delete().eq("id", id);
    if (error) toast.error(error.message);
    else toast.success("Cotización eliminada");
  };

  const duplicate = (id: string) => {
    navigate({ to: "/", search: { duplicate: id, clienteId: undefined } });
  };

  const invalidate = () => qc.invalidateQueries({ queryKey: ["cotizaciones"] });

  return (
    <div className="mx-auto w-full max-w-7xl px-6 py-8">
      {/* Page header */}
      <PageTitle
        kicker="Módulo · Registro"
        title="Historial"
        right={
          <Button
            onClick={() => setShowHistorica(true)}
            variant="outline"
            className="gap-2 font-mono text-[11px] font-bold uppercase tracking-[0.2em] text-[#57524A]"
          >
            <History className="h-3.5 w-3.5" />
            + Registrar venta histórica
          </Button>
        }
      />

      <div className="border border-border bg-card">
        {/* 00 INDICADORES */}
        <RailSection num="00" label="INDICADORES" padded={false}>
          <div className="grid grid-cols-2 md:grid-cols-4">
            <div className="group border-r border-border p-4 md:px-5">
              <div className="mb-1.5 flex items-center justify-between gap-2">
                <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#8A6508]">Inventario</span>
                <button
                  onClick={() => setShowInventario(true)}
                  aria-label="Actualizar inventario"
                  title="Actualizar inventario"
                  className="text-[#57524A] opacity-40 transition-opacity hover:text-[#8A6508] group-hover:opacity-100"
                >
                  <Pencil className="h-3 w-3" />
                </button>
              </div>
              <div className="flex items-end gap-4">
                <div>
                  <div className="font-mono text-[22px] font-extrabold leading-none text-[#8A6508] tabular-nums">
                    {inventarioQuery.data?.boyas_disponibles ?? "—"}
                  </div>
                  <div className="mt-0.5 font-mono text-[10px] tracking-[0.08em] text-[#6B665C]">BOYAS</div>
                </div>
                <div className="border-l border-border pl-4">
                  <div className="font-mono text-[22px] font-extrabold leading-none text-[#8A6508] tabular-nums">
                    {clavosSupported ? clavosDisponibles.toLocaleString("es-MX") : "—"}
                  </div>
                  <div className="mt-0.5 font-mono text-[10px] tracking-[0.08em] text-[#6B665C]">CLAVOS</div>
                </div>
              </div>
            </div>
            <div className="border-r border-border p-4 md:px-5">
              <div className="mb-1.5 font-mono text-[10px] uppercase tracking-[0.2em] text-[#8A6508]">Ventas cerradas</div>
              <div className="font-mono text-[22px] font-extrabold leading-none text-[#12843C] tabular-nums">
                {formatMoney(kpis.valorCerrado)}
              </div>
              <div className="mt-0.5 font-mono text-[10px] tracking-[0.08em] text-[#6B665C]">
                {kpis.cierres} {kpis.cierres === 1 ? "CIERRE" : "CIERRES"}
              </div>
            </div>
            <div className="border-r border-border p-4 md:px-5">
              <div className="mb-1.5 font-mono text-[10px] uppercase tracking-[0.2em] text-[#8A6508]">En proceso</div>
              <div className="font-mono text-[22px] font-extrabold leading-none tabular-nums">
                {formatMoney(kpis.enProcesoMonto)}
              </div>
              <div className="mt-0.5 font-mono text-[10px] tracking-[0.08em] text-[#6B665C]">
                {kpis.enProceso} {kpis.enProceso === 1 ? "COTIZACIÓN" : "COTIZACIONES"}
              </div>
            </div>
            <div className="p-4 md:px-5">
              <div className="mb-1.5 font-mono text-[10px] uppercase tracking-[0.2em] text-[#8A6508]">Tasa de cierre</div>
              <div
                className={`font-mono text-[22px] font-extrabold leading-none tabular-nums ${
                  kpis.winRate === null
                    ? "text-[#57524A]"
                    : kpis.winRate >= 50
                      ? "text-[#12843C]"
                      : kpis.winRate >= 30
                        ? "text-[#8A6508]"
                        : "text-[#DC2626]"
                }`}
              >
                {kpis.winRate === null ? "—" : `${kpis.winRate}%`}
              </div>
              <div className="mt-0.5 font-mono text-[10px] tracking-[0.08em] text-[#6B665C]">
                {kpis.total} REGISTROS · {kpis.perdidas} {kpis.perdidas === 1 ? "PERDIDA" : "PERDIDAS"}
              </div>
            </div>
          </div>

          {/* Por qué se pierde — el dato que antes se evaporaba */}
          {kpis.perdidas > 0 && (
            <div className="border-t border-border px-4 py-3.5 md:px-5">
              <div className="mb-2.5 flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#8A6508]">
                  Por qué se pierde
                </span>
                <span className="font-mono text-[11px] tracking-[0.08em] text-[#DC2626]">
                  {formatMoney(kpis.montoPerdido)} NO CERRADOS
                </span>
                {kpis.sinMotivo > 0 && (
                  <span className="font-mono text-[11px] tracking-[0.08em] text-[#57524A]">
                    · {kpis.sinMotivo} SIN MOTIVO REGISTRADO
                  </span>
                )}
              </div>

              {kpis.motivos.length === 0 ? (
                <p className="font-mono text-[12px] leading-relaxed text-[#6B665C]">
                  AÚN NO HAY MOTIVOS CAPTURADOS. AL MARCAR UNA COTIZACIÓN COMO
                  PERDIDA SE PEDIRÁ EL MOTIVO Y APARECERÁ AQUÍ.
                </p>
              ) : (
                <div className="space-y-1.5">
                  {kpis.motivos.map((m) => {
                    const pct = kpis.montoPerdido
                      ? Math.round((m.monto / kpis.montoPerdido) * 100)
                      : 0;
                    return (
                      <div key={m.motivo} className="flex items-center gap-3">
                        <div className="w-36 shrink-0 truncate text-[13px] font-semibold">
                          {m.motivo}
                        </div>
                        <div className="h-2.5 flex-1 bg-[#F1EFEA]">
                          <div
                            className="h-full bg-[#DC2626]/70"
                            style={{ width: `${Math.max(pct, 2)}%` }}
                          />
                        </div>
                        <div className="w-32 shrink-0 text-right font-mono text-[12px] tabular-nums text-[#6B665C]">
                          {formatMoney(m.monto)} · {m.n}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </RailSection>

        {/* 01 REGISTRO */}
        <RailSection num="01" label="REGISTRO" padded={false} last>
          <div className="flex flex-wrap gap-3 border-b border-border p-4">
            <div className="relative min-w-[240px] flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="BUSCAR POR CLIENTE, EMPRESA O FOLIO..."
                className="bg-background pl-9 font-mono text-xs"
              />
            </div>
            <Select value={filter} onValueChange={(v) => setFilter(v as typeof filter)}>
              <SelectTrigger className="w-[200px] bg-background font-mono text-xs uppercase">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los estados</SelectItem>
                <SelectItem value="cotizado">Cotizado</SelectItem>
                <SelectItem value="enviado">Enviado</SelectItem>
                <SelectItem value="cerrado">Cerrado</SelectItem>
                <SelectItem value="perdido">Perdido</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-border bg-[#F5F3EF] font-mono text-[10px] uppercase tracking-[0.2em] text-[#57524A]">
                <tr>
                  <th className="px-4 py-3 text-left font-bold">Folio</th>
                  <th className="px-4 py-3 text-left font-bold">Fecha</th>
                  <th className="px-4 py-3 text-left font-bold">Cliente</th>
                  <th className="px-4 py-3 text-left font-bold">Empresa</th>
                  <th className="px-4 py-3 text-right font-bold">Cant.</th>
                  <th className="px-4 py-3 text-right font-bold">Total</th>
                  <th className="px-4 py-3 text-left font-bold">Estado</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {cotizacionesQuery.isLoading ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-10 text-center text-muted-foreground">
                      Cargando...
                    </td>
                  </tr>
                ) : rows.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-10 text-center text-muted-foreground">
                      Sin cotizaciones todavía.
                    </td>
                  </tr>
                ) : (
                  rows.map((r) => {
                    const estado = r.estado as Estado;
                    const canAddFlete =
                      !r.incluye_flete &&
                      (r.estado === "cotizado" || r.estado === "enviado");
                    return (
                      <tr key={r.id} className="border-t border-[#EFEDE8] transition-colors hover:bg-[#EDBA1A]/[0.04]">
                        {/* Folio + badges */}
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className="font-mono text-xs font-bold text-[#8A6508]">
                              {r.folio}
                            </span>
                            {r.es_historica && (
                              <span className="bg-[#F1EFEA] px-1.5 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wider text-[#57524A]">
                                HISTÓRICA
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                          {new Date(r.fecha).toLocaleDateString("es-MX")}
                        </td>
                        <td className="px-4 py-3 text-xs font-bold uppercase">
                          {r.cliente_nombre}
                          {estado === "perdido" && motivoDe(r) && (
                            <div
                              className="mt-0.5 font-mono text-[11px] font-normal normal-case tracking-wide text-[#DC2626]"
                              title={motivoDe(r) ?? ""}
                            >
                              {motivoDe(r)}
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3 text-xs text-muted-foreground">
                          {r.cliente_empresa || "—"}
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-xs">{r.cantidad}</td>
                        <td className="px-4 py-3 text-right font-mono text-xs font-bold">
                          {formatMoney(Number(r.total))}
                        </td>
                        <td className="px-4 py-3">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <button
                                className={`px-2 py-1 font-mono text-[10px] font-bold uppercase tracking-[0.12em] ${ESTADO_CLASS[estado]}`}
                              >
                                {ESTADO_LABEL[estado]}
                              </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent>
                              {(Object.keys(ESTADO_LABEL) as Estado[]).map((e) => (
                                <DropdownMenuItem
                                  key={e}
                                  onClick={() => changeStatus(r.id, e)}
                                >
                                  {ESTADO_LABEL[e]}
                                </DropdownMenuItem>
                              ))}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex justify-end gap-1">
                            {canAddFlete && (
                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={() => setFleteRow(r)}
                                aria-label="Agregar flete y crear revisión"
                                title="Agregar flete (crear revisión)"
                              >
                                <Truck className="h-4 w-4 text-[#57524A]" />
                              </Button>
                            )}
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => duplicate(r.id)}
                              aria-label="Duplicar en cotizador"
                              title="Duplicar en cotizador"
                            >
                              <Copy className="h-4 w-4" />
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button size="icon" variant="ghost" aria-label="Eliminar cotización" title="Eliminar">
                                  <Trash2 className="h-4 w-4 text-[#DC2626]" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Eliminar cotización</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    ¿Eliminar {r.folio}? Esta acción no se puede deshacer.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => removeRow(r.id)}
                                    className="bg-[#DC2626] hover:bg-[#DC2626]/90"
                                  >
                                    Eliminar
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </RailSection>
      </div>

      {fleteRow && (
        <AgregarFleteModal
          row={fleteRow}
          open={!!fleteRow}
          onOpenChange={(v) => { if (!v) setFleteRow(null); }}
          onDone={invalidate}
        />
      )}

      <MotivoPerdidaModal
        row={perdidaRow}
        onOpenChange={(v) => { if (!v) setPerdidaRow(null); }}
        onConfirm={async (motivo) => {
          if (!perdidaRow) return;
          const ok = await aplicarEstado(perdidaRow.id, "perdido", motivo);
          if (ok) setPerdidaRow(null);
        }}
      />

      <RegistrarHistoricaModal
        open={showHistorica}
        onOpenChange={setShowHistorica}
        onDone={invalidate}
      />

      <ActualizarInventarioModal
        open={showInventario}
        onOpenChange={setShowInventario}
        boyasActual={inventarioQuery.data?.boyas_disponibles ?? 0}
        clavosActual={clavosDisponibles}
        clavosSupported={clavosSupported}
        onDone={() => qc.invalidateQueries({ queryKey: ["inventario"] })}
      />
    </div>
  );
}
