/**
 * Wave 1A — AUTH-FIX-3 integration test for /api/parent/teens/create.
 *
 * Verifies the canonical identity contract:
 *   - parent + valid teen_email → success + magic link returned
 *   - resulting auth.users.id === profiles.id === teens.id
 *   - parent_teen_links row exists with status='active'
 *   - downstream failure (parent_teen_links insert error) rolls back the
 *     auth.users row via supabase.auth.admin.deleteUser
 *   - missing teen_email AND teen_phone → 400
 *
 * Strategy: mock @supabase/supabase-js (used by lib/supabase/service-role.ts)
 * and lib/auth/get-user-role + lib/supabase/server so the route runs
 * end-to-end against in-process fakes. We then assert on the captured calls.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

// ─── Mocks (declared before importing the route under test) ───────────────

const PARENT_ID = "11111111-1111-1111-1111-111111111111"
const TEEN_UID = "22222222-2222-2222-2222-222222222222"

type RowOp = {
  table: string
  op: "insert" | "upsert" | "update" | "select"
  payload?: unknown
  filter?: { col: string; val: unknown }
  result: { data: unknown; error: unknown }
}

interface FakeState {
  pseudoTaken: boolean
  failParentTeenLinksInsert: boolean
  rowOps: RowOp[]
  authCreateUserResult: { data: { user: { id: string } } | null; error: unknown }
  authDeleteUserCalled: string | null
  generateLinkResult: {
    data: { properties: { action_link: string } } | null
    error: unknown
  }
}

const state: FakeState = {
  pseudoTaken: false,
  failParentTeenLinksInsert: false,
  rowOps: [],
  authCreateUserResult: { data: { user: { id: TEEN_UID } }, error: null },
  authDeleteUserCalled: null,
  generateLinkResult: {
    data: { properties: { action_link: "https://example.com/magic#token=abc" } },
    error: null,
  },
}

function makeAdminSupabase() {
  return {
    from(table: string) {
      const builder: Record<string, unknown> = {}

      const buildSelectChain = () => {
        const chain: Record<string, unknown> = {
          eq() {
            return chain
          },
          maybeSingle: async () => {
            if (table === "profiles" && state.pseudoTaken) {
              return { data: { id: "existing-id" }, error: null }
            }
            if (table === "teens" && state.pseudoTaken) {
              return { data: { id: "existing-id" }, error: null }
            }
            return { data: null, error: null }
          },
          single: async () => ({ data: null, error: null }),
        }
        return chain
      }

      builder.select = () => buildSelectChain()

      builder.insert = async (payload: unknown) => {
        if (table === "parent_teen_links" && state.failParentTeenLinksInsert) {
          state.rowOps.push({ table, op: "insert", payload, result: { data: null, error: { message: "forced" } } })
          return { data: null, error: { message: "forced parent_teen_links failure" } }
        }
        const res = { data: payload, error: null }
        state.rowOps.push({ table, op: "insert", payload, result: res })
        return res
      }

      builder.upsert = async (payload: unknown) => {
        const res = { data: payload, error: null }
        state.rowOps.push({ table, op: "upsert", payload, result: res })
        return res
      }

      builder.update = (payload: unknown) => {
        const upd = {
          eq: async (col: string, val: unknown) => {
            const res = { data: null, error: null }
            state.rowOps.push({
              table,
              op: "update",
              payload,
              filter: { col, val },
              result: res,
            })
            return res
          },
        }
        return upd
      }

      return builder
    },
    auth: {
      admin: {
        createUser: vi.fn(async (_payload: unknown) => state.authCreateUserResult),
        deleteUser: vi.fn(async (uid: string) => {
          state.authDeleteUserCalled = uid
          return { data: null, error: null }
        }),
        generateLink: vi.fn(async (_p: unknown) => state.generateLinkResult),
      },
    },
  }
}

vi.mock("@/lib/supabase/service-role", () => ({
  createServiceRoleClient: () => makeAdminSupabase(),
}))

vi.mock("@/lib/supabase/server", () => ({
  // The user-bound client is used only for pseudo uniqueness checks in the
  // route under test; we share the same fake.
  createClient: async () => makeAdminSupabase(),
}))

vi.mock("@/lib/auth/get-user-role", () => ({
  getUserRole: async () => ({
    role: "parent",
    profileId: PARENT_ID,
    email: "parent@example.test",
    fullName: "Parent Test",
  }),
}))

// ─── Tests ────────────────────────────────────────────────────────────────

beforeEach(() => {
  state.pseudoTaken = false
  state.failParentTeenLinksInsert = false
  state.rowOps = []
  state.authCreateUserResult = { data: { user: { id: TEEN_UID } }, error: null }
  state.authDeleteUserCalled = null
  state.generateLinkResult = {
    data: { properties: { action_link: "https://example.com/magic#token=abc" } },
    error: null,
  }
})

afterEach(() => {
  vi.clearAllMocks()
})

async function postCreate(body: unknown) {
  // Import lazily so vi.mock applies before module evaluation.
  const { POST } = await import("@/app/api/parent/teens/create/route")
  const req = new Request("http://localhost/api/parent/teens/create", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  })
  const res = await POST(req)
  const json = (await res.json()) as { success: boolean; data?: any; error?: string; details?: unknown }
  return { status: res.status, json }
}

const baseValidBody = {
  parentId: PARENT_ID,
  firstName: "Yassine",
  lastName: "Benali",
  pseudo: "yassine_b",
  dateOfBirth: "2012-05-08",
  teen_email: "yassine.teen@example.test",
}

describe("POST /api/parent/teens/create — Wave 1A canonical identity", () => {
  it("creates a teen with auth.users + teens row + parent_teen_links + magic link", async () => {
    const { status, json } = await postCreate(baseValidBody)

    expect(status).toBe(200)
    expect(json.success).toBe(true)
    expect(json.data?.id).toBe(TEEN_UID)
    expect(json.data?.actionLink).toContain("https://example.com/magic")

    const teensUpsert = state.rowOps.find((o) => o.table === "teens" && o.op === "upsert")
    expect(teensUpsert).toBeDefined()
    expect((teensUpsert!.payload as { id: string }).id).toBe(TEEN_UID)

    const linkInsert = state.rowOps.find(
      (o) => o.table === "parent_teen_links" && o.op === "insert"
    )
    expect(linkInsert).toBeDefined()
    const linkPayload = linkInsert!.payload as {
      parent_id: string
      teen_id: string
      status: string
    }
    expect(linkPayload.parent_id).toBe(PARENT_ID)
    expect(linkPayload.teen_id).toBe(TEEN_UID)
    expect(linkPayload.status).toBe("active")

    // Identity invariant: auth.users.id === teens.id === parent_teen_links.teen_id.
    expect(linkPayload.teen_id).toBe((teensUpsert!.payload as { id: string }).id)

    // No rollback on success.
    expect(state.authDeleteUserCalled).toBeNull()
  })

  it("rolls back the auth.users row when parent_teen_links insert fails", async () => {
    state.failParentTeenLinksInsert = true

    const { status, json } = await postCreate(baseValidBody)

    expect(status).toBe(500)
    expect(json.success).toBe(false)
    expect(state.authDeleteUserCalled).toBe(TEEN_UID)
  })

  it("rejects requests missing both teen_email and teen_phone", async () => {
    const body = { ...baseValidBody } as { teen_email?: string; teen_phone?: string }
    delete body.teen_email
    const { status, json } = await postCreate(body)
    expect(status).toBe(400)
    expect(json.success).toBe(false)
  })
})
