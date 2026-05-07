# NIVY — Product Whitepaper v3 (Agent Handbook)

> **Date**: 2026-05-07
> **Audience**: implementation agents, frontend redesigners, backend builders, QA, founder.
> **Sources**: 22 specialist audits in `docs/vision/`, live Supabase project `imchornjvmgmaovhypco`, full code review.
> **Convention**: where founder has not decided, this doc states a **🟡 RECOMMENDED DEFAULT** that agents should follow unless explicitly overridden. Where founder has decided, the decision is **🟢 LOCKED**. Hard requirements are **🔴 INVARIANT**.

---

# Part I — Vision

## 1. Executive summary

**Nivy** is a Moroccan-built lifestyle and gamification platform for **teens 13-17** and their **parents**. It binds a triangle of audiences:

- **Teens** earn **XP** through effort (quizzes, défis, group play, teacher/coach awards, birthdays, **and spending coins**) — XP is a pure reward currency that unlocks rewards, status, events.
- **Parents** fund a teen's account in DH, becoming a **prepaid coin balance** held in escrow. They control with two modes: autonomous-with-ceilings or per-transaction validation. Their tier (Free / Silver / Gold / Platinum) drives top-up discounts.
- **Partners** (4 types: retail, venue, club, education) sell offers, host events, and — for club/education sub-roles — certify XP grants. Ambassadors refer new families and earn commissions.

**The two currencies do NOT convert.** XP is not redeemable for coins or DH. Coins are not transferable to another account. The bridge is a **loyalty loop**: each coin spent on a partner offer earns XP back at a configurable cashback rate. **Crypto is illegal in Morocco** — coins are a DB-tracked balance backed by DH escrowed at Nivy or a BAM-licensed e-money partner (Cash Plus / Wafacash / M2T).

**Build state**: code is 60-70 % scaffolded. The active Supabase project (`imchornjvmgmaovhypco`) lacks ~50 critical tables. The two-currency pipeline is broken end-to-end (top-up writes to a non-existent column, hybrid checkout fails on missing `parental_approvals`). Major features (avatar coach, teacher-XP, ambassadors, birthday automation, notifications fan-out) are UI-only shells. **This whitepaper is the canonical spec to fix all of it.**

## 2. Product in one diagram (text)

```
┌──────────── PARENT ─────────────┐                ┌──────── PARTNER (4 types) ──────┐
│ - Sign CGU (e_signature)         │                │ - Retail / Venue / Club / Edu     │
│ - Top-up DH → coins (escrow)     │   approves    │ - Sub-roles: coach, teacher       │
│ - Set spending mode + ceilings   │ ◀──────────── │ - Sells offers + hosts events     │
│ - Approve/deny per transaction   │                │ - Awards XP (club / education)   │
│ - View spend & XP history        │                │ - Earns commission per redemption │
│ - Subscription tier (-% top-up)  │                └──────────────┬──────────────────┘
└──────────────┬──────────────────┘                              redeems
               │ funds                                              ▼
               ▼                                  ┌─────────── COINS ────────────┐
   ┌────────── TEEN ──────────┐                  │ Prepaid balance, escrow       │
   │ Avatar coach greets       │ ◀──── awards ─── │ Spent on partner offers/event │
   │ Daily quiz (adaptive)     │      XP         └──────────────┬──────────────┘
   │ Physical défis            │                              spend earns
   │ Crew/circle/friend battles│                              ↓ (cashback)
   │ Birthday gifts            │                  ┌─────────── XP ──────────────┐
   │ Monthly + seasonal quests │ ◀────────────── │ Effort + spending cashback    │
   │ Aide scolaire (grades)    │      earns      │ Unlocks rewards/events/status │
   └──────────────┬───────────┘                  │ NEVER converts to coins       │
                  │ refers                       └──────────────────────────────┘
                  ▼
          ┌── AMBASSADOR ───┐
          │ Code, link, QR  │  cash commission / XP-only (teen track)
          │ Filleul attrib. │
          └─────────────────┘
```

---

# Part II — Reality (current state)

## 3. Build state matrix

| Pillar | Code | DB schema | DB data | UI wired | Notes |
|---|---|---|---|---|---|
| Token economy | 70% | 60% | 0% | 30% | Top-up writes to missing column |
| Quest cadences | 80% | 90% | 30% | 50% | Monthly quests unreachable |
| Quiz+AI | 80% | 100% | 10% | 60% | Pipeline dormant |
| Physical défis | 60% | 70% | 10% | 40% | Honor-system only |
| Avatar coach | 10% | 0% | 0% | 5% | Almost absent |
| Partner network | 70% | 50% | 1 row | 50% | Mock scanner wired |
| Coach/teacher XP | 0% | 10% | 0% | 0% | Entirely missing |
| Parent control | 80% | 50% | partial | 60% | Tables missing |
| Parental authorizations | 30% | 20% | 0% | 20% | Per-action gate stub |
| Ambassador | 80% UI | 0% | 0% | 0% | Routes redirect |
| Birthday | 70% UI | 0% | 0% | 30% | UI shell, empty DB |
| Events | 80% UI | 60% schema-drift | 4 events | 70% | Schema mismatch |
| Academic | 70% | 70% | 0 grades | 60% | Wired post-W2 |
| Notifications | 30% | 80% | minimal | 40% | Email only working |
| Social graph | 60% | 100% | 0% | 30% | Over-built, under-wired |
| Admin/moderation | 60% UI | 30% | 0% | 50% | Mock queues |
| Onboarding | 70% | 60% | partial | 70% | Per-role gaps |

**Per-domain detail**: see corresponding `docs/vision/<domain>.md` (16 files).

## 4. Top 30 gaps (rolled up from 22 audits)

🔴 = launch blocker, 🟠 = vision-coherence breaker, 🟢 = polish

### 🔴 Money & identity
1. Identity sprawl: `auth.users` / `users` / `profiles` / `teens` quadruple → unify on `teens.id == auth.users.id` (P0, see §20)
2. `coin_transactions` empty + top-up writes to `profiles.total_coins` (column doesn't exist)
3. XP↔DH ratio diverges 10× between code (`0.10 DH/XP`) and DB seed (`100 XP/DH`)
4. `payment_transactions`, `escrow_ledger`, `parental_approvals` tables MISSING on live DB
5. No PSP wired to top-up (Stripe/CMI/Cash+ exist in checkout, not in top-up)
6. Spend-earns-XP cashback loop NOT implemented anywhere

### 🔴 Compliance
7. CIN scans land in **public** Supabase storage bucket — CNDP / loi 09-08 violation
8. E-signature gate fails open on missing table
9. 34 RLS-enabled tables with **zero policies** → silent access denial or RLS-skip-via-service-role
10. No audit log on admin actions or coin movements

### 🔴 Engine
11. `auth.users` has 0 trigger → no auto-profile creation (we patched manually)
12. The `wheel_streaks` trigger references the table without `public.` schema, breaks user creation
13. Quest assignment engine (cron / JIT) doesn't exist — monthly templates exist but unreachable
14. AI cron has no `vercel.json` schedule + queries non-existent columns

### 🟠 Content + adaptation
15. Quiz daily selection is `pool[dayIndex % length]` — same for everyone, NOT adapted to teen
16. Educational quizzes lacks `school_type`, `curriculum` columns → can't adapt to school
17. Darija explicitly forbidden in prompts; multilingual scope undecided
18. Deprecated `claude-3-sonnet-20240229` model in code

### 🟠 Features missing implementation
19. Avatar coach: just panda art + unrelated chatbot — no greeting, no contextual défi, no profile awareness
20. Teacher/coach XP-awarding: 0% built (no table, no API, no UI)
21. Ambassador system: full UI on missing tables, route redirects (role enum gap)
22. Birthday automation: 0 cron, friend wishes UX absent
23. Push web notifications: code references `/sw.js` and `/manifest.json` that don't exist
24. SMS / FCM / APNS / WhatsApp: not wired
25. Multi-parent fan-out for approvals: not implemented
26. Three parallel quest surfaces (`/teen/quests`, `/gamification/missions`, `/gamification/defis`) — pick one
27. Mock partner scanner wired in dashboard instead of real one
28. `bookings` ↔ `events` schema drift between rich UI and 9-column live stub

### 🟢 Polish
29. Tier naming diverges (Free/Silver/Gold/Platinum vs Free/Starter/Pro/Elite/Family)
30. Mystery box reveal flow undecided (gambling regulation question)

---

# Part III — Specifications (what to build)

Each spec follows the same structure :
- **Outcome** (vision goal in plain words)
- **Data contract** (tables, columns, RLS)
- **API contract** (endpoints / RPCs)
- **UI contract** (pages, components)
- **Invariants** (rules that must always hold)
- **Acceptance criteria** (what "done" looks like)

## 5. Token Economy spec

**Outcome**: a teen can be funded by a parent in DH, see their coin balance update, spend coins on partner offers, earn XP cashback, and never confuse the two currencies.

**Data contract**:
```sql
-- Existing (✅ schema present)
public.user_xp (id, teen_id, total_xp, current_level, xp_to_next_level, ...)
public.user_coins (id, teen_id, balance, created_at, updated_at)
public.coin_transactions (id, user_id, source_user_id, amount, transaction_type, related_*)

-- Missing (❌ to create)
public.escrow_ledger (
  id UUID PK,
  parent_id UUID NOT NULL REFERENCES auth.users(id),
  teen_id UUID NOT NULL REFERENCES public.teens(id),
  direction TEXT CHECK (direction IN ('top_up','refund','spend','adjustment')),
  amount_dh NUMERIC(10,2) NOT NULL,
  amount_coins INTEGER NOT NULL,
  related_transaction_id UUID,
  psp_provider TEXT, -- 'stripe' | 'cmi' | 'cashplus' | 'wafacash' | 'm2t'
  psp_reference TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

public.payment_transactions (
  id UUID PK, parent_id UUID, amount_dh NUMERIC, amount_coins INTEGER,
  status TEXT CHECK (status IN ('pending','succeeded','failed','refunded')),
  psp_provider TEXT, psp_reference TEXT, ...
);

public.xp_payment_settings (singleton row)
  xp_to_dh_rate NUMERIC, -- 🟢 LOCKED to 100 XP per DH (resolves 10× drift)
  cashback_pct NUMERIC, -- 🟡 RECOMMENDED DEFAULT 10%
  ...
```

**API contract**:
- `POST /api/parent/topup` — body `{ teenId, packageId, paymentMethod }` → creates `payment_transactions` row, kicks PSP, on webhook `succeeded` → inserts `escrow_ledger(direction=top_up)` + UPSERTs `user_coins.balance` + inserts `coin_transactions(transaction_type=topup)`
- `POST /api/teen/spend` — body `{ rewardId | offerId, amountCoins }` → check ceiling + mode → if validation needed, queue `parental_approvals`; if autonomous OR approved → debit `user_coins.balance`, insert `coin_transactions(transaction_type=spend)`, **call `add_xp_to_user(teenId, floor(amountCoins * cashback_pct))` for the cashback**, insert `escrow_ledger(direction=spend)`.
- RPC `add_xp_to_user(teen_id, amount)` exists, **add provenance argument** `(teen_id, amount, source_type, source_id)`.

**UI contract**:
- `/teen/wallet` — XP gauge + coins gauge + last 5 spends + cashback earned this month
- `/parent/topup` — package picker + tier discount visualizer + payment method picker + post-topup confirmation showing teen's new balance
- `/parent/history` — table joining `coin_transactions` + `escrow_ledger`

**🔴 Invariants**:
- XP **never** decrements except via explicit RPC `revoke_xp` (admin only).
- Coins **never** convert to XP or DH. Only spend or top-up paths exist.
- Every coin spend that succeeds **MUST** trigger XP cashback in the same DB transaction.
- Every top-up **MUST** create a paired `payment_transactions` + `escrow_ledger` row.
- The XP↔DH rate is **100 XP per 1 DH** (🟢 LOCKED — both code and DB align).

**Acceptance criteria**:
- ☐ Parent.test tops up 50 DH → teen.amine sees `+5000 coins` in `/teen/wallet` within 5s
- ☐ Teen.amine spends 100 coins on a reward → balance decrements, XP increments by 10 (cashback), `coin_transactions` and `escrow_ledger` both have a row
- ☐ Failed PSP webhook → no balance change, `payment_transactions.status='failed'`
- ☐ Refund issued by admin → reversed escrow_ledger row, balance reverts

## 6. Quest cadences spec

**Outcome**: teens see a **single** quest hub with daily / weekly / monthly / seasonal / event tabs. Quests are auto-assigned by cron and surface in the avatar's daily greeting.

**Data contract**:
- `mission_templates` — already populated, has `cadence` column with values daily / weekly / monthly / seasonal
- `user_missions(teen_id, template_id, started_at, completed_at, expires_at, progress)` — exists, empty
- `seasonal_challenges`, `event_challenges`, `partner_sponsored_challenges` (new) — exist or to add

**API contract**:
- Cron `app/api/cron/assign-missions` → for each active teen, ensure they have N daily / N weekly / N monthly / N seasonal active. Idempotent (skip if already assigned).
- `GET /api/teen/quests` → returns `{ daily: [...], weekly: [...], monthly: [...], seasonal: [...] }`
- `POST /api/teen/quests/:id/progress` → increments `user_missions.progress`, fires achievement + XP on completion.

**UI contract**:
- `/teen/quests` becomes the **canonical** hub. Tabs by cadence. Each card: title, progress bar, XP reward, expiry.
- `/gamification/missions` and `/gamification/defis` → redirect to `/teen/quests?tab=...`

**🔴 Invariants**:
- A user_missions row that has `expires_at < now()` and `completed_at IS NULL` is automatically marked expired.
- Monthly quests refresh on the 1st at midnight Africa/Casablanca.
- Cross-cadence stacking is allowed (one action satisfies daily + weekly + monthly).

**Acceptance criteria**:
- ☐ Cron runs at 00:05 daily → teen.amine has 3 daily, 3 weekly (if Monday), 3 monthly (if 1st), 1 seasonal active.
- ☐ Completing 1 quiz fires daily "Complete 1 quiz" + weekly "Complete 5 quizzes" progress + monthly "Complete 20 quizzes" progress simultaneously.
- ☐ The 6 monthly seeded templates appear in the UI on the 1st.

## 7. Quiz + AI spec

**Outcome**: teens see a daily quiz **adapted to their grade, school type, language preference, and past performance**. AI generates fresh quizzes nightly. Validators ensure pedagogical correctness, Moroccan context, and moderation.

**Data contract**:
- `educational_quizzes` — **add columns** `school_type` (public/private/international), `curriculum` (moroccan/french/british/IB), `language` (fr/ar/en/darija)
- `quiz_attempts` (existing, empty)
- `behavioral_profiles(teen_id, dimension, score, updated_at)` — exists, empty; populate from `quiz_attempts` history
- `content_generations(id, type, prompt, response, validation_status, created_by, created_at)` — exists
- `content_validations(generation_id, validator_type, passed, reason)` — exists

**API contract**:
- `GET /api/teen/quiz/daily` → `getDailyQuizForTeen(teenId)` filters: `is_active=true AND grade_level=teen.grade_level AND language IN teen.preferred_languages AND id NOT IN (recent attempts last 7 days)` → if pool < 1, fall back to broader filter.
- `POST /api/teen/quiz/submit` (existing, works)
- `app/api/cron/generate-content` → for each grade × subject × language, generate 5 candidate quizzes nightly, validate, insert into `educational_quizzes` if all validators pass.

**UI contract**:
- `/teen/quiz` — daily quiz hero (with avatar voiceover slot) + recommended for you (3 cards) + history
- `/teen/quiz/[id]` (runner)
- `/teen/quiz/history`

**🔴 Invariants**:
- Quiz selection never returns a quiz the teen passed in the last 7 days.
- `is_active=false` quizzes never surface.
- Generation pipeline blocks publish if any validator fails.

**Acceptance criteria**:
- ☐ 6ème teen sees only `grade_level='6eme'` quizzes
- ☐ Cron generates ≥ 5 new quizzes/night that pass validation
- ☐ Daily quiz changes from one day to the next for the same teen
- ☐ Behavioral profile updates after each attempt

## 8. Avatar coach spec

**Outcome**: a persistent companion across `/teen/*` that greets by name, suggests next défi, reacts to wins/losses, evolves visually with XP.

**Decisions**:
- 🟡 RECOMMENDED DEFAULT name: **Niv** (single shared mascot, panda persona, customizable color/skin)
- 🟡 RECOMMENDED DEFAULT mood model: 5 states (energetic / calm / curious / proud / encouraging) tied to time-of-day + recent activity

**Data contract**:
- `avatars(teen_id PK, name, color, skin, last_message_at)` — to create
- `avatar_messages(id, teen_id, message_text, mood, displayed_at, dismissed_at)` — to create (for analytics)
- `user_unlocked_skins`, `user_unlocked_frames`, `user_unlocked_titles` — exist, empty; populate via XP milestones

**API contract**:
- `GET /api/teen/avatar/state` → returns `{ name, mood, current_message, suggested_quest_id }`
- `POST /api/teen/avatar/dismiss` → marks message dismissed
- `POST /api/teen/avatar/customize` → updates skin/color (gated by unlocked items)
- Internal: `lib/avatar/coach.ts` — picks mood from time + activity + level, picks message template (or LLM-generated for premium), picks `suggested_quest_id` from `user_missions` not yet started.

**UI contract**:
- `<AvatarCoach>` component — sticky bottom-right on `/teen/*`. States: idle / talking / celebrating / thinking. Click → expands to show full message + CTA.
- `/teen` dashboard hero — `<AvatarHero>` larger version with daily greeting.

**🔴 Invariants**:
- Messages never reference data from other teens.
- LLM-generated messages always run through the moderation validator.
- Avatar customization unlocks gate by `user_unlocked_*` rows.
- Suggested quest comes from `recommend_for_teen(teen_id, 'mission', 1)` — see §19.5 Personalization Engine, NOT from `pool[dayIndex % length]`.

**Acceptance criteria**:
- ☐ Teen.amine sees `<AvatarCoach>` on `/teen` saying "Salam Amine, prêt pour ton quiz du jour ?"
- ☐ At 18:00 the mood shifts to "calm" (or whatever rule)
- ☐ After winning a quiz, mood becomes "proud" with a celebratory message
- ☐ Suggested mission tag overlaps with teen's top-3 interests (per §19.5)

## 9. Partner network spec (with sub-roles)

**Outcome**: 4 partner types with distinct features. Coaches and teachers as sub-roles can certify XP grants. Commission model + payout.

**Data contract**:
```sql
public.partners (id, email UNIQUE, company_name, partner_type CHECK IN ('retail','venue','club','education'), status, commission_rate, payout_method, ...)

public.partner_staff (
  id UUID PK, partner_id UUID NOT NULL REFERENCES partners(id),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  role TEXT CHECK (role IN ('owner','staff','coach','teacher')),
  is_active BOOLEAN DEFAULT true
);

public.partner_xp_awards (
  id UUID PK, awarded_by UUID, teen_id UUID, partner_id UUID,
  amount INTEGER, reason TEXT, evidence_url TEXT,
  approved_by_parent BOOLEAN, approved_at TIMESTAMPTZ, created_at TIMESTAMPTZ
);

public.partner_transactions (
  id UUID PK, partner_id UUID, teen_id UUID, offer_id UUID,
  amount_dh NUMERIC, amount_coins INT, commission_dh NUMERIC,
  scanner_user_id UUID, scanned_at TIMESTAMPTZ, ...
);

public.kyc_documents (
  id UUID PK, partner_id UUID, doc_type, file_path, status, reviewed_by, reviewed_at
);
-- file_path goes to PRIVATE bucket
```

**API contract**:
- `POST /api/partner/awards/grant` (staff with role='coach' or 'teacher' only) → creates `partner_xp_awards` row → notifies parent → on parent approval (or auto if cap-respected) → calls `add_xp_to_user`.
- `POST /api/partner/scanner/validate` → validates QR ticket, debits `partner_transactions`, computes commission, returns success.
- Cron `app/api/cron/partner-payouts` → monthly, aggregates `partner_transactions`, creates payout records.

**UI contract**:
- `/partner` — KPI hero + redemptions feed + commission widget + offers manager + scanner button
- `/partner/scanner` — real QR scanner (replace mock)
- `/partner/awards` (only for club/education) — search teen, enter XP amount, attach evidence, submit
- `/admin/partners` — KYC queue, approval, commission rate adjustment

**🔴 Invariants**:
- KYC documents always private bucket + RLS-bound URLs
- A partner without `status='active'` cannot create offers or award XP
- Coach/teacher XP awards capped (🟡 DEFAULT 500 XP / teen / week / awarder)
- Commission % is per-partner-type default but can be overridden per partner (🟡 DEFAULTS retail 8%, venue 10%, club 12%, education 15%)

**Acceptance criteria**:
- ☐ A pending partner sees the awaiting-approval banner (already passing in Playwright)
- ☐ An active club partner can award XP to a teen
- ☐ A teen sees the awarded XP in `/teen/wallet` with the partner name as provenance
- ☐ Parent sees the same award in `/parent/history` with approval option (if cap exceeded)

## 10. Parent control spec

**Outcome**: parent has a single dashboard to fund, control, approve, and visualize teen activity.

**Data contract**:
```sql
-- Existing
public.parent_teen_links (parent_id, teen_id, status, created_at)
public.family_subscriptions (parent_id, tier CHECK IN ('free','silver','gold','platinum'), status)

-- Missing — to create
public.e_signatures (id, parent_id, terms_accepted, signed_at, ip_address, cin_url, ...) -- cin_url to PRIVATE bucket
public.parental_approvals (id, parent_id, teen_id, action_type, resource_id, amount, status, requested_at, decided_at, expiry_at)
public.teen_budget_limits (id, parent_id, teen_id, max_per_transaction, max_per_day, max_per_month, mode CHECK IN ('autonomous','validation'))
public.linking_codes (code, parent_id, expires_at, used_at)
```

**API contract**:
- `POST /api/parent/e-signature/create` (exists, works)
- `POST /api/parent/topup` (exists, FIX to write to user_coins not profiles)
- `POST /api/parent/approvals/:id/decide` → `{ decision: 'approved' | 'denied' }`
- `POST /api/parent/teens/link` → `{ code }` consumes a linking code from the teen
- `GET /api/parent/teens/overview` → uses the `parent_teens_overview` view we created

**UI contract**:
- `/parent` — KPI hero + linked teens grid + approval queue + tier badge + ambassador if applicable
- `/parent/topup` — packages with tier discount + payment rail picker
- `/parent/approvals` — real queue with push handoff
- `/parent/teens/add` — input linking code OR generate invite link
- `/parent/budget` — set ceilings + mode per teen
- `/parent/e-signature` (exists)

**🔴 Invariants**:
- No coin debit happens without an active `e_signatures.terms_accepted=true` row.
- A spend > `teen_budget_limits.max_per_transaction` always queues `parental_approvals` regardless of mode.
- Linking codes expire after 24h, single-use.
- Tier names: 🟢 LOCKED to Free / Silver / Gold / Platinum (rename code to align).

**Acceptance criteria**:
- ☐ Parent without e-sig cannot top up (returns `requiresSignature: true`)
- ☐ Teen spend above ceiling triggers parental_approval row + push to parent
- ☐ Parent can approve/deny in one tap
- ☐ Parent can add a teen via 6-digit linking code
- ☐ Tier discount applied at top-up checkout

## 11. Parental authorizations spec (per-action, distinct from e-sig)

**Outcome**: per-action approvals for: bookings, large purchases, coach meetings, partner location visits.

**Data contract**: `parental_approvals` table (in §10).

Approval types: `'booking' | 'purchase_above_ceiling' | 'coach_meeting' | 'venue_visit' | 'crew_join'`.

**API contract**:
- Generic `POST /api/parental-approvals/request` called by feature endpoints when they need a gate.
- `GET /api/parent/approvals` → list
- `POST /api/parent/approvals/:id/decide` (above)

**UI contract**: `/parent/approvals` queue + push notifications.

**🔴 Invariants**:
- Approval expires after 24h (teen must re-request).
- Multi-parent: notify all linked parents; **first to approve wins**, both notified.
- Auto-deny if 24h elapse with no decision.

## 12. Ambassador / referral spec

**Outcome**: ambassadors invite users, earn commissions on filleul purchases. Two tracks: cash (adult ambassadors) + XP-only (teen ambassadors).

**Data contract**:
```sql
public.ambassadors (
  id UUID PK, user_id UUID UNIQUE, code TEXT UNIQUE, status TEXT,
  track TEXT CHECK (track IN ('cash','xp_only')),
  tier TEXT CHECK (tier IN ('bronze','silver','gold')) DEFAULT 'bronze',
  commission_pct NUMERIC, payout_method TEXT, ...
);
public.referral_attribution (
  id UUID PK, ambassador_id UUID, referred_user_id UUID UNIQUE,
  attributed_at TIMESTAMPTZ, expires_at TIMESTAMPTZ -- 🟡 DEFAULT lifetime
);
public.ambassador_commissions (
  id UUID PK, ambassador_id UUID, referred_user_id UUID,
  source_transaction_id UUID, amount_dh NUMERIC, amount_xp INTEGER,
  status TEXT CHECK (status IN ('pending','available','paid_out','clawed_back'))
);
public.ambassador_payouts (
  id UUID PK, ambassador_id UUID, total_dh NUMERIC, paid_at, method, reference
);
```

Add `'ambassador'` to `profiles.role` enum.

**API contract**:
- `POST /api/ambassador/apply` → admin queue
- `GET /api/ambassador/code` → returns the user's `ambassadors.code`
- `GET /join?ref=CODE` → captures attribution into `referral_attribution`
- Hook: every successful `payment_transactions` triggers attribution check + `ambassador_commissions` insert
- `POST /api/ambassador/withdraw` → for cash track only

**UI contract**:
- `/devenir-ambassadeur` — public, application form
- `/ambassador` — dashboard (filleuls list, commissions, share link, withdrawal button)
- `/admin/ambassadors` — KYC + tier management

**🔴 Invariants**:
- Filleul attribution is **lifetime** (🟡 DEFAULT, founder may shorten).
- Cash track requires KYC; XP-only doesn't.
- Commission applies only to `payment_transactions.status='succeeded'`.
- Refund triggers commission clawback.

## 13. Birthday spec

**Outcome**: teen's birthday triggers XP gift, friends can send wishes, parent can plan a party at a venue partner.

**Data contract**:
```sql
public.anniv_packs (id, partner_id, name, description, capacity, price_dh, price_coins, is_active)
public.anniv_extras (id, pack_id, name, price_dh)
public.anniv_orders (id, parent_id, teen_id, pack_id, party_date, guest_count, status, total_dh, ...)
public.anniv_order_extras (order_id, extra_id, quantity)
public.birthday_wishes (id, from_user_id, to_teen_id, message, xp_gift INTEGER, created_at)
```

**API contract**:
- Cron `app/api/cron/birthday-rewards` → daily, find teens whose `date_of_birth` matches today → grant +500 XP via `add_xp_to_user(teen_id, 500, 'birthday', null)` → notify friends.
- `POST /api/anniversaires/order` — book a party
- `POST /api/teen/birthday/wish` — send a wish (with optional XP gift up to 50 XP/day)

**UI contract**:
- `/anniversaires` — discovery + upcoming friend birthdays widget
- `/anniversaires/organiser` — booking flow
- `/teen` — birthday banner if teen's birthday week

**🔴 Invariants**:
- Birthday cron is idempotent (skip if already granted this year).
- Wishes quota: 50 XP gift / sender / day total.

## 14. Events lifecycle spec

**Outcome**: partners create events, teens discover and book, scanner validates, post-event XP.

**Data contract**: extend `events` table to match the rich UI:
```sql
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS:
  partner_id UUID REFERENCES partners(id),
  category TEXT, age_min INT, age_max INT, capacity INT,
  price_dh NUMERIC, price_coins INT, image_url TEXT,
  city TEXT, address TEXT, status TEXT DEFAULT 'draft',
  starts_at TIMESTAMPTZ, ends_at TIMESTAMPTZ,
  -- and the columns the rich UI expects
;
public.event_check_ins (booking_id, scanned_by, scanned_at);
```

**API contract**:
- `POST /api/partner/events/create` (partner) → status='draft' → admin reviews → status='published'
- `GET /api/teen/agenda?city=&category=&date=` → discovery
- `POST /api/bookings/create` → debits coins + (optional) DH, creates booking, generates QR
- `POST /api/partner/scanner/validate` → marks `event_check_ins`, awards post-event XP

**UI contract**:
- `/agenda` (public) + `/teen/agenda` (teen-filtered)
- `/teen/shop/checkout?booking=...` (existing, fix to read from real `bookings`)
- `/partner/events/new` + `/partner/events/:id`
- `/partner/scanner`

**🔴 Invariants**:
- Capacity enforced atomic on booking insert.
- Refund window: 🟡 DEFAULT 24h before `starts_at`.
- Past events read-only.

## 15. Academic integration spec

**Outcome**: teen sees grades, gets adaptive content, books tutoring with education partners, earns XP for academic achievements.

**Data contract**:
```sql
ALTER TABLE public.educational_quizzes ADD COLUMN IF NOT EXISTS:
  school_type TEXT, curriculum TEXT, language TEXT;
ALTER TABLE public.teen_grades ADD COLUMN IF NOT EXISTS:
  created_by UUID REFERENCES auth.users(id),
  created_by_role TEXT CHECK (role IN ('teen','parent','teacher')),
  evidence_url TEXT;

public.tutoring_slots (id, partner_id, teacher_id, subject, slot_start, slot_end, capacity, price)
public.tutoring_bookings (id, slot_id, teen_id, ...)
```

**API contract**: `GET /api/teen/education/grades`, `POST /api/teen/education/grades` (teacher or parent), tutoring booking flow analogous to events.

**UI contract**: `/teen/aide-scolaire` (already wired post-W2), `/teen/aide-scolaire/tutors`, `/teen/aide-scolaire/grades`.

**🔴 Invariants**:
- A grade can be edited only by its `created_by` for 24h, then locked.
- Teachers' grades trigger a parental_approval before XP credit (cap 200 XP/grade).

## 16. Notifications spec

**Outcome**: a teen approaching a daily reset, a parent with a pending approval, an ambassador with a new commission, **all** receive timely, channel-correct notifications.

**Data contract**:
```sql
public.notification_preferences (
  user_id UUID PK, push_enabled, email_enabled, sms_enabled,
  quiet_hours_start TIME, quiet_hours_end TIME,
  per_type JSONB -- per-event-type overrides
);
public.user_notifications (id, user_id, type, title, body, data, read_at, created_at);
public.push_subscriptions (id, user_id, endpoint, keys, device_id);
```

**API contract**:
- `lib/notifications/router.ts` — given `(userId, type, payload)`, looks up preferences → fans out to wired channels.
- `POST /api/notifications/subscribe` — store push subscription
- `GET /api/notifications` — in-app inbox
- `POST /api/notifications/:id/read` — mark read

**Channels** (priority order):
1. **In-app inbox** — always
2. **Web push** (PWA) — opt-in (🟡 DEFAULT for parental approvals + birthday wishes)
3. **Email** (Resend) — opt-in (🟡 DEFAULT for digest + receipts)
4. **SMS** (🟡 DEFAULT provider: Twilio fallback to local Moroccan PSP) — opt-in for time-critical (parental approvals)
5. **WhatsApp** — deferred P2

**Required infra fixes**:
- Create `/public/sw.js` (service worker) and `/public/manifest.json`
- Wire VAPID keys in env
- Update `lib/notifications/triggers.ts` to use `user_notifications` (not the missing `notifications` table)

**🔴 Invariants**:
- Quiet hours respected globally (no push between 22h-7h).
- Parental approvals: fan out to **ALL** linked parents simultaneously.
- Notification template localized by `user.language` (fr / ar / en).

## 17. Social graph spec

**Outcome**: distinct relationship tiers — **friends** (1-1 mutual), **circles** (5-10 close friends, group chat), **crews** (10-30 competitive). Plus QR/code discovery, parental visibility, block/report.

**Data contract**: existing tables (`friendships`, `friend_requests`, `circles`, `circle_members`, `crews`, `crew_memberships`, `blocked_users`).

Resolve the dual `friendships` shape (per audit). Pick one canonical shape.

**API contract**:
- `POST /api/teen/friends/request` → accept/decline → mutual
- `POST /api/teen/circles/create` → invite members
- `POST /api/teen/crews/join`
- `GET /api/teen/discover?friend_code=...&qr=...`
- `POST /api/teen/block` + `POST /api/teen/report`

**UI contract**:
- `/teen/friends` — list + add (search, friend code, QR)
- `/teen/circles` — group chat per circle
- `/teen/crews` — leaderboard + join + battles

**🔴 Invariants**:
- Friend requests time out after 7 days if not accepted.
- Parents can see teen's friend list (read-only) — 🟡 DEFAULT toggle ON
- Block is mutual (also blocks the other side from seeing teen)
- Adult ↔ teen friendship requires parental authorization (coach exception via partner_staff link)

## 18. Admin / moderation spec

**Outcome**: staff approves partners and ambassadors, moderates AI content + user reports, manages refunds and broadcasts.

**Data contract**:
```sql
public.admin_audit_logs (id, user_id, action, target_type, target_id, payload, created_at)
public.moderation_queue (id, content_type, content_id, queued_at, reviewed_by, decision, reason)
public.user_reports (id, reporter_user_id, target_type, target_id, reason, status)
public.support_tickets (id, requester_user_id, subject, body, status, assigned_to, ...)
```

Plus `permissions JSONB` column on `admin_roles`.

**API contract**: standard CRUD per resource + `POST /api/admin/moderate/:id/decide`, `POST /api/admin/refund/:transaction_id`, `POST /api/admin/broadcast` (push to all users).

**UI contract**: `/admin/partners`, `/admin/ambassadors`, `/admin/moderation`, `/admin/refunds`, `/admin/broadcasts`, `/admin/audit-log`.

**🔴 Invariants**:
- **Every** admin action writes to `admin_audit_logs` (compliance).
- Refund authority: only `admin_roles.role IN ('super_admin','admin')`.
- Audit retention: 7 years (Moroccan accounting law).

## 19. Onboarding flows spec

**Outcome**: each role has a clear, short, role-aware first-run.

| Role | Steps | Completion gate |
|---|---|---|
| **Teen (parent-invited)** | Receive linking code → signup with code → fill profile (school, grade, interests, avatar) → first quiz → first XP | `teens.id` row exists + `interests` set + 1 quiz attempt |
| **Teen (self-signup)** | Signup → email confirm → request parent contact → wait → fill profile | Same + parent_teen_links row |
| **Parent** | Signup → email confirm → e-signature CGU → add a teen (linking code or invite link) → first top-up → set spending mode | e_signatures + parent_teen_links + first user_coins update |
| **Partner** | Signup with type wizard → KYC submission → wait approval → create first offer | partners.status='active' |
| **Ambassador** | Apply → wait approval → get code → first share | ambassadors.status='active' |
| **Admin** | Invite-only by another admin → role assignment | admin_roles row |

**Data contract**: add `profiles.is_onboarded BOOLEAN DEFAULT false`, set true on completion gate.

**API contract**:
- `POST /api/parent/teens/invite` → generates `linking_codes` row + sends share link
- `POST /api/teen/onboarding/complete` → marks `is_onboarded`

**UI contract**: `/onboarding` becomes a **router** that picks the right flow based on `profiles.role` + `is_onboarded`.

**🔴 Invariants**:
- A user with `is_onboarded=false` is **always** redirected to `/onboarding` (except `/auth/*`).
- Linking codes are 6 digits, 24h TTL, single use.
- Teen profile must have `grade_level` before quizzes adapt.

---

## 19.5. Personalization Engine — the retention loop

> **Full spec**: `docs/vision/personalization-engine.md` (~38KB, source of truth for the algorithm).

This is the **cross-cutting algorithm** that decides what every teen-facing surface shows: the avatar's next-défi suggestion, the daily quiz, event ranking, partner offers, friend suggestions, crew matchmaking. **Without it, the rest of the app is a flat catalog.** Sections §7, §8, §14, §17 all converge on a single RPC: `recommend_for_teen(teen_id, content_type, n)`.

### Profile model (additions on top of `teens`)
- **Interests** — `teen_interests(teen_id, tag, weight)` from a 50-tag closed taxonomy (sport / music / art / tech / science / lifestyle / academic / gaming / food / fashion / nature / languages — see Appendix A of the spec doc)
- **Goals** — `teen_goals(teen_id, goal_text, goal_tag, priority, is_active)`
- **Learning style** — visual / auditory / kinesthetic / reading
- **Personality archetype** — leader / explorer / creator / socializer (drives avatar tone + content bias)
- **Availability windows** — JSONB inferred from engagement_rhythm
- New columns on teens: `gender`, `city`, `region`, `grade_level`, `learning_style`, `archetype`, `availability_pattern`

### Behavioral signal capture (the input layer)
`behavioral_signals(teen_id, signal_type, target_type, target_id, weight, metadata, created_at)` — every interaction logs a row:
- view (w=1) / click (w=2) / start (w=2) / complete (w=3) / abandon (w=-1) / share (w=2) / favorite (w=2) / dismiss (w=-2) / report (w=-3)
- target_type: quiz / defi / event / partner_offer / friend_profile / quest / mission

### Aggregation (nightly cron `evolve-teen-profiles`)
- `affinity_scores(teen_id, tag, score)` — sliding 30-day decayed score per tag (decay 0.95^days)
- `teen_neighbours(teen_id, neighbour_id, similarity)` — top-50 cosine-similar teens for collaborative filtering

### Scoring formula (hybrid recommender)
For each (teen, candidate item):
```
score = w1·affinity_match + w2·collab_signal + w3·friend_resonance
      + w4·novelty_bonus + w5·context_fit + w6·difficulty_fit
      - p1·recently_seen - p2·friend_already_did - p3·difficulty_mismatch
```
Each function defined with concrete formulas in the spec doc. Weights w1..w6 tunable per content_type (initial defaults provided). MMR diversity injection: at least 1 of every 5 results is novelty.

### Cold-start (< 5 sessions)
- Static profile only (interests + curriculum + city + age)
- Boost popular-among-cohort + bias toward easy-completion (build streak) + bias toward social items (network effect)

### Schema additions (migration 051)
```sql
CREATE TABLE teen_interests (teen_id, tag, weight, declared_at, PK(teen_id,tag));
CREATE TABLE teen_goals (id, teen_id, goal_text, goal_tag, priority, is_active, created_at);
CREATE TABLE behavioral_signals (id BIGSERIAL, teen_id, signal_type, target_type, target_id, weight, metadata, created_at);
CREATE TABLE affinity_scores (teen_id, tag, score, updated_at, PK(teen_id,tag));
CREATE TABLE teen_neighbours (teen_id, neighbour_id, similarity, computed_at, PK(teen_id,neighbour_id));
CREATE TABLE recommendation_weights (content_type, w1..w6, p1..p3, version, active, created_at);
CREATE TABLE recommendation_metrics_daily (date, content_type, shown_count, clicked_count, completed_count);
ALTER TABLE educational_quizzes/physical_challenges/mission_templates/events/partner_offers/shop_rewards ADD tags TEXT[];
ALTER TABLE teens ADD gender, city, region, grade_level, learning_style, archetype, availability_pattern;
CREATE INDEX ... USING GIN(tags);
```

### RPCs
- `recommend_for_teen(teen_id, content_type, n=5)` — ranked items
- `record_signal(teen_id, signal_type, target_type, target_id, weight)` — write to behavioral_signals
- `update_affinity_scores(teen_id)` — used by nightly cron
- `find_neighbours(teen_id, k=50)` — cosine on affinity vectors
- `recommend_friends(teen_id, n=10)` — same school + city + interest overlap + mutual friends
- `recommend_crew_opponent(crew_id)` — power-balanced matchmaking

### Per-surface integration (where the engine plugs in)
- **Avatar coach**: top-1 mission + LLM-generated message tailored to teen's interests + mood (whitepaper §8)
- **Daily quiz selector**: replace `pool[dayIndex % length]` with `recommend_for_teen('quiz', 1)`, filtered by curriculum + 7-day-no-repeat (whitepaper §7 + §29.9)
- **Event discovery**: top-5 ranked + 1 wildcard novelty
- **Partner offer discovery**: scored by interest tags × partner_type fit + discount value relative to coin balance
- **Friend suggestions**: school + city + interest overlap + mutual friends
- **Crew matchmaking**: power-balanced + recency

### Onboarding additions (whitepaper §19)
+2 short steps: (a) "What are you into?" — 30-tag chip selector, pick 5-10 → `teen_interests`. (b) "Your goals this season" — 3 free-text → `teen_goals`. (c) "How do you learn best?" — 4-choice → `teens.learning_style`.

### 3-sprint implementation roadmap
1. **Sprint 1 (capture + storage)** — migration 051, onboarding chip selector, `record_signal` RPC + capture in 5 hot paths
2. **Sprint 2 (scoring + cron)** — `recommend_for_teen` with affinity-only score (no neighbours yet), nightly affinity decay, replace daily quiz selector
3. **Sprint 3 (neighbours + avatar)** — `find_neighbours`, `friend_resonance` + `collaborative_signal` in scoring, avatar coach reads recommendations, A/B framework hooks

### Privacy + fairness
- Friend signals never expose private data (just "X friends did this")
- Recommendations respect parental block lists
- No "addictive" patterns: cap notifications at 3/day, cap streak guilt
- Diversity injection (MMR), bias monitoring weekly

### Metrics (in `recommendation_metrics_daily`)
- Recommendation acceptance rate (clicked / shown)
- Time-to-completion of recommended items
- Per-tag accuracy
- Cohort engagement curves

---

# Part IV — Cross-cutting

## 20. Identity model — 🟢 LOCKED canonical

**Decision**: `auth.users.id` is THE single source of truth. All other tables FK to it directly:
- `profiles.id REFERENCES auth.users(id)`
- `teens.id REFERENCES auth.users(id)` ← teen IS a user
- `users` (the public mirror) — **deprecated, remove**

**Trigger**: on `auth.users` insert, automatically create `profiles` row with `role` taken from `raw_user_meta_data->>'role'` (default `'parent'`). On `profiles.role='teen'` update or insert, create the `teens` row.

```sql
CREATE OR REPLACE FUNCTION public.handle_new_user() RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data->>'full_name',
          COALESCE(NEW.raw_user_meta_data->>'role','parent'))
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END $$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
```

## 21. RLS + grants strategy

**Strategy**: every public table has:
1. `GRANT SELECT, INSERT, UPDATE, DELETE` to `authenticated` (PostgREST won't even see the table without GRANT).
2. RLS enabled with explicit policies — **never** RLS-on-with-no-policies (that breaks PostgREST).
3. Service role bypasses RLS (default Supabase behavior).

**Policy patterns**:
- **Self-read**: `id = auth.uid()` or `teen_id = auth.uid()` or `user_id = auth.uid()`
- **Parent-of-teen read**: `EXISTS (SELECT 1 FROM parent_teen_links l WHERE l.parent_id = auth.uid() AND l.teen_id = TARGET.teen_id)`
- **Catalog read** (any authenticated): `USING (true)`
- **Partner-staff scoped**: `EXISTS (SELECT 1 FROM partner_staff s WHERE s.user_id = auth.uid() AND s.partner_id = TARGET.partner_id)`
- **Admin**: `EXISTS (SELECT 1 FROM admin_roles r WHERE r.profile_id = auth.uid())`

The patch SQL is in `docs/E2E_SETUP.md` — extend it as new tables are added.

## 22. Audit & compliance

| Concern | Rule |
|---|---|
| **CIN scans** | PRIVATE bucket, signed URLs valid 5min, RLS-bound access |
| **Teen photos** (défi proofs) | PRIVATE bucket; visible to teen + linked parents only |
| **Coin movements** | Always paired `coin_transactions` + `escrow_ledger` rows |
| **Admin actions** | Always log to `admin_audit_logs` |
| **Retention** | 7 years for financial records (Moroccan accounting), 3 years for moderation |
| **Right to erasure** | Implement `POST /api/account/delete` that anonymizes (not hard-deletes) per CNDP |
| **Data export** | Implement `POST /api/account/export` returning JSON of all user data |

## 23. Notification routing matrix

| Trigger | Default channels | Multi-recipient |
|---|---|---|
| Parental approval requested | push + SMS | All linked parents (first wins) |
| Top-up succeeded | email (parent) + in-app (teen) | parent + teen |
| Birthday | in-app + push (teen) + push (linked parents) | All friends + parents |
| Friend wish received | in-app | recipient only |
| Daily quiz reminder | push (teen) | teen |
| Quest expiring | push (teen) | teen |
| Ambassador commission earned | email (ambassador) | ambassador |
| Partner sale validated | in-app (partner staff) | partner staff |
| Admin broadcast | per-target | per-target |

## 24. Internationalization

- 🟡 RECOMMENDED DEFAULT: launch with **fr-FR** (primary) + **fr-MA** (Moroccan French specifics) + **ar-MA** (Arabic).
- 🟡 Darija (`ary`) deferred to V2 per founder feedback ambiguity. Do NOT generate Darija content yet.
- All notification templates carry a `locale` column.
- Teen profile has `preferred_language` from one of the supported set.

## 25. Mobile vs web (deferred)

- 🟡 RECOMMENDED DEFAULT: **PWA-first** (web push, install prompts) using the existing Next.js app.
- Native iOS/Android: deferred to after revenue traction, framework TBD (Expo / React Native).
- Implementation agents: assume PWA. Web push spec in §16 covers it.

---

# Part V — Roadmap & decisions

## 26. Backlog — P0 / P1 / P2

### 🔴 P0 (cannot launch — money + identity + compliance)
1. Identity unification (§20 trigger applied)
2. Coin pipeline e2e (§5 acceptance criteria all green)
3. RLS policies + GRANTs across all 34 broken tables (§21 patterns)
4. Move CIN + teen-proof storage to private buckets (§22)
5. e_signatures + parental_approvals + teen_budget_limits + payment_transactions + escrow_ledger tables created
6. Spend-earns-XP cashback wired (§5 invariants)
7. Pick payment rail (Cash Plus + Stripe recommended) and wire to top-up
8. Drop the broken `init_wheel_streak_trigger` permanently OR fix the `public.` prefix
9. Quest assignment cron job (§6)
10. PWA service worker + manifest (§16)

### 🟠 P1 (vision coherence)
11. Avatar coach v1 (§8) — name, profile-aware greeting, suggested-quest API
12. Adaptive quiz selection (§7) — by grade + language + history
13. Three quest surfaces → one canonical (§6)
14. Partner real scanner swap (§9)
15. Teacher/coach XP-awarding feature (§9)
16. Ambassador track real (§12)
17. Birthday automation cron + wishes (§13)
18. Events table extension + partner authoring (§14)
19. Notifications fan-out wiring (§16)
20. Tier alignment to Free/Silver/Gold/Platinum (§10)
21. Subscription tier discounts at top-up (§5)
22. Education partner ↔ teen_grades flow (§15)
23. Mystery box reveal flow + legal review (§5 wider note)
24. Admin audit log + moderation queue real (§18)

### 🔴 P0+ (added v3.5 — personalization is the retention engine, can't ship without)
P0+1. **Migration 051** — `teen_interests`, `teen_goals`, `behavioral_signals`, `affinity_scores`, `teen_neighbours`, `recommendation_weights`, `recommendation_metrics_daily` + tag columns + teens columns (gender/city/grade_level/learning_style/archetype) — see §19.5
P0+2. **`record_signal` RPC** + capture hooks in 5 hot paths (quiz_attempt, mission complete, event view, offer click, friend add)
P0+3. **Onboarding chip selector** — "What are you into?" (5-10 picks from 50-tag taxonomy) + goals + learning_style
P0+4. **`recommend_for_teen` RPC v1** (affinity-only score) — wired to daily quiz selector + avatar coach
P0+5. **Nightly `evolve-teen-profiles` cron** — affinity decay + neighbour recomputation

### 🟢 P2 (polish)
25. Crew battle XP redistribution rule
26. Avatar customization unlocks
27. Ambassador tier system (bronze/silver/gold)
28. Refund policies (partner cancel, age-18 transition)
29. Cross-cadence quest stacking
30. Per-partner cashback rate customization
31. WhatsApp notification channel
32. Native mobile app

## 27. Founder decisions table

| # | Decision | Recommended default | Locked? |
|---|---|---|---|
| 1 | Identity canonical | `teens.id == auth.users.id` | 🟢 LOCKED here |
| 2 | XP↔DH ratio | 100 XP per DH | 🟢 LOCKED here |
| 3 | Spend-earns-XP cashback rate | 10% global, partner overrides allowed | 🟡 DEFAULT |
| 4 | Payment rails | Cash Plus (escrow) + Stripe + CMI for collection | 🟡 DEFAULT |
| 5 | CIN storage | Private bucket, signed URLs 5min | 🟢 LOCKED |
| 6 | Mystery boxes | Defer until legal review (loi sur les jeux) | 🟡 DEFAULT |
| 7 | Languages | fr-FR + fr-MA + ar-MA at launch; darija V2 | 🟡 DEFAULT |
| 8 | Avatar name + persona | Niv (panda, 5 moods, customizable) | 🟡 DEFAULT |
| 9 | LLM provider | Claude (primary) + OpenAI (fallback) | 🟡 DEFAULT |
| 10 | Quest cadences | 5 (daily/weekly/monthly/seasonal/event) | 🟡 DEFAULT |
| 11 | Crew XP allocation | Pool then split equally on win | 🟡 DEFAULT |
| 12 | Spending mode default | Validation mode for new families | 🟡 DEFAULT |
| 13 | Notification primary channel for approvals | Push + SMS fallback after 5min | 🟡 DEFAULT |
| 14 | Partner commission % | retail 8 / venue 10 / club 12 / education 15 | 🟡 DEFAULT |
| 15 | Coach earning model | Subscription per partner (no per-XP fee) | 🟡 DEFAULT |
| 16 | Coach XP cap | 500 XP / teen / week / awarder | 🟡 DEFAULT |
| 17 | Ambassador commission | 10% on filleul purchases (lifetime attribution) | 🟡 DEFAULT |
| 18 | Ambassador cash-out | Bank transfer monthly, threshold 200 DH | 🟡 DEFAULT |
| 19 | Tier names | Free / Silver / Gold / Platinum | 🟢 LOCKED here |
| 20 | Tier top-up discounts | 0 / -10 / -20 / -30 | 🟡 DEFAULT |
| 21 | Parent-teen cardinality | 1 parent N teens (single-parent) for V1 | 🟡 DEFAULT |
| 22 | Age-18 transition | Manual review, account migration | 🟡 DEFAULT |
| 23 | Refund window | 24h before event start | 🟡 DEFAULT |
| 24 | Friend visibility default | Parent can see teen's friends list (read-only) | 🟡 DEFAULT |
| 25 | Adult-teen friending | Blocked except via partner_staff link (coaches) | 🟡 DEFAULT |
| 26 | Interest taxonomy — keep at 50 closed tags? | 50 closed at launch, audit quarterly | 🟡 DEFAULT |
| 27 | Recommendation weights per content type | See `personalization-engine.md` §4 + §6 | 🟡 DEFAULT |
| 28 | Cold-start cohort | school first, then age fallback | 🟡 DEFAULT |
| 29 | Diversity injection rate | 1 of every 5 = novelty | 🟡 DEFAULT |
| 30 | Behavioral signal retention | 90 days raw, aggregates indefinite | 🟡 DEFAULT |

**To founder**: any 🟡 you want to override, change in this table → agents pick it up automatically.

---

# Part VI — Agent Handbook

## 28. Glossary (terms agents must use consistently)

| Term | Meaning | Aliases to avoid |
|---|---|---|
| **XP** | Reward currency, earned by effort + spending | "experience points", "credits" |
| **Coins** | Prepaid spending currency | "tokens", "points", "DH balance" |
| **DH** | Moroccan Dirham, real money unit | "MAD" (use only in technical fields) |
| **Top-up** | Parent → coins funding action | "deposit", "recharge" |
| **Spend** | Coin debit on a partner offer or event | "purchase", "buy" |
| **Cashback** | XP earned per coin spent | "reward back" |
| **Défi** | A challenge (physical, group, special, etc.) | "challenge" only OK in code, French in UI |
| **Quête / Quest** | A mission with cadence (daily, weekly, monthly, seasonal, event) | "task" |
| **Mission** | DB-level term, same as quest | (use either consistently in same file) |
| **Crew** | 10-30 competitive group | "guild", "team" |
| **Cercle / Circle** | 5-10 close friends, group chat | "group" |
| **Filleul** | Referred user (in ambassador context) | "referred", "invitee" |
| **Parrain / Ambassador** | Referrer | (synonyms; use ambassador in code) |
| **Avatar coach / Niv** | Persistent companion mascot | "assistant", "bot" |
| **E-signature / e-sig** | One-time CGU acceptance | "consent" |
| **Parental authorization** | Per-action approval, distinct from e-sig | "parent approval" (ambiguous) |
| **Validation mode** | Spend mode where parent approves each transaction | "manual mode" |
| **Autonomous mode** | Spend mode within pre-set ceilings | "free mode" |
| **Tier** | Free / Silver / Gold / Platinum (parent subscription) | "plan", "level" |
| **Provenance** | Source of an XP grant (quiz, défi, coach, birthday, cashback, ambassador) | "origin" |
| **Escrow** | DH held by Nivy or licensed PSP backing the coin balance | "balance", "wallet" |

## 29. Invariants (rules that must always hold)

🔴 If an implementation agent's PR violates any of these, the verifier rejects.

1. **No XP↔coins conversion path exists.** Code that swaps the two is rejected.
2. **No coin debit succeeds without a paired `coin_transactions` row.**
3. **Every successful coin debit triggers an XP cashback in the same DB transaction.**
4. **Coin top-ups never bypass `payment_transactions` + `escrow_ledger`.**
5. **`auth.users.id` is THE canonical user identifier across all tables.**
6. **No CIN / teen-photo file in a public storage bucket.**
7. **Every public table has explicit GRANTs and explicit RLS policies (never RLS-on-with-no-policies).**
8. **Every admin action writes to `admin_audit_logs`.**
9. **No teen sees a quiz they passed in the last 7 days.**
10. **No notification sent during quiet hours (22h-7h Africa/Casablanca by default).**
11. **Quest cadences refresh on the canonical schedule (daily 00:05, weekly Monday 00:10, monthly 1st 00:15, seasonal 1st of quarter 00:20).**
12. **Ambassador commission applies only to `payment_transactions.status='succeeded'`.**
13. **A teen with `is_onboarded=false` is always routed to `/onboarding`.**
14. **All money-related amounts in DH are stored as `NUMERIC(10,2)`, all coin amounts as `INTEGER`, all XP as `INTEGER`.**
15. **All DB writes that reference real money go through service_role (server-side); client-side `supabase.from(...)` never touches `coin_transactions`, `payment_transactions`, `escrow_ledger`.**

## 30. How to execute against this whitepaper

### For implementation agents

1. **Find your domain in §5–§19.** That's your spec.
2. **Read the Outcome.** That's what success looks like.
3. **Implement the Data contract** (use `mcp__claude_ai_Supabase__apply_migration` for DDL).
4. **Implement the API contract** (server-side, service_role for money).
5. **Implement the UI contract** (Next.js, RSC where possible).
6. **Verify against Acceptance criteria** with Playwright tests.
7. **Cross-check Invariants** (§29).

### For the orchestrator

1. P0 backlog (§26) is the launch gate. Do not start P1 until all P0 acceptance criteria pass.
2. Within P0, dispatch in dependency order: identity (§20) → grants/RLS (§21) → schema additions → API → UI.
3. After every team agent: `commit-gate` snapshot + `team-verifier` independent attestation.

### For the founder

- Override any 🟡 RECOMMENDED DEFAULT in §27 by editing the value in this file. Agents read this as their source of truth.
- Lock new decisions by changing 🟡 to 🟢.
- Add new decisions to §27 as they arise.

---

## Index of detailed audits (22 files)

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
| Events lifecycle | [events-lifecycle.md](./events-lifecycle.md) | 11 KB |
| Academic integration | [academic-integration.md](./academic-integration.md) | 14 KB |
| Notifications | [notifications.md](./notifications.md) | 8 KB |
| Social graph | [social-graph.md](./social-graph.md) | 8 KB |
| Admin / moderation | [admin-moderation.md](./admin-moderation.md) | 11 KB |
| Onboarding flows | [onboarding-flows.md](./onboarding-flows.md) | 14 KB |
| Data model | [data-model.md](./data-model.md) | 19 KB |

**Total**: 22 audits, ~268 KB of evidence. Cross-referenced from every spec section.

---

## Quick reference — agent prompts

When an implementation agent picks up a task, the prompt template is:

```
You are implementing <DOMAIN_NAME> per docs/vision/PRODUCT_WHITEPAPER.md §<SECTION>.

Read first:
- docs/vision/PRODUCT_WHITEPAPER.md §<SECTION> (the spec)
- docs/vision/<domain>.md (the underlying audit)
- docs/E2E_SETUP.md (for the patch SQL pattern)
- docs/vision/PRODUCT_WHITEPAPER.md §29 (invariants — your PR is rejected if you violate any)

Build:
- Data contract via mcp__claude_ai_Supabase__apply_migration
- API contract in app/api/...
- UI contract in app/<route> + components/

Verify:
- Acceptance criteria all pass
- All invariants hold
- npm run build green
- Playwright tests for the new flows

Commit via commit-gate after each unit. Do not break P0 acceptance criteria
of other domains.
```

---

> **End of whitepaper v3.** Total: 22 audits + this synthesis. ~300 KB of definitive product spec ready for implementation agents to execute. Last updated 2026-05-07.
