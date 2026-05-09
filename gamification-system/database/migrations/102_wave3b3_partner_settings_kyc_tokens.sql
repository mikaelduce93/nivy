-- Wave 3B.3 — partner settings + pre-auth KYC token store.
--
-- 1. Add the canon §3.1 partner-level columns missing today (phone, website,
--    description, business_hours). The richer canon set (rc/ice/patente/cnss/
--    rib/contact_person_* etc.) is deferred to Wave 4 — Wave 3B.3 only opens
--    what /partner/settings actually edits.
--
-- 2. partner_kyc_tokens — single-use signed token issued by an admin (or by
--    the activation flow) so a prospect can upload KYC docs BEFORE the
--    auth.users provisioning step. Token is stored as sha256 hash; the raw
--    token is returned ONCE to the issuer. Never logged.

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_schema='public' AND table_name='partners' AND column_name='phone') THEN
    ALTER TABLE public.partners ADD COLUMN phone TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_schema='public' AND table_name='partners' AND column_name='website') THEN
    ALTER TABLE public.partners ADD COLUMN website TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_schema='public' AND table_name='partners' AND column_name='description') THEN
    ALTER TABLE public.partners ADD COLUMN description TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_schema='public' AND table_name='partners' AND column_name='business_hours') THEN
    ALTER TABLE public.partners ADD COLUMN business_hours JSONB;
  END IF;
END
$$;

CREATE TABLE IF NOT EXISTS public.partner_kyc_tokens (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id   UUID NOT NULL REFERENCES public.partners(id) ON DELETE CASCADE,
  token_hash   TEXT NOT NULL,
  issued_by    UUID,
  expires_at   TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '7 days'),
  used_at      TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (token_hash)
);
CREATE INDEX IF NOT EXISTS idx_partner_kyc_tokens_partner ON public.partner_kyc_tokens (partner_id);
CREATE INDEX IF NOT EXISTS idx_partner_kyc_tokens_expires ON public.partner_kyc_tokens (expires_at) WHERE used_at IS NULL;

ALTER TABLE public.partner_kyc_tokens ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS kyc_tokens_no_client ON public.partner_kyc_tokens;
CREATE POLICY kyc_tokens_no_client ON public.partner_kyc_tokens FOR ALL TO public USING (false);

COMMENT ON TABLE public.partner_kyc_tokens IS
  'Wave 3B.3 — single-use signed-link tokens for pre-auth partner KYC upload. Token is stored as sha256(raw_token) hex; raw token is returned once to the issuer and never logged.';
