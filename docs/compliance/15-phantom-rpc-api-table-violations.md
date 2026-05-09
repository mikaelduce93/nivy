# Phantom RPC / API / table violations

Generated 2026-05-08. References that the canon expects to be wired but the code calls something that doesn't exist (or DB defines tables/RPCs the code never uses). Sources: compliance/03–13, `docs/canon/INDEX.locked.md`, the C5 audit referenced in compliance/00.

## Classification per row

- **MUST IMPLEMENT**: caller is correct, target missing → build target.
- **MUST RENAME**: caller wrong name, target has correct name → fix caller.
- **MUST ALIAS**: target was renamed, keep DB alias to migrate callers gradually.
- **MUST REMOVE CALLER**: caller is legacy, target won't exist → remove dead caller code.
- **MUST MIGRATE DATA**: schema drift, data in old table needs move.
- **UNVERIFIED**: domain MD claimed a phantom but it could not be reproduced in this pass.

---

## Phantom RPCs called by code, not in any migration

Pulled from compliance/04 ECON, 07 GAME, 11 AI, 12 ADMIN, 06 SOCIAL, 08 PARENT, 09 PARTNER, 10 LIFE.

| Caller (file:line) | RPC name | Canon target | Class | Severity |
|---|---|---|---|---|
| `app/api/teen/quests/complete/route.ts:94` | `add_user_xp` | `add_xp_to_user(p_teen_id, p_amount, p_source_type, p_source_category, p_source_id, p_description)` | MUST RENAME | **CLOSED (Wave 1B)** |
| `app/api/auth/validate-teen/route.ts:265-271` | `add_user_xp` | `add_xp_to_user` | MUST RENAME | **CLOSED (Wave 1A)** |
| `app/api/partner/apply-discount/route.ts:188-193` | `add_user_xp` | `add_xp_to_user` | MUST RENAME | **CLOSED (Wave 1B)** |
| `lib/hooks/teen-dashboard.ts:130-132` | `get_user_xp` | (none — read directly via `from('user_xp').select(...).eq('teen_id', userId)`) | MUST REMOVE CALLER | **CLOSED (Wave 2B — comment scrubbed, code already canonical)** |
| `app/api/teen/shop/route.ts:97-138` | `deduct_user_xp` | (legacy rail — 410 the route entirely) | MUST REMOVE CALLER | **CLOSED (Wave 2B — endpoint 410-stubbed, no callers)** |
| `app/api/teen/tokens/route.ts:412-501` | `transfer_tokens`, `spend_tokens`, `add_tokens_to_user`, `claim_daily_bonus` | (kill the entire token rail — 410 route) | MUST REMOVE CALLER | P0 |
| `app/api/teen/rides/[id]/cancel/route.ts:23-30` (via `cancel_ride` mig 057:107-117) | `refund_teen_coins` | `refund_teen_coins(p_teen_id, p_amount_coins, p_source_type, p_source_id, p_reason)` SECURITY DEFINER | MUST IMPLEMENT | P0 |
| `app/api/admin/refunds/route.ts:185-200,269-277,347-356,428-437` (uses inline `bumpCoins` helper) | `refund_teen_coins`, `refund_booking`, `refund_food_order`, `refund_marketplace`, `revoke_xp_cashback` | canon §7 economy + canon §5 admin (7 finance RPCs) | MUST IMPLEMENT | P0 |
| `gamification-system/database/migrations/061_wave_b_money_pipeline.sql:721` (food reject reverse path) | `revoke_xp_cashback` | `revoke_xp_cashback(p_teen_id, p_xp_amount, p_source_id)` | MUST IMPLEMENT | P0 |
| Partner scanner v2 — atomic apply (canon §4.2) | `apply_partner_offer(p_offer_id, p_member_user_id, p_purchase_amount, p_idempotency_key, p_nonce, p_qr_exp_unix)` | per canon §4.2 | MUST IMPLEMENT | **CLOSED (Wave 3A — mig 099, RPC live)** |
| Mentor session completion path (no caller — feature half-built) | `complete_mentor_session` | `complete_mentor_session(p_session_id, p_actor_id)` | MUST IMPLEMENT | P1 |
| Featured-creator monthly payout path (no caller — feature half-built) | `pay_featured_creator` | per canon §7 ECON | MUST IMPLEMENT | P1 |
| Parent refund within 14-day window (no caller) | `refund_top_up` | per canon §7 ECON | MUST IMPLEMENT | P0 |
| Savings goal "achieved → withdrawn" UI (CANON-GAME-009) | `withdraw_from_goal(p_goal_id, p_destination, p_metadata)` | per canon §7 GAME / §10 MISSING | MUST IMPLEMENT | **CLOSED (Wave 2B — mig 098, route + UI shipped)** |
| Savings goal release path | `release_savings_goal` | per canon §7 ECON | MUST IMPLEMENT | P1 |
| Cashback config helper | `_cashback_pct` | per canon §7 ECON | MUST IMPLEMENT | P1 |
| Parent approval cascade routes (`/api/parent/approvals/route.ts:63-136`) | `parent_approve_ride`, `parent_approve_purchase`, `parent_approve_food`, `parent_approve_content` | per canon §5 PARENT cascade table (only `parent_approve_session` exists) | MUST IMPLEMENT | P0 |
| Parent panic-suspend (no UI, no RPC) | `parent_panic_suspend` | per canon §11 PARENT MISSING #5 | MUST IMPLEMENT | P1 |
| Single moderation dispatch (4 routes duplicated) | `moderate_content(p_queue_id, p_decision, p_note)` | per canon §3 ADMIN | MUST IMPLEMENT | P1 |
| Driver KYC approval (`app/api/admin/drivers/[id]/approve/route.ts` direct UPDATE) | `admin_approve_driver(p_driver_id)` | per canon §7 ADMIN | MUST IMPLEMENT | P1 |
| Partner offer apply (race-prone JS-side increment, `app/api/partner/apply-discount/route.ts:170-175`) | `apply_partner_offer(...)` SECURITY DEFINER with row lock + nonce insert | per canon §4.2 PARTNER F2/F7 | MUST IMPLEMENT | P0 |
| Partner activation (`/api/admin/partners/[id]/approve` flips status only, no auth.users) | `register_partner` (or canonical `POST /api/admin/partners/[id]/activate` with atomic 6-step) | per canon §4.7 PARTNER + §2 stage 5–7 | MUST IMPLEMENT | P0 |
| Ambassador approval (`components/ambassador-application-form.tsx:51-59` client-side insert) | `approve_ambassador(p_ambassador_id, p_admin_id)` SECURITY DEFINER atomic role+status flip | per CANON-AUTH-009 | MUST IMPLEMENT | P0 |
| Mentor DM gate (`app/api/teen/messages/route.ts`) — never called | `mentor_can_dm_teen(mentor_id, teen_id)` (the RPC exists in mig 064; code just never invokes it) | canon §3 LIFE + §8 #4 | MUST IMPLEMENT (caller; RPC exists) | P1 |
| Mutual friend count, route-level (`app/api/teen/friends/route.ts:60-71`) | `get_mutual_friends_count` (or batch `get_mutual_counts_bulk`) — RPC exists; route hardcodes `mutual: 0` | per CANON-SOCIAL-006 | MUST RENAME / WIRE | P1 |
| `record_signal` daily caps (canonical caps `share ≤ 5/day`, `favorite ≤ 5/day`, `view ≤ 10/min`) | `record_signal(...)` body must enforce per-signal-type caps | per canon §5 AI | UNVERIFIED — RPC body not in repo migrations; caps not visible in `lib/analytics/signals.ts` |
| `recommend_for_teen` impressions persistence (`components/teen/avatar-coach.tsx:122-126`, `app/teen/offres/page.tsx:148-152`) | `content_recommendations` insert (helper exists in `app/api/teen/recommendations/route.ts:80-121`) | per canon §2 AI LOCKED | MUST IMPLEMENT (caller — helper, not RPC) | P1 |
| Pathway milestone advance (no caller) | `advance_pathway_milestone` + `pathway_milestones` table | per canon §4 LIFE / §6 MISSING / §10 D5 | MUST IMPLEMENT | P1 |
| Dispute resolution | `resolve_dispute` | shipped in mig 061 ✓ (PASS — informational) |

---

## Phantom API endpoints called by frontend, no route file

Pulled from compliance/00 / D2 frontend reality audit + cross-checks.

| Caller | URL | Closest existing | Class |
|---|---|---|---|
| `components/share/share-modal.tsx` | `/api/og/share-card` | (none) | MUST IMPLEMENT |
| `components/payment-method-selector.tsx:125` | `/api/payments/cash/register` | `/api/payments/cash/create` | MUST RENAME caller |
| `components/payment-method-selector.tsx:93` | `/api/payments/stripe/create-session` | (none) | MUST IMPLEMENT |
| `components/ticket-actions.tsx:31` | `/api/tickets/generate-wallet-pass` | `/api/tickets/generate-pdf` | MUST RENAME caller |
| Header logout `<form action="/auth/signout">` | `/auth/signout` | (no route file) | MUST IMPLEMENT |
| `components/onboarding/parent-setup-step.tsx:88-99` (calls `auth.signUp` directly) | (canonical: redirect to `/auth/sign-up?source=wizard&tempUserId=...`) | `/auth/sign-up` | MUST REMOVE CALLER (CANON-AUTH-005) |
| Confirm-email page button | `/api/auth/resend-confirmation` | (none) | MUST IMPLEMENT (CANON-AUTH-017) |
| Ambassador share kit links | `/join?ref=CODE` | (none) | MUST IMPLEMENT (CANON-AUTH-016) |
| Teen-link 6-digit code entry | `/auth/link-code` | (none) | MUST IMPLEMENT (CANON-AUTH-015) |
| Magic-link landing for newly-validated teen / partner / mentor / driver | `/auth/set-password` | (none) | MUST IMPLEMENT (CANON-AUTH-025) |
| Partner KYC upload (post-activation) | `POST /api/partner/kyc/upload` | (none) | MUST IMPLEMENT (CANON-PARTNER-009) |
| Partner KYC upload (pre-activation, signed-link) | `/devenir-{archetype}/kyc?token=...` | (none) | MUST IMPLEMENT |
| Partner wizard submit | `POST /api/partners/wizard/submit` | `POST /api/partners/register` (legacy) | MUST RENAME + REWRITE (CANON-PARTNER-001) |
| Partner activation (admin) | `POST /api/admin/partners/[id]/activate` | `POST /api/admin/partners/[id]/approve` (legacy, no auth.users) | MUST IMPLEMENT (CANON-PARTNER-002) |
| Admin partner offer decision | `POST /api/admin/partners/offers/[id]/decision` | (none) | MUST IMPLEMENT (CANON-PARTNER-005) |
| Friends mutation routes (handlers exist as dead code in `app/api/teen/friends/handlers.ts`) | `DELETE /api/teen/friends/[friend_user_id]`, `POST/DELETE /api/teen/friends/[friend_user_id]/block`, `GET /api/teen/friends/search`, `GET /api/teen/discover` | handlers `FriendHandlers.{remove, block, unblock, search}` exist (handlers.ts:235-268, 125-159) | MUST IMPLEMENT route shells (CANON-SOCIAL-007) |
| Comments thread UI | (mounts at `/teen/feed/[id]`) — backend `app/api/teen/feed/comments/route.ts` exists | (UI 0%) | MUST IMPLEMENT (caller is the page) (CANON-SOCIAL-004) |
| Universal report sink | `POST /api/teen/report` | per canon §11 row 12 SOCIAL | MUST IMPLEMENT |
| Mentor DM channel | `POST /api/mentor/dm` (gates via `mentor_can_dm_teen`) | (none) | MUST IMPLEMENT (CANON-LIFE-003/017) |
| Driver candidature submit | `POST /api/driver/apply` | (none) | MUST IMPLEMENT (CANON-AUTH-008) |
| Driver onboarding complete | `POST /api/driver/onboarding/complete` | (none) | MUST IMPLEMENT |
| Per-role onboarding complete (parent, partner, mentor, driver, ambassador) | `POST /api/{role}/onboarding/complete` | only teen exists | MUST IMPLEMENT (CANON-AUTH-006) |
| Parent e-signature persist | `POST /api/parent/e-signature` | only `GET /api/parent/e-signature/status` exists | MUST IMPLEMENT (CANON-AUTH-010) |
| Mentor application form | `POST /api/mentor/apply` exists ✓; candidature page MISSING | (none) | MUST IMPLEMENT page (CANON-AUTH-007) |
| Ambassador application route | `POST /api/ambassador/apply` | client-side insert in `components/ambassador-application-form.tsx` | MUST IMPLEMENT (CANON-AUTH-009) |
| Parent rides live deep-link | `/parent/rides/[id]/live` | only `/parent/rides/[id]` exists | MUST IMPLEMENT (CANON-PARENT-034) |
| Allowance delete | `DELETE /api/parent/allowances/[id]` | (none — but `Trash2` icon imported) | MUST REMOVE CALLER until built (CANON-PARENT-022) |

---

## Phantom tables called by code, no migration

Top phantoms (with file:line). Wider C5-audit-cited ~121 detected — top 30 here.

| Caller (file:line) | Table | Class | Severity |
|---|---|---|---|
| `lib/auth/admin-permissions.ts:165` + 27 others | `admin_audit_logs` (CREATE missing in tree; only indexes added in 068) | MUST MIGRATE DATA → `audit_log` (singular) | P0 |
| `app/api/teen/feed/comments/route.ts:298-305` | `reports` | MUST REMOVE CALLER → `user_reports` | P1 |
| `app/api/circles/report/route.ts:89,101,124` | `moderation_reports` | MUST REMOVE CALLER → `moderation_queue` (and/or `user_reports`) | P0 |
| Universal cross-domain report path (5 callers) | `user_reports` | MUST IMPLEMENT (CREATE TABLE per CANON-SOCIAL-015) | P0 |
| `/api/admin/refunds`, `/api/admin/finances` | `refunds` | MUST IMPLEMENT (CANON-ADMIN-007) | P0 |
| `/api/admin/broadcasts/route.ts` | `broadcasts` | MUST IMPLEMENT (CANON-ADMIN-008) | P1 |
| `app/partner/support/page.tsx`, `app/partner/support/actions.ts` | `support_tickets`, `support_ticket_messages` | MUST IMPLEMENT (CANON-ADMIN-010) | P1 |
| Parent cap policy (none yet) | `parental_limits(parent_id, teen_id, max_monthly_dh, max_per_tx_dh, allowed_categories text[])` | MUST IMPLEMENT (CANON-ECON-023) | P2 |
| Per-teen curfew (cron uses hardcoded 22:00) | `teen_curfew_settings` | MUST IMPLEMENT (CANON-PARENT-027) | P1 |
| Partner blocklist (no UI, no table) | `partner_blocklist` | MUST IMPLEMENT (CANON-PARENT-029) | P2 |
| Teen-side parental-approval queue (`/parent/approvals` reads) | `parental_approvals` (referenced; subset shipped, but the `action_type` enum + cascade hooks need expansion) | MUST IMPLEMENT (CANON-PARENT-016) | P1 |
| Top-up idempotency | `payment_transactions.client_idempotency_key UNIQUE` (column missing) | MUST IMPLEMENT (CANON-ECON-017, CANON-PARENT-002) | P0 |
| Partner activation password capture | `partner_pending_credentials(partner_id, password_hash, expires_at)` | MUST IMPLEMENT (CANON-PARTNER-021) | P0 |
| QR scanner anti-replay | `qr_nonces(nonce TEXT PK, used_at TIMESTAMPTZ)` | MUST IMPLEMENT (CANON-PARTNER-004) | P0 |
| Pathway milestones | `pathway_milestones` | MUST IMPLEMENT (CANON-LIFE-004) | P1 |
| Mentor strikes mint | `mentor_strikes` (table exists in mig 064) — caller missing | MUST IMPLEMENT (caller) (CANON-LIFE-017) | P1 |
| Linking-code path | `linking_codes(code TEXT(6), parent_id UUID, expires_at, used_at, ...)` | MUST IMPLEMENT (CANON-AUTH-015) | P1 |
| E-signature ledger | `e_signatures(parent_id, signed_at, ip, user_agent, signature_blob_url)` | MUST IMPLEMENT (CANON-AUTH-010) | P0 |
| Server-side topup pricing | `topup_packages(id, name, amount_dh, bonus_coins, is_active, sort_order)` | MUST IMPLEMENT (CANON-ECON-001) | P0 |
| Two-parent co-sign | `parents_cosign_required` family flag (per F9) | MUST IMPLEMENT (CANON-PARENT-032) | P2 |
| Parent alerts inbox | `parent_alerts` (or extension on `user_notifications`) | MUST IMPLEMENT (CANON-PARENT-035) | P2 |
| Cashback rules | `cashback_rules` table — referenced by `spend_teen_coins` ✓; `place_food_order` hardcodes 10% (CANON-LIFE-014) | MUST IMPLEMENT (caller) | P2 |
| Discount usage ledger | `discount_usage` — silently swallowed by try/catch (CANON-PARTNER-006) | UNVERIFIED — table referenced but creation status unclear; verify migration |
| `partner_offers.status` enum column | column missing despite canon §3.2 schema | MUST IMPLEMENT (CANON-PARTNER-014) | P1 |
| `partners.partner_type` enum extension (food/driver/mentor/event_talent/event_organizer/creator) | values missing from CHECK | MUST IMPLEMENT (CANON-PARTNER-023) | P2 |
| `kyc_documents.subject_kind` CHECK constraint | not enforced as CHECK | MUST IMPLEMENT (CANON-ADMIN-009) | P1 |
| `dm-attachments` storage bucket | (no migration) | MUST IMPLEMENT (CANON-SOCIAL-011) | P1 |
| `marketplace-images-private` storage bucket | (no migration) | MUST IMPLEMENT (CANON-SOCIAL-016) | P1 |
| `parent-cin` private storage bucket | (no migration; CIN currently writes to public `documents`) | MUST IMPLEMENT (CANON-PARENT-004) | P0 |
| `chat_locks` (or `teens.coach_locked_until` column) | distress-lock 1h (CANON-AI-006) | MUST IMPLEMENT | P1 |

---

## Phantom columns called by code, missing from schema

| Column | Caller | Class | Notes |
|---|---|---|---|
| `profiles.coins` | `app/api/webhooks/stripe/dispatcher.ts:71-77` (handleCoinTopup reads + UPDATE) | MUST REMOVE CALLER | route via `top_up_teen` RPC instead — coins live on `user_coins`, not `profiles` (CANON-ECON-014) |
| `admin_roles.permissions` JSONB | `lib/auth/admin-permissions.ts:103-119` (read + merge) | MUST IMPLEMENT | column doesn't exist live (CANON-ADMIN-012, CANON-AUTH-011) |
| `parental_approvals.approval_type` | `app/parent/approvals/page.tsx:281,289,343,352` (read) | MUST RENAME | canonical column is `action_type` (CANON-PARENT-016) |
| `parental_approvals.status='rejected'` | filter at `app/parent/approvals/page.tsx:130-134` | MUST RENAME | canonical value is `denied` |
| `partner_offers.{name, min_purchase, max_usage, eligible_levels}` | `app/api/partner/offers/[id]/route.ts:69-81` PATCH | MUST RENAME | canonical: `title`, `min_purchase_amount`, `max_uses_per_user`, `min_vip_level` (CANON-PARTNER-013) |
| `user_xp.user_id` (filter) | `app/api/teen/wallet/route.ts:24,31,38,45,64` | MUST RENAME | canonical PK is `teen_id` (CANON-ECON-005) |
| `user_coins.user_id` (filter) | same wallet route | MUST RENAME | canonical PK is `teen_id` |
| `user_coins.{premium_tokens, seasonal_tokens, pending_tokens, token_multiplier, total_lifetime_tokens}` | `app/api/teen/tokens/route.ts` reads | MUST REMOVE CALLER | columns deprecated (CANON-ECON-003) |
| `shop_purchases.coins_spent` | `app/teen/shop/history/page.tsx` | MUST RENAME | rename column to `xp_spent` (CANON-ECON-006) |
| `savings_goals.status='withdrawn'` | UI value not in CHECK enum | MUST IMPLEMENT (extend CHECK) | CANON-GAME-009 |
| `ride_bookings.status='refunded'` | `app/api/admin/refunds/route.ts:401-406` | MUST IMPLEMENT (extend CHECK) OR MUST REMOVE CALLER (use `cancel_ride` + helper) | CANON-LIFE-001 |
| `food_orders.status='refunded'` | `app/api/admin/refunds/route.ts:323-329` | MUST IMPLEMENT OR REMOVE CALLER | CANON-LIFE-002 |
| `ambassadors.track` (e.g. `'organic'`,`'influencer'`) | per F3 fold | MUST IMPLEMENT | CANON-AUTH-023 |
| `friend_requests.expires_at` default `INTERVAL '7 days'` | mig 024:67 currently 30 days | MUST RENAME (alter default) | CANON-SOCIAL-008 |
| `feed_comments` max length 500 + depth-2 cap | RPC `add_feed_comment` accepts 1000 / arbitrary depth | MUST IMPLEMENT (DB CHECK) | CANON-SOCIAL-005 |
| `teens.friend_code TEXT UNIQUE` | (referenced by canonical friend-add-by-QR flow) | MUST IMPLEMENT | CANON-SOCIAL-007 |
| `teens.pseudo` (or username) | needed to strip PII from prompts | MUST IMPLEMENT | CANON-AI-001/005 |
| `food_orders.cashback_xp` written from hardcoded 10% | should mirror `cashback_rules` lookup | MUST RENAME (logic) | CANON-LIFE-014 |
| `mentor_can_dm_teen` RPC | RPC defined in mig 064; **no caller in app code** | MUST IMPLEMENT (caller) | CANON-LIFE-003 |

---

## Tables / RPCs defined but never called (potential dead code)

Top 15 candidates per C5 audit hypothesis (full ~40-table list referenced in compliance/00).

| Object | Hypothesis | Action |
|---|---|---|
| `add_coins_to_user` RPC | legacy / race-prone helper, EXECUTE still granted (CANON-ECON-016) | REVOKE + DROP |
| `xp_shop_items` | dead (zero callers) (CANON-ECON-016/026) | DROP TABLE |
| `user_purchases` | zero-row, zero-writer; `shop_purchases` is canonical (CANON-ECON-020) | DROP TABLE |
| `shop_items` | legacy parallel shop backend; `shop_rewards` is canonical | DROP after route 410 |
| `daily_challenges` | unified `quests` + `quest_progress` is canonical | DROP after fallback removed (CANON-GAME-012) |
| Token rail (`token_*` 6 tables) | feature killed | DROP en bloc (CANON-ECON-003) |
| `partner_discounts` | view aliasing `partner_offers`, sunset target | DROP after consumers migrate (Wave Cleanup-E) |
| `influencer_campaigns` | F3 fold (influencer = ambassador) | DROP after migration |
| `parents` table | parent profile data lives in `profiles` (CANON-AUTH-005) | DROP |
| `xp_payment_settings.xp_to_dh_rate=100` row | dead config 10× drift trap | DELETE row |
| Legacy `friendships(user_id, friend_id)` shape | rich-shape canonical | drop columns/rows after verification |
| `social_feed_posts` | shadow of `feed_posts` (no code/migration ref) | informational guard only (CANON-SOCIAL-018) |
| `teen_messages` references | canonical = `direct_messages` (no code refs) | informational guard |
| Empty supply tables (`mentors`, `nivy_drivers`, restaurant `partners`, `menu_items`, `internships`) | zero seed rows; UI shows EmptyState (CANON-LIFE-009) | seed or onboard real supply (NOT dead — needed) |
| RLS policies on `user_coins` referencing `teens.parent_id` | column doesn't exist (CANON-ECON-025) | DROP POLICY |
| `wheel_streaks` trigger (broken; powering deprecated `/gamification/roue`) | feature deprecated | DROP after route 410 |
| `mystery_box` shop_rewards rows (3 rows, `is_active=true`) | Loi 09-08 risk; defer until ladder design (CANON-ECON-022) | UPDATE `is_active=false` |
| `xp_shop_items` (dup) | see above |  |
| Quiz `daily_challenges` fallback rows | covered above |  |
| `add_user_xp` (if a stub exists in DB) | superseded by `add_xp_to_user` | DROP if present; otherwise just CI-lint guard |

---

## Recommendation: build/rename/remove order

### Phase 1 (P0 blockers — same PR set)

- **RENAME** `add_user_xp` → `add_xp_to_user` at all 3 callsites; align parameter names to `(p_teen_id, p_xp_amount, p_source_type, p_source_category, p_source_id, p_description)`. **MUST ALIAS** at DB level for one release: `CREATE OR REPLACE FUNCTION add_user_xp(p_user_id uuid, p_xp_amount int, p_source text, p_source_id uuid) RETURNS jsonb LANGUAGE sql AS $$ SELECT add_xp_to_user(p_user_id, p_xp_amount, p_source::varchar, NULL::varchar, p_source_id, NULL); $$` (per CANON-ECON-004). Drop alias once code clean.
- **RENAME** wallet PK filters `user_id` → `teen_id` on `user_xp`, `user_coins`, `coin_transactions` (CANON-ECON-005).
- **REMOVE CALLER** of phantom `get_user_xp`, `deduct_user_xp` (410 the legacy shop route + token route).
- **REMOVE CALLER**: drop `auth.signUp` from `components/onboarding/parent-setup-step.tsx` (CANON-AUTH-005).
- **REMOVE CALLER**: 410 `/api/teen/shop` and `/api/teen/tokens` routes entirely.

### Phase 2 — MUST IMPLEMENT canonical RPCs missing per ECON canon §7

Order: `refund_teen_coins` + `revoke_xp_cashback` first (unblocks ride cancel + admin refund unification + food reject), then `refund_top_up`, `complete_mentor_session`, `release_savings_goal`, `withdraw_from_goal`, `pay_featured_creator`, `_cashback_pct`. Plus `apply_partner_offer` (atomic offer apply with row lock + nonce, CANON-PARTNER-004). Plus `register_partner` / canonical partner activate (CANON-PARTNER-002). Plus `parent_approve_ride / purchase / food / content` (CANON-PARENT-025). Plus `approve_ambassador` atomic role+status flip (CANON-AUTH-009). Plus `moderate_content` for admin moderation unification (CANON-ADMIN-005). Plus `admin_approve_driver` (CANON-ADMIN-009).

### Phase 3 — MUST IMPLEMENT canonical tables

Build in this order: `parental_approvals` schema completion + cascade hooks; `refunds`; `broadcasts`; `support_tickets` + `support_ticket_messages` + SLA cron; `qr_nonces`; `partner_pending_credentials`; `user_reports` (universal sink); `audit_log` (singular, canon §4 schema) — with one-shot backfill from `admin_audit_logs`; `topup_packages`; `e_signatures`; `linking_codes`; `pathway_milestones`; `parental_limits`; `teen_curfew_settings`; `partner_blocklist`; `dm-attachments` + `marketplace-images-private` + `parent-cin` storage buckets. Then add missing columns: `payment_transactions.client_idempotency_key UNIQUE`, `partner_offers.status` enum + `NOT is_active OR status='approved'` CHECK, `admin_roles.permissions JSONB`, `kyc_documents.subject_kind` CHECK, `savings_goals.status` extension to include `'withdrawn'`, `ride_bookings.status` + `food_orders.status` extensions to `'refunded'` (or use canonical refund RPC instead), `ambassadors.track`, `teens.friend_code`, `teens.pseudo` (or `username`).

### Phase 4 — REMOVE CALLER for legacy table writes

Migrate the 7 `notifications` + 4 `activity_logs` + 28 `admin_audit_logs` writers per Wave Cleanup-B in file 14. Then 410 the bare `/notifications*` routes and the `app/notifications/{page,preferences}` pages. Migrate `app/api/circles/report/route.ts` and `app/api/teen/feed/comments/route.ts` reports → `user_reports` (and/or `moderation_queue` for circles). Drop `bumpCoins` helper from admin refunds. Delete `app/teen/coins/coins-client.tsx` post-redirect verification. Drop legacy `parents` and `influencer_campaigns` tables. After all callers green, drop the deprecated tables themselves (Wave Cleanup-E).

End of file 15.
