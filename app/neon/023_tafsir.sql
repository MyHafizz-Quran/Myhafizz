-- Espace Tafsir : textes des tafsirs (copie fidèle des sources), progression et questions de compréhension.
CREATE TABLE IF NOT EXISTS tafsir_sources (
  key TEXT PRIMARY KEY, name TEXT NOT NULL, lang TEXT NOT NULL, author TEXT NOT NULL DEFAULT '',
  credit TEXT NOT NULL DEFAULT '', sort SMALLINT NOT NULL DEFAULT 0, enabled BOOLEAN NOT NULL DEFAULT TRUE
)
--;;
CREATE TABLE IF NOT EXISTS tafsir_texts (
  src TEXT NOT NULL REFERENCES tafsir_sources(key) ON DELETE CASCADE,
  surah SMALLINT NOT NULL, ayah SMALLINT NOT NULL,
  ref_ayah SMALLINT NOT NULL, -- verset où se trouve l'explication (les tafsirs arabes expliquent parfois plusieurs versets ensemble)
  ref_to SMALLINT NOT NULL,   -- dernier verset couvert par cette explication
  body TEXT,
  PRIMARY KEY (src, surah, ayah)
)
--;;
ALTER TABLE tafsir_sources ENABLE ROW LEVEL SECURITY
--;;
ALTER TABLE tafsir_texts ENABLE ROW LEVEL SECURITY
--;;
CREATE TABLE IF NOT EXISTS tafsir_progress (
  user_id UUID NOT NULL, surah SMALLINT NOT NULL, ayah SMALLINT NOT NULL, done_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, surah, ayah)
)
--;;
ALTER TABLE tafsir_progress ENABLE ROW LEVEL SECURITY
--;;
DROP POLICY IF EXISTS tafsir_progress_own ON tafsir_progress
--;;
CREATE POLICY tafsir_progress_own ON tafsir_progress FOR SELECT TO authenticated USING (user_id = auth.uid())
--;;
GRANT SELECT ON tafsir_progress TO authenticated
--;;
-- questions de compréhension : dans game_questions (category 'tafsir'), avec le verset visé
ALTER TABLE game_questions ADD COLUMN IF NOT EXISTS surah SMALLINT
--;;
ALTER TABLE game_questions ADD COLUMN IF NOT EXISTS ayah SMALLINT
--;;
CREATE INDEX IF NOT EXISTS game_questions_tafsir ON game_questions (surah, ayah) WHERE category = 'tafsir'
--;;
CREATE OR REPLACE FUNCTION tafsir_list() RETURNS JSONB LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE(jsonb_agg(jsonb_build_object('key', key, 'name', name, 'lang', lang, 'author', author, 'credit', credit) ORDER BY sort), '[]')
  FROM tafsir_sources WHERE enabled
$$
--;;
-- explications d'une suite de versets ; renvoie l'explication groupée une seule fois
CREATE OR REPLACE FUNCTION tafsir_get(p_src TEXT, p_surah INT, p_from INT, p_to INT) RETURNS JSONB LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  WITH v AS (SELECT * FROM tafsir_texts t WHERE t.src = p_src AND t.surah = p_surah AND t.ayah BETWEEN p_from AND LEAST(p_to, p_from + 60))
  SELECT COALESCE(jsonb_agg(jsonb_build_object('ayah', v.ayah, 'from', v.ref_ayah, 'to', v.ref_to,
    'body', CASE WHEN v.ayah = v.ref_ayah OR v.ayah = p_from THEN (SELECT body FROM tafsir_texts r WHERE r.src = p_src AND r.surah = p_surah AND r.ayah = v.ref_ayah) END) ORDER BY v.ayah), '[]')
  FROM v
$$
--;;
-- progression : versets étudiés par sourate + série
CREATE OR REPLACE FUNCTION tafsir_me() RETURNS JSONB LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT jsonb_build_object(
    'surahs', COALESCE((SELECT jsonb_object_agg(surah, n) FROM (SELECT surah, count(*) n FROM tafsir_progress WHERE user_id = auth.uid() GROUP BY surah) x), '{}'),
    'verses', (SELECT count(*) FROM tafsir_progress WHERE user_id = auth.uid()),
    'last', (SELECT jsonb_build_object('surah', surah, 'ayah', ayah) FROM tafsir_progress WHERE user_id = auth.uid() ORDER BY done_at DESC, ayah DESC LIMIT 1))
$$
--;;
-- questions publiées d'une leçon (la bonne réponse est envoyée pour la correction expliquée immédiate, comme les autres jeux)
CREATE OR REPLACE FUNCTION tafsir_questions(p_surah INT, p_from INT, p_to INT) RETURNS JSONB LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE(jsonb_agg(jsonb_build_object('id', id, 'ayah', ayah, 'question', question, 'choices', choices, 'answer', answer, 'explanation', explanation, 'source', source) ORDER BY ayah, id), '[]')
  FROM game_questions WHERE category = 'tafsir' AND status = 'published' AND surah = p_surah AND ayah BETWEEN p_from AND p_to
$$
--;;
-- fin de leçon : versets marqués étudiés, journée d'apprentissage (série + ligue), stats des questions
CREATE OR REPLACE FUNCTION tafsir_done(p_surah INT, p_from INT, p_to INT, p_answers JSONB DEFAULT '[]') RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE me UUID := auth.uid(); a JSONB;
BEGIN
  IF me IS NULL THEN RAISE EXCEPTION 'non connecté'; END IF;
  IF p_surah NOT BETWEEN 1 AND 114 OR p_from < 1 OR p_to < p_from OR p_to - p_from > 40 THEN RAISE EXCEPTION 'Leçon invalide.'; END IF;
  INSERT INTO tafsir_progress (user_id, surah, ayah) SELECT me, p_surah, g FROM generate_series(p_from, p_to) g
    WHERE EXISTS (SELECT 1 FROM tafsir_texts t WHERE t.src = 'fr_mukhtasar' AND t.surah = p_surah AND t.ayah = g)
  ON CONFLICT (user_id, surah, ayah) DO UPDATE SET done_at = now();
  INSERT INTO activity_days(user_id, day) VALUES (me, (now() AT TIME ZONE 'UTC')::date)
  ON CONFLICT (user_id, day) DO UPDATE SET actions = activity_days.actions + 1;
  FOR a IN SELECT value FROM jsonb_array_elements(COALESCE(p_answers, '[]')) LOOP
    UPDATE game_questions SET plays = plays + 1, correct = correct + CASE WHEN (a->>'ok')::BOOLEAN THEN 1 ELSE 0 END
    WHERE id = a->>'id' AND category = 'tafsir';
  END LOOP;
  RETURN tafsir_me();
END $$
--;;
REVOKE ALL ON FUNCTION tafsir_done(INT, INT, INT, JSONB) FROM PUBLIC
--;;
GRANT EXECUTE ON FUNCTION tafsir_list(), tafsir_get(TEXT, INT, INT, INT), tafsir_questions(INT, INT, INT) TO authenticated, anonymous
--;;
GRANT EXECUTE ON FUNCTION tafsir_me(), tafsir_done(INT, INT, INT, JSONB) TO authenticated
--;;
INSERT INTO tafsir_sources (key, name, lang, author, credit, sort) VALUES
 ('fr_mukhtasar', 'L''Abrégé de l''exégèse', 'fr', 'Centre Tafsir des études coraniques', 'L''Abrégé de l''exégèse du Coran (Al-Mukhtasar fi Tafsir), Centre Tafsir des études coraniques, via QuranEnc.com', 1),
 ('ar_saadi', 'as-Sa''di', 'ar', 'Abd ar-Rahman as-Sa''di', 'Taysir al-Karim ar-Rahman, as-Sa''di, via Quran.com', 2),
 ('ar_muyassar', 'al-Muyassar', 'ar', 'Complexe du Roi Fahd', 'At-Tafsir al-Muyassar, Complexe du Roi Fahd, via Quran.com', 3),
 ('ar_ibnkathir', 'Ibn Kathir', 'ar', 'Ibn Kathir', 'Tafsir al-Quran al-Azim, Ibn Kathir, via Quran.com', 4)
ON CONFLICT (key) DO UPDATE SET name = EXCLUDED.name, credit = EXCLUDED.credit, sort = EXCLUDED.sort
--;;
-- longueur de l'explication française de chaque verset, pour découper les leçons
CREATE OR REPLACE FUNCTION tafsir_plan(p_surah INT) RETURNS JSONB LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE(jsonb_agg(jsonb_build_array(ayah, length(body)) ORDER BY ayah), '[]') FROM tafsir_texts WHERE src = 'fr_mukhtasar' AND surah = p_surah
$$
--;;
GRANT EXECUTE ON FUNCTION tafsir_plan(INT) TO authenticated, anonymous
