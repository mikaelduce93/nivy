/**
 * API Route: Personalized Content
 * Récupère et assigne du contenu personnalisé basé sur le profil de l'utilisateur
 */

import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

/**
 * GET /api/teen/content/personalized
 * Récupère le contenu personnalisé pour l'utilisateur connecté
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Récupérer le profil teen
    const { data: profile } = await supabase
      .from("profiles")
      .select("id, role")
      .eq("id", user.id)
      .single()

    if (profile?.role !== "teen") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    // Récupérer l'ID du teen
    const { data: teen } = await supabase
      .from("teens")
      .select("id, grade_level, interests, profiles, school")
      .eq("parent_id", user.id)
      .single()

    if (!teen) {
      return NextResponse.json({ error: "Teen profile not found" }, { status: 404 })
    }

    const searchParams = request.nextUrl.searchParams
    const contentType = searchParams.get("contentType") || "all"
    const limit = parseInt(searchParams.get("limit") || "10")

    const results: any = {
      quizzes: [],
      missions: [],
      challenges: [],
    }

    // Récupérer les quiz recommandés
    if (contentType === "all" || contentType === "quiz") {
      let quizQuery = supabase
        .from("educational_quizzes")
        .select("*")
        .eq("is_active", true)
        .order("created_at", { ascending: false })
        .limit(limit)

      if (teen.grade_level) {
        quizQuery = quizQuery.eq("grade_level", teen.grade_level)
      }

      const { data: quizzes } = await quizQuery

      if (quizzes) {
        // Calculer le score de correspondance pour chaque quiz
        for (const quiz of quizzes) {
          const matchScore = await calculateMatchScore(teen, {
            grade_level: quiz.grade_level,
            subject: quiz.subject,
          })

          results.quizzes.push({
            ...quiz,
            match_score: matchScore,
          })
        }

        // Trier par score de correspondance
        results.quizzes.sort((a: any, b: any) => b.match_score - a.match_score)
      }
    }

    // Récupérer les missions recommandées
    if (contentType === "all" || contentType === "mission") {
      const { data: missions } = await supabase
        .from("mission_templates")
        .select("*")
        .eq("is_active", true)
        .eq("mission_type", "daily")
        .order("created_at", { ascending: false })
        .limit(limit)

      if (missions) {
        for (const mission of missions) {
          const matchScore = await calculateMatchScore(teen, {
            category: mission.category,
          })

          results.missions.push({
            ...mission,
            match_score: matchScore,
          })
        }

        results.missions.sort((a: any, b: any) => b.match_score - a.match_score)
      }
    }

    // Récupérer les défis recommandés
    if (contentType === "all" || contentType === "challenge") {
      const { data: challenges } = await supabase
        .from("challenges_templates")
        .select("*")
        .eq("is_active", true)
        .order("created_at", { ascending: false })
        .limit(limit)

      if (challenges) {
        for (const challenge of challenges) {
          const matchScore = await calculateMatchScore(teen, {
            category: challenge.category,
          })

          results.challenges.push({
            ...challenge,
            match_score: matchScore,
          })
        }

        results.challenges.sort((a: any, b: any) => b.match_score - a.match_score)
      }
    }

    return NextResponse.json({
      success: true,
      teen_profile: {
        grade_level: teen.grade_level,
        interests: teen.interests,
        profiles: teen.profiles,
      },
      content: results,
    })
  } catch (error) {
    console.error("Error fetching personalized content:", error)
    return NextResponse.json(
      { error: "Failed to fetch personalized content" },
      { status: 500 }
    )
  }
}

/**
 * Calcule le score de correspondance entre un teen et du contenu
 */
async function calculateMatchScore(teen: any, contentParams: any): Promise<number> {
  try {
    const supabase = await createClient()
    
    const { data, error } = await supabase.rpc("calculate_content_match_score", {
      p_teen_id: teen.id,
      p_content_params: contentParams,
    })

    if (error) {
      console.error("Error calculating match score:", error)
      // Fallback: calcul simple basé sur les correspondances
      return calculateSimpleMatchScore(teen, contentParams)
    }

    return data || 0
  } catch (error) {
    console.error("Error in calculateMatchScore:", error)
    return calculateSimpleMatchScore(teen, contentParams)
  }
}

/**
 * Calcul simple de correspondance (fallback si la fonction SQL n'existe pas)
 */
function calculateSimpleMatchScore(teen: any, contentParams: any): number {
  let score = 0

  // Correspondance niveau scolaire
  if (contentParams.grade_level && teen.grade_level === contentParams.grade_level) {
    score += 30
  }

  // Correspondance intérêts
  if (contentParams.interests && Array.isArray(teen.interests)) {
    const matchingInterests = (contentParams.interests as string[]).filter((interest: string) =>
      (teen.interests as string[]).includes(interest)
    )
    if (matchingInterests.length > 0) {
      score += 40
    }
  }

  // Correspondance profils
  if (contentParams.profiles && Array.isArray(teen.profiles)) {
    const matchingProfiles = (contentParams.profiles as string[]).filter((profile: string) =>
      (teen.profiles as string[]).includes(profile)
    )
    if (matchingProfiles.length > 0) {
      score += 30
    }
  }

  return Math.min(100, score)
}

