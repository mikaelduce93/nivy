/**
 * Wave 1B — CMI webhook HASH-validation test.
 *
 * Verifies:
 *   1. Missing HASH → 401, no DB write.
 *   2. Invalid HASH → 401, no DB write.
 *   3. Valid HASH → not 401 (further processing).
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

interface ServerState {
  inserts: Array<{ table: string; payload: unknown }>
  updates: Array<{ table: string; payload: unknown }>
  bookingExists: boolean
}
const state: ServerState = { inserts: [], updates: [], bookingExists: true }

function makeClient() {
  return {
    from(table: string) {
      const builder: any = {
        select: vi.fn(() => builder),
        insert: vi.fn(async (payload: unknown) => {
          state.inserts.push({ table, payload })
          return { data: null, error: null }
        }),
        update: vi.fn((payload: unknown) => {
          state.updates.push({ table, payload })
          return {
            eq: vi.fn(() => ({
              eq: vi.fn(() => ({
                eq: vi.fn(async () => ({ data: null, error: null })),
              })),
              single: vi.fn(async () => ({ data: null, error: null })),
            })),
          }
        }),
        eq: vi.fn(() => builder),
        single: vi.fn(async () => {
          if (table === "bookings") {
            return state.bookingExists
              ? {
                  data: {
                    id: "booking-1",
                    payment_status: "pending",
                    booking_reference: "ORDER-1",
                    total_amount: 100,
                  },
                  error: null,
                }
              : { data: null, error: { message: "not found" } }
          }
          if (table === "payment_transactions") {
            return { data: null, error: null }
          }
          return { data: null, error: null }
        }),
      }
      return builder
    },
  }
}

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => makeClient()),
}))

vi.mock("@/lib/monitoring/logger", () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}))

// CMI gateway mock — controls hash verification + parse outcome.
const verifyMock = vi.fn((_params: Record<string, string>) => false)
vi.mock("@/lib/payments/cmi", () => ({
  cmiGateway: {
    verifyCallbackHash: (params: Record<string, string>) => verifyMock(params),
    parseCallback: (params: Record<string, string>) => ({
      success: params.ProcReturnCode === "00",
      orderId: params.oid ?? "",
      transactionId: params.TransId,
      authCode: params.AuthCode,
      responseCode: params.ProcReturnCode ?? "",
      message: "ok",
      amount: undefined,
    }),
  },
}))

const { POST } = await import("@/app/api/payments/cmi/webhook/route")

function makeRequest(form: Record<string, string>) {
  const fd = new FormData()
  for (const [k, v] of Object.entries(form)) fd.append(k, v)
  return new Request("http://localhost/api/payments/cmi/webhook", {
    method: "POST",
    body: fd,
  })
}

beforeEach(() => {
  state.inserts = []
  state.updates = []
  state.bookingExists = true
  verifyMock.mockReset()
  verifyMock.mockReturnValue(false)
})
afterEach(() => vi.clearAllMocks())

describe("POST /api/payments/cmi/webhook (HASH gate)", () => {
  it("rejects a webhook with NO HASH as 401, no DB write", async () => {
    const res = await POST(
      makeRequest({ oid: "ORDER-1", ProcReturnCode: "00" }) as any
    )
    expect(res.status).toBe(401)
    expect(state.inserts).toHaveLength(0)
    expect(state.updates).toHaveLength(0)
    expect(verifyMock).not.toHaveBeenCalled()
  })

  it("rejects a webhook with an invalid HASH as 401, no DB write", async () => {
    verifyMock.mockReturnValue(false)
    const res = await POST(
      makeRequest({
        oid: "ORDER-1",
        ProcReturnCode: "00",
        HASH: "BADHASH",
      }) as any
    )
    expect(res.status).toBe(401)
    expect(state.inserts).toHaveLength(0)
    expect(verifyMock).toHaveBeenCalledTimes(1)
  })

  it("accepts a webhook with a valid HASH (not 401) and proceeds to processing", async () => {
    verifyMock.mockReturnValue(true)
    const res = await POST(
      makeRequest({
        oid: "ORDER-1",
        ProcReturnCode: "00",
        HASH: "GOODHASH",
        TransId: "tx-1",
      }) as any
    )
    expect(res.status).not.toBe(401)
    expect(verifyMock).toHaveBeenCalledTimes(1)
  })
})
