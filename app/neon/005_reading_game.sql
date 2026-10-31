-- Apprendre à lire : journal des leçons faites (objectif du jour, défis, classement)
CREATE TABLE IF NOT EXISTS reading_sessions (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES neon_auth."user"(id) ON DELETE CASCADE NOT NULL DEFAULT auth.uid(),
  lesson_id TEXT NOT NULL,
  score SMALLINT NOT NULL DEFAULT 0,
  xp INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
)
--;;
CREATE INDEX IF NOT EXISTS reading_sessions_user_time ON reading_sessions (user_id, created_at DESC)
--;;
ALTER TABLE reading_sessions ENABLE ROW LEVEL SECURITY
--;;
DROP POLICY IF EXISTS "reading_sessions_own" ON reading_sessions
--;;
CREATE POLICY "reading_sessions_own" ON reading_sessions FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id)
--;;
GRANT SELECT, INSERT ON reading_sessions TO authenticated
--;;
GRANT USAGE, SELECT ON SEQUENCE reading_sessions_id_seq TO authenticated
--;;
-- Classement lecture : points gagnés depuis une date (chacun ne voit que des totaux)
CREATE OR REPLACE FUNCTION public.get_reading_leaderboard(since TIMESTAMPTZ)
RETURNS TABLE (user_id UUID, xp BIGINT, lessons BIGINT)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT s.user_id, SUM(s.xp)::BIGINT, COUNT(*)::BIGINT
  FROM reading_sessions s
  WHERE s.created_at >= since
  GROUP BY s.user_id
  HAVING SUM(s.xp) > 0
  ORDER BY 2 DESC
  LIMIT 100
$$
--;;
REVOKE ALL ON FUNCTION public.get_reading_leaderboard(TIMESTAMPTZ) FROM PUBLIC
--;;
GRANT EXECUTE ON FUNCTION public.get_reading_leaderboard(TIMESTAMPTZ) TO authenticated
