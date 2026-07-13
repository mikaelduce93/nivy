/**
 * TEENS PARTY MOROCCO - Event Challenges Actions
 * ===============================================
 *
 * Server actions pour les défis événementiels.
 */

"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"
import { logDbError } from "@/lib/observability/log-db-error"
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

    // La table live diverge du type domaine (pas de base_xp / requires_* / auto_complete…) : cast de frontière.
    return { success: true, data: data as unknown as EventChallengeType[] }
  } catch (error) {
    logDbError("event-challenges.getEventChallengeTypes", error)
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
        p_teen_id: user.id,
      }
    )

    if (challengesError) throw challengesError

    // Récupérer le check-in actuel (colonnes live : teen_id / checked_in_at)
    const { data: checkIn } = await supabase
      .from("event_check_ins")
      .select("*")
      .eq("event_id", eventId)
      .eq("teen_id", user.id)
      .order("checked_in_at", { ascending: false })
      .limit(1)
      .single()

    const checkInTyped =
      (checkIn as unknown as EventCheckIn | null) ?? undefined

    // Enrichir les données
    const enrichedChallenges: EventChallengeWithProgress[] = (challenges || []).map(
      (challenge: any) => ({
        ...challenge,
        is_available: isChallengeAvailable(challenge, checkInTyped),
        progress_percentage: calculateProgressPercentage(
          challenge.user_progress?.current_count || 0,
          challenge.target_count
        ),
      })
    )

    return { success: true, data: enrichedChallenges, checkIn: checkInTyped }
  } catch (error) {
    logDbError("event-challenges.getEventChallenges", error)
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

    // Le RPC live attend teen_id + latitude/longitude (plus de paramètre POINT).
    const { data, error } = await supabase.rpc("check_in_to_event", {
      p_teen_id: user.id,
      p_event_id: eventId,
      p_latitude: location?.lat,
      p_longitude: location?.lng,
    })

    if (error) throw error

    revalidatePath(`/events/${eventId}`)
    revalidatePath("/events")

    // Le RPC renvoie du Json : cast de frontière vers la forme attendue.
    const result = (data ?? {}) as {
      check_in?: EventCheckIn
      xp_earned?: number
      challenges_unlocked?: string[]
    }

    return {
      success: true,
      data: result.check_in,
      xpEarned: result.xp_earned,
      challengesUnlocked: result.challenges_unlocked,
    }
  } catch (error) {
    logDbError("event-challenges.checkInToEvent", error)
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
      p_teen_id: user.id,
      p_event_id: eventId,
    })

    if (error) throw error

    revalidatePath(`/events/${eventId}`)
    revalidatePath("/events")

    // Le RPC renvoie du Json : cast de frontière.
    const result = (data ?? {}) as {
      check_in?: EventCheckIn
      duration_minutes?: number
      bonus_xp?: number
    }

    return {
      success: true,
      data: result.check_in,
      duration: result.duration_minutes,
      bonusXp: result.bonus_xp,
    }
  } catch (error) {
    logDbError("event-challenges.checkOutFromEvent", error)
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

    // Pas de colonne "status" en live : un check-in est actif tant que checked_out_at est nul.
    const { data, error } = await supabase
      .from("event_check_ins")
      .select("*")
      .eq("event_id", eventId)
      .eq("teen_id", user.id)
      .is("checked_out_at", null)
      .single()

    if (error && error.code !== "PGRST116") throw error

    return { success: true, data: (data as unknown as EventCheckIn) ?? null }
  } catch (error) {
    logDbError("event-challenges.getActiveCheckIn", error)
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

    // Le RPC live attend teen_id + event_id + le slug du type de défi.
    const { data: challengeRow, error: challengeError } = await supabase
      .from("event_challenges")
      .select("event_id, challenge_type_id")
      .eq("id", challengeId)
      .single()

    if (challengeError) throw challengeError
    if (!challengeRow) {
      return { success: false, error: "Défi non trouvé" }
    }

    const { data: typeRow, error: typeError } = await supabase
      .from("event_challenge_types")
      .select("slug")
      .eq("id", challengeRow.challenge_type_id)
      .single()

    if (typeError) throw typeError

    const { data: completed, error } = await supabase.rpc(
      "complete_event_challenge",
      {
        p_teen_id: user.id,
        p_event_id: challengeRow.event_id,
        p_challenge_slug: typeRow.slug,
      }
    )

    if (error) throw error

    // Revalidate paths
    if (challengeRow.event_id) {
      revalidatePath(`/events/${challengeRow.event_id}`)
    }
    revalidatePath("/events")
    revalidatePath("/profile")

    // proofUrl : le RPC live ne prend plus de preuve en paramètre (voir uploadChallengeProof).
    void proofUrl

    return { success: completed === true }
  } catch (error) {
    logDbError("event-challenges.completeEventChallenge", error)
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

    // Récupérer ou créer la progression (colonne live : teen_id)
    const { data: existing } = await supabase
      .from("user_event_challenge_progress")
      .select("*, event_challenges(*)")
      .eq("event_challenge_id", challengeId)
      .eq("teen_id", user.id)
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
          teen_id: user.id,
          event_challenge_id: challengeId,
          status: "in_progress",
          progress_value: incrementBy,
        })
        .select()
        .single()

      if (createError) throw createError

      return {
        success: true,
        data: newProgress as unknown as UserEventProgress,
        completed: false,
      }
    }

    // Mettre à jour la progression existante (colonne live : progress_value)
    const newCount = (existing.progress_value ?? 0) + incrementBy
    // event_challenges n'a plus de "target_count" en live : le seuil vient du type (condition_value).
    const { data: typeRow } = await supabase
      .from("event_challenge_types")
      .select("condition_value")
      .eq("id", existing.event_challenges.challenge_type_id)
      .single()
    const target = typeRow?.condition_value ?? 1
    const isComplete = newCount >= target

    if (isComplete && existing.status !== "completed") {
      // Compléter le défi
      const result = await completeEventChallenge(challengeId)
      return { success: result.success, completed: true, error: result.error }
    }

    // Juste mettre à jour le compteur
    const { data: updated, error: updateError } = await supabase
      .from("user_event_challenge_progress")
      .update({
        progress_value: newCount,
        status: "in_progress",
      })
      .eq("id", existing.id)
      .select()
      .single()

    if (updateError) throw updateError

    return {
      success: true,
      data: updated as unknown as UserEventProgress,
      completed: false,
    }
  } catch (error) {
    logDbError("event-challenges.updateChallengeProgress", error)
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

    // Signature live : teen_id, overall_rating, comment, ambiance/music/staff_rating.
    // (wouldRecommend n'existe plus côté RPC → non transmis.)
    const { data, error } = await supabase.rpc("submit_event_review", {
      p_teen_id: user.id,
      p_event_id: eventId,
      p_overall_rating: review.rating,
      p_comment: review.reviewText ?? undefined,
      p_ambiance_rating: review.atmosphereRating ?? undefined,
      p_music_rating: review.musicRating ?? undefined,
      p_staff_rating: review.serviceRating ?? undefined,
    })

    if (error) throw error

    revalidatePath(`/events/${eventId}`)
    revalidatePath("/events")

    // Le RPC renvoie du Json : cast de frontière.
    const result = (data ?? {}) as { review?: EventReview; xp_earned?: number }

    return {
      success: true,
      data: result.review,
      xpEarned: result.xp_earned,
    }
  } catch (error) {
    logDbError("event-challenges.submitEventReview", error)
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
      .eq("teen_id", user.id)
      .single()

    if (error && error.code !== "PGRST116") throw error

    // La table live diverge du type domaine (overall_rating/comment/…) : cast de frontière.
    return { success: true, data: (data as unknown as EventReview) ?? null }
  } catch (error) {
    logDbError("event-challenges.getUserEventReview", error)
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
      p_teen_id: user.id,
    })

    if (error) throw error

    // Le RPC renvoie du Json : cast de frontière vers le type domaine.
    return {
      success: true,
      data: (data ?? undefined) as unknown as UserEventStats,
    }
  } catch (error) {
    logDbError("event-challenges.getUserEventStats", error)
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

    // Colonnes live : teen_id / checked_in_at ; l'événement expose title/event_date/venue_id.
    const { data, error, count } = await supabase
      .from("event_check_ins")
      .select("*, events:event_id(title, event_date, venue_id)", {
        count: "exact",
      })
      .eq("teen_id", user.id)
      .order("checked_in_at", { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) throw error

    return {
      success: true,
      data: data as unknown as EventCheckIn[],
      total: count || 0,
    }
  } catch (error) {
    logDbError("event-challenges.getUserCheckInHistory", error)
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
      .eq("teen_id", user.id)
      .eq("status", "completed")
      .order("completed_at", { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) throw error

    // La table live diverge du type domaine (progress_value/xp_awarded/teen_id) : cast de frontière.
    return {
      success: true,
      data: data as unknown as UserEventProgress[],
      total: count || 0,
    }
  } catch (error) {
    logDbError("event-challenges.getCompletedEventChallenges", error)
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
  // Le RPC get_event_leaderboard n'existe pas dans le schéma live : le classement
  // par événement est indisponible tant que la fonction n'est pas recréée côté DB.
  void eventId
  void limit
  await Promise.resolve()
  return { success: true, data: [], userRank: undefined }
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

    // event_challenges n'a pas de colonnes de géolocalisation (target_location /
    // target_radius_meters) dans le schéma live : aucune contrainte de zone n'est appliquée.
    void challengeId
    void location

    return { success: true, isInZone: true, distance: 0 }
  } catch (error) {
    logDbError("event-challenges.verifyLocationForChallenge", error)
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
    logDbError("event-challenges.uploadChallengeProof", error)
    return { success: false, error: "Erreur lors de l'upload" }
  }
}
