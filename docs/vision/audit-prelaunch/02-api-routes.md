# 02 — API + routes reliability audit

> Auditor: API + routes reliability auditor
> Date: 2026-05-07
> Scope: every `app/api/**/route.ts`, every `app/**/page.tsx`, `middleware.ts`, `lib/supabase/middleware.ts`, layout-level guards, `vercel.json` cron config.
> Method: read-only Glob + Grep + Read of route files; cross-checked against `docs/vision/PRODUCT_WHITEPAPER.md` (§5/§10/§19/§29 invariants), `docs/vision/FRONTEND_REDO.md`, `docs/vision/IMPLEMENTATION_RECETTE.md`, and the seven Wave-2/Wave-3 lifestyle specs.

## Verdict

**AMBER, leaning RED for security.** Wave 2/3 lifestyle code is real (food, transport, mentorship, marketplace, allowance, chores, creator) and the canonical money pipelines (`top_up_teen`, `spend_teen_coins`, `disburse_allowance`, `place_food_order`, `buy_listing`, `payout_chore_reward`, `feature_submission`) all go through service-role RPCs as whitepaper §29 #15 requires. But there are at least nine routes with broken or missing auth boundaries — one of them (`/api/check-in/entry`) accepts `adminId` from the client body, and another (`/api/notifications` GET/POST/PATCH/DELETE) accepts `userId` from the body and lets any caller manipulate any user's notifications. None of these three would survive a real penetration test, and they are blockers for launch.

## Inventory

- Total `app/api/**/route.ts` files: **191**
- Total `app/**/page.tsx` files: **195**
- Layouts: 7 (`app/layout.tsx`, `app/(dashboard)/layout.tsx`, `app/admin/layout.tsx`, `app/teen/layout.tsx`, `app/parent/layout.tsx`, `app/partner/layout.tsx`, `app/ambassador/layout.tsx`)
- Middleware: `middleware.ts` (single global) + `lib/supabase/middleware.ts` (session refresh helper)

### Routes by role/category

| Bucket | Count | Notes |
|---|---|---|
| `app/api/teen/**` | 64 | core teen surface, includes Wave-3 rides/food/mentors/internships/pathways |
| `app/api/parent/**` | 28 | topup, chores, allowances, savings/match, rides, food/budget, mentor-sessions, e-signature, insights |
| `app/api/admin/**` | 18 | KPIs, scorecard, content, ambassadors, drivers, mentors, internships, marketplace, creator, anniversaires, scripts-sql |
| `app/api/partner/**` | 9 | offers, restaurant menu/orders, apply-discount, verify-card |
| `app/api/marketplace/**` | 7 | listings/buy/dispute/confirm-receipt/orders |
| `app/api/cron/**` | 9 | assign-missions, evolve-teen-profiles, disburse-allowances, marketplace-escrow-release, ride-curfew-check, generate-daily-content, notifications, feed-seed, purge-documents |
| `app/api/payments/**` | 9 | cmi (3), mobile-money, cash, hybrid, process, xp, plus webhooks/stripe |
| `app/api/notifications/**` | 7 | mark-read, mark-all-read, delete, push subscribe/unsubscribe/send |
| `app/api/auth/**` | 2 | register-teen, validate-teen |
| `app/api/driver/**` | 3 | rides/[id]/track, dispatch, complete |
| `app/api/mentor/**` | 1 | apply (mentor self-application) |
| `app/api/ambassador/**` | 4 | withdrawals, shop/points, shop/redeem, shop/rewards |
| `app/api/check-in/**` | 5 | entry, exit, search, verify-pass, export |
| `app/api/clubs/**` | 3 | pause, resume, cancel |
| `app/api/authorizations/**` | 2 | create, revoke |
| Misc | ~20 | bookings/create, csrf, health, presence, agent/action, upload/avatar, e-signature/create, gamification/pillars, tickets/generate-pdf, webhooks/stripe, invoices/[id], invoices/topup/[id], features/flags, partners/register, circles, etc. |

### Pages by zone

| Zone | Pages | Examples |
|---|---|---|
| `/teen/*` | 46 | wallet, savings, rides, food, chores, feed, create, achievements, defis-physiques, profile, settings, etc. |
| `/parent/*` | 23 | budget, topup, approvals, chores, allowances, savings, rides, food, mentor-sessions (only via API), e-signature, documents |
| `/admin/*` | 27 | analytics, content, scorecard, scripts-sql, partners, drivers, drivers/[id], creator-moderation, marketplace, anniversaires, evenements, clubs, utilisateurs, permissions, proofs, logs |
| `/partner/*` | 16 | offers, transactions, stats, scanner, restaurant/menu, restaurant/orders, kyc, payouts, invoices |
| `/ambassador/*` | 7 | dashboard, referrals, withdrawals, boutique, comment-gagner, marketing |
| `/marketplace/*` | 5 | discover, sell, my-listings, orders, [id] |
| Public/marketing | ~70 | clubs, djs, agenda, blog, devenir-partenaire, devenir-influenceur, devenir-ambassadeur, carte-vip, legal, anniversaires, communaute, aide, daily, espace, offline, auth/* |

`docs/vision/FRONTEND_REDO.md` claims ~155 routes mapped; the actual count is ~195, so coverage in that doc is partial — 40 to 50 routes from the canonical zones aren't in the matrix. That's a doc gap, not a code gap.

## Auth + security boundary

The middleware (`middleware.ts`) does the heavy lifting:

- Distributed Redis rate-limit per request (varies by `/api/auth`, `/api/bookings`, `/api/payments`, `/api/upload`).
- CSRF check on every `/api/**` POST/PUT/PATCH/DELETE except `/api/csrf`. Tokens are generated and validated via `lib/security/csrf` — `middleware.ts:128-136`.
- Session cookie refresh via `updateSession` (Supabase SSR).
- CSP nonce + strict security headers (frame-ancestors, X-Frame-Options, Permissions-Policy).
- Fail-closed behaviour in production when Supabase env is missing (`middleware.ts:140-151`).
- `/admin/*` page-level gate via `admin_roles` lookup (`middleware.ts:170-204`).
- `/teen|/parent|/partner|/ambassador/*` page-level role match (`middleware.ts:206-293`) — wrong-role users are bounced to `/auth/redirect`.

**However**, the middleware-level admin/role gate is for **page** routes, not for `/api/admin/**` routes. API routes must self-authorize, and many do not.

### Critical: routes with broken or missing auth

1. **`app/api/check-in/entry/route.ts:7`** and **`app/api/check-in/exit/route.ts:7`** — both accept `adminId` from the client body and use it to lookup `admin_roles`. There is no verification that the *caller's* session matches `adminId`. Any authenticated user (or anyone with a valid CSRF token) who knows or guesses an admin's UUID can submit check-in / check-out events on behalf of that admin. Should call `getUserRole()` / `auth.getUser()` and pull the actor identity from the session. **Verdict: P0.**

2. **`app/api/admin/run-migration/route.ts:28`** — POST with no auth check at all. The route as shipped only "previews" SQL (returns 500 chars and instructions), so the immediate impact is information-disclosure, not destructive. But the route is already pulling SQL files from `gamification-system/database/migrations/` based on a `migrationId` posted by the caller — anonymous callers can extract migration source. **Verdict: P1**, must add admin gate or delete the route.

3. **`app/api/notifications/route.ts`** — GET, POST, PATCH, DELETE all accept `userId` (or `notificationId`) from the request body / query string and operate without verifying it matches `auth.getUser().id`. Any authenticated user (with CSRF token, which the CSRF endpoint hands out freely) can:
   - Read another user's notifications (GET line 8 `searchParams.get("userId")`).
   - Inject arbitrary notifications into another user's inbox (POST line 51).
   - Mark someone else's notifications read (PATCH line 100).
   - Delete an arbitrary notification by ID (DELETE line 156).
   **Verdict: P0** — privacy + spam vector. Compare with the role-aware `app/api/notifications/mark-read/route.ts:9-12` which does it correctly using `auth.getUser()`.

4. **`app/api/notifications/push/send/route.ts:41`** — wrapped in `withSecurity` for rate-limiting but has zero authorization check. Body is `{ userId | userIds[], payload }`. Any authenticated caller can target any user IDs and blast push notifications to their browsers. Should require admin role (or at least require the caller's userId to match the targets). **Verdict: P0** — push abuse / phishing vector.

5. **`app/api/admin/scorecard/route.ts:11`** — no auth gate at all. Returns DAU + xp_ledger aggregate. Sensitive but not catastrophic; attacker learns aggregate platform stats. **Verdict: P1.**

6. **`app/api/cron/purge-documents/route.ts:12`** and **`app/api/cron/generate-daily-content/route.ts:21`** — both use the pattern `if (cronSecret && authHeader !== ...)`. If `CRON_SECRET` env is missing, the check is **silently skipped** and the route becomes anonymous. The route then executes `execute_document_purge` (which deletes data) or generates content with no caller identity. Compare with the correct fail-closed pattern in `app/api/cron/disburse-allowances/route.ts:32-41`, `app/api/cron/marketplace-escrow-release/route.ts:21-26`, `app/api/cron/ride-curfew-check/route.ts:19-23` and the cron handlers added in Wave 1.5/2.x. **Verdict: P1** for both — flip the guard so missing secret → 401, not bypass.

7. **`app/api/cron/notifications/route.ts:6`** and **`app/api/cron/feed-seed/route.ts:6`** — bearer secret check is fail-open if `process.env.CRON_SECRET` is `undefined` because `Bearer ${undefined}` is the literal string `"Bearer undefined"`. If the env var is unset, anyone sending `Authorization: Bearer undefined` is admitted. **Verdict: P1.**

8. **`app/api/features/flags/route.ts:12`** — GET reads platform feature flags with no auth. This is normally fine for client-readable flags but, depending on what the flag contents reveal, may leak rollout state. **Verdict: P2 — review what's exposed.**

9. **`app/api/notifications/route.ts:46`** POST — covered above; treat as P0.

### Service-role + money: positive findings

The whitepaper §29 #15 invariant ("money writes go through service_role + SECURITY DEFINER RPCs") is upheld in the canonical paths:

- `app/api/parent/topup/route.ts:91-105` — calls `top_up_teen` RPC with service-role client, validates parent-teen link, gates on `e_signatures.terms_accepted`.
- `app/api/teen/spend/route.ts:163-170` — `spend_teen_coins` RPC, with branch into `parental_approvals` for validation-mode or above-ceiling spends.
- `app/api/teen/food/order/route.ts:67-77` — `place_food_order` RPC, paired ledger + cashback XP.
- `app/api/marketplace/listings/[id]/buy/route.ts:36-43` — `buy_listing` RPC.
- `app/api/marketplace/transactions/[id]/confirm-receipt/route.ts` and `dispute/route.ts` — RPC-driven escrow.
- `app/api/cron/disburse-allowances/route.ts:73-100` — `disburse_allowance` RPC.
- `app/api/cron/marketplace-escrow-release/route.ts:31` — `marketplace_auto_release_escrow` RPC.
- `app/api/teen/rides/request/route.ts:51-65` — `request_ride` RPC.
- `app/api/teen/rides/[id]/cancel/route.ts:24` — `cancel_ride`.
- `app/api/parent/rides/[id]/approve/route.ts:19-23` — `approve_ride`.
- `app/api/driver/rides/[id]/dispatch/route.ts:21` — `dispatch_ride`.
- `app/api/driver/rides/[id]/complete/route.ts:21` — `complete_ride`.
- `app/api/admin/creator/feature/[submission_id]/route.ts:30-33` — `feature_submission`.
- `app/api/teen/feed/[submission_id]/engage/route.ts:75-80` — `award_creator_xp`.
- `app/api/teen/mentor-sessions/book/route.ts:15-20` — `book_mentor_session` (note: uses `createClient()`, NOT service role; the RPC is SECURITY DEFINER so this is acceptable provided the RPC validates internally).
- `app/api/parent/mentor-sessions/[id]/approve/route.ts:10-13` — `parent_approve_session` (same pattern).
- `app/api/teen/internships/[id]/apply/route.ts:14-19` — `apply_to_internship`.
- `app/api/admin/internships/[id]/decide/route.ts:22-27` — `decide_internship_application`.
- `app/api/admin/mentors/[id]/approve/route.ts:10-13` — `admin_approve_mentor`.
- `app/api/parent/chores/[id]/verify-completion/route.ts` — chains `payout_chore_reward` → `top_up_teen` (per whitepaper §19.4.1, §29.4).

This is a strong, consistent pipeline. Money invariant holds.

### Service role used to write non-money data

Several routes use `createServiceRoleClient()` for non-financial inserts (e.g. `marketplace_listings`, `nivy_drivers`, `ride_groups`, `nutrition_challenges`, `parent_allowances`, `savings_goals`, `feed_posts`, `moderation_queue`, `admin_audit_logs`, `creator_engagement`, `ride_tracks`, `parent_chores` indirectly via verify). In each case the route does its own `auth.getUserRole()` check first and validates parent-teen / role boundaries before inserting. Defensible. The risk is concentrated where the service role bypasses RLS while caller identity isn't verified — see the notification/check-in cases above.

### CSRF coverage

`middleware.ts:128-136` enforces CSRF token validation for **all** state-mutating verbs on `/api/**` except `/api/csrf`. Side effects:

- `/api/webhooks/stripe`, `/api/payments/cmi/webhook`, `/api/payments/cmi/callback` — these are *external* POST callers that won't have a CSRF token. The middleware will reject them with 403. Either webhooks must be excluded from CSRF (currently they aren't visible in the matcher exception list) or they must include the token. **This is a P0 blocker for the payments path** — unless the matcher actually carves out a path I missed, real CMI/Stripe webhooks will be 403'd. Verify behaviour by testing in staging; if confirmed broken, add a webhook bypass.

The matcher in `middleware.ts:299` is `["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"]` — so the middleware (and CSRF enforcement) does run on `/api/webhooks/*`. **Confirmed P0 bug**: webhooks need to be excluded from CSRF (or the CSRF helper must skip when `request.headers.get('stripe-signature')` is present, etc.).

## Whitepaper coverage map

### §5 Token economy

| Whitepaper requirement | Route(s) | Status |
|---|---|---|
| Parent top-up | `app/api/parent/topup/route.ts` | ✅ canonical, RPC-backed |
| Teen spend | `app/api/teen/spend/route.ts` | ✅ canonical, parental approvals branch |
| XP cashback | embedded in `spend_teen_coins` RPC (called from /teen/spend, /teen/food/order, /marketplace/.../buy) | ✅ |
| Wallet view | `app/api/teen/wallet/route.ts` | ✅ |
| Locked rate 1 DH = 100 coins | `top_up_teen` RPC | ✅ |
| Subscription tier | `app/api/teen/subscription/route.ts` | ✅ (uses getUserRole) |

### §10 Parent control

| Requirement | Route | Status |
|---|---|---|
| Approvals queue | `app/api/parent/approvals/route.ts` | ✅ |
| Budget limits | `app/api/parent/budget/route.ts` | ✅ |
| E-signature gate | `app/api/parent/e-signature/create/route.ts`, `…/status/route.ts`, plus check at top-up | ✅ |
| Live tracking | `app/api/parent/live/route.ts` | present |
| Insights | `app/api/parent/insights/route.ts` | ⚠️ contains `// 5. AI-powered insight (placeholder for ML model)` (line 147) — fallback rule-based path is wired but the ML side is acknowledged stub |
| Topup | covered above | ✅ |
| Export PDF | `app/api/parent/export-pdf/route.ts` | present |

### §11 Parental authorizations

`app/api/authorizations/create/route.ts` + `…/revoke/route.ts` — present but not deeply re-audited; both use Supabase server client; verify role gate.

### §12 Ambassador

`app/api/ambassador/withdrawals/route.ts`, `…/shop/points/route.ts`, `…/shop/redeem/route.ts`, `…/shop/rewards/route.ts`, `app/api/admin/ambassadors/approve/route.ts`, `…/reject/route.ts`. Approve route correctly uses `admin_roles` check. Coverage matches whitepaper §12.

### §17 Social graph + §18 admin moderation

- `app/api/teen/feed/route.ts`, `.../comments/route.ts`, `.../submissions/route.ts`, `.../[submission_id]/engage/route.ts` — Wave 2.3 creator economy.
- `app/api/admin/creator/moderate/route.ts` and `…/feature/[submission_id]/route.ts` — admin moderation, both correctly check `admin_roles` row + `feature_submission` RPC.
- Marketplace moderation: `app/api/admin/marketplace/moderate/[listing_id]/route.ts` — checks `admin|super_admin|moderator` role, writes audit log.

### §19.4 Lifestyle batch (Wave 2/3)

| Surface | Routes | Status |
|---|---|---|
| Chores | `app/api/parent/chores/create/route.ts`, `.../route.ts`, `.../[id]/verify-completion/route.ts`, `app/api/teen/chores/route.ts`, `…/[id]/complete/route.ts` | ✅ all real, RPC-backed payout |
| Allowance | `app/api/parent/allowances/route.ts`, `.../[id]/{pause,resume,route}.ts`, `app/api/parent/savings/match/route.ts`, `app/api/cron/disburse-allowances/route.ts` | ✅ |
| Savings | `app/api/teen/savings/goals/route.ts`, `.../[id]/{lock,cancel}/route.ts` | ✅ |
| Creator | `app/api/teen/feed/submissions`, `.../[submission_id]/engage`, `app/api/admin/creator/{moderate,feature/[id]}` | ✅ |
| Marketplace | `app/api/marketplace/{listings,listings/[id],listings/[id]/buy,my-listings,orders,transactions/[id]/{confirm-receipt,dispute}}`, `app/api/admin/marketplace/moderate/[listing_id]` | ✅ + escrow cron + content-info regex on listing creation (defence in depth, `marketplace/listings/route.ts:23-26`) |
| Food | `app/api/teen/food/{order,menu/[partner_id],restaurants}`, `app/api/parent/food/budget`, `app/api/partner/restaurant/{menu/items,menu/items/[id],orders/feed,orders/[id]/{accept,reject}}` | ✅ |
| Transport | `app/api/teen/rides/{request,route,[id]/cancel,groups/create,groups/[id]/join}`, `app/api/parent/rides/{active,[id]/{approve,deny,track}}`, `app/api/driver/rides/[id]/{track,dispatch,complete}`, `app/api/admin/drivers/[id]/approve`, `app/api/cron/ride-curfew-check` | ✅ |
| Mentorship | `app/api/teen/{mentors,mentors/[id],mentor-sessions/{book,[id]/rate},pathways,pathways/[slug]/declare,internships,internships/[id]/apply}`, `app/api/parent/mentor-sessions/{route,[id]/{approve,deny}}`, `app/api/admin/{mentors/[id]/approve,internships/[id]/decide}`, `app/api/mentor/apply` | ✅ |

### Cron coverage vs `vercel.json`

`vercel.json` declares 5 crons:
- `assign-missions` (00:05 daily) → `app/api/cron/assign-missions/route.ts` ✅
- `evolve-teen-profiles` (02:00 daily) → ✅
- `disburse-allowances` (09:00 daily) → ✅
- `marketplace-escrow-release` (06:00 daily) → ✅
- `ride-curfew-check` (22:00 daily) → ✅

There are 4 additional cron-style routes NOT registered in `vercel.json`:
- `purge-documents`, `generate-daily-content`, `notifications`, `feed-seed`.

These either rely on external schedulers or are dormant. They should either be (a) added to `vercel.json` or (b) marked private and removed. As-is they are reachable HTTP endpoints with the auth gaps documented above.

## Wave 3 reality check

**The `git status` shows untracked dirs for transport, mentorship and food routes. They are NOT empty scaffolds — they are real, RPC-backed implementations.** Specifically:

### Food (Wave 3.2) — DONE

Route files real + page surfaces present:
- API: `teen/food/{order,menu/[partner_id],restaurants}`, `parent/food/budget`, `partner/restaurant/{menu/items[/id],orders/feed,orders/[id]/{accept,reject}}` (8 endpoints).
- Pages: `app/teen/food/page.tsx`, `…/[partner_id]/page.tsx`, `…/order/[id]/page.tsx`, `app/parent/food/page.tsx`, `app/partner/restaurant/menu/page.tsx`, `…/orders/page.tsx`.
- Money path: `place_food_order` RPC, paired `partner_accept_food_order` RPC (`app/api/partner/restaurant/orders/[id]/accept/route.ts:43`).
- Migration `058_food_delivery.sql` + `058_food_delivery_rpcs.sql` (gamification-system/database/migrations/).
- Verification script `scripts/verify-food.ts` exists.

**Gap**: `app/api/teen/food/restaurants/route.ts` is currently public (no auth) — discoverable, probably intentional for browsing, but every other read is authenticated.

### Transport (Wave 3.1) — DONE despite "never built" assumption in instructions

Concrete evidence the routes ARE built:
- `app/api/teen/rides/request/route.ts:51-65` — calls `request_ride` RPC.
- `app/api/teen/rides/route.ts` — list rides (uses service role + caller filter).
- `app/api/teen/rides/[id]/cancel/route.ts` — `cancel_ride` RPC.
- `app/api/teen/rides/groups/{create,[id]/join}/route.ts` — group ride leader/joiner.
- `app/api/parent/rides/{active,[id]/{approve,deny,track}}/route.ts` — full parent control surface, `approve_ride` RPC.
- `app/api/driver/rides/[id]/{track,dispatch,complete}/route.ts` — driver dispatch + live tracking + fare settlement (`dispatch_ride`, `complete_ride` RPCs).
- `app/api/admin/drivers/[id]/approve/route.ts` — KYC.
- Pages: `app/teen/rides/page.tsx`, `.../request/page.tsx`, `app/parent/rides/page.tsx`, `…/[id]/page.tsx`, `app/admin/drivers/page.tsx`, `…/[id]/page.tsx`.
- Cron: `app/api/cron/ride-curfew-check/route.ts` (whitepaper §27 #34 curfew).
- Migration: not in git tree shown, but RPCs are referenced.
- Verification script `scripts/verify-transport.ts` exists.

The dispatch summary that called transport "not dispatched" is **stale**. Transport ships.

### Mentorship-career (Wave 3.3) — DONE

- `app/api/teen/mentors/{route,[id]/route}` — discovery filtered by status='active' + kyc='approved'.
- `app/api/teen/mentor-sessions/{book,[id]/rate}/route.ts` — `book_mentor_session`, `rate_mentor_session` RPCs.
- `app/api/parent/mentor-sessions/{route,[id]/{approve,deny}}/route.ts` — parent approval gate (`parent_approve_session` RPC).
- `app/api/teen/internships/{route,[id]/apply}/route.ts` — `apply_to_internship` RPC.
- `app/api/admin/internships/[id]/decide/route.ts` — `decide_internship_application`.
- `app/api/teen/pathways/{route,[slug]/declare}/route.ts` — career pathways with progress tracking.
- `app/api/admin/mentors/[id]/approve/route.ts` — `admin_approve_mentor`.
- `app/api/mentor/apply/route.ts` — mentor self-application.
- Migration: `gamification-system/database/migrations/059_mentorship_career.sql`.
- Verification script `scripts/verify-mentorship.ts` exists.
- Page coverage: appears partial — the API exists but I do not see `app/teen/mentors/`, `app/parent/mentor-sessions/`, `app/admin/mentors/` page directories. **Gap**: API is shipped, UI pages are missing for several mentor flows. The teen / parent / admin mentor experiences cannot be exercised via UI.

**Conclusion on Wave-3:** all three lifestyle surfaces (food, transport, mentorship) have real backend implementations. The food and transport UIs are present. The mentorship UI is the missing piece — internships discovery, pathway declaration, and mentor browse pages need to be built or surfaced before launch, otherwise users have no way to invoke the existing endpoints.

## UI page coverage vs `FRONTEND_REDO.md`

`FRONTEND_REDO.md §coverage summary` claims ~155 routes mapped, with 75+ tied to whitepaper sections, 11 NEW routes required. Reality:

- 195 page.tsx files exist, so ~40 pages exist that aren't in the redo doc — primarily the new Wave-2/3 pages (`/teen/wallet/allowance`, `/teen/savings`, `/teen/savings/new`, `/teen/rides`, `/teen/rides/request`, `/teen/food`, `/teen/food/[partner_id]`, `/teen/food/order/[id]`, `/parent/topup`, `/parent/chores/*`, `/parent/allowances/*`, `/parent/savings`, `/parent/rides[/[id]]`, `/parent/food`, `/admin/drivers[/[id]]`, `/admin/marketplace`, `/admin/creator-moderation`, `/marketplace`, `/marketplace/sell`, `/marketplace/listings/[id]`, `/marketplace/my-listings`, `/marketplace/orders`, `/partner/restaurant/{menu,orders}`).

- The 11 NEW routes flagged: `/teen/avatar`, `/teen/crews`, `/teen/birthday`, `/partner/awards`, `/partner/staff`, `/partner/anniversaires`, `/admin/moderation`, `/admin/refunds`, `/admin/broadcasts`, `/admin/audit-log`, `/parent/ambassador` — none of these exist as page files in this snapshot. Whether each is a launch blocker depends on the priority. `/admin/audit-log`, `/admin/refunds`, `/admin/moderation` are operationally critical for live ops; the others are P1/P2 polish.

### Mock / placeholder / hardcoded-data sentinels

- `app/api/teen/crew/route.ts:106-126` — `crewRank = 3` is a placeholder, and `activeBattles` array is hardcoded with two fake records ("NIGHT OWLS", "PHOENIX SQUAD"). This route is wired into `app/teen/circles/page.tsx` and similar UI; the UI will display fake data until this is replaced by a real ranking + battles query. **P0 if surfaced in production UI; P1 otherwise.**
- `app/api/teen/crew/route.ts:141` — `battlesWon: 8` hardcoded.
- `app/api/admin/run-migration/route.ts:67-79` — admittedly a stub: returns `success: false` plus instructions, not a real execution. Should be deleted; replaced by `app/api/admin/execute-sql/route.ts` which does proper auth + allow-list.
- `app/api/parent/insights/route.ts:147` — comment "AI-powered insight (placeholder for ML model)". The fallback rule-based logic is honest, but document the boundary clearly so callers don't expect ML.
- `app/api/auth/register-teen/route.ts:178-183` — `hashPassword` uses unsalted SHA-256. **P0**: this is not acceptable for password storage. Replace with bcrypt/argon2 (already standard in Supabase Auth — the route should not be hashing passwords client-side at all and instead use the Supabase admin createUser flow). The function is referenced at line 81 (`teen_password_hash: teenPassword ? await hashPassword(teenPassword) : null`), so live registrations are storing weak hashes.
- `app/api/auth/register-teen/route.ts:136-151` — SMS not integrated; route honestly returns `sms_sent: false, sms_available: false`. Acceptable but flagged as TODO.

48 page.tsx files match the keywords `mock|placeholder|sample|fake|dummy` — most are likely benign (form placeholders, ARIA labels) but a few warrant a deeper read in a follow-up audit (e.g. `app/teen/social/social-hub-client.tsx`, `app/teen/wallet/wallet-hub-client.tsx`, `app/marketplace/page.tsx`, `app/teen/circles/circles-client.tsx`, `app/teen/friends/page.tsx`). Layout-level guards are correctly in place (every dashboard layout calls `getUserRole()` and redirects unauthorised users).

## Cron route audit

| Route | Auth pattern | Idempotent? | Issue |
|---|---|---|---|
| `assign-missions` | `x-vercel-cron` OR `Bearer ${CRON_SECRET}`, fail-closed | yes (RPC `assign_missions_for_teen` is idempotent) | none |
| `evolve-teen-profiles` | same | yes | none |
| `disburse-allowances` | same | yes (advances `next_disbursement_at`) | none |
| `marketplace-escrow-release` | same | yes (RPC ignores already-released rows) | none |
| `ride-curfew-check` | same | yes (filters on status in [requested, approved]) | none |
| `purge-documents` (GET) | **fail-open if `CRON_SECRET` unset** | yes | **P1 fix** |
| `generate-daily-content` | **fail-open if `CRON_SECRET` unset** | yes (checks `daily_content_schedule.status === 'completed'`) | **P1 fix** |
| `notifications` | `Bearer ${process.env.CRON_SECRET}` direct compare; fail-open if env unset (`Bearer undefined`) | side-effects via `checkStreakDanger` / `checkDailyRewards` | **P1 fix** |
| `feed-seed` | same (`Bearer undefined` bypass) | seeds posts | **P1 fix** |

The four older crons all share the same buggy auth pattern; they predate the standardized header check used in Wave-2/3. Single fix: replace with `if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) return 401`.

## Hardcoded / scaffolded / rushed (route layer)

| File | Line(s) | Issue |
|---|---|---|
| `app/api/teen/crew/route.ts` | 106, 109-126, 141 | Hardcoded `crewRank=3`, fake `activeBattles` array, hardcoded `battlesWon=8` |
| `app/api/admin/run-migration/route.ts` | entire file | Stub: returns SQL preview + instructions, no auth; supersede with `execute-sql` |
| `app/api/auth/register-teen/route.ts` | 81, 178-183 | SHA-256 password hash, no salt; should not be storing teen passwords this way |
| `app/api/cron/purge-documents/route.ts` | 12 | Fail-open auth |
| `app/api/cron/generate-daily-content/route.ts` | 21 | Fail-open auth |
| `app/api/cron/notifications/route.ts` | 6 | Fail-open auth (`Bearer undefined`) |
| `app/api/cron/feed-seed/route.ts` | 6 | Fail-open auth (same) |
| `app/api/check-in/entry/route.ts` | 7-19 | Trusts client-supplied `adminId` |
| `app/api/check-in/exit/route.ts` | 7-15 | Same vulnerability |
| `app/api/notifications/route.ts` | 8, 51, 100, 156 | All four verbs trust client `userId` / `notificationId` without binding to caller |
| `app/api/notifications/push/send/route.ts` | 41-67 | No auth/role gate; targets any `userIds` |
| `app/api/admin/scorecard/route.ts` | 11 | No auth gate |
| `app/api/parent/insights/route.ts` | 147 | "Placeholder for ML model" comment; fallback path works but mark clearly |

No routes returning `{ ok: true }` with no logic. No `throw new Error("Not implemented")`. No fallback secrets via `process.env.X || "default"`. The hardcoded data is contained to the `teen/crew` and `admin/run-migration` outliers.

## Risks

### P0 (launch blockers)

1. **`/api/notifications` body-parameter `userId` IDOR** — any authenticated user can read, inject, mutate, and delete notifications for any other user. Privacy + spam vector. (`app/api/notifications/route.ts` GET/POST/PATCH/DELETE.)
2. **`/api/notifications/push/send` no authorization** — any authenticated user can blast push notifications to any user IDs. Phishing + abuse. (`app/api/notifications/push/send/route.ts:41-67`.)
3. **`/api/check-in/entry` and `/api/check-in/exit` accept client `adminId`** — admin impersonation for ticket scans. Could be exploited to mark events checked-in fraudulently or to escape the audit trail. (`app/api/check-in/entry/route.ts:7`, `…/exit/route.ts:7`.)
4. **CSRF middleware applies to `/api/webhooks/*` and `/api/payments/cmi/{webhook,callback}`** — payment webhooks from Stripe / CMI cannot include the CSRF cookie/token, will be rejected with 403, and successful payments will not be reconciled. (`middleware.ts:128-136`, `:299` matcher.) Verify in staging then add an exception list.
5. **`/api/auth/register-teen` SHA-256 unsalted password storage** — never acceptable. (`app/api/auth/register-teen/route.ts:81, 178-183`.) Use Supabase Auth admin createUser instead.

### P1

6. Cron auth fail-open on `/api/cron/{purge-documents,generate-daily-content,notifications,feed-seed}` when `CRON_SECRET` env is missing or compared against `undefined`. Fix the guard. (P1 because Vercel deploys with the secret set; but provisioning slip-ups are how production incidents start.)
7. `/api/admin/run-migration` no auth gate. Either delete or admin-gate.
8. `/api/admin/scorecard` no auth gate.
9. `/api/teen/crew` placeholder battle data leaks into circles/crew UI.
10. Mentorship UI pages not present for `/teen/mentors`, `/parent/mentor-sessions`, `/admin/mentors`, `/teen/internships*`, `/teen/pathways*` even though API routes are complete.
11. Admin operational pages missing: `/admin/audit-log`, `/admin/refunds`, `/admin/moderation` (per FRONTEND_REDO §NEW). Without an audit log UI, ops teams have to query the DB to investigate the audit rows that the moderation/escrow/cron handlers are dutifully writing.

### P2

12. `/api/features/flags` is unauthenticated; review what flag values are exposed.
13. `/api/teen/food/restaurants` is unauthenticated; intentional but flag for ratelimit review.
14. `parent/insights` ML placeholder — non-blocking but clarify in UI.
15. ~40 page files not enumerated in `FRONTEND_REDO.md`; doc drift, not code drift.

## Recommended actions before launch

1. **Patch the five P0 security issues** — see above. The notifications + push-send + check-in IDOR fixes are <50 LOC each (replace body-supplied `userId/adminId` with `auth.getUser()` lookups). The CSRF carve-out is a single matcher tweak. The password hashing fix routes through Supabase Auth and removes the local `hashPassword` function entirely.

2. **Standardize cron auth** — replace the four legacy cron-secret checks with the fail-closed pattern from `disburse-allowances` (`isVercelCron || hasValidBearer`, otherwise 401). Audit `vercel.json` to ensure all cron routes are registered (or remove orphan handlers).

3. **Replace hardcoded crew battle data** — either build the ranking system (mid-effort, requires `crew_battles` table + queries) or remove the surface from the UI until it's implemented. Currently the UI lies.

4. **Build the missing mentorship UIs** — without `/teen/mentors`, `/teen/internships`, `/teen/pathways`, `/parent/mentor-sessions`, `/admin/mentors` pages, the §19.4.7 lifestyle pillar cannot be exercised by users despite the backend being complete. ~5 pages, mostly server components like `/teen/rides/page.tsx`.

5. **Build the missing admin operational UIs** — at minimum `/admin/audit-log` (read-only table of `admin_audit_logs`) is needed for incident response since the moderation, marketplace, allowance, and ride-curfew handlers all write audit rows that nobody can currently see. `/admin/refunds` is needed for the refund flow. `/admin/moderation` consolidates the existing creator-moderation + marketplace-moderation pages.

6. **Document `service_role` usage policy** — the codebase consistently uses `createServiceRoleClient()` after a `getUserRole()` check, which is correct. But the pattern isn't enforced by lint or convention; one slip and a service-role route becomes a privilege-escalation. Add a CODEOWNERS gate or eslint rule that flags `createServiceRoleClient` imports in routes that don't also import `getUserRole`/`auth.getUser`.

7. **Smoke-test webhooks in staging** — Stripe and CMI webhook endpoints must be reachable post-CSRF-fix. Coverage: `verify-webhook-signature` already validates Stripe signatures; CMI has its own `cmiGateway.parseCallback`. Once CSRF is bypassed for these paths the rest works.

8. **Update `FRONTEND_REDO.md`** to reflect the ~40 Wave-2/3 pages that landed since the last revision. Without this update reviewers underestimate launch readiness.

9. **Add server-side validation for body shapes** — currently most routes hand-roll validation (`if (!body.x) return 400`). Consider migrating critical money paths to zod for defence-in-depth. The marketplace `create_listing` path already has regex defence (`marketplace/listings/route.ts:23-26`), which is the right pattern.

10. **Don't let `/admin/scripts-sql` and `/api/admin/execute-sql` ship to production with `ENABLE_ADMIN_SQL_EXECUTION=true`.** The route is correctly gated and has an allow-list (`app/api/admin/execute-sql/route.ts:11-48`), but accidental flag flips are how prod gets corrupted. Either delete in production builds or require dual sign-off. The `/admin/scripts-sql` page should be removed from `AdminSidebar` for non-super-admin operators.

---

**Bottom line.** The lifestyle backend is real and the money invariants hold. The blockers are concentrated in five mis-authenticated routes and a CSRF middleware that doesn't carve out webhooks. None of those is a multi-week fix. Patch them, build the missing mentorship + admin-ops pages, and Nivy is route-layer-ready for launch. Ship the report; let triage drive the patches.
