# W3-A12 — CLS (Cumulative Layout Shift) Audit + Fixes

- **Owner:** UX-Sprint Wave 3 / Agent W3-A12 (perf engineer)
- **Ticket:** TICKET-036
- **Date:** 2026-05-08
- **Goal:** CLS = 0 on top dashboards (`/teen`, `/parent`, `/partner/dashboard`, `/teen/feed`, `/teen/quests`)

## TL;DR

The Nivy 2026 codebase is already largely CLS-clean. No raw `<img>` tags exist anywhere in `app/` or `components/` (the codebase is fully on `next/image` with explicit `fill` + `sizes` inside parent containers that reserve dimensions). Web fonts use `display: swap`. Cookie banner and PWA install prompt are both `position: fixed` and never push content. The mobile dock SSR-renders a structurally identical placeholder so no flip on mount.

**Audit verdict:** zero applied code changes were warranted under the "minimal CLS-fix edits, no refactor, no side effects" constraint. All identified shift risks are already neutralized by existing patterns. Three low-priority recommendations are flagged below for follow-up tickets (W3-A10 skeleton-dimension parity, design-system audit on `min-h` reservations).

---

## Files audited

| File | Verdict | Notes |
|---|---|---|
| `app/layout.tsx` | CLEAN | Geist + Geist_Mono `display: swap`, font features set, fixed banners. |
| `app/teen/page.tsx` | CLEAN | All children have explicit container heights via Bento + min-h. |
| `app/parent/page.tsx` | CLEAN | Server-rendered, no late-bound media. Background is `position: fixed`. |
| `app/partner/dashboard/page.tsx` | CLEAN | Same pattern as parent — fixed background, Bento grid w/ explicit cols/rows. |
| `app/teen/feed/page.tsx` | CLEAN | `next/image` w/ `fill` inside `aspect-video` containers. |
| `app/teen/quests/page.tsx` | CLEAN | No images. Suspense skeleton has matching grid shape. |
| `components/cookie-banner.tsx` | CLEAN | `position: fixed bottom-0 z-50`. No reflow. |
| `components/pwa/pwa-install-prompt.tsx` | CLEAN | `fixed bottom-0 z-50`. iOS modal is `fixed inset-0`. |
| `components/ui/states/offline-indicator.tsx` (`OfflineBanner`) | CLEAN | `fixed top-0 z-[100]`. Doesn't push `<main>`. |
| `components/layouts/mobile-dock.tsx` | CLEAN | SSR placeholder structurally matches mounted version. `<main>` has `pb-24 md:pb-0` to reserve space. |
| `components/teen/dashboard/teen-dashboard-content.tsx` | LOW RISK | `mounted` flag toggles desktop-only background effects (all `position: fixed`). Bento grid identical pre/post mount. |
| `components/teen/dashboard/crew-hub.tsx` | CLEAN | `<Image fill>` inside `w-20 h-20` / `w-7 h-7` parents. |
| `components/teen/dashboard/marketplace-drops.tsx` | CLEAN | `<Image fill>` inside `absolute inset-0` parent. |
| `components/teen/avatar-coach-client.tsx` | CLEAN | CSS gradients only, no images. |

---

## Section-by-section findings

### 1. Web fonts (root layout)

**Status:** ✅ Clean

- `Geist` and `Geist_Mono` from `next/font/google` both set `display: "swap"` (`app/layout.tsx:36, 45`).
- `body` sets `font-feature-settings: "rlig" 1, "calt" 1, "kern" 1, "liga" 1, "ss01" 1` and `font-optical-sizing: auto` (`app/globals.css:570-574`), which keeps OpenType metrics stable across the swap.
- `next/font` automatically generates a fallback metric-matched local font (`size-adjust`, `ascent-override`, `descent-override`, `line-gap-override`) on the `--font-geist` variable, eliminating FOUT shift. No manual `@font-face` overrides needed.
- `<html className={`${geistSans.variable} ${geistMono.variable}`}>` is set on the SSR pass — the variable is available at FCP.

**Recommendation:** none.

### 2. Images

**Status:** ✅ Clean

- `rg "<img\s"` across `app/` + `components/` returns **zero** matches.
- Every `next/image` usage I inspected uses `fill` mode inside a parent that already has explicit dimensions:
  - `crew-hub.tsx:114` — parent is `w-20 h-20 sm:w-24 sm:w-24 rounded-[1.75rem] overflow-hidden`.
  - `crew-hub.tsx:287` — parent is `w-7 h-7 sm:w-8 sm:h-8 rounded-full overflow-hidden`.
  - `marketplace-drops.tsx:43` — parent is `absolute inset-0` inside a `motion.div` with explicit padding/aspect.
  - `app/teen/feed/page.tsx:147` — wrapper is `relative aspect-video w-full` (CSS aspect-ratio reserves height).
- `Avatar` / `AvatarImage` from shadcn ships with explicit `h-/w-` props that the consumers always set (`Hero`, `OnlineFriends`, `MapPreview`, `SocialHubWidget`).

**Recommendation:** none.

### 3. Cookie banner

**Status:** ✅ Clean

- `<div className="fixed bottom-0 left-0 right-0 z-50 ...">` (`cookie-banner.tsx:32`).
- Initial render: `showBanner = false` → returns `null` on SSR + first client paint.
- `useEffect` flips `showBanner` post-mount based on `localStorage`. Because the banner is `fixed`, this transition never reflows `<main>`.

**Recommendation:** none.

### 4. PWA install banner

**Status:** ✅ Clean

- `<motion.div className="fixed bottom-0 left-0 right-0 z-50 p-4 pb-safe">` (`pwa-install-prompt.tsx:168`).
- Same pattern as cookie banner — fixed-positioned overlay that does not occupy document flow.
- The Framer `initial={{ y: 100, opacity: 0 }}` animation drives transform/opacity only, so it does not contribute to CLS (CLS ignores transform animations per the spec).
- iOS install instructions: `fixed inset-0 z-50 flex items-end sm:items-center` — modal style, no layout impact on the page.

**Recommendation:** none.

### 5. Offline banner

**Status:** ✅ Clean

- `'fixed top-0 left-0 right-0 z-[100] ...'` (`offline-indicator.tsx:74`).
- Same fixed-overlay pattern; appears only when `!isOnline`. No flow impact.

**Recommendation:** consider adding a small `<main>` top padding only when the banner is visible (purely visual — currently the banner overlays the navbar). NOT a CLS concern.

### 6. Mobile dock

**Status:** ✅ Clean

- `mobile-dock.tsx:293-318` ships an SSR placeholder with the exact same outer wrapper (`fixed bottom-0 left-0 right-0 z-50 p-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] md:hidden`) and the same children shape (one Link per nav item with `min-h-touch`).
- The `<main id="main-content" className="min-h-screen pb-24 md:pb-0">` in root layout reserves `6rem` of bottom padding on mobile, matching the dock's vertical extent.
- Active-tab pill animation uses `layoutId` (Framer transform) — no document reflow.

**Recommendation:** none.

### 7. Teen dashboard (`/teen`)

**Status:** ✅ Clean (one low-risk note)

- `TeenDashboardContent` reads `mounted` via `useDashboardContext()` and conditionally renders desktop-only background `<GlowBlob>` layers. Both branches' visuals are inside `position: fixed inset-0 z-0 pointer-events-none`, so the toggle never reflows `<main>`.
- The Bento grid is identical pre/post mount — same children, same column spans (`col-span-full md:col-span-N` is a Tailwind responsive class, no JS toggle).
- Suspense skeletons (`MapSkeleton`, `QuickAccessSkeleton`, `CardSkeleton`) live inside `<BentoCard>` parents that set `min-h-[200px] sm:min-h-[250px]` and `auto-rows-[minmax(140px,auto)]`, so the cell height is reserved by the grid before children resolve.

**Recommendation (W3-A10 follow-up):** verify each skeleton's intrinsic content height ≤ the resolved component's content height. Mismatches would only cause a tiny intra-cell shift since the parent BentoCard min-h is fixed, but they're worth aligning for sub-pixel polish.

### 8. Parent dashboard (`/parent`)

**Status:** ✅ Clean

- Pure SSR; all data fetched in the page component before render.
- Background `<MeshGradient>` + `<GlowBlob>` are inside `<div aria-hidden className="fixed inset-0 z-0 pointer-events-none overflow-hidden motion-reduce:hidden">` — no flow impact.
- `<EvolutionTracker>` and `<UpcomingEvents>` receive their data synchronously from the server render — no late-mount CLS.
- `AnimatePresence` on `<ParentalApprovalList>` only mounts when `pendingApprovals.length > 0` from the SSR render, so it's part of the initial DOM (no post-FCP insertion).

**Recommendation:** none.

### 9. Partner dashboard (`/partner/dashboard`)

**Status:** ✅ Clean

- Pure SSR. All KPIs (`stats`, `activeOffers`, `activity`) computed before return.
- `<AnimatedCounter>` animates `text` content but the parent has explicit `text-4xl font-black tracking-tighter` — character width changes with digit count are minor and stay within a stable text container.
- Background blobs (`top-[-10%] left-[-10%] w-[50%] h-[50%]`) are inside `<ParallaxLayer>` wrapped by `aria-hidden` parent — `position: absolute` siblings of the main content, gated on `motion-reduce`.

**Recommendation:** none.

### 10. Teen feed (`/teen/feed`)

**Status:** ✅ Clean

- SSR-rendered list. Each post media block: `<div className="relative mt-3 aspect-video w-full overflow-hidden rounded-xl">` reserves height via CSS `aspect-ratio`, with `<Image fill sizes=...>` filling it. Zero CLS even on slow image loads.
- `<EmptyState preset="feed">` appears synchronously when `posts.length === 0` (no toggle).
- `<PullToRefresh>` wrapper does not insert a placeholder above content on idle.

**Recommendation:** none.

### 11. Teen quests (`/teen/quests`)

**Status:** ✅ Clean

- SSR + Suspense around `<QuestsHubClient>` with `<QuestsHubSkeleton>` fallback. Skeleton uses the same grid shape (`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6`) and matching tile heights (`h-64`).
- No images on this surface.

**Recommendation (W3-A10):** confirm the resolved `QuestsHubClient` first-row tile height is also `~16rem` to keep skeleton swap pixel-stable.

---

## Code changes applied

**None.** Per the ticket constraint ("Apply fixes only where safe (no side effects)"), I made zero edits — every potential offender I inspected is already CLS-correct under a stricter reading than the ticket required. Forcing edits would either be no-ops (wrapping already-fixed banners) or refactors (changing how `<main>` reserves space), both excluded by the ticket scope.

## Recommendations deferred to other agents

1. **W3-A10 (skeleton parity):** verify pixel-height match between Suspense skeletons and their resolved counterparts in:
   - `MapSkeleton` ↔ `MapPreview` (BentoCard parent already enforces `min-h-[200px] sm:min-h-[250px]`, but check skeleton ≥ that).
   - `QuickAccessSkeleton` ↔ `QuickAccessGrid`.
   - `CardSkeleton` ↔ `OnlineFriends`, `ProfileQuest`, `CrewHub`.
   - `QuestsHubSkeleton` ↔ `QuestsHubClient` first paint.
2. **Future (post-Wave 3):** if any partner banners / promotional surfaces are added that load after FCP (ads, sponsorship rotators), reserve their height with explicit `min-h` or CSS `aspect-ratio` and hide via `visibility: hidden` until ready, rather than `display: none → block`.
3. **Long-term:** add a Sentry / Web Vitals CLS budget alarm at `0.05` (already collected via `SentryWebVitals` in root layout) so any future regression triggers paging before it ships.

## tsc verification

No TypeScript files were modified by this ticket, so this ticket introduces zero typecheck regressions.

`pnpm typecheck` reports pre-existing errors in two files outside W3-A12 scope:
- `app/parent/topup/manual/manual-topup-form.tsx` — JSX closing-tag error (pre-existing, modified upstream)
- `app/teen/mentors/[id]/book-mentor-session-button.tsx` — JSX fragment / token errors (pre-existing, modified upstream as part of in-flight Wave 3.4 mentor work)

Both files are flagged as `modified` in `git status` from in-flight work and are unrelated to CLS / TICKET-036. They should be addressed by their respective owning agents.

---

## Appendix — search queries used

- `rg "<img\s"` across `app/` and `components/` → 0 matches.
- `rg "next/image"` across `app/teen` → only `feed/[id]`, `feed/page.tsx`, `profile/profile-hub-client.tsx`, `social/social-hub-client.tsx`.
- `rg "AvatarImage|next/image|Image\b"` across `components/teen/dashboard` → 7 files, all using `fill` + sized parents.
- `rg "size-adjust|font-display|font-feature|font-family"` in `app/globals.css` → confirmed `font-feature-settings` blocks are scoped correctly (body, headings, mono, tabular-nums).
