-- Duel en direct (remplace le duel en différé) : invitation par nom d'utilisateur, les deux joueurs en même temps,
-- points globaux (victoire +, défaite −, abandon −), grades, badges, centre de notifications.
UPDATE game_settings SET value = '{"enabled": true, "questions": 7, "secs": 15, "secs_ordre": 25, "invite_secs": 60, "win": 30, "draw": 5, "loss": 10, "quit": 20, "daily_limit": 30}' WHERE key = 'duel'
--;;
INSERT INTO game_settings (key, value) VALUES ('duel', '{"enabled": true, "questions": 7, "secs": 15, "secs_ordre": 25, "invite_secs": 60, "win": 30, "draw": 5, "loss": 10, "quit": 20, "daily_limit": 30}') ON CONFLICT (key) DO NOTHING
--;;
CREATE TABLE IF NOT EXISTS live_duels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  challenger UUID NOT NULL REFERENCES neon_auth."user"(id) ON DELETE CASCADE,
  opponent UUID NOT NULL REFERENCES neon_auth."user"(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'invited' CHECK (status IN ('invited','declined','expired','cancelled','playing','done')),
  items JSONB NOT NULL,
  keys TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  invite_expires_at TIMESTAMPTZ NOT NULL,
  started_at TIMESTAMPTZ,
  q_index SMALLINT NOT NULL DEFAULT 0,
  q_started_at TIMESTAMPTZ,
  q_closed_at TIMESTAMPTZ,
  ans_c JSONB NOT NULL DEFAULT '{}',
  ans_o JSONB NOT NULL DEFAULT '{}',
  score_c SMALLINT NOT NULL DEFAULT 0,
  score_o SMALLINT NOT NULL DEFAULT 0,
  winner UUID,
  quit_by UUID,
  points_c INT,
  points_o INT,
  rematch_of UUID REFERENCES live_duels(id) ON DELETE SET NULL,
  finished_at TIMESTAMPTZ
)
--;;
CREATE INDEX IF NOT EXISTS live_duels_c ON live_duels (challenger, created_at DESC)
--;;
CREATE INDEX IF NOT EXISTS live_duels_o ON live_duels (opponent, created_at DESC)
--;;
CREATE TABLE IF NOT EXISTS notifications (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES neon_auth."user"(id) ON DELETE CASCADE,
  kind TEXT NOT NULL,
  actor UUID REFERENCES neon_auth."user"(id) ON DELETE SET NULL,
  ref UUID,
  data JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  read_at TIMESTAMPTZ,
  push BOOLEAN NOT NULL DEFAULT TRUE,
  pushed_at TIMESTAMPTZ
)
--;;
CREATE INDEX IF NOT EXISTS notifications_user ON notifications (user_id, created_at DESC)
--;;
CREATE INDEX IF NOT EXISTS notifications_push ON notifications (created_at) WHERE push AND pushed_at IS NULL
--;;
CREATE TABLE IF NOT EXISTS player_badges (
  user_id UUID NOT NULL REFERENCES neon_auth."user"(id) ON DELETE CASCADE,
  badge TEXT NOT NULL,
  earned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, badge)
)
--;;
CREATE TABLE IF NOT EXISTS game_seen (
  user_id UUID NOT NULL REFERENCES neon_auth."user"(id) ON DELETE CASCADE,
  qkey TEXT NOT NULL,
  seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, qkey)
)
--;;
CREATE TABLE IF NOT EXISTS player_presence (
  user_id UUID PRIMARY KEY REFERENCES neon_auth."user"(id) ON DELETE CASCADE,
  seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
)
--;;
ALTER TABLE live_duels ENABLE ROW LEVEL SECURITY
--;;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY
--;;
ALTER TABLE player_badges ENABLE ROW LEVEL SECURITY
--;;
ALTER TABLE game_seen ENABLE ROW LEVEL SECURITY
--;;
ALTER TABLE player_presence ENABLE ROW LEVEL SECURITY
--;;
REVOKE ALL ON live_duels, notifications, player_badges, game_seen, player_presence FROM authenticated
--;;
DROP POLICY IF EXISTS "notif_worker" ON notifications
--;;
CREATE POLICY "notif_worker" ON notifications FOR ALL TO reminder_worker USING (TRUE) WITH CHECK (TRUE)
--;;
GRANT SELECT, UPDATE, INSERT ON notifications TO reminder_worker
--;;
GRANT USAGE ON SEQUENCE notifications_id_seq TO reminder_worker
--;;
CREATE OR REPLACE FUNCTION ld_cfg(p_key TEXT, p_default INT) RETURNS INT LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE((SELECT (value ->> p_key)::INT FROM game_settings WHERE key = 'duel'), p_default)
$$
--;;
CREATE OR REPLACE FUNCTION player_points(p_uid UUID) RETURNS INT LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT GREATEST(0, COALESCE(SUM(xp), 0))::INT FROM game_sessions WHERE user_id = p_uid
$$
--;;
CREATE OR REPLACE FUNCTION player_card(p_uid UUID) RETURNS JSONB LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT jsonb_build_object('id', u.id, 'username', p.username, 'name', COALESCE(p.full_name, u.name), 'image', u.image,
    'points', player_points(u.id), 'online', EXISTS (SELECT 1 FROM player_presence x WHERE x.user_id = u.id AND x.seen_at > now() - interval '90 seconds'))
  FROM neon_auth."user" u LEFT JOIN profiles p ON p.id = u.id WHERE u.id = p_uid
$$
--;;
CREATE OR REPLACE FUNCTION notify(p_user UUID, p_kind TEXT, p_actor UUID, p_ref UUID, p_data JSONB, p_push BOOLEAN DEFAULT TRUE) RETURNS VOID LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  INSERT INTO notifications (user_id, kind, actor, ref, data, push) VALUES (p_user, p_kind, p_actor, p_ref, COALESCE(p_data, '{}'), p_push)
$$
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
  SELECT count(*) FILTER (WHERE game = 'khatma'), count(*) FILTER (WHERE game IN ('lettres','suite','sourate','ordre','ilm') AND total > 0)
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
-- Fin du duel : vainqueur, points (jamais sous 0), séances de jeu, badges.
CREATE OR REPLACE FUNCTION ld_finish(p_id UUID) RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE d live_duels; w UUID; pc INT; po INT; n INT; win INT := ld_cfg('win', 30); dr INT := ld_cfg('draw', 5);
  loss INT := ld_cfg('loss', 10); qt INT := ld_cfg('quit', 20); ptc INT; pto INT;
BEGIN
  SELECT * INTO d FROM live_duels WHERE id = p_id FOR UPDATE;
  IF d.status <> 'playing' THEN RETURN; END IF;
  n := jsonb_array_length(d.items);
  ptc := player_points(d.challenger); pto := player_points(d.opponent);
  IF d.quit_by IS NOT NULL THEN
    w := CASE WHEN d.quit_by = d.challenger THEN d.opponent ELSE d.challenger END;
    pc := CASE WHEN w = d.challenger THEN win ELSE -LEAST(qt, ptc) END;
    po := CASE WHEN w = d.opponent THEN win ELSE -LEAST(qt, pto) END;
  ELSIF d.score_c = d.score_o THEN
    w := NULL; pc := dr; po := dr;
  ELSE
    w := CASE WHEN d.score_c > d.score_o THEN d.challenger ELSE d.opponent END;
    pc := CASE WHEN w = d.challenger THEN win ELSE -LEAST(loss, ptc) END;
    po := CASE WHEN w = d.opponent THEN win ELSE -LEAST(loss, pto) END;
  END IF;
  UPDATE live_duels SET status = 'done', winner = w, points_c = pc, points_o = po, finished_at = now(), q_closed_at = COALESCE(q_closed_at, now()) WHERE id = d.id;
  INSERT INTO game_sessions (user_id, game, level, score, total, xp) VALUES
    (d.challenger, 'duel', 1, d.score_c, CASE WHEN d.quit_by = d.challenger THEN 0 ELSE n END, pc),
    (d.opponent, 'duel', 1, d.score_o, CASE WHEN d.quit_by = d.opponent THEN 0 ELSE n END, po);
  PERFORM award_badges(d.challenger);
  PERFORM award_badges(d.opponent);
END $$
--;;
-- Avance l'état du duel selon l'heure du serveur (appelé à chaque lecture / réponse).
CREATE OR REPLACE FUNCTION ld_tick(p_id UUID) RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE d live_duels; secs INT; n INT; reveal INTERVAL := interval '4 seconds';
BEGIN
  SELECT * INTO d FROM live_duels WHERE id = p_id FOR UPDATE;
  IF d.id IS NULL THEN RETURN; END IF;
  IF d.status = 'invited' AND d.invite_expires_at < now() THEN
    UPDATE live_duels SET status = 'expired' WHERE id = d.id;
    UPDATE notifications SET kind = 'duel_missed', read_at = NULL WHERE ref = d.id AND kind IN ('duel_invite','duel_rematch');
    RETURN;
  END IF;
  IF d.status <> 'playing' THEN RETURN; END IF;
  n := jsonb_array_length(d.items);
  secs := COALESCE((d.items -> d.q_index ->> 'secs')::INT, 15);
  IF d.q_closed_at IS NULL AND now() >= d.q_started_at
     AND ((d.ans_c ? d.q_index::TEXT AND d.ans_o ? d.q_index::TEXT) OR now() >= d.q_started_at + make_interval(secs => secs + 1)) THEN
    UPDATE live_duels SET q_closed_at = now() WHERE id = d.id;
    RETURN;
  END IF;
  IF d.q_closed_at IS NOT NULL AND now() >= d.q_closed_at + reveal THEN
    IF d.q_index + 1 >= n THEN PERFORM ld_finish(d.id);
    ELSE UPDATE live_duels SET q_index = q_index + 1, q_started_at = now(), q_closed_at = NULL WHERE id = d.id; END IF;
  END IF;
END $$
--;;
CREATE OR REPLACE FUNCTION ld_search(p_q TEXT) RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE me UUID := auth.uid(); q TEXT := lower(regexp_replace(COALESCE(p_q, ''), '^@', ''));
BEGIN
  IF me IS NULL THEN RAISE EXCEPTION 'non connecté'; END IF;
  IF length(q) < 2 THEN
    RETURN COALESCE((SELECT jsonb_agg(player_card(x.uid)) FROM (
      SELECT CASE WHEN challenger = me THEN opponent ELSE challenger END AS uid, max(created_at) AS t FROM live_duels
      WHERE (challenger = me OR opponent = me) GROUP BY 1 ORDER BY t DESC LIMIT 6) x), '[]');
  END IF;
  RETURN COALESCE((SELECT jsonb_agg(player_card(p.id)) FROM (SELECT id FROM profiles WHERE username LIKE q || '%' AND id <> me ORDER BY length(username), username LIMIT 8) p), '[]');
END $$
--;;
-- Invitation (ou revanche) : le client propose des questions mélangées, le serveur écarte celles déjà vues (30 jours).
CREATE OR REPLACE FUNCTION ld_invite(p_username TEXT, p_candidates JSONB, p_rematch_of UUID DEFAULT NULL) RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE me UUID := auth.uid(); opp UUID; did UUID; want INT := ld_cfg('questions', 7); picked JSONB := '[]'; ks TEXT[] := '{}'; c JSONB; prev live_duels;
BEGIN
  IF me IS NULL THEN RAISE EXCEPTION 'non connecté'; END IF;
  IF NOT COALESCE((SELECT (value->>'enabled')::BOOLEAN FROM game_settings WHERE key = 'duel'), TRUE) THEN RAISE EXCEPTION 'Les duels sont en pause.'; END IF;
  IF p_rematch_of IS NOT NULL THEN
    SELECT * INTO prev FROM live_duels WHERE id = p_rematch_of AND status = 'done' AND (challenger = me OR opponent = me);
    IF prev.id IS NULL THEN RAISE EXCEPTION 'Duel introuvable.'; END IF;
    opp := CASE WHEN prev.challenger = me THEN prev.opponent ELSE prev.challenger END;
    IF EXISTS (SELECT 1 FROM live_duels WHERE rematch_of = p_rematch_of AND status IN ('invited','playing')) THEN RAISE EXCEPTION 'Une revanche est déjà demandée.'; END IF;
  ELSE
    SELECT id INTO opp FROM profiles WHERE username = lower(regexp_replace(COALESCE(p_username, ''), '^@', ''));
    IF opp IS NULL THEN RAISE EXCEPTION 'Aucun joueur avec ce nom d''utilisateur.'; END IF;
  END IF;
  IF opp = me THEN RAISE EXCEPTION 'Tu ne peux pas te défier toi-même.'; END IF;
  IF (SELECT count(*) FROM live_duels WHERE challenger = me AND created_at > now() - interval '1 day') >= ld_cfg('daily_limit', 30) THEN RAISE EXCEPTION 'Limite de duels atteinte pour aujourd''hui.'; END IF;
  -- une seule invitation en attente à la fois
  UPDATE live_duels SET status = 'cancelled' WHERE challenger = me AND status = 'invited';
  IF EXISTS (SELECT 1 FROM live_duels WHERE status = 'playing' AND (challenger IN (me, opp) OR opponent IN (me, opp)) AND started_at > now() - interval '20 minutes') THEN
    RAISE EXCEPTION 'Un de vous deux est déjà en train de jouer un duel.';
  END IF;
  FOR c IN SELECT value FROM jsonb_array_elements(COALESCE(p_candidates, '[]')) LOOP
    EXIT WHEN jsonb_array_length(picked) >= want;
    CONTINUE WHEN c->>'key' IS NULL OR (c->>'key') = ANY (ks);
    CONTINUE WHEN EXISTS (SELECT 1 FROM game_seen s WHERE s.qkey = c->>'key' AND s.user_id IN (me, opp) AND s.seen_at > now() - interval '30 days');
    picked := picked || jsonb_build_array(c); ks := ks || (c->>'key');
  END LOOP;
  -- pas assez de questions inédites : on complète avec les moins récentes
  FOR c IN SELECT value FROM jsonb_array_elements(COALESCE(p_candidates, '[]')) LOOP
    EXIT WHEN jsonb_array_length(picked) >= want;
    CONTINUE WHEN c->>'key' IS NULL OR (c->>'key') = ANY (ks);
    picked := picked || jsonb_build_array(c); ks := ks || (c->>'key');
  END LOOP;
  IF jsonb_array_length(picked) < 3 THEN RAISE EXCEPTION 'Impossible de préparer les questions.'; END IF;
  INSERT INTO live_duels (challenger, opponent, items, keys, invite_expires_at, rematch_of)
  VALUES (me, opp, picked, ks, now() + make_interval(secs => ld_cfg('invite_secs', 60)), p_rematch_of) RETURNING id INTO did;
  PERFORM notify(opp, CASE WHEN p_rematch_of IS NULL THEN 'duel_invite' ELSE 'duel_rematch' END, me, did, '{}');
  RETURN did;
END $$
--;;
CREATE OR REPLACE FUNCTION ld_respond(p_id UUID, p_accept BOOLEAN) RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE me UUID := auth.uid(); d live_duels;
BEGIN
  PERFORM ld_tick(p_id);
  SELECT * INTO d FROM live_duels WHERE id = p_id FOR UPDATE;
  IF d.id IS NULL OR d.opponent <> me THEN RAISE EXCEPTION 'Défi introuvable.'; END IF;
  UPDATE notifications SET read_at = now() WHERE ref = d.id AND user_id = me;
  IF d.status <> 'invited' THEN RETURN jsonb_build_object('status', d.status); END IF;
  IF p_accept THEN
    IF EXISTS (SELECT 1 FROM live_duels WHERE status = 'playing' AND id <> d.id AND (challenger IN (me, d.challenger) OR opponent IN (me, d.challenger)) AND started_at > now() - interval '20 minutes') THEN
      RAISE EXCEPTION 'Ton adversaire est déjà dans un autre duel.';
    END IF;
    UPDATE live_duels SET status = 'playing', started_at = now(), q_index = 0, q_started_at = now() + interval '4 seconds' WHERE id = d.id;
    INSERT INTO game_seen (user_id, qkey) SELECT u, k FROM unnest(ARRAY[d.challenger, d.opponent]) u, unnest(d.keys) k
      ON CONFLICT (user_id, qkey) DO UPDATE SET seen_at = now();
    RETURN jsonb_build_object('status', 'playing');
  END IF;
  UPDATE live_duels SET status = 'declined' WHERE id = d.id;
  PERFORM notify(d.challenger, 'duel_declined', me, d.id, '{}', FALSE);
  RETURN jsonb_build_object('status', 'declined');
END $$
--;;
CREATE OR REPLACE FUNCTION ld_cancel(p_id UUID) RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE live_duels SET status = 'cancelled' WHERE id = p_id AND challenger = auth.uid() AND status = 'invited';
  UPDATE notifications SET kind = 'duel_missed' WHERE ref = p_id AND kind IN ('duel_invite','duel_rematch') AND EXISTS (SELECT 1 FROM live_duels WHERE id = p_id AND status = 'cancelled');
END $$
--;;
CREATE OR REPLACE FUNCTION ld_state(p_id UUID) RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE me UUID := auth.uid(); d live_duels; ic BOOLEAN; q TEXT; mine JSONB; theirs JSONB; rm live_duels; closed BOOLEAN;
BEGIN
  IF me IS NULL THEN RAISE EXCEPTION 'non connecté'; END IF;
  PERFORM ld_tick(p_id);
  SELECT * INTO d FROM live_duels WHERE id = p_id;
  IF d.id IS NULL OR me NOT IN (d.challenger, d.opponent) THEN RAISE EXCEPTION 'Duel introuvable.'; END IF;
  ic := d.challenger = me; q := d.q_index::TEXT;
  mine := CASE WHEN ic THEN d.ans_c ELSE d.ans_o END; theirs := CASE WHEN ic THEN d.ans_o ELSE d.ans_c END;
  closed := d.q_closed_at IS NOT NULL OR d.status = 'done';
  SELECT * INTO rm FROM live_duels WHERE rematch_of = d.id ORDER BY created_at DESC LIMIT 1;
  RETURN jsonb_build_object(
    'id', d.id, 'status', d.status, 'role', CASE WHEN ic THEN 'challenger' ELSE 'opponent' END, 'now', now(),
    'me', player_card(me), 'them', player_card(CASE WHEN ic THEN d.opponent ELSE d.challenger END),
    'invite_expires_at', d.invite_expires_at, 'created_at', d.created_at, 'rematch_of', d.rematch_of,
    'items', CASE WHEN d.status IN ('playing','done') THEN d.items END, 'total', jsonb_array_length(d.items),
    'q', d.q_index, 'q_started_at', d.q_started_at, 'q_closed_at', d.q_closed_at,
    'secs', COALESCE((d.items -> d.q_index ->> 'secs')::INT, 15),
    'my_answer', mine -> q, 'their_answered', theirs ? q,
    'their_answer', CASE WHEN closed THEN theirs -> q END,
    'my_answers', CASE WHEN d.status = 'done' THEN mine END, 'their_answers', CASE WHEN d.status = 'done' THEN theirs END,
    'my_score', CASE WHEN ic THEN d.score_c ELSE d.score_o END, 'their_score', CASE WHEN ic THEN d.score_o ELSE d.score_c END,
    'winner', CASE WHEN d.winner IS NULL THEN NULL WHEN d.winner = me THEN 'me' ELSE 'them' END,
    'quit', CASE WHEN d.quit_by IS NULL THEN NULL WHEN d.quit_by = me THEN 'me' ELSE 'them' END,
    'my_points', CASE WHEN ic THEN d.points_c ELSE d.points_o END, 'their_points', CASE WHEN ic THEN d.points_o ELSE d.points_c END,
    'rematch', CASE WHEN rm.id IS NULL THEN NULL ELSE jsonb_build_object('id', rm.id, 'status', rm.status, 'mine', rm.challenger = me) END);
END $$
--;;
CREATE OR REPLACE FUNCTION ld_answer(p_id UUID, p_q INT, p_choice JSONB, p_ok BOOLEAN) RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE me UUID := auth.uid(); d live_duels; ic BOOLEAN; secs INT; a JSONB; ms INT;
BEGIN
  PERFORM ld_tick(p_id);
  SELECT * INTO d FROM live_duels WHERE id = p_id FOR UPDATE;
  IF d.id IS NULL OR me NOT IN (d.challenger, d.opponent) THEN RAISE EXCEPTION 'Duel introuvable.'; END IF;
  ic := d.challenger = me;
  secs := COALESCE((d.items -> d.q_index ->> 'secs')::INT, 15);
  IF d.status = 'playing' AND d.q_index = p_q AND d.q_closed_at IS NULL AND now() >= d.q_started_at
     AND now() <= d.q_started_at + make_interval(secs => secs + 2)
     AND NOT ((CASE WHEN ic THEN d.ans_c ELSE d.ans_o END) ? p_q::TEXT) THEN
    ms := (EXTRACT(EPOCH FROM (now() - d.q_started_at)) * 1000)::INT;
    a := jsonb_build_object('c', p_choice, 'ok', COALESCE(p_ok, FALSE), 'ms', ms);
    IF ic THEN UPDATE live_duels SET ans_c = ans_c || jsonb_build_object(p_q::TEXT, a), score_c = score_c + (CASE WHEN p_ok THEN 1 ELSE 0 END) WHERE id = d.id;
    ELSE UPDATE live_duels SET ans_o = ans_o || jsonb_build_object(p_q::TEXT, a), score_o = score_o + (CASE WHEN p_ok THEN 1 ELSE 0 END) WHERE id = d.id; END IF;
  END IF;
  RETURN ld_state(p_id);
END $$
--;;
CREATE OR REPLACE FUNCTION ld_quit(p_id UUID) RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE me UUID := auth.uid();
BEGIN
  UPDATE live_duels SET quit_by = me WHERE id = p_id AND status = 'playing' AND me IN (challenger, opponent) AND quit_by IS NULL;
  IF FOUND THEN PERFORM ld_finish(p_id); END IF;
  RETURN ld_state(p_id);
END $$
--;;
-- Profil joueur : points globaux, statistiques, badges, historique.
CREATE OR REPLACE FUNCTION player_profile(p_username TEXT DEFAULT NULL) RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE me UUID := auth.uid(); uid UUID;
BEGIN
  IF me IS NULL THEN RAISE EXCEPTION 'non connecté'; END IF;
  IF p_username IS NULL OR p_username = '' THEN uid := me; ELSE SELECT id INTO uid FROM profiles WHERE username = lower(regexp_replace(p_username, '^@', '')); END IF;
  IF uid IS NULL THEN RAISE EXCEPTION 'Joueur introuvable.'; END IF;
  IF uid = me THEN PERFORM award_badges(me); END IF;
  RETURN player_card(uid) || jsonb_build_object('is_me', uid = me,
    'stats', (SELECT jsonb_build_object('duels', count(*), 'wins', count(*) FILTER (WHERE winner = uid),
        'losses', count(*) FILTER (WHERE winner IS NOT NULL AND winner <> uid), 'draws', count(*) FILTER (WHERE winner IS NULL),
        'quits', count(*) FILTER (WHERE quit_by = uid),
        'correct', COALESCE(sum(CASE WHEN challenger = uid THEN score_c ELSE score_o END), 0), 'asked', COALESCE(sum(jsonb_array_length(items)), 0))
      FROM live_duels WHERE status = 'done' AND (challenger = uid OR opponent = uid)),
    'solo', (SELECT count(*) FROM game_sessions WHERE user_id = uid AND total > 0 AND game IN ('lettres','suite','sourate','ordre','ilm')),
    'badges', COALESCE((SELECT jsonb_agg(jsonb_build_object('id', badge, 'at', earned_at) ORDER BY earned_at) FROM player_badges WHERE user_id = uid), '[]'),
    'history', COALESCE((SELECT jsonb_agg(h ORDER BY (h->>'at') DESC) FROM (
      SELECT jsonb_build_object('id', d.id, 'at', d.finished_at,
        'them', player_card(CASE WHEN d.challenger = uid THEN d.opponent ELSE d.challenger END),
        'mine', CASE WHEN d.challenger = uid THEN d.score_c ELSE d.score_o END, 'theirs', CASE WHEN d.challenger = uid THEN d.score_o ELSE d.score_c END,
        'points', CASE WHEN d.challenger = uid THEN d.points_c ELSE d.points_o END,
        'result', CASE WHEN d.winner IS NULL THEN 'draw' WHEN d.winner = uid THEN 'win' ELSE 'loss' END,
        'quit', CASE WHEN d.quit_by IS NULL THEN NULL WHEN d.quit_by = uid THEN 'me' ELSE 'them' END) h
      FROM live_duels d WHERE d.status = 'done' AND (d.challenger = uid OR d.opponent = uid) ORDER BY d.finished_at DESC LIMIT 30) x), '[]'));
END $$
--;;
-- Centre de notifications
CREATE OR REPLACE FUNCTION notif_list() RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE me UUID := auth.uid();
BEGIN
  IF me IS NULL THEN RAISE EXCEPTION 'non connecté'; END IF;
  PERFORM ld_tick(d.id) FROM live_duels d WHERE d.opponent = me AND d.status = 'invited';
  RETURN COALESCE((SELECT jsonb_agg(jsonb_build_object('id', n.id, 'kind', n.kind, 'at', n.created_at, 'read', n.read_at IS NOT NULL, 'ref', n.ref, 'data', n.data,
      'actor', CASE WHEN n.actor IS NOT NULL THEN player_card(n.actor) END,
      'duel', CASE WHEN n.kind IN ('duel_invite','duel_rematch','duel_missed') THEN (SELECT jsonb_build_object('status', d.status, 'expires', d.invite_expires_at) FROM live_duels d WHERE d.id = n.ref) END)
    ORDER BY n.created_at DESC) FROM (SELECT * FROM notifications WHERE user_id = me ORDER BY created_at DESC LIMIT 60) n), '[]');
END $$
--;;
CREATE OR REPLACE FUNCTION notif_read_all() RETURNS VOID LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  UPDATE notifications SET read_at = now() WHERE user_id = auth.uid() AND read_at IS NULL
    AND NOT (kind IN ('duel_invite','duel_rematch') AND EXISTS (SELECT 1 FROM live_duels d WHERE d.id = ref AND d.status = 'invited'))
$$
--;;
-- Appelé toutes les quelques secondes par l'app ouverte : présence, pastille, défi en direct, duel lancé.
CREATE OR REPLACE FUNCTION notif_poll() RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE me UUID := auth.uid(); inv live_duels; act live_duels;
BEGIN
  IF me IS NULL THEN RETURN NULL; END IF;
  INSERT INTO player_presence (user_id, seen_at) VALUES (me, now()) ON CONFLICT (user_id) DO UPDATE SET seen_at = now();
  PERFORM ld_tick(d.id) FROM live_duels d WHERE (d.opponent = me OR d.challenger = me) AND d.status = 'invited';
  SELECT * INTO inv FROM live_duels WHERE opponent = me AND status = 'invited' ORDER BY created_at DESC LIMIT 1;
  SELECT * INTO act FROM live_duels WHERE (challenger = me OR opponent = me) AND status = 'playing' AND started_at > now() - interval '20 minutes' ORDER BY started_at DESC LIMIT 1;
  RETURN jsonb_build_object('unread', (SELECT count(*) FROM notifications WHERE user_id = me AND read_at IS NULL), 'now', now(),
    'invite', CASE WHEN inv.id IS NULL THEN NULL ELSE jsonb_build_object('id', inv.id, 'expires', inv.invite_expires_at, 'rematch', inv.rematch_of IS NOT NULL, 'from', player_card(inv.challenger), 'n', jsonb_array_length(inv.items)) END,
    'playing', act.id);
END $$
--;;
REVOKE ALL ON FUNCTION ld_cfg(TEXT, INT), player_card(UUID), notify(UUID, TEXT, UUID, UUID, JSONB, BOOLEAN), award_badges(UUID), ld_finish(UUID), ld_tick(UUID) FROM PUBLIC, authenticated
--;;
GRANT EXECUTE ON FUNCTION player_points(UUID), ld_search(TEXT), ld_invite(TEXT, JSONB, UUID), ld_respond(UUID, BOOLEAN), ld_cancel(UUID), ld_state(UUID), ld_answer(UUID, INT, JSONB, BOOLEAN), ld_quit(UUID), player_profile(TEXT), notif_list(), notif_read_all(), notif_poll() TO authenticated

--;;
-- Khatma d'équipe : aussi dans le centre de notifications (le push reste géré par la fonction rappels).
CREATE OR REPLACE FUNCTION tk_notify_trg() RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM notify(m.user_id, 'khatma_start', NEW.created_by, NEW.id, jsonb_build_object('scope', NEW.scope, 'group', g.name, 'kind', g.kind), FALSE)
      FROM group_members m JOIN study_groups g ON g.id = m.group_id WHERE m.group_id = NEW.group_id AND m.user_id <> NEW.created_by;
  ELSIF NEW.status = 'done' AND OLD.status <> 'done' THEN
    PERFORM notify(m.user_id, 'khatma_done', NULL, NEW.id, jsonb_build_object('scope', NEW.scope, 'group', g.name, 'kind', g.kind, 'bonus', tk_setting('bonus', '50')), FALSE)
      FROM group_members m JOIN study_groups g ON g.id = m.group_id WHERE m.group_id = NEW.group_id;
  END IF;
  RETURN NEW;
END $$
--;;
DROP TRIGGER IF EXISTS tk_notify ON team_khatmas
--;;
CREATE TRIGGER tk_notify AFTER INSERT OR UPDATE OF status ON team_khatmas FOR EACH ROW EXECUTE FUNCTION tk_notify_trg()
