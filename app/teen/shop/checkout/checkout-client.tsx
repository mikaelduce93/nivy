"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { AlertCircle, Loader2 } from "lucide-react"
import { HybridCheckout } from "@/components/payment/hybrid-checkout"
import { Button } from "@/components/ui/button"
import { StickerCard } from "@/components/ui/sticker-card"
import { DarkSurface, NivCelebration, NivCoach } from "@/components/brand"
import { CheckRound } from "@/components/ui/check-round"
import { Confetti } from "@/components/ui/effects/confetti"
import { fetchWithCSRF } from "@/lib/security/fetch-with-csrf"

interface TeenCheckoutClientProps {
  bookingId: string
  teenId: string
  totalAmount: number
  availableXP: number
}

type ViewState =
  | { kind: "idle" }
  | { kind: "submitting" }
  | { kind: "pending_approval"; approvalId: string; xpUsed: number; xpValueDH: number }
  | { kind: "completed"; xpUsed: number }
  | { kind: "error"; message: string; canRetry: boolean }

export function TeenCheckoutClient({
  bookingId,
  teenId,
  totalAmount,
  availableXP,
}: TeenCheckoutClientProps) {
  const router = useRouter()
  const [view, setView] = useState<ViewState>({ kind: "idle" })

  const submitPayment = async (xpUsed: number) => {
    setView({ kind: "submitting" })

    try {
      const response = await fetchWithCSRF("/api/payments/hybrid", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bookingId,
          teenId,
          xpAmount: Math.floor(xpUsed),
          paymentMethod: "stripe",
        }),
      })

      let payload: Record<string, unknown> = {}
      try {
        payload = await response.json()
      } catch {
        // No JSON body — treat as raw error.
      }

      if (!response.ok) {
        const message =
          (payload.error as string | undefined) ||
          (response.status === 401
            ? "Tu dois être connecté pour payer."
            : response.status === 403
              ? "Action non autorisée."
              : response.status === 404
                ? "Réservation introuvable."
                : response.status === 429
                  ? "Trop de tentatives. Réessaie dans quelques instants."
                  : "Le paiement n'a pas pu être traité.")

        setView({
          kind: "error",
          message,
          canRetry: response.status !== 401 && response.status !== 403,
        })
        toast.error(message)
        return
      }

      const status = payload.status as string | undefined

      if (status === "pending_approval") {
        const approvalId = String(payload.approvalId || "")
        const xpValueDH = Number(payload.xpValueDH ?? 0)
        toast.info("Demande envoyée à ton parent")
        setView({
          kind: "pending_approval",
          approvalId,
          xpUsed: Math.floor(xpUsed),
          xpValueDH,
        })
        return
      }

      if (status === "completed") {
        toast.success("Paiement effectué avec tes XP !")
        setView({ kind: "completed", xpUsed: Math.floor(xpUsed) })
        // Brief pause so the success state is visible before redirect.
        setTimeout(() => {
          router.push(`/reservation/confirmation?booking=${bookingId}&payment=success`)
        }, 1200)
        return
      }

      if (status === "redirect") {
        const redirectUrl = payload.redirectUrl as string | undefined
        if (!redirectUrl) {
          setView({
            kind: "error",
            message: "Session de paiement invalide. Réessaie.",
            canRetry: true,
          })
          return
        }
        // Hand off to Stripe Checkout.
        window.location.href = redirectUrl
        return
      }

      if (status === "redirect_cmi") {
        // CMI returns an HTML form to auto-submit. We don't expose CMI from this
        // teen flow today (we always send paymentMethod=stripe), but keep this
        // branch defensive.
        const formHtml = payload.formHtml as string | undefined
        if (formHtml) {
          document.open()
          document.write(formHtml)
          document.close()
          return
        }
        setView({
          kind: "error",
          message: "Méthode de paiement non disponible.",
          canRetry: true,
        })
        return
      }

      // Unknown success shape — surface as error so we don't silently fail.
      setView({
        kind: "error",
        message: "Réponse de paiement non reconnue.",
        canRetry: true,
      })
    } catch (err) {
      console.error("[TeenCheckout] network error", err)
      setView({
        kind: "error",
        message: "Connexion impossible. Vérifie ta connexion et réessaie.",
        canRetry: true,
      })
    }
  }

  if (view.kind === "submitting") {
    return (
      <StickerCard className="p-8 text-center items-center gap-4">
        <Loader2 className="w-10 h-10 animate-spin text-pink" />
        <div>
          <p className="font-display font-bold text-ink">Traitement du paiement…</p>
          <p className="text-xs text-mute mt-1">Ne ferme pas cette page.</p>
        </div>
      </StickerCard>
    )
  }

  if (view.kind === "pending_approval") {
    return (
      <DarkSurface tone="gold" shadow className="p-6 sm:p-8 space-y-5">
        <span className="eyebrow tracking-[0.16em] text-paper/60">En attente</span>
        <h2 className="font-display text-xl font-extrabold text-paper">
          Ton parent doit <em className="font-semibold italic text-gold">valider</em>
        </h2>
        <NivCoach
          mood="calm"
          message="Ton parent valide, je te préviens dès qu'on a sa réponse !"
        />
        <p className="font-mono text-sm tabular-nums text-paper/70">
          {view.xpUsed.toLocaleString()} XP · {view.xpValueDH.toFixed(2)} DH
        </p>
        <div className="flex flex-col sm:flex-row gap-3 pt-1">
          <Button
            variant="pink"
            className="flex-1"
            onClick={() => router.push(`/reservation/confirmation?booking=${bookingId}`)}
          >
            Voir ma réservation
          </Button>
          <Button
            variant="outline"
            className="flex-1 border-paper/40 text-paper hover:text-ink"
            onClick={() => router.push("/teen/wallet?tab=shop")}
          >
            Retour au shop
          </Button>
        </div>
      </DarkSurface>
    )
  }

  if (view.kind === "completed") {
    return (
      <>
        <Confetti trigger palette="xp" />
        <NivCelebration
          tone="lime"
          palette="xp"
          trigger={false}
          title="Paiement confirmé"
          value={
            <span className="inline-flex items-center gap-3">
              <CheckRound checked disabled aria-label="Paiement validé" />
              {view.xpUsed.toLocaleString()}
            </span>
          }
          caption={`${view.xpUsed.toLocaleString()} XP utilisés. Redirection en cours…`}
        />
      </>
    )
  }

  if (view.kind === "error") {
    return (
      <StickerCard className="p-8 text-center items-center gap-4">
        <AlertCircle className="w-10 h-10 text-coral" />
        <div>
          <h2 className="font-display text-xl font-extrabold text-ink">Paiement non effectué</h2>
          <p className="text-sm text-ink-2 mt-1">{view.message}</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 pt-2 w-full">
          {view.canRetry && (
            <Button
              variant="pink"
              className="flex-1"
              onClick={() => setView({ kind: "idle" })}
            >
              Réessayer
            </Button>
          )}
          <Button
            variant="outline"
            className="flex-1"
            onClick={() => router.push("/teen/wallet?tab=shop")}
          >
            Retour au shop
          </Button>
        </div>
      </StickerCard>
    )
  }

  return (
    <>
      <HybridCheckout
        totalAmount={totalAmount}
        userXP={availableXP}
        onConfirm={(xpUsed) => submitPayment(xpUsed)}
      />

      <button
        onClick={() => router.back()}
        className="w-full text-mute text-sm hover:text-ink transition-colors"
      >
        Annuler
      </button>
    </>
  )
}
