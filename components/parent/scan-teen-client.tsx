"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { QRScanner } from "@/components/qr-scanner"
import { StickerCard } from "@/components/ui/sticker-card"
import { Button } from "@/components/ui/button"
import { NivCoach } from "@/components/brand"
import { CheckCircle2, Loader2 } from "lucide-react"
import { toast } from "sonner"

/**
 * V11 #298 — parent-side camera surface to scan the teen's `nivy:link:v1` QR.
 * Reuses the generic <QRScanner/> (html5-qrcode) as-is; on a valid scan it
 * POSTs to /api/parent/link-teen/scan which consumes the token and links.
 */
export function ScanTeenClient() {
  const router = useRouter()
  const [processing, setProcessing] = useState(false)
  const [done, setDone] = useState(false)
  const [balanceActivated, setBalanceActivated] = useState(false)

  const handleScan = async (qr: string) => {
    if (processing || done) return
    if (!qr.startsWith("nivy:link:v1:")) {
      toast.error("Ce QR n'est pas un code de liaison Nivy.")
      return
    }
    setProcessing(true)
    try {
      const res = await fetch("/api/parent/link-teen/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ qr_payload: qr }),
      })
      const data = await res.json()
      if (!data.success) {
        const messages: Record<string, string> = {
          expired: "Ce QR a expiré — demande à ton ado d'en générer un nouveau.",
          already_used: "Ce QR a déjà été utilisé.",
          invalid_qr: "QR invalide.",
          bad_signature: "QR invalide.",
          invalid_token: "QR invalide ou expiré.",
          subject_mismatch: "QR invalide.",
        }
        toast.error(messages[data.error] ?? data.error ?? "Échec de la liaison.")
        setProcessing(false)
        return
      }
      setDone(true)
      setBalanceActivated(Boolean(data.data?.balanceActivated))
      // #302 — the balance is only spendable once the CGU are signed. If the
      // parent has no active e-signature, route them to sign; else confirm.
      if (data.data?.balanceActivated) {
        toast.success("Liaison réussie — solde activé.")
        setTimeout(() => router.push("/parent/teens"), 2000)
      } else {
        toast.success("Liaison réussie ! Signe les CGU pour activer le solde.")
        setTimeout(() => router.push("/onboarding/parent/e-signature"), 1800)
      }
    } catch {
      toast.error("Erreur réseau. Réessaie.")
      setProcessing(false)
    }
  }

  if (done) {
    return (
      <StickerCard className="items-center gap-3 p-8 text-center">
        <CheckCircle2 className="size-12 text-lime" aria-hidden="true" />
        <h2 className="font-display text-xl font-extrabold text-ink">Liaison réussie</h2>
        <p className="text-sm text-mute">
          {balanceActivated
            ? "Solde activé. Redirection vers tes teens…"
            : "Dernière étape : signe les CGU pour activer le solde…"}
        </p>
      </StickerCard>
    )
  }

  return (
    <div className="space-y-4">
      <NivCoach
        mood="happy"
        message="Demande à ton ado d'ouvrir son QR de liaison dans l'app, puis scanne-le ici."
      />
      <StickerCard className="p-4">
        {processing ? (
          <div className="flex items-center justify-center gap-2 py-12 text-mute">
            <Loader2 className="size-5 animate-spin" aria-hidden="true" />
            <span>Liaison en cours…</span>
          </div>
        ) : (
          <QRScanner onScan={handleScan} onError={() => {}} />
        )}
      </StickerCard>
      <Button variant="outline" className="w-full" onClick={() => router.push("/parent/teens")}>
        Annuler
      </Button>
    </div>
  )
}
