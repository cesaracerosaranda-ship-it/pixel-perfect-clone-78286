-- Módulo WhatsApp: bandeja de conversaciones dentro de VIALUX Control.
-- Fase 1 (modelo de datos). Las conversaciones/mensajes llegan por webhook de
-- la WhatsApp Cloud API (fase posterior). Cada conversación se puede ligar a un
-- cliente del directorio y llevar su etapa de pipeline.
-- Sigue el modelo autenticado del resto del schema (RLS TO authenticated).

-- ── Conversaciones (una por contacto de WhatsApp) ──────────────────────────
create table if not exists public.wa_conversaciones (
  id uuid primary key default gen_random_uuid(),
  wa_id text not null unique,               -- número del contacto (E.164 sin +)
  nombre_contacto text not null default '', -- nombre que reporta WhatsApp
  cliente_id uuid references public.clientes(id) on delete set null,
  pipeline text not null default 'nuevo',   -- nuevo | potencial | seguimiento | vendido | perdido
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

-- ── Mensajes ───────────────────────────────────────────────────────────────
create table if not exists public.wa_mensajes (
  id uuid primary key default gen_random_uuid(),
  conversacion_id uuid not null references public.wa_conversaciones(id) on delete cascade,
  wa_message_id text unique,                -- id del mensaje en Meta (idempotencia)
  direccion text not null,                  -- in | out
  tipo text not null default 'text',        -- text | image | document | audio | video | sticker | location | other
  texto text not null default '',
  media_url text,                           -- ruta en storage si aplica
  estado text not null default 'sent',      -- sent | delivered | read | failed (para salientes)
  timestamp_wa timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists wa_msg_conversacion_idx
  on public.wa_mensajes (conversacion_id, timestamp_wa);

-- ── RLS: equipo autenticado (mismo patrón que las demás tablas) ────────────
alter table public.wa_conversaciones enable row level security;
alter table public.wa_mensajes enable row level security;

grant select, insert, update, delete on public.wa_conversaciones to authenticated;
grant select, insert, update, delete on public.wa_mensajes to authenticated;

drop policy if exists "team_all_wa_conversaciones" on public.wa_conversaciones;
create policy "team_all_wa_conversaciones" on public.wa_conversaciones
  for all to authenticated using (true) with check (true);

drop policy if exists "team_all_wa_mensajes" on public.wa_mensajes;
create policy "team_all_wa_mensajes" on public.wa_mensajes
  for all to authenticated using (true) with check (true);

-- Realtime para que la bandeja se actualice en vivo.
alter publication supabase_realtime add table public.wa_conversaciones;
alter publication supabase_realtime add table public.wa_mensajes;
