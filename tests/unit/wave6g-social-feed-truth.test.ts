/**
 * Wave 6G — Social-feed truth static guards.
 *
 * Closes 4 concrete truth-violations in the legacy feed/comments POST
 * handlers + adds a status filter to the user-page feed branch.
 */
import { describe, expect, it } from "vitest"
import { readFileSync } from "node:fs"
import { resolve } from "node:path"

const ROOT = process.cwd()
const read = (p: string) => readFileSync(resolve(ROOT, p), "utf8")
const stripComments = (s: string) =>
  s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "")

const FEED = "app/api/teen/feed/route.ts"
const COMMENTS = "app/api/teen/feed/comments/route.ts"

// The single broken pattern repeated across legacy handlers:
//   update({ <counter>: supabase.rpc("increment"|"decrement", { x: 1 }) })
// `supabase.rpc()` returns a Promise, not a number — every write that
// used this pattern was either NaN or silently failed.
const BROKEN_INCREMENT_RPC = /supabase\.rpc\(\s*["'](?:increment|decrement)["']/

describe("Wave 6G — feed POST: no broken counter rpc + no fake views/shares", () => {
  const src = stripComments(read(FEED))

  it("no `supabase.rpc(\"increment\"|\"decrement\")` pattern anywhere in the route", () => {
    expect(src).not.toMatch(BROKEN_INCREMENT_RPC)
  })

  it("share branch keeps the canonical feed_shares insert", () => {
    expect(src).toMatch(/from\(["']feed_shares["']\)\s*\.\s*insert/)
  })

  it("share branch no longer fakes shares_count via rpc", () => {
    expect(src).not.toMatch(/update\(\s*\{\s*shares_count:\s*supabase\.rpc/)
  })

  it("view branch keeps the feed_views upsert", () => {
    expect(src).toMatch(/from\(["']feed_views["']\)\s*\.\s*upsert/)
  })

  it("view branch no longer fakes views_count via rpc", () => {
    expect(src).not.toMatch(/update\(\s*\{\s*views_count:\s*supabase\.rpc/)
  })
})

describe("Wave 6G — feed GET user-page: status visibility gate", () => {
  const src = stripComments(read(FEED))

  it("case 'user' filters feed_posts.status='published' (matches canonical RPC)", () => {
    // Verify both the case-tag and the status filter appear with the
    // status filter clearly inside the user-branch's chained query
    // (right after the targetUserId eq line).
    expect(src).toMatch(
      /case\s+["']user["']:[\s\S]{0,1500}\.eq\(\s*["']user_id["']\s*,\s*targetUserId\s*\)[\s\S]{0,500}\.eq\(\s*["']status["']\s*,\s*["']published["']\s*\)/,
    )
    expect(src).toMatch(
      /case\s+["']user["']:[\s\S]{0,1500}\.eq\(\s*["']is_hidden["']\s*,\s*false\s*\)/,
    )
  })
})

describe("Wave 6G — comments POST: no phantom XP + no broken counters", () => {
  const src = stripComments(read(COMMENTS))

  it("no `supabase.rpc(\"increment\"|\"decrement\")` pattern", () => {
    expect(src).not.toMatch(BROKEN_INCREMENT_RPC)
  })

  it("no direct write to deprecated `users.xp` (phantom XP path)", () => {
    // The previous code did `from("users").update({ xp: ... })`. Per
    // canon §7, XP only moves via add_xp_to_user RPC.
    expect(src).not.toMatch(/from\(\s*["']users["']\s*\)\s*\.\s*update\(\s*\{\s*xp:/)
  })

  it("no fake feed_comments.likes_count update via rpc", () => {
    expect(src).not.toMatch(/update\(\s*\{\s*likes_count:\s*supabase\.rpc/)
  })

  it("comment_likes insert + delete remain the canonical like signal", () => {
    expect(src).toMatch(/from\(["']comment_likes["']\)\s*\.\s*insert/)
    expect(src).toMatch(/from\(["']comment_likes["']\)\s*\.\s*delete/)
  })

  it("create still uses canonical add_feed_comment RPC", () => {
    expect(src).toMatch(/rpc\(\s*["']add_feed_comment["']/)
  })

  it("delete is soft-delete (is_deleted/deleted_at), not hard delete", () => {
    expect(src).toMatch(/is_deleted:\s*true/)
    expect(src).toMatch(/deleted_at:\s*new Date\(\)\.toISOString\(\)/)
    // No `from("feed_comments").delete()` in the soft-delete branch.
    const deleteBranch = src.match(/case\s+["']delete["']:\s*\{[\s\S]{0,800}?\}/)
    expect(deleteBranch).not.toBeNull()
    if (deleteBranch) {
      expect(deleteBranch[0]).not.toMatch(/from\(["']feed_comments["']\)\s*\.\s*delete/)
    }
  })
})

describe("Wave 6G — Wave 2A canonical pipeline still intact", () => {
  it("/api/teen/report writes user_reports with canonical target_type values + idempotent", () => {
    const src = stripComments(read("app/api/teen/report/route.ts"))
    expect(src).toMatch(/from\(["']user_reports["']\)\s*\.\s*select/)
    expect(src).toMatch(/from\(["']user_reports["']\)\s*\.\s*insert/)
    expect(src).toMatch(/feed_post/)
    expect(src).toMatch(/feed_comment/)
    expect(src).toMatch(/idempotent:\s*true/)
  })

  it("comments report path also writes user_reports (not deprecated reports table)", () => {
    const src = stripComments(read(COMMENTS))
    expect(src).toMatch(/case\s+["']report["'][\s\S]{0,2000}from\(["']user_reports["']\)/)
  })

  it("engage route still gates rejected/removed posts (canon §3 visibility)", () => {
    const src = stripComments(read("app/api/teen/feed/[submission_id]/engage/route.ts"))
    expect(src).toMatch(/post\.status\s*===\s*["']rejected["']/)
    expect(src).toMatch(/post\.status\s*===\s*["']removed["']/)
    expect(src).toMatch(/status:\s*410/)
  })

  it("Wave 4A moderation_queue feed_post adapter still exists", () => {
    const src = stripComments(read("lib/admin/moderation-adapters.ts"))
    expect(src).toMatch(/feed_post/)
  })
})
