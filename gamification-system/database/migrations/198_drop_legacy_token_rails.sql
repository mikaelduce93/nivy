-- =============================================
-- MIGRATION 198: Drop legacy / deprecated token rails
-- =============================================
--
-- CANON §5.1 — the parallel token economy introduced in migration 028 is
-- DEPRECATED and replaced by the canonical coin wallet (`user_coins`,
-- `coin_transactions`) + XP ledger (`user_xp`). The token tables were a
-- second currency rail that never held honest balances (its mutation RPCs
-- were phantom; see app/api/teen/tokens POST deprecation note in Wave 6C).
--
-- This migration is the inverse of 028_tokens_rewards_system.sql. It drops:
--   - 8 tables: token_redemptions, token_rewards, token_transfers,
--                token_transactions, token_limits_tracking, token_sources,
--                token_types, daily_bonuses
--   - 5 RPC functions: get_user_wallet, claim_daily_bonus, transfer_tokens,
--                      spend_tokens, add_tokens_to_user
--   - 1 trigger function: update_token_multiplier_from_subscription()
--   - 1 trigger: trigger_update_token_multiplier (on user_subscriptions)
--   - 8 RLS policies
--   - 5 deprecated columns on user_coins (the table itself is kept)
--
-- Cross-reference: 028_tokens_rewards_system.sql (lines 911-951 = policies,
-- 419-875 = functions, 50-412 = tables, 13-44 = user_coins columns).
--
-- NOTE — homonyms deliberately PRESERVED (different systems, NOT the
-- deprecated token economy):
--   - partner_kyc_tokens  (security / KYC system)
--   - teen_link_tokens    (parent-teen link system)
--   - subscription_plans.referrer_reward_tokens  (referral domain, 027)
--   - share_rewards.tokens_reward                 (social-share domain, 037)
--   - partner reward redemption .tokens_used      (real coin cost)
-- Only objects whose names start with `token_` or are exactly
-- `daily_bonuses` are touched here.
-- =============================================

-- =============================================
-- PART 1: DROP RLS POLICIES FIRST (028 lines 917-951)
-- =============================================
-- Drop policies before the tables they attach to, so the DROP is clean
-- regardless of whether RLS is still enabled.

DROP POLICY IF EXISTS "Users can view own token transactions" ON token_transactions;
DROP POLICY IF EXISTS "Users can view own limits" ON token_limits_tracking;
DROP POLICY IF EXISTS "Users can view own redemptions" ON token_redemptions;
DROP POLICY IF EXISTS "Users can view own transfers" ON token_transfers;
DROP POLICY IF EXISTS "Users can view own daily bonus" ON daily_bonuses;
DROP POLICY IF EXISTS "Anyone can view token types" ON token_types;
DROP POLICY IF EXISTS "Anyone can view token rewards" ON token_rewards;
DROP POLICY IF EXISTS "Anyone can view token sources" ON token_sources;

-- =============================================
-- PART 2: DROP TRIGGER + ITS FUNCTION (028 lines 958-988)
-- =============================================

DROP TRIGGER IF EXISTS trigger_update_token_multiplier ON user_subscriptions;
DROP FUNCTION IF EXISTS update_token_multiplier_from_subscription() CASCADE;

-- =============================================
-- PART 3: DROP RPC FUNCTIONS (028 lines 419-875)
-- =============================================
-- These function names are unique in the schema (no overloads), so dropping
-- by name with CASCADE is safe on PG 14+ and avoids signature-mismatch risk.

DROP FUNCTION IF EXISTS get_user_wallet CASCADE;
DROP FUNCTION IF EXISTS claim_daily_bonus CASCADE;
DROP FUNCTION IF EXISTS transfer_tokens CASCADE;
DROP FUNCTION IF EXISTS spend_tokens CASCADE;
DROP FUNCTION IF EXISTS add_tokens_to_user CASCADE;

-- =============================================
-- PART 4: DROP TABLES — FK-safe order (children before parents)
-- =============================================
-- Dependencies:
--   token_redemptions.reward_id  -> token_rewards.id
--   token_sources.token_type     -> token_types.code
-- All other token tables are leaf tables (only indexes / RLS, no outbound FK).
-- CASCADE absorbs indexes and any residual dependent objects.

DROP TABLE IF EXISTS token_redemptions CASCADE;  -- FK -> token_rewards
DROP TABLE IF EXISTS token_rewards CASCADE;
DROP TABLE IF EXISTS token_transfers CASCADE;
DROP TABLE IF EXISTS token_transactions CASCADE;
DROP TABLE IF EXISTS token_limits_tracking CASCADE;
DROP TABLE IF EXISTS token_sources CASCADE;       -- FK -> token_types
DROP TABLE IF EXISTS token_types CASCADE;
DROP TABLE IF EXISTS daily_bonuses CASCADE;

-- =============================================
-- PART 5: DROP DEPRECATED COLUMNS ON user_coins (KEEP THE TABLE)
-- =============================================
-- user_coins is the canonical coin wallet; only the token-era columns added
-- in 028 (lines 13-44) are removed. balance / lifetime_earned /
-- lifetime_spent / teen_id / updated_at are canonical and untouched.

ALTER TABLE user_coins
  DROP COLUMN IF EXISTS premium_tokens,
  DROP COLUMN IF EXISTS seasonal_tokens,
  DROP COLUMN IF EXISTS pending_tokens,
  DROP COLUMN IF EXISTS token_multiplier,
  DROP COLUMN IF EXISTS total_lifetime_tokens;
