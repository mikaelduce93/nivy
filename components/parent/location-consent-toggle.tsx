"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { MapPin, MapPinOff, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { fetchWithCSRF } from "@/lib/security/fetch-with-csrf"

/**
 * Per-teen geolocation revocation toggle (loi 09-08/CNDP — consent revocable).
 * Flips parent_teen_links.location_revoked via the per-teen endpoint. The
 * signed baseline consent is unchanged; this is the per-teen override.
 */
export function LocationConsentToggle({
  teenId,
  initialEnabled,
}: {
  teenId: string
  initialEnabled: boolean
}) {
  const [enabled, setEnabled] = useState(initialEnabled)
  const [pending, setPending] = useState(false)

  const toggle = async () => {
    if (pending) return
    const next = !enabled
    setPending(true)
    try {
      const res = await fetchWithCSRF(`/api/parent/teens/${teenId}/location-consent`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: next }),
      })
      const data = await res.json()
      if (!data.success) {
        toast.error(data.error || "Échec de la mise à jour")
        return
      }
      setEnabled(next)
      toast.success(next ? "Géolocalisation réactivée" : "Géolocalisation révoquée")
    } catch {
      toast.error("Erreur réseau. Réessaie.")
    } finally {
      setPending(false)
    }
  }

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={toggle}
      disabled={pending}
      className="gap-2"
      aria-pressed={enabled}
    >
      {pending ? (
        <Loader2 className="size-4 animate-spin" aria-hidden="true" />
      ) : enabled ? (
        <MapPinOff className="size-4" aria-hidden="true" />
      ) : (
        <MapPin className="size-4" aria-hidden="true" />
      )}
      {enabled ? "Désactiver la géolocalisation" : "Réactiver la géolocalisation"}
    </Button>
  )
}
