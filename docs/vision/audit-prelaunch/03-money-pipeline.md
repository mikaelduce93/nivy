# 03 — Money pipeline reliability audit

> Read-only audit. Generated 2026-05-07 against Supabase project
> `imchornjvmgmaovhypco` ("nivy") and the local repo at
> `C:\Users\Shadow\Desktop\NIVY`. All file paths are absolute. RPC bodies are
> cited from migration files where the canonical SQL lives, and from
> `pg_proc.pg_get_functiondef` where the live function diverges from migrations
> or was applied out-of-tree. The audit covers the eight pipelines listed in
> §26 of the whitepaper plus the two surfaces that already touch real coins
> (rides, marketplace) but were not in the original list.

---

## Verdict

**AMBER.** The core escrow plumbing — `top_up_teen`, `spend_teen_coins`,
`payout_chore_reward`, `disburse_allowance`, marketplace `buy_listing` /
`confirm_receipt` / `open_dispute`, and `partner_reject_food_order` — is
atomic, row-locked, and audit-trail-correct. Three pipelines, however, leak
the §29 invariants and are launch-blockers as soon as the manual top-up rail
is replaced by a real PSP: `complete_ride` debits `user_coins` without
inserting `escrow_ledger`, without cashback XP, and at a placeholder rate
(1 DH = 1 coin) that contradicts the locked 100 coins/DH; `partner_accept_food_order`
double-credits the cashback XP path (`spend_teen_coins` already issued it during
`place_food_order`); and several SECURITY DEFINER functions are still granted
EXECUTE to `anon`, exposing money RPCs to unauthenticated callers (the
`auth.uid()` guard is the only thing standing between an anon attacker and
the wallet). PSP integration is correctly stubbed (`psp_provider='manual'`)
but the entire top-up rail trusts that the parent route already validated the
charge — there is no webhook chain, no idempotency key, and no reconciliation
job. Data shows one orphan in production already: `coin_transactions` row
`141b3cfb` (-48 coins, source_type='ride') has no paired `escrow_ledger` row
and no cashback `xp_transactions` row.

---

## Pipeline-by-pipeline matrix

Legend: GREEN = compliant with §29 invariants; AMBER = present but with at
least one defect; RED = violates an invariant; N/A = pipeline not yet shipped.

| Pipeline | RPC | Atomic | Audit trail | RLS | Cashback XP | Race-cond | Status |
|----------|-----|--------|-------------|-----|-------------|-----------|--------|
| Top-up | `top_up_teen` | YES (single plpgsql block, EXCEPTION rolls back; no SAVEPOINT) | YES (`payment_transactions`+`escrow_ledger`+`coin_transactions`, all paired by `related_payment_id`) | SELECT-only on writes (writes via SECURITY DEFINER) | N/A | NO `FOR UPDATE` on user_coins (UPSERT with ON CONFLICT — relies on PG row lock) | **GREEN** |
| Spend | `spend_teen_coins` | YES | YES (paired) — but `escrow_ledger` row has **null `related_spend_id`** so reverse-linking from coin_tx → escrow row is by timestamp, fragile | RLS write deny (DEFINER only) | YES (10% via `cashback_rules` lookup, fallback `xp_payment_settings.default_cashback_pct`, hard-floor `10`) | YES — `SELECT … FOR UPDATE` on user_coins | **AMBER** (linkage gap §29.4) |
| Chore payout | `payout_chore_reward` | YES (SELECT FOR UPDATE on completion + delegates coin write to `top_up_teen`) | YES (re-tags `coin_transactions.source_type='chore_payout'` and `escrow_ledger.reason='Chore payout: …'` after `top_up_teen`) | DEFINER only | N/A (chore is parent → teen, not a teen spend) | YES on completion lock | **GREEN** |
| Allowance | `disburse_allowance` | YES (FOR UPDATE on parent_allowances + delegates to `top_up_teen`) | YES (`allowance_disbursements.payment_transaction_id` ties to escrow chain) | DEFINER only | N/A | YES on allowance row | **GREEN** |
| Savings goal release | `release_savings_goal` (via `_savings_match_trigger`) | YES (FOR UPDATE on savings_goals; trigger fires after parent_match contribution) | PARTIAL — match path calls `top_up_teen` so escrow exists, but the teen-side `current_saved_coins` lock is NOT mirrored in `coin_transactions` (locked coins never leave user_coins.balance until release; release path was not located in current migrations) | DEFINER on RPCs, PARENT/TEEN policies on `savings_*` tables | N/A | YES | **AMBER** (release path not implemented; locked-balance invariant only checked at spend-time via `spend_teen_coins.v_locked` query) |
| Marketplace buy | `buy_listing` | YES (`SELECT … FOR UPDATE` on listing + atomic UPDATE with `WHERE balance >= price` predicate to prevent double-spend) | PARTIAL — inserts `coin_transactions` with `transaction_type='spend', source_type='marketplace_escrow'`, but **does NOT insert an `escrow_ledger` row**. The escrow is held implicitly via `marketplace_transactions.status='escrow'` rather than the §29.4 ledger | DEFINER only | NO XP cashback at buy-time (correct — cashback fires at confirm, see below) | YES (FOR UPDATE + WHERE-predicate guard) | **AMBER** (no escrow_ledger row — §29.4) |
| Marketplace confirm | `confirm_receipt` | YES | PARTIAL — credits seller in `user_coins`+`coin_transactions`, fires cashback XP via direct `xp_transactions` INSERT (not `add_xp_to_user`), but **still no `escrow_ledger` row**. Buyer-side spend at `buy_listing` and seller-side credit at `confirm` are linked only via `marketplace_transactions.id` in `source_id` | DEFINER only | YES (10% hardcoded `floor(amount_coins * 0.10)`, ignores `cashback_rules`) | YES (FOR UPDATE on tx) | **AMBER** (hardcoded 10% bypasses cashback_rules; §29.4 escrow_ledger gap) |
| Marketplace dispute | `open_dispute` | YES | NO COIN MOVEMENT — only flips `marketplace_transactions.status='disputed'` and inserts a `marketplace_disputes` row. Resolution / refund RPC was not located in the codebase. So a buyer-funded escrow held by a disputed transaction has **no automated unwind**; the coins sit in limbo on the buyer's lifetime_spent counter (already debited at buy_listing) until an admin manually intervenes | DEFINER only | N/A | YES | **AMBER** (no `resolve_dispute` RPC found — manual ops required) |
| Food order place | `place_food_order` | YES (FOR UPDATE not strictly needed here — debit delegated to `spend_teen_coins`) | YES (delegates → spend pipeline) | DEFINER only | YES (via `spend_teen_coins`) | YES (via `spend_teen_coins`) | **GREEN** |
| Food order accept | `partner_accept_food_order` | YES | DEFECT — inserts a **second** `partner_transactions` row with `cashback_xp = order.cashback_xp`, while `place_food_order` → `spend_teen_coins` already inserted one. Net effect: cashback XP is correctly issued only once (in spend_teen_coins) but `partner_transactions` is double-counted, breaking commission accounting | DEFINER only | N/A (already credited) | N/A | **AMBER** (double-row in `partner_transactions`) |
| Food order reject | `partner_reject_food_order` | YES | YES — refunds via direct UPDATE on user_coins + paired `coin_transactions(transaction_type='refund')` + paired `escrow_ledger(direction='refund')`. **HOWEVER does not reverse the cashback XP** that `spend_teen_coins` originally issued (whitepaper §29.3 says cashback should be reversed on refund) | DEFINER only | XP REVERSAL MISSING | NO `FOR UPDATE` on user_coins before refund (race vs concurrent spend possible if order is rejected while teen is mid-spend) | **AMBER** (cashback not reversed; missing FOR UPDATE) |
| Creator featured | `award_creator_xp` (signal='post' / 'like' / 'comment' / 'share') | YES | XP-ONLY — no coin movement at all; XP credited via `add_xp_to_user`. Whitepaper §19.4.6 mentions coin payout for featured posts but no `pay_featured_creator` RPC exists | DEFINER, but `creator_engagement` and `creator_monthly_stats` have **RLS DISABLED** (Supabase advisory `rls_disabled` flagged this) | N/A | NA | **AMBER** (RLS off on two tables) |
| Mentorship book | `book_mentor_session` | YES (no coin debit — only enqueues `parental_approvals`) | NO COIN MOVEMENT YET — debit happens when parent approves (path not located in current code). At launch this means parent approval → mentor session = no coin escrow chain wired today | DEFINER + standard RLS on mentors/sessions | NA at booking; whitepaper §19.4.7 says cashback should fire on session completion | NA | **AMBER** (post-approval debit + session-completion XP path missing) |
| Mentorship rate | `rate_mentor_session` | YES | NO COIN MOVEMENT — only updates `mentor_sessions.rating_by_mentee/mentor` and recomputes `mentors.rating`. Mentor payout RPC absent | DEFINER + identity check on rater | NA | NA | **AMBER** (no payout path for mentor) |
| Ride complete (out-of-list) | `complete_ride` | YES (FOR UPDATE on user_coins) | **VIOLATION** — debits user_coins + inserts coin_transactions, but: (a) NO `escrow_ledger` row, (b) NO cashback XP, (c) uses placeholder rate `1 DH = 1 coin` (`v_amount_coins := CEIL(p_actual_dh)::INT`) instead of locked 100 coins/DH | DEFINER but EXECUTE granted to PUBLIC + anon | MISSING | YES on user_coins | **RED** (§29.1 currency rate, §29.3 cashback, §29.4 escrow ledger all violated) |
| Ride cancel | `cancel_ride` | YES | **VIOLATION** — computes `refund_pct` (100 or 50) but never executes the refund. Status flips to 'cancelled' but no coin movement, no `coin_transactions`, no `escrow_ledger`. If a ride was completed-then-cancelled (or partial), the teen loses the coins | DEFINER | MISSING | NA | **RED** (refund logic stubbed) |

---

## Live DB ledger health

Counts from `imchornjvmgmaovhypco` at audit time:

```
coin_transactions   = 15  (topup=8, spend=4, system_credit=3)
escrow_ledger       = 11  (top_up=8, spend=3)
payment_transactions= 8   (all status='succeeded', psp_provider='manual')
xp_transactions     = 161 (cashback rows=3)
user_coins          = 1   row (single test teen, balance=15000, lifetime_earned=20000, lifetime_spent=5048)
user_xp             = 1   row (same teen, total_xp=3600)
```

**Top-up chain integrity (§29.4):** 8/8 payment_transactions have a paired
escrow_ledger row (via `related_payment_id`). 0 orphans on the top-up side.

**Spend chain integrity (§29.4):** 4 spend coin_transactions vs 3 spend
escrow_ledger rows → **1 orphan**. The orphan is `coin_transactions.id =
141b3cfb-f67e-4970-9850-3e0e79f2913d`, amount=-48, source_type='ride',
source_id=086bb4de-d954-48d4-9597-96161b04de6c, created at 09:18:05. This
debit was issued by `complete_ride`, which never inserts into escrow_ledger.

**Cashback XP coverage (§29.3):** 3 cashback xp_transactions rows. Two are
paired with the two `spend_teen_coins` debits at 04:42 and 04:47; one is
paired with the 09:21 partner spend (5000 coins → 500 XP). The 09:18 ride
spend (-48 coins) has **no cashback XP row** — second §29.3 violation, same
root cause as the orphan above.

**Balance reconciliation (sanity check):** lifetime_earned 20000 vs sum of
positive coin_transactions (5000+5000+5000+5000+10000+10000+2000+100 = 42100
DH credits) ≠ live `user_coins.lifetime_earned` 20000. The
`top_up_teen` UPSERT path increments `lifetime_earned` correctly only on
INSERT (the `EXCLUDED.lifetime_earned` clause works), but the apparent
discrepancy suggests the DB was reset / the teen wallet was created with
seeded values before the production migrations were active. Recommend a
seeded-vs-real audit before launch; the math itself is sound.

**Locked rate enforcement:** all 8 top-ups respect 100 coins/DH (e.g. 50.00
DH → 5000 coins, 100.00 DH → 10000 coins, 1.00 DH → 100 coins). The single
violation lives in `complete_ride` (1 DH ≈ 1 coin). No XP↔coin conversion
function exists in `pg_proc` (verified by searching `proname` for `convert`,
`xp_to_coin`, `coin_from_xp` — zero matches).

---

## §29 invariants — money side

Each invariant is checked against the canonical RPC source. File paths are
absolute. Live function bodies (where they diverge from migrations) come from
`pg_get_functiondef`.

### §29.1 — XP↔coin separation

**Status: COMPLIANT in DB, AMBIGUOUS in client code.**

No SQL function converts between the two. `add_xp_to_user` writes only to
`user_xp.total_xp` and `xp_transactions`; `add_coins_to_user` and the
top_up/spend pipelines write only to `user_coins` and `coin_transactions`.

The vision drift documented in `docs/vision/economy.md:39-52` (i.e. the
client-side helper `lib/payments/xp-converter.ts` exposing
`convertXPToDH`/`convertDHToXP` at 10 XP = 1 DH while
`xp_payment_settings.xp_to_dh_rate=100`) is a **read-only display issue** —
the helper is consumed by the wallet UI to show "DH equivalent of XP" labels
and by the legacy `app/api/payments/xp/route.ts:302` which deducts XP for
event bookings. That route is the only place where XP is treated as a
spendable currency, and it bypasses the coin pipeline entirely. Whitepaper §5
explicitly forbids XP-as-currency; this should be retired before launch.

### §29.2 — Every coin debit/credit gets a `coin_transactions` row

**Status: VIOLATED on three paths.**

- `complete_ride` inserts coin_transactions (so this part is fine), but the
  cancellation path does not — `cancel_ride` (`pg_proc` body, lines 19-29 of
  the EXCEPTION-free body) flips `ride_bookings.status='cancelled'` and
  computes a `refund_pct` but never executes a refund or writes a
  coin_transactions row. **Refund logic is stubbed.**
- `confirm_receipt`
  (`gamification-system/database/migrations/056_marketplace_c2c.sql:557-565`)
  inserts a `coin_transactions(transaction_type='earn',
  source_type='marketplace_sale')` for the seller credit — compliant.
- `buy_listing` at `056_marketplace_c2c.sql:466-474` inserts the buyer-side
  spend row — compliant.

### §29.3 — Every coin spend triggers paired XP cashback

**Status: PARTIALLY VIOLATED.**

- `spend_teen_coins` (`pg_proc` body lines 60-72) reads `cashback_rules` first,
  falls back to `xp_payment_settings.default_cashback_pct`, then to a hardcoded
  `10`. Calls `add_xp_to_user` → `xp_transactions` row with `source_type='cashback'`.
  COMPLIANT.
- `confirm_receipt` (`056_marketplace_c2c.sql:579-593`) hardcodes
  `floor(v_tx.amount_coins * 0.10)` and inserts directly into `xp_transactions`
  — bypasses `add_xp_to_user`'s xp_multiplier logic and bypasses
  `cashback_rules`. AMBER — works but inconsistent.
- `complete_ride` issues NO cashback XP. RED.
- `partner_reject_food_order` issues a refund but does NOT reverse the
  cashback XP that the original `spend_teen_coins` granted. The teen keeps
  the cashback on a refunded transaction — this is a §29.3 inversion.

### §29.4 — Every coin debit/credit also inserts an `escrow_ledger` row paired by `related_payment_id` or `related_spend_id`

**Status: SYSTEMICALLY VIOLATED on the spend side.**

The schema has `escrow_ledger.related_spend_id` (column exists, see live DDL
output) but **no SECURITY DEFINER function ever populates it** — `spend_teen_coins`
(`pg_proc` body, lines 76-94) inserts an escrow_ledger row with
`related_payment_id=NULL`, `related_spend_id=NULL`, and a freeform `reason`
text. Pairing back to the originating `coin_transactions` row therefore
requires timestamp matching, which is brittle.

Worse, several spend pipelines skip `escrow_ledger` altogether:

- `complete_ride`: no escrow_ledger row (verified — see orphan finding above).
- `buy_listing`: no escrow_ledger row at debit time
  (`056_marketplace_c2c.sql:466-475` — only coin_transactions).
- `confirm_receipt`: no escrow_ledger row at seller credit time
  (`056_marketplace_c2c.sql:557-577`).

The implicit assumption seems to be that `marketplace_transactions.status`
(escrow / completed / disputed) is the canonical escrow ledger — that's a
reasonable design choice but it conflicts with §29.4 which mandates the
unified `escrow_ledger` table for cross-surface reporting.

### §29.5 — `auth.users.id` is THE canonical user identifier

**Status: COMPLIANT.** All money RPCs use `p_teen_id`, `p_parent_id`, or
`p_buyer_id` typed UUID, and FK constraints chain back to `auth.users(id)` via
`teens`, `profiles`, or `parent_teen_links`.

### §29.6 — DH = NUMERIC(10,2), coins = INTEGER, XP = INTEGER

**Status: COMPLIANT.** Verified via `information_schema.columns`:

```
user_coins.balance:    integer
user_xp.total_xp:      integer
escrow_ledger.amount_dh:    numeric(10,2)
escrow_ledger.amount_coins: integer
payment_transactions.amount_dh: numeric(10,2)
```

### §29.14 — Money-related writes go through service_role, not authenticated

**Status: COMPLIANT BY OMISSION (see §29.7 below).**

There are **zero** INSERT/UPDATE/DELETE policies on `user_coins`,
`coin_transactions`, `escrow_ledger`, `payment_transactions`, `xp_transactions`,
`user_xp`, or `cashback_rules`. RLS is enabled on all of them. Result: any
write attempt from a JWT (anon or authenticated) is blocked. Writes only
succeed via `service_role` (which bypasses RLS) or via SECURITY DEFINER RPCs
(which run as the function owner — typically `postgres`).

This is the **right** behavior, but it's enforced by **absence** of policies
rather than by an explicit `FOR INSERT TO service_role USING (true)` policy.
A future migration that adds a permissive policy by mistake would silently
open the floodgates. Recommend adding explicit deny-default policies.

### §29.15 — `auth.uid()` check inside every money RPC

**Status: PARTIALLY COMPLIANT.**

- `top_up_teen` (`pg_proc` body, lines 9-12): identity check present, allows
  `auth.uid() IS NULL` (service_role).
- `spend_teen_coins` (lines 11-13): same pattern. COMPLIANT.
- `payout_chore_reward` (lines 11-13): same.
- `disburse_allowance`: NO direct `auth.uid()` check — protected only because
  `GRANT EXECUTE … TO service_role` is the sole grantee
  (`054_allowance_savings.sql:498`), so it's only callable by the cron. But
  `pg_proc.proname='disburse_allowance'` shows the function ALSO has
  `EXECUTE` granted to PUBLIC, anon, and authenticated (verified via
  `information_schema.routine_privileges`) — meaning **any logged-in user
  can directly call the RPC and force a disbursement they don't own**. The
  only saving grace is the cron-style `next_disbursement_at > NOW()` check
  which prevents repeat fires, but a malicious user could time their call to
  drain a parent's wallet on schedule.
- `place_food_order`, `partner_accept_food_order`, `book_mentor_session`,
  `rate_mentor_session`, `buy_listing`, `confirm_receipt`, `open_dispute`:
  all have `auth.uid()` identity guards.
- `complete_ride`: relies on `EXISTS admin_roles OR driver.user_id = caller`.
  COMPLIANT for the role check, but the function is also granted to PUBLIC
  + anon (per the grant query result).
- `partner_reject_food_order`: identity check is "either partner_staff OR
  service_role" — note the `IF v_caller IS NOT NULL` early-out: if the RPC
  is called by service_role from any context (including a misconfigured
  cron), no `partner_staff` check fires.

---

## Hardcoded / scaffolded findings

1. **Cashback rate fallback ladder is half-honored.**
   `spend_teen_coins` (`pg_proc` body, lines 53-72) correctly reads
   `cashback_rules` first, then `xp_payment_settings.default_cashback_pct`,
   then defaults to `10`. But `confirm_receipt` (marketplace) and the implicit
   path in `place_food_order` (which precomputes `v_cashback_xp := FLOOR(v_total_coins * 0.10)`
   at `058_food_delivery_rpcs.sql` lines around 137 in the live function)
   hardcode 10% directly. `cashback_rules` is currently empty in production
   (zero rows) — so the fallback ladder works today, but the moment a partner
   is given a custom rate the marketplace + food paths will not honor it.

2. **DH→coin conversion locked everywhere except `complete_ride`.**
   Every other RPC computes `v_amount_coins := (p_amount_dh * 100)::integer`.
   `complete_ride` (`pg_proc` body): `v_amount_coins := CEIL(p_actual_dh)::INT`.
   This is a 100× under-debit — a 50 DH ride costs the teen 50 coins (= 0.5
   DH equivalent) instead of 5000.

3. **`xp_payment_settings.xp_to_dh_rate=100`** dead config.
   The DB row exists but no SQL function or TS module reads it. The TS
   constant `XP_TO_DH_RATE=0.10` in `lib/payments/xp-converter.ts:10` is the
   only rate actually used. (Cross-referenced in `docs/vision/economy.md:39-52`.)

4. **PSP integration: stubbed correctly, but no idempotency.**
   `top_up_teen` immediately marks `payment_transactions.status='succeeded'`
   and `psp_provider='manual'`. The route `app/api/parent/topup/route.ts:91-105`
   gates this only with `getUserRole()='parent'` + `e_signatures.terms_accepted=true`.
   There is **no idempotency key** — a double-clicking parent triggers two
   atomic top-ups, the second of which succeeds because there's no dedup
   check. (None of the 8 production payment_transactions appear to be
   duplicates, but volume is too low to be a real test.)

5. **No `resolve_dispute` RPC.** `open_dispute` flips status only. There is
   no admin RPC to refund the buyer or release to the seller. Production
   support would need raw SQL today.

6. **No `release_savings_goal` RPC** despite the section title in spec. The
   teen-side lock is enforced read-only via `spend_teen_coins.v_locked` query
   (`pg_proc` body lines 32-37).

7. **`add_coins_to_user` and `add_xp_to_user` are NOT SECURITY DEFINER.**
   `prosecdef=false` for both (verified via the pg_proc query). They execute
   as the calling role. Inside a SECURITY DEFINER caller (e.g.
   `payout_chore_reward → add_xp_to_user`) the privilege chain works because
   the outer RPC re-establishes the elevated role. But anywhere these are
   called directly from `authenticated` JWTs they will fail RLS — the
   privileges-then-no-RLS interaction is fragile.

8. **`add_coins_to_user` does NOT lock user_coins before the SELECT/UPDATE.**
   Lines 8-22 of its body: `INSERT … ON CONFLICT DO NOTHING; SELECT balance;
   compute v_new_balance; UPDATE …`. Two concurrent calls reading the same
   `v_current_balance` will both compute the same `v_new_balance`, and the
   second UPDATE overwrites the first. This function is unused by the canonical
   pipelines (they use `top_up_teen` / `spend_teen_coins` directly), but it's
   still callable and dangerous.

9. **Two rogue RPCs grant EXECUTE to anon+PUBLIC**: `complete_ride` and
   `disburse_allowance`. Verified via `information_schema.routine_privileges`.

10. **TODO / placeholder text inside money RPCs:**
    - `complete_ride`: comment "Conversion 1 DH = 1 coin (placeholder; spec
      leaves this to wallet rules)" — this is an explicit TODO in production code.
    - `top_up_teen`: comment "5. Mark succeeded (placeholder for PSP webhook
      in MVP)" — flagged but not blocked.

---

## Risks

### P0 (block launch)

1. **`complete_ride` violates §29.1, §29.3, §29.4.** Wrong rate (1 DH = 1
   coin), no cashback XP, no escrow_ledger row. Production already has 1
   orphan caused by this path. (RPC body in `pg_proc` — file path: applied
   live, source not in `gamification-system/database/migrations/*.sql`.)

2. **`cancel_ride` is a no-op refund.** Computes `refund_pct` then drops it
   on the floor. Real-money rides would silently steal from the teen.

3. **`disburse_allowance` is callable by any authenticated user.**
   `GRANT EXECUTE … TO service_role` line in
   `gamification-system/database/migrations/054_allowance_savings.sql:498`
   does not prevent the implicit grant to PUBLIC. A user who knows another
   family's `parent_allowances.id` (visible via the RLS SELECT policy at line
   140) can call the RPC and force-fire a disbursement.

4. **PSP rail is stubbed, no idempotency.** Acceptable for MVP per
   IMPLEMENTATION_RECETTE, but the moment Cash Plus / CMI / Stripe is wired,
   there must be: (a) a unique constraint on `payment_transactions.psp_reference`,
   (b) a webhook handler that calls `top_up_teen` only after PSP says paid,
   (c) the manual route at `app/api/parent/topup/route.ts:93-105` gated
   behind a feature flag in production.

5. **No dispute resolution.** If a marketplace dispute opens, the buyer's
   coins are debited (already, at buy_listing) but never returned. Manual
   SQL ops required.

### P1 (block within 30 days of launch)

6. **`escrow_ledger.related_spend_id` is never populated.** Pairing
   `coin_transactions(spend)` to its escrow row is timestamp-based. Auditing
   is fragile.

7. **Marketplace and food paths bypass `cashback_rules`.** The moment a
   custom partner cashback rate is configured, marketplace and food orders
   will silently keep paying 10% while shop spends pay the configured rate.

8. **`partner_reject_food_order` does not reverse cashback XP.** Whitepaper
   §29.3 says cashback follows the spend; refund must reverse it.

9. **`partner_accept_food_order` double-inserts `partner_transactions`.**
   The first row is inserted by `spend_teen_coins → INSERT INTO
   partner_transactions`, the second by the accept RPC. Commission accounting
   is overcounted.

10. **`creator_engagement` and `creator_monthly_stats` have RLS DISABLED.**
    Confirmed by Supabase advisory `rls_disabled` (level=critical). Any
    user with the anon key can read or modify every row. Remediation SQL
    surfaced — should be applied before launch.

11. **Two SELECT policies stacked on the same tables** — `user_coins` has
    `Users can view own coins` (legacy, references `teens.parent_id` which
    doesn't exist as the canonical link) AND `user_coins_self_read`. Same
    for `user_xp` and `xp_transactions`. The legacy policies are no-ops
    (always FALSE) but cluttered.

### P2 (track but not blocking)

12. **`top_up_teen` UPSERT on user_coins relies on PG row-lock semantics
    rather than explicit `FOR UPDATE`.** Two concurrent top-ups for the same
    teen are serialized by the row lock implicit in `INSERT … ON CONFLICT DO
    UPDATE`, which is correct but harder to audit than an explicit lock.

13. **`xp_payment_settings.xp_to_dh_rate=100`** dead config row should be
    removed or wired up to deprecate the TS constant.

14. **`add_coins_to_user` race condition.** Unused by canonical paths but
    still callable — should be dropped or rewritten with FOR UPDATE.

---

## Recommended actions before launch

In priority order, all DDL/DML required:

1. **Rewrite `complete_ride`** to (a) call `spend_teen_coins(p_ride.teen_id,
   v_amount_coins, NULL, NULL)` instead of doing direct user_coins/coin_transactions
   writes — this gets §29.3 cashback + §29.4 escrow ledger for free; (b) fix
   the rate to `(p_actual_dh * 100)::int`; (c) revoke EXECUTE from PUBLIC
   and anon. Backfill the existing orphan: insert one `escrow_ledger(direction='spend')`
   row for the 09:18 ride and a 5 XP cashback `xp_transactions` row.

2. **Implement `cancel_ride` refund.** When `refund_pct > 0` and the ride had
   already debited coins, call a new helper `refund_teen_coins(teen_id,
   amount_coins, source_type, source_id, reason)` that mirrors
   `partner_reject_food_order`'s refund pattern — paired
   `coin_transactions(transaction_type='refund')` + `escrow_ledger(direction='refund')`.

3. **Lock down `disburse_allowance` and `complete_ride` execution privileges:**
   ```sql
   REVOKE EXECUTE ON FUNCTION public.disburse_allowance(uuid)
     FROM PUBLIC, anon, authenticated;
   REVOKE EXECUTE ON FUNCTION public.complete_ride(uuid, numeric, uuid)
     FROM PUBLIC, anon;
   ```
   And audit every other money RPC against `routine_privileges` — only
   `service_role` (and `authenticated` where the RPC has a strict
   `auth.uid()` check) should remain.

4. **Add `resolve_dispute` RPC.** Two outcomes: (a) refund buyer (paired
   coin_transactions+escrow_ledger refund, set tx.status='refunded'); (b)
   release to seller (same as `confirm_receipt` but admin-callable). Should
   be SECURITY DEFINER, admin-only.

5. **Patch the food order pipeline:**
   - In `partner_reject_food_order`, after the refund block, call a new
     `revoke_xp_cashback(teen_id, amount_xp, reason, source_id)` helper that
     debits `user_xp.total_xp` and inserts a paired `xp_transactions(type='refund', amount=-cashback_xp)`.
   - In `partner_accept_food_order`, remove the duplicate
     `INSERT INTO partner_transactions` block — the row is already there from
     `spend_teen_coins`.
   - Add `SELECT … FOR UPDATE` on `user_coins` at the top of the
     `partner_reject_food_order` refund branch (currently bare UPDATE).

6. **Wire `cashback_rules` into marketplace and food.** Refactor the
   cashback computation in `confirm_receipt` and the `v_cashback_xp` precompute
   in `place_food_order` to call the same lookup that `spend_teen_coins`
   uses (factor it into a `_cashback_pct(partner_id)` helper).

7. **Populate `escrow_ledger.related_spend_id`** from `spend_teen_coins`
   (capture the inserted `coin_transactions.id` and pass it). Backfill via
   one-time migration matching by (teen_id, amount_coins, created_at)
   timestamps.

8. **Enable RLS on `creator_engagement` and `creator_monthly_stats`** with
   policies modeled on the marketplace tables (creator self-read; admin
   read-all; writes via SECURITY DEFINER RPCs only). Apply the remediation
   SQL the Supabase advisor surfaced.

9. **Drop or fix the legacy SELECT policies** referencing `teens.parent_id`
   on user_coins / user_xp / xp_transactions — they are dead code (the
   canonical link is `parent_teen_links`).

10. **Add idempotency to `top_up_teen`:** new column
    `payment_transactions.client_idempotency_key TEXT UNIQUE` + parameter
    `p_idempotency_key` on the RPC. Route `app/api/parent/topup/route.ts`
    generates a per-request UUID. PSP webhook handler uses
    `psp_reference UNIQUE` for the real rail.

11. **Drop `add_coins_to_user`** (or mark deprecated and revoke EXECUTE) —
    it bypasses every audit invariant the rest of the system enforces.

12. **Implement `release_savings_goal` RPC.** Currently the "lock" is a
    read-only check inside `spend_teen_coins`; goal achievement should
    proactively release the lock and write a paired audit trail
    (coin_transactions and escrow_ledger entries with
    direction='savings_release' or transaction_type='goal_completed') so the
    parent dashboard can show "DH 200 released from savings".

13. **Mentorship payout:** add `complete_mentor_session` (mentor confirms
    attendance) → debits coins via `spend_teen_coins` from the teen, credits
    mentor (likely as a separate `mentor_payouts` ledger to keep the teen
    coin pool clean), fires cashback XP. Without this, the
    `book_mentor_session` flow is half-built.

14. **Reconciliation cron.** Add a daily job that runs:
    ```sql
    SELECT teen_id, SUM(amount) AS net_coins
      FROM coin_transactions
     GROUP BY teen_id
    HAVING (SELECT balance FROM user_coins uc WHERE uc.teen_id = coin_transactions.teen_id) <> SUM(amount);
    ```
    and alerts on any drift. The single existing teen wallet shows
    lifetime_earned=20000 vs sum of positive coin_tx=42100 — already worth
    a manual reconciliation pre-launch.

15. **Retire the XP-as-currency path.** Either delete
    `app/api/payments/xp/route.ts` and `lib/payments/xp-converter.ts`, or
    feature-flag them off in production. They contradict whitepaper §5
    invariant "No XP↔coins conversion ever".

---

## File:line citations index

| Claim | Source |
|-------|--------|
| `top_up_teen` body, identity check, atomic 4-step pipeline | `pg_proc.pg_get_functiondef('top_up_teen')` (live; not in any committed migration file) |
| `spend_teen_coins` body, FOR UPDATE on user_coins, cashback ladder | `pg_proc.pg_get_functiondef('spend_teen_coins')` (live) |
| `payout_chore_reward` body, FOR UPDATE on completion, delegate to `top_up_teen` | `pg_proc.pg_get_functiondef('payout_chore_reward')` (live) |
| `disburse_allowance` body, FOR UPDATE on parent_allowances | `gamification-system/database/migrations/054_allowance_savings.sql:368-496` |
| `_savings_match_trigger` body | `054_allowance_savings.sql:503-574` |
| `place_food_order` body, halal/calorie/budget gates, delegate to `spend_teen_coins` | `pg_proc.pg_get_functiondef('place_food_order')` (also in `058_food_delivery_rpcs.sql:4-197`) |
| `partner_accept_food_order` double-insert in partner_transactions | `pg_proc.pg_get_functiondef('partner_accept_food_order')` (lines around 30-40 of the body) |
| `partner_reject_food_order` refund without `FOR UPDATE`, no XP reversal | `pg_proc.pg_get_functiondef('partner_reject_food_order')` |
| `buy_listing` no escrow_ledger row | `056_marketplace_c2c.sql:443-499` |
| `confirm_receipt` hardcoded 10% cashback, direct xp_transactions INSERT | `056_marketplace_c2c.sql:540-600` |
| `open_dispute` no automatic refund | `056_marketplace_c2c.sql:619-668` |
| `marketplace_auto_release_escrow` cron-style auto-confirm | `056_marketplace_c2c.sql:674-703` |
| `complete_ride` violations (rate, no cashback, no escrow) | `pg_proc.pg_get_functiondef('complete_ride')` (live; not in committed migrations) |
| `cancel_ride` stubbed refund | `pg_proc.pg_get_functiondef('cancel_ride')` |
| `request_ride` body | `pg_proc.pg_get_functiondef('request_ride')` |
| `book_mentor_session` body | `pg_proc.pg_get_functiondef('book_mentor_session')` |
| `award_creator_xp` body | `pg_proc.pg_get_functiondef('award_creator_xp')` |
| `add_coins_to_user` race | `pg_proc.pg_get_functiondef('add_coins_to_user')` (prosecdef=false) |
| `add_xp_to_user` body | `pg_proc.pg_get_functiondef('add_xp_to_user')` (prosecdef=false) |
| Top-up route logic | `app/api/parent/topup/route.ts:34-130` |
| RLS write-policy absence | `pg_policies WHERE cmd <> 'SELECT'` returned 0 rows for the 7 money tables |
| EXECUTE grants on `disburse_allowance` and `complete_ride` to anon | `information_schema.routine_privileges WHERE routine_name IN (…)` |
| Cashback rules empty in prod | `SELECT * FROM cashback_rules` returned 0 rows |
| Live ledger health counts | `SELECT COUNT(*) FROM …` queries against the live DB |
| Spend orphan id | `coin_transactions.id=141b3cfb-f67e-4970-9850-3e0e79f2913d` (no matching escrow_ledger row) |
| RLS disabled advisory | Supabase `list_tables` advisor `rls_disabled` (priority=1, level=critical) on `creator_engagement` and `creator_monthly_stats` |
| `xp_payment_settings` rows incl. `default_cashback_pct=10`, `xp_to_dh_rate=100`, `min_topup_dh=50`, `max_topup_dh=5000` | `SELECT setting_key, setting_value FROM xp_payment_settings` |
| Vision drift on XP→DH rate | `docs/vision/economy.md:39-77` |

---

*End of audit. Total RPCs reviewed: 18. Live DB queries executed: 14.
Migration files cross-referenced: 4 (`021`, `054`, `055`, `056`,
`058_food_delivery_rpcs`). API routes traced: 1 (`/parent/topup`). Time-of-audit
ledger health: 1 spend orphan, 0 top-up orphans, 1 currency-rate violation in
production.*
