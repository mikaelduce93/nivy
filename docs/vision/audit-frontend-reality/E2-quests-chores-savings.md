# E2 — Teen Quests + Chores + Savings (READ-ONLY audit)

**Scope:** quests hub, friend-defis, quest detail, chores, savings, defis-physiques (and its `/teen/challenges` alias), and the four shared client components (`defi-card`, `teen-chore-complete-button`, `goal-form`, `goal-lock-button`).

**Method:** end-to-end UI → API → RPC trace per flow. Errors / optimism / reduced-motion checked. Cross-references `app/api/teen/**` and `lib/server/unified-quest-engine`.

---

## Flow 1 — Quests (see → join → submit → reward)

**Files traced**
- `app/teen/quests/page.tsx`
- `app/teen/quests/quests-hub-client.tsx`
- `app/teen/quests/[id]/page.tsx` + `quest-detail-client.tsx`
- `app/api/teen/quests/start/route.ts`
- `app/api/teen/quests/complete/route.ts`

### Step-by-step

| # | Step | UI | Backend | State | Verdict |
|---|------|----|---------|-------|---------|
| 1 | List quests | OK — hub with 5 tabs (Daily/Brain/Body/Creative/Défis amis), pillar header, FLIP layout, View Transitions morph anchors (`vt-quest-${id}`) | `getUnifiedQuests()` + `getDailyChallenges()` + `getTeenXP()` parallel | OK | OK |
| 2 | Join / Start | "Commencer la quête" button calls `POST /api/teen/quests/start` | Tries `quests` table → falls back to `daily_challenges` | No optimistic flip on Start; just `setIsStarting(true)`; failure silently swallowed (`console.error` only, no toast) | DEGRADED |
| 3 | Submit evidence | **MISSING.** `quest-detail-client.tsx` has `steps[]` checklist UI but no photo/text/video evidence path. Steps live only client-side; no API persists step toggles | n/a | n/a | **BROKEN** |
| 4 | Complete + reward | "Terminer" button → `useOptimisticRunner` flips status to `completed`, plays `quest_complete` juice, shows +XP. On error → rollback + toast | `POST /api/teen/quests/complete` calls `add_user_xp` RPC | Optimistic OK. **BUT `add_user_xp` RPC does not exist in any migration** (`grep CREATE FUNCTION add_user_xp` → 0 results). The other route in the codebase uses `add_xp_to_user` (sport challenges). XP award silently swallowed by `catch (xpError) { console.error(...) }`. | **BROKEN (silent)** |

### Issues

- **B1 — Phantom XP RPC:** `app/api/teen/quests/complete/route.ts:94` calls `supabase.rpc('add_user_xp', …)`. No such RPC exists; the migrations define `add_xp_to_user` (used in `/api/teen/sport/challenges`). Errors caught silently → **the optimistic UI tells the teen they earned XP, but no XP is actually recorded.** This is the single highest-impact bug in this surface.
- **B2 — No evidence step:** Whitepaper / quests doc imply photo proofs for non-quiz quests. `quest-detail-client.tsx` exposes step toggles only in local state (`setSteps`), with no persistence and no upload affordance. Calling `handleComplete()` is a one-click bypass.
- **B3 — Step state loss:** Toggling steps in detail page triggers auto-complete when all are checked but never saves intermediate progress; refresh resets all.
- **B4 — `quests` table fallback path is shaky:** `start` route updates either `quest_progress` (upsert by `(quest_id, teen_id)`) or `quests.status` directly. Updating `quests.status` is wrong (it's a global row, not per-teen). Multiple teens completing the same quest would mutate shared state.
- **B5 — Start error UX:** `handleStart` failure produces only `console.error`, no toast/banner. Teen sees button stop spinning with nothing happening.
- **C1 — Confusion:** Daily tab on hub maps `dailyChallenges[*]` to a synthesized `UnifiedQuest` with `pillar: "vitality"` regardless of source pillar. Quiz-style daily challenges show under "Body" pillar header gradient.
- **C2 — Optimistic XP gauge:** `optimisticXpDelta` displays "+50 XP gagnés" inside the reward card but `TwinCurrencyGauge` on hub does not animate — XP/level stay stale until a hard refresh.
- **Reduced motion:** Hub uses `usePrefersReducedMotion` correctly for FLIP/exit animations. **Detail page (`quest-detail-client.tsx`) does NOT** — `motion.div` initial/animate run unconditionally, including step entry-stagger.

### Score — Quests: **4 / 10**
The end-to-end optimistic UX feels great, but the underlying XP grant is broken (B1) and there is no evidence pipeline (B2/B3). Detail page also misses reduced-motion gating.

---

## Flow 2 — Friend Defis (lateral branch of Quests)

**Files traced**
- `app/teen/quests/friend-defis/page.tsx`
- `app/teen/quests/friend-defis/friend-defis-client.tsx`
- `app/api/teen/friend-challenges/[id]/{accept,decline,progress,resolve}/route.ts`

| # | Step | UI | Backend | Verdict |
|---|------|----|---------|---------|
| 1 | See pending/active/completed | Three filter chips with counts; cards via `<DefiCard variant="friend">` | RLS-restricted `friend_challenges` SELECT, server-filtered by `creator_id|opponent_id` | OK |
| 2 | Accept invitation | `POST /accept` → RPC `accept_friend_challenge_v2` | OK | OK |
| 3 | Decline | Currently calls `/accept` with `{action:"decline"}` (per code comment). **There is also a `/decline` route that exists separately calling `decline_friend_challenge_v2`.** Client never uses it. | Mismatch: `/accept` route ignores body — declines will silently *accept*. | **BROKEN** |
| 4 | Record progress | "+1 progression" button → `POST /progress` `{delta:1}` → `record_friend_challenge_progress_v2` | OK but no metadata, no granular controls | DEGRADED |
| 5 | Settle (resolve) | No UI — `resolve` endpoint exists but is not invoked from the client | OK on server (cron presumably) | DEGRADED |
| 6 | Create new défi | "Lancer un défi" button routes to `/teen/quests/friend-defis/new` | **Route does not exist** (`ls app/teen/quests/friend-defis/new` → not found) | **BROKEN** |

### Issues

- **B6 — Decline is mis-wired:** `friend-defis-client.tsx:204` POSTs to `/accept` with `{action:"decline"}`. The `/accept` route ignores the body and always calls `accept_friend_challenge_v2`. A separate `/decline/route.ts` exists but the client never uses it. Declines accept the challenge instead.
- **B7 — Lancer-un-défi 404:** Primary CTA in header navigates to a route that does not exist. Wave-2 plan referenced FD3 to land it; not present in the working tree.
- **B8 — Progress API surface is too thin:** `+1 progression` button is the only progress affordance regardless of `challenge_kind` (`quiz_battle` vs `mission_race` vs `physical_count` etc.). For quiz/mission challenges, progress should be derived from real events, not manually clicked.
- **B9 — Optimistic removal but no rollback:** `setRemovedIds` adds the row on action click, but on a failure the local state is not restored — only `setActionError` surfaces. The accepted/declined card stays hidden until refresh.
- **C3 — Tab navigation thrashes:** Tapping "Daily/Brain/Body/Creative" while on `/friend-defis` triggers `router.push("/teen/quests?tab=…")`; tapping "Défis amis" on the hub `router.push`es back. Both pages depend on `?tab` and run a `useEffect` redirect — there's a brief flash of the wrong page each direction.
- **Reduced motion:** Not gated. `motion.div` per row uses `delay: index * 0.04` unconditionally.

### Score — Friend défis: **3 / 10**
Heavy concept, broken decline (B6), missing creation route (B7), one-size-fits-all progress (B8). The UI surface is well-designed but the wiring fails the basic happy-path.

---

## Flow 3 — Chores (see → complete → wait → claim)

**Files traced**
- `app/teen/chores/page.tsx`
- `app/teen/chores/chores-list.tsx`
- `components/teen/teen-chore-complete-button.tsx`
- `app/api/teen/chores/[id]/complete/route.ts`
- `app/api/parent/chores/[id]/verify-completion/route.ts` (downstream)

| # | Step | UI | Backend | Verdict |
|---|------|----|---------|---------|
| 1 | See assigned | OK — pulls both legacy `parent_chores.teen_id` AND `chore_targets` junction (multi-teen fan-out, TICKET-016), de-dupes; FLIP layout | OK | OK |
| 2 | Complete | Button uses `useOptimistic` flip to "Envoyé pour validation" + `<Celebrate confetti>` + SR announce | `POST /api/teen/chores/:id/complete` validates evidence path, inserts `parent_chore_completions`, fires personalization signal | OK |
| 3 | Photo evidence | Hidden `<input type=file capture=environment>` triggered when `evidence_required` — uploads to `defi-proofs` bucket then submits path | Path normalised (must be `<teenId>/...`, no traversal); RLS defence-in-depth | OK |
| 4 | Wait for parent | List shows "X en attente" + "Dernier refus: …" reasons | OK | OK |
| 5 | Claim coins | **No claim step** — payout is automatic on parent approval via `payout_chore_reward` RPC chained from `verify_chore_completion` | OK | OK |

### Issues

- **C4 — Wrong bucket for chore evidence:** The button uploads to `defi-proofs` bucket (line 58: `supabase.storage.from("defi-proofs")`), but the API route's docstring (`app/api/teen/chores/[id]/complete/route.ts:9`) says evidence is uploaded "to the PRIVATE Supabase Storage bucket `chore-evidence`". They disagree. The path validator only checks the prefix `<teenId>/`, so storage-side this might still resolve, but the buckets are likely separate (one for défis-physiques, one for chores) → either the upload lands in the wrong bucket or the parent's signed-read URL won't find the object.
- **B10 — `paid_at` never surfaced:** Completions carry `paid_at` (selected by the page) but the UI never displays "Payé le …" or "Coins versés". Teens can't tell from the chores page whether they got paid; they have to check the wallet/savings totals separately.
- **B11 — No rejection retry:** When a completion is rejected, the teen sees the reason but the same "Marquer comme fait" button submits a fresh completion regardless. No "Re-soumettre" semantic, and `useOptimistic` flips on first click only — second click while still in `isSubmitted` returns early (`if (...optimisticState === "submitted") return`).
- **C5 — Confusion on `required_completions`:** Chip "X/N validées" is shown next to "X en attente". A teen seeing "0/3 validées · 1 en attente" probably can't infer "you've submitted once, parent hasn't reviewed yet, you still need 2 more".
- **Reduced motion:** Chore list inherits `FlipList`/`FlipItem` from `lib/motion/flip-list`; need to verify gating but the pattern is used. `<Celebrate>` confetti — separate concern, fires on every chore completion regardless of reduced-motion.

### Score — Chores: **7 / 10**
Cleanest of the three flows. The optimistic complete + parent gate + auto-payout chain is sound. Loses points for the bucket mismatch (C4), invisible payout (B10), and rejection-retry UX (B11).

---

## Flow 4 — Savings (create → lock → progress → unlock)

**Files traced**
- `app/teen/savings/page.tsx`
- `app/teen/savings/new/page.tsx`
- `components/teen/goal-form.tsx`
- `components/teen/goal-lock-button.tsx`
- `app/api/teen/savings/goals/route.ts` (POST create, GET list)
- `app/api/teen/savings/goals/[id]/lock/route.ts`
- `app/api/teen/savings/goals/[id]/cancel/route.ts`

| # | Step | UI | Backend | Verdict |
|---|------|----|---------|---------|
| 1 | Create goal | RHF + zod, focus management, FormKeyboardAware, PremiumButton loading/success | `POST /api/teen/savings/goals` (service-role insert) | OK |
| 2 | See progress | Progress bar `current_saved_coins / target_coins`, parent-match badge | OK | OK |
| 3 | Lock coins | "Verrouiller" → input min/max gated by `spendable` → `useOptimistic` flip to "Verrouillage de N coins…" pill, on success router.refresh + Celebrate-levelup if reached | `POST /lock` → RPC `lock_to_goal` | OK |
| 4 | Goal reached | Edge-detected client-side (`currentSavedCoins + lockedAmount >= targetCoins`) → fires `<Celebrate variant="levelup">` + SR announce | DB sets `status='achieved'` (presumably inside `lock_to_goal`) | DEGRADED |
| 5 | Unlock at target | **NO UI for spending the achieved goal.** Only "Annuler" button which calls `release_from_goal` with `p_reason='cancelled'`. Even after `status='achieved'`, the page renders no "Récupérer mes coins" / "Acheter" affordance | RPC `release_from_goal` exists but only invoked with reason='cancelled' | **BROKEN** |

### Issues

- **B12 — No "achieved → spend" path:** Once a goal hits its target, the teen sees the achieved badge and… that's it. There's no "Withdraw to spendable" or "Use these coins to buy X" button. The locked coins stay locked indefinitely. The whole purpose of savings (set goal → save → buy the thing) has no terminal step in the UI.
- **B13 — `GoalLockButton` is hidden when status≠active:** `app/teen/savings/page.tsx:103` — `{g.status === "active" && <GoalLockButton …>}`. So once `achieved`, even the "Annuler" affordance disappears. Teen has no way to release the coins from inside `/teen/savings`.
- **B14 — Optimistic rollback isn't a true rollback:** `applyLock({status:"locked", amount})` followed by error → re-opens the form and shows error, but the optimistic pill rendered momentarily implies the lock succeeded. Brief misleading flash.
- **B15 — Server-side validation gap on create:** The `goal-form` enforces `targetCoins > 0`, but `app/api/teen/savings/goals/route.ts` only checks `targetCoins > 0`. There's no upper bound or sanity check (a teen can create a 999,999-coin goal). Probably fine for MVP, just noting.
- **C6 — "Locked" header tile is ambiguous:** Header shows `Total / Locked / Spendable` from `user_coins_spendable` view but no tooltip explaining "Locked = sum of all your savings goals locks". Many teens will conflate "locked" with "frozen by parent".
- **C7 — Cancel uses `confirm()`:** `goal-lock-button.tsx:102` uses native `window.confirm` — breaks with the rest of the app's modal/toast system (sonner used elsewhere). On mobile in standalone PWA mode, native confirm has known dismiss issues.
- **Reduced motion:** `goal-lock-button.tsx` does not check reduced-motion. `<Celebrate variant="levelup">` always fires when target reached.

### Score — Savings: **5 / 10**
Create + lock works well. The flow has no terminal redemption step (B12/B13), so the loop is incomplete — coins go in, never come out (except via cancel-with-forfeit semantics).

---

## Flow 5 — Défis Physiques (`/teen/defis-physiques` ≡ `/teen/challenges`)

**Files traced**
- `app/teen/defis-physiques/page.tsx`
- `app/teen/defis-physiques/defis-physiques-client.tsx`
- `app/teen/challenges/page.tsx` (one-line re-export)
- `app/api/teen/sport/challenges/route.ts`

| # | Step | UI | Backend | Verdict |
|---|------|----|---------|---------|
| 1 | List challenges | OK — daily vs programs split, category chips, `<DefiCard type="physical">` | `physical_challenges` join `teen_physical_challenge_progress` | OK |
| 2 | Start | **No button.** `DefiCard` is rendered without `href`/`ctaHref`/`ctaLabel`, so there's no clickable affordance. Sport API supports `action:"start"` but nothing in the client invokes it | n/a | **BROKEN** |
| 3 | Update progress | No UI | API `action:"update"` exists | **BROKEN** |
| 4 | Complete + proof | No UI | API `action:"complete"` accepts `proofUrl/proofType` | **BROKEN** |
| 5 | "Workout Rapide" / "Mes Stats" CTAs | Buttons present at bottom, no `onClick` handlers | n/a | **BROKEN** |

### Issues

- **B16 — Read-only client:** `defis-physiques-client.tsx` is a billboard. It displays everything but cannot start, progress, or complete a single physical challenge. The supporting API at `/api/teen/sport/challenges` (POST) is fully implemented. Whole client→server hookup missing.
- **B17 — Aliased route is identical, not redirected:** `/teen/challenges/page.tsx` is `export { default } from "../defis-physiques/page"`. SEO/analytics will see two URLs serving the same view. Either it should redirect or one should be the canonical link source. Nav surfaces still link to both inconsistently.
- **B18 — Stats hardcoded zeros:** `currentStreak = 0`, `minutesThisWeek = 0`, `workoutHistory = []` — TODO comments admit "no per-teen workout sessions endpoint yet". The UI presents data the system does not have.
- **B19 — Wrong type-narrowing on stats:** `totalWorkouts = stats.completed`. But `stats.completed` counts *physical_challenges completed*, not workouts. Tile labels "Workouts" → semantically wrong.
- **C8 — Confusion vs `/teen/quests` Body tab:** Quests hub already has a Body tab that filters `pillar === "vitality" || type === "challenge"`. Daily challenges from `getDailyChallenges()` synthesize entries with `pillar: "vitality"`. So Daily quests, Body-pillar quests, AND Défis Physiques all overlap conceptually. A teen has at least three places to look for "physical-pillar today" content with no shared progress.
- **Reduced motion:** Not gated. Every card has its own `delay: idx * 0.1` motion.div.

### Score — Défis Physiques: **2 / 10**
Pretty UI for content the user can't actually act on. The route alias and the no-op CTAs make this the most broken flow audited.

---

## Cross-cutting findings

### Redundancy / IA confusion

| Surface | Overlapping with | Notes |
|---|---|---|
| `/teen/quests?tab=daily` | `getDailyChallenges()` synthesized entries | Daily quests appear under multiple tabs depending on pillar synth |
| `/teen/quests?tab=body` | `/teen/defis-physiques` and `/teen/challenges` | Three surfaces for physical/body pillar |
| `/teen/challenges` | `/teen/defis-physiques` | Identical re-export |
| `/teen/quests?tab=friends` | `/teen/quests/friend-defis` | Tab redirects to subroute via `useEffect` (visible flash) |

Recommendation (out of scope for this read-only audit, just for the doc): collapse `/teen/challenges` and `/teen/defis-physiques` into one canonical URL; absorb physical challenges into the Body tab on `/teen/quests` rather than parallel surface; pick *either* tab-based or subroute-based friend-défis, not both.

### Reduced-motion coverage

| File | Reduced-motion gating | Verdict |
|---|---|---|
| `quests-hub-client.tsx` | Yes (`usePrefersReducedMotion` for FLIP) | OK |
| `quest-detail-client.tsx` | **No** | DEGRADED |
| `friend-defis-client.tsx` | **No** | DEGRADED |
| `chores-list.tsx` (via FlipList) | Inherits | Likely OK (verify in `lib/motion/flip-list`) |
| `teen-chore-complete-button.tsx` | **No** (Celebrate fires unconditionally) | DEGRADED |
| `goal-lock-button.tsx` | **No** (Celebrate fires unconditionally) | DEGRADED |
| `defis-physiques-client.tsx` | **No** | DEGRADED |
| `defi-card.tsx` | CSS-only animations (group-hover, transition) | OK |

### Optimistic-update coverage

| Mutation | Optimistic | Rollback on error | Reconciliation |
|---|---|---|---|
| Quest start | None (just spinner) | n/a | n/a |
| Quest complete | Yes (`useOptimisticRunner`) | Yes (snapshot/restore) | Yes (server xpEarned reconciles) |
| Chore complete | Yes (`useOptimistic`) | Auto-revert on transition fail | router.refresh |
| Friend défi accept | Optimistic removal (`removedIds`) | **No rollback** on error | router.refresh |
| Friend défi decline | Same as accept | Same | Same |
| Friend défi progress | None (just busy flag) | n/a | router.refresh |
| Goal lock | Yes (`useOptimistic`) | Re-opens form + error | router.refresh |
| Goal cancel | None (busy flag) | n/a | router.refresh |
| Physical challenge start/update/complete | n/a — UI doesn't call API | n/a | n/a |

---

## Top 5 broken steps (priority order)

1. **B1 — Quest XP grant is silently broken** (`add_user_xp` RPC missing). Optimistic UI lies. — `app/api/teen/quests/complete/route.ts:94`
2. **B16 — Défis Physiques has no action UI.** `defis-physiques-client.tsx` cannot start/update/complete despite the full API existing.
3. **B6 — Friend défi "Refuser" actually accepts** because the client posts to `/accept` with a body the server ignores. — `friend-defis-client.tsx:197-208` vs `app/api/teen/friend-challenges/[id]/accept/route.ts`
4. **B12+B13 — Savings goal has no redemption path.** Achieved goals lock coins forever; no "withdraw / spend" button; lock UI is hidden once status leaves `active`. — `app/teen/savings/page.tsx:103`
5. **B7 — `/teen/quests/friend-defis/new` 404.** Primary "Lancer un défi" CTA dead-ends.

## Score summary

| Flow | Score |
|---|---|
| Quests (start → complete → reward) | **4/10** |
| Friend Défis | **3/10** |
| Chores | **7/10** |
| Savings | **5/10** |
| Défis Physiques (≡ /teen/challenges) | **2/10** |
| **Average** | **4.2 / 10** |

---

## Files audited (absolute paths)

- `C:\Users\Shadow\Desktop\NIVY\app\teen\quests\page.tsx`
- `C:\Users\Shadow\Desktop\NIVY\app\teen\quests\quests-hub-client.tsx`
- `C:\Users\Shadow\Desktop\NIVY\app\teen\quests\[id]\page.tsx`
- `C:\Users\Shadow\Desktop\NIVY\app\teen\quests\[id]\quest-detail-client.tsx`
- `C:\Users\Shadow\Desktop\NIVY\app\teen\quests\friend-defis\page.tsx`
- `C:\Users\Shadow\Desktop\NIVY\app\teen\quests\friend-defis\friend-defis-client.tsx`
- `C:\Users\Shadow\Desktop\NIVY\app\teen\chores\page.tsx`
- `C:\Users\Shadow\Desktop\NIVY\app\teen\chores\chores-list.tsx`
- `C:\Users\Shadow\Desktop\NIVY\app\teen\savings\page.tsx`
- `C:\Users\Shadow\Desktop\NIVY\app\teen\savings\new\page.tsx`
- `C:\Users\Shadow\Desktop\NIVY\app\teen\defis-physiques\page.tsx`
- `C:\Users\Shadow\Desktop\NIVY\app\teen\defis-physiques\defis-physiques-client.tsx`
- `C:\Users\Shadow\Desktop\NIVY\app\teen\challenges\page.tsx`
- `C:\Users\Shadow\Desktop\NIVY\components\teen\defi-card.tsx`
- `C:\Users\Shadow\Desktop\NIVY\components\teen\teen-chore-complete-button.tsx`
- `C:\Users\Shadow\Desktop\NIVY\components\teen\goal-form.tsx`
- `C:\Users\Shadow\Desktop\NIVY\components\teen\goal-lock-button.tsx`
- `C:\Users\Shadow\Desktop\NIVY\app\api\teen\quests\start\route.ts`
- `C:\Users\Shadow\Desktop\NIVY\app\api\teen\quests\complete\route.ts`
- `C:\Users\Shadow\Desktop\NIVY\app\api\teen\chores\[id]\complete\route.ts`
- `C:\Users\Shadow\Desktop\NIVY\app\api\teen\savings\goals\route.ts`
- `C:\Users\Shadow\Desktop\NIVY\app\api\teen\savings\goals\[id]\lock\route.ts`
- `C:\Users\Shadow\Desktop\NIVY\app\api\teen\savings\goals\[id]\cancel\route.ts`
- `C:\Users\Shadow\Desktop\NIVY\app\api\teen\friend-challenges\[id]\accept\route.ts`
- `C:\Users\Shadow\Desktop\NIVY\app\api\teen\friend-challenges\[id]\decline\route.ts`
- `C:\Users\Shadow\Desktop\NIVY\app\api\teen\friend-challenges\[id]\progress\route.ts`
- `C:\Users\Shadow\Desktop\NIVY\app\api\teen\sport\challenges\route.ts`
- `C:\Users\Shadow\Desktop\NIVY\app\api\parent\chores\[id]\verify-completion\route.ts`
