/**
 * TEENS PARTY MOROCCO - VIP Perks Components
 * ==========================================
 *
 * Composants pour l'affichage des avantages VIP.
 */

"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  Gift,
  Calendar,
  Users,
  ShoppingBag,
  Palette,
  Headphones,
  TrendingUp,
  Coins,
  Sparkles,
  Lock,
  Check,
  ChevronRight,
  Clock,
  Percent,
  Circle,
  Package,
} from "lucide-react"
import {
  type VipTierSlug,
  type VipPerk,
  type VipTier,
  type PerkCategory,
  VIP_TIER_CONFIG,
  PERK_CATEGORY_CONFIG,
  getTierConfig,
  getTierGlowStyle,
  isTierAtLeast,
} from "../../features/vip-system"
import { VipBadge } from "./vip-badge"

/* ==========================================================================
   PERKS LIST
   ========================================================================== */

interface VipPerksListProps {
  perks: VipPerk[]
  tier: VipTierSlug
  userTier?: VipTierSlug
}

export function VipPerksList({ perks, tier, userTier }: VipPerksListProps) {
  const config = getTierConfig(tier)
  const hasAccess = userTier ? isTierAtLeast(userTier, tier) : false

  // Grouper par catégorie
  const groupedPerks = perks.reduce(
    (acc, perk) => {
      const category = perk.category || "rewards"
      if (!acc[category]) {
        acc[category] = []
      }
      acc[category].push(perk)
      return acc
    },
    {} as Record<PerkCategory, VipPerk[]>
  )

  return (
    <div className="space-y-6">
      {Object.entries(groupedPerks).map(([category, categoryPerks]) => (
        <div key={category}>
          <div className="flex items-center gap-2 mb-3">
            <CategoryIcon category={category as PerkCategory} />
            <h4 className="text-sm font-medium text-zinc-400">
              {PERK_CATEGORY_CONFIG[category as PerkCategory]?.name || category}
            </h4>
          </div>

          <div className="space-y-2">
            {categoryPerks.map((perk) => (
              <PerkItem
                key={perk.id}
                perk={perk}
                tier={tier}
                hasAccess={hasAccess}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

/* ==========================================================================
   PERK ITEM
   ========================================================================== */

interface PerkItemProps {
  perk: VipPerk
  tier: VipTierSlug
  hasAccess: boolean
}

function PerkItem({ perk, tier, hasAccess }: PerkItemProps) {
  const config = getTierConfig(tier)

  return (
    <motion.div
      whileHover={{ x: 4 }}
      className={`flex items-center gap-3 p-3 rounded-xl transition-colors ${
        hasAccess
          ? `${config.bgColor} border ${config.borderColor}`
          : "bg-zinc-800/30 border border-zinc-700/30"
      }`}
    >
      {/* Icon */}
      <div
        className={`w-8 h-8 rounded-lg flex items-center justify-center ${
          hasAccess ? config.bgColor : "bg-zinc-700/50"
        }`}
      >
        <PerkIcon icon={perk.icon || "Gift"} className={hasAccess ? config.color : "text-zinc-500"} />
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h5
            className={`font-medium ${
              hasAccess ? "text-white" : "text-zinc-500"
            }`}
          >
            {perk.name}
          </h5>
          {perk.is_highlighted && hasAccess && (
            <Sparkles className="w-3 h-3 text-yellow-400" />
          )}
        </div>
        <p className="text-xs text-zinc-400 truncate">{perk.description}</p>
      </div>

      {/* Status */}
      {hasAccess ? (
        <Check className={`w-5 h-5 ${config.color}`} />
      ) : (
        <Lock className="w-5 h-5 text-zinc-600" />
      )}
    </motion.div>
  )
}

/* ==========================================================================
   TIER BENEFITS COMPARISON
   ========================================================================== */

interface TierBenefitsComparisonProps {
  tiers: VipTier[]
  currentTier: VipTierSlug
  onSelectTier?: (tier: VipTierSlug) => void
}

export function TierBenefitsComparison({
  tiers,
  currentTier,
  onSelectTier,
}: TierBenefitsComparisonProps) {
  const [selectedTier, setSelectedTier] = useState<VipTierSlug>(currentTier)

  const handleSelect = (tier: VipTierSlug) => {
    setSelectedTier(tier)
    onSelectTier?.(tier)
  }

  const benefits = [
    { key: "xp_multiplier", label: "Multiplicateur XP", format: (v: number) => `x${v}` },
    { key: "coin_multiplier", label: "Multiplicateur Coins", format: (v: number) => `x${v}` },
    { key: "max_daily_wheel_spins", label: "Spins roue/jour", format: (v: number) => v.toString() },
    { key: "max_daily_packs", label: "Packs gratuits/jour", format: (v: number) => v.toString() },
    { key: "discount_percentage", label: "Réduction boutique", format: (v: number) => `${v}%` },
    { key: "free_monthly_coins", label: "Coins mensuels", format: (v: number) => v.toString() },
    { key: "early_access_hours", label: "Accès anticipé", format: (v: number) => `${v}h` },
    { key: "max_crew_size", label: "Taille crew max", format: (v: number) => v.toString() },
  ]

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[600px]">
        {/* Header - Tiers */}
        <thead>
          <tr>
            <th className="p-3 text-left text-sm text-zinc-400">Avantage</th>
            {tiers.map((tier) => {
              const slug = tier.slug as VipTierSlug
              const config = getTierConfig(slug)
              const isCurrent = slug === currentTier
              const isSelected = slug === selectedTier

              return (
                <th
                  key={tier.id}
                  onClick={() => handleSelect(slug)}
                  className={`p-3 cursor-pointer transition-colors ${
                    isSelected ? config.bgColor : "hover:bg-zinc-800/50"
                  } ${isCurrent ? `border-b-2 ${config.borderColor}` : ""}`}
                >
                  <div className="flex flex-col items-center gap-1">
                    <VipBadge tier={slug} size="sm" />
                    <span className={`text-xs ${config.color}`}>
                      {config.name}
                    </span>
                    {isCurrent && (
                      <span className="text-[10px] text-cyan-400">Actuel</span>
                    )}
                  </div>
                </th>
              )
            })}
          </tr>
        </thead>

        {/* Body - Benefits */}
        <tbody className="divide-y divide-zinc-800/50">
          {benefits.map((benefit) => (
            <tr key={benefit.key} className="hover:bg-zinc-800/30">
              <td className="p-3 text-sm text-zinc-300">{benefit.label}</td>
              {tiers.map((tier) => {
                const slug = tier.slug as VipTierSlug
                const value = (tier as any)[benefit.key]
                const hasValue = value > 0 || (benefit.key === "xp_multiplier" && value >= 1)
                const isSelected = slug === selectedTier

                return (
                  <td
                    key={`${tier.id}-${benefit.key}`}
                    className={`p-3 text-center ${
                      isSelected ? getTierConfig(slug).bgColor : ""
                    }`}
                  >
                    <span
                      className={`text-sm font-medium ${
                        hasValue
                          ? getTierConfig(slug).color
                          : "text-zinc-600"
                      }`}
                    >
                      {hasValue ? benefit.format(value) : "-"}
                    </span>
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

/* ==========================================================================
   PERK HIGHLIGHT CARD
   ========================================================================== */

interface PerkHighlightCardProps {
  perk: VipPerk
  tier: VipTierSlug
  onLearnMore?: () => void
}

export function PerkHighlightCard({
  perk,
  tier,
  onLearnMore,
}: PerkHighlightCardProps) {
  const config = getTierConfig(tier)

  return (
    <motion.div
      whileHover={{ y: -4 }}
      className={`p-4 rounded-2xl ${config.bgColor} border ${config.borderColor}`}
      style={getTierGlowStyle(tier)}
    >
      <div className="flex items-start gap-3">
        <div
          className={`w-10 h-10 rounded-xl flex items-center justify-center bg-gradient-to-br ${config.gradient}`}
        >
          <PerkIcon icon={perk.icon || "Gift"} className="text-white" />
        </div>

        <div className="flex-1">
          <h4 className="font-bold text-white">{perk.name}</h4>
          <p className="text-sm text-zinc-400 mt-1">{perk.description}</p>

          {onLearnMore && (
            <button
              onClick={onLearnMore}
              className={`flex items-center gap-1 mt-3 text-sm ${config.color} hover:underline`}
            >
              En savoir plus
              <ChevronRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </motion.div>
  )
}

/* ==========================================================================
   MONTHLY COINS CARD
   ========================================================================== */

interface MonthlyCoinsCardProps {
  tier: VipTierSlug
  coins: number
  canClaim: boolean
  nextClaimDate?: string
  onClaim: () => void
}

export function MonthlyCoinsCard({
  tier,
  coins,
  canClaim,
  nextClaimDate,
  onClaim,
}: MonthlyCoinsCardProps) {
  const config = getTierConfig(tier)

  if (coins === 0) {
    return (
      <div className="p-4 rounded-2xl bg-zinc-800/50 border border-zinc-700/50 text-center">
        <Lock className="w-8 h-8 text-zinc-600 mx-auto mb-2" />
        <p className="text-sm text-zinc-400">
          Les coins mensuels sont disponibles à partir du tier Bronze
        </p>
      </div>
    )
  }

  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      className={`p-4 rounded-2xl ${config.bgColor} border ${config.borderColor}`}
      style={getTierGlowStyle(tier)}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div
            className={`w-12 h-12 rounded-xl flex items-center justify-center bg-gradient-to-br ${config.gradient}`}
          >
            <Coins className="w-6 h-6 text-white" />
          </div>
          <div>
            <h4 className="font-bold text-white">Coins Mensuels</h4>
            <p className="text-sm text-zinc-400">
              {canClaim
                ? "Disponible maintenant !"
                : nextClaimDate
                ? `Prochain: ${new Date(nextClaimDate).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}`
                : "Déjà réclamé ce mois"}
            </p>
          </div>
        </div>

        <div className="text-right">
          <p className={`text-2xl font-bold ${config.color}`}>{coins}</p>
          <p className="text-xs text-zinc-400">coins</p>
        </div>
      </div>

      <button
        onClick={onClaim}
        disabled={!canClaim}
        className={`w-full mt-4 py-3 rounded-xl font-bold transition-all ${
          canClaim
            ? `bg-gradient-to-r ${config.gradient} text-white hover:opacity-90`
            : "bg-zinc-700 text-zinc-400 cursor-not-allowed"
        }`}
      >
        {canClaim ? "Réclamer" : "Déjà réclamé"}
      </button>
    </motion.div>
  )
}

/* ==========================================================================
   MULTIPLIER DISPLAY
   ========================================================================== */

interface MultiplierDisplayProps {
  xpMultiplier: number
  coinMultiplier: number
  tier: VipTierSlug
}

export function MultiplierDisplay({
  xpMultiplier,
  coinMultiplier,
  tier,
}: MultiplierDisplayProps) {
  const config = getTierConfig(tier)

  return (
    <div className="flex gap-4">
      <div
        className={`flex-1 p-4 rounded-xl ${config.bgColor} border ${config.borderColor}`}
      >
        <div className="flex items-center gap-2 mb-2">
          <TrendingUp className={`w-4 h-4 ${config.color}`} />
          <span className="text-sm text-zinc-400">XP</span>
        </div>
        <p className={`text-2xl font-bold ${config.color}`}>x{xpMultiplier}</p>
      </div>

      <div
        className={`flex-1 p-4 rounded-xl ${config.bgColor} border ${config.borderColor}`}
      >
        <div className="flex items-center gap-2 mb-2">
          <Coins className={`w-4 h-4 ${config.color}`} />
          <span className="text-sm text-zinc-400">Coins</span>
        </div>
        <p className={`text-2xl font-bold ${config.color}`}>x{coinMultiplier}</p>
      </div>
    </div>
  )
}

/* ==========================================================================
   HELPERS
   ========================================================================== */

interface CategoryIconProps {
  category: PerkCategory
  className?: string
}

function CategoryIcon({ category, className = "" }: CategoryIconProps) {
  const iconMap: Record<PerkCategory, React.ElementType> = {
    rewards: Gift,
    events: Calendar,
    social: Users,
    shop: ShoppingBag,
    customization: Palette,
    support: Headphones,
  }

  const config = PERK_CATEGORY_CONFIG[category]
  const Icon = iconMap[category] || Gift

  return <Icon className={`w-4 h-4 ${config?.color || "text-zinc-400"} ${className}`} />
}

interface PerkIconProps {
  icon: string
  className?: string
}

function PerkIcon({ icon, className = "" }: PerkIconProps) {
  const iconMap: Record<string, React.ElementType> = {
    Gift: Gift,
    TrendingUp: TrendingUp,
    Coins: Coins,
    Circle: Circle,
    Clock: Clock,
    Users: Users,
    Star: Sparkles,
    Award: Gift,
    Tag: Percent,
    Sparkles: Sparkles,
    Zap: TrendingUp,
    Package: Package,
    Headphones: Headphones,
  }

  const Icon = iconMap[icon] || Gift

  return <Icon className={`w-4 h-4 ${className}`} />
}
