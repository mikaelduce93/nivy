import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { getUserRole } from "@/lib/auth/get-user-role"

/**
 * POST /api/teen/onboarding/complete
 * Sets profiles.is_onboarded = true for the current teen.
 * No-op for non-teen roles.
 */
export async function POST() {
  try {
    const supabase = await createClient()
    const userInfo = await getUserRole()

    if (!userInfo || userInfo.role !== "teen") {
      return NextResponse.json(
        { success: false, error: "Non autorisé" },
        { status: 401 }
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
      console.error("profiles is_onboarded update error:", error)
      return NextResponse.json(
        { success: false, error: "Erreur d'enregistrement" },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("/api/teen/onboarding/complete error:", error)
    return NextResponse.json(
      { success: false, error: "Erreur serveur" },
      { status: 500 }
    )
  }
}
