"use client"

/**
 * ClubActions — teen-organized clubs (issue #239).
 *
 * Interactive controls on the club detail page:
 * - Non-member: « Rejoindre le club » → join_teen_club (debits the cotisation;
 *   errors like insufficient_balance are surfaced honestly).
 * - Owner: « Ajouter une session » form → add_club_session.
 *
 * All calls go through POST /api/teen/clubs and honestly surface the RPC's
 * { success, error } result.
 */
import { useState } from "react"
import { useRouter } from "next/navigation"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { StickerCard } from "@/components/ui/sticker-card"
import { Button, PremiumButton } from "@/components/ui/button"

interface Props {
  clubId: string
  cotisationCoins: number
  isOwner: boolean
  isMember: boolean
}

export function ClubActions({ clubId, cotisationCoins, isOwner, isMember }: Props) {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)

  const post = async (payload: Record<string, unknown>) => {
    const res = await fetch("/api/teen/clubs", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    })
    const json = await res.json()
    return { ok: res.ok && json?.success === true, json }
  }

  // --- Join (non-member) ---------------------------------------------------
  const [joining, setJoining] = useState(false)
  const join = async () => {
    setError(null)
    setJoining(true)
    const { ok, json } = await post({ action: "join", clubId })
    setJoining(false)
    if (!ok) {
      setError(
        json?.error === "insufficient_balance"
          ? "Solde de coins insuffisant pour payer la cotisation."
          : json?.error || "Échec de l'adhésion"
      )
      return
    }
    router.refresh()
  }

  // --- Add session (owner) -------------------------------------------------
  const [title, setTitle] = useState("")
  const [startsAt, setStartsAt] = useState("")
  const [location, setLocation] = useState("")
  const [addingBusy, setAddingBusy] = useState(false)
  const [added, setAdded] = useState(false)

  const addSession = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    if (title.trim().length < 3) {
      setError("Donne un titre à la session (3 caractères min).")
      return
    }
    if (!startsAt) {
      setError("Choisis une date et une heure.")
      return
    }
    setAddingBusy(true)
    const { ok, json } = await post({
      action: "addSession",
      clubId,
      title: title.trim(),
      startsAt: new Date(startsAt).toISOString(),
      location: location.trim(),
    })
    setAddingBusy(false)
    if (!ok) {
      setError(json?.error || "Échec de l'ajout de la session")
      return
    }
    setAdded(true)
    setTitle("")
    setStartsAt("")
    setLocation("")
    setTimeout(() => setAdded(false), 1500)
    router.refresh()
  }

  return (
    <div className="space-y-6">
      {error && (
        <p role="alert" aria-live="polite" className="text-sm text-destructive">
          {error}
        </p>
      )}

      {/* Join — non-members only */}
      {!isMember && (
        <section className="space-y-3">
          <StickerCard variant="panel" className="gap-3 p-4">
            <p className="text-sm text-ink">
              Rejoins ce club pour participer aux sessions. La cotisation de{" "}
              <strong>{cotisationCoins} coins ⊙</strong> est débitée de ton solde
              au moment de l&apos;adhésion.
            </p>
            <Button
              variant="pink"
              className="min-h-11"
              disabled={joining}
              onClick={join}
            >
              {joining ? "Adhésion…" : `Rejoindre · ${cotisationCoins} coins ⊙`}
            </Button>
          </StickerCard>
        </section>
      )}

      {isMember && !isOwner && (
        <p className="text-sm text-mute">
          Tu es membre de ce club. Retrouve les sessions programmées ci-dessous.
        </p>
      )}

      {/* Add session — owner only */}
      {isOwner && (
        <section className="space-y-3">
          <h2 className="font-mono text-[12px] font-bold uppercase tracking-[0.16em] text-mute">
            Ajouter une session
          </h2>
          <StickerCard className="p-6">
            <form onSubmit={addSession} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="sessionTitle">Titre</Label>
                <Input
                  id="sessionTitle"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Entraînement, réunion, sortie…"
                  maxLength={120}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="sessionStartsAt">Date et heure</Label>
                <Input
                  id="sessionStartsAt"
                  type="datetime-local"
                  value={startsAt}
                  onChange={(e) => setStartsAt(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="sessionLocation">Lieu (optionnel)</Label>
                <Input
                  id="sessionLocation"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="Adresse, salle, lien visio…"
                  maxLength={200}
                />
              </div>
              <PremiumButton
                type="submit"
                loading={addingBusy}
                success={added}
                disabled={addingBusy}
              >
                {added ? "Ajoutée !" : "Ajouter la session"}
              </PremiumButton>
            </form>
          </StickerCard>
        </section>
      )}
    </div>
  )
}
