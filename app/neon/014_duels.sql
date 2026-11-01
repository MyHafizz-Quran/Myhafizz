-- Jeux lot J2 : duels 1 contre 1 en différé. Les deux joueurs reçoivent exactement
-- les mêmes questions (tirées à la création) et jouent quand ils veulent avant l'expiration.
-- Égalité départagée au temps total. Pas de perte de points en cas de défaite.
INSERT INTO game_settings (key, value) VALUES ('duel', '{"enabled": true, "hours": 24, "win_bonus": 20, "daily_limit": 10}')
ON CONFLICT (key) DO NOTHING
--;;
CREATE TABLE IF NOT EXISTS game_duels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game TEXT NOT NULL CHECK (game IN ('suite', 'sourate', 'ordre', 'lettres', 'ilm')),
  level SMALLINT NOT NULL CHECK (level BETWEEN 1 AND 5),
  category TEXT,
  challenger UUID NOT NULL REFERENCES neon_auth."user"(id) ON DELETE CASCADE,
  opponent UUID REFERENCES neon_auth."user"(id) ON DELETE CASCADE,
  invite_code TEXT UNIQUE,
  items JSONB NOT NULL,
  total SMALLINT NOT NULL,
  challenger_result JSONB,
  opponent_result JSONB,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'done', 'declined')),
  winner UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  finished_at TIMESTAMPTZ,
  notified_invite_at TIMESTAMPTZ,
  notified_result_at TIMESTAMPTZ
)
--;;
CREATE INDEX IF NOT EXISTS game_duels_challenger ON game_duels (challenger, created_at DESC)
--;;
CREATE INDEX IF NOT EXISTS game_duels_opponent ON game_duels (opponent, created_at DESC)
--;;
ALTER TABLE game_duels ENABLE ROW LEVEL SECURITY
--;;
-- Aucun accès direct : tout passe par les fonctions ci-dessous.
REVOKE ALL ON game_duels FROM authenticated
--;;
CREATE OR REPLACE FUNCTION public.duel_setting(k TEXT, d NUMERIC) RETURNS NUMERIC
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE((SELECT CASE value->>k WHEN 'true' THEN 1 WHEN 'false' THEN 0 ELSE (value->>k)::NUMERIC END FROM game_settings WHERE key = 'duel'), d)
$$
--;;
-- Niveau accessible d'un joueur pour chaque jeu : niveau débloqué, ou niveau de départ selon son arabe.
CREATE OR REPLACE FUNCTION public.duel_levels(u UUID) RETURNS JSONB
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT jsonb_object_agg(g, GREATEST(
    COALESCE((SELECT level FROM game_progress WHERE user_id = u AND game = g), 1),
    CASE WHEN g = 'ilm' THEN 1 ELSE CASE (SELECT arabic_level FROM profiles WHERE id = u) WHEN 'good' THEN 3 WHEN 'some' THEN 2 ELSE 1 END END))
  FROM unnest(ARRAY['suite', 'sourate', 'ordre', 'lettres', 'ilm']) g
$$
--;;
-- Recherche d'un adversaire par nom d'utilisateur. Le nom complet n'est montré
-- que si les deux joueurs partagent un groupe (binôme, classe, famille…).
CREATE OR REPLACE FUNCTION public.duel_search(p_q TEXT)
RETURNS TABLE(username TEXT, full_name TEXT, relation TEXT, levels JSONB)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE uid UUID := auth.uid(); q TEXT := lower(regexp_replace(COALESCE(p_q, ''), '^@', ''));
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'non connecté'; END IF;
  IF length(q) < 2 THEN RETURN; END IF;
  RETURN QUERY
  SELECT p.username, CASE WHEN rel.name IS NOT NULL THEN p.full_name END,
    CASE WHEN rel.kind = 'duo' THEN 'ton binôme' WHEN rel.name IS NOT NULL THEN 'groupe ' || rel.name END,
    duel_levels(p.id)
  FROM profiles p
  LEFT JOIN LATERAL (
    SELECT g.name, g.kind FROM group_members a JOIN group_members b ON b.group_id = a.group_id JOIN study_groups g ON g.id = a.group_id
    WHERE a.user_id = uid AND b.user_id = p.id ORDER BY (g.kind = 'duo') DESC LIMIT 1
  ) rel ON TRUE
  WHERE p.id <> uid AND p.username IS NOT NULL AND p.username LIKE replace(replace(q, '_', '\_'), '%', '\%') || '%'
  ORDER BY (rel.name IS NOT NULL) DESC, length(p.username), p.username
  LIMIT 8;
END $$
--;;
-- Création : p_mode = 'user' (par nom d'utilisateur), 'random' (joueur actif au hasard) ou 'link' (lien d'invitation).
CREATE OR REPLACE FUNCTION public.duel_create(p_game TEXT, p_level INT, p_category TEXT, p_mode TEXT, p_username TEXT, p_items JSONB)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE uid UUID := auth.uid(); opp UUID; code TEXT; did UUID; n INT;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'non connecté'; END IF;
  IF duel_setting('enabled', 1) = 0 THEN RAISE EXCEPTION 'Les duels sont momentanément désactivés.'; END IF;
  IF jsonb_typeof(p_items) <> 'array' OR jsonb_array_length(p_items) NOT BETWEEN 1 AND 20 OR length(p_items::TEXT) > 200000 THEN RAISE EXCEPTION 'partie invalide'; END IF;
  SELECT COUNT(*) INTO n FROM game_duels WHERE challenger = uid AND created_at > NOW() - INTERVAL '1 day';
  IF n >= duel_setting('daily_limit', 10) THEN RAISE EXCEPTION 'Tu as lancé beaucoup de duels aujourd''hui. Reviens demain.'; END IF;
  IF p_mode = 'user' THEN
    SELECT id INTO opp FROM profiles WHERE username = lower(regexp_replace(COALESCE(p_username, ''), '^@', ''));
    IF opp IS NULL THEN RAISE EXCEPTION 'Joueur introuvable.'; END IF;
    IF opp = uid THEN RAISE EXCEPTION 'Tu ne peux pas te défier toi-même.'; END IF;
  ELSIF p_mode = 'random' THEN
    SELECT p.id INTO opp FROM profiles p
    WHERE p.id <> uid AND p.username IS NOT NULL AND p.onboarded_at IS NOT NULL
      AND NOT EXISTS (SELECT 1 FROM game_duels d WHERE d.status = 'pending' AND d.expires_at > NOW()
        AND ((d.challenger = uid AND d.opponent = p.id) OR (d.challenger = p.id AND d.opponent = uid)))
    ORDER BY (EXISTS (SELECT 1 FROM game_sessions s WHERE s.user_id = p.id AND s.created_at > NOW() - INTERVAL '14 days')) DESC,
      (EXISTS (SELECT 1 FROM activity_days a WHERE a.user_id = p.id)) DESC, random()
    LIMIT 1;
    IF opp IS NULL THEN RAISE EXCEPTION 'Aucun joueur disponible pour le moment. Invite un ami par lien.'; END IF;
  ELSIF p_mode = 'link' THEN
    code := substr(replace(gen_random_uuid()::TEXT, '-', ''), 1, 10);
  ELSE RAISE EXCEPTION 'mode inconnu';
  END IF;
  INSERT INTO game_duels (game, level, category, challenger, opponent, invite_code, items, total, expires_at)
  VALUES (p_game, p_level, NULLIF(p_category, ''), uid, opp, code, p_items, jsonb_array_length(p_items),
    NOW() + make_interval(hours => duel_setting('hours', 24)::INT))
  RETURNING id INTO did;
  RETURN jsonb_build_object('id', did, 'code', code);
END $$
--;;
CREATE OR REPLACE FUNCTION public.duel_join(p_code TEXT) RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE uid UUID := auth.uid(); d game_duels;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'non connecté'; END IF;
  SELECT * INTO d FROM game_duels WHERE invite_code = p_code FOR UPDATE;
  IF d.id IS NULL THEN RAISE EXCEPTION 'Lien de duel invalide.'; END IF;
  IF d.challenger = uid OR d.opponent = uid THEN RETURN d.id; END IF;
  IF d.opponent IS NOT NULL THEN RAISE EXCEPTION 'Ce duel a déjà un adversaire.'; END IF;
  IF d.expires_at < NOW() THEN RAISE EXCEPTION 'Ce duel a expiré.'; END IF;
  UPDATE game_duels SET opponent = uid, notified_invite_at = NOW() WHERE id = d.id;
  RETURN d.id;
END $$
--;;
-- Vue d'un duel pour un participant (questions comprises, pour pouvoir jouer).
CREATE OR REPLACE FUNCTION public.duel_view(d game_duels, uid UUID, with_items BOOLEAN) RETURNS JSONB
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT jsonb_build_object(
    'id', d.id, 'game', d.game, 'level', d.level, 'category', d.category, 'total', d.total,
    'role', CASE WHEN d.challenger = uid THEN 'challenger' ELSE 'opponent' END,
    'status', CASE WHEN d.status = 'pending' AND d.expires_at < NOW() THEN 'expired' ELSE d.status END,
    'created_at', d.created_at, 'expires_at', d.expires_at, 'finished_at', d.finished_at, 'invite_code', CASE WHEN d.challenger = uid THEN d.invite_code END,
    'me', CASE WHEN d.challenger = uid THEN d.challenger_result ELSE d.opponent_result END,
    'them', CASE WHEN d.challenger = uid THEN d.opponent_result ELSE d.challenger_result END,
    'other', (SELECT jsonb_build_object('username', p.username, 'full_name', p.full_name) FROM profiles p
              WHERE p.id = CASE WHEN d.challenger = uid THEN d.opponent ELSE d.challenger END),
    'won', CASE WHEN d.status = 'done' THEN d.winner = uid END,
    'draw', d.status = 'done' AND d.winner IS NULL,
    'h2h', (SELECT jsonb_build_object('me', COUNT(*) FILTER (WHERE x.winner = uid), 'them', COUNT(*) FILTER (WHERE x.winner IS NOT NULL AND x.winner <> uid))
            FROM game_duels x WHERE x.status = 'done' AND ((x.challenger = d.challenger AND x.opponent = d.opponent) OR (x.challenger = d.opponent AND x.opponent = d.challenger))),
    'items', CASE WHEN with_items THEN d.items END)
$$
--;;
CREATE OR REPLACE FUNCTION public.duel_get(p_id UUID) RETURNS JSONB
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE uid UUID := auth.uid(); d game_duels;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'non connecté'; END IF;
  SELECT * INTO d FROM game_duels WHERE id = p_id AND uid IN (challenger, opponent);
  IF d.id IS NULL THEN RAISE EXCEPTION 'Duel introuvable.'; END IF;
  RETURN duel_view(d, uid, TRUE);
END $$
--;;
CREATE OR REPLACE FUNCTION public.duel_list() RETURNS JSONB
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE uid UUID := auth.uid();
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'non connecté'; END IF;
  RETURN COALESCE((SELECT jsonb_agg(duel_view(d, uid, FALSE) ORDER BY d.created_at DESC) FROM (
    SELECT * FROM game_duels WHERE uid IN (challenger, opponent) AND created_at > NOW() - INTERVAL '30 days' ORDER BY created_at DESC LIMIT 40
  ) d), '[]'::JSONB);
END $$
--;;
CREATE OR REPLACE FUNCTION public.duel_decline(p_id UUID) RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE uid UUID := auth.uid();
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'non connecté'; END IF;
  UPDATE game_duels SET status = 'declined', finished_at = NOW() WHERE id = p_id AND opponent = uid AND opponent_result IS NULL AND status = 'pending';
END $$
--;;
-- Envoi des réponses d'un joueur : [{ok, ms}] dans l'ordre des questions.
-- Quand les deux ont joué : vainqueur au score, puis au temps total ; bonus de victoire.
CREATE OR REPLACE FUNCTION public.duel_submit(p_id UUID, p_answers JSONB) RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE uid UUID := auth.uid(); d game_duels; res JSONB; sc INT; ms BIGINT; a JSONB; b JSONB; w UUID; bonus INT;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'non connecté'; END IF;
  SELECT * INTO d FROM game_duels WHERE id = p_id AND uid IN (challenger, opponent) FOR UPDATE;
  IF d.id IS NULL THEN RAISE EXCEPTION 'Duel introuvable.'; END IF;
  IF d.status <> 'pending' THEN RAISE EXCEPTION 'Ce duel est terminé.'; END IF;
  IF d.expires_at < NOW() THEN RAISE EXCEPTION 'Ce duel a expiré.'; END IF;
  IF (d.challenger = uid AND d.challenger_result IS NOT NULL) OR (d.opponent = uid AND d.opponent_result IS NOT NULL) THEN RAISE EXCEPTION 'Tu as déjà joué ce duel.'; END IF;
  IF jsonb_typeof(p_answers) <> 'array' OR jsonb_array_length(p_answers) <> d.total THEN RAISE EXCEPTION 'réponses invalides'; END IF;
  SELECT COUNT(*) FILTER (WHERE (v->>'ok')::BOOLEAN), SUM(LEAST(GREATEST(COALESCE((v->>'ms')::BIGINT, 0), 0), 600000))
    INTO sc, ms FROM jsonb_array_elements(p_answers) v;
  res := jsonb_build_object('score', sc, 'ms', ms, 'at', NOW(),
    'answers', (SELECT jsonb_agg(jsonb_build_object('ok', COALESCE((v->>'ok')::BOOLEAN, FALSE), 'ms', LEAST(GREATEST(COALESCE((v->>'ms')::BIGINT, 0), 0), 600000))) FROM jsonb_array_elements(p_answers) v));
  IF d.challenger = uid THEN d.challenger_result := res; ELSE d.opponent_result := res; END IF;
  IF d.challenger_result IS NOT NULL AND d.opponent_result IS NOT NULL THEN
    a := d.challenger_result; b := d.opponent_result;
    w := CASE WHEN (a->>'score')::INT > (b->>'score')::INT THEN d.challenger WHEN (a->>'score')::INT < (b->>'score')::INT THEN d.opponent
              WHEN (a->>'ms')::BIGINT < (b->>'ms')::BIGINT THEN d.challenger WHEN (a->>'ms')::BIGINT > (b->>'ms')::BIGINT THEN d.opponent END;
    bonus := duel_setting('win_bonus', 20)::INT;
    IF w IS NOT NULL AND bonus > 0 THEN INSERT INTO game_sessions (user_id, game, level, score, total, xp) VALUES (w, 'duel', d.level, 0, 0, bonus); END IF;
    UPDATE game_duels SET challenger_result = d.challenger_result, opponent_result = d.opponent_result, status = 'done', winner = w, finished_at = NOW() WHERE id = d.id;
  ELSE
    UPDATE game_duels SET challenger_result = d.challenger_result, opponent_result = d.opponent_result WHERE id = d.id;
  END IF;
  SELECT * INTO d FROM game_duels WHERE id = p_id;
  RETURN duel_view(d, uid, FALSE);
END $$
--;;
REVOKE ALL ON FUNCTION public.duel_setting(TEXT, NUMERIC), public.duel_levels(UUID), public.duel_view(game_duels, UUID, BOOLEAN) FROM PUBLIC
--;;
REVOKE ALL ON FUNCTION public.duel_search(TEXT), public.duel_create(TEXT, INT, TEXT, TEXT, TEXT, JSONB), public.duel_join(TEXT), public.duel_get(UUID), public.duel_list(), public.duel_decline(UUID), public.duel_submit(UUID, JSONB) FROM PUBLIC
--;;
GRANT EXECUTE ON FUNCTION public.duel_search(TEXT), public.duel_create(TEXT, INT, TEXT, TEXT, TEXT, JSONB), public.duel_join(TEXT), public.duel_get(UUID), public.duel_list(), public.duel_decline(UUID), public.duel_submit(UUID, JSONB) TO authenticated
--;;
-- Notifications (Neon Function « rappels ») : lecture des duels et marquage des envois.
GRANT SELECT, UPDATE (notified_invite_at, notified_result_at) ON game_duels TO reminder_worker
--;;
GRANT SELECT (id, username) ON profiles TO reminder_worker
--;;
-- Journal des notifications de duel (plafond de 3 par jour et par joueur).
CREATE TABLE IF NOT EXISTS duel_notifications (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES neon_auth."user"(id) ON DELETE CASCADE,
  duel_id UUID REFERENCES game_duels(id) ON DELETE CASCADE,
  kind TEXT NOT NULL,
  sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
)
--;;
CREATE INDEX IF NOT EXISTS duel_notifications_user ON duel_notifications (user_id, sent_at DESC)
--;;
ALTER TABLE duel_notifications ENABLE ROW LEVEL SECURITY
--;;
GRANT SELECT, INSERT ON duel_notifications TO reminder_worker
--;;
GRANT USAGE ON SEQUENCE duel_notifications_id_seq TO reminder_worker
--;;
DROP POLICY IF EXISTS "duels_worker" ON game_duels
--;;
CREATE POLICY "duels_worker" ON game_duels FOR ALL TO reminder_worker USING (TRUE) WITH CHECK (TRUE)
--;;
DROP POLICY IF EXISTS "duel_notifications_worker" ON duel_notifications
--;;
CREATE POLICY "duel_notifications_worker" ON duel_notifications FOR ALL TO reminder_worker USING (TRUE) WITH CHECK (TRUE)
--;;
DROP POLICY IF EXISTS "profiles_worker" ON profiles
--;;
CREATE POLICY "profiles_worker" ON profiles FOR SELECT TO reminder_worker USING (TRUE)
