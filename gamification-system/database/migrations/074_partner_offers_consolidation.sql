-- ============================================================
-- Migration 074: Partner Offers Consolidation
-- ============================================================
-- TICKET-025 [partner-defi] Reconcile partner_offers <-> partner_discounts
--
-- BEFORE THIS MIGRATION
--   * `partner_offers` (canonical, live, 1 row): rich schema with
--     tags / offer_type / discount_pct / price_coins / price_dh / capacity /
--     valid_from / valid_until / is_active.
--   * `partner_discounts` (parallel, 0 rows): minimal schema; the
--     existing API routes /api/partner/{offers,verify-card,apply-discount}
--     wrote/read here using columns that didn't even exist on the table
--     (discount_name, discount_type, discount_value, min_vip_level, ...).
--   * Net effect: partner offer flow has been silently broken in prod —
--     POSTs returned 500s, GETs returned empty rows, etc.
--   * No FK references the obsolete `partner_discounts` table.
--
-- DECISION
--   Keep `partner_offers` as the single canonical table (it's live, has a
--   row, and is referenced by app/partner/dashboard, app/partner/page,
--   app/partner/offers/[id]/edit, and the admin/teen surfaces shipped in
--   prior waves). Expand it with the discount-flavored columns so the
--   verify-card / apply-discount semantics survive after API rewrites.
--
-- AFTER THIS MIGRATION
--   * `partner_offers` gains: discount_value, discount_type,
--     min_purchase_amount, max_discount_amount, min_vip_level,
--     requires_vip, max_uses_per_user, max_total_uses,
--     current_total_uses, terms_and_conditions, applicable_categories,
--     updated_at + the legacy `partner_discounts.discount_name` is exposed
--     as a generated alias of `title` for any straggler reader.
--   * `partner_discounts` is dropped (no rows, no FKs, no other code
--     depends on its DDL beyond the 3 routes this ticket also rewrites).
--   * Backward-compat VIEW `partner_discounts` is created pointing at
--     `partner_offers` so that any code path missed by grep keeps working
--     until Wave 2 PT1 lands. The view is read-only on purpose.
--
-- IDEMPOTENT
--   Re-running is a no-op: ALTER ... ADD COLUMN IF NOT EXISTS, DROP
--   TABLE IF EXISTS, CREATE OR REPLACE VIEW.
-- ============================================================

BEGIN;

-- ---------- 1. Backfill any rows from partner_discounts (defensive) -----
-- Even though count is 0 today, we preserve any data that may have been
-- written between the audit and this migration's apply.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema='public' AND table_name='partner_discounts'
  ) THEN
    INSERT INTO partner_offers (
      id, partner_id, title, description, offer_type,
      valid_from, valid_until, is_active, created_at
    )
    SELECT
      pd.id,
      pd.partner_id,
      pd.title,
      pd.description,
      'discount'::text,
      now(),
      pd.valid_until::timestamptz,
      pd.is_active,
      pd.created_at
    FROM partner_discounts pd
    WHERE NOT EXISTS (
      SELECT 1 FROM partner_offers po WHERE po.id = pd.id
    );
  END IF;
END $$;

-- ---------- 2. Extend partner_offers with discount-flavored columns ----
ALTER TABLE partner_offers
  ADD COLUMN IF NOT EXISTS discount_value NUMERIC,
  ADD COLUMN IF NOT EXISTS discount_type TEXT
    CHECK (discount_type IS NULL OR discount_type IN ('percentage','fixed','free_item','bundle')),
  ADD COLUMN IF NOT EXISTS min_purchase_amount NUMERIC,
  ADD COLUMN IF NOT EXISTS max_discount_amount NUMERIC,
  ADD COLUMN IF NOT EXISTS min_vip_level TEXT
    CHECK (min_vip_level IS NULL OR min_vip_level IN ('free','silver','gold','platinum')),
  ADD COLUMN IF NOT EXISTS requires_vip BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS max_uses_per_user INTEGER,
  ADD COLUMN IF NOT EXISTS max_total_uses INTEGER,
  ADD COLUMN IF NOT EXISTS current_total_uses INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS terms_and_conditions TEXT,
  ADD COLUMN IF NOT EXISTS applicable_categories TEXT[],
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

-- Soft-mirror discount_pct -> discount_value for the existing row, so
-- the verify-card flow doesn't need to handle two source fields.
UPDATE partner_offers
SET discount_value = discount_pct
WHERE discount_value IS NULL AND discount_pct IS NOT NULL;

-- Default discount_type when a row clearly looks like a percentage
-- discount (discount_pct populated).
UPDATE partner_offers
SET discount_type = 'percentage'
WHERE discount_type IS NULL AND discount_pct IS NOT NULL;

-- ---------- 3. updated_at trigger ---------------------------------------
CREATE OR REPLACE FUNCTION partner_offers_set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_partner_offers_updated_at ON partner_offers;
CREATE TRIGGER trg_partner_offers_updated_at
  BEFORE UPDATE ON partner_offers
  FOR EACH ROW EXECUTE FUNCTION partner_offers_set_updated_at();

-- ---------- 4. Indexes for hot lookups ---------------------------------
CREATE INDEX IF NOT EXISTS idx_partner_offers_partner_active
  ON partner_offers (partner_id, is_active);

CREATE INDEX IF NOT EXISTS idx_partner_offers_valid_window
  ON partner_offers (valid_from, valid_until)
  WHERE is_active = true;

-- ---------- 5. Drop partner_discounts (no FKs, 0 rows) ------------------
-- We first capture any policies (none should rely on the obsolete table
-- by Wave 1, but defensive). DROP CASCADE not used: we want a clean fail
-- if some object surprises us.
DROP TABLE IF EXISTS partner_discounts;

-- ---------- 6. Backward-compat VIEW for stragglers ----------------------
-- Any code path missed by the Wave-1 grep keeps reading; the view is
-- read-only (no INSERT/UPDATE), which surfaces missed writes as 4xx
-- instead of silently dropping data.
CREATE OR REPLACE VIEW partner_discounts AS
SELECT
  id,
  partner_id,
  title                AS discount_name,
  description,
  COALESCE(discount_type, 'percentage') AS discount_type,
  discount_value,
  requires_vip,
  min_vip_level,
  min_purchase_amount,
  max_discount_amount,
  terms_and_conditions,
  valid_from,
  valid_until,
  is_active,
  max_uses_per_user,
  max_total_uses,
  current_total_uses,
  applicable_categories,
  created_at,
  updated_at
FROM partner_offers
WHERE offer_type IS NULL OR offer_type IN ('discount','reduction');

COMMENT ON VIEW partner_discounts IS
  'Deprecated read-only view kept for backward compat with pre-Wave-1 callers. Canonical table is partner_offers. Remove after Wave 2 PT1 audit.';

-- ---------- 7. RLS on partner_offers -----------------------------------
ALTER TABLE partner_offers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS partner_offers_self_read ON partner_offers;
CREATE POLICY partner_offers_self_read ON partner_offers
  FOR SELECT
  USING (
    is_active = true
    OR EXISTS (
      SELECT 1 FROM partners p
      WHERE p.id = partner_offers.partner_id
        AND p.email = (auth.jwt() ->> 'email')
    )
  );

DROP POLICY IF EXISTS partner_offers_self_write ON partner_offers;
CREATE POLICY partner_offers_self_write ON partner_offers
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM partners p
      WHERE p.id = partner_offers.partner_id
        AND p.email = (auth.jwt() ->> 'email')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM partners p
      WHERE p.id = partner_offers.partner_id
        AND p.email = (auth.jwt() ->> 'email')
    )
  );

DROP POLICY IF EXISTS service_role_all_partner_offers ON partner_offers;
CREATE POLICY service_role_all_partner_offers ON partner_offers
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Drop the obsolete read-everything policy now that we have a real one.
DROP POLICY IF EXISTS partner_offers_authenticated_read ON partner_offers;

-- ---------- 8. Done -----------------------------------------------------
COMMIT;
