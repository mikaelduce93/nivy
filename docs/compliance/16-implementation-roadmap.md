# Canon compliance — implementation roadmap

Generated 2026-05-08. 4-wave plan to reach LAUNCH READY (overall score ≥ 80) starting from current state (composite ~38, AUTH 22, ECON 38, PARENT 38, AI 62, SOCIAL 38, GAME 38, PARTNER 22, ADMIN 22, LIFE 62, ROUTE 42, DESIGN 62).

## Wave 0 — Safety freeze (week 0, immediate)

**Goal**: stop the bleeding before adding features. CI rules block regressions.

CI checks to ship today:

- ESLint custom rule banning `add_user_xp` literal in `app/**`, `lib/**`, `gamification-system/**` (use `add_xp_to_user`)
- ESLint rule banning `<Link href="/dashboard"`, `<Link href="/profile"`, `<Link href="/mon-compte"`, `<Link href="/notifications"`, `<Link href="/mes-reservations"` outside redirect stubs
- ESLint rule banning `INSERT INTO notifications` and `INSERT INTO activity_logs` writes anywhere in app code (canonical: `user_notifications` + `audit_log`)
- ESLint rule banning bare `import { motion } from 'framer-motion'` outside `components/ui/motion.tsx` proxy
- ESLint rule banning hardcoded model literals: `claude-3-sonnet-20240229`, `claude-3-`, `claude-2-`, `'gpt-4'`, `'gpt-3.5'`, `'gpt-4o-mini'`, `'gpt-4o'` in `lib/`, `app/`, `components/`
- ESLint rule banning `window.alert(` in `app/**` and `components/**` (use sonner `toast`)
- Pre-commit: deny new files in `app/gamification/` other than redirect stubs (allowlist: 6 already-redirected stubs)
- Pre-commit: deny `.from('partner_discounts')` writes (read-only view; use `partner_offers`)
- Pre-commit: deny `from('profiles').insert` and `from("profiles").insert` outside `app/api/admin/_tools/**`
- Pre-commit: deny `auth.signUp(` outside `app/auth/sign-up/page.tsx`
- Pre-commit: deny `from('admin_audit_logs')` (canonical: `audit_log` singular)
- Pre-commit: deny `from('moderation_reports')` and `from('reports')` (canonical: `user_reports`)
- Pre-commit: deny `from('shop_items')`, `from('token_rewards')`, `transfer_tokens`, `exchange_tokens`, `deduct_user_xp`, `spend_tokens`, `add_tokens_to_user`, `claim_daily_bonus` (deprecated rails)
- Pre-commit: deny `defi-proofs` bucket write (use `chore-evidence`)
- Pre-commit: deny `getPublicUrl` on `documents` / `kyc-documents` / `parent-cin` / `chore-evidence` buckets
- Pre-commit: deny `eq('user_id', teenId)` against `user_xp` / `user_coins` / `coin_transactions` / `user_achievements` (canonical PK = `teen_id`)
- CI smoke test: `grep -r "current_login_streak" app/ lib/ components/` returns 0 hits (write to `user_streaks` only)

**Output**: 1 PR adding `.eslintrc` rules + `.lintstagedrc` + 1 doc page. Owner: 1 agent. Time: 1 day.

---

## Wave 1 — Identity + money truth (week 1-2, ~6 agents)

**Goal**: every user can log in; every money write goes through canonical RPC; CIN private; AI does not leak PII.

Tickets (each maps to N findings):

### 1. **AUTH-FIX-1** — Role enum CHECK migration + admin sub-role refactor
- **Files**: `gamification-system/database/migrations/095_profiles_role_enum.sql` (new), `lib/auth/get-user-role.ts:3`, `lib/auth/admin-permissions.ts:90-120`, `app/api/auth/_validate-role.ts` (new helper)
- **Tests**: migration idempotent; INSERT 'influencer' fails CHECK; INSERT 'mentor' succeeds; admin permission still works after sub-role read from `admin_roles.role`; backfill any stray 'super_admin'/'moderator' to role='admin'
- **Complexity**: S (0.5 day)
- **Compliance gain**: AUTH +6 (closes CANON-AUTH-004); unblocks AUTH-FIX-2/3/4
- **Founder dep**: F2, F3, F26

### 2. **AUTH-FIX-2** — Validate-teen rewrite via auth.admin.createUser
- **Files**: `app/api/auth/validate-teen/route.ts:184-271`, migration `096_pending_teen_email_required.sql`, `app/onboarding/teen-setup-step` (collect email)
- **Tests**: auth.users + profiles + teens all share id; magic-link emailed; missing teen_email returns 400 (no fallback placeholder); is_onboarded=false set; orphan rollback on mid-failure
- **Complexity**: M (1.5 days)
- **Compliance gain**: AUTH +12 (closes CANON-AUTH-001 + AUTH-005 + AUTH-019 + GAME-020 cross-cut)
- **Founder dep**: F1, F23

### 3. **AUTH-FIX-3** — Parent-side teen create rewrite + redirect switch
- **Files**: `app/api/parent/teens/create/route.ts:142-207`, `app/auth/redirect/page.tsx:43-62` (full §3 LOCKED truth table)
- **Tests**: parent-created teen has auth.users; mentor with kyc='submitted' → /mentor/onboarding/kyc-pending; driver with kyc='approved' + onboarded → /driver/dashboard (or 404 if F42=API-only); unknown role → /auth/error
- **Complexity**: M (1.5 days)
- **Compliance gain**: AUTH +10 (closes CANON-AUTH-003 + PARENT-005 + PARENT-011/012 deprecated table writes)
- **Founder dep**: F2, F42

### 4. **AUTH-FIX-4** — is_onboarded gate + 5 missing complete endpoints
- **Files**: `middleware.ts:221-308`, `app/api/{parent,partner,mentor,driver,ambassador}/onboarding/complete/route.ts` (new × 5), migration `097_is_onboarded_role_change_trigger.sql`
- **Tests**: parent is_onboarded=false → /onboarding/parent/e-signature; complete returns 412 if precondition unmet (e_signatures.signed_at NULL, kyc.status≠approved, etc.); admin bypasses; role change resets
- **Complexity**: M (2 days)
- **Compliance gain**: AUTH +8 (closes CANON-AUTH-006 + AUTH-022)
- **Founder dep**: F22

### 5. **ECON-FIX-1** — add_xp_to_user rename + DB alias
- **Files**: `app/api/teen/quests/complete/route.ts:94`, `app/api/auth/validate-teen/route.ts:265-271`, `app/api/partner/apply-discount/route.ts:188-193`, `lib/hooks/teen-dashboard.ts:130-132`, migration `098_add_user_xp_alias.sql`
- **Tests**: each call site emits xp_transactions row; `grep add_user_xp app/api` = 0 hits; alias function delegates correctly
- **Complexity**: XS (0.5 day)
- **Compliance gain**: ECON +5 + GAME +14 (closes CANON-ECON-004 + ECON-012 + GAME-001/002/003 + GAME-019 + PARTNER-007)

### 6. **ECON-FIX-2** — Top-up form payload + topup_packages table
- **Files**: migration `099_topup_packages.sql` (new), `components/parent/topup-form.tsx:53-64`, `app/parent/topup/page.tsx:121-162`, `app/api/parent/topup/route.ts:26-50`
- **Tests**: POST {teenId, packageId} succeeds; raw {coins,price} rejected; inactive package rejected; PSP confirmation gate enforced; `client_idempotency_key` generated client-side and persisted UNIQUE
- **Complexity**: M (1.5 days behind PSP_AUTO_TOPUP_ENABLED=false flag per F5)
- **Compliance gain**: ECON +8 + PARENT +6 (closes CANON-ECON-001 + PARENT-001 + PARENT-002 + ECON-017 idempotency)
- **Founder dep**: F5, F25

### 7. **ECON-FIX-3** — CMI HASH enforcement + Stripe/CMI top-up rail unification
- **Files**: `lib/payments/cmi.ts:144-156`, `app/api/payments/cmi/webhook/route.ts:11-50`, `app/api/payments/cmi/callback/route.ts:77-122`, `app/api/webhooks/stripe/dispatcher.ts:67-101`, migration `100_payment_idempotency_uniques.sql`
- **Tests**: unsigned CMI POST → no DB write; Stripe coin_topup credits user_coins via top_up_teen RPC; payment_transactions + escrow_ledger linked; duplicate event no-op
- **Complexity**: M (1 day for HASH + 1 day for unification)
- **Compliance gain**: ECON +9 (closes CANON-ECON-009 + ECON-011 + ECON-014 + ECON-017)

### 8. **ECON-FIX-4** — refund_teen_coins + revoke_xp_cashback RPCs + cancel_ride wire-in
- **Files**: migration `101_refund_helpers.sql` (new), `gamification-system/database/migrations/057_transport_mobility_rpcs.sql:107-117` (cancel_ride patch), `app/api/admin/refunds/route.ts:185-440` (replace bumpCoins)
- **Tests**: cancel ride >60min → 100% refund + cashback reversal; <60min → 50%; admin refund inserts escrow(direction='refund'); idempotent on replay; bumpCoins removed
- **Complexity**: M (1.5 days)
- **Compliance gain**: ECON +6 + LIFE +4 (closes CANON-ECON-007 + ECON-015 partial + LIFE-001/002 partial)

### 9. **ECON-FIX-5** — spend_xp_for_booking SECURITY DEFINER RPC
- **Files**: migration `102_spend_xp_for_booking.sql` (new), `app/api/payments/hybrid/route.ts:164-186,332-337`, `app/api/payments/xp/route.ts:221-243,265-270`
- **Tests**: concurrent POSTs with same booking → exactly one succeeds; PSP failure → no partial debit; xp_transactions row per success
- **Complexity**: M (1 day)
- **Compliance gain**: ECON +5 (closes CANON-ECON-008 + ECON-013)

### 10. **PARENT-FIX-1** — Approvals cascade fan-out + 4 missing approve RPCs
- **Files**: migration `103_parent_approve_rpcs.sql` (new RPCs: parent_approve_ride, parent_approve_purchase, parent_approve_food, parent_approve_content), `app/api/parent/approvals/route.ts:63-136`, `app/parent/approvals/page.tsx:281-352` (action_type column rename)
- **Tests**: each approval type cascades to its resource RPC; teen sees backed action; pending → approved triggers user_notifications insert
- **Complexity**: L (2 days)
- **Compliance gain**: PARENT +12 (closes CANON-PARENT-003 + PARENT-016 + PARENT-025)

### 11. **PARENT-FIX-2** — parent-cin private bucket + e-signature CIN refactor
- **Files**: migration `104_parent_cin_private_bucket.sql` (storage bucket + RLS), `app/api/parent/e-signature/create/route.ts:73-155`, `app/api/admin/parents/[id]/cin/route.ts` (new)
- **Tests**: new uploads private; signed URL 5-min parent / 15-min admin / 30-min hard cap; old `documents.cin_*_url` purged or migrated; bucket policy refuses anon
- **Complexity**: M (1 day)
- **Compliance gain**: PARENT +12 (closes CANON-PARENT-004 + ADMIN-014)
- **Founder dep**: F14

### 12. **PARENT-FIX-3** — notifications/activity_logs sweep → user_notifications + audit_log
- **Files**: `app/api/parent/teens/route.ts:90,101`, `app/api/parent/teens/create/route.ts:197,207`, `app/api/parent/budget/route.ts:101,113`, `app/api/parent/grades/route.ts:295`, `app/api/parent/live/route.ts:378`, `app/api/teen/messages/route.ts:234-249`, `app/api/circles/report/route.ts:159`
- **Tests**: each route writes to `user_notifications` (verified by canon shape); deprecated tables get 0 new writes; CI rule from Wave 0 prevents regression
- **Complexity**: S (0.5 day)
- **Compliance gain**: PARENT +5 + SOCIAL +3 + cross-cut

### 13. **AI-FIX-1** — PII scrubber + model env + distress reaction
- **Files**: `lib/ai/context-engine.ts:81-95,152-157,243-251`, `app/api/agent/action/route.ts:114-118,148-161`, `app/api/teen/avatar-coach/route.ts:59-78,263-265,101-124`, `lib/ai/providers/factory.ts:13,18`, `lib/ai/provider.ts:15`
- **Tests**: snapshot — prompt for full_name='Yassine Benali' contains neither name token; factory respects OPENAI_MODEL_ID/CLAUDE_MODEL_ID env; self-harm token → user_notifications to parent + teens.coach_locked_until set + MA hotline appended
- **Complexity**: M (1 day)
- **Compliance gain**: AI +20 (closes CANON-AI-001 + AI-002 + AI-005 + AI-006)
- **Founder dep**: F54

### 14. **ROUTE-FIX-1** — 4 BLOCKER nav fixes + /gamification hub redirect
- **Files**: `app/gamification/page.tsx` (replace with permanentRedirect), `components/layouts/app-sidebar.tsx`, `components/dashboard/sidebar.tsx`, `components/dashboard/header.tsx` (delete or rewrite to canonical role-prefix), `components/layouts/mobile-dock.tsx:145,162,169,183,207,221`
- **Tests**: every nav link resolves; /gamification → 308 /teen; mobile dock all 6 broken targets re-pointed
- **Complexity**: S (0.75 day)
- **Compliance gain**: ROUTE +18 (closes CANON-ROUTE-001/002/003/004)

**Expected score after Wave 1**:
- AUTH 22 → 60
- ECON 38 → 75
- PARENT 38 → 70
- AI 62 → 87
- SOCIAL 38 → 50 (deprecated-table sweep + window.alert)
- ROUTE 42 → 65
- GAME 38 → 65
- **Composite ~52** — RISKY but launchable (parent-only invite, partner-light, no driver, no /admin/finances)

---

## Wave 2 — Social + gamification truth (week 3-4, ~5 agents)

**Goal**: feed/comments/circles/reports work end-to-end; gamification deprecations cleared; chores private bucket; /admin/moderation single inbox.

### 15. **SOCIAL-FIX-1** — user_reports table + universal report endpoint
- **Files**: migration `105_user_reports.sql` + `094_moderation_auto_restrict_trigger.sql`, `app/api/teen/feed/comments/route.ts:298-305`, `app/api/circles/report/route.ts:89-128`, `app/api/teen/report/route.ts` (new universal)
- **Tests**: report from feed/comment/circle/marketplace/profile inserts row; 3rd report flips visibility flag via trigger; admin reads pending; reporter cannot self-read others
- **Complexity**: M (1 day)
- **Compliance gain**: SOCIAL +14 + ADMIN +5 (closes CANON-SOCIAL-005 + SOCIAL-013 + SOCIAL-015 + ADMIN-006)
- **Founder dep**: F7

### 16. **SOCIAL-FIX-2** — audit_log canonical migration + sweep 28 callsites
- **Files**: migration `106_audit_log_canonical.sql` (rename admin_audit_logs → audit_log + reshape columns), `lib/auth/admin-permissions.ts:155-176` (.throwOnError + new shape), 28 callsites across app/api (refunds, topups, partners, moderation, content/review, broadcasts)
- **Tests**: each admin mutation writes audit_log row; insert error throws; INDEX cross-cut #7 grep returns 0 hits for admin_audit_logs
- **Complexity**: L (1.5 days)
- **Compliance gain**: ADMIN +18 + SOCIAL +5 (closes CANON-ADMIN-001/002 + SOCIAL-014 + PARTNER-019)

### 17. **SOCIAL-FIX-3** — Feed cursor 20/page + per-row user state + window.alert removal
- **Files**: `app/teen/feed/page.tsx:36-44`, `app/teen/feed/feed-list.tsx:35-50,122,129`, `app/teen/feed/post-card.tsx:87,94`, RPC migration `107_get_personalized_feed.sql` (or extend existing)
- **Tests**: page returns 20/page with cursor; per-row liked/saved/reported populated; report/block use sonner toast + a11y announce
- **Complexity**: M (1 day)
- **Compliance gain**: SOCIAL +12 + DESIGN +4 (closes CANON-SOCIAL-001 + SOCIAL-002 + SOCIAL-003 + DS-012)

### 18. **SOCIAL-FIX-4** — Comments thread UI + max-depth + length cap
- **Files**: `app/teen/feed/[id]/page.tsx:78-139`, `app/teen/feed/[id]/CommentsThread.tsx` (new), migration `108_add_feed_comment_depth_check.sql` + length CHECK
- **Tests**: comment composer renders; cursor 20/page; reply max depth 2 enforced server-side; length 500 enforced
- **Complexity**: L (1.5 days)
- **Compliance gain**: SOCIAL +10 (closes CANON-SOCIAL-004 + SOCIAL-005)

### 19. **SOCIAL-FIX-5** — DM realtime + missing friend routes
- **Files**: `app/teen/messages/messages-client.tsx:89-143` (subscribe `dm:${id}`, consume POST response, replace temp id, rollback on error), `app/api/teen/friends/[friend_user_id]/route.ts` (new DELETE), `.../block/route.ts` (POST/DELETE), `.../search/route.ts`, `app/api/teen/discover/route.ts`, migration `109_friend_request_expiry_7d.sql`
- **Tests**: peer message arrives via realtime; failed DM rolls back optimistic + toast; unfriend works; block prevents DM; expiry default 7 days
- **Complexity**: L (1.5 days)
- **Compliance gain**: SOCIAL +14 (closes CANON-SOCIAL-006 + SOCIAL-007 + SOCIAL-008 + SOCIAL-009 + SOCIAL-010 + SOCIAL-011 partial)

### 20. **GAME-FIX-1** — chore-evidence bucket + savings.withdrawn + quest.status fallback removal + sport validate
- **Files**: `components/teen/teen-chore-complete-button.tsx:56-59`, migration `110_savings_withdrawn_status.sql` + `withdraw_from_goal` RPC, `app/api/teen/quests/start/route.ts:77-80`, `app/api/teen/quests/complete/route.ts:55-58`, `app/api/teen/sport/challenges/route.ts:314-326`
- **Tests**: chore upload → chore-evidence bucket private path; savings status='withdrawn' accepted; quest start/complete don't write quests.status; sport validate=true requires admin/parent flip
- **Complexity**: M (1 day)
- **Compliance gain**: GAME +18 (closes CANON-GAME-008 + GAME-009 + GAME-010 + GAME-011 + GAME-013)

### 21. **GAME-FIX-2** — /gamification/* zone redirects + /teen/challenges + friend-defi decline
- **Files**: `app/gamification/page.tsx`, `app/gamification/parcours/page.tsx` (delete), `app/gamification/leaderboard/page.tsx`, `app/gamification/roue/page.tsx`, `app/gamification/collections/page.tsx`, `app/teen/challenges/page.tsx`, `app/teen/quests/friend-defis/friend-defis-client.tsx:204`
- **Tests**: each → permanentRedirect; teen sidebar links updated to canonical; decline POSTs to /decline
- **Complexity**: S (0.5 day)
- **Compliance gain**: GAME +8 + ROUTE +6 (closes CANON-GAME-004 + GAME-006 + GAME-007 + ROUTE-014)
- **Founder dep**: F11

### 22. **ADMIN-FIX-1** — /admin/moderation single inbox + moderate_content RPC + 4 deprecation redirects
- **Files**: `app/admin/moderation/page.tsx` (new), migration `111_moderate_content_rpc.sql`, `app/admin/proofs/page.tsx` + `creator-moderation/page.tsx` + `content/review/page.tsx` + `marketplace/page.tsx` (replace with redirects), `app/api/admin/moderation/[id]/decide/route.ts` (consolidated)
- **Tests**: tab filter ?type= renders correct queue; RPC dispatches dispatcher per content_type; 4 old routes → 308
- **Complexity**: L (2 days)
- **Compliance gain**: ADMIN +12 (closes CANON-ADMIN-005 + indirectly ADMIN-006 ack)
- **Founder dep**: F7

### 23. **ADMIN-FIX-2** — /admin/scripts-sql ring-fence
- **Files**: `app/admin/scripts-sql/page.tsx:59-110` (top: requireAdminPermission('system.sql') + ENABLE_ADMIN_SQL_EXECUTION env check + audit_log render), `components/layouts/admin-sidebar.tsx:80-83` (gate to super_admin only)
- **Tests**: non-super_admin gets redirect; missing env → 410; every render writes audit_log
- **Complexity**: XS (0.25 day)
- **Compliance gain**: ADMIN +6 (closes CANON-ADMIN-011 + ROUTE-017)

### 24. **DESIGN-FIX-1** — NotificationBell aria + raw palette sweep + touch targets
- **Files**: `components/notifications/notification-bell.tsx:105-215`, `components/ui/select.tsx:41`, `components/ui/tabs.tsx:29,41`, `components/ui/input-otp.tsx:54`, `components/ui/parallax-container.tsx:1-12,48`, `components/ui/button.tsx:92,97,112`
- **Tests**: aria-label populated; 21 raw utilities → semantic tokens; min-h-11 enforced; reduced-motion guard added; text-on-bright replaces text-white
- **Complexity**: M (1 day)
- **Compliance gain**: DESIGN +14 (closes CANON-DS-001..006)

**Expected score after Wave 2**:
- AUTH 60 → 75 (no new tickets but Wave 1 stabilizes)
- ECON 75 → 80
- PARENT 70 → 78
- AI 87 → 90
- SOCIAL 50 → 80
- ROUTE 65 → 78
- GAME 65 → 85
- ADMIN 22 → 60
- DESIGN 62 → 80
- **Composite ~73** — UNBLOCKED for closed beta

---

## Wave 3 — Partner + supply activation (week 5-7, ~6 agents)

**Goal**: partner ecosystem reachable; KYC works end-to-end; mentor + driver surfaces ratified; finance admin shipped.

### 25. **PARTNER-FIX-1** — register_partner RPC + admin activate transaction
- **Files**: migration `112_register_partner_rpc.sql` + `partner_pending_credentials` table, `app/api/partners/wizard/submit/route.ts` (new), `app/api/admin/partners/[id]/activate/route.ts` (new), `app/api/admin/partners/[id]/approve/route.ts:62-66` (delegate)
- **Tests**: wizard submit → auth.users + profiles + partners(pending) + credentials row; activate → atomic 6-step; partner can log in; mid-fail rolls back
- **Complexity**: L (2 days)
- **Compliance gain**: PARTNER +14 + AUTH +6 (closes CANON-PARTNER-001/002 + AUTH-002 + PARTNER-021)
- **Founder dep**: F21

### 26. **PARTNER-FIX-2** — qr_nonces + apply_partner_offer RPC + scanner v1 format
- **Files**: migration `113_qr_nonces_apply_offer.sql`, `app/api/partner/verify-card/route.ts:47-54` (v1 parse + HMAC), `app/api/partner/apply-discount/route.ts:118-240` (call RPC, drop silent catches)
- **Tests**: signed v1 QR succeeds; replay rejected; concurrent apply → exactly one success; idempotency_key UNIQUE; discount_usage row written atomically
- **Complexity**: M (1.5 days)
- **Compliance gain**: PARTNER +12 (closes CANON-PARTNER-003/004 + PARTNER-006 + PARTNER-007)

### 27. **PARTNER-FIX-3** — partner_offers.status moderation + edit endpoint canonical columns
- **Files**: migration `114_partner_offers_status_lifecycle.sql`, `app/api/partner/offers/route.ts:230-253` (default=pending), `app/api/admin/partners/offers/[id]/decision/route.ts` (new), `app/api/partner/offers/[id]/route.ts:69-141` (canonical column names)
- **Tests**: create → status='pending_approval', is_active=false; admin approve flips both; CHECK enforces; PATCH canonical names
- **Complexity**: M (1 day)
- **Compliance gain**: PARTNER +8 (closes CANON-PARTNER-005 + PARTNER-013/014)

### 28. **PARTNER-FIX-4** — KYC upload UI + admin /admin/kyc unified surface
- **Files**: `app/devenir-{archetype}/kyc/page.tsx` (new × archetypes), `app/api/partner/kyc/upload/route.ts` (new), `app/admin/kyc/page.tsx` (new), `app/api/admin/kyc/[id]/decision/route.ts` (new), migration `115_kyc_subject_kind_check.sql` + `admin_approve_driver` RPC + storage policy `kyc_admin_read`
- **Tests**: signed-link upload private; admin sees pending; subject_kind enum enforced; admin_approve_driver atomically flips
- **Complexity**: L (2 days)
- **Compliance gain**: PARTNER +10 + ADMIN +12 (closes CANON-PARTNER-009 + ADMIN-009)

### 29. **AUTH-FIX-5** — /devenir-mentor surface + mentor wizard
- **Files**: `app/devenir-mentor/page.tsx` + `/candidature/page.tsx` (new), `app/api/mentor/apply/route.ts` (extend KYC docs), `app/mentor/onboarding/{kyc-pending,profile,availability}/page.tsx` (new × 3), `app/mentor/page.tsx` (redirect → dashboard)
- **Tests**: anon → /auth/sign-up?role=mentor; submit → role flip; KYC private bucket; tier flip pending → intro_only opens profile
- **Complexity**: L (4 days)
- **Compliance gain**: AUTH +10 + LIFE +4 (closes CANON-AUTH-007 + LIFE-008 partial + ROUTE-020)
- **Founder dep**: F20, F32, F34

### 30. **AUTH-FIX-6** — /devenir-chauffeur + driver apply + (per F42) API-only or full UI
- **Files**: `app/devenir-chauffeur/page.tsx` + `/candidature/page.tsx`, `app/api/driver/apply/route.ts`, `app/api/driver/onboarding/complete/route.ts`. If F42=A: `app/driver/dashboard/page.tsx` + `/rides/[id]/page.tsx`. If F42=B: skip UI, ship API-only.
- **Tests**: candidature → role='driver' + nivy_drivers(kyc='pending'); /auth/redirect routes per F42 outcome; /driver/* gated if built
- **Complexity**: L (3 days API-only / 5 days full UI)
- **Compliance gain**: AUTH +8 + LIFE +6 + PARTNER +4 (closes CANON-AUTH-008 + LIFE-007 + LIFE-008 partial + PARTNER-020)
- **Founder dep**: F2, F30, F31, F42

### 31. **ADMIN-FIX-3** — /admin/finances tabbed surface + 6 finance RPCs + refunds table
- **Files**: `app/admin/finances/page.tsx` (4 tabs), migration `116_finances_canonical.sql` (refunds + 6 RPCs: refund_booking, refund_food_order, refund_marketplace, reverse_topup, release_partner_payout, mark_partner_payout_failed), `app/api/admin/refunds/route.ts:61` (admin/super_admin only)
- **Tests**: each RPC inserts paired escrow; admin tabs all functional; D6 two-person rule on partial refunds ≥ 200 DH
- **Complexity**: L (3 days)
- **Compliance gain**: ADMIN +14 + ECON +4 + LIFE +4 (closes CANON-ADMIN-007 + ECON-015 remainder + LIFE-001/002 remainder)

### 32. **PARENT-FIX-4** — Parent wizard chain + e-signature + spend-mode
- **Files**: `app/onboarding/parent/{e-signature,add-teen,topup,spend-mode}/page.tsx` (new × 4), `app/api/parent/e-signature/route.ts` (POST endpoint), `app/api/parent/onboarding/complete/route.ts` (preconditions: signed_at NOT NULL, etc.)
- **Tests**: post-signup parent → /onboarding/parent/e-signature; cannot reach dashboard until complete returns success; complete fails 412 on missing precondition
- **Complexity**: L (3 days)
- **Compliance gain**: AUTH +6 + PARENT +6 (closes CANON-AUTH-010 + PARENT-019 partial)
- **Founder dep**: F14

### 33. **LIFE-FIX-1** — Internship/pathway detail pages + mentor session UI hooks
- **Files**: `app/teen/internships/[id]/page.tsx` (new), `app/teen/pathways/[slug]/page.tsx` (new), `app/teen/mentor-sessions/page.tsx:101` (render meeting_url), migration `117_pathway_milestones.sql` + `advance_pathway_milestone` RPC
- **Tests**: detail page renders; apply button works; meeting URL renders within window
- **Complexity**: L (2 days)
- **Compliance gain**: LIFE +6 (closes CANON-LIFE-005 + LIFE-006 + LIFE-016)
- **Founder dep**: F47

**Expected score after Wave 3**:
- AUTH 75 → 88
- ECON 80 → 88
- PARENT 78 → 85
- SOCIAL 80 → 82
- ROUTE 78 → 85
- GAME 85 → 88
- ADMIN 60 → 85
- LIFE 62 → 80
- PARTNER 22 → 78
- DESIGN 80 → 85
- **Composite ~84** — LAUNCH READY

---

## Wave 4 — Canon cleanup (week 8, ~3 agents)

**Goal**: deprecation closure, contradictions resolved, drift swept, score floor ≥ 80 every domain.

### 34. **CLEANUP-1** — Token rail 410 + shop legacy 410 + xp_shop_items drop
- **Files**: `app/api/teen/tokens/route.ts` (return 410), `app/api/teen/shop/route.ts` (return 410), migration `118_drop_legacy_token_rails.sql` (drop tables: token_types, token_sources, token_rewards, token_redemptions, token_transactions, token_transfers, xp_shop_items, user_purchases; drop columns: premium_tokens, seasonal_tokens, pending_tokens, token_multiplier, total_lifetime_tokens; drop RPCs: spend_tokens, add_tokens_to_user, transfer_tokens, claim_daily_bonus, deduct_user_xp, add_coins_to_user)
- **Tests**: routes return 410; drop migrations succeed; canonical paths still work
- **Complexity**: S (0.5 day)
- **Compliance gain**: ECON +4 (closes CANON-ECON-002 + ECON-003 + ECON-016 + ECON-020 + ECON-026)

### 35. **CLEANUP-2** — Currency formatter + shop history XP rename
- **Files**: `lib/payments/currency-formatter.ts` (new), `<CurrencyChip>` (new), migration `119_shop_purchases_xp_spent.sql` (column rename), `app/teen/shop/history/page.tsx:51,58,166,170,300-303`, `app/teen/wallet/wallet-hub-client.tsx` (drop ≈DH pill on XP card)
- **Tests**: snapshot formatCurrency(100,'xp')='100 XP' Zap icon; shop history reads xp_spent label='XP dépensés' Zap icon; wallet header DH pill only on shop tab
- **Complexity**: M (1 day)
- **Compliance gain**: ECON +6 (closes CANON-ECON-006 + ECON-019 + ECON-021)

### 36. **CLEANUP-3** — Influencer fold (per F3 ratification)
- **Files**: `app/devenir-influenceur/page.tsx` + `/candidature/page.tsx` (replace with permanentRedirect to ambassadeur), migration `120_ambassadors_track_column.sql`, migration `121_drop_influencer_campaigns.sql`
- **Tests**: candidature submits to ambassadors with track='influencer'; ambassadors.track CHECK; redirects 308; influencer_campaigns 410
- **Complexity**: S (0.5 day)
- **Compliance gain**: AUTH +3 + PARTNER +3 (closes CANON-AUTH-023 + ROUTE-031)
- **Founder dep**: F3 (must ratify INDEX recommendation)

### 37. **CLEANUP-4** — Subscription tier vocabulary unification (Free/Silver/Gold/Platinum vs starter/pro/elite/family)
- **Files**: `components/dashboard/parent/sidebar.tsx:39-58`, all surfaces using tier strings, migration `122_subscription_tier_vocab_lock.sql` (DB chooses one set per F52 ratification)
- **Tests**: single tier vocabulary across UI + DB; sidebar conditionals match canonical set
- **Complexity**: M (1 day)
- **Compliance gain**: PARENT +3 + DESIGN +2 (closes CANON-PARENT-010 + ROUTE-037)
- **Founder dep**: F52

### 38. **CLEANUP-5** — /admin/audit-log + /admin/broadcasts + /admin/support builds
- **Files**: `app/admin/audit-log/page.tsx` (new), `app/admin/broadcasts/page.tsx` (new), `app/admin/support/page.tsx` (new), migrations `123_broadcasts.sql` + `124_support_tickets.sql` + cron `support-sla-check`
- **Tests**: audit-log shows canonical rows; broadcast composer enqueues; support tickets accept first message + SLA computed
- **Complexity**: L (3 days)
- **Compliance gain**: ADMIN +8 (closes CANON-ADMIN-008 + ADMIN-010)
- **Founder dep**: F8, F39

### 39. **CLEANUP-6** — partner_type-aware sidebar + 11 archetype landings (gradual)
- **Files**: `components/dashboard/partner/sidebar.tsx:17-26` (per-type filter), 9 missing /devenir-* landings (food/coach/teacher/event-organizer/birthday-host scaffolded; 4 already partial)
- **Tests**: sidebar reflects partner.type; 11 archetypes have at minimum a landing page
- **Complexity**: L (3 days for sidebar + scaffold; full builds in V1.5)
- **Compliance gain**: PARTNER +6 + ROUTE +3 (closes CANON-PARTNER-011 partial + PARTNER-012 partial + ROUTE-016)

### 40. **CLEANUP-7** — Allowance cron schedule + curfew per-teen + reconciliation cron
- **Files**: `vercel.json` (06:00 Africa/Casablanca for allowance), migration `125_teen_curfew_settings.sql`, `app/api/cron/ride-curfew-check/route.ts:30-34`, `app/api/cron/reconciliation/route.ts` (new)
- **Tests**: allowance fires 06:00 local; per-teen curfew override honored; reconciliation finds drift
- **Complexity**: M (1 day)
- **Compliance gain**: PARENT +6 + LIFE +2 (closes CANON-PARENT-007 + PARENT-024 + PARENT-027 + PARENT-028)
- **Founder dep**: F10

### 41. **CLEANUP-8** — Mystery box hide + parental_limits + per-month caps
- **Files**: migration `126_hide_mystery_box.sql` (UPDATE shop_rewards SET is_active=false WHERE category='mystery_box'), migration `127_parental_limits.sql` + check inside top_up_teen/spend_teen_coins/buy_listing/book_mentor_session/place_food_order/request_ride
- **Tests**: get_shop_rewards excludes mystery_box; cap exceeded rejected; category whitelist enforced
- **Complexity**: M (1.5 days)
- **Compliance gain**: ECON +5 + PARENT +4 (closes CANON-ECON-022 + ECON-023 + PARENT-031 + PARENT-049)
- **Founder dep**: F6, F49, F51

### 42. **CLEANUP-9** — Friend-defi /new + missing useOptimistic surfaces + PullToRefresh on 3 missing pages
- **Files**: `app/teen/quests/friend-defis/new/page.tsx` (new), 5 missing optimistic surfaces (follow/unfollow, cart-add, mentor-session-book, food-order, quest-complete), `app/teen/notifications`/`app/marketplace`/`app/teen/rides` PullToRefresh wrap
- **Tests**: /new dispatches v2 RPC; rollback toast `Réessayer` action fires on each new optimistic flow; 10/10 surfaces have PullToRefresh
- **Complexity**: M (1.5 days)
- **Compliance gain**: GAME +3 + DESIGN +6 (closes CANON-GAME-015 + DS-008/009/010)

**Expected score after Wave 4**:
- AUTH 88 → 92
- ECON 88 → 95
- PARENT 85 → 92
- SOCIAL 82 → 88
- ROUTE 85 → 90
- GAME 88 → 92
- ADMIN 85 → 92
- LIFE 80 → 88
- PARTNER 78 → 85
- DESIGN 85 → 92
- AI 90 → 92
- **Composite ~90** — LAUNCH READY (production)

---

## Final state forecast

After 4 waves: **overall ≥ 90, 0 P0 hard-blockers, ≤ 5 P1, ≤ 20 P2/P3**.

Remaining items deferred to V1.5+:
- F47 milestone primitive full content seed
- F26 multi-role profile_roles implementation
- F50 18th-birthday wallet handoff
- F52 subscription billing rail
- /partner/awards (P0 missing route — schedule with Wave 3 if calendar allows)
- Recovery/edge cases (account export, account delete, /admin/cndp surface)
- Storybook (decided NO per F18)
- PPR (decided V1.5 per F17)

---

## Calendar

| Week | Wave | Agents | Output |
|---|---|---|---|
| 0 | Freeze | 1 | CI rules in place; pre-commit hooks live |
| 1-2 | 1 | 6 | Identity + money truth; AI PII fix; nav unblocked |
| 3-4 | 2 | 5 | Social + gamification + audit_log + admin moderation |
| 5-7 | 3 | 6 | Partner ecosystem + KYC + mentor + driver + finances |
| 8 | 4 | 3 | Cleanup + deprecation closure + observability |

Total: 8 calendar weeks, ~21 engineer-weeks (3 senior + 3 mid).

---

## Dependencies on founder decisions

Founder ratifications must land before each wave starts:

**Before Wave 1:**
- **F1** (self-signup vs parent-invited): determines validate-teen route final shape; recommendation = parent-invited only
- **F2** (driver as role): blocks role enum CHECK migration; recommendation = first-class
- **F5** (auto-topup launch): determines whether top-up form ships behind PSP_AUTO_TOPUP_ENABLED flag; recommendation = manual at launch
- **F14** (CIN TTL): determines parent-cin signed URL durations; recommendation = 5/15/30
- **F22** (is_onboarded reset on role change): trigger ON or OFF; recommendation = ON
- **F23** (email confirmation enforcement): Supabase config; recommendation = hard for parent/partner/mentor/driver/ambassador
- **F25** (e-money license partner): blocks any auto-DH top-up rail launch; recommendation = B+D combined
- **F54** (Kai persona lock): determines AvatarCoach prompt unification

**Before Wave 2:**
- **F7** (single moderation inbox): determines /admin/moderation vs per-type queues; recommendation = single
- **F11** (defis-physiques merge): determines redirect target for /teen/defis-physiques; recommendation = merge into /teen/quests?tab=body
- **F39** (logs vs audit-log): determines /admin/logs deprecation; recommendation = collapse to /admin/audit-log

**Before Wave 3:**
- **F3** (influencer fold): inter-canon contradiction MUST be ratified; recommendation = fold into ambassador (per INDEX)
- **F4** (coach/teacher modeling): determines /devenir-coach + /devenir-teacher flow shape
- **F8** (support sub-role): build /admin/support or remove enum; recommendation = keep + build
- **F20** (mentor KYC tier-gate): determines mentor onboarding wizard preconditions
- **F21** (partner auto-create at apply): determines register_partner RPC final shape
- **F30/F31** (driver KYC sourcing): determines aggregator-vs-own driver pool sequencing
- **F32** (mentor compensation): finalizes mentor payout schema
- **F42** (driver UI scope): API-only (B) cuts AUTH-FIX-6 from 5d to 3d

**Before Wave 4:**
- **F6** (top-up cap per parent per month): finalizes parental_limits caps
- **F10** (curfew per-parent override): finalizes teen_curfew_settings table
- **F49** (per-teen spend cap): finalizes parental_limits across spend RPCs
- **F51** (mystery box compliance): determines whether catalog rows hidden permanently or deterministic-ladder rebuild
- **F52** (subscription billing): determines tier vocabulary cutover
- **F53** (savings cancellation policy): determines release_from_goal reason branching

**Inter-canon contradictions blocking ratification:**
- **F3** (influencer): INDEX + auth lock FOLD; partner-ecosystem 8.3 locks SPLIT — founder must pick one and re-lock the losing file
- **F12** (circles vs crews): INDEX says crews demoted; social-feed §D1 says KEEP BOTH as tabs — minor, both agree URL is /teen/circles
- **F2 vs F42** (driver UI scope): not a true contradiction once parsed, but founder should ratify both together to avoid scope confusion
