import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import { getUserRole } from "@/lib/auth/get-user-role"

export async function PATCH(request: Request) {
  try {
    const supabase = await createClient()
    const userInfo = await getUserRole()

    if (!userInfo || userInfo.role !== "teen") {
      return NextResponse.json(
        { success: false, error: "Non autorisé" },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { profileId, fullName, username } = body

    // Verify profileId matches current user
    if (profileId !== userInfo.profileId) {
      return NextResponse.json(
        { success: false, error: "Non autorisé" },
        { status: 401 }
      )
    }

    // Le pseudo vit sur teens.pseudo (profiles n'a ni username ni bio).
    if (username) {
      if (!/^[a-zA-Z0-9_]+$/.test(username)) {
        return NextResponse.json(
          { success: false, error: "Format de pseudo invalide" },
          { status: 400 }
        )
      }

      const { data: existingPseudo } = await supabase
        .from("teens")
        .select("id")
        .eq("pseudo", username.toLowerCase())
        .neq("id", profileId)
        .maybeSingle()

      if (existingPseudo) {
        return NextResponse.json(
          { success: false, error: "Ce pseudo est déjà pris" },
          { status: 400 }
        )
      }
    }

    // full_name → profiles
    if (fullName) {
      const { error: profileErr } = await supabase
        .from("profiles")
        .update({ full_name: fullName, updated_at: new Date().toISOString() })
        .eq("id", profileId)
      if (profileErr) {
        console.error("Profile update error:", profileErr)
        return NextResponse.json(
          { success: false, error: "Erreur lors de la mise à jour" },
          { status: 500 }
        )
      }
    }

    // username → teens.pseudo
    if (username !== undefined) {
      const { error: pseudoErr } = await supabase
        .from("teens")
        .update({ pseudo: username ? username.toLowerCase() : null, updated_at: new Date().toISOString() })
        .eq("id", profileId)
      if (pseudoErr) {
        console.error("Teen pseudo update error:", pseudoErr)
        return NextResponse.json(
          { success: false, error: "Erreur lors de la mise à jour" },
          { status: 500 }
        )
      }
    }

    // Log activity
    await supabase.from("activity_logs").insert({
      user_id: profileId,
      action: "update",
      description: "Profil mis à jour",
      resource_type: "profile",
      resource_id: profileId,
      created_at: new Date().toISOString(),
    })

    return NextResponse.json({
      success: true,
      message: "Profil mis à jour avec succès",
    })
  } catch (error) {
    console.error("Profile API error:", error)
    return NextResponse.json(
      { success: false, error: "Erreur serveur" },
      { status: 500 }
    )
  }
}

export async function GET(request: Request) {
  try {
    const supabase = await createClient()
    const userInfo = await getUserRole()

    if (!userInfo || userInfo.role !== "teen") {
      return NextResponse.json(
        { success: false, error: "Non autorisé" },
        { status: 401 }
      )
    }

    const { data: profile, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userInfo.profileId)
      .single()

    if (error) {
      return NextResponse.json(
        { success: false, error: "Profil non trouvé" },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data: profile,
    })
  } catch (error) {
    console.error("Profile GET API error:", error)
    return NextResponse.json(
      { success: false, error: "Erreur serveur" },
      { status: 500 }
    )
  }
}
