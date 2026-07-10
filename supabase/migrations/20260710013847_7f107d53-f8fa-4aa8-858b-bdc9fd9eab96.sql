
create table if not exists public.documentos (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid not null references public.clientes(id) on delete cascade,
  cotizacion_id uuid references public.cotizaciones(id) on delete set null,
  tipo text not null default 'otro',
  nombre_archivo text not null,
  storage_path text not null,
  mime_type text,
  size_bytes bigint,
  notas text not null default '',
  created_at timestamptz not null default now()
);

grant select, insert, update, delete on public.documentos to anon, authenticated;
grant all on public.documentos to service_role;

create index if not exists documentos_cliente_idx on public.documentos (cliente_id, created_at desc);
create index if not exists documentos_cotizacion_idx on public.documentos (cotizacion_id);

alter table public.documentos enable row level security;

drop policy if exists "documentos_select" on public.documentos;
drop policy if exists "documentos_insert" on public.documentos;
drop policy if exists "documentos_delete" on public.documentos;
drop policy if exists "documentos_update" on public.documentos;
create policy "documentos_select" on public.documentos for select using (true);
create policy "documentos_insert" on public.documentos for insert with check (true);
create policy "documentos_update" on public.documentos for update using (true);
create policy "documentos_delete" on public.documentos for delete using (true);

drop policy if exists "documentos_bucket_select" on storage.objects;
drop policy if exists "documentos_bucket_insert" on storage.objects;
drop policy if exists "documentos_bucket_delete" on storage.objects;
create policy "documentos_bucket_select" on storage.objects
  for select using (bucket_id = 'documentos');
create policy "documentos_bucket_insert" on storage.objects
  for insert with check (bucket_id = 'documentos');
create policy "documentos_bucket_delete" on storage.objects
  for delete using (bucket_id = 'documentos');
