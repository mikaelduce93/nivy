"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Button } from "@/components/ui/button"
import {
  Zap,
  Coins,
  Trophy,
  Gift,
  TrendingUp,
  Star,
  Info,
  ArrowRight,
  Sparkles,
  CreditCard,
  Target,
  ShoppingBag,
} from "lucide-react"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import Link from "next/link"
import { cn } from "@/lib/utils"

interface UnifiedRewardsDisplayProps {
  // XP Data (Gamification)
  xp?: {
    total: number
    level: number
    toNextLevel: number
    streak?: number
  }
  // Points Data (Loyalty/VIP)
  points?: {
    total: number
    tier: "bronze" | "silver" | "gold" | "platinum"
    toNextTier: number
  }
  // VIP Card
  vipCard?: {
    tier: "free" | "silver" | "gold" | "platinum"
    expiresAt?: string
  }
  // Coins (Gamification currency for shop)
  coins?: number
  // Display options
  compact?: boolean
  showExplanation?: boolean
  className?: string
}

const TIER_COLORS = {
  bronze: "from-orange-600 to-orange-800",
  silver: "from-zinc-400 to-zinc-600",
  gold: "from-yellow-500 to-amber-600",
  platinum: "from-purple-500 to-pink-600",
  free: "from-zinc-600 to-zinc-800",
}

const TIER_LABELS = {
  bronze: "Bronze",
  silver: "Silver",
  gold: "Gold",
  platinum: "Platinum",
  free: "Free",
}

export function UnifiedRewardsDisplay({
  xp,
  points,
  vipCard,
  coins,
  compact = false,
  showExplanation = false,
  className,
}: UnifiedRewardsDisplayProps) {
  if (compact) {
    return (
      <div className={cn("flex items-center gap-4", className)}>
        {/* XP Compact */}
        {xp && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-purple-500/20 border border-purple-500/30">
                  <Zap className="h-4 w-4 text-purple-400" />
                  <span className="text-sm font-bold text-purple-400">{xp.total.toLocaleString()}</span>
                  <Badge variant="outline" className="text-xs px-1.5 py-0 border-purple-500/50 text-purple-300">
                    Nv.{xp.level}
                  </Badge>
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p>XP Gamification - Niveau {xp.level}</p>
                <p className="text-xs text-muted-foreground">{xp.toNextLevel} XP pour le niveau suivant</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}

        {/* Coins Compact */}
        {coins !== undefined && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-yellow-500/20 border border-yellow-500/30">
                  <Coins className="h-4 w-4 text-yellow-400" />
                  <span className="text-sm font-bold text-yellow-400">{coins.toLocaleString()}</span>
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p>Coins - Boutique</p>
                <p className="text-xs text-muted-foreground">Dépensez vos coins dans la boutique</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}

        {/* Points Compact */}
        {points && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/20 border border-emerald-500/30">
                  <Star className="h-4 w-4 text-emerald-400" />
                  <span className="text-sm font-bold text-emerald-400">{points.total.toLocaleString()}</span>
                  <Badge variant="outline" className="text-xs px-1.5 py-0 border-emerald-500/50 text-emerald-300">
                    {TIER_LABELS[points.tier]}
                  </Badge>
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p>Points Fidélité - {TIER_LABELS[points.tier]}</p>
                <p className="text-xs text-muted-foreground">{points.toNextTier} pts pour le tier suivant</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </div>
    )
  }

  // Full display
  return (
    <div className={cn("space-y-6", className)}>
      {/* Header with explanation */}
      {showExplanation && (
        <Card className="bg-gradient-to-br from-cyan-500/10 to-purple-500/10 border-cyan-500/30">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <Info className="h-5 w-5 text-cyan-400 mt-0.5 flex-shrink-0" />
              <div>
                <h4 className="font-semibold text-white mb-1">Comment ça marche ?</h4>
                <p className="text-sm text-zinc-300">
                  Tu as <strong className="text-purple-400">2 types de récompenses</strong> chez Teens Party :
                </p>
                <ul className="mt-2 space-y-1 text-sm text-zinc-400">
                  <li className="flex items-center gap-2">
                    <Zap className="h-3 w-3 text-purple-400" />
                    <span><strong className="text-purple-400">XP</strong> : Gagne en jouant, missions, défis → Monte de niveau</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Star className="h-3 w-3 text-emerald-400" />
                    <span><strong className="text-emerald-400">Points</strong> : Gagne en achetant → Réductions et cadeaux</span>
                  </li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid md:grid-cols-2 gap-4">
        {/* XP Card - Gamification */}
        {xp && (
          <Card className="bg-gradient-to-br from-purple-500/20 to-pink-500/20 border-purple-500/30">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-purple-400">
                  <Zap className="h-5 w-5" />
                  XP Gamification
                </div>
                <Badge className="bg-purple-500/30 text-purple-300 border-purple-500/50">
                  Niveau {xp.level}
                </Badge>
              </CardTitle>
              <CardDescription className="text-purple-300/70">
                Gagne de l'XP en jouant et complétant des défis
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-center">
                <p className="text-4xl font-black text-white">{xp.total.toLocaleString()}</p>
                <p className="text-sm text-purple-300">XP Total</p>
              </div>

              {/* Level Progress */}
              <div className="space-y-2">
                <div className="flex justify-between text-xs text-purple-300">
                  <span>Niveau {xp.level}</span>
                  <span>Niveau {xp.level + 1}</span>
                </div>
                <Progress
                  value={((1000 - xp.toNextLevel) / 1000) * 100}
                  className="h-2 bg-purple-950"
                />
                <p className="text-xs text-center text-purple-400">
                  {xp.toNextLevel} XP restants
                </p>
              </div>

              {/* Streak */}
              {xp.streak !== undefined && (
                <div className="flex items-center justify-center gap-2 p-2 rounded-lg bg-purple-500/10">
                  <TrendingUp className="h-4 w-4 text-orange-400" />
                  <span className="text-sm text-white">
                    Série de <strong className="text-orange-400">{xp.streak}</strong> jours
                  </span>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-2">
                <Button asChild size="sm" className="flex-1 bg-purple-500 hover:bg-purple-600">
                  <Link href="/gamification/missions">
                    <Target className="h-4 w-4 mr-1" />
                    Missions
                  </Link>
                </Button>
                <Button asChild size="sm" variant="outline" className="flex-1 border-purple-500/50 text-purple-300">
                  <Link href="/gamification/leaderboard">
                    <Trophy className="h-4 w-4 mr-1" />
                    Classement
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Points Card - Loyalty */}
        {points && (
          <Card className="bg-gradient-to-br from-emerald-500/20 to-teal-500/20 border-emerald-500/30">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-emerald-400">
                  <Star className="h-5 w-5" />
                  Points Fidélité
                </div>
                <Badge className={cn(
                  "border",
                  points.tier === "platinum" && "bg-purple-500/30 text-purple-300 border-purple-500/50",
                  points.tier === "gold" && "bg-yellow-500/30 text-yellow-300 border-yellow-500/50",
                  points.tier === "silver" && "bg-zinc-500/30 text-zinc-300 border-zinc-500/50",
                  points.tier === "bronze" && "bg-orange-500/30 text-orange-300 border-orange-500/50"
                )}>
                  {TIER_LABELS[points.tier]}
                </Badge>
              </CardTitle>
              <CardDescription className="text-emerald-300/70">
                Gagne des points à chaque achat
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-center">
                <p className="text-4xl font-black text-white">{points.total.toLocaleString()}</p>
                <p className="text-sm text-emerald-300">Points</p>
              </div>

              {/* Tier Progress */}
              <div className="space-y-2">
                <div className="flex justify-between text-xs text-emerald-300">
                  <span>{TIER_LABELS[points.tier]}</span>
                  <span>{points.tier !== "platinum" ? "Tier suivant" : "Max"}</span>
                </div>
                <Progress
                  value={points.tier === "platinum" ? 100 : ((500 - points.toNextTier) / 500) * 100}
                  className="h-2 bg-emerald-950"
                />
                {points.tier !== "platinum" && (
                  <p className="text-xs text-center text-emerald-400">
                    {points.toNextTier} pts pour {
                      points.tier === "bronze" ? "Silver" :
                      points.tier === "silver" ? "Gold" : "Platinum"
                    }
                  </p>
                )}
              </div>

              {/* VIP Card Status */}
              {vipCard && (
                <div className={cn(
                  "flex items-center justify-between p-2 rounded-lg",
                  `bg-gradient-to-r ${TIER_COLORS[vipCard.tier]} bg-opacity-20`
                )}>
                  <div className="flex items-center gap-2">
                    <CreditCard className="h-4 w-4 text-white" />
                    <span className="text-sm text-white">Carte VIP {TIER_LABELS[vipCard.tier]}</span>
                  </div>
                  {vipCard.expiresAt && (
                    <span className="text-xs text-white/70">
                      Expire: {new Date(vipCard.expiresAt).toLocaleDateString("fr-FR")}
                    </span>
                  )}
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-2">
                <Button asChild size="sm" className="flex-1 bg-emerald-500 hover:bg-emerald-600">
                  <Link href="/carte-vip/recompenses">
                    <Gift className="h-4 w-4 mr-1" />
                    Récompenses
                  </Link>
                </Button>
                <Button asChild size="sm" variant="outline" className="flex-1 border-emerald-500/50 text-emerald-300">
                  <Link href="/carte-vip">
                    <Sparkles className="h-4 w-4 mr-1" />
                    Carte VIP
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Coins Section */}
      {coins !== undefined && (
        <Card className="bg-gradient-to-br from-yellow-500/20 to-orange-500/20 border-yellow-500/30">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-yellow-500/30 flex items-center justify-center">
                  <Coins className="h-6 w-6 text-yellow-400" />
                </div>
                <div>
                  <p className="text-2xl font-black text-white">{coins.toLocaleString()}</p>
                  <p className="text-sm text-yellow-300">Coins Boutique</p>
                </div>
              </div>
              <Button asChild className="bg-yellow-500 hover:bg-yellow-600 text-black">
                <Link href="/gamification/boutique">
                  <ShoppingBag className="h-4 w-4 mr-2" />
                  Boutique
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Link>
              </Button>
            </div>
            <p className="mt-3 text-xs text-yellow-300/70">
              Les coins s'obtiennent en montant de niveau, en complétant des achievements, et lors d'événements spéciaux.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
