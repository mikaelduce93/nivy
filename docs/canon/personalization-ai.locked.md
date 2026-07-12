# Personalization & AI — Canonical Lock

> READ-ONLY canonicalization. Source: `docs/vision/audit-content-personalization/V1_2_SPRINT_REPORT.md`,
> `docs/vision/audit-content-personalization/wave4-reports/V1_metrics_rollup.md`,
> `docs/vision/audit-content-personalization/MASTER_AUDIT.md`,
> `docs/vision/personalization-engine.md`, `docs/vision/ai-content.md`,
> `docs/vision/ai-safety-teen-welfare.md`, `docs/vision/avatar-coach.md`,
> `docs/vision/PRODUCT_WHITEPAPER.md`.
> Date: 2026-05-08. DB: `imchornjvmgmaovhypco`.
> **Note**: requested source `docs/vision/C5-backend-frontend-gap.md` does not exist in the repo (flagged).

---

## 1. LOCKED — Signal capture

**Canonical RPC**: `record_signal(teen_id, signal_type, target_type, target_id, weight, metadata)`.
- Single entry point. ALL signal writes go through `record_signal` (no direct INSERT into `behavioral_signals` from app code).
- HTTP wrapper: `POST /api/teen/signals/record` (lib helper `lib/analytics/signals.ts:recordSignal`).
- Append-only into `behavioral_signals` (mig 051). Live affinity update inline (p95 ≤ 50ms).

**Wired event sources (Wave 2 P2 — 6 hot paths confirmed)**:
1. Chore complete — `app/api/teen/chores/[id]/complete/route.ts`
2. Booking (event/ride/mentor) — booking submit handlers
3. Shop purchase — shop redeem handler
4. Feed engage (view/click/favorite) — feed surface
5. Quest engine (mission start/complete) — `lib/server/unified-quest-engine.ts`
6. Quiz submit — `app/api/teen/quiz/submit/route.ts`

**Canonical signal_type taxonomy** (mig 051; weights live in `behavioral_signals.weight`):
| signal_type | default weight |
|---|---:|
| view | 0.1 (Wave 2 P2 caps tightened toward 1.0 for active items) |
| click | 0.5 → 2.0 (per Wave 4 V1 snapshot) |
| start | 1.0 |
| complete | 3.0 |
| abandon | -1.0 |
| share | 1.5 |
| favorite | 2.0 |
| dismiss | -0.5 |
| report | -5.0 |

**Canonical target_type**: `quiz | defi | mission | event | partner_offer | shop_reward | friend_profile | video | passion_path`.

---

## 2. LOCKED — Recommender

**Canonical RPC**: `recommend_for_teen(teen_id, content_type, n, filters)` — v2 weights live (mig 085 = `recommend_weights_v2`).

**v2 score formula** (per `personalization-engine.md` §4, mig 085):
```
score = w1*affinity_match + w2*collab + w3*friend_resonance
      + w4*novelty + w5*context + w6*difficulty
      − p1*recently_seen − p2*friend_already_did − p3*difficulty_mismatch
```
**v2 active for**: `quiz | defi | event | partner_offer` (4 of 12 rows in `recommendation_weights` are `version=2 & is_active`).

**Output shape**:
```sql
RETURNS TABLE (content_id UUID, score NUMERIC, factors JSONB, rank INT)
```
`factors` JSONB carries `{aff, col, fr, nov, ctx, diff, seen7d, ...}`.

**Persistence policy (LOCKED)**: every successful `recommend_for_teen` call MUST persist its returned rows to `content_recommendations` (one row per (teen, content_type, content_id)) before returning to the client. Required columns at insert:
- `id` = `gen_random_uuid()`
- `teen_id`, `content_type`, `content_id`
- `recommendation_score` ← RPC `score`
- `recommendation_factors` ← RPC `factors`
- `status` = `'shown'`
- `recommended_at` = `NOW()`
- `shown_at` = `NOW()`
- `expires_at` = `NOW() + INTERVAL '7 days'`

A correlation step in `record_signal` MUST `UPDATE content_recommendations SET status='clicked'|'completed'` when a matching `(teen_id, target_type, target_id)` signal lands inside `[recommended_at, expires_at]`.

**HTTP surface**: `GET /api/teen/recommendations?type={quiz|defi|event|offer|reward}&n=N`.

**Hard filters** (apply BEFORE scoring): language, age gate, parental block list, quiz-7d invariant (whitepaper §29 inv. 9).

**Diversity**: MMR injection — ≥1 of every 5 picks must carry a tag absent from the prior 4.

---

## 3. LOCKED — Friend recommender

**Canonical RPC**: `recommend_friends(teen_id, n)` (mig 079).
- Score: `0.30·school_overlap + 0.20·city_overlap + 0.30·interest_overlap (jaccard) + 0.20·tanh(mutual_friends/5)`.
- Excludes self, blocked, already-friends/pending, parental-block-list partners.

**Cron**: `recompute_neighbours` RPC + Phase-2 loop in `app/api/cron/evolve-teen-profiles/route.ts:99-151` (mig 084). Schedule `0 2 * * *` UTC. Fail-closed: rejects unless `x-vercel-cron` header OR `Authorization: Bearer ${CRON_SECRET}`. Persists top-50 cosine neighbours per teen to `teen_neighbours`. Threshold gate: `MIN_AFFINITY_ROWS_FOR_NEIGHBOURS = 3`.

**HTTP surface**: `GET /api/teen/recommend-friends?n=10`.

---

## 4. LOCKED — Mission assignment

**Canonical RPC**: `assign_missions` (mig 086 = `assign_missions_profile`).
- Tag-overlap scoring: candidate `mission_templates.tags ∩ top affinity tags` weighted by affinity score.
- Tops up to 3 daily / 3 weekly / 3 monthly / 1 seasonal in `user_missions`.
- Cron `app/api/cron/assign-missions/route.ts` runs at 00:05 Africa/Casablanca for teens with `last_sign_in ≤ 90d`.

---

## 5. LOCKED — Anti-manipulation

**Daily caps per teen** (Wave 3 P7 — enforced inside `record_signal`):
- `share`: ≤ 5/day
- `favorite`: ≤ 5/day per item
- `view`: ≤ 10/min per teen (rate-limit)

**Recommender-driven notifications**: ≤ 3/day per teen.

**Admin diagnostic**: per-teen signal cap surface in admin dashboard (Wave 3 P7) showing 24h counters and trip events.

**Fairness monitoring**: weekly job to `recommendation_fairness_log` flags any (school_type × gender × region) cohort whose acceptance < 50% of median.

---

## 6. LOCKED — Onboarding chip selectors

Required BEFORE recommender bootstraps for a teen (cold-start blocker):

1. **Interests** — closed taxonomy chip selector (Appendix A, 50 tags; teen picks 5-10) → writes `teen_interests(teen_id, tag, weight)`.
2. **Goals** — 3 free-text + suggestions; LLM-tag-extract on save → `teen_goals(goal_text, goal_tag, priority)`.
3. **Learning style** — 4 picture-cards `{visual, auditory, kinesthetic, reading}` → `teens.learning_style`.
4. **Archetype** — 5-question quiz `{leader, explorer, creator, socializer}` → `teens.archetype` (Wave 2 P1 shipped).

Onboarding Step A + C surfaces shipped Wave 2 P1. The recommender MUST NOT be invoked until `teen_interests` has ≥ 1 row (cold-start fallback otherwise — see §13).

---

## 7. LOCKED — Content taxonomy

**`interest_taxonomy` is the single source of truth** (50 closed tags, mig 051 seed; `is_active=true` on all 50). Categories: Sport (8), Music (5), Art (6), Tech (5), Science (4), Académique (5), Social (4), Lifestyle (5), Gaming (3), Nature (2), System (3 — `cold_start`, `popular_local`, `staff_pick`).

**All recommendable items carry `tags TEXT[]` from `interest_taxonomy`**, GIN-indexed:
- `educational_quizzes` (Wave 1 F1 — 9/9 tagged, mig 070)
- `mission_templates` (Wave 1 F2 — 30/30 tagged, mig 071)
- `physical_challenges` (Wave 1 F3 — 5/5 tagged, mig 072)
- `events`, `partner_offers` (mig 082 closed-set validation), `shop_rewards`, `passion_paths`

**Free-text tag normalization**: `tag-normalize` cron (Wave 3 Q8) maps unknown tags via LLM to canonical or queues to admin. Adding a tag requires migration + admin approval; never silent expansion. Versioned via `recommendation_weights.tag_taxonomy_version`.

---

## 8. LOCKED — AI models

**Env-driven, no hardcoded model strings**.

| Env var | Canonical value | Used by |
|---|---|---|
| `CLAUDE_MODEL_ID` | `claude-sonnet-4-6` | All Claude calls (Wave 1 F4) |
| `OPENAI_MODEL_ID` | per-env (e.g. `gpt-4o-mini` for AvatarCoach, `gpt-4o` for content-gen — set in env) | All OpenAI calls |
| `AI_PROVIDER` | `openai` \| `claude` | Provider factory selector |
| `CRON_SECRET` | required | All cron routes |
| `OPENAI_API_KEY` / `ANTHROPIC_API_KEY` | required | Provider init |

Provider abstraction: `lib/ai/providers/{factory,openai,claude,base}.ts`. AI cron silently 404'd pre-Wave 1 because of stale `claude-3-sonnet-20240229` literal — that is now eradicated.

---

## 9. LOCKED — AvatarCoach

**Canonical surface**: `components/teen/AvatarCoach.tsx` (unified — replaces split between `components/brand/mascot-states.tsx` and `components/teen/dashboard/ai-companion.tsx`).

**v2 chat schema** (Wave 3 U6):
- 5-turn conversation cap per teen per session (hard limit; coach refuses turn 6 with graceful close).
- Safety prompt prepended: refuses sexual / drug / violence / self-harm content; on distress signal, surface Moroccan crisis hotline + ping linked parent + lock chat for 1 hour.
- No paid-action push (top-up, partner offer) when distress markers are present.
- Tone driven by `teens.archetype` + `teens.age` + `teens.primary_language`.

**Render contract** (per `personalization-engine.md` §11):
1. `recommend_for_teen(teen_id, 'mission', 1)` → top mission.
2. Compute mood from last 3 signals + time-since-last-activity (no LLM call).
3. LLM compose with KV cache key `coach:{teen_id}:{date}:{mission_code}` (TTL 30 min).
4. Mascot state map: `positive→celebrating`, `meh→happy`, `slump→confused`, `streak_break→sad`.

---

## 10. DEPRECATED

| Item | Replacement |
|---|---|
| `claude-3-sonnet-20240229` literal references anywhere in code | `process.env.CLAUDE_MODEL_ID` (= `claude-sonnet-4-6`) |
| `recommend_for_teen` v1 (mig 052; w2/w3 = 0) | v2 (mig 085) — `recommend_weights_v2` |
| `partner_discounts` (table) | `partner_offers` (mig 074 consolidated; `partner_discounts` survives as VIEW for back-compat) |
| `generate_friend_suggestions` RPC (legacy, simplistic) | `recommend_friends` (mig 079) |
| `components/ai/AgentSheet.tsx` (legacy floating chat) | `components/teen/AvatarCoach.tsx` |
| `components/ai/elite-ai-companion.tsx` | `components/teen/AvatarCoach.tsx` |
| `components/teen/dashboard/ai-companion.tsx` | `components/teen/AvatarCoach.tsx` |
| `components/ai/AgentFloatingButton.tsx` | (subsumed into AvatarCoach mount) |
| `components/teen/dashboard/ai-oracle-card.tsx` (orphan, never wired) | DELETE |
| `lib/ai/ready-player-me.ts` (zero call sites) | DELETE |
| Hardcoded `gpt-4` defaults in providers | `process.env.OPENAI_MODEL_ID` |
| Legacy `/api/notifications/push/subscribe` (writes wrong columns) | Wave 3 U3 canonical route — delete legacy after SW pushsubscriptionchange migration |

---

## 11. FORBIDDEN patterns

1. **Hardcoded model IDs** anywhere. Always `process.env.CLAUDE_MODEL_ID` / `process.env.OPENAI_MODEL_ID`. CI lint MUST grep for `claude-3-`, `claude-sonnet-`, `gpt-4`, `gpt-3.5` literals in `lib/`, `app/`, `components/`.
2. **PII in prompts**. Never inject `first_name + last_name`, `date_of_birth`, `phone`, `address`, parent email, or CIN into LLM context. Pseudonym (`pseudo`) + age-bucket only.
3. **Recommender output not persisted**. Any caller of `recommend_for_teen` that returns to a client without inserting rows into `content_recommendations` is a bug. Without persistence the metrics rollup (§12) is unobservable.
4. **Signal capture bypassing `record_signal`**. Direct INSERT into `behavioral_signals` from app code is forbidden — caps + correlation + audit live inside the RPC.
5. **Direct INSERT into `affinity_scores`** from app code. Use `update_affinity_scores(teen_id)` or let the cron do it.
6. **Surfacing friend identity in resonance UI**. `friend_resonance` exposes counts only ("3 amis ont fait ça"), never names/IDs.
7. **AvatarCoach pushing paid actions during distress**. Hard rule, enforced in safety prompt and tool gating.
8. **Free-text tag bypassing `interest_taxonomy`**. Unmapped tags MUST go to admin queue, never fan out to recommender.

---

## 12. MISSING (V1.3 backlog — implementation-ready)

1. **`recommendation_metrics_daily` rollup pipeline** — table exists (mig 034 schema, 6 columns: `date, content_type, shown_count, clicked_count, completed_count, novelty_count`), 0 rows. Two-layer gap:
   - **Sink**: `app/api/cron/recommendation-metrics-rollup/route.ts` does NOT exist. Spec ready in `wave4-reports/V1_metrics_rollup.md` §5.2 (single UPSERT statement, schedule `0 23 * * *` UTC, auth pattern copied from `evolve-teen-profiles`).
   - **Source**: `content_recommendations` is empty because `recommend_for_teen` callers do not persist. Predecessor BLOCKER per §2 LOCKED policy + signal-correlation `UPDATE` in `record_signal`.

2. **`tag-normalize` admin queue UI** — cron exists (Wave 3 Q8) and detects unmapped free-text, but admin review surface for the unmapped queue is not built. Backend hook: queue table (writes today) + admin list view + approve/reject actions.

3. **AvatarCoach v2 chat fully wired** — schema + cap + safety prompt landed Wave 3 U6, but unification of legacy components (`ai-companion`, `elite-ai-companion`, `AgentSheet`) into the canonical `components/teen/AvatarCoach.tsx` and removal of legacy mounts is not complete. Distress classifier on user input before `streamText` not yet wired.

---

## 13. UNRESOLVED founder decisions

### 13.1 Cold-start fallback strategy (no signals, no `teen_interests` row)

The recommender today returns near-empty when `total_signals < 5` AND no interests selected. Options to choose from:

| Option | Behaviour | Trade-off |
|---|---|---|
| **A — Popularity** | Top-N by global completion-rate per content_type, filtered by `grade_level + language` | Safe, easy; weakest personalization, all teens see the same |
| **B — Friend-of-friend** | If parent-linked siblings or school cohort exists, lift their top items | Strong network effect; fails when teen is first in cohort |
| **C — Tag-default** | Use `interest_taxonomy` system tags (`cold_start`, `popular_local`, `staff_pick`) as synthetic affinity vector | Curated, brand-controlled; requires staff-pick maintenance |

**Recommendation**: ship **C as primary + A as fallback**, in that order. Rationale: tag-default keeps Day-1 experience curated and on-brand (avoids "everyone sees the same generic quiz" failure mode flagged in MASTER_AUDIT §3.5), and `popular_local` already exists in the taxonomy (tag #49). Friend-of-friend (B) is high-value but premature when `friendships` is sparse — defer until cohort has ≥ 100 active teens. Implement as a switch in `recommend_for_teen` triggered by `total_signals < 5 OR account_age_days < 7`, falling through C → A.

### 13.2 AvatarCoach personality tone (one canonical voice spec)

Today the persona is split: panda mascot has no name, chatbot is "Kai", brand is "Nivy". Three identities. Founder must lock ONE.

**Recommendation**:
- **Name**: **Niv** (founder decision #356 / F54 resolved — matches the live UI and the `Nivy` brand; `TEEN_AGENT_PROMPT` and the AI-agent surfaces updated from the legacy "Kai").
- **Visual**: panda mascot from `components/brand/mascot-states.tsx` becomes Niv's face — replace the `Brain` Lucide icon in the chat sheet header with `PandaIcon` (mood-driven state).
- **Tone matrix** (codified in `lib/ai/prompts/roles.ts`, single canonical prompt):
  - Base voice: warm, energetic, French-first, light Darija interjections (`yallah`, `wakha`, `safi`) when `primary_language='fr'`; respectful Arabic phrasing when `primary_language='ar'`.
  - Adapts on `teens.archetype`: `leader→direct/challenge`, `explorer→curious/playful`, `creator→artistic/expressive`, `socializer→warm/group-oriented`.
  - Adapts on `teens.age`: 13-14 simpler vocab + more emoji, 15-17 peer-tone less emoji.
  - **Hard constraints**: no guilt language, no fake urgency, no countdown timers in copy, no paid-action push during distress. Crisis fallback ALWAYS surfaces Moroccan hotline + parent ping. Single-sentence default; max 20 words unless teen explicitly asks for more.
- **Lock**: one prompt file (`lib/ai/prompts/roles.ts:KAI_CANONICAL_PROMPT`). All other prompts deprecated. CI lint grep for `TEEN_AGENT_PROMPT`, `ai-companion`, `elite-ai` literals to enforce.

---

## Contradictions flagged

1. **MASTER_AUDIT.md** lists `recommend_for_teen` as v1 with w2/w3 = 0 (mig 052). **V1_2_SPRINT_REPORT** confirms v2 weights live (mig 085) — v1 is DEPRECATED, v2 is canonical. Code that still calls v1 must be migrated.
2. **personalization-engine.md** §4 weights table has `defi/event/offer/friend/reward` content_types. **Wave 3 P4 / mig 085** activates v2 only for `quiz | defi | event | partner_offer` (4 of 6). `friend` and `reward` v2 weights NOT yet active — they fall through to v1 defaults. Treat as known gap, not contradiction.
3. **avatar-coach.md** says panda is absent from `app/teen/*`. **personalization-engine.md** §11 + Wave 3 U6 lock the unified `<AvatarCoach>` with mascot mount. Source-of-truth is the V1.2 sprint result: AvatarCoach v2 is the canonical surface; legacy three-way split is DEPRECATED.
4. **ai-content.md** describes default model as `claude-3-sonnet-20240229` (deprecated). **Wave 1 F4** rotated to env-driven `claude-sonnet-4-6`. Source-of-truth is Wave 1.
5. **Requested source `docs/vision/C5-backend-frontend-gap.md`** does not exist in the repo (verified via Grep + Glob). No content drawn from it.
6. **`partner_offers` vs `partner_discounts`** — MASTER_AUDIT flagged drift. **Wave 1 F7 / mig 074** consolidated to `partner_offers`; `partner_discounts` survives as VIEW. Any code still writing to `partner_discounts` is a bug.

---

*End canonical lock — `docs/canon/personalization-ai.locked.md`*
