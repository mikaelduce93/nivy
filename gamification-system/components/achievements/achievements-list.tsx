"use client"

import { useState, useEffect, useMemo } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  Trophy, Award, Star, Zap, Users, Calendar, Heart, Target,
  Ticket, Crown, Medal, Compass, Globe, Sunrise, Clock, Flag, Moon,
  UserPlus, Megaphone, Share2, Share, UserCheck, Book, Dumbbell,
  Palette, Layers, CheckCircle, CalendarCheck, Flame, RefreshCw,
  TrendingUp, Shield, Bug, Ghost, Sparkles, Sun, Filter, Search,
  ChevronDown, Lock, Check
} from "lucide-react"
import { cn } from "@/lib/utils"
import {
  type UserAchievement,
  type AchievementCategory,
  type AchievementRarity,
  RARITY_CONFIG,
  CATEGORY_CONFIG,
} from "../../features/achievements/schema"
import { AchievementCard } from "./achievement-card"
import { AchievementProgressOverview } from "./achievement-progress"

/* ==========================================================================
   ICON MAPPING
   ========================================================================== */

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  trophy: Trophy,
  award: Award,
  star: Star,
  zap: Zap,
  users: Users,
  calendar: Calendar,
  heart: Heart,
  target: Target,
  ticket: Ticket,
  crown: Crown,
  medal: Medal,
  compass: Compass,
  globe: Globe,
  sunrise: Sunrise,
  clock: Clock,
  flag: Flag,
  moon: Moon,
  "user-plus": UserPlus,
  megaphone: Megaphone,
  "share-2": Share2,
  share: Share,
  "user-check": UserCheck,
  book: Book,
  dumbbell: Dumbbell,
  palette: Palette,
  layers: Layers,
  "check-circle": CheckCircle,
  "calendar-check": CalendarCheck,
  flame: Flame,
  "refresh-cw": RefreshCw,
  "trending-up": TrendingUp,
  shield: Shield,
  bug: Bug,
  ghost: Ghost,
  sparkles: Sparkles,
  sun: Sun,
  "party-popper": Sparkles,
  milestone: Flag,
}

export function getAchievementIcon(iconName: string) {
  return ICON_MAP[iconName] || Trophy
}

/* ==========================================================================
   TYPES
   ========================================================================== */

interface AchievementsListProps {
  achievements: UserAchievement[]
  loading?: boolean
  onAchievementClick?: (achievement: UserAchievement) => void
  showFilters?: boolean
  showSearch?: boolean
  showProgress?: boolean
  className?: string
}

type FilterType = "all" | "unlocked" | "locked" | "in_progress"
type SortType = "default" | "progress" | "rarity" | "points"

/* ==========================================================================
   COMPONENT
   ========================================================================== */

export function AchievementsList({
  achievements,
  loading = false,
  onAchievementClick,
  showFilters = true,
  showSearch = true,
  showProgress = true,
  className,
}: AchievementsListProps) {
  // Filters
  const [filterType, setFilterType] = useState<FilterType>("all")
  const [selectedCategory, setSelectedCategory] = useState<AchievementCategory | "all">("all")
  const [selectedRarity, setSelectedRarity] = useState<AchievementRarity | "all">("all")
  const [sortBy, setSortBy] = useState<SortType>("default")
  const [searchQuery, setSearchQuery] = useState("")
  const [showFilterDropdown, setShowFilterDropdown] = useState(false)

  // Stats
  const stats = useMemo(() => {
    const total = achievements.length
    const unlocked = achievements.filter((a) => a.is_unlocked).length
    const pointsTotal = achievements.reduce((sum, a) => sum + a.points, 0)
    const pointsEarned = achievements
      .filter((a) => a.is_unlocked)
      .reduce((sum, a) => sum + a.points, 0)

    return { total, unlocked, pointsTotal, pointsEarned }
  }, [achievements])

  // Filtered and sorted achievements
  const filteredAchievements = useMemo(() => {
    let result = [...achievements]

    // Filter by type
    switch (filterType) {
      case "unlocked":
        result = result.filter((a) => a.is_unlocked)
        break
      case "locked":
        result = result.filter((a) => !a.is_unlocked)
        break
      case "in_progress":
        result = result.filter((a) => !a.is_unlocked && a.percentage_complete > 0)
        break
    }

    // Filter by category
    if (selectedCategory !== "all") {
      result = result.filter((a) => a.category === selectedCategory)
    }

    // Filter by rarity
    if (selectedRarity !== "all") {
      result = result.filter((a) => a.rarity === selectedRarity)
    }

    // Search
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      result = result.filter(
        (a) =>
          a.name.toLowerCase().includes(query) ||
          a.description.toLowerCase().includes(query)
      )
    }

    // Sort
    switch (sortBy) {
      case "progress":
        result.sort((a, b) => b.percentage_complete - a.percentage_complete)
        break
      case "rarity": {
        const rarityOrder = { mythic: 0, legendary: 1, epic: 2, rare: 3, common: 4 }
        result.sort((a, b) => rarityOrder[a.rarity] - rarityOrder[b.rarity])
        break
      }
      case "points":
        result.sort((a, b) => b.points - a.points)
        break
    }

    return result
  }, [achievements, filterType, selectedCategory, selectedRarity, sortBy, searchQuery])

  // Group by category for display
  const groupedAchievements = useMemo(() => {
    if (selectedCategory !== "all") {
      return { [selectedCategory]: filteredAchievements }
    }

    const groups: Record<string, UserAchievement[]> = {}
    for (const achievement of filteredAchievements) {
      if (!groups[achievement.category]) {
        groups[achievement.category] = []
      }
      groups[achievement.category].push(achievement)
    }
    return groups
  }, [filteredAchievements, selectedCategory])

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <div className="w-16 h-16 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin" />
        <p className="mt-4 text-zinc-400">Chargement des achievements...</p>
      </div>
    )
  }

  return (
    <div className={cn("space-y-6", className)}>
      {/* Progress Overview */}
      {showProgress && (
        <AchievementProgressOverview
          total={stats.total}
          unlocked={stats.unlocked}
          pointsTotal={stats.pointsTotal}
          pointsEarned={stats.pointsEarned}
        />
      )}

      {/* Search and Filters */}
      {(showSearch || showFilters) && (
        <div className="space-y-4">
          {/* Search Bar */}
          {showSearch && (
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
              <input
                type="text"
                placeholder="Rechercher un achievement..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-3 bg-zinc-900 border border-zinc-800 rounded-xl text-white placeholder:text-zinc-500 focus:outline-none focus:border-cyan-500 transition-colors"
              />
            </div>
          )}

          {/* Filter Pills */}
          {showFilters && (
            <div className="flex flex-wrap gap-2">
              {/* Type Filter */}
              <div className="flex gap-1 p-1 bg-zinc-900 rounded-lg">
                {[
                  { value: "all", label: "Tous" },
                  { value: "unlocked", label: "Débloqués" },
                  { value: "locked", label: "Verrouillés" },
                  { value: "in_progress", label: "En cours" },
                ].map(({ value, label }) => (
                  <button
                    key={value}
                    onClick={() => setFilterType(value as FilterType)}
                    className={cn(
                      "px-3 py-1.5 text-sm font-medium rounded-md transition-colors",
                      filterType === value
                        ? "bg-cyan-500 text-white"
                        : "text-zinc-400 hover:text-white"
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>

              {/* Category Filter */}
              <div className="relative">
                <button
                  onClick={() => setShowFilterDropdown(!showFilterDropdown)}
                  className="flex items-center gap-2 px-4 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-sm text-zinc-300 hover:border-zinc-700 transition-colors"
                >
                  <Filter className="w-4 h-4" />
                  <span>
                    {selectedCategory === "all"
                      ? "Catégorie"
                      : CATEGORY_CONFIG[selectedCategory]?.label}
                  </span>
                  <ChevronDown className="w-4 h-4" />
                </button>

                <AnimatePresence>
                  {showFilterDropdown && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="absolute top-full left-0 mt-2 w-48 bg-zinc-900 border border-zinc-800 rounded-xl shadow-xl z-10 overflow-hidden"
                    >
                      <button
                        onClick={() => {
                          setSelectedCategory("all")
                          setShowFilterDropdown(false)
                        }}
                        className={cn(
                          "w-full px-4 py-2 text-left text-sm hover:bg-zinc-800 transition-colors",
                          selectedCategory === "all" ? "text-cyan-400" : "text-zinc-300"
                        )}
                      >
                        Toutes les catégories
                      </button>
                      {Object.entries(CATEGORY_CONFIG).map(([key, config]) => {
                        const Icon = ICON_MAP[config.icon] || Trophy
                        return (
                          <button
                            key={key}
                            onClick={() => {
                              setSelectedCategory(key as AchievementCategory)
                              setShowFilterDropdown(false)
                            }}
                            className={cn(
                              "w-full px-4 py-2 text-left text-sm flex items-center gap-2 hover:bg-zinc-800 transition-colors",
                              selectedCategory === key ? "text-cyan-400" : "text-zinc-300"
                            )}
                          >
                            <Icon className={cn("w-4 h-4", config.color)} />
                            {config.label}
                          </button>
                        )
                      })}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Rarity Pills */}
              <div className="flex gap-1 p-1 bg-zinc-900 rounded-lg">
                <button
                  onClick={() => setSelectedRarity("all")}
                  className={cn(
                    "px-3 py-1.5 text-xs font-medium rounded-md transition-colors",
                    selectedRarity === "all"
                      ? "bg-zinc-700 text-white"
                      : "text-zinc-500 hover:text-white"
                  )}
                >
                  Tous
                </button>
                {(["common", "rare", "epic", "legendary", "mythic"] as const).map((rarity) => (
                  <button
                    key={rarity}
                    onClick={() => setSelectedRarity(rarity)}
                    className={cn(
                      "px-3 py-1.5 text-xs font-medium rounded-md transition-colors",
                      selectedRarity === rarity
                        ? `bg-gradient-to-r ${RARITY_CONFIG[rarity].gradient} text-white`
                        : "text-zinc-500 hover:text-white"
                    )}
                  >
                    {RARITY_CONFIG[rarity].label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Achievements Grid */}
      {filteredAchievements.length === 0 ? (
        <div className="text-center py-12">
          <Lock className="w-16 h-16 mx-auto text-zinc-700 mb-4" />
          <h3 className="text-xl font-bold text-white mb-2">Aucun achievement trouvé</h3>
          <p className="text-zinc-400">
            {searchQuery
              ? "Essaie une autre recherche"
              : "Continue à jouer pour débloquer des achievements !"}
          </p>
        </div>
      ) : (
        <div className="space-y-8">
          {Object.entries(groupedAchievements).map(([category, categoryAchievements]) => {
            const categoryConfig = CATEGORY_CONFIG[category as AchievementCategory]
            if (!categoryConfig || categoryAchievements.length === 0) return null

            const CategoryIcon = ICON_MAP[categoryConfig.icon] || Trophy
            const unlockedCount = categoryAchievements.filter((a) => a.is_unlocked).length

            return (
              <motion.div
                key={category}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-4"
              >
                {/* Category Header */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={cn("p-2 rounded-lg", categoryConfig.bgColor)}>
                      <CategoryIcon className={cn("w-5 h-5", categoryConfig.color)} />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-white">{categoryConfig.label}</h3>
                      <p className="text-sm text-zinc-500">
                        {unlockedCount} / {categoryAchievements.length} débloqués
                      </p>
                    </div>
                  </div>

                  {/* Category Progress Bar */}
                  <div className="hidden sm:block w-32">
                    <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
                      <motion.div
                        className={cn(
                          "h-full rounded-full",
                          `bg-gradient-to-r from-cyan-500 to-blue-500`
                        )}
                        initial={{ width: 0 }}
                        animate={{
                          width: `${(unlockedCount / categoryAchievements.length) * 100}%`,
                        }}
                        transition={{ duration: 0.5 }}
                      />
                    </div>
                  </div>
                </div>

                {/* Achievements Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {categoryAchievements.map((achievement, index) => (
                    <motion.div
                      key={achievement.id}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: index * 0.05 }}
                    >
                      <AchievementCard
                        achievement={achievement}
                        onClick={() => onAchievementClick?.(achievement)}
                      />
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            )
          })}
        </div>
      )}
    </div>
  )
}

export { ICON_MAP }
