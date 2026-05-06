import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import { getUserRole } from "@/lib/auth/get-user-role"

/**
 * GET /api/parent/e-signature/status
 *
 * Returns whether the authenticated parent has a valid e-signature
 * on file. Used to gate parental top-ups / authorizations.
 *
 * Response: { signed: boolean, signedAt?: string, signatureId?: string }
 */
export async function GET() {
  try {
    const userInfo = await getUserRole()

    if (!userInfo || userInfo.role !== "parent") {
      return NextResponse.json(
        { error: "Non autorisé" },
        { status: 401 }
      )
    }

    const supabase = await createClient()

    // Look for the most recent e-signature for this parent.
    // We treat any signature as "valid" for top-up gating; per-event
    // signatures still flow through /api/e-signature/create with eventId.
    const { data: signature, error } = await supabase
      .from("e_signatures")
      .select("id, created_at, terms_accepted")
      .eq("parent_id", userInfo.profileId)
      .eq("terms_accepted", true)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle()

    if (error) {
      console.error("[e-signature/status] DB error:", error)
      return NextResponse.json(
        { signed: false },
        { status: 200 }
      )
    }

    return NextResponse.json({
      signed: !!signature,
      signedAt: signature?.created_at ?? null,
      signatureId: signature?.id ?? null,
    })
  } catch (err) {
    console.error("[e-signature/status] error:", err)
    return NextResponse.json(
      { signed: false, error: "Erreur serveur" },
      { status: 500 }
    )
  }
}
