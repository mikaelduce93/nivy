# E5 — Partner Flows: signup → KYC → first offer → scanner → payouts

Read-only audit. Tracing the full prospect-to-cash partner journey. All paths are absolute references on disk; line numbers are approximate.

---

## 1. Public discovery (prospect-facing)

| Route | File | What it does |
|---|---|---|
| `/devenir-partenaire` | `app/devenir-partenaire/page.tsx` | Marketing landing. 4 partner-type cards (retail / venue / club / education). Both CTAs route to `/devenir-partenaire/inscription`. |
| `/devenir-partenaire/inscription` | `app/devenir-partenaire/inscription/page.tsx` | Two-step shell: type selection → typed form. Renders one of 4 multi-step forms from `components/partners/`. |
| `/partenaires/merci` | `app/partenaires/merci/page.tsx` | Generic thank-you. Reference number is generated **client-side** (`crypto.randomUUID`) post-mount — it is *not* persisted, *not* an actual application ID; pure UI affordance. Lists `partners@example.com` and `+212 XXX-XXXXXX` as contact (placeholder values). |
| `/partenaires/...` | (no other pages) | There is **no** `/partenaires` directory page (the marketing page is at `/devenir-partenaire` instead). Only `/partenaires/merci` exists. The CTA "Voir nos partenaires" on the landing page links back to `/devenir-partenaire` (broken UX — the link is a self-reference). |

There is also `app/devenir-influenceur/` and `app/devenir-ambassadeur/` for sibling acquisition flows but they are out of scope here.

---

## 2. Signup — how does a prospect register?

**Two parallel, disconnected flows.** The audit reveals these never converge.

### 2a. The prospect-form path (used by `/devenir-partenaire/inscription`)

- Client form component (e.g. `components/partners/RetailPartnerForm.tsx`) collects company info, contacts, locations, and proposed discounts in 4 steps.
- On submit it `POST`s to `/api/partners/register` (`app/api/partners/register/route.ts`).
- The API route inserts into `partners` (status `pending`), then dispatches to a per-type handler that inserts into `partner_locations`, `partner_venues`, `venue_menu_items`, `venue_event_packages`, `partner_clubs`, `club_offerings`, or `partner_discounts` (with `is_active=false`).
- **No `auth.users` row is created.** No password is set. No Supabase magic link is triggered. No invite email is sent (the route returns success and that is it).
- The thank-you page then says "vous recevrez vos identifiants" — but no code path actually generates or sends any credential. This is a manual handoff at best.

### 2b. The generic `/auth/sign-up` path

- `app/auth/sign-up/page.tsx` runs `supabase.auth.signUp()` with no role selector.
- A user signed up here lands on `/auth/sign-up-success`, with no association to any `partners` row.
- Partner attribution at runtime is by **email match** (`partners.email = auth.users.email`) — see `lib/auth/get-user-role.ts` usage throughout `app/partner/**`. This means: a user who signed up via 2b *and* has a matching `partners.email` row from 2a becomes a partner. Otherwise they become a regular user.

**What actually has to happen to log in as a partner**: someone (admin? ops?) must (a) approve the `partners` row, (b) ensure an `auth.users` row exists with the same email — currently un-scripted in the codebase. The two flows are **stitched together by an out-of-band manual step that has no UI**.

The dead-end is real: a prospect who fills 2a in isolation cannot log in. There is no partner-specific sign-up form (with password / magic link) in the codebase.

---

## 3. KYC flow — real or mock?

Read at `app/partner/kyc/page.tsx` and `app/api/admin/partners/[id]/approve/route.ts`.

### What exists
- Server table `kyc_documents` (per migrations) with columns `partner_id, doc_type, file_path, status, rejection_reason, reviewed_by, reviewed_at`. Doc types include `rc, ice, patente, cin, rib, statuts, pouvoir, passport, attestation`.
- Storage bucket `kyc-documents` (private). Signed URLs for partner viewing are issued at 15-minute TTL.
- Partner-side page (`/partner/kyc`) is **read-only**. It lists docs that already exist for the partner, shows a status badge per doc, displays rejection reasons, and links to support if rejected.
- Admin-side `POST /api/admin/partners/:id/approve` flips `partners.status = 'active'` and `kyc_documents.status = 'approved'` for all docs, and writes to `admin_audit_logs`.

### What does **not** exist
- **No client-side upload UI for partners.** The page header comment is explicit: *"No client-side upload is wired here — the onboarding upload flow lives elsewhere."* But there is no "elsewhere": grepping the partner subtree finds no `kyc-documents` storage `upload`/`createSignedUploadUrl` call. The only similar pattern (`/api/teen/evidence/sign-upload`) is for teen evidence, not partner KYC.
- The admin approval route presumes docs are already in the table — there is **no documented ingestion pipeline**. Either docs are uploaded out of band by ops, or the flow has never been exercised end-to-end.
- Partner registration form (`/devenir-partenaire/inscription`) does **not** include any file inputs for KYC. The wizard ends without ever prompting for RC, ICE, RIB, etc.

### Verdict
The partner KYC pipeline is **half-real**: storage bucket + DB table + admin approval logic exist; the partner-facing capture UI is entirely missing. Partners get a "Compléter mon KYC" CTA on the awaiting-approval screen (`components/dashboard/partner/awaiting-approval.tsx`) that lands on the read-only viewer — clicking it reveals nothing to do.

---

## 4. Offer creation flow

Files: `app/partner/offers/new/page.tsx`, `app/partner/offers/page.tsx`, `app/partner/offers/[id]/edit/page.tsx`, `app/api/partner/offers/route.ts`.

### Validation
- **Client-side**: `react-hook-form` + zod (`offerSchema`). Validates name length (2–120), description length (≤2000), discount value numeric & ≤100 if percentage, `validUntil >= validFrom`, etc. Inline errors on blur.
- **Server-side** (`POST /api/partner/offers`): re-validates name presence, discount value > 0, valid_from < valid_until. Tag closed-set validation against `interest_taxonomy` (max 5 tags). Looks robust.

### Submit / approval workflow
- Inserts straight into `partner_offers` with `is_active: true`. **There is no admin moderation step for offers.** The success screen literally says *"Votre offre est maintenant active pour les membres Nivy"* — no "pending review" state.
- Contrast with the registration handlers (`/api/partners/register`), which deliberately set `is_active: false` for proposed discounts. So the *first* offers (submitted via the prospect form) are inert until manual activation, but every offer created later via `/partner/offers/new` is auto-live. **Inconsistent gating.**
- The Edit page (`/partner/offers/[id]/edit`) reads from `partner_offers` and renders an "OfferEditForm" component (`components/partner/offer-edit-form.tsx`). Note `app/partner/offers/page.tsx` carries a TODO acknowledging the PATCH/DELETE endpoints expect a different payload shape than the canonical column names — i.e. the edit-write contract is **partially broken**.

### Preview
- **None.** No "Preview as teen" view, no card preview before submit. The user just submits and sees a success card.

### Listing
- `/partner/offers` — server-rendered list off `partner_offers` filtered by `partner_id`. Wraps reads in try/catch to degrade to an inline error banner. Inline toggle / delete are explicitly TODO'd.

---

## 5. Scanner flow

Files: `app/partner/scanner/page.tsx`, `components/qr-scanner.tsx`, `app/api/partner/verify-card/route.ts`, `app/api/partner/apply-discount/route.ts`, `app/api/partner/challenges/[id]/check-in/route.ts`.

### Scanner UI
- Real camera scanner via **`html5-qrcode`** (off-the-shelf — `Html5Qrcode` from `html5-qrcode` package). Includes camera switch (front/back), zoom, flashlight controls. Manual code entry fallback (`TPVIP-XXXX-XXXX` masked input).
- A second component exists: `components/partner/universal-scanner.tsx` — likely a richer alternative; not used by the current `/partner/scanner` page.

### QR payload format
- Format: `TPVIP:userId:cardNumber` or just `cardNumber`. Parsed naively by string `split(":")` — the route in `verify-card/route.ts` only uses `parts[2]` (cardNumber). The userId in the QR is **ignored** — the lookup is by card number alone.
- **No signature, no JTI, no nonce, no timestamp.** A QR is a static identifier. Anyone who photographs/screenshots a member's VIP card can replay it indefinitely. Search confirms: no occurrences of `nonce`, `jti`, or QR signature/JWS verification anywhere in the partner subtree.

### Double-spend prevention
- **Effectively none.** `apply-discount/route.ts`:
  - Checks `max_total_uses` against `current_total_uses` (cumulative, not idempotent — concurrent calls can both pass the check before either increments).
  - Checks `max_uses_per_user` via `discount_usage` count — **but** the table is queried inside a `try/catch` and silently skipped if missing/RLS-blocked: *"discount_usage missing — skip the per-user cap silently rather than block the apply flow."* That's permissive-by-default.
  - The `current_total_uses` increment is a non-atomic read-modify-write (`(offer.current_total_uses || 0) + 1`) — race-prone.
  - No idempotency key / request UUID on the API. A double-click on "Appliquer" can credit twice.
- Comment in `verify-card/route.ts` literally says *"discount_usage may not exist in every environment"* — the code is built to tolerate the absence of the very table that prevents abuse.

### Real or mocked
- The scan → verify-card → apply-discount path is **real wiring**. It hits Supabase, increments counters, writes `discount_usage`, awards XP via `add_user_xp` RPC, and increments `points_transactions` / `user_points`. Best-effort try/catch wraps several side-effects.
- The challenge check-in alternate path (`/api/partner/challenges/[id]/check-in`) is also real — branches from scanner if `offer_type === 'challenge'`.

### Summary
Scanner UI is production-grade; the **security model** behind it (anti-replay, idempotency, atomic counters) is missing.

---

## 6. Payouts, transactions, invoices

### `/partner/transactions` — `app/partner/transactions/page.tsx`
- Real read off `partner_transactions` (per-row Teen scan/redemption ledger). Filters by `partner_id`. Renders KPI strip (this month) + last-50 rows.
- Search + filter + CSV export are **UI-only**: search input is uncontrolled, "Filtrer" button has no `onClick`, "Exporter CSV" has no `onClick`. Three of the four affordances on this page are dead.

### `/partner/payouts` — `app/partner/payouts/page.tsx`
- Read-only against `partner_payouts`. Materialised by **monthly cron** at `app/api/cron/partner-payout-monthly/route.ts` (1st of each month 04:00 UTC, sums prior month's `succeeded` `partner_transactions` minus commission, idempotent skip if period already exists).
- **No "Request payout" button.** Partners cannot initiate a payout — they wait for the cron. The page is purely informational.
- **No PSP wired for payouts.** The cron creates a `partner_payouts` row with `status` (likely `pending`), no integration with CMI/Stripe/M2T/Wafacash for actual disbursement. Status changes to `paid` are presumably hand-flipped by ops; nothing in the codebase automates the bank-transfer side. By contrast, *teen-side* PSPs (CMI, Stripe, M2T, Wafacash, CashPlus) all have real webhook routes — the partner-payout pipeline has none.

### `/partner/invoices` — `app/partner/invoices/page.tsx`
- Reads `partner_invoices` (migration 091) with a fallback to derive synthetic invoices from `partner_payouts` until the real trigger backfills. Synthetic invoice number from `INV-{year}-{shortId}`.
- Header note: *"La facture PDF est disponible sur demande auprès du support"* — **no PDF generation pipeline**. No download button on the invoice rows, no link to a PDF.

### `/partner/stats` — `app/partner/stats/page.tsx`
- Real reads off `partner_transactions`, 6-month rolling window. Builds a 4-month chart (server-side aggregation). `Download CSV` button exists but is wired to the same dead handler as transactions.

### `/partner/settings` — `app/partner/settings/page.tsx`
- **All fields are uncontrolled with hardcoded `defaultValue`s.** The "Sauvegarder" button is a no-op. The header comment confirms: *"V1.2 TODO: Wire to `partners` row… The 'Sauvegarder' button is a no-op."*

### `/partner/support` — `app/partner/support/page.tsx`
- Real: reads `support_tickets`, has a `NewTicketForm` server-action.

### `/partner/restaurant/menu` and `/partner/restaurant/orders`
- Real reads off `menu_items` and `food_orders` filtered by partner. Client components (`menu-manager-client.tsx`, `orders-feed-client.tsx`) handle CRUD/realtime.
- These exist outside the canonical partner left-nav (`components/dashboard/partner/sidebar.tsx`) — there's no link to either. Restaurant partners must know the URLs by hand.

### `/partner/events` — listed in nav
- File exists (`app/partner/events/page.tsx`) — not deeply audited, but the loading skeleton presence suggests a real RSC route.

---

## 7. Off-the-shelf vs custom inventory

| Area | What's off-the-shelf | What's custom |
|---|---|---|
| Forms | `react-hook-form` + zod (offer creation), `framer-motion` (animations), shadcn/ui primitives (`Card`, `Input`, `Select`, `Switch`, `Checkbox`, `Textarea`) | The 4 RetailPartnerForm/VenuePartnerForm/ClubPartnerForm/EducationPartnerForm wizards (each ~600–900 lines, hand-rolled multi-step state machines with no zod schema — only ad-hoc `validateStep` predicates) |
| QR scanning | `html5-qrcode` (camera + decode) | `components/qr-scanner.tsx` wrapper (camera switching, flashlight toggle, debounce, error surfacing); `verify-card` parser (custom `TPVIP:` format) |
| Auth | Supabase auth.signUp (generic) | `getUserRole` email-matching to attribute partner role; awaiting-approval gating component |
| Payouts | Vercel Cron + Supabase service-role client | `partner-payout-monthly` aggregation logic; synthetic invoice fallback |
| Money rails | CMI / Stripe / M2T / Wafacash / CashPlus webhooks (incoming, teen-side) | None for partner outflow |
| Notifications | Supabase `user_notifications` table | Best-effort writes from approve route — no email/SMS provider for partners |

---

## 8. Critical missing primitives for the partner ecosystem to actually work

In rough priority order:

1. **Partner account creation pipeline.** No code path takes a `partners` row from `pending` to a usable login. The prospect form does not create `auth.users`; the `/auth/sign-up` form does not link to a `partners` row. The "Compte partenaire approuvé" notification (in approve route) presumes the partner can already log in — they cannot, unless somebody manually provisions an account.

2. **KYC capture UI.** No file uploader anywhere in `/devenir-partenaire/inscription/**` or `/partner/**`. The `kyc_documents` table and the `kyc-documents` storage bucket exist in isolation. The "Compléter mon KYC" CTA on awaiting-approval is a dead link in functional terms.

3. **Offer moderation workflow.** Offers POSTed via `/api/partner/offers` go straight to `is_active: true`. There is no admin queue, no preview, no "request changes" round-trip. A bad-actor partner can publish 30%-off offers minutes after activation.

4. **QR replay / tampering protection.** Static `TPVIP:userId:cardNumber` payload, no signature, no expiry, no nonce. Anyone with a photo of a member's card QR can run unlimited applies. There should be (a) HMAC/JWS-signed payload with `exp` ≤ 60s, (b) server-side nonce table for one-time-use.

5. **Idempotent apply-discount.** Non-atomic counter increments + try/catch-tolerated missing `discount_usage` table. Needs (a) DB-level row lock or RPC that increments-and-checks atomically, (b) client-supplied idempotency key checked against a `request_dedup` table, (c) hard fail (not silent skip) when `discount_usage` is unavailable.

6. **Partner-initiated payout request + PSP integration.** Currently zero. Partners cannot ask "pay me now," and even the cron-generated rows have no automated bank transfer — the `paid` flag is presumably hand-flipped by ops. For Morocco that means at minimum: CMI Marketplace / Wafacash B2B payout / M2T transfer + a `partner_bank_accounts` table (currently the registration captures no RIB).

7. **Partner settings persistence.** The entire settings page is dead UI. No way for a partner to update their company info, contacts, hours, or notification prefs without a developer.

8. **Invoice PDF generation.** `partner_invoices` rows materialise but the page tells partners to "ask support" for a PDF. Needs a server route that renders a PDF (e.g. via `@react-pdf/renderer` or remote service) keyed off the invoice id, with proper IF/ICE/RC headers (Moroccan compliance).

9. **Operational glue between approve + login.** When admin clicks "Approve" the route writes `user_notifications` and flips `status='active'` — but if no `auth.users` row matches `partners.email`, the partner never actually logs in. The approve flow should either provision an auth user (admin-API `inviteUserByEmail`) or block approval until one exists.

10. **Restaurant / menu navigation.** `/partner/restaurant/menu` and `/partner/restaurant/orders` are not in the partner sidebar. A venue/restaurant partner cannot discover them through the UI.

11. **Transactions CSV export + filter + search.** All three are UI-only stubs. Partners reconciling with their own POS have no way to extract data.

12. **Offer toggle/delete from list.** The list view openly TODO's the inline toggle because the underlying `/api/partner/offers/[id]` PATCH/DELETE expects a payload schema (`name`, `offerType`, …) that no longer matches the canonical `partner_offers` columns. The reconciliation work is unfinished.

13. **Staff / role layer.** The `partner_staff` table is referenced by RLS policies (the `kyc_documents` policy requires `role='owner'`) but **there is no UI to manage staff**, no invite-staff flow, no role-switcher. The current model is one-email-equals-one-partner — a real merchant onboarding multiple cashiers cannot scale.

---

## Net assessment

The partner space has the **shape** of a functioning marketplace operator dashboard — sidebar, KPIs, scanner, offers list, payouts page — but at least three load-bearing primitives are unbuilt or stubbed:

- **No real path from "submit application" to "log in as partner."**
- **No KYC ingestion UI** despite the storage + table + admin-approval being wired.
- **No money-out rails** — partners can see payouts but not be paid.

Plus material security gaps around the QR/scanner trust model and offer moderation. The existing UI quality (animations, bento grids, magnetic buttons on the dashboard) is disproportionate to the operational maturity of the underlying flows.
