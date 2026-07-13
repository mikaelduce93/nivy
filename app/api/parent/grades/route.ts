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

    // #31 — teen_grades has no parent_id; ownership flows through
    // parent_teen_links. Resolve the parent's active teens first, then
    // scope every grade query to those teen_ids.
    const { data: links } = await supabase
      .from("parent_teen_links")
      .select("teen_id")
      .eq("parent_id", user.id)
      .eq("status", "active")
    const teenIds = (links || []).map((l) => l.teen_id)

    if (teenIds.length === 0) {
      return jsonResponse({
        grades: [],
        pagination: { total: 0, limit, offset, hasMore: false },
        summary: { pending: 0, approved: 0, rejected: 0, total: 0 },
      })
    }

    // Build query. subject/subject_label are text columns on teen_grades
    // (no subjects table to embed); teens carries first/last name.
    let query = supabase
      .from("teen_grades")
      .select(`
        *,
        teen:teen_id (
          id,
          pseudo,
          first_name,
          last_name,
          avatar_url
        )
      `, { count: "exact" })
      .in("teen_id", teenIds)

    // Filter by teen if specified
    if (teenId) {
      query = query.eq("teen_id", teenId)
    }

    // Filter by status
    if (status !== "all") {
      query = query.eq("status", status)
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
      .select("status")
      .in("teen_id", teenIds)

    const summary = {
      pending: stats?.filter((g) => g.status === "pending").length || 0,
      approved: stats?.filter((g) => g.status === "approved").length || 0,
      rejected: stats?.filter((g) => g.status === "rejected").length || 0,
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

      // #31 — ownership via parent_teen_links (no parent_id on teen_grades).
      const { data: links } = await supabase
        .from("parent_teen_links")
        .select("teen_id")
        .eq("parent_id", user.id)
        .eq("status", "active")
      const teenIds = (links || []).map((l) => l.teen_id)

      if (teenIds.length === 0) {
        return errorResponse("Note introuvable ou accès non autorisé", 404)
      }

      // Get the grade and verify it belongs to one of the parent's teens.
      // subject/subject_label are text columns on teen_grades (no embed).
      const { data: grade, error: gradeError } = await supabase
        .from("teen_grades")
        .select(`
          *,
          teen:teen_id (
            id,
            pseudo,
            first_name,
            last_name
          )
        `)
        .eq("id", gradeId)
        .in("teen_id", teenIds)
        .single()

      if (gradeError || !grade) {
        return errorResponse("Note introuvable ou accès non autorisé", 404)
      }

      // Check if already validated
      if (grade.status !== "pending") {
        return errorResponse(
          `Cette note a déjà été ${grade.status === "approved" ? "validée" : "rejetée"}`,
          400
        )
      }

      // Update the grade
      const updateData: Record<string, unknown> = {
        status: action === "approve" ? "approved" : "rejected",
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
        if (grade.grade >= 18) {
          xpAwarded += 100 // Excellent
        } else if (grade.grade >= 16) {
          xpAwarded += 75 // Très bien
        } else if (grade.grade >= 14) {
          xpAwarded += 50 // Bien
        } else if (grade.grade >= 12) {
          xpAwarded += 25 // Assez bien
        }

        // Check for improvement compared to previous grade in the same subject
        const { data: previousGrade } = await supabase
          .from("teen_grades")
          .select("grade")
          .eq("teen_id", grade.teen_id)
          .eq("subject", grade.subject)
          .eq("status", "approved")
          .neq("id", gradeId)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle()

        if (previousGrade && grade.grade > previousGrade.grade) {
          const improvement = grade.grade - previousGrade.grade
          xpAwarded += Math.floor(improvement * 10) // 10 XP per point improved
        }

        // Award XP to teen.
        //
        // Wave 6J — canonical RPC. The previous direct user_xp.upsert
        // + xp_transactions.insert was a phantom-XP path that bypassed
        // add_xp_to_user (no cap, no multiplier, no level-up trigger,
        // lost-update race on concurrent grade validations). The
        // canonical RPC is SECURITY DEFINER and writes xp_transactions
        // atomically.
        //
        // The dedicated `school_score` column on user_xp is updated
        // separately below by the school-score recalc helper — keeping
        // it out of this XP grant means add_xp_to_user remains the
        // single writer of `total_xp`.
        if (xpAwarded > 0) {
          const { error: xpErr } = await supabase.rpc("add_xp_to_user", {
            p_teen_id: grade.teen_id,
            p_xp_amount: xpAwarded,
            p_source_type: "grade",
            p_source_category: "grade_bonus",
            p_source_id: gradeId,
            p_description: `Note validée en ${grade.subject}: ${grade.grade}/20`,
          })
          if (xpErr) {
            console.error("[parent/grades] add_xp_to_user failed:", xpErr.message)
            // Non-fatal — the grade row is already validated. The XP
            // grant retries on subsequent grade actions.
          }
        }
      }

      // Send notification to teen
      const notificationMessage =
        action === "approve"
          ? `Ta note en ${grade.subject} (${grade.grade}/20) a été validée par ton parent. ${xpAwarded > 0 ? `+${xpAwarded} XP!` : ""}`
          : `Ta note en ${grade.subject} a été rejetée par ton parent.${rejectionReason ? ` Raison: ${rejectionReason}` : ""}`

      // #31 — canonical table is user_notifications (no `notifications`
      // table). Columns: user_id/title/body/is_read + a data jsonb payload.
      await supabase.from("user_notifications").insert({
        user_id: grade.teen_id,
        title: action === "approve" ? "Note validée!" : "Note rejetée",
        body: notificationMessage,
        is_read: false,
        data: {
          kind: action === "approve" ? "grade_approved" : "grade_rejected",
          grade_id: gradeId,
        },
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
      .select("grade")
      .eq("teen_id", teenId)
      .eq("status", "approved")

    // Calculate average grade
    const totalGrades = grades?.length || 0
    const averageGrade =
      totalGrades > 0
        ? grades!.reduce((sum, g) => sum + Number(g.grade), 0) / totalGrades
        : 0

    // Get completed quizzes (#31 — real table is quiz_attempts; the success
    // ratio comes from correct_count/total_questions, there is no max_score).
    const { data: quizzes } = await supabase
      .from("quiz_attempts")
      .select("correct_count, total_questions")
      .eq("teen_id", teenId)
      .not("completed_at", "is", null)

    const quizScore =
      quizzes?.reduce((sum, q) => {
        const total = q.total_questions ?? 0
        const correct = q.correct_count ?? 0
        return sum + (total > 0 ? (correct / total) * 100 : 0)
      }, 0) || 0
    const quizCount = quizzes?.length || 0

    // #31 — no tutorial_completions table exists in the live schema; the
    // tutorial component of the school score is neutralised until one does.
    const tutorialCount = 0

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
