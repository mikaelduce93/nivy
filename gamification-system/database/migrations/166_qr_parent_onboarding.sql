-- 166_qr_parent_onboarding.sql  (post-V11 — QR/WhatsApp parent onboarding-and-link)
--
-- Le canal principal de validation parentale devient un QR/lien partageable
-- (WhatsApp), pas l'email. (a) parent_email devient OPTIONNEL à l'inscription
-- ado (l'ado partage le lien directement ; l'email n'est plus le gate).
-- L'index partiel unique pending_teen_reg_parent_pending_uq reste valide :
-- en Postgres les NULL sont distincts, donc plusieurs inscriptions en attente
-- sans email parent coexistent, tandis qu'un email non-null garde la garantie
-- « au plus une demande en attente par email parent ».
-- (b) location_consent : consentement parental explicite à la géolocalisation
-- de l'ado (loi 09-08/CNDP), porté par la liaison parent-ado (révocable, par ado).

ALTER TABLE public.pending_teen_registrations
  ALTER COLUMN parent_email DROP NOT NULL;

ALTER TABLE public.parent_teen_links
  ADD COLUMN IF NOT EXISTS location_consent BOOLEAN NOT NULL DEFAULT false;
