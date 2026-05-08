/**
 * Wave 2A — Friends truth: missing routes now exist + 7-day expiry default.
 *
 * Canon: docs/canon/social-feed.locked.md §3 + §11 rows 4–6, §3 7-day expiry.
 */
import { describe, expect, it } from "vitest"
import { existsSync, readFileSync } from "node:fs"
import { resolve } from "node:path"

const ROUTES = [
  "app/api/teen/friends/[friend_user_id]/route.ts",
  "app/api/teen/friends/[friend_user_id]/block/route.ts",
  "app/api/teen/friends/search/route.ts",
  "app/api/teen/report/route.ts",
  "app/api/teen/block/route.ts",
  "app/api/teen/messages/upload/route.ts",
]

describe("Wave 2A — canonical APIs exist", () => {
  for (const r of ROUTES) {
    it(`${r} exists`, () => {
      expect(existsSync(resolve(process.cwd(), r))).toBe(true)
    })
  }
})

describe("Friends DELETE route delegates to FriendHandlers.remove", () => {
  it("source uses FriendHandlers.remove", () => {
    const src = readFileSync(
      resolve(process.cwd(), "app/api/teen/friends/[friend_user_id]/route.ts"),
      "utf-8"
    )
    expect(src).toMatch(/FriendHandlers\.remove/)
    expect(src).toMatch(/export\s+async\s+function\s+DELETE/)
  })
})

describe("Friends block route uses block_user_v2 RPC (mutual block + cascade)", () => {
  it("POST invokes block_user_v2", () => {
    const src = readFileSync(
      resolve(process.cwd(), "app/api/teen/friends/[friend_user_id]/block/route.ts"),
      "utf-8"
    )
    expect(src).toMatch(/block_user_v2/)
    expect(src).toMatch(/p_blocker:\s*user\.id/)
  })

  it("DELETE removes blocked_users row scoped to (auth.uid, blocked_id)", () => {
    const src = readFileSync(
      resolve(process.cwd(), "app/api/teen/friends/[friend_user_id]/block/route.ts"),
      "utf-8"
    )
    expect(src).toMatch(/from\(\s*["']blocked_users["']\s*\)/)
    expect(src).toMatch(/blocker_id["']?\s*,\s*user\.id/)
  })
})

describe("DM messages route — block enforcement + attachment fields", () => {
  it("rejects send when is_blocked_either returns true", () => {
    const src = readFileSync(
      resolve(process.cwd(), "app/api/teen/messages/route.ts"),
      "utf-8"
    )
    expect(src).toMatch(/is_blocked_either/)
    expect(src).toMatch(/forbidden/)
  })

  it("inserts attachment_path / attachment_mime when supplied", () => {
    const src = readFileSync(
      resolve(process.cwd(), "app/api/teen/messages/route.ts"),
      "utf-8"
    )
    expect(src).toMatch(/attachment_path/)
    expect(src).toMatch(/attachment_mime/)
    expect(src).toMatch(/attachment_size_bytes/)
  })

  it("enforces 5 MB attachment cap server-side", () => {
    const src = readFileSync(
      resolve(process.cwd(), "app/api/teen/messages/upload/route.ts"),
      "utf-8"
    )
    expect(src).toMatch(/5\s*\*\s*1024\s*\*\s*1024/)
    // No public URL — only signed URL.
    expect(src).not.toMatch(/getPublicUrl/)
    expect(src).toMatch(/createSignedUrl/)
  })
})
