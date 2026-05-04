/**
 * TEENS PARTY MOROCCO - Annual Wrapped Actions
 * =============================================
 *
 * Server actions pour le récapitulatif annuel.
 */

"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"
import { type UserWrapped } from "./schema"

/* ==========================================================================
   GET USER WRAPPED
   ========================================================================== */

/**
 * Récupère le wrapped d'un utilisateur pour une année donnée
 */
export async function getUserWrapped(
  year?: number
): Promise<UserWrapped | null> {
  try {
    const supabase = await createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return null

    const targetYear = year || new Date().getFullYear()

    const { data, error } = await supabase.rpc("get_user_wrapped", {
      p_user_id: user.id,
      p_year: targetYear,
    })

    if (error) throw error

    return data
  } catch (error) {
    console.error("Erreur getUserWrapped:", error)
    return null
  }
}

/* ==========================================================================
   GENERATE WRAPPED
   ========================================================================== */

/**
 * Génère le wrapped pour l'utilisateur connecté
 */
export async function generateWrapped(
  year?: number
): Promise<{ success: boolean; wrappedId?: string; error?: string }> {
  try {
    const supabase = await createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      return { success: false, error: "Non authentifié" }
    }

    const targetYear = year || new Date().getFullYear()

    const { data, error } = await supabase.rpc("generate_user_wrapped", {
      p_user_id: user.id,
      p_year: targetYear,
    })

    if (error) throw error

    revalidatePath("/wrapped")

    return { success: true, wrappedId: data }
  } catch (error) {
    console.error("Erreur generateWrapped:", error)
    return { success: false, error: "Erreur lors de la génération" }
  }
}

/* ==========================================================================
   CHECK WRAPPED AVAILABILITY
   ========================================================================== */

/**
 * Vérifie si le wrapped est disponible pour l'utilisateur
 */
export async function checkWrappedAvailability(
  year?: number
): Promise<{
  available: boolean
  status: string | null
  hasData: boolean
}> {
  try {
    const supabase = await createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      return { available: false, status: null, hasData: false }
    }

    const targetYear = year || new Date().getFullYear()

    // Vérifier si l'utilisateur a des données pour cette année
    const { count: activityCount, error: activityError } = await supabase
      .from("user_daily_activity")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id)
      .gte("activity_date", `${targetYear}-01-01`)
      .lte("activity_date", `${targetYear}-12-31`)

    if (activityError) throw activityError

    const hasData = (activityCount || 0) >= 7 // Au moins 7 jours d'activité

    // Vérifier si un wrapped existe déjà
    const { data: wrapped, error: wrappedError } = await supabase
      .from("user_annual_wrapped")
      .select("status")
      .eq("user_id", user.id)
      .eq("year", targetYear)
      .single()

    if (wrappedError && wrappedError.code !== "PGRST116") throw wrappedError

    return {
      available: hasData,
      status: wrapped?.status || null,
      hasData,
    }
  } catch (error) {
    console.error("Erreur checkWrappedAvailability:", error)
    return { available: false, status: null, hasData: false }
  }
}

/* ==========================================================================
   GET PUBLIC WRAPPED
   ========================================================================== */

/**
 * Récupère un wrapped public via son token de partage
 */
export async function getPublicWrapped(
  shareToken: string
): Promise<UserWrapped | null> {
  try {
    const supabase = await createClient()

    const { data, error } = await supabase.rpc("get_public_wrapped", {
      p_share_token: shareToken,
    })

    if (error) throw error

    return data
  } catch (error) {
    console.error("Erreur getPublicWrapped:", error)
    return null
  }
}

/* ==========================================================================
   TOGGLE WRAPPED VISIBILITY
   ========================================================================== */

/**
 * Change la visibilité publique du wrapped
 */
export async function toggleWrappedVisibility(
  year: number,
  isPublic: boolean
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      return { success: false, error: "Non authentifié" }
    }

    const { error } = await supabase
      .from("user_annual_wrapped")
      .update({ is_public: isPublic, updated_at: new Date().toISOString() })
      .eq("user_id", user.id)
      .eq("year", year)

    if (error) throw error

    revalidatePath("/wrapped")

    return { success: true }
  } catch (error) {
    console.error("Erreur toggleWrappedVisibility:", error)
    return { success: false, error: "Erreur lors de la mise à jour" }
  }
}

/* ==========================================================================
   GET SHARE URL
   ========================================================================== */

/**
 * Récupère l'URL de partage du wrapped
 */
export async function getWrappedShareUrl(
  year: number
): Promise<{ success: boolean; url?: string; error?: string }> {
  try {
    const supabase = await createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      return { success: false, error: "Non authentifié" }
    }

    const { data, error } = await supabase
      .from("user_annual_wrapped")
      .select("share_token, is_public")
      .eq("user_id", user.id)
      .eq("year", year)
      .single()

    if (error) throw error

    if (!data.share_token) {
      return { success: false, error: "Token de partage non disponible" }
    }

    // S'assurer que le wrapped est public
    if (!data.is_public) {
      await toggleWrappedVisibility(year, true)
    }

    // Construire l'URL de partage
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://teensparty.ma"
    const shareUrl = `${baseUrl}/wrapped/share/${data.share_token}`

    return { success: true, url: shareUrl }
  } catch (error) {
    console.error("Erreur getWrappedShareUrl:", error)
    return { success: false, error: "Erreur lors de la récupération" }
  }
}

/* ==========================================================================
   GET AVAILABLE YEARS
   ========================================================================== */

/**
 * Récupère les années pour lesquelles un wrapped est disponible
 */
export async function getAvailableWrappedYears(): Promise<number[]> {
  try {
    const supabase = await createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return []

    // Récupérer les années avec des wrapped générés
    const { data: wrappedYears, error: wrappedError } = await supabase
      .from("user_annual_wrapped")
      .select("year")
      .eq("user_id", user.id)
      .eq("status", "ready")
      .order("year", { ascending: false })

    if (wrappedError) throw wrappedError

    // Récupérer les années avec de l'activité (pour suggestions)
    const { data: activityYears, error: activityError } = await supabase
      .from("user_daily_activity")
      .select("activity_date")
      .eq("user_id", user.id)

    if (activityError) throw activityError

    // Extraire les années uniques de l'activité
    const yearsFromActivity = new Set(
      (activityYears || []).map((a) =>
        new Date(a.activity_date).getFullYear()
      )
    )

    // Combiner et trier
    const allYears = new Set([
      ...(wrappedYears || []).map((w) => w.year),
      ...yearsFromActivity,
    ])

    return Array.from(allYears).sort((a, b) => b - a)
  } catch (error) {
    console.error("Erreur getAvailableWrappedYears:", error)
    return []
  }
}

/* ==========================================================================
   INCREMENT SHARE COUNT
   ========================================================================== */

/**
 * Incrémente le compteur de partages
 */
export async function incrementShareCount(
  year: number
): Promise<{ success: boolean }> {
  try {
    const supabase = await createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      return { success: false }
    }

    const { error } = await supabase.rpc("increment", {
      table_name: "user_annual_wrapped",
      row_id: undefined, // Sera géré par la requête
      column_name: "share_count",
    })

    // Alternative si RPC non disponible
    if (error) {
      await supabase
        .from("user_annual_wrapped")
        .update({
          share_count: supabase.rpc("increment_share", {}),
        })
        .eq("user_id", user.id)
        .eq("year", year)
    }

    return { success: true }
  } catch (error) {
    console.error("Erreur incrementShareCount:", error)
    return { success: false }
  }
}

/* ==========================================================================
   GET WRAPPED STATS
   ========================================================================== */

/**
 * Récupère des stats globales sur les wrapped (pour affichage admin)
 */
export async function getWrappedGlobalStats(
  year: number
): Promise<{
  totalGenerated: number
  totalViewed: number
  totalShared: number
  averageXp: number
} | null> {
  try {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from("user_annual_wrapped")
      .select("status, share_count, wrapped_data")
      .eq("year", year)

    if (error) throw error

    const totalGenerated = data?.length || 0
    const totalViewed = data?.filter((w) => w.status === "viewed").length || 0
    const totalShared = data?.reduce((sum, w) => sum + (w.share_count || 0), 0) || 0

    const xpValues = data
      ?.map((w) => w.wrapped_data?.summary?.total_xp)
      .filter((xp): xp is number => typeof xp === "number")

    const averageXp =
      xpValues && xpValues.length > 0
        ? Math.round(xpValues.reduce((a, b) => a + b, 0) / xpValues.length)
        : 0

    return {
      totalGenerated,
      totalViewed,
      totalShared,
      averageXp,
    }
  } catch (error) {
    console.error("Erreur getWrappedGlobalStats:", error)
    return null
  }
}
