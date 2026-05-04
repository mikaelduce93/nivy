/**
 * TEENS PARTY MOROCCO - VIP System Actions
 * =========================================
 *
 * Server actions pour le système VIP gamifié.
 */

"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"
import {
  type VipTier,
  type VipPerk,
  type UserVipStatus,
  type VipStatusResponse,
  type VipTierSlug,
  type VipBenefitLog,
  calculateTierFromXp,
  TIER_XP_REQUIREMENTS,
} from "./schema"

/* ==========================================================================
   GET VIP DATA
   ========================================================================== */

/**
 * Récupérer tous les tiers VIP
 */
export async function getAllVipTiers(): Promise<VipTier[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from("vip_tiers")
    .select("*")
    .eq("is_active", true)
    .order("tier_level", { ascending: true })

  if (error) {
    console.error("Error fetching VIP tiers:", error)
    return []
  }

  return data || []
}

/**
 * Récupérer un tier par son slug
 */
export async function getVipTierBySlug(slug: VipTierSlug): Promise<VipTier | null> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from("vip_tiers")
    .select("*")
    .eq("slug", slug)
    .eq("is_active", true)
    .single()

  if (error) {
    console.error("Error fetching VIP tier:", error)
    return null
  }

  return data
}

/**
 * Récupérer les perks d'un tier
 */
export async function getTierPerks(tierId: string): Promise<VipPerk[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from("vip_perks")
    .select("*")
    .eq("tier_id", tierId)
    .order("sort_order", { ascending: true })

  if (error) {
    console.error("Error fetching tier perks:", error)
    return []
  }

  return data || []
}

/**
 * Récupérer le statut VIP complet d'un utilisateur
 */
export async function getUserVipStatus(
  userId: string
): Promise<VipStatusResponse | null> {
  const supabase = await createClient()

  const { data, error } = await supabase.rpc("get_user_vip_status", {
    p_user_id: userId,
  })

  if (error) {
    console.error("Error fetching VIP status:", error)
    return null
  }

  return data as VipStatusResponse
}

/**
 * Récupérer uniquement le statut basique (pour les badges)
 */
export async function getUserVipTier(userId: string): Promise<{
  tier: VipTierSlug
  tierName: string
  tierLevel: number
  lifetimeXp: number
} | null> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from("user_vip_status")
    .select(
      `
      lifetime_xp,
      vip_tiers (
        slug,
        name,
        tier_level
      )
    `
    )
    .eq("user_id", userId)
    .single()

  if (error && error.code !== "PGRST116") {
    console.error("Error fetching user VIP tier:", error)
    return null
  }

  if (!data) {
    // Utilisateur sans status VIP - retourner Standard
    return {
      tier: "standard",
      tierName: "Standard",
      tierLevel: 0,
      lifetimeXp: 0,
    }
  }

  return {
    tier: (data.vip_tiers as any)?.slug || "standard",
    tierName: (data.vip_tiers as any)?.name || "Standard",
    tierLevel: (data.vip_tiers as any)?.tier_level || 0,
    lifetimeXp: data.lifetime_xp,
  }
}

/* ==========================================================================
   VIP PROGRESSION
   ========================================================================== */

/**
 * Ajouter de l'XP VIP (avec multiplicateur)
 */
export async function addVipXp(
  userId: string,
  xp: number,
  source: string = "system"
): Promise<{
  success: boolean
  baseXp: number
  multiplier: number
  finalXp: number
  bonusXp: number
  tierChanged: boolean
  newTier?: VipTierSlug
  error?: string
}> {
  const supabase = await createClient()

  const { data, error } = await supabase.rpc("add_vip_xp", {
    p_user_id: userId,
    p_xp: xp,
    p_source: source,
  })

  if (error) {
    console.error("Error adding VIP XP:", error)
    return {
      success: false,
      baseXp: xp,
      multiplier: 1,
      finalXp: xp,
      bonusXp: 0,
      tierChanged: false,
      error: error.message,
    }
  }

  revalidatePath("/profile")
  revalidatePath("/vip")

  return {
    success: true,
    baseXp: data.base_xp,
    multiplier: data.multiplier,
    finalXp: data.final_xp,
    bonusXp: data.bonus_xp,
    tierChanged: data.tier_result?.tier_changed || false,
    newTier: data.tier_result?.tier_changed
      ? (data.tier_result.tier_name as VipTierSlug)
      : undefined,
  }
}

/**
 * Recalculer le tier VIP d'un utilisateur
 */
export async function recalculateVipTier(userId: string): Promise<{
  success: boolean
  tierChanged: boolean
  newTier?: VipTierSlug
  error?: string
}> {
  const supabase = await createClient()

  const { data, error } = await supabase.rpc("calculate_vip_tier", {
    p_user_id: userId,
  })

  if (error) {
    console.error("Error recalculating VIP tier:", error)
    return { success: false, tierChanged: false, error: error.message }
  }

  revalidatePath("/profile")
  revalidatePath("/vip")

  return {
    success: true,
    tierChanged: data.tier_changed,
    newTier: data.tier_changed ? data.tier_name : undefined,
  }
}

/**
 * Incrémenter le compteur d'événements assistés
 */
export async function incrementEventsAttended(
  userId: string
): Promise<{ success: boolean; newCount: number }> {
  const supabase = await createClient()

  // NOTE: Supabase/PostgREST doesn't support arbitrary SQL expressions in update payloads.
  // We do a safe read -> write. If you need strict atomicity, replace this with a dedicated RPC.

  const { data: current, error: currentError } = await supabase
    .from("user_vip_status")
    .select("events_attended, first_event_date")
    .eq("user_id", userId)
    .maybeSingle()

  if (currentError) {
    console.error("Error fetching VIP status:", currentError)
    return { success: false, newCount: 0 }
  }

  const nowIso = new Date().toISOString()

  if (!current) {
    const { data: inserted, error: insertError } = await supabase
      .from("user_vip_status")
      .insert({
        user_id: userId,
        events_attended: 1,
        first_event_date: nowIso,
        updated_at: nowIso,
      })
      .select("events_attended")
      .single()

    if (insertError) {
      console.error("Error inserting VIP status:", insertError)
      return { success: false, newCount: 0 }
    }

    await recalculateVipTier(userId)
    return { success: true, newCount: inserted?.events_attended || 1 }
  }

  const nextCount = (current.events_attended || 0) + 1
  const updatePayload: Record<string, any> = {
    events_attended: nextCount,
    updated_at: nowIso,
  }

  if (!current.first_event_date) {
    updatePayload.first_event_date = nowIso
  }

  const { data, error } = await supabase
    .from("user_vip_status")
    .update(updatePayload)
    .eq("user_id", userId)
    .select("events_attended")
    .single()

  if (error) {
    console.error("Error incrementing events:", error)
    return { success: false, newCount: 0 }
  }

  // Recalculer le tier
  await recalculateVipTier(userId)

  return { success: true, newCount: data?.events_attended || 0 }
}

/* ==========================================================================
   VIP BENEFITS
   ========================================================================== */

/**
 * Réclamer les coins mensuels
 */
export async function claimMonthlyCoins(userId: string): Promise<{
  success: boolean
  coins?: number
  error?: string
}> {
  const supabase = await createClient()

  const { data, error } = await supabase.rpc("claim_monthly_vip_coins", {
    p_user_id: userId,
  })

  if (error) {
    console.error("Error claiming monthly coins:", error)
    return { success: false, error: error.message }
  }

  if (!data.success) {
    return { success: false, error: data.error }
  }

  revalidatePath("/vip")
  revalidatePath("/profile")

  return { success: true, coins: data.coins }
}

/**
 * Vérifier si les coins mensuels sont disponibles
 */
export async function canClaimMonthlyCoins(userId: string): Promise<{
  canClaim: boolean
  coins: number
  nextClaimDate?: string
}> {
  const supabase = await createClient()

  const { data: status } = await supabase
    .from("user_vip_status")
    .select(
      `
      monthly_coins_claimed,
      last_month_processed,
      current_tier_id,
      vip_tiers (free_monthly_coins)
    `
    )
    .eq("user_id", userId)
    .single()

  if (!status) {
    return { canClaim: false, coins: 0 }
  }

  const currentMonth = new Date().toISOString().slice(0, 7)
  const tierCoins = (status.vip_tiers as any)?.free_monthly_coins || 0

  if (tierCoins === 0) {
    return { canClaim: false, coins: 0 }
  }

  if (
    status.last_month_processed === currentMonth &&
    status.monthly_coins_claimed
  ) {
    // Calculer la prochaine date de réclamation (premier du mois prochain)
    const now = new Date()
    const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1)
    return {
      canClaim: false,
      coins: tierCoins,
      nextClaimDate: nextMonth.toISOString(),
    }
  }

  return { canClaim: true, coins: tierCoins }
}

/**
 * Obtenir le multiplicateur XP d'un utilisateur
 */
export async function getXpMultiplier(userId: string): Promise<number> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from("user_vip_status")
    .select(
      `
      vip_tiers (xp_multiplier)
    `
    )
    .eq("user_id", userId)
    .single()

  if (error || !data) {
    return 1
  }

  return (data.vip_tiers as any)?.xp_multiplier || 1
}

/**
 * Obtenir le multiplicateur Coins d'un utilisateur
 */
export async function getCoinMultiplier(userId: string): Promise<number> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from("user_vip_status")
    .select(
      `
      vip_tiers (coin_multiplier)
    `
    )
    .eq("user_id", userId)
    .single()

  if (error || !data) {
    return 1
  }

  return (data.vip_tiers as any)?.coin_multiplier || 1
}

/**
 * Obtenir le nombre de spins disponibles pour un utilisateur
 */
export async function getDailyWheelSpins(userId: string): Promise<number> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from("user_vip_status")
    .select(
      `
      vip_tiers (max_daily_wheel_spins)
    `
    )
    .eq("user_id", userId)
    .single()

  if (error || !data) {
    return 1
  }

  return (data.vip_tiers as any)?.max_daily_wheel_spins || 1
}

/**
 * Obtenir le nombre de packs gratuits journaliers
 */
export async function getDailyFreePacks(userId: string): Promise<number> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from("user_vip_status")
    .select(
      `
      vip_tiers (max_daily_packs)
    `
    )
    .eq("user_id", userId)
    .single()

  if (error || !data) {
    return 0
  }

  return (data.vip_tiers as any)?.max_daily_packs || 0
}

/**
 * Obtenir la réduction boutique d'un utilisateur
 */
export async function getShopDiscount(userId: string): Promise<number> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from("user_vip_status")
    .select(
      `
      vip_tiers (discount_percentage)
    `
    )
    .eq("user_id", userId)
    .single()

  if (error || !data) {
    return 0
  }

  return (data.vip_tiers as any)?.discount_percentage || 0
}

/**
 * Obtenir les heures d'accès anticipé
 */
export async function getEarlyAccessHours(userId: string): Promise<number> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from("user_vip_status")
    .select(
      `
      vip_tiers (early_access_hours)
    `
    )
    .eq("user_id", userId)
    .single()

  if (error || !data) {
    return 0
  }

  return (data.vip_tiers as any)?.early_access_hours || 0
}

/* ==========================================================================
   BENEFITS LOG
   ========================================================================== */

/**
 * Logger un bénéfice utilisé
 */
export async function logBenefitUsed(
  userId: string,
  benefitType: string,
  benefitValue: number,
  context?: string
): Promise<{ success: boolean }> {
  const supabase = await createClient()

  // Récupérer le tier actuel
  const { data: status } = await supabase
    .from("user_vip_status")
    .select("current_tier_id")
    .eq("user_id", userId)
    .single()

  if (!status) {
    return { success: false }
  }

  const { error } = await supabase.from("vip_benefits_log").insert({
    user_id: userId,
    tier_id: status.current_tier_id,
    benefit_type: benefitType,
    benefit_value: benefitValue,
    context,
  })

  if (error) {
    console.error("Error logging benefit:", error)
    return { success: false }
  }

  // Incrémenter le compteur d'utilisation
  await supabase
    .from("user_vip_status")
    .update({
      benefits_used_count: supabase.rpc("increment_column", {
        column: "benefits_used_count",
      }),
      total_savings:
        benefitType === "discount"
          ? supabase.rpc("add_to_column", {
              column: "total_savings",
              value: benefitValue,
            })
          : undefined,
    })
    .eq("user_id", userId)

  return { success: true }
}

/**
 * Récupérer l'historique des bénéfices
 */
export async function getBenefitsHistory(
  userId: string,
  limit: number = 50
): Promise<VipBenefitLog[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from("vip_benefits_log")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit)

  if (error) {
    console.error("Error fetching benefits history:", error)
    return []
  }

  return data || []
}

/**
 * Obtenir les stats des bénéfices
 */
export async function getBenefitsStats(userId: string): Promise<{
  totalBenefitsUsed: number
  totalSavings: number
  xpBonusTotal: number
  coinBonusTotal: number
}> {
  const supabase = await createClient()

  const { data: status } = await supabase
    .from("user_vip_status")
    .select("benefits_used_count, total_savings")
    .eq("user_id", userId)
    .single()

  const { data: logs } = await supabase
    .from("vip_benefits_log")
    .select("benefit_type, benefit_value")
    .eq("user_id", userId)

  let xpBonusTotal = 0
  let coinBonusTotal = 0

  logs?.forEach((log) => {
    if (log.benefit_type === "xp_bonus") {
      xpBonusTotal += log.benefit_value || 0
    } else if (log.benefit_type === "coin_bonus") {
      coinBonusTotal += log.benefit_value || 0
    }
  })

  return {
    totalBenefitsUsed: status?.benefits_used_count || 0,
    totalSavings: status?.total_savings || 0,
    xpBonusTotal,
    coinBonusTotal,
  }
}

/* ==========================================================================
   COMPARISONS & LEADERBOARD
   ========================================================================== */

/**
 * Récupérer le leaderboard VIP
 */
export async function getVipLeaderboard(
  limit: number = 20
): Promise<
  Array<{
    user_id: string
    lifetime_xp: number
    tier_slug: VipTierSlug
    tier_name: string
    tier_level: number
  }>
> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from("user_vip_status")
    .select(
      `
      user_id,
      lifetime_xp,
      vip_tiers (
        slug,
        name,
        tier_level
      )
    `
    )
    .order("lifetime_xp", { ascending: false })
    .limit(limit)

  if (error) {
    console.error("Error fetching VIP leaderboard:", error)
    return []
  }

  return (
    data?.map((d) => ({
      user_id: d.user_id,
      lifetime_xp: d.lifetime_xp,
      tier_slug: (d.vip_tiers as any)?.slug || "standard",
      tier_name: (d.vip_tiers as any)?.name || "Standard",
      tier_level: (d.vip_tiers as any)?.tier_level || 0,
    })) || []
  )
}

/**
 * Obtenir le rang VIP d'un utilisateur
 */
export async function getUserVipRank(userId: string): Promise<{
  rank: number
  totalUsers: number
  percentile: number
}> {
  const supabase = await createClient()

  // Récupérer l'XP de l'utilisateur
  const { data: userStatus } = await supabase
    .from("user_vip_status")
    .select("lifetime_xp")
    .eq("user_id", userId)
    .single()

  if (!userStatus) {
    return { rank: 0, totalUsers: 0, percentile: 0 }
  }

  // Compter les utilisateurs avec plus d'XP
  const { count: higherCount } = await supabase
    .from("user_vip_status")
    .select("*", { count: "exact", head: true })
    .gt("lifetime_xp", userStatus.lifetime_xp)

  // Compter le total
  const { count: totalCount } = await supabase
    .from("user_vip_status")
    .select("*", { count: "exact", head: true })

  const rank = (higherCount || 0) + 1
  const total = totalCount || 1
  const percentile = Math.round(((total - rank) / total) * 100)

  return { rank, totalUsers: total, percentile }
}

/**
 * Comparer deux utilisateurs VIP
 */
export async function compareVipUsers(
  userId1: string,
  userId2: string
): Promise<{
  user1: {
    lifetimeXp: number
    tierSlug: VipTierSlug
    eventsAttended: number
  }
  user2: {
    lifetimeXp: number
    tierSlug: VipTierSlug
    eventsAttended: number
  }
} | null> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from("user_vip_status")
    .select(
      `
      user_id,
      lifetime_xp,
      events_attended,
      vip_tiers (slug)
    `
    )
    .in("user_id", [userId1, userId2])

  if (error || !data || data.length !== 2) {
    return null
  }

  const user1Data = data.find((d) => d.user_id === userId1)
  const user2Data = data.find((d) => d.user_id === userId2)

  if (!user1Data || !user2Data) return null

  return {
    user1: {
      lifetimeXp: user1Data.lifetime_xp,
      tierSlug: (user1Data.vip_tiers as any)?.slug || "standard",
      eventsAttended: user1Data.events_attended,
    },
    user2: {
      lifetimeXp: user2Data.lifetime_xp,
      tierSlug: (user2Data.vip_tiers as any)?.slug || "standard",
      eventsAttended: user2Data.events_attended,
    },
  }
}
