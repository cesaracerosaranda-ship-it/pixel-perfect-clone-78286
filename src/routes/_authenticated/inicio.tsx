import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { MessageCircle, Calculator, XCircle, NotebookPen } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { formatMoney } from "@/lib/vialux/constants";
import { normalizarTelefono } from "@/lib/vialux/telefono";
import {
  contactosRecientes, ultimoContactoPorCliente, recordatoriosVigentes,
  diasDesde as diasDesdeISO, type Contacto,
} from "@/lib/vialux/contactos";
import { nombreParaMostrar } from "@/lib/vialux/clientes";
import { idsSustituidas } from "@/lib/vialux/reenviar";
import type { Tables } from "@/integrations/supabase/types";
import { RailSection, PageTitle } from "@/components/RailSection";
import { TelefonoCliente } from "@/components/TelefonoCliente";
import { MotivoPerdidaModal } from "@/components/MotivoPerdidaModal";
import { BandaCargando, BandaError, textoError } from "@/components/EstadoConsulta";
import { BotonSeguimiento, TiraSeguimiento } from "@/components/AccionSeguimiento";
import { BitacoraCliente } from "@/components/BitacoraCliente";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export const Route = createFileRoute("/_authenticated/inicio")({
  component: InicioPage,
});

type Cot = Tables<"cotizaciones">;

/**
 * Umbrales de la lista del día. Explícitos y juntos porque son decisiones de
 * negocio, no constantes técnicas: si la operación cambia, se ajustan aquí.
 */
const DIAS_SIN_RESPUESTA = 2;  // cotización viva sin tocarse = cabo suelto
const DIAS_VIGENCIA = 7;       // la vigencia declarada en el PDF
const DIAS_EN_RIESGO = 3;      // vence dentro de esto = urge cerrarla
const DIAS_RECOMPRA = 60;      // cliente que compró y no ha vuelto
const DIAS_SILENCIO = 2;       // ya le hablaste: no ocupa lugar en la lista
/**
 * La lista se corta en 10. No es un límite técnico: es cuántos contactos reales
 * caben en una mañana. Una lista de treinta no se ataca, se ignora.
 */
const TOP_HOY = 10;

function dias(iso: string | null | undefined): number {
  if (!iso) return 0;
  return Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000));
}

/** Abre WhatsApp con el cliente. Sin teléfono no se ofrece el botón. */
function urlWhatsApp(tel: string | null, texto: string): string | null {
  const n = normalizarTelefono(tel);
  if (!n) return null;
  return `https://wa.me/52${n}?text=${encodeURIComponent(texto)}`;
}

type Razon = "compromiso" | "sin_respuesta" | "vencida" | "recompra";

type Item = {
  key: string;
  claveCliente: string;
  razon: Razon;
  etiqueta: string;
  urgente: boolean;
  cot: Cot | null;
  recordatorioId: string | null;
  clienteId: string | null;
  nombre: string;
  empresa: string | null;
  telefono: string | null;
  monto: number;
  subtitulo: string | null;
  mensajeWa: string;
};

// ─── Piezas de UI ────────────────────────────────────────────────────────────

function BotonAccion({
  children, onClick, href, etiqueta,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  href?: string;
  etiqueta: string;
}) {
  const clases =
    "flex items-center gap-1.5 border border-border px-2.5 py-1.5 font-mono text-[11px] uppercase tracking-[0.1em] text-[#57524A] transition-colors hover:border-[#8A6508] hover:bg-[#F1EFEA] hover:text-[#2E2B27] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[#8A6508]";
  if (href) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" aria-label={etiqueta} className={clases}>
        {children}
      </a>
    );
  }
  return (
    <button type="button" onClick={onClick} aria-label={etiqueta} className={clases}>
      {children}
    </button>
  );
}

function Kpi({ label, valor, pie, color }: {
  label: string; valor: string; pie: string; color?: string;
}) {
  return (
    <div className="bg-card p-4">
      <div className="mb-1.5 font-mono text-[10px] uppercase tracking-[0.2em] text-[#8A6508]">
        {label}
      </div>
      <div className={`font-mono text-[22px] font-extrabold leading-none tabular-nums ${color ?? ""}`}>
        {valor}
      </div>
      <div className="mt-0.5 font-mono text-[10px] tracking-[0.08em] text-[#6B665C]">{pie}</div>
    </div>
  );
}

// ─── Página ──────────────────────────────────────────────────────────────────

function InicioPage() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [perdidaRow, setPerdidaRow] = useState<Cot | null>(null);
  const [bitacoraDe, setBitacoraDe] = useState<{ id: string; nombre: string } | null>(null);
  /** Filas que acaban de registrar seguimiento: key de la fila → id del contacto. */
  const [registrados, setRegistrados] = useState<Record<string, string>>({});

  const cotsQuery = useQuery({
    queryKey: ["cotizaciones"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cotizaciones")
        .select("*")
        .order("fecha", { ascending: false })
        .limit(2000);
      if (error) throw error;
      return (data ?? []) as Cot[];
    },
  });

  const contactosQuery = useQuery({
    queryKey: ["contactos"],
    queryFn: () => contactosRecientes(),
  });

  useEffect(() => {
    const ch = supabase
      .channel("inicio")
      .on("postgres_changes", { event: "*", schema: "public", table: "cotizaciones" },
        () => qc.invalidateQueries({ queryKey: ["cotizaciones"] }))
      .subscribe();
    return () => { void supabase.removeChannel(ch); };
  }, [qc]);

  const cots = useMemo(() => cotsQuery.data ?? [], [cotsQuery.data]);
  const contactos = useMemo<Contacto[]>(() => contactosQuery.data ?? [], [contactosQuery.data]);
  const ultimoContacto = useMemo(() => ultimoContactoPorCliente(contactos), [contactos]);

  // ─── Las tres cifras ──────────────────────────────────────────────────────
  const kpis = useMemo(() => {
    const reemplazadas = idsSustituidas(cots);
    const vivas = cots.filter(
      (c) =>
        (c.estado === "cotizado" || c.estado === "enviado") &&
        !reemplazadas.has(c.id) &&
        dias(c.fecha) <= DIAS_VIGENCIA,
    );
    const pipeline = vivas.reduce((s, c) => s + Number(c.total), 0);
    // Vence dentro de DIAS_EN_RIESGO: la cifra que dice si hoy fue un buen día
    // o solo un día ocupado.
    const enRiesgo = vivas
      .filter((c) => DIAS_VIGENCIA - dias(c.fecha) <= DIAS_EN_RIESGO)
      .reduce((s, c) => s + Number(c.total), 0);

    const hoy = new Date();
    const mes = hoy.getMonth();
    const anio = hoy.getFullYear();
    const cerradoMes = cots
      .filter((c) => {
        if (c.estado !== "cerrado") return false;
        const f = new Date(c.fecha);
        return f.getMonth() === mes && f.getFullYear() === anio;
      })
      .reduce((s, c) => s + Number(c.total), 0);

    return { pipeline, enRiesgo, cerradoMes };
  }, [cots]);

  // ─── La lista del día ─────────────────────────────────────────────────────
  const lista = useMemo(() => {
    /**
     * Con qué identidad se deduplica la fila. Sin `nombreParaMostrar`, dos
     * cotizaciones distintas a "A QUIEN CORRESPONDA" de empresas distintas
     * contarían como el mismo cliente y una le quitaría el lugar a la otra.
     */
    const claveDe = (c: { cliente_id: string | null; cliente_nombre: string; cliente_empresa: string }) =>
      (c.cliente_id ??
        nombreParaMostrar({ nombre: c.cliente_nombre, empresa: c.cliente_empresa })
      ).toLowerCase();

    /** Ya le hablaste hace poco: no ocupa uno de los diez lugares. */
    const habloReciente = (clienteId: string | null) => {
      if (!clienteId) return false;
      const c = ultimoContacto.get(clienteId);
      return !!c && diasDesdeISO(c.fecha) < DIAS_SILENCIO;
    };

    /**
     * El último toque de una cotización es lo más reciente entre haberla movido
     * y haber hablado con el cliente. Registrar un contacto reinicia el
     * contador SIN escribir `updated_at`, que significa otra cosa.
     */
    const diasSinTocar = (c: Cot) => {
      const porCotizacion = dias(c.updated_at);
      const contacto = c.cliente_id ? ultimoContacto.get(c.cliente_id) : undefined;
      if (!contacto) return porCotizacion;
      return Math.min(porCotizacion, diasDesdeISO(contacto.fecha));
    };

    // Una cotización con revisión más nueva ya no es un pendiente: el
    // seguimiento vive en la R+1. Sin este filtro, ambas pedirían acción.
    const reemplazadas = idsSustituidas(cots);
    const enProceso = cots.filter(
      (c) => (c.estado === "cotizado" || c.estado === "enviado") && !reemplazadas.has(c.id),
    );
    const porId = new Map(cots.map((c) => [c.id, c]));

    // ── Tramo 1 · Compromisos. Van primero SIEMPRE: no lo dedujo el sistema,
    // se lo prometiste al cliente. No se silencian por contacto reciente.
    const compromisos: Item[] = recordatoriosVigentes(contactos).flatMap((r) => {
      const cot =
        (r.cotizacion_id ? porId.get(r.cotizacion_id) : undefined) ??
        cots.find((c) => c.cliente_id === r.cliente_id);
      if (!cot) return [];
      const atraso = Math.max(0, Math.floor(
        (Date.now() - new Date(`${r.proxima_fecha}T12:00:00`).getTime()) / 86_400_000));
      return [{
        key: `compromiso-${r.id}`,
        claveCliente: claveDe(cot),
        razon: "compromiso" as Razon,
        etiqueta: atraso === 0 ? "PROMETISTE HABLARLE HOY" : `PROMETIDO HACE ${atraso}D`,
        urgente: atraso > 0,
        cot,
        recordatorioId: r.id,
        clienteId: r.cliente_id,
        nombre: nombreParaMostrar({ nombre: cot.cliente_nombre, empresa: cot.cliente_empresa }),
        empresa: cot.cliente_empresa,
        telefono: cot.cliente_telefono,
        monto: Number(cot.total),
        subtitulo: r.proxima_accion ?? `${cot.folio} · ${cot.cantidad} PZS`,
        mensajeWa: `Hola, le escribo de VIALUX para dar seguimiento a la cotización ${cot.folio}.`,
      }];
    });

    // ── Tramo 2 · Sin respuesta. Lo más caliente: ya pidieron precio. Se
    // ordenan por monto ponderado según qué tan viva sigue la cotización.
    const calor = (c: Cot) =>
      Number(c.total) * (1 - Math.min(dias(c.fecha) / DIAS_VIGENCIA, 1) * 0.5);
    const sinRespuesta: Item[] = enProceso
      .filter((c) =>
        diasSinTocar(c) >= DIAS_SIN_RESPUESTA &&
        dias(c.fecha) <= DIAS_VIGENCIA &&
        !habloReciente(c.cliente_id))
      .sort((a, b) => calor(b) - calor(a))
      .map((c) => ({
        key: `sinresp-${c.id}`,
        claveCliente: claveDe(c),
        razon: "sin_respuesta" as Razon,
        etiqueta: `NO CONTESTÓ · ${diasSinTocar(c)}D`,
        urgente: diasSinTocar(c) >= 5,
        cot: c,
        recordatorioId: null,
        clienteId: c.cliente_id,
        nombre: nombreParaMostrar({ nombre: c.cliente_nombre, empresa: c.cliente_empresa }),
        empresa: c.cliente_empresa,
        telefono: c.cliente_telefono,
        monto: Number(c.total),
        subtitulo: `${c.folio} · ${c.cantidad} PZS`,
        mensajeWa: `Hola, retomo la cotización ${c.folio} de VIALUX por ${c.cantidad} boyas. ¿Sigue en pie el requerimiento o le ayudo con algún ajuste?`,
      }));

    // ── Tramo 3 · Vencidas. Recientes primero: la que caducó ayer sigue tibia
    // y se recupera con una llamada; la de hace dos meses es arqueología.
    const vencidas: Item[] = enProceso
      .filter((c) => dias(c.fecha) > DIAS_VIGENCIA && !habloReciente(c.cliente_id))
      .sort((a, b) => dias(a.fecha) - dias(b.fecha))
      .map((c) => {
        const v = dias(c.fecha) - DIAS_VIGENCIA;
        return {
          key: `vencida-${c.id}`,
          claveCliente: claveDe(c),
          razon: "vencida" as Razon,
          etiqueta: v === 0 ? "VENCIÓ HOY · RECOTIZAR" : `VENCIÓ HACE ${v}D · RECOTIZAR`,
          urgente: v <= 2,
          cot: c,
          recordatorioId: null,
          clienteId: c.cliente_id,
          nombre: nombreParaMostrar({ nombre: c.cliente_nombre, empresa: c.cliente_empresa }),
          empresa: c.cliente_empresa,
          telefono: c.cliente_telefono,
          monto: Number(c.total),
          subtitulo: `${c.folio} · ${c.cantidad} PZS`,
          mensajeWa: `Hola, le escribo de VIALUX. La cotización ${c.folio} ya venció; con gusto le actualizo el precio. ¿Sigue en pie el proyecto?`,
        };
      });

    // ── Tramo 4 · Recompra. La cartera es lo más barato de reactivar: ya te
    // conocen y ya te compraron.
    const ultimoCierre = new Map<string, Cot>();
    const ultimoMovimiento = new Map<string, number>();
    for (const c of cots) {
      const k = claveDe(c);
      const d = dias(c.fecha);
      if (!ultimoMovimiento.has(k) || d < ultimoMovimiento.get(k)!) ultimoMovimiento.set(k, d);
      if (c.estado === "cerrado") {
        const prev = ultimoCierre.get(k);
        if (!prev || dias(prev.fecha) > d) ultimoCierre.set(k, c);
      }
    }
    const recompra: Item[] = [...ultimoCierre.entries()]
      .filter(([k, c]) =>
        dias(c.fecha) >= DIAS_RECOMPRA &&
        (ultimoMovimiento.get(k) ?? 0) >= DIAS_RECOMPRA &&
        !habloReciente(c.cliente_id))
      .map(([, c]) => c)
      .sort((a, b) => Number(b.total) - Number(a.total))
      .map((c) => {
        const meses = Math.floor(dias(c.fecha) / 30);
        return {
          key: `recompra-${c.id}`,
          claveCliente: claveDe(c),
          razon: "recompra" as Razon,
          etiqueta: `COMPRÓ HACE ${meses} ${meses === 1 ? "MES" : "MESES"}`,
          urgente: false,
          cot: c,
          recordatorioId: null,
          clienteId: c.cliente_id,
          nombre: nombreParaMostrar({ nombre: c.cliente_nombre, empresa: c.cliente_empresa }),
          empresa: c.cliente_empresa,
          telefono: c.cliente_telefono,
          monto: Number(c.total),
          subtitulo: `ÚLTIMA COMPRA · ${c.cantidad} PZS`,
          mensajeWa: `Hola, le escribo de VIALUX. ¿Cómo le funcionaron las boyas? Con gusto le preparo una nueva cotización cuando lo necesite.`,
        };
      });

    // El orden de los tramos ES la prioridad. Y se deduplica por cliente: en
    // una lista de diez lugares, nadie aparece dos veces.
    const vistos = new Set<string>();
    const out: Item[] = [];
    for (const it of [...compromisos, ...sinRespuesta, ...vencidas, ...recompra]) {
      if (vistos.has(it.claveCliente)) continue;
      vistos.add(it.claveCliente);
      out.push(it);
      if (out.length >= TOP_HOY) break;
    }
    return out;
  }, [cots, contactos, ultimoContacto]);

  /**
   * Mientras haya una tira abierta, la lista se congela.
   *
   * Sin esto, cambiar de pestaña en el navegador dispara el refetch por foco de
   * react-query; el contacto recién registrado ya silencia esa fila, la fila
   * desaparece y se lleva el comentario a medio escribir. Pasó en producción el
   * primer día. La lista vuelve a moverse cuando se cierra la última tira.
   */
  const [congelada, setCongelada] = useState<Item[] | null>(null);
  const filas = congelada ?? lista;

  const irACotizar = (c: Cot) =>
    navigate({ to: "/", search: { duplicate: c.id, clienteId: undefined } });

  const aplicarPerdida = (c: Cot) => setPerdidaRow(c);

  const abrirSeguimiento = (key: string, contactoId: string) => {
    setCongelada((c) => c ?? lista);
    setRegistrados((r) => ({ ...r, [key]: contactoId }));
  };

  /** El seguimiento ya quedó: se refresca y la fila cae sola. */
  const cerrarSeguimiento = (key: string) => {
    const resto = { ...registrados };
    delete resto[key];
    setRegistrados(resto);
    if (Object.keys(resto).length === 0) setCongelada(null);
    void qc.invalidateQueries({ queryKey: ["contactos"] });
  };

  const ultimoToqueTexto = (clienteId: string | null): string => {
    if (!clienteId) return "SIN CONTACTO";
    const c = ultimoContacto.get(clienteId);
    if (!c) return "SIN CONTACTO";
    const d = diasDesdeISO(c.fecha);
    return d === 0 ? "LE ESCRIBISTE HOY" : `ÚLTIMO TOQUE ${d}D`;
  };

  return (
    <div className="mx-auto w-full max-w-6xl px-6 py-8">
      <PageTitle
        kicker="MÓDULO · SEGUIMIENTO"
        title="Inicio"
        right={
          <div className="text-right">
            <div className="font-mono text-[11px] uppercase tracking-[0.2em] text-[#57524A]">
              Para hoy
            </div>
            <div
              className={`font-mono text-xl font-extrabold tabular-nums ${
                lista.length === 0 ? "text-[#12843C]" : "text-[#8A6508]"
              }`}
            >
              {lista.length}
            </div>
          </div>
        }
      />

      {cotsQuery.isLoading && <BandaCargando mensaje="Armando tu lista de hoy…" />}
      {cotsQuery.isError && (
        <BandaError
          mensaje={textoError(cotsQuery.error)}
          onReintentar={() => void cotsQuery.refetch()}
        />
      )}

      <div className="mb-4 grid grid-cols-1 gap-px border border-border bg-border sm:grid-cols-3">
        <Kpi
          label="Pipeline vivo"
          valor={formatMoney(kpis.pipeline)}
          pie="COTIZACIONES DENTRO DE VIGENCIA"
        />
        <Kpi
          label="En riesgo esta semana"
          valor={formatMoney(kpis.enRiesgo)}
          pie={`VENCEN EN ${DIAS_EN_RIESGO} DÍAS O MENOS`}
          color={kpis.enRiesgo > 0 ? "text-[#DC2626]" : undefined}
        />
        <Kpi
          label="Cerrado este mes"
          valor={formatMoney(kpis.cerradoMes)}
          pie="VENTAS GANADAS"
          color={kpis.cerradoMes > 0 ? "text-[#12843C]" : undefined}
        />
      </div>

      <div className="border border-border bg-card">
        <RailSection
          num="01"
          label="HOY"
          titulo="A quién le hablas hoy"
          descripcion="En orden: primero lo que prometiste, luego lo más caliente, luego lo recuperable, y al final la cartera que ya te compró. Registrar un seguimiento reinicia el contador y libera el lugar."
          padded={false}
          meta={
            <span className="font-mono text-[11px] tracking-[0.08em] text-[#57524A]">
              {lista.length} DE {TOP_HOY}
            </span>
          }
        >
          {filas.length === 0 ? (
            <p className="px-5 py-10 text-center font-mono text-[11px] uppercase tracking-[0.14em] text-[#767066]">
              Nada pendiente. Todo tiene movimiento reciente.
            </p>
          ) : (
            <div className="divide-y divide-[#EFEDE8]">
              {filas.map((it) => {
                const wa = urlWhatsApp(it.telefono, it.mensajeWa);
                const contactoId = registrados[it.key];
                return (
                  <div key={it.key}>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 px-5 py-3.5 transition-colors hover:bg-[#EDBA1A]/[0.04]">
                      <div className="min-w-[200px] flex-1">
                        <div className="text-[13px] font-bold uppercase">{it.nombre}</div>
                        <div className="flex flex-wrap items-center gap-x-2.5 gap-y-0.5">
                          {it.subtitulo && (
                            <span className="truncate text-[12px] text-muted-foreground">
                              {it.subtitulo}
                            </span>
                          )}
                          <TelefonoCliente tel={it.telefono} icono className="text-[11px] text-[#57524A]" />
                          <span className="font-mono text-[10px] uppercase tracking-[0.1em] text-[#767066]">
                            {ultimoToqueTexto(it.clienteId)}
                          </span>
                        </div>
                      </div>

                      <div className="w-28 text-right font-mono text-[13px] font-bold tabular-nums">
                        {formatMoney(it.monto)}
                      </div>

                      <div
                        className={`w-48 text-right font-mono text-[11px] tracking-[0.08em] ${
                          it.urgente ? "font-bold text-[#DC2626]" : "text-[#57524A]"
                        }`}
                      >
                        {it.etiqueta}
                      </div>

                      <div className="flex shrink-0 flex-wrap gap-1">
                        {wa && (
                          <BotonAccion href={wa} etiqueta={`Escribir por WhatsApp a ${it.nombre}`}>
                            <MessageCircle className="h-3.5 w-3.5" aria-hidden="true" /> WhatsApp
                          </BotonAccion>
                        )}
                        {!contactoId && (
                          <BotonSeguimiento
                            nombre={it.nombre}
                            clienteId={it.clienteId}
                            empresa={it.empresa}
                            telefono={it.telefono}
                            cotizacionId={it.cot?.id ?? null}
                            recordatorioId={it.recordatorioId}
                            onRegistrado={(id) => abrirSeguimiento(it.key, id)}
                          />
                        )}
                        {it.cot && (
                          <BotonAccion
                            onClick={() => irACotizar(it.cot!)}
                            etiqueta={`Recotizar ${it.cot.folio}`}
                          >
                            <Calculator className="h-3.5 w-3.5" aria-hidden="true" /> Recotizar
                          </BotonAccion>
                        )}
                        {it.clienteId && (
                          <BotonAccion
                            onClick={() => setBitacoraDe({ id: it.clienteId!, nombre: it.nombre })}
                            etiqueta={`Ver bitácora de ${it.nombre}`}
                          >
                            <NotebookPen className="h-3.5 w-3.5" aria-hidden="true" /> Bitácora
                          </BotonAccion>
                        )}
                        {it.cot && it.razon !== "recompra" && (
                          <BotonAccion
                            onClick={() => aplicarPerdida(it.cot!)}
                            etiqueta={`Marcar ${it.cot.folio} como perdida`}
                          >
                            <XCircle className="h-3.5 w-3.5" aria-hidden="true" /> Perdida
                          </BotonAccion>
                        )}
                      </div>
                    </div>

                    {contactoId && (
                      <TiraSeguimiento
                        contactoId={contactoId}
                        onListo={() => cerrarSeguimiento(it.key)}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </RailSection>
      </div>

      <MotivoPerdidaModal
        row={perdidaRow}
        onOpenChange={(v) => { if (!v) setPerdidaRow(null); }}
        onConfirm={async (motivo) => {
          if (!perdidaRow) return;
          const { error } = await supabase
            .from("cotizaciones")
            .update({ estado: "perdido", motivo_perdida: motivo })
            .eq("id", perdidaRow.id);
          if (error) { toast.error(error.message); return; }
          setPerdidaRow(null);
          void qc.invalidateQueries({ queryKey: ["cotizaciones"] });
        }}
      />

      <Dialog open={!!bitacoraDe} onOpenChange={(v) => { if (!v) setBitacoraDe(null); }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="font-mono text-[13px] uppercase tracking-[0.14em]">
              Bitácora · {bitacoraDe?.nombre}
            </DialogTitle>
          </DialogHeader>
          {bitacoraDe && <BitacoraCliente clienteId={bitacoraDe.id} />}
        </DialogContent>
      </Dialog>
    </div>
  );
}
