# Birthday / Anniversaires — Vision vs Reality Audit

> Read-only audit. Sources: code under `app/anniversaires/`, `app/admin/anniversaires/`, `features/anniversaires/`, `app/api/admin/anniversaires/`, `lib/emails.ts`, `components/parent/parental-approval-list.tsx`, plus live DB queries against Supabase project `imchornjvmgmaovhypco`.

---

## 1. Founder vision (intended)

Birthdays are intended to be a **first-class** product surface inside Nivy:

- The teen's actual birthday (their `date_of_birth`) should automatically trigger **special XP** (founder mention: ~+500 XP gift), **special rewards**, and possibly **coin bonuses**.
- Friends / crew members should be able to send **birthday wishes**, possibly with an XP gift attached.
- Parents (sponsors) should be able to plan and pay for a **birthday party at a partner venue** — booking + payment, integrated with the partner-network domain.
- A **birthday-organizer flow** should let the teen (or parent) pick a venue, pick a pack, invite friends, and manage RSVPs.
- Likely a **"birthday hub"** page surfacing upcoming birthdays in a teen's circle and the teen's own configurator.
- Privacy: implicit assumption that birthday is at least visible to parents and crew/friends; the teen's exact `date_of_birth` is sensitive (minor) so display rules matter.

---

## 2. What actually exists in code

### 2.a Public configurator — `/anniversaires`
- File: `app/anniversaires/page.tsx` (790 lines, fully built UI).
- 6-step wizard (Date & Guests → Pack → Extras → Personal info → Summary → Confirmation).
- Pulls packs (`getAnnivPacks('event')`), extras (`getAnnivExtras()`), and the parent's teens (`getMyTeens()`).
- Generates a **QR code** on order creation, shows a `booking_reference`, sends a confirmation email via Resend (`sendBirthdayConfirmation` in `lib/emails.ts:415`).
- Pricing: base pack price + `(guest_count - included_guests) × additional_guest_price` + sum of selected extras. No discount logic wired yet (`discount_amount: 0`, comment says "applied later if Pass").

### 2.b Teen-side organizer — `/anniversaires/organiser`
- File: `app/anniversaires/organiser/page.tsx` — Gen-Z styled "Plan thy Legendary Night" page with 3 hard-coded packs (Intimate Crew 3500 DH / Big Bash 5500 DH / Legendary Night 12000 DH).
- Action: `app/anniversaires/organiser/actions.ts → submitBirthdayRequest(...)`.
- Flow:
  1. Verifies teen role from `profiles`.
  2. Looks up the **active parent** via `parent_teen_links`.
  3. Looks up `anniv_packs` by slug.
  4. Inserts an `anniv_orders` row with `status='pending'`, `payment_status='pending'`.
  5. **Creates a `parental_approvals` row** (`approval_type='purchase'`, `request_data.type='birthday'`) so the parent has to validate it.
- Linked from teen home dashboard (`app/teen/home-dashboard-client.tsx:27` — "B-Day" tile pointing to `/anniversaires/organiser`).
- The receiving UI is `components/parent/parental-approval-list.tsx` — it special-cases `request_data.type === 'birthday'` and renders a Cake icon + "Fête d'Anniversaire" label.

### 2.c Domain layer — `features/anniversaires/`
- `schema.ts`: rich Zod schemas for create/cancel/calculate, plus typed `AnnivPack`, `AnnivExtra`, `AnnivOrder`. Supports `order_type: 'event' | 'custom'` (custom = at a partner venue), event_id / venue_id, theme, guest_names array, special_requests, allergies, custom DJ message, cancellation flow.
- `actions.ts`: `getAnnivPacks`, `getAnnivPackById`, `getAnnivExtras`, `getPartnerVenues` (joins `partner_venues → partners`), `calculateAnnivPrice`, `createAnnivOrder` (creates `anniv_orders` + `anniv_order_extras` rows, generates QR, emails parent), `getMyAnnivOrders`, `getAnnivOrderById`, `cancelAnnivOrder`, `updateAnnivPaymentStatus`.

### 2.d Admin dashboard
- `app/admin/anniversaires/page.tsx` — list page.
- `app/admin/anniversaires/[id]/page.tsx` — detail page with status/payment badges, child info (uses `birth_date`), parent info, QR code, pricing summary, status timeline, and `<AnnivOrderActions>` for confirm/cancel/mark-paid.
- API: `app/api/admin/anniversaires/[id]/route.ts` — PATCH for status / payment_status / deposit_amount transitions, GET for full order. Sends a Resend status-update email on confirm/cancel.

### 2.e Navigation
- `components/navbar.tsx` exposes `/anniversaires` with hash sub-links (`#essential`, `#gold`, `#platinum`, `#diamond`, `#galerie`, `#temoignages`, `#faq`) — **none of those anchors actually exist in `app/anniversaires/page.tsx`**. The configurator page has no static "packs gallery" sections matching those slugs.
- `components/footer.tsx`, `components/layouts/mobile-dock.tsx`, `components/layouts/admin-sidebar.tsx`, `components/search/search-modal.tsx` all link to `/anniversaires`.
- `components/onboarding/showcase-step.tsx` advertises birthdays as a tentpole feature.

---

## 3. What actually exists in the DB (live)

Direct queries against `imchornjvmgmaovhypco`:

```
SELECT tablename FROM pg_tables WHERE schemaname='public'
  AND (tablename ILIKE '%anniv%' OR ILIKE '%birthday%' OR ILIKE '%party%');
→ []   (zero rows)
```

Existence probe of every table the code calls:

| Table referenced in code | Exists in DB? |
|---|---|
| `anniv_packs` | **NO** |
| `anniv_extras` | **NO** |
| `anniv_orders` | **NO** |
| `anniv_order_extras` | **NO** |
| `partner_venues` | **NO** |
| `parental_approvals` | **NO** |
| `partners` | yes |
| `partner_discounts` | yes |
| `teens.date_of_birth` (column) | yes |

No DB functions matching `%birth%` or `%anniv%`. No `cron` schema (`pg_cron` not installed) — so no scheduled birthday job is even possible at the DB layer today.

**Conclusion: the entire anniversaires data backbone is missing from the live database.** The configurator UI loads, but every server action fails silently (caught and toasted as "Impossible de charger les formules"). The teen "Send to Sponsor" flow throws on the first `from('anniv_packs')` query. The admin dashboard cannot render any orders.

There is no `users.birth_date` on the auth side and the teen birthday is held only on `public.teens.date_of_birth` (nullable). The admin detail page reads `teen.birth_date` but the column on `teens` is named `date_of_birth` — that JOIN selection (`teen:teen_id (... birth_date ...)`) silently returns null.

---

## 4. Birthday-as-trigger — XP / coin / reward grants

**Status: NOT IMPLEMENTED.** Searched the entire codebase for any combination of `birthday`, `anniversaire`, `date_of_birth`, `birth_date` against `xp`, `coin`, `reward` — no match. There is no:

- cron job (`pg_cron` not enabled, `cron.job` table absent),
- Next.js scheduled route (`app/api/cron/*`) that scans `teens.date_of_birth = today`,
- check-on-load hook in any teen layout / dashboard that compares today's date to `date_of_birth` and grants XP,
- DB function or trigger that listens for the date matching,
- entry in any rewards/economy migration tying birthday to a reward.

Founder-stated "+500 XP birthday gift" exists only as intent. The teen's `date_of_birth` is collected at registration (`features/teens/schema.ts:89`, `features/teens/actions.ts:216`, `app/api/auth/register-teen/route.ts`, `app/api/parent/teens/create/route.ts`) but is **never read back** for anything beyond the optional teen-selector dropdown in the parent-side anniversaire wizard.

## 5. Birthday party planning flow — partner integration

**Status: half-built, dead at the DB layer.**

- The schema (`createAnnivOrderSchema`) supports `order_type: 'custom'` with a required `venue_id` referencing `partner_venues`.
- `getPartnerVenues(city?)` in `features/anniversaires/actions.ts:134` joins `partner_venues → partners`.
- The public configurator (`app/anniversaires/page.tsx`) is currently hard-wired to `getAnnivPacks('event')` only — there is no UI branch for `order_type='custom'` and **no venue picker step**, despite the schema supporting it.
- `partner_venues` table does not exist in DB. So even if the UI exposed venue selection, it would 500.
- Partner side (`components/partners/VenuePartnerForm.tsx`) lets a partner declare `'Anniversaire'` as a package type — the data has nowhere to land.
- Payment: `submitBirthdayRequest` writes `payment_status='pending'` and a `parental_approvals` row, but there is **no payment-capture wiring** (no Stripe / CMI session creation, no link to `app/api/payments/*`). The "Payer maintenant" button in the public configurator just calls `createAnnivOrder` and jumps to a confirmation step — no actual payment is taken.

## 6. Friend invitations / crew notifications

**Status: ABSENT.**

- Schema has `guest_names: string[]` and `guest_count: number` — free-text only, no link to `friends` / `crews` / `profiles`.
- No invitation table, no RSVP table, no notification fan-out to a teen's friend graph.
- The teen home dashboard does not surface "upcoming birthdays in your crew" — no such feed exists.
- No "send a wish" action exists. No XP-gift mechanism between teens.

## 7. Privacy posture

- `teens.date_of_birth` lives on the `teens` table (parent-owned children records). It is **never displayed publicly** in any teen-facing component. The only place it is rendered is `app/admin/anniversaires/[id]/page.tsx` (admin-only, behind `getUserRole() === 'admin'`).
- The configurator collects child age as a free-text input on Step 4, decoupled from the stored `date_of_birth`.
- No RLS policies can be audited because the underlying tables don't exist; once they do exist, RLS for `anniv_orders` will need to enforce parent-only read/write and admin override (current code paths already filter `eq('parent_id', user.id)`).
- Open question: should friends see only "month + day" of a teen's birthday for the wish UX, never the year? Not yet decided in code.

---

## 8. Open questions for the founder

1. **Trigger model**: should the birthday XP/coin grant be a server-side cron (`pg_cron` daily 00:05 Africa/Casablanca scanning `teens.date_of_birth`) or computed on each teen page load with a `birthday_grants` idempotency table? Cron is the standard answer but currently `pg_cron` is not enabled on the project.
2. **Crew notifications**: should friends in the same crew get an in-app notification (and email?) N days before a teen's birthday? If yes, opt-in by the teen?
3. **Venue partners**: which venue partners actually offer party packages today? Is there a curated list, or does any partner with `package_type='Anniversaire'` qualify? Pricing / capacity / age-restriction filters?
4. **Refund policy**: if a parent cancels a `confirmed`/`paid` party, what is the refund schedule (full ≥ 14 days out, 50 % 7 days, 0 % < 48 h)? `cancelAnnivOrder` currently just stamps a reason, no refund hook.
5. **`birth_date` vs `date_of_birth`**: the admin detail page reads `birth_date` but the live column is `date_of_birth` — confirm canonical name and fix admin SELECT.
6. **Two configurators**: `/anniversaires` (parent-facing 6-step) and `/anniversaires/organiser` (teen-facing 2-step) hit the same `anniv_orders` table with overlapping but inconsistent schemas (the teen flow does not collect contact phone, allergies, theme, etc.). Are these meant to merge, or is the teen flow only a "request to parent" stub that always upgrades into the parent flow?
7. **Pass discount**: `discount_amount: 0 // applied later if Pass` in `calculateAnnivPrice`. What is the Pass discount % on anniversaires?

---

## 9. Honest verdict

The birthday surface area in **code** is substantial (~1500 LOC across a public configurator, a teen organizer, an admin dashboard, server actions with Zod validation, QR generation, Resend email templates, and parental-approval integration). The surface area in the **live database is zero** — every single `anniv_*` table and `parental_approvals` is missing, plus the `partner_venues` table the schema depends on. The "birthday as XP-trigger first-class feature" the founder describes is **not started**: no cron, no grant function, no friend-wish UX, no crew feed. Today, the feature is a polished UI shell sitting on a non-existent backend; first actionable steps are (a) ship the missing migrations, (b) reconcile `birth_date` vs `date_of_birth`, (c) decide single-vs-dual configurator, and only then design the auto-XP / friend-wish layer.
