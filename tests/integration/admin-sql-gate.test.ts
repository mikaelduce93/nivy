/**
 * Wave 1C — ADMIN-SQL-GATE
 *
 * Verifies the ring-fence on /admin/scripts-sql + /api/admin/execute-sql:
 *   - 404 unless super_admin sub-role.
 *   - 404 unless ENABLE_ADMIN_SQL_CONSOLE === 'true' (or legacy
 *     ENABLE_ADMIN_SQL_EXECUTION).
 *   - Every access attempt writes to audit_log via logAdminAction.
 *
 * Coverage matrix:
 *   - anonymous → 404 page + 404 API
 *   - admin role with no admin_roles row → 404
 *   - admin + admin_roles.role='admin' (not super_admin) → 404
 *   - admin + admin_roles.role='moderator' → 404
 *   - admin + admin_roles.role='support' → 404
 *   - admin + admin_roles.role='super_admin' + env flag false → 404
 *   - admin + admin_roles.role='super_admin' + env flag true → 200
 *   - audit_log row written on attempt
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

const ADMIN_ID = "11111111-1111-1111-1111-111111111111"

interface FakeState {
  adminInfo: {
    profileId: string
    email: string
    fullName: string
    role: "admin"
    subRole: "super_admin" | "admin" | "moderator" | "support"
    permissions: Record<string, boolean>
  } | null
  envFlag: boolean
  auditWrites: Array<Record<string, unknown>>
  notFoundCalls: number
}

const state: FakeState = {
  adminInfo: null,
  envFlag: false,
  auditWrites: [],
  notFoundCalls: 0,
}

vi.mock("next/navigation", () => ({
  notFound: vi.fn(() => {
    state.notFoundCalls++
    throw new Error("NEXT_NOT_FOUND")
  }),
}))

vi.mock("@/lib/auth/admin-permissions", async () => {
  const actual = await vi.importActual<typeof import("@/lib/auth/admin-permissions")>(
    "@/lib/auth/admin-permissions",
  )
  return {
    ...actual,
    getAdminInfo: vi.fn(async () => state.adminInfo),
    logAdminAction: vi.fn(async (input: unknown) => {
      state.auditWrites.push(input as Record<string, unknown>)
    }),
  }
})

// Mock service-role / server clients used by the API route.
vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({ from: vi.fn(), auth: { getUser: vi.fn() } })),
}))
vi.mock("@/lib/supabase/service-role", () => ({
  createServiceRoleClient: vi.fn(() => ({
    rpc: vi.fn(async () => ({ data: null, error: null })),
  })),
}))
// withSecurity is a no-op pass-through in tests
vi.mock("@/lib/security/api-middleware", () => ({
  withSecurity: (h: unknown) => h,
  errorResponse: (m: string, s = 500) =>
    new Response(JSON.stringify({ error: m }), { status: s }),
  jsonResponse: (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s }),
}))

beforeEach(() => {
  state.adminInfo = null
  state.envFlag = false
  state.auditWrites = []
  state.notFoundCalls = 0
  delete process.env.ENABLE_ADMIN_SQL_CONSOLE
  delete process.env.ENABLE_ADMIN_SQL_EXECUTION
})

afterEach(() => {
  vi.clearAllMocks()
  delete process.env.ENABLE_ADMIN_SQL_CONSOLE
  delete process.env.ENABLE_ADMIN_SQL_EXECUTION
})

type SubRole = "super_admin" | "admin" | "moderator" | "support"

function makeAdmin(subRole: SubRole) {
  return {
    profileId: ADMIN_ID,
    email: "admin@test.local",
    fullName: "Test Admin",
    role: "admin" as const,
    subRole,
    permissions: {},
  }
}

describe("/admin/scripts-sql (page) — Wave 1C ring-fence", () => {
  it("anonymous → notFound (404)", async () => {
    state.adminInfo = null
    const { default: SqlPage } = await import("@/app/admin/scripts-sql/page")
    await expect(SqlPage()).rejects.toThrow("NEXT_NOT_FOUND")
    expect(state.notFoundCalls).toBe(1)
    // No audit row when there's no admin context.
    expect(state.auditWrites).toHaveLength(0)
  })

  it("admin sub-role (not super_admin) → notFound", async () => {
    state.adminInfo = makeAdmin("admin")
    process.env.ENABLE_ADMIN_SQL_CONSOLE = "true"
    const { default: SqlPage } = await import("@/app/admin/scripts-sql/page")
    await expect(SqlPage()).rejects.toThrow("NEXT_NOT_FOUND")
    // The attempt was audited.
    expect(state.auditWrites.length).toBeGreaterThanOrEqual(1)
    const row = state.auditWrites[0] as Record<string, unknown>
    expect(row.action).toBe("sql_console_access")
    expect(row.actor_id).toBe(ADMIN_ID)
  })

  it("moderator sub-role → notFound", async () => {
    state.adminInfo = makeAdmin("moderator")
    process.env.ENABLE_ADMIN_SQL_CONSOLE = "true"
    const { default: SqlPage } = await import("@/app/admin/scripts-sql/page")
    await expect(SqlPage()).rejects.toThrow("NEXT_NOT_FOUND")
  })

  it("support sub-role → notFound", async () => {
    state.adminInfo = makeAdmin("support")
    process.env.ENABLE_ADMIN_SQL_CONSOLE = "true"
    const { default: SqlPage } = await import("@/app/admin/scripts-sql/page")
    await expect(SqlPage()).rejects.toThrow("NEXT_NOT_FOUND")
  })

  it("super_admin + env flag FALSE → notFound", async () => {
    state.adminInfo = makeAdmin("super_admin")
    // env flag deliberately unset
    const { default: SqlPage } = await import("@/app/admin/scripts-sql/page")
    await expect(SqlPage()).rejects.toThrow("NEXT_NOT_FOUND")
    // Audited.
    const row = state.auditWrites[0] as Record<string, unknown>
    expect(row.action).toBe("sql_console_access")
    expect(((row.metadata as Record<string, unknown>)?.allowed)).toBe(false)
  })

  it("super_admin + env flag TRUE → renders (no notFound)", async () => {
    state.adminInfo = makeAdmin("super_admin")
    process.env.ENABLE_ADMIN_SQL_CONSOLE = "true"
    const { default: SqlPage } = await import("@/app/admin/scripts-sql/page")
    const out = await SqlPage()
    expect(out).toBeTruthy()
    // Audit row carries allowed=true.
    const row = state.auditWrites[0] as Record<string, unknown>
    expect(((row.metadata as Record<string, unknown>)?.allowed)).toBe(true)
    expect(state.notFoundCalls).toBe(0)
  })
})

describe("/api/admin/execute-sql (POST) — Wave 1C ring-fence", () => {
  // The route is wrapped with withSecurity which we no-op. We import lazily
  // because route handlers cache state on import.
  async function callPost(body: unknown) {
    const mod = await import("@/app/api/admin/execute-sql/route")
    const req = new Request("http://localhost/api/admin/execute-sql", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    }) as unknown as import("next/server").NextRequest
    return mod.POST(req)
  }

  it("anonymous → 404", async () => {
    state.adminInfo = null
    const res = await callPost({ scriptId: "105" })
    expect(res.status).toBe(404)
  })

  it("admin sub-role (not super_admin), env true → 404", async () => {
    state.adminInfo = makeAdmin("admin")
    process.env.ENABLE_ADMIN_SQL_CONSOLE = "true"
    const res = await callPost({ scriptId: "105" })
    expect(res.status).toBe(404)
    // attempt audited
    expect(state.auditWrites.some((w) => w.action === "sql_execute")).toBe(true)
  })

  it("super_admin, env false → 404", async () => {
    state.adminInfo = makeAdmin("super_admin")
    const res = await callPost({ scriptId: "105" })
    expect(res.status).toBe(404)
    expect(state.auditWrites.some((w) => w.action === "sql_execute")).toBe(true)
  })
})
