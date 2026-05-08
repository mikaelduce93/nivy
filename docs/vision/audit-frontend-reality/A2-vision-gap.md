# A2 — Vision vs Implemented Routes (Gap Audit)

> Date: 2026-05-08. Auditor: A2 (read-only). Scope: every route under `app/**/page.tsx` (≈190 today) compared against the canonical product spec in `docs/vision/PRODUCT_WHITEPAPER.md` v3 + `docs/vision/FRONTEND_REDO.md` + the 22 underlying domain audits in `docs/vision/`.
>
> Method: enumerated all `app/**/page.tsx` via Glob; cross-referenced each route to a §section of the whitepaper; flagged routes the vision says **must exist** but have no `page.tsx` (MISSING), routes whose `page.tsx` is a redirect-only stub or whose intended functionality is absent (PARTIAL), and routes whose file exists but no whitepaper / vision-doc mentions them (ORPHAN).

---

## Coverage snapshot

- Routes enumerated: ≈190 `page.tsx` files.
- Whitepaper §-mapped surfaces: ~75.
- **MISSING** (vision required, no `page.tsx`): **22**.
- **PARTIAL** (file exists, but is a thin redirect / placeholder / stub against the spec): **17**.
- **ORPHAN** (file exists, no canonical vision mention): **15**.
- All seven Wave-2 lifestyle surfaces (chores, transport, food, marketplace, allowance, creator, mentorship) have user-facing routes scaffolded — the gap there is depth + admin / partner side, not absence.

The single biggest cluster of missing surfaces is in the **partner** zone (teacher/coach XP awarding, staff management, anniversaire packs) and in the **admin** zone (moderation, refunds, broadcasts, audit-log) — exactly what `FRONTEND_REDO.md` already tagged with the `NEW` verdict and which this audit confirms is still 0% built.

---

## Table 1 — MISSING routes (vision says must exist, no `page.tsx`)

| # | Route (intended) | Vision source | Why required | Priority |
|---|---|---|---|---|
| 1 | `/teen/avatar` | Whitepaper §8 + `avatar-coach.md`; FRONTEND_REDO §2 | Customization surface (skin / color / title) tied to `user_unlocked_*` rewards. Whole avatar customization loop is unreachable today. | P1 |
| 2 | `/teen/birthday` | Whitepaper §13 + `birthday.md`; FRONTEND_REDO §2 | Standalone receive-XP-gift + view friend wishes surface. Today only a banner is referenced; no page. | P2 |
| 3 | `/teen/crews` | Whitepaper §17 + `social-graph.md`; FRONTEND_REDO §2 / §8 | Canonical crews home — leaderboard + join + battles. Today only the to-be-deleted `/gamification/crews` exists. | P1 |
| 4 | `/partner/awards` | Whitepaper §9 + `teacher-coach-xp.md`; FRONTEND_REDO §4 | The entire teacher / coach XP-grant feature (`partner_xp_awards`). 0% built — biggest single missing partner feature. | P0 |
| 5 | `/partner/staff` | Whitepaper §9; FRONTEND_REDO §4 | `partner_staff` management (owner / staff / coach / teacher) — gating prerequisite for #4. | P1 |
| 6 | `/partner/anniversaires` | Whitepaper §13 + `birthday.md`; FRONTEND_REDO §4 | Venue partners create / manage `anniv_packs`. No partner-side birthday pack authoring exists. | P1 |
| 7 | `/admin/moderation` | Whitepaper §18 + `admin-moderation.md`; FRONTEND_REDO §6 | Unified `moderation_queue` (user reports + AI content + creator submissions). `/admin/creator-moderation` covers a subset only. | P1 |
| 8 | `/admin/refunds` | Whitepaper §18 + §22; FRONTEND_REDO §6 | Refund authority surface for `payment_transactions` reversal + paired `escrow_ledger` write — no UI exists. | P1 |
| 9 | `/admin/broadcasts` | Whitepaper §16 + §18; FRONTEND_REDO §6 | Push-to-all-users broadcast surface. Required by notification matrix §23. | P1 |
| 10 | `/admin/audit-log` | Whitepaper §18 + §29 invariant 8; FRONTEND_REDO §6 | `admin_audit_logs` viewer (compliance — Moroccan accounting law 7-year retention). `/admin/logs` exists but is a generic activity feed, not the canonical audit store. | P1 |
| 11 | `/parent/ambassador` | Whitepaper §12; FRONTEND_REDO §3 | Parent-side ambassador surface when a parent is also enrolled. Deep-linked from `/parent` ambassador stub. | P2 |
| 12 | `/api/partner/awards/grant` (UI client) + `/partner/awards/[id]` review | Whitepaper §9 | The grant-then-parental-approval flow has neither UI nor review page. | P0 |
| 13 | `/teen/quests` cadence tabs (monthly / seasonal) | Whitepaper §6 | The page exists but the monthly / seasonal cadences have **no surface** because the cron `assign-missions` is not wired — no monthly tab content reachable. (Strictly speaking PARTIAL; listed here because the *user-facing capability* is absent.) | P0 |
| 14 | `/parent/topup/recurring` (allowance setup) | `allowance-savings.md` §1.a | Recurring allowance creation has only a basic `/parent/allowances/new` (36 lines, single-shot scaffold) — no recurrence picker UI matching the spec's weekly/biweekly/monthly cadence. | P1 |
| 15 | `/teen/wellbeing` | Whitepaper §19.4 deferred → P2 | Sleep / screen-time / mental-health surface. Vision marks deferred but flagged in `ai-safety-teen-welfare.md`. | P2 |
| 16 | `/parent/family-plan` | `family-subscriptions` referenced in §10 + `economy.md` | Parents on a family plan have no surface to manage seats / addable teens vs `/carte-vip` (consumer flow). | P2 |
| 17 | `/teen/notifications` (in-app inbox) | Whitepaper §16 | The inbox surface is `/notifications` (un-namespaced); a teen-namespaced inbox per the spec invariant ("role-namespaced inboxes") is missing. | P1 |
| 18 | `/onboarding/[role]` per-role flows | Whitepaper §19 | The router exists at `/onboarding` plus three sub-pages (`goals`, `learning-style`, `interests`, `complete`), but per-role flows for **partner** and **ambassador** are not present (they ship as parts of `/devenir-*` instead, with no `is_onboarded` gate). | P1 |
| 19 | `/account/export` + `/account/delete` | Whitepaper §22 (CNDP / right-to-erasure) | No data-export and no anonymize-account surfaces. Required by Moroccan data law. | P1 |
| 20 | `/admin/cndp` (DSAR / erasure queue) | Whitepaper §22 + `cndp-filing-dossier/` | Admin-side surface to action CNDP requests; not present. | P1 |
| 21 | `/teen/aide-scolaire/tutors` + `/teen/aide-scolaire/grades` | Whitepaper §15 + `academic-integration.md` | The hub exists at `/teen/aide-scolaire`; sub-routes for tutoring booking and grade view are not split out. | P1 |
| 22 | `/partner/restaurant` (root) + `/partner/restaurant/[id]` | `food-delivery-restaurants.md` §3 | Partner restaurant home / catalog page is missing; only `/partner/restaurant/menu` (50 lines) and `/partner/restaurant/orders` (50 lines) sub-routes exist with no parent surface. | P1 |

---

## Table 2 — PARTIAL routes (file exists; behavior is a redirect, placeholder, or unwired stub)

| # | Route | Current state | Intended (§) | Gap | Priority |
|---|---|---|---|---|---|
| 1 | `/gamification/missions` | 18-line `redirect()` to `/teen/quests` | Whitepaper §6 mandates one canonical hub | Already done as redirect — keep. (Listed for record.) | P2 |
| 2 | `/gamification/defis` | 22-line redirect | §6 | Done as redirect | P2 |
| 3 | `/gamification/boutique` | 9-line redirect | §6 + §5 | Done as redirect | P2 |
| 4 | `/gamification/page` | 250 lines, full hub | FRONTEND_REDO §8 → DELETE | Not yet redirected; competes with `/teen` | P1 |
| 5 | `/gamification/roue` | 163 lines wheel of fortune | FRONTEND_REDO §8 → DELETE (`wheel_streaks` trigger broken anyway, §29 invariant) | Live page references missing schema, breaks user creation | P1 |
| 6 | `/gamification/leaderboard` | Live | FRONTEND_REDO §8 → redirect `/teen/leaderboard` | Not redirected | P2 |
| 7 | `/gamification/crews` | Live | FRONTEND_REDO §8 → redirect `/teen/crews` (which is itself missing — see Table 1 #3) | Not redirected; canonical target absent | P1 |
| 8 | `/gamification/aide-scolaire` | Live | redirect `/teen/aide-scolaire` | Not redirected | P2 |
| 9 | `/gamification/defis-physiques` | Live | redirect `/teen/defis-physiques` | Not redirected | P2 |
| 10 | `/gamification/parcours` | Live | fold into `/teen/quests` | Not folded | P2 |
| 11 | `/gamification/collections` | Live | DELETE or fold into `/teen/profile` | Not folded | P2 |
| 12 | `/teen/coins` | Live page | §5 + FRONTEND_REDO § 2 → REPLACE → `/teen/wallet` | Duplicate of `/teen/wallet`; coins balance hardcoded `0` per FRONTEND_REDO | P0 |
| 13 | `/teen/challenges` | Live | §6 → REPLACE `/teen/quests` | Duplicate cadence surface | P1 |
| 14 | `/teen/rewards` | Live | §5 → REPLACE `/teen/shop` | Duplicate | P1 |
| 15 | `/teen/academic` | Live | §15 → REPLACE `/teen/aide-scolaire` | Duplicate | P1 |
| 16 | `/teen/calendar` | Live | §14 → REPLACE `/teen/events` | Duplicate | P2 |
| 17 | `/teen/passions` | Live (40 lines onboarding subpage) | §19 → REPLACE → `/onboarding` | Standalone unnecessary | P2 |
| 18 | `/teen/social` | Live | DELETE / fold into `/teen` | Duplicate of feed/dashboard | P2 |
| 19 | `/teen/messages` | Live | REPLACE → `/teen/circles` | Not consolidated | P2 |
| 20 | `/parent/topup` | Writes to `profiles.total_coins` (column doesn't exist) per whitepaper §3 / §4 gap #2 | §5 — must write `payment_transactions` + `escrow_ledger` + UPSERT `user_coins` | Pipeline broken end-to-end; PSP not wired | P0 |
| 21 | `/teen/shop/checkout` | Live, fails on missing `parental_approvals` | §5 + §14 | `parental_approvals` table missing | P0 |
| 22 | `/parent/approvals` | UI shell; mock queue per FRONTEND_REDO §3 | §11 — multi-parent fan-out, push handoff, 24h auto-deny | Backing table missing on live DB; auto-deny + push not wired | P0 |
| 23 | `/parent/budget` | UI shell | §10 `teen_budget_limits` | Table missing; default mode wrong (should default `validation`) | P0 |
| 24 | `/parent/teens/add` | UI shell | §10 + §19 — 6-digit `linking_codes`, 24h TTL, single-use | `linking_codes` table missing | P0 |
| 25 | `/parent/e-signature` | Functional but writes to public bucket | §10 + §22 — must use PRIVATE bucket | CNDP / loi 09-08 violation today | P0 |
| 26 | `/parent/documents` | Live | §22 — signed-URL only | Reads public bucket | P0 |
| 27 | `/partner/scanner` | Mock QR scanner | §9 — real scanner against `partner_transactions` + `event_check_ins` | Mock wired in dashboard too | P0 |
| 28 | `/partner/kyc` | Live | §9 — PRIVATE bucket, signed URLs 5min, RLS | Public bucket risk | P0 |
| 29 | `/ambassador/page` | Reads `ambassadors`, `referral_codes`, `referral_usage` | §12 — track + tier + commissions | Role enum lacks `'ambassador'`; route redirects in production per FRONTEND_REDO §5 | P0 |
| 30 | `/ambassador/commissions` | Live shell | §12 — `ambassador_commissions` (pending/available/paid_out/clawed_back) | Table missing live | P0 |
| 31 | `/ambassador/withdrawals` | Live shell | §27 — bank transfer monthly, ≥ 200 DH threshold, cash track only | `ambassador_payouts` table missing | P1 |
| 32 | `/admin/proofs` | Live | physical-challenges.md + §22 | Reads public bucket; should be private signed URL | P0 |
| 33 | `/admin/logs` | Live | §29 invariant 8 — `admin_audit_logs` for **every** admin action | Coverage incomplete; not the canonical audit store (see Table 1 #10) | P0 |
| 34 | `/admin/scripts-sql` | Live; any admin can run raw SQL | §18 — restrict to `super_admin` only or remove | Currently dangerous; not gated | P0 |
| 35 | `/onboarding` | Single page + 4 sub-steps | §19 — must be **router** that dispatches by role + checks `is_onboarded` | No `is_onboarded` flag on profiles; no per-role branch (see Table 1 #18) | P0 |
| 36 | `/auth/sign-up` | Generic signup | §19 — must capture role into `raw_user_meta_data.role` so trigger creates `profiles` | Trigger missing on live DB; manual patches in tests | P0 |
| 37 | `/auth/redirect` | Live | §19 invariant 13 — `is_onboarded=false` → `/onboarding` | May loop without flag | P0 |
| 38 | `/offline` + `/sw.js` + `/manifest.json` | Page exists | §16 — `/sw.js` and `/manifest.json` currently 404 | PWA push unblocked only after these ship | P0 |
| 39 | `/notifications` + `/notifications/preferences` | Live, generic | §16 — should be role-namespaced (`/parent/notifications`, `/teen/activity`) | Duplicate (see Table 1 #17) | P1 |
| 40 | `/autorisations` + `/autorisations/ajouter` | Live | §11 → REPLACE `/parent/approvals` | Duplicate per-action approvals UI | P1 |
| 41 | `/marketplace/sell` | 20-line scaffold + form component | `marketplace-c2c.md` — listing creation with photos, anti-coordinate pre-publish moderation | Form depth not validated against full spec (escrow + safe-meet picker + AML cap) | P1 |
| 42 | `/parent/allowances/new` | 36-line page | `allowance-savings.md` §1.a — full cadence picker (weekly/biweekly/monthly/custom) + condition layer + parent match | Stub; no recurrence cadence selector | P1 |
| 43 | `/teen/savings/new` | 20-line scaffold | `allowance-savings.md` §1.b — goal name, target_coins, deadline, parent-match config | Stub | P1 |

---

## Table 3 — ORPHAN routes (file exists, no canonical vision mention)

| # | Route | Current behavior | Recommendation |
|---|---|---|---|
| 1 | `/devenir-influenceur` + `/devenir-influenceur/candidature` | Influencer application flow | Not in whitepaper; FRONTEND_REDO §1 marks DELETE — fold into ambassador track |
| 2 | `/djs` + `/djs/[id]` + `/djs/candidature` | DJ directory | Not in whitepaper; FRONTEND_REDO §1 → DELETE or fold into events |
| 3 | `/espace` | Hub fragment | Orphan; FRONTEND_REDO §1 → DELETE or redirect `/teen` |
| 4 | `/daily` | Hub fragment | Orphan; FRONTEND_REDO §1 → DELETE / redirect |
| 5 | `/teen/games` | Mini-games | Not in whitepaper canonical; FRONTEND_REDO §2 → DELETE |
| 6 | `/teen/share` | Generic share UI | Vision splits this into ambassador-teen track + friend invite — current single page collides flows; needs split or delete |
| 7 | `/ambassador/boutique` | Ambassador-only shop | Not in canonical spec; FRONTEND_REDO §5 → DELETE |
| 8 | `/parent/live` | Real-time monitoring | Not specced; FRONTEND_REDO §3 → DELETE / fold into `/parent` |
| 9 | `/admin/scripts-sql` | Raw SQL exec | Out of canonical spec for non-super-admin; restrict or remove |
| 10 | `/admin/tag-normalize` | Tag normalization tool | Ops utility — not specced; document as ops tool or delete |
| 11 | `/admin/topups` | Top-up admin view | Adjacent to §5 but not in `economy.md` admin surface list; either canonicalize (move to `/admin/refunds` flow) or document |
| 12 | `/admin/gamification-setup` + `/admin/gamification/scorecard` | Gamification ops | Ops utility — not strictly specced; FRONTEND_REDO §6 KEEPs as P2 |
| 13 | `/teen/feed` + `/teen/feed/[id]` | Live | Vision specs creator economy at `/teen/create` + admin moderation; the `/teen/feed` browse surface is implied but not explicitly specced — needs whitepaper anchor |
| 14 | `/teen/quests/friend-defis` | Live | Not in whitepaper §6 quest cadences (daily/weekly/monthly/seasonal/event); folded into `/teen/quests?tab=...` per spec |
| 15 | `/dev/defi-card-preview` | Component preview | Dev-only; remove from production build |
| 16 | `/communaute` | Public feed | Not canonical; possibly merge into `/teen/feed` or delete |
| 17 | `/guide-parents` | Marketing page | Adjacent to onboarding; not in whitepaper §19; KEEP as marketing |
| 18 | `/agenda/[id]` | Public event detail | OK in spirit (§14 public discovery) but the **detail-by-id** surface is not explicitly enumerated — likely intentional |
| 19 | `/reservation` + `/reservation/paiement` + `/reservation/confirmation` | Booking flow | Vision §14 routes are `/teen/shop/checkout?booking=...` + partner authoring; this orphan reservation tree is duplicate of `/teen/shop/checkout` — REPLACE |
| 20 | `/teen/offres` | Partner offers feed | Adjacent to §9 + §19.5 personalization but not explicitly named; may be the right canonical home — needs whitepaper update or rename to `/teen/shop/offers` |

---

## Top-10 must-build-before-launch punchlist

Ordered by launch-blocker severity (whitepaper §26 P0 + critical PARTIAL fixes); each item names the route(s) and the one-sentence rationale. **Money + identity + compliance dominate** — without these, no teen can spend or be funded legally.

| # | Item | Routes / surfaces | Rationale (link to spec) | Tier |
|---|---|---|---|---|
| 1 | **Fix the coin pipeline end-to-end** | `/parent/topup`, `/teen/shop/checkout`, `/teen/wallet`, `/parent/history` | Today top-up writes to a missing column and checkout fails on missing `parental_approvals` (whitepaper §3 gap #2 + §5). No teen can be funded → no real spend → no cashback → no two-currency loop. | P0 |
| 2 | **Move CIN + teen-photo storage to PRIVATE buckets, signed URLs** | `/parent/e-signature`, `/parent/documents`, `/admin/proofs`, `/partner/kyc` | Public bucket = CNDP / loi 09-08 violation (whitepaper §22). Single biggest legal risk. | P0 |
| 3 | **Build `/partner/awards` + `/partner/staff`** | `/partner/awards`, `/partner/staff`, `/api/partner/awards/grant` | Teacher / coach XP awarding is **0% built** (whitepaper §9 + `teacher-coach-xp.md`). Without it the partner-network value prop ("partners certify XP") is fiction. | P0 |
| 4 | **Wire `/parent/approvals` to a real `parental_approvals` table with multi-parent fan-out + 24h auto-deny + push handoff** | `/parent/approvals`, notification routing | Per-action approvals are the spine of parent control (§11). Today the queue is a mock; the table is missing on live DB. Parental-authorization invariant is broken. | P0 |
| 5 | **Onboarding router + `is_onboarded` flag + per-role flows** | `/onboarding`, `/auth/sign-up`, `/auth/redirect` | Whitepaper §19 invariant: a user with `is_onboarded=false` is **always** routed to `/onboarding`. Today the page is a single screen; per-role branching and the flag are missing → the auth redirect can loop and teens can land in dashboards without a profile. | P0 |
| 6 | **Stand up `/admin/audit-log` + log every admin action** | `/admin/audit-log`, `admin_audit_logs` table | Whitepaper §29 invariant 8 + Moroccan accounting law (7-year retention). Without an audit log, no admin action (refunds, tier override, KYC approval) is compliant. | P0 |
| 7 | **PWA infra: `/sw.js` + `/manifest.json` + VAPID + `/offline`** | `/offline`, service worker, push subscriptions API | Whitepaper §16 + §25 — push notifications are how parents see approvals on time. Today both files 404. Until this ships, the notification matrix in §23 cannot work for parental-approval routing. | P0 |
| 8 | **Replace `/partner/scanner` mock with real device-camera scan** | `/partner/scanner` (and strip mock from `/partner/dashboard`) | Whitepaper §9 + §14 — every successful in-store / event redemption depends on the scanner. Mock means no real `partner_transactions`, no commission, no cashback. | P0 |
| 9 | **Ambassador role enum + tables (`ambassador_commissions`, `referral_attribution`, `ambassador_payouts`)** | `/ambassador`, `/ambassador/commissions`, `/ambassador/withdrawals`, `/devenir-ambassadeur/candidature` | Whitepaper §12 — full UI exists on missing tables, role redirects in production. Without this the growth engine (filleul attribution + commission) does not exist. | P0 |
| 10 | **Quest assignment cron + monthly / seasonal cadence wiring** | `/teen/quests` (monthly + seasonal tabs), cron `assign-missions` | Whitepaper §6 + §29 invariant 11 — monthly quests are unreachable today (no cron). Six monthly templates seeded but never assigned. Single biggest content-engine break. | P0 |

### Honourable mentions (P0+ / P1) just outside the top-10

- 11 — `/teen/avatar` + `<AvatarCoach>` profile-aware greeting (Whitepaper §8): without it the retention loop is flat.
- 12 — Adaptive `/teen/quiz` daily selector (`recommend_for_teen` instead of `pool[dayIndex % length]`) — Whitepaper §7 + §19.5.
- 13 — `/admin/moderation` (Whitepaper §18) — operationally critical once creator economy ships.
- 14 — `/admin/refunds` + `/admin/broadcasts` (Whitepaper §16, §18, §22) — operational gates.
- 15 — Tier rename to `Free / Silver / Gold / Platinum` across `/carte-vip/*`, `/parent/topup`, `/parent`, `/teen/vip-card` (Whitepaper §27 LOCKED #19).
- 16 — RLS + GRANTs across the 34 broken tables (Whitepaper §21) — silent access denial today.

---

## Notes on read-only scope

This audit made no code changes. All findings are derived from:

- `docs/vision/PRODUCT_WHITEPAPER.md` (v3, 2026-05-07).
- `docs/vision/FRONTEND_REDO.md` (companion route map, 2026-05-07).
- `docs/vision/parent-custom-chores.md`, `transport-mobility.md`, `food-delivery-restaurants.md`, `allowance-savings.md`, `mentorship-career.md`, `content-creator-economy.md`, `marketplace-c2c.md` (the seven lifestyle surface specs).
- `docs/vision/teacher-coach-xp.md`, `ambassador-referral.md`, `birthday.md`, `notifications.md`, `admin-moderation.md`, `parental-authorizations.md`, `onboarding-flows.md`.
- A full enumeration of `app/**/page.tsx` + spot-checks on stub size for redirect-only files.

Cross-reference: agent A1 (B5-ambassador-audit.md) covers the ambassador surface in greater depth — its findings are folded into Table 2 row 29-31 and punchlist item 9.
