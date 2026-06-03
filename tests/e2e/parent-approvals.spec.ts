import { randomUUID } from "node:crypto"
import { expect, hasCredentials, test } from "../fixtures/auth"
import { getProfileIdByEmail, getServiceClient } from "../fixtures/db"

/**
 * E2E lock for cross-account parental approvals (#75 · Pilier G/K).
 *
 * Route under test: app/api/parent/approvals/route.ts → cascade RPCs
 * (gamification-system/database/migrations/096_wave1c_parent_cascade.sql).
 *
 * We arrange a `purchase_above_ceiling` approval: its cascade
 * (parent_approve_purchase) flips ONLY the approval row + writes the teen
 * notification + audit_log, with no coupled resource row that could abort —
 * so it deterministically exercises the parent→teen visibility chain.
 *
 * Locks:
 *   - approve → parental_approvals pending → approved (route.ts:205-217) AND a
 *     teen-side user_notifications row written by the RPC (096 _approval_finalize);
 *   - replay on a non-pending approval → { idempotent:true } (route.ts:137-150);
 *   - a parent deciding ANOTHER parent's approval → 403 (route.ts:134-136).
 *
 * Requires parent creds + SUPABASE_SERVICE_ROLE_KEY. Standard seed links
 * parent.test→teen.amine and parent.silver→teen.sara.
 */

const HAS_PARENT = hasCredentials("parent")
const db = getServiceClient()
const PARENT_EMAIL = "parent.test@teenclub.ma"
const TEEN_EMAIL = "teen.amine@teenclub.ma"
const OTHER_PARENT_EMAIL = "parent.silver@teenclub.ma"
const OTHER_TEEN_EMAIL = "teen.sara@teenclub.ma"

test.describe.configure({ mode: "serial" })

test.describe("parent / cross-account approvals", () => {
  test("POST /api/parent/approvals without a session → 401", async ({ page }) => {
    const res = await page.request.post("/api/parent/approvals", {
      data: { approvalId: randomUUID(), decision: "approve" },
    })
    expect(res.status()).toBe(401)
  })

  test("authenticated parent with missing params → 400", async ({ page, signInAs }) => {
    test.skip(!HAS_PARENT, "Requires parent credentials.")
    await signInAs("parent")
    const res = await page.request.post("/api/parent/approvals", { data: {} })
    expect(res.status()).toBe(400)
  })

  test("approve flips pending→approved, notifies the teen; replay is idempotent", async ({
    page,
    signInAs,
  }) => {
    test.skip(!HAS_PARENT || !db, "Requires parent creds + service-role DB env.")
    const sb = db!
    const parentId = await getProfileIdByEmail(sb, PARENT_EMAIL)
    const teenId = await getProfileIdByEmail(sb, TEEN_EMAIL)
    test.skip(!parentId || !teenId, "Seed accounts missing — run npm run seed:beta.")

    const resourceId = randomUUID()
    const { data: appr, error } = await sb
      .from("parental_approvals")
      .insert({
        parent_id: parentId,
        teen_id: teenId,
        action_type: "purchase_above_ceiling",
        resource_type: "marketplace_listing",
        resource_id: resourceId,
        amount: 999,
        status: "pending",
      })
      .select("id")
      .single()
    expect(error).toBeNull()
    const approvalId = appr!.id as string

    try {
      await signInAs("parent")
      const res = await page.request.post("/api/parent/approvals", {
        data: { approvalId, decision: "approve" },
      })
      expect(res.status()).toBe(200)
      const body = await res.json()
      expect(body.success).toBe(true)
      expect(body.data.status).toBe("approved")

      // The decision is persisted (cross-account state change).
      const { data: row } = await sb
        .from("parental_approvals")
        .select("status")
        .eq("id", approvalId)
        .single()
      expect(row!.status).toBe("approved")

      // The cascade wrote a teen-visible notification (the chain effect).
      const { data: notifs } = await sb
        .from("user_notifications")
        .select("id")
        .eq("user_id", teenId)
        .contains("data", { approval_id: approvalId })
      expect(notifs?.length ?? 0).toBeGreaterThanOrEqual(1)

      // Replaying the now-approved approval does not re-dispatch.
      const res2 = await page.request.post("/api/parent/approvals", {
        data: { approvalId, decision: "approve" },
      })
      expect(res2.status()).toBe(200)
      const body2 = await res2.json()
      expect(body2.idempotent).toBe(true)
    } finally {
      await sb
        .from("user_notifications")
        .delete()
        .contains("data", { approval_id: approvalId })
      await sb.from("parental_approvals").delete().eq("id", approvalId)
    }
  })

  test("a parent cannot decide another parent's approval → 403", async ({ page, signInAs }) => {
    test.skip(!HAS_PARENT || !db, "Requires parent creds + service-role DB env.")
    const sb = db!
    const otherParentId = await getProfileIdByEmail(sb, OTHER_PARENT_EMAIL)
    const otherTeenId = await getProfileIdByEmail(sb, OTHER_TEEN_EMAIL)
    test.skip(!otherParentId || !otherTeenId, "Seed accounts missing — run npm run seed:beta.")

    const { data: appr } = await sb
      .from("parental_approvals")
      .insert({
        parent_id: otherParentId,
        teen_id: otherTeenId,
        action_type: "purchase_above_ceiling",
        resource_type: "marketplace_listing",
        resource_id: randomUUID(),
        amount: 500,
        status: "pending",
      })
      .select("id")
      .single()
    const approvalId = appr!.id as string

    try {
      // Signed in as parent.test — NOT the owner of this approval.
      await signInAs("parent")
      const res = await page.request.post("/api/parent/approvals", {
        data: { approvalId, decision: "approve" },
      })
      expect(res.status()).toBe(403)

      // The other parent's approval is untouched.
      const { data: row } = await sb
        .from("parental_approvals")
        .select("status")
        .eq("id", approvalId)
        .single()
      expect(row!.status).toBe("pending")
    } finally {
      await sb.from("parental_approvals").delete().eq("id", approvalId)
    }
  })
})
