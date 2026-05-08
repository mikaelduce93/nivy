# Design System + Mobile Patterns — LOCKED CANON

**Status:** LOCKED · **Date:** 2026-05-08 · **Stack:** Next 16.1 · React 19.2 · Tailwind v4.1 · framer-motion 11 · Vaul 0.9 · Radix 1.x · sonner.
**Sources:** `docs/vision/audit-ui-ux-2026/MASTER_UX_AUDIT.md`, `TICKETS.md`, `W3-A10-lcp-audit.md`, `W4-A1..A5`, `audit-frontend-reality/C4-duplicates.md`, `v1_3_design_system_codemod_remaining.md`.

This file overrides any contradicting guidance elsewhere. Any drift = bug.

---

## 1. LOCKED — Token system

**Pipeline:** `app/globals.css` is the single source. No `tailwind.config.*` (Tailwind v4 inline). `@import "tailwindcss"` (line 1) → `:root` + `.dark` OKLCH literals → `@theme inline` (line 458) re-exports as `--color-*` for utilities.

**Locked rules:**
- All semantic tokens are **OKLCH only**. No hex, no `rgb()`, no `hsl()` for design intent. (Shadow `rgb(0 0 0 / α)` is the only allowed neutral-alpha exception.)
- **Semantic intent set (LOCKED):** `--brand` (alias of `--primary`), `--accent`, `--success`, `--info`, `--warning`, `--danger` (alias of `--destructive`). Each has a `-foreground` companion.
- **Soft companions (LOCKED):** `--brand-soft`, `--accent-soft`, `--success-soft`, `--info-soft`, **`--warning-soft`**, **`--danger-soft`**. Defined for both `:root` and `.dark`. Exposed via `@theme inline` as `--color-*-soft` (Tailwind utilities `bg-*-soft`, `text-*-soft`, `border-*-soft`, `ring-*-soft`).
- **Soft derivation (LOCKED):** must be expressed via `color-mix(in oklch, var(--<source>) 18%, var(--background))` in `globals.css`. Static OKLCH literals for soft tokens are deprecated. (Today: literals — flagged contradiction — fix per W4-A5 §2.)
- **Hover/active mixed shades (LOCKED):** every soft + accent token gains `--*-hover` and `--*-active` defined as `color-mix(in oklch, var(--*) 92%, white 8%)` / `... 92%, black 8%`. Replaces ad-hoc `/90 hover:/80` opacity patterns.
- **Brand neon pillars (LOCKED, decorative-only):** `--neon-party`, `--neon-vitality`, `--neon-intellect`, `--neon-creativity`, `--neon-prestige` — both modes. Allowed for glow / accent decoration only, never as background of text-bearing surfaces.
- **gen-z-\* tokens — DEPRECATED.** Migration plan: see §10. Forbidden as backgrounds for text. Allowed only inside the `*-gradient` / `*-mesh` decorative utility classes that consume them internally. Hard-removal target: V1.5.
- **Surface-aware focus token (LOCKED):** every Surface primitive sets `--focus-ring-color` on its root; consumers ring against `var(--focus-ring-color, var(--ring))`. See §5.

**Forbidden in app code:** raw `cyan|emerald|sky|rose|amber|fuchsia|blue|gray|indigo|teal-(50…950)` Tailwind palette utilities outside the `components/ui/` primitive layer with explicit allowlist comment. ESLint rule = CI gate (TICKET-001).

---

## 2. LOCKED — Primitives

Single canonical implementation per primitive. Duplicates listed in §10 are deprecated.

| Primitive | Canonical file | Locked invariants |
|---|---|---|
| **Button** | `components/ui/button.tsx` | CVA, 11 variants, 7 sizes. Default `h-11`, `sm: h-9 min-h-11`, `icon-sm: size-9 min-h-11 min-w-11`. `juice='tap'` default for `variant !== 'link'`. Hover lift + active press + colored shadow + `focus-visible:ring-[3px]` against `var(--focus-ring-color, var(--ring))`. `lavender|coral|grape` variants must use `text-on-bright` (not `text-white`) — contrast fix. |
| **Input** | `components/ui/input.tsx` | `h-11` default (44px touch). `data-state=invalid` → red ring + shake (motion-reduce: no shake). Always wrapped by `<FormField>` for a11y. |
| **FormField** | `components/ui/field.tsx` | Owns `label` + control + `helper` + `error` + `success-icon`. Auto-id via `useId()`. Wires `htmlFor`, `aria-describedby` (helper ∪ error), `aria-invalid`, `aria-required`. Error renders as `<p role="alert">`. Loading overlay `role="status"`. State icons `aria-hidden="true"`. |
| **StatusBadge** | `components/ui/status-badge.tsx` | Variants `pending|active|done|cancelled|rejected|info`. **Always icon + label**, never color-only. Mandatory replacement for color-only timelines (food order, ride status, internship application, mentor session, KYC). |
| **Headings** | `components/ui/headings.tsx` | Exports `<H1Teen>`, `<H1Parent>`, `<H1Admin>`, `<H1Partner>`, `<H2>`, `<H3>`, `<H4>`. Semantic `<h1..h4>` tag + role-scoped visual scale. Forbidden: styling-only `<div className="text-2xl font-bold">` where heading is contextually expected. |
| **ResponsiveModal** | `components/ui/responsive-modal.tsx` | Vaul `Drawer.*` on mobile, Radix `Dialog.*` on desktop. Breakpoint **768px** (`MOBILE_BREAKPOINT_PX`). SSR-safe (`useIsMobile` initial `false`, hydrates in `useEffect`). `forceVariant` escape hatch for tests. Sheet: drag handle, `pb-[env(safe-area-inset-bottom)]`, `max-h-[92vh]`. Backdrop standardized `bg-background/60 backdrop-blur-md`. Compound API (`Header`, `Title`, `Description`, `Body`, `Footer`, `Close`) is variant-aware. |
| **MorphingSkeleton** | `components/ui/morphing-skeleton.tsx` | Cross-fade primitive: blur-out 0.3s → blur-in 0.4s on skeleton→content swap. **Mandatory in every `loading.tsx`.** Hard-cut swaps forbidden. |
| **Celebrate** | `components/ui/celebrate.tsx` | Single `<Celebrate trigger="quest|friend|savings|order|levelup|mentor">` API. Honors `useReducedMotion` — particles off, replaced by static success card + icon pop. Body-scroll-locked during celebration. **Must call `useAnnounce()`** — see §5. |
| **AnnounceRegion** | `components/a11y/announce-region.tsx` | Mounted in `app/layout.tsx` outside `CSRFProvider`, inside `I18nProvider`. `aria-live="polite"` + `aria-atomic="true"`. Clears 1500 ms after announce; re-announces same string via clear+rewrite. SSR-safe. `useAnnounce()` is the only sanctioned announcement transport. |

---

## 3. LOCKED — Motion easing

**Single source:** `lib/motion/easing.ts`. Inline `cubic-bezier(...)` literals in component code = **forbidden**.

```ts
// LOCKED constants
export const EASE_STANDARD = [0.23, 1, 0.32, 1] as const;   // crossfade, default page transitions
export const EASE_EMPHASIZED = [0.16, 1, 0.3, 1] as const;  // per-surface morph (View Transitions)
export const EASE_DECEL = [0, 0, 0.2, 1] as const;
export const EASE_ACCEL = [0.4, 0, 1, 1] as const;
export const EASE_DRAMATIC = [0.7, 0, 0.3, 1] as const;

export const SPRING_SNAPPY  = { type: 'spring', stiffness: 380, damping: 32, mass: 0.8 } as const; // dock pill
export const SPRING_BOUNCY  = { type: 'spring', stiffness: 400, damping: 22 } as const;            // toggle thumb
export const SPRING_SMOOTH  = { type: 'spring', stiffness: 260, damping: 30 } as const;
export const SPRING_GENTLE  = { type: 'spring', stiffness: 180, damping: 26 } as const;

export const DUR_FAST = 0.16;
export const DUR_BASE = 0.24;
export const DUR_SLOW = 0.4;
```

**Motion proxy (LOCKED):** all client components import from `@/components/ui/motion`, **not** `framer-motion` directly:
```ts
import { Motion as motion, MotionGate, useMotion, AnimatePresence } from '@/components/ui/motion';
```
The `Motion.*` proxy consults `useReducedMotion()` once and short-circuits `animate` / `initial` / `whileHover` / `whileTap` to identity when reduced. Codemod target: 100% of `framer-motion` consumers. Direct `framer-motion` imports allowed only inside `components/ui/motion.tsx` itself.

---

## 4. LOCKED — Skeleton system

**Two entry points only:**
1. **Atoms** — `components/ui/skeletons/atoms.tsx` exporting `<Skeleton.Avatar/>`, `<Skeleton.Card/>`, `<Skeleton.ListRow/>`, `<Skeleton.Heading/>`, `<Skeleton.Stat/>`, `<Skeleton.Chip/>`. All inherit `SKELETON_BASE = 'animate-pulse motion-reduce:animate-none motion-reduce:bg-muted/80'`.
2. **Presets** — `components/ui/skeletons/index.ts` re-exports `<PageSkeleton kind="dashboard|list|detail|form" />` and the 3 bespoke page skeletons.

**Bespoke page skeletons (LOCKED, only 3 today):**
- `components/ui/skeletons/page-skeletons/teen-dashboard-skeleton.tsx` → wired in `app/teen/loading.tsx`.
- `components/ui/skeletons/page-skeletons/parent-dashboard-skeleton.tsx` → wired in `app/parent/loading.tsx`.
- `components/ui/skeletons/page-skeletons/partner-dashboard-skeleton.tsx` → wired in `app/partner/loading.tsx` + `app/partner/dashboard/loading.tsx`.

**CLS-zero rules (LOCKED):**
- Each skeleton mirrors the real DOM rhythm: same `min-h`, `gap`, grid columns, and number of placeholder rows as the rendered content.
- Numeric values render with `tabular-nums` + `min-width` reserved by skeleton dimensions.
- Skeletons are **server components** (no `'use client'`) → stream immediately.
- Top-level wrapper sets `aria-busy="true"` + `role="status"` + child `<span class="sr-only">Chargement…</span>`.

**Skeleton → content swap:** `MorphingSkeleton` only. Hard cuts forbidden.

---

## 5. LOCKED — A11y rules

- **Skip-links (LOCKED):** `<SkipLinks />` mounted in `app/layout.tsx`; `<SkipToContent />` mounted **first focusable** in every role layout (`app/(dashboard)/`, `app/admin/`, `app/ambassador/`, `app/mentor/`, `app/parent/`, `app/partner/`, `app/teen/`). Each role layout declares an inner `<main id="main-content" tabIndex={-1}>`. Skip-link resolves the **last** `#main-content` (`querySelectorAll(...).at(-1)`) — deterministic deepest-target focus. (Open contradiction: duplicate `id="main-content"` on root + role; rename root to `id="root-main-content"` per W4-A3 §1.)
- **`<main>` always carries `tabIndex={-1}`** so skip-link focus lands.
- **FormField a11y wiring (LOCKED):** `htmlFor` + auto `useId()` + `aria-describedby` (helper ∪ error) + `aria-invalid` + `aria-required` + error `<p role="alert">`. State icons `aria-hidden="true"`. Required-asterisk `aria-hidden="true"`.
- **Live regions (LOCKED):** `aria-live="polite"` is **only** delivered by `<AnnounceRegion>` + `useAnnounce()`. Six required call-sites: chore approved, savings goal reached, level up, food delivered, mentor session confirmed, friend request accepted. Reduced-motion users get the announce + a static success card; particles suppressed.
- **Touch targets ≥ 44px (LOCKED):** every interactive primitive must clear 44×44 either visually (`h-11`) or via `min-h-11 min-w-11` paired with smaller visual height. Pattern proven in `button.tsx` and `neon-button.tsx` — extend to `select`, `toggle`, `tabs`, `tabs-animated` (md), `input-otp`, `input-group`, `date-picker` (P0 from W4-A4 §9).
- **Viewport meta (LOCKED):** `app/layout.tsx` `export const viewport`: `width: "device-width"`, `initialScale: 1`, `maximumScale: 5`, `viewportFit: "cover"`. **`userScalable` MUST NOT be set** (omitted = browser default true). Setting `userScalable: false` = WCAG 1.4.4 violation = CI lint fail.
- **Focus ring (LOCKED):** `focus-visible:ring-[3px] ring-[var(--focus-ring-color,var(--ring))] ring-offset-2`. Bare `focus:` allowed only for skip-link reveal patterns (`focus:not-sr-only`) and Radix Menubar roving-tabindex. `focus:outline-hidden` without a paired ring = forbidden.
- **`<Switch>`** must always be passed `aria-label` or `aria-labelledby` by callers — Radix doesn't enforce. Dev-warn on mount when neither is present.
- **NotificationBell** must carry `aria-label={\`Notifications${unreadCount ? \`, ${unreadCount} non lues\` : ''}\`}` and `<Bell aria-hidden="true" />`. P0 contradiction in current source — see W4-A3 §9.
- **Role-scoped `<nav>` landmarks** carry `aria-label="Navigation principale"` (or role-scoped) — no unlabeled `<nav>` elements in role sidebars/headers.
- **Color-only signal forbidden:** every status indicator goes through `<StatusBadge>` (icon + label).

---

## 6. LOCKED — Mobile patterns

- **PullToRefresh (LOCKED):** `components/teen/pull-to-refresh.tsx`. Touch-only — handlers mount **only** when `matchMedia('(hover: none) and (pointer: coarse)')` matches. Defaults: `threshold=72px`, `maxPull=120px`, `onRefresh = router.refresh()`. Reduced-motion: indicator snaps without spring, content does not translate. `disabled` prop available. Required surfaces: quests, feed, notifications, marketplace, mentors, food, rides, friends, leaderboard, messages.
- **SwipeableCard (LOCKED):** `components/ui/swipeable-card.tsx`. Props: `onSwipeDelete?: (direction)`, `dismissThreshold=0.3` (ratio of width), `direction: 'left'|'right'|'both'`, optional `leftAction`/`rightAction` reveal layers. Velocity escape hatch: `Math.abs(velocity.x) > 800` triggers dismiss before threshold. Reduced-motion: spring disabled, snap to rest/exit. Bottom-sheet variant uses `pb-[env(safe-area-inset-bottom)]`. Required surfaces: notifications, friend requests, suggestions, cart items.
- **Long-press (LOCKED):** `lib/hooks/use-long-press.ts`. Defaults: `threshold=500ms`, `moveThreshold=10px` (cancel on movement), `haptic=true` (`navigator.vibrate(30)`). Cancels on pointer up before threshold, pointer leave/cancel, movement > 10px. `onContextMenu` `preventDefault()` to suppress native menu. Returns `{ cancel, isPressing }`. Required surfaces: feed posts (copy/report/block/share), friends (mute/unfriend), messages (delete/react).
- **Safe-area insets (LOCKED):** `pb-[calc(<base>+env(safe-area-inset-bottom))]` on every fixed-bottom surface. Compulsory on:
  1. All 5 role layouts (`teen|parent|admin|mentor|partner`) — bottom padding includes safe-area.
  2. Both mobile docks (`mobile-dock.tsx`, `parent-mobile-dock.tsx`) — SSR placeholder + live nav.
  3. Cookie banner (`components/cookie-banner.tsx`).
  4. Floating surfaces: `AgentFloatingButton`, `notification-center`, `install-pwa-prompt`.
  5. Toast top-mobile (`pt-[calc(1rem+env(safe-area-inset-top))]`) and bottom-desktop.
  6. ResponsiveModal sheet, BottomSheet, SwipeableCard bottom-sheet variant, LongPressMenu sheet.
  ESLint rule rejects `fixed bottom-0|inset-0` without `pb-[env(safe-area-inset-bottom)]` or `pb-safe`.
- **Tailwind `.pb-safe / .bottom-safe / .min-h-screen-safe`** family (`app/globals.css:869-927`) all use `env(safe-area-inset-*, 0px)` fallback — locked.
- **FormKeyboardAware (LOCKED):** `lib/hooks/use-keyboard-aware.ts`. Listens to both `resize` and `scroll` on `visualViewport`; factors `visualViewport.offsetTop` into occluded height (iOS Safari fix). Default keyboard-open detection threshold = 150px height delta; default scroll padding = 16px above keyboard. Reduced-motion: instant `'auto'` scroll, not `'smooth'`. Required minimum coverage: ride request, food checkout, goal form, partner offer create, chore form, allowance form, mentor session form (7 wired). Backlog: profile-edit, friend-search, evidence-upload, auth.

---

## 7. LOCKED — View Transitions API

- **Provider:** `components/providers/view-transitions-provider.tsx` (capture-phase delegated `click` on `document`, walks to closest `<a>`, validates same-origin / no-modifier / non-`_blank` / non-download / no `data-view-transition="off"` opt-out, then `event.preventDefault()` + `document.startViewTransition(() => router.push(...))`).
- **Mounting (LOCKED):** in `app/layout.tsx` inside `PerformanceProvider`, above feature surfaces. Below `AppProviders`.
- **Five `vt-*` pairs (LOCKED — adding a 6th requires both code + CSS allowlist update):**
  | Prefix | List | Detail |
  |---|---|---|
  | `vt-quest-<id>` | `app/teen/quests/quests-hub-client.tsx` | `app/teen/quests/[id]/quest-detail-client.tsx` |
  | `vt-mentor-<id>` | `app/teen/mentors/page.tsx` | `app/teen/mentors/[id]/page.tsx` |
  | `vt-listing-<id>` | `app/marketplace/page.tsx` | `app/marketplace/listings/[id]/page.tsx` |
  | `vt-restaurant-<id>` | `app/teen/food/page.tsx` | `app/teen/food/[partner_id]/page.tsx` |
  | `vt-feed-<id>` | `app/teen/feed/feed-list.tsx` | `app/teen/feed/[id]/page.tsx` |
  CSS allowlist comment lives at `app/globals.css:1837-1844`.
- **Default crossfade:** 280ms `EASE_STANDARD`. Per-surface morph: 320ms `EASE_EMPHASIZED`.
- **Reduced-motion two-layer skip (LOCKED):**
  1. **JS layer:** provider returns early before `startViewTransition` when `matchMedia('(prefers-reduced-motion: reduce)').matches` → vanilla `<a>` nav.
  2. **CSS layer:** `@media (prefers-reduced-motion: reduce) { ::view-transition-group(*), ::view-transition-old(*), ::view-transition-new(*) { animation: none !important; } }` (defence-in-depth).
- **Opt-out:** add `data-view-transition="off"` to any `<a>` to bypass the provider.

---

## 8. LOCKED — Toasts

**Canonical = `sonner`.** Single mounted `<Toaster>` from `components/ui/sonner.tsx`.

```tsx
<Toaster
  position={isMobile ? 'top-center' : 'bottom-right'}
  expand
  gap={8}
  visibleToasts={3}
  // aria-live=polite is provided by sonner internally
/>
```

- Position is responsive: top-center on mobile (avoids dock collision), bottom-right on desktop.
- Toasts respect safe-area: `sm:pb-[calc(1rem+env(safe-area-inset-bottom))]` and `pt-[calc(1rem+env(safe-area-inset-top))]` for top stacks (`components/ui/toast.tsx:19` — wrapper class).
- **Validation errors do NOT use toasts.** Inline under field via `<FormField error>` + `aria-live` from announce region.
- Stack motion: spring slide-in, depth-offset stack, fade-blur on push (TICKET-021).

**DEPRECATED:** Radix-based `components/ui/toast.tsx` + `components/ui/toaster.tsx` + `hooks/use-toast.ts`. Migrate remaining callers to `import { toast } from 'sonner'`. Hard-removal target: V1.5.

---

## 9. LOCKED — Optimistic mutations

- **Pattern:** React 19 `useOptimistic` paired with `startTransition` (mandatory). Shared wrapper `lib/hooks/use-optimistic-mutation.ts` exports `useOptimisticRunner` combining `useOptimistic` with TanStack Query mutation lifecycle for automatic rollback on error.
- **Rollback toast contract (LOCKED):** on error, `toast.error(message, { action: { label: 'Réessayer', onClick: retry } })`. Single button, label `"Réessayer"`.
- **Required surfaces (≥ 8 today):** feed likes, friend-request accept/decline, follow/unfollow, chore-complete, savings-goal lock, cart-add, mentor-session-book, food-order place, quest-complete (via `useOptimisticRunner`).
- Optimistic state must always render the **next** state immediately; rollback must restore the **prior** state, never a stale third state.
- All optimistic helpers must wrap mutations in `startTransition` — calling `useOptimistic` outside a transition is forbidden (R19+ requirement).

---

## 10. DEPRECATED (sunset)

| Item | Replacement | Sunset target |
|---|---|---|
| Radix toast wrapper (`components/ui/toast.tsx`, `toaster.tsx`, `hooks/use-toast.ts`) | sonner | V1.5 |
| `components/ui/pull-to-refresh.tsx` (legacy generic) | `components/teen/pull-to-refresh.tsx` | V1.4 — once grep confirms 0 callers |
| `components/ai/elite-ai-companion.tsx`, `components/ai/AgentSheet.tsx`, `components/ai/AgentFloatingButton.tsx`, `components/teen/dashboard/ai-companion.tsx` | AvatarCoach v2 chat panel (`components/teen/avatar-coach{,-client}.tsx`) | V1.5 |
| `gen-z-{lavender,coral,mint,sky,lime,peach,grape,yellow,rose,teal}` tokens for non-decorative use | semantic soft tokens (`brand-soft`, `accent-soft`, `success-soft`, `info-soft`, `warning-soft`, `danger-soft`) | hard-removal V1.5 (Day 4 of v1_3 codemod plan) |
| `components/ui/empty.tsx`, `components/ui/error-states.tsx`, `components/ui/fallback-states.tsx`, `components/ui/query-error-fallback.tsx` | `components/ui/states/{empty-state,error-block,page-error}.tsx` | V1.4 |
| `components/gamification/quest-card.tsx` | `components/teen/dashboard/quest-card.tsx` (UnifiedQuest) | V1.4 |
| `components/ui/skeleton-variants.tsx` (framer-motion shimmer set) | atoms + presets | V1.5 — if 0 production callers |
| Hardcoded motion durations / inline `cubic-bezier(...)` | `lib/motion/easing.ts` constants | V1.4 |
| `components/providers/page-transition-provider.tsx` (where it overlaps `view-transitions-provider`) | `view-transitions-provider` is canonical for cross-route morphs | V1.5 |

---

## 11. FORBIDDEN patterns (CI-enforced)

ESLint rules (`eslint.config.*`) reject the following inside `app/teen/**`, `app/parent/**`, `app/partner/**`, `app/admin/**`, `app/mentor/**`, `app/ambassador/**`, and `components/**` (excluding `components/ui/` primitive layer with allowlist comment):

1. **Raw palette utilities outside allowlist** — regex `\b(text|bg|border|ring|from|via|to|shadow)-(cyan|emerald|sky|rose|amber|fuchsia|blue|gray|indigo|teal)-(50|100|200|300|400|500|600|700|800|900|950)\b`. Use semantic tokens instead.
2. **Raw `motion-reduce:` skipping JS guard for pure `framer-motion`** — when a component imports from `framer-motion` directly (not the `Motion` proxy), `motion-reduce:` Tailwind utilities are insufficient; the file must call `useReducedMotion()` and short-circuit `animate`/`initial`. Lint rule: `framer-motion` import + `motion.*` JSX without `useReducedMotion` import = error. Preferred: import via `@/components/ui/motion` (`Motion` proxy auto-handles).
3. **`<img>` without `next/image`** — except inside `components/ui/` primitive escape-hatches with explicit comment. CI fails on new offenders.
4. **Inline `cubic-bezier(...)` literals** in `.tsx` / `.ts` files — must import from `lib/motion/easing.ts`.
5. **`focus:` without `focus-visible:`** — bare `focus:` allowed only inside `components/ui/skip-to-content.tsx`, `components/ui/accessibility/skip-links.tsx`, `components/ui/accessibility/visually-hidden.tsx`, `components/ui/menubar.tsx` (Radix roving tabindex). Everywhere else: must pair with `focus-visible:`.
6. **`focus-visible:outline-hidden` without a paired ring class.**
7. **`fixed bottom-0|inset-0`** without `pb-[env(safe-area-inset-bottom)]` or `pb-safe`.
8. **`userScalable: false`** anywhere in viewport metadata.
9. **`gen-z-*` className strings** outside the legacy decorative utility classes inside `app/globals.css`.
10. **`style={{}}` static-only** — flagged by codemod when no prop/state/cursor coord is referenced (target: < 100 occurrences).
11. **Magic px tokens** — `(px|py|w|h|gap|text)-\[\d+px\]` (target: < 50 occurrences). Use Tailwind scale or named CSS vars.
12. **Direct `import { motion } from 'framer-motion'`** outside `components/ui/motion.tsx` — must go through the `Motion` proxy.
13. **`toast.error(...)` for form-field validation** — use `<FormField error>` inline + announce-region.
14. **Color-only status indicators** — must use `<StatusBadge>` with icon + label.
15. **Styling-only headings** (e.g., `<div className="text-2xl font-bold">`) where context expects an `<h2>` — must use `<H1Teen>`/`<H2>`/etc.

---

## 12. MISSING (acknowledged gaps, not blockers)

- **Bespoke skeletons beyond the 3 dashboards** — mentor list, food list, marketplace, leaderboard, feed, friends, internships still fall back to generic preset. TICKET-032.
- **Playwright visual baselines = 0 PNGs committed.** Infra wired (`tests/visual/critical-pages.spec.ts`, `playwright.config.ts:snapshotPathTemplate`, 5 specs authored), but `tests/visual/__screenshots__/**/*.png` is empty. No CI gate today. Plan: 4-viewport project matrix (375 / 768 / 1280 / 1920), auth fixtures (teen/parent/admin/partner), baseline the 12 HIGH-risk routes first.
- **Container queries adoption** — only 2 files (`card.tsx`, `field.tsx`) declare `@container/<name>`; zero descendants use `@sm:`/`@md:` query variants. Backlog: convert 5–10 high-value cards (quest, mentor, feed posts) to `@container/card`-driven layouts.
- **`useActionState` / `useFormStatus`** — 0 adoption. Backlog: simplify several manually-tracked submit buttons.
- **Native Popover API (`popover=`)** — 0 adoption. Radix popover ships everywhere. Backlog: pilot on notification bell behind capability check, then ratchet.
- **PPR (Partial Prerendering)** — `experimental.ppr` not enabled in `next.config.mjs`. Biggest TTFB win available for marketing pages.
- **`color-mix()` derivation of soft tokens** — not implemented; soft tokens are static OKLCH literals today (W4-A5 §2). 2-hour fix.
- **`--warning-soft` / `--danger-soft`** — referenced by `components/ui/card.tsx` comments but **not defined** in `:root` or `.dark`. Tailwind emits `var(--color-warning-soft)` → unset → inherited bg fallback. P0 fix.
- **`FormKeyboardAware` adoption gap** — 7 of N forms wired. Profile-edit, friend-search, evidence-upload, auth surfaces uncovered.

---

## 13. UNRESOLVED founder decisions

| # | Decision | Recommendation |
|---|---|---|
| 1 | **gen-z palette deprecation timeline.** Codemod Day 1+2 done (637 substitutions). Day 3 (cyan/emerald wrap, ~1900 occurrences) + Day 3.5 (drop 6 low-usage gen-z tokens) + Day 4 (token removal + hard cutover) outstanding. | **Recommend: ship Day 3+3.5 codemod in V1.4 (pre-launch); execute Day 4 hard removal in V1.5 sprint.** Keep `gen-z-*` decorative utility classes (`bg-gen-z-gradient`, `bg-gen-z-mesh`, `text-gen-z-gradient`) but rename their *internal* var references; rename the utility classes themselves to `bg-soft-gradient` etc. in V1.5. Risk: 50 manual gradient pair reviews. |
| 2 | **Tailwind v4 PPR enable for production.** `experimental.ppr` is off; static + dynamic boundaries currently live at route-level `dynamic = 'force-dynamic'`. | **Recommend: enable PPR for V1.5, not V1.4.** Marketing pages (`/agenda`, `/anniversaires`, `/aide`, `/devenir-*`) gain the most. Authenticated dashboards already stream via Suspense. Pre-launch risk too high to enable on a Friday — schedule for V1.5 week 1 with Lighthouse before/after. |
| 3 | **Storybook adoption for primitives.** Currently no Storybook; visual regression piggybacks on full-page Playwright captures. | **Recommend: do NOT adopt Storybook for V1.4.** Page-level layout is the dominant regression risk (FLIP, View Transitions, skeletons), which Storybook would not surface. Re-evaluate at V1.6 if the primitive surface keeps growing past ~80 components. Cost: duplicate runner + CI minutes. The 4-viewport Playwright matrix + auth fixtures is a higher-leverage 1-week investment. |

---

## Contradictions flagged (must reconcile before "GREEN")

- **Soft tokens defined as static OKLCH literals** (W4-A5 §2) vs §1 of this canon requiring `color-mix()` derivation. Reconcile via globals.css edit (W4-A5 §recommendation #1).
- **`--warning-soft` / `--danger-soft` referenced but not defined** (W4-A5 §2). Add to `:root` and `.dark`.
- **Duplicate `id="main-content"`** on root + role layouts (W4-A3 §1). Rename root to `id="root-main-content"`.
- **`components/ui/card.tsx` doc comments claim soft tokens are "color-mix()-derived"** — stale, currently misleading. Update once §1 is reconciled.
- **`components/ui/dialog.tsx` close button `focus-visible:outline-hidden`** without a replacement ring (TICKET-047 — partially landed; verify in source against §5).
- **Brand-soft / accent-soft / success-soft + `text-white`** in button variants `lavender|coral|grape` fail WCAG 4.5:1 (W4-A3 §6). Switch to `text-on-bright`.
- **NotificationBell missing `aria-label`** (W4-A3 §9, P0).
- **7 role-sidebar / role-header `<nav>` elements unlabeled** (W4-A3 §8).
- **`celebrate.tsx` and `parallax-container.tsx`** animate without `useReducedMotion` gate (W4-A3 §7).

---

End of LOCKED canon. Source-of-truth precedence: this file > `MASTER_UX_AUDIT.md` > `TICKETS.md` > legacy docs.
