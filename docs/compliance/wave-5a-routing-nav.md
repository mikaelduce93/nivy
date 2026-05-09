# Wave 5A — Routing & Navigation Truth (2026-05-09)

> Closed beta. No production deploy. No new feature. No big refactor.
> Goal: kill the dead navigation surfaces and the dead-link fan-out so
> the user can't land on a 404 by clicking a primary nav target.

## Scope closed

### A. Dead `(dashboard)` route group + nav components — ✅
The `app/(dashboard)` route group held a `layout.tsx` + `error.tsx` and
zero pages. The layout pulled in three components — `AppSidebar`,
`DashboardSidebar`, `DashboardHeader` — which collectively pointed at
**7 forbidden URLs** (canon §5 rules 1, 3, 4): `/dashboard`,
`/mes-reservations`, `/profile/enfants`, `/autorisations`,
`/notifications`, `/profile`, `/profile/modifier`, `/mon-compte`.

Removed:
- `app/(dashboard)/layout.tsx`
- `app/(dashboard)/error.tsx`
- `components/layouts/app-sidebar.tsx`
- `components/dashboard/sidebar.tsx`
- `components/dashboard/header.tsx`
- `AppSidebar` re-export from `components/layouts/index.ts`

Closes BLOCKER findings CANON-ROUTE-002, -003, -007 from
`docs/compliance/05-routing-navigation-compliance.md`.

### B. Mobile dock dead links — ✅
6 dock targets pointed at routes that don't exist on disk. Repointed to
the canonical alternative (per `docs/canon/routing.locked.md` §4):

| was | →  | canonical |
|---|---|---|
| `/admin/events` | → | `/admin/evenements` (FR canonical) |
| `/admin/users` | → | `/admin/moderation` (Wave 4A unified inbox) |
| `/admin/settings` | → | `/admin/logs` (operator surface) |
| `/partner/profile` | → | `/partner/settings` (canon §4 row 32) |
| `/ambassador/shop` | → | `/ambassador/boutique` (FR canonical) |
| `/ambassador/profile` | → | `/ambassador/commissions` |
| `/gamification` (public dock) | → | `/teen` (avoid 308 hop) |
| `/espace` (public dock) | → | `/auth/redirect` (avoid 308 hop) |

### C. Legacy bare paths → permanentRedirect stubs — ✅
Four pages still rendered full UIs at canon-forbidden bare paths. They
also wrote to deprecated tables (`notifications`, `child_authorizations`).
Converted to small `permanentRedirect` stubs:

| path | →  | target | reason |
|---|---|---|---|
| `app/autorisations/page.tsx` | → | `/parent/approvals` | canon §2 |
| `app/autorisations/ajouter/page.tsx` | → | `/parent/approvals` | canon §2 |
| `app/notifications/page.tsx` | → | `/auth/redirect` | canon §5 rule 3 |
| `app/notifications/preferences/page.tsx` | → | `/auth/redirect` | canon §5 rule 3 |

Side effect: removed the only remaining `from('notifications')` write
path in app code (CANON-NOTIF-001 went 1 → 0 in baseline).

### D. In-page `<Link href>` cleanup — ✅
5 surviving pages still linked at forbidden URLs. Repointed:

| file | was | → |
|---|---|---|
| `app/teen/settings/settings-client.tsx` | `/notifications/preferences` | `/teen/profile` |
| `app/devenir-ambassadeur/page.tsx` | `/dashboard/ambassadeur` | `/ambassador` |
| `app/carte-vip/confirmation/page.tsx` | `/profile` | `/auth/redirect` |
| `app/reservation/page.tsx` | `/profile/enfants/ajouter` | `/parent/teens/add` |
| `app/parent/events/page.tsx` | `/events` | `/agenda` |

### E. Canon scanner rules — ✅
6 new rules in `scripts/canon-precommit.mjs` so the CI gate catches any
regression:

- `CANON-LINK-001` — bans `<Link href="/dashboard…">`
- `CANON-LINK-002` — bans `<Link href="/notifications…">` (with
  `app/notifications/` allow-list for the redirect stubs themselves)
- `CANON-LINK-003` — bans `<Link href="/profile…">`
- `CANON-LINK-004` — bans `<Link href="/mes-reservations…">` and
  `<Link href="/mon-compte…">`
- `CANON-LINK-005` — bans `<Link href="/autorisations…">` (with
  `app/autorisations/` allow-list)
- `CANON-LINK-006` — bans `<Link href="/events…">` (canonical: `/agenda…`)

### F. Static guard test — ✅
`tests/unit/wave5a-routing-nav.test.ts` — **40 tests, all green**:
- 5 dead-surface deletion checks
- 18 mobile-dock target existence checks (only fired for the targets
  actually present in the dock — keeps the test resilient to future
  dock renames)
- 1 dead-route negative check (the 8 retired hrefs are gone)
- 4 redirect-stub assertions (file size + `permanentRedirect` + target)
- 6 forbidden-`<Link>` scans across `app/` + `components/` (with
  comment-strip to avoid false positives in docstrings)

### G. Compliance JSON + this doc — ✅
- `docs/compliance/compliance-findings.json` — v2.2-wave4c → v2.3-wave5a;
  routing-navigation **70 → 85**, overall **83 → 84**, core **85 → 86**.
- This file.

## Out of scope (intentional)

- Driver workspace (`/driver/**`) — blocked by founder decision F2.
- Self-signup teen flow — blocked by F1.
- `/admin/settings`, `/partner/profile`, `/ambassador/profile` page
  creation — those routes don't have canonical specs and creating them
  would be a feature, not a fix. Mobile dock now points at existing
  canonical surfaces instead.
- Sidebar consolidation discussion (CANON-ROUTE-007 founder choice).
  The retired sidebars were unused; the role-specific sidebars under
  `components/dashboard/<role>/sidebar.tsx` remain authoritative.
- Any production deploy / secret rotation.

## Final gates

| Gate | Result |
|---|---|
| `check:env` | ✅ 11 present / 0 missing |
| `lint:canon` (`--enforce`) | ✅ 1 improvement (CANON-NOTIF-001 1→0); 206 baseline; 0 regressions; 0 net-new |
| `typecheck` | ✅ clean |
| `test:run` (full suite) | ✅ **54 files / 452 tests passed** |

## Next

Wave 5B — Closed-beta QA hardening (error/loading boundaries, honest
empty states, smoke-test script).
