-- ============================================================
-- Migration 087: partner_offers — challenge offer type
-- ============================================================
-- TICKET-027 [partner-defi] Add offer_type='challenge' + check-in flow
--
-- WHY
--   Today partner_offers only describes discount-style offers
--   (verify-card -> apply-discount). Partners cannot launch a quest-
--   style offer such as "Visit our store this week = 50 XP". We extend
--   the canonical partner_offers table with the columns required to
--   describe a challenge, plus a dedicated table for capturing the
--   per-teen check-ins so we can enforce window + cap rules and
--   reconcile XP grants downstream.
--
-- WHAT
--   1. Re-assert / introduce a CHECK on partner_offers.offer_type so
--      that 'challenge' is an explicit, allowed value alongside the
--      existing 'discount' / 'reduction' rows that already live in prod.
--   2. Add columns specific to challenges:
--        * xp_reward             INT      — XP granted on a valid check-in
--        * max_check_ins         INT      — total check-ins a single teen
--                                           may earn for the offer (NULL = 1)
--        * check_in_window_days  INT      — rolling window (in days) used
--                                           by the route to gate repeat
--                                           check-ins. NULL = no window.
--   3. New table partner_challenge_check_ins capturing every successful
--      teen check-in performed via the partner scanner.
--
-- WHAT THIS MIGRATION DOES NOT DO
--   * It does NOT change discount-flow tables (verify-card / apply-
--     discount / discount_usage stay untouched — TICKET-025 owned that).
--   * It does NOT register the challenge XP grant: that happens in the
--     route handler via add_xp_to_user(...) so the existing XP pipeline
--     (xp_transactions + level recompute) remains the single source of
--     truth.
--   * It does NOT change `partner_offers` RLS — partner self-write
--     already governs who can publish a challenge.
--
-- IDEMPOTENT
--   ADD COLUMN IF NOT EXISTS, CREATE TABLE IF NOT EXISTS,
--   DROP CONSTRAINT IF EXISTS, CREATE POLICY drops then recreates.
-- ============================================================

BEGIN;

-- ---------- 1. offer_type: explicit closed set ----------------------------
-- Existing prod rows use 'discount'; we keep that and 'reduction' (legacy
-- alias) and add 'challenge'. NULL stays valid because pre-074 rows may
-- still carry it.
ALTER TABLE partner_offers
  DROP CONSTRAINT IF EXISTS partner_offers_offer_type_check;

ALTER TABLE partner_offers
  ADD CONSTRAINT partner_offers_offer_type_check
  CHECK (
    offer_type IS NULL
    OR offer_type IN ('discount', 'reduction', 'challenge')
  );

-- ---------- 2. Challenge-specific columns ---------------------------------
ALTER TABLE partner_offers
  ADD COLUMN IF NOT EXISTS xp_reward INTEGER,
  ADD COLUMN IF NOT EXISTS max_check_ins INTEGER,
  ADD COLUMN IF NOT EXISTS check_in_window_days INTEGER;

-- Sanity guards for the new columns. NULL is allowed (legacy + discount
-- rows have no challenge metadata), but if a value is set it must be
-- positive.
ALTER TABLE partner_offers
  DROP CONSTRAINT IF EXISTS partner_offers_xp_reward_check;
ALTER TABLE partner_offers
  ADD CONSTRAINT partner_offers_xp_reward_check
  CHECK (xp_reward IS NULL OR xp_reward >= 0);

ALTER TABLE partner_offers
  DROP CONSTRAINT IF EXISTS partner_offers_max_check_ins_check;
ALTER TABLE partner_offers
  ADD CONSTRAINT partner_offers_max_check_ins_check
  CHECK (max_check_ins IS NULL OR max_check_ins > 0);

ALTER TABLE partner_offers
  DROP CONSTRAINT IF EXISTS partner_offers_check_in_window_days_check;
ALTER TABLE partner_offers
  ADD CONSTRAINT partner_offers_check_in_window_days_check
  CHECK (check_in_window_days IS NULL OR check_in_window_days > 0);

-- ---------- 3. partner_challenge_check_ins --------------------------------
CREATE TABLE IF NOT EXISTS partner_challenge_check_ins (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  offer_id        UUID NOT NULL REFERENCES partner_offers(id) ON DELETE CASCADE,
  teen_id         UUID NOT NULL,
  partner_id      UUID NOT NULL REFERENCES partners(id) ON DELETE CASCADE,
  scanner_user_id UUID,                  -- the partner staff who scanned
  scanned_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  xp_awarded      INTEGER NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_partner_chk_offer_teen
  ON partner_challenge_check_ins (offer_id, teen_id, scanned_at DESC);

CREATE INDEX IF NOT EXISTS idx_partner_chk_partner_scanned
  ON partner_challenge_check_ins (partner_id, scanned_at DESC);

-- ---------- 4. RLS on partner_challenge_check_ins -------------------------
ALTER TABLE partner_challenge_check_ins ENABLE ROW LEVEL SECURITY;

-- Partner can read their own scans
DROP POLICY IF EXISTS partner_chk_partner_read ON partner_challenge_check_ins;
CREATE POLICY partner_chk_partner_read ON partner_challenge_check_ins
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM partners p
      WHERE p.id = partner_challenge_check_ins.partner_id
        AND p.email = (auth.jwt() ->> 'email')
    )
  );

-- Teen can read their own check-ins (history)
DROP POLICY IF EXISTS partner_chk_teen_read ON partner_challenge_check_ins;
CREATE POLICY partner_chk_teen_read ON partner_challenge_check_ins
  FOR SELECT
  USING (teen_id = auth.uid());

-- Service role manages writes (the API route uses the service path).
DROP POLICY IF EXISTS service_role_all_partner_chk ON partner_challenge_check_ins;
CREATE POLICY service_role_all_partner_chk ON partner_challenge_check_ins
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ---------- 5. Telemetry breadcrumb ---------------------------------------
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema='public' AND table_name='audit_logs'
  ) THEN
    INSERT INTO audit_logs (action, resource_type, metadata, created_at)
    VALUES (
      'migration_apply',
      'partner_offers',
      jsonb_build_object(
        'migration', '087_partner_challenge_type',
        'adds', jsonb_build_array('xp_reward', 'max_check_ins', 'check_in_window_days'),
        'new_table', 'partner_challenge_check_ins'
      ),
      NOW()
    );
  END IF;
END $$;

COMMIT;
