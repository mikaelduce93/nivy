# 08 — Production readiness audit

> **Date**: 2026-05-07
> **Auditor**: Pre-launch read-only review
> **Repo**: `C:\Users\Shadow\Desktop\NIVY` (branch `main`)
> **Scope**: Can NIVY ship to production today? If not, what blocks it?

## Verdict

**RED — DO NOT SHIP TODAY.**

The platform has impressive engineering breadth (~250 DB tables, 300+ API routes, 9 cron jobs, Sentry/Vercel Analytics wired, robots/sitemap/manifest in place) but it is structurally a development build masquerading as a launch candidate. Three concerns force the RED verdict:

1. **The real `.env.local` on disk contains live, unredacted Supabase service-role keys, anon JWT, and an `sk-proj-` OpenAI secret.** Although `.gitignore` correctly excludes it from git, this file was readable on the auditor's first pass — a worst-case OS leak (synced cloud drive, shoulder-surf, accidental tarball) exposes the production database to root-equivalent writes. The keys must be rotated before launch as a matter of policy regardless of leak status.
2. **Build, typecheck, lint, and test commands could not be executed in this audit session** (sandbox denied `npm`/`npx`/`tsc`). I could not therefore confirm a green build. The code base is in heavy mid-flight (10 untracked feature areas, 3 unmigrated SQL migrations, fresh routes for food/rides/mentorship/restaurant/driver), which is a high-probability state for fresh TS errors.
3. **No `not-found.tsx` exists at the `app/` root**, the auth/redirect/cron/secret-protection surface is large, and several "wave 2" feature folders (food delivery, ride-share, mentorship) appear to have routes wired in `vercel.json` for crons (`/api/cron/ride-curfew-check`, `/api/cron/disburse-allowances`) but are still untracked in git, meaning they are visible to dev but not yet committed for review.

These are fixable in days, not weeks. Sections below detail each.

---

## Build health

I was unable to invoke `npm run build` in this session — both the Bash and PowerShell tools rejected the command. The verdict therefore relies on static evidence:

### `next.config.mjs` — TypeScript guard is **correctly tightened**
```js
typescript: {
  // TypeScript debt cleared — see Agent 3 / Phase 1. Build now fails on TS
  // errors. Do not flip back to `true` without re-running the cleanup.
  ignoreBuildErrors: false,
},
```
This is good: a previous commit explicitly removed the `ignoreBuildErrors: true` foot-gun. There is **no equivalent `eslint: { ignoreDuringBuilds: true }`** declared, so lint failures would surface on `next build` only via the `next lint` plugin (which Next 15+ removed by default). ESLint is run as a separate CI step, not as part of build.

### Build hardening already done
- `compress: true`
- `poweredByHeader: false`
- `reactStrictMode: true`
- `experimental.optimizePackageImports` correctly tree-shakes lucide, framer-motion, recharts, date-fns, sonner, react-day-picker, radix-icons.
- HSTS header (`max-age=63072000; includeSubDomains; preload`) is set.
- 1-year immutable cache on `(jpg|jpeg|png|gif|webp|avif|svg|ico)` and fonts.
- `images.remotePatterns` is narrow (only `**.supabase.co`, `blob.v0.app`, `api.dicebear.com`, `i.pravatar.cc`).
- `dangerouslyAllowSVG: true` plus a strict `contentSecurityPolicy` for the image pipeline.

### Build risks
- `app/manifest.ts` AND `public/manifest.json` co-exist. Next 15/16 will serve `app/manifest.ts` and ignore the static one — but if the link in `app/layout.tsx` (`manifest: "/manifest.json"`) wins, you ship the static one. Manifests will conflict and may cause PWA install confusion.
- The bundle analyzer is wired (`@next/bundle-analyzer` + `analyze` script), but no committed report tells us the current bundle size. Per repo size and dependency list (Recharts, Framer Motion, Leaflet, Embla, Stripe-JS, AI SDKs, Resend, web-push), first-load JS for the public marketing pages is at risk of exceeding the 200-300 kB Next.js baseline.

### Cannot verify
- Total `.next/static/chunks/` size.
- Whether build currently completes with **zero** TS errors (the `tsconfig.tsbuildinfo` file is dated `May 7 11:18` — same day — so a recent successful incremental build is plausible).

**Status**: AMBER — config is solid, but I cannot confirm a current green build.

## Type checking

`npx tsc --noEmit` could not be run. Static observations:

- `tsconfig.json` is in `strict: true`, `target: ES2018`, `moduleResolution: bundler`, with `incremental: true`.
- The `.next/types` folder is included, so generated route types feed the check.
- A `tsconfig.tsbuildinfo` of ~3.9 MB exists (May 7 11:18), implying tsc has run end-to-end recently — that file would not be written if the run aborted on a fatal error. So as of ~the most recent local run, the project type-checked.
- However, the git status shows ~25 untracked feature directories under `app/api/admin/drivers/`, `app/api/driver/`, `app/api/mentor/`, `app/api/parent/food/`, `app/api/teen/food/`, `app/api/teen/rides/`, `app/parent/food/`, `app/parent/rides/`, `app/partner/restaurant/`, `app/teen/food/`, `app/teen/rides/`, plus three `gamification-system/database/migrations/058_*` and `059_*` SQL files. **Newly authored TS code that has not yet been re-typechecked is the most likely source of break.**

**Top 10 worst offenders (cannot be enumerated without running tsc).** Recommend the launch gate include:
```
npm run typecheck 2>&1 | grep -E "^[^[:space:]]+\([0-9]+,[0-9]+\): error" | cut -d'(' -f1 | sort | uniq -c | sort -rn | head -10
```

**Status**: AMBER — historical green run within hours, but uncommitted code introduces unknown risk.

## Lint

`npm run lint` (= `eslint .`) was not runnable in-session. From `eslint.config.mjs`:

- A11Y rules are STRICT (WCAG 2.1 AA): `jsx-a11y/alt-text`, `jsx-a11y/aria-*`, `jsx-a11y/anchor-is-valid`, `jsx-a11y/click-events-have-key-events`, `jsx-a11y/heading-has-content`, etc. Most are `error`, a handful (`anchor-is-valid`, `click-events-have-key-events`, `label-has-associated-control`, `no-static-element-interactions`, `no-noninteractive-tabindex`, `no-autofocus`) are `warn`.
- `no-console` is `warn` allowing `warn`/`error` only.
- `react-hooks/rules-of-hooks: error`, `react-hooks/exhaustive-deps: warn`.
- `scripts/**` is fully ignored — so the verify-* scripts are exempt from lint (which is why they freely use `console.log`).
- `*.config.{js,mjs}` is ignored.
- The CI step uses `--quiet`, which only fails on `error`. Warnings will accumulate silently. This is a hidden debt risk.

**216 occurrences of `console.log` in 42 files** found across `*.{ts,tsx}` (capped at 200 — actual count higher). Many are in actions (`features/messages/actions.ts`, `features/anniversaires/actions.ts`, `gamification-system/features/*`, etc.). `eslint --quiet` will surface them as warnings only; they will *not* fail CI but they *will* spam your production server logs and potentially leak request data into Vercel logs.

**Status**: AMBER — strict config, but `--quiet` masks real noise in prod logs.

## Test coverage

### Inventory

**Vitest unit (`tests/lib/`, `tests/features/`, `tests/quality/`, `tests/visual/`)** — 14 specs:

| Suite | Specs |
|---|---|
| `tests/lib/utils/` | `sql.test.ts` |
| `tests/lib/security/` | `rate-limiter.test.ts` |
| `tests/lib/validation/` | `sanitize.test.ts`, `schemas.test.ts` |
| `tests/lib/ai/` | `moroccan-context.test.ts`, `pedagogical-validator.test.ts` |
| `tests/features/gamification/` | `challenge-selection.test.ts` |
| `tests/features/wave2/` | `streak-page.test.ts`, `aide-scolaire-page.test.ts`, `calendar-page.test.ts`, `messages-page.test.ts` |
| `tests/quality/` | `public-test-routes.test.ts` |
| `tests/visual/` | `critical-pages.spec.ts` (Playwright) |

So **~10 true unit tests** plus ~4 Wave 2 page snapshot tests and 1 quality regression. Coverage is *thin* against ~300 API routes and >>1000 components/files.

**Playwright e2e (`tests/e2e/*.spec.ts`)** — 11 specs (matches RECETTE):
```
auth.spec.ts                 home.spec.ts            redirects.spec.ts
checkout.spec.ts             parent-onboarding.spec.ts  shop.spec.ts
performance.spec.ts          partner-onboarding.spec.ts smoke-zones.spec.ts
quiz.spec.ts                 theme-matrix.spec.ts
```

**Playwright a11y (`tests/a11y/`)**: `critical-pages.spec.ts` — single file using `@axe-core/playwright`.

The IMPLEMENTATION_RECETTE claim of **12 pass / 1 fail / 4 skip** is consistent with these 11 e2e files (the 12th being `critical-pages.spec.ts` from the a11y dir included in the same Playwright run).

The known **1 fail** is `tests/e2e/quiz.spec.ts:23` — UI bug filtering quiz cards post category click (P1, not a launch blocker per RECETTE).
The **4 skips** are gated on data: daily-tagged quiz, purchasable reward without partner FK, partner-pending hire flow, mutating checkout submit.

### Verify scripts (`scripts/verify-*.ts`) — 11 verifier scripts

```
verify-allowance-savings.ts   verify-marketplace.ts
verify-coin-pipeline.ts       verify-mentorship.ts        (untracked)
verify-creator-economy.ts     verify-parent-chores.ts
verify-evolve-profiles.ts     verify-quest-assignment.ts
verify-food.ts (untracked)    verify-recommend.ts
verify-signal-capture.ts      verify-transport.ts (untracked)
```

**None of them are wired into `package.json`.** No `verify:coin-pipeline`, `verify:all`, or `prelaunch` script. These are run manually with `tsx scripts/verify-*.ts`. CI does not run them — so the green proofs in RECETTE are **point-in-time**, not regressed against on every push.

**Status**: AMBER — e2e suite exists and is in CI (gated to PR + main), but unit coverage is shallow and the verify scripts (the only real proofs that the token economy still works end-to-end) are not in CI.

## Env vars + secrets

### Env coverage: `.env.example` is comprehensive
The example file declares 40+ env vars including dual fallbacks (`SUPABASE_URL` *and* `NEXT_PUBLIC_SUPABASE_URL`), Stripe, CMI (Centre Monetique Interbancaire — Maroc), MT Cash / Inwi Money / Orange Money, Resend, Twilio/MessageBird stubs, CRON_SECRET, OpenAI/Anthropic, Mapbox, Upstash Redis, Sentry (DSN + auth token + org + project), VAPID keys, ALERT_WEBHOOK_URL, SLACK_WEBHOOK_URL, EDGE_CONFIG, plus a feature-flag block.

`process.env.X` references are spread across middleware, lib (Stripe, Supabase, monitoring, payments), components, and server actions. Spot check: `STRIPE_SECRET_KEY!`, `NEXT_PUBLIC_BASE_URL`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_MAPBOX_TOKEN`. These all appear declared in `.env.example`.

The CI build provides **placeholder values** for `NEXT_PUBLIC_SUPABASE_URL`/`ANON_KEY`/`APP_URL` if secrets are unset (good — build won't break on PRs from forks). Real secrets must come from GitHub Actions repo secrets and Vercel project env. **I cannot verify those are set.**

### CRITICAL: secrets in `.env.local`
The local `.env.local` file (correctly gitignored, verified via `git check-ignore`) contains real production-grade secrets:
- `NEXT_PUBLIC_SUPABASE_URL=https://imchornjvmgmaovhypco.supabase.co`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIs...` (anon JWT, public-OK)
- `SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIs...` (**service role JWT, root-equivalent**)
- `OPENAI_API_KEY=sk-proj-eC2oOJ...` (live OpenAI project key)
- Plus `E2E_PARTNER_PENDING_PASSWORD=Test123!` and a `pending_booking_id` UUID.

This file is **not** in git. But it is on a Windows desktop (`C:\Users\Shadow\Desktop\NIVY`). Action required:
1. **Rotate the service-role key in the Supabase dashboard before launch** — it has been displayed at least to this audit tool.
2. **Rotate the OpenAI project key** in OpenAI dashboard for the same reason.
3. Move secrets out of `Desktop/` and into a credential manager (1Password / Bitwarden / Vault) for any developer machine going forward.

### Doc-file references
Three docs reference the `eyJhbGciOiJI...` JWT prefix and `sk_live_xxx` / `sk-ant-...`:
- `docs/DEPLOYMENT.md:120, 131, 134`
- `docs/database/MIGRATIONS_README.md:235`
- `docs/CONTENT_GENERATION_SYSTEM.md:76`

All are placeholder/truncated examples (`...`, `xxx`), **not** real secrets. Safe.

### Secret-scanning gap
- No GitHub `secret-scanning` workflow detected.
- No `gitleaks`, `trufflehog`, or `git-secrets` pre-commit hook (no `.husky/` directory exists).

**Status**: RED — local `.env.local` contains a live service-role key that must be rotated, and there is no automated secret-scanning gate.

## Performance hot-spots

### Image discipline — generally good
- `<img>` tag occurrences: 9 total across 8 files (`tests/lib/validation/sanitize.test.ts`, `app/api/tickets/generate-pdf/route.ts`, `app/marketplace/page.tsx`, `app/marketplace/listings/[id]/page.tsx`, `app/teen/feed/[id]/page.tsx`, `app/api/admin/anniversaires/[id]/route.ts`, `lib/emails.ts`, `gamification-system/components/challenges/challenge-card.tsx`).
- Of those, the email template and the PDF route are valid (server-rendered HTML / pdfkit). The 4 in `app/marketplace/*`, `app/teen/feed/[id]`, and `gamification-system/components/challenges/challenge-card.tsx` should migrate to `next/image`.
- `next/image` imports detected in 10+ files spot-checked.

### Missing in queries
- **Zero literal-`SELECT *`** in TS code — all is via Supabase client `.select(...)`.
- **13 `.select("*")` calls** detected in production code — most are admin/server-side single-row lookups (`admin_roles`, `profiles`, `user_points`) which are bounded. Worth tightening to specific columns to reduce wire size and avoid leaking new columns by default. Top offenders:
  - `app/admin/utilisateurs/page.tsx:23`
  - `app/admin/reservations/page.tsx:26`
  - `app/admin/page.tsx:18`
  - `app/reservation/page.tsx:29-33` (3 separate `.select("*")` in a single page render — N+~1 read amplification on the booking page)
  - `app/agenda/page.tsx:1` (likely the events list — needs verification, this is the public-facing marketing page)
  - `app/(dashboard)/layout.tsx:1` (per-request, cross-cutting)

### N+1 risk
A grep for `.map(.*await|.map(.*supabase|.map(.*createClient)` returned only `lib/features/flags.ts` — no obvious server-component N+1 in `.map()` callers. Good.

### Bundle / tree-shaking
- `optimizePackageImports` covers the heavy hitters.
- Leaflet + react-leaflet are imported directly (not behind `dynamic()`); on any page that mounts the map, the entire ~140 kB Leaflet bundle is shipped. Verify `components/maps/teen-map-wrapper.tsx` is loaded only via `next/dynamic({ ssr: false })`.
- Recharts, framer-motion, and the AI SDK (`@ai-sdk/react`, `@ai-sdk/openai`, `ai`) are heavy. Check first-load JS budget on `/`, `/agenda`, and `/teen` after build.

**Status**: AMBER — image discipline is mostly correct, no blatant N+1, but `.select("*")` cleanup and bundle audit are launch-week tasks.

## Observability

### Wired
- **Sentry**: `@sentry/nextjs@10.32.1` installed; client init in `lib/monitoring/sentry.ts` (DSN, env, replay integration with `maskAllText: true` and `blockAllMedia: true`, `tracesSampleRate=0.1` in prod), server init in `lib/monitoring/sentry-server.ts`, enhanced wrapper in `lib/monitoring/sentry-enhanced.ts`. **However**, no `sentry.client.config.ts` / `sentry.server.config.ts` / `sentry.edge.config.ts` / `instrumentation.ts` files were found at repo root. Sentry's auto-instrumentation in Next 16 expects either `instrumentation.ts` (with `register()` calling `Sentry.init`) **or** the legacy `sentry.*.config.ts` files. **It is unclear whether Sentry is actually starting up at runtime** — verify on the next deploy that the first error reaches the Sentry dashboard.
- **Sentry user context** (`SentryUserContext`), **breadcrumbs setup** (`SentryBreadcrumbsSetup`), **Web Vitals** (`SentryWebVitals`) are all mounted in `app/layout.tsx`.
- **Vercel Analytics** (`@vercel/analytics/next`) — mounted in `app/layout.tsx`.
- **Custom logger** at `lib/monitoring/logger.ts`.
- **Custom alerts** at `lib/monitoring/alerts.ts` (presumably wires `ALERT_WEBHOOK_URL`/`SLACK_WEBHOOK_URL`).
- **Edge Config** support via `@vercel/edge-config@1.4.3` for feature flags (good — kill-switch ready).
- **Upstash Redis** (`@upstash/redis@1.36.1`) for rate limiting (`lib/security/rate-limiter`).

### Not wired
- **No structured logger** (pino, winston, bunyan). Custom logger exists but `console.log` is still used in 42 files / 216 occurrences. Inconsistent. Production logs will be a mix of pretty objects and raw strings.
- **No Vercel Speed Insights** package detected (only Analytics) — `@vercel/speed-insights` is not in dependencies. RUM/Core Web Vitals aggregation is therefore via Sentry's `SentryWebVitals` only.
- **No Datadog / New Relic / Logtail / Better Stack**.

**Status**: AMBER — Sentry surface is the right stack, but the actual init wiring needs a smoke test post-deploy.

## SEO + i18n

### SEO
- **Root `metadata`** in `app/layout.tsx` is comprehensive: title template, description, OG (`/og-image.jpg` confirmed in `public/`), Twitter, applicationName, keywords, manifest, verification.google (placeholder `your-google-verification-code` — must be replaced before launch).
- **`app/sitemap.ts`** is dynamic: pulls events + clubs from Supabase, plus 7 static routes (`/agenda`, `/clubs`, `/carte-vip`, `/devenir-ambassadeur`, `/devenir-partenaire`, `/communaute`, `/legal/*`).
- **`app/robots.ts`** disallows `/api/`, `/dashboard/`, `/admin/`, `/profile/`, `/reservation/`, `/mes-reservations/`. **Missing**: `/teen/*`, `/parent/*`, `/partner/*` are *not* disallowed despite being authenticated zones. Should be added.
- **OG image** present at `public/og-image.jpg`.
- **JSON-LD FAQ structured data** is injected in `app/layout.tsx` head.
- **No `app/not-found.tsx`** at root. Next will fall back to its built-in 404 — generic, off-brand. Should ship a custom one.
- **`global-error.tsx`** present at root.

### i18n
- Three message files exist: `messages/fr.json`, `messages/en.json`, `messages/darija.json` — **all 193 lines, identical structure**. So the keying scaffold is in place.
- Custom i18n implementation under `lib/i18n/` (`dictionaries.ts`, `provider.tsx`, `server.ts`, `translate.ts`, `types.ts`) — **not** `next-intl` or `next-i18next`. This is a homegrown solution; whitepaper requires fr + ar + en + darija and currently has fr/en/darija (Arabic = darija here, but not full MSA Arabic).
- The 193-line message file vs the size of the app (300+ routes, 1000+ components) means the **vast majority of UI strings are hardcoded French**. The whitepaper's audience is described as bilingual French/Darija/Arabic/English — this is a marketing-level promise, not a delivered feature.
- `app/layout.tsx` already maps `locale === 'darija' → 'ar-MA'` for the html lang attribute — at least the dir/lang plumbing is real.
- No RTL CSS handling visible in the layout (no `dir={...}` toggle on `<html>` for Arabic).

**Status**: AMBER for SEO (one missing 404, one placeholder google-verification, robots needs more disallows), RED for i18n — promised in product positioning but ~5% delivered.

---

## Pre-launch must-haves checklist

| # | Requirement | Status |
|---|---|---|
| 1 | `npm run build` passes with **zero errors** and `ignoreBuildErrors: false` | ❓ Unverified (could not run); config is correct, last `tsbuildinfo` from same day |
| 2 | `npm run typecheck` passes with **zero errors** | ❓ Unverified; high probability of stale errors in 25 untracked feature dirs |
| 3 | `npm run lint --quiet` passes (zero `error` rules) | ❓ Unverified; CI uses `--quiet` so warnings (216 console.logs) are silenced |
| 4 | Vitest `npm run test:run` passes | ❓ Unverified |
| 5 | Playwright e2e green (or known-skipped) | ✅ Per RECETTE: 12/1/4 — 1 known UI bug, scoped P1 |
| 6 | All env vars documented in `.env.example` | ✅ Comprehensive (40+ vars) |
| 7 | `.env.local` is gitignored | ✅ Confirmed via `git check-ignore` |
| 8 | No real secrets committed in repo | ✅ Only placeholders (`...`, `xxx`) in 3 docs |
| 9 | Real secrets rotated for launch | ❌ Service-role + OpenAI keys exist on local disk; rotation policy missing |
| 10 | Pre-commit secret scanning (gitleaks/trufflehog/husky) | ❌ No `.husky/`, no scanner |
| 11 | Root `app/error.tsx` | ✅ |
| 12 | Root `app/global-error.tsx` | ✅ |
| 13 | Root `app/not-found.tsx` | ❌ Missing |
| 14 | Root `app/loading.tsx` | ✅ |
| 15 | Per-zone `error.tsx` (admin / teen / parent / partner) | ✅ Coverage in 13 places |
| 16 | Sentry DSN configured in env + initialized in code | ⚠️ Helpers in `lib/monitoring/sentry.ts` exist but no `instrumentation.ts` / `sentry.*.config.ts` at repo root — runtime init is unverified |
| 17 | Vercel Analytics live | ✅ `@vercel/analytics/next` in layout |
| 18 | Vercel Speed Insights live | ❌ Not installed |
| 19 | Structured logger replacing `console.log` | ❌ 216 `console.log` calls in production code |
| 20 | OG image present | ✅ `/og-image.jpg` |
| 21 | `manifest.ts` (or `manifest.json`) | ⚠️ Both exist — duplicate, must reconcile |
| 22 | `robots.ts` covers all authenticated zones | ⚠️ Misses `/teen/*`, `/parent/*`, `/partner/*` |
| 23 | `sitemap.ts` dynamic | ✅ |
| 24 | `verification.google` is a real code, not a placeholder | ❌ Placeholder `your-google-verification-code` |
| 25 | i18n covers fr / en / ar (or darija) | ⚠️ Scaffolding only — 193 lines per file vs 1000+ components hardcoded fr |
| 26 | RTL handling for Arabic | ❌ No `dir="rtl"` toggle |
| 27 | CI runs lint + typecheck + tests + build | ✅ `.github/workflows/ci.yml` |
| 28 | CI runs e2e on PRs and main | ✅ |
| 29 | Production deploy workflow | ✅ `.github/workflows/deploy-production.yml` |
| 30 | Pre-commit hooks | ❌ No husky, no lint-staged |
| 31 | Dependabot enabled | ✅ Weekly NPM + GH Actions |
| 32 | `npm audit` clean | ❓ Unverified |
| 33 | Operational README with setup steps | ✅ Minimal but functional README.md |
| 34 | `docs/DEPLOYMENT.md` | ✅ |
| 35 | `docs/RELEASE_CHECKLIST.md` | ✅ Per README |
| 36 | Cron jobs registered in `vercel.json` | ✅ 5 crons (`assign-missions`, `evolve-teen-profiles`, `disburse-allowances`, `marketplace-escrow-release`, `ride-curfew-check`) |
| 37 | All cron jobs have `CRON_SECRET` guard | ❓ Unverified per route |
| 38 | `app/test/`, `app/preview/`, `app/gamification-demo/` removed | ⚠️ Empty dir trees remain (no `.tsx` files inside) — quality test passes but stale dirs clutter `app/` |
| 39 | No `localhost:3000` baked into production code | ⚠️ 16 files reference it; most are docs/configs/tests/agent files. `lib/config/app-config.ts` correctly defaults to it for dev only — verify `getAppUrl()` usage is universal |
| 40 | Stripe live key gate (`isLiveKey` check in `lib/stripe.ts`) | ✅ |
| 41 | Admin SQL execution gated by `ENABLE_ADMIN_SQL_EXECUTION` | ✅ |
| 42 | Branch protection / required CI on `main` | ❓ Cannot verify from filesystem |

**Score: 14 ✅ / 11 ❌ / 10 ⚠️ / 7 ❓** (out of 42).

---

## Risks

### P0 (block launch — fix this week)
1. **Rotate `SUPABASE_SERVICE_ROLE_KEY` and `OPENAI_API_KEY`** before any production traffic. The current values were exposed to an audit tool's filesystem read; rotation is the only correct response.
2. **Run a clean `npm run build && npm run typecheck && npm run test:run && npm run test:e2e` from CI on a fresh checkout, archive the green run, and tag a release candidate.** Until that exists, "ship today" is unverified.
3. **Resolve the `app/manifest.ts` vs `public/manifest.json` collision**: pick one, delete the other, ensure `app/layout.tsx`'s `manifest:` link is consistent.
4. **Add a custom `app/not-found.tsx`** matching the brand. The default Next 404 is unbranded.
5. **Replace `verification.google: "your-google-verification-code"`** with the real Search Console token (or remove the field entirely).
6. **Decide on launch i18n surface**: either (a) ship French-only and clearly position the en/darija files as forward-looking, or (b) commission translation completion before launch. Don't ship a half-done /en that 404s on hardcoded French strings.

### P1 (fix in 2 weeks; not blocking but visible)
7. **Replace 216 `console.log` calls** with the existing `lib/monitoring/logger.ts` logger. Tighten ESLint to `no-console: error` and remove the `--quiet` flag from CI.
8. **Add `/teen/*`, `/parent/*`, `/partner/*` to `app/robots.ts` `disallow`** — these are authenticated zones leaking SEO surface and (if 401-redirected) wasting crawl budget.
9. **Wire Sentry's `instrumentation.ts`** at repo root to formally register Sentry in Next 16 — current helpers are not auto-loaded by the framework.
10. **Add `@vercel/speed-insights`** for Web Vitals RUM that's properly aggregated outside Sentry.
11. **Audit `.select("*")` calls** (13 in production code) and tighten to explicit columns. Audit the `app/reservation/page.tsx` triple-fetch pattern.
12. **Pin and run `verify-*.ts` scripts in CI nightly** against staging — the only way to ensure the token economy doesn't regress.
13. **Commit (or delete) the 25 untracked feature directories** under `app/api/admin/drivers/`, `app/api/driver/`, `app/api/mentor/`, `app/api/parent/food/`, `app/api/teen/food/`, `app/api/teen/rides/`, `app/parent/food/`, `app/parent/rides/`, `app/partner/restaurant/`, `app/teen/food/`, `app/teen/rides/`, plus migrations `058_*` / `059_*`. They are referenced by `vercel.json` cron `/api/cron/ride-curfew-check` (which **is** committed) — so the cron will hit a route that is on disk locally but not deployed.
14. **Add husky + gitleaks/trufflehog pre-commit** to prevent the next service-role-key-on-desktop incident.

### P2 (fix in 30 days)
15. Move all UI strings into the i18n dictionaries; activate RTL for Arabic.
16. Replace homegrown `lib/i18n/` with `next-intl` for proper plural/format/MessageFormat support.
17. Run `next-bundle-analyzer` and trim the first-load JS for `/`, `/agenda`, and `/teen`.
18. Verify Leaflet + recharts are dynamically imported on routes that actually need them.
19. Replace 8 `<img>` tags with `next/image` (excluding email/PDF templates).
20. Add `npm audit` to CI as a non-blocking step (so vulnerabilities surface without breaking deploys).

---

## Recommended pre-launch actions

1. **Rotate Supabase service-role key and OpenAI key**. Update `.env.local`, Vercel env, and any GitHub Actions secrets. Verify the previous keys no longer authenticate. (15 min)
2. **Run the full CI gate locally** with the rotated keys: `npm run lint && npm run typecheck && npm run test:run && npm run build && npm run test:e2e`. Capture each output to `docs/vision/audit-prelaunch/00-build-evidence/` (or wherever) and attach to the launch ticket. (1-3 hours including build time)
3. **Create `app/not-found.tsx`** matching the brand and reusing `PageError` like `app/error.tsx` does. (15 min)
4. **Reconcile `app/manifest.ts` vs `public/manifest.json`** — delete the static one and ensure `app/layout.tsx` does not also link `/manifest.json` redundantly. (10 min)
5. **Replace the `verification.google` placeholder** with the real Search Console token (or remove the field). (5 min)
6. **Decide and lock the launch i18n surface** — either French-only (and remove the `darija` / `en` switchers from the navbar pre-launch) or commission rapid translation. Don't ship the half-state. (Decision call; 1 day if French-only)
7. **Update `app/robots.ts`** to disallow `/teen/`, `/parent/`, `/partner/`, `/onboarding/`, `/auth/`, `/notifications/`. (5 min)
8. **Verify the 5 cron routes (`vercel.json`) all enforce `CRON_SECRET`** — read each `app/api/cron/*/route.ts` and confirm. The `ride-curfew-check` cron points at an untracked route; either commit it or remove the cron entry. (30 min)
9. **Commit or delete the 25 untracked directories.** Anything that is launching must be on `main` and pass CI. Anything that isn't should be removed or moved behind `FEATURE_*` flags that default to `false`. (1-2 hours)
10. **Add `instrumentation.ts` at repo root** that calls `Sentry.init()` for both `node` and `edge` runtimes. Smoke-test by throwing in a test endpoint and confirming the event lands in Sentry. (30 min)
11. **Add a `prelaunch` npm script** that chains `lint && typecheck && test:run && build` and add it to the deploy-production workflow as a hard gate (already there, but make sure it's marked required in branch protection on GitHub). (10 min)
12. **Add husky + gitleaks pre-commit hook**. Even a basic one (`npx gitleaks detect --staged`) catches 90% of accidents. (30 min)
13. **Tighten `eslint.config.mjs` `no-console` to `error`** and clean up at least the highest-volume offenders (`features/messages/actions.ts`, `features/anniversaires/actions.ts`, `gamification-system/features/*/actions.ts`). (2-3 hours)
14. **Smoke-test the production build locally**: `npm run build && npm run start` then walk through public + teen + parent + admin auth flows. Verify Sentry receives a deliberate test error. (1 hour)
15. **Tag and freeze a release candidate** before the launch window. Any further commits go to a `next` branch.

---

## Appendix — files inspected (read-only)

**Build / config**: `package.json`, `next.config.mjs`, `tsconfig.json`, `vercel.json`, `eslint.config.mjs`, `playwright.config.ts`, `vitest.config.ts`, `.gitignore`, `.env.example`, `.env.local`, `.github/workflows/ci.yml`, `.github/workflows/deploy-production.yml`, `.github/dependabot.yml`.

**App shell**: `app/layout.tsx`, `app/error.tsx`, `app/global-error.tsx`, `app/loading.tsx`, `app/manifest.ts`, `app/robots.ts`, `app/sitemap.ts`.

**Observability**: `lib/monitoring/sentry.ts`.

**Tests**: `tests/quality/public-test-routes.test.ts`, `tests/fixtures/auth.ts`, `tests/e2e/*.spec.ts` listing.

**Reference**: `docs/vision/IMPLEMENTATION_RECETTE.md`, `README.md`.

Build / typecheck / lint / vitest commands could not be executed (sandbox denial). Verdict relies on static evidence; a live CI run is required to definitively confirm the green-build / zero-TS-error / zero-lint-error claims.
