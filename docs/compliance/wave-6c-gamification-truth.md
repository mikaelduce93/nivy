# Wave 6C — Gamification Truth (2026-05-09)

> Closed-beta hardening. No new economy. No XP-value change without
> canon evidence. No F5 (auto-topup) change. No fake XP / streak /
> leaderboard.

## Audit findings

The original gamification audit (`docs/compliance/07-gamification-compliance.md`)
was 38 → 78 after Wave 2B. Two open P1 items remained, plus one
under-the-radar parallel rail surfaced by a fresh grep:

### 6C.1 — `quests.status` direct-write fallback (CANON-GAME-010)
- `app/api/teen/quests/start/route.ts` had a fallback path that, when
  the canonical `quest_progress` upsert failed, wrote
  `quests.status='in_progress'` on the **global content row**.
  `quests` is shared across every teen — that write would have flipped
  the catalogue state for *everyone* because one teen failed an upsert.
- Fix: drop the fallback, surface the upsert error as a 500. The
  catalogue stays clean; the teen sees an honest error instead of a
  fake "started".

### 6C.2 — `quests.status` direct-write fallback (CANON-GAME-011)
- Same shape, different file. `app/api/teen/quests/complete/route.ts`
  fell back to `quests.status='completed'`. Worse than 6C.1 because
  the canonical `add_xp_to_user` grant below would still fire under a
  corrupted catalogue state.
- Fix: drop the fallback, surface the upsert error as a 500.

### 6C.3 — Parallel token economy on phantom RPCs
- `app/api/teen/tokens/route.ts` POST handler dispatched 5 actions
  (`claim_daily`, `earn`, `redeem`, `transfer`, `exchange`) through
  6 phantom RPCs that don't exist in the DB:
  `claim_daily_bonus`, `add_tokens_to_user` (×2),
  `spend_tokens` (×2), `transfer_tokens`, plus a direct write to the
  deprecated `notifications` table and a write/update against the
  deprecated `token_redemptions` / `token_rewards` tables.
- Every POST surfaced fake success — UI showed a redeem completing,
  a transfer landing, a daily bonus claimed — none of which touched
  `user_coins` or any canonical ledger.
- Fix: 410-deprecate the entire POST surface, mirroring the Wave 1B
  closure of `/api/teen/shop`. GET endpoints (read-only `wallet`,
  `balances`, `transactions`, `redemptions`) stay live since they read
  from the canonical `user_coins` table and `get_user_wallet` RPC —
  the legacy displays will return the honest balance from canonical
  rails (zero, until a real reward exists).
- 4 baseline canon violations cleared:
  CANON-SHOP-002 (3 → 1, the remaining one is a GET-side read of
  `token_rewards` we keep until the surface is removed),
  CANON-SHOP-003 (`transfer_tokens` literal: 1 → 0),
  CANON-NOTIF-001 (`from('notifications').insert`: 1 → 0).
- Total baseline: 206 → **202**.

## Out of scope (declared)

- **Token UI surfaces** (`components/tokens/token-rewards.tsx`,
  `components/tokens/token-wallet.tsx`) — they'll start receiving 410
  from the actions, which the existing client error handling surfaces
  as a toast. Removing the UI screens themselves is a navigation pass,
  not a truth fix; deferred until product decides whether to delete
  the parallel "tokens" surface entirely or migrate it to canonical
  coins.
- **`/teen/quests/page.tsx` content** — quest-list UI itself is not
  in CANON-GAME-010/011 scope (those are API mutation paths). No fake
  data found in the list page during the grep pass.
- **Monthly + seasonal mission assign crons** (canon §10) — separate
  cron-build wave; would be a new feature, not a truth fix.
- **Defis-physiques route-level merge into `/teen/quests?tab=body`**
  — needs F11 ratification per canon doc.
- **Savings cancellation match-return policy** (F53) — founder ruling
  pending.

## Tests

`tests/unit/wave6c-gamification-truth.test.ts` — **11 green static
guards**:

- **2** quest-start / quest-complete must NOT write `quests.status`
- **2** they must surface a 500 on `quest_progress` upsert failure
- **2** XP grant carries `add_xp_to_user` + `source_category` +
  `source_id` + `description`; XP RPC error returns 500 (no silent
  fake-success)
- **1** no phantom XP RPC names anywhere in the 3 touched files
- **3** `/api/teen/tokens` POST returns 410, no phantom token RPCs,
  no `notifications` insert, no `token_redemptions` insert / `token_rewards` update
- **1** `/api/teen/shop` deprecation (Wave 1B) not regressed

## Final gates

| Gate | Result |
|---|---|
| `check:env` | ✅ 11 / 0 |
| `lint:canon --enforce` | ✅ **4 improvements** (206 → **202** baseline); 0 net-new |
| `typecheck` | ✅ clean |
| `test:run` | ✅ **59 files / 514 tests** |
| `npm run smoke` | ✅ **39/39 ok**, 0 dev-log runtime errors |

## Compliance score

- `gamification`: **78 → 83 (+5)** — close to the upper end of the
  78→82/84 target band the founder set.
- overall: 87 → **88 (+1)** — *target hit*, parents reach the
  founder's "passer le global vers 88" bar.
- core_flow_score: 89 → **90 (+1)**.

## Status

- Closed-beta ready: **YES**.
- Public launch ready: **NO** — D.1 secret rotation still pending,
  by design.

## Per founder plan

> Après 6C, je ferais 6D Parent-control si le score global n'atteint
> pas encore 88.

**Global score is now 88** — founder's 6D condition is not triggered.
The next remediation lever (gamification was the lowest at 78) is now
closed. Remaining domains all sit at 80-89.

If the founder still wants to push to 89-90 overall, the cleanest
candidates are:
- `parent-control` 78 → 82 (founder's named 6D)
- `social-feed` 80 → 84 (P1 items in compliance doc)
- `economy-payments` 80 → 84 (CMI HASH already done in 1B; remaining
  is mostly cosmetic)
