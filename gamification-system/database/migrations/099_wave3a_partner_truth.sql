-- =============================================================================
-- Wave 3A — Partner Ecosystem Truth (2026-05-09)
-- Source: docs/canon/partner-ecosystem.locked.md §2 §3 §4 §6
--         docs/compliance/09-partner-ecosystem-compliance.md
--         docs/compliance/15-phantom-rpc-api-table-violations.md
--
-- Goals:
--   1. partner_pending_credentials — transient password store for wizard → activation.
--   2. qr_nonces — replay-resistance for the v2 scanner QR.
--   3. partner_offers.status — canonical lifecycle column with CHECK enforcement.
--   4. partners.status CHECK — only canonical values; backfill verified/approved → active.
--   5. apply_partner_offer SECURITY DEFINER RPC — atomic apply with row lock + nonce + usage.
--   6. partner_qr_secret table — single-row server-side HMAC seed for QR signing.
--
-- Idempotent. Safe to re-run.
-- =============================================================================

BEGIN;

-- -----------------------------------------------------------------------------
-- 1. partner_pending_credentials — wizard captures password, stage 6 consumes.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.partner_pending_credentials (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id    UUID NOT NULL REFERENCES public.partners(id) ON DELETE CASCADE,
  password_hash TEXT NOT NULL,
  email         TEXT NOT NULL,
  expires_at    TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '30 days'),
  consumed_at   TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (partner_id)
);
CREATE INDEX IF NOT EXISTS idx_partner_pending_creds_email ON public.partner_pending_credentials (email);
CREATE INDEX IF NOT EXISTS idx_partner_pending_creds_expires ON public.partner_pending_credentials (expires_at) WHERE consumed_at IS NULL;

ALTER TABLE public.partner_pending_credentials ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS pending_creds_no_anon ON public.partner_pending_credentials;
CREATE POLICY pending_creds_no_anon ON public.partner_pending_credentials
  FOR ALL TO public USING (false);

-- -----------------------------------------------------------------------------
-- 2. qr_nonces — single-use scanner QR replay protection.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.qr_nonces (
  nonce         TEXT PRIMARY KEY,
  user_id       UUID NOT NULL REFERENCES auth.users(id),
  partner_id    UUID REFERENCES public.partners(id),
  used_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at    TIMESTAMPTZ NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_qr_nonces_expires ON public.qr_nonces (expires_at);

ALTER TABLE public.qr_nonces ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS qr_nonces_no_client ON public.qr_nonces;
CREATE POLICY qr_nonces_no_client ON public.qr_nonces FOR ALL TO public USING (false);

-- -----------------------------------------------------------------------------
-- 3. partner_offers.status — canonical lifecycle column.
-- -----------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
     WHERE table_schema='public' AND table_name='partner_offers' AND column_name='status'
  ) THEN
    ALTER TABLE public.partner_offers
      ADD COLUMN status TEXT NOT NULL DEFAULT 'draft';
    -- Backfill: existing is_active=true rows are pre-approved; everyone else is draft.
    UPDATE public.partner_offers
       SET status = CASE WHEN is_active THEN 'approved' ELSE 'draft' END;
  END IF;
END
$$;

-- Drop any prior status check (idempotency) then re-add the canonical one.
DO $$
DECLARE
  v_check_name text;
BEGIN
  FOR v_check_name IN
    SELECT con.conname
    FROM pg_constraint con
    JOIN pg_class rel ON rel.oid = con.conrelid
    WHERE rel.relname = 'partner_offers'
      AND con.contype = 'c'
      AND pg_get_constraintdef(con.oid) ILIKE '%status%'
  LOOP
    EXECUTE format('ALTER TABLE public.partner_offers DROP CONSTRAINT %I', v_check_name);
  END LOOP;

  ALTER TABLE public.partner_offers
    ADD CONSTRAINT partner_offers_status_check
    CHECK (status IN ('draft','pending_approval','approved','rejected','paused','expired','archived'));

  -- Locked invariant from canon §3.2: cannot be live without approval.
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
     WHERE conname = 'partner_offers_active_requires_approved'
  ) THEN
    ALTER TABLE public.partner_offers
      ADD CONSTRAINT partner_offers_active_requires_approved
      CHECK (NOT is_active OR status = 'approved');
  END IF;
END
$$;

-- Add approved_by / approved_at audit columns if absent.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
     WHERE table_schema='public' AND table_name='partner_offers' AND column_name='approved_by'
  ) THEN
    ALTER TABLE public.partner_offers ADD COLUMN approved_by UUID;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
     WHERE table_schema='public' AND table_name='partner_offers' AND column_name='approved_at'
  ) THEN
    ALTER TABLE public.partner_offers ADD COLUMN approved_at TIMESTAMPTZ;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
     WHERE table_schema='public' AND table_name='partner_offers' AND column_name='rejection_reason'
  ) THEN
    ALTER TABLE public.partner_offers ADD COLUMN rejection_reason TEXT;
  END IF;
END
$$;

-- -----------------------------------------------------------------------------
-- 4. partners.status CHECK — kill the verified/approved synonyms.
--    Backfill any rows on those values to 'active' before re-adding the CHECK.
-- -----------------------------------------------------------------------------
UPDATE public.partners
   SET status = 'active'
 WHERE status IN ('verified', 'approved');

DO $$
DECLARE
  v_check_name text;
BEGIN
  FOR v_check_name IN
    SELECT con.conname
    FROM pg_constraint con
    JOIN pg_class rel ON rel.oid = con.conrelid
    WHERE rel.relname = 'partners'
      AND con.contype = 'c'
      AND pg_get_constraintdef(con.oid) ILIKE '%status%'
  LOOP
    EXECUTE format('ALTER TABLE public.partners DROP CONSTRAINT %I', v_check_name);
  END LOOP;

  ALTER TABLE public.partners
    ADD CONSTRAINT partners_status_check
    CHECK (status IN ('pending','in_review','active','rejected','suspended','offboarded'));
END
$$;

-- -----------------------------------------------------------------------------
-- 5. partner_qr_secret — single-row HMAC seed used to sign + verify v2 QR.
--    Initial value is a per-database random seed (NEVER printed). Rotation is
--    a manual operation via the dashboard at the end-of-remediation event.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.partner_qr_secret (
  id          INT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  secret_b64  TEXT NOT NULL,
  rotated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
INSERT INTO public.partner_qr_secret (id, secret_b64)
  VALUES (1, encode(gen_random_bytes(32), 'base64'))
ON CONFLICT (id) DO NOTHING;

ALTER TABLE public.partner_qr_secret ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS qr_secret_no_client ON public.partner_qr_secret;
CREATE POLICY qr_secret_no_client ON public.partner_qr_secret FOR ALL TO public USING (false);

-- -----------------------------------------------------------------------------
-- 6. apply_partner_offer SECURITY DEFINER RPC — atomic apply.
--    Caller is the partner's authenticated user; verifies they own the offer
--    via partner_staff. Locks the offer row, atomically increments
--    current_total_uses against max_total_uses, writes discount_usage,
--    inserts the qr_nonce, returns the result envelope.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.apply_partner_offer(
  p_offer_id        UUID,
  p_member_user_id  UUID,
  p_purchase_amount NUMERIC,
  p_idempotency_key UUID,
  p_nonce           TEXT,
  p_qr_exp_unix     BIGINT
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $func$
DECLARE
  v_caller         UUID := auth.uid();
  v_partner_id     UUID;
  v_offer          public.partner_offers%ROWTYPE;
  v_now            TIMESTAMPTZ := now();
  v_now_unix       BIGINT := EXTRACT(epoch FROM now())::BIGINT;
  v_discount_amt   NUMERIC := 0;
  v_final_amt      NUMERIC := 0;
  v_usage_id       UUID;
  v_per_user_count INT := 0;
BEGIN
  IF v_caller IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'unauthenticated');
  END IF;

  IF p_qr_exp_unix < v_now_unix THEN
    RETURN jsonb_build_object('success', false, 'error', 'qr_expired');
  END IF;

  -- Replay check: nonce must not already exist.
  IF EXISTS (SELECT 1 FROM public.qr_nonces WHERE nonce = p_nonce) THEN
    RETURN jsonb_build_object('success', false, 'error', 'qr_replay');
  END IF;

  -- Resolve caller's partner via partner_staff (active staff row).
  SELECT ps.partner_id INTO v_partner_id
    FROM public.partner_staff ps
   WHERE ps.user_id = v_caller AND ps.is_active = TRUE
   LIMIT 1;

  IF v_partner_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'caller_not_partner_staff');
  END IF;

  -- Lock the offer row, scoped to the caller's partner.
  SELECT * INTO v_offer
    FROM public.partner_offers
   WHERE id = p_offer_id AND partner_id = v_partner_id
   FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'offer_not_found');
  END IF;
  IF NOT v_offer.is_active OR v_offer.status <> 'approved' THEN
    RETURN jsonb_build_object('success', false, 'error', 'offer_not_active', 'status', v_offer.status);
  END IF;
  IF v_offer.valid_from IS NOT NULL AND v_offer.valid_from > v_now THEN
    RETURN jsonb_build_object('success', false, 'error', 'offer_not_yet_valid');
  END IF;
  IF v_offer.valid_until IS NOT NULL AND v_offer.valid_until < v_now THEN
    RETURN jsonb_build_object('success', false, 'error', 'offer_expired');
  END IF;
  IF v_offer.max_total_uses IS NOT NULL AND COALESCE(v_offer.current_total_uses, 0) >= v_offer.max_total_uses THEN
    RETURN jsonb_build_object('success', false, 'error', 'offer_total_uses_exceeded');
  END IF;
  IF v_offer.min_purchase_amount IS NOT NULL AND p_purchase_amount < v_offer.min_purchase_amount THEN
    RETURN jsonb_build_object('success', false, 'error', 'purchase_below_minimum',
      'min_purchase_amount', v_offer.min_purchase_amount);
  END IF;

  -- Per-user cap (hard fail if check fails).
  IF v_offer.max_uses_per_user IS NOT NULL THEN
    SELECT COUNT(*) INTO v_per_user_count
      FROM public.discount_usage
     WHERE discount_id = p_offer_id AND profile_id = p_member_user_id;
    IF v_per_user_count >= v_offer.max_uses_per_user THEN
      RETURN jsonb_build_object('success', false, 'error', 'per_user_cap_reached');
    END IF;
  END IF;

  -- Compute discount.
  IF v_offer.discount_type = 'percentage' OR v_offer.discount_type IS NULL THEN
    v_discount_amt := (p_purchase_amount * COALESCE(v_offer.discount_value, v_offer.discount_pct, 0)) / 100;
  ELSE
    v_discount_amt := COALESCE(v_offer.discount_value, 0);
  END IF;
  IF v_offer.max_discount_amount IS NOT NULL AND v_discount_amt > v_offer.max_discount_amount THEN
    v_discount_amt := v_offer.max_discount_amount;
  END IF;
  v_final_amt := GREATEST(0, p_purchase_amount - v_discount_amt);

  -- Atomic: insert nonce, increment counter, write usage, all-or-nothing.
  INSERT INTO public.qr_nonces (nonce, user_id, partner_id, used_at, expires_at)
    VALUES (p_nonce, p_member_user_id, v_partner_id, v_now, to_timestamp(p_qr_exp_unix));

  UPDATE public.partner_offers
     SET current_total_uses = COALESCE(current_total_uses, 0) + 1,
         updated_at = v_now
   WHERE id = p_offer_id;

  INSERT INTO public.discount_usage (
    discount_id, profile_id, partner_id,
    purchase_amount, discount_amount, final_amount,
    notes, used_at
  ) VALUES (
    p_offer_id, p_member_user_id, v_partner_id,
    p_purchase_amount, v_discount_amt, v_final_amt,
    jsonb_build_object('idempotency_key', p_idempotency_key, 'nonce', p_nonce)::text,
    v_now
  )
  RETURNING id INTO v_usage_id;

  RETURN jsonb_build_object(
    'success', true,
    'usage_id', v_usage_id,
    'discount_amount', v_discount_amt,
    'final_amount', v_final_amt,
    'partner_id', v_partner_id,
    'offer_id', p_offer_id
  );
END
$func$;

REVOKE EXECUTE ON FUNCTION public.apply_partner_offer(uuid, uuid, numeric, uuid, text, bigint) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.apply_partner_offer(uuid, uuid, numeric, uuid, text, bigint) TO authenticated, service_role;

COMMENT ON FUNCTION public.apply_partner_offer(uuid, uuid, numeric, uuid, text, bigint) IS
  'Wave 3A canon §4.2: atomic v2-QR apply. Row-locks offer, writes nonce, bumps counter, records usage.';

COMMIT;
