"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"

/**
 * Invite un utilisateur à rejoindre le crew
 */
export async function inviteToCrew(
  crewId: string,
  inviteeId: string,
  message?: string
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

    const { data, error } = await supabase.rpc("invite_to_crew", {
      p_crew_id: crewId,
      p_inviter_id: user.id,
      p_invitee_id: inviteeId,
      p_message: message || null,
    })

    if (error) {
      console.error("Error inviting to crew:", error)
      return { success: false, error: error.message }
    }

    if (!data?.success) {
      return { success: false, error: data?.error || "Erreur d'invitation" }
    }

    return { success: true, error: null }
  } catch (error) {
    console.error("Error in inviteToCrew:", error)
    return { success: false, error: "Erreur serveur" }
  }
}

/**
 * Répond à une invitation de crew
 */
export async function respondToCrewInvitation(
  invitationId: string,
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

    const { data, error } = await supabase.rpc("respond_to_crew_invitation", {
      p_invitation_id: invitationId,
      p_user_id: user.id,
      p_accept: accept,
    })

    if (error) {
      console.error("Error responding to invitation:", error)
      return { success: false, error: error.message }
    }

    if (!data?.success) {
      return { success: false, error: data?.error || "Erreur de réponse" }
    }

    revalidatePath("/crew")

    return { success: true, error: null }
  } catch (error) {
    console.error("Error in respondToCrewInvitation:", error)
    return { success: false, error: "Erreur serveur" }
  }
}

/**
 * Demande à rejoindre un crew
 */
export async function requestToJoinCrew(
  crewId: string,
  message?: string
): Promise<{
  success: boolean
  joined?: boolean
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

    const { data, error } = await supabase.rpc("request_to_join_crew", {
      p_crew_id: crewId,
      p_user_id: user.id,
      p_message: message || null,
    })

    if (error) {
      console.error("Error requesting to join:", error)
      return { success: false, error: error.message }
    }

    if (!data?.success) {
      return { success: false, error: data?.error || "Erreur de demande" }
    }

    revalidatePath("/crew")

    return { success: true, joined: data.joined, error: null }
  } catch (error) {
    console.error("Error in requestToJoinCrew:", error)
    return { success: false, error: "Erreur serveur" }
  }
}

/**
 * Rejoint un crew.
 */
export async function joinCrew(
  crewId: string
): Promise<{
  success: boolean
  joined?: boolean
  error: string | null
}> {
  return requestToJoinCrew(crewId)
}

/**
 * Traite une demande d'adhésion
 */
export async function handleJoinRequest(
  requestId: string,
  approve: boolean,
  rejectionReason?: string
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

    const { data, error } = await supabase.rpc("handle_join_request", {
      p_request_id: requestId,
      p_reviewer_id: user.id,
      p_approve: approve,
      p_rejection_reason: rejectionReason || null,
    })

    if (error) {
      console.error("Error handling join request:", error)
      return { success: false, error: error.message }
    }

    if (!data?.success) {
      return { success: false, error: data?.error || "Erreur de traitement" }
    }

    revalidatePath("/crew")

    return { success: true, error: null }
  } catch (error) {
    console.error("Error in handleJoinRequest:", error)
    return { success: false, error: "Erreur serveur" }
  }
}
