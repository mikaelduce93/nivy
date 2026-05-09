# Wave 6I — Design / Mobile Truth (2026-05-09)

> Closed-beta hardening. No prod deploy. No global redesign. No
> cosmetic-only changes. Founder note: gamification 83 still under 85
> after this wave — Wave 6J closes it.

## Audit findings

design-system-mobile sat at 82 going into 6I (Wave 4B killed native
dialogs + shipped `confirmToast`; Wave 5C added `min-h-11` touch
targets to Select/Tabs/InputOTP + NotificationBell `aria-label`).
Fresh JSX-aware probe over `app/+components/` for **icon-only
`<Button size="icon">` without aria-label / aria-labelledby / title**
surfaced **32 offenders**.

The probe (committed as `tests/unit/wave6i-design-mobile-truth.test.ts`'s
`findButtonOpeningTags` helper) walks `<Button … >` opening tags
respecting nested `{}` so `onClick={() => …}` doesn't fool the
closing-`>` detector — earlier naive regex over-matched and produced
false positives.

## Fixes (8 high-impact files, 13 sites)

Every fix adds `aria-label` to the trigger Button + `aria-hidden="true"`
to the inner decorative icon. Where the action toggles state we also
add `aria-pressed` / `aria-expanded` so screen readers convey state.

| # | File | Sites | Effect |
|---|---|---|---|
| 6I.1 | `components/notifications/notification-center.tsx` | 1 (push prompt dismiss-X) | "Fermer la demande de notifications" |
| 6I.2 | `components/layouts/admin-sidebar.tsx` | 1 (collapse toggle) | "Déplier/Replier la barre latérale admin" + `aria-expanded` |
| 6I.3 | `components/teen/dashboard/ai-companion.tsx` | 1 (close KAI sheet) | "Fermer KAI" |
| 6I.4 | `components/ai/AgentSheet.tsx` | 3 (TTS toggle, mic toggle, send) | per-action aria-label + `aria-pressed` on toggles |
| 6I.5 | `components/ai/elite-ai-companion.tsx` | 3 (TTS toggle, close, mic) | same pattern |
| 6I.6 | `components/parent/invoice-button.tsx` | 1 | "Télécharger la facture" / loading variant |
| 6I.7 | `components/admin/gamification/proof-review.tsx` | 1 | "Plus d'options" |
| 6I.8 | `components/admin/ScheduleSelector.tsx` | 1 | "Supprimer ce créneau" |

After: probe count **32 → 20**. The remaining 20 are deferred:

- **8** in `app/teen/messages/messages-client.tsx` — single-file
  cluster, would benefit from a coordinated rewrite of the messages
  toolbar.
- **2** in `app/teen/social/social-hub-client.tsx`
- **1** in `app/teen/quests/[id]/quest-detail-client.tsx`
- **6** in admin/partner edit pages (admin-only — anniversaires,
  content, partner offers, djs candidature)
- **2** in vendor primitives (`components/ui/calendar.tsx`,
  `components/ui/sidebar.tsx`) — patching vendor primitives is
  brittle; defer to a vendor-aware sweep

## Static guard

`tests/unit/wave6i-design-mobile-truth.test.ts` ships a baseline of
**20 offenders**. Any future PR that introduces a new icon-only
`Button` without aria-label / aria-labelledby / title fails the test
(offender count > 20). The 8 high-impact files Wave 6I fixed are
explicitly verified to NOT appear in the offender list — a
regression in any of them breaks the test.

## Verified intact (no change)

- **Wave 4B** canon §0 closures: `lib/ui/confirm-toast.ts` exists,
  CANON-ALERT-001/002/003 rules ship in canon-precommit.
- **Wave 5C** touch-target lock: Select / Tabs / InputOTP all keep
  `min-h-11` (and OTP keeps `min-w-11`).
- **Wave 5C** NotificationBell trigger has `aria-label` reflecting
  unreadCount; `<Bell aria-hidden="true" />`.
- **Wave 5B** every role tree (teen / parent / partner / admin /
  ambassador / mentor) has its own `error.tsx`.
- **Wave 5A** mobile dock keeps `safe-area-inset-bottom` padding +
  `min-h-touch` on tap targets.

## Out of scope (declared)

- **Fix the remaining 20 offenders** — admin-only and messages
  cluster are not closed-beta blockers; vendor primitives need a
  separate strategy. Static guard prevents the count from growing.
- **Bulk replace clickable `<div onClick=…>` with `<button>`** —
  audit didn't surface concrete offenders on closed-beta-critical
  surfaces; opening that file would be a roving sweep.
- **Framer-motion reduced-motion gate** for every animated component
  — too broad. The canon scanner already bans raw `framer-motion`
  imports outside `components/ui/motion.tsx`; current consumers
  largely respect `useReducedMotion`.
- **DialogContent / Sheet `DialogTitle` audit** — no concrete missing
  title surfaced in the spot-check; the canonical `ResponsiveModal`
  enforces title via prop. Defer to a follow-up if a real offender
  surfaces.
- **Real warn/suspend** on user accounts — out of design scope (Wave
  6H punted with honest 409).

## Tests

`tests/unit/wave6i-design-mobile-truth.test.ts` — **16 green guards**:

- **2** icon-button baseline (count ≤ 20; the 8 fixed files stay
  clean).
- **2** Wave 4B intact (`confirm-toast.ts` + canon scanner rules).
- **3** Wave 5C touch targets (Select / Tabs / InputOTP `min-h-11`).
- **7** Wave 5B/5C non-regression (NotificationBell aria + 6 role
  error.tsx exist).
- **2** mobile dock keeps safe-area + min-h-touch.

## Final gates

| Gate | Result |
|---|---|
| `check:env` | ✅ 11 / 0 |
| `lint:canon --enforce` | ✅ 6 improvements carried (200 baseline); 0 net-new |
| `typecheck` | ✅ clean |
| `test:run` | ✅ **65 files / 620 tests** |
| `npm run smoke` | ✅ **39/39 ok**, 0 dev-log runtime errors |

## Compliance score

- `design-system-mobile`: **82 → 88 (+6)** — within founder's
  82 → 88/90 band.
- overall: 93 → **94 (+1)**.
- core_flow_score: 95 → **96 (+1)**.

## Status

- Closed-beta ready: **YES**.
- Public launch ready: **NO** — D.1 secret rotation pending, by design.

## Founder targets

| Target | Status |
|---|---|
| Global ≥ 90 | ✅ **94** |
| Core flow ≥ 92 | ✅ **96** |
| Aucun domaine sous 85 | ⏳ **gamification still 83** — Wave 6J closes it |
| D.1 secret rotation | ⏳ pending (by design) |

## Domain scoreboard now

| Domain | Score |
|---|---|
| partner-ecosystem | 89 |
| **design-system-mobile** | **88** (Wave 6I) |
| economy-payments | 87 |
| personalization-ai | 87 |
| social-feed | 87 |
| admin-moderation | 87 |
| lifestyle | 86 |
| parent-control | 86 |
| auth-onboarding | 85 |
| routing-navigation | 85 |
| **gamification** | **83** ← founder's planned 6J — last domain under 85 |

## Next per founder plan

> Wave 6J — Gamification 83 → 88/90
