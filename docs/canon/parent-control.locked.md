# LOCKED — Parent Control Canon

> Status: **CANONICAL / READ-ONLY**. Derived from `docs/vision/audit-frontend-reality/E4-parent-flows.md`, `B2-parent-audit.md`, `docs/vision/parent-control.md`, `docs/vision/parental-authorizations.md`, `docs/vision/parent-custom-chores.md`, `docs/vision/allowance-savings.md`, `docs/vision/audit-prelaunch/03-money-pipeline.md`, `docs/vision/PRODUCT_WHITEPAPER.md` (§5, §10, §20, §29). Any divergence from this file is a bug.
>
> Money invariant (whitepaper §5 + §29): every coin movement on a parent surface routes through a SECURITY DEFINER RPC, debit/credit pairs into `coin_transactions` + `escrow_ledger`, locked rate 1 DH = 100 coins. Parent surfaces are RLS-bound; `service_role` is allowed only on money-bearing RPCs (top-up, allowance, chore payout, savings match, manual top-up enqueue) and must NEVER be used to bypass `parent_teen_links` ownership on read paths.

---

## 1. LOCKED — Parent dashboard

### `/parent` (server-rendered) MUST show

Aggregated, real-Supabase tiles (no mocks). Source views/tables in parentheses.

1. **Greeting + signature gate banner** — if no row in `e_signatures` with `terms_accepted=true` for `parent_id=auth.uid()`, render persistent banner steering to `/parent/e-signature`. Banner is a soft prerequisite for browsing; it is a HARD block on top-up + approval action endpoints (see §2, §5, §6).
2. **Linked teens strip** — `parent_teens_overview` rows for the parent. Each card surfaces: avatar, pseudo, level, coin balance, monthly spend, "Top-up" deep-link (`/parent/topup?teen={id}`), "Détails" deep-link (`/parent/teens/{id}` — see §11 MISSING).
3. **Pending approvals count** — `count(*) FROM parental_approvals WHERE parent_id=$me AND status='pending'`. Tile deep-links to `/parent/approvals`. **Sidebar badge MUST read this count** — no hardcoded `2`.
4. **Pending chore verifications count** — `count(*) FROM parent_chore_completions JOIN parent_chores ON ... WHERE parent_chores.parent_id=$me AND parent_chore_completions.parent_verified IS NULL`. Deep-link to `/parent/chores`.
5. **Next allowance disbursement** — earliest `parent_allowances.next_disbursement_at WHERE parent_id=$me AND is_active=true`. Deep-link to `/parent/allowances`.
6. **Budget overview per teen** — `teen_budget_limits` joined with current-month spend from `bookings`. Three states: under / near (≥80%) / over.
7. **Recent activity timeline** — last 10 `coin_transactions` for linked teens (top-ups, spends, refunds), labelled by `transaction_type` + `source_type`.
8. **Live tile** — count of teens currently checked-in (`event_check_ins` with no `checked_out_at`). Deep-link to `/parent/live`.
9. **Quick actions** (real `<Link>`, NOT decorative buttons): "Nouvelle corvée", "Top-up", "Demander signature CIN", "Configurer allowance", "Voir l'historique". The current decorative `<Button>` cards on `app/parent/page.tsx:407-414` MUST be replaced with `<Link>`s or removed.

### Sidebar — canonical 9 items (`components/dashboard/parent/sidebar.tsx`)

| # | Label | Href | Icon |
|---|---|---|---|
| 1 | Dashboard | `/parent` | Home |
| 2 | Mes Teens | `/parent/teens` | Users |
| 3 | Top-up Crédits | `/parent/topup` | CreditCard |
| 4 | Approbations | `/parent/approvals` | FileCheck |
| 5 | Events | `/parent/events` | Calendar |
| 6 | Historique | `/parent/history` | History |
| 7 | Notifications | `/parent/notifications` | Bell |
| 8 | Abonnement | `/carte-vip/souscrire` (NOT `/parent/subscription` — see §9 DEPRECATED) | Crown |
| 9 | Paramètres | `/parent/settings` | Settings |

The `Approbations` entry MUST display a live badge sourced from a server prop (pending count from §1.3). The hardcoded `2` literal is FORBIDDEN.

### Mobile dock — canonical 5 items (`components/layouts/parent-mobile-dock.tsx`)

| # | Label | Href | Icon |
|---|---|---|---|
| 1 | Home | `/parent` | Home |
| 2 | Teens | `/parent/teens` | Users |
| 3 | Approvals | `/parent/approvals` | FileCheck |
| 4 | Budget | `/parent/budget` | Wallet |
| 5 | Settings | `/parent/settings` | Settings |

The dock badge on `Approvals` MUST be wired from `pendingCount` prop (already plumbed; just unused at most call-sites). Lifestyle features (chores, allowances, rides, food, mentor-sessions, savings, grades, live, documents, manual topup) are deep-link-only — they do NOT enter dock or sidebar.

---

## 2. LOCKED — Top-up

### Canonical client → API contract

```ts
// POST /api/parent/topup
// body:
{
  teenId: string,         // UUID of a teen linked to caller via parent_teen_links
  amount_dh: number       // > 0, NUMERIC(10,2). Server multiplies *100 to compute coins.
}
```

The form (manual or package selection) MUST resolve a numeric `amount_dh` client-side and send only `{ teenId, amount_dh }`. Sending `{ packageId, coins, bonus, price, parentId }` is FORBIDDEN — `parentId` is derived server-side from `getUserRole()`, and `packageId` is a UI-only construct (the API is package-agnostic; bonuses are static config and MUST be applied as a separate `top_up_teen` call against the same `psp_idempotency_key` if used at all). The current `components/parent/topup-form.tsx:53-64` payload shape is the launch-blocking bug (E4 §3).

### Manual vs auto-package routes

| Route | Endpoint | Path | Trigger | PSP |
|---|---|---|---|---|
| **Auto / package** | `/parent/topup` page → `/api/parent/topup` | atomic `top_up_teen` RPC | parent clicks a package OR enters a custom DH amount | LAUNCH: stubbed `psp_provider='manual'`, status auto-`succeeded`. POST-LAUNCH: real PSP webhook calls the same RPC after charge. **Until a real PSP is wired, the auto-package UI MUST be hidden behind `PSP_AUTO_TOPUP_ENABLED=false` and parents routed to manual.** |
| **Manual** (Cash Plus / Wafacash / M2T / DamaneCash / BaridCash / other) | `/parent/topup/manual` page → `/api/parent/topup/manual` | inserts `manual_topup_requests { status='pending' }` (NOT `top_up_teen` directly); admin reviews + credits via `top_up_teen` from `/admin/topup-requests` | parent reports an out-of-band wire | none — operator's reference number stored in `provider_ref` (UNIQUE on `(provider, provider_ref)`) |

### PSP rails (post-launch order)

1. Cash Plus (top priority — Moroccan retail cash rail, no card required).
2. CMI / domestic 3DS card.
3. Wafacash + M2T as automated providers (today they are manual).
4. Stripe (international, parent abroad).

### Idempotency

- `payment_transactions.client_idempotency_key TEXT UNIQUE` (P0 column to add). The client generates a `crypto.randomUUID()` per submit; the API forwards as `p_idempotency_key`. Re-firing the same key returns the prior `payment_id` rather than double-charging.
- `payment_transactions.psp_reference TEXT UNIQUE` for the PSP's own ref (set by webhook).
- The RPC `top_up_teen` is the single atomic point: `payment_transactions` (pending → succeeded) + `escrow_ledger` (direction `top_up`, `related_payment_id`) + `user_coins` (UPSERT) + `coin_transactions` (`transaction_type='topup'`). All four rows MUST land in the same transaction; an EXCEPTION rolls back all four. §29.4 invariant.
- E-signature gate enforced server-side (`e_signatures.terms_accepted=true`) before `top_up_teen` is called. No client-only gate.

---

## 3. LOCKED — Allowance

### Creation

`POST /api/parent/allowances` body:

```ts
{
  teen_id: string,
  amount_dh: number,                       // > 0
  cadence: 'weekly'|'biweekly'|'monthly'|'custom_dates',
  cadence_config: {                        // shape per cadence:
    day_of_week?: 1|2|3|4|5|6|7,           // weekly/biweekly (default 5 = Friday)
    day_of_month?: number,                  // monthly
    dates?: string[]                        // custom_dates (ISO YYYY-MM-DD)
  },
  conditional?: boolean,                   // default false
  condition_type?: 'streak_min'|'quest_completion_rate'|'chore_checklist'|'custom',
  condition_threshold?: number,
  condition_config?: object
}
```

Server validates `parent_teen_links(parent_id, teen_id)` exists, computes `next_disbursement_at` via `lib/allowance/next-disbursement`, inserts via service role into `parent_allowances`. Default cadence: **weekly Friday 09:00 Africa/Casablanca** (Moroccan paycheck day — locked vision).

### Recurring schedule + debit-on-day

- Cron `app/api/cron/disburse-allowances` runs daily 06:00 Africa/Casablanca.
- For each row where `is_active=TRUE AND (paused_until IS NULL OR paused_until <= now()) AND next_disbursement_at <= now()`:
  1. If `conditional`, evaluate condition. Failure → insert `allowance_disbursements (status='skipped', skip_reason)`, advance `next_disbursement_at`.
  2. If unconditional or condition met → call `disburse_allowance(allowance_id)` RPC (SECURITY DEFINER, locks the row `FOR UPDATE`, delegates to `top_up_teen`). Inserts `allowance_disbursements (status='succeeded', payment_transaction_id, escrow_ledger_id, coin_transaction_id)`. Advance `next_disbursement_at`.
  3. Failure → `status='failed'`, do NOT advance, alert parent via `user_notifications`.
- Idempotency anchored on `next_disbursement_at` advancement inside the same transaction as `top_up_teen`. Re-running the cron same-day cannot double-pay.

### Pause / resume

- `POST /api/parent/allowances/[id]/pause` body `{ until: ISO8601 }`. Hard `until` — no infinite pause via this endpoint.
- `POST /api/parent/allowances/[id]/resume` clears `paused_until`, sets `is_active=true`.
- Delete is NOT supported: parents pause indefinitely OR set `is_active=false` (admin-only). The `Trash2` icon dangling in `app/parent/allowances/page.tsx` MUST be removed until a delete endpoint is built.

### Teen receipt

On a successful disbursement, the cron MUST insert one `user_notifications` row for the teen:

```
title: "Argent de poche reçu"
body:  "+{amount_dh} DH ({amount_coins} coins) — prochaine échéance {next_disbursement_at}"
priority: "normal"
data: { type: 'allowance_disbursement', disbursement_id, allowance_id }
action_url: "/teen/wallet"
```

A skipped disbursement (conditional failure) inserts a `user_notifications` row with `type='allowance_skipped'` and the `skip_reason` in `data`.

---

## 4. LOCKED — Chores

### Create / assign

`POST /api/parent/chores/create` body:

```ts
{
  title: string,
  description?: string,
  reward_dh: number,
  reward_xp: number,
  recurrence: 'one_shot'|'daily'|'weekly'|'monthly'|'custom_days',
  recurrence_config?: { days_of_week?: number[] },
  starts_at: ISO8601,
  ends_at: ISO8601,
  required_completions?: number,        // default 1
  evidence_required?: boolean,          // default false
  teen_ids: string[],                   // Wave 3 multi-target / sibling fan-out (canonical)
  teen_id?: string                      // legacy single-target fallback
}
```

Server validates each `teen_id ∈ parent_teen_links`, inserts one `parent_chores` row + N `chore_targets` rows for fan-out. Best-effort rollback on junction insert failure (already correct in `app/api/parent/chores/create/route.ts`).

### Evidence review

- Teen submits a completion via `POST /api/teen/chores/[id]/complete` with optional multipart upload.
- Evidence file lands in **private** Supabase storage bucket `chore-evidence` (path: `{chore_id}/{completion_id}.{ext}`). Public access FORBIDDEN.
- `/parent/chores/[id]` server-renders the completion list with **server-side re-signed URLs**, TTL = 15 minutes (already correct). On signing failure, render "preuve indisponible" — never fall back to a public URL.

### Approve / reject (canonical RPC path)

`POST /api/parent/chores/[id]/verify-completion` body `{ completion_id, decision: 'approve'|'reject', rejection_reason? }`. Thin wrapper around the SECURITY DEFINER RPC `verify_chore_completion`. Status mapping: 403 `not_linked`, 409 `already_verified`, 404 `not_found`. The route MUST NOT directly UPDATE `parent_chore_completions.parent_verified` — money cascade is the RPC's job.

### Coin payout via SECURITY DEFINER RPC

On approve, `verify_chore_completion` delegates to `payout_chore_reward(p_completion_id)` (SECURITY DEFINER, `SELECT FOR UPDATE` on the completion + `top_up_teen` for the coin write). The RPC re-tags `coin_transactions.source_type='chore_payout'` and `escrow_ledger.reason='Chore payout: {title}'`. The completion row's `payout_id` is set to the new `coin_transactions.id` to prevent double-payout (idempotency guard).

XP cascade: on approve, an `xp_transactions` row with `source_type='chore_completed'` and `amount=reward_xp` is inserted via `add_xp_to_user` (called from inside the DEFINER RPC).

### Multi-parent verify

Any linked parent (`parent_teen_links` row, regardless of which parent created the chore) can call `verify_chore_completion`. **First-parent-wins, immutable**: once `parent_verified IS NOT NULL`, subsequent calls return 409. This is the locked semantic — co-sign on chores is NOT required (see §12 unresolved for money/consent co-sign).

### Sibling fan-out

`chore_targets` is the junction table. `parent_chores.teen_id` (legacy single-column) MUST stay populated for the first target so existing reads do not break, but the canonical write is the multi-row insert into `chore_targets`. Per-teen completions live in `parent_chore_completions(chore_id, teen_id, ...)` so each sibling's progress is independently tracked.

---

## 5. LOCKED — Approvals queue

### `/parent/approvals` reviews these resource types

| `action_type` | `resource_type` | `resource_id` | Cascade RPC |
|---|---|---|---|
| `coach_meeting` | `mentor_session` | `mentor_sessions.id` | `parent_approve_session(p_session_id, p_decision, p_decided_by)` |
| `ride` | `ride` | `ride_bookings.id` | `parent_approve_ride(p_ride_id, p_decision, p_decided_by)` (P0 — see §11 MISSING the canonical RPC if not yet implemented; without it, an approved ride sits forever) |
| `purchase_above_ceiling` | `marketplace_listing` | `marketplace_listings.id` | `parent_approve_purchase(p_listing_id, p_buyer_teen_id, p_decision, p_decided_by)` (P0 — must hand off to `buy_listing` on approve) |
| `food_order` | `food_order` | `food_orders.id` | `parent_approve_food_order(p_order_id, p_decision, p_decided_by)` (P1 — `place_food_order` already debits if budget allows; gate must run BEFORE the spend, not after) |
| `content` (photo consent / video consent) | `feed_post` \| `event_check_in` | `feed_posts.id` \| `event_check_ins.id` | `parent_approve_content(...)` (P1) |
| `xp_payment` (legacy hybrid) | `booking` | `bookings.id` | DEPRECATED — see §10 FORBIDDEN |

### Routing rule (LOCKED)

The decision endpoint `POST /api/parent/approvals` flips the `parental_approvals` row's `status` (`pending` → `approved`/`denied`) AND inserts a `user_notifications` row for the teen. **It does NOT execute the resource-specific cascade.** The page UI MUST then call the canonical action RPC route for the resource (e.g. `POST /api/parent/mentor-sessions/[id]/approve`) — this is what actually debits coins, confirms the booking, etc.

The current behaviour where the API returns a `hint` string telling engineers to call the cascade is **NOT acceptable shipping behaviour**. Two fixes are LOCKED:

1. **Server-side fan-out** — `/api/parent/approvals` MUST, after the status flip, server-call the resource RPC corresponding to `approval.action_type` inside the same request handler. Failures roll the status back to `pending` (or set a `cascade_failed=true` flag with retry path) — **a teen MUST NEVER see "approved" while the back-end has not executed**.
2. **Client coordination as a fallback** — if server-side fan-out is impossible for a resource, the parent UI MUST explicitly call both endpoints sequentially and only show "Approuvé" after the second succeeds.

Status mapping: `pending` → `approved` | `denied` (NOT `rejected`). Any column read from this table MUST use `action_type` (canonical), never `approval_type` (legacy). The page's `getApprovalIcon(approval.approval_type)` is broken and MUST be migrated to `action_type`.

### Page contract

- Pending list above approved/denied lists.
- Each card: teen avatar + pseudo, action_type icon, `details.summary`, amount (DH or coins) if present, "Voir contexte" deep-link to the resource page, `<ApprovalButtons>` (approve / reject with reason).
- E-signature banner shown if `e_signatures` row missing (already correct).
- TTL surfacing: `expires_at` column must be displayed. A `pending` row past `expires_at` MUST auto-deny via cron (P0 to wire — see §11 MISSING configurable curfew alongside).
- Filter button MUST become functional or be removed.
- No bulk approve at launch.

---

## 6. LOCKED — E-signature

### Consent docs covered by a single signature

A row in `e_signatures` with `terms_accepted=true` covers, with timestamps + IP + UA captured:

- CGU Nivy (general terms).
- Loi 09-08 / CNDP data-protection consent for the teen.
- Photo consent (group default; per-event override possible via `parental_approvals.action_type='content'`).
- Medical consent (events with sport/outdoor risk).

`child_id`, `event_id`, `booking_id` are accepted but only metadata — they do NOT scope the legal capacity. The signature is **per-parent**, lifetime, until `revoked_at` is set.

### Signature gating

Hard server-side gates (return 403 with `requiresSignature: true`):

- `/api/parent/topup` — MUST 403 if no `terms_accepted=true` row.
- `/api/parent/topup/manual` — same.
- `/api/parent/approvals` (the decision endpoint) — same. Parents cannot decide without signing first.
- Any `/api/parent/.../approve` or `.../deny` cascade (mentor, ride, purchase, food, content) — same.

Soft gates (visual banner only, no API block):

- `/parent/teens/add` — banner says "vous devrez signer pour valider les top-ups + approbations".
- `/parent/budget` — banner same.

### Private bucket for CIN

CIN front + back uploads MUST land in a **PRIVATE** Supabase storage bucket. The current `documents` bucket usage with `getPublicUrl` is FORBIDDEN (E4 §6 — privacy regression).

LOCKED: bucket name `parent-cin` (private), path `{profileId}/cin-{front|back}-{ts}.{ext}`. Read access only via signed URL with TTL ≤ 5 minutes, generated server-side at `/parent/documents` rendering. `documents` table audit row stores the bucket path, never a public URL. The audit `documents` table is for tracking only — the bucket itself enforces privacy.

CIN signed-URL TTL recommendation: **5 minutes** for parent self-view, **15 minutes** for admin compliance review (signed by `service_role` from `/admin/parents/[id]/cin`). See §12 unresolved for founder confirmation.

---

## 7. LOCKED — Teens management

### `/parent/teens`

Lists `parent_teens_overview` rows for the parent. Each card:

- Avatar, pseudo, age, level, coins, monthly spend.
- "Top-up" → `/parent/topup?teen={teen_id}` (form pre-selects the teen).
- "Limites" → `/parent/budget?teen={teen_id}` (page MUST filter / scroll to that teen — current behaviour is a no-op and MUST be fixed).
- "Détails" → `/parent/teens/{teen_id}` (see §11 MISSING — page does not yet exist).

### Link teen — three canonical paths

| Path | API | Mechanism |
|---|---|---|
| **Search + invite existing teen** | `GET /api/parent/teens/search?email=…` or `?linking_code=TEEN…` then `POST /api/parent/teens` body `{ teen_id }` | inserts `parent_teen_links { status:'pending' }`, fans out a `user_notifications` row to the teen + a magic-link email via `lib/emails`. Teen confirms at `/auth/validate-teen?token=…`. |
| **Create teen from scratch** | `POST /api/parent/teens/create` body `{ pseudo, age, phone?, email? }` | Server MUST atomically: (a) `supabase.auth.admin.createUser({ email, email_confirm:true })`, (b) insert `profiles { id=uid, role:'teen', linking_code:'TEEN'+8hex }`, (c) insert `parent_teen_links { status:'approved', approved_at:now() }`, (d) email/SMS the teen a set-password / magic-link. **Current behaviour writes profile + link only without `auth.users`** — that is FORBIDDEN (the teen cannot log in). |
| **Direct linking-code claim** | teen-side `POST /api/teen/link-parent` with `{ linking_code }` from the parent's profile | reverse direction — outside parent surface but listed for completeness. |

### Link request via QR / email / share — LOCKED future surface

The three "Bientôt" buttons in `components/parent/add-teen-form.tsx` MUST either ship or be removed before launch. Spec for when shipped:

- **QR code**: page renders a QR encoding `https://nivy.app/auth/validate-teen?token={signed_jwt}` valid 24h. Teen scans on their phone → claims the link.
- **Email invite**: parent enters teen's email → server emails magic-link via `lib/emails`. Same payload as QR.
- **Share link**: same JWT payload, copy-to-clipboard + Web Share API; expires 24h.

Until shipped, these CTAs MUST be hidden, not "disabled with `Bientôt`".

### `/parent/teens/[id]` detail page (§11 MISSING)

Required sections when built:

- Header: avatar, pseudo, level, age, school, archetype.
- Wallet card: coins balance, spendable vs locked-in-goals, lifetime earned/spent, "Top-up" CTA.
- Budget card: current monthly spend vs `teen_budget_limits`, "Modifier" CTA → `/parent/budget`.
- Allowance card: active allowance summary, "Pause"/"Resume" inline.
- Chores card: active chores assigned to this teen, pending verifications.
- Recent activity: last 20 `coin_transactions`, `bookings`, `parental_approvals`.
- Permissions: per-category caps (see §11 MISSING), curfew override, partner blocklist (see §11 MISSING), "Demander signature spécifique pour cet enfant" toggle (§11 MISSING two-parent co-sign).
- Danger zone: "Désactiver compte (panic)" (§11 MISSING panic-suspend), "Délier" (existing DELETE endpoint).

### Permissions matrix (LOCKED)

| Action | Who | Enforced by |
|---|---|---|
| Read teen overview | linked parent only | `parent_teen_links` SELECT policy |
| Top-up the teen | linked parent + signed | API gate + RLS-bypass via `top_up_teen` RPC |
| Set budget limit | linked parent | API + `teen_budget_limits` UPSERT under RLS |
| Approve/reject `parental_approvals` | linked parent + signed | API checks `parent_id = auth.uid() AND signed` |
| Verify chore | any linked parent | `verify_chore_completion` RPC link check |
| Configure savings match | linked parent | `savings_goals` RLS — only parent who configured the match can edit |
| Configure allowance | the funding parent only (`parent_allowances.parent_id`) | API + RLS |
| Unlink teen | any linked parent | `DELETE /api/parent/teens?teenId=` |
| Suspend teen account (panic) | any linked parent | `parent_panic_suspend(teen_id, reason)` RPC (§11 MISSING) |

---

## 8. LOCKED — Notifications

### Canonical table

**`user_notifications`** is the single canonical table for in-app notifications. Schema columns: `id, user_id, title, body, priority, data jsonb, action_url, is_read, read_at, created_at`. Sister tables: `notification_preferences`, `notification_templates`, `notification_triggers`, `notification_analytics`.

The legacy table name `notifications` is **DEPRECATED — DOES NOT EXIST**. Any code that inserts into or selects from `notifications` is broken (silent error in try/catch'd paths, 500 in awaited paths).

### Endpoints that MUST migrate to `user_notifications`

Per E4 cross-cutting findings, six endpoints write to the wrong table or to non-existent `activity_logs`:

- `app/api/parent/teens/route.ts` (link request)
- `app/api/parent/teens/create/route.ts` (teen creation)
- `app/api/parent/budget/route.ts` (budget update notify)
- `app/api/parent/grades/route.ts` (decision notify)
- `app/api/parent/live/route.ts` (early-checkout notify)
- `app/parent/grades/page.tsx` (client-side direct write — also FORBIDDEN; see §10)

LOCKED: `activity_logs` is also DEPRECATED for parent surfaces. Audit signal lives in `coin_transactions`, `escrow_ledger`, `payment_transactions`, `parental_approvals.decided_at/decided_by`, `parent_chore_completions.verified_at/verified_by`, `e_signatures.created_at/signature_hash/ip_address/user_agent`. Ad-hoc `activity_logs` inserts MUST be deleted, not migrated.

### Read path — `/parent/notifications`

Reads `user_notifications WHERE user_id=auth.uid()` ordered by `created_at desc`. The UI's "Marquage automatique au clic" copy is currently false (page is server-rendered, never mutates `is_read`). Either (a) wire a client-side `POST /api/notifications/[id]/mark-read` route and call it on `<Link>` click, or (b) remove the misleading copy. **Option (a) is LOCKED.**

---

## 9. DEPRECATED

### `/parent/subscription`

Sidebar item #8 "Abonnement" currently advertises `/parent/subscription` which **does not exist** (404). LOCKED: redirect the sidebar entry to `/carte-vip/souscrire` (the canonical Nivy Pass / VIP card flow already used by `/parent/settings`'s "Gérer l'abonnement"). The directory `app/parent/subscription/` MUST NOT be created — there is no parent-side subscription surface separate from the VIP card.

### `topup-form` sending `packageId`

`components/parent/topup-form.tsx` payload `{ parentId, teenId, packageId, coins, bonus, price }` is DEPRECATED and BROKEN. The canonical contract is `{ teenId, amount_dh }` (see §2). The fix is mechanical: `amount_dh = selectedPackage.price`. Bonuses (extra coins on a package) — if kept as a marketing feature — MUST be applied via a second `top_up_teen` call by the API itself (server-side, server-trusted bonus table), NOT by trusting client-supplied `bonus`.

### Hybrid XP-as-currency payment route

`app/api/payments/hybrid/route.ts` (writes `parental_approvals` with `type` not `action_type`, deducts XP for event bookings) is DEPRECATED. Whitepaper §5 forbids XP↔coin conversion. The route MUST be feature-flagged off and migrated to coin-only spending via `spend_teen_coins`.

### `lib/payments/xp-converter.ts`

The module's `convertXPToDH` / `convertDHToXP` helpers are DEPRECATED for any spend path. Display-only "DH equivalent" labels in wallet UI may keep using a renamed read-only helper, but no spend path may consume them.

### Subscription tier vocabulary drift

DB stores `free | starter | pro | elite | family` in `subscription_plans`. UI uses `free | silver | gold | platinum`. LOCKED: the **DB values win** (`free | starter | pro | elite | family`). All UI strings MUST migrate. The `tierColors`/`tier === "silver"` branches in `components/dashboard/parent/sidebar.tsx` are DEPRECATED.

---

## 10. FORBIDDEN patterns

The following MUST cause a code review reject:

1. **Direct `parental_approvals.status` flip without RPC cascade.** Setting `status='approved'` from anywhere (UI or API) without a corresponding call to the resource-specific action RPC (`parent_approve_session`, `parent_approve_ride`, `parent_approve_purchase`, `parent_approve_food_order`, `parent_approve_content`) is FORBIDDEN — see §5. The canonical pattern is server-side fan-out inside `/api/parent/approvals`.
2. **`service_role` on parent read surfaces.** Any `app/parent/**/page.tsx` or `app/api/parent/**/route.ts` that uses `createServiceRoleClient()` for a SELECT path is FORBIDDEN. The current `app/parent/food/page.tsx` is the violator (B2 §3.9). Money-bearing RPC writes are the ONLY permitted service-role usage on the parent surface (`top_up_teen`, `disburse_allowance`, `payout_chore_reward`, `verify_chore_completion`, `parent_approve_*` — invoked through `createServiceRoleClient().rpc(...)` from within an authenticated route handler, NOT from a page).
3. **`notifications` table writes.** The table does not exist canonically; writes silently fail or 500. Use `user_notifications`.
4. **`activity_logs` writes from any parent endpoint.** Delete the inserts; do not migrate them.
5. **CIN images via `getPublicUrl`.** Always signed URLs with TTL ≤ 5 min, against the private `parent-cin` bucket. See §6.
6. **Client-side mutations to money-adjacent tables.** `app/parent/grades/page.tsx` updates `teen_grades` directly from the browser, bypassing the server XP cascade. FORBIDDEN — all writes must go through `app/api/parent/grades` route.
7. **Client-supplied `parentId` / `bonus` / `coins` / `price` on `/api/parent/topup`.** Server derives `parentId` from session and computes coins from `amount_dh * 100`. Trusting client values is a money-pipeline risk.
8. **Hardcoded badge counts.** The sidebar's literal `2` Approbations badge MUST come from a server prop.
9. **`PARENTAL_APPROVAL_THRESHOLD_XP` in code paths that gate cash.** Threshold is in DH (`teen_budget_limits.per_event_limit` and a global `parental_approval_threshold_dh` setting). XP thresholds are FORBIDDEN.
10. **`maybeSingle()` replaced by `single()` on optional reads.** `app/api/parent/teens/search` uses `single()` and throws PGRST116 when no link exists. Use `maybeSingle()`.
11. **Two divergent code paths reading the same domain table** (the grades client-direct vs server endpoint pattern). One canonical endpoint per parent action.
12. **Granting EXECUTE on money RPCs to `PUBLIC` / `anon` / `authenticated`.** `disburse_allowance` and `complete_ride` are documented violators (audit-prelaunch §03). Money RPCs are `service_role` only.

---

## 11. MISSING (must be built before launch claims completeness)

| # | Surface | Owner |
|---|---|---|
| 1 | `/parent/teens/[id]` detail page | parent UI |
| 2 | `partner_blocklist` table + parent UI to block a driver / restaurant / partner | parent UI + DB |
| 3 | Configurable curfew per teen — `teen_curfew_settings { teen_id, weekday_start, weekday_end, weekend_start, weekend_end, timezone }`, replacing the hardcoded 22:00 in `app/api/cron/ride-curfew-check/route.ts` | DB + parent UI |
| 4 | Daily / weekly digest email — `parent_email_preferences { parent_id, digest_frequency, channels[] }` + cron + `lib/emails` template | DB + cron |
| 5 | Panic-suspend — `parent_panic_suspend(teen_id, reason)` RPC + UI button on teen detail | RPC + parent UI |
| 6 | Per-category budget caps — extend `teen_budget_limits` with `caps_by_category jsonb` (e.g. `{"food": 200, "marketplace": 100}`) and enforce in the spend RPC | DB + RPC + UI |
| 7 | Two-parent co-sign on money + consent — `parental_approvals.cosign_required boolean` + `parental_approval_cosigns(approval_id, parent_id, decided_at)` + the "both must approve" semantic in the cascade | DB + API |
| 8 | Parent-side data export — `/parent/teens/[id]/export-data` (PDF + JSON) reusing `app/api/me/data-export` patterns scoped to the linked teen | API + UI |
| 9 | Real-time link from a ride card to live tracking — `/parent/rides/[id]/live` deep-link from each ride row, replacing the standalone `/parent/live` only entry point | parent UI |
| 10 | QR / email / share teen-onboarding — replace the three "Bientôt" buttons in `add-teen-form.tsx` with shipped flows | parent UI + API |
| 11 | `parent_approve_ride` / `parent_approve_purchase` / `parent_approve_food_order` / `parent_approve_content` RPCs — only `parent_approve_session` exists today; without the others, the §5 cascade is half-built | DB |
| 12 | Approval expiry cron — auto-deny `parental_approvals WHERE status='pending' AND expires_at < now()` | cron |
| 13 | Reconciliation cron — daily integrity check over `coin_transactions` ↔ `user_coins.balance` | cron |
| 14 | `payment_transactions.client_idempotency_key` UNIQUE column + plumbing | DB + API |
| 15 | Parent-facing alert inbox — separate from `parental_approvals` (which is opt-in), surface curfew breaches, big purchases, budget overruns | DB + UI |
| 16 | Manual top-up screenshot upload widget — currently parents paste a bucket path | parent UI |
| 17 | PSP webhook handler for the auto top-up rail — wire after Cash Plus / CMI integration | API |
| 18 | Mark-as-read on `/parent/notifications` click — wire client-side mutation | parent UI |

---

## 12. UNRESOLVED founder decisions (recommendations bolded)

1. **Single-parent vs co-sign default for money decisions.**
   - Single-parent (status quo): any linked parent can top-up, approve, and verify alone. Frictionless, matches Moroccan single-payer-household norm.
   - Co-sign default: divorced/shared-custody safe; high-friction for normal families.
   - **RECOMMENDATION: ship single-parent default; expose a per-family `parents_cosign_required boolean` setting on `family_subscriptions` (or a new `parent_household` table) that any linked parent can flip on once. When `true`, any approval > 200 DH OR consent (e-signature renewal, photo consent) requires both linked parents to act.** Chores stay first-parent-wins regardless. This honours the Moroccan default without painting divorced families into a corner.

2. **Auto-topup ROI vs manual-only launch policy.**
   - Auto packages drive the headline parent-side conversion KPI, but no PSP is wired and the form is currently broken (E4 §3).
   - Manual-only is functional today, requires admin-side credit (latency hours, not seconds), and feels like a downgrade in a mobile-first world.
   - **RECOMMENDATION: launch with `PSP_AUTO_TOPUP_ENABLED=false`, hide the package UI, route 100% of top-ups through `/parent/topup/manual`. Ship Cash Plus integration in week +2 post-launch as the first auto rail, then flip the flag. The package UI can stay code-complete behind the flag — which means the broken form contract MUST still be fixed (per §9 DEPRECATED) so the flag flip is safe.**

3. **CIN bucket privacy — signed URL TTL.**
   - Parent self-view: shorter is safer (URLs leak via screenshots, browser history, support tickets).
   - Admin compliance review: longer TTL avoids re-signing during a multi-document KYC session.
   - **RECOMMENDATION: 5 minutes for parent self-view, 15 minutes for admin review (signed by `service_role` from `/admin/parents/[id]/cin`), absolute max TTL hardcoded at 30 minutes in a server constant. Rotate the bucket signing key quarterly. The bucket itself is `parent-cin` (private), never `documents`.**

---

## Cross-references

- `docs/canon/auth-onboarding.locked.md` — `auth.users` bootstrap requirement on `POST /api/parent/teens/create` (the `service_role.admin.createUser` step).
- `docs/canon/roles-permissions.locked.md` — `profiles.role='parent'`, `parent_teen_links` ownership.
- `docs/canon/lifestyle.locked.md` — chores/allowance/savings/rides/food/mentor surfaces; this doc owns the parent-side; lifestyle owns the teen-side.
- `docs/canon/routing.locked.md` — sidebar/dock entries; this doc is authoritative for parent-role nav.
- `docs/vision/audit-prelaunch/03-money-pipeline.md` — money RPC integrity (`top_up_teen`, `spend_teen_coins`, escrow ledger §29.4 invariant).
- `docs/vision/audit-prelaunch/07-security-compliance.md` — RLS posture for parent surface tables.
- `docs/vision/notifications.md` — `user_notifications` canonical table.
- `docs/vision/payment-rails-morocco.md` — PSP order (Cash Plus / CMI / Wafacash / M2T / Stripe).

---

## Contradictions flagged

1. **Whitepaper §29 vs `complete_ride` RPC.** The RPC uses 1 DH = 1 coin; whitepaper locks 100 coins/DH. Money-pipeline audit P0 #1. Resolved direction: rate is locked at 100; the RPC must be rewritten.
2. **Whitepaper §10 (multi-parent verification) vs current chore implementation.** Whitepaper implies "multi-parent" generally; chore code locks first-parent-wins. Resolved direction here: first-parent-wins on chores; co-sign opt-in elsewhere (see §12.1).
3. **Sidebar tier vocabulary (`silver | gold | platinum`) vs DB enum (`starter | pro | elite | family`).** Resolved: DB wins, UI migrates.
4. **`parental-authorizations.md` field name (`type`, `amount_dh`, `booking_id`) vs `parental_approvals` canonical schema (`action_type`, `amount`, `resource_id`).** Resolved: canonical schema wins; the legacy `payments/hybrid` writer is DEPRECATED (§9).
5. **`parent-control.md` (older) describes `e_signatures` / `parental_approvals` / `teen_budget_limits` as missing tables.** They now exist (Wave 2/3 migrations). The audit lag is benign; this canon supersedes.
6. **E4 (`approvals` page reads `approval_type`) vs `/api/parent/approvals` (writes/reads `action_type`).** Page is broken — every approval card shows the default icon. Resolved direction: page MUST migrate to `action_type` (canonical column).
7. **`parent-control.md` recommends CIN private bucket with signed URLs; `app/api/parent/e-signature/create/route.ts` uses `getPublicUrl` on `documents`.** Resolved: §6 LOCKED — private `parent-cin` bucket, signed URLs only, 5-min parent / 15-min admin TTL.
