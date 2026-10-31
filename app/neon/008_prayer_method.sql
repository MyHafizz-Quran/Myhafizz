-- Méthode de calcul des heures de prière, choisie dans l'app et réutilisée par les rappels.
alter table public.prayer_reminders
  add column if not exists method text not null default 'MuslimWorldLeague'
  check (method in ('MuslimWorldLeague','Egyptian','Karachi','UmmAlQura','Dubai','Qatar','Kuwait','MoonsightingCommittee','NorthAmerica','Turkey','Singapore','Tehran'));
grant select (method), insert (method), update (method) on public.prayer_reminders to authenticated;
grant select (method) on public.prayer_reminders to reminder_worker;
