# Onboarding flows — unified vision (all roles)

**Auditor:** onboarding-flows-auditor
**Mode:** read-only
**Date:** 2026-05-07
**Active Supabase project:** imchornjvmgmaovhypco
**Scope:** unified per-role onboarding (teen / parent / partner / ambassador / admin), spanning the marketing-funnel `app/onboarding/*` wizard, `app/auth/*` signup, parent-driven teen linking, partner type-wizard + KYC, ambassador application, and admin invite-only path.

---

## 1. Vision intended

Each role lands on Nivy via a distinct first-run flow that filters intent, captures the minimum required to gate a usable dashboard, and drops the user into a role-shaped home with one obvious next action.

- **Teen** — Either (a) parent-invited (parent uses a linking method on `app/parent/teens/add` → teen receives invite/code → teen completes auth → parent sees teen attached) or (b) self-signup with a parent contact (request flow goes through `pending_teen_registrations` → email link to `app/auth/validate-teen?token=...` where the parent approves/rejects). Profile must capture pseudo, avatar (emoji or upload), school, grade, interests, profile types (max 2 of School/Sport/Créa). After validation the teen lands on `/teen` with avatar coach intro, first défi (mission), and a small XP grant.
- **Parent** — Public marketing → `app/auth/sign-up` (collects prénom/nom/email/téléphone/ville/password + CGU) → email confirm → `/auth/redirect` → `/parent`. Then the unwritten parent wizard: e-signature CGU (`app/parent/e-signature`), link first teen (`app/parent/teens/add`), first top-up (`app/parent/topup`), set spend mode (budget limits), see spend dashboard. The 2026-05 audit `onboarding-parent.md` confirms no welcome wizard ties these together yet.
- **Partner** — `app/devenir-partenaire/inscription/page.tsx` — 4-card type wizard (retail / venue / club / education) → typed form (`RetailPartnerForm`, `VenuePartnerForm`, `ClubPartnerForm`, `EducationPartnerForm`) → row in `partners` (status `pending`) → KYC at `app/partner/kyc` → admin review → status `active|verified|approved` (per `PARTNER_ACTIVE_STATUSES`) → first offer + scanner setup. Awaiting state is `components/dashboard/partner/awaiting-approval.tsx`.
- **Ambassador** — `app/devenir-ambassadeur/page.tsx` (programme marketing) → `app/devenir-ambassadeur/candidature` (auth-gated, redirects to login if anon, redirects back to `/devenir-ambassadeur` if already applied) → `AmbassadorApplicationForm` posts to an `ambassadors` table that **does not exist in the live schema** (see Open Questions). On approval the ambassador should get a `referral_codes` row and access `/ambassador`.
- **Admin** — Invite-only, no public signup. `admin_roles` (3 cols: `profile_id`, `role` default `admin`, `created_at`) gates `/admin`. Currently 0 rows in `admin_roles`. Onboarding here means an existing parent/teen/partner profile is granted a row by another admin via SQL or future tooling.

The shared, role-agnostic wizard at `app/onboarding/page.tsx` is in fact a **pre-account** parent-vs-teen showcase tracked in `onboarding_progress` (keyed by `temp_user_id`, 13 rows already, has columns `welcome_completed`, `showcase_completed`, `profile_type_completed`, `setup_completed`, `features_completed`, `completion_completed` plus per-step `*_completed_at`, `accumulated_xp`, `earned_badges`, `bonus_coins`, `synced_to_teen_id`). It redirects to `/dashboard` if the user is already authed and is currently disconnected from the auth signup at `/auth/sign-up` — they are two parallel funnels.

## 2. Per-role flows + completion gates

### Teen
- Steps: pre-account showcase (`app/onboarding`) → either parent links via `app/parent/teens/add` (calls `app/api/parent/teens/create/route.ts` — generates token via `randomBytes`, requires `firstName`, `lastName`, `pseudo` 3-20 chars, optional avatar/school/grade/interests/allergies/emergency contact) **or** self-signup → `pending_teen_registrations` row → parent email → `app/auth/validate-teen` → `app/api/auth/validate-teen` POST `approve|reject` → `parent_teen_links` row created → teen account active → land on `/teen` (avatar coach intro, first défi from `mission_templates` 30 rows seeded, XP via `user_xp`).
- Code paths: `app/onboarding/page.tsx`, `components/onboarding/teen-setup-step.tsx`, `components/parent/add-teen-form.tsx`, `app/auth/validate-teen/page.tsx`, `app/api/auth/validate-teen/route.ts`, `app/api/parent/teens/create/route.ts`.
- Completion gate: `teens` row exists with `parent_id` set and `parent_teen_links` row joins parent↔teen. Required cols on `teens`: `first_name`, `last_name`, `pseudo`, `date_of_birth`. Optional: `avatar_url`, `school_type`, `curriculum`, `primary_language` (default `'french'`). `profiles.role='teen'` is the routing gate at `/auth/redirect`.

### Parent
- Steps: `app/auth/sign-up` (8 fields + CGU) → `app/auth/sign-up-success` → email link → `app/auth/confirm-email` → `app/auth/redirect` → `/parent`. Should-be wizard (gap **OP2/OP5**): e-signature CGU → add teen → first top-up → spend mode → dashboard.
- Code paths: `app/auth/sign-up/page.tsx`, `app/auth/sign-up-success/page.tsx`, `app/auth/confirm-email/page.tsx`, `app/auth/redirect/page.tsx`, `app/parent/e-signature/page.tsx`, `app/parent/teens/add/page.tsx`, `app/parent/topup/page.tsx`, `components/parent/e-signature-client.tsx`.
- Completion gate: `profiles.role='parent'`. There is **no** `onboarding_complete` flag on `profiles`; the dashboard is reachable as soon as the row exists. E-signature has `GET /api/parent/e-signature/status` but POST is not wired (gap **OP4**).

### Partner
- Steps: `/devenir-partenaire` marketing → `/devenir-partenaire/inscription` type wizard → typed form → `partners` row inserted with `status='pending'` (default) → email confirmation (Supabase auth) → login → `/partner` shows `awaiting-approval.tsx` until status flips → KYC upload at `/partner/kyc` → admin review → status `active|verified|approved` → first offer + `/partner/scanner` setup.
- Code paths: `app/devenir-partenaire/page.tsx`, `app/devenir-partenaire/inscription/page.tsx`, `components/partners/{Retail,Venue,Club,Education}PartnerForm.tsx`, `app/partner/page.tsx`, `app/partner/kyc/page.tsx`, `components/dashboard/partner/awaiting-approval.tsx`.
- Completion gate: `partners.status` ∈ `{active, verified, approved}` AND `profiles.role='partner'`. KYC upload→review→approve flow not verified end-to-end (gap **OPP1**).

### Ambassador
- Steps: `/devenir-ambassadeur` marketing → `/devenir-ambassadeur/candidature` (auth-gated) → `AmbassadorApplicationForm` → row in `ambassadors` table (currently missing — see Open Questions) → admin approval → `referral_codes` issued → `/ambassador` dashboard with shareable code → first attribution tracked via `referral_uses`.
- Code paths: `app/devenir-ambassadeur/page.tsx`, `app/devenir-ambassadeur/candidature/page.tsx`, `components/ambassador-application-form.tsx`, `app/devenir-ambassadeur/programme/`.
- Completion gate: `profiles.role='ambassador'` + 1 row in `referral_codes` with `is_active=true`. Defaults: `referrer_xp_reward=100`, `referrer_coins_reward=50`, `referee_xp_reward=50`, `referee_coins_reward=25`.

### Admin
- Steps: invited (out-of-band) → existing user signs up as parent → an existing admin grants `admin_roles` row (`profile_id`, `role='admin'`) via SQL or future admin tool → `/auth/redirect` routes by `profiles.role`.
- Code paths: `app/admin/*`, `lib/auth/get-user-role.ts`, table `admin_roles`.
- Completion gate: row in `admin_roles`. `profiles.role` must be `'admin'` for `/auth/redirect` switch to land on `/admin` — a divergence between `admin_roles` (0 rows) and `profiles.role` is possible.

## 3. Cross-cutting: linking, email, progressive disclosure, empty states

- **Linking code flow**: there is **no `linking_codes` table** in the live schema. The codepaths use either (a) parent-driven creation via `/api/parent/teens/create` that generates a `validation_token` stored in `pending_teen_registrations`, or (b) teen self-signup that flows through the same `pending_teen_registrations` table consumed by `/api/auth/validate-teen`. The "code unique de liaison" UI text in `app/parent/teens/add/page.tsx` is therefore aspirational — only email + token are wired.
- **Email confirmation**: required by Supabase `auth.signUp` in `app/auth/sign-up/page.tsx`. Dev override is `NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL` which can short-circuit the redirect; confirmation itself is not auto-skipped — would need Supabase project setting `enable_email_confirmations=false` to truly bypass.
- **Progressive disclosure**: parent signup demands 6 required fields + CGU before account creation. Teen profile required minimums (per API): `firstName`, `lastName`, `pseudo` (3-20). All else (avatar, school, grade, interests, allergies, emergency contact, photo consent, exit rules) is optional but the form prompts for them inline.
- **"Profile complete" criteria → dashboard**: there is no `profiles.is_onboarded` column. As soon as a `profiles` row exists with a known `role`, `/auth/redirect` sends the user to the role's home. The "complete" feeling is achieved by the parallel `onboarding_progress` table flags but those are pre-account and never written back to `profiles`.
- **Empty-state UX (fresh teen)**: 30 `mission_templates`, 7 `quiz_questions`, 9 `educational_quizzes`, 10 `challenge_types`, 17 `special_challenge_types`, 20 `event_challenge_types`, 13 `seasonal_challenges` are seeded — so a new teen will not see a blank `/teen`. However `user_missions`, `user_event_challenge_progress`, `user_seasonal_progress` start at 0 rows, and there is no auto-assignment trigger surfaced in the audit; the avatar coach intro must drive a first manual mission acceptance.

## 4. Top concerns

1. **Missing `ambassadors` table** — `app/devenir-ambassadeur/candidature/page.tsx` queries `from("ambassadors").select("*")` but the schema has no such table. Either the page is broken or the table lives in a non-public schema not surfaced.
2. **No unifying `profiles.is_onboarded` flag** — role flows have no shared completion contract, so dashboards cannot gate on "did the user finish onboarding". `onboarding_progress.synced_to_teen_id` is the only sync marker, and it only applies to teens.
3. **Two disconnected funnels** — `app/onboarding/page.tsx` (showcase pre-account) vs `app/auth/sign-up` (real account creation) — the former redirects to `/dashboard` (which may not exist for the role) and never persists into `profiles`.
4. **E-signature parent gap (OP4)** — POST endpoint is missing; `e-signature-client.tsx` has no verified target.
5. **Linking UX claims a "code unique"** that the backend doesn't issue — only token-via-email.
6. **`children` vs `teens` vs `parent_teen_links` vs hypothetical `parent_teen_relationships`** (OP3/OP7) — schema duplication risk.

## 5. Open questions

- **Teen age verification**: ID required, or trust parent's e-signed consent? Currently only `date_of_birth` is captured; no document upload field on `teens`.
- **Self-signup vs parent-invited teen — canonical path?** Both routes write to `pending_teen_registrations` but only the parent-add UI is featured prominently. Product needs to pick one as default.
- **Partner KYC**: doc types accepted (CIN, RC, ICE, patente?), expiry dates, re-verification cadence — not visible from page-level audit; needs `/partner/kyc/page.tsx` deep-dive.
- **Ambassador requirements**: minimum age (since most candidates are teens), parental consent for under-18s, T&Cs agreement — none currently enforced at form level.
- **Admin onboarding**: is there a UI for granting `admin_roles`, or is it SQL-only? `admin_roles` has 0 rows.
- **Email confirmation in dev**: is `NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL` enough, or must `enable_email_confirmations=false` be toggled in Supabase Auth settings for local QA?

## 6. Files cited (≥ 8 paths) + DB tables touched (≥ 4)

Paths:
- `app/onboarding/page.tsx`
- `app/auth/sign-up/page.tsx`
- `app/auth/sign-up-success/page.tsx`
- `app/auth/confirm-email/page.tsx`
- `app/auth/validate-teen/page.tsx`
- `app/auth/redirect/page.tsx`
- `app/api/auth/validate-teen/route.ts`
- `app/api/parent/teens/create/route.ts`
- `app/parent/teens/add/page.tsx`
- `app/parent/e-signature/page.tsx`
- `components/parent/add-teen-form.tsx`
- `components/parent/e-signature-client.tsx`
- `app/devenir-partenaire/inscription/page.tsx`
- `components/partners/{Retail,Venue,Club,Education}PartnerForm.tsx`
- `components/dashboard/partner/awaiting-approval.tsx`
- `app/partner/page.tsx`, `app/partner/kyc/page.tsx`
- `app/devenir-ambassadeur/page.tsx`, `app/devenir-ambassadeur/candidature/page.tsx`
- `components/ambassador-application-form.tsx`
- `lib/hooks/use-onboarding.ts`
- `components/onboarding/{welcome,showcase,profile-type,parent-setup,teen-setup,features,completion}-step.tsx`
- Existing audits: `docs/audits/orchestrator-2026-05/onboarding-parent.md`, `docs/audits/orchestrator-2026-05/onboarding-partner.md`

DB tables (live, project `imchornjvmgmaovhypco`):
- `profiles` (3 rows; cols `id`, `email`, `full_name`, `avatar_url`, `role` default `'parent'`, `created_at`, `updated_at`) — **no onboarding-state column**.
- `teens` (1 row; cols incl. `parent_id`, `first_name`, `last_name`, `pseudo`, `avatar_url`, `date_of_birth`, `school_type`, `curriculum`, `primary_language`).
- `parent_teen_links` (1 row; `parent_id`, `teen_id`, `created_at`).
- `onboarding_progress` (13 rows; per-step `*_completed` booleans + `*_completed_at`, `user_type`, `accumulated_xp`, `earned_badges`, `bonus_coins`, `form_data` jsonb, `temp_user_id`, `synced_to_teen_id`).
- `partners` (1 row; `email`, `company_name`, `partner_type` default `'venue'`, `status` default `'pending'`).
- `admin_roles` (0 rows; `profile_id`, `role` default `'admin'`).
- `referral_codes` (0 rows; default rewards 100/50 referrer, 50/25 referee).
- `mission_templates` (30 rows seeded), `achievements` (63 rows seeded), `educational_quizzes` (9 rows) — empty-state safety net for a fresh teen dashboard.
- **Missing**: `linking_codes`, `ambassadors` (referenced by code but not in `public` schema).
