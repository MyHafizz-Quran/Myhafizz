-- Photo du profil dans les cartes joueur + changement de nom d'utilisateur (une fois tous les 30 jours).
CREATE OR REPLACE FUNCTION player_card(p_uid UUID) RETURNS JSONB LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT jsonb_build_object('id', u.id, 'username', p.username, 'name', COALESCE(p.full_name, u.name),
    'image', COALESCE(NULLIF(trim(p.avatar_url), ''), NULLIF(trim(u.image), '')),
    'points', player_points(u.id), 'online', EXISTS (SELECT 1 FROM player_presence x WHERE x.user_id = u.id AND x.seen_at > now() - interval '90 seconds'))
  FROM neon_auth."user" u LEFT JOIN profiles p ON p.id = u.id WHERE u.id = p_uid
$$
--;;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS username_changed_at TIMESTAMPTZ
--;;
CREATE OR REPLACE FUNCTION username_info() RETURNS JSONB LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT jsonb_build_object('username', p.username, 'changed_at', p.username_changed_at,
    'next_at', CASE WHEN p.username_changed_at IS NULL THEN NULL ELSE p.username_changed_at + interval '30 days' END,
    'can_change', p.username_changed_at IS NULL OR p.username_changed_at + interval '30 days' <= now())
  FROM profiles p WHERE p.id = auth.uid()
$$
--;;
CREATE OR REPLACE FUNCTION set_username(p_username TEXT) RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE me UUID := auth.uid(); u TEXT := lower(trim(both from replace(p_username, '@', ''))); cur profiles%ROWTYPE;
BEGIN
  IF me IS NULL THEN RAISE EXCEPTION 'Connecte-toi pour changer ton nom d''utilisateur.'; END IF;
  SELECT * INTO cur FROM profiles WHERE id = me FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Profil introuvable.'; END IF;
  IF cur.username = u THEN RETURN username_info(); END IF;
  IF u !~ '^[a-z0-9_.]{3,20}$' THEN RAISE EXCEPTION '3 à 20 caractères : lettres minuscules, chiffres, point et tiret bas.'; END IF;
  IF cur.username_changed_at IS NOT NULL AND cur.username_changed_at + interval '30 days' > now() THEN
    RAISE EXCEPTION 'Tu pourras changer à nouveau le %.', to_char(cur.username_changed_at + interval '30 days', 'DD/MM/YYYY');
  END IF;
  IF EXISTS (SELECT 1 FROM profiles WHERE username = u AND id <> me) THEN RAISE EXCEPTION 'Ce nom d''utilisateur est déjà pris.'; END IF;
  UPDATE profiles SET username = u, username_changed_at = now(), updated_at = now() WHERE id = me;
  RETURN username_info();
END $$
--;;
GRANT EXECUTE ON FUNCTION username_info() TO authenticated
--;;
GRANT EXECUTE ON FUNCTION set_username(TEXT) TO authenticated
