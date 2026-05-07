# Social Graph — Friends, Circles, Crews

Audit date: 2026-05-07. Read-only audit by social-graph-auditor against active Supabase project `imchornjvmgmaovhypco` and the working tree at `C:\Users\Shadow\Desktop\NIVY`.

## 1. Vision recap (what we want)

Nivy aims to model a multi-tier teen social graph rather than a single "friends" bucket:

- **Friends** — mutual 1-1 ties, found by username/search, sending and accepting requests, viewing profile/activity, with friendship_level and best-friend/favorite affordances.
- **Circles** — small private groups (5-10) for planning together, group chat, polls, group challenges (the "close-friends" tier).
- **Crews** — larger competitive units (10-30) with leaderboards, crew battles, crew achievements, weekly XP goals.
- **Discover** — public search by username, friend code, QR scan, plus algorithmic suggestions.
- **Privacy and safety** — parental visibility on the friend list, parental block of specific contacts, in-app block and report, age gating against adult coaches, school-cross policies, friend-count limits.
- **Group challenges** — friend duels and crew battles wired into quests/XP so the social graph drives gameplay.

## 2. What is implemented today

The implementation reaches further than expected: all three tiers exist as distinct schemas, plus a blocked_users mechanism and friend challenges. The teen UI, however, only uses a thin slice of it.

**Distinct relationship models.** Three concrete models coexist in the schema:
- Friends — `friendships` (15 cols incl. `user1_id`/`user2_id`, `status`, `friendship_level`, `is_best_friend`, `is_favorite`, `nickname`, `interaction_count`), `friend_requests` (sender/receiver, `status`, `expires_at`), `friend_connections` (8 cols, alternative shape), `friend_activities`, `friend_suggestions`.
- Circles — `circles`, `circle_members` (with role: owner/admin/moderator/member), `circle_messages` (full chat: replies, reactions JSONB, edits, soft-delete, pinning), `circle_message_reads`, `circle_invitations`, `circle_polls`/`circle_poll_votes`, `circle_challenges`/`circle_challenge_participants`.
- Crews — `crews` (slug, motto, banner, color, total_xp, total_challenges_won, average_level, `is_public`, `requires_approval`, `min_level_required`, `owner_id`), `crew_members`, `crew_invitations`, `crew_join_requests`, `crew_achievements`/`crew_unlocked_achievements`, `crew_weekly_stats`, `crew_activity_log`.

**Friend request handshake.** Mutual handshake. `app/api/teen/friends/handlers.ts:161` calls `send_friend_request(sender,receiver)`, the receiver accepts via `accept_friend_request(request_id, receiver_id)` (handlers.ts:174), which materialises a row in `friendships`. There is also a parallel, simpler shape in `app/api/teen/friends/route.ts:11` that writes directly to a `friendships(user_id,friend_id,status)` table with no RPC — this is a second, legacy schema that conflicts with the richer `user1_id/user2_id` table the handlers use. Live row counts confirm the system is unused so far: friendships=0, friend_requests=0, circles=0, circle_members=0, crews=0, blocked_users=0.

**Group chat.** Stored persistently in `circle_messages` with rich features (reply_to, reactions JSONB, pin, soft-delete, edit timestamps) via the `send_circle_message` Postgres function (`app/api/teen/circles/messages/route.ts:228`). Read tracking is dual: `circle_message_reads` plus `circle_members.last_read_at`. **Real-time is not wired** — the route fetches via REST polling, no Supabase Realtime channel subscription is set up in `circles-client.tsx` or `messages-client.tsx`. Direct messages live in a separate `teen_messages`/`teen_conversations` pair (`app/api/teen/messages/route.ts:28`), again polling.

**Discoverability.** Username/name search exists (`handlers.ts:124` ilikes `first_name`/`last_name` against `teens`). Friend codes and QR scan are absent — there is no `friend_code` column on `teens` and no QR endpoint. Algorithmic `friend_suggestions` exist with a `generate_friend_suggestions` RPC.

**Privacy and parental visibility.** No parent-side view of the friend list, no parental block of specific contacts, no parental override to unfriend on the teen's behalf. Searching `app/parent/` yields no friend/circle/crew references. The `blocked_users` table (5 cols: blocker_id, blocked_id, reason) and the `block`/`unblock` handlers (`handlers.ts:222`) are wired teen-side only.

**Report flow.** Vision-only. No `user_reports` table, no `/report` endpoint, no UI button. Block exists; report does not.

**Connection to quests/challenges.** Partial. `friend_challenges` (14 cols) and `circle_challenges` schemas exist, plus `gamification-system/features/crews/social-graph.ts` implements `getCrewXPStatus` (sums weekly `xp_ledger` per crew member against a hard-coded 5000 goal) and `createBuddyQuest` (writes to `buddy_quests`). These primitives are not surfaced in the teen UI — the friends page (`app/teen/friends/page.tsx`) shows hard-coded empty arrays for `PENDING_REQUESTS` and `SUGGESTIONS` with a TODO admitting only accepted friendships are fetched.

## 3. Discrepancies (vision vs reality)

- **Two friendship schemas.** `friendships(user_id,friend_id)` used by `route.ts` vs `friendships(user1_id,user2_id,...)` used by `handlers.ts`. Same table name; one of the two clients will silently fail. Pick one.
- **Friends page is a stub.** The page hits `/api/teen/friends` (the legacy shape) and never uses the rich `handlers.ts` features — pending requests, suggestions, search, block, best-friend toggle all exist server-side but are not surfaced.
- **Real-time chat missing.** Circles have all the chat schema but no Realtime subscription, so the UX is polling-only.
- **No friend code / QR.** Discover is name-search only, conflicting with the QR vision.
- **Parental visibility absent.** Vision calls for parents seeing the friend list; no parent route consumes any of the social tables.
- **Report flow absent.** Block-only safety, no report path.
- **`social_feed_posts` does not exist** in the live DB despite migration 035 being listed; the social-feed feature is not deployed.
- **Crew/circle wiring to quests is a primitive**, not a productised "crew battle" — `buddy_quests` is referenced in code but its presence in the schema was not verified during this audit.

## 4. Code paths inspected

- `C:\Users\Shadow\Desktop\NIVY\app\teen\friends\page.tsx`
- `C:\Users\Shadow\Desktop\NIVY\app\teen\circles\circles-client.tsx`
- `C:\Users\Shadow\Desktop\NIVY\app\teen\messages\messages-client.tsx`
- `C:\Users\Shadow\Desktop\NIVY\app\api\teen\friends\route.ts`
- `C:\Users\Shadow\Desktop\NIVY\app\api\teen\friends\handlers.ts`
- `C:\Users\Shadow\Desktop\NIVY\app\api\teen\circles\route.ts`
- `C:\Users\Shadow\Desktop\NIVY\app\api\teen\circles\messages\route.ts`
- `C:\Users\Shadow\Desktop\NIVY\app\api\teen\messages\route.ts`
- `C:\Users\Shadow\Desktop\NIVY\gamification-system\features\crews\social-graph.ts`
- `C:\Users\Shadow\Desktop\NIVY\gamification-system\database\migrations\006_friend_challenges.sql`
- `C:\Users\Shadow\Desktop\NIVY\gamification-system\database\migrations\007_crews_system.sql`
- `C:\Users\Shadow\Desktop\NIVY\gamification-system\database\migrations\023_circles_system.sql`
- `C:\Users\Shadow\Desktop\NIVY\gamification-system\database\migrations\024_friends_system.sql`
- `C:\Users\Shadow\Desktop\NIVY\gamification-system\database\migrations\035_social_feed.sql`

## 5. DB tables verified live (project imchornjvmgmaovhypco)

- `friendships` (14 cols, 0 rows) — rich shape: user1_id/user2_id, friendship_level, is_best_friend, is_favorite, nickname, interaction_count.
- `friend_requests` (9 cols, 0 rows) — sender/receiver/message/status/seen_at/expires_at.
- `friend_connections` (8 cols, 0 rows) — alternative shape, unused.
- `friend_activities` (13 cols), `friend_suggestions`, `friend_challenges` (14 cols).
- `circles` (15 cols, 0 rows), `circle_members` (11 cols), `circle_messages` (18 cols, full chat fields), `circle_invitations`, `circle_polls`, `circle_poll_votes`, `circle_challenges`, `circle_message_reads`.
- `crews` (20 cols, 0 rows), `crew_members`, `crew_invitations`, `crew_join_requests`, `crew_achievements`, `crew_unlocked_achievements`, `crew_weekly_stats`, `crew_activity_log`.
- `blocked_users` (5 cols, 0 rows: blocker_id, blocked_id, reason).
- `social_shares` (14 cols).
- `social_feed_posts` — **does not exist** in the live DB.
- Helper RPCs verified present: `send_friend_request`, `get_mutual_friends_count`, `accept_friend_request`, `generate_friend_suggestions`, `are_friends`, `send_circle_message`, `add_message_reaction`, `add_xp_to_user`.

## 6. Open questions

- **Age gating** — can teens add adult coaches as friends, or are coaches restricted to a separate relation table? Today `handlers.ts` searches the `teens` table only, which implicitly excludes coaches, but no policy/RLS was inspected.
- **Cross-school friends** — can Amine (School A) and Yasmine (School B) connect? `friendships` has no school constraint; crews/circles likewise; policy is permissive by default but not documented.
- **Parental override** — can a parent unfriend on the teen's behalf, or block a contact for the teen? No parent UI or API path exists today; this is a vision gap.
- **Friend-count limits** — `circles.max_members` and `crews.max_members` are enforced; `friendships` has no cap, opening abuse/spam vectors.
- **Which `friendships` shape wins?** The two parallel schemas (route.ts vs handlers.ts) need consolidation before the friends UI can be unstubbed.
- **Real-time strategy** — Supabase Realtime channels for `circle_messages` and `teen_messages` are the obvious fix; is there a deliberate reason it is polling-only today?
- **Report flow** — block exists, report does not. Is this slated for a Trust & Safety milestone, or accepted as out of scope?
