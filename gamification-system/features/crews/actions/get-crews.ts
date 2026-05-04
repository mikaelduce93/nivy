"use server"

import { createClient } from "@/lib/supabase/server"
import { type Crew, type UserCrewData } from "../schema"

/**
 * Récupère le crew de l'utilisateur connecté
 */
export async function getUserCrew(): Promise<{
  data: UserCrewData | null
  error: string | null
}> {
  try {
    const supabase = await createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return { data: null, error: "Non authentifié" }
    }

    const { data, error } = await supabase.rpc("get_user_crew", {
      p_user_id: user.id,
    })

    if (error) {
      console.error("Error fetching user crew:", error)
      return { data: null, error: error.message }
    }

    return { data: data as UserCrewData, error: null }
  } catch (error) {
    console.error("Error in getUserCrew:", error)
    return { data: null, error: "Erreur serveur" }
  }
}

/**
 * Récupère un crew par son slug
 */
export async function getCrewBySlug(slug: string): Promise<{
  data: Crew | null
  error: string | null
}> {
  try {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from("crews")
      .select("*")
      .eq("slug", slug)
      .single()

    if (error) {
      if (error.code === "PGRST116") {
        return { data: null, error: "Crew introuvable" }
      }
      console.error("Error fetching crew:", error)
      return { data: null, error: error.message }
    }

    return { data: data as Crew, error: null }
  } catch (error) {
    console.error("Error in getCrewBySlug:", error)
    return { data: null, error: "Erreur serveur" }
  }
}
