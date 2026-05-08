# W4-A1 — Visual Regression Audit

**Agent**: W4-A1 (visual regression engineer)
**Wave**: UX-Sprint Wave 4 (post-launch polish validation)
**Mode**: read-only audit, no code changes, no test execution
**Date**: 2026-05-08

---

## 1. Status of visual-regression infra in repo

### What IS in place

- **Test runner**: Playwright `1.57.0` (`@playwright/test`), already wired into `npm run test:e2e`.
- **Snapshot tool**: Playwright's built-in `expect(page).toHaveScreenshot()` — no third-party (Percy / Chromatic / Loki / Argos) integration.
- **Config**: `C:\Users\Shadow\Desktop\NIVY\playwright.config.ts`
  - `testMatch` includes `visual/**/*.spec.ts` (visual suite is already a first-class citizen of the runner).
  - `snapshotPathTemplate` → `tests/visual/__screenshots__/<spec>/<name>.png` (baselines colocated).
  - `expect.toHaveScreenshot.maxDiffPixelRatio = 0.02` (2 % diff tolerance — sane default for AA / font drift).
  - Single browser project: `chromium` only (no WebKit / Firefox).
  - `webServer` boots `next start` before tests; reuses existing dev server locally.
- **Spec authored**: `C:\Users\Shadow\Desktop\NIVY\tests\visual\critical-pages.spec.ts` covers **5 captures** total:
  1. `/` @ mobile (390 × 844)
  2. `/` @ desktop (1280 × 800)
  3. `/auth/login` @ mobile
  4. `/aide` @ mobile
  5. `/agenda` @ desktop
  - Animations disabled via injected stylesheet, dynamic regions masked (countdowns, event imagery, leaflet tiles, video).
- **a11y**: parallel suite at `tests/a11y/critical-pages.spec.ts` (axe-core) — independent of visual diffs but useful signal.

### What is MISSING

- **No baseline PNGs committed** — `tests/visual/__screenshots__/**/*.png` glob returns zero files. The first `npm run test:e2e` run on the visual project will write baselines, not fail. **No regression coverage exists today.**
- **No Percy / Chromatic / Argos cloud diffing** — review happens locally only; PR diff comments are not posted.
- **No CI workflow shown** to run `playwright test tests/visual` automatically (no `.github/workflows/visual.yml` was found in the typical path; if present it was not surfaced in repo root).
- **Single viewport per route** — current spec captures only mobile-or-desktop, not the 4-tier responsive matrix.
- **Single browser** — chromium only; no Safari (iOS) coverage despite the product's heavy mobile-Safari user base (teens).
- **No auth-fixture pattern** — every captured page is public; the entire `/teen`, `/parent`, `/admin`, `/partner` surface (the bulk of the redesign) is uncovered.
- **No theme matrix in visual suite** — `tests/e2e/theme-matrix.spec.ts` exists but is functional, not visual.

### Verdict

Infra is **scaffolded but inactive**. Roughly 2 % coverage of the surfaces touched in Waves 1–3.

---

## 2. Proposed minimal config (no install)

**Recommendation: keep Playwright + `toHaveScreenshot`. Do NOT add Storybook / Chromatic.**

Reasons:
- Playwright is already in the toolchain; Chromatic would duplicate runners and double CI minutes.
- Most regression risk is **page-level layout** (FLIP, View Transitions, skeletons), not isolated components → Storybook stories would not surface those failures.
- `toHaveScreenshot` baselines live in git → reviewable in PRs, free, no third-party data residency.

### Proposed delta to `playwright.config.ts`

Add a dedicated `visual` project so the suite can be invoked in isolation and parallel matrix viewports are first-class:

```ts
// proposal — do NOT apply in this audit
projects: [
  { name: "chromium", use: { ...devices["Desktop Chrome"] } },
  {
    name: "visual-mobile",
    testDir: "./tests/visual",
    use: { ...devices["iPhone 14"], viewport: { width: 375, height: 812 } },
  },
  {
    name: "visual-tablet",
    testDir: "./tests/visual",
    use: { viewport: { width: 768, height: 1024 } },
  },
  {
    name: "visual-desktop",
    testDir: "./tests/visual",
    use: { viewport: { width: 1280, height: 800 } },
  },
  {
    name: "visual-wide",
    testDir: "./tests/visual",
    use: { viewport: { width: 1920, height: 1080 } },
  },
]
```

### Proposed CI hook (sketch only)

- New script `npm run test:visual` → `playwright test --project=visual-mobile --project=visual-tablet --project=visual-desktop --project=visual-wide`.
- GitHub Actions job `visual-regression` triggered on PRs that touch `app/**`, `components/**`, `styles/**`, or any `*.css` / token file.
- On failure: upload `playwright-report/` as an artifact and post a comment with the diff PNGs (Playwright HTML reporter is enough; no Chromatic needed at this stage).

### Auth fixture (required for 24 of the 30 routes below)

Add `tests/visual/fixtures/auth.ts` with three storage-state files seeded from a synthetic test tenant:
- `teen.storageState.json`
- `parent.storageState.json`
- `admin.storageState.json`
- `partner.storageState.json`

Each visual spec selects its fixture via `test.use({ storageState: ... })`. Without this, all role-gated routes redirect to `/auth/login` and the snapshots are useless.

---

## 3. Top 30 routes for the snapshot suite

Grouped by role, prioritised by traffic × Wave-1–3 churn risk.

### Public / Auth (3)
1. `/` — landing
2. `/auth/login`
3. `/auth/sign-up`

### Onboarding (2)
4. `/onboarding`
5. `/onboarding/interests`

### Teen role (10)
6. `/teen` — dashboard
7. `/teen/quests`
8. `/teen/wallet`
9. `/teen/shop`
10. `/teen/feed`
11. `/teen/profile`
12. `/teen/rides` *(new in Wave 2)*
13. `/teen/food` *(new in Wave 2)*
14. `/teen/mentors` *(new in Wave 2)*
15. `/teen/leaderboard`

### Parent role (6)
16. `/parent` — dashboard
17. `/parent/teens`
18. `/parent/approvals`
19. `/parent/budget`
20. `/parent/chores`
21. `/parent/rides` *(new in Wave 2)*

### Partner role (4)
22. `/partner` — dashboard
23. `/partner/offers`
24. `/partner/scanner`
25. `/partner/restaurant/orders` *(new in Wave 2)*

### Admin role (3)
26. `/admin` — dashboard
27. `/admin/utilisateurs`
28. `/admin/analytics`

### Cross-role / shared (2)
29. `/agenda` — public events list
30. `/aide` — help center

---

## 4. Visual-risk classification (post-Wave 1–3)

Risk legend:
- **LOW** — token-only churn (colour, spacing, typography vars). Pixel diffs expected at baseline-write only.
- **MEDIUM** — `loading.tsx`, skeleton, or token sweep landed; layout reshuffle possible at hydration boundary.
- **HIGH** — FLIP animation, View Transitions API, or new layout/grid landed in Waves 1–3. Baselines must be re-captured deliberately.

| # | Route | Risk | Driver |
|---|-------|------|--------|
| 1 | `/` | MEDIUM | hero token sweep + new skeleton |
| 2 | `/auth/login` | LOW | tokens only |
| 3 | `/auth/sign-up` | LOW | tokens only |
| 4 | `/onboarding` | MEDIUM | new loading state |
| 5 | `/onboarding/interests` | MEDIUM | skeleton + token sweep |
| 6 | `/teen` | HIGH | FLIP on quest cards + View Transitions for nav |
| 7 | `/teen/quests` | HIGH | FLIP grid reorder |
| 8 | `/teen/wallet` | HIGH | new layout (Wave 2 lifestyle batch) + FLIP coins |
| 9 | `/teen/shop` | MEDIUM | skeleton + token sweep |
| 10 | `/teen/feed` | HIGH | View Transitions on feed-item open |
| 11 | `/teen/profile` | MEDIUM | token + skeleton |
| 12 | `/teen/rides` | HIGH | new surface (Wave 2) |
| 13 | `/teen/food` | HIGH | new surface (Wave 2) |
| 14 | `/teen/mentors` | HIGH | new surface (Wave 2) |
| 15 | `/teen/leaderboard` | MEDIUM | skeleton |
| 16 | `/parent` | HIGH | new dashboard layout (Wave 2) |
| 17 | `/parent/teens` | MEDIUM | skeleton |
| 18 | `/parent/approvals` | MEDIUM | skeleton + token |
| 19 | `/parent/budget` | HIGH | recharts re-skin + new layout |
| 20 | `/parent/chores` | HIGH | new surface (Wave 2) |
| 21 | `/parent/rides` | HIGH | new surface (Wave 2) |
| 22 | `/partner` | MEDIUM | tokens + skeleton |
| 23 | `/partner/offers` | MEDIUM | skeleton |
| 24 | `/partner/scanner` | LOW | tokens only (camera surface unchanged) |
| 25 | `/partner/restaurant/orders` | HIGH | new surface (Wave 2) |
| 26 | `/admin` | LOW | tokens only |
| 27 | `/admin/utilisateurs` | LOW | tokens, table unchanged |
| 28 | `/admin/analytics` | MEDIUM | recharts re-skin |
| 29 | `/agenda` | MEDIUM | skeleton + leaflet (already masked) |
| 30 | `/aide` | LOW | tokens only |

**Tally**: 6 LOW · 12 MEDIUM · 12 HIGH.

The 12 HIGH-risk routes should be the **first to receive baselines** and the **first to gate CI**. The 6 LOW ones can be batched in a single follow-up PR.

---

## 5. Recommended viewport set

| Tier | Width × Height | Represents |
|------|----------------|------------|
| `mobile` | **375 × 812** | iPhone SE / 13 mini / Android compact |
| `tablet` | **768 × 1024** | iPad portrait, Android tablet |
| `desktop` | **1280 × 800** | typical laptop, current default |
| `wide` | **1920 × 1080** | external monitor / founder demo screen |

Notes:
- 375 (not 390) is the conservative iPhone SE width — catches container overflows that the current 390-px capture misses.
- 768 is the Tailwind `md` breakpoint; many sidebars / nav drawers flip here.
- 1920 catches `max-width` container failures and stretched hero images on demo monitors.
- **Total snapshots if applied**: 30 routes × 4 viewports = **120 baselines**. At Playwright PNG sizes (~120 KB each) that is ~14 MB in git — acceptable.

---

## 6. Manual smoke-test checklist (founder, pre-CI)

12 must-check pages, 1 must-check interaction each. Run on **mobile Safari (real iPhone)** then re-run on a 1280-px Chrome window. Flag anything that drifts from the Wave-3 Figma.

| # | Page | Must-check interaction |
|---|------|------------------------|
| 1 | `/` | Scroll past hero — countdown ticks without layout jump (CLS = 0). |
| 2 | `/auth/login` | Submit empty form — error messages render in token red, no shift. |
| 3 | `/onboarding/interests` | Tap 3 interest chips — selection state animates, persists on Next. |
| 4 | `/teen` | Tap a quest card — View Transition fires, header element morphs to detail. |
| 5 | `/teen/quests` | Complete a quest — FLIP reorder runs once, no double-trigger. |
| 6 | `/teen/wallet` | Open the coin breakdown drawer — backdrop fades, focus traps. |
| 7 | `/teen/feed` | Pull-to-refresh — skeleton placeholders match real card heights (no jump). |
| 8 | `/teen/rides` | Open ride request flow — map tile loads, no white flash. |
| 9 | `/parent` | Switch active teen via the selector — dashboard re-skeletons cleanly. |
| 10 | `/parent/budget` | Resize the chart container — recharts reflows without overflow. |
| 11 | `/partner/scanner` | Grant camera permission — viewfinder fills, no aspect-ratio break. |
| 12 | `/admin` | Open the user-management table — sticky header stays pinned on scroll. |

If any of the 12 fails, file a P0 bug before re-baselining the visual suite — re-capturing on top of a regression cements the bug.

---

## Summary for the founder

- Visual-regression infra is **scaffolded** (Playwright + `toHaveScreenshot`) but **dormant** — only 5 captures, no baselines committed, no CI gate.
- Recommendation: **keep Playwright**, add 4-viewport project matrix, seed auth fixtures, baseline the 12 HIGH-risk routes first.
- Do not bring in Chromatic / Percy at this stage — added cost, redundant runner.
- Manual 12-step smoke test (above) is the right interim guard while the suite is being built.
