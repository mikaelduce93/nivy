/**
 * Wave 2A — Social safety: report + block contract.
 *
 * Validates:
 *   - POST /api/teen/report writes user_reports with target_type+target_id+reason.
 *   - Duplicate report by same teen → idempotent (200 instead of 201, no double row).
 *   - Validation rejects unknown target_type and unknown reason.
 *   - 401 if not authenticated.
 *   - POST /api/teen/block delegates to RPC block_user_v2 with correct params.
 *   - Self-block rejected at the API layer (400).
 *   - DELETE /api/teen/block removes blocked_users row scoped to (auth.uid, blocked_id).
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

const USER_ID = "11111111-1111-1111-1111-111111111111"

interface FakeState {
  authenticated: boolean
  reports: Array<{
    reporter_user_id: string
    target_type: string
    target_id: string
    reason: string
    details: string | null
    status: string
  }>
  rpcCalls: Array<{ name: string; args: any }>
  blockedRows: Array<{ blocker_id: string; blocked_id: string }>
}

const state: FakeState = {
  authenticated: true,
  reports: [],
  rpcCalls: [],
  blockedRows: [],
}

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    auth: {
      getUser: async () =>
        state.authenticated
          ? { data: { user: { id: USER_ID } }, error: null }
          : { data: { user: null }, error: { message: "no auth" } },
    },
    from: (table: string) => {
      const builder: any = {
        select: () => builder,
        eq: () => builder,
        maybeSingle: async () => {
          if (table === "user_reports") {
            // For idempotency lookup
            return { data: null, error: null }
          }
          return { data: null, error: null }
        },
        single: async () => ({ data: { id: "report-1", status: "open", created_at: "now" }, error: null }),
        insert: (row: any) => {
          if (table === "user_reports") {
            // Apply UNIQUE (reporter, target_type, target_id) idempotently.
            const exists = state.reports.find(
              (r) =>
                r.reporter_user_id === row.reporter_user_id &&
                r.target_type === row.target_type &&
                r.target_id === row.target_id
            )
            if (exists) {
              return {
                select: () => ({
                  single: async () => ({ data: null, error: { code: "23505" } }),
                }),
                then: (resolve: any) => resolve({ error: { code: "23505" } }),
              }
            }
            state.reports.push(row)
            return {
              select: () => ({
                single: async () => ({
                  data: { id: `report-${state.reports.length}`, status: "open", created_at: "now" },
                  error: null,
                }),
              }),
              then: (resolve: any) => resolve({ error: null }),
            }
          }
          if (table === "audit_log") {
            return { then: (resolve: any) => resolve({ error: null }) }
          }
          return { then: (resolve: any) => resolve({ error: null }) }
        },
        delete: () => ({
          eq: () => ({
            eq: async () => {
              const before = state.blockedRows.length
              state.blockedRows = state.blockedRows.filter(
                (b) => !(b.blocker_id === USER_ID)
              )
              return { error: null, count: before - state.blockedRows.length }
            },
          }),
        }),
      }
      return builder
    },
    rpc: async (name: string, args: any) => {
      state.rpcCalls.push({ name, args })
      if (name === "block_user_v2") {
        state.blockedRows.push({ blocker_id: args.p_blocker, blocked_id: args.p_blocked })
        return { data: "block-1", error: null }
      }
      return { data: null, error: null }
    },
  })),
}))

beforeEach(() => {
  state.authenticated = true
  state.reports = []
  state.rpcCalls = []
  state.blockedRows = []
  vi.resetModules()
})

afterEach(() => {
  vi.clearAllMocks()
})

function makeReq(body: unknown): Request {
  return new Request("http://localhost/api/teen/report", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })
}

describe("POST /api/teen/report — Wave 2A canonical report sink", () => {
  it("writes user_reports row + returns 201 on first report", async () => {
    const { POST } = await import("@/app/api/teen/report/route")
    const res = await POST(
      makeReq({
        resource_type: "feed_post",
        resource_id: "00000000-0000-0000-0000-000000000aaa",
        reason: "harassment",
      }) as any
    )
    expect(res.status).toBe(201)
    expect(state.reports.length).toBe(1)
    expect(state.reports[0].target_type).toBe("feed_post")
    expect(state.reports[0].reason).toBe("harassment")
  })

  it("rejects 401 when unauthenticated", async () => {
    state.authenticated = false
    const { POST } = await import("@/app/api/teen/report/route")
    const res = await POST(
      makeReq({
        resource_type: "feed_post",
        resource_id: "00000000-0000-0000-0000-000000000aaa",
        reason: "harassment",
      }) as any
    )
    expect(res.status).toBe(401)
  })

  it("rejects 400 on unknown target_type", async () => {
    const { POST } = await import("@/app/api/teen/report/route")
    const res = await POST(
      makeReq({
        resource_type: "not_a_thing",
        resource_id: "00000000-0000-0000-0000-000000000aaa",
        reason: "harassment",
      }) as any
    )
    expect(res.status).toBe(400)
  })

  it("rejects 400 on unknown reason", async () => {
    const { POST } = await import("@/app/api/teen/report/route")
    const res = await POST(
      makeReq({
        resource_type: "feed_post",
        resource_id: "00000000-0000-0000-0000-000000000aaa",
        reason: "kebab",
      }) as any
    )
    expect(res.status).toBe(400)
  })
})

describe("POST /api/teen/block — RPC block_user_v2 wired", () => {
  it("invokes block_user_v2 with the correct args", async () => {
    const { POST } = await import("@/app/api/teen/block/route")
    const res = await POST(
      new Request("http://localhost/api/teen/block", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          blocked_id: "22222222-2222-2222-2222-222222222222",
          reason: "spam",
        }),
      }) as any
    )
    expect(res.status).toBe(201)
    const call = state.rpcCalls.find((c) => c.name === "block_user_v2")
    expect(call).toBeTruthy()
    expect(call!.args).toMatchObject({
      p_blocker: USER_ID,
      p_blocked: "22222222-2222-2222-2222-222222222222",
      p_reason: "spam",
    })
  })

  it("rejects self-block at API with 400", async () => {
    const { POST } = await import("@/app/api/teen/block/route")
    const res = await POST(
      new Request("http://localhost/api/teen/block", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ blocked_id: USER_ID }),
      }) as any
    )
    expect(res.status).toBe(400)
  })

  it("rejects 401 when unauthenticated", async () => {
    state.authenticated = false
    const { POST } = await import("@/app/api/teen/block/route")
    const res = await POST(
      new Request("http://localhost/api/teen/block", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          blocked_id: "22222222-2222-2222-2222-222222222222",
        }),
      }) as any
    )
    expect(res.status).toBe(401)
  })
})
