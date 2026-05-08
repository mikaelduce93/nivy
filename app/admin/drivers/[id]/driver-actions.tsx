"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"

interface Props {
  driverId: string
  kycStatus: string
}

export function DriverActions({ driverId, kycStatus }: Props) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function decide(decision: "approve" | "reject") {
    setBusy(true)
    setError(null)
    try {
      const res = await fetch(`/api/admin/drivers/${driverId}/approve`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ decision }),
      })
      const json = await res.json()
      if (!res.ok || !json.success) {
        setError(json.error || "Échec")
        return
      }
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur")
    } finally {
      setBusy(false)
    }
  }

  if (kycStatus !== "pending") {
    return (
      <p className="text-sm text-muted-foreground">
        Statut actuel : <strong>{kycStatus}</strong>
      </p>
    )
  }

  return (
    <Card>
      <CardContent className="p-4 flex items-center gap-3">
        <Button onClick={() => decide("approve")} disabled={busy}>
          Approuver KYC
        </Button>
        <Button variant="destructive" onClick={() => decide("reject")} disabled={busy}>
          Rejeter
        </Button>
        {error && <span className="text-sm text-destructive">{error}</span>}
      </CardContent>
    </Card>
  )
}
