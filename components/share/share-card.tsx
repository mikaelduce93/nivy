"use client"

/**
 * SHARE CARD COMPONENTS
 * =====================
 * Générateur de cartes partageables
 */

import { useState, useRef, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  Download,
  Share2,
  Palette,
  Type,
  Image as ImageIcon,
  Sparkles,
  Trophy,
  Star,
  Flame,
  Target,
  Medal,
  Zap,
  ChevronLeft,
  ChevronRight,
  Check,
  Loader2,
} from "lucide-react"

// Types
interface ShareCardProps {
  type: "achievement" | "level_up" | "challenge" | "streak" | "record" | "profile"
  data: Record<string, unknown>
  onShare?: () => void
}

// Thèmes de cartes
const CARD_THEMES = [
  {
    id: "neon",
    name: "Néon",
    gradient: "from-cyan-500 via-blue-500 to-purple-500",
    textColor: "text-white",
    accentColor: "cyan",
  },
  {
    id: "sunset",
    name: "Coucher de soleil",
    gradient: "from-orange-500 via-pink-500 to-purple-500",
    textColor: "text-white",
    accentColor: "orange",
  },
  {
    id: "forest",
    name: "Forêt",
    gradient: "from-green-500 via-emerald-500 to-teal-500",
    textColor: "text-white",
    accentColor: "green",
  },
  {
    id: "midnight",
    name: "Minuit",
    gradient: "from-indigo-900 via-purple-900 to-pink-900",
    textColor: "text-white",
    accentColor: "purple",
  },
  {
    id: "gold",
    name: "Or",
    gradient: "from-yellow-500 via-amber-500 to-orange-500",
    textColor: "text-black",
    accentColor: "yellow",
  },
  {
    id: "ice",
    name: "Glace",
    gradient: "from-cyan-400 via-blue-300 to-white",
    textColor: "text-zinc-900",
    accentColor: "cyan",
  },
]

// Icône par type
const getTypeIcon = (type: string) => {
  const icons: Record<string, React.ReactNode> = {
    achievement: <Trophy className="w-12 h-12" />,
    level_up: <Star className="w-12 h-12" />,
    challenge: <Target className="w-12 h-12" />,
    streak: <Flame className="w-12 h-12" />,
    record: <Medal className="w-12 h-12" />,
    profile: <Sparkles className="w-12 h-12" />,
  }
  return icons[type] || <Zap className="w-12 h-12" />
}

// Composant carte de partage
export function ShareCard({ type, data, onShare }: ShareCardProps) {
  const [selectedTheme, setSelectedTheme] = useState(CARD_THEMES[0])
  const [isGenerating, setIsGenerating] = useState(false)
  const cardRef = useRef<HTMLDivElement>(null)

  const handleDownload = async () => {
    if (!cardRef.current) return

    setIsGenerating(true)
    try {
      // Utiliser html2canvas si disponible, sinon fallback
      // Pour l'exemple, on simule le téléchargement
      await new Promise((resolve) => setTimeout(resolve, 1000))

      // En production, on utiliserait:
      // const canvas = await html2canvas(cardRef.current)
      // const url = canvas.toDataURL('image/png')
      // ... télécharger

      alert("Carte téléchargée!")
    } catch (err) {
      console.error("Error generating card:", err)
    } finally {
      setIsGenerating(false)
    }
  }

  const renderCardContent = () => {
    switch (type) {
      case "achievement":
        return (
          <>
            <div className="flex items-center justify-center mb-4">
              <div className={`p-4 rounded-full bg-white/20`}>{getTypeIcon(type)}</div>
            </div>
            <h2 className="text-2xl font-bold text-center mb-2">
              Badge Débloqué!
            </h2>
            <p className="text-xl font-semibold text-center mb-1">
              {(data as { badge_name?: string }).badge_name || "Badge"}
            </p>
            <p className="text-center opacity-80">
              {(data as { description?: string }).description}
            </p>
            <div className="mt-4 flex justify-center">
              <div className="px-4 py-2 bg-white/20 rounded-full text-lg font-bold">
                +{(data as { xp?: number }).xp || 100} XP
              </div>
            </div>
          </>
        )

      case "level_up":
        return (
          <>
            <div className="flex items-center justify-center mb-4">
              <div className="relative">
                <div className={`p-4 rounded-full bg-white/20`}>{getTypeIcon(type)}</div>
                <div className="absolute -top-2 -right-2 w-8 h-8 bg-yellow-400 rounded-full
                  flex items-center justify-center text-black font-bold">
                  {(data as { new_level?: number }).new_level}
                </div>
              </div>
            </div>
            <h2 className="text-3xl font-bold text-center mb-2">
              Niveau {(data as { new_level?: number }).new_level}!
            </h2>
            <p className="text-center opacity-80 mb-4">
              {(data as { display_name?: string }).display_name} a atteint un nouveau niveau
            </p>
            <div className="flex justify-center gap-4">
              <div className="text-center">
                <p className="text-2xl font-bold">{(data as { total_xp?: number }).total_xp}</p>
                <p className="text-sm opacity-70">XP Total</p>
              </div>
              <div className="w-px bg-white/30" />
              <div className="text-center">
                <p className="text-2xl font-bold">{(data as { badges_count?: number }).badges_count || 0}</p>
                <p className="text-sm opacity-70">Badges</p>
              </div>
            </div>
          </>
        )

      case "challenge":
        return (
          <>
            <div className="flex items-center justify-center mb-4">
              <div className={`p-4 rounded-full bg-white/20`}>{getTypeIcon(type)}</div>
            </div>
            <h2 className="text-2xl font-bold text-center mb-2">
              Défi Complété!
            </h2>
            <p className="text-xl font-semibold text-center mb-1">
              {(data as { challenge_name?: string }).challenge_name}
            </p>
            <p className="text-center opacity-80 text-sm">
              {(data as { category?: string }).category}
            </p>
            <div className="mt-4 flex justify-center gap-4">
              <div className="px-4 py-2 bg-white/20 rounded-full">
                +{(data as { xp?: number }).xp || 50} XP
              </div>
              {(data as { time?: string }).time && (
                <div className="px-4 py-2 bg-white/20 rounded-full">
                  {(data as { time?: string }).time}
                </div>
              )}
            </div>
          </>
        )

      case "streak":
        return (
          <>
            <div className="flex items-center justify-center mb-4">
              <div className={`p-4 rounded-full bg-white/20 animate-pulse`}>
                {getTypeIcon(type)}
              </div>
            </div>
            <h2 className="text-4xl font-bold text-center mb-2">
              {(data as { streak_days?: number }).streak_days} Jours
            </h2>
            <p className="text-xl text-center mb-4">
              de suite sur TeensParty!
            </p>
            <div className="flex justify-center">
              <div className="flex gap-1">
                {Array.from({ length: Math.min((data as { streak_days?: number }).streak_days || 0, 7) }).map((_, i) => (
                  <div key={i} className="w-3 h-3 bg-white rounded-full" />
                ))}
              </div>
            </div>
          </>
        )

      case "record":
        return (
          <>
            <div className="flex items-center justify-center mb-4">
              <div className={`p-4 rounded-full bg-white/20`}>{getTypeIcon(type)}</div>
            </div>
            <h2 className="text-2xl font-bold text-center mb-2">
              Nouveau Record!
            </h2>
            <p className="text-xl font-semibold text-center mb-1">
              {(data as { record_type?: string }).record_type}
            </p>
            <p className="text-4xl font-bold text-center my-4">
              {(data as { value?: string | number }).value}
              <span className="text-lg ml-2 opacity-70">{(data as { unit?: string }).unit}</span>
            </p>
            {(data as { improvement?: string }).improvement && (
              <p className="text-center text-green-300">
                +{(data as { improvement?: string }).improvement}% d'amélioration
              </p>
            )}
          </>
        )

      case "profile":
        return (
          <>
            {(data as { avatar_url?: string }).avatar_url ? (
              <img
                src={(data as { avatar_url?: string }).avatar_url}
                alt=""
                className="w-24 h-24 rounded-full mx-auto mb-4 border-4 border-white/30"
              />
            ) : (
              <div className="w-24 h-24 rounded-full mx-auto mb-4 border-4 border-white/30
                bg-white/20 flex items-center justify-center text-3xl font-bold">
                {((data as { display_name?: string }).display_name || "U").charAt(0)}
              </div>
            )}
            <h2 className="text-2xl font-bold text-center mb-1">
              {(data as { display_name?: string }).display_name}
            </h2>
            <p className="text-center opacity-70 mb-4">@{(data as { username?: string }).username}</p>
            <div className="flex justify-center gap-6">
              <div className="text-center">
                <p className="text-2xl font-bold">{(data as { level?: number }).level}</p>
                <p className="text-sm opacity-70">Niveau</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold">{(data as { total_xp?: number }).total_xp}</p>
                <p className="text-sm opacity-70">XP</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold">{(data as { friends_count?: number }).friends_count || 0}</p>
                <p className="text-sm opacity-70">Amis</p>
              </div>
            </div>
          </>
        )

      default:
        return null
    }
  }

  return (
    <div className="space-y-4">
      {/* Theme selector */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2">
        <span className="text-sm text-zinc-400 flex-shrink-0">Thème:</span>
        {CARD_THEMES.map((theme) => (
          <button
            key={theme.id}
            onClick={() => setSelectedTheme(theme)}
            className={`flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br ${theme.gradient}
              ${selectedTheme.id === theme.id ? "ring-2 ring-white ring-offset-2 ring-offset-zinc-900" : ""}
              transition-all`}
            title={theme.name}
          />
        ))}
      </div>

      {/* Card preview */}
      <div
        ref={cardRef}
        className={`relative aspect-[1200/630] bg-gradient-to-br ${selectedTheme.gradient}
          rounded-2xl overflow-hidden ${selectedTheme.textColor}`}
      >
        {/* Background pattern */}
        <div className="absolute inset-0 opacity-10">
          <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
            <pattern id="grid" width="10" height="10" patternUnits="userSpaceOnUse">
              <circle cx="5" cy="5" r="1" fill="currentColor" />
            </pattern>
            <rect width="100" height="100" fill="url(#grid)" />
          </svg>
        </div>

        {/* Content */}
        <div className="relative z-10 h-full flex flex-col justify-center p-8">
          {renderCardContent()}
        </div>

        {/* Watermark */}
        <div className="absolute bottom-4 right-4 flex items-center gap-2 opacity-70">
          <Sparkles className="w-4 h-4" />
          <span className="text-sm font-medium">TeensParty</span>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <button
          onClick={handleDownload}
          disabled={isGenerating}
          className="flex-1 py-3 bg-zinc-800 rounded-xl hover:bg-zinc-700 transition-colors
            flex items-center justify-center gap-2 text-white font-medium"
        >
          {isGenerating ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <Download className="w-5 h-5" />
          )}
          <span>Télécharger</span>
        </button>

        <button
          onClick={onShare}
          className="flex-1 py-3 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-xl
            hover:from-cyan-600 hover:to-blue-600 transition-colors
            flex items-center justify-center gap-2 text-white font-medium"
        >
          <Share2 className="w-5 h-5" />
          <span>Partager</span>
        </button>
      </div>
    </div>
  )
}

// Composant statistiques de partage
export function ShareStats() {
  const [stats, setStats] = useState<{
    total_shares: number
    total_clicks: number
    total_xp_earned: number
    shares_by_platform: Record<string, number>
    top_shares: Array<{
      id: string
      content_type: string
      platform: string
      click_count: number
    }>
  } | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadStats = async () => {
      try {
        const res = await fetch("/api/teen/share?type=stats")
        const data = await res.json()
        if (data.stats) setStats(data.stats)
      } catch (err) {
        console.error("Error loading stats:", err)
      } finally {
        setLoading(false)
      }
    }
    loadStats()
  }, [])

  if (loading) {
    return (
      <div className="bg-zinc-900/50 rounded-xl border border-zinc-800 p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-zinc-800 rounded w-1/3" />
          <div className="grid grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-20 bg-zinc-800 rounded-lg" />
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (!stats) return null

  const platformIcons: Record<string, string> = {
    facebook: "📘",
    twitter: "🐦",
    whatsapp: "💬",
    instagram: "📸",
    telegram: "✈️",
    linkedin: "💼",
    copy_link: "🔗",
  }

  return (
    <div className="bg-zinc-900/50 rounded-xl border border-zinc-800 p-6">
      <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
        <Share2 className="w-5 h-5 text-cyan-400" />
        Statistiques de partage
      </h3>

      {/* Main stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-zinc-800/50 rounded-xl p-4 text-center">
          <p className="text-3xl font-bold text-white">{stats.total_shares}</p>
          <p className="text-sm text-zinc-400">Partages</p>
        </div>
        <div className="bg-zinc-800/50 rounded-xl p-4 text-center">
          <p className="text-3xl font-bold text-cyan-400">{stats.total_clicks}</p>
          <p className="text-sm text-zinc-400">Clics</p>
        </div>
        <div className="bg-zinc-800/50 rounded-xl p-4 text-center">
          <p className="text-3xl font-bold text-yellow-400">{stats.total_xp_earned}</p>
          <p className="text-sm text-zinc-400">XP gagnés</p>
        </div>
      </div>

      {/* Platform breakdown */}
      {Object.keys(stats.shares_by_platform).length > 0 && (
        <div className="mb-6">
          <h4 className="text-sm font-medium text-zinc-400 mb-3">Par plateforme</h4>
          <div className="flex flex-wrap gap-2">
            {Object.entries(stats.shares_by_platform).map(([platform, count]) => (
              <div
                key={platform}
                className="flex items-center gap-2 px-3 py-1.5 bg-zinc-800 rounded-full"
              >
                <span>{platformIcons[platform] || "📤"}</span>
                <span className="text-sm text-zinc-300">{count}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Top shares */}
      {stats.top_shares && stats.top_shares.length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-zinc-400 mb-3">Meilleurs partages</h4>
          <div className="space-y-2">
            {stats.top_shares.map((share, idx) => (
              <div
                key={share.id}
                className="flex items-center gap-3 p-2 bg-zinc-800/50 rounded-lg"
              >
                <span className="text-lg">{platformIcons[share.platform] || "📤"}</span>
                <div className="flex-1">
                  <p className="text-sm text-white capitalize">{share.content_type.replace("_", " ")}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-cyan-400">{share.click_count} clics</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// Widget compact
export function ShareWidget() {
  const [stats, setStats] = useState<{
    total_shares: number
    total_clicks: number
    daily_shares: number
  } | null>(null)

  useEffect(() => {
    const loadStats = async () => {
      try {
        const res = await fetch("/api/teen/share?type=stats")
        const data = await res.json()
        if (data.stats) setStats(data.stats)
      } catch (err) {
        console.error("Error loading stats:", err)
      }
    }
    loadStats()
  }, [])

  return (
    <div className="bg-zinc-900/50 rounded-xl border border-zinc-800 p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-white flex items-center gap-2">
          <Share2 className="w-5 h-5 text-cyan-400" />
          Partages
        </h3>
        <a href="/share" className="text-sm text-cyan-400 hover:underline">
          Voir tout
        </a>
      </div>

      {stats ? (
        <div className="flex items-center justify-around">
          <div className="text-center">
            <p className="text-2xl font-bold text-white">{stats.total_shares}</p>
            <p className="text-xs text-zinc-500">Total</p>
          </div>
          <div className="w-px h-8 bg-zinc-700" />
          <div className="text-center">
            <p className="text-2xl font-bold text-cyan-400">{stats.total_clicks}</p>
            <p className="text-xs text-zinc-500">Clics</p>
          </div>
          <div className="w-px h-8 bg-zinc-700" />
          <div className="text-center">
            <p className="text-2xl font-bold text-yellow-400">{stats.daily_shares}/5</p>
            <p className="text-xs text-zinc-500">Aujourd'hui</p>
          </div>
        </div>
      ) : (
        <div className="text-center py-4">
          <p className="text-sm text-zinc-500">Partage pour gagner des XP!</p>
        </div>
      )}
    </div>
  )
}
