"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { QRScanner } from "@/components/qr-scanner"
import { StickerCard } from "@/components/ui/sticker-card"
import { FieldInput } from "@/components/ui/field-input"
import { Button } from "@/components/ui/button"
import { CheckCircle2, Loader2, QrCode, X } from "lucide-react"
import { toast } from "sonner"

/**
 * V11 #300 — teen-side consumption of a parent's 6-digit linking code. Accepts
 * a typed code (prefilled from the share link `?code=`) or a scanned parent QR
 * (the QR encodes /teen/rejoindre?code=NNNNNN — we extract the code).
 */
export function JoinParentClient({ initialCode = "" }: { initialCode?: string }) {
  const router = useRouter()
  const [code, setCode] = useState(initialCode.replace(/\D/g, "").slice(0, 6))
  const [scanning, setScanning] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)
  const [balanceActivated, setBalanceActivated] = useState(true)

  const submit = async (value: string) => {
    if (submitting || done) return
    if (!/^\d{6}$/.test(value)) {
      toast.error("Entre les 6 chiffres du code.")
      return
    }
    setSubmitting(true)
    try {
      const res = await fetch("/api/teen/link-parent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: value }),
      })
      const data = await res.json()
      if (!data.success) {
        const messages: Record<string, string> = {
          invalid_code: "Code invalide.",
          already_used: "Ce code a déjà été utilisé.",
          expired: "Ce code a expiré — demande-en un nouveau à ton parent.",
        }
        toast.error(messages[data.error] ?? data.error ?? "Échec de la liaison.")
        setSubmitting(false)
        return
      }
      setDone(true)
      setBalanceActivated(Boolean(data.data?.balanceActivated))
      toast.success(data.message ?? "Liaison réussie !")
      setTimeout(() => router.push("/teen"), 2500)
    } catch {
      toast.error("Erreur réseau. Réessaie.")
      setSubmitting(false)
    }
  }

  // The parent QR encodes the share URL containing ?code=NNNNNN.
  const handleScan = (raw: string) => {
    const match = raw.match(/[?&]code=(\d{6})/) ?? raw.match(/\b(\d{6})\b/)
    if (!match) {
      toast.error("QR non reconnu.")
      return
    }
    setScanning(false)
    setCode(match[1])
    submit(match[1])
  }

  if (done) {
    return (
      <StickerCard className="items-center gap-3 p-8 text-center">
        <CheckCircle2 className="size-12 text-lime" aria-hidden="true" />
        <h2 className="font-display text-xl font-extrabold text-ink">C'est lié !</h2>
        <p className="text-sm text-mute">
          {balanceActivated
            ? "Ton parent est relié à ton compte et ton solde est actif."
            : "Ton parent est relié à ton compte. Ton solde s'activera quand il aura validé les CGU."}
        </p>
      </StickerCard>
    )
  }

  if (scanning) {
    return (
      <StickerCard className="gap-3 p-4">
        <QRScanner onScan={handleScan} onError={() => {}} onClose={() => setScanning(false)} />
        <Button variant="outline" className="w-full gap-2" onClick={() => setScanning(false)}>
          <X className="size-4" aria-hidden="true" />
          Annuler le scan
        </Button>
      </StickerCard>
    )
  }

  return (
    <StickerCard className="gap-5 p-6">
      <form
        onSubmit={(e) => {
          e.preventDefault()
          submit(code)
        }}
        className="space-y-4"
      >
        <FieldInput
          id="link-code"
          label="Code à 6 chiffres"
          inputMode="numeric"
          autoComplete="one-time-code"
          placeholder="123456"
          maxLength={6}
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
          hint="Le code que ton parent a généré dans son app."
        />
        <Button type="submit" variant="pink" className="w-full gap-2" disabled={submitting || code.length !== 6}>
          {submitting ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : null}
          Rejoindre mon parent
        </Button>
      </form>

      <div className="flex items-center gap-3 text-xs text-mute">
        <span className="h-px flex-1 bg-ink/10" />
        ou
        <span className="h-px flex-1 bg-ink/10" />
      </div>

      <Button variant="outline" className="w-full gap-2" onClick={() => setScanning(true)}>
        <QrCode className="size-4" aria-hidden="true" />
        Scanner le QR de mon parent
      </Button>
    </StickerCard>
  )
}
