-- 167_esignature_location_consent.sql  (post-V11 — minors geolocation consent)
--
-- Consentement parental EXPLICITE à la géolocalisation de l'ado, capturé au
-- moment de l'autorisation signée (loi 09-08 / CNDP) — donnée plus sensible
-- (mineur) donc opt-in (default false). C'est la source autoritaire qui gate
-- l'affichage de la position/présence de l'ado côté parent (/api/parent/live).
-- (parent_teen_links.location_consent de la mig 166 reste réservé à une
-- révocation par-ado future.)

ALTER TABLE public.e_signatures
  ADD COLUMN IF NOT EXISTS location_consent BOOLEAN NOT NULL DEFAULT false;
