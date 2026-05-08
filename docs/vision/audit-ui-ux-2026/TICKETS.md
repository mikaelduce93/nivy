# Nivy — UX/UI 2026 ticket list (50 tickets)

> Distribution: 12 design-system, 10 microinteractions, 8 animations, 6 perceived-perf, 5 mobile-gestures, 4 forms, 3 modals/dialogs, 2 a11y. Effort key: **S** ≤ ½ day · **M** ½–1 day · **L** 1–2 days. Priority: **P0** = launch-quality blocker · **P1** = V1.4 polish · **P2** = V1.5 stretch.

---

## Domain: design-system (12 tickets)

### TICKET-001 [design-system] Lint-ban raw color literals across `app/`
- **Specialist profile**: design-system architect
- **Priority**: P0
- **Files**: `eslint.config.*`, all `app/**/*.tsx`
- **Acceptance**: ESLint rule `no-restricted-syntax` rejects `(cyan|emerald|sky|rose|amber|fuchsia|indigo|teal)-(\d+)` literals in `app/teen/**`, `app/parent/**`, `app/partner/**`, `app/admin/**`. CI fails on any new offender. Initial baseline allowlist (existing 50 files) recorded; tracker auto-decrements.
- **Effort**: M
- **Dependencies**: none

### TICKET-002 [design-system] Wave 3 token sweep — food/rides/mentors/pathways/internships
- **Specialist profile**: design-system migrator
- **Priority**: P0
- **Files**: `app/teen/food/**`, `app/teen/rides/**`, `app/teen/mentors/**`, `app/teen/pathways/**`, `app/teen/internships/**`, `app/admin/drivers/**`, `app/admin/mentors/**`, `app/admin/internships/**`, `app/partner/restaurant/**`, `app/teen/feed/**`, `app/teen/messages/**`
- **Acceptance**: All raw `bg-blue-600`/`text-gray-*`/`bg-gray-200` removed. Headings standardised to teen pattern (`text-4xl font-black tracking-tighter italic` for teen surfaces). Buttons routed through `<Button>` primitive. Status timelines use `<StatusBadge>` (TICKET-007).
- **Effort**: L
- **Dependencies**: TICKET-007

### TICKET-003 [design-system] Per-role heading components
- **Specialist profile**: design-system architect
- **Priority**: P0
- **Files**: new `components/ui/headings.tsx`; consumers across `app/`
- **Acceptance**: Exports `<H1Teen>`, `<H1Parent>`, `<H1Admin>`, `<H1Partner>`, plus `<H2>`, `<H3>` semantically tagged + visually scaled per role. Codemod replaces ~80 `<h1 className="text-...">` instances.
- **Effort**: M
- **Dependencies**: none

### TICKET-004 [design-system] `<Field>` primitive (label + control + error + hint)
- **Specialist profile**: form architect
- **Priority**: P0
- **Files**: `components/ui/field.tsx` (extend existing), `components/ui/input.tsx`
- **Acceptance**: `<Field label hint error required>` wraps `<Input>`/`<Textarea>`/`<Select>`. Error state triggers shake animation (reduced-motion respected) and red ring; success state renders animated check. `Input` default `h-11` (44 px touch).
- **Effort**: M
- **Dependencies**: TICKET-040

### TICKET-005 [design-system] Skeleton atoms + presets consolidation
- **Specialist profile**: design-system architect
- **Priority**: P1
- **Files**: new `components/ui/skeletons/atoms.tsx`, refactor `dashboard-skeletons.tsx`, `skeleton-variants.tsx`, `skeleton-set.tsx`, `page-skeleton.tsx`
- **Acceptance**: Two entry points only — atoms (`<Skeleton.Avatar/Card/ListRow/Heading/Stat/Chip>`) and presets (`<PageSkeleton kind="dashboard|list|detail|form" />`). Old entry points re-export atoms for back-compat then deprecated.
- **Effort**: M
- **Dependencies**: none

### TICKET-006 [design-system] EmptyState propagation codemod
- **Specialist profile**: design-system migrator
- **Priority**: P1
- **Files**: ~80 surfaces with inline empty messages (search `Aucun|Aucune|No items|No results|Empty`)
- **Acceptance**: All `if (items.length === 0) return <p>` patterns replaced by `<EmptyState preset="..." action=...>`. Lint rule added.
- **Effort**: L
- **Dependencies**: none

### TICKET-007 [design-system] `<StatusBadge>` — color + icon + label
- **Specialist profile**: design-system architect
- **Priority**: P0
- **Files**: new `components/ui/status-badge.tsx`
- **Acceptance**: Variants `pending|active|done|cancelled|rejected|info`. Always renders icon + label. Used by Wave-3 surfaces (food order timeline, ride status, internship application, mentor session, kyc).
- **Effort**: S

### TICKET-008 [design-system] Replace `<img>` with `next/image` — 6 files
- **Specialist profile**: perf engineer
- **Priority**: P1
- **Files**: `app/teen/feed/[id]/page.tsx`, `components/teen/evidence-upload.tsx`, `app/admin/proofs/moderation-review-row.tsx`, `app/marketplace/listings/[id]/page.tsx`, `app/marketplace/page.tsx`, `gamification-system/components/challenges/challenge-card.tsx`
- **Acceptance**: All raw `<img>` migrated. Hero images carry `priority`. Lint rule blocks future `<img>`.
- **Effort**: S

### TICKET-009 [design-system] Magic-px codemod (target: < 50 across repo)
- **Specialist profile**: design-system migrator
- **Priority**: P1
- **Files**: top offenders `components/teen/twin-currency-gauge.tsx` (14), `app/teen/internships/page.tsx` (11), `components/feed/social-feed.tsx` (6), `app/teen/pathways/page.tsx` (6), `app/teen/social/social-hub-client.tsx` (6)
- **Acceptance**: 235 → < 50 occurrences of `(px|py|w|h|gap|text)-\[\d+px\]`. Replace with Tailwind scale tokens (4/8/12/16/24/32) or named CSS vars.
- **Effort**: M

### TICKET-010 [design-system] Inline-style codemod (target: < 100)
- **Specialist profile**: design-system migrator
- **Priority**: P2
- **Files**: top: `components/ui/effects/elite-3d-card.tsx` (22), `components/teen/dashboard/hero.tsx` (22), `components/ui/effects/animated-border.tsx` (15), `components/ui/effects/elite-cursor.tsx` (11)
- **Acceptance**: 454 → < 100 `style={{}}` occurrences. Dynamic-only (cursor coords, gradient stops driven by props) keep; static styles → Tailwind.
- **Effort**: L

### TICKET-011 [design-system] Card glass / solid / outline variants formalised
- **Specialist profile**: design-system architect
- **Priority**: P1
- **Files**: `components/ui/card.tsx`, `components/ui/glass-card.tsx`
- **Acceptance**: Single `<Card variant="glass|solid|outline" surface="brand|neutral|info|success|warning|danger">` API. Container queries (`@container`) drive responsive padding.
- **Effort**: M
- **Dependencies**: TICKET-046

### TICKET-012 [design-system] CSS tokens — add hover/active mixed-shade vars
- **Specialist profile**: design-system architect
- **Priority**: P2
- **Files**: `app/globals.css`
- **Acceptance**: Each `--brand-soft` / `--accent-soft` / etc. gains a `--*-hover` and `--*-active` defined via `color-mix(in oklch, var(--*) 92%, white 8%)`. Eliminates ~40 `/90 hover:/80` Tailwind class patterns.
- **Effort**: S
- **Dependencies**: TICKET-047

---

## Domain: microinteractions (10 tickets)

### TICKET-013 [microinteractions] Animated tabs — pill indicator with `layoutId`
- **Specialist profile**: motion designer
- **Priority**: P0
- **Files**: new `components/ui/tabs-animated.tsx` (extract from `components/teen/hub-tabs.tsx`); replace `tabs.tsx` consumers in ~20 surfaces
- **Acceptance**: Active tab pill slides via `layoutId="tab-pill"`. Reduced-motion fades only.
- **Effort**: M

### TICKET-014 [microinteractions] Switch / Checkbox / Radio motion polish
- **Specialist profile**: motion designer
- **Priority**: P1
- **Files**: `components/ui/switch.tsx`, `components/ui/checkbox.tsx`, `components/ui/radio-group.tsx`
- **Acceptance**: Toggle thumb has spring overshoot (stiffness 400, damping 22). Checkbox check draws (SVG path animation). Radio fills with scale-in. Reduced-motion → no spring.
- **Effort**: M

### TICKET-015 [microinteractions] Notification bell shake-on-new
- **Specialist profile**: motion designer
- **Priority**: P1
- **Files**: `components/notifications/notification-bell.tsx` (or wherever bell renders), wherever in `mobile-dock.tsx`
- **Acceptance**: When unread count increments, bell rotates ±15° three times, badge keys re-mount with scale-in. Sound via `useJuice('notification')`.
- **Effort**: S

### TICKET-016 [microinteractions] Default-on tap haptic + sound for buttons
- **Specialist profile**: motion designer
- **Priority**: P1
- **Files**: `components/ui/button.tsx`
- **Acceptance**: `Button` default `juice='tap'` for `variant !== 'link'`. Opt-out via `juice={null}`. Haptic API gracefully degrades.
- **Effort**: S

### TICKET-017 [microinteractions] Card hover-lift + glow standardisation
- **Specialist profile**: motion designer
- **Priority**: P1
- **Files**: `components/ui/card.tsx`, all card consumers (~40)
- **Acceptance**: Interactive cards (with `onClick` or wrapping `<Link>`) get `hover:-translate-y-0.5 hover:shadow-[0_8px_24px_-8px_var(--surface-glow)]` by default. Static cards no hover.
- **Effort**: M

### TICKET-018 [microinteractions] Form field focus glow per surface palette
- **Specialist profile**: motion designer
- **Priority**: P1
- **Files**: `components/ui/input.tsx`, `components/ui/textarea.tsx`, `components/ui/select.tsx`
- **Acceptance**: Focus ring colour mixed from current surface (uses `:has()` ancestor lookup or local CSS var `--surface-accent`). Smooth 200 ms transition.
- **Effort**: S
- **Dependencies**: TICKET-048

### TICKET-019 [microinteractions] Mobile dock active-state and badge animation polish
- **Specialist profile**: motion designer
- **Priority**: P1
- **Files**: `components/layouts/mobile-dock.tsx`, `components/layouts/parent-mobile-dock.tsx`
- **Acceptance**: Active tab gets 3-keyframe pop (1 → 1.15 → 1.1 over 240 ms). Badge count change (+1) keys remount with overshoot; tab icon shakes once.
- **Effort**: S

### TICKET-020 [microinteractions] Form submit success animation (button → check → reset)
- **Specialist profile**: motion designer
- **Priority**: P0
- **Files**: `components/ui/button.tsx` (PremiumButton already supports), all form consumers
- **Acceptance**: Replace `<Button disabled={loading}>` with `<PremiumButton loading={loading} success={done}>` in ~12 forms (chore, allowance, mentor-session, food order, ride request, etc.). Success state shows check 1.5 s then resets.
- **Effort**: M

### TICKET-021 [microinteractions] Toast in/out + stack motion
- **Specialist profile**: motion designer
- **Priority**: P2
- **Files**: `components/ui/sonner.tsx`, sonner config
- **Acceptance**: Toasts slide-in from top-right with spring; stack with depth offset; old toasts fade-blur on push. `aria-live=polite` confirmed.
- **Effort**: S

### TICKET-022 [microinteractions] Confetti + sound on more wins
- **Specialist profile**: motion designer
- **Priority**: P1
- **Files**: chore-complete, friend-accepted, savings-goal-reached, food-order-delivered, mentor-session-confirmed, level-up (already)
- **Acceptance**: 5 new fire points hooked into `<Confetti origin="bottom" intensity="medium">`. Each has a soundscape via `useJuice`.
- **Effort**: M

---

## Domain: animations (8 tickets)

### TICKET-023 [animations] `<Motion>` wrapper enforcing reduced-motion
- **Specialist profile**: motion architect
- **Priority**: P0
- **Files**: new `components/ui/motion.tsx` (extend existing), codemod across ~100 motion files
- **Acceptance**: Replace `import { motion } from 'framer-motion'` with `import { Motion as motion } from '@/components/ui/motion'` across all client components. Wrapper consults `useReducedMotion()` and short-circuits `animate`/`initial` to identity when reduced. Compliance jumps from 14 % to 100 %.
- **Effort**: M

### TICKET-024 [animations] View Transitions API — pilot 5 highest-traffic morphs
- **Specialist profile**: motion architect
- **Priority**: P0
- **Files**: `app/layout.tsx`, target routes: `/teen → /teen/quests/[id]`, `/teen/social ↔ /teen/messages`, `/teen/mentors → /teen/mentors/[id]`, `/marketplace → /marketplace/listings/[id]`, `/teen/food → /teen/food/[partner_id]`
- **Acceptance**: Wrap navigations with Next 15's `unstable_ViewTransition`. Shared elements (mentor avatar, listing image, partner logo) use `view-transition-name` paired across routes.
- **Effort**: L

### TICKET-025 [animations] `MorphingSkeleton` adoption in all `loading.tsx`
- **Specialist profile**: motion designer
- **Priority**: P1
- **Files**: all `loading.tsx` (existing 22 + new ones from TICKET-029)
- **Acceptance**: Skeleton → content swap uses `MorphingSkeleton` with blur+scale crossfade. No hard cuts.
- **Effort**: S
- **Dependencies**: TICKET-029

### TICKET-026 [animations] FLIP / `layout` on lists (feed, quests, friends, leaderboard, marketplace)
- **Specialist profile**: motion architect
- **Priority**: P1
- **Files**: `components/feed/social-feed.tsx`, `app/teen/quests/quests-hub-client.tsx`, `app/teen/friends/friends-client.tsx`, `app/teen/leaderboard/page.tsx`, `app/marketplace/page.tsx`
- **Acceptance**: List items wrapped with `<motion.div layout layoutId={item.id}>` inside `<AnimatePresence>`. Add/remove animates; reorder is smooth.
- **Effort**: M
- **Dependencies**: TICKET-023

### TICKET-027 [animations] Standard easing tokens (`EASE.*`) exported from one place
- **Specialist profile**: motion architect
- **Priority**: P2
- **Files**: new `lib/motion/easing.ts`
- **Acceptance**: Exports `EASE.smooth`, `EASE.snappy`, `EASE.bouncy`, `EASE.dramatic`, `SPRING.snappy`, `SPRING.bouncy`. Codemod 4 currently-duplicated easing definitions across `page-transition.tsx`, `page-transition-provider.tsx`, etc.
- **Effort**: S

### TICKET-028 [animations] Modal enter/exit on mobile → bottom-sheet morph
- **Specialist profile**: motion designer
- **Priority**: P1
- **Files**: `components/ui/dialog.tsx`, new `components/ui/responsive-modal.tsx`
- **Acceptance**: `<ResponsiveModal>` switches at `(max-width: 640px)` to bottom-sheet morph; backdrop blur consistent.
- **Effort**: M
- **Dependencies**: TICKET-042

### TICKET-029 [animations] Generate `loading.tsx` for every role route
- **Specialist profile**: perf engineer + motion designer
- **Priority**: P0
- **Files**: ~190 new `loading.tsx` files under `app/teen/**`, `app/parent/**`, `app/partner/**`, `app/admin/**`
- **Acceptance**: 100 % `loading.tsx` coverage. Each composes a `<PageSkeleton kind="...">` matching the route's content shape.
- **Effort**: L
- **Dependencies**: TICKET-005

### TICKET-030 [animations] Confetti / celebration overlay refactor
- **Specialist profile**: motion designer
- **Priority**: P2
- **Files**: `components/ui/effects/confetti.tsx`, `components/gamification/celebration-overlay.tsx`
- **Acceptance**: Single `<Celebrate trigger="quest|friend|savings|order|levelup">` API. Honours reduced-motion (no particle burst, just an icon pop). Body-scroll-lock during celebration.
- **Effort**: M

---

## Domain: perceived-perf (6 tickets)

### TICKET-031 [perceived-perf] `useOptimistic` adoption — 8 mutations
- **Specialist profile**: perf engineer
- **Priority**: P0
- **Files**: feed like, friend-request accept/decline, follow/unfollow, chore-complete, savings-deposit, cart-add, mentor-session-book, food-order-place
- **Acceptance**: Each mutation renders the next state immediately, rolls back on error with toast. Patterns reuse `useOptimisticRunner`.
- **Effort**: L

### TICKET-032 [perceived-perf] Skeleton fidelity — bespoke per route family
- **Specialist profile**: design-system architect
- **Priority**: P1
- **Files**: skeletons for mentor list, food list, marketplace, leaderboard, feed, friends, internships
- **Acceptance**: Each `loading.tsx` renders a skeleton that matches the rendered grid/list pixel-for-pixel (heading bar, filter strip, n cards in known grid).
- **Effort**: M
- **Dependencies**: TICKET-005, TICKET-029

### TICKET-033 [perceived-perf] LCP image audit + `priority` placement
- **Specialist profile**: perf engineer
- **Priority**: P1
- **Files**: hero images on `/teen`, `/parent`, `/partner`, `/marketplace`, `/agenda`, `/clubs/[slug]`
- **Acceptance**: Each route's LCP image identified via Web Vitals dump; `priority` + correct `sizes` attribute set; blur placeholder where source supports.
- **Effort**: M

### TICKET-034 [perceived-perf] Lazy-load below-fold heavy components
- **Specialist profile**: perf engineer
- **Priority**: P1
- **Files**: charts (`components/analytics-chart.tsx`), leaderboards, maps (`app/parent/rides/[id]/ride-map.tsx`), evolution-tree
- **Acceptance**: Each heavy component dynamic-imported with a skeleton fallback. Bundle reports prove split.
- **Effort**: M

### TICKET-035 [perceived-perf] React Suspense boundaries for streaming
- **Specialist profile**: perf engineer
- **Priority**: P2
- **Files**: `app/teen/page.tsx`, `app/parent/page.tsx`, `app/partner/dashboard/page.tsx`
- **Acceptance**: Each role dashboard streams its independent panels (financial, control-center, insights, etc.) with discrete Suspense + skeleton.
- **Effort**: M

### TICKET-036 [perceived-perf] CLS audit — reserve space for async content
- **Specialist profile**: perf engineer
- **Priority**: P0
- **Files**: any surface with avatar / count / dynamic pill rendered after data arrives
- **Acceptance**: Lighthouse CLS = 0 on `/teen`, `/parent`, `/partner`, `/marketplace`, `/agenda`. Skeletons reserve fixed dimensions; dynamic numbers use `tabular-nums` + min-width.
- **Effort**: M

---

## Domain: mobile-gestures (5 tickets)

### TICKET-037 [mobile-gestures] PullToRefresh on every list surface
- **Specialist profile**: mobile UX engineer
- **Priority**: P0
- **Files**: quests, feed, notifications, marketplace, mentors, food, rides, friends, leaderboard, messages
- **Acceptance**: 10 surfaces wrapped in `<PullToRefresh onRefresh={...}>`. PWA-only (disabled on desktop).
- **Effort**: M

### TICKET-038 [mobile-gestures] Swipe-to-dismiss on notifications + friend requests + suggestions
- **Specialist profile**: mobile UX engineer
- **Priority**: P1
- **Files**: `components/notifications/notification-center.tsx`, `app/teen/friends/friends-client.tsx`
- **Acceptance**: Each item wrapped in `<SwipeableCard>` with right-swipe = dismiss, left-swipe = accept (friend req only). Reduced-motion uses buttons instead.
- **Effort**: M

### TICKET-039 [mobile-gestures] Long-press context menu on feed posts, friends, messages
- **Specialist profile**: mobile UX engineer
- **Priority**: P1
- **Files**: `components/feed/social-feed.tsx`, `app/teen/friends/friends-client.tsx`, `app/teen/messages/messages-client.tsx`
- **Acceptance**: 600 ms hold on item opens `<LongPressMenu>` with copy/report/block/share (feed), mute/unfriend (friends), delete/react (messages). Haptic on activate.
- **Effort**: M

### TICKET-040 [mobile-gestures] Keyboard-aware form scrolling
- **Specialist profile**: mobile UX engineer
- **Priority**: P0
- **Files**: new `lib/hooks/use-keyboard-aware.ts`, applied to chore-form, allowance-form, mentor-session-form, ride-request, food-order-checkout, signup, parent-add-teen
- **Acceptance**: On focus, scroll input into the visible viewport above the on-screen keyboard. iOS + Android tested.
- **Effort**: M

### TICKET-041 [mobile-gestures] Safe-area audit
- **Specialist profile**: mobile UX engineer
- **Priority**: P1
- **Files**: lint rule in `eslint.config.*`; fixes in identified offenders
- **Acceptance**: ESLint rule flags any `fixed bottom-0|inset-0` without `pb-[env(safe-area-inset-bottom)]` or `pt-[env(safe-area-inset-top)]`. Existing offenders fixed.
- **Effort**: S

---

## Domain: forms (4 tickets)

### TICKET-042 [forms] Migrate all forms to react-hook-form + zod
- **Specialist profile**: form architect
- **Priority**: P0
- **Files**: `components/parent/chore-form.tsx`, `components/parent/allowance-form.tsx`, `components/parent/mentor-session-form.tsx`, `app/teen/savings/new/savings-form.tsx`, `app/teen/rides/request/`, `app/partner/offers/new/`, ~12 forms
- **Acceptance**: Each form uses `useForm` + `zodResolver`. Field-level inline validation on blur. Submit button shows loading + success state via `<PremiumButton>`. First field auto-focused.
- **Effort**: L
- **Dependencies**: TICKET-004, TICKET-020

### TICKET-043 [forms] Inline error + scroll-to-first-error pattern
- **Specialist profile**: form architect
- **Priority**: P1
- **Files**: `components/ui/field.tsx`, `lib/forms/scroll-to-error.ts`
- **Acceptance**: On submit failure, page scrolls to first invalid field, focuses it, screen-reader announces error count.
- **Effort**: S
- **Dependencies**: TICKET-042

### TICKET-044 [forms] Autocomplete (city, school) + datalist
- **Specialist profile**: form architect
- **Priority**: P2
- **Files**: signup, profile-edit, chore-form (location field), ride-request
- **Acceptance**: City field uses `<datalist>` with seeded Moroccan cities; school field reads from `schools` table where available; `autocomplete=street-address|email|tel-national` correctly set on every relevant input.
- **Effort**: M

### TICKET-045 [forms] CSRF + rate-limit feedback in form UI
- **Specialist profile**: form architect
- **Priority**: P1
- **Files**: `components/ui/forms/secure-form.tsx`
- **Acceptance**: 429 / CSRF errors render a friendly inline banner ("Trop de tentatives, réessaie dans X s") instead of a generic toast.
- **Effort**: S

---

## Domain: modals/dialogs (3 tickets)

### TICKET-046 [modals] `<ResponsiveModal>` switcher
- **Specialist profile**: design-system architect
- **Priority**: P0
- **Files**: new `components/ui/responsive-modal.tsx`; refactor ~25 Dialog consumers
- **Acceptance**: `<ResponsiveModal>` exposes Radix Dialog API; switches to BottomSheet at `< sm`. Body-scroll-locked, backdrop-blur consistent (`bg-background/60 backdrop-blur-md`).
- **Effort**: M
- **Dependencies**: TICKET-028

### TICKET-047 [modals] Restore visible focus on Dialog close button
- **Specialist profile**: a11y specialist
- **Priority**: P0
- **Files**: `components/ui/dialog.tsx:72`
- **Acceptance**: `focus-visible:outline-hidden` removed; replaced with `focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2`.
- **Effort**: S

### TICKET-048 [modals] Pilot native `[popover]` API for simple menus
- **Specialist profile**: 2026-API specialist
- **Priority**: P2
- **Files**: 3 simple dropdowns (e.g. user-menu, share-menu, kebab on feed post)
- **Acceptance**: Replace Radix Popover with native `popover=auto` + `popovertarget`. Bundle reduction reported.
- **Effort**: M

---

## Domain: a11y-fluidity (2 tickets)

### TICKET-049 [a11y] Skip-to-content + heading hierarchy enforcement
- **Specialist profile**: a11y specialist
- **Priority**: P0
- **Files**: every role `layout.tsx` (`app/teen/layout.tsx`, `app/parent/layout.tsx`, `app/partner/layout.tsx`, `app/admin/layout.tsx`); lint rule
- **Acceptance**: `<SkipLinks />` mounted in every role layout. Lint rule rejects styling-only headings (`<div className="text-sm font-bold">` where an `<h2>` is contextually expected).
- **Effort**: S

### TICKET-050 [a11y] Live regions for celebrations + status changes
- **Specialist profile**: a11y specialist
- **Priority**: P1
- **Files**: `components/gamification/level-up-modal.tsx`, `components/ui/effects/confetti.tsx`, status timelines (food, ride)
- **Acceptance**: Each celebration / status change emits an `aria-live="polite"` announcement. Reduced-motion users get the announcement and a static success card; no particles.
- **Effort**: S
