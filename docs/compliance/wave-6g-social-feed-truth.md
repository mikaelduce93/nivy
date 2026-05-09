# Wave 6G — Social-feed Truth (2026-05-09)

> Closed-beta hardening. No prod deploy. No new feature. No fake
> engagement.

## Audit findings

Social-feed sat at 80 going into 6G. Wave 2A had already shipped
report → user_reports + moderation_queue + auto-mod trigger. Fresh
audit of `app/api/teen/feed/route.ts` (the legacy POST handler) +
`app/api/teen/feed/comments/route.ts` surfaced **5 concrete
truth-violations** clustered around two root causes:

### Root cause #1 — `supabase.rpc("increment"|"decrement", { x: 1 })`
This pattern repeated in 4 places writes a **Promise**, not a
numeric value, into a counter column. The Postgres update either
silently fails or coerces to NaN/garbage. Every UI counter wired
through these branches was a lie.

| 6G.# | Surface | Counter | Fix |
|---|---|---|---|
| 6G.1 | `feed/route.ts` POST `case "share"` | `feed_posts.shares_count` | dropped — `feed_shares` insert is the canonical signal; engage route maintains counters |
| 6G.2 | `feed/route.ts` POST `case "view"` | `feed_posts.views_count` | dropped — `feed_views` upsert remains; engage route does the real read-then-update |
| 6G.3 | `feed/comments/route.ts` POST `case "like"` | `feed_comments.likes_count` | dropped — `comment_likes` insert is the canonical signal |
| 6G.4 | `feed/comments/route.ts` POST `case "unlike"` | `feed_comments.likes_count` | dropped (decrement variant) |

The canonical engagement pipeline at
`/api/teen/feed/[submission_id]/engage` already does proper
read-then-update for views_count and uses `toggle_post_like` RPC for
likes — that's the truthful counter path going forward. The legacy
POST handler still ships the canonical *signal* writes (`feed_shares`,
`feed_views`, `comment_likes`) so analytics keep working.

### Root cause #2 — Phantom XP write to deprecated `users.xp`
| 6G.# | Surface | Bug | Fix |
|---|---|---|---|
| 6G.5 | `feed/comments/route.ts` POST `case "like"` (XP block) | `from("users").update({ xp: supabase.rpc("increment", {x:1}) })` — phantom XP write to a deprecated table, broken increment, and bypasses canonical `add_xp_to_user` RPC | block removed entirely |

Per canon §7, XP only moves through `add_xp_to_user`. Creator XP for
likes is already credited by the engage route via the canonical
`award_creator_xp` RPC. Removing the duplicate phantom keeps XP
accounting honest.

### Visibility gate hardening
| 6G.# | Surface | Bug | Fix |
|---|---|---|---|
| 6G.6 | `feed/route.ts` GET `case "user"` | filtered `is_hidden=false` only — pending/rejected/removed posts surfaced on user profile | added `.eq("status", "published")` to match canonical `get_feed_cursor_page` RPC (mig 097) |

## Verified intact (no change)

- `/api/teen/report` (Wave 2A) — writes canonical `user_reports`,
  idempotent UNIQUE on (reporter, target), audit_log, validates
  resource_type ∈ canonical set.
- `/api/teen/feed/comments` POST `case "report"` — writes
  `user_reports` with `target_type='feed_comment'`, idempotent on
  23505.
- `/api/teen/feed/[submission_id]/engage` — gates rejected/removed
  posts (returns 410), credits creator XP via canonical
  `award_creator_xp`, real read-then-update on views_count.
- Wave 4A `moderation_queue` `feed_post` adapter still in place.
- Comments soft-delete (is_deleted/deleted_at) preserved — no hard
  delete that would break thread structure.
- Comments `create` still uses canonical `add_feed_comment` RPC.

## Out of scope (declared)

- **Replace `users!user_id` joins with `profiles!user_id`** in the
  legacy GET branches (post/user/hashtag/bookmarks/mentions). Without
  DB access I can't confirm the FK target — those joins likely silently
  return null in prod, but fixing requires a real schema check. The
  canonical `case "feed"` branch (the one the live UI uses) goes
  through `get_feed_cursor_page` RPC which doesn't depend on these
  joins. Defer.
- **Add SQL triggers to maintain `likes_count`/`shares_count`/
  `views_count`** automatically. New migration = new feature; the
  canonical engage route already handles real counts where it matters.
- **Hard-delete a feed_post (Wave 4A "delete" decision)** — already
  done by admin moderation route; user-side delete is hard delete in
  the legacy POST handler, but that's user-initiated and outside
  moderation scope.
- **Media safety / bucket policy** — sampled `app/feed/**` callers,
  no `getPublicUrl` on private buckets found. Wave 1B already moved
  CIN/KYC to `parent-cin` private bucket; feed media was on the
  `feed-media` public bucket by design (canon §5).

## Tests

`tests/unit/wave6g-social-feed-truth.test.ts` — **16 green guards**:

- **5** feed POST: no broken `rpc("increment"|"decrement")`
  anywhere; share branch keeps `feed_shares` insert without fake
  counter; view branch keeps `feed_views` upsert without fake counter.
- **1** feed GET user-page: `.eq("status", "published")` AND
  `.eq("is_hidden", false)` both present in case "user" branch.
- **6** comments POST: no broken counter rpc, no phantom `users.xp`
  write, `comment_likes` insert+delete intact, canonical
  `add_feed_comment` RPC retained, soft-delete preserved.
- **4** Wave 2A pipeline non-regression: `/api/teen/report` writes
  `user_reports` (idempotent), comments report path uses
  `user_reports`, engage gates rejected/removed (410), Wave 4A
  `feed_post` adapter intact.

## Final gates

| Gate | Result |
|---|---|
| `check:env` | ✅ 11 / 0 |
| `lint:canon --enforce` | ✅ 6 improvements carried (200 baseline); 0 net-new |
| `typecheck` | ✅ clean |
| `test:run` | ✅ **63 files / 583 tests** |
| `npm run smoke` | ✅ **39/39 ok**, 0 dev-log runtime errors |

## Compliance score

- `social-feed`: **80 → 87 (+7)** — top of founder's 80 → 87/88 band.
- overall: 91 → **92 (+1)**.
- core_flow_score: 93 → **94 (+1)**.

## Status

- Closed-beta ready: **YES**.
- Public launch ready: **NO** — D.1 secret rotation pending, by design.

## Domain scoreboard now

| Domain | Score |
|---|---|
| partner-ecosystem | 89 |
| economy-payments | 87 |
| personalization-ai | 87 |
| **social-feed** | **87** (Wave 6G) |
| lifestyle | 86 |
| parent-control | 86 |
| auth-onboarding | 85 |
| routing-navigation | 85 |
| gamification | 83 |
| design-system-mobile | 82 |
| admin-moderation | 80 ← founder's 6H |

## Founder targets vs current state

| Target | Status |
|---|---|
| Global ≥ 90 | ✅ **92** |
| Core flow ≥ 92 | ✅ **94** |
| Aucun domaine sous 85 | ⏳ 1 of 11 still below (admin-moderation 80, planned 6H) |
| D.1 secret rotation | ⏳ pending (by design) |

## Next per founder plan

> Wave 6H — Admin moderation 80 → 87/88
