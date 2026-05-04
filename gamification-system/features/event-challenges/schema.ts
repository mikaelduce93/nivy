/**
 * TEENS PARTY MOROCCO - Event Challenges Schema
 * ==============================================
 *
 * Types et schémas Zod pour les défis événementiels.
 */

import { z } from "zod"

/* ==========================================================================
   ENUMS
   ========================================================================== */

export const EventChallengeTypeEnum = z.enum([
  "check_in",
  "early_bird",
  "stay_late",
  "night_owl",
  "reviewer",
  "photo_booth",
  "social_butterfly",
  "vip_access",
  "first_drink",
  "dance_floor",
  "request_song",
  "meet_dj",
  "group_photo",
  "story_share",
  "loyalty",
  "explorer",
  "peak_hour",
  "comeback",
  "anniversary",
  "special_guest",
])

export const EventChallengeStatusEnum = z.enum([
  "locked",
  "available",
  "in_progress",
  "completed",
  "expired",
])

export const CheckInStatusEnum = z.enum([
  "checked_in",
  "checked_out",
])

/* ==========================================================================
   CONFIGURATION
   ========================================================================== */

export const EVENT_CHALLENGE_TYPE_CONFIG: Record<
  string,
  {
    label: string
    description: string
    icon: string
    color: string
    bgGradient: string
  }
> = {
  check_in: {
    label: "Check-in",
    description: "Confirme ta présence à l'événement",
    icon: "MapPin",
    color: "text-green-400",
    bgGradient: "from-green-500/20 to-emerald-500/20",
  },
  early_bird: {
    label: "Early Bird",
    description: "Arrive dans la première heure",
    icon: "Sunrise",
    color: "text-yellow-400",
    bgGradient: "from-yellow-500/20 to-orange-500/20",
  },
  stay_late: {
    label: "Stay Late",
    description: "Reste jusqu'à la fermeture",
    icon: "Moon",
    color: "text-purple-400",
    bgGradient: "from-purple-500/20 to-indigo-500/20",
  },
  night_owl: {
    label: "Night Owl",
    description: "Présent après minuit",
    icon: "Moon",
    color: "text-indigo-400",
    bgGradient: "from-indigo-500/20 to-purple-500/20",
  },
  reviewer: {
    label: "Reviewer",
    description: "Laisse un avis sur l'événement",
    icon: "Star",
    color: "text-amber-400",
    bgGradient: "from-amber-500/20 to-yellow-500/20",
  },
  photo_booth: {
    label: "Photo Booth",
    description: "Prends une photo au photobooth",
    icon: "Camera",
    color: "text-pink-400",
    bgGradient: "from-pink-500/20 to-rose-500/20",
  },
  social_butterfly: {
    label: "Social Butterfly",
    description: "Connecte-toi avec 5 nouveaux amis",
    icon: "Users",
    color: "text-cyan-400",
    bgGradient: "from-cyan-500/20 to-blue-500/20",
  },
  vip_access: {
    label: "VIP Access",
    description: "Accède à la zone VIP",
    icon: "Crown",
    color: "text-amber-400",
    bgGradient: "from-amber-500/20 to-orange-500/20",
  },
  first_drink: {
    label: "First Drink",
    description: "Commande ta première boisson",
    icon: "Coffee",
    color: "text-orange-400",
    bgGradient: "from-orange-500/20 to-red-500/20",
  },
  dance_floor: {
    label: "Dance Floor",
    description: "Passe du temps sur la piste",
    icon: "Music",
    color: "text-fuchsia-400",
    bgGradient: "from-fuchsia-500/20 to-pink-500/20",
  },
  request_song: {
    label: "DJ Request",
    description: "Demande une chanson au DJ",
    icon: "Disc",
    color: "text-violet-400",
    bgGradient: "from-violet-500/20 to-purple-500/20",
  },
  meet_dj: {
    label: "Meet the DJ",
    description: "Rencontre le DJ de la soirée",
    icon: "Headphones",
    color: "text-red-400",
    bgGradient: "from-red-500/20 to-pink-500/20",
  },
  group_photo: {
    label: "Squad Photo",
    description: "Photo de groupe avec 4+ amis",
    icon: "Users",
    color: "text-blue-400",
    bgGradient: "from-blue-500/20 to-cyan-500/20",
  },
  story_share: {
    label: "Story Time",
    description: "Partage l'événement en story",
    icon: "Share2",
    color: "text-pink-400",
    bgGradient: "from-pink-500/20 to-purple-500/20",
  },
  loyalty: {
    label: "Fidélité",
    description: "Participe à plusieurs événements",
    icon: "Heart",
    color: "text-red-400",
    bgGradient: "from-red-500/20 to-rose-500/20",
  },
  explorer: {
    label: "Explorer",
    description: "Visite tous les espaces",
    icon: "Compass",
    color: "text-teal-400",
    bgGradient: "from-teal-500/20 to-cyan-500/20",
  },
  peak_hour: {
    label: "Peak Hour",
    description: "Présent au moment le plus intense",
    icon: "Zap",
    color: "text-yellow-400",
    bgGradient: "from-yellow-500/20 to-amber-500/20",
  },
  comeback: {
    label: "Comeback",
    description: "Reviens après une longue absence",
    icon: "RotateCcw",
    color: "text-green-400",
    bgGradient: "from-green-500/20 to-teal-500/20",
  },
  anniversary: {
    label: "Anniversaire",
    description: "Célèbre ton anniversaire ici",
    icon: "Cake",
    color: "text-pink-400",
    bgGradient: "from-pink-500/20 to-rose-500/20",
  },
  special_guest: {
    label: "Special Guest",
    description: "Rencontre l'invité spécial",
    icon: "Star",
    color: "text-amber-400",
    bgGradient: "from-amber-500/20 to-yellow-500/20",
  },
}

export const CHALLENGE_STATUS_CONFIG: Record<
  string,
  {
    label: string
    color: string
    bgColor: string
  }
> = {
  locked: {
    label: "Verrouillé",
    color: "text-zinc-500",
    bgColor: "bg-zinc-800",
  },
  available: {
    label: "Disponible",
    color: "text-cyan-400",
    bgColor: "bg-cyan-500/20",
  },
  in_progress: {
    label: "En cours",
    color: "text-yellow-400",
    bgColor: "bg-yellow-500/20",
  },
  completed: {
    label: "Complété",
    color: "text-green-400",
    bgColor: "bg-green-500/20",
  },
  expired: {
    label: "Expiré",
    color: "text-red-400",
    bgColor: "bg-red-500/20",
  },
}

/* ==========================================================================
   SCHEMAS
   ========================================================================== */

// Type de défi événementiel
export const EventChallengeTypeSchema = z.object({
  id: z.string().uuid(),
  slug: EventChallengeTypeEnum,
  name: z.string(),
  description: z.string(),
  icon: z.string(),
  color: z.string(),
  base_xp: z.number(),
  bonus_xp: z.number().optional(),
  requires_verification: z.boolean(),
  requires_photo: z.boolean(),
  requires_location: z.boolean(),
  auto_complete: z.boolean(),
  cooldown_hours: z.number().nullable(),
  max_completions_per_event: z.number().nullable(),
  is_active: z.boolean(),
  created_at: z.string(),
})

// Défi événementiel
export const EventChallengeSchema = z.object({
  id: z.string().uuid(),
  event_id: z.string().uuid(),
  challenge_type_id: z.string().uuid(),
  title: z.string(),
  description: z.string().nullable(),
  xp_reward: z.number(),
  bonus_xp: z.number().nullable(),
  start_time: z.string().nullable(),
  end_time: z.string().nullable(),
  target_count: z.number(),
  target_location: z.any().nullable(), // GeoJSON point
  target_radius_meters: z.number().nullable(),
  requires_proof: z.boolean(),
  max_participants: z.number().nullable(),
  current_participants: z.number(),
  is_active: z.boolean(),
  created_at: z.string(),
  // Relations
  challenge_type: EventChallengeTypeSchema.optional(),
  user_progress: z.any().optional(),
})

// Progression utilisateur sur un défi
export const UserEventProgressSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  event_challenge_id: z.string().uuid(),
  status: EventChallengeStatusEnum,
  current_count: z.number(),
  proof_url: z.string().nullable(),
  completed_at: z.string().nullable(),
  xp_earned: z.number(),
  created_at: z.string(),
  updated_at: z.string(),
})

// Check-in événement
export const EventCheckInSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  event_id: z.string().uuid(),
  check_in_time: z.string(),
  check_out_time: z.string().nullable(),
  check_in_location: z.any().nullable(),
  status: CheckInStatusEnum,
  duration_minutes: z.number().nullable(),
  created_at: z.string(),
})

// Avis événement
export const EventReviewSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  event_id: z.string().uuid(),
  rating: z.number().min(1).max(5),
  review_text: z.string().nullable(),
  atmosphere_rating: z.number().min(1).max(5).nullable(),
  music_rating: z.number().min(1).max(5).nullable(),
  service_rating: z.number().min(1).max(5).nullable(),
  would_recommend: z.boolean(),
  is_verified: z.boolean(),
  xp_earned: z.number(),
  created_at: z.string(),
})

// Stats utilisateur événements
export const UserEventStatsSchema = z.object({
  total_events: z.number(),
  total_check_ins: z.number(),
  total_duration_minutes: z.number(),
  total_reviews: z.number(),
  average_rating_given: z.number().nullable(),
  challenges_completed: z.number(),
  total_xp_from_events: z.number(),
  early_bird_count: z.number(),
  stay_late_count: z.number(),
  longest_stay_minutes: z.number(),
  favorite_day: z.string().nullable(),
})

/* ==========================================================================
   TYPES
   ========================================================================== */

export type EventChallengeType = z.infer<typeof EventChallengeTypeSchema>
export type EventChallenge = z.infer<typeof EventChallengeSchema>
export type UserEventProgress = z.infer<typeof UserEventProgressSchema>
export type EventCheckIn = z.infer<typeof EventCheckInSchema>
export type EventReview = z.infer<typeof EventReviewSchema>
export type UserEventStats = z.infer<typeof UserEventStatsSchema>

/* ==========================================================================
   TYPES ENRICHIS
   ========================================================================== */

export interface EventChallengeWithProgress extends EventChallenge {
  challenge_type: EventChallengeType
  user_progress?: UserEventProgress
  time_remaining_seconds?: number
  is_available: boolean
  progress_percentage: number
}

export interface EventWithChallenges {
  id: string
  name: string
  date: string
  venue: string
  image_url?: string
  challenges: EventChallengeWithProgress[]
  check_in?: EventCheckIn
  review?: EventReview
}

export interface EventChallengeCompletion {
  challenge: EventChallenge
  xp_earned: number
  bonus_xp: number
  total_xp: number
  was_first: boolean
  rank?: number
}

/* ==========================================================================
   HELPERS
   ========================================================================== */

/**
 * Vérifie si un défi est disponible maintenant
 */
export function isChallengeAvailable(
  challenge: EventChallenge,
  checkIn?: EventCheckIn
): boolean {
  const now = new Date()

  // Vérifier si l'événement a des contraintes de temps
  if (challenge.start_time) {
    const startTime = new Date(challenge.start_time)
    if (now < startTime) return false
  }

  if (challenge.end_time) {
    const endTime = new Date(challenge.end_time)
    if (now > endTime) return false
  }

  // Certains défis nécessitent d'être check-in
  const requiresCheckIn = [
    "stay_late",
    "night_owl",
    "dance_floor",
    "explorer",
    "peak_hour",
  ]
  const typeSlug = challenge.challenge_type?.slug

  if (typeSlug && requiresCheckIn.includes(typeSlug)) {
    if (!checkIn || checkIn.status !== "checked_in") return false
  }

  // Vérifier le nombre max de participants
  if (
    challenge.max_participants &&
    challenge.current_participants >= challenge.max_participants
  ) {
    return false
  }

  return challenge.is_active
}

/**
 * Calcule le pourcentage de progression
 */
export function calculateProgressPercentage(
  current: number,
  target: number
): number {
  if (target <= 0) return 100
  return Math.min(100, Math.round((current / target) * 100))
}

/**
 * Formate la durée en heures et minutes
 */
export function formatDuration(minutes: number): string {
  if (minutes < 60) {
    return `${minutes} min`
  }
  const hours = Math.floor(minutes / 60)
  const remainingMinutes = minutes % 60
  if (remainingMinutes === 0) {
    return `${hours}h`
  }
  return `${hours}h ${remainingMinutes}min`
}

/**
 * Calcule le temps restant pour un défi
 */
export function getTimeRemaining(endTime: string | null): {
  text: string
  urgent: boolean
  expired: boolean
  seconds: number
} {
  if (!endTime) {
    return { text: "Pas de limite", urgent: false, expired: false, seconds: -1 }
  }

  const now = new Date()
  const end = new Date(endTime)
  const diffMs = end.getTime() - now.getTime()

  if (diffMs <= 0) {
    return { text: "Terminé", urgent: false, expired: true, seconds: 0 }
  }

  const diffSeconds = Math.floor(diffMs / 1000)
  const diffMinutes = Math.floor(diffSeconds / 60)
  const diffHours = Math.floor(diffMinutes / 60)

  if (diffMinutes < 5) {
    return {
      text: `${diffMinutes}min ${diffSeconds % 60}s`,
      urgent: true,
      expired: false,
      seconds: diffSeconds,
    }
  }

  if (diffMinutes < 60) {
    return {
      text: `${diffMinutes} min`,
      urgent: diffMinutes < 15,
      expired: false,
      seconds: diffSeconds,
    }
  }

  return {
    text: `${diffHours}h ${diffMinutes % 60}min`,
    urgent: false,
    expired: false,
    seconds: diffSeconds,
  }
}

/**
 * Vérifie si l'utilisateur est dans la zone de géolocalisation
 */
export function isInTargetZone(
  userLat: number,
  userLng: number,
  targetLat: number,
  targetLng: number,
  radiusMeters: number
): boolean {
  const R = 6371000 // Rayon de la Terre en mètres
  const dLat = ((targetLat - userLat) * Math.PI) / 180
  const dLng = ((targetLng - userLng) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((userLat * Math.PI) / 180) *
      Math.cos((targetLat * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  const distance = R * c

  return distance <= radiusMeters
}

/**
 * Obtient les défis groupés par catégorie
 */
export function groupChallengesByType(
  challenges: EventChallengeWithProgress[]
): Record<string, EventChallengeWithProgress[]> {
  const grouped: Record<string, EventChallengeWithProgress[]> = {}

  challenges.forEach((challenge) => {
    const type = challenge.challenge_type?.slug || "other"
    if (!grouped[type]) {
      grouped[type] = []
    }
    grouped[type].push(challenge)
  })

  return grouped
}

/**
 * Trie les défis par priorité (disponibles d'abord, puis par XP)
 */
export function sortChallengesByPriority(
  challenges: EventChallengeWithProgress[]
): EventChallengeWithProgress[] {
  return [...challenges].sort((a, b) => {
    // Complétés en dernier
    if (a.user_progress?.status === "completed" && b.user_progress?.status !== "completed") return 1
    if (b.user_progress?.status === "completed" && a.user_progress?.status !== "completed") return -1

    // Disponibles en premier
    if (a.is_available && !b.is_available) return -1
    if (b.is_available && !a.is_available) return 1

    // En cours ensuite
    if (a.user_progress?.status === "in_progress" && b.user_progress?.status !== "in_progress") return -1
    if (b.user_progress?.status === "in_progress" && a.user_progress?.status !== "in_progress") return 1

    // Par XP décroissant
    return b.xp_reward - a.xp_reward
  })
}

/**
 * Calcule le XP bonus basé sur la rapidité de complétion
 */
export function calculateSpeedBonus(
  completionTimeMinutes: number,
  expectedTimeMinutes: number
): number {
  if (completionTimeMinutes >= expectedTimeMinutes) return 0

  const speedRatio = 1 - completionTimeMinutes / expectedTimeMinutes
  // Bonus max de 50% pour une complétion instantanée
  return Math.round(speedRatio * 50)
}

/**
 * Obtient le message de félicitations basé sur le type de défi
 */
export function getChallengeCompletionMessage(
  typeSlug: string
): { title: string; subtitle: string; emoji: string } {
  const messages: Record<string, { title: string; subtitle: string; emoji: string }> = {
    check_in: {
      title: "Bienvenue !",
      subtitle: "Ta présence est confirmée",
      emoji: "🎉",
    },
    early_bird: {
      title: "Lève-tôt !",
      subtitle: "Tu fais partie des premiers",
      emoji: "🌅",
    },
    stay_late: {
      title: "Noctambule !",
      subtitle: "Tu as tenu jusqu'au bout",
      emoji: "🌙",
    },
    night_owl: {
      title: "Hibou de nuit !",
      subtitle: "La nuit ne fait que commencer",
      emoji: "🦉",
    },
    reviewer: {
      title: "Merci !",
      subtitle: "Ton avis compte pour nous",
      emoji: "⭐",
    },
    photo_booth: {
      title: "Cheese ! 📸",
      subtitle: "Souvenir capturé",
      emoji: "📸",
    },
    social_butterfly: {
      title: "Papillon social !",
      subtitle: "Tu es un vrai connecteur",
      emoji: "🦋",
    },
    vip_access: {
      title: "VIP !",
      subtitle: "Bienvenue dans le carré VIP",
      emoji: "👑",
    },
    dance_floor: {
      title: "Danseur fou !",
      subtitle: "La piste est à toi",
      emoji: "💃",
    },
    loyalty: {
      title: "Fidèle !",
      subtitle: "On te reconnaît",
      emoji: "❤️",
    },
  }

  return (
    messages[typeSlug] || {
      title: "Défi complété !",
      subtitle: "Continue comme ça",
      emoji: "🏆",
    }
  )
}

/**
 * Génère un résumé des stats de l'événement
 */
export function generateEventSummary(stats: UserEventStats): string[] {
  const summary: string[] = []

  if (stats.total_events > 0) {
    summary.push(`${stats.total_events} événement${stats.total_events > 1 ? "s" : ""} participé${stats.total_events > 1 ? "s" : ""}`)
  }

  if (stats.total_duration_minutes > 0) {
    summary.push(`${formatDuration(stats.total_duration_minutes)} passées à faire la fête`)
  }

  if (stats.challenges_completed > 0) {
    summary.push(`${stats.challenges_completed} défi${stats.challenges_completed > 1 ? "s" : ""} complété${stats.challenges_completed > 1 ? "s" : ""}`)
  }

  if (stats.early_bird_count > 0) {
    summary.push(`${stats.early_bird_count} fois Early Bird`)
  }

  if (stats.stay_late_count > 0) {
    summary.push(`${stats.stay_late_count} fois Night Owl`)
  }

  return summary
}
