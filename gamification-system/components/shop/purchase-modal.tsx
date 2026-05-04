"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  X,
  Zap,
  Check,
  Loader2,
  ShoppingCart,
  Gift,
  Ticket,
  AlertCircle,
  Tag,
  Crown,
  Sparkles,
} from "lucide-react"
import { cn } from "@/lib/utils"
import confetti from "canvas-confetti"
import {
  type ShopReward,
  REWARD_TYPE_CONFIG,
  formatXPPrice,
  formatRewardValue,
  calculateDiscountPercentage,
  isOnSale,
} from "../../features/shop/schema"

/* ==========================================================================
   PURCHASE MODAL
   ========================================================================== */

interface PurchaseModalProps {
  isOpen: boolean
  onClose: () => void
  reward: ShopReward | null
  userXP: number
  onConfirmPurchase: (rewardId: string, promoCode?: string) => Promise<{
    success: boolean
    xpSpent?: number
    discountApplied?: number
    error?: string
  }>
  onValidatePromo?: (code: string, rewardId: string) => Promise<{
    valid: boolean
    discountType?: "percentage" | "fixed_xp"
    discountValue?: number
    error?: string
  }>
}

export function PurchaseModal({
  isOpen,
  onClose,
  reward,
  userXP,
  onConfirmPurchase,
  onValidatePromo,
}: PurchaseModalProps) {
  const [step, setStep] = useState<"confirm" | "processing" | "success" | "error">("confirm")
  const [promoCode, setPromoCode] = useState("")
  const [promoDiscount, setPromoDiscount] = useState<number | null>(null)
  const [promoError, setPromoError] = useState<string | null>(null)
  const [isValidatingPromo, setIsValidatingPromo] = useState(false)
  const [purchaseError, setPurchaseError] = useState<string | null>(null)
  const [xpSpent, setXpSpent] = useState(0)

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setStep("confirm")
      setPromoCode("")
      setPromoDiscount(null)
      setPromoError(null)
      setPurchaseError(null)
    }
  }, [isOpen])

  if (!reward) return null

  const typeConfig = REWARD_TYPE_CONFIG[reward.reward_type]
  const onSale = isOnSale(reward)
  const discountPercent = onSale
    ? calculateDiscountPercentage(reward.original_xp_cost!, reward.xp_cost)
    : 0

  // Calculate final price
  let finalPrice = reward.xp_cost
  if (promoDiscount) {
    finalPrice = Math.max(0, reward.xp_cost - promoDiscount)
  }
  const canAfford = userXP >= finalPrice

  // Validate promo code
  const handleValidatePromo = async () => {
    if (!promoCode.trim() || !onValidatePromo) return

    setIsValidatingPromo(true)
    setPromoError(null)

    try {
      const result = await onValidatePromo(promoCode, reward.reward_id)

      if (result.valid && result.discountValue) {
        if (result.discountType === "percentage") {
          setPromoDiscount(Math.round((reward.xp_cost * result.discountValue) / 100))
        } else {
          setPromoDiscount(result.discountValue)
        }
      } else {
        setPromoError(result.error || "Code invalide")
        setPromoDiscount(null)
      }
    } catch {
      setPromoError("Erreur de validation")
    } finally {
      setIsValidatingPromo(false)
    }
  }

  // Handle purchase
  const handlePurchase = async () => {
    setStep("processing")
    setPurchaseError(null)

    try {
      const result = await onConfirmPurchase(
        reward.reward_id,
        promoDiscount ? promoCode : undefined
      )

      if (result.success) {
        setXpSpent(result.xpSpent || finalPrice)
        setStep("success")

        // Confetti!
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 },
          colors: ["#06b6d4", "#facc15", "#22c55e"],
        })
      } else {
        setPurchaseError(result.error || "Erreur lors de l'achat")
        setStep("error")
      }
    } catch {
      setPurchaseError("Erreur serveur")
      setStep("error")
    }
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          onClick={onClose}
        >
          {/* Backdrop */}
          <motion.div className="absolute inset-0 bg-black/80 backdrop-blur-sm" />

          {/* Modal */}
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="relative w-full max-w-md bg-zinc-900 rounded-3xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close Button */}
            <button
              onClick={onClose}
              className="absolute top-4 right-4 z-20 p-2 rounded-full bg-zinc-800/80 text-zinc-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            {step === "confirm" && (
              <ConfirmStep
                reward={reward}
                typeConfig={typeConfig}
                userXP={userXP}
                finalPrice={finalPrice}
                canAfford={canAfford}
                onSale={onSale}
                discountPercent={discountPercent}
                promoCode={promoCode}
                setPromoCode={setPromoCode}
                promoDiscount={promoDiscount}
                promoError={promoError}
                isValidatingPromo={isValidatingPromo}
                onValidatePromo={handleValidatePromo}
                onPurchase={handlePurchase}
              />
            )}

            {step === "processing" && <ProcessingStep />}

            {step === "success" && (
              <SuccessStep
                reward={reward}
                xpSpent={xpSpent}
                onClose={onClose}
              />
            )}

            {step === "error" && (
              <ErrorStep
                error={purchaseError}
                onRetry={() => setStep("confirm")}
                onClose={onClose}
              />
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

/* ==========================================================================
   CONFIRM STEP
   ========================================================================== */

interface ConfirmStepProps {
  reward: ShopReward
  typeConfig: (typeof REWARD_TYPE_CONFIG)[keyof typeof REWARD_TYPE_CONFIG]
  userXP: number
  finalPrice: number
  canAfford: boolean
  onSale: boolean
  discountPercent: number
  promoCode: string
  setPromoCode: (code: string) => void
  promoDiscount: number | null
  promoError: string | null
  isValidatingPromo: boolean
  onValidatePromo: () => void
  onPurchase: () => void
}

function ConfirmStep({
  reward,
  typeConfig,
  userXP,
  finalPrice,
  canAfford,
  onSale,
  discountPercent,
  promoCode,
  setPromoCode,
  promoDiscount,
  promoError,
  isValidatingPromo,
  onValidatePromo,
  onPurchase,
}: ConfirmStepProps) {
  return (
    <>
      {/* Header */}
      <div className={cn("relative h-40 flex items-center justify-center", typeConfig.bgColor)}>
        {reward.image_url ? (
          <img
            src={reward.image_url}
            alt={reward.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-20 h-20 rounded-2xl bg-white/20 flex items-center justify-center">
            <Gift className="w-10 h-10 text-white" />
          </div>
        )}

        {/* Sale badge */}
        {onSale && (
          <div className="absolute top-4 left-4 px-3 py-1 bg-red-500 text-white rounded-full text-sm font-bold">
            -{discountPercent}%
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-6">
        <div className="text-center mb-6">
          <span className={cn("text-sm font-medium", typeConfig.color)}>
            {typeConfig.label}
          </span>
          <h2 className="text-xl font-black text-white mt-1">{reward.name}</h2>
          <p className="text-sm text-zinc-400 mt-2">{reward.short_description}</p>
        </div>

        {/* Price Summary */}
        <div className="bg-zinc-800 rounded-xl p-4 mb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-zinc-400">Prix</span>
            <div className="flex items-center gap-2">
              {(onSale || promoDiscount) && (
                <span className="text-zinc-500 line-through">
                  {formatXPPrice(reward.original_xp_cost || reward.xp_cost)}
                </span>
              )}
              <span className="text-white font-bold">
                {formatXPPrice(finalPrice)} XP
              </span>
            </div>
          </div>

          {promoDiscount && (
            <div className="flex items-center justify-between text-green-400 text-sm">
              <span>Code promo</span>
              <span>-{formatXPPrice(promoDiscount)} XP</span>
            </div>
          )}

          <div className="border-t border-zinc-700 mt-3 pt-3">
            <div className="flex items-center justify-between">
              <span className="text-zinc-400">Ton solde</span>
              <div className="flex items-center gap-1">
                <Zap className="w-4 h-4 text-yellow-400" />
                <span className="text-yellow-400 font-bold">
                  {formatXPPrice(userXP)} XP
                </span>
              </div>
            </div>
            <div className="flex items-center justify-between mt-2">
              <span className="text-zinc-400">Après achat</span>
              <span
                className={cn(
                  "font-bold",
                  canAfford ? "text-green-400" : "text-red-400"
                )}
              >
                {formatXPPrice(userXP - finalPrice)} XP
              </span>
            </div>
          </div>
        </div>

        {/* Promo Code */}
        <div className="mb-6">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Tag className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
              <input
                type="text"
                placeholder="Code promo"
                value={promoCode}
                onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
                className="w-full pl-10 pr-4 py-2.5 bg-zinc-800 border border-zinc-700 rounded-xl text-white placeholder:text-zinc-500 focus:outline-none focus:border-cyan-500"
              />
            </div>
            <button
              onClick={onValidatePromo}
              disabled={!promoCode.trim() || isValidatingPromo}
              className="px-4 py-2.5 bg-zinc-700 text-white rounded-xl hover:bg-zinc-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isValidatingPromo ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                "Appliquer"
              )}
            </button>
          </div>
          {promoError && (
            <p className="text-red-400 text-sm mt-2">{promoError}</p>
          )}
          {promoDiscount && (
            <p className="text-green-400 text-sm mt-2 flex items-center gap-1">
              <Check className="w-4 h-4" />
              Code appliqué ! Tu économises {formatXPPrice(promoDiscount)} XP
            </p>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3">
          <button
            onClick={onPurchase}
            disabled={!canAfford}
            className={cn(
              "flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-bold transition-all",
              canAfford
                ? "bg-gradient-to-r from-cyan-500 to-blue-500 text-white hover:shadow-lg hover:shadow-cyan-500/25"
                : "bg-zinc-700 text-zinc-500 cursor-not-allowed"
            )}
          >
            <ShoppingCart className="w-5 h-5" />
            Confirmer l'achat
          </button>
        </div>

        {!canAfford && (
          <p className="text-center text-red-400 text-sm mt-3">
            Il te manque {formatXPPrice(finalPrice - userXP)} XP
          </p>
        )}
      </div>
    </>
  )
}

/* ==========================================================================
   PROCESSING STEP
   ========================================================================== */

function ProcessingStep() {
  return (
    <div className="p-12 flex flex-col items-center justify-center">
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
      >
        <Loader2 className="w-12 h-12 text-cyan-400" />
      </motion.div>
      <p className="text-white font-medium mt-4">Traitement en cours...</p>
    </div>
  )
}

/* ==========================================================================
   SUCCESS STEP
   ========================================================================== */

interface SuccessStepProps {
  reward: ShopReward
  xpSpent: number
  onClose: () => void
}

function SuccessStep({ reward, xpSpent, onClose }: SuccessStepProps) {
  return (
    <div className="p-6 text-center">
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        className="w-20 h-20 mx-auto mb-4 rounded-full bg-green-500/20 flex items-center justify-center"
      >
        <Check className="w-10 h-10 text-green-400" />
      </motion.div>

      <h2 className="text-2xl font-black text-white mb-2">Achat réussi !</h2>
      <p className="text-zinc-400 mb-6">
        Tu as obtenu <span className="text-white font-bold">{reward.name}</span>
      </p>

      <div className="bg-zinc-800 rounded-xl p-4 mb-6">
        <div className="flex items-center justify-center gap-2 text-yellow-400">
          <Zap className="w-5 h-5" />
          <span className="font-bold">-{formatXPPrice(xpSpent)} XP</span>
        </div>
      </div>

      <p className="text-sm text-zinc-500 mb-6">
        Ta récompense est disponible dans ton inventaire.
      </p>

      <button
        onClick={onClose}
        className="w-full py-3 rounded-xl font-bold text-white bg-gradient-to-r from-cyan-500 to-blue-500 hover:shadow-lg hover:shadow-cyan-500/25 transition-shadow"
      >
        Super !
      </button>
    </div>
  )
}

/* ==========================================================================
   ERROR STEP
   ========================================================================== */

interface ErrorStepProps {
  error: string | null
  onRetry: () => void
  onClose: () => void
}

function ErrorStep({ error, onRetry, onClose }: ErrorStepProps) {
  return (
    <div className="p-6 text-center">
      <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-red-500/20 flex items-center justify-center">
        <AlertCircle className="w-10 h-10 text-red-400" />
      </div>

      <h2 className="text-2xl font-black text-white mb-2">Oups !</h2>
      <p className="text-zinc-400 mb-6">{error || "Une erreur est survenue"}</p>

      <div className="flex gap-3">
        <button
          onClick={onClose}
          className="flex-1 py-3 rounded-xl font-bold text-zinc-400 bg-zinc-800 hover:bg-zinc-700"
        >
          Annuler
        </button>
        <button
          onClick={onRetry}
          className="flex-1 py-3 rounded-xl font-bold text-white bg-gradient-to-r from-cyan-500 to-blue-500"
        >
          Réessayer
        </button>
      </div>
    </div>
  )
}
