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
    const { teenId, monthlyLimit, perEventLimit, requiresApproval } = body

    if (!teenId) {
      return NextResponse.json(
        { success: false, error: "ID teen requis" },
        { status: 400 }
      )
    }

    // Verify this teen is linked to this parent
    const { data: link, error: linkError } = await supabase
      .from("parent_teen_links")
      .select("id")
      .eq("parent_id", userInfo.profileId)
      .eq("teen_id", teenId)
      .single()

    if (linkError || !link) {
      return NextResponse.json(
        { success: false, error: "Teen non lié à ce parent" },
        { status: 403 }
      )
    }

    // Check if budget limit exists
    const { data: existing } = await supabase
      .from("teen_budget_limits")
      .select("id")
      .eq("teen_id", teenId)
      .single()

    // Get teen info for notifications
    const { data: teen } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("id", teenId)
      .single()

    const teenName = teen?.full_name || "Teen"

    if (existing) {
      // Update existing
      const { error: updateError } = await supabase
        .from("teen_budget_limits")
        .update({
          monthly_limit: monthlyLimit || 0,
          per_event_limit: perEventLimit || 0,
          requires_approval: requiresApproval,
          updated_at: new Date().toISOString(),
        })
        .eq("teen_id", teenId)

      if (updateError) {
        console.error("Budget update error:", updateError)
        return NextResponse.json(
          { success: false, error: "Erreur lors de la mise à jour" },
          { status: 500 }
        )
      }
    } else {
      // Create new
      const { error: insertError } = await supabase
        .from("teen_budget_limits")
        .insert({
          teen_id: teenId,
          parent_id: userInfo.profileId,
          monthly_limit: monthlyLimit || 0,
          per_event_limit: perEventLimit || 0,
          requires_approval: requiresApproval,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })

      if (insertError) {
        console.error("Budget insert error:", insertError)
        return NextResponse.json(
          { success: false, error: "Erreur lors de la création" },
          { status: 500 }
        )
      }
    }

    // Notify teen about budget change
    await supabase.from("notifications").insert({
      user_id: teenId,
      type: "budget_updated",
      title: "Budget mis à jour",
      message: monthlyLimit > 0
        ? `Ton budget mensuel a été défini à ${monthlyLimit} DH. ${requiresApproval ? "L'approbation parentale est requise pour les réservations." : ""}`
        : "Ton budget mensuel a été modifié par ton parent.",
      read: false,
      created_at: new Date().toISOString()
    })

    // Log activity
    await supabase.from("activity_logs").insert({
      user_id: userInfo.profileId,
      action: existing ? "update" : "create",
      description: `Budget de ${teenName} mis à jour: ${monthlyLimit} DH/mois, ${perEventLimit} DH/event`,
      resource_type: "teen_budget",
      resource_id: teenId,
      created_at: new Date().toISOString()
    })

    return NextResponse.json({
      success: true,
      message: "Limites de budget mises à jour",
      data: {
        teenId,
        monthlyLimit,
        perEventLimit,
        requiresApproval
      }
    })
  } catch (error) {
    console.error("Budget API error:", error)
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

    const { searchParams } = new URL(request.url)
    const teenId = searchParams.get("teenId")

    if (!teenId) {
      // Get all budgets for this parent's teens
      const { data: links } = await supabase
        .from("parent_teen_links")
        .select("teen_id")
        .eq("parent_id", userInfo.profileId)

      if (!links || links.length === 0) {
        return NextResponse.json({ success: true, data: [] })
      }

      const teenIds = links.map((l: any) => l.teen_id)

      const { data: budgets, error } = await supabase
        .from("teen_budget_limits")
        .select("*")
        .in("teen_id", teenIds)

      if (error) {
        return NextResponse.json(
          { success: false, error: "Erreur de récupération" },
          { status: 500 }
        )
      }

      return NextResponse.json({ success: true, data: budgets })
    } else {
      // Get specific teen's budget
      const { data: budget, error } = await supabase
        .from("teen_budget_limits")
        .select("*")
        .eq("teen_id", teenId)
        .single()

      if (error && error.code !== "PGRST116") {
        return NextResponse.json(
          { success: false, error: "Erreur de récupération" },
          { status: 500 }
        )
      }

      return NextResponse.json({ success: true, data: budget || null })
    }
  } catch (error) {
    console.error("Budget GET API error:", error)
    return NextResponse.json(
      { success: false, error: "Erreur serveur" },
      { status: 500 }
    )
  }
}
