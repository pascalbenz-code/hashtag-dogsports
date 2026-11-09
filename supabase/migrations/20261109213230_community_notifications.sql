-- Additive event log and per-account read cursor. Applied version 20261109213230.
-- No existing data is republished.
create table public.dogsports_community_events (
 id uuid primary key default gen_random_uuid(),
 club_id uuid not null references public.dogsports_clubs(id) on delete cascade,
 actor_id uuid not null references auth.users(id) on delete cascade,
 kind text not null check(kind in ('post_created','member_joined')),
 post_id uuid unique references public.dogsports_club_posts(id) on delete cascade,
 created_at timestamptz not null default clock_timestamp()
);
create index dogsports_events_club_time on public.dogsports_community_events(club_id,created_at desc);
create index dogsports_events_actor on public.dogsports_community_events(actor_id);
create table public.dogsports_notification_reads (
 user_id uuid primary key references auth.users(id) on delete cascade,
 read_through timestamptz not null
);
alter table public.dogsports_community_events enable row level security;
alter table public.dogsports_notification_reads enable row level security;
revoke all on public.dogsports_community_events, public.dogsports_notification_reads from anon, authenticated;
grant select on public.dogsports_community_events to authenticated;
grant select, insert, update on public.dogsports_notification_reads to authenticated;
create policy community_events_read on public.dogsports_community_events for select to authenticated using(
 actor_id <> (select auth.uid()) and exists (
 select 1 from public.dogsports_club_members m where m.club_id=dogsports_community_events.club_id
 and m.user_id=(select auth.uid()) and m.joined_at <= dogsports_community_events.created_at));
create policy notification_reads_select on public.dogsports_notification_reads for select to authenticated using(user_id=(select auth.uid()));
create policy notification_reads_insert on public.dogsports_notification_reads for insert to authenticated with check(user_id=(select auth.uid()));
create policy notification_reads_update on public.dogsports_notification_reads for update to authenticated using(user_id=(select auth.uid())) with check(user_id=(select auth.uid()));
-- Only triggers may write events. The private function has no API execution grants.
create schema if not exists dogsports_private;
revoke all on schema dogsports_private from public, anon, authenticated;
create function dogsports_private.record_community_event() returns trigger
language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null or auth.uid() is distinct from new.user_id then
   raise exception 'Authenticated event actor required';
 end if;
 if tg_table_name='dogsports_club_posts' then
   insert into public.dogsports_community_events(club_id,actor_id,kind,post_id)
   values(new.club_id,new.user_id,'post_created',new.id);
 else
   insert into public.dogsports_community_events(club_id,actor_id,kind)
   values(new.club_id,new.user_id,'member_joined');
 end if;
 return new;
end; $$;
revoke all on function dogsports_private.record_community_event() from public, anon, authenticated;
create trigger dogsports_post_notification after insert on public.dogsports_club_posts
for each row execute function dogsports_private.record_community_event();
create trigger dogsports_join_notification after insert on public.dogsports_club_members
for each row execute function dogsports_private.record_community_event();
