# C5 — Backend vs Frontend Reality Gap

**Audit date:** 2026-05-08
**Scope:** read-only analysis of `gamification-system/database/migrations/*.sql`, `app/api/**/route.ts`, and frontend usage in `app/**`, `components/**`, `lib/**`, `hooks/**`.
**User concern verbatim:** _"tout ce qui est en back end et en db ne reflete pas le frontend et que tout ne marche pas"_

> **Method note.** "Used by frontend" = referenced in client/server code under `app/`, `components/`, `lib/`, or `hooks/` via either `.from("table")`, `.rpc("fn")`, or a `fetch("/api/...")` (incl. template-literal forms). API routes are matched against the static prefix up to the first dynamic `[param]`. Trigger functions (`trigger_*`, `_*_touch`) and pure utility helpers (`to_utc_date`, `generate_short_code`) are correctly **never** called from the frontend — they live behind triggers — so they appear in "backend-only" but should be ignored.

---

## Section 1 — Stats Overview

| Surface | Defined in backend | Referenced by frontend | Wired ratio |
|---|---:|---:|---:|
| **Tables** (CREATE TABLE in migrations) | **245** | 240 distinct `.from(...)` names | — |
| Tables actually present in DB **and** used | — | **119** | **48.6 %** of DB tables wired |
| Tables defined but never used (ghost) | **126** | — | **51.4 %** dead schema |
| Tables called from frontend but **not in migrations** (phantom / broken) | — | **121** | — |
| **RPCs** (CREATE OR REPLACE FUNCTION) | **257** | 94 distinct `.rpc(...)` names | — |
| RPCs defined and called | — | **77** | **30.0 %** of RPCs wired |
| RPCs defined, never called from frontend | **180** | — | (incl. ~50 trigger/util fns that are correctly server-only) |
| RPCs called by frontend but **missing from migrations** (broken) | — | **17** | — |
| **API routes** (`app/api/**/route.ts`) | **251** | ~142 referenced from UI | — |
| API routes never referenced from UI | **96** | — | **38.2 %** unwired |

### Headline numbers

- **Roughly half (51 %) of the database schema is dead weight from the frontend's perspective.** Most of it is V1.0/V1.1 ambition (mini-games, advent calendars, VIP tiers, profile customization, annual wrapped, season system, social-sharing v1) that was migrated but never got a UI.
- **17 RPCs are called from the UI but do not exist in any migration** — these are real bugs (silent 500s in production). See §3.
- **121 distinct table names are used in code but absent from the migration files** — these are either views/legacy tables created out-of-band, typos, or features that bypass the migrations folder. Many of them refer to the legacy "v1" schema (`activities`, `quests`, `daily_challenges`, `clubs`, `events`, `partner_offers`, `partners`, `profiles`, `users`, `transactions`, `xp_ledger`) — strongly suggesting the codebase has at least **two parallel schemas** (the migrations-folder schema and a separately-managed legacy schema) and the UI freely reads from both. Without prod DB introspection we cannot say how many of these actually exist live; assume **the bulk fail at runtime**.
- **96 of 251 API endpoints (38 %) are not called by the UI**, but **~25 of those are cron jobs** (legitimately invoked by Vercel cron, not by users) and **~10 are admin/ambassador surfaces with no built admin UI yet**. Net "ghost endpoints with no caller and no cron" sits around **~60 routes**.

---

## Section 2 — BACKEND-ONLY (Top 20 Ghost Features)

Tables/RPCs that exist in the DB but the frontend never touches. Hypotheses noted.

| # | Surface (table or RPC group) | Migration | Hypothesis |
|---|---|---|---|
| 1 | **Mini-games** — `mini_game_types`, `mini_game_sessions`, `mini_game_participants`, `music_quiz_questions`, `memory_game_cards`, `prediction_questions`, `user_predictions`, `daily_game_scores`, `weekly_game_leaderboard` + RPCs `create_game_session`, `join_game_session`, `start_game_session`, `submit_game_score`, `end_game_session`, `make_prediction`, `resolve_prediction`, `get_game_leaderboard` | 011 | **V1.0 backlog.** `app/teen/games/games-client.tsx` exists (265 lines, 1 array literal) but does **not** wire to any of these. UI is mocked. |
| 2 | **VIP system** — `vip_tiers`, `vip_perks`, `user_vip_status`, `vip_benefits_log`, `vip_exclusive_items` + RPCs `calculate_vip_tier`, `add_vip_xp`, `get_user_vip_status`, `claim_monthly_vip_coins` | 017 | **V1.0 backlog.** `app/teen/vip-card/` exists (2 files, only 1 has any backend call). Confirmed mocked surface. |
| 3 | **Annual Wrapped** — `user_annual_wrapped`, `wrapped_highlights`, `wrapped_comparisons`, `wrapped_achievements` + RPCs `generate_user_wrapped`, `generate_wrapped_highlights`, `generate_wrapped_achievements`, `get_user_wrapped`, `get_public_wrapped` | 013 | **Seasonal feature, no UI.** No `/wrapped` page exists. |
| 4 | **Profile customization** — `profile_frames`, `profile_titles`, `profile_colors`, `profile_backgrounds`, `user_profile_customization`, `user_unlocked_frames/titles/colors/backgrounds` + RPCs `get_user_customization_items`, `equip_profile_item`, `unlock_profile_item` | 014 | **V1.0 backlog.** `app/teen/profile/` only does basic profile reads, none of these tables. |
| 5 | **Collections** — `collection_sets`, `collectible_items`, `user_collectibles`, `user_collection_progress`, `collection_trades` + RPCs `add_collectible_to_user`, `get_random_collectible`, `get_user_collections`, `claim_set_completion_rewards` | 015 | **Partial.** `/teen/achievements` redirects to `/gamification/collections`, but no `.from("collection_sets")` or `.rpc("get_user_collections")` was found in `app/`. Likely the collections page is itself mocked. |
| 6 | **Seasonal challenges + Advent calendar** — `seasons`, `seasonal_challenges`, `user_seasonal_progress`, `advent_calendars`, `advent_calendar_days`, `user_advent_progress`, `seasonal_rewards`, `user_seasonal_rewards` + 5 RPCs (`get_seasonal_challenges`, `open_advent_day`, etc.) | 010 | **V1.0 backlog.** No surface mentions "advent" or "season" in the teen routes. |
| 7 | **Special challenges** — `special_challenge_types`, `special_challenges`, `special_challenge_submissions`, `challenge_votes` + RPCs `create_special_challenge`, `submit_challenge_entry`, `vote_on_submission`, `complete_special_challenge`, `get_active_special_challenges`, `process_special_challenges` | 008 | **V1.0 community-vote feature, never shipped UI.** |
| 8 | **Event challenges + check-in** — `event_challenges`, `event_challenge_types`, `user_event_challenge_progress`, `event_check_ins` (DB table), `event_reviews` + RPCs `check_in_to_event`, `check_out_from_event`, `complete_event_challenge`, `submit_event_review`, `get_event_challenges`, `get_user_event_stats` | 009 | **V1.0.** Note: `app/teen/events/` exists (events-client.tsx, 156 lines) but has **0 backend calls** — fully mocked. The `check-in/*` routes that exist (`api/check-in/{entry,exit,verify-pass}`) use a **different** schema (the phantom `check_in_logs` / `check_ins` tables, not the `event_check_ins` migration table). |
| 9 | **Crews v1** — full `crew_*` tree (8 tables) + RPCs `create_crew`, `invite_to_crew`, `respond_to_crew_invitation`, `request_to_join_crew`, `handle_join_request`, `leave_crew`, `update_crew_stats`, `check_crew_achievements`, `get_crew_leaderboard` | 007 | **Replaced by Circles (023) + Friend Challenges v2 (073/078).** Frontend uses `circles` and `circle_*` tables, NOT `crews`. Only `get_user_crew` is still called (in `app/teen/crew/page.tsx` — vestigial). Recommend deprecating crews in V1.4. |
| 10 | **Friend Challenges v1** — `challenge_types`, `challenge_participants`, `challenge_progress_log`, `challenge_messages`, `challenge_votes` + RPCs `create_friend_challenge`, `respond_to_challenge`, `start_challenge`, `update_challenge_progress`, `complete_challenge`, `get_user_challenges`, `check_expired_challenges` | 006 | **Replaced by `friend_challenges_v2`** (used via `*_v2` RPCs). v1 is dead. |
| 11 | **Onboarding gamification** — `onboarding_progress` + RPCs `init_onboarding_progress`, `record_onboarding_step`, `sync_onboarding_to_user`, `get_onboarding_progress` | 020 | **API-only.** UI calls `/api/teen/onboarding/{interests,goals,learning-style,complete}`, which presumably handle persistence server-side but the migration's `onboarding_progress` table is never read. Worth verifying the API routes write to it. |
| 12 | **Stats Dashboard** — `user_daily_activity`, `user_lifetime_stats`, `user_monthly_stats`, `user_milestones`, `platform_averages`, `user_personal_records` + RPCs `get_user_dashboard_stats`, `update_lifetime_stats`, `check_user_milestones`, `get_activity_stats`, `update_personal_record` | 012 | **Mostly trigger-driven backend, no UI.** Stats may auto-populate via triggers (`trigger_update_lifetime_stats`), but no surface displays them. `/teen/profile` would be the natural home. |
| 13 | **Notification templates engine** — `notification_templates`, `notification_triggers`, `notification_analytics` + RPCs `create_notification_from_template`, `send_custom_notification`, `mark_notifications_read`, `get_user_notifications`, `claim_notification_rewards`, `group_similar_notifications` | 016 | **Partial.** Frontend uses `user_notifications` directly via `.from(...)` instead of the templated engine. The whole template/trigger/analytics layer is unused. |
| 14 | **Social sharing v1** — `sharing_platforms`, `share_templates`, `user_shares`, `share_image_templates`, `sharing_achievements`, `user_sharing_achievements`, `user_sharing_stats`, `referral_uses` + RPCs `create_share`, `check_sharing_achievements`, `track_share_click`, `get_or_create_referral_code`, `use_referral_code`, `complete_referral` | 019 | **Replaced by `social_shares` + `share_links` + `share_card_templates` (037).** v1 dead. |
| 15 | **Cron RPCs visible in DB but not surfaced** — `process_special_challenges`, `expire_old_missions`, `cleanup_old_onboarding_progress`, `cleanup_stale_presence`, `marketplace_auto_release_escrow`, `prune_expired_mentor_recordings`, `recompute_neighbours`, `refresh_creator_monthly_stats` | various | **Cron-only — correct.** These should only fire from `app/api/cron/*`. Audit: `marketplace_auto_release_escrow` IS called by `cron/marketplace-escrow-release` (good), and `prune_expired_mentor_recordings` by `cron/mentor-recording-retention` (good). The others — verify they're scheduled. |
| 16 | **Curated content fallback** — `curated_content_library`, `content_quality_rules`, `content_curriculum_mapping`, `curriculum_subjects`, `personalized_content_assignments`, `daily_content_schedule`, `ai_generation_templates`, `content_performance_metrics`, `content_reliability_scores`, `adaptive_learning_tracker` + RPCs `validate_quiz_content`, `get_curated_content_fallback`, `calculate_content_match_score`, `calculate_content_reliability` | 032/033/034/036/067 | **Server-side personalization machinery.** Mostly correct to be backend-only (it's a cron + recommender pipeline), but **`get_curated_content_fallback` is called from the UI** — a positive signal. The rest is internal. |
| 17 | **Internship applications** — `internship_applications` table | 059 | **Broken wiring.** Frontend has `app/teen/internships/` (2 files) and calls `/api/teen/internships/[id]/apply` and `/api/admin/internships/[id]/decide` — but the `.from("internship_applications")` query is missing from frontend code. Either RPCs `apply_to_internship` + `decide_internship_application` (the latter doesn't exist!) handle it server-side, or the read path is broken. |
| 18 | **Mentor session recordings** — `mentor_session_recordings`, `mentor_strikes` + RPCs `mentor_strikes_autosuspend`, `mentor_recording_validate_path`, `prune_expired_mentor_recordings`, `mentor_can_dm_teen` | 064 | **Trigger/cron only — correct.** Recordings table has no UI; that's intentional (privacy/CNDP). Strikes table IS read by frontend (`mentor_strikes`) — good. |
| 19 | **XP Shop / XP payments** — `xp_shop_items`, `xp_payment_settings`, `xp_weekly`, `xp_monthly` | 021/030 | **Tables exist, UI uses `xp_ledger` (phantom!) and `xp_transactions` instead.** XP shop never built. |
| 20 | **Wishlist / wheel bonus / wheel streak** — `user_wishlists`, `user_bonus_spins`, `wheel_streaks`, `user_wheel_spins` + RPCs `toggle_wishlist`, `init_wheel_streak`, `get_wheel_history`, `spin_wheel` | 004/005 | **Wheel UI never built.** `spin_wheel` and friends never called. |

---

## Section 3 — FRONTEND-ONLY (Real Bugs: UI calls non-existent backend)

These are **active bugs** — code that will fail at runtime.

### 3a. RPCs called from frontend that DO NOT EXIST in any migration (17 broken)

| RPC name | Where it's called (sample) | Likely intent | Severity |
|---|---|---|---|
| `add_user_xp` | wallet/quests | Should be `add_xp_to_user` (exists) | **HIGH** — XP awards silently fail |
| `add_path_xp` | pathways | No equivalent — needs to be created | **HIGH** |
| `admin_approve_mentor` | admin/mentors | Should be inline UPDATE or new RPC | **MEDIUM** |
| `apply_mentor` | mentor/apply | Maps to API route `mentor/apply` — RPC name probably wrong | **MEDIUM** |
| `approve_ride` | parent/rides | No RPC — only `request_ride` / `cancel_ride` / `complete_ride` exist | **HIGH** — parents can't approve rides |
| `decide_internship_application` | admin/internships | API exists, RPC missing | **HIGH** |
| `decrement` / `increment` | shop/wallet | Helper RPCs supabase users typically create — likely missing | **MEDIUM** |
| `deduct_user_xp` | wallet | Should be `spend_teen_coins` / `spend_tokens`? Naming mismatch | **HIGH** |
| `exec_sql` | admin/execute-sql | Dangerous — likely intentionally not deployed | **OK if intentional** |
| `execute_document_purge` | admin or cron/purge-documents | Cron RPC missing | **MEDIUM** |
| `get_user_xp` | many | Should read from `user_xp` table directly | **MEDIUM** |
| `increment_points` | ambassador/shop | RPC missing | **MEDIUM** |
| `parent_deny_session` | parent/mentor-sessions | Has `parent_approve_session` but no `_deny` counterpart | **HIGH** |
| `rate_mentor_session` | teen/mentor-sessions/rate | API exists, RPC missing | **HIGH** |
| `record_signal` | teen/signals/record | Personalization signal capture broken? | **HIGH** — kills perso engine |
| `redeem_ambassador_reward` | ambassador/shop/redeem | Missing | **MEDIUM** |

### 3b. Tables called from frontend that are NOT defined in migrations (121 phantom names)

These split into three categories. Without a live `\dt` from prod we can't be 100 % sure what exists, but the pattern is clear.

**Category A — almost-certainly-real (legacy schema managed outside `migrations/` folder):**
`profiles`, `users`, `parents`, `children`, `parent_teen_links`, `partners`, `partner_offers`, `partner_discounts`, `clubs`, `events`, `bookings`, `payment_transactions`, `transactions`, `xp_ledger`, `notifications`, `quests`, `quest_progress`, `daily_challenges`, `challenges_templates`, `shop_items`, `shop_purchases`, `referrals`, `support_tickets`, `webhook_events`, `audit_logs`, `documents`, `e_signatures`, `parental_approvals`, `parent_chores`, `parent_chore_completions`, `teen_full_profile`, `teen_budget_limits`, `pending_teen_registrations`, `weekly_leaderboard_snapshots` …
→ The fact that **the codebase has two parallel schemas** (the migrations folder vs the live legacy DB) is the single biggest source of the "rien ne marche" feeling. Recommend a one-time `pg_dump --schema-only` audit to reconcile.

**Category B — clearly typos / drift (will 404 at query time):**
- `activities` (UI) vs `user_activities` (DB)
- `activity_logs` (UI) vs `audit_logs`/`mission_progress_log`
- `admin_audit_logs` (UI) vs no equivalent
- `affinity_scores` (UI) — likely meant `recommendation_metrics_daily` or a missing perso table
- `behavioral_signals` (UI) — should map to `teen_behavioral_profile` or be a new table
- `creations` (UI) vs `teen_creations` (DB)
- `interest_taxonomy` (UI) — never created
- `quiz_completions` (UI) vs `quiz_attempts` (DB)
- `referral_usage` (UI) vs `referral_uses` (DB) — singular/plural mismatch
- `teen_passion_paths` (UI) vs `passion_paths` + `teen_passion_path_progress` (DB)
- `tutorial_completions` (UI) vs `educational_tutorial_progress`/`passion_tutorial_progress`
- `user_badges` (UI) vs `user_achievements` (DB)
- `user_challenges` (UI) — no such table; could mean `friend_challenges` or `physical_challenges`
- `user_coins_spendable` (UI) — derived value, no table
- `user_gamification` (UI) — should be split across `user_xp`, `user_coins`, `user_streaks`
- `user_points` (UI) — likely `ambassador_points`
- `xp_ledger` (UI) vs `xp_transactions` (DB)
- `vip_cards` (UI) vs `vip_tiers` + `user_vip_status`

**Category C — V1.4 features whose tables were never created:**
`anniv_celebrations`, `anniv_orders`, `anniv_packs` (birthday flow), `cash_settlements`, `escrow_ledger` (used in payments UI but the table is in `marketplace_*` instead), `early_checkout_requests`, `data_exports`, `discount_usage`, `djs`, `influencer_campaigns`, `kyc_documents`, `partner_subscriptions`, `partner_locations`, `partner_venues`, `pass_subscriptions`, `photo_galleries`, `photo_gallery_items`, `post_categories`, `post_likes`, `posts`, `social_activities`, `teen_connections`, `teen_goals`, `teen_interests`, `venue_event_packages`, `venue_menu_items`.
→ These need migrations or the corresponding UI must be deleted/redirected.

### 3c. Special call-out — `.from("table")`

Found in code. Literal string `"table"`. This is a placeholder that escaped review. **Bug.** Find and fix.

---

## Section 4 — MOCKED Top 10 (UI rendering with no backend connection)

Pages with **zero** `.from()`, `.rpc()`, or `fetch("/api/...")` calls in their entire directory.

| # | Page | Files | Status | Disposition |
|---|---|---|---|---|
| 1 | `app/teen/games/` | `games-client.tsx` (265 lines, 1 hardcoded array) | **Fully mocked** | Mini-games schema exists (mig 011) — wire it OR redirect to `/teen/quiz`. |
| 2 | `app/teen/coins/` | `coins-client.tsx` (167 lines) | **Fully mocked** | Should read `user_coins` + `coin_transactions` (both exist in DB). Trivial fix. |
| 3 | `app/teen/calendar/` | `calendar-client.tsx` (307 lines, **4 hardcoded arrays**) | **Fully mocked** | No calendar table exists. Either build one or remove the route. |
| 4 | `app/teen/passions/` | `passions-client.tsx` (502 lines, 1 hardcoded array) | **Fully mocked** | `passion_paths`, `teen_passion_path_progress`, `passion_tutorials` all exist — wire them. **HIGH PRIORITY** since whitepaper §4.2 sells this hard. |
| 5 | `app/teen/academic/` | `academic-client.tsx` (693 lines, 3 hardcoded arrays) | **Fully mocked** | `educational_quizzes`, `educational_tutorials`, `teen_grades` all exist. Wire to `/api/teen/education/*` (which IS implemented). |
| 6 | `app/teen/circles/` | `circles-client.tsx` (332 lines) | **Fully mocked** | `/api/teen/circles` exists; circles_* tables exist. Wire it. |
| 7 | `app/teen/events/` | `events-client.tsx` (156 lines) | **Fully mocked** | Either wire to `event_challenges` (mig 009) or partner `events` (legacy schema). |
| 8 | `app/teen/streak/` | `page.tsx` (99 lines, 1 array) | **Fully mocked** | `user_streaks` table exists — trivial wire. |
| 9 | `app/teen/xp-value/` | `page.tsx` (771 lines, **3 arrays**) | **Fully mocked** | This is the big "convert XP into rewards" explainer. Should pull `xp_payment_settings` + `xp_shop_items` (both exist). |
| 10 | `app/teen/vip-card/` | 2 files, only 1 has any wiring | **Mostly mocked** | `vip_tiers` schema (017) is full ghost. Either wire it or remove the page. |

Honourable mentions (zero backend calls but possibly intentional stubs): `app/teen/achievements` (redirects to `/gamification/collections`), `app/teen/map` (redirects to `/teen/social?tab=map`), `app/teen/challenges` (alias of `defis-physiques`).

---

## Section 5 — Recommendation: 10 Backend Features That Should Ship a UI in V1.4

Prioritized by (a) backend completeness, (b) whitepaper promise, (c) effort to wire.

| Rank | Feature | Why now | Effort |
|---|---|---|---|
| 1 | **Coins page wiring** (`/teen/coins`) | Tables `user_coins` + `coin_transactions` exist, page is 167-line mock. 1-day fix. | XS |
| 2 | **Streak page wiring** (`/teen/streak`) | `user_streaks` + `update_user_streak` RPC ready. Foundational habit loop. | XS |
| 3 | **Academic surface** (`/teen/academic`) | All endpoints live (`/api/teen/education/*`), 693 lines of UI mocked. Closes the school pillar promise. | S |
| 4 | **Passions surface** (`/teen/passions`) | Whitepaper centrepiece, full schema (passion_paths, passion_path_levels, passion_tutorials, teen_creations) ready. Currently a 502-line mock. | M |
| 5 | **Circles wiring** (`/teen/circles`) | `/api/teen/circles*` and `circle_*` tables ready. UI is a 332-line mock. Social pillar is otherwise empty. | S |
| 6 | **Wallet → XP shop** (`/teen/xp-value` + `/teen/shop`) | `xp_shop_items`, `xp_payment_settings` exist, `purchase_reward` RPC exists. 771 lines of UI to wire. Direct revenue/retention impact. | M |
| 7 | **User stats dashboard** in `/teen/profile` | `get_user_dashboard_stats` RPC + `user_lifetime_stats` table fully populated by triggers. Currently nothing displays them. | S |
| 8 | **Notifications template engine** | `notification_templates` + `create_notification_from_template` exist; UI bypasses them with raw `user_notifications`. Wiring the templated path enables push variety + analytics. | M |
| 9 | **VIP card** (`/teen/vip-card`) | Mig 017 fully built (`calculate_vip_tier`, `get_user_vip_status`, `claim_monthly_vip_coins`). Premium retention hook. | M |
| 10 | **Internship application read path** | API + write RPC almost ready; missing `decide_internship_application` RPC + frontend `.from("internship_applications")` query. Career pillar credibility. | S |

### Fix-also-required-for-V1.4 (debt blockers)

Before shipping the wins above, the **17 phantom RPCs** (§3a) must be fixed — they cause silent failures across XP awards, ride approvals, signal capture, mentor session ratings, and parent denials. **`record_signal` missing means the entire personalization engine is dark.** This is the highest-value 2-day fix in the whole audit.

### Debt-cleanup recommendation (V1.5+)

- **Schema reconciliation pass.** Run `pg_dump --schema-only` against prod and reconcile against `migrations/`. Any table in the live DB that isn't in migrations should either be migrated in or deleted. Any table in migrations not in prod should either be applied or deleted. This single action will clarify what's "ghost" vs "legacy".
- **Deprecate v1 systems.** `crews`, `friend_challenges` v1, `social_sharing` v1 (mig 019) — drop the tables, drop the RPCs. They confuse new contributors and bloat the type generator.
- **Deprecate or wire** the seasonal/advent/wrapped/special-challenge/mini-game subsystems. They represent ~40 tables and ~25 RPCs of dead weight.

---

## Appendix A — Verification queries (for live DB)

```sql
-- 1. Confirm phantom RPCs really don't exist
SELECT proname FROM pg_proc
WHERE proname IN (
  'add_user_xp','add_path_xp','admin_approve_mentor','apply_mentor','approve_ride',
  'decide_internship_application','deduct_user_xp','execute_document_purge',
  'get_user_xp','increment_points','parent_deny_session','rate_mentor_session',
  'record_signal','redeem_ambassador_reward'
);
-- expect: empty or near-empty result set

-- 2. Confirm phantom tables in category B (typos)
SELECT tablename FROM pg_tables WHERE schemaname='public'
AND tablename IN ('activities','creations','quiz_completions','referral_usage',
  'teen_passion_paths','tutorial_completions','user_badges','user_challenges',
  'user_gamification','xp_ledger','vip_cards');
-- any rows here = a real table managed outside migrations/ — needs to be added to migrations
```

## Appendix B — Source artifacts

- DB tables list: `/tmp/all_tables.txt` (245 entries)
- DB RPCs list: `/tmp/all_rpcs.txt` (257 entries)
- API routes list: `/tmp/api_routes.txt` (251 entries)
- Frontend `.from(...)` calls: `/tmp/used_tables.txt` (240 distinct names)
- Frontend `.rpc(...)` calls: `/tmp/used_rpcs.txt` (94 distinct names)
- Frontend `/api/*` references: `/tmp/all_api_refs.txt` (167 distinct prefixes)
- Tables defined-but-unused: `/tmp/tables_unused.txt` (126)
- Tables phantom (used-but-undefined): `/tmp/tables_phantom.txt` (121)
- RPCs defined-but-unused: `/tmp/rpcs_unused.txt` (180)
- RPCs phantom (used-but-undefined): `/tmp/rpcs_phantom.txt` (17)
- API routes never called: `/tmp/api_unused.txt` (96, of which ~25 are crons)
