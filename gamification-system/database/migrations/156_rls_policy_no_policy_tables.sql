-- 156_rls_policy_no_policy_tables.sql  (V8 #260, A3)
--
-- 4 tables avaient RLS active mais AUCUNE policy (lecture impossible hors service_role).
-- Décision par table (vérif des colonnes live) :
--   * discount_usage            -> self-read (le teen lit ses propres usages : profile_id).
--   * pending_teen_registrations-> service_role-only STRICT : contient password_hash + PII
--                                  parent/teen + validation_token. AUCUNE policy ajoutée.
--   * marketplace_payouts       -> service_role-only : versements ; exposés au vendeur via une
--                                  surface dédiée/SECDEF, pas en lecture directe de table.
--   * webhook_events            -> service_role-only : intégration interne.
-- Idempotent.

CREATE POLICY "discount_usage_self_read" ON public.discount_usage
  FOR SELECT TO authenticated
  USING (profile_id = (SELECT auth.uid()));
