# Gamification Architecture

> Status: documentation-only consolidation (architecture-consolidator phase).
> The four folders below host gamification code that intentionally serves
> different roles. **Do not move business logic between them in a single PR**;
> the boundary rules are described here so new code lands in the right place.

## TL;DR — Where does new code go?

| You want to add… | Land it in |
| --- | --- |
| A pure helper / scoring / heuristic with no DB or network calls | `lib/gamification/` |
| A server action / Zod schema for the **classic** (lean) XP/streak/challenge domain | `features/gamification/` |
| A server action, hook, type, or helper for the **rich** gamification platform (achievements, missions, crews, wheel, mini-games, shop, seasonal events, vip…) | `gamification-system/features/<feature>/` |
| A reusable **classic** UI piece (XP bar, streak counter, level badge, achievements list, quest card, gamification dashboard provider) | `components/gamification/` |
| A UI piece tightly coupled to a `gamification-system` feature (notifications dropdown, leaderboard widget, wheel modal, shop card, etc.) | `gamification-system/components/<feature>/` |

Cross-folder imports must go through the public `index.ts` of the target
folder. Reaching into a deep file path across folders is a smell.

---

## The four folders

### 1. `lib/gamification/` — pure logic helpers

- **What lives here:** stateless helpers that compute things from inputs.
- **Current contents:**
  - `anti-abuse.ts` — fatigue / shadow-nerf rules from `UsageMetrics`.
  - `quest-recommender.ts` — recommendation scoring (note: imports
    `@/lib/supabase/server` to fetch state, but logic itself is pure scoring).
- **Allowed dependencies:** `@/lib/supabase/server` for read-only fetches,
  shared `lib/*` utilities, type-only imports from `features/gamification` or
  `gamification-system`.
- **Forbidden:** React, server actions, side-effects on UI, mutations.

### 2. `features/gamification/` — classic Server Actions domain

- **What lives here:** the lean XP/streak/daily-challenge slice that pre-dates
  the bigger `gamification-system`. Server Actions, Zod schemas and adaptive
  helpers consumed by app routes/dashboards via `@/features/gamification`.
- **Current contents:** `actions.ts`, `schema.ts`,
  `smart-challenge-assignment.ts`, `adaptive-difficulty.ts`, `index.ts`.
- **Public API:** `features/gamification/index.ts` (canonical entry).
- **Allowed dependencies:** `@/lib/supabase/server`, `lib/gamification/*`,
  `next/cache`, Zod.
- **Forbidden:** importing from `gamification-system/**` (keep the two
  domains decoupled — see "Why two domains?" below).

### 3. `gamification-system/` — rich gamification platform

- **What lives here:** the full platform — achievements, missions, leaderboard,
  shop, wheel, mini-games, crews, seasonal/event challenges, VIP, profile
  customization, social-sharing, stats dashboard, notifications, onboarding,
  etc. Each lives under `gamification-system/features/<feature>/` with its own
  actions / hooks / types and a feature-local `index.ts`.
- **Sub-folders:**
  - `gamification-system/features/<feature>/` — server logic and hooks.
  - `gamification-system/components/<feature>/` — UI tightly coupled to a
    feature (e.g. notification center, leaderboard widget).
  - `gamification-system/api/` — feature-specific API helpers.
  - `gamification-system/database/` — SQL migrations and the migration runner.
- **Public API:** `gamification-system/index.ts` re-exports each feature
  under a namespace (`Achievements`, `Missions`, `Leaderboard`, `Wheel`, …).
  Consumers should import the namespace, not deep paths.

### 4. `components/gamification/` — classic shared UI

- **What lives here:** the lean React components used across the app for the
  classic XP/streak/quest experience: `xp-bar.tsx`, `streak-counter.tsx`,
  `quest-card.tsx`, `level-up-modal.tsx`, `achievements.tsx`,
  `gamification-dashboard.tsx`, the `gamification-provider.tsx` context,
  buddy selector, etc.
- **Public API:** `components/gamification/index.ts`. New consumers should
  import from `@/components/gamification`.
- **Forbidden:** importing private files inside `gamification-system/**`
  (use that subsystem's `index.ts` instead).

---

## Why two domains? (`features/gamification` vs `gamification-system`)

`features/gamification` is the **legacy lean slice** the app shipped first:
XP, streaks, daily challenges. It is small, well-typed, and consumed by the
core teen dashboard.

`gamification-system` is the **larger platform** added later: achievements,
crews, wheel, shop, seasonal events, mini-games, etc. It has its own tables,
its own UI surface, and its own public namespace exports.

The two are **not duplicates** — they cover different feature surface areas.
A future, larger PR may merge them. Until then:

- New "classic XP / streak / quest" work → `features/gamification`.
- New "achievement / crew / wheel / shop / mission / leaderboard" work →
  `gamification-system/features/<feature>`.
- Pure helpers usable by both → `lib/gamification`.

If you discover a true duplicate (same exported name, same shape, same
behavior) in both folders, prefer **delete the dupe and update imports**
rather than re-exporting (re-exports add a layer; this folder is here to
shed layers, not grow them).

---

## Cross-cutting rules

1. **Import via `index.ts`.** Cross-folder imports go through the public
   barrel of the target folder. Inside a folder you may import deep paths.
2. **No business logic in `components/gamification`.** UI only — call a
   server action or hook from `features/gamification` or
   `gamification-system/features/<feature>`.
3. **No React in `lib/gamification` or `features/gamification`** (server-only
   modules; `'use server'` actions are fine, JSX is not).
4. **Notification UI duplication is intentional.** The app-wide notification
   bell lives under `components/notifications/notification-bell.tsx` and has
   contract `<NotificationBell userId={…} />`. The
   `gamification-system/components/notifications/notification-center.tsx`
   exposes its own `NotificationBell` with contract
   `({ unreadCount, onClick })` — it is a distinct domain widget, not a
   replacement. See the docstring at the top of
   `components/notifications/notification-bell.tsx`.

---

## Files to watch for the next maintainer

- `gamification-system/index.ts` and `features/gamification/index.ts` —
  any change to these is a public-API change and may break consumers.
- `components/gamification/gamification-provider.tsx` — the root context
  that drives the classic gamification dashboard.
- `lib/gamification/quest-recommender.ts` — only "pure" file that touches
  Supabase; if it grows side-effects, move it under `features/gamification`.
- `gamification-system/database/run-migrations.ts` — uses the canonical
  `createServiceRoleClient()` helper; keep it that way.
