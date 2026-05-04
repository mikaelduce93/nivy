/**
 * TEENS PARTY MOROCCO - Mini Games Schema
 * ========================================
 *
 * Types et schémas Zod pour les mini-jeux.
 */

import { z } from "zod"

/* ==========================================================================
   ENUMS
   ========================================================================== */

export const GameTypeSlugEnum = z.enum([
  "music_quiz",
  "memory",
  "predictions",
  "daily_quiz",
  "blindtest",
  "emoji_guess",
])

export const GameSessionStatusEnum = z.enum([
  "waiting",
  "in_progress",
  "completed",
  "cancelled",
])

export const QuizDifficultyEnum = z.enum(["easy", "medium", "hard"])

export const QuestionTypeEnum = z.enum([
  "guess_song",
  "guess_artist",
  "guess_year",
  "lyrics",
])

export const PredictionStatusEnum = z.enum(["open", "closed", "resolved"])

/* ==========================================================================
   CONFIGURATION
   ========================================================================== */

export const GAME_TYPE_CONFIG: Record<
  string,
  {
    name: string
    description: string
    icon: string
    color: string
    gradient: string
    emoji: string
  }
> = {
  music_quiz: {
    name: "Quiz Musical",
    description: "Devine les chansons et les artistes !",
    icon: "Music",
    color: "#EC4899",
    gradient: "from-pink-500/20 to-rose-500/20",
    emoji: "🎵",
  },
  memory: {
    name: "Memory",
    description: "Trouve les paires le plus vite possible !",
    icon: "Grid",
    color: "#8B5CF6",
    gradient: "from-purple-500/20 to-violet-500/20",
    emoji: "🧠",
  },
  predictions: {
    name: "Prédictions",
    description: "Prédis ce qui va se passer !",
    icon: "TrendingUp",
    color: "#10B981",
    gradient: "from-green-500/20 to-emerald-500/20",
    emoji: "🔮",
  },
  daily_quiz: {
    name: "Quiz du Jour",
    description: "Le quiz quotidien !",
    icon: "Calendar",
    color: "#F59E0B",
    gradient: "from-yellow-500/20 to-amber-500/20",
    emoji: "📅",
  },
  blindtest: {
    name: "Blindtest",
    description: "Sois le plus rapide à buzzer !",
    icon: "Headphones",
    color: "#EF4444",
    gradient: "from-red-500/20 to-orange-500/20",
    emoji: "🎧",
  },
  emoji_guess: {
    name: "Devine l'Emoji",
    description: "Devine le titre avec les emojis !",
    icon: "Smile",
    color: "#FBBF24",
    gradient: "from-yellow-500/20 to-orange-500/20",
    emoji: "😊",
  },
}

export const DIFFICULTY_CONFIG: Record<
  string,
  {
    label: string
    color: string
    multiplier: number
  }
> = {
  easy: {
    label: "Facile",
    color: "text-green-400",
    multiplier: 1,
  },
  medium: {
    label: "Moyen",
    color: "text-yellow-400",
    multiplier: 1.5,
  },
  hard: {
    label: "Difficile",
    color: "text-red-400",
    multiplier: 2,
  },
}

/* ==========================================================================
   SCHEMAS
   ========================================================================== */

// Type de mini-jeu
export const MiniGameTypeSchema = z.object({
  id: z.string().uuid(),
  slug: GameTypeSlugEnum,
  name: z.string(),
  description: z.string().nullable(),
  icon: z.string().nullable(),
  color: z.string(),
  rules: z.string().nullable(),
  min_players: z.number(),
  max_players: z.number(),
  base_xp: z.number(),
  time_limit_seconds: z.number().nullable(),
  cooldown_minutes: z.number(),
  is_daily: z.boolean(),
  is_active: z.boolean(),
  created_at: z.string(),
})

// Session de jeu
export const GameSessionSchema = z.object({
  id: z.string().uuid(),
  game_type_id: z.string().uuid(),
  event_id: z.string().uuid().nullable(),
  host_user_id: z.string().uuid(),
  status: GameSessionStatusEnum,
  game_data: z.any(),
  settings: z.any(),
  started_at: z.string().nullable(),
  ended_at: z.string().nullable(),
  winner_user_id: z.string().uuid().nullable(),
  created_at: z.string(),
})

// Participant
export const GameParticipantSchema = z.object({
  id: z.string().uuid(),
  session_id: z.string().uuid(),
  user_id: z.string().uuid(),
  score: z.number(),
  rank: z.number().nullable(),
  game_state: z.any(),
  xp_earned: z.number(),
  joined_at: z.string(),
  finished_at: z.string().nullable(),
  // Relations
  pseudo: z.string().optional(),
  avatar_url: z.string().nullable().optional(),
})

// Question Quiz Musical
export const MusicQuizQuestionSchema = z.object({
  id: z.string().uuid(),
  song_title: z.string(),
  artist: z.string(),
  audio_preview_url: z.string().nullable(),
  album_art_url: z.string().nullable(),
  release_year: z.number().nullable(),
  genre: z.string().nullable(),
  difficulty: QuizDifficultyEnum,
  question_type: QuestionTypeEnum,
  options: z.array(z.string()).nullable(),
  correct_answer: z.string(),
  hint: z.string().nullable(),
  points: z.number(),
  play_count: z.number(),
  success_rate: z.number(),
  is_active: z.boolean(),
  created_at: z.string(),
})

// Carte Memory
export const MemoryCardSchema = z.object({
  id: z.string().uuid(),
  card_set: z.string(),
  image_url: z.string(),
  label: z.string().nullable(),
  pair_id: z.string(),
  difficulty: QuizDifficultyEnum,
  is_active: z.boolean(),
  created_at: z.string(),
})

// Question Prédiction
export const PredictionQuestionSchema = z.object({
  id: z.string().uuid(),
  event_id: z.string().uuid().nullable(),
  question: z.string(),
  category: z.string(),
  options: z.array(z.string()),
  correct_option_index: z.number().nullable(),
  resolution_time: z.string().nullable(),
  points_for_correct: z.number(),
  bonus_points: z.number(),
  max_bonus_slots: z.number(),
  status: PredictionStatusEnum,
  total_predictions: z.number(),
  is_active: z.boolean(),
  created_at: z.string(),
})

// Prédiction utilisateur
export const UserPredictionSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  prediction_question_id: z.string().uuid(),
  selected_option_index: z.number(),
  confidence: z.number(),
  prediction_time: z.string(),
  is_correct: z.boolean().nullable(),
  points_earned: z.number(),
  bonus_earned: z.boolean(),
  created_at: z.string(),
})

// Score quotidien
export const DailyGameScoreSchema = z.object({
  user_id: z.string().uuid(),
  game_type_id: z.string().uuid(),
  score_date: z.string(),
  best_score: z.number(),
  games_played: z.number(),
  total_xp_earned: z.number(),
})

// Entrée leaderboard
export const LeaderboardEntrySchema = z.object({
  rank: z.number(),
  user_id: z.string().uuid(),
  pseudo: z.string(),
  avatar_url: z.string().nullable(),
  score: z.number(),
  games_played: z.number(),
  best_score: z.number().optional(),
})

/* ==========================================================================
   TYPES
   ========================================================================== */

export type MiniGameType = z.infer<typeof MiniGameTypeSchema>
export type GameSession = z.infer<typeof GameSessionSchema>
export type GameParticipant = z.infer<typeof GameParticipantSchema>
export type MusicQuizQuestion = z.infer<typeof MusicQuizQuestionSchema>
export type MemoryCard = z.infer<typeof MemoryCardSchema>
export type PredictionQuestion = z.infer<typeof PredictionQuestionSchema>
export type UserPrediction = z.infer<typeof UserPredictionSchema>
export type DailyGameScore = z.infer<typeof DailyGameScoreSchema>
export type LeaderboardEntry = z.infer<typeof LeaderboardEntrySchema>

/* ==========================================================================
   TYPES ENRICHIS
   ========================================================================== */

export interface GameSessionWithDetails extends GameSession {
  game_type: MiniGameType
  participants: GameParticipant[]
  host?: {
    pseudo: string
    avatar_url?: string
  }
}

export interface QuizGameState {
  currentQuestionIndex: number
  questions: MusicQuizQuestion[]
  answers: {
    questionId: string
    answerIndex: number
    isCorrect: boolean
    timeMs: number
  }[]
  totalScore: number
  startTime: number
}

export interface MemoryGameState {
  cards: Array<MemoryCard & { isFlipped: boolean; isMatched: boolean }>
  moves: number
  matchedPairs: number
  startTime: number
  firstCard: number | null
}

export interface PredictionQuestionWithUserPrediction extends PredictionQuestion {
  user_prediction?: UserPrediction
  option_stats?: Record<number, number> // Index → count
}

/* ==========================================================================
   HELPERS
   ========================================================================== */

/**
 * Calcule le score basé sur la vitesse de réponse
 */
export function calculateTimeBonus(
  timeMs: number,
  maxTimeMs: number,
  basePoints: number
): number {
  if (timeMs >= maxTimeMs) return basePoints
  const speedRatio = 1 - timeMs / maxTimeMs
  return Math.round(basePoints * (1 + speedRatio * 0.5))
}

/**
 * Mélange un tableau (Fisher-Yates)
 */
export function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array]
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }
  return shuffled
}

/**
 * Génère les cartes pour un jeu de Memory
 */
export function generateMemoryDeck(
  cards: MemoryCard[],
  pairsCount: number
): Array<MemoryCard & { isFlipped: boolean; isMatched: boolean; position: number }> {
  // Sélectionner des paires uniques
  const uniquePairs = new Map<string, MemoryCard[]>()
  cards.forEach((card) => {
    if (!uniquePairs.has(card.pair_id)) {
      uniquePairs.set(card.pair_id, [])
    }
    uniquePairs.get(card.pair_id)!.push(card)
  })

  // Prendre le nombre de paires demandé
  const selectedPairs = Array.from(uniquePairs.values())
    .filter((pair) => pair.length >= 2)
    .slice(0, pairsCount)
    .flatMap((pair) => pair.slice(0, 2))

  // Mélanger et ajouter les propriétés de jeu
  return shuffleArray(selectedPairs).map((card, index) => ({
    ...card,
    isFlipped: false,
    isMatched: false,
    position: index,
  }))
}

/**
 * Calcule le score Memory basé sur les mouvements
 */
export function calculateMemoryScore(
  moves: number,
  pairs: number,
  timeSeconds: number
): number {
  const perfectMoves = pairs // Minimum théorique
  const efficiency = Math.max(0, 1 - (moves - perfectMoves) / (perfectMoves * 2))
  const timeBonus = Math.max(0, 1 - timeSeconds / 120) * 0.3 // Bonus temps (2 min max)

  const baseScore = 1000
  return Math.round(baseScore * efficiency * (1 + timeBonus))
}

/**
 * Formate le temps restant
 */
export function formatGameTime(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins}:${secs.toString().padStart(2, "0")}`
}

/**
 * Génère un message de résultat
 */
export function getResultMessage(
  score: number,
  maxScore: number
): { title: string; subtitle: string; emoji: string } {
  const percentage = (score / maxScore) * 100

  if (percentage >= 90) {
    return {
      title: "Parfait !",
      subtitle: "Tu es un vrai pro !",
      emoji: "🏆",
    }
  }
  if (percentage >= 70) {
    return {
      title: "Excellent !",
      subtitle: "Super performance !",
      emoji: "🌟",
    }
  }
  if (percentage >= 50) {
    return {
      title: "Bien joué !",
      subtitle: "Tu peux faire encore mieux",
      emoji: "👏",
    }
  }
  if (percentage >= 30) {
    return {
      title: "Pas mal",
      subtitle: "Continue à t'entraîner",
      emoji: "💪",
    }
  }
  return {
    title: "Essaie encore",
    subtitle: "La pratique rend parfait",
    emoji: "🎯",
  }
}

/**
 * Calcule les XP gagnés pour un jeu
 */
export function calculateGameXp(
  baseXp: number,
  score: number,
  maxScore: number,
  isWinner: boolean = false
): number {
  const percentage = score / maxScore
  let xp = Math.round(baseXp * percentage)

  // Bonus gagnant
  if (isWinner) {
    xp = Math.round(xp * 1.5)
  }

  // Minimum 10 XP pour avoir joué
  return Math.max(10, xp)
}

/**
 * Vérifie si le cooldown est actif
 */
export function isCooldownActive(
  lastPlayedAt: string | null,
  cooldownMinutes: number
): { active: boolean; remainingSeconds: number } {
  if (!lastPlayedAt || cooldownMinutes === 0) {
    return { active: false, remainingSeconds: 0 }
  }

  const lastPlayed = new Date(lastPlayedAt)
  const cooldownEnd = new Date(lastPlayed.getTime() + cooldownMinutes * 60 * 1000)
  const now = new Date()

  if (now >= cooldownEnd) {
    return { active: false, remainingSeconds: 0 }
  }

  return {
    active: true,
    remainingSeconds: Math.ceil((cooldownEnd.getTime() - now.getTime()) / 1000),
  }
}

/**
 * Génère les options pour une question de prédiction
 */
export function generatePredictionOptions(
  category: string
): string[] {
  const templates: Record<string, string[]> = {
    dj: [
      "Le DJ sera incroyable",
      "Le DJ sera correct",
      "Le DJ sera décevant",
    ],
    attendance: [
      "Plus de 500 personnes",
      "Entre 300 et 500",
      "Moins de 300",
    ],
    music: [
      "Beaucoup de hits actuels",
      "Mix varié",
      "Surtout des classiques",
    ],
    vibe: [
      "Ambiance de folie !",
      "Bonne ambiance",
      "Ambiance moyenne",
    ],
  }

  return templates[category] || ["Option A", "Option B", "Option C"]
}
