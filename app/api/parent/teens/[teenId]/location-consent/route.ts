/**
 * POST /api/parent/teens/[teenId]/location-consent — per-teen geolocation
 * revocation (loi 09-08/CNDP: consent must be revocable).
 *
 * Body: { enabled: boolean }. Sets parent_teen_links.location_revoked = !enabled
 * for the (parent, teen) link the caller owns. The signed baseline
 * (e_signatures.location_consent) is unchanged — this is the per-teen override.
 * Gated role=parent + CSRF; only affects the caller's own active link.
 */
import { NextResponse } from "next/server"
import { z } from "zod"
import { createServiceRoleClient } from "@/lib/supabase/service-role"
import { getUserRole } from "@/lib/auth/get-user-role"
import { validateCsrfRequest } from "@/lib/security/csrf"

export const dynamic = "force-dynamic"

const bodySchema = z.object({ enabled: z.boolean() })

export async function POST(request: Request, ctx: { params: Promise<{ teenId: string }> }) {
  if (!(await validateCsrfRequest(request))) {
    return NextResponse.json({ success: false, error: "Jeton CSRF invalide" }, { status: 403 })
  }
  const userInfo = await getUserRole()
  if (!userInfo || userInfo.role !== "parent") {
    return NextResponse.json({ success: false, error: "Non autorisé" }, { status: 401 })
  }
  const { teenId } = await ctx.params
  const parsed = bodySchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: "Requête invalide" }, { status: 400 })
  }

  const sr = createServiceRoleClient()
  const { data, error } = await sr
    .from("parent_teen_links")
    .update({ location_revoked: !parsed.data.enabled })
    .eq("parent_id", userInfo.profileId)
    .eq("teen_id", teenId)
    .eq("status", "active")
    .select("teen_id")
    .maybeSingle()

  if (error) {
    console.error("[parent/teens/location-consent] update failed:", error.message)
    return NextResponse.json({ success: false, error: "Erreur serveur" }, { status: 500 })
  }
  if (!data) {
    return NextResponse.json({ success: false, error: "Ado non lié à ton compte" }, { status: 404 })
  }

  await sr.from("audit_log").insert({
    actor_id: userInfo.profileId,
    actor_role: "parent",
    action: "location_consent.update",
    resource_type: "parent_teen_link",
    target_user_id: teenId,
    description: `Géolocalisation ${parsed.data.enabled ? "réactivée" : "révoquée"} pour l'ado`,
    metadata: { enabled: parsed.data.enabled },
  })

  return NextResponse.json({ success: true, enabled: parsed.data.enabled })
}
