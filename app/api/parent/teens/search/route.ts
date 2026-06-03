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

    const trimmed = query.trim()
    const lowered = trimmed.toLowerCase()
    const codeUpper = trimmed.toUpperCase()

    // Resolve the teen id from one of three identifiers:
    //   1. teens.pseudo (canonical public handle — was profiles.username, 42703)
    //   2. linking_codes.code redeemed by the teen (was profiles.linking_code, 42703)
    //   3. profiles.email (real column on the slim profiles table)
    let teenId: string | null = null

    const { data: teenByPseudo } = await supabase
      .from("teens")
      .select("id")
      .eq("pseudo", lowered)
      .maybeSingle()

    if (teenByPseudo) {
      teenId = teenByPseudo.id
    }

    if (!teenId) {
      const { data: codeRow } = await supabase
        .from("linking_codes")
        .select("used_by")
        .eq("code", codeUpper)
        .maybeSingle()

      if (codeRow?.used_by) {
        teenId = codeRow.used_by
      }
    }

    if (!teenId) {
      const { data: profileByEmail } = await supabase
        .from("profiles")
        .select("id")
        .eq("role", "teen")
        .eq("email", lowered)
        .maybeSingle()

      if (profileByEmail) {
        teenId = profileByEmail.id
      }
    }

    if (!teenId) {
      return NextResponse.json(
        { success: false, error: "Aucun teen trouvé avec cet identifiant" },
        { status: 404 }
      )
    }

    // Assemble the teen card from the real sources: profiles (email/full_name)
    // + teens (pseudo/avatar). pseudo falls back to full_name like get_user_crew.
    const [{ data: profileRow }, { data: teenRow }] = await Promise.all([
      supabase
        .from("profiles")
        .select("id, full_name, email, avatar_url, role")
        .eq("id", teenId)
        .eq("role", "teen")
        .maybeSingle(),
      supabase
        .from("teens")
        .select("id, pseudo, avatar_url")
        .eq("id", teenId)
        .maybeSingle(),
    ])

    if (!profileRow) {
      return NextResponse.json(
        { success: false, error: "Aucun teen trouvé avec cet identifiant" },
        { status: 404 }
      )
    }

    const teen = {
      id: profileRow.id,
      full_name: profileRow.full_name,
      email: profileRow.email,
      username: teenRow?.pseudo ?? null,
      avatar_url: teenRow?.avatar_url ?? profileRow.avatar_url ?? null,
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
