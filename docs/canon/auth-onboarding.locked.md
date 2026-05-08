# LOCKED — Auth + Onboarding Canon

> Status: **CANONICAL / READ-ONLY**. Derived from `docs/vision/audit-frontend-reality/C2-onboarding-audit.md`, `B5-ambassador-audit.md`, `B6-mentor-audit.md`, `B3-partner-audit.md`, `docs/vision/onboarding-flows.md`, `docs/vision/PRODUCT_WHITEPAPER.md` (§19, §20), `docs/vision/ambassador-referral.md`, `docs/vision/mentorship-career.md`, `docs/vision/partner-network.md`, `docs/vision/admin-moderation.md`, `docs/vision/db-architect.md`. Any divergence from this file is a bug.
>
> Identity invariant (whitepaper §20 LOCKED): `auth.users.id` is the single source of truth. `profiles.id`, `teens.id` and every per-role attribute table FK to it directly. The `handle_new_user` trigger creates the `profiles` row from `raw_user_meta_data->>'role'` (default `'parent'`).

---

## 1. LOCKED — Sign-up entry points per role

Exactly **one** canonical sign-up URL per role. Any other path that lands on signup MUST 301 to the canonical one (see §5).

| Role | Canonical sign-up URL | What's collected at signup | Who creates `auth.users` | Who assigns `profiles.role` | Next page after signup |
|---|---|---|---|---|---|
| **teen** (parent-invited) | `/parent/teens/add` (initiated by an authed parent) → email/SMS link to `/auth/validate-teen?token=…` (parent approves) → magic-link / set-password page for the teen | parent enters: `firstName`, `lastName`, `pseudo` (3–20), `dateOfBirth`, optional `avatar_url`, `school_type`, `curriculum`, `primary_language`, allergies, emergency contact. Teen completes: password (or magic link), interests chips, learning style, archetype | `POST /api/auth/validate-teen` MUST call `supabase.auth.admin.createUser({ email: teen_email, email_confirm: true })` and use the returned uid as `profiles.id` and `teens.id`. (Currently NOT done — see §6 FORBIDDEN, §7 MISSING.) | Server-side trigger reads `raw_user_meta_data->>'role' = 'teen'` set by the validate-teen route → `handle_new_user` writes `profiles.role='teen'`. `parent_teen_links` row inserted in same transaction. | `/onboarding/interests` → `/onboarding/goals` → `/onboarding/learning-style` → `/onboarding/complete` (sets `is_onboarded=true`) → `/teen` |
| **teen** (self-signup) | `/onboarding` → step `teen-setup` → `POST /api/auth/register-teen` (writes `pending_teen_registrations`, emails parent) → parent approves at `/auth/validate-teen` (same flow as above) | teenFirstName, teenLastName, dateOfBirth, parentEmail, parentPhone | Same as parent-invited (`auth.users` created at parent approval, NOT at the marketing wizard) | Same as parent-invited | Same as parent-invited |
| **parent** | `/auth/sign-up` (the marketing wizard `/onboarding` is a pre-account showcase only — see §6 FORBIDDEN: it MUST NOT call `auth.signUp` again) | `prenom`, `nom`, `email`, `telephone`, `ville`, `password`, CGU acceptance, optional newsletter. `raw_user_meta_data` MUST include `{ role: 'parent', full_name }` so the trigger lands the right role. | `supabase.auth.signUp(email,password,{ data: { role:'parent', full_name } })` → email confirm required | `handle_new_user` trigger (whitepaper §20) on `auth.users` insert → `profiles.role='parent'` | `/auth/sign-up-success` → email confirm → `/auth/callback` → `/auth/redirect` → `/onboarding/parent` (parent wizard: e-signature CGU → add 1st teen → 1st top-up → spend mode) → `/parent` (`is_onboarded=true` only after wizard completion) |
| **partner** | `/devenir-partenaire/inscription` (4-card type wizard: retail / venue / club / education) → `POST /api/partners/register` MUST atomically (a) `supabase.auth.admin.createUser` for the contact email, (b) insert `profiles` row with `role='partner'`, (c) insert `partners` row with `status='pending'`, (d) email magic-link / set-password to the contact. (Currently only step c happens — see §6 FORBIDDEN, §7 MISSING.) | partner_type, company_name, RC, ICE, RIB, phone, website, address, city, postal_code, description, contact_person_name, contact_person_email, contact_person_phone + per-type extra fields | `/api/partners/register` (service-role) | `handle_new_user` trigger via `raw_user_meta_data.role='partner'` set by the register route | Magic-link sets password → `/auth/redirect` → `/partner` (`<PartnerAwaitingApproval />` until `partners.status ∈ {active, verified, approved}`) → after KYC approval: `/onboarding/partner` micro-tour → `/partner/dashboard` |
| **mentor** | `/devenir-mentor/candidature` (**MISSING — must be built**) — auth-gated; if not authed redirect to `/auth/sign-up?role=mentor` then back. Form posts to `POST /api/mentor/apply` (already exists) but extended to collect KYC docs (CIN, selfie, extrait de casier judiciaire vierge, 2 references, intro video). | bio, expertise_tags (controlled vocabulary), years_experience, hourly_rate_dh, free_intro toggle, age_min_mentee, age_max_mentee, intro_video_url, CIN scan, selfie, casier judiciaire, references, code-of-conduct acceptance | `/auth/sign-up` (parent-style) called first by the candidature page if user is anonymous; same `auth.users` row is reused. | `apply_mentor` RPC server-side updates `profiles.role='mentor'` AND inserts `mentors` row with `status='pending'`, `kyc_status='submitted'` | `/mentor/onboarding/kyc-pending` (status page) → after admin tier flip to `intro_only` or `active`: `/auth/redirect` → `/mentor/dashboard` |
| **driver** | `/devenir-chauffeur/candidature` (**MISSING — must be built**) — same shape as mentor: candidature form posts to `POST /api/driver/apply` (**MISSING**) which creates `auth.users` + `profiles.role='driver'` + `nivy_drivers` row with `kyc_status='pending'`. | full_name, CIN, driving licence, vehicle type, plate, insurance doc, city, languages, intro photo | `/api/driver/apply` (service-role) | RPC sets `profiles.role='driver'` + inserts `nivy_drivers` row | `/driver/onboarding/kyc-pending` → after admin approval: `/driver/dashboard` (**MISSING — must be built**) |
| **ambassador** | `/devenir-ambassadeur/candidature` (already exists) — auth-gated; if not authed redirect to `/auth/sign-up?role=ambassador` then back. Form posts to `/api/ambassador/apply` (**MISSING route** — currently the form writes directly to `ambassadors` which is also unmigrated). | full_name (from profile), audience_size, primary_platform, niche tags, motivation text, payout_method (mobile_money / bank), parental_consent if under 18, T&Cs acceptance | Reuses caller's existing `auth.users` row (parent or teen) | Admin approval at `/admin/ambassadeurs` flips `ambassadors.status='active'` AND `profiles.role='ambassador'` (single transaction). The `ambassador` value MUST be added to the `profiles.role` enum (see db-architect.md §D11). | `/devenir-ambassadeur` (status banner: "candidature en cours") → on approval: `/auth/redirect` → `/ambassador` |
| **influencer** | `/devenir-influenceur/candidature` (already exists, UI only) — same shape as ambassador. **Decision pending (see §8)**: either fold into `ambassador` (recommended) or ship as distinct role with its own enum value, route, and `influencers` table. Until decided, this entry point MUST NOT grant a role. | fullName, email, phone, city, age, influenceType, primaryPlatform, IG/TikTok/YT/Snap handles + followers + engagement, contentTypes[], targetAudience, averageReach, previousBrands, partnership prefs | n/a (decision pending) | n/a (decision pending) | n/a (decision pending) |
| **admin** | **No public sign-up.** Bootstrap by SQL or by an existing `super_admin` via `/admin/permissions` UI (which inserts `admin_roles` row + flips `profiles.role='admin'`). | n/a | n/a (existing user is promoted) | Existing admin only | `/auth/redirect` → `/admin` |

Notes:
- `/onboarding` (the marketing wizard at `app/onboarding/page.tsx`) is **pre-account showcase only**. It MUST NOT contain any `supabase.auth.signUp` call. The current `parent-setup-step.tsx` `auth.signUp` MUST be removed; the wizard's "Continue" CTA on the parent track redirects to `/auth/sign-up?source=wizard` carrying the wizard's `tempUserId` so XP/badges sync after auth.
- The teen wizard celebration step `synced_to_teen_id` mechanism is the only path that may merge pre-account XP into a real teen account, executed in `POST /api/auth/validate-teen` after `auth.users` creation.

---

## 2. LOCKED — Role enum

### `profiles.role` (CHECK constraint, single source of truth for role routing)

```sql
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_role_chk
  CHECK (role IN (
    'parent',
    'teen',
    'partner',
    'mentor',
    'driver',
    'ambassador',
    'admin'
  ));
ALTER TABLE public.profiles ALTER COLUMN role SET DEFAULT 'parent';
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_onboarded BOOLEAN NOT NULL DEFAULT FALSE;
```

Notes:
- Live DB currently only stores `parent | partner | teen` (per `ambassador-referral.md` §3). Adding `mentor`, `driver`, `ambassador`, `admin` is a P0 migration.
- `influencer` is **NOT** in the enum. Pending decision in §8 — recommendation: fold into `ambassador`.
- `coach` and `teacher` are NOT in `profiles.role`; they are sub-roles in `partner_staff.role` (see whitepaper §9: `partner_staff.role IN ('owner','staff','coach','teacher')`).

### `admin_roles.role` sub-roles (active only when `profiles.role='admin'`)

```sql
ALTER TABLE public.admin_roles
  ADD CONSTRAINT admin_roles_role_chk
  CHECK (role IN ('super_admin','admin','moderator','support'));
ALTER TABLE public.admin_roles
  ADD COLUMN IF NOT EXISTS permissions JSONB NOT NULL DEFAULT '{}'::jsonb;
```

Per `lib/auth/admin-permissions.ts` and `docs/vision/admin-moderation.md` §1. The `permissions` JSONB column is referenced by `getAdminInfo` but is currently MISSING in the live DB — must be added.

### `mentors.status` / `mentors.kyc_status` (per mentorship-career.md SPEC)

```sql
mentors.status     IN ('pending','intro_only','active','paused','suspended','banned')
mentors.kyc_status IN ('not_started','submitted','approved','rejected')
```

### `partners.status` (per onboarding-flows.md + partner-network.md)

```sql
partners.status IN ('pending','in_review','active','rejected','suspended')
```

`PARTNER_ACTIVE_STATUSES = {active, verified, approved}` in current code is a smell — collapse `verified` and `approved` into `active`.

### `ambassadors.status`

```sql
ambassadors.status IN ('pending','active','paused','suspended','rejected')
```

### `nivy_drivers.kyc_status`

```sql
nivy_drivers.kyc_status IN ('pending','submitted','approved','rejected','suspended')
```

---

## 3. LOCKED — Auth redirect logic (`/auth/redirect` switch)

`app/auth/redirect/page.tsx` MUST implement exactly the following switch. Anything else is a bug.

| `profiles.role` | `is_onboarded` | First page |
|---|---|---|
| _no row in `profiles`_ | n/a | `/onboarding` (marketing showcase, role-pick) |
| `parent` | `false` | `/onboarding/parent` (parent wizard: e-sign → add teen → top-up → spend mode) |
| `parent` | `true` | `/parent` |
| `teen` | `false` | `/onboarding/interests` (then goals → learning-style → complete) |
| `teen` | `true` | `/teen` |
| `partner` AND `partners.status ∈ {pending,in_review}` | any | `/partner` (renders `<PartnerAwaitingApproval />`) |
| `partner` AND `partners.status='active'` AND `is_onboarded=false` | `false` | `/onboarding/partner` (first-offer + scanner setup) |
| `partner` AND `partners.status='active'` AND `is_onboarded=true` | `true` | `/partner/dashboard` |
| `partner` AND `partners.status ∈ {rejected,suspended}` | any | `/partner` (status banner) |
| `mentor` AND `mentors.kyc_status ∈ {not_started,submitted,rejected}` | any | `/mentor/onboarding/kyc-pending` |
| `mentor` AND `mentors.status ∈ {intro_only,active}` AND `is_onboarded=false` | `false` | `/mentor/onboarding/profile` (complete bio, availability) |
| `mentor` AND `mentors.status ∈ {intro_only,active}` AND `is_onboarded=true` | `true` | `/mentor/dashboard` |
| `mentor` AND `mentors.status ∈ {paused,suspended,banned}` | any | `/mentor/dashboard` (status banner, read-only) |
| `driver` AND `nivy_drivers.kyc_status ∈ {pending,submitted,rejected}` | any | `/driver/onboarding/kyc-pending` |
| `driver` AND `nivy_drivers.kyc_status='approved'` AND `is_onboarded=false` | `false` | `/driver/onboarding/setup` (vehicle, payout method) |
| `driver` AND `nivy_drivers.kyc_status='approved'` AND `is_onboarded=true` | `true` | `/driver/dashboard` |
| `ambassador` AND `ambassadors.status='pending'` | any | `/devenir-ambassadeur` (status banner) |
| `ambassador` AND `ambassadors.status='active'` AND `is_onboarded=false` | `false` | `/onboarding/ambassador` (link tour, share kit) |
| `ambassador` AND `ambassadors.status='active'` AND `is_onboarded=true` | `true` | `/ambassador` |
| `admin` (with row in `admin_roles`) | n/a | `/admin` |
| any other value / fallthrough | any | `/auth/error?reason=unknown_role` (NOT `/onboarding` — see §6) |

CONTRADICTION FLAG: current `/auth/redirect` has no `mentor` case (falls into `default → /onboarding`), no `driver` case at all, and uses `/onboarding` as the fallback (which is wrong — it sends authed users back into a pre-account showcase). See `C2-onboarding-audit.md` §1.2 + §7.1.

---

## 4. LOCKED — Onboarding wizards required per role

`profiles.is_onboarded` is the canonical completion flag (whitepaper §19). It is FALSE on signup, set to TRUE only at the end of each role's required wizard. Middleware MUST redirect any authed user with `is_onboarded=false` back to their wizard on every protected nav (except `/auth/*`, `/onboarding/*`, `/api/*`).

| Role | Required wizard steps before dashboard | Routes | Sets `is_onboarded=true` at | Hard requirement(s) |
|---|---|---|---|---|
| **teen** | (1) Interests chip-picker (5–10 tags) → `teen_interests` rows. (2) Goals — 3 free-text → `teen_goals`. (3) Learning style 4-choice + archetype → `teens.learning_style`, `teens.archetype`. (4) Welcome (avatar coach intro + 1st mission accept). | `/onboarding/interests` → `/onboarding/goals` → `/onboarding/learning-style` → `/onboarding/complete` → `/teen` | `POST /api/teen/onboarding/complete` (whitepaper §19) — invoked by `/onboarding/complete`. MUST also be called by `POST /api/auth/validate-teen` after teen `auth.users` is created so a parent-validated teen who logs in directly is not stuck. | `teens` row exists, `parent_teen_links` row exists, ≥5 `teen_interests` rows, `teens.learning_style NOT NULL` |
| **parent** | (1) E-signature CGU. (2) Add first teen (link or invite). (3) First top-up (or explicit "skip — later" with timestamp). (4) Spend mode (budget limits). | `/onboarding/parent/e-signature` → `/onboarding/parent/add-teen` → `/onboarding/parent/topup` → `/onboarding/parent/spend-mode` → `/parent` | `POST /api/parent/onboarding/complete` after step 4. | `e_signatures` row exists with `signed_at NOT NULL`. Add-teen and top-up steps MAY be skipped (write a `skipped_at` row) but spend-mode MUST be set. |
| **partner** | Wave 1 (BEFORE approval): `/devenir-partenaire/inscription` 4-step type wizard already constitutes pre-approval onboarding (DB record created with `status='pending'`). Wave 2 (AFTER admin approval): (1) KYC upload (RC, ICE, RIB, CIN of representative). (2) First offer creation. (3) Scanner setup tour. | Pre-approval: `/devenir-partenaire/inscription`. Post-approval: `/onboarding/partner/kyc` → `/onboarding/partner/first-offer` → `/onboarding/partner/scanner` → `/partner/dashboard` | `POST /api/partner/onboarding/complete` after scanner setup. | `partners.status ∈ {active}`, `kyc_documents` row(s) approved, ≥1 `partner_offers` row. |
| **mentor** | (1) Apply + KYC upload (CIN, selfie, casier judiciaire, 2 references, intro video). (2) Wait for admin tier flip (`pending → intro_only`). (3) Profile complete (bio, expertise tags from controlled vocabulary, hourly rate, age range, languages, city, code-of-conduct acceptance). (4) First availability slots published. | `/devenir-mentor/candidature` → `/mentor/onboarding/kyc-pending` (gated wait page) → `/mentor/onboarding/profile` → `/mentor/onboarding/availability` → `/mentor/dashboard` | `POST /api/mentor/onboarding/complete` after availability published. | `mentors.kyc_status='approved'`, `mentors.status ∈ {intro_only, active}`, `mentor_availability` ≥1 slot, code-of-conduct acceptance row. |
| **driver** | (1) Apply + KYC (CIN, driving licence, vehicle reg, insurance, plate). (2) Wait for admin approval. (3) Vehicle setup + payout method + service area. | `/devenir-chauffeur/candidature` → `/driver/onboarding/kyc-pending` → `/driver/onboarding/setup` → `/driver/dashboard` | `POST /api/driver/onboarding/complete` after setup. | `nivy_drivers.kyc_status='approved'`, payout method set. |
| **ambassador** | (1) Apply (existing form). (2) Wait for admin approval. (3) Welcome tour: referral code reveal, share-kit walk-through, payout method. | `/devenir-ambassadeur/candidature` → `/devenir-ambassadeur` (status banner during pending) → `/onboarding/ambassador` → `/ambassador` | `POST /api/ambassador/onboarding/complete` after welcome tour. | `ambassadors.status='active'`, `referral_codes` row with `is_active=true`, payout method set. |
| **influencer** | Pending decision (§8). | n/a | n/a | n/a |
| **admin** | None (intentional). `is_onboarded` NOT applicable; admin gated solely on `admin_roles` row existence. | n/a | n/a | `admin_roles` row, `profiles.role='admin'` |

### `is_onboarded` flag policy

1. Column: `profiles.is_onboarded BOOLEAN NOT NULL DEFAULT FALSE` (whitepaper §19).
2. Set to TRUE only via the `POST /api/<role>/onboarding/complete` endpoints listed above (server-side, never client-mutable).
3. Reset to FALSE on role change (`profiles.role` UPDATE trigger), so a parent who becomes an ambassador re-runs the ambassador wizard.
4. Middleware enforces redirect to wizard for any authed user with `is_onboarded=false` on any path NOT in `[/auth/*, /onboarding/*, /api/*, /_next/*]`.
5. Admin role bypasses the `is_onboarded` check entirely.

CONTRADICTION FLAG: today there is NO `is_onboarded` column on `profiles` (per `onboarding-flows.md` §3 + §4 concern #2). Whitepaper §19 specifies it but it has not been migrated. Only teens have a partial completion gate via `app/onboarding/complete/page.tsx` and that path is unreachable for parent-validated teens (see `C2-onboarding-audit.md` D14).

---

## 5. DEPRECATED entry points

These paths exist (or are linked from current UI) and MUST 301/308 redirect to the canonical entry above. Any new code linking to them is a bug.

| Deprecated path | Redirect to | Reason |
|---|---|---|
| `/dashboard` | `/auth/redirect` | Generic landing; middleware already rewrites this. Keep the rewrite, never the page. |
| `/onboarding` for an **already-authenticated** user | `/auth/redirect` | The wizard is pre-account only. Today it shows even to authed users with no profile row, creating the duplicate-signUp bug (`C2-onboarding-audit.md` §2.2 / D8). |
| `/auth/sign-up` for a parent reached **from `/onboarding`** | `/auth/sign-up?source=wizard&tempUserId=…` (same page, with state) | One canonical signup form; wizard hands off `tempUserId` so pre-account XP can sync. The wizard's `parent-setup-step.tsx` second `auth.signUp` call MUST be removed. |
| `/auth/sign-up` for a partner / mentor / driver / ambassador / influencer | `/devenir-partenaire/inscription` / `/devenir-mentor/candidature` / `/devenir-chauffeur/candidature` / `/devenir-ambassadeur/candidature` / pending | Role-aware funnels. Only parents (and teens via parent invite) signup through `/auth/sign-up`. |
| `/onboarding/{interests,goals,learning-style,complete}` for a non-teen | `/auth/redirect` | Already enforced server-side; keep. |
| `/ambassador/shop` (mobile dock link) | `/ambassador/boutique` | Path mismatch (`B5` §1.4). |
| `/ambassador/{link,stats,rewards,settings,help,profile}` (sidebar links) | 404 → fix sidebar to point at real routes (`/ambassador/marketing`, `/ambassador/withdrawals`, `/ambassador/comment-gagner`, `/ambassador/boutique`) | `B5` §1.3. |
| `/mentor/availability` | Build the page; sidebar link is canonical | `B6` §2.4. |
| `/auth/confirm-email` "Renvoyer" cosmetic button | Wire to `POST /api/auth/resend-confirmation` or remove | `C2` D13. |
| `app/onboarding/page.tsx` `parent-setup-step.tsx` `auth.signUp` call | DELETE | Dual-signup smell (`C2` §1.1 / D8). |
| Direct insert into `profiles` from `app/api/partners/register` without `auth.users` | Replace with `supabase.auth.admin.createUser` first | `C2` D10 / `B3` §99. |
| Direct insert into `profiles` from `app/api/auth/validate-teen` without `auth.users` | Replace with `supabase.auth.admin.createUser` first | `C2` D4 / D7. |

---

## 6. FORBIDDEN patterns

Hard rules. CI / code-review MUST reject any PR that introduces these.

1. **No `profiles` row creation without an `auth.users` row.** Every `INSERT INTO public.profiles` must FK to an existing `auth.users.id`. Use `supabase.auth.admin.createUser` first; rely on the `handle_new_user` trigger; never `INSERT INTO profiles (...)` from app code.
2. **No role assignment without a `profiles` row.** Setting `profiles.role` requires the row to already exist (via the trigger). Inserting `role` directly via service-role bypass is allowed only in admin tooling and MUST write to `admin_audit_logs`.
3. **No `auth.signUp` outside `app/auth/sign-up/page.tsx`.** The marketing wizard MUST NOT call `auth.signUp` (today `parent-setup-step.tsx` does — bug). All client-driven account creation flows funnel through the canonical signup form.
4. **No `app/auth/sign-up` form that excludes role.** The form MUST set `raw_user_meta_data.role` from a query-param `?role=` (default `parent`) so the trigger lands the right row.
5. **No `profiles.id ≠ auth.users.id` invariant violation.** `profiles.id` MUST equal the `auth.users.id` for the same user. Today's teen-validation flow violates this (auto-uuid) — see `C2` D7.
6. **No `teen_<id>@teensparty.local` placeholder email.** A teen without a real email cannot be created; require teen email at parent-validation time, OR use Supabase magic-link with a parent-supplied email alias the teen will then claim.
7. **No mid-flow login redirect with no contextual messaging.** Routes that require auth (e.g. `/devenir-ambassadeur/candidature`) MUST set `?redirect=…&intent=…` and the login page MUST surface the intent.
8. **No "call our API endpoint" copy in user-facing UI.** The mentor empty state today literally instructs users to call `/api/mentor/apply` — this is a P0 violation.
9. **No role-gate that uses `userInfo.role !== "X"` against a role enum value that does not exist in the live DB.** All routing relies on the §2 enum being migrated first.
10. **No middleware-bypassed dashboard.** `app/<role>/page.tsx` MUST call `getUserRole()` server-side AND middleware MUST gate the `/<role>` prefix; both layers required, no single point of failure.
11. **No completion-flag reads off `onboarding_progress.synced_to_teen_id` for routing.** Routing reads `profiles.is_onboarded` only. `onboarding_progress` is a pre-account analytics/XP-merge artefact.
12. **No second referral system shipped.** The legacy gamification `referral_codes` (TPM prefix) is the only XP-track; the cash-track on `ambassadors` is the only money-track. They MUST be reconciled (see §8) — no third system.
13. **No fallback redirect to `/onboarding` for an unknown authed role.** Use `/auth/error?reason=unknown_role` so the bug is observable.
14. **No client-side `is_onboarded` mutation.** The flag is set only by `POST /api/<role>/onboarding/complete` server endpoints.

---

## 7. MISSING surfaces

Hard gaps that the canon mandates but no UI / API exists for today.

| # | Surface | Status | Source |
|---|---|---|---|
| M1 | `/devenir-mentor` + `/devenir-mentor/candidature` (mentor public funnel + KYC upload form) | **MISSING** — no app route; only `POST /api/mentor/apply` exists, mentioned in copy as a raw API. | `B6` §3, `C2` §2.5 |
| M2 | `/devenir-chauffeur` + `/devenir-chauffeur/candidature` + `/driver/*` (entire driver-facing surface) | **MISSING** — no `app/driver/`, no driver layout, no driver dashboard. `'driver'` not in `UserRole` union. | `C2` §2.6 |
| M3 | `POST /api/driver/apply` + `POST /api/driver/onboarding/complete` | **MISSING** | derived |
| M4 | `/mentor/availability` page + `mentor_availability` table + API | **MISSING** — sidebar link is a 404. | `B6` §2.4 + SPEC |
| M5 | `/mentor/onboarding/{kyc-pending,profile,availability}` (mentor wizard pages) | **MISSING** | derived from §4 |
| M6 | KYC upload UI for mentor (CIN, selfie, casier judiciaire, 2 refs, intro video) | **MISSING** — `/mentor/profile/edit` only takes a string `intro_video_url`. | `B6` §3.3 |
| M7 | `/onboarding/parent/{e-signature,add-teen,topup,spend-mode}` (parent wizard chain) | **MISSING** — components exist as stand-alone pages but no chained wizard, no `is_onboarded` gate. | `onboarding-flows.md` Parent OP2/OP5 |
| M8 | `POST /api/parent/e-signature` (the POST endpoint to actually persist a signature) | **MISSING** — only `GET /api/parent/e-signature/status` exists. | `onboarding-flows.md` OP4 |
| M9 | `/onboarding/partner/{kyc,first-offer,scanner}` (partner post-approval wizard) | **MISSING** — `/partner/kyc` is read-only, no upload UI. | `C2` §2.4, `partner-network.md` §3 |
| M10 | Auto-create `auth.users` + `profiles.role='partner'` in `POST /api/partners/register` | **MISSING** — partner cannot log in today; bridge undocumented in code. | `C2` D10 |
| M11 | Auto-create `auth.users` + correct `profiles.id` invariant in `POST /api/auth/validate-teen` | **MISSING** — teen has no way to authenticate after parent approval. | `C2` D4/D5/D7 |
| M12 | `/onboarding/ambassador` (ambassador welcome tour) | **MISSING** — dashboard ships cold-start. | `B5` §3 |
| M13 | `POST /api/ambassador/apply` route + atomic admin-approval flip of `profiles.role='ambassador'` | **MISSING** — form writes to a table that doesn't exist; admin approve handler doesn't flip role. | `B5` §4, `ambassador-referral.md` §3 |
| M14 | `is_onboarded` column on `profiles` + `POST /api/<role>/onboarding/complete` (×6 roles) | **MISSING** — no completion contract exists today. | whitepaper §19 |
| M15 | `app/join` route to capture `?ref=CODE` cookie for ambassador attribution | **MISSING** — every shared ambassador link is a 404. | `B5` §3.1 |
| M16 | Working "Renvoyer" handler on `/auth/confirm-email` | **MISSING** — button is cosmetic. | `C2` D13 |
| M17 | Magic-link / set-password page for newly-validated teen and newly-registered partner / mentor / driver | **MISSING** | derived |
| M18 | `linking_codes` table + API (`POST /api/parent/teens/invite` per whitepaper §19 — 6-digit, 24h TTL, single-use) | **MISSING** — current flow is email+token only; UI copy says "code unique" but backend doesn't issue one. | `onboarding-flows.md` §3, whitepaper §19 |
| M19 | Migration adding `mentor`, `driver`, `ambassador`, `admin` to `profiles.role` CHECK constraint, and `permissions` JSONB on `admin_roles` | **MISSING** — live enum holds only `parent | partner | teen`. | `ambassador-referral.md` §3, `admin-moderation.md` §2 |
| M20 | Influencer decision + (if kept distinct) influencer enum value, role gate, dashboard | **PENDING** — see §8. UI exists at `/devenir-influenceur/*` but writes to `influencer_campaigns` only; no role, no dashboard, no completion gate. |

---

## 8. UNRESOLVED founder decisions

Each item: question, options, recommendation. Founder must pick before §1–§4 ship.

| # | Question | Options | Recommendation |
|---|---|---|---|
| U1 | **Does ambassador require admin approval before role is granted?** | (a) Manual admin approve → role flip. (b) Auto-grant on application; admin can revoke. | (a) Manual approve. Money + referral attribution + minor-targeted growth surface. The 4-business-hour SLA used elsewhere applies. Same as today's UI assumption. |
| U2 | **Does mentor KYC block onboarding completion or just earnings?** | (a) Blocks the entire `/mentor/dashboard` until `kyc_status='approved'`. (b) Mentor can browse + draft profile but cannot accept paid sessions until approved. (c) Tier-gated: `pending` = no contact, `intro_only` = free + parent-attended only, `active` = paid. | (c) Tier-gated. Matches `mentorship-career.md` §6 SPEC exactly. `is_onboarded=true` only at `intro_only` or `active`. KYC failure → permanent `pending`, no dashboard, status page only. |
| U3 | **Influencer role: distinct or fold into ambassador?** | (a) Distinct `'influencer'` enum value, separate `/influencer/*` dashboard, separate payout pipeline. (b) Fold: influencer is an ambassador with `tier='influencer'` (audience-size-based) and an extended application form. | (b) Fold. The two flows are 90% identical (cash payouts, share kit, attribution). Single role, two application surfaces (`/devenir-ambassadeur/candidature` + `/devenir-influenceur/candidature`) writing to the same `ambassadors` table with `track ∈ {organic, influencer}`. Avoids enum sprawl + duplicate payout backend. |
| U4 | **Should partners auto-receive `auth.users` on `POST /api/partners/register`, or wait for admin approval?** | (a) Auto-create at apply, send magic-link immediately. (b) Wait — admin manually creates account at approve. | (a) Auto-create. Lets partner log in to see `<PartnerAwaitingApproval />` and complete KYC upload while pending. Removes the "how does the partner log in?" black box (`C2` D10). |
| U5 | **Driver KYC sourcing: in-house or VTC partner reuse?** | (a) Build full driver KYC funnel in-app. (b) Integrate Careem / Heetch driver pool (no Nivy KYC, just trust their vetting). (c) Hybrid: `nivy_drivers` (in-house, KYC) + `aggregator_drivers` (federated, no KYC). | (c) Hybrid per whitepaper §19.4.2. Build the in-house funnel (M2/M3) but allow aggregator fallback for capacity. |
| U6 | **Teen self-signup: keep dual-track (parent-invited + self-signup) or pick one as canonical?** | (a) Both. (b) Parent-invited only — self-signup loops to "ask your parent for an invite". (c) Self-signup canonical, parent invite is a fast-path. | (b) Parent-invited only at launch. Reduces `pending_teen_registrations` orphan risk and matches the parental-consent-first invariant. Self-signup re-enabled in V1.1 once magic-link flow is hardened. |
| U7 | **`is_onboarded` reset on role change?** | (a) Yes, force re-wizard. (b) No, treat completion as global. | (a) Yes per §4 policy. Each role's wizard captures different info (parent CGU vs mentor KYC vs ambassador payout method); completion of one is meaningless for another. |
| U8 | **Email confirmation enforced?** | (a) Hard-required (Supabase `enable_email_confirmations=true`). (b) Soft (allow unconfirmed login, restrict actions). (c) Dev-only bypass. | (a) Hard-required for parent / partner / mentor / driver / ambassador (money + minor-safety roles). For teens (no real email at first) use magic-link / set-password from parent-validation token. |
| U9 | **Bootstrap admin: how is the first `super_admin` seeded?** | (a) Seed migration. (b) CLI script in `scripts/`. (c) Env-driven first-login auto-promotion. | (b) CLI script `scripts/seed-super-admin.ts` taking `--email`. Records the action in `admin_audit_logs`. Reproducible per env. |
| U10 | **`PARTNER_ACTIVE_STATUSES = {active,verified,approved}` collapse?** | (a) Keep three. (b) Collapse to single `'active'`. | (b) Collapse. `verified` and `approved` are synonyms in current code; redundancy is a footgun. Migration: `UPDATE partners SET status='active' WHERE status IN ('verified','approved');` |
| U11 | **`/onboarding` (marketing wizard) — keep or kill?** | (a) Keep as pre-account showcase only (no `auth.signUp` calls). (b) Kill entirely; the public landing pages (`/devenir-partenaire`, etc.) are the new pre-account funnel. | (a) Keep but de-fang. The wizard has the only working gamified XP-on-signup mechanic and sync-on-validate. Strip the `auth.signUp` from `parent-setup-step.tsx`; redirect "Continue" to `/auth/sign-up?source=wizard&tempUserId=…`. |
| U12 | **Mentor → ambassador graduation (17yo mentee → mentor)** | Open question per `mentorship-career.md` end. | Defer. Add invite-only path via admin tool in V1.1. |
| U13 | **Linking-code TTL** | 24h (whitepaper §19) vs 7-day (current pending_teen_registrations token). | 24h for parent-generated linking codes (whitepaper invariant). 7 days only for the parent-validation email token (slower-moving consent step). Two separate mechanisms. |
| U14 | **Admin sub-role `support` powers** | Can `support` suspend a teen? Refund? | Per ACL today: NO refund (super_admin/admin only), NO direct suspend (flag-for-admin only). Lock this in `lib/auth/admin-permissions.ts`; add server-side `requireAdminPermission` calls to every route. |

---

## CONTRADICTIONS flagged

- C1. `lib/auth/get-user-role.ts:3` `UserRole` includes `mentor`, `partner`, `driver`-equivalents in shape, but the live `profiles.role` enum holds only `parent | partner | teen` (`ambassador-referral.md` §3). Routes that gate on `role === 'mentor' | 'ambassador' | 'driver'` therefore redirect every authed user.
- C2. `app/auth/redirect/page.tsx` lacks `mentor` AND `driver` cases; default branch sends them to `/onboarding` (pre-account wizard with no track for them). Direct contradiction with `getDashboardPath()` in the same `lib/auth/get-user-role.ts` which DOES return `/mentor/dashboard` for mentor.
- C3. `mentor_sessions.status` enum in code (`approved | dispatched | denied | pending_approval`) ≠ spec enum (`requested | parent_pending | scheduled | live | completed | cancelled | no_show`). Likely ride-style enum carried over from transport surface (`B6` §2.2).
- C4. Public `/devenir-ambassadeur` page advertises **500 DH** withdrawal threshold; `/api/ambassador/withdrawals` enforces **100 DH** (`B5` §3.3).
- C5. Public `/devenir-ambassadeur` page advertises **10%** commission; `/ambassador/page.tsx` hardcodes **15%**; `ambassadors.commission_rate` column suggests per-row override. No single source of truth (`ambassador-referral.md` §6 Q1).
- C6. `/api/auth/register-teen` route comment claims the teen `auth.users` is "provisioned via Supabase Auth admin createUser at the moment the parent validates" — `/api/auth/validate-teen` does NOT do this. Documented promise not kept (`C2` D4).
- C7. Whitepaper §19 mandates `profiles.is_onboarded BOOLEAN`; live DB has no such column; only teens get a partial gate via `/onboarding/complete` and that path is unreachable for parent-validated teens (`onboarding-flows.md` §4 #2, `C2` D14).
- C8. Whitepaper §19 mandates `linking_codes` (6-digit, 24h, single-use); UI copy ("code unique de liaison") references it; backend uses email + 7-day token only. No `linking_codes` table exists (`onboarding-flows.md` §3).
- C9. `getAdminInfo` reads `admin_roles.permissions` JSONB; column does not exist in live DB — silent no-op on per-admin overrides (`admin-moderation.md` §2).
- C10. `app/api/partners/register` writes columns (`company_registration_number`, `tax_id`, `phone`, `website`, `address`, `city`, `postal_code`, `description`, `contact_person_*`) that don't exist on the live `partners` table — silent data loss (`partner-network.md` §3).

---

## File checklist (P0 to make this canon real)

1. Migration: extend `profiles.role` CHECK to the §2 enum + add `profiles.is_onboarded BOOLEAN` + add `admin_roles.permissions JSONB`.
2. Migration: collapse `partners.status` to `{pending,in_review,active,rejected,suspended}` (U10).
3. Migration: create `linking_codes` (6-digit, 24h TTL, single-use).
4. Migration: add `mentor_availability` table.
5. Migration: create `ambassadors`, `referral_attribution`, `ambassador_commissions`, `ambassador_payouts` (per whitepaper §D11) + add `track ∈ {organic,influencer}`.
6. Edit `app/auth/redirect/page.tsx` — implement §3 switch fully (mentor + driver cases; status-aware partner/mentor/driver/ambassador subcases; `is_onboarded` gates; default → `/auth/error`).
7. Edit `app/api/auth/validate-teen/route.ts` — call `supabase.auth.admin.createUser` first, use returned uid as `profiles.id` and `teens.id`, send magic-link to teen, set `is_onboarded=false`.
8. Edit `app/api/partners/register/route.ts` — call `supabase.auth.admin.createUser` first, set `raw_user_meta_data.role='partner'`, send magic-link, write all the columns the form sends (after migration).
9. Delete `auth.signUp` call inside `components/onboarding/parent-setup-step.tsx`; redirect "Continue" to `/auth/sign-up?source=wizard&tempUserId=…`.
10. Build M1 (mentor candidature), M2 (driver surface), M5 (mentor wizard), M7 (parent wizard chain), M9 (partner post-approval wizard), M12 (ambassador welcome tour), M15 (`/join?ref=…`), M16 (resend confirmation), M18 (linking-code API), per §4 routes.
11. Add `POST /api/<role>/onboarding/complete` endpoints (×6 roles); only these may flip `is_onboarded=true`.
12. Add middleware redirect for `is_onboarded=false` per §4 policy.
13. CI rule: forbid `auth.signUp` calls outside `app/auth/sign-up/page.tsx` (rule #3 in §6).
14. CI rule: forbid `INSERT INTO public.profiles` outside the `handle_new_user` trigger (rule #1 in §6).
