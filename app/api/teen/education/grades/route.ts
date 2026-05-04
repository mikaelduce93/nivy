import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

// Available subjects
export const SUBJECTS = [
  { id: "math", label: "Mathematiques", labelAr: "الرياضيات" },
  { id: "french", label: "Francais", labelAr: "الفرنسية" },
  { id: "arabic", label: "Arabe", labelAr: "العربية" },
  { id: "english", label: "Anglais", labelAr: "الإنجليزية" },
  { id: "physics", label: "Physique-Chimie", labelAr: "الفيزياء والكيمياء" },
  { id: "svt", label: "SVT", labelAr: "علوم الحياة والأرض" },
  { id: "history", label: "Histoire-Geo", labelAr: "التاريخ والجغرافيا" },
  { id: "philosophy", label: "Philosophie", labelAr: "الفلسفة" },
  { id: "islamic", label: "Education Islamique", labelAr: "التربية الإسلامية" },
  { id: "sport", label: "Education Physique", labelAr: "التربية البدنية" },
  { id: "art", label: "Arts Plastiques", labelAr: "الفنون التشكيلية" },
  { id: "music", label: "Musique", labelAr: "الموسيقى" },
  { id: "informatique", label: "Informatique", labelAr: "المعلوميات" },
]

/**
 * GET /api/teen/education/grades
 * Fetch grades for a teen
 *
 * Query params:
 * - teenId: UUID of the teen (required)
 * - subject: Filter by subject (optional)
 * - term: Filter by term (optional)
 * - status: Filter by status (optional)
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const teenId = searchParams.get("teenId")
    const subject = searchParams.get("subject")
    const term = searchParams.get("term")
    const status = searchParams.get("status")

    if (!teenId) {
      return NextResponse.json(
        { error: "teenId is required" },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // Verify authentication
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    // Build query
    let query = supabase
      .from("teen_grades")
      .select("*")
      .eq("teen_id", teenId)
      .order("grade_date", { ascending: false })

    if (subject) {
      query = query.eq("subject", subject)
    }
    if (term) {
      query = query.eq("term", term)
    }
    if (status) {
      query = query.eq("status", status)
    }

    const { data: grades, error } = await query

    if (error) {
      console.error("Error fetching grades:", error)
      return NextResponse.json(
        { error: "Failed to fetch grades" },
        { status: 500 }
      )
    }

    // Calculate statistics
    const approvedGrades = grades?.filter((g) => g.status === "approved") || []
    const stats = {
      totalGrades: grades?.length || 0,
      approvedGrades: approvedGrades.length,
      pendingGrades: grades?.filter((g) => g.status === "pending").length || 0,
      averageGrade: approvedGrades.length > 0
        ? approvedGrades.reduce((sum, g) => sum + (g.grade / g.max_grade) * 20, 0) / approvedGrades.length
        : null,
      bySubject: SUBJECTS.map((s) => {
        const subjectGrades = approvedGrades.filter((g) => g.subject === s.id)
        return {
          subject: s.id,
          label: s.label,
          count: subjectGrades.length,
          average: subjectGrades.length > 0
            ? subjectGrades.reduce((sum, g) => sum + (g.grade / g.max_grade) * 20, 0) / subjectGrades.length
            : null,
        }
      }).filter((s) => s.count > 0),
    }

    return NextResponse.json({
      success: true,
      grades,
      stats,
      subjects: SUBJECTS,
    })
  } catch (error) {
    console.error("Unexpected error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

/**
 * POST /api/teen/education/grades
 * Submit a new grade for validation
 *
 * Body:
 * - teenId: UUID of the teen
 * - subject: Subject ID
 * - grade: Grade value
 * - maxGrade: Maximum grade (default 20)
 * - gradeType: Type of grade (exam, homework, quiz, project, oral)
 * - term: Term (T1, T2, T3, S1, S2)
 * - gradeDate: Date of the grade
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { teenId, subject, grade, maxGrade = 20, gradeType = "exam", term, gradeDate } = body

    if (!teenId || !subject || grade === undefined) {
      return NextResponse.json(
        { error: "teenId, subject, and grade are required" },
        { status: 400 }
      )
    }

    // Validate subject
    const subjectInfo = SUBJECTS.find((s) => s.id === subject)
    if (!subjectInfo) {
      return NextResponse.json(
        { error: "Invalid subject" },
        { status: 400 }
      )
    }

    // Validate grade
    if (grade < 0 || grade > maxGrade) {
      return NextResponse.json(
        { error: `Grade must be between 0 and ${maxGrade}` },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // Verify authentication
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    // Get current school year
    const now = new Date()
    const year = now.getMonth() >= 8 ? now.getFullYear() : now.getFullYear() - 1
    const schoolYear = `${year}-${year + 1}`

    // Insert grade
    const { data: newGrade, error } = await supabase
      .from("teen_grades")
      .insert({
        teen_id: teenId,
        subject,
        subject_label: subjectInfo.label,
        grade,
        max_grade: maxGrade,
        grade_type: gradeType,
        term: term || null,
        school_year: schoolYear,
        grade_date: gradeDate || new Date().toISOString().split("T")[0],
        status: "pending",
      })
      .select()
      .single()

    if (error) {
      console.error("Error creating grade:", error)
      return NextResponse.json(
        { error: "Failed to create grade" },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      grade: newGrade,
      message: "Note soumise pour validation par le parent",
    })
  } catch (error) {
    console.error("Unexpected error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/teen/education/grades
 * Validate or reject a grade (parent only)
 *
 * Body:
 * - gradeId: UUID of the grade
 * - action: 'approve' | 'reject'
 * - rejectionReason: Reason for rejection (if rejecting)
 */
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()
    const { gradeId, action, rejectionReason } = body

    if (!gradeId || !action) {
      return NextResponse.json(
        { error: "gradeId and action are required" },
        { status: 400 }
      )
    }

    if (!["approve", "reject"].includes(action)) {
      return NextResponse.json(
        { error: "Invalid action. Must be 'approve' or 'reject'" },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // Verify authentication
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    // Get grade to verify parent ownership
    const { data: grade, error: gradeError } = await supabase
      .from("teen_grades")
      .select("*, teens!inner(parent_id)")
      .eq("id", gradeId)
      .single()

    if (gradeError || !grade) {
      return NextResponse.json(
        { error: "Grade not found" },
        { status: 404 }
      )
    }

    // Verify parent owns this teen
    if (grade.teens.parent_id !== user.id) {
      return NextResponse.json(
        { error: "You are not authorized to validate this grade" },
        { status: 403 }
      )
    }

    // Update grade status
    const updateData: Record<string, unknown> = {
      status: action === "approve" ? "approved" : "rejected",
      validated_by: user.id,
      validated_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    if (action === "reject" && rejectionReason) {
      updateData.rejection_reason = rejectionReason
    }

    const { data: updatedGrade, error: updateError } = await supabase
      .from("teen_grades")
      .update(updateData)
      .eq("id", gradeId)
      .select()
      .single()

    if (updateError) {
      console.error("Error updating grade:", updateError)
      return NextResponse.json(
        { error: "Failed to update grade" },
        { status: 500 }
      )
    }

    // Award XP if approved and grade is good
    if (action === "approve") {
      const gradePercent = (grade.grade / grade.max_grade) * 100
      let xpReward = 0

      if (gradePercent >= 90) xpReward = 100
      else if (gradePercent >= 80) xpReward = 75
      else if (gradePercent >= 70) xpReward = 50
      else if (gradePercent >= 60) xpReward = 25
      else if (gradePercent >= 50) xpReward = 10

      if (xpReward > 0) {
        await supabase.rpc("add_xp_to_user", {
          p_teen_id: grade.teen_id,
          p_xp_amount: xpReward,
          p_source_type: "grade",
          p_source_id: gradeId,
          p_description: `Note validee: ${grade.subject_label} - ${grade.grade}/${grade.max_grade}`,
        })

        // Update grade with XP awarded
        await supabase
          .from("teen_grades")
          .update({ xp_awarded: xpReward })
          .eq("id", gradeId)
      }
    }

    return NextResponse.json({
      success: true,
      grade: updatedGrade,
      message: action === "approve" ? "Note approuvee" : "Note rejetee",
    })
  } catch (error) {
    console.error("Unexpected error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
