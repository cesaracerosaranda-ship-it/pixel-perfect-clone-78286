import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { formatMoney } from "@/lib/vialux/constants";
import {
  Search,
  UserPlus,
  Calculator,
  ChevronRight,
  Pencil,
  Check,
  X,
} from "lucide-react";

export const Route = createFileRoute("/clientes")({
  component: ClientesPage,
});

type Cliente = {
  id: string;
  nombre: string;
  empresa: string;
  telefono: string;
  email: string;
  notas: string;
  contacto_nombre: string;
  contacto_telefono: string;
  created_at: string;
};

type CotizacionRow = {
  id: string;
  folio: string;
  fecha: string;
  total: number;
  estado: string;
  cantidad: number;
  producto: string;
};

type ClienteConStats = Cliente & {
  cotizaciones: CotizacionRow[];
  total_cotizaciones: number;
  total_historico: number;
  ultima_cotizacion: string | null;
};

const ESTADO_CLASS: Record<string, string> = {
  cotizado: "bg-[#EDBA1A] text-[#1B1A17]",
  cerrado: "bg-emerald-500 text-white",
  enviado: "bg-[#F0EFEB] text-[#1B1A17]",
  perdido: "bg-red-500 text-white",
};

function initials(nombre: string) {
  return nombre
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
}

// ─── Client Detail Sheet ──────────────────────────────────────────────────────

function ClientDetail({
  cliente,
  onCotizar,
  onUpdated,
}: {
  cliente: ClienteConStats;
  onCotizar: () => void;
  onUpdated: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    empresa: cliente.empresa,
    telefono: cliente.telefono,
    email: cliente.email,
    notas: cliente.notas,
    contacto_nombre: cliente.contacto_nombre,
    contacto_telefono: cliente.contacto_telefono,
  });

  const save = async () => {
    const { error } = await supabase
      .from("clientes")
      .update(form)
      .eq("id", cliente.id);
    if (error) { toast.error(error.message); return; }
    toast.success("Cliente actualizado");
    setEditing(false);
    onUpdated();
  };

  const ticketPromedio =
    cliente.total_cotizaciones > 0
      ? cliente.total_historico / cliente.total_cotizaciones
      : 0;

  return (
    <div className="flex flex-col gap-6">
      <SheetHeader>
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-[#EDBA1A] font-mono text-xl font-bold text-[#1B1A17]">
            {initials(cliente.nombre)}
          </div>
          <div>
            <SheetTitle className="text-lg font-bold uppercase tracking-wide">
              {cliente.nombre}
            </SheetTitle>
            <p className="text-sm text-muted-foreground">
              {cliente.empresa || "Sin empresa"}
            </p>
          </div>
        </div>
      </SheetHeader>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-md border border-border bg-background/40 p-3 text-center">
          <div className="text-[10px] uppercase tracking-[0.14em] text-[#A49E91]">Cotizaciones</div>
          <div className="font-mono text-xl font-bold text-[#EDBA1A]">{cliente.total_cotizaciones}</div>
        </div>
        <div className="rounded-md border border-border bg-background/40 p-3 text-center">
          <div className="text-[10px] uppercase tracking-[0.14em] text-[#A49E91]">Total</div>
          <div className="font-mono text-base font-bold">{formatMoney(cliente.total_historico)}</div>
        </div>
        <div className="rounded-md border border-border bg-background/40 p-3 text-center">
          <div className="text-[10px] uppercase tracking-[0.14em] text-[#A49E91]">Promedio</div>
          <div className="font-mono text-base font-bold">{formatMoney(ticketPromedio)}</div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <Button
          onClick={onCotizar}
          className="flex-1 bg-[#EDBA1A] text-[#1B1A17] hover:bg-[#EDBA1A]/90"
        >
          <Calculator className="mr-2 h-4 w-4" /> Nueva Cotización
        </Button>
        {!editing ? (
          <Button variant="outline" size="icon" onClick={() => setEditing(true)}>
            <Pencil className="h-4 w-4" />
          </Button>
        ) : (
          <>
            <Button variant="outline" size="icon" onClick={save}>
              <Check className="h-4 w-4 text-emerald-400" />
            </Button>
            <Button variant="outline" size="icon" onClick={() => setEditing(false)}>
              <X className="h-4 w-4 text-red-400" />
            </Button>
          </>
        )}
      </div>

      {/* Info */}
      {editing ? (
        <div className="space-y-4 rounded-lg border border-border bg-card p-4">
          <div>
            <div className="mb-2 text-[9px] font-bold uppercase tracking-[0.18em] text-[#EDBA1A]">Dirigida a (aparece en PDF)</div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-[10px] uppercase tracking-[0.14em] text-[#A49E91]">Empresa</Label>
                <Input value={form.empresa} onChange={(e) => setForm((f) => ({ ...f, empresa: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[10px] uppercase tracking-[0.14em] text-[#A49E91]">Teléfono</Label>
                <Input value={form.telefono} onChange={(e) => setForm((f) => ({ ...f, telefono: e.target.value }))} className="font-mono" />
              </div>
            </div>
            <div className="mt-3 space-y-1.5">
              <Label className="text-[10px] uppercase tracking-[0.14em] text-[#A49E91]">Email</Label>
              <Input value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} />
            </div>
          </div>
          <div className="h-px bg-border" />
          <div>
            <div className="mb-2 text-[9px] font-bold uppercase tracking-[0.18em] text-[#A49E91]">Contacto (quién solicita)</div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-[10px] uppercase tracking-[0.14em] text-[#A49E91]">Nombre</Label>
                <Input value={form.contacto_nombre} onChange={(e) => setForm((f) => ({ ...f, contacto_nombre: e.target.value }))} placeholder="EJ. ANA MEDINA" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[10px] uppercase tracking-[0.14em] text-[#A49E91]">Teléfono</Label>
                <Input value={form.contacto_telefono} onChange={(e) => setForm((f) => ({ ...f, contacto_telefono: e.target.value }))} className="font-mono" placeholder="8112345678" />
              </div>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-[10px] uppercase tracking-[0.14em] text-[#A49E91]">Notas internas</Label>
            <Textarea value={form.notas} onChange={(e) => setForm((f) => ({ ...f, notas: e.target.value }))} rows={2} />
          </div>
        </div>
      ) : (
        <div className="space-y-3 rounded-lg border border-border bg-card p-4 text-sm">
          {(cliente.telefono || cliente.empresa || cliente.email) && (
            <div>
              <div className="mb-1.5 text-[9px] font-bold uppercase tracking-[0.16em] text-[#EDBA1A]">Dirigida a</div>
              <div className="space-y-1">
                {cliente.empresa && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Empresa</span>
                    <span>{cliente.empresa}</span>
                  </div>
                )}
                {cliente.telefono && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Teléfono</span>
                    <span className="font-mono">{cliente.telefono}</span>
                  </div>
                )}
                {cliente.email && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Email</span>
                    <span>{cliente.email}</span>
                  </div>
                )}
              </div>
            </div>
          )}
          {(cliente.contacto_nombre || cliente.contacto_telefono) && (
            <div>
              <div className="mb-1.5 text-[9px] font-bold uppercase tracking-[0.16em] text-[#A49E91]">Contacto (quien solicita)</div>
              <div className="space-y-1">
                {cliente.contacto_nombre && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Nombre</span>
                    <span className="font-semibold uppercase">{cliente.contacto_nombre}</span>
                  </div>
                )}
                {cliente.contacto_telefono && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Teléfono</span>
                    <span className="font-mono">{cliente.contacto_telefono}</span>
                  </div>
                )}
              </div>
            </div>
          )}
          {!cliente.telefono && !cliente.email && !cliente.contacto_nombre && !cliente.empresa && (
            <p className="text-xs text-muted-foreground">Sin información adicional. Haz clic en editar para agregar.</p>
          )}
          {cliente.notas && (
            <p className="text-xs text-muted-foreground border-t border-border pt-2">{cliente.notas}</p>
          )}
        </div>
      )}

      {/* Quotes */}
      <div>
        <div className="mb-3 text-[10px] font-bold uppercase tracking-[0.16em] text-[#A49E91]">
          Cotizaciones
        </div>
        {cliente.cotizaciones.length === 0 ? (
          <p className="text-sm text-muted-foreground">Sin cotizaciones aún.</p>
        ) : (
          <div className="space-y-2">
            {cliente.cotizaciones.map((q) => (
              <div
                key={q.id}
                className="flex items-center justify-between rounded-md border border-border bg-background/40 px-3 py-2"
              >
                <div>
                  <div className="font-mono text-xs font-bold text-[#EDBA1A]">{q.folio}</div>
                  <div className="text-[11px] text-muted-foreground">
                    {new Date(q.fecha).toLocaleDateString("es-MX")} · {q.cantidad} pzas
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-sm font-bold">{formatMoney(Number(q.total))}</span>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider ${ESTADO_CLASS[q.estado] ?? "bg-muted text-foreground"}`}
                  >
                    {q.estado}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── New Cliente Dialog ────────────────────────────────────────────────────────

const emptyForm = {
  nombre: "", empresa: "", telefono: "", email: "",
  contacto_nombre: "", contacto_telefono: "",
};

function NuevoClienteDialog({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onCreated: () => void;
}) {
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const f = (k: keyof typeof emptyForm) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((prev) => ({ ...prev, [k]: e.target.value }));

  const submit = async () => {
    if (!form.nombre.trim()) { toast.error("El nombre es requerido"); return; }
    setSaving(true);
    const { error } = await supabase.from("clientes").insert({
      nombre: form.nombre.trim().toUpperCase(),
      empresa: form.empresa.trim().toUpperCase(),
      telefono: form.telefono.trim(),
      email: form.email.trim(),
      contacto_nombre: form.contacto_nombre.trim().toUpperCase(),
      contacto_telefono: form.contacto_telefono.trim(),
    });
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Cliente agregado");
    setForm(emptyForm);
    onOpenChange(false);
    onCreated();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="uppercase tracking-wider">Nuevo Cliente</DialogTitle>
        </DialogHeader>

        <div className="space-y-5 py-2">
          {/* Sección: Dirigida a */}
          <div>
            <div className="mb-3 text-[9px] font-bold uppercase tracking-[0.18em] text-[#EDBA1A]">
              Dirigida a — aparece en el PDF
            </div>
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label className="text-[10px] uppercase tracking-[0.14em] text-[#A49E91]">Nombre *</Label>
                <Input
                  value={form.nombre}
                  onChange={f("nombre")}
                  placeholder="EJ. ITZARE DAYAN MONTIEL"
                  autoFocus
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-[10px] uppercase tracking-[0.14em] text-[#A49E91]">Empresa</Label>
                  <Input value={form.empresa} onChange={f("empresa")} placeholder="—" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[10px] uppercase tracking-[0.14em] text-[#A49E91]">Teléfono</Label>
                  <Input value={form.telefono} onChange={f("telefono")} placeholder="8112345678" className="font-mono" />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-[10px] uppercase tracking-[0.14em] text-[#A49E91]">Email</Label>
                <Input value={form.email} onChange={f("email")} placeholder="correo@ejemplo.com" />
              </div>
            </div>
          </div>

          <div className="relative flex items-center gap-3">
            <div className="h-px flex-1 bg-border" />
            <span className="text-[9px] uppercase tracking-[0.16em] text-muted-foreground">Contacto (opcional)</span>
            <div className="h-px flex-1 bg-border" />
          </div>

          {/* Sección: Contacto */}
          <div>
            <div className="mb-3 text-[9px] font-bold uppercase tracking-[0.18em] text-[#A49E91]">
              Quién solicita la cotización
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-[10px] uppercase tracking-[0.14em] text-[#A49E91]">Nombre del contacto</Label>
                <Input value={form.contacto_nombre} onChange={f("contacto_nombre")} placeholder="EJ. ANA MEDINA" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[10px] uppercase tracking-[0.14em] text-[#A49E91]">Teléfono del contacto</Label>
                <Input value={form.contacto_telefono} onChange={f("contacto_telefono")} placeholder="8112345678" className="font-mono" />
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button
            onClick={submit}
            disabled={saving}
            className="bg-[#EDBA1A] text-[#1B1A17] hover:bg-[#EDBA1A]/90"
          >
            {saving ? "Guardando..." : "Guardar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

function ClientesPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showNew, setShowNew] = useState(false);

  const clientesQuery = useQuery({
    queryKey: ["clientes"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("clientes")
        .select(`*, cotizaciones(id, folio, fecha, total, estado, cantidad, producto)`)
        .order("nombre", { ascending: true });
      if (error) throw error;
      return (data ?? []).map((c) => {
        const cots = ((c.cotizaciones as CotizacionRow[]) ?? []).sort(
          (a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime(),
        );
        return {
          ...c,
          cotizaciones: cots,
          total_cotizaciones: cots.length,
          total_historico: cots.reduce((s, q) => s + Number(q.total), 0),
          ultima_cotizacion: cots[0]?.fecha ?? null,
        } as ClienteConStats;
      });
    },
  });

  const rows = (clientesQuery.data ?? []).filter((c) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      c.nombre.toLowerCase().includes(q) ||
      c.empresa.toLowerCase().includes(q) ||
      c.telefono.includes(q)
    );
  });

  const selected = selectedId
    ? clientesQuery.data?.find((c) => c.id === selectedId) ?? null
    : null;

  const totalHistorico = (clientesQuery.data ?? []).reduce(
    (s, c) => s + c.total_historico,
    0,
  );

  const ticketPromedio =
    (clientesQuery.data?.length ?? 0) > 0
      ? totalHistorico / (clientesQuery.data?.length ?? 1)
      : 0;

  return (
    <div className="mx-auto w-full max-w-7xl px-6 py-8">
      {/* Page header */}
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold uppercase tracking-wider">Directorio</h1>
          <p className="text-xs uppercase tracking-[0.16em] text-[#A49E91]">
            Cartera de clientes y su historial
          </p>
        </div>
      </div>

      {/* KPI cards */}
      <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-[#EDBA1A]/25 bg-[#EDBA1A]/5 p-4">
          <div className="mb-1 text-[10px] uppercase tracking-[0.16em] text-[#C99B0E]">
            Clientes activos
          </div>
          <div className="font-mono text-3xl font-black text-[#EDBA1A] tabular-nums">
            {clientesQuery.data?.length ?? "—"}
          </div>
          <div className="mt-0.5 text-[10px] text-muted-foreground">en directorio</div>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="mb-1 text-[10px] uppercase tracking-[0.16em] text-[#A49E91]">
            Total histórico
          </div>
          <div className="font-mono text-2xl font-black text-white tabular-nums">
            {formatMoney(totalHistorico)}
          </div>
          <div className="mt-0.5 text-[10px] text-muted-foreground">acumulado de cotizaciones</div>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="mb-1 text-[10px] uppercase tracking-[0.16em] text-[#A49E91]">
            Ticket promedio
          </div>
          <div className="font-mono text-2xl font-black text-white tabular-nums">
            {formatMoney(ticketPromedio)}
          </div>
          <div className="mt-0.5 text-[10px] text-muted-foreground">por cliente</div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="mb-4 flex gap-3">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nombre, empresa o teléfono..."
            className="pl-9"
          />
        </div>
        <Button
          onClick={() => setShowNew(true)}
          className="bg-[#EDBA1A] text-[#1B1A17] hover:bg-[#EDBA1A]/90 shrink-0"
        >
          <UserPlus className="mr-2 h-4 w-4" /> Nuevo Cliente
        </Button>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <table className="w-full text-sm">
          <thead className="border-b border-border bg-background/60 text-[10px] uppercase tracking-[0.14em] text-[#A49E91]">
            <tr>
              <th className="px-4 py-3.5 text-left font-bold">Cliente</th>
              <th className="px-4 py-3.5 text-left font-bold">Teléfono</th>
              <th className="px-4 py-3.5 text-right font-bold">Cotizaciones</th>
              <th className="px-4 py-3.5 text-right font-bold">Total histórico</th>
              <th className="px-4 py-3.5 text-left font-bold">Última cotización</th>
              <th className="px-4 py-3.5" />
            </tr>
          </thead>
          <tbody>
            {clientesQuery.isLoading ? (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-muted-foreground">
                  Cargando...
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-muted-foreground">
                  {search ? "Sin resultados." : "Sin clientes todavía. ¡Agrega el primero!"}
                </td>
              </tr>
            ) : (
              rows.map((c) => (
                <tr
                  key={c.id}
                  className="cursor-pointer border-t border-border transition-colors hover:bg-[#EDBA1A]/[0.04]"
                  onClick={() => setSelectedId(c.id)}
                >
                  <td className="px-4 py-3">
                    <div className="font-semibold uppercase">{c.nombre}</div>
                    {c.empresa && (
                      <div className="text-xs text-muted-foreground">{c.empresa}</div>
                    )}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                    {c.telefono || "—"}
                  </td>
                  <td className="px-4 py-3 text-right font-mono">{c.total_cotizaciones}</td>
                  <td className="px-4 py-3 text-right font-mono font-bold text-[#EDBA1A]">
                    {formatMoney(c.total_historico)}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                    {c.ultima_cotizacion
                      ? new Date(c.ultima_cotizacion).toLocaleDateString("es-MX")
                      : "—"}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <ChevronRight className="ml-auto h-4 w-4 text-muted-foreground" />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Detail Sheet */}
      <Sheet open={!!selectedId} onOpenChange={(open) => !open && setSelectedId(null)}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
          {selected && (
            <ClientDetail
              cliente={selected}
              onCotizar={() => {
                setSelectedId(null);
                navigate({ to: "/", search: { clienteId: selected.id } as never });
              }}
              onUpdated={() => qc.invalidateQueries({ queryKey: ["clientes"] })}
            />
          )}
        </SheetContent>
      </Sheet>

      <NuevoClienteDialog
        open={showNew}
        onOpenChange={setShowNew}
        onCreated={() => qc.invalidateQueries({ queryKey: ["clientes"] })}
      />
    </div>
  );
}
