-- Lexique mot à mot en français (relu dans l'admin) et les 99 noms d'Allah.
CREATE TABLE IF NOT EXISTS word_fr (
  surah SMALLINT NOT NULL, ayah SMALLINT NOT NULL, pos SMALLINT NOT NULL,
  ar TEXT NOT NULL, en TEXT NOT NULL DEFAULT '', fr TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','review','published','disabled')),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_by TEXT,
  PRIMARY KEY (surah, ayah, pos)
)
--;;
ALTER TABLE word_fr ENABLE ROW LEVEL SECURITY
--;;
DROP POLICY IF EXISTS word_fr_read ON word_fr
--;;
CREATE POLICY word_fr_read ON word_fr FOR SELECT TO authenticated, anonymous USING (status = 'published' AND fr IS NOT NULL)
--;;
GRANT SELECT ON word_fr TO authenticated, anonymous
--;;
CREATE TABLE IF NOT EXISTS allah_names (
  n SMALLINT PRIMARY KEY CHECK (n BETWEEN 1 AND 99),
  ar TEXT NOT NULL, translit TEXT NOT NULL, meaning TEXT NOT NULL, explanation TEXT NOT NULL DEFAULT '',
  verse_ref TEXT, verse_ar TEXT, verse_fr TEXT,
  invocation TEXT, invocation_src TEXT,
  status TEXT NOT NULL DEFAULT 'review' CHECK (status IN ('draft','review','published','disabled')),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_by TEXT
)
--;;
ALTER TABLE allah_names ENABLE ROW LEVEL SECURITY
--;;
DROP POLICY IF EXISTS allah_names_read ON allah_names
--;;
CREATE POLICY allah_names_read ON allah_names FOR SELECT TO authenticated, anonymous USING (status = 'published')
--;;
GRANT SELECT ON allah_names TO authenticated, anonymous
--;;
CREATE TABLE IF NOT EXISTS allah_names_progress (
  user_id UUID NOT NULL, n SMALLINT NOT NULL, learned BOOLEAN NOT NULL DEFAULT FALSE, again BOOLEAN NOT NULL DEFAULT FALSE,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(), PRIMARY KEY (user_id, n)
)
--;;
ALTER TABLE allah_names_progress ENABLE ROW LEVEL SECURITY
--;;
DROP POLICY IF EXISTS allah_names_progress_own ON allah_names_progress
--;;
CREATE POLICY allah_names_progress_own ON allah_names_progress FOR SELECT TO authenticated USING (user_id = auth.uid())
--;;
GRANT SELECT ON allah_names_progress TO authenticated
--;;
-- learned : true/false/null (inchangé) ; again : true (raté au quiz), false (réussi), null (inchangé)
CREATE OR REPLACE FUNCTION names_mark(p_n INT, p_learned BOOLEAN DEFAULT NULL, p_again BOOLEAN DEFAULT NULL)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL OR p_n NOT BETWEEN 1 AND 99 THEN RETURN; END IF;
  INSERT INTO allah_names_progress(user_id, n, learned, again) VALUES (auth.uid(), p_n, COALESCE(p_learned, FALSE), COALESCE(p_again, FALSE))
  ON CONFLICT (user_id, n) DO UPDATE SET
    learned = COALESCE(p_learned, allah_names_progress.learned),
    again = COALESCE(p_again, allah_names_progress.again), updated_at = now();
  IF p_learned IS TRUE THEN
    INSERT INTO activity_days(user_id, day) VALUES (auth.uid(), (now() AT TIME ZONE 'UTC')::date)
    ON CONFLICT (user_id, day) DO UPDATE SET actions = activity_days.actions + 1;
  END IF;
END $$
--;;
GRANT EXECUTE ON FUNCTION names_mark(INT, BOOLEAN, BOOLEAN) TO authenticated
