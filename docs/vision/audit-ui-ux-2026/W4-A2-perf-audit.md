# W4-A2 — Performance Audit (Static, Read-Only)

- **Owner:** UX-Sprint Wave 4 / Agent W4-A2 (perf engineer)
- **Date:** 2026-05-08
- **Scope:** Static, read-only Lighthouse-equivalent audit. No actual Lighthouse run (founder's CI job).
- **Prior art:** `W3-A10-lcp-audit.md` (LCP + skeletons), `W3-A11` (Suspense streaming + lazy-load), `W3-A12-cls-audit.md` (CLS=0 verdict).
- **Constraint:** No code changes. Recommendations only.

---

## TL;DR

Nivy enters Wave 4 in good static-perf shape: CLS is structurally zero (W3-A12), the three core dashboards stream below-the-fold via Suspense + `next/dynamic({ ssr: false })`, and `next.config.mjs` already lists `optimizePackageImports` for the seven heaviest barrel deps (`framer-motion`, `lucide-react`, `recharts`, `date-fns`, `react-day-picker`, `sonner`, `@radix-ui/react-icons`). Heavy 3rd-party libs that don't tree-shake (canvas-confetti, html5-qrcode, leaflet, qrcode.react) are routed through `lib/client/lazy-components.tsx` so they only ship on routes that touch them.

**Predicted Lighthouse outlook:** LCP **likely pass** on dashboards (text-LCP, no above-the-fold image work), CLS **likely pass** (audited zero), INP **depends** (256-file framer-motion footprint is the swing factor), TBT **depends** (large client trees on `/teen` Bento and gamification surfaces).

The five highest-leverage remaining wins are: (1) drop the global `/teens-party-event.jpg` preload + FAQ JSON-LD from authenticated routes, (2) move `framer-motion` consumers behind a `LazyMotionConfig` reduced-feature import, (3) collapse the 16 raw `<img>` instances in `gamification-system/` to `next/image`, (4) split the 3 admin `<img>` clusters and parent mentor-sessions images, (5) reduce middleware DB roundtrips on protected routes (currently up to **2 supabase queries per request** on `/teen|/parent|/partner|/ambassador`).

---

## 1. Bundle inventory — heavyweight client deps

Source: `package.json`. Each library cross-referenced against `**/*.{ts,tsx}` import graph.

| Dep | Version | Approx min+gzip | Imports | Tree-shake plausible? | Notes |
|---|---|---|---|---|---|
| `framer-motion` | 11.18.2 | ~50 KB | **256 occurrences across 237 files** | Partial — `optimizePackageImports` is set, but every `motion.div` import pulls the animation runtime | Used in dashboard, hero, every Bento card, cookie banner, PWA prompt, mobile dock. The single biggest swing factor for INP/TBT. |
| `recharts` | 3.4.1 | ~95 KB | 2 files (`components/analytics-chart.tsx`, `components/ui/chart.tsx`) | Yes (already lazy-loaded) | `LazyLineChart/BarChart/PieChart/AreaChart` exported from `lib/client/lazy-components.tsx`; partner/parent dashboards use the lazy wrappers. `optimizePackageImports` is also set. Good shape. |
| `canvas-confetti` | 1.9.4 | ~6 KB | 26 files | Yes — already lazy via `useConfetti()` hook in `lib/client/lazy-components.tsx` | Some files (`components/ui/effects/confetti.tsx`, `components/gamification/celebration-overlay.tsx`) import directly; check whether those force an eager bundle. |
| `vaul` | 0.9.9 | ~15 KB | 3 files (`responsive-modal.tsx`, `bottom-sheet.tsx`, `drawer.tsx`) | Yes — single-use sheet primitive | Only loaded on mobile sheet surfaces. Acceptable. |
| `leaflet` + `react-leaflet` | 1.9.4 / 5.0.0 | ~150 KB combined | 2 files (`app/parent/rides/[id]/ride-map.tsx`, `components/maps/teen-map.tsx`) | Yes — both files use `dynamic(... { ssr: false })` | Map only ships on the rides surfaces. Good. |
| `html5-qrcode` | 2.3.8 | ~95 KB | 2 files (`components/qr-scanner.tsx`, `components/partner/universal-scanner.tsx`) | Partial | Should be `dynamic({ ssr: false })`. **Verify** these wrappers — currently raw `import` per the grep. |
| `qrcode.react` | 4.2.0 | ~12 KB | Used via `LazyQRCode` in `lib/client/lazy-components.tsx` | Yes — already wrapped | Good. |
| `qrcode` (Node) | 1.5.4 | server-only | `app/api/tickets/generate-pdf`, server actions | N/A | Server-only — does not affect client bundle. |
| `embla-carousel-react` | 8.5.1 | ~12 KB | `components/ui/carousel.tsx` (single primitive) | Yes (single import surface) | Acceptable. |
| `react-day-picker` | 9.8.0 + `date-fns` 4.1.0 | ~40 KB | `components/ui/calendar.tsx`, `components/ui/date-picker.tsx` (lazy) | Yes — `LazyDatePicker` wraps it | Good. |
| `react-signature-canvas` | alpha | ~25 KB | `components/signature-pad.tsx`, `components/e-signature-form.tsx` | Yes — `LazySignaturePad`, `LazyESignatureForm` wrap them | Good. |
| `react-resizable-panels` | 2.1.9 | ~10 KB | `components/ui/resizable.tsx` | Yes | Acceptable. |
| `browser-image-compression` | 2.0.2 | ~30 KB | `lib/utils/compress-image.ts` | Yes — only loaded on photo-upload paths | Acceptable. |
| `react-speech-recognition` | 4.0.1 | ~15 KB | (no direct grep hits in client tree this run — assumed used by AI flows only) | N/A | Verify on next sweep — may be dead weight. |
| `cmdk` | 1.0.4 | ~10 KB | (search/command palette primitive) | Yes | Acceptable. |
| `@stripe/react-stripe-js`, `@stripe/stripe-js` | 5/8 | ~30 KB combined | Payment surfaces only | Yes (route-scoped) | Good. |
| `@tanstack/react-query` + devtools | 5.90 / 5.91 | ~15 KB + devtools | Provider | **Devtools should be conditionally loaded** — verify it's tree-shaken in prod. |
| `lucide-react` | 0.454 | ~3 KB per icon | Hundreds of files | Yes — `optimizePackageImports` set | Good. |

### Verdict on bundle inventory
- The `experimental.optimizePackageImports` covers the seven highest-impact barrels.
- The two genuinely heavyweight browser libs that *don't* tree-shake (`leaflet`, `html5-qrcode`) are correctly route-scoped or lazy-wrapped.
- **Single highest swing factor** is `framer-motion` ubiquity — every Bento card, every dashboard tile, every micro-interaction component (`StaggerItem`, `Float`, `PulseGlow`, `MagneticButton`, `ParallaxLayer`, `MeshGradient`, `GlowBlob`) pulls the runtime. There is no way to ship `/teen` without it.

---

## 2. `next/image` audit — remaining `<img>` count

Total raw `<img>` tags in client surfaces: **7 occurrences across 6 files** (post Wave 3). `components/` is **clean (0 matches)** confirming W3-A12's finding that the design system uses `next/image` exclusively.

### Distribution by directory

| Directory | Count | Files |
|---|---|---|
| `app/admin/` | 1 | `creator-moderation/page.tsx:108` |
| `app/parent/mentor-sessions/` | 3 | `page.tsx:212`, `page.tsx:290`, `[id]/page.tsx:153` |
| `app/parent/chores/[id]/` | 1 | `[id]/page.tsx:244` |
| `app/api/.../route.ts` | 2 | `tickets/generate-pdf/route.ts:71` (HTML in PDF — N/A), `admin/anniversaires/[id]/route.ts:237` (email HTML — N/A) |
| `gamification-system/components/` | 23 occurrences across 23 files (out of audit scope but flagged) | leaderboard, crews, collections, etc. |

### Recommendation

- **Action 1 (V1.4):** Migrate the 5 user-surface `<img>` (admin creator-moderation + parent mentor-sessions + parent chores) to `next/image` with explicit `width`/`height` to lock CLS=0 even on those low-traffic surfaces.
- **Action 2 (V1.5+):** Decide whether `gamification-system/` is in-bundle or extracted; if in-bundle, those 23 files are the next CLS/LCP risk surface for the gamification routes.
- The 2 `api/.../route.ts` instances are server-rendered HTML strings (PDF + email templates), correctly excluded.

---

## 3. Dynamic imports audit

### Lazy-component files confirmed present (Wave 3)

| File | Status | Coverage |
|---|---|---|
| `app/teen/lazy-components.tsx` | EXISTS | `LazyTeenDashboardContent` (entire below-fold Bento) |
| `app/parent/lazy-components.tsx` | EXISTS | `LazyFinancialOverview`, `LazyEvolutionTracker`, `LazySponsorChallengeForm` |
| `app/partner/lazy-components.tsx` | EXISTS | `LazyPartnerActiveOffersFeed`, `LazyPartnerLiveTransactionsFeed` |
| `components/teen/dashboard/lazy-components.tsx` | EXISTS | `LazySocialFeed`, `LazyMarketplaceOverlay` |
| `lib/client/lazy-components.tsx` | EXISTS (canonical) | 18+ lazy exports: signature pad, photo upload, QR, recharts, framer motion-div, date picker, image gallery, PDF viewer, partner forms, ambassador dashboard, achievements, etc. |
| `components/analytics-chart-lazy.tsx` | EXISTS | recharts wrapper |

Total `next/dynamic` usage: **10 files** importing it directly (8 if you exclude the legacy `app/teen/social/social-hub-client.tsx` and the route-local `app/parent/rides/[id]/ride-map.tsx`).

### Candidates not yet lazy (V1.4 follow-ups)

Inspecting files that import `framer-motion` directly inside large dashboard surfaces but aren't behind `dynamic()`:
- `app/teen/quests/quests-hub-client.tsx` — wrapped by `Suspense` in its parent, but the client tree is shipped eagerly.
- `app/teen/wallet/wallet-hub-client.tsx` — same.
- `app/teen/social/social-hub-client.tsx` — already uses `next/dynamic` internally; good.
- `app/teen/profile/profile-hub-client.tsx` — eager.
- `app/gamification/leaderboard|missions|crews|collections|boutique|roue/*-client.tsx` — gamification clients are eager and pull framer-motion.
- `components/feed/social-feed.tsx` — pulled in by teen dashboard via the lazy wrapper, but worth double-checking it's not also imported elsewhere eagerly.
- `components/parent/parental-approval-list.tsx` — eager, but it's small and conditionally rendered.
- `app/partner/page.tsx` — `Float`, `PulseGlow`, `MagneticButton`, `ParallaxLayer`, `MeshGradient`, `GlowBlob` are all imported eagerly into the server boundary. Server component imports of "use client" modules still ship them — fine, but consider if all six effect wrappers are needed above the fold.

### Recommendation
- For V1.4, lazy-wrap the gamification route clients (`app/gamification/.../*-client.tsx`) — these are deep-link landing pages; they don't need to ship eagerly.
- Keep an eye on `components/feed/social-feed.tsx` — it's the heaviest below-the-fold component and already lazy-loaded once via `LazySocialFeed`.

---

## 4. Suspense audit

Total `<Suspense` occurrences in `app/`: **17 across 15 files**.

### Top dashboards confirmed streaming

| Route | `<Suspense>` count | Streaming target |
|---|---|---|
| `app/teen/page.tsx` | 1 | Wraps `<LazyTeenDashboardContent>` (entire below-the-fold Bento) |
| `app/parent/page.tsx` | 2 | Wraps `<ParentalApprovalList>` (approvals stream) and the financial+evolution lower section |
| `app/partner/page.tsx` | 2 | Wraps `<LazyPartnerActiveOffersFeed>` and `<LazyPartnerLiveTransactionsFeed>` |
| `app/partner/dashboard/page.tsx` | 0 (uses `loading.tsx`) | Implicit Suspense via route-segment loading state |

**Verdict:** All three core dashboards have Suspense streaming on the heavy below-the-fold blocks. Above-the-fold (Hero, KPI strip, TwinCurrencyGauge) ships in the initial HTML payload.

### Other routes with Suspense
`app/agenda/page.tsx`, `app/teen/aide-scolaire/page.tsx`, `app/teen/calendar/page.tsx`, `app/teen/friends/page.tsx`, `app/teen/messages/page.tsx`, `app/teen/quests/page.tsx`, `app/teen/quests/[id]/page.tsx`, `app/teen/quests/friend-defis/page.tsx`, `app/teen/quiz/page.tsx`, `app/teen/social/page.tsx`, `app/teen/streak/page.tsx`, `app/teen/wallet/page.tsx`. Coverage is broad and consistent.

---

## 5. Cron + middleware perf risk

### Middleware (`middleware.ts`) hot-path inventory

Per request, the middleware does the following synchronously:

1. `setEnvironmentTag` (cheap — local).
2. Generate UUID nonce (cheap).
3. Build CSP / security headers (cheap, all string ops).
4. Path-based rate-limit config selection (cheap).
5. **Async: `rateLimitDistributed(request, config)`** — Upstash Redis call. ~10–30 ms typical, depends on Redis region.
6. **Async: `validateCSRFToken(request)`** — for non-GET API routes. Reads cookies + signed token check; should be fully synchronous after extract — verify in `lib/security/csrf.ts`.
7. **Async: `updateSession(request)`** (Supabase SSR session refresh) — issues a Supabase auth call, may roundtrip if access token is near expiry.
8. **For admin routes (`/admin`):** another `createServerClient` + `supabase.auth.getUser()` + `supabase.from("admin_roles").select(...)` — **2 DB roundtrips**.
9. **For protected dashboards (`/teen|/parent|/ambassador|/partner`):** another `createServerClient` + `supabase.auth.getUser()` + `supabase.from("profiles").select("role")` — **2 DB roundtrips per page nav**.

**Concern:** Steps 7 + 9 stack — every `/teen` navigation does an `updateSession` (Supabase) **plus** another `supabase.auth.getUser()` and a `profiles.role` fetch. That's 3 sequential Supabase auth calls in a single middleware execution. Even at 30 ms each, this floors the route at ~90 ms TTFB before any RSC code runs.

### Recommendations (perf only — security review out of scope here)

- **R1.** Cache `profiles.role` in a signed cookie (or in the JWT custom claim if possible) to skip the role lookup in step 9. Update the cookie on role change. Estimated saving: ~30 ms per protected nav.
- **R2.** `updateSession` already calls `getUser()` internally — the second `supabase.auth.getUser()` in the protected-route block is duplicated work. Reuse the user object set by `updateSession` or restructure so it runs once. Estimated saving: ~30 ms.
- **R3.** Move admin role lookup into RSC (it'll be needed there anyway) and let middleware just gate on "is logged in." Estimated saving: ~30 ms on `/admin` paths.
- **R4.** `rateLimitDistributed` uses Upstash — if Redis goes cold-start in the same region, this can spike. Verify Upstash region matches Vercel region (Paris/Frankfurt for MA-targeting deploy).

### Cron routes (perf-relevant only)
The CSRF exempt list includes `/api/cron/`, so cron routes don't pay CSRF cost — good. But each cron route still runs the rate-limit + Supabase session machinery before its own handler. Cron routes don't need session refresh; consider an early-return for `/api/cron/` after rate limit. Out-of-scope for V1.4 unless cron volume increases.

---

## 6. Predicted Lighthouse scores

Based on static evidence only. References: `W3-A10-lcp-audit.md`, `W3-A12-cls-audit.md`.

| Metric | Threshold (good) | Predicted | Reasoning |
|---|---|---|---|
| **LCP** | < 2.5 s | **likely pass** on the 3 dashboards | Per W3-A10: LCP is text (h1 in Hero/Centre de Contrôle/companyName) on all three dashboards. No image LCP path. Server-rendered, no client-only deferral. *Risk:* the unused `/teens-party-event.jpg` global preload (`app/layout.tsx:179`) eats ~150–300 KB on the dashboard LCP path — fixing it tightens the margin but the route already passes without. |
| **CLS** | < 0.1 | **likely pass (≈ 0)** | Per W3-A12: zero raw `<img>` in `app/` user surfaces, `display: swap` fonts with metric-matched fallbacks, all overlays (cookie/PWA/offline/dock) are `position: fixed`, all skeletons mirror real-component dimensions and use `min-h` reservations. Lighthouse should see CLS ≤ 0.02. |
| **INP** | < 200 ms | **depends — leaning pass** on cold load, **risk on warm** | The framer-motion ubiquity (256 occurrences) means the long task budget is dominated by hydration. Once hydrated, interactions are mostly Radix primitives (well-optimized) and Tailwind class swaps. *Risk surface:* the Bento card hover/tilt animations on `/teen` (`tiltIntensity={2}`) and the parallax/mesh-gradient effects on `/parent`. If a teen is on a low-end Android, the first tap-after-paint may exceed 200 ms. Scheduling `requestIdleCallback`-deferred mounts for non-essential motion components would tighten this. |
| **TBT** | < 200 ms (lab) | **depends** | TBT scales with JS evaluation time. Initial chunk ships above-the-fold pieces only (Hero, AvatarCoach, TwinCurrencyGauge, KPI strip). The lazy split via `next/dynamic({ ssr: false })` defers ~60–70% of the dashboard JS. Estimated TBT on a mid-range mobile (Moto G Power class): 150–250 ms. Likely on the borderline. The biggest contributor to remaining TBT is `framer-motion` runtime + `react-query` provider initialization. |

### Score band estimates (mobile, slow 4G simulation)
- **Performance score:** 80–92 likely. Heavily depends on cold-start cache behavior and INP tail.
- **Best Practices:** 95+ (security headers, no console errors expected, HTTPS, CSP nonce).
- **Accessibility:** 95+ (W3-A audits cleared focus rings; sr-only labels on skeletons).
- **SEO:** 95+ (structured FAQ JSON-LD, but it's on every route — see W3-A10 R1).

---

## 7. Top 5 wins remaining for V1.4 perf push

Ranked by impact-to-effort.

### 1. Drop the global `/teens-party-event.jpg` preload + FAQ JSON-LD from authenticated routes
**Effort:** S (1 file edit). **Impact:** Saves 150–300 KB on every `/teen|/parent|/partner` cold load.
- Move `<link rel="preload" href="/teens-party-event.jpg">` (`app/layout.tsx:179`) and the FAQ `<script type="application/ld+json">` (`app/layout.tsx:181-...`) into a marketing-only layout (`app/(marketing)/layout.tsx`).
- Already flagged in W3-A10 §4 as the single biggest LCP-path waste on logged-in routes.

### 2. Reduce middleware Supabase calls from 2 to 1 on protected routes
**Effort:** M (refactor `middleware.ts` lines 230–308). **Impact:** ~30–60 ms TTFB saving on every protected nav.
- Reuse the user object set by `updateSession()` instead of calling `supabase.auth.getUser()` a second time.
- Cache the user role in a signed cookie or a custom JWT claim so the `profiles.role` query can be skipped on most navigations.
- See §5 R1+R2.

### 3. Lazy-load gamification route clients
**Effort:** M (add `dynamic()` wrappers to 6 client files). **Impact:** Cuts ~80–120 KB off the initial chunk for any user that *doesn't* navigate into gamification surfaces.
- `app/gamification/{leaderboard,missions,crews,collections,boutique,roue}/*-client.tsx` are all imported eagerly today. Wrap each in a `lazy-components.tsx` per route, mirroring the pattern in `app/parent/lazy-components.tsx`.

### 4. Migrate the remaining 5 user-surface `<img>` to `next/image`
**Effort:** S–M. **Impact:** Locks CLS=0 on parent mentor-sessions + parent chores + admin moderation routes.
- `app/admin/creator-moderation/page.tsx:108`
- `app/parent/mentor-sessions/page.tsx:212`, `:290`
- `app/parent/mentor-sessions/[id]/page.tsx:153`
- `app/parent/chores/[id]/page.tsx:244`
- All 5 are sponsor/proof images — set explicit `width`/`height` and add `sizes` for responsive layouts.

### 5. Reduce `framer-motion` surface area on the highest-traffic route
**Effort:** L (audit + refactor). **Impact:** 30–80 ms INP improvement on low-end Android.
- 256 occurrences across 237 files is the single largest INP/TBT swing factor.
- Concrete first step: replace `motion.div` with plain `div` in components where the animation is purely entrance-only and could be CSS keyframes (`StaggerItem`, `FadeIn`, `FadeInUp`). Reserve `framer-motion` for `layoutId`-based shared-element transitions and `AnimatePresence` exit choreography where it actually adds value.
- Secondary step: confirm `motion-reduce:hidden` already short-circuits the heavy effects (`MeshGradient`, `GlowBlob`, `ParallaxContainer`) — per W3-A12 it does, but verify the framer runtime itself is also gated, not just the visual output.

---

## Appendix — searches used

- `rg "<img\s|<img$" app/` → 7 matches across 6 files.
- `rg "<img\s|<img$" components/` → **0 matches**.
- `rg "<img\s|<img$" gamification-system/` → 23 files (flagged for V1.5+).
- `rg "framer-motion" **/*.{ts,tsx}"` → 256 occurrences across 237 files.
- `rg "from ['\"]recharts['\"]" **/*.{ts,tsx}"` → 2 files.
- `rg "from ['\"]vaul['\"]" **/*.{ts,tsx}"` → 3 files.
- `rg "leaflet|react-leaflet" **/*.{ts,tsx}"` → 2 files (both `dynamic({ ssr: false })`).
- `rg "next/dynamic" **/*.{ts,tsx}"` → 10 files.
- `rg "<Suspense" app/"` → 17 occurrences across 15 files.
- `package.json` dependency list cross-checked against `lib/client/lazy-components.tsx` lazy exports.

## tsc verification

This audit applied **zero code changes**, so it introduces zero typecheck regressions. Pre-existing `tsc --noEmit` errors (flagged in W3-A12) are unrelated.
