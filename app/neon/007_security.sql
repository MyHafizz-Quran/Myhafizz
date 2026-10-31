-- Durcissement sécurité (audit du 31/10/2026)

-- 1. La progression de chacun n'est plus lisible par tous les comptes :
--    lecture de sa propre progression + suivi par les responsables de groupe (policy progress_staff_view).
DROP POLICY IF EXISTS "progress_read_authenticated" ON memorization_progress
--;;
DROP POLICY IF EXISTS "progress_read_own" ON memorization_progress
--;;
CREATE POLICY "progress_read_own" ON memorization_progress FOR SELECT TO authenticated USING (auth.uid() = user_id)
--;;
DROP POLICY IF EXISTS "progress_insert_own" ON memorization_progress
--;;
CREATE POLICY "progress_insert_own" ON memorization_progress FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id)
--;;
-- Classement mémorisation : uniquement des totaux (pas le détail des versets)
CREATE OR REPLACE FUNCTION public.get_memorization_leaderboard()
RETURNS TABLE (user_id UUID, total BIGINT)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT m.user_id, SUM(cardinality(m.memorized_verses))::BIGINT
  FROM memorization_progress m
  GROUP BY m.user_id
  HAVING SUM(cardinality(m.memorized_verses)) > 0
  ORDER BY 2 DESC
  LIMIT 100
$$
--;;
-- 2. Aucun accès sans compte (le rôle anonymous n'a rien à lire)
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anonymous
--;;
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM PUBLIC
--;;
-- 3. Fonctions SECURITY DEFINER : exécutables seulement par les comptes connectés (et pas du tout pour les déclencheurs)
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anonymous, authenticated
--;;
REVOKE ALL ON FUNCTION public.log_activity() FROM PUBLIC, anonymous, authenticated
--;;
DO $$
DECLARE f regprocedure;
BEGIN
  FOR f IN
    SELECT p.oid::regprocedure FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.prosecdef AND p.proname NOT IN ('handle_new_user', 'log_activity')
  LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC, anonymous', f);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated', f);
  END LOOP;
END $$
--;;
-- 4. Les futures fonctions ne sont plus exécutables par PUBLIC par défaut
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC
--;;
-- 5. Un membre ne peut plus changer son propre rôle dans un groupe (élève -> enseignant) : seul son nom affiché est modifiable
REVOKE UPDATE ON group_members FROM authenticated
--;;
GRANT UPDATE (display_name) ON group_members TO authenticated
--;;
-- 6. Ancienne fonction « binôme 1to1 » supprimée de l'app : plus aucun accès à ses tables (elles contiennent des emails)
REVOKE ALL ON study_profiles, study_matches FROM authenticated
--;;
-- 7. Points de lecture plausibles uniquement (pas de triche sur le classement)
ALTER TABLE reading_sessions DROP CONSTRAINT IF EXISTS reading_sessions_sane
--;;
ALTER TABLE reading_sessions ADD CONSTRAINT reading_sessions_sane CHECK (xp BETWEEN 0 AND 30 AND score BETWEEN 0 AND 100) NOT VALID
