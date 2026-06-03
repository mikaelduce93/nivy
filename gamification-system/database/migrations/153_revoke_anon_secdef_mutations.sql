-- 153_revoke_anon_secdef_mutations.sql  (V8 #261, B1)
--
-- SÉCURITÉ: 67 fonctions de MUTATION (add_*/claim_*/purchase_*/submit_*/create_*/finalize_*/
-- spend_*/update_*/...) sont SECURITY DEFINER et exécutables par `anon` via /rest/v1/rpc/...,
-- contournant la RLS. Toutes sont des actions d'utilisateur authentifié (audit de la liste :
-- aucune n'est un flux pré-auth de signup ; pending_teen_registrations n'a pas de RPC ici).
--
-- Fix (pattern V7 get_user_crew): REVOKE EXECUTE FROM PUBLIC, anon ; GRANT TO authenticated.
-- Boucle dynamique sur le même prédicat -> idempotent et re-jouable.
-- Vérifié: anon_executable_secdef_mutations 67 -> 0 ; authenticated conserve l'accès.

DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT p.oid::regprocedure AS sig
    FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
    WHERE n.nspname='public' AND p.prosecdef=true
      AND has_function_privilege('anon', p.oid, 'EXECUTE')
      AND p.proname ~ '^(submit|complete|open|resolve|end|create|update|delete|claim|purchase|finalize|debit|credit|add|spend|join|leave|start|redeem|use|cancel|approve|reject|book|send|generate|grant|award|unlock|set|increment|deduct|process|trigger)_'
  LOOP
    EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM PUBLIC, anon;', r.sig);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated;', r.sig);
  END LOOP;
END $$;
