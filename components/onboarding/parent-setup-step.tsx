"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { StickerCard } from "@/components/ui/sticker-card"
import { Niv, DarkSurface } from "@/components/brand"
import {
  ArrowRight,
  Shield,
  ChevronLeft,
  ChevronRight,
  Loader2,
  CheckCircle2,
  Sparkles,
} from "lucide-react"

/**
 * Wave 1A.5 — AUTH-005 closure.
 *
 * Pre-account marketing wizard step. MUST NOT call `supabase.auth.signUp` or
 * insert into any user table. Canon `auth-onboarding.locked.md` §1 + §6
 * FORBIDDEN #3: signup happens exclusively at `/auth/sign-up`. The wizard's
 * "Continue" CTA hands off to the canonical signup with `?source=wizard` and
 * (when present) the wizard's `tempUserId` so pre-account XP can sync after
 * `handle_new_user` lands the profile.
 *
 * Local state (form fields prior to this rewrite) is no longer collected here:
 * the canonical `/auth/sign-up` form already collects prenom/nom/email/phone/
 * password and is the single source of truth for parent identity.
 */

interface ParentSetupStepProps {
  onNext: () => void
  onBack: () => void
}

const SIGN_UP_PATH = "/auth/sign-up"

function buildSignUpHref(tempUserId: string | null): string {
  const params = new URLSearchParams()
  params.set("source", "wizard")
  if (tempUserId) params.set("tempUserId", tempUserId)
  return `${SIGN_UP_PATH}?${params.toString()}`
}

function readTempUserIdFromStorage(): string | null {
  if (typeof window === "undefined") return null
  try {
    const raw = window.localStorage.getItem("nivy:onboarding:gamification")
    if (!raw) return null
    const parsed = JSON.parse(raw) as { tempUserId?: string }
    return parsed?.tempUserId ?? null
  } catch {
    return null
  }
}

export function ParentSetupStep({ onNext: _onNext, onBack }: ParentSetupStepProps) {
  // _onNext is intentionally unused: this step no longer creates an account
  // in-place. The canonical signup happens at `/auth/sign-up` and the wizard's
  // continuation is a hard navigation, not a step transition.
  void _onNext

  const router = useRouter()
  const [tempUserId, setTempUserId] = useState<string | null>(null)
  const [navigating, setNavigating] = useState(false)

  useEffect(() => {
    setTempUserId(readTempUserIdFromStorage())
  }, [])

  const handleContinue = () => {
    setNavigating(true)
    const href = buildSignUpHref(tempUserId)
    router.push(href)
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center">
        <div className="flex justify-center mb-4">
          <Niv mood="proud" size={96} float />
        </div>
        <p className="eyebrow tracking-[0.18em] text-mute mb-3">Compte parent</p>
        <h2 className="text-3xl sm:text-4xl font-display font-extrabold mb-3 text-balance text-ink">
          Prêt à créer votre compte parent ?
        </h2>
        <p className="text-mute max-w-2xl mx-auto text-balance">
          Vous allez maintenant rejoindre la page d&apos;inscription officielle.
          Tout ce que vous avez débloqué pendant ce parcours sera conservé sur
          votre compte.
        </p>
      </div>

      {/* Hand-off card */}
      <div className="max-w-2xl mx-auto space-y-4">
        <StickerCard className="p-5">
          <div className="flex items-start gap-3">
            <span
              className="grid size-10 shrink-0 place-items-center rounded-xl border-2 border-ink bg-paper"
              aria-hidden="true"
            >
              <Sparkles className="w-5 h-5 text-gold" />
            </span>
            <div className="text-sm">
              <p className="font-display font-bold mb-1 text-ink">XP &amp; badges sécurisés</p>
              <p className="text-xs text-mute">
                Votre progression est mémorisée localement. À l&apos;inscription,
                elle sera fusionnée automatiquement avec votre compte.
              </p>
            </div>
          </div>
        </StickerCard>

        {/* Poids « sécurité / confidentialité » → surface sombre ponctuelle */}
        <DarkSurface tone="teal" shadow className="p-5">
          <div className="flex items-start gap-3">
            <span
              className="grid size-10 shrink-0 place-items-center rounded-xl border-2 border-paper/30"
              aria-hidden="true"
            >
              <Shield className="w-5 h-5 text-teal" />
            </span>
            <div className="text-sm">
              <p className="font-display font-bold mb-1 text-paper">Sécurité et confidentialité</p>
              <p className="text-xs text-paper/70">
                Vos données sont protégées. Vous saisirez votre email, votre
                téléphone et votre mot de passe sur la page d&apos;inscription
                officielle, puis vous recevrez un email de vérification.
              </p>
            </div>
          </div>
        </DarkSurface>
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between gap-4">
        <Button
          variant="outline"
          onClick={onBack}
          disabled={navigating}
          className="gap-2"
        >
          <ChevronLeft className="w-4 h-4" aria-hidden="true" />
          Retour
        </Button>

        <Button
          variant="pink"
          onClick={handleContinue}
          disabled={navigating}
          aria-busy={navigating}
          data-testid="parent-setup-continue"
          data-href={buildSignUpHref(tempUserId)}
          className="gap-2"
        >
          {navigating ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
              <span aria-live="polite">Redirection…</span>
            </>
          ) : (
            <>
              Créer mon compte
              <ChevronRight className="w-4 h-4" aria-hidden="true" />
            </>
          )}
          <ArrowRight className="sr-only" aria-hidden="true" />
          <CheckCircle2 className="sr-only" aria-hidden="true" />
        </Button>
      </div>
    </div>
  )
}
