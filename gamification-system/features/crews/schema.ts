/**
 * TEENS PARTY MOROCCO - Crews Schema
 * ===================================
 *
 * Définitions Zod et types TypeScript pour le système de crews.
 */

import { z } from "zod"

/* ==========================================================================
   ENUMS
   ========================================================================== */

export const CrewRoleEnum = z.enum(["owner", "admin", "member"])
export type CrewRole = z.infer<typeof CrewRoleEnum>

export const CrewMemberStatusEnum = z.enum(["pending", "active", "banned"])
export type CrewMemberStatus = z.infer<typeof CrewMemberStatusEnum>

export const CrewInvitationStatusEnum = z.enum([
  "pending",
  "accepted",
  "declined",
  "expired",
])
export type CrewInvitationStatus = z.infer<typeof CrewInvitationStatusEnum>

export const CrewJoinRequestStatusEnum = z.enum([
  "pending",
  "approved",
  "rejected",
])
export type CrewJoinRequestStatus = z.infer<typeof CrewJoinRequestStatusEnum>

export const CrewAchievementRarityEnum = z.enum([
  "common",
  "rare",
  "epic",
  "legendary",
])
export type CrewAchievementRarity = z.infer<typeof CrewAchievementRarityEnum>

/* ==========================================================================
   CONFIGURATION
   ========================================================================== */

export const CREW_ROLE_CONFIG: Record<
  CrewRole,
  {
    label: string
    color: string
    canInvite: boolean
    canKick: boolean
    canEdit: boolean
    canApproveRequests: boolean
  }
> = {
  owner: {
    label: "Propriétaire",
    color: "text-yellow-400",
    canInvite: true,
    canKick: true,
    canEdit: true,
    canApproveRequests: true,
  },
  admin: {
    label: "Admin",
    color: "text-purple-400",
    canInvite: true,
    canKick: true,
    canEdit: false,
    canApproveRequests: true,
  },
  member: {
    label: "Membre",
    color: "text-zinc-400",
    canInvite: false,
    canKick: false,
    canEdit: false,
    canApproveRequests: false,
  },
}

export const ACHIEVEMENT_RARITY_CONFIG: Record<
  CrewAchievementRarity,
  {
    label: string
    color: string
    bgColor: string
    borderColor: string
  }
> = {
  common: {
    label: "Commun",
    color: "text-zinc-400",
    bgColor: "bg-zinc-500/20",
    borderColor: "border-zinc-500/30",
  },
  rare: {
    label: "Rare",
    color: "text-blue-400",
    bgColor: "bg-blue-500/20",
    borderColor: "border-blue-500/30",
  },
  epic: {
    label: "Épique",
    color: "text-purple-400",
    bgColor: "bg-purple-500/20",
    borderColor: "border-purple-500/30",
  },
  legendary: {
    label: "Légendaire",
    color: "text-yellow-400",
    bgColor: "bg-yellow-500/20",
    borderColor: "border-yellow-500/30",
  },
}

export const ACTIVITY_TYPE_CONFIG: Record<
  string,
  {
    label: string
    icon: string
    color: string
  }
> = {
  crew_created: {
    label: "Crew créé",
    icon: "plus",
    color: "text-green-400",
  },
  member_joined: {
    label: "Nouveau membre",
    icon: "user-plus",
    color: "text-cyan-400",
  },
  member_left: {
    label: "Membre parti",
    icon: "user-minus",
    color: "text-red-400",
  },
  achievement_unlocked: {
    label: "Badge débloqué",
    icon: "award",
    color: "text-yellow-400",
  },
  xp_gained: {
    label: "XP gagné",
    icon: "zap",
    color: "text-yellow-400",
  },
  challenge_won: {
    label: "Défi gagné",
    icon: "trophy",
    color: "text-purple-400",
  },
  event_attended: {
    label: "Event participé",
    icon: "calendar",
    color: "text-pink-400",
  },
}

/* ==========================================================================
   SCHEMAS
   ========================================================================== */

export const CrewSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(2).max(50),
  slug: z.string(),
  description: z.string().nullable(),
  motto: z.string().nullable(),
  avatar_url: z.string().nullable(),
  banner_url: z.string().nullable(),
  color: z.string().default("#06b6d4"),
  badge_icon: z.string().default("users"),
  total_xp: z.number().default(0),
  total_events_attended: z.number().default(0),
  total_challenges_won: z.number().default(0),
  average_level: z.number().default(1),
  max_members: z.number().default(10),
  is_public: z.boolean().default(true),
  requires_approval: z.boolean().default(true),
  min_level_required: z.number().default(1),
  owner_id: z.string().uuid(),
  created_at: z.string().datetime(),
})

export type Crew = z.infer<typeof CrewSchema>

export const CrewMemberSchema = z.object({
  user_id: z.string().uuid(),
  pseudo: z.string(),
  avatar_url: z.string().nullable(),
  level: z.number(),
  role: CrewRoleEnum,
  xp_contributed: z.number().default(0),
  joined_at: z.string().datetime(),
})

export type CrewMember = z.infer<typeof CrewMemberSchema>

export const CrewAchievementSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  description: z.string().nullable(),
  icon: z.string(),
  color: z.string(),
  rarity: CrewAchievementRarityEnum,
  unlocked_at: z.string().datetime().optional(),
})

export type CrewAchievement = z.infer<typeof CrewAchievementSchema>

export const CrewInvitationSchema = z.object({
  id: z.string().uuid(),
  crew_id: z.string().uuid(),
  crew_name: z.string(),
  crew_avatar_url: z.string().nullable(),
  crew_color: z.string(),
  inviter_id: z.string().uuid(),
  inviter_pseudo: z.string(),
  inviter_avatar_url: z.string().nullable(),
  message: z.string().nullable(),
  status: CrewInvitationStatusEnum,
  created_at: z.string().datetime(),
  expires_at: z.string().datetime(),
})

export type CrewInvitation = z.infer<typeof CrewInvitationSchema>

export const CrewJoinRequestSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  pseudo: z.string(),
  avatar_url: z.string().nullable(),
  level: z.number(),
  message: z.string().nullable(),
  status: CrewJoinRequestStatusEnum,
  created_at: z.string().datetime(),
})

export type CrewJoinRequest = z.infer<typeof CrewJoinRequestSchema>

export const CrewActivitySchema = z.object({
  id: z.string().uuid(),
  crew_id: z.string().uuid(),
  user_id: z.string().uuid().nullable(),
  user_pseudo: z.string().nullable(),
  user_avatar_url: z.string().nullable(),
  activity_type: z.string(),
  description: z.string().nullable(),
  xp_amount: z.number().default(0),
  created_at: z.string().datetime(),
})

export type CrewActivity = z.infer<typeof CrewActivitySchema>

export const CrewLeaderboardEntrySchema = z.object({
  rank: z.number(),
  crew_id: z.string().uuid(),
  name: z.string(),
  slug: z.string(),
  avatar_url: z.string().nullable(),
  color: z.string(),
  total_xp: z.number(),
  member_count: z.number(),
  average_level: z.number(),
  owner_pseudo: z.string(),
})

export type CrewLeaderboardEntry = z.infer<typeof CrewLeaderboardEntrySchema>

export const UserCrewDataSchema = z.object({
  has_crew: z.boolean(),
  crew: CrewSchema.optional(),
  user_role: CrewRoleEnum.optional(),
  members: z.array(CrewMemberSchema).optional(),
  achievements: z.array(CrewAchievementSchema).optional(),
})

export type UserCrewData = z.infer<typeof UserCrewDataSchema>

/* ==========================================================================
   INPUT SCHEMAS
   ========================================================================== */

export const CreateCrewInputSchema = z.object({
  name: z.string().min(2).max(50),
  description: z.string().max(500).optional(),
  motto: z.string().max(100).optional(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  is_public: z.boolean().optional().default(true),
  requires_approval: z.boolean().optional().default(true),
})

export type CreateCrewInput = z.infer<typeof CreateCrewInputSchema>

export const UpdateCrewInputSchema = z.object({
  name: z.string().min(2).max(50).optional(),
  description: z.string().max(500).optional(),
  motto: z.string().max(100).optional(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  is_public: z.boolean().optional(),
  requires_approval: z.boolean().optional(),
  min_level_required: z.number().min(1).max(100).optional(),
})

export type UpdateCrewInput = z.infer<typeof UpdateCrewInputSchema>

export const InviteToCrewInputSchema = z.object({
  crewId: z.string().uuid(),
  inviteeId: z.string().uuid(),
  message: z.string().max(200).optional(),
})

export type InviteToCrewInput = z.infer<typeof InviteToCrewInputSchema>

/* ==========================================================================
   HELPER FUNCTIONS
   ========================================================================== */

/**
 * Vérifie si un utilisateur peut effectuer une action
 */
export function canPerformAction(
  role: CrewRole,
  action: "invite" | "kick" | "edit" | "approveRequests"
): boolean {
  const config = CREW_ROLE_CONFIG[role]
  switch (action) {
    case "invite":
      return config.canInvite
    case "kick":
      return config.canKick
    case "edit":
      return config.canEdit
    case "approveRequests":
      return config.canApproveRequests
    default:
      return false
  }
}

/**
 * Formate le nombre de membres
 */
export function formatMemberCount(count: number, max: number): string {
  return `${count}/${max} membres`
}

/**
 * Calcule le rang suivant basé sur l'XP
 */
export function getCrewTier(totalXp: number): {
  tier: string
  color: string
  minXp: number
  nextTierXp: number | null
} {
  const tiers = [
    { tier: "Bronze", color: "#cd7f32", minXp: 0, nextTierXp: 10000 },
    { tier: "Argent", color: "#c0c0c0", minXp: 10000, nextTierXp: 50000 },
    { tier: "Or", color: "#ffd700", minXp: 50000, nextTierXp: 100000 },
    { tier: "Platine", color: "#e5e4e2", minXp: 100000, nextTierXp: 250000 },
    { tier: "Diamant", color: "#b9f2ff", minXp: 250000, nextTierXp: 500000 },
    { tier: "Légendaire", color: "#ff6b6b", minXp: 500000, nextTierXp: null },
  ]

  for (let i = tiers.length - 1; i >= 0; i--) {
    if (totalXp >= tiers[i].minXp) {
      return tiers[i]
    }
  }

  return tiers[0]
}

/**
 * Calcule la progression vers le tier suivant
 */
export function getTierProgress(totalXp: number): number {
  const tier = getCrewTier(totalXp)
  if (!tier.nextTierXp) return 100

  const progressInTier = totalXp - tier.minXp
  const tierRange = tier.nextTierXp - tier.minXp

  return Math.min(100, Math.round((progressInTier / tierRange) * 100))
}

/**
 * Formate l'XP pour affichage
 */
export function formatCrewXp(xp: number): string {
  if (xp >= 1000000) {
    return `${(xp / 1000000).toFixed(1)}M`
  }
  if (xp >= 1000) {
    return `${(xp / 1000).toFixed(1)}K`
  }
  return xp.toString()
}

/**
 * Trie les membres par contribution
 */
export function sortMembersByContribution(
  members: CrewMember[]
): CrewMember[] {
  return [...members].sort((a, b) => {
    // D'abord par rôle
    const roleOrder: Record<CrewRole, number> = { owner: 0, admin: 1, member: 2 }
    if (roleOrder[a.role] !== roleOrder[b.role]) {
      return roleOrder[a.role] - roleOrder[b.role]
    }
    // Ensuite par XP contribué
    return b.xp_contributed - a.xp_contributed
  })
}

/**
 * Vérifie si une invitation est expirée
 */
export function isInvitationExpired(expiresAt: string): boolean {
  return new Date(expiresAt) < new Date()
}

/**
 * Génère un message d'invitation par défaut
 */
export function generateInvitationMessage(
  crewName: string,
  inviterPseudo: string
): string {
  return `${inviterPseudo} t'invite à rejoindre le crew "${crewName}" !`
}

/**
 * Valide le nom d'un crew
 */
export function validateCrewName(name: string): {
  valid: boolean
  error?: string
} {
  if (name.length < 2) {
    return { valid: false, error: "Le nom doit faire au moins 2 caractères" }
  }
  if (name.length > 50) {
    return { valid: false, error: "Le nom ne peut pas dépasser 50 caractères" }
  }
  if (!/^[a-zA-Z0-9À-ÿ\s\-_]+$/.test(name)) {
    return {
      valid: false,
      error: "Le nom ne peut contenir que des lettres, chiffres, espaces, tirets et underscores",
    }
  }
  return { valid: true }
}
