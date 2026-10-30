-- Apprendre à lire (Qaida) : progression par leçon
CREATE TABLE IF NOT EXISTS reading_lessons (
  user_id UUID REFERENCES neon_auth."user"(id) ON DELETE CASCADE NOT NULL DEFAULT auth.uid(),
  lesson_id TEXT NOT NULL,
  best_score SMALLINT NOT NULL DEFAULT 0,
  xp INTEGER NOT NULL DEFAULT 0,
  attempts INTEGER NOT NULL DEFAULT 0,
  completed_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, lesson_id)
)
--;;
ALTER TABLE reading_lessons ENABLE ROW LEVEL SECURITY
--;;
DROP POLICY IF EXISTS "reading_own" ON reading_lessons
--;;
CREATE POLICY "reading_own" ON reading_lessons FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id)
--;;
GRANT SELECT, INSERT, UPDATE, DELETE ON reading_lessons TO authenticated
--;;
DROP TRIGGER IF EXISTS trg_act_reading ON reading_lessons
--;;
CREATE TRIGGER trg_act_reading AFTER INSERT OR UPDATE ON reading_lessons FOR EACH ROW EXECUTE FUNCTION log_activity()
