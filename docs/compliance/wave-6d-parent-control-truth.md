# Wave 6D — Parent-control Truth (2026-05-09)

> Closed-beta hardening. Family / consent surface — highest trust
> sensitivity. No new feature, no broad refactor, no F1/F2 zone change.

## Audit findings (read-only first)

The parent compliance doc had moved to 78 after Wave 1C + C.6. Fresh
audit of the 25 parent pages + 31 `/api/parent/*` routes surfaced 4
concrete truth-violations:

### 6D.1 — `/parent/teens/[id]` page didn't exist
- The `/parent/teens` list cards link to `/parent/teens/${teen_id}`
  via the "Détails" CTA. The page was never built — clicking surfaced
  a silent 404. That's exactly the "fake CTA" pattern the founder
  named.
- Fix: ship a minimal honest detail page. Reads `parent_teens_overview`
  scoped to `(parent_id, teen_id)` (defence-in-depth on top of RLS),
  renders only the fields canonical for that view (name, level, title,
  XP, coins, badges_count) plus 4 CTAs to existing per-teen action
  surfaces (`/parent/topup?teen=…`, `/parent/budget?teen=…`,
  `/parent/allowances?teen=…`, `/parent/chores?teen=…`). Returns
  `notFound()` for a missing or unlinked teen — same 404 shape so
  we don't leak existence of other parents' teens.
- **No fake** charts, no fake recent-activity, no fake "favourite
  events" — those would be either placeholder lies or out-of-scope
  features.

### 6D.2 — `/parent/notifications` advertised mark-read it didn't do
- Page rendered "Marquage automatique au clic" hint above the list,
  but no `onClick` handler existed and no mark-read endpoint was
  wired. Click → nothing.
- Fix: split per-row UI into `components/parent/notification-row.tsx`
  (client). Row is now keyboard + mouse activatable, calls the new
  canonical `/api/parent/notifications/mark-read` endpoint, optimistic
  update with revert-on-error. Plus a real "Tout marquer lu" button
  in the header that calls `/api/parent/notifications/mark-all-read`.

### 6D.3 — Two new canonical parent notification endpoints
- `app/api/parent/notifications/mark-read/route.ts` — gated to
  `userInfo.role === "parent"`, scopes via
  `.eq("user_id", userInfo.profileId)`, writes `user_notifications`
  (canonical, not the deprecated `notifications` table).
- `app/api/parent/notifications/mark-all-read/route.ts` — same
  contract, returns `{ marked: count }` so the UI toast can show how
  many were updated.

### 6D.4 — Dead `/api/notifications/{mark-read,mark-all-read}` 410'd
- These endpoints wrote to the deprecated `notifications` table
  (CANON-NOTIF-001 baseline) and redirected to `/notifications`,
  which is itself a Wave 5A redirect stub. **Zero callers in
  app/+components/.**
- Fix: 410 with deprecation message pointing at the per-role
  canonical (`/api/parent/notifications/mark-{read,all-read}`).
  Eliminates 2 baseline canon violations (CANON-NOTIF-001).

### 6D.5 — `/api/parent/mentor-sessions` had no role gate
- Relied on RLS only. Other `/api/parent/*` routes consistently start
  with `userInfo.role === "parent"` 401.
- Fix: added defence-in-depth role gate. RLS still enforces row
  visibility, but a non-parent role (teen/partner/admin) now gets a
  clean 401 instead of an empty result that could be misread as
  "no sessions".

## Out of scope (declared)

- The (already 78-scored) parent dashboard, approvals dispatcher
  (Wave 1C), parent-side topup (Wave 1B), savings match, chores
  create — all checked, no truth-violations found, left untouched.
- Parent-side e-signature CIN privacy (CANON-PARENT-004) — Wave 1B
  shipped the `parent-cin` private bucket; the legacy `documents`
  upload path was scrubbed. Verified.
- Building a per-teen activity feed inside the new
  `/parent/teens/[id]` page — would be a new feature.
- Pause/resume on allowances — UI already correct (Wave 4B touched
  it); not a 6D scope.

## Tests

`tests/unit/wave6d-parent-control-truth.test.ts` — **12 green guards**:

- **4** `/parent/teens/[id]` page exists, scopes via parent_id+teen_id,
  notFound() on miss, no fake field synthesis.
- **5** `/parent/notifications` no longer advertises fake auto-mark;
  rows call the canonical endpoint; both new endpoints gate to parent
  + scope by user_id + write `user_notifications`.
- **2** dead `/api/notifications/{mark-read,mark-all-read}` are 410
  stubs and no longer write the deprecated `notifications` table.
- **2** `/api/parent/mentor-sessions` checks parent role; sweep test
  verifies every `/api/parent/*` route has at least one auth gate
  (offenders list returned empty).

## Final gates

| Gate | Result |
|---|---|
| `check:env` | ✅ 11 / 0 |
| `lint:canon --enforce` | ✅ **6 improvements** carried (baseline 206 → **200**); 0 net-new |
| `typecheck` | ✅ clean |
| `test:run` | ✅ **60 files / 526 tests** |
| `npm run smoke` | ✅ **39/39 ok**, 0 dev-log runtime errors |

Canon improvements in this wave:
- `CANON-NOTIF-001` cleared on `app/api/notifications/mark-read/route.ts`
- `CANON-NOTIF-001` cleared on `app/api/notifications/mark-all-read/route.ts`
- (4 other improvements carried from Waves 5A/6C closures)

## Compliance score

- `parent-control`: **78 → 86 (+8)** — top of the founder's 78→85+ band.
- overall: 88 → **89 (+1)**.
- core_flow_score: 90 → **91 (+1)**.

## Status

- Closed-beta ready: **YES**.
- Public launch ready: **NO** — D.1 secret rotation pending, by design.

## Domain scoreboard now

| Domain | Score |
|---|---|
| partner-ecosystem | 89 |
| personalization-ai | 87 |
| **parent-control** | **86** (Wave 6D) |
| auth-onboarding | 85 |
| routing-navigation | 85 |
| gamification | 83 |
| design-system-mobile | 82 |
| economy-payments | 80 |
| social-feed | 80 |
| admin-moderation | 80 |
| lifestyle | 78 ← next-lowest, founder's planned 6E |

## Next per founder plan

> Wave 6E — Lifestyle 78 → 85+
