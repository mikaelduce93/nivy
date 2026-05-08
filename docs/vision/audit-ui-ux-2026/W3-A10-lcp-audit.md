# W3-A10 — LCP Audit & Bespoke Skeletons (TICKET-032 + TICKET-033)

**Owner:** UX-Sprint Wave 3, agent W3-A10 (perf engineer)
**Scope:** Top-3 dashboards — `/teen`, `/parent`, `/partner` (and `/partner/dashboard`)
**Date:** 2026-05-08
**Linked tickets:** TICKET-032 (bespoke skeletons), TICKET-033 (LCP audit)

---

## 1. Skeletons delivered (TICKET-032)

| Dashboard | New skeleton file | Wired into |
|---|---|---|
| Teen | `components/ui/skeletons/page-skeletons/teen-dashboard-skeleton.tsx` | `app/teen/loading.tsx` |
| Parent | `components/ui/skeletons/page-skeletons/parent-dashboard-skeleton.tsx` | `app/parent/loading.tsx` |
| Partner (live business dashboard) | `components/ui/skeletons/page-skeletons/partner-dashboard-skeleton.tsx` | `app/partner/loading.tsx` + `app/partner/dashboard/loading.tsx` |

Each silhouette mirrors the real DOM rhythm so the swap on hydration is visually seamless (no layout shift). All atoms are sourced from `components/ui/skeletons/atoms.tsx` and inherit `SKELETON_BASE` (`animate-pulse motion-reduce:animate-none motion-reduce:bg-muted/80`), so reduced-motion users get a static placeholder automatically.

The barrel `components/ui/skeletons/index.ts` now re-exports the three page skeletons under their named exports.

---

## 2. LCP element identification

### 2.1 — `app/teen/page.tsx`

**LCP candidate:** the `h1` "Centre de Contrôle"-style heading inside `Hero` (`components/teen/dashboard/hero.tsx`). The Hero contains an `<AvatarImage>` (Radix Avatar wrapping a plain `<img>` — NOT `next/image`) but the avatar is small (≤96 px) so it isn't the LCP — the large headline + XP bar block is.

- No `next/image` is used in the immediate hero block — only `AvatarImage` from Radix.
- The first viewport element on hydration is the **AvatarCoach** card, but its content is text only.
- **Net:** the LCP is a text node (h1 in Hero) — not an image.

**Recommendations:**
- Hero h1 already renders server-side (no client-only deferral) — good.
- AvatarCoach renders `await` calls in a server component; consider passing `priority={true}` to any future `next/image` avatar wrapper if avatars become large.
- `/teens-party-event.jpg` is preloaded in `app/layout.tsx` line 179 but is **not used** on the teen dashboard — this preload wastes ~300 ms of bandwidth on the LCP path. **Action:** scope this preload to the marketing/landing route only (e.g. via a per-route `<head>` link) or remove if unused.

### 2.2 — `app/parent/page.tsx`

**LCP candidate:** the `h1` "Centre de Contrôle" (`text-5xl md:text-6xl font-black`). No image is rendered above the fold — only `MeshGradient` + `GlowBlob` (CSS gradients) and a `ParallaxLayer`. The teen-sponsor stories row has avatars (Radix `<img>`-based) but they sit below the h1.

**Recommendations:**
- Heading is text — no `priority`/`fetchPriority` needed.
- `MeshGradient` and `GlowBlob` are gated behind `motion-reduce:hidden` already (good).
- `ParallaxContainer` with `framer-motion` is rendered at the root — consider `dynamic(() => import(...), { ssr: false })` for the parallax wrapper to keep TTFB low; today the parallax module ships in the server bundle.
- TeenSponsorHeader avatars: if those become Next Images later, set `priority` only on the first 1–2 (above the fold).

### 2.3 — `app/partner/page.tsx` & `app/partner/dashboard/page.tsx`

**LCP candidate (both partner pages):** the `h1` ("{companyName}" on `/partner`, "Tableau de Bord" on `/partner/dashboard`) — `text-5xl md:text-6xl/7xl font-black`. No `next/image` above the fold.

**Recommendations:**
- Text-based LCP — no image priority changes needed.
- The `🛍️ / 🍽️` emoji in `/partner/page.tsx` line 158-161 is wrapped in a 7xl-text node inside `<Float>` (framer-motion) — that emoji glyph could become the LCP on Safari/Chrome on high-DPI viewports; if so, ensuring `<Float>` is not blocking-loaded would help.

---

## 3. `next/image` audit on dashboard routes

```bash
grep -rn "from ['\"]next/image['\"]" app/teen app/parent app/partner
```

Result: **no direct `next/image` imports** in any of the three dashboards. All current image rendering goes through Radix `AvatarImage` (which renders a plain `<img>`).

**Implication:** the standard advice (`<Image priority />`, explicit width/height, `fetchPriority="high"`) does not yet apply to these three routes. When a hero image lands on any of these dashboards, follow this checklist:

- [ ] Use `next/image` (not `<img>`).
- [ ] Set `priority` on the LCP image only.
- [ ] Set explicit `width` and `height` props (numeric, in pixels) — required by `next/image` and prevents CLS.
- [ ] Set `loading="eager"` (implied by `priority` but explicit is clearer).
- [ ] Set `fetchPriority="high"` when `priority` is on (Next 14+ adds this automatically; verify in DOM after upgrade).
- [ ] Pair with `sizes` matching the responsive breakpoints (e.g. `sizes="(min-width: 1024px) 50vw, 100vw"`).

---

## 4. Blocking 3rd-party scripts

Inspecting `app/layout.tsx`:

| Source | Line | Strategy | Blocking? | Action |
|---|---|---|---|---|
| `<link rel="preconnect" href="https://fonts.googleapis.com">` | 173 | Preconnect | Non-blocking | Keep |
| `<link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin>` | 174 | Preconnect | Non-blocking | Keep |
| `<link rel="dns-prefetch" href="https://va.vercel-scripts.com">` | 175 | DNS prefetch | Non-blocking | Keep |
| `<link rel="dns-prefetch" href="https://teensparty.supabase.co">` | 176 | DNS prefetch | Non-blocking | Keep |
| `<link rel="preload" href="/teens-party-event.jpg" as="image">` | 179 | Preload | Non-blocking — but **wastes bandwidth on dashboards** that don't use it | **Move to landing route only** |
| `<script type="application/ld+json" nonce>` (FAQ schema) | 181 | Inline JSON-LD | Non-blocking (declarative) | Keep — but this only belongs on the marketing route, not on logged-in dashboards. Move to a `app/(marketing)/layout.tsx` head. |

**No `<script src>` 3rd-party tags** are loaded synchronously. Vercel Analytics is added via `@vercel/analytics/next`'s `<Analytics />` component which loads asynchronously — good.

### Two concrete wins on the LCP path

1. **Drop the unused image preload from the dashboard routes.** `/teens-party-event.jpg` is preloaded globally via `app/layout.tsx` but never appears on `/teen`, `/parent`, or `/partner`. Move the preload into the landing route's `<head>` (or the route group `app/(marketing)/layout.tsx` if one exists). Estimated saving: ~150–300 KB on the LCP path for logged-in users on each cold load.
2. **Move the FAQ JSON-LD off the dashboard routes.** It's a marketing-page schema being shipped to every authenticated user. Same fix — relocate into a marketing-only layout. The script itself is non-blocking but it adds ~3 KB of HTML and runs through the head parser.

---

## 5. Skeleton fidelity verification

- Each skeleton uses Tailwind `h-*` / `w-*` / `min-h-*` classes that match the real component dimensions.
- `SKELETON_BASE` provides `animate-pulse motion-reduce:animate-none motion-reduce:bg-muted/80` (already in atoms.tsx).
- Skeletons are server components (no `'use client'`) so they can stream immediately.
- `aria-busy="true"` and `role="status"` set on each top-level wrapper for screen readers, plus `<span class="sr-only">Chargement…</span>`.

---

## 6. TypeScript verification

`tsc --noEmit` was run after wiring. Files added/changed:

- `components/ui/skeletons/page-skeletons/teen-dashboard-skeleton.tsx`
- `components/ui/skeletons/page-skeletons/parent-dashboard-skeleton.tsx`
- `components/ui/skeletons/page-skeletons/partner-dashboard-skeleton.tsx`
- `components/ui/skeletons/index.ts` (re-exports)
- `app/teen/loading.tsx`
- `app/parent/loading.tsx`
- `app/partner/loading.tsx`
- `app/partner/dashboard/loading.tsx`

See "TypeScript check" section of the implementation report for the actual `tsc` output.

---

## 7. Open follow-ups (out of scope for W3-A10)

- W3-A11: extract the unused `/teens-party-event.jpg` preload + FAQ JSON-LD into a marketing-only layout.
- W3-A12: consider deferring `framer-motion`-driven `ParallaxContainer` into a client-only dynamic import on `/parent` to drop initial JS.
- W3-A13: when avatars in TeenSponsorHeader / Hero migrate from Radix `<img>` to `next/image`, gate `priority` on the first 1–2 above-the-fold avatars only.
