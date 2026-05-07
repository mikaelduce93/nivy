# Content Creator Economy — Teen-Generated Content, XP, Featured Status

Audit date: 2026-05-07. Read-only audit by content-creator-economy-auditor against active Supabase project `imchornjvmgmaovhypco` and the working tree at `C:\Users\Shadow\Desktop\NIVY`.

## 1. Vision recap (what we want)

Nivy treats teens not only as consumers of quests and events but as **creators**. The intended creator economy has five content modes, all earning XP and visibility:

- **Photo / video défis** — parkour clips, dance reels, art shots tied to physical or creative challenges, with peer voting.
- **Stories** — first-person adventures (visiting a partner venue, completing a sport accomplishment, attending an event), free-form text + media.
- **Tutorials** — how to solve a math problem, a code-review walkthrough, a chess opening — academic and skill-share content.
- **Reviews** — partner offers, events, restaurants, transport providers — feeding the marketplace and partner network with social proof.
- **Live events** (V2 candidate) — sport competitions, live performances, ambassador broadcasts.

The reward layers stack:
- **Posting reward** — a small, one-per-day XP grant (10 XP) so the action of creating is itself rewarded but not farmable.
- **Engagement reward** — XP credited to the creator from peers' likes, comments, shares, with daily caps to defeat collusion farming.
- **Featured status** — a moderator-chosen weekly highlight that earns a large XP + coin bonus and surfaces the post in `/teen/feed` for everyone in the country.
- **Top creators of the month** — ranked across categories, invited to exclusive partner events and given a Niv-shoutout.
- **Sponsored posts** (V2) — partners pay creators directly for branded content, plugged into the partner network.

This is the **soft-side gamification**: it gives teens a creative outlet, gives Nivy organic UGC, and feeds the personalization engine (§19.5) with content it can rank per teen.

## 2. What is implemented today

The plumbing is mostly there — at the table level. The product surface is almost completely missing.

**Feed schema is rich but empty.** Live tables in the public schema include `feed_posts`, `feed_likes`, `feed_comments`, `feed_shares`, `feed_views`, `feed_bookmarks`, `feed_mentions`, `feed_muted_users`, `activity_feed_preferences`, `hidden_posts`, `post_hashtags`, plus `moderation_queue`, `share_card_templates`, `generated_share_cards`, and `special_challenge_submissions`. Live row counts: every single one of these is at **0** rows. The schema landed via migration `gamification-system/database/migrations/035_social_feed.sql` and `037_social_shares.sql`; nothing has populated it.

**`feed_posts` is the would-be `creator_submissions`.** The columns are: `id`, `user_id`, `post_type` (varchar), `content`, `media_urls` (jsonb), `metadata` (jsonb), `reference_type`, `reference_id`, `visibility` (varchar), `circle_id`, `likes_count`, `comments_count`, `shares_count`, `views_count`, `is_pinned`, `is_hidden`, `reported_count`, `created_at`, `updated_at`. Strengths: media + metadata as jsonb (extensible), visibility scoping including `circle_id`, denormalised counters, `reference_type`/`reference_id` to attach a post to a quest, event, or partner. Gaps vs. vision: no enum constraint on `post_type` (drift risk), no `category`, no `status` lifecycle (`draft`/`pending_moderation`/`published`/`rejected`), no `moderation_id` FK, no `featured`/`featured_at`, no `xp_earned` on the post itself, no `related_partner_id`/`related_event_id`/`related_quest_id` typed columns (only the polymorphic `reference_type/reference_id` pair).

**RPC layer exists.** Postgres functions present: `create_feed_post`, `get_personalized_feed`, `get_activity_feed`, `toggle_post_like`, `add_feed_comment`, `get_post_comments`, `vote_on_submission`. The `/api/teen/feed` route (`app/api/teen/feed/route.ts:32`) calls `get_personalized_feed(p_user_id, p_limit, p_offset, p_filter)` — which means a personalisation hook is already plumbed at the SQL boundary, ready to take signals from `behavioral_signals` / §19.5.

**Moderation queue is generic, not creator-specific.** `moderation_queue` has `id, content_type, content_id, payload, status, reviewed_by, reviewed_at, reason, created_at`. It is the shared queue for any moderated content (whitepaper §18). There is no enqueue path from `feed_posts` to it today — no trigger, no API call. A creator submission cannot reach moderators.

**`special_challenge_submissions` is a parallel, narrower system.** Columns: `challenge_id`, `user_id`, `submission_type`, `content`, `image_url`, `thumbnail_url`, `answers` (for quizzes), `score`, `latitude/longitude/accuracy_meters` (geo-proof), `is_validated`, `validated_at`, `validated_by`, `rejection_reason`, `vote_count`, `time_taken_seconds`, `xp_awarded`. This handles physical/quiz challenge proof. It is **not the creator feed**: it is challenge-bound, geo-anchored, single-purpose. The vision's photo/video défi belongs partly here (when tied to a challenge) and partly in `feed_posts` (when free-form). Today they do not link.

**Share cards = self-celebration, not creator content.** `share_card_templates` + `generated_share_cards` plus `app/teen/share/page.tsx` and `/api/teen/share/route.ts` implement the "share your achievement to Instagram/Twitter" flow: a canvas-rendered PNG of the teen's level/badge/streak, exported off-platform. This is **outbound bragging**, not inbound UGC. It does not write to `feed_posts`, does not earn XP, does not enter moderation. It is a missed loop: a teen who exports a streak card could equally publish it inside Nivy as a `feed_posts` row.

**`/teen/social` is a hub shell, not a feed.** `app/teen/social/page.tsx` redirects non-teens and renders `<SocialHubClient teenId teenName />`. It is the social-graph hub (friends/circles/crews per `social-graph.md`), not a content feed. `/teen/feed` does not exist as a route. `/teen/create` does not exist. The teen has no UI to compose a post.

**XP/coin economy not wired to feed events.** Searches for "creator", "post xp", "feed reward" return no XP grant on `toggle_post_like` or `create_feed_post`. The economy file (`docs/vision/economy.md`) does not budget creator XP. There is no `creator_engagement` table, no `creator_monthly_stats` rollup, no daily-cap enforcement. Anti-farming ground rules do not exist.

**Voting helper exists, isolated.** `vote_on_submission` RPC supports peer voting on `special_challenge_submissions.vote_count`. There is no equivalent peer-curation helper on `feed_posts` beyond `toggle_post_like`.

**Avatar/Niv integration absent.** The avatar coach (`docs/vision/avatar-coach.md`) does not yet have prompts to invite creation ("Tu viens de finir le défi parkour, partage en photo ?") nor celebration of featured status. No webhook or trigger from `feed_posts.featured=true` to a Niv message.

## 3. Gaps vs. vision

| Vision element | Today | Gap |
| --- | --- | --- |
| Photo/video/story/tutorial/review post types | `feed_posts.post_type` is a free varchar, no enum | Add CHECK constraint with the five types (+ `live_event` for V2) |
| Categorisation (sport/art/tech/academic/food) | None | Add `category` column + filter in `get_personalized_feed` |
| Submission lifecycle (draft → moderation → published → rejected) | `is_hidden` boolean only | Add `status` enum + `moderation_id` FK |
| Moderation queue wired to feed | Generic queue exists, no enqueue path | Trigger: when `visibility='public'` insert into `moderation_queue` with `content_type='feed_post'` |
| Featured status + bonus | None | `featured BOOLEAN`, `featured_at`, admin route `/admin/creator-moderation`, +500 XP +200 coins on flip |
| XP for posting (10/day cap) | None | `award_xp` call inside `create_feed_post`, dedupe per UTC day |
| XP for engagement received (likes 1, comments 2, shares 5) with daily caps | None | New `creator_engagement` ledger table + capped `award_xp` trigger |
| Anti-farming caps (50 likes, 30 comments, 20 shares per day credited) | None | Daily aggregate check against `creator_engagement` |
| Monthly creator leaderboard | None | `creator_monthly_stats` materialised rollup, refreshed nightly |
| Top-10 monthly → exclusive event invite | None | Cron job ranks, calls partner-event invite RPC, sends notification |
| `/teen/create` UI | Absent | New page with media upload, type/category pickers, visibility |
| `/teen/feed` UI | Absent | Algorithmic feed page consuming `get_personalized_feed` |
| `/teen/leaderboard` (creators) | Absent | Period + category filters |
| `/teen/profile/:id` content gallery | Absent | Public-tab gallery of that user's `feed_posts` |
| `/admin/creator-moderation` queue | Generic moderation only | Creator-specific view: approve / reject / feature |
| Image AI scan + text classifier | None | AI-safety hook (§ai-safety-teen-welfare.md) on enqueue |
| Three-strikes suspension | None | New `creator_strikes` table + suspend logic |
| Personalization (§19.5) ranks feed | RPC slot exists (`get_personalized_feed`) | Replace stub ranking with `recommend_for_teen('feed_post')` call |
| Avatar prompts creation / celebrates featured | None | Two new Niv triggers wired to feed events |
| Share-card → inbound publish | Outbound only | Add "Publier sur Nivy aussi ?" toggle on share dialog |
| Sponsored / paid posts (partners) | None | V2 — needs `sponsored_by_partner_id` on submission, ad-disclosure rule |
| Live streaming | None | V2 — separate stream service, RTMP/HLS, moderator co-pilot |
| Cash-out for top creators | None | Tied to ambassador revenue-share model (`docs/vision/ambassador-referral.md`) |
| Anti-bullying: comment moderation, mute/block, report | `feed_muted_users`, `hidden_posts`, `reported_count` exist | Wire to safety pipeline; enforce per-post reporter caps |

## 4. Risks

- **Schema-product mismatch is severe.** A full social-feed schema sitting at zero rows is technical debt that will rot (column drift, RPC drift) before it ships. Every quarter without a creator UI raises the cost of finally turning it on, because adjacent systems (notifications, moderation, XP) keep moving.
- **No moderation enqueue path = legal/safety landmine.** The first time a teen posts a public photo, it goes live with `is_hidden=false`, no human-in-the-loop. For a teen platform in Morocco, that is unacceptable per `docs/vision/ai-safety-teen-welfare.md`.
- **Two parallel content tables (`feed_posts` vs. `special_challenge_submissions`)** with overlapping intent. A photo of a parkour défi could plausibly live in either. Without an explicit join (`feed_posts.reference_type='special_challenge_submission'`), users see fragmentation: their challenge proofs do not appear in their public gallery; their feed posts do not earn challenge XP.
- **No XP cap = farming risk.** The first time a creator system ships without daily caps, two friends will like-bomb each other for a weekend and top the leaderboard. The economy whitepaper has not budgeted creator XP at all, so there is no ceiling on issuance — economy could inflate.
- **Featured power = moderator capture risk.** A "featured" flag worth 500 XP + 200 coins is an attack surface (favouritism, payoff). Needs an audit log (`featured_by`, `featured_reason`) and a rotating multi-moderator approval policy.
- **Personalization stub.** `get_personalized_feed` is called by the API but its current SQL almost certainly returns chronological-or-similar; if the personalization engine (§19.5) does not get plugged in before launch, the feed will feel random and adoption will stall.
- **`is_hidden` is a single bit.** It conflates "moderator removed", "creator unpublished", "auto-hidden by report threshold", and "soft-deleted". Status enum is overdue.
- **Outbound share cards leak teens to Instagram/Twitter without inbound counterpart.** Net result: teens promote Nivy on third-party platforms but cannot promote each other inside Nivy. The creator economy is inverted.
- **No revenue path** in the vision today for top creators. If "top creators of the month" earn only event invites for too long, the platform cannibalises ambassador-tier value (`docs/vision/ambassador-referral.md`).

## 5. Recommendations (prioritised)

**P0 — Stop the schema rot, ship the minimum loop (sprint 1, 1-2 weeks)**

1. Add the missing columns to `feed_posts` rather than creating `creator_submissions`: `category text`, `status text CHECK IN ('draft','pending_moderation','published','rejected','removed') DEFAULT 'draft'`, `moderation_id uuid REFERENCES moderation_queue(id)`, `featured boolean DEFAULT false`, `featured_at timestamptz`, `featured_by uuid`, `xp_earned integer DEFAULT 0`, `related_partner_id uuid`, `related_event_id uuid`, `related_quest_id uuid`. Migrate `post_type` to a CHECK enum (`photo`,`video`,`story`,`tutorial`,`review`,`live_event`).
2. Trigger on `INSERT OR UPDATE` of `feed_posts` where `visibility='public'` AND `status='draft'`: insert a `moderation_queue` row, set `feed_posts.status='pending_moderation'`, set `moderation_id`. On `moderation_queue.status='approved'` flip `feed_posts.status='published'`.
3. Build `/teen/create` and `/teen/feed`. Use `get_personalized_feed` as-is for now.
4. Create `creator_engagement` ledger and wire `award_xp_capped(creator_user_id, action, amount, daily_cap)` from inside `toggle_post_like`, `add_feed_comment`, the share endpoint. Caps: like 50/d, comment 30/d, share 20/d. Posting itself: 10 XP, 1/day.

**P1 — Featured + leaderboard (sprint 2)**

5. Build `/admin/creator-moderation` with approve / reject / feature actions; `feature` flips the boolean, awards 500 XP + 200 coins atomically, writes a `featured_audit_log` row.
6. Materialised view `creator_monthly_stats` refreshed nightly; expose `/api/creator/leaderboard?period=month&category=X`.
7. Cron: end-of-month, top-10 per category get a notification + invite to a partner event (uses partner-network hooks).

**P1 — Wire personalization and avatar (sprint 2-3)**

8. Replace `get_personalized_feed` body with a call into `recommend_for_teen('feed_post', user_id, limit)` once §19.5 lands; until then, blend friend-graph posts + featured + recency.
9. Add Niv triggers: post-quest-complete prompt to share, on-featured celebration, weekly digest of "your post got X likes".

**P2 — Bridge the parallel systems (sprint 3)**

10. When a `special_challenge_submissions` row is `is_validated=true`, optionally cross-post to `feed_posts` with `reference_type='special_challenge_submission'`. Avoids fragmentation.
11. Hook share-card generation: when `generated_share_cards` is created, offer a one-click "publier aussi sur Nivy" that creates a `feed_posts` row.

**P2 — Safety hardening**

12. AI image scan + text classifier on every enqueue (use the existing safety pipeline). Auto-reject NSFW; flag borderline for human.
13. `creator_strikes` table; three rejected/removed posts in 90 days → suspended creator role (can still consume, cannot post).
14. Reporter cap: a single user can report N posts/day to prevent harassment-by-report.

**V2 (later quarters)**

15. Live streaming: separate ingestion service, recorded fallback, moderator co-pilot.
16. Sponsored posts: `sponsored_by_partner_id` + ad-disclosure UI; partner pays through the partner-network billing.
17. Cash-out: top creators move to ambassador track (revenue-share); economy whitepaper has to budget this.

## 6. Open questions

- "Live streaming: in V1 scope or V2?" — strongly recommend V2.
- "Videos: max length, auto-transcription, copyright music check?" — needs product call (default proposal: 60s max, no music in V1).
- "Sponsored posts: when do partners enter the creator economy?" — gate on partner-network V1.5 + ad-disclosure rules per Moroccan teen-platform norms.
- "Profile public vs friends-default for new users?" — recommend friends-default with explicit opt-in to public.
- "Cash-out path for top creators" — same scheme as ambassadors, or a distinct revenue share?
- "Anti-bullying: comment moderation, mute/block, report flow?" — `feed_muted_users` + `hidden_posts` + `reported_count` exist, need to be plumbed end-to-end with a report-review SLA.
- "Should `special_challenge_submissions` and `feed_posts` merge or stay split?" — recommend split + cross-post bridge, not merge.
- "Featured cap: how many per week per country, to avoid moderator capture?" — propose 5/week, audited.

## SPEC

### Data contract — extend `feed_posts` (no rename)

```sql
ALTER TABLE public.feed_posts
  ADD COLUMN IF NOT EXISTS category text,
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft','pending_moderation','published','rejected','removed')),
  ADD COLUMN IF NOT EXISTS moderation_id uuid REFERENCES public.moderation_queue(id),
  ADD COLUMN IF NOT EXISTS featured boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS featured_at timestamptz,
  ADD COLUMN IF NOT EXISTS featured_by uuid,
  ADD COLUMN IF NOT EXISTS xp_earned integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS related_partner_id uuid,
  ADD COLUMN IF NOT EXISTS related_event_id uuid,
  ADD COLUMN IF NOT EXISTS related_quest_id uuid;

ALTER TABLE public.feed_posts
  ADD CONSTRAINT feed_posts_post_type_check
  CHECK (post_type IN ('photo','video','story','tutorial','review','live_event'));

CREATE TABLE IF NOT EXISTS public.creator_engagement (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_user_id uuid NOT NULL,
  viewer_user_id uuid NOT NULL,
  submission_id uuid NOT NULL REFERENCES public.feed_posts(id) ON DELETE CASCADE,
  action text NOT NULL CHECK (action IN ('view','like','comment','share','save')),
  xp_credited_to_creator integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ON public.creator_engagement (creator_user_id, created_at);
CREATE INDEX ON public.creator_engagement (submission_id);

CREATE MATERIALIZED VIEW IF NOT EXISTS public.creator_monthly_stats AS
SELECT
  user_id,
  date_trunc('month', created_at)::date AS month,
  count(*) AS submissions_count,
  sum(likes_count) AS total_likes,
  sum(views_count) AS total_views,
  sum(xp_earned) AS xp_earned,
  rank() OVER (PARTITION BY date_trunc('month', created_at) ORDER BY sum(xp_earned) DESC) AS rank_overall,
  rank() OVER (PARTITION BY date_trunc('month', created_at), category ORDER BY sum(xp_earned) DESC) AS rank_category
FROM public.feed_posts
WHERE status = 'published'
GROUP BY user_id, date_trunc('month', created_at), category;
```

### XP economy

- Post: **+10 XP** per submission, capped **1/day** per creator.
- Like received: **+1 XP**, daily cap **50 XP/day**.
- Comment received: **+2 XP**, daily cap **30 XP/day** (15 unique commenters).
- Share received: **+5 XP**, daily cap **20 XP/day** (4 shares).
- Featured by moderation: **+500 XP + 200 coins**, atomic, audited.
- Top-10 monthly per category: invite to exclusive partner event + **1000 XP** + Niv shoutout.

### API

- `POST /api/creator/submissions` — body: type, category, content, media_urls[], visibility, related_*. Creates `feed_posts` row in `draft`; if `visibility='public'` flips to `pending_moderation` and enqueues.
- `POST /api/creator/submissions/:id/publish` — moves `draft` → `pending_moderation` (or to `published` if `visibility != public`).
- `POST /api/teen/feed/:submission_id/engage` — body: action ∈ {view,like,comment,share,save}. Increments counters, writes `creator_engagement`, calls capped `award_xp`.
- `GET /api/creator/leaderboard?period=month&category=sport` — returns ranked creators from `creator_monthly_stats`.
- `POST /api/admin/creator-moderation/:id/{approve|reject|feature}` — admin actions; `feature` writes audit and credits XP+coins.

### UI routes

- `/teen/feed` — algorithmic discover feed (friend posts ⊕ featured ⊕ §19.5 recommendations).
- `/teen/create` — composer: photo/video/story/tutorial/review, category picker, visibility, related quest/event/partner picker.
- `/teen/feed/:id` — post detail, comments, like/share/save.
- `/teen/profile/:id` — public profile + content gallery tab.
- `/teen/leaderboard` — creator leaderboard with `period` + `category` tabs.
- `/admin/creator-moderation` — queue with approve / reject / feature, attached image AI scan signal.

### Moderation

- All `feed_posts` with `visibility='public'` enqueue into `moderation_queue` with `content_type='feed_post'`, `content_id=feed_posts.id`.
- Image AI scan + text classifier run pre-queue; auto-reject NSFW, auto-approve low-risk + reviewable, flag borderline.
- Re-review on each user report (`feed_posts.reported_count` triggers re-enqueue at threshold 3).
- Three rejected/removed posts in rolling 90 days → creator suspended (cannot post; can still consume).

### Personalization (§19.5)

- `get_personalized_feed` body refactored to call `recommend_for_teen('feed_post', user_id, limit)`.
- Tags from teen interests x creator `category`.
- Friend signal boost (posts from friends weighted up).
- Engagement signals (`creator_engagement.action`) feed `behavioral_signals` for the personalization engine.

### Avatar integration

- After a quest completion: Niv prompts "T'as gagné le défi physique aujourd'hui — partage en photo ?" with deep link to `/teen/create?related_quest_id=…`.
- On `feed_posts.featured` flip: Niv messages "T'es featured cette semaine ! Bravo Niv 🎉" + the post link.
- Weekly digest from Niv: "Ton post X a fait Y likes cette semaine."

### Acceptance criteria

- [ ] Teen submits photo of their parkour défi via `/teen/create`.
- [ ] Row lands in `feed_posts(status='pending_moderation', moderation_id=…)`, paired `moderation_queue` row exists.
- [ ] Admin approves → `feed_posts.status='published'`; post visible to friends in `/teen/feed`.
- [ ] 10 likes received same day → `creator_engagement` ledger has 10 rows; `+10 XP` credited (under the 50/day cap).
- [ ] Creator hits 50 XP from likes that day → next likes credit 0 XP but still increment `likes_count`.
- [ ] Admin features the post → `+500 XP + 200 coins` credited atomically; `featured_audit_log` row exists.
- [ ] `creator_monthly_stats` refresh ranks the post's creator; top-10 trigger fires invite + 1000 XP.
- [ ] §19.5 personalization ranks similar content for similar-profile teens (verifiable via A/B teen profile fixtures).
- [ ] Three rejections in 90 days suspends posting capability.

### Open questions

- Live streaming V1 vs V2?
- Video max length, auto-transcription, copyright/music check?
- Sponsored posts entry timing (partner-network V1.5)?
- Default visibility for new users (friends vs public)?
- Cash-out path for top creators (ambassador-style revenue share)?
- Anti-bullying: comment moderation depth, mute/block UX, report-review SLA?
- Featured cap per week per country (proposed 5)?
- Should `special_challenge_submissions` cross-post into `feed_posts` automatically on validation, or only on creator opt-in?
