/**
 * Parent Grades Validation API
 * ============================
 * Endpoint for parents to view and validate their teens' school grades
 *
 * GET /api/parent/grades - Get pending grades for validation
 * POST /api/parent/grades - Validate or reject a grade
 */

import { createClient } from "@/lib/supabase/server"
import { NextRequest } from "next/server"
import { withSecurity, errorResponse, jsonResponse } from "@/lib/security/api-middleware"
import { z } from "zod"

// Validation schema for grade approval
const gradeApprovalSchema = z.object({
  gradeId: z.string().uuid("ID de note invalide"),
  action: z.enum(["approve", "reject"], {
    errorMap: () => ({ message: "Action doit être 'approve' ou 'reject'" }),
  }),
  rejectionReason: z.string().max(500).optional(),
})

/**
 * GET /api/parent/grades
 * Get pending grades for parent's teens
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Verify authentication
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return errorResponse("Non authentifié", 401)
    }

    // Verify user is a parent
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single()

    if (profile?.role !== "parent") {
      return errorResponse("Accès réservé aux parents", 403)
    }

    // Get query parameters
    const { searchParams } = new URL(request.url)
    const teenId = searchParams.get("teenId")
    const status = searchParams.get("status") || "pending"
    const limit = parseInt(searchParams.get("limit") || "50")
    const offset = parseInt(searchParams.get("offset") || "0")

    // Build query
    let query = supabase
      .from("teen_grades")
      .select(`
        *,
        teen:teen_id (
          id,
          pseudo,
          full_name,
          avatar_url
        ),
        subject:subject_id (
          id,
          name,
          category
        )
      `, { count: "exact" })
      .eq("parent_id", user.id)

    // Filter by teen if specified
    if (teenId) {
      query = query.eq("teen_id", teenId)
    }

    // Filter by status
    if (status !== "all") {
      query = query.eq("validation_status", status)
    }

    // Order by date and apply pagination
    query = query
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1)

    const { data: grades, error, count } = await query

    if (error) {
      console.error("[Grades API] Error fetching grades:", error)
      return errorResponse("Erreur lors de la récupération des notes", 500)
    }

    // Get summary stats
    const { data: stats } = await supabase
      .from("teen_grades")
      .select("validation_status")
      .eq("parent_id", user.id)

    const summary = {
      pending: stats?.filter((g) => g.validation_status === "pending").length || 0,
      approved: stats?.filter((g) => g.validation_status === "approved").length || 0,
      rejected: stats?.filter((g) => g.validation_status === "rejected").length || 0,
      total: stats?.length || 0,
    }

    return jsonResponse({
      grades: grades || [],
      pagination: {
        total: count || 0,
        limit,
        offset,
        hasMore: (count || 0) > offset + limit,
      },
      summary,
    })
  } catch (error) {
    console.error("[Grades API] Error:", error)
    return errorResponse("Erreur serveur", 500)
  }
}

/**
 * POST /api/parent/grades
 * Validate or reject a grade
 */
export const POST = withSecurity(
  async (request: NextRequest) => {
    try {
      const supabase = await createClient()

      // Verify authentication
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        return errorResponse("Non authentifié", 401)
      }

      // Verify user is a parent
      const { data: profile } = await supabase
        .from("profiles")
        .select("role, full_name")
        .eq("id", user.id)
        .single()

      if (profile?.role !== "parent") {
        return errorResponse("Accès réservé aux parents", 403)
      }

      // Parse and validate request body
      const body = await request.json()
      const validation = gradeApprovalSchema.safeParse(body)

      if (!validation.success) {
        return errorResponse(
          validation.error.errors[0]?.message || "Données invalides",
          400
        )
      }

      const { gradeId, action, rejectionReason } = validation.data

      // Get the grade and verify ownership
      const { data: grade, error: gradeError } = await supabase
        .from("teen_grades")
        .select(`
          *,
          teen:teen_id (
            id,
            pseudo,
            full_name
          ),
          subject:subject_id (
            name
          )
        `)
        .eq("id", gradeId)
        .eq("parent_id", user.id)
        .single()

      if (gradeError || !grade) {
        return errorResponse("Note introuvable ou accès non autorisé", 404)
      }

      // Check if already validated
      if (grade.validation_status !== "pending") {
        return errorResponse(
          `Cette note a déjà été ${grade.validation_status === "approved" ? "validée" : "rejetée"}`,
          400
        )
      }

      // Update the grade
      const updateData: Record<string, unknown> = {
        validation_status: action === "approve" ? "approved" : "rejected",
        validated_at: new Date().toISOString(),
        validated_by: user.id,
        updated_at: new Date().toISOString(),
      }

      if (action === "reject" && rejectionReason) {
        updateData.rejection_reason = rejectionReason
      }

      const { error: updateError } = await supabase
        .from("teen_grades")
        .update(updateData)
        .eq("id", gradeId)

      if (updateError) {
        console.error("[Grades API] Update error:", updateError)
        return errorResponse("Erreur lors de la mise à jour", 500)
      }

      // Calculate XP bonus if approved and grade improved
      let xpAwarded = 0
      if (action === "approve") {
        // Base XP for validated grade
        xpAwarded = 50

        // Bonus XP based on grade value (assuming 0-20 scale)
        if (grade.value >= 18) {
          xpAwarded += 100 // Excellent
        } else if (grade.value >= 16) {
          xpAwarded += 75 // Très bien
        } else if (grade.value >= 14) {
          xpAwarded += 50 // Bien
        } else if (grade.value >= 12) {
          xpAwarded += 25 // Assez bien
        }

        // Check for improvement compared to previous grade
        const { data: previousGrade } = await supabase
          .from("teen_grades")
          .select("value")
          .eq("teen_id", grade.teen_id)
          .eq("subject_id", grade.subject_id)
          .eq("validation_status", "approved")
          .neq("id", gradeId)
          .order("created_at", { ascending: false })
          .limit(1)
          .single()

        if (previousGrade && grade.value > previousGrade.value) {
          const improvement = grade.value - previousGrade.value
          xpAwarded += Math.floor(improvement * 10) // 10 XP per point improved
        }

        // Award XP to teen
        if (xpAwarded > 0) {
          // Get current XP
          const { data: currentXP } = await supabase
            .from("user_xp")
            .select("total_xp, school_score")
            .eq("teen_id", grade.teen_id)
            .single()

          // Update XP
          await supabase
            .from("user_xp")
            .upsert({
              teen_id: grade.teen_id,
              total_xp: (currentXP?.total_xp || 0) + xpAwarded,
              school_score: (currentXP?.school_score || 0) + xpAwarded,
              updated_at: new Date().toISOString(),
            })

          // Record XP transaction
          await supabase.from("xp_transactions").insert({
            teen_id: grade.teen_id,
            amount: xpAwarded,
            type: "grade_bonus",
            description: `Note validée en ${grade.subject?.name}: ${grade.value}/20`,
            reference_type: "grade",
            reference_id: gradeId,
            created_at: new Date().toISOString(),
          })
        }
      }

      // Send notification to teen
      const notificationMessage =
        action === "approve"
          ? `Ta note en ${grade.subject?.name} (${grade.value}/20) a été validée par ton parent. ${xpAwarded > 0 ? `+${xpAwarded} XP!` : ""}`
          : `Ta note en ${grade.subject?.name} a été rejetée par ton parent.${rejectionReason ? ` Raison: ${rejectionReason}` : ""}`

      await supabase.from("notifications").insert({
        user_id: grade.teen_id,
        type: action === "approve" ? "grade_approved" : "grade_rejected",
        title: action === "approve" ? "Note validée!" : "Note rejetée",
        message: notificationMessage,
        read: false,
        resource_type: "grade",
        resource_id: gradeId,
        created_at: new Date().toISOString(),
      })

      // Update school score calculation (async)
      calculateSchoolScore(grade.teen_id).catch(console.error)

      return jsonResponse({
        success: true,
        action,
        gradeId,
        xpAwarded: action === "approve" ? xpAwarded : 0,
        message:
          action === "approve"
            ? `Note validée avec succès. ${xpAwarded} XP attribués.`
            : "Note rejetée.",
      })
    } catch (error) {
      console.error("[Grades API] Error:", error)
      return errorResponse("Erreur serveur", 500)
    }
  },
  { rateLimit: "api" }
)

/**
 * Calculate school score for a teen
 * This updates the school_score in user_xp based on:
 * - Validated grades
 * - Quiz completions
 * - Tutorial completions
 */
async function calculateSchoolScore(teenId: string): Promise<void> {
  try {
    const supabase = await createClient()

    // Get validated grades
    const { data: grades } = await supabase
      .from("teen_grades")
      .select("value")
      .eq("teen_id", teenId)
      .eq("validation_status", "approved")

    // Calculate average grade
    const totalGrades = grades?.length || 0
    const averageGrade =
      totalGrades > 0
        ? grades!.reduce((sum, g) => sum + g.value, 0) / totalGrades
        : 0

    // Get completed quizzes
    const { data: quizzes } = await supabase
      .from("quiz_completions")
      .select("score, max_score")
      .eq("teen_id", teenId)

    const quizScore =
      quizzes?.reduce((sum, q) => sum + (q.score / q.max_score) * 100, 0) || 0
    const quizCount = quizzes?.length || 0

    // Get completed tutorials
    const { data: tutorials } = await supabase
      .from("tutorial_completions")
      .select("id")
      .eq("teen_id", teenId)

    const tutorialCount = tutorials?.length || 0

    // Calculate school score
    // Formula: (average grade * 50) + (quiz avg * 30) + (tutorials * 20)
    const gradeComponent = averageGrade * 50
    const quizComponent = quizCount > 0 ? (quizScore / quizCount) * 0.3 : 0
    const tutorialComponent = Math.min(tutorialCount * 20, 200)

    const schoolScore = Math.round(gradeComponent + quizComponent + tutorialComponent)

    // Update user_xp
    await supabase
      .from("user_xp")
      .update({
        school_score: schoolScore,
        updated_at: new Date().toISOString(),
      })
      .eq("teen_id", teenId)

    console.log(`[School Score] Updated for teen ${teenId}: ${schoolScore}`)
  } catch (error) {
    console.error("[School Score] Calculation error:", error)
  }
}
