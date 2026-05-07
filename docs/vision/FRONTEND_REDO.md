# Nivy Frontend Redesign Map

> **Date**: 2026-05-07
> **Source of truth**: `docs/vision/PRODUCT_WHITEPAPER.md` (v3, 51 KB) and the 22 underlying audits.
> **Scope**: every route under `app/` (≈155 page.tsx files) compared against the canonical product spec.
> **Audience**: redesign agents, design system owners, frontend orchestrator.

---

## Methodology

For each existing route we record:

- **Current** — what the page actually renders today (one line, derived from a quick read of `page.tsx` and the components it loads).
- **Intended** — what the whitepaper §section says the page must do at v1 launch.
- **Gap** — top 1–3 deltas between the two (data, UX, components, or routing).
- **Verdict** — `KEEP` (cosmetics only), `REDESIGN` (rebuild the surface, keep the route), `REPLACE` (consolidate into another route), `DELETE` (remove or redirect), `BUILD` (route exists but is empty / stub), `NEW` (whitepaper requires a route that doesn’t exist yet).
- **Priority** — `P0` launch-blocker, `P1` vision-coherence, `P2` polish, mapped to whitepaper §26.

We do not analyze every one of the ≈155 routes individually — instead we focus on the ~45 routes that map directly to a whitepaper spec section. The remaining ≈110 are bucketed in the **Minor pages appendix**.

---

## Per-zone matrix

### 1. Public / marketing zone

Routes in scope: `/`, `/a-propos`, `/agenda`, `/blog`, `/galerie`, `/temoignages`, `/securite`, `/clubs`, `/clubs/[slug]`, `/djs`, `/djs/[id]`, `/djs/candidature`, `/anniversaires`, `/anniversaires/organiser`, `/carte-vip`, `/carte-vip/recompenses`, `/carte-vip/souscrire`, `/carte-vip/confirmation`, `/devenir-partenaire`, `/devenir-partenaire/inscription`, `/devenir-ambassadeur`, `/devenir-ambassadeur/programme`, `/devenir-ambassadeur/candidature`, `/devenir-influenceur`, `/devenir-influenceur/candidature`, `/aide`, `/aide/faq`, `/legal/*` (4 routes), `/partenaires/merci`, `/offline`, `/espace`, `/daily`.

| Route | Current | Intended (§) | Gap | Verdict / Priority |
|---|---|---|---|---|
| `/` | Marketing landing with hero + features | Same, but with **dual-currency explainer** (§5), real ambassador CTA, parent vs teen split | No mention of XP+coins separation, ambassador CTA dead | REDESIGN P1 |
| `/agenda` | Public events list | Public discovery, must read from real `events` table once §14 schema extension lands; filters by city/category/age | Schema-drift between rich UI and 9-col stub; mock data risk | REDESIGN P1 |
| `/anniversaires` + `/organiser` | Discovery + booking flow UI | §13 booking flow against `anniv_packs`/`anniv_orders` (currently empty) | UI shell only, no data, no parental approval gate | REDESIGN P1 |
| `/carte-vip`, `/carte-vip/recompenses`, `/souscrire`, `/confirmation` | VIP card subscription pages | §10 family subscription tiers (Free/Silver/Gold/Platinum 🟢 LOCKED) | Tier names diverge (Starter/Pro/Elite/Family in code) — **rename mandatory** | REDESIGN P1 |
| `/devenir-partenaire` + `/inscription` | Partner application | §9 partner KYC flow with type wizard (retail/venue/club/education) | Sub-roles (coach/teacher) not surfaced; `partner_staff` not collected | REDESIGN P1 |
| `/devenir-ambassadeur` + `/programme` + `/candidature` | Ambassador application | §12 application + track picker (cash vs xp_only) | Track selector missing; routes currently redirect (role enum gap) | REDESIGN P1 |
| `/devenir-influenceur` + `/candidature` | Influencer application | Not in whitepaper — likely fold into ambassador track | Out of scope | DELETE P2 |
| `/clubs`, `/clubs/[slug]` | Static club directory | §9 venue-partner directory with offers + bookings | No live partner data wiring | REDESIGN P1 |
| `/djs`, `/djs/[id]`, `/djs/candidature` | DJ directory | Not in whitepaper | Out of canonical scope; could fold into events | DELETE P2 |
| `/blog`, `/galerie`, `/temoignages`, `/securite`, `/a-propos` | Static pages | Marketing only | Need light rebrand once design system lands | KEEP P2 |
| `/aide`, `/aide/faq` | Help / FAQ | Whitepaper has no help spec; build under §18 admin support | Currently static; needs ticket form into `support_tickets` | REDESIGN P2 |
| `/legal/cgu`, `/cgv`, `/cookies`, `/confidentialite`, `/mentions-legales` | Legal copy | §22 compliance — must reference CNDP, loi 09-08, escrow disclosure | Copy is generic; needs Moroccan compliance review | REDESIGN P1 |
| `/partenaires/merci` | Post-application thanks | Same | None | KEEP P2 |
| `/offline` | PWA offline fallback | §16 PWA — needs working SW + manifest | `/sw.js` and `/manifest.json` currently 404 | REDESIGN P0 |
| `/espace`, `/daily` | Hub fragments | Unclear intent vs `/teen` | Likely orphan; redirect to `/teen` or delete | DELETE P2 |

---

### 2. Teen zone (`/teen/*`) — most critical, 35 routes

| Route | Current | Intended (§) | Gap | Verdict / Priority |
|---|---|---|---|---|
| `/teen` | Dashboard pulling `getTeenDashboardData`, achievements, streak, "next best action" | §8 + §6 — must show **AvatarHero** greeting by name, daily quest carousel, twin-currency gauge, friend birthday banner if applicable | Avatar coach is just panda art, no greeting; no twin-currency gauge; daily quest tile is generic | REDESIGN P0 |
| `/teen/wallet` | Wallet hub showing XP + shop highlights, **coins hardcoded to 0** | §5 — XP gauge + **coin balance read from `user_coins`** + last 5 spends + cashback this month | `coins: 0` literal in code; pipeline broken end-to-end | REDESIGN P0 |
| `/teen/coins` | Likely duplicate of `/wallet` | Single canonical wallet | Consolidate | REPLACE → `/teen/wallet` P0 |
| `/teen/quests` | Unified quest hub via `getUnifiedQuests` | §6 — daily/weekly/monthly/seasonal/event tabs, cross-cadence stacking | Cron not wired so monthly quests unreachable; UI ready | REDESIGN P0 |
| `/teen/quests/[id]` | Quest detail + progress | §6 progress increments + completion fires achievement | Progress endpoint + cashback hook missing | REDESIGN P0 |
| `/teen/quiz` | Daily quiz hub | §7 — adapted to grade × school_type × language; avatar voiceover slot; recommended-for-you (3 cards) | Selection is `pool[dayIndex % length]`, identical for all teens; no school_type column | REDESIGN P0 |
| `/teen/quiz/[id]` | Quiz runner | Same; behavioral profile updates after each attempt | `behavioral_profiles` table empty, never written | REDESIGN P0 |
| `/teen/quiz/history` | Past attempts | Same | Likely OK once data flows | KEEP P1 |
| `/teen/defis-physiques` | Physical défis list | §3 + physical-challenges.md — proof upload → validator path | Honor-system only; private-bucket proof pipeline missing | REDESIGN P1 |
| `/teen/challenges` | Generic challenges | Quest-cadence consolidation §6 | Duplicate of `/teen/quests` — fold | REPLACE → `/teen/quests?tab=challenges` P1 |
| `/teen/games` | Mini-games | Not in whitepaper canonical | Possibly delete or move under quests | DELETE P2 |
| `/teen/shop` | Reward catalogue | §5 + rewards-economy — coin-priced (not XP-priced) items, hybrid items optional | Currently mixes XP-priced + coin-priced; needs §27 LOCKED 100 XP/DH gating | REDESIGN P0 |
| `/teen/shop/checkout` | Checkout for reward / event booking | §5 + §14 — debit `user_coins`, fire cashback, queue parental_approval if over ceiling | Hybrid checkout fails on missing `parental_approvals` table | REDESIGN P0 |
| `/teen/shop/history` | Past redemptions | Same; reads `coin_transactions` | Table empty; needs §5 plumbing | REDESIGN P0 |
| `/teen/rewards` | Reward catalog (older) | Likely duplicate of `/shop` | Consolidate | REPLACE → `/teen/shop` P1 |
| `/teen/aide-scolaire` | Academic hub | §15 — grades, tutors, education partners | Not yet wired to `teen_grades`; tutoring flow absent | REDESIGN P1 |
| `/teen/academic` | Older academic page | §15 same | Duplicate of `/aide-scolaire` | REPLACE P1 |
| `/teen/events` | Teen-filtered agenda | §14 discovery + booking | Schema drift; needs city/category/age filters wired | REDESIGN P1 |
| `/teen/calendar` | Teen calendar | Not separately specced — fold into agenda | Clarify intent | REPLACE → `/teen/events` P2 |
| `/teen/map` | Map of partner venues | §9 partner discovery | OK shell, needs real partner geodata | REDESIGN P2 |
| `/teen/friends` | Friends list | §17 — list + add by code/QR + parent visibility flag | Dual `friendships` shape unresolved; QR add absent | REDESIGN P1 |
| `/teen/circles` | Circles (5–10 close friends) | §17 — circles with group chat | Group chat surface missing | REDESIGN P1 |
| `/teen/social` | Generic social feed | Either fold into `/teen` dashboard or delete | Duplicate intent | DELETE / REPLACE P2 |
| `/teen/messages` | DM surface | Not canonically specced; likely circles chat | Consolidate into `/teen/circles` | REPLACE P2 |
| `/teen/leaderboard` | Leaderboard | §17 crews + global | Single board only; needs crew board variant | REDESIGN P1 |
| `/teen/achievements` | Achievements list | gamification.md | OK; needs unlock animation + avatar reaction | KEEP / polish P2 |
| `/teen/streak` | Streak detail | gamification.md | OK | KEEP P2 |
| `/teen/activity` | Activity feed | Notification log §16 | Should read `user_notifications` not bespoke table | REDESIGN P1 |
| `/teen/profile`, `/teen/profile/edit` | Profile + edit | §19 onboarding fields (school, grade, interests, language, avatar) | `school_type`, `curriculum`, `preferred_language` missing | REDESIGN P0 |
| `/teen/passions` | Interests onboarding subpage | §19 — fold into onboarding wizard | Standalone is unnecessary | REPLACE → `/onboarding` P2 |
| `/teen/settings` | Teen preferences | §16 notification preferences + §17 friend visibility | Notification preferences UI absent | REDESIGN P1 |
| `/teen/share` | Share-with-friends UI | §12 ambassador-teen track + §17 friend invite | Both flows collide here; split | REDESIGN P2 |
| `/teen/vip-card` | Teen view of family VIP card | §10 tier display | OK once tiers renamed | KEEP P2 |
| `/teen/xp-value` | XP-to-DH explainer | §5 + §27 LOCKED 100 XP/DH | Likely shows old 0.10 ratio — must be 100 XP/DH | REDESIGN P0 |
| **NEW** `/teen/avatar` | n/a | §8 customization (skin/color/title) | Whole route missing | NEW P1 |
| **NEW** `/teen/birthday` | n/a (only banner) | §13 — receive XP gift, view friend wishes | No standalone surface | NEW P2 |

---

### 3. Parent zone (`/parent/*`) — 14 routes

| Route | Current | Intended (§) | Gap | Verdict / Priority |
|---|---|---|---|---|
| `/parent` | Dashboard with FinancialOverview, ControlCenter, TeenCardEnhanced, ApprovalList, SmartInsights | §10 — KPI hero + linked teens grid + approval queue + tier badge + (if applicable) ambassador stub | Pulls from `parent_teens_overview` view OK; **approval queue is mock**, no push handoff | REDESIGN P0 |
| `/parent/topup` | Top-up page | §5 + §10 — package picker + tier discount + payment-method picker; writes to `payment_transactions` + `escrow_ledger` | Currently writes to `profiles.total_coins` (column doesn’t exist); PSP not wired | REDESIGN P0 |
| `/parent/history` | Spend history | §5 — table joining `coin_transactions` + `escrow_ledger` | Both tables empty; no escrow side | REDESIGN P0 |
| `/parent/approvals` | Approval queue | §11 — real queue with push handoff; multi-parent first-wins | `parental_approvals` table missing; auto-deny after 24h not implemented | REDESIGN P0 |
| `/parent/budget` | Per-teen ceilings + mode | §10 `teen_budget_limits` (autonomous vs validation) | Table missing; defaults wrong (should default to `validation` for new families per §27) | REDESIGN P0 |
| `/parent/teens` + `/parent/teens/add` | Linked teens grid + add by code | §10 + §19 — 6-digit linking codes, 24h TTL, single-use | `linking_codes` table missing | REDESIGN P0 |
| `/parent/e-signature` | E-sig flow (recently fixed for Next 16 async searchParams) | §10 — terms + CIN upload to **PRIVATE** bucket | Currently public bucket → **CNDP/loi 09-08 violation** | REDESIGN P0 |
| `/parent/documents` | Doc vault | §22 compliance — signed-URL access only | Probably reads public bucket | REDESIGN P0 |
| `/parent/notifications` | Inbox + prefs | §16 — preferences UI with channel toggles + quiet hours | Channel toggles incomplete; quiet hours missing | REDESIGN P1 |
| `/parent/grades` | Teen grades view | §15 — grades by teacher with parental approval gate above 200 XP | Approval gate missing | REDESIGN P1 |
| `/parent/events` | Events the teen booked | §14 + §11 (per-action approval for venue visits) | Approval gate missing | REDESIGN P1 |
| `/parent/live` | Real-time monitoring | Not canonically specced — could fold into dashboard | Clarify intent | DELETE / REPLACE P2 |
| `/parent/settings` | Parent prefs | §10 + §16 | Notification routing config absent | REDESIGN P1 |
| **NEW** `/parent/ambassador` | n/a | §12 — if parent is also ambassador, dashboard stub on `/parent` deep-links here | Missing | NEW P2 |

---

### 4. Partner zone (`/partner/*`) — 13 routes

| Route | Current | Intended (§) | Gap | Verdict / Priority |
|---|---|---|---|---|
| `/partner`, `/partner/dashboard` | KPI hero + offers + redemptions, with `PartnerAwaitingApproval` gate (passes Playwright) | §9 — KPI hero + redemptions feed + commission widget + offers manager + scanner button | Two pages doing same job; commission widget missing | CONSOLIDATE + REDESIGN P0 |
| `/partner/scanner` | **Mock** QR scanner | §9 — real QR scanner against `partner_transactions` + `event_check_ins` | Mock wired in dashboard too — strip from dashboard | REDESIGN P0 |
| `/partner/offers`, `/offers/new`, `/offers/[id]/edit` | Offer CRUD | §9 + §14 — offer + event lifecycle, draft → admin review → published | No admin review gate; no event subtype | REDESIGN P1 |
| `/partner/events` | Partner-side events | §14 — partner authoring per spec, `events` extension columns | Schema drift between rich UI and 9-col stub | REDESIGN P1 |
| `/partner/transactions` | Sales feed | §9 — `partner_transactions` with commission column | Commission column missing | REDESIGN P1 |
| `/partner/stats` | Analytics | §9 — KPIs + commission earned | OK shell | REDESIGN P2 |
| `/partner/payouts`, `/partner/invoices` | Payouts + invoices | §9 monthly cron `partner-payouts` | Cron missing | REDESIGN P1 |
| `/partner/kyc` | KYC submission | §9 — PRIVATE bucket, signed URLs 5min, RLS | Public bucket risk | REDESIGN P0 |
| `/partner/settings` | Partner prefs | §9 + §16 | OK | KEEP P2 |
| `/partner/support` | Help | §18 ticketing | Standalone OK | REDESIGN P2 |
| **NEW** `/partner/awards` | n/a | §9 + teacher-coach-xp.md — for `role IN ('coach','teacher')`: search teen, enter XP, attach evidence | **Whole feature missing — 0% built** | NEW P0 |
| **NEW** `/partner/staff` | n/a | §9 — `partner_staff` management (owner/staff/coach/teacher) | Missing | NEW P1 |
| **NEW** `/partner/anniversaires` | n/a | §13 — venue partners create `anniv_packs` | Missing | NEW P1 |

---

### 5. Ambassador zone (`/ambassador/*`) — 7 routes

| Route | Current | Intended (§) | Gap | Verdict / Priority |
|---|---|---|---|---|
| `/ambassador` | Dashboard reading `ambassadors`, `referral_codes`, `referral_usage` | §12 — filleuls list, commissions, share link, withdrawal CTA, tier (bronze/silver/gold) | Tables exist but role enum lacks `'ambassador'`; route redirects in production | REDESIGN P0 |
| `/ambassador/referrals` | Filleuls list | §12 + ambassador-referral.md | OK shell, needs `referral_attribution` table | REDESIGN P1 |
| `/ambassador/commissions` | Commissions view | §12 `ambassador_commissions` (pending/available/paid_out/clawed_back) | Table missing | REDESIGN P0 |
| `/ambassador/withdrawals` | Cash-out UI | §27 — bank transfer monthly, ≥ 200 DH threshold | `ambassador_payouts` table missing; cash track only | REDESIGN P1 |
| `/ambassador/marketing` | Asset library | §12 share link + QR + social packs | OK shell | KEEP P2 |
| `/ambassador/comment-gagner` | "How it works" | §12 explainer | OK | KEEP P2 |
| `/ambassador/boutique` | Ambassador-only shop | Not in canonical spec | Possibly delete | DELETE P2 |

---

### 6. Admin zone (`/admin/*`) — 19 routes

| Route | Current | Intended (§) | Gap | Verdict / Priority |
|---|---|---|---|---|
| `/admin` | Admin home | §18 | OK shell | KEEP P1 |
| `/admin/partners` | KYC queue + approval | §9 + §18 — KYC review with signed-URL fetch + commission rate adjustment + `admin_audit_logs` | No audit log row written | REDESIGN P0 |
| `/admin/ambassadeurs` | Ambassador KYC + tier | §12 + §18 | Tables missing | REDESIGN P0 |
| `/admin/utilisateurs` | User browser | §18 + §22 right-to-erasure + export | No anonymize/export endpoints | REDESIGN P1 |
| `/admin/analytics` | Platform metrics | §18 KPI dashboard | OK shell | KEEP P2 |
| `/admin/proofs` | Défi proof moderation | physical-challenges.md + §22 | Reads public bucket; should be private-bucket signed URL | REDESIGN P0 |
| `/admin/content` | AI content moderation | §7 + ai-content.md — `content_validations` review | OK shell, needs validator hook-up | REDESIGN P1 |
| `/admin/check-in` | Event check-in | §14 `event_check_ins` | OK shell | KEEP P1 |
| `/admin/anniversaires` + `/[id]` | Birthday party orders mod | §13 | OK | KEEP P1 |
| `/admin/clubs` + `/clubs/creer` + `/[id]/supprimer` | Clubs CRUD | §9 venue partners | Should be merged into `/admin/partners` | REPLACE P1 |
| `/admin/evenements` + `/creer` + `/[id]/modifier` + `/[id]/supprimer` | Events CRUD | §14 — admin moderation of partner-authored events | Partner authoring missing → admin doing all the work | REDESIGN P1 |
| `/admin/reservations` | Bookings list | §14 + §22 audit retention 7y | OK | REDESIGN P2 |
| `/admin/permissions` | Role/permission management | §18 `permissions JSONB` on `admin_roles` | Column missing | REDESIGN P1 |
| `/admin/logs` | Activity logs | §18 + §29 invariant 8 — `admin_audit_logs` for **every** admin action | Currently doesn’t cover everything | REDESIGN P0 |
| `/admin/scripts-sql` | Raw SQL exec | Dangerous; gate behind `super_admin` only or remove | Currently any admin | REDESIGN P0 |
| `/admin/gamification-setup`, `/gamification/scorecard` | Gamification ops | §6 + gamification.md | OK | KEEP P2 |
| **NEW** `/admin/moderation` | n/a | §18 unified `moderation_queue` (reports + AI content) | Missing | NEW P1 |
| **NEW** `/admin/refunds` | n/a | §18 + §22 audit | Missing | NEW P1 |
| **NEW** `/admin/broadcasts` | n/a | §18 + §16 push to all users | Missing | NEW P1 |
| **NEW** `/admin/audit-log` | n/a | Could merge with `/admin/logs` | Specced explicitly in §18 | NEW P1 |

---

### 7. Onboarding & auth

Routes: `/onboarding`, `/auth/login`, `/auth/sign-up`, `/auth/sign-up-success`, `/auth/confirm-email`, `/auth/redirect`, `/auth/error`, `/auth/validate-teen`.

| Route | Current | Intended (§) | Gap | Verdict / Priority |
|---|---|---|---|---|
| `/onboarding` | Single page | §19 — **router** that picks role-specific flow + checks `is_onboarded` | Single page can’t handle 6 role flows; no `is_onboarded` flag | REDESIGN P0 |
| `/auth/sign-up` | Generic signup | §19 — must capture role, set `raw_user_meta_data.role` so trigger creates `profiles` | Trigger missing on live DB → manual patches in tests | REDESIGN P0 |
| `/auth/login` | Login | OK | KEEP | KEEP P2 |
| `/auth/redirect` | Role router | §19 — `is_onboarded=false` → `/onboarding` | Missing flag → may loop | REDESIGN P0 |
| `/auth/validate-teen` | Teen validation by parent | §19 + linking codes | OK shell, table missing | REDESIGN P0 |
| `/auth/confirm-email`, `/sign-up-success`, `/error` | Static | KEEP | KEEP P2 |
| `/autorisations`, `/autorisations/ajouter` | Standalone "authorizations" UI | Probably duplicate of `/parent/approvals` | Consolidate | REPLACE P1 |
| `/notifications`, `/notifications/preferences` | Generic notifications | §16 — should be role-namespaced (`/parent/notifications`, `/teen/activity`) or shared layout | Duplication | REPLACE P1 |

---

### 8. Legacy `/gamification/*` — 9 routes

The whitepaper §6 mandates **one** quest hub at `/teen/quests`. Today there are **three** parallel quest surfaces.

| Route | Current | Verdict |
|---|---|---|
| `/gamification` | Hub | DELETE → redirect `/teen` |
| `/gamification/missions` | Mission list | DELETE → redirect `/teen/quests?tab=missions` |
| `/gamification/defis` | Daily défis | DELETE → redirect `/teen/quests?tab=daily` |
| `/gamification/defis-physiques` | Physical défis | DELETE → redirect `/teen/defis-physiques` |
| `/gamification/parcours` | Journey | DELETE → fold into `/teen/quests` |
| `/gamification/leaderboard` | Leaderboard | DELETE → redirect `/teen/leaderboard` |
| `/gamification/roue` | Wheel of fortune | DELETE — broken `wheel_streaks` trigger anyway (see §29 invariant break) |
| `/gamification/boutique` | Shop | DELETE → redirect `/teen/shop` |
| `/gamification/aide-scolaire` | Academic | DELETE → redirect `/teen/aide-scolaire` |
| `/gamification/crews` | Crews | DELETE → redirect `/teen/crews` (which itself doesn't exist yet — see NEW below) |
| `/gamification/collections` | Collections | DELETE or fold into `/teen/profile` |

**NEW** `/teen/crews` is required by §17 and is currently absent — only `/gamification/crews` exists.

---

## Cross-cutting components needed

These primitives recur across ≥ 3 zones and must ship before page rebuilds. Each maps to a whitepaper section.

| Component | Used by | Spec |
|---|---|---|
| `<AvatarCoach>` (sticky) | every `/teen/*` | §8 — bottom-right, mood states (idle/talking/celebrating/thinking), click expands message + CTA |
| `<AvatarHero>` (large) | `/teen` only | §8 — name greeting + suggested-quest-id |
| `<TwinCurrencyGauge>` | `/teen`, `/teen/wallet`, `/parent`, `/parent/topup`, `/parent/history` | §5 — XP gauge AND coin gauge side-by-side, never confused; tooltip explains "no conversion" |
| `<DefiCard>` | `/teen/quests`, `/teen/quests/[id]`, `/teen/defis-physiques`, `/teen/challenges`, `/parent` (sponsored) | §6 — unified card for daily/weekly/monthly/seasonal/event quests with cadence badge, expiry, progress |
| `<PartnerOfferTile>` | `/teen/shop`, `/teen/map`, `/agenda`, `/clubs/[slug]`, `/partner/offers` | §9 + §14 — coin-priced + cashback-preview |
| `<ParentSpendChart>` | `/parent`, `/parent/history` | §10 — DH spent + coins spent + cashback earned per teen, time-series |
| `<ApprovalQueue>` | `/parent`, `/parent/approvals` | §11 — list + decide one-tap; multi-parent first-wins indicator |
| `<NotificationBell>` (exists, redesign) | every authenticated layout | §16 — reads `user_notifications` not bespoke; quiet-hours indicator |
| `<LinkedTeensGrid>` | `/parent` | §10 — teen card + balance + last activity + quick approve |
| `<CrewLeaderboard>` | `/teen/crews`, `/teen/leaderboard` | §17 — pool-then-split allocation visualizer |
| `<TierBadge>` | `/parent`, `/teen/vip-card`, `/parent/topup` | §10 + §27 LOCKED Free/Silver/Gold/Platinum |
| `<EscrowReceipt>` | `/parent/topup` post-confirmation, `/parent/history` row detail | §5 — paired `payment_transactions`+`escrow_ledger` view |
| `<QRScanner>` | `/partner/scanner`, `/admin/check-in` | §9 + §14 — real device-camera, replace mock |
| `<PSPRailPicker>` | `/parent/topup` | §5 — Cash Plus / Wafacash / M2T / Stripe / CMI |
| `<XPCashbackToast>` | global teen layout | §5 — "+12 XP cashback" after every spend |
| `<EvidenceUpload>` | `/teen/defis-physiques`, `/partner/awards` | §22 — PRIVATE bucket signed URLs |
| `<LocaleSwitcher>` | global | §24 — fr-FR / fr-MA / ar-MA, no Darija for V1 |
| `<OnboardingRouter>` | `/onboarding` | §19 — picks flow by role + `is_onboarded` |

That's 18 cross-cutting components — all mandatory before page-by-page rebuild.

---

## Pages to delete (or already redirected)

Already redirected: `/gamification/*` (9 routes — see §8 above).

Recommended delete:
- `/teen/coins` → redirect `/teen/wallet` (duplicate)
- `/teen/challenges` → redirect `/teen/quests`
- `/teen/games` → out of scope
- `/teen/social` → fold into `/teen` dashboard
- `/teen/messages` → fold into `/teen/circles`
- `/teen/calendar` → redirect `/teen/events`
- `/teen/passions` → fold into `/onboarding`
- `/teen/academic` → redirect `/teen/aide-scolaire`
- `/teen/rewards` → redirect `/teen/shop`
- `/parent/live` → fold into `/parent` (or delete)
- `/devenir-influenceur*` → fold into ambassador (or delete)
- `/djs*` → out of canonical scope
- `/ambassador/boutique` → out of scope
- `/admin/scripts-sql` → restrict or remove
- `/espace`, `/daily` → orphans
- `/autorisations*` → consolidate into `/parent/approvals`
- `/notifications`, `/notifications/preferences` → namespace under `/parent/*` and `/teen/*`

---

## Pages to redesign — prioritized

### P0 (launch blockers — money, identity, compliance, core teen + parent loops)

Teen: `/teen`, `/teen/wallet`, `/teen/quests`, `/teen/quests/[id]`, `/teen/quiz`, `/teen/quiz/[id]`, `/teen/shop`, `/teen/shop/checkout`, `/teen/shop/history`, `/teen/profile`, `/teen/profile/edit`, `/teen/xp-value`.

Parent: `/parent`, `/parent/topup`, `/parent/history`, `/parent/approvals`, `/parent/budget`, `/parent/teens`, `/parent/teens/add`, `/parent/e-signature`, `/parent/documents`.

Partner: `/partner` + `/partner/dashboard` (consolidate), `/partner/scanner`, `/partner/kyc`, **NEW** `/partner/awards`.

Ambassador: `/ambassador`, `/ambassador/commissions`.

Admin: `/admin/partners`, `/admin/ambassadeurs`, `/admin/proofs`, `/admin/logs`, `/admin/scripts-sql` (lock down).

Public/auth: `/`, `/onboarding`, `/auth/sign-up`, `/auth/redirect`, `/auth/validate-teen`, `/offline`.

### P1 (vision coherence)

`/agenda`, `/anniversaires/*`, `/carte-vip/*` (tier rename), `/devenir-partenaire/*`, `/devenir-ambassadeur/*`, `/clubs*`, `/legal/*`, `/teen/defis-physiques`, `/teen/aide-scolaire`, `/teen/events`, `/teen/friends`, `/teen/circles`, `/teen/leaderboard`, `/teen/activity`, `/teen/settings`, `/parent/grades`, `/parent/events`, `/parent/notifications`, `/parent/settings`, `/partner/offers*`, `/partner/events`, `/partner/transactions`, `/partner/payouts`, `/partner/invoices`, `/ambassador/referrals`, `/ambassador/withdrawals`, `/admin/utilisateurs`, `/admin/content`, `/admin/check-in`, `/admin/clubs*`, `/admin/evenements*`, `/admin/permissions`. New routes: `/teen/avatar`, `/teen/crews`, `/teen/birthday`, `/partner/staff`, `/partner/anniversaires`, `/admin/moderation`, `/admin/refunds`, `/admin/broadcasts`, `/admin/audit-log`.

### P2 (polish)

`/blog`, `/galerie`, `/temoignages`, `/securite`, `/a-propos`, `/aide`, `/aide/faq`, `/teen/vip-card`, `/teen/streak`, `/teen/achievements`, `/teen/share`, `/teen/map`, `/partner/stats`, `/partner/settings`, `/partner/support`, `/admin/analytics`, `/admin/reservations`, `/admin/gamification-setup`, `/admin/gamification/scorecard`, `/ambassador/marketing`, `/ambassador/comment-gagner`.

---

## Component library gaps (design system level)

Beyond the 18 cross-cutting components, the design system itself is missing:

- **Color tokens for twin-currency UI**: distinct hue families for XP (effort/gold) vs Coins (spend/teal), so teens never confuse them. `--xp-*` and `--coin-*` token families.
- **Status badges for approval states**: `pending`, `approved`, `denied`, `expired`, `auto_denied` with a-11y-safe contrast (§11).
- **Status badges for payment states**: `pending`, `succeeded`, `failed`, `refunded` (§5).
- **Status badges for partner KYC**: `submitted`, `in_review`, `approved`, `rejected`, `suspended` (§9).
- **Spacing scale alignment**: dashboard shells (`components/dashboard/*`) use ad-hoc spacing — needs a 4/8/12/16/24/32 token grid.
- **Mood-state animation primitives** for `<AvatarCoach>`: 5 states (energetic / calm / curious / proud / encouraging) with reduced-motion fallback (§8).
- **Locale-aware number formatting**: `1 234 DH` (fr) vs `1٬234 درهم` (ar) — requires `Intl.NumberFormat` wrappers (§24).
- **RTL-ready layout shells** for `ar-MA` (§24). Currently all dashboards are LTR-hardcoded.
- **PWA install prompt component**: triggered on second visit, gated behind `notification_preferences.push_enabled` opt-in (§16, §25).
- **Quiet-hours-aware toast/push wrapper**: blocks push between 22h–7h Africa/Casablanca (§29 invariant 10).
- **Receipt pattern**: paired-row layout for `payment_transactions` + `escrow_ledger` (§5).
- **Provenance chip**: shows where an XP grant came from (quiz / défi / coach / birthday / cashback / ambassador) — used in `/teen/wallet`, `/parent/history`, `/admin/logs` (§28 glossary).

---

## Mobile vs desktop split

Per §25, **PWA-first** is the default. Native mobile is deferred. Therefore:

- **Teen surfaces are mobile-primary**: `/teen`, `/teen/wallet`, `/teen/quests`, `/teen/quiz`, `/teen/shop`, `/teen/friends`, `/teen/circles`, `/teen/crews`, `/teen/messages`, `/teen/events`, `/teen/map`, `/teen/defis-physiques`, `/teen/aide-scolaire`. The avatar coach is sticky-bottom-right on mobile, side-rail on desktop. Bottom tab bar on mobile (Quests / Wallet / Avatar / Friends / Profile).
- **Parent surfaces are bi-modal**: `/parent` and `/parent/topup` must work fast on mobile (parents approve from phone notifications), but `/parent/history`, `/parent/budget`, `/parent/grades`, `/parent/settings` benefit from a desktop tabular layout. Build mobile-first, progressively enhance to a 12-col grid at `lg:`.
- **Partner surfaces are desktop-primary** but `/partner/scanner` is mobile-only (camera). Build the scanner as a fullscreen mobile route, the rest as desktop dashboards with mobile compaction.
- **Ambassador surfaces are bi-modal**, share-link CTA must be mobile-first (clipboard + native share API).
- **Admin surfaces are desktop-only**. No mobile shell needed beyond responsive tables.

The four dashboard sidebars (`components/dashboard/{teen,parent,partner,ambassador}/sidebar.tsx`) all need a mobile drawer variant. The teen sidebar should be replaced entirely by a bottom tab bar on `< md` screens.

---

## Recommended build order

### Wave 1 — foundational components (≈2 weeks, no route work)

1. Color + spacing tokens; status badge family.
2. `<AvatarCoach>` + `<AvatarHero>` (§8) — even with template messages first, LLM later.
3. `<TwinCurrencyGauge>` (§5).
4. `<DefiCard>` (§6 unified shape).
5. `<NotificationBell>` redesign reading `user_notifications` (§16).
6. `<TierBadge>` with locked Free/Silver/Gold/Platinum naming (§10).
7. PWA `/sw.js` + `/manifest.json` + VAPID env wiring (§16) — unblocks push.
8. `<OnboardingRouter>` + `<PSPRailPicker>` + `<EscrowReceipt>` skeletons.

### Wave 2 — teen dashboard rewrite (≈3 weeks)

Routes: `/teen`, `/teen/wallet`, `/teen/quests` (+ `[id]`), `/teen/quiz` (+ `[id]`, `/history`), `/teen/shop` (+ `/checkout`, `/history`), `/teen/profile` (+ `/edit`), `/teen/xp-value`. Plus delete the `/gamification/*` family with redirects. Plus consolidate `/teen/coins`, `/teen/challenges`, `/teen/rewards`.

### Wave 3 — parent dashboard rewrite (≈3 weeks)

Routes: `/parent`, `/parent/topup`, `/parent/history`, `/parent/approvals`, `/parent/budget`, `/parent/teens` (+ `/add`), `/parent/e-signature` (move CIN to private bucket), `/parent/documents`. Plus `/onboarding` router + `/auth/redirect` + `/auth/sign-up` (capture role into `raw_user_meta_data`).

### Wave 4 — partner / ambassador / admin (≈3 weeks)

Partner: dashboard consolidation (`/partner` ↔ `/partner/dashboard`), real `/partner/scanner`, **NEW** `/partner/awards` (teacher/coach XP — biggest 0% gap), `/partner/kyc` private bucket, `/partner/staff`, `/partner/anniversaires`.

Ambassador: `/ambassador` (+ `/commissions`, `/withdrawals`, `/referrals`).

Admin: `/admin/partners`, `/admin/ambassadeurs`, `/admin/proofs`, `/admin/logs`, lock down `/admin/scripts-sql`, **NEW** `/admin/moderation`, `/admin/refunds`, `/admin/broadcasts`, `/admin/audit-log`.

### Wave 5 — public / marketing + i18n + RTL (≈2 weeks)

Routes: `/`, `/agenda`, `/anniversaires/*`, `/carte-vip/*`, `/devenir-partenaire/*`, `/devenir-ambassadeur/*`, `/clubs*`, `/legal/*`, `/aide*`, `/offline`. Add `<LocaleSwitcher>` and ar-MA RTL pass.

### Wave 6 — polish & teen long-tail (≈2 weeks)

`/teen/defis-physiques`, `/teen/aide-scolaire`, `/teen/events`, `/teen/friends`, `/teen/circles`, `/teen/crews` (NEW), `/teen/leaderboard`, `/teen/activity`, `/teen/settings`, `/teen/avatar` (NEW), `/teen/birthday` (NEW), `/teen/share`, `/teen/map`, `/teen/vip-card`, `/teen/streak`, `/teen/achievements`. Plus minor pages.

---

## Minor pages appendix

The following routes are not separately rebuilt; they inherit Wave 5 / Wave 6 templates: `/blog`, `/galerie`, `/temoignages`, `/securite`, `/a-propos`, `/aide`, `/aide/faq`, `/legal/cgu`, `/legal/cgv`, `/legal/cookies`, `/legal/confidentialite`, `/legal/mentions-legales`, `/partenaires/merci`, `/auth/sign-up-success`, `/auth/confirm-email`, `/auth/error`, `/admin/gamification-setup`, `/admin/gamification/scorecard`, `/admin/analytics`, `/admin/reservations`, `/admin/anniversaires/[id]`, `/admin/clubs/[id]/supprimer`, `/admin/evenements/[id]/supprimer`, `/admin/evenements/[id]/modifier`, `/admin/clubs/creer`, `/admin/evenements/creer`, `/partner/support`, `/partner/settings`, `/ambassador/marketing`, `/ambassador/comment-gagner`. Approximately 30 routes; collectively P2.

---

## Coverage summary

- **Routes enumerated**: ≈155 (all `app/**/page.tsx`).
- **Routes mapped to a whitepaper §**: 75+ in this matrix (above the 40-route minimum).
- **Cross-cutting components specified**: 18 (above the 8 minimum).
- **NEW routes required**: 11 (`/teen/avatar`, `/teen/crews`, `/teen/birthday`, `/partner/awards`, `/partner/staff`, `/partner/anniversaires`, `/admin/moderation`, `/admin/refunds`, `/admin/broadcasts`, `/admin/audit-log`, `/parent/ambassador`).
- **Routes recommended for delete/redirect**: 25+ (the entire `/gamification/*` family + duplicates listed above).
- **P0 redesigns**: 30 routes; **P1**: 50+; **P2**: 30+.

This map is the input to the wave-by-wave implementation plan; each wave's commit-gate snapshot must verify the relevant whitepaper §29 invariants before the next wave begins.
