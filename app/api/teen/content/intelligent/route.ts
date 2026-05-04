/**
 * API Route: Intelligent Content Generation & Recommendations
 * Génère et recommande du contenu basé sur le profil comportemental avancé
 */

import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { IntelligentContentEngine } from "@/lib/ai/intelligent-content-engine"

/**
 * GET /api/teen/content/intelligent
 * Récupère des recommandations intelligentes de contenu
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
      .select("id")
      .eq("parent_id", user.id)
      .single()

    if (!teen) {
      return NextResponse.json({ error: "Teen profile not found" }, { status: 404 })
    }

    const searchParams = request.nextUrl.searchParams
    const limit = parseInt(searchParams.get("limit") || "10")
    const contentType = searchParams.get("contentType") || "all"

    const engine = new IntelligentContentEngine()

    // Générer des recommandations intelligentes
    const recommendations = await engine.recommendContent(teen.id, limit)

    // Filtrer par type si spécifié
    const filtered = contentType !== "all"
      ? recommendations.filter((r) => r.contentType === contentType)
      : recommendations

    return NextResponse.json({
      success: true,
      recommendations: filtered,
      count: filtered.length,
    })
  } catch (error) {
    console.error("Error getting intelligent recommendations:", error)
    return NextResponse.json(
      { error: "Failed to get recommendations" },
      { status: 500 }
    )
  }
}

/**
 * POST /api/teen/content/intelligent
 * Génère du contenu intelligent personnalisé
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { contentType } = body

    if (!contentType || !["quiz", "mission", "challenge"].includes(contentType)) {
      return NextResponse.json(
        { error: "Invalid content type" },
        { status: 400 }
      )
    }

    // Récupérer l'ID du teen
    const { data: teen } = await supabase
      .from("teens")
      .select("id")
      .eq("parent_id", user.id)
      .single()

    if (!teen) {
      return NextResponse.json({ error: "Teen profile not found" }, { status: 404 })
    }

    const engine = new IntelligentContentEngine()

    // Générer du contenu intelligent
    const content = await engine.generateIntelligentContent(teen.id, contentType)

    if (!content) {
      return NextResponse.json(
        { error: "Failed to generate content" },
        { status: 500 }
      )
    }

    // Sauvegarder le contenu généré
    let savedContent: any = null
    if (contentType === "quiz") {
      const { data, error } = await supabase
        .from("educational_quizzes")
        .insert({
          code: `INTELLIGENT_${Date.now()}`,
          title: content.title,
          description: content.description,
          subject: content.subject,
          difficulty: content.difficulty,
          grade_level: content.grade_level,
          questions: content.questions,
          time_limit_minutes: content.time_limit_minutes,
          passing_score: content.passing_score,
          xp_reward: content.xp_reward,
          is_active: true,
        })
        .select()
        .single()

      if (!error) savedContent = data
    }

    return NextResponse.json({
      success: true,
      content: savedContent || content,
      generated: true,
    })
  } catch (error) {
    console.error("Error generating intelligent content:", error)
    return NextResponse.json(
      { error: "Failed to generate content" },
      { status: 500 }
    )
  }
}


