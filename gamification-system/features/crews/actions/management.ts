"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"
import { type CreateCrewInput, type UpdateCrewInput } from "../schema"

/**
 * Crée un nouveau crew
 */
export async function createCrew(input: CreateCrewInput): Promise<{
  success: boolean
  crewId?: string
  slug?: string
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

    const { data, error } = await supabase.rpc("create_crew", {
      p_owner_id: user.id,
      p_name: input.name,
      p_description: input.description || null,
      p_motto: input.motto || null,
      p_color: input.color || "#06b6d4",
      p_is_public: input.is_public ?? true,
      p_requires_approval: input.requires_approval ?? true,
    })

    if (error) {
      console.error("Error creating crew:", error)
      return { success: false, error: error.message }
    }

    if (!data?.success) {
      return { success: false, error: data?.error || "Erreur de création" }
    }

    revalidatePath("/crew")

    return {
      success: true,
      crewId: data.crew_id,
      slug: data.slug,
      error: null,
    }
  } catch (error) {
    console.error("Error in createCrew:", error)
    return { success: false, error: "Erreur serveur" }
  }
}

/**
 * Met à jour les informations du crew
 */
export async function updateCrew(
  crewId: string,
  input: UpdateCrewInput
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

    const { data: crew } = await supabase
      .from("crews")
      .select("owner_id")
      .eq("id", crewId)
      .single()

    if (!crew || crew.owner_id !== user.id) {
      return { success: false, error: "Permission refusée" }
    }

    const { error } = await supabase
      .from("crews")
      .update({
        ...input,
        updated_at: new Date().toISOString(),
      })
      .eq("id", crewId)

    if (error) {
      console.error("Error updating crew:", error)
      return { success: false, error: error.message }
    }

    revalidatePath("/crew")

    return { success: true, error: null }
  } catch (error) {
    console.error("Error in updateCrew:", error)
    return { success: false, error: "Erreur serveur" }
  }
}

/**
 * Quitte le crew actuel
 */
export async function leaveCrew(crewId: string): Promise<{
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

    const { data, error } = await supabase.rpc("leave_crew", {
      p_crew_id: crewId,
      p_user_id: user.id,
    })

    if (error) {
      console.error("Error leaving crew:", error)
      return { success: false, error: error.message }
    }

    if (!data?.success) {
      return { success: false, error: data?.error || "Erreur" }
    }

    revalidatePath("/crew")

    return { success: true, error: null }
  } catch (error) {
    console.error("Error in leaveCrew:", error)
    return { success: false, error: "Erreur serveur" }
  }
}

/**
 * Expulse un membre du crew
 */
export async function kickMember(
  crewId: string,
  memberId: string
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

    const { data: kickerMember } = await supabase
      .from("crew_members")
      .select("role")
      .eq("crew_id", crewId)
      .eq("user_id", user.id)
      .eq("status", "active")
      .single()

    if (!kickerMember || kickerMember.role === "member") {
      return { success: false, error: "Permission refusée" }
    }

    const { data: targetMember } = await supabase
      .from("crew_members")
      .select("role")
      .eq("crew_id", crewId)
      .eq("user_id", memberId)
      .single()

    if (targetMember?.role === "owner") {
      return { success: false, error: "Impossible d'expulser le propriétaire" }
    }

    if (kickerMember.role === "admin" && targetMember?.role === "admin") {
      return { success: false, error: "Un admin ne peut pas expulser un autre admin" }
    }

    const { error } = await supabase
      .from("crew_members")
      .delete()
      .eq("crew_id", crewId)
      .eq("user_id", memberId)

    if (error) {
      console.error("Error kicking member:", error)
      return { success: false, error: error.message }
    }

    await supabase.from("crew_activity_log").insert({
      crew_id: crewId,
      user_id: memberId,
      activity_type: "member_kicked",
      description: "A été expulsé du crew",
    })

    revalidatePath("/crew")

    return { success: true, error: null }
  } catch (error) {
    console.error("Error in kickMember:", error)
    return { success: false, error: "Erreur serveur" }
  }
}

/**
 * Promeut un membre au rang d'admin
 */
export async function promoteMember(
  crewId: string,
  memberId: string
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

    const { data: crew } = await supabase
      .from("crews")
      .select("owner_id")
      .eq("id", crewId)
      .single()

    if (!crew || crew.owner_id !== user.id) {
      return { success: false, error: "Seul le propriétaire peut promouvoir" }
    }

    const { error } = await supabase
      .from("crew_members")
      .update({ role: "admin" })
      .eq("crew_id", crewId)
      .eq("user_id", memberId)
      .eq("role", "member")

    if (error) {
      console.error("Error promoting member:", error)
      return { success: false, error: error.message }
    }

    revalidatePath("/crew")

    return { success: true, error: null }
  } catch (error) {
    console.error("Error in promoteMember:", error)
    return { success: false, error: "Erreur serveur" }
  }
}

/**
 * Rétrograde un admin au rang de membre
 */
export async function demoteMember(
  crewId: string,
  memberId: string
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

    const { data: crew } = await supabase
      .from("crews")
      .select("owner_id")
      .eq("id", crewId)
      .single()

    if (!crew || crew.owner_id !== user.id) {
      return { success: false, error: "Seul le propriétaire peut rétrograder" }
    }

    const { error } = await supabase
      .from("crew_members")
      .update({ role: "member" })
      .eq("crew_id", crewId)
      .eq("user_id", memberId)
      .eq("role", "admin")

    if (error) {
      console.error("Error demoting member:", error)
      return { success: false, error: error.message }
    }

    revalidatePath("/crew")

    return { success: true, error: null }
  } catch (error) {
    console.error("Error in demoteMember:", error)
    return { success: false, error: "Erreur serveur" }
  }
}
