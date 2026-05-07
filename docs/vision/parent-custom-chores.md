# Parent Custom Chores — Vision

## Vision

**Parents create custom missions / chores for their teen with money rewards.** This is the bridge between the digital reward economy of Nivy and the lived reality of family life in Morocco. Examples the founder explicitly calls out:

- "Faire la vaisselle 5 jours d'affilée → 100 DH"
- "Sortir le chien tous les matins cette semaine → 50 DH"
- "Aider petit frère devoirs 3x → 75 DH"
- "Ranger sa chambre tous les soirs → 30 DH/semaine"

This is **distinct from platform-defined missions** stored in `mission_templates` (which are globally seeded by Nivy ops: daily / weekly / seasonal / onboarding challenges sourced from the platform itself). Parent-custom chores are **family-scoped, parent-authored, recurring or one-shot tasks** — Nivy plays no editorial role, it merely provides the rails: definition, completion, evidence, verification, payout, and gamification.

The reward flow is two-tracked:

1. **Money (DH → coins).** Reward lands directly in the teen's coin balance (1 DH = 100 coins, like a parent-initiated top-up) but **only after parent verification** of completion. This is functionally a conditional, behavior-gated top-up — the teen does not "request" it, the chore itself triggers the disbursement.
2. **XP (gamification).** Each completed and verified chore awards XP, feeding into the teen's level / streak / badge system. This is the layer that prevents chores from being purely transactional and ties them into the broader Nivy progression loop.

**Why this matters for product strategy.** Parent dashboards today (budget, top-up, approvals, e-signature, history) are fundamentally *defensive* — parents control what teens already want to do. Custom chores flip the polarity: parents become the **issuer of opportunities**. Nivy stops being a child wallet and becomes a **household discipline engine**. Daily utility skyrockets — every dish washed, every dog walked is a Nivy event — which dramatically improves retention, weekly active days, and the parent's perceived ROI on the subscription. It also gives the avatar coach a steady stream of authentic, family-anchored conversation hooks ("Maman a promis 20 DH pour la vaisselle ce soir, on s'y met?").

## Code state

**Zero implementation.** Exhaustive search:

- Grep for `parent_chore`, `family_task`, `custom_mission`, `corvée`, `vaisselle`, `tâche` returns matches **only** in marketing / brainstorming docs (`research/`, `docs/analysis/`, `docs/audits/`) and never in `app/`, `lib/`, `components/`, or migrations.
- `app/parent/` directory listing: budget, teens, history, documents, notifications, settings, live, grades, events, **approvals** (transaction approvals only), topup, e-signature. No `chores/` or `tasks/` route.
- `app/teen/` directory listing: academic, passions, settings, events, coins, shop, quests (platform missions), social, profile, etc. No `chores/`, `tasks/`, or `famille/` route.
- `mission_templates` is the only mission-like surface and it is **globally seeded**, no parent authorship.

**Tangentially related code that will be reused, not extended:**

- `parental_approvals` (table + `app/parent/approvals/page.tsx` + `components/parent/approval-buttons.tsx`) — a generic parent-decision queue (action_type / resource_type / amount / status). Could be extended with `action_type='chore_completion'` but the chore *definition* itself does not belong here.
- `parent_teens_overview` view and `teen_budget_limits` — used to scope chores to a specific child.
- Coin top-up rails (`/parent/topup`) and `coin_transactions` — the payout pipe.
- Sponsor challenge form (`components/parent/sponsor-challenge-form.tsx`) — UX precedent for parent-as-issuer flow; closest existing analogue but it targets *platform challenges*, not chores.

## DB state

Live query against `imchornjvmgmaovhypco`:

```
SELECT tablename FROM pg_tables WHERE schemaname='public'
  AND (tablename ILIKE '%chore%' OR tablename ILIKE '%task%'
       OR tablename ILIKE '%family%' OR tablename ILIKE '%mission%'
       OR tablename ILIKE '%approval%');
```

Returns: `user_missions`, `mission_progress_log`, `mission_templates`, `family_subscriptions`, `special_challenge_submissions`, `parental_approvals`, `family_members`, `ambassador_commissions`. **No table containing `chore`, no table containing `task`.**

`mission_templates` columns: `id, code, name, description, mission_type (daily/weekly/monthly/seasonal/onboarding), category, xp_reward, bonus_rewards (jsonb), objective_type, objective_target, objective_config (jsonb), season, valid_from, valid_until, icon, color, difficulty, sort_order, is_active, is_repeatable, created_at, updated_at`. **No `parent_id`, no `family_id`, no `is_user_defined` flag.** Distinct `mission_type` values are all platform categories (`daily`, `weekly`, `monthly`, `seasonal`, `onboarding`); none correspond to parent-issued chores. Conclusion: this table is *not* the right home for custom chores, and we should not pollute the global catalogue with per-family rows.

`user_missions` columns: `id, teen_id, mission_id, progress, progress_data, status, period_start, period_end, completed_at, claimed_at, xp_earned, rewards_claimed, created_at, updated_at`. References a `mission_id` (FK to `mission_templates`); reusing this for parent chores would force the same templates pollution. Cleaner to mirror this structure with a dedicated `parent_chore_completions` table.

`parental_approvals` columns: `id, parent_id, teen_id, action_type, resource_type, resource_id, amount, details (jsonb), status, requested_at, decided_at, decided_by, expires_at`. Distinct `action_type` rows: **empty**. Table is provisioned but unused. Could carry chore-verification rows (`action_type='chore_completion'`, `resource_id=completion.id`) but the chore *catalogue* must live elsewhere.

## Gaps

1. **No `parent_chores` table.** No way for a parent to define a chore.
2. **No `parent_chore_completions` table.** No way to record per-occurrence completion, evidence, or verification.
3. **No parent UI.** `/parent/chores`, `/parent/chores/new`, `/parent/chores/:id` routes do not exist.
4. **No teen UI.** `/teen/chores` does not exist; teen has no surface to see assigned chores or mark completion.
5. **No API.** `app/api/parent/chores/*` and `app/api/teen/chores/*` route handlers do not exist.
6. **No payout pipeline.** `coin_transactions.transaction_type` enum has no `chore_payout` value; no RPC links a verified chore to a coin top-up.
7. **No XP pipeline.** `xp_log` / cashback hooks do not have a `chore_completed` source.
8. **No evidence storage policy.** No private storage bucket dedicated to chore evidence; no signed-URL lifecycle.
9. **No recurrence engine.** No cron / scheduler emitting "this week's chore window opens" events; no auto-archive on period end.
10. **No avatar coach hook.** Coach prompt builder does not pull from open chores.
11. **No notification template.** No "parent posted a new chore" / "chore verified, you earned X DH" notification.
12. **No multi-parent verification semantics.** Today `parental_approvals.parent_id` is single — needs decision on first-parent-wins vs. both-must-verify for chores.

## Risks

- **Trust loss if reward is delayed or mis-paid.** Coin payout must be atomic with verification. A failed top-up after a verified chore is the worst-possible UX (parent "promised" → teen sees nothing).
- **Photo evidence privacy.** Teens uploading photos of their bedroom / themselves doing dishes is sensitive. Bucket MUST be private, signed-URL with short TTL, parent-only access, auto-purge after 30 / 90 days.
- **Coercion / abuse.** A parent could weaponise chores ("nettoie 100x sinon 0 DH"). Need a sanity ceiling (e.g. max `required_completions` per period, max chore count per teen) and an escalation path (teen can flag a chore as abusive, surfaces to admin moderation).
- **Reward inflation undermining the platform economy.** If parents pour 1000 DH/month in chores, it skews leaderboards and devalues platform-earned XP. Mitigation: chore XP capped per period (e.g. 20% of total weekly XP) and tagged distinctly so leaderboards can segment.
- **Teen self-completion fraud.** Teen marks chore done without doing it. Mitigation: parent verification required before payout, optional photo evidence, completion timestamp must fall within `starts_at..ends_at`.
- **Multi-parent disagreement.** Father verifies, mother rejects. Need a deterministic rule.
- **Recurrence drift across DST / timezone.** Morocco is UTC+1 (no DST since 2018), but teens / parents abroad add complexity. Store everything in UTC + a `recurrence_timezone` field if needed.
- **Subscription scope.** Is "create chores" a free feature or behind `family_subscriptions`? Not yet decided.

## Open questions

- Does a chore need a single teen target, or can it be issued to multiple teens (siblings) at once?
- If parent edits a chore mid-period, does the change affect already-logged completions?
- Should there be a **negative** chore (penalty, e.g. "didn't take the trash → -10 DH")? Founder signal is positive-only, but punitive variants will be requested.
- Does the avatar coach actively *remind* the teen of pending chores, or only respond when asked?
- Are completed-and-verified chores visible on the teen's social profile / leaderboard, or strictly private to the family?
- Does the platform take a fee on chore payouts (e.g. 1% as part of the family subscription value), or is the rail free?

## SPEC — what to build

### Data contract

```sql
public.parent_chores (
  id UUID PK,
  parent_id UUID REFERENCES auth.users(id),
  teen_id UUID REFERENCES teens(id),
  title TEXT NOT NULL,
  description TEXT,
  reward_dh NUMERIC(10,2),
  reward_xp INTEGER,
  recurrence TEXT CHECK (recurrence IN ('one_shot','daily','weekly','monthly','custom_days')),
  recurrence_config JSONB, -- e.g. {"days_of_week":[1,2,3,4,5]}
  starts_at TIMESTAMPTZ,
  ends_at TIMESTAMPTZ,
  required_completions INTEGER DEFAULT 1, -- "5 fois"
  evidence_required BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ
);

public.parent_chore_completions (
  id UUID PK,
  chore_id UUID REFERENCES parent_chores(id),
  teen_id UUID,
  completed_at TIMESTAMPTZ,
  evidence_url TEXT, -- private bucket
  parent_verified BOOLEAN,
  verified_at TIMESTAMPTZ,
  rejection_reason TEXT,
  payout_id UUID -- once paid out, link to payment_transactions / coin_transactions
);
```

RLS: parent reads / writes only their own chores; teen reads only chores where `teen_id = self`; teen inserts completions only for chores assigned to them; verification updates restricted to linked parents.

### API

- `POST /api/parent/chores/create` — body: chore definition.
- `POST /api/parent/chores/:id/verify-completion` — body: `{ completion_id, decision: 'approve'|'reject', rejection_reason? }`.
- `POST /api/teen/chores/:id/complete` — multipart: optional `evidence` file, auto-uploaded to private bucket, signed-URL stored.
- `GET /api/parent/chores` — list active chores + per-chore completion counts.
- `GET /api/teen/chores` — list assigned chores + own completion progress.

### UI surfaces

- `/parent/chores` — list of active chores, completion stats per chore, primary CTA "Nouvelle corvée".
- `/parent/chores/new` — form (title, description, teen picker, reward DH, reward XP, recurrence picker, required_completions, evidence toggle, date window).
- `/parent/chores/:id` — detail view with completion history, pending-verification queue, edit / archive actions.
- `/teen/chores` — teen view: assigned chores, "Marquer comme fait" button, optional photo upload, progress bar (e.g. 3/5 done this week).
- **Avatar coach surface** — coach pulls open chores into the daily prompt: "Tu as la vaisselle aujourd'hui, Maman a promis 20 DH". Confirmation tap can deep-link to `/teen/chores/:id`.

### Reward payout flow

On `(verified completions count >= required_completions) AND parent_verified=true`:

1. RPC `top_up_teen(teen_id, amount_dh, source='parent_chore', metadata={chore_id, period_start, period_end})`.
2. Coins land in `user_coins.balance` at 1 DH = 100 coins.
3. `coin_transactions` row inserted with `transaction_type='chore_payout'` (extend enum).
4. XP cashback fires: `xp_log` row, source `chore_completed`, amount `reward_xp`.
5. `parent_chore_completions.payout_id` set to the new `coin_transactions.id`, locking it against double-payout.
6. Notification: parent ("100 DH versé pour la vaisselle"), teen ("Maman a validé : +100 DH +1000 XP").

### Invariants

- Reward only paid out when completions are verified AND `count >= required_completions` for the active period.
- Teen cannot mark `parent_verified=true` (RLS).
- Photo evidence in a PRIVATE Supabase storage bucket; signed URLs only, max 7-day TTL.
- No partial reward unless parent explicitly overrides via a "pay pro-rata" action.
- Multi-parent: any linked parent (any `family_members` row with role parent for this teen) can verify — first-parent-wins, immutable once verified.
- A chore with `is_active=false` accepts no new completions.
- Idempotency: a single completion row can only be linked to one `payout_id`; payout RPC must be transactionally guarded.

### Acceptance criteria

- ☐ Parent.test creates "Faire la vaisselle 5 jours = 100 DH" recurring weekly with `required_completions=5`.
- ☐ Teen.amine completes 5 times within the week, each completion logged in `parent_chore_completions`.
- ☐ Each completion shows in `/parent/chores/:id` pending verification queue.
- ☐ Parent verifies all 5 → 100 DH = 10 000 coins land in `user_coins` + 1 000 XP cashback in `xp_log`.
- ☐ Re-running next week resets the count (new period rows).
- ☐ Rejected completion does not contribute to count and surfaces a rejection reason in teen UI.
- ☐ Evidence URL is signed and expires after 7 days.

### Open questions

- Verification gating: photo proof always required, or parent-toggle per chore?
- Partial reward (3 of 5 done): pro-rata or all-or-nothing default?
- Multi-parent: both must verify, or first-parent-wins?
- Recurring chore at end of period: auto-archive or carry over to next period?
- Penalty for missed: deduct coins, only XP loss, or no penalty at all?
- Coach / teacher equivalent (homework done with a tutor) — should they have a parent-like issue-and-verify role, or strictly parent-only? See `docs/vision/teacher-coach-xp.md` for the related teacher XP debate.
