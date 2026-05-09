# Wave 5C — Design / mobile a11y polish (2026-05-09)

> Closed beta. No new feature. No design system rewrite.
> Goal: close the canon §5 a11y / touch-target gaps that surface in
> every role header and every form across the app.

## Scope closed

### A. NotificationBell a11y (canon §5 P0) — ✅
The notification bell trigger ships in every role header. It was missing
its `aria-label` and the `<Bell>` icon was not `aria-hidden`, so a
screen reader would announce nothing useful (or worse, "button image").

Fix in `components/notifications/notification-bell.tsx`:
- Trigger Button now carries
  `aria-label={"Notifications, ${count} non lue${s}"}` (or just
  `"Notifications"` when count = 0).
- `<Bell aria-hidden="true" />` so the screen reader doesn't double-read.
- The unread count badge `<span>` now also `aria-hidden="true"` because
  the count is already in the trigger's accessible name. Avoids the
  double announcement.

Out-of-scope leftover: the same file uses 21 raw palette utilities
(`zinc-*`, `emerald-*`, `red-*`, ...). That's a tokenisation pass, not
an a11y fix; punt to a future design-token wave.

### B. Touch-target lock (canon §5 — 44px) — ✅
Three core form primitives shipped at 36px (`h-9`) — below the canon
44px lock — affecting every food order, ride request, mentor booking,
partner offer creation, parent allowance form. Added `min-h-11`
(11 × 4px = 44px) so the visual height stays compact while the touch
hit area meets the lock:

| primitive | before | after |
|---|---|---|
| `components/ui/select.tsx` Trigger | `data-[size=default]:h-9 data-[size=sm]:h-8` | + `min-h-11` |
| `components/ui/tabs.tsx` Trigger | (no min-h) | + `min-h-11` |
| `components/ui/input-otp.tsx` Slot | `h-9 w-9` | + `min-h-11 min-w-11` |

Closes CANON-DS-002, CANON-DS-003, CANON-DS-004.

### C. Static guard — ✅
- `tests/unit/wave5c-design-a11y.test.ts` — **6 green tests**:
  - NotificationBell trigger has `aria-label`.
  - `<Bell>` is `aria-hidden`.
  - Unread badge `<span>` is `aria-hidden`.
  - Select trigger contains `min-h-11`.
  - Tabs trigger contains `min-h-11`.
  - InputOTP slot contains both `min-h-11` and `min-w-11`.

### D. Compliance JSON + this doc — ✅
- `compliance-findings.json` — v2.4-wave5b → v2.5-wave5c.
  design-system-mobile **74 → 82** (+8). overall **85 → 86**.
  core **87 → 88**.

## Out of scope (intentional)

- NotificationBell colour-token migration (21 raw palette refs) —
  larger refactor; doesn't block closed beta.
- `parallax-container.tsx` reduced-motion gate (CANON-DS-005) — single
  decorative component; defer.
- `lavender|coral|grape` button variant contrast pass (CANON-DS-009) —
  visual polish, not a a11y blocker.
- `loading.tsx` files missing `aria-busy` / `role="status"` wrappers —
  Wave 4B scoped these for the bespoke skeletons; the rest are leaf
  layouts where the missing attribute is cosmetic.
- Any production deploy / secret rotation.

## Final gates

| Gate | Result |
|---|---|
| `check:env` | ✅ 11 present / 0 missing |
| `lint:canon` (`--enforce`) | ✅ 1 improvement carried; 206 baseline; 0 net-new |
| `typecheck` | ✅ clean |
| `test:run` (full suite) | ✅ **56 files / 471 tests passed** |

## Wave 5 closure

| Sub-wave | Status | Score impact |
|---|---|---|
| 5A — Routing & Navigation Truth | CLOSED | routing 70→85 |
| 5B — Closed-beta QA hardening | CLOSED | cross-cutting +1 |
| 5C — Design / mobile a11y polish | CLOSED | design 74→82 |
| **Wave 5 total** | **CLOSED** | overall **83 → 86** • core **85 → 88** |

## Next

D.1 secret rotation (founder) → closed-beta smoke test
(`npm run dev` then `npm run smoke` in another shell) → public launch.
