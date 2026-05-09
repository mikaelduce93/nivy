/**
 * Wave 3A — admin partner activation atomicity.
 *
 * Verifies:
 *   1. KYC missing → 412 (rejected unless internal bypass flag).
 *   2. Non-admin caller → 403.
 *   3. Active partner → noop_already_active outcome (idempotent).
 *   4. Successful activation invokes auth.admin.inviteUserByEmail and upserts
 *      partner_staff (role='owner', is_active=true).
 *   5. audit_log written.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

const ADMIN_ID = "11111111-1111-1111-1111-111111111111"
const PARTNER_ID = "22222222-2222-2222-2222-222222222222"

interface State {
  authUser: { id: string } | null
  adminRole: { role: string } | null
  partner: any
  docs: Array<{ status: string }>
  pending: any
  profile: any
  inviteResult: { user: { id: string } | null; error: any }
  inviteCalls: Array<{ email: string }>
  staffUpserts: Array<any>
  partnerUpdates: Array<any>
  pendingUpdates: Array<any>
  auditInserts: Array<any>
}
const state: State = {
  authUser: { id: ADMIN_ID },
  adminRole: { role: "admin" },
  partner: null,
  docs: [],
  pending: null,
  profile: null,
  inviteResult: { user: { id: "33333333-3333-3333-3333-333333333333" }, error: null },
  inviteCalls: [],
  staffUpserts: [],
  partnerUpdates: [],
  pendingUpdates: [],
  auditInserts: [],
}

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    auth: {
      getUser: vi.fn(async () => ({ data: { user: state.authUser }, error: null })),
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
          if (table === "partners") return { data: state.partner, error: null }
          if (table === "partner_pending_credentials") return { data: state.pending, error: null }
          if (table === "profiles") return { data: state.profile, error: null }
          return { data: null, error: null }
        },
        update: (values: any) => {
          if (table === "partners") state.partnerUpdates.push(values)
          if (table === "partner_pending_credentials") state.pendingUpdates.push(values)
          if (table === "profiles") {
            // role flip noop
          }
          return { eq: () => Promise.resolve({ data: null, error: null }) }
        },
        insert: (row: any) => {
          if (table === "audit_log") state.auditInserts.push(row)
          return Promise.resolve({ data: null, error: null })
        },
        upsert: (row: any) => {
          if (table === "partner_staff") state.staffUpserts.push(row)
          return Promise.resolve({ data: null, error: null })
        },
      }
      // For docs query .from('kyc_documents').select(...).eq(...)
      if (table === "kyc_documents") {
        builder.then = undefined
        builder.eq = (col: string, val: any) => ({
          ...builder,
          // The route awaits this directly without .maybeSingle() — return data property.
          then: (cb: any) => cb({ data: state.docs, error: null }),
        })
      }
      return builder
    },
    auth: {
      admin: {
        inviteUserByEmail: vi.fn(async (email: string) => {
          state.inviteCalls.push({ email })
          return { data: state.inviteResult, error: state.inviteResult.error }
        }),
      },
    },
  })),
}))

vi.mock("@/lib/auth/password", () => ({
  verifyPassword: vi.fn(async () => true),
}))

const { POST } = await import("@/app/api/admin/partners/[id]/activate/route")

function makeRequest(body: unknown = {}) {
  return new Request(`http://localhost/api/admin/partners/${PARTNER_ID}/activate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })
}
const ctx = { params: Promise.resolve({ id: PARTNER_ID }) }

beforeEach(() => {
  state.authUser = { id: ADMIN_ID }
  state.adminRole = { role: "admin" }
  state.partner = {
    id: PARTNER_ID,
    email: "test@partner.ma",
    company_name: "Test Partner",
    partner_type: "retail",
    status: "pending",
  }
  state.docs = [{ status: "approved" }]
  state.pending = {
    id: "p-cred-1",
    password_hash: "scrypt$abc$def",
    email: "test@partner.ma",
    expires_at: new Date(Date.now() + 86400000).toISOString(),
    consumed_at: null,
  }
  state.profile = null
  state.inviteResult = { user: { id: "auth-new-1" }, error: null }
  state.inviteCalls = []
  state.staffUpserts = []
  state.partnerUpdates = []
  state.pendingUpdates = []
  state.auditInserts = []
})
afterEach(() => vi.clearAllMocks())

describe("POST /api/admin/partners/:id/activate", () => {
  it("non-admin caller → 403", async () => {
    state.adminRole = null
    const res = await POST(makeRequest() as any, ctx)
    expect(res.status).toBe(403)
  })

  it("unauthenticated → 401", async () => {
    state.authUser = null
    const res = await POST(makeRequest() as any, ctx)
    expect(res.status).toBe(401)
  })

  it("KYC missing → 412 unless bypass requested", async () => {
    state.docs = []
    const res = await POST(makeRequest() as any, ctx)
    expect(res.status).toBe(412)
    const body = await res.json()
    expect(body.error).toBe("kyc_not_approved")
  })

  it("KYC missing + bypass requested but env flag off → 412", async () => {
    state.docs = []
    delete process.env.ALLOW_PARTNER_KYC_BYPASS
    const res = await POST(makeRequest({ allow_kyc_bypass: true }) as any, ctx)
    expect(res.status).toBe(412)
  })

  it("active partner → noop_already_active (idempotent)", async () => {
    state.partner.status = "active"
    const res = await POST(makeRequest() as any, ctx)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.outcome).toBe("noop_already_active")
    expect(state.auditInserts.find((a) => a.action === "partner.activate.reconcile")).toBeTruthy()
  })

  it("successful activation: invites user, upserts staff owner, flips status, audits", async () => {
    const res = await POST(makeRequest() as any, ctx)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.success).toBe(true)
    expect(body.provisioned).toBe("created")

    expect(state.inviteCalls).toHaveLength(1)
    expect(state.inviteCalls[0].email).toBe("test@partner.ma")

    expect(state.staffUpserts).toHaveLength(1)
    expect(state.staffUpserts[0].role).toBe("owner")
    expect(state.staffUpserts[0].is_active).toBe(true)
    expect(state.staffUpserts[0].partner_id).toBe(PARTNER_ID)

    expect(state.partnerUpdates.find((u) => u.status === "active")).toBeTruthy()
    expect(state.pendingUpdates.find((u) => u.consumed_at)).toBeTruthy()

    expect(state.auditInserts.find((a) => a.action === "partner.activate")).toBeTruthy()
  })
})
