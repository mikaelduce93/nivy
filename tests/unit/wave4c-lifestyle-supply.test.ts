/**
 * Wave 4C — static guards for lifestyle / supply truth.
 *
 * 1. Marketplace listing route exports GET, PATCH, DELETE.
 * 2. Marketplace listing GET uses the PUBLIC_VISIBLE_STATUSES gate so
 *    pending / removed listings can't surface via direct URL.
 * 3. Restaurant order accept + reject routes carry an order ownership
 *    check (food_orders.partner_id lookup, not_order_owner 403) BEFORE
 *    invoking the SECURITY DEFINER RPC.
 */
import { describe, expect, it } from "vitest"
import { readFileSync } from "node:fs"
import { resolve } from "node:path"

const ROOT = process.cwd()
const read = (p: string) => readFileSync(resolve(ROOT, p), "utf8")

describe("Wave 4C — marketplace listing route", () => {
  const src = read("app/api/marketplace/listings/[id]/route.ts")

  it("exports GET, PATCH, DELETE", () => {
    expect(src).toMatch(/export\s+async\s+function\s+GET\b/)
    expect(src).toMatch(/export\s+async\s+function\s+PATCH\b/)
    expect(src).toMatch(/export\s+async\s+function\s+DELETE\b/)
  })

  it("gates non-active listings via PUBLIC_VISIBLE_STATUSES", () => {
    expect(src).toMatch(/PUBLIC_VISIBLE_STATUSES/)
    // The gate must be applied on the listing.status in GET.
    expect(src).toMatch(/PUBLIC_VISIBLE_STATUSES\.has\(listing\.status\)/)
  })

  it("returns 404 (not 403) when an unauthorized caller hits a non-active listing", () => {
    // Don't leak existence of unmoderated content.
    expect(src).toMatch(/error:\s*"not_found".*?\}\s*,\s*\{\s*status:\s*404/s)
  })

  it("PATCH owner-edit flips active → pending_review", () => {
    expect(src).toMatch(/update\.status\s*=\s*"pending_review"/)
  })

  it("PATCH refuses sold/removed listings", () => {
    expect(src).toMatch(/listing_not_editable/)
  })

  it("DELETE soft-deletes via status='removed'", () => {
    expect(src).toMatch(/status:\s*"removed"/)
  })

  it("PATCH carries the contact-info regex defence", () => {
    expect(src).toMatch(/contact_info_blocked/)
  })
})

describe("Wave 4C — restaurant order accept ownership", () => {
  const src = read("app/api/partner/restaurant/orders/[id]/accept/route.ts")

  it("looks up the order's partner_id BEFORE calling the RPC", () => {
    const partnerLookupIdx = src.search(/from\("food_orders"\)[\s\S]{0,200}partner_id/)
    const rpcIdx = src.indexOf("partner_accept_food_order")
    expect(partnerLookupIdx).toBeGreaterThan(-1)
    expect(rpcIdx).toBeGreaterThan(-1)
    expect(partnerLookupIdx).toBeLessThan(rpcIdx)
  })

  it("returns 403 not_order_owner on partner mismatch", () => {
    expect(src).toMatch(/not_order_owner/)
    expect(src).toMatch(/status:\s*403/)
  })

  it("rejects non-pending orders with 409 invalid_status", () => {
    expect(src).toMatch(/invalid_status/)
    expect(src).toMatch(/status:\s*409/)
  })
})

describe("Wave 4C — restaurant order reject ownership", () => {
  const src = read("app/api/partner/restaurant/orders/[id]/reject/route.ts")

  it("looks up the order's partner_id BEFORE calling the RPC", () => {
    const partnerLookupIdx = src.search(/from\("food_orders"\)[\s\S]{0,200}partner_id/)
    const rpcIdx = src.indexOf("partner_reject_food_order")
    expect(partnerLookupIdx).toBeGreaterThan(-1)
    expect(rpcIdx).toBeGreaterThan(-1)
    expect(partnerLookupIdx).toBeLessThan(rpcIdx)
  })

  it("returns 403 not_order_owner on partner mismatch", () => {
    expect(src).toMatch(/not_order_owner/)
    expect(src).toMatch(/status:\s*403/)
  })
})
