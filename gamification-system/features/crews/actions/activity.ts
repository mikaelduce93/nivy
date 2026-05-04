"use server"

import { createClient } from "@/lib/supabase/server"
import {
  type Crew,
  type CrewMember,
  type CrewInvitation,
  type CrewJoinRequest,
  type CrewActivity,
  type CrewLeaderboardEntry,
} from "../schema"

/**
 * Récupère le classement des crews
 */
export async function getCrewLeaderboard(
  period: "all_time" | "weekly" | "monthly" = "all_time",
  limit: number = 50
): Promise<{
  data: CrewLeaderboardEntry[]
  error: string | null
}> {
  try {
    const supabase = await createClient()

    const { data, error } = await supabase.rpc("get_crew_leaderboard", {
      p_period: period,
      p_limit: limit,
    })

    if (error) {
      console.error("Error fetching crew leaderboard:", error)
      return { data: [], error: error.message }
    }

    return { data: data as CrewLeaderboardEntry[], error: null }
  } catch (error) {
    console.error("Error in getCrewLeaderboard:", error)
    return { data: [], error: "Erreur serveur" }
  }
}

/**
 * Récupère l'activité récente du crew
 */
export async function getCrewActivity(
  crewId: string,
  limit: number = 20
): Promise<{
  data: CrewActivity[]
  error: string | null
}> {
  try {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from("crew_activity_log")
      .select(`
        *,
        profiles:user_id (pseudo, avatar_url)
      `)
      .eq("crew_id", crewId)
      .order("created_at", { ascending: false })
      .limit(limit)

    if (error) {
      console.error("Error fetching crew activity:", error)
      return { data: [], error: error.message }
    }

    const activities = (data || []).map((a: any) => ({
      id: a.id,
      crew_id: a.crew_id,
      user_id: a.user_id,
      user_pseudo: a.profiles?.pseudo || null,
      user_avatar_url: a.profiles?.avatar_url || null,
      activity_type: a.activity_type,
      description: a.description,
      xp_amount: a.xp_amount,
      created_at: a.created_at,
    }))

    return { data: activities, error: null }
  } catch (error) {
    console.error("Error in getCrewActivity:", error)
    return { data: [], error: "Erreur serveur" }
  }
}

/**
 * Récupère les invitations en attente de l'utilisateur
 */
export async function getPendingCrewInvitations(): Promise<{
  data: CrewInvitation[]
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
      .from("crew_invitations")
      .select(`
        *,
        crews:crew_id (name, avatar_url, color),
        inviter:inviter_id (pseudo, avatar_url)
      `)
      .eq("invitee_id", user.id)
      .eq("status", "pending")
      .gt("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false })

    if (error) {
      console.error("Error fetching invitations:", error)
      return { data: [], error: error.message }
    }

    const invitations = (data || []).map((i: any) => ({
      id: i.id,
      crew_id: i.crew_id,
      crew_name: i.crews?.name,
      crew_avatar_url: i.crews?.avatar_url,
      crew_color: i.crews?.color,
      inviter_id: i.inviter_id,
      inviter_pseudo: i.inviter?.pseudo,
      inviter_avatar_url: i.inviter?.avatar_url,
      message: i.message,
      status: i.status,
      created_at: i.created_at,
      expires_at: i.expires_at,
    }))

    return { data: invitations, error: null }
  } catch (error) {
    console.error("Error in getPendingCrewInvitations:", error)
    return { data: [], error: "Erreur serveur" }
  }
}

/**
 * Récupère les demandes d'adhésion en attente (pour admins)
 */
export async function getPendingJoinRequests(crewId: string): Promise<{
  data: CrewJoinRequest[]
  error: string | null
}> {
  try {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from("crew_join_requests")
      .select(`
        *,
        profiles:user_id (pseudo, avatar_url, level)
      `)
      .eq("crew_id", crewId)
      .eq("status", "pending")
      .order("created_at", { ascending: true })

    if (error) {
      console.error("Error fetching join requests:", error)
      return { data: [], error: error.message }
    }

    const requests = (data || []).map((r: any) => ({
      id: r.id,
      user_id: r.user_id,
      pseudo: r.profiles?.pseudo,
      avatar_url: r.profiles?.avatar_url,
      level: r.profiles?.level,
      message: r.message,
      status: r.status,
      created_at: r.created_at,
    }))

    return { data: requests, error: null }
  } catch (error) {
    console.error("Error in getPendingJoinRequests:", error)
    return { data: [], error: "Erreur serveur" }
  }
}

/**
 * Recherche des crews publics
 */
export async function searchCrews(
  query: string,
  limit: number = 20
): Promise<{
  data: Crew[]
  error: string | null
}> {
  try {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from("crews")
      .select("*")
      .eq("is_public", true)
      .or(`name.ilike.%${query}%,description.ilike.%${query}%`)
      .order("total_xp", { ascending: false })
      .limit(limit)

    if (error) {
      console.error("Error searching crews:", error)
      return { data: [], error: error.message }
    }

    return { data: data as Crew[], error: null }
  } catch (error) {
    console.error("Error in searchCrews:", error)
    return { data: [], error: "Erreur serveur" }
  }
}

/**
 * Récupère les membres d'un crew
 */
export async function getCrewMembers(crewId: string): Promise<{
  data: CrewMember[]
  error: string | null
}> {
  try {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from("crew_members")
      .select(`
        *,
        profiles:user_id (pseudo, avatar_url, level)
      `)
      .eq("crew_id", crewId)
      .eq("status", "active")
      .order("xp_contributed", { ascending: false })

    if (error) {
      console.error("Error fetching crew members:", error)
      return { data: [], error: error.message }
    }

    const members = (data || []).map((m: any) => ({
      user_id: m.user_id,
      pseudo: m.profiles?.pseudo,
      avatar_url: m.profiles?.avatar_url,
      level: m.profiles?.level,
      role: m.role,
      xp_contributed: m.xp_contributed,
      joined_at: m.joined_at,
    }))

    return { data: members, error: null }
  } catch (error) {
    console.error("Error in getCrewMembers:", error)
    return { data: [], error: "Erreur serveur" }
  }
}
