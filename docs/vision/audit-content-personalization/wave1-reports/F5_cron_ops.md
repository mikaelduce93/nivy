# F5 — Cron + CRON_SECRET ops notes (TICKET-006)

> **Sub-agent**: F5 (V1.2-Sprint Wave 1)
> **Ticket**: TICKET-006 — *Wire `CRON_SECRET` in prod and verify daily-content
> cron run*
> **Mode**: ops / docs only — no code changes.
> **Date**: 2026-05-08

---

## 1. Current state — `vercel.json` cron registry

`vercel.json` declares **13** cron entries (the ticket said "12"; the actual
count is 13, including the `mentor-recording-retention` entry added in Wave 2
M3). All are scheduled in **UTC** (Vercel cron is always UTC; Africa/Casablanca
is UTC+1 year-round).

| # | Path | Schedule (UTC) | Casablanca local |
|---|---|---|---|
| 1 | `/api/cron/assign-missions` | `5 0 * * *` | 01:05 daily |
| 2 | `/api/cron/evolve-teen-profiles` | `0 2 * * *` | 03:00 daily |
| 3 | `/api/cron/disburse-allowances` | `0 9 * * *` | 10:00 daily |
| 4 | `/api/cron/marketplace-escrow-release` | `0 6 * * *` | 07:00 daily |
| 5 | `/api/cron/ride-curfew-check` | `0 21 * * *` | 22:00 daily |
| 6 | `/api/cron/notification-fan-out` | `*/5 * * * *` | every 5 min |
| 7 | `/api/cron/generate-daily-content` | `0 1 * * *` | 02:00 daily |
| 8 | `/api/cron/birthday-greetings` | `0 8 * * *` | 09:00 daily |
| 9 | `/api/cron/quiz-seen-history-prune` | `30 2 * * *` | 03:30 daily |
| 10 | `/api/cron/partner-payout-monthly` | `0 4 1 * *` | 05:00 1st of month |
| 11 | `/api/cron/weekly-leaderboard-rollup` | `0 22 * * 6` | 23:00 Saturday |
| 12 | `/api/cron/tag-normalize` | `0 0 * * *` | 01:00 daily |
| 13 | `/api/cron/mentor-recording-retention` | `0 2 * * *` | 03:00 daily |

The `ride-curfew-check` schedule is now correct (was buggy at `0 22 * * *`
per pre-launch audit; current `0 21 * * *` UTC fires at 22:00 Casablanca,
matching whitepaper §27 #34 and the route's own logic).

---

## 2. Orphan routes — exist in code, NOT in `vercel.json`

The `app/api/cron/` directory contains **3 additional route files** that are
deployed but unscheduled. They use the canonical `CRON_SECRET` fail-closed
pattern and are **safe to leave dormant**, but their fate must be decided
(register-or-delete) before V1.2 GA. Per pre-launch audit
`docs/vision/audit-prelaunch/06-cron-jobs.md` recommendation #3.

| Route | Why orphan | Recommended action (post-Wave 1) |
|---|---|---|
| `app/api/cron/purge-documents/route.ts` | GDPR-equivalent retention; never scheduled | Add `vercel.json` entry, suggested `30 3 * * *` UTC (04:30 Casablanca) |
| `app/api/cron/notifications/route.ts` | streak-danger + daily-rewards fan-out; superseded by `notification-fan-out` for some paths but `lib/notifications/triggers.ts` still references it | Decide: merge into `notification-fan-out` or schedule separately |
| `app/api/cron/feed-seed/route.ts` | system-activity seeder for cold-start feed (§18) | Add `vercel.json` entry, suggested `0 7 * * *` UTC (08:00 Casablanca) |

**F5 deliberately did NOT add these to `vercel.json` in this ticket.** The
F5 write-scope is "ops only" and adding a schedule to a previously dormant
route is a product-class decision (it activates a code path that has been
inert since initial setup). Tracked as separate ticket — see
`docs/vision/audit-prelaunch/06-cron-jobs.md` rec #3.

---

## 3. Pending additions in this sprint (V1.2 Wave 2 / Wave 4)

These crons do **not yet exist** in the codebase but are scheduled to be
authored by other sub-agents. Each agent owns the corresponding `vercel.json`
delta. F5 does **not** pre-add entries for them (per ticket constraint
"Don't pre-add entries for crons that haven't been built yet").

| Cron route (planned) | Wave / agent | Ticket | Recommended schedule (UTC) |
|---|---|---|---|
| `app/api/cron/parent-chore-rollover/route.ts` | Wave 2 PC3 | TICKET-017 | `5 0 * * *` UTC (01:05 Casablanca) — close-of-day |
| `app/api/cron/friend-challenge-resolve/route.ts` | Wave 2 FD4 | TICKET-022 | `*/15 * * * *` (every 15 min, fires when `ends_at` close) |
| `app/api/cron/recommendation-metrics-rollup/route.ts` | Wave 4 V1 | TICKET-038 | `0 23 * * *` UTC (00:00 Casablanca, end-of-day rollup) |

Authors: each sub-agent appends one entry to `vercel.json` in their own
PR. F5's write-scope (`vercel.json`, this ops note) is exclusive only for
the Wave 1 window; these entries are out-of-scope for Wave 1.

---

## 4. Fail-closed `CRON_SECRET` pattern reference

### Canonical pattern (Wave A.7+ vintage)

All cron routes touched in V1.2 must use this exact pattern at the top of
`GET`. Verified consistent across **all 16 files** in `app/api/cron/*` as of
2026-05-08:

```ts
export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization")
  const cronSecret = process.env.CRON_SECRET
  const isVercelCron = request.headers.get("x-vercel-cron") !== null

  // Fail-closed: if CRON_SECRET is unset, no caller can authenticate.
  // The Wave-A audit found the legacy form `if (cronSecret && authHeader !== ...)`
  // silently bypasses auth when CRON_SECRET is missing in env.
  if (!isVercelCron) {
    if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
  }
  // ... cron body
}
```

### Why fail-closed matters

If `CRON_SECRET` is absent in env (preview deploy, mis-provisioned project,
mid-rotation window), the **legacy "fail-open" form** `if (cronSecret &&
authHeader !== ...)` evaluates to `if (false && ...)` → no 401 → public
invocation.

For routes like `generate-daily-content` (unbounded LLM fan-out), this is
a money-burning DoS vector. For `purge-documents`, it would let any caller
permanently delete data. The canonical pattern above prevents both.

### Verification command (manual)

```bash
# Should 401 if no header:
curl -i https://nivy.app/api/cron/generate-daily-content

# Should 401 with bad bearer:
curl -i -H "Authorization: Bearer wrong-secret" https://nivy.app/api/cron/generate-daily-content

# Should 200 with correct bearer:
curl -i -H "Authorization: Bearer $CRON_SECRET" https://nivy.app/api/cron/generate-daily-content

# Vercel cron itself uses x-vercel-cron header — no bearer needed; verified
# by inspecting Vercel cron logs after natural firing.
```

---

## 5. `CRON_SECRET` rotation procedure

Run this procedure quarterly, after any team-member offboarding, or if a
secret leak is suspected.

### Pre-flight

1. Confirm there are no in-flight cron runs in Vercel logs
   (`/dashboard/[team]/[project]/logs?jobs=cron`).
2. Schedule rotation outside any cron's firing window (avoid 00:00–04:00
   UTC when ~7 of the 13 crons run within minutes of each other).

### Rotation steps

```bash
# 1. Generate a new strong secret (at least 32 random bytes, hex-encoded).
NEW_SECRET=$(openssl rand -hex 32)

# 2. Add it to Vercel envs for ALL three environments (production, preview,
#    development). Use --sensitive to mark it non-readable in the UI.
vercel env add CRON_SECRET production --sensitive   # paste $NEW_SECRET
vercel env add CRON_SECRET preview --sensitive
vercel env add CRON_SECRET development --sensitive

# 3. Trigger a redeploy so the new env is baked into the build.
#    DO NOT use `vercel env pull` shortcut — Vercel cron reads from build-
#    time env, so a redeploy IS required.
vercel --prod

# 4. After deploy completes, manually fire one cron with the new secret to
#    smoke-test. Use a low-impact one (tag-normalize is a good probe).
curl -i -H "Authorization: Bearer $NEW_SECRET" \
  https://nivy.app/api/cron/tag-normalize

# 5. Wait 25h, then query admin_audit_logs to confirm Vercel cron itself
#    is succeeding under the new secret:
psql $DATABASE_URL -c "
  SELECT triggered_by, action, created_at
  FROM admin_audit_logs
  WHERE action LIKE 'cron.%'
    AND created_at > NOW() - INTERVAL '25 hours'
  ORDER BY created_at DESC LIMIT 20;
"

# 6. Once verified, remove the OLD secret value if it was kept anywhere
#    (1Password, .env.local, GH Actions secret etc.).
```

### Rollback

If a redeploy breaks cron auth (any cron returns 401 in Vercel logs):

```bash
# Re-add the OLD secret as the active value:
vercel env rm CRON_SECRET production
vercel env add CRON_SECRET production --sensitive   # paste OLD_SECRET
vercel --prod
```

This is why **rotation must happen with the old secret still archived
locally** until step 5 verification passes.

### Single-source ground truth

- Production env: Vercel project **nivy-app** → Settings → Environment
  Variables → `CRON_SECRET` (sensitive).
- No copy of `CRON_SECRET` should live in:
  - `.env.local` (developer machine — use a dev-only value)
  - GitHub repo or any secret-scanned file
  - Vercel Notifications, Sentry breadcrumbs, or admin_audit_logs payloads

---

## 6. Verification of TICKET-006 acceptance criterion

> **Acceptance**: `daily_content_schedule` shows ≥1 row with
> `status='completed'` after 24h.

Manual verification (run 24h after this ticket merges + Vercel redeploys
with updated `CRON_SECRET` and TICKET-005's model-ID fix):

```sql
-- Run against project imchornjvmgmaovhypco
SELECT id, profile_type, status, error_message, generated_at, created_at
FROM daily_content_schedule
WHERE created_at > NOW() - INTERVAL '24 hours'
ORDER BY created_at DESC;
```

Expected: at least one row per active profile_type (School, Sport, etc.)
with `status='completed'`. Any `status='failed'` row should have a
populated `error_message` — investigate model-ID drift first
(TICKET-005), then provider quota.

If zero rows after 24h: check Vercel cron logs for
`/api/cron/generate-daily-content` — most common cause is `CRON_SECRET`
mis-rotation (route 401s silently and no audit row is written).

---

## 7. Summary — what F5 changed

| File | Change |
|---|---|
| `vercel.json` | **No change** (already 13 entries; orphans not added — needs separate decision) |
| `docs/vision/audit-content-personalization/wave1-reports/F5_cron_ops.md` | **New** (this file) |

| Verified | Outcome |
|---|---|
| Fail-closed `CRON_SECRET` pattern across all 16 cron routes | **PASS** — all use `if (!cronSecret || authHeader !== ...)` form |
| 13 `vercel.json` entries match real route paths | **PASS** — 1:1 path match |
| 3 orphan routes (`purge-documents`, `notifications`, `feed-seed`) | flagged for product decision; not auto-scheduled |
| Pending Wave-2 / Wave-4 cron additions | listed for owners; not pre-added |

---

**End of F5 ops note.**
