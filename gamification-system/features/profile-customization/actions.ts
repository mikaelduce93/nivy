/**
 * TEENS PARTY MOROCCO - Profile Customization Actions
 * ====================================================
 *
 * Server actions pour la personnalisation de profil.
 */

"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"
import {
  type ProfileFrame,
  type ProfileTitle,
  type ProfileColor,
  type ProfileBackground,
  type UserCustomizationItems,
  type ItemType,
} from "./schema"

/* ==========================================================================
   GET ALL ITEMS
   ========================================================================== */

/**
 * Récupère tous les cadres disponibles
 */
export async function getAllFrames(): Promise<ProfileFrame[]> {
  try {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from("profile_frames")
      .select("*")
      .eq("is_active", true)
      .order("rarity", { ascending: true })

    if (error) throw error

    return data || []
  } catch (error) {
    console.error("Erreur getAllFrames:", error)
    return []
  }
}

/**
 * Récupère tous les titres disponibles
 */
export async function getAllTitles(): Promise<ProfileTitle[]> {
  try {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from("profile_titles")
      .select("*")
      .eq("is_active", true)
      .order("rarity", { ascending: true })

    if (error) throw error

    return data || []
  } catch (error) {
    console.error("Erreur getAllTitles:", error)
    return []
  }
}

/**
 * Récupère tous les thèmes de couleur disponibles
 */
export async function getAllColors(): Promise<ProfileColor[]> {
  try {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from("profile_colors")
      .select("*")
      .eq("is_active", true)
      .order("rarity", { ascending: true })

    if (error) throw error

    return data || []
  } catch (error) {
    console.error("Erreur getAllColors:", error)
    return []
  }
}

/**
 * Récupère tous les backgrounds disponibles
 */
export async function getAllBackgrounds(): Promise<ProfileBackground[]> {
  try {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from("profile_backgrounds")
      .select("*")
      .eq("is_active", true)
      .order("rarity", { ascending: true })

    if (error) throw error

    return data || []
  } catch (error) {
    console.error("Erreur getAllBackgrounds:", error)
    return []
  }
}

/* ==========================================================================
   USER ITEMS
   ========================================================================== */

/**
 * Récupère tous les items débloqués et équipés d'un utilisateur
 */
export async function getUserCustomizationItems(): Promise<UserCustomizationItems | null> {
  try {
    const supabase = await createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return null

    const { data, error } = await supabase.rpc("get_user_customization_items", {
      p_user_id: user.id,
    })

    if (error) throw error

    return data
  } catch (error) {
    console.error("Erreur getUserCustomizationItems:", error)
    return null
  }
}

/**
 * Récupère les items d'un autre utilisateur (vue publique)
 */
export async function getPublicUserCustomization(
  userId: string
): Promise<{
  frame: ProfileFrame | null
  title: ProfileTitle | null
  color: ProfileColor | null
  background: ProfileBackground | null
} | null> {
  try {
    const supabase = await createClient()

    const { data: customization, error } = await supabase
      .from("user_profile_customization")
      .select(`
        equipped_frame_id,
        equipped_title_id,
        equipped_color_id,
        equipped_background_id
      `)
      .eq("user_id", userId)
      .single()

    if (error && error.code !== "PGRST116") throw error
    if (!customization) return null

    // Récupérer les détails des items équipés
    const [frame, title, color, background] = await Promise.all([
      customization.equipped_frame_id
        ? supabase
            .from("profile_frames")
            .select("*")
            .eq("id", customization.equipped_frame_id)
            .single()
            .then((r) => r.data)
        : null,
      customization.equipped_title_id
        ? supabase
            .from("profile_titles")
            .select("*")
            .eq("id", customization.equipped_title_id)
            .single()
            .then((r) => r.data)
        : null,
      customization.equipped_color_id
        ? supabase
            .from("profile_colors")
            .select("*")
            .eq("id", customization.equipped_color_id)
            .single()
            .then((r) => r.data)
        : null,
      customization.equipped_background_id
        ? supabase
            .from("profile_backgrounds")
            .select("*")
            .eq("id", customization.equipped_background_id)
            .single()
            .then((r) => r.data)
        : null,
    ])

    return { frame, title, color, background }
  } catch (error) {
    console.error("Erreur getPublicUserCustomization:", error)
    return null
  }
}

/* ==========================================================================
   EQUIP ITEMS
   ========================================================================== */

/**
 * Équipe un item
 */
export async function equipItem(
  itemType: ItemType,
  itemId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      return { success: false, error: "Non authentifié" }
    }

    const { data, error } = await supabase.rpc("equip_profile_item", {
      p_user_id: user.id,
      p_item_type: itemType,
      p_item_id: itemId,
    })

    if (error) throw error

    if (!data) {
      return { success: false, error: "Vous ne possédez pas cet item" }
    }

    revalidatePath("/profile")

    return { success: true }
  } catch (error) {
    console.error("Erreur equipItem:", error)
    return { success: false, error: "Erreur lors de l'équipement" }
  }
}

/**
 * Déséquipe un item (remet à null)
 */
export async function unequipItem(
  itemType: ItemType
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      return { success: false, error: "Non authentifié" }
    }

    // Créer l'entrée si elle n'existe pas
    await supabase
      .from("user_profile_customization")
      .upsert({ user_id: user.id }, { onConflict: "user_id" })

    const columnMap: Record<ItemType, string> = {
      frame: "equipped_frame_id",
      title: "equipped_title_id",
      color: "equipped_color_id",
      background: "equipped_background_id",
    }

    const { error } = await supabase
      .from("user_profile_customization")
      .update({ [columnMap[itemType]]: null, updated_at: new Date().toISOString() })
      .eq("user_id", user.id)

    if (error) throw error

    revalidatePath("/profile")

    return { success: true }
  } catch (error) {
    console.error("Erreur unequipItem:", error)
    return { success: false, error: "Erreur lors du déséquipement" }
  }
}

/* ==========================================================================
   UNLOCK ITEMS
   ========================================================================== */

/**
 * Débloque un item pour l'utilisateur
 */
export async function unlockItem(
  itemType: ItemType,
  itemId: string,
  source: string = "system"
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      return { success: false, error: "Non authentifié" }
    }

    const { data, error } = await supabase.rpc("unlock_profile_item", {
      p_user_id: user.id,
      p_item_type: itemType,
      p_item_id: itemId,
      p_source: source,
    })

    if (error) throw error

    revalidatePath("/profile")
    revalidatePath("/shop")

    return { success: true }
  } catch (error) {
    console.error("Erreur unlockItem:", error)
    return { success: false, error: "Erreur lors du déverrouillage" }
  }
}

/**
 * Achète et débloque un item avec des coins
 */
export async function purchaseItem(
  itemType: ItemType,
  itemId: string,
  price: number
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      return { success: false, error: "Non authentifié" }
    }

    // Vérifier le solde de l'utilisateur
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("coins")
      .eq("id", user.id)
      .single()

    if (profileError) throw profileError

    if ((profile?.coins || 0) < price) {
      return { success: false, error: "Solde insuffisant" }
    }

    // Débiter les coins
    const { error: debitError } = await supabase
      .from("profiles")
      .update({ coins: (profile?.coins || 0) - price })
      .eq("id", user.id)

    if (debitError) throw debitError

    // Débloquer l'item
    const unlockResult = await unlockItem(itemType, itemId, "purchase")
    if (!unlockResult.success) {
      // Rembourser si l'unlock échoue
      await supabase
        .from("profiles")
        .update({ coins: profile?.coins || 0 })
        .eq("id", user.id)

      return unlockResult
    }

    revalidatePath("/profile")
    revalidatePath("/shop")

    return { success: true }
  } catch (error) {
    console.error("Erreur purchaseItem:", error)
    return { success: false, error: "Erreur lors de l'achat" }
  }
}

/* ==========================================================================
   UPDATE PROFILE
   ========================================================================== */

/**
 * Met à jour la bio personnalisée
 */
export async function updateProfileBio(
  bio: string,
  emoji?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      return { success: false, error: "Non authentifié" }
    }

    // Créer l'entrée si elle n'existe pas
    await supabase
      .from("user_profile_customization")
      .upsert({ user_id: user.id }, { onConflict: "user_id" })

    const { error } = await supabase
      .from("user_profile_customization")
      .update({
        custom_bio: bio,
        bio_emoji: emoji || null,
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", user.id)

    if (error) throw error

    revalidatePath("/profile")

    return { success: true }
  } catch (error) {
    console.error("Erreur updateProfileBio:", error)
    return { success: false, error: "Erreur lors de la mise à jour" }
  }
}

/**
 * Met à jour le statut personnalisé
 */
export async function updateProfileStatus(
  status: string,
  emoji?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      return { success: false, error: "Non authentifié" }
    }

    await supabase
      .from("user_profile_customization")
      .upsert({ user_id: user.id }, { onConflict: "user_id" })

    const { error } = await supabase
      .from("user_profile_customization")
      .update({
        custom_status: status,
        status_emoji: emoji || null,
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", user.id)

    if (error) throw error

    revalidatePath("/profile")

    return { success: true }
  } catch (error) {
    console.error("Erreur updateProfileStatus:", error)
    return { success: false, error: "Erreur lors de la mise à jour" }
  }
}

/**
 * Met à jour les badges en vitrine
 */
export async function updateShowcaseBadges(
  badgeIds: string[]
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      return { success: false, error: "Non authentifié" }
    }

    // Maximum 3 badges
    const limitedBadges = badgeIds.slice(0, 3)

    await supabase
      .from("user_profile_customization")
      .upsert({ user_id: user.id }, { onConflict: "user_id" })

    const { error } = await supabase
      .from("user_profile_customization")
      .update({
        showcase_badge_ids: limitedBadges,
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", user.id)

    if (error) throw error

    revalidatePath("/profile")

    return { success: true }
  } catch (error) {
    console.error("Erreur updateShowcaseBadges:", error)
    return { success: false, error: "Erreur lors de la mise à jour" }
  }
}

/**
 * Met à jour les préférences de visibilité
 */
export async function updateProfilePreferences(
  preferences: {
    show_level?: boolean
    show_xp?: boolean
    show_badges_count?: boolean
    show_events_count?: boolean
    show_friends_count?: boolean
    show_crew?: boolean
  }
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      return { success: false, error: "Non authentifié" }
    }

    await supabase
      .from("user_profile_customization")
      .upsert({ user_id: user.id }, { onConflict: "user_id" })

    const { error } = await supabase
      .from("user_profile_customization")
      .update({
        ...preferences,
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", user.id)

    if (error) throw error

    revalidatePath("/profile")

    return { success: true }
  } catch (error) {
    console.error("Erreur updateProfilePreferences:", error)
    return { success: false, error: "Erreur lors de la mise à jour" }
  }
}

/* ==========================================================================
   CHECK UNLOCKS
   ========================================================================== */

/**
 * Vérifie et débloque automatiquement les items basés sur le niveau
 */
export async function checkLevelUnlocks(
  level: number
): Promise<{ unlockedItems: Array<{ type: ItemType; id: string; name: string }> }> {
  try {
    const supabase = await createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      return { unlockedItems: [] }
    }

    const unlockedItems: Array<{ type: ItemType; id: string; name: string }> = []

    // Vérifier les frames
    const { data: frames } = await supabase
      .from("profile_frames")
      .select("id, name, unlock_requirement")
      .eq("unlock_type", "level")
      .eq("is_active", true)

    for (const frame of frames || []) {
      const req = frame.unlock_requirement as { level?: number }
      if (req.level && level >= req.level) {
        const result = await unlockItem("frame", frame.id, "level")
        if (result.success) {
          unlockedItems.push({ type: "frame", id: frame.id, name: frame.name })
        }
      }
    }

    // Vérifier les titles
    const { data: titles } = await supabase
      .from("profile_titles")
      .select("id, name, unlock_requirement")
      .eq("unlock_type", "level")
      .eq("is_active", true)

    for (const title of titles || []) {
      const req = title.unlock_requirement as { level?: number }
      if (req.level && level >= req.level) {
        const result = await unlockItem("title", title.id, "level")
        if (result.success) {
          unlockedItems.push({ type: "title", id: title.id, name: title.name })
        }
      }
    }

    // Vérifier les colors
    const { data: colors } = await supabase
      .from("profile_colors")
      .select("id, name, unlock_requirement")
      .eq("unlock_type", "level")
      .eq("is_active", true)

    for (const color of colors || []) {
      const req = color.unlock_requirement as { level?: number }
      if (req.level && level >= req.level) {
        const result = await unlockItem("color", color.id, "level")
        if (result.success) {
          unlockedItems.push({ type: "color", id: color.id, name: color.name })
        }
      }
    }

    return { unlockedItems }
  } catch (error) {
    console.error("Erreur checkLevelUnlocks:", error)
    return { unlockedItems: [] }
  }
}
