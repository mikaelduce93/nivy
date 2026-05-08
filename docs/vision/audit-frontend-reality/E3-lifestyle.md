# E3 — Teen Lifestyle Flows Audit (Rides, Food, Mentors, Career)

**Auditor:** Agent E3 (read-only)
**Date:** 2026-05-08
**Scope:** `app/teen/{rides,food,mentors,internships,pathways,mentor-sessions}` and the supporting API + admin/parent/partner/driver/mentor surfaces.
**Prior verdict (Wave-3 V1.2-Sprint):** "🔴 mobile FAIL" + "stub-grade UX". This audit verifies what shipped since.

---

## Executive verdict

The lifestyle backend is **substantively real** — every flow has a typed RPC behind it, a verify-script that exercises the happy path end-to-end (`scripts/verify-{transport,food,mentorship}.ts`), and parental approval / RLS / cron-curfew rails wired up. The teen-side UI is also genuinely shipped (no placeholder pages); discovery, cart, booking, application all work and are mobile-aware (44px touch targets, `PullToRefresh`, view-transitions, optimistic mutations, Celebrate bursts).

**The hole is supply, not code.** The only seeded row in any lifestyle table is *one* `partners` row at `status='pending'` (`scripts/seed-e2e-data.ts`) — and even that one is pending, so the discovery query (`status='active'`) returns it as zero. There is **no seed data** for `mentors`, `nivy_drivers`, `menu_items`, or `internships`. Teen-side discovery pages will all render the EmptyState until production ops manually onboard real supply, and **there is no self-serve onboarding UI for any of the three supplier personas** (driver, restaurant partner, mentor *almost* has one — see below).

So: code ≈ 7/10, content/supply ≈ 1/10. The Wave-3 "stub-grade UX" complaint is no longer fair to the *UI*; it is fair to the *catalog*.

---

## Per-flow scoring (out of 10)

| Flow | Score | One-line verdict |
|---|---|---|
| **Rides — request → match → completion** | **7/10** | Real RPC pipeline (`request_ride` → `approve_ride` → `dispatch_ride` → `track` → `complete_ride`), cron-curfew enforcement live, RLS proven, but no driver fleet seeded, no driver self-register UI, no map preview before submit, no location autocomplete (free-text addresses only), and no provider toggle UI (defaults to `nivy_partner` regardless of choice). |
| **Food — browse → menu → cart → checkout → tracking → review** | **6.5/10** | Cleanest flow technically: optimistic order runner with rollback, halal/nutrition filters wired to challenges, paired-ledger RPC verified, status timeline + Celebrate on delivery. But: zero active partners seeded, no images in `menu_items` UI (`image_url` selected but never rendered on teen menu), checkout schema has no min-cart guard (cartCount===0 only client-disable), and **no review/rating step after delivery** — the flow just ends at the celebrate. |
| **Mentors — browse → book → session → review** | **7/10** | Full safety stack present: KYC gate, parental approval, recording-consent checkbox blocking submit, age-band enforcement, abuse-report route. Booking dialog is the most polished surface (consent UX, juice + Celebrate, error translation). Holes: zero approved mentors seeded, mentor self-application has an API (`POST /api/mentor/apply`) but **no public landing page or signup flow** that reaches it, and rating UI is stubbed at the API layer (`/rate` route exists but **no client component on the teen side actually calls it** post-session). |
| **Internships — browse → apply** | **6/10** | List + filters + apply RPC + parental approval all real. Card has a "Voir les details" button but **no detail page** (`app/teen/internships/[id]/` does not exist) — apply is gated by `apply_to_internship` RPC, but the teen has nowhere to read the long-form description / submit a cover letter from the UI. Also: zero internships seeded; `/api/admin/internships` POST exists, but only admins can create them — there is no partner-side "post a stage" form. |
| **Pathways — declare + see mentors/internships** | **6.5/10** | Five seeded pathways (the only seeded lifestyle catalog: `medicine, engineering, arts, business, law` from migration 059). Declare flow works, progress bar reads `teen_pathway_progress`. But milestones are static (`total_milestones=10` default, never incremented anywhere — the cross-link to mentors/internships doesn't move the counter), and `recommended_quiz_ids` / `recommended_partner_ids` array columns are populated by no migration and surfaced by no UI. |

**Aggregate lifestyle score: ~6.6/10** — solid plumbing, hollow catalog, missing supplier-side onboarding.

---

## Backend reality check — what's *actually in the database*?

I cannot hit the live DB from here, but the ground truth is recoverable from migrations + seed scripts:

| Table | Seeded by migration? | Seeded by scripts? | Result for `teen.amine` discovery |
|---|---|---|---|
| `career_pathways` | ✅ Migration 059 lines 286–292: 5 rows (`medicine, engineering, arts, business, law`), `is_active=true` | n/a | **5 cards visible.** `/teen/pathways` is the *only* lifestyle surface that is non-empty out of the box. |
| `partners` (food) | ❌ none | ⚠️ `scripts/seed-e2e-data.ts` line 308 inserts ONE partner — but `status='pending'` and `sub_category=null` | **0 cards.** `/teen/food` filters on `status='active' AND sub_category IN (restaurant,cafe,...)`. The pending E2E partner is invisible. `verify-food.ts` UPDATEs that partner to active+restaurant before testing. |
| `menu_items` | ❌ none | ⚠️ `verify-food.ts` creates 3 ephemeral items then leaves them — but only on the verify run | **0 items.** Even if you visit a partner page directly (which you can't, see above), the menu list is empty. |
| `mentors` | ❌ none | ⚠️ `verify-mentorship.ts` creates an ephemeral mentor + auto-cleans on exit | **0 cards.** `/teen/mentors` filters `status='active' AND kyc_status='approved'`. EmptyState forever. |
| `nivy_drivers` | ❌ none | ⚠️ `verify-transport.ts` same pattern — ephemeral + cleanup | **No matchable drivers.** A teen *can* request a ride (it goes to `status='requested'` then waits for parent + dispatcher), but it will never be dispatched without a real driver row. |
| `internships` | ❌ none | ❌ none — even verify-script deletes its insert | **0 cards.** `/teen/internships` shows EmptyState forever. |
| `teen_pathway_progress` | n/a | n/a | 0 rows for any teen until they tap "Declarer" — works as designed. |

**Bottom line:** the test teen account (`teen.amine` UUID `37ff4a09-25ca-44c2-a313-141ab6d7e1b9`) sees **5 pathway cards and four EmptyStates**. Demo / pitch / user-test of the lifestyle surfaces requires running all three verify-scripts back-to-back AND removing their cleanup blocks, OR building a one-shot `seed-lifestyle.ts` script.

---

## Top broken / missing per flow

### Rides
1. **No driver fleet to dispatch to.** The cleanest visible failure mode in production: teen requests, parent approves, then the ride sits forever in `status='approved'` because the admin has no drivers to dispatch. There is no "no drivers available" UX path.
2. **Address fields are free-text.** `request-form.tsx` uses plain `<Input>` with `autoComplete="street-address"`. No geocoding, no map picker, no Casablanca POI suggestions — so `pickup_lat/lng` are always `null`, breaking the matching/tracking primitives that the schema and `ride_tracks` table assume.
3. **Provider selector missing.** API accepts `provider: careem | heetch | nivy_partner | public_transport` but the form only ships payment method; provider is hard-coded to `nivy_partner` server-side.
4. **No driver-side UI at all.** `/api/driver/rides/[id]/{dispatch,track,complete}` routes exist but `app/driver/` directory does not exist. A driver with `is_active=true` cannot log into anything; they would need a separate mobile app or curl.
5. **Curfew override flag is parent-only and there's no parent UI to set it** — the checkbox is in the API contract (`curfewOverride`) but no parent surface exposes it. Cron will silently cancel any approved ride past 22:00 local.

### Food
1. **No restaurant catalog.** Single biggest gap.
2. **Image URL ignored.** `menu_items.image_url` is selected by the menu page but the `MenuCartClient` JSX never renders an `<img>` — every item is a text-only card. Spec'd, schema'd, but invisible.
3. **No post-delivery review/rating loop.** `/teen/food/order/[id]` ends at the Celebrate burst; there is no "rate this order" component. Compare to mentors which at least has the rating *route* (also unhooked).
4. **`paymentMethod=split`** appears in API doc but UI only offers `coins | dh`.
5. **Parent override of nutrition_challenge** has no UI. Challenges are created via SQL only (no parent-side form to express "halal_only=true").

### Mentors
1. **No mentor catalog**, and importantly no path to *acquire* one — `/api/mentor/apply` exists but `/become-mentor` (or any equivalent public page) does not. Mentors must be created via the API directly or by an admin via SQL.
2. **Rating loop incomplete on teen side.** `POST /api/teen/mentor-sessions/[id]/rate` exists; `/teen/mentor-sessions/page.tsx` shows a `rating_by_mentee` field in the row but no "rate this session" button when `status='completed'` and `rating_by_mentee IS NULL`.
3. **No meeting-link surfacing in the booking confirmation.** `mentor_sessions.meeting_url` is selected on the sessions list page but never rendered in the row card; teen has no way to *join* an approved session from the app.
4. **Reporting UX is API-only.** `/api/teen/mentor-sessions/[id]/report` works (validated, RLS-checked) but no client component triggers it.
5. **`amount_coins_debited` on parent_approve_session for non-intro is plumbed but no UI explains the cost** to the teen *at booking time* beyond a single "Estimation" line — and it shows DH only, not the coin equivalent that will actually be debited.

### Internships
1. **Detail page does not exist.** `app/teen/internships/[id]/page.tsx` is missing. The card's "Voir les details" link goes nowhere. Apply RPC is unreachable from the UI.
2. **Cover-letter / portfolio fields not collected.** `apply_to_internship` RPC takes `p_cover_letter` + `p_portfolio_urls`; UI sends nothing.
3. **`required_skills` is selected but unused on teen card** beyond a `.slice(0,3)` chip — there is no skill matching with teen's `interests` from personalization-engine (Wave 1 P0+).
4. **No partner-side post-an-internship flow.** Only `app/admin/internships/` can post.

### Pathways / Career
1. **Milestones are decorative.** `total_milestones=10` is hard-coded in the schema default; there is no `pathway_milestones` table, no RPC to advance them, no XP/coin reward when one is hit. The progress bar will stay at 0/10 forever.
2. **`recommended_quiz_ids` / `recommended_partner_ids` arrays are empty for every seeded pathway** (migration 059 only sets `slug, title, description, icon, category`).
3. **No detail page per pathway.** `/teen/pathways/[slug]/page.tsx` doesn't exist; the card just deep-links to filtered mentors/internships, which (per above) are also empty.

---

## Missing supplier-onboarding flows

This is the report's most important section: **how does new lifestyle supply enter the platform?** Today, only one of the three personas has *any* path that doesn't require a developer with SQL access.

| Supplier persona | Self-serve signup? | Backoffice UI? | API exists? | Verdict |
|---|---|---|---|---|
| **Restaurant / Food partner** | ❌ no `/become-partner` page, no `/partner/signup` form | ⚠️ `app/partner/restaurant/menu/` lets a *partner who already has a `partners` row* manage their menu — but the row has to be inserted manually by an admin or via auth-trigger | ❌ no `POST /api/partner/restaurant/onboard` route — only menu/order management routes | **Missing onboarding entirely.** A real restaurant cannot list itself. |
| **Driver (transport)** | ❌ no `/become-driver` page | ⚠️ `app/admin/drivers/` lets an admin approve KYC, but there's no admin "create driver" form either — admins can only view/approve rows that someone else already INSERTed | ✅ `POST /api/admin/drivers/[id]/approve` exists, but no `POST /api/driver/apply` | **No driver registration UI at all.** Drivers must be SQL-INSERTed by hand. |
| **Mentor** | ❌ no `/become-mentor` public page | ⚠️ `/mentor/profile/edit` *will* show the form to a logged-in user with `role='mentor'`, but a normal user cannot self-elevate to that role from the app — the role flip is manual or via auth metadata at signup | ✅ `POST /api/mentor/apply` works (calls `apply_mentor` RPC, creates `mentors` row in pending state with KYC placeholder) | **API done, public funnel missing.** Closest of the three to working — needs only a public landing page that lets an authed adult opt into the mentor role and POST to apply. |
| **Internship-poster** | ❌ no path | ✅ `/admin/internships` form (admins only) | ✅ `POST /api/admin/internships` | **Admin-only.** Partners cannot post their own stages even if they have a `partners` row; only the Nivy team can. |

**Recommended P0 supplier-funnel additions** (in order of cheapest unlock):
1. `/become-mentor` page → wraps existing `apply_mentor` RPC, adds KYC document upload to the existing private bucket. **~1 day of work, the API is already done.**
2. `/become-driver` page → needs the API endpoint built (currently zero) and KYC docs flow. **~3 days.**
3. Partner self-onboarding (`/become-partner` for restaurants) → biggest gap, needs the API + a verification/approval queue + bank-payout details. **~1 week.**
4. Partner-side "post an internship" form gated to a partner with `status='active'`. **~1 day** (reuse `/admin/internships` form).

---

## Notable strengths worth preserving

- **Parental-approval safety stack is real and consistent** across all three flows: rides, food (when challenge-violating), mentor sessions all enqueue `parental_approvals` rows with the right `action_type`/`resource_type` discriminators. Verify-scripts confirm RLS + status transitions.
- **Optimistic mutation pattern** (`useOptimisticRunner` with `onMutate/onError/onSuccess`) is used consistently in food cart and mentor booking — best-in-class teen UX. Rollback restores the cart on failure.
- **Recording consent is correctly defaulted to FALSE** and the booking submit is disabled until the teen ticks it (mentor flow). That's a real safety win that the V1.2 sprint reports flagged as missing.
- **Cron curfew check** (`/api/cron/ride-curfew-check` registered in `vercel.json` at `0 21 * * *`) is wired and writes to `admin_audit_logs`.
- **Mobile polish on the *teen* discovery surfaces** is genuinely done: 44px min-height controls, `H1` primitives, design-system tokens, view-transitions on card→detail, EmptyState components, PullToRefresh wrapper. The "🔴 mobile FAIL" Wave-3 verdict no longer applies to the teen-facing screens. (The parent/admin/mentor surfaces still lean on raw `bg-zinc-950` / `text-white` — see `app/teen/mentor-sessions/page.tsx` and `app/mentor/dashboard/` — those have NOT been polished.)

---

## Files referenced

Teen UI:
- `C:\Users\Shadow\Desktop\NIVY\app\teen\rides\page.tsx`
- `C:\Users\Shadow\Desktop\NIVY\app\teen\rides\request\request-form.tsx`
- `C:\Users\Shadow\Desktop\NIVY\app\teen\food\page.tsx`
- `C:\Users\Shadow\Desktop\NIVY\app\teen\food\[partner_id]\menu-cart-client.tsx`
- `C:\Users\Shadow\Desktop\NIVY\app\teen\food\order\[id]\page.tsx`
- `C:\Users\Shadow\Desktop\NIVY\app\teen\mentors\page.tsx`
- `C:\Users\Shadow\Desktop\NIVY\app\teen\mentors\[id]\page.tsx`
- `C:\Users\Shadow\Desktop\NIVY\app\teen\mentors\[id]\book-mentor-session-button.tsx`
- `C:\Users\Shadow\Desktop\NIVY\app\teen\mentor-sessions\page.tsx`
- `C:\Users\Shadow\Desktop\NIVY\app\teen\internships\page.tsx`
- `C:\Users\Shadow\Desktop\NIVY\app\teen\pathways\page.tsx`

Teen API:
- `C:\Users\Shadow\Desktop\NIVY\app\api\teen\rides\{request,route,[id]/cancel}\route.ts`
- `C:\Users\Shadow\Desktop\NIVY\app\api\teen\food\{restaurants,menu/[partner_id],order}\route.ts`
- `C:\Users\Shadow\Desktop\NIVY\app\api\teen\mentor-sessions\{book,[id]/rate,[id]/report}\route.ts`
- `C:\Users\Shadow\Desktop\NIVY\app\api\teen\internships\{route,[id]/apply}\route.ts`
- `C:\Users\Shadow\Desktop\NIVY\app\api\teen\pathways\{route,[slug]/declare}\route.ts`

Driver / mentor / partner / admin / parent:
- `C:\Users\Shadow\Desktop\NIVY\app\api\driver\rides\[id]\{dispatch,track,complete}\route.ts` (no `app/driver/` UI)
- `C:\Users\Shadow\Desktop\NIVY\app\api\mentor\{apply,profile,sessions/route,sessions/[id]/complete}\route.ts`
- `C:\Users\Shadow\Desktop\NIVY\app\mentor\{dashboard,profile/edit,sessions}\page.tsx`
- `C:\Users\Shadow\Desktop\NIVY\app\partner\restaurant\{menu,orders}\page.tsx`
- `C:\Users\Shadow\Desktop\NIVY\app\admin\{drivers,mentors,internships}\page.tsx`
- `C:\Users\Shadow\Desktop\NIVY\app\api\admin\{drivers,mentors,internships}\**\*.ts`
- `C:\Users\Shadow\Desktop\NIVY\app\api\cron\ride-curfew-check\route.ts`
- `C:\Users\Shadow\Desktop\NIVY\app\parent\{rides,food}\page.tsx`

Backend / seed:
- `C:\Users\Shadow\Desktop\NIVY\gamification-system\database\migrations\057_transport_mobility.sql` (+ `_rpcs.sql`)
- `C:\Users\Shadow\Desktop\NIVY\gamification-system\database\migrations\058_food_delivery.sql` (+ `_rpcs.sql`)
- `C:\Users\Shadow\Desktop\NIVY\gamification-system\database\migrations\059_mentorship_career.sql` (+ `_rpcs.sql`) — **only seeded lifestyle catalog: career_pathways x5**
- `C:\Users\Shadow\Desktop\NIVY\gamification-system\database\migrations\064_mentorship_safety.sql`, `065_book_mentor_session_consent.sql`, `069_v12_mentorship_api_gaps.sql`
- `C:\Users\Shadow\Desktop\NIVY\scripts\verify-{transport,food,mentorship}.ts` — exhaustive happy-path coverage
- `C:\Users\Shadow\Desktop\NIVY\scripts\seed-e2e-data.ts` — only inserts ONE partner (status=pending)
- `C:\Users\Shadow\Desktop\NIVY\vercel.json` — cron registry
