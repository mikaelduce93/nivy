import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import { getUserRole } from "@/lib/auth/get-user-role"

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

    const { searchParams } = new URL(request.url)
    const query = searchParams.get("query")

    if (!query) {
      return NextResponse.json(
        { success: false, error: "Requête manquante" },
        { status: 400 }
      )
    }

    // Search by email or linking code
    const { data: teen, error } = await supabase
      .from("profiles")
      .select("id, full_name, email, username, avatar_url")
      .eq("role", "teen")
      .or(`email.eq.${query},linking_code.eq.${query.toUpperCase()}`)
      .single()

    if (error || !teen) {
      return NextResponse.json(
        { success: false, error: "Aucun teen trouvé avec cet identifiant" },
        { status: 404 }
      )
    }

    // Check if already linked
    const { data: existingLink } = await supabase
      .from("parent_teen_links")
      .select("id")
      .eq("parent_id", userInfo.profileId)
      .eq("teen_id", teen.id)
      .single()

    if (existingLink) {
      return NextResponse.json(
        { success: false, error: "Ce teen est déjà lié à votre compte" },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      data: teen,
    })
  } catch (error) {
    console.error("Teen search API error:", error)
    return NextResponse.json(
      { success: false, error: "Erreur serveur" },
      { status: 500 }
    )
  }
}
