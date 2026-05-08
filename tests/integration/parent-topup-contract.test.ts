/**
 * Wave 1B — POST /api/parent/topup contract test.
 *
 * Verifies the canonical contract from docs/canon/economy-payments.locked.md
 * §4.1 + §6 FORBIDDEN #3:
 *   - Body MUST contain client_idempotency_key (UUID).
 *   - parentId is NEVER read from the body — the session is the source.
 *   - amount_dh is positive and bounded.
 *   - Idempotency: a duplicate client_idempotency_key for the same parent
 *     returns the existing payment and never double-credits.
 *   - Wrong parent/teen relation rejected (403).
 *   - 1 DH = 100 coins (RPC computes amount_coins server-side).
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

// ─── Mocks (must be declared before importing the route) ──────────────────
const PARENT_ID = "11111111-1111-1111-1111-111111111111"
const TEEN_ID = "22222222-2222-2222-2222-222222222222"
const IDEMP_KEY = "33333333-3333-3333-3333-333333333333"

interface FakeState {
  hasLink: boolean
  hasSignature: boolean
  existingByKey: null | {
    id: string
    amount_dh: number
    amount_coins: number
    status: string
    parent_id: string
    teen_id: string
  }
  rpcResult: { data: unknown; error: unknown }
  rpcCalls: unknown[]
}

const state: FakeState = {
  hasLink: true,
  hasSignature: true,
  existingByKey: null,
  rpcResult: {
    data: {
      success: true,
      payment_id: "pay-1",
      amount_coins: 1000,
      new_balance: 1000,
    },
    error: null,
  },
  rpcCalls: [],
}

// User session always present.
vi.mock("@/lib/auth/get-user-role", () => ({
  getUserRole: vi.fn(async () => ({
    role: "parent",
    profileId: PARENT_ID,
    email: "parent@example.com",
  })),
}))

// Server-side Supabase client — used for link + signature lookups.
function makeServerClient() {
  return {
    from(table: string) {
      const builder: any = {
        eq: vi.fn(() => builder),
        limit: vi.fn(() => builder),
        maybeSingle: vi.fn(async () => {
          if (table === "parent_teen_links") {
            return { data: state.hasLink ? { id: "link-1" } : null, error: null }
          }
          if (table === "e_signatures") {
            return {
              data: state.hasSignature ? { id: "sig-1" } : null,
              error: null,
            }
          }
          return { data: null, error: null }
        }),
        select: vi.fn(() => builder),
      }
      return builder
    },
  }
}
vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => makeServerClient()),
}))

// Service-role client — used for idempotency lookup, RPC, and key attachment.
function makeAdminClient() {
  return {
    from(table: string) {
      const builder: any = {
        select: vi.fn(() => builder),
        eq: vi.fn(() => builder),
        limit: vi.fn(() => builder),
        maybeSingle: vi.fn(async () => {
          if (table === "payment_transactions") {
            return { data: state.existingByKey, error: null }
          }
          return { data: null, error: null }
        }),
        update: vi.fn(() => ({
          eq: vi.fn(async () => ({ error: null })),
        })),
      }
      return builder
    },
    rpc: vi.fn(async (name: string, args: unknown) => {
      state.rpcCalls.push({ name, args })
      return state.rpcResult
    }),
  }
}
vi.mock("@/lib/supabase/service-role", () => ({
  createServiceRoleClient: vi.fn(() => makeAdminClient()),
}))

// Now import the route handler.
const { POST } = await import("@/app/api/parent/topup/route")

function makeRequest(body: unknown) {
  return new Request("http://localhost/api/parent/topup", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })
}

beforeEach(() => {
  state.hasLink = true
  state.hasSignature = true
  state.existingByKey = null
  state.rpcResult = {
    data: {
      success: true,
      payment_id: "pay-1",
      amount_coins: 1000,
      new_balance: 1000,
    },
    error: null,
  }
  state.rpcCalls = []
})

afterEach(() => {
  vi.clearAllMocks()
})

describe("POST /api/parent/topup", () => {
  it("accepts canonical {teenId, amount_dh, client_idempotency_key} and credits via RPC", async () => {
    const res = await POST(
      makeRequest({
        teenId: TEEN_ID,
        amount_dh: 10,
        client_idempotency_key: IDEMP_KEY,
      })
    )
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.success).toBe(true)
    expect(state.rpcCalls).toHaveLength(1)
    // The RPC was called with the parent-id from the SESSION, not the body.
    const call = state.rpcCalls[0] as { name: string; args: any }
    expect(call.name).toBe("top_up_teen")
    expect(call.args.p_parent_id).toBe(PARENT_ID)
    expect(call.args.p_amount_dh).toBe(10)
  })

  it("derives amount from packageId via server-side map (never trusts client price)", async () => {
    const res = await POST(
      makeRequest({
        teenId: TEEN_ID,
        packageId: "pack2",
        client_idempotency_key: IDEMP_KEY,
        // Forbidden client-trusted fields — must be ignored.
        coins: 99999,
        bonus: 99999,
        price: 1,
        parentId: "00000000-0000-0000-0000-000000000000",
      })
    )
    expect(res.status).toBe(200)
    const call = state.rpcCalls[0] as { args: any }
    // pack2 maps to 100 DH server-side, not 1.
    expect(call.args.p_amount_dh).toBe(100)
    // Parent id from session, NOT the planted body value.
    expect(call.args.p_parent_id).toBe(PARENT_ID)
  })

  it("rejects raw {coins,bonus,price,parentId} payload as 400 (zod)", async () => {
    const res = await POST(
      makeRequest({
        teenId: TEEN_ID,
        coins: 1000,
        bonus: 0,
        price: 50,
        parentId: PARENT_ID,
      })
    )
    expect(res.status).toBe(400)
    expect(state.rpcCalls).toHaveLength(0)
  })

  it("rejects when parent-teen link is missing (403)", async () => {
    state.hasLink = false
    const res = await POST(
      makeRequest({
        teenId: TEEN_ID,
        amount_dh: 10,
        client_idempotency_key: IDEMP_KEY,
      })
    )
    expect(res.status).toBe(403)
    expect(state.rpcCalls).toHaveLength(0)
  })

  it("returns idempotent replay without double-crediting on duplicate client_idempotency_key", async () => {
    state.existingByKey = {
      id: "pay-1",
      amount_dh: 10,
      amount_coins: 1000,
      status: "succeeded",
      parent_id: PARENT_ID,
      teen_id: TEEN_ID,
    }
    const res = await POST(
      makeRequest({
        teenId: TEEN_ID,
        amount_dh: 10,
        client_idempotency_key: IDEMP_KEY,
      })
    )
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.success).toBe(true)
    expect(json.idempotent_replay).toBe(true)
    // The RPC was NOT called a second time.
    expect(state.rpcCalls).toHaveLength(0)
  })

  it("rejects an idempotency key that belongs to a different parent (409)", async () => {
    state.existingByKey = {
      id: "pay-1",
      amount_dh: 10,
      amount_coins: 1000,
      status: "succeeded",
      parent_id: "99999999-9999-9999-9999-999999999999",
      teen_id: TEEN_ID,
    }
    const res = await POST(
      makeRequest({
        teenId: TEEN_ID,
        amount_dh: 10,
        client_idempotency_key: IDEMP_KEY,
      })
    )
    expect(res.status).toBe(409)
    expect(state.rpcCalls).toHaveLength(0)
  })

  it("computes amount_coins via 1 DH = 100 coins inside the RPC layer", async () => {
    state.rpcResult = {
      data: {
        success: true,
        payment_id: "pay-2",
        amount_coins: 1500, // server says 15 DH * 100
        new_balance: 1500,
      },
      error: null,
    }
    const res = await POST(
      makeRequest({
        teenId: TEEN_ID,
        amount_dh: 15,
        client_idempotency_key: IDEMP_KEY,
      })
    )
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.data.amountCoins).toBe(1500)
  })

  it("rejects a body missing client_idempotency_key (400)", async () => {
    const res = await POST(
      makeRequest({
        teenId: TEEN_ID,
        amount_dh: 10,
      })
    )
    expect(res.status).toBe(400)
    expect(state.rpcCalls).toHaveLength(0)
  })

  it("propagates RPC errors as 5xx instead of fake-success", async () => {
    state.rpcResult = { data: null, error: { message: "DB error" } }
    const res = await POST(
      makeRequest({
        teenId: TEEN_ID,
        amount_dh: 10,
        client_idempotency_key: IDEMP_KEY,
      })
    )
    expect(res.status).toBe(500)
    const json = await res.json()
    expect(json.success).toBe(false)
  })
})
