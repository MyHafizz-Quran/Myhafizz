-- Audit sécurité (01/11/2026) : aucune fonction SECURITY DEFINER appelable sans être connecté,
-- sauf la vérification de disponibilité du nom d'utilisateur (formulaire d'inscription).
do $$
declare r record;
begin
  for r in select p.oid::regprocedure as f from pg_proc p join pg_namespace n on n.oid = p.pronamespace
           where n.nspname = 'public' and p.prosecdef loop
    execute format('revoke execute on function %s from public, anonymous', r.f);
    execute format('grant execute on function %s to authenticated, reminder_worker', r.f);
  end loop;
  for r in select p.oid::regprocedure as f from pg_proc p join pg_namespace n on n.oid = p.pronamespace
           where n.nspname = 'public' and p.proname in ('username_available') loop
    execute format('grant execute on function %s to anonymous', r.f);
  end loop;
end $$;
-- Fonctions créées plus tard : pas d'exécution publique par défaut
alter default privileges for role neondb_owner in schema public revoke execute on functions from public;
alter default privileges for role neondb_owner in schema public grant execute on functions to authenticated, reminder_worker;
