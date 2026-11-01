-- Contexte de régularité pour les rappels personnalisés (lu par le rôle reminder_worker).
drop function if exists public.reminder_context(uuid[]);
-- Fonction SECURITY DEFINER : le worker n'a aucun accès direct aux tables d'activité.
create or replace function public.reminder_context(uids uuid[])
returns table (user_id uuid, days text[], due_count int, daily_new int, has_plan boolean)
language sql stable security definer set search_path = public as $$
  select u.id,
    coalesce((select array_agg(to_char(a.day, 'YYYY-MM-DD') order by a.day desc) from (select day from activity_days where activity_days.user_id = u.id and actions > 0 order by day desc limit 60) a), '{}'),
    (select count(*)::int from verse_reviews v where v.user_id = u.id and v.due_date <= current_date + 1),
    (select h.daily_new from hifz_plans h where h.user_id = u.id),
    exists (select 1 from hifz_plans h where h.user_id = u.id)
  from unnest(uids) as u(id);
$$;
revoke all on function public.reminder_context(uuid[]) from public;
grant execute on function public.reminder_context(uuid[]) to reminder_worker;
