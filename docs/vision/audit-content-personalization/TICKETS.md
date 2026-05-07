# Nivy — Tickets (Wave Plan)

> 50 atomic tickets, one per downstream sub-agent. Each ticket has a clear
> file scope, acceptance criteria, and dependencies. Cross-reference
> `MASTER_AUDIT.md` for the gap each ticket closes.

Conventions:
- **Files** are absolute under `C:\Users\Shadow\Desktop\NIVY\`.
- **DB target**: project `imchornjvmgmaovhypco`.
- **P0** = launch-blocker for V1.2; **P1** = personalization core;
  **P2** = polish/V1.3.
- **S** ≈ 1 h, **M** ≈ 4 h, **L** ≈ 1 day.

---

## Domain: QUIZ (12 tickets)

### TICKET-001 [quiz] Backfill tags on `educational_quizzes`
- **Domain**: quiz
- **Priority**: P0
- **Type**: data-fix
- **Files**: new migration `gamification-system/database/migrations/070_seed_quiz_tags.sql`
- **Acceptance**: every active row in `educational_quizzes` has ≥2
  tags from `interest_taxonomy` (50-tag closed set). Verify
  `SELECT COUNT(*) FILTER (WHERE array_length(tags,1)>=2) = COUNT(*)
  FROM educational_quizzes WHERE is_active`.
- **Effort**: M
- **Dependencies**: none

### TICKET-002 [quiz] Backfill tags on `mission_templates`
- **Domain**: quiz / personalization
- **Priority**: P0
- **Type**: data-fix
- **Files**: new migration `…/071_seed_mission_tags.sql`
- **Acceptance**: 30/30 templates tagged with ≥1 canonical tag from
  Appendix A.
- **Effort**: M
- **Dependencies**: none

### TICKET-003 [quiz] Backfill tags on `physical_challenges` + missing `image_url`
- **Domain**: quiz
- **Priority**: P1
- **Type**: schema + data
- **Files**: `…/072_physical_challenges_polish.sql`,
  `app/teen/defis-physiques/defis-physiques-client.tsx`
- **Acceptance**: ALTER TABLE adds `image_url TEXT`; 5/5 rows tagged
  + image_url populated; DefiCard renders the image.
- **Effort**: S
- **Dependencies**: none

### TICKET-004 [quiz] Surface `curated_content_library` in the runner
- **Domain**: quiz
- **Priority**: P1
- **Type**: feature
- **Files**: `lib/quiz/server.ts` (extend `getDailyQuizForTeen` fallback),
  optionally a UNION VIEW `educational_quizzes_unified`.
- **Acceptance**: when no AI-generated quiz exists for the teen, the
  recommender picks from the 30-row library; teen can complete it like
  any quiz.
- **Effort**: M
- **Dependencies**: TICKET-001

### TICKET-005 [quiz] Update AI provider model IDs
- **Domain**: quiz / ai-content
- **Priority**: P0
- **Type**: bug-fix
- **Files**: `lib/ai/content-generator.ts:78`,
  `lib/ai/providers/openai.ts`, `lib/ai/providers/claude.ts`
- **Acceptance**: default Claude model = `claude-sonnet-4-5` (or
  current); default OpenAI = `gpt-5.1-mini` (or current); manual probe
  via `app/api/admin/content/generate` returns 200.
- **Effort**: S
- **Dependencies**: env vars set

### TICKET-006 [quiz] Wire CRON_SECRET in prod and verify daily-content cron run
- **Domain**: quiz
- **Priority**: P0
- **Type**: ops
- **Files**: `vercel.json`, env config
- **Acceptance**: `daily_content_schedule` shows ≥1 row with
  `status='completed'` after 24h.
- **Effort**: S
- **Dependencies**: TICKET-005

### TICKET-007 [quiz] Cohort-scoped delivery (don't broadcast AI quiz globally)
- **Domain**: quiz / personalization
- **Priority**: P1
- **Type**: schema + feature
- **Files**: new migration adding `educational_quizzes.cohort_key TEXT`
  + GIN index, `lib/quiz/server.ts`,
  `app/api/cron/generate-daily-content/route.ts:267-281`,
  `gamification-system/database/migrations/052_recommend_for_teen_v1.sql`
  (filter on cohort_key)
- **Acceptance**: a teen at `4eme/public/maroc/fr` only sees AI quizzes
  whose `cohort_key` matches OR is NULL.
- **Effort**: L
- **Dependencies**: TICKET-001

### TICKET-008 [quiz] Pedagogical reviewer admin queue
- **Domain**: quiz
- **Priority**: P1
- **Type**: feature
- **Files**: `app/admin/content/review/page.tsx` (NEW),
  `app/api/admin/content/review/[id]/route.ts` (NEW),
  reads `content_validations` (now 0 rows).
- **Acceptance**: admin can list pending validations, approve/reject;
  approved quizzes flip `is_active=true` in `educational_quizzes`.
- **Effort**: L
- **Dependencies**: TICKET-006

### TICKET-009 [quiz] Don't burn quiz on impression — only on `start`
- **Domain**: quiz
- **Priority**: P1
- **Type**: bug-fix
- **Files**: `lib/quiz/server.ts:155-160`,
  `app/api/teen/quiz/[id]/route.ts`
- **Acceptance**: `quiz_seen_history` upsert moves out of the
  RSC fetcher into the quiz-runner (server action on first
  question render).
- **Effort**: S
- **Dependencies**: none

### TICKET-010 [quiz] Wire signal capture on quiz complete + abandon
- **Domain**: quiz / personalization
- **Priority**: P0
- **Type**: feature
- **Files**: `app/api/teen/quiz/submit/route.ts`,
  `app/teen/quiz/[id]/quiz-runner-client.tsx`
- **Acceptance**: on submit, POST `/api/teen/signals/record` with
  `signal_type='complete'|'abandon'`, `target_type='quiz'`. Verify
  `behavioral_signals` row count grows.
- **Effort**: S
- **Dependencies**: none

### TICKET-011 [quiz] Add language filter to RPC + runner
- **Domain**: quiz
- **Priority**: P1
- **Type**: feature
- **Files**: migration extending RPC,
  `lib/quiz/server.ts`
- **Acceptance**: a teen with `primary_language='ar'` does not receive
  FR-only quizzes when AR ones exist; current FR-only DB shows graceful
  fallback.
- **Effort**: M
- **Dependencies**: TICKET-007

### TICKET-012 [quiz] Wire AvatarCoach to `recommend_for_teen` quiz tease
- **Domain**: quiz
- **Priority**: P1
- **Type**: feature
- **Files**: `components/teen/avatar-coach.tsx`,
  `components/teen/avatar-coach-client.tsx`,
  `app/api/teen/recommendations/route.ts`
- **Acceptance**: avatar greeting includes a 1-line quiz teaser pulled
  from `recommend_for_teen('quiz', 1)`.
- **Effort**: M
- **Dependencies**: TICKET-001, TICKET-010

---

## Domain: PARENT-DEFI (5 tickets)

### TICKET-013 [parent-defi] Multi-parent verification rule
- **Domain**: parent-defi
- **Priority**: P1
- **Type**: feature
- **Files**: `app/api/parent/chores/[id]/verify-completion/route.ts`,
  potentially new RPC `verify_chore_completion`.
- **Acceptance**: any linked parent (`family_members.role='parent'`)
  may verify; first-wins; `parent_verified` becomes immutable once set.
- **Effort**: M
- **Dependencies**: none

### TICKET-014 [parent-defi] Photo evidence private bucket + signed URLs
- **Domain**: parent-defi
- **Priority**: P0 (privacy)
- **Type**: feature
- **Files**: new Supabase bucket `chore-evidence` (private),
  `app/api/teen/chores/[id]/complete/route.ts`,
  `app/parent/chores/[id]/page.tsx` (signed URL render)
- **Acceptance**: bucket is non-public; teen upload writes
  `evidence_url`; parent UI fetches via signed URL with 7-day TTL.
- **Effort**: M
- **Dependencies**: none

### TICKET-015 [parent-defi] Coach hook surfaces open chores
- **Domain**: parent-defi / personalization
- **Priority**: P2
- **Type**: feature
- **Files**: `components/teen/avatar-coach.tsx`,
  `lib/server/unified-quest-engine.ts`
- **Acceptance**: when a teen has an open chore, avatar message includes
  it ("Maman a promis 100 DH pour 5 vaisselles").
- **Effort**: S
- **Dependencies**: TICKET-012

### TICKET-016 [parent-defi] Sibling fan-out (one chore → N teens)
- **Domain**: parent-defi
- **Priority**: P2
- **Type**: feature
- **Files**: `app/parent/chores/new/page.tsx`,
  `app/api/parent/chores/create/route.ts`,
  schema may add `parent_chore_targets` join table.
- **Acceptance**: parent picks ≥1 teen; one row per teen (or one row +
  N targets); independent completion tracking.
- **Effort**: M
- **Dependencies**: none

### TICKET-017 [parent-defi] Recurrence period auto-archive cron
- **Domain**: parent-defi
- **Priority**: P1
- **Type**: feature
- **Files**: new cron `app/api/cron/parent-chore-rollover/route.ts`,
  `vercel.json`
- **Acceptance**: a `weekly` chore archives at end of period; new
  period creates fresh completion window if `is_active=true`.
- **Effort**: M
- **Dependencies**: none

---

## Domain: FRIEND-DEFI (7 tickets)

### TICKET-018 [friend-defi] Schema audit + extend `friend_challenges`
- **Domain**: friend-defi
- **Priority**: P0
- **Type**: schema
- **Files**: new migration `…/073_friend_challenges_v2.sql`
- **Acceptance**: add `opponent_id UUID`, `acceptance_status`,
  `progress_creator INT`, `progress_opponent INT`,
  `evidence_url TEXT`, `xp_pot INT`, RLS enforcing creator/opponent
  read.
- **Effort**: M
- **Dependencies**: none

### TICKET-019 [friend-defi] API: create / accept / decline / progress
- **Domain**: friend-defi
- **Priority**: P0
- **Type**: feature
- **Files**: NEW `app/api/teen/friend-challenges/route.ts`,
  `app/api/teen/friend-challenges/[id]/accept/route.ts`,
  `app/api/teen/friend-challenges/[id]/progress/route.ts`,
  `app/api/teen/friend-challenges/[id]/resolve/route.ts`
- **Acceptance**: 4 endpoints that mutate the table with RLS; XP-stake
  escrow via existing `xp_transactions`.
- **Effort**: L
- **Dependencies**: TICKET-018

### TICKET-020 [friend-defi] UI: tab on `/teen/quests`
- **Domain**: friend-defi
- **Priority**: P0
- **Type**: feature
- **Files**: `app/teen/quests/quests-hub-client.tsx`,
  new `app/teen/quests/friend-defis/page.tsx` or modal
- **Acceptance**: visible 4th tab "Défis amis"; lists active +
  pending; CTA "lancer un défi".
- **Effort**: M
- **Dependencies**: TICKET-019

### TICKET-021 [friend-defi] Opponent picker via `recommend_friends`
- **Domain**: friend-defi / personalization
- **Priority**: P1
- **Type**: feature
- **Files**: NEW `app/api/teen/recommend-friends/route.ts`,
  new RPC `recommend_friends`,
  picker component in TICKET-020 form
- **Acceptance**: form suggests ≥3 opponents ranked by power_balance +
  interest overlap.
- **Effort**: L
- **Dependencies**: TICKET-019

### TICKET-022 [friend-defi] Resolution cron (winner determination)
- **Domain**: friend-defi
- **Priority**: P1
- **Type**: feature
- **Files**: NEW `app/api/cron/friend-challenge-resolve/route.ts`,
  `vercel.json`
- **Acceptance**: at `ends_at` close, picks winner (or draw), settles
  XP pot, writes `xp_transactions` rows for both sides, sends
  `user_notifications`.
- **Effort**: M
- **Dependencies**: TICKET-019

### TICKET-023 [friend-defi] Notification templates
- **Domain**: friend-defi
- **Priority**: P2
- **Type**: feature
- **Files**: `notification_templates` seed migration; webhook hooks in
  TICKET-019 / TICKET-022
- **Acceptance**: 4 new templates: invite, accept, ends-soon, resolved.
- **Effort**: S
- **Dependencies**: TICKET-022

### TICKET-024 [friend-defi] Delete `app/gamification/defis/page.tsx` legacy redirect after consolidation
- **Domain**: friend-defi
- **Priority**: P2
- **Type**: cleanup
- **Files**: `app/gamification/defis/page.tsx`,
  `app/gamification/defis/challenges-client.tsx`
- **Acceptance**: route returns 404 after redirect-cleanup window;
  no broken links elsewhere (grep clean).
- **Effort**: S
- **Dependencies**: TICKET-020

---

## Domain: PARTNER-DEFI (6 tickets)

### TICKET-025 [partner-defi] Reconcile `partner_offers` ↔ `partner_discounts`
- **Domain**: partner-defi
- **Priority**: P0
- **Type**: schema + bug-fix
- **Files**: migration consolidating both tables (likely keep
  `partner_offers`, drop `partner_discounts` or vice-versa),
  `app/api/partner/offers/route.ts`,
  `app/api/partner/verify-card/route.ts`,
  `app/api/partner/apply-discount/route.ts`,
  `app/partner/offers/page.tsx`
- **Acceptance**: one canonical table; APIs read/write the same; no
  silent column drops on POST.
- **Effort**: L
- **Dependencies**: none

### TICKET-026 [partner-defi] Replace `/partner/offers` mock with live data
- **Domain**: partner-defi
- **Priority**: P0
- **Type**: bug-fix
- **Files**: `app/partner/offers/page.tsx:11-16`
- **Acceptance**: page reads from `partner_offers` filtered by current
  partner; no hardcoded array; empty state correct.
- **Effort**: S
- **Dependencies**: TICKET-025

### TICKET-027 [partner-defi] Add `offer_type='challenge'` and quest-completion capture
- **Domain**: partner-defi
- **Priority**: P1
- **Type**: feature
- **Files**: schema add CHECK or enum to `offer_type`, new RPC
  `complete_partner_challenge(teen_id, offer_id)`, new endpoint
  `app/api/partner/challenges/[id]/check-in/route.ts`,
  scanner integration `app/partner/scanner/page.tsx`
- **Acceptance**: a partner posts "Visit our store this week = 200 XP";
  teen scan at the venue resolves to XP grant via the existing scanner
  pipeline.
- **Effort**: L
- **Dependencies**: TICKET-025

### TICKET-028 [partner-defi] Teen-side partner-offer discovery surface
- **Domain**: partner-defi / personalization
- **Priority**: P1
- **Type**: feature
- **Files**: NEW `app/teen/offres/page.tsx`,
  `app/api/teen/recommendations/route.ts` already supports
  `?type=partner_offer`
- **Acceptance**: teen sees ranked offers (city + interests filter);
  click logs `behavioral_signals.click`.
- **Effort**: M
- **Dependencies**: TICKET-001-style backfill of partner_offer tags

### TICKET-029 [partner-defi] Strip mock from `<UniversalScanner>` / pick one scanner
- **Domain**: partner-defi
- **Priority**: P0
- **Type**: cleanup
- **Files**: `components/partner/universal-scanner.tsx`,
  `app/partner/dashboard/page.tsx` (which embeds the mock)
- **Acceptance**: only one scanner exists; dashboard uses the live
  `app/partner/scanner/page.tsx` API; mock file deleted or retained
  with `STORYBOOK_ONLY` flag.
- **Effort**: S
- **Dependencies**: TICKET-025

### TICKET-030 [partner-defi] Backfill tags on partner_offers (taxonomy match)
- **Domain**: partner-defi / personalization
- **Priority**: P1
- **Type**: data-fix
- **Files**: backfill SQL,
  `app/api/partner/offers/route.ts` (require ≥1 tag at write)
- **Acceptance**: every `partner_offers` row has ≥1 tag from Appendix A.
- **Effort**: S
- **Dependencies**: TICKET-025

---

## Domain: PERSONALIZATION (10 tickets)

### TICKET-031 [personalization] Onboarding interest chip selector
- **Domain**: personalization
- **Priority**: P0
- **Type**: feature
- **Files**: `components/onboarding/teen-setup-step.tsx`
  (extend with Step A from `personalization-engine.md:602-611`),
  `app/api/onboarding/interests/route.ts`
- **Acceptance**: new teen picks 5-10 tags from Appendix A; rows
  appear in `teen_interests`.
- **Effort**: M
- **Dependencies**: none

### TICKET-032 [personalization] Onboarding learning_style + archetype
- **Domain**: personalization
- **Priority**: P1
- **Type**: feature + schema
- **Files**: migration extending `teens` (already in 051),
  `components/onboarding/teen-setup-step.tsx`
- **Acceptance**: teen picks 1 of 4 learning styles; row updates
  `teens.learning_style`.
- **Effort**: M
- **Dependencies**: TICKET-031

### TICKET-033 [personalization] Wire `record_signal` into 6 hot paths
- **Domain**: personalization
- **Priority**: P0
- **Type**: feature
- **Files**: `app/api/teen/quiz/submit/route.ts`,
  mission-complete server actions in
  `lib/server/unified-quest-engine.ts`,
  `app/api/teen/chores/[id]/complete/route.ts`,
  `app/api/teen/shop/checkout/...` (existing redeem path),
  `app/teen/events/.../book` (existing),
  `components/teen/feed/*` (view impressions).
- **Acceptance**: each path emits a signal; `behavioral_signals` row
  count grows after manual exercising.
- **Effort**: L
- **Dependencies**: none

### TICKET-034 [personalization] Compute `teen_neighbours` (in-app, ≤10k teens)
- **Domain**: personalization
- **Priority**: P1
- **Type**: feature
- **Files**: extend `app/api/cron/evolve-teen-profiles/route.ts` to
  call a new `recompute_neighbours` RPC,
  new migration adding the RPC.
- **Acceptance**: after run, every teen with ≥10 signals has a
  `teen_neighbours` block (top 50). Currently 0 teens qualify but
  the path becomes deterministic.
- **Effort**: L
- **Dependencies**: TICKET-033

### TICKET-035 [personalization] Turn on collab + friend weights (`w2`, `w3`)
- **Domain**: personalization
- **Priority**: P1
- **Type**: data-update
- **Files**: UPDATE `recommendation_weights` SET `w2_collab=0.15,
  w3_friend=0.20, version=…` for `quiz`/`defi`/`event`/`offer`.
- **Acceptance**: `select w2_collab from recommendation_weights where
  is_active` returns >0; A/B comparison vs Sprint-2 baseline logged.
- **Effort**: S
- **Dependencies**: TICKET-034

### TICKET-036 [personalization] `recommend_friends` RPC + endpoint
- **Domain**: personalization
- **Priority**: P1
- **Type**: feature
- **Files**: new RPC migration,
  NEW `app/api/teen/recommend-friends/route.ts`,
  `app/teen/friends/page.tsx` (consume).
- **Acceptance**: returns ≤10 friend candidates ranked per
  `personalization-engine.md:362-371`.
- **Effort**: L
- **Dependencies**: TICKET-031

### TICKET-037 [personalization] Make mission assignment cron profile-aware
- **Domain**: personalization
- **Priority**: P1
- **Type**: feature
- **Files**: `gamification-system/database/migrations/*` extend
  `assign_missions_for_teen` RPC, `app/api/cron/assign-missions/route.ts`
- **Acceptance**: the assigned 3+3+3+1 mix is filtered by tags/affinity
  and difficulty_fit; each `user_missions` row has
  `assigned_via='profile'` if score-based, else `'fallback'`.
- **Effort**: L
- **Dependencies**: TICKET-002, TICKET-033

### TICKET-038 [personalization] Recommendation metrics daily rollup
- **Domain**: personalization
- **Priority**: P2
- **Type**: feature
- **Files**: new cron
  `app/api/cron/recommendation-metrics-rollup/route.ts`,
  `vercel.json`,
  reads `behavioral_signals` + `content_recommendations`,
  writes `recommendation_metrics_daily`.
- **Acceptance**: each day produces 1 row per content_type with
  acceptance/completion/diversity metrics.
- **Effort**: M
- **Dependencies**: TICKET-035

### TICKET-039 [personalization] Anti-manipulation caps (per spec §13)
- **Domain**: personalization
- **Priority**: P2
- **Type**: feature
- **Files**: `lib/analytics/signals.ts`,
  `app/api/teen/signals/record/route.ts`
- **Acceptance**: a teen exceeding 5 share + 5 favorite signals/day on
  the same item gets the surplus dropped; rate-limit metric in audit
  log.
- **Effort**: M
- **Dependencies**: TICKET-033

### TICKET-040 [personalization] `tag-normalize` cron (already registered, verify it runs)
- **Domain**: personalization
- **Priority**: P2
- **Type**: ops
- **Files**: `app/api/cron/tag-normalize/route.ts`
- **Acceptance**: free-text goals → canonical tag mapping logged in
  `admin_audit_logs`; unmapped queued for admin review.
- **Effort**: M
- **Dependencies**: none

---

## Domain: UI-COMPLETION (10 tickets)

### TICKET-041 [ui-completion] AvatarCoach v2 — chat loop
- **Domain**: ui-completion
- **Priority**: P1
- **Type**: feature
- **Files**: `components/teen/avatar-coach.tsx`,
  `components/teen/avatar-coach-client.tsx`,
  `app/api/teen/avatar-coach/route.ts` (NEW),
  `lib/ai/agent-actions.ts`
- **Acceptance**: greeting + 2-turn chat; cached 30 min per (teen,
  date, mission); mood expression mapped per spec §11.
- **Effort**: L
- **Dependencies**: TICKET-012

### TICKET-042 [ui-completion] Twin-currency gauge on `/teen` dashboard
- **Domain**: ui-completion
- **Priority**: P0
- **Type**: feature
- **Files**: `app/teen/page.tsx`,
  `components/teen/twin-currency-gauge.tsx` (exists)
- **Acceptance**: dashboard shows XP and coin balances side-by-side
  with progress to next level/redeem ceiling.
- **Effort**: S
- **Dependencies**: none

### TICKET-043 [ui-completion] PWA: manifest + service worker
- **Domain**: ui-completion
- **Priority**: P0
- **Type**: feature
- **Files**: `public/manifest.webmanifest` (NEW),
  `app/layout.tsx`, `next.config.js` (next-pwa wiring),
  `public/sw.js` (NEW)
- **Acceptance**: install prompt on Android Chrome; offline shell
  serves `/offline`; Lighthouse PWA score ≥85.
- **Effort**: L
- **Dependencies**: none

### TICKET-044 [ui-completion] Push subscriptions round-trip
- **Domain**: ui-completion
- **Priority**: P1
- **Type**: feature
- **Files**: `app/api/notifications/subscribe/route.ts` (NEW),
  `lib/notifications/push.ts` (NEW),
  `components/teen/push-permission-prompt.tsx` (NEW)
- **Acceptance**: a quiz reminder push arrives on a real device; row
  in `push_subscriptions`, then a `user_notifications` row marked
  delivered.
- **Effort**: L
- **Dependencies**: TICKET-043

### TICKET-045 [ui-completion] Mock pages → live: `partner/{kyc,payouts,invoices,support}`
- **Domain**: ui-completion
- **Priority**: P1
- **Type**: feature
- **Files**: `app/partner/kyc/page.tsx`,
  `app/partner/payouts/page.tsx`,
  `app/partner/invoices/page.tsx`,
  `app/partner/support/page.tsx`
- **Acceptance**: each reads real data (`kyc_documents`,
  `partner_payouts`, `payment_transactions`, `support_tickets`); no
  hardcoded arrays.
- **Effort**: L
- **Dependencies**: TICKET-025 (partners-table reconcile)

### TICKET-046 [ui-completion] Friends + messages real backend
- **Domain**: ui-completion
- **Priority**: P1
- **Type**: feature
- **Files**: `app/teen/friends/page.tsx`,
  `app/teen/messages/page.tsx`,
  new endpoints `app/api/teen/friends/...`,
  `app/api/teen/messages/...`
- **Acceptance**: friend add by code/QR; circles chat via
  `circle_messages`; no mock arrays.
- **Effort**: L
- **Dependencies**: TICKET-036

### TICKET-047 [ui-completion] Accessibility audit pass on critical surfaces
- **Domain**: ui-completion
- **Priority**: P1
- **Type**: polish
- **Files**: `app/partner/offers/page.tsx`,
  `app/teen/quests/quests-hub-client.tsx`,
  `app/parent/chores/page.tsx`,
  `components/ui/button.tsx` (focus-visible default)
- **Acceptance**: every icon-only button has aria-label;
  focus-visible ring on all interactive elements; AAA contrast on
  body text; eslint-plugin-jsx-a11y clean on changed files.
- **Effort**: M
- **Dependencies**: none

### TICKET-048 [ui-completion] Design-system color reconciliation
- **Domain**: ui-completion
- **Priority**: P2
- **Type**: polish
- **Files**: `tailwind.config.ts`, `app/globals.css`,
  components mentioning `gen-z-{lavender,mint,coral,sky}`.
- **Acceptance**: one canonical palette; `gen-z-*` either renamed or
  removed; visual diff captured in storybook if configured.
- **Effort**: L
- **Dependencies**: none

### TICKET-049 [ui-completion] Mobile 375px QA pass
- **Domain**: ui-completion
- **Priority**: P0
- **Type**: test
- **Files**: Playwright spec NEW
  `tests/e2e/mobile-375.spec.ts`
- **Acceptance**: 12 critical pages render with no horizontal scroll
  and CTAs visible at 375x812.
- **Effort**: M
- **Dependencies**: none

### TICKET-050 [ui-completion] Empty/loading/error state audit
- **Domain**: ui-completion
- **Priority**: P1
- **Type**: polish
- **Files**: every `app/teen/*/page.tsx`, every
  `app/parent/*/page.tsx`, every `app/partner/*/page.tsx`
- **Acceptance**: each page exposes a Suspense skeleton + empty state
  + ErrorBoundary fallback. Manual checklist signed-off.
- **Effort**: L
- **Dependencies**: TICKET-026, TICKET-045

---

## Summary

- **Quiz**: 12 tickets — 6 P0, 5 P1, 1 P2
- **Parent-defi**: 5 tickets — 1 P0, 2 P1, 2 P2
- **Friend-defi**: 7 tickets — 3 P0, 2 P1, 2 P2
- **Partner-defi**: 6 tickets — 3 P0, 3 P1, 0 P2
- **Personalization**: 10 tickets — 2 P0, 5 P1, 3 P2
- **UI-completion**: 10 tickets — 3 P0, 5 P1, 2 P2

**Total**: 50 tickets — **18 P0, 22 P1, 10 P2.**

Effort: ~12 S, ~21 M, ~17 L → ~7-8 dev-weeks for one engineer; with
20-agent parallelism per wave, see EXECUTION_PLAN.md.
