/**
 * TEENS PARTY MOROCCO - Collection Grid Components
 * =================================================
 *
 * Composants pour l'affichage des grilles de collections.
 */

"use client"

import { useState, useMemo } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  Grid,
  List,
  Filter,
  SortAsc,
  SortDesc,
  Search,
  Sparkles,
  Lock,
  CheckCircle,
} from "lucide-react"
import {
  type CollectionSet,
  type CollectibleItemWithOwnership,
  type CollectionSetWithProgress,
  type Rarity,
  RARITY_CONFIG,
  SET_TYPE_CONFIG,
  getCompletionMessage,
} from "../../features/collections"
import { CollectibleCard, MiniCollectibleCard } from "./collection-card"

/* ==========================================================================
   COLLECTION SET CARD
   ========================================================================== */

interface CollectionSetCardProps {
  set: CollectionSetWithProgress
  onClick?: () => void
}

export function CollectionSetCard({ set, onClick }: CollectionSetCardProps) {
  const typeConfig = SET_TYPE_CONFIG[set.set_type]
  const completionPercent = set.progress?.completion_percentage || 0
  const isCompleted = set.progress?.is_completed || false

  return (
    <motion.div
      whileHover={{ scale: 1.02, y: -4 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className="relative rounded-2xl overflow-hidden cursor-pointer group"
    >
      {/* Background image ou gradient */}
      <div
        className="absolute inset-0"
        style={{
          background: set.theme_gradient
            ? set.theme_gradient
            : `linear-gradient(135deg, ${set.theme_color || "#8b5cf6"}40, transparent)`,
        }}
      />

      {/* Cover image */}
      {set.cover_image_url && (
        <div className="absolute inset-0 opacity-30 group-hover:opacity-40 transition-opacity">
          <img
            src={set.cover_image_url}
            alt={set.name}
            className="w-full h-full object-cover"
          />
        </div>
      )}

      {/* Content */}
      <div className="relative p-6 min-h-[200px] flex flex-col justify-between border border-zinc-700/50 rounded-2xl bg-zinc-900/80 backdrop-blur-sm">
        {/* Header */}
        <div>
          <div className="flex items-start justify-between mb-2">
            <span className="text-2xl">{typeConfig.icon === "Layers" ? "🃏" : typeConfig.icon === "Sticker" ? "🏷️" : typeConfig.icon === "Camera" ? "📷" : "✨"}</span>
            {isCompleted && (
              <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-green-500/20 text-green-400 text-xs">
                <CheckCircle className="w-3 h-3" />
                Complète
              </div>
            )}
            {set.is_limited && !isCompleted && (
              <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-yellow-500/20 text-yellow-400 text-xs">
                <Sparkles className="w-3 h-3" />
                Limitée
              </div>
            )}
          </div>

          <h3 className="text-xl font-bold text-white mb-1">{set.name}</h3>
          <p className="text-sm text-zinc-400 line-clamp-2">{set.description}</p>
        </div>

        {/* Progress */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-zinc-400">
              {set.owned_count} / {set.total_items}
            </span>
            <span className="text-zinc-300">{Math.round(completionPercent)}%</span>
          </div>

          <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${completionPercent}%` }}
              transition={{ duration: 0.5, ease: "easeOut" }}
              className={`h-full rounded-full ${
                isCompleted
                  ? "bg-gradient-to-r from-green-500 to-emerald-500"
                  : "bg-gradient-to-r from-cyan-500 to-purple-500"
              }`}
            />
          </div>

          <p className="text-xs text-zinc-500">
            {getCompletionMessage(set.owned_count, set.total_items)}
          </p>
        </div>

        {/* Rewards preview */}
        {!isCompleted && (
          <div className="mt-4 pt-4 border-t border-zinc-700/50 flex items-center gap-4 text-xs text-zinc-400">
            <span className="flex items-center gap-1">
              ⭐ {set.completion_xp} XP
            </span>
            <span className="flex items-center gap-1">
              🪙 {set.completion_coins} coins
            </span>
          </div>
        )}
      </div>
    </motion.div>
  )
}

/* ==========================================================================
   COLLECTION ITEMS GRID
   ========================================================================== */

interface CollectionItemsGridProps {
  items: CollectibleItemWithOwnership[]
  onItemClick?: (item: CollectibleItemWithOwnership) => void
  onFavoriteToggle?: (itemId: string) => void
}

export function CollectionItemsGrid({
  items,
  onItemClick,
  onFavoriteToggle,
}: CollectionItemsGridProps) {
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid")
  const [sortBy, setSortBy] = useState<"number" | "rarity" | "owned">("number")
  const [filterOwned, setFilterOwned] = useState<"all" | "owned" | "missing">("all")
  const [filterRarity, setFilterRarity] = useState<Rarity | "all">("all")
  const [searchQuery, setSearchQuery] = useState("")

  const sortedAndFilteredItems = useMemo(() => {
    let filtered = [...items]

    // Filtre par possession
    if (filterOwned === "owned") {
      filtered = filtered.filter((i) => i.owned)
    } else if (filterOwned === "missing") {
      filtered = filtered.filter((i) => !i.owned)
    }

    // Filtre par rareté
    if (filterRarity !== "all") {
      filtered = filtered.filter((i) => i.rarity === filterRarity)
    }

    // Filtre par recherche
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(
        (i) =>
          i.name.toLowerCase().includes(query) ||
          i.description?.toLowerCase().includes(query)
      )
    }

    // Tri
    switch (sortBy) {
      case "rarity": {
        const rarityOrder = ["legendary", "epic", "rare", "uncommon", "common"]
        filtered.sort(
          (a, b) => rarityOrder.indexOf(a.rarity) - rarityOrder.indexOf(b.rarity)
        )
        break
      }
      case "owned":
        filtered.sort((a, b) => (b.owned ? 1 : 0) - (a.owned ? 1 : 0))
        break
      case "number":
      default:
        filtered.sort((a, b) => a.item_number - b.item_number)
    }

    return filtered
  }, [items, sortBy, filterOwned, filterRarity, searchQuery])

  const stats = useMemo(() => {
    const owned = items.filter((i) => i.owned).length
    return {
      owned,
      total: items.length,
      percent: Math.round((owned / items.length) * 100),
    }
  }, [items])

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3 p-3 rounded-xl bg-zinc-800/50 border border-zinc-700/50">
        {/* Search */}
        <div className="flex-1 min-w-[200px] relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
          <input
            type="text"
            placeholder="Rechercher..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-lg bg-zinc-900 border border-zinc-700 text-white text-sm placeholder:text-zinc-500 focus:outline-none focus:border-cyan-500"
          />
        </div>

        {/* Filters */}
        <select
          value={filterOwned}
          onChange={(e) => setFilterOwned(e.target.value as any)}
          className="px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-700 text-white text-sm"
        >
          <option value="all">Tous</option>
          <option value="owned">Possédés</option>
          <option value="missing">Manquants</option>
        </select>

        <select
          value={filterRarity}
          onChange={(e) => setFilterRarity(e.target.value as any)}
          className="px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-700 text-white text-sm"
        >
          <option value="all">Toutes raretés</option>
          {Object.entries(RARITY_CONFIG).map(([key, config]) => (
            <option key={key} value={key}>
              {config.name}
            </option>
          ))}
        </select>

        {/* Sort */}
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as any)}
          className="px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-700 text-white text-sm"
        >
          <option value="number">Par numéro</option>
          <option value="rarity">Par rareté</option>
          <option value="owned">Par possession</option>
        </select>

        {/* View mode */}
        <div className="flex items-center border border-zinc-700 rounded-lg overflow-hidden">
          <button
            onClick={() => setViewMode("grid")}
            className={`p-2 ${
              viewMode === "grid"
                ? "bg-cyan-500 text-white"
                : "bg-zinc-900 text-zinc-400 hover:text-white"
            }`}
          >
            <Grid className="w-4 h-4" />
          </button>
          <button
            onClick={() => setViewMode("list")}
            className={`p-2 ${
              viewMode === "list"
                ? "bg-cyan-500 text-white"
                : "bg-zinc-900 text-zinc-400 hover:text-white"
            }`}
          >
            <List className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Stats bar */}
      <div className="flex items-center justify-between px-2">
        <span className="text-sm text-zinc-400">
          {sortedAndFilteredItems.length} items affichés
        </span>
        <span className="text-sm text-zinc-300">
          {stats.owned}/{stats.total} ({stats.percent}%)
        </span>
      </div>

      {/* Grid / List */}
      <AnimatePresence mode="wait">
        {viewMode === "grid" ? (
          <motion.div
            key="grid"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-4"
          >
            {sortedAndFilteredItems.map((item) => (
              <CollectibleCard
                key={item.id}
                item={item}
                size="md"
                onClick={() => onItemClick?.(item)}
                onFavoriteToggle={
                  item.owned ? () => onFavoriteToggle?.(item.id) : undefined
                }
              />
            ))}
          </motion.div>
        ) : (
          <motion.div
            key="list"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="space-y-2"
          >
            {sortedAndFilteredItems.map((item) => (
              <CollectionItemRow
                key={item.id}
                item={item}
                onClick={() => onItemClick?.(item)}
                onFavoriteToggle={
                  item.owned ? () => onFavoriteToggle?.(item.id) : undefined
                }
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Empty state */}
      {sortedAndFilteredItems.length === 0 && (
        <div className="text-center py-12">
          <Lock className="w-12 h-12 text-zinc-600 mx-auto mb-4" />
          <p className="text-zinc-400">Aucun item trouvé</p>
        </div>
      )}
    </div>
  )
}

/* ==========================================================================
   COLLECTION ITEM ROW (pour vue liste)
   ========================================================================== */

interface CollectionItemRowProps {
  item: CollectibleItemWithOwnership
  onClick?: () => void
  onFavoriteToggle?: () => void
}

function CollectionItemRow({
  item,
  onClick,
  onFavoriteToggle,
}: CollectionItemRowProps) {
  const rarityConfig = RARITY_CONFIG[item.rarity]

  return (
    <motion.div
      whileHover={{ backgroundColor: "rgba(63, 63, 70, 0.3)" }}
      onClick={onClick}
      className={`flex items-center gap-4 p-3 rounded-xl border cursor-pointer ${
        item.owned
          ? `${rarityConfig.borderColor} ${rarityConfig.bgColor}`
          : "border-zinc-800 bg-zinc-900/50"
      }`}
    >
      {/* Thumbnail */}
      <div className="w-12 h-12 rounded-lg overflow-hidden flex-shrink-0">
        {item.owned ? (
          <img
            src={item.thumbnail_url || item.image_url}
            alt={item.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full bg-zinc-800 flex items-center justify-center">
            <Lock className="w-5 h-5 text-zinc-600" />
          </div>
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-xs text-zinc-500">#{item.item_number}</span>
          <h4
            className={`font-medium truncate ${
              item.owned ? "text-white" : "text-zinc-500"
            }`}
          >
            {item.owned ? item.name : "???"}
          </h4>
          {item.is_new && item.owned && (
            <span className="px-1.5 py-0.5 rounded text-xs bg-cyan-500/20 text-cyan-400">
              NEW
            </span>
          )}
        </div>
        <span className={`text-xs ${rarityConfig.color}`}>
          {rarityConfig.name}
        </span>
      </div>

      {/* Quantity */}
      {item.owned && item.quantity > 1 && (
        <span className="text-sm text-zinc-400">x{item.quantity}</span>
      )}

      {/* Status icon */}
      {item.owned ? (
        <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
      ) : (
        <Lock className="w-5 h-5 text-zinc-600 flex-shrink-0" />
      )}
    </motion.div>
  )
}

/* ==========================================================================
   COLLECTION SETS LIST
   ========================================================================== */

interface CollectionSetsListProps {
  sets: CollectionSetWithProgress[]
  onSetClick?: (set: CollectionSetWithProgress) => void
}

export function CollectionSetsList({ sets, onSetClick }: CollectionSetsListProps) {
  const [filter, setFilter] = useState<"all" | "inProgress" | "completed">("all")

  const filteredSets = useMemo(() => {
    switch (filter) {
      case "completed":
        return sets.filter((s) => s.progress?.is_completed)
      case "inProgress":
        return sets.filter(
          (s) => s.owned_count > 0 && !s.progress?.is_completed
        )
      default:
        return sets
    }
  }, [sets, filter])

  return (
    <div className="space-y-4">
      {/* Filter tabs */}
      <div className="flex gap-2">
        {[
          { key: "all", label: "Toutes" },
          { key: "inProgress", label: "En cours" },
          { key: "completed", label: "Complètes" },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setFilter(tab.key as any)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filter === tab.key
                ? "bg-cyan-500 text-white"
                : "bg-zinc-800 text-zinc-400 hover:text-white"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredSets.map((set) => (
          <CollectionSetCard
            key={set.id}
            set={set}
            onClick={() => onSetClick?.(set)}
          />
        ))}
      </div>

      {filteredSets.length === 0 && (
        <div className="text-center py-12">
          <p className="text-zinc-400">Aucune collection trouvée</p>
        </div>
      )}
    </div>
  )
}

/* ==========================================================================
   MINI COLLECTION PREVIEW
   ========================================================================== */

interface MiniCollectionPreviewProps {
  items: CollectibleItemWithOwnership[]
  maxDisplay?: number
  onViewAll?: () => void
}

export function MiniCollectionPreview({
  items,
  maxDisplay = 8,
  onViewAll,
}: MiniCollectionPreviewProps) {
  const displayItems = items.slice(0, maxDisplay)
  const remaining = items.length - maxDisplay

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {displayItems.map((item) => (
          <MiniCollectibleCard
            key={item.id}
            item={item}
            owned={item.owned}
            isNew={item.is_new}
          />
        ))}

        {remaining > 0 && (
          <button
            onClick={onViewAll}
            className="w-12 h-12 rounded-lg bg-zinc-800 border border-zinc-700 flex items-center justify-center text-sm text-zinc-400 hover:text-white hover:border-zinc-600 transition-colors"
          >
            +{remaining}
          </button>
        )}
      </div>
    </div>
  )
}
