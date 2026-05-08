# W4-A4 — Mobile QA (static audit)

**Wave:** UX-Sprint Wave 4
**Agent:** W4-A4 (mobile QA)
**Mode:** read-only static audit. No code changes.
**Date:** 2026-05-08
**Inputs:** Wave 1 (responsive-modal, use-keyboard-aware), Wave 2 (PullToRefresh A15 / swipe + long-press A16 / safe-area A20), Wave 3 (mobile dock A5).

This document is the pre-launch mobile pattern audit. Each section below is a static check against the source tree at HEAD. Section 8 is the founder's manual QA matrix to run on real devices before going live. Section 9 lists prioritized risks found during the audit.

---

## 1. Touch targets — `components/ui/*.tsx`

**Standard:** WCAG 2.5.5 Level AAA + Apple HIG = 44 × 44 CSS px minimum hit area on interactive primitives. Tailwind `h-11` ≈ 44 px, `h-10` = 40 px (fail), `h-9` = 36 px (fail).

**Method:** `grep "h-9 |h-10 " components/ui/*.tsx` then classified each hit by surface kind.

### Confirmed compliant (Wave 1 fixes verified)

- **`components/ui/input.tsx:11-12`** — base styles `flex h-11 w-full ...` with explicit comment *"h-11 (44px) for mobile touch target compliance (TICKET-004)"*. **PASS.**
- **`components/ui/button.tsx:117-126`** — defaults raised to `h-11`. The two non-default sizes use a paired `min-h-11` to keep the visual height (`h-9`) but expand the hit area to 44 px:
  - `default: 'h-11 px-5 py-2.5 has-[>svg]:px-4'` — visual + hit area both 44 px.
  - `sm: 'h-9 min-h-11 rounded-xl gap-1.5 px-3.5 ...'` — visual 36 px, hit area 44 px.
  - `'icon-sm': 'size-9 min-h-11 min-w-11 rounded-lg'` — visual 36×36, hit area 44×44.
  - **PASS** (intentional "visually small but touch-safe" pattern; load-bearing comment at line 120: *"sm visually 36px, but min-h-11 ensures hit area is still 44px on touch"*).
- **`components/ui/neon-button.tsx:35`** — `sm: "h-9 min-h-11 min-w-11 rounded-lg px-3"`. **PASS** (same dual-height pattern).

### Interactive primitives still at 36 px / 40 px without min-h-11 paired

These are the real findings — interactive primitives that ship below 44 px hit area:

| File:line | Selector | Visual | Hit area | Severity | Notes |
|---|---|---|---|---|---|
| `components/ui/select.tsx:41` | `data-[size=default]:h-9` (and `data-[size=sm]:h-8`) on `SelectTrigger` | 36 px | 36 px | **HIGH** | Select trigger is the dropdown's primary touch target. No min-h-11 pair. Used widely (forms, filters). |
| `components/ui/toggle.tsx:19,21` | `default: 'h-9 px-2 min-w-9'`, `lg: 'h-10 px-2.5 min-w-10'` | 36 / 40 px | same | **HIGH** | Toggle = on/off button. `lg` is still 40 px not 44 px. No min-h-11 pair. |
| `components/ui/navigation-menu.tsx:62` | `inline-flex h-9 w-max ...` on `NavigationMenuTrigger` | 36 px | 36 px | MED | Mostly desktop, but renders on mobile in some surfaces. |
| `components/ui/menubar.tsx:17` | `flex h-9 items-center gap-1 ...` | 36 px | 36 px | MED | Menubar items. Less mobile-critical (admin desktop UI). |
| `components/ui/tabs.tsx:29` | `inline-flex h-9 w-fit items-center justify-center ...` | 36 px | 36 px | **HIGH** | Tab triggers — used on every teen/parent dashboard. Each tab is a primary tap target. |
| `components/ui/tabs-animated.tsx:116` | `md: 'h-10 px-4 text-sm'` (the *medium* tab) | 40 px | 40 px | MED | Animated tabs default to `md` in many surfaces. |
| `components/ui/input-otp.tsx:54` | `relative flex h-9 w-9 ...` on each OTP slot | 36 × 36 px | same | **HIGH** | OTP code entry — directly tapped on mobile during login/2FA. |
| `components/ui/command.tsx:70` | `flex h-9 items-center gap-2 border-b px-3` (search row) | 36 px | 36 px | LOW | Command palette is desktop-first (cmd-k). |
| `components/ui/input-group.tsx:17` | `'h-9 has-[>textarea]:h-auto'` | 36 px | 36 px | MED | Wraps input add-ons. Inner `<input>` uses `h-11`, but the *group* shell forces 36 px in cases without textarea. Visual mismatch with Wave 1 input fix. |
| `components/ui/date-picker.tsx:47` | `flex h-10 w-full ... border-zinc-700 bg-zinc-800` | 40 px | 40 px | **HIGH** | Custom date picker trigger — tapped to open. Below 44 px. |

**Non-issues (false positives in the grep):** `pull-to-refresh.tsx:137` (visual indicator disc, not interactive), all `skeleton-*` files (loading placeholders), `celebrate.tsx:226` (success icon), `bento-grid.tsx:314` (icon container in a card whose root is the actual target), `primitives/icon.tsx:154` (icon wrapper), `table.tsx:73` (row-header cell), `states/error-block.tsx:182,265` and `offline-indicator.tsx:211` (icon discs).

### Confirmed Wave 1 input height = 44 px ✅

`components/ui/input.tsx:11-12`:

```tsx
// Base styles — h-11 (44px) for mobile touch target compliance (TICKET-004)
'flex h-11 w-full min-w-0 rounded-md border bg-transparent px-3 py-1 text-base shadow-xs md:text-sm',
```

This is the load-bearing line. **Confirmed.**

### Recommendation

Apply the `h-9 min-h-11` (or `h-10 min-h-11`) pair to: `select`, `toggle`, `tabs`, `tabs-animated` (`md`), `input-otp`, `input-group`, `date-picker`. Pattern is already proven in `button.tsx` and `neon-button.tsx`. This is non-visual (only hit area changes), so it's launch-safe.

---

## 2. Safe-area handling — Wave 2 / TICKET A20

**Standard:** every fixed bottom-anchored or full-bleed surface must add `env(safe-area-inset-bottom)` so the iOS home indicator (and Android gesture bar) doesn't crop content.

**Method:** `grep "env(safe-area-inset-bottom)|pb-safe"` across the tree (excluding docs/).

### Confirmed Wave 2 fix locations (12 expected per ticket spec)

**Layouts (5 expected) — found 5:**

1. `app/teen/layout.tsx:65` — `pb-[calc(6rem+env(safe-area-inset-bottom))]` ✅
2. `app/parent/layout.tsx:43` — `pb-[calc(8rem+env(safe-area-inset-bottom))]` ✅
3. `app/admin/layout.tsx:31` — `pb-[calc(6rem+env(safe-area-inset-bottom))]` ✅
4. `app/mentor/layout.tsx:48` — `pb-[calc(6rem+env(safe-area-inset-bottom))]` ✅
5. `app/partner/layout.tsx:33` — `pb-[calc(6rem+env(safe-area-inset-bottom))]` ✅

**Mobile docks (2) — found 2:**

6. `components/layouts/mobile-dock.tsx:296,323` (SSR placeholder + live nav) — `pb-[calc(0.75rem+env(safe-area-inset-bottom))]` ✅
7. `components/layouts/parent-mobile-dock.tsx:79,134` — same formula ✅

**Cookie banner (1) — found 1:**

8. `components/cookie-banner.tsx:32` — `pb-[calc(1rem+env(safe-area-inset-bottom))] md:pb-[calc(1.5rem+env(safe-area-inset-bottom))]` ✅

**Floating surfaces (3 expected) — found 3:**

9. `components/ai/AgentFloatingButton.tsx:28` — `bottom-[calc(1.5rem+env(safe-area-inset-bottom))]` (also `right` inset) ✅
10. `components/notifications/notification-center.tsx:432` — `bottom-[calc(1rem+env(safe-area-inset-bottom))]` ✅
11. `components/install-pwa-prompt.tsx:52` — `bottom-[calc(1rem+env(safe-area-inset-bottom))]` ✅

**Toast (1) — found 1:**

12. `components/ui/toast.tsx:19` — `sm:pb-[calc(1rem+env(safe-area-inset-bottom))]` (combined with `pt-[calc(1rem+env(safe-area-inset-top))]` for top toasts on mobile) ✅

**All 12 fixes from W2-A20 confirmed in source.** ✅

### Bonus surfaces also doing it correctly (not part of the W2-A20 list)

- `components/ui/responsive-modal.tsx:137` — `pb-[env(safe-area-inset-bottom)]` on the Vaul sheet content.
- `components/ui/bottom-sheet.tsx:123` — `pb-[env(safe-area-inset-bottom)]`.
- `components/ui/swipeable-card.tsx:485,495` — bottom-anchored swipe sheet uses both `pb-[env(safe-area-inset-bottom)]` on the surface and `pb-safe` on the inner scroll.
- `components/ui/long-press-menu.tsx:148` — `pb-[calc(0.75rem+env(safe-area-inset-bottom))]`.
- `components/pwa/pwa-install-prompt.tsx:169` — `pb-safe` (uses the utility class, see below).
- `lib/hooks/use-keyboard-aware.ts:282` — keyboard-aware container also factors `env(safe-area-inset-bottom)` into its padding when keyboard closed.

### Tailwind utility surface

`app/globals.css:869-927` defines the `.pb-safe`, `.bottom-safe`, `.min-h-screen-safe`, etc. family — all use `env(safe-area-inset-*, 0px)` with the `0px` fallback (correct, prevents broken layouts on browsers that don't support `env()`).

---

## 3. Mobile dock — W3-A5 / TICKET-019 acceptance

**Files:**
- `components/layouts/mobile-dock.tsx` (teen / partner / admin / ambassador shared dock)
- `components/layouts/parent-mobile-dock.tsx` (parent-only, with pendingCount badge)

**Acceptance items (from W3-A5):**

| Item | mobile-dock.tsx | parent-mobile-dock.tsx | Status |
|---|---|---|---|
| `layoutId` shared pill that slides between tabs | line 366 `layoutId="mobile-dock-active-pill"` | line 184 `layoutId="parent-mobile-dock-active-pill"` | ✅ both |
| Active icon "bounce" (scale 1 → 1.15 → 1) | lines 384-396 with `times: [0, 0.55, 1]` | lines 200-213 same shape | ✅ both |
| Reduced-motion fallback (no spring, no bounce, instant snap) | lines 372-376 (`{ duration: 0 }` when `prefersReducedMotion`), 387-389 (`{ scale: 1 }`), 393-395 | lines 190-194, 203-207, 209-213 | ✅ both |
| `whileTap` scale 0.92 over 80ms (only when motion allowed) | line 354-359 | line 173-178 | ✅ both |
| Custom `DOCK_PILL_SPRING` (380/32/0.8 — *"a hair faster under thumb"*) | lines 32-36 | lines 12-16 (re-uses same preset) | ✅ both |
| Active dot indicator under the icon | lines 444-457 | lines 272-284 | ✅ both |
| `aria-current="page"`, `aria-label`, `role="navigation"` | lines 297-298, 324-325, 345-346 | lines 89-90, 135-136, 164-165 | ✅ both |
| `min-h-touch` on each tap target | lines 307, 351 | (parent dock uses inline `padding: '8px 0'` instead of utility class) | ⚠ parent dock uses inline style, not the utility |
| SSR placeholder (avoid hydration jump on dock) | lines 293-319 | lines 76-130 | ✅ both |
| Notification badge | lines 412-423 (animated AnimatePresence) | lines 226-249 (static, via inline styles) | ✅ both — parent uses simpler markup |

**Wave 3 acceptance: PASS.** Minor inconsistency: parent dock uses inline `padding: '8px 0'` for tap targets while teen dock uses the `min-h-touch` utility — both clear 44 px, but the teen dock pattern is more inspectable and should be preferred. Not launch-blocking.

---

## 4. Bottom-sheet primitive — `components/ui/responsive-modal.tsx`

**Acceptance:** Vaul on mobile, Radix Dialog on desktop, breakpoint-driven, SSR-safe.

| Check | Source | Status |
|---|---|---|
| Imports `vaul` | line 48 `import { Drawer as DrawerPrimitive } from 'vaul'` | ✅ |
| Imports Radix Dialog | line 47 | ✅ |
| Breakpoint detection at 768 px (md) | line 55 `MOBILE_BREAKPOINT_PX = 768` | ✅ |
| `useIsMobile` is SSR-safe (initial `false`, updates in `useEffect`) | lines 57-70 | ✅ |
| `matchMedia` listener with cleanup | lines 63-67 | ✅ |
| Variant switch picks `sheet` on mobile, `dialog` on desktop | line 115 | ✅ |
| `forceVariant` escape hatch (storybook/tests) | line 85, 115 | ✅ |
| Sheet uses `vaul` Drawer.Root + Portal + Overlay + Content | lines 120-148 | ✅ |
| Sheet has drag handle, safe-area padding, max-h `92vh` | line 132 (`max-h-[92vh]`), line 137 (`pb-[env(safe-area-inset-bottom)]`), lines 142-145 (handle) | ✅ |
| Drag-to-dismiss + Esc + overlay-tap dismissal documented | lines 33-37 (header comment) | ✅ |
| Focus trap, body scroll lock, aria-labelledby/describedby | comments line 39-43, primitives provide it | ✅ |
| Compound API (`Header`, `Title`, `Description`, `Body`, `Footer`, `Close`) variant-aware | lines 203-309 (each slot reads `useVariant()` and switches Drawer / Dialog primitives) | ✅ |

**PASS.** Wave 1 spec satisfied.

---

## 5. PullToRefresh, swipeable card, long-press hook

### `components/teen/pull-to-refresh.tsx` — TICKET-037 / W2-A15

| Check | Source | Status |
|---|---|---|
| File exists | yes | ✅ |
| Touch-only (mounts handlers only on `(hover: none) and (pointer: coarse)`) | header doc lines 11-15 | ✅ |
| Default `threshold` 72 px | interface line 49 | ✅ |
| Default `maxPull` 120 px | line 51 | ✅ |
| `onRefresh` defaults to `router.refresh()` | header doc line 23-26 + `useRouter` import line 42 | ✅ |
| `prefers-reduced-motion`: indicator snaps without spring, content does not translate | header doc lines 19-23 | ✅ |
| `disabled` prop | line 56 | ✅ |

### `components/ui/swipeable-card.tsx` — TICKET-038 / W2-A16

| Check | Source | Status |
|---|---|---|
| `onSwipeDelete?: (direction) => void` | interface line 60 | ✅ |
| `dismissThreshold` (ratio of width, default 0.3 = 30%) | interface line 64, default line 87 | ✅ |
| `direction` restrict (`"left" | "right" | "both"`) | line 66, default line 88 | ✅ |
| Reveal layers `leftAction` / `rightAction` fade with drag | lines 68-70, 107-117 | ✅ |
| Velocity escape hatch (`Math.abs(velocity.x) > 800` triggers dismiss before threshold) | line 131 | ✅ |
| `prefers-reduced-motion`: spring disabled, snap to rest/exit | header doc lines 46-47 | ✅ |
| Legacy `threshold` (px) preserved for older SwipeTabs callers | line 62, 49-51, 121 | ✅ |
| Bottom-sheet variant (lines 485-495) uses safe-area padding | yes | ✅ |

### `lib/hooks/use-long-press.ts` — TICKET-039 / W2-A16

| Check | Source | Status |
|---|---|---|
| File exists | yes | ✅ |
| Threshold default 500 ms | line 56 `threshold = 500` | ✅ |
| `moveThreshold` default 10 px (cancel on movement) | line 56 `moveThreshold = 10` | ✅ |
| Cancel on pointer up before threshold | lines 121-123 | ✅ |
| Cancel on pointer leave / cancel | lines 125-131 | ✅ |
| Cancel on movement beyond threshold | lines 109-119 (`Math.hypot(dx, dy) > moveThreshold`) | ✅ |
| Haptic on activation (`navigator.vibrate(30)`) | lines 96-102, default `haptic: true` line 56 | ✅ |
| `onContextMenu` `preventDefault()` to suppress native menu | lines 134-146 | ✅ |
| Only primary button (mouse) / first touch | line 86 | ✅ |
| Cleanup on unmount | lines 78-80 | ✅ |
| `cancel()` imperative escape hatch | line 49, returned at line 156 | ✅ |
| `isPressing()` getter for visual feedback | line 47, returned at line 157 | ✅ |

**All three primitives PASS Wave 2 spec.**

---

## 6. Viewport meta — `app/layout.tsx`

**Standard (WCAG 1.4.4):** `user-scalable=no` and `maximum-scale<5` are accessibility violations because they prevent low-vision users from pinch-zooming. iOS Safari 10+ ignores `user-scalable=no` anyway, but Android still honors it.

**Source — `app/layout.tsx:141-150`:**

```ts
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#06b6d4" },
  ],
}
```

| Check | Status |
|---|---|
| `userScalable: false` is **NOT** set | ✅ (omitted = default true) |
| `maximumScale: 5` (allows 5× zoom — meets WCAG) | ✅ |
| `viewportFit: "cover"` (required for `env(safe-area-inset-*)` to work) | ✅ |
| `themeColor` per color-scheme | ✅ |

**PASS.** No a11y violation. Recommendation: keep `userScalable` omitted — explicitly setting `true` is also fine, but `false` would regress WCAG 1.4.4. Add a CI-level lint or codeowners review on `app/layout.tsx` viewport block to prevent future regressions.

---

## 7. Keyboard-aware forms

### `lib/hooks/use-keyboard-aware.ts` — TICKET-040 / Wave 1

**Confirmed.** File exists and exports:

- `useKeyboardAware(options?)` — returns `{ keyboardOpen, keyboardHeight, scrollIntoView }` (lines 53-83).
- `KeyboardAwareScrollContainer` — scrollable wrapper, auto-pads bottom by `keyboardHeight + safe-area-inset-bottom`.
- `FormKeyboardAware` — HOC-style wrapper for forms (lines 312-330+).

Behaviors documented in the file header:
- iOS Safari `visualViewport.offsetTop` is factored into the occluded height.
- Listens to both `resize` and `scroll` on `visualViewport`.
- `prefers-reduced-motion` → instant scroll (`'auto'`) instead of `'smooth'`.
- SSR-safe (`typeof window` guards, `useEffect` only).
- Default keyboard-open detection threshold = 150 px height delta.
- Default scroll padding = 16 px above keyboard.

### `FormKeyboardAware` adoption across the tree

Forms currently using `FormKeyboardAware` (excluding the hook source itself):

| File | Surface |
|---|---|
| `app/teen/rides/request/request-form.tsx:104,201` | Teen — request a ride |
| `app/teen/food/[partner_id]/menu-cart-client.tsx:309,394` | Teen — food order checkout |
| `components/teen/goal-form.tsx:89,179` | Teen — create/edit goal |
| `app/partner/offers/new/page.tsx:243,632` | Partner — create offer |
| `components/parent/chore-form.tsx:212,414` | Parent — create chore |
| `components/parent/allowance-form.tsx:219,376` | Parent — set allowance |
| `components/parent/mentor-session-row.tsx:223,320` | Parent — mentor session form |

**7 forms wired.** Coverage list reads as the highest-value forms (money / commitments / scheduling) — sensible prioritization. The teen `goal-form`, `request-form`, and `menu-cart-client` use `FormKeyboardAware`; ride request and food cart are the two most iOS-keyboard-painful flows, so they're correctly prioritized.

### Forms that may benefit from adoption (not blocking)

These are forms grepped for that *don't* use `FormKeyboardAware`. Lower priority, but founder may want to verify on iPhone SE (smallest screen, keyboard occludes the most):

- Teen profile edit (`components/teen/profile-edit-form.tsx`)
- Teen friend search (`components/teen/friend-search.tsx`)
- Teen evidence upload (`components/teen/evidence-upload.tsx`)
- Mentor / teen mentor-session client forms (under `app/api/teen/mentor-sessions/` callers)
- Auth surfaces (sign-up, password reset) — check during section 8 manual QA.

(Not exhaustive — recommend running `grep -l "useForm\\|<form" app/ components/` and cross-referencing.)

---

## 8. Founder pre-launch manual QA matrix

8 mobile flows × 4 viewports × {portrait, landscape} × {motion-on, reduced-motion} × {dark, light} = 256 combinations. Below is the practical contracted matrix — run all 8 flows on each viewport in **portrait + dark + motion-on** (the default user state), then sample landscape / reduced-motion / light on iPhone 14 only as a smoke pass.

### Viewports to test

| Device | CSS px | Why |
|---|---|---|
| iPhone SE (3rd gen) | **375 × 667** | smallest current iOS — keyboard pain |
| iPhone 14 | **390 × 844** | modal iPhone, has Dynamic Island + home indicator |
| iPad mini (6th gen) | **768 × 1024** | exact md breakpoint (responsive-modal switches here) |
| iPad Pro 11" | **1024 × 1366** | tablet with mouse + soft keyboard |

Use Safari iOS for iPhone, Safari iPadOS for iPad. Also smoke-test Chrome Android (Pixel 7 emulator, 412 × 915).

### 8 mobile flows

For each flow, capture: (a) Lighthouse mobile score (Performance, Accessibility, Best Practices), (b) screenshots of each viewport, (c) any visual cropping or interactive failure.

| # | Flow | Critical surfaces | Things to verify |
|---|---|---|---|
| 1 | **Teen onboarding → first quest** | `/auth/sign-up`, OTP, `/teen` dashboard, first quest tap | OTP slot 36×36 (section 1 risk), keyboard-aware on sign-up, mobile dock shows below the fold, safe-area on dashboard, reduced-motion path on quest tap |
| 2 | **Teen ride request** | `/teen/rides/request/request-form` | FormKeyboardAware confirmed working (last field never hidden), date/time picker (h-10 risk), submit button h-11, success state |
| 3 | **Teen food order** | `/teen/food/[partner_id]/menu-cart-client` | Long-press a menu item (500ms threshold), swipe-to-remove cart item (dismissThreshold 0.3), checkout form keyboard-aware, Vaul bottom sheet for cart |
| 4 | **Teen pull-to-refresh** | `/teen/quests`, `/teen/social`, `/teen/wallet` | Pull >72px shows arrow, releases below = no fire, releases above = spinner + `router.refresh()`, no fire on desktop trackpad scroll |
| 5 | **Parent approval** | `/parent/approvals`, parent mobile dock, swipeable card on each approval | Approval pendingCount badge in dock, swipe accept/decline (per-side actions), responsive-modal confirm on Vaul |
| 6 | **Parent allowance + chore creation** | `allowance-form.tsx`, `chore-form.tsx` | FormKeyboardAware on both, last field above keyboard on iPhone SE, money input keypad numeric, submit success |
| 7 | **Mentor session booking** | `mentor-session-row.tsx`, `/parent/mentor-sessions/...` | FormKeyboardAware, date+time selects (h-9 risk), responsive-modal switches at 768px exactly, focus trap |
| 8 | **PWA install + offline + cookie banner** | install banner, cookie banner, offline indicator, agent floating button | All 4 floating surfaces respect `env(safe-area-inset-bottom)` (no overlap with home indicator on iPhone), banner does not steal focus, offline banner shows when airplane-mode toggled |

### Combinatorial sampling

For each flow above, run:

- **Per viewport (4):** portrait + dark + motion-on (the contracted default).
- **iPhone 14 only:** repeat in landscape / reduced-motion / light.

That gives 8 flows × 4 viewports = 32 baseline runs + 8 × 3 = 24 iPhone-14 sampling runs = **56 total founder runs**, instead of 256. Sufficient pre-launch.

### Reduced-motion checklist (per W3-A5 acceptance)

Before launch, in macOS Safari Develop → User Agent → Simulate prefers-reduced-motion (or iOS Settings → Accessibility → Reduce Motion):

- Mobile dock pill: **jumps** between tabs (no spring) ← W3-A5
- Mobile dock active icon: **stays at scale 1** (no bounce) ← W3-A5
- PullToRefresh indicator: **snaps** without spring; content does **not** translate ← W2-A15
- SwipeableCard: **no spring** on rest/exit; snaps to position ← W2-A16
- ResponsiveModal sheet: drag still works, but no momentum-easing on rest
- FormKeyboardAware scroll: instant (`'auto'`) not smooth ← W1

### Dark / light matrix

The site `defaultTheme="dark"` (`app/layout.tsx:233`) but `enableSystem` lets the OS choose. Verify:

- Light mode: contrast on `bg-zinc-900/95` dock backdrops (currently optimized for dark — may look heavy in light mode)
- Theme color meta tag flips correctly per `prefers-color-scheme` (`app/layout.tsx:147-149`)
- Toast contrast in light mode

---

## 9. Mobile-specific risks (prioritized)

Static-audit-only; prioritized P0 (launch-blocker), P1 (fix in week-1 patch), P2 (nice to have). Confidence is high for static patterns, medium for behavior-on-real-device claims.

### P0 — launch-blocker (3)

1. **`select` trigger 36 px hit area** (`components/ui/select.tsx:41`).
   `data-[size=default]:h-9` with no `min-h-11` paired. Selects appear in many forms (date pickers, category filters, parent allowance frequency, ride pickup time). Below WCAG 2.5.5. **Fix:** add `min-h-11` to the default size variant. Same fix already applied in `button.tsx`.

2. **OTP slot 36×36 px** (`components/ui/input-otp.tsx:54`).
   `flex h-9 w-9` per slot. OTP is on the auth-critical path (sign-up + 2FA). On iPhone SE in landscape this is genuinely hard to tap accurately. **Fix:** `h-11 w-11` (or `min-h-11 min-w-11`). Test: enter a 6-digit code in 5 seconds on iPhone SE without misfires.

3. **Tab triggers 36 px** (`components/ui/tabs.tsx:29`, `tabs-animated.tsx:116` `md` size at 40 px).
   Tabs are everywhere on teen dashboards (profile, social, wallet). Each tap target sub-spec. **Fix:** add `min-h-11` to all tab variants; for `tabs-animated` raise `md` to `h-11`.

### P1 — week-1 patch (3)

4. **`date-picker` h-10 trigger** (`components/ui/date-picker.tsx:47`).
   40 px trigger button on a custom date picker. Used in ride request, allowance, mentor session — all forms already wired with `FormKeyboardAware`. **Fix:** raise to `h-11` (no `min-h` trick needed — the trigger is also the visual element).

5. **Toggle `lg` is 40 px, not 44 px** (`components/ui/toggle.tsx:21`).
   Even the *large* toggle still falls short. **Fix:** `lg: 'h-11 px-2.5 min-w-11'`.

6. **`input-group` shell forces 36 px without textarea** (`components/ui/input-group.tsx:17`).
   The inner `<input>` is now 44 px (Wave 1) but the *group* shell visually clips to 36 px. This is a regression-from-fix: the input got fixed, the shell didn't. **Fix:** match `h-11` on the shell (or remove the height constraint entirely).

### P2 — polish (2)

7. **Parent dock uses inline style instead of `min-h-touch` utility.**
   `parent-mobile-dock.tsx` uses `padding: '8px 0'` inline; `mobile-dock.tsx` uses `min-h-touch`. Hit area is fine in both, but inspectability and Storybook story consistency are not. **Fix:** swap to the utility class.

8. **`FormKeyboardAware` adoption gap.**
   7 of N forms wired. Lower-traffic forms (profile edit, friend search, evidence upload) without keyboard-aware behavior may have the iOS Safari "last field hidden under keyboard" problem on iPhone SE. **Fix:** either (a) add `FormKeyboardAware` to remaining forms, or (b) make it the default on a higher-level `<Form>` primitive so adoption is automatic.

---

## Appendix — files cited

- `components/ui/input.tsx`, `button.tsx`, `neon-button.tsx`, `select.tsx`, `toggle.tsx`, `tabs.tsx`, `tabs-animated.tsx`, `input-otp.tsx`, `input-group.tsx`, `date-picker.tsx`, `command.tsx`, `menubar.tsx`, `navigation-menu.tsx`
- `components/ui/responsive-modal.tsx`, `bottom-sheet.tsx`, `swipeable-card.tsx`, `long-press-menu.tsx`, `toast.tsx`
- `components/teen/pull-to-refresh.tsx`
- `components/layouts/mobile-dock.tsx`, `parent-mobile-dock.tsx`
- `components/cookie-banner.tsx`, `install-pwa-prompt.tsx`, `pwa/pwa-install-prompt.tsx`
- `components/notifications/notification-center.tsx`, `components/ai/AgentFloatingButton.tsx`
- `lib/hooks/use-keyboard-aware.ts`, `lib/hooks/use-long-press.ts`
- `app/layout.tsx`, `app/teen/layout.tsx`, `app/parent/layout.tsx`, `app/admin/layout.tsx`, `app/mentor/layout.tsx`, `app/partner/layout.tsx`
- `app/globals.css` (safe-area utility classes)
- 7 forms using `FormKeyboardAware` listed in §7

End of W4-A4 audit.
