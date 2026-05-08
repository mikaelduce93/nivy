# V3 — Mobile 375px QA (TICKET-049)

**Sub-agent**: V3 (Wave 4 validators)
**Mode**: READ-ONLY static audit (no Playwright run, no dev-server start)
**Scope**: 12 top teen-facing routes from FRONTEND_REDO §2–§4
**Acceptance ref**: TICKET-049 — "12 critical pages render with no horizontal scroll and CTAs visible at 375x812".

The audit was performed by reading each `page.tsx` + the load-bearing client component, the `MobileDock`, the `TeenLayout`, and `app/globals.css` (Tailwind v4 inline `@theme`). All width/touch/font findings are derived from the literal Tailwind classes / inline styles present in source.

> **Tailwind v4 note**: this repo uses `@import "tailwindcss"` + `@theme inline` (no `tailwind.config.ts`). Default breakpoints apply: `sm 640px`, `md 768px`, `lg 1024px`. So at **375px viewport**, ONLY the unprefixed (mobile) classes are active.

---

## Foundation review

### `app/globals.css`
- Defines `min-h-touch` (44px), `min-w-touch` (44px), `tap-target`, `touch-target`, `touch-target-sm` (36px) utilities.
- Provides full `*-safe` family (`pb-safe`, `bottom-safe`, `min-h-screen-safe`, etc.) — all use `env(safe-area-inset-*)` correctly.
- Reduced-motion media query is wired site-wide.
- No global `overflow-x: hidden` on `html/body`; depends on each page-shell.

### `components/layouts/mobile-dock.tsx`
- Fixed `bottom-0`, `z-50`, `md:hidden` — correctly hidden ≥768px.
- Uses `pb-[calc(0.75rem+env(safe-area-inset-bottom))]` — proper iOS notch handling.
- Touch targets: each link has `min-h-touch` (44px). PASS.
- 5 items × ~75px each at 375px (after the rounded `p-2` container) = ~63px per cell, comfortably wider than 44. PASS.
- Label uses `text-[10px]` — small but acceptable since it's a navigation glyph label, not primary content.

### `app/teen/layout.tsx`
- Wraps content in `<main className="relative flex-1 p-4 md:p-6 md:ml-64">`.
- **PROBLEM (systemic)**: `main` has **no `pb-24` / `pb-32`** to clear the fixed mobile dock (≈80px tall incl. safe-area). Each individual page is left to remember `pb-32` on its own. Many do. A few don't (see /teen/food, /teen/rides).

---

## Per-route verdicts

### 1. `/` — Marketing home (`app/page.tsx`)
**Verdict: PARTIAL**
- Hero `<h1>` uses `text-4xl sm:text-5xl md:text-7xl lg:text-8xl` + `tracking-tighter break-words` and the literal text `TEEN&nbsp;LIFE` is forced non-breaking. At 375px, `text-4xl` (36px, `font-black`, tracking-tighter) of `TEEN LIFE` measures ≈210px — fits, but with no horizontal padding margin to spare given the parent `px-6` (24px each side leaves 327px usable).
- CTAs wrapped in `flex flex-wrap` so they stack — PASS.
- Trust badges in `flex items-center justify-center lg:justify-start gap-4` — at 375px the **3 badges with icons + text rarely fit on one line** and lack `flex-wrap`. Likely cause overflow / awkward 2-up wrap.
- "PRÊT À LEVEL UP" hero `text-4xl sm:text-5xl md:text-7xl` — `LEVEL&nbsp;UP` non-breaking; `font-black` at 36px ≈ ~150px wide → OK.
- Events section uses `Image fill`, container `h-56` — responsive PASS.
- Section padding `pb-20 px-6` on the hero is fine; `py-28` on CTA is heavy but does not cause horizontal scroll.

**Top 3 issues**:
1. Trust badges row missing `flex-wrap`; will overflow at 375px.
2. Hero `pt-32` on mobile is excessive — pushes CTA below the fold even on iPhone 13 (~812px).
3. `px-6` is denser than the `px-3 sm:px-4` used elsewhere — inconsistent gutter system.

---

### 2. `/teen` — Teen dashboard (`app/teen/page.tsx` + `teen-dashboard-content.tsx`)
**Verdict: PASS**
- Outer container: `px-3 sm:px-4 md:px-8` → 12px gutter at 375px. Good for dense bento.
- Mobile-aware: a `useDashboardContext()` hook produces `mobile` flag and disables tilt/parallax + heavy GlowBlobs on mobile. Shows engineering effort.
- BentoGrid uses `col-span-full md:col-span-N` so every card fills full width <768px. No horizontal scroll risk.
- `pb-24 md:pb-10` on the parallax container — clears the mobile dock.
- `overflow-x-hidden` set on the root wrapper (`<div className="relative min-h-screen ... overflow-x-hidden">`).
- `min-h-[200px] sm:min-h-[250px]` on the map card prevents collapse.
- Live Feed uses `text-[9px] sm:text-[10px]` for the "Live" label — borderline for legibility but it's metadata, not content.

**Top 3 issues**:
1. Hero `<Hero variant="…" />` (not inspected here) — needs separate verification at 375px since it sits inside a `RevealElement` with `delay/distance` animations.
2. `text-base sm:text-lg md:text-xl` on the section title is fine, but inner emoji square `w-8 h-8 sm:w-10` may be visually cramped next to the LIVE FEED title.
3. Heavy reliance on Suspense fallbacks; if any child throws on mobile data shapes (e.g. `OnlineFriends`), the dashboard degrades to skeletons but doesn't break layout.

---

### 3. `/teen/quiz` — Quiz hub (`app/teen/quiz/page.tsx` + `quiz-hub-client.tsx`)
**Verdict: PARTIAL**
- Client uses `min-h-screen pb-32 space-y-8 pt-6` — clears dock. PASS.
- Skeleton uses `grid grid-cols-4 gap-4` for stat cards **with no responsive prefix**. At 375px - 24px gutters that's ~83px per cell, too narrow for a number + label. Should be `grid-cols-2 sm:grid-cols-4`.
- `<h1 className="text-4xl font-black tracking-tighter">` next to a 12×12 icon + flex column is a 3-element header row that may overflow when paired with the right-side history Link. Header uses `flex items-center justify-between`.
- Subject card grid uses `grid-cols-2 md:grid-cols-3` in the skeleton — so 2-col on mobile (correct), but the live data section's container needs verification (truncated read).

**Top 3 issues**:
1. Skeleton `grid-cols-4` overflows at 375px.
2. Header right CTA "history" risks text-wrap at narrow widths (no shrink class).
3. `text-4xl font-black tracking-tighter uppercase italic` is a heavy combo — reads as poster art rather than h1; legible but stylistically aggressive.

---

### 4. `/teen/quests` — Quests hub (`app/teen/quests/page.tsx` + `quests-hub-client.tsx`)
**Verdict: PARTIAL**
- Page wrapper `min-h-screen pb-32` — clears dock.
- Skeleton grid `grid-cols-1 md:grid-cols-2 lg:grid-cols-3` — single column on mobile. PASS.
- Imports `HubTabs` with 5 tabs (Daily, Brain, Body, Creative, Défis amis). At 375px five chips with text labels likely require horizontal scroll; need to confirm `HubTabs` uses `overflow-x-auto`.
- `TwinCurrencyGauge variant="full"` is rendered with XP+coins side-by-side — at 375px each gauge gets ~165px, can compress numbers.

**Top 3 issues**:
1. 5-tab `HubTabs` likely overflows; needs horizontal scroll or icon-only mode at <400px.
2. Twin currency gauge cramped on narrow widths; "spendable / locked" sub-labels can wrap.
3. Pillar headings (e.g. "Brain Challenges") gradients on `text-4xl tracking-tighter` may be illegible against busy mobile backgrounds.

---

### 5. `/teen/wallet` — Wallet hub (`app/teen/wallet/page.tsx` + `wallet-hub-client.tsx`)
**Verdict: PARTIAL**
- Outer wrapper `min-h-screen pb-32` — clears dock.
- Header: 4xl `<h1>` "Wallet" + 12×12 icon + right-side action — likely fits at 375px.
- Skeleton grid `grid-cols-2 md:grid-cols-4` — 2-up on mobile, OK.
- 4-tab `HubTabs` (Coins, Shop, Badges, VIP) — manageable at 375px (4 short labels).
- Shop reward grid not inspected here — high risk of dense card grid at narrow widths.

**Top 3 issues**:
1. Coin balances using `tabular-nums` are good for alignment but with `text-4xl`/`5xl` styling can overflow at 375px when balance ≥ 7 digits.
2. Shop tab cards likely use `grid-cols-2` but reward names are long FR strings — line-clamp truncation needs verification.
3. Currency micro-copy ("1 DH = 100 coins") stacks with `text-xs` — too small on a financial surface.

---

### 6. `/teen/defis-physiques` — Physical challenges (`defis-physiques-client.tsx`)
**Verdict: PARTIAL**
- Imports `DefiCard` (component reuse — good consistency).
- Tab category chips with icons (`Tous, Force, Cardio, Core`) — 4 chips, probably fit at 375px with `flex gap-2`.
- Tag labels render via `tagToLabel` helper; FR strings up to 12 chars — fine in a chip.
- Did not inspect the full client (>80 lines). Uses motion + Progress; no obvious 375px hostility.

**Top 3 issues**:
1. `DefiCard` rendering is reused across multiple pages — any layout bug there hits 5+ surfaces.
2. Category chip strip lacks `flex-wrap` evidence; needs verification for icon+label combos.
3. Stats header (4 KPIs: total/started/completed/xp) likely 4-up; should be 2x2 grid on mobile.

---

### 7. `/teen/mentors` — Mentor discovery (`app/teen/mentors/page.tsx`)
**Verdict: FAIL**
- Outer `container mx-auto px-6 py-32 max-w-5xl` — `py-32` (128px top+bottom) is **enormous** on a 812px tall device, wastes ≈30% of the viewport.
- **Filter form** uses `flex flex-wrap gap-3 items-end` with 3 inline `<select>` + 1 inline number `<input>` + a "Filtrer" button absolutely positioned with `ml-auto`. At 375px:
  - Each select w-fit ~120px → 3 selects + 24px age input = ~404px wide. Wraps to a 2nd row.
  - The `ml-auto` "Filtrer" button gets stranded on its own row, far from the controls.
- **Selects** have no explicit `min-h-touch` / `h-11` — Tailwind default is form-element height ≈40px (under 44px). FAIL on touch target compliance.
- Mentor card grid `grid gap-4 sm:grid-cols-2 lg:grid-cols-3` — 1-up on mobile. PASS.
- Card content uses `text-sm` body, `text-[10px] / text-[11px]` for metadata — borderline.
- "Aucun mentor" empty state uses `p-12` — eats space but acceptable.
- **Critical**: page does NOT wrap in `pb-32` for the dock. It uses `py-32` which is symmetrical, but if dock is rendered (the layout shows it across all teen routes), then last mentor card may be partially hidden.

**Top 3 issues**:
1. Native `<select>` with no touch target minimum (under WCAG AAA 44px).
2. `py-32` symmetrical padding wastes the viewport, no responsive `sm:py-12 md:py-32` ramp.
3. Filter form layout breaks at 375px (4 controls + button ml-auto).

---

### 8. `/teen/food` — Food discovery (`app/teen/food/page.tsx`)
**Verdict: FAIL**
- This page is markedly **less polished** than other teen routes — looks like a Wave 3.2 stub.
- Uses `mx-auto max-w-5xl px-4 py-8` — only 16px gutters, no `pb-32` clearance for the mobile dock. **The bottom row of restaurants will sit behind the dock on mobile.**
- Filter form uses inline `<select>` + `<input type="checkbox">` + `<button>` with **default browser styling** (`rounded border px-3 py-2 text-sm`) — clashes with the rest of the app's dark-mode glass UI.
- No min-touch on selects/inputs — touch targets ~36px tall.
- Card uses `text-xs uppercase tracking-wide text-gray-500` — `text-gray-500` is plain Tailwind grey (not the design-system `text-muted-foreground`). Visual inconsistency.
- `<h1 className="text-2xl font-bold">` — only 2xl while the rest of the teen surfaces use 4xl `font-black tracking-tighter italic`. **Brand inconsistency.**
- Bare `<button className="rounded-md bg-blue-600 px-3 py-2 text-sm text-white">` — does NOT match the Gen-Z design language (`gen-z-coral`, `gen-z-lavender`, etc.).

**Top 3 issues**:
1. Missing `pb-32` → restaurants behind dock.
2. Default browser controls + raw blue button — not Gen-Z'd.
3. `text-gray-*` (vs. `text-muted-foreground`) bypasses dark theme tokens.

---

### 9. `/teen/rides` — Rides hub (`app/teen/rides/page.tsx`)
**Verdict: FAIL**
- Same Wave 3.x stub-quality problem as `/teen/food`.
- `container mx-auto p-4 md:p-8 space-y-6` — uses Tailwind container, defaults to `100%` but with no max-width set (theme default). No `pb-32` for the mobile dock.
- Header `flex items-center justify-between` — with `<h1>` + paragraph + button on the right; on 375px the button "Nouveau trajet" + arrow icon will likely **wrap or compete** with the description paragraph (no `flex-shrink-0` on the button).
- Uses `<Card>` from shadcn — generic styling, not Gen-Z brand. Cards stack vertically; no overflow issues per se.
- Each `RideRow` is `flex items-start justify-between` with addresses on the left and badge+amount on the right — at 375px long Casa-suburb addresses (e.g. "Boulevard Hassan II, Maarif, Casablanca") likely overflow without truncation.
- `Badge variant="outline"` font is `text-xs` — sub-readable.
- No `Image` use, but no hero either — entirely text-driven, performs OK.

**Top 3 issues**:
1. Long pickup/dropoff addresses with no `truncate` / `line-clamp-1` on the row.
2. "Nouveau trajet" button has no `flex-shrink-0`; risk of wrap.
3. Missing `pb-32` for dock + inconsistent heading scale (2xl vs. 4xl elsewhere).

---

### 10. `/teen/friends` — Friends hub (`friends-client.tsx`)
**Verdict: PARTIAL**
- `min-h-screen pb-32 space-y-8 pt-6` — clears dock. PASS.
- Header: 12×12 gradient icon + 4xl title + paragraph + primary "Ajouter" Button on the right.
- "Ajouter" Button uses `bg-gen-z-coral text-black font-bold` — at 375px the title block + button can fit (button ≈ 100px) but tight.
- Search Input is `h-12 rounded-xl` — 48px height, **passes 44px touch target**. PASS.
- Tab buttons: `px-4 py-2 rounded-xl` — `py-2` ≈ 8px + line-height ≈ 20px = ~36px height. **FAIL touch-target** for tab buttons. The badge counter uses `text-[10px]`.
- Each friend row: `flex items-center gap-4 p-4 rounded-2xl` with avatar+name+XP — comfortably fits at 375px.
- Pending request rows have **2 icon buttons** (accept/decline) at the right with `size="icon"` — Button default is `h-9 w-9` (36px) unless icon size override. **FAIL** on touch target.

**Top 3 issues**:
1. Tab buttons under 44px tall.
2. Icon buttons (accept/decline request) under 44px.
3. Header right CTA fights with the title block on narrow widths (no `flex-shrink-0` evidence).

---

### 11. `/teen/messages` — Messages inbox (`messages-client.tsx`)
**Verdict: PARTIAL**
- `min-h-screen pb-32` — clears dock.
- Mobile uses a clean **list-or-detail switch**: `md:hidden` for one-or-the-other, `hidden md:grid md:grid-cols-[380px,1fr]` for desktop side-by-side. **Excellent mobile pattern** — best in this audit.
- Conversation list: title 4xl + 12×12 icon + Plus icon button on the right (`Button size="icon" rounded-full bg-gen-z-sky`) — likely under 44px (icon size button is 36px by default in shadcn).
- Search Input `h-12` — PASS touch.
- ChatView (inferred from imports): `Send`, `Phone`, `Video`, `Paperclip`, `Smile`, `Image`, `MoreVertical` — **lots of icon buttons** in a likely cramped header. At 375px a chat header with avatar + name + 3-4 action icons may overflow.
- Message input area not inspected in this read; standard `<Input>` should be fine.

**Top 3 issues**:
1. Icon buttons (`size="icon"`) all 36px — under 44.
2. ChatView header has 4+ action icons; needs `flex-shrink-0` and possibly an overflow menu at 375px.
3. The `pt-6` for the conversation list on mobile creates an awkward gap below the global TeenHeader.

---

### 12. `/teen/offres` — Partner offers discovery (`app/teen/offres/page.tsx`)
**Verdict: PASS**
- `mx-auto w-full max-w-3xl px-4 pb-24 pt-6 sm:px-6` — `pb-24` clears the dock (technically 96px which is ≥ dock's ~80px), and `px-4` at mobile is consistent with other dashboard surfaces. PASS.
- Header: 9×9 emerald icon + uppercase eyebrow text + h1 (`text-2xl font-black sm:text-3xl`) — proper mobile-first ramp. PASS.
- Empty state is purposeful, with two CTA buttons (`/onboarding/interests` + `/teen/map`) inside `flex items-center justify-center gap-2` — at 375px, two `px-4 py-2 rounded-full` pills fit comfortably.
- Server-action `<form>` posts to `trackAndGo` — POST signal then redirect, which is great UX (no JS hydration race).
- DefiCard variant chosen by `variantFor(offer)` — reuses the unified card component.

**Top 3 issues**:
1. Two CTA pills in the empty state are `py-2` — under 44px touch height.
2. The eyebrow "Wave 3 · Personalized" leaks an internal phase name to teens — bad copy hygiene.
3. Server-action button labels ("Y aller" / "Scanner sur place") are reasonable but the button styling (inside DefiCard) was not inspected at 375px.

---

## Summary table

| # | Route                     | Verdict | pb-clears-dock | Touch ≥44 | Mobile-first |
|---|---------------------------|---------|----------------|-----------|--------------|
| 1 | `/`                       | PARTIAL | n/a (no dock)  | mostly    | yes          |
| 2 | `/teen`                   | PASS    | yes            | yes       | excellent    |
| 3 | `/teen/quiz`              | PARTIAL | yes            | mostly    | yes          |
| 4 | `/teen/quests`            | PARTIAL | yes            | unsure    | yes          |
| 5 | `/teen/wallet`            | PARTIAL | yes            | mostly    | yes          |
| 6 | `/teen/defis-physiques`   | PARTIAL | unsure         | unsure    | yes          |
| 7 | `/teen/mentors`           | FAIL    | partial (py-32)| no        | partial      |
| 8 | `/teen/food`              | FAIL    | NO             | no        | NO           |
| 9 | `/teen/rides`             | FAIL    | NO             | no        | NO           |
|10 | `/teen/friends`           | PARTIAL | yes            | mixed     | yes          |
|11 | `/teen/messages`          | PARTIAL | yes            | mixed     | excellent    |
|12 | `/teen/offres`            | PASS    | yes (pb-24)    | mostly    | yes          |

**Score: 2 PASS, 7 PARTIAL, 3 FAIL.**

The FAILs (`/teen/food`, `/teen/rides`, `/teen/mentors`) are all **lifestyle surfaces** added in Wave 3 that did not get the same Gen-Z polish as the original teen surfaces. They look like server-component-first stubs that need a UX redesign pass.

---

## Top 5 systemic fixes that would help all routes

### 1. Lift `pb-32` from page to layout

Move dock-clearance from each page wrapper into `app/teen/layout.tsx`:

```diff
- <main className="relative flex-1 p-4 md:p-6 md:ml-64">
+ <main className="relative flex-1 p-4 md:p-6 md:ml-64 pb-24 md:pb-6">
```

This eliminates the cause of `/teen/food` and `/teen/rides` overlapping the dock and removes ~12 redundant `pb-32` declarations. Then individual pages can drop their own `pb-32`.

### 2. Standardize the page-header pattern

Right now every teen page reinvents `flex items-center justify-between` with a 4xl italic title + 12×12 gradient icon + right-side action. Some forget `flex-shrink-0` on the action, some use `text-2xl` instead of `text-4xl`, and food/rides break the pattern entirely. Extract a `<TeenPageHeader title icon action />` shared component:
- locks the type scale (`text-3xl sm:text-4xl font-black tracking-tighter italic`),
- forces `flex-shrink-0` on the action slot,
- standardizes the 12×12 gradient icon cell,
- handles the "back" link on detail pages.

### 3. Enforce 44px touch target on form controls + icon buttons

Audit shows native `<select>` and `<Button size="icon">` consistently come in at 36px. Add a global override:

```css
@layer base {
  select, input[type="checkbox"], input[type="radio"], input[type="number"] {
    min-height: 44px;
  }
}
```

And widen the shadcn `Button size="icon"` variant to `h-11 w-11` (or add a new `size="icon-sm"` for legitimately small cases). This single change fixes touch-target failures across mentors, food, friends, messages.

### 4. Replace `text-gray-*` / `bg-blue-600` with design tokens on lifestyle pages

`/teen/food` uses raw Tailwind palette colors (`text-gray-500`, `text-gray-600`, `bg-blue-600`) instead of `text-muted-foreground`, `text-foreground`, `bg-primary`. Same for `/teen/rides` (uses unstyled shadcn `<Card>`). A 30-minute sweep on these two files would re-skin them to match the Gen-Z theme without architectural changes.

### 5. Add a single `flex-wrap` + horizontal-scroll pattern for chip/tab strips

`HubTabs` (5 tabs in /teen/quests), category chips (4 in defis-physiques), tab buttons (3 in friends) all face the same risk: chips overflow at 375px. Two viable patterns:
- **Option A**: `flex flex-wrap gap-2` — chips stack to a 2nd line.
- **Option B**: `flex gap-2 overflow-x-auto scrollbar-none snap-x` — chips scroll horizontally with snap.

Pick one (recommend **B** for tab strips, **A** for category filters), make it part of `HubTabs` props, and roll it out. Today the behavior is unspecified per surface.

---

## Bonus: routes-not-in-scope concerns spotted while reading

- `/teen/profile`, `/teen/settings`, `/teen/social` were not in the 12 — but `MobileDock` advertises `/teen/profile` and `/teen/social` as primary destinations. They should be added to the next 375px QA pass (TICKET-049 successor).
- The `EliteAICompanion` floating widget (rendered globally in `TeenLayout`) overlays the bottom-right — at 375px it can collide with the right-edge of the mobile dock. Worth checking its `z-index` and `bottom` offset.
- `TwinCurrencyGauge variant="full"` is rendered on both `/teen` (page.tsx) AND `/teen/quests`/`/teen/wallet` — single component, single bug surface, please QA it standalone at 375px.

---

**End of V3 report.**
