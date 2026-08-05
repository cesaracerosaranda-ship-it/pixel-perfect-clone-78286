alter table public.cotizaciones
  add column if not exists cobro_pendiente boolean not null default false;

comment on column public.cotizaciones.cobro_pendiente is
  'Solo TRUE cuando la venta quedó con saldo real (crédito o anticipo). El caso normal es FALSE: se cobra antes de cerrar.';

create index if not exists cotizaciones_cobro_pendiente_ix
  on public.cotizaciones (cobro_pendiente)
  where cobro_pendiente = true;