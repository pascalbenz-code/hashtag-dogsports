-- Additive community layer. Version matches the applied Supabase migration.
-- Private dogsports_records and local stores stay private.
create table public.dogsports_clubs (
 id uuid primary key default gen_random_uuid(),
 name text not null check (char_length(trim(name)) between 3 and 100),
 city text not null default '' check (char_length(city) <= 100),
 description text not null default '' check (char_length(description) <= 1500),
 created_by uuid not null references auth.users(id) on delete cascade,
 created_at timestamptz not null default now()
);
create unique index dogsports_club_identity on public.dogsports_clubs(lower(trim(name)), lower(trim(city)));
create index dogsports_clubs_creator on public.dogsports_clubs(created_by);
create table public.dogsports_club_members (
 club_id uuid not null references public.dogsports_clubs(id) on delete cascade,
 user_id uuid not null references auth.users(id) on delete cascade,
 joined_at timestamptz not null default now(),
 primary key(club_id,user_id)
);
create index dogsports_members_user on public.dogsports_club_members(user_id,club_id);
create table public.dogsports_club_posts (
 id uuid primary key default gen_random_uuid(),
 club_id uuid not null,
 user_id uuid not null,
 result_id text not null check(char_length(result_id) between 1 and 100),
 author_name text not null check(char_length(trim(author_name)) between 1 and 100),
 dog_name text not null check(char_length(trim(dog_name)) between 1 and 100),
 event_name text not null check(char_length(trim(event_name)) between 1 and 200),
 result_date date not null,
 discipline text not null check(discipline in ('FCI-VK1','FCI-VK2','FCI-VK3','VDH-S-VK','VDH-HL','VDH-DK')),
 total numeric not null check(total between -1000000 and 1000000),
 source_updated_at timestamptz not null,
 caption text not null default '' check(char_length(caption)<=1000),
 created_at timestamptz not null default now(),
 foreign key(club_id,user_id) references public.dogsports_club_members(club_id,user_id) on delete cascade,
 unique(club_id,user_id,result_id)
);
create index dogsports_posts_feed on public.dogsports_club_posts(club_id,created_at desc,id);
create index dogsports_posts_author on public.dogsports_club_posts(user_id);
alter table public.dogsports_clubs enable row level security;
alter table public.dogsports_club_members enable row level security;
alter table public.dogsports_club_posts enable row level security;
revoke all on public.dogsports_clubs, public.dogsports_club_members, public.dogsports_club_posts from anon, authenticated;
grant select, insert on public.dogsports_clubs to authenticated;
grant select, insert, delete on public.dogsports_club_members, public.dogsports_club_posts to authenticated;
create policy clubs_read on public.dogsports_clubs for select to authenticated using(true);
create policy clubs_create on public.dogsports_clubs for insert to authenticated with check(created_by=(select auth.uid()));
-- Membership rows are private. No recursive membership policies or privileged helpers.
create policy members_read on public.dogsports_club_members for select to authenticated using(user_id=(select auth.uid()));
create policy members_join on public.dogsports_club_members for insert to authenticated with check(user_id=(select auth.uid()));
create policy members_leave on public.dogsports_club_members for delete to authenticated using(user_id=(select auth.uid()));
create policy posts_read on public.dogsports_club_posts for select to authenticated using(
 club_id in (select club_id from public.dogsports_club_members where user_id=(select auth.uid())));
create policy posts_create on public.dogsports_club_posts for insert to authenticated with check(
 user_id=(select auth.uid()) and club_id in (select club_id from public.dogsports_club_members where user_id=(select auth.uid())));
create policy posts_remove on public.dogsports_club_posts for delete to authenticated using(user_id=(select auth.uid()));
-- Club + first membership are one transaction, with the caller's RLS permissions.
create function public.dogsports_create_club(club_name text, club_city text, club_description text)
returns uuid language plpgsql security invoker set search_path='' as $$
declare new_id uuid;
begin
 insert into public.dogsports_clubs(name,city,description,created_by)
 values(trim(club_name),trim(club_city),trim(club_description),auth.uid()) returning id into new_id;
 insert into public.dogsports_club_members(club_id,user_id) values(new_id,auth.uid());
 return new_id;
end; $$;
revoke all on function public.dogsports_create_club(text,text,text) from public, anon;
grant execute on function public.dogsports_create_club(text,text,text) to authenticated;
