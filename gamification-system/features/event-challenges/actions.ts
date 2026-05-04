/**
 * TEENS PARTY MOROCCO - Event Challenges Actions
 * ===============================================
 *
 * Server actions pour les défis événementiels.
 */

"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"
import {
  type EventChallengeType,
  type EventChallenge,
  type EventChallengeWithProgress,
  type UserEventProgress,
  type EventCheckIn,
  type EventReview,
  type UserEventStats,
  type EventChallengeCompletion,
  isChallengeAvailable,
  calculateProgressPercentage,
} from "./schema"

/* ==========================================================================
   TYPES DE DÉFIS
   ========================================================================== */

/**
 * Récupère tous les types de défis événementiels
 */
export async function getEventChallengeTypes(): Promise<{
  success: boolean
  data?: EventChallengeType[]
  error?: string
}> {
  try {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from("event_challenge_types")
      .select("*")
      .eq("is_active", true)
      .order("name")

    if (error) throw error

    return { success: true, data }
  } catch (error) {
    console.error("Error fetching event challenge types:", error)
    return { success: false, error: "Impossible de charger les types de défis" }
  }
}

/* ==========================================================================
   DÉFIS D'UN ÉVÉNEMENT
   ========================================================================== */

/**
 * Récupère les défis d'un événement avec progression utilisateur
 */
export async function getEventChallenges(eventId: string): Promise<{
  success: boolean
  data?: EventChallengeWithProgress[]
  checkIn?: EventCheckIn
  error?: string
}> {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return { success: false, error: "Non authentifié" }
    }

    // Récupérer les défis via RPC
    const { data: challenges, error: challengesError } = await supabase.rpc(
      "get_event_challenges",
      {
        p_event_id: eventId,
        p_user_id: user.id,
      }
    )

    if (challengesError) throw challengesError

    // Récupérer le check-in actuel
    const { data: checkIn } = await supabase
      .from("event_check_ins")
      .select("*")
      .eq("event_id", eventId)
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .single()

    // Enrichir les données
    const enrichedChallenges: EventChallengeWithProgress[] = (challenges || []).map(
      (challenge: any) => ({
        ...challenge,
        is_available: isChallengeAvailable(challenge, checkIn),
        progress_percentage: calculateProgressPercentage(
          challenge.user_progress?.current_count || 0,
          challenge.target_count
        ),
      })
    )

    return { success: true, data: enrichedChallenges, checkIn }
  } catch (error) {
    console.error("Error fetching event challenges:", error)
    return { success: false, error: "Impossible de charger les défis" }
  }
}

/* ==========================================================================
   CHECK-IN / CHECK-OUT
   ========================================================================== */

/**
 * Check-in à un événement
 */
export async function checkInToEvent(
  eventId: string,
  location?: { lat: number; lng: number }
): Promise<{
  success: boolean
  data?: EventCheckIn
  xpEarned?: number
  challengesUnlocked?: string[]
  error?: string
}> {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return { success: false, error: "Non authentifié" }
    }

    const locationPoint = location
      ? `POINT(${location.lng} ${location.lat})`
      : null

    const { data, error } = await supabase.rpc("check_in_to_event", {
      p_user_id: user.id,
      p_event_id: eventId,
      p_location: locationPoint,
    })

    if (error) throw error

    revalidatePath(`/events/${eventId}`)
    revalidatePath("/events")

    return {
      success: true,
      data: data.check_in,
      xpEarned: data.xp_earned,
      challengesUnlocked: data.challenges_unlocked,
    }
  } catch (error) {
    console.error("Error checking in:", error)
    return { success: false, error: "Erreur lors du check-in" }
  }
}

/**
 * Check-out d'un événement
 */
export async function checkOutFromEvent(eventId: string): Promise<{
  success: boolean
  data?: EventCheckIn
  duration?: number
  bonusXp?: number
  error?: string
}> {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return { success: false, error: "Non authentifié" }
    }

    const { data, error } = await supabase.rpc("check_out_from_event", {
      p_user_id: user.id,
      p_event_id: eventId,
    })

    if (error) throw error

    revalidatePath(`/events/${eventId}`)
    revalidatePath("/events")

    return {
      success: true,
      data: data.check_in,
      duration: data.duration_minutes,
      bonusXp: data.bonus_xp,
    }
  } catch (error) {
    console.error("Error checking out:", error)
    return { success: false, error: "Erreur lors du check-out" }
  }
}

/**
 * Récupère le check-in actif
 */
export async function getActiveCheckIn(eventId: string): Promise<{
  success: boolean
  data?: EventCheckIn | null
  error?: string
}> {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return { success: false, error: "Non authentifié" }
    }

    const { data, error } = await supabase
      .from("event_check_ins")
      .select("*")
      .eq("event_id", eventId)
      .eq("user_id", user.id)
      .eq("status", "checked_in")
      .single()

    if (error && error.code !== "PGRST116") throw error

    return { success: true, data: data || null }
  } catch (error) {
    console.error("Error fetching active check-in:", error)
    return { success: false, error: "Erreur lors de la récupération du check-in" }
  }
}

/* ==========================================================================
   COMPLÉTION DE DÉFIS
   ========================================================================== */

/**
 * Complète un défi événementiel
 */
export async function completeEventChallenge(
  challengeId: string,
  proofUrl?: string
): Promise<{
  success: boolean
  data?: EventChallengeCompletion
  error?: string
}> {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return { success: false, error: "Non authentifié" }
    }

    const { data, error } = await supabase.rpc("complete_event_challenge", {
      p_user_id: user.id,
      p_challenge_id: challengeId,
      p_proof_url: proofUrl || null,
    })

    if (error) throw error

    // Revalidate paths
    if (data.event_id) {
      revalidatePath(`/events/${data.event_id}`)
    }
    revalidatePath("/events")
    revalidatePath("/profile")

    return { success: true, data }
  } catch (error) {
    console.error("Error completing challenge:", error)
    return { success: false, error: "Erreur lors de la complétion du défi" }
  }
}

/**
 * Met à jour la progression d'un défi (incrémente le compteur)
 */
export async function updateChallengeProgress(
  challengeId: string,
  incrementBy: number = 1
): Promise<{
  success: boolean
  data?: UserEventProgress
  completed?: boolean
  error?: string
}> {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return { success: false, error: "Non authentifié" }
    }

    // Récupérer ou créer la progression
    const { data: existing } = await supabase
      .from("user_event_challenge_progress")
      .select("*, event_challenges(*)")
      .eq("event_challenge_id", challengeId)
      .eq("user_id", user.id)
      .single()

    if (!existing) {
      // Créer une nouvelle entrée de progression
      const { data: challenge } = await supabase
        .from("event_challenges")
        .select("*")
        .eq("id", challengeId)
        .single()

      if (!challenge) {
        return { success: false, error: "Défi non trouvé" }
      }

      const { data: newProgress, error: createError } = await supabase
        .from("user_event_challenge_progress")
        .insert({
          user_id: user.id,
          event_challenge_id: challengeId,
          status: "in_progress",
          current_count: incrementBy,
        })
        .select()
        .single()

      if (createError) throw createError

      return { success: true, data: newProgress, completed: false }
    }

    // Mettre à jour la progression existante
    const newCount = existing.current_count + incrementBy
    const challenge = existing.event_challenges
    const isComplete = newCount >= challenge.target_count

    if (isComplete && existing.status !== "completed") {
      // Compléter le défi
      const result = await completeEventChallenge(challengeId)
      return { success: result.success, completed: true, error: result.error }
    }

    // Juste mettre à jour le compteur
    const { data: updated, error: updateError } = await supabase
      .from("user_event_challenge_progress")
      .update({
        current_count: newCount,
        status: "in_progress",
        updated_at: new Date().toISOString(),
      })
      .eq("id", existing.id)
      .select()
      .single()

    if (updateError) throw updateError

    return { success: true, data: updated, completed: false }
  } catch (error) {
    console.error("Error updating challenge progress:", error)
    return { success: false, error: "Erreur lors de la mise à jour" }
  }
}

/* ==========================================================================
   REVIEWS
   ========================================================================== */

/**
 * Soumet un avis sur un événement
 */
export async function submitEventReview(
  eventId: string,
  review: {
    rating: number
    reviewText?: string
    atmosphereRating?: number
    musicRating?: number
    serviceRating?: number
    wouldRecommend: boolean
  }
): Promise<{
  success: boolean
  data?: EventReview
  xpEarned?: number
  error?: string
}> {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return { success: false, error: "Non authentifié" }
    }

    const { data, error } = await supabase.rpc("submit_event_review", {
      p_user_id: user.id,
      p_event_id: eventId,
      p_rating: review.rating,
      p_review_text: review.reviewText || null,
      p_atmosphere_rating: review.atmosphereRating || null,
      p_music_rating: review.musicRating || null,
      p_service_rating: review.serviceRating || null,
      p_would_recommend: review.wouldRecommend,
    })

    if (error) throw error

    revalidatePath(`/events/${eventId}`)
    revalidatePath("/events")

    return {
      success: true,
      data: data.review,
      xpEarned: data.xp_earned,
    }
  } catch (error) {
    console.error("Error submitting review:", error)
    return { success: false, error: "Erreur lors de l'envoi de l'avis" }
  }
}

/**
 * Récupère l'avis de l'utilisateur sur un événement
 */
export async function getUserEventReview(eventId: string): Promise<{
  success: boolean
  data?: EventReview | null
  error?: string
}> {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return { success: false, error: "Non authentifié" }
    }

    const { data, error } = await supabase
      .from("event_reviews")
      .select("*")
      .eq("event_id", eventId)
      .eq("user_id", user.id)
      .single()

    if (error && error.code !== "PGRST116") throw error

    return { success: true, data: data || null }
  } catch (error) {
    console.error("Error fetching user review:", error)
    return { success: false, error: "Erreur lors de la récupération de l'avis" }
  }
}

/* ==========================================================================
   STATS UTILISATEUR
   ========================================================================== */

/**
 * Récupère les stats événementielles de l'utilisateur
 */
export async function getUserEventStats(): Promise<{
  success: boolean
  data?: UserEventStats
  error?: string
}> {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return { success: false, error: "Non authentifié" }
    }

    const { data, error } = await supabase.rpc("get_user_event_stats", {
      p_user_id: user.id,
    })

    if (error) throw error

    return { success: true, data }
  } catch (error) {
    console.error("Error fetching user event stats:", error)
    return { success: false, error: "Erreur lors de la récupération des stats" }
  }
}

/* ==========================================================================
   HISTORIQUE
   ========================================================================== */

/**
 * Récupère l'historique des check-ins de l'utilisateur
 */
export async function getUserCheckInHistory(
  limit: number = 20,
  offset: number = 0
): Promise<{
  success: boolean
  data?: EventCheckIn[]
  total?: number
  error?: string
}> {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return { success: false, error: "Non authentifié" }
    }

    const { data, error, count } = await supabase
      .from("event_check_ins")
      .select("*, events:event_id(name, date, venue)", { count: "exact" })
      .eq("user_id", user.id)
      .order("check_in_time", { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) throw error

    return { success: true, data, total: count || 0 }
  } catch (error) {
    console.error("Error fetching check-in history:", error)
    return { success: false, error: "Erreur lors de la récupération de l'historique" }
  }
}

/**
 * Récupère les défis complétés par l'utilisateur
 */
export async function getCompletedEventChallenges(
  limit: number = 20,
  offset: number = 0
): Promise<{
  success: boolean
  data?: UserEventProgress[]
  total?: number
  error?: string
}> {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return { success: false, error: "Non authentifié" }
    }

    const { data, error, count } = await supabase
      .from("user_event_challenge_progress")
      .select(
        `
        *,
        event_challenge:event_challenge_id(
          *,
          challenge_type:challenge_type_id(*)
        )
      `,
        { count: "exact" }
      )
      .eq("user_id", user.id)
      .eq("status", "completed")
      .order("completed_at", { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) throw error

    return { success: true, data, total: count || 0 }
  } catch (error) {
    console.error("Error fetching completed challenges:", error)
    return { success: false, error: "Erreur lors de la récupération des défis" }
  }
}

/* ==========================================================================
   LEADERBOARD ÉVÉNEMENT
   ========================================================================== */

/**
 * Récupère le leaderboard d'un événement
 */
export async function getEventLeaderboard(
  eventId: string,
  limit: number = 20
): Promise<{
  success: boolean
  data?: Array<{
    user_id: string
    pseudo: string
    avatar_url?: string
    total_xp: number
    challenges_completed: number
    duration_minutes: number
    rank: number
  }>
  userRank?: number
  error?: string
}> {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    // Récupérer le leaderboard
    const { data, error } = await supabase.rpc("get_event_leaderboard", {
      p_event_id: eventId,
      p_limit: limit,
    })

    if (error) throw error

    // Trouver le rang de l'utilisateur actuel
    let userRank: number | undefined
    if (user) {
      const userEntry = data?.find((entry: any) => entry.user_id === user.id)
      userRank = userEntry?.rank
    }

    return { success: true, data, userRank }
  } catch (error) {
    console.error("Error fetching event leaderboard:", error)
    return { success: false, error: "Erreur lors de la récupération du classement" }
  }
}

/* ==========================================================================
   VÉRIFICATION GÉOLOCALISATION
   ========================================================================== */

/**
 * Vérifie si l'utilisateur est dans la zone d'un défi
 */
export async function verifyLocationForChallenge(
  challengeId: string,
  location: { lat: number; lng: number }
): Promise<{
  success: boolean
  isInZone?: boolean
  distance?: number
  error?: string
}> {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return { success: false, error: "Non authentifié" }
    }

    // Récupérer le défi avec sa localisation cible
    const { data: challenge, error } = await supabase
      .from("event_challenges")
      .select("target_location, target_radius_meters")
      .eq("id", challengeId)
      .single()

    if (error) throw error

    if (!challenge.target_location || !challenge.target_radius_meters) {
      return { success: true, isInZone: true, distance: 0 }
    }

    // Calculer la distance
    const targetLat = challenge.target_location.coordinates[1]
    const targetLng = challenge.target_location.coordinates[0]

    const R = 6371000 // Rayon de la Terre en mètres
    const dLat = ((targetLat - location.lat) * Math.PI) / 180
    const dLng = ((targetLng - location.lng) * Math.PI) / 180
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((location.lat * Math.PI) / 180) *
        Math.cos((targetLat * Math.PI) / 180) *
        Math.sin(dLng / 2) *
        Math.sin(dLng / 2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
    const distance = R * c

    const isInZone = distance <= challenge.target_radius_meters

    return { success: true, isInZone, distance: Math.round(distance) }
  } catch (error) {
    console.error("Error verifying location:", error)
    return { success: false, error: "Erreur lors de la vérification de position" }
  }
}

/* ==========================================================================
   UPLOAD DE PREUVE
   ========================================================================== */

/**
 * Upload une preuve photo pour un défi
 */
export async function uploadChallengeProof(
  challengeId: string,
  file: File
): Promise<{
  success: boolean
  url?: string
  error?: string
}> {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return { success: false, error: "Non authentifié" }
    }

    // Générer un nom de fichier unique
    const fileExt = file.name.split(".").pop()
    const fileName = `${user.id}/${challengeId}/${Date.now()}.${fileExt}`

    // Upload vers Supabase Storage
    const { data, error } = await supabase.storage
      .from("challenge-proofs")
      .upload(fileName, file)

    if (error) throw error

    // Obtenir l'URL publique
    const {
      data: { publicUrl },
    } = supabase.storage.from("challenge-proofs").getPublicUrl(fileName)

    return { success: true, url: publicUrl }
  } catch (error) {
    console.error("Error uploading proof:", error)
    return { success: false, error: "Erreur lors de l'upload" }
  }
}
