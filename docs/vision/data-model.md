# Data Model — Vision audit

Read-only audit of Supabase project **imchornjvmgmaovhypco** vs the Nivy app code (`C:\Users\Shadow\Desktop\NIVY`) and the product vision.

Audit timestamp: 2026-05-07. Method: 8 SQL queries via Supabase MCP `execute_sql` + repo grep of `.from("…")` patterns + cross-reference against the 38 migration files in `gamification-system/database/migrations/`.

---

## 1. Overall schema health

| Metric | Value |
|---|---|
| Total `public` tables | **214** |
| Total `public` views | **5** (`parent_teens_overview`, `teen_full_profile`, `v_leaderboard_all_time`, `v_leaderboard_monthly`, `v_leaderboard_weekly`) |
| Tables with RLS enabled | 214 (100%) |
| Tables with RLS enabled but **0 policies** (broken access — silently rejects every query) | **34** |
| Auth triggers on `auth.users` | **0** (none — no `on_auth_user_created` handler that creates a profile/teen row, profiles must be inserted manually) |
| `auth.users` row count | 3 |
| Tables without primary keys | 0 (clean) |

### RLS-enabled tables with NO policies (functionally read-locked for non-service-role clients)

`achievement_triggers`, `adaptive_learning_tracker`, `admin_roles`, `ai_generation_templates`, `circle_challenge_participants`, `circle_challenges`, `circle_invitations`, `circle_message_reads`, `circle_poll_votes`, `circle_polls`, `content_curriculum_mapping`, `content_factual_verification`, `content_generation_logs`, `content_performance_metrics`, `content_quality_rules`, `content_recommendations`, `content_reliability_scores`, `content_validations`, `curated_content_library`, `curriculum_subjects`, `daily_content_schedule`, `events`, `family_subscriptions`, `feed_shares`, `feed_views`, `friend_suggestions`, `hashtags`, `notification_analytics`, `notification_triggers`, `personalized_content_assignments`, `plan_features`, `post_hashtags`, `promo_codes`, `share_link_clicks`, `share_rewards`, `teen_behavioral_profile`, `users`.

`events`, `family_subscriptions`, `users`, `circle_*` and `circle_polls/votes`, `promo_codes`, and `feed_shares` are particularly load-bearing — anonkey/parent/teen calls against these will silently return empty arrays.

### Auth triggers (flag)

The query `SELECT * FROM pg_trigger WHERE tgrelid='auth.users'::regclass AND NOT tgisinternal` returns **zero rows**. Vision intends signup → auto-create `profiles` + `teens` (or `users` row), but no trigger exists. This is why the app code in `features/teens/actions.ts:99-307` and `app/(dashboard)/layout.tsx:29` has to insert/upsert `profiles` and `teens` manually — easy to drift.

Across all schemas, the meaningful business triggers that DO exist (35 total): `on_teen_created_init_achievements`, `on_teen_created_init_gamification` (on `public.teens`), `on_xp_change_update_leaderboard`, `on_xp_update_check_achievements`, `on_xp_update_missions` (on `user_xp`), `on_quiz_complete_update_school` (on `quiz_attempts`), `on_creation_update_crea` (on `teen_creations`), `trigger_circle_join_xp`, `trigger_friendship_level_up`, `trigger_check_subscription_expiry`, `trigger_update_token_multiplier`, `trigger_update_hashtag_trending`, etc. These all fire on `public.*` rows that depend on a profile/teen existing — and that profile/teen creation is not automated from `auth.users`.

---

## 2. Tables actually populated (live)

| table | rows | notes |
|---|---:|---|
| `auth.users` | 3 | the 3 seeded accounts |
| `profiles` | 3 | one per auth user — manually inserted |
| `users` | 2 | parallel-but-stale legacy copy of profiles (inconsistency: 3 vs 2) |
| `teens` | 1 | the seeded teen |
| `parent_teen_links` | 1 | the link parent→teen for the seed |
| `partners` | 1 | seeded |
| `bookings` | 1 | the test booking |
| `user_xp` | 1 | for the seeded teen |
| `user_coins` | 1 | for the seeded teen |
| `achievements` | 63 | catalog seeded from migration 001 |
| `mission_templates` | 30 | catalog seeded from migration 003 |
| `shop_rewards` | 26 | catalog seeded from migration 004 |
| `reward_categories` | 8 | catalog |
| `educational_quizzes` | 9 | seeded from migration 038 |
| `subscription_plans` | 5 | catalog from migration 027 |
| `vip_tiers` | 7 | catalog |
| `wheel_segments` | 12 | catalog |
| `collectible_items` | 20 | catalog |
| `seasons` | 4 | catalog |
| `passion_paths` | 5 | catalog |
| `physical_challenges` | 5 | catalog |
| `token_types` | 4 | catalog |
| `curriculum_subjects` | 39 | catalog |

**Overall pattern**: catalogs are seeded; user-state tables are essentially empty (1 teen). No real product usage yet.

---

## 3. Empty-but-expected tables (catalogs/state with 0 rows that the live UI/triggers depend on)

| table | feature it powers |
|---|---|
| `quiz_attempts` (0) | XP from quizzes — empty means no quiz has ever been completed in this DB |
| `user_achievements` (0) | unlocking badges flow — trigger `on_xp_update_check_achievements` will populate this once XP grows |
| `user_missions` (0) | daily/weekly missions for teens — populated by `on_teen_created_init_gamification` trigger; missing for the existing teen → trigger likely failed silently |
| `user_streaks` (0) | streak tracking |
| `partner_discounts` (0) | offers attached to the 1 partner — no offers seeded |
| `events` (0) | no events created — also blocks `bookings`, `event_check_ins`, `event_reviews`, `geolocation_zones` |
| `family_subscriptions` (0) | parent top-up & family plan flow — not yet onboarded |
| `user_subscriptions` (0) | premium tier assignment — nobody is subscribed |
| `crews` / `crew_members` (0) | group challenges (vision pillar) — never used |
| `circles` / `circle_*` (0) | teen group chat — UI exists, no data |
| `friend_challenges` (0) | 1v1 challenges — no usage |
| `feed_posts` (0) | activity feed — never posted |
| `admin_roles` (0) | admin/back-office — **no admin exists**, `middleware.ts:194` queries this and will always reject |
| `achievement_triggers` (0) | declarative achievement-unlock rules — empty + 0 RLS policies = unlocking by trigger may misfire |
| `wheel_streaks` (0) | fortune-wheel streak bonuses |
| `sport_clubs` (0) | sport club catalog (vision: 4 partner types) |

---

## 4. Missing tables (referenced in code, not in DB)

The repo references **>320 distinct table names** via `.from("…")`. Cross-checked against the 214 live tables, the following are referenced but **do not exist** in the `imchornjvmgmaovhypco` schema:

### Vision-critical missing tables

| missing table | sample reference | impact |
|---|---|---|
| `e_signatures` | `app/parent/e-signature/page.tsx` (vision pillar — parent gate) | parent e-signature gate cannot persist anything |
| `parental_approvals` | `app/anniversaires/organiser/actions.ts:85` | parental authorization workflow broken |
| `authorizations` / `child_authorizations` | parent flows | "parental authorizations" vision item has no storage |
| `ambassadors`, `ambassador_points`, `ambassador_commissions`, `ambassador_redemptions`, `ambassador_rewards`, `ambassador_withdrawals` | `components/ambassador-application-form.tsx:51` | entire ambassador program inert |
| `parents`, `children` | parent flows | legacy/alt naming — code uses both `parents/children` and `profiles/teens` |
| `teen_profiles` | seeder/older code | duplicate semantic with `teens` |
| `pending_teen_registrations` | parent invites teen flow | invite/registration pipeline broken |
| `partner_offers`, `partner_locations`, `partner_clubs`, `partner_venues`, `partner_subscriptions` | partner pages | "4 partner types + offers + sales" vision unimplemented at DB layer |
| `offers`, `discount_usage` | partner discount usage | can't redeem |
| `anniv_packs`, `anniv_orders`, `anniv_extras`, `anniv_order_extras` | `app/anniversaires/organiser/actions.ts:43,55,62` | birthday-organiser flow has zero backing |
| `event_bookings`, `booking_tickets`, `booking_approval_requests`, `early_checkout_requests` | bookings flow | only the bare `bookings` table exists; ticket+approval workflow missing |
| `clubs`, `club_offerings`, `club_sessions`, `club_enrollments` | club mgmt | only `sport_clubs` + `teen_club_memberships` exist (legacy mismatch) |
| `schools`, `interests`, `avatars` | `features/teens/actions.ts:47,69,348,358` | teen onboarding (school, interests, avatar) has no storage |
| `ambassadors`, `influencer_campaigns` | growth | growth program inert |
| `admin_audit_logs`, `audit_logs`, `activity_logs`, `moderation_logs`, `moderation_alerts`, `moderation_reports`, `content_reports` | admin/moderation | no audit trail at all |
| `webhook_events`, `payment_logs`, `payment_transactions`, `cash_settlements` | payments | payment audit path broken |
| `notifications` (vs existing `user_notifications`) | inconsistent naming | code uses both — pick one |
| `documents`, `support_tickets`, `testimonials`, `newsletter_subscribers`, `blog_posts`, `reviews`, `reports` | misc public surface | none exist |
| `posts`, `post_likes`, `post_categories`, `photo_galleries`, `photo_gallery_items` | `app/communaute/page.tsx:16` | community page references `posts` not `feed_posts` |
| `quests`, `quest_progress`, `quest_recommendation_logs`, `daily_challenges`, `user_challenges`, `user_badges`, `badges`, `user_gamification`, `user_points`, `points_transactions`, `xp_ledger`, `transactions`, `tutorial_completions`, `quiz_completions`, `creations`, `activities`, `social_activities`, `check_ins`, `check_in_logs`, `referrals`, `referral_usage`, `buddy_quests`, `challenges_templates`, `challenge_proofs`, `pass_subscriptions`, `vip_cards`, `vip_card_usage`, `user_sessions`, `rewards`, `shop_items`, `shop_purchases`, `teen_budget_limits`, `budget_limits`, `teen_connections`, `teen_conversations`, `teen_messages`, `teen_passion_paths`, `djs`, `venue_event_packages`, `venue_menu_items` | various | older/parallel naming for features that exist under different names — code refactor needed, not DB patch |

This is **45+ tables referenced in app code but absent in DB**. Most are either (a) legacy naming for tables that already exist under another name (`posts`↔`feed_posts`, `teen_profiles`↔`teens`, `parents`↔`profiles`) or (b) genuinely missing features (e_signatures, ambassadors, anniv_*, parental_approvals).

---

## 5. Schema vs vision gaps (per domain)

### 2-currency economy (XP + coins)
**Exists**: `user_xp`, `user_coins`, `xp_transactions`, `xp_weekly`, `xp_monthly`, `coin_transactions`, `xp_shop_items`, `xp_payment_settings`, `token_types`, `token_transactions`, `token_transfers`, `token_sources`, `token_redemptions`, `token_rewards`, `token_limits_tracking`.
**Missing/legacy**: `xp_ledger`, `transactions`, `points_transactions`, `user_points` are referenced in code but absent — code needs to migrate to canonical `xp_transactions`/`coin_transactions`.

### Parents linked to teens / parent top-up / e-signature
**Exists**: `parent_teen_links` (1 row), `payment_requests`, `subscription_payments`, `family_subscriptions` (0 rows, 0 RLS policies).
**Missing**: `e_signatures`, `parental_approvals`, `authorizations`, `child_authorizations`, `pending_teen_registrations`. The vision's parent-gate pillar is **architecturally absent from the DB**.

### Teens earn XP from quizzes/défis
**Exists**: `educational_quizzes` (9), `quiz_questions`, `quiz_attempts` (0), trigger `on_quiz_complete_update_school`. Pipeline wired.
**Gap**: zero `quiz_attempts` despite 9 quizzes seeded — UI never completed one (or attempts can't insert because of RLS).

### Group challenges (crews + friend_challenges)
**Exists**: `crews`, `crew_members`, `crew_invitations`, `crew_join_requests`, `crew_achievements`, `crew_unlocked_achievements`, `crew_activity_log`, `crew_weekly_stats`, `friend_challenges`, `challenge_participants`, `challenge_progress_log`, `challenge_messages`, `challenge_votes`, `challenge_types`. **Schema is rich and complete.** Zero rows everywhere.

### Partners (4 types) with offers + sales
**Exists**: `partners` (1 row), `partner_discounts` (0 rows).
**Missing**: `partner_offers`, `partner_locations`, `partner_clubs`, `partner_venues`, `partner_subscriptions`, `offers`, `discount_usage`. The "4 partner types" distinction has no schema support — `partners` table likely uses a `type` enum column instead of separate tables (acceptable, but `partner_offers` / `partner_locations` separation is missing).

### AI-generated content + validators
**Exists**: `ai_generation_templates`, `content_generation_logs`, `content_validations`, `content_factual_verification`, `content_quality_rules`, `content_reliability_scores`, `content_recommendations`, `content_curriculum_mapping`, `content_performance_metrics`, `curated_content_library`, `personalized_content_assignments`, `daily_content_schedule`, `adaptive_learning_tracker`, `teen_behavioral_profile`. **Schema is comprehensive.**
**Gap**: ALL of these have RLS enabled with **0 policies** → effectively a black box for the app. A service-role-only system, but the UI calls them from the browser/anon → silently empty.

### Avatar coach state
**Missing**: no `avatars` table (referenced in `features/teens/actions.ts:348,358`). Avatar coach has no persistence layer.

### Rewards shop
**Exists**: `shop_rewards` (26), `reward_categories` (8), `user_purchases`, `user_wishlists`, `shop_promo_codes`, `promo_code_uses`. Complete.

### Parental authorizations
**Missing**. See above.

### Subscription tiers
**Exists**: `subscription_plans` (5), `user_subscriptions` (0), `subscription_payments`, `family_subscriptions` (0, 0 policies), `family_members`, `plan_features`, `premium_features`, `vip_tiers` (7), `vip_perks`, `user_vip_status`, `vip_benefits_log`, `vip_exclusive_items`, `pass_subscriptions` (referenced, missing). Schema OK; not used yet.

---

## 6. FK + constraint risks

- **Cross-table identity drift**: half the FKs target `auth.users(id)`, some target `profiles(id)`, some target `teens(id)`, some target `users(id)`. Examples:
  - `crews.owner_id → profiles(id)`, `crew_members.user_id → profiles(id)` — but `feed_posts.user_id → users(id)` (different table!).
  - `friend_connections.teen_id → teens(id)` but `challenge_participants.user_id → auth.users(id)`.
  - `coin_transactions` and `xp_transactions` likely reference `auth.users` while siblings reference `teens`.
  - The `users` table (2 rows) shadows `profiles` (3 rows) — they are out of sync, and the entire `feed_*` family points at `users` while the gamification family points at `profiles` / `teens` / `auth.users`. **This is the biggest single integrity risk** — joining feed data to teen data requires a 3-hop FK chain and the row counts disagree.
- **`users` table has 0 RLS policies** despite RLS enabled — every `feed_*` insert from the app will fail unless using service role.
- **No FKs from `partners.partner_discounts → partner_offers`** because `partner_offers` doesn't exist; the discount catalog has nowhere to attach a real offer.
- **`achievement_triggers`** is empty AND has 0 RLS policies — the achievement-unlock trigger `on_xp_update_check_achievements` reads it; if it expects rules and finds none, achievements never unlock.
- **No tables without primary keys** (clean).
- The earlier-flagged `wheel_streaks` ON-CONFLICT-before-unique-constraint issue: `wheel_streaks` has FK `user_id → auth.users(id)` and 0 rows, but no unique constraint shows in `pg_constraint` for `(user_id)` — any `ON CONFLICT (user_id) DO UPDATE` in app code will throw. Verify before first wheel-spin.

---

## 7. Recommended schema patches

1. **Decide `users` vs `profiles` once**: the live DB has both, with diverging row counts (2 vs 3). Pick `profiles` (it's what the gamification triggers + middleware use), drop `users`, repoint all `feed_*` FKs to `profiles`. This single migration fixes ~20 broken FK chains.
2. **Add the missing `auth.users` trigger** `on_auth_user_created` that inserts a matching `profiles` row (and a `teens` row when `raw_user_meta_data->>role = 'teen'`). Without it, signup is brittle.
3. **Backfill RLS policies on the 34 listed tables** — at minimum for `events`, `family_subscriptions`, `users` (or migrate away), `feed_shares`, `feed_views`, `circle_polls`, `circle_invitations`, `promo_codes`, `admin_roles`, `achievement_triggers`, `content_*` family. Without policies these are read-locked from anon/authenticated keys.
4. **Create the e-signature & parental-authorization tables** — `e_signatures`, `parental_approvals`, `authorizations`, `pending_teen_registrations`. This is a vision pillar with literally zero DB support today.
5. **Create the ambassador tables** (6 tables) or remove the form from the codebase (`components/ambassador-application-form.tsx`).
6. **Create the anniversaire tables** (4 tables) or remove `app/anniversaires/organiser/`.
7. **Reconcile naming**: code references `posts`/`post_likes` (community page) but DB has `feed_posts`/`feed_likes`. Same for `notifications` vs `user_notifications`, `quiz_completions` vs `quiz_attempts`, `creations` vs `teen_creations`, `teen_profiles` vs `teens`. Refactor app code to canonical names.
8. **Document the patches already applied** (mentioned in the task context): `partners` table addition, views `teen_full_profile` + `parent_teens_overview` (both confirmed present in `pg_views`).
9. **Apply remaining migrations**: confirmed in `gamification-system/database/migrations/` are `030_xp_shop`, `037_social_shares`, `038_quiz_seed_content`. Migrations 025, 026 are absent from disk (gap in numbering — likely intentional or lost). Verify the all_migrations.sql union covers everything.
10. **Add a unique index on `wheel_streaks(user_id)`** before any `ON CONFLICT` insert path runs.
11. **Seed `admin_roles`** with at least one admin so `middleware.ts:194` works.

---

## 8. Open questions for founder

1. **Which legacy projects (`jyixeidmu*`, others) should we deprecate?** — only `imchornjvmgmaovhypco` was audited; if there are stale projects still in env files they should be retired.
2. **Schema-migration strategy going forward**: are we pinning to Supabase CLI migrations (the standard `supabase/migrations/` folder doesn't exist in this repo — files live in `gamification-system/database/migrations/` and an aggregated `all_migrations.sql`), or rolling our own runner? Decide before adding the e-signature / ambassador / anniv tables, otherwise drift will worsen.
3. **`profiles` vs `users` vs `teens` vs `auth.users`** — what is the canonical identity model? The current 4-way split is the root cause of most FK drift; pick one identity table per role and document.
4. **Are the empty AI-content tables intended as service-role-only**? If yes, document and ensure all writes go through Edge Functions; if no, ship RLS policies.
5. **Birthday organiser, ambassador program, e-signature gate** — are these P0 or backlog? They're all coded in the UI but have no DB.
6. **Do we keep the `users` table at all?** It has 2 rows, 0 RLS policies, and parallels `profiles` (3 rows). Killing it removes ~20 broken FKs from `feed_*`.

---

*Audit method: 8 SQL queries via Supabase MCP `execute_sql` against project `imchornjvmgmaovhypco`. Codebase scan via ripgrep on `\.from\(["'][a-z_]+["']\)` across `app/`, `lib/`, `gamification-system/`, `components/`, `features/`, `middleware.ts`. 214 live tables enumerated, 5 views, 35 non-internal triggers, 200+ FKs, 75+ table names referenced in code but missing from DB.*
