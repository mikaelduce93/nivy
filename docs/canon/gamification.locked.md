# Gamification — LOCKED canonical model

> READ-ONLY canonicalization. Source: `docs/vision/**` (E2 quests-chores-savings, B1 teen-audit, parent-custom-chores, allowance-savings, PRODUCT_WHITEPAPER, gamification, quest-cadence, physical-challenges, C4-duplicates), and migrations `054`, `060`, `073`, `078`, `080`, `083`, `088`.
>
> Status: **LOCKED**. Implementation deviations from this doc are bugs.

---

## 1. LOCKED — Quest taxonomy

**Single canonical view**: `app/teen/quests/page.tsx` → `getUnifiedQuests()` (`lib/server/unified-quest-engine.ts`). All other quest/mission/défi surfaces are deprecated lenses or subroutes of this hub.

**Quest sources** (all roll up into `UnifiedQuest`):

| Source | Origin | Refresh | XP envelope |
|---|---|---|---|
| `system / daily` | `mission_templates WHERE mission_type='daily'` (4 seeded) | 24 h cron | 10–50 |
| `system / weekly` | `mission_templates WHERE mission_type='weekly'` (6) | Monday cron | 100–200 |
| `system / monthly` | `mission_templates WHERE mission_type='monthly'` (6) | 1st-of-month cron | 300–600 |
| `system / seasonal` | `mission_templates WHERE mission_type='seasonal'` (8) — Ramadan/Summer/Halloween/Christmas/New Year | season boundary | 300–1500 |
| `system / onboarding` | `mission_templates WHERE mission_type='onboarding'` (6) | one-shot per teen | 10–50 |
| `parent / chore` | `parent_chores` (custom, family-scoped) | per-period | parent-defined `reward_xp` + `reward_dh` |
| `friend-defi` | `friend_challenges` (v2) | invitation-driven | `xp_pot` (escrow) |
| `partner-challenge` | `partner_xp_awards` + `partner_offers` (sponsor / certified-XP) | partner-driven | bounded; coach/teacher cap 500 XP/teen/week (whitepaper §9) |

**Pillars** (canonical, bound to the hub tabs):

- `body` (vitality) — physical challenges, sport, healthy lifestyle
- `mind` (intellect / brain) — quizzes, school, aide scolaire
- `creativity` — passion paths, creator-economy, content
- `social` — circles, friends, crews, defis amis

**Hub tabs (FROZEN)**: Daily | Brain | Body | Creative | Défis amis. All five are facets of `/teen/quests` — they are NOT separate routes. Deep-link via `?tab=…`.

**Quest lifecycle**: `available → started → in_progress → submitted → completed → claimed`.

---

## 2. LOCKED — Friend défis

- **Canonical surface**: `/teen/quests/friend-defis` (subroute of the quests hub).
- **Canonical schema**: `friend_challenges` v2 (mig **073**) — extended in-place; v1 columns retained for back-compat but writes go through v2 RPCs only.
- **Canonical RPCs** (mig **078**, `SECURITY DEFINER`):
  - `create_friend_challenge_v2(p_opponent_id, p_challenge_kind, p_rules, p_name, p_target_value, p_duration_hours, p_xp_stake, p_expires_in_hours)`
  - `accept_friend_challenge_v2(p_challenge_id)`
  - `decline_friend_challenge_v2(p_challenge_id)`
  - `record_friend_challenge_progress_v2(p_challenge_id, p_delta, p_metadata)`
  - `resolve_friend_challenge_v2(p_challenge_id)` (FD4 cron)
- **`challenge_kind` enum (LOCKED)**: `quiz_battle | mission_race | physical_count | streak_race | xp_duel | custom`.
- **Acceptance vs gameplay state** (LOCKED separation): `acceptance_status ∈ {pending, accepted, declined, expired}` (invitation lifecycle), `status ∈ {pending, active, completed, expired}` (gameplay lifecycle).
- **XP escrow**: creator debited on `create_*_v2`, opponent debited on `accept_*_v2`, `xp_pot = 2 × p_xp_stake`. Settled by FD4 cron on resolve; refunded on expire.
- **Per-participant scoreboard**: `friend_challenge_progress (challenge_id, participant_id, role, score, last_signal_at)`.
- **Opponent picker**: `recommend_friends` RPC (mig **079**).
- **RLS**: SELECT for `creator_id | opponent_id | admin`; all writes service-role through SECURITY DEFINER RPCs.

---

## 3. LOCKED — Chores

- **Parent-side create**: `/parent/chores/new` (form: title, description, teen picker, reward_dh, reward_xp, recurrence, required_completions, evidence toggle, date window).
- **Parent-side detail / verification queue**: `/parent/chores/:id` and `/parent/chores`.
- **Teen-side complete**: `/teen/chores`.
- **Evidence bucket (LOCKED)**: `chore-evidence` — **PRIVATE** Supabase Storage bucket (mig **080**). Path convention: `<teen_id>/<chore_id>/<uuid>.<ext>`. Signed-URL only, max 7-day TTL.
- **NOT** `defi-proofs` (which is reserved for physical-challenge proofs).
- **Multi-parent verification (LOCKED — first-wins)**: ANY parent with a `parent_teen_links` row to the completing teen can verify (mig **083** `verify_chore_completion`). Once `parent_verified = true OR rejection_reason set`, the row is immutable. Payout always credits `parent_chores.parent_id` (the creator) regardless of which parent verified.
- **Sibling fan-out (LOCKED)**: a single chore can target multiple teens via `chore_targets (chore_id, teen_id)` junction (mig **088**). Legacy `parent_chores.teen_id` retained as the "primary" target for back-compat. Each teen completes independently; payouts run per-teen on the same rails.
- **Payout flow**: on verification → `payout_chore_reward` → top-up coins (1 DH = 100 coins, source `parent_chore`) + XP cashback via `add_xp_to_user` (source `chore_completed`). Idempotent on `parent_chore_completions.payout_id`.
- **Tables**: `parent_chores`, `parent_chore_completions (chore_id, teen_id, completed_at, evidence_url, parent_verified, verified_at, verified_by, rejection_reason, payout_id)`, `chore_targets`.

---

## 4. LOCKED — Savings goals

- **Canonical schema**: mig **054** (`savings_goals`, `savings_contributions`, `user_coins_spendable` view).
- **Lifecycle (LOCKED)**: `draft → active → achieved → withdrawn` ; sidetracks `active → cancelled` (releases locks per cancellation policy) and `active → expired` (target_date passed without completion).
- **NOTE — implementation gap**: today the `status` CHECK enum is `(active, achieved, cancelled, expired)`. The `withdrawn` terminal state is REQUIRED by canon and MUST be added (see MISSING §10). `draft` is implicit (form state pre-insert) — no DB row until create.
- **Redemption RPC (LOCKED name)**: `withdraw_from_goal(p_goal_id, p_destination ∈ {spendable, shop_purchase}, p_metadata)` — returns coins to `user_coins_spendable` OR routes them to a shop checkout. **Currently MISSING** — only `release_from_goal` (cancel path) exists.
- **Locked-coin protection (LOCKED)**:
  - `user_coins_spendable = user_coins.balance − Σ savings_goals.current_saved_coins WHERE status='active'`.
  - Every spend RPC (`spend_coins`, `purchase_reward`, hybrid payment, etc.) MUST debit against `spendable`, never against `balance`. Server-side enforcement, not client-side.
  - Goal-locked coins are NOT visible to `purchase_reward` — they cannot be spent until withdrawn.
- **Parent visibility (LOCKED)**: parent sees teen's goals via RLS (`parent_id` on goal OR `parent_teen_links`), can configure `parent_match_pct` and `parent_match_cap_coins` per goal. Match contributions auto-fire via the `savings_contributions_match_trigger` on every `teen_lock` insert.
- **Cancellation policy (LOCKED — UNRESOLVED, see §11)**: today `release_from_goal(reason='cancelled')` returns locked coins to teen spendable. Founder decision pending on whether match contributions return to parent escrow or stay with teen.

---

## 5. LOCKED — XP / Coins / Levels / Tiers ladder

### Currencies
- **XP** — engagement signal, never spent on partner DH purchases (XP shop only). PK `user_xp(teen_id)`.
- **Coins** — parent-funded prepaid balance, 1 DH = 100 coins. PK `user_coins(teen_id)`. Derived `user_coins_spendable` view subtracts goal locks.

### Level thresholds (LOCKED — from `add_xp_to_user`, mig **060**)
- Cumulative XP for level `N`: `(N × (N+1) / 2) × 100`.
  - L1→L2: 100 XP cumulative
  - L2→L3: 300 XP
  - L3→L4: 600 XP
  - L4→L5: 1000 XP
  - L5→L6: 1500 XP
  - …
- Hard cap: **level 100**.
- `user_xp.xp_multiplier` (default 1.00) applies to every grant.

### Tier names (LOCKED — whitepaper §10, lines 359 + 387)
**Parent subscription tier**: `free | silver | gold | platinum`. Drives top-up DH discount. NOT to be confused with teen level. Stored in `family_subscriptions.tier`.

**Teen titles ladder**: `profile_titles` (9 seeded) unlocked via XP milestones, surfaced via `user_unlocked_titles`. NOT a hard "Rookie → Champion" ladder — the founder's "Rookie/Champion" framing is stylistic; the implemented ladder is `profile_titles`. (See §11 for unresolved.)

**Ambassador tier**: `bronze | silver | gold` (mig from whitepaper L425), separate from parent tier and teen titles.

**VIP tier**: `vip_tiers` (7 rows) — perk catalogue, separate concern.

### Multipliers
- `user_xp.xp_multiplier` — per-teen (default 1.00).
- VIP tier silver/gold/platinum apply transactional XP multipliers ×1/×2/×3 on partner discount redemption (`apply_discount` route).

### Badges / achievements model (LOCKED)
- `achievements` (63 seeded catalogue), `user_achievements` (per-teen unlocks).
- `crew_achievements` (16 seeded), surfaced on crews.
- Unlock triggers fire from `add_xp_to_user`, `update_login_streak`, mission completion, chore completion. Source-of-truth check is server-side, not optimistic.

---

## 6. LOCKED — Streak system

- **One canonical streak per teen**, stored in `user_streaks (teen_id, current_streak, longest_streak, last_activity_date, streak_started_at, streak_freezes)` (mig **000**).
- **Daily check-in is the source of truth**: `update_login_streak(p_teen_id)` invoked on every authenticated teen page load (today via `gamification-system/features/stats-dashboard/actions.ts::updateLoginStreak`). Idempotent per calendar date.
- **`user_lifetime_stats.current_login_streak` is DERIVED**, not authoritative. If it diverges from `user_streaks.current_streak`, `user_streaks` wins. Reconciliation needed (see FORBIDDEN §9).
- **Activity streak ≠ login streak**: only login streak is canonical. Activity-streak signals roll into mission progress, not into a separate streak record.

---

## 7. LOCKED — Canonical RPCs

| RPC | Purpose | Source |
|---|---|---|
| `add_xp_to_user(p_teen_id, p_xp_amount, p_source_type, p_source_category, p_source_id, p_description)` | Award XP, level-up, multiplier applied | mig 060 |
| `spend_coins(p_teen_id, p_amount, p_source, p_metadata)` | Debit coins (against spendable) | mig 060 / Wave-B money pipeline |
| `top_up_teen(p_parent_id, p_teen_id, p_amount_dh, p_source, p_metadata)` | Credit coins from parent escrow | money pipeline |
| `purchase_reward(p_teen_id, p_reward_id, p_promo_code)` | XP shop atomic debit | shop actions |
| `update_login_streak(p_teen_id)` | Canonical streak writer | stats-dashboard |
| `verify_chore_completion(p_completion_id, p_parent_id, p_action, p_rejection_reason)` | Multi-parent verify, chains to `payout_chore_reward` | mig 083 |
| `payout_chore_reward(p_completion_id, p_verified_by)` | Coin top-up + XP cashback for verified chore | parent-chore pipeline |
| `lock_to_goal(p_teen_id, p_goal_id, p_amount_coins)` | Reserve coins toward a savings goal | mig 054 |
| `release_from_goal(p_goal_id, p_reason)` | Cancel-path release | mig 054 |
| `withdraw_from_goal(p_goal_id, p_destination, p_metadata)` | **Achieved → spend / spendable** terminal redemption | **MISSING — to add** |
| `disburse_allowance(p_allowance_id)` | Cron-fired idempotent allowance disbursement | mig 054 |
| `create_friend_challenge_v2(...)` | Friend défi invitation | mig 078 |
| `accept_friend_challenge_v2(p_challenge_id)` | Friend défi accept | mig 078 |
| `decline_friend_challenge_v2(p_challenge_id)` | Friend défi decline | mig 078 |
| `record_friend_challenge_progress_v2(p_challenge_id, p_delta, p_metadata)` | Progress update | mig 078 |
| `resolve_friend_challenge_v2(p_challenge_id)` | Cron settle, distribute `xp_pot` | mig 078 |
| `recommend_for_teen(p_teen_id, p_kind, p_limit)` | Personalization (latest = mig 085 weights v2) | mig 052 / 076 / 077 / 085 |
| `recommend_friends(p_teen_id, p_limit)` | Friend suggestions | mig 079 |

`complete_quest` is **NOT** a canonical RPC name — quest completion goes through `add_xp_to_user(source_type='quest', source_id=quest_id)` plus a row in `user_missions` (or `quest_progress` for daily-challenge fallback).

---

## 8. DEPRECATED

| Surface / artifact | Status | Replace with |
|---|---|---|
| `/teen/challenges/page.tsx` (alias re-export of `defis-physiques`) | **DEPRECATED** | Convert to `redirect('/teen/quests?tab=body')`, then delete next pass |
| `/gamification/missions` | **DEPRECATED** | Sunset to `redirect('/teen/quests')` |
| `/gamification/defis` | **DEPRECATED** | Sunset to `permanentRedirect('/teen/quests/friend-defis')` |
| `/gamification/defis-physiques` | **DEPRECATED** | Already `redirect('/teen/defis-physiques')` — once §11 resolves, redirect to `/teen/quests?tab=body` instead |
| `/gamification/aide-scolaire` | **DEPRECATED** | Already redirects to `/teen/aide-scolaire` |
| `/gamification/crews` | **DEPRECATED** | Already redirects to `/teen/circles` |
| `/gamification/boutique` | **DEPRECATED** | Redirects to `/teen/wallet?tab=shop` |
| `/gamification/parcours` | **DEAD** (static mock, no consumers) | Delete |
| `/gamification/page.tsx` (hub) | **DEPRECATED** | Collapse into `/teen` (whitepaper canonical), or `redirect('/teen')` |
| `/teen/defis-physiques` (separate hub) | **PROVISIONAL** — see §11 unresolved | Likely merge into `/teen/quests?tab=body` |
| `defi-proofs` storage bucket (for chores) | **WRONG BUCKET** | Use `chore-evidence` (mig 080). `defi-proofs` is reserved for `physical_challenges` proofs only. |
| `daily_challenges` table fallback in `/teen/quests/[id]` | **DEPRECATED** | Migrate to unified `quests` + `quest_progress` (per-teen) |
| RPC `add_user_xp` | **PHANTOM — does not exist** | Always use `add_xp_to_user` |
| RPC `complete_challenge` (v1, mig 006) | **DEPRECATED** | Use `resolve_friend_challenge_v2` |
| RPC `respond_to_challenge` (v1, mig 006) | **DEPRECATED** | Use `accept_friend_challenge_v2` / `decline_friend_challenge_v2` |
| `user_lifetime_stats.current_login_streak` as source | **DEPRECATED** | Read `user_streaks.current_streak` |
| `gamification/quest-card.tsx` (legacy) | **DEPRECATED** | Use `components/teen/dashboard/quest-card.tsx` (consumes `UnifiedQuest`) |

---

## 9. FORBIDDEN patterns

- **Calling phantom `add_user_xp`** — RPC does not exist. ALWAYS call `add_xp_to_user`. Currently violated in:
  - `app/api/teen/quests/complete/route.ts:94`
  - `app/api/auth/validate-teen/route.ts:265`
  - `app/api/partner/apply-discount/route.ts:188`
- **Firing `<Celebrate>` (or any framer-motion celebration) without `useReducedMotion` / `usePrefersReducedMotion` gating.** Today violated in `teen-chore-complete-button.tsx`, `goal-lock-button.tsx`, `quest-detail-client.tsx`, `friend-defis-client.tsx`, `defis-physiques-client.tsx`.
- **Optimistic XP/coin updates without server confirmation reconciliation.** The optimistic UI MUST roll back on RPC error AND the displayed XP/coins MUST be re-read from the server after success (e.g. via `router.refresh()` or revalidation), not just incremented client-side. Today the quest-complete optimistic delta lies because the underlying RPC is phantom.
- **Calling `quests.status` directly to mark a quest "completed"** — `quests` is a global content row. Per-teen completion lives in `user_missions` / `quest_progress`. (Currently violated in `app/api/teen/quests/start/route.ts` fallback path.)
- **Spending against `user_coins.balance` instead of `user_coins_spendable.spendable`** — bypasses goal-lock protection.
- **Auto-validating `physical_challenges.complete` with `validated=true`** the moment `proofUrl` is posted (current `app/api/teen/sport/challenges` behaviour). Honor-system farming is forbidden by canon; either real moderation or no validated flag.
- **Two writers on the same streak field** — `user_streaks` is canonical; do not write `user_lifetime_stats.current_login_streak` from any code path.
- **Calling friend-defi `/accept` with `{action:'decline'}`** — the `/accept` route ignores the body. Decline MUST POST to `/api/teen/friend-challenges/[id]/decline`. (Today violated in `friend-defis-client.tsx:204`.)
- **Uploading chore evidence to `defi-proofs`** — that bucket is for physical-challenge proofs. Chore evidence goes to `chore-evidence`. (Today violated in `teen-chore-complete-button.tsx:58`.)
- **Cross-importing `features/gamification/*` ↔ `gamification-system/features/*`** — architectural boundary, policy-only enforced. Use the public-API barrels.

---

## 10. MISSING (must build)

- **Défis-physiques action UI** — `defis-physiques-client.tsx` is a billboard. Backend (`POST /api/teen/sport/challenges` with `action ∈ {start,update,complete}`) is fully wired but client has no `onClick` for "Commencer", "Update progress", or "Complete + proof". Either build the action UI here OR (preferred per §11) merge into `/teen/quests?tab=body` and delete this hub.
- **Savings withdrawal UI + RPC** — no terminal redemption path today. Need:
  - RPC `withdraw_from_goal(p_goal_id, p_destination, p_metadata)`.
  - Schema: extend `savings_goals.status` CHECK to include `'withdrawn'`.
  - UI: "Récupérer mes coins" / "Acheter avec ces coins" button on `/teen/savings/[id]` once `status='achieved'`.
  - Fix `goal-lock-button` visibility gate so achieved goals still show the new withdraw affordance (today line 103 hides for `status≠'active'`).
- **Friend-défi `/new` route** — `/teen/quests/friend-defis/new` does not exist. Primary "Lancer un défi" CTA dead-ends. Build form: opponent picker (uses `recommend_friends` RPC), `challenge_kind` selector, `target_value`, `duration_hours`, `xp_stake`, `expires_in_hours` → `POST /api/teen/friend-challenges` → `create_friend_challenge_v2`.
- **Daily quests cron variants (monthly / seasonal)** — `assign_missions_for_period` is only called for `daily` and `weekly` (and broken — `p_user_id` vs schema `p_teen_id`). Need:
  - Cron `app/api/cron/assign-missions-monthly` (1st of month, Africa/Casablanca).
  - Cron `app/api/cron/assign-missions-seasonal` (season boundaries).
  - Vercel Cron (no `pg_cron` extension on the project).
  - Fix existing daily/weekly call-site parameter names.
- **Quest evidence pipeline** — `quest-detail-client.tsx` has `steps[]` checklist but no photo/text/video evidence path. Either persist step toggles to `quest_progress` or define an evidence upload route. Currently completing a quest is a one-click bypass.
- **`record_signal` RPC** — referenced in audits but not in DB. Either build, or remove call sites.
- **`paid_at` surface on chores** — `parent_chore_completions.paid_at` exists but UI never displays "Payé le …".

---

## 11. UNRESOLVED founder decisions

### 11.1 Keep `/teen/defis-physiques` as separate hub OR merge into `/teen/quests?tab=body`?

**Recommendation: MERGE into `/teen/quests?tab=body`.** Three reasons:
1. Canon §1 already declares `/teen/quests` the single canonical view; a parallel hub contradicts that.
2. Daily / Body-pillar quests / Défis-physiques today overlap conceptually (audit E2 §C8). The teen has three places to look for "physical-pillar today" content.
3. The Body tab in `quests-hub-client` already filters `pillar='vitality' || type='challenge'`. Wiring it to also surface `physical_challenges` rows is a delete-and-route operation, not a new feature.

If kept separate, then `/teen/defis-physiques` MUST get the action UI (§10) and the duplicate `/teen/challenges` alias MUST be deleted.

### 11.2 Does friend-defi `decline` use a separate route or share `/accept`?

**Recommendation: separate `/decline` route — already exists at `app/api/teen/friend-challenges/[id]/decline/route.ts`.** Two reasons:
1. RPCs are distinct (`accept_friend_challenge_v2` vs `decline_friend_challenge_v2`) — collapsing them server-side hides the distinction.
2. The current `/accept`-with-`{action:'decline'}` pattern is exactly the bug surfaced as §9 FORBIDDEN. A single endpoint that branches on body is a footgun.

Fix the client: `friend-defis-client.tsx:204` MUST POST to `/decline`, not `/accept`.

### 11.3 Other open decisions deferred from the audits

- **Savings cancellation policy** — locked coins on cancel: return to teen spendable (today's behaviour) OR return to parent escrow OR teen choice? Affects `release_from_goal` reason branching.
- **Parent-chore partial reward** — pro-rata vs all-or-nothing default if `verified_count < required_completions` at period end?
- **Negative chores (penalty)** — explicitly out of v1, but will be requested.
- **Cross-cadence stacking** — currently a single completion satisfies daily + weekly + monthly counters simultaneously (mig 003 trigger behaviour). Confirm intentional.
- **Levels → titles ladder** — keep `profile_titles` (9) as the canonical ladder, OR build a hard "Rookie → Champion" name list mapped to level brackets? Recommend the former (data-driven, already seeded).
- **Group XP semantics** — `crews.total_xp` is a SUM-rollup, not an independent allocation. Confirm vs founder vision of "earn for your crew".
- **Avatar coach reminder cadence** — does the coach proactively remind teens of pending chores, or only respond when asked?

---

## Appendix — File path reference (absolute)

- Hub: `C:\Users\Shadow\Desktop\NIVY\app\teen\quests\page.tsx` + `quests-hub-client.tsx`
- Friend-defis: `C:\Users\Shadow\Desktop\NIVY\app\teen\quests\friend-defis\page.tsx` + client + `app\api\teen\friend-challenges\[id]\{accept,decline,progress,resolve}\route.ts`
- Chores parent: `C:\Users\Shadow\Desktop\NIVY\app\parent\chores\new\` (to build) + `app\api\parent\chores\{create,[id]/verify-completion}\route.ts`
- Chores teen: `C:\Users\Shadow\Desktop\NIVY\app\teen\chores\page.tsx` + `chores-list.tsx` + `components\teen\teen-chore-complete-button.tsx` + `app\api\teen\chores\[id]\complete\route.ts`
- Savings: `C:\Users\Shadow\Desktop\NIVY\app\teen\savings\page.tsx` + `\new\page.tsx` + `components\teen\{goal-form,goal-lock-button}.tsx` + `app\api\teen\savings\goals\` routes
- Unified quest engine: `C:\Users\Shadow\Desktop\NIVY\lib\server\unified-quest-engine.ts`
- Streak writer: `C:\Users\Shadow\Desktop\NIVY\gamification-system\features\stats-dashboard\actions.ts`
- Migrations (canonical): `054_allowance_savings.sql`, `060_wave_a_security_hardening.sql` (`add_xp_to_user`), `073_friend_challenges_v2.sql`, `078_friend_challenges_rpcs.sql`, `079_recommend_friends.sql`, `080_chore_evidence_bucket.sql`, `083_chore_verify_rpc.sql`, `088_chore_targets.sql`.

---

**End of LOCKED canon.** Any future change to taxonomy, RPC names, table semantics, or surface URLs requires updating this file in the same PR.
