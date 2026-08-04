-- Cobranza: hoy "cerrado" no dice si YA TE PAGARON. En B2B con anticipos eso es
-- un agujero de dinero real — una venta cerrada y no cobrada se ve idéntica a
-- una cobrada.
--
-- Diseño: los pagos son la fuente de verdad (tabla de movimientos) y el estado
-- se DERIVA por trigger. Así no hay forma de que el estado y los pagos se
-- desincronicen por un olvido en la UI.

-- ── Estado de pago en la cotización (solo significativo si estado='cerrado') ──
alter table public.cotizaciones
  add column if not exists estado_pago text not null default 'pendiente';

do $$
begin
  alter table public.cotizaciones drop constraint if exists cotizaciones_estado_pago_check;
  alter table public.cotizaciones add constraint cotizaciones_estado_pago_check
    check (estado_pago in ('pendiente', 'anticipo', 'liquidada'));
end $$;

comment on column public.cotizaciones.estado_pago is
  'Derivado de la suma de pagos vs total. No editar a mano: lo mantiene el trigger.';

-- ── Movimientos de cobro ─────────────────────────────────────────────────────
create table if not exists public.pagos (
  id            uuid primary key default gen_random_uuid(),
  cotizacion_id uuid not null references public.cotizaciones(id) on delete cascade,
  monto         numeric(12,2) not null check (monto > 0),
  fecha         date not null default current_date,
  metodo        text not null default 'TRANSFERENCIA',
  nota          text,
  created_at    timestamptz not null default now()
);

create index if not exists pagos_cotizacion_ix on public.pagos (cotizacion_id);
create index if not exists pagos_fecha_ix on public.pagos (fecha desc);

alter table public.pagos enable row level security;

do $$
begin
  drop policy if exists "pagos_authenticated_all" on public.pagos;
  create policy "pagos_authenticated_all" on public.pagos
    for all to authenticated using (true) with check (true);
end $$;

-- ── El estado se deriva, nunca se captura ────────────────────────────────────
-- Tolerancia de 1 centavo: los redondeos de IVA no deben dejar una venta
-- eternamente "con saldo" por $0.004.
create or replace function public.recalcular_estado_pago()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_cot    uuid := coalesce(new.cotizacion_id, old.cotizacion_id);
  v_total  numeric(12,2);
  v_pagado numeric(12,2);
  v_estado text;
begin
  select total into v_total from public.cotizaciones where id = v_cot;
  if v_total is null then
    return coalesce(new, old);
  end if;

  select coalesce(sum(monto), 0) into v_pagado from public.pagos where cotizacion_id = v_cot;

  if v_pagado >= v_total - 0.01 then
    v_estado := 'liquidada';
  elsif v_pagado > 0 then
    v_estado := 'anticipo';
  else
    v_estado := 'pendiente';
  end if;

  update public.cotizaciones set estado_pago = v_estado where id = v_cot;
  return coalesce(new, old);
end;
$$;

drop trigger if exists pagos_recalcula_estado on public.pagos;
create trigger pagos_recalcula_estado
  after insert or update or delete on public.pagos
  for each row execute function public.recalcular_estado_pago();

-- Realtime, para que la vista de Cobranza se refresque sola.
do $$
begin
  alter publication supabase_realtime add table public.pagos;
exception when duplicate_object then null;
end $$;
