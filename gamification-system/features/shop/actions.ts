/**
 * TEENS PARTY MOROCCO - Rewards Shop Server Actions
 * ==================================================
 *
 * Server actions pour la boutique de récompenses.
 */

"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"
import {
  type ShopReward,
  type UserPurchase,
  type RewardCategory,
  type GetRewardsInput,
  type PurchaseRewardInput,
  type UseRewardInput,
} from "./schema"

/* ==========================================================================
   GET CATEGORIES
   ========================================================================== */

/**
 * Récupère toutes les catégories actives
 */
export async function getCategories(): Promise<{
  data: RewardCategory[]
  error: string | null
}> {
  try {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from("reward_categories")
      .select("*")
      .eq("is_active", true)
      .order("display_order")

    if (error) {
      console.error("Error fetching categories:", error)
      return { data: [], error: error.message }
    }

    return { data: data as RewardCategory[], error: null }
  } catch (error) {
    console.error("Error in getCategories:", error)
    return { data: [], error: "Erreur serveur" }
  }
}

/* ==========================================================================
   GET REWARDS
   ========================================================================== */

/**
 * Récupère les récompenses de la boutique
 */
export async function getRewards(
  input?: GetRewardsInput
): Promise<{ data: ShopReward[]; error: string | null }> {
  try {
    const supabase = await createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return { data: [], error: "Non authentifié" }
    }

    const { data, error } = await supabase.rpc("get_shop_rewards", {
      p_user_id: user.id,
      p_category_slug: input?.categorySlug || null,
      p_only_affordable: input?.onlyAffordable || false,
      p_only_available: input?.onlyAvailable ?? true,
    })

    if (error) {
      console.error("Error fetching rewards:", error)
      return { data: [], error: error.message }
    }

    return { data: data as ShopReward[], error: null }
  } catch (error) {
    console.error("Error in getRewards:", error)
    return { data: [], error: "Erreur serveur" }
  }
}

/**
 * Récupère les récompenses mises en avant
 */
export async function getFeaturedRewards(): Promise<{
  data: ShopReward[]
  error: string | null
}> {
  try {
    const { data, error } = await getRewards()

    if (error) {
      return { data: [], error }
    }

    const featured = data.filter((r) => r.is_featured)
    return { data: featured, error: null }
  } catch (error) {
    console.error("Error in getFeaturedRewards:", error)
    return { data: [], error: "Erreur serveur" }
  }
}

/**
 * Récupère une récompense par ID
 */
export async function getRewardById(
  rewardId: string
): Promise<{ data: ShopReward | null; error: string | null }> {
  try {
    const { data, error } = await getRewards()

    if (error) {
      return { data: null, error }
    }

    const reward = data.find((r) => r.reward_id === rewardId)
    return { data: reward || null, error: null }
  } catch (error) {
    console.error("Error in getRewardById:", error)
    return { data: null, error: "Erreur serveur" }
  }
}

/* ==========================================================================
   PURCHASE REWARD
   ========================================================================== */

/**
 * Achète une récompense
 */
export async function purchaseReward(
  input: PurchaseRewardInput
): Promise<{
  success: boolean
  purchaseId?: string
  xpSpent?: number
  discountApplied?: number
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

    const { data, error } = await supabase.rpc("purchase_reward", {
      p_user_id: user.id,
      p_reward_id: input.rewardId,
      p_promo_code: input.promoCode || null,
    })

    if (error) {
      console.error("Error purchasing reward:", error)
      return { success: false, error: error.message }
    }

    if (!data?.success) {
      return { success: false, error: data?.error || "Achat impossible" }
    }

    // Revalidate pages
    revalidatePath("/shop")
    revalidatePath("/profile")
    revalidatePath("/dashboard")

    return {
      success: true,
      purchaseId: data.purchase_id,
      xpSpent: data.xp_spent,
      discountApplied: data.discount_applied,
      error: null,
    }
  } catch (error) {
    console.error("Error in purchaseReward:", error)
    return { success: false, error: "Erreur serveur" }
  }
}

/* ==========================================================================
   USER PURCHASES
   ========================================================================== */

/**
 * Récupère les achats de l'utilisateur
 */
export async function getUserPurchases(
  status?: string,
  includeExpired?: boolean
): Promise<{ data: UserPurchase[]; error: string | null }> {
  try {
    const supabase = await createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return { data: [], error: "Non authentifié" }
    }

    const { data, error } = await supabase.rpc("get_user_purchases", {
      p_user_id: user.id,
      p_status: status || null,
      p_include_expired: includeExpired || false,
    })

    if (error) {
      console.error("Error fetching purchases:", error)
      return { data: [], error: error.message }
    }

    return { data: data as UserPurchase[], error: null }
  } catch (error) {
    console.error("Error in getUserPurchases:", error)
    return { data: [], error: "Erreur serveur" }
  }
}

/**
 * Récupère les récompenses utilisables
 */
export async function getUsablePurchases(): Promise<{
  data: UserPurchase[]
  error: string | null
}> {
  return getUserPurchases("completed", false)
}

/* ==========================================================================
   USE REWARD
   ========================================================================== */

/**
 * Utilise une récompense achetée
 */
export async function useReward(input: UseRewardInput): Promise<{
  success: boolean
  rewardType?: string
  rewardValue?: Record<string, unknown>
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

    const { data, error } = await supabase.rpc("use_reward", {
      p_user_id: user.id,
      p_purchase_id: input.purchaseId,
      p_event_id: input.eventId || null,
    })

    if (error) {
      console.error("Error using reward:", error)
      return { success: false, error: error.message }
    }

    if (!data?.success) {
      return { success: false, error: data?.error || "Utilisation impossible" }
    }

    revalidatePath("/profile")
    revalidatePath("/shop/inventory")

    return {
      success: true,
      rewardType: data.reward_type,
      rewardValue: data.reward_value,
      error: null,
    }
  } catch (error) {
    console.error("Error in useReward:", error)
    return { success: false, error: "Erreur serveur" }
  }
}

/* ==========================================================================
   WISHLIST
   ========================================================================== */

/**
 * Ajoute/retire de la wishlist
 */
export async function toggleWishlist(
  rewardId: string
): Promise<{ success: boolean; action: "added" | "removed"; error: string | null }> {
  try {
    const supabase = await createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return { success: false, action: "removed", error: "Non authentifié" }
    }

    const { data, error } = await supabase.rpc("toggle_wishlist", {
      p_user_id: user.id,
      p_reward_id: rewardId,
    })

    if (error) {
      console.error("Error toggling wishlist:", error)
      return { success: false, action: "removed", error: error.message }
    }

    revalidatePath("/shop")

    return {
      success: true,
      action: data.action,
      error: null,
    }
  } catch (error) {
    console.error("Error in toggleWishlist:", error)
    return { success: false, action: "removed", error: "Erreur serveur" }
  }
}

/**
 * Récupère la wishlist de l'utilisateur
 */
export async function getWishlist(): Promise<{
  data: ShopReward[]
  error: string | null
}> {
  try {
    const { data, error } = await getRewards()

    if (error) {
      return { data: [], error }
    }

    const wishlist = data.filter((r) => r.is_in_wishlist)
    return { data: wishlist, error: null }
  } catch (error) {
    console.error("Error in getWishlist:", error)
    return { data: [], error: "Erreur serveur" }
  }
}

/* ==========================================================================
   PROMO CODES
   ========================================================================== */

/**
 * Vérifie un code promo
 */
export async function validatePromoCode(
  code: string,
  rewardId?: string
): Promise<{
  valid: boolean
  discountType?: "percentage" | "fixed_xp"
  discountValue?: number
  error: string | null
}> {
  try {
    const supabase = await createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return { valid: false, error: "Non authentifié" }
    }

    const { data, error } = await supabase
      .from("shop_promo_codes")
      .select("*")
      .eq("code", code.toUpperCase())
      .eq("is_active", true)
      .single()

    if (error || !data) {
      return { valid: false, error: "Code promo invalide" }
    }

    // Check validity dates
    const now = new Date()
    if (new Date(data.valid_from) > now) {
      return { valid: false, error: "Code pas encore actif" }
    }
    if (data.valid_until && new Date(data.valid_until) < now) {
      return { valid: false, error: "Code expiré" }
    }

    // Check max uses
    if (data.max_uses && data.current_uses >= data.max_uses) {
      return { valid: false, error: "Code épuisé" }
    }

    // Check user usage
    const { count } = await supabase
      .from("promo_code_uses")
      .select("*", { count: "exact", head: true })
      .eq("promo_code_id", data.id)
      .eq("user_id", user.id)

    if (count && count >= data.max_uses_per_user) {
      return { valid: false, error: "Tu as déjà utilisé ce code" }
    }

    // Check if applicable to reward
    if (rewardId && data.applicable_reward_ids?.length > 0) {
      if (!data.applicable_reward_ids.includes(rewardId)) {
        return { valid: false, error: "Code non applicable à cet article" }
      }
    }

    return {
      valid: true,
      discountType: data.discount_type,
      discountValue: data.discount_value,
      error: null,
    }
  } catch (error) {
    console.error("Error in validatePromoCode:", error)
    return { valid: false, error: "Erreur serveur" }
  }
}

/* ==========================================================================
   SHOP SUMMARY
   ========================================================================== */

/**
 * Récupère un résumé de la boutique pour l'utilisateur
 */
export async function getShopSummary(): Promise<{
  data: {
    userXP: number
    userLevel: number
    affordableCount: number
    featuredCount: number
    newCount: number
    wishlistCount: number
    usablePurchasesCount: number
  } | null
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

    // Get user profile stats from teen_full_profile
    const { data: profile } = await supabase
      .from("teen_full_profile")
      .select("total_xp, level")
      .eq("id", user.id)
      .limit(1)
      .maybeSingle()

    const userXP = profile?.total_xp || 0
    const userLevel = profile?.level || 1

    // Get rewards
    const { data: rewards } = await getRewards()

    // Get usable purchases
    const { data: purchases } = await getUsablePurchases()

    const affordable = rewards?.filter((r) => r.xp_cost <= userXP) || []
    const featured = rewards?.filter((r) => r.is_featured) || []
    const newItems = rewards?.filter((r) => r.is_new) || []
    const wishlist = rewards?.filter((r) => r.is_in_wishlist) || []

    return {
      data: {
        userXP,
        userLevel,
        affordableCount: affordable.length,
        featuredCount: featured.length,
        newCount: newItems.length,
        wishlistCount: wishlist.length,
        usablePurchasesCount: purchases?.length || 0,
      },
      error: null,
    }
  } catch (error) {
    console.error("Error in getShopSummary:", error)
    return { data: null, error: "Erreur serveur" }
  }
}
