-- 168_per_teen_location_revoke.sql  (post-V11 — per-teen geolocation revocation)
--
-- Modèle de consentement géoloc résolu (loi 09-08/CNDP) :
--   • OPT-IN baseline = e_signatures.location_consent (mig 167, default false) :
--     le parent coche explicitement à la signature.
--   • OPT-OUT par-ado = parent_teen_links.location_revoked (ce flag) : le parent
--     peut révoquer la géoloc pour un ado donné, à tout moment.
-- Lecture autorisée ⇔ signature avec location_consent=true ET lien non révoqué.
-- Ce modèle évite toute propagation/backfill : par défaut, un ado lié est
-- géolocalisable dès que le parent a signé le consentement, sauf révocation.
--
-- On remplace le placeholder parent_teen_links.location_consent (mig 166, jamais
-- lu par le code) par location_revoked (sémantique opt-out, default false).

ALTER TABLE public.parent_teen_links
  DROP COLUMN IF EXISTS location_consent;

ALTER TABLE public.parent_teen_links
  ADD COLUMN IF NOT EXISTS location_revoked BOOLEAN NOT NULL DEFAULT false;
