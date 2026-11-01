-- Jeux du Coran adaptés au joueur : son niveau d'arabe (onboarding) et les versets qu'il a mémorisés.
CREATE OR REPLACE FUNCTION quran_scope(p_username TEXT DEFAULT NULL, p_user UUID DEFAULT NULL, p_duel UUID DEFAULT NULL) RETURNS JSONB LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE me UUID := auth.uid(); u UUID; d live_duels;
BEGIN
  IF me IS NULL THEN RAISE EXCEPTION 'non connecté'; END IF;
  IF p_duel IS NOT NULL THEN
    SELECT * INTO d FROM live_duels WHERE id = p_duel AND me IN (challenger, opponent);
    u := CASE WHEN d.challenger = me THEN d.opponent ELSE d.challenger END;
  ELSIF p_user IS NOT NULL THEN u := p_user;
  ELSIF p_username IS NOT NULL THEN SELECT id INTO u FROM profiles WHERE username = lower(regexp_replace(p_username, '^@', ''));
  ELSE u := me; END IF;
  IF u IS NULL THEN RETURN jsonb_build_object('level', NULL, 'mem', '[]'::jsonb); END IF;
  -- seulement des numéros de sourates et de versets, rien d'autre
  RETURN jsonb_build_object(
    'level', (SELECT arabic_level FROM profiles WHERE id = u),
    'mem', COALESCE((SELECT jsonb_agg(jsonb_build_object('s', surah_number, 'v', to_jsonb(memorized_verses)))
      FROM memorization_progress WHERE user_id = u AND COALESCE(array_length(memorized_verses, 1), 0) > 0), '[]'::jsonb));
END $$
--;;
GRANT EXECUTE ON FUNCTION quran_scope(TEXT, UUID, UUID) TO authenticated
--;;
-- Tournoi : chaque joueur prépare les questions de SON match (selon ce que les deux joueurs ont mémorisé).
DO $$ DECLARE s TEXT := pg_get_functiondef('tn_tick(uuid, jsonb)'::regprocedure);
BEGIN
  IF position('auth.uid() IN (m.p1, m.p2)' IN s) = 0 THEN
    s := replace(s, 'AND p_candidates IS NOT NULL THEN', 'AND p_candidates IS NOT NULL AND auth.uid() IN (m.p1, m.p2) THEN');
    EXECUTE s;
  END IF;
END $$
