"use client"

import React, { useState, useEffect } from "react"
import Image from "next/image"
import {
  Users,
  Plus,
  Bell,
  BellOff,
  Search,
  ChevronRight,
  Globe,
  Lock,
  Eye,
  X,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { StickerCard } from "@/components/ui/sticker-card"
import { NivEmpty } from "@/components/brand"
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

// Mapping fixe theme_color → token charte (solide, jamais de classe dynamique).
const colorConfig: Record<string, { bg: string; text: string; chip: string; swatch: string }> = {
  cyan: { bg: "bg-teal/10", text: "text-teal", chip: "bg-teal text-paper", swatch: "bg-teal" },
  blue: { bg: "bg-teal/10", text: "text-teal", chip: "bg-teal text-paper", swatch: "bg-teal" },
  purple: { bg: "bg-pink/10", text: "text-pink", chip: "bg-pink text-ink", swatch: "bg-pink" },
  pink: { bg: "bg-pink/10", text: "text-pink", chip: "bg-pink text-ink", swatch: "bg-pink" },
  red: { bg: "bg-coral/10", text: "text-coral", chip: "bg-coral text-ink", swatch: "bg-coral" },
  orange: { bg: "bg-coral/10", text: "text-coral", chip: "bg-coral text-ink", swatch: "bg-coral" },
  yellow: { bg: "bg-gold/10", text: "text-gold", chip: "bg-gold text-ink", swatch: "bg-gold" },
  gold: { bg: "bg-gold/10", text: "text-gold", chip: "bg-gold text-ink", swatch: "bg-gold" },
  green: { bg: "bg-lime/10", text: "text-lime", chip: "bg-lime text-on-bright", swatch: "bg-lime" },
  lime: { bg: "bg-lime/10", text: "text-lime", chip: "bg-lime text-on-bright", swatch: "bg-lime" },
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

    if (diffMins < 1) return "À l'instant"
    if (diffMins < 60) return `${diffMins}m`
    if (diffHours < 24) return `${diffHours}h`
    if (diffDays < 7) return `${diffDays}j`
    return date.toLocaleDateString("fr-FR", { day: "numeric", month: "short" })
  }

  const typeIcon = circle.circle_type === "public" ? Globe :
    circle.circle_type === "secret" ? Eye : Lock

  return (
    <StickerCard variant="hover" onClick={onClick} className="p-4">
        <div className="flex items-center gap-4">
          {/* Avatar */}
          <div className={cn(
            "relative w-14 h-14 rounded-2xl border-2 border-ink flex items-center justify-center overflow-hidden",
            colors.bg
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
              <Users className="w-7 h-7 text-ink" />
            )}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <h3 className="font-bold text-ink truncate">{circle.name}</h3>
              {React.createElement(typeIcon, {
                className: "w-3.5 h-3.5 text-mute flex-shrink-0"
              })}
            </div>

            {/* Last message preview */}
            {circle.last_message ? (
              <p className="text-sm text-mute truncate">
                <span className="text-mute">
                  {circle.last_message.sender?.first_name || "Quelqu'un"}:
                </span>{" "}
                {circle.last_message.content}
              </p>
            ) : (
              <p className="text-sm text-mute italic">Aucun message</p>
            )}

            {/* Stats */}
            <div className="flex items-center gap-3 mt-1">
              <span className="text-xs text-mute flex items-center gap-1">
                <Users className="w-3 h-3" />
                {circle.stats.member_count}
              </span>
              <span className="text-xs text-mute">
                {formatLastActivity(circle.last_activity_at)}
              </span>
            </div>
          </div>

          {/* Unread badge & mute indicator */}
          <div className="flex flex-col items-end gap-2">
            {circle.stats.unread_count > 0 && (
              <span className={cn(
                "px-2 py-0.5 rounded-full border-2 border-ink text-xs font-bold",
                colors.chip
              )}>
                {circle.stats.unread_count > 99 ? "99+" : circle.stats.unread_count}
              </span>
            )}
            {circle.membership.is_muted && (
              <BellOff className="w-4 h-4 text-mute" />
            )}
          </div>

          <ChevronRight className="w-5 h-5 text-mute" />
        </div>
    </StickerCard>
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
      <div
        className="absolute inset-0 bg-ink/80"
        onClick={onClose}
      />
      <div className="relative bg-white rounded-2xl p-6 max-w-md w-full border-2 border-ink shadow-stkr-md">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-mute hover:text-ink"
        >
          <X className="w-5 h-5" />
        </button>

        <h3 className="font-display text-xl font-extrabold text-ink mb-6">Créer un cercle</h3>

        <div className="space-y-4">
          {/* Name */}
          <div>
            <label className="text-sm text-mute mb-2 block">Nom du cercle *</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Les gamers"
              maxLength={50}
              className="w-full bg-white border-2 border-ink rounded-xl px-4 py-3 text-ink transition-colors focus:border-pink focus:outline-none"
            />
          </div>

          {/* Description */}
          <div>
            <label className="text-sm text-mute mb-2 block">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="De quoi parle ce cercle ?"
              rows={2}
              className="w-full bg-white border-2 border-ink rounded-xl px-4 py-3 text-ink resize-none transition-colors focus:border-pink focus:outline-none"
            />
          </div>

          {/* Type */}
          <div>
            <label className="text-sm text-mute mb-2 block">Type de cercle</label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: "private", icon: Lock, label: "Privé" },
                { id: "public", icon: Globe, label: "Public" },
                { id: "secret", icon: Eye, label: "Secret" },
              ].map((type) => (
                <button
                  key={type.id}
                  onClick={() => setCircleType(type.id)}
                  className={cn(
                    "p-3 rounded-xl flex flex-col items-center gap-1 border-2 transition-all",
                    circleType === type.id
                      ? "bg-pink border-ink text-ink"
                      : "bg-white border-ink/30 hover:border-ink"
                  )}
                >
                  <type.icon className={cn(
                    "w-5 h-5",
                    circleType === type.id ? "text-ink" : "text-mute"
                  )} />
                  <span className={cn(
                    "text-xs",
                    circleType === type.id ? "text-ink" : "text-mute"
                  )}>
                    {type.label}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Theme color */}
          <div>
            <label className="text-sm text-mute mb-2 block">Couleur</label>
            <div className="flex gap-2 flex-wrap">
              {Object.keys(colorConfig).map((color) => (
                <button
                  key={color}
                  onClick={() => setThemeColor(color)}
                  className={cn(
                    "w-8 h-8 rounded-full border-2 border-ink transition-all",
                    colorConfig[color].swatch,
                    themeColor === color && "ring-2 ring-ink ring-offset-2 ring-offset-white"
                  )}
                />
              ))}
            </div>
          </div>

          {/* Emoji */}
          <div>
            <label className="text-sm text-mute mb-2 block">Emoji (optionnel)</label>
            <input
              type="text"
              value={emoji}
              onChange={(e) => setEmoji(e.target.value.slice(0, 2))}
              placeholder="Ex: 🎮"
              className="w-24 bg-white border-2 border-ink rounded-xl px-4 py-3 text-ink text-center text-xl transition-colors focus:border-pink focus:outline-none"
            />
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <Button
            onClick={onClose}
            variant="outline"
            className="flex-1"
          >
            Annuler
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!name.trim()}
            variant="pink"
            className="flex-1"
          >
            <Plus className="w-4 h-4 mr-2" />
            Créer
          </Button>
        </div>
      </div>
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
          <div key={i} className="h-20 bg-card rounded-2xl" />
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="eyebrow">Mes cercles</p>
          {stats && (
            <p className="text-sm text-mute">
              {stats.total_circles} cercle{stats.total_circles > 1 ? "s" : ""}
              {stats.total_unread > 0 && (
                <span className="text-teal"> • {stats.total_unread} non lu{stats.total_unread > 1 ? "s" : ""}</span>
              )}
            </p>
          )}
        </div>
        <Button
          onClick={() => setShowCreateModal(true)}
          variant="pink"
        >
          <Plus className="w-4 h-4 mr-2" />
          Nouveau
        </Button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-mute" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Rechercher un cercle…"
          className="w-full bg-white border-2 border-ink rounded-xl pl-12 pr-4 py-3 text-ink transition-colors focus:border-pink focus:outline-none"
        />
      </div>

      {/* Pending invitations */}
      {stats && stats.pending_invitations > 0 && (
        <StickerCard className="p-4 bg-teal/10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl border-2 border-ink bg-teal/20 flex items-center justify-center">
                <Bell className="w-5 h-5 text-teal" />
              </div>
              <div>
                <p className="font-medium text-ink">
                  {stats.pending_invitations} invitation{stats.pending_invitations > 1 ? "s" : ""}
                </p>
                <p className="text-sm text-mute">En attente de réponse</p>
              </div>
            </div>
            <Button size="sm" variant="outline">
              Voir
            </Button>
          </div>
        </StickerCard>
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
        <NivEmpty
          title="Aucun cercle"
          description="Crée ton premier cercle ou rejoins-en un public."
          action={
            <div className="flex gap-3 justify-center">
              <Button onClick={() => setShowCreateModal(true)} variant="pink">
                <Plus className="w-4 h-4 mr-2" />
                Créer
              </Button>
              <Button onClick={() => setShowPublic(true)} variant="outline">
                <Globe className="w-4 h-4 mr-2" />
                Découvrir
              </Button>
            </div>
          }
        />
      )}

      {/* Public circles section */}
      {(showPublic || circles.length > 0) && publicCircles.length > 0 && (
        <div className="space-y-3">
          <p className="eyebrow flex items-center gap-2">
            <Globe className="w-4 h-4" />
            Cercles publics à découvrir
          </p>
          {publicCircles.slice(0, 3).map((circle) => (
            <StickerCard key={circle.id} className="p-4">
              <div className="flex items-center gap-4">
                <div className={cn(
                  "w-12 h-12 rounded-xl border-2 border-ink flex items-center justify-center",
                  colorConfig[circle.theme_color]?.bg || colorConfig.cyan.bg
                )}>
                  {circle.emoji || <Users className="w-6 h-6 text-ink" />}
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-medium text-ink truncate">{circle.name}</h4>
                  <p className="text-sm text-mute">
                    {(circle as unknown as { member_count: number }).member_count} membres
                  </p>
                </div>
                <Button
                  onClick={() => handleJoinPublic(circle.id)}
                  size="sm"
                  variant="pink"
                >
                  Rejoindre
                </Button>
              </div>
            </StickerCard>
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
          <div key={i} className="h-14 bg-card rounded-xl" />
        ))}
      </div>
    )
  }

  if (circles.length === 0) {
    return null
  }

  return (
    <StickerCard className="p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-bold text-ink flex items-center gap-2">
          <Users className="w-4 h-4 text-teal" />
          Mes cercles
        </h3>
        {onSeeAll && (
          <button
            onClick={onSeeAll}
            className="text-sm text-pink hover:underline"
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
              className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted cursor-pointer transition-colors"
            >
              <div className={cn(
                "w-10 h-10 rounded-xl border-2 border-ink flex items-center justify-center text-lg",
                colors.bg
              )}>
                {circle.emoji || <Users className="w-5 h-5 text-ink" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-ink font-medium truncate">{circle.name}</p>
                <p className="text-xs text-mute">
                  {circle.stats.member_count} membres
                </p>
              </div>
              {circle.stats.unread_count > 0 && (
                <span className={cn(
                  "px-2 py-0.5 rounded-full border-2 border-ink text-xs font-bold",
                  colors.chip
                )}>
                  {circle.stats.unread_count}
                </span>
              )}
            </div>
          )
        })}
      </div>
    </StickerCard>
  )
}
