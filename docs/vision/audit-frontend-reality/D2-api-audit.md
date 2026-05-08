# D2 — API Endpoints Inventory + Frontend Pairing

Read-only audit, agent D2.
Date: 2026-05-08.
Scope: every `app/api/**/route.ts` vs every `fetch("/api/...")` (literal + template) in `app/**`, `components/**`, `lib/**`, `hooks/**`.

---

## Headline numbers

| Metric                                        | Count |
|-----------------------------------------------|------:|
| Total API route files (`app/api/**/route.ts`) | **251** |
| Wired (≥1 client `fetch()` caller)            | **146** |
| Orphan (no client `fetch()` caller)           | **105** |
| Phantom-call (FE calls a route that does not exist) | **4** |

Method note. Path matching is done after normalising both sides:
- BE: `[id]`, `[slug]`, `[submission_id]` → `[param]`.
- FE: `${var}`, `${encodeURIComponent(...)}` → `[param]`.
Query strings stripped. Trailing slashes trimmed. The 4 phantoms below were re-confirmed by direct filesystem check.

A large chunk of the "orphan" set is **not actually dead** — it is consumed by Server Components that talk to Supabase directly and never issue a `fetch()` to themselves, by cron schedulers (Vercel cron + `CRON_SECRET`), or by external PSP/webhook callers. We split the orphan list accordingly.

---

## 1. Phantom-call list (CRITICAL — these 404 in production)

Frontend code that hits a URL with no matching `route.ts`. These are real bugs.

| Frontend caller | Phantom URL | Status |
|---|---|---|
| `components/share/share-modal.tsx` (~line 215, OG card preview) | `/api/og/share-card` | **No route file.** Share modal generates an OG image URL that 404s. |
| `components/payment-method-selector.tsx:125` | `/api/payments/cash/register` | **No route file.** Closest is `/api/payments/cash/create` — likely a rename that never propagated to the FE. |
| `components/payment-method-selector.tsx:93` | `/api/payments/stripe/create-session` | **No route file.** Stripe path is referenced in the selector but no route exists; the only Stripe surface is `/api/webhooks/stripe`. Hybrid/CMI/mobile-money paths exist instead. |
| `components/ticket-actions.tsx:31` | `/api/tickets/generate-wallet-pass` | **No route file.** The companion `/api/tickets/generate-pdf` does exist; wallet-pass equivalent never shipped. |

All four are POST/GET button handlers in client components — when a user clicks them in production, the request returns 404 and the catch block runs (silent failure for users on share/wallet-pass; visible failure for cash/stripe payment).

These should either:
- be implemented (4 new `route.ts` files), or
- removed/disabled in the UI until a real route exists, or
- redirected client-side to the correct endpoint (e.g. `cash/register` → `cash/create`).

---

## 2. Orphan list (105 — but most are NOT dead code)

Bucket the orphans by reason:

### 2a. Cron-only routes (15) — expected, called by Vercel cron with `CRON_SECRET`
```
cron/assign-missions
cron/birthday-greetings
cron/disburse-allowances
cron/evolve-teen-profiles
cron/feed-seed
cron/friend-challenge-resolve
cron/generate-daily-content
cron/marketplace-escrow-release
cron/mentor-recording-retention
cron/notification-fan-out
cron/notifications
cron/parent-chore-rollover
cron/partner-payout-monthly
cron/purge-documents
cron/quiz-seen-history-prune
cron/recommendation-metrics-rollup
cron/ride-curfew-check
cron/tag-normalize
cron/weekly-leaderboard-rollup
```
These are CSRF-exempt (per `middleware.ts:139`) and authenticate via bearer. **Not dead.**

### 2b. PSP webhooks (4) — called by external payment providers
```
webhooks/stripe
webhooks/cashplus
webhooks/m2t
webhooks/wafacash
```
Plus internal payment intermediates: `payments/cmi/webhook`, `payments/cmi/create`, `payments/cash/create`, `payments/process`, `payments/hybrid` (the last three are SDK-style endpoints invoked from server actions or other routes, not client). **Not dead.**

### 2c. Server-component consumers (~40) — page does its own Supabase queries, no client fetch
These routes exist for parity / future use, but the corresponding page component bypasses them and queries Supabase directly via `createClient()` server-side.

Examples grepped against `app/**/page.tsx`:
- `parent/chores`, `parent/grades`, `parent/live`, `parent/rides/active`, `parent/mentor-sessions`, `parent/food/budget`, `parent/export-pdf`, `parent/e-signature/status`
- `teen/internships`, `teen/internships/[param]/apply`, `teen/mentors`, `teen/mentors/[param]`, `teen/pathways` (the page reads from Supabase; `[slug]/declare` IS wired)
- `teen/quiz/categories`, `teen/quiz/daily`, `teen/quiz/history` (consumed via SSR fetch on the server; safe)
- `teen/rides`, `teen/rides/groups/create`, `teen/rides/groups/[id]/join`, `teen/rides/[id]/cancel`
- `teen/food/restaurants`, `teen/food/menu/[param]`
- `teen/messages/[conversationId]` (the GET-by-id form; the list form `teen/messages` IS wired)
- `marketplace/my-listings`, `marketplace/orders`, `marketplace/listings/[id]` (read), `marketplace/transactions/[id]/{confirm-receipt,dispute}`

These are **not dead** but they are **inconsistent** — the codebase mixes "page fetches API" and "page queries Supabase directly". Worth flagging for a future architecture cleanup, not for deletion.

### 2d. Routes with no UI consumer at all (~30) — strongest dead-code candidates
These have no `fetch()` caller AND no obvious page-level server consumer was found in the same area:

- **Admin surfaces never wired** (likely UI never built):
  - `admin/accounting/export`, `admin/analytics/export`, `admin/broadcasts`
  - `admin/content/generate`, `admin/content/validate`
  - `admin/internships/[id]/decide`
  - `admin/mentor-reports`, `admin/mentor-reports/[id]/resolve`
  - `admin/moderation` (the listing GET — `/approve` and `/reject` actions ARE wired)
  - `admin/refunds`
  - `admin/signals/cap-stats`
  - `admin/topups` (listing — `/[id]/confirm` IS wired)
- **Ambassador shop** (whole subsystem appears never wired in UI):
  - `ambassador/shop/points`, `ambassador/shop/redeem`, `ambassador/shop/rewards`
- **Circles top-level** (only `teen/circles` is used; these admin/global circles routes are unused):
  - `circles`, `circles/report`
- **Clubs lifecycle** (no page calls these):
  - `clubs/cancel`, `clubs/pause`, `clubs/resume`
- **Driver workflow** (driver UI not built, but `/admin/drivers/[id]/approve` IS wired):
  - `driver/rides/[id]/complete`, `driver/rides/[id]/dispatch`, `driver/rides/[id]/track`
- **Teen unused content/discovery**:
  - `teen/content/intelligent`, `teen/content/international`, `teen/content/personalized`
  - `teen/friend-challenges` (list — accept/progress ARE wired; `decline`, `resolve` are not)
  - `teen/mentor-sessions/[id]/rate`, `teen/mentor-sessions/[id]/report`
  - `teen/shop`, `teen/spend`
  - `teen/signals/record` (signals are still emitted server-side via `lib/analytics/signals.ts`, but this client-facing endpoint has no caller)
- **Parent rides tracking** (built but unused):
  - `parent/rides/[id]/track`
- **Mentor self-service** (mentor section is in transition):
  - `mentor/apply`, `mentor/sessions` (the GET list — but `mentor/sessions/[id]/complete` IS wired and `mentor/profile` IS wired)
- **Creator / one-offs**:
  - `creator/leaderboard`
  - `notifications/push/send` (admin-style fan-out — only the cron `notification-fan-out` is wired)
- **GDPR self-serve** (likely intentionally kept for compliance even without UI):
  - `me/data-export`, `me/data-delete`
- **Internal/dev tooling** (intentionally not in UI):
  - `dev/ai-smoke`, `health`, `admin/audit-log`, `admin/execute-sql`, `admin/run-migration` (the last is wired from `/admin/gamification-setup/page.tsx`), `admin/users/[id]/anonymize`, `admin/users/[id]/export`

### 2e. Recently added (new uncommitted work — git status shows them as untracked)
`admin/drivers/`, `admin/internships/`, `admin/mentors/`, `admin/mentor-reports/`, `driver/`, `mentor/`, `parent/food/`, `parent/mentor-sessions/`, `parent/rides/`, `partner/restaurant/`, `teen/food/`, `teen/internships/`, `teen/mentor-sessions/`, `teen/mentors/`, `teen/pathways/`, `teen/rides/` are part of the "Wave 3 lifestyle batch" — many are wired, but the orphan portion of these is in-flight work where the UI hasn't shipped yet.

The full machine-readable orphan list is at the end of this document.

---

## 3. Wired list (146)

The wired list is the count and the diff is mechanically: `routes ∩ frontend-paths`. See `wired_routes_appendix` at the bottom.

---

## 4. Sample of 10 high-traffic APIs — auth / CSRF / rate-limit posture

Global posture (from `middleware.ts`):
- **CSRF**: enforced on all `/api/*` for non-GET/HEAD/OPTIONS, except `/api/csrf`, `/api/webhooks/*`, `/api/payments/cmi/webhook`, `/api/cron/*`. Token issued by `/api/csrf` as httpOnly+sameSite=strict cookie + body-returned token.
- **Rate-limit**: applied to all `/api/*` via `rateLimitDistributed()` (Redis with in-memory fallback). Tiers: `auth`, `booking`, `payment`, `upload`, `api` (default). Dev bypass: `1000/min`.
- **Returns JSON**: every sampled handler uses `NextResponse.json(...)`.

| # | Route | HTTP methods | Auth | CSRF (via mw) | Rate-limit tier | JSON | Notes |
|---|---|---|---|---|---|---|---|
| 1 | `/api/csrf` | GET | none | exempt | api | yes | Token issuer; httpOnly cookie + JSON `{token}`. |
| 2 | `/api/teen/wallet` | GET | `getUserRole()` requires `role==='teen'` | exempt (GET) | api | yes | 401 if not teen; reads `user_coins`/`user_xp`/`user_streaks`. |
| 3 | `/api/teen/feed` | GET, POST, … | `supabase.auth.getUser()` (anonymous → 401) | enforced on POST | api | yes | Switch on `?type=` for feed/post/etc.; calls `get_personalized_feed` RPC. |
| 4 | `/api/teen/profile` | PATCH | `getUserRole()` + verifies `profileId === userInfo.profileId` | enforced | api | yes | Username uniqueness check; rejects mismatched IDs. |
| 5 | `/api/teen/friends` | GET, POST, … | `getUserRole()` requires `role==='teen'` | enforced on POST | api | yes | Re-derives presence + xp via direct Supabase call after handler. |
| 6 | `/api/teen/tokens` | GET, POST | `supabase.auth.getUser()` | enforced on POST | api | yes | Switch on `?type=wallet/balances/rewards/...`. |
| 7 | `/api/parent/teens` | POST | `getUserRole()` requires `role==='parent'` AND `parentId === userInfo.profileId` | enforced | api | yes | Body-supplied parentId double-checked against session. |
| 8 | `/api/notifications` | GET, POST | `supabase.auth.getUser()` only (no client-supplied userId — explicitly noted in code as a Wave-A fix for IDOR) | enforced on POST | api | yes | Comment in source warns: "never trust client-supplied userId". |
| 9 | `/api/teen/quests/start` | POST | `getUserRole()` requires `role==='teen'` AND `teenId === userInfo.teenData?.id` | enforced | api | yes | Body teenId verified against session. |
| 10 | `/api/parent/topup` | POST | `getUserRole()` requires `role==='parent'` | enforced | **payment** | yes | RPC `top_up_teen` (atomic). Service-role for money writes (per §29 invariant 15). |

Posture summary:
- **Auth**: All 10 enforce auth. Two flavours: `supabase.auth.getUser()` (raw) and `getUserRole()` (which adds role + teen/parent linkage). The codebase has consistently moved away from trusting client-supplied IDs (notifications, parent/teens, quests/start all double-check).
- **CSRF**: Centralised. No per-route CSRF code needed for the typical handler — the middleware handles it for every `/api/*` non-safe method outside the documented exempt list.
- **Rate-limit**: Centralised, with tier selection by URL prefix. Payments correctly fall into the stricter `payment` tier; auth into `auth`; uploads into `upload`. Everything else is the default `api` tier.
- **No per-route bespoke rate-limit code** in the sampled set. Search confirmed individual routes do import `rateLimit` only when they need a sub-tier (e.g. `agent/action`, `partners/register`, `signals/record`).

---

## 5. Risks & recommendations

1. **Fix the 4 phantoms.** They are silent client-side 404s in shipping flows (share modal, ticket wallet pass, two payment selectors). Either implement, redirect, or hide.
2. **Architectural inconsistency**: Server Components that talk to Supabase directly while a corresponding `/api/*` route exists for the same data. Either pick one (preferred: keep the API route and have the page fetch it for cache/consistency), or delete the unused route.
3. **Dead admin/ambassador subsystems** (~30 routes in §2d) — schedule a cleanup pass once UI direction is settled. Particularly: `ambassador/shop/*` (3 routes), `circles` + `circles/report`, `clubs/{cancel,pause,resume}`, `creator/leaderboard`, `teen/content/{intelligent,international,personalized}`. These are infrastructure-paid attack surface for no current UX value.
4. **Driver workflow** (`driver/rides/[id]/{complete,dispatch,track}`): the API exists and the admin approval flow is wired, but the driver-facing UI never ships. Either remove or build.
5. **Cron auth**: Cron routes are CSRF-exempt and rely on `CRON_SECRET` bearer. Verify each `app/api/cron/**/route.ts` actually checks the bearer (not in scope for this audit, but the exemption assumes they do).

---

## Appendix A — full machine-readable orphan list (105)

```
admin/accounting/export
admin/analytics/export
admin/audit-log
admin/broadcasts
admin/content/generate
admin/content/validate
admin/execute-sql
admin/internships/[param]/decide
admin/mentor-reports
admin/mentor-reports/[param]/resolve
admin/moderation
admin/refunds
admin/signals/cap-stats
admin/topups
admin/users/[param]/anonymize
admin/users/[param]/export
ambassador/shop/points
ambassador/shop/redeem
ambassador/shop/rewards
circles
circles/report
clubs/cancel
clubs/pause
clubs/resume
creator/leaderboard
cron/assign-missions
cron/birthday-greetings
cron/disburse-allowances
cron/evolve-teen-profiles
cron/feed-seed
cron/friend-challenge-resolve
cron/generate-daily-content
cron/marketplace-escrow-release
cron/mentor-recording-retention
cron/notification-fan-out
cron/notifications
cron/parent-chore-rollover
cron/partner-payout-monthly
cron/purge-documents
cron/quiz-seen-history-prune
cron/recommendation-metrics-rollup
cron/ride-curfew-check
cron/tag-normalize
cron/weekly-leaderboard-rollup
dev/ai-smoke
driver/rides/[param]/complete
driver/rides/[param]/dispatch
driver/rides/[param]/track
health
marketplace/listings/[param]
marketplace/my-listings
marketplace/orders
marketplace/transactions/[param]/confirm-receipt
marketplace/transactions/[param]/dispute
me/data-delete
me/data-export
mentor/apply
mentor/sessions
notifications/push/send
parent/chores
parent/e-signature/status
parent/export-pdf
parent/food/budget
parent/grades
parent/live
parent/mentor-sessions
parent/mentor-sessions/[param]/report
parent/rides/[param]/track
parent/rides/active
payments/cash/create
payments/cmi/create
payments/cmi/webhook
payments/process
teen/chores
teen/circles/members
teen/content/intelligent
teen/content/international
teen/content/personalized
teen/food/menu/[param]
teen/food/restaurants
teen/friend-challenges
teen/friend-challenges/[param]/decline
teen/friend-challenges/[param]/resolve
teen/internships
teen/internships/[param]/apply
teen/mentor-sessions/[param]/rate
teen/mentor-sessions/[param]/report
teen/mentors
teen/mentors/[param]
teen/messages/[param]
teen/pathways
teen/quiz/categories
teen/quiz/daily
teen/quiz/history
teen/rides
teen/rides/[param]/cancel
teen/rides/groups/[param]/join
teen/rides/groups/create
teen/shop
teen/signals/record
teen/spend
teen/sport/challenges (note: only POST callers found; GET likely SSR)
webhooks/cashplus
webhooks/m2t
webhooks/stripe
webhooks/wafacash
```

## Appendix B — full machine-readable phantom list (4)

```
og/share-card                         # components/share/share-modal.tsx
payments/cash/register                # components/payment-method-selector.tsx:125
payments/stripe/create-session        # components/payment-method-selector.tsx:93
tickets/generate-wallet-pass          # components/ticket-actions.tsx:31
```

## Appendix C — wired list (146)

```
admin/ambassadors/approve
admin/ambassadors/reject
admin/anniversaires/[param]
admin/content/review/[param]
admin/creator/feature/[param]
admin/creator/moderate
admin/drivers/[param]/approve
admin/internships
admin/internships/[param]/close
admin/kpis
admin/marketplace/moderate/[param]
admin/mentors/[param]/approve
admin/mentors/[param]/reject
admin/moderation/[param]/approve
admin/moderation/[param]/reject
admin/partners/[param]/approve
admin/partners/[param]/reject
admin/permissions
admin/run-migration
admin/scorecard
admin/tag-aliases
admin/topups/[param]/confirm
agent/action
ambassador/withdrawals
auth/register-teen
auth/validate-teen
authorizations/create
authorizations/revoke
bookings/create
check-in/entry
check-in/exit
check-in/export
check-in/search
check-in/stats
check-in/verify-pass
csrf
e-signature/create
features/flags
gamification/pillars
invoices/[param]
invoices/topup/[param]
marketplace/listings
marketplace/listings/[param]/buy
mentor/profile
mentor/sessions/[param]/complete
newsletter/subscribe
notifications
notifications/delete
notifications/mark-all-read
notifications/mark-read
notifications/push/subscribe
notifications/push/unsubscribe
notifications/subscribe
onboarding/interests
onboarding/profile
parent/allowances
parent/allowances/[param]
parent/allowances/[param]/pause
parent/allowances/[param]/resume
parent/approvals
parent/budget
parent/chores/[param]/verify-completion
parent/chores/create
parent/e-signature/create
parent/insights
parent/mentor-sessions/[param]/approve
parent/mentor-sessions/[param]/deny
parent/rides/[param]/approve
parent/rides/[param]/deny
parent/savings/match
parent/teens
parent/teens/create
parent/teens/search
parent/topup
parent/topup/manual
partner/apply-discount
partner/challenges/[param]/check-in
partner/offers
partner/offers/[param]
partner/restaurant/menu/items
partner/restaurant/menu/items/[param]
partner/restaurant/orders/[param]/accept
partner/restaurant/orders/[param]/reject
partner/restaurant/orders/feed
partner/verify-card
partners/register
payments/cmi/callback
payments/cmi/initiate
payments/hybrid
payments/mobile-money/initiate
payments/xp
presence
teen/activities
teen/avatar
teen/avatar-coach
teen/chores/[param]/complete
teen/circles
teen/circles/messages
teen/creativity/creations
teen/creativity/paths
teen/crew
teen/education/grades
teen/education/quizzes
teen/education/recommendations
teen/education/tutorials
teen/evidence/record
teen/evidence/sign-upload
teen/feed
teen/feed/[param]/engage
teen/feed/comments
teen/feed/submissions
teen/food/order
teen/friend-challenges/[param]/accept
teen/friend-challenges/[param]/progress
teen/friends
teen/friends/requests
teen/friends/requests/[param]/accept
teen/friends/requests/[param]/decline
teen/leaderboard
teen/mentor-sessions/book
teen/messages
teen/onboarding/complete
teen/onboarding/goals
teen/onboarding/interests
teen/onboarding/learning-style
teen/pathways/[param]/declare
teen/profile
teen/quests/complete
teen/quests/start
teen/quiz/[param]
teen/quiz/submit
teen/recommend-friends
teen/recommendations
teen/rides/request
teen/savings/goals
teen/savings/goals/[param]/cancel
teen/savings/goals/[param]/lock
teen/share
teen/sport/challenges
teen/sport/clubs
teen/sport/records
teen/subscription
teen/tokens
teen/wallet
tickets/generate-pdf
upload/avatar
```
