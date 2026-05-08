# Gamification — Canon Compliance Audit

> READ-ONLY audit. Source of truth: `docs/canon/gamification.locked.md` + `docs/canon/INDEX.locked.md`.
> Date: 2026-05-08. Method: file:line citations against canon sections.

**Score: 38 / 100**
**Launch status: BLOCK** — three phantom-RPC violations on hot money paths (XP awarding silently no-ops on quest complete, teen verification, partner discount), savings DB enum missing the canonical `withdrawn` terminal state, chore evidence uploaded to the wrong storage bucket, friend-defi decline routed to `/accept`, `/teen/challenges` alias still alive, `/teen/defis-physiques` is a billboard with zero action wiring, and the `/gamification/*` zone retains five live non-redirect surfaces (hub, parcours, leaderboard, roue, collections). All P0 — every one of these is a canon §9 FORBIDDEN or canon §1/§3/§4 LOCKED violation.

---

## Findings

### CANON-GAME-001 — Phantom RPC `add_user_xp` on quest complete (P0, BLOCK)

- **Severity**: P0 — silently no-ops, lying optimistic UI, canon §9 FORBIDDEN.
- **Canon**: §7 (canonical RPC = `add_xp_to_user`), §8 DEPRECATED (`add_user_xp` is PHANTOM), §9 FORBIDDEN.
- **Citation**: `app/api/teen/quests/complete/route.ts:94`
  ```ts
  await supabase.rpc('add_user_xp', {
    p_user_id: teenId,
    p_xp_amount: xpReward,
    p_source_type: questType,
    p_source_id: questId,
  })
  ```
- **Why it fails**: `add_user_xp` does not exist in the DB. Every teen quest completion awards 0 XP. The `try/catch` swallows the error so the route returns success with `xpEarned: xpReward` — the optimistic UI shows XP that was never written. No level-up, no achievement triggers, no streak signal, no weekly XP. This is the most damaging violation in the domain.
- **Fix**: rename to `add_xp_to_user` and rename `p_user_id` → `p_teen_id`; add `p_source_category` and `p_description`; remove the silent catch (or at minimum log without dropping HTTP success).

---

### CANON-GAME-002 — Phantom RPC `add_user_xp` on teen verification (P0, BLOCK)

- **Severity**: P0 — canon §9 FORBIDDEN.
- **Canon**: §7, §8, §9.
- **Citation**: `app/api/auth/validate-teen/route.ts:265-273`
  ```ts
  supabase.rpc("add_user_xp", {
    p_user_id: userInfo.profileId,
    p_xp_amount: 50,
    p_source: "teen_verification",
    p_source_id: registration.id,
  })
  ```
- **Why it fails**: parent never receives the 50 XP for verifying a teen. Also uses the bogus `p_source` (canon names it `p_source_type`).
- **Fix**: `add_xp_to_user({ p_teen_id: userInfo.profileId, p_xp_amount: 50, p_source_type: 'teen_verification', p_source_category: 'parent_action', p_source_id: registration.id, p_description: '...' })`.

---

### CANON-GAME-003 — Phantom RPC `add_user_xp` on partner discount apply (P0, BLOCK)

- **Severity**: P0 — canon §9 FORBIDDEN.
- **Canon**: §7, §8, §9, §5 (VIP transactional XP multipliers should run through canonical RPC).
- **Citation**: `app/api/partner/apply-discount/route.ts:188-194`
  ```ts
  await supabase.rpc("add_user_xp", {
    p_user_id: memberId,
    p_xp_amount: xpEarned,
    p_source: "partner_purchase",
    p_source_id: usageId,
  })
  ```
- **Why it fails**: teens never receive partner-purchase XP; VIP `×1/×2/×3` multiplier (canon §5) never fires on this path. Silent catch.
- **Fix**: rename RPC + parameters; route VIP multiplier through `user_xp.xp_multiplier` or pass an explicit multiplier source.

---

### CANON-GAME-004 — `/teen/challenges` is a duplicate-body-pillar alias (P0, BLOCK)

- **Severity**: P0 — canon §1 (Pillars hub-tabs FROZEN), §8 DEPRECATED.
- **Canon**: §1 ("All five are facets of `/teen/quests`"), §8 ("`/teen/challenges/page.tsx` (alias re-export of `defis-physiques`) — DEPRECATED — Convert to `redirect('/teen/quests?tab=body')`").
- **Citation**: `app/teen/challenges/page.tsx:1-2`
  ```ts
  // Alias of /teen/defis-physiques — keep both routes pointing at the same data + UI.
  export { default } from "../defis-physiques/page"
  ```
- **Why it fails**: not a redirect — a literal re-export. Doubles the body-pillar surface, contradicts canon §1 "single canonical view".
- **Fix**: replace file content with `import { redirect } from 'next/navigation'; export default function() { redirect('/teen/quests?tab=body') }`. Then delete next pass per canon §8.

---

### CANON-GAME-005 — `/teen/defis-physiques` separate hub still live (P1)

- **Severity**: P1 — canon §11.1 founder ruling (F11 in INDEX.locked.md = MERGE), canon §10 MISSING (action UI absent).
- **Canon**: §1 ("`/teen/quests` is THE quest hub"), §11.1 recommendation: MERGE into `/teen/quests?tab=body`. INDEX F11 ruling: **Merge. 308 redirect; kill `/teen/challenges` re-export.**
- **Citation**: `app/teen/defis-physiques/page.tsx:49-62`, `app/teen/defis-physiques/defis-physiques-client.tsx:1-393` (entire client).
- **Why it fails**: the hub is still served (no redirect), the parallel body-pillar surface contradicts canon §1, AND the client is a billboard — `<DefiCard>` invocations on lines 287 and 334 receive zero `onClick` props and no start/update/complete affordances are rendered. Even the "Workout Rapide" button (line 381) has no handler. This is the §10 MISSING gap left in place.
- **Fix**: redirect `/teen/defis-physiques` → `/teen/quests?tab=body`, surface `physical_challenges` rows via the unified-quest engine in the body tab, and wire start/progress/complete onto those cards via `POST /api/teen/sport/challenges`.

---

### CANON-GAME-006 — `/gamification/*` zone has five live non-redirect pages (P0, BLOCK)

- **Severity**: P0 — canon §8 DEPRECATED + INDEX cross-cutting deprecation (`/gamification/*` zone → 308 to `/teen/<canonical>`).
- **Canon**: §8 (entire zone deprecated, hub + crews + boutique + missions + defis + defis-physiques + aide-scolaire + parcours all listed as DEPRECATED or DEAD), INDEX cross-cutting deprecation table line 41.
- **Citation list (still NOT redirects)**:
  - `app/gamification/page.tsx:31-250` — full hub UI, queries `user_xp` / `user_achievements` / leaderboard / `get_user_crew` / `can_spin_wheel`. Canon §8 says "Collapse into `/teen` or `redirect('/teen')`".
  - `app/gamification/parcours/page.tsx:1-...` — `"use client"` with mock data. Canon §8: "DEAD (static mock, no consumers) — Delete".
  - `app/gamification/leaderboard/page.tsx:1-...` — full Supabase-wired leaderboard. Canon §8 implicit (parent zone deprecated; INDEX deprecates the whole zone).
  - `app/gamification/roue/page.tsx:1-...` — full fortune-wheel page.
  - `app/gamification/collections/page.tsx:1-...` — full collections page.
- **Already-correct redirects** (for completeness): `missions`, `defis`, `defis-physiques`, `aide-scolaire`, `crews`, `boutique` ✓.
- **Why it fails**: the canonical teen surface is `/teen/*`. Five live `/gamification/*` pages keep the duplicate IA alive and contradict the cross-cutting "redirect 308 to `/teen/<canonical>`" rule.
- **Fix**: replace each of the five page bodies with a `redirect()` (or `permanentRedirect()` per the existing convention in `gamification/missions/page.tsx`). Targets: hub→`/teen`, parcours→delete (DEAD), leaderboard→`/teen/leaderboard` (or merge into `/teen`), roue→`/teen/roue` (or `/teen` if no canonical), collections→`/teen/collections`.

---

### CANON-GAME-007 — Friend-defi decline POSTs to `/accept` with body branching (P0, BLOCK)

- **Severity**: P0 — canon §9 FORBIDDEN, canon §11.2 ruling (separate routes).
- **Canon**: §2 (canonical RPC `decline_friend_challenge_v2`), §9 ("Calling friend-defi `/accept` with `{action:'decline'}` — the `/accept` route ignores the body. Decline MUST POST to `/api/teen/friend-challenges/[id]/decline`."), §11.2.
- **Citation**: `app/teen/quests/friend-defis/friend-defis-client.tsx:204`
  ```ts
  // Inside handleDecline:
  const res = await fetch(`/api/teen/friend-challenges/${id}/accept`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "decline" }),
  })
  ```
- **Why it fails**: `app/api/teen/friend-challenges/[id]/accept/route.ts:36-38` calls `accept_friend_challenge_v2` unconditionally and ignores the body. Posting `action: 'decline'` to `/accept` accepts the invitation. The dedicated decline route (`app/api/teen/friend-challenges/[id]/decline/route.ts`, calls `decline_friend_challenge_v2`) exists and is correct — the client is wired to the wrong endpoint.
- **Fix**: change `friend-defis-client.tsx:204` to `/api/teen/friend-challenges/${id}/decline`, drop the `action` body field.

---

### CANON-GAME-008 — Chore evidence uploaded to `defi-proofs` bucket (P0, BLOCK)

- **Severity**: P0 — canon §3 LOCKED, §8 DEPRECATED, §9 FORBIDDEN, INDEX cross-cutting deprecation.
- **Canon**: §3 ("Evidence bucket (LOCKED): `chore-evidence` — PRIVATE Supabase Storage bucket (mig 080). NOT `defi-proofs`"), §8 ("`defi-proofs` storage bucket (for chores) — WRONG BUCKET — Use `chore-evidence`"), §9 ("Uploading chore evidence to `defi-proofs` — that bucket is for physical-challenge proofs.").
- **Citation**: `components/teen/teen-chore-complete-button.tsx:56-59`
  ```ts
  const path = `chores/${choreId}/${Date.now()}.${ext}`
  const { error: upErr } = await supabase.storage
    .from("defi-proofs")
    .upload(path, file, { contentType: file.type, upsert: false })
  ```
- **Why it fails**: wrong bucket and wrong path convention. Canon §3 mandates `chore-evidence` and path `<teen_id>/<chore_id>/<uuid>.<ext>`.
- **Fix**: switch `from('defi-proofs')` to `from('chore-evidence')`, regenerate path as `${teenId}/${choreId}/${crypto.randomUUID()}.${ext}`. Upload signed-URL only on parent verification (max 7-day TTL per canon).

---

### CANON-GAME-009 — Savings status enum missing `withdrawn` (P1)

- **Severity**: P1 — canon §4 LOCKED, §10 MISSING (must build).
- **Canon**: §4 lifecycle `draft → active → achieved → withdrawn ; sidetracks active → cancelled, active → expired`. "The `withdrawn` terminal state is REQUIRED by canon and MUST be added".
- **Citation**: `gamification-system/database/migrations/054_allowance_savings.sql:118`
  ```sql
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active','achieved','cancelled','expired')),
  ```
- **Why it fails**: DB CHECK rejects the canonical terminal state. Companion impacts: no `withdraw_from_goal` RPC exists (canon §7 / §10 MISSING), `/teen/savings/[id]` has no withdrawal affordance, `goal-lock-button.tsx` cancel-only path means achieved goals are stuck (teen cannot redeem coins back to spendable or to a shop checkout).
- **Fix**: ship a new migration that runs `ALTER TABLE public.savings_goals DROP CONSTRAINT … ; ALTER TABLE … ADD CHECK (status IN ('active','achieved','withdrawn','cancelled','expired'))`, then build `withdraw_from_goal(p_goal_id, p_destination, p_metadata)` SECURITY DEFINER RPC and the UI affordance per canon §10.

---

### CANON-GAME-010 — Quest start writes `quests.status` directly (P1)

- **Severity**: P1 — canon §9 FORBIDDEN.
- **Canon**: §9 ("Calling `quests.status` directly to mark a quest 'completed' — `quests` is a global content row. Per-teen completion lives in `user_missions` / `quest_progress`. (Currently violated in `app/api/teen/quests/start/route.ts` fallback path.)").
- **Citation**: `app/api/teen/quests/start/route.ts:77-80`
  ```ts
  const { error: questUpdateError } = await supabase
    .from('quests')
    .update({ status: 'in_progress' })
    .eq('id', questId)
  ```
- **Why it fails**: marks the global content row as `in_progress` for *every* teen. Bleeds state across users; corrupts the unified-quest engine.
- **Fix**: drop the fallback; rely on `quest_progress` upsert path. If `quest_progress` insert fails, return a 500 — do not corrupt the catalogue.

---

### CANON-GAME-011 — Quest complete writes `quests.status` (P1)

- **Severity**: P1 — same as 010, different file.
- **Canon**: §9 (same FORBIDDEN clause).
- **Citation**: `app/api/teen/quests/complete/route.ts:55-58`
  ```ts
  await supabase
    .from('quests')
    .update({ status: 'completed' })
    .eq('id', questId)
  ```
- **Why it fails**: identical to 010 — marks global content row complete, not the per-teen `quest_progress` row.
- **Fix**: drop the fallback; on `quest_progress` upsert error return 500.

---

### CANON-GAME-012 — Daily-challenge fallback is deprecated (P2)

- **Severity**: P2 — canon §8 DEPRECATED.
- **Canon**: §8 ("`daily_challenges` table fallback in `/teen/quests/[id]` — DEPRECATED — Migrate to unified `quests` + `quest_progress` (per-teen)").
- **Citations**:
  - `app/api/teen/quests/start/route.ts:36-58` (daily_challenges fallback path)
  - `app/api/teen/quests/complete/route.ts:62-89` (daily_challenges fallback path)
- **Fix**: route both endpoints exclusively through `quest_progress` against the unified engine; delete the `daily_challenges` branch.

---

### CANON-GAME-013 — Sport challenge auto-validates with `validated=true` on proof post (P1)

- **Severity**: P1 — canon §9 FORBIDDEN.
- **Canon**: §9 ("Auto-validating `physical_challenges.complete` with `validated=true` the moment `proofUrl` is posted (current `app/api/teen/sport/challenges` behaviour). Honor-system farming is forbidden").
- **Citation**: `app/api/teen/sport/challenges/route.ts:314-326`
  ```ts
  const { data: updatedProgress, error } = await supabase
    .from("teen_physical_challenge_progress")
    .update({
      current_value: challenge.objective_value,
      completed: true,
      completed_at: new Date().toISOString(),
      validated: true,
      validated_at: new Date().toISOString(),
      proof_url: proofUrl || null,
      …
      xp_earned: xpReward,
      updated_at: new Date().toISOString(),
    })
  ```
  Lines 340-346 then call `add_xp_to_user` immediately — XP awarded before any moderation. Side note: this is the only physical-challenge XP grant that uses the **correct** RPC name; clean it up at the same time.
- **Why it fails**: any teen can self-validate by uploading a placeholder image. Honor-system farming.
- **Fix**: drop `validated=true` and `validated_at` from the complete path; require an admin/parent moderation step to flip `validated`. Delay the XP grant until validation.

---

### CANON-GAME-014 — Sport challenge UI not wired (P1)

- **Severity**: P1 — canon §10 MISSING (action UI), audit verdict from canon §10.
- **Canon**: §10 ("Défis-physiques action UI — `defis-physiques-client.tsx` is a billboard. Backend (`POST /api/teen/sport/challenges` with `action ∈ {start,update,complete}`) is fully wired but client has no `onClick` for 'Commencer', 'Update progress', or 'Complete + proof'.").
- **Citation**: `app/teen/defis-physiques/defis-physiques-client.tsx:261-291` (Daily challenges grid — `<DefiCard type="physical" {...props}/>` rendered with no `onClick`/`onStart`/`onComplete`); lines 308-338 (Programs grid — same); line 381 ("Workout Rapide" `<Button>` has no `onClick`).
- **Why it fails**: backend POST exists but no UI invokes it. Per canon §10 + §11.1 recommendation, the correct fix is the merge into `/teen/quests?tab=body` rather than building a parallel UI here.
- **Fix**: see CANON-GAME-005.

---

### CANON-GAME-015 — Friend-defi `/new` route missing (P1)

- **Severity**: P1 — canon §10 MISSING.
- **Canon**: §10 ("Friend-défi `/new` route — `/teen/quests/friend-defis/new` does not exist. Primary 'Lancer un défi' CTA dead-ends.").
- **Citation**: `app/teen/quests/friend-defis/friend-defis-client.tsx:273` pushes to `/teen/quests/friend-defis/new`; `Glob('app/teen/quests/friend-defis/**')` returns only `page.tsx`, `friend-defis-client.tsx`, `loading.tsx` — no `new/` directory exists.
- **Why it fails**: the primary "Lancer un défi" button 404s.
- **Fix**: scaffold `app/teen/quests/friend-defis/new/page.tsx` + form (opponent picker via `recommend_friends`, `challenge_kind` selector, `target_value`, `duration_hours`, `xp_stake`, `expires_in_hours`) → `POST /api/teen/friend-challenges` → `create_friend_challenge_v2`. Companion: confirm `app/api/teen/friend-challenges/route.ts` POST is wired to the v2 RPC.

---

### CANON-GAME-016 — Celebrate callsite guard (FALSE POSITIVE — informational)

- **Severity**: P3 (informational — canon §9 lists this as FORBIDDEN at named callsites; verified that the primitive bakes the guard in).
- **Canon claim**: §9 ("Firing `<Celebrate>` (or any framer-motion celebration) without `useReducedMotion` / `usePrefersReducedMotion` gating. Today violated in `teen-chore-complete-button.tsx`, `goal-lock-button.tsx`, `quest-detail-client.tsx`, `friend-defis-client.tsx`, `defis-physiques-client.tsx`.").
- **Reality** (verified):
  - `components/ui/celebrate.tsx:127` calls `usePrefersReducedMotion()` and branches at line 146 (silent check icon) vs line 159 (`canvas-confetti` with `disableForReducedMotion: true`). The primitive itself enforces the guard — callsites do NOT need to call `useReducedMotion` separately.
  - `quest-detail-client.tsx`, `friend-defis-client.tsx`, `defis-physiques-client.tsx` do **not** import `Celebrate` at all (verified via grep). They use `useJuice` (which itself calls `prefersReducedMotion()` at `lib/hooks/use-juice.ts:110`) and bare `framer-motion` `<motion.*>` elements.
- **Residual risk**: bare `<motion.*>` from `framer-motion` in those three clients (and many others) are NOT reduced-motion-gated — but that is a design-system concern (raw `framer-motion` import already FORBIDDEN by INDEX cross-cutting rule 4: "use `Motion` proxy from `@/components/ui/motion`"). Tracked under domain 13.
- **Action**: update canon §9 to drop the three clients that don't use `Celebrate`, and reframe as "any motion primitive without the proxy `Motion` wrapper". No change required at the chore/goal-lock callsites.

---

### CANON-GAME-017 — Optimistic XP delta lies because RPC is phantom (P0, derived)

- **Severity**: P0 — derived from CANON-GAME-001/002/003.
- **Canon**: §9 ("Optimistic XP/coin updates without server confirmation reconciliation … Today the quest-complete optimistic delta lies because the underlying RPC is phantom.").
- **Citation**: closes once 001/002/003 land. The optimistic UI in `quests-hub-client.tsx` and `quest-detail-client.tsx` increments XP locally; with the phantom RPC, the server never wrote the delta, so on `router.refresh()` the displayed XP snaps back. Result: flicker that signals "your XP was undone".
- **Fix**: ship 001/002/003. After fix, verify that `router.refresh()` reads the new total from `user_xp` (not from `user_lifetime_stats`).

---

### CANON-GAME-018 — Streak duplication risk (P2 — informational)

- **Severity**: P2 — informational (no live writer found in this audit).
- **Canon**: §6 ("`user_streaks` canonical … `user_lifetime_stats.current_login_streak` is DERIVED").
- **Verification**: grepped the entire repo for writes to `user_lifetime_stats.current_login_streak` — only references are inside `docs/canon/gamification.locked.md` and `docs/vision/gamification.md`. No writer found in `app/**` / `lib/**` / `gamification-system/features/**`. Pass — keep policy active to prevent regression.
- **Action**: add a CI lint rule banning writes to `user_lifetime_stats.current_login_streak`.

---

### CANON-GAME-019 — Validate-teen route uses bogus `p_source` parameter name (P2)

- **Severity**: P2 — sub-issue of 002, separate fix.
- **Canon**: §7 (signature: `add_xp_to_user(p_teen_id, p_xp_amount, p_source_type, p_source_category, p_source_id, p_description)`).
- **Citation**: `app/api/auth/validate-teen/route.ts:268-269` — uses `p_source` (not `p_source_type`) and omits `p_source_category` + `p_description`.
- **Citation**: `app/api/partner/apply-discount/route.ts:191-192` — same `p_source` typo.
- **Fix**: align parameter names with mig 060's signature.

---

### CANON-GAME-020 — Validate-teen creates teen profile without `auth.users` row (cross-domain leak, P0)

- **Severity**: P0 — INDEX cross-cutting rule 2 ("`auth.users` row is created exactly once, by `supabase.auth.signUp` or admin-activation. No exceptions. Profile rows without an auth user are forbidden.").
- **Canon**: not gamification-locked but flagged here because the route lives in the gamification XP-award path.
- **Citation**: `app/api/auth/validate-teen/route.ts:184-196` inserts directly into `profiles` with `email: registration.teen_email || 'teen_${id}@teensparty.local'` and no `auth.signUp` call. The orphan profile gets `id` from `profiles.insert().select()` — no `auth.users.id` link.
- **Action**: out-of-scope for this domain audit (owned by `auth-onboarding.locked.md`), but worth surfacing because it's adjacent to one of the phantom-RPC violations.

---

## Score breakdown

| Bucket | Weight | Earned |
|---|---|---|
| §1 Quest taxonomy / hub canonicality | 15 | 4 — alias re-export live (-7), defis-physiques parallel hub (-4) |
| §2 Friend défis | 15 | 8 — schema/RPCs correct, decline route exists, but client routes decline to /accept (-5), no `/new` (-2) |
| §3 Chores | 15 | 9 — multi-parent verify exists, fan-out exists, BUT wrong storage bucket (-6) |
| §4 Savings | 15 | 8 — schema present, lock/release works, BUT `withdrawn` missing from CHECK (-4), no withdraw RPC/UI (-3) |
| §5 XP/Coins/Levels | 10 | 6 — formula + cap correct, multipliers wired, BUT three phantom-RPC paths (-4) |
| §6 Streak | 5 | 5 — no duplicate writer found |
| §7 RPC contract | 10 | 4 — three callers on phantom name, two wrong parameter names (-6) |
| §8 Deprecations cleared | 10 | 3 — five `/gamification/*` pages still live (-5), `/teen/challenges` re-export (-2) |
| §9 FORBIDDEN patterns | 5 | 1 — six of the eight FORBIDDEN clauses violated (-4) |
| §10 MISSING built | 0 | 0 — withdraw RPC, friend-defi /new, defis-physiques action UI, monthly/seasonal crons all absent |

**Total: 38 / 100 — BLOCK launch.**

Three lines of code (the three `add_user_xp` → `add_xp_to_user` renames) close the largest gap. The DB migration adding `withdrawn` and the chore-evidence bucket switch are two more small landings. After those four fixes the score lifts to roughly 70/100 and the domain unblocks; the remaining ~30 points are the §10 MISSING build-out (defis-physiques merge, friend-defi /new, withdraw_from_goal RPC + UI, monthly/seasonal mission crons).

---

## Priority-ordered fix list (P0 BLOCK)

1. **CANON-GAME-001/002/003** — three-line rename `add_user_xp` → `add_xp_to_user` + parameter rename `p_user_id` → `p_teen_id` + add `p_source_category` and `p_description` (3 files, ~20 LOC total).
2. **CANON-GAME-008** — switch `defi-proofs` → `chore-evidence` and update path (1 file, 4 LOC).
3. **CANON-GAME-007** — point `handleDecline` at `/decline` route (1 file, 1 LOC).
4. **CANON-GAME-004** — replace `/teen/challenges/page.tsx` re-export with `redirect('/teen/quests?tab=body')` (1 file, ~3 LOC).
5. **CANON-GAME-006** — convert five `/gamification/*` pages to `permanentRedirect`s; delete `parcours` (5–6 files).
6. **CANON-GAME-009** — DB migration adding `'withdrawn'` to `savings_goals.status` CHECK (1 SQL file).
7. **CANON-GAME-010/011** — drop the `quests.status` direct-write fallbacks (2 files).
8. **CANON-GAME-013** — drop `validated=true` auto-flag on sport-challenge complete (1 file, ~3 LOC).

P1 build (post-unblock):

9. **CANON-GAME-005 + CANON-GAME-014** — merge defis-physiques into `/teen/quests?tab=body` (per F11 ruling).
10. **CANON-GAME-015** — scaffold `/teen/quests/friend-defis/new`.
11. **CANON-GAME-009 (continued)** — build `withdraw_from_goal` RPC + `/teen/savings/[id]` withdraw UI.
12. Monthly/seasonal mission cron routes (canon §10).
