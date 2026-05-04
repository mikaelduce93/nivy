/**
 * API Route: International School Content Generation
 * Génère du contenu adapté aux écoles privées internationales au Maroc
 */

import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { InternationalSchoolEngine } from "@/lib/ai/international-school-engine"

/**
 * GET /api/teen/content/international
 * Récupère le profil scolaire international et les recommandations
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Récupérer l'ID du teen
    const { data: teen } = await supabase
      .from("teens")
      .select("id, school, grade_level")
      .eq("parent_id", user.id)
      .single()

    if (!teen) {
      return NextResponse.json({ error: "Teen profile not found" }, { status: 404 })
    }

    const engine = new InternationalSchoolEngine()

    // Récupérer le profil scolaire international
    const schoolProfile = await engine.getInternationalSchoolProfile(teen.id)

    if (!schoolProfile) {
      return NextResponse.json({
        error: "Could not determine school profile",
        suggestion: "Please update your school name in profile",
      }, { status: 400 })
    }

    return NextResponse.json({
      success: true,
      schoolProfile,
      detected: {
        schoolType: schoolProfile.schoolType,
        curriculum: schoolProfile.curriculum,
        gradeLevel: schoolProfile.gradeLevel,
        availableSubjects: schoolProfile.subjects,
      },
    })
  } catch (error) {
    console.error("Error getting international school profile:", error)
    return NextResponse.json(
      { error: "Failed to get school profile" },
      { status: 500 }
    )
  }
}

/**
 * POST /api/teen/content/international
 * Génère du contenu adapté au programme international
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { pillar, targetXP } = body

    // Récupérer l'ID du teen
    const { data: teen } = await supabase
      .from("teens")
      .select("id")
      .eq("parent_id", user.id)
      .single()

    if (!teen) {
      return NextResponse.json({ error: "Teen profile not found" }, { status: 404 })
    }

    const engine = new InternationalSchoolEngine()

    // Générer du contenu adapté
    const content = await engine.generateInternationalContent({
      teenId: teen.id,
      pillar: pillar || undefined,
      targetXP: targetXP || undefined,
    })

    if (content.length === 0) {
      return NextResponse.json({
        error: "No content generated",
        suggestion: "Please check your school profile and try again",
      }, { status: 400 })
    }

    return NextResponse.json({
      success: true,
      generated: content.length,
      content,
      summary: {
        school: content.filter((c) => c.pillar === "school").length,
        sport: content.filter((c) => c.pillar === "sport").length,
        crea: content.filter((c) => c.pillar === "crea").length,
        totalXPReward: content.reduce((sum, c) => sum + (c.xpReward || 0), 0),
        totalXPValueDH: content.reduce((sum, c) => sum + (c.xpValueDH || 0), 0),
      },
    })
  } catch (error) {
    console.error("Error generating international content:", error)
    return NextResponse.json(
      { error: "Failed to generate content" },
      { status: 500 }
    )
  }
}


