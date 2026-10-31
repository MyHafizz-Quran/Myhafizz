-- Binôme de révision : groupe de deux, chacun voit la régularité de l'autre et peut l'encourager.
ALTER TABLE study_groups DROP CONSTRAINT IF EXISTS study_groups_kind_check
--;;
ALTER TABLE study_groups ADD CONSTRAINT study_groups_kind_check CHECK (kind IN ('class','family','circle','duo'))
--;;
CREATE OR REPLACE FUNCTION join_group(p_code TEXT, p_display TEXT, p_role TEXT) RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE g study_groups; r TEXT;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  SELECT * INTO g FROM study_groups WHERE invite_code = upper(trim(p_code));
  IF g.id IS NULL THEN RAISE EXCEPTION 'invalid code'; END IF;
  IF g.kind = 'duo' AND NOT EXISTS (SELECT 1 FROM group_members WHERE group_id = g.id AND user_id = auth.uid())
     AND (SELECT count(*) FROM group_members WHERE group_id = g.id) >= 2 THEN
    RAISE EXCEPTION 'duo full';
  END IF;
  r := CASE g.kind WHEN 'class' THEN 'student' WHEN 'circle' THEN 'member' WHEN 'duo' THEN 'member'
       ELSE CASE WHEN p_role = 'parent' THEN 'parent' ELSE 'child' END END;
  INSERT INTO group_members(group_id, user_id, role, display_name) VALUES (g.id, auth.uid(), r, p_display)
  ON CONFLICT (group_id, user_id) DO UPDATE SET display_name = EXCLUDED.display_name;
  RETURN g.id;
END $$
--;;
-- Régularité des deux membres d'un binôme (jamais le contenu de leurs révisions)
CREATE OR REPLACE FUNCTION duo_status(p_group UUID) RETURNS TABLE(user_id UUID, display_name TEXT, is_me BOOLEAN, days7 INT, today BOOLEAN, streak INT)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT m.user_id, m.display_name, m.user_id = auth.uid(),
    (SELECT count(*)::int FROM activity_days a WHERE a.user_id = m.user_id AND a.day > CURRENT_DATE - 7),
    EXISTS (SELECT 1 FROM activity_days a WHERE a.user_id = m.user_id AND a.day = CURRENT_DATE),
    (WITH d AS (SELECT a.day, row_number() OVER (ORDER BY a.day DESC) rn FROM activity_days a WHERE a.user_id = m.user_id AND a.day <= CURRENT_DATE)
     SELECT count(*)::int FROM d WHERE d.day = (SELECT max(day) FROM d) - (rn - 1)::int AND (SELECT max(day) FROM d) >= CURRENT_DATE - 1)
  FROM group_members m JOIN study_groups g ON g.id = m.group_id
  WHERE m.group_id = p_group AND g.kind = 'duo' AND is_group_member(p_group)
$$
--;;
CREATE TABLE IF NOT EXISTS duo_nudges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES study_groups(id) ON DELETE CASCADE,
  from_user UUID NOT NULL REFERENCES neon_auth."user"(id) ON DELETE CASCADE DEFAULT auth.uid(),
  to_user UUID NOT NULL REFERENCES neon_auth."user"(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  seen BOOLEAN NOT NULL DEFAULT false
)
--;;
CREATE INDEX IF NOT EXISTS idx_duo_nudges_to ON duo_nudges(to_user, seen)
--;;
ALTER TABLE duo_nudges ENABLE ROW LEVEL SECURITY
--;;
DROP POLICY IF EXISTS duo_nudges_read ON duo_nudges
--;;
CREATE POLICY duo_nudges_read ON duo_nudges FOR SELECT TO authenticated USING (to_user = auth.uid() OR from_user = auth.uid())
--;;
DROP POLICY IF EXISTS duo_nudges_seen ON duo_nudges
--;;
CREATE POLICY duo_nudges_seen ON duo_nudges FOR UPDATE TO authenticated USING (to_user = auth.uid()) WITH CHECK (to_user = auth.uid())
--;;
-- Encourager : un seul encouragement par jour et par binôme, seulement vers l'autre membre
CREATE OR REPLACE FUNCTION duo_nudge(p_group UUID) RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE other UUID;
BEGIN
  IF auth.uid() IS NULL OR NOT is_group_member(p_group) THEN RAISE EXCEPTION 'not allowed'; END IF;
  SELECT m.user_id INTO other FROM group_members m JOIN study_groups g ON g.id = m.group_id
   WHERE m.group_id = p_group AND g.kind = 'duo' AND m.user_id <> auth.uid() LIMIT 1;
  IF other IS NULL THEN RETURN false; END IF;
  IF EXISTS (SELECT 1 FROM duo_nudges WHERE group_id = p_group AND from_user = auth.uid() AND created_at > CURRENT_DATE) THEN RETURN false; END IF;
  INSERT INTO duo_nudges(group_id, from_user, to_user) VALUES (p_group, auth.uid(), other);
  RETURN true;
END $$
--;;
GRANT SELECT, UPDATE ON duo_nudges TO authenticated
--;;
GRANT EXECUTE ON FUNCTION duo_status(UUID), duo_nudge(UUID) TO authenticated
