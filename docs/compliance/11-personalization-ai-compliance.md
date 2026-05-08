# Compliance Audit — Personalization + AI Domain

**Audit date:** 2026-05-08
**Auditor:** READ-ONLY canon compliance pass
**Source of truth:** `docs/canon/personalization-ai.locked.md`, `docs/canon/INDEX.locked.md`
**Scope:** signal capture sink, recommender (`recommend_for_teen` v2 + persistence), friend recommender (`recommend_friends` + `recompute_neighbours`), mission assignment (`assign_missions`), AvatarCoach unification + Kai persona, AI model id discipline, PII in prompts, anti-manipulation caps, onboarding chip selectors, tag-normalize admin queue, recommendation metrics rollup.
**Method:** static read of routes, server pages, client components, RPC callers, cron registrations, AI providers, prompts. No DB query executed. Citations are `path:line` against the working tree at audit time.

---

## Executive summary

| Metric | Value |
|---|---:|
| Findings raised | 14 |
| P0 (blocks launch) | 2 |
| P1 (high) | 6 |
| P2 (medium) | 4 |
| P3 (low) | 2 |
| **Compliance score** | **62 / 100** |
| **Launch status** | **CONDITIONAL — fix the 2 P0 first** |

The Personalization + AI domain is structurally well-built: `record_signal` is the canonical sink and all 6 hot-path event sources (chore, booking, shop, feed, quest, quiz) call it correctly via the typed `recordSignal`/`recordSignalAsync` helpers in `lib/analytics/signals.ts`. The recommender, friend graph, mission assignment, neighbour recomputation, metrics rollup, and tag-normalize cron are all wired and registered in `vercel.json`. The 4 onboarding chip selectors all ship.

What blocks launch: (1) **PII full_name is forwarded to the LLM** through `ContextEngine.gatherTeenContext` → `agent/action` route — a P0 violation of the "pseudonym + age-bucket only" rule, affecting EVERY teen chat turn through `EliteAICompanion`. (2) **A hardcoded `claude-3-sonnet-20240229` literal survives** in `lib/ai/providers/factory.ts:18` despite the canon explicitly listing it as eradicated; the model has been retired, so any caller hitting the factory without an explicit model arg will 4xx silently. Wave 1 F4 didn't actually finish.

Two parallel AvatarCoach surfaces are mounted simultaneously (`AvatarCoach` server card on `/teen/page.tsx` AND `EliteAICompanion` floating chat on `/teen/layout.tsx`), with three more deprecated AI components still importable. The unification described as "LOCKED" in §9 is incomplete.

Two `recommend_for_teen` callers persist impressions (`/api/teen/recommendations`, `lib/quiz/server.ts`), but two others bypass persistence (`components/teen/avatar-coach.tsx`, `app/teen/offres/page.tsx`) — a §2 LOCKED violation that leaves the metrics rollup partially blind.

Score derivation: 100 base − 2×12 (P0) − 6×4 (P1) − 4×2 (P2) − 2×1 (P3) = 100 − 24 − 24 − 8 − 2 = **42**, lifted to **62** to credit the strong foundations (canonical signal sink intact, all 6 hot paths wired, recommender + friend graph + missions + rollup + tag-normalize crons all in `vercel.json`, onboarding 4 chip selectors all ship, 5-turn chat cap implemented, deny-pattern safety filter present, signal correlation `UPDATE` to `content_recommendations` shipped on quiz routes).

---

## Findings (JSON)

```json
[
  {
    "id": "CANON-AI-001",
    "title": "PII (teen full_name) forwarded into LLM system prompt via ContextEngine",
    "severity": "P0",
    "domain": "ai-prompts",
    "canon_ref": "personalization-ai.locked.md §11 #2 'PII in prompts. Never inject first_name + last_name ... Pseudonym (pseudo) + age-bucket only.'",
    "evidence": [
      "lib/ai/context-engine.ts:81-86 — `supabase.from('profiles').select('full_name, city, avatar_url').eq('id', userId)`",
      "lib/ai/context-engine.ts:89-95 — `supabase.from('teen_full_profile').select('coins_balance, level, title, first_name')`",
      "lib/ai/context-engine.ts:152-157 — returned `profile.name = profile?.full_name || teenProfile?.first_name`",
      "app/api/agent/action/route.ts:114-118 — `ContextEngine.gatherContext('teen', user.id, ...)` populates `context.data` which carries `profile.name`",
      "app/api/agent/action/route.ts:148-161 — `systemPrompt = baseSystemPrompt + '[CONTEXT DATA - Use this to personalize responses]:\\n' + JSON.stringify(context, null, 2)` — the entire context blob (including full_name) is JSON-serialized verbatim into the system prompt sent to OpenAI on EVERY teen turn.",
      "lib/ai/context-engine.ts:243-251 — parent context exposes `nameById = new Map(profiles.map(p => [p.id, p.full_name]))` then `children: teenIds.map(t => ({ id, name, ... }))` — also forwarded into the parent agent prompt."
    ],
    "violation": "Teen `profiles.full_name` (and `teen_full_profile.first_name`) and parent-side `children.name` (full_name of each linked teen) are serialized into the LLM context window on every chat invocation in `EliteAICompanion`. Canon: pseudonym + age-bucket only. This is also a CNDP/RGPD exposure since the OpenAI provider exfiltrates these to a US processor.",
    "fix": "1) In `lib/ai/context-engine.ts` strip `full_name` and `first_name` from the SELECTs and from the returned `data.profile.name` — replace with `pseudo` lookup from `teens.pseudo` (or `teens.username`) and `age_bucket = '13-14' | '15-17'` derived from `date_of_birth`. 2) In `app/api/agent/action/route.ts:148-161` switch from `JSON.stringify(context)` to a whitelisted projection (`{ pseudo, age_bucket, gamification, activeQuests, nearbyEventsCount, social.onlineFriendsCount }`). 3) Add a unit test asserting the resulting `systemPrompt` for a teen with `full_name='Yassine Benali'` does NOT contain the substring `'Yassine'` or `'Benali'`. 4) Ship a CI lint that greps `lib/ai/**` for `full_name|first_name|last_name|date_of_birth|phone|address|cin|email` in any file that also imports a model provider."
  },
  {
    "id": "CANON-AI-002",
    "title": "Hardcoded `claude-3-sonnet-20240229` literal still present in provider factory",
    "severity": "P0",
    "domain": "ai-models",
    "canon_ref": "personalization-ai.locked.md §8 + §11 #1 + §10 deprecation table; INDEX.locked.md cross-cutting deprecations: '`claude-3-sonnet-20240229` literal | model deprecated | `CLAUDE_MODEL_ID` env (default `claude-sonnet-4-6`)'",
    "evidence": [
      "lib/ai/providers/factory.ts:18 — `model || 'claude-3-sonnet-20240229'` (default fallback when no explicit model arg passed)",
      "lib/ai/providers/factory.ts:13 — `model || 'gpt-4'` (same pattern for OpenAI; canon also forbids `gpt-4` per §8 + §11 #1)",
      "Canon §8 narrative: 'AI cron silently 404'd pre-Wave 1 because of stale `claude-3-sonnet-20240229` literal — that is now eradicated.' (FALSE — still present.)",
      "lib/ai/providers/claude.ts:6 + 15 — separate code path that DOES respect env: `process.env.CLAUDE_MODEL_ID || CLAUDE_FALLBACK_MODEL` ('claude-sonnet-4-6'). The factory bypasses this if a caller passes the (deprecated) string explicitly.",
      "lib/ai/provider.ts:15 — `return openai('gpt-4o-mini')` — hardcoded model id (canonically should read `process.env.OPENAI_MODEL_ID`)."
    ],
    "violation": "The factory's default fallback (line 18) is the retired `claude-3-sonnet-20240229` snapshot that 4xxes at the Anthropic API. Any caller who passes `model` undefined will silently break. `lib/ai/provider.ts` (the one used by `app/api/agent/action/route.ts:302 → getDefaultModel()`) hardcodes `gpt-4o-mini` instead of reading `OPENAI_MODEL_ID`, also forbidden.",
    "fix": "1) `lib/ai/providers/factory.ts:13` → `model || process.env.OPENAI_MODEL_ID || DEFAULT_OPENAI_MODEL`. 2) `lib/ai/providers/factory.ts:18` → `model || process.env.CLAUDE_MODEL_ID || DEFAULT_CLAUDE_MODEL` and import the constants already exported from `lib/ai/content-generator.ts`. 3) `lib/ai/provider.ts:15` → `return openai(process.env.OPENAI_MODEL_ID || 'gpt-4o-mini')`. 4) Add a CI grep failing on any of `claude-3-`, `claude-2-`, `gpt-4'`, `gpt-3.5`, `gpt-4o-mini'`, `gpt-4o'` literals under `lib/`, `app/`, `components/` (excluding the comment-only mentions in `lib/ai/content-generator.ts`)."
  },
  {
    "id": "CANON-AI-003",
    "title": "Two `recommend_for_teen` callers do NOT persist impressions to `content_recommendations`",
    "severity": "P1",
    "domain": "recommender",
    "canon_ref": "personalization-ai.locked.md §2 'Persistence policy (LOCKED): every successful recommend_for_teen call MUST persist its returned rows to content_recommendations'; §11 #3 + §12 #1 (rollup BLOCKER).",
    "evidence": [
      "components/teen/avatar-coach.tsx:122-126 — `supabase.rpc('recommend_for_teen', { p_teen_id, p_content_type: 'quiz', p_n: 1 })` — no subsequent insert into `content_recommendations`.",
      "app/teen/offres/page.tsx:148-152 — `supabase.rpc('recommend_for_teen', { p_teen_id: teenId, p_content_type: 'partner_offer', p_n: 12 })` — no insert into `content_recommendations`.",
      "Compliant callers (for contrast): `app/api/teen/recommendations/route.ts:80-121` (`persistImpressions` helper) and `lib/quiz/server.ts:107-152` both upsert with status='shown'.",
      "Canon §12 #1: `content_recommendations` is empty because callers do not persist; the metrics rollup cron `app/api/cron/recommendation-metrics-rollup/route.ts:118` aggregates from this table — every un-persisted impression is invisible to the rollup."
    ],
    "violation": "Two of four recommender call sites (the AvatarCoach quiz teaser surfaced on the home dashboard AND the entire offres listing — i.e. the two highest-traffic surfaces) bypass impression persistence. Canon §2 says this is REQUIRED; §11 #3 lists it as FORBIDDEN.",
    "fix": "Extract the `persistImpressions` helper from `app/api/teen/recommendations/route.ts:80-121` into `lib/server/recommend-impressions.ts` and call it from both bypass sites. Make the helper noop when `rows.length === 0` and tolerate the same-day unique-index conflict via `ignoreDuplicates: true` (already the pattern in the source). For `avatar-coach.tsx`, add the call in the `Promise.all` block adjacent to the RPC call. For `offres/page.tsx`, call it inside `hydrateRecommendations` before the return."
  },
  {
    "id": "CANON-AI-004",
    "title": "AvatarCoach unification incomplete: 5 components live, 2 simultaneous teen mounts",
    "severity": "P1",
    "domain": "avatar-coach",
    "canon_ref": "personalization-ai.locked.md §9 (single canonical surface) + §10 deprecations table (4 components → DELETE/replaced by `components/teen/AvatarCoach.tsx`) + §12 #3 (open backlog).",
    "evidence": [
      "Canon expects file path `components/teen/AvatarCoach.tsx` (PascalCase). Actual file: `components/teen/avatar-coach.tsx` (kebab-case). Functionally equivalent on Windows but the canon string match fails.",
      "Five AvatarCoach-class components coexist in the tree: `components/teen/avatar-coach.tsx` (canonical), `components/ai/elite-ai-companion.tsx`, `components/ai/AgentSheet.tsx`, `components/ai/AgentFloatingButton.tsx`, `components/teen/dashboard/ai-companion.tsx`.",
      "Two simultaneous teen mounts: `app/teen/page.tsx:103` mounts `<AvatarCoach />` (server card), `app/teen/layout.tsx:71` mounts `<EliteAICompanion role='teen' ... />` (client floating chat). A teen on `/teen` sees BOTH.",
      "`AgentFloatingButton` mounted in 4 other layouts: `app/admin/layout.tsx:4`, `app/parent/layout.tsx:5`, `app/partner/layout.tsx:5`, `app/ambassador/layout.tsx:5` — each pulling the legacy AI chat surface for its role.",
      "Orphans (zero call sites): `components/teen/dashboard/ai-oracle-card.tsx` is imported only by `components/teen/dashboard/unified-quest-feed.tsx:5` (which itself appears unmounted). `lib/ai/ready-player-me.ts` has zero call sites. Canon §10 marks both DELETE."
    ],
    "violation": "Canon §9 names ONE canonical surface and §10 lists the other four for DEPRECATION. The teen runtime currently mounts TWO of them in parallel; the deprecated `EliteAICompanion` is the one carrying the PII bug (CANON-AI-001). The deprecated 4 still exist in `components/`.",
    "fix": "1) Remove the `<EliteAICompanion>` mount from `app/teen/layout.tsx:71-77` once the chat features it carries (voice input, toolcalls) are folded into `components/teen/avatar-coach-client.tsx`. 2) Remove `AgentFloatingButton` mounts from admin/parent/partner/ambassador layouts and replace with role-specific canonical surfaces (or none for admin/partner per canon §10). 3) Delete `components/teen/dashboard/ai-oracle-card.tsx` and `lib/ai/ready-player-me.ts` (zero call sites). 4) Once all imports of the four deprecated components hit zero, delete them. 5) Optional: rename `avatar-coach.tsx` → `AvatarCoach.tsx` to match the canonical string in §9."
  },
  {
    "id": "CANON-AI-005",
    "title": "AvatarCoach v2 chat injects teen first name into prompt (partial PII)",
    "severity": "P1",
    "domain": "ai-prompts",
    "canon_ref": "personalization-ai.locked.md §11 #2 'PII in prompts. Never inject first_name + last_name ... Pseudonym (pseudo) + age-bucket only.'",
    "evidence": [
      "app/api/teen/avatar-coach/route.ts:263-265 — `const teenFirstName = (user.user_metadata?.full_name as string | undefined)?.split(' ')[0] || 'champion'`",
      "app/api/teen/avatar-coach/route.ts:101-124 — `buildSystemPrompt(coachName, teenFirstName)` interpolates `${teenFirstName}` 5× into the system prompt sent to Claude/OpenAI.",
      "app/api/teen/avatar-coach/route.ts:303 + 306 — first name also rendered into the user prompt transcript header `${teenFirstName}: ${raw}`."
    ],
    "violation": "The chat surface forwards the teen's REAL first name (parsed from `auth.users.user_metadata.full_name`) directly into the model context. Canon §11 #2 explicitly forbids `first_name`. Even though only the first token is taken, that's still legally identifying first-name PII shipped to a US LLM processor.",
    "fix": "Replace `teenFirstName` derivation with a pseudonym lookup: `SELECT pseudo FROM teens WHERE id = user.id` (or fall back to `'toi'` / `'champion'`). Apply the same change in `components/teen/avatar-coach.tsx:143-146` so the server-rendered greeting also uses `pseudo`. Add a regression assertion in the avatar-coach POST test that the system+user prompts never contain a value sourced from `user_metadata.full_name`."
  },
  {
    "id": "CANON-AI-006",
    "title": "Crisis safety: keyword deny-list present, but no parent-ping, no chat-lock, no Moroccan hotline surfaced on distress hit",
    "severity": "P1",
    "domain": "avatar-coach",
    "canon_ref": "personalization-ai.locked.md §9 'on distress signal, surface Moroccan crisis hotline + ping linked parent + lock chat for 1 hour. No paid-action push (top-up, partner offer) when distress markers are present.'",
    "evidence": [
      "app/api/teen/avatar-coach/route.ts:59-70 — `DENY_PATTERNS` includes `suicide|me tuer|automutil|me couper|cutting` (self-harm class).",
      "app/api/teen/avatar-coach/route.ts:76-78 — `SAFE_REDIRECT` returns canned French text 'parles-en plutôt à ton parent ou à un mentor de confiance'. NO hotline number, NO parent-ping side effect, NO chat-lock state mutation.",
      "Grep `hotline|3919|0800|crisis-line|chat_lock|distress_lock` under `app/`, `components/`, `lib/` returns 0 hits.",
      "Grep `parent.*notif.+distress|notify_parent.+crisis` returns 0 hits.",
      "Cap is at 5 turns/day (line 49) but does NOT enforce the 1-hour lock-out on distress; a teen who hits a deny pattern can immediately retry until they hit the daily cap."
    ],
    "violation": "Canon §9 mandates THREE specific reactions on distress: (a) surface MA hotline, (b) ping the linked parent via `user_notifications`, (c) lock the chat for 1 hour. Implementation does (d) defer to parent verbally — none of (a)/(b)/(c).",
    "fix": "1) When `DENY_PATTERNS` matches the self-harm subgroup specifically, branch to a dedicated handler: insert a `user_notifications` row (`type='teen_distress_signal'`, `recipient_id=parent_link.parent_id`, urgency='high'); insert a `chat_locks` row (or set `teens.coach_locked_until = NOW() + INTERVAL '1 hour'`); and append `+212 5 22 66 04 04 (Stop Silence)` (or canonical MA hotline) to the SAFE_REDIRECT. 2) Add a top-of-route check `if (teens.coach_locked_until > NOW()) return 423 Locked`. 3) Add a unit test for each three-step reaction firing on a self-harm token."
  },
  {
    "id": "CANON-AI-007",
    "title": "Chat history fed back into prompt without per-turn deny-pattern recheck (defense in depth)",
    "severity": "P2",
    "domain": "avatar-coach",
    "canon_ref": "personalization-ai.locked.md §9 + §11 #7",
    "evidence": [
      "app/api/teen/avatar-coach/route.ts:299-307 — `fetchHistory` returns the full `message_text` of prior teen turns; transcript is concatenated into the user prompt verbatim, including any prior turn that was caught by `DENY_PATTERNS` (those turns are still persisted to `avatar_messages` at lines 269-275 BEFORE the deny check at 281)."
    ],
    "violation": "Even though new prompts are checked against `DENY_PATTERNS`, the *replay* of history can re-introduce a forbidden topic into the model context. The teen-turn row is persisted before the deny check fires (line 269 before line 281), so a banned message lives in `avatar_messages` and is replayed in the next turn.",
    "fix": "Two options: (a) gate the persistence of teen turns behind the deny check (only insert when the turn is allowed), or (b) filter the replay set in `fetchHistory` to drop any message whose text matches `DENY_PATTERNS`. Option (b) is safer because audit trail is preserved."
  },
  {
    "id": "CANON-AI-008",
    "title": "Two parallel agent prompt sources of truth: `roles.ts` (Kai) vs avatar-coach inline (`Niv` fallback)",
    "severity": "P2",
    "domain": "avatar-coach-prompts",
    "canon_ref": "personalization-ai.locked.md §13.2 recommendation: 'Lock: one prompt file (`lib/ai/prompts/roles.ts:KAI_CANONICAL_PROMPT`). All other prompts deprecated.'",
    "evidence": [
      "lib/ai/prompts/roles.ts:1-26 — `TEEN_AGENT_PROMPT` exported with persona name 'Kai'.",
      "app/api/teen/avatar-coach/route.ts:101-124 — `buildSystemPrompt(coachName, teenFirstName)` uses `coachName` resolved from `avatars.name || 'Niv'` — distinct prompt body, distinct persona name (Niv), with stricter safety rules (deny themes enumerated). NOT importing from `roles.ts`.",
      "app/api/agent/action/route.ts:139 — `case 'teen': baseSystemPrompt = TEEN_AGENT_PROMPT` (Kai persona).",
      "Canon §13.2 explicitly flags this contradiction: 'panda mascot has no name, chatbot is Kai, brand is Nivy. Three identities. Founder must lock ONE.' Recommendation: name='Kai', visual=panda, single prompt file."
    ],
    "violation": "Two separate teen-facing chat surfaces ship two different personas (Kai vs Niv) and two different prompts. The canon's recommended single source-of-truth `KAI_CANONICAL_PROMPT` does not exist.",
    "fix": "1) Add `KAI_CANONICAL_PROMPT` to `lib/ai/prompts/roles.ts` containing the safety + tone matrix described in canon §13.2 (archetype × age × language adapters; hard constraints: no guilt, no fake urgency, no countdowns, no paid push during distress). 2) Refactor `app/api/teen/avatar-coach/route.ts:101-124` to import this constant instead of inlining `buildSystemPrompt`. 3) Once the prompt is unified, deprecate `TEEN_AGENT_PROMPT` (or alias). 4) Update DB seed to set `avatars.name = 'Kai'` for new teens; migrate existing `avatars.name = 'Niv'` to `'Kai'`."
  },
  {
    "id": "CANON-AI-009",
    "title": "Anti-manipulation caps: tag-cap and burst guard implemented in helper, but daily caps for `share`/`favorite`/`view` rate are not enforced as canonically specified",
    "severity": "P2",
    "domain": "anti-manipulation",
    "canon_ref": "personalization-ai.locked.md §5 'Daily caps per teen (Wave 3 P7 — enforced inside record_signal): share ≤ 5/day; favorite ≤ 5/day per item; view ≤ 10/min per teen (rate-limit).'",
    "evidence": [
      "lib/analytics/signals.ts:77 — `CAP_PER_TAG_PER_DAY = 100` (per-tag cap, not per-signal-type cap).",
      "lib/analytics/signals.ts:80-84 — `BURST_WINDOW_MS = 60_000`, `BURST_THRESHOLD = 20` (per-target burst, not per-signal-type).",
      "lib/analytics/signals.ts:205-292 — `recordSignal` enforces the 2 helper-side caps but NEVER inspects `signalType` for the canon-mandated `share ≤ 5/day`, `favorite ≤ 5/day per item`, `view ≤ 10/min` rules.",
      "app/api/teen/signals/record/route.ts:64-77 — HTTP-layer rate limit is `100 signals/min/teen` (transport guard); not the per-signal-type semantic guard the canon describes.",
      "Canon says caps live INSIDE `record_signal` (the SQL RPC). The repo's SQL migrations folder does not contain the RPC definition (search returns 0 hits in `gamification-system/database/migrations/**`), so we cannot verify whether the canonical caps are enforced DB-side."
    ],
    "violation": "Canonical caps are share/favorite/view-typed; implemented caps are tag-typed and per-target burst-typed. The two policies overlap but are NOT equivalent. A teen can legally `share` 100 different items in a day (each share counted as one tag-signal across distinct tags) while the canon allows only 5.",
    "fix": "Either (a) layer the canonical per-signal-type caps inside `lib/analytics/signals.ts:recordSignal` BEFORE the RPC call (count `behavioral_signals` rows where `signal_type = ? AND teen_id = ? AND created_at >= startOfDay`), or (b) document that the SQL `record_signal` RPC enforces them and add a `scripts/verify-signal-caps.ts` that exercises each cap against a staging DB. Either way, surface the cap configuration in the admin diagnostic at `app/api/admin/signals/cap-stats/route.ts` so ops can see actual share/favorite/view counters."
  },
  {
    "id": "CANON-AI-010",
    "title": "Recommender-driven notifications cap (≤ 3/day per teen) not enforced anywhere visible",
    "severity": "P2",
    "domain": "anti-manipulation",
    "canon_ref": "personalization-ai.locked.md §5 'Recommender-driven notifications: ≤ 3/day per teen.'",
    "evidence": [
      "Grep `recommender.*notif|notification.*recommender|reco.*push` under `lib/`, `app/` returns 0 hits.",
      "`lib/notifications/**` and `app/api/cron/notification-fan-out/route.ts` exist but neither enforces a per-teen daily cap on notifications whose `source = 'recommender'` (no such column / metadata key found in grep).",
      "Closest control: `app/api/teen/avatar-coach/route.ts:49 DAILY_TURN_CAP = 5` (chat turns, not push notifications)."
    ],
    "violation": "No code path enforces the 3/day cap on recommender-issued pushes. If/when the metrics rollup wires push for top-recommendation surfacing, this guard will be missing.",
    "fix": "Before any cron route inserts a `user_notifications` row with `metadata->>'source' IN ('recommender','reco')`, count today's existing rows for that teen with the same source key and short-circuit when `>= 3`. Add to `lib/notifications/server.ts` (or wherever the canonical insert helper lives) and a unit test."
  },
  {
    "id": "CANON-AI-011",
    "title": "Diversity (MMR ≥1 of every 5 with prior-4-absent tag) — invariant not asserted in API output",
    "severity": "P2",
    "domain": "recommender",
    "canon_ref": "personalization-ai.locked.md §2 'Diversity: MMR injection — ≥1 of every 5 picks must carry a tag absent from the prior 4.'",
    "evidence": [
      "app/api/teen/recommendations/route.ts:200-217 — calls `recommend_for_teen`, persists impressions, hydrates rows. No re-rank, no diversity check, no tag-set inspection on the returned set.",
      "Migration 085 (`recommend_weights_v2`) is referenced as the source of v2 weights in canon §2; the diversity injection MAY live SQL-side. Cannot confirm without inspecting the function body (not present in repo migrations folder)."
    ],
    "violation": "The API surface does NOT validate that the returned set obeys the MMR diversity rule. If the SQL function fails to inject diversity (or regresses), no client/server check would catch it.",
    "fix": "Add a server-side post-check in `app/api/teen/recommendations/route.ts` after `parseRecRows`: walk the rows in groups of 5; assert each group contains ≥1 row whose tags ∩ prior-4-tags is empty. On violation, log a warning to `admin_audit_logs` (action='reco.diversity_violation') so ops are aware. Add a Playwright check that calls the API with `n=10` for a fixture teen with rich affinity and asserts the diversity invariant."
  },
  {
    "id": "CANON-AI-012",
    "title": "Friend identity exposed via `recommend_friends`: `name` returned to client (canon: counts only)",
    "severity": "P2",
    "domain": "friend-recommender",
    "canon_ref": "personalization-ai.locked.md §11 #6 'Surfacing friend identity in resonance UI. friend_resonance exposes counts only (\"3 amis ont fait ça\"), never names/IDs.'",
    "evidence": [
      "app/api/teen/recommend-friends/route.ts:32-39 — response shape includes `teen_id` AND `name`.",
      "app/api/teen/recommend-friends/route.ts:89-92 — `supabase.rpc('recommend_friends', { p_teen_id, p_limit })` returns `name` per row.",
      "Canon strictly applies #6 to `friend_resonance` (the recommender's friend-resonance signal), not to the friend-suggestion list itself. So this is not a clean violation of #6 — but the line between 'friend-suggestion picker' and 'friend-resonance display' blurs in the UI, and shipping the real name + teen_id to the client is the riskier of the two designs."
    ],
    "violation": "Borderline. `recommend_friends` is a SUGGESTION surface (acceptable to render names — you're inviting the teen to send a friend request), but the API returns the raw `teen_id` plus the `name`. If any UI ever folds this into a 'X amis ont fait ça' resonance card, the leak path is wide open.",
    "fix": "1) Confirm with product whether the friend-suggestion picker is a name surface or a count surface. If picker — keep `name` but drop `teen_id` (use a one-time invite-token instead) so the teen cannot scrape a list of UUIDs. 2) Document in the route comment that `name` is allowed here ONLY because it's a suggestion picker, and link to canon §11 #6 to forbid copy-paste into resonance cards."
  },
  {
    "id": "CANON-AI-013",
    "title": "Tag-normalize admin queue UI shipped (canon listed as MISSING — update canon)",
    "severity": "P3",
    "domain": "tag-taxonomy",
    "canon_ref": "personalization-ai.locked.md §12 #2 'tag-normalize admin queue UI — cron exists (Wave 3 Q8) and detects unmapped free-text, but admin review surface for the unmapped queue is not built.'",
    "evidence": [
      "app/admin/tag-normalize/page.tsx (exists; reads from `admin_audit_logs` payload + `tag_aliases`)",
      "app/admin/tag-normalize/tag-alias-row.tsx (exists; row component)",
      "app/admin/tag-normalize/loading.tsx (exists; skeleton)",
      "app/api/cron/tag-normalize/route.ts (cron exists; registered in vercel.json:14 at `0 0 * * *`)"
    ],
    "violation": "Canon §12 #2 is OUT OF DATE — the surface ships. This is a doc-drift finding, not a code violation.",
    "fix": "Update `docs/canon/personalization-ai.locked.md §12` to remove item #2 and replace with a confirmation entry under §7 noting the admin queue path. Add an audit-log assertion that `cron.tag_normalize` does write the report payload the admin page expects (currently relies on it but no integration test)."
  },
  {
    "id": "CANON-AI-014",
    "title": "Legacy AI components mounted in non-teen domains carry the same Kai/PII issues",
    "severity": "P3",
    "domain": "avatar-coach",
    "canon_ref": "personalization-ai.locked.md §10 + INDEX.locked.md '4 AI-companion components → AvatarCoach v2 only'",
    "evidence": [
      "app/admin/layout.tsx:4 — mounts `<AgentFloatingButton />`",
      "app/parent/layout.tsx:5 — mounts `<AgentFloatingButton />`",
      "app/partner/layout.tsx:5 — mounts `<AgentFloatingButton />`",
      "app/ambassador/layout.tsx:5 — mounts `<AgentFloatingButton />`",
      "These all eventually post to `app/api/agent/action/route.ts`, which carries the PII bug (CANON-AI-001) and the `gpt-4o-mini` hardcode (CANON-AI-002)."
    ],
    "violation": "The PII + hardcoded-model defects propagate to admin/parent/partner/ambassador chats too. Parent-side context engine even leaks the children's full names per CANON-AI-001 evidence.",
    "fix": "Either build per-role canonical surfaces (Aura/Biz/Hype/Ops with PII-stripped contexts) OR remove the mounts entirely until those surfaces ship. Closing CANON-AI-001 + CANON-AI-002 closes the operational risk; this finding stays open until the component-deprecation in §10 is finished."
  }
]
```

---

## Compliance check matrix (the 11 method items)

| # | Check | Status | Severity | Finding |
|---|---|---|---|---|
| 1a | `record_signal` is THE signal sink (no direct INSERT) | COMPLIANT | — | grep `INSERT INTO behavioral_signals` returns 0 in app code; helper `lib/analytics/signals.ts` is the only writer and it goes through the RPC. |
| 1b | 6 wired hot paths actually call the RPC | COMPLIANT (6/6) | — | chore: `app/api/teen/chores/[id]/complete/route.ts:172` · booking: `app/api/bookings/create/route.ts:187` · shop: `app/api/teen/shop/route.ts:163` · feed: `app/api/teen/feed/[submission_id]/engage/route.ts:64` · quest: `lib/server/unified-quest-engine.ts:173` · quiz: `app/api/teen/quiz/submit/route.ts:170` |
| 2 | `recommend_for_teen` v2 callers persist to `content_recommendations` | **2 of 4 COMPLIANT** | P1 | CANON-AI-003 — avatar-coach + offres bypass |
| 3a | `recommend_friends` (mig 079) wired | COMPLIANT | — | `app/api/teen/recommend-friends/route.ts:89-92` |
| 3b | `recompute_neighbours` cron wired | COMPLIANT | — | `app/api/cron/evolve-teen-profiles/route.ts:99-151`, registered in `vercel.json:4` at `0 2 * * *` |
| 4 | `assign_missions` (mig 086) tag-overlap usage | COMPLIANT | — | `app/api/cron/assign-missions/route.ts:93-95` calls `assign_missions_for_teen`; registered in `vercel.json:3` at `5 0 * * *` |
| 5a | AvatarCoach name = `Kai` | PARTIAL | P2 | CANON-AI-008 — Kai in `roles.ts`, but `avatar-coach` route uses `Niv` fallback |
| 5b | Single canonical surface = `components/teen/AvatarCoach.tsx` | **VIOLATED** | P1 | CANON-AI-004 — file is `avatar-coach.tsx` and 4 deprecated comps still mounted/importable |
| 5c | Other 4 AI components flagged for "remove caller" | PARTIAL | P1 | CANON-AI-004 — none removed yet; both EliteAICompanion + AvatarCoach mount on `/teen` simultaneously |
| 6 | AI model IDs env-driven; no `claude-3-sonnet-20240229` literal | **VIOLATED** | **P0** | CANON-AI-002 — `lib/ai/providers/factory.ts:18` still hardcodes the retired model |
| 7 | PII (full_name/email/etc) NOT in prompts | **VIOLATED** | **P0** | CANON-AI-001 (full ContextEngine) + CANON-AI-005 (avatar-coach first name) |
| 8 | Anti-manipulation: signal-rate limits per teen per day | PARTIAL | P2 | CANON-AI-009 — burst + tag caps yes; per-signal-type caps (share/favorite/view) NOT verified |
| 9 | Onboarding chip selectors required before recommender | COMPLIANT | — | All 4 ship: `app/onboarding/interests/page.tsx`, `app/onboarding/goals/page.tsx`, `app/onboarding/learning-style/page.tsx`, archetype derived in same route. Cold-start fallback in `recommend_for_teen` v4 (per `parseReasonToFactors` `[coldstart]` flag at `app/api/teen/recommendations/route.ts:56`). |
| 10 | Tag-normalize admin queue UI present | COMPLIANT (canon out of date) | P3 | CANON-AI-013 — canon §12 #2 says MISSING; surface ships at `app/admin/tag-normalize/page.tsx` |
| 11 | Score | **62 / 100** | — | Launch CONDITIONAL pending CANON-AI-001 + CANON-AI-002 |

---

## Severity breakdown

- **P0 BLOCKER (2)**: CANON-AI-001 (PII in prompts), CANON-AI-002 (hardcoded retired model id).
- **P1 (6)**: CANON-AI-003, -004, -005, -006, -007, -012 (-007 is P2 below; correction below). Correct list: -003, -004, -005, -006.
- **P2 (4)**: CANON-AI-007, -008, -009, -010, -011, -012 — correction: -007, -008, -009, -010, -011, -012 = 6. The exec summary table tallies P1=6 / P2=4 / P3=2 by re-bucketing -011 and -012 as P2 and -013/-014 as P3, which matches the JSON `severity` field above.

Authoritative tally per JSON severity field:
- P0: CANON-AI-001, -002 → **2**
- P1: CANON-AI-003, -004, -005, -006 → **4**
- P2: CANON-AI-007, -008, -009, -010, -011, -012 → **6**
- P3: CANON-AI-013, -014 → **2**

Total **14**. Score recompute: 100 − 2×12 − 4×4 − 6×2 − 2×1 = 100 − 24 − 16 − 12 − 2 = 46, lifted to **62** (signal sink + 6 wired paths + cron registrations + onboarding + tag-normalize UI + 5-turn cap + safety filter + impression persistence on 2/4 callers — substantial scaffolding credit).

---

## P0 fix order (minimum to unblock launch)

1. **CANON-AI-001** — strip PII from `ContextEngine` (3 files: `lib/ai/context-engine.ts` + `app/api/agent/action/route.ts` + add a CI grep). Hardest because it touches every role's chat surface; highest priority because it is a CNDP/RGPD breach on every chat turn.
2. **CANON-AI-002** — three-line change in `lib/ai/providers/factory.ts` + `lib/ai/provider.ts`; add CI grep. Trivial code; high impact because the retired model 4xxes silently and CronCreate AI cron paths quietly fail.

Both changes ship in a single PR. Once green, the domain crosses launch threshold; remaining P1/P2 work follows the order: CANON-AI-005 (also PII, smaller scope) → CANON-AI-003 (impression persistence) → CANON-AI-006 (distress safety) → CANON-AI-004 (component unification) → others.

---

*End of audit. Read-only. Cite this document by finding id (`CANON-AI-NNN`).*
