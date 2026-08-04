-- Bitácora de contacto + recordatorios.
--
-- El hueco estructural de la app: cada módulo sabe DÓNDE está una cotización
-- (cotizada, cerrada, pagada) pero ninguno sabe QUÉ SE DIJO ni QUÉ SIGUE. Si
-- quedas con un cliente en hablar el jueves, eso vive en la cabeza del vendedor.
-- Con 8 conversaciones abiertas funciona; con 40 se cae.
--
-- Una sola tabla resuelve las dos cosas: cada entrada es lo que pasó, y si trae
-- proxima_fecha se convierte además en un recordatorio. No hace falta una tabla
-- de tareas aparte — una tarea siempre nace de una conversación.
create table if not exists public.contactos (
  id             uuid primary key default gen_random_uuid(),
  cliente_id     uuid not null references public.clientes(id) on delete cascade,
  -- Opcional: ata el contacto a una cotización concreta. Permite responder
  -- "¿qué pasó con el folio VX-2026-0041?" y no solo "¿qué pasó con el cliente?".
  cotizacion_id  uuid references public.cotizaciones(id) on delete set null,
  fecha          timestamptz not null default now(),
  tipo           text not null default 'whatsapp',
  nota           text not null,
  -- El compromiso adquirido. Si hay fecha, entra a la cola de Inicio ese día.
  proxima_accion text,
  proxima_fecha  date,
  cumplida       boolean not null default false,
  created_at     timestamptz not null default now()
);

do $$
begin
  alter table public.contactos drop constraint if exists contactos_tipo_check;
  alter table public.contactos add constraint contactos_tipo_check
    check (tipo in ('whatsapp', 'llamada', 'correo', 'visita', 'nota'));
end $$;

-- Los recordatorios se consultan por fecha en cada carga de Inicio; el índice
-- parcial mantiene barata esa consulta aunque la bitácora crezca por años.
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
