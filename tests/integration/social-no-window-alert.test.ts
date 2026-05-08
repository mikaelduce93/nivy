/**
 * Wave 2A — Static guard. No file in the social/feed/circles/messages
 * surfaces may contain `window.alert(`. Guards regression of fixes A/C/G.
 *
 * Canon: docs/canon/social-feed.locked.md §10 #1.
 */
import { describe, expect, it } from "vitest"
import { readFileSync } from "node:fs"
import { resolve } from "node:path"

const FILES = [
  "app/teen/feed/feed-list.tsx",
  "app/teen/feed/post-card.tsx",
  "app/teen/circles/circles-client.tsx",
  "app/teen/messages/messages-client.tsx",
  "components/feed/social-feed.tsx",
  "components/feed/activity-feed.tsx",
  "components/feed/post-composer.tsx",
]

describe("CANON-ALERT-001 — no window.alert() in social/feed surfaces", () => {
  for (const f of FILES) {
    it(`${f} contains no window.alert(`, () => {
      const path = resolve(process.cwd(), f)
      const src = readFileSync(path, "utf-8")
      const matches = [...src.matchAll(/\bwindow\.alert\s*\(/g)]
      expect(matches.length).toBe(0)
    })
  }
})

describe("CANON-NOTIF-001 — no `from('notifications')` in messages route", () => {
  it("messages route writes to user_notifications only", () => {
    const path = resolve(process.cwd(), "app/api/teen/messages/route.ts")
    const src = readFileSync(path, "utf-8")
    expect(src).not.toMatch(/\.from\(["']notifications["']\)/)
    expect(src).toMatch(/\.from\(["']user_notifications["']\)/)
  })
})

describe("CANON-SOCIAL-005 — comments report writes user_reports, not `reports`", () => {
  it("comments route writes target_type='feed_comment' to user_reports", () => {
    const path = resolve(process.cwd(), "app/api/teen/feed/comments/route.ts")
    const src = readFileSync(path, "utf-8")
    expect(src).not.toMatch(/\.from\(["']reports["']\)\s*\.\s*insert/)
    expect(src).toMatch(/\.from\(["']user_reports["']\)/)
    expect(src).toMatch(/target_type:\s*["']feed_comment["']/)
  })

  it("comments route caps content at 500 chars", () => {
    const path = resolve(process.cwd(), "app/api/teen/feed/comments/route.ts")
    const src = readFileSync(path, "utf-8")
    expect(src).toMatch(/content\.length\s*>\s*500/)
    // Old 1000-char check must not regress.
    expect(src).not.toMatch(/content\.length\s*>\s*1000/)
  })
})

describe("CANON-SOCIAL-013 — circles report writes user_reports + audit_log", () => {
  it("circles report no longer writes to non-existent moderation_reports", () => {
    const path = resolve(process.cwd(), "app/api/circles/report/route.ts")
    const src = readFileSync(path, "utf-8")
    expect(src).not.toMatch(/\.from\(["']moderation_reports["']\)/)
    expect(src).toMatch(/\.from\(["']user_reports["']\)/)
    expect(src).toMatch(/\.from\(["']audit_log["']\)/)
  })
})

describe("CANON-SOCIAL-001 — feed page no longer hardcodes limit(30)", () => {
  it("teen feed page uses get_feed_cursor_page RPC, not raw .from(feed_posts).limit(30)", () => {
    const path = resolve(process.cwd(), "app/teen/feed/page.tsx")
    const src = readFileSync(path, "utf-8")
    expect(src).not.toMatch(/\.limit\(\s*30\s*\)/)
    expect(src).toMatch(/get_feed_cursor_page/)
  })
})

describe("CANON-SOCIAL-009 — DM realtime channel subscribed", () => {
  it("messages-client subscribes to dm:{conversationId} channel", () => {
    const path = resolve(process.cwd(), "app/teen/messages/messages-client.tsx")
    const src = readFileSync(path, "utf-8")
    expect(src).toMatch(/channel\(\s*[`'"]dm:/)
    expect(src).toMatch(/postgres_changes/)
    expect(src).toMatch(/INSERT/)
  })
})

describe("CANON-SOCIAL-010 — DM send: empty catch removed, response consumed", () => {
  it("messages-client rolls back on failure (no empty catch)", () => {
    const path = resolve(process.cwd(), "app/teen/messages/messages-client.tsx")
    const src = readFileSync(path, "utf-8")
    // empty catch on send was the smell; verify temp-id reconcile path exists.
    expect(src).toMatch(/temp-/)
    expect(src).toMatch(/await\s+res\.json\(\)/)
    expect(src).toMatch(/prev\.filter\(\s*\(m\)\s*=>\s*m\.id\s*!==\s*tempId\s*\)/)
  })
})
