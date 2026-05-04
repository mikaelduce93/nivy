"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  Package,
  Gift,
  Ticket,
  Zap,
  Crown,
  Percent,
  Clock,
  Check,
  AlertCircle,
  ChevronRight,
  QrCode,
  Loader2,
} from "lucide-react"
import { cn } from "@/lib/utils"
import {
  type UserPurchase,
  REWARD_TYPE_CONFIG,
  formatTimeRemaining,
  formatRewardValue,
} from "../../features/shop/schema"

/* ==========================================================================
   TYPES
   ========================================================================== */

interface InventoryProps {
  purchases: UserPurchase[]
  onUseReward?: (purchaseId: string) => Promise<{ success: boolean; error?: string }>
  isLoading?: boolean
  className?: string
}

/* ==========================================================================
   ICON MAP
   ========================================================================== */

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  ticket: Ticket,
  crown: Crown,
  percent: Percent,
  gift: Gift,
  zap: Zap,
  package: Package,
}

/* ==========================================================================
   COMPONENT
   ========================================================================== */

export function Inventory({
  purchases,
  onUseReward,
  isLoading = false,
  className,
}: InventoryProps) {
  const [selectedPurchase, setSelectedPurchase] = useState<UserPurchase | null>(null)

  // Group purchases by status
  const usable = purchases.filter((p) => p.is_usable && !p.is_expired)
  const used = purchases.filter((p) => p.status === "used")
  const expired = purchases.filter((p) => p.is_expired || p.status === "expired")

  return (
    <div className={cn("space-y-6", className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-black text-white">Mon Inventaire</h2>
        <div className="flex items-center gap-2 text-sm text-zinc-500">
          <Package className="w-4 h-4" />
          <span>{purchases.length} article{purchases.length !== 1 ? "s" : ""}</span>
        </div>
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 text-cyan-400 animate-spin" />
        </div>
      )}

      {/* Empty State */}
      {!isLoading && purchases.length === 0 && (
        <EmptyInventory />
      )}

      {/* Inventory Sections */}
      {!isLoading && purchases.length > 0 && (
        <div className="space-y-8">
          {/* Usable */}
          {usable.length > 0 && (
            <InventorySection
              title="Disponibles"
              description="Prêtes à être utilisées"
              purchases={usable}
              onSelect={setSelectedPurchase}
              accentColor="cyan"
            />
          )}

          {/* Used */}
          {used.length > 0 && (
            <InventorySection
              title="Utilisées"
              description="Récompenses déjà utilisées"
              purchases={used}
              onSelect={setSelectedPurchase}
              accentColor="green"
            />
          )}

          {/* Expired */}
          {expired.length > 0 && (
            <InventorySection
              title="Expirées"
              description="Non utilisées à temps"
              purchases={expired}
              onSelect={setSelectedPurchase}
              accentColor="red"
            />
          )}
        </div>
      )}

      {/* Use Reward Modal */}
      {selectedPurchase && (
        <UseRewardModal
          purchase={selectedPurchase}
          onClose={() => setSelectedPurchase(null)}
          onUse={onUseReward}
        />
      )}
    </div>
  )
}

/* ==========================================================================
   INVENTORY SECTION
   ========================================================================== */

interface InventorySectionProps {
  title: string
  description: string
  purchases: UserPurchase[]
  onSelect: (purchase: UserPurchase) => void
  accentColor: "cyan" | "green" | "red"
}

function InventorySection({
  title,
  description,
  purchases,
  onSelect,
  accentColor,
}: InventorySectionProps) {
  const colorClasses = {
    cyan: "text-cyan-400 bg-cyan-500/20",
    green: "text-green-400 bg-green-500/20",
    red: "text-red-400 bg-red-500/20",
  }

  return (
    <div>
      <div className="flex items-center gap-3 mb-4">
        <div className={cn("w-2 h-8 rounded-full", colorClasses[accentColor].split(" ")[1])} />
        <div>
          <h3 className="font-bold text-white">{title}</h3>
          <p className="text-sm text-zinc-500">{description}</p>
        </div>
        <span className={cn("ml-auto px-2 py-1 rounded-lg text-sm font-medium", colorClasses[accentColor])}>
          {purchases.length}
        </span>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {purchases.map((purchase) => (
          <InventoryItem
            key={purchase.purchase_id}
            purchase={purchase}
            onClick={() => onSelect(purchase)}
          />
        ))}
      </div>
    </div>
  )
}

/* ==========================================================================
   INVENTORY ITEM
   ========================================================================== */

interface InventoryItemProps {
  purchase: UserPurchase
  onClick: () => void
}

function InventoryItem({ purchase, onClick }: InventoryItemProps) {
  const typeConfig = REWARD_TYPE_CONFIG[purchase.reward_type]
  const Icon = ICON_MAP[purchase.reward_icon] || Gift
  const timeRemaining = formatTimeRemaining(purchase.expires_at)

  const isUsable = purchase.is_usable && !purchase.is_expired
  const isUsed = purchase.status === "used"
  const isExpired = purchase.is_expired || purchase.status === "expired"

  return (
    <motion.div
      onClick={onClick}
      className={cn(
        "relative flex items-center gap-4 p-4 rounded-2xl transition-all cursor-pointer",
        "bg-zinc-800/50 border border-zinc-700/50",
        isUsable && "hover:bg-zinc-800 hover:border-cyan-500/30",
        isUsed && "opacity-60",
        isExpired && "opacity-40"
      )}
      whileHover={isUsable ? { scale: 1.02 } : {}}
    >
      {/* Icon */}
      <div
        className={cn(
          "flex-shrink-0 w-14 h-14 rounded-xl flex items-center justify-center",
          isUsed
            ? "bg-green-500/20"
            : isExpired
            ? "bg-zinc-700"
            : typeConfig.bgColor
        )}
      >
        {isUsed ? (
          <Check className="w-7 h-7 text-green-400" />
        ) : isExpired ? (
          <AlertCircle className="w-7 h-7 text-zinc-500" />
        ) : (
          <Icon className={cn("w-7 h-7", typeConfig.color)} />
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <h4 className="font-bold text-white truncate">{purchase.reward_name}</h4>
        <p className="text-sm text-zinc-500 truncate">
          {formatRewardValue(purchase.reward_type, purchase.reward_value)}
        </p>

        {/* Status / Time */}
        <div className="flex items-center gap-2 mt-1">
          {isUsed && purchase.used_at && (
            <span className="text-xs text-green-400">
              Utilisé le {new Date(purchase.used_at).toLocaleDateString("fr-FR")}
            </span>
          )}
          {isExpired && (
            <span className="text-xs text-red-400">Expiré</span>
          )}
          {isUsable && timeRemaining && (
            <span className="flex items-center gap-1 text-xs text-amber-400">
              <Clock className="w-3 h-3" />
              Expire dans {timeRemaining}
            </span>
          )}
        </div>
      </div>

      {/* Arrow */}
      {isUsable && (
        <ChevronRight className="w-5 h-5 text-zinc-500" />
      )}
    </motion.div>
  )
}

/* ==========================================================================
   USE REWARD MODAL
   ========================================================================== */

interface UseRewardModalProps {
  purchase: UserPurchase
  onClose: () => void
  onUse?: (purchaseId: string) => Promise<{ success: boolean; error?: string }>
}

function UseRewardModal({ purchase, onClose, onUse }: UseRewardModalProps) {
  const [isUsing, setIsUsing] = useState(false)
  const [showQR, setShowQR] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const typeConfig = REWARD_TYPE_CONFIG[purchase.reward_type]
  const Icon = ICON_MAP[purchase.reward_icon] || Gift
  const isUsable = purchase.is_usable && !purchase.is_expired
  const timeRemaining = formatTimeRemaining(purchase.expires_at)

  const handleUse = async () => {
    if (!onUse || !isUsable) return

    setIsUsing(true)
    setError(null)

    try {
      const result = await onUse(purchase.purchase_id)

      if (result.success) {
        setShowQR(true)
      } else {
        setError(result.error || "Erreur lors de l'utilisation")
      }
    } catch {
      setError("Erreur serveur")
    } finally {
      setIsUsing(false)
    }
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div className="absolute inset-0 bg-black/80 backdrop-blur-sm" />

        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="relative w-full max-w-md bg-zinc-900 rounded-3xl overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {showQR ? (
            // QR Code Display
            <div className="p-6 text-center">
              <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-green-500/20 flex items-center justify-center">
                <Check className="w-10 h-10 text-green-400" />
              </div>

              <h2 className="text-xl font-black text-white mb-2">
                Récompense activée !
              </h2>
              <p className="text-zinc-400 mb-6">
                Présente ce QR code à l'entrée de l'événement
              </p>

              {/* Fake QR Code placeholder */}
              <div className="bg-white p-4 rounded-2xl mb-6 mx-auto w-48 h-48 flex items-center justify-center">
                <QrCode className="w-32 h-32 text-zinc-800" />
              </div>

              <div className="bg-zinc-800 rounded-xl p-4 text-left mb-6">
                <p className="text-sm text-zinc-400 mb-1">Récompense</p>
                <p className="font-bold text-white">{purchase.reward_name}</p>
              </div>

              <button
                onClick={onClose}
                className="w-full py-3 rounded-xl font-bold text-white bg-gradient-to-r from-cyan-500 to-blue-500"
              >
                Fermer
              </button>
            </div>
          ) : (
            // Confirmation View
            <>
              {/* Header */}
              <div className={cn("h-32 flex items-center justify-center", typeConfig.bgColor)}>
                <div className="w-16 h-16 rounded-2xl bg-white/20 flex items-center justify-center">
                  <Icon className="w-8 h-8 text-white" />
                </div>
              </div>

              {/* Content */}
              <div className="p-6">
                <div className="text-center mb-6">
                  <span className={cn("text-sm font-medium", typeConfig.color)}>
                    {typeConfig.label}
                  </span>
                  <h2 className="text-xl font-black text-white mt-1">
                    {purchase.reward_name}
                  </h2>
                  <p className="text-sm text-zinc-400 mt-2">
                    {purchase.reward_description}
                  </p>
                </div>

                {/* Info */}
                <div className="bg-zinc-800 rounded-xl p-4 mb-6 space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-zinc-400">Acheté le</span>
                    <span className="text-white">
                      {new Date(purchase.purchased_at).toLocaleDateString("fr-FR")}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-zinc-400">XP dépensés</span>
                    <div className="flex items-center gap-1">
                      <Zap className="w-4 h-4 text-yellow-400" />
                      <span className="text-yellow-400 font-bold">
                        {purchase.xp_spent}
                      </span>
                    </div>
                  </div>
                  {timeRemaining && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-zinc-400">Expire dans</span>
                      <span className="text-amber-400">{timeRemaining}</span>
                    </div>
                  )}
                </div>

                {error && (
                  <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3 mb-4 text-center">
                    <p className="text-red-400 text-sm">{error}</p>
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-3">
                  <button
                    onClick={onClose}
                    className="flex-1 py-3 rounded-xl font-bold text-zinc-400 bg-zinc-800 hover:bg-zinc-700"
                  >
                    Annuler
                  </button>
                  {isUsable && onUse && (
                    <button
                      onClick={handleUse}
                      disabled={isUsing}
                      className={cn(
                        "flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-bold",
                        "bg-gradient-to-r from-cyan-500 to-blue-500 text-white",
                        "hover:shadow-lg hover:shadow-cyan-500/25 transition-shadow"
                      )}
                    >
                      {isUsing ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                      ) : (
                        <>
                          <QrCode className="w-5 h-5" />
                          Utiliser
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>
            </>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}

/* ==========================================================================
   EMPTY STATE
   ========================================================================== */

function EmptyInventory() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex flex-col items-center justify-center py-16 text-center"
    >
      <div className="w-20 h-20 rounded-2xl bg-zinc-800 flex items-center justify-center mb-4">
        <Package className="w-10 h-10 text-zinc-600" />
      </div>
      <h3 className="text-lg font-bold text-white mb-2">Inventaire vide</h3>
      <p className="text-zinc-500 max-w-sm">
        Tu n'as pas encore de récompenses. Visite la boutique pour échanger tes XP !
      </p>
    </motion.div>
  )
}
