# Quest Cadence — Vision vs Reality Audit

Auditor: quest-cadence-auditor (read-only). Date: 2026-05-07. Supabase project: `imchornjvmgmaovhypco`.

## 1. Founder vision (intended)

Nivy is meant to expose **multiple parallel quest cadences**, each with a distinct rhythm, XP envelope, and refresh mechanism, so that an active teen always has something to chase regardless of their session length:

- **Daily** — refresh every 24h, low-XP (~10–50), 1–3 per day, drives daily-active habit.
- **Weekly** — refresh every Monday, mid-XP (~100–200), wider goals (e.g. "complete 15 challenges this week").
- **Monthly** — refresh on the 1st, big-XP (~300–600), long-haul goals (e.g. "complete 50 challenges this month", "reach top 10 leaderboard").
- **Seasonal** — quarterly themed packs tied to real-world periods (Ramadan, Summer, Halloween, Christmas/New Year, school year). Highest XP, fixed start/end dates.
- **Event-driven** — one-shot challenges attached to a specific concert/event (check-in, stay late, photo poster, group check-in, etc.).
- **Special / Partner** — sponsor-driven monthly or flash challenges (e.g. "TechStore monthly challenge"), photo/quiz/geolocation/flash formats.

The founder explicitly asked to flag **monthly quests** — do they exist as a first-class cadence? (Answer: yes in DB and seed, but only partially wired in the page-load assigner — see §4.)

## 2. What is modeled in the database

The schema in migration `003_missions_system.sql` is well-aligned with the vision: `mission_templates.mission_type` is constrained to `('daily','weekly','monthly','seasonal','special')`, with a separate `season` enum (`spring/summer/autumn/winter/ramadan/christmas/halloween/new_year`) and `valid_from / valid_until` for time-boxed seasonal/special missions. `user_missions` carries `period_start`, `period_end`, `status` (`active/completed/expired/claimed`), and a `UNIQUE(teen_id, mission_id, period_start)` constraint that lets the same template re-issue cleanly for each new period.

Live distribution of `mission_templates` rows (today):

| mission_type | count | XP min–max (avg) |
|---|---|---|
| daily | 4 | 10–50 (29) |
| weekly | 6 | 100–200 (150) |
| monthly | 6 | 300–600 (433) |
| seasonal | 8 | 300–1500 (756) |
| onboarding | 6 | 10–50 (25) |
| **special** | **0** | — |

Monthly templates seeded: `Festivalier` (500 XP, 3 events), `Ultra Challenger` (400 XP, 50 défis), `XP Legend` (300 XP, 2000 XP), `Streak Master` (350 XP, 15-day streak), `Top 10` (600 XP, leaderboard), `Explorateur` (450 XP, 3 event types). So **monthly quests DO exist** in the catalog. However `user_missions` currently has **0 rows** in production — no teen has ever been assigned any mission, daily/weekly/monthly or otherwise.

Adjacent cadence-bearing tables also exist but are empty or near-empty: `seasonal_challenges` (advent-calendar style, separate from `mission_templates`), `event_challenges` (per-event one-shots; `event_challenge_types` has 15 slugs like `check_in`, `stay_late`, `photo_poster`, `refer_friend`), `special_challenges` / `special_challenge_types` (photo/quiz/geo/flash formats with a `requires_validation` flag — the partner-sponsored slot). No rows in any of the three.

## 3. What is surfaced in the UI

There are **three parallel quest surfaces** and they do **not** share a cadence model:

- `app/teen/quests/page.tsx` + `quests-hub-client.tsx` — the new "Quests Hub". Fed by `lib/server/unified-quest-engine.ts`, which assembles quests from `educational_quizzes`, `physical_challenges`, `passion_tutorials`, and `upcomingEvents`. **It has no notion of mission_type/cadence at all.** Tabs are pillar-based (`daily`/`brain`/`body`/`creative`); the "daily" tab is just a shuffled slice of the unified list, not actual `mission_templates` of `mission_type='daily'`.
- `app/gamification/missions/page.tsx` + `missions-client.tsx` — the legacy missions page. This one **does** read `mission_templates` via `get_user_missions` RPC and assigns periods via `assign_missions_for_period`. **But it only calls the assigner for `daily` and `weekly`** — never for `monthly` or `seasonal`. So even when the page works, monthly and seasonal templates remain orphaned.
- `app/gamification/defis/page.tsx` + `challenges-client.tsx` — friend duels (`challenge_types`, `friend_challenges`, `get_user_challenges` RPC). Completely separate model, no `mission_type` field at all.

Note: the missions page also calls the RPCs with the wrong parameter names (`p_user_id`, `p_period_type`, `p_type`) while the SQL function signatures expect `p_teen_id`, `p_mission_type`, `p_status`. This is consistent with the empty `user_missions` table and means the page has been silently failing in production.

## 4. Refresh mechanism

Vision intent is cron-driven rotation (midnight daily, Monday weekly, 1st of month monthly, season boundaries seasonal). Reality:

- **No `pg_cron` extension installed** on the Supabase project (`SELECT extname FROM pg_extension WHERE extname IN ('pg_cron','pg_net')` returns empty).
- **No `vercel.json`** at the repo root, no Vercel Cron configuration.
- The only cron-style routes are `app/api/cron/generate-daily-content/route.ts` and `app/api/cron/purge-documents/route.ts` — neither touches missions.
- Mission assignment is **JIT (just-in-time)**: `app/gamification/missions/page.tsx` calls `assign_missions_for_period` on every page load (daily + weekly only). This means: (a) monthly/seasonal missions are never assigned automatically, (b) a teen who never visits `/gamification/missions` is never enrolled, (c) the new `/teen/quests` hub bypasses the missions system entirely so visiting it doesn't help either.
- `expire_old_missions()` exists as a SQL function but has no caller anywhere in the codebase.

## 5. Three-surface alignment

| surface | source | uses `mission_type`? | refresh path |
|---|---|---|---|
| `/teen/quests` | `unified-quest-engine.ts` (quizzes/physical/passion/events) | no | none — assembled per request |
| `/gamification/missions` | `mission_templates` via RPC | yes (broken: daily+weekly only) | JIT on page load |
| `/gamification/defis` | `friend_challenges` / `challenge_types` | no (uses `mode`) | user-initiated duels |

These are three independent gamification stacks that happen to all be called "quests/missions/défis" in the UI. There is no shared cadence taxonomy across them. Friend duels can run for arbitrary `default_duration_hours`; event challenges have their own `available_from/until`; seasonal challenges have a separate `seasonal_challenges` table that is *not* the same as `mission_templates WHERE mission_type='seasonal'`.

## 6. Gaps and open questions

**Gaps vs vision:**

1. **Monthly cadence exists in DB but is unreachable in UI** — no page calls `assign_missions_for_period(..., 'monthly')`. The 6 seeded monthly templates have never been assigned to anyone.
2. **Seasonal duplication**: two parallel seasonal models — `mission_templates.mission_type='seasonal'` (8 rows) AND `seasonal_challenges` table (0 rows, with its own advent-calendar concept). Founder needs to pick one.
3. **No automated refresh** — without pg_cron or Vercel Cron, the daily/weekly rotation depends on the user visiting the missions page. Streaks and "weekly perfect" missions silently break for users who skip a day.
4. **Special / partner cadence is a stub** — `mission_type='special'` is allowed by the CHECK constraint but 0 rows seeded. The richer `special_challenges` table (photo/quiz/geo/flash) is also empty.
5. **The `/teen/quests` hub is the canonical surface in the new IA but ignores the cadence system entirely.**
6. **RPC parameter mismatch** in `app/gamification/missions/page.tsx` — calls use `p_user_id` but functions expect `p_teen_id`. Page is silently broken.

**Open questions for the founder:**

- **Rollover vs expire on monthly?** Today `expire_old_missions()` flips status to `expired` at `period_end`. Do incomplete monthly missions reset, carry partial progress into the next month, or just disappear?
- **Are seasonal challenges platform-curated or partner-sponsored?** The schema supports both (`seasonal_challenges.is_premium`, `mission_templates.season`) but only platform-curated seeds exist.
- **Event-driven quests — admin-only or partner self-service?** `event_challenges.created_by` is nullable and there is no UI for partners to create them.
- **Cross-cadence stacking** — should one challenge completion satisfy daily + weekly + monthly counters simultaneously? Migration 003 triggers do stack (a `user_challenges` insert calls `update_mission_progress` for `daily_challenge`, `daily_challenges_all`, `weekly_challenges_15`, `monthly_challenges_50`), so the current behavior is "yes, stack all". Confirm intentional.
- **Which surface wins?** `/teen/quests` (new, pillar-based, no cadence) or `/gamification/missions` (legacy, cadence-aware, broken)? Need a decision before fixing anything.

---

**Files referenced (absolute paths):**

- `C:\Users\Shadow\Desktop\NIVY\lib\server\unified-quest-engine.ts`
- `C:\Users\Shadow\Desktop\NIVY\app\teen\quests\page.tsx`
- `C:\Users\Shadow\Desktop\NIVY\app\teen\quests\quests-hub-client.tsx`
- `C:\Users\Shadow\Desktop\NIVY\app\gamification\missions\page.tsx`
- `C:\Users\Shadow\Desktop\NIVY\app\gamification\missions\missions-client.tsx`
- `C:\Users\Shadow\Desktop\NIVY\app\gamification\defis\page.tsx`
- `C:\Users\Shadow\Desktop\NIVY\app\gamification\defis\challenges-client.tsx`
- `C:\Users\Shadow\Desktop\NIVY\gamification-system\features\missions\actions.ts`
- `C:\Users\Shadow\Desktop\NIVY\gamification-system\database\migrations\003_missions_system.sql`
- `C:\Users\Shadow\Desktop\NIVY\gamification-system\database\migrations\008_special_challenges.sql`
- `C:\Users\Shadow\Desktop\NIVY\gamification-system\database\migrations\009_event_challenges.sql`
- `C:\Users\Shadow\Desktop\NIVY\gamification-system\database\migrations\010_seasonal_challenges.sql`

**DB queries run:**

1. `SELECT table_name FROM information_schema.tables WHERE ... ILIKE '%mission|quest|challenge|seasonal|event%'` — enumerated 32 cadence-related tables.
2. `SELECT mission_type, COUNT(*) FROM mission_templates GROUP BY mission_type` — 4 daily, 6 weekly, 6 monthly, 8 seasonal, 6 onboarding, 0 special.
3. `SELECT * FROM mission_templates WHERE mission_type='monthly'` — confirmed 6 monthly templates (Festivalier, Ultra Challenger, XP Legend, Streak Master, Top 10, Explorateur), 300–600 XP.
4. `SELECT * FROM mission_templates WHERE mission_type='seasonal'` — 8 rows across ramadan, summer, halloween, christmas, new_year.
5. `SELECT mission_type, MIN/MAX/AVG(xp_reward) ...` — XP envelope per cadence (daily ~29, weekly 150, monthly 433, seasonal 756 avg).
6. `SELECT COUNT(*) FROM user_missions / seasonal_challenges / event_challenges / special_challenges` — all 0 rows.
7. `SELECT extname FROM pg_extension WHERE extname IN ('pg_cron','pg_net')` — empty (no scheduled-job infrastructure).
