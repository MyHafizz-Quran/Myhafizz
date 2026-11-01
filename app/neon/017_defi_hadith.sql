-- Défi du jour (mêmes questions pour tous, un essai par jour, classement du jour) et jeu « Hadith ou pas ? ».
INSERT INTO game_settings (key, value) VALUES ('defi', '{"enabled": true, "questions": 5, "per_good": 5, "streak_step": 2, "streak_max": 20}') ON CONFLICT (key) DO NOTHING
--;;
CREATE TABLE IF NOT EXISTS daily_challenges (
  day DATE PRIMARY KEY,
  items JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
)
--;;
CREATE TABLE IF NOT EXISTS daily_results (
  user_id UUID NOT NULL REFERENCES neon_auth."user"(id) ON DELETE CASCADE,
  day DATE NOT NULL,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  finished_at TIMESTAMPTZ,
  score SMALLINT,
  total SMALLINT,
  ms INT,
  answers JSONB,
  points INT,
  streak INT,
  PRIMARY KEY (user_id, day)
)
--;;
CREATE INDEX IF NOT EXISTS daily_results_day ON daily_results (day, score DESC, ms)
--;;
ALTER TABLE daily_challenges ENABLE ROW LEVEL SECURITY
--;;
ALTER TABLE daily_results ENABLE ROW LEVEL SECURITY
--;;
REVOKE ALL ON daily_challenges, daily_results FROM authenticated
--;;
CREATE OR REPLACE FUNCTION dc_cfg(p_key TEXT, p_default INT) RETURNS INT LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE((SELECT (value ->> p_key)::INT FROM game_settings WHERE key = 'defi'), p_default)
$$
--;;
-- Série : nombre de jours consécutifs avec un défi terminé, jusqu'à la veille de p_day.
CREATE OR REPLACE FUNCTION dc_streak(p_uid UUID, p_day DATE) RETURNS INT LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE n INT := 0; d DATE := p_day - 1;
BEGIN
  WHILE EXISTS (SELECT 1 FROM daily_results WHERE user_id = p_uid AND day = d AND finished_at IS NOT NULL) LOOP n := n + 1; d := d - 1; END LOOP;
  RETURN n;
END $$
--;;
-- Le premier joueur du jour propose les questions ; tout le monde reçoit ensuite les mêmes.
CREATE OR REPLACE FUNCTION dc_get(p_candidates JSONB DEFAULT NULL) RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE me UUID := auth.uid(); today DATE := (now() AT TIME ZONE 'UTC')::DATE; c daily_challenges; r daily_results; n INT := dc_cfg('questions', 5);
BEGIN
  IF me IS NULL THEN RAISE EXCEPTION 'non connecté'; END IF;
  SELECT * INTO c FROM daily_challenges WHERE day = today;
  IF c.day IS NULL AND p_candidates IS NOT NULL AND jsonb_array_length(p_candidates) >= n THEN
    INSERT INTO daily_challenges (day, items) VALUES (today, (SELECT jsonb_agg(x) FROM (SELECT x FROM jsonb_array_elements(p_candidates) WITH ORDINALITY t(x, i) ORDER BY i LIMIT n) s))
    ON CONFLICT (day) DO NOTHING;
    SELECT * INTO c FROM daily_challenges WHERE day = today;
  END IF;
  SELECT * INTO r FROM daily_results WHERE user_id = me AND day = today;
  RETURN jsonb_build_object('day', today, 'now', now(), 'next_at', (today + 1)::TIMESTAMP AT TIME ZONE 'UTC',
    'enabled', COALESCE((SELECT (value->>'enabled')::BOOLEAN FROM game_settings WHERE key = 'defi'), TRUE),
    'ready', c.day IS NOT NULL, 'total', COALESCE(jsonb_array_length(c.items), n),
    'items', CASE WHEN c.day IS NOT NULL AND (r.user_id IS NULL OR r.finished_at IS NULL) THEN c.items END,
    'started', r.user_id IS NOT NULL, 'progress', CASE WHEN r.finished_at IS NULL THEN COALESCE(jsonb_array_length(r.answers), 0) ELSE NULL END, 'played', r.finished_at IS NOT NULL,
    'result', CASE WHEN r.finished_at IS NOT NULL THEN jsonb_build_object('score', r.score, 'total', r.total, 'ms', r.ms, 'points', r.points, 'streak', r.streak, 'answers', r.answers,
      'rank', (SELECT count(*) + 1 FROM daily_results x WHERE x.day = today AND x.finished_at IS NOT NULL AND (x.score > r.score OR (x.score = r.score AND x.ms < r.ms)))) END,
    'items_done', CASE WHEN r.finished_at IS NOT NULL THEN c.items END,
    'streak', dc_streak(me, today) + CASE WHEN r.finished_at IS NOT NULL THEN 1 ELSE 0 END,
    'players', (SELECT count(*) FROM daily_results WHERE day = today AND finished_at IS NOT NULL));
END $$
--;;
-- Démarrage : compte comme l'essai du jour (on ne peut pas recommencer pour voir les réponses).
CREATE OR REPLACE FUNCTION dc_start() RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE me UUID := auth.uid(); today DATE := (now() AT TIME ZONE 'UTC')::DATE;
BEGIN
  IF me IS NULL THEN RAISE EXCEPTION 'non connecté'; END IF;
  IF NOT EXISTS (SELECT 1 FROM daily_challenges WHERE day = today) THEN RAISE EXCEPTION 'Le défi du jour n''est pas prêt.'; END IF;
  INSERT INTO daily_results (user_id, day) VALUES (me, today) ON CONFLICT DO NOTHING;
  RETURN dc_get(NULL);
END $$
--;;
CREATE OR REPLACE FUNCTION dc_submit(p_answers JSONB, p_ms INT) RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE me UUID := auth.uid(); today DATE := (now() AT TIME ZONE 'UTC')::DATE; r daily_results; sc INT; tot INT; st INT; pts INT;
BEGIN
  SELECT * INTO r FROM daily_results WHERE user_id = me AND day = today FOR UPDATE;
  IF r.user_id IS NULL THEN RAISE EXCEPTION 'Défi non commencé.'; END IF;
  IF r.finished_at IS NOT NULL THEN RETURN dc_get(NULL); END IF;
  SELECT jsonb_array_length(items) INTO tot FROM daily_challenges WHERE day = today;
  SELECT count(*) FILTER (WHERE (a->>'ok')::BOOLEAN) INTO sc FROM jsonb_array_elements(COALESCE(p_answers, '[]')) a;
  sc := LEAST(sc, tot);
  st := dc_streak(me, today) + 1;
  pts := sc * dc_cfg('per_good', 5) + LEAST(dc_cfg('streak_max', 20), (st - 1) * dc_cfg('streak_step', 2));
  UPDATE daily_results SET finished_at = now(), score = sc, total = tot,
    ms = LEAST(GREATEST(COALESCE(p_ms, 0), 0), (EXTRACT(EPOCH FROM (now() - started_at)) * 1000)::INT + 1000), answers = p_answers, points = pts, streak = st
  WHERE user_id = me AND day = today;
  INSERT INTO game_sessions (user_id, game, level, score, total, xp) VALUES (me, 'defi', 1, sc, tot, pts);
  PERFORM award_badges(me);
  RETURN dc_get(NULL);
END $$
--;;
CREATE OR REPLACE FUNCTION dc_board(p_scope TEXT DEFAULT 'all') RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE me UUID := auth.uid(); today DATE := (now() AT TIME ZONE 'UTC')::DATE;
BEGIN
  IF me IS NULL THEN RAISE EXCEPTION 'non connecté'; END IF;
  RETURN (WITH pool AS (
      SELECT r.user_id, r.score, r.ms FROM daily_results r WHERE r.day = today AND r.finished_at IS NOT NULL
        AND (p_scope <> 'groups' OR r.user_id = me OR r.user_id IN (SELECT m2.user_id FROM group_members m1 JOIN group_members m2 ON m2.group_id = m1.group_id WHERE m1.user_id = me))),
    ranked AS (SELECT *, rank() OVER (ORDER BY score DESC, ms) AS pos FROM pool)
    SELECT jsonb_build_object('players', (SELECT count(*) FROM pool),
      'top', COALESCE((SELECT jsonb_agg(jsonb_build_object('pos', pos, 'score', score, 'ms', ms, 'me', user_id = me, 'p', player_card(user_id)) ORDER BY pos, ms) FROM (SELECT * FROM ranked ORDER BY pos, ms LIMIT 20) t), '[]'),
      'mine', (SELECT jsonb_build_object('pos', pos, 'score', score, 'ms', ms) FROM ranked WHERE user_id = me)));
END $$
--;;
REVOKE ALL ON FUNCTION dc_cfg(TEXT, INT), dc_streak(UUID, DATE) FROM PUBLIC, authenticated
--;;
GRANT EXECUTE ON FUNCTION dc_get(JSONB), dc_start(), dc_submit(JSONB, INT), dc_board(TEXT) TO authenticated

--;;
-- « Hadith ou pas ? » accepté par game_finish, et compté dans les parties solo des badges
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
  IF p_game NOT IN ('suite', 'sourate', 'ordre', 'lettres', 'ilm', 'hadith') OR p_level NOT BETWEEN 1 AND 5 THEN RAISE EXCEPTION 'jeu inconnu'; END IF;
  total := LEAST(jsonb_array_length(p_answers), 20);
  IF total < 1 THEN RAISE EXCEPTION 'partie vide'; END IF;
  SELECT COUNT(*) INTO score FROM jsonb_array_elements(p_answers) WITH ORDINALITY a(v, i) WHERE i <= 20 AND (v->>'ok')::BOOLEAN;
  SELECT value INTO r FROM game_settings WHERE key = 'rules';
  pct := (score * 100) / total;
  -- série : jours consécutifs avec au moins une partie (aujourd'hui compris)
  WITH d AS (
    SELECT DISTINCT (created_at AT TIME ZONE 'UTC')::DATE AS day FROM game_sessions
    WHERE user_id = uid AND total > 0 AND created_at > NOW() - INTERVAL '60 days'
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
  IF p_game IN ('ilm', 'hadith') THEN
    UPDATE game_questions q SET plays = plays + 1, correct = correct + CASE WHEN (a.v->>'ok')::BOOLEAN THEN 1 ELSE 0 END
    FROM jsonb_array_elements(p_answers) a(v) WHERE q.id = a.v->>'id';
  END IF;
  RETURN jsonb_build_object('score', score, 'total', total, 'xp', xp, 'mult', mult, 'streak', days, 'level', unlocked, 'unlocked', unlocked > cur);
END $$
--;;
-- Badges : 24 succès, calculés à partir de l'historique. Un badge gagné reste acquis.
CREATE OR REPLACE FUNCTION award_badges(p_uid UUID) RETURNS TEXT[] LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE n_duels INT; n_wins INT; n_perfect INT; n_rematch INT; n_quit INT; n_khatma INT; n_solo INT; pts INT;
  best INT := 0; cur INT := 0; r RECORD; earned TEXT[] := '{}'; cand TEXT[] := '{}'; b TEXT;
BEGIN
  SELECT count(*), count(*) FILTER (WHERE winner = p_uid),
    count(*) FILTER (WHERE quit_by IS NULL AND (CASE WHEN challenger = p_uid THEN score_c ELSE score_o END) = jsonb_array_length(items)),
    count(*) FILTER (WHERE rematch_of IS NOT NULL AND winner = p_uid), count(*) FILTER (WHERE quit_by = p_uid)
  INTO n_duels, n_wins, n_perfect, n_rematch, n_quit
  FROM live_duels WHERE status = 'done' AND (challenger = p_uid OR opponent = p_uid);
  FOR r IN SELECT winner FROM live_duels WHERE status = 'done' AND (challenger = p_uid OR opponent = p_uid) ORDER BY finished_at LOOP
    IF r.winner = p_uid THEN cur := cur + 1; best := GREATEST(best, cur); ELSE cur := 0; END IF;
  END LOOP;
  SELECT count(*) FILTER (WHERE game = 'khatma'), count(*) FILTER (WHERE game IN ('lettres','suite','sourate','ordre','ilm','hadith') AND total > 0)
  INTO n_khatma, n_solo FROM game_sessions WHERE user_id = p_uid;
  pts := player_points(p_uid);
  IF n_duels >= 1 THEN cand := array_append(cand, 'duel_1'); END IF;
  IF n_duels >= 10 THEN cand := array_append(cand, 'duel_10'); END IF;
  IF n_duels >= 50 THEN cand := array_append(cand, 'duel_50'); END IF;
  IF n_duels >= 100 THEN cand := array_append(cand, 'duel_100'); END IF;
  IF n_wins >= 1 THEN cand := array_append(cand, 'win_1'); END IF;
  IF n_wins >= 10 THEN cand := array_append(cand, 'win_10'); END IF;
  IF n_wins >= 50 THEN cand := array_append(cand, 'win_50'); END IF;
  IF n_wins >= 100 THEN cand := array_append(cand, 'win_100'); END IF;
  IF best >= 3 THEN cand := array_append(cand, 'streak_3'); END IF;
  IF best >= 5 THEN cand := array_append(cand, 'streak_5'); END IF;
  IF best >= 10 THEN cand := array_append(cand, 'streak_10'); END IF;
  IF n_perfect >= 1 THEN cand := array_append(cand, 'perfect_1'); END IF;
  IF n_perfect >= 10 THEN cand := array_append(cand, 'perfect_10'); END IF;
  IF n_rematch >= 1 THEN cand := array_append(cand, 'rematch_1'); END IF;
  IF n_duels >= 20 AND n_quit = 0 THEN cand := array_append(cand, 'fairplay_20'); END IF;
  IF n_khatma >= 1 THEN cand := array_append(cand, 'khatma_1'); END IF;
  IF n_khatma >= 5 THEN cand := array_append(cand, 'khatma_5'); END IF;
  IF n_solo >= 10 THEN cand := array_append(cand, 'solo_10'); END IF;
  IF n_solo >= 100 THEN cand := array_append(cand, 'solo_100'); END IF;
  IF pts >= 450 THEN cand := array_append(cand, 'grade_confirme'); END IF;
  IF pts >= 900 THEN cand := array_append(cand, 'grade_expert'); END IF;
  IF pts >= 1800 THEN cand := array_append(cand, 'grade_elite'); END IF;
  IF pts >= 3000 THEN cand := array_append(cand, 'grade_maitre'); END IF;
  IF pts >= 5000 THEN cand := array_append(cand, 'grade_legende'); END IF;
  FOREACH b IN ARRAY cand LOOP
    INSERT INTO player_badges (user_id, badge) VALUES (p_uid, b) ON CONFLICT DO NOTHING;
    IF FOUND THEN earned := array_append(earned, b); PERFORM notify(p_uid, 'badge', NULL, NULL, jsonb_build_object('badge', b), FALSE); END IF;
  END LOOP;
  RETURN earned;
END $$
--;;
-- Défi : chaque réponse est enregistrée tout de suite ; si on revient, on reprend à la question suivante.
CREATE OR REPLACE FUNCTION dc_answer(p_k INT, p_ok BOOLEAN, p_ms INT) RETURNS INT LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE me UUID := auth.uid(); today DATE := (now() AT TIME ZONE 'UTC')::DATE; r daily_results;
BEGIN
  SELECT * INTO r FROM daily_results WHERE user_id = me AND day = today FOR UPDATE;
  IF r.user_id IS NULL OR r.finished_at IS NOT NULL THEN RETURN NULL; END IF;
  IF p_k = COALESCE(jsonb_array_length(r.answers), 0) THEN
    UPDATE daily_results SET answers = COALESCE(answers, '[]') || jsonb_build_array(jsonb_build_object('ok', COALESCE(p_ok, FALSE), 'ms', GREATEST(0, COALESCE(p_ms, 0))))
    WHERE user_id = me AND day = today;
    RETURN p_k + 1;
  END IF;
  RETURN jsonb_array_length(r.answers);
END $$
--;;
GRANT EXECUTE ON FUNCTION dc_answer(INT, BOOLEAN, INT) TO authenticated
--;;
CREATE OR REPLACE FUNCTION dc_submit(p_answers JSONB, p_ms INT) RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE me UUID := auth.uid(); today DATE := (now() AT TIME ZONE 'UTC')::DATE; r daily_results; sc INT; tot INT; st INT; pts INT; ans JSONB;
BEGIN
  SELECT * INTO r FROM daily_results WHERE user_id = me AND day = today FOR UPDATE;
  IF r.user_id IS NULL THEN RAISE EXCEPTION 'Défi non commencé.'; END IF;
  IF r.finished_at IS NOT NULL THEN RETURN dc_get(NULL); END IF;
  SELECT jsonb_array_length(items) INTO tot FROM daily_challenges WHERE day = today;
  -- les réponses enregistrées au fil de l'eau font foi
  ans := CASE WHEN COALESCE(jsonb_array_length(r.answers), 0) > 0 THEN r.answers ELSE COALESCE(p_answers, '[]') END;
  SELECT count(*) FILTER (WHERE (a->>'ok')::BOOLEAN) INTO sc FROM jsonb_array_elements(ans) WITH ORDINALITY t(a, i) WHERE i <= tot;
  st := dc_streak(me, today) + 1;
  pts := sc * dc_cfg('per_good', 5) + LEAST(dc_cfg('streak_max', 20), (st - 1) * dc_cfg('streak_step', 2));
  UPDATE daily_results SET finished_at = now(), score = sc, total = tot,
    ms = LEAST(GREATEST(COALESCE((SELECT sum((a->>'ms')::INT) FROM jsonb_array_elements(ans) a), p_ms, 0), 0), (EXTRACT(EPOCH FROM (now() - started_at)) * 1000)::INT + 1000),
    answers = ans, points = pts, streak = st
  WHERE user_id = me AND day = today;
  INSERT INTO game_sessions (user_id, game, level, score, total, xp) VALUES (me, 'defi', 1, sc, tot, pts);
  PERFORM award_badges(me);
  RETURN dc_get(NULL);
END $$
--;;
CREATE OR REPLACE FUNCTION dc_get_progress() RETURNS JSONB LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE((SELECT answers FROM daily_results WHERE user_id = auth.uid() AND day = (now() AT TIME ZONE 'UTC')::DATE AND finished_at IS NULL), '[]')
$$
--;;
GRANT EXECUTE ON FUNCTION dc_get_progress() TO authenticated
