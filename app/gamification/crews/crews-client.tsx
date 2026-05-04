"use client"

/**
 * TEENS PARTY MOROCCO - Crews Client Component
 * =============================================
 */

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  Users,
  Trophy,
  Zap,
  Crown,
  Plus,
  Settings,
  LogOut,
  UserPlus,
  Shield,
  Lock,
  Globe,
  Check,
  X,
} from "lucide-react"
import {
  createCrew,
  joinCrew,
  leaveCrew,
} from "@/gamification-system/features/crews/actions"

/* ==========================================================================
   TYPES
   ========================================================================== */

interface Crew {
  id: string
  name: string
  slug: string
  description: string
  motto: string
  color: string
  avatar_url: string | null
  total_xp: number
  current_level: number
  is_public: boolean
  requires_approval: boolean
  members_count?: { count: number }[]
}

interface UserCrewData {
  crew: Crew | null
  role: string
  joined_at: string
  contribution_xp: number
  crew_rank: number
  members: Array<{
    user_id: string
    pseudo: string
    avatar_url: string
    role: string
    contribution_xp: number
  }>
}

interface CrewsClientProps {
  userCrew: UserCrewData | null
  publicCrews: Crew[]
  crewLeaderboard: Crew[]
  userId: string
}

/* ==========================================================================
   MAIN COMPONENT
   ========================================================================== */

export function CrewsClient({ userCrew, publicCrews, crewLeaderboard, userId }: CrewsClientProps) {
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [isJoining, setIsJoining] = useState<string | null>(null)
  const [isLeaving, setIsLeaving] = useState(false)

  const handleJoinCrew = async (crewId: string) => {
    setIsJoining(crewId)
    try {
      await joinCrew(crewId)
      window.location.reload()
    } finally {
      setIsJoining(null)
    }
  }

  const handleLeaveCrew = async () => {
    if (!userCrew?.crew) return
    setIsLeaving(true)
    try {
      await leaveCrew(userCrew.crew.id)
      window.location.reload()
    } finally {
      setIsLeaving(false)
    }
  }

  return (
    <div className="space-y-12">
      {/* User's Crew */}
      {userCrew?.crew ? (
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
            <Shield className="w-6 h-6" style={{ color: userCrew.crew.color }} />
            Ton Crew
          </h2>

          <div
            className="p-6 rounded-2xl border"
            style={{
              backgroundColor: `${userCrew.crew.color}10`,
              borderColor: `${userCrew.crew.color}30`,
            }}
          >
            <div className="flex items-center gap-4 mb-6">
              <div
                className="w-16 h-16 rounded-xl flex items-center justify-center text-2xl font-black text-white"
                style={{ backgroundColor: userCrew.crew.color }}
              >
                {userCrew.crew.name.charAt(0)}
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-bold text-white">{userCrew.crew.name}</h3>
                <p className="text-zinc-400">{userCrew.crew.motto || userCrew.crew.description}</p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold" style={{ color: userCrew.crew.color }}>
                  #{userCrew.crew_rank}
                </p>
                <p className="text-xs text-zinc-500">Rang</p>
              </div>
            </div>

            {/* Crew Stats */}
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="bg-zinc-900/50 rounded-xl p-3 text-center">
                <Zap className="w-5 h-5 text-yellow-400 mx-auto mb-1" />
                <p className="font-bold text-white">{userCrew.crew.total_xp.toLocaleString()}</p>
                <p className="text-xs text-zinc-500">XP Total</p>
              </div>
              <div className="bg-zinc-900/50 rounded-xl p-3 text-center">
                <Users className="w-5 h-5 text-blue-400 mx-auto mb-1" />
                <p className="font-bold text-white">{userCrew.members?.length || 0}</p>
                <p className="text-xs text-zinc-500">Membres</p>
              </div>
              <div className="bg-zinc-900/50 rounded-xl p-3 text-center">
                <Trophy className="w-5 h-5 text-purple-400 mx-auto mb-1" />
                <p className="font-bold text-white">Nv.{userCrew.crew.current_level}</p>
                <p className="text-xs text-zinc-500">Niveau</p>
              </div>
            </div>

            {/* Members */}
            <div className="mb-6">
              <h4 className="text-sm font-medium text-zinc-400 mb-3">Membres</h4>
              <div className="flex flex-wrap gap-2">
                {userCrew.members?.slice(0, 10).map((member) => (
                  <div
                    key={member.user_id}
                    className="flex items-center gap-2 px-3 py-1.5 bg-zinc-800/50 rounded-full"
                  >
                    <img
                      src={member.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${member.user_id}`}
                      alt={member.pseudo}
                      className="w-6 h-6 rounded-full"
                    />
                    <span className="text-sm text-white">{member.pseudo}</span>
                    {member.role === "owner" && <Crown className="w-3 h-3 text-yellow-400" />}
                    {member.role === "admin" && <Shield className="w-3 h-3 text-blue-400" />}
                  </div>
                ))}
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              {userCrew.role !== "owner" && (
                <button
                  onClick={handleLeaveCrew}
                  disabled={isLeaving}
                  className="flex items-center gap-2 px-4 py-2 bg-red-500/20 text-red-400 rounded-xl hover:bg-red-500/30 transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  {isLeaving ? "..." : "Quitter"}
                </button>
              )}
              {(userCrew.role === "owner" || userCrew.role === "admin") && (
                <button className="flex items-center gap-2 px-4 py-2 bg-zinc-800 text-white rounded-xl hover:bg-zinc-700 transition-colors">
                  <Settings className="w-4 h-4" />
                  Gérer
                </button>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="max-w-xl mx-auto text-center">
          <div className="p-8 rounded-2xl bg-zinc-800/50 border border-zinc-700/50">
            <Users className="w-16 h-16 text-zinc-600 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-white mb-2">Tu n'as pas encore de crew</h3>
            <p className="text-zinc-400 mb-6">
              Rejoins un crew existant ou crée le tien pour gagner des bonus et monter dans le leaderboard !
            </p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-2 px-6 py-3 mx-auto bg-gradient-to-r from-blue-500 to-purple-500 text-white font-bold rounded-xl hover:from-blue-400 hover:to-purple-400 transition-colors"
            >
              <Plus className="w-5 h-5" />
              Créer un Crew
            </button>
          </div>
        </div>
      )}

      {/* Crew Leaderboard */}
      <div>
        <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
          <Trophy className="w-6 h-6 text-yellow-400" />
          Top Crews
        </h2>

        <div className="space-y-3">
          {crewLeaderboard.map((crew, index) => (
            <motion.div
              key={crew.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
              className="flex items-center gap-4 p-4 rounded-xl bg-zinc-800/50 border border-zinc-700/50"
            >
              {/* Rank */}
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center font-bold ${
                index === 0 ? "bg-yellow-500 text-black" :
                index === 1 ? "bg-zinc-400 text-black" :
                index === 2 ? "bg-amber-700 text-white" :
                "bg-zinc-700 text-zinc-400"
              }`}>
                {index + 1}
              </div>

              {/* Crew Info */}
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center text-lg font-bold text-white"
                style={{ backgroundColor: crew.color }}
              >
                {crew.name.charAt(0)}
              </div>
              <div className="flex-1">
                <p className="font-bold text-white">{crew.name}</p>
                <p className="text-xs text-zinc-500">Niveau {crew.current_level}</p>
              </div>

              {/* XP */}
              <div className="text-right">
                <p className="font-bold text-yellow-400">{crew.total_xp.toLocaleString()} XP</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Browse Crews */}
      {!userCrew?.crew && (
        <div>
          <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
            <Globe className="w-6 h-6 text-cyan-400" />
            Crews Publics
          </h2>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {publicCrews.map((crew) => (
              <div
                key={crew.id}
                className="p-4 rounded-xl border transition-colors hover:border-opacity-100"
                style={{
                  backgroundColor: `${crew.color}10`,
                  borderColor: `${crew.color}30`,
                }}
              >
                <div className="flex items-center gap-3 mb-3">
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center text-lg font-bold text-white"
                    style={{ backgroundColor: crew.color }}
                  >
                    {crew.name.charAt(0)}
                  </div>
                  <div className="flex-1">
                    <p className="font-bold text-white">{crew.name}</p>
                    <p className="text-xs text-zinc-500">
                      {crew.members_count?.[0]?.count || 0} membres
                    </p>
                  </div>
                  {crew.requires_approval ? (
                    <Lock className="w-4 h-4 text-zinc-500" />
                  ) : (
                    <Globe className="w-4 h-4 text-green-400" />
                  )}
                </div>

                <p className="text-sm text-zinc-400 mb-4 line-clamp-2">
                  {crew.description || crew.motto || "Pas de description"}
                </p>

                <button
                  onClick={() => handleJoinCrew(crew.id)}
                  disabled={isJoining === crew.id}
                  className="w-full py-2 rounded-lg font-medium transition-colors"
                  style={{
                    backgroundColor: `${crew.color}20`,
                    color: crew.color,
                  }}
                >
                  {isJoining === crew.id ? "..." : crew.requires_approval ? "Demander" : "Rejoindre"}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Create Crew Modal */}
      <CreateCrewModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
      />
    </div>
  )
}

/* ==========================================================================
   CREATE CREW MODAL
   ========================================================================== */

function CreateCrewModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [motto, setMotto] = useState("")
  const [color, setColor] = useState("#06b6d4")
  const [isPublic, setIsPublic] = useState(true)
  const [requiresApproval, setRequiresApproval] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const colors = ["#06b6d4", "#22c55e", "#f97316", "#ec4899", "#a855f7", "#eab308", "#ef4444"]

  const handleCreate = async () => {
    if (!name.trim() || isSubmitting) return

    setIsSubmitting(true)
    try {
      const result = await createCrew({
        name,
        description,
        motto,
        color,
        is_public: isPublic,
        requires_approval: requiresApproval,
      })

      if (result.success) {
        window.location.reload()
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />

      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="relative w-full max-w-lg bg-zinc-900 rounded-2xl overflow-hidden"
      >
        <div className="p-6 border-b border-zinc-800">
          <h2 className="text-xl font-bold text-white">Créer un Crew</h2>
        </div>

        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm text-zinc-400 mb-2">Nom du Crew *</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Les Invincibles"
              maxLength={30}
              className="w-full px-4 py-3 rounded-xl bg-zinc-800 border border-zinc-700 text-white placeholder-zinc-500 focus:border-cyan-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-sm text-zinc-400 mb-2">Devise</label>
            <input
              type="text"
              value={motto}
              onChange={(e) => setMotto(e.target.value)}
              placeholder="Unis pour vaincre !"
              maxLength={50}
              className="w-full px-4 py-3 rounded-xl bg-zinc-800 border border-zinc-700 text-white placeholder-zinc-500 focus:border-cyan-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-sm text-zinc-400 mb-2">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Décris ton crew..."
              rows={3}
              className="w-full px-4 py-3 rounded-xl bg-zinc-800 border border-zinc-700 text-white placeholder-zinc-500 focus:border-cyan-500 focus:outline-none resize-none"
            />
          </div>

          <div>
            <label className="block text-sm text-zinc-400 mb-2">Couleur</label>
            <div className="flex gap-2">
              {colors.map((c) => (
                <button
                  key={c}
                  onClick={() => setColor(c)}
                  className={`w-10 h-10 rounded-lg transition-transform ${
                    color === c ? "scale-110 ring-2 ring-white" : ""
                  }`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>

          <div className="flex gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={isPublic}
                onChange={(e) => setIsPublic(e.target.checked)}
                className="w-4 h-4 rounded"
              />
              <span className="text-sm text-zinc-400">Crew public</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={requiresApproval}
                onChange={(e) => setRequiresApproval(e.target.checked)}
                className="w-4 h-4 rounded"
              />
              <span className="text-sm text-zinc-400">Approbation requise</span>
            </label>
          </div>
        </div>

        <div className="p-6 border-t border-zinc-800 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-3 rounded-xl bg-zinc-800 text-white font-medium"
          >
            Annuler
          </button>
          <button
            onClick={handleCreate}
            disabled={!name.trim() || isSubmitting}
            className="flex-1 py-3 rounded-xl bg-gradient-to-r from-blue-500 to-purple-500 text-white font-bold disabled:opacity-50"
          >
            {isSubmitting ? "Création..." : "Créer"}
          </button>
        </div>
      </motion.div>
    </div>
  )
}
