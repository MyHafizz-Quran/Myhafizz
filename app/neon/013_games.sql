-- Jeux (lot J1) : banque de questions Al-Ilm gérée par l'admin, réglages globaux,
-- progression par niveaux et parties jouées. Les changements de l'admin s'appliquent
-- à tous sans mise à jour de l'app.
CREATE TABLE IF NOT EXISTS game_questions (
  id TEXT PRIMARY KEY,
  category TEXT NOT NULL,
  difficulty SMALLINT NOT NULL CHECK (difficulty BETWEEN 1 AND 3),
  type TEXT NOT NULL DEFAULT 'qcm' CHECK (type IN ('qcm', 'vrai_faux')),
  question TEXT NOT NULL,
  choices JSONB NOT NULL,
  answer SMALLINT NOT NULL,
  explanation TEXT NOT NULL DEFAULT '',
  source TEXT NOT NULL DEFAULT '',
  note TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'published' CHECK (status IN ('draft', 'review', 'published', 'disabled')),
  plays INTEGER NOT NULL DEFAULT 0,
  correct INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by TEXT
)
--;;
CREATE INDEX IF NOT EXISTS game_questions_pick ON game_questions (status, category, difficulty)
--;;
ALTER TABLE game_questions ENABLE ROW LEVEL SECURITY
--;;
DROP POLICY IF EXISTS "game_questions_read" ON game_questions
--;;
CREATE POLICY "game_questions_read" ON game_questions FOR SELECT TO authenticated USING (status = 'published')
--;;
GRANT SELECT ON game_questions TO authenticated
--;;
CREATE TABLE IF NOT EXISTS game_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by TEXT
)
--;;
ALTER TABLE game_settings ENABLE ROW LEVEL SECURITY
--;;
DROP POLICY IF EXISTS "game_settings_read" ON game_settings
--;;
CREATE POLICY "game_settings_read" ON game_settings FOR SELECT TO authenticated USING (true)
--;;
GRANT SELECT ON game_settings TO authenticated
--;;
INSERT INTO game_settings (key, value) VALUES
 ('games', '{"suite": true, "sourate": true, "ordre": true, "lettres": true, "ilm": true}'),
 ('robot', '{"1": 0.30, "2": 0.15, "3": 0.05}'),
 ('rules', '{"questions": 5, "ilm_questions": 10, "unlock_pct": 80, "xp_correct": 10, "xp_perfect": 20, "streak_bonus": 0.1, "streak_max": 2, "flash_seconds": 3}')
ON CONFLICT (key) DO NOTHING
--;;
CREATE TABLE IF NOT EXISTS game_progress (
  user_id UUID REFERENCES neon_auth."user"(id) ON DELETE CASCADE NOT NULL DEFAULT auth.uid(),
  game TEXT NOT NULL,
  level SMALLINT NOT NULL DEFAULT 1,
  best JSONB NOT NULL DEFAULT '{}',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, game)
)
--;;
ALTER TABLE game_progress ENABLE ROW LEVEL SECURITY
--;;
DROP POLICY IF EXISTS "game_progress_own" ON game_progress
--;;
CREATE POLICY "game_progress_own" ON game_progress FOR SELECT TO authenticated USING (auth.uid() = user_id)
--;;
GRANT SELECT ON game_progress TO authenticated
--;;
CREATE TABLE IF NOT EXISTS game_sessions (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES neon_auth."user"(id) ON DELETE CASCADE NOT NULL DEFAULT auth.uid(),
  game TEXT NOT NULL,
  level SMALLINT NOT NULL,
  score SMALLINT NOT NULL,
  total SMALLINT NOT NULL,
  xp INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
)
--;;
CREATE INDEX IF NOT EXISTS game_sessions_user_time ON game_sessions (user_id, created_at DESC)
--;;
ALTER TABLE game_sessions ENABLE ROW LEVEL SECURITY
--;;
DROP POLICY IF EXISTS "game_sessions_own" ON game_sessions
--;;
CREATE POLICY "game_sessions_own" ON game_sessions FOR SELECT TO authenticated USING (auth.uid() = user_id)
--;;
GRANT SELECT ON game_sessions TO authenticated
--;;
-- Fin de partie : enregistre la partie, calcule les points côté serveur (série du
-- jour comprise), débloque le niveau suivant et met à jour les stats des questions.
CREATE OR REPLACE FUNCTION public.game_finish(p_game TEXT, p_level INT, p_answers JSONB)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  uid UUID := auth.uid();
  r JSONB; total INT; score INT; pct INT; xp INT; mult NUMERIC; days INT;
  cur INT; unlocked INT;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'non connecté'; END IF;
  IF p_game NOT IN ('suite', 'sourate', 'ordre', 'lettres', 'ilm') OR p_level NOT BETWEEN 1 AND 5 THEN RAISE EXCEPTION 'jeu inconnu'; END IF;
  total := LEAST(jsonb_array_length(p_answers), 20);
  IF total < 1 THEN RAISE EXCEPTION 'partie vide'; END IF;
  SELECT COUNT(*) INTO score FROM jsonb_array_elements(p_answers) WITH ORDINALITY a(v, i) WHERE i <= 20 AND (v->>'ok')::BOOLEAN;
  SELECT value INTO r FROM game_settings WHERE key = 'rules';
  pct := (score * 100) / total;
  -- série : jours consécutifs avec au moins une partie (aujourd'hui compris)
  WITH d AS (
    SELECT DISTINCT (created_at AT TIME ZONE 'UTC')::DATE AS day FROM game_sessions
    WHERE user_id = uid AND created_at > NOW() - INTERVAL '60 days'
    UNION SELECT (NOW() AT TIME ZONE 'UTC')::DATE
  ), g AS (SELECT day, day + (ROW_NUMBER() OVER (ORDER BY day DESC))::INT AS grp FROM d)
  SELECT COUNT(*) INTO days FROM g WHERE grp = (SELECT grp FROM g WHERE day = (NOW() AT TIME ZONE 'UTC')::DATE);
  mult := LEAST(COALESCE((r->>'streak_max')::NUMERIC, 2), 1 + GREATEST(days - 1, 0) * COALESCE((r->>'streak_bonus')::NUMERIC, 0.1));
  xp := ROUND((score * COALESCE((r->>'xp_correct')::INT, 10) + CASE WHEN score = total THEN COALESCE((r->>'xp_perfect')::INT, 20) ELSE 0 END) * mult);
  INSERT INTO game_sessions (user_id, game, level, score, total, xp) VALUES (uid, p_game, p_level, score, total, xp);
  SELECT level INTO cur FROM game_progress WHERE user_id = uid AND game = p_game;
  cur := COALESCE(cur, 1);
  unlocked := CASE WHEN p_level >= cur AND pct >= COALESCE((r->>'unlock_pct')::INT, 80) AND p_level < 5 THEN p_level + 1 ELSE cur END;
  INSERT INTO game_progress (user_id, game, level, best, updated_at)
  VALUES (uid, p_game, unlocked, jsonb_build_object(p_level::TEXT, pct), NOW())
  ON CONFLICT (user_id, game) DO UPDATE SET level = GREATEST(game_progress.level, EXCLUDED.level),
    best = game_progress.best || jsonb_build_object(p_level::TEXT, GREATEST(pct, COALESCE((game_progress.best->>p_level::TEXT)::INT, 0))), updated_at = NOW();
  IF p_game = 'ilm' THEN
    UPDATE game_questions q SET plays = plays + 1, correct = correct + CASE WHEN (a.v->>'ok')::BOOLEAN THEN 1 ELSE 0 END
    FROM jsonb_array_elements(p_answers) a(v) WHERE q.id = a.v->>'id';
  END IF;
  RETURN jsonb_build_object('score', score, 'total', total, 'xp', xp, 'mult', mult, 'streak', days, 'level', unlocked, 'unlocked', unlocked > cur);
END $$
--;;
REVOKE ALL ON FUNCTION public.game_finish(TEXT, INT, JSONB) FROM PUBLIC
--;;
GRANT EXECUTE ON FUNCTION public.game_finish(TEXT, INT, JSONB) TO authenticated
