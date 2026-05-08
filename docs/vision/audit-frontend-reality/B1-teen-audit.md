# B1 — Teen Frontend Reality Audit

**Date:** 2026-05-08
**Scope:** every `app/teen/**/page.tsx` + teen mobile dock + teen sidebar
**Method:** READ-ONLY. Top-of-file inspection (≤60 lines per page) + nav cross-reference.

---

## Executive summary

The teen sees **two navs**: the 5-slot mobile dock (`MobileDock`) and a 15-item desktop sidebar (`TeenSidebar`).

Out of 53 teen page files, only ~28 are real production surfaces; the rest are redirect stubs (8), aliases (1), or pages with incomplete data wiring / fixtures. The teen's complaint **"énormément de pages qui ne marchent pas dans le menu"** maps to **three concrete failure modes**:

1. **Sidebar advertises pages that immediately redirect away** — `Mes Achievements`, `Mes Coins`, `Récompenses`, `Classement` (sidebar item), `Paramètres`, `Parcours Passion` ALL bounce. The user clicks, sees URL flicker, lands somewhere unexpected. Feels broken even when technically wired.
2. **Pure-fixture / mock surfaces** — `/teen/share` renders an empty array (no shareable item exists yet) → feels dead. `/teen/xp-value` is a 700+-line client-only page hitting `/api/payments/xp` which exists but returns thin data.
3. **Dock-target sub-pages with incomplete state surfaces** — Wallet, Quests, Social, Profile all real but heavy on Suspense skeletons; if any underlying RPC is missing the user sees forever-loading UI.

The dock's 5 entries (`/teen`, `/teen/quests`, `/teen/social`, `/teen/wallet`, `/teen/profile`) are all real server components with real data. **The dock is fine.** The reported breakage comes from the **sidebar** (which is desktop-only `md:flex`) AND from in-content links that lead to redirect chains or unfinished surfaces.

---

## Section 1 — Nav inventory

### Mobile dock (`components/layouts/mobile-dock.tsx`, teen branch lines 74-112)

| Slot | Label | Target | Status |
|---|---|---|---|
| 1 | Home | `/teen` | OK — server component, fully wired |
| 2 | Quests | `/teen/quests` | OK — server component, real data |
| 3 | Social | `/teen/social` | OK — Suspense + client hub |
| 4 | Wallet | `/teen/wallet` | OK — real data + shop integration |
| 5 | Profil | `/teen/profile` | OK — real data |

Hardcoded `notifications.quests = 3` and `social = 2` in `useNotifications()` line 50 — fake badges.

### Desktop sidebar (`components/dashboard/teen/sidebar.tsx`)

| # | Label | Target | Status |
|---|---|---|---|
| 1 | Dashboard | `/teen` | OK |
| 2 | Events | `/teen/events` | OK |
| 3 | Aide Scolaire | `/teen/aide-scolaire` | OK |
| 4 | Défis Physiques | `/teen/defis-physiques` | OK |
| 5 | Parcours Passion | `/teen/passions` | **REDIRECT → `/teen/quests?tab=creative`** |
| 6 | Games | `/teen/games` | OK (TODO comments on stats) |
| 7 | Circles | `/teen/circles` | OK |
| 8 | Partager | `/teen/share` | **EMPTY FIXTURE — `shareableItems = []`** |
| 9 | Mes Achievements | `/gamification/collections` | OUTSIDE TEEN SCOPE — needs cross-check |
| 10 | Mes Coins | `/teen/coins` | **REDIRECT → `/teen/wallet`** |
| 11 | Ma Streak | `/teen/streak` | OK |
| 12 | Récompenses | `/teen/wallet?tab=shop` | OK (just a query param) |
| 13 | Classement | `/gamification/leaderboard` | OUTSIDE TEEN SCOPE |
| 14 | Mon Profil | `/teen/profile` | OK |
| 15 | Paramètres | `/teen/settings` | **REDIRECT → `/teen/profile?tab=settings`** |

Sidebar "broken-feel" rate: **3/15 hard redirects + 1 empty fixture = 4/15 (27%)**.

### Other teen routes reachable via in-content links (not in nav, but exposed in dashboards/cards)

| Target | Status |
|---|---|
| `/teen/quiz`, `/teen/quiz/[id]`, `/teen/quiz/history` | OK |
| `/teen/calendar` | OK |
| `/teen/messages` | OK |
| `/teen/friends` | OK |
| `/teen/feed`, `/teen/feed/[id]`, `/teen/create` | OK |
| `/teen/leaderboard` | OK (creator leaderboard, separate from sidebar's `/gamification/leaderboard`) |
| `/teen/offres` | OK |
| `/teen/food`, `/teen/food/[partner_id]`, `/teen/food/order/[id]` | OK |
| `/teen/rides`, `/teen/rides/request` | OK |
| `/teen/mentors`, `/teen/mentors/[id]`, `/teen/mentor-sessions` | OK |
| `/teen/internships` | OK |
| `/teen/pathways` | OK |
| `/teen/chores` | OK |
| `/teen/savings`, `/teen/savings/new` | OK |
| `/teen/wallet/allowance` | OK |
| `/teen/vip-card` | OK |
| `/teen/profile/edit` | OK |
| `/teen/quests/[id]`, `/teen/quests/friend-defis` | OK |
| `/teen/activity` | CLIENT-ONLY w/ fetch — depends on `/api/teen/activities` |
| `/teen/xp-value` | CLIENT-ONLY w/ fetch — depends on `/api/payments/xp` |
| `/teen/challenges` | ALIAS of `/teen/defis-physiques` (re-export) |
| `/teen/academic` | **REDIRECT → `/teen/aide-scolaire`** |
| `/teen/map` | **REDIRECT → `/teen/social?tab=map`** |
| `/teen/shop` | **REDIRECT → `/teen/wallet?tab=shop`** |
| `/teen/shop/checkout` | OK (requires `?booking=` param else redirect to shop) |
| `/teen/shop/history` | OK |
| `/teen/rewards` | **REDIRECT → `/teen/wallet?tab=shop`** |
| `/teen/achievements` | **REDIRECT → `/gamification/collections`** |

**Total redirect stubs:** 8 (passions, coins, settings, academic, map, shop, rewards, achievements).

---

## Section 2 — Per-page scoring table

Score scale: 0=cassé/404, 5=mock visible, 8=fonctionnel mais incomplet, 10=production-ready.

| URL | Role state | Data source | Score | Top issue |
|---|---|---|---|---|
| `/teen` | guarded (role==teen) | `getTeenDashboardData` + gamification actions | 9 | Long file, many parallel awaits — fragile if any single RPC times out |
| `/teen/quests` | guarded | `getUnifiedQuests` + Supabase `user_coins` | 9 | OK |
| `/teen/social` | guarded | client hub via `SocialHubClient` | 8 | Server passes only teenId/teenName; data is fetched client-side (not visible from this audit) |
| `/teen/wallet` | guarded | `getTeenDashboardData` + shop actions + `savings_goals` | 10 | OK — best-in-class wiring |
| `/teen/profile` | guarded | profiles + teens + achievements + leaderboard + lifetime + friends | 10 | OK |
| `/teen/events` | guarded | `getTeenDashboardData(eventsLimit:50)` + signal capture | 9 | OK |
| `/teen/aide-scolaire` | guarded | `teen_grades` direct query | 9 | `any[]` typing; shape relies on table presence |
| `/teen/defis-physiques` | guarded | `physical_challenges` + `teen_physical_challenge_progress` | 9 | OK |
| `/teen/passions` | n/a | **redirect** | 3 | Sidebar lies — leads to `/teen/quests?tab=creative` |
| `/teen/games` | guarded | `getMiniGameTypes`+`getUserGameStats` | 7 | TODO line 16: `today_played/today_xp/win_streak` shape "unknown" — falls back to 0 |
| `/teen/circles` | none (no role guard) | crews actions | 8 | Missing `getUserRole` guard — relies on action-level RLS |
| `/teen/share` | none (client) | **`shareableItems: ShareableItem[] = []` (line 64)** | 4 | Hardcoded empty array; user always sees empty state |
| `/teen/coins` | n/a | **redirect** to `/teen/wallet` | 3 | Sidebar item dies on click |
| `/teen/streak` | guarded | `updateLoginStreak`+`getLifetimeStats`+`getActivityHistory`+`getDailyMissions` | 9 | Static MILESTONES table inlined (acceptable per comment) |
| `/teen/settings` | n/a | **redirect** | 3 | Sidebar lies |
| `/teen/achievements` | n/a | **redirect to `/gamification/collections`** | 3 | Cross-zone redirect; needs B-other audit on target |
| `/teen/rewards` | n/a | **redirect** | 3 | Sidebar item dies |
| `/teen/leaderboard` | auth check inline | `creator_monthly_stats` + RPC `refresh_creator_monthly_stats` | 8 | Note: this is the *creator* leaderboard — sidebar's `Classement` actually points to `/gamification/leaderboard`, NOT this file |
| `/teen/challenges` | n/a | **alias** of `/teen/defis-physiques` | 7 | Functional but duplicate URL increases nav confusion |
| `/teen/activity` | client-only `useEffect` fetch | `/api/teen/activities?limit=50` | 8 | Depends on API existing (✓ confirmed) |
| `/teen/map` | n/a | **redirect** | 3 | OK as a redirect, but no longer linked from sidebar |
| `/teen/shop` | n/a | **redirect** | 3 | OK as redirect |
| `/teen/quiz` | guarded | quiz/server actions | 9 | OK |
| `/teen/quiz/[id]` | guarded | `getQuizById` | 9 | `notFound()` if no questions |
| `/teen/quiz/history` | guarded | `getRecentQuizAttempts` + `getTeenQuizStats` | 9 | OK |
| `/teen/vip-card` | guarded | `getUserVipTier` + `teens` | 9 | OK |
| `/teen/academic` | n/a | **redirect** | 3 | Internal de-dup, fine |
| `/teen/calendar` | guarded | `getTeenDashboardData(eventsLimit:30)` | 9 | Hardcoded `xpReward: 0` — no event XP shown |
| `/teen/create` | client | POST `/api/teen/feed/submissions` | 8 | Functional, minimal UI |
| `/teen/xp-value` | client | `/api/payments/xp` (✓ exists) | 7 | Heavy 700+-line client component, types defined in-file. Real data path |
| `/teen/messages` | guarded | `direct_conversations` + `teens` | 9 | OK |
| `/teen/offres` | guarded | `recommend_for_teen` RPC + `partner_offers` | 9 | OK |
| `/teen/food` | none (service-role) | `partners` + `menu_items` | 8 | No teen role guard; service-role read |
| `/teen/food/[partner_id]` | none | service-role | 8 | OK |
| `/teen/food/order/[id]` | none | service-role | 8 | OK |
| `/teen/rides` | guarded | `ride_bookings` | 9 | OK |
| `/teen/rides/request` | guarded | (form only) | 9 | OK |
| `/teen/mentors` | guarded | mentors via authed supabase | 9 | OK |
| `/teen/mentors/[id]` | guarded | mentor row + booking RPC | 9 | OK |
| `/teen/mentor-sessions` | guarded | `mentor_sessions` direct | 9 | OK |
| `/teen/internships` | guarded | `internships` direct | 9 | OK |
| `/teen/pathways` | guarded | `career_pathways`+progress | 9 | OK |
| `/teen/chores` | guarded | `parent_chores` + `chore_targets` junction + completions | 9 | OK |
| `/teen/savings` | guarded | `savings_goals` + `user_coins_spendable` | 9 | OK |
| `/teen/savings/new` | guarded | (form only) | 9 | OK |
| `/teen/wallet/allowance` | guarded | `parent_allowances` + `allowance_disbursements` | 9 | OK |
| `/teen/profile/edit` | guarded | `profiles` direct | 9 | OK |
| `/teen/feed` | inline auth | `feed_posts` direct | 9 | OK |
| `/teen/feed/[id]` | inline auth | `feed_posts` + signal | 9 | OK |
| `/teen/friends` | guarded | RPC `recommend_friends` + client UI | 9 | OK |
| `/teen/quests/[id]` | guarded | `quests` then `daily_challenges` fallback | 8 | Falls back across two tables — fragile if both miss |
| `/teen/quests/friend-defis` | guarded | `friend_challenges` + APIs | 9 | OK |
| `/teen/shop/checkout` | guarded + booking param | `bookings` table | 8 | Hard redirect if no `?booking=` |
| `/teen/shop/history` | guarded | `shop_purchases` | 9 | OK |

---

## Section 3 — Top 10 broken / weakest teen surfaces (ranked by impact)

Ranked by *user-perceived breakage on the menu* (highest first):

1. **`/teen/share`** (sidebar slot 8) — score 4. Hardcoded `shareableItems = []`. Visible from sidebar; click → empty-state screen forever. **TODO comment line 60** explicitly says "wire to `/api/teen/achievements + /api/teen/streak` once a unified endpoint exists". Highest impact: real menu entry, real visit, dead screen.
2. **`/teen/coins`** (sidebar slot 10) — score 3. Pure `redirect("/teen/wallet")`. Sidebar shows it as its own destination ("Mes Coins"); user clicks expecting a coins page, lands on wallet (which is also slot 12). Confusing.
3. **`/teen/settings`** (sidebar slot 15) — score 3. Pure `redirect("/teen/profile?tab=settings")`. Settings is an essential mental model item; teen expects a real settings page, gets bounced into profile. Sidebar should link `/teen/profile?tab=settings` directly.
4. **`/teen/passions`** (sidebar slot 5) — score 3. Pure `redirect("/teen/quests?tab=creative")`. "Parcours Passion" is a marketing-grade brand term; redirect to a tab inside quests dilutes it.
5. **`/teen/achievements`** (sidebar slot 9 effectively, via alt path) — score 3. Redirects to `/gamification/collections` which is in a different zone (no teen sidebar/dock). User loses navigational context.
6. **`/teen/rewards`** — score 3. Redirect to `/teen/wallet?tab=shop`. Not in sidebar but referenced from cards. Same "ghost route" pattern.
7. **Sidebar's "Classement" → `/gamification/leaderboard`** — outside teen sidebar/dock zone. Same context-loss bug as #5. Plus there ALREADY exists `/teen/leaderboard` (creator-specific) — two leaderboards, one not linked from the sidebar.
8. **`/teen/games`** — score 7. Real, but the stats card shows zeros because RPC shape is unknown (TODO line 16). Visually it looks like the user has done nothing even when they have.
9. **`/teen/calendar`** — score 9 but `xpReward: 0` is hardcoded for every event (line 24 comment: "xpReward not stored on events directly; show 0 if unavailable"). User sees "+0 XP" on every event → demotivating.
10. **`/teen/quests/[id]`** — score 8. Falls back from `quests` to `daily_challenges` when first miss. If the id is neither, the page silently returns whatever the second `.single()` yields (no `notFound()` after both miss in the visible top section). Likely manifests as broken detail pages when user clicks a quest from the hub.

**Hidden 11th (not in nav but visited):**
- `/teen/xp-value` is 700+ lines, all client-side. Hits `/api/payments/xp` (exists) but the page is heavy and any cold-start fetch failure leaves the user on a skeleton with `Loader2`.

---

## Section 4 — Top 10 strongest teen surfaces (benchmarks)

These pages do the data wiring well and should be templates for the rest:

1. **`/teen/wallet`** (10/10) — real `user_coins` balance, `savings_goals` locked computation, shop rewards via canonical `getRewards` action, twin-currency surface. Best in the codebase.
2. **`/teen/profile`** (10/10) — five parallel data sources, all guarded with fallbacks (`Promise.resolve({success:false})` patterns).
3. **`/teen/streak`** (9/10) — clean parallel fetch of streak / lifetime / history / missions, with explicit `.catch(() => fallback)` for every promise.
4. **`/teen/chores`** (9/10) — handles BOTH legacy direct `parent_chores.teen_id` and new `chore_targets` junction with de-dup map. Production-ready.
5. **`/teen/savings`** (9/10) — uses `user_coins_spendable` materialized view (correct twin-currency separation).
6. **`/teen/wallet/allowance`** (9/10) — clean `parent_allowances` + disbursement history join.
7. **`/teen/mentors` + `/teen/mentor-sessions` + `/teen/mentors/[id]`** (9/10 across all three) — V1.1 P2.5 wave, comprehensive RLS-aware pattern with proper StatusBadge tokens.
8. **`/teen/internships`** (9/10) — clean filter/search via URL params, RLS-backed read.
9. **`/teen/pathways`** (9/10) — career_pathways + per-pathway progress join.
10. **`/teen/offres`** (9/10) — invokes `recommend_for_teen` RPC, hydrates partner data, captures view signal — full personalization-engine integration.

Honorable mentions: `/teen/quests` (uses `getUnifiedQuests` + parallel fetch), `/teen/quiz` (proper hub with categories + daily quiz + stats), `/teen/rides` (clean upcoming/history split), `/teen/messages` (peer-name resolution from `teens` table).

---

## Section 5 — Root-cause diagnosis for "énormément de pages qui ne marchent pas"

Three concrete causes, ranked:

### A. The desktop sidebar advertises 4 phantom routes (27% breakage rate)
`/teen/passions`, `/teen/coins`, `/teen/settings`, plus `/teen/share` (empty fixture). All are visible labels that lead to either an instant URL flicker (redirect) or an empty-state screen. **Fix:** rewrite `components/dashboard/teen/sidebar.tsx` lines 24-40 so:
- `Parcours Passion` → `/teen/quests?tab=creative`
- `Mes Coins` → remove (dup of Wallet) or → `/teen/wallet#coins`
- `Paramètres` → `/teen/profile?tab=settings`
- `Partager` → either implement the data source or remove

### B. Cross-zone redirects break navigational context
`Mes Achievements` and `Classement` jump to `/gamification/*` which has no teen dock/sidebar. The user ends up in a different layout shell with no obvious way back. **Fix:** either bring those routes under `/teen/...` or have `/gamification/*` recognize teen role and render the teen layout.

### C. Mock badges + zero-XP labels make working pages feel dead
`MobileDock.useNotifications` returns hardcoded `{quests: 3, social: 2}` (line 50). `/teen/calendar` hardcodes `xpReward: 0`. `/teen/games` falls back to 0 stats. Even though the underlying screens *work*, the user perceives the metrics as broken. **Fix:** wire real notification counts; render `xpReward` only when known instead of `+0`.

---

## Files referenced

- `components/layouts/mobile-dock.tsx` (teen branch lines 74-112)
- `components/dashboard/teen/sidebar.tsx`
- 53 `app/teen/**/page.tsx` files (full list in Section 2)
- 8 redirect-stub files: `passions`, `coins`, `settings`, `academic`, `map`, `shop`, `rewards`, `achievements`
- 1 alias file: `challenges/page.tsx` (re-exports `defis-physiques`)
- Backing APIs verified: `app/api/payments/xp/route.ts`, `app/api/teen/activities/route.ts`
- External-zone redirect targets verified to exist: `app/gamification/collections/page.tsx`, `app/gamification/leaderboard/page.tsx`
