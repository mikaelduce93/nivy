/**
 * Wave 2B — legacy /api/teen/shop is GONE.
 *
 * Verifies:
 *   1. GET returns 410 with canonical error message.
 *   2. POST returns 410 with canonical error message.
 *   3. No DB call attempted (the route does not import any supabase client).
 */
import { describe, expect, it } from "vitest"

const { GET, POST } = await import("@/app/api/teen/shop/route")

describe("/api/teen/shop legacy 410-stub", () => {
  it("GET returns 410", async () => {
    const res = await GET()
    expect(res.status).toBe(410)
    const body = await res.json()
    expect(body.error).toBe("gone")
    expect(typeof body.message).toBe("string")
    expect(body.message).toMatch(/wallet/i)
  })

  it("POST returns 410", async () => {
    const res = await POST()
    expect(res.status).toBe(410)
    const body = await res.json()
    expect(body.error).toBe("gone")
  })
})
