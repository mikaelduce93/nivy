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
  bronze: "from-coral to-coral",
  silver: "from-paper-2 to-card",
  gold: "from-gold to-gold",
  platinum: "from-pink to-pink",
  free: "from-paper-2 to-card",
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
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-pink/20 border border-pink/30">
                  <Zap className="h-4 w-4 text-pink" />
                  <span className="text-sm font-bold text-pink">{xp.total.toLocaleString()}</span>
                  <Badge variant="outline" className="text-xs px-1.5 py-0 border-pink/50 text-pink">
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
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-gold/20 border border-gold/30">
                  <Coins className="h-4 w-4 text-gold" />
                  <span className="text-sm font-bold text-gold">{coins.toLocaleString()}</span>
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
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-lime/20 border border-lime/30">
                  <Star className="h-4 w-4 text-lime" />
                  <span className="text-sm font-bold text-lime">{points.total.toLocaleString()}</span>
                  <Badge variant="outline" className="text-xs px-1.5 py-0 border-lime/50 text-lime">
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
        <Card className="bg-gradient-to-br from-teal/10 to-pink/10 border-teal/30">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <Info className="h-5 w-5 text-teal mt-0.5 flex-shrink-0" />
              <div>
                <h4 className="font-semibold text-ink mb-1">Comment ça marche ?</h4>
                <p className="text-sm text-ink-2">
                  Tu as <strong className="text-pink">2 types de récompenses</strong> chez Teens Party :
                </p>
                <ul className="mt-2 space-y-1 text-sm text-mute">
                  <li className="flex items-center gap-2">
                    <Zap className="h-3 w-3 text-pink" />
                    <span><strong className="text-pink">XP</strong> : Gagne en jouant, missions, défis → Monte de niveau</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Star className="h-3 w-3 text-lime" />
                    <span><strong className="text-lime">Points</strong> : Gagne en achetant → Réductions et cadeaux</span>
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
          <Card className="bg-gradient-to-br from-pink/20 to-pink/20 border-pink/30">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-pink">
                  <Zap className="h-5 w-5" />
                  XP Gamification
                </div>
                <Badge className="bg-pink/30 text-pink border-pink/50">
                  Niveau {xp.level}
                </Badge>
              </CardTitle>
              <CardDescription className="text-pink/70">
                Gagne de l'XP en jouant et complétant des défis
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-center">
                <p className="text-4xl font-black text-ink">{xp.total.toLocaleString()}</p>
                <p className="text-sm text-pink">XP Total</p>
              </div>

              {/* Level Progress */}
              <div className="space-y-2">
                <div className="flex justify-between text-xs text-pink">
                  <span>Niveau {xp.level}</span>
                  <span>Niveau {xp.level + 1}</span>
                </div>
                <Progress
                  value={((1000 - xp.toNextLevel) / 1000) * 100}
                  className="h-2 bg-pink"
                />
                <p className="text-xs text-center text-pink">
                  {xp.toNextLevel} XP restants
                </p>
              </div>

              {/* Streak */}
              {xp.streak !== undefined && (
                <div className="flex items-center justify-center gap-2 p-2 rounded-lg bg-pink/10">
                  <TrendingUp className="h-4 w-4 text-coral" />
                  <span className="text-sm text-ink">
                    Série de <strong className="text-coral">{xp.streak}</strong> jours
                  </span>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-2">
                <Button asChild size="sm" className="flex-1 bg-pink hover:bg-pink">
                  <Link href="/teen/quests">
                    <Target className="h-4 w-4 mr-1" />
                    Missions
                  </Link>
                </Button>
                <Button asChild size="sm" variant="outline" className="flex-1 border-pink/50 text-pink">
                  <Link href="/teen/leaderboard">
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
          <Card className="bg-gradient-to-br from-lime/20 to-teal/20 border-lime/30">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-lime">
                  <Star className="h-5 w-5" />
                  Points Fidélité
                </div>
                <Badge className={cn(
                  "border",
                  points.tier === "platinum" && "bg-pink/30 text-pink border-pink/50",
                  points.tier === "gold" && "bg-gold/30 text-gold border-gold/50",
                  points.tier === "silver" && "bg-muted text-ink-2 border-line",
                  points.tier === "bronze" && "bg-coral/30 text-coral border-coral/50"
                )}>
                  {TIER_LABELS[points.tier]}
                </Badge>
              </CardTitle>
              <CardDescription className="text-lime/70">
                Gagne des points à chaque achat
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-center">
                <p className="text-4xl font-black text-ink">{points.total.toLocaleString()}</p>
                <p className="text-sm text-lime">Points</p>
              </div>

              {/* Tier Progress */}
              <div className="space-y-2">
                <div className="flex justify-between text-xs text-lime">
                  <span>{TIER_LABELS[points.tier]}</span>
                  <span>{points.tier !== "platinum" ? "Tier suivant" : "Max"}</span>
                </div>
                <Progress
                  value={points.tier === "platinum" ? 100 : ((500 - points.toNextTier) / 500) * 100}
                  className="h-2 bg-lime"
                />
                {points.tier !== "platinum" && (
                  <p className="text-xs text-center text-lime">
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
                    <CreditCard className="h-4 w-4 text-ink" />
                    <span className="text-sm text-ink">Carte VIP {TIER_LABELS[vipCard.tier]}</span>
                  </div>
                  {vipCard.expiresAt && (
                    <span className="text-xs text-ink/70">
                      Expire: {new Date(vipCard.expiresAt).toLocaleDateString("fr-FR")}
                    </span>
                  )}
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-2">
                <Button asChild size="sm" className="flex-1 bg-lime hover:bg-lime">
                  <Link href="/carte-vip/recompenses">
                    <Gift className="h-4 w-4 mr-1" />
                    Récompenses
                  </Link>
                </Button>
                <Button asChild size="sm" variant="outline" className="flex-1 border-lime/50 text-lime">
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
        <Card className="bg-gradient-to-br from-gold/20 to-coral/20 border-gold/30">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-gold/30 flex items-center justify-center">
                  <Coins className="h-6 w-6 text-gold" />
                </div>
                <div>
                  <p className="text-2xl font-black text-ink">{coins.toLocaleString()}</p>
                  <p className="text-sm text-gold">Coins Boutique</p>
                </div>
              </div>
              <Button asChild className="bg-gold hover:bg-gold text-ink">
                <Link href="/teen/wallet?tab=shop">
                  <ShoppingBag className="h-4 w-4 mr-2" />
                  Boutique
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Link>
              </Button>
            </div>
            <p className="mt-3 text-xs text-gold/70">
              Les coins s'obtiennent en montant de niveau, en complétant des achievements, et lors d'événements spéciaux.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
