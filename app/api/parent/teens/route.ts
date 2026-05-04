import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import { getUserRole } from "@/lib/auth/get-user-role"

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const userInfo = await getUserRole()

    if (!userInfo || userInfo.role !== "parent") {
      return NextResponse.json(
        { success: false, error: "Non autorisé" },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { parentId, teenId } = body

    if (!parentId || !teenId) {
      return NextResponse.json(
        { success: false, error: "Données manquantes" },
        { status: 400 }
      )
    }

    // Verify parentId matches current user
    if (parentId !== userInfo.profileId) {
      return NextResponse.json(
        { success: false, error: "Non autorisé" },
        { status: 401 }
      )
    }

    // Verify teen exists and is a teen
    const { data: teen, error: teenError } = await supabase
      .from("profiles")
      .select("id, full_name, role")
      .eq("id", teenId)
      .eq("role", "teen")
      .single()

    if (teenError || !teen) {
      return NextResponse.json(
        { success: false, error: "Teen non trouvé" },
        { status: 404 }
      )
    }

    // Check if already linked
    const { data: existingLink } = await supabase
      .from("parent_teen_links")
      .select("id, status")
      .eq("parent_id", parentId)
      .eq("teen_id", teenId)
      .single()

    if (existingLink) {
      if (existingLink.status === "pending") {
        return NextResponse.json(
          { success: false, error: "Une demande de liaison est déjà en attente" },
          { status: 400 }
        )
      }
      return NextResponse.json(
        { success: false, error: "Ce teen est déjà lié à votre compte" },
        { status: 400 }
      )
    }

    // Create link request
    const { error: linkError } = await supabase
      .from("parent_teen_links")
      .insert({
        parent_id: parentId,
        teen_id: teenId,
        status: "pending",
        created_at: new Date().toISOString(),
      })

    if (linkError) {
      console.error("Link creation error:", linkError)
      return NextResponse.json(
        { success: false, error: "Erreur lors de la création de la liaison" },
        { status: 500 }
      )
    }

    // Create notification for teen
    await supabase.from("notifications").insert({
      user_id: teenId,
      type: "link_request",
      title: "Demande de liaison parentale",
      message: `${userInfo.fullName} souhaite se lier à votre compte en tant que parent`,
      data: { parent_id: parentId, parent_name: userInfo.fullName },
      read: false,
      created_at: new Date().toISOString(),
    })

    // Log activity
    await supabase.from("activity_logs").insert({
      user_id: parentId,
      action: "create",
      description: `Demande de liaison avec ${teen.full_name}`,
      resource_type: "parent_teen_link",
      resource_id: teenId,
      created_at: new Date().toISOString(),
    })

    return NextResponse.json({
      success: true,
      message: "Demande de liaison envoyée",
    })
  } catch (error) {
    console.error("Parent teens API error:", error)
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

    if (!userInfo || userInfo.role !== "parent") {
      return NextResponse.json(
        { success: false, error: "Non autorisé" },
        { status: 401 }
      )
    }

    const { data: teens, error } = await supabase
      .from("parent_teens_overview")
      .select("*")
      .eq("parent_id", userInfo.profileId)

    if (error) {
      return NextResponse.json(
        { success: false, error: "Erreur de récupération" },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: teens || [],
    })
  } catch (error) {
    console.error("Parent teens GET API error:", error)
    return NextResponse.json(
      { success: false, error: "Erreur serveur" },
      { status: 500 }
    )
  }
}

export async function DELETE(request: Request) {
  try {
    const supabase = await createClient()
    const userInfo = await getUserRole()

    if (!userInfo || userInfo.role !== "parent") {
      return NextResponse.json(
        { success: false, error: "Non autorisé" },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const teenId = searchParams.get("teenId")

    if (!teenId) {
      return NextResponse.json(
        { success: false, error: "Teen ID manquant" },
        { status: 400 }
      )
    }

    const { error } = await supabase
      .from("parent_teen_links")
      .delete()
      .eq("parent_id", userInfo.profileId)
      .eq("teen_id", teenId)

    if (error) {
      return NextResponse.json(
        { success: false, error: "Erreur lors de la suppression" },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: "Liaison supprimée",
    })
  } catch (error) {
    console.error("Parent teens DELETE API error:", error)
    return NextResponse.json(
      { success: false, error: "Erreur serveur" },
      { status: 500 }
    )
  }
}
