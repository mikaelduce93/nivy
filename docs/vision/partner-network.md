# Partner Network — Vision Audit

Read-only audit of the Nivy partner ecosystem. Generated 2026-05-07. Project: `imchornjvmgmaovhypco` (nivy, ACTIVE_HEALTHY).

## 1. Vision (intended)

Nivy operates a four-segment partner marketplace serving Moroccan teens (13–17): **retail** shops, **venue** restaurants/lounges/event spaces, **club** sports/fitness providers, and **education** academies/tutors. Each partner self-onboards via `/devenir-partenaire/inscription`, completes KYC (RC, ICE, RIB), passes admin approval (`pending → in_review → active`), and gains a dashboard with offers, sales, analytics, payouts, and a point-of-sale scanner. Teens consume offers via wallet/shop/agenda; partners may host group challenges; Nivy collects a commission per validated transaction with a tier-based discount on platinum partners.

## 2. What is actually built

### Code (frontend + API)

- `app/devenir-partenaire/inscription/page.tsx` — partner-type selection screen (4 cards: retail, venue, club, education) routing to per-type forms.
- `components/partners/RetailPartnerForm.tsx`, `VenuePartnerForm.tsx`, `ClubPartnerForm.tsx`, `EducationPartnerForm.tsx` — multi-step wizards (4 steps each: company info → locations/services → discounts → confirmation).
- `app/api/partners/register/route.ts` — POST endpoint creating a `partners` row with `status:'pending'`, then dispatching to `handleRetailPartner / handleVenuePartner / handleClubPartner / handleEducationPartner` for type-specific child rows.
- `app/partner/page.tsx` — partner home gated by `PARTNER_ACTIVE_STATUSES = {active, verified, approved}`; everything else renders `<PartnerAwaitingApproval />`.
- `app/partner/dashboard/page.tsx` — dashboard with mock stats (CA, teens accueillis, note moyenne, paiements XP) and embeds `<UniversalScanner />`.
- `app/partner/scanner/page.tsx` — production scanner UI: camera capture (`@/components/qr-scanner`) + manual `TPVIP-XXXX-XXXX` code entry.
- `components/partner/universal-scanner.tsx` — alternate scanner (uses `html5-qrcode` lib) with **mock logic only** (`text.startsWith('TICKET:'/'PAY:')`, hardcoded user "Youssef Benali").
- `app/api/partner/verify-card/route.ts` — real verify endpoint: parses `TPVIP:userId:cardNumber`, joins `vip_cards → profiles`, computes tier eligibility for `partner_discounts`.
- `app/api/partner/apply-discount/route.ts` — applies discount, writes `discount_usage`, awards XP via `add_user_xp` RPC, awards loyalty points based on VIP tier (silver×1, gold×2, platinum×3).
- `app/api/partner/offers/route.ts` + `app/api/partner/offers/[id]/route.ts` — CRUD for `partner_discounts`.
- `app/partner/{kyc,offers,events,transactions,payouts,invoices,stats,settings,support}/page.tsx` — full IA scaffolded.
- `components/dashboard/partner/{header,sidebar,awaiting-approval}.tsx` — chrome.
- `components/partner/offer-edit-form.tsx` — offer editor.

### Database (live, project `imchornjvmgmaovhypco`)

Only **2 partner-related tables exist**:

| Table | Columns | Rows | Notes |
|---|---|---|---|
| `partners` | id, email (UNIQUE), company_name, partner_type (text, default `'venue'`), status (text, default `'pending'`), created_at, updated_at | 1 | 1 row, `partner_type=venue`, `status=pending` |
| `partner_discounts` | id, partner_id (FK→partners ON DELETE CASCADE), title, description, is_active, valid_until, created_at | 0 | empty |

Tables expected by code but **MISSING** from this DB: `vip_cards`, `discount_usage`, `user_points`, `points_transactions`, `partner_offers`, `partner_venue_features`, `partner_transactions`, `partner_sales`, `partner_commissions`. The only related tables present are `vip_benefits_log`, `vip_exclusive_items`, `vip_perks`, `vip_tiers`.

## 3. Gaps vs vision

- **No CHECK constraint or enum on `partner_type`** — it is plain `text` defaulting to `'venue'`. The four canonical types are enforced only client-side (form selector) and by the `switch` in `register/route.ts`. Any value can be inserted directly.
- **No CHECK constraint on `status`** — the lifecycle `pending → in_review → active` exists in code (`PARTNER_ACTIVE_STATUSES`) but is not DB-enforced. Even `'verified'` and `'approved'` are accepted as synonyms for active, which is ambiguous.
- **`partners` schema is a stub.** The registration API writes `company_registration_number, tax_id, phone, website, address, city, postal_code, description, contact_person_*` — none of these columns exist in the live table. Every signup attempt will silently drop those fields or error.
- **`partner_discounts` schema mismatch.** Live table has 7 columns; verify-card and apply-discount read `discount_name, discount_type, discount_value, min_vip_level, min_purchase_amount, max_discount_amount, valid_from, max_total_uses, current_total_uses, max_uses_per_user, terms_and_conditions`. None exist. APIs are non-functional against this DB.
- **Scanner duality.** Two scanners coexist: the production-quality `app/partner/scanner/page.tsx` (real API, depends on missing `vip_cards`) and the mock `components/partner/universal-scanner.tsx` (hardcoded data) embedded in the dashboard. The dashboard wires the mock, not the real one.
- **Hardware:** scanner is phone-camera + QR (`html5-qrcode` on web), no dedicated device integration found.
- **Commission calculation:** no DB table, no code path. Only marketing copy in `app/partner/dashboard/page.tsx` ("-50% de commission" for Platinum) and an FAQ string in `app/partner/support/page.tsx` ("commissions versées le 5 du mois suivant"). No commission row is written at sale time.
- **Per-type specificity:** the four registration forms diverge in fields collected (retail = locations + categories, venue = menu/events, club = memberships, education = courses), but the persistence layer collapses everything to the same 7-column `partners` table — no `partner_venue_features`, `partner_club_features`, etc., exist.
- **Approval flow:** `awaiting-approval.tsx` and `app/partner/kyc/page.tsx` exist as UI shells (KYC steps mocked: `business_info, legal_docs, representative, bank_account`), but no admin moderation endpoint or `kyc_documents` table was found.
- **Teen wallet integration:** no code path was found that surfaces `partner_discounts` to teen wallet / shop / agenda. Discounts are partner-side only.

## 4. Open questions for the founder

- Are partners onboarded by Nivy team (sales-led, manual KYC) or fully self-service?
- What does the partner pay — flat subscription, commission per validated sale, or hybrid? At what % and at which step is it deducted?
- Does the scanner need a dedicated hardware device (Sunmi/Ingenico) or is phone-camera + QR the final answer?
- Education partners: do they grade teen quizzes / track course completion, or only offer discounts on enrolment fees?
- Should `verified`, `approved`, and `active` be merged into a single canonical status, or do they encode distinct states (e.g. KYC verified vs. commercially active)?
- Are venue partners expected to host Nivy challenges natively, or is the challenge-hosting feature scoped to a separate `events` table?

## 5. Recommendations (informational only — no edits made)

1. Add `CHECK (partner_type IN ('retail','venue','club','education'))` and `CHECK (status IN ('pending','in_review','active','rejected','suspended'))`, or convert both to Postgres enums.
2. Migrate `partners` to include the columns the registration API already writes (RC, ICE, RIB, contact person, address) — currently a silent data-loss bug.
3. Migrate `partner_discounts` to match the API contract, or rewrite the APIs against the current minimal schema.
4. Create `discount_usage` (or `partner_transactions`) — the apply-discount endpoint is the commission-anchor point and currently writes to a non-existent table.
5. Pick one scanner: delete `components/partner/universal-scanner.tsx` (mock) or wire it to the real APIs.
6. Decide the commission model and persist it (`partner_commissions` with `rate`, `tier_override`, `effective_from`).

## 6. Sources

**Code paths reviewed:** `app/devenir-partenaire/inscription/page.tsx`, `app/api/partners/register/route.ts`, `app/api/partner/verify-card/route.ts`, `app/api/partner/apply-discount/route.ts`, `app/api/partner/offers/route.ts`, `app/api/partner/offers/[id]/route.ts`, `app/partner/page.tsx`, `app/partner/dashboard/page.tsx`, `app/partner/scanner/page.tsx`, `app/partner/kyc/page.tsx`, `app/partner/{offers,events,transactions,payouts,invoices,stats,settings,support}/page.tsx`, `components/partner/universal-scanner.tsx`, `components/partner/offer-edit-form.tsx`, `components/partners/{Retail,Venue,Club,Education}PartnerForm.tsx`, `components/dashboard/partner/{header,sidebar,awaiting-approval}.tsx`.

**DB tables inspected (live, `imchornjvmgmaovhypco`):** `partners` (1 row, all `venue`/`pending`), `partner_discounts` (0 rows), plus existence checks for `vip_cards`, `discount_usage`, `user_points`, `points_transactions`, `partner_offers`, `partner_venue_features`, `partner_transactions`, `partner_sales`, `partner_commissions` (all absent), and `vip_tiers`, `vip_perks`, `vip_benefits_log`, `vip_exclusive_items` (present but unrelated to partner offers).
