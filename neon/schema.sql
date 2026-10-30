-- MyHafizz schema for Neon (Managed Better Auth + Data API)
-- Ported from supabase/migrations 001-004. Statements separated by "--;;" lines.
CREATE EXTENSION IF NOT EXISTS pgcrypto
--;;
CREATE TABLE IF NOT EXISTS memorization_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES neon_auth."user"(id) ON DELETE CASCADE NOT NULL DEFAULT auth.uid(),
  surah_number INTEGER NOT NULL,
  memorized_verses INTEGER[] DEFAULT '{}',
  total_verses INTEGER,
  status TEXT DEFAULT 'not_started' CHECK (status IN ('not_started','in_progress','completed')),
  last_reviewed TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, surah_number)
)
--;;
CREATE INDEX IF NOT EXISTS idx_memorization_progress_user_id ON memorization_progress(user_id)
--;;
CREATE INDEX IF NOT EXISTS idx_memorization_progress_status ON memorization_progress(status)
--;;
CREATE TABLE IF NOT EXISTS challenges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  surah_number INTEGER,
  target_verses INTEGER,
  deadline TIMESTAMPTZ,
  badge_emoji TEXT DEFAULT '🏆',
  badge_name TEXT DEFAULT 'Champion',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
)
--;;
CREATE INDEX IF NOT EXISTS idx_challenges_is_active ON challenges(is_active)
--;;
CREATE INDEX IF NOT EXISTS idx_challenges_created_at ON challenges(created_at DESC)
--;;
CREATE TABLE IF NOT EXISTS challenge_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge_id UUID REFERENCES challenges(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES neon_auth."user"(id) ON DELETE CASCADE NOT NULL DEFAULT auth.uid(),
  user_email TEXT,
  user_name TEXT,
  memorized_count INTEGER DEFAULT 0,
  completed BOOLEAN DEFAULT false,
  completed_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(challenge_id, user_id)
)
--;;
CREATE INDEX IF NOT EXISTS idx_challenge_participants_challenge_id ON challenge_participants(challenge_id)
--;;
CREATE INDEX IF NOT EXISTS idx_challenge_participants_user_id ON challenge_participants(user_id)
--;;
CREATE TABLE IF NOT EXISTS study_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_email TEXT NOT NULL UNIQUE,
  user_name TEXT,
  avatar_url TEXT,
  whatsapp_number TEXT,
  level TEXT,
  looking_for TEXT,
  availability TEXT[] DEFAULT '{}',
  memorized_count INTEGER DEFAULT 0,
  is_visible BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
)
--;;
CREATE INDEX IF NOT EXISTS idx_study_profiles_is_visible ON study_profiles(is_visible)
--;;
CREATE TABLE IF NOT EXISTS study_matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_email TEXT NOT NULL,
  requester_name TEXT,
  target_email TEXT NOT NULL,
  target_name TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending','accepted','rejected')),
  created_at TIMESTAMPTZ DEFAULT NOW()
)
--;;
CREATE INDEX IF NOT EXISTS idx_study_matches_requester ON study_matches(requester_email)
--;;
CREATE INDEX IF NOT EXISTS idx_study_matches_target ON study_matches(target_email)
--;;
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES neon_auth."user"(id) ON DELETE CASCADE DEFAULT auth.uid(),
  full_name TEXT,
  avatar_url TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
)
--;;
-- Email of the signed-in user (from the Neon Auth JWT, fallback to neon_auth.user)
CREATE OR REPLACE FUNCTION public.current_email() RETURNS TEXT
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE(auth.jwt() ->> 'email', (SELECT email FROM neon_auth."user" WHERE id = auth.uid()))
$$
--;;
CREATE OR REPLACE FUNCTION update_updated_at_column() RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql
--;;
DROP TRIGGER IF EXISTS update_memorization_progress_updated_at ON memorization_progress
--;;
CREATE TRIGGER update_memorization_progress_updated_at BEFORE UPDATE ON memorization_progress FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()
--;;
DROP TRIGGER IF EXISTS update_study_profiles_updated_at ON study_profiles
--;;
CREATE TRIGGER update_study_profiles_updated_at BEFORE UPDATE ON study_profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()
--;;
-- RLS
ALTER TABLE memorization_progress ENABLE ROW LEVEL SECURITY
--;;
ALTER TABLE challenges ENABLE ROW LEVEL SECURITY
--;;
ALTER TABLE challenge_participants ENABLE ROW LEVEL SECURITY
--;;
ALTER TABLE study_profiles ENABLE ROW LEVEL SECURITY
--;;
ALTER TABLE study_matches ENABLE ROW LEVEL SECURITY
--;;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY
--;;
CREATE POLICY "progress_read_authenticated" ON memorization_progress FOR SELECT TO authenticated USING (true)
--;;
CREATE POLICY "progress_insert_own" ON memorization_progress FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id)
--;;
CREATE POLICY "progress_update_own" ON memorization_progress FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id)
--;;
CREATE POLICY "progress_delete_own" ON memorization_progress FOR DELETE TO authenticated USING (auth.uid() = user_id)
--;;
CREATE POLICY "challenges_read_all" ON challenges FOR SELECT USING (true)
--;;
CREATE POLICY "participants_read_all" ON challenge_participants FOR SELECT USING (true)
--;;
CREATE POLICY "participants_insert_own" ON challenge_participants FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id)
--;;
CREATE POLICY "participants_update_own" ON challenge_participants FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id)
--;;
CREATE POLICY "study_profiles_read_visible" ON study_profiles FOR SELECT USING (is_visible = true OR user_email = public.current_email())
--;;
CREATE POLICY "study_profiles_manage_own" ON study_profiles FOR ALL TO authenticated USING (user_email = public.current_email()) WITH CHECK (user_email = public.current_email())
--;;
CREATE POLICY "matches_read_own" ON study_matches FOR SELECT TO authenticated USING (requester_email = public.current_email() OR target_email = public.current_email())
--;;
CREATE POLICY "matches_insert_own" ON study_matches FOR INSERT TO authenticated WITH CHECK (requester_email = public.current_email())
--;;
CREATE POLICY "matches_update_party" ON study_matches FOR UPDATE TO authenticated USING (requester_email = public.current_email() OR target_email = public.current_email())
--;;
CREATE POLICY "profiles_read_authenticated" ON profiles FOR SELECT TO authenticated USING (true)
--;;
CREATE POLICY "profiles_insert_own" ON profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id)
--;;
CREATE POLICY "profiles_update_own" ON profiles FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id)
--;;
-- Leaderboard display names (reads neon_auth.user instead of auth.users)
CREATE OR REPLACE FUNCTION public.get_leaderboard_users(user_ids UUID[])
RETURNS TABLE(user_id UUID, display_name TEXT, avatar_url TEXT)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  RETURN QUERY
  SELECT uid.id,
    COALESCE(NULLIF(TRIM(p.full_name),''), NULLIF(TRIM(u.name),''), SPLIT_PART(u.email,'@',1), 'Utilisateur'),
    COALESCE(NULLIF(TRIM(p.avatar_url),''), NULLIF(TRIM(u.image),''), NULL)
  FROM UNNEST(user_ids) AS uid(id)
  LEFT JOIN neon_auth."user" u ON u.id = uid.id
  LEFT JOIN public.profiles p ON p.id = uid.id;
END;
$$
--;;
-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, avatar_url)
  VALUES (NEW.id, COALESCE(NEW.name,''), COALESCE(NEW.image,''))
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$
--;;
DROP TRIGGER IF EXISTS on_auth_user_created ON neon_auth."user"
--;;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON neon_auth."user" FOR EACH ROW EXECUTE FUNCTION public.handle_new_user()
--;;
GRANT USAGE ON SCHEMA public TO authenticated, anonymous
--;;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated
--;;
GRANT SELECT ON challenges, challenge_participants, study_profiles TO anonymous
--;;
GRANT EXECUTE ON FUNCTION public.get_leaderboard_users(UUID[]), public.current_email() TO authenticated
