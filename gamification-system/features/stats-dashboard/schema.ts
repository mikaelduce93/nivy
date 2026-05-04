/**
 * TEENS PARTY MOROCCO - Stats Dashboard Schema
 * =============================================
 *
 * Types et configurations pour le dashboard de statistiques personnelles.
 */

import { z } from "zod"

/* ==========================================================================
   ENUMS
   ========================================================================== */

export const ActivityTypeEnum = z.enum([
  "event",
  "challenge",
  "game",
  "xp",
  "coins",
  "badge",
  "friend",
  "photo",
  "review",
  "prediction",
  "time",
])
export type ActivityType = z.infer<typeof ActivityTypeEnum>

export const MilestoneTypeEnum = z.enum([
  // Événements
  "first_event",
  "10_events",
  "50_events",
  "100_events",
  // Badges
  "first_badge",
  "10_badges",
  "all_badges",
  // Amis
  "first_friend",
  "10_friends",
  "50_friends",
  // Victoires
  "first_win",
  "10_wins",
  "100_wins",
  // Niveaux
  "level_10",
  "level_25",
  "level_50",
  "level_100",
  // XP
  "1000_xp",
  "10000_xp",
  "100000_xp",
  // Ancienneté
  "1_month_member",
  "6_month_member",
  "1_year_member",
])
export type MilestoneType = z.infer<typeof MilestoneTypeEnum>

export const RecordTypeEnum = z.enum([
  "highest_daily_xp",
  "most_events_in_week",
  "most_events_in_month",
  "longest_event_stay",
  "most_challenges_in_day",
  "highest_game_score",
  "fastest_memory_game",
  "best_quiz_streak",
  "most_predictions_correct",
])
export type RecordType = z.infer<typeof RecordTypeEnum>

export const StatPeriodEnum = z.enum([
  "today",
  "week",
  "month",
  "year",
  "all_time",
])
export type StatPeriod = z.infer<typeof StatPeriodEnum>

/* ==========================================================================
   CONFIGURATION
   ========================================================================== */

export const MILESTONE_CONFIG: Record<
  MilestoneType,
  {
    name: string
    description: string
    icon: string
    emoji: string
    xpReward: number
    coinsReward: number
    rarity: "common" | "uncommon" | "rare" | "epic" | "legendary"
  }
> = {
  // Événements
  first_event: {
    name: "Premier Pas",
    description: "Participe à ton premier événement",
    icon: "PartyPopper",
    emoji: "🎉",
    xpReward: 50,
    coinsReward: 25,
    rarity: "common",
  },
  "10_events": {
    name: "Habitué",
    description: "Participe à 10 événements",
    icon: "Users",
    emoji: "🎊",
    xpReward: 200,
    coinsReward: 100,
    rarity: "uncommon",
  },
  "50_events": {
    name: "Fidèle",
    description: "Participe à 50 événements",
    icon: "Heart",
    emoji: "💖",
    xpReward: 500,
    coinsReward: 250,
    rarity: "rare",
  },
  "100_events": {
    name: "Légende Locale",
    description: "Participe à 100 événements",
    icon: "Crown",
    emoji: "👑",
    xpReward: 1000,
    coinsReward: 500,
    rarity: "legendary",
  },

  // Badges
  first_badge: {
    name: "Collectionneur Débutant",
    description: "Débloque ton premier badge",
    icon: "Award",
    emoji: "🏅",
    xpReward: 50,
    coinsReward: 25,
    rarity: "common",
  },
  "10_badges": {
    name: "Collectionneur",
    description: "Débloque 10 badges",
    icon: "Medal",
    emoji: "🎖️",
    xpReward: 300,
    coinsReward: 150,
    rarity: "uncommon",
  },
  all_badges: {
    name: "Maître Collectionneur",
    description: "Débloque tous les badges",
    icon: "Trophy",
    emoji: "🏆",
    xpReward: 2000,
    coinsReward: 1000,
    rarity: "legendary",
  },

  // Amis
  first_friend: {
    name: "Sociable",
    description: "Ajoute ton premier ami",
    icon: "UserPlus",
    emoji: "🤝",
    xpReward: 25,
    coinsReward: 10,
    rarity: "common",
  },
  "10_friends": {
    name: "Populaire",
    description: "Ajoute 10 amis",
    icon: "Users",
    emoji: "👥",
    xpReward: 150,
    coinsReward: 75,
    rarity: "uncommon",
  },
  "50_friends": {
    name: "Star Sociale",
    description: "Ajoute 50 amis",
    icon: "Star",
    emoji: "⭐",
    xpReward: 400,
    coinsReward: 200,
    rarity: "rare",
  },

  // Victoires
  first_win: {
    name: "Première Victoire",
    description: "Gagne ta première partie",
    icon: "Trophy",
    emoji: "🥇",
    xpReward: 50,
    coinsReward: 25,
    rarity: "common",
  },
  "10_wins": {
    name: "Gagnant",
    description: "Gagne 10 parties",
    icon: "Award",
    emoji: "🏅",
    xpReward: 200,
    coinsReward: 100,
    rarity: "uncommon",
  },
  "100_wins": {
    name: "Champion",
    description: "Gagne 100 parties",
    icon: "Crown",
    emoji: "👑",
    xpReward: 800,
    coinsReward: 400,
    rarity: "epic",
  },

  // Niveaux
  level_10: {
    name: "Niveau 10",
    description: "Atteins le niveau 10",
    icon: "TrendingUp",
    emoji: "📈",
    xpReward: 100,
    coinsReward: 50,
    rarity: "common",
  },
  level_25: {
    name: "Niveau 25",
    description: "Atteins le niveau 25",
    icon: "TrendingUp",
    emoji: "🚀",
    xpReward: 300,
    coinsReward: 150,
    rarity: "uncommon",
  },
  level_50: {
    name: "Niveau 50",
    description: "Atteins le niveau 50",
    icon: "Zap",
    emoji: "⚡",
    xpReward: 600,
    coinsReward: 300,
    rarity: "rare",
  },
  level_100: {
    name: "Niveau 100",
    description: "Atteins le niveau 100",
    icon: "Flame",
    emoji: "🔥",
    xpReward: 1500,
    coinsReward: 750,
    rarity: "legendary",
  },

  // XP
  "1000_xp": {
    name: "Première 1000",
    description: "Gagne 1000 XP au total",
    icon: "Sparkles",
    emoji: "✨",
    xpReward: 100,
    coinsReward: 50,
    rarity: "common",
  },
  "10000_xp": {
    name: "10K Club",
    description: "Gagne 10000 XP au total",
    icon: "Star",
    emoji: "🌟",
    xpReward: 500,
    coinsReward: 250,
    rarity: "rare",
  },
  "100000_xp": {
    name: "100K Legend",
    description: "Gagne 100000 XP au total",
    icon: "Crown",
    emoji: "💎",
    xpReward: 2000,
    coinsReward: 1000,
    rarity: "legendary",
  },

  // Ancienneté
  "1_month_member": {
    name: "Un Mois",
    description: "Membre depuis 1 mois",
    icon: "Calendar",
    emoji: "📅",
    xpReward: 100,
    coinsReward: 50,
    rarity: "common",
  },
  "6_month_member": {
    name: "6 Mois",
    description: "Membre depuis 6 mois",
    icon: "Calendar",
    emoji: "🗓️",
    xpReward: 400,
    coinsReward: 200,
    rarity: "uncommon",
  },
  "1_year_member": {
    name: "Anniversaire",
    description: "Membre depuis 1 an",
    icon: "Gift",
    emoji: "🎂",
    xpReward: 1000,
    coinsReward: 500,
    rarity: "epic",
  },
}

export const RECORD_CONFIG: Record<
  RecordType,
  {
    name: string
    description: string
    icon: string
    emoji: string
    unit: string
    higherIsBetter: boolean
  }
> = {
  highest_daily_xp: {
    name: "XP en un jour",
    description: "Maximum d'XP gagné en une journée",
    icon: "Zap",
    emoji: "⚡",
    unit: "XP",
    higherIsBetter: true,
  },
  most_events_in_week: {
    name: "Événements par semaine",
    description: "Maximum d'événements en une semaine",
    icon: "Calendar",
    emoji: "📅",
    unit: "événements",
    higherIsBetter: true,
  },
  most_events_in_month: {
    name: "Événements par mois",
    description: "Maximum d'événements en un mois",
    icon: "CalendarDays",
    emoji: "🗓️",
    unit: "événements",
    higherIsBetter: true,
  },
  longest_event_stay: {
    name: "Plus longue soirée",
    description: "Durée la plus longue passée à un événement",
    icon: "Clock",
    emoji: "⏰",
    unit: "heures",
    higherIsBetter: true,
  },
  most_challenges_in_day: {
    name: "Défis en un jour",
    description: "Maximum de défis complétés en une journée",
    icon: "Target",
    emoji: "🎯",
    unit: "défis",
    higherIsBetter: true,
  },
  highest_game_score: {
    name: "Meilleur score",
    description: "Score le plus élevé dans un jeu",
    icon: "Gamepad2",
    emoji: "🎮",
    unit: "points",
    higherIsBetter: true,
  },
  fastest_memory_game: {
    name: "Memory le plus rapide",
    description: "Temps le plus court pour finir un Memory",
    icon: "Timer",
    emoji: "⏱️",
    unit: "secondes",
    higherIsBetter: false,
  },
  best_quiz_streak: {
    name: "Série de bonnes réponses",
    description: "Plus longue série de bonnes réponses au quiz",
    icon: "CheckCircle",
    emoji: "✅",
    unit: "réponses",
    higherIsBetter: true,
  },
  most_predictions_correct: {
    name: "Prédictions correctes",
    description: "Maximum de prédictions correctes d'affilée",
    icon: "TrendingUp",
    emoji: "📈",
    unit: "prédictions",
    higherIsBetter: true,
  },
}

export const STAT_CATEGORY_CONFIG: Record<
  string,
  {
    name: string
    icon: string
    color: string
    gradient: string
  }
> = {
  overview: {
    name: "Vue d'ensemble",
    icon: "LayoutDashboard",
    color: "#06B6D4",
    gradient: "from-cyan-500/20 to-blue-500/20",
  },
  events: {
    name: "Événements",
    icon: "PartyPopper",
    color: "#8B5CF6",
    gradient: "from-violet-500/20 to-purple-500/20",
  },
  games: {
    name: "Mini-jeux",
    icon: "Gamepad2",
    color: "#10B981",
    gradient: "from-emerald-500/20 to-green-500/20",
  },
  social: {
    name: "Social",
    icon: "Users",
    color: "#F59E0B",
    gradient: "from-amber-500/20 to-yellow-500/20",
  },
  achievements: {
    name: "Accomplissements",
    icon: "Trophy",
    color: "#EF4444",
    gradient: "from-red-500/20 to-orange-500/20",
  },
}

/* ==========================================================================
   SCHEMAS
   ========================================================================== */

// Activité quotidienne
export const DailyActivitySchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  activity_date: z.string(),

  time_spent_minutes: z.number().default(0),

  events_attended: z.number().default(0),
  challenges_completed: z.number().default(0),
  games_played: z.number().default(0),
  messages_sent: z.number().default(0),
  friends_made: z.number().default(0),
  photos_uploaded: z.number().default(0),
  reviews_written: z.number().default(0),
  predictions_made: z.number().default(0),

  xp_earned: z.number().default(0),
  coins_earned: z.number().default(0),
  badges_unlocked: z.number().default(0),

  login_streak: z.number().default(1),
  event_streak: z.number().default(0),
  challenge_streak: z.number().default(0),

  created_at: z.string().optional(),
  updated_at: z.string().optional(),
})

export type DailyActivity = z.infer<typeof DailyActivitySchema>

// Stats à vie
export const LifetimeStatsSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),

  // Totaux généraux
  total_xp: z.number().default(0),
  total_coins_earned: z.number().default(0),
  total_coins_spent: z.number().default(0),

  // Événements
  total_events_attended: z.number().default(0),
  total_event_hours: z.number().default(0),
  favorite_event_type: z.string().nullable().optional(),
  favorite_day_of_week: z.number().nullable().optional(),
  average_stay_duration_minutes: z.number().default(0),
  earliest_arrival_time: z.string().nullable().optional(),
  latest_departure_time: z.string().nullable().optional(),

  // Défis
  total_challenges_completed: z.number().default(0),
  total_challenges_failed: z.number().default(0),
  challenge_completion_rate: z.number().default(0),
  favorite_challenge_type: z.string().nullable().optional(),
  longest_challenge_streak: z.number().default(0),
  current_challenge_streak: z.number().default(0),

  // Mini-jeux
  total_games_played: z.number().default(0),
  total_game_wins: z.number().default(0),
  game_win_rate: z.number().default(0),
  favorite_game: z.string().nullable().optional(),
  highest_quiz_score: z.number().default(0),
  best_memory_time_seconds: z.number().nullable().optional(),
  predictions_correct: z.number().default(0),
  predictions_total: z.number().default(0),
  prediction_accuracy: z.number().default(0),

  // Social
  total_friends: z.number().default(0),
  total_friend_requests_sent: z.number().default(0),
  total_friend_requests_received: z.number().default(0),
  total_crews_joined: z.number().default(0),
  total_duels_played: z.number().default(0),
  total_duels_won: z.number().default(0),

  // Contenu
  total_photos_uploaded: z.number().default(0),
  total_photos_liked: z.number().default(0),
  total_reviews_written: z.number().default(0),
  average_review_rating: z.number().nullable().optional(),
  total_comments_posted: z.number().default(0),

  // Badges
  total_badges_earned: z.number().default(0),
  rarest_badge_id: z.string().uuid().nullable().optional(),

  // Boutique
  total_purchases: z.number().default(0),
  total_items_owned: z.number().default(0),

  // Streaks
  longest_login_streak: z.number().default(0),
  longest_event_streak: z.number().default(0),
  current_login_streak: z.number().default(0),
  current_event_streak: z.number().default(0),
  last_login_date: z.string().nullable().optional(),
  last_event_date: z.string().nullable().optional(),

  // Timestamps
  first_activity_at: z.string().nullable().optional(),
  last_activity_at: z.string().nullable().optional(),
  created_at: z.string().optional(),
  updated_at: z.string().optional(),
})

export type LifetimeStats = z.infer<typeof LifetimeStatsSchema>

// Stats mensuelles
export const MonthlyStatsSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  month_year: z.string(),

  xp_earned: z.number().default(0),
  coins_earned: z.number().default(0),
  events_attended: z.number().default(0),
  challenges_completed: z.number().default(0),
  games_played: z.number().default(0),
  badges_earned: z.number().default(0),

  monthly_rank: z.number().nullable().optional(),
  percentile: z.number().nullable().optional(),

  xp_change_percent: z.number().nullable().optional(),
  activity_change_percent: z.number().nullable().optional(),

  created_at: z.string().optional(),
  updated_at: z.string().optional(),
})

export type MonthlyStats = z.infer<typeof MonthlyStatsSchema>

// Jalons
export const MilestoneSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  milestone_type: MilestoneTypeEnum,
  milestone_value: z.number().nullable().optional(),
  achieved_at: z.string(),
  xp_reward: z.number().default(0),
  coins_reward: z.number().default(0),
  badge_id: z.string().uuid().nullable().optional(),
})

export type Milestone = z.infer<typeof MilestoneSchema>

// Records personnels
export const PersonalRecordSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  record_type: RecordTypeEnum,
  record_value: z.number(),
  previous_record: z.number().nullable().optional(),
  achieved_at: z.string(),
  context_data: z.any().nullable().optional(),
})

export type PersonalRecord = z.infer<typeof PersonalRecordSchema>

// Moyennes plateforme
export const PlatformAveragesSchema = z.object({
  id: z.string().uuid(),
  calculated_at: z.string(),
  period: z.string(),

  avg_xp_per_user: z.number(),
  avg_events_per_user: z.number(),
  avg_challenges_per_user: z.number(),
  avg_games_per_user: z.number(),
  avg_badges_per_user: z.number(),
  avg_friends_per_user: z.number(),
  avg_login_streak: z.number(),
  avg_event_streak: z.number(),

  total_users: z.number(),
  active_users_7d: z.number(),
  active_users_30d: z.number(),
})

export type PlatformAverages = z.infer<typeof PlatformAveragesSchema>

// Dashboard complet
export const DashboardStatsSchema = z.object({
  lifetime: LifetimeStatsSchema.nullable(),
  recent_activity: z.array(
    z.object({
      date: z.string(),
      xp: z.number(),
      events: z.number(),
      challenges: z.number(),
      games: z.number(),
    })
  ),
  monthly: z.array(
    z.object({
      month: z.string(),
      xp: z.number(),
      events: z.number(),
      rank: z.number().nullable(),
      percentile: z.number().nullable(),
    })
  ),
  records: z.array(
    z.object({
      type: z.string(),
      value: z.number(),
      achieved_at: z.string(),
    })
  ),
  milestones: z.array(
    z.object({
      type: z.string(),
      value: z.number().nullable(),
      achieved_at: z.string(),
    })
  ),
  rank: z.object({
    global_rank: z.number(),
    total_users: z.number(),
    percentile: z.number(),
  }),
})

export type DashboardStats = z.infer<typeof DashboardStatsSchema>

// Activity stats pour une période
export const ActivityStatsSchema = z.object({
  total_xp: z.number(),
  total_events: z.number(),
  total_challenges: z.number(),
  total_games: z.number(),
  total_time_minutes: z.number(),
  active_days: z.number(),
  avg_xp_per_day: z.number(),
  best_day: z
    .object({
      date: z.string(),
      xp: z.number(),
    })
    .nullable(),
  daily_breakdown: z
    .array(
      z.object({
        date: z.string(),
        xp: z.number(),
        events: z.number(),
        challenges: z.number(),
        games: z.number(),
      })
    )
    .nullable(),
})

export type ActivityStats = z.infer<typeof ActivityStatsSchema>

/* ==========================================================================
   TYPES COMPOSÉS
   ========================================================================== */

export interface MilestoneWithConfig extends Milestone {
  config: (typeof MILESTONE_CONFIG)[MilestoneType]
}

export interface RecordWithConfig extends PersonalRecord {
  config: (typeof RECORD_CONFIG)[RecordType]
}

export interface StatComparison {
  value: number
  average: number
  percentAboveAverage: number
  rank?: number
  totalUsers?: number
}

export interface ActivityTrend {
  period: string
  currentValue: number
  previousValue: number
  changePercent: number
  trend: "up" | "down" | "stable"
}

/* ==========================================================================
   HELPERS
   ========================================================================== */

// Calculer le pourcentage de différence avec la moyenne
export function calculatePercentVsAverage(
  value: number,
  average: number
): number {
  if (average === 0) return value > 0 ? 100 : 0
  return Math.round(((value - average) / average) * 100)
}

// Déterminer la tendance
export function determineTrend(
  current: number,
  previous: number
): "up" | "down" | "stable" {
  const changePercent =
    previous === 0 ? (current > 0 ? 100 : 0) : ((current - previous) / previous) * 100

  if (changePercent > 5) return "up"
  if (changePercent < -5) return "down"
  return "stable"
}

// Formater le temps
export function formatTimeSpent(minutes: number): string {
  if (minutes < 60) {
    return `${minutes}min`
  }
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  if (mins === 0) {
    return `${hours}h`
  }
  return `${hours}h ${mins}min`
}

// Formater une grande valeur
export function formatLargeNumber(value: number): string {
  if (value >= 1000000) {
    return `${(value / 1000000).toFixed(1)}M`
  }
  if (value >= 1000) {
    return `${(value / 1000).toFixed(1)}K`
  }
  return value.toLocaleString()
}

// Obtenir la couleur de la tendance
export function getTrendColor(trend: "up" | "down" | "stable"): string {
  switch (trend) {
    case "up":
      return "text-green-400"
    case "down":
      return "text-red-400"
    default:
      return "text-zinc-400"
  }
}

// Obtenir l'icône de la tendance
export function getTrendIcon(trend: "up" | "down" | "stable"): string {
  switch (trend) {
    case "up":
      return "TrendingUp"
    case "down":
      return "TrendingDown"
    default:
      return "Minus"
  }
}

// Calculer le niveau à partir de l'XP
export function calculateLevelFromXp(xp: number): {
  level: number
  currentXp: number
  xpForNextLevel: number
  progress: number
} {
  // Formule: XP requis par niveau = 100 * niveau * 1.5
  let level = 1
  let totalXpRequired = 0

  while (true) {
    const xpForLevel = Math.floor(100 * level * 1.5)
    if (totalXpRequired + xpForLevel > xp) {
      const currentXp = xp - totalXpRequired
      return {
        level,
        currentXp,
        xpForNextLevel: xpForLevel,
        progress: Math.round((currentXp / xpForLevel) * 100),
      }
    }
    totalXpRequired += xpForLevel
    level++
  }
}

// Obtenir le rang en texte
export function getRankText(rank: number, total: number): string {
  const percentile = ((total - rank) / total) * 100

  if (rank === 1) return "🥇 #1"
  if (rank === 2) return "🥈 #2"
  if (rank === 3) return "🥉 #3"
  if (percentile >= 99) return `Top 1% (#${rank})`
  if (percentile >= 95) return `Top 5% (#${rank})`
  if (percentile >= 90) return `Top 10% (#${rank})`
  if (percentile >= 75) return `Top 25% (#${rank})`
  if (percentile >= 50) return `Top 50% (#${rank})`
  return `#${rank}`
}

// Obtenir le jour de la semaine en français
export function getDayOfWeekName(dayIndex: number): string {
  const days = [
    "Dimanche",
    "Lundi",
    "Mardi",
    "Mercredi",
    "Jeudi",
    "Vendredi",
    "Samedi",
  ]
  return days[dayIndex] || "Inconnu"
}

// Formater une date relative
export function formatRelativeDate(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const diffDays = Math.floor(
    (now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24)
  )

  if (diffDays === 0) return "Aujourd'hui"
  if (diffDays === 1) return "Hier"
  if (diffDays < 7) return `Il y a ${diffDays} jours`
  if (diffDays < 30) return `Il y a ${Math.floor(diffDays / 7)} semaine(s)`
  if (diffDays < 365) return `Il y a ${Math.floor(diffDays / 30)} mois`
  return `Il y a ${Math.floor(diffDays / 365)} an(s)`
}

// Obtenir un message d'encouragement basé sur les stats
export function getEncouragementMessage(
  stats: LifetimeStats
): { title: string; message: string; emoji: string } {
  if (stats.current_login_streak >= 30) {
    return {
      title: "Série incroyable !",
      message: `${stats.current_login_streak} jours de suite, tu es un champion !`,
      emoji: "🔥",
    }
  }

  if (stats.total_events_attended >= 50) {
    return {
      title: "Vétéran !",
      message: "Tu es un pilier de notre communauté !",
      emoji: "👑",
    }
  }

  if (stats.game_win_rate >= 70) {
    return {
      title: "Pro Gamer !",
      message: `${stats.game_win_rate}% de victoires, impressionnant !`,
      emoji: "🎮",
    }
  }

  if (stats.prediction_accuracy >= 80) {
    return {
      title: "Oracle !",
      message: `${stats.prediction_accuracy}% de prédictions correctes !`,
      emoji: "🔮",
    }
  }

  if (stats.total_friends >= 20) {
    return {
      title: "Super Social !",
      message: "Tu as une belle communauté d'amis !",
      emoji: "🤝",
    }
  }

  return {
    title: "Continue comme ça !",
    message: "Chaque événement te rapproche du sommet !",
    emoji: "✨",
  }
}
