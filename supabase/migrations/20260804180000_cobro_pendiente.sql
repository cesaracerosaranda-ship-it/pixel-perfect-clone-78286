-- Corrige un supuesto equivocado del módulo de Cobranza.
--
-- Se diseñó asumiendo que cerrar una venta y cobrarla son momentos distintos,
-- y que una venta cerrada sin pagos registrados es dinero por cobrar. En la
-- operación real de VIALUX el pago ocurre ANTES de cerrar: una venta cerrada
-- ya está cobrada. El resultado era una alarma falsa — todo el histórico
-- aparecía como deuda vencida.
--
-- Se invierte el default: una venta está saldada salvo que se marque lo
-- contrario. La bandera se activa a mano cuando de verdad se vendió a crédito
-- o quedó un anticipo pendiente, que es la excepción y no la regla.
alter table public.cotizaciones
  add column if not exists cobro_pendiente boolean not null default false;

comment on column public.cotizaciones.cobro_pendiente is
  'Solo TRUE cuando la venta quedó con saldo real (crédito o anticipo). El caso normal es FALSE: se cobra antes de cerrar.';

-- El histórico existente queda en FALSE por el default, que es justamente la
-- realidad: todo lo cerrado hasta hoy ya se pagó.

-- El estado derivado deja de significar "debe" y pasa a significar "cuánto de
-- lo registrado se ha cobrado", útil solo en las ventas marcadas.
create index if not exists cotizaciones_cobro_pendiente_ix
  on public.cotizaciones (cobro_pendiente)
  where cobro_pendiente = true;
