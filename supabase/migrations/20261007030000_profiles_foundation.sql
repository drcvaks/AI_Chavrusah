-- Milestone 1 only: private profiles and trusted global-admin authority.
create type public.app_role as enum ('USER', 'GLOBAL_ADMIN');
create type public.learning_depth_mode as enum ('READING', 'BE_IYUN');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null check (char_length(btrim(display_name)) between 1 and 80),
  role public.app_role not null default 'USER',
  default_depth_mode public.learning_depth_mode not null default 'READING',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
revoke all on public.profiles from public, anon, authenticated;
grant select on public.profiles to authenticated;
grant update (display_name, default_depth_mode) on public.profiles to authenticated;
grant all on public.profiles to service_role;

create policy "Read own profile" on public.profiles
  for select to authenticated using ((select auth.uid()) = id);
create policy "Update own profile" on public.profiles
  for update to authenticated
  using ((select auth.uid()) = id) with check ((select auth.uid()) = id);

create function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, display_name, role, default_depth_mode)
  values (
    new.id,
    coalesce(nullif(left(btrim(new.raw_user_meta_data ->> 'display_name'), 80), ''), 'Learner'),
    'USER',
    'READING'
  );
  return new;
end;
$$;
revoke all on function public.handle_new_user() from public, anon, authenticated;
create trigger on_auth_user_created
  after insert on auth.users for each row execute function public.handle_new_user();

-- Handle any users created before this migration, without trusting role metadata.
insert into public.profiles (id, display_name)
select id, coalesce(nullif(left(btrim(raw_user_meta_data ->> 'display_name'), 80), ''), 'Learner')
from auth.users on conflict (id) do nothing;

create function public.touch_profile_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.updated_at = now();
  return new;
end;
$$;
revoke all on function public.touch_profile_updated_at() from public, anon, authenticated;
create trigger profiles_updated_at before update on public.profiles
  for each row execute function public.touch_profile_updated_at();

-- Invoker rights preserve own-row RLS; this grants no access to other learners.
create function public.is_global_admin()
returns boolean language sql stable security invoker set search_path = '' as $$
  select exists (
    select 1 from public.profiles
    where id = (select auth.uid()) and role = 'GLOBAL_ADMIN'
  );
$$;
revoke all on function public.is_global_admin() from public, anon;
grant execute on function public.is_global_admin() to authenticated, service_role;
