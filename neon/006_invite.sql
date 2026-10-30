-- Page publique d'invitation : infos minimales d'un groupe à partir de son code (sans compte)
CREATE OR REPLACE FUNCTION public.group_invite_info(p_code TEXT)
RETURNS TABLE(name TEXT, kind TEXT, members BIGINT, owner_name TEXT)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT g.name, g.kind,
    (SELECT count(*) FROM group_members m WHERE m.group_id = g.id),
    (SELECT split_part(coalesce(nullif(trim(m.display_name), ''), 'Un membre'), ' ', 1) FROM group_members m WHERE m.group_id = g.id AND m.user_id = g.owner_id LIMIT 1)
  FROM study_groups g WHERE g.invite_code = upper(trim(p_code))
$$
--;;
REVOKE ALL ON FUNCTION public.group_invite_info(TEXT) FROM PUBLIC
--;;
GRANT EXECUTE ON FUNCTION public.group_invite_info(TEXT) TO anonymous, authenticated
--;;
GRANT USAGE ON SCHEMA public TO anonymous
