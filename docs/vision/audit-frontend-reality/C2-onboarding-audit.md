# C2 — Onboarding Flows Audit (READ-ONLY)

Auditor: agent C2
Scope: full sign-up → first useful action across every role
Method: code-only inspection of `app/auth/**`, `app/onboarding/**`, role dashboards, role-specific apply / register API routes, and middleware redirect rules.

---

## 1. Building blocks discovered

### 1.1 Two parallel sign-up surfaces (already a smell)

There are TWO unrelated sign-up entry points and they do NOT funnel into each other.

| Entry | File | Auth created? | Role assigned? | Outcome |
|---|---|---|---|---|
| **A. `/auth/sign-up`** (the "real" one) | `app/auth/sign-up/page.tsx` | YES — `supabase.auth.signUp(email,password)` | NO (data: `nom, prenom, telephone, ville, accept_newsletter` — no role) | Email confirm → `/dashboard` (which middleware bounces to `/auth/redirect`) |
| **B. `/onboarding`** (the marketing wizard) | `app/onboarding/page.tsx` + 7 step components | YES — but **only inside `parent-setup-step.tsx`** via a SECOND `supabase.auth.signUp()`. The `teen-setup-step.tsx` calls `/api/auth/register-teen` which does **NOT** create an `auth.users` row at all (it only inserts a `pending_teen_registrations` row). | "parent" assigned via `user_type` metadata; teen role created later by parent via `/auth/validate-teen` | parents → `/dashboard`, teens → `/onboarding/interests` |

**Both flows lead to `/auth/redirect`**, which reads `profiles.role` and bounces.

### 1.2 The role-routing dispatcher

`app/auth/redirect/page.tsx` (l. 8–66):

```
no user            → /auth/login
no profile row     → /onboarding  (the marketing wizard)
role = teen        → /teen
role = parent      → /parent
role = ambassador  → /ambassador
role = partner     → /partner
role = admin       → /admin
default            → /onboarding   ← catches "mentor" and any other role
```

**Critical gap**: `mentor` is a documented role (`UserRole` type in `lib/auth/get-user-role.ts:3`, mentor layout at `app/mentor/layout.tsx`, mentor dashboard at `app/mentor/dashboard/page.tsx`) but **not in the redirect switch**. A mentor logging in falls into the `default` branch and is sent to the marketing onboarding wizard, which has no mentor track and offers only "Parent" or "Teen" cards. Mentor must manually type `/mentor/dashboard` in the URL bar.

### 1.3 Middleware role-gate

`middleware.ts:222-308` blocks cross-role dashboard access (teen→parent, etc.) but ONLY for `/teen /parent /ambassador /partner` (not `/mentor`, not `/admin/...` — `/admin` has its own block earlier). It also rewrites bare `/dashboard` to the role's home.

### 1.4 The "personalization" wizard (teen-only post-auth)

`app/onboarding/{interests,goals,learning-style,complete}/page.tsx` — server components, all gated `if (userInfo.role !== "teen") redirect("/parent" or "/partner" or "/")`. Sequence:

```
/onboarding/interests   → InterestPicker   (writes teen_interests)
/onboarding/goals       → GoalsForm         (writes teen_goals priority 1..3)
/onboarding/learning-style → LearningStyleQuiz (writes teens.learning_style + archetype)
/onboarding/complete    → marks profiles.is_onboarded=true → /teen
```

Triggered only from the wizard's `CompletionStep` for teens (`app/onboarding/page.tsx:130-135`). NOT triggered when a teen lands on `/auth/redirect` after parent validation — they go straight to `/teen` and `is_onboarded` stays false silently.

---

## 2. Per-role flow diagrams

### 2.1 PARENT (via marketing wizard) — score 7/10

```
landing
  │
  ▼
/onboarding              (welcome step — features tour)
  │
  ▼
/onboarding > showcase   (feature showcase)
  │
  ▼
/onboarding > profile-type  ──→ user picks "Parent"
  │
  ▼
/onboarding > parent-setup  ── form: firstName, lastName, email, phone, password, confirm
  │                            calls supabase.auth.signUp({...user_type:'parent'})
  │                            inserts into `parents` table
  │
  ▼
/onboarding > features      (info screen)
  │
  ▼
/onboarding > completion    (XP/badges celebration, 3s delay)
  │
  ▼
/dashboard ── middleware ──→ /auth/redirect ──→ /parent
```

Strengths: rich UX, gamification XP, step persistence (24h resume), keyboard nav, reduced-motion support, "skip" escape hatch.
Issues: NO email confirmation gate before landing on /parent (the `parent-setup-step` has zero handling for `data.session === null` after signUp — proceeds even if Supabase requires confirm). Phone validation is Morocco-only (`/^(\+212|0)[67]\d{8}$/`).

### 2.2 PARENT (via direct `/auth/sign-up`) — score 4/10

```
/auth/sign-up   ── form: prenom, nom, email, telephone, ville, password, newsletter, terms
                   calls supabase.auth.signUp (NO user_type, NO role metadata)
  │
  ▼
/auth/sign-up-success  ("Vérifiez votre email")
  │
  ▼ (user clicks email link)
/auth/callback ?code=xxx → /auth/redirect
  │
  ▼
profile.role === undefined  ──→ /onboarding   (the wizard, which now asks them to RE-pick parent/teen!)
```

This is the "dead-end" path: a user filling `/auth/sign-up` is essentially treated as anonymous post-confirm because no role was set. They are bounced back into the marketing wizard but **already authenticated**, and the wizard's `parent-setup-step` will call `auth.signUp` AGAIN and fail (duplicate email). There is no recovery UI — only a generic toast `"Erreur lors de la création du compte"`.

### 2.3 TEEN — score 5/10

The teen path is the only one that uses the parental-validation pattern.

```
/onboarding > profile-type   ──→ user picks "Teen"
  │
  ▼
/onboarding > teen-setup     ── form: teenFirstName, teenLastName, dateOfBirth,
  │                              parentEmail, parentPhone (+ interest chips, learning style chips,
  │                              archetype chips — all stored in localStorage as PRE-AUTH teasers)
  │                              POST /api/auth/register-teen
  │                                ├── inserts pending_teen_registrations
  │                                ├── generates 7-day token
  │                                └── emails parent (Resend; SMS not yet integrated — comment l.140)
  │
  ▼
/onboarding > completion     (celebration — but teen has NO account yet!)
  │
  ▼
/onboarding/interests        ── BUT the teen has no auth session, so /onboarding/interests redirects to /auth/login!
                                  (server-side gate at l.17-25 of app/onboarding/interests/page.tsx)
```

Then ASYNC, the parent receives email:

```
parent clicks email link
  │
  ▼
/auth/validate-teen?token=xxx
  │
  ├── if parent not logged in → /auth/login?redirect=...
  ▼
parent clicks "Valider"
  │
  ▼
POST /api/auth/validate-teen {action:'approve'}
  │
  ├── creates profiles row (role=teen, email=teen_email OR `teen_<id>@teensparty.local`)
  ├── creates teen_full_profile (level 1, 100 coins welcome bonus)
  ├── creates parent_teen_links
  └── ❗ DOES NOT create an auth.users row, DOES NOT set a password
  │
  ▼
parent → /parent/teens (3s delay)
```

**Critical dead-ends**:

1. **Teen never gets a way to sign in.** `validate-teen` POST creates a `profiles` row but **does NOT call `supabase.auth.admin.createUser`** despite the comment in `register-teen` route claiming it does (l.32-36 of `app/api/auth/register-teen/route.ts` says auth is "provisioned via Supabase Auth admin createUser at the moment the parent validates" — but searching `validate-teen/route.ts` shows no such call). Teen stuck.
2. **Local-fallback email** `teen_${id}@teensparty.local` is used as profile.email if `teen_email` is null. That email is unreachable, so no password reset is possible.
3. **`profile.id = auth.users.id` invariant violated.** The insert uses Supabase auto-uuid for `profiles.id` rather than the teen's `auth.users.id` (since no auth.users exists). Any future `auth.signUp(teen_email)` will create a SECOND profile row with the auth uid and orphan everything tied to the placeholder uuid (xp, coins, parent link).
4. **`is_onboarded` never set true** for teens unless they navigate manually to `/onboarding/complete`. The wizard's celebration step tries to push to `/onboarding/interests`, but the teen has no session at that moment.
5. **Token expiry = 7 days**, no resend UI for parent.

### 2.4 PARTNER — score 6/10

```
/devenir-partenaire                       (marketing landing)
  │
  ▼
/devenir-partenaire/inscription           (multi-step form: pick retail/venue/club/education)
  │                                         POST /api/partners/register
  │                                          → inserts partners (status='pending')
  │                                          → inserts type-specific child rows
  │                                          (NO auth.users created, NO email sent)
  │
  ▼
(black box — no confirmation page returned by code review; route returns JSON only)
```

Then later, somehow, a partner logs in via `/auth/login` (already has a profile? unclear how). On `/auth/redirect`:

```
profile.role = "partner"  →  /partner
  │
  ▼
app/partner/page.tsx queries `partners` by email
  │
  ├── partner.status ∈ {active, verified, approved}  →  full dashboard
  └── otherwise (pending, in_review, rejected, suspended)
                                                    →  <PartnerAwaitingApproval />
```

**Dead-ends**:

1. **Where does the partner get an account?** `POST /api/partners/register` creates a row in `partners` keyed by `email` but never creates `auth.users` or a `profiles` row with `role='partner'`. The bridge between the form submission and ever being able to log in is missing in the audited code. Likely manual / admin script.
2. **No sign-up email confirmation step** in this path. The partner would have to use `/auth/sign-up` separately, then admin manually flips `profiles.role`.
3. **`/partner/kyc/page.tsx` is read-only** — comment l.9 says "the onboarding upload flow lives elsewhere". I could not locate the upload UI. Partners have no in-app way to submit their KYC docs.

### 2.5 MENTOR — score 2/10

```
???   (no public sign-up surface for mentor in app/)
  │
  ▼
manually a profile gets role='mentor'  (admin? SQL?)
  │
  ▼
mentor logs in via /auth/login
  │
  ▼
/auth/redirect ── mentor NOT in switch ──→ /onboarding   (marketing wizard, parent-or-teen only!)
  │
  └── (mentor must manually navigate to /mentor/dashboard)
        │
        ▼
        getUserRole() finds role=mentor but no mentors row →
          dashboard renders "Profil mentor introuvable.
          Soumettez votre candidature pour démarrer.
          [Compléter mon profil]" link → /mentor/profile/edit
              │
              ▼
              Profile-edit page shows "Aucune fiche mentor n'existe encore...
                Contactez un administrateur ou lancez une candidature
                via /api/mentor/apply." — telling a NON-DEVELOPER USER to call an API endpoint.
```

The `POST /api/mentor/apply` route exists (`app/api/mentor/apply/route.ts`) and calls `apply_mentor` RPC, but **no UI in app/ ever invokes it**. There is no mentor application form, no mentor sign-up page, no mentor onboarding wizard, no auto-routing. Functionally the mentor flow is half-built.

### 2.6 DRIVER — score 0/10

```
(nothing)
```

- No `/app/driver/` directory exists (only `/app/api/driver/rides/[id]/...` operational endpoints).
- No `/devenir-chauffeur` marketing page.
- No driver-facing dashboard, no driver layout, no driver onboarding.
- The role `'driver'` is **not even in the `UserRole` union** (`lib/auth/get-user-role.ts:3`).
- `nivy_drivers` table exists; the only UI is the **admin** view at `app/admin/drivers/page.tsx` listing drivers with `kyc_status='pending'` and a queue. Rows must be inserted by admin (or some other backend flow not in the audit scope).
- Drivers cannot self-sign-up. Drivers cannot log in to a UI. The platform has zero driver-facing surface despite the `/api/driver/rides/[id]/{dispatch,track,complete}` endpoints expecting an authenticated driver.

### 2.7 AMBASSADOR — score 6/10

```
/devenir-ambassadeur            (marketing)
  │
  ▼
/devenir-ambassadeur/candidature
  │  ── server-side guard: must already be logged in (redirects to /auth/login)
  │  ── if `ambassadors` row already exists → redirects back to /devenir-ambassadeur
  │  ── otherwise renders <AmbassadorApplicationForm />
  │
  ▼  (application submitted, status='pending', admin approval needed)
  │
  ▼ once approved, role flips to ambassador
  │
/auth/redirect → /ambassador  (full dashboard with referral code, share buttons, stats)
```

Issues: assumes the user already has an account from the generic `/auth/sign-up` flow before applying. No explicit "you must register first" copy on the marketing page. Mid-flow login redirect breaks momentum.

### 2.8 ADMIN — score 7/10

```
admin already exists in admin_roles (manually inserted)
  │
  ▼
admin signs in via /auth/login
  │
  ▼
/auth/redirect (profile.role='admin')  →  /admin
  │
  ▼
middleware re-validates against admin_roles, page does .maybeSingle() guard
```

Working as designed for back-office. There's no self-service admin onboarding (correct).

---

## 3. Score table

| Role | Has sign-up UI? | Has onboarding wizard? | Email confirm? | Lands somewhere useful? | Score /10 |
|---|---|---|---|---|---|
| Parent (via /onboarding wizard) | YES | YES (7-step gamified) | NOT enforced | YES (/parent) | **7** |
| Parent (via /auth/sign-up) | YES | NO (loops to wizard) | YES | NO (loops back) | **4** |
| Teen | YES (under wizard) | YES (interests/goals/learning-style) | n/a | NO — teen has no way to authenticate after parent approval | **5** |
| Partner | YES (multi-step form) | NO (status-aware empty state only) | NO | partial — needs admin to wire `profiles.role='partner'` | **6** |
| Mentor | NO | NO | NO | NO — error page tells user to call an API directly | **2** |
| Driver | NO | NO | NO | NO — surface does not exist | **0** |
| Ambassador | YES (post-login application) | NO (just an application form) | n/a | YES once approved | **6** |
| Admin | NO (intentional) | NO (intentional) | n/a | YES | **7** (n/a really) |

Composite end-user onboarding score (excluding admin): **(7+4+5+6+2+0+6) / 7 ≈ 4.3 / 10**

---

## 4. Dead-ends table

| # | Role | Trigger | Symptom | Severity |
|---|---|---|---|---|
| D1 | Mentor | log-in | redirected to wrong wizard (parent/teen only) — no mentor route in `/auth/redirect` switch | HIGH |
| D2 | Mentor | wants to apply | UI tells user to "lancer une candidature via `/api/mentor/apply`" — endpoint reference shown to end users | HIGH |
| D3 | Driver | any | no UI exists at all; role missing from `UserRole` enum | CRITICAL (blocks transport feature) |
| D4 | Teen | post parent validation | no `auth.users` row created → teen can never log in | CRITICAL |
| D5 | Teen | post parent validation | placeholder email `teen_<id>@teensparty.local` blocks password reset & future signup | HIGH |
| D6 | Teen | post-celebration redirect | `/onboarding/interests` requires session but teen has none → bounced to `/auth/login` | HIGH |
| D7 | Teen | profile id strategy | `profiles.id` ≠ future `auth.users.id` → orphaned XP, coins, parent links if teen ever registers | CRITICAL |
| D8 | Parent | direct `/auth/sign-up` | role never set; `/auth/redirect` sends them BACK to wizard which tries to signUp again → duplicate-email error | HIGH |
| D9 | Parent | wizard completion | `parent-setup-step.tsx` does not check `data.session` after signUp; if email-confirm is enabled they land on /parent unauthenticated | MEDIUM |
| D10 | Partner | post application | how partner logs in is undocumented in code: `/api/partners/register` never creates `auth.users` or `profiles.role='partner'` | HIGH |
| D11 | Partner | KYC docs | `/partner/kyc` is read-only — no upload UI located | MEDIUM |
| D12 | Ambassador | not yet logged in | `/devenir-ambassadeur/candidature` redirects to `/auth/login` mid-flow with no contextual messaging | LOW |
| D13 | Any | post `/auth/sign-up-success` | the "Renvoyer" button on `/auth/confirm-email` has no `onClick` handler — purely cosmetic (it's also a different page than `/auth/sign-up-success`) | LOW |
| D14 | Teen | `is_onboarded=true` | only set if teen navigates manually to `/onboarding/complete`; never set by validate-teen flow | MEDIUM |

---

## 5. Missing onboarding wizards

| Role | Has dashboard? | Has wizard? | What's missing |
|---|---|---|---|
| Parent | YES | YES (shared wizard) | OK |
| Teen (interests/goals/style) | YES | YES (post-auth steps) | But hard-blocked by D4/D6 |
| Partner | YES | NO | Multi-step intake form exists at `/devenir-partenaire/inscription` but no welcome tour, no "what next" wizard after approval, no in-app KYC upload step |
| Mentor | YES | **NO** | No application form, no in-app candidature, no welcome tour. Edit-profile page is a fallback dump. |
| Driver | **NO** | **NO** | No surface at all |
| Ambassador | YES | NO (just `<AmbassadorApplicationForm />`) | No tour of the dashboard, no first-time contextual help |
| Admin | YES | NO (intentional) | OK |

---

## 6. First-time-user UX gaps

### Welcome screens
- **Teen dashboard** (`/teen`): renders `<AvatarCoach fallbackName={userInfo.fullName}/>` immediately — no "first session" gating, but also no welcome tour. Empty state for new teen with 0 XP, 0 coins (well, 100 welcome coins) just shows the bento grid with empty cards.
- **Parent dashboard** (`/parent`): if `teens` array is empty (no validated teen yet), the dashboard renders the bento grid against `teenIds = []` and many sections will fall back to whatever skeletons exist. No "you have no children yet — invite one" empty state was located.
- **Partner dashboard**: HAS a proper first-run state (`<PartnerAwaitingApproval/>`) — best in class.
- **Ambassador dashboard**: no welcome tour; immediately shows referral code + share buttons — fine for re-entry but no first-time guidance.
- **Mentor dashboard**: HAS a no-mentor-row empty state with a CTA, but the CTA leads to a page that says "call an API endpoint."

### Quick tour / product tour
- The marketing `/onboarding` wizard has steps `welcome` and `showcase` and `features`, which IS the product tour for parent + teen pre-auth. Post-auth there is **NO product tour for any role.**

### Empty-state CTAs
- Parent with 0 teens: no "Add your first child" CTA located. The Wave-2 chores / allowances / rides features assume a teen exists.
- Teen with 0 friends, 0 missions: present but skeleton-shaped, no "Start here" hand-holding.
- Partner with 0 offers (post-approval): `/partner/dashboard` and `/partner/offers` exist, no first-offer guidance located in the audit window.

### XP / gamification onboarding
- The wizard awards XP for completing onboarding steps and **syncs them to the user via `syncOnboardingToUser` keyed on `tempUserId`**. For teen sign-up, the teen has NO authenticated user at the moment of the wizard finishing, so the XP is stranded under `tempUserId` in localStorage. The parent-validation flow then awards a fresh `100` welcome coins on `teen_full_profile` insert without merging the wizard's XP.

### Internationalization
- Wizard uses `useT()` translation keys; `/auth/login` and `/auth/sign-up` use it; **but** `/auth/sign-up-success`, `/auth/confirm-email`, `/auth/error`, and the entire `/onboarding/*` post-auth path are **hard-coded French strings**. Single-language onboarding.

### Accessibility
- Wizard steps include `prefersReducedMotion` checks, ARIA roles (`role="radiogroup"`, `role="radio"`, `role="alert"` on errors), keyboard hints. Best in class within the audit.
- `/auth/login` and `/auth/sign-up` also use `aria-live`, `noValidate`, focus-on-error, `autoComplete`, keyboard-friendly password toggle. Solid.

---

## 7. Most actionable fixes (in priority order)

1. **Add `mentor` and `driver` cases to `app/auth/redirect/page.tsx` switch.** One-liner. Mentor → `/mentor/dashboard` or `/mentor/profile/edit` if no mentors row, driver → `/driver/dashboard` (TBD) or a "coming soon".
2. **Create teen `auth.users` at parent validation.** In `app/api/auth/validate-teen/route.ts:184` (where the teen profile is currently inserted with no auth row), call `supabase.auth.admin.createUser(...)` first, use the returned uid as `profiles.id`, and email the teen a magic-link or temp password. The comment in `register-teen/route.ts:32-36` already promises this is done — implement it.
3. **Build a minimal mentor application UI** at `/mentor/apply` that calls the existing `/api/mentor/apply`. Update `/mentor/dashboard` and `/mentor/profile/edit` empty states to link there instead of telling users to "call an API endpoint."
4. **Build any driver-facing surface**: `app/driver/layout.tsx`, `app/driver/dashboard/page.tsx`, register `'driver'` in `UserRole`, add `case "driver":` to `/auth/redirect`. Without this the entire ride-hailing feature has no operator app.
5. **Wire partner login**: either auto-create `auth.users` + `profiles.role='partner'` in `/api/partners/register`, or document the manual admin step + add an "Awaiting account creation" return page to the partner intake form.
6. **Eliminate the dual-track parent sign-up.** Either redirect `/auth/sign-up` to `/onboarding`, or wire `/auth/sign-up` to ask role on submit and skip the marketing wizard for already-authenticated users.
7. **Set `profiles.is_onboarded=true` in `/api/auth/validate-teen` POST after teen creation**, so the personalization steps don't get re-triggered later.
8. **Replace the "Renvoyer" button on `/auth/confirm-email`** with a working handler (or remove it).

---

## 8. Files referenced

Auth surfaces:
- `C:\Users\Shadow\Desktop\NIVY\app\auth\login\page.tsx`
- `C:\Users\Shadow\Desktop\NIVY\app\auth\sign-up\page.tsx`
- `C:\Users\Shadow\Desktop\NIVY\app\auth\sign-up-success\page.tsx`
- `C:\Users\Shadow\Desktop\NIVY\app\auth\confirm-email\page.tsx`
- `C:\Users\Shadow\Desktop\NIVY\app\auth\redirect\page.tsx`
- `C:\Users\Shadow\Desktop\NIVY\app\auth\callback\route.ts`
- `C:\Users\Shadow\Desktop\NIVY\app\auth\validate-teen\page.tsx`
- `C:\Users\Shadow\Desktop\NIVY\app\auth\error\page.tsx`
- `C:\Users\Shadow\Desktop\NIVY\app\api\auth\register-teen\route.ts`
- `C:\Users\Shadow\Desktop\NIVY\app\api\auth\validate-teen\route.ts`
- `C:\Users\Shadow\Desktop\NIVY\middleware.ts`
- `C:\Users\Shadow\Desktop\NIVY\lib\auth\get-user-role.ts`

Wizard:
- `C:\Users\Shadow\Desktop\NIVY\app\onboarding\page.tsx`
- `C:\Users\Shadow\Desktop\NIVY\app\onboarding\interests\page.tsx`
- `C:\Users\Shadow\Desktop\NIVY\app\onboarding\goals\page.tsx`
- `C:\Users\Shadow\Desktop\NIVY\app\onboarding\learning-style\page.tsx`
- `C:\Users\Shadow\Desktop\NIVY\app\onboarding\complete\page.tsx`
- `C:\Users\Shadow\Desktop\NIVY\components\onboarding\welcome-step.tsx`
- `C:\Users\Shadow\Desktop\NIVY\components\onboarding\showcase-step.tsx`
- `C:\Users\Shadow\Desktop\NIVY\components\onboarding\profile-type-step.tsx`
- `C:\Users\Shadow\Desktop\NIVY\components\onboarding\parent-setup-step.tsx`
- `C:\Users\Shadow\Desktop\NIVY\components\onboarding\teen-setup-step.tsx`
- `C:\Users\Shadow\Desktop\NIVY\components\onboarding\features-step.tsx`
- `C:\Users\Shadow\Desktop\NIVY\components\onboarding\completion-step.tsx`
- `C:\Users\Shadow\Desktop\NIVY\components\onboarding\onboarding-complete-client.tsx`
- `C:\Users\Shadow\Desktop\NIVY\lib\hooks\use-onboarding.ts`

Role landings:
- `C:\Users\Shadow\Desktop\NIVY\app\teen\page.tsx`
- `C:\Users\Shadow\Desktop\NIVY\app\parent\page.tsx`
- `C:\Users\Shadow\Desktop\NIVY\app\partner\page.tsx`
- `C:\Users\Shadow\Desktop\NIVY\app\partner\kyc\page.tsx`
- `C:\Users\Shadow\Desktop\NIVY\app\ambassador\page.tsx`
- `C:\Users\Shadow\Desktop\NIVY\app\mentor\layout.tsx`
- `C:\Users\Shadow\Desktop\NIVY\app\mentor\dashboard\page.tsx`
- `C:\Users\Shadow\Desktop\NIVY\app\mentor\profile\edit\page.tsx`
- `C:\Users\Shadow\Desktop\NIVY\app\admin\page.tsx`
- `C:\Users\Shadow\Desktop\NIVY\app\admin\drivers\page.tsx`
- `C:\Users\Shadow\Desktop\NIVY\components\dashboard\partner\awaiting-approval.tsx`

Role applications:
- `C:\Users\Shadow\Desktop\NIVY\app\devenir-partenaire\inscription\page.tsx`
- `C:\Users\Shadow\Desktop\NIVY\app\devenir-ambassadeur\candidature\page.tsx`
- `C:\Users\Shadow\Desktop\NIVY\app\devenir-influenceur\candidature\page.tsx`
- `C:\Users\Shadow\Desktop\NIVY\app\api\partners\register\route.ts`
- `C:\Users\Shadow\Desktop\NIVY\app\api\mentor\apply\route.ts`
