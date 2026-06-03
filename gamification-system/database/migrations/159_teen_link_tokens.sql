-- 159_teen_link_tokens.sql  (V11 #296, Pilier B — socle QR lien parent-ado)
--
-- Token single-use pour la validation parentale par QR dans les DEUX sens
-- (teen→parent : l'ado affiche, le parent scanne ; parent→teen : le parent
-- émet, l'ado consomme). Calqué sur partner_kyc_tokens : le raw vit UNIQUEMENT
-- dans le QR, seul sha256(raw) est persisté. Single-use via `used_at`.
-- RLS : service-role only (le token EST le secret).

CREATE TABLE IF NOT EXISTS public.teen_link_tokens (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  direction   TEXT NOT NULL CHECK (direction IN ('teen_to_parent','parent_to_teen')),
  -- teen_id : l'ado émetteur (teen→parent) ou null jusqu'à consommation (parent→teen).
  teen_id     UUID REFERENCES public.teens(id) ON DELETE CASCADE,
  -- parent_id : le parent émetteur (parent→teen) ou null jusqu'au scan (teen→parent).
  parent_id   UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  token_hash  TEXT NOT NULL,
  issued_by   UUID,
  expires_at  TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '24 hours'),
  used_at     TIMESTAMPTZ,
  used_by     UUID,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (token_hash)
);

CREATE INDEX IF NOT EXISTS idx_teen_link_tokens_teen ON public.teen_link_tokens (teen_id);
CREATE INDEX IF NOT EXISTS idx_teen_link_tokens_parent ON public.teen_link_tokens (parent_id);
CREATE INDEX IF NOT EXISTS idx_teen_link_tokens_expires ON public.teen_link_tokens (expires_at) WHERE used_at IS NULL;

ALTER TABLE public.teen_link_tokens ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS teen_link_tokens_no_client ON public.teen_link_tokens;
CREATE POLICY teen_link_tokens_no_client ON public.teen_link_tokens FOR ALL TO public USING (false);

COMMENT ON TABLE public.teen_link_tokens IS
  'V11 #296 — single-use tokens pour la liaison parent-ado par QR (deux sens). Stocke sha256(raw_token) ; le raw vit dans le QR uniquement. RLS service-role only.';
