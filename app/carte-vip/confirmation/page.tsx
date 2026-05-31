"use client"

import { useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
import Link from "next/link"
import {
  Crown, Check, Star, Sparkles, Loader2,
  Calendar, Percent, Clock, Gift, ArrowRight, BadgeCheck
} from 'lucide-react'
import { toast } from "sonner"

import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { Button } from "@/components/ui/button"
import { StickerCard } from "@/components/ui/sticker-card"
import { Niv, NivCelebration, DarkSurface } from "@/components/brand"
import { Confetti } from "@/components/ui/effects/confetti"
import { confirmPassSubscription, getMyPass } from "@/features/pass"

export default function PassConfirmationPage() {
  const searchParams = useSearchParams()
  const sessionId = searchParams.get('session_id')

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [passData, setPassData] = useState<any>(null)
  const [celebrate, setCelebrate] = useState(false)

  useEffect(() => {
    async function confirmSubscription() {
      if (!sessionId) {
        const passResult = await getMyPass()
        if (passResult.success && passResult.data) {
          setPassData(passResult.data)
          setCelebrate(true)
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
          setCelebrate(true)
          toast.success("Pass VIP activé avec succès!")
        } else if (!result.success) {
          const passResult = await getMyPass()
          if (passResult.success && passResult.data) {
            setPassData(passResult.data)
            setCelebrate(true)
          } else {
            setError((result as { error?: string }).error || "Erreur lors de l'activation")
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

  const getTierConfig = (tier: string) => {
    switch (tier) {
      case "platinum":
        return { name: "Platinum", icon: Crown, tone: "pink" as const }
      case "gold":
        return { name: "Gold", icon: Star, tone: "gold" as const }
      default:
        // Ne plus étiqueter par défaut un palier standard comme « Gold ».
        return { name: "Standard", icon: Star, tone: "teal" as const }
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-paper">
        <div className="text-center">
          <Loader2 className="mx-auto mb-4 size-12 animate-spin text-ink" aria-hidden="true" />
          <p className="text-mute">Activation de ton Pass VIP…</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-paper">
        <Navbar />
        <div className="container mx-auto px-4 py-28 text-center">
          <div className="mx-auto max-w-md">
            <Niv mood="calm" size={96} className="mx-auto" />
            <h1 className="mt-4 font-display text-3xl font-extrabold">Oups !</h1>
            <p className="mt-2 mb-8 text-mute">{error}</p>
            <Button asChild variant="pink">
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
    <div className="min-h-screen bg-paper">
      <Navbar />
      <Confetti trigger={celebrate} palette="levelup" />

      <section className="py-24">
        <div className="container mx-auto max-w-3xl space-y-8 px-4">
          {/* Success header */}
          <NivCelebration
            tone={tierConfig.tone}
            title={`Bienvenue au club VIP ${tierConfig.name}`}
            caption="Ton Pass est maintenant actif. Profite de tous tes avantages !"
            trigger={false}
          />

          {/* VIP Card — surface sombre ponctuelle */}
          <DarkSurface tone={tierConfig.tone} shadow className="p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="eyebrow tracking-[0.16em] text-paper/60">Carte VIP</p>
                <p className="mt-1 font-display text-2xl font-extrabold tabular-nums text-paper">{passData.card_number}</p>
              </div>
              <span className="grid size-12 place-items-center rounded-xl border-2 border-paper/30">
                <TierIcon className="size-7 text-paper" aria-hidden="true" />
              </span>
            </div>
            <div className="mt-6 grid grid-cols-2 gap-4">
              <div>
                <p className="eyebrow tracking-[0.16em] text-paper/60">Type</p>
                <p className="font-display text-lg font-bold text-paper">Pass {tierConfig.name}</p>
              </div>
              <div>
                <p className="eyebrow tracking-[0.16em] text-paper/60">Expire le</p>
                <p className="font-mono text-lg font-bold text-paper">
                  {new Date(passData.expiry_date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
                </p>
              </div>
            </div>
          </DarkSurface>

          {/* Benefits */}
          <StickerCard className="gap-4 p-6">
            <h3 className="flex items-center gap-2 font-display text-lg font-extrabold">
              <Sparkles className="size-5 text-pink" aria-hidden="true" />
              Tes avantages
            </h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <Benefit icon={Percent} title={`${passData.discount_percentage}% de réduction`}>Sur tous les events</Benefit>
              <Benefit icon={Calendar} title={`${passData.monthly_events_included} events inclus`}>Chaque mois</Benefit>
              <Benefit icon={Clock} title={`${passData.priority_booking_hours}h d'avance`}>Réservation prioritaire</Benefit>
              <Benefit icon={BadgeCheck} title={`Badge ${tierConfig.name}`}>Sur ton profil</Benefit>
            </div>
          </StickerCard>

          {/* Next steps */}
          <StickerCard className="gap-4 p-6">
            <h3 className="flex items-center gap-2 font-display text-lg font-extrabold">
              <Gift className="size-5 text-pink" aria-hidden="true" />
              Prochaines étapes
            </h3>
            <ul className="space-y-3">
              <Step n={1} title="Consulte les events disponibles">Profite de ta réduction sur tous les events.</Step>
              <Step n={2} title="Active les notifications">Sois averti(e) des nouveaux events en priorité.</Step>
              <Step n={3} title="Invite tes amis">Partage ton code parrain et gagne des bonus.</Step>
            </ul>
          </StickerCard>

          {/* CTA */}
          <div className="flex flex-col gap-4 sm:flex-row">
            <Button asChild variant="pink" className="flex-1">
              <Link href="/agenda">Voir les événements<ArrowRight className="ml-2 size-4" aria-hidden="true" /></Link>
            </Button>
            <Button asChild variant="outline" className="flex-1">
              <Link href="/auth/redirect">Mon profil</Link>
            </Button>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  )
}

function Benefit({ icon: Icon, title, children }: { icon: typeof Percent; title: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3 rounded-xl border-2 border-line bg-paper-2 p-4">
      <Icon className="mt-0.5 size-5 shrink-0 text-pink" aria-hidden="true" />
      <div>
        <p className="font-display font-bold">{title}</p>
        <p className="text-sm text-mute">{children}</p>
      </div>
    </div>
  )
}

function Step({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-3">
      <span className="grid size-6 shrink-0 place-items-center rounded-full border-2 border-ink bg-ink font-mono text-sm font-bold text-paper">{n}</span>
      <div>
        <p className="font-medium text-ink">{title}</p>
        <p className="text-sm text-mute">{children}</p>
      </div>
    </li>
  )
}
