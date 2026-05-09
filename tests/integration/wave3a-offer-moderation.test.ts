/**
 * Wave 3A — partner offer moderation lifecycle.
 *
 * Verifies:
 *   1. POST /api/partner/offers always inserts status='pending_approval',
 *      is_active=false (canon §4.1 — never live on create).
 *   2. POST /api/admin/partners/offers/:id/decision approve flips status →
 *      'approved' and is_active → true; rejects flips status → 'rejected'
 *      and is_active → false. Audit_log written either way.
 *   3. Non-admin caller on the decision route → 403.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

const PARTNER_ID = "55555555-5555-5555-5555-555555555555"
const PARTNER_USER_ID = "66666666-6666-6666-6666-666666666666"
const ADMIN_ID = "77777777-7777-7777-7777-777777777777"
const OFFER_ID = "88888888-8888-8888-8888-888888888888"

interface State {
  callerInfo: any
  partner: any
  inserts: Array<{ table: string; row: any }>
  updates: Array<{ table: string; values: any; eqVal?: any }>
  auditInserts: Array<any>
  authUser: { id: string } | null
  adminRole: { role: string } | null
  offer: any
  taxonomy: Array<{ tag: string }>
}
const state: State = {
  callerInfo: { role: "partner", profileId: PARTNER_USER_ID, email: "p@partner.ma" },
  partner: { id: PARTNER_ID, company_name: "Test" },
  inserts: [],
  updates: [],
  auditInserts: [],
  authUser: { id: ADMIN_ID },
  adminRole: { role: "admin" },
  offer: null,
  taxonomy: [],
}

vi.mock("@/lib/auth/get-user-role", () => ({
  getUserRole: vi.fn(async () => state.callerInfo),
}))

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    auth: {
      getUser: vi.fn(async () => ({ data: { user: state.authUser }, error: null })),
    },
    from(table: string) {
      const builder: any = {
        select: () => builder,
        eq: () => builder,
        in: () => builder,
        single: async () => {
          if (table === "partners") return { data: state.partner, error: null }
          return { data: null, error: null }
        },
        maybeSingle: async () => {
          if (table === "partners") return { data: state.partner, error: null }
          return { data: null, error: null }
        },
        insert: (rows: any) => {
          const arr = Array.isArray(rows) ? rows : [rows]
          for (const row of arr) state.inserts.push({ table, row })
          return {
            select: () => ({
              single: async () => {
                if (table === "partner_offers") {
                  const inserted = arr[0]
                  return { data: { id: OFFER_ID, ...inserted }, error: null }
                }
                return { data: null, error: null }
              },
            }),
          }
        },
        update: (values: any) => {
          state.updates.push({ table, values })
          return { eq: () => Promise.resolve({ data: null, error: null }) }
        },
      }
      // taxonomy validation
      if (table === "interest_taxonomy") {
        builder.in = () => Promise.resolve({ data: state.taxonomy, error: null })
      }
      if (table === "audit_log") {
        builder.insert = (row: any) => {
          state.auditInserts.push(row)
          return Promise.resolve({ data: null, error: null })
        }
      }
      return builder
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
          if (table === "partner_offers") return { data: state.offer, error: null }
          return { data: null, error: null }
        },
        update: (values: any) => {
          state.updates.push({ table, values })
          return { eq: () => Promise.resolve({ data: null, error: null }) }
        },
        insert: (row: any) => {
          if (table === "audit_log") state.auditInserts.push(row)
          return Promise.resolve({ data: null, error: null })
        },
      }
      return builder
    },
  })),
}))

const { POST: createOffer } = await import("@/app/api/partner/offers/route")
const { POST: decideOffer } = await import("@/app/api/admin/partners/offers/[id]/decision/route")

beforeEach(() => {
  state.callerInfo = { role: "partner", profileId: PARTNER_USER_ID, email: "p@partner.ma" }
  state.partner = { id: PARTNER_ID, company_name: "Test" }
  state.inserts = []
  state.updates = []
  state.auditInserts = []
  state.authUser = { id: ADMIN_ID }
  state.adminRole = { role: "admin" }
  state.offer = { id: OFFER_ID, partner_id: PARTNER_ID, status: "pending_approval", is_active: false, title: "X" }
  state.taxonomy = []
})
afterEach(() => vi.clearAllMocks())

describe("partner offer moderation", () => {
  it("POST /api/partner/offers inserts status='pending_approval', is_active=false", async () => {
    const req = new Request("http://localhost/api/partner/offers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "10% off",
        discountValue: 10,
        validFrom: new Date().toISOString(),
        validUntil: new Date(Date.now() + 86400000).toISOString(),
      }),
    })
    const res = await createOffer(req)
    expect(res.status).toBe(200)

    const offerInsert = state.inserts.find((i) => i.table === "partner_offers")
    expect(offerInsert).toBeTruthy()
    expect(offerInsert!.row.status).toBe("pending_approval")
    expect(offerInsert!.row.is_active).toBe(false)

    const audit = state.auditInserts.find((a) => a.action === "partner_offer.create")
    expect(audit).toBeTruthy()
  })

  it("POST decision approve flips status → 'approved' and is_active → true + audits", async () => {
    const req = new Request(`http://localhost/api/admin/partners/offers/${OFFER_ID}/decision`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ decision: "approved" }),
    })
    const res = await decideOffer(req, { params: Promise.resolve({ id: OFFER_ID }) })
    expect(res.status).toBe(200)

    const upd = state.updates.find((u) => u.table === "partner_offers")
    expect(upd).toBeTruthy()
    expect(upd!.values.status).toBe("approved")
    expect(upd!.values.is_active).toBe(true)
    expect(upd!.values.approved_by).toBe(ADMIN_ID)

    const audit = state.auditInserts.find((a) => a.action === "partner_offer.approved")
    expect(audit).toBeTruthy()
  })

  it("POST decision reject flips status → 'rejected' and is_active → false with reason", async () => {
    const req = new Request(`http://localhost/api/admin/partners/offers/${OFFER_ID}/decision`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ decision: "rejected", reason: "missing terms" }),
    })
    const res = await decideOffer(req, { params: Promise.resolve({ id: OFFER_ID }) })
    expect(res.status).toBe(200)

    const upd = state.updates.find((u) => u.table === "partner_offers")
    expect(upd).toBeTruthy()
    expect(upd!.values.status).toBe("rejected")
    expect(upd!.values.is_active).toBe(false)
    expect(upd!.values.rejection_reason).toBe("missing terms")

    const audit = state.auditInserts.find((a) => a.action === "partner_offer.rejected")
    expect(audit?.metadata?.reason).toBe("missing terms")
  })

  it("non-admin caller on decision → 403", async () => {
    state.adminRole = null
    const req = new Request(`http://localhost/api/admin/partners/offers/${OFFER_ID}/decision`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ decision: "approved" }),
    })
    const res = await decideOffer(req, { params: Promise.resolve({ id: OFFER_ID }) })
    expect(res.status).toBe(403)
  })

  it("invalid decision → 400", async () => {
    const req = new Request(`http://localhost/api/admin/partners/offers/${OFFER_ID}/decision`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ decision: "maybe" }),
    })
    const res = await decideOffer(req, { params: Promise.resolve({ id: OFFER_ID }) })
    expect(res.status).toBe(400)
  })
})
