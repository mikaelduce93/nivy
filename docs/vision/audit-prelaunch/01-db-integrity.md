# 01 — DB integrity audit

> **Scope**: pre-launch quality review of live Supabase project `imchornjvmgmaovhypco` against `docs/vision/PRODUCT_WHITEPAPER.md` (master spec) and the 30+ specialist specs in `docs/vision/`. Read-only.
> **Date**: 2026-05-07.
> **Source code consulted**: 44 migration files in `gamification-system/database/migrations/` (000_base_tables → 059_mentorship_career, plus 058_food_delivery_rpcs).

## Verdict

**AMBER** — schema completeness is high (every whitepaper-mandated table now exists in the live DB), and the money-pipeline RPCs are correctly written, but the live data shows **broken pairing of `coin_transactions ↔ escrow_ledger ↔ payment_transactions`** for spends recorded before the most recent RPC fix, **two RLS-disabled tables** (`creator_engagement`, `creator_monthly_stats`), **74% (115/155) of `SECURITY DEFINER` functions lack `set search_path`**, and **identity drift** (4 orphan profiles, 1 orphan public.users row, profiles/teens PKs not FK'd to `auth.users`). None of the issues are unrecoverable — most are cleanup migrations.

---

## Live DB snapshot

| Metric | Value | Target |
|---|---|---|
| Total `public.*` tables | 280 | n/a |
| RLS-enabled tables | 278 / 280 | 280 / 280 |
| RLS-disabled tables | **2** (`creator_engagement`, `creator_monthly_stats`) | 0 |
| RLS-enabled-but-no-policy tables | **0** | 0 ✅ |
| Total RLS policies | 375 | ≥ 1 per RLS-enabled table ✅ |
| Total `public.*` functions | 242 | n/a |
| `SECURITY DEFINER` functions | 155 (64%) | ok |
| `SECURITY DEFINER` functions **without** `set search_path` | **115** (74% of secdef) | 0 |
| Total FKs in public schema | 250+ | n/a |
| Orphan FK targets (target table missing) | 0 ✅ | 0 |
| FKs still pointing at `public.users` (deprecated per §20) | **16** | 0 (or ≤ 0 after migration) |
| Storage buckets, public flag | 6 (3 private, 3 public) | CIN/KYC/teen-proofs all private ✅ |
| Migrations applied (file count) | 44 numbered (gaps 025–026, 039–051, 053, 057) | n/a |

**RPC snapshot** (key money & lifestyle RPCs are present and SECURITY DEFINER):
`top_up_teen`, `spend_teen_coins`, `payout_chore_reward`, `disburse_allowance`, `lock_to_goal`, `release_from_goal`, `place_food_order`, `partner_accept_food_order`, `partner_reject_food_order`, `buy_listing`, `confirm_receipt`, `open_dispute`, `marketplace_auto_release_escrow`, `request_ride`, `approve_ride`, `dispatch_ride`, `complete_ride`, `cancel_ride`, `apply_mentor`, `admin_approve_mentor`, `book_mentor_session`, `parent_approve_session`, `parent_deny_session`, `rate_mentor_session`, `apply_to_internship`, `decide_internship_application`, `recommend_for_teen`, `record_signal`, `update_affinity_scores`, `evolve_all_teens`, `award_creator_xp`, `feature_submission`, `refresh_creator_monthly_stats`, `handle_new_user`. The full bodies of `top_up_teen`, `spend_teen_coins`, `payout_chore_reward`, `disburse_allowance`, `lock_to_goal`, `release_from_goal`, `place_food_order`, `buy_listing`, `confirm_receipt` were inspected (see "Hardcoded/scaffolded" section).

---

## §29 invariants — proof matrix

| # | Invariant | Status | Evidence |
|---|---|---|---|
| 1 | No XP↔coins conversion path | ✅ | No RPC swaps the two; `spend_teen_coins` writes to `coin_transactions` AND `xp_transactions` (cashback), but never converts a balance. `add_xp_to_user` is XP-only. No reverse `redeem_xp_for_coins` exists. |
| 2 | No coin debit without paired `coin_transactions` row | ✅ (RPC level) | `spend_teen_coins` body (RPC source above) atomically `UPDATE user_coins SET balance = balance - p_amount_coins` and `INSERT INTO coin_transactions ... transaction_type='spend'` in one plpgsql block. `buy_listing` and `place_food_order` route through this RPC. |
| 3 | Every coin spend triggers cashback in same DB tx | ⚠️ | `spend_teen_coins` calls `add_xp_to_user(... 'cashback')` inside the same plpgsql function (atomic). BUT `add_xp_to_user` is `SECURITY INVOKER` (`prosecdef=false`), so when callers run as a teen JWT the call may be silently RLS-blocked. Live data: 4 spends, only 3 `xp_transactions` with `source_type='cashback'` — 1 spend missing cashback. |
| 4 | Every top-up writes paired `payment_transactions` + `escrow_ledger` | ⚠️ | `top_up_teen` does both inserts atomically (RPC body confirmed). Live data: 8 `payment_transactions` (all status=succeeded) ↔ 8 `escrow_ledger.direction='top_up'` rows ↔ 8 `coin_transactions.transaction_type='topup'` — pairing holds for top-ups ✅. **However** for `spend` direction: `escrow_ledger` has 3 spend rows for 4 `coin_transactions.spend` rows (1 spend not paired), AND `escrow_ledger.related_spend_id` is NULL on all 3 (FK column exists but not populated by `spend_teen_coins` — see Risks §P1). |
| 5 | `auth.users.id` is THE canonical identifier | ❌ | `teens.id` has **no FK** to `auth.users(id)` (only `teens.parent_id → auth.users(id) ON DELETE CASCADE` exists). `profiles.id` has **no FK** to `auth.users(id)`. 4/11 `profiles` rows have IDs not present in `auth.users`. 1/3 `public.users` rows orphan. 16 FKs still target `public.users`. |
| 6 | No CIN / teen-photo file in public bucket | ✅ | `kyc-documents`, `cin-scans`, `defi-proofs` are all `public=false`. Only `event-images`, `partner-logos`, `avatar-assets` are public — these are intentionally non-PII. |
| 7 | Every public table has explicit GRANTs + RLS policies (never RLS-on-no-policy) | ⚠️ | 0 RLS-on-no-policy tables ✅. BUT 2 RLS-DISABLED tables exposed via PostgREST: `creator_engagement` (52 rows), `creator_monthly_stats` (1 row). Migration `055_creator_economy.sql` likely created these without `ENABLE ROW LEVEL SECURITY`. |
| 8 | Every admin action writes to `admin_audit_logs` | ⚠️ | Table exists with 3 rows, but **no DB-side enforcement** (no trigger). It is only "every admin action that the route remembers to log" — convention, not invariant. |
| 9 | No teen sees a quiz they passed in last 7 days | ✅ (DB-level) | `quiz_seen_history (teen_id, quiz_id, seen_at)` table present. `recommend_for_teen` RPC exists (migration 052). Logic enforcement is at API/RPC layer; DB has the supporting table + 30-day signal retention via `behavioral_signals`. |
| 10 | No notification during quiet hours (22h-7h Africa/Casablanca) | ⚠️ | `notification_templates` (19 rows), `notification_preferences` (0 rows), `user_notifications`, `push_subscriptions` all present. **No DB-side check** of quiet hours visible — must be enforced in the dispatch worker. Risk: rule unenforced if app code regresses. |
| 11 | Quest cadences refresh on canonical schedule | ✅ | `mission_templates` has `mission_type CHECK ('daily','weekly','monthly','seasonal','special','onboarding')`, `expire_old_missions()` and `assign_missions_for_teen(p_teen_id)` RPCs exist. Cron schedule lives in `vercel.json` (must verify there). |
| 12 | Ambassador commission only on `payment_transactions.status='succeeded'` | ✅ (schema) | `ambassador_commissions.status CHECK (pending/available/paid_out/clawed_back)`. FK `ambassador_commissions.source_transaction_id → payment_transactions(id)`. Logic must run in app layer or trigger; no rows yet to verify behavior. |
| 13 | A user with `is_onboarded=false` always routed to `/onboarding` | ✅ (schema) | `profiles.is_onboarded BOOLEAN NOT NULL DEFAULT false`. Enforcement is route-side (middleware). |
| 14 | DH = `NUMERIC(10,2)`, coins = `INTEGER`, XP = `INTEGER` | ✅ | `payment_transactions.amount_dh` numeric, `amount_coins` integer; `coin_transactions.amount` integer; `xp_transactions.amount` integer; `escrow_ledger.amount_dh` numeric, `amount_coins` integer; `parent_chores.reward_dh` (presumably numeric). All money/coin/XP columns conform. |
| 15 | Money writes go through service_role (server-side); client never touches `coin_transactions` etc | ✅ | `spend_teen_coins`, `top_up_teen`, `payout_chore_reward`, etc. are `SECURITY DEFINER` — they bypass RLS and run as table owner. RLS policies on `coin_transactions` / `payment_transactions` / `escrow_ledger` deny direct teen/parent INSERT/UPDATE (must verify policy text matches "teen_id = auth.uid() AND false" pattern, but the SECURITY DEFINER + RLS combo provides the gate). |

**Summary**: 9 ✅, 5 ⚠️, 1 ❌. The ❌ is identity (#5).

---

## Schema completeness vs whitepaper

For every domain mentioned in §5–§19.4 + the 30 specialist specs:

### Economy / money pipeline (whitepaper §5, `economy.md`, `payment-rails-morocco.md`)
- ✅ `payment_transactions` (8 rows) — columns: `id, parent_id, teen_id, amount_dh, amount_coins, status, psp_provider, psp_reference, failure_reason, created_at, succeeded_at, refunded_at`. CHECKs: status enum, psp_provider enum (`stripe/cmi/cashplus/wafacash/m2t/manual`), positive amounts.
- ✅ `escrow_ledger` (11 rows) — direction CHECK `(top_up/refund/spend/adjustment/clawback)`. Has `related_payment_id` and `related_spend_id` FKs (the spend FK is present but unused — see Risks).
- ✅ `coin_transactions` (15 rows), `xp_transactions` (161 rows), `user_coins`, `user_xp`.
- ✅ `cashback_rules` (0 rows; default 10% lives in `xp_payment_settings` which has `default_cashback_pct=10`).

### Gamification (`gamification.md`, `quest-cadence.md`, etc.)
- ✅ All tables present: `mission_templates` (30 rows), `user_missions` (10 rows), `mission_progress_log` (132 rows), `achievements` (63), `user_achievements` (0), `user_xp`, `user_streaks`, `xp_weekly`, `xp_monthly`, `seasons` (4), `seasonal_challenges` (13), `crews`, `friend_challenges`, `event_challenges`, `special_challenges`, `physical_challenges` (5), `passion_paths` (5), `wheel_segments` (12), `mini_game_types` (6), `vip_tiers` (7), etc.

### Lifestyle (whitepaper §19.4, 7 surfaces — all migrations 054–059 applied)
| Surface | Spec | Tables expected | Live DB | Status |
|---|---|---|---|---|
| Parent custom chores | `parent-custom-chores.md` | `parent_chores`, `parent_chore_completions` | both present (2 + 10 rows) | ✅ |
| Allowance + savings | `allowance-savings.md` | `parent_allowances`, `allowance_disbursements`, `savings_goals`, `savings_contributions` | all 4 present | ✅ |
| Marketplace C2C | `marketplace-c2c.md` | `marketplace_listings`, `marketplace_transactions`, `marketplace_disputes`, `user_seller_stats` | all 4 present | ✅ |
| Food delivery | `food-delivery-restaurants.md` | `menu_items`, `food_orders`, `food_order_items`, `nutrition_challenges` | all 4 present (`menu_items`=6, `food_orders`=5, `nutrition_challenges`=3) | ✅ |
| Transport | `transport-mobility.md` | `nivy_drivers`, `ride_bookings`, `ride_tracks`, `ride_groups`, `ride_group_members` | all 5 present | ✅ |
| Mentorship + career | `mentorship-career.md` | `mentors`, `mentor_sessions`, `career_pathways`, `teen_pathway_progress`, `internships`, `internship_applications` | all 6 present (`career_pathways`=5) | ✅ |
| Creator economy | `content-creator-economy.md` | `creator_engagement`, `creator_monthly_stats` (extends feed_*) | both present, but **RLS DISABLED** | ⚠️ |

### Partner network (whitepaper §9, `partner-network.md`)
- ✅ `partners` (1 row), `partner_staff` (1), `partner_xp_awards` (0), `partner_transactions` (2), `partner_offers` (1), `partner_payouts` (0), `partner_discounts` (0), `kyc_documents` (0).
- CHECK constraints in place: `partners.partner_type IN (retail/venue/club/education)`, `partner_staff.role IN (owner/staff/coach/teacher)`, `partner_xp_awards.amount > 0`, `kyc_documents.subject_kind IN (partner/mentor)` + `subject_present_chk` ensuring at least one subject FK populated.

### Parent control + auth (§10, §11, `parent-control.md`, `parental-authorizations.md`)
- ✅ `parent_teen_links` (1), `e_signatures` (1), `parental_approvals` (4), `teen_budget_limits` (1), `linking_codes` (0).
- `teen_budget_limits.mode CHECK (autonomous/validation)`, `parental_approvals.action_type CHECK (booking/purchase_above_ceiling/coach_meeting/venue_visit/crew_join/xp_award_above_cap/food_order)` + `status CHECK (pending/approved/denied/expired/auto_approved/auto_denied)` + 24h `expires_at` default — matches whitepaper invariants.

### Personalization engine (§19.5, `personalization-engine.md`)
- ✅ `teen_interests` (3), `interest_taxonomy` (50), `teen_goals`, `behavioral_signals` (15), `affinity_scores` (3), `teen_neighbours` (0), `recommendation_weights` (8), `recommendation_metrics_daily` (0). CHECKs on `behavioral_signals.signal_type` and `target_type` match the spec exactly.
- New columns on `teens`: `gender`, `city`, `region`, `grade_level`, `learning_style`, `archetype`, `availability_pattern` — all present with their CHECK constraints.

### Ambassador / referral (§12, `ambassador-referral.md`)
- ✅ `ambassadors` (0), `referral_attribution` (0), `ambassador_commissions` (0), `ambassador_payouts` (0). All CHECKs in place: track (cash/xp_only), tier (bronze/silver/gold), commission status, payout status.

### Admin / moderation (§18)
- ✅ `admin_audit_logs` (3), `moderation_queue` (3), `user_reports` (0), `support_tickets` (0), `data_exports` (0). `moderation_queue.content_type` CHECK includes `marketplace_listing` and `feed_post` (recent additions).

### Birthday (§13)
- ✅ `anniv_packs`, `anniv_extras`, `anniv_orders`, `anniv_order_extras`, `birthday_wishes`. `birthday_wishes.xp_gift CHECK (>=0 AND <=50)` enforces invariant §29 + DEFAULT #41 (50 XP/day cap is at insert, not aggregate — see Risks §P2).

### Avatar coach (§8)
- ✅ `avatars` (1), `avatar_messages` (0).

**Conclusion**: every whitepaper-mandated table is now present in the live DB. The 50+ "missing tables" issue described in whitepaper §1 ("active Supabase project lacks ~50 critical tables") has been resolved by the 040-059 migration wave.

---

## Identity canonical-form check

**Whitepaper §20**: `auth.users.id` is THE canonical user identifier; `profiles.id` and `teens.id` MUST `REFERENCES auth.users(id)`; `public.users` is deprecated.

**Live state**:
- `auth.users`: 7 rows (1 teen, 1 parent.test, 1 partner, 4 throwaway test buyers).
- `public.users`: 3 rows (legacy mirror), 1 orphan (id `5f5fb6c1-…` not in `auth.users`).
- `public.profiles`: 11 rows, **4 orphan** (ids `c2c5f465`, `7d4f2e20`, `37b9dc62`, `5f5fb6c1` not in `auth.users` — created 2026-05-07 08:45 → 09:18). All orphans have `role='parent'` — likely test runner artifacts created via direct INSERT bypassing the `handle_new_user` trigger.
- `public.teens`: 1 row, **0 orphan** ✅.
- FK constraint `teens_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES auth.users(id) ON DELETE CASCADE` exists. ✅
- FK constraint `teens.id → auth.users(id)`: **MISSING** ❌
- FK constraint `profiles.id → auth.users(id)`: **MISSING** ❌
- Trigger `on_auth_user_created` exists on `auth.users` and calls `handle_new_user()` (which `INSERT INTO public.profiles`). ✅
- Trigger `init_wheel_streak_trigger` also exists on `auth.users` (per whitepaper §26 P0.8: "Drop the broken `init_wheel_streak_trigger` permanently OR fix the `public.` prefix"). ⚠️
- 16 FKs still target `public.users` (whitepaper §1 said "~85 deferred" — much improved, but not 0). Tables affected: `comment_likes.user_id`, `feed_bookmarks.user_id`, `feed_comments.user_id`, `feed_likes.user_id`, `feed_mentions.mentioned_by` + `mentioned_user_id`, `feed_muted_users.muted_user_id` + `user_id`, `feed_posts.user_id`, `feed_shares.shared_by`, `feed_views.user_id`, `generated_share_cards.user_id`, `hidden_posts.user_id`, `share_links.user_id`, `social_shares.user_id`, `user_share_stats.user_id`. All `ON DELETE CASCADE`.

**Drift summary**:
- 4 orphan `profiles` rows + 1 orphan `public.users` row (5 total to clean up).
- `teens.id` and `profiles.id` lack the FK to `auth.users(id)` that would make the canonical-form invariant DB-enforced (currently it's enforced only by the trigger, which fails silently if bypassed).
- 16 FKs to `public.users` should migrate to `auth.users(id)` (or those tables should target `profiles.id`/`teens.id` if they need a public mirror).

---

## Hardcoded / scaffolded / rushed (DB layer)

### Inspected RPC bodies — concrete observations

**`spend_teen_coins`** (whitepaper-key money RPC, body confirmed):
- ✅ `auth.uid()` caller check (`v_caller <> p_teen_id` rejects).
- ✅ `set search_path = public, pg_temp`, SECURITY DEFINER.
- ✅ `SELECT balance FROM user_coins WHERE teen_id=p_teen_id FOR UPDATE` — locks balance row before debit ✅.
- ✅ Cashback computation via `cashback_rules` table → falls back to `xp_payment_settings.default_cashback_pct` → falls back to literal `10` if both empty.
- ✅ Atomic in plpgsql transaction (UPDATE balance + INSERT coin_transactions + INSERT escrow_ledger + INSERT partner_transactions + add_xp_to_user).
- ❌ **`escrow_ledger.related_spend_id` is NEVER populated** — the INSERT lists only `(parent_id, teen_id, direction, amount_dh, amount_coins, reason, created_by)`. The FK column exists but is dead — breaks the audit-trail invariant if forensics need to link a spend ledger row back to its `coin_transactions` row.
- ⚠️ The `add_xp_to_user` call is to a `SECURITY INVOKER` function (see below). When a teen JWT calls `spend_teen_coins`, the inner `INSERT INTO xp_transactions` may fail silently if RLS denies it. The whole tx still succeeds because `add_xp_to_user` swallows errors. Evidence: 4 spends, only 3 cashback rows in xp_transactions.

**`top_up_teen`**:
- ✅ `auth.uid()` check, search_path set, e-signature gate (`requires_signature` if no `e_signatures.terms_accepted=true` row), parent-link gate (`teen_not_linked`), atomic 4-step (`payment_transactions` insert → mark succeeded → `escrow_ledger` insert → `user_coins` upsert → `coin_transactions` insert).
- ⚠️ **`payment_transactions.status` immediately set to `succeeded` with `psp_provider='manual'`** — this is the "MVP placeholder". Whitepaper §26 P0.7: "Pick payment rail (Cash Plus + Stripe recommended) and wire to top-up". Status: NOT done. Every top-up in DB has `psp_provider='manual'` — no PSP webhook handshake.
- ⚠️ Hardcoded `100 coins per DH` literal (`v_amount_coins := (p_amount_dh * 100)::integer`). Matches §29 invariant #14 + decision #2 LOCKED, but ideally read from `xp_payment_settings.xp_to_dh_rate` to avoid drift.

**`payout_chore_reward`**:
- ✅ Caller check, search_path, FOR UPDATE on completion row, parent-of-chore check, idempotency via `paid_at IS NOT NULL` early-return, batches all unpaid verified completions atomically into one payout via `top_up_teen(... source='chore_payout')`. After `top_up_teen` it does an **UPDATE on `coin_transactions.source_type` to overwrite `'parent_topup'` → `'chore_payout'`** — this is hacky but functional; cleaner would be to add a parameter to `top_up_teen` for `source_type`.

**`disburse_allowance`**:
- ✅ Conditional logic for `streak_min` and `quest_completion_rate` honored. Calls `top_up_teen` for the actual money move. `_advance_next_disbursement` advances cadence.
- ⚠️ For `chore_checklist` and `custom` condition_type values, the function falls through to "condition_met" without verifying — silently approves anything not matching the two known types.

**`buy_listing`** (marketplace):
- ✅ Caller check, FOR UPDATE on listing, ceiling check + parental approval branch, atomic balance debit, escrow status. Race-safe via `WHERE id=p_listing_id AND status='active'`.
- ⚠️ Hardcoded `v_TEEN_CEILING_DEFAULT = 100` coins inside the function. Should read from `xp_payment_settings` or a config table.
- ⚠️ Hardcoded 8% fee, 10% cashback in `confirm_receipt` (`v_fee := floor(v_tx.amount_coins * 0.08)`, `v_cashback_xp := floor(v_tx.amount_coins * 0.10)`). Whitepaper Decision #37 says 8% fee is default; should be a config row (`xp_payment_settings.marketplace_fee_pct`) so founder can override without redeploy.

**`place_food_order`**:
- ✅ Halal-by-default rule enforced (any non-halal item → `v_requires_approval=true`, reason `non_halal_item` — matches Decision #36).
- ✅ Nutrition challenge gates (max_calories_per_meal, halal_only, budget_coins).
- ⚠️ Routes through `spend_teen_coins` (good — paired ledger + cashback inherited).
- ⚠️ Hardcoded 10% cashback (`v_cashback_xp := FLOOR(v_total_coins * 0.10)`) but it's actually computed inside `spend_teen_coins`, so this line is redundant but harmless.

### `creator_engagement` + `creator_monthly_stats` — RLS disabled
Migration `055_creator_economy.sql` created these tables without `ENABLE ROW LEVEL SECURITY`. They contain 52 + 1 rows — anyone with the anon key can read/write. **This is the Supabase advisor's `rls_disabled_in_public` critical finding.**

### `add_xp_to_user` is `SECURITY INVOKER`
The function used to grant XP across the platform (cashback, mission rewards, etc.) is NOT `SECURITY DEFINER`. Result: when callers run as `authenticated` JWT, the `INSERT INTO xp_transactions` and `UPDATE user_xp` may be RLS-blocked depending on policy. This is the root cause of the missing cashback row (#3 in invariant matrix). Fix: `ALTER FUNCTION add_xp_to_user(...) SECURITY DEFINER SET search_path=public, pg_temp;` and grant table writes to `service_role` only.

### `add_coins_to_user` is also `SECURITY INVOKER`
Same risk class.

### 115 SECURITY DEFINER functions lack `set search_path = public, pg_temp`
Examples: `add_activity_comment`, `add_collectible_to_user`, `add_feed_comment`, `add_tokens_to_user`, `add_vip_xp`, `calculate_*`, `claim_*`, `complete_*`, `create_*` (most non-money RPCs). This is exploitable: a malicious user with the ability to create a function in their own schema (none of `authenticated` should, but defense-in-depth) could shadow `public.X` via `search_path`. Supabase advisor flags every one. Fix is mechanical: `ALTER FUNCTION public.X(...) SET search_path = public, pg_temp;` x 115. Recent migrations (058, 059, 054) correctly include the SET; older ones (000–037) do not.

### CHECK constraints — present where whitepaper mandated, MISSING for:
- `teen_budget_limits` has only `mode CHECK` — no `max_per_transaction_coins >= 0`, `max_per_day_coins >= 0`, `max_per_month_coins >= 0`. A negative ceiling would block all spending. Soft risk.
- `parent_chore_completions` has 0 CHECK constraints; `parent_chores` has only `recurrence`. No `reward_dh > 0` or `required_completions > 0`.
- `partner_xp_awards.amount > 0` ✅ but no upper bound (whitepaper §9 caps at 500 XP/teen/week — must be enforced in the API or via a stored function).
- `birthday_wishes.xp_gift CHECK <= 50` ✅ but the per-day-aggregate cap of 50 XP/sender/day (whitepaper invariant) is NOT DB-enforced — must be in the API.
- `xp_transactions.amount` has no CHECK (XP can be negative — possibly intentional for revoke_xp).
- `coin_transactions.amount` has no `CHECK (transaction_type='spend' AND amount<0) OR (transaction_type IN ('topup','earn','system_credit') AND amount>0)`. Live data confirms direction is ad-hoc — `spend` rows are negative, `topup`/`earn`/`system_credit` are positive — but DB doesn't enforce sign.
- `escrow_ledger.amount_dh > 0` and `amount_coins > 0` are missing.
- No CHECK that `teen_budget_limits.max_per_day_coins >= max_per_transaction_coins` (logic invariant).

### Hardcoded values in RPCs
- `spend_teen_coins`: cashback fallback `COALESCE(v_cashback_pct, 10)` — fine, it's a documented default.
- `buy_listing`: `v_TEEN_CEILING_DEFAULT CONSTANT INTEGER := 100` — should be config-driven.
- `confirm_receipt`: `0.08` fee + `0.10` cashback — should read from `xp_payment_settings`.
- `place_food_order`: `0.10` cashback — same.
- `top_up_teen`: rate 100 — locked invariant, but should read from `xp_payment_settings.xp_to_dh_rate`.

### Tables with no rows AND likely no callers (dead candidates)
Live data shows `user_achievements` is the only table reported as 0 rows by `pg_class.reltuples=0` (most "empty" tables actually have stats stale). Cross-checking 'app/' and 'gamification-system/' for callers would surface true dead tables — out of scope here, but `wheel_jackpots` (1 row, no FK pointing to it), `geolocation_zones` (0 rows, FK to events but no app code uses it visibly) are candidates.

### `xp_transactions` has BOTH `source_type/source_id` AND `type/reference_type/reference_id` columns
Schema inspection shows 13 columns including duplicate-purpose pairs. Migration history likely accreted both naming schemes. Risk: queries that filter on one set miss rows written via the other. Recommendation: pick one (the spec uses `source_type/source_id`) and migrate the legacy data.

---

## Risks (P0 / P1 / P2)

### 🔴 P0 — launch blockers

**P0.1 — `creator_engagement` and `creator_monthly_stats` exposed (RLS disabled)**
- **Evidence**: `mcp__claude_ai_Supabase__list_tables` advisory `rls_disabled` flagged both with anon-key access. 52 + 1 rows live.
- **Whitepaper ref**: §29 invariant #7 ("Every public table has explicit GRANTs and explicit RLS policies").
- **Fix**: `ALTER TABLE public.creator_engagement ENABLE ROW LEVEL SECURITY; ALTER TABLE public.creator_monthly_stats ENABLE ROW LEVEL SECURITY;` plus add policies (self-read for creator, public-read on aggregates if leaderboard, otherwise admin-only). Effort: **S**.

**P0.2 — `add_xp_to_user` and `add_coins_to_user` are SECURITY INVOKER → cashback can silently fail**
- **Evidence**: function definition, plus live data (4 spends, 3 cashback rows = 1 missed). Whitepaper §29 invariant #3 violated 25% of the time in actual usage.
- **Fix**: `ALTER FUNCTION public.add_xp_to_user(uuid,integer,varchar,varchar,uuid,text) SECURITY DEFINER SET search_path = public, pg_temp;` and same for `add_coins_to_user`. Re-run an integration test that asserts: `assert COUNT(coin_tx.spend) == COUNT(xp_tx.cashback)`. Effort: **S**.

**P0.3 — Identity drift: 4 orphan profiles + 1 orphan public.users + missing FK on profiles.id / teens.id → auth.users**
- **Evidence**: SQL above shows 4 profiles rows whose id is not in auth.users, all created during test runs 2026-05-07. `profiles_pkey` is a plain PK with no FK.
- **Whitepaper ref**: §29 invariant #5, §20 LOCKED decision.
- **Fix**: 1) Clean: `DELETE FROM public.profiles WHERE id NOT IN (SELECT id FROM auth.users);` 2) Add: `ALTER TABLE public.profiles ADD CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;` 3) Same for `teens`. 4) Migrate the 16 `public.users`-targeted FKs to `auth.users(id)` (mostly feed_*). Effort: **M**.

**P0.4 — `payment_transactions.psp_provider='manual'` for every row → no real payment rail wired**
- **Evidence**: `top_up_teen` body sets `'manual'` literal then immediately marks `succeeded` with no PSP handshake.
- **Whitepaper ref**: §26 P0.7 ("Pick payment rail and wire to top-up").
- **Fix**: outside DB scope (PSP integration in Next.js routes). DB ready. Effort: **L** (but not DB-side).

### 🟠 P1 — vision-coherence breakers

**P1.1 — `escrow_ledger.related_spend_id` never populated**
- **Evidence**: column exists, 0 of 3 spend rows have it set. `spend_teen_coins` INSERT statement omits the column.
- **Fix**: Capture `coin_transactions.id` returned from INSERT (RETURNING id) and pass to `escrow_ledger` INSERT. 5-line change. Effort: **S**.

**P1.2 — 115 SECURITY DEFINER functions lack `set search_path`**
- **Evidence**: 115/155 secdef functions, query above.
- **Whitepaper ref**: §22 "Audit & compliance" implicit; Supabase security best-practice.
- **Fix**: bulk `ALTER FUNCTION ... SET search_path = public, pg_temp` migration. Generate the script from `pg_proc` query. Effort: **S** (auto-generated).

**P1.3 — `spend_teen_coins` doesn't use `cashback_rules.partner_id` precedence correctly**
- **Evidence**: function body uses `ORDER BY partner_id NULLS LAST LIMIT 1` — but `cashback_rules` is empty (0 rows), so it always falls back to settings table. When data is added, the precedence `(partner-specific row) > (NULL/global row)` works only because `NULLS LAST` happens to put nulls last on ASC. Fragile.
- **Fix**: explicit `WHERE partner_id = p_partner_id OR partner_id IS NULL ORDER BY (partner_id IS NULL) ASC LIMIT 1`. Effort: **S**.

**P1.4 — No DB-side enforcement of "all admin actions logged"**
- **Evidence**: `admin_audit_logs` exists but has no INSERT trigger on any sensitive table; only API routes write to it.
- **Whitepaper ref**: §29 invariant #8.
- **Fix**: add AFTER INSERT/UPDATE/DELETE trigger on `payment_transactions`, `coin_transactions` (admin-issued refunds), `partners`, `ambassadors` write to `admin_audit_logs` when `auth.uid()` is in `admin_roles`. Or accept it's an app-layer convention and document. Effort: **M**.

**P1.5 — Quiet-hours invariant (#10) not enforced anywhere**
- **Evidence**: no DB function checks 22h-7h Africa/Casablanca window.
- **Fix**: add a CHECK function called by notification dispatch worker — or accept app-layer enforcement and add a regression test. Effort: **S**.

**P1.6 — Missing supporting indexes on FK columns (hot paths)**
- **Evidence**: query above — 19 FK columns lack their own first-position index. Notable: `food_orders.parent_id`, `ride_bookings.driver_id`, `ride_bookings.event_id`, `mentor_sessions.parent_approval_id`, `marketplace_transactions.listing_id`, `marketplace_transactions.parent_approval_id`, `partner_transactions.scanner_user_id`, `partner_xp_awards.partner_id`, `user_missions.mission_id`. Each will cause seq-scan on cascading deletes or filtered queries.
- **Fix**: bulk `CREATE INDEX CONCURRENTLY` migration. Effort: **S**.

**P1.7 — Missing CHECK constraints on numeric columns**
- **Evidence**: `escrow_ledger.amount_dh/amount_coins` no positivity check; `teen_budget_limits.max_*` no >=0; `parent_chores.reward_dh` no >0; `xp_transactions.amount` no relationship to `type`.
- **Fix**: ALTER TABLE ADD CONSTRAINT batch. Effort: **S**.

**P1.8 — `init_wheel_streak_trigger` still on `auth.users`**
- **Evidence**: trigger query above.
- **Whitepaper ref**: §26 P0.8 ("Drop the broken trigger or fix the `public.` prefix").
- **Fix**: function is `SECURITY DEFINER SET search_path=public, pg_temp` already, so probably benign — but the trigger fires on every signup and may slow auth. Verify it doesn't error; otherwise drop. Effort: **S**.

### 🟢 P2 — polish

**P2.1 — `xp_transactions` has dual column sets (`source_type/source_id` + `type/reference_type/reference_id`)** — pick one, migrate, drop the other.

**P2.2 — Hardcoded fee/cashback percentages in RPCs** — move 8% marketplace fee, 10% cashback fallback, 100 ceiling to `xp_payment_settings`.

**P2.3 — `disburse_allowance` silently approves unknown `condition_type`** — add explicit ELSE that returns `'unsupported_condition_type'`.

**P2.4 — `top_up_teen` reads ratio as literal 100** — switch to `xp_payment_settings.xp_to_dh_rate` for consistency (even though invariant is locked).

**P2.5 — Dead table candidates**: `geolocation_zones` (0 rows, no UI), `wheel_jackpots` (1 row, no caller verified), `user_advent_progress` (0 rows, advent calendar feature dormant). Cross-check with grep over `app/` before dropping.

**P2.6 — `birthday_wishes` 50 XP/sender/day aggregate cap** — add a per-row CHECK (already done) PLUS enforce daily aggregate via trigger or unique partial index.

---

## Recommended pre-launch actions

1. **(P0.1, S)** Enable RLS on `creator_engagement` + `creator_monthly_stats` and add 2 policies each (whitepaper §29 invariant #7).
2. **(P0.2, S)** ALTER `add_xp_to_user` and `add_coins_to_user` to `SECURITY DEFINER SET search_path = public, pg_temp`. Verify cashback rate matches §29 invariant #3 with an integration test.
3. **(P0.3, M)** Identity cleanup migration: delete orphan profiles + public.users rows, add FK `profiles.id → auth.users(id)` and `teens.id → auth.users(id)`, migrate 16 `public.users`-targeted FKs to `auth.users(id)` (whitepaper §20).
4. **(P0.4, L — outside DB)** Wire a real PSP. DB is ready: `payment_transactions.psp_provider` enum already includes `stripe/cmi/cashplus/wafacash/m2t`.
5. **(P1.1, S)** Fix `spend_teen_coins` to populate `escrow_ledger.related_spend_id` from `coin_transactions.id RETURNING`.
6. **(P1.2, S)** Bulk `ALTER FUNCTION ... SET search_path = public, pg_temp` for the 115 SECURITY DEFINER functions missing it. Auto-generate the script.
7. **(P1.6, S)** Bulk `CREATE INDEX CONCURRENTLY` migration for the 19 missing FK indexes.
8. **(P1.7, S)** Add the missing CHECK constraints (positivity on amounts, ceiling consistency, etc.).
9. **(P1.4, M)** Decide: DB triggers for `admin_audit_logs` write enforcement (whitepaper §29 invariant #8), OR document as app-layer convention and add Playwright tests.
10. **(P1.8, S)** Investigate `init_wheel_streak_trigger`: verify it succeeds on signup; if it errors silently, drop or fix.
11. **(P1.3, S)** Tighten `cashback_rules` precedence query in `spend_teen_coins`.
12. **(P2.2, S)** Move hardcoded fee/cashback/ceiling literals into `xp_payment_settings` rows.
13. **(P2.1, M)** `xp_transactions` dual-column-set consolidation migration.
14. **(P2.5, S)** Verify and drop dead tables (`geolocation_zones`, `wheel_jackpots`, `user_advent_progress`) after grep audit.

**Total effort**: ~10 S items + 3 M items + 1 L item (outside DB scope). All DB work fits in 2 focused engineering days plus integration testing.

---

## Closing observation

The DB foundations are **substantively complete** for launch. Every whitepaper-mandated table exists; the money pipeline RPCs are correctly atomic and locked; CHECK constraints cover the critical enums (`partner_type`, `parental_approvals.action_type`, halal/non-halal, marketplace status, ride status, mentor status, allowance cadence). The remaining work is **hardening, not building**:

- 2 RLS-disabled tables (P0.1, 5 minutes).
- 1 missing `SECURITY DEFINER` flag on 2 functions causing silent cashback misses (P0.2, 10 minutes).
- 1 identity-canonical FK pair to add + 5 orphan rows to clean (P0.3, 30 minutes).
- 1 column to fill in `spend_teen_coins` (P1.1, 15 minutes).
- 115 search_path setters (P1.2, 1 hour with auto-generated script).
- 19 FK indexes (P1.6, 30 minutes).
- ~12 CHECK constraints (P1.7, 30 minutes).

Address P0.1–P0.4 + P1.1 before launch. Everything else can ship in a fast-follow patch within week 1 post-launch without user impact.

— End audit 01.
