/**
 * Wave 1C — PARENT-CASCADE
 *
 * Verifies POST /api/parent/approvals dispatches to the canonical resource
 * RPC instead of flipping parental_approvals.status alone.
 *
 * Cases:
 *   - mentor session (action_type='coach_meeting') → parent_approve_session_v2
 *   - ride (action_type='ride') → parent_approve_ride
 *   - food_order (action_type='food_order') → parent_approve_food
 *   - purchase_above_ceiling → parent_approve_purchase
 *   - content → parent_approve_content
 *   - deny path → corresponding parent_deny_*
 *   - unauthorised parent (no link) → 403, no RPC
 *   - approval already approved/denied → idempotent (no RPC re-fire)
 *   - RPC failure → 5xx, no fake success
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

const PARENT_ID = "11111111-1111-1111-1111-111111111111"
const TEEN_ID = "22222222-2222-2222-2222-222222222222"
const APPROVAL_ID = "33333333-3333-3333-3333-333333333333"
const RESOURCE_ID = "44444444-4444-4444-4444-444444444444"

interface FakeState {
  approval: {
    id: string
    parent_id: string
    teen_id: string
    action_type: string
    resource_type: string | null
    resource_id: string | null
    status: string
  } | null
  hasLink: boolean
  rpcResult: { data: unknown; error: unknown }
  rpcCalls: Array<{ name: string; args: unknown }>
}

const state: FakeState = {
  approval: null,
  hasLink: true,
  rpcResult: { data: { success: true, decision: "approved" }, error: null },
  rpcCalls: [],
}

vi.mock("@/lib/auth/get-user-role", () => ({
  getUserRole: vi.fn(async () => ({
    role: "parent",
    profileId: PARENT_ID,
    email: "p@test.local",
  })),
}))

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    from: (table: string) => {
      const builder: Record<string, unknown> = {}
      Object.assign(builder, {
        select: () => builder,
        eq: () => builder,
        maybeSingle: async () => {
          if (table === "parental_approvals") {
            return { data: state.approval, error: null }
          }
          if (table === "parent_teen_links") {
            return { data: state.hasLink ? { id: "lnk-1" } : null, error: null }
          }
          return { data: null, error: null }
        },
      })
      return builder
    },
  })),
}))

vi.mock("@/lib/supabase/service-role", () => ({
  createServiceRoleClient: vi.fn(() => ({
    rpc: vi.fn(async (name: string, args: unknown) => {
      state.rpcCalls.push({ name, args })
      return state.rpcResult
    }),
  })),
}))

const { POST } = await import("@/app/api/parent/approvals/route")

function makeReq(body: unknown) {
  return new Request("http://localhost/api/parent/approvals", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  })
}

function makeApproval(actionType: string, resourceType = actionType) {
  return {
    id: APPROVAL_ID,
    parent_id: PARENT_ID,
    teen_id: TEEN_ID,
    action_type: actionType,
    resource_type: resourceType,
    resource_id: RESOURCE_ID,
    status: "pending",
  }
}

beforeEach(() => {
  state.approval = null
  state.hasLink = true
  state.rpcResult = {
    data: { success: true, decision: "approved", approval_id: APPROVAL_ID },
    error: null,
  }
  state.rpcCalls = []
})

afterEach(() => {
  vi.clearAllMocks()
})

describe("POST /api/parent/approvals — Wave 1C cascade dispatch", () => {
  it("mentor session approve → calls parent_approve_session_v2 (NOT a status flip)", async () => {
    state.approval = makeApproval("coach_meeting", "mentor_session")
    const res = await POST(makeReq({ approvalId: APPROVAL_ID, decision: "approve" }))
    expect(res.status).toBe(200)
    expect(state.rpcCalls).toHaveLength(1)
    expect(state.rpcCalls[0].name).toBe("parent_approve_session_v2")
    const args = state.rpcCalls[0].args as Record<string, unknown>
    expect(args.p_approval_id).toBe(APPROVAL_ID)
    // p_parent_id MUST come from the SESSION, never from the body.
    expect(args.p_parent_id).toBe(PARENT_ID)
  })

  it("ride approve → calls parent_approve_ride", async () => {
    state.approval = makeApproval("ride")
    const res = await POST(makeReq({ approvalId: APPROVAL_ID, decision: "approve" }))
    expect(res.status).toBe(200)
    expect(state.rpcCalls[0].name).toBe("parent_approve_ride")
  })

  it("food_order approve → calls parent_approve_food", async () => {
    state.approval = makeApproval("food_order")
    const res = await POST(makeReq({ approvalId: APPROVAL_ID, decision: "approve" }))
    expect(res.status).toBe(200)
    expect(state.rpcCalls[0].name).toBe("parent_approve_food")
  })

  it("purchase_above_ceiling approve → calls parent_approve_purchase", async () => {
    state.approval = makeApproval("purchase_above_ceiling", "marketplace_listing")
    const res = await POST(makeReq({ approvalId: APPROVAL_ID, decision: "approve" }))
    expect(res.status).toBe(200)
    expect(state.rpcCalls[0].name).toBe("parent_approve_purchase")
  })

  it("content approve → calls parent_approve_content", async () => {
    state.approval = makeApproval("content", "feed_post")
    const res = await POST(makeReq({ approvalId: APPROVAL_ID, decision: "approve" }))
    expect(res.status).toBe(200)
    expect(state.rpcCalls[0].name).toBe("parent_approve_content")
  })

  it("ride deny → calls parent_deny_ride with reason", async () => {
    state.approval = makeApproval("ride")
    const res = await POST(
      makeReq({ approvalId: APPROVAL_ID, decision: "deny", reason: "trop tard" })
    )
    expect(res.status).toBe(200)
    expect(state.rpcCalls[0].name).toBe("parent_deny_ride")
    const args = state.rpcCalls[0].args as Record<string, unknown>
    expect(args.p_reason).toBe("trop tard")
  })

  it("unauthorised parent (no active link) → 403, NO RPC fired", async () => {
    state.approval = makeApproval("ride")
    state.hasLink = false
    const res = await POST(makeReq({ approvalId: APPROVAL_ID, decision: "approve" }))
    expect(res.status).toBe(403)
    expect(state.rpcCalls).toHaveLength(0)
  })

  it("approval owned by another parent → 403", async () => {
    state.approval = {
      ...makeApproval("ride"),
      parent_id: "00000000-0000-0000-0000-000000000999",
    }
    const res = await POST(makeReq({ approvalId: APPROVAL_ID, decision: "approve" }))
    expect(res.status).toBe(403)
    expect(state.rpcCalls).toHaveLength(0)
  })

  it("approval already approved → idempotent (no RPC re-fire), 200", async () => {
    state.approval = { ...makeApproval("ride"), status: "approved" }
    const res = await POST(makeReq({ approvalId: APPROVAL_ID, decision: "approve" }))
    expect(res.status).toBe(200)
    const json = (await res.json()) as { success: boolean; idempotent: boolean }
    expect(json.success).toBe(true)
    expect(json.idempotent).toBe(true)
    expect(state.rpcCalls).toHaveLength(0)
  })

  it("RPC failure → 5xx, NO fake success in response body", async () => {
    state.approval = makeApproval("ride")
    state.rpcResult = { data: null, error: { message: "boom" } }
    const res = await POST(makeReq({ approvalId: APPROVAL_ID, decision: "approve" }))
    expect(res.status).toBe(500)
    const json = (await res.json()) as { error: string; success?: boolean }
    expect(json.error).toMatch(/boom/i)
    expect(json.success).not.toBe(true)
  })

  it("RPC returns success:false → mapped error code, NOT 200 success", async () => {
    state.approval = makeApproval("ride")
    state.rpcResult = {
      data: { success: false, error: "ride_not_actionable" },
      error: null,
    }
    const res = await POST(makeReq({ approvalId: APPROVAL_ID, decision: "approve" }))
    expect(res.status).toBeGreaterThanOrEqual(400)
    const json = (await res.json()) as { error: string; success?: boolean }
    expect(json.success).not.toBe(true)
    expect(json.error).toBe("ride_not_actionable")
  })

  it("approval not found → 404", async () => {
    state.approval = null
    const res = await POST(makeReq({ approvalId: APPROVAL_ID, decision: "approve" }))
    expect(res.status).toBe(404)
    expect(state.rpcCalls).toHaveLength(0)
  })

  it("unsupported action_type → 400", async () => {
    state.approval = makeApproval("unknown_type")
    const res = await POST(makeReq({ approvalId: APPROVAL_ID, decision: "approve" }))
    expect(res.status).toBe(400)
    expect(state.rpcCalls).toHaveLength(0)
  })
})
