-- Phase 5 : groupes (classe / famille / cercle), leçons, khatma collective, rappels push
CREATE TABLE IF NOT EXISTS study_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL CHECK (length(name) BETWEEN 1 AND 60),
  kind TEXT NOT NULL CHECK (kind IN ('class','family','circle')),
  owner_id UUID NOT NULL REFERENCES neon_auth."user"(id) ON DELETE CASCADE DEFAULT auth.uid(),
  invite_code TEXT NOT NULL UNIQUE DEFAULT upper(substr(md5(gen_random_uuid()::text), 1, 6)),
  created_at TIMESTAMPTZ DEFAULT NOW()
)
--;;
CREATE TABLE IF NOT EXISTS group_members (
  group_id UUID NOT NULL REFERENCES study_groups(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES neon_auth."user"(id) ON DELETE CASCADE DEFAULT auth.uid(),
  role TEXT NOT NULL CHECK (role IN ('teacher','student','parent','child','member')),
  display_name TEXT,
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (group_id, user_id)
)
--;;
CREATE INDEX IF NOT EXISTS idx_group_members_user ON group_members(user_id)
--;;
CREATE TABLE IF NOT EXISTS group_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES study_groups(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  surah_number INTEGER NOT NULL,
  from_verse INTEGER NOT NULL,
  to_verse INTEGER NOT NULL,
  due_date DATE,
  note TEXT,
  created_by UUID REFERENCES neon_auth."user"(id) ON DELETE SET NULL DEFAULT auth.uid(),
  created_at TIMESTAMPTZ DEFAULT NOW()
)
--;;
CREATE TABLE IF NOT EXISTS assignment_status (
  assignment_id UUID NOT NULL REFERENCES group_assignments(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES neon_auth."user"(id) ON DELETE CASCADE DEFAULT auth.uid(),
  status TEXT NOT NULL CHECK (status IN ('done','validated','redo')),
  teacher_note TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (assignment_id, user_id)
)
--;;
CREATE TABLE IF NOT EXISTS khatmas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES study_groups(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  target_date DATE,
  created_by UUID REFERENCES neon_auth."user"(id) ON DELETE SET NULL DEFAULT auth.uid(),
  created_at TIMESTAMPTZ DEFAULT NOW()
)
--;;
CREATE TABLE IF NOT EXISTS khatma_parts (
  khatma_id UUID NOT NULL REFERENCES khatmas(id) ON DELETE CASCADE,
  juz INTEGER NOT NULL CHECK (juz BETWEEN 1 AND 30),
  user_id UUID NOT NULL REFERENCES neon_auth."user"(id) ON DELETE CASCADE DEFAULT auth.uid(),
  user_name TEXT,
  status TEXT NOT NULL DEFAULT 'reserved' CHECK (status IN ('reserved','done')),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (khatma_id, juz)
)
--;;
CREATE TABLE IF NOT EXISTS push_subscriptions (
  endpoint TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES neon_auth."user"(id) ON DELETE CASCADE DEFAULT auth.uid(),
  p256dh TEXT NOT NULL,
  auth_key TEXT NOT NULL,
  lat REAL NOT NULL,
  lng REAL NOT NULL,
  tz TEXT NOT NULL,
  prayers TEXT[] NOT NULL DEFAULT '{fajr,maghrib}',
  offset_min INTEGER NOT NULL DEFAULT 15,
  method TEXT NOT NULL DEFAULT 'MuslimWorldLeague',
  last_sent JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
)
--;;
-- Fonctions d'accès (SECURITY DEFINER : évitent la récursion des politiques)
CREATE OR REPLACE FUNCTION is_group_member(gid UUID) RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM group_members WHERE group_id = gid AND user_id = auth.uid())
$$
--;;
CREATE OR REPLACE FUNCTION is_group_staff(gid UUID) RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM group_members WHERE group_id = gid AND user_id = auth.uid() AND role IN ('teacher','parent'))
$$
--;;
CREATE OR REPLACE FUNCTION can_view_user(target UUID) RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM group_members me JOIN group_members them ON them.group_id = me.group_id
    WHERE me.user_id = auth.uid() AND me.role IN ('teacher','parent')
      AND them.user_id = target AND them.role IN ('student','child'))
$$
--;;
CREATE OR REPLACE FUNCTION create_group(p_name TEXT, p_kind TEXT, p_display TEXT) RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE gid UUID;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  INSERT INTO study_groups(name, kind, owner_id) VALUES (p_name, p_kind, auth.uid()) RETURNING id INTO gid;
  INSERT INTO group_members(group_id, user_id, role, display_name)
  VALUES (gid, auth.uid(), CASE p_kind WHEN 'class' THEN 'teacher' WHEN 'family' THEN 'parent' ELSE 'member' END, p_display);
  RETURN gid;
END $$
--;;
CREATE OR REPLACE FUNCTION join_group(p_code TEXT, p_display TEXT, p_role TEXT) RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE g study_groups; r TEXT;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  SELECT * INTO g FROM study_groups WHERE invite_code = upper(trim(p_code));
  IF g.id IS NULL THEN RAISE EXCEPTION 'invalid code'; END IF;
  r := CASE g.kind WHEN 'class' THEN 'student' WHEN 'circle' THEN 'member'
       ELSE CASE WHEN p_role = 'parent' THEN 'parent' ELSE 'child' END END;
  INSERT INTO group_members(group_id, user_id, role, display_name) VALUES (g.id, auth.uid(), r, p_display)
  ON CONFLICT (group_id, user_id) DO UPDATE SET display_name = EXCLUDED.display_name;
  RETURN g.id;
END $$
--;;
CREATE OR REPLACE FUNCTION group_preview(p_code TEXT) RETURNS TABLE(name TEXT, kind TEXT, members BIGINT) LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT g.name, g.kind, (SELECT count(*) FROM group_members m WHERE m.group_id = g.id)
  FROM study_groups g WHERE g.invite_code = upper(trim(p_code))
$$
--;;
GRANT EXECUTE ON FUNCTION is_group_member(UUID), is_group_staff(UUID), can_view_user(UUID), create_group(TEXT,TEXT,TEXT), join_group(TEXT,TEXT,TEXT), group_preview(TEXT) TO authenticated
--;;
ALTER TABLE study_groups ENABLE ROW LEVEL SECURITY
--;;
ALTER TABLE group_members ENABLE ROW LEVEL SECURITY
--;;
ALTER TABLE group_assignments ENABLE ROW LEVEL SECURITY
--;;
ALTER TABLE assignment_status ENABLE ROW LEVEL SECURITY
--;;
ALTER TABLE khatmas ENABLE ROW LEVEL SECURITY
--;;
ALTER TABLE khatma_parts ENABLE ROW LEVEL SECURITY
--;;
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY
--;;
DROP POLICY IF EXISTS groups_select ON study_groups
--;;
CREATE POLICY groups_select ON study_groups FOR SELECT TO authenticated USING (is_group_member(id))
--;;
DROP POLICY IF EXISTS groups_owner ON study_groups
--;;
CREATE POLICY groups_owner ON study_groups FOR UPDATE TO authenticated USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid())
--;;
DROP POLICY IF EXISTS groups_delete ON study_groups
--;;
CREATE POLICY groups_delete ON study_groups FOR DELETE TO authenticated USING (owner_id = auth.uid())
--;;
DROP POLICY IF EXISTS members_select ON group_members
--;;
CREATE POLICY members_select ON group_members FOR SELECT TO authenticated USING (is_group_member(group_id))
--;;
DROP POLICY IF EXISTS members_leave ON group_members
--;;
CREATE POLICY members_leave ON group_members FOR DELETE TO authenticated USING (user_id = auth.uid() OR is_group_staff(group_id))
--;;
DROP POLICY IF EXISTS members_rename ON group_members
--;;
CREATE POLICY members_rename ON group_members FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid())
--;;
DROP POLICY IF EXISTS assign_select ON group_assignments
--;;
CREATE POLICY assign_select ON group_assignments FOR SELECT TO authenticated USING (is_group_member(group_id))
--;;
DROP POLICY IF EXISTS assign_staff ON group_assignments
--;;
CREATE POLICY assign_staff ON group_assignments FOR ALL TO authenticated USING (is_group_staff(group_id)) WITH CHECK (is_group_staff(group_id))
--;;
DROP POLICY IF EXISTS astatus_all ON assignment_status
--;;
CREATE POLICY astatus_all ON assignment_status FOR ALL TO authenticated
  USING (user_id = auth.uid() OR is_group_staff((SELECT group_id FROM group_assignments a WHERE a.id = assignment_id)))
  WITH CHECK (user_id = auth.uid() OR is_group_staff((SELECT group_id FROM group_assignments a WHERE a.id = assignment_id)))
--;;
DROP POLICY IF EXISTS khatma_select ON khatmas
--;;
CREATE POLICY khatma_select ON khatmas FOR SELECT TO authenticated USING (is_group_member(group_id))
--;;
DROP POLICY IF EXISTS khatma_insert ON khatmas
--;;
CREATE POLICY khatma_insert ON khatmas FOR INSERT TO authenticated WITH CHECK (is_group_member(group_id))
--;;
DROP POLICY IF EXISTS khatma_manage ON khatmas
--;;
CREATE POLICY khatma_manage ON khatmas FOR DELETE TO authenticated USING (created_by = auth.uid() OR is_group_staff(group_id))
--;;
DROP POLICY IF EXISTS parts_select ON khatma_parts
--;;
CREATE POLICY parts_select ON khatma_parts FOR SELECT TO authenticated USING (is_group_member((SELECT group_id FROM khatmas k WHERE k.id = khatma_id)))
--;;
DROP POLICY IF EXISTS parts_insert ON khatma_parts
--;;
CREATE POLICY parts_insert ON khatma_parts FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid() AND is_group_member((SELECT group_id FROM khatmas k WHERE k.id = khatma_id)))
--;;
DROP POLICY IF EXISTS parts_own ON khatma_parts
--;;
CREATE POLICY parts_own ON khatma_parts FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid())
--;;
DROP POLICY IF EXISTS parts_delete ON khatma_parts
--;;
CREATE POLICY parts_delete ON khatma_parts FOR DELETE TO authenticated USING (user_id = auth.uid() OR is_group_staff((SELECT group_id FROM khatmas k WHERE k.id = khatma_id)))
--;;
DROP POLICY IF EXISTS push_own ON push_subscriptions
--;;
CREATE POLICY push_own ON push_subscriptions FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid())
--;;
-- Le maître / le parent peut consulter la progression de ses élèves / enfants
DROP POLICY IF EXISTS progress_staff_view ON memorization_progress
--;;
CREATE POLICY progress_staff_view ON memorization_progress FOR SELECT TO authenticated USING (can_view_user(user_id))
--;;
DROP POLICY IF EXISTS reviews_staff_view ON verse_reviews
--;;
CREATE POLICY reviews_staff_view ON verse_reviews FOR SELECT TO authenticated USING (can_view_user(user_id))
--;;
GRANT SELECT, INSERT, UPDATE, DELETE ON study_groups, group_members, group_assignments, assignment_status, khatmas, khatma_parts, push_subscriptions TO authenticated
