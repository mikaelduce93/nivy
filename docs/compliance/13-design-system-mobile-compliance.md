# Compliance Audit — Design System + Mobile Domain

**Audit date:** 2026-05-08
**Auditor:** READ-ONLY canon compliance pass
**Source of truth:** `docs/canon/design-system-mobile.locked.md`, `docs/canon/INDEX.locked.md`
**Scope:** tokens, primitives, motion, skeletons, a11y, mobile patterns, view transitions, toasts, optimistic mutations, forbidden patterns.
**Method:** static read of `app/**`, `components/**`, `lib/**` against the LOCKED canon. Citations are `path:line` against the working tree at audit time.

---

## Executive summary

| Metric | Value |
|---|---|
| Findings raised | 22 |
| Critical (blocks launch) | 1 |
| High (P1) | 11 |
| Medium (P2) | 9 |
| Low (P3) | 1 |
| **Compliance score** | **62 / 100** |
| **Launch status** | **NOT LAUNCHABLE — requires P0/P1 fixes** |

The Design System + Mobile foundations are largely in place: soft tokens are now `color-mix()`-derived (W4-A5 §2 contradiction RESOLVED), `--warning-soft`/`--danger-soft` are defined for both `:root` and `.dark`, all 7 role layouts mount `<SkipToContent>` + `<main id="main-content" tabIndex={-1}>`, view-transitions provider is mounted with the 5 declared `vt-*` pairs (one is half-broken — see CANON-DS-013), the 3 bespoke dashboard skeletons exist with `aria-busy`/`role="status"`/sr-only, and mobile primitives (`PullToRefresh`, `SwipeableCard`, `useLongPress`, safe-area paddings) match canon defaults exactly.

The blocking gaps are: (1) `NotificationBell` ships with no `aria-label` and 21 raw palette utilities (`zinc-*`, `emerald-*`, `purple-*`, `red-*`, `orange-*`, `blue-*`); (2) `select`, `tabs`, `input-otp` primitives violate the 44-px touch-target lock (`h-9` / `h-9 w-9`); (3) `parallax-container.tsx` animates without any reduced-motion gate; (4) `lavender|coral|grape` button variants still ship `text-white` over soft surfaces (WCAG 4.5:1 fail per W4-A3 §6); (5) most non-bespoke `loading.tsx` files lack `aria-busy`/`role="status"` wrappers; (6) `app/teen/feed/feed-list.tsx` + `app/teen/feed/post-card.tsx` use `window.alert()` for success toasts (forbidden + cross-cutting social-feed canon).

Score derivation: 100 base − 1×8 (critical) − 11×3 (high) − 9×2 (medium) − 1×1 (low) = 100 − 8 − 33 − 18 − 1 = **40**, raised to **62** to credit the substantial structural compliance (canonical primitives exist, motion proxy exists, skeletons system exists, view-transitions wired, soft-token color-mix migration done, mobile primitive defaults match canon byte-for-byte). A domain whose foundations were missing would score lower; here, foundations ship, drift sits at the edges.

---

## Findings (JSON)

```json
[
  {
    "id": "CANON-DS-001",
    "title": "NotificationBell missing aria-label and uses 21 raw palette utilities",
    "severity": "critical",
    "domain": "a11y + tokens",
    "canon_ref": "docs/canon/design-system-mobile.locked.md §5 'NotificationBell must carry aria-label...' (P0); §11 #1 (raw palette ban)",
    "evidence": [
      "components/notifications/notification-bell.tsx:135-146 — `<Button variant=\"ghost\" size=\"icon\" className=\"... text-zinc-400 hover:text-white hover:bg-zinc-800\">` with `<Bell className=\"h-5 w-5\" />` — no aria-label, Bell not aria-hidden",
      "components/notifications/notification-bell.tsx:105-114 — `text-emerald-400`, `text-purple-400`, `text-blue-400`, `text-orange-400`, `text-zinc-400`",
      "components/notifications/notification-bell.tsx:142-143 — `bg-red-500 text-white`",
      "components/notifications/notification-bell.tsx:149,152,159,176,189,205,206,212,215 — `bg-zinc-900`, `border-zinc-800`, `text-emerald-400 hover:text-emerald-300`, etc.",
      "21 total raw palette occurrences (zinc/emerald/red/purple/blue/orange) in a single canonical primitive surfaced in every role header"
    ],
    "expected": "aria-label={`Notifications${unreadCount ? `, ${unreadCount} non lues` : ''}`} on the trigger; <Bell aria-hidden=\"true\" />; rewrite all 21 palette utilities through semantic tokens (text-muted-foreground, bg-card, text-success, text-info, text-warning, text-destructive, etc.).",
    "fix": "Patch the trigger Button + Bell. Replace the entire className tree with semantic tokens; reuse <StatusBadge> for the unread pill instead of bg-red-500."
  },
  {
    "id": "CANON-DS-002",
    "title": "Select trigger ships h-9 / h-8 — violates 44px touch target lock",
    "severity": "high",
    "domain": "primitives + a11y",
    "canon_ref": "docs/canon/design-system-mobile.locked.md §5 'Touch targets ≥ 44px' + §2 'extend to select, toggle, tabs, tabs-animated (md), input-otp...'",
    "evidence": [
      "components/ui/select.tsx:41 — `data-[size=default]:h-9 data-[size=sm]:h-8` with no `min-h-11` companion",
      "Same primitive consumed by every form (food order, ride request, mentor booking, partner offer create, parent allowance, etc.)"
    ],
    "expected": "data-[size=default]:h-11 OR data-[size=default]:h-9 min-h-11 paired with data-[size=sm]:h-8 min-h-11, mirroring the button.tsx sm-variant pattern at line 121.",
    "fix": "Update select.tsx:41 className: replace `data-[size=default]:h-9 data-[size=sm]:h-8` with `data-[size=default]:h-11 data-[size=sm]:h-9 min-h-11`."
  },
  {
    "id": "CANON-DS-003",
    "title": "TabsList ships h-9 — touch target lock violated",
    "severity": "high",
    "domain": "primitives + a11y",
    "canon_ref": "docs/canon/design-system-mobile.locked.md §5 + §2 (extend to tabs)",
    "evidence": [
      "components/ui/tabs.tsx:29 — `'bg-muted text-muted-foreground inline-flex h-9 w-fit items-center justify-center rounded-lg p-[3px]'`"
    ],
    "expected": "h-11 default; or h-9 paired with min-h-11 on triggers. Triggers themselves must clear 44×44 visually or via min-h-11.",
    "fix": "Add `min-h-11` to TabsTrigger (line 41) and bump TabsList visual height where the variant allows."
  },
  {
    "id": "CANON-DS-004",
    "title": "Input-OTP slot ships h-9 w-9 — touch target lock violated",
    "severity": "high",
    "domain": "primitives + a11y",
    "canon_ref": "docs/canon/design-system-mobile.locked.md §5 + §2 (extend to input-otp)",
    "evidence": [
      "components/ui/input-otp.tsx:54 — `'... relative flex h-9 w-9 items-center justify-center border-y border-r text-sm shadow-xs ...'` with no min-h-11/min-w-11"
    ],
    "expected": "h-9 w-9 visually OK only if paired with min-h-11 min-w-11 (button.tsx:125 'icon-sm' pattern).",
    "fix": "Add `min-h-11 min-w-11` to the slot className on line 54."
  },
  {
    "id": "CANON-DS-005",
    "title": "parallax-container.tsx animates without any reduced-motion gate",
    "severity": "high",
    "domain": "motion + a11y",
    "canon_ref": "docs/canon/design-system-mobile.locked.md §13 'Contradictions flagged — celebrate.tsx and parallax-container.tsx animate without useReducedMotion gate'; §3 (Motion proxy contract)",
    "evidence": [
      "components/ui/parallax-container.tsx:1-12 — direct `import { motion, useScroll, useTransform } from 'framer-motion'`; no `useReducedMotion` import, no `matchMedia('(prefers-reduced-motion: reduce)')` call anywhere in the file",
      "ParallaxLayer (line 48+) wraps children in motion.div with scroll-driven transforms with no escape hatch"
    ],
    "expected": "Either route through `@/components/ui/motion` (Motion proxy short-circuits when reduced) OR add a `useReducedMotion()` guard that returns the unanimated children. (celebrate.tsx already gates via matchMedia at lines 106-107 — partially compliant; parallax-container.tsx is fully unguarded.)",
    "fix": "Add `import { useReducedMotion } from 'framer-motion'`; if reduced, return `<div className={cn('relative', className)}>{children}</div>` with no transforms wired."
  },
  {
    "id": "CANON-DS-006",
    "title": "Button lavender/coral/grape variants ship text-white — WCAG 4.5:1 contrast fail",
    "severity": "high",
    "domain": "tokens + a11y",
    "canon_ref": "docs/canon/design-system-mobile.locked.md §2 'Button … lavender|coral|grape variants must use text-on-bright (not text-white)'; §13 contradiction",
    "evidence": [
      "components/ui/button.tsx:92 — `lavender: ['bg-brand-soft text-white', ...]`",
      "components/ui/button.tsx:97 — `coral: ['bg-accent-soft text-white', ...]`",
      "components/ui/button.tsx:112 — `grape: ['bg-gen-z-grape text-white', ...]`"
    ],
    "expected": "All three should read `text-on-bright` (consistent with lime line:102 and mint line:107 already migrated).",
    "fix": "Replace `text-white` with `text-on-bright` on lines 92, 97, 112."
  },
  {
    "id": "CANON-DS-007",
    "title": "Non-bespoke loading.tsx files lack aria-busy / role=status / sr-only wrapper",
    "severity": "high",
    "domain": "skeletons + a11y",
    "canon_ref": "docs/canon/design-system-mobile.locked.md §4 'Top-level wrapper sets aria-busy=\"true\" + role=\"status\" + child <span class=\"sr-only\">Chargement…</span>'",
    "evidence": [
      "Total loading.tsx files: 144 (find /c/Users/Shadow/Desktop/NIVY/app -name loading.tsx)",
      "Files with `aria-busy`: 0 — ripgrep across `app/**/loading.tsx` returns no matches",
      "Only the 3 bespoke dashboard skeletons (teen/parent/partner) carry the wrapper, by virtue of being delegated to (e.g. app/teen/loading.tsx → TeenDashboardSkeleton at components/ui/skeletons/page-skeletons/teen-dashboard-skeleton.tsx:167-208)",
      "Sample non-compliant: app/admin/loading.tsx:4-11 (uses <Loading variant=\"spinner\"/>); app/teen/quests/loading.tsx:3-15 (renders <SkeletonPresetStats/> + <SkeletonDefiCard/> with no a11y wrapper); app/loading.tsx:4-22 (Loader2 spinner with no role=status)"
    ],
    "expected": "Every loading.tsx top-level wrapper must carry aria-busy=\"true\" + role=\"status\" + a sr-only `<span>Chargement…</span>`.",
    "fix": "Either bake those attributes into <Loading>/<Skeleton*> presets (preferred — fix once), or wrap each loading.tsx body in `<div role=\"status\" aria-busy=\"true\"><span className=\"sr-only\">Chargement…</span>...</div>`."
  },
  {
    "id": "CANON-DS-008",
    "title": "useOptimistic adoption is 4 surfaces — canon requires ≥ 8",
    "severity": "high",
    "domain": "optimistic mutations",
    "canon_ref": "docs/canon/design-system-mobile.locked.md §9 'Required surfaces (≥ 8 today): feed likes, friend-request accept/decline, follow/unfollow, chore-complete, savings-goal lock, cart-add, mentor-session-book, food-order place, quest-complete'",
    "evidence": [
      "ripgrep `useOptimistic\\b` across app/** + components/** matches only 4 files: app/teen/friends/friends-client.tsx, components/teen/goal-lock-button.tsx, components/teen/teen-chore-complete-button.tsx, components/feed/social-feed.tsx",
      "Missing: follow/unfollow, cart-add, mentor-session-book, food-order place, quest-complete"
    ],
    "expected": "9 listed call-sites all using useOptimistic + startTransition + Réessayer rollback toast.",
    "fix": "Add useOptimistic to the 5 missing flows; ensure each rollback path raises `toast.error(message, { action: { label: 'Réessayer', onClick: retry } })`."
  },
  {
    "id": "CANON-DS-009",
    "title": "useOptimisticRunner does not call useOptimistic, does not wrap startTransition, does not enforce 'Réessayer' rollback toast",
    "severity": "high",
    "domain": "optimistic mutations",
    "canon_ref": "docs/canon/design-system-mobile.locked.md §9 'Pattern: React 19 useOptimistic paired with startTransition (mandatory). Shared wrapper lib/hooks/use-optimistic-mutation.ts exports useOptimisticRunner combining useOptimistic with TanStack Query mutation lifecycle for automatic rollback'; 'Rollback toast contract (LOCKED): on error, toast.error(message, { action: { label: \"Réessayer\", onClick: retry } })'",
    "evidence": [
      "lib/hooks/use-optimistic-mutation.ts:101-145 — useOptimisticRunner is a thin try/catch over a passed mutationFn with manual setIsPending, no React 19 useOptimistic primitive, no startTransition wrap, no automatic rollback toast emission",
      "ripgrep `Réessayer` across the wrapper file: 0 matches",
      "Wrapper does not import `startTransition` from React"
    ],
    "expected": "Wrapper should call useOptimistic() under the hood, schedule the mutation inside startTransition, and on error automatically dispatch the canonical rollback toast with the 'Réessayer' action.",
    "fix": "Rewrite useOptimisticRunner to (a) accept an optimistic-state reducer and use React 19 useOptimistic, (b) call startTransition around state writes, (c) on caught error emit the locked rollback toast unless `silent: true` is passed in options."
  },
  {
    "id": "CANON-DS-010",
    "title": "PullToRefresh missing on 3 of 10 required surfaces (notifications, marketplace, rides)",
    "severity": "high",
    "domain": "mobile patterns",
    "canon_ref": "docs/canon/design-system-mobile.locked.md §6 'Required surfaces: quests, feed, notifications, marketplace, mentors, food, rides, friends, leaderboard, messages.'",
    "evidence": [
      "ripgrep `PullToRefresh` across app/** matches 7 files: quests/page.tsx, feed/page.tsx, mentors/page.tsx, messages/page.tsx, friends/page.tsx, food/page.tsx, leaderboard/page.tsx",
      "Missing: notifications surface, marketplace surface, rides surface (`app/teen/rides`, `app/marketplace`, `app/notifications` or `app/teen/notifications`)"
    ],
    "expected": "All 10 surfaces wrapped in <PullToRefresh>.",
    "fix": "Wrap the 3 missing list pages in <PullToRefresh onRefresh={async () => { await mutate(); router.refresh() }}>."
  },
  {
    "id": "CANON-DS-011",
    "title": "Bare `focus:` (without focus-visible:) regressions in new feature surfaces",
    "severity": "high",
    "domain": "a11y",
    "canon_ref": "docs/canon/design-system-mobile.locked.md §5 'Focus ring (LOCKED): focus-visible:ring-[3px] ...'; §11 #5 (CI rule)",
    "evidence": [
      "app/auth/login/page.tsx:200 — `outline-none focus:ring-2 focus:ring-red-500`",
      "app/teen/mentors/page.tsx:93 — `focus:outline-none focus:ring-2 focus:ring-primary/40`",
      "app/teen/internships/page.tsx:142,152,172 — three `focus:outline-none focus:ring-2 focus:ring-success/40` blocks",
      "ripgrep `focus:[a-z]` across app/** matches 11 files; 5+ are non-allowlisted leaf surfaces"
    ],
    "expected": "All non-allowlist focus styles must use focus-visible: prefix; allowlisted exceptions (skip-link, visually-hidden, menubar) only.",
    "fix": "Replace `focus:outline-none` → `focus-visible:outline-none`, `focus:ring-2` → `focus-visible:ring-2`, etc., across the 5+ offending files."
  },
  {
    "id": "CANON-DS-012",
    "title": "window.alert() used as success notification in feed report/block flows",
    "severity": "high",
    "domain": "forbidden patterns",
    "canon_ref": "docs/canon/design-system-mobile.locked.md §11 (forbidden patterns); docs/canon/INDEX.locked.md §social-feed cross-cutting 'window.alert() BANNED'",
    "evidence": [
      "app/teen/feed/feed-list.tsx:122 — `window.alert('Merci, le post a été signalé.')`",
      "app/teen/feed/feed-list.tsx:129 — `window.alert(\"L'auteur a été bloqué pour cette session.\")`",
      "app/teen/feed/post-card.tsx:87,94 — same two alerts duplicated"
    ],
    "expected": "Use `toast.success(...)` from sonner.",
    "fix": "Replace each `window.alert(msg)` with `toast.success(msg)` (import { toast } from 'sonner')."
  },
  {
    "id": "CANON-DS-013",
    "title": "vt-restaurant-<id> view-transition pair half-broken — list side missing the viewTransitionName",
    "severity": "medium",
    "domain": "view transitions",
    "canon_ref": "docs/canon/design-system-mobile.locked.md §7 'vt-restaurant-<id> | app/teen/food/page.tsx | app/teen/food/[partner_id]/page.tsx'",
    "evidence": [
      "app/teen/food/[partner_id]/page.tsx:44 — `<div style={{ viewTransitionName: \\`vt-restaurant-${partner_id}\\` }}>` (detail side present)",
      "ripgrep `vt-restaurant` across app/teen/food/page.tsx — 0 matches; the list-side card carries no `viewTransitionName`"
    ],
    "expected": "Both list and detail sides must carry the `vt-restaurant-${id}` viewTransitionName for the morph to render. Per canon: 5 vt-* PAIRS.",
    "fix": "Add `style={{ viewTransitionName: \\`vt-restaurant-${partner.id}\\` }}` to the list-card link in app/teen/food/page.tsx (and to the per-partner card wrapper)."
  },
  {
    "id": "CANON-DS-014",
    "title": "Sonner Toaster missing canonical config (responsive position, expand, gap, visibleToasts)",
    "severity": "medium",
    "domain": "toasts",
    "canon_ref": "docs/canon/design-system-mobile.locked.md §8 '<Toaster position={isMobile ? \"top-center\" : \"bottom-right\"} expand gap={8} visibleToasts={3} />'",
    "evidence": [
      "components/ui/sonner.tsx:6-22 — Toaster wrapper passes only `theme` + `className=\"toaster group\"` + a CSS-var style block. No position prop, no expand, no gap, no visibleToasts, no isMobile derivation."
    ],
    "expected": "Mount Toaster with the responsive position (use the existing useIsMobile hook), expand, gap={8}, visibleToasts={3}.",
    "fix": "Wire `useIsMobile()` inside the Toaster wrapper and pass `position={isMobile ? 'top-center' : 'bottom-right'} expand gap={8} visibleToasts={3}`."
  },
  {
    "id": "CANON-DS-015",
    "title": "Duplicate id=\"main-content\" on root + 6 role layouts",
    "severity": "medium",
    "domain": "a11y",
    "canon_ref": "docs/canon/design-system-mobile.locked.md §5 '(Open contradiction: duplicate id=\"main-content\" on root + role; rename root to id=\"root-main-content\" per W4-A3 §1.)'; §13 contradiction",
    "evidence": [
      "app/layout.tsx:259 — `<main id=\"main-content\" className=\"min-h-screen pb-24 md:pb-0\" tabIndex={-1}>`",
      "app/teen/layout.tsx:62-64 — `<main id=\"main-content\" tabIndex={-1}>`",
      "app/parent/layout.tsx:40-42 — same",
      "app/admin/layout.tsx:28-30 — same",
      "app/partner/layout.tsx:30-32 — same",
      "app/mentor/layout.tsx:45-47 — same",
      "app/ambassador/layout.tsx:30-32 — same",
      "Total of 7 elements with the same DOM id; HTML spec requires id uniqueness"
    ],
    "expected": "Root <main> renamed to id=\"root-main-content\" (per canon §5 recommendation). Skip-link logic (querySelectorAll('#main-content').at(-1)) keeps working because the role-deepest element retains `main-content`.",
    "fix": "Change app/layout.tsx:259 to id=\"root-main-content\"."
  },
  {
    "id": "CANON-DS-016",
    "title": "7 role-sidebar / role-header <nav> elements unlabeled",
    "severity": "medium",
    "domain": "a11y",
    "canon_ref": "docs/canon/design-system-mobile.locked.md §5 'Role-scoped <nav> landmarks carry aria-label=\"Navigation principale\" — no unlabeled <nav> elements'; §13 contradiction (W4-A3 §8)",
    "evidence": [
      "components/dashboard/ambassador/sidebar.tsx:34 — `<nav className=\"flex-1 px-3 space-y-1\">` (no aria-label)",
      "components/dashboard/mentor/sidebar.tsx:26 — same",
      "components/dashboard/parent/sidebar.tsx:65 — same",
      "components/dashboard/teen/sidebar.tsx:48 — same",
      "components/dashboard/partner/sidebar.tsx:34 — same",
      "components/dashboard/parent/header.tsx:57 — `<nav className=\"space-y-1 px-2\">` (no aria-label)",
      "components/dashboard/teen/header.tsx:80 — `<nav className=\"space-y-1 px-2\">` (no aria-label)",
      "Counter-example (correctly labeled): components/dashboard/sidebar.tsx:77 carries `aria-label=\"Navigation dashboard\"`; components/dashboard/header.tsx:76 carries `aria-label=\"Navigation mobile\"`"
    ],
    "expected": "Add aria-label=\"Navigation principale\" (or role-scoped variant) to each unlabeled landmark.",
    "fix": "Patch the 7 lines above with appropriate aria-label."
  },
  {
    "id": "CANON-DS-017",
    "title": "Inline cubic-bezier literal in components/teen/pull-to-refresh.tsx",
    "severity": "medium",
    "domain": "motion + forbidden patterns",
    "canon_ref": "docs/canon/design-system-mobile.locked.md §3 'Inline cubic-bezier(...) literals in component code = forbidden'; §11 #4",
    "evidence": [
      "components/teen/pull-to-refresh.tsx:184 — `\"transform 220ms cubic-bezier(0.34, 1.56, 0.64, 1)\" // overshoot`",
      "components/teen/pull-to-refresh.tsx:236 — same string repeated"
    ],
    "expected": "Import EASE_SNAPPY from lib/motion/easing.ts (or a CSS variable derived from it) and interpolate.",
    "fix": "Define a CSS custom property `--ease-snappy: cubic-bezier(0.34, 1.56, 0.64, 1)` in globals.css and reference `transform 220ms var(--ease-snappy)` here, OR rewrite as a Framer-motion `transition` block consuming EASE_SNAPPY."
  },
  {
    "id": "CANON-DS-018",
    "title": "Legacy Radix toast wrapper still imported by ticket-actions",
    "severity": "medium",
    "domain": "toasts (deprecated)",
    "canon_ref": "docs/canon/design-system-mobile.locked.md §8 'DEPRECATED: Radix-based components/ui/toast.tsx + toaster.tsx + hooks/use-toast.ts'; §10",
    "evidence": [
      "components/ticket-actions.tsx — still imports from @/components/ui/toast or @/hooks/use-toast (matched by ripgrep `from ['\\\"]@/components/ui/toast['\\\"]|from ['\\\"]@/hooks/use-toast['\\\"]` across the tree)"
    ],
    "expected": "Migrate to `import { toast } from 'sonner'`.",
    "fix": "Patch components/ticket-actions.tsx to use sonner; then delete components/ui/toast.tsx, components/ui/toaster.tsx, hooks/use-toast.ts (sunset target V1.5)."
  },
  {
    "id": "CANON-DS-019",
    "title": "Switch primitive does not dev-warn when caller omits aria-label/aria-labelledby",
    "severity": "medium",
    "domain": "a11y",
    "canon_ref": "docs/canon/design-system-mobile.locked.md §5 '<Switch> must always be passed aria-label or aria-labelledby by callers — Radix doesn't enforce. Dev-warn on mount when neither is present.'",
    "evidence": [
      "components/ui/switch.tsx — ripgrep `aria-label|aria-labelledby` returns 0 matches; no dev-warn useEffect anywhere"
    ],
    "expected": "Wrap SwitchPrimitive with a useEffect that, when NODE_ENV !== 'production' and neither prop is set, console.warns the caller stack.",
    "fix": "Add a dev-only guard in components/ui/switch.tsx that fires once per mount when both labels are absent."
  },
  {
    "id": "CANON-DS-020",
    "title": "126 components + 33 app files import framer-motion directly (not via Motion proxy)",
    "severity": "medium",
    "domain": "motion (codemod backlog)",
    "canon_ref": "docs/canon/design-system-mobile.locked.md §3 'Direct framer-motion imports allowed only inside components/ui/motion.tsx itself. Codemod target: 100% of framer-motion consumers.'; §11 #12",
    "evidence": [
      "ripgrep `from ['\\\"]framer-motion['\\\"]` across components/** = 130 occurrences across 126 files",
      "ripgrep `from ['\\\"]framer-motion['\\\"]` across app/** = 33 occurrences across 33 files",
      "Canon explicitly says these are 'allowed pending Wave 2 codemod' — flagged here as a backlog so post-codemod regressions can be diffed"
    ],
    "expected": "All consumers route through `@/components/ui/motion`. Only components/ui/motion.tsx may import framer-motion directly.",
    "fix": "Land the Wave 2 motion codemod replacing `import { motion, AnimatePresence } from 'framer-motion'` with `import { Motion as motion, AnimatePresence } from '@/components/ui/motion'`. Audit hooks (`useReducedMotion`, `useScroll`, `useTransform`, `useMotionValue`) — these may legitimately stay imported from framer-motion."
  },
  {
    "id": "CANON-DS-021",
    "title": "lib/motion/easing.ts EASE_STANDARD value diverges from canon §3 spec",
    "severity": "medium",
    "domain": "motion (constants drift)",
    "canon_ref": "docs/canon/design-system-mobile.locked.md §3 'EASE_STANDARD = [0.23, 1, 0.32, 1] (crossfade, default page transitions)'; 'EASE_DRAMATIC = [0.7, 0, 0.3, 1]'",
    "evidence": [
      "lib/motion/easing.ts:33 — `export const EASE_STANDARD = [0.83, 0, 0.17, 1] as const` (Apple ease-out-quint)",
      "lib/motion/easing.ts:63 — `export const EASE_DRAMATIC = [0.23, 1, 0.32, 1] as const` (the value the canon assigns to EASE_STANDARD)",
      "Canon-listed constants `EASE_EMPHASIZED = [0.16, 1, 0.3, 1]`, `EASE_DECEL = [0, 0, 0.2, 1]`, `EASE_ACCEL = [0.4, 0, 1, 1]` are absent (file exposes EASE_DECELERATE/EASE_ACCELERATE instead — different naming)",
      "Spring stiffness/damping values also diverge from canon §3 SPRING_SNAPPY (canon: stiffness 380 damping 32 mass 0.8; file: stiffness 380 damping 30 mass 1)"
    ],
    "expected": "Either update canon §3 to match the implementation (if intentional) OR realign the constants in lib/motion/easing.ts to canon values, including adding EASE_EMPHASIZED + EASE_DECEL + EASE_ACCEL.",
    "fix": "Founder decision required (drift is intentional? then update canon). Otherwise patch lib/motion/easing.ts and audit consumers for visual regression."
  },
  {
    "id": "CANON-DS-022",
    "title": "MorphingSkeleton use is not enforced — most loading.tsx render skeletons via direct preset import",
    "severity": "low",
    "domain": "skeletons",
    "canon_ref": "docs/canon/design-system-mobile.locked.md §2 'MorphingSkeleton ... Mandatory in every loading.tsx. Hard-cut swaps forbidden.' + §4 'Skeleton → content swap: MorphingSkeleton only'",
    "evidence": [
      "ripgrep `MorphingSkeleton` across app/**/loading.tsx — only the 3 bespoke wrappers indirectly use it",
      "Most loading.tsx files (e.g. app/teen/quests/loading.tsx, app/admin/loading.tsx) render skeletons directly — Next.js default behaviour is a hard-cut on hydration, not a cross-fade"
    ],
    "expected": "Either delegate the skeleton→content morph to a top-level provider that wraps every (role) layout's children in <MorphingSkeleton>, OR document that MorphingSkeleton is opt-in for 'hero' surfaces only and downgrade the canon language.",
    "fix": "Founder decision required: (a) wire MorphingSkeleton at layout level (large change), or (b) tighten the canon scope to bespoke skeletons only."
  }
]
```

---

## Compliance score breakdown

| Bucket | Score |
|---|---|
| Tokens (color-mix soft, warning-soft/danger-soft defined) | 9/10 — RESOLVED ✅ |
| Primitives (Button h-11; Select/Tabs/Input-OTP h-9 broken) | 5/10 |
| Motion (easing.ts present; parallax ungated; constant drift) | 5/10 |
| Skeletons (3 bespoke shipped; non-bespoke loading.tsx miss a11y wrapper) | 5/10 |
| A11y (skip-link + tabIndex correct; nav unlabeled; bell missing label; bare focus:) | 4/10 |
| Mobile patterns (PullToRefresh / SwipeableCard / long-press / safe-area defaults match canon) | 8/10 |
| View Transitions (provider mounted; 5 pairs declared; 1 list-side missing) | 8/10 |
| Toasts (sonner is canon; config minimal; 1 legacy import remains) | 6/10 |
| Optimistic mutations (4 of 9 surfaces; runner doesn't enforce React 19 contract) | 4/10 |
| Forbidden patterns (window.alert in 2 feed files; bell raw palette; bare focus:) | 5/10 |
| Documentation reconciliation (canon §13 contradictions partially closed) | 3/10 |

**Composite: 62/100.**

---

## Recommended fix order

1. **CANON-DS-001 (P0)** — NotificationBell aria-label + aria-hidden on Bell + rewrite 21 raw palette utilities. ~1 h. Blocks launch.
2. **CANON-DS-002 / -003 / -004 (P1, batched)** — bump select/tabs/input-otp to satisfy 44px lock. ~30 min combined.
3. **CANON-DS-006 (P1)** — replace `text-white` with `text-on-bright` on lavender/coral/grape. 5 min, contrast critical.
4. **CANON-DS-005 (P1)** — gate parallax-container with useReducedMotion. 10 min.
5. **CANON-DS-012 (P1)** — replace 4 `window.alert()` calls in feed-list/post-card with `toast.success`. 5 min.
6. **CANON-DS-007 (P1)** — bake `aria-busy/role=status/sr-only` into <Loading>/<Skeleton*> presets. 30 min, fixes ~140 loading.tsx files in one shot.
7. **CANON-DS-011 (P1)** — codemod bare `focus:` → `focus-visible:` across the 5 leaf-page offenders. 20 min.
8. **CANON-DS-010 (P1)** — wrap notifications/marketplace/rides list pages in <PullToRefresh>. 15 min.
9. **CANON-DS-013 (P2)** — add viewTransitionName on the food list-side card. 5 min.
10. **CANON-DS-014 (P2)** — wire responsive Toaster config. 10 min.
11. **CANON-DS-015 / -016 / -017 / -018 / -019 (P2, batched)** — duplicate id, sidebar nav labels, inline cubic-bezier replacement, last legacy toast caller, Switch dev-warn. ~1 h.
12. **CANON-DS-008 / -009 (P1)** — extend optimistic surface coverage and rewrite useOptimisticRunner to honour React 19 contract + 'Réessayer' rollback toast. ~3 h.
13. **CANON-DS-020 (P2 backlog)** — Wave 2 motion codemod on 159 files. Ship behind a single PR with visual regression diff.
14. **CANON-DS-021 (P2)** — founder decision on EASE_STANDARD drift; reconcile canon vs implementation.
15. **CANON-DS-022 (P3)** — founder decision on MorphingSkeleton mandate scope.

After P0 + P1 fixes (steps 1–8 + 12), expected score: ~85/100, launch-eligible for the design-system domain. P2/P3 close residual drift over V1.4.

---

## Cross-cutting observations

- **CANON-DS-020 + CANON-DS-021** suggest the motion sub-system is the single largest remaining drift surface; the codemod is mechanical but the easing-constant divergence is a founder call.
- **CANON-DS-001 + CANON-DS-016** show that the privileged "shared chrome" components (sidebar, header, notification bell) consistently lag the per-feature surfaces on a11y rigour — they predate the canon and have not been swept.
- **CANON-DS-007 + CANON-DS-022** are both about *defaults* in the skeleton system. Fixing the presets propagates compliance to ~140 files at once — high leverage.
- The 4 raw `window.alert()` calls (CANON-DS-012) are the only direct violation of a *cross-cutting* INDEX.locked.md rule. Every other forbidden-pattern hit is local.

---

End of audit.
