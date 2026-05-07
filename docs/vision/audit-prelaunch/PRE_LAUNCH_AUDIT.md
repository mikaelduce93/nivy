# NIVY — Pre-Launch Audit & Finalization Plan

> **Date**: 2026-05-07
> **Reviewers**: 8 parallel specialist agents (DB, API, money, frontend, lifestyle, cron, security, prod-readiness)
> **Source of truth**: `docs/vision/PRODUCT_WHITEPAPER.md` + 38 vision specs
> **Live project**: `imchornjvmgmaovhypco`
> **Verdict**: 🔴 **RED — DO NOT SHIP TODAY.** Foundations are real. Shipping skin and a handful of P0 wires are not.

---

## 1. Executive verdict — one paragraph

The schema spine, the money pipelines, the lifestyle backends, and the auth/RLS plumbing are **substantively built**. The reasons we cannot ship today are concentrated and fixable: (a) **partner & admin surfaces are 100% mocked** — admins literally cannot approve a real partner KYC; (b) the **AvatarCoach**, the explicit centerpiece of retention in the whitepaper, is **structurally absent**; (c) **5 API routes have impersonation/auth holes** + the Stripe/CMI webhook is CSRF-blocked; (d) **`complete_ride` is broken** (wrong rate, no escrow, no cashback — already produced 1 orphan in prod); (e) **the 22h curfew cron fires at 23h Casablanca**; (f) two private money tables (`creator_engagement`, `creator_monthly_stats`) have **RLS disabled**; (g) **migrations 057 + 059 are not in the repo** (live-applied via MCP only — `db reset` cannot reproduce prod); (h) **i18n is scaffolded but ~95% of the UI is hardcoded French** while the whitepaper promises FR/Darija/AR/EN. Below is the brutal inventory and a 4-wave finalization plan.

---

## 2. Per-domain verdict

| # | Domain | Verdict | Top blocker |
|---|---|---|---|
| 01 | DB integrity | 🟡 AMBER | RLS disabled on `creator_engagement` + `creator_monthly_stats`; `add_xp/coins_to_user` are SECURITY INVOKER → cashback failed ~25% in live data |
| 02 | API routes | 🟡 AMBER → 🔴 | `notifications`, `notifications/push/send`, `check-in/entry`, `check-in/exit` accept client-supplied IDs → user/admin impersonation |
| 03 | Money pipeline | 🟡 AMBER | `complete_ride` violates §29 #1 + #3 + #4; `disburse_allowance` + `complete_ride` granted EXECUTE to PUBLIC + anon |
| 04 | Frontend reality | 🔴 RED | 7 critical pages 100% mock; AvatarCoach not built; parent dashboard renders identical fake stats per teen |
| 05 | Lifestyle surfaces | 🟡 AMBER | Mentorship has **0 UI pages** (backend done); migrations 057+059 not in repo |
| 06 | Cron + jobs | 🟡 AMBER → 🔴 | Curfew check at 22h UTC = 23h Casa (fires AFTER curfew); 4 orphan routes fail-open if `CRON_SECRET` unset |
| 07 | Security + compliance | 🟡 AMBER | Parent approvals route broken at runtime; privacy policy = literal placeholders; brand says "Teens Party Morocco" |
| 08 | Production readiness | 🔴 RED | Live secrets readable in working tree (rotation needed); 25 untracked feature dirs; manifest collision; 216 `console.log` in prod |

---

## 3. The 12 P0 launch blockers (must fix before any go-live)

### Security & impersonation (5)
1. **`app/api/notifications/route.ts`** — GET/POST/PATCH/DELETE all trust client `userId`. Anyone reads/edits/deletes anyone's notifications. **Fix**: bind every handler to `auth.getUser()`. (S, 1h)
2. **`app/api/notifications/push/send/route.ts:41-67`** — no auth/role gate; any logged-in user can blast push to any `userIds[]`. **Fix**: require admin role + audit log. (S, 1h)
3. **`app/api/check-in/entry/route.ts:7` + `…/exit/route.ts:7`** — accept client `adminId`. Trivial admin impersonation. **Fix**: read `auth.getUser()` + `admin_roles` server-side. (S, 1h)
4. **`middleware.ts:128-136` CSRF matcher** — covers `/api/webhooks/stripe` and `/api/payments/cmi/webhook`. PSPs cannot send CSRF tokens → all reconciliation will be 403'd. **Fix**: webhook exception list + signature-based auth instead. (S, 1h)
5. **`app/api/auth/register-teen/route.ts:81,178-183`** — unsalted SHA-256 password hash. **Fix**: use Supabase Auth admin createUser flow exclusively. (M, 4h)

### Money pipeline integrity (3)
6. **`complete_ride` RPC** — uses placeholder rate "1 DH = 1 coin" (vs locked 100), no `escrow_ledger`, no cashback XP. **Production already has 1 orphan**: `coin_transactions.id=141b3cfb-…`. **Fix**: rewrite RPC to mirror `place_food_order` shape. (M, 4h)
7. **`disburse_allowance` + `complete_ride` granted EXECUTE to PUBLIC + anon** — confirmed via `routine_privileges`. Force-fire across families possible. **Fix**: `REVOKE EXECUTE … FROM PUBLIC, anon`. (S, 30m)
8. **`add_xp_to_user` + `add_coins_to_user` are SECURITY INVOKER** — when called inside `spend_teen_coins` under teen JWT, the inner XP insert is silently RLS-blocked. Live ledger: 4 spends but only 3 cashback rows (~25% violation of §29 #3). **Fix**: switch both helpers to SECURITY DEFINER + `set search_path`. (S, 1h)

### Operational integrity (4)
9. **RLS disabled on `creator_engagement` + `creator_monthly_stats`** (52 + 1 rows exposed via anon key) — violates §29 #7. **Fix**: `ENABLE RLS` + self-read policy. (S, 30m)
10. **Curfew cron at 22:00 UTC = 23:00 Casablanca** (`vercel.json:7`) fires **1 hour AFTER** the 22:00 local curfew. Teens with approved 22:30 rides depart unmonitored. **Fix**: schedule `0 21 * * *` UTC + add request-time check inside `request_ride`. (S, 30m)
11. **4 orphan cron routes** (`purge-documents`, `generate-daily-content`, `notifications`, `feed-seed`) deployed without `vercel.json` entries — 2 of them fail-open if `CRON_SECRET` is unset. **Fix**: either wire to vercel.json or delete; harden `CRON_SECRET` check to fail-closed. (S, 1h)
12. **`app/api/parent/approvals/route.ts:54-114` is broken at runtime** — writes columns that don't exist, cascades to `event_bookings` table that doesn't exist. Every parent decision through this catch-all silently 500s. **Fix**: rewrite against current schema or route per-action via existing approval RPCs. (M, 3h)

---

## 4. The "hardcoded / scaffolded / rushed" master inventory

### 7 mock pages that lie on every load (frontend P0)
| Page | What's fake | File:line |
|---|---|---|
| `/partner` dashboard | Entirely mock + `pravatar.cc` photos | `app/partner/dashboard/page.tsx:28,145` |
| `/partner/transactions` | 6 fake Moroccan-named transactions | `app/partner/transactions/page.tsx:7-14` |
| `/partner/stats` | Fake KPIs + monthly history | `app/partner/stats/page.tsx:6-17` |
| `/partner/events` | Fake events dated "25 Janvier 2024" | `app/partner/events/page.tsx:7-43` |
| `/admin/partners` | Hand-typed mock CIN/RC/ICE/RIB; **never queries Supabase** | `app/admin/partners/page.tsx:108-300` |
| `/admin/proofs` | Fake teen names + age + video URLs (§22 hazard) | `app/admin/proofs/page.tsx:86-200` |
| `/teen/xp-value` | Promotes a feature that **violates §27 LOCKED** rate | `app/teen/xp-value/page.tsx:506-512` |

### 9 cross-cutting components specified but missing
Per `FRONTEND_REDO.md` Wave 1: `<AvatarCoach>`, `<AvatarHero>`, `<TwinCurrencyGauge>`, `<DefiCard>`, `<OnboardingRouter>`, `<PSPRailPicker>`, `<EscrowReceipt>`, `<EvidenceUpload>`, `<LocaleSwitcher>`. Only `elite-ai-companion.tsx` (chat-only) exists for the Avatar concept.

### 6 missing crons (whitepaper-mandated)
- `notification-fan-out` (§29 #10 quiet hours)
- `birthday-greetings` (§13)
- `quiz-seen-history-prune` (§29 #9 retention)
- `partner-payout-monthly` (§9)
- `weekly-leaderboard-rollup`
- `tag-normalize` (personalization §7)

### Hardcoded literals leaking into RPCs
- `8%` marketplace fee (whitepaper allows config) — baked in `056_marketplace_c2c`
- `10%` cashback rate fallback — bypasses `cashback_rules` in marketplace + food paths
- `100` coins/DH conversion — locked correctly but hardcoded in 3 places instead of read from `xp_payment_settings`
- `XP_TO_DH_RATE=0.10` in TS contradicts `xp_payment_settings.xp_to_dh_rate=100` in DB

### Identity drift (§29 #5)
- 4 orphan `profiles` rows + 1 orphan `public.users`
- `profiles.id` and `teens.id` lack a hard FK to `auth.users(id)` (only the trigger enforces — silently fails if bypassed)
- 16 FKs still target legacy `public.users` (deferred drop)

### CNDP / Loi 09-08 compliance gaps (P1)
- `data_exports` table exists, **no API behind it** ("right to portability" promised, not implemented)
- **No data-erasure endpoint** (right-to-be-forgotten promised, not implemented)
- Privacy policy: `+212 5XX-XXXXXX` + `[Votre adresse complète]` literally in `app/legal/confidentialite/page.tsx:196-198`
- Privacy policy still says "Teens Party Morocco", not "Nivy"

### Migrations off-repo (reproducibility risk)
- `057_transport_mobility` + `057_transport_mobility_rpcs` — applied via MCP, not committed
- `evolve_all_teens` + `assign_missions_for_teen` RPCs — applied via MCP, not committed
- `db reset` from a clean checkout cannot reproduce production today.

### Production readiness scaffolds
- `app/manifest.ts` AND `public/manifest.json` both exist (collision)
- `verification.google` is the literal placeholder string
- 216 `console.log` calls across 42 production files (CI `lint --quiet` masks)
- i18n: 193 lines × 3 locales declared, ~95% of UI hardcoded French; no RTL handling
- `app/robots.ts` does NOT disallow `/teen/`, `/parent/`, `/partner/`
- No `app/not-found.tsx`
- No `instrumentation.ts` for Sentry Next 16 init

---

## 5. What's actually solid — credit where due

- Schema spine is comprehensive (every whitepaper §8 + §19.4 table present)
- 0 RLS-enabled-but-no-policy tables (375 policies / 278 tables)
- Money RPCs (`top_up_teen`, `spend_teen_coins`, `buy_listing`, `confirm_receipt`, `place_food_order`, `payout_chore_reward`, `disburse_allowance`, `lock_to_goal`) all use FOR UPDATE row locks + `auth.uid()` + atomic plpgsql + e-signature gate
- Storage privacy: 3 PRIVATE buckets correctly configured with RLS folder-prefix policies; **zero `getPublicUrl(...)` calls on sensitive buckets**
- Service role discipline: canonical helper, **zero leaks into client components**
- Auth defense-in-depth: middleware + per-layout role checks + CSP + rate-limit + fail-closed in prod
- BAM e-money architecture is ready (`payment_transactions` + `escrow_ledger`, `psp_provider`/`psp_reference` columns) — just unwired
- Halal-by-default + curfew + per-action parental approvals are **enforced inside the RPCs** (not just the UI)
- KYC gate enforced in `book_mentor_session`
- PWA: service worker registered + manifest linked + push subscribe wired

---

## 6. The 4-wave finalization plan

> **Strategy**: 4 sequential waves over ~3-5 working days. Each wave commits as a snapshot. Wave-A unblocks safety; Wave-B unblocks money/ops; Wave-C unblocks the customer surface; Wave-D unblocks production polish. **No new features until D ships green.**

### Wave A — Security & integrity (P0, ~1 day)
A.1. Fix the 5 impersonation routes (notifications ×2, check-in ×2, register-teen).
A.2. Add CSRF webhook exception list (Stripe + CMI).
A.3. `REVOKE EXECUTE … FROM PUBLIC, anon` on `disburse_allowance` + `complete_ride`.
A.4. `ENABLE RLS` + policies on `creator_engagement` + `creator_monthly_stats`.
A.5. Switch `add_xp_to_user` + `add_coins_to_user` to `SECURITY DEFINER` + `set search_path`.
A.6. Reschedule curfew cron to `0 21 * * *` UTC + add request-time curfew check inside `request_ride`.
A.7. Decide fate of 4 orphan crons (delete or wire); harden `CRON_SECRET` check to fail-closed.
A.8. Backfill the 1 orphan `coin_transactions` row from the broken `complete_ride` (or void with admin journal entry).

**Definition of Done**: 0 routes accept client-supplied owner IDs; advisor lints clean on RLS; live ledger has 0 orphans; curfew sweep runs at 21:00 UTC on next deploy.

### Wave B — Money pipeline + missing migrations (P0, ~1 day)
B.1. Rewrite `complete_ride` to mirror `place_food_order`: 100 coins/DH, paired escrow, 10% cashback, atomic.
B.2. Add `resolve_dispute` RPC (release to seller, refund buyer, or split).
B.3. Fix `partner_accept_food_order` double-insert into `partner_transactions`.
B.4. Make cashback rate read `cashback_rules` (not hardcoded) in marketplace + food paths.
B.5. Backfill `escrow_ledger.related_spend_id` in `spend_teen_coins`.
B.6. Dump migrations 057 + 059 (transport + mentorship) + the live MCP-only RPCs (`evolve_all_teens`, `assign_missions_for_teen`) into `gamification-system/database/migrations/` and verify `db reset` reproduces prod.
B.7. Fix `app/api/parent/approvals/route.ts` (rewrite or per-action route).
B.8. Add 19 missing FK indexes (food_orders.parent_id, ride_bookings.driver_id, mentor_sessions.parent_approval_id, marketplace_transactions.listing_id, etc.).

**Definition of Done**: every spend has paired `coin_transactions` + `escrow_ledger` + `xp_transactions` cashback row. Migrations replay from clean checkout. `npm run verify-*` all green for chores/allowance/creator/marketplace/food/transport/mentorship.

### Wave C — Customer surface (P0/P1, ~2 days)
C.1. Replace 7 mock pages with real Supabase queries (partner ×4, admin ×2, teen/xp-value).
C.2. Build `<AvatarCoach>` + wire to `/teen` dashboard reading from `avatars` + `avatar_messages`.
C.3. Build `<TwinCurrencyGauge>` + insert across teen/parent surfaces.
C.4. Build `<EvidenceUpload>` + wire to chore evidence + defi proofs (signed-URL upload pattern).
C.5. Build mentorship UI (3 teen pages + 1 parent + 2 admin) — backend already done, ~9-13 dev-days estimated, descope if needed (see §7 below).
C.6. Fix `/parent` dashboard to read real per-teen stats (kill the hardcoded `{ responsibility: 65, social: 88, … }`).
C.7. Build `/admin/partners` real moderation queue against `kyc_documents` + admin approval RPC.
C.8. Build `/admin/proofs` real defi-proof moderation against `moderation_queue`.

**Definition of Done**: a real partner can sign up → admin approves → partner sees real (or zero) transactions. AvatarCoach renders a contextual greeting on /teen for amine. /teen/xp-value either deleted or rewritten to honor §27.

### Wave D — Production polish (P1, ~1 day)
D.1. Rotate `SUPABASE_SERVICE_ROLE_KEY` + `OPENAI_API_KEY` (rotation policy after audit).
D.2. Strip 216 `console.log` (or wrap in `process.env.NODE_ENV==='development'`).
D.3. Add `app/not-found.tsx`.
D.4. Resolve manifest collision (delete `app/manifest.ts` OR `public/manifest.json`, not both).
D.5. Set real `verification.google` value or remove.
D.6. Update `app/robots.ts` to disallow `/teen/`, `/parent/`, `/partner/`, `/admin/`, `/api/`.
D.7. Run `npm run build` + `npx tsc --noEmit` + `npm run lint` + Playwright e2e suite — all green on a clean checkout.
D.8. Wire `instrumentation.ts` for Sentry init at framework level.
D.9. Update `app/legal/confidentialite/page.tsx` — replace placeholders, fix brand to "Nivy", fix DPO contact.
D.10. Implement `/api/me/data-export` (CNDP) + `/api/me/data-delete` (right-to-erasure).
D.11. Wire 6 missing crons (notification-fan-out, birthday-greetings, quiz-seen-history-prune, partner-payout-monthly, weekly-leaderboard-rollup, tag-normalize).

**Definition of Done**: green CI on clean checkout. Privacy policy is real. Robots blocks teen surfaces. CNDP endpoints respond.

---

## 7. Ship vs hold (recommended scope cut for V1)

| Surface | Recommendation | Reasoning |
|---|---|---|
| Daily quiz + XP/coins economy | **SHIP** | Solid, verified |
| Parent top-up (manual mode) | **SHIP** with explicit "manual escrow only" copy | PSP integration is its own epic |
| Parent chores | **SHIP** | Wave 2 P1+, solid |
| Allowance + savings | **SHIP** | Wave 2 P1+, solid |
| Marketplace C2C | **SHIP after AML dogfood** | Add `resolve_dispute` first |
| Food delivery | **SHIP** | 13/13 verify pass; halal hard-block confirmed |
| Transport (single-city) | **SHIP** with curfew fix | Backend done; flag aggregator integrations as roadmap |
| Creator economy | **HOLD post-launch** | No image AI, missing composer audit, missing strikes table |
| Mentorship | **HOLD post-launch** | 0 UI pages, missing recording pipeline + DM block + strikes |
| Partner real onboarding | **MUST SHIP** | Cannot launch a marketplace with mocked KYC |
| AvatarCoach | **MUST SHIP V1** | Whitepaper centerpiece — even a minimal version |
| i18n (FR/AR/Darija/EN) | **HOLD post-launch** | Ship V1 in French only; flag in-app |

---

## 8. Open questions for the founder

1. **Wave 3 status**: my prior summary said transport+mentorship were never dispatched. **It was wrong** — both are real backends. The remaining gap is mentorship UI (zero pages). Confirm: ship transport-only at launch, mentorship post-launch?
2. **i18n at launch**: ship FR-only V1 and add AR/Darija/EN as a fast-follow, or block on translation?
3. **PSP**: launch in manual top-up mode (parent transfers via Cash Plus / Wafacash → Nivy admin manually credits coins) for first N families, or block on full PSP integration?
4. **Privacy policy**: do you have legal counsel reviewing the CNDP filing? The current draft is placeholders.
5. **Mentorship recording pipeline**: vision §6 mandates 90-day session recordings + indefinite transcript retention. Is this a hard requirement at launch or post-launch?
6. **Wave A start**: do I begin executing the security batch now? It's ~1 day of focused work; everything else cascades after.

---

## Appendix — full per-domain reports

- `01-db-integrity.md` (~3,800 words)
- `02-api-routes.md`
- `03-money-pipeline.md`
- `04-frontend-reality.md` (~6,500 words — has the 31-row mock matrix)
- `05-lifestyle-surfaces.md`
- `06-cron-jobs.md`
- `07-security-compliance.md` (~3,800 words)
- `08-production-readiness.md` (~3,800 words — has the 42-row checklist)

Each one cites real file:line evidence. Read in this order if you want the full picture: 01 (foundations) → 03 (money) → 02 (routes) → 07 (security) → 06 (cron) → 04 (frontend) → 05 (lifestyle) → 08 (prod-readiness).
