/**
 * TEENS PARTY MOROCCO - Activity Feed Components
 * ===============================================
 *
 * Composants pour le fil d'activité principal.
 */

"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  RefreshCw,
  Filter,
  Trophy,
  Users,
  Calendar,
  Gamepad2,
  Layers,
  Flag,
  Globe,
  UserCircle,
  TrendingUp,
  Clock,
  Sparkles,
  ChevronDown,
  X,
} from "lucide-react"
import {
  type ActivityWithUser,
  type ActivityCategory,
  type FeedOrder,
  type ReactionType,
  type ActivityVisibility,
  CATEGORY_CONFIG,
  formatDayLabel,
  groupActivitiesByDay,
} from "../../features/activity-feed"
import { ActivityCard, ActivityCardSkeleton } from "./activity-card"

/* ==========================================================================
   ACTIVITY FEED
   ========================================================================== */

interface ActivityFeedProps {
  initialActivities?: ActivityWithUser[]
  feedType?: "friends" | "public" | "personal"
  userId?: string
  onLoadMore?: (offset: number) => Promise<{
    activities: ActivityWithUser[]
    hasMore: boolean
  }>
  onRefresh?: () => Promise<ActivityWithUser[]>
  onReact?: (activityId: string, reaction: ReactionType) => void
  onComment?: (activityId: string) => void
  onShare?: (activityId: string) => void
  onPin?: (activityId: string) => void
  onHide?: (activityId: string) => void
  onDelete?: (activityId: string) => void
  onChangeVisibility?: (activityId: string, visibility: ActivityVisibility) => void
  onUserClick?: (userId: string) => void
  currentUserId?: string
  showFilters?: boolean
  showDayGroups?: boolean
}

export function ActivityFeed({
  initialActivities = [],
  feedType = "friends",
  userId,
  onLoadMore,
  onRefresh,
  onReact,
  onComment,
  onShare,
  onPin,
  onHide,
  onDelete,
  onChangeVisibility,
  onUserClick,
  currentUserId,
  showFilters = true,
  showDayGroups = true,
}: ActivityFeedProps) {
  const [activities, setActivities] = useState<ActivityWithUser[]>(initialActivities)
  const [loading, setLoading] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const [selectedCategory, setSelectedCategory] = useState<ActivityCategory | null>(null)
  const [order, setOrder] = useState<FeedOrder>("recent")
  const observerRef = useRef<HTMLDivElement>(null)

  // Infinite scroll
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loading && onLoadMore) {
          loadMore()
        }
      },
      { threshold: 0.1 }
    )

    if (observerRef.current) {
      observer.observe(observerRef.current)
    }

    return () => observer.disconnect()
  }, [hasMore, loading])

  const loadMore = async () => {
    if (!onLoadMore || loading) return
    setLoading(true)
    try {
      const result = await onLoadMore(activities.length)
      setActivities((prev) => [...prev, ...result.activities])
      setHasMore(result.hasMore)
    } finally {
      setLoading(false)
    }
  }

  const handleRefresh = async () => {
    if (!onRefresh || refreshing) return
    setRefreshing(true)
    try {
      const newActivities = await onRefresh()
      setActivities(newActivities)
      setHasMore(true)
    } finally {
      setRefreshing(false)
    }
  }

  // Filter activities
  const filteredActivities = selectedCategory
    ? activities.filter((a) => a.activity_type.category === selectedCategory)
    : activities

  // Group by day
  const groupedActivities = showDayGroups
    ? groupActivitiesByDay(filteredActivities)
    : null

  return (
    <div className="space-y-4">
      {/* Header */}
      {showFilters && (
        <FeedHeader
          feedType={feedType}
          selectedCategory={selectedCategory}
          onCategoryChange={setSelectedCategory}
          order={order}
          onOrderChange={setOrder}
          onRefresh={handleRefresh}
          refreshing={refreshing}
        />
      )}

      {/* Activities */}
      {filteredActivities.length === 0 && !loading ? (
        <EmptyFeed feedType={feedType} />
      ) : showDayGroups && groupedActivities ? (
        // Grouped by day
        Array.from(groupedActivities.entries()).map(([dayKey, dayActivities]) => (
          <div key={dayKey} className="space-y-4">
            <DayDivider date={dayKey} />
            {dayActivities.map((activity) => (
              <ActivityCard
                key={activity.id}
                activity={activity}
                onReact={onReact}
                onComment={onComment}
                onShare={onShare}
                onPin={onPin}
                onHide={onHide}
                onDelete={onDelete}
                onChangeVisibility={onChangeVisibility}
                onUserClick={onUserClick}
                isOwner={currentUserId === activity.user_id}
              />
            ))}
          </div>
        ))
      ) : (
        // Flat list
        filteredActivities.map((activity) => (
          <ActivityCard
            key={activity.id}
            activity={activity}
            onReact={onReact}
            onComment={onComment}
            onShare={onShare}
            onPin={onPin}
            onHide={onHide}
            onDelete={onDelete}
            onChangeVisibility={onChangeVisibility}
            onUserClick={onUserClick}
            isOwner={currentUserId === activity.user_id}
          />
        ))
      )}

      {/* Loading */}
      {loading && (
        <div className="space-y-4">
          <ActivityCardSkeleton />
          <ActivityCardSkeleton />
        </div>
      )}

      {/* Infinite scroll trigger */}
      <div ref={observerRef} className="h-4" />

      {/* End of feed */}
      {!hasMore && filteredActivities.length > 0 && (
        <div className="text-center py-8 text-zinc-500">
          <Sparkles className="w-6 h-6 mx-auto mb-2" />
          <p className="text-sm">Vous êtes à jour !</p>
        </div>
      )}
    </div>
  )
}

/* ==========================================================================
   FEED HEADER
   ========================================================================== */

interface FeedHeaderProps {
  feedType: "friends" | "public" | "personal"
  selectedCategory: ActivityCategory | null
  onCategoryChange: (category: ActivityCategory | null) => void
  order: FeedOrder
  onOrderChange: (order: FeedOrder) => void
  onRefresh: () => void
  refreshing: boolean
}

function FeedHeader({
  feedType,
  selectedCategory,
  onCategoryChange,
  order,
  onOrderChange,
  onRefresh,
  refreshing,
}: FeedHeaderProps) {
  const [showFilters, setShowFilters] = useState(false)

  const feedTypeIcons = {
    friends: Users,
    public: Globe,
    personal: UserCircle,
  }
  const feedTypeLabels = {
    friends: "Amis",
    public: "Public",
    personal: "Mon activité",
  }

  const FeedIcon = feedTypeIcons[feedType]

  return (
    <div className="space-y-3">
      {/* Main header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FeedIcon className="w-5 h-5 text-cyan-400" />
          <h2 className="text-lg font-bold text-white">
            {feedTypeLabels[feedType]}
          </h2>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`p-2 rounded-lg transition-colors ${
              showFilters || selectedCategory
                ? "bg-cyan-500/20 text-cyan-400"
                : "bg-zinc-800 text-zinc-400 hover:text-white"
            }`}
          >
            <Filter className="w-5 h-5" />
          </button>

          <button
            onClick={onRefresh}
            disabled={refreshing}
            className="p-2 rounded-lg bg-zinc-800 text-zinc-400 hover:text-white transition-colors disabled:opacity-50"
          >
            <RefreshCw
              className={`w-5 h-5 ${refreshing ? "animate-spin" : ""}`}
            />
          </button>
        </div>
      </div>

      {/* Filters */}
      <AnimatePresence>
        {showFilters && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-3"
          >
            {/* Category filters */}
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => onCategoryChange(null)}
                className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                  !selectedCategory
                    ? "bg-cyan-500 text-white"
                    : "bg-zinc-800 text-zinc-400 hover:text-white"
                }`}
              >
                Tout
              </button>
              {(Object.keys(CATEGORY_CONFIG) as ActivityCategory[]).map(
                (category) => {
                  const config = CATEGORY_CONFIG[category]
                  const isSelected = selectedCategory === category
                  return (
                    <button
                      key={category}
                      onClick={() =>
                        onCategoryChange(isSelected ? null : category)
                      }
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                        isSelected
                          ? `${config.bgColor} ${config.color}`
                          : "bg-zinc-800 text-zinc-400 hover:text-white"
                      }`}
                    >
                      <CategoryIcon category={category} size={14} />
                      {config.name}
                    </button>
                  )
                }
              )}
            </div>

            {/* Order */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-zinc-500">Trier par:</span>
              <select
                value={order}
                onChange={(e) => onOrderChange(e.target.value as FeedOrder)}
                className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-cyan-500"
              >
                <option value="recent">Plus récent</option>
                <option value="popular">Populaire</option>
                <option value="relevance">Pertinence</option>
              </select>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Active filter chip */}
      {selectedCategory && !showFilters && (
        <div className="flex items-center gap-2">
          <span className="text-sm text-zinc-500">Filtré par:</span>
          <button
            onClick={() => onCategoryChange(null)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium ${CATEGORY_CONFIG[selectedCategory].bgColor} ${CATEGORY_CONFIG[selectedCategory].color}`}
          >
            <CategoryIcon category={selectedCategory} size={14} />
            {CATEGORY_CONFIG[selectedCategory].name}
            <X className="w-3 h-3 ml-1" />
          </button>
        </div>
      )}
    </div>
  )
}

/* ==========================================================================
   DAY DIVIDER
   ========================================================================== */

interface DayDividerProps {
  date: string
}

function DayDivider({ date }: DayDividerProps) {
  return (
    <div className="flex items-center gap-3 py-2">
      <div className="flex-1 h-px bg-zinc-800" />
      <span className="text-xs font-medium text-zinc-500 uppercase">
        {formatDayLabel(date)}
      </span>
      <div className="flex-1 h-px bg-zinc-800" />
    </div>
  )
}

/* ==========================================================================
   EMPTY FEED
   ========================================================================== */

interface EmptyFeedProps {
  feedType: "friends" | "public" | "personal"
}

function EmptyFeed({ feedType }: EmptyFeedProps) {
  const messages = {
    friends: {
      title: "Rien à voir ici",
      description: "Vos amis n'ont pas encore d'activité récente.",
      icon: Users,
    },
    public: {
      title: "Pas d'activité publique",
      description: "Soyez le premier à partager quelque chose !",
      icon: Globe,
    },
    personal: {
      title: "Pas encore d'activité",
      description: "Participez aux événements pour générer de l'activité !",
      icon: Sparkles,
    },
  }

  const { title, description, icon: Icon } = messages[feedType]

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="text-center py-12"
    >
      <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-zinc-800 flex items-center justify-center">
        <Icon className="w-8 h-8 text-zinc-600" />
      </div>
      <h3 className="text-lg font-bold text-white mb-2">{title}</h3>
      <p className="text-sm text-zinc-500">{description}</p>
    </motion.div>
  )
}

/* ==========================================================================
   FEED TABS
   ========================================================================== */

interface FeedTabsProps {
  activeTab: "friends" | "public" | "personal"
  onTabChange: (tab: "friends" | "public" | "personal") => void
  friendsCount?: number
}

export function FeedTabs({
  activeTab,
  onTabChange,
  friendsCount,
}: FeedTabsProps) {
  const tabs = [
    { id: "friends" as const, label: "Amis", icon: Users, count: friendsCount },
    { id: "public" as const, label: "Public", icon: Globe },
    { id: "personal" as const, label: "Mon activité", icon: UserCircle },
  ]

  return (
    <div className="flex gap-2 p-1 bg-zinc-900 rounded-xl">
      {tabs.map((tab) => {
        const Icon = tab.icon
        const isActive = activeTab === tab.id
        return (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`flex-1 flex items-center justify-center gap-2 py-2 px-4 rounded-lg text-sm font-medium transition-colors ${
              isActive
                ? "bg-cyan-500 text-white"
                : "text-zinc-400 hover:text-white hover:bg-zinc-800"
            }`}
          >
            <Icon className="w-4 h-4" />
            <span>{tab.label}</span>
            {tab.count !== undefined && tab.count > 0 && (
              <span
                className={`px-1.5 py-0.5 rounded-full text-xs ${
                  isActive ? "bg-white/20" : "bg-zinc-800"
                }`}
              >
                {tab.count}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}

/* ==========================================================================
   HELPERS
   ========================================================================== */

interface CategoryIconProps {
  category: ActivityCategory
  size?: number
}

function CategoryIcon({ category, size = 16 }: CategoryIconProps) {
  const iconMap: Record<ActivityCategory, typeof Trophy> = {
    achievement: Trophy,
    social: Users,
    event: Calendar,
    game: Gamepad2,
    collection: Layers,
    milestone: Flag,
  }

  const Icon = iconMap[category]
  return <Icon style={{ width: size, height: size }} />
}
