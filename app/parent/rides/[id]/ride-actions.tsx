"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"

interface Props {
  rideId: string
  status: string
}

export function RideActions({ rideId, status }: Props) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function call(path: string) {
    setBusy(true)
    setError(null)
    try {
      const res = await fetch(path, { method: "POST" })
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

  if (status !== "requested") return null

  return (
    <Card>
      <CardContent className="p-4 flex items-center gap-3">
        <Button onClick={() => call(`/api/parent/rides/${rideId}/approve`)} disabled={busy}>
          Approuver
        </Button>
        <Button
          variant="destructive"
          onClick={() => call(`/api/parent/rides/${rideId}/deny`)}
          disabled={busy}
        >
          Refuser
        </Button>
        {error && <span className="text-sm text-destructive">{error}</span>}
      </CardContent>
    </Card>
  )
}
