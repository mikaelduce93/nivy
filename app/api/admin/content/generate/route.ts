/**
 * API Route: Generate Content
 * Génère automatiquement du contenu (quiz, missions, défis) basé sur des paramètres
 */

import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { ContentGenerator, type GenerationParams } from "@/lib/ai/content-generator"

/**
 * POST /api/admin/content/generate
 * Génère du contenu personnalisé
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Vérifier l'authentification et les permissions admin
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Vérifier le rôle admin
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
      contentType,
      teenId,
      category,
      gradeLevel,
      difficulty,
      subject,
      count = 1,
    } = body

    if (!contentType || !["quiz", "mission", "challenge"].includes(contentType)) {
      return NextResponse.json(
        { error: "Invalid content type" },
        { status: 400 }
      )
    }

    // Récupérer les paramètres du profil si teenId fourni
    let generationParams: GenerationParams = {
      contentType,
      category,
      gradeLevel,
      difficulty,
      subject,
      count,
    }

    if (teenId) {
      const { data: teen } = await supabase
        .from("teens")
        .select("grade_level, interests, profiles, school")
        .eq("id", teenId)
        .single()

      if (teen) {
        generationParams.gradeLevel = generationParams.gradeLevel || teen.grade_level || undefined
        generationParams.interests = (teen.interests as string[]) || []
        generationParams.profiles = (teen.profiles as string[]) || []
      }
    }

    // Initialiser le générateur
    const provider = (process.env.AI_PROVIDER as "openai" | "claude") || "openai"
    const generator = new ContentGenerator(provider)

    const results = []

    // Générer le contenu
    for (let i = 0; i < count; i++) {
      let generated: any = null

      switch (contentType) {
        case "quiz":
          generated = await generator.generateQuiz(generationParams)
          if (generated) {
            // Sauvegarder le quiz
            const { data: quiz, error: quizError } = await supabase
              .from("educational_quizzes")
              .insert({
                code: `AUTO_${Date.now()}_${i}`,
                title: generated.title,
                description: generated.description,
                subject: generated.subject,
                difficulty: generated.difficulty,
                grade_level: generated.grade_level,
                questions: generated.questions,
                time_limit_minutes: generated.time_limit_minutes,
                passing_score: generated.passing_score,
                xp_reward: generated.xp_reward,
                is_active: true,
              })
              .select()
              .single()

            if (!quizError && quiz) {
              results.push({ type: "quiz", id: quiz.id, data: quiz })
            }
          }
          break

        case "mission":
          generated = await generator.generateMission(generationParams)
          if (generated) {
            // Sauvegarder la mission
            const { data: mission, error: missionError } = await supabase
              .from("mission_templates")
              .insert({
                code: `AUTO_${Date.now()}_${i}`,
                name: generated.name,
                description: generated.description,
                mission_type: generated.mission_type,
                category: generated.category,
                objective_type: generated.objective_type,
                objective_target: generated.objective_target,
                xp_reward: generated.xp_reward,
                difficulty: generated.difficulty,
                is_active: true,
              })
              .select()
              .single()

            if (!missionError && mission) {
              results.push({ type: "mission", id: mission.id, data: mission })
            }
          }
          break

        case "challenge":
          generated = await generator.generateChallenge(generationParams)
          if (generated) {
            // Sauvegarder le défi
            const { data: challenge, error: challengeError } = await supabase
              .from("challenges_templates")
              .insert({
                category: generated.category,
                title: generated.title,
                description: generated.description,
                xp_reward: generated.xp_reward,
                validation_type: generated.validation_type || "self_report",
                is_active: true,
              })
              .select()
              .single()

            if (!challengeError && challenge) {
              results.push({ type: "challenge", id: challenge.id, data: challenge })
            }
          }
          break
      }
    }

    return NextResponse.json({
      success: true,
      generated: results.length,
      results,
    })
  } catch (error) {
    console.error("Error generating content:", error)
    return NextResponse.json(
      { error: "Failed to generate content", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    )
  }
}

/**
 * GET /api/admin/content/generate
 * Liste les générations récentes
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
    const limit = parseInt(searchParams.get("limit") || "50")
    const contentType = searchParams.get("contentType")

    let query = supabase
      .from("content_generation_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(limit)

    if (contentType) {
      query = query.eq("content_type", contentType)
    }

    const { data: logs, error } = await query

    if (error) {
      return NextResponse.json(
        { error: "Failed to fetch logs" },
        { status: 500 }
      )
    }

    return NextResponse.json({ logs })
  } catch (error) {
    console.error("Error fetching generation logs:", error)
    return NextResponse.json(
      { error: "Failed to fetch logs" },
      { status: 500 }
    )
  }
}


