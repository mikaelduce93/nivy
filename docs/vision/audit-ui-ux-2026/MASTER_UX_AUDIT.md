# Nivy — UX/UI 2026 master audit

> Audit window: 2026-05-08. Scope: ~214 route files (`app/**/page.tsx`), ~345 components (`components/**/*.tsx`), the Tailwind v4 token layer in `app/globals.css`, and the `framer-motion`/Radix primitive surface. **Read-only**: this document and its two siblings (`TICKETS.md`, `EXECUTION_PLAN.md`) are the only writes.

---

## Verdict

**AMBER — ~62 % to 2026 launch standards.**

Nivy ships an unusually rich primitive shelf — a thoughtful design-token CSS file (`app/globals.css`, 1756 lines), a custom `PullToRefresh`, a bottom-sheet, a long-press menu, a swipeable card, a `MorphingSkeleton`, a `useOptimisticRunner`, a `useReducedMotion` hook, a celebration overlay, a `PageTransitionProvider`, and a `PremiumButton` with ripple/glow/success choreography. The teen flagship surfaces (`/teen`, `/teen/quests/[id]`, `/teen/profile`, `/teen/wallet`, the dashboard hero, the `MobileDock`) are very close to the bar. The problem is **distribution**: only ~14 % of the surfaces that animate respect reduced-motion, native View Transitions are not used at all, container queries appear in 2 components, `color-mix()` and `:has()` and the popover API are absent, only one production surface uses React 19 `useOptimistic`, and the entire **Wave 3** (food / rides / mentors / pathways / internships / admin sub-modules) was shipped server-rendered with raw `bg-blue-600`/`bg-gray-200` Tailwind utilities, `text-2xl font-bold` headings, and zero motion or skeleton coverage. The result is a two-tier app: the teen home feels 2026, the food order tracker feels 2018.

To clear the bar, the work is mostly **propagation, not invention**: the patterns exist; specialist agents need to apply them across the surfaces that bypass them and to upgrade the foundation library to native 2026 APIs.

---

## Reference benchmarks

The bar is set by **Linear** (microinteractions, perceived perf, command-K elegance), **Arc browser** (gesture-first nav, layered animations, restraint), **Pinterest mobile** (skeletons that match content silhouette to the pixel), **Threads** (transitions, optimistic UI, reply-thread morph), **Vercel.com** (typographic rigor, spacing math, monochrome-first surfaces), and **Apple Wallet** (skeuomorphic glass layered over money — focus on the asset). Nivy is teen-facing, which means the bar is *higher* than B2B SaaS: teens have grown up with TikTok, Snapchat, Spotify, and Robinhood — they expect haptic-equivalent feedback on every tap, smooth list reorders, sub-200 ms perceived latency, and pages that "feel alive" without ever breaking. Anything that loads with a generic gray spinner, jumps when content arrives, or animates a banner without a 60 fps spring will be read as "low-effort" and erode trust.

---

## Per-dimension findings

### 1. Visual consistency — score **68 / 100**

**Top violations**
- **Wave 3 surfaces bypass the design system entirely.** `app/teen/food/order/[id]/page.tsx:55–60` uses raw `bg-blue-600 text-white` and `bg-gray-200 text-gray-500` for the status timeline. `app/partner/restaurant/orders/page.tsx:35` uses `text-gray-600`. `app/teen/feed/page.tsx:53–60` has `text-blue-600 hover:underline` and `bg-blue-600 px-3 py-1`. These should be `bg-primary` / `text-muted-foreground` / `Button` primitives.
- **Headings are inconsistent across roles.** Teen-side surfaces standardised on `text-4xl font-black tracking-tighter italic` (e.g. `app/teen/rides/page.tsx:54`). Parent-side uses `text-3xl font-black` + emoji-sized icon (`app/parent/chores/new/page.tsx:37–40`). Admin uses `text-2xl font-bold` (`app/admin/drivers/page.tsx:48`). The same product across three roles wears three different typographic suits.
- **Raw color tokens still leak post-Polish-B.** Grep counts **190 occurrences across 50 files** of `cyan-500|emerald-400|gen-z-*` literals (target: 0). Worst offenders: `gamification-system/components/crews/create-crew-modal.tsx` (13), `components/circles/circles-list.tsx` (9), `components/education/grades.tsx` (9), `components/ui/gen-z-effects.tsx` (12 — internal but the *name* leaks the palette).
- **Magic spacing.** **235 occurrences across 100 files** of arbitrary px tokens (`px-[Npx]`). Worst: `components/teen/twin-currency-gauge.tsx` (14), `app/teen/internships/page.tsx` (11), `components/feed/social-feed.tsx` (6).
- **Inline styles.** **454 occurrences across 120 files** of `style={{...}}`. Some are legitimate (dynamic gradients in `mobile-dock.tsx`), but most are static and should be Tailwind classes — e.g. `components/ui/effects/elite-3d-card.tsx` (22), `components/teen/dashboard/hero.tsx` (22), `components/ui/effects/animated-border.tsx` (15).

**Strongest exemplars (replicate these)**
- `app/teen/rides/page.tsx` — clean tokens, italic h1, `bg-gradient-to-br from-info-soft to-success-soft` icon chip.
- `app/teen/page.tsx` + `home-dashboard-client.tsx` — `text-gen-z-gradient` heading, `bg-brand-soft/10 border border-brand-soft/20` chips, all radius-rhythm respected (`rounded-xl`, `rounded-2xl`, `rounded-3xl`).
- `components/ui/button.tsx` — variant CVA covers 11 variants, 7 sizes, all use semantic `var(--*-soft)` tokens, all sizes meet 44 px touch.
- `components/ui/skeleton.tsx` — 50-line single source of truth, theme-aware, with a docstring that *names* every wrapper that may legally exist.
- `components/layouts/mobile-dock.tsx` — semantic `nav`, `aria-current`, safe-area inset, motion-respecting active dot.

**Recommended fix patterns**
1. Codemod: ban raw color literals from `app/teen/**`, `app/parent/**`, `app/partner/**`, `app/admin/**` via ESLint `no-restricted-syntax` (regex `(cyan|emerald|sky|rose|amber|fuchsia)-(\d+)`) → fail CI.
2. Per-role headings: extract `<TeenH1>`, `<ParentH1>`, `<AdminH1>`, `<PartnerH1>` server components from `components/ui/page-header.tsx` (already exists but underused — only 11 imports).
3. Wave-3 sweep: 18 routes need a 1-hour token swap. Listed in `TICKETS.md` TICKET-002.

### 2. Microinteractions — score **71 / 100**

**Top violations**
- The default `Button` (`components/ui/button.tsx:13–131`) has hover-lift + active-press + focus-ring + colored shadow on every variant — **but the form fields, switches, tabs, and chips do not.** `components/ui/input.tsx` is 38 lines, `h-9` (below 44 px touch), no error-shake, no success-checkmark, no inline validation hook.
- `components/ui/dialog.tsx:62–66` uses `data-[state=open]:animate-in data-[state=open]:zoom-in-95` — fine for desktop but no spring damping, no mobile bottom-sheet morph, and `focus-visible:outline-hidden` on the close button (line 72) breaks visible focus.
- The `Select`, `RadioGroup`, `Switch` and `Checkbox` Radix wrappers are vanilla shadcn — no spring motion, no haptic placeholder, no juice integration. `components/ui/switch.tsx` does have `motion` import but only a thumb translate, no overshoot spring.
- The notification bell has no shake-on-new. Search for `BellRing` reveals the icon is wired to `unread > 0` boolean only — no `motion.div` on the badge with key bumping.
- Tab indicator: `components/ui/tabs.tsx` (Radix) — no sliding pill underline, no `layoutId` shared element. Compare to `components/teen/hub-tabs.tsx` (which **does** have a pill — but only used in 2 surfaces).

**Strongest exemplars**
- `components/ui/button.tsx` — gold standard.
- `components/teen/hub-tabs.tsx` — sliding pill via `layoutId="tab-pill"`. Should be the default.
- `components/ui/swipeable-card.tsx` — gesture-driven dismiss with spring snap-back.
- `components/teen/dashboard/quick-access-grid.tsx` — `whileHover={{ scale: 1.05, y: -4 }}, whileTap={{ scale: 0.95 }}` — exactly the right "candy" feel.
- `components/ui/effects/confetti.tsx` — physics confetti on quest complete (only used by the level-up modal — should also fire on chore approval, friend accepted, savings goal reached).

**Recommended fix patterns**
- Promote `Input` to `h-11` default + add `data-state=invalid` shake animation + add `<Field>` wrapper that owns label, error, success-icon, helper text in 1 component.
- Wrap `RadioGroupItem`, `Checkbox`, `Switch` in motion primitives that pull from `lib/hooks/use-juice` for a tap haptic placeholder + sound on toggle.
- Extract `<AnimatedTabs>` from `hub-tabs.tsx` into `components/ui/tabs-animated.tsx` and route `Tabs` consumers through it.

### 3. Animations & transitions — score **44 / 100**

**Top violations — this is the largest gap.**
- **Zero usage of View Transitions API** (`startViewTransition`). Search returns 0 files. Next.js 15 ships first-class support via `unstable_ViewTransition` — not adopted.
- **`framer-motion` used in 100+ files; only 17 respect reduced-motion** (`prefers-reduced-motion` or the `useReducedMotion` hook). That's a 14 % compliance rate. Examples that ignore it: `components/feed/social-feed.tsx`, `components/notifications/notification-center.tsx`, `app/teen/circles/circles-client.tsx`, `app/teen/quests/quests-hub-client.tsx`, `components/gamification/celebration-overlay.tsx`, `components/gamification/level-up-modal.tsx`.
- **List add/remove is not FLIP/layout-animated** in feeds and quest lists. `components/feed/social-feed.tsx` re-renders the array — no `<motion.div layout>` wrapper, no `AnimatePresence` for removed posts.
- **Modal enter/exit lacks bottom-sheet morph on mobile.** `components/ui/dialog.tsx` always centers and zooms, even on a 375 px viewport where a bottom-sheet pattern is the 2026 default.
- **Skeleton → content uses opacity fade only** (`MorphingSkeleton` exists in `components/layouts/page-transition.tsx:316–363` and is *good* — 0.3 s blur-out, 0.4 s blur-in — but is not adopted; only ~3 imports.) Most surfaces hard-swap.

**Strongest exemplars**
- `components/layouts/page-transition.tsx:316` `MorphingSkeleton` — the right pattern.
- `components/gamification/celebration-overlay.tsx` — confetti + sound + scale spring on level up.
- `components/ui/swipeable-card.tsx` — physics with reduced-motion fallback.
- `components/ui/pull-to-refresh.tsx:14` — explicitly honours `prefers-reduced-motion`.

**Recommended fix patterns**
- Wrap all `motion.*` consumers in a project-internal `<Motion>` primitive that calls `useReducedMotion()` once and short-circuits `animate` props to `false` if reduced. ~25-line file. Codemod replaces `motion.div` → `Motion.div` across ~100 files.
- Adopt View Transitions API in `app/layout.tsx` for cross-route nav (Next 15.x supports `unstable_ViewTransition`). Specifically: feed → post detail, mentor list → mentor detail, marketplace listing → detail.
- Replace `Dialog` on mobile breakpoints with `BottomSheet` via a `<ResponsiveModal>` wrapper that switches at the `sm` breakpoint.
- Adopt `MorphingSkeleton` in every `loading.tsx`.

### 4. Perceived performance — score **58 / 100**

**Top violations**
- **`loading.tsx` coverage: 22 / 214 routes (~10 %).** The other 90 % fall back to React Suspense's silent gap or render server-side and stream — fine for slow networks, but on first paint the user sees blank.
- **Skeleton fidelity is generic.** `components/ui/skeleton.tsx` is a single rectangle. The dashboard skeletons (`components/ui/skeletons/dashboard-skeletons.tsx`) match shape *for the teen dashboard* but no other surface has bespoke skeletons (mentor list, food list, marketplace, leaderboard, feed all hit generic).
- **`useOptimistic` (React 19) used in exactly 1 production surface** (`app/teen/quests/[id]/quest-detail-client.tsx:142`). The custom `useOptimisticRunner` wraps it but is also adopted only in the quest detail. Likes / follows / chore-complete / quest-complete / cart-add / friend-request all wait for server round-trip.
- **`<img>` (raw) in 6 files** — should be `next/image`. Examples: `app/teen/feed/[id]/page.tsx`, `components/teen/evidence-upload.tsx`, `app/marketplace/page.tsx`, `app/marketplace/listings/[id]/page.tsx`.
- **No LCP element identification.** Hero images / hero counters never have `priority` set on `next/image`. The teen dashboard `TwinCurrencyGauge` (the LCP candidate at first paint) uses div + numbers — fine — but the `TeenIDCard` background ships full size always.

**Strongest exemplars**
- `components/teen/dashboard/teen-dashboard-content.tsx` uses `PullToRefresh` and React Query for cached re-fetches.
- `app/teen/quests/[id]/quest-detail-client.tsx` — the only surface with full optimistic complete + rollback on error.
- `lib/hooks/use-optimistic-mutation.ts` — solid wrapper, just under-adopted.

**Recommended fix patterns**
- Generate `loading.tsx` for every route under `app/teen/**`, `app/parent/**`, `app/partner/**`, `app/admin/**` from a `page-skeleton-of-shape` codemod. Target: 100 % coverage in 2 hours of agent work.
- Build a `<Skeleton.Card>`, `<Skeleton.ListRow>`, `<Skeleton.Avatar>`, `<Skeleton.Heading>`, `<Skeleton.Stat>` set under `components/ui/skeletons/atoms.tsx` and recompose every existing `Skeleton.*` from atoms.
- Migrate likes (feed), friend-request accept/decline, follow/unfollow, chore-complete, savings-deposit, cart-add to `useOptimistic`.

### 5. Mobile gestures + feedback — score **52 / 100**

**Top violations**
- `PullToRefresh` exists and is good, but is used in **3 surfaces** (`teen-dashboard-content.tsx`, `swipeable-card.tsx` references, `pull-to-refresh.tsx` itself). Should be on every list (quests, feed, notifications, marketplace, mentors, food, rides, friends, leaderboard). Currently 0 of those have it.
- `SwipeableCard` is used in 1 surface. Notification swipe-to-dismiss, friend-request swipe-to-accept-or-decline, suggestion swipe-to-skip — none use it.
- `LongPressMenu` is used in 1 surface (the social feed). Should be the standard for feed posts (copy / report / block / share), friends (mute / unfriend), messages (delete / react).
- **Safe-area handling**: `mobile-dock.tsx` does it (`pb-[calc(0.75rem+env(safe-area-inset-bottom))]`), but several full-screen overlays don't (`app/offline/page.tsx`, several modal sheets). Risk of being cut by the home indicator on iOS notched devices.
- **No haptic placeholder calls outside `useJuice`.** `useJuice` itself is wired in `Button` (opt-in via the `juice` prop). Means buttons that don't pass `juice` give no tap feedback.

**Strongest exemplars**
- `components/ui/pull-to-refresh.tsx` — model implementation with reduced-motion respect.
- `components/ui/swipeable-card.tsx` — physics + threshold logic correct.
- `components/ui/bottom-sheet.tsx` — iOS-style with handle.

**Recommended fix patterns**
- A `<List>` component that wraps any list rendering and accepts `onRefresh`, `swipeActions`, `longPressMenu` as opt-in props. Apply to ~12 list surfaces.
- Default `juice` to `'tap'` on `Button` for `variant !== 'link'`.
- Audit every `fixed` + `bottom-0` for safe-area. Lint rule.

### 6. Forms — score **55 / 100**

**Top violations**
- **No inline validation in shared forms.** `components/parent/chore-form.tsx:60–80` validates only on submit (`if (!title.trim()) toast.error(...)`). Same pattern in `components/parent/allowance-form.tsx`, `components/parent/mentor-session-form.tsx`. Should be field-level on blur.
- **Loading state is button-disabled, not button-spinner.** The `Button` *has* a spinner via `PremiumButton` but `chore-form.tsx:80` uses `<Button disabled={loading}>` not `<PremiumButton loading={loading}>`. Pattern repeats across all forms.
- **No auto-focus first field.** No form in `components/parent/*` calls `inputRef.current?.focus()` on mount.
- **No keyboard handling on mobile** — fields can be hidden by the on-screen keyboard. `useKeyboardAwareScroll` does not exist. The chore form footer has the submit button — on a 667 px iPhone SE viewport, the keyboard covers it.
- **Error messages are toast-only** (`toast.error(...)`). Better practice: inline under the field + summary at top + scroll-into-view of first error.

**Strongest exemplars**
- `components/ui/forms/secure-form.tsx` — wraps CSRF correctly, has loading state.
- `components/onboarding/teen-setup-step.tsx` — auto-advances on validation success, smooth motion.
- `components/parent/parent-setup-step.tsx` — uses `useReducedMotion` + sensible defaults.

**Recommended fix patterns**
- Adopt `react-hook-form` + `zod` resolver across all parent/teen/partner forms. Build `<FormField>` primitive with built-in error/success/loading.
- Add `useKeyboardAware` hook + `KeyboardAwareScrollView`-equivalent wrapper for mobile.
- Replace `toast.error` for validation with inline + `aria-live="polite"`.

### 7. Modals / dialogs / drawers — score **63 / 100**

**Top violations**
- One desktop pattern (`Dialog`) is used everywhere; bottom-sheet pattern exists (`components/ui/bottom-sheet.tsx`) but is only used in one place. No `<ResponsiveModal>` switcher.
- `Dialog` close button uses `focus:outline-hidden` (`components/ui/dialog.tsx:72`) — actually breaks visible focus on keyboard nav.
- No native `<dialog>` element adoption (HTML5 popover/dialog with backdrop is the 2026 default for non-routed sheets).
- Backdrop blur is inconsistent — `bg-black/50` (Dialog) vs `backdrop-blur-xl` (Drawer) vs `bg-black/80 backdrop-blur-md` (custom modals in `level-up-modal.tsx`).
- Body scroll lock not centralized — Radix does it, but custom overlays (e.g. `celebration-overlay.tsx`) don't.

**Strongest exemplars**
- `components/ui/bottom-sheet.tsx` — handle, snap-points, backdrop-blur.
- `components/ui/sheet.tsx` (Radix) — focus trap correct.

**Recommended fix patterns**
- `<ResponsiveModal>` switcher (mobile → BottomSheet, desktop → Dialog).
- Standardize backdrop on `bg-background/60 backdrop-blur-md`.
- Re-enable `focus-visible:outline` on Dialog close.

### 8. Empty / loading / error states — score **66 / 100**

**Top violations**
- The `EmptyState` primitive (`components/ui/states/empty-state.tsx`) is excellent — illustration + glow + CTA — but it's used in maybe ~15 surfaces. Most empty states are still inline `<p className="text-muted-foreground">Aucun élément</p>`.
- `error.tsx` exists at 13 routes (out of 214). When a server component throws inside `app/teen/food/page.tsx`, the user sees the framework-default error (or the route's nearest ancestor `error.tsx`, which may be the very generic `app/error.tsx`).
- Loading skeletons don't match shape on most surfaces (see §4).
- No explicit offline state on data-heavy reads. `app/offline/page.tsx` exists but only fires for full-page offline; no per-component "you're offline, showing cached data" hint.

**Strongest exemplars**
- `components/ui/states/empty-state.tsx` — gold standard.
- `app/teen/error.tsx` — branded, friendly copy, retry + home.
- `components/ui/states/offline-indicator.tsx` exists — needs propagation.

**Recommended fix patterns**
- Make `EmptyState` mandatory via lint: any `if (items.length === 0)` followed by `return <p>` should be flagged.
- Auto-generate `error.tsx` at every segment level via codemod.

### 9. A11y fluidity — score **70 / 100**

**Top violations**
- `motion.*` without reduced-motion → animates regardless of OS preference (see §3). 86 % of motion files.
- `components/ui/dialog.tsx:72` `focus:outline-hidden` — close button has no visible focus ring.
- Skip-to-content link exists (`components/ui/accessibility/skip-links.tsx`) but is mounted in **1 layout** — should be in every role layout.
- Live regions for toasts: `sonner` provides them, but level-up modal (`components/gamification/level-up-modal.tsx`) does not announce.
- Color-only indicators: `app/teen/food/order/[id]/page.tsx:55` distinguishes status by color only (`bg-blue-600` vs `bg-gray-200`) — needs an icon or text label.
- Heading hierarchy: server pages start at `h1`, but `home-dashboard-client.tsx` then puts the next heading at `text-sm font-bold` *without* an `h2` element (line 92) — only styled.

**Strongest exemplars**
- `components/layouts/mobile-dock.tsx` — `aria-label`, `aria-current`, `role="navigation"`.
- `components/ui/accessibility/focus-trap.tsx` — correct.
- `components/ui/pull-to-refresh.tsx` — reduced-motion respected.

**Recommended fix patterns**
- Codemod motion → `Motion` (project-internal) wrapper.
- Lint rule: `outline-hidden` only allowed if paired with `outline-[ring]` replacement.
- Mount skip-link in every role layout.
- Replace status-color-only with `<StatusBadge icon=... label=... color=...>`.

### 10. 2026-grade native APIs — score **18 / 100** ← **biggest gap**

**Top violations**
- **View Transitions API: 0 usage.** Next 15 supports `unstable_ViewTransition`. Cross-route morph is a 2026 default.
- **CSS container queries (`@container`, `cqi`, `cqw`): 2 files** (`components/ui/card.tsx`, `components/ui/field.tsx`) — barely.
- **`color-mix()`: 0 files.** Useful for theming brand-soft × hover state without 12 token explosions.
- **`:has()`: 0 files.** Useful for `form:has(:invalid)`, `card:has(img)` adaptive styling.
- **Native popover API (`popover=` / `[popovertarget]`): 0 files.** All popovers are Radix.
- **Subgrid: 0 files.**
- **Anchor positioning: 0 files.**

**Strongest exemplars (zero — this is greenfield)**

**Recommended fix patterns**
- Pilot View Transitions on the highest-traffic morph: `/teen` → `/teen/quests/[id]`, `/teen/social` ↔ `/teen/messages`.
- Pilot container queries on `BentoCard`, `Stat`, `EventCard` — they're rendered at multiple grid widths.
- Pilot `color-mix()` in `app/globals.css` for hover variants of `--brand-soft`, `--accent-soft`.
- Pilot `:has()` for form-level error styling and avatar-card image-presence styling.
- Pilot native `popover` for menus where Radix's portal is overkill (1-item dropdown, simple tooltip).

---

## Top 20 worst-offender pages

| Rank | Page | Score | Top 3 issues |
|------|------|-------|--------------|
| 1 | `app/teen/food/order/[id]/page.tsx` | 22 | raw `bg-blue-600` timeline, no skeleton, color-only status |
| 2 | `app/teen/feed/page.tsx` | 28 | raw `text-blue-600`, no list animation, `<img>` raw, no PTR |
| 3 | `app/partner/restaurant/orders/page.tsx` | 30 | `text-gray-600`, `text-2xl font-bold` heading, no real-time UX |
| 4 | `app/admin/drivers/page.tsx` | 32 | shadcn-default tokens, no skeleton, `text-2xl font-bold` |
| 5 | `app/admin/internships/page.tsx` | 34 | inline form, no validation, no skeleton |
| 6 | `app/teen/internships/page.tsx` | 36 | 11 magic px tokens, raw color chips |
| 7 | `app/teen/mentors/page.tsx` | 38 | server-rendered list with no PTR, no FLIP, no skeleton |
| 8 | `app/teen/pathways/page.tsx` | 40 | 6 inline styles, no transition, no empty state polish |
| 9 | `app/teen/mentors/[id]/page.tsx` | 41 | hero card has no shared-element transition |
| 10 | `app/parent/chores/new/page.tsx` | 42 | emerald-400 raw, form validation toast-only |
| 11 | `app/marketplace/page.tsx` | 43 | 8 raw color literals, raw `<img>` |
| 12 | `app/admin/marketplace/page.tsx` | 44 | 3 raw colors, no batch-action UX |
| 13 | `app/teen/leaderboard/page.tsx` | 45 | 5 raw colors, no filter sticky, no skeleton |
| 14 | `app/parent/budget/page.tsx` | 46 | inline styles, chart not lazy-loaded |
| 15 | `app/admin/creator-moderation/page.tsx` | 46 | 5 raw colors, no row-action animation |
| 16 | `app/teen/share/page.tsx` | 48 | mixed tokens, no copy-feedback animation |
| 17 | `app/teen/academic/academic-client.tsx` | 49 | 10 raw colors, dense |
| 18 | `app/teen/settings/settings-client.tsx` | 50 | 3 raw colors, switches lack motion |
| 19 | `app/parent/teens/page.tsx` | 50 | mixed h-styles, no card hover |
| 20 | `app/admin/content/page.tsx` | 52 | dense table, no row hover, no skeleton |

---

## Top 10 strongest pages (replicate-from list)

| Rank | Page | Score | What makes it great |
|------|------|-------|----------------------|
| 1 | `app/teen/page.tsx` + `home-dashboard-client.tsx` | 86 | Twin-currency gauge, branded gradient, motion + token discipline |
| 2 | `app/teen/quests/[id]/quest-detail-client.tsx` | 84 | Only surface with `useOptimistic`, full optimistic complete + rollback |
| 3 | `app/teen/wallet/wallet-hub-client.tsx` | 82 | Tab pills with `layoutId`, smooth shifts |
| 4 | `app/teen/profile/profile-hub-client.tsx` | 80 | Hero + ID card + tabs, all consistent |
| 5 | `app/teen/quiz/[id]/quiz-runner-client.tsx` | 79 | Question→answer transitions, celebration on complete |
| 6 | `app/onboarding/page.tsx` | 78 | Multi-step with reduced-motion respect |
| 7 | `app/teen/error.tsx` | 76 | Friendly, branded, retry CTA |
| 8 | `app/teen/streak/streak-client.tsx` | 75 | Flame motion, milestone reveal |
| 9 | `app/teen/vip-card/vip-card-client.tsx` | 74 | Apple-Wallet-grade card, glass, scroll snap |
| 10 | `components/layouts/mobile-dock.tsx` | 73 | Per-zone palette, badge pop, active dot, semantic nav |

---

## Cross-cutting systemic issues

### Design system gaps (post-Polish-B Day 3-5 work)
- No `<Field>` primitive owning label + input + error + success.
- No `<ResponsiveModal>` (BottomSheet ↔ Dialog switcher).
- No `<List>` primitive with `onRefresh / swipeActions / longPressMenu`.
- No `<StatusBadge>` (color + icon + label, never color-only).
- No `<H1Teen>`, `<H1Parent>`, `<H1Admin>`, `<H1Partner>` — heading consistency unenforced.
- `<EmptyState>` exists but adoption ~15 % of empty cases.

### Animation library standardization
- Pick one: framer-motion (current). Build `<Motion.div>` thin wrapper that consults `useReducedMotion` once and short-circuits. Codemod 100 files.
- Adopt View Transitions API for cross-route morphs (Next 15 native).
- Standard transition curve: `[0.23, 1, 0.32, 1]` (already used in some places). Bake into a `EASE` token export.

### Form pattern unification
- Adopt `react-hook-form` + `zod`. ~12 forms to migrate.
- Build `<FormField>` with inline validation, success check, loading button-state.

### Modal pattern unification
- See above (`<ResponsiveModal>`).

### Skeleton library consolidation
- `Skeleton` primitive + `dashboard-skeletons` set + `skeleton-set` + `page-skeleton` + `skeleton-variants` — five entry points. Consolidate to **two**: atoms (`<Skeleton.Card />`, `<Skeleton.Avatar />`, ...) and presets (`<Skeleton.Page kind="dashboard|list|detail" />`).

### Empty state component library
- 1 component, ~15 usages — propagate to ~80 surfaces.

---

## 2026 native APIs adoption gap

| API | Today | Target | Impact |
|-----|-------|--------|--------|
| View Transitions API | 0 routes | top 20 cross-route morphs | feel-of-app uplift, single biggest perceived-quality win |
| CSS container queries | 2 components | all bento cards, stats, list rows | true component responsiveness, fewer media queries |
| `color-mix()` | 0 | hover/focus shades in tokens | token explosion avoided, theming simpler |
| `:has()` | 0 | form error styling, image-card adaptive | reduce JS state-driven classes |
| Native popover | 0 | replace 30 % of Radix popovers | smaller bundle, native a11y |
| Subgrid | 0 | event/quest grid alignment | pixel-perfect cross-row alignment |
| Anchor positioning | 0 | tooltip / dropdown positioning | drop ~5 KB of positioning JS |

---

## Estimated effort

| Dimension | Days (1 specialist) |
|-----------|---------------------|
| Visual consistency (codemod + Wave-3 sweep) | 6 |
| Microinteractions (Field/Switch/Tabs upgrade) | 5 |
| Animations (Motion wrapper, View Transitions, MorphingSkeleton adoption) | 8 |
| Perceived perf (loading.tsx coverage, optimistic, skeletons-of-shape, next/image) | 7 |
| Mobile gestures (PullToRefresh / Swipe / LongPress propagation) | 4 |
| Forms (RHF+zod migration, Field primitive, keyboard-aware) | 5 |
| Modals (ResponsiveModal, focus-ring restore) | 2 |
| Empty/loading/error (propagation + error.tsx codegen) | 3 |
| A11y fluidity | 3 |
| 2026 native APIs (pilot + propagate) | 6 |
| **Total (sequential)** | **49 days** |
| **Total (5-wave parallel dispatch with 50 specialists)** | **6–8 calendar days** |
