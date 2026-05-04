/**
 * TEENS PARTY MOROCCO - Friend Challenges Schema
 * ===============================================
 *
 * Définitions Zod et types TypeScript pour les défis entre amis.
 */

import { z } from "zod"

/* ==========================================================================
   ENUMS
   ========================================================================== */

export const ChallengeModeEnum = z.enum(["duel", "team", "race", "coop"])
export type ChallengeMode = z.infer<typeof ChallengeModeEnum>

export const ChallengeStatusEnum = z.enum([
  "pending",
  "active",
  "completed",
  "cancelled",
  "expired",
])
export type ChallengeStatus = z.infer<typeof ChallengeStatusEnum>

export const ParticipantStatusEnum = z.enum([
  "pending",
  "accepted",
  "declined",
  "left",
])
export type ParticipantStatus = z.infer<typeof ParticipantStatusEnum>

export const ObjectiveTypeEnum = z.enum([
  "xp_total",
  "xp_daily",
  "challenges_completed",
  "events_attended",
  "streak_days",
  "missions_completed",
  "first_to_target",
  "highest_score",
])
export type ObjectiveType = z.infer<typeof ObjectiveTypeEnum>

/* ==========================================================================
   CONFIGURATION
   ========================================================================== */

export const CHALLENGE_MODE_CONFIG: Record<
  ChallengeMode,
  {
    label: string
    description: string
    icon: string
    color: string
  }
> = {
  duel: {
    label: "Duel",
    description: "1 contre 1",
    icon: "swords",
    color: "text-cyan-400",
  },
  team: {
    label: "Équipe",
    description: "Équipe vs Équipe",
    icon: "users",
    color: "text-purple-400",
  },
  race: {
    label: "Course",
    description: "Premier arrivé",
    icon: "trophy",
    color: "text-yellow-400",
  },
  coop: {
    label: "Coop",
    description: "Objectif commun",
    icon: "heart",
    color: "text-pink-400",
  },
}

export const CHALLENGE_STATUS_CONFIG: Record<
  ChallengeStatus,
  {
    label: string
    color: string
    bgColor: string
  }
> = {
  pending: {
    label: "En attente",
    color: "text-yellow-400",
    bgColor: "bg-yellow-500/20",
  },
  active: {
    label: "En cours",
    color: "text-green-400",
    bgColor: "bg-green-500/20",
  },
  completed: {
    label: "Terminé",
    color: "text-blue-400",
    bgColor: "bg-blue-500/20",
  },
  cancelled: {
    label: "Annulé",
    color: "text-zinc-400",
    bgColor: "bg-zinc-500/20",
  },
  expired: {
    label: "Expiré",
    color: "text-red-400",
    bgColor: "bg-red-500/20",
  },
}

export const OBJECTIVE_TYPE_CONFIG: Record<
  ObjectiveType,
  {
    label: string
    unit: string
    icon: string
  }
> = {
  xp_total: { label: "XP Total", unit: "XP", icon: "zap" },
  xp_daily: { label: "XP Quotidien", unit: "XP", icon: "sun" },
  challenges_completed: { label: "Défis complétés", unit: "défis", icon: "target" },
  events_attended: { label: "Events", unit: "events", icon: "calendar" },
  streak_days: { label: "Jours de streak", unit: "jours", icon: "flame" },
  missions_completed: { label: "Missions", unit: "missions", icon: "flag" },
  first_to_target: { label: "Premier à", unit: "", icon: "flag-checkered" },
  highest_score: { label: "Meilleur score", unit: "pts", icon: "crown" },
}

/* ==========================================================================
   CHALLENGE TYPE SCHEMA
   ========================================================================== */

export const ChallengeTypeSchema = z.object({
  id: z.string().uuid(),
  slug: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  icon: z.string(),
  color: z.string(),
  mode: ChallengeModeEnum,
  min_participants: z.number(),
  max_participants: z.number(),
  objective_type: ObjectiveTypeEnum,
  default_target: z.number().nullable(),
  default_duration_hours: z.number(),
  winner_xp: z.number(),
  participant_xp: z.number(),
  draw_xp: z.number().nullable(),
})

export type ChallengeType = z.infer<typeof ChallengeTypeSchema>

/* ==========================================================================
   PARTICIPANT SCHEMA
   ========================================================================== */

export const ChallengeParticipantSchema = z.object({
  user_id: z.string().uuid(),
  pseudo: z.string(),
  avatar_url: z.string().nullable(),
  team: z.enum(["a", "b"]).nullable(),
  status: ParticipantStatusEnum,
  score: z.number(),
  is_winner: z.boolean(),
})

export type ChallengeParticipant = z.infer<typeof ChallengeParticipantSchema>

/* ==========================================================================
   FRIEND CHALLENGE SCHEMA
   ========================================================================== */

export const FriendChallengeSchema = z.object({
  challenge_id: z.string().uuid(),
  challenge_name: z.string(),
  challenge_type_slug: z.string(),
  challenge_type_name: z.string(),
  mode: ChallengeModeEnum,
  icon: z.string(),
  color: z.string(),
  target_value: z.number().nullable(),
  stake_xp: z.number(),
  status: ChallengeStatusEnum,
  starts_at: z.string().datetime(),
  ends_at: z.string().datetime(),
  is_creator: z.boolean(),
  user_score: z.number(),
  user_team: z.enum(["a", "b"]).nullable(),
  participants: z.array(ChallengeParticipantSchema),
  winner_id: z.string().uuid().nullable(),
  winning_team: z.enum(["a", "b"]).nullable(),
  is_draw: z.boolean(),
})

export type FriendChallenge = z.infer<typeof FriendChallengeSchema>

/* ==========================================================================
   INPUT SCHEMAS
   ========================================================================== */

export const CreateChallengeInputSchema = z.object({
  challengeTypeSlug: z.string(),
  invitedUserIds: z.array(z.string().uuid()),
  name: z.string().optional(),
  targetValue: z.number().optional(),
  durationHours: z.number().optional(),
  stakeXp: z.number().min(0).optional().default(0),
})

export type CreateChallengeInput = z.infer<typeof CreateChallengeInputSchema>

export const RespondToChallengeInputSchema = z.object({
  challengeId: z.string().uuid(),
  accept: z.boolean(),
})

export type RespondToChallengeInput = z.infer<typeof RespondToChallengeInputSchema>

/* ==========================================================================
   HELPER FUNCTIONS
   ========================================================================== */

/**
 * Calcule le temps restant avant la fin du défi
 */
export function getTimeRemaining(endsAt: string): {
  text: string
  urgent: boolean
  expired: boolean
} {
  const now = new Date()
  const end = new Date(endsAt)
  const diff = end.getTime() - now.getTime()

  if (diff <= 0) {
    return { text: "Terminé", urgent: false, expired: true }
  }

  const days = Math.floor(diff / (1000 * 60 * 60 * 24))
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))

  const urgent = diff < 24 * 60 * 60 * 1000 // Moins de 24h

  if (days > 0) {
    return { text: `${days}j ${hours}h`, urgent, expired: false }
  }
  if (hours > 0) {
    return { text: `${hours}h ${minutes}m`, urgent, expired: false }
  }
  return { text: `${minutes}m`, urgent: true, expired: false }
}

/**
 * Calcule le classement des participants
 */
export function getRankedParticipants(
  participants: ChallengeParticipant[]
): Array<ChallengeParticipant & { rank: number }> {
  const sorted = [...participants]
    .filter((p) => p.status === "accepted")
    .sort((a, b) => b.score - a.score)

  let currentRank = 1
  return sorted.map((p, index) => {
    if (index > 0 && sorted[index - 1].score > p.score) {
      currentRank = index + 1
    }
    return { ...p, rank: currentRank }
  })
}

/**
 * Calcule le score total d'une équipe
 */
export function getTeamScore(
  participants: ChallengeParticipant[],
  team: "a" | "b"
): number {
  return participants
    .filter((p) => p.team === team && p.status === "accepted")
    .reduce((sum, p) => sum + p.score, 0)
}

/**
 * Détermine le leader actuel
 */
export function getCurrentLeader(
  challenge: FriendChallenge
): ChallengeParticipant | null {
  if (challenge.mode === "team") {
    return null // Pas de leader individuel en mode équipe
  }

  const ranked = getRankedParticipants(challenge.participants)
  return ranked[0] || null
}

/**
 * Calcule la progression vers l'objectif
 */
export function calculateProgress(
  currentScore: number,
  targetValue: number | null
): number {
  if (!targetValue || targetValue <= 0) return 0
  return Math.min(100, Math.round((currentScore / targetValue) * 100))
}

/**
 * Formate le score selon le type d'objectif
 */
export function formatScore(
  score: number,
  objectiveType: ObjectiveType
): string {
  const config = OBJECTIVE_TYPE_CONFIG[objectiveType]
  if (score >= 1000) {
    return `${(score / 1000).toFixed(1)}K ${config.unit}`
  }
  return `${score} ${config.unit}`
}

/**
 * Génère un nom de défi par défaut
 */
export function generateChallengeName(
  type: ChallengeType,
  creatorPseudo: string
): string {
  return `${type.name} de ${creatorPseudo}`
}

/**
 * Vérifie si l'utilisateur peut créer ce type de défi
 */
export function canCreateChallenge(
  type: ChallengeType,
  userLevel: number,
  userXp: number,
  stakeXp: number
): { canCreate: boolean; reason?: string } {
  if (stakeXp > 0 && userXp < stakeXp) {
    return {
      canCreate: false,
      reason: `Tu n'as pas assez d'XP pour miser ${stakeXp} XP`,
    }
  }

  return { canCreate: true }
}
