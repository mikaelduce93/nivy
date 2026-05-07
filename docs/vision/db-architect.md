# Nivy DB Architecture — Canonical Target

> **Date**: 2026-05-07. **Author**: db-architect-auditor.
> **Source of truth**: `docs/vision/PRODUCT_WHITEPAPER.md` (v3) + 22 domain audits.
> **Scope**: target ERD that implementation agents converge to. Live project: `imchornjvmgmaovhypco`.
> **Status**: live DB has **214 public tables**, **5 views**, **34 RLS-on-no-policy** tables, **0** triggers on `auth.users`, **38** numbered migrations applied. This document defines what the schema MUST look like once P0/P1 of the whitepaper ship.

---

## 1. Identity layer (LOCKED per whitepaper §20)

The single source of truth is `auth.users.id`. Every role table uses the **same UUID** as PK and FK to `auth.users(id)`. The legacy public `users` table is **dropped** in migration 040.

```
                       ┌─────────────────────┐
                       │   auth.users        │  ◀── Supabase Auth
                       │   id (UUID PK)      │
                       │   email             │
                       │   raw_user_meta     │
                       └──────────┬──────────┘
                                  │ 1:1 via trigger handle_new_user()
                                  ▼
                       ┌─────────────────────┐
                       │   public.profiles   │  role-discriminated
                       │   id = auth.users.id│
                       │   role ENUM         │  parent|teen|partner|ambassador|admin
                       │   email, full_name  │
                       │   preferred_language│
                       │   is_onboarded BOOL │
                       └─┬────┬────┬────┬────┘
                         │    │    │    │
        ┌────────────────┘    │    │    └─────────────────┐
        │                     │    │                      │
        ▼                     ▼    ▼                      ▼
┌──────────────┐  ┌────────────┐ ┌──────────────┐  ┌─────────────────┐
│ public.teens │  │ parents*   │ │ partner_staff│  │ ambassadors     │
│ id = profile │  │ (= profile │ │ user_id=prof │  │ user_id=profile │
│ grade_level  │  │  with role │ │ partner_id   │  │ code UNIQUE     │
│ school_id    │  │  =parent)  │ │ role         │  │ track,tier      │
│ date_of_birth│  └────────────┘ └──────┬───────┘  └────────┬────────┘
└──────┬───────┘                        │                   │
       │                                ▼                   │
       ▼                         ┌──────────────┐           │
┌──────────────┐                 │ public.partners (id PK)  │
│ user_xp,     │                 │ partner_type ENUM        │
│ user_coins,  │                 │ retail|venue|club|edu    │
│ user_streaks │                 │ status, commission_rate  │
└──────────────┘                 └──────────────────────────┘
```

`*` "parents" is **not** a separate table — a parent is `profiles.role='parent'`. The whitepaper §20 explicitly forbids a parallel `parents` table. The legacy `public.users` table (2 stale rows vs 3 in `profiles`) is the single biggest FK-drift source and is dropped.

---

## 2. Domain map

The ~214 live tables collapse into **10 logical domains**. Per domain: canonical tables (keep), additions (create in migrations 040-050), drops (dead schema § 6).

### D1. Identity (10 tables)
**Keep**: `profiles`, `teens`, `parent_teen_links`, `linking_codes` (new), `admin_roles`.
**Add**: `e_signatures`, `pending_teen_registrations`, `linking_codes`, `family_members` (rename of family_subscriptions's family scope), per-role attribute tables already covered.
**Drop**: `public.users`, any `teen_profiles` legacy refs, `user_progression` (subsumed by `user_xp`).

### D2. Economy / two-currency (15 tables)
**Keep**: `user_xp`, `user_coins`, `xp_transactions`, `coin_transactions`, `xp_weekly`, `xp_monthly`, `xp_payment_settings`, `xp_shop_items`, `shop_rewards`, `reward_categories`, `user_purchases`, `user_wishlists`, `shop_promo_codes`, `promo_code_uses`.
**Add**: `escrow_ledger`, `payment_transactions`, `payment_webhooks`, `cashback_rules`.
**Drop**: parallel `token_*` family if not actively used (`token_types`, `token_sources`, `token_transactions`, `token_redemptions`, `token_transfers`, `token_rewards`, `token_limits_tracking`) — superseded by canonical `xp_*` + `coin_*` per whitepaper §29 invariant 1 ("no third currency").

### D3. Quests + missions (8 tables)
**Keep**: `mission_templates`, `user_missions`, `mission_progress_log`, `seasonal_challenges`, `user_seasonal_progress`, `event_challenges`, `user_event_challenge_progress`, `special_challenges`, `special_challenge_submissions`.
**Add**: `partner_sponsored_challenges`, `quest_assignments_log` (cron audit).
**Drop**: legacy `quests`, `quest_progress`, `daily_challenges`, `user_challenges` (code references that should be repointed).

### D4. Quizzes + AI content (16 tables)
**Keep**: `educational_quizzes`, `quiz_questions`, `quiz_attempts`, `educational_tutorials`, `educational_tutorial_progress`, `ai_generation_templates`, `content_generation_logs`, `content_validations`, `content_factual_verification`, `content_quality_rules`, `content_recommendations`, `content_curriculum_mapping`, `curriculum_subjects`, `curated_content_library`, `personalized_content_assignments`, `daily_content_schedule`, `adaptive_learning_tracker`, `teen_behavioral_profile`, `content_performance_metrics`, `content_reliability_scores`.
**Add**: columns `school_type`, `curriculum`, `language` on `educational_quizzes` (mig 049). New table `quiz_seen_history` to enforce 7-day-no-repeat invariant (whitepaper §29-9).
**Drop**: nothing — content engine is over-built but coherent; just needs RLS policies.

### D5. Partners (12 tables)
**Keep**: `partners`, `partner_discounts`, `sport_clubs`, `teen_club_memberships`, `club_attendance`.
**Add**: `partner_staff`, `partner_xp_awards`, `partner_transactions`, `partner_offers`, `partner_locations`, `partner_payouts`, `kyc_documents` (private bucket FK), `partner_subscriptions`.
**Drop**: never-used `partner_clubs` / `partner_venues` if added by stale audit.

### D6. Events + bookings (8 tables)
**Keep**: `events`, `bookings`, `event_check_ins`, `event_reviews`, `event_challenge_types`, `geolocation_zones`.
**Add**: 12+ columns on `events` (mig 048): `partner_id`, `category`, `age_min`, `age_max`, `capacity`, `price_dh`, `price_coins`, `image_url`, `city`, `address`, `status`, `starts_at`, `ends_at`. Add `booking_tickets`, `booking_approval_requests`, `early_checkout_requests`.
**Drop**: legacy `event_bookings` references (canonical is `bookings`).

### D7. Birthday (5 tables — entirely new)
**Add**: `anniv_packs`, `anniv_extras`, `anniv_orders`, `anniv_order_extras`, `birthday_wishes`.

### D8. Social graph (15 tables)
**Keep**: `friendships`, `friend_requests`, `friend_connections`, `friend_suggestions`, `friend_activities`, `blocked_users`, `circles`, `circle_members`, `circle_invitations`, `circle_messages`, `circle_message_reads`, `circle_polls`, `circle_poll_votes`, `circle_challenges`, `circle_challenge_participants`, `crews`, `crew_members`, `crew_invitations`, `crew_join_requests`, `crew_achievements`, `crew_unlocked_achievements`, `crew_activity_log`, `crew_weekly_stats`, `friend_challenges`, `challenge_participants`, `challenge_progress_log`, `challenge_messages`, `challenge_votes`.
**Add**: nothing — pick canonical `friendships` shape (drop one of the two parallels — see §6).
**Drop**: `feed_*` family if not used by canonical UI (12 tables: `feed_posts`, `feed_likes`, `feed_comments`, `feed_shares`, `feed_views`, `feed_bookmarks`, `feed_mentions`, `comment_likes`, `hashtags`, `post_hashtags`, `hidden_posts`, `feed_muted_users`).

### D9. Notifications (6 tables)
**Keep**: `notification_templates`, `user_notifications`, `notification_preferences`, `notification_triggers`, `notification_analytics`, `push_subscriptions`.
**Add**: nothing — schema already correct; needs PWA `/sw.js` + `/manifest.json` + RLS.

### D10. Avatar (3 tables — entirely new in mig 050)
**Add**: `avatars`, `avatar_messages`, plus existing `user_unlocked_skins`/`user_unlocked_frames`/`user_unlocked_titles`/`user_unlocked_colors`/`user_unlocked_backgrounds`.

### D11. Ambassador (4 tables — new)
**Add**: `ambassadors`, `referral_attribution`, `ambassador_commissions`, `ambassador_payouts`. Add `'ambassador'` to `profiles.role` enum.

### D12. Admin / compliance (5 tables — new)
**Add**: `admin_audit_logs`, `moderation_queue`, `user_reports`, `support_tickets`, `data_exports`. Plus `permissions JSONB` on existing `admin_roles`.

### D13. Academic (3 tables — partial new)
**Keep**: `teen_grades`, `educational_quizzes`.
**Add**: `tutoring_slots`, `tutoring_bookings`, columns `created_by`, `created_by_role`, `evidence_url` on `teen_grades` (mig 049).

---

## 3. Foreign-key spine

The canonical FK rules (whitepaper §20 + invariant 5):

```
                    auth.users (id PK, UUID)
                         │
        ┌────────────────┼─────────────────┐
        ▼                ▼                 ▼
    profiles.id     teens.id        partner_staff.user_id
    (1:1, FK)       (1:1, FK,        (N:1, FK)
                     teens IS-A user)
        │                │
        ▼                ▼
    parent_teen_     user_xp.teen_id
    links.parent_id  user_coins.teen_id
    .teen_id         user_missions.teen_id
                     quiz_attempts.teen_id
                     coin_transactions.user_id
                     xp_transactions.user_id
                     escrow_ledger.teen_id
                     parental_approvals.teen_id
                     teen_budget_limits.teen_id
                     birthday_wishes.to_teen_id
                     anniv_orders.teen_id
```

### Tables that MUST FK to `auth.users(id)`
- `profiles.id`, `teens.id` (PK = FK)
- `partner_staff.user_id`, `ambassadors.user_id`, `admin_roles.profile_id`
- `e_signatures.parent_id`, `escrow_ledger.parent_id`, `parental_approvals.parent_id`
- `user_notifications.user_id`, `notification_preferences.user_id`, `push_subscriptions.user_id`
- `coin_transactions.user_id`, `xp_transactions.user_id`, `payment_transactions.parent_id`

### Tables that MUST FK to `teens(id)`
- `user_xp`, `user_coins`, `user_streaks`, `user_missions`, `user_achievements`, `user_seasonal_progress`, `user_event_challenge_progress`
- `quiz_attempts.teen_id`, `teen_grades.teen_id`, `teen_behavioral_profile.teen_id`
- `escrow_ledger.teen_id`, `parental_approvals.teen_id`, `teen_budget_limits.teen_id`
- `parent_teen_links.teen_id`, `partner_xp_awards.teen_id`, `birthday_wishes.to_teen_id`
- `avatars.teen_id`, `anniv_orders.teen_id`

### Tables that MUST FK to `partners(id)`
- `partner_staff.partner_id`, `partner_discounts.partner_id`, `partner_offers.partner_id`
- `partner_xp_awards.partner_id`, `partner_transactions.partner_id`, `partner_payouts.partner_id`
- `kyc_documents.partner_id`, `events.partner_id`, `anniv_packs.partner_id`
- `tutoring_slots.partner_id`

### Current FK drift to fix
1. `feed_*` family points at `users` (2 rows) while gamification points at `profiles` (3 rows) and `teens` (1 row) → repoint all `feed_*.user_id` to `profiles(id)` then drop `users`.
2. `crews.owner_id`, `crew_members.user_id` → currently `profiles(id)` — keep, harmonized.
3. `friend_connections.teen_id` (teens) vs `challenge_participants.user_id` (auth.users) — pick `teens(id)` for both teen-only contexts; `auth.users(id)` only when adults can participate.
4. `coin_transactions.user_id` and `xp_transactions.user_id` should target `auth.users(id)` (not `teens.id`) so adults — partners crediting commission, ambassadors earning XP — can also have transactions.

---

## 4. RLS / GRANTs strategy (per whitepaper §21)

**Universal rule**: `GRANT SELECT, INSERT, UPDATE, DELETE ON <table> TO authenticated` (PostgREST won't even see the table without GRANT) **AND** at least one explicit RLS policy. Never RLS-on-with-no-policies — that's the bug behind 34 currently-broken tables.

### Policy pattern matrix

| Pattern | Predicate template | Applied to |
|---|---|---|
| **P1 self-read** | `id = auth.uid()` or `user_id = auth.uid()` | `profiles`, `notification_preferences`, `push_subscriptions`, `e_signatures` |
| **P2 teen-self** | `teen_id = auth.uid()` | `user_xp`, `user_coins`, `user_missions`, `user_achievements`, `quiz_attempts`, `teen_grades`, `avatars` |
| **P3 parent-of-teen** | `EXISTS (SELECT 1 FROM parent_teen_links l WHERE l.parent_id = auth.uid() AND l.teen_id = TARGET.teen_id AND l.status = 'active')` | `coin_transactions` (read), `escrow_ledger`, `parental_approvals`, `teen_budget_limits`, `partner_xp_awards`, `birthday_wishes` |
| **P4 catalog read** | `USING (true)` for SELECT only | `achievements`, `mission_templates`, `shop_rewards`, `reward_categories`, `wheel_segments`, `seasons`, `seasonal_challenges`, `vip_tiers`, `vip_perks`, `subscription_plans`, `plan_features`, `notification_templates`, `curriculum_subjects`, `physical_challenges`, `passion_paths`, `educational_quizzes` (where `is_active=true`) |
| **P5 partner-staff scoped** | `EXISTS (SELECT 1 FROM partner_staff s WHERE s.user_id = auth.uid() AND s.partner_id = TARGET.partner_id)` | `partner_offers`, `partner_transactions`, `partner_xp_awards` (insert), `events` (write), `kyc_documents` |
| **P6 admin-only** | `EXISTS (SELECT 1 FROM admin_roles r WHERE r.profile_id = auth.uid())` | `admin_audit_logs`, `moderation_queue`, `user_reports`, all `*_payouts` write paths, `family_subscriptions` write |
| **P7 service-role-only** | `USING (false)` from authenticated; service role bypasses | `payment_transactions`, `payment_webhooks`, `escrow_ledger` (insert), `ambassador_commissions` |
| **P8 ambassador-self** | `EXISTS (SELECT 1 FROM ambassadors a WHERE a.user_id = auth.uid() AND a.id = TARGET.ambassador_id)` | `ambassador_payouts`, `referral_attribution` (read own filleuls) |

### The 34 broken tables (RLS on, 0 policies) get policies in mig 041
Apply per the table above. Each gets at minimum one SELECT policy + role-appropriate INSERT/UPDATE.

---

## 5. Migrations roadmap (ordered, idempotent)

Existing migrations stop at `038_quiz_seed_content.sql`. Numbers `025` and `026` are **gaps** (intentional or lost). New migrations start at **040**.

Every new migration MUST be idempotent (`CREATE TABLE IF NOT EXISTS`, `DO $$ ... IF NOT EXISTS`, `ON CONFLICT DO NOTHING`).

### `040_identity_unification.sql`
**Purpose**: Lock `auth.users.id` as canonical, drop `public.users`, install `handle_new_user` trigger.
**DDL**:
- `CREATE OR REPLACE FUNCTION public.handle_new_user()` (whitepaper §20 body)
- `CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();`
- Backfill `profiles` for any existing `auth.users` without one.
- Repoint all `feed_*.user_id` FKs from `users(id)` to `profiles(id)`.
- `DROP TABLE public.users CASCADE` (after FK repoint).
- Add `'ambassador'` to `profiles.role` enum.
- Fix `init_wheel_streak_trigger` to use `public.wheel_streaks` qualified name (fixes whitepaper §4 bug 12).

### `041_grants_and_rls.sql`
**Purpose**: Apply policy patterns from whitepaper §21 to the 34 broken tables.
**DDL**: For each table list in §4 above, `GRANT ... TO authenticated` + `CREATE POLICY ... ON ... USING (...)` per its pattern. Idempotent via `DROP POLICY IF EXISTS ... ; CREATE POLICY ...`.

### `042_missing_economy_tables.sql`
**Purpose**: complete the two-currency pipeline.
**DDL**:
- `CREATE TABLE escrow_ledger` (per whitepaper §5)
- `CREATE TABLE payment_transactions`
- `CREATE TABLE payment_webhooks`
- `CREATE TABLE cashback_rules` (per-partner override; default 10%)
- Fix `xp_payment_settings` row: ensure `xp_to_dh_rate=100` (whitepaper §27 #2 LOCKED).
- Drop `total_coins` references from `profiles` if any stub column exists.
- `CREATE INDEX` on `(parent_id, created_at DESC)`, `(teen_id, created_at DESC)`.

### `043_missing_parent_tables.sql`
**Purpose**: parent-control + parental authorizations storage.
**DDL**:
- `CREATE TABLE e_signatures` (FK `parent_id → auth.users`; `cin_url` private bucket path).
- `CREATE TABLE parental_approvals` (action_type CHECK enum, expiry_at default NOW()+24h).
- `CREATE TABLE teen_budget_limits` (mode CHECK in autonomous|validation, defaults to validation).
- `CREATE TABLE linking_codes` (6-digit, single-use, 24h TTL).
- `CREATE TABLE pending_teen_registrations` (parent invites teen).

### `044_missing_partner_tables.sql`
**Purpose**: enable 4 partner types, sub-roles, KYC, awards.
**DDL**:
- `CREATE TABLE partner_staff` (role CHECK in owner|staff|coach|teacher).
- `CREATE TABLE partner_xp_awards` (cap-respecting trigger).
- `CREATE TABLE partner_transactions`, `partner_offers`, `partner_locations`, `partner_payouts`.
- `CREATE TABLE kyc_documents` with `file_path TEXT` pointing to **private** bucket `kyc/`.
- Add columns to `partners`: `partner_type` enum (retail|venue|club|education) if missing.

### `045_missing_ambassador_tables.sql`
**Purpose**: enable referral program (whitepaper §12).
**DDL**:
- `CREATE TABLE ambassadors` (track CHECK in cash|xp_only, tier CHECK in bronze|silver|gold).
- `CREATE TABLE referral_attribution` (lifetime by default; `expires_at NULLABLE`).
- `CREATE TABLE ambassador_commissions` (status CHECK in pending|available|paid_out|clawed_back).
- `CREATE TABLE ambassador_payouts`.
- Trigger on `payment_transactions` status='succeeded' → insert commission.

### `046_missing_birthday_tables.sql`
**Purpose**: birthday cron + party booking + wishes (whitepaper §13).
**DDL**:
- `CREATE TABLE anniv_packs`, `anniv_extras`, `anniv_orders`, `anniv_order_extras`, `birthday_wishes`.
- Cron support: idempotency unique on `(teen_id, EXTRACT(YEAR FROM granted_at))` for `xp_transactions` rows of source_type='birthday'.

### `047_missing_admin_tables.sql`
**Purpose**: audit, moderation, support (whitepaper §18).
**DDL**:
- `CREATE TABLE admin_audit_logs` (append-only, 7-year retention).
- `CREATE TABLE moderation_queue` (content_type CHECK, decision nullable).
- `CREATE TABLE user_reports`.
- `CREATE TABLE support_tickets`.
- `CREATE TABLE data_exports` (right-to-erasure / export per CNDP).
- Add `permissions JSONB` on `admin_roles`.

### `048_events_extension.sql`
**Purpose**: align live `events` (9-col stub) with rich UI (whitepaper §14).
**DDL**: `ALTER TABLE events ADD COLUMN IF NOT EXISTS partner_id UUID REFERENCES partners(id), category TEXT, age_min INT, age_max INT, capacity INT, price_dh NUMERIC(10,2), price_coins INT, image_url TEXT, city TEXT, address TEXT, status TEXT DEFAULT 'draft', starts_at TIMESTAMPTZ, ends_at TIMESTAMPTZ;` Add `CREATE TABLE booking_tickets, booking_approval_requests, early_checkout_requests`.

### `049_quiz_adaptation.sql`
**Purpose**: enable per-teen quiz adaptation (whitepaper §7, §15).
**DDL**:
- `ALTER TABLE educational_quizzes ADD COLUMN IF NOT EXISTS school_type TEXT, curriculum TEXT, language TEXT;`
- `ALTER TABLE teen_grades ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id), created_by_role TEXT, evidence_url TEXT;`
- `CREATE TABLE quiz_seen_history` (enforce 7-day no-repeat, whitepaper invariant §29-9).
- `CREATE TABLE tutoring_slots, tutoring_bookings`.

### `050_add_avatar_tables.sql`
**Purpose**: avatar coach persistence (whitepaper §8).
**DDL**:
- `CREATE TABLE avatars (teen_id UUID PK REFERENCES teens(id), name TEXT DEFAULT 'Niv', color TEXT, skin TEXT, last_message_at TIMESTAMPTZ);`
- `CREATE TABLE avatar_messages (id, teen_id, message_text, mood, displayed_at, dismissed_at);`

---

## 6. Drop list (dead schema)

These tables are scaffolding from abandoned features. Drop in mig 040 or later cleanup.

| Table(s) | Reason |
|---|---|
| `public.users` | Parallel to `profiles` with stale rows (2 vs 3); whitepaper §20 LOCKS `auth.users.id` as canonical. |
| `user_progression` | Subsumed by `user_xp` (level + xp_to_next_level live there). |
| `token_types`, `token_sources`, `token_transactions`, `token_redemptions`, `token_transfers`, `token_rewards`, `token_limits_tracking` | Whitepaper §29 invariant 1: no third currency. The two currencies are XP + coins, full stop. The token_* family was an early experiment. Drop unless used by `xp_payment_system` migration 021 — verify before dropping. |
| `feed_posts`, `feed_likes`, `feed_comments`, `feed_shares`, `feed_views`, `feed_bookmarks`, `feed_mentions`, `comment_likes`, `hashtags`, `post_hashtags`, `hidden_posts`, `feed_muted_users` | "Activity feed" is not in any whitepaper spec section. Drop unless founder green-lights social-feed P2 feature. |
| `share_card_templates`, `generated_share_cards`, `share_links`, `share_link_clicks`, `share_rewards`, `user_share_stats` | Social-sharing track parallel to ambassador program. Whitepaper §12 makes ambassador the canonical referral path. Keep `referral_codes`, drop the rest. |
| `sport_clubs`, `teen_club_memberships`, `club_attendance` | Replaced by `partners.partner_type='club'` + `partner_staff` + `partner_xp_awards`. Migrate data first, then drop. |
| `wrapped_*` (4 tables) | Annual wrapped is P2-polish. Keep tables but no work until P0/P1 done. (Not dropped, just inactive.) |

---

## 7. Indexes + performance

Critical indexes (some FK auto-indexed by Postgres, most not). Add in each migration adjacent to the tables created.

```sql
-- Hot read paths (parent_teens_overview view)
CREATE INDEX IF NOT EXISTS idx_parent_teen_links_parent ON parent_teen_links(parent_id) WHERE status='active';
CREATE INDEX IF NOT EXISTS idx_parent_teen_links_teen   ON parent_teen_links(teen_id) WHERE status='active';

-- Wallet reads
CREATE INDEX IF NOT EXISTS idx_user_xp_teen_id        ON user_xp(teen_id);
CREATE INDEX IF NOT EXISTS idx_user_coins_teen_id     ON user_coins(teen_id);
CREATE INDEX IF NOT EXISTS idx_coin_tx_user_created   ON coin_transactions(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_xp_tx_user_created     ON xp_transactions(user_id, created_at DESC);

-- Approvals queue
CREATE INDEX IF NOT EXISTS idx_parental_approvals_parent_status ON parental_approvals(parent_id, status, requested_at DESC);

-- Quiz adaptation lookup
CREATE INDEX IF NOT EXISTS idx_quiz_adapt ON educational_quizzes(grade_level, language, is_active);
CREATE INDEX IF NOT EXISTS idx_quiz_seen ON quiz_seen_history(teen_id, seen_at DESC);

-- Mission cron
CREATE INDEX IF NOT EXISTS idx_user_missions_active ON user_missions(teen_id, expires_at) WHERE completed_at IS NULL;

-- Partner scanner
CREATE INDEX IF NOT EXISTS idx_partner_tx_partner ON partner_transactions(partner_id, scanned_at DESC);

-- Notifications inbox
CREATE INDEX IF NOT EXISTS idx_user_notifs_unread ON user_notifications(user_id, read_at) WHERE read_at IS NULL;

-- Wheel streaks (fixes ON CONFLICT bug)
CREATE UNIQUE INDEX IF NOT EXISTS uq_wheel_streaks_user ON wheel_streaks(user_id);

-- Ambassador attribution
CREATE UNIQUE INDEX IF NOT EXISTS uq_referral_attribution_user ON referral_attribution(referred_user_id);
```

---

## 8. Triggers reference list

All triggers required for the canonical engine. Apply in mig 040 (identity) or mig 041+ (per-domain).

| Trigger name | On table | Fires | Purpose |
|---|---|---|---|
| `on_auth_user_created` | `auth.users` | AFTER INSERT | Run `handle_new_user()` → create `profiles` row (whitepaper §20). |
| `on_profile_role_teen` | `public.profiles` | AFTER INSERT/UPDATE | When role becomes `teen`, create `teens` + `user_xp` + `user_coins` rows. |
| `on_teen_created_init_achievements` | `public.teens` | AFTER INSERT | (existing) Init achievement progression. |
| `on_teen_created_init_gamification` | `public.teens` | AFTER INSERT | (existing) Init missions — verify it actually fires (audit shows `user_missions=0` for the seeded teen). |
| `init_wheel_streak_on_teen` | `public.teens` | AFTER INSERT | (existing, **broken — fix `public.` prefix**) Init `wheel_streaks` row. |
| `on_xp_change_update_leaderboard` | `public.user_xp` | AFTER UPDATE | (existing) Maintain leaderboard. |
| `on_xp_update_check_achievements` | `public.user_xp` | AFTER UPDATE | (existing) Auto-unlock achievements (needs `achievement_triggers` rules). |
| `on_xp_update_missions` | `public.user_xp` | AFTER UPDATE | (existing) Increment quest progress. |
| `on_quiz_complete_update_school` | `public.quiz_attempts` | AFTER INSERT | (existing) Update `teen_behavioral_profile`. |
| `on_coin_spend_cashback` | `public.coin_transactions` | AFTER INSERT WHERE transaction_type='spend' | **NEW** — call `add_xp_to_user(teen_id, floor(amount * cashback_pct))`, insert `xp_transactions` with source_type='cashback'. (Whitepaper §29 invariant 3.) |
| `on_payment_succeeded_credit_coins` | `public.payment_transactions` | AFTER UPDATE WHEN NEW.status='succeeded' | **NEW** — UPSERT `user_coins.balance`, insert `escrow_ledger(direction='top_up')`, insert `coin_transactions(transaction_type='topup')`. |
| `on_payment_succeeded_referral` | `public.payment_transactions` | AFTER UPDATE WHEN NEW.status='succeeded' | **NEW** — Check `referral_attribution`, insert `ambassador_commissions` row. |
| `on_payment_refunded_clawback` | `public.payment_transactions` | AFTER UPDATE WHEN NEW.status='refunded' | **NEW** — Reverse escrow + commission clawback. |
| `on_admin_action_audit` | trigger function called from RPCs | AFTER per-action | **NEW** — Append to `admin_audit_logs`. |
| `trigger_circle_join_xp` | `circle_members` | AFTER INSERT | (existing) +XP for joining a circle. |
| `trigger_friendship_level_up` | `friendships` | AFTER UPDATE | (existing). |
| `on_partner_award_approved_credit_xp` | `partner_xp_awards` | AFTER UPDATE WHEN NEW.approved_by_parent=true | **NEW** — Calls `add_xp_to_user(teen_id, amount, 'partner_award', awarder_id)`. |
| `on_birthday_grant_idempotent` | `xp_transactions` | BEFORE INSERT | **NEW** — Reject duplicate birthday gift in same year. |

---

## 9. Views reference list

Views power dashboards and abstract FK joins. The 5 existing views (`parent_teens_overview`, `teen_full_profile`, `v_leaderboard_all_time`, `v_leaderboard_monthly`, `v_leaderboard_weekly`) stay. Add:

| View | Purpose |
|---|---|
| `parent_wallet_overview` | Joins `family_subscriptions` + per-teen `user_coins` + total escrow + tier discount → drives `/parent` KPI hero. |
| `partner_kpi_overview` | Joins `partner_transactions` aggregates + commission + active offers → `/partner` hero. |
| `ambassador_dashboard` | Joins `referral_attribution` + `ambassador_commissions` + payouts pending → `/ambassador` hero. |
| `quest_assignment_status` | Per-teen counts of active daily/weekly/monthly/seasonal — debugs cron idempotence. |
| `pending_approvals_per_parent` | `parental_approvals` counts grouped by `parent_id` → notification fan-out source. |
| `teen_xp_provenance` | Joins `xp_transactions` with humanized source labels (quiz, défi, partner_award, birthday, cashback, ambassador) → `/teen/wallet` history tab. |

---

## 10. Migration execution playbook

For an implementation agent applying these in order:

1. **Read the whitepaper section** matching the migration purpose (e.g. mig 042 → §5 economy spec).
2. **Inspect live state first**: `mcp__claude_ai_Supabase__list_tables` and `execute_sql SELECT … pg_policies WHERE schemaname='public' AND tablename='X'`. Confirm what already exists. Migrations are **idempotent** by contract; running twice is safe.
3. **Test on a Supabase branch first**: `mcp__claude_ai_Supabase__create_branch`, apply, verify acceptance criteria, then merge. Never apply DDL directly to production without a branch test.
4. **Apply via `mcp__claude_ai_Supabase__apply_migration`** with the migration filename as `name` (e.g. `040_identity_unification`). The MCP server records it in `supabase_migrations.schema_migrations`.
5. **Verify acceptance criteria** from the matching whitepaper section. For mig 040 that's: "an `auth.users` row insert spawns a `profiles` row".
6. **Cross-check invariants** (whitepaper §29). For mig 042 (economy): no XP↔coin conversion path was added; every coin debit triggers cashback in same transaction; service-role-only on `payment_transactions`.
7. **Commit** the SQL file under `gamification-system/database/migrations/` for traceability (numbering 040+).
8. **Run Playwright smoke**: at minimum `auth.fixture` + a parent-topup or teen-spend flow. Acceptance criteria from whitepaper §5.
9. **If a migration fails partway**, roll back via `mcp__claude_ai_Supabase__reset_branch` (branch only — production has no rollback). Each migration must be re-runnable from clean.
10. **Order is hard-required**: 040 (identity) → 041 (RLS) before any data-bearing migration. 042-046 are independent. 048 must run after 044 (events FKs partners). 049 after 044 (tutoring FKs partners). 050 after 040 (avatars FKs teens).

### Dependency graph

```
040 identity ──┬──▶ 041 RLS ──┬──▶ 042 economy ──┬──▶ 043 parent_tables
               │              │                  └──▶ 045 ambassadors (cash track depends on payments)
               │              ├──▶ 044 partners ─┬──▶ 048 events_ext
               │              │                  └──▶ 049 quiz_adapt (tutoring FK partners)
               │              ├──▶ 046 birthday (FK partners for anniv_packs)
               │              └──▶ 047 admin
               └──▶ 050 avatars (FK teens)
```

### Smoke acceptance after the full stack lands

- ☐ A new `auth.users` insert auto-creates `profiles` row.
- ☐ A teen spend → `coin_transactions` row + `xp_transactions(source_type='cashback')` row + `escrow_ledger(direction='spend')` row, all in same DB transaction.
- ☐ A parent top-up via PSP webhook → `payment_transactions.status='succeeded'` triggers escrow + coin balance UPSERT.
- ☐ Coach awards XP → `partner_xp_awards` row → parental approval (if cap exceeded) → `add_xp_to_user` on approve.
- ☐ Birthday cron grants +500 XP **once** per teen per year.
- ☐ A teen never sees a quiz they passed in the last 7 days (`quiz_seen_history` enforced).
- ☐ A non-admin authenticated client gets RLS-rejection on every `*_payouts`, `payment_transactions`, `escrow_ledger` write — only service role passes.

---

## Summary

Target schema: ~190 tables (after dropping ~25 dead, adding ~30 new). Identity LOCKED on `auth.users.id`. Two currencies (XP + coins) with cashback bridge enforced by trigger. RLS policies on every table — never RLS-on-no-policy. 11 numbered migrations (040-050) take the live schema to canonical. Each is idempotent, branch-testable, and tied to a whitepaper section. Implementation agents converge here.

*End of architect doc. ≈ 18 KB. Tables cited: 60+. ASCII ERD blocks: 5.*
