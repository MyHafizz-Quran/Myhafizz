-- Tajwid : la Tuḥfat al-Aṭfāl d'al-Jamzūrī (texte, règles, exemples du Coran, minutage des récitants, progression)
CREATE TABLE IF NOT EXISTS tajwid_units (
  n SMALLINT PRIMARY KEY, title TEXT NOT NULL, title_ar TEXT NOT NULL, sub TEXT NOT NULL, v_from SMALLINT NOT NULL, v_to SMALLINT NOT NULL
)
--;;
CREATE TABLE IF NOT EXISTS tajwid_verses (
  n SMALLINT PRIMARY KEY, unit SMALLINT NOT NULL REFERENCES tajwid_units(n), ar_a TEXT NOT NULL, ar_b TEXT NOT NULL,
  translit TEXT NOT NULL, fr TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'published', updated_at TIMESTAMPTZ DEFAULT now()
)
--;;
CREATE TABLE IF NOT EXISTS tajwid_rules (
  id TEXT PRIMARY KEY, unit SMALLINT NOT NULL REFERENCES tajwid_units(n), ord SMALLINT NOT NULL, name TEXT NOT NULL, name_ar TEXT NOT NULL,
  label TEXT NOT NULL, letters TEXT NOT NULL DEFAULT '', body TEXT NOT NULL, verses TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'published', updated_at TIMESTAMPTZ DEFAULT now()
)
--;;
CREATE TABLE IF NOT EXISTS tajwid_examples (
  id SERIAL PRIMARY KEY, rule TEXT NOT NULL REFERENCES tajwid_rules(id) ON DELETE CASCADE, surah SMALLINT NOT NULL, ayah SMALLINT NOT NULL,
  g SMALLINT NOT NULL, words SMALLINT[] NOT NULL, txt TEXT NOT NULL, nwords SMALLINT NOT NULL, ord SMALLINT NOT NULL DEFAULT 0
)
--;;
CREATE INDEX IF NOT EXISTS tajwid_examples_rule ON tajwid_examples(rule, ord)
--;;
CREATE TABLE IF NOT EXISTS tajwid_audio (
  reciter TEXT NOT NULL, n SMALLINT NOT NULL, part SMALLINT NOT NULL DEFAULT 1, t0 REAL NOT NULL, t1 REAL NOT NULL,
  PRIMARY KEY (reciter, n)
)
--;;
CREATE TABLE IF NOT EXISTS tajwid_progress (
  user_id UUID NOT NULL, unit SMALLINT NOT NULL, best SMALLINT NOT NULL DEFAULT 0, total SMALLINT NOT NULL DEFAULT 0,
  passed BOOLEAN NOT NULL DEFAULT false, plays INT NOT NULL DEFAULT 0, done_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, unit)
)
--;;
CREATE TABLE IF NOT EXISTS tajwid_memo (
  user_id UUID NOT NULL, n SMALLINT NOT NULL, added_at TIMESTAMPTZ NOT NULL DEFAULT now(), reviewed_at TIMESTAMPTZ, reviews INT NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, n)
)
--;;
ALTER TABLE tajwid_units ENABLE ROW LEVEL SECURITY
--;;
ALTER TABLE tajwid_verses ENABLE ROW LEVEL SECURITY
--;;
ALTER TABLE tajwid_rules ENABLE ROW LEVEL SECURITY
--;;
ALTER TABLE tajwid_examples ENABLE ROW LEVEL SECURITY
--;;
ALTER TABLE tajwid_audio ENABLE ROW LEVEL SECURITY
--;;
ALTER TABLE tajwid_progress ENABLE ROW LEVEL SECURITY
--;;
ALTER TABLE tajwid_memo ENABLE ROW LEVEL SECURITY
--;;
CREATE OR REPLACE FUNCTION tajwid_me() RETURNS JSONB LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT jsonb_build_object(
    'units', COALESCE((SELECT jsonb_agg(jsonb_build_object('unit', unit, 'best', best, 'total', total, 'passed', passed, 'plays', plays, 'at', done_at) ORDER BY unit) FROM tajwid_progress WHERE user_id = auth.uid()), '[]'),
    'memo', COALESCE((SELECT jsonb_agg(n ORDER BY n) FROM tajwid_memo WHERE user_id = auth.uid()), '[]'))
$$
--;;
-- Tout le contenu publié en un appel (≈ 40 ko), + la progression du joueur
CREATE OR REPLACE FUNCTION tajwid_all() RETURNS JSONB LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT jsonb_build_object(
    'units', (SELECT jsonb_agg(to_jsonb(u) ORDER BY u.n) FROM tajwid_units u),
    'verses', (SELECT jsonb_agg(jsonb_build_object('n', v.n, 'unit', v.unit, 'a', v.ar_a, 'b', v.ar_b, 'p', v.translit, 'f', v.fr) ORDER BY v.n) FROM tajwid_verses v WHERE v.status = 'published'),
    'rules', (SELECT jsonb_agg(jsonb_build_object('id', r.id, 'unit', r.unit, 'ord', r.ord, 'name', r.name, 'ar', r.name_ar, 'label', r.label, 'letters', r.letters, 'body', r.body, 'verses', r.verses,
        'ex', (SELECT jsonb_agg(jsonb_build_object('s', e.surah, 'a', e.ayah, 'g', e.g, 'w', e.words, 't', e.txt) ORDER BY e.ord) FROM tajwid_examples e WHERE e.rule = r.id)) ORDER BY r.unit, r.ord)
      FROM tajwid_rules r WHERE r.status = 'published'),
    'audio', (SELECT jsonb_object_agg(reciter, x) FROM (SELECT reciter, jsonb_object_agg(n, jsonb_build_array(part, t0, t1)) x FROM tajwid_audio GROUP BY reciter) a),
    'qcm', COALESCE((SELECT jsonb_agg(jsonb_build_object('id', q.id, 'unit', q.ayah, 'q', q.question, 'c', q.choices, 'ans', q.answer, 'exp', q.explanation))
      FROM game_questions q WHERE q.category = 'tajwid' AND q.status = 'published'), '[]'),
    'me', CASE WHEN auth.uid() IS NULL THEN NULL ELSE tajwid_me() END)
$$
--;;
CREATE OR REPLACE FUNCTION tajwid_done(p_unit INT, p_ok INT, p_total INT, p_answers JSONB DEFAULT '[]') RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE me UUID := auth.uid(); a JSONB; pass BOOLEAN;
BEGIN
  IF me IS NULL THEN RAISE EXCEPTION 'non connecté'; END IF;
  IF p_unit NOT BETWEEN 0 AND 8 OR p_total < 1 OR p_total > 40 OR p_ok < 0 OR p_ok > p_total THEN RAISE EXCEPTION 'Leçon invalide.'; END IF;
  pass := p_ok * 100 >= p_total * 80;
  INSERT INTO tajwid_progress (user_id, unit, best, total, passed, plays) VALUES (me, p_unit, p_ok, p_total, pass, 1)
  ON CONFLICT (user_id, unit) DO UPDATE SET
    best = CASE WHEN p_ok * tajwid_progress.total > tajwid_progress.best * p_total THEN p_ok ELSE tajwid_progress.best END,
    total = CASE WHEN p_ok * tajwid_progress.total > tajwid_progress.best * p_total THEN p_total ELSE tajwid_progress.total END,
    passed = tajwid_progress.passed OR pass, plays = tajwid_progress.plays + 1, done_at = now();
  INSERT INTO activity_days(user_id, day) VALUES (me, (now() AT TIME ZONE 'UTC')::date)
  ON CONFLICT (user_id, day) DO UPDATE SET actions = activity_days.actions + 1;
  FOR a IN SELECT value FROM jsonb_array_elements(COALESCE(p_answers, '[]')) LOOP
    UPDATE game_questions SET plays = plays + 1, correct = correct + CASE WHEN (a->>'ok')::BOOLEAN THEN 1 ELSE 0 END
    WHERE id = a->>'id' AND category = 'tajwid';
  END LOOP;
  RETURN tajwid_me() || jsonb_build_object('passed', pass);
END $$
--;;
CREATE OR REPLACE FUNCTION tajwid_memo_set(p_n INT, p_on BOOLEAN) RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'non connecté'; END IF;
  IF p_on THEN INSERT INTO tajwid_memo(user_id, n) VALUES (auth.uid(), p_n) ON CONFLICT DO NOTHING;
  ELSE DELETE FROM tajwid_memo WHERE user_id = auth.uid() AND n = p_n; END IF;
  RETURN tajwid_me();
END $$
--;;
REVOKE ALL ON FUNCTION tajwid_done(INT, INT, INT, JSONB), tajwid_memo_set(INT, BOOLEAN), tajwid_me() FROM PUBLIC
--;;
GRANT EXECUTE ON FUNCTION tajwid_all() TO authenticated, anonymous
--;;
GRANT EXECUTE ON FUNCTION tajwid_me(), tajwid_done(INT, INT, INT, JSONB), tajwid_memo_set(INT, BOOLEAN) TO authenticated
