-- 026 : les duels en direct abandonnés ne bloquent plus les nouvelles invitations
CREATE OR REPLACE FUNCTION public.ld_reap(p_user uuid DEFAULT NULL)
 RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE n INT;
BEGIN
  -- Duel en direct abandonné : plus personne n'a l'écran ouvert (la partie n'avance que quand un joueur la consulte).
  -- Après 75 s sans aucun progrès, il est annulé sans points pour libérer les deux joueurs.
  UPDATE live_duels SET status = 'cancelled', finished_at = now()
   WHERE status = 'playing' AND tournament_id IS NULL
     AND COALESCE(q_closed_at, q_started_at, started_at) < now() - interval '75 seconds'
     AND (p_user IS NULL OR p_user IN (challenger, opponent));
  GET DIAGNOSTICS n = ROW_COUNT;
  RETURN n;
END $function$;

CREATE OR REPLACE FUNCTION public.ld_invite(p_username text, p_candidates jsonb, p_rematch_of uuid DEFAULT NULL::uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE me UUID := auth.uid(); opp UUID; did UUID; want INT := ld_cfg('questions', 7); picked JSONB := '[]'; ks TEXT[] := '{}'; c JSONB; prev live_duels;
BEGIN
  IF me IS NULL THEN RAISE EXCEPTION 'non connecté'; END IF;
  IF NOT COALESCE((SELECT (value->>'enabled')::BOOLEAN FROM game_settings WHERE key = 'duel'), TRUE) THEN RAISE EXCEPTION 'Les duels sont en pause.'; END IF;
  IF p_rematch_of IS NOT NULL THEN
    SELECT * INTO prev FROM live_duels WHERE id = p_rematch_of AND status = 'done' AND (challenger = me OR opponent = me);
    IF prev.id IS NULL THEN RAISE EXCEPTION 'Duel introuvable.'; END IF;
    opp := CASE WHEN prev.challenger = me THEN prev.opponent ELSE prev.challenger END;
    IF EXISTS (SELECT 1 FROM live_duels WHERE rematch_of = p_rematch_of AND status IN ('invited','playing')) THEN RAISE EXCEPTION 'Une revanche est déjà demandée.'; END IF;
  ELSE
    SELECT id INTO opp FROM profiles WHERE username = lower(regexp_replace(COALESCE(p_username, ''), '^@', ''));
    IF opp IS NULL THEN RAISE EXCEPTION 'Aucun joueur avec ce nom d''utilisateur.'; END IF;
  END IF;
  IF opp = me THEN RAISE EXCEPTION 'Tu ne peux pas te défier toi-même.'; END IF;
  IF (SELECT count(*) FROM live_duels WHERE challenger = me AND created_at > now() - interval '1 day') >= ld_cfg('daily_limit', 30) THEN RAISE EXCEPTION 'Limite de duels atteinte pour aujourd''hui.'; END IF;
  -- une seule invitation en attente à la fois
  UPDATE live_duels SET status = 'cancelled' WHERE challenger = me AND status = 'invited';
  PERFORM ld_reap(me); PERFORM ld_reap(opp);
  IF EXISTS (SELECT 1 FROM live_duels WHERE status = 'playing' AND (challenger IN (me, opp) OR opponent IN (me, opp)) AND started_at > now() - interval '20 minutes') THEN
    RAISE EXCEPTION 'Un de vous deux est déjà en train de jouer un duel.';
  END IF;
  FOR c IN SELECT value FROM jsonb_array_elements(COALESCE(p_candidates, '[]')) LOOP
    EXIT WHEN jsonb_array_length(picked) >= want;
    CONTINUE WHEN c->>'key' IS NULL OR (c->>'key') = ANY (ks);
    CONTINUE WHEN EXISTS (SELECT 1 FROM game_seen s WHERE s.qkey = c->>'key' AND s.user_id IN (me, opp) AND s.seen_at > now() - interval '30 days');
    picked := picked || jsonb_build_array(c); ks := ks || (c->>'key');
  END LOOP;
  -- pas assez de questions inédites : on complète avec les moins récentes
  FOR c IN SELECT value FROM jsonb_array_elements(COALESCE(p_candidates, '[]')) LOOP
    EXIT WHEN jsonb_array_length(picked) >= want;
    CONTINUE WHEN c->>'key' IS NULL OR (c->>'key') = ANY (ks);
    picked := picked || jsonb_build_array(c); ks := ks || (c->>'key');
  END LOOP;
  IF jsonb_array_length(picked) < 3 THEN RAISE EXCEPTION 'Impossible de préparer les questions.'; END IF;
  INSERT INTO live_duels (challenger, opponent, items, keys, invite_expires_at, rematch_of)
  VALUES (me, opp, picked, ks, now() + make_interval(secs => ld_cfg('invite_secs', 60)), p_rematch_of) RETURNING id INTO did;
  PERFORM notify(opp, CASE WHEN p_rematch_of IS NULL THEN 'duel_invite' ELSE 'duel_rematch' END, me, did, '{}');
  RETURN did;
END $function$
;

CREATE OR REPLACE FUNCTION public.ld_respond(p_id uuid, p_accept boolean)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE me UUID := auth.uid(); d live_duels;
BEGIN
  PERFORM ld_tick(p_id);
  SELECT * INTO d FROM live_duels WHERE id = p_id FOR UPDATE;
  IF d.id IS NULL OR d.opponent <> me THEN RAISE EXCEPTION 'Défi introuvable.'; END IF;
  UPDATE notifications SET read_at = now() WHERE ref = d.id AND user_id = me;
  IF d.status <> 'invited' THEN RETURN jsonb_build_object('status', d.status); END IF;
  IF p_accept THEN
    PERFORM ld_reap(me); PERFORM ld_reap(d.challenger);
    IF EXISTS (SELECT 1 FROM live_duels WHERE status = 'playing' AND id <> d.id AND (challenger IN (me, d.challenger) OR opponent IN (me, d.challenger)) AND started_at > now() - interval '20 minutes') THEN
      RAISE EXCEPTION 'Ton adversaire est déjà dans un autre duel.';
    END IF;
    UPDATE live_duels SET status = 'playing', started_at = now(), q_index = 0, q_started_at = now() + interval '4 seconds' WHERE id = d.id;
    INSERT INTO game_seen (user_id, qkey) SELECT u, k FROM unnest(ARRAY[d.challenger, d.opponent]) u, unnest(d.keys) k
      ON CONFLICT (user_id, qkey) DO UPDATE SET seen_at = now();
    RETURN jsonb_build_object('status', 'playing');
  END IF;
  UPDATE live_duels SET status = 'declined' WHERE id = d.id;
  PERFORM notify(d.challenger, 'duel_declined', me, d.id, '{}', FALSE);
  RETURN jsonb_build_object('status', 'declined');
END $function$
;

GRANT EXECUTE ON FUNCTION public.ld_reap(uuid) TO authenticated;
SELECT public.ld_reap(NULL);
