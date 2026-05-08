# D4 — Forms-to-Endpoint Audit

Read-only audit. Scope: every `<form>` (and `useForm()`-driven form) under `app/**` and `components/**`. For each, the submission target was traced and verified against the actual route file (or server action) on disk.

Working dir: `C:\Users\Shadow\Desktop\NIVY`. Date: 2026-05-08. Branch: `main`.

---

## 1. Methodology

1. Grep `<form` and `onSubmit=` across `app/**` + `components/**` (52 forms found).
2. Grep `useForm(` (react-hook-form) — 4 forms (`request-form`, `goal-form`, `partner/offers/new`, `food/menu-cart-client`).
3. Grep `"use server"` — 35 server-action modules (almost entirely under `gamification-system/features/**` + 2 in app: `app/teen/offres/page.tsx` and `app/partner/support/actions.ts` + `features/messages/actions.ts`).
4. For each form, trace `handleSubmit` → final transport. Classify: `fetch /api/...`, `<form action="...">`, server-action import, Supabase client `.insert/.update`, or **stub** (no network call).
5. For each `/api/...` target, `ls` the matching folder under `app/api/...` and verify a `route.ts` exists.

---

## 2. Forms Inventory

Legend: **✓ exists** — route file present; **✓ SA** — server action; **✓ SB** — direct Supabase client write; **✗ MISSING** — phantom; **STUB** — handler does not actually submit anything.

| # | Form (file:line) | Submit target | Method | Verified |
|---|---|---|---|---|
| 1 | `app/auth/login/page.tsx:163` | `supabase.auth.signInWithPassword` (client SDK) | — | ✓ SB |
| 2 | `app/auth/sign-up/page.tsx:114` | `supabase.auth.signUp` (client SDK) | — | ✓ SB |
| 3 | `app/admin/clubs/creer/page.tsx:169` | `supabase.from("clubs").insert(...)` | — | ✓ SB |
| 4 | `app/admin/evenements/creer/page.tsx:156` | `supabase.from("events").insert(...)` | — | ✓ SB |
| 5 | `app/admin/evenements/[id]/modifier/page.tsx:218` | `supabase.from("events").update(...)` | — | ✓ SB |
| 6 | `app/admin/internships/internship-form.tsx:98` | `POST /api/admin/internships` | POST | ✓ exists (`route.ts`) |
| 6b| `app/admin/internships/internship-form.tsx:236` (CloseInternshipButton) | `POST /api/admin/internships/[id]/close` | POST | ✓ exists (`close/route.ts`) — note: file's own JSDoc at L223 says "endpoint is not yet implemented" but the route.ts now exists |
| 7 | `app/admin/ambassadeurs/page.tsx:139` | `POST /api/admin/ambassadors/approve` | POST | ✓ exists |
| 8 | `app/admin/ambassadeurs/page.tsx:147` | `POST /api/admin/ambassadors/reject` | POST | ✓ exists |
| 9 | `app/autorisations/page.tsx:131` | `POST /api/authorizations/revoke` | POST | ✓ exists |
| 10 | `app/autorisations/ajouter/page.tsx:98` | `supabase.from("child_authorizations").insert(...)` | — | ✓ SB |
| 11 | `app/notifications/page.tsx:41` | `POST /api/notifications/mark-all-read` | POST | ✓ exists |
| 12 | `app/notifications/page.tsx:100` | `POST /api/notifications/mark-read` | POST | ✓ exists |
| 13 | `app/notifications/page.tsx:112` | `POST /api/notifications/delete` | POST | ✓ exists |
| 14 | `app/reservation/page.tsx:78` | `POST /api/bookings/create` | POST | ✓ exists (`bookings/create/`) |
| 15 | `app/teen/create/page.tsx:57` | `POST /api/teen/feed/submissions` | POST | ✓ exists |
| 16 | `app/teen/food/[partner_id]/menu-cart-client.tsx:310` | `POST /api/teen/food/order` | POST | ✓ exists |
| 17 | `app/teen/internships/page.tsx` (`<form method="GET">` filter) | self (search params) | GET | ✓ same-page |
| 18 | `app/teen/mentors/page.tsx` (`<form method="GET">` filter) | self | GET | ✓ same-page |
| 19 | `app/marketplace/page.tsx:72` (`<form method="GET">` filter) | self | GET | ✓ same-page |
| 20 | `app/marketplace/sell/sell-form.tsx:49` | `POST /api/marketplace/listings` | POST | ✓ exists |
| 21 | `app/teen/offres/page.tsx:407` | server action `trackAndGo` (in same file) | — | ✓ SA (file uses `"use server"`) |
| 22 | `app/teen/mentors/[id]/book-mentor-session-button.tsx:192` | `POST /api/teen/mentor-sessions/book` | POST | ✓ exists |
| 23 | `app/teen/rides/request/request-form.tsx:105` | `POST /api/teen/rides/request` | POST | ✓ exists |
| 24 | `app/mentor/profile/edit/profile-form.tsx:80` | `PATCH /api/mentor/profile` | PATCH | ✓ exists |
| 25 | `app/partner/offers/new/page.tsx:244` | `POST /api/partner/offers` | POST | ✓ exists |
| 26 | `app/partner/support/new-ticket-form.tsx:40` | server action `createPartnerSupportTicket` (`./actions.ts`) | — | ✓ SA |
| 27 | `app/parent/topup/manual/manual-topup-form.tsx:94` | `POST /api/parent/topup/manual` | POST | ✓ exists |
| 28 | `app/djs/candidature/page.tsx:125` | **STUB** — only `console.log` + `alert` | — | ✗ STUB |
| 29 | `app/devenir-influenceur/candidature/page.tsx:99` | **STUB** — only `console.log` + `alert` | — | ✗ STUB |
| 30 | `components/dashboard/header.tsx:144` | `POST /auth/signout` | POST | ✗ **MISSING** (no `app/auth/signout/`, no `app/api/auth/signout/`) |
| 31 | `components/club-enrollment-form.tsx:115` | `supabase.from("club_enrollments").insert(...)` | — | ✓ SB |
| 32 | `components/reservation-form.tsx:95` | `supabase.from("bookings").insert(...)` | — | ✓ SB |
| 33 | `components/review-form.tsx:51` | `supabase.from("reviews").insert(...)` | — | ✓ SB |
| 34 | `components/authorization-form.tsx:98` | `POST /api/authorizations/create` | POST | ✓ exists |
| 35 | `components/ambassador-application-form.tsx:72` | `supabase.from("ambassadors").insert(...)` | — | ✓ SB |
| 36 | `components/ambassador/withdrawal-form.tsx:94` | `POST /api/ambassador/withdrawals` | POST | ✓ exists |
| 37 | `components/parent/add-teen-form.tsx:597` | `POST /api/parent/teens/create` (+ `/api/upload/avatar`) | POST | ✓ exists (both) |
| 38 | `components/parent/allowance-form.tsx:221` | `POST /api/parent/allowances` | POST | ✓ exists |
| 39 | `components/parent/budget-limit-form.tsx:93` | `POST /api/parent/budget` | POST | ✓ exists |
| 40 | `components/parent/chore-form.tsx:214` | `POST /api/parent/chores/create` | POST | ✓ exists |
| 41 | `components/parent/goal-match-form.tsx:47` | `POST /api/parent/savings/match` | POST | ✓ exists |
| 42 | `components/parent/sponsor-challenge-form.tsx:69` | **STUB** — `setTimeout` + `toast.success` only, no fetch/SA | — | ✗ STUB |
| 43 | `components/teen/profile-edit-form.tsx:92` | `PATCH /api/teen/profile` | PATCH | ✓ exists |
| 44 | `components/teen/goal-form.tsx:90` | `POST /api/teen/savings/goals` | POST | ✓ exists |
| 45 | `components/teen/chat-window.tsx:213` | `POST /api/teen/messages` | POST | ✓ exists |
| 46 | `components/circles/circles-list.tsx:631` | `POST /api/teen/circles` | POST | ✓ exists |
| 47 | `components/creativity/creations-gallery.tsx:1035` (UploadModal) | `POST /api/teen/creativity/creations` | POST | ✓ exists |
| 48 | `components/education/grades.tsx:151` | `POST /api/teen/education/grades` | POST | ✓ exists |
| 49 | `components/onboarding/teen-setup-step.tsx:295` | `POST /api/auth/register-teen` | POST | ✓ exists |
| 50 | `components/onboarding/parent-setup-step.tsx:184` | `supabase.auth.signUp` (client SDK) — see file L74 handler | — | ✓ SB |
| 51 | `components/teen/dashboard/ai-companion.tsx:325` | `POST /api/agent/action` (via `useAIChat`) | POST | ✓ exists (`agent/action/`) |
| 52 | `components/ai/elite-ai-companion.tsx:514` | `POST /api/agent/action` (via `useAIChat`) | POST | ✓ exists |
| 53 | `components/ai/AgentSheet.tsx:261` | `POST /api/agent/action` (via `useAIChat`) | POST | ✓ exists |
| 54 | `components/features/home/newsletter-form.tsx:59` | `POST /api/newsletter/subscribe` | POST | ✓ exists |
| 55 | `components/forms/csrf-aware-form.tsx:23` | (wrapper — not a real form, just a CSRF-injecting component) | — | n/a |
| 56 | `components/ui/forms/secure-form.tsx:76` | (wrapper component — caller-provided `action`) | — | n/a |
| 57 | `components/examples/secure-form-examples.tsx:398` | demo — not in any route | — | n/a |
| 58 | `components/parent/mentor-session-row.tsx:225` (confirm dialog form) | parent-side server flow (sibling component) | — | n/a (UI confirm) |

`useForm()` users (already counted above): `app/teen/rides/request/request-form.tsx`, `components/teen/goal-form.tsx`, `app/partner/offers/new/page.tsx`, `app/teen/food/[partner_id]/menu-cart-client.tsx`. All four route to existing `/api/...` endpoints.

---

## 3. Phantom Forms (real bugs)

These forms post to a target that **does not exist on disk**. Submitting them in production results in a 404 or no-op.

### 3.1 Logout button — phantom endpoint

- **File:** `components/dashboard/header.tsx:144`
- **Target:** `<form action="/auth/signout" method="post">`
- **Reality:**
  - `app/auth/signout/` — does not exist
  - `app/api/auth/signout/` — does not exist
  - Only signout reference in `app/**` is `app/teen/profile/profile-hub-client.tsx` (which calls `supabase.auth.signOut()` directly via SDK, NOT a POST form)
- **Impact:** clicking "Déconnexion" in the dashboard header POSTs to a 404. Users cannot log out from this surface.
- **Fix:** either create `app/auth/signout/route.ts` (POST handler that calls `supabase.auth.signOut()` then `redirect("/")`), or replace the `<form>` with an `onClick` calling `supabase.auth.signOut()`.

### 3.2 STUB forms (silent black holes — UI lies to user)

These render full forms with submit buttons that **do nothing real**. The user sees a success toast/alert but no data is persisted anywhere.

| File:line | What it pretends to do | What it actually does |
|---|---|---|
| `app/djs/candidature/page.tsx:125` (handler L77-L90) | Submit DJ application | `console.log(formData)` + `alert("Candidature envoyée…")` |
| `app/devenir-influenceur/candidature/page.tsx:99` (handler L59-L73) | Submit influencer application | `console.log(formData)` + `alert("Candidature envoyée…")` |
| `components/parent/sponsor-challenge-form.tsx:69` (handler L19-L27) | Sponsor a quest for teen | `setTimeout(1500ms)` then `toast.success("DÉFI LANCÉ…")`. No fetch, no Supabase, no server action. |

These are technically not "phantom endpoints" (they don't reference any URL) but they are **phantom features** — UI surfaces that promise persistence and deliver none. Listed here because they fail the same intent as the audit (form claims to submit; submission never reaches a backend).

### 3.3 Self-acknowledged gap (no longer a bug)

- `app/admin/internships/internship-form.tsx` JSDoc at L219-L224 says `/api/admin/internships/[id]/close` "is not yet implemented." The route file `app/api/admin/internships/[id]/close/route.ts` **does now exist** — the comment is stale documentation, not a real phantom. Recommend dropping the warning comment.

---

## 4. Server-Action Coverage Report

Forms that reach a backend (excluding 3 STUBs and 1 phantom and the 4 wrappers/demos): **51 real-submitting forms**.

| Transport | Count | % |
|---|---|---|
| `fetch /api/...` (REST) | 28 | 55% |
| Direct Supabase client call (`createClient()` + `.insert/.update/.signUp`) | 11 | 22% |
| `<form action="/api/...">` native POST | 8 | 16% |
| Server Action (Next.js `"use server"`) | 2 | 4% |
| `<form method="GET">` filter (no real submission) | 3 | 6% (excluded from totals) |

**Server-action adoption: 2 / 51 = ~4%.** The two are:
- `app/partner/support/new-ticket-form.tsx` → `createPartnerSupportTicket` in `./actions.ts`
- `app/teen/offres/page.tsx` → `trackAndGo` (inline server action declared in the same RSC file)

The vast bulk of `"use server"` files (33 of 35) live under `gamification-system/features/**/actions.ts` — a parallel package whose actions are **not wired to any visible form** in the discovered inventory. They are exported but, based on the form sweep, none of the 58 forms in `app/**` + `components/**` import from `gamification-system/features/*/actions.ts`. This means the gamification server-action surface is dead weight from a form-submission perspective (it may still be called from RSC bodies — out of scope for D4).

### Notable patterns

- **Direct-Supabase forms (22%)** — including login/signup, club enrollment, ambassador application, reviews, bookings, admin club/event create-edit, autorisations/ajouter — bypass any API layer. They rely entirely on RLS for authorization. This is fine for auth flows but risky for the admin-side `clubs`/`events` `INSERT/UPDATE` (admin-write check is implicit in RLS rather than explicit in a server route).
- **Native `<form action="/api/...">` (16%)** — used in the notifications page, admin/ambassadeurs, autorisations list, reservation page. These rely on server-side redirect handling and won't show client-side error UI.
- **Mixed transport on the same surface** — `components/dashboard/header.tsx` uses native `<form action>` for signout (broken — see §3.1), while `app/teen/profile/profile-hub-client.tsx` uses the SDK directly. No standard logout pattern.

---

## 5. Summary

- **Total forms discovered:** 58 (incl. 3 wrappers/demos and 3 GET-filter forms not counted as "submitting").
- **Forms with a real backend target:** 51.
- **Phantom endpoint bugs:** **1** (logout in dashboard header → `/auth/signout` 404).
- **Phantom features (UI-only stubs):** **3** (DJ candidature, Influencer candidature, Sponsor Challenge form).
- **Server-action adoption:** ~4% (2 of 51). The codebase is overwhelmingly REST-fetch first with a substantial direct-Supabase tail.
- **Recommended priority fixes:**
  1. Wire `components/dashboard/header.tsx` signout to either a real `app/auth/signout/route.ts` POST handler or a client-side `supabase.auth.signOut()`.
  2. Implement (or remove from UI) the DJ + Influencer candidature pages and the parent SponsorChallengeForm — currently they accept user data and discard it.
  3. Remove stale "endpoint not yet implemented" comment in `app/admin/internships/internship-form.tsx:219-224` (route now exists).
