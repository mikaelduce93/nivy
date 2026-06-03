"use client"

/**
 * CreateClubForm — teen-organized clubs (issue #239).
 *
 * Collects: name, description, cotisation (coins), max members.
 * On submit → POST /api/teen/clubs { action:'create' } → create_teen_club.
 * After success, redirects to the new club's detail page to manage members
 * and sessions.
 */
import { useState } from "react"
import { useRouter } from "next/navigation"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { StickerCard } from "@/components/ui/sticker-card"
import { PremiumButton } from "@/components/ui/button"

export function CreateClubForm() {
  const router = useRouter()
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [cotisation, setCotisation] = useState("0")
  const [maxMembers, setMaxMembers] = useState("10")
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    if (name.trim().length < 3) {
      setError("Donne un nom à ton club (3 caractères min).")
      return
    }
    const cotisationCoins = Number(cotisation)
    if (!Number.isFinite(cotisationCoins) || cotisationCoins < 0) {
      setError("La cotisation doit être un nombre de coins positif ou nul.")
      return
    }
    const max = Number(maxMembers)
    if (!Number.isFinite(max) || max < 2) {
      setError("La taille maximale doit être d'au moins 2.")
      return
    }

    setSubmitting(true)
    try {
      const res = await fetch("/api/teen/clubs", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          action: "create",
          name: name.trim(),
          description: description.trim(),
          cotisationCoins,
          maxMembers: max,
        }),
      })
      const json = await res.json()
      if (!res.ok || !json?.success) {
        setError(json?.error || "Échec de la création du club")
        setSubmitting(false)
        return
      }
      setSuccess(true)
      const id = json.club_id as string | undefined
      setTimeout(() => {
        router.push(id ? `/teen/clubs/${id}` : "/teen/clubs")
        router.refresh()
      }, 600)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur réseau")
      setSubmitting(false)
    }
  }

  return (
    <StickerCard className="p-6">
      <form onSubmit={onSubmit} className="space-y-5">
        <div className="space-y-2">
          <Label htmlFor="name">Nom du club</Label>
          <Input
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Club échecs, ciné-club, running…"
            maxLength={120}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="description">Description (optionnel)</Label>
          <Input
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Ce que vous faites, le rythme…"
            maxLength={280}
          />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="cotisation">Cotisation (coins ⊙)</Label>
            <Input
              id="cotisation"
              type="number"
              min={0}
              inputMode="numeric"
              value={cotisation}
              onChange={(e) => setCotisation(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="maxMembers">Taille maximale</Label>
            <Input
              id="maxMembers"
              type="number"
              min={2}
              max={100}
              inputMode="numeric"
              value={maxMembers}
              onChange={(e) => setMaxMembers(e.target.value)}
            />
          </div>
        </div>

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
          {success ? "Créé !" : submitting ? "Création…" : "Créer le club"}
        </PremiumButton>
      </form>
    </StickerCard>
  )
}
