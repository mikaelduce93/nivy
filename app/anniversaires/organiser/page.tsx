'use client'

import { useState } from 'react'
import { Users, Send, Star, Sparkles, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { StickerCard } from '@/components/ui/sticker-card'
import { FieldInput } from '@/components/ui/field-input'
import { Niv, NivCelebration } from '@/components/brand'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import { submitBirthdayRequest } from './actions'
import { cn } from '@/lib/utils'

const PACKS = [
  {
    id: 'starter',
    label: "Petit comité",
    guests: 10,
    price: 3500,
    icon: Users,
    tag: "Le plus choisi"
  },
  {
    id: 'plus',
    label: "La grosse teuf",
    guests: 20,
    price: 5500,
    icon: Star,
    tag: "Hype"
  },
  {
    id: 'vip-premium',
    label: "Soirée légendaire",
    guests: 50,
    price: 12000,
    icon: Sparkles,
    tag: "De ouf"
  }
]

export default function OrganizeBirthdayPage() {
  const [step, setStep] = useState(1)
  const [selectedPack, setSelectedPack] = useState(PACKS[0])
  const [date, setDate] = useState("")
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleSendToParent = async () => {
    if (!date) {
      toast.error("Choisis une date pour la fête !")
      return
    }
    setLoading(true)
    try {
      await submitBirthdayRequest({
        guestCount: selectedPack.guests,
        celebrationDate: date,
        packSlug: selectedPack.id,
        totalPrice: selectedPack.price
      })
      setStep(2)
      toast.success("Demande de budget envoyée à ton parent !")
    } catch (error: any) {
      toast.error(error.message || "Erreur lors de l'envoi")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-paper text-ink">
      <div className="mx-auto max-w-4xl px-6 py-20">
        {step === 1 ? (
          <div className="space-y-14">
            {/* Hero éditorial */}
            <div className="text-center">
              <Niv mood="hype" size={96} className="mx-auto" />
              <p className="eyebrow mt-6 tracking-[0.16em] text-pink">Organiser un anniv</p>
              <h1 className="mt-3 font-display text-4xl font-extrabold leading-tight tracking-tight sm:text-5xl">
                Organise ta soirée <em className="font-semibold italic text-pink">légendaire</em>
              </h1>
              <p className="mx-auto mt-4 max-w-xl text-lg text-mute">
                Choisis ta formule, ta date, et envoie la demande à ton parent. Il valide, on s'occupe du reste.
              </p>
            </div>

            {/* Pack Selection */}
            <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
              {PACKS.map((pack) => {
                const isActive = selectedPack.id === pack.id
                const Icon = pack.icon
                return (
                  <StickerCard
                    key={pack.id}
                    variant="hover"
                    onClick={() => setSelectedPack(pack)}
                    role="button"
                    tabIndex={0}
                    aria-pressed={isActive}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault()
                        setSelectedPack(pack)
                      }
                    }}
                    className={cn(
                      "justify-between gap-6 p-6",
                      isActive &&
                        "-translate-x-0.5 -translate-y-0.5 bg-ink text-paper shadow-stkr-pink",
                    )}
                  >
                    <div className="space-y-4">
                      <div className="flex items-start justify-between">
                        <span
                          className={cn(
                            "grid size-11 place-items-center rounded-xl border-2",
                            isActive ? "border-paper/40 text-paper" : "border-ink text-pink",
                          )}
                        >
                          <Icon className="size-6" aria-hidden="true" />
                        </span>
                        {pack.tag && (
                          <span
                            className={cn(
                              "rounded-full border-2 px-2.5 py-1 font-mono text-[10px] font-bold uppercase tracking-[0.14em]",
                              isActive ? "border-paper/40 text-paper" : "border-ink text-ink",
                            )}
                          >
                            {pack.tag}
                          </span>
                        )}
                      </div>
                      <h3 className="font-display text-xl font-extrabold leading-tight">{pack.label}</h3>
                      <p className={cn("font-mono text-xs font-bold uppercase tracking-[0.14em]", isActive ? "text-paper/60" : "text-mute")}>
                        {pack.guests} invités max
                      </p>
                    </div>

                    <div>
                      <p className="font-display text-3xl font-extrabold tabular-nums">{pack.price} DH</p>
                      <p className={cn("mt-0.5 font-mono text-[10px] font-bold uppercase tracking-[0.14em]", isActive ? "text-paper/60" : "text-mute")}>
                        Tout compris
                      </p>
                    </div>
                  </StickerCard>
                )
              })}
            </div>

            {/* Date & Trigger */}
            <div className="mx-auto max-w-md space-y-6">
              <FieldInput
                label="Choisis la date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />

              <Button
                variant="pink"
                size="xl"
                onClick={handleSendToParent}
                disabled={loading || !date}
                className="w-full"
              >
                {loading ? "Envoi en cours…" : "Envoyer à ton parent"}
                <Send className="ml-2 size-5" aria-hidden="true" />
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-8 py-6">
            <NivCelebration
              tone="lime"
              title="Demande envoyée"
              caption="Ton parent a reçu l'invit', il valide bientôt. Tu seras prévenu·e dès que c'est bon."
              palette="levelup"
            />
            <div className="flex justify-center">
              <Button variant="pink" size="lg" onClick={() => router.push('/teen')}>
                Retour au hub
                <ArrowRight className="ml-2 size-5" aria-hidden="true" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
