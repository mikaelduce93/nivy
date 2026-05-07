-- Wave 2.4 — Marketplace C2C (peer-to-peer teen marketplace)
-- Spec: docs/vision/marketplace-c2c.md + whitepaper §19.4.4 + §29 invariants.
--
-- Tables: marketplace_listings, marketplace_transactions, marketplace_disputes,
--         user_seller_stats.
-- RPCs:   create_listing, buy_listing, confirm_receipt, open_dispute.
--
-- Money invariants:
--   §29.2 every coin debit has a paired coin_transactions row
--   §29.3 every coin debit triggers XP cashback in the same tx
--   §29.5 auth.users.id is THE canonical user identifier
--   §29.7 every public table has explicit RLS policies
--   §29.14 DH=NUMERIC(10,2), coins=INTEGER, XP=INTEGER

-- ============================================================
-- 1. TABLES
-- ============================================================

CREATE TABLE IF NOT EXISTS public.marketplace_listings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category TEXT NOT NULL CHECK (category IN (
    'clothing','books','school','sport','gaming','art','crafts','tickets','services','other'
  )),
  title TEXT NOT NULL CHECK (length(title) BETWEEN 3 AND 120),
  description TEXT,
  price_coins INTEGER CHECK (price_coins IS NULL OR price_coins >= 0),
  price_dh NUMERIC(10,2) CHECK (price_dh IS NULL OR price_dh >= 0),
  images TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  condition TEXT CHECK (condition IN ('new','like_new','good','fair','poor')),
  size TEXT,
  brand TEXT,
  color TEXT,
  status TEXT NOT NULL DEFAULT 'pending_moderation' CHECK (status IN (
    'draft','pending_moderation','active','sold','removed','reported'
  )),
  moderation_id UUID REFERENCES public.moderation_queue(id) ON DELETE SET NULL,
  city TEXT,
  neighborhood TEXT,
  views_count INTEGER NOT NULL DEFAULT 0,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  sold_at TIMESTAMPTZ,
  CHECK (price_coins IS NOT NULL OR price_dh IS NOT NULL)
);

CREATE TABLE IF NOT EXISTS public.marketplace_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id UUID NOT NULL REFERENCES public.marketplace_listings(id) ON DELETE RESTRICT,
  buyer_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  seller_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  amount_coins INTEGER NOT NULL CHECK (amount_coins >= 0),
  amount_dh NUMERIC(10,2),
  cashback_xp INTEGER NOT NULL DEFAULT 0,
  platform_fee_coins INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'escrow' CHECK (status IN (
    'escrow','completed','disputed','refunded','cancelled'
  )),
  meet_method TEXT NOT NULL CHECK (meet_method IN (
    'school','venue_partner','public_pickup','shipping'
  )),
  meet_location_partner_id UUID REFERENCES public.partners(id) ON DELETE SET NULL,
  meet_at TIMESTAMPTZ,
  rated_by_buyer BOOLEAN NOT NULL DEFAULT false,
  rated_by_seller BOOLEAN NOT NULL DEFAULT false,
  parent_approval_id UUID REFERENCES public.parental_approvals(id) ON DELETE SET NULL,
  auto_release_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.marketplace_disputes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id UUID NOT NULL REFERENCES public.marketplace_transactions(id) ON DELETE CASCADE,
  opened_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  reason TEXT NOT NULL,
  evidence_urls TEXT[] DEFAULT ARRAY[]::TEXT[],
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN (
    'open','investigating','resolved_buyer','resolved_seller','rejected'
  )),
  resolution TEXT,
  resolved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.user_seller_stats (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  listings_count INTEGER NOT NULL DEFAULT 0,
  sold_count INTEGER NOT NULL DEFAULT 0,
  rating_avg NUMERIC(3,2) NOT NULL DEFAULT 0,
  total_revenue_coins INTEGER NOT NULL DEFAULT 0,
  total_revenue_dh_month NUMERIC(10,2) NOT NULL DEFAULT 0,
  trust_badge BOOLEAN GENERATED ALWAYS AS (sold_count >= 10 AND rating_avg >= 4.5) STORED,
  last_listing_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- 2. INDEXES
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_marketplace_listings_status_created
  ON public.marketplace_listings (status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_marketplace_listings_city_cat_status
  ON public.marketplace_listings (city, category, status);
CREATE INDEX IF NOT EXISTS idx_marketplace_listings_seller
  ON public.marketplace_listings (seller_user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_marketplace_listings_search
  ON public.marketplace_listings
  USING GIN (to_tsvector('simple', coalesce(title,'') || ' ' || coalesce(description,'')));

CREATE INDEX IF NOT EXISTS idx_marketplace_tx_buyer
  ON public.marketplace_transactions (buyer_user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_marketplace_tx_seller
  ON public.marketplace_transactions (seller_user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_marketplace_tx_status
  ON public.marketplace_transactions (status, auto_release_at);

CREATE INDEX IF NOT EXISTS idx_marketplace_disputes_tx
  ON public.marketplace_disputes (transaction_id);

-- ============================================================
-- 3. RLS
-- ============================================================

ALTER TABLE public.marketplace_listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketplace_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketplace_disputes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_seller_stats ENABLE ROW LEVEL SECURITY;

-- Helper: is_admin(uid) — check admin_roles or profiles.role
CREATE OR REPLACE FUNCTION public.mp_is_admin(p_uid UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.admin_roles WHERE profile_id = p_uid
    UNION ALL
    SELECT 1 FROM public.profiles WHERE id = p_uid
      AND role IN ('admin','super_admin','moderator','support')
  );
$$;
GRANT EXECUTE ON FUNCTION public.mp_is_admin(UUID) TO authenticated, service_role, anon;

-- Listings: public can SELECT active; sellers see own; admins see all
DROP POLICY IF EXISTS mp_listings_public_select ON public.marketplace_listings;
CREATE POLICY mp_listings_public_select ON public.marketplace_listings
  FOR SELECT TO anon, authenticated
  USING (status = 'active');

DROP POLICY IF EXISTS mp_listings_owner_select ON public.marketplace_listings;
CREATE POLICY mp_listings_owner_select ON public.marketplace_listings
  FOR SELECT TO authenticated
  USING (auth.uid() = seller_user_id);

DROP POLICY IF EXISTS mp_listings_admin_select ON public.marketplace_listings;
CREATE POLICY mp_listings_admin_select ON public.marketplace_listings
  FOR SELECT TO authenticated
  USING (public.mp_is_admin(auth.uid()));

DROP POLICY IF EXISTS mp_listings_owner_modify ON public.marketplace_listings;
CREATE POLICY mp_listings_owner_modify ON public.marketplace_listings
  FOR UPDATE TO authenticated
  USING (auth.uid() = seller_user_id)
  WITH CHECK (auth.uid() = seller_user_id);

-- Transactions: buyer + seller + admins
DROP POLICY IF EXISTS mp_tx_party_select ON public.marketplace_transactions;
CREATE POLICY mp_tx_party_select ON public.marketplace_transactions
  FOR SELECT TO authenticated
  USING (
    auth.uid() = buyer_user_id
    OR auth.uid() = seller_user_id
    OR public.mp_is_admin(auth.uid())
  );

-- Disputes: parties + admins
DROP POLICY IF EXISTS mp_dispute_party_select ON public.marketplace_disputes;
CREATE POLICY mp_dispute_party_select ON public.marketplace_disputes
  FOR SELECT TO authenticated
  USING (
    public.mp_is_admin(auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.marketplace_transactions t
      WHERE t.id = transaction_id
        AND (auth.uid() = t.buyer_user_id OR auth.uid() = t.seller_user_id)
    )
  );

-- Seller stats: public read
DROP POLICY IF EXISTS mp_seller_stats_public ON public.user_seller_stats;
CREATE POLICY mp_seller_stats_public ON public.user_seller_stats
  FOR SELECT TO anon, authenticated USING (true);

-- Grants (service_role bypasses RLS, but we still GRANT for clarity)
GRANT SELECT ON public.marketplace_listings TO anon, authenticated;
GRANT SELECT ON public.marketplace_transactions TO authenticated;
GRANT SELECT ON public.marketplace_disputes TO authenticated;
GRANT SELECT ON public.user_seller_stats TO anon, authenticated;
GRANT ALL ON public.marketplace_listings TO service_role;
GRANT ALL ON public.marketplace_transactions TO service_role;
GRANT ALL ON public.marketplace_disputes TO service_role;
GRANT ALL ON public.user_seller_stats TO service_role;

-- ============================================================
-- 4. RPC: create_listing
-- ============================================================

CREATE OR REPLACE FUNCTION public.create_listing(
  p_seller_id UUID,
  p_params JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_caller UUID := auth.uid();
  v_listing_id UUID;
  v_mod_id UUID;
  v_active_count INTEGER;
  v_title TEXT := p_params->>'title';
  v_desc TEXT := p_params->>'description';
  v_combined TEXT;
  v_is_teen BOOLEAN;
BEGIN
  IF v_caller IS NOT NULL AND v_caller <> p_seller_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'unauthorized_caller');
  END IF;

  IF v_title IS NULL OR length(v_title) < 3 THEN
    RETURN jsonb_build_object('success', false, 'error', 'invalid_title');
  END IF;

  v_combined := lower(coalesce(v_title,'') || ' ' || coalesce(v_desc,''));

  -- Blocked categories (teen safety)
  -- Note: Postgres POSIX regex uses \m / \M for word boundaries (NOT \b which is a literal backspace)
  IF v_combined ~ '\m(weapon|gun|knife|firearm|drug|cannabis|marijuana|cocaine|alcohol|wine|beer|whisky|tobacco|cigarette|vape|e-cigarette)\M' THEN
    RETURN jsonb_build_object('success', false, 'error', 'blocked_category');
  END IF;

  -- Contact-info regex (no phone numbers, emails, social handles, IG/WhatsApp URLs)
  IF v_combined ~ '(\+?\d[\d\s().-]{7,}\d)'
     OR v_combined ~ '[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}'
     OR v_combined ~ '@[a-z0-9_.]{3,}'
     OR v_combined ~ '(whatsapp|wa\.me|instagram|t\.me|telegram|snapchat)' THEN
    RETURN jsonb_build_object('success', false, 'error', 'contact_info_blocked');
  END IF;

  -- AML cap: teen seller — max 5 active listings
  SELECT EXISTS (SELECT 1 FROM public.teens WHERE id = p_seller_id) INTO v_is_teen;
  IF v_is_teen THEN
    SELECT COUNT(*) INTO v_active_count
    FROM public.marketplace_listings
    WHERE seller_user_id = p_seller_id
      AND status IN ('pending_moderation','active');
    IF v_active_count >= 5 THEN
      RETURN jsonb_build_object('success', false, 'error', 'listing_cap_reached');
    END IF;
  END IF;

  -- Insert listing (pending_moderation)
  INSERT INTO public.marketplace_listings (
    seller_user_id, category, title, description,
    price_coins, price_dh, images, condition, size, brand, color,
    status, city, neighborhood, expires_at
  ) VALUES (
    p_seller_id,
    p_params->>'category',
    v_title,
    v_desc,
    NULLIF(p_params->>'price_coins','')::INTEGER,
    NULLIF(p_params->>'price_dh','')::NUMERIC,
    COALESCE((SELECT array_agg(value::text) FROM jsonb_array_elements_text(p_params->'images')), ARRAY[]::TEXT[]),
    p_params->>'condition',
    p_params->>'size',
    p_params->>'brand',
    p_params->>'color',
    'pending_moderation',
    p_params->>'city',
    p_params->>'neighborhood',
    now() + INTERVAL '30 days'
  )
  RETURNING id INTO v_listing_id;

  -- Insert moderation_queue row
  INSERT INTO public.moderation_queue (
    content_type, content_id, payload, status
  ) VALUES (
    'marketplace_listing', v_listing_id,
    jsonb_build_object(
      'title', v_title,
      'description', v_desc,
      'images', p_params->'images',
      'category', p_params->>'category',
      'seller_user_id', p_seller_id
    ),
    'pending'
  )
  RETURNING id INTO v_mod_id;

  UPDATE public.marketplace_listings
  SET moderation_id = v_mod_id
  WHERE id = v_listing_id;

  -- Bump seller stats
  INSERT INTO public.user_seller_stats (user_id, listings_count, last_listing_at)
  VALUES (p_seller_id, 1, now())
  ON CONFLICT (user_id) DO UPDATE
  SET listings_count = public.user_seller_stats.listings_count + 1,
      last_listing_at = now(),
      updated_at = now();

  RETURN jsonb_build_object(
    'success', true,
    'listing_id', v_listing_id,
    'moderation_id', v_mod_id,
    'status', 'pending_moderation'
  );
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;
GRANT EXECUTE ON FUNCTION public.create_listing(UUID, JSONB) TO authenticated, service_role;

-- ============================================================
-- 5. RPC: buy_listing
-- ============================================================

CREATE OR REPLACE FUNCTION public.buy_listing(
  p_listing_id UUID,
  p_buyer_id UUID,
  p_meet_method TEXT,
  p_meet_location_partner_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_caller UUID := auth.uid();
  v_listing public.marketplace_listings%ROWTYPE;
  v_buyer_balance INTEGER;
  v_buyer_is_teen BOOLEAN;
  v_seller_is_teen BOOLEAN;
  v_buyer_ceiling INTEGER;
  v_buyer_mode TEXT;
  v_buyer_parent UUID;
  v_approval_id UUID;
  v_tx_id UUID;
  v_new_balance INTEGER;
  v_TEEN_CEILING_DEFAULT CONSTANT INTEGER := 100;
BEGIN
  IF v_caller IS NOT NULL AND v_caller <> p_buyer_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'unauthorized_caller');
  END IF;

  -- Lock & verify listing
  SELECT * INTO v_listing
  FROM public.marketplace_listings
  WHERE id = p_listing_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'listing_not_found');
  END IF;
  IF v_listing.status <> 'active' THEN
    RETURN jsonb_build_object('success', false, 'error', 'listing_not_available', 'status', v_listing.status);
  END IF;
  IF v_listing.seller_user_id = p_buyer_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'cannot_buy_own_listing');
  END IF;
  IF v_listing.price_coins IS NULL OR v_listing.price_coins <= 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'invalid_price');
  END IF;

  -- Identify if buyer/seller are teens (safe-meet rule)
  SELECT EXISTS (SELECT 1 FROM public.teens WHERE id = p_buyer_id) INTO v_buyer_is_teen;
  SELECT EXISTS (SELECT 1 FROM public.teens WHERE id = v_listing.seller_user_id) INTO v_seller_is_teen;

  -- Safe-meet: any minor party → only school or venue_partner
  IF (v_buyer_is_teen OR v_seller_is_teen)
     AND p_meet_method NOT IN ('school','venue_partner') THEN
    RETURN jsonb_build_object('success', false, 'error', 'unsafe_meet_method');
  END IF;
  IF p_meet_method = 'venue_partner' AND p_meet_location_partner_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'meet_location_required');
  END IF;

  -- Buyer balance (use user_coins)
  SELECT COALESCE(balance, 0) INTO v_buyer_balance
  FROM public.user_coins WHERE teen_id = p_buyer_id;

  IF v_buyer_is_teen AND COALESCE(v_buyer_balance, 0) < v_listing.price_coins THEN
    RETURN jsonb_build_object('success', false, 'error', 'insufficient_balance', 'balance', COALESCE(v_buyer_balance, 0));
  END IF;

  -- If teen buyer above ceiling → enqueue parental_approvals & return pending
  IF v_buyer_is_teen THEN
    SELECT mode, max_per_transaction_coins, parent_id
    INTO v_buyer_mode, v_buyer_ceiling, v_buyer_parent
    FROM public.teen_budget_limits WHERE teen_id = p_buyer_id;

    v_buyer_ceiling := COALESCE(v_buyer_ceiling, v_TEEN_CEILING_DEFAULT);
    IF v_buyer_parent IS NULL THEN
      SELECT parent_id INTO v_buyer_parent FROM public.parent_teen_links WHERE teen_id = p_buyer_id LIMIT 1;
    END IF;

    IF v_listing.price_coins > v_buyer_ceiling OR COALESCE(v_buyer_mode,'validation') = 'validation' THEN
      IF v_buyer_parent IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'no_parent_link');
      END IF;
      INSERT INTO public.parental_approvals (
        parent_id, teen_id, action_type, resource_type, resource_id, amount, details,
        status, requested_at, expires_at
      ) VALUES (
        v_buyer_parent, p_buyer_id, 'purchase_above_ceiling', 'marketplace_listing',
        p_listing_id, v_listing.price_coins,
        jsonb_build_object(
          'listing_id', p_listing_id,
          'title', v_listing.title,
          'price_coins', v_listing.price_coins,
          'meet_method', p_meet_method,
          'meet_location_partner_id', p_meet_location_partner_id
        ),
        'pending', now(), now() + INTERVAL '48 hours'
      ) RETURNING id INTO v_approval_id;
      RETURN jsonb_build_object(
        'success', true,
        'status', 'pending_approval',
        'approval_id', v_approval_id
      );
    END IF;
  END IF;

  -- Atomic: debit buyer, hold escrow, mark listing sold
  -- (1) update listing.status='sold' first to prevent double-buy
  UPDATE public.marketplace_listings
  SET status = 'sold', sold_at = now()
  WHERE id = p_listing_id AND status = 'active';
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'listing_race_lost');
  END IF;

  -- (2) debit buyer's user_coins (only if buyer has a wallet — teens always do)
  IF v_buyer_is_teen THEN
    UPDATE public.user_coins
    SET balance = balance - v_listing.price_coins,
        lifetime_spent = COALESCE(lifetime_spent,0) + v_listing.price_coins,
        updated_at = now()
    WHERE teen_id = p_buyer_id
      AND balance >= v_listing.price_coins
    RETURNING balance INTO v_new_balance;
    IF NOT FOUND THEN
      -- Rollback
      RAISE EXCEPTION 'insufficient_balance_race';
    END IF;

    -- §29.2: paired coin_transactions row
    INSERT INTO public.coin_transactions (
      teen_id, amount, transaction_type, source_type, source_id,
      description, balance_after
    ) VALUES (
      p_buyer_id, -v_listing.price_coins, 'spend', 'marketplace_escrow',
      p_listing_id,
      'Marketplace buy (escrow): ' || v_listing.title,
      v_new_balance
    );
  END IF;

  -- (3) create transaction (escrow)
  INSERT INTO public.marketplace_transactions (
    listing_id, buyer_user_id, seller_user_id,
    amount_coins, amount_dh, status, meet_method, meet_location_partner_id,
    auto_release_at
  ) VALUES (
    p_listing_id, p_buyer_id, v_listing.seller_user_id,
    v_listing.price_coins, v_listing.price_dh, 'escrow',
    p_meet_method, p_meet_location_partner_id,
    now() + INTERVAL '3 days'
  ) RETURNING id INTO v_tx_id;

  RETURN jsonb_build_object(
    'success', true,
    'status', 'escrow',
    'transaction_id', v_tx_id,
    'amount_coins', v_listing.price_coins,
    'auto_release_at', (now() + INTERVAL '3 days')
  );
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;
GRANT EXECUTE ON FUNCTION public.buy_listing(UUID, UUID, TEXT, UUID) TO authenticated, service_role;

-- ============================================================
-- 6. RPC: confirm_receipt
-- ============================================================

CREATE OR REPLACE FUNCTION public.confirm_receipt(
  p_transaction_id UUID,
  p_buyer_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_caller UUID := auth.uid();
  v_tx public.marketplace_transactions%ROWTYPE;
  v_fee INTEGER;
  v_seller_credit INTEGER;
  v_cashback_xp INTEGER;
  v_seller_is_teen BOOLEAN;
  v_buyer_is_teen BOOLEAN;
  v_new_seller_balance INTEGER;
BEGIN
  IF v_caller IS NOT NULL AND v_caller <> p_buyer_id AND NOT public.mp_is_admin(v_caller) THEN
    RETURN jsonb_build_object('success', false, 'error', 'unauthorized_caller');
  END IF;

  SELECT * INTO v_tx FROM public.marketplace_transactions WHERE id = p_transaction_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'transaction_not_found');
  END IF;
  IF v_tx.buyer_user_id <> p_buyer_id AND NOT public.mp_is_admin(v_caller) THEN
    RETURN jsonb_build_object('success', false, 'error', 'not_buyer');
  END IF;
  IF v_tx.status <> 'escrow' THEN
    RETURN jsonb_build_object('success', false, 'error', 'not_in_escrow', 'status', v_tx.status);
  END IF;

  v_fee := floor(v_tx.amount_coins * 0.08)::INTEGER;
  v_seller_credit := v_tx.amount_coins - v_fee;
  v_cashback_xp := floor(v_tx.amount_coins * 0.10)::INTEGER;

  SELECT EXISTS (SELECT 1 FROM public.teens WHERE id = v_tx.seller_user_id) INTO v_seller_is_teen;
  SELECT EXISTS (SELECT 1 FROM public.teens WHERE id = v_tx.buyer_user_id) INTO v_buyer_is_teen;

  -- Credit seller (teens have user_coins)
  IF v_seller_is_teen THEN
    INSERT INTO public.user_coins (teen_id, balance, lifetime_earned, updated_at)
    VALUES (v_tx.seller_user_id, v_seller_credit, v_seller_credit, now())
    ON CONFLICT (teen_id) DO UPDATE
      SET balance = COALESCE(public.user_coins.balance, 0) + EXCLUDED.balance,
          lifetime_earned = COALESCE(public.user_coins.lifetime_earned, 0) + EXCLUDED.lifetime_earned,
          updated_at = now()
    RETURNING balance INTO v_new_seller_balance;

    INSERT INTO public.coin_transactions (
      teen_id, amount, transaction_type, source_type, source_id,
      description, balance_after
    ) VALUES (
      v_tx.seller_user_id, v_seller_credit, 'earn', 'marketplace_sale',
      p_transaction_id,
      'Marketplace sale (net of 8% fee): tx=' || p_transaction_id,
      v_new_seller_balance
    );

    -- Update seller_stats revenue
    UPDATE public.user_seller_stats
    SET sold_count = sold_count + 1,
        total_revenue_coins = total_revenue_coins + v_seller_credit,
        updated_at = now()
    WHERE user_id = v_tx.seller_user_id;
    IF NOT FOUND THEN
      INSERT INTO public.user_seller_stats (user_id, sold_count, total_revenue_coins, updated_at)
      VALUES (v_tx.seller_user_id, 1, v_seller_credit, now());
    END IF;
  END IF;

  -- Cashback XP to buyer (§29.3 — coin debit triggers XP cashback in same tx)
  IF v_buyer_is_teen AND v_cashback_xp > 0 THEN
    INSERT INTO public.user_xp (teen_id, total_xp, current_level, updated_at)
    VALUES (v_tx.buyer_user_id, v_cashback_xp, 1, now())
    ON CONFLICT (teen_id) DO UPDATE
      SET total_xp = COALESCE(public.user_xp.total_xp, 0) + EXCLUDED.total_xp,
          updated_at = now();

    INSERT INTO public.xp_transactions (
      teen_id, amount, source_type, source_id, description, type, reference_type, reference_id
    ) VALUES (
      v_tx.buyer_user_id, v_cashback_xp, 'marketplace_cashback', p_transaction_id,
      'Marketplace cashback (10%)', 'earn', 'marketplace_transaction', p_transaction_id
    );
  END IF;

  -- Update tx
  UPDATE public.marketplace_transactions
  SET status = 'completed',
      cashback_xp = v_cashback_xp,
      platform_fee_coins = v_fee
  WHERE id = p_transaction_id;

  RETURN jsonb_build_object(
    'success', true,
    'status', 'completed',
    'seller_credit_coins', v_seller_credit,
    'platform_fee_coins', v_fee,
    'cashback_xp', v_cashback_xp
  );
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;
GRANT EXECUTE ON FUNCTION public.confirm_receipt(UUID, UUID) TO authenticated, service_role;

-- ============================================================
-- 7. RPC: open_dispute
-- ============================================================

CREATE OR REPLACE FUNCTION public.open_dispute(
  p_transaction_id UUID,
  p_user_id UUID,
  p_reason TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_caller UUID := auth.uid();
  v_tx public.marketplace_transactions%ROWTYPE;
  v_dispute_id UUID;
BEGIN
  IF v_caller IS NOT NULL AND v_caller <> p_user_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'unauthorized_caller');
  END IF;
  IF p_reason IS NULL OR length(p_reason) < 5 THEN
    RETURN jsonb_build_object('success', false, 'error', 'reason_required');
  END IF;

  SELECT * INTO v_tx FROM public.marketplace_transactions WHERE id = p_transaction_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'transaction_not_found');
  END IF;
  IF v_tx.buyer_user_id <> p_user_id AND v_tx.seller_user_id <> p_user_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'not_a_party');
  END IF;
  IF v_tx.status NOT IN ('escrow') THEN
    RETURN jsonb_build_object('success', false, 'error', 'cannot_dispute', 'status', v_tx.status);
  END IF;
  IF v_tx.created_at < now() - INTERVAL '7 days' THEN
    RETURN jsonb_build_object('success', false, 'error', 'dispute_window_closed');
  END IF;

  INSERT INTO public.marketplace_disputes (transaction_id, opened_by, reason, status)
  VALUES (p_transaction_id, p_user_id, p_reason, 'open')
  RETURNING id INTO v_dispute_id;

  UPDATE public.marketplace_transactions
  SET status = 'disputed', auto_release_at = NULL
  WHERE id = p_transaction_id;

  RETURN jsonb_build_object('success', true, 'dispute_id', v_dispute_id);
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;
GRANT EXECUTE ON FUNCTION public.open_dispute(UUID, UUID, TEXT) TO authenticated, service_role;

-- ============================================================
-- 8. Auto-release escrow (called by cron)
-- ============================================================

CREATE OR REPLACE FUNCTION public.marketplace_auto_release_escrow()
RETURNS TABLE(transaction_id UUID, status TEXT, error TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_tx public.marketplace_transactions%ROWTYPE;
  v_result JSONB;
BEGIN
  FOR v_tx IN
    SELECT * FROM public.marketplace_transactions
    WHERE status = 'escrow'
      AND auto_release_at IS NOT NULL
      AND auto_release_at <= now()
      AND NOT EXISTS (
        SELECT 1 FROM public.marketplace_disputes d
        WHERE d.transaction_id = marketplace_transactions.id
          AND d.status IN ('open','investigating')
      )
  LOOP
    v_result := public.confirm_receipt(v_tx.id, v_tx.buyer_user_id);
    transaction_id := v_tx.id;
    status := COALESCE(v_result->>'status','error');
    error  := v_result->>'error';
    RETURN NEXT;
  END LOOP;
END;
$$;
GRANT EXECUTE ON FUNCTION public.marketplace_auto_release_escrow() TO service_role;
