"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { motion, useReducedMotion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
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
  const prefersReducedMotion = useReducedMotion()
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
      <motion.div
        {...(prefersReducedMotion
          ? { initial: { opacity: 0 }, animate: { opacity: 1 } }
          : { initial: { opacity: 0, y: -20 }, animate: { opacity: 1, y: 0 } })}
        className="text-center"
      >
        <div
          className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-primary to-purple-500 mb-4"
          aria-hidden="true"
        >
          <Shield className="w-8 h-8 text-white" />
        </div>
        <h2 className="text-3xl sm:text-4xl font-black mb-3 text-balance">
          Prêt à créer votre compte parent ?
        </h2>
        <p className="text-muted-foreground max-w-2xl mx-auto text-balance">
          Vous allez maintenant rejoindre la page d&apos;inscription officielle.
          Tout ce que vous avez débloqué pendant ce parcours sera conservé sur
          votre compte.
        </p>
      </motion.div>

      {/* Hand-off card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <Card className="p-6 sm:p-8 max-w-2xl mx-auto space-y-6">
          <div className="flex items-start gap-3 p-4 bg-primary/5 border border-primary/20 rounded-lg">
            <Sparkles
              className="w-5 h-5 text-primary flex-shrink-0 mt-0.5"
              aria-hidden="true"
            />
            <div className="text-sm">
              <p className="font-medium mb-1">XP &amp; badges sécurisés</p>
              <p className="text-xs text-muted-foreground">
                Votre progression est mémorisée localement. À l&apos;inscription,
                elle sera fusionnée automatiquement avec votre compte.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-4 bg-muted/40 border border-border rounded-lg">
            <Shield
              className="w-5 h-5 text-muted-foreground flex-shrink-0 mt-0.5"
              aria-hidden="true"
            />
            <div className="text-sm">
              <p className="font-medium mb-1">Sécurité et confidentialité</p>
              <p className="text-xs text-muted-foreground">
                Vos données sont protégées. Vous saisirez votre email, votre
                téléphone et votre mot de passe sur la page d&apos;inscription
                officielle, puis vous recevrez un email de vérification.
              </p>
            </div>
          </div>
        </Card>
      </motion.div>

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
          onClick={handleContinue}
          disabled={navigating}
          aria-busy={navigating}
          data-testid="parent-setup-continue"
          data-href={buildSignUpHref(tempUserId)}
          className="gap-2 bg-gradient-to-r from-primary to-purple-500 hover:opacity-90 text-white focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
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
