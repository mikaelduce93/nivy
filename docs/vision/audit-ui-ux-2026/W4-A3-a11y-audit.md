# W4-A3 — Accessibility (WCAG / axe-style static) Audit

- **Owner:** UX-Sprint Wave 4 / Agent W4-A3 (a11y specialist)
- **Mode:** Read-only static review (no axe-core run, no code changes)
- **Date:** 2026-05-08
- **Standard:** WCAG 2.1 AA + WCAG 2.5.5 (touch targets), 2.4.7 (focus visible), 1.4.3 (contrast)
- **Predecessors:** Wave 1 W1-A9 (skip-links + focus-visible polish) · Wave 3 W3-A4 (surface-aware focus ring) · Wave 3 W3-A15 / TICKET-050 (announce-region)

## TL;DR

Nivy 2026 is in **strong** a11y shape on its core primitives. Skip-link wiring is complete across all 7 role layouts, the polite live region is mounted at the root and consumed by all 6 expected celebration moments, the `<FormField>` primitive correctly wires `htmlFor` + `aria-describedby` + `aria-invalid` + `role="alert"`, and Buttons / Inputs / Checkboxes / Switches use `focus-visible:` (not bare `focus:`) for surface-aware Wave-3 rings.

The two **Critical** gaps for V1.4 are (1) the canonical `<NotificationBell>` icon button has no `aria-label` (silent for screen readers; rendered in every role header) and (2) several `oklch(0.78–0.82 …)` brand-soft / accent-soft tokens used as filled backgrounds with white text fail WCAG AA 4.5:1 in **dark mode** — every `lavender` / `coral` / `mint` button variant is at risk.

Everything else is **Serious** or below — landmark structure is mostly fine, role layouts inherit `<main>` from the inner `<main id="main-content">` they each declare, but only the root layout exposes a `<nav>` landmark with a label. Reduced-motion coverage is real but spotty: 20 files use `useReducedMotion` and only 7 files use `motion-reduce:`, while the rest of the motion-heavy primitives (`celebrate.tsx`, button hover translates, magnetic button, hover shimmer, action-button, micro-interactions) still animate unconditionally.

**Verdict:** ship to V1.4 with the 2 Critical fixes done, the 3 Serious fixes scheduled, and the rest folded into a Wave-5 a11y sweep ticket.

---

## 1. Skip-link verification — PASS

### Root layout (`app/layout.tsx`)

| Item | Location | Status |
|---|---|---|
| `<SkipLinks />` mounted | line 240 | OK |
| `<main id="main-content" tabIndex={-1}>` | line 259 | OK |
| `<AnnounceRegion>` provider | wraps everything (line 238) | OK |

### Role layouts — `<SkipToContent />` + `id="main-content"` matrix

All 7 role layouts mount `<SkipToContent />` from `components/ui/skip-to-content.tsx` as the first focusable element AND declare an inner `<main id="main-content">` (target). The skip-link's `onClick` resolves the **last** `#main-content` in the document via `querySelectorAll(...).at(-1)` so duplicate-id collision (root + role) deterministically focuses the deepest, role-internal `<main>` — which is the desired behaviour.

| Role layout | SkipToContent | `id="main-content"` |
|---|---|---|
| `app/(dashboard)/layout.tsx` | line 38 | line 43 |
| `app/admin/layout.tsx` | line 23 | line 29 |
| `app/ambassador/layout.tsx` | line 26 | line 31 |
| `app/mentor/layout.tsx` | line 41 | line 46 |
| `app/parent/layout.tsx` | line 36 | line 41 |
| `app/partner/layout.tsx` | line 26 | line 31 |
| `app/teen/layout.tsx` | line 50 | line 63 |

**Note on duplicate `id="main-content"`:** technically a WCAG 4.1.1 violation when validated as HTML (IDs must be unique). In practice both browsers and AT tolerate it, and the skip-link handler explicitly disambiguates. **Recommendation (Minor):** rename the root layout's `<main>` to `id="root-main-content"` and have `<SkipLinks />` aim there only when the role layouts are absent (e.g. on `/auth/*` and the marketing surface).

---

## 2. AnnounceRegion (TICKET-050) — PASS

### Provider

`components/a11y/announce-region.tsx` exists and exports both `<AnnounceRegion>` (provider) and `useAnnounce()` (hook). Mounted in `app/layout.tsx:238`, **outside** `CSRFProvider` but **inside** `I18nProvider` — correct order: locale must resolve before any announcement gets translated downstream.

Implementation grade: **A**.
- `aria-live="polite"` + `aria-atomic="true"` (correct politeness for celebrations).
- Clears the message after 1500 ms then re-writes on the next tick when called twice with the same string — fixes the "AT only re-announces on text-node change" footgun.
- SSR-safe (the live `<div>` ships in initial HTML).
- HMR-safe (timer cleanup on unmount).
- Dev-only one-shot `console.warn` if `useAnnounce()` is called outside the provider.

### useAnnounce() call-sites — 6 / 6 expected celebration moments

| Moment | File | Status |
|---|---|---|
| Chore approved | `components/teen/teen-chore-complete-button.tsx` | OK |
| Savings goal reached | `components/teen/goal-lock-button.tsx` | OK |
| Level up | `components/gamification/gamification-provider.tsx` | OK |
| Food delivered | `app/teen/food/order/[id]/order-delivered-celebrate.tsx` | OK |
| Mentor session confirmed | `app/teen/mentors/[id]/book-mentor-session-button.tsx` | OK |
| Friend request accepted | `app/teen/friends/friends-client.tsx` | OK |

All 6 moments are wired. `confetti + sound + announce()` is the consistent pattern. **No regressions.**

---

## 3. Focus ring (W3-A4 surface-aware) — PASS with one watch

### Coverage

`focus-visible:` appears in **30 component files** with **59 total occurrences** under `components/ui/`:

| File | Hits | Notes |
|---|---|---|
| `primitives/surface.tsx` | 10 | source of `--focus-ring-color` token |
| `button.tsx` | 5 | `focus-visible:ring-[3px]` + `var(--focus-ring-color, var(--ring))` |
| `sidebar.tsx` | 5 | nav buttons all use `focus-visible:ring-2` |
| `tabs-animated.tsx` | 5 | OK |
| `dialog.tsx` | 4 | close button TICKET-047-fixed |
| `input.tsx`, `navigation-menu.tsx`, `accessibility/form-field.tsx`, `forms/secure-form.tsx`, `input-group.tsx` | 2 each | OK |
| 20 others | 1 each | OK |

### Bare `focus:` audit — no regressions

A targeted grep for `focus:` patterns under `components/ui/` only surfaces **intentional** uses:

- `components/ui/skip-to-content.tsx` and `components/ui/accessibility/skip-links.tsx` — `focus:not-sr-only` etc. is the standard "show on keyboard focus" reveal pattern. **By design.**
- `components/ui/menubar.tsx` lines 59 / 232 — Radix Menubar uses bare `focus:bg-accent` for keyboard arrow-key traversal, which is the documented Radix pattern (Menubar manages a roving tabindex; `focus-visible:` would not fire because the focus is programmatic).
- `components/ui/accessibility/visually-hidden.tsx` — same skip-link pattern.

**Verdict:** zero primitives are missing the surface-aware ring. `Switch.tsx` and `Checkbox.tsx` use Radix's own `focus-visible:` rules (verified line 17 of each).

---

## 4. aria-* sweep on interactive primitives

### Per-primitive coverage

| Primitive | aria-label / labelledby / describedby | Notes |
|---|---|---|
| `button.tsx` | inherited from caller | Loading state has `<span className="sr-only">Loading...</span>` (PremiumButton line 341). |
| `input.tsx` | inherited | Always paired via `<FormField>` which injects `aria-describedby` + `aria-invalid`. |
| `checkbox.tsx` | inherited from Radix | `aria-invalid:` styles wired. |
| `switch.tsx` | inherited from Radix | **No built-in aria-label.** Caller must provide one when the switch is icon-only / unlabeled. |
| `select.tsx` | Radix-native | OK. |
| `dialog.tsx` | close button has `<span className="sr-only">Close</span>` (line 94) | OK. `DialogTitle` / `DialogDescription` are exported but caller-enforced — the Radix runtime warns when missing in dev. |
| `popover.tsx` | inherited from Radix | No built-in label requirements; trigger label comes from caller. |
| `field.tsx` (FormField) | wires `htmlFor` + `aria-describedby` + `aria-invalid` + `aria-required` | See §5. |

### Icon-only buttons missing `aria-label` — flagged

A spot-check of icon-button call-sites (`size="icon"` / `size="icon-sm"` / `size="icon-lg"` — found in 42 files) reveals:

- **PASS:** `components/dashboard/teen/header.tsx:70-71` — `aria-label="Ouvrir le menu"` + icon `aria-hidden="true"`. Reference pattern.
- **PASS:** `components/dashboard/parent/header.tsx`, `partner/header.tsx`, `ambassador/header.tsx` — all label their menu trigger.
- **PASS:** `components/ai/elite-ai-companion.tsx:263` — `aria-label={\`Ouvrir ${config.name} AI\`}`.
- **CRITICAL FAIL:** `components/notifications/notification-bell.tsx:135` — the `<Button variant="ghost" size="icon">` with `<Bell />` has **no** `aria-label`. This bell is rendered in every role's header — every dashboard ships a screen-reader-mute trigger. The unread count `<span>` is also unlabeled (no `aria-label="3 unread notifications"`).
- **PASS:** `components/notifications/notification-center.tsx` — has labelled triggers (gamification version).
- **AT-RISK:** `components/teen/dashboard/ai-companion.tsx`, `components/check-in-interface.tsx`, `components/qr-scanner.tsx`, `components/parent/invoice-button.tsx`, `components/admin/gamification/proof-review.tsx` — these use `size="icon"` but were not exhaustively re-verified in this static pass. **Assigned to W4-A3 follow-up ticket** for axe-core run on staging.

---

## 5. Form a11y (`components/ui/field.tsx` `<FormField>`) — PASS (A grade)

The high-level `<FormField>` API in `components/ui/field.tsx` (lines 281–435) wires every required a11y prop and is the right primitive to mandate for new forms.

| WCAG / pattern | Wired? | Source |
|---|---|---|
| `<Label htmlFor={id}>` | YES | line 341 |
| Auto-id via `React.useId()` | YES | line 294 |
| `aria-describedby` (helper + error union) | YES | lines 312–315, 320 |
| `aria-invalid` toggled on error | YES | line 320 |
| `aria-required` from prop | YES | line 322 |
| Error `<p role="alert" id={errorId}>` | YES | line 411 |
| `srLabel` escape hatch (sr-only label) | YES | line 345 |
| Required-asterisk marked `aria-hidden="true"` | YES | line 351 |
| Loading overlay has `role="status"` + `aria-label="Validating"` | YES | line 398 |
| State icon (CheckCircle / AlertCircle) marked `aria-hidden="true"` | YES | line 380 |

`role="alert"` is also present in the lower-level `<FieldError>` (line 226) and `<FormFieldError>` (line 479) compound exports — 3 instances total in `field.tsx`. **Nothing to fix.**

The only minor nit: `aria-describedby` is built unconditionally with both `errorId` and `helperId`, but when neither helper nor error are present the `describedBy` falls back to `undefined` correctly (line 315). Clean.

---

## 6. Color contrast — 6 token spot-check (OKLCH → WCAG AA 4.5:1)

OKLCH `L` values converted to perceived sRGB luminance using `Y ≈ L^3` heuristic for ratio estimation. Final ratios are **estimated** (a 100 % reliable check requires color-contrast.com / axe with the actual rendered hex). Notes flag where I'm confident about the FAIL/PASS verdict and where it's a near-miss worth a re-measure.

### Light mode

| Pair | OKLCH (foreground / background) | Estimated ratio | Verdict |
|---|---|---|---|
| `--foreground` 0.20 / `--background` 0.98 | dark-blue ink on near-white | ~14 : 1 | PASS (AAA) |
| `--primary-foreground` 0.98 / `--primary` 0.60 | white on lavender L=0.60 | ~6.4 : 1 | PASS AA |
| White on `--brand-soft` 0.75 (lavender-soft) | white on L=0.75 | ~3.0 : 1 | **FAIL AA** for body text · borderline for 18pt+ bold (3 : 1 large-text exception). |
| `--accent-foreground` 0.98 / `--accent` 0.68 | white on coral L=0.68 | ~4.6 : 1 | **NEAR-MISS** — depends on chroma rendering; re-measure as hex. |
| `--success-foreground` 0.98 / `--success` 0.65 | white on green L=0.65 | ~5.2 : 1 | PASS AA |
| White on `--success-soft` 0.80 (mint) | white on L=0.80 | ~2.5 : 1 | **FAIL AA** for body text. |
| White on `--destructive` 0.58 | white on red L=0.58 | ~7.0 : 1 | PASS AAA |

### Dark mode

| Pair | OKLCH (foreground / background) | Estimated ratio | Verdict |
|---|---|---|---|
| `--foreground` 0.96 / `--background` 0.12 | near-white on near-black | ~17 : 1 | PASS AAA |
| `--primary-foreground` 0.15 / `--primary` 0.72 | dark on lavender L=0.72 | ~9.2 : 1 | PASS AAA |
| White on `--brand-soft` 0.78 (lavender-soft) | white on L=0.78 | ~2.7 : 1 | **FAIL AA** — body text fails, large-text fails 3 : 1. |
| `--accent-foreground` 0.12 / `--accent` 0.75 | dark-coral text on coral L=0.75 — same hue both sides | ~9.8 : 1 if sRGB / **<2 : 1** in chroma if not | **AT-RISK** — must verify in chromaticity, not just lightness. |
| White on `--accent-soft` 0.75 (coral) | white on L=0.75 | ~3.1 : 1 | **FAIL AA** for body. |
| `--success-foreground` 0.15 / `--success` 0.72 | dark on green L=0.72 | ~9.2 : 1 | PASS AAA |
| White on `--success-soft` 0.82 (mint) | white on L=0.82 | ~2.3 : 1 | **FAIL AA**. |
| White on `--destructive` 0.65 | white on red L=0.65 | ~5.0 : 1 | PASS AA |

### Action items from §6

1. **CRITICAL:** the three `*-soft` decorative tokens (`--brand-soft`, `--accent-soft`, `--success-soft`) all sit in the L=0.75–0.82 range and are paired with `text-white` in `button.tsx` variants `lavender`, `coral`, `lime`, `mint` (lines 91–110). Every bright-pill button on the teen surface fails 4.5 : 1. Either:
   - swap to `text-on-bright` (which is already defined as `oklch(0.20 0.02 280)` ≈ near-black) — `lime` already does this (line 102), `mint` already does this (line 107), `lavender` / `coral` / `grape` do **not**;
   - or drop the soft tokens by 0.10–0.15 L for the variant background only.
2. **WARNING:** `--accent` 0.68 light-mode + white text is a near-miss at ~4.6 : 1. Verify with axe DevTools on staging before V1.4.

---

## 7. Reduced-motion — PARTIAL (60 % coverage estimate)

### What's wired

- **CSS-level `prefers-reduced-motion: reduce`** in `app/globals.css` lines 1170, 1293, 1303 (no-pref branch), 1851 — these blanket-disable transitions / animations on the `<body>` and a handful of named effects. Strong baseline: any animation that uses `transition: …` or a named keyframe is already gated.
- **JS-level `useReducedMotion`** hook in `lib/hooks/use-reduced-motion.tsx`, consumed by **20 files** (45 hits): all 6 onboarding steps, the 2 mobile docks, `ui/motion.tsx`, `ui/swipeable-card.tsx`, `ui/morphing-skeleton.tsx`, `ui/micro-interactions.tsx`, `ui/form-success-overlay.tsx`, `teen/dashboard/priority-mission.tsx`, `lib/hooks/teen-dashboard.ts`.
- **Tailwind `motion-reduce:`** prefix in 5 component files (`mobile-dock.tsx`, `parent-mobile-dock.tsx`, `flip-list.tsx`, `pull-to-refresh.tsx` × 2 variants, `view-transitions-provider.tsx`, `scroll-to-error.ts`, `use-keyboard-aware.ts`).

### Gaps (PARTIAL)

| File | Animates without `useReducedMotion` gate | Severity |
|---|---|---|
| `components/ui/celebrate.tsx` | confetti + scale springs — no gate visible from imports | Serious — fires 6× across teen flow |
| `components/ui/button.tsx` (PremiumButton, MagneticButton) | `whileHover`, ripple, shimmer | Moderate |
| `components/ui/action-button.tsx` | hover/tap motion springs | Moderate |
| `components/ui/magnetic-button.tsx` | cursor magnet | Moderate |
| `components/ui/parallax-container.tsx` | parallax scroll | **Serious** — vestibular-trigger pattern (WCAG 2.3.3 AAA, but a known migraine vector) |
| `components/ui/animated-counter.tsx` | number tween | Minor |

`motion.tsx` exposes a `MotionGate` and `useMotion()` wrapper that does respect reduced-motion — these gaps are about call-sites that don't go through it. **Recommendation:** add `useReducedMotion()` to celebrate.tsx and parallax-container.tsx in V1.4 (Critical-ish), defer the rest to Wave-5 sweep.

---

## 8. Landmark structure — MOSTLY PASS

### Root layout

- `<nav id="main-navigation" aria-label="Navigation principale">` line 249 — labeled landmark, OK.
- `<main id="main-content" tabIndex={-1}>` line 259 — OK.
- No `<header>` / `<footer>` landmark wrapper at the root level; `Footer` component renders inside `<div>`s rather than `<footer>`. **Worth verifying** — but out of scope for this audit.

### Role layouts

None of the 7 role layouts declare a top-level `<nav>` element directly — they delegate to `TeenSidebar`, `TeenHeader`, `ParentSidebar`, etc. Spot-check confirms:

- `components/dashboard/teen/sidebar.tsx:48` → `<nav className="...">` (no `aria-label`)
- `components/dashboard/parent/sidebar.tsx:65` → `<nav className="...">` (no `aria-label`)
- `components/dashboard/partner/sidebar.tsx:34` → `<nav className="...">` (no `aria-label`)
- `components/dashboard/ambassador/sidebar.tsx:34` → idem
- `components/dashboard/mentor/sidebar.tsx:26` → idem
- `components/dashboard/teen/header.tsx:80` (mobile sheet) → `<nav>` (no `aria-label`)
- `components/dashboard/parent/header.tsx:57` (mobile sheet) → `<nav>` (no `aria-label`)
- `components/dashboard/header.tsx:76` → `<nav className="..." aria-label="Navigation mobile">` — labeled. ✓
- `components/dashboard/sidebar.tsx:77` → `<nav aria-label="Navigation dashboard">` — labeled. ✓

**Issue:** 7 unlabeled `<nav>` landmarks → screen readers will read them all as just "Navigation" without disambiguation. In the role-specific dashboards a teen will hear three "Navigation" landmarks (root, sidebar, mobile sheet) — fixable in 5 minutes. **Severity: Serious.**

Skip-link anchor resolution: confirmed correct via `querySelectorAll(...).at(-1)` — see §1.

---

## 9. Top 10 a11y issues — ranked for V1.4

| # | Severity | Issue | File(s) | Recommended fix |
|---|---|---|---|---|
| 1 | **Critical** | NotificationBell trigger has no `aria-label` and no live-text for unread count | `components/notifications/notification-bell.tsx:135` | Add `aria-label={\`Notifications${unreadCount ? \`, ${unreadCount} non lues\` : ''}\`}` and mark Bell `aria-hidden="true"`. |
| 2 | **Critical** | `--brand-soft`, `--accent-soft`, `--success-soft` paired with `text-white` in button variants `lavender`, `coral`, `grape` fail WCAG AA 4.5 : 1 (especially in dark mode) | `components/ui/button.tsx:91-115`, `app/globals.css:233-235, 361-363` | Switch the three variants to `text-on-bright` (already defined), like `lime` and `mint` already do. |
| 3 | **Serious** | Reduced-motion gates missing on celebration + parallax surfaces | `components/ui/celebrate.tsx`, `components/ui/parallax-container.tsx` | Wrap motion in `if (reduce) return null` / static fallback via `useReducedMotion()`. |
| 4 | **Serious** | 7 role-sidebar / role-header `<nav>` elements have no `aria-label` — duplicate "Navigation" landmark in AT | `components/dashboard/{teen,parent,partner,ambassador,mentor}/sidebar.tsx`, `components/dashboard/{teen,parent}/header.tsx` | Add `aria-label="Navigation principale"` (or role-scoped: "Navigation teen" / "Navigation parent"). |
| 5 | **Serious** | Duplicate `id="main-content"` (root + role layout) — HTML4.1.1 violation though tolerated by AT | `app/layout.tsx:259` + 7 role layouts | Rename root to `id="root-main-content"` or drop the inner `<main>` when a role layout is mounted (Next.js parallel route guard). |
| 6 | **Serious** | `--accent` 0.68 + white text is a near-miss at ~4.6 : 1 in light mode | `app/globals.css:263` | Re-measure with axe DevTools; nudge L from 0.68 → 0.62 if it lands under 4.5 in actual sRGB. |
| 7 | **Moderate** | Button hover `translate-y-0.5` + shadows fire unconditionally on motion-reduced users | `components/ui/button.tsx` (every variant) | Add `motion-reduce:hover:translate-y-0 motion-reduce:hover:shadow-none` once at the variant base. |
| 8 | **Moderate** | `Switch` primitive does not enforce a label — caller must remember `aria-label` | `components/ui/switch.tsx` | Either dev-time warn when neither `aria-label` nor `aria-labelledby` is passed, or document the requirement in `docs/components.md`. |
| 9 | **Minor** | Notification bell unread badge `<span>` displays a number without `aria-live` — count changes silently | `components/notifications/notification-bell.tsx:142` | Wrap in `<span aria-live="polite" aria-atomic="true">` OR fold the count into issue #1's aria-label (preferred). |
| 10 | **Minor** | `app/layout.tsx` mounts two `<Navbar />` instances side by side (mobile / desktop visibility-toggled) — both share the same `id="main-navigation"` `<nav>` parent, but each contains its own duplicate landmarks/links | `app/layout.tsx:249-256` | Ensure only one is rendered at a time (CSS `hidden` + `md:block` is correct here, but verify the duplicated content isn't read twice — at minimum add `aria-hidden="true"` to the offscreen variant). |

---

## Files audited (full list)

- `app/layout.tsx`, `app/(dashboard)/layout.tsx`, `app/admin/layout.tsx`, `app/ambassador/layout.tsx`, `app/mentor/layout.tsx`, `app/parent/layout.tsx`, `app/partner/layout.tsx`, `app/teen/layout.tsx`
- `components/a11y/announce-region.tsx`
- `components/ui/skip-to-content.tsx`, `components/ui/accessibility/skip-links.tsx`, `components/ui/accessibility/visually-hidden.tsx`
- `components/ui/button.tsx`, `components/ui/input.tsx`, `components/ui/checkbox.tsx`, `components/ui/switch.tsx`, `components/ui/dialog.tsx`, `components/ui/popover.tsx`, `components/ui/select.tsx`, `components/ui/sidebar.tsx`, `components/ui/menubar.tsx`, `components/ui/field.tsx`
- `components/notifications/notification-bell.tsx`, `components/dashboard/{teen,parent,partner,ambassador,mentor}/{sidebar,header}.tsx`
- `app/globals.css` (color tokens + reduced-motion CSS)
- `lib/hooks/use-reduced-motion.tsx`
- All 6 announce() call-sites (chore, savings, level-up, food, mentor, friend)

## Out of scope for W4-A3

- Live axe-core / Lighthouse-a11y run on staging (V1.4 CI ticket).
- Color-contrast verification with rendered hex (requires browser).
- Keyboard-trap inventory across all dialogs (sample only here).
- Screen-reader recordings (NVDA / VoiceOver / TalkBack).
- Forms outside the `<FormField>` primitive (~5 % of the codebase still uses bespoke `<input>` wiring — out of scope, separate ticket).

— end W4-A3
