-- Version anglaise : langue de l'appareil, pour envoyer les notifications dans la bonne langue.
alter table public.prayer_reminders add column if not exists lang text not null default 'fr' check (lang in ('fr', 'en'));
