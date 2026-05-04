/**
 * TEENS PARTY MOROCCO - Annual Wrapped Schema
 * ============================================
 *
 * Types et configurations pour le récapitulatif annuel.
 */

import { z } from "zod"

/* ==========================================================================
   ENUMS
   ========================================================================== */

export const WrappedStatusEnum = z.enum([
  "pending",
  "generating",
  "ready",
  "viewed",
])
export type WrappedStatus = z.infer<typeof WrappedStatusEnum>

export const HighlightTypeEnum = z.enum([
  "total_xp",
  "most_xp_day",
  "total_events",
  "top_event",
  "longest_streak",
  "challenges_completed",
  "games_played",
  "biggest_achievement",
  "best_game_performance",
  "favorite_friend",
  "top_crew",
  "memorable_moment",
])
export type HighlightType = z.infer<typeof HighlightTypeEnum>

export const WrappedAchievementEnum = z.enum([
  "party_animal",
  "party_lover",
  "party_goer",
  "game_master",
  "gamer",
  "challenge_champion",
  "challenger",
  "streak_master",
  "streak_keeper",
  "consistent",
  "early_bird",
  "night_owl",
  "social_butterfly",
  "loyal_member",
  "rising_star",
  "top_predictor",
  "memory_king",
])
export type WrappedAchievement = z.infer<typeof WrappedAchievementEnum>

export const RarityEnum = z.enum(["common", "rare", "epic", "legendary"])
export type Rarity = z.infer<typeof RarityEnum>

/* ==========================================================================
   CONFIGURATION
   ========================================================================== */

export const WRAPPED_SLIDE_CONFIG: Record<
  string,
  {
    title: string
    emoji: string
    gradient: string
    textColor: string
    order: number
  }
> = {
  intro: {
    title: "Ton année en revue",
    emoji: "✨",
    gradient: "from-purple-600 via-pink-500 to-orange-400",
    textColor: "text-white",
    order: 0,
  },
  total_xp: {
    title: "XP accumulés",
    emoji: "⚡",
    gradient: "from-yellow-500 to-orange-500",
    textColor: "text-white",
    order: 1,
  },
  total_events: {
    title: "Événements",
    emoji: "🎉",
    gradient: "from-purple-500 to-violet-600",
    textColor: "text-white",
    order: 2,
  },
  most_xp_day: {
    title: "Ton meilleur jour",
    emoji: "🏆",
    gradient: "from-amber-500 to-yellow-400",
    textColor: "text-white",
    order: 3,
  },
  longest_streak: {
    title: "Ta plus longue série",
    emoji: "🔥",
    gradient: "from-orange-500 to-red-500",
    textColor: "text-white",
    order: 4,
  },
  challenges_completed: {
    title: "Défis relevés",
    emoji: "🎯",
    gradient: "from-cyan-500 to-blue-500",
    textColor: "text-white",
    order: 5,
  },
  games_played: {
    title: "Parties jouées",
    emoji: "🎮",
    gradient: "from-green-500 to-emerald-500",
    textColor: "text-white",
    order: 6,
  },
  favorites: {
    title: "Tes préférés",
    emoji: "❤️",
    gradient: "from-pink-500 to-rose-500",
    textColor: "text-white",
    order: 7,
  },
  achievements: {
    title: "Tes titres",
    emoji: "🏅",
    gradient: "from-indigo-500 to-purple-500",
    textColor: "text-white",
    order: 8,
  },
  percentile: {
    title: "Ton classement",
    emoji: "👑",
    gradient: "from-yellow-400 via-amber-500 to-orange-500",
    textColor: "text-white",
    order: 9,
  },
  outro: {
    title: "À l'année prochaine !",
    emoji: "🚀",
    gradient: "from-violet-600 via-purple-500 to-pink-500",
    textColor: "text-white",
    order: 10,
  },
}

export const WRAPPED_ACHIEVEMENT_CONFIG: Record<
  WrappedAchievement,
  {
    title: string
    description: string
    emoji: string
    rarity: Rarity
    gradient: string
  }
> = {
  party_animal: {
    title: "Party Animal",
    description: "50+ événements cette année",
    emoji: "🎉",
    rarity: "legendary",
    gradient: "from-yellow-500 to-orange-500",
  },
  party_lover: {
    title: "Party Lover",
    description: "25+ événements cette année",
    emoji: "🥳",
    rarity: "epic",
    gradient: "from-purple-500 to-violet-500",
  },
  party_goer: {
    title: "Party Goer",
    description: "10+ événements cette année",
    emoji: "🎊",
    rarity: "rare",
    gradient: "from-blue-500 to-cyan-500",
  },
  game_master: {
    title: "Game Master",
    description: "100+ parties jouées",
    emoji: "🎮",
    rarity: "legendary",
    gradient: "from-green-500 to-emerald-500",
  },
  gamer: {
    title: "Gamer",
    description: "50+ parties jouées",
    emoji: "🕹️",
    rarity: "epic",
    gradient: "from-teal-500 to-green-500",
  },
  challenge_champion: {
    title: "Challenge Champion",
    description: "100+ défis relevés",
    emoji: "🏆",
    rarity: "legendary",
    gradient: "from-amber-500 to-yellow-500",
  },
  challenger: {
    title: "Challenger",
    description: "50+ défis complétés",
    emoji: "🎯",
    rarity: "epic",
    gradient: "from-cyan-500 to-blue-500",
  },
  streak_master: {
    title: "Streak Master",
    description: "Série de 30+ jours",
    emoji: "🔥",
    rarity: "legendary",
    gradient: "from-orange-500 to-red-500",
  },
  streak_keeper: {
    title: "Streak Keeper",
    description: "Série de 14+ jours",
    emoji: "⚡",
    rarity: "epic",
    gradient: "from-yellow-500 to-orange-500",
  },
  consistent: {
    title: "Consistent",
    description: "Série de 7+ jours",
    emoji: "✨",
    rarity: "rare",
    gradient: "from-pink-500 to-rose-500",
  },
  early_bird: {
    title: "Early Bird",
    description: "Souvent arrivé tôt aux events",
    emoji: "🌅",
    rarity: "rare",
    gradient: "from-amber-400 to-orange-400",
  },
  night_owl: {
    title: "Night Owl",
    description: "Souvent resté tard aux events",
    emoji: "🦉",
    rarity: "rare",
    gradient: "from-indigo-500 to-purple-500",
  },
  social_butterfly: {
    title: "Social Butterfly",
    description: "Beaucoup d'amis cette année",
    emoji: "🦋",
    rarity: "epic",
    gradient: "from-pink-500 to-violet-500",
  },
  loyal_member: {
    title: "Loyal Member",
    description: "Membre depuis plus d'un an",
    emoji: "💎",
    rarity: "epic",
    gradient: "from-cyan-400 to-blue-500",
  },
  rising_star: {
    title: "Rising Star",
    description: "Progression impressionnante",
    emoji: "⭐",
    rarity: "rare",
    gradient: "from-yellow-400 to-amber-500",
  },
  top_predictor: {
    title: "Top Predictor",
    description: "Excellente précision de prédiction",
    emoji: "🔮",
    rarity: "epic",
    gradient: "from-violet-500 to-purple-500",
  },
  memory_king: {
    title: "Memory King",
    description: "Meilleurs temps au Memory",
    emoji: "🧠",
    rarity: "rare",
    gradient: "from-cyan-500 to-teal-500",
  },
}

export const FUN_COMPARISONS: Array<{
  threshold: number
  comparison: string
  emoji: string
}> = [
  { threshold: 100000, comparison: "l'équivalent de 100 marathons en XP", emoji: "🏃" },
  { threshold: 50000, comparison: "plus que la plupart des influenceurs", emoji: "📱" },
  { threshold: 20000, comparison: "une vraie machine à points", emoji: "🤖" },
  { threshold: 10000, comparison: "un joueur assidu", emoji: "💪" },
  { threshold: 5000, comparison: "un bon début", emoji: "🌱" },
]

/* ==========================================================================
   SCHEMAS
   ========================================================================== */

// Wrapped summary data
export const WrappedSummarySchema = z.object({
  total_xp: z.number(),
  total_events: z.number(),
  total_challenges: z.number(),
  total_games: z.number(),
  total_time_hours: z.number(),
  longest_streak: z.number(),
})

export type WrappedSummary = z.infer<typeof WrappedSummarySchema>

// Wrapped favorites
export const WrappedFavoritesSchema = z.object({
  top_month: z.string().nullable(),
  top_day: z.string().nullable(),
  favorite_game: z.string().nullable(),
})

export type WrappedFavorites = z.infer<typeof WrappedFavoritesSchema>

// Wrapped percentiles
export const WrappedPercentilesSchema = z.object({
  xp_percentile: z.number().nullable(),
  events_percentile: z.number().nullable(),
})

export type WrappedPercentiles = z.infer<typeof WrappedPercentilesSchema>

// Wrapped data
export const WrappedDataSchema = z.object({
  summary: WrappedSummarySchema,
  favorites: WrappedFavoritesSchema,
  percentiles: WrappedPercentilesSchema,
})

export type WrappedData = z.infer<typeof WrappedDataSchema>

// Highlight
export const WrappedHighlightSchema = z.object({
  type: z.string(),
  title: z.string(),
  description: z.string().nullable(),
  value: z.number().nullable(),
  unit: z.string().nullable(),
  metadata: z.record(z.any()).optional(),
})

export type WrappedHighlight = z.infer<typeof WrappedHighlightSchema>

// Achievement
export const WrappedAchievementSchema = z.object({
  slug: z.string(),
  title: z.string(),
  description: z.string().nullable(),
  emoji: z.string(),
  rarity: RarityEnum,
})

export type WrappedAchievementData = z.infer<typeof WrappedAchievementSchema>

// Comparison
export const WrappedComparisonSchema = z.object({
  type: z.string(),
  title: z.string(),
  user_value: z.number().nullable(),
  comparison_value: z.number().nullable(),
  percentage_diff: z.number().nullable(),
  fun_text: z.string().nullable(),
})

export type WrappedComparison = z.infer<typeof WrappedComparisonSchema>

// Full wrapped
export const UserWrappedSchema = z.object({
  id: z.string().uuid(),
  year: z.number(),
  status: WrappedStatusEnum,
  data: WrappedDataSchema,
  highlights: z.array(WrappedHighlightSchema),
  achievements: z.array(WrappedAchievementSchema),
  comparisons: z.array(WrappedComparisonSchema),
  share_token: z.string().nullable(),
  is_public: z.boolean(),
  generated_at: z.string().nullable(),
})

export type UserWrapped = z.infer<typeof UserWrappedSchema>

/* ==========================================================================
   TYPES COMPOSÉS
   ========================================================================== */

export interface WrappedSlide {
  id: string
  type: keyof typeof WRAPPED_SLIDE_CONFIG
  content: {
    title: string
    value?: number | string
    unit?: string
    description?: string
    emoji: string
    subtext?: string
  }
  config: (typeof WRAPPED_SLIDE_CONFIG)[keyof typeof WRAPPED_SLIDE_CONFIG]
}

export interface WrappedAchievementWithConfig extends WrappedAchievementData {
  config: (typeof WRAPPED_ACHIEVEMENT_CONFIG)[WrappedAchievement]
}

/* ==========================================================================
   HELPERS
   ========================================================================== */

// Générer les slides à partir des données du wrapped
export function generateWrappedSlides(wrapped: UserWrapped): WrappedSlide[] {
  const slides: WrappedSlide[] = []
  const { data, highlights, achievements } = wrapped

  // Slide intro
  slides.push({
    id: "intro",
    type: "intro",
    content: {
      title: `Ton ${wrapped.year} en revue`,
      description: "Découvre tes moments forts de cette année !",
      emoji: "✨",
    },
    config: WRAPPED_SLIDE_CONFIG.intro,
  })

  // Slides des highlights
  for (const highlight of highlights) {
    const slideType = highlight.type as keyof typeof WRAPPED_SLIDE_CONFIG
    if (WRAPPED_SLIDE_CONFIG[slideType]) {
      slides.push({
        id: `highlight-${highlight.type}`,
        type: slideType,
        content: {
          title: highlight.title,
          value: highlight.value ?? undefined,
          unit: highlight.unit ?? undefined,
          description: highlight.description ?? undefined,
          emoji: WRAPPED_SLIDE_CONFIG[slideType].emoji,
        },
        config: WRAPPED_SLIDE_CONFIG[slideType],
      })
    }
  }

  // Slide favorites
  if (data.favorites.top_month || data.favorites.favorite_game) {
    slides.push({
      id: "favorites",
      type: "favorites",
      content: {
        title: "Tes préférés",
        description: data.favorites.top_month
          ? `${data.favorites.top_month} était ton mois préféré`
          : undefined,
        subtext: data.favorites.favorite_game
          ? `Jeu favori: ${data.favorites.favorite_game}`
          : undefined,
        emoji: "❤️",
      },
      config: WRAPPED_SLIDE_CONFIG.favorites,
    })
  }

  // Slide achievements
  if (achievements.length > 0) {
    slides.push({
      id: "achievements",
      type: "achievements",
      content: {
        title: "Tes titres de l'année",
        value: achievements.length,
        unit: "badges débloqués",
        emoji: "🏅",
      },
      config: WRAPPED_SLIDE_CONFIG.achievements,
    })
  }

  // Slide percentile
  if (data.percentiles.xp_percentile) {
    slides.push({
      id: "percentile",
      type: "percentile",
      content: {
        title: "Tu fais mieux que",
        value: data.percentiles.xp_percentile,
        unit: "% des membres",
        emoji: "👑",
      },
      config: WRAPPED_SLIDE_CONFIG.percentile,
    })
  }

  // Slide outro
  slides.push({
    id: "outro",
    type: "outro",
    content: {
      title: "À l'année prochaine !",
      description: "Merci d'avoir été avec nous cette année",
      emoji: "🚀",
    },
    config: WRAPPED_SLIDE_CONFIG.outro,
  })

  return slides
}

// Obtenir une comparaison fun basée sur le total XP
export function getFunComparison(xp: number): {
  comparison: string
  emoji: string
} {
  for (const comp of FUN_COMPARISONS) {
    if (xp >= comp.threshold) {
      return { comparison: comp.comparison, emoji: comp.emoji }
    }
  }
  return { comparison: "un début prometteur", emoji: "🌟" }
}

// Formater une valeur avec animation
export function formatWrappedValue(value: number, type: string): string {
  if (type === "total_time_hours") {
    const hours = Math.floor(value)
    const minutes = Math.round((value - hours) * 60)
    return minutes > 0 ? `${hours}h ${minutes}min` : `${hours}h`
  }
  return value.toLocaleString("fr-FR")
}

// Obtenir le message de percentile
export function getPercentileMessage(percentile: number): string {
  if (percentile >= 99) return "Tu es dans le top 1% ! 🏆"
  if (percentile >= 95) return "Tu es dans le top 5% ! 🌟"
  if (percentile >= 90) return "Tu es dans le top 10% ! ⭐"
  if (percentile >= 75) return "Tu es dans le top 25% ! 💪"
  if (percentile >= 50) return "Tu es dans la première moitié ! 👍"
  return "Continue, tu vas progresser ! 🚀"
}

// Obtenir la couleur de rareté
export function getRarityColor(rarity: Rarity): string {
  switch (rarity) {
    case "legendary":
      return "text-yellow-400"
    case "epic":
      return "text-purple-400"
    case "rare":
      return "text-blue-400"
    default:
      return "text-zinc-400"
  }
}

// Obtenir le background de rareté
export function getRarityBg(rarity: Rarity): string {
  switch (rarity) {
    case "legendary":
      return "bg-yellow-500/20 border-yellow-500/30"
    case "epic":
      return "bg-purple-500/20 border-purple-500/30"
    case "rare":
      return "bg-blue-500/20 border-blue-500/30"
    default:
      return "bg-zinc-500/20 border-zinc-500/30"
  }
}
