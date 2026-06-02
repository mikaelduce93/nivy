"use client"

import { Crown, Zap, Star, Lock, Check, Gift, Sparkles, Shield, Users, Calendar, Percent } from "lucide-react"
import { cn } from "@/lib/utils"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { StickerCard } from "@/components/ui/sticker-card"
import { SegmentedProgress } from "@/components/ui/progress"
import { Niv, DarkSurface } from "@/components/brand"
import {
  VIP_TIER_CONFIG,
  TIER_XP_REQUIREMENTS,
  VipTierSlugEnum,
  type VipTierSlug,
} from "@/gamification-system/features/vip-system/schema"

// #66 — per-slug benefit copy (UI only). Tier order, FR names and XP thresholds
// are DERIVED from the canonical VIP config (single source of truth).
const TIER_BENEFITS: Record<VipTierSlug, { icon: typeof Star; text: string }[]> = {
  standard: [
    { icon: Star, text: "Accès de base" },
    { icon: Gift, text: "Récompenses standard" },
  ],
  bronze: [
    { icon: Percent, text: "5% bonus XP" },
    { icon: Gift, text: "Accès aux récompenses basiques" },
    { icon: Star, text: "Badge Bronze" },
  ],
  silver: [
    { icon: Percent, text: "10% bonus XP" },
    { icon: Calendar, text: "Accès prioritaire aux events" },
    { icon: Gift, text: "Récompenses exclusives" },
    { icon: Star, text: "Badge Argent" },
  ],
  gold: [
    { icon: Percent, text: "20% bonus XP" },
    { icon: Calendar, text: "Events VIP exclusifs" },
    { icon: Gift, text: "Récompenses premium" },
    { icon: Sparkles, text: "Spins bonus quotidiens" },
    { icon: Star, text: "Badge Or" },
  ],
  platinum: [
    { icon: Percent, text: "30% bonus XP" },
    { icon: Shield, text: "Tous les avantages Or" },
    { icon: Gift, text: "Prix réels exclusifs" },
    { icon: Users, text: "Coach personnel" },
    { icon: Crown, text: "Badge Platine" },
  ],
  diamond: [
    { icon: Percent, text: "40% bonus XP" },
    { icon: Shield, text: "Tous les avantages Platine" },
    { icon: Sparkles, text: "Événements ultra-exclusifs" },
    { icon: Crown, text: "Badge Diamant" },
  ],
  legendary: [
    { icon: Percent, text: "50% bonus XP" },
    { icon: Crown, text: "Statut légendaire" },
    { icon: Gift, text: "Récompenses uniques" },
    { icon: Star, text: "Badge Légendaire" },
  ],
}

const VIP_TIERS = VipTierSlugEnum.options.map((slug) => {
  const cfg = VIP_TIER_CONFIG[slug]
  return {
    id: slug,
    name: cfg.name,
    xpRequired: TIER_XP_REQUIREMENTS[slug],
    benefits: TIER_BENEFITS[slug],
  }
})

interface VipCardClientProps {
  userXP: number
  tierSlug: string
  memberSince: string | null
}

export function VipCardClient({ userXP, tierSlug, memberSince }: VipCardClientProps) {
  const currentTier = VIP_TIERS.find((t) => t.id === tierSlug) || VIP_TIERS[0]
  const nextTier = VIP_TIERS.find((t) => t.xpRequired > userXP) ?? VIP_TIERS[VIP_TIERS.length - 1]
  const progressToNext = nextTier.xpRequired > 0 ? Math.min(100, (userXP / nextTier.xpRequired) * 100) : 100

  return (
    <div className="min-h-screen space-y-8 pb-32 pt-6">
      {/* Header */}
      <header className="flex items-center gap-4">
        <Niv mood="proud" size={72} />
        <div>
          <p className="eyebrow tracking-[0.16em]">Carte VIP</p>
          <h1 className="font-display text-4xl font-extrabold tracking-tight">
            Carte <em className="font-semibold italic text-pink">VIP</em>
          </h1>
          <p className="text-sm text-mute">Ton statut et tes avantages.</p>
        </div>
      </header>

      {/* Current VIP card — surface sombre ponctuelle */}
      <DarkSurface tone="gold" shadow className="p-8">
        <div className="flex items-start justify-between">
          <div>
            <p className="eyebrow tracking-[0.16em] text-paper/60">Membre VIP Nivy</p>
            <h2 className="mt-1 break-words font-display text-3xl font-extrabold uppercase text-gold sm:text-5xl">{currentTier.name}</h2>
            <p className="mt-2 text-sm text-paper/60">
              {memberSince ? `Membre depuis ${new Date(memberSince).toLocaleDateString("fr-FR", { month: "long", year: "numeric" })}` : "Teen Nivy"}
            </p>
          </div>
          <span className="grid size-20 place-items-center rounded-2xl border-2 border-paper/30">
            <Crown className="size-10 text-gold" aria-hidden="true" />
          </span>
        </div>

        {/* Card number (masqué — pas de faux numéro) */}
        <p className="mt-8 font-mono text-2xl tracking-widest text-paper/70">•••• •••• •••• ••••</p>

        <div className="mt-8 flex items-end justify-between">
          <div>
            <p className="eyebrow tracking-[0.16em] text-paper/60">Total XP</p>
            <p className="flex items-baseline gap-2 font-display text-3xl font-extrabold tabular-nums text-gold">
              {userXP.toLocaleString("fr-FR")}
              <Zap className="size-5" aria-hidden="true" />
            </p>
          </div>
          <div className="text-right">
            <p className="eyebrow tracking-[0.16em] text-paper/60">Prochain niveau</p>
            <p className="font-display text-lg font-bold text-paper">{nextTier.name}</p>
          </div>
        </div>

        <div className="mt-6">
          <div className="mb-2 flex items-center justify-between font-mono text-sm text-paper/80">
            <span>{userXP} / {nextTier.xpRequired} XP</span>
            <span className="font-bold text-gold">{Math.round(progressToNext)}%</span>
          </div>
          <SegmentedProgress steps={10} current={Math.floor(progressToNext / 10)} size="md" />
          <p className="mt-2 font-mono text-xs text-paper/60">
            {Math.max(0, nextTier.xpRequired - userXP)} XP pour atteindre {nextTier.name}
          </p>
        </div>
      </DarkSurface>

      {/* Current benefits */}
      <section className="space-y-4">
        <p className="eyebrow tracking-[0.16em]">Tes avantages actifs</p>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {currentTier.benefits.map((benefit, idx) => {
            const Icon = benefit.icon
            return (
              <StickerCard key={idx} className="p-4">
                <div className="flex items-center gap-4">
                  <span className="grid size-10 shrink-0 place-items-center rounded-xl border-2 border-ink bg-lime">
                    <Icon className="size-5 text-ink" aria-hidden="true" />
                  </span>
                  <h4 className="flex-1 font-bold text-ink">{benefit.text}</h4>
                  <Check className="size-5 text-lime" aria-hidden="true" />
                </div>
              </StickerCard>
            )
          })}
        </div>
      </section>

      {/* All tiers */}
      <section className="space-y-4">
        <p className="eyebrow tracking-[0.16em]">Niveaux VIP</p>
        <div className="space-y-4">
          {VIP_TIERS.map((tier) => {
            const isUnlocked = userXP >= tier.xpRequired
            const isCurrent = tier.id === currentTier.id
            return (
              <StickerCard
                key={tier.id}
                style={isCurrent ? { background: "var(--ink)", color: "var(--paper)", boxShadow: "6px 6px 0 var(--pink)" } : undefined}
                className={cn("gap-4 p-6", !isUnlocked && !isCurrent && "opacity-60")}
              >
                <div className="flex items-center gap-4">
                  <span className={cn("grid size-16 shrink-0 place-items-center rounded-2xl border-2 border-ink", isCurrent ? "bg-pink" : "bg-paper-2")}>
                    <Crown className="size-8 text-ink" aria-hidden="true" />
                  </span>
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <h4 className="font-display text-xl font-extrabold">{tier.name}</h4>
                      {isCurrent && (
                        <span className="rounded-full border-2 border-paper bg-lime px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-[0.1em] text-ink">Actuel</span>
                      )}
                      {!isUnlocked && <Lock className="size-4 text-mute" aria-hidden="true" />}
                    </div>
                    <p className={cn("font-mono text-sm", isCurrent ? "text-paper/70" : "text-mute")}>
                      {tier.xpRequired === 0 ? "Niveau de départ" : `${tier.xpRequired.toLocaleString("fr-FR")} XP requis`}
                    </p>
                  </div>
                  <span className={cn("rounded-full border-2 px-3 py-1 font-mono text-[11px] font-bold uppercase tracking-[0.1em]", isCurrent ? "border-paper text-paper" : isUnlocked ? "border-ink text-ink" : "border-line text-mute")}>
                    {isCurrent ? "Actif" : isUnlocked ? "Débloqué" : "Verrouillé"}
                  </span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {tier.benefits.map((benefit, i) => {
                    const Icon = benefit.icon
                    return (
                      <span key={i} className={cn("flex items-center gap-1.5 rounded-full border-2 px-3 py-1 font-mono text-xs", isCurrent ? "border-paper/30 text-paper/80" : "border-line text-mute")}>
                        <Icon className="size-3" aria-hidden="true" />
                        {benefit.text}
                      </span>
                    )
                  })}
                </div>
              </StickerCard>
            )
          })}
        </div>
      </section>

      {/* Upgrade CTA */}
      <DarkSurface tone="pink" shadow className="p-6">
        <div className="flex flex-col items-center gap-6 text-center sm:flex-row sm:text-left">
          <Niv mood="hype" size={72} className="shrink-0" />
          <div className="flex-1">
            <h3 className="font-display text-lg font-extrabold text-paper">Monte de niveau !</h3>
            <p className="text-sm text-paper/70">Gagne plus d'XP pour débloquer des avantages exclusifs.</p>
          </div>
          <Button asChild variant="pink">
            <Link href="/teen/quests">Voir les quêtes</Link>
          </Button>
        </div>
      </DarkSurface>
    </div>
  )
}
