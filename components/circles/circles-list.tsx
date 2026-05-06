"use client"

import { useState, useEffect } from "react"
import Image from "next/image"
import { motion, AnimatePresence } from "framer-motion"
import {
  Users,
  Plus,
  MessageCircle,
  Bell,
  BellOff,
  Settings,
  Search,
  ChevronRight,
  Globe,
  Lock,
  Eye,
  X,
  Sparkles,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

/* ==========================================================================
   TYPES
   ========================================================================== */

interface Circle {
  id: string
  name: string
  description?: string
  avatar_url?: string
  cover_url?: string
  theme_color: string
  emoji?: string
  circle_type: "private" | "public" | "secret"
  created_by: string
  creator?: {
    id: string
    first_name: string
    avatar_url?: string
  }
  membership: {
    role: string
    joined_at: string
    notifications_enabled: boolean
    is_muted: boolean
  }
  stats: {
    member_count: number
    unread_count: number
    message_count: number
  }
  last_message?: {
    id: string
    content: string
    sender_id: string
    created_at: string
    sender?: {
      first_name: string
    }
  }
  last_activity_at: string
}

interface CircleStats {
  total_circles: number
  total_unread: number
  pending_invitations: number
}

/* ==========================================================================
   COLOR CONFIG
   ========================================================================== */

const colorConfig: Record<string, { bg: string; text: string; gradient: string }> = {
  cyan: { bg: "bg-cyan-500/10", text: "text-cyan-400", gradient: "from-cyan-500 to-blue-500" },
  blue: { bg: "bg-blue-500/10", text: "text-blue-400", gradient: "from-blue-500 to-indigo-500" },
  purple: { bg: "bg-purple-500/10", text: "text-purple-400", gradient: "from-purple-500 to-pink-500" },
  pink: { bg: "bg-pink-500/10", text: "text-pink-400", gradient: "from-pink-500 to-rose-500" },
  red: { bg: "bg-red-500/10", text: "text-red-400", gradient: "from-red-500 to-orange-500" },
  orange: { bg: "bg-orange-500/10", text: "text-orange-400", gradient: "from-orange-500 to-yellow-500" },
  yellow: { bg: "bg-yellow-500/10", text: "text-yellow-400", gradient: "from-yellow-500 to-amber-500" },
  green: { bg: "bg-green-500/10", text: "text-green-400", gradient: "from-green-500 to-emerald-500" },
}

/* ==========================================================================
   CIRCLE CARD
   ========================================================================== */

interface CircleCardProps {
  circle: Circle
  onClick: () => void
}

function CircleCard({ circle, onClick }: CircleCardProps) {
  const colors = colorConfig[circle.theme_color] || colorConfig.cyan

  const formatLastActivity = (dateStr: string) => {
    const date = new Date(dateStr)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / (1000 * 60))
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

    if (diffMins < 1) return "A l'instant"
    if (diffMins < 60) return `${diffMins}m`
    if (diffHours < 24) return `${diffHours}h`
    if (diffDays < 7) return `${diffDays}j`
    return date.toLocaleDateString("fr-FR", { day: "numeric", month: "short" })
  }

  const typeIcon = circle.circle_type === "public" ? Globe :
    circle.circle_type === "secret" ? Eye : Lock

  return (
    <motion.div
      whileHover={{ scale: 1.01 }}
      whileTap={{ scale: 0.99 }}
      onClick={onClick}
      className="cursor-pointer"
    >
      <Card className="p-4 bg-zinc-900 border-zinc-800 hover:border-zinc-700 transition-colors">
        <div className="flex items-center gap-4">
          {/* Avatar */}
          <div className={cn(
            "relative w-14 h-14 rounded-2xl flex items-center justify-center overflow-hidden",
            `bg-gradient-to-br ${colors.gradient}`
          )}>
            {circle.avatar_url ? (
              <Image
                src={circle.avatar_url}
                alt={circle.name}
                fill
                sizes="56px"
                className="object-cover"
              />
            ) : circle.emoji ? (
              <span className="text-2xl">{circle.emoji}</span>
            ) : (
              <Users className="w-7 h-7 text-white" />
            )}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <h3 className="font-bold text-white truncate">{circle.name}</h3>
              {React.createElement(typeIcon, {
                className: "w-3.5 h-3.5 text-zinc-500 flex-shrink-0"
              })}
            </div>

            {/* Last message preview */}
            {circle.last_message ? (
              <p className="text-sm text-zinc-500 truncate">
                <span className="text-zinc-400">
                  {circle.last_message.sender?.first_name || "Quelqu'un"}:
                </span>{" "}
                {circle.last_message.content}
              </p>
            ) : (
              <p className="text-sm text-zinc-600 italic">Aucun message</p>
            )}

            {/* Stats */}
            <div className="flex items-center gap-3 mt-1">
              <span className="text-xs text-zinc-600 flex items-center gap-1">
                <Users className="w-3 h-3" />
                {circle.stats.member_count}
              </span>
              <span className="text-xs text-zinc-600">
                {formatLastActivity(circle.last_activity_at)}
              </span>
            </div>
          </div>

          {/* Unread badge & mute indicator */}
          <div className="flex flex-col items-end gap-2">
            {circle.stats.unread_count > 0 && (
              <span className={cn(
                "px-2 py-0.5 rounded-full text-xs font-bold",
                `bg-gradient-to-r ${colors.gradient} text-white`
              )}>
                {circle.stats.unread_count > 99 ? "99+" : circle.stats.unread_count}
              </span>
            )}
            {circle.membership.is_muted && (
              <BellOff className="w-4 h-4 text-zinc-600" />
            )}
          </div>

          <ChevronRight className="w-5 h-5 text-zinc-600" />
        </div>
      </Card>
    </motion.div>
  )
}

/* ==========================================================================
   CREATE CIRCLE MODAL
   ========================================================================== */

interface CreateCircleModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (data: {
    name: string
    description: string
    circle_type: string
    theme_color: string
    emoji: string
  }) => void
}

function CreateCircleModal({ isOpen, onClose, onSubmit }: CreateCircleModalProps) {
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [circleType, setCircleType] = useState("private")
  const [themeColor, setThemeColor] = useState("cyan")
  const [emoji, setEmoji] = useState("")

  const handleSubmit = () => {
    if (name.trim()) {
      onSubmit({
        name: name.trim(),
        description: description.trim(),
        circle_type: circleType,
        theme_color: themeColor,
        emoji,
      })
      // Reset form
      setName("")
      setDescription("")
      setCircleType("private")
      setThemeColor("cyan")
      setEmoji("")
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/80"
        onClick={onClose}
      />
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="relative bg-zinc-900 rounded-2xl p-6 max-w-md w-full border border-zinc-800"
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-zinc-500 hover:text-white"
        >
          <X className="w-5 h-5" />
        </button>

        <h3 className="text-xl font-bold text-white mb-6">Creer un cercle</h3>

        <div className="space-y-4">
          {/* Name */}
          <div>
            <label className="text-sm text-zinc-400 mb-2 block">Nom du cercle *</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Les gamers"
              maxLength={50}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-white"
            />
          </div>

          {/* Description */}
          <div>
            <label className="text-sm text-zinc-400 mb-2 block">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="De quoi parle ce cercle ?"
              rows={2}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-white resize-none"
            />
          </div>

          {/* Type */}
          <div>
            <label className="text-sm text-zinc-400 mb-2 block">Type de cercle</label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: "private", icon: Lock, label: "Prive" },
                { id: "public", icon: Globe, label: "Public" },
                { id: "secret", icon: Eye, label: "Secret" },
              ].map((type) => (
                <button
                  key={type.id}
                  onClick={() => setCircleType(type.id)}
                  className={cn(
                    "p-3 rounded-xl flex flex-col items-center gap-1 transition-all",
                    circleType === type.id
                      ? "bg-cyan-500/20 border-2 border-cyan-500"
                      : "bg-zinc-800 border-2 border-transparent hover:border-zinc-700"
                  )}
                >
                  <type.icon className={cn(
                    "w-5 h-5",
                    circleType === type.id ? "text-cyan-400" : "text-zinc-400"
                  )} />
                  <span className={cn(
                    "text-xs",
                    circleType === type.id ? "text-cyan-400" : "text-zinc-400"
                  )}>
                    {type.label}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Theme color */}
          <div>
            <label className="text-sm text-zinc-400 mb-2 block">Couleur</label>
            <div className="flex gap-2 flex-wrap">
              {Object.keys(colorConfig).map((color) => (
                <button
                  key={color}
                  onClick={() => setThemeColor(color)}
                  className={cn(
                    "w-8 h-8 rounded-full transition-all",
                    `bg-gradient-to-br ${colorConfig[color].gradient}`,
                    themeColor === color && "ring-2 ring-white ring-offset-2 ring-offset-zinc-900"
                  )}
                />
              ))}
            </div>
          </div>

          {/* Emoji */}
          <div>
            <label className="text-sm text-zinc-400 mb-2 block">Emoji (optionnel)</label>
            <input
              type="text"
              value={emoji}
              onChange={(e) => setEmoji(e.target.value.slice(0, 2))}
              placeholder="Ex: 🎮"
              className="w-24 bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-white text-center text-xl"
            />
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <Button
            onClick={onClose}
            variant="outline"
            className="flex-1 border-zinc-700"
          >
            Annuler
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!name.trim()}
            className={cn(
              "flex-1 bg-gradient-to-r",
              colorConfig[themeColor]?.gradient || "from-cyan-500 to-blue-500"
            )}
          >
            <Plus className="w-4 h-4 mr-2" />
            Creer
          </Button>
        </div>
      </motion.div>
    </div>
  )
}

/* ==========================================================================
   CIRCLES LIST
   ========================================================================== */

interface CirclesListProps {
  teenId: string
  onSelectCircle: (circleId: string) => void
}

export function CirclesList({ teenId, onSelectCircle }: CirclesListProps) {
  const [circles, setCircles] = useState<Circle[]>([])
  const [publicCircles, setPublicCircles] = useState<Circle[]>([])
  const [stats, setStats] = useState<CircleStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showPublic, setShowPublic] = useState(false)

  const fetchCircles = async () => {
    setLoading(true)
    try {
      const response = await fetch(
        `/api/teen/circles?teenId=${teenId}&includePublic=true`
      )
      const data = await response.json()

      if (data.success) {
        setCircles(data.circles)
        setPublicCircles(data.publicCircles || [])
        setStats(data.stats)
      }
    } catch (error) {
      console.error("Error fetching circles:", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchCircles()
  }, [teenId])

  const handleCreate = async (data: {
    name: string
    description: string
    circle_type: string
    theme_color: string
    emoji: string
  }) => {
    try {
      const response = await fetch("/api/teen/circles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          teenId,
          action: "create",
          ...data,
        }),
      })

      const result = await response.json()
      if (result.success) {
        setShowCreateModal(false)
        fetchCircles()
        onSelectCircle(result.circle.id)
      }
    } catch (error) {
      console.error("Error creating circle:", error)
    }
  }

  const handleJoinPublic = async (circleId: string) => {
    try {
      const response = await fetch("/api/teen/circles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          teenId,
          action: "join",
          circleId,
        }),
      })

      if (response.ok) {
        fetchCircles()
        onSelectCircle(circleId)
      }
    } catch (error) {
      console.error("Error joining circle:", error)
    }
  }

  // Filter circles
  const filteredCircles = circles.filter((c) =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  if (loading) {
    return (
      <div className="space-y-4 animate-pulse">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-20 bg-zinc-800 rounded-2xl" />
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white">Mes cercles</h2>
          {stats && (
            <p className="text-sm text-zinc-500">
              {stats.total_circles} cercle{stats.total_circles > 1 ? "s" : ""}
              {stats.total_unread > 0 && (
                <span className="text-cyan-400"> • {stats.total_unread} non lu{stats.total_unread > 1 ? "s" : ""}</span>
              )}
            </p>
          )}
        </div>
        <Button
          onClick={() => setShowCreateModal(true)}
          className="bg-gradient-to-r from-cyan-500 to-blue-500"
        >
          <Plus className="w-4 h-4 mr-2" />
          Nouveau
        </Button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Rechercher un cercle..."
          className="w-full bg-zinc-800 border border-zinc-700 rounded-xl pl-12 pr-4 py-3 text-white"
        />
      </div>

      {/* Pending invitations */}
      {stats && stats.pending_invitations > 0 && (
        <Card className="p-4 bg-cyan-500/10 border-cyan-500/30">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-cyan-500/20 flex items-center justify-center">
                <Bell className="w-5 h-5 text-cyan-400" />
              </div>
              <div>
                <p className="font-medium text-white">
                  {stats.pending_invitations} invitation{stats.pending_invitations > 1 ? "s" : ""}
                </p>
                <p className="text-sm text-cyan-400/70">En attente de reponse</p>
              </div>
            </div>
            <Button size="sm" variant="outline" className="border-cyan-500/30 text-cyan-400">
              Voir
            </Button>
          </div>
        </Card>
      )}

      {/* Circles list */}
      <div className="space-y-3">
        {filteredCircles.map((circle) => (
          <CircleCard
            key={circle.id}
            circle={circle}
            onClick={() => onSelectCircle(circle.id)}
          />
        ))}
      </div>

      {/* Empty state */}
      {circles.length === 0 && (
        <Card className="p-8 bg-zinc-900 border-zinc-800 text-center">
          <Users className="w-12 h-12 text-zinc-600 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-white mb-2">Aucun cercle</h3>
          <p className="text-zinc-400 mb-4">
            Cree ton premier cercle ou rejoins-en un public !
          </p>
          <div className="flex gap-3 justify-center">
            <Button
              onClick={() => setShowCreateModal(true)}
              className="bg-gradient-to-r from-cyan-500 to-blue-500"
            >
              <Plus className="w-4 h-4 mr-2" />
              Creer
            </Button>
            <Button
              onClick={() => setShowPublic(true)}
              variant="outline"
              className="border-zinc-700"
            >
              <Globe className="w-4 h-4 mr-2" />
              Decouvrir
            </Button>
          </div>
        </Card>
      )}

      {/* Public circles section */}
      {(showPublic || circles.length > 0) && publicCircles.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-zinc-400 flex items-center gap-2">
            <Globe className="w-4 h-4" />
            Cercles publics a decouvrir
          </h3>
          {publicCircles.slice(0, 3).map((circle) => (
            <Card
              key={circle.id}
              className="p-4 bg-zinc-900 border-zinc-800 hover:border-zinc-700 transition-colors"
            >
              <div className="flex items-center gap-4">
                <div className={cn(
                  "w-12 h-12 rounded-xl flex items-center justify-center",
                  `bg-gradient-to-br ${colorConfig[circle.theme_color]?.gradient || colorConfig.cyan.gradient}`
                )}>
                  {circle.emoji || <Users className="w-6 h-6 text-white" />}
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-medium text-white truncate">{circle.name}</h4>
                  <p className="text-sm text-zinc-500">
                    {(circle as unknown as { member_count: number }).member_count} membres
                  </p>
                </div>
                <Button
                  onClick={() => handleJoinPublic(circle.id)}
                  size="sm"
                  className="bg-gradient-to-r from-cyan-500 to-blue-500"
                >
                  Rejoindre
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Create modal */}
      <CreateCircleModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSubmit={handleCreate}
      />
    </div>
  )
}

/* ==========================================================================
   CIRCLES WIDGET
   ========================================================================== */

interface CirclesWidgetProps {
  teenId: string
  limit?: number
  onSeeAll?: () => void
  onSelectCircle?: (circleId: string) => void
}

export function CirclesWidget({ teenId, limit = 3, onSeeAll, onSelectCircle }: CirclesWidgetProps) {
  const [circles, setCircles] = useState<Circle[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchCircles = async () => {
      try {
        const response = await fetch(`/api/teen/circles?teenId=${teenId}`)
        const data = await response.json()
        if (data.success) {
          setCircles(data.circles.slice(0, limit))
        }
      } catch (error) {
        console.error("Error fetching circles:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchCircles()
  }, [teenId, limit])

  if (loading) {
    return (
      <div className="space-y-3 animate-pulse">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-14 bg-zinc-800 rounded-xl" />
        ))}
      </div>
    )
  }

  if (circles.length === 0) {
    return null
  }

  return (
    <Card className="p-4 bg-zinc-900 border-zinc-800">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-bold text-white flex items-center gap-2">
          <Users className="w-4 h-4 text-cyan-400" />
          Mes cercles
        </h3>
        {onSeeAll && (
          <button
            onClick={onSeeAll}
            className="text-sm text-cyan-400 hover:underline"
          >
            Voir tout
          </button>
        )}
      </div>

      <div className="space-y-2">
        {circles.map((circle) => {
          const colors = colorConfig[circle.theme_color] || colorConfig.cyan
          return (
            <div
              key={circle.id}
              onClick={() => onSelectCircle?.(circle.id)}
              className="flex items-center gap-3 p-2 rounded-lg hover:bg-zinc-800/50 cursor-pointer transition-colors"
            >
              <div className={cn(
                "w-10 h-10 rounded-xl flex items-center justify-center text-lg",
                `bg-gradient-to-br ${colors.gradient}`
              )}>
                {circle.emoji || <Users className="w-5 h-5 text-white" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-white font-medium truncate">{circle.name}</p>
                <p className="text-xs text-zinc-500">
                  {circle.stats.member_count} membres
                </p>
              </div>
              {circle.stats.unread_count > 0 && (
                <span className={cn(
                  "px-2 py-0.5 rounded-full text-xs font-bold",
                  `bg-gradient-to-r ${colors.gradient} text-white`
                )}>
                  {circle.stats.unread_count}
                </span>
              )}
            </div>
          )
        })}
      </div>
    </Card>
  )
}

// Need to import React for createElement
import React from "react"
