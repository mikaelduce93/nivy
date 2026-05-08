# Social Feed — Canonical Lock (READ-ONLY)

**Status:** LOCKED. **Date:** 2026-05-08. **Sources:** `docs/vision/audit-frontend-reality/E1-feed-social.md`, `docs/vision/audit-frontend-reality/B1-teen-audit.md`, `docs/vision/audit-frontend-reality/C4-duplicates.md`, `docs/vision/PRODUCT_WHITEPAPER.md` §17/§18/§19.4.4/§19.4.5, `docs/vision/social-graph.md`, `docs/vision/content-creator-economy.md`, `docs/vision/marketplace-c2c.md`, `docs/vision/admin-moderation.md`, `docs/vision/ai-safety-teen-welfare.md`.

This document is the single source of truth for every social object (feed posts, comments, likes, friends, DMs, circles, marketplace listings, moderation hooks). It locks canonical URLs, tables, RPCs, and APIs; deprecates parallel implementations; forbids unsafe patterns; and enumerates founder decisions still pending.

**Contradictions flagged inline with `⚠️ CONTRADICTION`.**

---

## 1. LOCKED — Feed

**Canonical list URL:** `/teen/feed`
**Canonical detail URL:** `/teen/feed/[id]`
**Canonical composer URL:** `/teen/create`

**Backing tables (live, public schema):** `feed_posts`, `feed_likes`, `feed_comments`, `feed_views`, `feed_shares`, `feed_bookmarks`, `feed_mentions`, `feed_muted_users`, `hidden_posts`, `creator_engagement`.

**Canonical post-type enum** (CHECK on `feed_posts.post_type`):
`'photo' | 'video' | 'story' | 'tutorial' | 'review' | 'live_event'` (V2).

**Canonical lifecycle enum** (CHECK on `feed_posts.status`):
`'draft' | 'pending_moderation' | 'published' | 'rejected' | 'removed'`.

**Visibility enum** (`feed_posts.visibility`): `'public' | 'friends' | 'circle' | 'private'`. When `circle`, `feed_posts.circle_id` MUST be set.

**Canonical actions on a post** (all routed via `POST /api/teen/feed/[submission_id]/engage`, body `{ action }`):
`view | like | comment | share | save | report | block`

| Action | Effect | Rules |
|---|---|---|
| `view` | `feed_posts.views_count++`, `creator_engagement` row, no XP | Dedupe per `(viewer, submission, day)` |
| `like` | RPC `toggle_post_like` (idempotent toggle), updates `likes_count` | Capped creator XP +1, max 50/day |
| `comment` | Thin signal; **must** be paired with `POST /api/teen/feed/comments` | Creator XP +2/comment, cap 30/day |
| `share` | Increments `shares_count` AND emits social-share record | Creator XP +5/share, cap 20/day |
| `save` | Inserts into `feed_bookmarks` | No XP, surfaces in `/teen/profile?tab=saved` |
| `report` | Writes `user_reports(target_type='feed_post')`, increments `feed_posts.reported_count`. At ≥3 → `feed_posts.is_hidden=true` and re-enqueue to `moderation_queue`. | One report per `(reporter, post)` |
| `block` | Writes `blocked_users(blocker, blocked)` row, hides all posts from blocker's feed | Mutual: blocked user cannot see blocker's content either (whitepaper §17) |

**Pagination — LOCKED:** cursor-based on `(featured DESC, created_at DESC, id DESC)`, page size 20, query param `?cursor=`. The current `limit(30)` hardcode is FORBIDDEN.

**Personalization:** server reads via RPC `get_personalized_feed(user_id, limit, offset, filter)` which MUST proxy `recommend_for_teen('feed_post', user_id, limit)` once Wave 1 personalization lands. Until then: blend `friends ⊕ featured ⊕ recency`.

**User-state read on list paint:** every card MUST include `user_liked: boolean`, `user_saved: boolean`, `user_reported: boolean` joined from `feed_likes`/`feed_bookmarks`/`user_reports` for the calling teen. Rendering hearts/save without this read is FORBIDDEN.

---

## 2. LOCKED — Comments

**Canonical URL:** `/teen/feed/[id]` (comments thread renders inline; no separate `/comments` route).

**Backing table:** `feed_comments` with self-FK `parent_id` for replies.

**Tree depth — LOCKED at 2:** root comments + 1 level of replies. Replies-to-replies flatten under the same `parent_id` (Reddit-style with depth cap, not infinite tree).

**Canonical API:** `POST | PATCH | DELETE /api/teen/feed/comments` (single route handler with `action ∈ {create, update, delete, like, unlike, report}`).

**Per-comment actions:**
- `like` / `unlike` — toggle `feed_comments.likes_count`, idempotent.
- `report` — writes `user_reports(target_type='feed_comment')`, threshold 3 → soft-delete via `feed_comments.is_hidden=true`.
- `delete` — author or moderator only; soft-delete (`deleted_at`), preserves thread structure with `[supprimé]` placeholder.

**Composer rules:**
- Max 500 chars.
- Mentions parsed from `@username`, written to `feed_mentions`, trigger notification to mentioned teen.
- Optimistic insert with `tempId`; reconcile against POST response real id.
- Empty `catch {}` after a failed comment send is FORBIDDEN — must rollback the optimistic row and toast the error.

---

## 3. LOCKED — Friends

**Canonical URL:** `/teen/friends`
**Friend-suggestions URL:** `/teen/friends` (rendered inline).
**Public profile URL:** `/teen/profile/[user_id]`.

**Canonical schema — LOCKED to the rich shape:**
`friendships(user1_id, user2_id, status, friendship_level, is_best_friend, is_favorite, nickname, interaction_count, created_at, updated_at)`. ⚠️ **CONTRADICTION:** the legacy shape `friendships(user_id, friend_id, status)` used by `app/api/teen/friends/route.ts` is DEPRECATED. Migrate writes to RPC `send_friend_request` + `accept_friend_request` (rich shape). The legacy shape MUST be dropped after migration.

**Canonical actions:**
| UI action | API | Backend |
|---|---|---|
| Send request | `POST /api/teen/friends` `{ targetTeenId }` | RPC `send_friend_request(sender, receiver)` → `friend_requests` row |
| List incoming | `GET /api/teen/friends/requests?direction=incoming` | reads `friend_requests` |
| Accept | `POST /api/teen/friends/requests/[id]/accept` | RPC `accept_friend_request` → materializes `friendships` |
| Decline | `POST /api/teen/friends/requests/[id]/decline` | sets `friend_requests.status='declined'` |
| List friends | `GET /api/teen/friends` | reads `friendships` for caller, MUST include real `mutual` count via RPC `get_mutual_friends_count` (not hard-coded `0`) |
| Unfriend | `DELETE /api/teen/friends/[friend_user_id]` (**MISSING — must build**) | `FriendHandlers.remove` |
| Block | `POST /api/teen/friends/[friend_user_id]/block` (**MISSING — must build**) | `FriendHandlers.block` → clears friendship + cancels pendings + upserts `blocked_users` |
| Unblock | `DELETE /api/teen/friends/[friend_user_id]/block` (**MISSING — must build**) | `FriendHandlers.unblock` |
| Search teens | `GET /api/teen/friends/search?q=` (**MISSING — must build**) | `FriendHandlers.search` |
| Discover by code/QR | `GET /api/teen/discover?friend_code=…&qr=…` (**MISSING — friend_code col absent**) | new column `teens.friend_code` |

**Friend-request invariants (whitepaper §17):**
- Requests expire after **7 days** (`friend_requests.expires_at`).
- Block is **mutual** — blocked user cannot see blocker's content.
- Adult ↔ teen friendship is **blocked** except via `partner_staff` link (coach exception).

**Parent visibility — LOCKED ON BY DEFAULT (whitepaper §17 + Decision #24):**
Parents see read-only friend list at `/parent/teens/[teen_id]/friends` (**MISSING — no parent-side surface today**). Parents may flag for unfriend but cannot unilaterally unfriend without teen consent UNLESS teen is in account-pause state.

---

## 4. LOCKED — Direct messages

**Canonical URL:** `/teen/messages` (inbox + thread, mobile uses `selectedId` state for thread view).
**Canonical table:** `direct_messages` (with `direct_conversations` for thread headers). ⚠️ **CONTRADICTION:** `social-graph.md` references a parallel `teen_messages`/`teen_conversations` pair — this is DEPRECATED. Canonical = `direct_messages` + `direct_conversations`.

**Realtime channel — LOCKED (currently MISSING):**
```ts
supabase.channel(`dm:${conversationId}`)
  .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'direct_messages', filter: `conversation_id=eq.${conversationId}` }, …)
```
Polling for DMs is FORBIDDEN.

**Canonical APIs:**
- `GET /api/teen/messages` — inbox list (SSR + client refetch on focus).
- `GET /api/teen/messages?conversationId=…` — thread, marks inbound as read, zeroes unread counter.
- `POST /api/teen/messages` `{ conversationId?, recipientId, content, attachment_url? }` — friendship-gated via RPC `are_friends`, ensures conv via `ensure_direct_conversation`, inserts row, updates preview + unread, fires notification.
- The POST response body **MUST** be consumed (`await res.json()`) and used to replace the optimistic temp id with the real DB id. Discarding the response is FORBIDDEN.
- Failed POST **MUST** rollback the optimistic message and toast. Empty `catch {}` is FORBIDDEN.

**Attachment policy — LOCKED:**
- Bucket: `dm-attachments` (private, signed URLs only, never `getPublicUrl`).
- Allowed MIME: `image/jpeg | image/png | image/webp | image/heic`. Video and arbitrary files BLOCKED in V1.
- Max size: **5 MB** (recommendation — see §12 unresolved).
- AI image scan (NSFW + safety category) MUST run before the message becomes visible to the recipient. Failed scan → message stays in `pending_scan` state, sender notified.

**Blocked-user enforcement:**
- `POST /api/teen/messages` MUST reject with `403` if `blocked_users` row exists in either direction between sender and recipient.
- Inbox MUST hide conversations where the peer blocked the caller.

**Adult ↔ teen DM:** BLOCKED at API layer except `partner_staff` role with active `coach_meeting` parental authorization.

---

## 5. LOCKED — Circles AND Crews (BOTH KEPT, distinct concerns)

⚠️ **CONTRADICTION RESOLVED:** the audit suggested picking one. Whitepaper §17 keeps **both** as distinct tiers:
- **Circles** = 5–10 close friends, group **chat**, polls, group challenges. Table: `circles` + `circle_members` + `circle_messages`.
- **Crews** = 10–30 competitive units, leaderboard + crew battles, no required chat. Table: `crews` + `crew_members`.

**Canonical decision — LOCKED:**
- **`/teen/circles`** = canonical URL for **both** in V1 (per C4 audit + B1 sidebar). The page surfaces "Mon Crew" (competitive) and "Mes Cercles" (chat groups) as two tabs. No separate `/teen/crews` route in V1.
- `/gamification/crews` MUST redirect to `/teen/circles` (already done per C4).
- The schema-name contention (`circles` vs `crews` table) is resolved by **keeping both tables** since they model different sizes, governance, and reward economies.

**Canonical APIs:**
- Circles: `POST /api/teen/circles/create`, `POST /api/teen/circles/[id]/invite`, `GET|POST /api/teen/circles/messages` (group chat).
- Crews: `POST /api/teen/crews/join`, `GET /api/teen/crews/leaderboard`, crew battles via `friend_challenges` + `circle_challenges`.

**Circle chat — LOCKED:**
- Backing table `circle_messages` (full chat: replies, reactions JSONB, edits, soft-delete, pinning).
- RPC `send_circle_message`.
- Realtime subscription on `circle_messages` filtered by `circle_id` — **MISSING today, must build** (same channel pattern as §4).
- `circles-client.tsx` "Chat Crew" button MUST link to `/teen/circles/[id]/chat` or open inline chat panel; current dead button is FORBIDDEN.

---

## 6. LOCKED — Marketplace (as social object)

**Canonical URLs:** `/marketplace` (discover), `/marketplace/sell` (composer wizard), `/marketplace/listings/[id]`, `/marketplace/my-listings`, `/marketplace/orders`. Parent: `/parent/marketplace`. Admin: `/admin/marketplace`.

**Status:** ⚠️ **0% IMPLEMENTED.** No `marketplace_*` tables exist in live DB. Existing `components/teen/marketplace-overlay.tsx` and `components/teen/dashboard/marketplace-drops.tsx` are DEPRECATED (partner-deals UI mislabeled "marketplace" — must rename to `partner-deals-*`).

**Canonical tables (per `marketplace-c2c.md` SPEC):** `marketplace_listings`, `marketplace_transactions`, `marketplace_disputes`, `marketplace_ratings`, `user_seller_stats`.

**Listing creation rules — LOCKED:**
- Status lifecycle: `'draft' → 'pending_moderation' → 'active' → 'sold' | 'removed' | 'reported'`.
- Every listing → `moderation_queue` BEFORE going `active`.
- Auto-reject keywords: weapons, drugs, alcohol, tobacco, contact info (phone/email/address regex), brand counterfeits.
- Image AI scan (NSFW + category blocklist) on every image.
- Cap: teen seller **max 5 active listings simultaneously**.
- Cap: teen sales **≤ 1000 DH/month total** (anti-AML, whitepaper Decision #38).
- Listings expire after **30 days** unless renewed.

**Image rules — LOCKED:**
- Bucket: `marketplace-images-private` (private until moderation approves).
- On approval, images migrate to `marketplace-images-public` (signed-URL only; no `getPublicUrl()`).
- On `removed`/`reported`: images stay private forever, lifecycle rule deletes after 30d.
- Min 1 / max 6 images per listing.

**`meet_method` enum — LOCKED:**
`'school' | 'venue_partner' | 'public_pickup' | 'shipping'`.
**Invariant:** `public_pickup` and `shipping` are BLOCKED when either party is a minor. Teen↔teen MUST use `school` or `venue_partner` only.

**Escrow flow — LOCKED:**
1. Buyer taps Buy → coins debited, held in Nivy treasury (`escrow_ledger`).
2. If buyer is teen → `parental_authorizations` request (whitepaper §19.4.4); auto-released within preset autonomy ceiling.
3. Both teens scheduled to meet at partner venue.
4. Buyer confirms receipt → coins release to seller, **8% platform fee** (Decision #37: 5% Nivy + 3% trust insurance), cashback XP to buyer.
5. Auto-release T+3 days if no dispute.
6. Dispute opened → escrow frozen → admin resolves.

**Parent visibility — LOCKED:**
- `/parent/marketplace` — read-only view of teen's listings + pending purchase approvals + monthly DH cap progress.
- Parent receives push on every teen buy ≥ ceiling.

---

## 7. LOCKED — Moderation hooks (cross-cutting)

**Every user-generated content surface MUST honor the four invariants:**

1. **`report` action** — wired to `user_reports(reporter_user_id, target_type, target_id, reason, status)`. ⚠️ **CONTRADICTION:** `app/api/circles/report/route.ts` writes to `moderation_reports` (a non-existent table). Canonical = `user_reports`. Migrate.
   - `target_type ∈ {'feed_post','feed_comment','direct_message','circle_message','marketplace_listing','user_profile'}`.
   - At **≥3 reports** on same target → auto-hide AND re-enqueue to `moderation_queue` for human review.
   - Reporter cap: **20 reports/user/day** (anti-harassment-by-report).

2. **ARIA-announce** — every `report` / `block` / `unblock` / `delete` UI action MUST emit a screen-reader announcement via `<LiveRegion>` or `useA11yAnnounce()`. `window.alert()` does NOT count.

3. **Soft-delete** — content is never hard-deleted in V1. Set `deleted_at` (or `is_hidden=true` + `removed_reason`). Hard delete only via admin retention job after 90 days.

4. **`audit_log` entry** — every privileged action (admin moderation decision, refund, role change, force-delete, parent override) MUST insert into `admin_audit_logs(user_id, action, target_type, target_id, payload, created_at)`. ⚠️ **CONTRADICTION:** `admin_audit_logs` table is MISSING in live DB; `lib/auth/admin-permissions.ts#logAdminAction` writes silently fail. **Build the table now** (whitepaper §18 spec).

**AI safety hooks** (per `ai-safety-teen-welfare.md`): every public-visibility insert into `feed_posts`, `feed_comments`, `circle_messages`, `direct_messages` (when attachment present), `marketplace_listings` MUST run through:
- Keyword denylist (sexual / drugs / violence / self-harm / contact-info).
- Image AI scan (NSFW + blocked categories) when media present.
- LLM-as-judge on tone (V2).
- Self-harm/crisis classifier on inbound text — escalates to human moderator + parent notification.

---

## 8. LOCKED — Canonical APIs (consolidated index)

| Surface | Method | Path | Status |
|---|---|---|---|
| Feed list | GET | `/api/teen/feed?cursor=…` | needs cursor pagination + user-state join |
| Feed post detail | GET | `/api/teen/feed/[id]` | needs `user_liked`/`user_saved`/`user_reported` |
| Engage | POST | `/api/teen/feed/[submission_id]/engage` | LOCKED (exists, expand `report` and `block` actions) |
| Like (alias) | POST | `/api/teen/feed/[id]/like` | shorthand → routes to `engage{action:'like'}` |
| Comments CRUD | POST/PATCH/DELETE | `/api/teen/feed/comments` | LOCKED (exists, MUST be consumed by UI) |
| Friends list | GET | `/api/teen/friends` | LOCKED (must add real mutual count) |
| Friend request | POST | `/api/teen/friends` | LOCKED |
| Friend requests inbox | GET | `/api/teen/friends/requests?direction=` | LOCKED |
| Accept/decline | POST | `/api/teen/friends/requests/[id]/{accept,decline}` | LOCKED |
| Unfriend | DELETE | `/api/teen/friends/[friend_user_id]` | **MISSING — must build** |
| Block / Unblock | POST/DELETE | `/api/teen/friends/[friend_user_id]/block` | **MISSING — must build** |
| Search teens | GET | `/api/teen/friends/search?q=` | **MISSING — must build** |
| Discover (code/QR) | GET | `/api/teen/discover?friend_code=&qr=` | **MISSING + needs `teens.friend_code` column** |
| DM list | GET | `/api/teen/messages` | LOCKED |
| DM thread | GET | `/api/teen/messages?conversationId=` | LOCKED |
| DM send | POST | `/api/teen/messages` | LOCKED (must add `attachment_url`, consume response) |
| DM realtime | — | supabase channel `dm:${conversationId}` | **MISSING — must build** |
| Circle chat | GET/POST | `/api/teen/circles/messages` | LOCKED (UI MUST consume) |
| Circle realtime | — | supabase channel `circle:${circleId}` | **MISSING — must build** |
| Crew join | POST | `/api/teen/crews/join` | LOCKED |
| Marketplace listings | POST/GET/PATCH/DELETE | `/api/marketplace/listings[/:id]` | **MISSING — entire stack** |
| Marketplace buy | POST | `/api/marketplace/listings/[id]/buy` | **MISSING** |
| Marketplace confirm | POST | `/api/marketplace/transactions/[id]/confirm-receipt` | **MISSING** |
| User report (universal) | POST | `/api/teen/report` `{target_type, target_id, reason}` | **MISSING — replaces `/api/circles/report`** |
| Admin moderation decide | POST | `/api/admin/moderate/[id]/decide` | **MISSING — whitepaper §18** |

---

## 9. DEPRECATED

The following implementations are DEPRECATED. They MUST be either deleted or rewritten before launch.

| Item | Reason | Canonical replacement |
|---|---|---|
| `app/teen/social/social-hub-client.tsx` (RankingTab + MapTab fixtures) | Hard-coded fake leaderboard ("Salma K.", "Youssef M."), fake "Gaming Night @ Casa" map cards on fetch failure | `/teen/leaderboard` (creator) + `/gamification/leaderboard` (XP global); map = real `partner_venues` query or remove tab |
| `components/feed/social-feed.tsx` long-press alerts | `toast.message('Signalement envoyé')` and demo-activity fallback masquerading as real | Real `report` action via `/api/teen/feed/[id]/engage{action:'report'}`; remove demo fallback |
| `app/teen/feed/feed-list.tsx` long-press menu | `window.alert("Merci, le post a été signalé")` and `window.alert("L'auteur a été bloqué")` | Real report modal + block confirmation, both wired to APIs |
| `components/feed/long-press-menu.tsx` toast-only "Pin"/"Report" | No server wiring | Wire to real engage endpoints; remove if Pin not in V1 |
| `app/api/teen/friends/route.ts` legacy `friendships(user_id, friend_id)` shape | Conflicts with rich `(user1_id, user2_id, ...)` shape used by `handlers.ts` | Single canonical shape — RPC-only writes |
| `app/api/circles/report/route.ts` writing to `moderation_reports` | Target table does not exist; writes silently fail | Canonical `user_reports` table + universal `/api/teen/report` |
| `components/teen/marketplace-overlay.tsx`, `components/teen/dashboard/marketplace-drops.tsx` | Partner-deals UI mislabeled "marketplace"; conflicts with C2C marketplace name | Rename to `partner-deals-overlay.tsx` / `partner-deals-drops.tsx` |
| `lib/auth/admin-permissions.ts#logAdminAction` write to `admin_audit_logs` | Table missing — silent fail | Create table per whitepaper §18 spec |
| `social_feed_posts` (in code/migrations) | Does not exist live; shadow of `feed_posts` | Use `feed_posts` only |
| Demo/fixture activities in `<SocialFeed>` (`demo-*`, `presence-*` IDs) | Renders as if real on empty data | Render `<EmptyState>` only |

---

## 10. FORBIDDEN patterns (any future PR introducing these MUST be blocked)

1. **`window.alert()` as success notification** — for `report`, `block`, share copy, comment posted, anything user-facing. Use `<LiveRegion>` + sonner toast + ARIA-announce.
2. **Fake leaderboard / fake map / fake "online" fixtures on fetch failure** — `RankingTab.SOCIAL_FALLBACK = ['Salma K.', 'Youssef M.', …]`, `MapTab` "3 friends nearby", demo activities. Empty state OR error state ONLY.
3. **Missing realtime channel for DMs and circle chat** — polling-only is FORBIDDEN. Must subscribe to `direct_messages` / `circle_messages` filtered channels.
4. **Hardcoded `limit(30)` on `/teen/feed`** — must be cursor-paginated. Same applies to `/teen/messages` (inbox) and `/api/teen/feed/comments` list.
5. **Like/save UI rendered without per-user state read** — never paint a heart in default-empty state when the calling teen may have already liked the post. Always join `feed_likes` (or `user_reaction` field on the RPC).
6. **Empty `catch {}` after a failed network call** — must rollback optimistic mutation + toast error. Specifically forbidden in `messages-client.tsx` send handler.
7. **Discarding POST response body** — `fetch('/api/teen/messages', POST)` MUST `await res.json()` and replace temp id.
8. **Hard-coded mutual-friends `0`** — must call `get_mutual_friends_count` RPC.
9. **Public Supabase storage buckets for any user-generated media** (CIN scans, défi proofs, DM attachments, marketplace images). Always private + signed URL.
10. **Decorative buttons with no `onClick` and no `href`** — `<MoreVertical>`, `<Paperclip>`, `<ImageIcon>`, "Ajouter", "Inviter", "Voir", "Créer", "Chat Crew", "Add New Friends" in current code. Either wire or remove.
11. **Mock notification badges** (`notifications.quests = 3`, `social = 2` in `useNotifications()`) rendering as if real.
12. **Cross-zone redirects without preserving teen layout shell** — `/teen/achievements` → `/gamification/collections` strands the user. Either keep route under `/teen/...` or render teen layout for `/gamification/*`.
13. **Self-engagement XP grants** — current code blocks (`post.user_id !== user.id`); MUST stay blocked and apply to comments/shares as well.
14. **Adult-account DMing minor accounts** without active `partner_staff` link + parental authorization.

---

## 11. MISSING (must be built before social-feed can be marked launchable)

| # | Missing primitive | Surface |
|---|---|---|
| 1 | Comments composer + thread render | `/teen/feed/[id]` — backend ready, UI 0% |
| 2 | Universal report-content UI (modal + reason picker + confirmation) | feed posts, comments, DMs, circle messages, listings, profiles |
| 3 | Block-user UI (confirmation modal, blocked-list management screen `/teen/blocked`) | `/teen/friends` row menu + `/teen/feed` long-press |
| 4 | `DELETE /api/teen/friends/[id]` (unfriend) | route file does not exist |
| 5 | `POST/DELETE /api/teen/friends/[id]/block` | route file does not exist |
| 6 | `GET /api/teen/friends/search?q=` (global teen search) | route does not exist; `FriendHandlers.search` is dead code |
| 7 | DM realtime supabase subscription on `direct_messages` | not wired in `messages-client.tsx` |
| 8 | DM attachments end-to-end (private bucket + signed URL + AI scan + size guard + UI handlers on `<Paperclip>`/`<ImageIcon>`) | full pipeline missing |
| 9 | Feed cursor pagination + infinite-scroll | hard `limit(30)` today |
| 10 | Marketplace image upload + multi-step composer wizard | 0% — entire feature greenfield |
| 11 | `teens.friend_code` column + QR scan endpoint + `/api/teen/discover` | discover-by-code missing |
| 12 | `user_reports` table + `/api/teen/report` universal endpoint | currently writes to non-existent `moderation_reports` |
| 13 | `admin_audit_logs` table | missing; every privileged action silently un-audited |
| 14 | `support_tickets` table + admin inbox | missing entirely |
| 15 | Circle realtime + circle chat UI panel | API exists, UI dead |
| 16 | Crew chat UI (if crew chat is in-scope — see §12) | "Chat Crew" button dead |
| 17 | Parent-side friend visibility `/parent/teens/[id]/friends` | missing |
| 18 | Parent-side marketplace visibility `/parent/marketplace` | missing |
| 19 | Saved-posts surface `/teen/profile?tab=saved` | `save` action writes ledger; no read surface |
| 20 | Friend-count cap (`friendships` has none today, abuse vector) | enforce limit (suggest 500) |
| 21 | Self-harm / crisis classifier on DM and comment input | absent |
| 22 | Feed `share` UX (open share sheet OR copy-link) AND attribute XP | `EngageButtons.Share` records XP but does nothing user-visible; `feed-list.tsx` shares but skips XP |
| 23 | `permissions JSONB` column on `admin_roles` (referenced by code, missing in DB) | schema fix |
| 24 | DM error-rollback + temp-id reconcile in `messages-client.tsx` | currently empty `catch {}` |

---

## 12. UNRESOLVED founder decisions (recommend defaults)

| # | Question | Recommendation | Rationale |
|---|---|---|---|
| D1 | Circles vs Crews — rename, merge, or keep both? | **KEEP BOTH** under canonical URL `/teen/circles` (two tabs). Sunset the route name `/teen/crews` (whitepaper §17 mentions it but C4 audit confirms `/teen/circles` is the live canonical). | Different sizes, governance, reward economies. Whitepaper §17 explicitly tiers them. Tab UX avoids new top-level route. |
| D2 | Marketplace allowed for teens or parent-only? | **TEENS ALLOWED**, with parental authorization for any listing ≥200 coins or any DH listing, and per-purchase parental approval for buys above autonomy ceiling. AML cap 1000 DH/month. Adult sellers gated to adult-only buyers (no adult→teen sales). | Whitepaper §19.4.4 + `marketplace-c2c.md` §6 + Decision #38. Parent-only would gut the circular-economy pillar. |
| D3 | Max DM attachment size? | **5 MB** per attachment, **1 attachment per message** in V1. Images only (jpeg/png/webp/heic). No video, no arbitrary files. | Balances mobile UX (Morocco 4G/Wi-Fi mix) with private-bucket cost and AI-scan latency. Video opens a moderation throughput problem we are not staffed for in V1. |
| D4 | Adult ↔ teen DM | **BLOCKED** at API layer; exception only for `partner_staff` role with active parental authorization (`coach_meeting`). | Whitepaper §17 invariant + `ai-safety-teen-welfare.md` §1 risk. |
| D5 | Reporter cap | **20 reports/user/day** + 1 report per `(reporter, target)`. | Anti-harassment-by-report. Tunable. |
| D6 | Auto-hide threshold on user reports | **3 reports** → auto-hide + re-enqueue to `moderation_queue`. | Already implemented in `circles/report/route.ts` (against missing table); standardize to `user_reports`. |
| D7 | Featured-post cap (creator economy) | **5/week per country**, multi-moderator approval. | `content-creator-economy.md` §4 risk: featured = 500XP+200 coins is moderator-capture vector. |
| D8 | Default post visibility for new teens | **`'friends'`**, with explicit opt-in toggle to `'public'` per post. | Privacy-by-default; reduces moderation surface. |
| D9 | Cross-school friending | **ALLOWED, same-city default**, opt-in cross-city via friend code. | `friendships` has no school constraint; minor risk acceptable with parental visibility. |
| D10 | Friend-count cap | **500 mutual friends max** per teen. | `friendships` has no cap today (spam vector). |
| D11 | DM read receipts | **OFF by default**, opt-in via profile setting. | Reduces social pressure. |
| D12 | Comment depth | **2 levels** (root + 1 reply, flatten deeper). | Avoids Reddit-style infinite nesting on mobile. |
| D13 | Should `special_challenge_submissions` cross-post into `feed_posts`? | **OPT-IN per submission**, default ON for `is_validated=true` photo/video proofs. | Per `content-creator-economy.md` rec — avoids fragmentation without forcing. |

---

**End of LOCKED canon.** Any PR contradicting any section above MUST cite this file and request a written override from the founder before landing.
