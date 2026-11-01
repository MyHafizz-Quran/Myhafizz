-- Tournois à élimination directe : duels en direct, tour après tour, jusqu'à la finale (heure UTC = Bamako, Abidjan).
INSERT INTO game_settings (key, value) VALUES ('tournoi', '{"enabled": true, "win": 200, "final": 100, "semi": 50, "wait_secs": 60, "gap_secs": 60}') ON CONFLICT (key) DO NOTHING
--;;
CREATE TABLE IF NOT EXISTS tournaments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  starts_at TIMESTAMPTZ NOT NULL,
  size SMALLINT NOT NULL DEFAULT 16 CHECK (size IN (8, 16)),
  group_id UUID REFERENCES study_groups(id) ON DELETE CASCADE,
  created_by UUID REFERENCES neon_auth."user"(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'running', 'done', 'cancelled')),
  round SMALLINT NOT NULL DEFAULT 0,
  rounds SMALLINT,
  champion UUID REFERENCES neon_auth."user"(id) ON DELETE SET NULL,
  reminded_at TIMESTAMPTZ,
  finished_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
)
--;;
CREATE INDEX IF NOT EXISTS tournaments_start ON tournaments (status, starts_at)
--;;
CREATE TABLE IF NOT EXISTS tournament_players (
  tournament_id UUID NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES neon_auth."user"(id) ON DELETE CASCADE,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  seen_at TIMESTAMPTZ,
  out_round SMALLINT,
  place SMALLINT,
  points INT,
  PRIMARY KEY (tournament_id, user_id)
)
--;;
CREATE TABLE IF NOT EXISTS tournament_matches (
  tournament_id UUID NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
  round SMALLINT NOT NULL,
  slot SMALLINT NOT NULL,
  p1 UUID REFERENCES neon_auth."user"(id) ON DELETE SET NULL,
  p2 UUID REFERENCES neon_auth."user"(id) ON DELETE SET NULL,
  ready_at TIMESTAMPTZ NOT NULL,
  duel_id UUID REFERENCES live_duels(id) ON DELETE SET NULL,
  winner UUID,
  how TEXT CHECK (how IN ('duel', 'bye', 'forfeit')),
  PRIMARY KEY (tournament_id, round, slot)
)
--;;
ALTER TABLE live_duels ADD COLUMN IF NOT EXISTS tournament_id UUID REFERENCES tournaments(id) ON DELETE SET NULL
--;;
ALTER TABLE tournaments ENABLE ROW LEVEL SECURITY
--;;
ALTER TABLE tournament_players ENABLE ROW LEVEL SECURITY
--;;
ALTER TABLE tournament_matches ENABLE ROW LEVEL SECURITY
--;;
REVOKE ALL ON tournaments, tournament_players, tournament_matches FROM authenticated
--;;
CREATE OR REPLACE FUNCTION tn_cfg(p_key TEXT, p_default INT) RETURNS INT LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE((SELECT (value ->> p_key)::INT FROM game_settings WHERE key = 'tournoi'), p_default)
$$
--;;
-- Duels de tournoi : pas de points de duel, et pas d'égalité (départage au temps de réponse).
DO $$ DECLARE s TEXT := pg_get_functiondef('ld_finish(uuid)'::regprocedure);
BEGIN
  IF position('tournament_id' IN s) = 0 THEN
    s := replace(s, '  UPDATE live_duels SET status = ''done'', winner = w,', '  IF d.tournament_id IS NOT NULL THEN
    pc := 0; po := 0;
    IF w IS NULL THEN
      w := CASE WHEN (SELECT COALESCE(sum((v ->> ''ms'')::INT), 0) FROM jsonb_each(d.ans_c) e(k, v)) + (n - (SELECT count(*) FROM jsonb_object_keys(d.ans_c))) * 30000
              <= (SELECT COALESCE(sum((v ->> ''ms'')::INT), 0) FROM jsonb_each(d.ans_o) e(k, v)) + (n - (SELECT count(*) FROM jsonb_object_keys(d.ans_o))) * 30000
             THEN d.challenger ELSE d.opponent END;
    END IF;
  END IF;
  UPDATE live_duels SET status = ''done'', winner = w,');
    EXECUTE s;
  END IF;
END $$
--;;
DO $$ DECLARE s TEXT := pg_get_functiondef('ld_state(uuid)'::regprocedure);
BEGIN
  IF position('tournament' IN s) = 0 THEN
    s := replace(s, '''rematch_of'', d.rematch_of,', '''rematch_of'', d.rematch_of, ''tournament'', d.tournament_id,');
    EXECUTE s;
  END IF;
END $$
--;;
-- Avance un tournoi : départ, forfaits, création des duels, tours suivants, fin et récompenses.
CREATE OR REPLACE FUNCTION tn_tick(p_id UUID, p_candidates JSONB DEFAULT NULL) RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE t tournaments; n INT; b INT; seeds UUID[]; s INT; m RECORD; d live_duels; want INT := ld_cfg('questions', 7);
  picked JSONB; ks TEXT[]; c JSONB; did UUID; s1 TIMESTAMPTZ; s2 TIMESTAMPTZ; w UUID; left_ INT; nr INT; wins UUID[]; loser UUID; wait INT := tn_cfg('wait_secs', 60);
BEGIN
  SELECT * INTO t FROM tournaments WHERE id = p_id FOR UPDATE;
  IF t.id IS NULL OR t.status IN ('done', 'cancelled') THEN RETURN; END IF;
  IF t.status = 'open' THEN
    IF now() < t.starts_at THEN RETURN; END IF;
    SELECT count(*) INTO n FROM tournament_players WHERE tournament_id = t.id;
    IF n < 4 THEN
      UPDATE tournaments SET status = 'cancelled', finished_at = now() WHERE id = t.id;
      PERFORM notify(tp.user_id, 'tournoi_cancel', NULL, t.id, jsonb_build_object('title', t.title, 'players', n), FALSE) FROM tournament_players tp WHERE tp.tournament_id = t.id;
      RETURN;
    END IF;
    b := CASE WHEN n <= 4 THEN 4 WHEN n <= 8 THEN 8 ELSE 16 END;
    SELECT array_agg(user_id ORDER BY random()) INTO seeds FROM tournament_players WHERE tournament_id = t.id;
    FOR s IN 0 .. b / 2 - 1 LOOP
      INSERT INTO tournament_matches (tournament_id, round, slot, p1, p2, ready_at, winner, how)
      VALUES (t.id, 1, s, seeds[s + 1], CASE WHEN b - s <= n THEN seeds[b - s] END, now(),
        CASE WHEN b - s > n THEN seeds[s + 1] END, CASE WHEN b - s > n THEN 'bye' END);
    END LOOP;
    UPDATE tournaments SET status = 'running', round = 1, rounds = (ln(b) / ln(2))::INT WHERE id = t.id;
    SELECT * INTO t FROM tournaments WHERE id = t.id;
  END IF;
  -- matchs du tour en cours
  FOR m IN SELECT * FROM tournament_matches WHERE tournament_id = t.id AND round = t.round AND winner IS NULL ORDER BY slot LOOP
    IF m.duel_id IS NOT NULL THEN
      PERFORM ld_tick(m.duel_id);
      SELECT * INTO d FROM live_duels WHERE id = m.duel_id;
      -- sécurité : un duel bloqué plus de 15 min est clos
      IF d.status = 'playing' AND d.started_at < now() - interval '15 minutes' THEN PERFORM ld_finish(d.id); SELECT * INTO d FROM live_duels WHERE id = m.duel_id; END IF;
      IF d.status = 'done' THEN UPDATE tournament_matches SET winner = COALESCE(d.winner, m.p1), how = 'duel' WHERE tournament_id = t.id AND round = m.round AND slot = m.slot; END IF;
      CONTINUE;
    END IF;
    IF now() < m.ready_at THEN CONTINUE; END IF;
    SELECT seen_at INTO s1 FROM tournament_players WHERE tournament_id = t.id AND user_id = m.p1;
    SELECT seen_at INTO s2 FROM tournament_players WHERE tournament_id = t.id AND user_id = m.p2;
    IF s1 > now() - interval '12 seconds' AND s2 > now() - interval '12 seconds' AND p_candidates IS NOT NULL AND auth.uid() IN (m.p1, m.p2) THEN
      picked := '[]'; ks := '{}';
      FOR c IN SELECT value FROM jsonb_array_elements(p_candidates) LOOP
        EXIT WHEN jsonb_array_length(picked) >= want;
        CONTINUE WHEN c->>'key' IS NULL OR (c->>'key') = ANY (ks);
        CONTINUE WHEN EXISTS (SELECT 1 FROM game_seen g WHERE g.qkey = c->>'key' AND g.user_id IN (m.p1, m.p2) AND g.seen_at > now() - interval '30 days');
        picked := picked || jsonb_build_array(c); ks := ks || (c->>'key');
      END LOOP;
      FOR c IN SELECT value FROM jsonb_array_elements(p_candidates) LOOP
        EXIT WHEN jsonb_array_length(picked) >= want;
        CONTINUE WHEN c->>'key' IS NULL OR (c->>'key') = ANY (ks);
        picked := picked || jsonb_build_array(c); ks := ks || (c->>'key');
      END LOOP;
      IF jsonb_array_length(picked) >= 3 THEN
        INSERT INTO live_duels (challenger, opponent, items, keys, status, invite_expires_at, started_at, q_index, q_started_at, tournament_id)
        VALUES (m.p1, m.p2, picked, ks, 'playing', now(), now(), 0, now() + interval '5 seconds', t.id) RETURNING id INTO did;
        INSERT INTO game_seen (user_id, qkey) SELECT u, k FROM unnest(ARRAY[m.p1, m.p2]) u, unnest(ks) k ON CONFLICT (user_id, qkey) DO UPDATE SET seen_at = now();
        UPDATE tournament_matches SET duel_id = did WHERE tournament_id = t.id AND round = m.round AND slot = m.slot;
      END IF;
    ELSIF now() > m.ready_at + make_interval(secs => wait) THEN
      -- absent : le joueur présent passe (si personne, le dernier vu)
      w := CASE WHEN COALESCE(s1, '-infinity') >= COALESCE(s2, '-infinity') THEN m.p1 ELSE m.p2 END;
      UPDATE tournament_matches SET winner = w, how = 'forfeit' WHERE tournament_id = t.id AND round = m.round AND slot = m.slot;
    END IF;
  END LOOP;
  -- tour terminé ?
  SELECT count(*) FILTER (WHERE winner IS NULL) INTO left_ FROM tournament_matches WHERE tournament_id = t.id AND round = t.round;
  IF left_ > 0 THEN RETURN; END IF;
  -- les perdants du tour sont éliminés
  UPDATE tournament_players tp SET out_round = t.round FROM tournament_matches mm
  WHERE mm.tournament_id = t.id AND mm.round = t.round AND tp.tournament_id = t.id AND tp.user_id IN (mm.p1, mm.p2) AND tp.user_id <> mm.winner;
  SELECT array_agg(winner ORDER BY slot) INTO wins FROM tournament_matches WHERE tournament_id = t.id AND round = t.round;
  IF array_length(wins, 1) = 1 THEN
    -- finale jouée : classement et récompenses
    UPDATE tournaments SET status = 'done', champion = wins[1], finished_at = now() WHERE id = t.id;
    UPDATE tournament_players SET place = 1, points = tn_cfg('win', 200) WHERE tournament_id = t.id AND user_id = wins[1];
    UPDATE tournament_players SET place = 2, points = tn_cfg('final', 100) WHERE tournament_id = t.id AND out_round = t.round;
    UPDATE tournament_players SET place = 3, points = tn_cfg('semi', 50) WHERE tournament_id = t.id AND out_round = t.round - 1 AND t.round >= 2;
    INSERT INTO game_sessions (user_id, game, level, score, total, xp)
      SELECT user_id, 'tournoi', 1, CASE place WHEN 1 THEN 3 WHEN 2 THEN 2 ELSE 1 END, 3, points FROM tournament_players WHERE tournament_id = t.id AND points > 0;
    INSERT INTO player_badges (user_id, badge) VALUES (wins[1], 'tournoi_champion') ON CONFLICT DO NOTHING;
    INSERT INTO player_badges (user_id, badge) SELECT user_id, 'tournoi_finale' FROM tournament_players WHERE tournament_id = t.id AND place <= 2 ON CONFLICT DO NOTHING;
    PERFORM notify(tp.user_id, 'tournoi_done', wins[1], t.id, jsonb_build_object('title', t.title, 'place', tp.place, 'points', tp.points), FALSE) FROM tournament_players tp WHERE tp.tournament_id = t.id;
    RETURN;
  END IF;
  nr := t.round + 1;
  FOR s IN 0 .. array_length(wins, 1) / 2 - 1 LOOP
    INSERT INTO tournament_matches (tournament_id, round, slot, p1, p2, ready_at)
    VALUES (t.id, nr, s, wins[2 * s + 1], wins[2 * s + 2], now() + make_interval(secs => tn_cfg('gap_secs', 60)));
    PERFORM notify(u, 'tournoi_round', NULL, t.id, jsonb_build_object('title', t.title, 'round', nr, 'rounds', t.rounds), TRUE) FROM unnest(ARRAY[wins[2 * s + 1], wins[2 * s + 2]]) u;
  END LOOP;
  UPDATE tournaments SET round = nr WHERE id = t.id;
END $$
--;;
CREATE OR REPLACE FUNCTION tn_card(t tournaments, me UUID) RETURNS JSONB LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT jsonb_build_object('id', t.id, 'title', t.title, 'starts_at', t.starts_at, 'size', t.size, 'status', t.status, 'round', t.round, 'rounds', t.rounds,
    'group', (SELECT jsonb_build_object('id', g.id, 'name', g.name, 'kind', g.kind) FROM study_groups g WHERE g.id = t.group_id),
    'players', (SELECT count(*) FROM tournament_players WHERE tournament_id = t.id),
    'joined', EXISTS (SELECT 1 FROM tournament_players WHERE tournament_id = t.id AND user_id = me),
    'mine', t.created_by = me, 'champion', CASE WHEN t.champion IS NOT NULL THEN player_card(t.champion) END)
$$
--;;
CREATE OR REPLACE FUNCTION tn_visible(t tournaments, me UUID) RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT t.group_id IS NULL OR EXISTS (SELECT 1 FROM group_members gm WHERE gm.group_id = t.group_id AND gm.user_id = me)
$$
--;;
CREATE OR REPLACE FUNCTION tn_list() RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE me UUID := auth.uid();
BEGIN
  IF me IS NULL THEN RAISE EXCEPTION 'non connecté'; END IF;
  RETURN jsonb_build_object('enabled', COALESCE((SELECT (value->>'enabled')::BOOLEAN FROM game_settings WHERE key = 'tournoi'), TRUE), 'now', now(),
    'items', COALESCE((SELECT jsonb_agg(tn_card(t, me) ORDER BY (t.status IN ('open', 'running')) DESC, CASE WHEN t.status IN ('open', 'running') THEN t.starts_at END, t.starts_at DESC)
      FROM (SELECT * FROM tournaments t WHERE tn_visible(t, me) AND (t.status IN ('open', 'running') OR t.starts_at > now() - interval '7 days') ORDER BY t.starts_at DESC LIMIT 12) t), '[]'),
    'groups', COALESCE((SELECT jsonb_agg(jsonb_build_object('id', g.id, 'name', g.name)) FROM study_groups g WHERE g.owner_id = me AND g.kind <> 'duo'), '[]'));
END $$
--;;
CREATE OR REPLACE FUNCTION tn_state(p_id UUID, p_candidates JSONB DEFAULT NULL) RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE me UUID := auth.uid(); t tournaments; tp tournament_players; my RECORD;
BEGIN
  IF me IS NULL THEN RAISE EXCEPTION 'non connecté'; END IF;
  SELECT * INTO t FROM tournaments WHERE id = p_id;
  IF t.id IS NULL OR NOT tn_visible(t, me) THEN RAISE EXCEPTION 'Tournoi introuvable.'; END IF;
  UPDATE tournament_players SET seen_at = now() WHERE tournament_id = t.id AND user_id = me;
  PERFORM tn_tick(t.id, p_candidates);
  SELECT * INTO t FROM tournaments WHERE id = p_id;
  SELECT * INTO tp FROM tournament_players WHERE tournament_id = t.id AND user_id = me;
  SELECT * INTO my FROM tournament_matches WHERE tournament_id = t.id AND round = t.round AND me IN (p1, p2) AND t.status = 'running';
  RETURN tn_card(t, me) || jsonb_build_object('now', now(), 'me_card', player_card(me), 'wait_secs', tn_cfg('wait_secs', 60),
    'prizes', jsonb_build_object('win', tn_cfg('win', 200), 'final', tn_cfg('final', 100), 'semi', tn_cfg('semi', 50)),
    'list', CASE WHEN t.status = 'open' THEN (SELECT jsonb_agg(player_card(user_id) ORDER BY joined_at) FROM tournament_players WHERE tournament_id = t.id) END,
    'me', CASE WHEN tp.user_id IS NOT NULL THEN jsonb_build_object('out_round', tp.out_round, 'place', tp.place, 'points', tp.points) END,
    'match', CASE WHEN my.slot IS NOT NULL THEN jsonb_build_object('round', my.round, 'ready_at', my.ready_at, 'duel', my.duel_id, 'winner', my.winner = me, 'done', my.winner IS NOT NULL,
      'them', player_card(CASE WHEN my.p1 = me THEN my.p2 ELSE my.p1 END)) END,
    'need_pool', my.slot IS NOT NULL AND my.duel_id IS NULL AND my.winner IS NULL AND now() >= my.ready_at - interval '8 seconds',
    'rounds_list', (SELECT jsonb_agg(r ORDER BY (r->>'round')::INT) FROM (
      SELECT jsonb_build_object('round', mm.round, 'matches', jsonb_agg(jsonb_build_object('slot', mm.slot, 'how', mm.how,
        'p1', CASE WHEN mm.p1 IS NOT NULL THEN player_card(mm.p1) END, 'p2', CASE WHEN mm.p2 IS NOT NULL THEN player_card(mm.p2) END,
        's1', CASE WHEN ld.id IS NOT NULL THEN ld.score_c END, 's2', CASE WHEN ld.id IS NOT NULL THEN ld.score_o END,
        'winner', CASE WHEN mm.winner IS NULL THEN NULL WHEN mm.winner = mm.p1 THEN 1 ELSE 2 END, 'live', ld.status = 'playing') ORDER BY mm.slot)) AS r
      FROM tournament_matches mm LEFT JOIN live_duels ld ON ld.id = mm.duel_id WHERE mm.tournament_id = t.id GROUP BY mm.round) x));
END $$
--;;
CREATE OR REPLACE FUNCTION tn_join(p_id UUID, p_join BOOLEAN) RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE me UUID := auth.uid(); t tournaments;
BEGIN
  IF me IS NULL THEN RAISE EXCEPTION 'non connecté'; END IF;
  SELECT * INTO t FROM tournaments WHERE id = p_id FOR UPDATE;
  IF t.id IS NULL OR NOT tn_visible(t, me) THEN RAISE EXCEPTION 'Tournoi introuvable.'; END IF;
  IF t.status <> 'open' OR now() >= t.starts_at THEN RAISE EXCEPTION 'Les inscriptions sont fermées.'; END IF;
  IF p_join THEN
    IF (SELECT count(*) FROM tournament_players WHERE tournament_id = t.id) >= t.size THEN RAISE EXCEPTION 'Le tournoi est complet.'; END IF;
    INSERT INTO tournament_players (tournament_id, user_id) VALUES (t.id, me) ON CONFLICT DO NOTHING;
  ELSE
    DELETE FROM tournament_players WHERE tournament_id = t.id AND user_id = me;
  END IF;
  RETURN tn_state(t.id, NULL);
END $$
--;;
-- Tournoi privé d'un groupe : créé par le responsable du groupe.
CREATE OR REPLACE FUNCTION tn_create(p_group UUID, p_title TEXT, p_starts TIMESTAMPTZ, p_size INT) RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE me UUID := auth.uid(); tid UUID;
BEGIN
  IF me IS NULL THEN RAISE EXCEPTION 'non connecté'; END IF;
  IF NOT EXISTS (SELECT 1 FROM study_groups WHERE id = p_group AND owner_id = me) THEN RAISE EXCEPTION 'Seul le responsable du groupe peut créer un tournoi.'; END IF;
  IF p_starts < now() + interval '10 minutes' OR p_starts > now() + interval '30 days' THEN RAISE EXCEPTION 'Choisis une date dans les 30 prochains jours (au moins 10 minutes à l''avance).'; END IF;
  IF (SELECT count(*) FROM tournaments WHERE group_id = p_group AND status = 'open') >= 3 THEN RAISE EXCEPTION 'Ce groupe a déjà 3 tournois à venir.'; END IF;
  INSERT INTO tournaments (title, starts_at, size, group_id, created_by)
  VALUES (COALESCE(NULLIF(left(trim(p_title), 60), ''), 'Tournoi du groupe'), p_starts, CASE WHEN p_size = 8 THEN 8 ELSE 16 END, p_group, me) RETURNING id INTO tid;
  INSERT INTO tournament_players (tournament_id, user_id) VALUES (tid, me);
  PERFORM notify(gm.user_id, 'tournoi_new', me, tid, jsonb_build_object('title', p_title, 'starts_at', p_starts), FALSE) FROM group_members gm WHERE gm.group_id = p_group AND gm.user_id <> me;
  RETURN tid;
END $$
--;;
CREATE OR REPLACE FUNCTION tn_cancel(p_id UUID) RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE t tournaments;
BEGIN
  SELECT * INTO t FROM tournaments WHERE id = p_id AND created_by = auth.uid() AND status = 'open' FOR UPDATE;
  IF t.id IS NULL THEN RAISE EXCEPTION 'Impossible d''annuler ce tournoi.'; END IF;
  UPDATE tournaments SET status = 'cancelled', finished_at = now() WHERE id = t.id;
  PERFORM notify(tp.user_id, 'tournoi_cancel', NULL, t.id, jsonb_build_object('title', t.title), FALSE) FROM tournament_players tp WHERE tp.tournament_id = t.id AND tp.user_id <> auth.uid();
END $$
--;;
-- Toutes les 5 min (Neon Function rappels) : rappel 10 min avant, départ et avancée des tournois.
CREATE OR REPLACE FUNCTION tn_cron() RETURNS INT LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE t tournaments; n INT := 0;
BEGIN
  FOR t IN SELECT * FROM tournaments WHERE status = 'open' AND reminded_at IS NULL AND starts_at <= now() + interval '11 minutes' AND starts_at > now() LOOP
    UPDATE tournaments SET reminded_at = now() WHERE id = t.id;
    PERFORM notify(tp.user_id, 'tournoi_soon', NULL, t.id, jsonb_build_object('title', t.title, 'starts_at', t.starts_at), TRUE) FROM tournament_players tp WHERE tp.tournament_id = t.id;
    n := n + 1;
  END LOOP;
  FOR t IN SELECT * FROM tournaments WHERE (status = 'open' AND starts_at <= now()) OR status = 'running' LOOP
    PERFORM tn_tick(t.id, NULL); n := n + 1;
  END LOOP;
  RETURN n;
END $$
--;;
REVOKE ALL ON FUNCTION tn_cfg(TEXT, INT), tn_tick(UUID, JSONB), tn_card(tournaments, UUID), tn_visible(tournaments, UUID), tn_cron() FROM PUBLIC, authenticated
--;;
GRANT EXECUTE ON FUNCTION tn_list(), tn_state(UUID, JSONB), tn_join(UUID, BOOLEAN), tn_create(UUID, TEXT, TIMESTAMPTZ, INT), tn_cancel(UUID) TO authenticated
--;;
GRANT EXECUTE ON FUNCTION tn_cron() TO reminder_worker
--;;
-- Premier tournoi officiel : vendredi 6 novembre 2026 à 21 h (Bamako, Abidjan).
INSERT INTO tournaments (title, starts_at, size) SELECT 'Tournoi du vendredi', '2026-11-06 21:00+00', 16
WHERE NOT EXISTS (SELECT 1 FROM tournaments WHERE group_id IS NULL AND starts_at = '2026-11-06 21:00+00')
