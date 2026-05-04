/**
 * TEENS PARTY MOROCCO - Crew Members List
 * ========================================
 *
 * Liste des membres d'un crew avec actions.
 */

"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  Users,
  Crown,
  Shield,
  User,
  MoreVertical,
  UserMinus,
  ChevronUp,
  ChevronDown,
  Zap,
  Search,
  Loader2,
} from "lucide-react"
import {
  type CrewMember,
  type CrewRole,
  CREW_ROLE_CONFIG,
  sortMembersByContribution,
  formatCrewXp,
} from "../../features/crews"

/* ==========================================================================
   TYPES
   ========================================================================== */

interface CrewMembersListProps {
  members: CrewMember[]
  currentUserId: string
  currentUserRole: CrewRole
  onPromote?: (userId: string) => Promise<void>
  onDemote?: (userId: string) => Promise<void>
  onKick?: (userId: string) => Promise<void>
  showActions?: boolean
}

/* ==========================================================================
   ROLE ICONS
   ========================================================================== */

const roleIcons: Record<CrewRole, React.ReactNode> = {
  owner: <Crown className="w-4 h-4" />,
  admin: <Shield className="w-4 h-4" />,
  member: <User className="w-4 h-4" />,
}

/* ==========================================================================
   MAIN COMPONENT
   ========================================================================== */

export function CrewMembersList({
  members,
  currentUserId,
  currentUserRole,
  onPromote,
  onDemote,
  onKick,
  showActions = true,
}: CrewMembersListProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [expandedMember, setExpandedMember] = useState<string | null>(null)
  const [loadingAction, setLoadingAction] = useState<string | null>(null)

  const sortedMembers = sortMembersByContribution(members)
  const filteredMembers = sortedMembers.filter((m) =>
    m.pseudo.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const canManageMember = (targetRole: CrewRole): boolean => {
    if (currentUserRole === "owner") return targetRole !== "owner"
    if (currentUserRole === "admin") return targetRole === "member"
    return false
  }

  const handleAction = async (
    action: "promote" | "demote" | "kick",
    userId: string
  ) => {
    setLoadingAction(`${action}-${userId}`)
    try {
      if (action === "promote" && onPromote) await onPromote(userId)
      if (action === "demote" && onDemote) await onDemote(userId)
      if (action === "kick" && onKick) await onKick(userId)
    } finally {
      setLoadingAction(null)
      setExpandedMember(null)
    }
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="font-bold text-white flex items-center gap-2">
          <Users className="w-5 h-5 text-cyan-400" />
          Membres ({members.length})
        </h3>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
        <input
          type="text"
          placeholder="Rechercher un membre..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-10 pr-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder:text-zinc-500 focus:outline-none focus:border-cyan-500"
        />
      </div>

      {/* Members List */}
      <div className="space-y-2">
        {filteredMembers.map((member, index) => {
          const isCurrentUser = member.user_id === currentUserId
          const canManage = canManageMember(member.role) && !isCurrentUser
          const isExpanded = expandedMember === member.user_id
          const roleConfig = CREW_ROLE_CONFIG[member.role]

          return (
            <motion.div
              key={member.user_id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.03 }}
              className={`rounded-xl overflow-hidden ${
                isCurrentUser
                  ? "bg-cyan-500/10 border border-cyan-500/30"
                  : "bg-zinc-800/50"
              }`}
            >
              <div className="flex items-center gap-3 p-3">
                {/* Rank */}
                <div className="w-6 text-center">
                  <span
                    className={`text-sm font-bold ${
                      index === 0
                        ? "text-yellow-400"
                        : index === 1
                        ? "text-zinc-400"
                        : index === 2
                        ? "text-amber-600"
                        : "text-zinc-500"
                    }`}
                  >
                    #{index + 1}
                  </span>
                </div>

                {/* Avatar */}
                <div className="relative">
                  <div className="w-10 h-10 rounded-full bg-zinc-700 overflow-hidden">
                    {member.avatar_url ? (
                      <img
                        src={member.avatar_url}
                        alt={member.pseudo}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-zinc-400 font-bold">
                        {member.pseudo.charAt(0).toUpperCase()}
                      </div>
                    )}
                  </div>

                  {/* Role badge */}
                  <div
                    className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center ${
                      member.role === "owner"
                        ? "bg-yellow-500 text-black"
                        : member.role === "admin"
                        ? "bg-purple-500 text-white"
                        : "bg-zinc-600 text-zinc-300"
                    }`}
                  >
                    {roleIcons[member.role]}
                  </div>
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p
                      className={`font-medium truncate ${
                        isCurrentUser ? "text-cyan-400" : "text-white"
                      }`}
                    >
                      {member.pseudo}
                    </p>
                    {isCurrentUser && (
                      <span className="text-xs text-cyan-400">(toi)</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <span className={roleConfig.color}>{roleConfig.label}</span>
                    <span className="text-zinc-500">•</span>
                    <span className="text-zinc-400">Niv. {member.level}</span>
                  </div>
                </div>

                {/* XP Contributed */}
                <div className="text-right">
                  <p className="text-yellow-400 font-bold flex items-center gap-1">
                    <Zap className="w-3 h-3" />
                    {formatCrewXp(member.xp_contributed)}
                  </p>
                  <p className="text-xs text-zinc-500">contribué</p>
                </div>

                {/* Actions Button */}
                {showActions && canManage && (
                  <button
                    onClick={() =>
                      setExpandedMember(isExpanded ? null : member.user_id)
                    }
                    className="p-2 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-700 transition-colors"
                  >
                    <MoreVertical className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Expanded Actions */}
              <AnimatePresence>
                {isExpanded && canManage && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="px-3 pb-3 pt-1 flex gap-2 border-t border-zinc-700/50">
                      {/* Promote */}
                      {currentUserRole === "owner" && member.role === "member" && (
                        <button
                          onClick={() => handleAction("promote", member.user_id)}
                          disabled={loadingAction !== null}
                          className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg bg-purple-500/20 text-purple-400 hover:bg-purple-500/30 transition-colors disabled:opacity-50"
                        >
                          {loadingAction === `promote-${member.user_id}` ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <>
                              <ChevronUp className="w-4 h-4" />
                              Promouvoir
                            </>
                          )}
                        </button>
                      )}

                      {/* Demote */}
                      {currentUserRole === "owner" && member.role === "admin" && (
                        <button
                          onClick={() => handleAction("demote", member.user_id)}
                          disabled={loadingAction !== null}
                          className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg bg-zinc-700/50 text-zinc-400 hover:bg-zinc-700 transition-colors disabled:opacity-50"
                        >
                          {loadingAction === `demote-${member.user_id}` ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <>
                              <ChevronDown className="w-4 h-4" />
                              Rétrograder
                            </>
                          )}
                        </button>
                      )}

                      {/* Kick */}
                      <button
                        onClick={() => handleAction("kick", member.user_id)}
                        disabled={loadingAction !== null}
                        className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-colors disabled:opacity-50"
                      >
                        {loadingAction === `kick-${member.user_id}` ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <>
                            <UserMinus className="w-4 h-4" />
                            Expulser
                          </>
                        )}
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )
        })}

        {filteredMembers.length === 0 && (
          <div className="text-center py-8 text-zinc-400">
            {searchQuery
              ? "Aucun membre trouvé"
              : "Aucun membre dans ce crew"}
          </div>
        )}
      </div>
    </div>
  )
}

/* ==========================================================================
   MEMBER CONTRIBUTION CHART
   ========================================================================== */

interface MemberContributionChartProps {
  members: CrewMember[]
  maxDisplayed?: number
}

export function MemberContributionChart({
  members,
  maxDisplayed = 5,
}: MemberContributionChartProps) {
  const sortedMembers = sortMembersByContribution(members).slice(0, maxDisplayed)
  const maxXp = Math.max(...sortedMembers.map((m) => m.xp_contributed), 1)

  return (
    <div className="space-y-3">
      <h4 className="font-medium text-white text-sm">Top contributeurs</h4>

      {sortedMembers.map((member, index) => {
        const percentage = (member.xp_contributed / maxXp) * 100

        return (
          <div key={member.user_id} className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="text-white truncate flex-1">{member.pseudo}</span>
              <span className="text-yellow-400 font-medium">
                {formatCrewXp(member.xp_contributed)} XP
              </span>
            </div>
            <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
              <motion.div
                className={`h-full rounded-full ${
                  index === 0
                    ? "bg-yellow-500"
                    : index === 1
                    ? "bg-zinc-400"
                    : index === 2
                    ? "bg-amber-600"
                    : "bg-cyan-500"
                }`}
                initial={{ width: 0 }}
                animate={{ width: `${percentage}%` }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
              />
            </div>
          </div>
        )
      })}
    </div>
  )
}

/* ==========================================================================
   MEMBER AVATAR STACK
   ========================================================================== */

interface MemberAvatarStackProps {
  members: CrewMember[]
  maxDisplayed?: number
  size?: "sm" | "md" | "lg"
}

export function MemberAvatarStack({
  members,
  maxDisplayed = 5,
  size = "md",
}: MemberAvatarStackProps) {
  const displayedMembers = members.slice(0, maxDisplayed)
  const remainingCount = Math.max(0, members.length - maxDisplayed)

  const sizeClasses = {
    sm: "w-6 h-6 text-xs",
    md: "w-8 h-8 text-sm",
    lg: "w-10 h-10 text-base",
  }

  const overlapClasses = {
    sm: "-ml-2",
    md: "-ml-3",
    lg: "-ml-4",
  }

  return (
    <div className="flex items-center">
      {displayedMembers.map((member, index) => (
        <div
          key={member.user_id}
          className={`${sizeClasses[size]} rounded-full bg-zinc-700 overflow-hidden border-2 border-zinc-900 ${
            index > 0 ? overlapClasses[size] : ""
          }`}
          style={{ zIndex: displayedMembers.length - index }}
        >
          {member.avatar_url ? (
            <img
              src={member.avatar_url}
              alt={member.pseudo}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-zinc-400 font-bold">
              {member.pseudo.charAt(0).toUpperCase()}
            </div>
          )}
        </div>
      ))}

      {remainingCount > 0 && (
        <div
          className={`${sizeClasses[size]} ${overlapClasses[size]} rounded-full bg-zinc-700 border-2 border-zinc-900 flex items-center justify-center text-zinc-400 font-bold`}
        >
          +{remainingCount}
        </div>
      )}
    </div>
  )
}
