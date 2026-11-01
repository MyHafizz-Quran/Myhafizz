-- Photos de profil partout : photo envoyée dans l'app, sinon photo Google.
CREATE OR REPLACE FUNCTION avatar_map(p_ids UUID[] DEFAULT '{}', p_usernames TEXT[] DEFAULT '{}') RETURNS JSONB LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE(jsonb_agg(jsonb_build_object('id', p.id, 'u', p.username, 'img', COALESCE(NULLIF(trim(p.avatar_url), ''), NULLIF(trim(u.image), '')))), '[]'::jsonb)
  FROM (SELECT * FROM profiles WHERE id = ANY(p_ids[1:200]) OR username = ANY(p_usernames[1:200])) p
  LEFT JOIN neon_auth."user" u ON u.id = p.id
$$
--;;
GRANT EXECUTE ON FUNCTION avatar_map(UUID[], TEXT[]) TO authenticated
