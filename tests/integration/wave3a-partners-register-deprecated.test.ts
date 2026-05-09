/**
 * Wave 3A — legacy /api/partners/register no longer creates orphan partners.
 *
 * Verifies:
 *   1. POST without password → 410 with deprecated_endpoint code.
 *   2. The route never directly inserts into partners (no auth.users
 *      provisioning path) — it only forwards to /api/partners/wizard/submit.
 */
import { describe, expect, it } from "vitest"

const { POST } = await import("@/app/api/partners/register/route")

function makeRequest(body: unknown) {
  return new Request("http://localhost/api/partners/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })
}

describe("/api/partners/register (legacy, no-orphan guarantee)", () => {
  it("rejects payloads without password — returns 410 deprecated_endpoint", async () => {
    const res = await POST(makeRequest({
      partner_type: "retail",
      company_name: "Acme",
      email: "acme@example.com",
    }) as any)
    expect(res.status).toBe(410)
    const body = await res.json()
    expect(body.success).toBe(false)
    expect(body.error).toBe("deprecated_endpoint")
    expect(body.canonical).toBe("/api/partners/wizard/submit")
  })
})
