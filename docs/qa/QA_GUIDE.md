# NIVY — QA Guide

Single source of truth for the test pyramid, how to run each suite, how to
regenerate visual baselines, and what "ready to merge" looks like for
Phase 3+ NIVY work.

---

## 1. Test strategy

NIVY uses a four-layer test pyramid:

| Layer       | Tooling                     | Location                       | Owner agent |
| ----------- | --------------------------- | ------------------------------ | ----------- |
| Unit        | Vitest + jsdom              | `tests/lib/**`, `tests/quality/**`, `tests/features/**` | A3 / A6 |
| End-to-end  | Playwright (chromium)       | `tests/e2e/**`                 | A8          |
| Visual      | Playwright `toHaveScreenshot` | `tests/visual/**`            | A8          |
| A11y        | `@axe-core/playwright`      | `tests/a11y/**`                | A7          |

Unit tests are the workhorse — they run in <10 s and gate every PR. Playwright
suites run on PRs and `main` only (see `.github/workflows/ci.yml`).

### What lives where

- **`tests/lib`** — pure functions, validation, sanitization, rate limiting,
  Moroccan context utilities.
- **`tests/features`** — feature-level Vitest suites (gamification challenge
  selection, etc.).
- **`tests/quality`** — invariants such as "no public test routes shipped".
- **`tests/e2e`** — smoke specs that exercise the running Next.js app.
- **`tests/visual`** — pixel diff specs using Playwright snapshots.
- **`tests/a11y`** — axe-core scans of critical public pages.

---

## 2. Running each suite

All scripts assume Node 20.9+ and a clean `npm ci` install.

```bash
# Unit (Vitest)
npm run test          # watch mode
npm run test:run      # single pass — used in CI
npm run test:coverage # produces coverage/ artifact

# Lint + types
npm run lint -- --quiet
npm run typecheck

# End-to-end (Playwright)
npm run test:e2e          # all e2e + visual + a11y specs
npm run test:e2e:ui       # interactive runner
npm run test:e2e:headed   # show the browser

# Run a single Playwright file
npx playwright test tests/e2e/smoke-zones.spec.ts

# Lint + unit + e2e in one shot
npm run test:all
```

Playwright auto-starts `next start` on `http://localhost:3000` (config:
`playwright.config.ts`). Locally it reuses an existing dev server when
present. In CI it always boots its own.

### Required environment for e2e

```
NEXT_PUBLIC_SUPABASE_URL=https://placeholder.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=placeholder-key
NEXT_PUBLIC_APP_URL=https://example.com
```

These are provided by repo secrets in CI; locally the smoke specs do not
require a real Supabase project.

---

## 3. Visual snapshots

Visual specs live under `tests/visual/`. Snapshots are stored next to the
spec under `__screenshots__/<spec-file>/<image-name>.png` (configured in
`playwright.config.ts` via `snapshotPathTemplate`).

### First run — generating baselines

When a visual spec is added (or a UI change is intentional) the baseline
PNGs need to be created or refreshed:

```bash
# Regenerate all visual baselines
npx playwright test tests/visual --update-snapshots

# Regenerate one spec only
npx playwright test tests/visual/critical-pages.spec.ts --update-snapshots
```

Commit the resulting `__screenshots__/**/*.png` files.

### Diff threshold

Set in `playwright.config.ts`:

```ts
expect: { toHaveScreenshot: { maxDiffPixelRatio: 0.02 } }
```

i.e. up to 2% of pixels may differ before a snapshot fails. This absorbs
font hinting / anti-aliasing delta across machines without masking real
regressions.

### Mitigating flakiness

The visual specs already:

- Inject a stylesheet that disables animations / transitions before each
  screenshot.
- Mask dynamic regions: countdowns, hero images, avatars, leaflet tiles,
  videos.
- Use fixed viewport sizes (mobile = 390x844, desktop = 1280x800).
- Use `fullPage: false` to keep snapshots bounded by viewport.

If a new dynamic region appears on a tracked page, add it to the `mask`
array on that page's spec.

---

## 4. Cross-zone smoke matrix

`tests/e2e/smoke-zones.spec.ts` covers six NIVY zones:

| Zone        | Path           | Expectation                                |
| ----------- | -------------- | ------------------------------------------ |
| public      | `/`            | 200, marketing nav visible, no JS errors   |
| teen        | `/teen`        | 200/307/308 → `/auth/login`, no JS errors  |
| parent      | `/parent`      | 200/307/308 → `/auth/login`, no JS errors  |
| partner     | `/partner`     | 200/307/308 → `/auth/login`, no JS errors  |
| admin       | `/admin`       | 200/307/308 → `/auth/login`, no JS errors  |
| ambassador  | `/ambassador` | 200/307/308 → `/auth/login`, no JS errors  |

These specs do not log in — they verify routing, redirects, and that
unauthenticated visits to gated zones land safely on the login page.

---

## 5. Theme matrix

`tests/e2e/theme-matrix.spec.ts` checks `home`, `login`, and `aide` in both
`light` and `dark` color schemes (via `page.emulateMedia()`).

For each page/scheme it samples up to 10 visually-important elements and
asserts a 3:1 contrast floor between resolved foreground and the nearest
opaque background. There is also a dedicated check that `bg-lime`, `bg-mint`,
`bg-peach`, and `text-on-bright` keep dark text against bright accent
backgrounds in both modes.

For full WCAG-AA coverage refer to the axe scans in `tests/a11y/`.

---

## 6. Performance smoke

`tests/e2e/performance.spec.ts` collects LCP, FCP, and total JS transfer for
`/` and attaches the payload to the HTML report. Targets (informational —
the spec uses `test.fail()` so a budget breach surfaces but does not crash
CI):

| Metric            | Budget       |
| ----------------- | ------------ |
| LCP               | < 4000 ms    |
| FCP               | < 2500 ms    |
| Total JS transfer | < 500 KB     |

Real performance budgets live in `docs/performance-budget.json` and are
enforced by Lighthouse CI in production deploys.

---

## 7. "Ready to merge" checklist

A PR is mergeable when **all** of the following are green:

1. `npm run lint -- --quiet` exits 0 — no warnings, no errors.
2. `npm run typecheck` exits 0.
3. `npm run test:run` passes 52/52 (or whatever the current count is).
4. `npm run test:e2e` passes locally OR the GitHub Actions `e2e` job is
   green on the PR.
5. New visual baselines (if any) committed under
   `tests/visual/__screenshots__/`.
6. New a11y violations are reviewed; only `serious`/`critical` block (see
   `tests/a11y/critical-pages.spec.ts`).
7. Commit message follows the conventional style (`Fix:`, `Add:`, `Update:`).

---

## 8. Maintenance pointers

- When adding a new zone, append it to the `ZONES` table in
  `tests/e2e/smoke-zones.spec.ts` and to section §4 of this guide.
- When adding a new accent button color, extend the gen-z accent assertions
  in `tests/e2e/theme-matrix.spec.ts`.
- When intentionally changing the visual design of a tracked page, run the
  `--update-snapshots` flow and commit the new PNGs in the same PR.
- Snapshots are stored at `tests/visual/__screenshots__/<spec>/<image>.png`.
  Do not edit them by hand.
