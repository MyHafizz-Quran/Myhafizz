-- Lot J3 : Khatma d'équipe (jeu coopératif dans un groupe ou un binôme).
-- Chaque « unité » (sourate, ou catégorie Al-Ilm) est validée quand un membre réussit une partie dessus au seuil réglé (80 %).
INSERT INTO game_settings (key, value) VALUES ('khatma', '{"enabled": true, "days": [3, 7, 14], "bonus": 50, "pct": 80}')
ON CONFLICT (key) DO NOTHING
--;;
CREATE TABLE IF NOT EXISTS team_khatmas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES study_groups(id) ON DELETE CASCADE,
  scope TEXT NOT NULL CHECK (scope IN ('amma','tabarak','ilm')),
  created_by UUID REFERENCES neon_auth."user"(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ends_at TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','done','expired')),
  finished_at TIMESTAMPTZ,
  notified_start_at TIMESTAMPTZ,
  notified_done_at TIMESTAMPTZ
)
--;;
CREATE INDEX IF NOT EXISTS team_khatmas_group ON team_khatmas (group_id, created_at DESC)
--;;
CREATE TABLE IF NOT EXISTS team_khatma_parts (
  khatma_id UUID NOT NULL REFERENCES team_khatmas(id) ON DELETE CASCADE,
  unit SMALLINT NOT NULL,
  user_id UUID NOT NULL REFERENCES neon_auth."user"(id) ON DELETE CASCADE,
  score SMALLINT NOT NULL,
  total SMALLINT NOT NULL,
  validated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (khatma_id, unit)
)
--;;
ALTER TABLE team_khatmas ENABLE ROW LEVEL SECURITY
--;;
ALTER TABLE team_khatma_parts ENABLE ROW LEVEL SECURITY
--;;
REVOKE ALL ON team_khatmas, team_khatma_parts FROM authenticated
--;;
DROP POLICY IF EXISTS "tk_worker" ON team_khatmas
--;;
CREATE POLICY "tk_worker" ON team_khatmas FOR ALL TO reminder_worker USING (TRUE) WITH CHECK (TRUE)
--;;
GRANT SELECT, UPDATE ON team_khatmas TO reminder_worker
--;;
GRANT SELECT ON study_groups, group_members TO reminder_worker
--;;
DROP POLICY IF EXISTS "groups_worker" ON study_groups
--;;
CREATE POLICY "groups_worker" ON study_groups FOR SELECT TO reminder_worker USING (TRUE)
--;;
DROP POLICY IF EXISTS "members_worker" ON group_members
--;;
CREATE POLICY "members_worker" ON group_members FOR SELECT TO reminder_worker USING (TRUE)
--;;
CREATE OR REPLACE FUNCTION tk_units(p_scope TEXT) RETURNS INT[] LANGUAGE sql IMMUTABLE AS $$
  SELECT CASE p_scope WHEN 'amma' THEN ARRAY(SELECT generate_series(78, 114))
                      WHEN 'tabarak' THEN ARRAY(SELECT generate_series(67, 77))
                      ELSE ARRAY(SELECT generate_series(1, 9)) END
$$
--;;
CREATE OR REPLACE FUNCTION tk_setting(p_key TEXT, p_default JSONB) RETURNS JSONB LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE((SELECT value -> p_key FROM game_settings WHERE key = 'khatma'), p_default)
$$
--;;
-- Expire les khatmas dont le délai est passé (appelé à la lecture).
CREATE OR REPLACE FUNCTION tk_expire() RETURNS VOID LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  UPDATE team_khatmas SET status = 'expired' WHERE status = 'active' AND ends_at < now()
$$
--;;
CREATE OR REPLACE FUNCTION tk_summary(k team_khatmas, me UUID) RETURNS JSONB LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT jsonb_build_object(
    'id', k.id, 'scope', k.scope, 'status', k.status, 'created_at', k.created_at, 'ends_at', k.ends_at, 'finished_at', k.finished_at,
    'group', jsonb_build_object('id', g.id, 'name', g.name, 'kind', g.kind),
    'members', (SELECT count(*) FROM group_members m WHERE m.group_id = g.id),
    'total', cardinality(tk_units(k.scope)),
    'done', (SELECT count(*) FROM team_khatma_parts p WHERE p.khatma_id = k.id),
    'mine', (SELECT count(*) FROM team_khatma_parts p WHERE p.khatma_id = k.id AND p.user_id = me),
    'next', (SELECT u FROM unnest(tk_units(k.scope)) u WHERE NOT EXISTS (SELECT 1 FROM team_khatma_parts p WHERE p.khatma_id = k.id AND p.unit = u) ORDER BY u LIMIT 1),
    'partner', CASE WHEN g.kind = 'duo' THEN (SELECT COALESCE(pr.username, m.display_name) FROM group_members m LEFT JOIN profiles pr ON pr.id = m.user_id WHERE m.group_id = g.id AND m.user_id <> me LIMIT 1) END)
  FROM study_groups g WHERE g.id = k.group_id
$$
--;;
-- Mes groupes (pour créer une khatma) et mes khatmas d'équipe.
CREATE OR REPLACE FUNCTION tk_list() RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE me UUID := auth.uid();
BEGIN
  IF me IS NULL THEN RAISE EXCEPTION 'non connecté'; END IF;
  PERFORM tk_expire();
  RETURN jsonb_build_object(
    'groups', COALESCE((SELECT jsonb_agg(jsonb_build_object('id', g.id, 'name', g.name, 'kind', g.kind,
        'members', (SELECT count(*) FROM group_members x WHERE x.group_id = g.id),
        'partner', CASE WHEN g.kind = 'duo' THEN (SELECT COALESCE(pr.username, x.display_name) FROM group_members x LEFT JOIN profiles pr ON pr.id = x.user_id WHERE x.group_id = g.id AND x.user_id <> me LIMIT 1) END,
        'busy', EXISTS (SELECT 1 FROM team_khatmas k WHERE k.group_id = g.id AND k.status = 'active')) ORDER BY g.name)
      FROM study_groups g JOIN group_members m ON m.group_id = g.id AND m.user_id = me), '[]'),
    'khatmas', COALESCE((SELECT jsonb_agg(tk_summary(k, me) ORDER BY (k.status = 'active') DESC, k.created_at DESC)
      FROM team_khatmas k JOIN group_members m ON m.group_id = k.group_id AND m.user_id = me
      WHERE k.status = 'active' OR k.created_at > now() - interval '60 days'), '[]'));
END $$
--;;
CREATE OR REPLACE FUNCTION tk_create(p_group UUID, p_scope TEXT, p_days INT) RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE me UUID := auth.uid(); kid UUID;
BEGIN
  IF me IS NULL THEN RAISE EXCEPTION 'non connecté'; END IF;
  IF NOT COALESCE((tk_setting('enabled', 'true'))::BOOLEAN, TRUE) THEN RAISE EXCEPTION 'La khatma d''équipe est en pause.'; END IF;
  IF NOT EXISTS (SELECT 1 FROM group_members WHERE group_id = p_group AND user_id = me) THEN RAISE EXCEPTION 'Tu ne fais pas partie de ce groupe.'; END IF;
  IF p_scope NOT IN ('amma','tabarak','ilm') THEN RAISE EXCEPTION 'Choix invalide.'; END IF;
  IF p_days IS NULL OR p_days < 1 OR p_days > 30 THEN RAISE EXCEPTION 'Durée invalide.'; END IF;
  PERFORM tk_expire();
  IF EXISTS (SELECT 1 FROM team_khatmas WHERE group_id = p_group AND status = 'active') THEN RAISE EXCEPTION 'Une khatma d''équipe est déjà en cours dans ce groupe.'; END IF;
  INSERT INTO team_khatmas (group_id, scope, created_by, ends_at) VALUES (p_group, p_scope, me, now() + make_interval(days => p_days)) RETURNING id INTO kid;
  RETURN kid;
END $$
--;;
CREATE OR REPLACE FUNCTION tk_get(p_id UUID) RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE me UUID := auth.uid(); k team_khatmas;
BEGIN
  IF me IS NULL THEN RAISE EXCEPTION 'non connecté'; END IF;
  PERFORM tk_expire();
  SELECT * INTO k FROM team_khatmas WHERE id = p_id;
  IF k.id IS NULL OR NOT EXISTS (SELECT 1 FROM group_members WHERE group_id = k.group_id AND user_id = me) THEN RAISE EXCEPTION 'Khatma introuvable.'; END IF;
  RETURN tk_summary(k, me) || jsonb_build_object(
    'me', me, 'pct', tk_setting('pct', '80'), 'bonus', tk_setting('bonus', '50'),
    'units', to_jsonb(tk_units(k.scope)),
    'parts', COALESCE((SELECT jsonb_agg(jsonb_build_object('unit', p.unit, 'user_id', p.user_id, 'score', p.score, 'total', p.total, 'at', p.validated_at) ORDER BY p.unit) FROM team_khatma_parts p WHERE p.khatma_id = k.id), '[]'),
    'team', COALESCE((SELECT jsonb_agg(jsonb_build_object('user_id', m.user_id, 'username', pr.username, 'name', COALESCE(m.display_name, pr.full_name),
        'count', (SELECT count(*) FROM team_khatma_parts p WHERE p.khatma_id = k.id AND p.user_id = m.user_id))
        ORDER BY (SELECT count(*) FROM team_khatma_parts p WHERE p.khatma_id = k.id AND p.user_id = m.user_id) DESC, m.joined_at)
      FROM group_members m LEFT JOIN profiles pr ON pr.id = m.user_id WHERE m.group_id = k.group_id), '[]'));
END $$
--;;
CREATE OR REPLACE FUNCTION tk_validate(p_id UUID, p_unit INT, p_score INT, p_total INT) RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE me UUID := auth.uid(); k team_khatmas; pct INT := tk_setting('pct', '80')::INT; ok BOOLEAN; added BOOLEAN := FALSE;
  n_done INT; n_total INT; bonus INT := 0; finished BOOLEAN := FALSE;
BEGIN
  IF me IS NULL THEN RAISE EXCEPTION 'non connecté'; END IF;
  PERFORM tk_expire();
  SELECT * INTO k FROM team_khatmas WHERE id = p_id FOR UPDATE;
  IF k.id IS NULL OR NOT EXISTS (SELECT 1 FROM group_members WHERE group_id = k.group_id AND user_id = me) THEN RAISE EXCEPTION 'Khatma introuvable.'; END IF;
  IF NOT (p_unit = ANY (tk_units(k.scope))) OR p_total IS NULL OR p_total < 1 OR p_total > 30 OR p_score < 0 OR p_score > p_total THEN RAISE EXCEPTION 'Partie invalide.'; END IF;
  ok := p_score * 100 >= pct * p_total;
  IF ok AND k.status = 'active' THEN
    INSERT INTO team_khatma_parts (khatma_id, unit, user_id, score, total) VALUES (k.id, p_unit, me, p_score, p_total) ON CONFLICT DO NOTHING;
    added := FOUND;
  END IF;
  n_total := cardinality(tk_units(k.scope));
  SELECT count(*) INTO n_done FROM team_khatma_parts WHERE khatma_id = k.id;
  IF added AND n_done >= n_total THEN
    bonus := tk_setting('bonus', '50')::INT;
    UPDATE team_khatmas SET status = 'done', finished_at = now() WHERE id = k.id;
    IF bonus > 0 THEN
      INSERT INTO game_sessions (user_id, game, level, score, total, xp) SELECT m.user_id, 'khatma', 1, 0, 0, bonus FROM group_members m WHERE m.group_id = k.group_id;
    END IF;
    finished := TRUE;
  END IF;
  RETURN jsonb_build_object('passed', ok, 'validated', added, 'already', ok AND NOT added AND k.status = 'active',
    'status', CASE WHEN finished THEN 'done' ELSE k.status END, 'done', n_done, 'total', n_total, 'pct', pct, 'finished', finished, 'bonus', bonus,
    'next', (SELECT u FROM unnest(tk_units(k.scope)) u WHERE NOT EXISTS (SELECT 1 FROM team_khatma_parts p WHERE p.khatma_id = k.id AND p.unit = u) ORDER BY u LIMIT 1));
END $$
--;;
REVOKE ALL ON FUNCTION tk_summary(team_khatmas, UUID), tk_expire(), tk_setting(TEXT, JSONB) FROM PUBLIC, authenticated
--;;
GRANT EXECUTE ON FUNCTION tk_list(), tk_create(UUID, TEXT, INT), tk_get(UUID), tk_validate(UUID, INT, INT, INT), tk_units(TEXT) TO authenticated
