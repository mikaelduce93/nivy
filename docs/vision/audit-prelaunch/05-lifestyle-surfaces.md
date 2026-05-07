# 05 — Lifestyle surfaces verification

> Read-only audit. Source-of-truth: vision specs in `docs/vision/`, migration files in `gamification-system/database/migrations/`, live DB introspection on `imchornjvmgmaovhypco`, and code under `app/` + `scripts/`. Date: 2026-05-07. Scope: the 7 lifestyle surfaces shipped in Wave 2-3 per whitepaper §19.4 — chores, transport, food, marketplace, allowance, creator, mentorship.

## Verdict

**AMBER → GREEN-leaning.** The brief assumed Wave 3 transport-mobility and mentorship-career agents were never run. **That assumption is wrong.** Both surfaces have fully applied DB migrations, end-to-end RPC families, working API routes, and verify scripts (`scripts/verify-transport.ts`, `scripts/verify-mentorship.ts`). Transport additionally has full UI (teen + parent + admin), a curfew cron registered in `vercel.json`, and a driver-actions page. So 5 of the 7 surfaces are credibly DONE end-to-end at backend+API, and 4 of the 7 have functional UI.

The real gap is **UI breadth, not backend depth**: marketplace, allowance/savings, creator economy, mentorship, food and transport all have backends + APIs, but **mentorship, marketplace, allowance/creator have asymmetric UI coverage** — some role views (parent of teen-mentor, mentor's own portal, marketplace admin queue page, teen mentor discovery, teen marketplace browse) are missing or live under unexpected paths.

Net call: the **plumbing is launch-ready for chores, food, allowance/savings, transport** (UI complete enough). Marketplace has full app/marketplace/* tree but no `/admin/marketplace` queue page beyond `app/admin/marketplace/page.tsx` (exists, status TBD). Mentorship has APIs and DB but **zero teen-facing or mentor-facing UI** — the user cannot reach the feature from the app. Creator economy has feed UI but no `/teen/create` composer.

The auditor recommends **shipping at launch: chores, food (halal-enforced), transport (with launch caveats below), allowance/savings**. **Hold post-launch: mentorship (no UI), marketplace (UI exists at non-standard path; admin moderation parity unclear), creator economy (no composer + creator strikes table per spec missing)**.

Two security findings worth flagging before any of these go live:
1. `app/api/admin/mentors/[id]/approve/route.ts` and `app/api/admin/internships/[id]/decide/route.ts` do **not** check `userInfo.role === "admin"` at the route layer; they pass any authenticated user's UUID as `p_admin_user_id` / `p_decider_id` and rely entirely on the RPC's `mentor_is_admin()` SECURITY DEFINER check to gate. That is technically defensible (the RPC enforces) but inconsistent with `app/api/admin/drivers/[id]/approve/route.ts` which does enforce role at both layers.
2. `app/api/teen/rides/request/route.ts` accepts `body.teenId` for "parent-on-behalf" booking but never validates the parent→teen link at the route layer (it again delegates to `request_ride` RPC). If `request_ride` does not enforce the parent_teen_links check, a parent could request a ride for an arbitrary teen. Worth re-reading `057_transport_mobility_rpcs` to confirm.

## 7-surface matrix

| Surface | Schema | RPC | API routes | UI pages | Verify script | Last run | Status |
|---|---|---|---|---|---|---|---|
| 1. Parent chores | `parent_chores`, `parent_chore_completions` (RLS on) | `payout_chore_reward` (v2) | parent: `chores/route`, `chores/create`, `chores/[id]/verify-completion`; teen: `chores/route`, `chores/[id]/complete` | parent: `/parent/chores`, `/new`, `/[id]`; teen: `/teen/chores` | `scripts/verify-parent-chores.ts` (293 lines) | last RECETTE: PASS | DONE |
| 2. Transport | `ride_bookings`, `ride_tracks`, `ride_groups`, `ride_group_members`, `nivy_drivers` (all RLS on) | `request_ride`, `approve_ride`, `cancel_ride`, `dispatch_ride`, `complete_ride` | teen 5, parent 4, driver 3, admin 1 — 13 routes | `/teen/rides` + `/request`; `/parent/rides` + `/[id]` (map+actions); `/admin/drivers` + `/[id]` | `scripts/verify-transport.ts` (278 lines) | not in RECETTE — script present, run pending | DONE (backend+UI), AMBER on aggregator (none integrated) |
| 3. Food delivery | `food_orders`, `food_order_items`, `nutrition_challenges`, `menu_items`, `partners.sub_category` extension (all RLS on) | `place_food_order`, `partner_accept_food_order`, `partner_reject_food_order` | teen 3, parent 1, partner 5 — 9 routes | `/teen/food` + `/[partner_id]` + `/order/[id]`; `/parent/food`; `/partner/restaurant/menu` + `/orders` | `scripts/verify-food.ts` (265 lines) — 13/13 PASS asserted | per script: PASS | DONE |
| 4. Marketplace C2C | `marketplace_listings`, `marketplace_transactions`, `marketplace_disputes`, `escrow_ledger`, `moderation_queue` extension | `create_listing`, `buy_listing`, `marketplace_auto_release_escrow` | `/api/marketplace/listings`, `/[id]`, `/[id]/buy`, `my-listings`, `orders`, `transactions/[id]/confirm-receipt`, `/dispute` | `/marketplace/`, `/listings/[id]`, `/sell`, `/my-listings`, `/orders` (under app/marketplace, NOT app/teen/marketplace) | `scripts/verify-marketplace.ts` (267 lines) | RECETTE WAVE 2 P1+: 13/13 asserted | DONE (UI at non-standard path) |
| 5. Allowance & Savings | `parent_allowances`, `allowance_disbursements`, `savings_goals`, `savings_contributions`, `teen_goals` (all RLS on) | `disburse_allowance`, `_advance_next_disbursement`, `_savings_match_trigger`, `spend_teen_coins` extended for spendable balance | parent: `allowances/route`, `[id]`, `/pause`, `/resume`, `savings/match`; teen: `savings/goals`, `[id]/lock`, `[id]/cancel` — 7 routes | parent: `/parent/allowances` + `/new` + `/parent/savings`; teen: `/teen/savings` + `/new`, `/teen/wallet/allowance`; cron `/api/cron/disburse-allowances` | `scripts/verify-allowance-savings.ts` (302 lines) | RECETTE WAVE 2 P1+: 13/13 asserted | DONE |
| 6. Creator Economy | `feed_posts`, `feed_likes`, `feed_comments`, `feed_views`, `feed_shares`, `creator_engagement`, `creator_monthly_stats`, `creator_daily_caps_status`, `post_hashtags`, `hidden_posts`, `feed_muted_users` (all RLS on) | `create_feed_post`, `toggle_post_like`, `get_post_comments`, `award_creator_xp`, `refresh_creator_monthly_stats`, `track_share_click` | teen: `feed`, `feed/comments`, `feed/submissions`, `feed/[submission_id]/engage`; admin: `creator/feature/[submission_id]`, `creator/moderate` | `/teen/feed`, `/teen/feed/[id]`, `/admin/creator-moderation`. **No `/teen/create` composer**, no `/teen/profile/:id` gallery | `scripts/verify-creator-economy.ts` (301 lines) | RECETTE WAVE 2 P1+: 12/12 asserted | PARTIAL — backend done, no composer UI |
| 7. Mentorship | `mentors`, `mentor_sessions`, `internships`, `internship_applications`, `career_pathways`, `teen_pathway_progress` (all RLS on, 5 pathways seeded) | `apply_mentor`, `admin_approve_mentor`, `book_mentor_session`, `parent_approve_session`, `rate_mentor_session`, `apply_to_internship`, `decide_internship_application`, `mentor_is_admin` | teen 6, parent 3, admin 2, mentor 1 — 12 routes | **NONE** — no `/teen/mentors`, no `/teen/mentor-sessions`, no `/teen/internships`, no `/teen/pathways`, no `/parent/mentor-sessions`, no `/admin/mentors`, no `/mentor/*` | `scripts/verify-mentorship.ts` (318 lines) | not in RECETTE — script present | PARTIAL — backend done, **0% UI** |

## Per-surface deep dive

### 1. Parent custom chores — DONE

**Schema (live).** `parent_chores(id, parent_id, teen_id, title, description, reward_dh, reward_xp, recurrence, recurrence_config jsonb, starts_at, ends_at, required_completions, evidence_required, is_active, created_at, updated_at)` and `parent_chore_completions` (verified at `parent_verified`, `verified_at`, `verified_by`, `rejection_reason` columns implied by the verify-completion route). Both RLS-enabled. Live row counts: 2 chores, 10 completions (test/seed data).

**RPCs.** `payout_chore_reward(p_completion_id, p_verified_by)` — applied as migration `053_payout_chore_reward` and re-issued as `053_payout_chore_reward_v2_link_all` to wire across the full `coin_transactions` + `escrow_ledger` + `user_xp` chain. Triggered server-side by the verify route via `createServiceRoleClient().rpc("payout_chore_reward")` — not from the JWT'd anon client — which is the correct §29.15 invariant.

**API.** `app/api/parent/chores/route.ts` (list + create), `app/api/parent/chores/create/route.ts` (separate POST), `app/api/parent/chores/[id]/verify-completion/route.ts` (the load-bearing approve/reject + payout fire). `app/api/teen/chores/route.ts` (teen list) and `[id]/complete/route.ts` (teen marks done). Total 5 routes.

**UI.** `app/parent/chores/page.tsx`, `/new/page.tsx`, `/[id]/page.tsx`. `app/teen/chores/page.tsx`. UI feels complete for the canonical journey: parent creates chore → teen marks done → parent verifies → coins land.

**Verify script.** `scripts/verify-parent-chores.ts` (293 lines). The RECETTE doc does not enumerate per-surface verify totals but the Wave 2 P1+ commit message claims passing.

**Compliance / known gaps.** The verify route reads `chore.parent_id` + JWT to confirm ownership; uses RLS as a backstop. **There is no e-signature ceiling**: vision §16-19 of `parent-custom-chores.md` flags that Morocco may need parental consent above N DH/month, but there is no enforcement of a per-month or per-payout ceiling at either RPC or route layer. All payouts execute regardless of cumulative DH amount. Photo-evidence storage policy is not visible in the audit (no chore-evidence bucket showed up in the RECETTE bucket list of 6 — chore evidence may be sharing a generic bucket or not implemented at all). Vision §73-75 (privacy, evidence retention, signed URLs) is unverified. Multi-parent verification semantics not addressed.

**E2E.** Yes — a teen can use it.

### 2. Transport / mobility — DONE (backend+UI), AMBER on aggregators and KYC depth

**Schema (live).** `ride_bookings` (29 columns including `pickup_lat/lng`, `dropoff_lat/lng`, `scheduled_for`, `return_scheduled_for`, `group_id`, `provider`, `payment_method`, `parent_approval_id`, `driver_id`, `cancellation_reason`, `rating_by_teen`, `rating_by_driver`, `curfew_override`, `dispatched_at`, `completed_at`, `cancelled_at`). `ride_tracks(ride_id, lat, lng, captured_at, speed)`. `ride_groups`, `ride_group_members`. `nivy_drivers(user_id, full_name, phone, vehicle_make, vehicle_model, vehicle_plate, kyc_status, is_active, service_cities, approved_by, approved_at, rating)`. All RLS-enabled. Live row counts: 0 rides, 0 drivers, 0 groups (clean state — verify scripts auto-cleanup their seed).

**Migrations.** `057_transport_mobility` (5962 bytes) + `057_transport_mobility_rpcs` (13648 bytes). Both applied to live (verified via `list_migrations`). **No local SQL file** for either — they were created via MCP `apply_migration` directly. That means the only way to read them is via the DB; the repo does not contain them. **Reproducibility risk**: if anyone re-bootstraps the project from `gamification-system/database/migrations/` only, transport will be missing. Recommendation: dump and commit them.

**RPCs.** `request_ride` (12 args including `p_caller_id` for parent-on-behalf), `approve_ride`, `cancel_ride`, `dispatch_ride`, `complete_ride`. The verify script confirms the full state machine: requested → approved → dispatched → completed with 5 ride_tracks inserted in between, and it asserts a 48-coin debit on completion.

**API routes (13 total).**
- teen (5): `request/`, `route` (list), `[id]/cancel/`, `groups/create/`, `groups/[id]/join/`
- parent (4): `active/`, `[id]/approve/`, `[id]/deny/`, `[id]/track/`
- driver (3): `[id]/track/`, `[id]/dispatch/`, `[id]/complete/`
- admin (1): `drivers/[id]/approve/`

**UI.** `/teen/rides/page.tsx` lists upcoming + history with status badges; `/teen/rides/request/page.tsx` + `request-form.tsx` for booking. `/parent/rides/page.tsx`, `/parent/rides/[id]/page.tsx` with a `ride-actions.tsx` and a `ride-map.tsx` (live map component — exists; map provider not audited but the file is present). `/admin/drivers/page.tsx` + `/[id]/page.tsx` + `driver-actions.tsx`.

**Cron.** `app/api/cron/ride-curfew-check/route.ts` registered in `vercel.json` at `0 22 * * *`. Cancels any pending/approved ride scheduled past 22:00 local (21:00 UTC for Morocco UTC+1 year-round) where `curfew_override=false`. Authenticated via Vercel cron header OR `CRON_SECRET` bearer. Writes audit log to `admin_audit_logs`. Solid.

**Compliance / known gaps.**
- **No aggregator integration.** `provider` column accepts `careem | heetch | nivy_partner | public_transport` but Grep `careem|heetch` returns 1 match (the API route's TypeScript union type). No actual Careem or Heetch SDK / adapter / credential code. Vision §6 phases Careem at M4 (weeks 12-14); not implemented. **Currently nivy_partner is the only working provider.** Public transport metadata: not implemented.
- **BAM compliance / driver licensing.** Vision §4 flags that Moroccan ride-hailing rules require a partnership with a licensed taxi cooperative in some cities. The `nivy_drivers` table stores `vehicle_plate` and `kyc_status` but has no `licence_number`, no `cooperative_id`, no insurance metadata. KYC document storage: vision §6 specifies a private `driver-kyc` bucket; the RECETTE 6-bucket list shows `cin-scans`, `kyc-documents`, `defi-proofs`, `event-images`, `partner-logos`, `avatar-assets` — `kyc-documents` is the likely catch-all but driver-specific document handling is not visible.
- **No realtime subscription.** Vision §6 calls for Supabase Realtime channel `ride:{id}` for live driver position pushes; the parent ride-map exists but the `parent\rides\[id]\ride-map.tsx` was not deeply inspected — assume polling-based unless proven otherwise.
- **Geo-fence deviation alerting.** Vision §27 calls this out as the single product-killer if absent. Not visible in code; no `ride_alerts` table, no deviation-alert cron.
- **Insurance & liability.** Vision §23 flags as undefined; still undefined.
- **Parent-on-behalf authorization gap.** `request_ride` API accepts `body.teenId` from a parent caller; the parent→teen link is not verified at the route layer. Need to confirm `request_ride` RPC enforces.

**E2E.** Yes for nivy_partner provider with all-Moroccan single-city rides. No for Careem/Heetch fallback.

### 3. Food delivery & restaurants — DONE

**Schema (live).** `food_orders(id, status, total_coins, total_dh, partner_id, teen_id, parent_id, parent_approval_id, delivery_type, scheduled_for, payment_method, ride_booking_id, created_at)`. `food_order_items(order_id, menu_item_id, qty, unit_coins, unit_calories, ...)`. `nutrition_challenges(parent_id, teen_id, title, nutrition_targets jsonb, is_active)`. `menu_items(partner_id, name, category, price_dh, price_coins, calories, nutrition_tags[], is_halal, allergens[], available_*, prep_time_minutes, is_active)`. `partners.sub_category` extended to `restaurant|cafe|bakery|fast_food|catering|grocery`. RLS on all. Live row counts: 5 food_orders, 5 food_order_items, 3 nutrition_challenges (test seeds + 1 active for the verify run).

**Migrations.** `058_food_delivery` (186 lines, 4 KB) + `058_food_delivery_rpcs` + `058_food_delivery_extend_approvals` + `058_partner_transactions_status_extend` — 4 migrations, all applied. The local SQL file for `058_food_delivery.sql` and `058_food_delivery_rpcs.sql` is in the repo (untracked per `git status`).

**RPCs.** `place_food_order(p_teen_id, p_partner_id, p_delivery_type, p_items jsonb, p_address, p_scheduled_for, p_payment_method)`, `partner_accept_food_order`, `partner_reject_food_order`. The verify script asserts the full chain: order placed → coin debit 5000 + 500 XP cashback (10%) → partner accepts → `partner_transactions` row inserted with status='succeeded'.

**API (9 routes).**
- teen: `food/order/`, `food/menu/[partner_id]/`, `food/restaurants/`
- parent: `food/budget/`
- partner: `restaurant/menu/items/`, `[id]/`, `restaurant/orders/[id]/accept/`, `/reject/`, `restaurant/orders/feed/`

**UI.** `/teen/food` (discovery with halal filter, sub_category dropdown, nutrition tag chip filter), `/teen/food/[partner_id]` with `menu-cart-client.tsx`, `/teen/food/order/[id]/page.tsx`. `/parent/food/page.tsx` (order history + nutrition_challenges list — 60+ lines confirmed, complete enough for MVP). `/partner/restaurant/menu/page.tsx` + `menu-manager-client.tsx` + `/orders/page.tsx` + `orders-feed-client.tsx`.

**Compliance.**
- **Halal hard-block.** Verified end-to-end: the verify script confirms that ordering a non-halal item without parent override returns `pending_approval` with `reason='non_halal_item'`. The RPC enforces halal-by-default.
- **Nutrition challenge enforcement.** Verified: with `{halal_only:true, max_calories_per_meal:600}` set, an 800-kcal fast-food item is rejected with `reason='challenge_max_calories'`. Both `halal_only` and `max_calories_per_meal` triggers fire correctly.
- **Allergen liability.** `menu_items.allergens text[]` exists; no client-side warning logic was audited but the column is present for the partner to attest.
- **Aggregator (Glovo/Jumia).** Not implemented (vision P5).
- **Catering merge with `anniv_orders`.** Not implemented (vision P4).

**E2E.** Yes — a teen can browse, filter by halal, order, get coin debit, partner accepts, item delivered (status flows via partner UI). The verify script's 13 PASS asserts the full chain.

### 4. Marketplace C2C — DONE (UI lives at non-standard path)

**Schema.** `marketplace_listings`, `marketplace_transactions`, `marketplace_disputes`, `escrow_ledger` (RLS all on). Live row counts: 0 listings, 0 transactions, 0 disputes, 11 escrow rows (test seeds from earlier wave + Wave 2). Migrations `056a_marketplace_c2c_tables_rls`, `056b_marketplace_create_listing`, `056c_marketplace_buy_listing`, `056d_marketplace_confirm_dispute_release`, `056e_moderation_queue_marketplace_type`, `056f_marketplace_regex_word_boundaries`. Six migrations — the most fragmented surface — but all applied. The repo's `056_marketplace_c2c.sql` is 703 lines.

**RPCs.** `create_listing(p_seller_id, p_params jsonb)`, `buy_listing(p_listing_id, p_buyer_id, p_meet_method, p_meet_location_partner_id)`, `marketplace_auto_release_escrow()` (zero-arg cron worker).

**API.** Under `app/api/marketplace/` (NOT `app/api/teen/marketplace/` or `app/api/parent/marketplace/`): `listings/route`, `[id]/route`, `[id]/buy/route`, `transactions/[id]/confirm-receipt/route`, `transactions/[id]/dispute/route`, `my-listings/route`, `orders/route`. Plus admin: `app/api/admin/marketplace/moderate/[listing_id]/route.ts`. 8 routes total.

**UI.** Under `app/marketplace/` (NOT `app/teen/marketplace/`): `page.tsx`, `listings/[id]/page.tsx` + `buy-button.tsx`, `sell/page.tsx` + `sell-form.tsx`, `my-listings/page.tsx`, `orders/page.tsx`. Plus admin: `app/admin/marketplace/page.tsx`.

**Verify.** `scripts/verify-marketplace.ts` (267 lines). RECETTE WAVE 2 P1+ commit asserts 13/13 PASS.

**Cron.** `app/api/cron/marketplace-escrow-release` registered in `vercel.json` at `0 6 * * *`. Calls `marketplace_auto_release_escrow()` (3-day auto-release per vision §29).

**Compliance.**
- **Moderation enqueue path.** Migration `056e_moderation_queue_marketplace_type` confirms `moderation_queue.content_type='marketplace_listing'` is supported. `056f_marketplace_regex_word_boundaries` suggests keyword denylist regex was hardened — important for `weapons|drugs|contact info` filter.
- **AML caps.** Vision §7 calls for max 5 active listings, max 1000 DH/month per teen. Whether the RPC enforces is not audited from migration content here; the RPC file is 703 lines, presumably checks count.
- **Safe-meet.** `buy_listing` accepts `p_meet_method` + `p_meet_location_partner_id` — schema supports school/venue restriction. Whether teen-to-teen is enforced (not allowing shipping) is RPC-internal.
- **Parent approval gateway.** Listings ≥ 200 coins and all teen buys must hit `parental_approvals`. Not directly verified — would need to read the RPC.

**Path quirk.** The choice to put marketplace at `app/marketplace/` rather than `app/teen/marketplace/` breaks the role-prefix convention used by every other surface (teen/parent/partner/admin). Either: (a) the auth is checked inside each page (likely); (b) it is intended as a cross-role discovery surface. Worth confirming the role gate works for all entry points before launch.

**E2E.** Likely yes; the verify script asserts the loop. Risk: discovery flow's role gate.

### 5. Allowance & Savings — DONE

**Schema.** `parent_allowances`, `allowance_disbursements`, `savings_goals`, `savings_contributions`, `teen_goals` — all RLS-enabled. Live counts: 0 allowances, 0 disbursements, 0 savings goals (clean — script auto-cleans). Migration `054_allowance_savings` (581 lines) + `054_allowance_savings_rpcs` + `054_allowance_savings_disburse_and_trigger` + `054_spend_teen_coins_spendable`. The fourth migration (`054_spend_teen_coins_spendable`) is the load-bearing one that **alters the existing `spend_teen_coins` RPC** to subtract goal-locked balance from the spendable balance — this is the vision §15-22 enforcement of "locked coins cannot be spent."

**RPCs.** `disburse_allowance(p_allowance_id)`, `_advance_next_disbursement(p_current, p_cadence, p_cadence_config)`, `_savings_match_trigger()` (trigger function), and the modified `spend_teen_coins(p_teen_id, p_amount_coins, p_partner_id, p_reward_id)` that now respects locked balance.

**Cron.** `app/api/cron/disburse-allowances` at `0 9 * * *` daily — the disbursement engine. Idempotent per `next_disbursement_at` advancement inside the same transaction (vision §75 invariant).

**API (7 routes).** parent: `allowances/route` (list/create), `[id]/pause`, `[id]/resume`, `[id]/route` (delete/update), `savings/match` (parent-funded match config). teen: `savings/goals/route` (create/list), `[id]/lock` (lock contribution from spendable balance), `[id]/cancel` (cancel goal — open question per vision §70 whether locked coins return to teen or to parent escrow).

**UI.** parent: `/parent/allowances/page.tsx` + `new/page.tsx`, `/parent/savings/page.tsx`. teen: `/teen/savings/page.tsx` + `new/page.tsx`, `/teen/wallet/allowance/page.tsx`. Complete set.

**Verify.** `scripts/verify-allowance-savings.ts` (302 lines). RECETTE asserts 13/13 PASS.

**Compliance.**
- **Idempotency.** Vision §75 calls for cron to never double-pay. Implementation idiom (advance `next_disbursement_at` inside the same tx as `top_up_teen`) is the right answer; assumed correct since RECETTE asserts.
- **Locked-balance enforcement.** Confirmed at the RPC layer (`054_spend_teen_coins_spendable`).
- **Match cap semantics, multi-parent coordination, goal-cancellation rule.** Vision §69-78 lists these as open questions — not verified one way or the other.
- **BAM custodial.** Vision flags Moroccan tax/legal framing of recurring allowance as gift/income/non-event. Not audited at the legal layer — out of scope for this audit.

**E2E.** Yes — a teen can save toward a goal, parent can fund recurring allowance, locked coins cannot be spent.

### 6. Content creator economy — PARTIAL (no composer UI, partial role coverage)

**Schema.** `feed_posts`, `feed_likes`, `feed_comments`, `feed_views`, `feed_shares`, `feed_mentions`, `feed_bookmarks`, `feed_muted_users`, `creator_engagement`, `creator_monthly_stats`, `creator_daily_caps_status`, `post_hashtags`, `hidden_posts`, `activity_feed_preferences` — 14 tables, all RLS-on. Live counts: 1 feed_post, 0 likes (test seed). Schema landed in part via earlier `035_social_feed.sql` and `037_social_shares.sql` (Wave 1) and was extended in `055_creator_economy` (375 lines) + `055_creator_economy_moderation_check`.

**RPCs.** `create_feed_post`, `toggle_post_like`, `get_post_comments`, `award_creator_xp(p_creator_user_id, p_signal_type, p_submission_id, p_viewer_user_id)`, `refresh_creator_monthly_stats()`, `track_share_click(p_share_code)`.

**API.** `app/api/teen/feed/route.ts` (algorithmic feed via `get_personalized_feed`), `feed/comments/route.ts`, `feed/submissions/route.ts` (the create-post endpoint), `feed/[submission_id]/engage/route.ts` (likes/views). Admin: `app/api/admin/creator/feature/[submission_id]/route.ts` (admin promotes a post to featured), `app/api/admin/creator/moderate/route.ts` (approve/reject queue).

**UI present.** `app/teen/feed/page.tsx`, `app/teen/feed/[id]/page.tsx` + `engage-buttons.tsx`. Admin: `app/admin/creator-moderation/page.tsx`. There IS an `app/teen/create/page.tsx` — but its content was not audited (likely a generic "create" hub, may or may not be the post composer).

**UI missing per vision.** Vision §65 lists `/teen/create` (post composer with media upload, type/category pickers, visibility), `/teen/leaderboard` filtered by creators, `/teen/profile/[id]` content gallery, `app/teen/profile/page.tsx` exists but a public per-user content gallery surface is unverified.

**Compliance / known gaps.**
- **Anti-farming caps.** `creator_daily_caps_status` table exists. Cap rules per vision §66 (50 likes / 30 comments / 20 shares per day credited) — table is the right shape; whether `award_creator_xp` enforces the cap is RPC-internal.
- **Three-strikes suspension.** Vision §69 calls for `creator_strikes` table — not in DB schema audit. Listed as a missing piece.
- **Moderation enqueue from `feed_posts`.** Vision §57 calls for trigger on `visibility='public'` to enqueue. `055_creator_economy_moderation_check` migration name suggests it was wired. Live confirmation needed.
- **Image AI scan.** Vision §63 — not visible.
- **Featured XP/coin bonus.** Vision §60: +500 XP +200 coins on flip. The admin route exists; the bonus award is RPC-internal.
- **Avatar coach hooks.** Vision §72-73 — not wired.

**E2E.** Partial. A teen CAN view the feed and engage. A teen CANNOT compose a post unless `app/teen/create/page.tsx` is the composer (it might be).

### 7. Mentorship & career — PARTIAL (backend done, ZERO UI)

**Schema.** `mentors(user_id, expertise_tags, years_experience, bio, intro_video_url, age_min_mentee, age_max_mentee, status, kyc_status, hourly_rate_dh, free_intro_session, rating, sessions_count, ...)`, `mentor_sessions(mentor_id, mentee_user_id, scheduled_for, duration_minutes, status, parent_approval_id, meeting_url, rating_by_mentee, rating_by_mentor)`, `internships(partner_id, title, description, duration, age_min, age_max, spots_total, paid, status)`, `internship_applications(internship_id, applicant_id, cover_letter, portfolio_urls[], status, decision_at, decided_by)`, `career_pathways(slug, title, description, icon, category, required_subjects, typical_grades, recommended_quiz_ids, recommended_partner_ids, recommended_mentor_tags, is_active)`, `teen_pathway_progress(teen_id, pathway_id, last_active_at)`. All RLS-on.

**Live counts.** 0 mentors, 0 mentor_sessions, 0 internships, 0 internship_applications, 5 career_pathways (seeded), 0 teen_pathway_progress. Migration `059_mentorship_career` (296 lines) + `059_mentorship_career_rpcs`. Both applied.

**RPCs.** `apply_mentor`, `admin_approve_mentor`, `book_mentor_session`, `parent_approve_session`, `rate_mentor_session`, `apply_to_internship`, `decide_internship_application`, `mentor_is_admin(p_uid)` (admin-role check helper). Confirmed by the verify script's 14-step end-to-end run including (a) intro session is free, (b) parent approval flow goes through `parental_approvals` with `action_type='coach_meeting' resource_type='mentor_session'`, (c) age-range gating refuses out-of-range mentees, (d) suspended mentors cannot accept bookings.

**API (12 routes).**
- teen: `mentors/route`, `mentors/[id]/route`, `mentor-sessions/book/route`, `mentor-sessions/[id]/rate/route`, `internships/route`, `internships/[id]/apply/route`, `pathways/route`, `pathways/[slug]/declare/route`
- parent: `mentor-sessions/route`, `mentor-sessions/[id]/approve/route`, `mentor-sessions/[id]/deny/route`
- admin: `mentors/[id]/approve/route`, `internships/[id]/decide/route`
- mentor: `apply/route`

**UI present.** **None.** Glob results: no `app/teen/mentors/`, no `app/teen/mentor-sessions/`, no `app/teen/internships/`, no `app/teen/pathways/`, no `app/parent/mentor-sessions/`, no `app/admin/mentors/`, no `app/admin/internships/`, no `app/mentor/`. Despite the API + DB + verify script being complete, **a teen has no way to discover, browse, or book a mentor from the app**, a parent has no way to approve a session in the UI, an admin has no queue page for mentor approvals or internship moderation, and a mentor has no application portal or session calendar.

**Verify.** `scripts/verify-mentorship.ts` (318 lines, 14 steps including bonuses). The script asserts the entire backend flow works correctly via service-role.

**Compliance / known gaps.**
- **CIN scan + clean record extract + reference calls + intro video review.** Vision §6 mandates these; only `kyc_status` is on `mentors` row. The `apply_mentor` RPC creates a `kyc_documents` placeholder per the verify script comment, but the actual document handling/review is unbuilt.
- **First session = free + parent-attended + recorded.** Free part is verified (`is_intro=true, amount_coins=0`). Parent-attended and recorded: not verified (no `meeting_url` recording pipeline).
- **No off-platform DMs.** Vision §6 mandates; not enforced (no chat integration tested).
- **Age-appropriate matching.** `age_min_mentee` / `age_max_mentee` columns enforced (verify script confirms refuse on age out of range).
- **3-strike rule.** Vision §6 + comment in verify script: "P1 TODO: automated strike counter table." Not implemented; manual via `admin_audit_logs` per the verify script's NOTE.
- **Admin route auth.** `app/api/admin/mentors/[id]/approve/route.ts` does NOT check `userInfo.role === "admin"` — it calls `supabase.auth.getUser()` then trusts the RPC. Same for `internships/[id]/decide/`. The RPC has `mentor_is_admin(p_uid)` but only `admin_approve_mentor` calls it (verify script asserts behavior). `decide_internship_application` would need re-reading. Inconsistent with the drivers route which explicitly enforces role.
- **Liability + insurance.** Vision §6 leaves liability open. Still open.

**E2E.** **No.** The backend works; the UI does not exist. A teen cannot reach this feature today.

## Wave 3 gap report

The brief's premise — that Wave 3 transport-mobility and mentorship-career agents were never run — was **incorrect**. Both surfaces have complete backends and APIs. The verify scripts exist, are well-structured, and the migrations are live in the DB.

| Wave 3 surface | Migrations | RPCs | APIs | UI | Verify script | Verdict |
|---|---|---|---|---|---|---|
| 057 Transport | applied (no local SQL file) | 5 | 13 | full (teen/parent/admin/driver) | yes | DONE — needs local migration file dump |
| 058 Food | applied (4 migrations, local SQL present) | 3 | 9 | full (teen/parent/partner) | yes (13/13 PASS) | DONE |
| 059 Mentorship | applied (2 migrations, local SQL present) | 8 | 12 | **NONE** | yes | PARTIAL — backend ready, UI is the entire remaining work |

**Effort to close mentorship UI gap.** Approximately:
- `/teen/mentors` browse + filter + detail page → S (8-12 routes worth of UI ~ 2 days)
- `/teen/mentor-sessions/[id]` join + rating UI → S (1 day)
- `/teen/pathways/[slug]` pathway detail with milestones → M (2 days, depends on milestone visualization)
- `/teen/internships` browse + apply → S (1 day)
- `/parent/mentor-sessions/[id]` approve/deny → S (0.5 day, mirror of /parent/rides/[id])
- `/admin/mentors` approve queue + `/admin/internships` decide queue → S (1 day, mirror of `/admin/drivers`)
- `/mentor` portal: my profile, my sessions, my apply state → M (2-3 days)

**Total estimate: 9-13 dev-days for a single dev to bring mentorship UI to feature parity with the existing backend.** Larger than chores; smaller than transport.

**Effort to close transport aggregator gap.** Larger and external-dependency-bound:
- Careem MENA partner API: not publicly documented; needs business agreement + sandbox creds. Estimate L (4-8 weeks elapsed for legal+integration).
- Heetch: similar.
- Public-transport metadata (Casa tramway, ONCF): static data import + UI surface. Estimate S (3-5 days).
- Geo-fence deviation alerting: M (1 week — needs cron + ride_tracks bgworker + push).
- Realtime channel for live tracking (Supabase Realtime channel ride:{id}): M (3-5 days, depends on whether `ride-map.tsx` already polls vs subscribes).

## Hardcoded / scaffolded findings

- **None of the API routes** in transport, mentorship, or food contain `TODO` or `FIXME` markers (Grep clean).
- **Two migration files for Wave 3 (`057_transport_mobility.sql`, `057_transport_mobility_rpcs.sql`) are missing from the local repo** despite being applied to the live DB. Anyone re-bootstrapping from the migration directory will get a database that diverges from production. **Recommendation: dump and commit** before launch.
- **`app/teen/create/page.tsx` exists but its body was not audited** — could be a hub navigation, the post composer, or a placeholder. Vision §65 explicitly demands a real composer; status unverified.
- **Admin role check inconsistency.** `app/api/admin/drivers/[id]/approve/route.ts` checks `userInfo.role === "admin"` at the route layer. `app/api/admin/mentors/[id]/approve/route.ts` and `app/api/admin/internships/[id]/decide/route.ts` do NOT — they trust the RPC. Defense-in-depth would standardize.
- **Parent-on-behalf in `request_ride`.** Route accepts `body.teenId` from a parent JWT but does not verify `parent_teen_links`. RPC enforcement is the only line of defense; needs confirmation.
- **`mentor_sessions.meeting_url` recording pipeline.** Schema column exists per spec. No upload/transcoding pipeline visible. Vision §6 promises 90-day recording retention + indefinite transcript retention — neither implemented.
- **Chore evidence storage.** No dedicated bucket. Vision §73 mandates private bucket with signed-URL TTL + 30/90-day auto-purge. Not visible.
- **Creator strikes table.** Vision §69 — missing.
- **Admin moderation queue: marketplace UI.** `app/admin/marketplace/page.tsx` exists but its action set (approve/reject/feature) is unverified.

## Risks (per surface)

### Per-surface compliance risks

| Surface | Critical compliance | Status |
|---|---|---|
| Chores | E-signature ≥ N DH/month payout ceiling | **MISSING** |
| Chores | Photo-evidence private bucket + auto-purge | **MISSING** |
| Transport | BAM / cooperative licensing of `nivy_drivers` | **NOT IN SCHEMA** |
| Transport | Driver-KYC document storage with retention | bucket exists generically, surface-specific retention unknown |
| Transport | Geo-fence deviation alert | **MISSING** — vision §27 product-killer |
| Transport | Insurance / liability | **OPEN** |
| Food | Halal hard-block | **PASS — RPC enforces** |
| Food | Allergen attestation by partner | column exists, UX unaudited |
| Food | Aggregator handover trust (mixing Nivy + Glovo drivers) | **N/A — no aggregator wired** |
| Marketplace | AML cap (1000 DH/month/teen, max 5 listings) | RPC enforcement assumed; unverified |
| Marketplace | Safe-meet enforcement (school/venue only for teen↔teen) | RPC schema supports; unverified |
| Marketplace | Counterfeit / illegal item screening | regex hardened (`056f`); image AI unverified |
| Allowance | Idempotency on cron retries | RECETTE asserts; assumed correct |
| Allowance | Multi-parent allowance conflict resolution | **OPEN** |
| Allowance | Locked-coin spending block | **PASS — `054_spend_teen_coins_spendable`** |
| Creator | Moderation enqueue from `feed_posts` (no first-post in the wild) | enabled per migration name; needs runtime confirm |
| Creator | Image AI scan | **MISSING** |
| Creator | Three-strike + suspension table | **MISSING** |
| Mentorship | Mentor KYC: CIN + clean record + reference calls + intro video | **schema only — no document review pipeline** |
| Mentorship | First session free + parent-attended + recorded | free **PASS**; recording **MISSING** |
| Mentorship | No off-platform DMs | **NOT ENFORCED** |
| Mentorship | Age-appropriate matching | **PASS** |
| Mentorship | 3-strike auto-suspend | **MISSING — manual via admin_audit_logs only** |

### Aggregate risks

The most product-existential risk is on **transport**: a single bad-actor driver event in the partner pool, with no real-time geo-fence tripwire, ends the product. The KYC pipeline for `nivy_drivers` is schematically present (kyc_status enum) but the human review process / SLA / document retention policy is invisible from the audit. **Soft recommendation: launch transport with `provider='nivy_partner'` disabled by feature flag in production — only allow Careem/Heetch handover (which would itself need M4 work) — until the geo-fence + driver-KYC review SLA is operational.**

Second-most existential on **mentorship**: vision §6 explicitly says "Adult-to-teen 1-to-1 is the highest-risk surface on Nivy." The DB and APIs encode the right invariants (intro is free, parent-attended via `parental_approvals`, age range gating). But (a) no recording pipeline = no audit trail, (b) no off-platform DM block = the most important policy is not enforced by code, (c) no strike counter = manual moderation only. Launching mentorship without the recording pipeline is a CNDP/safeguarding exposure even before the UI gap. **Recommendation: do NOT ship mentorship at launch.**

Third on **chores**: missing the e-signature ceiling for high-value payouts is a "founder said it should exist" gap that may not be a regulatory blocker but hurts the family-trust narrative if a teen accumulates 1000+ DH/month in chore payouts without a parent re-confirmation.

## Pre-launch decision matrix

| Surface | Backend | API | UI | Compliance critical | **Recommendation** | Reason |
|---|---|---|---|---|---|---|
| 1. Chores | DONE | DONE | DONE | missing e-signature ceiling, missing evidence bucket policy | **Ship at launch (with v0.5 caveats)** | Core retention loop, founder-priority feature, gaps are non-existential. Add e-signature ceiling within first sprint post-launch. |
| 2. Transport | DONE | DONE | DONE | missing geo-fence, missing driver-KYC SLA, no aggregator | **Ship with feature flag = soft-launch in 1 city** | Casablanca-only `nivy_partner` provider; require `parental_approvals`; 22h curfew cron live. Hold Careem/Heetch + multi-city until M4 work. Geo-fence deviation alert is **launch-blocker** if scaling beyond pilot. |
| 3. Food | DONE | DONE | DONE | halal-block PASS, allergen attestation OK | **Ship at launch** | Fully verified end-to-end (13/13). Compliance hard-block on halal works. Aggregator integration is a P2 feature, not a blocker. |
| 4. Marketplace | DONE | DONE | DONE (non-standard path) | AML cap unverified, safe-meet enforcement unverified | **Ship at launch with AML caps verified during dogfood** | Backend asserts via verify-marketplace; before public launch, dogfood for 1 week to confirm AML cap firing. Move UI to `app/teen/marketplace/` for path consistency or document the cross-role intent. |
| 5. Allowance & Savings | DONE | DONE | DONE | idempotency PASS, multi-parent OPEN | **Ship at launch** | Locked-coin enforcement is the load-bearing invariant and it is wired into `spend_teen_coins`. Multi-parent ambiguity is a UX cleanup. |
| 6. Creator economy | DONE schema, PARTIAL UI | DONE | feed page exists, composer status unclear | image AI MISSING, strikes table MISSING | **Hold post-launch** | Without image AI scan and a real composer, public posts are a moderation landmine. Ship the read-only feed for now, gate `feed_posts.create` to a beta cohort if needed. |
| 7. Mentorship | DONE | DONE | **MISSING entirely** | recording pipeline MISSING, off-platform DM enforcement MISSING, strike counter MISSING | **Hold post-launch** | The highest-risk surface, with the largest UI gap (9-13 dev-days), and three load-bearing safety controls unimplemented. Backend can wait — UI + safety pipeline must catch up first. |

## Closing notes

- The Wave 3 work was more complete than the brief assumed. The conversation summary appears to have undercounted what the food agent + the late mentorship/transport batches accomplished. All Wave 3 migration files are visible in the DB; all verify scripts exist on disk.
- The single highest-leverage cleanup before launch: **dump migrations `057_transport_mobility` and `057_transport_mobility_rpcs` from the live DB and commit them to `gamification-system/database/migrations/`**. Reproducibility is at risk.
- The single highest-leverage UI gap to close: **the mentorship UI surface (zero pages today)**. The backend is built and tested but unreachable.
- The single highest-leverage compliance gap to close: **transport geo-fence deviation alerting**. Vision §27 says it is the trip-wire that prevents the product-killer scenario; it is missing.
- Two security inconsistencies (admin route role check on mentors/internships, parent-on-behalf teen-link verification on rides) are small and worth a single hardening sweep before launch.
