/**
 * TEENS PARTY MOROCCO - Social Sharing Actions
 * =============================================
 *
 * Server actions pour le système de partage social.
 */

"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"
import { getSocialBaseUrl } from "@/lib/config/app-config"
import {
  type PlatformSlug,
  type ContentType,
  type SharingPlatform,
  type ShareTemplate,
  type UserShare,
  type SharingAchievement,
  type UserSharingStats,
  type ReferralCode,
  type ReferralUse,
  type ShareContent,
  type ShareResult,
  type ReferralInfo,
  generateShareText,
  generateHashtags,
  buildShareUrl,
} from "./schema"

/* ==========================================================================
   PLATFORM ACTIONS
   ========================================================================== */

/**
 * Récupère toutes les plateformes de partage actives
 */
export async function getSharingPlatforms(): Promise<{
  success: boolean
  platforms?: SharingPlatform[]
  error?: string
}> {
  try {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from("sharing_platforms")
      .select("*")
      .eq("is_active", true)
      .order("sort_order")

    if (error) throw error

    return { success: true, platforms: data }
  } catch (error) {
    console.error("Erreur getSharingPlatforms:", error)
    return { success: false, error: "Impossible de charger les plateformes" }
  }
}

/**
 * Récupère les templates de partage
 */
export async function getShareTemplates(
  contentType?: ContentType
): Promise<{
  success: boolean
  templates?: ShareTemplate[]
  error?: string
}> {
  try {
    const supabase = await createClient()

    let query = supabase
      .from("share_templates")
      .select("*")
      .eq("is_active", true)

    if (contentType) {
      query = query.eq("content_type", contentType)
    }

    const { data, error } = await query

    if (error) throw error

    return { success: true, templates: data }
  } catch (error) {
    console.error("Erreur getShareTemplates:", error)
    return { success: false, error: "Impossible de charger les templates" }
  }
}

/* ==========================================================================
   SHARE ACTIONS
   ========================================================================== */

/**
 * Crée un nouveau partage
 */
export async function createShare(
  platformSlug: PlatformSlug,
  content: ShareContent,
  templateSlug?: string
): Promise<ShareResult> {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return { success: false }
    }

    const { data, error } = await supabase.rpc("create_share", {
      p_user_id: user.id,
      p_platform_slug: platformSlug,
      p_content_type: content.type,
      p_content_id: content.id || null,
      p_template_slug: templateSlug || null,
      p_title: content.title,
      p_description: content.description || null,
      p_image_url: content.imageUrl || null,
    })

    if (error) throw error

    revalidatePath("/profile")
    revalidatePath("/share")

    return {
      success: data.success,
      shareId: data.share_id,
      shareCode: data.share_code,
      xpEarned: data.xp_earned,
      coinsEarned: data.coins_earned,
      isFirstShare: data.is_first_share,
    }
  } catch (error) {
    console.error("Erreur createShare:", error)
    return { success: false }
  }
}

/**
 * Récupère l'historique des partages d'un utilisateur
 */
export async function getUserShares(
  limit: number = 20,
  offset: number = 0
): Promise<{
  success: boolean
  shares?: (UserShare & { platform: SharingPlatform })[]
  hasMore?: boolean
  error?: string
}> {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return { success: false, error: "Non authentifié" }
    }

    const { data, error } = await supabase
      .from("user_shares")
      .select(
        `
        *,
        sharing_platforms!inner(*)
      `
      )
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) throw error

    const shares = data.map((s: any) => ({
      ...s,
      platform: s.sharing_platforms,
    }))

    return {
      success: true,
      shares,
      hasMore: data.length === limit,
    }
  } catch (error) {
    console.error("Erreur getUserShares:", error)
    return { success: false, error: "Impossible de charger l'historique" }
  }
}

/**
 * Track un clic sur un partage
 */
export async function trackShareClick(shareCode: string): Promise<{
  success: boolean
  data?: {
    userId: string
    contentType: string
    contentId?: string
  }
  error?: string
}> {
  try {
    const supabase = await createClient()

    const { data, error } = await supabase.rpc("track_share_click", {
      p_share_code: shareCode,
    })

    if (error) throw error

    if (!data.success) {
      return { success: false, error: data.error }
    }

    return {
      success: true,
      data: {
        userId: data.user_id,
        contentType: data.content_type,
        contentId: data.content_id,
      },
    }
  } catch (error) {
    console.error("Erreur trackShareClick:", error)
    return { success: false, error: "Erreur lors du tracking" }
  }
}

/* ==========================================================================
   STATS ACTIONS
   ========================================================================== */

/**
 * Récupère les statistiques de partage d'un utilisateur
 */
export async function getSharingStats(): Promise<{
  success: boolean
  stats?: UserSharingStats
  error?: string
}> {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return { success: false, error: "Non authentifié" }
    }

    const { data, error } = await supabase
      .from("user_sharing_stats")
      .select("*")
      .eq("user_id", user.id)
      .single()

    if (error && error.code !== "PGRST116") throw error

    // Retourner des stats vides si pas encore de données
    const stats: UserSharingStats = data || {
      id: "",
      user_id: user.id,
      total_shares: 0,
      total_clicks: 0,
      total_conversions: 0,
      shares_by_platform: {},
      shares_by_type: {},
      current_share_streak: 0,
      longest_share_streak: 0,
      last_share_date: null,
      total_xp_earned: 0,
      total_coins_earned: 0,
      first_share_at: null,
    }

    return { success: true, stats }
  } catch (error) {
    console.error("Erreur getSharingStats:", error)
    return { success: false, error: "Impossible de charger les statistiques" }
  }
}

/* ==========================================================================
   ACHIEVEMENT ACTIONS
   ========================================================================== */

/**
 * Récupère les achievements de partage
 */
export async function getSharingAchievements(): Promise<{
  success: boolean
  achievements?: (SharingAchievement & { unlocked: boolean; unlocked_at?: string })[]
  error?: string
}> {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return { success: false, error: "Non authentifié" }
    }

    // Récupérer tous les achievements
    const { data: achievements, error: achievementsError } = await supabase
      .from("sharing_achievements")
      .select("*")
      .eq("is_active", true)

    if (achievementsError) throw achievementsError

    // Récupérer les achievements débloqués
    const { data: unlocked } = await supabase
      .from("user_sharing_achievements")
      .select("achievement_id, unlocked_at")
      .eq("user_id", user.id)

    const unlockedMap = new Map(
      unlocked?.map((u) => [u.achievement_id, u.unlocked_at]) || []
    )

    const result = achievements.map((achievement) => ({
      ...achievement,
      unlocked: unlockedMap.has(achievement.id),
      unlocked_at: unlockedMap.get(achievement.id),
    }))

    return { success: true, achievements: result }
  } catch (error) {
    console.error("Erreur getSharingAchievements:", error)
    return { success: false, error: "Impossible de charger les achievements" }
  }
}

/* ==========================================================================
   REFERRAL ACTIONS
   ========================================================================== */

/**
 * Récupère ou crée le code referral de l'utilisateur
 */
export async function getReferralCode(): Promise<{
  success: boolean
  referral?: ReferralInfo
  error?: string
}> {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return { success: false, error: "Non authentifié" }
    }

    const { data, error } = await supabase.rpc("get_or_create_referral_code", {
      p_user_id: user.id,
    })

    if (error) throw error

    return {
      success: true,
      referral: {
        code: data.code,
        totalUses: data.total_uses,
        successfulConversions: data.successful_conversions,
        pendingRewards: 0, // À calculer si nécessaire
        shareUrl: `${getSocialBaseUrl()}/join?ref=${data.code}`,
      },
    }
  } catch (error) {
    console.error("Erreur getReferralCode:", error)
    return { success: false, error: "Impossible de récupérer le code" }
  }
}

/**
 * Utilise un code referral
 */
export async function useReferralCode(code: string): Promise<{
  success: boolean
  rewards?: {
    xp: number
    coins: number
  }
  error?: string
}> {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return { success: false, error: "Non authentifié" }
    }

    const { data, error } = await supabase.rpc("use_referral_code", {
      p_user_id: user.id,
      p_code: code,
    })

    if (error) throw error

    if (!data.success) {
      return { success: false, error: data.error }
    }

    return {
      success: true,
      rewards: {
        xp: data.referee_xp_reward,
        coins: data.referee_coins_reward,
      },
    }
  } catch (error) {
    console.error("Erreur useReferralCode:", error)
    return { success: false, error: "Impossible d'utiliser le code" }
  }
}

/**
 * Récupère les utilisateurs parrainés
 */
export async function getReferredUsers(): Promise<{
  success: boolean
  users?: {
    id: string
    username: string
    avatar_url?: string
    status: string
    created_at: string
  }[]
  error?: string
}> {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return { success: false, error: "Non authentifié" }
    }

    // Trouver le code referral de l'utilisateur
    const { data: referralCode } = await supabase
      .from("referral_codes")
      .select("id")
      .eq("user_id", user.id)
      .single()

    if (!referralCode) {
      return { success: true, users: [] }
    }

    // Récupérer les utilisations
    const { data, error } = await supabase
      .from("referral_uses")
      .select(
        `
        status,
        created_at,
        users!referred_user_id(id, username, avatar_url)
      `
      )
      .eq("referral_code_id", referralCode.id)
      .order("created_at", { ascending: false })

    if (error) throw error

    const users = data.map((u: any) => ({
      id: u.users.id,
      username: u.users.username,
      avatar_url: u.users.avatar_url,
      status: u.status,
      created_at: u.created_at,
    }))

    return { success: true, users }
  } catch (error) {
    console.error("Erreur getReferredUsers:", error)
    return { success: false, error: "Impossible de charger les parrainés" }
  }
}

/* ==========================================================================
   SHARE CONTENT GENERATORS
   ========================================================================== */

/**
 * Génère le contenu de partage pour un badge
 */
export async function generateBadgeShareContent(badgeId: string): Promise<{
  success: boolean
  content?: ShareContent
  error?: string
}> {
  try {
    const supabase = await createClient()

    const { data: badge, error } = await supabase
      .from("badges")
      .select("*")
      .eq("id", badgeId)
      .single()

    if (error) throw error

    return {
      success: true,
      content: {
        type: "badge",
        id: badgeId,
        title: `J'ai débloqué le badge "${badge.name}" sur Teens Party Morocco !`,
        description: badge.description,
        imageUrl: badge.image_url,
        data: { badge_name: badge.name, badge_description: badge.description },
      },
    }
  } catch (error) {
    console.error("Erreur generateBadgeShareContent:", error)
    return { success: false, error: "Impossible de générer le contenu" }
  }
}

/**
 * Génère le contenu de partage pour un événement
 */
export async function generateEventShareContent(eventId: string): Promise<{
  success: boolean
  content?: ShareContent
  error?: string
}> {
  try {
    const supabase = await createClient()

    const { data: event, error } = await supabase
      .from("events")
      .select("*")
      .eq("id", eventId)
      .single()

    if (error) throw error

    return {
      success: true,
      content: {
        type: "event",
        id: eventId,
        title: `J'étais à "${event.name}" avec Teens Party Morocco !`,
        description: event.description,
        imageUrl: event.cover_image_url,
        data: { event_name: event.name, event_description: event.description },
      },
    }
  } catch (error) {
    console.error("Erreur generateEventShareContent:", error)
    return { success: false, error: "Impossible de générer le contenu" }
  }
}

/**
 * Génère le contenu de partage pour une montée de niveau
 */
export async function generateLevelUpShareContent(level: number): Promise<{
  success: boolean
  content?: ShareContent
  error?: string
}> {
  return {
    success: true,
    content: {
      type: "level_up",
      title: `Je viens d'atteindre le niveau ${level} sur Teens Party Morocco !`,
      description: "Rejoins-moi pour vivre des soirées incroyables !",
      data: { level },
    },
  }
}

/**
 * Génère le contenu de partage pour les stats wrapped
 */
export async function generateWrappedShareContent(stats: {
  eventsCount: number
  totalXp: number
  topBadge?: string
  rank?: number
}): Promise<{
  success: boolean
  content?: ShareContent
  error?: string
}> {
  return {
    success: true,
    content: {
      type: "stats",
      title: `Mon année 2024 sur Teens Party Morocco : ${stats.eventsCount} événements, ${stats.totalXp} XP !`,
      description: "Et toi, c'était comment ton année ?",
      data: stats,
    },
  }
}
