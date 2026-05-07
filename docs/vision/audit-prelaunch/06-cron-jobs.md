# 06 — Cron + jobs reliability audit

> **Auditor**: cron + background jobs reliability
> **Mode**: read-only
> **Date**: 2026-05-07
> **Scope**: `vercel.json`, `app/api/cron/*`, RPCs that back them, expected vs declared schedule, observability

## Verdict

**AMBER (leaning RED on observability + missing crons)**.

The five Vercel-scheduled crons (`assign-missions`, `evolve-teen-profiles`, `disburse-allowances`, `marketplace-escrow-release`, `ride-curfew-check`) are well-engineered: dual auth (Vercel header + bearer), service-role clients, atomic RPC backings (`disburse_allowance` uses `FOR UPDATE` and a single `EXCEPTION WHEN OTHERS` envelope; `marketplace_auto_release_escrow` skips disputed rows; `assign_missions_for_teen` is idempotent per the recette proof). All five write `admin_audit_logs` rows with `triggered_by`, `duration_ms`, and per-row breakdowns — that satisfies invariant §29 #8.

The amber/red ledger:

1. **Four route files in `app/api/cron/*` are NOT registered in `vercel.json`** — `purge-documents`, `generate-daily-content`, `notifications`, `feed-seed`. These exist as endpoints but Vercel will never fire them. They are zombies (or expected to be hit by an external scheduler that doesn't exist in the repo).
2. **Whitepaper §29 #11 is violated by 5 minutes / multiple offsets**. The canonical schedule is `daily 00:05, weekly Mon 00:10, monthly 1st 00:15, seasonal 1st of quarter 00:20` *Africa/Casablanca*. Only `assign-missions` (`5 0 * * *` UTC = **01:05** Casablanca) refreshes near 00:05 — and even that is *one hour late* relative to local midnight, since Vercel cron crontabs are UTC and Morocco is UTC+1 year-round.
3. **Personalization spec mismatch** — `docs/vision/personalization-engine.md:392` mandates `evolve-teen-profiles` at **03:30 Africa/Casablanca**; `vercel.json` runs it at `0 2 * * *` UTC = **03:00 Casablanca**. 30-minute drift, plus the route's docstring incorrectly claims 03:00 is "Africa/Casablanca 03:00" but does not mention the spec drift.
4. **Six whitepaper-mandated crons are MISSING entirely**: `notification-fan-out` (quiet-hours fanout, §29 #10), `weekly-leaderboard-rollup`, `monthly-quest-rotation`, `birthday-greetings` (§13, P1 #17), `quiz-seen-history-prune` (§29 #9 retention), `partner-payout-monthly` (§9 #331). Allowance and escrow are present; the rest are gaps.
5. **No heartbeat / no last-run admin UI** — observability is "scrape `admin_audit_logs` and hope". A silent `vercel.json` typo or revoked `CRON_SECRET` would not page anyone.
6. **No corresponding migration file in this repo** for `evolve_all_teens` or `assign_missions_for_teen` RPCs — they are referenced by the cron routes but the migration was applied directly via Supabase MCP (per the comment style in `migrations/052_recommend_for_teen_v1.sql:3` "Live applied as Supabase migration ... on 2026-05-07"). Reproducing the schema from the repo alone would leave both crons broken.

Pre-launch, items 1, 2/3 (timezone fix), and 5 (basic heartbeat) are mandatory. Items 4 are launch-blockers for the surfaces they back (no birthday cron = §13 broken; no quiz-seen prune = unbounded growth on every quiz attempt; no monthly rotation = quest catalog stagnates).

## vercel.json declarations

`C:\Users\Shadow\Desktop\NIVY\vercel.json` (full contents):

| # | Path | Schedule (UTC) | Casablanca local | Whitepaper expected | Drift |
|---|---|---|---|---|---|
| 1 | `/api/cron/assign-missions` | `5 0 * * *` | 01:05 | daily 00:05 local | **+1h drift** (UTC-vs-Casablanca confusion) |
| 2 | `/api/cron/evolve-teen-profiles` | `0 2 * * *` | 03:00 | 03:30 local (personalization-engine.md:392) | -30 min |
| 3 | `/api/cron/disburse-allowances` | `0 9 * * *` | 10:00 | "daily 09:00" per audit prompt; spec doesn't pin TZ | +1h vs 09:00 local |
| 4 | `/api/cron/marketplace-escrow-release` | `0 6 * * *` | 07:00 | "daily 06:00" per prompt | +1h |
| 5 | `/api/cron/ride-curfew-check` | `0 22 * * *` | 23:00 | curfew is **22:00 local** per route docstring (§27 #34) | **+1h drift, BUG** |

The curfew drift is the most dangerous: route comment says "Casablanca / Morocco is UTC+1 year-round; treat 22:00 local as 21:00 UTC" (`ride-curfew-check/route.ts:28`) — but the *cron itself* is scheduled at `0 22 * * *` UTC = **23:00 Casablanca**. So the cron fires one hour after the curfew it claims to enforce; any ride scheduled between 22:00 and 23:00 local lives an extra hour before the curfew sweep cancels it. That is a safety-class bug (§5 below).

Note also Vercel's free/hobby tier limits cron frequency to once per day; all five entries comply.

## Cron route inventory

`app/api/cron/*` directory listing (from Glob):

| Route | Registered in `vercel.json` | Auth pattern | Real / scaffold / orphan |
|---|---|---|---|
| `assign-missions/route.ts` | yes | Vercel header **OR** `Bearer ${CRON_SECRET}` | real |
| `evolve-teen-profiles/route.ts` | yes | Vercel header OR Bearer | real |
| `disburse-allowances/route.ts` | yes | Vercel header OR Bearer | real |
| `marketplace-escrow-release/route.ts` | yes | Vercel header OR Bearer | real |
| `ride-curfew-check/route.ts` | yes | Vercel header OR Bearer | real (untracked file but matches vercel.json path) |
| `purge-documents/route.ts` | **NO** | Bearer only (and only enforced if `CRON_SECRET` is set — bypass when env unset) | orphan |
| `generate-daily-content/route.ts` | **NO** | Bearer only, same conditional bypass | orphan + scaffold (no `vercel.json` entry, fetches OpenAI/Claude unbounded) |
| `notifications/route.ts` | **NO** | Bearer only (mandatory) | orphan |
| `feed-seed/route.ts` | **NO** | Bearer only (mandatory) | orphan |

The four orphan routes are deployed (`/api/cron/purge-documents` etc. respond on prod) but no scheduler hits them. Either an external scheduler config exists outside the repo, or these features are dead code. Whitepaper §13 says "**Birthday cron is idempotent**" expecting an existing birthday-rewards cron — there is none. Whitepaper §16 talks about notifications fan-out — `notifications/route.ts` exists but is never scheduled.

### Auth pattern divergence

The three "Wave"-vintage crons (assign-missions, evolve-teen-profiles, disburse-allowances, marketplace-escrow-release, ride-curfew-check) use the strong dual pattern:

```ts
const isVercelCron = request.headers.get("x-vercel-cron") !== null
const hasValidBearer = typeof cronSecret === "string" && cronSecret.length > 0 && authHeader === `Bearer ${cronSecret}`
if (!isVercelCron && !hasValidBearer) return 401
```
(`assign-missions/route.ts:23-34`)

The four older orphan crons use a *weaker* pattern that **bypasses auth entirely if `CRON_SECRET` is unset**:

```ts
if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
  return NextResponse.json({ error: "Non autorisé" }, { status: 401 })
}
```
(`purge-documents/route.ts:12-14`, `generate-daily-content/route.ts:21-23`)

If `CRON_SECRET` is absent (e.g. preview env, misconfigured prod), these routes are **publicly invokable**. `generate-daily-content` then fans out unbounded LLM calls (a money-burning DoS vector). `purge-documents` calls `execute_document_purge` RPC which permanently deletes data.

`notifications/route.ts:6` and `feed-seed/route.ts:6` use the strict form (`if (authHeader !== Bearer...)` with no env-presence check) — those are safe-by-default. So the divergence is just on the two oldest routes.

## Per-cron audit table

| Cron | Schedule (UTC) | Casablanca | Auth | Idempotent | Atomic | Per-row error isolation | Audit log | Status |
|---|---|---|---|---|---|---|---|---|
| `assign-missions` | `5 0 * * *` | 01:05 | dual | yes (RPC says "0 inserted" on re-run, recette §53-62) | per-RPC (one teen at a time) | yes — `try/continue` per teen (`route.ts:88-95`) | yes (`route.ts:106-118`) | **OK, but +1h TZ drift** |
| `evolve-teen-profiles` | `0 2 * * *` | 03:00 | dual | yes (decay is convergent — running twice in same window is a no-op-ish; second pass sees `days_since_last_update≈0`) | single `evolve_all_teens` RPC, presumably loops internally | unknown — depends on RPC body, not in repo | yes (`route.ts:82-94`) | **OK, but spec says 03:30 local** |
| `disburse-allowances` | `0 9 * * *` | 10:00 | dual | yes — `disburse_allowance` returns `not_due` if `next_disbursement_at > NOW()`  (`054_allowance_savings.sql:399-401`) | yes — `SELECT ... FOR UPDATE` (`054_allowance_savings.sql:386`) + `EXCEPTION WHEN OTHERS` envelope (`:493-495`) | per-row try/continue (`route.ts:73-110`) | yes (`route.ts:115-130`) | **OK** |
| `marketplace-escrow-release` | `0 6 * * *` | 07:00 | dual | yes — RPC filters `status='escrow' AND auto_release_at <= now()`, second run finds none (`056_marketplace_c2c.sql:684-693`) | RPC is a single PL/pgSQL `FOR ... LOOP` calling `confirm_receipt`; no transaction wrapper but each `confirm_receipt` is itself transactional | per-row error TABLE return (`056:697-700`) but **the cron route does not log per-row errors with row IDs to admin_audit_logs** — only counts | partial (`route.ts:43-49` logs `rows` array) | **OK** |
| `ride-curfew-check` | `0 22 * * *` | 23:00 | dual | yes — second run finds nothing because rows are now `status='cancelled'` | not atomic — N independent `UPDATE` calls in a JS loop with no transaction; if process is killed mid-loop, half the bookings are cancelled, half aren't | per-row `if (!upErr) cancelled++` (`route.ts:50-58`) — silent failure on `upErr`, no log of *which* booking failed | partial (`route.ts:62-72`) | **TZ BUG (fires 1h late) + silent error swallow** |

### Per-cron findings

#### assign-missions — `app/api/cron/assign-missions/route.ts`

- **Auth**: dual pattern, correct (`:23-34`).
- **Idempotency**: confirmed by recette (`docs/vision/IMPLEMENTATION_RECETTE.md:55` — "inserted: 0 (idempotent re-run)").
- **Error isolation**: `for...of` with `continue` on RPC error (`:88-95`) — one teen failing does **not** halt the run.
- **Logging**: full per-teen breakdown in `admin_audit_logs.payload.per_teen` (`:111-117`).
- **Throughput risk**: serial RPC calls, no batching. At 100k teens that's ≥10 minutes (Vercel free-tier cron has a 60s soft / 300s hard cap on hobby plans, longer on Pro). **Will OOM/timeout at scale** — needs paginated invocation or a single SQL function that loops server-side. Not a launch blocker for tens-of-thousands tier, blocking at scale.
- **TZ**: `5 0 * * *` UTC = 01:05 Casablanca, **not** 00:05 local. Whitepaper §29 #11 spells out 00:05 local.

#### evolve-teen-profiles — `app/api/cron/evolve-teen-profiles/route.ts`

- **Auth**: dual pattern (`:23-34`).
- **Backing RPC `evolve_all_teens`**: **NOT in any migration file in the repo** (Grep confirms: only the route + `verify-evolve-profiles.ts` reference it). The route calls `supabase.rpc("evolve_all_teens")` (`:41`) and trusts the RPC was applied via Supabase MCP. This is a **drift risk**: a `db reset` from migration files leaves this cron broken.
- **Idempotency**: per spec (`personalization-engine.md:397`) decay is `score := score * 0.95^days_since_last_update + delta` — running twice in the same minute means `days_since_last_update≈0`, second pass is roughly idempotent. Acceptable.
- **Error handling**: single `if (error)` (`:45`) — full failure short-circuits, no partial progress visible. RPC must succeed wholesale.
- **TZ**: route docstring (`:5-6`) says "02:00 UTC (03:00 Africa/Casablanca)" — the spec (`personalization-engine.md:392`) says **03:30 Casablanca**. Either route docstring is wrong or the schedule is. 30-minute drift.

#### disburse-allowances — `app/api/cron/disburse-allowances/route.ts`

- **Auth**: dual pattern (`:30-41`).
- **Pre-filter**: `is_active=true`, `next_disbursement_at <= NOW()`, `paused_until` past or null (`:48-53`). Good. The raw SQL `paused_until.is.null,paused_until.lt.${nowIso}` works because PostgREST ORs.
- **Atomicity**: `disburse_allowance` (`054_allowance_savings.sql:368-496`) does:
  1. `SELECT ... FOR UPDATE` row lock (`:386`)
  2. Conditional eval (`:406-426`)
  3. Compute `v_next` (`:429`)
  4. Either insert skipped row + advance (`:432-440`) OR call `top_up_teen` (`:452`)
  5. On topup failure: insert failed row, **do NOT advance** `next_disbursement_at` (`:455-468`) — so the cron retries it next run. Good.
  6. On success: insert succeeded row + advance (`:473-483`)
  7. `EXCEPTION WHEN OTHERS THEN RETURN jsonb_build_object('success', false, 'error', SQLERRM)` (`:493-495`) — catches anything from `top_up_teen` (savings goal locks, balance constraints, etc.) but **does not advance `next_disbursement_at`**, so next run retries. Correct semantics.
- **Per-allowance error isolation**: route loops, accumulates `succeeded/skipped/failed` (`:73-111`), continues on RPC error.
- **TZ**: cron at 09:00 UTC = 10:00 Casablanca. Audit prompt says "daily 09:00" — if that 09:00 is UTC, fine; if local, +1h drift.
- **Money impact** of failure: see §5.

#### marketplace-escrow-release — `app/api/cron/marketplace-escrow-release/route.ts`

- **Auth**: dual (`:17-26`).
- **Backing RPC** (`056_marketplace_c2c.sql:674-702`):
  - Selects `status='escrow' AND auto_release_at <= now() AND NOT EXISTS (open dispute)` (`:684-693`) — disputes are honored.
  - For each, calls `confirm_receipt(buyer_user_id)`. **The cron is impersonating the buyer** — semantically equivalent to the buyer clicking "received" after the auto-release window. That's spec-correct (whitepaper §19 marketplace).
- **Atomicity**: each `confirm_receipt` call is its own SQL function, presumably transactional. The outer `marketplace_auto_release_escrow` loop is **not** wrapped in BEGIN/COMMIT — but since each iteration is an independent escrow release, partial failure is acceptable (un-released rows are picked up next run).
- **Logging**: route logs full `rows` array to `admin_audit_logs` (`:43-49`) — good for forensics.

#### ride-curfew-check — `app/api/cron/ride-curfew-check/route.ts`

- **Auth**: dual (`:15-23`).
- **Logic** (`:30-43`): computes today's 21:00 UTC (= 22:00 Casablanca) and tomorrow's 21:00 UTC, queries rides scheduled in that window with `status IN ('requested','approved')` and `curfew_override = false`, then UPDATEs each to `cancelled`.
- **Schedule bug**: cron is at `0 22 * * *` UTC = **23:00 Casablanca**. So between 22:00 and 23:00 local, no curfew sweep has occurred yet — a teen can have an `approved` ride for 22:30 local that leaves the house. The cron then runs at 23:00 local, after the ride has departed. **Fix**: either schedule at `0 21 * * *` UTC (= 22:00 local), or move the curfew enforcement to a per-row check at booking-creation time (which is the safer answer).
- **Atomicity**: N independent UPDATEs in a JS loop (`:49-58`). If the function process is killed mid-loop or hits Vercel's hard timeout (60-300s), some rides are cancelled and some aren't — orphan state. Wrap in a single SQL `UPDATE ... WHERE id IN (...) RETURNING *` or call a `cancel_curfew_violations()` RPC. Single-statement UPDATE is atomic.
- **Silent failure**: `if (!upErr) cancelled++` (`:58`) — `upErr` is *not* logged, *not* counted, *not* surfaced. Audit log shows `cancelled` count and `candidates` count; if they diverge, the operator has no per-ride trail.
- **No notification to parent**: cron silently flips status to `cancelled`. Whitepaper §16 invariants imply parent notification on cancellation; not wired here.
- **No `xx-override` reason in update**: only `cancellation_reason: "curfew_22h"` (`:54`) — fine for one mode, but if curfew time becomes per-city / per-age configurable, this hardcoded string drifts.

## Missing crons (per whitepaper expectations)

The whitepaper, personalization spec, and lifestyle audits explicitly require these scheduled jobs. Compared to `vercel.json` actually-shipped:

| Cron | Spec source | Recommended schedule | Status | Severity |
|---|---|---|---|---|
| `assign-missions` | §29 #11 | `5 23 * * *` UTC (= 00:05 local) | shipped at 01:05 local | drift |
| `weekly-quest-refresh` | §29 #11 (`weekly Mon 00:10 local`) | `10 23 * * 0` UTC | **MISSING** — `assign_missions_for_teen` is supposedly cadence-aware so does it cover weekly? Recette §55 says it tops up daily 3 + weekly 3 + monthly 3 + seasonal 1 in a single run, so daily call can suffice. Verify. | low |
| `monthly-quest-rotation` | §29 #11 (`monthly 1st 00:15 local`) | `15 23 1 * *` UTC | **MISSING** as a separate job. Same caveat as weekly — if `assign_missions_for_teen` handles all four cadences in one daily run, this is moot. Otherwise required. | medium |
| `seasonal-quest-rotation` | §29 #11 (`1st of quarter 00:20 local`) | `20 23 1 1,4,7,10 *` UTC | **MISSING** — same caveat | medium |
| `evolve-teen-profiles` | personalization-engine.md:392 | `30 2 * * *` UTC (= 03:30 local) | shipped at 03:00 local, -30min drift | low (cosmetic) |
| `tag-normalize` (LLM normalize free-text tags → canonical) | personalization-engine.md:155-157, 769-770 | nightly | **MISSING** | medium — admin-review queue for unmappable tags will silently grow |
| `disburse-allowances` | P1+2 §26 | daily 09:00 local | shipped at 10:00 local | low |
| `marketplace-escrow-release` | §19 marketplace | daily 06:00 local | shipped at 07:00 local | low |
| `ride-curfew-check` | §27 #34 | daily 22:00 local | shipped at **23:00 local** | **HIGH (safety)** |
| `notification-fan-out` (quiet-hours-aware) | §29 #10, P1 #19 | every 15 min, suppress 22h-7h Casablanca | **MISSING** — `lib/notifications/triggers.ts` exists, `app/api/cron/notifications/route.ts` exists but is NOT in `vercel.json` | **HIGH** — invariant #10 is unenforceable without this fan-out wired |
| `weekly-leaderboard-rollup` | §6 / §29 (leaderboards are visible product surfaces) | `0 0 * * 6` UTC | **MISSING** — leaderboards exist (`migrations/002_leaderboard_system.sql`) but stale-roll-up risk | medium |
| `monthly-quest-rotation` | §6 | (see above) | MISSING | medium |
| `birthday-greetings` (P1 #17, §13) | §13:476 | daily 09:00 local | **MISSING** — no `app/api/cron/birthday-rewards` route exists | **HIGH** for §13 product spec |
| `quiz-seen-history-prune` (keep last 30d, §29 #9 says "last 7 days" matters) | implicit retention | daily | **MISSING** — `quiz_seen_history` (recette §97 says it's table 046) grows unbounded | medium-high — DB bloat over months |
| `partner-payout-monthly` | §9:331 | `0 6 1 * *` UTC | **MISSING** | medium (revenue-side) |
| `ambassador-payout-monthly` | §27 #18 (threshold 200 DH) | `0 6 1 * *` UTC | **MISSING** | medium (revenue-side) |
| `generate-daily-content` (quiz/mission AI gen) | §7 | daily | route exists but **not in vercel.json** — unscheduled | medium — if AI content not generated, daily quiz pool stagnates |
| `purge-documents` | (data retention / GDPR-equivalent) | daily | route exists but **not in vercel.json** | medium |
| `feed-seed` (system-activity for cold-start feed) | §18 | hourly or daily | route exists but **not in vercel.json** | low |
| `streak-danger-checks` (`checkStreakDanger`) | §16 notifications | every hour or daily evening | route exists (`/api/cron/notifications?type=streak`) but **not in vercel.json** | medium |
| `daily-rewards-checks` (`checkDailyRewards`) | §16 | daily | route exists but **not in vercel.json** | medium |

## Failure-mode analysis

What is the worst case if each cron silently fails for a week?

### P0 — must page on first miss
- **`disburse-allowances`** — angry teens / parents, real money flow, brand-trust event. Allowance day is sacred. A stuck `next_disbursement_at` for 1000 families = 1000 support tickets. **PAGE.**
- **`ride-curfew-check`** — safety class. A 14-year-old in an Uber at midnight is a P0 PR incident. Currently this cron *itself* is buggy (TZ off by 1h); even in normal operation, missing this for a week = unenforced curfews. **PAGE.**
- **`notification-fan-out` (missing today)** — invariant §29 #10 is "no notification sent during quiet hours". Without a quiet-hours-aware fanout, every push goes immediately and may fire at 02:00 → invariant violation → re-rejected PRs and sleep-broken teens. Currently the live system relies on either client-side filtering or no-fanout-at-all. **PAGE.**

### P1 — must alert next business day
- **`assign-missions`** — quest hub goes empty after 1-2 days, daily-quiz selector starves, retention craters. Recoverable by manual re-run (idempotent). **ALERT.**
- **`marketplace-escrow-release`** — sellers wait an extra week to be paid. 3-day auto-release becomes 10-day. Bad reviews, churn. **ALERT.**
- **`evolve-teen-profiles`** — recommendations stale, but workable: `recommend_for_teen` falls back on `teen_interests` (`052_recommend_for_teen_v1.sql:58-65`), so cold-start path holds. Quality degrades slowly. **ALERT.**
- **`partner-payout-monthly` (missing today)** — partners paid late = contract breach risk. Monthly job, so a one-month miss is felt on the 2nd of next month. **ALERT.**
- **`monthly-quest-rotation` / `weekly-leaderboard-rollup` (missing today)** — surfaces look unchanged; users notice slowly.

### P2 — best-effort
- **`birthday-greetings` (missing today)** — minor; teens miss +500 XP gift. No money, no safety. **TICKET.**
- **`quiz-seen-history-prune` (missing today)** — table grows ~1 row per quiz attempt × 30 days = bounded by attempt rate; weeks before it bites query latency. **TICKET.**
- **`tag-normalize` (missing today)** — admin review queue grows; unmappable tags don't surface in recommendations. **TICKET.**
- **`feed-seed` (orphan)** — cold-start feed less interesting. **TICKET.**

## Hardcoded / scaffolded

- **`generate-daily-content/route.ts:54-56`** — hardcoded `.limit(100)` on teens query with comment "Limiter pour éviter de surcharger". Above 100 active teens, profile groups skew. Soft-limit; not a bug per se but will need pagination.
- **`generate-daily-content/route.ts:96, 137`** — quiz/mission `category` is a *3-branch ternary* on profile name (`School` / `Sport` / else `general`). The 50-tag taxonomy from personalization spec is not used here. Stub-quality matching.
- **`generate-daily-content/route.ts:107`** — `code: 'DAILY_${today}_${profileType}_${Date.now()}'` — `Date.now()` makes the code non-idempotent within the same day; multiple invocations create N quiz rows for the same date. Couple this with the missing schedule entry and you get nothing today and bursty duplication on manual fire.
- **`ride-curfew-check/route.ts:28-29`** — comment says "Casablanca / Morocco is UTC+1 year-round". That's correct (Morocco is on +01:00 permanently as of 2018), but the cron schedule itself ignores that.
- **`marketplace-escrow-release/route.ts:48`** — `payload: { released, errors, duration_ms, rows }` — the `rows` array is dumped into `admin_audit_logs` jsonb verbatim, with no size cap. At 1000+ releases/day this audit row balloons.
- **`disburse-allowances/route.ts:127`** — same `per_allowance` dump risk.
- **`assign-missions/route.ts:115`** — same `per_teen` dump risk; explicitly listed too. The audit row will exceed PostgreSQL toast threshold (8KB) at ~50 teens, which is fine — toast handles it — but the row becomes opaque to BI tools.
- **`feed-seed/route.ts`** and **`notifications/route.ts`** — terse, only call a single function then return `{success: true}`. Not scaffolds, but they have **no per-row error isolation, no logging beyond `console.error`, no admin_audit_logs write**. If they fail partially, you'd never know.
- **`purge-documents/route.ts:22-24`** — `console.log("[v0] Document purge completed:", data)` — the `[v0]` prefix is the Vercel-v0-codegen marker. This route was generated by v0 and never hand-tuned. The `POST` handler at `:38-74` allows a logged-in admin to manually purge — fine — but the GET handler bypass (`if (cronSecret && ...)`) is the issue noted above.
- **No cron uses `request.headers.get("x-vercel-cron-id")` or similar tracing header** — there's no correlation ID flowing from Vercel cron event → logs.

## Observability

- **No heartbeat / dead-man-switch**. If `vercel.json` has a typo, or `CRON_SECRET` is rotated and not redeployed, every cron silently 401s and nobody sees it. Recommendation: a `/api/admin/cron-health` endpoint that joins `admin_audit_logs` for the last 25h per cron name and flags any cron that hasn't logged.
- **No admin UI to see "last run at"**. Operations are blind. Whitepaper §29 #8 is satisfied (audit logs are written) but there's no read-side surface.
- **No structured log format**. The Wave-vintage crons log to console (`console.error("[cron/assign-missions] ...")`) and to `admin_audit_logs`. No `pino`/structured JSON, no Sentry/Logtail integration evident in the routes.
- **No metrics emission**. `duration_ms` is in audit payload but nothing scrapes it. P50/P95 cron runtime is unknowable without manual SQL.
- **No runtime budget enforcement**. Personalization spec (`personalization-engine.md:410-411`) says "Target runtime budget: ≤ 90s for first 10k teens". The route doesn't enforce or alert on overrun.

## Recommendations

Numbered, prioritized.

1. **[P0] Fix `ride-curfew-check` schedule** — change `vercel.json:7` from `"0 22 * * *"` to `"0 21 * * *"` so it fires at 22:00 Casablanca, matching §27 #34 and the route's own logic. Add a Playwright-style integration test that mocks "now" and confirms a 22:30 ride is cancelled before 22:30. This is a safety bug, ship the fix before launch.

2. **[P0] Fix the orphan-route bypass auth** — in `purge-documents/route.ts:12` and `generate-daily-content/route.ts:21`, change `if (cronSecret && authHeader !== ...)` to `if (!cronSecret || authHeader !== ...)`. Do not let an unset env var open the route. Same pattern as `feed-seed`/`notifications`.

3. **[P0] Decide each orphan route's fate**: register in `vercel.json` (with the spec'd schedule from the Missing-crons table) OR delete the route. Today they are deployed-but-unused attack surface.

4. **[P0] Wire `notification-fan-out` cron**. Add `vercel.json` entry for `/api/cron/notifications` (and probably `?type=streak` and `?type=daily` separately, or merge in the route). Crucially, make sure the fan-out itself respects quiet hours (22h-7h Casablanca, §29 #10) — currently `lib/notifications/triggers.ts` does not gate by hour. Without this, invariant #10 is unenforceable.

5. **[P1] Commit migrations for `evolve_all_teens` and `assign_missions_for_teen`** to the repo. Today they are "live applied" via Supabase MCP and absent from `gamification-system/database/migrations/`. A fresh `db reset` from the repo cannot reproduce production. Add `053_evolve_all_teens.sql` and an `assign_missions` migration, even if just CREATE OR REPLACE wrappers around the live functions.

6. **[P1] Time-zone alignment to whitepaper §29 #11**. Convert all five existing crons to crontab entries that hit local time:
   - `assign-missions`: `"5 23 * * *"` UTC (= 00:05 Casablanca)
   - `evolve-teen-profiles`: `"30 2 * * *"` UTC (= 03:30 Casablanca, matches personalization spec)
   - `disburse-allowances`: `"0 8 * * *"` UTC (= 09:00 Casablanca)
   - `marketplace-escrow-release`: `"0 5 * * *"` UTC (= 06:00 Casablanca)
   - `ride-curfew-check`: `"0 21 * * *"` UTC (= 22:00 Casablanca)

7. **[P1] Build the missing P1+ crons** in this order: `birthday-rewards` → `quiz-seen-history-prune` → `partner-payout-monthly` → `tag-normalize` → `weekly-leaderboard-rollup`. Each has a single owner in the spec.

8. **[P1] Wrap `ride-curfew-check`'s loop in a single SQL UPDATE or a `cancel_curfew_violations()` RPC**. Eliminates partial-state risk, gives one atomic write, and the RPC can write per-cancellation rows in `admin_audit_logs` from inside the transaction.

9. **[P1] Add per-cron heartbeat** — a tiny `cron_runs(cron_name, started_at, finished_at, ok, payload)` table written by every cron at start and end. Lets ops query "which crons haven't fired in 25h?" trivially. Combine with an `/admin/cron-health` page that joins this and flags red.

10. **[P1] Cap audit-log payload sizes**. For `assign-missions`, `disburse-allowances`, `marketplace-escrow-release`: only emit per-row arrays when there are errors *or* the run has `<= 100` rows. Otherwise emit aggregate counts only. Prevents jsonb bloat at 10k+ teens.

11. **[P2] Add a runtime budget guard**. If a cron runs longer than its target (90s for evolve, 60s for assign-missions, etc.), emit a warning row to `admin_audit_logs` with `severity='warn'`. Cheap pre-launch insurance.

12. **[P2] Move the in-route iteration of `assign-missions`** (one RPC per teen) into a single `assign_missions_for_all_active_teens()` SQL function. Server-side loop is ~50× faster than N round-trips and survives Vercel's function timeout.

13. **[P2] Document the cron registry**. A markdown table in `docs/vision/operations.md` listing every cron, its schedule (UTC + local), its RPC, its expected runtime, its failure-mode tier (P0/P1/P2), its on-call owner. Today no such index exists.

14. **[P2] Add `Sentry.captureException` (or equivalent)** to every cron's catch block, in addition to `console.error`. Vercel captures stdout, but cross-deploy alerting requires an external sink.

15. **[P2] Migrate to Vercel Cron's `vercel.json` schema-v2 with `headers`** when GA'd, removing the dual-auth complexity. For now, dual auth is correct because it lets ops manually trigger via `curl` with the bearer.

---

**File references**:
- `C:\Users\Shadow\Desktop\NIVY\vercel.json:1-9`
- `C:\Users\Shadow\Desktop\NIVY\app\api\cron\assign-missions\route.ts:23-129`
- `C:\Users\Shadow\Desktop\NIVY\app\api\cron\evolve-teen-profiles\route.ts:23-108`
- `C:\Users\Shadow\Desktop\NIVY\app\api\cron\disburse-allowances\route.ts:30-143`
- `C:\Users\Shadow\Desktop\NIVY\app\api\cron\marketplace-escrow-release\route.ts:17-55`
- `C:\Users\Shadow\Desktop\NIVY\app\api\cron\ride-curfew-check\route.ts:15-82`
- `C:\Users\Shadow\Desktop\NIVY\app\api\cron\purge-documents\route.ts:7-36`
- `C:\Users\Shadow\Desktop\NIVY\app\api\cron\generate-daily-content\route.ts:15-201`
- `C:\Users\Shadow\Desktop\NIVY\app\api\cron\notifications\route.ts:1-32`
- `C:\Users\Shadow\Desktop\NIVY\app\api\cron\feed-seed\route.ts:1-18`
- `C:\Users\Shadow\Desktop\NIVY\gamification-system\database\migrations\054_allowance_savings.sql:368-498`
- `C:\Users\Shadow\Desktop\NIVY\gamification-system\database\migrations\056_marketplace_c2c.sql:674-703`
- `C:\Users\Shadow\Desktop\NIVY\gamification-system\database\migrations\052_recommend_for_teen_v1.sql:1-3`
- `C:\Users\Shadow\Desktop\NIVY\docs\vision\PRODUCT_WHITEPAPER.md:1026` (canonical schedule §29 #11)
- `C:\Users\Shadow\Desktop\NIVY\docs\vision\PRODUCT_WHITEPAPER.md:476` (birthday cron expectation §13)
- `C:\Users\Shadow\Desktop\NIVY\docs\vision\PRODUCT_WHITEPAPER.md:331` (partner-payouts expectation §9)
- `C:\Users\Shadow\Desktop\NIVY\docs\vision\personalization-engine.md:386-411` (evolve-teen-profiles 03:30 spec)
- `C:\Users\Shadow\Desktop\NIVY\docs\vision\IMPLEMENTATION_RECETTE.md:53-62` (assign-missions idempotency proof)
