"use client"

import { useCallback, useEffect, useState } from "react"
import { QRCodeSVG } from "qrcode.react"
import { Button } from "@/components/ui/button"
import { Loader2, RefreshCw } from "lucide-react"
import { cn } from "@/lib/utils"

/**
 * #328 — real scannable QR the teen shows a partner to redeem a VIP offer.
 * Fetches the short-lived signed `nivy:v1` payload from /api/teen/vip-qr
 * (verified by /api/partner/scanner/apply), renders it as a real QR code,
 * counts down to expiry and lets the teen regenerate.
 */
export function VipScanQR() {
  const [qrPayload, setQrPayload] = useState<string | null>(null)
  const [expiresAt, setExpiresAt] = useState<number | null>(null)
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchQr = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch("/api/teen/vip-qr", { cache: "no-store" })
      const data = await res.json()
      if (!res.ok || !data.qr) {
        setError(data.message || "Impossible de générer le QR. Réessaie.")
        setQrPayload(null)
        return
      }
      setQrPayload(data.qr)
      setExpiresAt(typeof data.expiresAt === "number" ? data.expiresAt : null)
    } catch {
      setError("Erreur réseau. Réessaie.")
      setQrPayload(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchQr()
  }, [fetchQr])

  // Countdown to expiry — auto-refetch a fresh QR once it expires.
  useEffect(() => {
    if (!expiresAt) return
    const tick = () => setSecondsLeft(Math.max(0, expiresAt - Math.floor(Date.now() / 1000)))
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [expiresAt])

  const expired = secondsLeft !== null && secondsLeft <= 0

  useEffect(() => {
    if (!expired) return
    fetchQr()
  }, [expired, fetchQr])

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative grid size-[220px] place-items-center rounded-2xl border-2 border-ink bg-white p-3">
        {loading ? (
          <Loader2 className="size-8 animate-spin text-mute" aria-hidden="true" />
        ) : qrPayload && !expired ? (
          <QRCodeSVG value={qrPayload} size={200} level="H" includeMargin />
        ) : (
          <div className="grid place-items-center text-center text-xs text-mute">
            {error ?? "QR expiré"}
          </div>
        )}
      </div>
      <p className="max-w-xs text-center text-sm text-mute">
        Montre ce QR au partenaire pour appliquer ton offre VIP.
      </p>
      <p className="text-xs font-semibold tabular-nums text-mute" aria-live="polite">
        {expired
          ? "Expiré — génération d'un nouveau QR…"
          : secondsLeft !== null
            ? `Valable encore ${secondsLeft}s`
            : ""}
      </p>
      <Button variant="outline" size="sm" onClick={fetchQr} disabled={loading} className="gap-2">
        <RefreshCw className={cn("size-4", loading && "animate-spin")} aria-hidden="true" />
        Régénérer le QR
      </Button>
    </div>
  )
}
