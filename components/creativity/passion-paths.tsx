"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  Palette,
  Music,
  Camera,
  PenTool,
  Code,
  Gamepad2,
  Film,
  Mic,
  BookOpen,
  Sparkles,
  Star,
  Trophy,
  Zap,
  ChevronRight,
  Plus,
  Heart,
  TrendingUp,
  X,
  Check,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"

/* ==========================================================================
   TYPES
   ========================================================================== */

interface PassionPath {
  id: string
  name: string
  description: string
  category: string
  icon: string
  color: string
  xp_multiplier: number
  is_active: boolean
  is_enrolled?: boolean
}

interface PathEnrollment {
  enrollment: {
    id: string
    level: number
    xp_in_path: number
    started_at: string
    achievements: string[]
  }
  path: PassionPath
  stats: {
    creations_count: number
    total_likes: number
    xp_for_next_level: number
    progress_percent: number
  }
}

interface PathStats {
  total_paths: number
  total_creations: number
  total_likes: number
  total_xp: number
  highest_level: number
}

/* ==========================================================================
   ICON MAPPING
   ========================================================================== */

const iconMap: Record<string, React.ElementType> = {
  palette: Palette,
  music: Music,
  camera: Camera,
  pen: PenTool,
  code: Code,
  gamepad: Gamepad2,
  film: Film,
  mic: Mic,
  book: BookOpen,
  sparkles: Sparkles,
}

/* ==========================================================================
   COLOR MAPPING
   ========================================================================== */

const colorMap: Record<string, { bg: string; text: string; gradient: string }> = {
  red: { bg: "bg-destructive/10", text: "text-destructive", gradient: "from-destructive to-pink" },
  orange: { bg: "bg-coral/10", text: "text-coral", gradient: "from-coral to-gold" },
  yellow: { bg: "bg-gold/10", text: "text-gold", gradient: "from-gold to-gold" },
  green: { bg: "bg-lime/10", text: "text-lime", gradient: "from-lime to-lime" },
  cyan: { bg: "bg-teal/10", text: "text-teal", gradient: "from-teal to-teal" },
  blue: { bg: "bg-teal/10", text: "text-teal", gradient: "from-teal to-pink" },
  purple: { bg: "bg-pink/10", text: "text-pink", gradient: "from-pink to-pink" },
  pink: { bg: "bg-pink/10", text: "text-pink", gradient: "from-pink to-pink" },
}

/* ==========================================================================
   LEVEL BADGE
   ========================================================================== */

interface LevelBadgeProps {
  level: number
  size?: "sm" | "md" | "lg"
}

function LevelBadge({ level, size = "md" }: LevelBadgeProps) {
  const sizeClasses = {
    sm: "w-6 h-6 text-xs",
    md: "w-8 h-8 text-sm",
    lg: "w-12 h-12 text-lg",
  }

  const levelColors = level >= 10
    ? "bg-gradient-to-br from-gold to-gold text-ink"
    : level >= 5
    ? "bg-gradient-to-br from-pink to-pink text-ink"
    : "bg-gradient-to-br from-teal to-teal text-ink"

  return (
    <div className={cn(
      "rounded-full flex items-center justify-center font-bold",
      sizeClasses[size],
      levelColors
    )}>
      {level}
    </div>
  )
}

/* ==========================================================================
   ENROLLED PATH CARD
   ========================================================================== */

interface EnrolledPathCardProps {
  data: PathEnrollment
  onClick: () => void
  isExpanded: boolean
}

function EnrolledPathCard({ data, onClick, isExpanded }: EnrolledPathCardProps) {
  const { path, enrollment, stats } = data
  const Icon = iconMap[path.icon] || Sparkles
  const colors = colorMap[path.color] || colorMap.cyan

  return (
    <motion.div layout>
      <Card
        className={cn(
          "overflow-hidden transition-all cursor-pointer hover:border-ink",
          "bg-card border-ink"
        )}
        onClick={onClick}
      >
        <div className="p-4">
          <div className="flex items-center gap-4">
            {/* Icon with gradient */}
            <div className={cn(
              "w-16 h-16 rounded-2xl flex items-center justify-center",
              `bg-gradient-to-br ${colors.gradient}`
            )}>
              <Icon className="w-8 h-8 text-ink" />
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <LevelBadge level={enrollment.level} size="sm" />
                <span className={cn(
                  "text-xs font-medium px-2 py-0.5 rounded-full capitalize",
                  colors.bg, colors.text
                )}>
                  {path.category}
                </span>
              </div>

              <h3 className="font-bold text-ink line-clamp-1">{path.name}</h3>

              {/* Progress bar */}
              <div className="mt-2">
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="text-mute">
                    {enrollment.xp_in_path} / {stats.xp_for_next_level} XP
                  </span>
                  <span className={colors.text}>{stats.progress_percent}%</span>
                </div>
                <Progress value={stats.progress_percent} className="h-1.5" />
              </div>
            </div>

            {/* Stats */}
            <div className="text-right hidden sm:block">
              <p className="text-xl font-bold text-ink">{stats.creations_count}</p>
              <p className="text-xs text-mute">creations</p>
            </div>

            <ChevronRight className={cn(
              "w-5 h-5 text-mute transition-transform",
              isExpanded && "rotate-90"
            )} />
          </div>
        </div>

        {/* Expanded content */}
        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="px-4 pb-4 border-t border-ink pt-4">
                <p className="text-sm text-mute mb-4">{path.description}</p>

                {/* Stats grid */}
                <div className="grid grid-cols-3 gap-4 mb-4">
                  <div className="text-center p-3 bg-card rounded-xl">
                    <Camera className="w-5 h-5 text-teal mx-auto mb-1" />
                    <p className="text-lg font-bold text-ink">{stats.creations_count}</p>
                    <p className="text-xs text-mute">Creations</p>
                  </div>
                  <div className="text-center p-3 bg-card rounded-xl">
                    <Heart className="w-5 h-5 text-pink mx-auto mb-1" />
                    <p className="text-lg font-bold text-ink">{stats.total_likes}</p>
                    <p className="text-xs text-mute">Likes</p>
                  </div>
                  <div className="text-center p-3 bg-card rounded-xl">
                    <Zap className="w-5 h-5 text-gold mx-auto mb-1" />
                    <p className="text-lg font-bold text-ink">{enrollment.xp_in_path}</p>
                    <p className="text-xs text-mute">XP</p>
                  </div>
                </div>

                {/* XP Multiplier info */}
                {path.xp_multiplier > 1 && (
                  <div className="p-3 bg-gold/10 rounded-xl mb-4">
                    <p className="text-sm text-gold flex items-center gap-2">
                      <Star className="w-4 h-4" />
                      Multiplicateur XP: x{path.xp_multiplier}
                    </p>
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-3">
                  <Button
                    className={cn("flex-1 bg-gradient-to-r", colors.gradient)}
                    onClick={(e) => {
                      e.stopPropagation()
                      // Navigate to creations
                    }}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Nouvelle creation
                  </Button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </Card>
    </motion.div>
  )
}

/* ==========================================================================
   AVAILABLE PATH CARD
   ========================================================================== */

interface AvailablePathCardProps {
  path: PassionPath
  onEnroll: () => void
}

function AvailablePathCard({ path, onEnroll }: AvailablePathCardProps) {
  const Icon = iconMap[path.icon] || Sparkles
  const colors = colorMap[path.color] || colorMap.cyan

  return (
    <Card className="p-4 bg-card border-ink hover:border-ink transition-colors">
      <div className="flex items-center gap-4">
        <div className={cn(
          "w-14 h-14 rounded-2xl flex items-center justify-center",
          `bg-gradient-to-br ${colors.gradient}`
        )}>
          <Icon className="w-7 h-7 text-ink" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className={cn(
              "text-xs font-medium px-2 py-0.5 rounded-full capitalize",
              colors.bg, colors.text
            )}>
              {path.category}
            </span>
            {path.xp_multiplier > 1 && (
              <span className="text-xs text-gold flex items-center gap-1">
                <Star className="w-3 h-3" />
                x{path.xp_multiplier}
              </span>
            )}
          </div>
          <h4 className="font-bold text-ink line-clamp-1">{path.name}</h4>
          <p className="text-sm text-mute line-clamp-1">{path.description}</p>
        </div>

        {path.is_enrolled ? (
          <span className="flex items-center gap-1 text-sm text-lime bg-lime/10 px-3 py-1.5 rounded-full">
            <Check className="w-4 h-4" />
            Inscrit
          </span>
        ) : (
          <Button
            onClick={onEnroll}
            size="sm"
            className={cn("bg-gradient-to-r", colors.gradient)}
          >
            <Plus className="w-4 h-4 mr-1" />
            Rejoindre
          </Button>
        )}
      </div>
    </Card>
  )
}

/* ==========================================================================
   ENROLL MODAL
   ========================================================================== */

interface EnrollModalProps {
  isOpen: boolean
  onClose: () => void
  paths: PassionPath[]
  onEnroll: (pathId: string) => void
}

function EnrollModal({ isOpen, onClose, paths, onEnroll }: EnrollModalProps) {
  const [filterCategory, setFilterCategory] = useState("")

  const categories = [...new Set(paths.map((p) => p.category))]
  const filteredPaths = filterCategory
    ? paths.filter((p) => p.category === filterCategory)
    : paths

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-ink/80"
        onClick={onClose}
      />
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="relative bg-card rounded-2xl p-6 max-w-lg w-full border border-ink max-h-[80vh] overflow-hidden flex flex-col"
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-bold text-ink">Choisir un parcours</h3>
          <button
            onClick={onClose}
            className="text-mute hover:text-ink"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Category filter */}
        <div className="flex gap-2 flex-wrap mb-4">
          <button
            onClick={() => setFilterCategory("")}
            className={cn(
              "px-3 py-1.5 rounded-lg text-sm font-medium transition-all",
              !filterCategory
                ? "bg-teal text-ink"
                : "bg-card text-mute hover:bg-muted"
            )}
          >
            Tous
          </button>
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setFilterCategory(cat)}
              className={cn(
                "px-3 py-1.5 rounded-lg text-sm font-medium capitalize transition-all",
                filterCategory === cat
                  ? "bg-teal text-ink"
                  : "bg-card text-mute hover:bg-muted"
              )}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Paths list */}
        <div className="flex-1 overflow-y-auto space-y-3">
          {filteredPaths.map((path) => (
            <AvailablePathCard
              key={path.id}
              path={path}
              onEnroll={() => {
                onEnroll(path.id)
                onClose()
              }}
            />
          ))}

          {filteredPaths.length === 0 && (
            <div className="text-center py-8">
              <Sparkles className="w-12 h-12 text-mute mx-auto mb-4" />
              <p className="text-mute">Aucun parcours disponible</p>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  )
}

/* ==========================================================================
   PASSION PATHS DASHBOARD
   ========================================================================== */

interface PassionPathsDashboardProps {
  teenId: string
  onNavigateToCreations?: (pathId: string) => void
}

export function PassionPathsDashboard({
  teenId,
  onNavigateToCreations,
}: PassionPathsDashboardProps) {
  const [enrolledPaths, setEnrolledPaths] = useState<PathEnrollment[]>([])
  const [allPaths, setAllPaths] = useState<PassionPath[]>([])
  const [stats, setStats] = useState<PathStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [showEnrollModal, setShowEnrollModal] = useState(false)

  const fetchPaths = async () => {
    setLoading(true)
    try {
      const response = await fetch(
        `/api/teen/creativity/paths?teenId=${teenId}&includeAll=true`
      )
      const data = await response.json()

      if (data.success) {
        setEnrolledPaths(data.enrolledPaths)
        setAllPaths(data.allPaths || [])
        setStats(data.stats)
      }
    } catch (error) {
      console.error("Error fetching paths:", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchPaths()
  }, [teenId])

  const handleEnroll = async (pathId: string) => {
    try {
      const response = await fetch("/api/teen/creativity/paths", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          teenId,
          pathId,
          action: "enroll",
        }),
      })

      if (response.ok) {
        fetchPaths()
      }
    } catch (error) {
      console.error("Error enrolling:", error)
    }
  }

  if (loading) {
    return (
      <div className="space-y-4 animate-pulse">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-32 bg-card rounded-2xl" />
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Stats header */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
          <Card className="p-4 bg-card border-ink text-center">
            <Palette className="w-6 h-6 text-pink mx-auto mb-2" />
            <p className="text-2xl font-bold text-ink">{stats.total_paths}</p>
            <p className="text-xs text-mute">Parcours</p>
          </Card>
          <Card className="p-4 bg-card border-ink text-center">
            <Camera className="w-6 h-6 text-teal mx-auto mb-2" />
            <p className="text-2xl font-bold text-ink">{stats.total_creations}</p>
            <p className="text-xs text-mute">Creations</p>
          </Card>
          <Card className="p-4 bg-card border-ink text-center">
            <Heart className="w-6 h-6 text-pink mx-auto mb-2" />
            <p className="text-2xl font-bold text-ink">{stats.total_likes}</p>
            <p className="text-xs text-mute">Likes</p>
          </Card>
          <Card className="p-4 bg-card border-ink text-center">
            <Zap className="w-6 h-6 text-gold mx-auto mb-2" />
            <p className="text-2xl font-bold text-ink">{stats.total_xp}</p>
            <p className="text-xs text-mute">XP Crea</p>
          </Card>
          <Card className="p-4 bg-card border-ink text-center">
            <Trophy className="w-6 h-6 text-coral mx-auto mb-2" />
            <p className="text-2xl font-bold text-ink">{stats.highest_level}</p>
            <p className="text-xs text-mute">Niveau max</p>
          </Card>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-ink">Mes parcours passion</h2>
        <Button
          onClick={() => setShowEnrollModal(true)}
          className="bg-gradient-to-r from-pink to-pink"
        >
          <Plus className="w-4 h-4 mr-2" />
          Nouveau parcours
        </Button>
      </div>

      {/* Enrolled paths */}
      <div className="space-y-4">
        {enrolledPaths.map((pathData) => (
          <EnrolledPathCard
            key={pathData.path.id}
            data={pathData}
            onClick={() =>
              setExpandedId(expandedId === pathData.path.id ? null : pathData.path.id)
            }
            isExpanded={expandedId === pathData.path.id}
          />
        ))}
      </div>

      {/* Empty state */}
      {enrolledPaths.length === 0 && (
        <Card className="p-8 bg-card border-ink text-center">
          <Sparkles className="w-12 h-12 text-mute mx-auto mb-4" />
          <h3 className="text-lg font-bold text-ink mb-2">Aucun parcours</h3>
          <p className="text-mute mb-4">
            Choisis un parcours passion pour commencer a creer !
          </p>
          <Button
            onClick={() => setShowEnrollModal(true)}
            className="bg-gradient-to-r from-pink to-pink"
          >
            <Plus className="w-4 h-4 mr-2" />
            Choisir un parcours
          </Button>
        </Card>
      )}

      {/* Enroll modal */}
      <EnrollModal
        isOpen={showEnrollModal}
        onClose={() => setShowEnrollModal(false)}
        paths={allPaths}
        onEnroll={handleEnroll}
      />
    </div>
  )
}

/* ==========================================================================
   PATHS WIDGET
   ========================================================================== */

interface PathsWidgetProps {
  teenId: string
  onSeeAll?: () => void
}

export function PathsWidget({ teenId, onSeeAll }: PathsWidgetProps) {
  const [paths, setPaths] = useState<PathEnrollment[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchPaths = async () => {
      try {
        const response = await fetch(
          `/api/teen/creativity/paths?teenId=${teenId}&includeAll=false`
        )
        const data = await response.json()
        if (data.success) {
          setPaths(data.enrolledPaths.slice(0, 3))
        }
      } catch (error) {
        console.error("Error fetching paths:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchPaths()
  }, [teenId])

  if (loading) {
    return (
      <div className="space-y-3 animate-pulse">
        {[1, 2].map((i) => (
          <div key={i} className="h-16 bg-card rounded-xl" />
        ))}
      </div>
    )
  }

  if (paths.length === 0) {
    return null
  }

  return (
    <Card className="p-4 bg-card border-ink">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-bold text-ink flex items-center gap-2">
          <Palette className="w-4 h-4 text-pink" />
          Parcours passion
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

      <div className="space-y-3">
        {paths.map((pathData) => {
          const Icon = iconMap[pathData.path.icon] || Sparkles
          const colors = colorMap[pathData.path.color] || colorMap.cyan

          return (
            <div
              key={pathData.path.id}
              className="flex items-center gap-3 p-2 rounded-lg hover:bg-card transition-colors"
            >
              <div className={cn(
                "w-10 h-10 rounded-xl flex items-center justify-center",
                `bg-gradient-to-br ${colors.gradient}`
              )}>
                <Icon className="w-5 h-5 text-ink" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm text-ink font-medium truncate">
                    {pathData.path.name}
                  </p>
                  <LevelBadge level={pathData.enrollment.level} size="sm" />
                </div>
                <Progress value={pathData.stats.progress_percent} className="h-1 mt-1" />
              </div>
            </div>
          )
        })}
      </div>
    </Card>
  )
}
