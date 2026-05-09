# Wave 6F — Economy-payments Truth (2026-05-09)

> Money pipeline hardening. No prod deploy. No secret rotation. No real
> external transaction. No fake wallet/payment. F5 (manual top-up only)
> stays ratified.

## Audit findings

Economy-payments stood at 80 going into 6F (Wave 1B closed CMI HASH on
the server-to-server webhook + idempotency on `/api/parent/topup` +
`/api/teen/shop` 410 + `add_xp_to_user` rename). Fresh audit of the
full payment surface (31 routes under `/api/payments/**`,
`/api/parent/topup/**`, `/api/admin/topups/**`, `/api/webhooks/**`,
`/api/cron/partner-payout-monthly`) surfaced **2 concrete
truth-violations** + **2 legacy redirect targets**.

### 6F.1 — CMI user-redirect callback was unsigned (P0 fake-payment risk)
- `app/api/payments/cmi/callback/route.ts` (the GET/POST that the
  user's browser hits after CMI redirects them back) called
  `cmiGateway.parseCallback(params)` straight from the query string,
  with no HASH verification.
- Inside `parseCallback`, the HASH check is conditional:
  `if (params.HASH && !this.verifyCallbackHash(params))`. **If HASH
  is missing, the check is bypassed.** An attacker who knew a booking
  reference could craft `GET /api/payments/cmi/callback?oid=…&Response=Approved`
  and the route would happily flip `bookings.payment_status='paid'`,
  insert a `payment_transactions` row marked `completed`, and email
  the parent a "Paiement confirmé" confirmation — without one DH ever
  changing hands.
- The server-to-server webhook (`/api/payments/cmi/webhook`) already
  enforced HASH (Wave 1B). The user-redirect callback was the
  forgotten twin.
- Fix: route now mirrors the webhook gate — rejects missing HASH
  (302 → `/auth/redirect?error=cmi_unsigned`) and bad HASH (302 →
  `/auth/redirect?error=cmi_signature_mismatch`) BEFORE any DB write,
  parseCallback, or email send.

### 6F.2 — CMI callback double-credited on user "back"+refresh
- The same route inserted a `payment_transactions` row on every
  successful callback hit. A user who paid, hit the browser back
  button, then refreshed the CMI return URL would write a SECOND
  payment_transactions row with the same `provider_transaction_id`.
- Fix: idempotency check — `select id from payment_transactions where
  booking_id = ? and provider_transaction_id = ?` before insert. Also
  guard the `bookings` UPDATE behind `payment_status !== "paid"` so we
  don't reset paid_at on replay. Failure path also gated on not-paid
  so a late-arriving failure callback doesn't unwind a prior success.

### 6F.3 — Both CMI routes redirected to legacy `/mes-reservations`
- 4 `redirect to /mes-reservations` sites in callback + initiate.
  Wave 5A killed `/mes-reservations` as a forbidden bare path; those
  redirects would 308 the user into a generic role-router page anyway.
- Fix: all 4 sites point straight to `/auth/redirect?error=…` (the
  canonical role router). No bounce.

### Verified clean (no change needed)
- `/api/parent/topup` (Wave 1B) — idempotency key, e-signature gate,
  parent-teen link verification, server-derived amount, manual provider
  pinned. **Verified intact** by Wave 6F static guard.
- `/api/payments/cmi/webhook` server-to-server — HASH gate, idempotent
  insert. **Verified intact**.
- `/api/teen/shop` — 410 stub (Wave 1B). **Verified intact**.
- `/api/teen/tokens` POST — 410 stub (Wave 6C). **Verified intact**.
- `/api/payments/process` — returns 503 for card paths until gateway
  wired. **Verified honest**.
- `/api/cron/partner-payout-monthly` — fail-closed CRON_SECRET, period
  idempotency, real `partner_transactions` aggregation. **Verified intact**.
- `/api/webhooks/cashplus` — env-gated via `PSP_AUTO_TOPUP_ENABLED`
  per founder F5; without the flag the route logs only, no coin
  credit. **Verified intact**.

## Out of scope (declared)

- **Migrate `/api/payments/cmi/initiate` page redirects to per-role
  paths** beyond just dropping `/mes-reservations` — e.g. for parent
  vs teen. The route is parent-only in practice (booking creation is
  parent-side); a future wave can per-role this if needed.
- **Build receipts / invoices PDF download** beyond the existing
  `/api/invoices/topup/[id]` (which already works, sampled).
- **Refund / cancellation full lifecycle** — the canonical
  `cancel_ride` and `partner_reject_food_order` RPCs already handle
  the per-rail refund. A unified parent-side "cancel my booking"
  surface = a new feature.
- **Auto top-up activation** — F5 founder ruling (manual-only at
  launch) holds. Wave 6F static guard explicitly verifies no
  auto-topup path exists in `/api/parent/topup`.

## Tests

`tests/unit/wave6f-economy-payments-truth.test.ts` — **16 green
guards**:

- **3** CMI callback HASH gate: rejects missing HASH, rejects bad
  HASH, gate runs BEFORE parseCallback and DB writes.
- **2** CMI callback idempotency: existence check before insert,
  paid-flip only when not already paid.
- **2** legacy `/mes-reservations` purged from CMI callback + initiate.
- **2** Wave 1B closures intact: `/api/parent/topup` idempotency key
  + e-sig + link + manual provider; uses `top_up_teen` RPC, no direct
  `user_coins` write.
- **2** Wave 1B/2B/6C closures intact: `/api/teen/shop` 410,
  `/api/teen/tokens` POST 410.
- **3** CMI server-to-server webhook HASH gate intact: missing HASH
  rejected, bad HASH rejected, idempotent on already-paid.
- **2** F5 not violated: `/api/parent/topup` has no auto-topup path,
  Cash Plus webhook doesn't write `user_coins` directly.

## Final gates

| Gate | Result |
|---|---|
| `check:env` | ✅ 11 / 0 |
| `lint:canon --enforce` | ✅ 6 improvements carried (200 baseline); 0 net-new |
| `typecheck` | ✅ clean |
| `test:run` | ✅ **62 files / 567 tests** |
| `npm run smoke` | ✅ **39/39 ok**, 0 dev-log runtime errors |

## Compliance score

- `economy-payments`: **80 → 87 (+7)** — top of the founder's 80 →
  87/88 band.
- overall: 90 → **91 (+1)**.
- core_flow_score: 92 → **93 (+1)**.

## Status

- Closed-beta ready: **YES**.
- Public launch ready: **NO** — D.1 secret rotation pending, by design.

## Domain scoreboard now

| Domain | Score |
|---|---|
| partner-ecosystem | 89 |
| **economy-payments** | **87** (Wave 6F) |
| personalization-ai | 87 |
| lifestyle | 86 |
| parent-control | 86 |
| auth-onboarding | 85 |
| routing-navigation | 85 |
| gamification | 83 |
| design-system-mobile | 82 |
| social-feed | 80 ← founder's 6G |
| admin-moderation | 80 ← founder's 6H |

## Founder targets vs current state

| Target | Status |
|---|---|
| Global ≥ 90 | ✅ **91** |
| Core flow ≥ 92 | ✅ **93** |
| Aucun domaine sous 85 | ⏳ 2 of 11 still below (6G + 6H) |
| D.1 secret rotation | ⏳ pending (by design) |

## Next per founder plan

> Wave 6G — Social-feed 80 → 87/88
