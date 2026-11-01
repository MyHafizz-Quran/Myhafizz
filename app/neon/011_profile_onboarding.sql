-- 011 : nom d’utilisateur unique, niveau d’arabe, objectif et date d’onboarding (profil de personnalisation)
alter table public.profiles add column if not exists username text;
alter table public.profiles add column if not exists arabic_level text check (arabic_level in ('none','some','good'));
alter table public.profiles add column if not exists goal text;
alter table public.profiles add column if not exists onboarded_at timestamptz;
do $$ begin
  if not exists (select 1 from pg_constraint where conname='profiles_username_format') then
    alter table public.profiles add constraint profiles_username_format check (username ~ '^[a-z0-9_.]{3,20}$');
  end if;
end $$;
create unique index if not exists profiles_username_key on public.profiles (username);
create or replace function public.username_available(u text) returns boolean
language sql stable security definer set search_path = public as $$
  select lower(u) ~ '^[a-z0-9_.]{3,20}$' and not exists (select 1 from public.profiles where username = lower(u));
$$;
revoke all on function public.username_available(text) from public;
grant execute on function public.username_available(text) to anonymous, authenticated;
