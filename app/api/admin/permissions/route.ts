import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import { requireAdminPermission, logAdminAction } from "@/lib/auth/admin-permissions"

export async function PATCH(request: Request) {
  try {
    const supabase = await createClient()

    // Require super_admin permission for role changes
    let admin
    try {
      admin = await requireAdminPermission("users.change_role")
    } catch (err) {
      return NextResponse.json(
        { success: false, error: "Non autorisé - Seul un super_admin peut changer les rôles" },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { userId, newRole } = body

    if (!userId || !newRole) {
      return NextResponse.json(
        { success: false, error: "Données manquantes" },
        { status: 400 }
      )
    }

    // Validate role
    const validRoles = [
      "user", "teen", "parent", "partner", "ambassador",
      "support", "moderator", "admin", "super_admin"
    ]

    if (!validRoles.includes(newRole)) {
      return NextResponse.json(
        { success: false, error: "Rôle invalide" },
        { status: 400 }
      )
    }

    // Prevent self-demotion for safety
    if (userId === admin.profileId && newRole !== "admin" && newRole !== "super_admin") {
      return NextResponse.json(
        { success: false, error: "Vous ne pouvez pas rétrograder votre propre compte" },
        { status: 400 }
      )
    }

    // Get current user info for logging
    const { data: targetUser } = await supabase
      .from("profiles")
      .select("full_name, email, role")
      .eq("id", userId)
      .single()

    if (!targetUser) {
      return NextResponse.json(
        { success: false, error: "Utilisateur non trouvé" },
        { status: 404 }
      )
    }

    // Update user role
    const { error: updateError } = await supabase
      .from("profiles")
      .update({
        role: newRole,
        updated_at: new Date().toISOString(),
      })
      .eq("id", userId)

    if (updateError) {
      console.error("Role update error:", updateError)
      return NextResponse.json(
        { success: false, error: "Erreur lors de la mise à jour" },
        { status: 500 }
      )
    }

    // Log the action to audit logs
    await logAdminAction(
      admin.profileId,
      "users.change_role",
      `Changement de rôle: ${targetUser.full_name} (${targetUser.role} -> ${newRole})`,
      "user",
      userId,
      {
        target_user: targetUser.email,
        old_role: targetUser.role,
        new_role: newRole,
        admin_email: admin.email,
      }
    )

    return NextResponse.json({
      success: true,
      message: "Rôle mis à jour avec succès",
    })
  } catch (error) {
    console.error("Permissions API error:", error)
    return NextResponse.json(
      { success: false, error: "Erreur serveur" },
      { status: 500 }
    )
  }
}

export async function GET(request: Request) {
  try {
    const supabase = await createClient()

    // Require permission to view users
    try {
      await requireAdminPermission("users.view")
    } catch (err) {
      return NextResponse.json(
        { success: false, error: "Non autorisé" },
        { status: 403 }
      )
    }

    const { searchParams } = new URL(request.url)
    const role = searchParams.get("role")

    let query = supabase
      .from("profiles")
      .select("id, full_name, email, role, created_at")
      .order("created_at", { ascending: false })

    if (role) {
      query = query.eq("role", role)
    }

    const { data: users, error } = await query.limit(100)

    if (error) {
      return NextResponse.json(
        { success: false, error: "Erreur de récupération" },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: users,
    })
  } catch (error) {
    console.error("Permissions GET API error:", error)
    return NextResponse.json(
      { success: false, error: "Erreur serveur" },
      { status: 500 }
    )
  }
}
