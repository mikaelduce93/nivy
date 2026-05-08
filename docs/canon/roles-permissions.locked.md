# LOCKED — Roles & Permissions Canon

> Status: **LOCKED** as of 2026-05-08. Source-of-truth for any role / permission /
> middleware / RLS work. All audits (B4, C2, 07-security, PRODUCT_WHITEPAPER §18)
> reconcile to this file. If a code change disagrees with this doc, the **doc
> wins** until a founder decision below is resolved and the doc is re-locked.
>
> Sources read: `lib/auth/admin-permissions.ts`, `lib/auth/get-user-role.ts`,
> `middleware.ts`, `app/auth/redirect/page.tsx`,
> `gamification-system/database/all_migrations.sql` (profiles + admin_roles DDL),
> `gamification-system/database/migrations/060_wave_a_security_hardening.sql`,
> `gamification-system/database/migrations/061_wave_b_money_pipeline.sql`,
> `docs/vision/audit-frontend-reality/B4-admin-audit.md`,
> `docs/vision/audit-frontend-reality/C2-onboarding-audit.md`,
> `docs/vision/audit-prelaunch/07-security-compliance.md`,
> `docs/vision/PRODUCT_WHITEPAPER.md` §18, §19.

---

## 1. LOCKED — `profiles.role` enum (top-level identity)

**DB reality (today):** `profiles.role TEXT DEFAULT 'parent'` — **no CHECK
constraint, no PostgreSQL ENUM type**. Any string can be inserted. This is a
contradiction with the TypeScript `UserRole` union.
(Source: `gamification-system/database/all_migrations.sql:8`.)

**Locked allowed values** (the only strings code is permitted to write into
`profiles.role`):

| Value          | Meaning                                        | Self-signup? |
|----------------|------------------------------------------------|--------------|
| `parent`       | Adult primary account, owns wallet + teens     | yes          |
| `teen`         | Minor, parent-validated                        | no (parent gate) |
| `ambassador`   | Approved community ambassador                  | post-approval flip from `parent` |
| `partner`      | Partner-staff representative                   | post-approval flip |
| `mentor`       | Approved mentor                                | post-approval flip |
| `driver`       | Approved Nivy driver                           | post-approval flip (NOT YET in code enum — see §7) |
| `admin`        | Any admin sub-role; sub-role lives in `admin_roles.role` | invite-only |

**Removed / never-write:**
- `super_admin`, `moderator`, `support` are **NOT** valid `profiles.role`
  values. They are admin SUB-roles (see §2). The TS union in
  `lib/auth/get-user-role.ts:3` listing them as `UserRole` is misleading —
  treat the top-level role as `admin` and read sub-role from `admin_roles`.
- `unknown` is a runtime fallback only; never persist.

**Required follow-up to enforce the lock**:
1. Add `CHECK (role IN ('parent','teen','ambassador','partner','mentor','driver','admin'))`
   to `profiles.role`.
2. Trim `UserRole` in `lib/auth/get-user-role.ts` to the 7 values above + `unknown`;
   move `super_admin | moderator | support` into a separate `AdminSubRole` type
   (already exists as `AdminRole` in `lib/auth/admin-permissions.ts:63`).

---

## 2. LOCKED — `admin_roles.role` sub-role enum + capability matrix

**DB reality:** `admin_roles (profile_id UUID, role TEXT DEFAULT 'admin',
permissions JSONB)` — **no CHECK constraint**.
(Source: `gamification-system/database/all_migrations.sql:13`.)

**Locked allowed values for `admin_roles.role`:**

`super_admin` | `admin` | `moderator` | `support`

(matches `AdminRole` union in `lib/auth/admin-permissions.ts:63`.)

### Capability matrix (LOCKED — single source of truth = `ADMIN_PERMISSIONS` constant)

Legend: ✓ = allowed, blank = denied. Matches `lib/auth/admin-permissions.ts:4-60`
verbatim. Any new admin permission is added here AND in the constant in the
same PR.

| Permission                | super_admin | admin | moderator | support |
|---------------------------|:-----------:|:-----:|:---------:|:-------:|
| dashboard.view            | ✓ | ✓ | ✓ | ✓ |
| users.view                | ✓ | ✓ | ✓ | ✓ |
| users.edit                | ✓ | ✓ | ✓ |   |
| users.delete              | ✓ | ✓ |   |   |
| users.change_role         | ✓ |   |   |   |
| events.view               | ✓ | ✓ | ✓ | ✓ |
| events.create             | ✓ | ✓ | ✓ |   |
| events.edit               | ✓ | ✓ | ✓ |   |
| events.delete             | ✓ | ✓ |   |   |
| events.publish            | ✓ | ✓ |   |   |
| partners.view             | ✓ | ✓ | ✓ |   |
| partners.create           | ✓ | ✓ |   |   |
| partners.edit             | ✓ | ✓ |   |   |
| partners.delete           | ✓ |   |   |   |
| partners.approve          | ✓ | ✓ |   |   |
| ambassadors.view          | ✓ | ✓ | ✓ |   |
| ambassadors.approve       | ✓ | ✓ |   |   |
| ambassadors.reject        | ✓ | ✓ |   |   |
| ambassadors.manage_rewards| ✓ | ✓ |   |   |
| analytics.view            | ✓ | ✓ | ✓ |   |
| analytics.export          | ✓ | ✓ |   |   |
| analytics.financial       | ✓ |   |   |   |
| reservations.view         | ✓ | ✓ | ✓ | ✓ |
| reservations.checkin      | ✓ | ✓ | ✓ | ✓ |
| reservations.cancel       | ✓ | ✓ | ✓ |   |
| reservations.refund       | ✓ | ✓ |   |   |
| content.view              | ✓ | ✓ | ✓ |   |
| content.generate          | ✓ | ✓ |   |   |
| content.publish           | ✓ | ✓ |   |   |
| system.logs               | ✓ | ✓ |   |   |
| system.settings           | ✓ |   |   |   |
| system.sql                | ✓ |   |   |   |
| system.migrations         | ✓ |   |   |   |
| system.permissions        | ✓ |   |   |   |
| support.tickets           | ✓ | ✓ | ✓ | ✓ |
| support.reply             | ✓ | ✓ | ✓ | ✓ |

**Override mechanism:** `admin_roles.permissions JSONB` may grant ADDITIONAL
permissions per-user (read in `getAdminInfo()` at lines 117-120). It must
never **revoke** a baseline permission for a sub-role — that creates a per-user
denial path with no UI to manage it. JSONB overrides are additive only.

---

## 3. LOCKED — RLS principles

These are the contracts every new RLS policy must satisfy. They reconcile the
patterns observed in migrations 056, 057, 059, 060, 061, 080, 091, 092, 093.

### 3.1 Read scope by role

| Resource family | Self read | Parent of teen | Same partner | Admin | Anonymous |
|---|---|---|---|---|---|
| `profiles` | own row only | yes (their teens via `parent_teen_links`) | no | yes | no |
| `teen_*` (XP, coins, missions, defi) | yes | yes (active link) | no | yes | no |
| `parent_*` (allowances, chores, approvals) | yes | n/a (parent IS owner) | no | yes | no |
| `mentors` (active row) | yes (own) | n/a | n/a | yes | yes (only `status='active' AND kyc_status='approved'`, non-PII) |
| `nivy_drivers` | yes (own) | only when ride is dispatched to that driver (P1 — see audit 07) | n/a | yes | no |
| `partners` / `partner_staff` | yes (own staff link) | no | yes (same partner_id) | yes | no |
| `feed_posts` | yes | no | n/a | yes | yes (only `status='published'`) |
| `marketplace_listings` | yes | yes (their teen's listings) | n/a | yes | yes (`status='active'`) |
| `escrow_ledger` / `payment_transactions` | yes (where actor) | yes (parent of teen entry) | yes (partner of payout) | yes | NEVER |

### 3.2 Write scope — money is service_role only

**LOCKED RULE.** Every write to a money-bearing table goes through a
SECURITY DEFINER RPC called from the service-role client. Tables in scope:

`payment_transactions`, `escrow_ledger`, `coin_transactions`, `user_coins`,
`partner_payouts`, `manual_topup_requests`, `marketplace_transactions`,
`food_orders`, `mentor_sessions` (price column), `ride_bookings` (fare column),
`parent_allowances`, `allowance_disbursements`, `savings_contributions`,
`partner_invoices`.

The corresponding RLS policies are **`USING (false)` for INSERT/UPDATE/DELETE
on the anon/authenticated role**. Only `service_role` (or a SECURITY DEFINER
function owned by the migration role) can mutate. The RPC re-checks
`auth.uid()` against the actor parameter (see §3.5).

### 3.3 Parental link gate

Any read or write touching a teen's data by a parent MUST be gated by:

```sql
EXISTS (
  SELECT 1 FROM parent_teen_links
  WHERE parent_id = auth.uid()
    AND teen_id   = <target_teen_id>
    AND status    = 'active'
)
```

`status='active'` is mandatory — pending/revoked links MUST NOT grant access.
This is the canonical predicate; helpers should wrap it (e.g. `is_parent_of(p_uid uuid, p_teen uuid)`).

### 3.4 Partner-tenant rule

A partner-side row is readable/writable by a `profiles.role='partner'` user
only when `EXISTS (SELECT 1 FROM partner_staff WHERE user_id = auth.uid()
AND partner_id = <row.partner_id> AND is_active = true)`. KYC documents
(`kyc-documents` bucket) further require `partner_staff.role = 'owner'` —
NOT `staff` — for both insert and read. Admins read via service-role or a
dedicated `kyc_admin_read` policy bound to `admin_roles` (TODO — audit 07).

### 3.5 SECURITY DEFINER RPC contract

Every SECURITY DEFINER RPC that performs a mutation as another user MUST:

1. Resolve `v_caller := auth.uid()` from the JWT.
2. Compare `v_caller` against the explicit actor parameter
   (`p_caller_id`, `p_teen_id`, `p_parent_id`, etc.).
3. If `v_caller IS NOT NULL AND v_caller <> p_actor` → raise `unauthorized`.
4. Allow the comparison to skip ONLY when `v_caller IS NULL` AND the call
   originates from a legitimate service-role context (cron, webhook).
5. Allow admin override ONLY via `EXISTS (SELECT 1 FROM admin_roles WHERE
   profile_id = v_caller)` (pattern in `057_transport_mobility_rpcs.sql:39`,
   `061_wave_b_money_pipeline.sql:211`).

### 3.6 Public-schema GRANT rule

NO blanket `GRANT ... ON SCHEMA public TO PUBLIC` or `TO anon`. Every grant
must be table-scoped or function-scoped, and the implicit `authenticated` /
`anon` access flows through RLS, not GRANT.

---

## 4. LOCKED — Middleware route protection

Reference: `middleware.ts:184-308`.

### 4.1 Prefix → required role

| Prefix                 | Auth required | Role gate                                                         | Source |
|------------------------|:-------------:|--------------------------------------------------------------------|--------|
| `/admin/*`             | yes           | row exists in `admin_roles` for `auth.uid()` (any sub-role)        | mw:184-219 |
| `/teen/*`              | yes           | `profiles.role = 'teen'` (else redirect to user's own dashboard)   | mw:222-295 |
| `/parent/*`            | yes           | `profiles.role = 'parent'`                                         | mw:222-295 |
| `/ambassador/*`        | yes           | `profiles.role = 'ambassador'`                                     | mw:222-295 |
| `/partner/*`           | yes           | `profiles.role = 'partner'`                                        | mw:222-295 |
| `/mentor/*`            | yes (TODO)    | **NOT IN MIDDLEWARE TODAY** — only the layout gates it             | gap |
| `/driver/*`            | n/a           | route group does not exist                                         | gap |
| `/dashboard`           | yes           | redirected to role-specific home, fallback `/auth/redirect`        | mw:297-303 |
| `/profile`, `/mes-*`   | yes           | any authenticated user                                             | mw:222 |
| `/api/cron/*`          | no auth cookie | `CRON_SECRET` Bearer OR `x-vercel-cron` header                    | route-level |
| `/api/webhooks/*`      | no auth cookie | provider HMAC signature (CSRF-exempt list mw:132-140)             | mw:132-140 |
| `/api/csrf`            | no            | issues CSRF token                                                  | mw:132 |
| `/api/*` (other, non-GET) | yes        | CSRF double-submit token validated                                 | mw:143-151 |
| public marketing       | no            | passes through                                                     | — |

### 4.2 Cross-role redirect (LOCKED behavior)

For prefixes in `dashboardPaths = ['/teen','/parent','/ambassador','/partner']`,
if `profiles.role` does NOT match the prefix, the user is redirected to
`roleRouteMap[userRole]` or `/auth/redirect`. (`mw:271-295`.)

**`/admin` is NOT in `dashboardPaths`** — it has its own gate at `mw:185` that
checks `admin_roles` table presence (not `profiles.role='admin'`). This is
correct (admin sub-role lives in `admin_roles`) but means a user with
`profiles.role='admin'` AND no `admin_roles` row is bounced to `/`.

### 4.3 Defense in depth

Every role layout (`app/admin/layout.tsx`, `app/teen/layout.tsx`,
`app/parent/layout.tsx`, `app/partner/layout.tsx`) re-runs the gate via
`getUserRole()` / `getAdminInfo()` and redirects on null. Pages then re-check
permissions for sensitive actions via `checkAdminPermission(...)`. Three
layers: middleware → layout → page/RPC. Keep all three.

---

## 5. DEPRECATED patterns

Patterns that exist in the codebase today but are forbidden going forward.
Each must be migrated to the canonical replacement.

| # | Deprecated pattern | Where (representative) | Replace with |
|---|---|---|---|
| D1 | `getUserRole().role === 'admin'` page-level gate (excludes moderator/support) | `/admin/drivers`, `/admin/drivers/[id]`, `/admin/logs`, `/admin/marketplace` (per B4 §4.4) | `getAdminInfo()` + `checkAdminPermission('<perm>')` |
| D2 | Sidebar items rendered identically for every admin sub-role | `components/layouts/admin-sidebar.tsx:33-84` | filter `navItems` by `roleHasPermission(role, item.requiredPerm)` |
| D3 | Hardcoded role string in URL switch missing `mentor` / `driver` | `app/auth/redirect/page.tsx:43-62` | add `case 'mentor'`, `case 'driver'`; default to `/onboarding/<role>` only for `parent`/`teen` |
| D4 | Direct `profiles.role` comparisons in client components for gating | `app/teen/circles/...`, `app/gamification/crews/...` (sub-role on circle membership table — different domain, but same anti-pattern) | server-side gate via `getUserRole()`; client only renders, never gates |
| D5 | Direct service-role table mutation without going through a SECURITY DEFINER RPC for money-bearing tables | `app/api/admin/drivers/[id]/approve/route.ts:25-37` (driver KYC is non-money so OK; flag for any money path) | wrap in `admin_<verb>_<noun>` RPC + audit log |
| D6 | `app/api/parent/approvals/route.ts` writes to non-existent columns/tables and silently fails | per audit 07 P0-1 | delete or rewrite as a dispatcher to `approve_ride` / `parent_approve_session` / `place_food_order` decision RPC |
| D7 | Two SQL/migration runners (`/admin/scripts-sql`, `/admin/gamification-setup`, `/api/admin/run-migration`) | per B4 §4.2 | one runner gated by `system.sql` permission, served only in non-prod or behind `ENABLE_ADMIN_SQL_EXECUTION` env flag |

---

## 6. FORBIDDEN patterns

These patterns are **never** acceptable. PRs introducing them must be blocked.

1. **`userInfo.role === 'admin'` (or any string-compare role gate) in any
   `/admin/**` page or API route.** Use `checkAdminPermission(<perm>)` /
   `requireAdminPermission(<perm>)` from `lib/auth/admin-permissions.ts`.
2. **Client-side role assignment.** Setting `profiles.role` from a
   `'use client'` component, an unauthenticated route, or any path the user
   can replay. Role flips happen exclusively via:
   - admin action through `/admin/permissions` (which calls a server route),
   - approval RPC (`approve_partner`, `approve_ambassador`, `approve_mentor`,
     `approve_driver`),
   - parent validation RPC for teens (`validate_teen_registration`).
3. **`GRANT ... ON SCHEMA public TO PUBLIC` / `TO anon` / `TO authenticated`.**
   Use per-table grants and rely on RLS.
4. **`createClient(SERVICE_ROLE_KEY)` outside `lib/supabase/service-role.ts`.**
   Audit 07 confirmed zero violations today; keep it that way.
5. **Writing to money-bearing tables from a non-service-role client** (see §3.2
   list). RLS denies it; do not work around it by adding a permissive policy.
6. **Reading another teen's PII** (full_name + birthday + phone + photo joined)
   from any teen-facing endpoint. Leaderboards return non-PII handles only.
7. **Exposing driver phone/plate to anyone other than the assigned ride's
   teen+parent.** Today's `nivy_drivers_self_read` is too permissive — see
   audit 07 P1-3.
8. **Bypassing CSRF** by adding to `csrfExemptPrefixes` for anything that is
   not a provider-signed webhook or a `CRON_SECRET`-protected cron route.
9. **Inserting an admin sub-role value (`super_admin`, `moderator`, `support`)
   into `profiles.role`.** That column holds the top-level role (`admin`); the
   sub-role lives in `admin_roles.role`.
10. **Returning a 200 success when an RLS write was silently denied.** Always
    check `error` on Supabase mutations and surface a real failure.

---

## 7. MISSING enum values (referenced in code, absent from DB constraint)

There is **no DB CHECK on `profiles.role`** today, so technically nothing is
"missing" — anything can be inserted. But the *intended* enum (per code paths
and audits) is broader than what the auth/redirect switch and middleware
recognize.

| Role     | Used in code? | In `UserRole` TS union? | In `/auth/redirect` switch? | In middleware role map? | Status |
|----------|:-------------:|:-----------------------:|:---------------------------:|:-----------------------:|--------|
| parent       | ✓ | ✓ | ✓ | ✓ | OK |
| teen         | ✓ | ✓ | ✓ | ✓ | OK |
| ambassador   | ✓ | ✓ | ✓ | ✓ | OK |
| partner      | ✓ | ✓ | ✓ | ✓ | OK |
| admin        | ✓ | ✓ | ✓ | ✓ (via `admin_roles`) | OK |
| **mentor**   | ✓ (`/mentor/*`, `mentors` table, `getUserRole` case) | ✓ | **MISSING** (D1 in C2 audit) | **MISSING** | LOCK requires add |
| **driver**   | ✓ (`/api/driver/*`, `nivy_drivers`, `/admin/drivers`) | **MISSING** (D3 in C2) | **MISSING** | **MISSING** (no `/driver/*` group exists) | LOCK requires add |
| super_admin / moderator / support | ✓ in `UserRole` (incorrectly) | ✓ | n/a | n/a | LOCK forbids in `profiles.role` (sub-role only) |

**Action required to enforce this lock** (separate PR, not this doc):

1. Add `driver` to `UserRole` union in `lib/auth/get-user-role.ts:3`.
2. Add `case 'mentor': router.push('/mentor/dashboard')` and
   `case 'driver': router.push('/driver/dashboard')` to
   `app/auth/redirect/page.tsx:43`.
3. Add `mentor: '/mentor', driver: '/driver'` to `roleRouteMap` in
   `middleware.ts:271` and to `dashboardPaths` cross-role check.
4. Apply the CHECK constraint from §1 once all live `profiles.role` values
   have been audited (run `SELECT DISTINCT role FROM profiles` first).

---

## 8. UNRESOLVED founder decisions — recommendation per item

These are decisions only the founder can lock. For each, the recommended
answer is given so engineering can proceed pending confirmation.

### 8.1 Is the `support` admin sub-role still needed?

**Reality:** `support` has zero usable surfaces today (no `/admin/support`,
no `/admin/tickets`, no inbox). Per B4 §3.4, the `support.tickets` and
`support.reply` permissions exist with no consumer.

**Recommendation:** **KEEP** the sub-role enum value, **BUILD** a minimal
`/admin/support-tickets` queue powered by `support_tickets` table
(whitepaper §18) before the public launch. Killing the sub-role means
re-introducing it in 3 months when the first parent complaint email arrives.

### 8.2 Does `mentor` get read access to a teen's profile?

**Reality:** mentor session booking enforces age range and parent approval,
but the mentor receives only the teen's first name + age + city today (per
`book_mentor_session` flow). Unclear whether mentor should see archetype /
learning style / interests for session prep.

**Recommendation:** mentor sees: **first name, age, learning_style,
top-3 interests, declared goals, prior session notes with this mentor**.
Mentor does NOT see: full_name, exact DOB, phone, parent identity,
financial data, friend graph, other mentor notes. Encode this as a SQL
view `mentor_visible_teen_profile` and grant SELECT to mentors who have
an active or completed `mentor_sessions` row with that teen.

### 8.3 Should `driver` be a `profiles.role` or a separate identity?

**Reality:** `nivy_drivers` joins to `profiles` via `user_id`, suggesting
a driver is a profile. But there is no `/driver/*` route group, no
self-signup, and the role is missing from the TS enum.

**Recommendation:** **YES, `driver` is a top-level `profiles.role`.** Add it
(see §7). Drivers are identity-rich users who need a mobile-first dashboard
(active rides, earnings, KYC status). Treating them as orphan `nivy_drivers`
rows with no profile role blocks the entire transport feature.

### 8.4 Can a single human have multiple roles? (e.g. parent + ambassador)

**Reality:** today `profiles.role` is single-valued. A parent who becomes
an ambassador has their `profiles.role` flipped to `ambassador`, losing
parent-side affordances unless the layouts compensate (they don't fully).

**Recommendation:** **role stacking** — keep `profiles.role` as the PRIMARY
role and add `profile_roles (profile_id, role, granted_at, granted_by)` as
a many-to-many for SECONDARY roles. A parent can be an ambassador without
losing parent UI. Defer implementation; lock the data model now.

### 8.5 Does `moderator` need its own dashboard URL or is `/admin` enough?

**Reality:** moderators see the same sidebar as super_admin but several
links lead to "Accès refusé". Confusing.

**Recommendation:** **filter sidebar by permission** (D2 above) so moderator
sees a 4-item nav (dashboard, users, content moderation queues, support).
No separate `/moderator` URL needed.

### 8.6 Are admin sub-roles assignable by `admin`, or only `super_admin`?

**Reality:** `users.change_role` is `super_admin` only (matrix §2). But
the `permissions JSONB` override on `admin_roles` could let an `admin`
elevate themselves if there were any UI to write that JSONB.

**Recommendation:** **`super_admin` only** for both `admin_roles` row
creation/update AND for any `admin_roles.permissions` JSONB write. Lock
the `permissions` column to additive grants only (§2 last paragraph).

### 8.7 Should `partner` accounts be created by `/api/partners/register` or by admin approval?

**Reality:** `/api/partners/register` creates a `partners` row but never
creates `auth.users` or sets `profiles.role='partner'` (audit C2 §2.4 D10).
The bridge is undocumented.

**Recommendation:** **two-phase**. Phase 1: public form creates `partners`
row with `status='pending'` and triggers a magic-link email to the contact
address. Phase 2: when the contact clicks the link, an `auth.users` row is
created via `supabase.auth.admin.createUser`, `profiles.role` is set to
`partner`, and `partner_staff` row is inserted with `role='owner'`. KYC
review by admin then flips `partners.status` to `active`. No more orphan
partner rows.

### 8.8 Mentor self-application route — `/mentor/apply` UI?

**Reality:** `POST /api/mentor/apply` exists but no UI invokes it; the
fallback page tells users to "call an API endpoint" (audit C2 §2.5 D2).

**Recommendation:** **build `/devenir-mentor` + `/devenir-mentor/candidature`**
mirroring the ambassador pattern. Mentor can apply pre-auth (creates
`mentor_applications` row + sends magic link) or post-auth (existing
parent/teen account adds mentor as a stacked role per §8.4).

---

## Summary — what is locked vs. open

**LOCKED (do not change without re-locking this doc):**
- 7 top-level role values for `profiles.role`.
- 4 sub-role values for `admin_roles.role`.
- 36-permission capability matrix in §2.
- RLS principles in §3 (especially money = service_role only, parental link
  predicate, partner-tenant predicate, SECURITY DEFINER contract).
- Middleware route map in §4.
- The forbidden patterns list in §6.

**OPEN until founder ack (recommendations in §8):**
- Fate of `support` sub-role (reco: keep + build).
- Mentor read-scope on teen profile (reco: scoped view).
- Driver as `profiles.role` (reco: yes, add it).
- Multi-role stacking model (reco: secondary `profile_roles` table).
- Sidebar filtering rule (reco: by permission).
- Admin sub-role assignment authority (reco: super_admin only).
- Partner auth-user provisioning (reco: two-phase magic-link).
- Mentor self-application UI (reco: build it).

**CONTRADICTIONS FLAGGED:**
- C1: TS union `UserRole` lists `super_admin | moderator | support` as if
  they were `profiles.role` values; they are admin sub-roles.
  (`lib/auth/get-user-role.ts:3` vs. `admin-permissions.ts:63`.)
- C2: DB has NO CHECK constraint on `profiles.role` or `admin_roles.role`
  despite this doc treating both as enums. Must be added by migration.
- C3: TS includes `mentor` in `UserRole` and `getUserRole()` enriches it,
  but `/auth/redirect` and middleware do not handle it.
- C4: `driver` is missing from `UserRole` entirely while `nivy_drivers`,
  `/admin/drivers`, and `/api/driver/*` all exist.
- C5: `app/api/parent/approvals/route.ts` writes to columns/tables that do
  not exist — every parent decision via that endpoint silently fails (audit
  07 P0-1). Treat as forbidden until rewritten.
- C6: `nivy_drivers` RLS exposes phone+plate to any authenticated user;
  contradicts §3.1 (audit 07 P1-3).
- C7: KYC bucket `kyc-documents` has no admin read policy; admins reviewing
  KYC need either service-role read or an explicit `kyc_admin_read` policy.
- C8: Per-page admin gates use 3 incompatible styles (B4 §4.4); only one
  uses the canonical `checkAdminPermission`.
