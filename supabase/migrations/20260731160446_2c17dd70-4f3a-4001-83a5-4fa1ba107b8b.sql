create table if not exists public.wa_conversaciones (
  id uuid primary key default gen_random_uuid(),
  wa_id text not null unique,
  nombre_contacto text not null default '',
  cliente_id uuid references public.clientes(id) on delete set null,
  pipeline text not null default 'nuevo',
  no_leidos integer not null default 0,
  ultimo_mensaje text not null default '',
  ultima_actividad timestamptz not null default now(),
  archivada boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists wa_conv_actividad_idx
  on public.wa_conversaciones (archivada, ultima_actividad desc);
create index if not exists wa_conv_cliente_idx
  on public.wa_conversaciones (cliente_id);

create table if not exists public.wa_mensajes (
  id uuid primary key default gen_random_uuid(),
  conversacion_id uuid not null references public.wa_conversaciones(id) on delete cascade,
  wa_message_id text unique,
  direccion text not null,
  tipo text not null default 'text',
  texto text not null default '',
  media_url text,
  estado text not null default 'sent',
  timestamp_wa timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists wa_msg_conversacion_idx
  on public.wa_mensajes (conversacion_id, timestamp_wa);

alter table public.wa_conversaciones enable row level security;
alter table public.wa_mensajes enable row level security;

grant select, insert, update, delete on public.wa_conversaciones to authenticated;
grant all on public.wa_conversaciones to service_role;
grant select, insert, update, delete on public.wa_mensajes to authenticated;
grant all on public.wa_mensajes to service_role;

drop policy if exists "team_all_wa_conversaciones" on public.wa_conversaciones;
create policy "team_all_wa_conversaciones" on public.wa_conversaciones
  for all to authenticated using (true) with check (true);

drop policy if exists "team_all_wa_mensajes" on public.wa_mensajes;
create policy "team_all_wa_mensajes" on public.wa_mensajes
  for all to authenticated using (true) with check (true);

alter publication supabase_realtime add table public.wa_conversaciones;
alter publication supabase_realtime add table public.wa_mensajes;