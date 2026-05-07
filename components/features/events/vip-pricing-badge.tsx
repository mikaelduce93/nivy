"use client"

import { Crown, Star, Sparkles, Info } from "lucide-react"
import { cn } from "@/lib/utils"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import Link from "next/link"

interface VIPPricingBadgeProps {
  /** Prix standard */
  standardPrice: number
  /** Prix VIP (optionnel - calculé si non fourni) */
  vipPrice?: number
  /** Prix Platinum (optionnel - calculé si non fourni) */
  premiumPrice?: number
  /** Variante d'affichage */
  variant?: "compact" | "full" | "inline" | "card"
  /** Classes additionnelles */
  className?: string
  /** Afficher le lien vers la carte VIP */
  showVIPLink?: boolean
}

/**
 * Composant d'affichage des tarifs VIP
 * Montre les différents prix selon le niveau d'abonnement
 */
export function VIPPricingBadge({
  standardPrice,
  vipPrice,
  premiumPrice,
  variant = "compact",
  className,
  showVIPLink = true,
}: VIPPricingBadgeProps) {
  // Calculate VIP prices if not provided (20% and 30% discounts)
  const calculatedVipPrice = vipPrice ?? Math.round(standardPrice * 0.8)
  const calculatedPremiumPrice = premiumPrice ?? Math.round(standardPrice * 0.7)

  // Free event - no VIP pricing needed
  if (standardPrice === 0) {
    return (
      <span className={cn("text-emerald-400 font-bold", className)}>
        Gratuit
      </span>
    )
  }

  // Compact variant - just shows standard price with VIP badge
  if (variant === "compact") {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className={cn("inline-flex items-center gap-2", className)}>
              <span className="font-bold text-primary">{standardPrice} DH</span>
              <span className="px-1.5 py-0.5 rounded bg-gradient-to-r from-yellow-500/20 to-orange-500/20 border border-yellow-500/30 text-yellow-500 text-[10px] font-bold flex items-center gap-1">
                <Star className="w-2.5 h-2.5" />
                VIP -20%
              </span>
            </div>
          </TooltipTrigger>
          <TooltipContent side="top" className="bg-zinc-900 border-zinc-800 p-3">
            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between gap-4">
                <span className="text-zinc-400">Standard</span>
                <span className="font-bold">{standardPrice} DH</span>
              </div>
              <div className="flex items-center justify-between gap-4 text-yellow-400">
                <span className="flex items-center gap-1">
                  <Star className="w-3 h-3" /> Gold
                </span>
                <span className="font-bold">{calculatedVipPrice} DH</span>
              </div>
              <div className="flex items-center justify-between gap-4 text-purple-400">
                <span className="flex items-center gap-1">
                  <Crown className="w-3 h-3" /> Platinum
                </span>
                <span className="font-bold">{calculatedPremiumPrice} DH</span>
              </div>
              {showVIPLink && (
                <Link
                  href="/carte-vip"
                  className="text-xs text-cyan-400 hover:underline block pt-2 border-t border-zinc-700"
                >
                  Découvrir les Pass VIP →
                </Link>
              )}
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    )
  }

  // Inline variant - shows all prices in a row
  if (variant === "inline") {
    return (
      <div className={cn("flex items-center gap-3 flex-wrap", className)}>
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-zinc-500">Standard:</span>
          <span className="font-bold">{standardPrice} DH</span>
        </div>
        <div className="flex items-center gap-1.5 text-yellow-500">
          <Star className="w-3 h-3" />
          <span className="text-xs">Gold:</span>
          <span className="font-bold">{calculatedVipPrice} DH</span>
        </div>
        <div className="flex items-center gap-1.5 text-purple-500">
          <Crown className="w-3 h-3" />
          <span className="text-xs">Platinum:</span>
          <span className="font-bold">{calculatedPremiumPrice} DH</span>
        </div>
      </div>
    )
  }

  // Full variant - detailed pricing table
  if (variant === "full") {
    const standardSavings = 0
    const vipSavings = standardPrice - calculatedVipPrice
    const premiumSavings = standardPrice - calculatedPremiumPrice

    return (
      <div className={cn("space-y-3", className)}>
        <div className="flex items-center justify-between p-3 rounded-lg bg-zinc-800/50 border border-zinc-700">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-zinc-700 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-zinc-400" />
            </div>
            <div>
              <p className="font-medium text-white">Standard</p>
              <p className="text-xs text-zinc-500">Sans abonnement</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-xl font-black text-white">{standardPrice} DH</p>
          </div>
        </div>

        <div className="flex items-center justify-between p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/30">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-yellow-500 to-orange-500 flex items-center justify-center">
              <Star className="w-4 h-4 text-white" />
            </div>
            <div>
              <p className="font-medium text-yellow-400">Pass Gold</p>
              <p className="text-xs text-yellow-500/70">-20% sur tous les events</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-xl font-black text-yellow-400">{calculatedVipPrice} DH</p>
            {vipSavings > 0 && (
              <p className="text-xs text-emerald-400">-{vipSavings} DH</p>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between p-3 rounded-lg bg-purple-500/10 border border-purple-500/30">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
              <Crown className="w-4 h-4 text-white" />
            </div>
            <div>
              <p className="font-medium text-purple-400">Pass Platinum</p>
              <p className="text-xs text-purple-500/70">-30% sur tous les events</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-xl font-black text-purple-400">{calculatedPremiumPrice} DH</p>
            {premiumSavings > 0 && (
              <p className="text-xs text-emerald-400">-{premiumSavings} DH</p>
            )}
          </div>
        </div>

        {showVIPLink && (
          <Link
            href="/carte-vip"
            className="flex items-center justify-center gap-2 p-2 rounded-lg bg-gradient-to-r from-yellow-500/10 to-purple-500/10 border border-yellow-500/20 text-sm text-yellow-400 hover:bg-yellow-500/20 transition-colors"
          >
            <Info className="w-4 h-4" />
            Souscrire à un Pass VIP
          </Link>
        )}
      </div>
    )
  }

  // Card variant - compact card showing savings
  if (variant === "card") {
    const maxSavings = standardPrice - calculatedPremiumPrice

    return (
      <div className={cn("p-4 rounded-xl bg-gradient-to-br from-purple-500/10 to-pink-500/10 border border-purple-500/20", className)}>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Crown className="w-5 h-5 text-purple-400" />
            <span className="font-bold text-white">Tarifs VIP</span>
          </div>
          <span className="text-xs bg-emerald-500/20 text-emerald-400 px-2 py-1 rounded-full">
            Jusqu'à -{maxSavings} DH
          </span>
        </div>

        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="p-2 rounded-lg bg-zinc-800/50">
            <p className="text-[10px] text-zinc-500 uppercase">Standard</p>
            <p className="font-bold text-white">{standardPrice}</p>
          </div>
          <div className="p-2 rounded-lg bg-yellow-500/10">
            <p className="text-[10px] text-yellow-500 uppercase">Gold</p>
            <p className="font-bold text-yellow-400">{calculatedVipPrice}</p>
          </div>
          <div className="p-2 rounded-lg bg-purple-500/10">
            <p className="text-[10px] text-purple-500 uppercase">Platinum</p>
            <p className="font-bold text-purple-400">{calculatedPremiumPrice}</p>
          </div>
        </div>

        {showVIPLink && (
          <Link
            href="/carte-vip"
            className="block text-center text-xs text-purple-400 hover:text-purple-300 mt-3"
          >
            Voir les Pass VIP →
          </Link>
        )}
      </div>
    )
  }

  return null
}

/**
 * Badge VIP simple pour les listes
 */
export function VIPDiscountBadge({ className }: { className?: string }) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className={cn(
            "inline-flex items-center gap-1 px-2 py-0.5 rounded-full",
            "bg-gradient-to-r from-yellow-500/20 to-purple-500/20",
            "border border-yellow-500/30 text-yellow-500 text-[10px] font-bold",
            "cursor-help",
            className
          )}>
            <Crown className="w-2.5 h-2.5" />
            VIP
          </span>
        </TooltipTrigger>
        <TooltipContent side="top" className="bg-zinc-900 border-zinc-800">
          <p className="text-xs">Jusqu'à 30% de réduction avec le Pass VIP</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
