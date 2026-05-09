/**
 * Wave 1B — XP truth integration test for /api/teen/quests/complete.
 *
 * Verifies:
 *   1. The route invokes the canonical RPC `add_xp_to_user` (NOT `add_user_xp`).
 *   2. RPC params match the canonical signature.
 *   3. RPC failure surfaces as 500 — no silent catch-and-fake-success.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

const TEEN_ID = "11111111-1111-1111-1111-111111111111"
const QUEST_ID = "22222222-2222-2222-2222-222222222222"

interface State {
  rpcResult: { data: unknown; error: unknown }
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

function makeServerClient() {
  return {
    from(table: string) {
      const builder: any = {
        eq: vi.fn(() => builder),
        select: vi.fn(() => builder),
        insert: vi.fn(async () => ({ error: null })),
        upsert: vi.fn(async () => ({ error: null })),
        update: vi.fn(() => builder),
        single: vi.fn(async () => {
          if (table === "quests") {
            return {
              data: { id: QUEST_ID, xp_reward: 100 },
              error: null,
            }
          }
          return { data: null, error: null }
        }),
        // Wave 6J — quest_complete now pre-checks quest_progress for an
        // existing completion via .maybeSingle() before granting XP
        // (idempotency). Returning `{ data: null }` simulates "no prior
        // completion" so the test path still flows through the XP grant.
        maybeSingle: vi.fn(async () => ({ data: null, error: null })),
      }
      return builder
    },
    rpc: vi.fn(async (name: string, args: unknown) => {
      state.rpcCalls.push({ name, args })
      return state.rpcResult
    }),
  }
}
vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => makeServerClient()),
}))

const { POST } = await import("@/app/api/teen/quests/complete/route")

function makeRequest(body: unknown) {
  return new Request("http://localhost/api/teen/quests/complete", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })
}

beforeEach(() => {
  state.rpcResult = { data: { success: true }, error: null }
  state.rpcCalls = []
})
afterEach(() => vi.clearAllMocks())

describe("POST /api/teen/quests/complete", () => {
  it("calls add_xp_to_user with canonical params (NOT add_user_xp)", async () => {
    const res = await POST(
      makeRequest({ questId: QUEST_ID, teenId: TEEN_ID }) as any
    )
    expect(res.status).toBe(200)
    expect(state.rpcCalls).toHaveLength(1)
    const call = state.rpcCalls[0]
    expect(call.name).toBe("add_xp_to_user")
    // canonical signature
    const args = call.args as Record<string, unknown>
    expect(args.p_teen_id).toBe(TEEN_ID)
    expect(args.p_xp_amount).toBe(100)
    expect(args.p_source_type).toBe("quest")
    expect(args.p_source_id).toBe(QUEST_ID)
    // Canon never accepts p_user_id on the new RPC.
    expect(args.p_user_id).toBeUndefined()
  })

  it("returns 500 (no fake success) when add_xp_to_user RPC fails", async () => {
    state.rpcResult = { data: null, error: { message: "DB down" } }
    const res = await POST(
      makeRequest({ questId: QUEST_ID, teenId: TEEN_ID }) as any
    )
    expect(res.status).toBe(500)
    const json = await res.json()
    expect(json.ok).toBe(false)
  })
})
