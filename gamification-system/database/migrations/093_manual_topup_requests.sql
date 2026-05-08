-- Wave Ops-D — Manual top-up requests table.
--
-- Bridges the "manual MVP" period (parent transfers DH via Cash Plus / Wafacash
-- / M2T outside the app, then files a request here with the provider reference)
-- and the "automatic webhook" period (PSP webhooks at /api/webhooks/{cashplus,
-- wafacash,m2t} land directly into payment_transactions via top_up_teen).
--
-- Lifecycle:
--   1. Parent submits {teen_id, amount_dh, provider, provider_ref, screenshot}.
--   2. Row created status='pending'.
--   3. Admin reviews via /admin/topups, calls top_up_teen via the
--      /api/admin/topups/[id]/confirm route → row flips to 'confirmed' and
--      records the resulting payment_transaction id.
--   4. Or admin rejects with rejection_reason → row flips to 'rejected'.
--
-- When PSP_AUTO_TOPUP_ENABLED=true the webhooks bypass this table entirely;
-- this table only exists for the manual interim mode.

CREATE TABLE IF NOT EXISTS public.manual_topup_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  teen_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  amount_dh NUMERIC(10,2) NOT NULL CHECK (amount_dh > 0),
  provider TEXT NOT NULL CHECK (provider IN ('cashplus','wafacash','m2t','damanecash','baridcash','other')),
  provider_ref TEXT NOT NULL,
  screenshot_path TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','confirmed','rejected')),
  payment_transaction_id UUID REFERENCES public.payment_transactions(id) ON DELETE SET NULL,
  rejection_reason TEXT,
  decided_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  decided_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- Idempotency: a (provider, provider_ref) pair is unique across all requests
  -- so a parent can't double-submit the same Cash Plus reference.
  CONSTRAINT manual_topup_requests_provider_ref_unique UNIQUE (provider, provider_ref)
);

CREATE INDEX IF NOT EXISTS idx_manual_topup_requests_parent
  ON public.manual_topup_requests (parent_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_manual_topup_requests_teen
  ON public.manual_topup_requests (teen_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_manual_topup_requests_status
  ON public.manual_topup_requests (status, created_at DESC);

-- updated_at trigger.
CREATE OR REPLACE FUNCTION public.tg_manual_topup_requests_touch()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_manual_topup_requests_touch ON public.manual_topup_requests;
CREATE TRIGGER trg_manual_topup_requests_touch
  BEFORE UPDATE ON public.manual_topup_requests
  FOR EACH ROW EXECUTE FUNCTION public.tg_manual_topup_requests_touch();

-- ---------------------------------------------------------------------------
-- RLS: parent self-read for their own teens, admin all.
-- ---------------------------------------------------------------------------
ALTER TABLE public.manual_topup_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "manual_topup_parent_read" ON public.manual_topup_requests;
CREATE POLICY "manual_topup_parent_read"
  ON public.manual_topup_requests
  FOR SELECT
  TO authenticated
  USING (
    parent_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.parent_teen_links l
      WHERE l.parent_id = auth.uid() AND l.teen_id = manual_topup_requests.teen_id
    )
  );

DROP POLICY IF EXISTS "manual_topup_parent_insert" ON public.manual_topup_requests;
CREATE POLICY "manual_topup_parent_insert"
  ON public.manual_topup_requests
  FOR INSERT
  TO authenticated
  WITH CHECK (
    parent_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.parent_teen_links l
      WHERE l.parent_id = auth.uid() AND l.teen_id = manual_topup_requests.teen_id
    )
  );

DROP POLICY IF EXISTS "manual_topup_admin_all" ON public.manual_topup_requests;
CREATE POLICY "manual_topup_admin_all"
  ON public.manual_topup_requests
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.admin_roles r
      WHERE r.profile_id = auth.uid()
        AND r.role IN ('admin','super_admin','moderator')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.admin_roles r
      WHERE r.profile_id = auth.uid()
        AND r.role IN ('admin','super_admin','moderator')
    )
  );

-- Service role bypasses RLS but be explicit for grants.
GRANT SELECT, INSERT, UPDATE ON public.manual_topup_requests TO authenticated;
GRANT ALL ON public.manual_topup_requests TO service_role;

-- ---------------------------------------------------------------------------
-- Extend top_up_teen RPC to accept (p_provider, p_provider_ref).
-- Backwards-compatible: keep the 3-arg overload, add a 5-arg variant. Webhooks
-- and the admin-confirm route use the 5-arg version.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.top_up_teen(
  p_parent_id   UUID,
  p_teen_id     UUID,
  p_amount_dh   NUMERIC,
  p_provider    TEXT,
  p_provider_ref TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_caller         UUID := auth.uid();
  v_amount_coins   INTEGER;
  v_payment_id     UUID;
  v_signature_id   UUID;
  v_link_id        UUID;
  v_new_balance    INTEGER;
  v_existing_id    UUID;
BEGIN
  IF v_caller IS NOT NULL AND v_caller <> p_parent_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'unauthorized_caller');
  END IF;

  IF p_amount_dh IS NULL OR p_amount_dh <= 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'invalid_amount');
  END IF;

  IF p_provider IS NULL OR length(p_provider) = 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'invalid_provider');
  END IF;

  -- Idempotency: a (provider, provider_ref) pair must not already have produced
  -- a successful top-up. Webhooks may legitimately replay (provider retries
  -- until a 2xx) — we return success on dup with the original payment id.
  IF p_provider_ref IS NOT NULL AND length(p_provider_ref) > 0 THEN
    SELECT id INTO v_existing_id
    FROM payment_transactions
    WHERE psp_provider = p_provider AND psp_reference = p_provider_ref
    LIMIT 1;

    IF v_existing_id IS NOT NULL THEN
      RETURN jsonb_build_object(
        'success', true,
        'idempotent_replay', true,
        'payment_id', v_existing_id
      );
    END IF;
  END IF;

  v_amount_coins := (p_amount_dh * 100)::integer;

  SELECT id INTO v_link_id
  FROM parent_teen_links
  WHERE parent_id = p_parent_id AND teen_id = p_teen_id
  LIMIT 1;

  IF v_link_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'teen_not_linked');
  END IF;

  SELECT id INTO v_signature_id
  FROM e_signatures
  WHERE parent_id = p_parent_id AND terms_accepted = true
  LIMIT 1;

  IF v_signature_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'requires_signature');
  END IF;

  INSERT INTO payment_transactions (
    parent_id, teen_id, amount_dh, amount_coins, status, psp_provider, psp_reference
  ) VALUES (
    p_parent_id, p_teen_id, p_amount_dh, v_amount_coins, 'pending', p_provider, p_provider_ref
  ) RETURNING id INTO v_payment_id;

  UPDATE payment_transactions
     SET status = 'succeeded', succeeded_at = NOW()
   WHERE id = v_payment_id;

  INSERT INTO escrow_ledger (
    parent_id, teen_id, direction, amount_dh, amount_coins,
    related_payment_id, reason, created_by
  ) VALUES (
    p_parent_id, p_teen_id, 'top_up', p_amount_dh, v_amount_coins,
    v_payment_id, format('Parent top-up via %s (ref=%s)', p_provider, COALESCE(p_provider_ref, 'n/a')),
    p_parent_id
  );

  INSERT INTO user_coins (teen_id, balance, lifetime_earned, updated_at)
  VALUES (p_teen_id, v_amount_coins, v_amount_coins, NOW())
  ON CONFLICT (teen_id) DO UPDATE
    SET balance = COALESCE(user_coins.balance, 0) + EXCLUDED.balance,
        lifetime_earned = COALESCE(user_coins.lifetime_earned, 0) + EXCLUDED.lifetime_earned,
        updated_at = NOW()
  RETURNING balance INTO v_new_balance;

  INSERT INTO coin_transactions (
    teen_id, amount, transaction_type, source_type, source_id,
    description, balance_after
  ) VALUES (
    p_teen_id, v_amount_coins, 'topup', 'parent_topup', v_payment_id,
    format('Recharge parentale %s DH via %s', p_amount_dh, p_provider),
    v_new_balance
  );

  RETURN jsonb_build_object(
    'success', true,
    'payment_id', v_payment_id,
    'amount_coins', v_amount_coins,
    'new_balance', v_new_balance,
    'provider', p_provider,
    'provider_ref', p_provider_ref
  );
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

GRANT EXECUTE ON FUNCTION public.top_up_teen(UUID, UUID, NUMERIC, TEXT, TEXT)
  TO authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Threshold helper: how many distinct families have completed a top-up?
-- Used by the admin dashboard banner ("100 families OR 4 weeks → activate
-- automatic mode").
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.manual_topup_threshold_status()
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_families   INTEGER := 0;
  v_first_at   TIMESTAMPTZ;
  v_weeks      NUMERIC := 0;
BEGIN
  SELECT COUNT(DISTINCT parent_id), MIN(created_at)
    INTO v_families, v_first_at
  FROM payment_transactions
  WHERE status = 'succeeded';

  IF v_first_at IS NOT NULL THEN
    v_weeks := EXTRACT(EPOCH FROM (NOW() - v_first_at)) / (7 * 86400);
  END IF;

  RETURN jsonb_build_object(
    'families_topped_up', COALESCE(v_families, 0),
    'first_topup_at', v_first_at,
    'weeks_since_first', ROUND(v_weeks, 2),
    'should_activate_auto', (COALESCE(v_families, 0) >= 100 OR v_weeks >= 4)
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.manual_topup_threshold_status()
  TO authenticated, service_role;
