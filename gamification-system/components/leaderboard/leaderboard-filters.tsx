"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  Trophy, Calendar, Clock, Users, MapPin, Search,
  ChevronDown, X, Filter
} from "lucide-react"
import { cn } from "@/lib/utils"
import { type LeaderboardType } from "../../features/leaderboard/schema"

/* ==========================================================================
   TYPES
   ========================================================================== */

interface LeaderboardFiltersProps {
  activeType: LeaderboardType
  onTypeChange: (type: LeaderboardType) => void
  searchQuery?: string
  onSearchChange?: (query: string) => void
  cities?: string[]
  selectedCity?: string
  onCityChange?: (city: string | null) => void
  showSearch?: boolean
  showCityFilter?: boolean
  className?: string
}

/* ==========================================================================
   FILTER CONFIGS
   ========================================================================== */

const FILTER_TYPES = [
  {
    value: "all_time" as LeaderboardType,
    label: "All-Time",
    shortLabel: "All",
    icon: Trophy,
    description: "Classement global",
  },
  {
    value: "weekly" as LeaderboardType,
    label: "Semaine",
    shortLabel: "Sem.",
    icon: Calendar,
    description: "Cette semaine",
  },
  {
    value: "monthly" as LeaderboardType,
    label: "Mois",
    shortLabel: "Mois",
    icon: Clock,
    description: "Ce mois-ci",
  },
  {
    value: "friends" as LeaderboardType,
    label: "Amis",
    shortLabel: "Amis",
    icon: Users,
    description: "Entre amis",
  },
]

/* ==========================================================================
   COMPONENT
   ========================================================================== */

export function LeaderboardFilters({
  activeType,
  onTypeChange,
  searchQuery = "",
  onSearchChange,
  cities = [],
  selectedCity,
  onCityChange,
  showSearch = true,
  showCityFilter = false,
  className,
}: LeaderboardFiltersProps) {
  const [showCityDropdown, setShowCityDropdown] = useState(false)

  return (
    <div className={cn("space-y-4", className)}>
      {/* Type Filters */}
      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
        {FILTER_TYPES.map((filter) => {
          const Icon = filter.icon
          const isActive = activeType === filter.value

          return (
            <motion.button
              key={filter.value}
              onClick={() => onTypeChange(filter.value)}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-xl font-medium whitespace-nowrap transition-all",
                isActive
                  ? "bg-gradient-to-r from-cyan-500 to-blue-500 text-white shadow-lg shadow-cyan-500/25"
                  : "bg-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-700"
              )}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <Icon className="w-4 h-4" />
              <span className="hidden sm:inline">{filter.label}</span>
              <span className="sm:hidden">{filter.shortLabel}</span>
            </motion.button>
          )
        })}
      </div>

      {/* Search and City Filter Row */}
      {(showSearch || showCityFilter) && (
        <div className="flex gap-3">
          {/* Search */}
          {showSearch && onSearchChange && (
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
              <input
                type="text"
                placeholder="Rechercher un joueur..."
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-zinc-800 border border-zinc-700 rounded-xl text-white placeholder:text-zinc-500 focus:outline-none focus:border-cyan-500 transition-colors"
              />
              {searchQuery && (
                <button
                  onClick={() => onSearchChange("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          )}

          {/* City Filter */}
          {showCityFilter && onCityChange && cities.length > 0 && (
            <div className="relative">
              <button
                onClick={() => setShowCityDropdown(!showCityDropdown)}
                className={cn(
                  "flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium transition-all",
                  selectedCity
                    ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/50"
                    : "bg-zinc-800 text-zinc-400 hover:text-white border border-zinc-700"
                )}
              >
                <MapPin className="w-4 h-4" />
                <span className="hidden sm:inline">
                  {selectedCity || "Ville"}
                </span>
                <ChevronDown className={cn(
                  "w-4 h-4 transition-transform",
                  showCityDropdown && "rotate-180"
                )} />
              </button>

              <AnimatePresence>
                {showCityDropdown && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="absolute right-0 top-full mt-2 w-48 bg-zinc-900 border border-zinc-800 rounded-xl shadow-xl z-20 overflow-hidden"
                  >
                    <button
                      onClick={() => {
                        onCityChange(null)
                        setShowCityDropdown(false)
                      }}
                      className={cn(
                        "w-full px-4 py-2 text-left text-sm hover:bg-zinc-800 transition-colors",
                        !selectedCity ? "text-cyan-400" : "text-zinc-300"
                      )}
                    >
                      Toutes les villes
                    </button>

                    <div className="max-h-60 overflow-y-auto">
                      {cities.map((city) => (
                        <button
                          key={city}
                          onClick={() => {
                            onCityChange(city)
                            setShowCityDropdown(false)
                          }}
                          className={cn(
                            "w-full px-4 py-2 text-left text-sm hover:bg-zinc-800 transition-colors",
                            selectedCity === city ? "text-cyan-400" : "text-zinc-300"
                          )}
                        >
                          {city}
                        </button>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

/* ==========================================================================
   TAB FILTERS (Alternative style)
   ========================================================================== */

interface TabFiltersProps {
  activeType: LeaderboardType
  onTypeChange: (type: LeaderboardType) => void
  className?: string
}

export function TabFilters({
  activeType,
  onTypeChange,
  className,
}: TabFiltersProps) {
  return (
    <div className={cn("relative bg-zinc-900 p-1 rounded-xl", className)}>
      <div className="flex relative z-10">
        {FILTER_TYPES.slice(0, 3).map((filter) => {
          const isActive = activeType === filter.value

          return (
            <button
              key={filter.value}
              onClick={() => onTypeChange(filter.value)}
              className={cn(
                "flex-1 py-2 px-4 text-sm font-medium rounded-lg transition-colors relative z-10",
                isActive ? "text-white" : "text-zinc-500 hover:text-zinc-300"
              )}
            >
              {filter.label}
            </button>
          )
        })}
      </div>

      {/* Active indicator */}
      <motion.div
        className="absolute top-1 bottom-1 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-lg z-0"
        layoutId="activeTab"
        initial={false}
        animate={{
          left: `${(FILTER_TYPES.slice(0, 3).findIndex((f) => f.value === activeType) / 3) * 100 + 0.5}%`,
          width: "calc(33.333% - 4px)",
        }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
      />
    </div>
  )
}

/* ==========================================================================
   PERIOD INFO BADGE
   ========================================================================== */

interface PeriodBadgeProps {
  type: LeaderboardType
  periodLabel?: string
  className?: string
}

export function PeriodBadge({ type, periodLabel, className }: PeriodBadgeProps) {
  const filter = FILTER_TYPES.find((f) => f.value === type)
  if (!filter) return null

  const Icon = filter.icon

  return (
    <div
      className={cn(
        "inline-flex items-center gap-2 px-3 py-1.5 bg-zinc-800 rounded-lg text-sm",
        className
      )}
    >
      <Icon className="w-4 h-4 text-cyan-400" />
      <span className="text-zinc-400">{filter.description}</span>
      {periodLabel && (
        <>
          <span className="text-zinc-600">•</span>
          <span className="text-white font-medium">{periodLabel}</span>
        </>
      )}
    </div>
  )
}
