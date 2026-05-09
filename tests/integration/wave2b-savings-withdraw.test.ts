/**
 * Wave 2B — savings withdraw integration test for /api/teen/savings/goals/[id]/withdraw.
 *
 * Verifies:
 *   1. Calls canonical SECURITY DEFINER RPC `withdraw_from_goal` with correct args.
 *   2. Achieved goal → 200 success.
 *   3. Active goal → 400 (RPC returns goal_not_achieved).
 *   4. Wrong teen → 400 (RPC returns forbidden).
 *   5. Double withdraw → 400 (already withdrawn returns goal_not_achieved).
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

const TEEN_ID = "11111111-1111-1111-1111-111111111111"
const GOAL_ID = "33333333-3333-3333-3333-333333333333"

type RpcResult = { data: unknown; error: unknown }
interface State {
  rpcResult: RpcResult
  rpcCalls: Array<{ name: string; args: unknown }>
}
const state: State = {
  rpcResult: { data: { success: true }, error: null },
  rpcCalls: [],
}

vi.mock("@/lib/auth/get-user-role", () => ({
  getUserRole: vi.fn(async () => ({
    role: "teen",
    profileId: TEEN_ID,
    teenData: { id: TEEN_ID },
  })),
}))

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    rpc: vi.fn(async (name: string, args: unknown) => {
      state.rpcCalls.push({ name, args })
      return state.rpcResult
    }),
  })),
}))

const { POST } = await import("@/app/api/teen/savings/goals/[id]/withdraw/route")

function makeRequest(body: unknown = {}) {
  return new Request(
    `http://localhost/api/teen/savings/goals/${GOAL_ID}/withdraw`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    },
  )
}
const ctx = { params: Promise.resolve({ id: GOAL_ID }) }

beforeEach(() => {
  state.rpcCalls = []
  state.rpcResult = {
    data: { success: true, coins_released: 500, destination: "spendable" },
    error: null,
  }
})
afterEach(() => vi.clearAllMocks())

describe("POST /api/teen/savings/goals/:id/withdraw", () => {
  it("calls withdraw_from_goal RPC with canonical params (achieved → withdrawn)", async () => {
    const res = await POST(makeRequest({ destination: "spendable" }) as any, ctx)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.success).toBe(true)
    expect(body.coins_released).toBe(500)

    expect(state.rpcCalls).toHaveLength(1)
    const call = state.rpcCalls[0]
    expect(call.name).toBe("withdraw_from_goal")
    const args = call.args as Record<string, unknown>
    expect(args.p_goal_id).toBe(GOAL_ID)
    expect(args.p_destination).toBe("spendable")
    expect(args.p_metadata).toEqual({})
  })

  it("rejects active goal (RPC returns goal_not_achieved)", async () => {
    state.rpcResult = {
      data: { success: false, error: "goal_not_achieved", status: "active" },
      error: null,
    }
    const res = await POST(makeRequest() as any, ctx)
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.success).toBe(false)
    expect(body.error).toBe("goal_not_achieved")
  })

  it("rejects wrong teen (RPC returns forbidden)", async () => {
    state.rpcResult = {
      data: { success: false, error: "forbidden" },
      error: null,
    }
    const res = await POST(makeRequest() as any, ctx)
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toBe("forbidden")
  })

  it("rejects double withdraw (RPC returns goal_not_achieved with status=withdrawn)", async () => {
    state.rpcResult = {
      data: {
        success: false,
        error: "goal_not_achieved",
        status: "withdrawn",
      },
      error: null,
    }
    const res = await POST(makeRequest() as any, ctx)
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.success).toBe(false)
    expect(body.detail).toMatchObject({ status: "withdrawn" })
  })

  it("defaults destination to 'spendable' when omitted", async () => {
    await POST(makeRequest({}) as any, ctx)
    const args = state.rpcCalls[0].args as Record<string, unknown>
    expect(args.p_destination).toBe("spendable")
  })
})
