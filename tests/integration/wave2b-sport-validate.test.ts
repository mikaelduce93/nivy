/**
 * Wave 2B — admin sport-challenge validation integration test.
 * POST /api/admin/sport-challenges/:id/validate
 *
 * Verifies:
 *   1. Approve flips validated=true and grants XP via canonical add_xp_to_user.
 *   2. Reject stores reason and DOES NOT call add_xp_to_user.
 *   3. Non-admin caller → 403.
 *   4. Already-validated row → 400 (idempotent rejection of double-approve).
 *   5. Audit log row inserted on every successful action.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

const ADMIN_ID = "44444444-4444-4444-4444-444444444444"
const PROGRESS_ID = "55555555-5555-5555-5555-555555555555"
const TEEN_ID = "66666666-6666-6666-6666-666666666666"
const CHALLENGE_ID = "77777777-7777-7777-7777-777777777777"

interface State {
  authUser: { id: string } | null
  adminRole: { role: string } | null
  progressRow: Record<string, unknown> | null
  challengeRow: Record<string, unknown> | null
  rpcCalls: Array<{ name: string; args: unknown }>
  insertedAudit: Array<Record<string, unknown>>
  updates: Array<{ table: string; values: Record<string, unknown> }>
  rpcResult: { data: unknown; error: unknown }
}
const state: State = {
  authUser: { id: ADMIN_ID },
  adminRole: { role: "admin" },
  progressRow: null,
  challengeRow: null,
  rpcCalls: [],
  insertedAudit: [],
  updates: [],
  rpcResult: { data: { success: true }, error: null },
}

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    auth: {
      getUser: vi.fn(async () => ({
        data: { user: state.authUser },
        error: null,
      })),
    },
  })),
}))

vi.mock("@/lib/supabase/service-role", () => ({
  createServiceRoleClient: vi.fn(() => ({
    from(table: string) {
      const builder: any = {
        select: () => builder,
        eq: () => builder,
        maybeSingle: async () => {
          if (table === "admin_roles") return { data: state.adminRole, error: null }
          if (table === "teen_physical_challenge_progress") {
            return { data: state.progressRow, error: null }
          }
          if (table === "physical_challenges") {
            return { data: state.challengeRow, error: null }
          }
          return { data: null, error: null }
        },
        update: (values: Record<string, unknown>) => {
          state.updates.push({ table, values })
          return {
            eq: () => Promise.resolve({ data: null, error: null }),
          }
        },
        insert: (row: Record<string, unknown>) => {
          if (table === "audit_log") state.insertedAudit.push(row)
          return Promise.resolve({ data: null, error: null })
        },
      }
      return builder
    },
    rpc: vi.fn(async (name: string, args: unknown) => {
      state.rpcCalls.push({ name, args })
      return state.rpcResult
    }),
  })),
}))

const { POST } = await import(
  "@/app/api/admin/sport-challenges/[id]/validate/route"
)

function makeRequest(body: unknown) {
  return new Request(
    `http://localhost/api/admin/sport-challenges/${PROGRESS_ID}/validate`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    },
  )
}
const ctx = { params: Promise.resolve({ id: PROGRESS_ID }) }

beforeEach(() => {
  state.authUser = { id: ADMIN_ID }
  state.adminRole = { role: "admin" }
  state.progressRow = {
    id: PROGRESS_ID,
    teen_id: TEEN_ID,
    challenge_id: CHALLENGE_ID,
    completed: true,
    validated: false,
    proof_url: "teen/x/y.jpg",
    xp_earned: 0,
  }
  state.challengeRow = {
    id: CHALLENGE_ID,
    name: "30 push-ups",
    xp_reward: 80,
  }
  state.rpcCalls = []
  state.insertedAudit = []
  state.updates = []
  state.rpcResult = { data: { success: true }, error: null }
})
afterEach(() => vi.clearAllMocks())

describe("POST /api/admin/sport-challenges/:id/validate", () => {
  it("approve flips validated=true and grants XP via add_xp_to_user", async () => {
    const res = await POST(makeRequest({ action: "approve" }) as any, ctx)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.success).toBe(true)
    expect(body.action).toBe("approved")
    expect(body.xp_awarded).toBe(80)

    // Canonical XP RPC was called (NOT phantom add_user_xp).
    expect(state.rpcCalls).toHaveLength(1)
    expect(state.rpcCalls[0].name).toBe("add_xp_to_user")
    const args = state.rpcCalls[0].args as Record<string, unknown>
    expect(args.p_teen_id).toBe(TEEN_ID)
    expect(args.p_xp_amount).toBe(80)
    expect(args.p_source_type).toBe("physical_challenge")

    // Update flipped validated=true with admin id.
    const update = state.updates.find(
      (u) => u.table === "teen_physical_challenge_progress",
    )
    expect(update).toBeTruthy()
    expect(update!.values.validated).toBe(true)
    expect(update!.values.validated_by).toBe(ADMIN_ID)
    expect(update!.values.xp_earned).toBe(80)

    // Audit log emitted.
    expect(state.insertedAudit).toHaveLength(1)
    expect(state.insertedAudit[0].action).toBe("physical_challenge.approve")
  })

  it("reject stores reason and does NOT call add_xp_to_user", async () => {
    const res = await POST(
      makeRequest({ action: "reject", reason: "blurry photo" }) as any,
      ctx,
    )
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.action).toBe("rejected")

    // No XP grant on rejection.
    expect(state.rpcCalls.find((c) => c.name === "add_xp_to_user")).toBeUndefined()

    const update = state.updates.find(
      (u) => u.table === "teen_physical_challenge_progress",
    )
    expect(update!.values.rejection_reason).toBe("blurry photo")
    expect(update!.values.validated).toBe(false)
    expect(update!.values.completed).toBe(false)

    expect(state.insertedAudit[0].action).toBe("physical_challenge.reject")
  })

  it("non-admin caller → 403", async () => {
    state.adminRole = null
    const res = await POST(makeRequest({ action: "approve" }) as any, ctx)
    expect(res.status).toBe(403)
    expect(state.rpcCalls).toHaveLength(0)
  })

  it("already-validated row → 400 (idempotent)", async () => {
    state.progressRow = {
      ...(state.progressRow as Record<string, unknown>),
      validated: true,
    }
    const res = await POST(makeRequest({ action: "approve" }) as any, ctx)
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toBe("already_validated")
    expect(state.rpcCalls).toHaveLength(0)
  })

  it("invalid action → 400", async () => {
    const res = await POST(makeRequest({ action: "bogus" }) as any, ctx)
    expect(res.status).toBe(400)
  })

  it("unauthenticated → 401", async () => {
    state.authUser = null
    const res = await POST(makeRequest({ action: "approve" }) as any, ctx)
    expect(res.status).toBe(401)
  })
})
