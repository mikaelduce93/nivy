"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"

import { Button } from "@/components/ui/button"
import { StickerCard } from "@/components/ui/sticker-card"
import { NivCelebration } from "@/components/brand"

interface OnboardingCompleteClientProps {
  redirectTo: string
  /** Fallback auto-redirect delay in ms (le CTA explicite reste le chemin principal). */
  autoRedirectMs?: number
  /** XP de départ réel (profiles.total_xp). */
  xp?: number | null
  /** Solde coins réel (user_coins.balance). */
  coins?: number | null
}

export function OnboardingCompleteClient({
  redirectTo,
  autoRedirectMs = 5000,
  xp,
  coins,
}: OnboardingCompleteClientProps) {
  const router = useRouter()

  // Fallback temporisé : si l'utilisateur ne clique pas, on l'envoie quand même
  // sur son espace (~5s, au lieu du redirect silencieux 2.5s précédent).
  useEffect(() => {
    const t = setTimeout(() => router.push(redirectTo), autoRedirectMs)
    return () => clearTimeout(t)
  }, [router, redirectTo, autoRedirectMs])

  return (
    <div className="w-full max-w-lg space-y-4">
      <NivCelebration
        tone="gold"
        title="Profil complet"
        caption="Ton espace est personnalisé. Quand tu veux, on y va."
        action={
          <Button size="lg" variant="pink" onClick={() => router.push(redirectTo)}>
            Aller à mon espace →
          </Button>
        }
      />

      {xp != null || coins != null ? (
        <StickerCard className="flex items-center justify-around gap-4 p-5">
          {xp != null ? (
            <div className="text-center">
              <p className="eyebrow tracking-[0.16em]">XP</p>
              <p className="mt-1 font-display text-3xl font-extrabold tabular-nums text-gold">
                {xp.toLocaleString("fr-FR")}
              </p>
            </div>
          ) : null}
          {coins != null ? (
            <div className="text-center">
              <p className="eyebrow tracking-[0.16em]">Coins</p>
              <p className="mt-1 font-display text-3xl font-extrabold tabular-nums text-coral">
                ⊙ {coins.toLocaleString("fr-FR")}
              </p>
            </div>
          ) : null}
        </StickerCard>
      ) : null}
    </div>
  )
}
