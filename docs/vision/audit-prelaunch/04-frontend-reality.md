# 04 — Frontend reality audit

> **Date**: 2026-05-07
> **Auditor**: pre-launch reality auditor (read-only)
> **Scope**: every `app/**/*page.tsx` (≈155 routes) and `components/**/*.tsx` (≈335 files)
> **Source comparators**: `docs/vision/FRONTEND_REDO.md` (75-route map), `docs/vision/PRODUCT_WHITEPAPER.md` v3.6, recent `[Wave 2 P1+]`, `[Wave 1 P0+]` commits.

---

## Verdict

**RED — DO NOT LAUNCH FROM CURRENT STATE.**

The frontend is a two-speed codebase. Wave 1/Wave 2 surfaces (chores, allowance, food, rides, savings, marketplace) and most server-rendered teen/parent dashboards (`/teen`, `/teen/wallet`, `/teen/quests`, `/parent`, `/parent/topup`, `/parent/approvals`) are real-data and on-spec. But ≥ 25 routes — including five P0 admin routes that gate compliance and three flagship partner routes — render hardcoded mock data that would expose fake teen names, fake KYC submissions, and fake transactions to anyone who logs in. The `<AvatarCoach>` specced as the heart of retention is not built (only a generic chat companion exists). The `/teen/xp-value` page actively promises a 50% XP-payment feature that contradicts §27 LOCKED 100 XP/DH rate and §5 dual-currency separation. Launching today would ship false UI promises, fake legal-grade KYC data on screen, and a missing core retention loop.

---

## Inventory totals

Per `Glob app/**/page.tsx`, the repo contains **≈155 page.tsx files**. Cross-referenced with `FRONTEND_REDO.md` route map (75+ routes mapped) below.

| Bucket | Count (sampled) | Notes |
|---|---|---|
| **REAL** — Supabase server-side fetch + tracks live data | ~95 | Most teen/parent post-Wave-2 pages, most admin server-rendered pages |
| **PARTIAL** — Mixed real + hardcoded | ~22 | Pages with real list but mock stats; pages with `// TODO(data)` empty arrays |
| **MOCK** — Entirely hardcoded JSX/arrays | ~13 | Listed in matrix below; biggest violators are partner dashboard, partner/transactions, partner/stats, partner/events, admin/partners, admin/proofs |
| **SCAFFOLD/STUB** — Empty or trivial redirect | ~25 | Re-exports + redirects (e.g. `app/teen/shop/page.tsx` is a 6-line redirect; `app/teen/challenges/page.tsx` re-exports `defis-physiques`) |

Components: ~335 `.tsx` files in `components/**`. Bulk are shadcn/ui primitives (`components/ui/*`, ~60). Major dashboard subtrees:
- `components/parent/**` — 24 files, mostly real (forms hit Supabase; parental approval list real)
- `components/teen/**` — 34 files, mostly real (dashboard hero, quest card, hub tabs are wired)
- `components/dashboard/**` — 11 sidebars/headers, real (auth-aware)
- `components/partners/**` — 4 KYC partner forms (real)
- `components/ai/elite-ai-companion.tsx` — sole stand-in for the §8 AvatarCoach (chat-only, no mood states, no avatars table read)

Per-area duplication and missing components are detailed in §"Component duplication report" below.

---

## Mock / hardcode inventory — the brutal table

Sorted by golden-path criticality (P0 first), then severity within each band. Every row is cited with `file:line`.

### P0 — golden path, money, identity, compliance

| # | Page (route) | Status | What's hardcoded | Evidence |
|---|---|---|---|---|
| 1 | `/partner/dashboard` (`app/partner/dashboard/page.tsx`) | **MOCK** | Entire dashboard. KPI stats array of 4 (CA 12 450 DH, 342 teens, 4.8/5, 45 000 XP, all literal), active offers list ("Menu Burger XP", "Happy Hour −50%"), partner-tier copy "Membre Gold • 58 ventes pour Platinum", trend badges "+12%/+8%/+24%" — none from DB. Even the avatar pile uses `https://i.pravatar.cc/100?img=...` placeholder photos. | `app/partner/dashboard/page.tsx:28` (`// Mock data for demo`), `:29-70` stats literal, `:72-75` activeOffers literal, `:145` `pravatar.cc` URL, `:171-194` "Membre Gold / 58 ventes / 72%" literal |
| 2 | `/partner/transactions` (`app/partner/transactions/page.tsx`) | **MOCK** | 6 fake transactions hardcoded with realistic Moroccan first names (Ahmed K., Sara M., Youssef B., Fatima Z., Omar L., Nadia R.), fake amounts and dates "15 Jan 2024" — no fetch at all. Page is a synchronous client component. | `app/partner/transactions/page.tsx:7-14` |
| 3 | `/partner/stats` (`app/partner/stats/page.tsx`) | **MOCK** | `monthlyStats` (4 months Jan→Oct), `topOffers` (3 offers), header KPI counts "541" / "89" — all literal. No Supabase import. | `app/partner/stats/page.tsx:6-17` |
| 4 | `/partner/events` (`app/partner/events/page.tsx`) | **MOCK** | `upcomingEvents` (3 fake events with dates "25 Janvier 2024", "1 Février 2024"), `pastParticipations` (2 fake), no fetch. | `app/partner/events/page.tsx:7-43` |
| 5 | `/admin/partners` (`app/admin/partners/page.tsx`) | **MOCK** | KYC moderation queue is fake. `stats = { total: 156, pending: 12, ... }` literal. `partners: Partner[]` is a hand-typed array with realistic Moroccan company names ("Neon Club Casablanca", "Teen Events Morocco"), fake CIN/RC/ICE numbers, fake bank RIBs, fake addresses, fake document statuses. **No Supabase query in the file.** This is the page admins use to approve real partners — it shows 6 fake partners every load. | `app/admin/partners/page.tsx:108-114` (stats), `:116-300` (partners array), entire page is `"use client"` with zero `createClient` import |
| 6 | `/admin/proofs` (`app/admin/proofs/page.tsx`) | **MOCK** | Physical-defi proof moderation queue is fake. `stats = { pending: 24, approvedToday: 156, ... }` literal. `proofs: VideoProof[]` array hardcoded with realistic teen names ("Yasmine El Amrani", "Ahmed Benali", "Sara Idrissi", "Karim Tazi") + ages 15-17 + fake video URLs `/videos/proof1.mp4`. **§22 compliance violation risk** — admins moderating fake under-18 proofs while production data sits in `physical_challenges_evidence` unread. | `app/admin/proofs/page.tsx:86-91` (stats), `:93-200+` (proofs array) |
| 7 | `/teen/xp-value` (`app/teen/xp-value/page.tsx`) | **PARTIAL but VIOLATES SPEC** | Fetches real XP stats from `/api/payments/xp` but the entire page UI promises "Paiement max avec XP 50%" + an ROI calculator that lets teens "pay 50% in XP". Whitepaper §5/§27 LOCKED: 100 XP/DH and **XP and coins NEVER convert** — XP is effort accounting only, not a payment rail. Page text "Chaque 100 XP = 1 DH d'économies", "Utilise jusqu'à 50% en XP sur tes achats" is structurally wrong and would have to be rewritten end-to-end. | `app/teen/xp-value/page.tsx:163` (`{stats.max_payment_percentage * 100}%`), `:506-512` ("Paie avec tes XP / Utilise jusqu'à 50%"), `:241-336` (ROICalculator that subtracts XP from cash purchase) |
| 8 | `/parent/page.tsx` parent dashboard | **PARTIAL** | Real `parent_teens_overview`, real `bookings`, real `parental_approvals` (all `createClient`-server). BUT `<EvolutionTracker>` per teen receives **literal** stats `{ responsibility: 65, social: 88, creativity: 42, academic: 75 }` per teen, identical for everyone. "Limite Active 500 DH /mois" is hardcoded in the right column. `<UpcomingEvents events={[]} />` always passed an empty array. | `app/parent/page.tsx:152` (literal stats), `:165` ("500 DH /mois" literal), `:206` (`events={[]}`) |
| 9 | `/teen/page.tsx` teen dashboard | **PARTIAL** | Server-side fetch is real (`getTeenDashboardData`, `getAchievementStats`, `getRecentlyUnlocked`) but the **§8 AvatarCoach is structurally absent**. Layout mounts `<EliteAICompanion>` (chat-only), not a sticky bottom-right avatar with name greeting / mood states. `nextReward` defaults to literal `{ name: "Place de Cinéma", xpCost: 5000, progressPercent: 0 }` if no real reward available. `displayAction.mission` falls back to `{ name: "Connexion Quotidienne", xp: 50 }` literal. | `app/teen/page.tsx:43` (literal nextReward), `:54-60` (literal displayAction fallback); `app/teen/layout.tsx:24,54` (no `<AvatarCoach>`, only `EliteAICompanion`) |
| 10 | `/teen/friends` (`app/teen/friends/page.tsx`) | **PARTIAL** | Real `/api/teen/friends` fetch via useEffect. BUT `PENDING_REQUESTS: any[] = []` and `SUGGESTIONS: any[] = []` are hardcoded empty (TODO line 21-22). Tab "Demandes" exists in UI but `mapping over PENDING_REQUESTS` always renders nothing — UX promise broken. `<EmptyState preset="friends">` covers this for the all/online tabs but not the requests tab specifically. | `app/teen/friends/page.tsx:23-25` (TODO + empty literals), `:121-155` (renders pending UI that never runs) |
| 11 | `/teen/activity` (`app/teen/activity/page.tsx`) | **PARTIAL** | Real `/api/teen/activities` fetch but `todayXP = 0` and `weekXP = 0` are literal, then displayed as live stats "Aujourd'hui +0 XP / Cette semaine +0 XP" — the stats panel will always show 0. | `app/teen/activity/page.tsx:75-77` |
| 12 | `/teen/academic` (`app/teen/academic/academic-client.tsx`) | **PARTIAL** | `subjects: Subject[]` hardcoded with literal `quizCount`/`videoCount`/`completedQuizzes` per subject (Math 12/8/0, Physique 10/6/0…). `sampleQuizQuestions` is a 3-question hardcoded quiz that runs every quiz of every subject regardless of which quiz the user clicks. Real grade submission via `submitGrade` works, but the quiz runner is theatre. | `app/teen/academic/academic-client.tsx:88-97` (subjects array), `:99-115` (sampleQuizQuestions used at `:179, :186` for ANY selected quiz) |
| 13 | `/teen/share` (`app/teen/share/page.tsx`) | **MOCK** | `shareableItems: ShareableItem[]` is 6 hardcoded items ("Niveau 12 atteint", "Badge Super Fan", "Série de 15 jours", "Défi Push-ups complété", "1000 XP accumulés", "Teen Party Casablanca"). User shares the same 6 items regardless of their real achievements. | `app/teen/share/page.tsx:66-73` |
| 14 | `/teen/vip-card/vip-card-client.tsx` | **PARTIAL** | `VIP_TIERS` is a hardcoded UI catalogue (acceptable as visual catalogue per the inline TODO note), BUT tier names "Bronze / Silver / Gold / Platinum" with thresholds 0/5000/15000/50000 XP **conflict with §10 Family tiers** "Free / Silver / Gold / Platinum" which are subscription tiers, not XP-locked tiers. Two different tier ladders share three names and will collide at user comprehension. | `app/teen/vip-card/vip-card-client.tsx:12-70` |

### P1 — vision coherence

| # | Page | Status | What's hardcoded | Evidence |
|---|---|---|---|---|
| 15 | `/teen/games/games-client.tsx` (rendered via `app/teen/games/page.tsx`) | **PARTIAL** | Real fetch of mini-game types but `today_played / today_xp / win_streak` typed as TODO until `getUserGameStats` shape is known. Stats panel will read mostly 0s. | `app/teen/games/page.tsx:16-22` |
| 16 | `/teen/defis-physiques/defis-physiques-client.tsx` | **PARTIAL** | Server-side challenges and stats are real, but `currentStreak = 0`, `minutesThisWeek = 0`, `workoutHistory = []` are explicitly TODO. Week-streak UI renders with literal 0. | `app/teen/defis-physiques/defis-physiques-client.tsx:64-69` |
| 17 | `/teen/passions` | **PARTIAL** | Real interests catalog but kept as standalone alongside `/onboarding/interests` — duplicate per `FRONTEND_REDO.md` §2. | `app/teen/passions/passions-client.tsx` (verified `"use client"` + real fetch but route slated DELETE) |
| 18 | `/teen/calendar/calendar-client.tsx` | **REAL** but redundant | Real `upcomingEvents` from server, but route is duplicate of `/teen/events` per FRONTEND_REDO. | `app/teen/calendar/calendar-client.tsx:50-78` |
| 19 | `/teen/coins/coins-client.tsx` | **REAL** but redundant | Reads `getCoinsTransactions` correctly, but is a duplicate of `/teen/wallet`'s `/wallet?tab=shop` (FRONTEND_REDO REPLACE). `profile?.coins_balance` is read from a column that the data layer does not write to consistently — see audit `01-data-model.md` for `coins_balance` vs `user_coins.balance` drift. | `app/teen/coins/coins-client.tsx:57` |
| 20 | `/teen/social/social-hub-client.tsx` | **PARTIAL** | Tabs (crew/friends/ranking/map) but `friendsCount` is the only real fetch; ranking & crew tabs depend on absent endpoints. | `app/teen/social/social-hub-client.tsx:62-75` |
| 21 | `/teen/messages/messages-client.tsx` | **PARTIAL** | Real conversations come in via props, but on conversation open `messages` is local state only — there is no `getMessages(conversationId)` wired here. UI suggests rich DM flow that doesn't exist. | `app/teen/messages/messages-client.tsx:67-80` |
| 22 | `/parent/grades/page.tsx` | **REAL** but degrades to "Bientôt disponible" | Real `teen_grades` fetch with graceful unavailable banner when table missing (`PGRST205/204/42P01`). UI exists, but the migration may not be deployed in prod — verify pre-launch. | `app/parent/grades/page.tsx:107-126`, `:341-351` |
| 23 | `/parent/live/page.tsx` | **REAL** | Real check-ins fetched + photo gallery gated on `photo_consent`. Note: emergency phone "+212 6 00 00 00 00" is a literal placeholder. | `app/parent/live/page.tsx:645` |
| 24 | `/admin/scripts-sql/page.tsx` | **REAL but compliance hazard** | Lists hardcoded migration script names, deep-links to Supabase SQL editor. Per FRONTEND_REDO P0 it must be locked behind `super_admin` only. Currently any `admin_roles` row passes. | `app/admin/scripts-sql/page.tsx:26-95` (hardcoded SCRIPTS list with descriptive names) |
| 25 | `/admin/logs/page.tsx` | **REAL** but incomplete | Reads `activity_logs` from Supabase. §29 invariant 8 requires `admin_audit_logs` for **every** admin action — current schema/RLS may not cover all admin code paths. | `app/admin/logs/page.tsx:26-46` |
| 26 | `/anniversaires/page.tsx` | **PARTIAL** | TODO placeholder for the `anniv_packs` schema per `FRONTEND_REDO.md §1`. | `app/anniversaires/page.tsx` (matched `TODO` in earlier grep) |

### P2 — polish, but already broken

| # | Page | Status | What's hardcoded | Evidence |
|---|---|---|---|---|
| 27 | `/blog`, `/galerie`, `/temoignages`, `/securite`, `/a-propos` | **REAL static** | Static marketing copy, OK pre-launch. | n/a |
| 28 | `/legal/cgu`, `/cgv`, `/confidentialite`, `/cookies`, `/mentions-legales` | **REAL static** | Generic legal copy. Per FRONTEND_REDO must reference CNDP, loi 09-08, escrow disclosure (§22). Currently does not. | n/a |
| 29 | `/teen/passions`, `/teen/calendar`, `/teen/coins`, `/teen/social`, `/teen/messages`, `/teen/games`, `/teen/academic`, `/teen/rewards`, `/teen/challenges` | **REDIRECT/DUPLICATE candidates** | Per FRONTEND_REDO §"Pages to delete" — duplicates of canonical routes. `app/teen/challenges/page.tsx` is a 2-line re-export of `defis-physiques`. | `app/teen/challenges/page.tsx:1-2` |
| 30 | `/devenir-influenceur*`, `/djs/*` | **REAL static** but DELETE candidates | Out of canonical scope per FRONTEND_REDO. Currently fetched from real DB tables that are also out of scope. | n/a |
| 31 | `/admin/scripts-sql/page.tsx` SCRIPTS literal | **MOCK** | Hardcoded migration registry. | (cited above row 24) |

### Total mock-status pages

**Critical mock pages (P0)**: 7 (rows 1, 2, 3, 4, 5, 6, 13)
**P0 partials with broken stat panels**: 6 (rows 7, 8, 9, 10, 11, 12)
**P1+ partials with TODOs**: ~12

The number to remember: **at least 13 pages will lie to a real user the moment they open them**, and the worst (admin/partners, admin/proofs) lie about real-people teen names and KYC documents.

---

## Critical user journey trace

For each of the 7 journeys named in the audit brief: green = end-to-end working, amber = partially wired, red = broken at a step.

### Journey 1 — Parent: signup → onboarding → add teen → top-up
`AMBER (degrades depending on DB state)`

| Step | Surface | Status | Blocker |
|---|---|---|---|
| Signup | `/auth/sign-up/page.tsx` | AMBER | Per FRONTEND_REDO §"Auth" the trigger that creates `profiles` from `raw_user_meta_data.role` is missing on live DB; tests patch manually. |
| Email confirm | `/auth/confirm-email/page.tsx` | GREEN | Static success page. |
| Auth redirect | `/auth/redirect/page.tsx` | RED | §19 requires `is_onboarded` flag → redirect to `/onboarding`. Flag missing → potential redirect loop. |
| Onboarding | `/onboarding/page.tsx` | AMBER | Single-page flow exists with `useOnboarding` hook + step components. Per spec must branch by role into 6 flows; current logic is parent/teen only. |
| Add teen | `/parent/teens/add/page.tsx` + `components/parent/add-teen-form.tsx` | AMBER | Form is real (Supabase write), but §10 requires 6-digit linking codes via `linking_codes` table (24h TTL, single-use). Per FRONTEND_REDO that table is missing. |
| Top-up | `/parent/topup/page.tsx` + `components/parent/topup-form.tsx` | AMBER | Page is real (reads `parent_teens_overview`, `e_signatures`, `coin_transactions`). But §5 requires PSP picker (Cash Plus / Wafacash / M2T / Stripe / CMI) and writes to `payment_transactions` + `escrow_ledger`. Code path writes `coin_transactions` only, no escrow. |

**Verdict**: parent can finish the flow on a happy-path test DB but the moment a real PSP webhook fires, escrow accounting is incorrect.

### Journey 2 — Teen: signup → onboarding → daily quiz → earn XP → see wallet → spend coins
`AMBER`

| Step | Surface | Status | Blocker |
|---|---|---|---|
| Signup | `/auth/sign-up/page.tsx` | AMBER | Same trigger missing. |
| Onboarding | `/onboarding/*` | AMBER | Same router gap. |
| Daily quiz hub | `/teen/quiz/page.tsx` (server) | GREEN | Real `getDailyQuizForTeen`, real `getQuizCategoriesForTeen`. |
| Quiz runner | `/teen/quiz/[id]/quiz-runner-client.tsx` | GREEN-ish | Real submission via `/api/teen/quiz/submit`. Per spec adaptive selection by `school_type × language` is missing. |
| Earn XP | `getTeenDashboardData` + `xp_transactions` | GREEN | XP grant flows exist. |
| Wallet | `/teen/wallet/page.tsx` | GREEN | Real `coins.balance` from `user_coins` table (cited line 36). |
| Spend coins / shop | `/teen/wallet?tab=shop` (canonical) → `/teen/shop/checkout/page.tsx` | AMBER | Real `getRewards` + `getCategories`. Checkout calls cashback hook but `parental_approvals` table existence required for over-ceiling spend. |

**Verdict**: spendable flow works on the happy path but cashback toast and approval gating are not consistently fired.

### Journey 3 — Teen: chores → complete → parent verify → coins received
`GREEN`

| Step | Surface | Status |
|---|---|---|
| Teen chore list | `/teen/chores/page.tsx` | Real (server), reads `parent_chores` + `parent_chore_completions`. |
| Complete | `<TeenChoreCompleteButton>` → `/api/teen/chores/[id]/complete` | Real API route. |
| Parent verify | `/parent/chores/[id]/page.tsx` + `<ChoreVerifyButtons>` → `/api/parent/chores/[id]/verify-completion` | Real. |
| Coins paid out | RPC in `058_food_delivery_rpcs.sql` family + `coin_transactions` | Real. |

**Verdict**: this is the cleanest end-to-end loop in the codebase. It's also the newest (Wave 2 P1+ commit 12e3f53).

### Journey 4 — Teen: allowance → savings goal → lock funds
`GREEN`

| Step | Surface | Status |
|---|---|---|
| Allowance view | `/teen/wallet/allowance/page.tsx` | Real, reads `parent_allowances` + `allowance_disbursements` |
| Savings goal list | `/teen/savings/page.tsx` | Real, reads `savings_goals` + `user_coins_spendable` view |
| New goal | `/teen/savings/new/page.tsx` | Real form |
| Lock funds | `<GoalLockButton>` | Real |

**Verdict**: Wave-2 batch is solid here. Cron for disbursement (`/api/cron/notifications`, etc.) needs a separate runtime test.

### Journey 5 — Teen: marketplace → list product → buy something → confirm receipt
`AMBER`

| Step | Surface | Status |
|---|---|---|
| Marketplace browse | `/marketplace/page.tsx` | Real (server) |
| List product | `/marketplace/sell/page.tsx` + `sell-form.tsx` | Real client form, real Supabase insert |
| Listing detail | `/marketplace/listings/[id]/page.tsx` | Real |
| Buy | `<BuyButton>` | Real client component |
| Confirm receipt | `/marketplace/orders/page.tsx` | Real |
| Admin moderation | `/admin/marketplace/page.tsx` + `moderate-row.tsx` | Real |

**Verdict**: Wave-2 marketplace is real end-to-end; the missing piece is **dispute flow** (no `/marketplace/orders/[id]/dispute` route).

### Journey 6 — Teen: food order → restaurant accept → coins debited → cashback XP
`AMBER`

| Step | Surface | Status |
|---|---|---|
| Restaurant discovery | `/teen/food/page.tsx` | Real (`partners` + `menu_items`) |
| Restaurant menu / cart | `/teen/food/[partner_id]/menu-cart-client.tsx` | Real client cart |
| Order detail | `/teen/food/order/[id]/page.tsx` | Real |
| Restaurant accept | `/partner/restaurant/orders/orders-feed-client.tsx` | Real |
| Restaurant menu mgmt | `/partner/restaurant/menu/menu-manager-client.tsx` | Real |
| Coins debit RPC | migration `058_food_delivery_rpcs.sql` | Migration exists |

**Verdict**: real data end-to-end. Cashback XP fires from RPC; UI does not yet surface a "+X XP cashback" toast (§5 spec).

### Journey 7 — Partner: signup → KYC → first offer → first sale (scanner)
`RED — DASHBOARD IS FAKE`

| Step | Surface | Status |
|---|---|---|
| Apply | `/devenir-partenaire/inscription/page.tsx` + `components/partners/*Form.tsx` | GREEN (real Supabase insert) |
| KYC submit | `/partner/kyc/page.tsx` | AMBER — real form, but §22 requires PRIVATE bucket + signed-URL access; CIN currently goes to public bucket (FRONTEND_REDO P0). |
| Admin review | `/admin/partners/page.tsx` | **RED — fully mock**. Admin sees 6 fake partners, **cannot approve the real one**. Approval state never updates. |
| Partner dashboard once approved | `/partner/page.tsx` (real) **OR** `/partner/dashboard/page.tsx` (mock) | RED — dual-route ambiguity. `/partner/page.tsx` reads real partner+offers but the link from sidebar goes to the mock `/partner/dashboard`. |
| Create first offer | `/partner/offers/new/page.tsx` | GREEN |
| Run scanner | `/partner/scanner/page.tsx` | GREEN — real `/api/partner/verify-card` + `/api/partner/apply-discount` |
| First sale visible | `/partner/transactions/page.tsx` | RED — mock data permanently |

**Verdict**: a real partner who survives the manual-admin-fix to bypass the mock review queue and runs a scan will see their real sale on the scanner success screen, then go to `/partner/transactions` and see "Ahmed K. 250 DH 15 Jan 2024" — a fake row that has nothing to do with them. They will not trust the platform.

---

## Component duplication report

The whitepaper-tier-summary mentioned multiple potential duplications. Confirm/refute:

| Concern | Status | Evidence |
|---|---|---|
| 2 toast hooks | **PARTIALLY CONFIRMED** | One canonical `hooks/use-toast.ts` (radix-style queue). Plus `components/ui/sonner.tsx` (sonner toast). Plus `components/ui/toast.tsx` + `toaster.tsx` (legacy radix). Plus `lib/utils/toast.ts` (alt helper). 74 files import from a mix of `sonner` and `@/hooks/use-toast`. **Two distinct toast systems coexist; need to consolidate on sonner per shadcn current default.** |
| 5 skeleton sources | **CONFIRMED 3, not 5** | `components/ui/skeleton.tsx`, `components/ui/skeleton-variants.tsx` (MapSkeleton, QuickAccessSkeleton, CardSkeleton), `components/ui/states/skeleton-set.tsx`. Plus per-page inline skeletons (e.g. `WalletHubSkeleton` in `app/teen/wallet/page.tsx:61`, `QuestsHubSkeleton` in `app/teen/quests/page.tsx:46`, `QuizHubSkeleton`). At least 3 module-level + many inline. |
| 3 lazy loaders | **CONFIRMED 2 module-level + many `next/dynamic` callsites** | `components/teen/dashboard/lazy-components.tsx` and `lib/client/lazy-components.tsx` are two separate registries. |
| 2 use-mobile hooks | **NOT CONFIRMED** | Only `hooks/use-mobile.ts` exists at module level. (Search `**/use-mobile*` returned 1 file.) |
| AvatarCoach | **MISSING** | `Glob components/teen/AvatarCoach*` returns no files. `Glob components/**/Avatar*.tsx` returns no files (only `components/ui/avatar.tsx` from shadcn). |
| AvatarHero | **MISSING** | Same. The teen dashboard `<Hero>` (`components/teen/dashboard/hero.tsx`) is a generic XP hero, not an avatar greeting reading from `avatars` + `avatar_messages`. |
| TwinCurrencyGauge | **MISSING** | Whitepaper §5 requires explicit XP-vs-coin gauge with "no conversion" tooltip. Does not exist. `<PurchasingPower>` (`components/gamification/xp-purchase-power`) implies XP can purchase — actively wrong per §27 LOCKED. |
| OnboardingRouter | **MISSING** | Single-page onboarding. No role-router. |
| PSPRailPicker | **MISSING** | `<TopupForm>` exists but has no PSP picker. |
| EscrowReceipt | **MISSING** | No paired-row `payment_transactions`+`escrow_ledger` view component. |

**Net**: of the 18 cross-cutting components specified in `FRONTEND_REDO.md`, ~9 are missing or in a broken pre-spec state.

---

## Avatar coach status

Per §8 of the whitepaper the avatar coach is the heart of retention. Per the audit brief: does it exist, is it on `/teen`, does it pull from `avatars` + `avatar_messages` or use a hardcoded greeting?

### Findings

- **`components/teen/AvatarCoach.tsx`**: does not exist (`Glob` empty).
- **`components/**/Avatar*.tsx`**: only the shadcn primitive `components/ui/avatar.tsx` (display-only image avatar).
- The closest analogue is `components/ai/elite-ai-companion.tsx`, mounted via `app/teen/layout.tsx:24,54`.

```text
app/teen/layout.tsx:24  import { EliteAICompanion } from "@/components/ai/elite-ai-companion"
app/teen/layout.tsx:54  <EliteAICompanion role="teen" teenName={userInfo.fullName?.split(' ')[0] || 'Champ'} userId={userInfo.teenData?.id} context={userInfo.teenData} />
```

`EliteAICompanion` is a chat surface backed by `/api/agent/action` (and a duplicate `components/teen/dashboard/ai-companion.tsx` exists too). It uses agent names ("Kai" / "Aura" / "Biz" / "Hype" / "Ops") (`components/ai/elite-ai-companion.tsx:63-69`) — these are LLM personas, not the §8 avatar coach which must:

1. Greet the teen by name on `/teen` (large `<AvatarHero>`).
2. Sit sticky bottom-right on every `/teen/*` route as `<AvatarCoach>`.
3. Cycle through 5 mood states (idle / talking / celebrating / thinking / encouraging).
4. Read messages from a database table `avatar_messages` (whitepaper-named).

`Grep avatars\b|avatar_messages\b` across `components/` returns only files that reference `avatar_url` strings on user records (social feed, map preview) — **not the `avatars` table or any avatar-message storage**.

### Verdict

**The §8 avatar coach is not built.** A generic AI chat companion is mounted instead. Per FRONTEND_REDO Wave 1, this is foundational and must ship before page rebuilds. **P0 blocker for whitepaper coherence.**

---

## Hardcoded / scaffolded / rushed — consolidated list with effort

| Item | Effort | What |
|---|---|---|
| Replace `/partner/dashboard` with consolidated real `/partner` | M | Delete the 350-line mock, redirect `/partner/dashboard` → `/partner`, ensure sidebar `<PartnerSidebar>` points at `/partner`. |
| Build real `/partner/transactions` | M | Wire `partner_transactions` (existing or §9 column-add) + commission column. |
| Build real `/partner/stats` | M | KPI from `partner_transactions` time-series; existing `analytics-chart-lazy` reusable. |
| Build real `/partner/events` | M | Read partner-authored events from `events` extension columns once §14 schema lands; gate behind admin review. |
| Build real `/admin/partners` KYC queue | L | Server-side fetch `partners` with KYC join, signed-URL document fetch, audit log row on each decision (§29 inv 8), commission rate adjustment, status lifecycle widget. |
| Build real `/admin/proofs` queue | L | Read `physical_challenges_evidence` from PRIVATE bucket via signed URLs (5-min expiry per §22), AI flag display, decision endpoint. |
| Fix `/teen/xp-value` per §27 LOCKED | L | Either delete the page entirely (XP has no DH equivalent) OR rewrite copy + ROI calculator to remove the 50% payment fiction. Probable outcome: full rewrite from "Valeur XP en DH" frame to "XP progress + level explainer" frame. |
| Build `<AvatarCoach>` + `<AvatarHero>` + `avatars` + `avatar_messages` schema | L | Net-new. 5 mood states, named greeting, message table read. Even template-copy first. |
| Build `<TwinCurrencyGauge>` and replace `<PurchasingPower>` | M | Remove the "XP can purchase" implication from teen dashboard. |
| Replace mock `<EvolutionTracker>` stats in `/parent` | S | Stats `{ responsibility, social, creativity, academic }` need either real per-pillar XP rollup or a "Coming soon" badge for v1. |
| Replace `<UpcomingEvents events={[]} />` literal | S | Wire from `bookings` join `events`. |
| Wire `PENDING_REQUESTS` and `SUGGESTIONS` on `/teen/friends` | M | Backend endpoint per `app/teen/friends/page.tsx:23` TODO. |
| Wire `todayXP` / `weekXP` on `/teen/activity` | S | New `/api/teen/activities/stats` endpoint. |
| Replace `sampleQuizQuestions` on `/teen/academic` quiz runner | M | Pull questions per quiz id from existing `daily_quiz_questions` family. |
| Replace `shareableItems` literal on `/teen/share` | M | Real teen achievement feed. |
| Resolve VIP tier-name collision (XP-tier vs Family-tier) | M | Whitepaper-driven rename — affects 12+ files. |
| Lock `/admin/scripts-sql` to `super_admin` | S | Add role check; remove from default admin sidebar. |
| Move CIN uploads off public bucket on `/parent/e-signature` & `/partner/kyc` | M | Storage bucket migration + signed-URL fetch. |
| Consolidate two toast systems on sonner | S | Delete `components/ui/toast.tsx` + `toaster.tsx`, migrate the ~10 callsites. |
| Implement `<OnboardingRouter>` and `is_onboarded` flag | M | Spec'd in FRONTEND_REDO Wave 1. |
| Implement linking-codes table for `/parent/teens/add` | M | Spec'd P0. |
| Delete duplicate routes (`/teen/coins`, `/teen/calendar`, `/teen/social`, `/teen/messages`, `/teen/games`, `/teen/academic`, `/teen/rewards`, `/teen/challenges`, `/parent/live`, `/devenir-influenceur*`, `/djs/*`, `/ambassador/boutique`, `/espace`, `/daily`, `/autorisations*`, `/notifications*`, `/gamification/*`) | S each | Replace with `redirect()` 1-liners. ~20 files. |

**Effort key**: S = ≤ 1 dev-day. M = 2–4 dev-days. L = 1–2 dev-weeks.

**Total estimated**: ~6 weeks of one mid-senior frontend engineer to bring all P0 mock pages to real-data and to ship the missing cross-cutting components. ~12 weeks for the full FRONTEND_REDO P0+P1 set.

---

## Risks

### P0 — must fix before any external user touches the system

1. **Admin moderation queues show fake data** — `app/admin/partners/page.tsx`, `app/admin/proofs/page.tsx`. Real partners cannot be approved. Real proofs cannot be moderated. Compliance hazard: an admin clicks "approve" on a fake CIN/RC and nothing happens; meanwhile a real submitted KYC sits unread.
2. **Partner-facing dashboard is fake** — `app/partner/dashboard/page.tsx`. A real partner sees fake stats and cannot reconcile. Reputational hazard.
3. **`/teen/xp-value` actively contradicts the locked currency model (§27)** — lying about a 50% XP-payment feature that will never ship because it would break dual-currency separation.
4. **§8 AvatarCoach is not built** — the retention loop the whitepaper centres on does not exist. EliteAICompanion is a chat, not the avatar.
5. **Onboarding has no role router and no `is_onboarded` flag** — possible redirect loops on first sign-up.
6. **Linking codes table missing** — parent-add-teen flow can't enforce 24h-TTL single-use guarantee.
7. **CIN/proof uploads on public buckets** — `loi 09-08` / CNDP risk per §22.
8. **`/admin/scripts-sql`** open to any admin — privileged SQL execution surface.

### P1 — must fix before v1 launch

9. **Fake stats on `/parent` (EvolutionTracker, UpcomingEvents)** — looks-finished but identical for every teen.
10. **Fake transactions/stats/events on `/partner/transactions`, `/partner/stats`, `/partner/events`** — partner trust killer.
11. **Quiz runner fakes the question set on `/teen/academic`** — every quiz is the same 3 algebra questions.
12. **`/teen/friends` pending-requests tab is dead UI** — dropdown exists but renders nothing always.
13. **`/teen/share` shareable items are fixed JPEG-style mockups** — every teen shares the same six achievements.
14. **Duplicate quest surfaces** (`/gamification/missions`, `/gamification/defis`, `/teen/challenges`) with inconsistent data sources.
15. **Two toast systems** — UX inconsistency hazard.
16. **VIP tier-name collision** (XP-Bronze/Silver/Gold/Platinum vs Family-Free/Silver/Gold/Platinum) — same words, different ladders.

### P2 — polish

17. Per-route inline skeletons should consolidate into `components/ui/states/skeleton-set.tsx`.
18. Lazy-loader registries should consolidate.
19. Static legal copy missing CNDP / loi 09-08 / escrow disclosure.
20. Emergency phone placeholder `+212 6 00 00 00 00` on `/parent/live`.

---

## Recommended pre-launch actions (numbered, prioritized)

1. **STOP-SHIP the 7 P0 mock pages.** Either build them real or hide them from sidebar/nav (`/partner/dashboard`, `/partner/transactions`, `/partner/stats`, `/partner/events`, `/admin/partners`, `/admin/proofs`, `/teen/xp-value`).
2. **Consolidate `/partner` and `/partner/dashboard`** to a single canonical route. The real one (`app/partner/page.tsx`) reads `partners` + `partner_discounts` + `discount_usage` correctly; redirect `/partner/dashboard` → `/partner` and delete the mock file.
3. **Rewrite `/admin/partners` and `/admin/proofs`** as server-rendered pages with signed-URL document fetch and `admin_audit_logs` writes on every decision.
4. **Delete or rewrite `/teen/xp-value`** to remove the 50% XP-payment fiction. If kept, frame as "your XP progress" only — no DH equivalence anywhere.
5. **Build `<AvatarCoach>` + `<AvatarHero>`** with a `avatars` + `avatar_messages` table and 5 mood states. Even a template-message implementation is better than the chat-only EliteAICompanion for v1.
6. **Build `<TwinCurrencyGauge>`** and remove `<PurchasingPower>` (or rename it "XP level explainer"). Add an "XP and coins never convert" tooltip everywhere money is shown.
7. **Implement `<OnboardingRouter>`** and the `is_onboarded` profile flag. Branch by role.
8. **Implement `linking_codes` table** for parent-teen linking.
9. **Move CIN/proof uploads to PRIVATE bucket** with 5-min signed URLs (§22).
10. **Lock `/admin/scripts-sql`** behind a `super_admin` flag on `admin_roles`.
11. **Wire the parent dashboard's `<EvolutionTracker>` stats** from real per-pillar XP rollup, OR clearly badge "Pilote — chiffres d'exemple" while wiring is pending.
12. **Wire `<UpcomingEvents>`** from `bookings` × `events`.
13. **Resolve VIP tier-name collision** — rename the XP-tier ladder to e.g. "Niveaux d'effort" and reserve "Bronze/Silver/Gold/Platinum" for the family subscription tiers.
14. **Consolidate toasts on sonner** — delete radix `toast.tsx` + `toaster.tsx`, migrate ~10 callsites.
15. **Add empty-state UI** on every list page that lacks one (`/teen/friends` requests tab, `/teen/share` if achievement feed is empty, etc.).
16. **Delete duplicate routes** per `FRONTEND_REDO.md §"Pages to delete"`. Replace each with a `redirect()` 1-liner.
17. **Add CNDP / loi 09-08 / escrow language** to `/legal/*`.
18. **Replace placeholder phone** `+212 6 00 00 00 00` with the real ops emergency number on `/parent/live`.
19. **Run end-to-end tests for the 7 critical journeys** with real DB rows to confirm none degrades to a mock surface.
20. **Audit imports of `pravatar.cc`, `i.pravatar.cc`, and any external placeholder-image domain** — `app/partner/dashboard/page.tsx:145` must not survive into prod.

---

## Coverage summary

- Pages enumerated: ≈155 across `app/**/page.tsx`.
- Pages classified: 33 examined directly, the remaining ≈120 inferred from grep + `FRONTEND_REDO.md` matrix.
- P0 mock pages identified with `file:line` evidence: 7.
- P0 partials with broken stat panels: 6.
- P1+ partials with explicit `// TODO(data)` comments: ~12 (see grep results in §1).
- Critical user journeys traced end-to-end: 7 (chores GREEN; allowance/savings GREEN; food/marketplace AMBER; teen-quiz/wallet AMBER; parent-onboarding/topup AMBER; partner-onboarding RED).
- Cross-cutting components missing vs FRONTEND_REDO Wave 1: 9 of 18.
- Toast / skeleton / lazy duplication: confirmed 2 toast systems, 3 skeleton sources, 2 lazy registries; use-mobile is single-source.
- PWA: service worker registered (`components/pwa/service-worker-registration.tsx:109`), manifest linked (`app/layout.tsx:106`); push subscribe button surface exists in `components/install-pwa-prompt.tsx`. PWA itself is GREEN. (Push notification UI subscribe button on `/parent/notifications` and `/teen/settings` is wired via `components/install-pwa-prompt.tsx` but quiet-hours UI is not.)
- Service worker file: `public/sw.js` exists.

The matrix in §"Mock/hardcode inventory" is the load-bearing deliverable; everything else flows from those 13 rows.
