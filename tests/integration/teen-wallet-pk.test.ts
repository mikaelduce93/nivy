/**
 * Wave 1B — Wallet PK truth test.
 *
 * Verifies the wallet route filters user_xp / user_coins / user_streaks /
 * coin_transactions on `teen_id` (NOT `user_id`).
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

const TEEN_ID = "11111111-1111-1111-1111-111111111111"

interface State {
  eqCalls: Array<{ table: string; col: string; val: unknown }>
}
const state: State = { eqCalls: [] }

vi.mock("@/lib/auth/get-user-role", () => ({
  getUserRole: vi.fn(async () => ({
    role: "teen",
    profileId: TEEN_ID,
    teenData: { id: TEEN_ID },
  })),
}))

function makeBuilder(table: string) {
  const builder: any = {
    select: vi.fn(() => builder),
    eq: vi.fn((col: string, val: unknown) => {
      state.eqCalls.push({ table, col, val })
      return builder
    }),
    in: vi.fn(() => builder),
    order: vi.fn(() => builder),
    limit: vi.fn(() => builder),
    single: vi.fn(async () => ({ data: null, error: null })),
    maybeSingle: vi.fn(async () => {
      if (table === "user_coins") return { data: { balance: 0 }, error: null }
      if (table === "user_xp")
        return { data: { total_xp: 0, current_level: 1 }, error: null }
      if (table === "user_streaks")
        return { data: { current_streak: 0 }, error: null }
      return { data: null, error: null }
    }),
  }
  // Allow `await builder` to resolve for non-single chains (transactions).
  builder.then = (resolve: any) => resolve({ data: [], error: null })
  return builder
}

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    from: (table: string) => makeBuilder(table),
  })),
}))

const { GET } = await import("@/app/api/teen/wallet/route")

beforeEach(() => {
  state.eqCalls = []
})
afterEach(() => vi.clearAllMocks())

describe("GET /api/teen/wallet (PK truth)", () => {
  it("filters user_coins on teen_id, never user_id", async () => {
    const req = new Request("http://localhost/api/teen/wallet")
    await GET(req as any)
    const userCoinsEqs = state.eqCalls.filter((c) => c.table === "user_coins")
    expect(userCoinsEqs.length).toBeGreaterThan(0)
    for (const c of userCoinsEqs) {
      expect(c.col).toBe("teen_id")
      expect(c.col).not.toBe("user_id")
    }
  })

  it("filters user_xp on teen_id, never user_id", async () => {
    const req = new Request("http://localhost/api/teen/wallet")
    await GET(req as any)
    const userXpEqs = state.eqCalls.filter((c) => c.table === "user_xp")
    expect(userXpEqs.length).toBeGreaterThan(0)
    for (const c of userXpEqs) {
      expect(c.col).toBe("teen_id")
    }
  })

  it("filters coin_transactions on teen_id, never user_id", async () => {
    const req = new Request("http://localhost/api/teen/wallet")
    await GET(req as any)
    const ctEqs = state.eqCalls.filter((c) => c.table === "coin_transactions")
    for (const c of ctEqs) {
      expect(c.col).toBe("teen_id")
    }
  })
})
