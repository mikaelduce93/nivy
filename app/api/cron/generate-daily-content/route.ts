/**
 * Cron Job: Generate Daily Content
 * Génère automatiquement du contenu quotidien basé sur les profils utilisateurs
 * À appeler quotidiennement (ex: via Vercel Cron ou autre service)
 */

import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { ContentGenerator } from "@/lib/ai/content-generator"

/**
 * POST /api/cron/generate-daily-content
 * Génère le contenu quotidien pour tous les utilisateurs actifs
 */
export async function POST(request: NextRequest) {
  try {
    // Vérifier le secret cron — fail-closed.
    const authHeader = request.headers.get("authorization")
    const cronSecret = process.env.CRON_SECRET
    const isVercelCron = request.headers.get("x-vercel-cron") !== null

    if (!isVercelCron) {
      if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
      }
    }

    const supabase = await createClient()
    const today = new Date().toISOString().split("T")[0]

    // Vérifier si la génération d'aujourd'hui a déjà été faite
    const { data: existingSchedule } = await supabase
      .from("daily_content_schedule")
      .select("*")
      .eq("target_date", today)
      .single()

    if (existingSchedule?.status === "completed") {
      return NextResponse.json({
        message: "Content already generated for today",
        schedule: existingSchedule,
      })
    }

    // Créer ou mettre à jour le planning
    const { data: schedule } = await supabase
      .from("daily_content_schedule")
      .upsert({
        target_date: today,
        status: "generating",
        started_at: new Date().toISOString(),
      })
      .select()
      .single()

    // Récupérer tous les teens actifs avec leurs profils
    const { data: teens, error: teensError } = await supabase
      .from("teens")
      .select("id, grade_level, interests, profiles, school")
      .limit(100) // Limiter pour éviter de surcharger

    if (teensError || !teens) {
      throw new Error("Failed to fetch teens")
    }

    // Grouper par profil pour générer du contenu adapté
    const profileGroups = new Map<string, any[]>()
    
    teens.forEach((teen) => {
      const profiles = (teen.profiles as string[]) || []
      if (profiles.length === 0) {
        // Utilisateurs sans profil spécifique
        const key = "general"
        if (!profileGroups.has(key)) profileGroups.set(key, [])
        profileGroups.get(key)!.push(teen)
      } else {
        profiles.forEach((profile) => {
          if (!profileGroups.has(profile)) profileGroups.set(profile, [])
          profileGroups.get(profile)!.push(teen)
        })
      }
    })

    const provider = (process.env.AI_PROVIDER as "openai" | "claude") || "openai"
    const generator = new ContentGenerator(provider)

    const generationLog: any[] = []
    let generatedCount = 0
    let failedCount = 0

    // Générer du contenu pour chaque groupe de profil
    for (const [profileType, profileTeens] of profileGroups.entries()) {
      // Générer des quiz
      try {
        const quizParams = {
          contentType: "quiz" as const,
          category: profileType === "School" ? "school" : profileType === "Sport" ? "sport" : "general",
          difficulty: "normal" as const,
          count: 2,
        }

        const quiz = await generator.generateQuiz(quizParams)
        if (quiz) {
          const { data: savedQuiz, error: quizError } = await supabase
            .from("educational_quizzes")
            .insert({
              code: `DAILY_${today}_${profileType}_${Date.now()}`,
              title: quiz.title,
              description: quiz.description,
              subject: quiz.subject,
              difficulty: quiz.difficulty,
              grade_level: quiz.grade_level,
              questions: quiz.questions,
              time_limit_minutes: quiz.time_limit_minutes,
              passing_score: quiz.passing_score,
              xp_reward: quiz.xp_reward,
              is_active: true,
            })
            .select()
            .single()

          if (!quizError && savedQuiz) {
            generatedCount++
            generationLog.push({ type: "quiz", id: savedQuiz.id, profile: profileType })
          } else {
            failedCount++
          }
        }
      } catch (error) {
        console.error(`Error generating quiz for ${profileType}:`, error)
        failedCount++
      }

      // Générer des missions
      try {
        const missionParams = {
          contentType: "mission" as const,
          category: profileType === "School" ? "school" : profileType === "Sport" ? "sport" : "participation",
          difficulty: "normal" as const,
          count: 1,
        }

        const mission = await generator.generateMission(missionParams)
        if (mission) {
          const { data: savedMission, error: missionError } = await supabase
            .from("mission_templates")
            .insert({
              code: `DAILY_${today}_${profileType}_${Date.now()}`,
              name: mission.name,
              description: mission.description,
              mission_type: mission.mission_type,
              category: mission.category,
              objective_type: mission.objective_type,
              objective_target: mission.objective_target,
              xp_reward: mission.xp_reward,
              difficulty: mission.difficulty,
              is_active: true,
            })
            .select()
            .single()

          if (!missionError && savedMission) {
            generatedCount++
            generationLog.push({ type: "mission", id: savedMission.id, profile: profileType })
          } else {
            failedCount++
          }
        }
      } catch (error) {
        console.error(`Error generating mission for ${profileType}:`, error)
        failedCount++
      }
    }

    // Mettre à jour le planning
    await supabase
      .from("daily_content_schedule")
      .update({
        status: failedCount > 0 && generatedCount === 0 ? "failed" : generatedCount > 0 ? "completed" : "partial",
        generated_count: generatedCount,
        failed_count: failedCount,
        generation_log: generationLog,
        completed_at: new Date().toISOString(),
      })
      .eq("target_date", today)

    return NextResponse.json({
      success: true,
      message: "Daily content generation completed",
      generated: generatedCount,
      failed: failedCount,
      log: generationLog,
    })
  } catch (error) {
    console.error("Error in daily content generation:", error)
    return NextResponse.json(
      {
        error: "Failed to generate daily content",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    )
  }
}

/**
 * GET /api/cron/generate-daily-content
 * Vérifie le statut de la génération quotidienne
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const today = new Date().toISOString().split("T")[0]

    const { data: schedule, error } = await supabase
      .from("daily_content_schedule")
      .select("*")
      .eq("target_date", today)
      .single()

    if (error && error.code !== "PGRST116") {
      return NextResponse.json(
        { error: "Failed to fetch schedule" },
        { status: 500 }
      )
    }

    return NextResponse.json({
      today,
      schedule: schedule || null,
      status: schedule?.status || "not_started",
    })
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to check status" },
      { status: 500 }
    )
  }
}


