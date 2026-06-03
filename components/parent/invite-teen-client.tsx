"use client"

import { useCallback, useEffect, useState } from "react"
import { toDataURL } from "qrcode"
import { Button } from "@/components/ui/button"
import { StickerCard } from "@/components/ui/sticker-card"
import { Copy, Loader2, RefreshCw } from "lucide-react"
import { toast } from "sonner"

interface InviteData {
  code: string
  shareUrl: string
  expiresAt: string
}

/**
 * V11 #299 — parent surface that generates a 6-digit linking code (24h,
 * single-use) and shows it as a big code + scannable QR + copyable link. The
 * teen redeems it from /teen/rejoindre (#300), by typing the code or scanning.
 */
export function InviteTeenClient() {
  const [invite, setInvite] = useState<InviteData | null>(null)
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const generate = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch("/api/parent/teens/invite", { method: "POST" })
      const data = await res.json()
      if (!data.success) {
        setError(data.error ?? "Erreur lors de la génération du code.")
        return
      }
      setInvite(data.data)
      const url = await toDataURL(data.data.shareUrl, {
        width: 220,
        margin: 1,
        color: { dark: "#0e0c1a", light: "#ffffff" },
      })
      setQrDataUrl(url)
    } catch {
      setError("Erreur réseau. Réessaie.")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    generate()
  }, [generate])

  const copy = async (value: string, label: string) => {
    try {
      await navigator.clipboard.writeText(value)
      toast.success(`${label} copié`)
    } catch {
      toast.error("Copie impossible")
    }
  }

  if (loading) {
    return (
      <StickerCard className="items-center gap-2 p-10 text-mute">
        <Loader2 className="size-6 animate-spin" aria-hidden="true" />
        <span>Génération du code…</span>
      </StickerCard>
    )
  }

  if (error || !invite) {
    return (
      <StickerCard className="items-center gap-3 p-8 text-center">
        <p className="text-sm text-mute">{error ?? "Code indisponible."}</p>
        <Button variant="pink" onClick={generate}>
          Réessayer
        </Button>
      </StickerCard>
    )
  }

  return (
    <StickerCard className="items-center gap-5 p-6">
      <div className="text-center">
        <p className="eyebrow tracking-[0.16em] text-mute">Code de liaison</p>
        <p className="mt-1 font-display text-5xl font-extrabold tracking-[0.2em] text-ink tabular-nums">
          {invite.code}
        </p>
        <p className="mt-1 text-xs text-mute">Valable 24h · usage unique</p>
      </div>

      {qrDataUrl ? (
        <div className="grid place-items-center rounded-2xl border-2 border-ink bg-white p-3">
          <img src={qrDataUrl} alt="QR d'invitation à scanner par l'ado" className="size-[200px] rounded-lg" />
        </div>
      ) : null}

      <p className="max-w-xs text-center text-sm text-mute">
        Ton ado saisit ce code (ou scanne le QR) depuis « Rejoindre un parent » sur son app.
      </p>

      <div className="flex w-full flex-col gap-2 sm:flex-row">
        <Button variant="outline" className="flex-1 gap-2" onClick={() => copy(invite.code, "Code")}>
          <Copy className="size-4" aria-hidden="true" />
          Copier le code
        </Button>
        <Button variant="outline" className="flex-1 gap-2" onClick={() => copy(invite.shareUrl, "Lien")}>
          <Copy className="size-4" aria-hidden="true" />
          Copier le lien
        </Button>
      </div>

      <Button variant="ghost" size="sm" className="gap-2 text-mute" onClick={generate}>
        <RefreshCw className="size-4" aria-hidden="true" />
        Générer un nouveau code
      </Button>
    </StickerCard>
  )
}
