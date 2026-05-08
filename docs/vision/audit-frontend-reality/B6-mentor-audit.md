# B6 — Mentor role frontend audit

**Date:** 2026-05-08
**Method:** READ-ONLY. Read top ~60 lines of every `app/mentor/**/page.tsx` + nav/layout/header. Cross-reference `docs/vision/PRODUCT_WHITEPAPER.md` §19.4.7 + `docs/vision/mentorship-career.md` (the canonical mentor spec).
**Scoring scale:** 0 (absent) → 10 (matches spec, production-ready).

---

## Section 1 — Mentor nav + expected flow

### 1.1 What ships today

**Layout** (`app/mentor/layout.tsx`):
- Role-gates on `userInfo.role !== "mentor"` (renders 403 panel with "Accès refusé" if not mentor).
- Renders `MentorHeader` + `MentorSidebar` + main content. Standard chrome.

**Sidebar nav** (`components/dashboard/mentor/sidebar.tsx`, lines 13–18):
```
Dashboard           → /mentor/dashboard
Sessions            → /mentor/sessions
Profil              → /mentor/profile/edit
Disponibilités      → /mentor/availability   ← LINK ONLY, no page exists
```

**Header** (`components/dashboard/mentor/header.tsx`):
- Logo "Nivy / Mentor", full name, status pill (`pending` / `active` / `paused` / `suspended` / `rejected`), avatar dropdown with "Mon profil" + "Déconnexion".
- Status surfaces correctly from `userInfo.mentorData?.status`.

**Pages that exist** (3):
1. `app/mentor/dashboard/page.tsx`
2. `app/mentor/sessions/page.tsx`
3. `app/mentor/profile/edit/page.tsx`

### 1.2 Expected flow (from `mentorship-career.md` §SPEC + §6 Trust & Safety)

A mentor's daily loop should be:

1. **Onboard / KYC** — apply → upload CIN + selfie + extrait de casier judiciaire vierge + 2 references + intro video → admin reviews → tier `pending → intro_only → active`. The platform requires this gate before any mentee contact.
2. **Profile setup** — bio, expertise tags, years of experience, hourly rate (DH), free-intro toggle, age range of mentees (`age_min_mentee`, `age_max_mentee`), intro video URL.
3. **Availability calendar** — publish bookable slots so teens can pick a time. Spec implies this surface but does not pin a specific schema (no `mentor_availability` table is in the SQL contract).
4. **Browse incoming requests** — approve / deny `mentor_sessions` rows that arrived in `requested` / `parent_pending` / `pending_approval` state.
5. **Session prep** — see upcoming sessions (mentee profile, parental consent state, intro vs paid, parent-attended flag, meeting URL).
6. **Run the session** — meeting URL + recording + on-screen consent disclosure (first session ALWAYS recorded, ALWAYS parent-attended).
7. **Post-session** — bilateral rating, notes, mark complete → coins/DH credited.
8. **Earnings dashboard** — DH revenue, coin payouts, wallet/withdrawal flow, tax invoice/receipt.
9. **Reviews** — see mentee ratings + comments, surface trust score (`nivy_trust_score`).
10. **Safety surface** — see strike count, see code-of-conduct, one-tap report (incoming).
11. **Messaging window** — chat with mentee only inside `[scheduled_for - 30min, scheduled_for + duration + 30min]` per spec §6.

### 1.3 Reality vs expected

| Expected surface | Shipped? | Notes |
|---|---|---|
| Dashboard (KPIs, upcoming, earnings glance) | YES (partial) | `app/mentor/dashboard/page.tsx` queries `mentor_sessions` for upcoming + completed + denied counts, surfaces rating + coins/DH. |
| Sessions list (pending / upcoming / done / denied) | YES | `app/mentor/sessions/page.tsx` with filter chip on `status`. |
| Profile edit (bio, tags, rate, age range, intro URL) | YES | `app/mentor/profile/edit/page.tsx` + form. |
| Availability calendar | NO | Sidebar links to `/mentor/availability`; no `app/mentor/availability/page.tsx` exists → 404. |
| Onboarding / KYC submission UI | NO | Empty-state on dashboard tells unboarded mentor to "Compléter mon profil"; profile-edit empty state references `/api/mentor/apply` as raw API. No KYC upload UI, no reference-call workflow, no intro-video uploader. |
| Earnings / payouts page | NO | Dashboard surfaces rolled-up DH/coin numbers but there is no dedicated earnings/withdrawal/invoice page. |
| Reviews page (mentee feedback) | NO | Rating values shown numerically; no review-list/comments surface. |
| Messaging surface (constrained window) | NO | No `/mentor/chat` or session-window chat anywhere in `app/mentor/**`. |
| Strike / safety surface | NO | Status pill in header is the only signal; no strike count, no code-of-conduct page, no report-flow visibility. |
| Browse-by-teens (mentor side) | N/A | Spec is teen-initiated discovery; mentors do not browse teens (correct by design — adult-teen 1-to-1 risk surface). |

---

## Section 2 — Scoring per page

### 2.1 `/mentor/dashboard` — score **6 / 10**

**File:** `app/mentor/dashboard/page.tsx`

**What works:**
- Auth + role guard correct (login → redirect → role check).
- Empty-state handling for "mentor row missing" with deep-link to profile edit (lines 24–43).
- Three parallel Supabase queries: upcoming (approved/dispatched), completed history, denied count. Schema-correct against `mentor_sessions` columns.
- KPI surfaces: upcoming sessions, completed history, rating, coins/DH (inferred from `amount_dh`).
- Iconography matches the spec aesthetic (`CalendarCheck`, `Star`, `Wallet`, `ShieldAlert`, `Hourglass`).

**What is missing or wrong:**
- No `pending_approval` queue rendered on the dashboard (mentor must navigate to `/mentor/sessions?status=pending_approval` to see incoming requests; this is the highest-priority action and should be top-of-fold).
- No KYC progress card (mentor can be `kyc_status='not_started'` with no nudge to upload documents).
- No earnings breakdown (gross / net / pending payout) — only a coarse total.
- No strike / safety surface despite this being a HIGH-RISK role.
- No "next session in" countdown nor "join meeting" CTA for sessions starting within the hour.
- No nivy_trust_score / tier ladder visualisation (`pending → intro_only → active`).
- Status enum used (`approved`, `dispatched`, `completed`, `denied`) does not match the canonical spec enum (`requested`, `parent_pending`, `scheduled`, `live`, `completed`, `cancelled`, `no_show`) — see Section 4.

**Verdict:** Functional KPI dashboard for an active mentor with sessions. Inadequate for an onboarding mentor or for the safety-first framing of the role.

---

### 2.2 `/mentor/sessions` — score **6 / 10**

**File:** `app/mentor/sessions/page.tsx` + `sessions-client.tsx`

**What works:**
- Auth + role guard.
- Searchparam-driven filter `status ∈ {pending_approval, approved, completed, denied}` with a typed `VALID_FILTERS` whitelist (line 6).
- Server-side fetch of full session row including `meeting_url`, `parent_attended`, `recorded`, both rating columns, `is_intro` — wide-enough projection for a usable detail card.
- Empty-state handled when `mentorId` is absent.
- Client-side filter chip pattern (`sessions-client.tsx` lines 32–44) with icons.

**What is missing or wrong:**
- Filter set diverges from spec: spec uses `status IN ('requested','parent_pending','scheduled','live','completed','cancelled','no_show')`. Code uses `pending_approval` / `approved` / `dispatched` / `denied`. Either the live DB schema is using ride-style enums (carry-over from transport surface) or the spec hasn't been honoured. Either way this is a contract drift.
- No "live" / "in progress" filter despite spec including a `live` state.
- No sort UI, no date-range picker, no per-mentee history pivot.
- The approve / deny CTA on incoming requests is in the client component — uncertain whether it enforces parent-consent gating server-side (need to read `app/api/mentor/sessions/route.ts` to confirm; out of scope for this audit).
- No trust-and-safety affordances on a session row (no link to recording, no consent disclosure preview, no parent-attended badge prominence, no report-button — minimum bar for adult-teen surface).
- No bulk actions (mentor with 50 pending requests has no bulk-approve / bulk-deny).

**Verdict:** Solid CRUD-list shell. Missing live state, missing safety affordances, enum drift from spec.

---

### 2.3 `/mentor/profile/edit` — score **5 / 10**

**File:** `app/mentor/profile/edit/page.tsx` + `profile-form.tsx`

**What works:**
- Schema-correct projection of `mentors` table: expertise_tags, years_experience, bio, intro_video_url, hourly_rate_dh, free_intro_session, status, kyc_status, age_min/max_mentee, rating, sessions_count.
- Status / KYC / Rating shown as three Stat tiles at top.
- Form covers bio, expertise (comma input), hourly rate, free-intro toggle, age range, years XP, intro URL.
- PATCH to `/api/mentor/profile`.

**What is missing or wrong:**
- **No KYC upload flow at all.** Spec requires CIN scan + selfie + extrait de casier judiciaire vierge + 2 references + intro video review by admin. Form only accepts an intro_video_url string — no file upload, no document drop-zone, no reference-contact form. The empty state explicitly says "Aucune fiche mentor n'existe encore pour ce compte. Contactez un administrateur ou lancez une candidature via `/api/mentor/apply`" — pointing the user at a raw API endpoint as if to the sysadmin.
- No tier-ladder explainer (`pending → intro_only → active`). Mentor sees "Statut: pending" with no idea what unblocks `active`.
- Expertise tags are a comma-separated string input → no autocomplete from a controlled vocabulary (`'medicine','coding','football','art_drawing','music_oud'` per spec). Mentor can type anything; matching with `recommend_for_teen('mentor')` will be brittle.
- Age range default 13–17 in the form — spec default is `mentor.age - 5` to `mentor.age - 1`, gap ≥ 3 years, requires admin override for wider gaps. None of that logic surfaces in the form.
- No language/city/locale fields despite spec ranking on city/language.
- No `nivy_trust_score` display.
- No code-of-conduct acceptance / liability waiver checkbox (spec §6).

**Verdict:** Edit form for an already-onboarded mentor. Wholly absent as an onboarding/KYC surface. The biggest single gap on the mentor side.

---

### 2.4 `/mentor/availability` — score **0 / 10**

**File:** does not exist.

Sidebar links to `/mentor/availability` (sidebar.tsx line 17, label "Disponibilités", icon `Clock`) but no `app/mentor/availability/page.tsx`, no client component, no API route under `app/api/mentor/availability/`. Clicking the nav item produces a 404.

This is the canonical broken-link case: nav promises a feature, implementation is empty.

---

## Section 3 — Signup / onboarding gap

This is the most important finding. **There is no path for a new user to become a mentor on Nivy.**

### 3.1 Public signup

`app/auth/sign-up/page.tsx` accepts email + password + first/last name + phone + city + newsletter + terms. **It collects no role.** Search for "mentor" in the file returns zero matches. By default a new signup gets a parent/teen role (downstream `/auth/redirect` decides), never `mentor`.

### 3.2 Apply API exists, no UI invokes it

`app/api/mentor/apply/route.ts` (23 lines) accepts `{ expertise, bio, hourly_rate }` and calls RPC `apply_mentor`. The handler:
- Does not collect CIN scan, selfie, extrait de casier judiciaire, references, or intro video.
- Does not collect age range, language, city.
- Is referenced only by a copy-paste hint inside the profile-edit empty state ("lancez une candidature via `/api/mentor/apply`"). No form, no button, no link.

### 3.3 No KYC upload anywhere

A grep for the spec terms (CIN, casier judiciaire, references, intro video upload, kyc upload) finds no matching upload UI under `app/mentor/**` or `app/auth/**`. KYC status `kyc_status` is a read-only stat tile on the profile-edit page.

### 3.4 No rate setup at signup

Hourly rate is configured only after a `mentors` row exists, via `/mentor/profile/edit`. There is no rate-set step in apply flow. A newly-applied mentor exists with `hourly_rate_dh = 0` (the apply route casts `Number(body.hourly_rate ?? 0)` which silently defaults to 0).

### 3.5 No subject-tag taxonomy

`expertise_tags` is a free-text comma-string in the form. No dropdown, no chip-picker, no controlled vocabulary, no validation. Spec lists e.g. `medicine`, `coding`, `football`, `art_drawing`, `music_oud` but nothing in the UI enforces or even suggests these.

### 3.6 Implication

In the current build, the only realistic way for a user to end up with `role='mentor'` is for an admin to either:
(a) directly mutate the `auth.users` raw_app_meta or the `profiles` row to `role='mentor'`, then create a `mentors` row by SQL, **or**
(b) call the raw `apply_mentor` RPC via curl/Postman with a payload, then admin-flip the role.

There is no consumer-facing onboarding. The dashboard's "Profil mentor introuvable / soumettez votre candidature" empty state assumes the user already has the mentor role flipped on, which contradicts how role assignment actually happens.

---

## Section 4 — Vision gaps

Ranked by severity.

### Severity P0 — completely missing from frontend

1. **Mentor onboarding / KYC funnel.** No upload UI for CIN, selfie, casier judiciaire, references, or intro video. No code-of-conduct acceptance. No tier-ladder explainer. The single most load-bearing gate of an adult-teen 1-to-1 platform is reduced to a 23-line API endpoint with no UI.
2. **No role selector on signup.** `/auth/sign-up` cannot produce a mentor account. Mentor onboarding has no entry point.
3. **No availability calendar.** Sidebar advertises it, page doesn't exist, no API. Without availability, teens cannot book — yet sessions exist in the dashboard, implying booking happens through some other path (probably admin-curated or back-channel).
4. **No safety surface for mentors.** Strike count, suspensions, recording-retention notice, code-of-conduct, report-pipeline visibility, parent-on-call status — none present. Spec §6 names this the load-bearing layer; UI ignores it.
5. **No messaging window UI.** Spec mandates DMs only inside `[T-30min, T+duration+30min]`. No chat surface ships, so the rule is currently moot but also unaccounted for in UX.

### Severity P1 — partial, drifting from spec

6. **Status enum drift.** Code uses `approved` / `dispatched` / `denied` / `pending_approval`. Spec uses `requested` / `parent_pending` / `scheduled` / `live` / `completed` / `cancelled` / `no_show`. Likely the DB shipped with ride-style enums copy-pasted from the transport surface (`gamification-system/database/migrations/059_mentorship_career.sql` worth checking in a follow-up). At minimum the UI should surface `live` and `parent_pending` distinctly.
7. **No pathway, internships, or career-exploration surface on mentor side.** Spec scopes those to teen + parent + admin (correct), but mentor would benefit from a "which pathways list me?" affordance to drive expertise tagging — absent.
8. **Earnings page absent.** Dashboard surfaces a coin/DH glance only. No payout history, no withdrawal, no per-session accounting, no tax-invoice (Moroccan freelancer status implications unaddressed).
9. **Reviews page absent.** Numeric rating only; no qualitative review list, no response-to-review affordance, no decay model surfaced (spec open-question §end).
10. **Profile form: free-text expertise tags.** No controlled vocabulary, breaks `recommend_for_teen('mentor')` matching.

### Severity P2 — missing nice-to-haves

11. **No "next session in" countdown / join CTA on dashboard.**
12. **No bulk approve/deny on incoming requests.**
13. **No language / city / locale fields in profile.**
14. **No `nivy_trust_score` display anywhere.**
15. **No graduation flow surface** (17yo mentee → mentor pipeline per spec open question).
16. **Hard-coded French strings** (i18n not wired in mentor surface — `useT()` is used in auth surfaces, not in `app/mentor/**`).

### Aggregate score

| Page | Score |
|---|---|
| `/mentor/dashboard` | 6 / 10 |
| `/mentor/sessions` | 6 / 10 |
| `/mentor/profile/edit` | 5 / 10 |
| `/mentor/availability` | 0 / 10 |
| **Mean** | **4.25 / 10** |

The mentor surface is best understood as a thin admin-side console for already-onboarded, already-vetted mentors with a working session pipeline. The acquisition funnel, the KYC gate, the safety surface, the availability publication, the earnings/withdraw flow, and the messaging window — all five load-bearing pieces of a real mentor product — are not shipped.

### Files referenced

- `C:\Users\Shadow\Desktop\NIVY\app\mentor\layout.tsx`
- `C:\Users\Shadow\Desktop\NIVY\app\mentor\dashboard\page.tsx`
- `C:\Users\Shadow\Desktop\NIVY\app\mentor\sessions\page.tsx`
- `C:\Users\Shadow\Desktop\NIVY\app\mentor\sessions\sessions-client.tsx`
- `C:\Users\Shadow\Desktop\NIVY\app\mentor\profile\edit\page.tsx`
- `C:\Users\Shadow\Desktop\NIVY\app\mentor\profile\edit\profile-form.tsx`
- `C:\Users\Shadow\Desktop\NIVY\components\dashboard\mentor\sidebar.tsx`
- `C:\Users\Shadow\Desktop\NIVY\components\dashboard\mentor\header.tsx`
- `C:\Users\Shadow\Desktop\NIVY\app\api\mentor\apply\route.ts`
- `C:\Users\Shadow\Desktop\NIVY\app\api\mentor\sessions\route.ts`
- `C:\Users\Shadow\Desktop\NIVY\app\api\mentor\sessions\[id]\complete\route.ts`
- `C:\Users\Shadow\Desktop\NIVY\app\api\mentor\profile\route.ts`
- `C:\Users\Shadow\Desktop\NIVY\app\auth\sign-up\page.tsx` (no mentor branch)
- `C:\Users\Shadow\Desktop\NIVY\docs\vision\mentorship-career.md` (canonical spec)
- `C:\Users\Shadow\Desktop\NIVY\docs\vision\PRODUCT_WHITEPAPER.md` §19.4.7
