# Performance Guide

Targets aligned with Core Web Vitals (mobile, P75):

| Metric | Target  | Notes                                |
| ------ | ------- | ------------------------------------ |
| LCP    | < 2.5 s | Largest visible image / hero text    |
| INP    | < 200 ms | Replaces FID since 2024             |
| CLS    | < 0.1   | Shifted layout from images / fonts   |
| FCP    | < 1.8 s | First text/image paint               |
| TTFB   | < 800 ms | Edge config + ISR                   |

## Lazy loading strategy

We split work along three axes:

1. **Route-level**: every page in `app/` is its own RSC bundle by default.
   Mark client components with `"use client"` only when required.
2. **Component-level**: heavy widgets are loaded with `next/dynamic`. Catalog:
   - `components/maps/teen-map-wrapper.tsx` — Leaflet (~150 kB raw).
   - `components/analytics-chart-lazy.tsx` — Recharts (~200 kB raw).
   - `lib/client/lazy-components.tsx` — central registry for QR generators,
     scanners, drawers, signature canvas.
3. **Data-level**: TanStack Query caches reads, mutations are optimistic
   where possible (see `lib/hooks/use-optimistic-mutation.ts`).

Rule of thumb: if a feature is < 30 % likely to be reached on first visit
and weighs > 30 kB compressed, it should be `dynamic(() => import(...))`
with `ssr: false` when it touches `window`.

## Image optimization

- All `<img>` in `app/` and `components/` use `next/image`.
- Use `fill` + `sizes` when the parent has explicit dims and `relative
  overflow-hidden`. Use explicit `width`/`height` for fixed-size avatars,
  thumbnails, badges.
- Add `priority` to the hero / above-the-fold image of each page.
- Add `loading="lazy"` (default for non-priority anyway) on every below-the-
  fold image — explicit is better than implicit when reviewing.
- Allowed remote hosts are listed in `next.config.mjs` (`images.remotePatterns`).
  When integrating a new CDN, add it there and prefer HTTPS.
- AVIF and WebP are emitted automatically (`images.formats`).
- Static asset caching is set to 1 year via `Cache-Control: public,
  max-age=31536000, immutable` for `*.{jpg,png,webp,avif,svg,ico}`.

## Bundle splitting

- `experimental.optimizePackageImports` is enabled for:
  - `lucide-react`, `@radix-ui/react-icons` — barrel-bust to per-icon imports.
  - `framer-motion` — strip unused motion features.
  - `date-fns`, `react-day-picker`, `recharts`, `sonner` — same idea.
- `compress: true` and `poweredByHeader: false` in `next.config.mjs`.
- TanStack Query devtools are imported lazily so they only ship in dev.

## Bundle analyzer

The repo bundles `@next/bundle-analyzer`. Run on Linux/macOS:

```bash
npm run analyze
```

On Windows PowerShell / cmd:

```bash
npm run analyze:win
```

Either spawns a `next build` with `ANALYZE=true`. Reports are written to
`.next/analyze/` (`client.html`, `edge.html`, `nodejs.html`). Open the
`client.html` file to inspect what ships to the browser. Aim for:

- `app/` first-party chunks under 300 kB compressed per route.
- No vendor chunk over 150 kB compressed unless explicitly justified.

When a chunk regresses, look for:

- A barrel import that defeats tree-shaking (`import * from "lib"`).
- A heavy library imported in a server-only file but pulled into the
  client graph through a re-export (check the analyzer source map).
- A dynamic import that lost its `dynamic()` wrapper during a refactor.

## Web vitals monitoring

`@vercel/analytics` is wired in the root layout. Real-user metrics flow into
the Vercel dashboard automatically. For lab-grade numbers, run Lighthouse
on every milestone and store the output under `docs/LIGHTHOUSE.md`.

## Common pitfalls

- **Heavy client component at the root** — keep `app/layout.tsx` and
  `app/page.tsx` as RSC. Push interactivity into nested client components.
- **Eager Suspense fallbacks** — make sure `loading.tsx` files are small
  and render skeletons, not full UI.
- **Unbounded list re-renders** — virtualize > 50 items (consider
  `@tanstack/react-virtual` if needed).
- **Eager imports of icon barrels** — always `import { Bell } from
  "lucide-react"`, never `import * as Icons from "lucide-react"`.
- **Animations on the LCP element** — animating opacity/transform of the
  largest paint defers it. Prefer animating siblings.

## Checklists

- [ ] No `<img>` regression — `grep -r "<img " app components` returns 0.
- [ ] All `next/image` calls have either `fill + sizes` or `width + height`.
- [ ] No barrel `import * as` from a heavy lib.
- [ ] New heavy widget is loaded via `dynamic()` if it isn't on the LCP path.
- [ ] `npm run analyze` was inspected on at least one large feature PR.
