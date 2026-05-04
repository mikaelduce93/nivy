"use client"

import { useState, useEffect } from "react"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Crown, Check, Sparkles, Calendar, Percent, Clock, Users,
  TrendingUp, Star, Gift, Zap, ArrowRight, Loader2, Shield,
  CreditCard, Info
} from 'lucide-react'
import { toast } from "sonner"
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
    color: "from-yellow-500 to-orange-500",
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
    color: "from-purple-500 to-pink-500",
    icon: Crown,
    badge: "POPULAIRE",
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
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* Hero Section */}
      <section className="relative min-h-[40vh] flex items-center justify-center overflow-hidden pt-20">
        <div className="absolute inset-0 z-0">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-background to-background" />
        </div>

        <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center py-12">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-4 backdrop-blur-sm">
            <Crown className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium text-primary">Carte VIP</span>
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black mb-4 leading-tight">
            Rejoins le Club
            <br />
            <span className="text-gradient">VIP Teen Club</span>
          </h1>

          <p className="text-lg text-muted-foreground mb-6 max-w-2xl mx-auto">
            Profite d'avantages exclusifs, de réductions et d'événements réservés aux membres VIP
          </p>
        </div>
      </section>

      {/* Tier Selection */}
      <section className="py-12 border-b">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-6xl">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-black mb-2">Choisis ton Pass</h2>
            <p className="text-muted-foreground">Sélectionne le tier qui te correspond</p>
          </div>

          <div className="grid lg:grid-cols-2 gap-6 max-w-4xl mx-auto">
            {Object.entries(PASS_TIERS).map(([tier, config]) => {
              const Icon = config.icon
              const isSelected = selectedTier === tier

              return (
                <Card
                  key={tier}
                  className={`relative overflow-hidden cursor-pointer transition-all ${
                    isSelected ? 'ring-4 ring-primary shadow-2xl' : 'hover:border-primary/50'
                  }`}
                  onClick={() => setSelectedTier(tier as 'gold' | 'platinum')}
                >
                  {'badge' in config && config.badge && (
                    <div className="absolute top-4 right-4 px-3 py-1 rounded-full bg-primary text-primary-foreground text-xs font-bold">
                      {config.badge}
                    </div>
                  )}

                  <div className={`h-32 bg-gradient-to-br ${config.color} flex items-center justify-center relative`}>
                    <Icon className="w-16 h-16 text-white" />
                    {isSelected && (
                      <div className="absolute top-4 left-4 w-8 h-8 rounded-full bg-white flex items-center justify-center">
                        <Check className="w-5 h-5 text-primary" />
                      </div>
                    )}
                  </div>

                  <div className="p-6">
                    <h3 className="text-2xl font-black mb-2">{config.name}</h3>
                    <div className="flex items-baseline gap-2 mb-6">
                      <span className="text-4xl font-black">{config.price} DH</span>
                      <span className="text-muted-foreground">/mois</span>
                    </div>

                    <ul className="space-y-3">
                      {config.features.map((feature, idx) => (
                        <li key={idx} className="flex items-start gap-2 text-sm">
                          <Check className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </Card>
              )
            })}
          </div>
        </div>
      </section>

      {/* Savings Calculator */}
      <section className="py-12 bg-secondary/30">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-4xl">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-black mb-2">Calcule tes économies</h2>
            <p className="text-muted-foreground">Vois combien tu économises avec le Pass {tierConfig.name}</p>
          </div>

          <Card className="p-8">
            <div className="grid md:grid-cols-2 gap-8 mb-8">
              <div className="space-y-2">
                <Label>Combien d'events par mois ?</Label>
                <div className="flex items-center gap-4">
                  <Input
                    type="range"
                    min="0"
                    max="10"
                    value={eventsPerMonth}
                    onChange={(e) => setEventsPerMonth(parseInt(e.target.value))}
                    className="flex-1"
                  />
                  <span className="text-2xl font-black w-12 text-center">{eventsPerMonth}</span>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Combien de clubs par mois ?</Label>
                <div className="flex items-center gap-4">
                  <Input
                    type="range"
                    min="0"
                    max="10"
                    value={clubsPerMonth}
                    onChange={(e) => setClubsPerMonth(parseInt(e.target.value))}
                    className="flex-1"
                  />
                  <span className="text-2xl font-black w-12 text-center">{clubsPerMonth}</span>
                </div>
              </div>
            </div>

            {savings && (
              <div className="space-y-4">
                <div className="grid sm:grid-cols-3 gap-4">
                  <Card className="p-4 bg-primary/5 border-primary/20">
                    <p className="text-sm text-muted-foreground mb-1">Dépense mensuelle</p>
                    <p className="text-2xl font-black">{savings.monthlySpending} DH</p>
                  </Card>

                  <Card className="p-4 bg-primary/5 border-primary/20">
                    <p className="text-sm text-muted-foreground mb-1">Coût Pass/mois</p>
                    <p className="text-2xl font-black text-primary">{Math.round(savings.passPrice / 12)} DH</p>
                  </Card>

                  <Card className="p-4 bg-green-500/10 border-green-500/20">
                    <p className="text-sm text-muted-foreground mb-1">Économies/mois</p>
                    <p className="text-2xl font-black text-green-600">{Math.round(savings.monthlySavings)} DH</p>
                  </Card>
                </div>

                <div className="flex items-center gap-2 p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                  <Info className="w-5 h-5 text-blue-500 flex-shrink-0" />
                  <div className="text-sm">
                    {savings.breakEvenMonths > 0 ? (
                      <p>
                        Le Pass {tierConfig.name} devient rentable après <strong>{savings.breakEvenMonths} mois</strong>.
                        {savings.monthlySavings > 0 && (
                          <> Tu économises <strong>{Math.round(savings.monthlySavings)} DH/mois</strong> !</>
                        )}
                      </p>
                    ) : (
                      <p>Augmente le nombre d'events pour voir tes économies.</p>
                    )}
                  </div>
                </div>
              </div>
            )}
          </Card>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-12">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-2xl">
          <Card className="p-8">
            <div className="text-center mb-6">
              <div className={`w-20 h-20 rounded-full bg-gradient-to-br ${tierConfig.color} flex items-center justify-center mx-auto mb-4`}>
                <TierIcon className="w-10 h-10 text-white" />
              </div>
              <h3 className="text-2xl font-black mb-2">Pass {tierConfig.name}</h3>
              <p className="text-4xl font-black text-primary mb-1">{tierConfig.price} DH/mois</p>
              <p className="text-sm text-muted-foreground">Résiliable à tout moment</p>
            </div>

            <div className="space-y-4 mb-6">
              <div className="flex items-center gap-3 p-3 bg-secondary/50 rounded-lg">
                <Shield className="w-5 h-5 text-primary" />
                <span className="text-sm">Paiement sécurisé par Stripe</span>
              </div>
              <div className="flex items-center gap-3 p-3 bg-secondary/50 rounded-lg">
                <CreditCard className="w-5 h-5 text-primary" />
                <span className="text-sm">Renouvellement automatique mensuel</span>
              </div>
              <div className="flex items-center gap-3 p-3 bg-secondary/50 rounded-lg">
                <Zap className="w-5 h-5 text-primary" />
                <span className="text-sm">Activation immédiate après paiement</span>
              </div>
            </div>

            <Button
              className={`w-full bg-gradient-to-r ${tierConfig.color} hover:opacity-90 text-white`}
              size="lg"
              onClick={handleSubscribe}
              disabled={loading || (currentTier === selectedTier)}
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Redirection...
                </>
              ) : currentTier === selectedTier ? (
                <>
                  <Check className="w-5 h-5 mr-2" />
                  Tu as déjà ce Pass
                </>
              ) : (
                <>
                  Souscrire au Pass {tierConfig.name}
                  <ArrowRight className="w-5 h-5 ml-2" />
                </>
              )}
            </Button>

            <p className="text-xs text-center text-muted-foreground mt-4">
              En souscrivant, tu acceptes nos conditions générales et notre politique de remboursement.
            </p>
          </Card>
        </div>
      </section>

      <Footer />
    </div>
  )
}
