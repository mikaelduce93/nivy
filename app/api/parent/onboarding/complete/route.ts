import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { getUserRole } from "@/lib/auth/get-user-role"

/**
 * POST /api/parent/onboarding/complete — Wave 6B.
 *
 * Sets profiles.is_onboarded = true for the current parent.
 * Symmetric with /api/teen/onboarding/complete.
 *
 * No-op for non-parent roles (returns 401). Idempotent — flipping an
 * already-true row is a NOOP at the DB level.
 *
 * Why this exists: middleware (Wave 1A.5 is_onboarded gate) loops a
 * parent with is_onboarded=false back to /onboarding/parent. Without
 * this endpoint, the parent stub had no path to mark itself complete
 * — admin had to flip the bit manually.
 */
export async function POST() {
  try {
    const supabase = await createClient()
    const userInfo = await getUserRole()

    if (!userInfo || userInfo.role !== "parent") {
      return NextResponse.json(
        { success: false, error: "Non autorisé" },
        { status: 401 },
      )
    }

    const { error } = await supabase
      .from("profiles")
      .update({
        is_onboarded: true,
        updated_at: new Date().toISOString(),
      })
      .eq("id", userInfo.profileId)

    if (error) {
      console.error("/api/parent/onboarding/complete update error:", error)
      return NextResponse.json(
        { success: false, error: "Erreur d'enregistrement" },
        { status: 500 },
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("/api/parent/onboarding/complete error:", error)
    return NextResponse.json(
      { success: false, error: "Erreur serveur" },
      { status: 500 },
    )
  }
}
