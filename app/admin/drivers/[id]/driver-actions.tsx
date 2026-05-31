"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"

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
      <p className="text-sm text-paper/80">
        Statut actuel :{" "}
        <strong className="font-mono uppercase tracking-[0.12em] text-paper">
          {kycStatus}
        </strong>
      </p>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      <Button
        variant="lime"
        className="w-full justify-center"
        onClick={() => decide("approve")}
        disabled={busy}
      >
        Approuver KYC
      </Button>
      <Button
        variant="outline"
        className="w-full justify-center border-paper/40 bg-transparent text-paper hover:bg-paper/10"
        onClick={() => decide("reject")}
        disabled={busy}
      >
        Rejeter
      </Button>
      {error && <span className="text-sm font-medium text-coral">{error}</span>}
    </div>
  )
}
