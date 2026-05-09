/**
 * Wave 4A — POST /api/admin/moderation/[id]/decision integration test.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

const ADMIN_ID = "11111111-1111-1111-1111-111111111111"
const QUEUE_ID = "22222222-2222-2222-2222-222222222222"
const CONTENT_ID = "33333333-3333-3333-3333-333333333333"
const OWNER_ID = "44444444-4444-4444-4444-444444444444"

interface State {
  admin: any
  queueRow: any
  contentRow: any
  contentUpdateError: any
  queueUpdates: Array<any>
  contentUpdates: Array<{ table: string; values: any }>
  reportUpdates: Array<{ table: string; values: any }>
  notifications: Array<any>
  auditCalls: Array<any>
  auditThrows: boolean
  permissionGranted: boolean
}
const state: State = {
  admin: { profileId: ADMIN_ID, subRole: "moderator", permissions: { "content.view": true } },
  queueRow: null,
  contentRow: null,
  contentUpdateError: null,
  queueUpdates: [],
  contentUpdates: [],
  reportUpdates: [],
  notifications: [],
  auditCalls: [],
  auditThrows: false,
  permissionGranted: true,
}

vi.mock("@/lib/auth/admin-permissions", () => ({
  requireAdminPermission: vi.fn(async () => {
    if (!state.permissionGranted) throw new Error("Permission refusée: content.view")
    return state.admin
  }),
  logAdminAction: vi.fn(async (input: any) => {
    state.auditCalls.push(input)
    if (state.auditThrows) throw new Error("audit_log insert failed: simulated")
  }),
}))

vi.mock("@/lib/supabase/service-role", () => ({
  createServiceRoleClient: vi.fn(() => ({
    from(table: string) {
      const builder: any = {
        select: () => builder,
        eq: () => builder,
        in: () => builder,
        maybeSingle: async () => {
          if (table === "moderation_queue") return { data: state.queueRow, error: null }
          if (table === "feed_posts" || table === "marketplace_listings" || table === "partner_offers") {
            return { data: state.contentRow, error: null }
          }
          return { data: null, error: null }
        },
        update: (values: any) => {
          if (table === "moderation_queue") {
            state.queueUpdates.push(values)
            return { eq: () => Promise.resolve({ data: null, error: null }) }
          }
          if (table === "user_reports") {
            state.reportUpdates.push({ table, values })
            return {
              eq: () => ({
                eq: () => ({
                  eq: () => Promise.resolve({ data: null, error: null }),
                }),
              }),
            }
          }
          // content table
          state.contentUpdates.push({ table, values })
          return { eq: () => Promise.resolve({ data: null, error: state.contentUpdateError }) }
        },
        insert: (row: any) => {
          if (table === "user_notifications") state.notifications.push(row)
          return Promise.resolve({ data: null, error: null })
        },
      }
      return builder
    },
  })),
}))

const { POST } = await import("@/app/api/admin/moderation/[id]/decision/route")

function makeReq(body: unknown) {
  return new Request(`http://localhost/api/admin/moderation/${QUEUE_ID}/decision`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })
}
const ctx = { params: Promise.resolve({ id: QUEUE_ID }) }

beforeEach(() => {
  state.permissionGranted = true
  state.admin = { profileId: ADMIN_ID, subRole: "moderator", permissions: { "content.view": true } }
  state.queueRow = {
    id: QUEUE_ID,
    content_type: "feed_post",
    content_id: CONTENT_ID,
    status: "pending",
  }
  state.contentRow = { id: CONTENT_ID, user_id: OWNER_ID }
  state.contentUpdateError = null
  state.queueUpdates = []
  state.contentUpdates = []
  state.reportUpdates = []
  state.notifications = []
  state.auditCalls = []
  state.auditThrows = false
})
afterEach(() => vi.clearAllMocks())

describe("POST /api/admin/moderation/:id/decision", () => {
  it("non-admin caller (permission denied) → 403", async () => {
    state.permissionGranted = false
    const res = await POST(makeReq({ decision: "dismiss" }), ctx)
    expect(res.status).toBe(403)
  })

  it("invalid decision → 400 invalid_body", async () => {
    const res = await POST(makeReq({ decision: "bogus" }), ctx)
    expect(res.status).toBe(400)
  })

  it("destructive decision (delete) without reason → 400 reason_required", async () => {
    const res = await POST(makeReq({ decision: "delete" }), ctx)
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toBe("reason_required")
  })

  it("dismiss feed_post → updates feed_posts + queue + reports + audit_log", async () => {
    const res = await POST(makeReq({ decision: "dismiss" }), ctx)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.success).toBe(true)
    expect(body.queue_status).toBe("approved")

    const contentUpd = state.contentUpdates.find((u) => u.table === "feed_posts")
    expect(contentUpd).toBeTruthy()
    expect(contentUpd!.values.is_hidden).toBe(false)

    expect(state.queueUpdates[0].status).toBe("approved")
    expect(state.queueUpdates[0].reviewed_by).toBe(ADMIN_ID)

    expect(state.reportUpdates.find((r) => r.table === "user_reports")).toBeTruthy()

    expect(state.auditCalls).toHaveLength(1)
    expect(state.auditCalls[0].action).toBe("moderation.dismiss")
  })

  it("hide feed_post notifies owner via user_notifications", async () => {
    const res = await POST(makeReq({ decision: "hide" }), ctx)
    expect(res.status).toBe(200)
    expect(state.notifications).toHaveLength(1)
    expect(state.notifications[0].user_id).toBe(OWNER_ID)
    expect(state.notifications[0].data.kind).toBe("moderation.hide")
  })

  it("unsupported content_type → 409 unsupported_content_type", async () => {
    state.queueRow = { ...state.queueRow, content_type: "circle_message" }
    const res = await POST(makeReq({ decision: "dismiss" }), ctx)
    expect(res.status).toBe(409)
    const body = await res.json()
    expect(body.error).toBe("unsupported_content_type")
    expect(state.queueUpdates).toHaveLength(0)
    expect(state.contentUpdates).toHaveLength(0)
    expect(state.auditCalls).toHaveLength(0)
  })

  it("unsupported action (warn on feed_post — adapter returns null) → 409 unsupported_action", async () => {
    const res = await POST(
      makeReq({ decision: "warn", reason: "spam repetitif" }),
      ctx,
    )
    expect(res.status).toBe(409)
    const body = await res.json()
    expect(body.error).toBe("unsupported_action")
    expect(state.queueUpdates).toHaveLength(0)
    expect(state.auditCalls).toHaveLength(0)
  })

  it("already reviewed queue row → 409 already_reviewed (idempotent)", async () => {
    state.queueRow = { ...state.queueRow, status: "rejected" }
    const res = await POST(makeReq({ decision: "dismiss" }), ctx)
    expect(res.status).toBe(409)
    expect(state.queueUpdates).toHaveLength(0)
  })

  it("content update failure → 500 + no audit_log + no queue update", async () => {
    state.contentUpdateError = { message: "DB locked" }
    const res = await POST(makeReq({ decision: "hide" }), ctx)
    expect(res.status).toBe(500)
    expect(state.queueUpdates).toHaveLength(0)
    expect(state.auditCalls).toHaveLength(0)
  })

  it("audit_log failure throws → caller sees the error (no silent catch)", async () => {
    state.auditThrows = true
    await expect(POST(makeReq({ decision: "dismiss" }), ctx)).rejects.toThrow(
      /audit_log insert failed/,
    )
    // Content + queue update happened before the audit, but the throw is loud.
    expect(state.contentUpdates).toHaveLength(1)
    expect(state.queueUpdates).toHaveLength(1)
  })
})
