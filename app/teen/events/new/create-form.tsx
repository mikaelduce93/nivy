"use client"

/**
 * CreateEventForm — V6 teen events (issue #237, Flow A).
 *
 * Collects: title, description, date/time, city, address, capacity and price
 * per place (in coins). On submit → POST /api/teen/events/groups
 * { action:'createEvent' } → create_teen_event. The event is created in
 * `pending_review`; after success we redirect to the group-booking hub.
 */
import { useState } from "react"
import { useRouter } from "next/navigation"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { StickerCard } from "@/components/ui/sticker-card"
import { PremiumButton } from "@/components/ui/button"

export function CreateEventForm() {
  const router = useRouter()
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [startsAt, setStartsAt] = useState("")
  const [city, setCity] = useState("")
  const [address, setAddress] = useState("")
  const [capacity, setCapacity] = useState("")
  const [priceCoins, setPriceCoins] = useState("0")
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (title.trim().length < 3) {
      setError("Donne un titre à ton évènement (3 caractères min).")
      return
    }
    const price = Number(priceCoins || "0")
    if (!Number.isFinite(price) || price < 0) {
      setError("Le prix par place ne peut pas être négatif.")
      return
    }
    const cap = capacity.trim() ? Number(capacity) : null
    if (cap != null && (!Number.isInteger(cap) || cap < 1)) {
      setError("La capacité doit être un nombre entier d'au moins 1.")
      return
    }

    setSubmitting(true)
    try {
      const res = await fetch("/api/teen/events/groups", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          action: "createEvent",
          title: title.trim(),
          description: description.trim() || null,
          startsAt: startsAt ? new Date(startsAt).toISOString() : null,
          city: city.trim() || null,
          address: address.trim() || null,
          capacity: cap,
          priceCoins: Math.round(price),
        }),
      })
      const json = await res.json()
      if (!res.ok || !json?.success) {
        setError(json?.error || "Échec de la création de l'évènement")
        setSubmitting(false)
        return
      }
      setSuccess(true)
      setTimeout(() => {
        router.push("/teen/events/groups")
      }, 800)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur réseau")
      setSubmitting(false)
    }
  }

  return (
    <StickerCard className="p-6">
      <form onSubmit={onSubmit} className="space-y-5">
        <div className="space-y-2">
          <Label htmlFor="title">Titre de l&apos;évènement</Label>
          <Input
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Tournoi de basket, concert, atelier manga…"
            maxLength={120}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="description">Description (optionnel)</Label>
          <Textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Décris ce qui va se passer, ce qu'il faut prévoir…"
            rows={3}
            maxLength={1000}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="startsAt">Date et heure</Label>
          <Input
            id="startsAt"
            type="datetime-local"
            value={startsAt}
            onChange={(e) => setStartsAt(e.target.value)}
          />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="city">Ville</Label>
            <Input
              id="city"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="Casablanca"
              maxLength={80}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="address">Adresse (optionnel)</Label>
            <Input
              id="address"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Lieu exact"
              maxLength={160}
              autoComplete="street-address"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="capacity">Capacité (optionnel)</Label>
            <Input
              id="capacity"
              type="number"
              min={1}
              inputMode="numeric"
              value={capacity}
              onChange={(e) => setCapacity(e.target.value)}
              placeholder="Nombre de places"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="priceCoins">Prix par place (coins ⊙)</Label>
            <Input
              id="priceCoins"
              type="number"
              min={0}
              inputMode="numeric"
              value={priceCoins}
              onChange={(e) => setPriceCoins(e.target.value)}
            />
          </div>
        </div>
        <p className="font-mono text-xs text-mute">100 coins ⊙ = 1 DH · 0 = gratuit.</p>

        {error && (
          <p role="alert" aria-live="polite" className="text-sm text-destructive">
            {error}
          </p>
        )}

        <PremiumButton
          type="submit"
          loading={submitting}
          success={success}
          disabled={submitting || success}
        >
          {success ? "Envoyé en relecture !" : submitting ? "Création…" : "Créer l'évènement"}
        </PremiumButton>
        <p className="text-xs text-mute">
          Ton évènement passe en relecture avant d&apos;être visible par les autres.
        </p>
      </form>
    </StickerCard>
  )
}
