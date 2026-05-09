/**
 * Wave 3B.3 — partner settings PATCH route.
 *
 * Verifies:
 *   1. Non-partner caller → 401.
 *   2. Allowed-fields-only update succeeds; payload returned.
 *   3. Forbidden fields (partner_type / status / email / kyc_status) are
 *      stripped from the update payload — never reach the SQL UPDATE.
 *   4. audit_log written.
 *   5. Empty payload → 400 no_fields.
 *   6. Invalid URL for `website` → 400 invalid_body.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

const PARTNER_USER_ID = "11111111-1111-1111-1111-111111111111"
const PARTNER_ID = "22222222-2222-2222-2222-222222222222"

interface State {
  callerInfo: any
  partner: any
  updates: Array<{ table: string; values: any }>
  auditInserts: Array<any>
}
const state: State = {
  callerInfo: { role: "partner", profileId: PARTNER_USER_ID, email: "p@partner.ma" },
  partner: { id: PARTNER_ID, status: "active", partner_type: "retail" },
  updates: [],
  auditInserts: [],
}

vi.mock("@/lib/auth/get-user-role", () => ({
  getUserRole: vi.fn(async () => state.callerInfo),
}))

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({})),
}))

vi.mock("@/lib/supabase/service-role", () => ({
  createServiceRoleClient: vi.fn(() => ({
    from(table: string) {
      const builder: any = {
        select: () => builder,
        eq: () => builder,
        maybeSingle: async () => {
          if (table === "partners") return { data: state.partner, error: null }
          return { data: null, error: null }
        },
        insert: (row: any) => {
          if (table === "audit_log") state.auditInserts.push(row)
          return Promise.resolve({ data: null, error: null })
        },
        update: (values: any) => {
          state.updates.push({ table, values })
          return {
            eq: () => ({
              select: () => ({
                single: async () => ({
                  data: { id: PARTNER_ID, ...values },
                  error: null,
                }),
              }),
            }),
          }
        },
      }
      return builder
    },
  })),
}))

const { PATCH } = await import("@/app/api/partner/settings/route")

function makeReq(body: any) {
  return new Request("http://localhost/api/partner/settings", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })
}

beforeEach(() => {
  state.callerInfo = { role: "partner", profileId: PARTNER_USER_ID, email: "p@partner.ma" }
  state.partner = { id: PARTNER_ID, status: "active", partner_type: "retail" }
  state.updates = []
  state.auditInserts = []
})
afterEach(() => vi.clearAllMocks())

describe("PATCH /api/partner/settings", () => {
  it("non-partner caller → 401", async () => {
    state.callerInfo = null
    const res = await PATCH(makeReq({ company_name: "X" }))
    expect(res.status).toBe(401)
  })

  it("invalid payload (bad URL) → 400", async () => {
    const res = await PATCH(makeReq({ website: "not-a-url" }))
    expect(res.status).toBe(400)
  })

  it("empty payload → 400 no_fields", async () => {
    const res = await PATCH(makeReq({}))
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.error).toBe("no_fields")
  })

  it("allowed fields update succeeds, audit_log written", async () => {
    const res = await PATCH(makeReq({
      company_name: "Acme Co",
      phone: "+212-600-000-000",
      website: "https://acme.ma",
      description: "Bonjour",
    }))
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.success).toBe(true)

    const upd = state.updates.find((u) => u.table === "partners")
    expect(upd).toBeTruthy()
    expect(upd!.values.company_name).toBe("Acme Co")
    expect(upd!.values.phone).toBe("+212-600-000-000")

    const audit = state.auditInserts.find((a) => a.action === "partner.settings.update")
    expect(audit).toBeTruthy()
    expect(audit!.metadata.fields).toEqual(
      expect.arrayContaining(["company_name", "phone", "website", "description"]),
    )
  })

  it("strips partner_type / status / email / kyc_status (mass-assignment guard)", async () => {
    const res = await PATCH(makeReq({
      company_name: "Acme",
      partner_type: "club",
      status: "active",
      email: "evil@x.ma",
      kyc_status: "approved",
    }))
    // Forbidden keys cause zod to reject the body since it's a strict-shape
    // check on extras… actually zod default strips unknown keys, so we expect
    // the route to succeed but to NEVER include the forbidden keys in the
    // update payload.
    expect(res.status).toBe(200)
    const upd = state.updates.find((u) => u.table === "partners")!
    expect(upd.values).not.toHaveProperty("partner_type")
    expect(upd.values).not.toHaveProperty("status")
    expect(upd.values).not.toHaveProperty("email")
    expect(upd.values).not.toHaveProperty("kyc_status")
  })
})
