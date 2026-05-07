# Nivy — Execution Plan (50 tickets, 4 waves)

> Dispatch plan for the 50 tickets in `TICKETS.md`. Each wave runs sub-agents
> in parallel where file scopes don't conflict. Sequential dependencies are
> respected by wave ordering (foundations → parallel batches → validators).

Conventions:
- One sub-agent per ticket. Each agent gets a **scoped file allowlist** so
  parallel writes never clash.
- "**Read-scope**" lists files the agent may read for context but must NOT
  modify. "**Write-scope**" is the agent's write surface.
- Each wave ends with a smoke build + tsc check before the next wave kicks off.

---

## Wave 1 — Foundations (8 tickets, parallel)

Goal: unblock everything downstream. Tagging, schema reconciliation,
secrets, and the friend-challenges schema land first.

| Agent | Ticket | Write-scope (no overlap with siblings) |
|---|---|---|
| F1 | TICKET-001 (quiz tags) | `gamification-system/database/migrations/070_seed_quiz_tags.sql` |
| F2 | TICKET-002 (mission tags) | `…/071_seed_mission_tags.sql` |
| F3 | TICKET-003 (physical_challenges polish) | `…/072_physical_challenges_polish.sql`, `app/teen/defis-physiques/defis-physiques-client.tsx` |
| F4 | TICKET-005 (model IDs) | `lib/ai/content-generator.ts`, `lib/ai/providers/openai.ts`, `lib/ai/providers/claude.ts` |
| F5 | TICKET-006 (CRON_SECRET ops) | `vercel.json`, env config notes (no code) |
| F6 | TICKET-018 (friend_challenges v2 schema) | `…/073_friend_challenges_v2.sql` |
| F7 | TICKET-025 (partner_offers/discounts reconcile) | `…/074_partner_offers_consolidation.sql`, `app/api/partner/offers/route.ts`, `app/api/partner/verify-card/route.ts`, `app/api/partner/apply-discount/route.ts` |
| F8 | TICKET-031 (onboarding interest chips) | `components/onboarding/teen-setup-step.tsx`, `app/api/onboarding/interests/route.ts` |

Success criteria:
- All 8 migrations apply cleanly on a branch DB.
- Grep `claude-3-sonnet-20240229` returns 0 hits.
- `interest_taxonomy` query coverage on tagged rows ≥ 95% across
  `educational_quizzes`, `mission_templates`, `physical_challenges`.
- `friend_challenges_v2` columns visible.
- One canonical partner-offer table.

---

## Wave 2 — Parallel build A (20 tickets)

Goal: build the missing features on top of the new foundations. Maximum
parallelism with file-scope discipline.

### Quiz lane (5 agents)
| Agent | Ticket | Write-scope |
|---|---|---|
| Q1 | TICKET-004 (curated lib in runner) | `lib/quiz/server.ts` (only `getDailyQuizForTeen` fallback section) |
| Q2 | TICKET-007 (cohort-scoped delivery) | `…/075_quiz_cohort_key.sql`, `app/api/cron/generate-daily-content/route.ts:267-281`, `…/076_recommend_for_teen_v2.sql` |
| Q3 | TICKET-009 (don't burn quiz on impression) | `lib/quiz/server.ts` (lines 155-160 only), `app/api/teen/quiz/[id]/route.ts`, `app/teen/quiz/[id]/quiz-runner-client.tsx` |
| Q4 | TICKET-010 (signal capture) | `app/api/teen/quiz/submit/route.ts` |
| Q5 | TICKET-011 (language filter) | `…/077_quiz_language_filter.sql`, `lib/quiz/server.ts` (filter args only) |

### Friend-defi lane (5 agents — strictly serialized via file ownership)
| Agent | Ticket | Write-scope |
|---|---|---|
| FD1 | TICKET-019 (API: create/accept/progress/resolve) | `app/api/teen/friend-challenges/**/*` (NEW dir) |
| FD2 | TICKET-020 (UI tab) | `app/teen/quests/quests-hub-client.tsx`, `app/teen/quests/friend-defis/page.tsx` (NEW) |
| FD3 | TICKET-021 (opponent picker + recommend_friends RPC) | `…/078_recommend_friends.sql`, `app/api/teen/recommend-friends/route.ts` |
| FD4 | TICKET-022 (resolution cron) | `app/api/cron/friend-challenge-resolve/route.ts`, `vercel.json` (cron entry only) |
| FD5 | TICKET-023 (notif templates) | `…/079_friend_challenge_notifs.sql` |

### Partner-defi lane (3 agents)
| Agent | Ticket | Write-scope |
|---|---|---|
| PT1 | TICKET-026 (offers page live data) | `app/partner/offers/page.tsx` |
| PT2 | TICKET-029 (strip mock scanner) | `components/partner/universal-scanner.tsx`, `app/partner/dashboard/page.tsx` |
| PT3 | TICKET-030 (partner_offers tag backfill) | `…/080_partner_offer_tags.sql`, `app/api/partner/offers/route.ts` (only the validation block) |

### Parent-defi lane (3 agents)
| Agent | Ticket | Write-scope |
|---|---|---|
| PC1 | TICKET-013 (multi-parent verification) | `app/api/parent/chores/[id]/verify-completion/route.ts`, `…/081_chore_verify_rpc.sql` |
| PC2 | TICKET-014 (private bucket) | bucket policy SQL, `app/api/teen/chores/[id]/complete/route.ts`, `app/parent/chores/[id]/page.tsx` |
| PC3 | TICKET-017 (rollover cron) | `app/api/cron/parent-chore-rollover/route.ts`, `vercel.json` |

### Personalization lane (2 agents)
| Agent | Ticket | Write-scope |
|---|---|---|
| P1 | TICKET-032 (learning_style + archetype onboarding) | `components/onboarding/teen-setup-step.tsx` (extend), `app/api/onboarding/profile/route.ts` |
| P2 | TICKET-033 (signal capture in 6 hot paths) | `lib/server/unified-quest-engine.ts`, `app/api/teen/quiz/submit/route.ts` (add only — coordinate with Q4), `app/api/teen/chores/[id]/complete/route.ts` (add only — coordinate with PC2), event-book route, shop-redeem route, feed view component |

### UI-completion lane (2 agents)
| Agent | Ticket | Write-scope |
|---|---|---|
| U1 | TICKET-042 (twin-currency gauge) | `app/teen/page.tsx`, `components/teen/twin-currency-gauge.tsx` |
| U2 | TICKET-043 (PWA: manifest + SW) | `public/manifest.webmanifest`, `public/sw.js`, `app/layout.tsx`, `next.config.js` |

**File-conflict resolution**: Q3, Q4 and P2 both touch
`app/api/teen/quiz/submit/route.ts`. Sequence: Q4 lands first (signal
emission), then P2 reads it; Q3 touches `lib/quiz/server.ts` only.

Success criteria after Wave 2:
- `friend_challenges` table can be inserted into via API.
- Tab visible on `/teen/quests`.
- `partner_offers` page renders live data.
- Twin-currency gauge visible.
- Lighthouse PWA score ≥85.

---

## Wave 3 — Parallel build B (17 tickets)

Goal: complete the personalization loop, polish remaining surfaces.

### Personalization lane (5 agents)
| Agent | Ticket | Write-scope |
|---|---|---|
| P3 | TICKET-034 (recompute_neighbours) | `…/082_recompute_neighbours.sql`, `app/api/cron/evolve-teen-profiles/route.ts` (extend) |
| P4 | TICKET-035 (turn on w2/w3) | `…/083_recommend_weights_v2.sql` |
| P5 | TICKET-036 (recommend_friends endpoint) | `app/api/teen/recommend-friends/route.ts`, `app/teen/friends/page.tsx` (consume only) |
| P6 | TICKET-037 (assign-missions profile-aware) | `…/084_assign_missions_profile.sql`, `app/api/cron/assign-missions/route.ts` |
| P7 | TICKET-039 (anti-manipulation caps) | `lib/analytics/signals.ts`, `app/api/teen/signals/record/route.ts` |

### Quiz lane (3 agents)
| Agent | Ticket | Write-scope |
|---|---|---|
| Q6 | TICKET-008 (admin pedagogical queue) | `app/admin/content/review/page.tsx` (NEW), `app/api/admin/content/review/[id]/route.ts` (NEW) |
| Q7 | TICKET-012 (avatar quiz teaser) | `components/teen/avatar-coach.tsx`, `components/teen/avatar-coach-client.tsx` |
| Q8 | TICKET-040 (tag-normalize cron) | `app/api/cron/tag-normalize/route.ts` |

### Partner-defi lane (2 agents)
| Agent | Ticket | Write-scope |
|---|---|---|
| PT4 | TICKET-027 (offer_type='challenge' + check-in) | `…/085_partner_challenge_type.sql`, `app/api/partner/challenges/[id]/check-in/route.ts` (NEW), `app/partner/scanner/page.tsx` |
| PT5 | TICKET-028 (teen-side offer discovery) | `app/teen/offres/page.tsx` (NEW) |

### Friend-defi lane (1 agent)
| Agent | Ticket | Write-scope |
|---|---|---|
| FD6 | TICKET-024 (legacy redirect cleanup) | `app/gamification/defis/page.tsx`, `app/gamification/defis/challenges-client.tsx` |

### Parent-defi lane (2 agents)
| Agent | Ticket | Write-scope |
|---|---|---|
| PC4 | TICKET-015 (coach hook for chores) | `components/teen/avatar-coach.tsx` (extend, after Q7), `lib/server/unified-quest-engine.ts` |
| PC5 | TICKET-016 (sibling fan-out) | `app/parent/chores/new/page.tsx`, `app/api/parent/chores/create/route.ts`, `…/086_chore_targets.sql` |

### UI-completion lane (4 agents)
| Agent | Ticket | Write-scope |
|---|---|---|
| U3 | TICKET-044 (push notifications round-trip) | `app/api/notifications/subscribe/route.ts` (NEW), `lib/notifications/push.ts` (NEW), `components/teen/push-permission-prompt.tsx` (NEW) |
| U4 | TICKET-045 (partner mock pages → live) | `app/partner/kyc/page.tsx`, `app/partner/payouts/page.tsx`, `app/partner/invoices/page.tsx`, `app/partner/support/page.tsx` |
| U5 | TICKET-046 (friends + messages real backend) | `app/teen/friends/page.tsx` (extend after P5), `app/teen/messages/page.tsx`, `app/api/teen/friends/**`, `app/api/teen/messages/**` |
| U6 | TICKET-041 (AvatarCoach v2 chat) | `app/api/teen/avatar-coach/route.ts` (NEW), `components/teen/avatar-coach-client.tsx` (extend after Q7) |

**File-conflict resolution**: Q7, PC4 and U6 all extend
`components/teen/avatar-coach.tsx`/`-client.tsx`. Sequence: Q7 → PC4 →
U6 by adding distinct sections; Wave 3 dispatcher must serialize these
three.

Success criteria after Wave 3:
- `teen_neighbours` table populated for any teen with ≥10 signals.
- A friend-challenge dispatched from one teen, accepted by another,
  resolves to XP transfer at end of period.
- Mission assignment cron writes `assigned_via` metadata.
- Partner KYC page renders real `kyc_documents` rows (or empty state).

---

## Wave 4 — Validators + Visual QA (5 tickets, parallel)

Goal: read-only validators that produce reports without changing code.
These agents may write only to `docs/vision/audit-content-personalization/wave4-reports/`.

| Agent | Ticket | Validation focus | Reads |
|---|---|---|---|
| V1 | TICKET-038 (recommendation_metrics_daily rollup) | new cron + verify rollup writes daily | `behavioral_signals`, `content_recommendations` (now ≥0 rows) |
| V2 | TICKET-047 (a11y audit) | run jsx-a11y on 30 critical files; produce report | `app/teen/**`, `app/parent/**`, `app/partner/**` |
| V3 | TICKET-049 (Mobile 375px QA) | Playwright responsive test on 12 pages | top routes from FRONTEND_REDO §2-§4 |
| V4 | TICKET-050 (empty/loading/error audit) | manual checklist over 50 page.tsx files | all `app/*/page.tsx` |
| V5 | TICKET-048 (design-system color reconciliation) | inventory of `gen-z-*` token use → recommend canonical palette | `tailwind.config.ts`, `app/globals.css`, all component files |

Success criteria:
- One Markdown report per validator with explicit pass/fail per page.
- ≥90% of audited pages PASS each validator's checklist before V1.2
  ship.
- Open issues feed back into a V1.3 ticket file (out of this audit's
  scope).

---

## Cross-wave coordination notes

1. **Migration numbering**: Waves use `070+`. The next available
   number is 070 (last seen migration `069_v12_mentorship_api_gaps.sql`).
   Each lane MUST claim a number range to avoid collisions:
   - Wave 1: 070-074
   - Wave 2: 075-081
   - Wave 3: 082-086
2. **`vercel.json`**: 4 cron entries are added across waves
   (parent-chore-rollover, friend-challenge-resolve, recommendation-metrics-rollup, NOT counting tag-normalize which already exists). Coordinate by having a single Wave 4 agent (V0, optional) merge all entries; agents may APPEND only.
3. **`lib/quiz/server.ts`**: Wave 1 owners are Q1 (line 122-138 only)
   and Wave 2 Q3 (line 155-160 only) and Q5 (filter args). No
   simultaneous edits to the same hunk.
4. **Tsc gate**: each wave ends with `npx tsc --noEmit`. A failing
   wave blocks the next.
5. **Smoke build**: `pnpm next build` after each wave. Build must stay
   green at 289 pages.

---

## Effort + parallelism estimate

- **Wave 1**: 8 agents · ~M average · 1 calendar-day
- **Wave 2**: 20 agents · ~M-L average · 2 calendar-days
- **Wave 3**: 17 agents · ~M-L average · 2 calendar-days
- **Wave 4**: 5 validators · ~M average · 1 calendar-day

**Total**: 50 tickets, ~6 calendar-days with healthy parallelism.

---

## Out-of-scope (V1.3 backlog)

- Pgvector adoption for `teen_neighbours` (≥10k teens).
- Free-text tag review queue UI (admin moderates `tag-normalize`
  unmapped queue).
- Crew-battle matchmaker (`recommend_crew_opponent` RPC).
- A/B framework for recommendation_weights tuning.
- Recommendation fairness daily audit.
- AR/Darija/EN translation cycle (FR-only V1.2).

These are flagged in `MASTER_AUDIT.md` as known gaps but excluded from
the 50-ticket V1.2 batch.
