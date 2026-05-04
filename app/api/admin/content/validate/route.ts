/**
 * API Route: Content Validation & Moderation
 * Permet aux admins de valider, rejeter ou réviser le contenu généré
 */

import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

/**
 * GET /api/admin/content/validate
 * Liste le contenu en attente de validation
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single()

    if (profile?.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const searchParams = request.nextUrl.searchParams
    const status = searchParams.get("status") || "manual_review"
    const contentType = searchParams.get("contentType")
    const limit = parseInt(searchParams.get("limit") || "50")

    let query = supabase
      .from("content_validations")
      .select(`
        *,
        content_generation_logs (
          id,
          content_type,
          generation_params,
          generated_content_id,
          ai_provider,
          ai_model,
          quality_score
        )
      `)
      .eq("validation_status", status)
      .order("created_at", { ascending: false })
      .limit(limit)

    if (contentType) {
      query = query.eq("content_type", contentType)
    }

    const { data: validations, error } = await query

    if (error) {
      return NextResponse.json(
        { error: "Failed to fetch validations" },
        { status: 500 }
      )
    }

    return NextResponse.json({ validations })
  } catch (error) {
    console.error("Error fetching validations:", error)
    return NextResponse.json(
      { error: "Failed to fetch validations" },
      { status: 500 }
    )
  }
}

/**
 * POST /api/admin/content/validate
 * Valide, rejette ou demande une révision du contenu
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single()

    if (profile?.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const body = await request.json()
    const {
      validationId,
      action, // 'approve', 'reject', 'needs_revision'
      contentType,
      contentId,
      notes,
      rejectionReason,
    } = body

    if (!action || !["approve", "reject", "needs_revision"].includes(action)) {
      return NextResponse.json(
        { error: "Invalid action. Must be 'approve', 'reject', or 'needs_revision'" },
        { status: 400 }
      )
    }

    // Mettre à jour la validation
    const updateData: any = {
      reviewed_by: user.id,
      reviewed_at: new Date().toISOString(),
      review_notes: notes || null,
    }

    if (action === "approve") {
      updateData.validation_status = "approved"
      // Activer le contenu dans sa table respective
      if (contentType && contentId) {
        const tableName = getContentTableName(contentType)
        await supabase
          .from(tableName)
          .update({ is_active: true })
          .eq("id", contentId)
      }
    } else if (action === "reject") {
      updateData.validation_status = "rejected"
      updateData.rejection_reason = rejectionReason || "Rejeté par modérateur"
      // Désactiver le contenu
      if (contentType && contentId) {
        const tableName = getContentTableName(contentType)
        await supabase
          .from(tableName)
          .update({ is_active: false })
          .eq("id", contentId)
      }
    } else if (action === "needs_revision") {
      updateData.validation_status = "needs_revision"
    }

    const { data: validation, error } = await supabase
      .from("content_validations")
      .update(updateData)
      .eq("id", validationId || contentId)
      .select()
      .single()

    if (error) {
      return NextResponse.json(
        { error: "Failed to update validation" },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      validation,
      message: `Content ${action === "approve" ? "approved" : action === "reject" ? "rejected" : "marked for revision"}`,
    })
  } catch (error) {
    console.error("Error validating content:", error)
    return NextResponse.json(
      { error: "Failed to validate content" },
      { status: 500 }
    )
  }
}

function getContentTableName(contentType: string): string {
  const mapping: Record<string, string> = {
    quiz: "educational_quizzes",
    mission: "mission_templates",
    challenge: "challenges_templates",
    daily_challenge: "challenges_templates",
    quest: "mission_templates",
  }
  return mapping[contentType] || "unknown"
}


