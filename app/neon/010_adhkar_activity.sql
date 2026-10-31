-- Les adhkar terminés (matin ou soir) comptent comme une journée active pour la série.
CREATE OR REPLACE FUNCTION log_adhkar_day() RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  INSERT INTO activity_days(user_id, day) VALUES (auth.uid(), (now() AT TIME ZONE 'UTC')::date)
  ON CONFLICT (user_id, day) DO UPDATE SET actions = activity_days.actions + 1;
END $$
--;;
REVOKE ALL ON FUNCTION log_adhkar_day() FROM PUBLIC
--;;
GRANT EXECUTE ON FUNCTION log_adhkar_day() TO authenticated
