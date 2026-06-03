-- 164_pending_teen_parent_phone_optional.sql  (V11 #311, Pilier E)
--
-- parent_phone était REQUIS à l'inscription ado mais AUCUN SMS n'était jamais
-- envoyé (smsSent=false en dur) → PII collectée sans usage (audit GAP-14).
-- Décision : rendre le téléphone parent OPTIONNEL (pas d'intégration SMS dans
-- ce périmètre ; l'email reste le canal de validation). On lève donc le
-- NOT NULL sur pending_teen_registrations.parent_phone.

ALTER TABLE public.pending_teen_registrations
  ALTER COLUMN parent_phone DROP NOT NULL;
