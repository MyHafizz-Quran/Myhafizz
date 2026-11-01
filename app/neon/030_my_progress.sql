-- « Mes progrès » : versets par semaine, régularité sur 13 semaines, série et record, solidité de la mémoire.
create or replace function public.my_progress()
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare me uuid := auth.uid(); ds date[]; s int := 0; best int := 0; run int := 0; prev date; d date;
begin
  if me is null then return null; end if;
  select array_agg(day order by day) into ds from activity_days where user_id = me;
  foreach d in array coalesce(ds, '{}'::date[]) loop
    if prev is not null and d = prev + 1 then run := run + 1; else run := 1; end if;
    best := greatest(best, run); prev := d;
  end loop;
  if prev is not null and prev >= current_date - 1 then s := run; end if;
  return jsonb_build_object(
    'verses', (select count(*) from verse_reviews where user_id = me),
    'verses_week', (select count(*) from verse_reviews where user_id = me and created_at > now() - interval '7 days'),
    'streak', s, 'best', best,
    'weeks', (select jsonb_agg(jsonb_build_object('w', to_char(w, 'YYYY-MM-DD'), 'n',
                (select count(*) from verse_reviews v where v.user_id = me and v.created_at >= w and v.created_at < w + interval '7 days')) order by w)
              from generate_series(date_trunc('week', now()) - interval '7 weeks', date_trunc('week', now()), interval '7 days') w),
    'days', (select coalesce(jsonb_agg(to_char(day, 'YYYY-MM-DD') order by day), '[]'::jsonb) from activity_days where user_id = me and day > current_date - 91),
    'solid', (select count(*) from verse_reviews where user_id = me and interval_days >= 21),
    'medium', (select count(*) from verse_reviews where user_id = me and interval_days between 4 and 20),
    'weak', (select count(*) from verse_reviews where user_id = me and interval_days < 4)
  );
end $$;
revoke all on function public.my_progress() from public;
grant execute on function public.my_progress() to authenticated;
