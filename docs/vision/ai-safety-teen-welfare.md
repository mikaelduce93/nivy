# AI Safety & Teen Welfare — Vision vs. Reality

> Auditor: ai-safety-teen-welfare-auditor (read-only). Scope: every surface
> where AI-generated content, peer interaction, or gamification mechanics
> can reach a 13–17-year-old user. Date: 2026-05-07. Branch: `main`.

Nivy targets minors. The product promises age-safe AI content, dark-pattern-
free engagement, privacy-respecting proof of physical défis, parental
override, and a working report/block loop. This audit measures the gap
between that promise and the implementation.

---

## 1. Vision intended

A 13-year-old teen using Nivy should never:
- read AI-generated quiz/mission/feed copy that mentions sexual content,
  graphic violence, recreational drugs, gambling outside regulated event
  promos, or self-harm techniques;
- be coached toward a physical défi that is medically dangerous for their
  age, weight, or fitness baseline (no "100 push-ups in a row, today" for a
  beginner; no "skip a meal" framing);
- have their proof photo/video used as third-party AI training data,
  exposed to public or unauthorized peers, or kept past a defined
  retention window;
- be locked into manipulative engagement loops — guilt-driven streaks with
  no grace period, fake countdowns, surprise-reward slot-machine UX,
  forced-team battles where opting out costs social status, push spam past
  quiet hours;
- receive direct messages from adults outside the partner-staff role;
- see their own report disappear into a void — every report must reach a
  human moderator with a defined SLA, and three independent reports on the
  same content must auto-restrict it pending review;
- bypass parental override — the parent must always be able to pause the
  account, read peer messages, restrict the friend list, and revoke
  consent under loi 09-08 (CNDP) at any moment.

The avatar coach (Kai) must be a *companion*, not a *funnel*: it must not
manufacture urgency, must avoid daily-engagement guilt, must escalate any
self-harm / crisis signal to a human, and must never push a paid action
(top-up, partner offer) when the teen shows distress.

## 2. Reality on the ground

**Content moderation pipeline (partially built).** AI content runs through
a deterministic auto-validator that scores 0–100 and routes via DB status
(`pending` / `auto_validated` / `auto_rejected` / `manual_review` /
`approved` / `rejected` / `needs_revision`):

- `lib/ai/content-validator.ts` (`ContentValidator.validateQuiz` and
  `validateMission`) checks structure, length, options, answer
  distribution, duplicates. Threshold: ≥ 70 auto-validates, 50–69 routes
  to manual review, < 50 falls back to curated content.
- DB twin: `gamification-system/database/migrations/033_content_validation_system.sql`
  defines `content_validations`, `content_quality_rules`,
  `curated_content_library`, plus the SQL function `validate_quiz_content`
  and the fallback RPC `get_curated_content_fallback`.
- `lib/ai/factual-validator.ts` and the `content_factual_verification`
  table from migration `034_intelligent_content_system.sql` add a second
  pass for factual claims (verified / partially_verified / failed).
- Admin UI: `app/admin/content/page.tsx` — but per the
  admin-moderation audit, this page currently runs on **mock arrays**
  with no API write-back. The DB tables exist; the human-in-the-loop
  surface is not wired.

**Missing layers.** There is *no* keyword blocklist for sexual / drug /
violence / gambling / self-harm terms, *no* LLM-as-judge pass for tone
appropriateness, and *no* age-gating of generated content beyond the
`grade_level` field (which is a difficulty hint, not a safety hint).
`lib/ai/pedagogical-validator.ts` checks pedagogical fit (vocabulary,
question style) but not safety category. The validator is purely
structural; an AI-generated quiz that asks "Quelle drogue était populaire
dans les années 70 ?" would pass with score ≥ 70.

**Dangerous physical défi screening — absent.** Per the
physical-challenges audit, `app/api/teen/sport/challenges/route.ts`
auto-validates `action='complete'` immediately, regardless of `proofUrl`.
There is no medical-safety gate, no per-age calibration, no
contraindication check (the seed contains "Marathon Mensuel" available to
13-year-olds). The `quality_threshold` column in `content_quality_rules`
takes a single decimal score — no separate `safety_threshold`. The
schema comment in migration 033 mentions "Pour défis: safety_checks,
age_appropriateness" as an *example* of rules to populate, but the
`content_quality_rules` table is empty in production.

**Photo/video proof privacy — leaky.** `physical_challenges` exposes a
`proof_url` column with `proof_type ∈ {photo, video, screenshot, manual}`
and the records table has `proof_url` too. Storage bucket policy is
**not visible in code** — the only documented bucket usage is the parent
e-signature flow which writes CIN scans to a *public* `documents` bucket
via `getPublicUrl()` (per parent-control audit), already a CNDP red flag.
No retention policy, no third-party-AI-training opt-out clause, no
reference to age-of-consent for image rights, and no signed-URL helper
for proof viewing. `app/legal/confidentialite/page.tsx` says "Photos
lors d'événements (avec consentement parental)" and "Possibilité de
suppression de toute photo à tout moment" but does not address
défi-proof photos, retention duration, or third-party model-training
opt-out.

**Manipulation pattern surface.** Streaks: `user_streaks.streak_freezes`
column exists in `types/supabase.ts` and the streak page references
`streakPasses` — a freeze/grace mechanism is provisioned but the count
defaulting, granting cadence, and grace-day window are not visible in
any seeded rule. `app/teen/streak/streak-client.tsx` shows milestones,
multipliers, daily tasks — classic loss-aversion framing, with no
documented opt-out. Daily quests, crew battles (`crew_*` tables), and
seasonal challenges create FOMO surface. Variable-reward UI (loot boxes,
surprise drops) lives under `components/gamification/celebration-overlay.tsx`
and `lib/sounds/sound-manager.ts`. `components/teen/dashboard/ai-companion.tsx`
greets with `"Yo ${teenName} ! 👋"` — the persona is friendly, but the
prompt `lib/ai/prompts/roles.ts:TEEN_AGENT_PROMPT` instructs Kai to push
quests with "+50 XP" framing on idle ("Pas question ! 🛑"). No
self-harm / wellbeing classifier intercepts the user's input before it
reaches the `streamText` call in `app/api/agent/action/route.ts`.

**Parental override — surface only.** Per parent-control audit,
`parent_teen_links` exists with one row, but `parental_approvals`,
`teen_budget_limits`, `e_signatures` *do not exist as DB tables*. There
is no `pause_teen_account` endpoint, no "view teen messages" surface in
`app/parent/`, and no friend-restriction control. The parent dashboard
shows hard-coded "500 DH/mois" copy. `parent_teens_overview` exposes
XP/level/coins but not message history, friend list, or AI-companion
chat log. CNDP "right to revoke consent" → no implementation found.

**Report / block — half-wired.** `app/api/circles/report/route.ts`
inserts into `moderation_reports` (reason ∈ inappropriate / spam /
harassment / hate_speech / personal_info / other), auto-hides a message
at `≥ 3` pending reports, and notifies `admin`/`moderator` profiles. But
`moderation_reports` has **no migration in `gamification-system/database/migrations/`**
(grep returned zero `.sql` matches). It also writes to `audit_logs` and
`notifications` — both also undeclared per the admin-moderation audit. A
report therefore writes to non-existent tables and the auto-hide
threshold logic never triggers. The block UI exists in
`components/friends/friends-list.tsx` (`Ban`/`UserMinus` icons) but no
`block_user` API or table was found. DM channel between teen and
non-partner adult: not enforced at the API layer (no role check on
`circle_messages` insert).

**Self-harm / crisis detection — none.** No text classifier on teen
messages (Circles, AI companion input, comments). `app/api/teen/feed/comments/route.ts`
contains the word "moderation" but only as a stub. No "crisis hotline"
fallback is wired into Kai's prompt. A teen typing "je veux mourir" into
the AI companion would receive a generic Kai response keyed off the
quest catalogue.

## 3. Gap matrix

| Capability                                       | Vision | Reality                              |
|--------------------------------------------------|--------|--------------------------------------|
| AI quiz/mission auto-validator (structural)      | Yes    | Implemented, threshold 70            |
| AI safety category filter (sexual/drugs/violence)| Yes    | **Absent** — no keyword/LLM judge    |
| Curated fallback library                         | Yes    | DB table exists, content empty       |
| Dangerous physical défi screening                | Yes    | **Absent** — auto-validates on POST  |
| Per-age défi calibration                         | Yes    | **Absent** — same défi for 13–17     |
| Photo/video proof privacy bucket policy          | Yes    | **Public bucket used**, no retention |
| AI-training opt-out clause                       | Yes    | **Not in privacy policy**            |
| Streak grace / freeze item                       | Yes    | Column exists, granting rule unclear |
| Daily-engagement guilt audit                     | Yes    | **No opt-out copy**, milestones lock |
| Crew battle opt-out without social cost          | Yes    | **Not implemented**                  |
| Parental account pause                           | Yes    | **No endpoint**                      |
| Parental view of teen messages / friend list     | Yes    | **No endpoint**                      |
| Friend report (Circles)                          | Yes    | Endpoint exists, target table missing|
| Block user                                       | Yes    | UI icons only, no API/table          |
| Three-report auto-restrict                       | Yes    | Coded, fails silently (no DB)        |
| Adult ↔ teen DM restriction                      | Yes    | **No role-based gate** found         |
| Self-harm / crisis classifier                    | Yes    | **Absent**                           |
| Crisis hotline fallback in Kai prompt            | Yes    | **Absent**                           |
| Wellbeing nudge on long sessions                 | Yes    | **Not implemented**                  |
| CNDP consent revocation                          | Yes    | UX gate exists, table missing        |

## 4. Risks

- **Inappropriate AI content reaches teens.** The validator is purely
  structural. An AI-generated history quiz mentioning "drogues populaires
  des années 60" or a relationship-themed mission with sexual undertones
  passes because options, length, and answer distribution are valid. On a
  minor-facing platform this is a CNDP and reputational liability.
- **Honor-system XP farming on physical défis.** Auto-validation of
  `action='complete'` with no proof check rewards XP for nothing,
  inflates leaderboards, and removes any incentive for the teen to do the
  défi safely (no per-age cap, no rest-day enforcement).
- **Public storage of teen proof media.** A public bucket plus
  `getPublicUrl` is the same pattern flagged by the parent-control audit
  for CIN scans. Teen workout videos posted to a public Supabase URL,
  with no expiry, are crawlable and can be scraped for third-party AI
  training. Loi 09-08 forbids this without explicit guardian consent and
  a stated purpose.
- **Report/block dead loop.** A teen who reports a harasser receives a
  thank-you toast but the row writes to a non-existent table; the
  auto-hide logic never triggers, the moderator notification never
  arrives, and the harasser keeps posting. This is the worst safety
  failure mode: the appearance of safety without the substance.
- **No crisis detection on AI companion input.** Kai's prompt
  optimises for engagement ("+50 XP", "Pas question !") and has no
  branch for distress signals. A teen in crisis will be coached toward a
  paid quest.
- **Parental override is theatrical.** The parent dashboard renders
  intentions (budgets, approvals, history) but cannot actually pause an
  account, read messages, restrict friends, or revoke consent under
  CNDP. A motivated parent has no working remediation path today.
- **Streak loss aversion is on by default.** With `streak_freezes`
  granting rules undefined and milestone locks visible
  (`Lock` icon in `streak-client.tsx`), the loss-aversion pressure runs
  unmoderated. No opt-out copy was found.

## 5. Open questions

- **Streak grace policy.** Is `streak_freezes` granted on signup
  (e.g. 2/week), purchased with coins, earned via achievement, or all
  three? What is the grace window — same-calendar-day, 24h sliding,
  48h? Is there a "vacation mode" that pauses the streak for travel /
  illness without resetting?
- **Crew-battle opt-out.** Can a teen leave a crew mid-battle without
  the crew losing the contribution counter? Is there a hidden "passive
  member" status? Today none of the `crew_*` tables expose an opt-out
  flag.
- **AI-generated sensitive content threshold.** When a quiz legitimately
  needs to discuss sexuality (biology), drugs (history of opium war,
  prohibition), violence (WW2), or gambling (probability), at what age /
  difficulty is the question allowed, and who reviews the borderline
  case before it ships to a 13-year-old?
- **Reporting threshold tuning.** Auto-hide at ≥ 3 reports today (per
  `app/api/circles/report/route.ts`). Should it be 1 report → review
  queue, 3 reports → auto-suspend the *poster* not just the message, 5
  reports → escalate to admin? What is the SLA for moderator response?
- **AI-training opt-out on teen media.** Default = opt-out (no third
  party can train), opt-in only via parent? How is this surfaced in the
  privacy policy and at the time of upload?
- **Crisis fallback.** When Kai detects distress, does it surface the
  Moroccan crisis hotline, ping the linked parent, lock the chat for an
  hour, or all three?
- **Long-session wellbeing nudge.** After how many minutes of
  continuous use does Nivy interrupt a teen with a break suggestion?
  None today.

## 6. References

Code paths:
- `lib/ai/content-validator.ts`
- `lib/ai/factual-validator.ts`
- `lib/ai/factual-verifier.ts`
- `lib/ai/pedagogical-validator.ts`
- `lib/ai/prompts/roles.ts`
- `lib/ai/intelligent-content-engine.ts`
- `app/api/agent/action/route.ts`
- `app/api/admin/content/generate/route.ts`
- `app/api/admin/content/validate/route.ts`
- `app/api/circles/report/route.ts`
- `app/api/teen/sport/challenges/route.ts`
- `app/api/teen/sport/records/route.ts`
- `app/api/teen/feed/comments/route.ts`
- `app/admin/content/page.tsx`
- `app/admin/proofs/page.tsx`
- `app/teen/streak/streak-client.tsx`
- `app/teen/defis-physiques/defis-physiques-client.tsx`
- `components/teen/dashboard/ai-companion.tsx`
- `components/ai/elite-ai-companion.tsx`
- `components/ai/AgentSheet.tsx`
- `components/friends/friends-list.tsx`
- `components/gamification/celebration-overlay.tsx`
- `lib/notifications/triggers.ts`
- `lib/sounds/sound-manager.ts`

Database / migrations:
- `gamification-system/database/migrations/033_content_validation_system.sql`
  (`content_validations`, `content_quality_rules`,
  `curated_content_library`)
- `gamification-system/database/migrations/034_intelligent_content_system.sql`
  (`teen_behavioral_profile`, `content_performance_metrics`,
  `content_factual_verification`)
- `gamification-system/database/migrations/022_pillars_system.sql`
  (`physical_challenges`, `teen_physical_challenge_progress`,
  `teen_personal_records`)
- `gamification-system/database/migrations/008_special_challenges.sql`
  (`special_challenge_submissions`, `challenge_votes`)
- `gamification-system/database/migrations/016_gamified_notifications.sql`
  (preferences / quiet hours)

Live tables present: `content_validations`, `content_quality_rules`
(empty), `curated_content_library` (empty), `physical_challenges`
(5 rows), `teen_physical_challenge_progress` (0 rows),
`teen_personal_records` (0 rows), `user_streaks` (with `streak_freezes`),
`push_subscriptions`, `notification_preferences`.

Live tables **missing** but referenced by code:
`moderation_reports`, `audit_logs`, `notifications` (vs the existing
`user_notifications`), `admin_audit_logs`, `parental_approvals`,
`teen_budget_limits`, `e_signatures`, `support_tickets`,
`challenge_proofs`, `block_relationships`.

Legal / docs:
- `app/legal/confidentialite/page.tsx`
- `app/legal/cgu/page.tsx`
- `app/legal/cookies/page.tsx`
- `app/legal/cgv/page.tsx`
- `app/legal/mentions-legales/page.tsx`
- `docs/CONTENT_VALIDATION_GUIDE.md`
- `docs/vision/admin-moderation.md`
- `docs/vision/parent-control.md`
- `docs/vision/physical-challenges.md`
- `docs/vision/avatar-coach.md`
- `docs/vision/notifications.md`
- `docs/SECURITY.md`
