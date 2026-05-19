import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Download, Mail, MessageCircle, Save, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { QuoteForm } from "@/components/cotizador/QuoteForm";
import { PriceSummary } from "@/components/cotizador/PriceSummary";
import { initialQuote, useQuoteState, type QuoteState } from "@/hooks/useQuoteState";
import { deliveryMessage, PRODUCTOS } from "@/lib/vialux/constants";
import { supabase } from "@/integrations/supabase/client";
import {
  buildMailto,
  buildWhatsAppUrl,
  generateFolio,
  type QuoteRow,
} from "@/lib/vialux/quote-actions";
import { generateQuotePdf } from "@/lib/pdf/generateQuotePdf";

export const Route = createFileRoute("/")({
  component: CotizadorPage,
  validateSearch: (s: Record<string, unknown>) => ({
    duplicate: typeof s.duplicate === "string" ? s.duplicate : undefined,
    clienteId: typeof s.clienteId === "string" ? s.clienteId : undefined,
  }),
});

async function upsertCliente(state: QuoteState): Promise<string | null> {
  if (!state.cliente.trim()) return null;
  const nombre = state.cliente.trim().toUpperCase();
  const { data: existing } = await supabase
    .from("clientes")
    .select("id")
    .eq("nombre", nombre)
    .maybeSingle();
  if (existing) return existing.id;
  const { data: created } = await supabase
    .from("clientes")
    .insert({
      nombre,
      empresa: (state.empresa || "").trim().toUpperCase(),
      telefono: state.telefono.trim(),
    })
    .select("id")
    .single();
  return created?.id ?? null;
}

function CotizadorPage() {
  const { duplicate, clienteId } = Route.useSearch();
  const navigate = useNavigate();
  const { state, setState, update, reset, calc } = useQuoteState();
  const [savedFolio, setSavedFolio] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Prefill if duplicating
  useEffect(() => {
    if (!duplicate) return;
    (async () => {
      const { data } = await supabase
        .from("cotizaciones")
        .select("*")
        .eq("id", duplicate)
        .maybeSingle();
      if (!data) return;
      const parentFolio = data.folio_padre ?? data.folio;
      const next: QuoteState = {
        ...initialQuote,
        cliente: data.cliente_nombre,
        empresa: data.cliente_empresa ?? "",
        telefono: data.cliente_telefono ?? "",
        cp: data.cp_destino ?? "",
        producto: (data.producto as QuoteState["producto"]) ?? "boya_clavos",
        cantidad: data.cantidad,
        requiereFactura: data.requiere_factura,
        precioEspecialOn: data.precio_especial,
        precioEspecial: data.precio_especial ? Number(data.precio_unitario) : 0,
        notas: data.notas_internas ?? "",
        revision: (data.revision ?? 0) + 1,
        folioPadre: parentFolio,
        incluyeFlete: data.incluye_flete,
        fletePaqueteria: data.flete_paqueteria ?? "",
        fleteModalidad:
          (data.flete_modalidad as QuoteState["fleteModalidad"]) ||
          "ENTREGA A DOMICILIO",
        fleteCosto: Number(data.flete_costo ?? 0),
      };
      setState(next);
      void navigate({ to: "/", search: {} as never, replace: true });
      toast.success("Cotización duplicada en el formulario");
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [duplicate]);

  // Prefill from client directory
  useEffect(() => {
    if (!clienteId) return;
    (async () => {
      const { data } = await supabase
        .from("clientes")
        .select("*")
        .eq("id", clienteId)
        .maybeSingle();
      if (!data) return;
      setState((s) => ({
        ...s,
        cliente: data.nombre,
        empresa: data.empresa ?? "",
        telefono: data.telefono ?? "",
      }));
      void navigate({ to: "/", search: {} as never, replace: true });
      toast.success(`Cliente ${data.nombre} cargado`);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clienteId]);

  const deliveryMsg = deliveryMessage(state.cp, state.cantidad);

  const ensureFolio = async (): Promise<string> => {
    if (savedFolio) return savedFolio;
    const folio = await generateFolio(state.revision, state.folioPadre);
    setSavedFolio(folio);
    return folio;
  };

  const validate = (): Record<string, string> | null => {
    const errs: Record<string, string> = {};
    if (!state.cliente.trim()) errs.cliente = "Requerido";
    if (!state.cantidad || state.cantidad <= 0) errs.cantidad = "Requerido";
    return Object.keys(errs).length ? errs : null;
  };

  const handleSave = async () => {
    const errs = validate();
    if (errs) { setFormErrors(errs); return; }
    setFormErrors({});
    try {
      setSaving(true);
      const [folio, clienteIdLinked] = await Promise.all([
        ensureFolio(),
        upsertCliente(state),
      ]);
      const prod = PRODUCTOS[state.producto];
      const row: Omit<QuoteRow, "id" | "fecha"> = {
        folio,
        cliente_id: clienteIdLinked,
        cliente_nombre: state.cliente.toUpperCase(),
        cliente_empresa: (state.empresa || "-").toUpperCase(),
        cliente_telefono: state.telefono,
        cp_destino: state.cp,
        municipio: state.municipio,
        estado_destino: state.estadoNombre,
        producto: state.producto,
        descripcion_producto: prod.descripcion,
        cantidad: state.cantidad,
        precio_unitario: calc.precioUnitario,
        requiere_factura: state.requiereFactura,
        precio_especial: state.precioEspecialOn,
        subtotal_producto: calc.subtotalProducto,
        incluye_flete: state.incluyeFlete,
        flete_paqueteria: state.fletePaqueteria,
        flete_modalidad: state.fleteModalidad,
        flete_costo: calc.subtotalFlete,
        subtotal_general: calc.subtotalGeneral,
        iva: calc.iva,
        total: calc.total,
        margen_porcentaje: Number(calc.margen.toFixed(2)),
        estado: "cotizado",
        revision: state.revision,
        folio_padre: state.folioPadre,
        notas_internas: state.notas,
      };
      const { error } = await supabase.from("cotizaciones").insert(row);
      if (error) throw error;
      toast.success(`Cotización ${folio} guardada`);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const handlePdf = async () => {
    const errs = validate();
    if (errs) { setFormErrors(errs); return; }
    setFormErrors({});
    try {
      const folio = await ensureFolio();
      await generateQuotePdf({ folio, state, calc, deliveryMsg });
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const handleWhatsApp = async () => {
    if (!state.telefono.trim()) return toast.error("Falta el teléfono del cliente");
    const folio = await ensureFolio();
    window.open(buildWhatsAppUrl(state, folio, calc.total), "_blank");
  };

  const handleMail = async () => {
    const folio = await ensureFolio();
    window.location.href = buildMailto(state, folio, calc.total);
  };

  const handleReset = () => {
    reset();
    setSavedFolio(null);
    setFormErrors({});
    toast.info("Formulario limpiado");
  };

  return (
    <div className="mx-auto w-full max-w-7xl px-6 py-8">
      <div className="mb-6 flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-bold uppercase tracking-wider">Cotizador</h1>
          <p className="text-xs uppercase tracking-[0.16em] text-[#6B8899]">
            Captura los datos del cliente y genera la cotización
          </p>
        </div>
        {savedFolio && (
          <div className="rounded-full bg-[#EDBA1A] px-4 py-1.5 font-mono text-xs font-bold text-[#1C1E22]">
            {savedFolio}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_360px]">
        <QuoteForm state={state} update={update} errors={formErrors} />
        <div className="space-y-4 lg:sticky lg:top-6 lg:self-start">
          <PriceSummary
            calc={calc}
            requiereFactura={state.requiereFactura}
            incluyeFlete={state.incluyeFlete}
            deliveryMsg={deliveryMsg}
          />
          <div className="grid grid-cols-2 gap-2">
            <Button onClick={handlePdf} className="bg-[#EDBA1A] text-[#1C1E22] hover:bg-[#EDBA1A]/90">
              <Download className="mr-2 h-4 w-4" /> PDF
            </Button>
            <Button onClick={handleSave} disabled={saving} variant="outline">
              <Save className="mr-2 h-4 w-4" /> Guardar
            </Button>
            <Button onClick={handleWhatsApp} variant="outline">
              <MessageCircle className="mr-2 h-4 w-4" /> WhatsApp
            </Button>
            <Button onClick={handleMail} variant="outline">
              <Mail className="mr-2 h-4 w-4" /> Correo
            </Button>
            <Button
              onClick={handleReset}
              variant="ghost"
              className="col-span-2 text-muted-foreground"
            >
              <RotateCcw className="mr-2 h-4 w-4" /> Nueva cotización
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
