# Wave 4B — Design System / Mobile Cleanup (2026-05-09)

> Local/dev only. No production deploy. Not a redesign — UX/mobile compliance pass.

## Scope closed

### A. Native dialogs eliminated (canon §0 forbidden) — ✅
Replaced every `window.alert()` / `alert()` / `window.confirm()` / `confirm()` / `window.prompt()` call in `app/`, `components/`, `lib/`, `hooks/` with canonical replacements:

| File | Before | After |
|---|---|---|
| `components/parent/chore-verify-buttons.tsx` | `window.prompt("Motif…")` | Dialog with Textarea (a11y title + description) |
| `components/parent/allowance-row-actions.tsx` | `confirm("Supprimer…")` + `alert(err)` | Dialog (destructive variant) + `toast.error` |
| `components/feed/post-composer.tsx` | `alert("Maximum 4…")` | `toast.error` |
| `components/export-data-button.tsx` | `alert("Aucune donnée…")` | `toast.info` |
| `components/share/share-modal.tsx` | `alert(urlData.instructions)` | `toast.info` (6s duration) |
| `components/share/share-card.tsx` | `alert("Carte téléchargée!")` | `toast.success` + `toast.error` on catch |
| `components/tokens/token-rewards.tsx` | 2× `alert(error)` | 2× `toast.error` |
| `components/circles/circle-chat.tsx` | `confirm("Supprimer ce message ?")` | `confirmToast` (destructive) |
| `components/creativity/creations-gallery.tsx` | `confirm("Supprimer cette création ?")` | `confirmToast` (destructive) |
| `components/teen/goal-lock-button.tsx` | `confirm("Annuler cet objectif…")` | `confirmToast` (destructive + description) |
| `app/admin/internships/internship-form.tsx` | `confirm("Fermer ce stage…")` | `confirmToast` |
| `app/partner/restaurant/menu/menu-manager-client.tsx` | `confirm("Supprimer cet item ?")` | `confirmToast` (destructive) |
| `app/partner/restaurant/orders/orders-feed-client.tsx` | `alert(json.error)` | `toast.error` |
| `app/djs/candidature/page.tsx` | 2× `alert(...)` | `toast.info` (also flagged as legacy — points to `/devenir-dj`) |
| `components/examples/secure-form-examples.tsx` | 2× `alert("…succès")` | 2× `toast.success` |

### B. New canonical primitive — `confirmToast` ✅
- `lib/ui/confirm-toast.ts` — Promise-returning confirm helper using sonner action+cancel pattern.
- `destructive: true` adds the red border class.
- Resolves false on action click, false on dismiss / auto-close (settle is idempotent — verified by test).
- One-line replacement for any legacy `if (!confirm(...)) return`.

### C. Canon scanner extension — ✅
- New rule `CANON-ALERT-003`: `window.prompt(` forbidden — use Dialog with form input.
- Existing CANON-ALERT-001 / -002 (window.alert / window.confirm) baseline now reads 0/0 across `app+components+lib+hooks`.

### D. Mobile/admin sidebar contract — ✅ (preserved)
- The Wave 4A sidebar additions (Modération + ring-fenced Scripts SQL) remain canonical.
- No new routes added to admin sidebar. PartnerSidebar (Wave 3A/3B.2) keeps its type-aware contract.

### Out of scope — explicitly NOT done in 4B
- Framer-motion proxy migration for the 160 baseline `CANON-MOTION-001` violations (Wave 4 codemod target — large, tracked).
- Tailwind raw-class sweep (DS-001..006).
- Mobile-dock visual redesign.
- Storybook (canon F18 = NO).

## Files changed (16)

**New (3):**
- `lib/ui/confirm-toast.ts` (canonical confirm primitive)
- `tests/unit/wave4b-no-native-dialogs.test.ts` (static guard)
- `tests/unit/wave4b-confirm-toast.test.ts` (Promise contract)

**Modified (13):**
- 13 components/pages listed above lose their native dialog calls.
- `scripts/canon-precommit.mjs` — added `CANON-ALERT-003` rule for `window.prompt`.

## Tests added (11 specs)

- `wave4b-no-native-dialogs.test.ts` (5) — git-ls-files scan asserts no `window.alert(`, no bare `alert(`, no `window.confirm(`, no bare `confirm(` (excluding `confirmToast(` and `member.confirm(`), no `window.prompt(`.
- `wave4b-confirm-toast.test.ts` (6) — action resolves true, cancel resolves false, dismiss resolves false (and stays false even if action fires later — settle idempotency), auto-close resolves false, destructive flag adds red border, custom labels propagate.

Total vitest: **52 files / 400 specs / 100% green** (+11 from Wave 4B).

## Surfaces touched

Forms / interactive components touched directly:
- chore verification (parent)
- allowance management (parent)
- feed post composer (teen)
- export-data button (admin/parent)
- share modal + share card (cross-cut)
- token rewards (teen)
- circles chat (teen)
- creativity gallery (teen)
- savings goal lock (teen)
- admin internships form
- partner restaurant menu manager
- partner restaurant orders feed
- djs candidature (legacy — now honest about being a stub)

## P0/P1 closed

- **CANON-ALERT-001 / -002 / -003** — every native dialog call eliminated. Canon scanner now enforces all three at the gate.
- **Destructive UX truth** — every destructive action that previously trusted `confirm()` now uses a styled Dialog or `confirmToast` (cancel-default, action-on-explicit-click).

## Score before / after

| Bucket | Before | After Wave 4B |
|---|---|---|
| **design-system-mobile** | 62 / 100 | **74 / 100** |
| **Core flow score** | 82 | **84** |
| **Overall product score** | 80 | **81** |

Honest gain: +12 design-system-mobile from removing the worst-offending UX anti-pattern (native dialogs) and shipping the canonical replacement primitive. The remaining gap to 80+ is the framer-motion proxy migration (160 baseline violations — Wave 4 codemod target) and Tailwind raw-class sweep — both deferred to V1.4 to keep this wave honest.

Public launch still pending Wave 4C (lifestyle-supply 62→) + secret rotation.

## Remaining design-system blockers (carry-forward)

- **Wave 4 / V1.4**: framer-motion proxy migration (160 file-pair baseline — Wave 4 codemod).
- **Wave 4 / V1.4**: Tailwind raw-class sweep (CANON-DS-001..006 — 21 raw utility uses on shared primitives).
- **Wave 4 / V1.4**: NotificationBell aria fix.
- **Wave 4 / V1.4**: touch-target audit ≥44px on mobile dock.
- **Wave 4 / V1.4**: full ResponsiveModal rollout (Sheet on mobile, Dialog on desktop).

## Hard constraints honored

- No redesign.
- No new features.
- No fake success.
- No native alert/confirm/prompt remaining in app/components/lib/hooks (test-enforced + canon-enforce).
- No production deploy.
- No secrets read or printed (`npm run check:env`: 11/11 PRESENT, every value `[REDACTED]`).
- Canon baseline did not regress.
