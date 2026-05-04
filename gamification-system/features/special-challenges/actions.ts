/**
 * TEENS PARTY MOROCCO - Special Challenges Server Actions
 * ========================================================
 *
 * Server actions pour les défis spéciaux.
 */

"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"
import {
  type SpecialChallenge,
  type SpecialChallengeType,
  type ChallengeSubmission,
  type QuizQuestion,
  type GeolocationZone,
  type QuizAnswer,
} from "./schema"

/* ==========================================================================
   GET CHALLENGE TYPES
   ========================================================================== */

/**
 * Récupère tous les types de défis spéciaux
 */
export async function getSpecialChallengeTypes(): Promise<{
  data: SpecialChallengeType[]
  error: string | null
}> {
  try {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from("special_challenge_types")
      .select("*")
      .eq("is_active", true)
      .order("challenge_category")

    if (error) {
      console.error("Error fetching challenge types:", error)
      return { data: [], error: error.message }
    }

    return { data: data as SpecialChallengeType[], error: null }
  } catch (error) {
    console.error("Error in getSpecialChallengeTypes:", error)
    return { data: [], error: "Erreur serveur" }
  }
}

/* ==========================================================================
   GET ACTIVE CHALLENGES
   ========================================================================== */

/**
 * Récupère les défis spéciaux actifs
 */
export async function getActiveSpecialChallenges(): Promise<{
  data: SpecialChallenge[]
  error: string | null
}> {
  try {
    const supabase = await createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    const { data, error } = await supabase.rpc("get_active_special_challenges", {
      p_user_id: user?.id || null,
    })

    if (error) {
      console.error("Error fetching active challenges:", error)
      return { data: [], error: error.message }
    }

    return { data: data as SpecialChallenge[], error: null }
  } catch (error) {
    console.error("Error in getActiveSpecialChallenges:", error)
    return { data: [], error: "Erreur serveur" }
  }
}

/**
 * Récupère les défis flash actifs
 */
export async function getFlashChallenges(): Promise<{
  data: SpecialChallenge[]
  error: string | null
}> {
  try {
    const { data, error } = await getActiveSpecialChallenges()

    if (error) {
      return { data: [], error }
    }

    const flashChallenges = data.filter((c) => c.is_flash)
    return { data: flashChallenges, error: null }
  } catch (error) {
    console.error("Error in getFlashChallenges:", error)
    return { data: [], error: "Erreur serveur" }
  }
}

/* ==========================================================================
   GET CHALLENGE DETAILS
   ========================================================================== */

/**
 * Récupère les détails d'un défi spécifique
 */
export async function getSpecialChallengeDetails(challengeId: string): Promise<{
  data: {
    challenge: SpecialChallenge | null
    submissions: ChallengeSubmission[]
    userSubmission: ChallengeSubmission | null
  }
  error: string | null
}> {
  try {
    const supabase = await createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    // Récupérer le défi
    const { data: challenge, error: challengeError } = await supabase
      .from("special_challenges")
      .select(`
        *,
        special_challenge_types (*)
      `)
      .eq("id", challengeId)
      .single()

    if (challengeError) {
      console.error("Error fetching challenge:", challengeError)
      return {
        data: { challenge: null, submissions: [], userSubmission: null },
        error: challengeError.message,
      }
    }

    // Récupérer les soumissions
    const { data: submissions, error: submissionsError } = await supabase
      .from("special_challenge_submissions")
      .select(`
        *,
        profiles:user_id (pseudo, avatar_url)
      `)
      .eq("challenge_id", challengeId)
      .eq("is_validated", true)
      .order("vote_count", { ascending: false })

    if (submissionsError) {
      console.error("Error fetching submissions:", submissionsError)
    }

    const formattedSubmissions = (submissions || []).map((s: any) => ({
      id: s.id,
      challenge_id: s.challenge_id,
      user_id: s.user_id,
      pseudo: s.profiles?.pseudo,
      avatar_url: s.profiles?.avatar_url,
      submission_type: s.submission_type,
      content: s.content,
      image_url: s.image_url,
      score: s.score,
      vote_count: s.vote_count,
      is_validated: s.is_validated,
      xp_awarded: s.xp_awarded,
      submitted_at: s.submitted_at,
      is_winner: challenge.winner_id === s.user_id,
    }))

    // Trouver la soumission de l'utilisateur
    const userSubmission = user
      ? formattedSubmissions.find((s: ChallengeSubmission) => s.user_id === user.id) || null
      : null

    // Formater le défi
    const type = challenge.special_challenge_types
    const formattedChallenge: SpecialChallenge = {
      challenge_id: challenge.id,
      type_slug: type.slug,
      type_name: type.name,
      category: type.challenge_category,
      icon: type.icon,
      color: type.color,
      title: challenge.title,
      description: challenge.description,
      starts_at: challenge.starts_at,
      ends_at: challenge.ends_at,
      is_flash: challenge.is_flash,
      total_participants: challenge.total_participants,
      base_xp: type.base_xp_reward,
      winner_xp: type.winner_bonus_xp,
      has_participated: !!userSubmission,
      time_remaining_seconds: Math.max(
        0,
        Math.floor((new Date(challenge.ends_at).getTime() - Date.now()) / 1000)
      ),
    }

    return {
      data: {
        challenge: formattedChallenge,
        submissions: formattedSubmissions,
        userSubmission,
      },
      error: null,
    }
  } catch (error) {
    console.error("Error in getSpecialChallengeDetails:", error)
    return {
      data: { challenge: null, submissions: [], userSubmission: null },
      error: "Erreur serveur",
    }
  }
}

/* ==========================================================================
   SUBMIT PHOTO
   ========================================================================== */

/**
 * Soumet une photo pour un défi photo
 */
export async function submitPhoto(
  challengeId: string,
  imageUrl: string,
  caption?: string
): Promise<{
  success: boolean
  xpAwarded?: number
  error: string | null
}> {
  try {
    const supabase = await createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return { success: false, error: "Non authentifié" }
    }

    const { data, error } = await supabase.rpc("submit_challenge_entry", {
      p_challenge_id: challengeId,
      p_user_id: user.id,
      p_submission_type: "photo",
      p_content: { caption: caption || "" },
      p_image_url: imageUrl,
    })

    if (error) {
      console.error("Error submitting photo:", error)
      return { success: false, error: error.message }
    }

    if (!data?.success) {
      return { success: false, error: data?.error || "Erreur de soumission" }
    }

    revalidatePath("/challenges")

    return {
      success: true,
      xpAwarded: data.xp_awarded,
      error: null,
    }
  } catch (error) {
    console.error("Error in submitPhoto:", error)
    return { success: false, error: "Erreur serveur" }
  }
}

/* ==========================================================================
   GET QUIZ QUESTIONS
   ========================================================================== */

/**
 * Récupère des questions de quiz
 */
export async function getQuizQuestions(
  count: number = 10,
  category?: string,
  difficulty?: string
): Promise<{
  data: QuizQuestion[]
  error: string | null
}> {
  try {
    const supabase = await createClient()

    const { data, error } = await supabase.rpc("get_quiz_questions", {
      p_count: count,
      p_category: category || null,
      p_difficulty: difficulty || null,
    })

    if (error) {
      console.error("Error fetching quiz questions:", error)
      return { data: [], error: error.message }
    }

    return { data: data as QuizQuestion[], error: null }
  } catch (error) {
    console.error("Error in getQuizQuestions:", error)
    return { data: [], error: "Erreur serveur" }
  }
}

/* ==========================================================================
   SUBMIT QUIZ ANSWERS
   ========================================================================== */

/**
 * Soumet les réponses d'un quiz
 */
export async function submitQuizAnswers(
  challengeId: string,
  answers: QuizAnswer[],
  totalTime: number
): Promise<{
  success: boolean
  score?: number
  xpAwarded?: number
  error: string | null
}> {
  try {
    const supabase = await createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return { success: false, error: "Non authentifié" }
    }

    const { data, error } = await supabase.rpc("submit_challenge_entry", {
      p_challenge_id: challengeId,
      p_user_id: user.id,
      p_submission_type: "answer",
      p_content: { total_time: totalTime },
      p_answers: answers,
      p_time_taken: Math.round(totalTime / 1000),
    })

    if (error) {
      console.error("Error submitting quiz:", error)
      return { success: false, error: error.message }
    }

    if (!data?.success) {
      return { success: false, error: data?.error || "Erreur de soumission" }
    }

    revalidatePath("/challenges")

    return {
      success: true,
      score: data.score,
      xpAwarded: data.xp_awarded,
      error: null,
    }
  } catch (error) {
    console.error("Error in submitQuizAnswers:", error)
    return { success: false, error: "Erreur serveur" }
  }
}

/* ==========================================================================
   SUBMIT GEOLOCATION
   ========================================================================== */

/**
 * Soumet une position pour un défi géoloc
 */
export async function submitGeolocation(
  challengeId: string,
  latitude: number,
  longitude: number,
  accuracy: number
): Promise<{
  success: boolean
  xpAwarded?: number
  error: string | null
}> {
  try {
    const supabase = await createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return { success: false, error: "Non authentifié" }
    }

    const { data, error } = await supabase.rpc("submit_challenge_entry", {
      p_challenge_id: challengeId,
      p_user_id: user.id,
      p_submission_type: "location",
      p_content: { accuracy },
      p_latitude: latitude,
      p_longitude: longitude,
    })

    if (error) {
      console.error("Error submitting location:", error)
      return { success: false, error: error.message }
    }

    if (!data?.success) {
      return { success: false, error: data?.error || "Erreur de soumission" }
    }

    revalidatePath("/challenges")

    return {
      success: true,
      xpAwarded: data.xp_awarded,
      error: null,
    }
  } catch (error) {
    console.error("Error in submitGeolocation:", error)
    return { success: false, error: "Erreur serveur" }
  }
}

/* ==========================================================================
   VOTE ON SUBMISSION
   ========================================================================== */

/**
 * Vote sur une soumission
 */
export async function voteOnSubmission(
  submissionId: string,
  vote: 1 | -1
): Promise<{
  success: boolean
  error: string | null
}> {
  try {
    const supabase = await createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return { success: false, error: "Non authentifié" }
    }

    const { data, error } = await supabase.rpc("vote_on_submission", {
      p_submission_id: submissionId,
      p_user_id: user.id,
      p_vote: vote,
    })

    if (error) {
      console.error("Error voting:", error)
      return { success: false, error: error.message }
    }

    if (!data?.success) {
      return { success: false, error: data?.error || "Erreur de vote" }
    }

    revalidatePath("/challenges")

    return { success: true, error: null }
  } catch (error) {
    console.error("Error in voteOnSubmission:", error)
    return { success: false, error: "Erreur serveur" }
  }
}

/* ==========================================================================
   GET GEOLOCATION ZONES
   ========================================================================== */

/**
 * Récupère les zones de géolocalisation pour un défi
 */
export async function getGeolocationZones(
  challengeId?: string,
  eventId?: string
): Promise<{
  data: GeolocationZone[]
  error: string | null
}> {
  try {
    const supabase = await createClient()

    let query = supabase
      .from("geolocation_zones")
      .select("*")
      .eq("is_active", true)

    if (eventId) {
      query = query.eq("event_id", eventId)
    }

    const { data, error } = await query

    if (error) {
      console.error("Error fetching zones:", error)
      return { data: [], error: error.message }
    }

    return { data: data as GeolocationZone[], error: null }
  } catch (error) {
    console.error("Error in getGeolocationZones:", error)
    return { data: [], error: "Erreur serveur" }
  }
}

/* ==========================================================================
   GET USER CHALLENGE HISTORY
   ========================================================================== */

/**
 * Récupère l'historique des défis spéciaux de l'utilisateur
 */
export async function getUserChallengeHistory(): Promise<{
  data: ChallengeSubmission[]
  error: string | null
}> {
  try {
    const supabase = await createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return { data: [], error: "Non authentifié" }
    }

    const { data, error } = await supabase
      .from("special_challenge_submissions")
      .select(`
        *,
        special_challenges (
          id,
          title,
          status,
          winner_id,
          special_challenge_types (
            slug,
            name,
            icon,
            color,
            challenge_category
          )
        )
      `)
      .eq("user_id", user.id)
      .order("submitted_at", { ascending: false })
      .limit(50)

    if (error) {
      console.error("Error fetching history:", error)
      return { data: [], error: error.message }
    }

    const formatted = (data || []).map((s: any) => ({
      id: s.id,
      challenge_id: s.challenge_id,
      user_id: s.user_id,
      pseudo: "",
      avatar_url: null,
      submission_type: s.submission_type,
      content: s.content,
      image_url: s.image_url,
      score: s.score,
      vote_count: s.vote_count,
      is_validated: s.is_validated,
      xp_awarded: s.xp_awarded,
      submitted_at: s.submitted_at,
      is_winner: s.special_challenges?.winner_id === s.user_id,
      challenge_title: s.special_challenges?.title,
      challenge_type: s.special_challenges?.special_challenge_types,
    }))

    return { data: formatted, error: null }
  } catch (error) {
    console.error("Error in getUserChallengeHistory:", error)
    return { data: [], error: "Erreur serveur" }
  }
}

/* ==========================================================================
   GET CHALLENGE LEADERBOARD
   ========================================================================== */

/**
 * Récupère le classement d'un défi
 */
export async function getChallengeLeaderboard(
  challengeId: string,
  limit: number = 20
): Promise<{
  data: ChallengeSubmission[]
  error: string | null
}> {
  try {
    const supabase = await createClient()

    // D'abord, déterminer le type de défi pour le tri
    const { data: challenge } = await supabase
      .from("special_challenges")
      .select(`
        special_challenge_types (challenge_category)
      `)
      .eq("id", challengeId)
      .single()

    const category = Array.isArray((challenge as any)?.special_challenge_types)
      ? (challenge as any).special_challenge_types?.[0]?.challenge_category
      : (challenge as any)?.special_challenge_types?.challenge_category

    // Construire la requête selon le type
    let query = supabase
      .from("special_challenge_submissions")
      .select(`
        *,
        profiles:user_id (pseudo, avatar_url)
      `)
      .eq("challenge_id", challengeId)
      .eq("is_validated", true)
      .limit(limit)

    // Trier selon le type de défi
    if (category === "quiz") {
      query = query.order("score", { ascending: false })
    } else {
      query = query.order("vote_count", { ascending: false })
    }

    const { data, error } = await query

    if (error) {
      console.error("Error fetching leaderboard:", error)
      return { data: [], error: error.message }
    }

    const formatted = (data || []).map((s: any, index: number) => ({
      id: s.id,
      challenge_id: s.challenge_id,
      user_id: s.user_id,
      pseudo: s.profiles?.pseudo,
      avatar_url: s.profiles?.avatar_url,
      submission_type: s.submission_type,
      content: s.content,
      image_url: s.image_url,
      score: s.score,
      vote_count: s.vote_count,
      is_validated: s.is_validated,
      xp_awarded: s.xp_awarded,
      submitted_at: s.submitted_at,
      rank: index + 1,
    }))

    return { data: formatted, error: null }
  } catch (error) {
    console.error("Error in getChallengeLeaderboard:", error)
    return { data: [], error: "Erreur serveur" }
  }
}
