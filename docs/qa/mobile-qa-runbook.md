# Mobile QA Runbook — Nivy (V5 #224)

> Source milestone: **Nivy V5 — Responsivité, stabilité & QA mobile** (#215).
> Companion automated suite: `tests/e2e/mobile/*.spec.ts` (mobile-viewport Playwright).
> Guards that lock this in CI: `scripts/responsive-lint.mjs` (#222), `scripts/suspense-lint.mjs` (#216).

Nivy's core users are **teenagers on phones**. Every release must be verified usable on a small phone with a notch and a gesture bar, with no login crash and no horizontal scrolling. This runbook is the repeatable procedure.

---

## 1. Reference device matrix

Test at these viewport widths (portrait). 375px is the **primary** reference; 360 and 430 are the boundaries.

| Device profile            | Width × Height | DPR | Notes / hazards                                              |
|---------------------------|---------------|-----|-------------------------------------------------------------|
| Android petit (baseline)  | **360 × 800** | 3   | Narrowest common Android (Galaxy A-series). Tightest grids. |
| iPhone SE (2e/3e gén.)    | **375 × 667** | 2   | **Primary reference.** Short viewport — sticky bars matter. |
| iPhone 14 / 13           | **390 × 844** | 3   | Notch + home-indicator gesture bar (safe-area insets).      |
| Android grand            | **412 × 915** | ~2.6| Pixel-class. Gesture bar.                                   |
| iPhone 15/16 Pro Max     | **430 × 932** | 3   | Largest phone; Dynamic Island (top safe-area).              |

Browsers to cover: **iOS Safari** and **Android Chrome** (the two PWA runtimes).

---

## 2. Mobile invariants (the checklist applied to every screen)

1. **No horizontal overflow.** `document.documentElement.scrollWidth` must equal the viewport width. Nothing scrolls sideways.
2. **No login crash.** `login → role dashboard` completes without an "Application error" / blank page and without a console error. (Root causes fixed in V5: `useSearchParams()` without `<Suspense>` → guarded by `scripts/suspense-lint.mjs`; stale service-worker chunks in dev; navbar auth not subscribing to `onAuthStateChange`.)
3. **Nothing hidden under the dock.** The mobile bottom dock is ~6rem tall (`md:hidden`). Fixed/sticky bottom surfaces must clear it using the single-source utilities `pb-dock` / `bottom-dock` (see §5), or safe-area padding. Guarded by `RESP-003`.
4. **Safe-area respected.** Fixed top/bottom/side surfaces use `env(safe-area-inset-*)` so the notch / Dynamic Island / gesture bar never crop content.
5. **Touch targets ≥ 44 × 44px.** Icon buttons, steppers, tabs, dock items. (#223)
6. **No fixed pixel widths that overflow.** No `w-[≥360px]` / `min-w-[≥360px]` without a `max-w` or responsive variant. Guarded by `RESP-001`.
7. **Grids have a mobile base.** No `grid-cols-{3+}` without `grid-cols-1`/`grid-cols-2`. Guarded by `RESP-002`.
8. **Wide tables scroll, not the page.** Back-office tables are wrapped in `overflow-x-auto`.
9. **`focus-visible` ring** present on interactive elements (keyboard a11y).
10. **No hydration warnings.** Dates render with `timeZone: "Africa/Casablanca"`; no clock-at-render values in the first paint (#218).

---

## 3. Automated pass (run first)

```bash
# Static guards — fail CI on net-new responsive / Suspense regressions
npm run lint:responsive      # RESP-001/002/003 vs docs/compliance/responsive-baseline.json
npm run lint:suspense        # SUSPENSE-001 vs docs/compliance/suspense-baseline.json
npm run lint                 # eslint (a11y + canon)

# Mobile-viewport E2E (boots `next start`; needs a built app + env)
npm run build && npm run start &     # or rely on Playwright webServer
npx playwright test tests/e2e/mobile # the V5 mobile specs
```

The mobile specs assert invariants #1 (no horizontal overflow) and #2 (no console error) and that key controls are tappable, on the critical flows below. Each spec sets a mobile viewport via `test.use({ viewport, isMobile, hasTouch })` so it runs inside the existing `chromium` project without disturbing the desktop suite.

---

## 4. Manual pass (real devices / emulation)

**Chrome DevTools (fast):** open DevTools → Device Toolbar (`Ctrl+Shift+M`) → pick each matrix width → walk the critical flows → watch the Console for errors and the page for sideways scroll.

**Real device (authoritative):** run `npm run dev` and open `http://<your-LAN-ip>:3000` on a physical iPhone (Safari) and Android (Chrome). Test on **≥2 physical devices/emulators** and log results in §6. Real devices are the only way to validate iOS safe-area insets and momentum scrolling.

### Critical flows (must be green)
1. **`login → dashboard`** (the originally-reported crash) — for each role that lands somewhere: teen, parent, partner, ambassador, mentor, admin.
2. **Food checkout** — `/teen/food/[partner]` → add items → the sticky "Commander" bar sits **above** the dock → checkout.
3. **Wallet** — `/teen/wallet` (+ `?tab=shop`) — amounts don't overflow, tabs reachable.
4. **Parent onboarding → teen validation** — `/onboarding/parent/e-signature` → add a teen → the teen activation link (`/auth/validate-teen`).
5. **Mentor nav on mobile** (#221) — mentor area nav is reachable (hamburger/drawer or dock), no empty drawers in any role.

---

## 5. Reusable primitives (use these, don't re-invent)

- **Dock clearance (single source, #222):** `pb-dock` (padding-bottom) and `bottom-dock` (bottom) — `app/globals.css`, value `calc(6rem + env(safe-area-inset-bottom))`. Consumed by the teen layout, cookie-banner, and the food sticky bar.
- **Safe-area utilities:** `.pt-safe` `.pb-safe` `.px-safe` `.py-safe` `.min-h-screen-safe` … — `app/globals.css`.
- **Wizard step indicator (#222):** `<WizardSteps steps currentStep accent />` — `components/partners/WizardSteps.tsx` (Retail/Venue/Club/Education forms).
- **Responsive modal / bottom sheet:** `components/ui/responsive-modal.tsx`, `components/ui/bottom-sheet.tsx` (already safe-area aware).

---

## 6. Results log template

Copy per release; record PASS/FAIL + note per flow per device.

```
Release / branch: ___________________   Date: __________   Tester: __________

| Flow                         | 360 | 375 (SE) | 390 | 412 | 430 | iOS Safari | Android Chrome | Notes |
|------------------------------|-----|----------|-----|-----|-----|------------|----------------|-------|
| login → dashboard            |     |          |     |     |     |            |                |       |
| food checkout                |     |          |     |     |     |            |                |       |
| wallet                       |     |          |     |     |     |            |                |       |
| parent onboarding → teen     |     |          |     |     |     |            |                |       |
| mentor nav (mobile)          |     |          |     |     |     |            |                |       |

Automated: lint:responsive ___  lint:suspense ___  playwright tests/e2e/mobile ___
Physical devices used (≥2): _______________________ , _______________________
```
