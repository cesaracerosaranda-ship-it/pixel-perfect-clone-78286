import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Download, Mail, MessageCircle, Save, RotateCcw, CheckCircle2, Copy, Check } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { QuoteForm } from "@/components/cotizador/QuoteForm";
import { PriceSummary } from "@/components/cotizador/PriceSummary";
import { initialQuote, useQuoteState, type QuoteState } from "@/hooks/useQuoteState";
import { deliveryMessage, PRODUCTOS } from "@/lib/vialux/constants";
import { supabase } from "@/integrations/supabase/client";
import {
  buildMailto,
  buildWhatsAppResumen,
  buildWhatsAppUrl,
  generateFolio,
  type QuoteRow,
} from "@/lib/vialux/quote-actions";
import { generateQuotePdf } from "@/lib/pdf/generateQuotePdf";
import { upsertCliente } from "@/lib/vialux/clientes";
import { archivarCotizacionPdf, ligaPdfCotizacion } from "@/lib/vialux/documentos";

export const Route = createFileRoute("/_authenticated/")({
  component: CotizadorPage,
  validateSearch: (s: Record<string, unknown>) => ({
    duplicate: typeof s.duplicate === "string" ? s.duplicate : undefined,
    clienteId: typeof s.clienteId === "string" ? s.clienteId : undefined,
  }),
});

function CotizadorPage() {
  const { duplicate, clienteId } = Route.useSearch();
  const navigate = useNavigate();
  const { state, setState, update, reset, calc } = useQuoteState();
  const [savedFolio, setSavedFolio] = useState<string | null>(null);
  const [savedId, setSavedId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [waResumen, setWaResumen] = useState<string | null>(null);
  const [copiado, setCopiado] = useState(false);

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
      let emailCliente = "";
      if (data.cliente_id) {
        const { data: cli } = await supabase
          .from("clientes")
          .select("email")
          .eq("id", data.cliente_id)
          .maybeSingle();
        emailCliente = cli?.email ?? "";
      }
      const parentFolio = data.folio_padre ?? data.folio;
      const next: QuoteState = {
        ...initialQuote,
        cliente: data.cliente_nombre,
        empresa: data.cliente_empresa ?? "",
        telefono: data.cliente_telefono ?? "",
        email: emailCliente,
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
        email: data.email ?? "",
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

  // Core save logic — idempotent: skips insert if already saved in this session
  const persistQuote = async (
    silent = false,
  ): Promise<{ folio: string; cotizacionId: string | null; clienteId: string | null }> => {
    const [folio, clienteIdLinked] = await Promise.all([
      ensureFolio(),
      upsertCliente({
        nombre: state.cliente,
        empresa: state.empresa,
        telefono: state.telefono,
        email: state.email,
      }),
    ]);

    let cotizacionId = savedId;
    if (!savedId) {
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
      const { data, error } = await supabase
        .from("cotizaciones")
        .insert(row)
        .select("id")
        .single();
      if (error) throw error;
      cotizacionId = data.id;
      setSavedId(data.id);
      if (!silent) toast.success(`Cotización ${folio} guardada`);
    }

    return { folio, cotizacionId, clienteId: clienteIdLinked };
  };

  const handleSave = async () => {
    const errs = validate();
    if (errs) { setFormErrors(errs); return; }
    setFormErrors({});
    if (savedId) {
      toast.info("Cotización ya guardada — ver en Historial");
      return;
    }
    try {
      setSaving(true);
      await persistQuote(false);
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
      setSaving(true);
      const { folio, cotizacionId, clienteId } = await persistQuote(true); // auto-save silently
      const { filename, blob } = await generateQuotePdf({ folio, state, calc, deliveryMsg });
      if (!savedId) toast.success(`Cotización ${folio} guardada en Historial`);
      if (clienteId && cotizacionId) {
        try {
          const archivado = await archivarCotizacionPdf({
            clienteId,
            cotizacionId,
            blob,
            nombre: filename,
          });
          if (archivado) toast.success("PDF archivado en el expediente del cliente");
        } catch (e) {
          // El PDF ya se descargó; el expediente es best-effort
          toast.info(`PDF descargado; no se archivó en el expediente: ${(e as Error).message}`);
        }
      }
      // Texto para acompañar la cotización por WhatsApp (descargar PDF +
      // adjuntarlo + pegar este resumen). Se abre en un diálogo para copiar.
      const resumen = buildWhatsAppResumen(state, folio, calc, deliveryMsg);
      setCopiado(false);
      setWaResumen(resumen);
      try {
        await navigator.clipboard.writeText(resumen);
        setCopiado(true);
      } catch {
        /* el usuario puede copiar desde el diálogo */
      }
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const copiarResumen = async () => {
    if (!waResumen) return;
    try {
      await navigator.clipboard.writeText(waResumen);
      setCopiado(true);
      toast.success("Texto copiado — pégalo en WhatsApp");
    } catch {
      toast.error("No se pudo copiar; selecciona y copia manualmente");
    }
  };

  // Garantiza que el PDF esté archivado en el expediente y regresa una liga
  // firmada de 30 días para compartir. Best-effort: si algo falla, se comparte
  // el mensaje sin liga (comportamiento anterior).
  const obtenerLigaPdf = async (
    folio: string,
    cotizacionId: string | null,
    clienteId: string | null,
  ): Promise<string | null> => {
    if (!cotizacionId || !clienteId) return null;
    try {
      let url = await ligaPdfCotizacion(cotizacionId);
      if (!url) {
        const { filename, blob } = await generateQuotePdf({
          folio,
          state,
          calc,
          deliveryMsg,
          download: false,
        });
        await archivarCotizacionPdf({ clienteId, cotizacionId, blob, nombre: filename });
        url = await ligaPdfCotizacion(cotizacionId);
      }
      return url;
    } catch {
      return null;
    }
  };

  const handleWhatsApp = async () => {
    if (!state.telefono.trim()) return toast.error("Falta el teléfono del cliente");
    const errs = validate();
    if (errs) { setFormErrors(errs); return; }
    setFormErrors({});
    try {
      setSaving(true);
      const { folio, cotizacionId, clienteId } = await persistQuote(true);
      const pdfUrl = await obtenerLigaPdf(folio, cotizacionId, clienteId);
      window.open(buildWhatsAppUrl(state, folio, calc.total, pdfUrl), "_blank");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const handleMail = async () => {
    const errs = validate();
    if (errs) { setFormErrors(errs); return; }
    if (!state.email.trim()) return toast.error("Falta el correo del cliente");
    setFormErrors({});
    try {
      setSaving(true);
      const { folio, cotizacionId, clienteId } = await persistQuote(true);
      // Garantiza el PDF archivado (la función lo adjunta desde el expediente)
      const pdfUrl = await obtenerLigaPdf(folio, cotizacionId, clienteId);

      // Envío automático desde el Gmail de VIALUX con el PDF adjunto
      try {
        const { data, error } = await supabase.functions.invoke("enviar-cotizacion", {
          body: { cotizacion_id: cotizacionId },
        });
        if (error) throw new Error(error.message);
        if (data?.error) throw new Error(data.error);
        toast.success(`Cotización ${folio} enviada a ${data?.email ?? state.email} con el PDF adjunto`);
        return;
      } catch {
        // Fallback: la función no está desplegada/configurada aún —
        // se abre el borrador tradicional con la liga de descarga
        window.location.href = buildMailto(state, folio, calc.total, pdfUrl);
        toast.info("Envío automático no disponible — se abrió el borrador de correo");
      }
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    reset();
    setSavedFolio(null);
    setSavedId(null);
    setFormErrors({});
    toast.info("Formulario limpiado");
  };

  const isSaved = !!savedId;

  return (
    <div className="mx-auto w-full max-w-7xl px-6 py-8">
      <div className="mb-6 flex items-end justify-between">
        <div className="space-y-1">
          <div className="font-mono text-[11px] uppercase tracking-[0.3em] text-[#6B665C]">
            Módulo · Cotizaciones
          </div>
          <h1 className="text-2xl font-extrabold uppercase tracking-[0.08em]">Cotizador</h1>
        </div>
        {savedFolio && (
          <div className="flex items-center gap-2 bg-[#EDBA1A] px-4 py-1.5 font-mono text-xs font-bold tracking-[0.06em] text-[#1B1A17]">
            {isSaved && <CheckCircle2 className="h-3.5 w-3.5" />}
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
            <Button
              onClick={handlePdf}
              disabled={saving}
              className="font-mono text-[12px] font-bold uppercase tracking-[0.2em] bg-[#EDBA1A] text-[#1B1A17] hover:bg-[#EDBA1A]/90"
            >
              <Download className="mr-1.5 h-3.5 w-3.5" /> PDF
            </Button>
            <Button
              onClick={handleSave}
              disabled={saving || isSaved}
              variant="outline"
              className={`font-mono text-[12px] font-bold uppercase tracking-[0.2em] ${isSaved ? "border-[#12843C]/40 text-[#12843C]" : ""}`}
            >
              {isSaved ? (
                <><CheckCircle2 className="mr-1.5 h-3.5 w-3.5" /> Guardada</>
              ) : (
                <><Save className="mr-1.5 h-3.5 w-3.5" /> Guardar</>
              )}
            </Button>
            <Button onClick={handleWhatsApp} disabled={saving} variant="outline" className="font-mono text-[12px] font-bold uppercase tracking-[0.2em] text-[#57524A]">
              <MessageCircle className="mr-1.5 h-3.5 w-3.5" /> WhatsApp
            </Button>
            <Button onClick={handleMail} disabled={saving} variant="outline" className="font-mono text-[12px] font-bold uppercase tracking-[0.2em] text-[#57524A]">
              <Mail className="mr-1.5 h-3.5 w-3.5" /> Correo
            </Button>
            <Button
              onClick={handleReset}
              variant="ghost"
              className="font-mono text-[12px] font-bold uppercase tracking-[0.2em] col-span-2 text-muted-foreground"
            >
              <RotateCcw className="mr-1.5 h-3.5 w-3.5" /> Nueva cotización
            </Button>
          </div>
        </div>
      </div>

      {/* Texto para WhatsApp tras descargar el PDF */}
      <Dialog open={!!waResumen} onOpenChange={(v) => !v && setWaResumen(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="uppercase tracking-wider">
              Texto para WhatsApp
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-1">
            <p className="font-mono text-[12px] leading-relaxed text-[#6B665C]">
              PDF DESCARGADO. ADJÚNTALO EN WHATSAPP Y PEGA ESTE TEXTO
              {copiado ? " (YA COPIADO)" : ""}.
            </p>
            <textarea
              readOnly
              value={waResumen ?? ""}
              rows={11}
              onFocus={(e) => e.currentTarget.select()}
              className="w-full resize-none border border-border bg-background p-3 text-xs leading-relaxed focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#EDBA1A]"
            />
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setWaResumen(null)}>
                Cerrar
              </Button>
              <Button
                onClick={copiarResumen}
                className="bg-[#EDBA1A] text-[#1B1A17] hover:bg-[#EDBA1A]/90"
              >
                {copiado ? (
                  <><Check className="mr-1.5 h-4 w-4" /> Copiado</>
                ) : (
                  <><Copy className="mr-1.5 h-4 w-4" /> Copiar texto</>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
