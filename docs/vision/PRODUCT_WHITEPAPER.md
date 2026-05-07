# NIVY — Product Whitepaper

> **Date**: 2026-05-07
> **Sources**: 10 specialist audits in `docs/vision/`, live Supabase DB on project `imchornjvmgmaovhypco`, full code review of `app/`, `components/`, `lib/`, `gamification-system/`, `features/`.
> **Methodology**: Each domain crossed three sources — vision intended (founder), code state (real file references), DB state (live row counts). Verdicts P0/P1/P2 are rolled up here from the per-domain reports.

---

## Executive summary

**Nivy** is a Moroccan-built lifestyle and gamification platform for **teens 13-17** and their **parents**. The teen earns **XP** through quizzes, physical challenges, group activities and an avatar-coach loop, while the parent buys **coins** in dirhams to fund spending on partner discounts, event tickets and rewards. The product targets a triangle — *teen, parent, partner* — that the existing competitive set (mobile games, generic loyalty apps) does not address. **The code is 60-70 % built** and the schema **stalls in places** : two-currency conversions, parental authorizations, AI content pipelines and the avatar coach are scaffolded but **disconnected from real data**. This whitepaper consolidates what works, what is mocked, what is missing, and turns it into a shippable roadmap.

---

## 1. Vision and pillars

Nivy is built around **four product pillars** that interact:

| Pillar | What it delivers | Primary audit |
|---|---|---|
| **Teen Engagement Loop** | Daily quizzes + physical défis + missions + streaks + avatar coach + group play | `gamification.md`, `quiz-ai.md`, `physical-challenges.md`, `avatar-coach.md` |
| **Two-currency Economy** | XP earned via activities + coins purchased in DH by parents → spent at partners | `economy.md`, `rewards-economy.md` |
| **Parent Trust Layer** | E-signature gate, top-up, ceilings, approval queue, spend visibility | `parent-control.md` |
| **Partner Marketplace** | 4 partner types (retail / venue / club / education) with offers, scanner, commissions | `partner-network.md` |

The **avatar coach** ties pillars 1 and 2 together: it surfaces personalized challenges (pillar 1) whose XP rewards drive spending (pillar 2). Today only its skeleton exists.

The **AI content layer** (quiz generation, validators, moderation) is a horizontal capability spanning all pillars, audited in `ai-content.md`. It is **fully scaffolded but dormant** — no LLM call has been wired to a user-facing surface.

---

## 2. Two-currency economic model

### Vision

- **XP** is *earned* — quizzes (`xp_reward` per row in `educational_quizzes`), physical challenges (`physical_challenges.xp_reward`), missions, achievements, group bonuses.
- **Coins** are *purchased* — the parent tops up in DH on `/parent/topup`, the teen sees the balance in `/teen/wallet`.
- **Conversion** is the connective tissue: a teen with surplus XP should be able to convert into coins (or unlock special items XP-only). Conversely, coins should be spendable on the same shop where XP is spendable.
- **Parental ceilings** cap monthly top-ups by tier (`family_subscriptions.tier`).

### Reality (per `docs/vision/economy.md`)

| Aspect | Status | Evidence |
|---|---|---|
| XP earning | ✅ wired | `educational_quizzes.xp_reward` populated; `app/api/teen/quiz/submit/route.ts` writes `quiz_attempts` |
| Coin top-up | ❌ broken | `app/api/parent/topup/route.ts:51-69` writes to `profiles.total_coins` (column does not exist); `coin_transactions` has 0 rows live |
| XP → coins | ❌ does not exist | No code path computes a swap. `lib/payments/xp-converter.ts:10` exposes `XP_TO_DH_RATE = 0.10` (display-only) |
| Rate consistency | ❌ 10× drift | Code = `0.10 DH/XP` (1 DH = 10 XP). DB seed `xp_payment_settings.xp_to_dh_rate = 100` (1 DH = 100 XP). Off by an order of magnitude. |
| Hybrid payment | ❌ unfinished | `app/api/payments/hybrid/route.ts` references `parental_approvals` table — **does not exist** |
| Parental ceilings | ❌ vision-only | No DB column, no code check, no UI surface |
| Wallet UI | ⚠️ hardcoded | `app/teen/wallet/wallet-hub-client.tsx:34` `coins: 0` static comment "TODO: Fetch from user_coins" |

### What this means for the user
A teen sees `0 coins` in their wallet **regardless of what their parent topped up**, because the credit never lands in the table the wallet reads from. A parent who tops up does not see the transaction in `coin_transactions`. The hybrid checkout fails with `relation parental_approvals does not exist`. **The economic engine is non-functional on the new project.**

### What needs to be decided (founder)
1. Canonical `XP → DH` ratio (resolve the 10× drift).
2. Is there a teen-initiated XP→coins swap, or only parent-funded coins?
3. Per-tier monthly top-up cap values (Free / Silver / Gold / Platinum).
4. Refund policy on partner-side cancellations.

---

## 3. Daily user experience

### Teen morning flow (target)
```
6:30 AM  — Avatar greets ("Salam Amine, prêt pour ton quiz du jour ?")
        Daily quiz (3-5 Q, ~3 min) — math/sciences/culture, adapted to grade
        XP earned, streak ticks +1
        
12:00   — Push notification: physical défi suggestion ("20 min de marche après l'école?")
        Photo proof on completion → XP
        
18:00   — Friend leaderboard ping: "Yasmine just got 200 XP, you're at 180"
        Crew battle invitation
        
21:00   — Wallet check : 5 200 coins disponibles, +120 XP cette semaine
        See an offer at TechStore (-20 %, 800 coins) → reserve
```

### Reality
- ✅ Quiz hub renders, daily quiz selection works (`lib/quiz/server.ts:getDailyQuizForTeen`).
- ✅ Quiz submit logs an attempt and writes XP to `user_xp` via RPC `add_xp_to_user`.
- ❌ Avatar greeting: only Kai chatbot at `/teen/chat`, no morning trigger, no name-aware greeting.
- ❌ Physical défi push: no scheduler, no notification system. UI exists at `/teen/defis-physiques` but the "Commencer" button is inert (per `docs/vision/physical-challenges.md`).
- ❌ Friend leaderboard "live": `friend_challenges` table populated with templates but `user_friend_challenge_progress` has 0 rows.
- ❌ Wallet shows `0 coins` (see Section 2).

### Parent flow
- ✅ E-signature form scaffolded at `/parent/e-signature` and the gate at `app/api/parent/topup/route.ts:51-69` checks `e_signatures.terms_accepted`. **But** `e_signatures` table does not exist on the new project (per `docs/vision/parent-control.md`).
- ✅ Top-up form renders.
- ❌ Top-up *side-effect* is broken (Section 2).
- ❌ Approval queue at `/parent/approvals` reads from `parental_approvals` — **table missing**.
- ❌ Spend history reads `coin_transactions` — empty.

### Partner flow (per `docs/vision/partner-network.md`)
- ✅ Public signup at `/devenir-partenaire/inscription` with 4-type wizard.
- ⚠️ Approval state machine exists (`active` / `pending` / etc.) but only **1 stub partner** in DB.
- ❌ Scanner: real implementation exists in code but the dashboard wires the **mock** version (`components/partner/mock-scanner.tsx`).
- ❌ Sales recording: `partner_transactions` doesn't persist — APIs target `vip_cards`, `discount_usage` — both missing.
- ❌ Commission: no calculation persisted anywhere.

---

## 4. Gamification mechanics

Per `docs/vision/gamification.md`:

### Catalogs (✅ seeded)
- 30 `mission_templates`
- 63 `achievements`
- 13 `seasonal_challenges`
- 16 `crew_achievements`
- 10 `challenge_types`
- 12 `wheel_segments`
- 5 `physical_challenges`

### Per-user state (❌ all empty)
- `user_missions`, `user_streaks`, `user_achievements`, `user_wheel_spins`, `user_friend_challenge_progress`, `crews`, `user_seasonal_progress` — every one has 0 rows live.

### Three parallel quest surfaces (architectural debt)
- `/teen/quests` synthesizes pillar-quests at runtime via `lib/server/unified-quest-engine.ts`.
- `/gamification/missions` reads from `mission_templates`.
- `/gamification/defis` runs friend-duels via `friend_challenges`.

These three are not unified; teen sees three different "quest" pages with different data shapes. **P0** to consolidate (or to define which is canonical).

### Crews & friend challenges
- Code: `gamification-system/features/crews/actions.ts:createCrew` (RPC) + approval flag.
- Group XP allocation: simple **SUM rollup of member XP**, not redistributed. Decision to make: should winning a crew battle award bonus XP per member, or pool then split?

---

## 5. AI-driven personalization

Per `docs/vision/quiz-ai.md` and `docs/vision/ai-content.md`:

### Code surface (mature scaffolding)
- `lib/ai/` — OpenAI provider via `@ai-sdk`, parallel Claude fetch path (using **deprecated** `claude-3-sonnet-20240229`).
- 3 validator layers: pedagogical, Moroccan-context, moderation.
- Cron route `app/api/cron/generate-content/` exists but **no `vercel.json` schedule**.
- Migrations 032-034 set up `content_generation_logs`, `content_validations`, `intelligent_content_*`.

### Live state
- Every AI-related table empty: 0 generations, 0 validations, 0 behavioral profiles, 0 quiz_attempts.
- Cron's teen-selection query references columns that **do not exist** on `teens` (`grade_level`, `interests`, `school`).
- Moroccan validator: hardcoded name list. **Darija explicitly forbidden in prompts** (decision needed: support Darija quizzes or not?).

### Quiz personalization
- `getDailyQuizForTeen(teenId)` selects via `dayIndex % pool.length` — **NOT adapted to teen profile**. It rotates the same pool for every teen.
- `educational_quizzes` has 9 seed quizzes. Adaptive selection by `grade_level`, `subject`, `language` is unimplemented.

### Top decisions
1. Canonical LLM provider (OpenAI vs Claude vs both with fallback)?
2. Generation cadence (nightly batch vs on-demand vs JIT)?
3. Multilingual scope: French / Darija / Arabic / English?
4. Human review queue for failed validations?

---

## 6. Partner ecosystem

Per `docs/vision/partner-network.md`:

### Partner types (intended)
- **Retail** — TechStore, fashion, books, tech gear (% off).
- **Venue** — Lounges, themed birthdays, restaurants (event tickets, free entry).
- **Club** — Fitness, dance, sports academies (memberships, drop-ins).
- **Education** — Tutoring, code academies, language schools (course discounts, possibly grade integration).

### Reality
- 4-type wizard wired in `/devenir-partenaire/inscription`.
- `partners.partner_type` accepts free text — **no CHECK constraint** enforcing the 4 values.
- `partner_discounts` is empty.
- Scanner UI exists (`components/partner/scanner.tsx`) but the **mock** version is wired in the dashboard.
- No commission persistence — neither in `partner_transactions` nor anywhere else (table doesn't exist on the new project).

### What's missing
- KYC flow → `kyc_documents` table absent.
- Sales analytics → no aggregation views (the OLD project had `partner_monthly_sales` view; not in current schema).
- Education-specific surface for grade integration (per migration 022 `pillars_system`, but UI is empty).

---

## 7. Parent control surface

Per `docs/vision/parent-control.md`:

### Implemented
- `/parent` dashboard renders (after the missing `parent_teens_overview` view was added in this session).
- Top-up form UI.
- E-signature form UI.
- POST `/api/parent/e-signature/create` exists.

### Missing on live DB
- `e_signatures` table.
- `parental_approvals` table.
- `teen_budget_limits` table (referenced in code).
- `parent_teen_links.status` column referenced everywhere — **not in schema**.

### Compliance issues
- CIN scans land in a **public** Supabase storage bucket. **Loi 09-08 / CNDP risk** — must be private + RLS-gated.
- Tier naming **diverges**: docs say Free / Silver / Gold / Platinum, code uses Free / Starter / Pro / Elite / Family.

### Decisions needed
- 1 parent ↔ N teens vs N ↔ N (divorced parents)?
- Approval notification channel: push / SMS / email?
- Real-time vs daily-digest spend visibility?

---

## 8. Data model spine

Per `docs/vision/data-model.md`:

### Big numbers
- **214 tables**, 5 views in `public`.
- **34 tables with RLS enabled but ZERO policies** → silently broken access for all non-service-role queries.
- **0 triggers on `auth.users`** (no auto-profile creation; we patched this manually).
- **45+ tables referenced in code but missing from DB**: `e_signatures`, `parental_approvals`, `teen_budget_limits`, `vip_cards`, `discount_usage`, `ambassadors`, `anniv_*`, `posts`, `schools`, `avatars`, etc.

### Identity sprawl
Four parallel "user" tables: `auth.users` (Supabase Auth), `public.users` (mirror), `public.profiles` (role + name), `public.teens` (teen-specific). Foreign keys drift across them — some FK to `auth.users.id`, some to `profiles.id`, some to `teens.id`. **P0 to canonicalize**.

### Schema gaps by pillar
| Pillar | Tables expected | Tables present | Gap |
|---|---|---|---|
| Economy | user_xp, user_coins, coin_transactions, family_subscriptions, parental_ceilings | 4/5 (no ceilings) | 1 missing |
| Gamification | 20+ | 20+ | OK as schema, empty as data |
| Quiz/AI | educational_quizzes, quiz_attempts, content_validations, generation_logs, behavioral_profiles | 5/5 | Empty |
| Partners | partners, partner_discounts, partner_transactions, vip_cards, kyc_documents | 2/5 | 3 missing |
| Parent | parent_teen_links, e_signatures, parental_approvals, teen_budget_limits | 1/4 | 3 missing |
| Avatar | avatars, user_avatar_state, avatar_skins | 0/3 | All missing |

### Recommended consolidation pass
1. Resolve the `users / profiles / teens / auth.users` quadruple — pick ONE source of truth for `teen_id`.
2. Add the 6 missing core tables (e_signatures, parental_approvals, teen_budget_limits, partner_transactions, vip_cards, kyc_documents).
3. Patch RLS policies on the 34 silently-broken tables (the patch SQL is in `docs/E2E_SETUP.md`).
4. Drop dead schemas from migrations not in use (token rewards 028, etc.).

---

## 9. Compliance and risks

| Risk | Severity | Source |
|---|---|---|
| **CIN scans in public storage** | 🔴 P0 (CNDP) | `parent-control.md` |
| **Mystery boxes = gambling regulation** in Morocco | 🟠 P1 | `rewards-economy.md` |
| **Parental e-signature gate fails open** because table is missing | 🔴 P0 (loi 09-08) | `parent-control.md` |
| **Deprecated Claude model** in production AI calls | 🟠 P1 | `ai-content.md` |
| **34 RLS-enabled tables with no policies** | 🟠 P1 (data exposure or 100% denial depending on path) | `data-model.md` |
| **Teen photo/video proof storage** policy unknown | 🟠 P1 | `physical-challenges.md` |
| **No FX/audit trail** on coin transactions | 🟠 P1 (financial reconciliation) | `economy.md` |

---

## 10. Roadmap to ship — P0 / P1 / P2

### P0 — Cannot ship without
1. **Repair coin pipeline** — top-up writes to a real column, wallet reads it (`docs/vision/economy.md` §4).
2. **Resolve XP↔DH 10× drift** — pick the canonical rate, update both code and DB seed.
3. **Create `parental_approvals` + `e_signatures` + `teen_budget_limits` tables** + wire the e-sig gate on hybrid payments.
4. **Move CIN storage bucket to private with RLS-bound URLs**.
5. **Identity unification** — pick `teens.id == auth.users.id` (or whichever) and align FKs.
6. **RLS policies** on the 34 silently-broken tables (patch SQL ready in `docs/E2E_SETUP.md`).
7. **Wire avatar greeting on `/teen` dashboard** (even minimal — pull teen's first name + 1 generated message).

### P1 — Required for the vision to feel coherent
8. **AI content cron** — schedule it via `vercel.json`, fix the teen-selection query, run nightly batch.
9. **Adaptive `getDailyQuizForTeen`** — filter by grade_level, language, past attempts.
10. **Three quest surfaces → one canonical** (recommend `/teen/quests` powered by `unified-quest-engine`).
11. **Partner real scanner** swapped in dashboard.
12. **Commission persistence** — new `partner_transactions` table + writes on each redemption.
13. **Mystery box reveal flow + legal review** (loi sur les jeux de hasard).
14. **XP↔coins swap UI** at the wallet (or remove it from vision).
15. **Per-tier top-up ceilings** — DB column + UI hint.
16. **Physical défi validation flow** — pick mechanism (parent toggle / coach approval / AI photo check).

### P2 — Polish and depth
17. **Crew battle XP redistribution** rule.
18. **Avatar customization unlocks** (the `user_unlocked_*` schema is empty).
19. **Multilingual content** (Darija decision — yes or no).
20. **Education partner ↔ teen_grades integration**.
21. **Birthday organizer feature** (`anniv_*` tables referenced in code, missing from DB — out of scope?).
22. **Subscription tier name alignment**.

---

## 11. Frontend redesign brief (handoff)

Once this whitepaper is approved, the **frontend-gap-mapper** agent will produce `docs/vision/FRONTEND_REDO.md` — a page-by-page matrix : intent vs current UI vs redesign brief. Below is a **strawman** to inform that next phase.

### Pages requiring rewrite (high-impact)
| Page | Current | Should become |
|---|---|---|
| `/teen` (dashboard) | Generic feed | Avatar coach greeting + today's défi card + XP/coins twin gauge + 3 quick-access tiles |
| `/teen/wallet?tab=shop` | List of rewards | Filter rail (XP-only / coins / hybrid / partner-type) + reward grid + balance hero |
| `/teen/quiz` | Static category list | Daily quiz hero (with avatar voiceover slot) + recommended for you (adaptive) + recent attempts |
| `/teen/defis-physiques` | Mock list | Defi-of-the-day card + crew-battle banner + "your stats" mini-dashboard |
| `/parent` | Generic | Spending dashboard + approval queue + linked teens grid + tier widget |
| `/parent/topup` | Static packs | Live coin balance per teen + recommended pack based on usage + tier discount visualizer |
| `/partner` | Generic | KPI hero (today's redemptions / month commission) + recent sales feed + active offers manager |

### Components to add
- `<AvatarCoach>` — sticky companion across `/teen/*`, with mood states, suggestions, audio slot.
- `<TwinCurrencyGauge>` — XP and coins side-by-side, with conversion CTA.
- `<DefiCard>` — unified card for quiz, physical, group défi (replace the 3 parallel surfaces).
- `<PartnerOfferTile>` — discoverable from teen wallet, geofenced to user city.
- `<ParentSpendChart>` — live read of `coin_transactions` once it's wired.

### Removed surfaces (already redirected, confirm)
- `/xp-shop`, `/teen/rewards`, `/gamification/boutique` → `/teen/wallet?tab=shop`.
- `/teen/academic` → `/teen/aide-scolaire`.
- `/gamification/{aide-scolaire, defis-physiques, crews}` → teen counterparts.
- `/teen/leaderboard`, `/teen/achievements`, `/teen/challenges` → gamification counterparts.

---

## Index of detailed audits

- [Economy — 2-currency model](./economy.md)
- [Gamification engine](./gamification.md)
- [Quiz + AI personalization](./quiz-ai.md)
- [Physical challenges](./physical-challenges.md)
- [Avatar coach](./avatar-coach.md)
- [Partner network](./partner-network.md)
- [Parent control](./parent-control.md)
- [Rewards economy](./rewards-economy.md)
- [AI content pipelines](./ai-content.md)
- [Data model](./data-model.md)

---

## Top 10 founder decisions to unblock everything

1. Canonical XP↔DH rate (resolve 10× drift).
2. Is XP→coins swap a teen-initiated action, or only parent-funded coins?
3. Per-tier monthly top-up ceilings (Free / Silver / Gold / Platinum values).
4. Avatar persona: name (Kai? Niv? Panda?), single shared mascot or per-teen?
5. AI provider standardization: Claude / OpenAI / both?
6. Multilingual scope: include Darija content?
7. Mystery box legality stance.
8. Approval channel for parents: push / SMS / email / in-app only?
9. Commission model: subscription / per-sale / hybrid?
10. Identity table — `teens.id`, `profiles.id`, or `users.id` as canonical teen identifier?

---

> **Next step**: read this whitepaper end-to-end. When ready, invoke the `frontend-gap-mapper` agent to produce a page-by-page redesign matrix.
