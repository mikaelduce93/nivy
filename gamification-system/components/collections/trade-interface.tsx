/**
 * TEENS PARTY MOROCCO - Trade Interface Components
 * =================================================
 *
 * Composants pour l'interface d'échange de collectibles.
 */

"use client"

import { useState, useMemo } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  ArrowLeftRight,
  ArrowRight,
  Check,
  X,
  MessageSquare,
  AlertTriangle,
  Clock,
  User,
  Filter,
  Search,
  Scale,
} from "lucide-react"
import {
  type CollectibleItem,
  type CollectionTrade,
  type Rarity,
  RARITY_CONFIG,
  calculateTradeValue,
  isTradeBalanced,
} from "../../features/collections"
import { MiniCollectibleCard, RarityBadge } from "./collection-card"

/* ==========================================================================
   TRADE CREATOR
   ========================================================================== */

interface TradeCreatorProps {
  myItems: CollectibleItem[]
  theirItems: CollectibleItem[]
  theirUsername: string
  onSubmit: (
    myItemIds: string[],
    theirItemIds: string[],
    message?: string
  ) => Promise<void>
  onCancel: () => void
}

export function TradeCreator({
  myItems,
  theirItems,
  theirUsername,
  onSubmit,
  onCancel,
}: TradeCreatorProps) {
  const [selectedMyItems, setSelectedMyItems] = useState<string[]>([])
  const [selectedTheirItems, setSelectedTheirItems] = useState<string[]>([])
  const [message, setMessage] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [searchMy, setSearchMy] = useState("")
  const [searchTheir, setSearchTheir] = useState("")

  // Items filtrés
  const filteredMyItems = useMemo(() => {
    if (!searchMy) return myItems
    return myItems.filter((i) =>
      i.name.toLowerCase().includes(searchMy.toLowerCase())
    )
  }, [myItems, searchMy])

  const filteredTheirItems = useMemo(() => {
    if (!searchTheir) return theirItems
    return theirItems.filter((i) =>
      i.name.toLowerCase().includes(searchTheir.toLowerCase())
    )
  }, [theirItems, searchTheir])

  // Calcul des valeurs
  const mySelectedItems = myItems.filter((i) => selectedMyItems.includes(i.id))
  const theirSelectedItems = theirItems.filter((i) =>
    selectedTheirItems.includes(i.id)
  )

  const myValue = mySelectedItems.reduce(
    (sum, i) => sum + calculateTradeValue(i),
    0
  )
  const theirValue = theirSelectedItems.reduce(
    (sum, i) => sum + calculateTradeValue(i),
    0
  )

  const balanced = isTradeBalanced(mySelectedItems, theirSelectedItems)
  const canSubmit =
    selectedMyItems.length > 0 && selectedTheirItems.length > 0

  // Toggle selection
  const toggleMyItem = (id: string) => {
    setSelectedMyItems((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    )
  }

  const toggleTheirItem = (id: string) => {
    setSelectedTheirItems((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    )
  }

  // Submit
  const handleSubmit = async () => {
    if (!canSubmit) return
    setIsSubmitting(true)
    try {
      await onSubmit(selectedMyItems, selectedTheirItems, message || undefined)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-white">
          Proposer un échange à {theirUsername}
        </h2>
        <button
          onClick={onCancel}
          className="p-2 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Trade balance indicator */}
      <TradeBalanceIndicator
        myValue={myValue}
        theirValue={theirValue}
        balanced={balanced}
      />

      {/* Two columns */}
      <div className="grid grid-cols-2 gap-6">
        {/* My items */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-medium text-white">Mes cartes</h3>
            <span className="text-sm text-zinc-400">
              {selectedMyItems.length} sélectionnées
            </span>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
            <input
              type="text"
              placeholder="Rechercher..."
              value={searchMy}
              onChange={(e) => setSearchMy(e.target.value)}
              className="w-full pl-9 pr-4 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-white text-sm placeholder:text-zinc-500"
            />
          </div>

          {/* Grid */}
          <div className="h-64 overflow-y-auto p-2 rounded-xl bg-zinc-800/50 border border-zinc-700">
            <div className="grid grid-cols-4 gap-2">
              {filteredMyItems.map((item) => (
                <TradeItemCard
                  key={item.id}
                  item={item}
                  selected={selectedMyItems.includes(item.id)}
                  onToggle={() => toggleMyItem(item.id)}
                />
              ))}
            </div>
          </div>

          {/* Selected items */}
          {selectedMyItems.length > 0 && (
            <div className="flex flex-wrap gap-2 p-2 rounded-lg bg-cyan-500/10 border border-cyan-500/30">
              {mySelectedItems.map((item) => (
                <SelectedItemChip
                  key={item.id}
                  item={item}
                  onRemove={() => toggleMyItem(item.id)}
                />
              ))}
            </div>
          )}
        </div>

        {/* Arrow */}
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 hidden md:flex">
          <div className="w-10 h-10 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center">
            <ArrowLeftRight className="w-5 h-5 text-zinc-400" />
          </div>
        </div>

        {/* Their items */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-medium text-white">Cartes de {theirUsername}</h3>
            <span className="text-sm text-zinc-400">
              {selectedTheirItems.length} sélectionnées
            </span>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
            <input
              type="text"
              placeholder="Rechercher..."
              value={searchTheir}
              onChange={(e) => setSearchTheir(e.target.value)}
              className="w-full pl-9 pr-4 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-white text-sm placeholder:text-zinc-500"
            />
          </div>

          {/* Grid */}
          <div className="h-64 overflow-y-auto p-2 rounded-xl bg-zinc-800/50 border border-zinc-700">
            <div className="grid grid-cols-4 gap-2">
              {filteredTheirItems.map((item) => (
                <TradeItemCard
                  key={item.id}
                  item={item}
                  selected={selectedTheirItems.includes(item.id)}
                  onToggle={() => toggleTheirItem(item.id)}
                />
              ))}
            </div>
          </div>

          {/* Selected items */}
          {selectedTheirItems.length > 0 && (
            <div className="flex flex-wrap gap-2 p-2 rounded-lg bg-purple-500/10 border border-purple-500/30">
              {theirSelectedItems.map((item) => (
                <SelectedItemChip
                  key={item.id}
                  item={item}
                  onRemove={() => toggleTheirItem(item.id)}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Message */}
      <div className="space-y-2">
        <label className="flex items-center gap-2 text-sm text-zinc-400">
          <MessageSquare className="w-4 h-4" />
          Message (optionnel)
        </label>
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Ajouter un message à ta proposition..."
          maxLength={200}
          className="w-full p-3 rounded-xl bg-zinc-800 border border-zinc-700 text-white placeholder:text-zinc-500 resize-none h-20"
        />
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between pt-4 border-t border-zinc-700">
        <button
          onClick={onCancel}
          className="px-4 py-2 rounded-lg text-zinc-400 hover:text-white transition-colors"
        >
          Annuler
        </button>

        <button
          onClick={handleSubmit}
          disabled={!canSubmit || isSubmitting}
          className={`px-6 py-3 rounded-xl font-bold transition-all flex items-center gap-2 ${
            canSubmit && !isSubmitting
              ? "bg-gradient-to-r from-cyan-500 to-purple-500 text-white hover:opacity-90"
              : "bg-zinc-700 text-zinc-500 cursor-not-allowed"
          }`}
        >
          {isSubmitting ? (
            "Envoi..."
          ) : (
            <>
              Proposer l'échange
              <ArrowRight className="w-5 h-5" />
            </>
          )}
        </button>
      </div>
    </div>
  )
}

/* ==========================================================================
   TRADE ITEM CARD
   ========================================================================== */

interface TradeItemCardProps {
  item: CollectibleItem
  selected: boolean
  onToggle: () => void
}

function TradeItemCard({ item, selected, onToggle }: TradeItemCardProps) {
  const rarityConfig = RARITY_CONFIG[item.rarity]

  return (
    <motion.button
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      onClick={onToggle}
      className={`relative p-1 rounded-lg border-2 transition-all ${
        selected
          ? `${rarityConfig.borderColor} ${rarityConfig.bgColor}`
          : "border-transparent hover:border-zinc-600"
      }`}
    >
      <div className="w-12 h-12 rounded-lg overflow-hidden">
        <img
          src={item.thumbnail_url || item.image_url}
          alt={item.name}
          className="w-full h-full object-cover"
        />
      </div>

      {selected && (
        <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-cyan-500 flex items-center justify-center">
          <Check className="w-3 h-3 text-white" />
        </div>
      )}

      {/* Value indicator */}
      <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 px-1 py-0.5 rounded text-[10px] bg-zinc-900/90">
        {calculateTradeValue(item)}
      </div>
    </motion.button>
  )
}

/* ==========================================================================
   SELECTED ITEM CHIP
   ========================================================================== */

interface SelectedItemChipProps {
  item: CollectibleItem
  onRemove: () => void
}

function SelectedItemChip({ item, onRemove }: SelectedItemChipProps) {
  const rarityConfig = RARITY_CONFIG[item.rarity]

  return (
    <div
      className={`flex items-center gap-2 px-2 py-1 rounded-lg ${rarityConfig.bgColor}`}
    >
      <img
        src={item.thumbnail_url || item.image_url}
        alt={item.name}
        className="w-6 h-6 rounded object-cover"
      />
      <span className="text-xs text-white truncate max-w-[80px]">
        {item.name}
      </span>
      <button
        onClick={onRemove}
        className="p-0.5 rounded hover:bg-white/20 transition-colors"
      >
        <X className="w-3 h-3 text-white/70" />
      </button>
    </div>
  )
}

/* ==========================================================================
   TRADE BALANCE INDICATOR
   ========================================================================== */

interface TradeBalanceIndicatorProps {
  myValue: number
  theirValue: number
  balanced: boolean
}

function TradeBalanceIndicator({
  myValue,
  theirValue,
  balanced,
}: TradeBalanceIndicatorProps) {
  const diff = theirValue - myValue
  const total = myValue + theirValue
  const myPercent = total > 0 ? (myValue / total) * 100 : 50

  return (
    <div className="p-4 rounded-xl bg-zinc-800/50 border border-zinc-700">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm text-zinc-400">Équilibre de l'échange</span>
        {balanced ? (
          <span className="flex items-center gap-1 text-xs text-green-400">
            <Scale className="w-3 h-3" />
            Équitable
          </span>
        ) : (
          <span className="flex items-center gap-1 text-xs text-yellow-400">
            <AlertTriangle className="w-3 h-3" />
            Déséquilibré
          </span>
        )}
      </div>

      {/* Balance bar */}
      <div className="h-3 rounded-full bg-zinc-700 overflow-hidden flex">
        <div
          className="h-full bg-cyan-500 transition-all"
          style={{ width: `${myPercent}%` }}
        />
        <div
          className="h-full bg-purple-500 transition-all"
          style={{ width: `${100 - myPercent}%` }}
        />
      </div>

      {/* Values */}
      <div className="flex items-center justify-between mt-2 text-sm">
        <span className="text-cyan-400">Moi: {myValue}</span>
        <span className={diff === 0 ? "text-zinc-400" : diff > 0 ? "text-green-400" : "text-red-400"}>
          {diff > 0 ? `+${diff}` : diff}
        </span>
        <span className="text-purple-400">Eux: {theirValue}</span>
      </div>
    </div>
  )
}

/* ==========================================================================
   TRADE REQUEST CARD
   ========================================================================== */

interface TradeRequestCardProps {
  trade: CollectionTrade
  myItems: CollectibleItem[]
  theirItems: CollectibleItem[]
  theirUsername: string
  isIncoming: boolean
  onAccept?: () => void
  onReject?: () => void
  onCancel?: () => void
  onViewDetails?: () => void
}

export function TradeRequestCard({
  trade,
  myItems,
  theirItems,
  theirUsername,
  isIncoming,
  onAccept,
  onReject,
  onCancel,
  onViewDetails,
}: TradeRequestCardProps) {
  const isPending = trade.status === "pending"

  const statusConfig = {
    pending: { color: "text-yellow-400", bg: "bg-yellow-500/20", label: "En attente" },
    accepted: { color: "text-green-400", bg: "bg-green-500/20", label: "Accepté" },
    rejected: { color: "text-red-400", bg: "bg-red-500/20", label: "Refusé" },
    cancelled: { color: "text-zinc-400", bg: "bg-zinc-500/20", label: "Annulé" },
    completed: { color: "text-cyan-400", bg: "bg-cyan-500/20", label: "Complété" },
  }

  const status = statusConfig[trade.status]

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-4 rounded-2xl bg-zinc-800/50 border border-zinc-700"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-zinc-700 flex items-center justify-center">
            <User className="w-5 h-5 text-zinc-400" />
          </div>
          <div>
            <p className="font-medium text-white">
              {isIncoming ? `De ${theirUsername}` : `À ${theirUsername}`}
            </p>
            <p className="text-xs text-zinc-400 flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {new Date(trade.created_at).toLocaleDateString()}
            </p>
          </div>
        </div>

        <span className={`px-3 py-1 rounded-full text-xs ${status.bg} ${status.color}`}>
          {status.label}
        </span>
      </div>

      {/* Items preview */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        {/* Offered items */}
        <div className="space-y-2">
          <p className="text-xs text-zinc-400">
            {isIncoming ? "Il propose" : "Tu proposes"}
          </p>
          <div className="flex flex-wrap gap-1">
            {(isIncoming ? theirItems : myItems).slice(0, 4).map((item) => (
              <MiniCollectibleCard key={item.id} item={item} owned />
            ))}
            {(isIncoming ? theirItems : myItems).length > 4 && (
              <span className="w-12 h-12 rounded-lg bg-zinc-700 flex items-center justify-center text-xs text-zinc-400">
                +{(isIncoming ? theirItems : myItems).length - 4}
              </span>
            )}
          </div>
        </div>

        {/* Arrow */}
        <div className="flex items-center justify-center">
          <ArrowLeftRight className="w-6 h-6 text-zinc-500" />
        </div>

        {/* Requested items */}
        <div className="space-y-2">
          <p className="text-xs text-zinc-400">
            {isIncoming ? "Il veut" : "Tu veux"}
          </p>
          <div className="flex flex-wrap gap-1">
            {(isIncoming ? myItems : theirItems).slice(0, 4).map((item) => (
              <MiniCollectibleCard key={item.id} item={item} owned />
            ))}
            {(isIncoming ? myItems : theirItems).length > 4 && (
              <span className="w-12 h-12 rounded-lg bg-zinc-700 flex items-center justify-center text-xs text-zinc-400">
                +{(isIncoming ? myItems : theirItems).length - 4}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Message */}
      {trade.sender_message && (
        <div className="p-3 rounded-lg bg-zinc-700/50 mb-4">
          <p className="text-sm text-zinc-300">"{trade.sender_message}"</p>
        </div>
      )}

      {/* Actions */}
      {isPending && (
        <div className="flex items-center justify-end gap-2 pt-4 border-t border-zinc-700">
          {isIncoming ? (
            <>
              <button
                onClick={onReject}
                className="px-4 py-2 rounded-lg bg-zinc-700 text-zinc-300 hover:bg-zinc-600 transition-colors"
              >
                Refuser
              </button>
              <button
                onClick={onAccept}
                className="px-4 py-2 rounded-lg bg-green-500 text-white hover:bg-green-600 transition-colors flex items-center gap-2"
              >
                <Check className="w-4 h-4" />
                Accepter
              </button>
            </>
          ) : (
            <button
              onClick={onCancel}
              className="px-4 py-2 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-colors"
            >
              Annuler
            </button>
          )}
        </div>
      )}
    </motion.div>
  )
}

/* ==========================================================================
   TRADES LIST
   ========================================================================== */

interface TradesListProps {
  trades: CollectionTrade[]
  userId: string
  onAccept?: (tradeId: string) => void
  onReject?: (tradeId: string) => void
  onCancel?: (tradeId: string) => void
}

export function TradesList({
  trades,
  userId,
  onAccept,
  onReject,
  onCancel,
}: TradesListProps) {
  const [filter, setFilter] = useState<"all" | "incoming" | "outgoing" | "pending">(
    "all"
  )

  const filteredTrades = useMemo(() => {
    switch (filter) {
      case "incoming":
        return trades.filter((t) => t.receiver_id === userId)
      case "outgoing":
        return trades.filter((t) => t.sender_id === userId)
      case "pending":
        return trades.filter((t) => t.status === "pending")
      default:
        return trades
    }
  }, [trades, filter, userId])

  const pendingCount = trades.filter(
    (t) => t.status === "pending" && t.receiver_id === userId
  ).length

  return (
    <div className="space-y-4">
      {/* Filter tabs */}
      <div className="flex gap-2">
        {[
          { key: "all", label: "Tous" },
          { key: "incoming", label: "Reçus" },
          { key: "outgoing", label: "Envoyés" },
          { key: "pending", label: `En attente ${pendingCount > 0 ? `(${pendingCount})` : ""}` },
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

      {/* Empty state */}
      {filteredTrades.length === 0 && (
        <div className="text-center py-12">
          <ArrowLeftRight className="w-12 h-12 text-zinc-600 mx-auto mb-4" />
          <p className="text-zinc-400">Aucun échange trouvé</p>
        </div>
      )}

      {/* List */}
      <div className="space-y-3">
        {filteredTrades.map((trade) => (
          <TradeRequestCard
            key={trade.id}
            trade={trade}
            myItems={[]} // Would need to fetch from API
            theirItems={[]} // Would need to fetch from API
            theirUsername={trade.sender_id === userId ? "Destinataire" : "Expéditeur"}
            isIncoming={trade.receiver_id === userId}
            onAccept={() => onAccept?.(trade.id)}
            onReject={() => onReject?.(trade.id)}
            onCancel={() => onCancel?.(trade.id)}
          />
        ))}
      </div>
    </div>
  )
}

/* ==========================================================================
   TRADE NOTIFICATION BADGE
   ========================================================================== */

interface TradeNotificationBadgeProps {
  count: number
}

export function TradeNotificationBadge({ count }: TradeNotificationBadgeProps) {
  if (count === 0) return null

  return (
    <motion.span
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
      className="absolute -top-1 -right-1 min-w-[18px] h-[18px] rounded-full bg-red-500 text-white text-xs font-bold flex items-center justify-center px-1"
    >
      {count > 9 ? "9+" : count}
    </motion.span>
  )
}
