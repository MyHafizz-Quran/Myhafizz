-- Ligues de la semaine (lundi 00 h → dimanche 23 h 59, UTC = heure de Bamako et d'Abidjan).
INSERT INTO game_settings (key, value) VALUES ('ligue', '{"enabled": true, "size": 30, "up": 7, "down": 5, "learn_day": 20, "start": "2026-11-02"}') ON CONFLICT (key) DO NOTHING
--;;
CREATE TABLE IF NOT EXISTS league_players (
  user_id UUID PRIMARY KEY REFERENCES neon_auth."user"(id) ON DELETE CASCADE,
  tier SMALLINT NOT NULL DEFAULT 1 CHECK (tier BETWEEN 1 AND 6),
  best_tier SMALLINT NOT NULL DEFAULT 1
)
--;;
CREATE TABLE IF NOT EXISTS league_members (
  week DATE NOT NULL,
  user_id UUID NOT NULL REFERENCES neon_auth."user"(id) ON DELETE CASCADE,
  tier SMALLINT NOT NULL,
  grp INT NOT NULL,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  points INT, pos INT, players INT, result TEXT CHECK (result IN ('up', 'down', 'stay')),
  nudged_at TIMESTAMPTZ, seen_at TIMESTAMPTZ,
  PRIMARY KEY (week, user_id)
)
--;;
CREATE INDEX IF NOT EXISTS league_members_grp ON league_members (week, tier, grp)
--;;
CREATE TABLE IF NOT EXISTS league_weeks (week DATE PRIMARY KEY, closed_at TIMESTAMPTZ NOT NULL DEFAULT NOW())
--;;
ALTER TABLE league_players ENABLE ROW LEVEL SECURITY
--;;
ALTER TABLE league_members ENABLE ROW LEVEL SECURITY
--;;
ALTER TABLE league_weeks ENABLE ROW LEVEL SECURITY
--;;
REVOKE ALL ON league_players, league_members, league_weeks FROM authenticated
--;;
CREATE OR REPLACE FUNCTION lg_cfg(p_key TEXT, p_default INT) RETURNS INT LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE((SELECT (value ->> p_key)::INT FROM game_settings WHERE key = 'ligue'), p_default)
$$
--;;
CREATE OR REPLACE FUNCTION lg_week(p_at TIMESTAMPTZ DEFAULT now()) RETURNS DATE LANGUAGE sql STABLE AS $$
  SELECT date_trunc('week', p_at AT TIME ZONE 'UTC')::DATE
$$
--;;
CREATE OR REPLACE FUNCTION lg_on() RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE((SELECT (value ->> 'enabled')::BOOLEAN AND lg_week() >= COALESCE((value ->> 'start')::DATE, '2000-01-01') FROM game_settings WHERE key = 'ligue'), TRUE)
$$
--;;
-- Points de ligue d'un joueur sur une semaine : jours d'apprentissage + points gagnés (les pertes ne comptent pas ici).
CREATE OR REPLACE FUNCTION lg_points(p_uid UUID, p_week DATE) RETURNS INT LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT (COALESCE((SELECT sum(GREATEST(xp, 0)) FROM game_sessions WHERE user_id = p_uid AND created_at >= p_week::TIMESTAMP AT TIME ZONE 'UTC' AND created_at < (p_week + 7)::TIMESTAMP AT TIME ZONE 'UTC'), 0)
    + lg_cfg('learn_day', 20) * (SELECT count(*) FROM activity_days WHERE user_id = p_uid AND day >= p_week AND day < p_week + 7 AND actions > 0))::INT
$$
--;;
-- Taille des zones selon le nombre de joueurs du groupe (petits groupes au début : on reste juste).
CREATE OR REPLACE FUNCTION lg_up(p_n INT, p_tier INT) RETURNS INT LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT CASE WHEN p_tier >= 6 OR p_n < 1 THEN 0 ELSE LEAST(lg_cfg('up', 7), GREATEST(1, ceil(p_n * 0.25)::INT)) END
$$
--;;
CREATE OR REPLACE FUNCTION lg_down(p_n INT, p_tier INT) RETURNS INT LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT CASE WHEN p_tier <= 1 OR p_n < 6 THEN 0 ELSE LEAST(lg_cfg('down', 5), (p_n / 6)) END
$$
--;;
-- Entrée dans la ligue de la semaine au premier point.
CREATE OR REPLACE FUNCTION lg_join(p_uid UUID) RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE w DATE := lg_week(); t INT; g INT;
BEGIN
  IF p_uid IS NULL OR NOT lg_on() OR EXISTS (SELECT 1 FROM league_members WHERE week = w AND user_id = p_uid) THEN RETURN; END IF;
  INSERT INTO league_players (user_id) VALUES (p_uid) ON CONFLICT DO NOTHING;
  SELECT tier INTO t FROM league_players WHERE user_id = p_uid;
  PERFORM pg_advisory_xact_lock(hashtext('ligue:' || w || ':' || t));
  SELECT grp INTO g FROM league_members WHERE week = w AND tier = t GROUP BY grp HAVING count(*) < lg_cfg('size', 30) ORDER BY grp LIMIT 1;
  IF g IS NULL THEN SELECT COALESCE(max(grp), 0) + 1 INTO g FROM league_members WHERE week = w AND tier = t; END IF;
  INSERT INTO league_members (week, user_id, tier, grp) VALUES (w, p_uid, t, g) ON CONFLICT DO NOTHING;
END $$
--;;
CREATE OR REPLACE FUNCTION lg_trg() RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_TABLE_NAME = 'game_sessions' THEN
    IF COALESCE(NEW.xp, 0) <= 0 THEN RETURN NEW; END IF;
  ELSE
    IF COALESCE(NEW.actions, 0) <= 0 THEN RETURN NEW; END IF;
  END IF;
  BEGIN PERFORM lg_join(NEW.user_id); EXCEPTION WHEN OTHERS THEN NULL; END;
  RETURN NEW;
END $$
--;;
DROP TRIGGER IF EXISTS trg_lg_games ON game_sessions
--;;
CREATE TRIGGER trg_lg_games AFTER INSERT ON game_sessions FOR EACH ROW EXECUTE FUNCTION lg_trg()
--;;
DROP TRIGGER IF EXISTS trg_lg_activity ON activity_days
--;;
CREATE TRIGGER trg_lg_activity AFTER INSERT OR UPDATE ON activity_days FOR EACH ROW EXECUTE FUNCTION lg_trg()
--;;
-- Classement d'un groupe, calculé en direct.
CREATE OR REPLACE FUNCTION lg_board(p_week DATE, p_tier INT, p_grp INT) RETURNS TABLE (user_id UUID, points INT, pos INT, players INT) LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  WITH m AS (SELECT lm.user_id, lg_points(lm.user_id, p_week) AS points, lm.joined_at FROM league_members lm WHERE lm.week = p_week AND lm.tier = p_tier AND lm.grp = p_grp)
  SELECT user_id, points, (row_number() OVER (ORDER BY points DESC, joined_at))::INT, (count(*) OVER ())::INT FROM m
$$
--;;
CREATE OR REPLACE FUNCTION lg_get() RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE me UUID := auth.uid(); w DATE := lg_week(); m league_members; last league_members; t INT; n INT;
BEGIN
  IF me IS NULL THEN RAISE EXCEPTION 'non connecté'; END IF;
  SELECT * INTO m FROM league_members WHERE week = w AND user_id = me;
  SELECT * INTO last FROM league_members WHERE week < w AND user_id = me AND result IS NOT NULL ORDER BY week DESC LIMIT 1;
  SELECT tier INTO t FROM league_players WHERE user_id = me;
  IF m.user_id IS NOT NULL THEN SELECT count(*) INTO n FROM league_members WHERE week = w AND tier = m.tier AND grp = m.grp; END IF;
  RETURN jsonb_build_object('enabled', lg_on(), 'now', now(), 'ends_at', (w + 7)::TIMESTAMP AT TIME ZONE 'UTC', 'week', w,
    'tier', COALESCE(m.tier, t, 1), 'joined', m.user_id IS NOT NULL, 'learn_day', lg_cfg('learn_day', 20),
    'up', CASE WHEN m.user_id IS NOT NULL THEN lg_up(n, m.tier) END, 'down', CASE WHEN m.user_id IS NOT NULL THEN lg_down(n, m.tier) END,
    'board', CASE WHEN m.user_id IS NOT NULL THEN (SELECT jsonb_agg(jsonb_build_object('pos', b.pos, 'points', b.points, 'me', b.user_id = me, 'p', player_card(b.user_id)) ORDER BY b.pos) FROM lg_board(w, m.tier, m.grp) b) END,
    'last', CASE WHEN last.user_id IS NOT NULL AND last.seen_at IS NULL AND last.week = w - 7 THEN jsonb_build_object('week', last.week, 'tier', last.tier, 'pos', last.pos, 'players', last.players, 'points', last.points, 'result', last.result,
      'days', (SELECT count(*) FROM activity_days a WHERE a.user_id = me AND a.day >= last.week AND a.day < last.week + 7 AND a.actions > 0)) END);
END $$
--;;
CREATE OR REPLACE FUNCTION lg_seen() RETURNS VOID LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  UPDATE league_members SET seen_at = now() WHERE user_id = auth.uid() AND week < lg_week() AND seen_at IS NULL
$$
--;;
-- Clôture des semaines passées : classement final, montées, descentes, badges.
CREATE OR REPLACE FUNCTION lg_close_due() RETURNS INT LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE w DATE; g RECORD; b RECORD; up INT; dn INT; res TEXT; done INT := 0;
BEGIN
  FOR w IN SELECT DISTINCT week FROM league_members WHERE week < lg_week() AND week NOT IN (SELECT week FROM league_weeks) ORDER BY week LOOP
    FOR g IN SELECT DISTINCT tier, grp FROM league_members WHERE week = w LOOP
      FOR b IN SELECT * FROM lg_board(w, g.tier, g.grp) LOOP
        up := lg_up(b.players, g.tier); dn := lg_down(b.players, g.tier);
        res := CASE WHEN b.pos <= up THEN 'up' WHEN b.pos > b.players - dn THEN 'down' ELSE 'stay' END;
        UPDATE league_members SET points = b.points, pos = b.pos, players = b.players, result = res WHERE week = w AND user_id = b.user_id;
        UPDATE league_players SET tier = LEAST(6, GREATEST(1, g.tier + CASE res WHEN 'up' THEN 1 WHEN 'down' THEN -1 ELSE 0 END)),
          best_tier = GREATEST(best_tier, LEAST(6, g.tier + CASE res WHEN 'up' THEN 1 ELSE 0 END)) WHERE user_id = b.user_id;
        IF b.pos <= 3 AND b.players >= 3 THEN INSERT INTO player_badges (user_id, badge) VALUES (b.user_id, 'league_podium') ON CONFLICT DO NOTHING; END IF;
        IF res = 'up' AND g.tier + 1 = 6 THEN INSERT INTO player_badges (user_id, badge) VALUES (b.user_id, 'league_diamant') ON CONFLICT DO NOTHING; END IF;
        PERFORM notify(b.user_id, 'league_result', NULL, NULL, jsonb_build_object('result', res, 'tier', g.tier, 'new_tier', LEAST(6, GREATEST(1, g.tier + CASE res WHEN 'up' THEN 1 WHEN 'down' THEN -1 ELSE 0 END)), 'pos', b.pos, 'players', b.players), res = 'up');
      END LOOP;
    END LOOP;
    INSERT INTO league_weeks (week) VALUES (w);
    done := done + 1;
  END LOOP;
  RETURN done;
END $$
--;;
-- Dimanche après-midi : un seul message, seulement si la montée est à portée.
CREATE OR REPLACE FUNCTION lg_nudge_due() RETURNS INT LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE w DATE := lg_week(); g RECORD; b RECORD; up INT; target INT; n INT := 0;
BEGIN
  IF NOT lg_on() OR extract(isodow FROM now() AT TIME ZONE 'UTC') <> 7 OR extract(hour FROM now() AT TIME ZONE 'UTC') NOT BETWEEN 15 AND 17 THEN RETURN 0; END IF;
  FOR g IN SELECT DISTINCT tier, grp FROM league_members WHERE week = w AND tier < 6 LOOP
    target := NULL;
    FOR b IN SELECT * FROM lg_board(w, g.tier, g.grp) ORDER BY pos LOOP
      up := lg_up(b.players, g.tier);
      IF b.pos = up THEN target := b.points; END IF;
      IF target IS NOT NULL AND b.pos > up AND b.pos <= up + 3 AND target - b.points + 1 <= 60 THEN
        UPDATE league_members SET nudged_at = now() WHERE week = w AND user_id = b.user_id AND nudged_at IS NULL;
        IF FOUND THEN
          PERFORM notify(b.user_id, 'league_nudge', NULL, NULL, jsonb_build_object('gap', target - b.points + 1, 'tier', g.tier + 1), TRUE);
          n := n + 1;
        END IF;
      END IF;
    END LOOP;
  END LOOP;
  RETURN n;
END $$
--;;
REVOKE ALL ON FUNCTION lg_cfg(TEXT, INT), lg_on(), lg_points(UUID, DATE), lg_up(INT, INT), lg_down(INT, INT), lg_join(UUID), lg_board(DATE, INT, INT), lg_close_due(), lg_nudge_due() FROM PUBLIC, authenticated
--;;
GRANT EXECUTE ON FUNCTION lg_get(), lg_seen() TO authenticated
--;;
GRANT EXECUTE ON FUNCTION lg_close_due(), lg_nudge_due() TO reminder_worker
