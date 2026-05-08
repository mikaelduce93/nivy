# V1 — Recommendation metrics daily rollup audit (TICKET-038)

> **Sub-agent**: V1 (V1.2-Sprint Wave 4 / validators)
> **Ticket**: TICKET-038 — *Recommendation metrics daily rollup*
> **Mode**: read-only — DB queried via MCP, no code changed.
> **Date**: 2026-05-08

---

## 1. Verdict

**Status: NOT_BUILT.** The target rollup table `recommendation_metrics_daily`
exists with the canonical 6-column schema, but the cron route
`app/api/cron/recommendation-metrics-rollup/route.ts` does **not exist**, no
entry exists in `vercel.json`, and the upstream impression/completion
event-source the rollup needs (`content_recommendations`) is empty because
**no application code path writes to it** today. This report acts as the
hand-off TICKET for V1.3.

Acceptance criterion from TICKET-038 — *“each day produces 1 row per
content_type with acceptance/completion/diversity metrics”* — is **failing**:
zero rows for any date. Wave 3 (P3 + P4 + P6 + P7) made the recommender
*compute* good output but never persisted what it served, so the rollup has
no impression layer to aggregate.

---

## 2. Live DB snapshot (project `imchornjvmgmaovhypco`, 2026-05-08)

### 2.1 Row counts

| Table | Rows | Last write | Notes |
|---|---:|---|---|
| `behavioral_signals` | **15** | 2026-05-07 07:57:40 UTC | post Wave 2 P2 caps, only 1 teen seeded |
| `content_recommendations` | **0** | — | comment: *“Recommandations intelligentes basées sur ML”* (mig 034). Never written by app code. |
| `recommendation_metrics_daily` | **0** | — | PK `(date, content_type)`. Schema present, never inserted. |
| `teen_neighbours` | **0** | — | `recompute_neighbours` runs only when teen has ≥3 affinity rows; only 1 teen has 3 rows but the cron has not run on this snapshot’s data. |
| `affinity_scores` | **3** | 2026-05-07 07:57:49 UTC | 1 teen × 3 tags |
| `recommendation_weights` | **12** | 2026-05-08 00:16:10 UTC | mig 085 v2 active for `quiz/defi/event/partner_offer` |
| `teen_behavioral_profile` | 0 | — | reserved table, unused |
| `admin_audit_logs` (action LIKE 'cron.%') | **0** | — | no cron has logged through audit yet on this project |

### 2.2 Schema — `recommendation_metrics_daily`

```
date           date          NOT NULL
content_type   text          NOT NULL
shown_count    integer       NOT NULL DEFAULT 0
clicked_count  integer       NOT NULL DEFAULT 0
completed_count integer      NOT NULL DEFAULT 0
novelty_count  integer       NOT NULL DEFAULT 0
PRIMARY KEY (date, content_type)
```

The table is intentionally minimal (4 counters per content_type per day). It
captures only `shown / clicked / completed / novelty`, **not** the full set of
metrics named in this ticket’s rubric (P50/P90 score, friend_resonance share,
no-repeat-burned). Whether to extend or to keep narrow is a V1.3 design call;
see §5.

### 2.3 Sample rows (5 each)

#### `behavioral_signals` (5 most recent)

| id | teen_id | signal_type | target_type | target_id | weight | created_at |
|---|---|---|---|---|---:|---|
| 15 | 37ff…e1b9 | favorite | partner_offer | ab36…32fc | 2.00 | 2026-05-07T07:57:40Z |
| 14 | 37ff…e1b9 | view | partner_offer | ab36…32fc | 1.00 | 2026-05-07T07:57:40Z |
| 13 | 37ff…e1b9 | favorite | event | 50bf…8196 | 2.00 | 2026-05-07T07:57:40Z |
| 12 | 37ff…e1b9 | click | event | 50bf…8196 | 2.00 | 2026-05-07T07:57:40Z |
| 11 | 37ff…e1b9 | view | event | 50bf…8196 | 1.00 | 2026-05-07T07:57:39Z |

Distribution (15 rows total): view×5, favorite×4, complete×3, click×2,
start×1. Wave 2 P2 caps (5 share + 5 favorite/day per item) are not stressed
yet — only 1 active teen.

#### `content_recommendations` — **EMPTY**

#### `recommendation_metrics_daily` — **EMPTY**

#### `teen_neighbours` — **EMPTY**

#### `affinity_scores` (3 rows, all rows shown)

| teen_id | tag | score | signal_count | updated_at |
|---|---|---:|---:|---|
| 37ff…e1b9 | academic_math | 9.5000 | 5 | 2026-05-07T07:57:49Z |
| 37ff…e1b9 | sport_football | 5.5000 | 3 | 2026-05-07T07:57:49Z |
| 37ff…e1b9 | music_pop | 3.5000 | 2 | 2026-05-07T07:57:49Z |

### 2.4 Cron route presence

`ls app/api/cron/` shows 18 routes; **none** match
`recommendation-metrics-rollup`. `vercel.json` declares 15 cron entries; the
ticket-target entry is absent. F5’s Wave 1 ops note already flagged
`recommendation-metrics-rollup` as a planned addition “Wave 4 V1” at
schedule `0 23 * * *` UTC — a placeholder, not the implementation.

---

## 3. Status: **NOT_BUILT**

Bucketing per the ticket prompt’s tri-state:

- **SHIPPED** — N/A. No route, no rows, no cron entry.
- **STUB** — N/A. There is no stub file at the target path; the route
  directory simply does not exist.
- **NOT_BUILT** — yes. Even the upstream data the rollup needs is missing
  (no `content_recommendations` writes, no `teen_neighbours` rows on
  inspection day).

**Two-layer gap:**

1. **Sink layer** (the rollup cron) — does not exist.
2. **Source layer** — `content_recommendations` is *defined* (mig 034) and
   *typed* in `types/supabase.ts`, but the recommend handler
   `app/api/teen/recommendations/route.ts` and the RPC
   `recommend_for_teen` v4 (mig 085) **do not insert** into it. Recommended
   items are returned to the client and forgotten. There is no impression
   ledger to roll up.

This means TICKET-038 cannot be implemented in isolation. A predecessor
ticket — *“persist served recommendations + downstream signal correlation”*
— must land first. See §5 acceptance & §6 V1.3 hand-off.

---

## 4. Wave 3 work that DID land (context for the gap)

For completeness, what Wave 3 delivered against the personalization stack
(verified live):

- **P3 / mig 084** — `recompute_neighbours` RPC and the Phase-2 loop in
  `app/api/cron/evolve-teen-profiles/route.ts` (lines 99-151). The cron is
  in `vercel.json` at `0 2 * * *` UTC. It is wired and fail-closed:
  rejects when neither `x-vercel-cron` nor `Authorization: Bearer
  ${CRON_SECRET}` is present (route lines 41-53).
- **P4 / mig 085** — `recommend_for_teen` v4 with collab + friend_resonance
  + true-novelty + difficulty_fit. v2 weights now active for `quiz`,
  `defi`, `event`, `partner_offer` (12 rows in `recommendation_weights`,
  4 with `version=2 & is_active`).
- **P6/P7 caps** — visible in behavioral_signals weights (`view=1`,
  `click=2`, `favorite=2`, `complete=…`).

These pieces compute and serve excellent rankings, but they do not write
anything that can be measured later. The “measurement debt” is the
`content_recommendations` insert + the rollup cron.

---

## 5. V1.3 spec — what the rollup SHOULD compute

(Acts as the implementation spec when the predecessor data path lands.)

### 5.1 Predecessor task (BLOCKER — must land first)

Add an `INSERT INTO content_recommendations` step inside
`app/api/teen/recommendations/route.ts` (and any future `/api/teen/feed`
caller of `recommend_for_teen`) such that **every** RPC return is
persisted. Schema columns to fill on insert:

| Column | Source |
|---|---|
| `id` | `gen_random_uuid()` |
| `teen_id` | request session teen id |
| `content_type` | request `?type=…` |
| `content_id` | RPC row `id` |
| `recommendation_score` | RPC row `score` |
| `confidence_level` | optional — derive from `array_length(reason)` or leave NULL |
| `recommendation_factors` | parsed `reason` string into jsonb (`{aff,col,fr,nov,ctx,diff}`) |
| `status` | `'shown'` initially |
| `recommended_at` | `now()` |
| `shown_at` | `now()` (server returns row to client → client *will* render unless network drops) |
| `expires_at` | `now() + interval '7 days'` (matches no-repeat-burned window) |

A second hook in `lib/analytics/signals.ts` (P2 already exists per Wave 2)
should `UPDATE content_recommendations SET status = 'completed' /
'clicked'` and stamp `actual_performance` when a matching
`(teen_id, target_type, target_id)` signal lands within the
`recommended_at … expires_at` window. This gives the rollup a clean
join without rescanning behavioral_signals every night.

Effort estimate: M (2-3h) for the insert + the signal-correlation update
RPC.

### 5.2 Cron route — `app/api/cron/recommendation-metrics-rollup/route.ts`

**Auth pattern** (copy verbatim from `evolve-teen-profiles` lines 41-53,
proven fail-closed — F5 audit confirms):

```ts
const isVercelCron = request.headers.get("x-vercel-cron") !== null
const cronSecret = process.env.CRON_SECRET
const hasValidBearer = typeof cronSecret === "string"
  && cronSecret.length > 0
  && request.headers.get("authorization") === `Bearer ${cronSecret}`
if (!isVercelCron && !hasValidBearer)
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
```

**Schedule**: `0 23 * * *` UTC (00:00 Casablanca, end-of-day rollup) — F5
already pre-allocated this slot. Add to `vercel.json`. The schedule must
fire AFTER the day to roll up has fully closed; rolling up *yesterday* on
the next-day-zero-hour is the safe pattern.

**SQL aggregation** (single statement, idempotent via UPSERT on the
`(date, content_type)` PK):

```sql
INSERT INTO recommendation_metrics_daily
  (date, content_type, shown_count, clicked_count, completed_count, novelty_count)
SELECT
  (recommended_at AT TIME ZONE 'UTC')::date AS date,
  content_type,
  COUNT(*) FILTER (WHERE status IN ('shown','clicked','completed')) AS shown_count,
  COUNT(*) FILTER (WHERE status IN ('clicked','completed')) AS clicked_count,
  COUNT(*) FILTER (WHERE status = 'completed') AS completed_count,
  COUNT(*) FILTER (WHERE
       (recommendation_factors->>'nov')::numeric >= 0.5
  ) AS novelty_count
FROM content_recommendations
WHERE (recommended_at AT TIME ZONE 'UTC')::date = (NOW() - INTERVAL '1 day')::date
GROUP BY 1, 2
ON CONFLICT (date, content_type) DO UPDATE SET
  shown_count     = EXCLUDED.shown_count,
  clicked_count   = EXCLUDED.clicked_count,
  completed_count = EXCLUDED.completed_count,
  novelty_count   = EXCLUDED.novelty_count;
```

The 4-column counter shape matches the existing schema. **Do not extend
the table** in V1.3 unless product wants the richer metrics (§5.3).

**Audit log** (mirror `evolve-teen-profiles` lines 156-178):

```ts
await supabase.from("admin_audit_logs").insert({
  action: "cron.recommendation_metrics_rollup",
  target_type: "system",
  payload: {
    ok: true,
    date: yesterday,
    rows_upserted: result.length,
    duration_ms,
    triggered_by: isVercelCron ? "vercel-cron" : "bearer",
  },
})
```

Failure path: catch the SQL error, log audit with `ok: false`, return
`500`. F5 cron-ops report calls out that the route MUST audit even on
failure path.

### 5.3 Optional richer-metrics extension (PRODUCT decision, not V1.3)

The ticket prompt names extra metric categories the current 4-column table
does NOT capture:

- **CTR per content_type** — derivable at read-time as
  `clicked_count::float / NULLIF(shown_count,0)`. No schema change needed.
- **P50/P90 score** — needs `recommendation_score` percentiles. Requires
  2 new columns: `score_p50 numeric`, `score_p90 numeric`. Compute via
  `percentile_cont(0.5/0.9) WITHIN GROUP (ORDER BY recommendation_score)`.
- **Novelty rate** — `novelty_count::float / NULLIF(shown_count,0)`. Read-
  time derivable.
- **friend_resonance contribution** — needs new column
  `friend_resonance_share numeric`. Compute via
  `AVG((recommendation_factors->>'fr')::numeric)`.
- **No-repeat-burned count** — count of recommendation rows where
  `(recommendation_factors->>'seen7d') = '1'` or where
  `recommendation_factors->>'reason' LIKE '% seen7d=1 %'`. Needs new
  column `repeat_burned_count integer`.

If product wants any of these, add them as a follow-up migration
`086_recommendation_metrics_v2.sql` and extend the cron’s SELECT. No
breaking change — additive columns with safe defaults.

Recommended for V1.3 first delivery: ship the 4-column rollup as
specified in §5.2 (matches existing schema and ticket acceptance literally).
Defer the score-percentile and friend-share additions to a V1.4 metrics
expansion ticket.

---

## 6. Acceptance verification (TICKET-038)

| Acceptance bullet | State | Evidence |
|---|---|---|
| Cron route exists at `app/api/cron/recommendation-metrics-rollup/route.ts` | **FAIL** | Glob returned no match |
| `vercel.json` schedules the cron | **FAIL** | 15 entries, none for this path |
| Reads `behavioral_signals` + `content_recommendations` | **FAIL (partial)** | tables exist, cron does not |
| Writes `recommendation_metrics_daily` | **FAIL** | 0 rows |
| Each day produces ≥1 row per active content_type | **FAIL** | trivially |
| Auth fail-closed on cron | **N/A** | nothing to call |
| Acceptance/completion/diversity metrics captured | **FAIL** | rollup absent; 4-col schema would partially satisfy |

**Overall**: the ticket is unimplemented. Wave 3 prerequisites
(TICKET-035 = recommend_for_teen v4, dependency listed in TICKETS.md line
485) are met, but the missing predecessor (impression-persistence) blocks
this ticket entirely.

---

## 7. Recommended actions

In priority order:

1. **(BLOCKER, V1.3)** Persist served recommendations. Insert into
   `content_recommendations` from `app/api/teen/recommendations/route.ts`
   on every successful RPC return. Effort: M.
2. **(BLOCKER, V1.3)** Correlate signals → recommendations: add an
   `UPDATE content_recommendations SET status, actual_performance` step
   in the existing signal-record path (`lib/analytics/signals.ts` /
   `app/api/teen/signals/record/route.ts`) when a matching pending
   recommendation exists in the 7-day window. Effort: M.
3. **(V1.3)** Author `app/api/cron/recommendation-metrics-rollup/route.ts`
   per §5.2; add `vercel.json` entry `{"path":"/api/cron/recommendation-metrics-rollup","schedule":"0 23 * * *"}`.
   Use the `evolve-teen-profiles` route as the canonical auth + audit
   template. Effort: S (the SQL is one statement once §1 + §2 land).
4. **(V1.3 or after)** Backfill `content_recommendations` from existing
   `behavioral_signals` if a retro view is desired. Optional — ticket
   acceptance does not require it.
5. **(V1.4)** Decide whether to extend `recommendation_metrics_daily`
   schema with score percentiles and factor-level shares per §5.3.
   Product input required. The current 4-column shape satisfies
   TICKET-038 acceptance literally; additions are a UX-driven follow-up.
6. **(Hygiene)** Once the rollup is shipped, add a 7-day staleness
   monitor: alert if `MAX(date) FROM recommendation_metrics_daily <
   today - 2`. Mirrors the operational pattern recommended in F5’s
   cron-ops note for other daily crons.
7. **(Independent)** Investigate why `admin_audit_logs` shows zero
   `cron.*` entries despite multiple crons being scheduled. Either
   crons have not fired on this project (likely — DB is dev / staging),
   or the audit-log inserts are silently failing. Out of scope for
   TICKET-038 but flagged for the cron-ops sub-agent.

---

## 8. Outstanding gaps

- `content_recommendations` table is dead code today: defined, typed, but
  never written. Either delete (if rollup is built differently) or fill
  (per §5.1). Choosing the former changes the rollup design — it would
  have to read raw `behavioral_signals` and infer “shown” from a proxy
  (e.g. presence of an event-emitted `'recommended'` signal_type that
  doesn’t exist yet). This is messier and not aligned with the ticket’s
  file list. Recommend: keep `content_recommendations`, fill it.
- `teen_neighbours` is empty in this snapshot even though 1 teen has 3
  affinity rows (`MIN_AFFINITY_ROWS_FOR_NEIGHBOURS`). This means either
  (a) the evolve cron has not fired since affinity_scores were seeded
  (most likely — affinity rows were inserted at 07:57 UTC on 2026-05-07
  and the cron fires at 02:00 UTC daily, so the next firing was
  2026-05-08T02:00 — after my snapshot), or (b) the recompute_neighbours
  RPC is silently filtering this teen out. The 24h window will resolve
  this naturally on the next cron tick. Track a follow-up validation in
  Wave 5.
- Neither `friendships` nor `behavioral_signals` from neighbouring teens
  exist yet, so the `friend_resonance` and `collab_signal` terms in
  `recommend_for_teen` v4 evaluate to 0 in production until cohort grows.
  This is a *data sparsity* issue, not a code gap; flagged as a context
  point for the rollup interpretation (a v1.3 rollup will report
  novelty_count ≈ shown_count for cold-start days).

---

## 9. References

- Ticket: `docs/vision/audit-content-personalization/TICKETS.md` lines 473-485
- Plan slot: `docs/vision/audit-content-personalization/EXECUTION_PLAN.md` line 170
- Pre-allocated schedule: `docs/vision/audit-content-personalization/wave1-reports/F5_cron_ops.md` line 73
- Reference cron implementation: `app/api/cron/evolve-teen-profiles/route.ts`
- Recommender v4: `gamification-system/database/migrations/085_recommend_weights_v2.sql`
- Recommender API: `app/api/teen/recommendations/route.ts`
- Spec: `docs/vision/personalization-engine.md` §4 (formula), §13 (caps)

---

*End V1 report — TICKET-038 status NOT_BUILT, hand-off spec attached.*
