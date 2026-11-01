-- Notifications personnalisées : contexte enrichi pour la Neon Function « rappels ».
-- Les types activés sont rangés dans prayer_reminders.prayers à côté des prières :
-- verset, hadith, nom, bravo, hebdo, tafsir, arabe, dates (et kahf, déjà existant).
DROP FUNCTION IF EXISTS public.reminder_context(uuid[])
--;;
CREATE FUNCTION public.reminder_context(uids uuid[])
RETURNS TABLE(user_id uuid, days text[], due_count integer, daily_new integer, has_plan boolean, arabic_level text, tafsir_last date, tafsir_any boolean)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  select u.id,
    coalesce((select array_agg(to_char(a.day, 'YYYY-MM-DD') order by a.day desc) from (select day from activity_days where activity_days.user_id = u.id and actions > 0 order by day desc limit 60) a), '{}'),
    (select count(*)::int from verse_reviews v where v.user_id = u.id and v.due_date <= current_date + 1),
    (select h.daily_new from hifz_plans h where h.user_id = u.id),
    exists (select 1 from hifz_plans h where h.user_id = u.id),
    (select p.arabic_level from profiles p where p.id = u.id),
    (select max(t.done_at)::date from tafsir_progress t where t.user_id = u.id),
    exists (select 1 from tafsir_progress t where t.user_id = u.id)
  from unnest(uids) as u(id);
$$
--;;
GRANT EXECUTE ON FUNCTION public.reminder_context(uuid[]) TO authenticated, reminder_worker
--;;
CREATE OR REPLACE FUNCTION public.allah_name_of(p_n INT)
RETURNS TABLE(n SMALLINT, translit TEXT, meaning TEXT) LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  select a.n, a.translit, a.meaning from allah_names a where a.status = 'published' order by a.n
  offset (p_n % greatest((select count(*) from allah_names where status = 'published'), 1)) limit 1;
$$
--;;
GRANT EXECUTE ON FUNCTION public.allah_name_of(INT) TO reminder_worker
--;;
-- Les abonnés actuels reçoivent les types activés par défaut (nom du jour et hadith restent coupés).
UPDATE public.prayer_reminders SET prayers = (SELECT array_agg(DISTINCT x) FROM unnest(prayers || ARRAY['verset','bravo','hebdo','tafsir','arabe','dates']) x)
