-- Additional human-readable IDs; applied migration version 20261110053503.
-- Existing UUIDs, payloads and references stay intact.
create schema if not exists dogsports_private;
revoke all on schema dogsports_private from public, anon, authenticated;
create sequence dogsports_private.user_code_seq;
create sequence dogsports_private.dog_code_seq;
create sequence dogsports_private.club_code_seq;
revoke all on all sequences in schema dogsports_private from public, anon, authenticated;
create function dogsports_private.format_code(ordinal bigint, prefix text) returns text
language plpgsql immutable security invoker set search_path='' as $$
declare letters text=''; block bigint; digits bigint;
begin
 if ordinal < 1 then raise exception 'Positive ordinal required'; end if;
 block := (ordinal-1)/999999+1;
 digits := (ordinal-1)%999999+1;
 while block>0 loop
  letters := chr((65+(block-1)%26)::integer)||letters;
  block := (block-1)/26;
 end loop;
 return prefix||letters||lpad(digits::text,6,'0');
end; $$;
revoke all on function dogsports_private.format_code(bigint,text) from public, anon, authenticated;
create table public.dogsports_user_ids (
 user_id uuid primary key references auth.users(id) on delete cascade,
 public_id text not null unique check(public_id ~ '^#[A-Z]+[0-9]{6}$')
);
create table public.dogsports_dog_ids (
 user_id uuid not null references auth.users(id) on delete cascade,
 record_id text not null,
 public_id text not null unique check(public_id ~ '^\+[A-Z]+[0-9]{6}$'),
 primary key(user_id,record_id)
);
alter table public.dogsports_user_ids enable row level security;
alter table public.dogsports_dog_ids enable row level security;
revoke all on public.dogsports_user_ids,public.dogsports_dog_ids from anon,authenticated;
grant select on public.dogsports_user_ids,public.dogsports_dog_ids to authenticated;
create policy user_ids_own on public.dogsports_user_ids for select to authenticated using(user_id=(select auth.uid()));
create policy dog_ids_own on public.dogsports_dog_ids for select to authenticated using(user_id=(select auth.uid()));
insert into public.dogsports_user_ids(user_id,public_id)
select id,dogsports_private.format_code(nextval('dogsports_private.user_code_seq'),'#') from auth.users order by created_at,id;
insert into public.dogsports_dog_ids(user_id,record_id,public_id)
select user_id,record_id,dogsports_private.format_code(nextval('dogsports_private.dog_code_seq'),'+')
from public.dogsports_records where entity_type='dogs' and deleted_at is null order by server_updated_at,user_id,record_id;
alter table public.dogsports_clubs add column public_id text;
do $$ declare c record; begin
 for c in select id from public.dogsports_clubs order by created_at,id loop
  update public.dogsports_clubs set public_id=dogsports_private.format_code(nextval('dogsports_private.club_code_seq'),'*') where id=c.id;
 end loop;
end $$;
alter table public.dogsports_clubs alter column public_id set not null;
alter table public.dogsports_clubs add constraint dogsports_clubs_public_id_unique unique(public_id);
alter table public.dogsports_clubs add constraint dogsports_clubs_public_id_format check(public_id ~ '^\*[A-Z]+[0-9]{6}$');
-- Privileged, non-API trigger entry points. Source tables enforce ownership/RLS.
create function dogsports_private.assign_user_code() returns trigger
language plpgsql security definer set search_path='' as $$ begin
 insert into public.dogsports_user_ids(user_id,public_id) values(new.id,dogsports_private.format_code(nextval('dogsports_private.user_code_seq'),'#'));
 return new;
end $$;
create function dogsports_private.assign_dog_code() returns trigger
language plpgsql security definer set search_path='' as $$ begin
 if new.entity_type='dogs' and new.deleted_at is null and not exists(
  select 1 from public.dogsports_dog_ids where user_id=new.user_id and record_id=new.record_id
 ) then
  insert into public.dogsports_dog_ids(user_id,record_id,public_id)
  values(new.user_id,new.record_id,dogsports_private.format_code(nextval('dogsports_private.dog_code_seq'),'+')) on conflict(user_id,record_id) do nothing;
 end if;
 return new;
end $$;
create function dogsports_private.assign_club_code() returns trigger
language plpgsql security definer set search_path='' as $$ begin
 if tg_op='INSERT' then
  new.public_id:=dogsports_private.format_code(nextval('dogsports_private.club_code_seq'),'*');
 elsif new.public_id is distinct from old.public_id then
  raise exception 'Club identifier is immutable';
 end if;
 return new;
end $$;
revoke all on function dogsports_private.assign_user_code(),dogsports_private.assign_dog_code(),dogsports_private.assign_club_code() from public,anon,authenticated;
create trigger dogsports_assign_user_code after insert on auth.users for each row execute function dogsports_private.assign_user_code();
create trigger dogsports_assign_dog_code after insert or update on public.dogsports_records for each row execute function dogsports_private.assign_dog_code();
create trigger dogsports_assign_club_code before insert or update on public.dogsports_clubs for each row execute function dogsports_private.assign_club_code();
