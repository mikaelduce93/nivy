# E1 — Teen Feed + Social Audit (Read-Only)

**Date**: 2026-05-08
**Scope**: `app/teen/feed/**`, `app/teen/feed/[id]/**`, `app/teen/friends/**`, `app/teen/messages/**`, `app/teen/circles/**`, `app/teen/social/**`, `components/feed/*`, `components/teen/dashboard/online-friends.tsx`
**Method**: End-to-end user-journey trace. UI presence, backend wiring, error handling, optimistic update at each step.

---

## 1. Per-Flow Scoring (/10)

### Flow A: Discover feed → see posts
**Score: 7/10**

- Server-rendered list (`app/teen/feed/page.tsx`) hits `feed_posts` directly with a hard `limit(30)` and filters by `status='published'`. Sort = `featured DESC, created_at DESC`.
- Renders via `FeedList` (FLIP animations, long-press menu) and `EmptyState`.
- Counters (likes/comments/shares) render but `views_count` and the user's own like state are **not** read on this list — every card is "unliked" on first paint regardless of history.
- **No pagination / infinite-scroll** — hard cut at 30 posts. No "load more" button or cursor.
- **No personalized ranking** — the file's own header comment says: "When `recommend_for_teen` gets a `feed_post` content_type wired (§19.5), swap the query." Not done.
- Error path: rendered as a `role="alert"` div (`Erreur de chargement: {error.message}`), but `posts` is then forced to `[]` so the empty state also shows alongside the error — confusing.

### Flow B: Open post detail → like / comment / share
**Score: 4/10**

- Detail page exists (`app/teen/feed/[id]/page.tsx`) with `EngageButtons`. Fires POST `/api/teen/feed/[submission_id]/engage` with `action ∈ {view,like,comment,share,save}`.
- `engage` route (`app/api/teen/feed/[submission_id]/engage/route.ts`) is real: records signal, awards creator XP via `award_creator_xp` RPC, calls `toggle_post_like` RPC for the like action, bumps `views_count` for views.
- **No optimistic update on the detail page**. `EngageButtons` does `setBusy(true)`, awaits the network, then `router.refresh()`. Each click is a full server round-trip + re-render.
- **"Comment" button does nothing meaningful**: clicking it just records a `click` signal. There is **no comment composer**, **no comment thread rendered**, and **no fetch of `/api/teen/feed/comments`** anywhere in `app/teen/feed/[id]/`. The comments API exists fully (`app/api/teen/feed/comments/route.ts` — create/update/delete/like/unlike/report supported, including replies) but is **completely unconsumed by the teen UI**.
- **"Save" button** is the only one that uses `creator_engagement` insert path; no UI surface exposes saved posts back to the user.
- **Like has no toggle semantics in the UI**: `toggle_post_like` RPC handles both like/unlike server-side, but the button always says "♥ Like" and the page can't tell if the user already liked the post (no `user_reaction` field is ever read for this view).
- Self-engagement is correctly blocked (`post.user_id !== user.id` gate before showing buttons + skipping XP).
- `msg` toast renders raw `JSON.stringify(json.xp)` — debug code shipped.

### Flow C: Like a post on the dashboard `<SocialFeed>`
**Score: 6/10**

- `components/feed/social-feed.tsx` has proper React 19 `useOptimistic` + `startTransition` for like flips.
- Falls back to demo activities if `initialActivities` is empty — these render as if real.
- Posts use a separate ID space (`demo-*`, `presence-*`) and **don't hit the network**.
- Real posts POST to `/api/teen/feed/${id}/engage`. Like-count increment is purely client-side: `(activity.likes_count ?? 0) + (isLiked ? 1 : 0)` — never refreshed from server, never reconciled with DB count.
- Long-press menu items (Pin, Report) only `toast.message('…')` — no server wiring at all.

### Flow D: Share a post
**Score: 5/10**

- `app/teen/feed/feed-list.tsx` (long-press menu) → `navigator.share` falls back to `navigator.clipboard.writeText`. **Does not** post `action: 'share'` to the engage endpoint. So creator XP for shares is never credited from this surface.
- `EngageButtons` "Share" button **does** hit `/engage` with `action: 'share'`, but **doesn't open any share sheet** or copy the link — pure XP accounting button.

### Flow E: Report content / block author
**Score: 1/10 (UI mock only)**

- Long-press menu in `feed-list.tsx` and `FeedPostLongPress` shows "Signaler" and "Bloquer l'auteur" buttons that call `window.alert("Merci, le post a été signalé.")` and `window.alert("L'auteur a été bloqué pour cette session.")`. **No network call, no DB row written**.
- `social-feed.tsx`'s long-press "Signaler" calls `toast.message('Signalement envoyé')` — same lie.
- `app/api/teen/feed/comments` has a `report` action handler that inserts into `reports` (working). It is **not wired to any UI**.
- `FriendHandlers.block` exists in `app/api/teen/friends/handlers.ts` (clears friendship + cancels pending requests + upserts `blocked_users`). It is **not exposed via any HTTP route** (no DELETE/PATCH on `/api/teen/friends`, no `/block` sub-route). It is dead code today.
- No route file exists for `POST /api/teen/feed/[id]/report` either.

### Flow F: Friends list + search
**Score: 7/10**

- `app/teen/friends/page.tsx` (server) + `friends-client.tsx` + `app/api/teen/friends/route.ts`.
- Tabs: Tous / En ligne / Demandes — work via local filter on `friend.status`.
- Search box filters the **already-loaded** friends list client-side (`friend.name.toLowerCase().includes(searchQuery.toLowerCase())`). **There is no global user search** — `FriendHandlers.search` exists but no HTTP route exposes it (`/api/teen/friends/search` does not exist). The header "Ajouter" button has **no `onClick` and no link** — pure decoration.
- "Friend Suggestions" block correctly calls SSR `recommend_friends` RPC and renders 5 suggestions with optimistic invite via `useOptimisticRunner` + toast.
- Per-friend `mutual` count is hard-coded to `0, mutual_calculated: false` in `route.ts` (the `get_mutual_friends_count` RPC exists but is only called inside `requests`/`search`/`suggestions` handlers, never in the main list).

### Flow G: Send friend request → accept / decline
**Score: 8/10**

- `friends-client.tsx` calls POST `/api/teen/friends` with `{ targetTeenId }` (works, RPC `send_friend_request`).
- Optimistic flip via `useOptimisticRunner` + juicy success/error toast — solid pattern.
- Incoming requests fetched from `/api/teen/friends/requests?direction=incoming`.
- Accept/decline POSTs to `/api/teen/friends/requests/[id]/{accept,decline}`. Both endpoints exist and work (`accept_friend_request` RPC + `friend_requests.status='declined'` update).
- Accept fires `<Celebrate>` + a11y announce + refetches friends list. Decline correctly rolls back via `useOptimistic`.
- Swipe-to-accept / swipe-to-decline gesture works.

### Flow H: Unfriend / Block
**Score: 0/10**

- `FriendHandlers.remove` and `FriendHandlers.block` exist in `app/api/teen/friends/handlers.ts`. Neither is exposed by any route file.
- `friends-client.tsx` has a `<MoreVertical>` icon-button per friend with `aria-label="Plus d'options pour ${friend.name}"` and **no `onClick`** — opens nothing. There is no menu, modal, or confirmation flow for unfriend or block in the entire teen UI.

### Flow I: Open DM thread → load messages
**Score: 6/10**

- `app/teen/messages/page.tsx` SSR-loads inbox from `direct_conversations`, resolves peer names from `teens`. Works.
- `messages-client.tsx`: clicking a conversation calls GET `/api/teen/messages?conversationId=…`. Endpoint marks inbound as read + zeros the unread counter. Good.
- **Mobile UX broken on returning to inbox**: `onBack` calls `setSelectedId(null)` but the inbox `conversations` prop is from SSR — the unread counter that just got reset on the server is **not refetched**, so the badge can show stale data.
- **No relative timestamp refresh** (renders once, no polling).

### Flow J: Send DM → realtime delivery
**Score: 4/10**

- Send: optimistic-append a temp message, then POST `/api/teen/messages`. Endpoint enforces friendship via `are_friends` RPC, ensures conversation via `ensure_direct_conversation` RPC, inserts into `direct_messages`, updates conversation preview + unread, inserts a `notifications` row. Solid backend.
- **No supabase realtime subscription** anywhere in `messages-client.tsx`. The recipient must reopen the thread (or refresh the page) to see incoming messages. There is also **no polling** — the conversation thread is frozen until a new send refetches.
- **Optimistic message has no error rollback** — the `catch {}` block is empty, comment says "silent — optimistic message already shown". A failed send leaves a fake "delivered" message with `read: false` forever.
- **Server response from `/api/teen/messages` POST is never consumed**: no `await res.json()`, so the temp `id` is never replaced with the real DB id — if the user later edits/deletes/reacts, there's no real ID to address.

### Flow K: DM image / file attachment
**Score: 0/10**

- `messages-client.tsx` renders `<Paperclip>` and `<ImageIcon>` buttons in the chat input. Both have **no `onClick` handler**.
- `<Phone>`, `<Video>`, `<MoreVertical>` and `<Smile>` (emoji picker) are all decorative — no handlers.
- POST `/api/teen/messages` accepts only `{ conversationId, recipientId, content }` — there's no `media_url`/`attachment_id` field, no upload pipeline, no storage bucket reference for DMs.

### Flow L: Group conversation / Circle chat
**Score: 1/10**

- `circles-client.tsx` shows a "Chat Crew" button → has **no `onClick`, no `href`**, dead.
- `social-hub-client.tsx` "Crew Chat" button — same: decorative.
- API for circles chat exists at `app/api/teen/circles/messages/route.ts` (not read in detail but file present); UI never calls it.
- Messages client only models 1:1 (`isGroup` + `participantIds` typed but UI tab/section never created).

### Flow M: Online-friends rail (dashboard)
**Score: 8/10**

- `components/teen/dashboard/online-friends.tsx` uses `usePresence({ enableRealtime: true })` — proper realtime supabase channel.
- Sorted by status (online > playing > busy > away > offline), 6-friend cap, "Inviter" tail link to `/teen/social?tab=friends`.
- Avatar links to `/teen/profile/${friend.user_id}` — separate audit owns whether that route exists.

### Flow N: Social hub at `/teen/social`
**Score: 4/10**

- Tab routing via `?tab=` URL params (`crew`, `friends`, `ranking`, `map`).
- `FriendsTab` re-implements friend list yet again (third copy after `friends-client.tsx` and the dashboard rail), with no search-server, no online filter, no requests tab.
- `RankingTab` falls back to **hard-coded fake leaderboard** (`Salma K.`, `Youssef M.`…) on any fetch failure — looks like real data.
- `MapTab` shows fake "3 friends nearby" pill + hard-coded "Gaming Night @ Casa", "Crew Meetup at Morocco Mall" cards. None are dynamic.
- "Add New Friends" button has no handler.

### Flow O: Circles / Crew
**Score: 5/10**

- `circles-client.tsx` reads SSR-loaded `myCrew`, `discoverCrews`, `leaderboard`. Renders members, stats, and discovery list with search filter.
- "Défi (bientôt)" is explicitly disabled and labelled (honest).
- "Inviter" button on crew detail has **no handler**.
- "Voir" button on each discover crew has no link.
- "Créer" button on the create-crew CTA has no handler.

---

## 2. Top 5 Broken Steps (specific failure modes)

1. **Comment thread doesn't exist** — `app/teen/feed/[id]/page.tsx` reads `comments_count` and shows a "💬 Comment" button that records a behavioral `click` signal but renders **no list of comments and no composer**. Backend is fully built (`app/api/teen/feed/comments/route.ts` supports create/update/delete/like/unlike/report including nested replies via `parent_id`); it is 100% orphaned. Users cannot actually comment on a post.
2. **Report and Block are pure `window.alert()` lies** — `app/teen/feed/feed-list.tsx` lines 119-131 and `components/feed/long-press-menu.tsx` (via `social-feed.tsx`) trigger no network calls. Users see "Merci, le post a été signalé" / "L'auteur a été bloqué" with zero DB rows written. `FriendHandlers.block` is reachable code but no HTTP route exposes it.
3. **DMs have no realtime, no attachments, no error handling** — `messages-client.tsx` does not subscribe to supabase realtime; recipient never sees an incoming message until manual refresh. `<Paperclip>` and `<ImageIcon>` buttons have no `onClick`. Failed `fetch('/api/teen/messages', POST)` is swallowed in an empty `catch {}` leaving a forever-pending optimistic bubble. Server response (with the real message id) is discarded.
4. **Friend list "Add" button and per-row "MoreVertical" do nothing** — `friends-client.tsx` lines 322-326: top-right "Ajouter" button is a `<Button>` with no `onClick`/`href`. Per-friend `<MoreVertical>` (line 564) similarly inert. No way to unfriend, block, set nickname, or favorite from the UI even though `FriendHandlers` supports all of those server-side.
5. **Like on the feed list shows stale state** — `app/teen/feed/page.tsx` doesn't query `post_likes` (or whatever join surfaces user_liked) for the calling teen. So returning users always see all hearts as un-filled, even posts they liked yesterday. Counters increment optimistically only inside `<SocialFeed>` (dashboard) but the canonical `/teen/feed` list refreshes via `router.refresh()` and reads `likes_count` straight from `feed_posts` — could go up via `toggle_post_like` toggle racing.

---

## 3. Top 5 Missing Primitives

1. **No comment UI** — the entire comment substrate (composer, thread render, reply, like-comment, report-comment) is unbuilt on the teen side. Backend is ready.
2. **No report-content UI** — no `/api/teen/feed/[id]/report` route, no modal with reason picker, no confirmation. Long-press "Signaler" is fake.
3. **No block-user UI / no DELETE /api/teen/friends route** — `FriendHandlers.{remove,block,unblock}` are unreachable from the web layer. No friend-row context menu, no blocked-users management screen.
4. **No realtime DM subscription** — needs supabase channel on `direct_messages` filtered by `conversation_id` (and a presence layer for typing indicators / read receipts beyond the basic `is_read` flag).
5. **No DM attachment pipeline** — `direct_messages` table appears to only carry `content`, the POST endpoint validates only `content`, no Supabase storage bucket wired for DM media, and the paperclip/image buttons in chat are decorative.

### Honourable mentions (would have made it to top 5 if there were 8 slots)
- **No global user search** (`/api/teen/friends/search` route doesn't exist; UI search is local-only on the loaded friends list).
- **Group chat / circle chat** — buttons exist, no UI plumbed to `app/api/teen/circles/messages`.
- **Pagination on `/teen/feed`** — hard `limit(30)`, no infinite scroll, no cursor.
- **`app/teen/social/social-hub-client.tsx` ranking + map** ship hard-coded fake data on fetch failure ("Salma K.", "Gaming Night @ Casa") that looks identical to real content.
- **Saved-posts surface** — `action: 'save'` in `engage` writes a `creator_engagement` row but no "Saved" tab anywhere in the teen app reads them back.

---

## 4. Backend Endpoint Map (for cross-reference)

| UI surface | Endpoint called | Exists? | Notes |
|---|---|---|---|
| `/teen/feed` SSR | direct supabase query on `feed_posts` | ✅ | No personalization, no pagination |
| `/teen/feed/[id]` engage | `POST /api/teen/feed/[submission_id]/engage` | ✅ | All 5 actions wired backend-side |
| Feed long-press "Report" | _none_ | ❌ | Pure `window.alert` |
| Feed long-press "Block" | _none_ | ❌ | Pure `window.alert` |
| Feed long-press "Copy/Share" | `navigator.clipboard` / `navigator.share` | ✅ (browser API) | No XP credit because no `engage` POST |
| Comments composer | `POST /api/teen/feed/comments` | ✅ backend / ❌ UI | Endpoint exists, no UI consumes it |
| Friend list | `GET /api/teen/friends` | ✅ | Mutual count hard-coded 0 in this path |
| Send friend request | `POST /api/teen/friends` | ✅ | Optimistic OK |
| Pending requests | `GET /api/teen/friends/requests?direction=incoming` | ✅ | |
| Accept request | `POST /api/teen/friends/requests/[id]/accept` | ✅ | Optimistic + celebrate |
| Decline request | `POST /api/teen/friends/requests/[id]/decline` | ✅ | Optimistic |
| Unfriend | _none_ | ❌ | Handler exists, route missing |
| Block user | _none_ | ❌ | Handler exists, route missing |
| Search teens | _none_ | ❌ | Handler exists, route missing |
| DM inbox | `GET /api/teen/messages` (SSR) + client refetch | ✅ | |
| DM thread | `GET /api/teen/messages?conversationId=…` | ✅ | Marks read |
| DM send | `POST /api/teen/messages` | ✅ | Friendship-gated |
| DM realtime | _none_ | ❌ | No supabase channel |
| DM attachment | _none_ | ❌ | No upload route, body schema text-only |
| Crew chat | `app/api/teen/circles/messages/route.ts` exists | ✅ backend / ❌ UI | Buttons inert |

---

## 5. Concrete File References

- `C:\Users\Shadow\Desktop\NIVY\app\teen\feed\page.tsx`
- `C:\Users\Shadow\Desktop\NIVY\app\teen\feed\feed-list.tsx`
- `C:\Users\Shadow\Desktop\NIVY\app\teen\feed\post-card.tsx` (legacy `<FeedPostLongPress>`, partially superseded by `feed-list.tsx`)
- `C:\Users\Shadow\Desktop\NIVY\app\teen\feed\[id]\page.tsx`
- `C:\Users\Shadow\Desktop\NIVY\app\teen\feed\[id]\engage-buttons.tsx`
- `C:\Users\Shadow\Desktop\NIVY\app\teen\friends\page.tsx`
- `C:\Users\Shadow\Desktop\NIVY\app\teen\friends\friends-client.tsx`
- `C:\Users\Shadow\Desktop\NIVY\app\teen\messages\page.tsx`
- `C:\Users\Shadow\Desktop\NIVY\app\teen\messages\messages-client.tsx`
- `C:\Users\Shadow\Desktop\NIVY\app\teen\circles\circles-client.tsx`
- `C:\Users\Shadow\Desktop\NIVY\app\teen\social\social-hub-client.tsx`
- `C:\Users\Shadow\Desktop\NIVY\components\feed\social-feed.tsx`
- `C:\Users\Shadow\Desktop\NIVY\components\feed\activity-feed.tsx`
- `C:\Users\Shadow\Desktop\NIVY\components\feed\post-composer.tsx`
- `C:\Users\Shadow\Desktop\NIVY\components\teen\dashboard\online-friends.tsx`
- `C:\Users\Shadow\Desktop\NIVY\app\api\teen\feed\[submission_id]\engage\route.ts`
- `C:\Users\Shadow\Desktop\NIVY\app\api\teen\feed\comments\route.ts`
- `C:\Users\Shadow\Desktop\NIVY\app\api\teen\friends\route.ts`
- `C:\Users\Shadow\Desktop\NIVY\app\api\teen\friends\handlers.ts`
- `C:\Users\Shadow\Desktop\NIVY\app\api\teen\friends\requests\route.ts`
- `C:\Users\Shadow\Desktop\NIVY\app\api\teen\friends\requests\[id]\accept\route.ts`
- `C:\Users\Shadow\Desktop\NIVY\app\api\teen\friends\requests\[id]\decline\route.ts`
- `C:\Users\Shadow\Desktop\NIVY\app\api\teen\messages\route.ts`
- `C:\Users\Shadow\Desktop\NIVY\app\api\teen\messages\[conversationId]\route.ts`

---

## Summary Scorecard

| Flow | Score |
|---|---:|
| A. Discover feed | 7/10 |
| B. Open post detail → like/comment/share | 4/10 |
| C. Like on dashboard `<SocialFeed>` | 6/10 |
| D. Share | 5/10 |
| E. Report / Block content | 1/10 |
| F. Friends list + search | 7/10 |
| G. Friend request send/accept/decline | 8/10 |
| H. Unfriend / Block | 0/10 |
| I. Open DM thread | 6/10 |
| J. Send DM (realtime) | 4/10 |
| K. DM attachment | 0/10 |
| L. Group / circle chat | 1/10 |
| M. Online-friends dashboard rail | 8/10 |
| N. `/teen/social` hub | 4/10 |
| O. Circles / Crew | 5/10 |
| **Overall** | **4.4/10** |

**Headline**: The friend-request loop is the only end-to-end flow on the social side that meets a launchable bar. Feed engagement, DMs, and any moderation/safety primitive (report/block) are either backend-only with no UI, or UI-only with no backend (lying to the user). Comments — arguably the highest-leverage missing piece for a "feed" — have a complete server but zero client surface.
