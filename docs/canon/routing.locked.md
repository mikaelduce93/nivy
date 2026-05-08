# routing.locked.md — Canonical URL Map (LOCKED)

> **Date**: 2026-05-08. **Status**: LOCKED. Read-only canonicalization.
> **Sources**: `app/**` enumeration via `docs/vision/audit-frontend-reality/A1-routes-inventory.md`; gap & verdict via `docs/vision/FRONTEND_REDO.md`, `A2-vision-gap.md`, `A3-broken-links.md`, `C4-duplicates.md`; spec anchor in `docs/vision/PRODUCT_WHITEPAPER.md` (v3, 2026-05-07).
> **Scope**: only routes that exist on disk OR are explicitly required by the whitepaper / FRONTEND_REDO. Nothing invented.
> **Contradictions**: flagged inline and consolidated in §6 (Unresolved founder decisions).

---

## 1. LOCKED route map per role

Only canonical paths. Redirect-only stubs and duplicates are excluded (see §2 / §3).

### 1.1 PUBLIC (no role gate)

| URL | Notes |
|---|---|
| `/` | Marketing landing (REDESIGN P1) |
| `/a-propos` | Static (P2) |
| `/aide` | Help hub (canonical — `/aide/faq` deprecated → see §2) |
| `/agenda` | Public events list |
| `/agenda/[id]` | Public event detail |
| `/anniversaires` | Birthday booking discovery + flow (canonical) |
| `/blog` | Marketing blog index |
| `/carte-vip` | VIP card landing |
| `/carte-vip/souscrire` | Subscribe flow |
| `/carte-vip/confirmation` | Post-subscribe |
| `/carte-vip/recompenses` | Rewards browse |
| `/clubs` | Club directory |
| `/clubs/[slug]` | Club detail |
| `/communaute` | Public feed (KEEP — pending merge decision §6) |
| `/devenir-ambassadeur` | Ambassador landing |
| `/devenir-ambassadeur/programme` | Program details |
| `/devenir-ambassadeur/candidature` | Apply |
| `/devenir-partenaire` | Partner landing |
| `/devenir-partenaire/inscription` | Apply |
| `/galerie` | Gallery |
| `/guide-parents` | Parent marketing |
| `/legal/cgu` | Terms |
| `/legal/cgv` | Sales terms |
| `/legal/cookies` | Cookies policy |
| `/legal/confidentialite` | Privacy |
| `/legal/mentions-legales` | Legal mentions |
| `/marketplace` | C2C marketplace landing |
| `/marketplace/listings/[id]` | Listing detail |
| `/marketplace/my-listings` | Seller's own listings |
| `/marketplace/orders` | Buyer/seller orders |
| `/marketplace/sell` | Create listing |
| `/offline` | PWA fallback |
| `/partenaires/merci` | Post-application thanks |
| `/reservation` | Booking entry |
| `/reservation/paiement` | Payment step |
| `/reservation/confirmation` | Post-booking |
| `/securite` | Safety page |
| `/temoignages` | Testimonials |

### 1.2 AUTH

| URL | Notes |
|---|---|
| `/auth/login` | |
| `/auth/sign-up` | Must capture role into `raw_user_meta_data.role` (§19) |
| `/auth/sign-up-success` | |
| `/auth/confirm-email` | |
| `/auth/redirect` | Post-auth role router; honors `is_onboarded` |
| `/auth/validate-teen` | Teen validation by parent |
| `/auth/error` | |
| `/auth/callback` | Supabase auth callback (route handler) |

### 1.3 ONBOARDING

| URL | Notes |
|---|---|
| `/onboarding` | Router; dispatches by role + `is_onboarded` |
| `/onboarding/interests` | |
| `/onboarding/goals` | |
| `/onboarding/learning-style` | |
| `/onboarding/complete` | |

### 1.4 TEEN (`/teen/*`, layout: `app/teen/layout.tsx`)

| URL | Notes |
|---|---|
| `/teen` | Dashboard / shell home |
| `/teen/activity` | Activity feed (read `user_notifications`) |
| `/teen/aide-scolaire` | Academic hub |
| `/teen/chores` | |
| `/teen/circles` | Close-friend circles + chat (absorbs `/teen/messages` per §3) |
| `/teen/create` | Creator submission entry |
| `/teen/defis-physiques` | Physical challenges |
| `/teen/events` | Teen events (canonical — absorbs `/teen/calendar` via `?view=`) |
| `/teen/feed` | Social feed |
| `/teen/feed/[id]` | Post detail |
| `/teen/food` | Food delivery hub |
| `/teen/food/[partner_id]` | Restaurant menu |
| `/teen/food/order/[id]` | Order detail |
| `/teen/friends` | Friends list (add by code/QR) |
| `/teen/internships` | Internship listings |
| `/teen/leaderboard` | Leaderboard (see §6 unresolved — naming collision) |
| `/teen/mentors` | Mentor directory |
| `/teen/mentors/[id]` | Mentor profile |
| `/teen/mentor-sessions` | Booked / past sessions |
| `/teen/offres` | Partner offers personalized |
| `/teen/pathways` | Career pathways |
| `/teen/profile` | Profile (settings live under `?tab=settings`) |
| `/teen/profile/edit` | Edit profile |
| `/teen/quests` | Unified quest hub (daily/weekly/monthly/seasonal/event tabs) |
| `/teen/quests/[id]` | Quest detail |
| `/teen/quests/friend-defis` | Friend-vs-friend défis (FD2 wired) |
| `/teen/quiz` | Daily quiz hub |
| `/teen/quiz/[id]` | Quiz runner / result |
| `/teen/quiz/history` | History |
| `/teen/rides` | Transport hub |
| `/teen/rides/request` | Request ride |
| `/teen/savings` | Savings goals |
| `/teen/savings/new` | Create goal |
| `/teen/share` | Share / invite |
| `/teen/shop/checkout` | Checkout (canonical — `/teen/shop` redirects to wallet, see §2) |
| `/teen/shop/history` | Past redemptions |
| `/teen/streak` | Streak detail |
| `/teen/vip-card` | Teen view of family VIP card |
| `/teen/wallet` | Wallet hub (XP + coins). `?tab=shop` is the canonical shop surface |
| `/teen/wallet/allowance` | Allowance detail |
| `/teen/xp-value` | XP-to-DH explainer (§27 100 XP/DH) |

**Sunset / not yet built** (see §2, §4): `/teen/social`, `/teen/games`, `/teen/calendar`, `/teen/messages`, `/teen/avatar` (NEW), `/teen/birthday` (NEW), `/teen/crews` (NEW), `/teen/wellbeing` (NEW deferred).

### 1.5 PARENT (`/parent/*`)

| URL | Notes |
|---|---|
| `/parent` | Dashboard |
| `/parent/allowances` | List recurring allowances |
| `/parent/allowances/new` | Create allowance (must include cadence picker — currently stub, P1) |
| `/parent/approvals` | Per-action approval queue (canonical — absorbs `/autorisations*`) |
| `/parent/budget` | `teen_budget_limits` per teen |
| `/parent/chores` | List chores |
| `/parent/chores/new` | Create chore |
| `/parent/chores/[id]` | Chore detail |
| `/parent/documents` | Document vault (signed-URL only, PRIVATE bucket) |
| `/parent/e-signature` | E-sig + CIN upload (PRIVATE bucket) |
| `/parent/events` | Booked teen events |
| `/parent/food` | Food spend / budgets per teen |
| `/parent/grades` | Teen grades (gate above 200 XP) |
| `/parent/history` | Spend history (`coin_transactions` + `escrow_ledger`) |
| `/parent/mentor-sessions` | Mentor session approvals |
| `/parent/mentor-sessions/[id]` | Session detail |
| `/parent/notifications` | Inbox + preferences (canonical — absorbs `/notifications*`) |
| `/parent/rides` | Transport approvals / live |
| `/parent/rides/[id]` | Ride detail |
| `/parent/savings` | Match config |
| `/parent/settings` | Parent prefs |
| `/parent/teens` | Linked teens |
| `/parent/teens/add` | Link by 6-digit code |
| `/parent/topup` | Top-up entry |
| `/parent/topup/manual` | Manual / cash-rail top-up |

**Sunset / not yet built**: `/parent/live` (DELETE/fold), `/parent/ambassador` (NEW P2), `/parent/family-plan` (NEW P2), `/parent/topup/recurring` (NEW P1).

### 1.6 PARTNER (`/partner/*`)

> Founder decision required: collapse `/partner` ↔ `/partner/dashboard` (see §6).

| URL | Notes |
|---|---|
| `/partner` | Dashboard root (canonical hub — see §6 for `/partner/dashboard` resolution) |
| `/partner/events` | Partner events authoring |
| `/partner/invoices` | |
| `/partner/kyc` | KYC upload (PRIVATE bucket, signed 5-min URLs) |
| `/partner/offers` | Offer list |
| `/partner/offers/new` | Create offer |
| `/partner/offers/[id]/edit` | Edit offer |
| `/partner/payouts` | Monthly payouts |
| `/partner/restaurant/menu` | Restaurant menu CRUD |
| `/partner/restaurant/orders` | Restaurant order feed |
| `/partner/scanner` | QR scanner (real device camera, replace mock) |
| `/partner/settings` | |
| `/partner/stats` | KPIs |
| `/partner/support` | Help / tickets |
| `/partner/transactions` | Sales feed |

**Sunset / not yet built**: `/partner/awards` (NEW P0 — teacher/coach XP), `/partner/staff` (NEW P1), `/partner/anniversaires` (NEW P1), `/partner/restaurant` root + `/partner/restaurant/[id]` (NEW P1).

### 1.7 ADMIN (`/admin/*`)

| URL | Notes |
|---|---|
| `/admin` | Admin home |
| `/admin/ambassadeurs` | Ambassador KYC + tier |
| `/admin/analytics` | Platform metrics |
| `/admin/anniversaires` | Birthday orders |
| `/admin/anniversaires/[id]` | Order detail |
| `/admin/check-in` | Event check-in console |
| `/admin/clubs` | (see §6 — possibly merge into `/admin/partners`) |
| `/admin/clubs/creer` | |
| `/admin/clubs/[id]/supprimer` | |
| `/admin/content` | AI content moderation hub |
| `/admin/content/review` | Review queue |
| `/admin/creator-moderation` | Creator submissions |
| `/admin/drivers` | Driver onboarding queue |
| `/admin/drivers/[id]` | Driver detail / approval |
| `/admin/evenements` | Events admin |
| `/admin/evenements/creer` | |
| `/admin/evenements/[id]/modifier` | |
| `/admin/evenements/[id]/supprimer` | |
| `/admin/gamification-setup` | Ops |
| `/admin/gamification/scorecard` | Ops |
| `/admin/internships` | Internship moderation |
| `/admin/marketplace` | C2C moderation |
| `/admin/mentors` | Mentor approvals |
| `/admin/partners` | Partner KYC + commission |
| `/admin/permissions` | Role/permission management |
| `/admin/proofs` | Défi proof moderation (PRIVATE bucket signed URLs) |
| `/admin/reservations` | Booking list |
| `/admin/tag-normalize` | Ops utility |
| `/admin/topups` | Top-up admin |
| `/admin/utilisateurs` | User browser (must support anonymize/export) |
| `/admin/logs` | Activity logs (see §6 — relationship with `/admin/audit-log`) |

**Sunset / not yet built**: `/admin/scripts-sql` (RESTRICT to `super_admin` or REMOVE — P0), `/admin/audit-log` (NEW P0/P1 — overlaps with `/admin/logs`, see §6), `/admin/moderation` (NEW P1 unified queue), `/admin/refunds` (NEW P1), `/admin/broadcasts` (NEW P1), `/admin/cndp` (NEW P1 DSAR queue).

### 1.8 AMBASSADOR (`/ambassador/*`)

| URL | Notes |
|---|---|
| `/ambassador` | Dashboard |
| `/ambassador/comment-gagner` | "How it works" |
| `/ambassador/commissions` | Commissions view |
| `/ambassador/marketing` | Asset library |
| `/ambassador/referrals` | Filleuls list |
| `/ambassador/withdrawals` | Cash-out (≥200 DH) |

**Sunset**: `/ambassador/boutique` (DELETE — out of scope per FRONTEND_REDO §5).

### 1.9 MENTOR (`/mentor/*`)

| URL | Notes |
|---|---|
| `/mentor/dashboard` | Mentor home (no `/mentor` index — see §6) |
| `/mentor/profile/edit` | Profile |
| `/mentor/sessions` | Sessions |

### 1.10 DRIVER

> Driver surfaces are API-only today (`/api/driver/*`). No `/driver/*` pages on disk.
> Founder decision required (§6): is driver a UI role or API-only contractor surface?

---

## 2. DEPRECATED routes (redirects / stubs)

Includes all 17 known redirect-only stubs from A1-routes-inventory.md plus the duplicate consolidations from C4 / FRONTEND_REDO. Type semantics:
- **307**: temporary `redirect()`
- **308**: permanent `permanentRedirect()` (`robots: noindex`)
- **410**: gone (delete entirely; no redirect)
- **keep**: keep stub for backward-compat indefinitely

| Path | Replacement | Type |
|---|---|---|
| `/teen/challenges` | `/teen/quests` | **308** (currently re-exports `/teen/defis-physiques` — REPLACE with redirect) |
| `/teen/achievements` | `/gamification/collections` (or `/teen/profile?tab=achievements` — see §6) | 307 (current) → align with §6 |
| `/teen/map` | `/teen/social?tab=map` | **410** (per A3: home dashboard already deep-links — stub is dead weight) |
| `/teen/passions` | `/onboarding` | 308 |
| `/teen/rewards` | `/teen/wallet?tab=shop` | 308 |
| `/teen/settings` | `/teen/profile?tab=settings` | 308 |
| `/teen/shop` | `/teen/wallet?tab=shop` | 308 |
| `/teen/coins` | `/teen/wallet` | 308 |
| `/teen/academic` | `/teen/aide-scolaire` | 308 |
| `/teen/social` | `/teen` (fold into dashboard) | **keep** until `?tab=map` deep-link migrated, then **410** |
| `/teen/games` | (none) | **410** (out of scope) |
| `/teen/calendar` | `/teen/events?view=calendar` | 308 |
| `/teen/messages` | `/teen/circles` | 308 |
| `/gamification/defis-physiques` | `/teen/defis-physiques` | 308 |
| `/gamification/aide-scolaire` | `/teen/aide-scolaire` | 308 |
| `/gamification/crews` | `/teen/crews` (NEW — target missing, see §4) | **keep** until target ships |
| `/gamification/boutique` | `/teen/wallet?tab=shop` | 308 |
| `/gamification/missions` | `/teen/quests` | 308 (current) |
| `/gamification/defis` | `/teen/quests/friend-defis` | 308 (current) |
| `/gamification` | `/teen` | 308 (per FRONTEND_REDO §8) |
| `/gamification/leaderboard` | `/teen/leaderboard` | 308 |
| `/gamification/parcours` | `/teen/quests` | **410** (static mock, no consumers) |
| `/gamification/collections` | `/teen/profile?tab=achievements` (see §6) | 307 pending §6 |
| `/gamification/roue` | (none — `wheel_streaks` trigger broken) | **410** |
| `/xp-shop` | `/teen/wallet?tab=shop` | 308 |
| `/espace` | `/auth/redirect` (role router) | 308 |
| `/daily` | `/teen/quests` | 308 |
| `/aide/faq` | `/aide` | 308 |
| `/anniversaires/organiser` | `/anniversaires` | 308 |
| `/notifications` | `/parent/notifications` OR `/teen/activity` (role-resolved at `/auth/redirect`) | 308 |
| `/notifications/preferences` | `/parent/settings#notifications` OR `/teen/profile?tab=settings#notifications` | 308 |
| `/autorisations` | `/parent/approvals` | 308 |
| `/autorisations/ajouter` | `/parent/approvals` | 308 |
| `/devenir-influenceur` | `/devenir-ambassadeur` | 308 (fold into ambassador track) |
| `/devenir-influenceur/candidature` | `/devenir-ambassadeur/candidature` | 308 |
| `/djs` | `/agenda` | 308 (out of scope, fold into events) |
| `/djs/[id]` | `/agenda/[id]` | 308 |
| `/djs/candidature` | (none) | **410** |
| `/dev/defi-card-preview` | (none) | **410** in production builds |
| `/reservation` | `/teen/shop/checkout?booking=...` (per FRONTEND_REDO §1) | **keep** during migration; 308 once teen flow is canonical (see §6) |

**17 known redirect-stubs already in code** (per A1, line 19): `/teen/challenges`, `/teen/achievements`, `/teen/map`, `/teen/passions`, `/teen/rewards`, `/teen/settings`, `/teen/shop`, `/teen/coins`, `/teen/academic`, `/gamification/defis-physiques`, `/gamification/aide-scolaire`, `/gamification/crews`, `/gamification/boutique`, `/gamification/missions`, `/gamification/defis`, `/xp-shop`, `/espace` — all retained, behaviors aligned above.

---

## 3. MERGE TARGETS (live duplicates — both wired)

| Cluster | Sources | Canonical | Action |
|---|---|---|---|
| Gamification hub vs Teen shell | `/gamification` + `/teen` | **`/teen`** | Redirect `/gamification` → `/teen` once roue + leaderboard CTAs migrated |
| Teen events surfaces | `/teen/events` + `/teen/calendar` | **`/teen/events`** with `?view=list\|calendar` | Both share `getTeenDashboardData` loader — trivial merge |
| Help / FAQ | `/aide` + `/aide/faq` | **`/aide`** | Redirect `/aide/faq` → `/aide` |
| Anniversaires | `/anniversaires` + `/anniversaires/organiser` | **`/anniversaires`** | Redirect `/organiser` → main; legacy stripped form |
| Daily challenges | `/daily` + `/teen/quests` | **`/teen/quests`** | Redirect `/daily` (legacy parent-flavored hub) |
| Parent approvals | `/parent/approvals` + `/autorisations*` | **`/parent/approvals`** | Redirect `/autorisations*` |
| Notifications | `/notifications*` + `/parent/notifications` + `/teen/activity` | **role-namespaced** (`/parent/notifications`, `/teen/activity`) | Redirect `/notifications` via role-router |
| Partner dashboard | `/partner` + `/partner/dashboard` | **`/partner`** (recommended — see §6) | Founder decision |
| Reservation flow | `/reservation*` + `/teen/shop/checkout?booking=` | **`/teen/shop/checkout?booking=`** (per FRONTEND_REDO §1) | Keep `/reservation` for public/anonymous booking; migrate auth'd users to teen flow (see §6) |
| Teen feed vs `/communaute` | `/teen/feed` + `/communaute` | **`/teen/feed`** (auth) and `/communaute` (public preview) | Document split or redirect public → marketing variant |
| Achievements / collections | `/teen/achievements` (stub) + `/gamification/collections` | **`/teen/profile?tab=achievements`** (recommended — see §6) | §6 decision |

---

## 4. MISSING (vision-required, not built)

Per `A2-vision-gap.md` Table 1 + FRONTEND_REDO "NEW" verdicts. Routes the whitepaper requires but **no `page.tsx` exists**.

| # | Route | Spec § | Priority |
|---|---|---|---|
| 1 | `/teen/avatar` | §8 + `avatar-coach.md` | P1 |
| 2 | `/teen/crews` | §17 + `social-graph.md` | **P1** (blocks `/gamification/crews` redirect target) |
| 3 | `/teen/birthday` | §13 + `birthday.md` | P2 |
| 4 | `/teen/wellbeing` | §19.4 (deferred) | P2 |
| 5 | `/teen/aide-scolaire/tutors` | §15 + `academic-integration.md` | P1 |
| 6 | `/teen/aide-scolaire/grades` | §15 | P1 |
| 7 | `/teen/notifications` (teen-namespaced inbox) | §16 invariant ("role-namespaced inboxes") | P1 — see §6 (relationship with `/teen/activity`) |
| 8 | `/parent/ambassador` | §12 (parent-also-ambassador) | P2 |
| 9 | `/parent/family-plan` | §10 + `economy.md` | P2 |
| 10 | `/parent/topup/recurring` | `allowance-savings.md` §1.a | P1 |
| 11 | `/partner/awards` | §9 + `teacher-coach-xp.md` | **P0** (biggest single missing partner feature) |
| 12 | `/partner/awards/[id]` | §9 (review surface) | P0 |
| 13 | `/partner/staff` | §9 (`partner_staff` mgmt) | P1 |
| 14 | `/partner/anniversaires` | §13 (venue partner pack authoring) | P1 |
| 15 | `/partner/restaurant` (root) | `food-delivery-restaurants.md` §3 | P1 |
| 16 | `/partner/restaurant/[id]` | §3 | P1 |
| 17 | `/admin/moderation` | §18 + `admin-moderation.md` (unified `moderation_queue`) | P1 |
| 18 | `/admin/refunds` | §18 + §22 | P1 |
| 19 | `/admin/broadcasts` | §16 + §18 | P1 |
| 20 | `/admin/audit-log` | §18 + §29 invariant 8 | P1 (see §6 — overlap with `/admin/logs`) |
| 21 | `/admin/cndp` | §22 + `cndp-filing-dossier/` | P1 |
| 22 | `/onboarding/[role]` per-role flows (partner, ambassador) | §19 | P1 |
| 23 | `/account/export` | §22 (CNDP / right-to-erasure) | P1 |
| 24 | `/account/delete` | §22 | P1 |
| 25 | `/mentor` (index) | implied parent of `/mentor/dashboard` | P2 |
| 26 | `/admin/utilisateurs/[id]` | A3 broken link — admin user detail | P1 |
| 27 | `/admin/reservations/[id]` | A3 broken link | P1 |
| 28 | `/admin/ambassadeurs/[id]` | A3 broken link | P1 |
| 29 | `/admin/clubs/[id]/modifier` | A3 broken link | P2 |
| 30 | `/parent/teens/[id]` | A3 broken link (referenced from `/parent/teens` cards) | P1 |
| 31 | `/parent/profile` | A3 broken link (referenced from parent header dropdown) | P2 — OR redirect to `/parent/settings` |
| 32 | `/partner/profile` | A3 broken link | P2 — OR redirect to `/partner/settings` |
| 33 | `/teen/quests/friend-defis/new` | A3 broken link | P2 — OR open as modal |
| 34 | `/teen/settings/{privacy,notifications,visibility,language}` | A3 broken links from profile-hub-client | P2 — OR consolidate inside `/teen/profile?tab=settings` |
| 35 | PWA assets `/sw.js` + `/manifest.json` | §16 + §25 | **P0** (currently 404) |

---

## 5. FORBIDDEN patterns

Hard rules. Lints and code review must reject violations.

1. **No `<Link>` to `/dashboard`.** Use `/auth/redirect` (role router) or the role-specific home (`/teen`, `/parent`, `/partner`, `/ambassador`, `/admin`, `/mentor/dashboard`). Currently 5+ broken refs in `components/layouts/app-sidebar.tsx` + `components/dashboard/header.tsx`.
2. **No new `/gamification/*` routes.** Zone is sunset. Existing routes only kept as redirect stubs (§2).
3. **No `<Link>` to bare `/notifications` or `/notifications/preferences`.** Use role-namespaced (`/parent/notifications`, `/teen/activity`).
4. **No `<Link>` to `/profile`, `/profile/enfants`, `/profile/enfants/ajouter`, `/profile/modifier`, `/mon-compte`, `/mes-reservations`.** All are legacy paths from a prior IA. Use role-prefixed equivalents (`/parent/teens`, `/parent/teens/add`, `/parent/settings`).
5. **No `<Link>` to `/events` or `/events/[id]`.** Canonical is `/agenda` and `/agenda/[id]`.
6. **No `<Link>` to `/cgv`, `/conditions`, `/support`.** Canonical is `/legal/cgv`, `/legal/cgu`, `/aide`.
7. **Deep links must include role prefix.** `?tab=shop` only valid when prefixed by `/teen/wallet`. `?tab=settings` only on `/teen/profile`.
8. **No `<Link>` directly to redirect-only stubs from §2.** Always link to the canonical replacement to avoid the bounce hop. Especially: `/teen/shop` (linked from many places — re-point to `/teen/wallet?tab=shop`), `/teen/coins`, `/gamification/missions`.
9. **No new top-level marketing-style URLs for authenticated surfaces.** Auth routes must live under `/teen/*`, `/parent/*`, `/partner/*`, `/admin/*`, `/ambassador/*`, `/mentor/*`. Forbids re-introducing `/espace`, `/daily`, `/dashboard`, `/communaute` for auth.
10. **No raw SQL admin tools outside `super_admin` gate.** `/admin/scripts-sql` must be locked down or removed.
11. **No public-bucket reads for KYC/CIN/teen-photo/proof assets.** All must use PRIVATE bucket + signed URLs (5-min for KYC, signed for proofs/documents). Affects `/parent/e-signature`, `/parent/documents`, `/admin/proofs`, `/partner/kyc`.
12. **No new authenticated route without `is_onboarded` gate via `/auth/redirect`.** Every new role page must redirect-to-onboarding when flag is false.
13. **No `<Link href={...}>` with runtime-only expressions for `notification.action_url`** without server-side validation against the canonical route table — DB-stored URLs are likely stale (per A3).
14. **No new `/dev/*` or `/admin/scripts-sql/**` route in production builds.** Strip via `next.config` env-gate.
15. **No `?action=create` / `?action=battle` query params** that the target page does not handle (per A3 — `/teen/circles` has neither handler today). Either implement or use a dedicated path.

---

## 6. UNRESOLVED founder decisions

Contradictions between docs that need a single ruling. Each item names the conflict, lists the docs in disagreement, and proposes a recommended option.

| # | Decision | Conflict | Recommended |
|---|---|---|---|
| 1 | **`/partner` vs `/partner/dashboard`** | FRONTEND_REDO §4 says "two pages doing same job" → CONSOLIDATE; A1 lists both as live with separate `page.tsx`. | **Canonical = `/partner`**. Make `/partner/dashboard` a 308 redirect to `/partner`. Rationale: matches `/admin`, `/teen`, `/parent`, `/ambassador` convention. |
| 2 | **`/admin/logs` vs `/admin/audit-log`** | FRONTEND_REDO §6 lists both (KEEP `/admin/logs`, NEW `/admin/audit-log`). A2 Table 1 #10 says `/admin/logs` is "generic activity feed, not the canonical audit store". | **Two surfaces**: `/admin/audit-log` (NEW, canonical compliance store, 7-y retention, every admin action) + `/admin/logs` (KEEP as ops activity feed). Or: collapse into one `/admin/audit-log`. **Recommended: collapse — one truth.** |
| 3 | **`/teen/leaderboard` naming collision** | C4 §1.2: `/teen/leaderboard` (creator monthly stats — Wave 2.3) vs `/gamification/leaderboard` (XP global). Same word, two boards. | **Rename `/teen/leaderboard` → `/teen/leaderboard/creators`**, redirect `/gamification/leaderboard` → `/teen/leaderboard` (XP global as default). Or: hoist both under `/teen/leaderboard?scope=xp\|creators`. **Recommended: query-param scope** — single URL, switchable. |
| 4 | **`/teen/notifications` (NEW) vs `/teen/activity`** | A2 Table 1 #17 requires teen-namespaced inbox `/teen/notifications`. A1 shows `/teen/activity` already exists. FRONTEND_REDO §2 routes activity to `user_notifications`. | **Canonical = `/teen/activity`** (already on disk). Drop the `/teen/notifications` requirement; treat `/teen/activity` as the teen-namespaced inbox. Update §16 spec language. |
| 5 | **`/teen/achievements` redirect target** | A1 line 139: redirects to `/gamification/collections`. FRONTEND_REDO §8: `/gamification/collections` should be DELETED or folded into `/teen/profile`. Circular. | **Canonical = `/teen/profile?tab=achievements`**. Build the tab; redirect both `/teen/achievements` and `/gamification/collections` to it. |
| 6 | **`/reservation*` flow** | FRONTEND_REDO §1: `/reservation*` is "duplicate of `/teen/shop/checkout` — REPLACE". But the booking flow is also linked from public marketing (anonymous users). | **Split**: keep `/reservation*` for **public/anonymous** booking flow (must work without auth); auth'd teens deep-link to `/teen/shop/checkout?booking=...`. Document the bifurcation in §14. |
| 7 | **Driver UI surface** | `/api/driver/*` exists (3 routes) but no `/driver/*` pages. Whitepaper does not enumerate driver self-service. | **Decision needed**: build `/driver/dashboard` + `/driver/rides/[id]` minimal PWA OR keep API-only (driver app is external). **Recommended: external partner contractor app** — keep API-only for V1. |
| 8 | **`/mentor` index** | A1 note: layout + loading exist but no `page.tsx` → `/mentor` 404s. | **Build `/mentor` as redirect to `/mentor/dashboard`** (consistency with other roles). |
| 9 | **`/teen/social` fate** | FRONTEND_REDO §2: DELETE / fold into `/teen`. But `/teen/map` redirects to `/teen/social?tab=map`, and the teen home dashboard already deep-links there. | **Keep `/teen/social` until `?tab=map` is migrated to `/teen/map` (rebuild) or to a dashboard widget**, then 410 the route. Avoid deleting before consumers migrate. |
| 10 | **`/communaute` vs `/teen/feed`** | A2 Table 3 #16: "possibly merge into `/teen/feed` or delete". | **Keep `/communaute` as public preview / marketing**, `/teen/feed` as the auth surface. Document the split. |
| 11 | **Tier naming (Free/Silver/Gold/Platinum)** | Whitepaper §27 LOCKED Free/Silver/Gold/Platinum. Code uses Starter/Pro/Elite/Family. Affects `/carte-vip/*`, `/parent/topup`, `/parent`, `/teen/vip-card`. | **Locked already in whitepaper — execute the rename**. No decision needed; flagged for visibility. |
| 12 | **`/admin/clubs*` vs `/admin/partners`** | FRONTEND_REDO §6: clubs CRUD "should be merged into `/admin/partners`". | **Merge `/admin/clubs*` into `/admin/partners?type=venue`** filter. Redirect existing routes. |
| 13 | **`/teen/share` collision** | FRONTEND_REDO §2: page "collides flows" (ambassador-teen track + friend invite); A2 Table 3 #6: "needs split or delete". | **Split: `/teen/share` = friend invite (canonical); ambassador share moves under `/ambassador/marketing`**. Or single page with `?context=friends\|ambassador`. **Recommended: single page with context param** — fewer routes. |
| 14 | **`/teen/games` retention** | FRONTEND_REDO §2: DELETE. But it has live wiring (`gamification-system/features/mini-games`). | **Hard delete (410)** — out of canonical scope. Migrate any salvageable mini-games into `/teen/quests` as quest types. |
| 15 | **PWA `/manifest.json` + `/sw.js`** | Both currently 404. Whitepaper §16 P0. Not strictly a routing decision, but blocks the entire push-notification spine. | **Ship as static `public/` assets immediately** — no decision required, just execution. |
| 16 | **`/anniversaires/organiser` retention** | C4 §1.2: "stripped-down marketing landing"; FRONTEND_REDO §1: REDESIGN. Conflict between "delete" and "keep as marketing". | **Redirect to `/anniversaires`** (canonical wired flow). Marketing copy folded into the main page. |
| 17 | **Bare `/legal/cgu` vs `/conditions` etc.** | A3 broken links: `/cgu`, `/conditions`, `/support` referenced in 4 places. | **Canonical is `/legal/*`** (already locked). Forbidden by §5 rule 6. Just fix the broken links. |

---

## Appendix A — Counts

- **Canonical pages** (this doc): 199 enumerated in A1 minus 17 redirect stubs minus duplicates queued for merge ≈ **165** canonical surfaces post-cleanup.
- **API routes**: 232 (A1 untouched — no canonicalization in scope).
- **Deprecated routes** in §2: **40** (17 existing stubs + 23 newly-flagged for redirect/410).
- **Missing routes** in §4: **35** (covering MISSING + broken-link-target gaps).
- **Forbidden patterns** in §5: **15**.
- **Unresolved founder decisions** in §6: **17**.

## Appendix B — Source files

Read for this canonicalization (all under `C:\Users\Shadow\Desktop\NIVY\docs\vision\`):

- `audit-frontend-reality/A1-routes-inventory.md` — full enumeration of disk state.
- `audit-frontend-reality/A2-vision-gap.md` — MISSING / PARTIAL / ORPHAN tables.
- `audit-frontend-reality/A3-broken-links.md` — 34 broken `<Link>` destinations + 8 SUSPICIOUS redirect bounces.
- `audit-frontend-reality/C4-duplicates.md` — live duplicates + redirect-shim list.
- `FRONTEND_REDO.md` — per-zone verdict matrix (KEEP/REDESIGN/REPLACE/DELETE/BUILD/NEW).
- `PRODUCT_WHITEPAPER.md` v3.6 — canonical spec anchor.
- B1–B7 audits not separately reproduced; their findings are folded into A2 / A3 / C4 verdicts above.
