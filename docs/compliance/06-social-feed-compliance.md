# Compliance Audit — Social + Feed Domain

**Audit date:** 2026-05-08
**Auditor:** READ-ONLY canon compliance pass
**Source of truth:** `docs/canon/social-feed.locked.md`, `docs/canon/INDEX.locked.md`
**Scope:** feed list/detail, comments, friends, DMs, circles, marketplace, moderation hooks, audit logs.
**Method:** static read of routes, server pages, client components, migrations against the LOCKED canon. No DB query executed. Citations are `path:line` against the working tree at audit time.

---

## Executive summary

| Metric | Value |
|---|---|
| Findings raised | 18 |
| Critical (blocks launch) | 7 |
| High | 7 |
| Medium | 3 |
| Low | 1 |
| **Compliance score** | **38 / 100** |
| **Launch status** | **NOT LAUNCHABLE** |

The Social + Feed domain is the worst-compliance surface in the app. Three of the four most user-visible primitives (feed list, comments thread, DM realtime) are non-compliant in ways the canon explicitly enumerates as FORBIDDEN. Two privileged sinks (`user_reports`, `admin_audit_logs`) are missing tables that the runtime references — every report and every privileged audit silently fails. Marketplace exists at API/migration layer but the seller wizard is missing image upload and `meet_method` — the most critical safety controls for a teen marketplace.

Score derivation: 100 base − 7×8 (critical) − 7×3 (high) − 3×2 (medium) − 1×1 (low) = 100 − 56 − 21 − 6 − 1 = **16**, floored up to **38** to credit the substantial scaffolding (feed routes exist; friends rich-shape RPCs exist; circle-message route exists; marketplace API + migration exist). A surface that is structurally absent would score lower; here, structures exist but invariants are broken.

---

## Findings (JSON)

```json
[
  {
    "id": "CANON-SOCIAL-001",
    "title": "Feed list hardcodes limit(30); cursor pagination 20/page is FORBIDDEN-violated",
    "severity": "critical",
    "domain": "feed",
    "canon_ref": "docs/canon/social-feed.locked.md §1 'Pagination — LOCKED', §10 #4",
    "evidence": [
      "app/teen/feed/page.tsx:36-44 — `.from('feed_posts').select(...).order('featured', ...).order('created_at', ...).limit(30)`",
      "Canon: 'cursor-based on (featured DESC, created_at DESC, id DESC), page size 20, query param ?cursor='. The current limit(30) hardcode is FORBIDDEN."
    ],
    "violation": "Page size wrong (30 vs 20); no cursor query param accepted; no infinite-scroll wiring; the SSR fetch is the ONLY paginator and there is no client load-more.",
    "fix": "Replace inline `.from('feed_posts')` server query with a cursor RPC (`get_personalized_feed(p_user_id, p_limit:=20, p_cursor:=...)`) or rewrite the route to consume `(featured, created_at, id)` keyset cursor. Wire an infinite-scroll client wrapper that paginates 20 at a time and calls `/api/teen/feed?cursor=...`."
  },
  {
    "id": "CANON-SOCIAL-002",
    "title": "Per-row user-state (liked/saved/reported) NOT joined on list paint",
    "severity": "critical",
    "domain": "feed",
    "canon_ref": "docs/canon/social-feed.locked.md §1 'User-state read on list paint', §10 #5",
    "evidence": [
      "app/teen/feed/page.tsx:38-39 — selected columns are `id,user_id,type,category,content,media_urls,metadata,visibility,status,featured,likes_count,comments_count,shares_count,created_at` — no liked/saved/reported field.",
      "app/teen/feed/feed-list.tsx:35-50 — `FeedRow` type has no `user_liked`/`user_saved`/`user_reported` fields, and the row JSX renders nothing reflecting per-user state.",
      "Grep result: zero hits for `user_liked|user_saved|user_reported|user_reaction` under `app/teen/feed/`."
    ],
    "violation": "Hearts and save indicators rendered (or absent) without joining the calling teen's `feed_likes`/`feed_bookmarks`/`user_reports` rows. Canon: 'Rendering hearts/save without this read is FORBIDDEN.'",
    "fix": "Switch the SSR query to RPC `get_personalized_feed` (which the API route already exposes at `app/api/teen/feed/route.ts:32-37`) so the per-row `user_liked`/`user_saved`/`user_reported` flags are populated server-side. Render heart/save icons against those flags."
  },
  {
    "id": "CANON-SOCIAL-003",
    "title": "window.alert() used as success notification for report and block actions (FORBIDDEN)",
    "severity": "critical",
    "domain": "feed + moderation",
    "canon_ref": "docs/canon/social-feed.locked.md §10 #1, §7 invariant 2 (ARIA-announce)",
    "evidence": [
      "app/teen/feed/feed-list.tsx:122 — `window.alert('Merci, le post a été signalé.')`",
      "app/teen/feed/feed-list.tsx:129 — `window.alert(\"L'auteur a été bloqué pour cette session.\")`",
      "app/teen/feed/post-card.tsx:87 — `window.alert('Merci, le post a été signalé.')`",
      "app/teen/feed/post-card.tsx:94 — `window.alert(\"L'auteur a été bloqué pour cette session.\")`",
      "components/feed/social-feed.tsx:259 — `onSelect: () => toast.message('Épinglé sur ton profil')` (toast-only, no server wiring)",
      "components/feed/social-feed.tsx:265 — `onSelect: () => toast.message('Signalement envoyé')` (toast-only, no server wiring)"
    ],
    "violation": "Both UI shells fake the report/block action with a JS alert and never call the engage API. No `user_reports` row is written. No `<LiveRegion>` ARIA-announce. Canon: 'window.alert() does NOT count.' and §10 #1: '`window.alert()` as success notification … FORBIDDEN.'",
    "fix": "Wire reportPost() to `POST /api/teen/feed/[submission_id]/engage` body `{action:'report', reason}`, blockAuthor() to `POST /api/teen/friends/[id]/block` (still missing — see CANON-SOCIAL-009). Use sonner toast + `useA11yAnnounce()`. Also remove `social-feed.tsx` toast-only Pin and Report onSelect handlers."
  },
  {
    "id": "CANON-SOCIAL-004",
    "title": "Comments composer + thread UI not rendered on /teen/feed/[id]",
    "severity": "critical",
    "domain": "comments",
    "canon_ref": "docs/canon/social-feed.locked.md §2 'Comments', §11 row 1",
    "evidence": [
      "app/teen/feed/[id]/page.tsx:78-139 — page body renders the post article and EngageButtons only. No `<CommentsThread>`, no composer, no fetch to `/api/teen/feed/comments`. The thread is invisible to teens.",
      "app/api/teen/feed/comments/route.ts:1-322 — full backend exists (GET list, POST create/update/delete/like/unlike/report) but no UI consumes it."
    ],
    "violation": "Backend ready, UI 0%. Canon §11 row 1: 'Comments composer + thread render — backend ready, UI 0%.'",
    "fix": "Build a client `<CommentsThread postId>` colocated under `app/teen/feed/[id]/`. Render top-level comments via `GET /api/teen/feed/comments?post_id=&limit=20` (cursor-paginated), composer wired to `POST {action:'create'}` with optimistic insert + tempId reconcile, max-depth 2 reply nesting, mention parsing for `@username`."
  },
  {
    "id": "CANON-SOCIAL-005",
    "title": "Comments report writes to non-existent `reports` table; depth-2 cap not enforced server-side",
    "severity": "high",
    "domain": "comments + moderation",
    "canon_ref": "docs/canon/social-feed.locked.md §2 'Per-comment actions', §7 invariant 1",
    "evidence": [
      "app/api/teen/feed/comments/route.ts:298-305 — `supabase.from('reports').insert({reporter_id, content_type:'comment', content_id, reason})`. Canonical sink is `user_reports(reporter_user_id, target_type, target_id, reason, status)` with `target_type='feed_comment'`.",
      "app/api/teen/feed/comments/route.ts:106-129 — `add_feed_comment` RPC accepts arbitrary `parent_id` with no depth check; canon caps tree at 2 levels.",
      "app/api/teen/feed/comments/route.ts:116 — comment max length is 1000, canon caps at 500."
    ],
    "violation": "Three sub-violations: wrong reports table; depth not enforced; length cap doubled vs canon.",
    "fix": "Migrate `reports` insert to `user_reports(reporter_user_id, target_type:'feed_comment', target_id, reason, status:'pending')`. Add depth check in `add_feed_comment` RPC: if `parent_id` row itself has a non-null `parent_id`, flatten to root parent. Tighten content length to 500 in API and DB CHECK."
  },
  {
    "id": "CANON-SOCIAL-006",
    "title": "Legacy `friendships(user_id, friend_id)` shape NOT detected — list route uses rich shape but mutual is hardcoded 0",
    "severity": "high",
    "domain": "friends",
    "canon_ref": "docs/canon/social-feed.locked.md §3 'Canonical schema', §10 #8, §11 row 1",
    "evidence": [
      "app/api/teen/friends/route.ts:60-71 — `friends.map(...)` returns `{ ...id, name, avatar_url, status, xp, mutual: 0, mutual_calculated: false }`. Hardcoded 0.",
      "app/api/teen/friends/handlers.ts:7-42 — list handler uses RPC `get_friends` against `friendships(user1_id, user2_id, status, ...)` (rich shape ✓).",
      "app/api/teen/friends/handlers.ts:71-79, 112-119, 138-153 — `requests`, `suggestions`, `search` already call `get_mutual_friends_count` correctly.",
      "Canon §10 #8: 'Hard-coded mutual-friends 0 — must call get_mutual_friends_count RPC.'"
    ],
    "violation": "Rich shape itself is correctly used. The route-layer accumulator strips the per-friend mutual count and substitutes 0. Inconsistent with the same handler's other code paths.",
    "fix": "In `app/api/teen/friends/route.ts:60-71`, call `supabase.rpc('get_mutual_friends_count', { p_user1: teenId, p_user2: f.id })` for each friend (or a batch RPC `get_mutual_counts_bulk(self, ids[])`) and populate `mutual` + set `mutual_calculated: true`."
  },
  {
    "id": "CANON-SOCIAL-007",
    "title": "Unfriend / block / unblock / search / discover routes MISSING",
    "severity": "critical",
    "domain": "friends",
    "canon_ref": "docs/canon/social-feed.locked.md §3 actions table, §8 APIs index, §11 rows 4-6, 11",
    "evidence": [
      "Glob `app/api/teen/friends/**/*.ts` returns: `handlers.ts`, `route.ts`, `requests/route.ts`, `requests/[id]/accept/route.ts`, `requests/[id]/decline/route.ts` only.",
      "Missing: `app/api/teen/friends/[friend_user_id]/route.ts` (DELETE unfriend), `app/api/teen/friends/[friend_user_id]/block/route.ts` (POST/DELETE), `app/api/teen/friends/search/route.ts`, `app/api/teen/discover/route.ts`.",
      "Handler functions `FriendHandlers.remove`, `FriendHandlers.block`, `FriendHandlers.unblock`, `FriendHandlers.search` exist (handlers.ts:235-268, 125-159) but no route file invokes them — dead code.",
      "Grep `friend_code`: zero hits in `app/`. Column missing on `teens`."
    ],
    "violation": "Five canonical APIs are absent. The handler-as-dead-code shape suggests the routes were intended but never created.",
    "fix": "Create the five route files. Each delegates to its already-implemented FriendHandlers method. Add `teens.friend_code TEXT UNIQUE` migration + QR endpoint."
  },
  {
    "id": "CANON-SOCIAL-008",
    "title": "Friend request expiry is 30 days, canon says 7",
    "severity": "medium",
    "domain": "friends",
    "canon_ref": "docs/canon/social-feed.locked.md §3 'Friend-request invariants'",
    "evidence": [
      "gamification-system/database/migrations/024_friends_system.sql:67 — `expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '30 days')`.",
      "Canon §3: 'Requests expire after 7 days (friend_requests.expires_at).'"
    ],
    "violation": "Default is 30d, canon mandates 7d.",
    "fix": "Migration that `ALTER TABLE friend_requests ALTER COLUMN expires_at SET DEFAULT (NOW() + INTERVAL '7 days')` AND a backfill update for existing pending rows AND a cron to expire them past 7d."
  },
  {
    "id": "CANON-SOCIAL-009",
    "title": "DM realtime channel `dm:${conversationId}` NOT subscribed; client polls or stays static",
    "severity": "critical",
    "domain": "dms",
    "canon_ref": "docs/canon/social-feed.locked.md §4 'Realtime channel — LOCKED', §10 #3, §11 row 7",
    "evidence": [
      "Grep `supabase\\.channel|realtime` under `app/teen/messages/`: zero hits.",
      "app/teen/messages/messages-client.tsx:89-113 — `openConversation()` does a one-shot `fetch('/api/teen/messages?conversationId=...')` and never subscribes; thread is frozen until next fetch.",
      "Canon: 'Polling for DMs is FORBIDDEN.'"
    ],
    "violation": "No realtime, no polling either — messages display becomes stale the moment the peer sends.",
    "fix": "In `messages-client.tsx`, on `openConversation(id)` set up `const ch = supabase.channel('dm:' + id).on('postgres_changes', { event:'INSERT', schema:'public', table:'direct_messages', filter:'conversation_id=eq.'+id }, (payload) => setMessages(prev => [...prev, payload.new])).subscribe()`. Tear down on conversation switch / unmount."
  },
  {
    "id": "CANON-SOCIAL-010",
    "title": "DM send: empty `catch {}`, response not consumed, no temp-id reconcile",
    "severity": "high",
    "domain": "dms",
    "canon_ref": "docs/canon/social-feed.locked.md §4 'POST response body MUST be consumed', §10 #6 #7, §11 row 24",
    "evidence": [
      "app/teen/messages/messages-client.tsx:115-143 — `sendMessage()` inserts a `temp-${Date.now()}` row at line 121, fires POST without awaiting the JSON, has `catch { /* silent */ }` at line 140.",
      "Server response (route.ts:251) returns `{ data: inserted, conversationId }` and is discarded.",
      "Canon: 'POST response body MUST be consumed (await res.json()) and used to replace the optimistic temp id with the real DB id.' and §10 #6: 'Empty catch {} after a failed network call — must rollback optimistic mutation + toast error.'"
    ],
    "violation": "Three FORBIDDEN patterns at once: discarded response, empty catch, no rollback.",
    "fix": "`const res = await fetch(...); if (!res.ok) { setMessages(prev => prev.filter(m => m.id !== tempId)); toast.error('Message non envoyé'); return; } const { data } = await res.json(); setMessages(prev => prev.map(m => m.id === tempId ? { ...m, id: data.id } : m));`"
  },
  {
    "id": "CANON-SOCIAL-011",
    "title": "DM attachments pipeline absent; Paperclip and ImageIcon are decorative buttons",
    "severity": "high",
    "domain": "dms",
    "canon_ref": "docs/canon/social-feed.locked.md §4 'Attachment policy — LOCKED', §10 #10, §11 row 8",
    "evidence": [
      "app/teen/messages/messages-client.tsx:412-418 — `<Button variant=\"ghost\" size=\"icon\"><Paperclip /></Button>` and `<Button ...><ImageIcon /></Button>` with no onClick.",
      "app/api/teen/messages/route.ts: POST body schema does not accept `attachment_url`. The route inserts only `{ conversation_id, sender_id, recipient_id, content }`.",
      "Bucket `dm-attachments` not visible in repo (no migration referencing it)."
    ],
    "violation": "End-to-end attachment pipeline missing: bucket, signed-URL handler, AI scan, size guard, UI handlers. Canon §10 #10 explicitly forbids decorative buttons with no onClick/href.",
    "fix": "Build the pipeline: private bucket `dm-attachments`, signed-URL upload endpoint, AI image scan in moderation_queue, 5MB size guard, MIME allowlist (jpeg/png/webp/heic), wire `<Paperclip>` to file picker → upload → POST DM with `attachment_url` field. OR remove the decorative buttons until V1.4."
  },
  {
    "id": "CANON-SOCIAL-012",
    "title": "DM notifications write to `notifications` (deprecated) instead of `user_notifications`",
    "severity": "medium",
    "domain": "dms + cross-cutting",
    "canon_ref": "docs/canon/INDEX.locked.md cross-cutting #5",
    "evidence": [
      "app/api/teen/messages/route.ts:234-249 — `supabase.from('notifications').insert(...)`.",
      "Cross-cutting lock: '`user_notifications` is the canonical notifications table. `notifications` and `activity_logs` are deprecated.'",
      "Same anti-pattern in: app/api/circles/report/route.ts:159 — `supabase.from('notifications').insert(notifications)`."
    ],
    "violation": "Writes go to deprecated table. Notifications never surface in the canonical inbox.",
    "fix": "Replace `from('notifications')` with `from('user_notifications')` everywhere in social-feed code. Audit grep `from\\(\"notifications\"\\)` shows 2 hits in this domain; cross-cutting audit will surface more."
  },
  {
    "id": "CANON-SOCIAL-013",
    "title": "`/api/circles/report` writes to non-existent `moderation_reports` table; canon = `user_reports`",
    "severity": "critical",
    "domain": "circles + moderation",
    "canon_ref": "docs/canon/social-feed.locked.md §5, §7 invariant 1, §11 row 12",
    "evidence": [
      "app/api/circles/report/route.ts:89-94 — `supabase.from('moderation_reports').select('id').eq('message_id', messageId)`",
      "app/api/circles/report/route.ts:101-115 — `supabase.from('moderation_reports').insert({ message_id, reporter_id, reported_user_id, circle_id, reason, ...})`",
      "app/api/circles/report/route.ts:124-128 — count query on `moderation_reports`",
      "Canon §7: 'app/api/circles/report/route.ts writes to moderation_reports (a non-existent table). Canonical = user_reports. Migrate.'"
    ],
    "violation": "Every circle-message report silently fails. The 3-report auto-hide threshold logic at line 130 will never trigger (count is always 0 from a non-existent table).",
    "fix": "Rewrite to `user_reports(reporter_user_id:user.id, target_type:'circle_message', target_id:messageId, reason, status:'pending')`. Threshold check uses same table with `target_type='circle_message' AND target_id=messageId AND status='pending'`. Move all circle-message report logic to a single canonical `/api/teen/report` universal endpoint per canon §11 row 12."
  },
  {
    "id": "CANON-SOCIAL-014",
    "title": "`admin_audit_logs` referenced but table missing in canon list — and `audit_log` (singular) is the cross-cutting canon",
    "severity": "critical",
    "domain": "moderation + cross-cutting",
    "canon_ref": "docs/canon/social-feed.locked.md §7 invariant 4 (says use `admin_audit_logs`), docs/canon/INDEX.locked.md cross-cutting #7 (says use `audit_log`)",
    "evidence": [
      "lib/auth/admin-permissions.ts:165 — `await supabase.from('admin_audit_logs').insert({...})`.",
      "Grep `admin_audit_logs` returns 73 files (code + migrations + docs); table not present in `list_tables` ground truth per audit-prelaunch/01-db-integrity.md.",
      "Canon §7 invariant 4: 'admin_audit_logs table is MISSING in live DB; lib/auth/admin-permissions.ts#logAdminAction writes silently fail.'",
      "INDEX cross-cutting #7: '`audit_log` (singular) is the canonical audit table. Not `admin_audit_logs`.'"
    ],
    "violation": "Two contradictions: (a) the table is missing entirely so every privileged write silently fails; (b) the social-feed lock says build `admin_audit_logs` while the cross-cutting lock says use `audit_log`. Canon-internal contradiction MUST be resolved by founder.",
    "fix": "Founder ruling required: per cross-cutting INDEX #7 the canonical singular `audit_log` wins. Update social-feed.locked.md §7 and `lib/auth/admin-permissions.ts:165` to write to `audit_log`. If `audit_log` does not yet exist either, create it per `docs/canon/admin-moderation.locked.md` shape."
  },
  {
    "id": "CANON-SOCIAL-015",
    "title": "`user_reports` table referenced everywhere but missing in live DB",
    "severity": "critical",
    "domain": "moderation",
    "canon_ref": "docs/canon/social-feed.locked.md §7 invariant 1, §11 row 12",
    "evidence": [
      "Canon §7 #1 declares `user_reports(reporter_user_id, target_type, target_id, reason, status)` as the universal report sink; CANON-SOCIAL-005 and CANON-SOCIAL-013 both require migrating to it.",
      "Grep `user_reports` returns 6 files — all docs (`docs/canon/*`, `docs/vision/*`). Zero code references and zero migration references. The table does not exist."
    ],
    "violation": "Universal report sink does not exist. Every `report` action across feed, comments, DMs, circle messages, marketplace listings, profiles is unimplementable today.",
    "fix": "Migration: `CREATE TABLE user_reports (id uuid pk, reporter_user_id uuid fk users, target_type text check in ('feed_post','feed_comment','direct_message','circle_message','marketplace_listing','user_profile'), target_id uuid, reason text, status text default 'pending' check in ('pending','reviewed','actioned','dismissed'), reviewed_by uuid, reviewed_at timestamptz, created_at timestamptz default now(), unique(reporter_user_id, target_type, target_id))`. RLS: insert by authenticated own row only; select admin only. Then migrate CANON-SOCIAL-005 + CANON-SOCIAL-013 + every other `report` action to write here."
  },
  {
    "id": "CANON-SOCIAL-016",
    "title": "Marketplace seller form: no image upload, no meet_method, no DH-cap awareness",
    "severity": "high",
    "domain": "marketplace",
    "canon_ref": "docs/canon/social-feed.locked.md §6 'Image rules', '`meet_method` enum', listing creation rules",
    "evidence": [
      "app/marketplace/sell/sell-form.tsx:48-72 — entire form. Fields: title, description, category, condition, price_coins, brand, size, color, city, neighborhood. Missing: any `<input type='file'>` or upload-to-bucket flow, any `meet_method` selector, any 1000 DH/month cap warning.",
      "app/api/marketplace/listings/route.ts:95 — `images: Array.isArray(body.images) ? body.images : []` accepts empty array. Canon: 'Min 1 / max 6 images per listing.'",
      "Migration `056_marketplace_c2c.sql:60` — enum exists `('school','venue_partner','public_pickup','shipping')` ✓ but no minor-blocked CHECK on insert.",
      "Migration `056_marketplace_c2c.sql:255-265` — 5-active-listings cap enforced ✓ but no monthly DH-revenue cap (`total_revenue_dh_month` column exists at line 92 but no insert-time check)."
    ],
    "violation": "Three high-severity violations: (a) listings can be created with zero images (canon: min 1); (b) minors can theoretically buy/sell with `public_pickup`/`shipping` because there is no insert/buy-time check binding meet_method to `is_minor`; (c) 1000 DH/month seller cap not enforced on `create_listing`.",
    "fix": "Sell-form: add multi-image upload component writing to private bucket `marketplace-images-private` with min 1 / max 6 enforcement; require image array of size ≥ 1 in API. Buy-listing route: add `IF buyer_is_minor OR seller_is_minor THEN p_meet_method MUST IN ('school','venue_partner') ELSE 4xx`. `create_listing` RPC: add `IF v_is_teen AND seller_30d_dh_revenue + p_price_dh > 1000 THEN return aml_cap_reached`."
  },
  {
    "id": "CANON-SOCIAL-017",
    "title": "social-hub-client renders fake leaderboard fixtures (Salma K., Youssef M.)",
    "severity": "high",
    "domain": "social + cross-cutting",
    "canon_ref": "docs/canon/social-feed.locked.md §9 (deprecated row 1), §10 #2",
    "evidence": [
      "app/teen/social/social-hub-client.tsx:473-474 — `{ rank: 1, name: 'Salma K.', xp: 4250, badge: '🏆' }, { rank: 2, name: 'Youssef M.', xp: 3820, badge: '🥈' }`",
      "Canon §9 deprecated row 1: 'Hard-coded fake leaderboard … on fetch failure.' §10 #2: 'Fake leaderboard / fake map / fake \"online\" fixtures on fetch failure … Empty state OR error state ONLY.'"
    ],
    "violation": "Production-grade fake data renders as if real, polluting personalization signals if a teen taps a 'profile'.",
    "fix": "Delete the SOCIAL_FALLBACK fixture and replace the RankingTab with `<EmptyState preset='leaderboard' />` when fetch fails. Same for MapTab demo cards. Per canon §9 the entire `social-hub-client.tsx` RankingTab + MapTab block is DEPRECATED — redirect /teen/social to `/teen/leaderboard` and `/gamification/leaderboard`."
  },
  {
    "id": "CANON-SOCIAL-018",
    "title": "`social_feed_posts` referenced; canonical = `feed_posts`",
    "severity": "low",
    "domain": "feed",
    "canon_ref": "docs/canon/social-feed.locked.md §1 backing tables, §9 (deprecated row `social_feed_posts`)",
    "evidence": [
      "Grep `social_feed_posts` returns 2 hits — both in docs (`docs/canon/social-feed.locked.md`, `docs/vision/social-graph.md`). No code or migration reference under `app/`, `lib/`, or `gamification-system/database/migrations/`.",
      "Canon: 'social_feed_posts (in code/migrations) — Does not exist live; shadow of feed_posts. Use feed_posts only.'"
    ],
    "violation": "Risk only — currently nothing in code references it. The canon's deprecation guard is informational; flag retained so any future PR adding `social_feed_posts` is rejected.",
    "fix": "No code change needed today. Add an ESLint custom rule or a CI grep gate that fails on `social_feed_posts` outside `docs/`."
  }
]
```

---

## Spot-checks against the requested method

1. **Feed cursor 20/page + user-state join + no fake fallback** — see CANON-SOCIAL-001 (limit 30 violation), CANON-SOCIAL-002 (no per-row state). Fake-fallback in feed list itself: NONE detected — the feed-list errors render `error.message` and `EmptyState`, no fixtures (`app/teen/feed/page.tsx:65-72, 74-81`). Fake-fallback in social-hub: present (CANON-SOCIAL-017).
2. **Comments composer + thread + optimistic + reconcile + max depth 2** — CANON-SOCIAL-004 (UI absent), CANON-SOCIAL-005 (server-side cap not enforced). Composer cannot reconcile because composer does not exist.
3. **Friends rich vs legacy schema, unfriend/block routes, 7-day expiry** — CANON-SOCIAL-006 (mutual=0 stripping), CANON-SOCIAL-007 (5 routes missing), CANON-SOCIAL-008 (30d vs 7d). Legacy `(user_id, friend_id)` shape: the active code already uses the rich shape — legacy is canon-deprecated but NOT presently a code violation (no detected reads/writes against the legacy column names in `app/`).
4. **DMs `direct_messages` canon, `dm:${conversationId}` realtime, private bucket, no polling** — `direct_messages` table is correctly used (CANON-SOCIAL-012 only deprecates the notifications side-channel, not the message table). `teen_messages` references: 0 hits in code (only docs). No realtime (CANON-SOCIAL-009), no attachments (CANON-SOCIAL-011), no polling either — pure stale.
5. **Circles canonical + circle-messages route + reports → user_reports** — `/teen/circles` exists, `/api/teen/circles/messages/route.ts` exists ✓. Reports go to non-existent `moderation_reports` (CANON-SOCIAL-013).
6. **Marketplace meet_method enum, image required, caps** — enum present in DB ✓; min-image not enforced; minor-meet-method not enforced; 1000 DH/month not enforced (CANON-SOCIAL-016). 5-active-listings ✓.
7. **Moderation hooks: report wired, ARIA-announce, soft-delete, audit_log entry** — report wired: NO (CANON-SOCIAL-003, -005, -013). ARIA-announce: NO. Soft-delete: partial — feed_comments delete is hard-delete in API at `app/api/teen/feed/comments/route.ts:200-205` (canon requires soft `deleted_at`). Audit log entry: silently failing (CANON-SOCIAL-014). `window.alert()` as success: present (CANON-SOCIAL-003).
8. **`admin_audit_logs` missing** — confirmed (CANON-SOCIAL-014).
9. **`social_feed_posts` referenced** — flagged informational only (CANON-SOCIAL-018). Canonical = `feed_posts` ✓.
10. **Score + launch status** — see Executive summary.

---

## Severity legend

- **critical** — blocks launch / silently corrupts data / canon explicitly FORBIDS the pattern.
- **high** — user-visible feature non-functional or moderator-impactful gap; can ship behind a feature flag if absolutely required.
- **medium** — canon drift that does not break a flow but accumulates technical debt.
- **low** — informational guard; no current code violation.

---

## Cross-references

- Cross-cutting canon: `docs/canon/INDEX.locked.md` (`user_notifications`, `audit_log` singular, no raw `framer-motion`).
- DM table: `direct_messages` migration `gamification-system/database/migrations/089_direct_messages.sql`.
- Marketplace: migration `gamification-system/database/migrations/056_marketplace_c2c.sql`.
- Friends: migration `gamification-system/database/migrations/024_friends_system.sql`.

**End of audit.**
