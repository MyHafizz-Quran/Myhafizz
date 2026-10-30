-- Phase 1 apprentissage : révision espacée + programme Sabaq/Sabqi/Manzil
CREATE TABLE IF NOT EXISTS verse_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES neon_auth."user"(id) ON DELETE CASCADE NOT NULL DEFAULT auth.uid(),
  surah_number INTEGER NOT NULL,
  verse_number INTEGER NOT NULL,
  interval_days REAL NOT NULL DEFAULT 0,
  ease REAL NOT NULL DEFAULT 2.5,
  reps INTEGER NOT NULL DEFAULT 0,
  lapses INTEGER NOT NULL DEFAULT 0,
  due_date DATE NOT NULL DEFAULT CURRENT_DATE,
  last_grade SMALLINT,
  last_reviewed TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, surah_number, verse_number)
)
--;;
CREATE INDEX IF NOT EXISTS idx_verse_reviews_user_due ON verse_reviews(user_id, due_date)
--;;
CREATE TABLE IF NOT EXISTS hifz_plans (
  user_id UUID PRIMARY KEY REFERENCES neon_auth."user"(id) ON DELETE CASCADE DEFAULT auth.uid(),
  start_surah INTEGER NOT NULL DEFAULT 114,
  direction TEXT NOT NULL DEFAULT 'backward' CHECK (direction IN ('forward','backward')),
  daily_new INTEGER NOT NULL DEFAULT 3,
  manzil_daily INTEGER NOT NULL DEFAULT 20,
  goal_label TEXT,
  goal_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
)
--;;
ALTER TABLE verse_reviews ENABLE ROW LEVEL SECURITY
--;;
ALTER TABLE hifz_plans ENABLE ROW LEVEL SECURITY
--;;
DROP POLICY IF EXISTS "reviews_own" ON verse_reviews
--;;
CREATE POLICY "reviews_own" ON verse_reviews FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id)
--;;
DROP POLICY IF EXISTS "plans_own" ON hifz_plans
--;;
CREATE POLICY "plans_own" ON hifz_plans FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id)
--;;
GRANT SELECT, INSERT, UPDATE, DELETE ON verse_reviews, hifz_plans TO authenticated
