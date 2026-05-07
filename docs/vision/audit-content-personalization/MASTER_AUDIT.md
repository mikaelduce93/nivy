# Nivy — Master Audit: Content & Personalization

> **Auditor**: chef-orchestrator (read-only)
> **Date**: 2026-05-08
> **DB**: `imchornjvmgmaovhypco` (live, ACTIVE_HEALTHY)
> **Scope**: 4 founder questions on quiz/défi sourcing, profile-aware delivery,
> and UI completeness. Brutally honest, citing file paths + DB row counts.

---

## Executive verdict

**🟡 AMBER overall.** The bones of an end-to-end content + personalization
engine are now in place after Wave 1.x — schema (`51`, `52`, `66`),
`recommend_for_teen` RPC, `record_signal` capture, nightly
`evolve-teen-profiles` cron, `quiz_seen_history` 7-day invariant, plus
`curated_content_library` (30 rows, V1.2 fallback). Daily-content cron
crashes are fixed. **But the production reality is that almost no item
carries the metadata the recommender needs**, so personalization
collapses to "affinity-only on items with empty `tags`" — i.e., near
random selection. Several of the four content sources (parent, friend,
partner, AI/system) are at very different maturity levels:

- **Quiz**: 🟡 — schema in place, recommender wired, but only 1 of 9
  active quizzes has any tag (`partner_offers` 1/1, `mission_templates`
  0/30, `physical_challenges` 0/5). 7-day no-repeat invariant is
  enforced in code (`lib/quiz/server.ts:155-160`) but `quiz_seen_history`
  has 0 rows live.
- **Parent défi**: 🟢 schema and UI **shipped** (`parent_chores` 2 rows,
  `parent_chore_completions` 10 rows), per-teen, full payout pipeline
  exists. Profile-aware: NO (parent decides; recommender does not score
  chores).
- **Friend défi**: 🔴 — `friend_challenges` table exists (migration
  `006`) but **0 rows live**, 0 active UI surfaces (legacy
  `app/gamification/defis/page.tsx` is now a permanent redirect to
  `/teen/quests`, and `/teen/quests` does not include a friend-challenge
  tab). Net: feature unwired today.
- **Partner défi**: 🔴 — partners can post `partner_offers`/`partner_discounts`
  (one row, V1.1 stubs) but **cannot launch custom challenges**;
  `app/partner/offers/page.tsx` is a hardcoded mock. The schema
  divergence between the API contract (`partner_discounts.discount_name`
  …) and the live `partner_offers` minimal shape was already flagged in
  `docs/vision/partner-network.md:58` and is still unresolved.
- **AI/system défi**: 🟡 — `mission_templates` 30 rows exist,
  `assign_missions_for_teen` RPC fans out daily, daily content cron is
  fail-closed and cohort-aware — but cohort grouping does NOT drive
  per-teen selection, only batch creation; subject mapping is a 9-line
  heuristic (`generate-daily-content/route.ts:113-131`).

**Personalization**: 🟡 — the rails ship (50-tag taxonomy, signals
capture, affinity_scores, recommender RPC). **Live data is
near-empty** (3 affinity rows, 15 behavioral_signals, 0
content_recommendations, 0 teen_neighbours), AND content is largely
untagged, so the ranker has nothing to rank on.

**UI/UX**: 🟡 — most launch-blocking surfaces are functional. Several
mocks remain (`/partner/offers` hardcoded, `/partner/{kyc,payouts,invoices,support}`
per V1.1 follow-up #7), and key teen surfaces (avatar coach, twin-currency
gauge, quiz personalization slot) are not yet wired.

---

## Question 1 — How are QUIZZES made?

### 1.1 Current state

**Three sources coexist:**

1. **Admin-curated `educational_quizzes` (the canonical pool)** —
   `gamification-system/database/migrations/022_pillars_system.sql`
   creates the table; `038_quiz_seed_content.sql` seeds 9 rows. Live
   count: **9 active rows**, all FR, grade range 3eme-6eme. Subjects:
   math (2), french (2), science, english, geography, history, culture.
   The teen runner reads exclusively from this table:
   `lib/quiz/server.ts:23-29` (categories) and
   `lib/quiz/server.ts:142-149` (single-quiz fetch).

2. **Curated fallback library** —
   `gamification-system/database/migrations/067_curated_content_library_seed.sql`
   loaded **30 rows** into `curated_content_library` (`content_type='quiz'`,
   `is_public=true`, `validated_at` set, `usage_count=0`). These are
   *not* exposed to the teen runner today: `lib/quiz/server.ts` does
   not query this table; the AI cron uses it as a safety-block fallback
   pathway in `lib/ai/content-generator.ts:108-117` (`getFallbackQuiz`).
   Net: **dead inventory** unless the AI generator falls through.

3. **AI-generated daily** — cron at `0 1 * * *` UTC,
   `app/api/cron/generate-daily-content/route.ts`. Wave 1.1 P2.4 fixed
   the column-list crash by switching to a cohort grouping
   (`grade_level / school_type / curriculum / primary_language`,
   lines 56-108) and pulling top interests from `teen_interests`
   (lines 198-216). Caps fan-out at 12 cohorts/run. Generated quizzes
   land in `educational_quizzes` with `code='DAILY_<date>_<cohort>_<ts>'`.
   Safety filter (`checkContentSafety`) runs twice — inside the
   generator (line 113-117) and again in the cron (line 257-265).
   `content_generation_logs` is **empty** (0 rows), so the cron has
   never produced anything in production despite the `vercel.json`
   entry.

### 1.2 Daily quiz selection logic

`lib/quiz/server.ts:89-189 getDailyQuizForTeen` — the single function
that picks "today's quiz" per teen.

1. Tries `recommend_for_teen('quiz', 1)` RPC
   (`gamification-system/database/migrations/052_recommend_for_teen_v1.sql:5-14`)
   → returns top item by `w1*affinity + w4*novelty + w5*context +
   w6*difficulty - p1*recently_seen` (collab + friend weights set to 0
   in v1).
2. Filters in the RPC (lines 81-84): `is_active=true`, `grade_level`
   matches teen if any quiz exists at that grade. Hard filter on
   `quiz_seen_history` last 7 days (lines 66-70).
3. If RPC returns nothing, falls back to lowest-id active quiz not in
   `quiz_seen_history` last 7 days (lines 122-138).
4. Always upserts `quiz_seen_history(teen_id, quiz_id, last_seen)` —
   this enforces whitepaper §29 invariant 9. **However:
   `quiz_seen_history` is empty in DB (0 rows)**, so the invariant has
   never actually fired in production.

### 1.3 Profile match

| Profile field         | Used? | Where |
|---|---|---|
| `grade_level`         | ✅ soft-match | `052_recommend_for_teen_v1.sql:82-84` (with self-bypass if no match exists) |
| `school_type`         | ❌ not in candidate filter | spec calls for it (`personalization-engine.md:612-624`); RPC ignores |
| `curriculum`          | ❌ not in candidate filter | same |
| `primary_language`    | ❌ not in candidate filter | hardcoded FR in seed |
| `interests` / tags    | ⚠️ partial — `affinity_scores` summed but quizzes have **0/9 tags** | `educational_quizzes.tags` has 1/9 populated |
| `affinity_scores`     | ✅ summed by `recommend_for_teen` | aggregated nightly by `evolve-teen-profiles` |
| `quiz_attempts`       | ❌ never read by selector | even though `quiz_attempts` carries `passed` |
| `behavioral_profile`  | ❌ never read | `teen_behavioral_profile` 0 rows |

In short: the only personalization actually flowing today is grade-level
soft-match. Tags are absent from the candidate metadata, so
`affinity_match` returns 0 for almost every quiz.

### 1.4 Gaps vs spec

- **Tags missing on 8/9 quizzes** (DB read 2026-05-08). Migration 051
  added the column; backfill never happened.
  `gamification-system/database/migrations/051_personalization_engine.sql`
  (referenced in `personalization-engine.md:866`) declares
  `idx_quizzes_tags GIN(tags)` but the index has nothing to bucket.
- **`curated_content_library` is a parallel dead pool** — 30 rows that
  the teen runner cannot reach. Either fold into `educational_quizzes`
  or surface via the recommender.
- **AI cron has never run successfully against live** —
  `content_generation_logs` 0 rows, `daily_content_schedule` 0 rows.
  The cron is registered (`vercel.json:cron #12`) but no audit row
  shows execution. Either cron auth fails silently or `OPENAI_API_KEY`
  is missing in prod (V1.1 follow-up notes "rotate
  `SUPABASE_SERVICE_ROLE_KEY` + `OPENAI_API_KEY`").
- **Stale model id** still pinned to `claude-3-sonnet-20240229`
  (`lib/ai/content-generator.ts:78`). For 2026 it must move to
  `claude-opus-4-5` / `claude-sonnet-4-5` / equivalent — old IDs return
  404.
- **Pedagogical reviewer** is unbuilt: `content_validations` 0 rows,
  no admin queue. `lib/ai/pedagogical-validator.ts` is callable but
  has no UI.
- **No language match** — quizzes are FR-only, no `language` filter on
  fetch.

### 1.5 Risks

- A teen at `3eme` will see 6eme quizzes if no 3eme exists (RPC has a
  silent self-bypass at line 83-84). Acceptable shortcut, but reduces
  perceived "school adapté" promise.
- `quiz_seen_history` upsert happens *before* the teen sees the quiz
  (lines 155-160), so a refresh on the daily card "burns" a quiz even
  if the teen never opens it.
- AI cron generating into the same canonical `educational_quizzes` table
  with `is_active=true` means an unsafe (but somehow-passed-safety) AI
  quiz would surface to ALL teens, not just the requesting cohort.

---

## Question 2 — How are DÉFIS made (4 sources)?

### 2.1 Parent-issued chores (parent_chores)

**Schema**: `parent_chores(id, parent_id, teen_id, title, reward_dh,
reward_xp, recurrence, recurrence_config, starts_at, ends_at,
required_completions, evidence_required, is_active, …)` — verified live.

**Live**: 2 rows in `parent_chores`, 10 rows in
`parent_chore_completions` (both verification probes).

**Per-teen vs family-wide**: per-teen — `teen_id` is a non-null FK.
Sibling fan-out requires N rows. Spec
(`docs/vision/parent-custom-chores.md:84-86`) flagged this as an open
question; current implementation took "single teen target".

**End-to-end trace**:
- Creation: `app/parent/chores/new/page.tsx` form →
  `app/api/parent/chores/create/route.ts` → INSERT.
- Teen view: `app/teen/chores/page.tsx:39-46`.
- Teen completion: `components/teen/teen-chore-complete-button.tsx` →
  `app/api/teen/chores/[id]/complete/route.ts` → INSERT into
  `parent_chore_completions` (with `parent_verified=null`).
- Verification: `components/parent/chore-verify-buttons.tsx` →
  `app/api/parent/chores/[id]/verify-completion/route.ts` →
  UPDATE `parent_verified=true` + payout RPC (per spec §reward payout
  flow §163-173).
- Reward: `coin_transactions` insert + XP cashback. `coin_transactions`
  has 15 rows live, plumbing is live (vs the V1.0 audit which showed
  it absent).

**Profile-aware**: NO. Parent picks teen + reward; chores never enter
`recommend_for_teen` candidate set. They surface in
`/teen/quests` only via the unified hub aggregator
(`lib/server/unified-quest-engine.ts`, used at
`app/teen/quests/page.tsx:37`).

**Gaps**: photo evidence pipeline not validated (the bucket policy is
deferred per `docs/vision/parent-custom-chores.md:158`); negative
chores ("didn't take trash → -10 DH") deferred; multi-parent
verification rule not implemented (first-wins assumption only).

### 2.2 Friend-issued défis (friend_challenges)

**Schema**: `friend_challenges(id, challenge_type_id, creator_id, name,
target_value, stake_xp, starts_at, ends_at, status, winner_id,
winning_team, is_draw)` — verified live.

**Live**: **0 rows.** Migration `006_friend_challenges.sql` predates
the personalization engine and was never wired to a UI.

**End-to-end**: BROKEN. The legacy surface at
`app/gamification/defis/page.tsx` is now a `permanentRedirect("/teen/quests")`
(`app/gamification/defis/page.tsx:8-10`). The replacement promised by
Wave E ("merged into a tab on /teen/quests") **has not landed** —
`app/teen/quests/quests-hub-client.tsx` does not include a
friend-challenge tab; only daily/weekly/monthly/seasonal cadences from
`getUnifiedQuests`. There is no API surface
(`app/api/teen/friend-challenges/` does not exist).

**Profile-aware**: N/A — there is nothing to score.

**Gaps**: ALL gaps. Need (a) creation form, (b)
opponent-picker (probably leveraging
`recommend_friends` once it's built), (c) acceptance flow, (d)
progress tracker, (e) winner determination job, (f) XP stake escrow.
None of those exist today.

### 2.3 Partner-launched défis

**Live**: `partner_offers` 1 row (synthetic verify), `partner_discounts`
0 rows, `partner_transactions` 8 rows, `partners` 1 row.

**Schema mismatch unresolved**: `partner_offers` (live) has 14
columns: `id, partner_id, title, description, offer_type, discount_pct,
price_coins, price_dh, capacity, valid_from, valid_until, is_active,
created_at, tags`. The partner UI / API
(`app/api/partner/offers/route.ts:33-54`) reads from
`partner_discounts` with 17 columns including `discount_name`,
`discount_type`, `min_vip_level`, `applicable_categories`. **Two
parallel offer tables exist; the API targets the older one which is
empty.** This was flagged in
`docs/vision/partner-network.md:43` and never reconciled.

**Custom-défi capability**: NONE. The
`partner_offers.offer_type` column accepts any text; there is no
`offer_type='challenge'` flow, no quest-completion capture for
partner-issued tasks. A partner cannot say "Visit our store this week
= 200 XP" except by writing a discount offer that the teen redeems
at the scanner.

**End-to-end**: partner registers (`app/api/partners/register/route.ts`)
→ status `pending` → admin approval (UI at `app/admin/partners/`,
backend partial) → offer create (`app/api/partner/offers/route.ts:80-218`,
writes to `partner_discounts`) → teen sees ??? (no teen-side
partner-offer surface ranks them). The scanner flow
(`app/partner/scanner/page.tsx`) calls `/api/partner/verify-card` and
`/api/partner/apply-discount` against tables that don't exist
(`vip_cards`, `discount_usage` — see partner-network.md:36).

**Profile-aware**: indirect. `recommend_for_teen` accepts
`p_content_type='partner_offer'` (RPC supports it; route handler
allows it at
`app/api/teen/recommendations/route.ts:16`). But (a) only 1
`partner_offers` row exists, (b) it has 1 tag (`music_pop`), and (c)
no UI surface calls `/api/teen/recommendations?type=partner_offer`.

**Gaps**: (1) reconcile `partner_offers` ↔ `partner_discounts`,
(2) add partner-quest type, (3) build teen-side discovery,
(4) wire scanner to real tables.

### 2.4 AI / system missions (mission_templates)

**Live**: 30 rows in `mission_templates`, 132 rows in
`mission_progress_log`, 10 rows in `user_missions`, 162 rows in
`xp_transactions`, 5 rows in `physical_challenges`. The system is
definitely live and producing XP.

**Source mix**:
- 30 hand-seeded templates (migration `020_onboarding_gamification.sql`
  + `022_pillars_system.sql`) covering daily/weekly/monthly/seasonal
  cadences (samples: `daily_login` 10 XP, `daily_xp_50` 30 XP,
  `weekly_streak_5` 100 XP).
- AI-generated rows from the daily cron — 0 today (cron has not
  successfully run, see Q1).

**End-to-end**:
1. Cron `assign-missions` (`app/api/cron/assign-missions/route.ts`)
   runs at 00:05 Casa, calls `assign_missions_for_teen` RPC for every
   recently-active teen (last sign-in ≤ 90 days).
2. RPC tops up to 3 daily / 3 weekly / 3 monthly / 1 seasonal in
   `user_missions`.
3. Teen sees the active set on `/teen/quests` via
   `getUnifiedQuests()` → `lib/server/unified-quest-engine.ts`.
4. Completion fires through standard
   `mission_progress_log` → `add_xp_to_user` RPC → cashback chain.

**Per-profile**: NO. `assign_missions_for_teen` does not consult
`affinity_scores`/interests/grade — it picks the top N by
`mission_type` and `is_active=true`. Wave 1.4 left the recommender
hooked into quiz selection but **NOT into the mission assignment cron**.

**Physical challenges**: same shape, 5 rows live, all `tags=[]`. The
DefiCard UI at `app/teen/defis-physiques/defis-physiques-client.tsx`
renders them without personalization (`physical_challenges.image_url`
column missing, per V1.1 follow-up #4). No proof-upload pipeline
beyond honor system (per `docs/vision/physical-challenges.md`).

### 2.5 Verdict (per source)

| Source            | Schema | Creation UI | Teen-render UI | Profile-aware | Live rows |
|---|---|---|---|---|---|
| Parent (chores)   | ✅ | ✅ `/parent/chores/new` | ✅ `/teen/chores` | ❌ | 2 / 10 comps |
| Friend (defis)    | ✅ | ❌ | ❌ (legacy redirected) | ❌ | 0 |
| Partner (offers)  | ⚠️ (2 tables drift) | ⚠️ mock UI `/partner/offers` | ⚠️ no teen surface | ⚠️ via reco RPC, no consumer | 1 |
| AI / system       | ✅ | ✅ cron | ✅ `/teen/quests` | ❌ (assign cron ignores profile) | 30 / 132 logs |

---

## Question 3 — Is content matched to TEEN PROFILE?

### 3.1 The infrastructure is there

- `behavioral_signals` (15 rows) — capture path:
  `app/api/teen/signals/record/route.ts:55-117` validates UUID + 100
  signals/min rate-limit + writes via `recordSignal` helper
  (`lib/analytics/signals.ts`).
- `affinity_scores` (3 rows for 1 teen) — written by
  `update_affinity_scores` (DB routine, listed in
  `information_schema.routines`).
- `interest_taxonomy` — **50 rows seeded**, matches Appendix A of
  personalization-engine.md to the letter (sport_football,
  music_pop, …). `is_active=true` on all 50.
- `teen_interests` (3 rows for 1 teen).
- `recommendation_weights` (8 rows — per content_type, including
  versioned active row).
- `recommend_for_teen` RPC (`052_recommend_for_teen_v1.sql:1-100+`).
- Nightly cron `evolve-teen-profiles` (`app/api/cron/evolve-teen-profiles/route.ts`)
  calls `evolve_all_teens` RPC.

### 3.2 What actually drives selection — per content path

| Content path        | Profile-driven? | Evidence |
|---|---|---|
| `getDailyQuizForTeen`           | ⚠️ partial   | `lib/quiz/server.ts:96-100` calls RPC; v1 weights w2/w3=0; tags missing on 8/9 quizzes → affinity_match≈0; ranking dominated by `recently_seen` penalty. |
| `getQuizCategoriesForTeen`      | ❌ none      | `lib/quiz/server.ts:23-29` returns ALL active quizzes regardless of teen. |
| `assign-missions` cron           | ❌ none      | RPC selects by mission_type / is_active only. |
| `/teen/quests` hub               | ❌ none      | `getUnifiedQuests` is global, not per-teen-ranked. |
| `/teen/defis-physiques`          | ❌ none      | Lists all `physical_challenges` rows. |
| Parent chores                    | ❌ N/A       | Parent-decided. |
| Partner offers (teen-side)       | ❌ no UI     | RPC supports `p_content_type='partner_offer'` but no consumer. |
| Friend défis                     | ❌ N/A       | No data. |
| Avatar coach                     | ❌ stub       | `components/teen/avatar-coach.tsx` exists but was V1 read-only render per V1.1 follow-up #11. |
| `/api/teen/recommendations` (legacy path) | ⚠️ different | Falls through to `QuestRecommender` then to upcoming events then to a 2-item hardcoded array (lines 178-181). |

### 3.3 V1.2 cohort grouping in generate-daily-content

`generate-daily-content/route.ts:56-108 buildCohorts` groups teens by
`(grade_level, school_type, curriculum, language)` and rolls up the
top 5 interest tags per cohort. This **only drives batch generation**:
the AI is asked for a cohort-flavoured quiz, but the resulting quiz
lands in `educational_quizzes` with `is_active=true` and is then
visible to ALL teens (no `cohort_id` column on
`educational_quizzes`). **The cohort grouping is real but the
delivery is global.**

The subject mapping is heuristic
(`generate-daily-content/route.ts:113-131`): top interest →
`Mathématiques | Histoire | Géographie | Français | Philosophie |
Sciences`. `sport_*` and `tech_*` collapse to `Sciences`.

### 3.4 The data problem (the brutal truth)

Personalization is gated by data presence in three places, each empty:

1. **Tags on items** — 1/9 quizzes, 0/30 missions, 0/5 physical
   challenges, 1/1 partner offer carry tags. Without tags
   `affinity_match` returns 0 → fallback to novelty + context terms.
2. **Behavioral signals** — 15 rows, 1 teen. Cold-start branch
   triggers everywhere (the spec at
   `personalization-engine.md:284-298` says cold-start = `total_signals
   < 5` OR `account_age_days < 7`).
3. **Neighbours** — `teen_neighbours` does not even exist as a
   populated table; collab term is dead until pgvector + nightly
   recompute land (Sprint 3 of personalization-engine.md:746-757).

### 3.5 Risks

- The recommender will look "smart" once content is tagged + signals
  flow; today it is effectively `random()` with a 7-day lockout. A
  user-facing demo where the same generic quiz appears every day will
  destroy the personalization narrative.
- The `validate_quiz_content` SQL routine exists (listed in
  `information_schema.routines`) but is never called from the daily
  cron — quality gates are TypeScript-side.
- `update_school_score_on_quiz` trigger fires on
  `quiz_attempts` insert (`trigger_update_school_score_on_quiz` per
  routine list) — but `quiz_attempts` is empty.

---

## Question 4 — Is the UI/UX FINISHED?

### 4.1 Per-page reality check (sample of critical surfaces)

| Page | Real data? | Empty/loading/error states | Mobile | Polish | Verdict |
|---|---|---|---|---|---|
| `/teen` (dashboard)       | ✅ via `getTeenDashboardData` | partial | OK | avatar coach is panda art only | 🟡 |
| `/teen/quiz`              | ✅ DB-backed | skeleton ✅ | OK | no avatar voiceover slot | 🟡 |
| `/teen/quiz/[id]`         | ✅ runner | OK | OK | client/server regrade ✅ | 🟢 |
| `/teen/quests`            | ✅ unified-quest engine | skeleton ✅ | OK | NO friend-défi tab | 🟡 |
| `/teen/defis-physiques`   | ✅ DB | OK | OK | iconless (column missing) | 🟡 |
| `/teen/wallet`            | ✅ V1.1 fixed | OK | OK | OK | 🟢 |
| `/teen/shop`              | ✅ shop_rewards (26 rows) | OK | OK | OK | 🟢 |
| `/teen/chores`            | ✅ live | OK | OK | clean | 🟢 |
| `/teen/friends`           | ⚠️ empty arrays/TODO | OK | OK | per V1.1 follow-up #9 | 🔴 |
| `/teen/messages`          | ⚠️ scaffolded | partial | OK | per V1.1 follow-up #9 | 🔴 |
| `/teen/avatar` (NEW)      | ❌ missing route | — | — | — | 🔴 |
| `/parent`                 | ✅ live overview view | OK | OK | OK | 🟢 |
| `/parent/chores`          | ✅ live | empty state ✅ | OK | clean | 🟢 |
| `/parent/chores/new`      | ✅ form | OK | OK | OK | 🟢 |
| `/parent/topup`           | ✅ V1.1 schema-fixed | OK | OK | PSP manual mode | 🟡 |
| `/parent/approvals`       | ✅ wired | OK | OK | OK | 🟢 |
| `/parent/e-signature`     | ✅ async-search-fixed | OK | OK | bucket privacy review pending | 🟡 |
| `/partner/dashboard`      | ⚠️ mock stats | OK | OK | OK chrome | 🟡 |
| `/partner/offers`         | ❌ HARDCODED array (`app/partner/offers/page.tsx:11-16`) | — | OK | mock | 🔴 |
| `/partner/scanner`        | ⚠️ wired to missing tables | OK | OK | dual mock+real scanners | 🔴 |
| `/partner/{kyc,payouts,invoices,support}` | ❌ mock | — | OK | per V1.1 follow-up #7 | 🔴 |
| `/admin/*`                | ⚠️ many APIs missing | OK | OK | per V1.1 deferred #6 | 🟡 |
| `/onboarding/*`           | ✅ multi-step | OK | OK | interest chip selector NOT wired (Sprint 1 of personalization-engine.md:721-731) | 🟡 |

### 4.2 Visual coherence

- **Geist font**: applied via `app/layout.tsx`. Spot-check on
  `app/teen/quests/page.tsx`, `app/parent/chores/page.tsx` — both use
  base style (`text-zinc-400`, `text-white`).
- **Dark theme**: `bg-zinc-950` is the default canvas across teen and
  parent zones. Verified by sampling 10 page.tsx files.
- **Cyan/emerald accents**: present (`text-emerald-400`,
  `bg-emerald-500/10`, `bg-cyan-500/...`). Per FRONTEND_REDO outstanding,
  there's a parallel `gen-z-{lavender,mint,coral,sky}` palette that
  has never been reconciled
  (`docs/vision/v1_1_execution/V1_1_REPORT.md:115`).
- **Rounded-2xl cards**: used (`rounded-2xl`, `rounded-3xl` for hub
  hero cards). Spot-checked at `parent/chores/page.tsx:191`.
- **Glass effects**: minimal — gradient cards
  (`from-zinc-900 to-zinc-950`) substitute for true glass.
- **Hover/focus**: hover states present (`hover:border-emerald-500/40`),
  focus-visible inconsistent — Tailwind defaults only on most
  buttons.

### 4.3 Mobile-first / 375px

- `container mx-auto px-6` is used widely. Quick math: 375 - 48 (px-6)
  = 327px content width — works for the card grids
  (`grid md:grid-cols-2 gap-4` collapses to 1-col under md).
- Bottom nav: `app/teen/layout.tsx` provides a teen bottom nav (per
  whitepaper §16); did not deeply audit positioning at 375px.

### 4.4 PWA

V1.1 audit (P2.2 outstanding) flagged `/sw.js` and `/manifest.json`
**missing** — confirmed no `app/sw.ts` or `public/manifest.webmanifest`
in the working tree. Push subscriptions table exists
(`push_subscriptions`) but has 0 rows. PWA install prompt is unbuilt.

### 4.5 Accessibility

- ARIA labels: spot-checked icon-only buttons in
  `app/partner/offers/page.tsx:87-95` (`Button variant="ghost"
  size="icon"` with no `aria-label`) — fail.
- Keyboard nav: not systematically tested.
- Contrast: zinc-400 on zinc-950 ≈ 7.2:1, OK.
- Focus rings: Tailwind base only, not augmented.

### 4.6 Critical journey end-to-end check

| Journey | Status |
|---|---|
| Teen daily quest loop (open → quiz → submit → XP) | 🟢 plumbing works, personalization weak |
| Teen redeems coins | 🟢 V1.1 fixed pipeline |
| Parent approves a chore | 🟢 verify-completion API + UI live |
| Parent approves a ride | 🟡 cron `ride-curfew-check` exists, UI partial |
| Parent approves a mentor session | 🟢 V1.1 P2.5 shipped |
| Partner accepts a food order | 🟡 `food_orders` 5 rows, partner restaurant API stub |
| Mentor completes a session | 🔴 `mentor_complete_session` RPC missing (V1.1 follow-up) |
| Admin moderates content | 🟡 `moderation_queue` 3 rows, partial UI |

---

## Cross-cutting risks

1. **Stale model id** in `lib/ai/content-generator.ts:78`
   (`claude-3-sonnet-20240229`) and OpenAI default `gpt-4` — both
   moved on by 2026.
2. **Two parallel partner-offer tables** (`partner_offers` vs
   `partner_discounts`) cause a write/read mismatch.
3. **Two parallel quiz pools** (`educational_quizzes` vs
   `curated_content_library`) — fallback dead-inventory.
4. **Mocks shipped to production**: `/partner/offers/page.tsx:11-16`,
   `components/partner/universal-scanner.tsx` (per
   `partner-network.md:55`).
5. **Cron auth secrets** likely unset in prod (V1.1 follow-up).
6. **Friend graph empty** (0 friendships, 0 friend_challenges) — any
   collab/friend resonance term in the recommender is dead weight.

---

## Appendix — DB live snapshot (read 2026-05-08, project `imchornjvmgmaovhypco`)

| Table | Rows |
|---|---|
| `educational_quizzes` | 9 (1 with tags) |
| `mission_templates` | 30 (0 with tags) |
| `physical_challenges` | 5 (0 with tags) |
| `parent_chores` | 2 |
| `parent_chore_completions` | 10 |
| `partner_offers` | 1 (1 with tags) |
| `partner_discounts` | 0 |
| `curated_content_library` | 30 |
| `behavioral_signals` | 15 |
| `affinity_scores` | 3 |
| `teen_interests` | 3 |
| `interest_taxonomy` | 50 |
| `quiz_seen_history` | 0 |
| `quiz_attempts` | 0 |
| `friend_challenges` | 0 |
| `teen_behavioral_profile` | 0 |
| `content_recommendations` | 0 |
| `personalized_content_assignments` | 0 |
| `content_generation_logs` | 0 |
| `daily_content_schedule` | 0 |
| `recommendation_weights` | 8 |
| `mission_progress_log` | 132 |
| `user_missions` | 10 |
| `xp_transactions` | 162 |
| `coin_transactions` | 15 |
| `user_streaks` | 6 |
| `food_orders` | 5 |
| `partners` | 1 |

---

## Appendix — Files cited (pointers for sub-agents)

`lib/quiz/server.ts:23-29`, `lib/quiz/server.ts:89-189`,
`app/api/cron/generate-daily-content/route.ts:56-108`,
`app/api/cron/generate-daily-content/route.ts:113-131`,
`app/api/cron/assign-missions/route.ts:84-99`,
`app/api/cron/evolve-teen-profiles/route.ts:41-71`,
`app/api/teen/signals/record/route.ts:55-117`,
`app/api/teen/recommendations/route.ts:16-91`,
`app/api/parent/chores/create/route.ts`,
`app/api/parent/chores/[id]/verify-completion/route.ts`,
`app/api/teen/chores/[id]/complete/route.ts`,
`app/api/partner/offers/route.ts:33-218`,
`app/teen/quiz/page.tsx`, `app/teen/quiz/[id]/page.tsx`,
`app/teen/quests/page.tsx`, `app/teen/quests/quests-hub-client.tsx`,
`app/teen/defis-physiques/page.tsx`,
`app/teen/defis-physiques/defis-physiques-client.tsx`,
`app/teen/chores/page.tsx`, `app/parent/chores/page.tsx`,
`app/parent/chores/new/page.tsx`, `app/parent/chores/[id]/page.tsx`,
`app/partner/offers/page.tsx`, `app/partner/offers/new/page.tsx`,
`app/partner/dashboard/page.tsx`, `app/partner/scanner/page.tsx`,
`app/gamification/defis/page.tsx` (legacy redirect),
`lib/ai/content-generator.ts:70-120`, `lib/ai/content-safety.ts`,
`lib/ai/enhanced-quiz-prompts.ts`,
`lib/ai/intelligent-content-engine.ts`, `lib/ai/pedagogical-validator.ts`,
`lib/ai/factual-validator.ts`, `lib/ai/interest-integration.ts`,
`lib/ai/moroccan-context.ts`, `lib/ai/international-school-engine.ts`,
`lib/server/unified-quest-engine.ts`,
`lib/gamification/quest-recommender.ts`,
`lib/analytics/signals.ts`,
`components/teen/avatar-coach.tsx`,
`components/teen/teen-chore-complete-button.tsx`,
`components/parent/chore-form.tsx`,
`components/parent/chore-verify-buttons.tsx`,
`components/partner/universal-scanner.tsx`,
`components/partner/offer-edit-form.tsx`,
`gamification-system/database/migrations/022_pillars_system.sql`,
`gamification-system/database/migrations/038_quiz_seed_content.sql`,
`gamification-system/database/migrations/051_personalization_engine.sql`,
`gamification-system/database/migrations/052_recommend_for_teen_v1.sql`,
`gamification-system/database/migrations/053_parent_chores.sql` (implied),
`gamification-system/database/migrations/067_curated_content_library_seed.sql`,
`gamification-system/database/migrations/006_friend_challenges.sql`,
`docs/vision/personalization-engine.md`, `docs/vision/quiz-ai.md`,
`docs/vision/parent-custom-chores.md`, `docs/vision/partner-network.md`,
`docs/vision/physical-challenges.md`,
`docs/vision/v1_1_execution/V1_1_REPORT.md`,
`docs/vision/FRONTEND_REDO.md`, `vercel.json`.
