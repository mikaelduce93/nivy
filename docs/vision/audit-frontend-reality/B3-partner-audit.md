# B3 — Partner Role Frontend Audit (READ-ONLY)

**Agent**: B3
**Date**: 2026-05-08
**Scope**: `app/partner/**/page.tsx`, partner sidebar/header, partner signup/onboarding chain.
**User concern (P0)**: "il y a énormément de partner qui ne sont pas listés, sans espace de connexion et sans création de pages."

---

## Section 1 — Partner Navigation Inventory → Target → Status

### 1.1 Sidebar (`components/dashboard/partner/sidebar.tsx`)

The sidebar is a hardcoded 8-item flat list. There is **no partner dock** (no `app/partner/dock.tsx` or equivalent mobile bottom nav) — desktop sidebar only, and on mobile only the floating AI agent button is rendered. The sidebar does **not** segment by partner_type (retail vs venue vs club vs education) — every partner sees the same 8 links regardless of what they registered as.

| # | Sidebar label | href | Page exists? | Status |
|---|---|---|---|---|
| 1 | Dashboard | `/partner` | YES — `app/partner/page.tsx` | OK (real Supabase) |
| 2 | Mes Offres | `/partner/offers` | YES | OK (real) |
| 3 | Transactions | `/partner/transactions` | YES | OK (real) |
| 4 | Scanner QR | `/partner/scanner` | YES | OK (client component, real APIs) |
| 5 | Statistiques | `/partner/stats` | YES | OK (real) |
| 6 | Events | `/partner/events` | YES | Partial (column-existence guard, degrades silently) |
| 7 | Paramètres | `/partner/settings` | YES | **BROKEN** — uncontrolled inputs, hardcoded defaults, no save |
| 8 | Support | `/partner/support` | YES | OK (real RLS read + server-action create) |

### 1.2 Pages that EXIST but are NOT in the sidebar (orphaned)

This is the user's complaint made literal — these pages are reachable only by typing the URL:

| Route | Page exists | Sidebar entry? | Reachable how? |
|---|---|---|---|
| `/partner/dashboard` | YES (separate from `/partner`) | NO | Direct URL only — duplicate dashboard |
| `/partner/restaurant/menu` | YES | **NO** | None — invisible to venue partners |
| `/partner/restaurant/orders` | YES | **NO** | None — invisible to venue partners |
| `/partner/kyc` | YES | **NO** | None (only linked from `awaiting-approval` indirectly) |
| `/partner/payouts` | YES | **NO** | None — partners cannot see their payouts |
| `/partner/invoices` | YES | **NO** | None — partners cannot download invoices |
| `/partner/offers/new` | YES | NO (CTA from offers list) | OK (linked from offers page) |
| `/partner/offers/[id]/edit` | YES | NO (row action) | OK (linked from offers list) |

**Critical:** Five real, working pages (`restaurant/menu`, `restaurant/orders`, `kyc`, `payouts`, `invoices`) ship with **zero entry points** in the partner sidebar. A venue/restaurant partner has no way to reach their menu or orders feed. Any partner has no way to see their dossier KYC, their payouts, or their invoices unless they remember the URL.

### 1.3 Pages that should exist per `docs/vision/partner-network.md` but DON'T

| Expected | Status |
|---|---|
| Reservations list (venue) | MISSING |
| Subscription/membership manager (club) | MISSING |
| Course/session calendar (education) | MISSING |
| Staff/team management (`partner_staff` table exists per migration refs) | MISSING |
| Venue event-package editor | MISSING (registration form creates them, no edit UI) |
| Club offerings editor | MISSING |
| Education courses editor | MISSING |
| Notifications preferences | MISSING (acknowledged TODO in `settings/page.tsx`) |

The partner-type wizard at `/devenir-partenaire/inscription` collects rich, type-specific intake (locations, discounts, venue details + menu + event packages, club offerings, education courses) into 8+ specialized tables, but the partner **dashboard provides no UI to view or edit any of it post-registration.** The data is captured then frozen.

---

## Section 2 — Per-Page Scoring

Score = 0–10. Methodology: data source (real Supabase = +4, mock = 0, partial = +2), feature completeness (+3), reachability/integration (+2), UX polish (+1).

| Page | Score | Source | Notes |
|---|---|---|---|
| `/partner` (root) | **8/10** | Real Supabase | Reads `partners` + `partner_discounts` + `discount_usage`. Renders `PartnerAwaitingApproval` for non-active statuses (good first-run). 4 KPI cards + offers feed + tx feed via lazy components. Solid. |
| `/partner/dashboard` | **7/10** | Real Supabase | Duplicate of `/partner` — reads `partner_transactions` + `partner_discounts`. KPIs + bento. Has try/catch fallback for RLS errors. Confusing that it coexists with `/partner`. **Routing dedup needed**. |
| `/partner/offers` | **8/10** | Real Supabase | Reads `partner_offers` (canonical, post-mig 074), partner-scoped, server-rendered. EmptyState wired. CTA → `/partner/offers/new` and per-row edit. Clean. |
| `/partner/offers/new` | **7/10** | Form (presumed POST) | RHF + zod + FormKeyboardAware. 4 offer types. Did not verify the submit handler wires to real API (out-of-scope for top-60 read), but architecture is real. |
| `/partner/offers/[id]/edit` | **8/10** | Real Supabase | Server-side fetch with partner_id ownership check, delegates to `OfferEditForm` client component. 404s correctly. |
| `/partner/transactions` | **8/10** | Real Supabase | Reads `partner_transactions` filtered by partner_id. Privacy-friendly teen-id masking. Filter UI is decorative (Search/Download/Filter buttons not wired) but list is real. |
| `/partner/scanner` | **7/10** | Real APIs | Client component, calls `/api/partner/verify-card` + `/api/partner/apply-discount`. Renders eligible offers, points, tier. Heavy logic. Likely the most production-ready partner feature. |
| `/partner/stats` | **6/10** | Real Supabase | Reads last-6-months `partner_transactions`, aggregates by month. Has guard for missing `partnerData.id`. Renders minimal — "Download" is decorative. |
| `/partner/events` | **5/10** | Real Supabase (defensive) | `events.partner_id` may not exist on all envs, query is wrapped to degrade to empty. List view only — no create/edit. Venues can't manage their event packages here. |
| `/partner/settings` | **2/10** | **MOCK** | File header explicitly states: "Inputs are currently uncontrolled with hardcoded defaultValues; the 'Sauvegarder' button is a no-op." Hardcoded "Ma Boutique" / "Boutique de vêtements et accessoires tendance pour adolescents." displayed to every partner. **BROKEN UX.** |
| `/partner/support` | **8/10** | Real RLS + server action | Reads `support_tickets` filtered by `requester_user_id = auth.uid()`. New ticket via server action. Status badges. Solid. |
| `/partner/restaurant/menu` | **7/10** | Real Supabase | Service-role read of `menu_items` for the partner. Delegates to `MenuManagerClient`. Real but **unreachable from sidebar.** |
| `/partner/restaurant/orders` | **7/10** | Real Supabase | Service-role read of `food_orders` (limit 50). `OrdersFeedClient` accept/reject. Real but **unreachable from sidebar.** |
| `/partner/kyc` | **7/10** | Real Supabase | Service-role read of `kyc_documents` + signed-URL generation (15min TTL). **Read-only — no upload UI here**, header explicitly says onboarding upload "lives elsewhere" (it does not). **Unreachable from sidebar.** |
| `/partner/payouts` | **7/10** | Real Supabase | Service-role read of `partner_payouts`. Real schema (mig D.11 cron). Read-only summary. **Unreachable from sidebar.** |
| `/partner/invoices` | **8/10** | Real Supabase | Reads `partner_invoices` (mig 091) with fallback to V1.2-F derivative view if empty. Read-only table. **Unreachable from sidebar.** |

**Aggregate**: 16 pages, average **6.7/10**. The implementation quality of the data-layer code is genuinely high (real Supabase, RLS-aware, service-role where needed, defensive try/catch). The failure mode is **navigation/integration**, not back-end fakery.

---

## Section 3 — Partner Signup / Onboarding Gap Analysis (P0)

This is where the user's concern is correct and severe. There are **two parallel, disconnected partner intake flows**, and **neither produces a working login**.

### 3.1 Flow A — `/auth/sign-up` (the only authenticated signup page)

`app/auth/sign-up/page.tsx` is **hardcoded for parents only**:

- Fields collected: `prenom`, `nom`, `email`, `telephone`, `ville`, `password`, newsletter, CGU.
- The placeholder email shown is `parent@example.com`.
- **No role selector.** The form passes `data: { nom, prenom, telephone, ville, accept_newsletter }` to `supabase.auth.signUp` — there is no `role` field, no `partner` option, no branching.
- The success redirect goes to `/auth/sign-up-success` then via `/auth/redirect` lands on whatever role is on `profiles.role`. With no role mechanism in signup, every signup defaults to teen/parent flow.

**Result**: A would-be partner who clicks "S'inscrire" in the navbar (which links to `/auth/sign-up`) gets a parent signup form. There is no UX path from the public site to a partner signup that creates an authenticatable account.

### 3.2 Flow B — `/devenir-partenaire/inscription` (the partner-type wizard)

`app/devenir-partenaire/page.tsx` is a marketing landing with a CTA to `/devenir-partenaire/inscription`, which renders a 4-card type picker (retail/venue/club/education) and dispatches to `RetailPartnerForm` / `VenuePartnerForm` / `ClubPartnerForm` / `EducationPartnerForm`. These forms POST to `/api/partners/register`.

**`app/api/partners/register/route.ts` (lines 5–93):**

- Inserts into `partners` table with `status: 'pending'`.
- Then per type, populates `partner_locations` + `partner_discounts` (retail) / `partner_venues` + `venue_menu_items` + `venue_event_packages` (venue) / `partner_clubs` + offerings (club) / education tables.
- Returns success.

**Critical missing steps:**

1. **No `supabase.auth.signUp`** — no `auth.users` row is created.
2. **No `profiles` row** — no `role='partner'` written.
3. **No password collection** — the registration forms never ask for a password.
4. **No email verification flow** — no magic-link, no invite, nothing.
5. **No `partner_staff` row** — the eventual RLS-driven dashboard relies on staff/email join.

**Consequence**: After completing the partner wizard, a row exists in `partners` table with `status='pending'`, **but the partner literally cannot log in to anything**. They will land at `app/partenaires/merci/page.tsx` (a thank-you screen with a generated reference code) and that is the end of the road. There is no email sent, no invite, no credentials.

How do the few existing partners log in today? Per `scripts/seed-all-test-accounts.ts` the test partners are seeded directly via service role — i.e. **manually provisioned**. In production, an admin must (a) create an `auth.users` row, (b) create a `profiles` row with `role='partner'`, (c) set `partners.email` to match. There is no self-serve mechanism.

### 3.3 KYC Intake Gap

`/partner/kyc` is read-only. The page header explicitly states: *"No client-side upload is wired here — the onboarding upload flow lives elsewhere."* Searching the codebase (`Grep` for `kyc_documents` upload UIs, partner KYC upload routes) shows the registration wizard does not collect KYC docs either. The 4 type forms collect business metadata but **no `rc`, `ice`, `patente`, `cin`, `rib` document upload** is wired anywhere accessible to the partner. Admin-side KYC review (`app/admin/...`) exists, but there is no partner-side upload surface.

**The KYC table exists, the KYC viewer exists, the admin reviewer exists — the partner uploader does not.**

### 3.4 Signup Gap Summary

| Gap | Severity | Fix scope |
|---|---|---|
| `/auth/sign-up` has no role selector | **P0** — user's literal complaint | 1–2 days: add role tabs / extend redirect. |
| `/api/partners/register` does not create auth user | **P0** — no login possible | 2–3 days: add `supabase.auth.admin.inviteUserByEmail` or wire signup before partner row. |
| Marketing CTA `/devenir-partenaire/inscription` and `/auth/sign-up` are siloed | **P0** — UX dead-end | 1 day routing fix. |
| No KYC document upload UI for partners | **P1** | 2–3 days: file uploader → storage `kyc-documents` bucket + insert into `kyc_documents`. |
| No password reset / invite flow for partners | **P0** — onboarding chain broken | 1–2 days. |
| Sidebar missing 5 working pages (restaurant/menu, orders, kyc, payouts, invoices) | **P0** — user's complaint, again | 1 hour: extend `navigation` array + segment by `partner_type`. |
| No partner_type-aware dashboard segmentation | **P1** | 1–2 days. |

---

## Section 4 — Top Broken / Missing & Top Strong

### 4.1 Top Broken / Missing (in priority order)

1. **`/auth/sign-up` is parent-only.** No role selector, no path to a partner-creating signup. The button "S'inscrire" in the navbar leads partners to a form that does not even pretend to handle them. (Section 3.1)
2. **`/api/partners/register` produces orphan `partners` rows with no `auth.users` linkage.** A completed partner application is a database record nobody can log into. The chain `devenir-partenaire/inscription` → `partenaires/merci` is a dead end. (Section 3.2)
3. **5 working partner pages are unreachable from the sidebar**: `/partner/restaurant/menu`, `/partner/restaurant/orders`, `/partner/kyc`, `/partner/payouts`, `/partner/invoices`. The code is shipped, the data is real, the user can never click to it. This is the user's complaint made literal. (Section 1.2)
4. **`/partner/settings` is a hardcoded mock.** Header comment states the save button is a no-op and inputs are uncontrolled. Every partner sees "Ma Boutique" / "Boutique de vêtements et accessoires tendance pour adolescents." as their own data. (Section 2 row 9)
5. **No KYC upload UI exists anywhere.** `/partner/kyc` is a viewer only; the registration wizard collects business metadata but no documents. Admin-side reviewer expects docs that no partner-facing page can submit. (Section 3.3)
6. **No partner_type-aware navigation.** A retail partner sees "Events" but no menu/orders surface; a venue partner sees the same menu as retail; a club has no offerings editor. The sidebar is a one-size-fits-nothing flat list. (Section 1.1)
7. **Duplicate dashboards** at `/partner` and `/partner/dashboard` with overlapping but inconsistent KPIs. Routing-dedup pass needed.
8. **No reservations / subscriptions / courses surfaces** for venue/club/education despite registration capturing those entities into normalized tables.

### 4.2 Top Strong

1. **`/partner/scanner`** is a near-production-ready feature: real QR scan, real `/api/partner/verify-card` + `/api/partner/apply-discount` calls, eligible-offers display, tier/points lookup. The flagship working feature.
2. **`/partner/offers`** is clean: real `partner_offers` reads, partner-scoped, server-rendered, working CRUD chain (list → new → edit). Discount/date formatters are well factored.
3. **`/partner/transactions`** and **`/partner/stats`** read real `partner_transactions` data with privacy-friendly teen masking and 6-month aggregation.
4. **`/partner/payouts` / `/partner/invoices` / `/partner/kyc`** are well-implemented service-role read pages with proper signed-URL handling and real DB-backed rows. They suffer only from invisibility, not implementation quality.
5. **`PartnerAwaitingApproval`** state component handles `pending`/`in_review`/`rejected`/`suspended` with distinct UX — good first-run handling on the dashboard root.
6. **Restaurant menu/orders pages** (`/partner/restaurant/menu`, `/partner/restaurant/orders`) are real, well-structured Supabase reads delegating to client components. Just unreachable.

### 4.3 Bottom Line

The user's flag is correct. The partner data layer is in better shape than the surface area suggests — a lot of work shipped into APIs, tables, and even individual pages — but two structural failures hide all of it:

- **The sidebar is amputated** (8 links covering ~half of what's actually built).
- **The signup chain is broken in two places** (no role selector at `/auth/sign-up`; no auth user created at `/api/partners/register`).

Until both are fixed, partner self-service onboarding is impossible and most of the partner backoffice is undiscoverable. This is genuinely a P0 user-facing gap, not a perception issue.
