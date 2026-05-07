# Nivy Personalization Engine

> Source-of-truth spec for the algorithm that personalizes défis, events,
> quizzes, friend suggestions and avatar messages for each teen.
> Cross-references whitepaper §7 (quiz), §8 (avatar coach), §11 (gamification),
> §15 (academic), §17 (social graph) and §29 (invariants — esp. invariant 9
> "no quiz repeats inside 7 days").
>
> **Date**: 2026-05-07. **Project DB**: `imchornjvmgmaovhypco`.
> **Audience**: implementation agents (Sprint 1 starts after this lands).
>
> Status of the platform today (verified live): `teen_behavioral_profile` 0
> rows, `content_recommendations` 0 rows, `adaptive_learning_tracker` 0 rows,
> `quiz_attempts` 0 rows, `friendships` 0 rows. The whitepaper has the
> infrastructure; this document fills the missing **algorithm and capture
> loop** that turns it into a retention engine.

---

## 1. The retention thesis

Personalization is the engagement loop, not a feature. Without it the avatar
coach has nothing to say, the daily quiz is `pool[dayIndex % pool.length]`
(see `lib/quiz/server.ts:89-133`), event discovery is a flat list, and the
friend graph collapses to "people from my school". The thesis is the
following minute-long loop:

```
Teen opens app
  → Avatar greets ("Salam Yasmine, t'as 8 min ?")
  → Proposes ONE défi tuned to her affinity scores + time-of-day + friend signal
  → She completes it (XP +20, signal: complete weight=3)
  → Affinity for that tag rises +0.3, neighbour cohort recomputes incrementally
  → She sees "2 amies de ton crew ont aussi terminé" → social proof
  → Crew battle nudge with matched-power opponent
  → Loop next session, slightly harder, same tag family or one novelty pick
```

Every surface in the app — `<AvatarCoach>`, daily quiz card, event tab,
shop offers, friend suggestions, crew matchmaking — calls the same
`recommend_for_teen()` RPC with a different `content_type`. One ranker,
many surfaces. This unifies the product into a single data product and
makes A/B testing the score weights the founder's primary tuning lever.

---

## 2. Profile model — what defines a teen

### 2.1 Static profile (captured at onboarding, mutable)

The live `teens` table today has 12 columns: `id`, `parent_id`,
`first_name`, `last_name`, `pseudo`, `avatar_url`, `date_of_birth`,
`school_type`, `curriculum`, `primary_language`, `created_at`,
`updated_at`. We need:

- `date_of_birth` → derive `age` via `EXTRACT(YEAR FROM age(date_of_birth))`.
- `gender` (TEXT, `male` | `female` | `nonbinary` | `undisclosed`,
  optional) — used only for grouping cohorts, never for content gating.
- `school_type`, `curriculum`, `grade_level` (NEW — must be added; the
  cron in `app/api/cron/generate-daily-content/route.ts:54-58` already
  reads it and crashes today), `primary_language`.
- `city`, `region` (NEW) — geo personalization for events + partner offers.
- **Interests**: a denormalized `teen_interests(teen_id, tag, weight)`
  table populated at onboarding from a 50-tag closed taxonomy
  (Appendix A). Teen picks 5-10. Free-text tags are normalized nightly
  via LLM to canonical tags.
- **Hobbies** (free-text `teen_goals.goal_text` rows, parsed to
  `goal_tag`).
- **Goals** (3-7, e.g. "améliorer en maths", "rencontrer des amis").
  Stored as `teen_goals` rows with priority 1-7.
- **Learning style**: `learning_style` ∈ `{visual, auditory, kinesthetic, reading}`
  on `teens` (NEW column) — captured via a 4-question onboarding mini-quiz.
- **Personality archetype**: `archetype` ∈ `{leader, explorer, creator, socializer}`
  via 5-question quiz; drives avatar tone + content type bias (creator → more
  arts tags, socializer → more group missions).
- **Availability windows**: `availability_pattern` JSONB, e.g.
  `{ "weekday_evening": true, "weekend_morning": true }` — capped
  inference from `engagement_rhythm` once we have data.

### 2.2 Behavioral signals (continuously updated)

For every meaningful interaction, write one row to `behavioral_signals`:

```
(id, teen_id, signal_type, target_type, target_id, weight, metadata, created_at)
```

| signal_type | weight (default) | meaning |
|---|---|---|
| view       | 0.1 | impression on a card |
| click      | 0.5 | tap to open |
| start      | 1.0 | began the activity |
| complete   | 3.0 | finished, success |
| abandon    | -1.0 | quit before complete |
| share      | 1.5 | shared to circle / DM |
| favorite   | 2.0 | tapped favorite / save |
| dismiss    | -0.5 | "not interested" / hide |
| report     | -5.0 | flagged inappropriate |

`target_type` ∈ `{quiz, defi, mission, event, partner_offer, shop_reward,
friend_profile, video, passion_path}`. `target_id` references the
content row. `metadata JSONB` is free-form (e.g. `{ "session_minutes": 8,
"hour_of_day": 19 }`).

Signals roll up nightly into:

- **`affinity_scores`** — `(teen_id, tag, score, updated_at)`. Sliding
  30-day decayed score per tag. Recomputed by the
  `evolve-teen-profiles` cron (§7).
- **`completion_rate`** — by `target_type` and tag, stored in
  `teen_behavioral_profile.completion_rate` (already exists, unused).
- **`engagement_rhythm`** — hour-of-day histogram (24 ints) +
  weekday histogram (7 ints) in `teen_behavioral_profile` JSONB.
- **`streak_health`** — derived from `user_streaks` (`current_streak`,
  `best_streak`, `last_activity_date`); abandonment risk computed as
  `1 - exp(-days_since_last/3)`.
- **`social_temperature`** — `% activities done in group` over
  last 30d. >0.6 → "crew player", <0.2 → "lone wolf".

### 2.3 Friend-graph features

Computed on demand from `friendships`, `circle_members`, `crew_members`:

- `friend_count` — accepted friendships.
- `circle_count`, `crew_size`.
- `friend_overlap[tag]` — count of friends whose top-5 affinity tags
  include this tag.
- `friend_activity_index` — count of friends with at least one signal
  in last 7 days (proxy for "alive crew").
- `socially_coupled_actions` — count of (teen, target_type, target_id)
  events where a friend completed the same item within the prior 24h.
  Used to detect mimicry → boosts `friend_resonance`.

---

## 3. Content tagging model

Every recommendable item carries `tags TEXT[]` plus type-specific
metadata. Migration 051 adds `tags` to:

- `educational_quizzes` (already has `subject`, `difficulty`, `grade_level`,
  `school_type`, `curriculum`, `language`).
- `physical_challenges` — add `intensity ∈ {low,med,high}`,
  `social ∈ {solo,duo,crew}`, `est_minutes`, `equipment_needed BOOLEAN`.
- `mission_templates` (has `mission_type`, `category`, `xp_reward`,
  `difficulty`, `season`) — add `tags`, `est_minutes`, `social`.
- `events` — add `tags`, ensure `age_min`, `age_max`, `city`, `timing`,
  `social_size_min`, `social_size_max`, `partner_type`.
- `partner_offers` — add `tags`, `partner_type`, `discount_pct`,
  `partner_city`, `valid_until`, `cashback_xp`.
- `shop_rewards` — add `tags`, `reward_type`, `partner_type`, `xp_cost`.
- `passion_paths` (live, has dedicated levels + tutorials) — add `tags`.

Tags use the **closed taxonomy** in Appendix A (50 entries). Free-text
content (mission descriptions, quiz titles) is tagged by an LLM nightly
job (`tag-normalize` cron) which maps to canonical tags only — anything
unmappable is sent to admin review.

Indexing: `CREATE INDEX idx_<table>_tags_gin ON <table> USING GIN(tags);`
on every recommendable table to keep tag filtering O(log n).

---

## 4. Scoring algorithm — hybrid recommender

For each (teen, candidate item) the scorer computes:

```
score(teen, item) =
    w1 * affinity_match(teen.affinity, item.tags)
  + w2 * collaborative_signal(teen, item)
  + w3 * friend_resonance(teen, item)
  + w4 * novelty_bonus(teen, item)
  + w5 * context_fit(teen.now, item)
  + w6 * difficulty_fit(teen.level, item.difficulty)
  - p1 * recently_seen_penalty(teen, item)
  - p2 * friend_already_did_penalty(teen, item)   // group activities only
  - p3 * difficulty_mismatch_penalty
```

Default weights (per `content_type`, tunable via `recommendation_weights`
config table):

| content_type | w1 affin | w2 collab | w3 friend | w4 novelty | w5 ctx | w6 diff | p1 seen | p2 fr_did | p3 diffmm |
|---|---|---|---|---|---|---|---|---|---|
| quiz   | 0.30 | 0.15 | 0.05 | 0.10 | 0.15 | 0.25 | 0.50 | 0.00 | 0.30 |
| defi   | 0.30 | 0.10 | 0.20 | 0.10 | 0.15 | 0.15 | 0.40 | 0.00 | 0.20 |
| event  | 0.25 | 0.10 | 0.30 | 0.15 | 0.20 | 0.00 | 0.20 | 0.05 | 0.00 |
| offer  | 0.40 | 0.10 | 0.05 | 0.15 | 0.20 | 0.00 | 0.30 | 0.00 | 0.00 |
| friend | 0.20 | 0.30 | 0.40 | 0.05 | 0.05 | 0.00 | 0.50 | 0.00 | 0.00 |
| reward | 0.35 | 0.10 | 0.05 | 0.20 | 0.20 | 0.00 | 0.20 | 0.00 | 0.00 |

### 4.1 affinity_match
```
affinity_match(teen_tags, item_tags) =
  sum(teen.affinity_scores[t] for t in item_tags) / max(len(item_tags), 1)
```
`affinity_scores` is normalized so the max per teen is 1.0 after each
nightly recompute, keeping the term in [0, 1].

### 4.2 collaborative_signal — "teens like me also did X"
```
neighbours = top_k(50, by cosine_similarity(teen.affinity_vec, other.affinity_vec))
collaborative_signal(teen, item) =
  sum(1 if signal(neighbour, complete, item) else 0 for neighbour in neighbours) / 50
```
`affinity_vec` is the 50-element vector indexed by canonical tag (Appendix A).
Cosine sim on vectors is recomputed nightly into `teen_neighbours` (top 50
per teen). Cold-start fallback: if teen has <5 signals total, return 0.

### 4.3 friend_resonance
```
close_friends = friends where friendship_level >= 'close' or is_best_friend
recent = signals (close_friend, complete, item) in last 7 days
score = 0
score += 0.30 if any(recent)
score += 0.50 if count(recent) >= 2
score += 0.20 if any circle/crew co-member is currently doing it (live activity)
score += 0.10 if any friend favorited it
return min(score, 1.0)
```

### 4.4 novelty_bonus
```
score = 0
score += 0.20 if no signal on item.tags[*] in last 30 days  (exploration)
score += 0.10 if item.partner_id is one the teen has never bought from
score += 0.10 if item is in the bottom 30% of teen's tag-set (force diversity)
return min(score, 1.0)
```

### 4.5 context_fit
```
score = 0
if item.est_minutes <= teen.attention_span_minutes: score += 0.30
hour = now.hour
if engagement_rhythm.hour_hist[hour] is in top 4 hours of teen: score += 0.20
if today completes a streak day target (per user_streaks): score += 0.40
if availability_pattern matches now (weekday_evening etc): score += 0.10
return min(score, 1.0)
```

### 4.6 difficulty_fit
```
target_level = teen.level + small_uplift  // small_uplift = 0.5 typically
sigma = 1.0
fit = exp(-((item.difficulty_level - target_level)^2) / (2 * sigma^2))
return fit  // already in [0, 1]
```
`item.difficulty_level` maps `easy=1, medium=2, hard=3, expert=4` for content
types using string difficulty.

### Penalties

- **`recently_seen_penalty`**: if last `view` or `start` on item < 24h ago
  → 1.0; linear decay to 0 over 7 days. **Whitepaper §29 invariant 9**:
  for `quiz` content_type, penalty is hard-capped at 1.0 for any item
  surfaced in last 7 days (effectively excluded).

- **`friend_already_did_penalty`**: applies only to events / live group
  défis where freshness matters. -0.10 per friend who already attended
  (caps at -0.30).

- **`difficulty_mismatch_penalty`**: `(1 - difficulty_fit) * scaling`
  where scaling = 1.0 for quiz/defi, 0.0 for offers/events.

### Final selection

After scoring, sort descending, apply:
1. **Hard filters** (do BEFORE scoring to save compute):
   - language match: `item.language ∈ {teen.primary_language, 'multi'}`.
   - age gate: `teen.age between item.age_min and item.age_max`.
   - parental block list: `item.partner_id NOT IN parent_blocks(teen.parent_id)`.
   - quiz invariant 9: not in `quiz_attempts` of last 7 days for this teen.
2. **Diversity injection** (Maximal Marginal Relevance):
   - Pick top-1, then for #2..N penalize by `0.5 * max_overlap_with_picked.tags`.
   - Guarantees ≥1 of every 5 picks has a tag not in the prior 4.
3. Return top `n` with `recommendation_factors` JSONB explaining each
   contribution, persisted to `content_recommendations` for analytics.

---

## 5. Cold start (no signals yet)

For teens with `total_signals < 5`:

- **No collaborative signal** (w2 set to 0 internally).
- Use static profile only: interests + curriculum + city + age.
- **Boost popular-among-cohort**: cohort = same `school_type` ×
  `grade_level` × `region`. Score uplift = `cohort_completion_rate * 0.3`.
- **Bias toward easy completion**: difficulty_level capped at teen.level
  (no uplift) — build streak first.
- **Bias toward social items**: w3 friend_resonance internally bumped
  to 0.30 (was 0.05/0.20/etc.) to accelerate network effect.
- **Cold-start mission pool**: a subset of `mission_templates` flagged
  with `tags @> ARRAY['cold_start']` — short, easy, high reward, social.

Threshold rises to 20 signals or 7 days, whichever first.

---

## 6. Algorithm by surface (what runs where)

### 6.1 Avatar coach next-défi (§8)

`<AvatarCoach>` (today: `components/teen/dashboard/ai-companion.tsx`,
to be unified with `components/brand/mascot-states.tsx` — see
`docs/vision/avatar-coach.md` §3).

Per render:

1. `recommend_for_teen(teen_id, 'mission', 1)` → top mission_template.
2. Read mood from `time_of_day` × recent activity (`positive` if last
   3 signals were `complete`, `meh` else, `slump` if last
   activity > 48h).
3. LLM call (cached 30 min, key
   `coach:{teen_id}:{date}:{mission_code}`) with prompt:
   *"You are Kai, a {persona_archetype} coach for a {age}-year-old in
   Morocco. Suggest the mission '{mission.title}' to a teen who likes
   {top 3 affinity tags joined}. Mood: {mood}. Output ONE short
   sentence in {primary_language}, max 20 words, no emoji unless mood
   = positive."*
4. Render with mascot expression mapped from mood (positive →
   `celebrating`, meh → `happy`, slump → `confused`).

### 6.2 Daily quiz selector (§7)

Replace `lib/quiz/server.ts:getDailyQuizForTeen` body with:

```ts
const items = await rpc('recommend_for_teen', {
  teen_id, content_type: 'quiz', n: 1,
  filters: {
    grade_level: teen.grade_level,
    school_type: teen.school_type,
    curriculum: teen.curriculum,
    language: teen.primary_language,
  },
})
return items[0]
```

The RPC enforces invariant 9 (no quiz from `quiz_attempts` last 7 days).

### 6.3 Event discovery (§14)

`/api/teen/events` calls
`recommend_for_teen(teen_id, 'event', 5, { city: teen.city })`. UI shows
4 ranked + 1 wildcard (highest novelty_bonus among the next 10).

### 6.4 Partner offer discovery (§6)

`/api/teen/offers` calls `recommend_for_teen(teen_id, 'offer', 8)`.
Score uses w1=0.40 (heavy interest match) + relative discount value:
`discount_value_factor = min(offer.discount_pct / 50, 1.0)` added as a
bonus on top of context_fit.

### 6.5 Friend suggestions (§17)

Replaces `generate_friend_suggestions` RPC (already exists, simplistic).
New RPC `recommend_friends(teen_id, n=10)` scores candidates as:

```
score = 0.30 * (school_overlap)         // same school+grade=1.0, school=0.5
      + 0.20 * (city_overlap)
      + 0.30 * (interest_overlap)        // jaccard(my_tags, their_tags)
      + 0.20 * (mutual_friends_score)    // tanh(count / 5)
filter:
  - exclude if blocked or self
  - exclude if already friends or pending request
  - apply parental block list
```

### 6.6 Crew battle matchmaking

`recommend_crew_opponent(crew_id)` ranks candidates by:
- `power_balance`: `1 - |my_total_xp - their_total_xp| / my_total_xp`
  (closer to 1 = more balanced; require ≥ 0.85).
- `recency_avoidance`: -1.0 if same opponent in last 14 days.
- `availability`: their last activity within 7 days.

Returns top crew where `power_balance ≥ 0.85`.

---

## 7. Profile evolution — the learning loop

Two clocks run.

### 7.1 Nightly cron `evolve-teen-profiles`

Vercel cron at 03:30 Africa/Casablanca daily. SQL+pgvector pseudo:

1. **Aggregate** last 24h `behavioral_signals` per (teen_id, tag) into
   `affinity_scores_delta`. Each tag in `target.tags` receives
   `signal.weight / max(target.tags.length, 1)`.
2. **Decay**: `score := score * 0.95^days_since_last_update + delta`.
   Floor scores at 0; clip top-10 per teen at 1.0 (normalize).
3. **Recompute neighbours**: per teen, compute cosine similarity to all
   other teens with ≥10 signals; persist top-50 to `teen_neighbours`.
   (Use pgvector once it's enabled — `CREATE EXTENSION vector;`. Until
   then, do it in app code in batches of 200.)
4. **Snapshot** `teen_behavioral_profile`: rebuild
   `engagement_rhythm`, `completion_rate`, `attention_span_minutes`,
   `best_subject`, `struggling_subject`, `preferred_content_types`.
5. **Tag normalization** sub-job: any free-text tag from goals or
   user-generated content not in Appendix A → LLM map to canonical or
   queue for admin review.

Target runtime budget: ≤ 90s for first 10k teens (simple cosine in
50-dim is cheap), then move to pgvector index when count > 10k.

### 7.2 Per-action live updates (in-flight, fast)

| Action                | Live mutation |
|---|---|
| `complete_quiz`       | +3 to `subject` affinity, +1 to `language`, write `behavioral_signals(complete, quiz, ..., 3.0)` |
| `abandon_quiz`        | -1 to `subject`, signal `abandon`, log `metadata.last_question_index` |
| `complete_mission`    | +3 to each `mission.tags[*]`, signal `complete` |
| `add_friend`          | trigger neighbour-cohort recompute (debounced 5 min) for both teens |
| `buy_offer`           | +2 to `offer.partner_type`, +3 to each `offer.tags[*]`, signal `complete` weight 3 |
| `dismiss_card`        | -0.5 to each `item.tags[*]`, signal `dismiss` weight -0.5 |
| `attend_event`        | +3 to each `event.tags[*]`, signal `complete` |
| `streak_break`        | -0.2 to all top-5 affinity tags (slight cooling, not punitive) |

All mutations go through a single RPC `record_signal` so weights are
consistent and a single audit trail exists.

---

## 8. Schema additions (migration 051)

```sql
-- ===== migration 051_personalization_engine.sql =====

-- Static interest declarations (onboarding)
CREATE TABLE IF NOT EXISTS public.teen_interests (
  teen_id     UUID NOT NULL REFERENCES public.teens(id) ON DELETE CASCADE,
  tag         TEXT NOT NULL,
  weight      NUMERIC(4,2) NOT NULL DEFAULT 1.0,
  declared_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (teen_id, tag)
);
CREATE INDEX idx_teen_interests_tag ON public.teen_interests(tag);

-- Self-declared goals
CREATE TABLE IF NOT EXISTS public.teen_goals (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teen_id     UUID NOT NULL REFERENCES public.teens(id) ON DELETE CASCADE,
  goal_text   TEXT NOT NULL,
  goal_tag    TEXT,                         -- canonical tag from Appendix A
  priority    INT  NOT NULL DEFAULT 3,      -- 1..7
  is_active   BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_teen_goals_teen ON public.teen_goals(teen_id, is_active);

-- Raw signal log (append-only)
CREATE TABLE IF NOT EXISTS public.behavioral_signals (
  id          BIGSERIAL PRIMARY KEY,
  teen_id     UUID NOT NULL REFERENCES public.teens(id) ON DELETE CASCADE,
  signal_type TEXT NOT NULL,
  target_type TEXT NOT NULL,
  target_id   UUID,
  weight      NUMERIC(4,2) NOT NULL,
  metadata    JSONB NOT NULL DEFAULT '{}',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_signals_teen_time
  ON public.behavioral_signals (teen_id, created_at DESC);
CREATE INDEX idx_signals_target
  ON public.behavioral_signals (target_type, target_id);

-- Aggregated affinities (the feature vector)
CREATE TABLE IF NOT EXISTS public.affinity_scores (
  teen_id     UUID NOT NULL REFERENCES public.teens(id) ON DELETE CASCADE,
  tag         TEXT NOT NULL,
  score       NUMERIC(8,4) NOT NULL DEFAULT 0,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (teen_id, tag)
);

-- Top-50 neighbours per teen
CREATE TABLE IF NOT EXISTS public.teen_neighbours (
  teen_id      UUID NOT NULL REFERENCES public.teens(id) ON DELETE CASCADE,
  neighbour_id UUID NOT NULL REFERENCES public.teens(id) ON DELETE CASCADE,
  similarity   NUMERIC(5,4) NOT NULL,
  computed_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (teen_id, neighbour_id),
  CHECK (teen_id <> neighbour_id)
);
CREATE INDEX idx_neighbours_sim
  ON public.teen_neighbours (teen_id, similarity DESC);

-- Tunable weights (founder dashboard / A-B test)
CREATE TABLE IF NOT EXISTS public.recommendation_weights (
  content_type TEXT PRIMARY KEY,
  w1 NUMERIC(4,2), w2 NUMERIC(4,2), w3 NUMERIC(4,2),
  w4 NUMERIC(4,2), w5 NUMERIC(4,2), w6 NUMERIC(4,2),
  p1 NUMERIC(4,2), p2 NUMERIC(4,2), p3 NUMERIC(4,2),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Extend teens with personalization columns
ALTER TABLE public.teens
  ADD COLUMN IF NOT EXISTS gender TEXT,
  ADD COLUMN IF NOT EXISTS grade_level TEXT,
  ADD COLUMN IF NOT EXISTS city TEXT,
  ADD COLUMN IF NOT EXISTS region TEXT,
  ADD COLUMN IF NOT EXISTS learning_style TEXT,
  ADD COLUMN IF NOT EXISTS archetype TEXT,
  ADD COLUMN IF NOT EXISTS availability_pattern JSONB DEFAULT '{}'::jsonb;

-- Tags on every recommendable entity
ALTER TABLE public.educational_quizzes  ADD COLUMN IF NOT EXISTS tags TEXT[];
ALTER TABLE public.physical_challenges  ADD COLUMN IF NOT EXISTS tags TEXT[];
ALTER TABLE public.mission_templates    ADD COLUMN IF NOT EXISTS tags TEXT[];
ALTER TABLE public.events               ADD COLUMN IF NOT EXISTS tags TEXT[];
ALTER TABLE public.partner_offers       ADD COLUMN IF NOT EXISTS tags TEXT[];
ALTER TABLE public.shop_rewards         ADD COLUMN IF NOT EXISTS tags TEXT[];
ALTER TABLE public.passion_paths        ADD COLUMN IF NOT EXISTS tags TEXT[];

CREATE INDEX IF NOT EXISTS idx_quizzes_tags     ON public.educational_quizzes USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_challenges_tags  ON public.physical_challenges USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_missions_tags    ON public.mission_templates USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_events_tags      ON public.events USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_offers_tags      ON public.partner_offers USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_rewards_tags     ON public.shop_rewards USING GIN(tags);

-- Seed default weights (matches §4 table)
INSERT INTO public.recommendation_weights VALUES
  ('quiz',  0.30,0.15,0.05,0.10,0.15,0.25,0.50,0.00,0.30,NOW()),
  ('defi',  0.30,0.10,0.20,0.10,0.15,0.15,0.40,0.00,0.20,NOW()),
  ('event', 0.25,0.10,0.30,0.15,0.20,0.00,0.20,0.05,0.00,NOW()),
  ('offer', 0.40,0.10,0.05,0.15,0.20,0.00,0.30,0.00,0.00,NOW()),
  ('friend',0.20,0.30,0.40,0.05,0.05,0.00,0.50,0.00,0.00,NOW()),
  ('reward',0.35,0.10,0.05,0.20,0.20,0.00,0.20,0.00,0.00,NOW())
ON CONFLICT (content_type) DO NOTHING;
```

RLS policies (enabled on all new tables):
- `teen_interests`, `teen_goals`, `affinity_scores`, `teen_neighbours`,
  `behavioral_signals`: SELECT/INSERT/UPDATE only when
  `auth.uid() = teen_id`. Service role bypasses.
- `recommendation_weights`: SELECT to all authenticated, INSERT/UPDATE
  admin only.

---

## 9. RPC + API surface

### 9.1 `recommend_for_teen(teen_id, content_type, n, filters)`
Returns ranked items with explanation:
```sql
RETURNS TABLE (
  content_id UUID,
  score NUMERIC,
  factors JSONB,    -- { affinity: 0.4, friend: 0.2, ... }
  rank INT
)
```
Internally:
1. Pull `affinity_scores`, `teen_neighbours`, `engagement_rhythm`,
   `user_streaks`, parental block list.
2. Pull candidates from the type-specific table with hard filters.
3. Compute score per candidate (formulas §4).
4. Apply MMR diversity, return top N.
5. Persist row to `content_recommendations` for analytics
   (`recommendation_factors` JSONB).

### 9.2 `record_signal(teen_id, signal_type, target_type, target_id, weight, metadata)`
Inserts one `behavioral_signals` row, then triggers live affinity update
inline (cap: 50 ms p95).

### 9.3 `update_affinity_scores(teen_id)`
Full recompute for one teen. Used by:
- Onboarding completion (initialize from `teen_interests`).
- Cron `evolve-teen-profiles`.
- Admin "rebuild profile" debug action.

### 9.4 `find_neighbours(teen_id, k)`
Returns top-k similar teens by cosine similarity. Reads from
`teen_neighbours` (already-cached) by default; pass `force_recompute=true`
to recompute on the fly (slow; admin-only).

### 9.5 `recommend_friends(teen_id, n)`
Friend-specific scorer (§6.5).

### 9.6 HTTP endpoints
- `GET /api/teen/recommendations?type={quiz|defi|event|offer|reward}&n=5`
  thin wrapper around `recommend_for_teen`. The endpoint at
  `app/api/teen/recommendations/route.ts` already exists (called by
  `components/teen/dashboard/ai-companion.tsx`); rewrite to call the new RPC.
- `POST /api/teen/signal` body `{ signal_type, target_type, target_id, weight? }` →
  `record_signal`. Hot-path called by every teen client surface.
- `GET /api/teen/recommend-friends?n=10` → `recommend_friends`.

---

## 10. Onboarding capture

Whitepaper §19 "first-run flow" gains 3 short steps after profile
basics (post-`first_name`/`last_name`/`date_of_birth`/`pseudo`),
inserted in `components/onboarding/teen-setup-step.tsx`:

### Step A — "What are you into?" (chip selector)
- Grid of 30 most popular tags from Appendix A (filtered by typical
  appeal for age 13-17 — drop e.g. `lifestyle_finance`).
- Teen picks 5-10. Saves rows to `teen_interests` with weight 1.0.
- Skip allowed but discouraged (cold-start gets worse).

### Step B — "Your goals this season" (3 free-text + suggestions)
- 3 short text fields with autocomplete from popular `goal_text` values
  (`/api/onboarding/goal-suggestions`).
- LLM-tag-extract on save → write `teen_goals(goal_text, goal_tag)`.

### Step C — "How do you learn best?" (4 picture-cards)
- 4 cards: 📺 visuel / 🎧 audio / 🤸 par l'action / 📖 lecture.
- One-tap save to `teens.learning_style`.

A second 5-question archetype quiz can be layered later
(`teens.archetype`) but is non-blocking.

---

## 11. Avatar coach integration (§8)

The unified `<AvatarCoach>` component (replaces today's split between
`components/brand/mascot-states.tsx` and
`components/teen/dashboard/ai-companion.tsx`):

```ts
async function renderAvatarCoach({ teenId }: Props) {
  const [mission] = await rpc('recommend_for_teen', {
    teen_id: teenId, content_type: 'mission', n: 1,
  })
  const mood = await getTeenMood(teenId)         // helper, reads recent signals
  const persona = await getTeenPersona(teenId)   // archetype + age + lang
  const cached = await kv.get(`coach:${teenId}:${today}:${mission.code}`)
  const message = cached ?? await llmCompose({
    persona, mission, mood,
    interests_top3: persona.topAffinityTags.slice(0, 3),
    lang: persona.language,
  })
  await kv.setex(`coach:${teenId}:${today}:${mission.code}`, 1800, message)
  return { mission, mood, message, mascot: moodToMascotState(mood) }
}
```

Mascot state mapping: `positive → celebrating`, `meh → happy`,
`slump → confused`, `streak_break → sad`. Mood derived from last 3
signal types + time since last activity, no LLM call.

---

## 12. Cold-start specifics (Day 1 teen)

| Surface | Day 1 behaviour |
|---|---|
| Avatar coach | Suggests a `tags @> ['cold_start']` mission, easy, social, ≤ 10 min |
| Daily quiz | Easiest quiz matching `grade_level` × `school_type` × `language`; if none, fall back to one tier easier |
| Events | City + age + closest 7 days. No friend-resonance term. |
| Friends | Same school first; if none in DB, same `region` + same `grade_level` |
| Offers | Top-3 popular partners in city (cohort completion rate) |
| Shop | Cheapest unlocks first to seed first XP-spend signal |

Cold-start ends when `total_signals >= 20` OR `account_age_days >= 7`.

---

## 13. Privacy, fairness, anti-manipulation

- **Friend graph signals**: surfaces only "X friends did this", never
  who. `friend_resonance` exposes counts not IDs to the UI.
- **Parental controls**: respect `parental_blocks` (partners, contacts).
  Block list intersects with `recommend_for_teen` candidate set BEFORE
  scoring. Blocked content is silently filtered, never explained.
- **Anti-addictive caps**:
  - Notifications driven by recommender capped at 3/day per teen.
  - Streak-loss messaging never uses guilt language; coach pivot to
    "encourage" tone after a streak break.
  - Time-based rate-limit on `record_signal(view)` to prevent
    pixel-spam from inflating scores (10/min hard cap).
- **Diversity injection**: ≥1 of every 5 recommendations carries a
  novelty tag (`novelty_bonus > 0.3`).
- **Fairness monitoring**: weekly job logs per-(school_type × gender ×
  region) demographic breakdown of recommendation acceptance to
  `recommendation_fairness_log`. If any cohort's acceptance is < 50%
  of the median, flag in admin dashboard.
- **Manipulation defense**: weight on `share` and `favorite` is capped
  per teen per day (≤ 5 each) to stop friends from gaming each other's
  affinity.
- **No PII in tags**: tag taxonomy is closed (Appendix A) and avoids
  protected attributes (no religion, no political, no health-status tags).

---

## 14. Metrics + observability

Persist to `recommendation_metrics_daily`:

- **Acceptance rate**: `clicks / impressions` per content_type per day.
- **Completion rate of recommended items**: `completes / clicks`.
- **Per-tag accuracy**: when a `tag` was the dominant factor, did the
  teen complete? Persist precision per tag weekly.
- **Cohort engagement curve**: D1/D7/D30 retention by `archetype` ×
  `school_type`.
- **Diversity index**: Shannon entropy of tag distribution across each
  teen's last 50 recommendations. Target ≥ 2.5 nats.
- **Cold-start time**: median time-to-20-signals.
- **Friend resonance lift**: A/B `w3=0` vs `w3=default` weekly cohort
  compare on completion rate.

Logs stream to Supabase `realtime.recommendation_events` for the admin
dashboard, with 30-day retention.

---

## 15. Implementation roadmap (3 sprints)

### Sprint 1 — Capture + storage (1 week)
- Apply migration 051 (schema, weights seed, indexes).
- Add Onboarding Step A (interests chip selector) +
  `/api/onboarding/interests` writer.
- Add Onboarding Step C (learning style).
- Implement `record_signal` RPC + `POST /api/teen/signal`.
- Wire signal capture in 5 hot paths:
  `quiz/submit`, `mission/complete`, `event/book`, `offer/redeem`,
  card-`view` impressions.
- Tag the seed `educational_quizzes` (9 rows) and
  `mission_templates` (30 rows) manually using Appendix A.

### Sprint 2 — Scoring + cron (1 week)
- Implement `recommend_for_teen` RPC with affinity-only score
  (w2/w3 set to 0 initially — neighbours not yet computed).
- Implement `update_affinity_scores` and the
  `evolve-teen-profiles` Vercel cron (runs at 03:30
  Africa/Casablanca daily).
- Replace `getDailyQuizForTeen` body
  (`lib/quiz/server.ts:89-133`) with the RPC call. Enforce
  invariant 9 in the RPC (whitepaper §29).
- Wire `<AvatarCoach>` to `recommend_for_teen('mission', 1)` in
  place of the hard-coded greet line in
  `components/teen/dashboard/ai-companion.tsx`.

### Sprint 3 — Neighbours + avatar polish (1 week)
- Implement `find_neighbours` RPC (cosine in app code, ≤ 10k teens).
- Turn on w2/w3 weights, A/B vs Sprint 2 baseline.
- Add `recommend_friends` to replace
  `generate_friend_suggestions`; wire into
  `app/teen/friends/page.tsx`.
- Crew battle matchmaker `recommend_crew_opponent` on
  `crews` page.
- Persist `recommendation_metrics_daily` and admin dashboard
  cards.
- (Stretch) Enable `vector` extension and migrate neighbour
  computation to pgvector.

After Sprint 3 the engine is production-shaped. Subsequent work
focuses on tuning weights, refreshing the closed taxonomy, and
adding type-specific signals (e.g. video watch-time as a
non-binary signal).

---

## Appendix A — Closed interest taxonomy (50 tags)

Tags use lowercase snake_case, prefixed by macro-category. **Exactly 50 tags**.
Free-text input is normalized to one of these by the nightly
`tag-normalize` cron; anything unmappable goes to admin review.

### Sport (8)
1. `sport_football`
2. `sport_basketball`
3. `sport_running`
4. `sport_combat` (boxe, karaté, judo, MMA)
5. `sport_water` (natation, surf, plongée)
6. `sport_outdoor` (rando, vélo, escalade)
7. `sport_dance`
8. `sport_fitness`

### Music (5)
9. `music_rap`
10. `music_pop`
11. `music_electronic`
12. `music_traditional` (gnawa, chaabi, andalou)
13. `music_instrument` (jouer d'un instrument)

### Art & Création (6)
14. `art_drawing`
15. `art_photography`
16. `art_video` (filmer, monter, TikTok-style)
17. `art_writing` (poésie, blogging, fanfic)
18. `art_design` (graphisme, mode)
19. `art_crafts` (DIY, bricolage)

### Tech (5)
20. `tech_coding`
21. `tech_gaming` (jeux vidéo)
22. `tech_robotics`
23. `tech_ai` (curiosité IA)
24. `tech_hardware` (PC, consoles)

### Science (4)
25. `science_astronomy`
26. `science_biology` (animaux, nature)
27. `science_physics_chem`
28. `science_environment` (écologie, climat)

### Académique (5)
29. `academic_math`
30. `academic_languages` (FR/AR/EN/ES)
31. `academic_history`
32. `academic_geography`
33. `academic_philosophy`

### Social (4)
34. `social_meet_friends`
35. `social_group_play`
36. `social_volunteer`
37. `social_leadership`

### Lifestyle (5)
38. `lifestyle_food` (cuisine, manger)
39. `lifestyle_fashion`
40. `lifestyle_travel`
41. `lifestyle_finance` (apprendre l'argent)
42. `lifestyle_wellness` (bien-être, méditation)

### Gaming (3)
43. `gaming_competitive` (esport)
44. `gaming_casual`
45. `gaming_streaming`

### Nature & Animaux (2)
46. `nature_animals`
47. `nature_outdoor_adventure`

### Cold-start / system (3)
48. `cold_start` (curated Day-1 items)
49. `popular_local` (top-rated in teen's city)
50. `staff_pick` (admin-curated highlight)

The taxonomy is **versioned** in `recommendation_weights.tag_taxonomy_version`.
Adding a tag requires migration + admin approval — never silent expansion.

---

## Appendix B — Files & tables touched

### Existing code touched (refactor)
- `C:\Users\Shadow\Desktop\NIVY\lib\quiz\server.ts` (`getDailyQuizForTeen` body)
- `C:\Users\Shadow\Desktop\NIVY\app\api\teen\quiz\daily\route.ts`
- `C:\Users\Shadow\Desktop\NIVY\app\api\teen\quiz\submit\route.ts` (emit `record_signal`)
- `C:\Users\Shadow\Desktop\NIVY\app\api\teen\recommendations\route.ts`
- `C:\Users\Shadow\Desktop\NIVY\app\api\agent\action\route.ts` (Kai grounded on RPC)
- `C:\Users\Shadow\Desktop\NIVY\components\teen\dashboard\ai-companion.tsx`
- `C:\Users\Shadow\Desktop\NIVY\components\brand\mascot-states.tsx` (mood-driven state)
- `C:\Users\Shadow\Desktop\NIVY\components\onboarding\teen-setup-step.tsx`
- `C:\Users\Shadow\Desktop\NIVY\app\teen\friends\page.tsx`
- `C:\Users\Shadow\Desktop\NIVY\lib\ai\interest-integration.ts` (consume `affinity_scores`)
- `C:\Users\Shadow\Desktop\NIVY\lib\ai\intelligent-content-engine.ts` (read profile from new tables)
- `C:\Users\Shadow\Desktop\NIVY\app\api\cron\generate-daily-content\route.ts` (fix col list)

### New files (Sprint 1-3)
- `C:\Users\Shadow\Desktop\NIVY\gamification-system\database\migrations\051_personalization_engine.sql`
- `C:\Users\Shadow\Desktop\NIVY\gamification-system\database\migrations\052_recommend_rpcs.sql`
- `C:\Users\Shadow\Desktop\NIVY\app\api\teen\signal\route.ts`
- `C:\Users\Shadow\Desktop\NIVY\app\api\teen\recommend-friends\route.ts`
- `C:\Users\Shadow\Desktop\NIVY\app\api\cron\evolve-teen-profiles\route.ts`
- `C:\Users\Shadow\Desktop\NIVY\components\teen\AvatarCoach.tsx` (unified)
- `C:\Users\Shadow\Desktop\NIVY\lib\reco\score.ts` (TypeScript shadow of the SQL formulas, for unit tests)

### Live DB tables verified during audit (project `imchornjvmgmaovhypco`)
- `teens` (12 cols, `grade_level` missing — added by 051)
- `teen_behavioral_profile` (23 cols, 0 rows — feature exists, never populated)
- `content_recommendations` (13 cols, 0 rows — will start filling Sprint 2)
- `adaptive_learning_tracker` (14 cols, 0 rows)
- `educational_quizzes` (22 cols, 9 rows seeded; `tags` missing — added by 051)
- `mission_templates` (22 cols, 30 rows seeded; `tags` missing)
- `friendships` (14 cols, 0 rows — `friend_resonance` source)
- `circle_members`, `crew_members` — friend-graph features source
- `user_streaks` — `streak_health` source
- `quiz_attempts` (0 rows — seen-history source for invariant 9)
- Existing RPCs: `calculate_teen_behavioral_profile`,
  `generate_friend_suggestions`, `add_xp_to_user`,
  `send_friend_request`, `accept_friend_request`, `are_friends`,
  `get_mutual_friends_count`.

### Whitepaper + audits cross-referenced
- `C:\Users\Shadow\Desktop\NIVY\docs\vision\PRODUCT_WHITEPAPER.md` (§7, §8, §11, §15, §17, §29)
- `C:\Users\Shadow\Desktop\NIVY\docs\vision\quiz-ai.md` (Gap 1: dayIndex rotation)
- `C:\Users\Shadow\Desktop\NIVY\docs\vision\avatar-coach.md` (KAI ↔ panda unification)
- `C:\Users\Shadow\Desktop\NIVY\docs\vision\social-graph.md` (friend / circle / crew shapes)
- `C:\Users\Shadow\Desktop\NIVY\docs\vision\ai-content.md` (provider abstraction, validators)
- `C:\Users\Shadow\Desktop\NIVY\docs\vision\onboarding-flows.md` (teen setup step host)
- `C:\Users\Shadow\Desktop\NIVY\docs\vision\quest-cadence.md` (mission_templates feed)
- `C:\Users\Shadow\Desktop\NIVY\docs\vision\events-lifecycle.md` (event recommender feed)
- `C:\Users\Shadow\Desktop\NIVY\docs\vision\partner-network.md` (offers + cashback feed)
