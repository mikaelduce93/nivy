# Vision Audit — Gamification Engine

> Auditor: `gamification-vision-auditor` (read-only)
> Date: 2026-05-07
> Scope: défis (daily/weekly/seasonal), missions, streaks, achievements, crews/friend-challenges, fortune wheel, group XP, route doublons.

---

## 1. Vision intended (from founder brief)

The gamification engine is meant to be the heart of Nivy's teen experience:

- **Défis** on daily / weekly / seasonal cadence, both **individual** and **group**.
- **Levels** with named titles (Rookie → Champion → ...).
- **Missions** alongside défis (a more structured, longer-cycle objective surface).
- **Streaks** — both a *login streak* and an *activity streak* (separate signals).
- **Achievements / badges** unlocked by behavioural triggers.
- **Crews** and **friend-challenges** for group competition (leaderboards, shared XP).
- An **avatar coach** that proposes the next défi (this is owned by a separate auditor; we only note the cross-cut where the recommender consumes gamification state — `lib/gamification/quest-recommender.ts`).
- XP earned per défi feeds the **2-currency economy** (XP + Coins → tracked by the economy auditor).

---

## 2. Code state

### 2.1 The 4-folder split (intentional, documented)
Per `docs/gamification-architecture.md`, gamification code lives in four cooperating folders, **not** four duplicates:

- `lib/gamification/` — pure helpers (`anti-abuse.ts`, `quest-recommender.ts`).
- `features/gamification/` — the **legacy lean slice**: server actions for XP, login streaks, daily challenges (`actions.ts`, `schema.ts`, `smart-challenge-assignment.ts`, `adaptive-difficulty.ts`).
- `gamification-system/features/<feature>/` — the **rich platform** (achievements, missions, leaderboard, shop, wheel, mini-games, crews, seasonal/event/special challenges, VIP, profile customization, social-sharing, stats dashboard, notifications, onboarding, pillars, collections, annual-wrapped, activity-feed). 21 sub-folders confirmed under `gamification-system/features/`.
- `components/gamification/` — classic shared UI (`xp-bar.tsx`, `streak-counter.tsx`, `streak-flame.tsx`, `quest-card.tsx`, `level-up-modal.tsx`, `achievements.tsx`, `gamification-dashboard.tsx`, `gamification-provider.tsx`).

The "duplicated 4×" framing in the brief is misleading — the architecture doc is explicit that these are **distinct roles** with public-API barrels. There are no real code duplicates, but the boundary is fragile (see Risks).

### 2.2 Route hubs and doublons (`app/gamification/*` vs `app/teen/*`)
Both top-level route trees exist, but the conflict is **largely resolved by redirects**:

- Live UI hubs in `app/gamification/`: `defis/`, `missions/`, `crews/` (REDIRECTS to `/teen/circles`), `boutique/` (REDIRECTS to `/teen/wallet?tab=shop`), `defis-physiques/` (REDIRECTS to `/teen/defis-physiques`), `aide-scolaire/` (REDIRECTS to `/teen/aide-scolaire`), plus real pages: `parcours/`, `roue/`, `leaderboard/`, `collections/`, `page.tsx` (hub).
- Live UI hubs in `app/teen/`: `quests/` (THE quests hub, uses `lib/server/unified-quest-engine.ts`), `circles/`, `defis-physiques/`, `streak/`, `achievements/` (REDIRECTS to `/gamification/collections`), `leaderboard/` (REDIRECTS to `/gamification/leaderboard`), `passions/` (REDIRECTS to `/teen/quests?tab=creative`), `rewards/`+`shop/`+`coins/` (REDIRECTS to `/teen/wallet`).

**Net pattern**: `/teen/*` is the canonical teen surface; `/gamification/*` is the legacy hub. Most cross-references are now redirects (good), but a few still render full UI in both trees (notably `/gamification/defis` and `/teen/quests` are *both* live and consume *different* data sources).

### 2.3 Key files and how défis/missions are produced
- `app/gamification/defis/page.tsx` reads `challenge_types` + RPC `get_user_challenges` — i.e. the **friend-challenge** surface.
- `app/teen/quests/page.tsx` calls `lib/server/unified-quest-engine.ts::getUnifiedQuests()` which **synthesises quests on the fly** from `educational_quizzes`, `physical_challenges`, `passion_paths`, etc., bucketed by 4 pillars (intellect / vitality / creativity / social). It is *not* a curated défis table — it's a runtime aggregator over content tables.
- `gamification-system/features/missions/actions.ts::getMissions()` calls RPC `get_user_missions` which auto-seeds a teen's `user_missions` rows from `mission_templates` (template-based, NOT statically stored per user).
- `gamification-system/features/crews/actions/management.ts::createCrew` calls RPC `create_crew` — fully wired (creation + slug + approval flag).
- `gamification-system/features/stats-dashboard/actions.ts::updateLoginStreak` is the real login-streak writer (consumed by `app/teen/streak/page.tsx`).

### 2.4 Group XP allocation
`gamification-system/database/migrations/007_crews_system.sql` defines a SQL function that recomputes `crews.total_xp` as **`SUM(profiles.total_xp) WHERE crew_member`** — i.e. group XP is a derived rollup, not an allocated split. Crew achievements (`crew_achievements`, 16 seeded) trigger off thresholds like `condition_type = 'total_xp'` (1k → 500k tiers). There is no per-défi "XP awarded to the crew" code path independent of member XP.

---

## 3. DB state (live, project `imchornjvmgmaovhypco`)

| Table | Rows | Note |
|---|---|---|
| `mission_templates` | **30** | seeded — daily/weekly/monthly/seasonal/onboarding × loyalty/exploration/social/challenge/event/participation |
| `user_missions` | 0 | no teen has been assigned anything yet |
| `user_streaks` | 0 | empty — and no max streak |
| `achievements` | **63** | seeded badge catalogue |
| `user_achievements` | 0 | nobody has unlocked one |
| `crews` | 0 | no crew created |
| `crew_members` | 0 | empty |
| `crew_achievements` | **16** | seeded crew-level badge catalogue |
| `friend_challenges` | 0 | empty |
| `challenge_types` | **10** | seeded duel templates |
| `seasonal_challenges` | **13** | seeded across 4 `seasons` |
| `user_seasonal_progress` | 0 | empty |
| `event_challenges` | 0 | empty (20 `event_challenge_types` seeded) |
| `user_event_challenge_progress` | 0 | empty |
| `special_challenges` | 0 | empty (17 `special_challenge_types` seeded) |
| `physical_challenges` | **5** | seeded |
| `wheel_segments` | **12** | seeded |
| `user_wheel_spins` | 0 | nobody has spun |
| `user_xp` | 1 | only the seeded test teen |

**Reading**: catalogue tables (templates, types, achievements, segments, seasons) are well-seeded. Every per-user table is **empty** — even for the seeded test account — meaning the *engine has never run end-to-end against a real session* (no missions auto-assigned, no streak tick written, no wheel spin).

---

## 4. Gaps (vision vs implementation)

1. **Défis are NOT seeded as concrete instances.** `physical_challenges` (5) is the only "real défi" table with content. `special_challenges`, `event_challenges`, `friend_challenges` are all empty — only their *type* tables are populated. The `app/gamification/defis` UI will render empty stats for any real user.
2. **Missions are template-based, not auto-generated.** `mission_templates` has 30 rows; the RPC `get_user_missions` is supposed to assign them, but `user_missions` is empty even for the seeded teen → either the cron/trigger is missing, or it requires an interactive entry point we haven't reached.
3. **Streaks are real (writer exists in `stats-dashboard/actions.ts::updateLoginStreak`) but unused at the moment.** `user_streaks` is empty AND `user_lifetime_stats` shows the streak fields. The stat-dashboard system has *two* streak surfaces (`user_streaks` and the embedded `user_lifetime_stats.current_login_streak`) — risk of divergence.
4. **Crews are fully wired but cold.** `createCrew` server action exists and uses an RPC; UI exists at both `/gamification/crews` (redirects) and `/teen/circles`. Joinable: yes (RPC supports `requires_approval` + invitations + join requests). Group XP: derived rollup (sum of members' `total_xp`), not an independent allocation.
5. **Levels with named titles**: catalogue tables for `profile_titles` (9), `vip_tiers` (7) exist, but there is no `level → title` mapping table found — title progression appears to live in `profile_titles` unlock conditions which are then surfaced via `user_unlocked_titles`. The "Rookie → Champion" ladder from the founder is not a first-class concept.
6. **Avatar coach crossover**: `lib/gamification/quest-recommender.ts` exists and is the natural integration point — but this auditor is read-only; the avatar-coach auditor must confirm wiring.
7. **Two parallel quest surfaces** create UX confusion: `/teen/quests` (synthesised from content tables, pillar-based) vs `/gamification/missions` (template-based) vs `/gamification/defis` (friend-challenge duels). A teen would see three "quest-shaped" surfaces with different data.

---

## 5. Risks

- **Empty UI risk on launch**: every per-user table is empty. The first real teen to sign in will likely see "0 missions, 0 streak, 0 badges" because no auto-assignment cron has been observed.
- **Boundary erosion**: `features/gamification` (legacy lean slice) and `gamification-system/features/missions` (new platform) both write to mission/quest-shaped data. The architecture doc forbids cross-imports but enforcement is policy-only.
- **Group XP gaming**: since `crews.total_xp` is recomputed from member XP, leaving and rejoining a crew could double-count if the recompute trigger is loose. The migration uses an explicit SUM in a function (good), but trigger timing wasn't audited.
- **`user_lifetime_stats.current_login_streak` vs `user_streaks.current_streak`** — two writers, no obvious reconciler.
- **31 migrations applied** (`000` through `031`) but the brief lists `001..011` only. `012..031` (annual-wrapped, profile-customization, collections, gamified-notifications, vip, activity-feed, social-sharing, onboarding, xp-payment, pillars, circles, friends, premium, tokens, presence, xp-shop, quiz-question-types) are real and already in production — the engine surface is *much* larger than the brief implies.

---

## 6. Open questions for the founder

1. **Défis curation**: are défis fully AI-generated at runtime (the unified-quest-engine pattern), curated by a moderator (template tables), or hybrid? Right now the code does *both* but with no clear primary.
2. **Cadence resolution**: the brief says "daily / weekly / seasonal". `mission_templates.mission_type` actually stores `daily | weekly | monthly | seasonal | onboarding`. Is `monthly` intended? Is `onboarding` a one-off cohort?
3. **Crews & parental approval**: do crews need parental approval to form for under-15s? `crews.requires_approval` is **crew-owner-side approval**, not parental. There is no parent-link guard on `createCrew`.
4. **Group XP semantics**: is "earn XP for your crew" supposed to be a *separate* allocation (split between personal and crew pools) or just the SUM-over-members rollup that exists today?
5. **Levels → titles ladder**: is "Rookie → Champion" a target spec to implement, or is the existing `profile_titles` (9 titles) the actual ladder?
6. **Quest surface unification**: should `/teen/quests`, `/gamification/missions`, and `/gamification/defis` collapse into one surface, or stay as three lenses on the same engine?
7. **Streak source of truth**: `user_streaks` table or `user_lifetime_stats.current_login_streak` field — which one wins? Today both writers exist.
8. **Seeding policy**: which catalogue tables (`special_challenges`, `event_challenges`) should ship pre-seeded vs be generated by content-generation pipelines?

---

## Appendix — file paths referenced (>10)

- `docs/gamification-architecture.md`
- `lib/gamification/quest-recommender.ts`
- `lib/gamification/anti-abuse.ts`
- `lib/server/unified-quest-engine.ts`
- `features/gamification/actions.ts`
- `features/gamification/smart-challenge-assignment.ts`
- `features/gamification/adaptive-difficulty.ts`
- `gamification-system/features/missions/actions.ts`
- `gamification-system/features/crews/actions/management.ts`
- `gamification-system/features/stats-dashboard/actions.ts`
- `gamification-system/features/seasonal-challenges/live-ops-calendar.ts`
- `gamification-system/database/migrations/001_achievements_system.sql`
- `gamification-system/database/migrations/003_missions_system.sql`
- `gamification-system/database/migrations/005_fortune_wheel.sql`
- `gamification-system/database/migrations/006_friend_challenges.sql`
- `gamification-system/database/migrations/007_crews_system.sql`
- `gamification-system/database/migrations/008_special_challenges.sql`
- `gamification-system/database/migrations/009_event_challenges.sql`
- `gamification-system/database/migrations/010_seasonal_challenges.sql`
- `gamification-system/database/migrations/011_mini_games.sql`
- `app/gamification/page.tsx`
- `app/gamification/defis/page.tsx`
- `app/gamification/missions/page.tsx`
- `app/gamification/crews/page.tsx`
- `app/gamification/roue/page.tsx`
- `app/gamification/parcours/page.tsx`
- `app/gamification/leaderboard/page.tsx`
- `app/teen/quests/page.tsx`
- `app/teen/circles/page.tsx`
- `app/teen/defis-physiques/page.tsx`
- `app/teen/streak/page.tsx`
- `components/gamification/streak-counter.tsx`
- `components/gamification/gamification-provider.tsx`

DB tables surveyed: `mission_templates`, `user_missions`, `user_streaks`, `achievements`, `user_achievements`, `crews`, `crew_members`, `crew_achievements`, `friend_challenges`, `challenge_types`, `seasonal_challenges`, `user_seasonal_progress`, `event_challenges`, `user_event_challenge_progress`, `special_challenges`, `physical_challenges`, `wheel_segments`, `user_wheel_spins`, `user_xp`, `user_lifetime_stats` (20 tables).
