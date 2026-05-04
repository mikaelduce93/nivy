/**
 * TEENS PARTY MOROCCO - Special Challenges Schema
 * ================================================
 *
 * Définitions pour les défis spéciaux (photo, quiz, géoloc, flash).
 */

import { z } from "zod"

/* ==========================================================================
   ENUMS
   ========================================================================== */

export const ChallengeCategoryEnum = z.enum([
  "photo",
  "quiz",
  "geolocation",
  "flash",
  "social",
  "creative",
])
export type ChallengeCategory = z.infer<typeof ChallengeCategoryEnum>

export const SpecialChallengeStatusEnum = z.enum([
  "scheduled",
  "active",
  "voting",
  "completed",
  "cancelled",
])
export type SpecialChallengeStatus = z.infer<typeof SpecialChallengeStatusEnum>

export const QuestionTypeEnum = z.enum([
  "multiple_choice",
  "true_false",
  "image_choice",
  "audio_choice",
])
export type QuestionType = z.infer<typeof QuestionTypeEnum>

export const QuizDifficultyEnum = z.enum(["easy", "medium", "hard"])
export type QuizDifficulty = z.infer<typeof QuizDifficultyEnum>

export const QuizCategoryEnum = z.enum([
  "music",
  "culture",
  "events",
  "general",
  "party",
])
export type QuizCategory = z.infer<typeof QuizCategoryEnum>

/* ==========================================================================
   CONFIGURATION
   ========================================================================== */

export const CHALLENGE_CATEGORY_CONFIG: Record<
  ChallengeCategory,
  {
    label: string
    icon: string
    color: string
    description: string
  }
> = {
  photo: {
    label: "Photo",
    icon: "camera",
    color: "text-pink-400",
    description: "Défis photographiques",
  },
  quiz: {
    label: "Quiz",
    icon: "brain",
    color: "text-green-400",
    description: "Testez vos connaissances",
  },
  geolocation: {
    label: "Géoloc",
    icon: "map-pin",
    color: "text-blue-400",
    description: "Défis de localisation",
  },
  flash: {
    label: "Flash",
    icon: "zap",
    color: "text-yellow-400",
    description: "Défis éclair limités dans le temps",
  },
  social: {
    label: "Social",
    icon: "users",
    color: "text-purple-400",
    description: "Défis sociaux",
  },
  creative: {
    label: "Créatif",
    icon: "sparkles",
    color: "text-cyan-400",
    description: "Défis créatifs",
  },
}

export const CHALLENGE_STATUS_CONFIG: Record<
  SpecialChallengeStatus,
  {
    label: string
    color: string
    bgColor: string
  }
> = {
  scheduled: {
    label: "Programmé",
    color: "text-zinc-400",
    bgColor: "bg-zinc-500/20",
  },
  active: {
    label: "En cours",
    color: "text-green-400",
    bgColor: "bg-green-500/20",
  },
  voting: {
    label: "Votes en cours",
    color: "text-purple-400",
    bgColor: "bg-purple-500/20",
  },
  completed: {
    label: "Terminé",
    color: "text-blue-400",
    bgColor: "bg-blue-500/20",
  },
  cancelled: {
    label: "Annulé",
    color: "text-red-400",
    bgColor: "bg-red-500/20",
  },
}

export const QUIZ_DIFFICULTY_CONFIG: Record<
  QuizDifficulty,
  {
    label: string
    color: string
    multiplier: number
  }
> = {
  easy: { label: "Facile", color: "text-green-400", multiplier: 1 },
  medium: { label: "Moyen", color: "text-yellow-400", multiplier: 1.5 },
  hard: { label: "Difficile", color: "text-red-400", multiplier: 2 },
}

export const QUIZ_CATEGORY_CONFIG: Record<
  QuizCategory,
  {
    label: string
    icon: string
    color: string
  }
> = {
  music: { label: "Musique", icon: "music", color: "text-pink-400" },
  culture: { label: "Culture", icon: "book", color: "text-blue-400" },
  events: { label: "Events", icon: "calendar", color: "text-purple-400" },
  general: { label: "Général", icon: "help-circle", color: "text-cyan-400" },
  party: { label: "Party", icon: "party-popper", color: "text-yellow-400" },
}

/* ==========================================================================
   SCHEMAS
   ========================================================================== */

export const SpecialChallengeTypeSchema = z.object({
  id: z.string().uuid(),
  slug: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  icon: z.string(),
  color: z.string(),
  challenge_category: ChallengeCategoryEnum,
  duration_minutes: z.number(),
  max_participants: z.number(),
  min_level_required: z.number(),
  base_xp_reward: z.number(),
  winner_bonus_xp: z.number(),
  participation_xp: z.number(),
  requires_validation: z.boolean(),
})

export type SpecialChallengeType = z.infer<typeof SpecialChallengeTypeSchema>

export const SpecialChallengeSchema = z.object({
  challenge_id: z.string().uuid(),
  type_slug: z.string(),
  type_name: z.string(),
  category: ChallengeCategoryEnum,
  icon: z.string(),
  color: z.string(),
  title: z.string(),
  description: z.string().nullable(),
  starts_at: z.string().datetime(),
  ends_at: z.string().datetime(),
  is_flash: z.boolean(),
  total_participants: z.number(),
  base_xp: z.number(),
  winner_xp: z.number(),
  has_participated: z.boolean(),
  time_remaining_seconds: z.number(),
})

export type SpecialChallenge = z.infer<typeof SpecialChallengeSchema>

export const ChallengeSubmissionSchema = z.object({
  id: z.string().uuid(),
  challenge_id: z.string().uuid(),
  user_id: z.string().uuid(),
  pseudo: z.string(),
  avatar_url: z.string().nullable(),
  submission_type: z.string(),
  content: z.record(z.unknown()),
  image_url: z.string().nullable(),
  score: z.number(),
  vote_count: z.number(),
  is_validated: z.boolean(),
  xp_awarded: z.number(),
  submitted_at: z.string().datetime(),
  is_winner: z.boolean().optional(),
})

export type ChallengeSubmission = z.infer<typeof ChallengeSubmissionSchema>

export const QuizQuestionSchema = z.object({
  question_id: z.string().uuid(),
  category: QuizCategoryEnum,
  difficulty: QuizDifficultyEnum,
  question: z.string(),
  question_type: QuestionTypeEnum,
  options: z.array(
    z.object({
      text: z.string(),
      image_url: z.string().optional(),
    })
  ),
  points: z.number(),
  time_limit: z.number(),
  image_url: z.string().nullable(),
  audio_url: z.string().nullable(),
})

export type QuizQuestion = z.infer<typeof QuizQuestionSchema>

export const QuizAnswerSchema = z.object({
  question_id: z.string().uuid(),
  answer_index: z.number(),
  time_taken_ms: z.number(),
})

export type QuizAnswer = z.infer<typeof QuizAnswerSchema>

export const GeolocationZoneSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  description: z.string().nullable(),
  latitude: z.number(),
  longitude: z.number(),
  radius_meters: z.number(),
  zone_type: z.string(),
  discovery_xp: z.number(),
})

export type GeolocationZone = z.infer<typeof GeolocationZoneSchema>

/* ==========================================================================
   INPUT SCHEMAS
   ========================================================================== */

export const PhotoSubmissionInputSchema = z.object({
  challengeId: z.string().uuid(),
  imageUrl: z.string().url(),
  caption: z.string().max(200).optional(),
})

export type PhotoSubmissionInput = z.infer<typeof PhotoSubmissionInputSchema>

export const QuizSubmissionInputSchema = z.object({
  challengeId: z.string().uuid(),
  answers: z.array(QuizAnswerSchema),
  totalTime: z.number(),
})

export type QuizSubmissionInput = z.infer<typeof QuizSubmissionInputSchema>

export const GeolocationSubmissionInputSchema = z.object({
  challengeId: z.string().uuid(),
  latitude: z.number(),
  longitude: z.number(),
  accuracy: z.number(),
})

export type GeolocationSubmissionInput = z.infer<
  typeof GeolocationSubmissionInputSchema
>

/* ==========================================================================
   HELPER FUNCTIONS
   ========================================================================== */

/**
 * Formate le temps restant
 */
export function formatTimeRemaining(seconds: number): {
  text: string
  urgent: boolean
  expired: boolean
} {
  if (seconds <= 0) {
    return { text: "Terminé", urgent: false, expired: true }
  }

  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const secs = seconds % 60

  const urgent = seconds < 300 // Moins de 5 minutes

  if (hours > 0) {
    return { text: `${hours}h ${minutes}m`, urgent: false, expired: false }
  }
  if (minutes > 0) {
    return { text: `${minutes}m ${secs}s`, urgent, expired: false }
  }
  return { text: `${secs}s`, urgent: true, expired: false }
}

/**
 * Calcule le score d'un quiz
 */
export function calculateQuizScore(
  answers: QuizAnswer[],
  questions: { question_id: string; correct_index: number; points: number }[]
): {
  score: number
  correctCount: number
  totalQuestions: number
  averageTime: number
} {
  let score = 0
  let correctCount = 0
  let totalTime = 0

  answers.forEach((answer) => {
    const question = questions.find((q) => q.question_id === answer.question_id)
    if (question && answer.answer_index === question.correct_index) {
      score += question.points
      correctCount++
    }
    totalTime += answer.time_taken_ms
  })

  return {
    score,
    correctCount,
    totalQuestions: questions.length,
    averageTime: Math.round(totalTime / answers.length),
  }
}

/**
 * Vérifie si une position est dans une zone
 */
export function isInZone(
  userLat: number,
  userLng: number,
  zoneLat: number,
  zoneLng: number,
  radiusMeters: number
): boolean {
  const R = 6371000 // Rayon de la Terre en mètres
  const dLat = ((zoneLat - userLat) * Math.PI) / 180
  const dLng = ((zoneLng - userLng) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((userLat * Math.PI) / 180) *
      Math.cos((zoneLat * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  const distance = R * c

  return distance <= radiusMeters
}

/**
 * Calcule la distance entre deux points GPS
 */
export function calculateDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371000
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLng = ((lng2 - lng1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return Math.round(R * c)
}

/**
 * Génère un message de résultat de quiz
 */
export function getQuizResultMessage(
  correctCount: number,
  totalQuestions: number
): {
  title: string
  subtitle: string
  emoji: string
} {
  const percentage = (correctCount / totalQuestions) * 100

  if (percentage === 100) {
    return {
      title: "Parfait !",
      subtitle: "Tu es un vrai expert !",
      emoji: "🏆",
    }
  }
  if (percentage >= 80) {
    return {
      title: "Excellent !",
      subtitle: "Impressionnant !",
      emoji: "🌟",
    }
  }
  if (percentage >= 60) {
    return {
      title: "Bien joué !",
      subtitle: "Continue comme ça !",
      emoji: "👍",
    }
  }
  if (percentage >= 40) {
    return {
      title: "Pas mal !",
      subtitle: "Tu peux faire mieux !",
      emoji: "💪",
    }
  }
  return {
    title: "Dommage !",
    subtitle: "Réessaie pour t'améliorer !",
    emoji: "📚",
  }
}

/**
 * Trie les soumissions par votes
 */
export function sortSubmissionsByVotes(
  submissions: ChallengeSubmission[]
): ChallengeSubmission[] {
  return [...submissions].sort((a, b) => b.vote_count - a.vote_count)
}

/**
 * Trie les soumissions par score de quiz
 */
export function sortSubmissionsByScore(
  submissions: ChallengeSubmission[]
): ChallengeSubmission[] {
  return [...submissions].sort((a, b) => b.score - a.score)
}

/**
 * Vérifie si un défi est flash et actif
 */
export function isFlashChallengeActive(challenge: SpecialChallenge): boolean {
  return (
    challenge.is_flash &&
    challenge.time_remaining_seconds > 0 &&
    !challenge.has_participated
  )
}
