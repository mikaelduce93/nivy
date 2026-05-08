# C4 — Cross-Role Duplicates Audit (READ-ONLY)

**Scope:** Detect routes and components that exist in parallel implementations across roles, namespaces, or layouts. Identify which is canonical, which is a legacy redirect, and which is dead/unused.

**Method:**
1. Globbed `app/**/page.tsx` (214 routes total).
2. Clustered routes by topic (gamification, social, shop/wallet, calendar/events, partners/ambassadeurs, etc.).
3. Read each candidate page to determine its actual behavior (redirect vs. wired vs. static mock).
4. Globbed `components/**/*.tsx` (364 components) and grouped by role + concern.
5. Cross-referenced obvious parallel implementations (skeletons, toasts, providers, sidebars, quest cards, AI companions, pull-to-refresh).

---

## Section 1 — Route doublons

### 1.1 Already-resolved (redirect file present)

These pairs are already cleaned up — the legacy URL is a `redirect()` shim. The doublon is *neutralized* but the file is still on disk and could be deleted once we confirm no internal `<Link href>` still points at the legacy URL.

| Cluster | Canonical (kept) | Legacy redirect (file is a `redirect(...)` stub) |
| --- | --- | --- |
| Shop / rewards | `/teen/wallet?tab=shop` (`app/teen/wallet/page.tsx`) | `/teen/shop` · `/xp-shop` · `/gamification/boutique` · `/teen/rewards` |
| Friend défis | `/teen/quests/friend-defis` (FD2 wired) | `/gamification/defis` (`permanentRedirect`) |
| Missions hub | `/teen/quests` (wired via `getUnifiedQuests`) | `/gamification/missions` (`permanentRedirect`) |
| Physical challenges | `/teen/defis-physiques` (Supabase-wired) | `/gamification/defis-physiques` (`redirect`) |
| Aide scolaire | `/teen/aide-scolaire` (Supabase-wired) | `/gamification/aide-scolaire` (`redirect`) · `/teen/academic` (`redirect`) |
| Crews / circles | `/teen/circles` (engine-layer) | `/gamification/crews` (`redirect`) |
| Achievements | `/gamification/collections` (wired) | `/teen/achievements` (`redirect`) |
| Coins | `/teen/wallet` (wallet hub) | `/teen/coins` (`redirect`) |
| Settings | `/teen/profile?tab=settings` | `/teen/settings` (`redirect`) |
| Passions | `/teen/quests?tab=creative` | `/teen/passions` (`redirect`) |
| Sport challenges (alias) | `/teen/defis-physiques` | `/teen/challenges/page.tsx` (re-exports default — alias, not redirect) |

> Note on `/teen/challenges`: it is `export { default } from "../defis-physiques/page"`. This is an *alias re-export*, not a redirect. URL stays at `/teen/challenges`. Functionally identical UI; user-facing duplicate URL.

### 1.2 True live duplicates — both are wired, no redirect

These are the *real* unresolved doublons — same domain, two living implementations, neither delegates to the other.

| Cluster | Page A | Page B | Verdict |
| --- | --- | --- | --- |
| **Gamification hub** | `/gamification` (`app/gamification/page.tsx`, server-wired Supabase + RPC, links out to `/gamification/*` and `/teen/wallet?tab=shop`) | `/teen` (`app/teen/page.tsx` — teen dashboard with quests/coins/leaderboard widgets) | Two parallel hubs. `/gamification` reads `user_xp`, `user_achievements`, `get_user_missions`, `can_spin_wheel`. `/teen` is the canonical authenticated shell (has its own layout). Most outbound links from `/gamification` already point at `/gamification/*` sub-pages (`roue`, `leaderboard`, `crews` → which itself redirects to `/teen/circles`). **Recommend collapsing `/gamification` into `/teen` or making `/gamification` redirect to `/teen` once parity is verified.** |
| **Leaderboard** | `/gamification/leaderboard` (XP global — reads `user_xp`+`crews`) | `/teen/leaderboard` (Wave 2.3 *creator* leaderboard — reads `creator_monthly_stats`) | **Not a true duplicate by data**, but URL space is confusing. The teen-creator leaderboard explicitly links to `/gamification/leaderboard` for "XP global". Two distinct leaderboards is intentional, but the naming is collision-prone (a teen looking for "leaderboard" may pick either). Consider renaming `/teen/leaderboard` → `/teen/leaderboard/creators` or hoisting both under `/leaderboard/[scope]`. |
| **Daily challenges** | `/daily` (legacy `'use client'` page reading `getMyTeens()` + `getDailyChallenges()` from `@/features/gamification`, with `Navbar`/`Footer` shell) | `/teen/quests` (canonical Wave-E.2 hub with daily/weekly cadence) | `/daily` is a *parent-flavored* daily-challenges page (it does `getMyTeens()` and forces "Aucun profil enfant trouvé" toast → redirects to `/profile/enfants/ajouter` which doesn't exist in the route map). It is dead-ish: routes nowhere from app navigation, but is still a live page. **Recommend redirect to `/teen/quests` (or `/parent/...` if a parent variant is intended).** |
| **Calendar / events list** | `/agenda` (public marketing — Supabase `events` table, with `Navbar`/`Footer`) | `/teen/events` (auth — uses `getTeenDashboardData` + signal capture) + `/teen/calendar` (auth — same loader, calendar viz) | Three event surfaces: public agenda, teen events list, teen calendar. `/teen/events` and `/teen/calendar` both call `getTeenDashboardData({ eventsLimit })` — they are siblings (list vs calendar visualization) and could share a single page with a `?view=` switcher. `/agenda` is the public/marketing variant (different data path: raw `events` table; no signals). **Keep `/agenda` (public). Consolidate `/teen/events` ↔ `/teen/calendar` behind one route.** |
| **Help / FAQ** | `/aide` (`app/aide/page.tsx` — full FAQ + contact, `'use client'`, hard-coded faqs array, search + categories) | `/aide/faq` (`app/aide/faq/page.tsx` — Accordion-only FAQ, separate hard-coded array, no search) | Both are static client pages with non-overlapping FAQ content arrays. `/aide/faq` is a stripped-down older version. **`/aide` is canonical (richer, with contact). `/aide/faq` should redirect to `/aide`.** |
| **Mini-games** | `/teen/games` (wired via `gamification-system/features/mini-games`) | `/gamification/roue` (roue de la fortune — referenced from `/gamification` hub) | Different game *content* but both belong to the gamification surface. Roue is a single mini-game; games is the catalog. Not a duplicate per se, but the roue is not surfaced inside `/teen/games`. Worth folding the roue into the games catalog. |
| **Anniversaires** | `/anniversaires` (full booking flow, packs + extras + form via `@/features/anniversaires`) | `/anniversaires/organiser` (lighter `'use client'` form using `submitBirthdayRequest` action) | Two parallel "organize a birthday" flows. The shorter `/organiser` looks like a stripped-down marketing landing; the main page is the wired booking. **Consolidate — make `/organiser` link into `/anniversaires` or redirect.** |
| **Devenir-X landing duplicates** | `/devenir-partenaire` + `/devenir-partenaire/inscription` + `/partenaires/merci` | (parallel) `/devenir-ambassadeur` + `/devenir-ambassadeur/candidature` + `/devenir-ambassadeur/programme` | Distinct pipelines per role — not a doublon, but the *post-submit* surface is asymmetric: partner has `/partenaires/merci`, ambassadeur and influenceur do not. Listed here as a structural-consistency note, not a true duplicate to delete. |
| **Quiz** | `/teen/quiz` (hub via `getDailyQuizForTeen`) + `/teen/quiz/[id]` + `/teen/quiz/history` | (none — clean) | OK, single canonical quiz hub. |
| **Profile / settings** | `/teen/profile` + `/teen/profile/edit` | `/teen/settings` (redirects to `/teen/profile?tab=settings`) | Already resolved — listed for completeness. |
| **Wallet sub-pages** | `/teen/wallet` + `/teen/wallet/allowance` | (no duplicate — `/parent/allowances` is the parent-side equivalent which is *not* a duplicate) | OK. |

### 1.3 Mock-only / dead pages with no live data binding

These pages exist as static UI without DB wiring — they look like duplicates of wired surfaces but are actually mockups.

| Page | Status | Why it's dead-ish |
| --- | --- | --- |
| `/gamification/parcours` | Static `'use client'` page with **hard-coded** `paths: Path[]` array and `userStats` literal. No Supabase calls. | UI mock for "milestones path" feature. Never wired. **Recommend deletion** unless a future feature plans to replace the hard-coded data. No other route references it. |
| `/gamification/page.tsx` "Quick actions" | Wired but its links jump back to `/gamification/roue` + `/gamification/leaderboard` (also wired) — fine. | OK. |

---

## Section 2 — Component doublons (parallel implementations)

### 2.1 Skeletons — six parallel implementations

| File | Purpose / scope | Canonical? |
| --- | --- | --- |
| `components/ui/skeleton.tsx` | Primitive `<Skeleton>` div with `animate-pulse`. Documented as the *single source of truth*. | **CANONICAL** |
| `components/ui/skeleton-variants.tsx` | Premium framer-motion variants (shimmer/glow/stagger) for vitrine pages. | Acceptable add-on (heavy client bundle, opt-in). |
| `components/ui/morphing-skeleton.tsx` | Wave-2 cross-fade primitive for `loading.tsx`. | Acceptable — different concern (transition, not skeleton itself). |
| `components/ui/skeletons/page-skeleton.tsx` | Composes primitive into a full-page skeleton. | OK — composes. |
| `components/ui/skeletons/dashboard-skeletons.tsx` | Teen dashboard variants. Composes primitive. | OK — composes. |
| `components/ui/skeletons/page-skeletons/{parent,partner,teen}-dashboard-skeleton.tsx` | Per-role dashboard skeletons. | OK — composes. |
| `components/ui/states/skeleton-set.tsx` | Library of presets (event card, ticket, profile, table) — composes primitive. | OK — composes. |

**Verdict:** Architecture is documented (header of `skeleton.tsx`). All non-primitive files **compose** the primitive — these are organizationally redundant but functionally compliant. Consider pruning to **2 layers**: primitive + composed presets, deleting `skeleton-variants.tsx` if no caller depends on framer presets.

### 2.2 Toasts — three parallel implementations

| File | Purpose | Canonical? |
| --- | --- | --- |
| `components/ui/toast.tsx` | Radix-based toast primitives. | One of two systems. |
| `components/ui/toaster.tsx` | Renderer wired to `useToast()` hook from `hooks/use-toast`. | Companion of `toast.tsx`. |
| `components/ui/sonner.tsx` | Sonner-based `<Toaster>` (used as `import { toast } from 'sonner'`). | Other system. |

**Verdict:** Two competing toast systems coexist (Radix-toast vs sonner). Most newer code uses `import { toast } from 'sonner'` (e.g. `app/daily/page.tsx`, `app/anniversaires/...`). **Recommend standardizing on sonner**, deleting `toast.tsx` + `toaster.tsx` + `hooks/use-toast.ts` once no caller remains.

### 2.3 Providers — multiple wrappers

| File | Purpose |
| --- | --- |
| `components/providers/elite-providers.tsx` | Aggregator (likely wraps the others). |
| `components/providers/page-transition-provider.tsx` | Next-page transition. |
| `components/providers/performance-provider.tsx` | Perf monitoring context. |
| `components/providers/view-transitions-provider.tsx` | View transitions API. |
| `components/theme-provider.tsx` | next-themes wrapper. |
| `components/csrf-provider.tsx` | CSRF token context. |
| `components/gamification/gamification-provider.tsx` | Gamification XP/level context. |

**Verdict:** Not strict duplicates — each owns a concern. But two transition providers (`page-transition-provider` + `view-transitions-provider`) overlap conceptually. Inspect call sites; one should win.

### 2.4 Pull-to-refresh — two implementations

| File | Notes |
| --- | --- |
| `components/ui/pull-to-refresh.tsx` | Older generic primitive (touch + mouse, prefers-reduced-motion). |
| `components/teen/pull-to-refresh.tsx` | TICKET-037 (Wave 2). Touch-only (matches `(hover: none) and (pointer: coarse)`), spring indicator, defaults to `router.refresh()`. Header explicitly references the older one as legacy. |

**Verdict:** **Canonical = `components/teen/pull-to-refresh.tsx`** (used by `/teen/quests`, `/teen/messages`, `/teen/leaderboard`, etc.). Older `components/ui/pull-to-refresh.tsx` should be deleted once no caller imports it.

### 2.5 Quest cards — two implementations

| File | Used by |
| --- | --- |
| `components/gamification/quest-card.tsx` | Older `<QuestCard>` typed with `QuestType = 'quiz'\|'sport'\|...`. Uses `GlassCard`. |
| `components/teen/dashboard/quest-card.tsx` | Newer card typed against `UnifiedQuest` from `@/lib/server/unified-quest-engine`. |

**Verdict:** Same domain (a quest card for the teen surface), two divergent props/types. Newer dashboard version is canonical (it consumes the unified-quest-engine output). **Migrate any caller of `components/gamification/quest-card.tsx` to the dashboard version, then delete it.**

### 2.6 AI / Companion / Coach — four overlapping surfaces

| File | Purpose |
| --- | --- |
| `components/ai/elite-ai-companion.tsx` | Heavy speech-recognition AI sheet, framer-motion. |
| `components/ai/AgentSheet.tsx` | Sheet-based AI agent (uses `useAIChat` + speech). |
| `components/ai/AgentFloatingButton.tsx` | Floating CTA for agent. |
| `components/teen/dashboard/ai-companion.tsx` | Mounted on the teen dashboard. Uses `useAIChat`. |
| `components/teen/avatar-coach.tsx` (server) + `components/teen/avatar-coach-client.tsx` | AvatarCoach v1 (whitepaper §8) — DB-backed greeting, optional v2 chat panel. |

**Verdict:** Four parallel ways to surface an AI conversation. Avatar coach is the *whitepaper* canonical (DB-driven, server component reads avatar_messages). The `ai/elite-*` + `ai/Agent*` + `teen/dashboard/ai-companion` triad looks like sequential prototypes. **Pick one transport (the avatar-coach v2 chat panel) and delete the rest.** This is the highest-leverage cleanup in `components/`.

### 2.7 Sidebars — many

| File | Scope |
| --- | --- |
| `components/dashboard/sidebar.tsx` | Generic dashboard sidebar (used by `/(dashboard)`?). |
| `components/dashboard/{ambassador,mentor,parent,partner,teen}/sidebar.tsx` | Per-role sidebars (intentional). |
| `components/layouts/admin-sidebar.tsx` + `components/layouts/app-sidebar.tsx` | Two app-level sidebars. |
| `components/ui/sidebar.tsx` | Base shadcn sidebar primitive. |

**Verdict:** Per-role sidebars are intentional (different nav per role). The duplication is between `components/dashboard/sidebar.tsx` (generic) and `components/layouts/app-sidebar.tsx` (also generic). **Inspect both — one is dead.** Same goes for the admin sidebar in `layouts/` vs whatever the admin layout actually mounts.

### 2.8 Headers / dashboard headers

| File | Scope |
| --- | --- |
| `components/dashboard/header.tsx` | Generic dashboard header. |
| `components/dashboard/{ambassador,mentor,parent,partner,teen}/header.tsx` | Per-role. |
| `components/page-header.tsx` | Generic page header. |
| `components/section-header.tsx` | Section header. |
| `components/parent/dashboard/teen-sponsor-header.tsx` | Specialized parent header. |

**Verdict:** Per-role is intentional. `page-header` vs `section-header` vs generic `dashboard/header.tsx` — likely overlapping. Worth a 30-min sweep to consolidate.

### 2.9 Other notable component overlaps

- **Empty / error states:** `components/ui/empty.tsx` vs `components/ui/states/empty-state.tsx`; `components/ui/error-states.tsx` vs `components/ui/states/error-block.tsx` vs `components/ui/states/page-error.tsx` vs `components/ui/query-error-fallback.tsx` vs `components/ui/fallback-states.tsx` — at least 4 ways to render an empty / 4 ways to render an error. **`components/ui/states/*` looks like the canonical newer set;** the loose siblings are legacy.
- **Cards:** `components/ui/card.tsx` (shadcn primitive — canonical), `components/ui/glass-card.tsx`, `components/ui/effects/elite-3d-card.tsx`, `components/ui/swipeable-card.tsx`, `components/ui/hover-card.tsx` — different visual treatments, all in active use, not strict duplicates.
- **Defi card:** `components/teen/defi-card.tsx` is the canonical "défi" card (referenced by all FD2 + W3-A9 work). The `gamification/quest-card.tsx` legacy duplicate listed in §2.5 sometimes serves the same role on older surfaces.
- **Scanner:** `components/qr-scanner.tsx` vs `components/partner/universal-scanner.tsx` — different concerns (generic vs partner check-in), but worth checking if generic one still has callers.
- **Export buttons:** `components/bookings/export-pdf-button.tsx` + `components/parent/export-button.tsx` + `components/export-data-button.tsx` + `components/parent/invoice-button.tsx` + `components/download-invoice-button.tsx` — multiple parallel "export this thing" buttons.

---

## Section 3 — Recommended consolidation order

### Phase A — Safe to delete now (zero migration risk)

These are pure shim/redirect files where the canonical destination is already the only wired implementation. Removing the shim only requires verifying no internal `<Link>` still points at the legacy URL.

1. Delete the redirect-only pages once `<Link>` audit is clean:
   - `app/gamification/defis-physiques/page.tsx` → uses `redirect()` only.
   - `app/gamification/aide-scolaire/page.tsx`
   - `app/gamification/crews/page.tsx`
   - `app/gamification/boutique/page.tsx`
   - `app/teen/shop/page.tsx`
   - `app/xp-shop/page.tsx`
   - `app/teen/rewards/page.tsx`
   - `app/teen/achievements/page.tsx`
   - `app/teen/coins/page.tsx`
   - `app/teen/settings/page.tsx`
   - `app/teen/passions/page.tsx`
   - `app/teen/academic/page.tsx`
   - `app/gamification/missions/page.tsx`
   - `app/gamification/defis/page.tsx`
   - `app/teen/challenges/page.tsx` (alias re-export — turn into a redirect first, then delete next pass to avoid permanent indexing of a duplicate URL)
2. Delete `app/gamification/parcours/page.tsx` — fully static mock with hard-coded data, no consumer.
3. Delete the older `components/ui/pull-to-refresh.tsx` once Grep confirms no caller (canonical is `components/teen/pull-to-refresh.tsx`).

**Pre-delete check (single grep per file):** `grep -r "<Link[^>]*href=\"/gamification/missions\"" app components` etc. for each path. If any internal link still uses the legacy URL, fix the link first; the redirect can stay until then.

### Phase B — Needs migration before deletion (one PR per cluster)

1. **Toast unification.** Pick sonner. Migrate all `useToast()` callers to `import { toast } from 'sonner'`. Delete `components/ui/toast.tsx`, `components/ui/toaster.tsx`, `hooks/use-toast.ts`. Update `app/layout.tsx` to mount only the sonner `<Toaster>`.
2. **AI/Companion unification.** Decide between AvatarCoach v2 chat panel (DB-driven) and the `ai/AgentSheet` family (live LLM). Most likely keep AvatarCoach (whitepaper canonical), delete `components/ai/elite-ai-companion.tsx`, `components/ai/AgentSheet.tsx`, `components/ai/AgentFloatingButton.tsx`, `components/teen/dashboard/ai-companion.tsx`. Re-mount AvatarCoach in the teen dashboard root.
3. **Quest card unification.** Migrate any caller of `components/gamification/quest-card.tsx` to `components/teen/dashboard/quest-card.tsx` (the unified-quest-engine consumer). Delete the older one.
4. **Empty/error state unification.** Migrate to `components/ui/states/{empty-state,error-block,page-error}.tsx`. Delete `components/ui/empty.tsx`, `components/ui/error-states.tsx`, `components/ui/fallback-states.tsx`, `components/ui/query-error-fallback.tsx` (after grep).
5. **Aide / FAQ.** Make `app/aide/faq/page.tsx` a redirect to `/aide`. Then delete in Phase A of next pass.
6. **Daily challenges.** Make `app/daily/page.tsx` a redirect to `/teen/quests` (verify no parent-side flow still depends on it; if yes, move it under `/parent/...`).
7. **Anniversaires.** Decide whether `/anniversaires/organiser` is the marketing-landing variant (keep, link into `/anniversaires`) or a stripped-down legacy form (redirect into `/anniversaires`). Given its `submitBirthdayRequest` action, treat as legacy and redirect.
8. **Calendar ↔ Events teen surfaces.** Merge `/teen/events` and `/teen/calendar` into one route with a `?view=list|calendar` switch (both already share the same `getTeenDashboardData` loader — trivial merge).

### Phase C — Architectural decisions (require product sign-off)

1. **`/gamification` hub vs `/teen` shell.** Both pages exist with overlapping data (XP, badges, missions). Decision: collapse `/gamification/page.tsx` into `/teen/page.tsx`, keep `/gamification/{leaderboard,collections,roue}` as sub-pages of the teen shell. Or: redirect `/gamification` → `/teen`. Needs UX sign-off because `/gamification` is currently the only place that surfaces the daily wheel CTA at "level 0".
2. **Leaderboard naming collision.** Rename `/teen/leaderboard` → `/teen/leaderboard/creators` (or hoist both leaderboards under `/leaderboard/[scope]`). Marketing/SEO impact.
3. **Sidebars.** Decide between `components/dashboard/sidebar.tsx` and `components/layouts/app-sidebar.tsx`; the per-role ones stay. Run `grep -l "from \"@/components/dashboard/sidebar\""` and `grep -l "from \"@/components/layouts/app-sidebar\""` to see who's still on each.
4. **Skeleton system.** `components/ui/skeleton-variants.tsx` is heavyweight (framer-motion). If no production loading.tsx imports it, delete and keep only primitive + composed presets.

---

## Appendix — Counts

- **Total `app/**/page.tsx`:** 214
- **Total `components/**/*.tsx`:** 364
- **Pure redirect pages identified:** 14
- **Static-mock pages with no DB binding identified:** 1 (`/gamification/parcours`)
- **Live route-pair duplicates needing migration:** 5 (`/aide` vs `/aide/faq`; `/daily` vs `/teen/quests`; `/teen/events` vs `/teen/calendar`; `/anniversaires` vs `/anniversaires/organiser`; `/gamification` vs `/teen`)
- **Component-level parallel implementations needing decision:** ~7 clusters (toasts, AI/companion, quest card, empty/error states, pull-to-refresh, sidebars, skeletons).
