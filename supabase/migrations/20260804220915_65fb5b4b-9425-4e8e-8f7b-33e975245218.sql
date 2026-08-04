create table if not exists public.contactos (
  id             uuid primary key default gen_random_uuid(),
  cliente_id     uuid not null references public.clientes(id) on delete cascade,
  cotizacion_id  uuid references public.cotizaciones(id) on delete set null,
  fecha          timestamptz not null default now(),
  tipo           text not null default 'whatsapp',
  nota           text not null,
  proxima_accion text,
  proxima_fecha  date,
  cumplida       boolean not null default false,
  created_at     timestamptz not null default now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.contactos TO authenticated;
GRANT ALL ON public.contactos TO service_role;

do $$
begin
  alter table public.contactos drop constraint if exists contactos_tipo_check;
  alter table public.contactos add constraint contactos_tipo_check
    check (tipo in ('whatsapp', 'llamada', 'correo', 'visita', 'nota'));
end $$;

create index if not exists contactos_cliente_ix on public.contactos (cliente_id, fecha desc);
create index if not exists contactos_pendientes_ix on public.contactos (proxima_fecha)
  where proxima_fecha is not null and cumplida = false;

alter table public.contactos enable row level security;

do $$
begin
  drop policy if exists "contactos_authenticated_all" on public.contactos;
  create policy "contactos_authenticated_all" on public.contactos
    for all to authenticated using (true) with check (true);
end $$;

do $$
begin
  alter publication supabase_realtime add table public.contactos;
exception when duplicate_object then null;
end $$;

comment on table public.contactos is
  'Bitácora de contacto por cliente. Una entrada con proxima_fecha es además un recordatorio.';