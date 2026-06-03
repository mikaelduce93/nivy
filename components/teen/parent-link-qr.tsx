"use client"

import { useCallback, useEffect, useState } from "react"
import { toDataURL } from "qrcode"
import { Button } from "@/components/ui/button"
import { Loader2, RefreshCw } from "lucide-react"
import { cn } from "@/lib/utils"

/**
 * V11 #297 — real scannable QR the teen shows so their parent can link
 * (/parent/scan-teen). Fetches /api/teen/parent-link-qr (no VIP dependency),
 * renders a real image (qrcode.toDataURL), counts down the short TTL and lets
 * the teen regenerate. `compact` renders just the QR tile (e.g. inside the
 * identity card); default renders the QR + helper text + refresh control.
 */
export function ParentLinkQR({ compact = false }: { compact?: boolean }) {
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null)
  const [expiresAt, setExpiresAt] = useState<number | null>(null)
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchQr = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch("/api/teen/parent-link-qr", { cache: "no-store" })
      const data = await res.json()
      if (!res.ok || !data.qr) {
        setError("Impossible de générer le QR. Réessaie.")
        setQrDataUrl(null)
        return
      }
      const url = await toDataURL(data.qr, {
        width: 220,
        margin: 1,
        color: { dark: "#0e0c1a", light: "#ffffff" },
      })
      setQrDataUrl(url)
      setExpiresAt(typeof data.expiresAt === "number" ? data.expiresAt : null)
    } catch {
      setError("Erreur réseau. Réessaie.")
      setQrDataUrl(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchQr()
  }, [fetchQr])

  // Countdown to expiry.
  useEffect(() => {
    if (!expiresAt) return
    const tick = () => setSecondsLeft(Math.max(0, expiresAt - Math.floor(Date.now() / 1000)))
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [expiresAt])

  const expired = secondsLeft !== null && secondsLeft <= 0

  const tile = (
    <div
      className={cn(
        "relative grid place-items-center rounded-2xl border-2 border-ink bg-white",
        compact ? "size-28 p-2" : "size-[220px] p-3",
      )}
    >
      {loading ? (
        <Loader2 className="size-8 animate-spin text-mute" aria-hidden="true" />
      ) : qrDataUrl && !expired ? (
        <img
          src={qrDataUrl}
          alt="QR de liaison à montrer à ton parent"
          className={cn("rounded-lg", compact ? "size-24" : "size-[200px]")}
        />
      ) : (
        <div className="grid place-items-center text-center text-xs text-mute">
          {error ?? "QR expiré"}
        </div>
      )}
    </div>
  )

  if (compact) return tile

  return (
    <div className="flex flex-col items-center gap-3">
      {tile}
      <p className="max-w-xs text-center text-sm text-mute">
        Montre ce QR à ton parent : il le scanne depuis l'app Nivy pour activer ton compte.
      </p>
      <p className="text-xs font-semibold tabular-nums text-mute" aria-live="polite">
        {expired
          ? "Expiré — régénère un QR."
          : secondsLeft !== null
            ? `Valable encore ${secondsLeft}s`
            : ""}
      </p>
      <Button variant="outline" size="sm" onClick={fetchQr} disabled={loading} className="gap-2">
        <RefreshCw className={cn("size-4", loading && "animate-spin")} aria-hidden="true" />
        {expired ? "Générer un nouveau QR" : "Régénérer"}
      </Button>
    </div>
  )
}
