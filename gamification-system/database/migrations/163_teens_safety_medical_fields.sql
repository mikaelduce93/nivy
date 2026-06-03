-- 163_teens_safety_medical_fields.sql  (V11 #310, Pilier E)
--
-- AddTeenForm collectait allergies / consentement photo / règles de sortie /
-- contact d'urgence mais /api/parent/teens/create ne les PERSISTAIT pas (champs
-- fantômes, audit GAP-15). On ajoute les colonnes correspondantes sur teens
-- pour rendre ces champs réellement enregistrés et relisibles.

ALTER TABLE public.teens
  ADD COLUMN IF NOT EXISTS allergies TEXT,
  ADD COLUMN IF NOT EXISTS photo_consent BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS exit_permission_rules TEXT,
  ADD COLUMN IF NOT EXISTS emergency_contact_name TEXT,
  ADD COLUMN IF NOT EXISTS emergency_contact_phone TEXT,
  ADD COLUMN IF NOT EXISTS emergency_contact_relation TEXT;
