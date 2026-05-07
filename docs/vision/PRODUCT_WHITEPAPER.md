# NIVY — Product Whitepaper (v2)

> **Date**: 2026-05-07
> **Sources**: 16 specialist audits in `docs/vision/`, live Supabase DB on project `imchornjvmgmaovhypco`, full code review of `app/`, `components/`, `lib/`, `gamification-system/`, `features/`.
> **v2 changes vs v1**: corrected XP semantics (purely reward, no swap to coins), added Token Economy Loop (spending earns XP), integrated 6 new domains (parental authorizations, teacher/coach XP, ambassadors, birthdays, quest cadences, Morocco payment rails). Added 25 founder decisions.

---

## Executive summary

**Nivy** is a Moroccan-built lifestyle and gamification platform for **teens 13-17** and their **parents**. The product ties three audiences in a single loop:

1. **Teens** earn **XP** through effort (quizzes, physical défis, group challenges, teacher/coach awards, birthdays, missions, **and spending coins**) — XP is a **reward currency** that unlocks rewards/events/status.
2. **Parents** fund their teen's account in **DH** (real money) which becomes a **prepaid coin balance** held in escrow on the platform; they choose between autonomous spending (pre-approved with ceilings) or per-transaction validation; their tier (Free / Silver / Gold / Platinum) drives top-up discounts.
3. **Partners** (4 types: retail / venue / club / education) sell offers, run challenges and award XP. Coaches and teachers (sub-types) certify XP grants. Ambassadors refer new families and earn commissions.

**The two currencies do NOT convert**. XP rewards effort, coins are pre-paid stable spending power. The bridge is a **loyalty loop**: each coin spent on a partner offer earns XP back, which itself unlocks more rewards. Crypto is illegal in Morocco — coins are a DB-tracked escrow balance backed by DH held by Nivy or a licensed e-money partner.

**Build state**: code is 60-70 % scaffolded but **the live Supabase project lacks ~50 critical tables** (`parental_approvals`, `e_signatures`, `ambassadors`, `partner_transactions`, `payment_transactions`, `coin_transactions` populated, etc.), the **two-currency pipeline is broken** (top-up writes to a non-existent column, hybrid payment route fails on missing tables), and major features (avatar coach, teacher-XP, birthdays, ambassadors) are **UI-only shells** with empty data plumbing. The whitepaper below maps everything the product is supposed to do, what's coded, what's wired, and what needs to be built before we can re-attack the frontend.

---

## 1. Vision and pillars

| Pillar | What it delivers | Audits |
|---|---|---|
| **Teen Engagement Loop** | Daily quizzes + physical défis + group challenges + avatar coach + monthly quests + birthday rewards | `gamification.md`, `quiz-ai.md`, `physical-challenges.md`, `avatar-coach.md`, `quest-cadence.md`, `birthday.md` |
| **Token Economy** | XP (reward currency, earned by effort + spending) + coins (parent-funded prepaid balance) + spend-earns-XP loop | `economy.md`, `rewards-economy.md`, `payment-rails-morocco.md` |
| **Parent Trust Layer** | E-signature CGU + parental authorizations (per-action) + top-up + ceilings + auto/validate spending modes + spend visibility | `parent-control.md`, `parental-authorizations.md`, `payment-rails-morocco.md` |
| **Partner Marketplace** | 4 types (retail/venue/club/education) + KYC + offers + scanner + commissions; sub-roles (teacher, coach) certify XP | `partner-network.md`, `teacher-coach-xp.md` |
| **Network Growth** | Ambassador/parrain/referral system; referrer earns commission on filleul purchases + XP/coin bonuses | `ambassador-referral.md` |
| **AI horizontal layer** | Quiz generation, défi suggestions, validators, moderation, avatar dialogue | `ai-content.md` |
| **Data & compliance** | Schema spine, RLS hygiene, CNDP/loi 09-08, Moroccan e-money law | `data-model.md`, `payment-rails-morocco.md` |

---

## 2. Token Economy — the heart of the product

### 2.1 Two distinct currencies

| | XP | Coins |
|---|---|---|
| **What** | Reward currency | Prepaid spending currency |
| **How earned** | Effort: quizzes, défis, missions, group play, birthdays, teacher/coach awards, spending coins | Parent top-up in DH |
| **How spent** | On rewards, events, premium content, status items | On partner offers, event tickets, hybrid purchases |
| **Convertible?** | NO — XP doesn't convert to coins or DH | NO — coins are a balance, not crypto, not transferable to another account |
| **Stored as** | Integer in `user_xp.total_xp` | Integer in `user_coins.balance` (today shows 0 in UI — see §2.3) |
| **Backed by** | Nothing — pure reward token | Real DH held in escrow by Nivy or licensed e-money partner |

### 2.2 The spend-earns-XP loyalty loop

When a teen spends coins on a partner offer, **the system credits XP back** (configurable cashback %).
```
Spend 100 coins on TechStore offer → earn N XP (e.g. 10 XP, 10% cashback)
```
This creates a loyalty loop:
- More coin spending → more XP → more rewards unlocked → more engagement → more reasons for parent to top up → more spending.

**This is what makes coins worth using even if they don't convert to XP**. Every coin you spend is also slowly building XP. Founder decision needed (see §13): cashback rate, per-partner customization, capped or unlimited.

### 2.3 Live state — broken pipeline

Per `docs/vision/economy.md`:

| Component | Status | Evidence |
|---|---|---|
| XP earning | ✅ wired (quiz submit) | `app/api/teen/quiz/submit/route.ts` writes `quiz_attempts`, calls RPC `add_xp_to_user` |
| XP earning from spending | ❌ does not exist | No code path awards XP on coin spend |
| Coin top-up | ❌ broken | `app/api/parent/topup/route.ts:51-69` writes to `profiles.total_coins` (column does not exist on the new project) |
| Coin balance display | ⚠️ hardcoded | `app/teen/wallet/wallet-hub-client.tsx:34` `coins: 0` literal with TODO comment |
| Coin transactions ledger | ❌ empty | `coin_transactions` table exists but has 0 rows |
| Hybrid checkout | ❌ broken | `app/api/payments/hybrid/route.ts` references `parental_approvals` — table does not exist |
| Escrow ledger | ❌ does not exist | No table tracking actual DH held vs balance owed |
| Payment rail integration | ❌ none | No PSP wired to top-up; Stripe / CMI / Cash+ exist in code but not connected to top-up |

### 2.4 Spending modes (parent control)

Two modes the parent picks per-teen:
- **Autonomous mode**: teen can spend up to a pre-set ceiling per transaction / per day / per month without per-action approval. Beyond the ceiling → falls into validation mode.
- **Validation mode**: every coin spend requires parent's pre-validation. Notification sent (push/SMS/email TBD), parent approves/denies in app.

Today neither mode is implemented end-to-end. The closest is `app/api/payments/hybrid/route.ts` which mentions `parental_approvals` but the table is missing.

### 2.5 Crypto-free "stablecoin" — implementation paths

Per `docs/vision/payment-rails-morocco.md`:

The vision was *"a stablecoin if we could"*. Since crypto is banned in Morocco (Bank Al-Maghrib 2017 ban, draft framework 2024 still pending), coins must be a **prepaid e-money balance** with regulatory wrapping. Options ranked:

| Option | Description | Regulatory burden | Effort |
|---|---|---|---|
| **A — Pure escrow** | Nivy holds parent funds in its own bank account, internal balance tracking | Lowest — but limits scale, audit trail required | M |
| **B — Licensed e-money partner** ⭐ recommended | Partner with **Cash Plus / Wafacash / M2T** (BAM-licensed e-money issuers) — they hold balances under their license, Nivy just orchestrates | Medium — partnership cost but legally compliant | M-L |
| **C — Pure DB balance** (current minimal) | A column on `user_coins`, no escrow, no compliance | High legal risk if user balance > insignificant | S |
| **D — Multi-rail collection** | Use B for storage + Stripe (international cards) + CMI (local cards) + Mobile Money for top-up | Medium-high | L |

Recommended: **B + D** — licensed e-money partner for storage, multi-rail for collection.

---

## 3. Daily user experience (target vs reality)

### 3.1 Teen morning flow

**Target**:
```
6:30  — Avatar greets ("Salam Amine, ton quiz du jour est prêt!")
        Daily quiz (3-5 Q, 3 min, adapted to grade + interests)
        +50 XP earned, streak +1, milestone check

12:00 — Avatar suggests physical défi based on free time + previous activity
        Photo proof submitted, parent gets notification (autonomous mode skips this)
        Coach validates remotely (5 min) → +200 XP

18:00 — Crew battle ping: "Yasmine got 200 XP today, are you in?"
        Group quest engaged, XP pooled

21:00 — Wallet check: 5 200 coins (parent topped up + spent 800 last week, earned 80 XP cashback)
        Browse offers: -20% TechStore (800 coins) → reserve
        On reserve: parent gets push (validation mode) OR auto-approved (autonomous mode within ceiling)

Birthday week — Avatar plays a special animation, +500 XP gift, friends send wishes (each = +5 XP)
                Parent plans party at venue partner, books via /anniversaires/organiser
```

**Reality**: Quiz submission works. Everything else is mock or missing — see per-domain audits.

### 3.2 Parent flow

**Target**:
```
- Sign CGU once (e_signature)
- Top up child account (any rail: card / Cash Plus / bank transfer)
- Set spending mode + ceilings per teen
- Receive validation requests, approve/deny in 1 tap
- See spend history + XP history per teen
- Browse + book birthday parties at venue partners
- Track coach-awarded XP for transparency
- Refer other parents (ambassador track) — earn commissions on their teen's purchases
```

**Reality**: e-sig + top-up forms exist. Side-effects broken (table missing, column missing). Approval queue exists but reads from missing table. Validation/autonomous toggle does not exist. Ceilings are vision-only.

### 3.3 Partner flow

**Target**:
```
- Sign up via 4-type wizard, KYC submitted
- Admin approves (status: pending → in_review → active)
- Create offers (type-specific: % off for retail, ticket pricing for venue, course slots for education)
- Receive teen reservations / coin spends
- Scanner validates at PoS (QR + teen ID check)
- Education / club partners → certify XP awards (with cap, with evidence)
- Dashboard: today's redemptions / month commission / active offers
- Receive payout periodically (Nivy keeps commission %)
```

**Reality**: Signup wizard works. KYC scaffolded (`kyc_documents` table missing live). Scanner real impl exists but **mock** is wired. Sales table missing. No commission persistence. Coach/teacher XP-awarding does not exist.

### 3.4 Ambassador flow

**Target**:
```
- Apply via /devenir-ambassadeur, admin approves (role + commission tier)
- Get unique referral code + share link
- Filleul signs up via /join?ref=CODE → attributed
- On filleul's purchases → ambassador earns % (e.g. 5-15% based on tier)
- Dashboard shows commissions earned, pending withdrawal
- Cash-out: bank transfer or in-platform credit
- Possible XP-only branch: teen ambassadors earn XP per filleul (no cash)
```

**Reality**: UI shell built end-to-end (`/ambassador/*`, `/devenir-ambassadeur`, admin, withdrawals API) but **all DB tables missing** (`ambassadors`, `referral_usage`, `ambassador_withdrawals`). `role='ambassador'` not in profile enum so all ambassador routes redirect. Migration 019 has a parallel XP-only `referral_codes` / `referral_uses` track, but no `/join?ref=` capture route, no purchase-side attribution. **Two parallel systems, neither functional.**

---

## 4. Gamification mechanics — quest cadences

Per `docs/vision/quest-cadence.md` and `docs/vision/gamification.md`:

### 4.1 The 5 cadences

| Cadence | Refresh | Sample | Status |
|---|---|---|---|
| **Daily** | 24h | "Complete 1 quiz", "Walk 5000 steps" | Templates seeded, NOT auto-assigned |
| **Weekly** | Monday | "Complete 5 quizzes", "Win 1 crew battle" | Templates seeded, NOT auto-assigned |
| **Monthly** ⭐ founder-flagged | 1st of month | "Complete 20 quizzes", "Read 5 books", 300-600 XP | **6 monthly templates seeded** but unreachable — page only assigns daily+weekly |
| **Seasonal** | Quarterly | Ramadan défis, summer reading, school year | 13 templates seeded, no cron |
| **Event-driven** | One-shot | "Concert at Dar Soukkar — earn 500 XP" | Tables exist, no admin UI |
| **Partner-sponsored** | Variable | "TechStore monthly tournament" | Schema exists, no UI |

### 4.2 Three parallel quest surfaces (P0 to consolidate)

Architectural debt:
- `/teen/quests` — synthesizes pillar-quests at runtime via `lib/server/unified-quest-engine.ts`
- `/gamification/missions` — reads from `mission_templates` (the actual cadence DB)
- `/gamification/defis` — runs friend-duels via `friend_challenges`

A teen sees **three different "quest" pages with three different data shapes**. **Recommendation**: keep `/teen/quests` as the canonical hub but rewrite it to read from `mission_templates` (so monthly quests surface).

### 4.3 Catalog seed vs per-user state

**Seeded**:
- 30 mission_templates
- 6 monthly templates (300-600 XP)
- 63 achievements
- 13 seasonal_challenges
- 16 crew_achievements
- 10 challenge_types
- 12 wheel_segments
- 5 physical_challenges

**Per-user (all 0)**: user_missions, user_streaks, user_achievements, crews, friend_challenges, user_wheel_spins, user_seasonal_progress, user_event_challenge_progress.

The catalog exists. The **assignment engine** (cron / JIT) does not.

### 4.4 Group XP allocation

Per `docs/vision/gamification.md`: today crew XP = SUM-rollup of member XP (no redistribution). Decision needed: should winning a crew battle award bonus XP per member, or pool then split?

---

## 5. AI-driven personalization

Per `docs/vision/quiz-ai.md` and `docs/vision/ai-content.md`:

### 5.1 Pipeline scaffolding (mature but dormant)
- `lib/ai/` — OpenAI provider via `@ai-sdk` + Claude fetch path with **deprecated `claude-3-sonnet-20240229`**
- 3 validator layers: pedagogical, Moroccan-context, moderation
- Cron route `app/api/cron/generate-content/` exists, **no `vercel.json` schedule**
- 11 tables: `content_generation_logs`, `content_validations`, `intelligent_content_*`, `behavioral_profiles` — all empty live

### 5.2 Quiz personalization (weak today)
- `getDailyQuizForTeen(teenId)` selects via `dayIndex % pool.length` — **rotates the same pool for every teen, regardless of grade/profile**
- `educational_quizzes` has 9 seed quizzes
- Adaptive selection by `grade_level`, `subject`, `language`, past attempts → **unimplemented**
- Cron's teen-selection query references `grade_level`, `interests`, `school` columns which **do not exist on `teens`** today

### 5.3 Moroccan context
- Hardcoded Moroccan name list in validator
- **Darija explicitly forbidden in prompts** — founder must decide if Darija content is in scope

### 5.4 Avatar dialogue
The avatar coach (§7) should use AI to generate contextual messages ("Salam Amine, you've been on a 5-day streak!"). Today the avatar is just decorative panda imagery + an unrelated `/teen/chat` Kai chatbot.

---

## 6. Partner ecosystem (4 types + sub-roles)

Per `docs/vision/partner-network.md` and `docs/vision/teacher-coach-xp.md`:

### 6.1 The 4 types

| Type | What they sell | Special features | Status |
|---|---|---|---|
| **Retail** | % off shopping (TechStore, fashion, books) | None beyond standard offers | UI ready, scanner mocked |
| **Venue** | Event tickets, themed parties, lounges, restaurants | Birthday party hosting | UI ready, no `partner_venues` link |
| **Club** | Memberships (sport / fitness / dance) — coaches inside | **Coaches certify XP** | UI ready, coach role NOT modeled |
| **Education** | Course slots, tutoring, language schools — teachers inside | **Teachers certify XP** + grade integration | UI ready, teacher role NOT modeled |

### 6.2 Sub-roles: teacher and coach (P1 — entirely missing)

Per `docs/vision/teacher-coach-xp.md`:
- No `coaches` or `teachers` table.
- No "award XP to teen" mechanism for any partner.
- The only certified-XP path is parent-validated `teen_grades` (which a teacher could write into, but no UI exists).
- No anti-fraud: no cap, no evidence schema, no provenance FK in `xp_transactions`.

**Vision needs**:
- Sub-role: `partners.partner_type='education'` → can have N `teachers`. `partners.partner_type='club'` → can have N `coaches`.
- New table `partner_xp_awards`: who awarded, to whom, how much, evidence (photo / time / score), capped per period.
- UI on partner dashboard: select teen, enter XP amount, attach evidence, submit (queues for parent visibility).

### 6.3 Commission model (missing)

- No `partner_transactions` / `partner_sales` table on the live DB.
- No commission % calculation.
- No payout mechanism.
- The partner dashboard wires the **mock** scanner instead of the real one.

---

## 7. Avatar coach (almost-empty surface)

Per `docs/vision/avatar-coach.md`:

### 7.1 Vision
A persistent companion that:
- Greets by name (with mood: morning energetic, evening reflective)
- Suggests next défi based on profile + history + time
- Reacts to wins ("Yes! +50 XP!") and losses ("Pas grave, on retente?")
- Adapts tone to age (younger = playful, older = challenge-oriented)
- Optional voice (TTS slot for accessibility)
- Customizable look (skins unlocked via XP)

### 7.2 Reality
- Decorative **panda mascot** in `public/` (added in commit A6) — never used on `/teen/*`
- A `/teen/chat` chatbot named "Kai" — generic, no avatar art, no profile awareness, no mood
- Cosmetic-unlock schema (`user_unlocked_*`) — empty live
- No "avatar suggests next défi" code path anywhere

The avatar is **the most visible gap** between marketing pitch and product reality. **P0** for the experience.

---

## 8. Parent control surface (gates exist but tables missing)

Per `docs/vision/parent-control.md` and `docs/vision/parental-authorizations.md`:

### 8.1 E-signature (CGU)
- Form exists (`/parent/e-signature`)
- Gate exists (`app/api/parent/topup/route.ts:51-69`)
- BUT `e_signatures` table missing on live DB → gate fails open silently
- POST `/api/parent/e-signature/create` exists (we patched in this session)

### 8.2 Parental authorizations (per-action — distinct from e-sig)
- **Vision**: every booking / purchase / coach meeting / venue visit can require explicit parent authorization
- **Reality**: `parental_approvals` table missing (referenced by hybrid payments)
- No notification channel wired (push/SMS/email)
- No expiry model
- No co-parent / standing-order support

### 8.3 Spending modes
- **Autonomous mode**: pre-authorized within ceiling — NOT implemented
- **Validation mode**: per-transaction approval — NOT implemented

### 8.4 Subscription tiers
Tier naming **diverges** between docs and code:
- Docs: Free / Silver / Gold / Platinum (with -10% / -20% / -30% top-up discounts)
- Code: Free / Starter / Pro / Elite / Family
**Resolve before frontend**.

### 8.5 Compliance — CRITICAL
- **CIN scans land in a public Supabase storage bucket** → **CNDP / loi 09-08 violation**. Move to private + RLS-bound URLs immediately. Same for any teen photo/video proof from physical défis.

---

## 9. Birthdays — UI shell over empty DB

Per `docs/vision/birthday.md`:

### 9.1 What exists
- `~1500 LOC` UI under `/anniversaires`, `/anniversaires/organiser`, admin dashboard
- `features/anniversaires/` server actions
- Birthday party booking flow at venue partners

### 9.2 What's missing on live DB
- `anniv_packs` (party packages)
- `anniv_extras` (add-ons: cake, decoration, etc.)
- `anniv_orders`
- `anniv_order_extras`
- `partner_venues` (linkage to venue partners offering parties)

### 9.3 Birthday-XP automation
- **Not implemented**: no cron triggers a "+500 XP" gift on birthday
- No friend-wish UX
- Admin page has a `birth_date` vs `date_of_birth` column-name bug

### 9.4 Friend wishes (vision)
- Friends in your crew/circles see your upcoming birthday → can send a wish (with optional XP gift, e.g. +5 XP each)
- This is a referral-light loop: birthday-day spike of platform engagement

---

## 10. Ambassador / referral system

Per `docs/vision/ambassador-referral.md`:

### 10.1 What exists (UI-only)
- `/ambassador/*` dashboard
- `/devenir-ambassadeur` signup
- Admin pages
- Withdrawal API (`app/api/ambassador/withdraw/`)

### 10.2 What's missing
- `ambassadors` table (cash track)
- `referral_usage`, `ambassador_withdrawals`, `ambassador_redemptions` (cash track)
- `role='ambassador'` not in `profiles.role` enum → routes redirect every visitor
- A `/join?ref=CODE` capture route
- Purchase-side attribution hook (when a teen buys, find their ambassador and credit commission)

### 10.3 Two parallel systems (overlapping)
Migration 019 introduced an **XP-only referral track**: `referral_codes`, `referral_uses`, RPCs `get_or_create_referral_code` / `use_referral_code` / `complete_referral`. Migrated but zero rows. No UI surfaces it.

The vision implies **two ambassador modes**:
- **Adult ambassadors** (parents, content creators, schools, influencers) → cash commission
- **Teen ambassadors** (peer-to-peer) → XP-only commission

These need different policies but can share schema.

---

## 11. Data model spine

Per `docs/vision/data-model.md`:

### 11.1 Numbers
- **214 tables**, 5 views in `public`
- **34 tables RLS-enabled with ZERO policies** → silently broken access
- **0 triggers** on `auth.users` (we patched manually)
- **45+ tables referenced in code but missing from DB** (e_signatures, parental_approvals, ambassadors, anniv_*, vip_cards, partner_transactions, etc.)

### 11.2 Identity sprawl (P0)
Four parallel "user" tables:
- `auth.users` — Supabase Auth
- `public.users` — mirror
- `public.profiles` — role + name
- `public.teens` — teen-specific

FKs drift across them. **Decision needed**: pick `teens.id == auth.users.id` (recommended) and align.

### 11.3 Schema gaps by pillar

| Pillar | Tables expected | Present | Gap |
|---|---|---|---|
| Token economy | user_xp, user_coins, coin_transactions, payment_transactions, escrow_ledger, xp_payment_settings | 4/6 | escrow + payments |
| Quest cadences | mission_templates, user_missions, monthly_*, seasonal_*, event_* | OK schema, empty | Assignment engine |
| Quiz/AI | educational_quizzes, quiz_attempts, content_validations, generation_logs, behavioral_profiles | 5/5 | Empty |
| Partners | partners, partner_discounts, partner_transactions, vip_cards, kyc_documents, partner_xp_awards | 2/6 | 4 missing |
| Coaches/teachers | coaches, teachers, partner_xp_awards, xp_evidence | 0/4 | All missing |
| Parent control | parent_teen_links, e_signatures, parental_approvals, teen_budget_limits, family_subscriptions | 2/5 | 3 missing |
| Avatar | avatars, user_avatar_state, avatar_skins | 0/3 | All missing |
| Birthday | anniv_packs, anniv_extras, anniv_orders, partner_venues, friend_wishes | 0/5 | All missing |
| Ambassadors | ambassadors, referral_usage, ambassador_withdrawals, referral_attribution | 0/4 | All missing |

### 11.4 Recommended consolidation pass
1. Resolve `users / profiles / teens / auth.users` quadruple — **`teens.id = auth.users.id` canonical**.
2. Add the ~25 missing core tables.
3. Patch RLS policies on the 34 silently-broken tables.
4. Drop dead schemas (token rewards 028).
5. Add proper auth.users trigger that auto-creates profile on signup.

---

## 12. Compliance and risks

| Risk | Severity | Source |
|---|---|---|
| **CIN scans in public storage** | 🔴 P0 (CNDP, loi 09-08) | parent-control |
| **Coin balance not backed by escrow accounting** | 🔴 P0 (BAM e-money) | payment-rails-morocco |
| **Mystery boxes = gambling regulation in Morocco** | 🟠 P1 | rewards-economy |
| **Parental e-signature gate fails open (table missing)** | 🔴 P0 | parent-control |
| **Deprecated Claude model in production prompts** | 🟠 P1 | ai-content |
| **34 RLS-no-policy tables** | 🟠 P1 | data-model |
| **Teen photo/video proof storage policy unknown** | 🟠 P1 | physical-challenges |
| **No FX/audit trail on coin transactions** | 🟠 P1 | economy |
| **Ambassador commissions unattributed** | 🟠 P1 | ambassador-referral |
| **Partner KYC documents path unknown** | 🟠 P1 | partner-network |
| **Crypto regulatory ambiguity if "stablecoin" framing used externally** | 🟢 P2 | payment-rails-morocco |
| **Coach-awarded XP fraud potential** | 🟢 P2 | teacher-coach-xp |

---

## 13. Roadmap to ship — P0 / P1 / P2

### P0 — Cannot ship without (legal, identity, money)
1. **Identity unification** — `teens.id = auth.users.id`, FK alignment, auth trigger
2. **Coin pipeline e2e** — top-up writes to `user_coins`, spending debits it, `coin_transactions` ledger populated
3. **Resolve XP↔DH 10× drift** — pick canonical rate (or remove the conversion if XP doesn't sell coins anyway)
4. **Create missing core tables** — `parental_approvals`, `e_signatures` (proper), `teen_budget_limits`, `partner_transactions`, `payment_transactions`, `escrow_ledger`, `ambassadors`, `referral_attribution`
5. **CIN storage privacy** — move to private bucket + RLS-bound URLs
6. **Wire e-signature gate properly** — table + RLS + check in topup + check in hybrid checkout
7. **34 RLS policies** — apply the patch SQL in `docs/E2E_SETUP.md`
8. **Pick + implement payment rail** — Option B (Cash Plus / Wafacash / M2T) + minimal Stripe for cards
9. **Spend-earns-XP loyalty loop** — when coins are debited, credit XP back at configurable %

### P1 — Required for product coherence
10. **Avatar coach v1** — name (Niv? Kai? Panda?), profile-aware greeting on `/teen` dashboard, AI suggestion of next défi
11. **AI content cron + adaptive quiz selection** — cron schedule, fix teen-selection query, filter quizzes by grade/language/history
12. **Three quest surfaces → one canonical** — recommend `/teen/quests` powered by mission_templates (with monthly quests surfaced)
13. **Quest assignment engine** — daily/weekly/monthly/seasonal cron-based assignment to user_missions
14. **Partner real scanner** swapped in dashboard
15. **Commission persistence + payout** — `partner_transactions`, periodic settlement
16. **Teacher/coach XP-awarding feature** — sub-role model, `partner_xp_awards` table, partner UI to award, anti-fraud caps, parent visibility
17. **Ambassador system real** — schema, `/join?ref=CODE`, purchase attribution, withdrawals
18. **Birthday automation** — cron triggers XP gift on birthday, friend-wish UX, party booking flow with venue partners
19. **Parental authorization UX** — per-action approval queue, push/SMS/email channel, expiry model
20. **Spending modes** — autonomous (with ceilings) vs validation toggle in parent UI
21. **Mystery box reveal flow + legal review**
22. **Tier alignment** — pick Free/Silver/Gold/Platinum vs Free/Starter/Pro/Elite/Family
23. **Subscription tier discounts** — % off top-up applied at PSP layer

### P2 — Polish and depth
24. **Crew battle XP redistribution rule**
25. **Avatar customization unlocks** wired to `user_unlocked_*`
26. **Multilingual content** (Darija decision)
27. **Education partner ↔ teen_grades integration**
28. **Birthday-friend-wishes XP gift loop**
29. **Coach earning model** (Nivy pays coaches per certified XP? Subscription?)
30. **Refund policies** (partner cancellation, age-18 transition)
31. **Cross-cadence quest stacking** (1 action satisfies daily + weekly + monthly)
32. **Per-partner cashback rate** customization
33. **Ambassador tier system** (more invites → higher commission %)

---

## 14. Frontend redesign brief (DEFERRED)

The frontend redesign cannot be approached responsibly until the **founder decisions in §15 are made**. The data model is in too much flux: any UI written today against the current schema will need to rewrite when identity is unified, coin pipeline is fixed, and the missing 25 tables are added.

**When ready**, the `frontend-gap-mapper` agent will produce `docs/vision/FRONTEND_REDO.md` with a page-by-page matrix once these prerequisites are met:
- Identity model decided + applied
- Coin pipeline e2e working (even on test data)
- Spending-mode toggle implemented or stubbed
- Avatar coach naming + persona decided
- Tier naming aligned

A strawman of frontend changes anticipated:

| Page | Current | Future |
|---|---|---|
| `/teen` (dashboard) | Generic feed | **Avatar coach hero** (greeting + today's défi) + XP/coins twin gauge + monthly quest progress + birthday banner if applicable |
| `/teen/wallet?tab=shop` | Basic reward grid | Filter by partner type + cashback indicator on each offer + spent-this-month counter |
| `/teen/quests` | Pillar synthesis | **Unified hub** with daily / weekly / monthly / seasonal tabs reading from `mission_templates` |
| `/teen/quiz` | Static categories | Daily quiz hero (avatar voiceover slot) + adaptive recommendations |
| `/parent` | Generic | **Spending dashboard** + approval queue + linked teens grid + tier badge + ambassador track if applicable |
| `/parent/topup` | Static packs | Per-teen coin balance + recommended pack from usage + tier discount visualizer + payment rail picker |
| `/parent/approvals` | Empty | Real queue with push/SMS handoff |
| `/partner` | Generic | KPI hero (today's redemptions, month commission) + offers manager + scanner + (if club/education) award-XP button |
| `/anniversaires` | Empty shell | Birthday hub: upcoming friend birthdays + plan-a-party flow + venue partner picker |
| `/ambassador` | Redirect today | Real dashboard: filleuls list, commissions, share link, withdrawal |

---

## 15. Founder decisions to unblock the next sprint

(Prioritized — answer these in order, top is most blocking.)

### Money & identity (P0)
1. **Identity table canonical**: `teens.id == auth.users.id` (recommended)? Yes / No / Other.
2. **Payment rail**: Cash Plus + CMI? Cash Plus + Stripe? Wafacash + CMI? M2T?
3. **Escrow model**: Nivy-licensed e-money? Partner-licensed (B)? Pure DB balance for MVP?
4. **Spend-earns-XP cashback rate**: flat (e.g. 10% global)? Per-partner? Per-offer?
5. **Resolve XP↔DH 10× drift** (or kill the conversion entirely since XP doesn't swap to coins).

### Compliance (P0)
6. **CIN storage**: confirm move to private bucket — sign-off?
7. **Mystery boxes legality stance** — keep / remove / restrict to non-RNG variant?
8. **Multilingual / Darija** in content — yes / no / partial?

### Vision concepts (P1)
9. **Avatar coach**: name (Niv / Kai / Panda / other), single shared mascot or per-teen?
10. **LLM provider**: Claude / OpenAI / both with fallback?
11. **Quest cadences**: confirm 5 (daily/weekly/monthly/seasonal/event) — anything to drop?
12. **Crew XP**: pool-then-split or member-bonus on win?
13. **Spending modes default**: autonomous-with-ceiling or validation-each by default?
14. **Notification channel** for parent approvals: push / SMS / email / WhatsApp / in-app only?

### Partners & growth (P1)
15. **Partner commission model**: subscription / per-sale / hybrid? Standard rate?
16. **Coach earning**: Nivy pays per certified XP / subscription / nothing?
17. **Teacher XP-awarding**: capped per teen per week — what's the cap?
18. **Ambassador commission**: flat or tiered? %?
19. **Filleul attribution window**: 30 days / lifetime / first-purchase-only?
20. **Cash-out method** for ambassador commissions: bank transfer / in-platform credit?

### Tier & branding (P1)
21. **Subscription tier names**: confirm Free / Silver / Gold / Platinum (and align code)?
22. **Tier top-up discounts**: 0% / -10% / -20% / -30% — confirm?

### Edge cases (P2)
23. **1 parent ↔ N teens** vs **N parents ↔ N teens** (divorced families)?
24. **Age-18 transition**: convert teen account to standalone or close?
25. **Refund policy**: partner cancellation, ambassador clawback, parent withdrawal of escrow.

---

## Index of detailed audits

| Domain | File | Size |
|---|---|---|
| Token economy | [economy.md](./economy.md) | 19 KB |
| Rewards | [rewards-economy.md](./rewards-economy.md) | 11 KB |
| Payment rails (Morocco) | [payment-rails-morocco.md](./payment-rails-morocco.md) | 21 KB |
| Gamification engine | [gamification.md](./gamification.md) | 14 KB |
| Quest cadences | [quest-cadence.md](./quest-cadence.md) | 11 KB |
| Quiz + AI | [quiz-ai.md](./quiz-ai.md) | 12 KB |
| Physical challenges | [physical-challenges.md](./physical-challenges.md) | 11 KB |
| Avatar coach | [avatar-coach.md](./avatar-coach.md) | 8 KB |
| AI content pipelines | [ai-content.md](./ai-content.md) | 12 KB |
| Partner network | [partner-network.md](./partner-network.md) | 9 KB |
| Teacher / coach XP | [teacher-coach-xp.md](./teacher-coach-xp.md) | 11 KB |
| Parent control | [parent-control.md](./parent-control.md) | 9 KB |
| Parental authorizations | [parental-authorizations.md](./parental-authorizations.md) | 11 KB |
| Birthday | [birthday.md](./birthday.md) | 12 KB |
| Ambassador / referral | [ambassador-referral.md](./ambassador-referral.md) | 13 KB |
| Data model | [data-model.md](./data-model.md) | 19 KB |

**Total**: 16 audits, ~205 KB of evidence. All cross-referenced from the sections above.

---

> **Next step**: answer the 25 founder decisions in §15. With those answers, we can map them onto the P0/P1/P2 backlog (§13) and either (a) start building the missing schema + features OR (b) launch the `frontend-gap-mapper` agent to produce the page-by-page redesign matrix.
