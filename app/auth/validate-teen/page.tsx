"use client"

import { useEffect, useState, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { FieldInput } from "@/components/ui/field-input"
import { StickerCard } from "@/components/ui/sticker-card"
import { NivCoach, NivEmpty, NivCelebration } from "@/components/brand"
import { MeshBackground } from "@/components/ui/effects/mesh-background"
import { Loader2, CheckCircle, XCircle, Shield } from "lucide-react"
import { toast } from "sonner"
import { createClient } from "@/lib/supabase/client"
import Link from "next/link"

interface RegistrationData {
  teenName: string
  teenAge: number
  parentEmailMasked: string | null
  hasParentEmail: boolean
  teenEmail: string | null
  status: string
}

function ValidateTeenInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get("token")

  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [registration, setRegistration] = useState<RegistrationData | null>(null)
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [success, setSuccess] = useState(false)
  // #291 — whether the teen's magic-link access email was actually sent.
  const [magicEmailed, setMagicEmailed] = useState(false)
  // #26 — the approve POST requires teen_email (or teen_phone). Pre-fill from
  // the email the teen gave at registration; let the parent supply/fix it.
  const [teenEmail, setTeenEmail] = useState("")

  useEffect(() => {
    async function checkAuthAndToken() {
      if (!token) {
        setError("Lien de validation invalide")
        setLoading(false)
        return
      }

      // Check if user is logged in
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      setIsLoggedIn(!!user)

      // Verify token
      try {
        const response = await fetch(`/api/auth/validate-teen?token=${token}`)
        const data = await response.json()

        if (!data.success) {
          setError(data.error)
        } else {
          setRegistration(data.data)
          if (data.data?.teenEmail) setTeenEmail(data.data.teenEmail)
        }
      } catch (err) {
        setError("Erreur lors de la vérification")
      }

      setLoading(false)
    }

    checkAuthAndToken()
  }, [token])

  const handleApprove = async () => {
    if (!isLoggedIn) {
      // New/returning parent: go through the start route which drops the
      // pending-teen cookie, then sign-up (role=parent) → KYC + signature →
      // /auth/redirect routes back here once onboarded.
      router.push(`/auth/validate-teen/start?token=${token}`)
      return
    }

    const email = teenEmail.trim()
    if (!email) {
      toast.error("Renseigne l'email du teen pour créer son compte")
      return
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      toast.error("Format d'email du teen invalide")
      return
    }

    setProcessing(true)
    try {
      const response = await fetch("/api/auth/validate-teen", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, action: "approve", teen_email: email }),
      })

      const data = await response.json()

      if (!data.success) {
        toast.error(data.error)
        return
      }

      setMagicEmailed(Boolean(data.data?.magicLinkEmailed))
      setSuccess(true)
      toast.success("Compte teen validé!")

      // Redirect to parent dashboard after 3 seconds
      setTimeout(() => {
        router.push("/parent/teens")
      }, 3000)
    } catch (err) {
      toast.error("Validation ratee. On retente? 💪")
    } finally {
      setProcessing(false)
    }
  }

  const handleReject = async () => {
    if (!isLoggedIn) {
      router.push(`/auth/validate-teen/start?token=${token}`)
      return
    }

    setProcessing(true)
    try {
      const response = await fetch("/api/auth/validate-teen", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, action: "reject" }),
      })

      const data = await response.json()

      if (!data.success) {
        toast.error(data.error)
        return
      }

      toast.info("Demande refusée")
      router.push("/")
    } catch (err) {
      toast.error("Refus rate. Reessaye?")
    } finally {
      setProcessing(false)
    }
  }

  const firstName = registration?.teenName?.split(" ")[0] ?? ""

  function Shell({ children }: { children: React.ReactNode }) {
    return (
      <div className="relative flex min-h-screen w-full items-center justify-center overflow-hidden bg-paper p-4 md:p-10">
        <MeshBackground />
        <div className="relative z-10 w-full max-w-lg">{children}</div>
      </div>
    )
  }

  // Loading state
  if (loading) {
    return (
      <Shell>
        <StickerCard className="p-8 text-center">
          <Loader2 className="mx-auto mb-4 size-12 animate-spin text-pink" aria-hidden="true" />
          <p className="text-mute">Vérification en cours…</p>
        </StickerCard>
      </Shell>
    )
  }

  // Error state
  if (error) {
    return (
      <Shell>
        <NivEmpty
          title="Lien invalide"
          description={error}
          action={
            <Button asChild variant="pink">
              <Link href="/">Retour à l'accueil</Link>
            </Button>
          }
        />
      </Shell>
    )
  }

  // Success state — moment de pic (Niv proud + confettis reduced-motion-safe)
  if (success) {
    return (
      <Shell>
        <NivCelebration
          tone="lime"
          title="Compte validé"
          caption={
            magicEmailed
              ? `${registration?.teenName} va recevoir un email avec son lien de connexion. Redirection vers ton espace parent…`
              : `${registration?.teenName} peut maintenant utiliser Nivy — transmets-lui son lien de connexion. Redirection vers ton espace parent…`
          }
        />
      </Shell>
    )
  }

  // Main validation view
  return (
    <Shell>
      <StickerCard className="p-6 sm:p-7">
        <p className="eyebrow tracking-[0.16em]">Validation teen</p>
        <h1 className="mt-2 font-display text-3xl font-extrabold leading-[1.05] tracking-tight text-ink text-balance">
          {firstName} veut te <em className="font-semibold italic text-pink">rejoindre</em>
        </h1>

        <div className="mt-4">
          <NivCoach
            mood="calm"
            message={`${firstName} veut rejoindre ton crew sur Nivy. À toi de valider — tu gardes le contrôle.`}
          />
        </div>

        <div className="mt-5 space-y-5">
          {/* Teen Info */}
          <div className="flex items-center gap-3 rounded-2xl border-2 border-ink bg-white p-4 shadow-stkr-sm">
            <span className="grid size-11 shrink-0 place-items-center rounded-full border-2 border-ink bg-pink font-display text-base font-extrabold text-ink">
              {firstName.charAt(0).toUpperCase() || "?"}
            </span>
            <div>
              <p className="font-display font-bold text-ink">{registration?.teenName}</p>
              <p className="text-sm text-mute">{registration?.teenAge} ans</p>
            </div>
          </div>

          {/* Security Note */}
          <Card variant="info" className="p-4">
            <CardContent className="flex items-start gap-3 px-0">
              <Shield className="mt-0.5 size-5 shrink-0 text-teal" aria-hidden="true" />
              <div className="text-sm">
                <p className="mb-1 font-semibold text-ink">Ton rôle de parent</p>
                <p className="text-ink-2">
                  En validant, tu pourras superviser les activités de {firstName}, approuver ses
                  réservations et définir des limites de dépenses.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Not logged in → create a parent account (primary) or sign in. */}
          {!isLoggedIn && (
            <Card variant="warning" className="p-4">
              <CardContent className="px-0 text-sm text-ink-2 space-y-2">
                <p>
                  <strong className="font-semibold text-ink">Pour valider en toute sécurité,</strong>{" "}
                  crée ton compte parent (vérification d&apos;identité + autorisation signée), puis
                  l&apos;inscription de {firstName} sera activée.
                </p>
                {registration?.hasParentEmail && registration.parentEmailMasked && (
                  <p className="text-xs text-mute">
                    Cette demande est destinée à <strong>{registration.parentEmailMasked}</strong> —
                    connecte-toi avec cette adresse.
                  </p>
                )}
                <p className="text-xs">
                  Tu as déjà un compte ?{" "}
                  <button
                    type="button"
                    onClick={() => router.push(`/auth/validate-teen/start?token=${token}&mode=login`)}
                    className="font-semibold text-pink hover:underline"
                  >
                    Se connecter
                  </button>
                </p>
              </CardContent>
            </Card>
          )}

          {/* #26 — teen email for account creation (required to approve). */}
          {isLoggedIn && (
            <FieldInput
              id="teen-email"
              type="email"
              inputMode="email"
              label="Email du teen"
              placeholder="email@exemple.com"
              value={teenEmail}
              onChange={(e) => setTeenEmail(e.target.value)}
              hint="L'email que l'ado a indiqué à l'inscription. C'est là que son lien de connexion sera envoyé."
            />
          )}

          {/* Action Buttons */}
          <div className="flex gap-3">
            <Button variant="outline" className="flex-1" onClick={handleReject} disabled={processing}>
              <XCircle className="mr-2 size-4" aria-hidden="true" />
              Refuser
            </Button>
            <Button variant="pink" className="flex-1" onClick={handleApprove} disabled={processing}>
              {processing ? (
                <Loader2 className="mr-2 size-4 animate-spin" aria-hidden="true" />
              ) : (
                <CheckCircle className="mr-2 size-4" aria-hidden="true" />
              )}
              {isLoggedIn ? "Valider" : "Créer mon compte parent"}
            </Button>
          </div>

          {/* Help Link */}
          <p className="text-center text-xs text-mute">
            Tu ne connais pas cette personne ?{" "}
            <Link href="/aide" className="font-semibold text-pink hover:underline">
              Signaler un abus
            </Link>
          </p>
        </div>
      </StickerCard>
    </Shell>
  )
}

// useSearchParams() impose une frontière <Suspense> au build (Next App Router) :
// sans elle, le prérendu bascule en CSR bailout (page blanche / crash AppRouter
// résolu par un refresh) — ici sur le flux d'activation parent → ado.
export default function ValidateTeenPage() {
  return (
    <Suspense fallback={null}>
      <ValidateTeenInner />
    </Suspense>
  )
}
