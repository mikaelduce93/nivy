# Founder decisions required

> Source: `docs/canon/INDEX.locked.md` + 12 domain `*.locked.md` files (read 2026-05-08).
> All recommendations are quoted from canon — no decisions invented here.
> Numbering: **F1–F18** = INDEX cross-cutting decisions (already enumerated by canon). **F19+** = decisions raised inside a single domain `*.locked.md` UNRESOLVED section but not consolidated into INDEX.

## Summary

**51 decisions outstanding** (18 from INDEX + 33 domain-local).

Top 3 by impact-if-delayed:
1. **F25 — E-money license partnership (Option A/B/C/D).** Blocks any real DH top-up flow. Without an EP partner of record (M2T / Cash Plus / Wafacash), money cannot legally move; manual top-up is a stop-gap.
2. **F2 — Driver as first-class `profiles.role`.** Blocks the `profiles.role` CHECK constraint migration, the entire `/driver/**` zone, and the redirect logic in `app/auth/redirect/page.tsx`. Three canon files reference this; nothing ships until ratified.
3. **F1 — Self-signup teen vs parent-invited only.** Determines whether `pending_teen_registrations`, `linking_codes` table, and `/api/auth/register-teen` ship as the canonical onboarding rail or a deprecated dual-track footgun.

One **inter-canon contradiction** found (F3 — see bottom of file).

---

## Decisions

### F1 — Teen self-signup at launch: dual-track or parent-invited only
- **Options:** A) Both self-signup and parent-invited | B) Parent-invited only (self-signup loops to "ask your parent for an invite") | C) Self-signup canonical, parent invite a fast-path
- **Canon recommendation:** **B — Parent-invited only at launch.** Defer self-signup to V1.4 once magic-link flow is hardened. Reduces `pending_teen_registrations` orphan risk; matches parental-consent-first invariant.
- **Impact if delayed:** Onboarding routes (`/auth/sign-up?role=teen`, `/api/auth/register-teen`, `/api/auth/validate-teen`) cannot be canonicalized; `linking_codes` table design blocked.
- **Domains affected:** auth-onboarding, parent-control
- **Dependent files:** `app/auth/sign-up/page.tsx`, `app/api/auth/register-teen/route.ts`, `app/api/auth/validate-teen/route.ts`, `components/onboarding/parent-setup-step.tsx`, future `linking_codes` migration
- **Status:** OPEN

### F2 — Driver: first-class `profiles.role` or `partner_type='driver'`
- **Options:** A) First-class top-level role with `/driver/**` workspace | B) `partner_type='driver'` only inside `partners` (no separate role) | C) Dual: both `partner_type='driver'` AND `app_metadata.role='driver'`
- **Canon recommendation:** **A — First-class role.** Driver workspace `/driver/**` exists in spec; treat as peer to mentor. (partner-ecosystem 8.1 nuances this to dual A+C; roles-permissions 8.3 says top-level.)
- **Impact if delayed:** Blocks `profiles.role` CHECK constraint, blocks `/driver/**` route group, blocks middleware `roleRouteMap` extension, blocks `app/auth/redirect/page.tsx` driver branch.
- **Domains affected:** roles-permissions, partner-ecosystem, auth-onboarding, lifestyle, routing
- **Dependent files:** `app/auth/redirect/page.tsx:43`, `middleware.ts:271`, `lib/auth/get-user-role.ts`, `app/api/driver/**`, future `app/driver/**` pages, `nivy_drivers` schema
- **Status:** OPEN

### F3 — Influencer: ambassador track or distinct enum value
- **Options:** A) Distinct `'influencer'` enum value with separate `/influencer/*` dashboard and payout pipeline | B) Fold into ambassador with `track ∈ {organic, influencer}` on the same `ambassadors` table
- **Canon recommendation:** **B — Fold into ambassador (per INDEX F3 + auth U3).** Drop `/devenir-influenceur` candidature; keep `/devenir-ambassadeur`. ⚠️ partner-ecosystem 8.3 contradicts this (recommends DISTINCT) — see Inter-canon contradictions below.
- **Impact if delayed:** Two parallel candidature funnels live (`/devenir-ambassadeur`, `/devenir-influenceur`); duplicate payout backend risk; enum sprawl.
- **Domains affected:** partner-ecosystem, roles-permissions, auth-onboarding
- **Dependent files:** `app/devenir-ambassadeur/**`, `app/devenir-influenceur/**`, `ambassadors` table, `influencer_campaigns` table
- **Status:** OPEN (with internal canon contradiction)

### F4 — Coach + teacher: `partner_staff.role` or distinct `partner_type`
- **Options:** A) `partner_staff.role` values inside `club`/`education` partners | B) Distinct `partner_type='coach'` / `partner_type='teacher'` | C) Unify with mentor under "certified human" archetype
- **Canon recommendation:** **A — `partner_staff.role`.** Both extend an existing `partner` (school/club). `/devenir-coach`, `/devenir-teacher` produce `partner_staff` rows.
- **Impact if delayed:** XP-issuing surfaces (`partner_xp_awards`) ambiguous; coach/teacher candidature pages cannot be wired.
- **Domains affected:** partner-ecosystem, gamification, roles-permissions
- **Dependent files:** `partner_staff` schema, `app/devenir-coach/**`, `app/devenir-teacher/**`, `partner_xp_awards` RPCs
- **Status:** OPEN

### F5 — Auto-topup launch policy
- **Options:** A) Launch with auto-topup packages (PSP-driven) | B) Manual-only at launch, defer auto rails to week +2
- **Canon recommendation:** **B — Manual only at launch.** `PSP_AUTO_TOPUP_ENABLED=false`. Re-enable Cash Plus week +2.
- **Impact if delayed:** Headline parent-side conversion KPI blocked; package UI form drift unaddressed; flag-flip safety not guaranteed.
- **Domains affected:** economy-payments, parent-control
- **Dependent files:** `app/parent/topup/manual/route.ts`, `app/parent/topup/page.tsx`, `PSP_AUTO_TOPUP_ENABLED` env, future Cash Plus integration module
- **Status:** OPEN

### F6 — Top-up cap per parent per month
- **Options:** A) No cap | B) 500 DH/month default, raisable by admin | C) BAM-tier-aligned (200 DH/single, 500 DH/month, 5000 DH/teen-aggregate)
- **Canon recommendation:** **B+C combined: 500 DH/month default per parent, 5000 DH/month aggregate per teen, 200 DH per single top-up; raise via post-KYC.** Enforced server-side in `top_up_teen` via new `parental_limits` table.
- **Impact if delayed:** No regulatory ceiling enforced (BAM Circular 6/W/2017 risk); `top_up_teen` RPC incomplete.
- **Domains affected:** economy-payments, parent-control
- **Dependent files:** `top_up_teen` RPC, future `parental_limits` migration, `app/api/parent/topup/route.ts`
- **Status:** OPEN

### F7 — Moderation inbox: single page or per-type queues
- **Options:** A) Single inbox `/admin/moderation` with tab filters | B) Per-type queues at separate routes
- **Canon recommendation:** **A — Single inbox.** Dedupe enforced at table layer; one SLA model; one audit shape. Per-type pages drift in UI/UX.
- **Impact if delayed:** Four parallel admin moderation pages remain live; SLA inconsistency; audit shape drift.
- **Domains affected:** admin-moderation, social-feed
- **Dependent files:** `app/admin/moderation/page.tsx`, `moderation_queue` table, `app/api/circles/report/route.ts`
- **Status:** OPEN

### F8 — `support` admin sub-role: keep, build, or remove
- **Options:** A) Remove sub-role | B) Keep enum value but no surfaces | C) Keep + build `/admin/support-tickets` queue
- **Canon recommendation:** **C — Keep + build `/admin/support`.** Build the tickets surface in V1.4; killing the sub-role means re-introducing it in 3 months.
- **Impact if delayed:** First parent complaint email arrives with no ticket queue; `support_tickets` table unused; `support.tickets` / `support.reply` permissions orphaned.
- **Domains affected:** admin-moderation, roles-permissions
- **Dependent files:** future `app/admin/support-tickets/**`, `support_tickets` migration, `lib/auth/admin-permissions.ts`
- **Status:** OPEN

### F9 — Two-parent co-sign default
- **Options:** A) Single-parent default (any linked parent acts alone) | B) Co-sign default (both parents required) | C) Single default with opt-in `parents_cosign_required` flag per family
- **Canon recommendation:** **C — Single-parent default; opt-in `parents_cosign_required` boolean per family.** When `true`, approvals > 200 DH OR consent renewal require both parents. Chores stay first-parent-wins regardless.
- **Impact if delayed:** Divorced/shared-custody families painted into a corner; `family_subscriptions` flag schema unspec'd.
- **Domains affected:** parent-control, economy-payments
- **Dependent files:** `family_subscriptions` table (or new `parent_household`), all `parental_approvals` write paths, `verify_chore_completion` RPC
- **Status:** OPEN

### F10 — Curfew: per-parent override or global only
- **Options:** A) Global only (22:00–05:00 `Africa/Casablanca`) | B) Per-parent configurable window | C) Per-parent override on top of global default
- **Canon recommendation:** **C — Per-parent override on top of 22:00 global default.** lifestyle D2 nuances: keep global window for v1; add per-parent `curfew_window_local int4range` only when paying customer asks.
- **Impact if delayed:** Per-ride `curfew_override` boolean is the only flexibility; cron complexity decision deferred.
- **Domains affected:** parent-control, lifestyle
- **Dependent files:** `request_ride` RPC, `parent_settings` future column, `app/api/cron/ride-curfew-check/`, `app/parent/rides/`
- **Status:** OPEN

### F11 — `/teen/defis-physiques`: keep separate or merge into `/teen/quests?tab=body`
- **Options:** A) Keep `/teen/defis-physiques` as separate hub | B) Merge into `/teen/quests?tab=body` (308 redirect)
- **Canon recommendation:** **B — Merge.** 308 redirect; kill `/teen/challenges` re-export. Three reasons: (1) `/teen/quests` is canonical; (2) overlap with daily/body-pillar; (3) Body tab already filters `pillar='vitality' || type='challenge'`.
- **Impact if delayed:** Three places to look for "physical-pillar today" content; missing action UI on `/teen/defis-physiques`.
- **Domains affected:** gamification, routing
- **Dependent files:** `app/teen/defis-physiques/page.tsx`, `app/teen/quests/quests-hub-client.tsx`, `app/teen/challenges/page.tsx`, `physical_challenges` table
- **Status:** OPEN

### F12 — `circles` vs `crews` naming
- **Options:** A) `/teen/circles` canonical, kill crews | B) `/teen/crews` canonical | C) Keep both — `/teen/circles` URL with two tabs (circles, crews)
- **Canon recommendation:** INDEX says **A — `/teen/circles` canonical, crews unified under circles tab.** social-feed D1 says **C — KEEP BOTH under canonical URL `/teen/circles` with two tabs.** Whitepaper §17 explicitly tiers them by size + governance + reward economy.
- **Impact if delayed:** `/teen/crews` stub may 404 or compete with `/teen/circles`; tab UX undecided.
- **Domains affected:** social-feed, routing
- **Dependent files:** `app/teen/circles/**`, `app/teen/crews/**` (if any), `circles` schema
- **Status:** OPEN (minor INDEX↔social-feed nuance — both agree URL is `/teen/circles`)

### F13 — Marketplace: teens allowed or parent-only
- **Options:** A) Parent-only listings + buys | B) Teens allowed with caps and parental approvals
- **Canon recommendation:** **B — Teen-allowed with caps:** 5 active listings, 1000 DH/teen/month AML cap, school + venue_partner meet-methods only, parental authorization for listings ≥ 200 coins or any DH listing, per-purchase parental approval above autonomy ceiling, no adult→teen sales.
- **Impact if delayed:** Circular-economy pillar gutted; `marketplace_listings` policy unknown; AML compliance unspec'd.
- **Domains affected:** social-feed, economy-payments
- **Dependent files:** `marketplace_listings` table, `buy_listing` RPC, `app/teen/marketplace/**`, `parental_approvals` integration
- **Status:** OPEN

### F14 — CIN signed-URL TTL
- **Options:** A) Single TTL for all viewers | B) Tiered: parent self-view shorter, admin compliance longer | C) Public bucket (no TTL)
- **Canon recommendation:** **B — 5 min parent / 15 min admin / 30 min hard cap** on `parent-cin` private bucket. Rotate signing key quarterly. Bucket never `documents`.
- **Impact if delayed:** Today `app/api/parent/e-signature/create/route.ts` uses `getPublicUrl` on `documents` (P0 leak); private bucket migration blocked.
- **Domains affected:** parent-control, admin-moderation, partner-ecosystem
- **Dependent files:** `app/api/parent/e-signature/create/route.ts`, `parent-cin` storage bucket migration, `app/admin/parents/[id]/cin/route.ts`, `service_role` signing constant
- **Status:** OPEN

### F15 — Recommender cold-start strategy
- **Options:** A) Popularity (top-N global by completion rate) | B) Friend-of-friend (lift sibling/cohort top items) | C) Tag-default (`cold_start`, `popular_local`, `staff_pick`)
- **Canon recommendation:** **C primary + A fallback.** Friend-of-friend (B) deferred until cohort ≥ 100 active teens. Switch in `recommend_for_teen` triggered by `total_signals < 5 OR account_age_days < 7`.
- **Impact if delayed:** Day-1 recommender returns near-empty when `total_signals < 5` AND no `teen_interests` row; "everyone sees the same generic quiz" failure mode.
- **Domains affected:** personalization-ai
- **Dependent files:** `recommend_for_teen` RPC (mig 085 v2), `interest_taxonomy` seeding (`cold_start`, `popular_local`, `staff_pick` tags), cohort-size monitor
- **Status:** OPEN

### F16 — gen-z palette deprecation timeline
- **Options:** A) Hard cutover in V1.4 | B) Warn-only in V1.4, hard cutover in V1.5 | C) Indefinite coexistence
- **Canon recommendation:** **B — V1.4 = warn-only ESLint, no new gen-z usage; V1.5 hard cutover.** Day 3 + Day 3.5 codemod ships pre-launch (V1.4); Day 4 token removal in V1.5.
- **Impact if delayed:** ~1900 cyan/emerald occurrences remain; 50 manual gradient pair reviews accumulate.
- **Domains affected:** design-system-mobile
- **Dependent files:** Tailwind config, codemod scripts, `globals.css` token definitions
- **Status:** OPEN

### F17 — PPR (Partial Prerendering) enable
- **Options:** A) Enable in V1.4 | B) Enable in V1.5 | C) Defer indefinitely
- **Canon recommendation:** **B — V1.5.** Pre-launch risk too high; schedule for V1.5 week 1 with Lighthouse before/after on `/agenda`, `/anniversaires`, `/aide`, `/devenir-*` marketing pages.
- **Impact if delayed:** Marketing TTFB win deferred (already deferred in plan; status quo).
- **Domains affected:** design-system-mobile
- **Dependent files:** `next.config.mjs` (`experimental.ppr`), route-level `dynamic = 'force-dynamic'` audit
- **Status:** OPEN

### F18 — Storybook adoption
- **Options:** A) Adopt for primitives | B) Do not adopt; rely on Playwright matrix
- **Canon recommendation:** **B — No.** Page-level layout (FLIP, View Transitions, skeletons) is the dominant regression risk; Storybook would not surface it. 4-viewport Playwright matrix (W4-A1) is higher leverage. Re-evaluate at V1.6 if primitives grow past ~80 components.
- **Impact if delayed:** None (status quo); decision is "do nothing" + revisit at V1.6.
- **Domains affected:** design-system-mobile
- **Dependent files:** none (decision is to NOT adopt)
- **Status:** OPEN

---

### F19 — Ambassador role: requires admin approval before grant?
- **Options:** A) Manual admin approve → role flip | B) Auto-grant on application; admin can revoke
- **Canon recommendation:** **A — Manual approve.** Money + referral attribution + minor-targeted growth surface. 4-business-hour SLA.
- **Impact if delayed:** `/devenir-ambassadeur/candidature` flow undefined; risk of unvetted ambassadors writing to `referral_attribution`.
- **Domains affected:** auth-onboarding, partner-ecosystem
- **Dependent files:** `app/devenir-ambassadeur/candidature/**`, `ambassadors` table, admin approval queue
- **Status:** OPEN

### F20 — Mentor KYC: blocks dashboard, blocks earnings, or tier-gated
- **Options:** A) KYC blocks entire `/mentor/dashboard` until approved | B) Browse + draft profile allowed; cannot accept paid sessions | C) Tier-gated: `pending` = no contact, `intro_only` = free + parent-attended only, `active` = paid
- **Canon recommendation:** **C — Tier-gated** per `mentorship-career.md` §6 SPEC. `is_onboarded=true` only at `intro_only` or `active`. KYC failure → permanent `pending`, no dashboard, status page only.
- **Impact if delayed:** `/mentor/dashboard` gating logic undefined; `is_onboarded` semantics ambiguous for mentors.
- **Domains affected:** auth-onboarding, partner-ecosystem
- **Dependent files:** `app/mentor/dashboard/**`, `mentor_sessions` schema, `is_onboarded` flag
- **Status:** OPEN

### F21 — Partners: auto-create `auth.users` at apply, or wait for admin approval
- **Options:** A) Auto-create at apply, send magic-link immediately (partner sees `<PartnerAwaitingApproval />` while pending) | B) Wait for admin to manually create account at approve | C) `inviteUserByEmail` invite-link model with no transient credentials table
- **Canon recommendation:** **A — Auto-create at apply** (auth U4) AND keep password collection at stage 2 with transient `partner_pending_credentials` table (partner-ecosystem 8.4). Removes the "how does the partner log in?" black box and the 4th friction point.
- **Impact if delayed:** Partner cannot log in to upload KYC while pending; `app/api/partners/register/route.ts` design blocked.
- **Domains affected:** auth-onboarding, partner-ecosystem
- **Dependent files:** `app/api/partners/register/route.ts`, `partner_pending_credentials` migration, `<PartnerAwaitingApproval />` component
- **Status:** OPEN

### F22 — `is_onboarded` reset on role change?
- **Options:** A) Yes — force re-wizard on role change | B) No — treat completion as global
- **Canon recommendation:** **A — Yes.** Each role's wizard captures different info (parent CGU vs mentor KYC vs ambassador payout); completion of one is meaningless for another.
- **Impact if delayed:** Multi-role users (F26 stacking) hit broken redirects when adding a secondary role.
- **Domains affected:** auth-onboarding, roles-permissions
- **Dependent files:** `is_onboarded` flag, role-switch endpoints, middleware redirect
- **Status:** OPEN

### F23 — Email confirmation enforcement
- **Options:** A) Hard-required for all roles | B) Soft (allow unconfirmed login, restrict actions) | C) Dev-only bypass
- **Canon recommendation:** **A for parent / partner / mentor / driver / ambassador** (money + minor-safety roles, Supabase `enable_email_confirmations=true`). **For teens** (no real email at first) use magic-link / set-password from parent-validation token.
- **Impact if delayed:** Supabase Auth config undecided; teens cannot complete onboarding without email path.
- **Domains affected:** auth-onboarding
- **Dependent files:** Supabase project config, `app/api/auth/validate-teen/route.ts`, magic-link routes
- **Status:** OPEN

### F24 — Bootstrap of first `super_admin`
- **Options:** A) Seed migration | B) CLI script in `scripts/` | C) Env-driven first-login auto-promotion
- **Canon recommendation:** **B — CLI script `scripts/seed-super-admin.ts` taking `--email`.** Records to `audit_log`. Reproducible per env. (admin D7 nuances: one-shot SQL migration acceptable; lock direction is reproducibility + audit_log entry.)
- **Impact if delayed:** `admin_roles` empty in prod; no canonical path to create first super_admin.
- **Domains affected:** auth-onboarding, admin-moderation
- **Dependent files:** future `scripts/seed-super-admin.ts`, `admin_roles` table, `docs/RUNBOOK.md`
- **Status:** OPEN

### F25 — E-money license: Option A vs B vs C vs D
- **Options:** A) Self-license as Établissement de Paiement | B) Partner with M2T / Cash Plus / Wafacash as e-money issuer of record | C) Stay agency-only | D) Multi-rail collection into partner-held wallet
- **Canon recommendation:** **B + D combined.** Partner with M2T or Cash Plus or Wafacash (B) AND expose CMI + Mobile Money + Stripe + Cash-via-ambassador as collection rails into the partner-held wallet (D). Stripe restricted to non-MAD international cards (diaspora parents). **Founder must sign one EP partnership before any real DH top-up flow goes live.**
- **Impact if delayed:** **No real DH top-up can ship.** Manual top-up rail is a stop-gap; legal exposure on every cent moved.
- **Domains affected:** economy-payments
- **Dependent files:** `payment_transactions`, `cash_settlements`, `webhook_events`, `payment_logs` tables (all MISSING in live DB), `app/api/payments/**` rails
- **Status:** OPEN — **HIGHEST IMPACT**

### F26 — Multi-role per human (parent + ambassador, etc.)
- **Options:** A) Single-valued `profiles.role` (current) — flipping loses prior affordances | B) Role-stacking via `profile_roles (profile_id, role, granted_at, granted_by)` many-to-many secondary roles
- **Canon recommendation:** **B — Role stacking.** Keep `profiles.role` as PRIMARY; add `profile_roles` for SECONDARY. Defer implementation; lock data model now.
- **Impact if delayed:** Parent who becomes ambassador loses parent UI; layouts cannot compensate.
- **Domains affected:** roles-permissions, auth-onboarding
- **Dependent files:** future `profile_roles` migration, all role-gated layouts
- **Status:** OPEN

### F27 — `PARTNER_ACTIVE_STATUSES` collapse
- **Options:** A) Keep three values (`active`, `verified`, `approved`) | B) Collapse to single `'active'`
- **Canon recommendation:** **B — Collapse.** `verified` and `approved` are synonyms in current code; redundancy is a footgun. Migration: `UPDATE partners SET status='active' WHERE status IN ('verified','approved');`
- **Impact if delayed:** Three statuses for "active" remain; per partner-ecosystem contradictions table this is already LOCKED but the migration has not shipped.
- **Domains affected:** auth-onboarding, partner-ecosystem
- **Dependent files:** `app/partner/page.tsx` `PARTNER_ACTIVE_STATUSES` constant, `partners.status` schema
- **Status:** OPEN

### F28 — `/onboarding` (marketing wizard): keep or kill
- **Options:** A) Keep as pre-account showcase only (no `auth.signUp` calls) | B) Kill entirely; public landing pages are the new pre-account funnel
- **Canon recommendation:** **A — Keep but de-fang.** Wizard has the only working gamified XP-on-signup mechanic + sync-on-validate. Strip `auth.signUp` from `parent-setup-step.tsx`; redirect "Continue" to `/auth/sign-up?source=wizard&tempUserId=…`.
- **Impact if delayed:** Wizard still creates `auth.users` rows outside the canonical sign-up surface (forbidden pattern).
- **Domains affected:** auth-onboarding
- **Dependent files:** `app/onboarding/**`, `components/onboarding/parent-setup-step.tsx`, `app/auth/sign-up/page.tsx`
- **Status:** OPEN

### F29 — Linking-code TTL
- **Options:** A) 24h (whitepaper §19 invariant) | B) 7-day (current `pending_teen_registrations` token) | C) Two separate mechanisms
- **Canon recommendation:** **C — Two separate mechanisms.** 24h for parent-generated linking codes; 7 days only for the parent-validation email token (slower-moving consent step).
- **Impact if delayed:** Single-mechanism shortcut blocks whitepaper §19 invariant.
- **Domains affected:** auth-onboarding, parent-control
- **Dependent files:** future `linking_codes` migration, `pending_teen_registrations` token columns
- **Status:** OPEN

### F30 — Driver KYC sourcing: in-house, aggregator, or hybrid
- **Options:** A) Build full driver KYC funnel in-app | B) Integrate Careem / Heetch driver pool, no Nivy KYC | C) Hybrid: `nivy_drivers` (in-house, KYC) + `aggregator_drivers` (federated, no KYC)
- **Canon recommendation:** **C — Hybrid** per whitepaper §19.4.2. Build in-house funnel but allow aggregator fallback for capacity. Lock API surface `provider TEXT CHECK IN ('careem','heetch','nivy_partner','public_transport')` from day 1.
- **Impact if delayed:** Capacity gap in M1–M3 Casablanca launch; provider adapter slot undefined.
- **Domains affected:** auth-onboarding, partner-ecosystem, lifestyle
- **Dependent files:** `nivy_drivers` schema, future `aggregator_drivers` table, `request_ride` provider enum
- **Status:** OPEN

### F31 — Aggregator vs own driver pool: which goes first
- **Options:** A) Aggregator (Careem/Heetch) first — fast launch, thin margins | B) Own Nivy partner pool first in Casablanca — slow recruit (3+ months), trust wedge
- **Canon recommendation:** **B — Nivy partner pool first in Casablanca (M0–M3); aggregator overflow in M4.**
- **Impact if delayed:** Casa launch sequencing undecided; founder cannot gate driver recruitment vs aggregator integration.
- **Domains affected:** partner-ecosystem, lifestyle
- **Dependent files:** ride provider adapter pattern, `nivy_drivers` recruitment funnel
- **Status:** OPEN

### F32 — Mentor / coach / teacher compensation model
- **Options:** A) Teen wallet only (paid sessions) | B) Nivy subsidy pool (free for low-tier families) | C) Partner-club-funded (Nivy is top-of-funnel) | D) Mixed (free intro + per-session rate OR volunteer XP-only + teachers club-funded by default)
- **Canon recommendation:** **D — Mixed.** Free intro session always; mentor/coach picks per-session rate (paid = teen wallet) OR opts into volunteer track (XP-only, Nivy boosts visibility). Teachers in `education` partners default to club-funded.
- **Impact if delayed:** Mentor onboarding cannot finalize payout setup; subsidy budget per teen tier unspec'd.
- **Domains affected:** partner-ecosystem, economy-payments, gamification
- **Dependent files:** `mentor_sessions.fee_dh`, `partner_xp_awards`, future subsidy ledger
- **Status:** OPEN

### F33 — `partners.commission_rate`: per-type default vs per-partner override authority
- **Options:** A) Per-type defaults only | B) Per-partner override, partner-self-edit allowed | C) Per-type defaults in `partner_type_settings` + admin-only override at activation
- **Canon recommendation:** **C — Defaults in `partner_type_settings (partner_type, default_commission_rate)`; override only by admin at activation (stage 5); renegotiation requires admin re-approval; partner cannot self-edit.** Whitepaper §9: retail 8%, venue 10%, club 12%, education 15%.
- **Impact if delayed:** Commission rate authority ambiguous; partner_type_settings table unspec'd.
- **Domains affected:** partner-ecosystem, economy-payments
- **Dependent files:** future `partner_type_settings` migration, `partners.commission_rate` column, admin partner-edit UI
- **Status:** OPEN

### F34 — First mentor session: parent-attended strict default or opt-out + recording-watch
- **Options:** A) Always parent-attended (strict) | B) Parent-attended default with opt-out → recording-watch-required-within-24h (else mentor auto-paused)
- **Canon recommendation:** **B — Opt-out clause with recording-watch.** Preserves safety while removing the worst friction point.
- **Impact if delayed:** Mentor scheduling UX gated; recording infra requirement unclear.
- **Domains affected:** partner-ecosystem, lifestyle
- **Dependent files:** `mentor_sessions` recording fields, parental opt-out flag, mentor auto-pause logic
- **Status:** OPEN

### F35 — Marketplace seller: partner or teen-with-flag
- **Options:** A) Sellers become `partners` (full KYC, RIB) | B) Teens with `seller_kyc_status` (locked above)
- **Canon recommendation:** **B — Keep teens with `seller_kyc_status`.** Social graph, parental approvals, wallet are teen-bound. Teen-as-partner everywhere would require new policy.
- **Impact if delayed:** AML/RIB collection on teen sellers unspec'd; teen-as-partner complexity vs flag-on-teen unresolved.
- **Domains affected:** partner-ecosystem, social-feed, economy-payments
- **Dependent files:** `marketplace_listings.seller_id`, `seller_kyc_status` column, parental approvals chain
- **Status:** OPEN

### F36 — Mentor scope on teen profile (read access)
- **Options:** A) Full profile (name, DOB, contact, full interests) | B) Scoped: first name, age, learning_style, top-3 interests, declared goals, prior session notes | C) Bare minimum (first name, age only — current behaviour)
- **Canon recommendation:** **B — Scoped via SQL view `mentor_visible_teen_profile`.** Mentor does NOT see full_name, exact DOB, phone, parent identity, financial data, friend graph, other mentor notes. SELECT granted to mentors with active or completed `mentor_sessions` row with that teen.
- **Impact if delayed:** Mentor session prep limited; mentor visibility scope undefined in RLS policy.
- **Domains affected:** roles-permissions, partner-ecosystem
- **Dependent files:** future `mentor_visible_teen_profile` view, mentor RLS policies, `mentor_sessions` schema
- **Status:** OPEN

### F37 — Moderator dashboard URL: `/moderator/*` or filtered `/admin`
- **Options:** A) Separate `/moderator` URL | B) Filter `/admin` sidebar by permission so moderator sees 4-item nav (dashboard, users, content moderation queues, support)
- **Canon recommendation:** **B — Filter sidebar by permission.** No separate `/moderator` URL needed.
- **Impact if delayed:** Moderators see "Accès refusé" links; sidebar role-aware filter not wrapping `navItems.map(...)`.
- **Domains affected:** roles-permissions, admin-moderation
- **Dependent files:** admin sidebar component, `roleHasPermission` filter wrapper
- **Status:** OPEN

### F38 — Admin sub-role assignment authority
- **Options:** A) Both `admin` and `super_admin` can assign sub-roles | B) `super_admin` only for `admin_roles` row creation/update AND `permissions` JSONB writes
- **Canon recommendation:** **B — `super_admin` only.** `permissions` column locked to additive grants only.
- **Impact if delayed:** Privilege escalation risk if any UI ever writes `admin_roles.permissions` JSONB.
- **Domains affected:** roles-permissions, admin-moderation
- **Dependent files:** `lib/auth/admin-permissions.ts`, `admin_roles` RLS, admin role-management UI
- **Status:** OPEN

### F39 — `/admin/logs` vs `/admin/audit-log`
- **Options:** A) Two surfaces (KEEP `/admin/logs` ops feed + NEW `/admin/audit-log` compliance store) | B) Collapse into one `/admin/audit-log`
- **Canon recommendation:** **B — Collapse — one truth.**
- **Impact if delayed:** Two parallel admin log surfaces drift; `audit_log` (singular canonical) vs `activity_logs` (deprecated, queried by `/admin/logs` against missing table).
- **Domains affected:** admin-moderation, routing
- **Dependent files:** `app/admin/logs/page.tsx`, future `app/admin/audit-log/page.tsx`, `audit_log` table
- **Status:** OPEN

### F40 — `/teen/leaderboard` naming collision
- **Options:** A) Rename `/teen/leaderboard` → `/teen/leaderboard/creators`; redirect `/gamification/leaderboard` → `/teen/leaderboard` (XP global default) | B) Hoist both under `/teen/leaderboard?scope=xp|creators` query param
- **Canon recommendation:** **B — Query-param scope.** Single URL, switchable.
- **Impact if delayed:** Two boards on the same word; user confusion; gamification/teen route bifurcation.
- **Domains affected:** routing, gamification
- **Dependent files:** `app/teen/leaderboard/page.tsx`, `app/gamification/leaderboard/page.tsx` (deprecated)
- **Status:** OPEN

### F41 — `/reservation*` flow: public marketing or auth'd shop
- **Options:** A) Replace with `/teen/shop/checkout` only | B) Split: `/reservation*` for public/anonymous booking; auth'd teens deep-link to `/teen/shop/checkout?booking=...`
- **Canon recommendation:** **B — Split.** Document the bifurcation.
- **Impact if delayed:** Public booking from marketing pages cannot work without auth; duplicate routes uncanonicalized.
- **Domains affected:** routing, social-feed
- **Dependent files:** `app/reservation/**`, `app/teen/shop/checkout/**`
- **Status:** OPEN

### F42 — Driver UI surface: build PWA or API-only
- **Options:** A) Build `/driver/dashboard` + `/driver/rides/[id]` minimal PWA | B) Keep API-only (driver app is external)
- **Canon recommendation:** **B — External partner contractor app — keep API-only for V1.** (Conflicts subtly with F2 ratifying driver as first-class role; resolution: role exists for auth/middleware, but UI surface is deferred.)
- **Impact if delayed:** Driver self-service UI scope undecided; impacts F2 implementation depth.
- **Domains affected:** routing, lifestyle, partner-ecosystem
- **Dependent files:** `app/api/driver/**`, future `app/driver/**` (if A)
- **Status:** OPEN

### F43 — `/teen/share` collision (friend invite vs ambassador share)
- **Options:** A) Split: `/teen/share` = friend invite (canonical); ambassador share moves under `/ambassador/marketing` | B) Single page with `?context=friends|ambassador`
- **Canon recommendation:** **B — Single page with context param** — fewer routes.
- **Impact if delayed:** Two flows collide on one URL; ambassador attribution may leak through friend-invite path.
- **Domains affected:** routing, social-feed, partner-ecosystem
- **Dependent files:** `app/teen/share/page.tsx`, `app/ambassador/marketing/**`
- **Status:** OPEN

### F44 — `/teen/games` retention
- **Options:** A) Hard delete (410), out of canonical scope | B) Migrate salvageable mini-games into `/teen/quests` as quest types
- **Canon recommendation:** **A — Hard delete (410).** Migrate any salvageable mini-games into `/teen/quests` as quest types.
- **Impact if delayed:** Live wiring (`gamification-system/features/mini-games`) remains; out-of-scope feature accrues maintenance.
- **Domains affected:** routing, gamification
- **Dependent files:** `app/teen/games/**`, `gamification-system/features/mini-games/**`
- **Status:** OPEN

### F45 — Mentor session status enum drift
- **Options:** A) Lock the shipped enum (`pending_approval | approved | denied | dispatched | completed | cancelled | no_show`) and rename in future migration | B) Migrate now to spec enum (`requested | parent_pending | scheduled | live | completed | cancelled | no_show`)
- **Canon recommendation:** **A — Lock shipped enum; coordinated rename in 070+ migration with code update in same PR.** Renames: `pending_approval → parent_pending`, `approved → scheduled`, `dispatched → live`. Drop `denied` orphan or fold into `cancelled`.
- **Impact if delayed:** Spec ↔ schema drift remains; client filters in 4 places diverge.
- **Domains affected:** lifestyle, partner-ecosystem
- **Dependent files:** `mentor_sessions.status` enum, `app/teen/mentor-sessions/page.tsx`, `app/parent/mentor-sessions/[id]/deny/route.ts`, `mentor_complete_session` RPC, `parent_approve_session` RPC, migrations 059 + 069
- **Status:** OPEN

### F46 — Ride dispute resolution autonomy
- **Options:** A) Build `ride_disputes` table + admin-only `resolve_ride_dispute` RPC | B) ML-based auto-classification | C) Defer — handle via support tickets only
- **Canon recommendation:** **A — Thin `ride_disputes` table + admin-only RPC** mirroring `marketplace_disputes`. Defer ML auto-classification. Use existing `escrow_ledger` for refund credit.
- **Impact if delayed:** Driver-vs-teen issues (no-show, route-deviation, fare-dispute) have no canonical channel.
- **Domains affected:** lifestyle, admin-moderation
- **Dependent files:** future `ride_disputes` migration, future `resolve_ride_dispute` RPC, `escrow_ledger`
- **Status:** OPEN

### F47 — Pathway milestone primitive
- **Options:** A) Build `pathway_milestones` + per-teen progress tables | B) Keep placeholder `total_milestones=10`
- **Canon recommendation:** **A — Ship `pathway_milestones` + `teen_pathway_milestone_progress` + `advance_pathway_milestone` RPC.** Hand-curate 5–7 milestones per seeded pathway.
- **Impact if delayed:** Recommendation engine `recommend_for_teen('pathway')` unblocked but unsemanic; progress bar shows fake data.
- **Domains affected:** lifestyle, personalization-ai
- **Dependent files:** future `pathway_milestones` migration, `recommend_for_teen` RPC, pathway progress UI
- **Status:** OPEN

### F48 — DH↔coin (1:100) vs DH↔XP (1:10) display contradiction
- **Options:** A) Keep both — different currencies, different rates | B) Unify all conversions at one rate
- **Canon recommendation:** **A — Keep both.** Delete `xp_payment_settings.xp_to_dh_rate` row (third contradictory representation). Hide DH-equivalent pill on XP in wallet header; keep only in shop tab next to per-item prices.
- **Impact if delayed:** Wallet UI shows confusing DH-equivalent on XP; users think DH-equivalent = coin balance.
- **Domains affected:** economy-payments
- **Dependent files:** `lib/payments/xp-converter.ts:10`, `xp_payment_settings` seed, wallet header component
- **Status:** OPEN

### F49 — Per-teen spend cap + per-category whitelist
- **Options:** A) No cap | B) `parental_limits(parent_id, teen_id, max_monthly_dh, allowed_categories text[])` checked in every spend RPC
- **Canon recommendation:** **B — Introduce `parental_limits` table.** Check in `spend_teen_coins`, `buy_listing`, `book_mentor_session`, `place_food_order`, `request_ride`.
- **Impact if delayed:** No category whitelist enforcement; parental autonomy controls absent.
- **Domains affected:** economy-payments, parent-control, lifestyle
- **Dependent files:** future `parental_limits` migration, all spend RPCs
- **Status:** OPEN

### F50 — 18th birthday wallet handling
- **Options:** A) Auto-cashout to parent on 18th birthday | B) Freeze wallet + 30-day grace + parent/teen choice (cash-out OR re-KYC into adult Nivy account) | C) Convert silently
- **Canon recommendation:** **B — Freeze + notify + 30-day grace; auto-cashout to parent thereafter.** Two options: (a) cash-out remaining balance to parent on original PSP rail, (b) re-KYC into adult Nivy account.
- **Impact if delayed:** No code path; teen turning 18 has undefined wallet behaviour.
- **Domains affected:** economy-payments, auth-onboarding
- **Dependent files:** age-trigger cron, `wallet_freeze` flag (TBD), re-KYC flow
- **Status:** OPEN

### F51 — Mystery box compliance (Loi 09-08 / 13-10)
- **Options:** A) Hidden weighted RNG (current 3 catalog rows) | B) Deterministic ladder ("box contains exactly 1 of N visible items, equiprobable") with visible loot table | C) Remove mystery boxes entirely
- **Canon recommendation:** **B — Deterministic ladder only with visible loot table; no hidden weighted RNG until legal review.** Hide the 3 `mystery_box` catalog rows (`is_active=false`) until ruling.
- **Impact if delayed:** Minor-audience + hidden-odds + DH-convertibility narrative = Loi 09-08/13-10 risk; legal exposure.
- **Domains affected:** economy-payments, gamification
- **Dependent files:** `mystery_box` catalog rows (`shop_rewards`), randomizer logic
- **Status:** OPEN

### F52 — Subscription / Premium tier billing
- **Options:** A) Build subscription tier model into `family_subscriptions` with coin-issuance benefits | B) Separate billing rail (Stripe subscription); benefit = catalog filter / multiplier on cashback only | C) Drop `family_subscriptions` table entirely
- **Canon recommendation:** **B — Separate billing rail; does NOT touch `user_coins` or `user_xp`.** Premium benefit = catalog filter / multiplier on cashback, not direct coin issuance.
- **Impact if delayed:** `family_subscriptions` table empty; `subscription_tiers`/`subscription_packages` undefined; tier vocabulary drift (`silver|gold|platinum` UI vs `starter|pro|elite|family` DB).
- **Domains affected:** economy-payments, parent-control, design-system-mobile
- **Dependent files:** `family_subscriptions` table, future Stripe subscription integration, sidebar tier strings
- **Status:** OPEN

### F53 — Savings cancellation policy
- **Options:** A) Locked coins return to teen spendable (current) | B) Return to parent escrow | C) Teen choice at cancel
- **Canon recommendation:** **(canon does not recommend; cancellation policy explicitly LOCKED–UNRESOLVED in gamification §11)**. Founder must pick. Affects `release_from_goal(reason='cancelled')` reason branching.
- **Impact if delayed:** Today match contributions return to teen spendable by default — possibly contrary to intent.
- **Domains affected:** gamification, parent-control, economy-payments
- **Dependent files:** `release_from_goal` RPC, `savings_goals` cancellation flow
- **Status:** OPEN

### F54 — AvatarCoach personality tone (canonical voice spec)
- **Options:** A) Three identities (panda mascot unnamed, chatbot "Kai", brand "Nivy") — current state | B) Lock single identity: name = Kai, panda mascot becomes Kai's face, single canonical prompt
- **Canon recommendation:** **B — Lock single identity.** Name = **Kai**; panda mascot from `components/brand/mascot-states.tsx` becomes Kai's face; single canonical prompt at `lib/ai/prompts/roles.ts:KAI_CANONICAL_PROMPT`. Tone matrix codified (warm, French-first, light Darija; adapts on `teens.archetype` and `teens.age`). Hard constraints: no guilt, no fake urgency, no countdown timers, no paid push during distress, crisis fallback always surfaces Moroccan hotline + parent ping.
- **Impact if delayed:** Persona split persists; CI lint cannot enforce single prompt source.
- **Domains affected:** personalization-ai, design-system-mobile, social-feed
- **Dependent files:** `lib/ai/prompts/roles.ts`, `components/teen/AvatarCoach.tsx`, `components/brand/mascot-states.tsx`, deprecated `ai-companion`/`elite-ai-companion`/`AgentSheet`
- **Status:** OPEN

---

## Inter-canon contradictions

### Contradiction #1 — Influencer enum (F3)

- **`docs/canon/INDEX.locked.md` row F3** says: **"Fold into ambassador. Drop `/devenir-influenceur` candidature, keep `/devenir-ambassadeur`."**
- **`docs/canon/auth-onboarding.locked.md` U3** agrees: **"Fold."** Single role, two application surfaces (`/devenir-ambassadeur/candidature` + `/devenir-influenceur/candidature`) writing to same `ambassadors` table with `track ∈ {organic, influencer}`.
- **`docs/canon/partner-ecosystem.locked.md` 8.3** contradicts: **"They are DISTINCT.** `ambassador` is an `auth.users` role with `ambassadors` row (referral economy). `creator`/`influencer` is `partner_type='creator'` (sponsored content economy)."

This is a **direct self-inconsistency in the canon**. INDEX + auth lock fold; partner-ecosystem locks split. Founder must pick one and re-lock the losing file in the same PR.

**Recommendation (mine, not canon):** ratify INDEX + auth (FOLD into `ambassador` with `track`); the partner-ecosystem 8.3 split is heavier and creates a parallel payout pipeline for what is 90% the same flow. But this is a founder call.

### Contradiction #2 — Circles vs crews scope (F12)

- **`INDEX.locked.md` F12** recommends: **"`/teen/circles` canonical. Whitepaper §17 mention of crews → unified under circles tab."** — implying crews are demoted into a tab inside circles.
- **`social-feed.locked.md` D1** recommends: **"KEEP BOTH"** under canonical URL `/teen/circles` (two tabs). Whitepaper §17 explicitly tiers them by size, governance, reward economy.

**Resolution status:** Soft contradiction. Both agree the URL is `/teen/circles`. They disagree on whether "crews" remain a first-class concept (just under circles' URL) or are dissolved entirely. Founder should ratify the social-feed reading (KEEP BOTH as tabs) — it's more conservative and matches whitepaper §17 — then update INDEX F12 wording.

### Contradiction #3 — Driver UI surface (F2 vs F42)

- **`INDEX.locked.md` F2** says driver is a first-class role — implying full UI workspace.
- **`routing.locked.md` §6 #7** recommends **API-only for V1** (driver app is external).

**Resolution status:** Not a true contradiction once parsed: F2 is about the **identity model** (role exists in `profiles.role`, middleware, redirect), F42 is about the **UI scope** (no `/driver/**` pages in V1). Both can coexist: ratify role + defer UI. Worth flagging for founder so they don't ratify F2 expecting a full driver dashboard to ship in V1.

---

*End of audit. Read-only. Founder ratifications are recorded by replacing recommendation rows in `docs/canon/INDEX.locked.md` (and the relevant domain `*.locked.md`) with the ruling and a date stamp, per INDEX maintenance §87.*
