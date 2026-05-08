"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent } from "@/components/ui/card"

interface Props {
  eventId: string | null
}

export function RequestRideForm({ eventId }: Props) {
  const router = useRouter()
  const [pickup, setPickup] = useState("")
  const [dropoff, setDropoff] = useState("")
  const [scheduledFor, setScheduledFor] = useState("")
  const [estimatedDh, setEstimatedDh] = useState("")
  const [paymentMethod, setPaymentMethod] = useState<"coins" | "dh" | "split_with_parent">("coins")
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      const res = await fetch("/api/teen/rides/request", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          pickupAddress: pickup,
          dropoffAddress: dropoff,
          scheduledFor: new Date(scheduledFor).toISOString(),
          eventId,
          paymentMethod,
          estimatedDh: estimatedDh ? Number(estimatedDh) : null,
        }),
      })
      const json = await res.json()
      if (!res.ok || !json.success) {
        setError(json.error || "Échec de la demande")
        return
      }
      router.push("/teen/rides")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur réseau")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Card>
      <CardContent className="p-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="pickup">Lieu de prise en charge</Label>
            <Input id="pickup" value={pickup} onChange={(e) => setPickup(e.target.value)} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="dropoff">Destination</Label>
            <Input id="dropoff" value={dropoff} onChange={(e) => setDropoff(e.target.value)} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="scheduledFor">Date et heure</Label>
            <Input
              id="scheduledFor"
              type="datetime-local"
              value={scheduledFor}
              onChange={(e) => setScheduledFor(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="estimated">Coût estimé (DH)</Label>
            <Input
              id="estimated"
              type="number"
              min={0}
              value={estimatedDh}
              onChange={(e) => setEstimatedDh(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="payment">Méthode de paiement</Label>
            <select
              id="payment"
              className="w-full border rounded px-2 py-2 text-sm"
              value={paymentMethod}
              onChange={(e) =>
                setPaymentMethod(e.target.value as "coins" | "dh" | "split_with_parent")
              }
            >
              <option value="coins">Coins</option>
              <option value="dh">DH</option>
              <option value="split_with_parent">Partagé avec le parent</option>
            </select>
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button type="submit" disabled={submitting}>
            {submitting ? "Envoi…" : "Demander le trajet"}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
