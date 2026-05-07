# Allowance & Savings Goals — Vision vs Reality Audit

> Read-only audit. Sources: Grep across the repo for `allowance|recurring|recurrence|argent.{0,5}poche|savings|saving_goal|target_coins`, plus live DB introspection against Supabase project `imchornjvmgmaovhypco` (`SELECT tablename FROM pg_tables WHERE schemaname='public' AND tablename ILIKE …`). Cross-referenced with `docs/vision/economy.md`, `docs/vision/avatar-coach.md`, and `docs/vision/parent-control.md`.

---

## 1. Founder vision (intended)

Two complementary financial-education features riding on the **same coin pipeline** that already powers `top_up_teen` + `user_coins` + `coin_transactions`.

### 1.a Allowance — *argent de poche récurrent*

The parent sets up an automatic recurring top-up, e.g. **"20 DH every Friday"** or **"150 DH on the 1st of each month"**.

- Cadence is the primary axis: weekly (default Friday — Moroccan paycheck day), bi-weekly, monthly, custom dates.
- Optional **conditional** mode (e.g. "if streak ≥ 5 this week") layered on top of unconditional baseline.
- Parent can **pause / adjust / cancel** without breaking the teen's balance — a paused allowance simply skips disbursement until the resume date.
- Each disbursement is logged like a regular top-up but tagged with `recurrence_id` provenance for traceability.

### 1.b Savings goals — *épargne par objectif*

The teen saves coins toward a specific named reward, e.g. **"Save 5000 coins for a tablet by my birthday"**.

- Visualizes progress (progress bar, % to goal, ETA based on contribution velocity).
- The parent can configure a **match** ("I'll add 100 coins for every 200 you save", up to a cap) — match contributions are funded from the parent's escrow via `top_up_teen`.
- Reaching the goal unlocks a **special celebration** (avatar coach line, push to parents, animation).
- Pedagogical angle: financial literacy, delayed gratification, planning. Pairs with the rewards-shop checkout flow once the goal is achieved.

Both features are deliberately **orchestration on top of existing coin primitives** — no new currency, no parallel ledger.

---

## 2. What actually exists in code

**Status: ~0% implemented.**

The repo Grep across `allowance`, `recurring`, `recurrence`, `argent.{0,5}poche`, `savings`, `target_coins`, `saving_goal` returns:

- Hits in `types/supabase.ts`, `gamification-system/database/all_migrations.sql`, and `docs/vision/economy.md` are all **string matches against unrelated symbols** — `subscription_plans`, `family_subscriptions`, `user_subscriptions`, the VIP "Pass" feature (`features/pass/`, `app/carte-vip/`), and `event_challenges` (the word "saving" only appears as English filler).
- No table named `parent_allowances`, `allowance_disbursements`, `savings_goals`, `savings_contributions`, `recurring_topups`, or any close variant.
- No cron handler under `app/api/cron/` for disbursement.
- No RPC named `lock_to_goal`, `release_from_goal`, `disburse_allowance`, or `apply_parent_match`.
- No teen UI under `/teen/savings`, `/teen/wallet/allowance`. No parent UI under `/parent/allowances` or `/parent/savings`.

DB live (`pg_tables`) confirms: only `subscription_plans`, `push_subscriptions`, `family_subscriptions`, `user_subscriptions`, `subscription_payments` exist with relevant prefixes — these are all **parent tier billing** (the Nivy Pass / VIP card), an entirely different concept. There is **no allowance or savings infrastructure** in the database.

---

## 3. Gap analysis

| Capability | Vision | Reality |
|---|---|---|
| Recurring parent → teen top-up | Yes | Manual one-off top-up only (`/api/parent/topup`) |
| Cadence engine (weekly/biweekly/monthly) | Yes | None |
| Conditional allowance (streak / quest gates) | Yes | None |
| Pause / resume allowance | Yes | None |
| Disbursement audit trail | Yes | None (top-ups exist but lack `recurrence_id` provenance) |
| Teen savings goals (named target) | Yes | None |
| Locked coins (savings reservation) | Yes | All coins are spendable in `user_coins.balance` |
| Parent match on teen contributions | Yes | None |
| Goal-achieved celebration | Yes | None |
| Avatar-coach hooks for allowance/goals | Yes | Coach exists (`docs/vision/avatar-coach.md`) but no triggers wired |

This is a **greenfield feature pair** — every layer (DB, RPC, cron, UI, coach integration) needs to be built.

---

## 4. Risks & open questions

- **Conditional allowance scope creep** — what counts as a condition? Streak only? Quest completion rate? Chore checklists? Hybrid AND/OR rules?
- **Goal cancellation policy** — when a teen cancels an active goal, do locked coins (a) return to spendable balance, or (b) flow back to parent escrow? Different choices have different pedagogical signals.
- **Match cap semantics** — is the cap a percentage of `target_coins` or an absolute coin amount? Cap-per-goal or cap-per-month-per-teen?
- **Multi-parent coordination** — if two parents have a link to the same teen, can both fund allowances? Can both configure matches on the same goal? Who can edit/pause whose allowance?
- **Tax & legal** — Moroccan regulatory framing of recurring allowance: gift, income, or non-event? Affects future B2B dashboards and exports.
- **Idempotency** — cron disbursement must never double-pay (system clock drift, retries, manual reruns). Anchored on `next_disbursement_at` advancement inside the same transaction as `top_up_teen`.
- **Locked-coin enforcement** — server-side check at every spend RPC must subtract goal-locked balance; clients must display "spendable" vs "locked" without confusion.
- **Goal duration** — max horizon? 1 year? Multi-year? Affects UX (progress visualization, expiry handling) and abuse (parent matches sitting open indefinitely).

---

## 5. Recommended next steps

1. **Decide the open questions above** with the founder (especially conditional scope, match cap shape, cancellation policy) — these gate the schema.
2. **Land the schema migration** (`parent_allowances`, `allowance_disbursements`, `savings_goals`, `savings_contributions`) in a single PR with RLS from day one.
3. **Build the cron** (`app/api/cron/disburse-allowances`, idempotent, daily) before any UI — UI without the engine is a footgun.
4. **Wire `lock_to_goal` / `release_from_goal` RPCs**, add a server-side check inside the spend RPC subtracting locked balance, and ship a `user_coins_spendable` view.
5. **Parent-side UI first** (`/parent/allowances/new`, `/parent/savings`) — parents are the funding source, and a teen-only UI without a parent way to set things up is dead weight.
6. **Teen UI second** (`/teen/wallet/allowance`, `/teen/savings`, `/teen/savings/:id`) with progress visualization.
7. **Avatar-coach integration** last — once the data exists, coach lines for "next allowance Friday", "halfway to goal", "goal achieved" are cheap.
8. **Telemetry** — track allowance setup rate, disbursement success rate, goal creation rate, % goals achieved, average time-to-goal. These become headline retention metrics.

---

## 6. Cross-references

- `docs/vision/economy.md` — coin pipeline, `top_up_teen`, escrow model (this feature rides on it).
- `docs/vision/parent-control.md` — multi-parent links, parental approval flow (allowance edit gates).
- `docs/vision/avatar-coach.md` — coach trigger contracts (allowance/goal hooks plug in here).
- `docs/vision/birthday.md` — goal `target_date` often anchored to a birthday.
- `docs/vision/payment-rails-morocco.md` — Friday-as-paycheck-day default cadence rationale.
- `docs/vision/notifications.md` — push channel for goal-achieved celebrations.
- `docs/vision/data-model.md` — overall schema map (this doc adds 4 tables to it).

---

## SPEC

### Data contract — allowance

```sql
public.parent_allowances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  teen_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  amount_dh NUMERIC(10,2) NOT NULL CHECK (amount_dh > 0),
  cadence TEXT NOT NULL CHECK (cadence IN ('weekly','biweekly','monthly','custom_dates')),
  cadence_config JSONB NOT NULL DEFAULT '{}'::jsonb,
    -- e.g. {day_of_week: 5, hour: 9}  | {day_of_month: 1}  | {dates: ['2026-06-15', '2026-07-15']}
  conditional BOOLEAN NOT NULL DEFAULT FALSE,
  condition_type TEXT CHECK (condition_type IN ('streak_min','quest_completion_rate','chore_checklist','custom')),
  condition_threshold INTEGER,
  condition_config JSONB DEFAULT '{}'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  next_disbursement_at TIMESTAMPTZ NOT NULL,
  paused_until TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

public.allowance_disbursements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  allowance_id UUID NOT NULL REFERENCES parent_allowances(id) ON DELETE CASCADE,
  scheduled_at TIMESTAMPTZ NOT NULL,
  executed_at TIMESTAMPTZ,
  amount_dh NUMERIC(10,2) NOT NULL,
  payment_transaction_id UUID,         -- FK into payment_transactions
  escrow_ledger_id UUID,                -- FK into parent_escrow_ledger
  coin_transaction_id UUID,             -- FK into coin_transactions (the credit on the teen side)
  status TEXT NOT NULL CHECK (status IN ('pending','succeeded','skipped','failed')),
  condition_met BOOLEAN,
  skip_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### Data contract — savings goals

```sql
public.savings_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teen_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  parent_id UUID REFERENCES profiles(id),  -- the parent who configured the match (nullable)
  title TEXT NOT NULL,
  description TEXT,
  image_url TEXT,
  target_coins INTEGER NOT NULL CHECK (target_coins > 0),
  current_saved_coins INTEGER NOT NULL DEFAULT 0 CHECK (current_saved_coins >= 0),
  target_date DATE,
  parent_match_pct NUMERIC(5,2) NOT NULL DEFAULT 0,    -- 50.00 = parent matches 50%
  parent_match_cap_coins INTEGER,                       -- max coins parent will contribute
  parent_match_contributed_coins INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','achieved','cancelled','expired')),
  achieved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

public.savings_contributions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  goal_id UUID NOT NULL REFERENCES savings_goals(id) ON DELETE CASCADE,
  source TEXT NOT NULL CHECK (source IN ('teen_lock','parent_match','allowance_auto')),
  amount_coins INTEGER NOT NULL CHECK (amount_coins > 0),
  contributor_user_id UUID NOT NULL,
  coin_transaction_id UUID,   -- FK into coin_transactions when match crosses the pipeline
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Locked-balance accounting:
-- Coins remain in user_coins.balance, but a view subtracts active goal locks:
CREATE VIEW user_coins_spendable AS
SELECT
  uc.user_id,
  uc.balance,
  COALESCE(SUM(sg.current_saved_coins) FILTER (WHERE sg.status = 'active'), 0) AS locked_in_goals,
  uc.balance - COALESCE(SUM(sg.current_saved_coins) FILTER (WHERE sg.status = 'active'), 0) AS spendable
FROM user_coins uc
LEFT JOIN savings_goals sg ON sg.teen_id = uc.user_id
GROUP BY uc.user_id, uc.balance;
```

### Cron / RPCs

- `app/api/cron/disburse-allowances` — runs daily (e.g. 06:00 Africa/Casablanca). For each `parent_allowances` row where `is_active = TRUE AND (paused_until IS NULL OR paused_until <= now()) AND next_disbursement_at <= now()`:
  1. If conditional, evaluate condition against streak / quests / chores.
  2. If condition fails → insert `allowance_disbursements (status='skipped', skip_reason)`, advance `next_disbursement_at` to next slot.
  3. If condition met → call `top_up_teen(parent_id, teen_id, amount_dh)` inside the same tx, capture transaction IDs, insert `allowance_disbursements (status='succeeded')`, advance `next_disbursement_at`.
  4. On failure → `status='failed'`, do not advance, alert parent.
  Idempotency anchored on `next_disbursement_at` advancement inside the same tx.

- `RPC lock_to_goal(teen_id UUID, goal_id UUID, amount_coins INTEGER)` — validates teen owns goal & has spendable coins ≥ amount, increments `current_saved_coins`, inserts `savings_contributions (source='teen_lock')`, fires parent-match trigger.

- `RPC release_from_goal(teen_id UUID, goal_id UUID, amount_coins INTEGER, reason TEXT)` — for cancellations / corrections. Decrements `current_saved_coins`. Match-coin handling per cancellation policy (see open question #2).

- `RPC complete_goal(goal_id UUID)` — when `current_saved_coins >= target_coins`, sets `status='achieved'`, `achieved_at=now()`, fires celebration event.

- **Postgres trigger** on `savings_contributions` insert with `source='teen_lock'`: if parent has configured a match and cap not reached, escrow the match amount via `top_up_teen` and insert a sibling `savings_contributions (source='parent_match')` row.

### UI

- `/parent/allowances` — list active + paused allowances with next-disbursement countdown, pause/resume buttons.
- `/parent/allowances/new` — form (teen, amount, cadence, optional condition).
- `/parent/allowances/[id]/edit` — edit / pause / cancel.
- `/parent/savings` — view each teen's active goals, configure match (%, cap), see contribution history.
- `/teen/wallet/allowance` — read-only "next allowance: Friday in 3 days, 20 DH" tile, history of past disbursements.
- `/teen/savings` — list goals (active / achieved), progress bars, "create goal" CTA.
- `/teen/savings/new` — form (title, description, image, target coins, target date).
- `/teen/savings/[id]` — progress visualization, lock-coins action, contribution log, parent-match badge.

### Avatar-coach integration

- Allowance day morning → "Vendredi argent de poche : +20 DH dans ta cagnotte !"
- Conditional streak almost met → "Plus que 1 jour de streak pour gagner ton allowance !"
- Goal at 50% → "Tu es à mi-chemin de ta tablette, continue !"
- Goal at 90% → "Plus que 500 coins pour ta tablette, presque là !"
- Goal achieved → celebration line + push to parents.
- Birthday week with active goal → ties into `docs/vision/birthday.md` coach hooks.

### Invariants

- Allowance cron is idempotent on `next_disbursement_at` (advancement inside same tx as top-up; cannot double-pay).
- Locked coins (sum of active `savings_goals.current_saved_coins` for teen) cannot be spent — enforced server-side at every spend RPC, surfaced via `user_coins_spendable` view.
- Conditional allowance failure → log `skip_reason`, do **not** retry within the same cadence window; retry naturally next cadence.
- Multi-parent: only the funding parent (`parent_allowances.parent_id`) can edit / pause that allowance; only the matching parent (`savings_goals.parent_id`) can edit a match config.
- Parent match: the match contribution is escrowed and credited in the **same transaction** as the teen lock, so a goal can never be in a state where the match is "owed but not paid".
- Cancelling an achieved goal is forbidden (status transition `achieved → cancelled` rejected at RPC layer).
- Disbursement amount must equal `parent_allowances.amount_dh` at time of execution (snapshot, not live-bound).

### Acceptance criteria

- [ ] `Parent.test` sets a weekly 20 DH Friday allowance for `amine`.
- [ ] Cron runs Friday → 2000 coins land in `user_coins`, a `coin_transactions` row is inserted, an `allowance_disbursements (status='succeeded')` row is inserted.
- [ ] Cron is idempotent: running it twice on the same Friday produces only one disbursement.
- [ ] Pausing the allowance for 2 weeks → cron skips 2 Fridays, resumes on the 3rd.
- [ ] Conditional allowance ("streak ≥ 5") with streak = 3 → `allowance_disbursements (status='skipped', skip_reason='streak_below_threshold')`.
- [ ] `Amine` creates a "Tablette" goal targeting 5000 coins by 31 Dec.
- [ ] `Amine` locks 1000 coins → `user_coins_spendable.spendable` decreases by 1000; `current_saved_coins = 1000`.
- [ ] Spend RPC rejects when `amount > spendable`.
- [ ] Parent configures 50% match cap 500 → next time `amine` locks 200 → trigger fires, parent escrows extra 100, `parent_match_contributed_coins = 100`.
- [ ] Match cap reached → further teen locks no longer trigger match.
- [ ] Goal reached → status flips to `achieved`, celebration animation fires, push notification to parent(s).
- [ ] Cancelling an active goal releases locked coins per chosen cancellation policy.

### Open questions

- **Conditional allowance scope** — only streak? Add quest completion rate? Chore checklist? Hybrid AND/OR rules?
- **Goal duration max** — 1 year? Multi-year? Or no hard cap?
- **Cancellation policy** — locked coins released to spend, OR returned to parent escrow, OR teen choice?
- **Match cap shape** — % of `target_coins`, absolute coin amount, or per-month rolling cap?
- **Default cadence** — weekly Friday (Moroccan paycheck day) or monthly 1st?
- **Multi-parent matching** — can two parents stack matches on the same goal?
- **Tax / legal framing** — gift, income, or non-event for Moroccan regulatory purposes?
- **Achieved goal coin lifecycle** — auto-spent on the named reward, or stay liquid for teen to redeem manually?
- **Allowance vs goal coupling** — can a parent set an allowance that auto-locks N% into an active goal? (Forced-savings UX.)
- **Notification preferences** — should teens be able to mute "next allowance" pings to avoid scarcity anxiety?
