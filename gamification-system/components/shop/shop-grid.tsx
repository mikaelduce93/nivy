"use client"

import { useState, useMemo } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  Search,
  Filter,
  X,
  SlidersHorizontal,
  Ticket,
  Star,
  Percent,
  Gift,
  Sparkles,
  Palette,
  Box,
  ShoppingBag,
  Zap,
  ArrowUpDown,
  Check,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { RewardCard } from "./reward-card"
import {
  type ShopReward,
  type RewardCategory,
  CATEGORY_ICONS,
  sortRewardsByRelevance,
  groupRewardsByCategory,
  formatXPPrice,
} from "../../features/shop/schema"

/* ==========================================================================
   TYPES
   ========================================================================== */

interface ShopGridProps {
  rewards: ShopReward[]
  categories: RewardCategory[]
  userXP?: number
  onPurchase?: (rewardId: string) => void
  onToggleWishlist?: (rewardId: string) => void
  onRewardClick?: (reward: ShopReward) => void
  isLoading?: boolean
  className?: string
}

type SortOption = "relevance" | "price_asc" | "price_desc" | "newest"

/* ==========================================================================
   ICON MAP
   ========================================================================== */

const CATEGORY_ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  ticket: Ticket,
  star: Star,
  percent: Percent,
  gift: Gift,
  sparkles: Sparkles,
  palette: Palette,
  box: Box,
}

/* ==========================================================================
   COMPONENT
   ========================================================================== */

export function ShopGrid({
  rewards,
  categories,
  userXP = 0,
  onPurchase,
  onToggleWishlist,
  onRewardClick,
  isLoading = false,
  className,
}: ShopGridProps) {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [sortOption, setSortOption] = useState<SortOption>("relevance")
  const [showAffordableOnly, setShowAffordableOnly] = useState(false)
  const [showFilters, setShowFilters] = useState(false)

  // Filter and sort rewards
  const filteredRewards = useMemo(() => {
    let result = [...rewards]

    // Filter by category
    if (selectedCategory) {
      result = result.filter((r) => r.category_slug === selectedCategory)
    }

    // Filter by search
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      result = result.filter(
        (r) =>
          r.name.toLowerCase().includes(query) ||
          r.description.toLowerCase().includes(query)
      )
    }

    // Filter by affordability
    if (showAffordableOnly) {
      result = result.filter((r) => r.xp_cost <= userXP)
    }

    // Sort
    switch (sortOption) {
      case "price_asc":
        result.sort((a, b) => a.xp_cost - b.xp_cost)
        break
      case "price_desc":
        result.sort((a, b) => b.xp_cost - a.xp_cost)
        break
      case "newest":
        result = result.filter((r) => r.is_new).concat(result.filter((r) => !r.is_new))
        break
      default:
        result = sortRewardsByRelevance(result)
    }

    return result
  }, [rewards, selectedCategory, searchQuery, sortOption, showAffordableOnly, userXP])

  // Group by category for display
  const groupedRewards = useMemo(() => {
    if (selectedCategory) return null
    return groupRewardsByCategory(filteredRewards)
  }, [filteredRewards, selectedCategory])

  return (
    <div className={cn("space-y-6", className)}>
      {/* Header with XP Balance */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-black text-white">Boutique</h2>
        <div className="flex items-center gap-2 px-4 py-2 bg-yellow-500/10 border border-yellow-500/30 rounded-xl">
          <Zap className="w-5 h-5 text-yellow-400" />
          <span className="font-bold text-yellow-400">{formatXPPrice(userXP)} XP</span>
        </div>
      </div>

      {/* Category Tabs */}
      <CategoryTabs
        categories={categories}
        selectedCategory={selectedCategory}
        onSelectCategory={setSelectedCategory}
      />

      {/* Filters Row */}
      <div className="flex flex-wrap gap-3">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
          <input
            type="text"
            placeholder="Rechercher..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-10 py-2.5 bg-zinc-800 border border-zinc-700 rounded-xl text-white placeholder:text-zinc-500 focus:outline-none focus:border-cyan-500"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Sort */}
        <SortDropdown value={sortOption} onChange={setSortOption} />

        {/* Affordable Filter */}
        <button
          onClick={() => setShowAffordableOnly(!showAffordableOnly)}
          className={cn(
            "flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium transition-all",
            showAffordableOnly
              ? "bg-green-500/20 text-green-400 border border-green-500/50"
              : "bg-zinc-800 text-zinc-400 hover:text-white border border-zinc-700"
          )}
        >
          <Zap className="w-4 h-4" />
          <span className="hidden sm:inline">Accessible</span>
          {showAffordableOnly && <Check className="w-4 h-4" />}
        </button>

        {/* More Filters */}
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={cn(
            "flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium transition-all",
            "bg-zinc-800 text-zinc-400 hover:text-white border border-zinc-700"
          )}
        >
          <SlidersHorizontal className="w-4 h-4" />
          <span className="hidden sm:inline">Filtres</span>
        </button>
      </div>

      {/* Results count */}
      <div className="flex items-center justify-between text-sm text-zinc-500">
        <span>
          {filteredRewards.length} article{filteredRewards.length !== 1 ? "s" : ""}
          {selectedCategory && ` dans ${categories.find((c) => c.slug === selectedCategory)?.name}`}
        </span>
        {(searchQuery || showAffordableOnly || selectedCategory) && (
          <button
            onClick={() => {
              setSearchQuery("")
              setShowAffordableOnly(false)
              setSelectedCategory(null)
            }}
            className="text-cyan-400 hover:text-cyan-300"
          >
            Réinitialiser les filtres
          </button>
        )}
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {[...Array(8)].map((_, i) => (
            <div
              key={i}
              className="h-80 bg-zinc-800 rounded-2xl animate-pulse"
            />
          ))}
        </div>
      )}

      {/* Empty State */}
      {!isLoading && filteredRewards.length === 0 && (
        <EmptyShopState
          hasFilters={!!searchQuery || showAffordableOnly || !!selectedCategory}
          onClearFilters={() => {
            setSearchQuery("")
            setShowAffordableOnly(false)
            setSelectedCategory(null)
          }}
        />
      )}

      {/* Rewards Grid */}
      {!isLoading && filteredRewards.length > 0 && (
        <>
          {groupedRewards ? (
            // Grouped by category
            <div className="space-y-10">
              {categories
                .filter((cat) => (groupedRewards[cat.slug]?.length || 0) > 0)
                .map((category) => (
                  <CategorySection
                    key={category.slug}
                    category={category}
                    rewards={groupedRewards[category.slug] || []}
                    userXP={userXP}
                    onPurchase={onPurchase}
                    onToggleWishlist={onToggleWishlist}
                    onRewardClick={onRewardClick}
                  />
                ))}
            </div>
          ) : (
            // Flat grid
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              <AnimatePresence mode="popLayout">
                {filteredRewards.map((reward, index) => (
                  <motion.div
                    key={reward.reward_id}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <RewardCard
                      reward={reward}
                      userXP={userXP}
                      onPurchase={onPurchase}
                      onToggleWishlist={onToggleWishlist}
                      onClick={onRewardClick ? () => onRewardClick(reward) : undefined}
                    />
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </>
      )}
    </div>
  )
}

/* ==========================================================================
   CATEGORY TABS
   ========================================================================== */

interface CategoryTabsProps {
  categories: RewardCategory[]
  selectedCategory: string | null
  onSelectCategory: (slug: string | null) => void
}

function CategoryTabs({
  categories,
  selectedCategory,
  onSelectCategory,
}: CategoryTabsProps) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
      <motion.button
        onClick={() => onSelectCategory(null)}
        className={cn(
          "flex items-center gap-2 px-4 py-2 rounded-xl font-medium whitespace-nowrap transition-all",
          selectedCategory === null
            ? "bg-gradient-to-r from-cyan-500 to-blue-500 text-white shadow-lg shadow-cyan-500/25"
            : "bg-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-700"
        )}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
      >
        <ShoppingBag className="w-4 h-4" />
        <span>Tout</span>
      </motion.button>

      {categories.map((category) => {
        const IconComponent = CATEGORY_ICON_MAP[category.icon] || Gift
        const isActive = selectedCategory === category.slug

        return (
          <motion.button
            key={category.slug}
            onClick={() => onSelectCategory(category.slug)}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-xl font-medium whitespace-nowrap transition-all",
              isActive
                ? `bg-${category.color}-500/20 text-${category.color}-400 border border-${category.color}-500/50`
                : "bg-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-700"
            )}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <IconComponent className="w-4 h-4" />
            <span>{category.name}</span>
          </motion.button>
        )
      })}
    </div>
  )
}

/* ==========================================================================
   SORT DROPDOWN
   ========================================================================== */

interface SortDropdownProps {
  value: SortOption
  onChange: (value: SortOption) => void
}

function SortDropdown({ value, onChange }: SortDropdownProps) {
  const [isOpen, setIsOpen] = useState(false)

  const options: { value: SortOption; label: string }[] = [
    { value: "relevance", label: "Pertinence" },
    { value: "price_asc", label: "Prix croissant" },
    { value: "price_desc", label: "Prix décroissant" },
    { value: "newest", label: "Nouveautés" },
  ]

  const currentLabel = options.find((o) => o.value === value)?.label

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-4 py-2.5 bg-zinc-800 border border-zinc-700 rounded-xl text-zinc-400 hover:text-white transition-colors"
      >
        <ArrowUpDown className="w-4 h-4" />
        <span className="hidden sm:inline">{currentLabel}</span>
      </button>

      <AnimatePresence>
        {isOpen && (
          <>
            <div
              className="fixed inset-0 z-10"
              onClick={() => setIsOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="absolute right-0 top-full mt-2 w-48 bg-zinc-900 border border-zinc-800 rounded-xl shadow-xl z-20 overflow-hidden"
            >
              {options.map((option) => (
                <button
                  key={option.value}
                  onClick={() => {
                    onChange(option.value)
                    setIsOpen(false)
                  }}
                  className={cn(
                    "w-full px-4 py-2.5 text-left text-sm transition-colors",
                    value === option.value
                      ? "bg-cyan-500/20 text-cyan-400"
                      : "text-zinc-300 hover:bg-zinc-800"
                  )}
                >
                  {option.label}
                </button>
              ))}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}

/* ==========================================================================
   CATEGORY SECTION
   ========================================================================== */

interface CategorySectionProps {
  category: RewardCategory
  rewards: ShopReward[]
  userXP: number
  onPurchase?: (rewardId: string) => void
  onToggleWishlist?: (rewardId: string) => void
  onRewardClick?: (reward: ShopReward) => void
}

function CategorySection({
  category,
  rewards,
  userXP,
  onPurchase,
  onToggleWishlist,
  onRewardClick,
}: CategorySectionProps) {
  const IconComponent = CATEGORY_ICON_MAP[category.icon] || Gift

  return (
    <div>
      {/* Section Header */}
      <div className="flex items-center gap-3 mb-4">
        <div
          className={cn(
            "w-10 h-10 rounded-xl flex items-center justify-center",
            `bg-${category.color}-500/20`
          )}
        >
          <IconComponent className={cn("w-5 h-5", `text-${category.color}-400`)} />
        </div>
        <div>
          <h3 className="font-bold text-white">{category.name}</h3>
          {category.description && (
            <p className="text-sm text-zinc-500">{category.description}</p>
          )}
        </div>
      </div>

      {/* Rewards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {rewards.map((reward, index) => (
          <motion.div
            key={reward.reward_id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
          >
            <RewardCard
              reward={reward}
              userXP={userXP}
              onPurchase={onPurchase}
              onToggleWishlist={onToggleWishlist}
              onClick={onRewardClick ? () => onRewardClick(reward) : undefined}
            />
          </motion.div>
        ))}
      </div>
    </div>
  )
}

/* ==========================================================================
   EMPTY STATE
   ========================================================================== */

interface EmptyShopStateProps {
  hasFilters: boolean
  onClearFilters: () => void
}

function EmptyShopState({ hasFilters, onClearFilters }: EmptyShopStateProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex flex-col items-center justify-center py-16 text-center"
    >
      <div className="w-20 h-20 rounded-2xl bg-zinc-800 flex items-center justify-center mb-4">
        <ShoppingBag className="w-10 h-10 text-zinc-600" />
      </div>
      <h3 className="text-lg font-bold text-white mb-2">
        {hasFilters ? "Aucun article trouvé" : "Boutique vide"}
      </h3>
      <p className="text-zinc-500 max-w-sm mb-4">
        {hasFilters
          ? "Modifie tes filtres pour voir plus d'articles."
          : "De nouveaux articles arrivent bientôt !"}
      </p>
      {hasFilters && (
        <button
          onClick={onClearFilters}
          className="px-4 py-2 bg-zinc-800 text-white rounded-lg hover:bg-zinc-700 transition-colors"
        >
          Effacer les filtres
        </button>
      )}
    </motion.div>
  )
}
