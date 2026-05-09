/**
 * Wave 3A — partner scanner v2 endpoint behavior.
 *
 * Verifies:
 *   1. TPVIP: legacy payload → 400 legacy_qr_rejected (default env).
 *   2. Malformed v2 payload → 400 with parse reason.
 *   3. Successful v2 path calls apply_partner_offer RPC with the parsed
 *      nonce + exp_unix.
 *   4. RPC qr_replay surfaces as 400.
 *   5. Non-partner caller → 401.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { signV2Qr } from "@/lib/partner/qr-v2"

const PARTNER_USER_ID = "11111111-1111-1111-1111-111111111111"
const TEEN_ID = "22222222-2222-2222-2222-222222222222"
const OFFER_ID = "33333333-3333-3333-3333-333333333333"
const SEED = Buffer.from("nivy-scanner-test-seed-32-bytes-for-hmac").toString("base64")

interface State {
  callerInfo: any
  vipCard: any
  rpcResult: { data: any; error: any }
  rpcCalls: Array<{ name: string; args: any }>
  auditInserts: Array<any>
}
const state: State = {
  callerInfo: { role: "partner", profileId: PARTNER_USER_ID, email: "p@partner.ma" },
  vipCard: null,
  rpcResult: { data: { success: true, usage_id: "u1", discount_amount: 10, final_amount: 90 }, error: null },
  rpcCalls: [],
  auditInserts: [],
}

vi.mock("@/lib/auth/get-user-role", () => ({
  getUserRole: vi.fn(async () => state.callerInfo),
}))

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    rpc: vi.fn(async (name: string, args: any) => {
      state.rpcCalls.push({ name, args })
      return state.rpcResult
    }),
  })),
}))

vi.mock("@/lib/supabase/service-role", () => ({
  createServiceRoleClient: vi.fn(() => ({
    from(table: string) {
      const builder: any = {
        select: () => builder,
        eq: () => builder,
        maybeSingle: async () => {
          if (table === "partner_qr_secret") return { data: { secret_b64: SEED }, error: null }
          if (table === "vip_cards") return { data: state.vipCard, error: null }
          return { data: null, error: null }
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

const { POST } = await import("@/app/api/partner/scanner/apply/route")

beforeEach(() => {
  delete process.env.ALLOW_LEGACY_TPVIP_QR
  state.callerInfo = { role: "partner", profileId: PARTNER_USER_ID, email: "p@partner.ma" }
  state.vipCard = {
    card_number: "VIP-CARD-007",
    profile_id: TEEN_ID,
    status: "active",
    end_date: new Date(Date.now() + 86400000).toISOString(),
  }
  state.rpcResult = { data: { success: true, usage_id: "u1", discount_amount: 10, final_amount: 90 }, error: null }
  state.rpcCalls = []
  state.auditInserts = []
})
afterEach(() => vi.clearAllMocks())

function makeReq(body: any) {
  return new Request("http://localhost/api/partner/scanner/apply", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })
}

describe("POST /api/partner/scanner/apply", () => {
  it("TPVIP: legacy payload → 400 legacy_qr_rejected (default env)", async () => {
    const res = await POST(makeReq({
      qr_payload: "TPVIP:user-1:VIP-CARD-007",
      offer_id: OFFER_ID,
      purchase_amount: 100,
      idempotency_key: "00000000-0000-4000-8000-000000000001",
    }))
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toBe("legacy_qr_rejected")
    expect(state.auditInserts.find((a) => a.action === "partner_scanner.legacy_qr_rejected")).toBeTruthy()
  })

  it("malformed v2 payload → 400 with parse reason", async () => {
    const res = await POST(makeReq({
      qr_payload: "nivy:v1:onlytwo:fields",
      offer_id: OFFER_ID,
      purchase_amount: 100,
      idempotency_key: "00000000-0000-4000-8000-000000000002",
    }))
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toBe("qr_parse_failed")
  })

  it("non-partner caller → 401", async () => {
    state.callerInfo = null
    const res = await POST(makeReq({
      qr_payload: "anything",
      offer_id: OFFER_ID,
      purchase_amount: 100,
      idempotency_key: "00000000-0000-4000-8000-000000000003",
    }))
    expect(res.status).toBe(401)
  })

  it("valid v2 path calls apply_partner_offer with parsed nonce + exp_unix", async () => {
    const signed = signV2Qr({
      seed_b64: SEED,
      user_id: TEEN_ID,
      card_number: "VIP-CARD-007",
      ttl_seconds: 60,
    })
    const res = await POST(makeReq({
      qr_payload: signed.qr,
      offer_id: OFFER_ID,
      purchase_amount: 100,
      idempotency_key: "00000000-0000-4000-8000-000000000004",
    }))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.success).toBe(true)

    expect(state.rpcCalls).toHaveLength(1)
    expect(state.rpcCalls[0].name).toBe("apply_partner_offer")
    const args = state.rpcCalls[0].args
    expect(args.p_offer_id).toBe(OFFER_ID)
    expect(args.p_member_user_id).toBe(TEEN_ID)
    expect(args.p_purchase_amount).toBe(100)
    expect(args.p_nonce).toBe(signed.nonce)
    expect(args.p_qr_exp_unix).toBe(signed.exp_unix)
  })

  it("RPC qr_replay surfaces as 400", async () => {
    state.rpcResult = { data: { success: false, error: "qr_replay" }, error: null }
    const signed = signV2Qr({ seed_b64: SEED, user_id: TEEN_ID, card_number: "VIP-CARD-007" })
    const res = await POST(makeReq({
      qr_payload: signed.qr,
      offer_id: OFFER_ID,
      purchase_amount: 100,
      idempotency_key: "00000000-0000-4000-8000-000000000005",
    }))
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toBe("qr_replay")
  })

  it("VIP card user mismatch → 400", async () => {
    state.vipCard = {
      ...state.vipCard,
      profile_id: "other-user",
    }
    const signed = signV2Qr({ seed_b64: SEED, user_id: TEEN_ID, card_number: "VIP-CARD-007" })
    const res = await POST(makeReq({
      qr_payload: signed.qr,
      offer_id: OFFER_ID,
      purchase_amount: 100,
      idempotency_key: "00000000-0000-4000-8000-000000000006",
    }))
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toBe("card_user_mismatch")
  })
})
