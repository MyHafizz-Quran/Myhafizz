-- Statistiques des notifications par jour et par type : envoyées (serveur) et ouvertes (toucher sur la notification).
create table if not exists public.notif_stats (
  day date not null default current_date,
  kind text not null,
  sent int not null default 0,
  opened int not null default 0,
  primary key (day, kind)
);
alter table public.notif_stats enable row level security;
revoke all on public.notif_stats from public, authenticated;

create or replace function public.notif_opened(p_kind text)
returns void language sql security definer set search_path = public as $$
  insert into public.notif_stats(day, kind, opened)
  values (current_date, left(coalesce(nullif(p_kind, ''), 'autre'), 20), 1)
  on conflict (day, kind) do update set opened = notif_stats.opened + 1;
$$;
revoke all on function public.notif_opened(text) from public;
grant execute on function public.notif_opened(text) to authenticated;
