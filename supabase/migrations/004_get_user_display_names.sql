-- Function to get display names for leaderboard users
-- This function runs with SECURITY DEFINER to access auth.users
CREATE OR REPLACE FUNCTION public.get_leaderboard_users(user_ids UUID[])
RETURNS TABLE(user_id UUID, display_name TEXT, avatar_url TEXT) AS $$
BEGIN
  -- Restrict to authenticated users only
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  RETURN QUERY
  SELECT 
    au.id AS user_id,
    COALESCE(
      NULLIF(TRIM(p.full_name), ''),
      NULLIF(TRIM(au.raw_user_meta_data->>'full_name'), ''),
      SPLIT_PART(au.email, '@', 1),
      'Utilisateur'
    ) AS display_name,
    COALESCE(
      NULLIF(TRIM(p.avatar_url), ''),
      NULLIF(TRIM(au.raw_user_meta_data->>'avatar_url'), ''),
      NULL
    ) AS avatar_url
  FROM UNNEST(user_ids) AS uid(id)
  LEFT JOIN auth.users au ON au.id = uid.id
  LEFT JOIN public.profiles p ON p.id = uid.id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
