import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { MessageCircle, Calculator, Clock, AlertTriangle, Bell, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { formatMoney } from "@/lib/vialux/constants";
import { normalizarTelefono } from "@/lib/vialux/telefono";
import {
  contactosRecientes, ultimoContactoPorCliente, recordatoriosVigentes,
  marcarCumplida, diasDesde as diasDesdeISO, type Contacto,
} from "@/lib/vialux/contactos";
import type { Tables } from "@/integrations/supabase/types";
import { RailSection, PageTitle } from "@/components/RailSection";
import { BandaCargando, BandaError, textoError } from "@/components/EstadoConsulta";

export const Route = createFileRoute("/_authenticated/inicio")({
  component: InicioPage,
});

type Cot = Tables<"cotizaciones">;
type Pago = { cotizacion_id: string; monto: number };

/**
 * Umbrales de las colas de seguimiento. Se dejan explícitos y juntos porque son
 * decisiones de negocio, no constantes técnicas: si la operación cambia, se
 * ajustan aquí y todo el panel se recalcula.
 */
const DIAS_SIN_RESPUESTA = 2;   // cotizado/enviado sin movimiento = cabo suelto
const DIAS_VIGENCIA = 7;        // la vigencia declarada en el PDF
const DIAS_COBRO_VENCIDO = 30;  // saldo que ya pasó de "reciente" a "hay que perseguir"
const DIAS_RECOMPRA = 60;       // cliente que compró y no ha vuelto
// Si ya hablaste con alguien hace poco, no tiene caso que el panel te empuje a
// perseguirlo otra vez: el contacto reciente silencia sus colas.
const DIAS_SILENCIO = 2;

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

// ─── Fila de acción ──────────────────────────────────────────────────────────

function FilaAccion({
  titulo, subtitulo, monto, meta, urgente, acciones,
}: {
  titulo: string;
  subtitulo?: string | null;
  monto: number;
  meta: string;
  urgente?: boolean;
  acciones: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 px-5 py-3.5 transition-colors hover:bg-[#EDBA1A]/[0.04]">
      <div className="min-w-[200px] flex-1">
        <div className="text-[13px] font-bold uppercase">{titulo}</div>
        {subtitulo && (
          <div className="truncate text-[12px] text-muted-foreground">{subtitulo}</div>
        )}
      </div>
      <div className="w-28 text-right font-mono text-[13px] font-bold tabular-nums">
        {formatMoney(monto)}
      </div>
      <div
        className={`w-32 text-right font-mono text-[11px] tracking-[0.08em] ${
          urgente ? "font-bold text-[#DC2626]" : "text-[#57524A]"
        }`}
      >
        {meta}
      </div>
      <div className="flex shrink-0 gap-1">{acciones}</div>
    </div>
  );
}

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

function Cola({
  num, label, titulo, descripcion, filas, vacio,
}: {
  num: string;
  label: string;
  titulo: string;
  descripcion: string;
  filas: React.ReactNode[];
  vacio: string;
}) {
  return (
    <RailSection
      num={num}
      label={label}
      titulo={titulo}
      descripcion={descripcion}
      padded={false}
      meta={
        <span className="font-mono text-[11px] tracking-[0.08em] text-[#57524A]">
          {filas.length} {filas.length === 1 ? "PENDIENTE" : "PENDIENTES"}
        </span>
      }
    >
      {filas.length === 0 ? (
        <p className="px-5 py-8 text-center font-mono text-[11px] uppercase tracking-[0.14em] text-[#767066]">
          {vacio}
        </p>
      ) : (
        <div className="divide-y divide-[#EFEDE8]">{filas}</div>
      )}
    </RailSection>
  );
}

// ─── Página ──────────────────────────────────────────────────────────────────

function InicioPage() {
  const qc = useQueryClient();
  const navigate = useNavigate();

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

  const pagosQuery = useQuery({
    queryKey: ["pagos"],
    queryFn: async () => {
      const { data, error } = await (
        supabase as unknown as {
          from: (t: string) => {
            select: (c: string) => { limit: (n: number) => PromiseLike<{ data: Pago[] | null; error: unknown }> };
          };
        }
      ).from("pagos").select("cotizacion_id,monto").limit(5000);
      if (error) return [] as Pago[];
      return data ?? [];
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

  const cots = cotsQuery.data ?? [];

  const pagadoPor = useMemo(() => {
    const m = new Map<string, number>();
    for (const p of pagosQuery.data ?? []) {
      m.set(p.cotizacion_id, (m.get(p.cotizacion_id) ?? 0) + Number(p.monto));
    }
    return m;
  }, [pagosQuery.data]);

  const contactos = contactosQuery.data ?? [];
  const ultimoContacto = useMemo(() => ultimoContactoPorCliente(contactos), [contactos]);
  const recordatorios = useMemo(() => recordatoriosVigentes(contactos), [contactos]);

  /** true si ya se habló con ese cliente hace menos de DIAS_SILENCIO. */
  const habloReciente = (clienteId: string | null) => {
    if (!clienteId) return false;
    const c = ultimoContacto.get(clienteId);
    return !!c && diasDesdeISO(c.fecha) < DIAS_SILENCIO;
  };

  const colas = useMemo(() => {
    const enProceso = cots.filter((c) => c.estado === "cotizado" || c.estado === "enviado");

    // 00 · Sin respuesta: lo que lleva días quieto. Se ordena por MONTO, no por
    // antigüedad: perseguir primero lo que más pesa en la venta.
    const sinRespuesta = enProceso
      .filter(
        (c) =>
          dias(c.updated_at) >= DIAS_SIN_RESPUESTA &&
          dias(c.fecha) <= DIAS_VIGENCIA &&
          !habloReciente(c.cliente_id),
      )
      .sort((a, b) => Number(b.total) - Number(a.total));

    // 01 · Vigencia: pasada la vigencia, el precio ya no es válido. O se recotiza
    // o se cierra como perdida — dejarlas abiertas ensucia el embudo.
    const vencidas = enProceso
      .filter((c) => dias(c.fecha) > DIAS_VIGENCIA)
      .sort((a, b) => dias(b.fecha) - dias(a.fecha));

    // 02 · Por cobrar vencido
    const porCobrar = cots
      .filter((c) => c.estado === "cerrado")
      .map((c) => ({ c, saldo: Number(c.total) - (pagadoPor.get(c.id) ?? 0), d: dias(c.fecha) }))
      .filter((x) => x.saldo > 0.01 && x.d >= DIAS_COBRO_VENCIDO)
      .sort((a, b) => b.d - a.d);

    // 03 · Recompra: último cierre del cliente hace más de DIAS_RECOMPRA y sin
    // ninguna cotización posterior. Es el cliente recurrente que "ya le toca".
    const ultimoCierre = new Map<string, Cot>();
    const ultimoMovimiento = new Map<string, number>();
    for (const c of cots) {
      const k = (c.cliente_id ?? c.cliente_nombre).toLowerCase();
      const d = dias(c.fecha);
      if (!ultimoMovimiento.has(k) || d < ultimoMovimiento.get(k)!) ultimoMovimiento.set(k, d);
      if (c.estado === "cerrado") {
        const prev = ultimoCierre.get(k);
        if (!prev || dias(prev.fecha) > d) ultimoCierre.set(k, c);
      }
    }
    const recompra = [...ultimoCierre.entries()]
      .filter(([k, c]) => dias(c.fecha) >= DIAS_RECOMPRA && (ultimoMovimiento.get(k) ?? 0) >= DIAS_RECOMPRA)
      .map(([, c]) => c)
      .sort((a, b) => Number(b.total) - Number(a.total))
      .slice(0, 12);

    return { sinRespuesta, vencidas, porCobrar, recompra };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cots, pagadoPor, ultimoContacto]);

  const totalPendientes =
    recordatorios.length + colas.sinRespuesta.length + colas.vencidas.length +
    colas.porCobrar.length + colas.recompra.length;
  const dineroEnJuego =
    colas.sinRespuesta.reduce((s, c) => s + Number(c.total), 0) +
    colas.vencidas.reduce((s, c) => s + Number(c.total), 0);

  const irACotizar = (c: Cot) =>
    navigate({ to: "/", search: { duplicate: c.id, clienteId: undefined } });

  return (
    <div className="mx-auto w-full max-w-6xl px-6 py-8">
      <PageTitle
        kicker="MÓDULO · SEGUIMIENTO"
        title="Inicio"
        right={
          <div className="text-right">
            <div className="font-mono text-[11px] uppercase tracking-[0.2em] text-[#57524A]">
              Acciones pendientes
            </div>
            <div
              className={`font-mono text-xl font-extrabold tabular-nums ${
                totalPendientes === 0 ? "text-[#12843C]" : "text-[#8A6508]"
              }`}
            >
              {totalPendientes}
            </div>
          </div>
        }
      />

      {cotsQuery.isLoading && <BandaCargando mensaje="Cargando tus pendientes…" />}
      {cotsQuery.isError && (
        <BandaError
          mensaje={textoError(cotsQuery.error)}
          onReintentar={() => void cotsQuery.refetch()}
        />
      )}

      {/* Resumen: el dinero que está esperando una acción tuya */}
      <div className="mb-4 grid grid-cols-2 gap-px border border-border bg-border md:grid-cols-5">
        {[
          { l: "En juego", v: formatMoney(dineroEnJuego), s: "SIN RESPUESTA + VENCIDAS", c: "text-[#8A6508]" },
          { l: "Recordatorios", v: String(recordatorios.length), s: "COMPROMISOS QUE TOCAN", c: recordatorios.length ? "text-[#8A6508]" : "" },
          { l: "Sin respuesta", v: String(colas.sinRespuesta.length), s: `${DIAS_SIN_RESPUESTA}+ DÍAS QUIETAS`, c: "" },
          { l: "Vigencia vencida", v: String(colas.vencidas.length), s: "PRECIO YA NO VÁLIDO", c: colas.vencidas.length ? "text-[#DC2626]" : "" },
          { l: "Cobro vencido", v: String(colas.porCobrar.length), s: `${DIAS_COBRO_VENCIDO}+ DÍAS`, c: colas.porCobrar.length ? "text-[#DC2626]" : "" },
        ].map((k) => (
          <div key={k.l} className="bg-card p-4">
            <div className="mb-1.5 font-mono text-[10px] uppercase tracking-[0.2em] text-[#8A6508]">
              {k.l}
            </div>
            <div className={`font-mono text-[22px] font-extrabold leading-none tabular-nums ${k.c}`}>
              {k.v}
            </div>
            <div className="mt-0.5 font-mono text-[10px] tracking-[0.08em] text-[#6B665C]">{k.s}</div>
          </div>
        ))}
      </div>

      <div className="border border-border bg-card">
        <Cola
          num="00"
          label="COMPROMISOS"
          titulo="Recordatorios"
          descripcion="Lo que tú mismo te apuntaste al registrar un contacto. A diferencia del resto, esto no lo dedujo el sistema — lo prometiste."
          vacio="Sin compromisos para hoy"
          filas={recordatorios.map((r) => {
            const cot = cots.find((c) => c.id === r.cotizacion_id) ?? null;
            const cli = cots.find((c) => c.cliente_id === r.cliente_id);
            const nombre = cli?.cliente_nombre ?? "Cliente";
            const atraso = Math.max(0, Math.floor(
              (Date.now() - new Date(`${r.proxima_fecha}T12:00:00`).getTime()) / 86_400_000));
            const wa = urlWhatsApp(cli?.cliente_telefono ?? null, `Hola, le escribo de VIALUX para dar seguimiento.`);
            return (
              <FilaAccion
                key={r.id}
                titulo={nombre}
                subtitulo={r.proxima_accion}
                monto={cot ? Number(cot.total) : 0}
                meta={atraso === 0 ? "HOY" : `ATRASADO ${atraso}D`}
                urgente={atraso > 0}
                acciones={
                  <>
                    {wa && (
                      <BotonAccion href={wa} etiqueta={`Escribir por WhatsApp a ${nombre}`}>
                        <MessageCircle className="h-3.5 w-3.5" aria-hidden="true" /> WhatsApp
                      </BotonAccion>
                    )}
                    <BotonAccion
                      etiqueta="Marcar el compromiso como cumplido"
                      onClick={async () => {
                        const e = await marcarCumplida(r.id);
                        if (e) return;
                        void qc.invalidateQueries({ queryKey: ["contactos"] });
                      }}
                    >
                      <Check className="h-3.5 w-3.5" aria-hidden="true" /> Hecha
                    </BotonAccion>
                  </>
                }
              />
            );
          })}
        />

        <Cola
          num="01"
          label="SEGUIMIENTO"
          titulo="Sin respuesta"
          descripcion={`Cotizaciones que llevan ${DIAS_SIN_RESPUESTA} días o más sin movimiento y siguen dentro de vigencia. Ordenadas por monto: primero lo que más pesa.`}
          vacio="Nada pendiente de seguimiento"
          filas={colas.sinRespuesta.map((c) => {
            const d = dias(c.updated_at);
            const wa = urlWhatsApp(
              c.cliente_telefono,
              `Hola, ${" "}retomo la cotización ${c.folio} de VIALUX por ${c.cantidad} boyas. ¿Sigue en pie el requerimiento o le ayudo con algún ajuste?`,
            );
            return (
              <FilaAccion
                key={c.id}
                titulo={c.cliente_nombre}
                subtitulo={`${c.folio} · ${c.cantidad} PZS${c.cliente_empresa && c.cliente_empresa !== "-" ? ` · ${c.cliente_empresa}` : ""}`}
                monto={Number(c.total)}
                meta={`${d}D SIN MOVER`}
                urgente={d >= 5}
                acciones={
                  <>
                    {wa && (
                      <BotonAccion href={wa} etiqueta={`Escribir por WhatsApp a ${c.cliente_nombre}`}>
                        <MessageCircle className="h-3.5 w-3.5" aria-hidden="true" /> WhatsApp
                      </BotonAccion>
                    )}
                    <BotonAccion onClick={() => irACotizar(c)} etiqueta={`Recotizar ${c.folio}`}>
                      <Calculator className="h-3.5 w-3.5" aria-hidden="true" /> Recotizar
                    </BotonAccion>
                  </>
                }
              />
            );
          })}
        />

        <Cola
          num="02"
          label="VIGENCIA"
          titulo="Vigencia vencida"
          descripcion={`Pasaron más de ${DIAS_VIGENCIA} días: el precio que cotizaste ya no es válido. Recotiza o ciérrala como perdida — dejarlas abiertas ensucia el embudo.`}
          vacio="Ninguna cotización vencida"
          filas={colas.vencidas.map((c) => {
            const d = dias(c.fecha);
            const wa = urlWhatsApp(
              c.cliente_telefono,
              `Hola, la cotización ${c.folio} de VIALUX ya venció. Si sigue interesado le preparo una actualizada con el precio vigente.`,
            );
            return (
              <FilaAccion
                key={c.id}
                titulo={c.cliente_nombre}
                subtitulo={`${c.folio} · ${c.cantidad} PZS`}
                monto={Number(c.total)}
                meta={`VENCIDA HACE ${d - DIAS_VIGENCIA}D`}
                urgente
                acciones={
                  <>
                    {wa && (
                      <BotonAccion href={wa} etiqueta={`Escribir por WhatsApp a ${c.cliente_nombre}`}>
                        <MessageCircle className="h-3.5 w-3.5" aria-hidden="true" /> WhatsApp
                      </BotonAccion>
                    )}
                    <BotonAccion onClick={() => irACotizar(c)} etiqueta={`Recotizar ${c.folio}`}>
                      <Calculator className="h-3.5 w-3.5" aria-hidden="true" /> Recotizar
                    </BotonAccion>
                  </>
                }
              />
            );
          })}
        />

        <Cola
          num="03"
          label="COBRANZA"
          titulo="Cobro vencido"
          descripcion={`Ventas cerradas con saldo desde hace ${DIAS_COBRO_VENCIDO} días o más. El detalle completo y el registro de pagos están en Cobranza.`}
          vacio="Sin saldos vencidos"
          filas={colas.porCobrar.map(({ c, saldo, d }) => {
            const wa = urlWhatsApp(
              c.cliente_telefono,
              `Hola, le escribo de VIALUX para dar seguimiento al saldo de la orden ${c.folio}. ¿Me confirma la fecha estimada de pago?`,
            );
            return (
              <FilaAccion
                key={c.id}
                titulo={c.cliente_nombre}
                subtitulo={`${c.folio} · SALDO DE ${formatMoney(Number(c.total))}`}
                monto={saldo}
                meta={`${d}D DE ANTIGÜEDAD`}
                urgente
                acciones={
                  <>
                    {wa && (
                      <BotonAccion href={wa} etiqueta={`Escribir por WhatsApp a ${c.cliente_nombre}`}>
                        <MessageCircle className="h-3.5 w-3.5" aria-hidden="true" /> WhatsApp
                      </BotonAccion>
                    )}
                    <BotonAccion
                      onClick={() => navigate({ to: "/cobranza" })}
                      etiqueta="Ir a Cobranza"
                    >
                      Cobranza
                    </BotonAccion>
                  </>
                }
              />
            );
          })}
        />

        <Cola
          num="04"
          label="RECOMPRA"
          titulo="Ya les toca"
          descripcion={`Clientes que compraron hace ${DIAS_RECOMPRA} días o más y no han vuelto a pedir. Son los más baratos de reactivar: ya te conocen y ya te compraron.`}
          vacio="Sin clientes por reactivar"
          filas={colas.recompra.map((c) => {
            const d = dias(c.fecha);
            const wa = urlWhatsApp(
              c.cliente_telefono,
              `Hola, le saluda VIALUX. Vi que su último pedido de boyas fue hace un tiempo — ¿le preparo una cotización con precios actualizados?`,
            );
            return (
              <FilaAccion
                key={c.id}
                titulo={c.cliente_nombre}
                subtitulo={`ÚLTIMA COMPRA: ${c.folio} · ${c.cantidad} PZS`}
                monto={Number(c.total)}
                meta={`HACE ${d}D`}
                acciones={
                  <>
                    {wa && (
                      <BotonAccion href={wa} etiqueta={`Escribir por WhatsApp a ${c.cliente_nombre}`}>
                        <MessageCircle className="h-3.5 w-3.5" aria-hidden="true" /> WhatsApp
                      </BotonAccion>
                    )}
                    <BotonAccion onClick={() => irACotizar(c)} etiqueta={`Cotizar de nuevo a ${c.cliente_nombre}`}>
                      <Calculator className="h-3.5 w-3.5" aria-hidden="true" /> Cotizar
                    </BotonAccion>
                  </>
                }
              />
            );
          })}
        />

        {/* Cierre: qué significa que no haya nada */}
        {totalPendientes === 0 && !cotsQuery.isLoading && (
          <div className="border-t border-border px-5 py-10 text-center">
            <Clock className="mx-auto mb-2 h-6 w-6 text-[#948D80]" aria-hidden="true" />
            <p className="text-[13px] font-semibold">Ningún cabo suelto</p>
            <p className="mt-1 text-[12px] text-muted-foreground">
              Todas las cotizaciones tienen movimiento reciente y no hay saldos vencidos.
            </p>
          </div>
        )}
      </div>

      <p className="mt-3 flex items-start gap-2 font-mono text-[11px] uppercase leading-relaxed tracking-[0.1em] text-[#57524A]">
        <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
        Registrar un contacto silencia a ese cliente por {DIAS_SILENCIO} días · Los días se
        cuentan desde el último cambio de la cotización · Los mensajes de WhatsApp
        se abren precargados pero NO se envían solos
      </p>
    </div>
  );
}
