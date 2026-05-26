-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =====================
-- TABLE: memorization_progress
-- =====================
CREATE TABLE IF NOT EXISTS memorization_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  surah_number INTEGER NOT NULL,
  memorized_verses INTEGER[] DEFAULT '{}',
  total_verses INTEGER,
  status TEXT DEFAULT 'not_started' CHECK (status IN ('not_started', 'in_progress', 'completed')),
  last_reviewed TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, surah_number)
);

CREATE INDEX idx_memorization_progress_user_id ON memorization_progress(user_id);
CREATE INDEX idx_memorization_progress_status ON memorization_progress(status);

ALTER TABLE memorization_progress ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their own progress" ON memorization_progress
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- =====================
-- TABLE: challenges
-- =====================
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
);

CREATE INDEX idx_challenges_is_active ON challenges(is_active);
CREATE INDEX idx_challenges_created_at ON challenges(created_at DESC);

ALTER TABLE challenges ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view challenges" ON challenges
  FOR SELECT USING (true);
-- Only service role can insert/update challenges (admin only)

-- =====================
-- TABLE: challenge_participants
-- =====================
CREATE TABLE IF NOT EXISTS challenge_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge_id UUID REFERENCES challenges(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  user_email TEXT,
  user_name TEXT,
  memorized_count INTEGER DEFAULT 0,
  completed BOOLEAN DEFAULT false,
  completed_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(challenge_id, user_id)
);

CREATE INDEX idx_challenge_participants_challenge_id ON challenge_participants(challenge_id);
CREATE INDEX idx_challenge_participants_user_id ON challenge_participants(user_id);

ALTER TABLE challenge_participants ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view participants" ON challenge_participants
  FOR SELECT USING (true);
CREATE POLICY "Users can join challenges" ON challenge_participants
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own participation" ON challenge_participants
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- =====================
-- TABLE: study_profiles
-- =====================
CREATE TABLE IF NOT EXISTS study_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_email TEXT NOT NULL UNIQUE,
  user_name TEXT,
  avatar_url TEXT,
  level TEXT,
  looking_for TEXT,
  availability TEXT[] DEFAULT '{}',
  memorized_count INTEGER DEFAULT 0,
  is_visible BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_study_profiles_is_visible ON study_profiles(is_visible);

ALTER TABLE study_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view visible profiles" ON study_profiles
  FOR SELECT USING (is_visible = true);
CREATE POLICY "Users can manage their own profile" ON study_profiles
  FOR ALL USING (user_email = auth.jwt() ->> 'email') WITH CHECK (user_email = auth.jwt() ->> 'email');

-- =====================
-- TABLE: study_matches
-- =====================
CREATE TABLE IF NOT EXISTS study_matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_email TEXT NOT NULL,
  requester_name TEXT,
  target_email TEXT NOT NULL,
  target_name TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_study_matches_requester ON study_matches(requester_email);
CREATE INDEX idx_study_matches_target ON study_matches(target_email);

ALTER TABLE study_matches ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own matches" ON study_matches
  FOR SELECT USING (
    requester_email = auth.jwt() ->> 'email' OR
    target_email = auth.jwt() ->> 'email'
  );
CREATE POLICY "Users can create match requests" ON study_matches
  FOR INSERT WITH CHECK (requester_email = auth.jwt() ->> 'email');
CREATE POLICY "Users can update matches they are part of" ON study_matches
  FOR UPDATE USING (
    requester_email = auth.jwt() ->> 'email' OR
    target_email = auth.jwt() ->> 'email'
  );

-- =====================
-- updated_at trigger
-- =====================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_memorization_progress_updated_at
  BEFORE UPDATE ON memorization_progress
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_study_profiles_updated_at
  BEFORE UPDATE ON study_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

