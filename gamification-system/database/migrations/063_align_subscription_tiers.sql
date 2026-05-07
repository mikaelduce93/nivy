-- Migration 063 — Align subscription tiers to canonical Free / Silver / Gold / Platinum
-- Date: 2026-05-07
-- Source: docs/vision/PRODUCT_WHITEPAPER.md §10 (founder-decisions row 19, 🟢 LOCKED)
--         docs/vision/v1_1_execution/P2_3_inventory.md (A1 hand-off)
--
-- Why this migration exists:
--   The `subscription_plans` table currently seeds rows with codes
--   Free / Starter / Pro / Elite / Family. The whitepaper has locked the
--   canonical tier vocabulary to Free / Silver / Gold / Platinum. The
--   `family` plan is left in place pending founder review (KEEP + flagged).
--
--   Both `user_subscriptions` and `family_subscriptions` are 0-row at the
--   moment this migration runs (verified live 2026-05-07), so we can rewrite
--   plan codes/names without a data-migration step. UUID `id` values are
--   preserved, so any future FK references stay stable.
--
--   This migration is idempotent: re-running it is safe.
--
-- Out of scope (explicitly NOT touched, see A1 inventory §3.4 and §2.4):
--   - vip_tiers, user_vip_status, vip_perks, vip_benefits_log,
--     vip_exclusive_items, shop_rewards.min_vip_tier  (VIP / XP track)
--   - features/pass, app/carte-vip, components/partners/RetailPartnerForm
--     (VIP card pass concept, different namespace)
--   - ambassadors.tier  (ambassador track)

BEGIN;

-- =========================================================================
-- 1. Drop legacy CHECK constraints first so UPDATE statements are not blocked.
--    The pre-existing plan_type CHECK hardcoded ('starter','pro','elite',...).
--    There was no tier CHECK; we add a strict one at the end.
-- =========================================================================

ALTER TABLE public.subscription_plans
  DROP CONSTRAINT IF EXISTS subscription_plans_plan_type_check;

ALTER TABLE public.subscription_plans
  DROP CONSTRAINT IF EXISTS subscription_plans_tier_check;

-- =========================================================================
-- 2. Rewrite subscription_plans rows to canonical tier vocabulary
--    starter -> silver, pro -> gold, elite -> platinum
--    (preserve UUIDs; only rewrite code/name/name_ar/plan_type/tier)
--    Idempotent: each UPDATE no-ops if already migrated.
-- =========================================================================

UPDATE public.subscription_plans
SET code      = 'silver',
    name      = 'Argent',
    name_ar   = 'فضي',
    plan_type = 'silver',
    tier      = 'silver',
    updated_at = now()
WHERE code = 'starter';

UPDATE public.subscription_plans
SET code      = 'gold',
    name      = 'Or',
    name_ar   = 'ذهبي',
    plan_type = 'gold',
    tier      = 'gold',
    updated_at = now()
WHERE code = 'pro';

UPDATE public.subscription_plans
SET code      = 'platinum',
    name      = 'Platine',
    name_ar   = 'بلاتيني',
    plan_type = 'platinum',
    tier      = 'platinum',
    updated_at = now()
WHERE code = 'elite';

-- "family" plan: KEEP for now (founder-review pending). Just normalize the
-- French spelling. Whitepaper §10 has no "family" tier; the row is flagged
-- as non-canonical and may be dropped/folded into a `gold + family_pack`
-- variant after founder decision.
UPDATE public.subscription_plans
SET name      = 'Famille',
    name_ar   = 'عائلة',
    -- keep code='family', tier='family', plan_type='family' for now
    updated_at = now()
WHERE code = 'family';

-- =========================================================================
-- 3. Re-add CHECK constraints with the canonical vocabulary
--    (allow 'family','school','lifetime' as legacy/edge values that exist
--     in seed migrations 027 / 029 — they remain valid plan_types).
-- =========================================================================

ALTER TABLE public.subscription_plans
  ADD CONSTRAINT subscription_plans_plan_type_check
  CHECK (plan_type IN (
    'free','silver','gold','platinum',
    'family','school','lifetime'
  ));

ALTER TABLE public.subscription_plans
  ADD CONSTRAINT subscription_plans_tier_check
  CHECK (tier IN ('free','silver','gold','platinum','family'));

-- =========================================================================
-- 4. parent_subscription_view — single source of truth for the parent's
--    current tier, joining the FK chain
--    family_subscriptions.owner_id  (=parent profile id)
--      -> user_subscriptions.id     (subscription_id)
--      -> subscription_plans.id     (plan_id)
--      -> subscription_plans.tier
--
--    Exposes the contract the whitepaper §10 expected on
--    `family_subscriptions(parent_id, tier, status)` without breaking the
--    normalized FK shape. Replaces the broken read in
--    lib/auth/get-user-role.ts which queried a nonexistent
--    `family_subscriptions.tier` column.
-- =========================================================================

DROP VIEW IF EXISTS public.parent_subscription_view;

CREATE VIEW public.parent_subscription_view AS
SELECT
  fs.owner_id              AS parent_id,
  fs.id                    AS family_subscription_id,
  us.id                    AS user_subscription_id,
  sp.id                    AS plan_id,
  sp.code                  AS plan_code,
  sp.tier                  AS tier,
  us.status                AS status,
  us.current_period_end    AS current_period_end,
  us.cancel_at_period_end  AS cancel_at_period_end,
  fs.max_members           AS max_members,
  fs.family_name           AS family_name
FROM public.family_subscriptions fs
JOIN public.user_subscriptions  us ON us.id = fs.subscription_id
JOIN public.subscription_plans  sp ON sp.id = us.plan_id;

COMMENT ON VIEW public.parent_subscription_view IS
  'Canonical parent-subscription read model. Joins family_subscriptions -> user_subscriptions -> subscription_plans so callers can read (parent_id, tier, status) directly. Replaces the broken family_subscriptions.tier read in lib/auth/get-user-role.ts.';

GRANT SELECT ON public.parent_subscription_view TO authenticated;
GRANT SELECT ON public.parent_subscription_view TO service_role;

COMMIT;
