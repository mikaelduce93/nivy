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
    const { profileId, fullName, username, bio, avatarEmoji } = body

    // Verify profileId matches current user
    if (profileId !== userInfo.profileId) {
      return NextResponse.json(
        { success: false, error: "Non autorisé" },
        { status: 401 }
      )
    }

    // Validate username if provided
    if (username) {
      if (!/^[a-zA-Z0-9_]+$/.test(username)) {
        return NextResponse.json(
          { success: false, error: "Format de pseudo invalide" },
          { status: 400 }
        )
      }

      // Check username uniqueness
      const { data: existingUser } = await supabase
        .from("profiles")
        .select("id")
        .eq("username", username.toLowerCase())
        .neq("id", profileId)
        .single()

      if (existingUser) {
        return NextResponse.json(
          { success: false, error: "Ce pseudo est déjà pris" },
          { status: 400 }
        )
      }
    }

    // Validate bio length
    if (bio && bio.length > 200) {
      return NextResponse.json(
        { success: false, error: "La bio ne peut pas dépasser 200 caractères" },
        { status: 400 }
      )
    }

    // Build update object
    const updateData: any = {
      updated_at: new Date().toISOString(),
    }

    if (fullName) updateData.full_name = fullName
    if (username !== undefined) updateData.username = username?.toLowerCase() || null
    if (bio !== undefined) updateData.bio = bio || null
    if (avatarEmoji) updateData.avatar_emoji = avatarEmoji

    // Update profile
    const { error: updateError } = await supabase
      .from("profiles")
      .update(updateData)
      .eq("id", profileId)

    if (updateError) {
      console.error("Profile update error:", updateError)
      return NextResponse.json(
        { success: false, error: "Erreur lors de la mise à jour" },
        { status: 500 }
      )
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
