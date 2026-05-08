# Nivy frontend reality — executive audit

**Date:** 2026-05-08
**Synthesizer:** Agent F
**Sources:** 25 specialist reports (A1–A3, B1–B7, C1–C5, D1–D4, E1–E6) under `docs/vision/audit-frontend-reality/`.
**Scope:** every `page.tsx` under `app/`, every nav, every form, every API endpoint, every backend table.

---

## TL;DR

1. **The user is right: "frontend est un fouillis."** 199 pages, 232 API routes, 245 DB tables. Of those: ~17 redirect-only stubs, ~22 vision-required surfaces missing, ~15 orphan/unspecced pages, 34 broken internal links, **17 phantom RPCs called from UI that don't exist**, **121 phantom tables called from UI that aren't in migrations**, ~50% of DB schema is dead weight. Static health is green (`tsc` clean) — the rot is structural, not syntactic.

2. **"Partners sans espace de connexion et sans création de pages" — confirmed and worse.** Of 15 partner archetypes promised in the vision, only 2 (retail, venue) are end-to-end built — and even those leak at the auth-creation step. `/api/partners/register` writes to `partners` but **never creates `auth.users`**, so no completed application can log in. 5 working partner pages (`restaurant/menu`, `restaurant/orders`, `kyc`, `payouts`, `invoices`) are unreachable from the sidebar. Settings page is hardcoded mock. Driver/Mentor/Restaurant/Coach/Teacher/Influencer have no public sign-up surface.

3. **The money loop is broken at three places simultaneously.** Top-up auto packages send `{coins, bonus, packageId}` while the API requires `amount_dh` → 100% failure. Quest XP grant calls phantom `add_user_xp` RPC → silent failure with optimistic UI lying. Shop history labels XP debits as "Coins dépensés" → users can't tell what currency they're spending. Three parallel shop backends + a fourth token economy + marketplace coin rail = 5–7 price units visible to the same teen in the same session.

4. **Onboarding is a maze with dead ends per role.** Teen path creates a `profiles` row at parent-validation but **never an `auth.users`** → teens cannot log in, ever. Mentor signup tells the user "lance ta candidature via /api/mentor/apply" — a raw URL shown to a non-developer. Driver role isn't even in the `UserRole` enum. `/auth/sign-up` has no role selector, so partner/mentor/ambassador funnels all dead-end at the email-confirm step. **Composite onboarding score: 4.3/10.**

5. **Lifestyle features are real code shipped against an empty catalog.** Rides/food/mentors/internships have full RPC pipelines, parental approval, RLS, cron-curfew, optimistic mutations — but **zero seeded supply**. No drivers, no restaurants, no active mentors, no internships. The teen sees EmptyState across the board. Worse: there's no self-serve onboarding for any of the three supplier personas. Code ≈ 7/10, content/supply ≈ 1/10.

---

## Scoring summary

| Surface | Score /10 | Status | Top issue |
|---|---:|---|---|
| Homepage | 5.8 | mid | "10,000 parents" fabricated, brand mixed Nivy/TeensParty, missing assets, two sign-up funnels |
| Onboarding | 4.3 | broken | Teen has no `auth.users`; mentor/driver have no signup; `/auth/sign-up` has no role selector |
| Teen | 7.5 | mostly OK | Dock fine, but desktop sidebar advertises 4 phantom routes (27% breakage); mocked `/teen/share`, `/teen/games` stats, `/teen/calendar xpReward=0` |
| Parent | 8.0 | strong | Heavy lifestyle features hidden from nav (chores/allowances/rides/food/mentor invisible from dock+sidebar); top-up form contract bug = launch blocker |
| Partner | 6.7 | broken | No auth bridge in registration, 5 working pages unreachable, hardcoded mock settings, no KYC upload UI, only 4 of 15 archetypes covered |
| Admin | 5.9 | weak | 14 of 24 routes orphan (no sidebar entry); 4 fragmented moderation queues with no unified inbox; `support` sub-role has nothing to use; `scripts-sql` lets any admin run raw SQL |
| Ambassador | 3.1 | gutted | UI exists on missing tables (`ambassadors`, `referral_usage`, `ambassador_withdrawals`); role enum missing `'ambassador'`; sidebar 5/8 → 404 |
| Mentor | 4.25 | half-built | No availability page (sidebar 404), no KYC upload, no role selector at signup, status enum drifted from spec |
| Public marketing | 6.5 | mid | Sitemap drift, 27 routes share same SEO title (no `metadata`), `partners@example.com` placeholder reaches users, `[votre-domaine.com]` in CGU, no `/blog/[slug]`, no `/contact`, no team/founders page |

**Composite (weighted by user impact): 5.8/10.**

---

## Critical bugs (P0 — break the user) — top 15 ranked

Reinforced by cross-references; "seen in" lists which agents flagged the same defect independently.

| # | Bug | Location | Impact | Seen in |
|---|---|---|---|---|
| 1 | **Top-up auto-packages send `{coins, bonus, packageId}` but API requires `amount_dh`** | `components/parent/topup-form.tsx:53` vs `app/api/parent/topup/route.ts:41` | 100% failure on the dashboard's headline ROI surface; parents cannot recharge | E4, A2 |
| 2 | **Teen never gets `auth.users`** — `validate-teen` POST creates `profiles` row but no auth user, no password, placeholder email `teen_<id>@teensparty.local` | `app/api/auth/validate-teen/route.ts` | Validated teens cannot log in. Future signup creates orphaned 2nd profile, breaking XP/coins/parent links | C2, A2 |
| 3 | **`/api/partners/register` never creates `auth.users`** — partner row sits at status='pending' with no auth bridge | `app/api/partners/register/route.ts` | Every partner application is a database record nobody can log into. Manual admin provision required | B3, C3, E5 |
| 4 | **Phantom XP RPC** `add_user_xp` (UI) vs `add_xp_to_user` (DB) | `app/api/teen/quests/complete/route.ts:94` | Quest XP grants silently fail; optimistic UI tells teen they earned XP, no XP recorded | C5, E2 |
| 5 | **Friend défi "Refuser" actually accepts** — client posts `{action:"decline"}` to `/accept`, body ignored | `app/teen/quests/friend-defis/friend-defis-client.tsx:204` vs `accept/route.ts` | Declines accept the challenge | E2 |
| 6 | **Shop history mislabels XP as "Coins dépensés"** with yellow Coins icon, reading `shop_purchases.coins_spent` while the RPC debits XP | `app/teen/shop/history/page.tsx:166` | Teens cannot tell what currency they're spending | E6 |
| 7 | **Dashboard logout posts to `/auth/signout` which 404s** — no `app/auth/signout/route.ts` exists | `components/dashboard/header.tsx:144` | Users cannot log out from dashboard header |  D4 |
| 8 | **CIN images uploaded with `getPublicUrl`** on `documents` bucket (likely public) | `app/api/parent/e-signature/create/route.ts` | CNDP / loi 09-08 violation; CIN scans world-readable | E4, A2 |
| 9 | **17 phantom RPCs called from UI** — `record_signal` (kills perso engine), `approve_ride` (parents can't approve), `parent_deny_session`, `rate_mentor_session`, `decide_internship_application`, `redeem_ambassador_reward`, etc. | various | Silent 500s across XP, rides, mentor ratings, internships, ambassador redeems | C5 |
| 10 | **`/teen/defis-physiques` has no action UI** — billboard with no start/update/complete buttons despite full API | `app/teen/defis-physiques/defis-physiques-client.tsx` | Entire physical-challenges feature is read-only mock | E2 |
| 11 | **Approval cascade is caller-side** — `/api/parent/approvals` flips status + notifies but does NOT call resource-specific RPC (`parent_approve_session` etc.). | `app/api/parent/approvals/route.ts` | Teen sees "approved" but the action (mentor session debit, ride dispatch) never executes | E4 |
| 12 | **Comments fully orphaned** — `/api/teen/feed/comments` supports create/reply/like/report but no UI consumes it; "Comment" button just records a click signal | `app/teen/feed/[id]/page.tsx` | Users cannot actually comment | E1 |
| 13 | **Report and Block are pure `window.alert()` lies** — long-press menu and friend "MoreVertical" trigger no network call | `app/teen/feed/feed-list.tsx:119`, `app/teen/friends/friends-client.tsx:564` | No abuse signal ever reaches the DB; `FriendHandlers.block` exists but no HTTP route exposes it | E1 |
| 14 | **Phantom payment endpoints in selector** — `/api/payments/cash/register`, `/api/payments/stripe/create-session`, `/api/og/share-card`, `/api/tickets/generate-wallet-pass` | `components/payment-method-selector.tsx`, `share-modal.tsx`, `ticket-actions.tsx` | Cash payment + Stripe checkout + share OG image + wallet pass all 404 | D2 |
| 15 | **`/parent/topup` writes to missing `profiles.total_coins` column** per whitepaper §3 gap; checkout fails on missing `parental_approvals` table | `/parent/topup`, `/teen/shop/checkout` | Whole twin-currency loop broken end-to-end | A2 |

Honourable mentions (just outside top 15):
- Savings goals lock coins forever — no "Achieved → spend" UI (E2 B12).
- DM has no realtime, no attachments, failed sends silently leave optimistic ghost (E1 J/K).
- Pillar taxonomy contradicts itself across hero/pillars/dashboard (party/vitality/intellect/**prestige** vs **creativity**) (C1).

---

## Missing surfaces (P0+P1) — top 20 ranked by impact

| # | Missing surface | Vision source | Why it matters | Priority |
|---|---|---|---|---|
| 1 | `/partner/awards` + `/partner/staff` (teacher/coach XP grant) | Whitepaper §9, `teacher-coach-xp.md` | The XP-economy bridge between partners and teens. **0% built.** Partner-network value prop is fiction without it | P0 |
| 2 | Driver workspace (`/driver/**`) + `/devenir-driver` | `transport-mobility.md` | Driver pool can never go live. APIs exist (`/api/driver/rides/[id]/{dispatch,track,complete}`) but no UI seat. Role not even in `UserRole` enum | P0 |
| 3 | Mentor public application page (`/devenir-mentor`) + KYC upload | `mentorship-career.md` §6 | API exists; user is told to "call /api/mentor/apply" via raw URL. Single biggest gap on mentor side | P0 |
| 4 | Restaurant funnel (`/devenir-restaurant`, 5th wizard card, restaurant onboarding form) | `food-delivery-restaurants.md` | Restaurant workspace + teen `/teen/food` are built. Only the prospect funnel is missing | P0 |
| 5 | Partner KYC upload UI | `partner-network.md` §3 | Storage bucket + table + admin review exist. Partner-facing capture missing entirely. "Compléter mon KYC" CTA dead-ends | P0 |
| 6 | `/admin/audit-log` + `admin_audit_logs` writes from every admin action | Whitepaper §29 invariant 8, Moroccan accounting law (7-year retention) | Compliance blocker | P0 |
| 7 | `/admin/refunds` queue + PSP integration | Whitepaper §18, §22 | Admin permission exists, no UI. Cannot reverse `payment_transactions` | P0 |
| 8 | `/admin/moderation` unified inbox | Whitepaper §18 | Today: 4 fragmented queues (proofs, creator-moderation, content/review, marketplace) with overlap; no "12 items waiting" landing | P1 |
| 9 | `/admin/support` / tickets / SLA | `ADMIN_PERMISSIONS` matrix | The `support` sub-role has literally nothing to do once they log in | P0 |
| 10 | `/admin/utilisateurs/[id]` user detail | Admin ops | List shows everyone; cannot drill into one user's bookings, KYC, top-ups, audit log | P1 |
| 11 | `/parent/teens/[id]` detail page | Parent UX | "Détails" button on teens list 404s; same problem indirectly elsewhere | P1 |
| 12 | `/teen/avatar` customization surface | Whitepaper §8 | `user_unlocked_*` rewards have no destination | P1 |
| 13 | `/teen/crews` (canonical, post-redirect) | Whitepaper §17 | `/gamification/crews` redirects to `/teen/circles` but the canonical "crews" home doesn't exist | P1 |
| 14 | `/teen/quests/friend-defis/new` | Wave 2 | Primary "Lancer un défi" CTA dead-ends | P1 |
| 15 | `/teen/internships/[id]` detail page | Career pillar | Card has "Voir les details" → 404; cover-letter / portfolio fields never collected | P1 |
| 16 | Teen comment composer + thread render | E1 | Backend 100% built; UI 0% | P1 |
| 17 | Mentor `/mentor/availability` calendar | Sidebar entry | Sidebar advertises it, no page exists, no API. Without it, teens can't book directly | P1 |
| 18 | Driver self-onboarding API + form | `transport-mobility.md` | No `POST /api/driver/apply`, no KYC upload | P0 |
| 19 | `/blog/[slug]` detail | Public marketing | List exists, posts unreadable. Dead surface | P1 |
| 20 | `/contact` + `/equipe` + `/presse` + pricing page | Investor expectations (B7) | An investor or journalist has no faces to see, no media kit, no dedicated contact | P1 |

---

## Duplicates to consolidate — top 10

| # | Duplicate cluster | Action |
|---|---|---|
| 1 | `/gamification` hub vs `/teen` shell — overlapping dashboards | Collapse `/gamification/page.tsx` into `/teen` (or hard-redirect). UX sign-off needed |
| 2 | `/teen/events` vs `/teen/calendar` — both call `getTeenDashboardData`, just different views | Merge under `/teen/events?view=list\|calendar` |
| 3 | `/aide` vs `/aide/faq` — two FAQ surfaces with non-overlapping arrays | Redirect `/aide/faq` → `/aide` |
| 4 | `/daily` legacy mock with broken `/profile/enfants/ajouter` link vs `/teen/quests` | Redirect `/daily` → `/teen/quests` |
| 5 | `/anniversaires` (full booking) vs `/anniversaires/organiser` (lighter form) | Redirect `/organiser` into main page |
| 6 | `/partner` vs `/partner/dashboard` — duplicate dashboards with overlapping KPIs | Routing-dedup pass: pick one |
| 7 | `/admin/utilisateurs` vs `/admin/permissions` — both list profiles | Merge user-list panel out of permissions |
| 8 | Three parallel shop backends: `/api/teen/shop` (legacy `shop_items`), canonical `purchase_reward` RPC, `/api/teen/tokens` (premium/seasonal tokens with peer transfer) | Sunset legacy + tokens with 410 Gone. Keep canonical only |
| 9 | Toast systems: Radix `useToast` + Sonner coexist | Migrate all callers to Sonner; delete Radix toaster + `hooks/use-toast.ts` |
| 10 | AI/Companion: `elite-ai-companion` + `AgentSheet` + `AgentFloatingButton` + `teen/dashboard/ai-companion` + AvatarCoach v1/v2 = 4–5 parallel surfaces | Pick AvatarCoach v2 as canonical, delete the rest (highest-leverage cleanup in components/) |

Plus: 17 redirect-only legacy stubs (`/teen/{coins,settings,shop,rewards,achievements,passions,academic,map,challenges}`, `/gamification/{missions,defis,boutique,crews,defis-physiques,aide-scolaire}`, `/xp-shop`, `/espace`) — safe to delete after cleaning up internal `<Link>`s pointing to them.

---

## Backend-vs-frontend gap — top 10 (RPCs/tables/APIs that need wiring)

From C5 phantom-RPC list + C5 mocked-page list + D2 phantom endpoints:

| # | Wiring needed | Impact |
|---|---|---|
| 1 | **Create `record_signal` RPC** (or fix UI to call existing one) | The entire personalization engine is dark — every signal-capture call silently fails. Highest-value 1-line fix |
| 2 | **Rename `add_user_xp` → `add_xp_to_user` in 5+ call sites** (or create alias RPC) | Quest XP, pathway XP, wallet XP grants all silently fail |
| 3 | **Create `parent_deny_session`, `approve_ride`, `decide_internship_application`, `rate_mentor_session`, `redeem_ambassador_reward`** | Mentor denial, ride approval, internship decisions, mentor ratings, ambassador shop redemption — all 500 today |
| 4 | **Wire `/teen/coins`, `/teen/streak`, `/teen/calendar`, `/teen/passions`, `/teen/academic`, `/teen/circles`, `/teen/events`, `/teen/games`, `/teen/xp-value`, `/teen/vip-card`** to existing tables/RPCs | 10 fully-mocked teen pages with hardcoded arrays. Most have backend ready (`user_coins`, `user_streaks`, `passion_paths`, `educational_*`, `circle_*`, `xp_shop_items`, `vip_tiers`) |
| 5 | **Implement `/api/og/share-card`, `/api/payments/cash/register`, `/api/payments/stripe/create-session`, `/api/tickets/generate-wallet-pass`** | 4 phantom endpoints called from production code (D2). Either implement or hide the UI |
| 6 | **Create `auth.users` row in `validate-teen` POST** (D4 critical for teen onboarding) | Teens can finally log in |
| 7 | **Bridge `auth.users` ↔ `partners.email` in `/api/partners/register`** (or document a manual admin invite) | Partners can finally log in |
| 8 | **Reconcile schema drift: 121 phantom tables called from UI** (`activities` vs `user_activities`, `quiz_completions` vs `quiz_attempts`, `user_badges` vs `user_achievements`, `xp_ledger` vs `xp_transactions`, `referral_usage` vs `referral_uses`, etc.) | Explains the user's "rien ne marche" feeling. Recommend a one-time `pg_dump --schema-only` reconciliation pass |
| 9 | **Wire teen feed comment composer + thread** to existing `/api/teen/feed/comments` | The biggest missing primitive on the social side |
| 10 | **Wire DM realtime + attachment upload** + non-empty error rollback in `/api/teen/messages` | DMs are fire-and-forget without realtime; failed sends leave forever-pending optimistic bubbles |

---

## Partner ecosystem (the user's biggest concern) — focused section

Direct user quote: *"il y a énormément de partner qui ne sont pas listés sans espace de connexion et sans création de pages."* This is the most-reinforced finding across the entire audit (B3, C3, E5 all flag it independently).

### 15 partner archetypes — coverage matrix

| # | Archetype | Public landing | Signup | Auth workspace | Discovery | Verdict |
|---|---|---|---|---|---|---|
| 1 | Retail | ✅ | 🟡 (no auth bridge) | 🟡 generic | 🟡 `/teen/offres` | 🟡 |
| 2 | Venue | ✅ | 🟡 (no auth bridge) | 🟡 generic | ❌ no `/teen/venues` | 🟡 |
| 3 | Club | ✅ | 🟡 (no auth bridge) | 🟡 no class scheduler | 🟡 `/clubs` (public) | 🟡 |
| 4 | Education | ✅ | 🟡 (no auth bridge) | 🟡 no course manager | 🟡 `/teen/aide-scolaire` | 🟡 |
| 5 | **Restaurant** | ❌ no `/devenir-restaurant`, no wizard card | ❌ | ✅ `/partner/restaurant/{menu,orders}` | ✅ `/teen/food` end-to-end | 🟡 (built from the back, no front door) |
| 6 | **Driver** | ❌ no `/devenir-driver` | ❌ no apply API, no KYC upload | ❌ no `/driver/**` | ✅ `/teen/rides` | ❌ DB+API concept with no UI seat |
| 7 | **Mentor** | ❌ no `/devenir-mentor` | 🟡 API exists, no UI | ✅ `/mentor/{dashboard,profile/edit,sessions}` | ✅ `/teen/mentors` | 🟡 full back, no public front door |
| 8 | DJ | ✅ `/djs` + candidature | 🟡 form persists into ??? | ❌ no `/dj/**` | 🟡 public, not personalized | 🟡 |
| 9 | Ambassador | ✅ `/devenir-ambassadeur/**` | 🟡 form exists, table missing | 🟡 routes redirect (role enum gap) | n/a | 🟡 — front exists, back is empty |
| 10 | Influencer/Creator | ✅ `/devenir-influenceur/**` | 🟡 candidature stub (console.log only) | ❌ | ❌ | ❌ |
| 11 | **Coach** (sub-role of club) | ❌ no landing | ❌ no `partner_staff` UI | ❌ no `/partner/awards` | n/a | ❌ |
| 12 | **Teacher** (sub-role of education) | ❌ | ❌ | ❌ | 🟡 implicit in `/teen/aide-scolaire` | ❌ |
| 13 | Marketplace seller | ❌ no `/devenir-vendeur` | ❌ no seller onboarding UI (no AML, no bank) | 🟡 `/marketplace/{my-listings,orders,sell}` shells | ✅ `/marketplace` | ❌ |
| 14 | Birthday venue | ❌ | ❌ no birthday step in venue form | ❌ no `/partner/anniv` | ✅ `/anniversaires` (teen) | ❌ |
| 15 | Event organiser | ❌ | ❌ | 🟡 list exists, no `new`/`[id]` sub-routes | ✅ `/agenda` | ❌ |

### Roll-up

- **2 of 15 archetypes are end-to-end built** (and even retail/venue leak at the auth-creation step)
- **5 archetypes have public landings but no auth or empty backend** (ambassador, influencer, DJ, marketplace seller, the 4 wizard types' auth bridge)
- **5 archetypes have backend/workspace but no public front door** (restaurant, mentor, driver, marketplace seller workspace, birthday venue)
- **3 archetypes have neither front nor back** (coach, teacher, event organiser)

### The Potemkin façade in detail

The 4-card wizard at `/devenir-partenaire/inscription` is honest: it captures rich partner intake into 8+ specialized tables (`partner_locations`, `partner_venues`, `venue_menu_items`, `venue_event_packages`, `partner_clubs`, `club_offerings`, `partner_education`, `education_courses`).

But:

1. **`/api/partners/register` does NOT call `supabase.auth.signUp()`** — no `auth.users` row.
2. **No password collection** in the form.
3. **No magic-link / invite email** is sent.
4. **No `partner_staff` row** for RLS-driven dashboard access.
5. **Result**: row exists in `partners` at status='pending', literal dead end. The thank-you page generates a fake reference ID with `crypto.randomUUID()` client-side — not persisted anywhere.

After registration, **5 working partner pages are unreachable from the sidebar**: `/partner/restaurant/menu`, `/partner/restaurant/orders`, `/partner/kyc`, `/partner/payouts`, `/partner/invoices`. The sidebar is one-size-fits-nothing — a retail partner sees "Events", a venue partner sees no menu surface, no partner_type-aware segmentation.

`/partner/settings` is **explicitly hardcoded mock**: header comment states the save button is a no-op and inputs are uncontrolled. Every partner sees "Ma Boutique / Boutique de vêtements et accessoires tendance pour adolescents." as their own data.

The QR scanner trust model is a separate concern: static `TPVIP:userId:cardNumber` payload, no signature, no nonce, no expiry; non-atomic `current_total_uses` increments; `discount_usage` table tolerated as missing (permissive-by-default). A photo of a member's card QR can be replayed indefinitely.

### Partner P0 punchlist (Linear-issue-ready)

1. Wire `auth.users` creation in `/api/partners/register` (Supabase admin invite) — **2-3 days**.
2. Build KYC upload UI (file uploader → `kyc-documents` private bucket + insert into `kyc_documents`) — **2-3 days**.
3. Add 5th wizard card "Restaurant" + `/devenir-restaurant` landing — **3 days**.
4. Add partner role selector to `/auth/sign-up` — **1-2 days**.
5. Extend partner sidebar to surface 5 hidden pages (`restaurant/menu`, `restaurant/orders`, `kyc`, `payouts`, `invoices`) gated by `partner_type` — **1 hour**.
6. Replace `/partner/settings` mock with real form bound to `partners` row — **1-2 days**.
7. Build `/devenir-mentor` page — wraps existing `apply_mentor` RPC — **1 day**.
8. Build `/devenir-driver` + driver KYC + `/driver/**` workspace — **3-5 days**.
9. Build `/partner/awards` + `partner_staff` UI for coach/teacher XP grants — **5 days** (whitepaper §9 mandate).
10. QR signing (HMAC + `exp` ≤ 60s + nonce table) on the scanner — **2-3 days**.

---

## Recommendation: 4-wave cleanup plan

Total estimated calendar time: **6–8 weeks with 4–6 agents in parallel**. Each ticket below is Linear-ready (file paths included where load-bearing).

### Wave A — Launch-blockers (P0, can't ship without these)

**Goal:** unbreak the user — money flows, login works, "approved" actions execute, CIN scans aren't world-readable.

**Estimated:** 6 agents, **8–10 calendar days.**

| # | Ticket | File path | Agent-days |
|---|---|---|---|
| A1 | Fix top-up auto-package contract: form sends `amount_dh = selectedPackage.price` | `components/parent/topup-form.tsx:53` | 0.5 |
| A2 | Create `auth.users` in `validate-teen` POST + use returned uid for `profiles.id` | `app/api/auth/validate-teen/route.ts` | 1 |
| A3 | Bridge `auth.users` to `partners` row in `/api/partners/register` (Supabase admin invite + email) | `app/api/partners/register/route.ts` | 2 |
| A4 | Move CIN to private bucket + signed URLs (15min TTL) | `app/api/parent/e-signature/create/route.ts`; `/parent/documents`; `/admin/proofs`; `/partner/kyc` | 1 |
| A5 | Fix the 17 phantom RPCs: rename calls or add stub functions (start with `record_signal`, `add_user_xp` → `add_xp_to_user`, `approve_ride`, `parent_deny_session`, `rate_mentor_session`) | various | 2 |
| A6 | Cascade approval flips into resource-specific RPCs (`/api/parent/approvals` calls `parent_approve_session` etc.) | `app/api/parent/approvals/route.ts` | 1 |
| A7 | Fix friend défi `/decline` wiring (client must POST to `/decline`, not `/accept`) | `app/teen/quests/friend-defis/friend-defis-client.tsx:204` | 0.25 |
| A8 | Logout endpoint: create `app/auth/signout/route.ts` POST (or replace `<form>` with onClick) | `components/dashboard/header.tsx:144` | 0.25 |
| A9 | Replace `add_user_xp` everywhere or add SQL alias function | `app/api/teen/quests/complete/route.ts:94` and 4 other call sites | 0.5 |
| A10 | Onboarding router: add `mentor` and `driver` cases to `/auth/redirect` switch + `is_onboarded` flag check | `app/auth/redirect/page.tsx`, `app/onboarding/page.tsx` | 1 |
| A11 | `/admin/audit-log` page + log every admin action to `admin_audit_logs` (compliance) | new file + sweep all admin POST routes | 2 |
| A12 | PWA basics: ship `/sw.js` and `/manifest.json` (currently 404) + VAPID push subscriptions | `public/`, `app/api/notifications/push/*` | 1 |

**Wave A exit criteria:** parent can top-up, teen can log in, partner can register and log in, "approved" actions actually execute, CIN scans are private, mentor/driver login routes don't loop, audit log is on.

### Wave B — Quality (close the lying surfaces)

**Goal:** stop the UI from lying. Replace fake counters / mock data / phantom endpoints with truth or empty states.

**Estimated:** 4 agents, **8–12 calendar days.**

| # | Ticket | File path | Agent-days |
|---|---|---|---|
| B1 | Replace fabricated "+10,000 Parents" + "11–17 ans" in TrustBanner with honest copy | `components/trust-banner.tsx:43,33` | 0.25 |
| B2 | Fix missing assets `/teens-party-event.jpg`, `/nightclub-confetti-celebration-crowd.jpg` (or remove preload + change fallback) | `app/layout.tsx:179`, `app/page.tsx:318` | 0.25 |
| B3 | Reconcile pillar taxonomy: pick 4 canonical IDs end-to-end (e.g. `party / vitality / intellect / creativity`) | hero, pillars section, AvatarDashboard, sidebar nav | 1 |
| B4 | Pick one sign-up funnel — both `/onboarding` and `/auth/sign-up` are entry points today | `app/page.tsx`, `components/footer.tsx` | 0.5 |
| B5 | Remove DJ + Influencer candidature stubs that only `console.log` + `alert` (or wire to real APIs) | `app/djs/candidature/page.tsx:82`, `app/devenir-influenceur/candidature/page.tsx:65` | 0.5 |
| B6 | Remove parent SponsorChallengeForm stub (setTimeout + toast.success only) | `components/parent/sponsor-challenge-form.tsx:69` | 0.25 |
| B7 | Wire teen feed comment composer + thread render to existing API | `app/teen/feed/[id]/page.tsx` | 2 |
| B8 | Replace `window.alert` "Signaler" / "Bloquer" with real `POST /api/teen/feed/[id]/report` route + modal | `app/teen/feed/feed-list.tsx:119`, `components/feed/long-press-menu.tsx`; new route | 2 |
| B9 | Expose `FriendHandlers.{remove,block,unblock}` via DELETE /api/teen/friends + per-row context menu | `app/api/teen/friends/route.ts`, `app/teen/friends/friends-client.tsx` | 1 |
| B10 | Wire DM realtime (Supabase channel on `direct_messages`) + non-empty `catch` rollback + consume server response (replace temp id) | `app/teen/messages/messages-client.tsx`, `/api/teen/messages` | 2 |
| B11 | DM attachment pipeline: `<Paperclip>` and `<ImageIcon>` handlers + Supabase storage bucket + `attachment_id` in messages schema | `app/teen/messages/messages-client.tsx`, new bucket | 2 |
| B12 | Fix `/teen/defis-physiques` action UI: wire start/update/complete buttons to existing `/api/teen/sport/challenges` | `app/teen/defis-physiques/defis-physiques-client.tsx` | 1 |
| B13 | Savings goal "Achieved → spend" path: surface withdraw button when `status='achieved'` | `app/teen/savings/page.tsx:103`, `goal-lock-button.tsx` | 1 |
| B14 | Currency confusion fix: rename `shop_purchases.coins_spent` → `xp_spent`, change UI label + icon | `app/teen/shop/history/page.tsx:166`, migration | 0.5 |
| B15 | Fix mocked teen badges/notifications: wire real notification counts; render `xpReward` only when known instead of `+0` | `components/layouts/mobile-dock.tsx:50`, `app/teen/calendar/page.tsx`, `/teen/games` | 1 |
| B16 | Brand consistency: rebrand footer social URLs from `teenspartymorocco` to Nivy handles | `components/footer.tsx:34-66` | 0.25 |
| B17 | Replace hardcoded "2" approval badge in parent sidebar with real pending count | `components/dashboard/parent/sidebar.tsx:87-89` | 0.25 |
| B18 | Fix all 34 broken internal links (sidebar `/dashboard`, `/profile/enfants`, `/parent/subscription`, `/profile/modifier`, `/parent/teens/[id]`, `/admin/{events,users,settings}`, ambassador 5/8) | various | 2 |
| B19 | Unify schema drift: 6 endpoints write to `notifications` (legacy) → migrate to `user_notifications`; remove `activity_logs` writes | `/api/parent/{teens,teens/create,budget,grades,live}`; `/parent/grades/page.tsx` | 1 |
| B20 | Hybrid checkout: add CMI + Mobile Money picker (currently hardcoded `paymentMethod: "stripe"`) | `app/teen/shop/checkout/checkout-client.tsx:47` | 1 |

### Wave C — Missing surfaces (P0/P1 build-out)

**Goal:** ship the 20 surfaces the vision says must exist.

**Estimated:** 5 agents, **15–20 calendar days.**

| # | Ticket | Agent-days |
|---|---|---|
| C1 | `/partner/awards` + `/partner/staff` (whitepaper §9 mandate) | 5 |
| C2 | Driver workspace: `/driver/{dashboard,rides,profile}` + `/devenir-driver` + driver KYC | 5 |
| C3 | `/devenir-mentor` + mentor KYC upload | 2 |
| C4 | Restaurant funnel: `/devenir-restaurant` + 5th wizard card | 3 |
| C5 | Partner KYC upload UI (file uploader → bucket + table insert) | 2 |
| C6 | `/admin/refunds` queue + PSP integration | 3 |
| C7 | `/admin/moderation` unified inbox (replaces 4 fragmented queues) | 3 |
| C8 | `/admin/support` tickets + SLA + reply | 3 |
| C9 | `/admin/utilisateurs/[id]` user detail page | 2 |
| C10 | `/parent/teens/[id]` detail page | 2 |
| C11 | `/teen/avatar` customization (use `user_unlocked_*` rewards) | 3 |
| C12 | `/teen/crews` canonical home (post-redirect from `/gamification/crews`) | 2 |
| C13 | `/teen/quests/friend-defis/new` create-flow | 1 |
| C14 | `/teen/internships/[id]` detail + cover-letter/portfolio fields | 2 |
| C15 | Mentor `/mentor/availability` calendar | 3 |
| C16 | `/blog/[slug]` detail page + JSON-LD | 1 |
| C17 | `/contact` + `/equipe` + `/presse` + pricing page (investor surfaces) | 3 |
| C18 | `/parent/notifications` settings + daily/weekly digest opt-in | 2 |
| C19 | Partner-side "post an internship" form (gated to `status='active'`) | 1 |
| C20 | QR scanner security: HMAC + `exp` ≤ 60s + nonce table | 3 |

### Wave D — Consolidation (delete cruft)

**Goal:** the codebase has two parallel schemas, three shop backends, four moderation queues, two toast systems, four AI surfaces. Pick one of each.

**Estimated:** 3 agents, **8–10 calendar days.**

| # | Ticket | Agent-days |
|---|---|---|
| D1 | Delete 17 redirect-only stubs after grep-cleaning their `<Link>`s | 1 |
| D2 | Sunset `/api/teen/shop` POST (legacy) + `/api/teen/tokens` (transfer/exchange actions): return 410 Gone | 0.5 |
| D3 | Toast unification: migrate all `useToast()` callers to Sonner; delete Radix `toast.tsx` + `toaster.tsx` + `hooks/use-toast.ts` | 1 |
| D4 | AI/Companion unification: keep AvatarCoach v2; delete `elite-ai-companion`, `AgentSheet`, `AgentFloatingButton`, `teen/dashboard/ai-companion` | 2 |
| D5 | Quest card unification: migrate to `components/teen/dashboard/quest-card.tsx`; delete `components/gamification/quest-card.tsx` | 0.5 |
| D6 | Empty/error states: migrate to `components/ui/states/*`; delete `empty.tsx`, `error-states.tsx`, `fallback-states.tsx`, `query-error-fallback.tsx` | 1 |
| D7 | Pull-to-refresh: keep `components/teen/pull-to-refresh.tsx`; delete `components/ui/pull-to-refresh.tsx` after grep | 0.25 |
| D8 | Sidebar dedup: delete `components/dashboard/sidebar.tsx` (50% broken legacy) after confirming no caller | 0.5 |
| D9 | Merge `/teen/events` + `/teen/calendar` into one route with `?view=` switch | 1 |
| D10 | Schema reconciliation: run `pg_dump --schema-only` against prod, reconcile against `migrations/`, decide what stays | 2 |
| D11 | Deprecate v1 systems: `crews` (replaced by Circles), `friend_challenges` v1 (replaced by v2), `social_sharing` v1 (mig 019). Drop tables + RPCs | 1 |
| D12 | Consolidate 5 quasi-duplicate "Add teen" CTAs (QR/email invite/share link disabled "Bientôt") — either build them or remove the cards | 0.5 |
| D13 | Public marketing SEO: add `metadata` to 15 high-value pages; remove `alternates.canonical` on root layout (currently every page canonicalizes to homepage); fix sitemap drift | 2 |
| D14 | Unified partner-card primitive across `/teen/offres`, `/teen/food`, `/teen/mentors` | 2 |

---

## Score evolution: Today vs Target launch

| Surface | Today | After Wave A | After Wave B | After Wave C | Launch target |
|---|---:|---:|---:|---:|---:|
| Homepage | 5.8 | 6.5 | 8.5 | 9.0 | **9.0** |
| Onboarding | 4.3 | 7.5 | 8.0 | 9.0 | **9.0** |
| Teen | 7.5 | 8.0 | 9.0 | 9.5 | **9.0** |
| Parent | 8.0 | 9.0 | 9.5 | 9.5 | **9.5** |
| Partner | 6.7 | 8.0 | 8.5 | 9.5 | **9.0** |
| Admin | 5.9 | 7.0 | 7.5 | 9.0 | **9.0** |
| Ambassador | 3.1 | 5.5 | 7.0 | 8.5 | **8.5** |
| Mentor | 4.25 | 6.0 | 7.0 | 9.0 | **8.5** |
| Public marketing | 6.5 | 6.5 | 8.0 | 9.0 | **8.5** |
| **Composite** | **5.8** | **7.1** | **8.1** | **9.2** | **9.0** |

**Estimated total:** 4 waves, ~6–8 weeks calendar, ~4–6 agents in parallel, ~135 agent-days of effort.

**Wave A is the launch gate.** Ship Wave A and the product is honest. Ship Wave B and the product is polished. Ship Wave C and the product is complete to vision. Wave D is debt-payoff that pays back over the lifetime of the codebase.

---

## Closing observation

The user's perception is **directionally correct but emotionally compressed.** The codebase is statically clean (`tsc` exit 0, no broken imports, no `JSON.parse` time bombs, no `@ts-ignore` debt) and the data layer for individual features is genuinely high quality (parent chores, teen wallet, mentor sessions are best-in-class). But the **integration layer** is full of disconnects: forms posting to phantom URLs, auth flows that don't create auth users, RPC names that drift between UI and DB, sidebars advertising routes that don't exist, mocked surfaces that look real, four parallel shop economies, two parallel partner-onboarding chains.

Fix the integration layer (Waves A+B = ~3 weeks) and the "fouillis" feeling will be replaced by "this works." The vision is mostly built; it just isn't wired together.

---

## Source reports

- A1 routes inventory · A2 vision-vs-implemented gap · A3 broken internal links
- B1 teen · B2 parent · B3 partner · B4 admin · B5 ambassador · B6 mentor · B7 public marketing
- C1 homepage · C2 onboarding · C3 partner ecosystem · C4 duplicates · C5 backend-frontend gap
- D1 static errors · D2 API audit · D3 nav targets · D4 forms audit
- E1 feed/social · E2 quests/chores/savings · E3 lifestyle · E4 parent flows · E5 partner flows · E6 shop/rewards
