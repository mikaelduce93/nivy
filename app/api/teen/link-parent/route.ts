/**
 * POST /api/teen/link-parent — V11 #300 (sens parent→ado, consommation).
 *
 * L'ado consomme un code 6 chiffres (émis par le parent via
 * /api/parent/teens/invite, #299) en le saisissant ou en scannant le QR parent.
 * Le code vit dans `linking_codes` (canon M18). La consommation par l'ado vaut
 * consentement → la liaison est créée ACTIVE via la cascade factorisée (#301).
 * Gated `role==='teen'`.
 */
import { NextResponse } from "next/server"
import { z } from "zod"
import { createServiceRoleClient } from "@/lib/supabase/service-role"
import { getUserRole } from "@/lib/auth/get-user-role"
import { linkParentTeen } from "@/lib/teens/link-cascade"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

const bodySchema = z.object({
  code: z.string().trim().regex(/^\d{6}$/, "Le code doit comporter 6 chiffres"),
})

export async function POST(request: Request) {
  const userInfo = await getUserRole()
  if (!userInfo || userInfo.role !== "teen") {
    return NextResponse.json({ success: false, error: "unauthenticated" }, { status: 401 })
  }

  let body: z.infer<typeof bodySchema>
  try {
    body = bodySchema.parse(await request.json())
  } catch {
    return NextResponse.json({ success: false, error: "invalid_code" }, { status: 400 })
  }

  const sr = createServiceRoleClient()

  // 1. Resolve the code.
  const { data: row } = await sr
    .from("linking_codes")
    .select("code, parent_id, expires_at, used_at")
    .eq("code", body.code)
    .maybeSingle()

  if (!row) {
    return NextResponse.json({ success: false, error: "invalid_code" }, { status: 404 })
  }
  if (row.used_at) {
    return NextResponse.json({ success: false, error: "already_used" }, { status: 409 })
  }
  if (new Date(row.expires_at).getTime() < Date.now()) {
    return NextResponse.json({ success: false, error: "expired" }, { status: 410 })
  }

  // 2. Atomic single-use consume (guarded on used_at IS NULL).
  const { data: consumed } = await sr
    .from("linking_codes")
    .update({ used_at: new Date().toISOString(), used_by: userInfo.profileId })
    .eq("code", body.code)
    .is("used_at", null)
    .select("code")
    .maybeSingle()

  if (!consumed) {
    return NextResponse.json({ success: false, error: "already_used" }, { status: 409 })
  }

  // 3. Link parent ↔ teen (active — teen redemption = consent) via cascade.
  const result = await linkParentTeen(sr, {
    parentId: row.parent_id,
    teenId: userInfo.profileId,
    status: "active",
    channel: "code_parent_to_teen",
    actorId: userInfo.profileId,
    actorRole: "teen",
  })
  if (!result.ok) {
    return NextResponse.json({ success: false, error: result.reason }, { status: 500 })
  }

  return NextResponse.json({
    success: true,
    data: { parentId: row.parent_id, linkId: result.linkId, alreadyLinked: result.alreadyActive },
    message: result.alreadyActive ? "Tu es déjà lié à ce parent." : "Liaison réussie !",
  })
}
