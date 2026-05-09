# Wave 6B — Auth-onboarding truth (2026-05-09)

> Closed-beta hardening. No secret rotation, no production deploy, no
> broad redesign. No new role. No self-signup teen (F1 unratified). No
> driver-zone change beyond what already shipped.

## Audit findings (read-only first)

The middleware `is_onboarded` gate (Wave 1A.5) and `/auth/redirect`
truth-table router were already in place. Audit surfaced **6 concrete
truth-violations** where the gate would loop a legitimate user forever.

### 6.1 Ambassador `/auth/redirect` join column typo
- `app/auth/redirect/page.tsx` queried `ambassadors.user_id` (a column
  that doesn't exist). Every authenticated ambassador got `null` back
  → routed to `/ambassador/onboarding/awaiting-approval` even when
  status was `active`.
- Canonical column is `profile_id` everywhere else in the codebase
  (8 callers under `app/ambassador/**`, `app/api/ambassador/**`,
  `lib/auth/get-user-role.ts`).
- Per Wave 1A invariant `profile_id == auth.users.id`, so the lookup
  value is unchanged — only the column name was wrong.

### 6.2–6.5 Admin approval flows did NOT flip `profiles.is_onboarded`
The middleware reads `profiles.is_onboarded`. When admin approved a
partner / ambassador / mentor / driver, only the per-role status was
updated — **`profiles.is_onboarded` stayed `false`**. The middleware
then bounced the freshly-approved user straight back to the
`/onboarding/...` wizard root forever.

- `app/api/admin/partners/[id]/activate/route.ts` — main path **and**
  `reconcile()` idempotency path. Both paths now set
  `profiles.role='partner', is_onboarded=true` on the auth user id.
- `app/api/admin/ambassadors/approve/route.ts` — looks up
  `ambassadors.profile_id` then flips `is_onboarded=true` on that
  profile.
- `app/api/admin/drivers/[id]/approve/route.ts` — gated on
  `decision === "approve"` (no flip on rejection); looks up
  `nivy_drivers.user_id` from the update result.
- `app/api/admin/mentors/[id]/approve/route.ts` — the SQL RPC
  `admin_approve_mentor` only flips `mentors.kyc_status`. Route now
  fetches `mentors.user_id` after the RPC and flips
  `profiles.is_onboarded=true` server-side.

### 6.6 Parent had no self-served `/api/parent/onboarding/complete`
- `/api/teen/onboarding/complete` exists; the parent symmetric was
  missing. Without it the only mechanism to mark a parent onboarded
  was a manual admin DB poke.
- New `app/api/parent/onboarding/complete/route.ts` — POST gated to
  `userInfo.role === "parent"`, sets `profiles.is_onboarded=true`,
  idempotent.

### 6.7 `/onboarding/complete` page skipped is_onboarded for parent
- The page short-circuited with `if (role === "parent") redirect("/parent")`
  **before** flipping `is_onboarded`. So a parent landing here would
  get bounced back into the gate.
- Fixed: the `profiles.is_onboarded=true` update now happens **before**
  the role-redirect for parent + partner. Teen path unchanged.

## Truth-table the middleware now enforces (post-Wave 6B)

| role | per-role attribute state | `profiles.is_onboarded` | `/auth/redirect` target | middleware on `/{role}/...` |
|---|---|---|---|---|
| teen | n/a | `false` | `/onboarding/teen` | redirect → `/onboarding/interests` |
| teen | n/a | `true` | `/teen` | passes |
| parent | n/a | `false` | `/onboarding/parent` | redirect → `/onboarding/parent` |
| parent | n/a | `true` | `/parent` | passes |
| partner | `partners.status='pending'` | `false` (admin not yet approved) | `/partner/onboarding/awaiting-approval` | redirect → same |
| partner | `partners.status='active'` | `true` (set by 6.2 fix) | `/partner` | passes |
| ambassador | `ambassadors.status='pending'` | `false` | `/ambassador/onboarding/awaiting-approval` | redirect → same |
| ambassador | `ambassadors.status='active'` | `true` (set by 6.3 fix) | `/ambassador` | passes |
| mentor | `mentors.kyc_status='pending'` | `false` | `/mentor/onboarding/kyc` | redirect → same |
| mentor | `mentors.kyc_status='approved'` | `true` (set by 6.5 fix) | `/mentor/dashboard` | passes |
| driver | `nivy_drivers.kyc_status='pending'` | `false` | `/driver/onboarding/kyc` | redirect → same |
| driver | `nivy_drivers.kyc_status='approved'` | `true` (set by 6.4 fix) | `/driver/dashboard` | passes |
| admin | n/a | (gate bypassed per canon §4) | `/admin` | passes |
| (no profile) | n/a | n/a | `/onboarding` (showcase) | middleware → `/auth/error?reason=missing_profile` |
| unknown role | n/a | n/a | `/auth/error?reason=unknown_role` | redirected to `/auth/error` |

## Out of scope (declared)

- **F1** (teen self-signup) — unratified; route stays parent-invited
  only. No code changes near `/auth/sign-up?role=teen`.
- **F2** (driver as first-class role) — already enumerated in the
  middleware/router; no schema change.
- **`admin_approve_mentor` RPC body** — phantom (mentioned in canon
  comment header, no SQL definition committed). Wave 6B fixes the
  symptom (route flips `profiles.is_onboarded` post-RPC) without
  creating a new migration.
- **Self-signup partner / ambassador / mentor / driver `complete`
  endpoints** — these roles are admin-approved, not self-served. Adding
  a POST endpoint that flips `is_onboarded=true` for these roles would
  bypass admin review (= fake onboarding success). Out of scope per
  founder rule.

## Tests

`tests/unit/wave6b-auth-onboarding-truth.test.ts` — **25 green tests**:

- 10 `/auth/redirect` truth-table assertions (one per role state combo
  documented in the table above, plus the no-profile + unknown-role
  fallbacks).
- 7 middleware `ONBOARDING_TARGETS` mapping checks (per-role wizard
  root + admin bypass + missing-profile error path).
- 4 admin-approval-flips-is_onboarded checks (partner — both paths —,
  ambassador with profile_id lookup, driver gated on approve, mentor
  with user_id lookup).
- 3 self-served complete endpoint checks (teen + parent contracts +
  /onboarding/complete page ordering bug guard).

## Final gates

| Gate | Result |
|---|---|
| `check:env` | ✅ 11 present / 0 missing |
| `lint:canon --enforce` | ✅ 1 improvement carried; 206 baseline; 0 net-new |
| `typecheck` | ✅ clean |
| `test:run` | ✅ **58 files / 503 tests passed** |
| `npm run smoke` | ✅ **39/39 ok** |
| **Dev-log runtime errors** | ✅ **0** |

## Compliance score

- `auth-onboarding`: **75 → 85 (+10)**.
- overall: 86 → **87 (+1)**.
- core_flow_score: 88 → **89 (+1)**.

## Status

- Closed-beta ready: **YES**.
- Public launch ready: **NO** — D.1 secret rotation still pending, by
  design.

## Next

Wave 6C — founder choice. Candidates per `compliance-findings.json`:
- gamification 78 → 82
- parent-control 78 → 82
- admin-moderation 80 → 85
- economy-payments 80 → 85
