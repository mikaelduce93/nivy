# Parent Control — Vision vs. Reality Audit

Read-only audit of Nivy's parent control surface. Source-of-truth = code under `app/parent/`, `app/api/parent/`, `components/parent/` plus the live Supabase project `imchornjvmgmaovhypco` (nivy, eu-central-1, Postgres 17).

---

## 1. Vision (intended product)

A Moroccan parent (rôle `parent`) signs up, links one or more teens (13–17), provides a CNDP/loi 09-08 compliant e-signature with CIN scans, then becomes the financial sponsor: tops up the teen's coin wallet in DH, sets monthly/per-event ceilings, approves sensitive bookings, follows live activity, and earns top-up discounts based on a Free / Silver / Gold / Platinum subscription tier.

## 2. What actually ships in code

The parent surface is the most-built role. Pages exist for: dashboard (`app/parent/page.tsx`), teen management (`app/parent/teens/page.tsx`, `app/parent/teens/add`), e-signature gate (`app/parent/e-signature/page.tsx`), top-up (`app/parent/topup/page.tsx`), budget (`app/parent/budget/page.tsx`), approvals queue (`app/parent/approvals/page.tsx`), spend history (`app/parent/history/page.tsx`), live monitoring (`app/parent/live/`), grades (`app/parent/grades/`), notifications, settings, documents, events. APIs cover the CRUD: `app/api/parent/topup/route.ts`, `app/api/parent/teens/route.ts` + `teens/create/route.ts` + `teens/search/`, `app/api/parent/budget/route.ts`, `app/api/parent/approvals/route.ts`, `app/api/parent/booking-approvals/` (empty dir — placeholder), `app/api/parent/e-signature/create/route.ts`, `app/api/parent/e-signature/status/route.ts`, plus `export-pdf`, `grades`, `insights`, `live`. Components: `components/parent/e-signature-client.tsx`, `topup-form.tsx`, `add-teen-form.tsx`, `budget-limit-form.tsx`, `approval-buttons.tsx`, `parental-approval-list.tsx`, `sponsor-challenge-form.tsx`, `transaction-filters.tsx`, `dashboard/*`. The teen-side validation flow lives at `app/auth/validate-teen/page.tsx` — token-based magic link rather than a numeric pairing code.

## 3. Database reality (live nivy project, 2026-05-07)

What exists in `public`:
- **`parent_teen_links`** — minimal: `id, parent_id, teen_id, created_at`. RLS enabled, single SELECT policy: `parent_id = auth.uid() OR teen_id = auth.uid()`. **No `status` column** despite code in `app/api/parent/topup/route.ts:42` and `app/api/parent/teens/route.ts:59` filtering on `status='active'`/`'pending'`/`'approved'`. **No INSERT/UPDATE/DELETE policy** — server-side inserts will fail under RLS unless service-role is used. 1 row currently linking parent `69a068cd…` to teen `37ff4a09…`.
- **`parent_teens_overview`** view — joins `parent_teen_links → teens → profiles → user_xp → user_coins`, exposing `teen_name, pseudo, avatar_url, total_xp, level, coins, linked_at`. Used by every parent page for teen lists.
- **`coin_transactions`** — present but schema is `id, teen_id, amount, transaction_type, source_type, source_id, description, balance_after, created_at`. **No `user_id` or `source_user_id` column** — the top-up handler `app/api/parent/topup/route.ts:108-124` writes to `user_id`/`source_user_id`, which will silently fail or error. 0 rows currently.
- **`family_subscriptions`** — `id, subscription_id, owner_id, max_members, family_name, created_at`. No tier/discount column directly; tier comes from `subscription_plans` (5 plans exist: `free, starter, pro, elite, family` — no Silver/Gold/Platinum naming). 0 rows.
- **`subscription_plans`**, **`user_subscriptions`**, **`subscription_payments`**, **`payment_requests`**, **`family_members`** — exist but unused by any parent endpoint reviewed.

What does **NOT** exist (referenced by code but absent from DB):
- `e_signatures` — referenced by `app/api/parent/e-signature/create/route.ts:34,101`, `…/status/route.ts:30`, `app/parent/e-signature/page.tsx:13`, `app/parent/topup/page.tsx:42`, and the gate in `app/api/parent/topup/route.ts:53`.
- `parental_approvals` — referenced by `app/parent/page.tsx:65` and `app/api/parent/approvals/route.ts:30,55`.
- `teen_budget_limits` — referenced by `app/parent/page.tsx:43` and `app/api/parent/budget/route.ts:44,61,80,170,184`.
- `documents`, `notifications`, `activity_logs`, `event_bookings` — also missing or unverified.

This means the entire parent control runtime currently throws on any real call: the e-signature gate, top-ups, budget edits, and approval actions all hit non-existent tables.

## 4. Specific behaviors

- **E-signature gate**: enforced server-side in `app/api/parent/topup/route.ts:52-69` (returns 403 with `requiresSignature: true` when no row in `e_signatures` with `terms_accepted=true`). Also rendered visually on `app/parent/topup/page.tsx:99` (`hasSigned`) and `app/parent/e-signature/page.tsx:35`. **Both layers** check, but the table doesn't exist yet → every gate currently denies. Storage bucket `documents` is used for CIN front/back uploads.
- **Linking flow**: two paths. (a) Parent creates teen in-app via `POST /api/parent/teens/create` — generates a `TEEN<8 hex>` linking_code on `profiles`, creates an immediately-approved link. (b) Existing teen claims via email magic-link token at `app/auth/validate-teen/page.tsx` (token in URL, parent must be logged in to approve). No numeric short-code UX. `POST /api/parent/teens` also supports a third path: parent searches for a teen and posts a `pending` link request that notifies the teen.
- **Approval flow**: `parental_approvals` table has columns implied by code: `parent_id, teen_id, status, approval_type ('booking'|'event_booking'), resource_id, title, rejection_reason, responded_at`. On approve, the matching `bookings.status` flips to `confirmed` and `parent_approval_status` is set. Queue surfaced on `app/parent/page.tsx:124` and `app/parent/approvals/page.tsx`. No table → queue is always empty.
- **Ceilings**: `teen_budget_limits` is intended to hold `monthly_limit, per_event_limit, requires_approval` per teen, set via `POST /api/parent/budget`. **No DB-level enforcement** observed — there is no trigger or RPC that blocks a booking when a teen exceeds `monthly_limit`. The dashboard hard-codes `500 DH /mois` in JSX (`app/parent/page.tsx:165`). Currently pure UX intent + a missing table.
- **Subscription tier discount on top-up**: not implemented anywhere. `app/api/parent/topup/route.ts` accepts the price as posted by the client and never reads `family_subscriptions` or `subscription_plans`. Discount is a vision-only concept.
- **RLS on cross-parent isolation**: `parent_teen_links` only has a SELECT policy; relies on `auth.uid()`. No table-level RLS was inspected for the missing tables (they don't exist). The view `parent_teens_overview` inherits security from the underlying tables, so a parent should only see their own links — but the absence of write policies and the use of `getUserRole().profileId` (server-side, trusted) means most enforcement is application-layer, not DB-layer.

## 5. Open questions for founder

- **Ceilings model**: should `monthly_limit` and `per_event_limit` be hard-coded by subscription tier (e.g. Free = 200 DH/mo cap), per-family configurable, or a hybrid (tier sets max, parent dials lower)?
- **Approval notifications**: when a `parental_approvals` row is created, what wakes the parent? In-app only, push (Web Push subs exist via `push_subscriptions`), email (Resend already configured per `docs/RESEND_CONFIGURATION.md`), or SMS? Time-to-decision SLA?
- **Linking cardinality**: schema currently allows N parents ↔ N teens (no unique constraint on `(parent_id, teen_id)` was confirmed, and no exclusivity). Confirmed intent for divorced-parent / co-parenting case? Should the e-signature be required from each linked parent or only one?
- **Spending visibility cadence**: real-time push on each booking, daily digest, or just on-demand dashboard refresh? Currently the dashboard reads on every page load (no realtime channel subscribed).
- **Tier naming**: code/db uses Free/Starter/Pro/Elite/Family. Vision says Free/Silver/Gold/Platinum. Which wins?
- **CIN storage**: CIN images go into the public `documents` storage bucket via `getPublicUrl` (`app/api/parent/e-signature/create/route.ts:84`). For CNDP this should be a private bucket with signed URLs — confirm policy.

## 6. Recommended next actions (audit findings, no changes made)

1. Create the three missing tables (`e_signatures`, `parental_approvals`, `teen_budget_limits`) plus add the `status` column to `parent_teen_links` and align `coin_transactions` schema (`user_id`, `source_user_id`) with handler code — the parent surface is currently non-functional end-to-end against live DB.
2. Add RLS write policies on `parent_teen_links` and the new tables; today only a SELECT policy exists.
3. Reconcile subscription tier vocabulary (Silver/Gold/Platinum vs. Starter/Pro/Elite/Family) and wire the discount calculation into the top-up handler.
4. Move CIN documents to a private bucket; today they are fetched with `getPublicUrl`.
5. Implement at least one notification channel for the approvals queue.
