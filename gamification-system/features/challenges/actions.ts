/**
 * TEENS PARTY MOROCCO - Friend Challenges Server Actions
 * =======================================================
 *
 * Server actions pour les défis entre amis.
 */

"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"
import {
  type ChallengeType,
  type FriendChallenge,
  type CreateChallengeInput,
  type ChallengeStatus,
} from "./schema"

/* ==========================================================================
   GET CHALLENGE TYPES
   ========================================================================== */

/**
 * Récupère tous les types de défis disponibles
 */
export async function getChallengeTypes(): Promise<{
  data: ChallengeType[]
  error: string | null
}> {
  try {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from("challenge_types")
      .select("*")
      .eq("is_active", true)
      .order("mode")

    if (error) {
      console.error("Error fetching challenge types:", error)
      return { data: [], error: error.message }
    }

    return { data: data as ChallengeType[], error: null }
  } catch (error) {
    console.error("Error in getChallengeTypes:", error)
    return { data: [], error: "Erreur serveur" }
  }
}

/* ==========================================================================
   GET USER CHALLENGES
   ========================================================================== */

/**
 * Récupère les défis de l'utilisateur
 */
export async function getUserChallenges(
  status?: ChallengeStatus
): Promise<{
  data: FriendChallenge[]
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

    const { data, error } = await supabase.rpc("get_user_challenges", {
      p_user_id: user.id,
      p_status: status || null,
    })

    if (error) {
      console.error("Error fetching challenges:", error)
      return { data: [], error: error.message }
    }

    return { data: data as FriendChallenge[], error: null }
  } catch (error) {
    console.error("Error in getUserChallenges:", error)
    return { data: [], error: "Erreur serveur" }
  }
}

/**
 * Récupère les défis actifs
 */
export async function getActiveChallenges(): Promise<{
  data: FriendChallenge[]
  error: string | null
}> {
  return getUserChallenges("active")
}

/**
 * Récupère les invitations en attente
 */
export async function getPendingChallenges(): Promise<{
  data: FriendChallenge[]
  error: string | null
}> {
  return getUserChallenges("pending")
}

/* ==========================================================================
   CREATE CHALLENGE
   ========================================================================== */

/**
 * Crée un nouveau défi entre amis
 */
export async function createChallenge(
  input: CreateChallengeInput
): Promise<{
  success: boolean
  challengeId?: string
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

    const { data, error } = await supabase.rpc("create_friend_challenge", {
      p_creator_id: user.id,
      p_challenge_type_slug: input.challengeTypeSlug,
      p_invited_user_ids: input.invitedUserIds,
      p_name: input.name || null,
      p_target_value: input.targetValue || null,
      p_duration_hours: input.durationHours || null,
      p_stake_xp: input.stakeXp || 0,
    })

    if (error) {
      console.error("Error creating challenge:", error)
      return { success: false, error: error.message }
    }

    if (!data?.success) {
      return { success: false, error: data?.error || "Erreur de création" }
    }

    revalidatePath("/challenges")

    return {
      success: true,
      challengeId: data.challenge_id,
      error: null,
    }
  } catch (error) {
    console.error("Error in createChallenge:", error)
    return { success: false, error: "Erreur serveur" }
  }
}

/* ==========================================================================
   RESPOND TO CHALLENGE
   ========================================================================== */

/**
 * Accepte ou refuse une invitation à un défi
 */
export async function respondToChallenge(
  challengeId: string,
  accept: boolean
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

    const { data, error } = await supabase.rpc("respond_to_challenge", {
      p_user_id: user.id,
      p_challenge_id: challengeId,
      p_accept: accept,
    })

    if (error) {
      console.error("Error responding to challenge:", error)
      return { success: false, error: error.message }
    }

    if (!data?.success) {
      return { success: false, error: data?.error || "Erreur de réponse" }
    }

    revalidatePath("/challenges")

    return { success: true, error: null }
  } catch (error) {
    console.error("Error in respondToChallenge:", error)
    return { success: false, error: "Erreur serveur" }
  }
}

/**
 * Accepte une invitation
 */
export async function acceptChallenge(
  challengeId: string
): Promise<{ success: boolean; error: string | null }> {
  return respondToChallenge(challengeId, true)
}

/**
 * Refuse une invitation
 */
export async function declineChallenge(
  challengeId: string
): Promise<{ success: boolean; error: string | null }> {
  return respondToChallenge(challengeId, false)
}

/* ==========================================================================
   UPDATE PROGRESS
   ========================================================================== */

/**
 * Met à jour la progression de l'utilisateur dans ses défis actifs
 */
export async function updateChallengeProgress(
  source: string = "manual"
): Promise<{
  updatedCount: number
  error: string | null
}> {
  try {
    const supabase = await createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return { updatedCount: 0, error: "Non authentifié" }
    }

    const { data, error } = await supabase.rpc("update_challenge_progress", {
      p_user_id: user.id,
      p_source: source,
    })

    if (error) {
      console.error("Error updating progress:", error)
      return { updatedCount: 0, error: error.message }
    }

    revalidatePath("/challenges")

    return { updatedCount: data || 0, error: null }
  } catch (error) {
    console.error("Error in updateChallengeProgress:", error)
    return { updatedCount: 0, error: "Erreur serveur" }
  }
}

/* ==========================================================================
   SEND MESSAGE
   ========================================================================== */

/**
 * Envoie un message dans le chat du défi
 */
export async function sendChallengeMessage(
  challengeId: string,
  message: string,
  messageType: "text" | "taunt" | "cheer" = "text"
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

    const { error } = await supabase.from("challenge_messages").insert({
      challenge_id: challengeId,
      user_id: user.id,
      message,
      message_type: messageType,
    })

    if (error) {
      console.error("Error sending message:", error)
      return { success: false, error: error.message }
    }

    return { success: true, error: null }
  } catch (error) {
    console.error("Error in sendChallengeMessage:", error)
    return { success: false, error: "Erreur serveur" }
  }
}

/* ==========================================================================
   GET CHALLENGE DETAILS
   ========================================================================== */

/**
 * Récupère les détails d'un défi spécifique
 */
export async function getChallengeDetails(
  challengeId: string
): Promise<{
  data: FriendChallenge | null
  error: string | null
}> {
  try {
    const { data: challenges, error } = await getUserChallenges()

    if (error) {
      return { data: null, error }
    }

    const challenge = challenges.find((c) => c.challenge_id === challengeId)
    return { data: challenge || null, error: null }
  } catch (error) {
    console.error("Error in getChallengeDetails:", error)
    return { data: null, error: "Erreur serveur" }
  }
}

/* ==========================================================================
   GET CHALLENGE MESSAGES
   ========================================================================== */

/**
 * Récupère les messages d'un défi
 */
export async function getChallengeMessages(
  challengeId: string,
  limit: number = 50
): Promise<{
  data: Array<{
    id: string
    user_id: string
    pseudo: string
    avatar_url: string | null
    message: string
    message_type: string
    created_at: string
  }>
  error: string | null
}> {
  try {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from("challenge_messages")
      .select(`
        id,
        user_id,
        message,
        message_type,
        created_at,
        profiles!inner(pseudo, avatar_url)
      `)
      .eq("challenge_id", challengeId)
      .order("created_at", { ascending: false })
      .limit(limit)

    if (error) {
      console.error("Error fetching messages:", error)
      return { data: [], error: error.message }
    }

    const messages = (data || []).map((m: any) => ({
      id: m.id,
      user_id: m.user_id,
      pseudo: m.profiles.pseudo,
      avatar_url: m.profiles.avatar_url,
      message: m.message,
      message_type: m.message_type,
      created_at: m.created_at,
    }))

    return { data: messages.reverse(), error: null }
  } catch (error) {
    console.error("Error in getChallengeMessages:", error)
    return { data: [], error: "Erreur serveur" }
  }
}

/* ==========================================================================
   CHALLENGE SUMMARY
   ========================================================================== */

/**
 * Récupère un résumé des défis (pour dashboard)
 */
export async function getChallengeSummary(): Promise<{
  data: {
    activeCount: number
    pendingCount: number
    wonCount: number
    totalParticipated: number
  } | null
  error: string | null
}> {
  try {
    const [activeResult, pendingResult, allResult] = await Promise.all([
      getUserChallenges("active"),
      getUserChallenges("pending"),
      getUserChallenges(),
    ])

    if (activeResult.error || pendingResult.error || allResult.error) {
      return { data: null, error: "Erreur de récupération" }
    }

    const completedChallenges = allResult.data.filter(
      (c) => c.status === "completed"
    )
    const wonCount = completedChallenges.filter(
      (c) =>
        c.winner_id === c.participants.find((p) => p.user_id)?.user_id ||
        (c.is_draw && c.mode === "coop")
    ).length

    return {
      data: {
        activeCount: activeResult.data.length,
        pendingCount: pendingResult.data.length,
        wonCount,
        totalParticipated: completedChallenges.length,
      },
      error: null,
    }
  } catch (error) {
    console.error("Error in getChallengeSummary:", error)
    return { data: null, error: "Erreur serveur" }
  }
}
