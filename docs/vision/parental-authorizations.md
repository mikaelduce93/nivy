# Parental Authorizations — Vision Audit

> Read-only audit. Working dir: `C:\Users\Shadow\Desktop\NIVY`. Supabase project: `imchornjvmgmaovhypco`. Audited 2026-05-07.

Parental authorizations are the **per-action consent layer** of Nivy. They are conceptually and operationally **distinct from the one-time e-signature CGU gate** (covered in `docs/vision/parent-control.md`). The e-signature establishes the legal capacity of a parent to use the platform on behalf of a minor; authorizations are the day-to-day decisions: "yes, my teen may book this event", "yes, this 250 DH purchase is approved", "yes, my teen may meet this coach next Tuesday", "yes, my teen may join this crew at this partner location".

---

## 1. Vision (intended)

A parental authorization in Nivy is **scoped, logged, time-bound, and individually actionable**. The founder's intent is that any high-stakes teen action passes through an explicit parental decision recorded in a tamper-evident ledger, with notification fan-out to the parent (push first, SMS / email as fallback), and a deterministic outcome if the parent is silent.

Authorization triggers (intended scope):

- **Booking authorization**: a teen reserves a paid event/venue → parent approves before the slot is held.
- **Coach / teacher / mentor meeting**: any 1:1 with an adult requires parental sign-off, with the meeting context (who, where, when, why) shown in the request.
- **Purchase authorization**: hybrid XP+DH payments above a threshold (today `PARENTAL_APPROVAL_THRESHOLD_XP = 1000` ≈ 100 DH, see `lib/payments/xp-converter.ts:13`) require parent approval before the cash leg fires.
- **Crew / partner-location authorization**: joining a crew flagged `requires_approval = true` (column exists on `crews`, see DB section) or visiting a partner location.

Each authorization is a **first-class record** with: requester (teen), responder (parent), type, target resource (booking/payment/meeting/crew), description, optional amount, status (`pending`/`approved`/`rejected`/`expired`), `expires_at`, `responded_at`, `rejection_reason`, and an immutable audit trail entry.

The relationship to the e-signature is a **soft prerequisite UX**, not a hard schema constraint: the approvals page (`app/parent/approvals/page.tsx:23-33`, `:168-197`) shows a banner steering unsigned parents to `/parent/e-signature` before validating "sorties, paiements, consentements photo", but the API route does not actually block the decision on signature presence.

---

## 2. Code state (what exists)

Real product surfaces today:

- **Parent queue UI**: `app/parent/approvals/page.tsx` reads from `parental_approvals` joined to `profiles` as `teen`, splits into pending/approved/rejected, renders icons per `approval_type` (`booking`, `purchase`, `payment`, `event`).
- **Decision API**: `app/api/parent/approvals/route.ts` accepts `{ approvalId, action: "approve"|"reject", reason }`, updates the row, then conditionally cascades:
  - `approval_type === "booking"` → updates `bookings.status` + `bookings.parent_approval_status`.
  - `approval_type === "event_booking"` → updates `event_bookings.status`.
  - Inserts into `notifications` (in-app) and `activity_logs`.
- **Authorization creation (purchase)**: `app/api/payments/hybrid/route.ts:118-159` creates a `parental_approvals` row when `paymentResult.requiresParentalApproval && profile?.role === "teen"`, with `type: "xp_payment"`, `amount`, `amount_dh`, `booking_id`. Note the **field-name mismatch**: writer uses `type`, reader (`page.tsx`) uses `approval_type`.
- **Teen-side waiting state**: `app/teen/shop/checkout/checkout-client.tsx:166-194` renders the "Approbation parentale requise" card with the approval id.
- **Decision component**: `components/parent/approval-buttons.tsx` (used at `page.tsx:305`) and the swipe-gesture list `components/parent/parental-approval-list.tsx`.
- **Threshold logic**: `lib/payments/xp-converter.ts` defines `PARENTAL_APPROVAL_THRESHOLD_XP = 1000` and `MIN_XP_FOR_PAYMENT = 50`.

There is **no** `lib/parental/` module — authorization business logic is inlined ad-hoc inside the payment route and the parent decision route. There is no helper such as `requireParentalApproval(teenId, action, context)` — searched grep returned only doc references.

Notification mechanism in code: in-app rows only, written to a table named `notifications`. No Twilio SMS, no FCM/APNs push, no transactional email is wired to the approval flow. (Twilio appears in `.env.example` and registration paths only.)

Expiry: **no `expires_at` is ever written**, no cron sweeps, no auto-deny. A pending approval lives forever until manually decided.

---

## 3. DB state (what actually exists)

Live introspection of project `imchornjvmgmaovhypco` (`information_schema` queries):

- `parental_approvals` — **DOES NOT EXIST**. Search for tables matching `%approv%` returned only `auth.oauth_authorizations` and `auth.oauth_consents`.
- `e_signatures` — **DOES NOT EXIST** (queried explicitly, not present in `public`).
- `notifications` — **DOES NOT EXIST**; the actual notification tables are `user_notifications`, `notification_preferences`, `notification_templates`, `notification_triggers`, `notification_analytics`.
- `activity_logs` — **DOES NOT EXIST**.
- `event_bookings` — **DOES NOT EXIST** (only `bookings` exists).
- Approval-adjacent columns that DO exist: `crews.requires_approval` (boolean) and `payment_requests.approval_token`. That is the entire DB-level surface.

Direct consequence: **every code path described in §2 is broken at runtime.** The approval queue page returns `[]` from a silent error log, the hybrid payment route fails its `INSERT INTO parental_approvals`, and the parent decision route 404s.

---

## 4. Gaps (vision ↔ code ↔ DB)

1. **Phantom schema** — No `parental_approvals`, `e_signatures`, `notifications`, `activity_logs`, or `event_bookings` table exists. The whole authorization story is non-functional today.
2. **Field-name drift** — Writer (`payments/hybrid`) uses `type`, `amount_dh`, `booking_id`. Reader (`parent/approvals/page.tsx`) reads `approval_type`, `amount`, `resource_id`, `title`, `description`. Even if the table existed, the records would not display correctly.
3. **Notification table mismatch** — Code writes to `notifications`; only `user_notifications` exists.
4. **No `lib/parental/` module** — authorization gating is duplicated ad-hoc; the founder's intent of a unified `requireParentalApproval(action)` helper is unimplemented.
5. **Out-of-band channels missing** — push, SMS, email for authorization requests are not wired. Parents only see requests if they happen to open the dashboard.
6. **No expiry / no timeout policy** — pending requests never auto-resolve. A teen waiting on an event slot can be silently blocked indefinitely.
7. **E-signature ↔ authorization coupling unclear** — UI gates softly, API does not enforce; founder vision is "distinct" but the banner conflates them.
8. **No coach-meeting / partner-location flows at all** — only `booking`, `event_booking`, `xp_payment` types are emitted. Crew join uses `crews.requires_approval` but no row is created in any approval table.
9. **No multi-parent / co-parent semantics** — the writer hardcodes `parent_id: booking.parent_id` (single owner). No model for "second parent must also approve".

---

## 5. Risks

- **Silent product failure** — the entire teen → parent gating chain will throw at the first attempt, with errors only in `console.error`. A demo will look like "nothing happens" to both teen and parent.
- **Compliance exposure (Morocco / GDPR analog)** — claiming "parental authorization" in product copy while having no persistent audit trail is a legal liability for a minors-platform.
- **Payment-state drift** — the hybrid payment route deducts XP and updates `bookings` rows even though the approval insert failed (no transaction). Teens can lose XP on requests that never reached their parent.
- **Trust erosion** — parents shown a "Sign now to validate requests" banner, then never see any request, will conclude the product is broken.
- **Cascading test breakage** — the new Playwright auth fixture (recent commits `c3ab80e`, `b90eaaa`) signs in real parents; any e2e that exercises the approvals page hits empty state forever.

---

## 6. Open questions (for founder)

- **Co-parenting**: is a single approving parent sufficient, or do divorced / shared-custody families need both legal guardians to approve? If both, what is the conflict-resolution rule (last-decision-wins, unanimous-only, primary-overrides)?
- **Standing orders vs single-use**: should an authorization expire the moment the action is performed (single-use), or persist as a "standing order" (e.g. "always allow this coach", "always allow purchases under 50 DH")?
- **Timeout policy**: if the parent does not respond within X hours, do we auto-deny (safe default), auto-approve below a threshold, or escalate to SMS/voice call? What is X for events (often time-sensitive) vs purchases (less so)?
- **Authorization scope granularity**: per-recipient (a specific coach), per-venue (a specific partner), per-amount (any purchase ≤ N DH), per-time-window (next 7 days), or per-action (one-shot)? Which combinations are first-class?
- **Relationship to e-signature**: hard prerequisite (cannot create any authorization request until CGU signed) or independent (CGU only required for first cash payment)?
- **Notification channel matrix**: which event types fan out to which channels? Is push always primary with SMS as backup, or does the parent choose?
- **Revocation**: can a parent revoke an already-approved standing authorization, and what happens to actions in flight (e.g. event already paid)?
- **Partner / coach side**: does the partner see a "approval pending" badge on the booking, or only confirmed/cancelled?

---

## Cited paths

- `app/parent/approvals/page.tsx`
- `app/api/parent/approvals/route.ts`
- `app/api/payments/hybrid/route.ts`
- `app/teen/shop/checkout/checkout-client.tsx`
- `lib/payments/xp-converter.ts`
- `components/parent/parental-approval-list.tsx`
- `components/parent/approval-buttons.tsx` (referenced)
- `docs/vision/parent-control.md` (e-signature counterpart)

## DB searches reported

- `information_schema.tables` filtered on `%approv%|%authoriz%|%consent%|%signature%` → only `auth.oauth_authorizations`, `auth.oauth_consents`.
- `information_schema.columns` filtered on `%approval%|%authoriz%|%consent%` in `public` → `crews.requires_approval`, `payment_requests.approval_token`.
- Existence check for `parental_approvals, e_signatures, notifications, activity_logs, event_bookings, bookings, crews` → only `bookings` and `crews` exist.
- Notification-related listing → actual tables are `user_notifications`, `notification_preferences`, `notification_templates`, `notification_triggers`, `notification_analytics` (not `notifications`).
