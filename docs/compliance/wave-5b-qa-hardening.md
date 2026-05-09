# Wave 5B — Closed-beta QA hardening (2026-05-09)

> Closed beta. No production deploy. No new feature. No fake data.
> Goal: when a runtime error happens in any role tree, it surfaces a
> branded error page (not a bare 500). And we have a one-shot smoke
> script to catch routing regressions before each closed-beta cycle.

## Scope closed

### A. Per-role `error.tsx` boundaries — ✅
Two role trees were missing their `error.tsx`, so a runtime exception
deeper in the tree would have bubbled to the root boundary and lost the
role context (and the role-home button). Filled in:

- `app/ambassador/error.tsx` — uses canonical `PageError`, home →
  `/ambassador`.
- `app/mentor/error.tsx` — uses canonical `PageError`, home →
  `/mentor/dashboard`.

The other 4 role trees (teen, parent, partner, admin) already shipped
their own boundaries in earlier waves; verified present.

### B. `npm run smoke` — closed-beta route smoke test — ✅
- New `scripts/smoke-routes.mjs` — node-only HTTP probe that exercises
  **40 canonical routes** against an already-running dev server:
  - **Public render** (`/`, `/agenda`, `/clubs`, `/anniversaires`,
    `/marketplace`, `/legal/cgv`, `/legal/cgu`, `/aide`, `/auth/login`,
    `/auth/sign-up`).
  - **Wave 5A redirect stubs** with an `expectLocationPrefix` check —
    `/autorisations*` → `/parent/approvals`,
    `/notifications*` → `/auth/redirect`, `/gamification` → `/teen`,
    plus `/gamification/missions`, `/gamification/defis`,
    `/teen/shop`.
  - **Auth-gated role homes** (`/teen`, `/parent`, `/partner`,
    `/admin`, `/ambassador`, `/mentor/dashboard`) — accept either a 200
    render (auth-aware page) or a 30x to `/auth/login`.
  - **Wave 5A new dock targets** (`/partner/settings`,
    `/admin/evenements`, `/admin/moderation`, `/admin/logs`,
    `/ambassador/boutique`, `/ambassador/commissions`).
  - **Auth-gated key routes** from Waves 3-4 (parent approvals,
    teens/add, wallet, quests, social, profile, activity).
- New `npm run smoke` script in `package.json`.
- The probe uses `redirect: "manual"` so we can verify the canonical
  redirect target, not just "got 30x" — catches the case where a
  redirect stub was rewired to the wrong target.

What this is **not**:
- Not a Playwright e2e — no real signup, no real DB writes, no JS
  rendering.
- Not a deploy gate — it requires the dev server running locally.
- Not a load test.

What it catches:
- Bookmark / dock dead links.
- Middleware regressions (every route 308'ing in a loop).
- Redirect stubs pointing at the wrong target.
- 500s from a missing import or typo in a layout / middleware.

### C. Static guard — ✅
- `tests/unit/wave5b-qa-hardening.test.ts` — **13 green tests**:
  - Every role tree has its own `error.tsx`.
  - Root + global error boundaries present.
  - Smoke script exists and is wired into `npm run smoke`.
  - Smoke script enumerates Wave 5A redirect stubs.
  - Smoke script covers all 5 role homes.
  - Smoke script verifies redirect Location targets (not just status).

### D. Compliance JSON + this doc — ✅
- `compliance-findings.json` — v2.3-wave5a → v2.4-wave5b. overall
  **84 → 85**. core **86 → 87**. (No single domain moved; this is a
  cross-cutting +1 from closing the runtime crash + smoke debt.)

## Out of scope (intentional)

- `not-found.tsx` per role — root `app/not-found.tsx` already covers it
  via Next.js fallback; per-role 404 would be cosmetic, not a fix.
- Honest empty-states sweep — too broad for one wave; will pick this up
  if a closed-beta tester actually surfaces a fake "0 results" state.
- A real Playwright e2e signup flow — that requires real test accounts
  + real magic links + a clean DB; out of closed-beta scope. Smoke
  covers the structural gap; e2e covers the behavioral gap and is
  scheduled with D.1.
- Any production deploy / secret rotation.

## Final gates

| Gate | Result |
|---|---|
| `check:env` | ✅ 11 present / 0 missing |
| `lint:canon` (`--enforce`) | ✅ 1 improvement; 206 baseline; 0 net-new |
| `typecheck` | ✅ clean |
| `test:run` (full suite) | ✅ **55 files / 465 tests passed** |
| `npm run smoke` | manual — requires `npm run dev` running |

## Next

Wave 5C — Design / mobile a11y polish.
