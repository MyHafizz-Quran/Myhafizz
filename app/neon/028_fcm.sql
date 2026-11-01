-- Firebase Cloud Messaging : jeton FCM rattaché à l'abonnement push (même clé VAPID).
alter table public.prayer_reminders add column if not exists fcm_token text;
