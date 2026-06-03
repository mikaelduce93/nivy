"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import {
  Crown, Check, Star, ArrowRight, Loader2, Shield,
  CreditCard, Info, Zap
} from 'lucide-react'
import { toast } from "sonner"

import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { StickerCard } from "@/components/ui/sticker-card"
import { Niv, DarkSurface } from "@/components/brand"
import { MeshBackground } from "@/components/ui/effects/mesh-background"
import { cn } from "@/lib/utils"
import {
  subscribeToPass,
  calculatePassSavings,
  getUserPassTier,
  type VIPTier
} from "@/features/pass"

const PASS_TIERS = {
  gold: {
    name: "Gold",
    price: 299,
    accent: "bg-gold",
    icon: Star,
    features: [
      "20% de réduction sur tous les events",
      "2 events inclus par mois",
      "Réservation prioritaire 48h avant",
      "Badge Gold sur ton profil",
      "Support prioritaire",
    ]
  },
  platinum: {
    name: "Platinum",
    price: 599,
    accent: "bg-pink",
    icon: Crown,
    badge: "Populaire",
    features: [
      "30% de réduction sur tous les events",
      "4 events inclus par mois",
      "Réservation prioritaire 72h avant",
      "Badge Platinum exclusif",
      "Support VIP dédié",
      "Accès aux events exclusifs",
      "Cadeaux surprises",
    ]
  }
}

export default function SouscrirePassPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [selectedTier, setSelectedTier] = useState<'gold' | 'platinum'>('platinum')
  const [currentTier, setCurrentTier] = useState<VIPTier | null>(null)

  // Calculator inputs
  const [eventsPerMonth, setEventsPerMonth] = useState(2)
  const [clubsPerMonth, setClubsPerMonth] = useState(0)
  const [savings, setSavings] = useState<any>(null)

  // Check current Pass status
  useEffect(() => {
    async function checkCurrentPass() {
      const result = await getUserPassTier()
      if (result.success && result.data?.tier) {
        setCurrentTier(result.data.tier)
        if (result.data.tier === 'gold' || result.data.tier === 'platinum') {
          toast("Tu as déjà un Pass actif", {
            description: `Tier actuel: ${result.data.tier}`
          })
        }
      }
    }

    checkCurrentPass()
  }, [])

  // Calculate savings when inputs change
  useEffect(() => {
    async function calcSavings() {
      const result = await calculatePassSavings(selectedTier, eventsPerMonth, clubsPerMonth)
      setSavings(result)
    }

    if (eventsPerMonth >= 0 && clubsPerMonth >= 0) {
      calcSavings()
    }
  }, [selectedTier, eventsPerMonth, clubsPerMonth])

  const handleSubscribe = async () => {
    setLoading(true)

    try {
      const result = await subscribeToPass({
        tier: selectedTier,
        duration_months: 1, // 1 month subscription
      } as { tier: 'gold' | 'platinum'; duration_months: number })

      if (result.success && result.data?.url) {
        // Redirect to Stripe
        window.location.href = result.data.url
      } else if (result.success === false) {
        toast.error(result.error)
        setLoading(false)
      } else {
        toast.error("URL de paiement non disponible")
        setLoading(false)
      }
    } catch (error: any) {
      console.error('Error subscribing:', error)
      toast.error("Erreur lors de la souscription")
      setLoading(false)
    }
  }

  const tierConfig = PASS_TIERS[selectedTier]
  const TierIcon = tierConfig.icon

  return (
    <div className="min-h-screen bg-paper">
      <Navbar />

      {/* Hero */}
      <section className="relative overflow-hidden pt-24">
        <MeshBackground />
        <div className="relative z-10 container mx-auto px-4 py-10 text-center sm:px-6 lg:px-8">
          <Niv mood="hype" size={100} float className="mx-auto" />
          <p className="mt-4 eyebrow tracking-[0.16em]">Carte VIP</p>
          <h1 className="mt-2 font-display text-4xl font-extrabold leading-[1.04] tracking-tight sm:text-5xl lg:text-6xl">
            Le club <em className="font-semibold italic text-pink">VIP</em>
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-ink-2">
            Avantages exclusifs, réductions et événements réservés aux membres VIP.
          </p>
        </div>
      </section>

      {/* Tier Selection */}
      <section className="border-b-2 border-ink py-12">
        <div className="container mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="mb-8 text-center">
            <h2 className="font-display text-3xl font-extrabold tracking-tight">Choisis ton Pass</h2>
            <p className="mt-1 text-mute">Sélectionne le tier qui te correspond.</p>
          </div>

          <div className="mx-auto grid max-w-4xl gap-6 lg:grid-cols-2">
            {(Object.entries(PASS_TIERS) as [string, typeof PASS_TIERS.gold & { badge?: string }][]).map(([tier, config]) => {
              const Icon = config.icon
              const isSelected = selectedTier === tier

              return (
                <StickerCard
                  key={tier}
                  variant="hover"
                  onClick={() => setSelectedTier(tier as 'gold' | 'platinum')}
                  style={isSelected ? { background: "var(--ink)", color: "var(--paper)", boxShadow: "6px 6px 0 var(--pink)" } : undefined}
                  className={cn("relative cursor-pointer overflow-hidden", isSelected && "-translate-x-0.5 -translate-y-0.5")}
                >
                  {config.badge && (
                    <span className="absolute right-4 top-4 z-10 rounded-full border-2 border-ink bg-pink px-3 py-0.5 font-mono text-[10px] font-bold uppercase tracking-[0.12em] text-ink">
                      {config.badge}
                    </span>
                  )}

                  <div className="flex items-center gap-4 p-6">
                    <span className={cn("grid size-16 shrink-0 place-items-center rounded-2xl border-2 border-ink", config.accent)}>
                      <Icon className="size-8 text-ink" aria-hidden="true" />
                    </span>
                    {isSelected && (
                      <span className="grid size-8 place-items-center rounded-full border-2 border-paper bg-lime">
                        <Check className="size-5 text-ink" strokeWidth={3} aria-hidden="true" />
                      </span>
                    )}
                  </div>

                  <div className="px-6 pb-6">
                    <h3 className="font-display text-2xl font-extrabold">{config.name}</h3>
                    <div className="mb-6 mt-1 flex items-baseline gap-2">
                      <span className="font-display text-4xl font-extrabold tabular-nums">{config.price} DH</span>
                      <span className={isSelected ? "font-mono text-sm text-paper/60" : "font-mono text-sm text-mute"}>/mois</span>
                    </div>

                    <ul className="space-y-3">
                      {config.features.map((feature) => (
                        <li key={feature} className="flex items-start gap-2.5 text-sm">
                          <span className="mt-0.5 grid size-4 shrink-0 place-items-center rounded-full bg-lime">
                            <Check className="size-3 text-ink" strokeWidth={3} aria-hidden="true" />
                          </span>
                          <span className={isSelected ? "text-paper/90" : "text-ink-2"}>{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </StickerCard>
              )
            })}
          </div>
        </div>
      </section>

      {/* Savings Calculator */}
      <section className="bg-paper-2 py-12">
        <div className="container mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <div className="mb-8 text-center">
            <h2 className="font-display text-3xl font-extrabold tracking-tight">Calcule tes économies</h2>
            <p className="mt-1 text-mute">Vois combien tu économises avec le Pass {tierConfig.name}.</p>
          </div>

          <StickerCard className="p-8">
            <div className="mb-8 grid gap-8 md:grid-cols-2">
              <div className="space-y-2">
                <span className="eyebrow tracking-[0.16em]">Events par mois</span>
                <div className="flex items-center gap-4">
                  <Input type="range" min="0" max="10" value={eventsPerMonth} onChange={(e) => setEventsPerMonth(parseInt(e.target.value))} className="flex-1" />
                  <span className="w-12 text-center font-display text-2xl font-extrabold tabular-nums">{eventsPerMonth}</span>
                </div>
              </div>
              <div className="space-y-2">
                <span className="eyebrow tracking-[0.16em]">Clubs par mois</span>
                <div className="flex items-center gap-4">
                  <Input type="range" min="0" max="10" value={clubsPerMonth} onChange={(e) => setClubsPerMonth(parseInt(e.target.value))} className="flex-1" />
                  <span className="w-12 text-center font-display text-2xl font-extrabold tabular-nums">{clubsPerMonth}</span>
                </div>
              </div>
            </div>

            {savings && (
              <div className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-3">
                  <StickerCard className="gap-1 p-4">
                    <p className="eyebrow">Dépense mensuelle</p>
                    <p className="font-display text-2xl font-extrabold tabular-nums">{savings.monthlySpending} DH</p>
                  </StickerCard>
                  <StickerCard className="gap-1 p-4">
                    <p className="eyebrow">Coût Pass/mois</p>
                    <p className="font-display text-2xl font-extrabold tabular-nums text-pink">{Math.round(savings.passPrice / 12)} DH</p>
                  </StickerCard>
                  <StickerCard className="gap-1 border-lime p-4" style={{ background: "var(--success-soft)" }}>
                    <p className="eyebrow">Économies/mois</p>
                    <p className="font-display text-2xl font-extrabold tabular-nums text-lime">{Math.round(savings.monthlySavings)} DH</p>
                  </StickerCard>
                </div>

                <div className="flex items-center gap-2 rounded-xl border-2 border-teal bg-info-soft p-4">
                  <Info className="size-5 shrink-0 text-teal" aria-hidden="true" />
                  <div className="text-sm text-ink-2">
                    {savings.breakEvenMonths > 0 ? (
                      <p>
                        Le Pass {tierConfig.name} devient rentable après <strong>{savings.breakEvenMonths} mois</strong>.
                        {savings.monthlySavings > 0 && (<> Tu économises <strong>{Math.round(savings.monthlySavings)} DH/mois</strong> !</>)}
                      </p>
                    ) : (
                      <p>Augmente le nombre d'events pour voir tes économies.</p>
                    )}
                  </div>
                </div>
              </div>
            )}
          </StickerCard>
        </div>
      </section>

      {/* CTA */}
      <section className="py-12">
        <div className="container mx-auto max-w-2xl px-4 sm:px-6 lg:px-8 space-y-4">
          <DarkSurface tone={selectedTier === 'platinum' ? 'pink' : 'gold'} shadow className="p-8 text-center">
            <span className="mx-auto grid size-20 place-items-center rounded-full border-2 border-paper/30">
              <TierIcon className="size-10 text-paper" aria-hidden="true" />
            </span>
            <h3 className="mt-4 font-display text-2xl font-extrabold text-paper">Pass {tierConfig.name}</h3>
            <p className="mt-1 font-display text-4xl font-extrabold tabular-nums text-paper">{tierConfig.price} DH<span className="font-mono text-base font-medium text-paper/60">/mois</span></p>
            <p className="mt-1 font-mono text-xs text-paper/60">Résiliable à tout moment</p>
          </DarkSurface>

          <StickerCard className="gap-4 p-6">
            <div className="space-y-2 font-mono text-sm">
              <TrustRow icon={Shield}>Paiement sécurisé par Stripe</TrustRow>
              <TrustRow icon={CreditCard}>Renouvellement automatique mensuel</TrustRow>
              <TrustRow icon={Zap}>Activation immédiate après paiement</TrustRow>
            </div>

            <Button variant="pink" size="lg" className="w-full" onClick={handleSubscribe} disabled={loading || currentTier === selectedTier}>
              {loading ? (
                <><Loader2 className="mr-2 size-5 animate-spin" aria-hidden="true" />Redirection…</>
              ) : currentTier === selectedTier ? (
                <><Check className="mr-2 size-5" aria-hidden="true" />Tu as déjà ce Pass</>
              ) : (
                <>Souscrire au Pass {tierConfig.name}<ArrowRight className="ml-2 size-5" aria-hidden="true" /></>
              )}
            </Button>

            <p className="text-center text-xs text-mute">
              En souscrivant, tu acceptes nos conditions générales et notre politique de remboursement.
            </p>
          </StickerCard>
        </div>
      </section>

      <Footer />
    </div>
  )
}

function TrustRow({ icon: Icon, children }: { icon: typeof Shield; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border-2 border-line bg-paper-2 p-3">
      <Icon className="size-5 text-pink" aria-hidden="true" />
      <span className="text-ink-2">{children}</span>
    </div>
  )
}
