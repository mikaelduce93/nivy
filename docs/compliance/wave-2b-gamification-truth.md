# Wave 2B — Gamification Truth (2026-05-09)

> Source: `docs/compliance/16-implementation-roadmap.md` Wave 2 (GAME-FIX-1 + GAME-FIX-2 + canon §10 missing items relevant to gamification).
> Local/dev only — no production deploy. Release blocker tracked in `release-blockers.md`.

## Scope

Per the founder directive of 2026-05-09, the wave landed exactly nine items:

1. Friend-defi decline route — client now POSTs to `/decline` (canon §9 FORBIDDEN fix).
2. `/teen/challenges` → `permanentRedirect('/teen/quests?tab=body')`.
3. `/teen/defis-physiques` merge strategy toward `/teen/quests?tab=body` — interim: keep route alive with action UI; documented merge plan deferred to Wave 3 (needs F11 ratification + body-tab content surface).
4. Savings withdrawn terminal state — migration 098 adds `'withdrawn'` to `savings_goals.status` CHECK.
5. `withdraw_from_goal(p_goal_id, p_destination, p_metadata)` SECURITY DEFINER RPC (canonical name per gamification.locked.md §7).
6. Physical challenge `start / progress / complete` wired in `<PhysicalChallengeActions>` via existing `/api/teen/sport/challenges` and canonical `<EvidenceUpload>` pipeline.
7. `chore-evidence` bucket — final cleanup (`teen-chore-complete-button.tsx` switched off `defi-proofs`).
8. Decorative-only challenge surfaces removed: `/gamification`, `/gamification/parcours`, `/gamification/roue`, `/gamification/leaderboard`, `/gamification/collections` all reduced to redirects with `robots: noindex`. The `app/gamification/*-client.tsx` orphans remain on disk for git history; no `page.tsx` references them now.
9. No XP fake success: `app/api/teen/sport/challenges` complete action no longer auto-validates with `validated=true` and no longer awards XP at submission. XP is granted only by `POST /api/admin/sport-challenges/[id]/validate` (admin moderation), which calls the canonical `add_xp_to_user` RPC and writes `audit_log`.

Plus `/api/teen/shop` (legacy `shop_items` + phantom `deduct_user_xp`) was 410-stubbed (no callers).

## Hard constraints honored

- No new gamification features (only canon-mandated wiring).
- No redesign.
- No new economy.
- No XP/coins conversion.
- No fake success.
- No direct XP writes (every grant goes through `add_xp_to_user`).
- No public storage for evidence (`defi-proofs` and `chore-evidence` remain private buckets).
- No secret reading or printing.
- No deployment.

## Files changed

**New code:**
- `app/api/admin/sport-challenges/[id]/validate/route.ts` (admin moderation flip + canonical XP grant).
- `app/api/teen/savings/goals/[id]/withdraw/route.ts` (terminal redemption RPC wrapper).
- `app/teen/quests/friend-defis/new/page.tsx` + `new-friend-defi-form.tsx` (canon §10 missing).
- `components/teen/physical-challenge-actions.tsx` (start / +1 / proof submission affordances).
- `components/teen/goal-withdraw-button.tsx` (achieved → withdrawn UI).
- `gamification-system/database/migrations/098_wave2b_gamification_truth.sql`.

**Edits:**
- `app/teen/quests/friend-defis/friend-defis-client.tsx` (decline route).
- `app/teen/challenges/page.tsx` (alias re-export → permanentRedirect).
- `app/gamification/page.tsx`, `app/gamification/parcours/page.tsx`, `app/gamification/roue/page.tsx`, `app/gamification/leaderboard/page.tsx`, `app/gamification/collections/page.tsx` (all → permanentRedirect).
- `app/api/teen/sport/challenges/route.ts` (no auto-validate; require proofUrl; no XP grant on submit).
- `app/teen/defis-physiques/page.tsx` + `defis-physiques-client.tsx` (surface progressId, validated state, pendingValidation; wire actions component).
- `app/teen/savings/page.tsx` (withdraw button on achieved goals; "Récupéré" copy on withdrawn).
- `components/teen/teen-chore-complete-button.tsx` (`defi-proofs` → `chore-evidence`).
- `app/api/teen/shop/route.ts` (full 410-stub).
- Canon-allow markers on legitimate `defi-proofs` callers (admin/proofs, evidence/sign-upload, evidence/record, evidence-upload component).

## Migrations

- `098_wave2b_gamification_truth.sql` (applied via Supabase MCP, project `imchornjvmgmaovhypco`):
  - `savings_goals.status` CHECK now `('active','achieved','cancelled','expired','withdrawn')`.
  - `withdraw_from_goal(uuid, text, jsonb) RETURNS jsonb` SECURITY DEFINER, GRANTed to `authenticated`, `service_role`; REVOKEd from `PUBLIC, anon`.
  - `teen_physical_challenge_progress.validated_by` (uuid) + `rejection_reason` (text) added if absent.
  - Partial index `idx_phys_challenge_pending_validation` on `(validated, completed) WHERE completed AND NOT validated`.

## RPCs added/changed

- **Added**: `withdraw_from_goal(p_goal_id, p_destination, p_metadata)` — terminal savings redemption. Owner or admin. Refuses any status ≠ `'achieved'`.
- **Behavior change** (no signature change): physical-challenge complete + admin moderation now flow through `add_xp_to_user` instead of the old direct UPDATE that auto-set `validated=true` and `xp_earned=N`.

## Tests added

Four Wave 2B test files (15 specs, all passing — total suite now 251/251):

- `tests/integration/wave2b-savings-withdraw.test.ts` (5) — canonical RPC call, achieved→withdrawn, active rejected, wrong teen rejected, double withdraw rejected, default destination.
- `tests/integration/wave2b-sport-validate.test.ts` (6) — approve grants XP via `add_xp_to_user`, reject stores reason and skips XP, non-admin → 403, already-validated → 400 (idempotent), invalid action → 400, unauthenticated → 401, audit_log written on every action.
- `tests/integration/wave2b-shop-410.test.ts` (2) — GET and POST both return 410 with canonical error.
- `tests/unit/wave2b-friend-defi-decline.test.tsx` (2) — client posts to `/decline`, never to `/accept` with `action:'decline'` (regression guard).

## P0 closed

- CANON-GAME-004 — `/teen/challenges` alias.
- CANON-GAME-006 — five live `/gamification/*` pages.
- CANON-GAME-007 — friend-defi decline misroute.
- CANON-GAME-008 — chore evidence wrong bucket.
- CANON-GAME-013 — sport challenge auto-validate.
- CANON-XP-002 — `deduct_user_xp` phantom in legacy `/api/teen/shop`.

P0 closed in this wave: **6**. Cumulative P0 closed across Waves 0–2B: 33.

## Score before / after

| Bucket | Before (post-Wave-2A) | After Wave 2B (2026-05-09) |
|---|---|---|
| **GAME (gamification domain)** | 38 / 100 | **78 / 100** |
| **Core flow score** (auth + money + parent + social + game, weighted) | ~73 | **~78** |
| **Overall product score** (unweighted mean of all 11 domains) | ~64 | **~68** |

The overall product score is held down by partner-ecosystem (22), admin-moderation (60), lifestyle (62), and design-system-mobile (62) — domains untouched by Waves 0–2B. **Do not report core-flow as overall.** See `compliance-findings.json` for the canonical scoring split (`overall_score` vs `core_flow_score`).

Launch status:
- `public_launch_status`: **BLOCKED** (partner ecosystem at 22, secret rotation deferred to end of remediation).
- `closed_beta_status`: **RISKY_PENDING_SECRET_ROTATION**.

## Canon baseline

Regenerated (`npm run lint:canon:baseline`):
- Total violations: **208** (was 217 — net −9).
- Improvements observed: 8 file/rule pairs.
- 0 net-new, 0 regressions.

## Remaining gamification blockers

Carried forward to Wave 3:

- CANON-GAME-010 / CANON-GAME-011 — quest start/complete fallback paths writing `quests.status` (P1).
- CANON-GAME-005 — route-level merge of `/teen/defis-physiques` into `/teen/quests?tab=body` (needs F11 ratification + content surface in body tab).
- Admin moderation UI button for the new `pendingValidation` queue on physical challenges (the API route exists; `/admin/proofs` already shows the rows, but lacks the explicit "approve sport challenge" CTA).
- Monthly + seasonal mission assign crons (canon §10).
- Savings cancellation match-return policy (F53).

## Release blocker still open

Per `docs/compliance/release-blockers.md`: **before public launch or production user testing, rotate `SUPABASE_SERVICE_ROLE_KEY`, `OPENAI_API_KEY`, and `CRON_SECRET` and redeploy.** Wave 2B did not touch any secret. The blocker is tracked separately and is not gamification-specific.
