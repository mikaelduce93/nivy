"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { CheckCircle2, Clock, AlertCircle, Loader2 } from "lucide-react"
import { HybridCheckout } from "@/components/payment/hybrid-checkout"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
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
          router.push(`/mes-reservations/${bookingId}?payment=success`)
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
      <Card className="p-8 bg-zinc-900 border-zinc-800 text-center space-y-4">
        <Loader2 className="w-10 h-10 mx-auto animate-spin text-emerald-400" />
        <div>
          <p className="font-bold text-white">Traitement du paiement…</p>
          <p className="text-xs text-zinc-400 mt-1">Ne ferme pas cette page.</p>
        </div>
      </Card>
    )
  }

  if (view.kind === "pending_approval") {
    return (
      <Card className="p-8 bg-zinc-900 border-amber-500/40 text-center space-y-4">
        <Clock className="w-10 h-10 mx-auto text-amber-400" />
        <div className="space-y-2">
          <h2 className="text-xl font-black text-white">Approbation parentale requise</h2>
          <p className="text-sm text-zinc-300">
            Tu utilises {view.xpUsed.toLocaleString()} XP ({view.xpValueDH.toFixed(2)} DH).
            On a envoyé une demande à ton parent — tu seras notifié dès la réponse.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          <Button
            className="flex-1"
            onClick={() => router.push(`/mes-reservations/${bookingId}`)}
          >
            Voir ma réservation
          </Button>
          <Button
            variant="outline"
            className="flex-1"
            onClick={() => router.push("/teen/shop")}
          >
            Retour au shop
          </Button>
        </div>
      </Card>
    )
  }

  if (view.kind === "completed") {
    return (
      <Card className="p-8 bg-zinc-900 border-emerald-500/40 text-center space-y-4">
        <CheckCircle2 className="w-10 h-10 mx-auto text-emerald-400" />
        <div>
          <h2 className="text-xl font-black text-white">Paiement confirmé</h2>
          <p className="text-sm text-zinc-300 mt-1">
            {view.xpUsed.toLocaleString()} XP utilisés. Redirection en cours…
          </p>
        </div>
      </Card>
    )
  }

  if (view.kind === "error") {
    return (
      <Card className="p-8 bg-zinc-900 border-red-500/40 text-center space-y-4">
        <AlertCircle className="w-10 h-10 mx-auto text-red-400" />
        <div>
          <h2 className="text-xl font-black text-white">Paiement non effectué</h2>
          <p className="text-sm text-zinc-300 mt-1">{view.message}</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          {view.canRetry && (
            <Button
              className="flex-1"
              onClick={() => setView({ kind: "idle" })}
            >
              Réessayer
            </Button>
          )}
          <Button
            variant="outline"
            className="flex-1"
            onClick={() => router.push("/teen/shop")}
          >
            Retour au shop
          </Button>
        </div>
      </Card>
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
        className="w-full text-muted-foreground text-sm hover:text-foreground transition-colors"
      >
        Annuler
      </button>
    </>
  )
}
