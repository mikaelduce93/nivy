/**
 * TEENS PARTY MOROCCO - Fortune Wheel Server Actions
 * ===================================================
 *
 * Server actions pour la Roue de la Fortune.
 */

"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"
import {
  type WheelSegment,
  type SpinResult,
  type CanSpin,
  type WheelStats,
  type SpinHistoryEntry,
  type SpinType,
} from "./schema"

/* ==========================================================================
   GET SEGMENTS
   ========================================================================== */

/**
 * Récupère tous les segments de la roue
 */
export async function getWheelSegments(): Promise<{
  data: WheelSegment[]
  error: string | null
}> {
  try {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from("wheel_segments")
      .select("*")
      .eq("is_active", true)
      .order("segment_index")

    if (error) {
      console.error("Error fetching segments:", error)
      return { data: [], error: error.message }
    }

    return { data: data as WheelSegment[], error: null }
  } catch (error) {
    console.error("Error in getWheelSegments:", error)
    return { data: [], error: "Erreur serveur" }
  }
}

/* ==========================================================================
   CAN SPIN
   ========================================================================== */

/**
 * Vérifie si l'utilisateur peut tourner la roue
 */
export async function canSpinWheel(): Promise<{
  data: CanSpin | null
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

    const { data, error } = await supabase.rpc("can_spin_wheel", {
      p_user_id: user.id,
    })

    if (error) {
      console.error("Error checking spin availability:", error)
      return { data: null, error: error.message }
    }

    return { data: data as CanSpin, error: null }
  } catch (error) {
    console.error("Error in canSpinWheel:", error)
    return { data: null, error: "Erreur serveur" }
  }
}

/* ==========================================================================
   SPIN WHEEL
   ========================================================================== */

/**
 * Tourne la roue et renvoie le résultat
 */
export async function spinWheel(
  spinType: SpinType = "daily"
): Promise<{
  data: SpinResult | null
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

    const { data, error } = await supabase.rpc("spin_wheel", {
      p_user_id: user.id,
      p_spin_type: spinType,
    })

    if (error) {
      console.error("Error spinning wheel:", error)
      return { data: null, error: error.message }
    }

    if (!data?.success) {
      return { data: data as SpinResult, error: data?.error || "Erreur lors du spin" }
    }

    // Revalidate pages
    revalidatePath("/wheel")
    revalidatePath("/dashboard")
    revalidatePath("/profile")

    return { data: data as SpinResult, error: null }
  } catch (error) {
    console.error("Error in spinWheel:", error)
    return { data: null, error: "Erreur serveur" }
  }
}

/**
 * Tourne avec un spin bonus
 */
export async function spinWheelBonus(): Promise<{
  data: SpinResult | null
  error: string | null
}> {
  return spinWheel("bonus")
}

/* ==========================================================================
   WHEEL STATS
   ========================================================================== */

/**
 * Récupère les statistiques de la roue pour l'utilisateur
 */
export async function getWheelStats(): Promise<{
  data: WheelStats | null
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

    const { data, error } = await supabase.rpc("get_wheel_stats", {
      p_user_id: user.id,
    })

    if (error) {
      console.error("Error fetching wheel stats:", error)
      return { data: null, error: error.message }
    }

    return { data: data as WheelStats, error: null }
  } catch (error) {
    console.error("Error in getWheelStats:", error)
    return { data: null, error: "Erreur serveur" }
  }
}

/* ==========================================================================
   SPIN HISTORY
   ========================================================================== */

/**
 * Récupère l'historique des spins
 */
export async function getSpinHistory(
  limit: number = 20
): Promise<{
  data: SpinHistoryEntry[]
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

    const { data, error } = await supabase.rpc("get_wheel_history", {
      p_user_id: user.id,
      p_limit: limit,
    })

    if (error) {
      console.error("Error fetching spin history:", error)
      return { data: [], error: error.message }
    }

    return { data: data as SpinHistoryEntry[], error: null }
  } catch (error) {
    console.error("Error in getSpinHistory:", error)
    return { data: [], error: "Erreur serveur" }
  }
}

/* ==========================================================================
   JACKPOT INFO
   ========================================================================== */

/**
 * Récupère les informations sur le jackpot actuel
 */
export async function getCurrentJackpot(): Promise<{
  data: { amount: number; minPool: number; isWinnable: boolean } | null
  error: string | null
}> {
  try {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from("wheel_jackpots")
      .select("current_pool, min_pool")
      .eq("is_active", true)
      .is("winner_id", null)
      .single()

    if (error) {
      console.error("Error fetching jackpot:", error)
      return { data: null, error: error.message }
    }

    return {
      data: {
        amount: data.current_pool,
        minPool: data.min_pool,
        isWinnable: data.current_pool >= data.min_pool,
      },
      error: null,
    }
  } catch (error) {
    console.error("Error in getCurrentJackpot:", error)
    return { data: null, error: "Erreur serveur" }
  }
}

/* ==========================================================================
   WHEEL SUMMARY
   ========================================================================== */

/**
 * Récupère un résumé complet de la roue (pour dashboard)
 */
export async function getWheelSummary(): Promise<{
  data: {
    canSpinDaily: boolean
    bonusSpins: number
    currentStreak: number
    streakMultiplier: number
    currentJackpot: number
    nextSpinIn: string | null
  } | null
  error: string | null
}> {
  try {
    const [canSpinResult, jackpotResult] = await Promise.all([
      canSpinWheel(),
      getCurrentJackpot(),
    ])

    if (canSpinResult.error || !canSpinResult.data) {
      return { data: null, error: canSpinResult.error || "Erreur" }
    }

    const canSpin = canSpinResult.data
    const jackpot = jackpotResult.data

    // Calculer le temps restant
    let nextSpinIn: string | null = null
    if (!canSpin.can_spin_daily && canSpin.next_spin_at) {
      const now = new Date()
      const next = new Date(canSpin.next_spin_at)
      const diff = next.getTime() - now.getTime()

      if (diff > 0) {
        const hours = Math.floor(diff / (1000 * 60 * 60))
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
        nextSpinIn = hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`
      }
    }

    return {
      data: {
        canSpinDaily: canSpin.can_spin_daily,
        bonusSpins: canSpin.bonus_spins,
        currentStreak: canSpin.current_streak,
        streakMultiplier: canSpin.streak_multiplier,
        currentJackpot: jackpot?.amount || 0,
        nextSpinIn,
      },
      error: null,
    }
  } catch (error) {
    console.error("Error in getWheelSummary:", error)
    return { data: null, error: "Erreur serveur" }
  }
}
