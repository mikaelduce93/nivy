# C3 — Partner Ecosystem Audit (Frontend Reality)

> Read-only audit. Date 2026-05-08. Working tree `C:\Users\Shadow\Desktop\NIVY`. Live Supabase project `imchornjvmgmaovhypco`.
>
> User concern (verbatim): *"il y a énormément de partner qui ne sont pas listés sans espace de connexion et sans création de pages"*.
>
> Translation: many partner archetypes promised in the vision (drivers, restaurants, mentors, DJs, ambassadors, creators, coaches, teachers, brands, festival venues, content creators…) have no public landing, no signup flow, no authenticated workspace, or all three. The four-type wizard at `/devenir-partenaire/inscription` does NOT cover them.
>
> This audit cross-references vision docs (`PRODUCT_WHITEPAPER.md`, `partner-network.md`, `food-delivery-restaurants.md`, `transport-mobility.md`, `mentorship-career.md`, `marketplace-c2c.md`, `content-creator-economy.md`, `ambassador-referral.md`, `events-lifecycle.md`, `teacher-coach-xp.md`, `birthday.md`) against the live Next.js routes under `app/`.
>
> Sibling audits referenced (do not duplicate): `B3` covers authenticated `/partner/**` workspace depth; `partner-network.md` covers DB schema gaps for the canonical 4 types. C3's lens is **archetype coverage** and **prospect→workspace continuity**.

---

## Section 1 — Partner Types Matrix (Expected vs Implemented)

The whitepaper §1, §9 and §22 commit to a **single canonical taxonomy** (`partner_type IN ('retail','venue','club','education')`), but seven adjacent vision docs introduce **operator archetypes** that share the partner mental model — they sell goods/services, sit on a dashboard, have payouts, and need KYC — yet none are wired into the four-type wizard. Each archetype below is a real user-facing seam.

Legend:
- **Vision doc** — where the archetype is specified.
- **Public landing** — pre-signup marketing/explainer page (the `/devenir-X` pattern).
- **Signup flow** — credential creation + DB row + role assignment.
- **Auth workspace** — post-login dashboard tailored to the archetype.
- **Discovery surface** — teen-side place where this archetype is browsed/booked.
- **Status**: ✅ done · 🟡 partial · ❌ missing.

| # | Archetype | Vision doc | Public landing | Signup flow | Auth workspace | Discovery surface | Overall |
|---|-----------|-----------|---|---|---|---|---|
| 1 | **Retail** (shops, brands) | `partner-network.md` §1, whitepaper §9 | ✅ `/devenir-partenaire` (card 1/4) → `/devenir-partenaire/inscription` | 🟡 `RetailPartnerForm.tsx` writes to `partners` + `partner_locations` + `partner_discounts`; **no auth.users created**, **no role assignment** — partner cannot log in afterwards | 🟡 `/partner` shell exists; `/partner/dashboard`, `/partner/offers`, `/partner/scanner` generic | 🟡 `/teen/offres` ranks `partner_offers` via `recommend_for_teen` RPC | 🟡 |
| 2 | **Venue** (resto, cafés, lounges) | `partner-network.md`, `birthday.md`, whitepaper §9 | ✅ same wizard (card 2/4) | 🟡 `VenuePartnerForm.tsx` → `partner_venues` + `venue_menu_items` + `venue_event_packages`; same auth gap | 🟡 generic `/partner/**`; **no venue-specific manager** (no `app/partner/venue/` directory) | 🟡 `/teen/offres`; **no `/teen/venues` directory** | 🟡 |
| 3 | **Club** (sport, fitness, dance) | `partner-network.md`, `teacher-coach-xp.md`, whitepaper §11 | ✅ same wizard (card 3/4) | 🟡 `ClubPartnerForm.tsx` → `partner_clubs` + `club_offerings`; same auth gap | 🟡 generic `/partner/**`; **no membership manager**, no class scheduler | 🟡 `app/clubs/page.tsx` + `app/clubs/[slug]/page.tsx` exist (public discovery) | 🟡 |
| 4 | **Education** (academies, tutors) | `partner-network.md`, `academic-integration.md`, whitepaper §15 | ✅ same wizard (card 4/4) | 🟡 `EducationPartnerForm.tsx` → `partner_education` + `education_courses`; same auth gap | 🟡 generic `/partner/**`; **no course manager**, no tutoring slot manager (whitepaper §15 expects `tutoring_slots`) | 🟡 `/teen/aide-scolaire` + `/teen/academic` exist as teen surfaces; **no partner-side enrolment manager** | 🟡 |
| 5 | **Restaurant** (food delivery sub-type) | `food-delivery-restaurants.md`, whitepaper §22 | ❌ **no `/devenir-restaurant`**, no card in wizard. `partner_type='food'` does not exist; spec asks for `partners.sub_category IN ('restaurant','cafe','bakery','catering','grocery')` | ❌ no signup tailored — would shoehorn into venue card | ✅ `/partner/restaurant/menu/`, `/partner/restaurant/orders/` exist; APIs at `/api/partner/restaurant/menu/items` + `/api/partner/restaurant/orders/feed` + `/api/partner/restaurant/orders/[id]` | ✅ `/teen/food` (discovery), `/teen/food/[partner_id]` (menu+cart), `/teen/food/order/[id]` (tracking); `/parent/food` (budget) | 🟡 — built from the back, no front door |
| 6 | **Driver** (Nivy partner driver pool) | `transport-mobility.md`, whitepaper §22 | ❌ no `/devenir-driver`, no card in wizard | ❌ no signup form, no `nivy_drivers` registration UI, no KYC upload page | 🟡 `/api/driver/rides/*` API exists; **no `app/driver/**` workspace** — drivers cannot log in to see their assigned rides anywhere | ✅ `/teen/rides`, `/teen/rides/request`, `/parent/rides`, `/parent/rides/[id]`; `/admin/drivers` + `/api/admin/drivers/[id]/approve` (admin-only review queue exists, but no driver-facing equivalent) | ❌ — drivers exist as a DB+API concept but have no UI seat |
| 7 | **Mentor** (career advisor, 17+ teen or 18-25 young adult) | `mentorship-career.md`, whitepaper §22 | ❌ no `/devenir-mentor` landing | 🟡 `/api/mentor/apply` POST exists; **no public form page** that calls it. The endpoint is reachable but invisible | ✅ `/mentor/dashboard`, `/mentor/profile/edit`, `/mentor/sessions` (workspace exists); `/api/mentor/sessions/[id]`, `/api/mentor/profile` | ✅ `/teen/mentors`, `/teen/mentors/[id]`, `/teen/mentor-sessions`, `/teen/pathways`, `/teen/internships`; `/parent/mentor-sessions` (approval) | 🟡 — full back, no public front door |
| 8 | **DJ / Performer** (event entertainment) | `events-lifecycle.md` implicit, no dedicated vision doc | ✅ `app/djs/page.tsx` (public list), `app/djs/[id]/page.tsx` (detail), `app/djs/candidature/page.tsx` (apply) | 🟡 candidature page exists — destination/storage of the application unclear; **no `partner_djs` or `dj_applications` table referenced in DB grep** | ❌ no `/dj/**` or `/partner/dj` workspace | 🟡 `/djs` is public, not specifically wired to teen agenda or events flow | 🟡 |
| 9 | **Ambassador** (referral commission) | `ambassador-referral.md`, whitepaper §11 | ✅ `/devenir-ambassadeur`, `/devenir-ambassadeur/candidature`, `/devenir-ambassadeur/programme`; `/ambassador` route exists | 🟡 candidature form exists; whitepaper §11 flags ambassador tables MISSING in DB | 🟡 `/ambassador` shell exists; whitepaper notes "Routes redirect" (top-30 gap #21) — **0% backed by DB** | n/a (ambassadors don't get teen-side discovery — they refer) | 🟡 — front exists, back is empty |
| 10 | **Influencer / Creator** (sponsored content, V2) | `content-creator-economy.md` §1, whitepaper §22 | ✅ `/devenir-influenceur`, `/devenir-influenceur/candidature` (public landing exists) | 🟡 candidature form; **no `creators`, `creator_submissions`, or `influencer_partnerships` table; the audit doc explicitly notes "the product surface is almost completely missing"** | ❌ no `/creator/**` or `/influencer/**` workspace; `/teen/create` does not exist either | ❌ no `/teen/creators` discovery page; share cards (`/teen/share`) are outbound only | ❌ — landing exists for show, no functional pipeline |
| 11 | **Coach** (sport instructor sub-role) | `teacher-coach-xp.md`, whitepaper §9 §11 | ❌ no `/devenir-coach` landing; whitepaper §9 specifies sub-role under club partner via `partner_staff` table | ❌ no `partner_staff` insert UI, no coach onboarding form | ❌ no `/coach/**` workspace; **no `/partner/awards` page** (the whitepaper §9 explicitly calls for it: "for club/education only — search teen, enter XP amount, attach evidence, submit") | n/a (teen sees coaches only when they award XP — no discovery) | ❌ |
| 12 | **Teacher** (academic tutor sub-role) | `teacher-coach-xp.md`, `academic-integration.md`, whitepaper §15 | ❌ no `/devenir-teacher` or `/devenir-prof` landing | ❌ same as coach — no `partner_staff` manager | ❌ no `/teacher/**` workspace; no tutoring-slot creator | 🟡 `/teen/aide-scolaire` references the booking concept but does not link to a teacher profile page | ❌ |
| 13 | **Marketplace seller** (C2C peer seller) | `marketplace-c2c.md`, whitepaper §22 | ❌ no `/devenir-vendeur` landing; teens are sellers themselves so this is debatable, but the seller-onboarding moment (KYC, bank, AML cap) is unhandled | ❌ no seller onboarding — `/marketplace/sell` exists but with **0 backing tables** (audit confirms) | 🟡 `/marketplace/my-listings`, `/marketplace/orders`, `/marketplace/sell` exist as shells | ✅ `/marketplace`, `/marketplace/listings/[id]` | ❌ — shell-deep |
| 14 | **Birthday venue** (catering host) | `birthday.md`, whitepaper §13 | ❌ no `/devenir-anniv-host`; would fold into venue card | ❌ no birthday-host extra step in venue form | 🟡 `app/anniversaires/**` exists for parents; **no `/partner/anniv` or `/partner/birthday` venue-side manager** to confirm/decline party bookings | ✅ `/anniversaires` is teen-facing | ❌ — venue partners cannot manage incoming parties |
| 15 | **Event organiser** (concert/festival) | `events-lifecycle.md`, whitepaper §14 | ❌ no `/devenir-organisateur` landing; venue card is closest | ❌ no event-org form distinct from venue | 🟡 whitepaper §14 specifies `/partner/events/new` + `/partner/events/[id]`; **`app/partner/events/page.tsx` exists but no `new` or `[id]` sub-routes** | ✅ `/agenda`, `/agenda/[id]` (teen discovery) | ❌ — partners can list events nowhere |

### Roll-up

- **2 of 15 archetypes are end-to-end built** (and even those — retail, venue — leak at the auth-creation step).
- **5 archetypes have public landings but no auth or empty backend** (ambassador, influencer, DJ, marketplace seller, the 4 wizard types' auth).
- **5 archetypes have backend/workspace but no public front door** (restaurant, mentor, driver, marketplace seller workspace, birthday venue).
- **3 archetypes have neither front nor back** (coach, teacher, event organiser).

The user's intuition is correct: *"énormément de partner qui ne sont pas listés sans espace de connexion et sans création de pages"*. The four-card wizard at `/devenir-partenaire` is a Potemkin façade — it covers four out of fifteen real operator archetypes; even those four do not produce a logged-in partner.

---

## Section 2 — Prospect → Registered Partner Flow Audit

The intended flow per whitepaper §22 ("State machine — Partner: Signup with type wizard → KYC submission → wait approval → create first offer") implies a continuous pipeline:

```
LANDING → TYPE WIZARD → CREDENTIAL → DASHBOARD (await) → KYC → APPROVAL → ACTIVE → SCANNER + OFFERS
```

What actually exists:

### 2.1 Step-by-step trace (retail/venue/club/education)

1. **Landing** — `app/devenir-partenaire/page.tsx`. ✅ Exists, well-designed, four cards. **All four cards link to the same `/devenir-partenaire/inscription` URL** (no per-type deep link), so the wizard re-asks for the type on next page.
2. **Type wizard** — `app/devenir-partenaire/inscription/page.tsx` → `RetailPartnerForm | VenuePartnerForm | ClubPartnerForm | EducationPartnerForm`. ✅ Wizard is multi-step (4 steps each).
3. **Credential creation — BROKEN.** `app/api/partners/register/route.ts` inserts a row into `public.partners` with `email` UNIQUE, but **never calls `supabase.auth.signUp(...)`** — there is no `auth.users` record. The partner has no password, no session, cannot log in. The post-submit redirect goes to `/partenaires/merci` (a thank-you page). The user is then stranded: they are in `partners` table, not in `auth.users`.
4. **Login attempt** — generic `/auth/sign-up` and `/auth/login` use Supabase Auth. There is **no link** between an `auth.users` row (when manually created) and `partners.email`. `app/partner/page.tsx:115` does `select from partners where email = userInfo.email` — meaning login works only if the partner separately self-registers a Supabase auth account using the **same** email they typed in the wizard. There is no UX hint of this.
5. **Role gating** — `app/partner/page.tsx:102` requires `userInfo.role === "partner"`. `lib/auth/get-user-role.ts` resolves role from… (not inspected fully, but the ambassador audit and the whitepaper top-30 gap #21 both confirm a "role enum gap" — the role is not assigned by the registration API).
6. **Dashboard awaiting** — `<PartnerAwaitingApproval />` renders. ✅ exists. Pleasant copy.
7. **KYC** — `/partner/kyc` exists as a UI shell with mocked steps (`business_info, legal_docs, representative, bank_account`). **No upload endpoint exists** (no `partner_kyc_documents` table, no `kyc_documents` storage bucket — `partner-network.md` §3 confirms).
8. **Admin approval** — `/admin/partners` exists with `partner-review-row.tsx`. Approval flips `partners.status` to `active`. ✅ exists.
9. **Active workspace** — `/partner/dashboard`, `/partner/offers`, `/partner/scanner`, `/partner/transactions`, `/partner/payouts`, `/partner/invoices`, `/partner/stats`, `/partner/settings`, `/partner/support` — all routes scaffolded. Many embed mock data; B3 covers depth.

### 2.2 What breaks the funnel

| Step | Symptom | Root cause |
|---|---|---|
| 3 | Form submits, no error, no email, no password set | `/api/partners/register/route.ts` does not create an auth user |
| 4 | Partner cannot log in | No bridge between `partners` row and `auth.users` |
| 5 | Even when an auth user exists, the partner sees a "not authorized" page | No mechanism assigns `role='partner'` to the user |
| 7 | KYC page accepts no real upload | Backend table + storage bucket + API endpoint all missing |
| 8 | Admin approves a partner who still cannot log in | Approval doesn't fix the auth bridge |

This is the **single most important defect** in the partner ecosystem: the prospect → registered → workspace handoff is **not continuous**. The visible UI suggests it works (it has loading states, success page, awaiting page) but the underlying pipe is severed.

### 2.3 The 11 archetypes outside the four-type wizard

Of the 15 archetypes in §1:
- 7 archetypes (driver, mentor application, restaurant, coach, teacher, event organiser, birthday venue) are **not even prospectable** — there is no URL a future partner can visit to apply. They exist in code only as authenticated workspaces or admin queues, presupposing partners already exist.
- 4 archetypes (DJ, ambassador, influencer, marketplace seller) **have public landings** but the candidature endpoints either (a) write to non-existent tables, (b) are decoupled from any auth/role assignment, or (c) the resulting "partner" has no workspace to log into.

### 2.4 Authenticated entry points that exist without a public sign-up

These pages exist post-login, gated by role, with **no documented path to obtain that role**:

| Workspace | Role required (presumed) | Public sign-up |
|---|---|---|
| `/partner/**` | `partner` | `/devenir-partenaire/inscription` (broken at credential step) |
| `/mentor/**` | `mentor` | none — `/api/mentor/apply` exists, no UI |
| `/admin/**` | `admin` | none (correct — staff-only) |
| (no `/driver/**`) | n/a | n/a |
| (no `/coach/**`) | n/a | n/a |
| (no `/teacher/**`) | n/a | n/a |
| (no `/dj/**`) | n/a | n/a |

---

## Section 3 — Teen-Side Partner Discovery Audit

The teen is the demand side. Each archetype needs a discoverability surface (browse, filter, book/buy). Today:

| Archetype | Teen-side discovery URL | State |
|---|---|---|
| Retail | `/teen/offres` | ✅ wired to `recommend_for_teen('partner_offer')` RPC; renders `partner_offers` rows joined with `partners`. **`partner_offers` table does not exist live** (whitepaper top gap; current live table is `partner_discounts` with mismatched schema). Empty state is the realistic state today. |
| Venue (general) | (none — `/teen/venues` does not exist) | ❌ no dedicated browse |
| Restaurant | `/teen/food` + `/teen/food/[partner_id]` + `/teen/food/order/[id]` | ✅ end-to-end teen surface — discovery, menu, cart, order tracking |
| Club | `/clubs` (public) + `/clubs/[slug]` | 🟡 outside `/teen/**`, not personalized; no booking flow |
| Education | `/teen/aide-scolaire` + `/teen/academic` | 🟡 grade-tracking exists; tutoring booking flow not wired to a teacher entity |
| Mentor | `/teen/mentors` + `/teen/mentors/[id]` + `/teen/mentor-sessions` + `/teen/pathways` + `/teen/internships` | ✅ very complete teen surface |
| Driver / ride | `/teen/rides` + `/teen/rides/request` | ✅ teen surface exists |
| DJ | `/djs` + `/djs/[id]` | 🟡 public, not under `/teen/**`, not personalized |
| Marketplace seller | `/marketplace` + `/marketplace/listings/[id]` | 🟡 routes exist; whitepaper confirms 0 backing tables |
| Influencer / creator | (none — no `/teen/creators`) | ❌ |
| Birthday venue | `/anniversaires` | 🟡 fixed-pack picker, not partner-driven |
| Event / concert | `/agenda` + `/agenda/[id]` | ✅ exists |
| Ambassador | n/a (not a discovery surface) | n/a |
| Coach | (none — surfaces via XP awards, no profile browse) | ❌ |
| Teacher | (none) | ❌ |

### 3.1 Cross-archetype discovery patterns

Three discovery surfaces converge on partners but **do not share a model**:
- `/teen/offres` (offer-centric, RPC-ranked)
- `/teen/food` (restaurant-centric, hand-coded)
- `/teen/mentors` (mentor-centric, hand-coded)

There is **no single `/partenaires` browse for teens** — the public `/devenir-partenaire` is a B2B sales page, not a directory. If a teen wants to "see all partners near me" (a frequent intuition), there is no page. The map at `/teen/map` is the closest candidate (not inspected here).

### 3.2 Search & filter

`docs/vision/search-discovery.md` envisions a unified discovery layer; today, every teen-side surface ships its own filter UI inline. No shared partner-search component, no shared partner-card primitive seen across `/teen/offres`, `/teen/food`, `/teen/mentors`.

---

## Section 4 — Top 10 Missing Partner Surfaces (Ranked by Impact)

Ranking criteria: (a) blocks partner activation revenue, (b) blocks teen demand realization, (c) ships routes already half-built, (d) compliance/safety risk if absent.

### 1. **Auth bridge in `/api/partners/register`** — P0 blocker for ALL partner types
The single defect that voids all four cards of the wizard. A partner submits the form, gets a thank-you page, and can never log in. Fix: create `auth.users` row + assign `role='partner'` in `auth.users.app_metadata` (or equivalent), email a magic link or temp password. Without this, every other partner improvement is decoration.
*Touches:* `app/api/partners/register/route.ts`, `lib/auth/get-user-role.ts`, email templates.

### 2. **`/devenir-restaurant` landing + restaurant card in wizard** — high revenue, infra ready
The restaurant workspace (`/partner/restaurant/menu`, `/partner/restaurant/orders`) and the teen surface (`/teen/food` end-to-end) are already built. The only missing piece is the prospect funnel. A restaurant operator visiting the site today has no way to apply — they have to shoehorn into "Restaurants & Lieux" (venue) which doesn't surface menu or order management.
*Touches:* `app/devenir-restaurant/page.tsx`, `app/devenir-partenaire/page.tsx` (5th card), `components/partners/RestaurantPartnerForm.tsx`, `partners.sub_category` ALTER.

### 3. **`/devenir-driver` + driver onboarding + `/driver/**` workspace** — P0 safety + active vision area
Driver pool (`nivy_drivers`) is the load-bearing trust primitive of `transport-mobility.md`. The teen and parent surfaces are built (`/teen/rides`, `/parent/rides`). The admin review queue exists (`/admin/drivers`). What's missing: how drivers apply and where they see their assigned trips. Without a driver workspace, the ride-pool can never go live.
*Touches:* `app/devenir-driver/page.tsx`, `app/driver/dashboard/page.tsx`, `app/driver/rides/page.tsx`, `nivy_drivers` table, KYC bucket.

### 4. **Public mentor application page** — backend exists, front door missing
`/api/mentor/apply` exists. `/mentor/dashboard`, `/mentor/profile/edit`, `/mentor/sessions` exist. Teens can browse `/teen/mentors`. But a 24-year-old med student who wants to mentor cannot find a "become a mentor" page — there is no `/devenir-mentor` route.
*Touches:* `app/devenir-mentor/page.tsx`, `app/devenir-mentor/candidature/page.tsx`.

### 5. **`/partner/awards` (coach + teacher XP-grant UI)** — vision-mandated, 0% built
Whitepaper §9 explicitly specifies this page: "for club/education only — search teen, enter XP amount, attach evidence, submit". This is **the** XP-economy bridge between partners and teens. Without it, the "two-currency loop" that defines Nivy is broken on the partner side. Whitepaper top-30 gap #20 (Coach/teacher XP-awarding 0% built) tracks this.
*Touches:* `app/partner/awards/page.tsx`, `partner_xp_awards` table, `partner_staff` table, `/api/partner/awards/grant`.

### 6. **`/partner/events/new` + `/partner/events/[id]`** — half-built, blocks event supply
`app/partner/events/page.tsx` exists (a list view). The whitepaper §14 specifies the create + edit sub-routes; they are missing. Today the 4 events in the live DB are admin-seeded. Partners cannot author events. The `/agenda` teen surface is therefore content-starved.
*Touches:* `app/partner/events/new/page.tsx`, `app/partner/events/[id]/page.tsx`, `/api/partner/events/create`.

### 7. **Ambassador + Influencer backing tables** — UIs ship without DB
Both `/devenir-ambassadeur/**` and `/devenir-influenceur/**` are pretty front-ends. The whitepaper top-30 gap #21 confirms ambassador "Routes redirect" because the role enum and tables are missing. Influencer is even less wired (no creator schema). Fix: create `ambassadors`, `ambassador_referrals`, `creator_submissions`, `creator_engagement` tables; add `ambassador` and `creator` roles; back the candidature endpoints.
*Touches:* `gamification-system/database/migrations/06X_*.sql`, `app/api/ambassadeur/apply/route.ts`, `app/api/influenceur/apply/route.ts`.

### 8. **Per-type partner dashboard variants** — generic dashboard fits no one
Today `/partner/dashboard/page.tsx` shows the same KPIs (CA, teens accueillis, note moyenne) regardless of partner type. A retail partner needs SKU/inventory + offer-redemption stats; a venue needs covers + capacity utilization; a club needs active members + upcoming class roster; a restaurant needs kitchen ticket queue + average prep time; an education partner needs course-enrollment funnel. Whitepaper §9 implies these variants ("Per-type specificity").
*Touches:* `app/partner/dashboard/page.tsx` becomes a router; `app/partner/(retail|venue|club|education|restaurant)/dashboard/page.tsx` per-type.

### 9. **`/teen/partenaires` unified directory** — discovery gap
Teens have no canonical "browse all partners" page. `/teen/offres` is offer-keyed, `/teen/food` is restaurant-keyed, `/teen/mentors` is mentor-keyed. A teen who opens the app saying "what's around me?" lands on the dashboard, not on a partner directory. Whitepaper §17 talks about a unified personalization layer; the discovery shell is missing.
*Touches:* `app/teen/partenaires/page.tsx`, partner-card primitive in `components/teen/`.

### 10. **`/devenir-coach` + `/devenir-teacher` (+ recruitment workspace)** — sub-role onboarding
Coach and teacher are sub-roles of club and education partners (per whitepaper §9), but partners today have no UI to **add staff**. A club partner cannot register their head coach in Nivy; a school cannot register a tutor. Without `partner_staff` UI, the XP-awarding loop (#5) cannot scale beyond owner-as-coach.
*Touches:* `app/partner/staff/page.tsx`, `app/devenir-coach/page.tsx`, `partner_staff` table, `/api/partner/staff/invite`.

### Honourable mentions (not in top 10 but real)

- **DJ workspace** — `/djs/candidature` collects names but DJs have nowhere to manage their gigs/availability.
- **Birthday venue confirmation queue** — venue partners cannot accept/decline incoming `anniv_orders` rows.
- **Marketplace seller verification + AML cap UI** — `/marketplace/sell` ships without the moderation+AML gating mandated in `marketplace-c2c.md`.
- **Partner mobile-PWA install nudge** — partners using the scanner on phones have no PWA install step.
- **Shared partner-card primitive** — every teen-side surface re-implements its own card layout.

---

## Appendix A — File path inventory (referenced)

**Public partner landing & wizard:**
- `app/devenir-partenaire/page.tsx`
- `app/devenir-partenaire/inscription/page.tsx`
- `app/partenaires/merci/` (success)
- `app/devenir-ambassadeur/{page,candidature,programme}/...`
- `app/devenir-influenceur/{page,candidature}/...`
- `app/djs/{page,candidature,[id]}/...`

**Partner registration API:**
- `app/api/partners/register/route.ts` (writes 5+ tables; misses auth.users)

**Authenticated partner workspace:**
- `app/partner/{page,dashboard,offers,scanner,events,transactions,payouts,invoices,kyc,settings,stats,support}/page.tsx`
- `app/partner/restaurant/{menu,orders}/page.tsx`
- `app/api/partner/{verify-card,apply-discount,offers,challenges,restaurant}/...`

**Authenticated mentor workspace:**
- `app/mentor/{dashboard,profile/edit,sessions}/page.tsx`
- `app/api/mentor/{apply,profile,sessions}/...`

**Driver (workspace MISSING):**
- `app/api/driver/rides/...` (back exists)
- `app/admin/drivers/{page,[id]}/...` (admin queue exists)
- (no `app/driver/**`)

**Coach / Teacher (entirely MISSING):**
- (no `app/coach/**`, no `app/teacher/**`, no `/devenir-coach`, no `/devenir-teacher`, no `/partner/awards`, no `/partner/staff`)

**Teen-side discovery:**
- `app/teen/offres/page.tsx` — `recommend_for_teen('partner_offer')`
- `app/teen/food/{page,[partner_id],order/[id]}/...`
- `app/teen/mentors/{page,[id]}/...`
- `app/teen/mentor-sessions/page.tsx`, `app/teen/pathways/page.tsx`, `app/teen/internships/page.tsx`
- `app/teen/rides/{page,request}/...`
- `app/teen/aide-scolaire/page.tsx`, `app/teen/academic/page.tsx`
- `app/clubs/{page,[slug]}/...` (public, not under `/teen/**`)
- `app/djs/{page,[id]}/...` (public, not under `/teen/**`)
- `app/marketplace/{page,listings/[id],my-listings,orders,sell}/...`
- `app/agenda/{page,[id]}/...`

**Parent-side surfaces:**
- `app/parent/food/page.tsx`, `app/parent/rides/{page,[id]}/...`
- `app/api/parent/{food/budget,mentor-sessions,rides}/...`

## Appendix B — Vision docs cross-referenced

`PRODUCT_WHITEPAPER.md` (§1, §9, §14, §15, §17, §22, top-30 gaps), `partner-network.md`, `food-delivery-restaurants.md`, `transport-mobility.md`, `mentorship-career.md`, `marketplace-c2c.md`, `content-creator-economy.md`, `ambassador-referral.md`, `events-lifecycle.md`, `teacher-coach-xp.md`, `birthday.md`, `academic-integration.md`, `search-discovery.md`.

---

*End of C3 audit. Read-only. No code modified.*
