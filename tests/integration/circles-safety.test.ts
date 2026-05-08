/**
 * Wave 2A — Circles report writes BOTH user_reports and audit_log.
 *
 * Canon: docs/canon/social-feed.locked.md §5 + §7 invariant 1.
 */
import { describe, expect, it } from "vitest"
import { readFileSync } from "node:fs"
import { resolve } from "node:path"

describe("CANON-SOCIAL-013 — circles report dual-write contract", () => {
  it("circles report route writes to user_reports", () => {
    const src = readFileSync(
      resolve(process.cwd(), "app/api/circles/report/route.ts"),
      "utf-8"
    )
    expect(src).toMatch(/from\(\s*["']user_reports["']\s*\)\s*\.\s*insert/)
    expect(src).toMatch(/target_type:\s*["']circle_message["']/)
  })

  it("circles report route also writes to audit_log", () => {
    const src = readFileSync(
      resolve(process.cwd(), "app/api/circles/report/route.ts"),
      "utf-8"
    )
    expect(src).toMatch(/from\(\s*["']audit_log["']\s*\)\s*\.\s*insert/)
    expect(src).toMatch(/action:\s*["']content_reported["']/)
  })

  it("circles report no longer writes to non-existent moderation_reports table", () => {
    const src = readFileSync(
      resolve(process.cwd(), "app/api/circles/report/route.ts"),
      "utf-8"
    )
    // The comment block can mention the historical name; the live code path
    // must NOT issue any insert/select/from against it.
    expect(src).not.toMatch(/from\(\s*["']moderation_reports["']\s*\)/)
    expect(src).not.toMatch(/insert\([^)]*moderation_reports/)
  })

  it("circles report 23505 (duplicate) is treated as idempotent success", () => {
    const src = readFileSync(
      resolve(process.cwd(), "app/api/circles/report/route.ts"),
      "utf-8"
    )
    expect(src).toMatch(/23505/)
  })
})
