"use client"

import { useEffect, useState } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import Image from "next/image"
import Link from "next/link"
import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import {
  Crown, Check, Star, Sparkles, PartyPopper, Loader2,
  Calendar, Percent, Clock, Gift, ArrowRight, BadgeCheck
} from 'lucide-react'
import { toast } from "sonner"
import { confirmPassSubscription, getMyPass } from "@/features/pass"
import confetti from 'canvas-confetti'

export default function PassConfirmationPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const sessionId = searchParams.get('session_id')

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [passData, setPassData] = useState<any>(null)

  useEffect(() => {
    async function confirmSubscription() {
      if (!sessionId) {
        // No session ID, check if user already has a pass
        const passResult = await getMyPass()
        if (passResult.success && passResult.data) {
          setPassData(passResult.data)
          triggerConfetti()
        } else {
          setError("Session de paiement non trouvée")
        }
        setLoading(false)
        return
      }

      try {
        const result = await confirmPassSubscription(sessionId)

        if (result.success && result.data) {
          setPassData(result.data)
          triggerConfetti()
          toast.success("Pass VIP activé avec succès!")
        } else if (!result.success) {
          // Check if user already has a pass
          const passResult = await getMyPass()
          if (passResult.success && passResult.data) {
            setPassData(passResult.data)
            triggerConfetti()
          } else {
            setError((result as any).error || "Erreur lors de l'activation")
          }
        }
      } catch (err: any) {
        console.error("Error confirming subscription:", err)
        setError(err.message || "Erreur lors de l'activation")
      }

      setLoading(false)
    }

    confirmSubscription()
  }, [sessionId])

  const triggerConfetti = () => {
    // Multiple bursts of confetti
    const count = 200
    const defaults = {
      origin: { y: 0.7 }
    }

    function fire(particleRatio: number, opts: any) {
      confetti({
        ...defaults,
        ...opts,
        particleCount: Math.floor(count * particleRatio)
      })
    }

    fire(0.25, {
      spread: 26,
      startVelocity: 55,
    })
    fire(0.2, {
      spread: 60,
    })
    fire(0.35, {
      spread: 100,
      decay: 0.91,
      scalar: 0.8
    })
    fire(0.1, {
      spread: 120,
      startVelocity: 25,
      decay: 0.92,
      scalar: 1.2
    })
    fire(0.1, {
      spread: 120,
      startVelocity: 45,
    })
  }

  const getTierConfig = (tier: string) => {
    if (tier === 'platinum') {
      return {
        name: "Platinum",
        color: "from-purple-500 to-pink-500",
        icon: Crown,
        gradient: "bg-gradient-to-r from-purple-500 to-pink-500"
      }
    }
    return {
      name: "Gold",
      color: "from-yellow-500 to-orange-500",
      icon: Star,
      gradient: "bg-gradient-to-r from-yellow-500 to-orange-500"
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Activation de ton Pass VIP...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-4 py-32 text-center">
          <div className="max-w-md mx-auto">
            <div className="w-20 h-20 rounded-full bg-red-500/10 flex items-center justify-center mx-auto mb-6">
              <span className="text-4xl">😕</span>
            </div>
            <h1 className="text-3xl font-black mb-4">Oups!</h1>
            <p className="text-muted-foreground mb-8">{error}</p>
            <Button asChild>
              <Link href="/carte-vip/souscrire">Réessayer</Link>
            </Button>
          </div>
        </div>
        <Footer />
      </div>
    )
  }

  if (!passData) {
    return null
  }

  const tierConfig = getTierConfig(passData.card_type)
  const TierIcon = tierConfig.icon

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <section className="py-32">
        <div className="container mx-auto px-4 max-w-3xl">
          {/* Success Header */}
          <div className="text-center mb-12">
            <div className="relative inline-block mb-6">
              <div className={`w-32 h-32 rounded-full ${tierConfig.gradient} flex items-center justify-center shadow-2xl animate-pulse`}>
                <TierIcon className="w-16 h-16 text-white" />
              </div>
              <div className="absolute -bottom-2 -right-2 w-12 h-12 rounded-full bg-green-500 flex items-center justify-center border-4 border-background">
                <Check className="w-6 h-6 text-white" />
              </div>
            </div>

            <div className="flex items-center justify-center gap-2 mb-4">
              <PartyPopper className="w-6 h-6 text-primary" />
              <span className="text-primary font-bold">FÉLICITATIONS!</span>
              <PartyPopper className="w-6 h-6 text-primary" />
            </div>

            <h1 className="text-4xl sm:text-5xl font-black mb-4">
              Bienvenue au Club
              <br />
              <span className={`bg-clip-text text-transparent ${tierConfig.gradient}`}>
                VIP {tierConfig.name}!
              </span>
            </h1>

            <p className="text-lg text-muted-foreground">
              Ton Pass est maintenant actif. Profite de tous tes avantages!
            </p>
          </div>

          {/* VIP Card */}
          <Card className={`overflow-hidden mb-8 ${tierConfig.gradient} p-1`}>
            <div className="bg-background rounded-lg p-6">
              <div className="flex items-start justify-between mb-6">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">CARTE VIP</p>
                  <p className="text-2xl font-black">{passData.card_number}</p>
                </div>
                <div className={`p-3 rounded-xl ${tierConfig.gradient}`}>
                  <TierIcon className="w-8 h-8 text-white" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-6">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">TYPE</p>
                  <p className="font-bold text-lg">Pass {tierConfig.name}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">EXPIRE LE</p>
                  <p className="font-bold text-lg">
                    {new Date(passData.expiry_date).toLocaleDateString('fr-FR', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric'
                    })}
                  </p>
                </div>
              </div>

              <div className={`h-2 rounded-full ${tierConfig.gradient}`} />
            </div>
          </Card>

          {/* Benefits Summary */}
          <Card className="p-6 mb-8">
            <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary" />
              Tes avantages
            </h3>

            <div className="grid sm:grid-cols-2 gap-4">
              <div className="flex items-start gap-3 p-4 bg-secondary/50 rounded-lg">
                <Percent className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold">{passData.discount_percentage}% de réduction</p>
                  <p className="text-sm text-muted-foreground">Sur tous les events</p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-4 bg-secondary/50 rounded-lg">
                <Calendar className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold">{passData.monthly_events_included} events inclus</p>
                  <p className="text-sm text-muted-foreground">Chaque mois</p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-4 bg-secondary/50 rounded-lg">
                <Clock className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold">{passData.priority_booking_hours}h d'avance</p>
                  <p className="text-sm text-muted-foreground">Réservation prioritaire</p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-4 bg-secondary/50 rounded-lg">
                <BadgeCheck className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold">Badge {tierConfig.name}</p>
                  <p className="text-sm text-muted-foreground">Sur ton profil</p>
                </div>
              </div>
            </div>
          </Card>

          {/* Next Steps */}
          <Card className="p-6 bg-primary/5 border-primary/20 mb-8">
            <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
              <Gift className="w-5 h-5 text-primary" />
              Prochaines étapes
            </h3>

            <ul className="space-y-3">
              <li className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-bold text-sm">1</div>
                <div>
                  <p className="font-medium">Consulte les events disponibles</p>
                  <p className="text-sm text-muted-foreground">Profite de ta réduction sur tous les events</p>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-bold text-sm">2</div>
                <div>
                  <p className="font-medium">Active les notifications</p>
                  <p className="text-sm text-muted-foreground">Sois averti(e) des nouveaux events en priorité</p>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-bold text-sm">3</div>
                <div>
                  <p className="font-medium">Invite tes amis</p>
                  <p className="text-sm text-muted-foreground">Partage ton code parrain et gagne des bonus</p>
                </div>
              </li>
            </ul>
          </Card>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4">
            <Button asChild className={`flex-1 ${tierConfig.gradient} hover:opacity-90 text-white`}>
              <Link href="/evenements">
                Voir les événements
                <ArrowRight className="w-4 h-4 ml-2" />
              </Link>
            </Button>
            <Button asChild variant="outline" className="flex-1">
              <Link href="/profile">
                Mon profil
              </Link>
            </Button>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  )
}
