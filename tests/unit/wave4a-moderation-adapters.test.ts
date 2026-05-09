/**
 * Wave 4A — moderation content adapters.
 *
 * Verifies that adapterFor returns null for unknown content_types and that
 * each known adapter exposes effectFor decisions correctly.
 */
import { describe, expect, it } from "vitest"
import {
  adapterFor,
  listSupportedContentTypes,
  DECISIONS_REQUIRING_REASON,
} from "@/lib/admin/moderation-adapters"

describe("moderation-adapters", () => {
  it("returns null for unknown content_type (drives 409 unsupported_action)", () => {
    expect(adapterFor("not_a_thing")).toBeNull()
  })

  it("supports the canonical content_types: feed_post, marketplace_listing, partner_offer", () => {
    const supported = listSupportedContentTypes()
    expect(supported).toEqual(expect.arrayContaining(["feed_post", "marketplace_listing", "partner_offer"]))
  })

  it("feed_post adapter maps non-warn/suspend decisions to UPDATE payloads", () => {
    const a = adapterFor("feed_post")!
    expect(a.effectFor("dismiss")).toMatchObject({ is_hidden: false })
    expect(a.effectFor("hide")).toMatchObject({ is_hidden: true })
    expect(a.effectFor("delete")).toMatchObject({ is_hidden: true, status: "removed" })
    expect(a.effectFor("restore")).toMatchObject({ is_hidden: false, status: "published" })
    expect(a.effectFor("escalate")).toMatchObject({ status: "escalated" })
    // warn/suspend act on the user, not the content row.
    expect(a.effectFor("warn")).toBeNull()
    expect(a.effectFor("suspend")).toBeNull()
  })

  it("partner_offer adapter respects DB CHECK invariant: is_active iff status='approved'", () => {
    const a = adapterFor("partner_offer")!
    const dismiss = a.effectFor("dismiss") as Record<string, unknown>
    expect(dismiss.status).toBe("approved")
    expect(dismiss.is_active).toBe(true)

    const hide = a.effectFor("hide") as Record<string, unknown>
    expect(hide.status).toBe("rejected")
    expect(hide.is_active).toBe(false)
  })

  it("DECISIONS_REQUIRING_REASON is the canonical destructive set", () => {
    expect(DECISIONS_REQUIRING_REASON.has("delete")).toBe(true)
    expect(DECISIONS_REQUIRING_REASON.has("warn")).toBe(true)
    expect(DECISIONS_REQUIRING_REASON.has("suspend")).toBe(true)
    expect(DECISIONS_REQUIRING_REASON.has("dismiss")).toBe(false)
    expect(DECISIONS_REQUIRING_REASON.has("hide")).toBe(false)
    expect(DECISIONS_REQUIRING_REASON.has("restore")).toBe(false)
    expect(DECISIONS_REQUIRING_REASON.has("escalate")).toBe(false)
  })
})
