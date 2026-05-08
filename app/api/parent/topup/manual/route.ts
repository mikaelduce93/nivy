/**
 * Wave Ops-D — Parent submits a manual top-up request.
 *
 * POST /api/parent/topup/manual
 *   Body: {
 *     teen_id: uuid,
 *     amount_dh: number,
 *     provider: 'cashplus' | 'wafacash' | 'm2t' | 'damanecash' | 'baridcash' | 'other',
 *     provider_ref: string,
 *     screenshot_path?: string  // path in private bucket (parent uploaded out-of-band)
 *   }
 *
 * Inserts a row in manual_topup_requests with status='pending'. Admin reviews
 * via /admin/topups and credits via top_up_teen RPC. No coins are credited
 * here — this is the request-side only.
 *
 * E-signature gate enforced (whitepaper §10).
 */
import { NextResponse } from "next/server"
import { getUserRole } from "@/lib/auth/get-user-role"
import { createClient } from "@/lib/supabase/server"
import { createServiceRoleClient } from "@/lib/supabase/service-role"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

const ALLOWED_PROVIDERS = new Set([
  "cashplus",
  "wafacash",
  "m2t",
  "damanecash",
  "baridcash",
  "other",
])

interface ManualBody {
  teen_id?: string
  amount_dh?: number | string
  provider?: string
  provider_ref?: string
  screenshot_path?: string
}

export async function POST(request: Request) {
  try {
    const userInfo = await getUserRole()
    if (!userInfo || userInfo.role !== "parent") {
      return NextResponse.json(
        { success: false, error: "unauthorized" },
        { status: 401 }
      )
    }

    let body: ManualBody
    try {
      body = (await request.json()) as ManualBody
    } catch {
      return NextResponse.json({ success: false, error: "invalid_json" }, { status: 400 })
    }

    const teenId = (body.teen_id ?? "").trim()
    const amountDh = Number(body.amount_dh)
    const provider = (body.provider ?? "").toLowerCase().trim()
    const providerRef = (body.provider_ref ?? "").trim()
    const screenshotPath = (body.screenshot_path ?? "").trim() || null

    if (!teenId) {
      return NextResponse.json({ success: false, error: "teen_id_required" }, { status: 400 })
    }
    if (!Number.isFinite(amountDh) || amountDh <= 0) {
      return NextResponse.json({ success: false, error: "invalid_amount" }, { status: 400 })
    }
    if (!ALLOWED_PROVIDERS.has(provider)) {
      return NextResponse.json({ success: false, error: "invalid_provider" }, { status: 400 })
    }
    if (!providerRef || providerRef.length > 200) {
      return NextResponse.json({ success: false, error: "provider_ref_required" }, { status: 400 })
    }

    const supabase = await createClient()

    // Parent-teen link.
    const { data: link } = await supabase
      .from("parent_teen_links")
      .select("id")
      .eq("parent_id", userInfo.profileId)
      .eq("teen_id", teenId)
      .maybeSingle()
    if (!link) {
      return NextResponse.json({ success: false, error: "teen_not_linked" }, { status: 400 })
    }

    // E-signature gate.
    const { data: sig } = await supabase
      .from("e_signatures")
      .select("id")
      .eq("parent_id", userInfo.profileId)
      .eq("terms_accepted", true)
      .maybeSingle()
    if (!sig) {
      return NextResponse.json(
        { success: false, error: "requires_signature", requiresSignature: true },
        { status: 403 }
      )
    }

    const sr = createServiceRoleClient()
    const { data: inserted, error } = await sr
      .from("manual_topup_requests")
      .insert({
        parent_id: userInfo.profileId,
        teen_id: teenId,
        amount_dh: amountDh,
        provider,
        provider_ref: providerRef,
        screenshot_path: screenshotPath,
        status: "pending",
      })
      .select("id, created_at")
      .single()

    if (error) {
      // 23505 = unique_violation on (provider, provider_ref).
      if ((error as any).code === "23505") {
        return NextResponse.json(
          { success: false, error: "duplicate_provider_ref" },
          { status: 409 }
        )
      }
      console.error("[parent/topup/manual] insert error:", error)
      return NextResponse.json(
        { success: false, error: error.message ?? "insert_failed" },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      request: inserted,
      message:
        "Demande enregistrée. Un admin va vérifier votre virement et créditer les coins sous 24h.",
    })
  } catch (error) {
    console.error("[parent/topup/manual] unexpected error:", error)
    return NextResponse.json({ success: false, error: "server_error" }, { status: 500 })
  }
}
