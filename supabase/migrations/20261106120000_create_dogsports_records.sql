-- #Dogsports cloud sync, schema version 1
-- Additive migration: existing application data is not modified.

create table if not exists public.dogsports_records (
  user_id uuid not null references auth.users(id) on delete cascade,
  entity_type text not null check (entity_type in ('results', 'handlers', 'dogs')),
  record_id text not null,
  payload jsonb,
  client_updated_at timestamptz not null,
  deleted_at timestamptz,
  server_updated_at timestamptz not null default now(),
  primary key (user_id, entity_type, record_id),
  constraint dogsports_payload_or_tombstone check (
    (deleted_at is null and payload is not null)
    or (deleted_at is not null and payload is null)
  )
);

create index if not exists dogsports_records_user_server_updated_idx
  on public.dogsports_records (user_id, server_updated_at);

create or replace function public.set_dogsports_server_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.server_updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_dogsports_server_updated_at
  on public.dogsports_records;
create trigger set_dogsports_server_updated_at
before update on public.dogsports_records
for each row execute function public.set_dogsports_server_updated_at();

alter table public.dogsports_records enable row level security;
alter table public.dogsports_records force row level security;

revoke all on table public.dogsports_records from anon;
grant select, insert, update, delete on table public.dogsports_records
  to authenticated;

drop policy if exists "dogsports_select_own_records"
  on public.dogsports_records;
create policy "dogsports_select_own_records"
on public.dogsports_records
for select
to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "dogsports_insert_own_records"
  on public.dogsports_records;
create policy "dogsports_insert_own_records"
on public.dogsports_records
for insert
to authenticated
with check ((select auth.uid()) = user_id);

drop policy if exists "dogsports_update_own_records"
  on public.dogsports_records;
create policy "dogsports_update_own_records"
on public.dogsports_records
for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

drop policy if exists "dogsports_delete_own_records"
  on public.dogsports_records;
create policy "dogsports_delete_own_records"
on public.dogsports_records
for delete
to authenticated
using ((select auth.uid()) = user_id);
