"use client"

/**
 * CreateGroupRideForm — V6 group rides (issue #235).
 *
 * Collects: title, invited friends (checkbox picker over the teen's friends,
 * with a free-text fallback for extra teen-ids), max size, optional deadline.
 * On submit → POST /api/teen/rides/groups { action:'create' } → create_group_action.
 * After success, redirects to the new sortie's detail page to manage invites
 * and finalize the ride.
 */
import { useState } from "react"
import { useRouter } from "next/navigation"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { StickerCard } from "@/components/ui/sticker-card"
import { PremiumButton } from "@/components/ui/button"

export interface FriendOption {
  id: string
  name: string
  avatar_url: string | null
}

interface Props {
  friends: FriendOption[]
}

export function CreateGroupRideForm({ friends }: Props) {
  const router = useRouter()
  const [title, setTitle] = useState("")
  const [maxSize, setMaxSize] = useState("4")
  const [deadline, setDeadline] = useState("")
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [extraIds, setExtraIds] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    if (title.trim().length < 3) {
      setError("Donne un titre à ta sortie (3 caractères min).")
      return
    }
    // Picker selections + optional free-text fallback ids (comma-separated).
    const extra = extraIds
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
    const inviteeIds = Array.from(new Set([...selected, ...extra]))

    const max = Number(maxSize)
    if (!Number.isFinite(max) || max < 2) {
      setError("La taille maximale doit être d'au moins 2.")
      return
    }

    setSubmitting(true)
    try {
      const res = await fetch("/api/teen/rides/groups", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          action: "create",
          title: title.trim(),
          inviteeIds,
          maxSize: max,
          deadline: deadline ? new Date(deadline).toISOString() : null,
        }),
      })
      const json = await res.json()
      if (!res.ok || !json?.success) {
        setError(json?.error || "Échec de la création de la sortie")
        setSubmitting(false)
        return
      }
      setSuccess(true)
      const id = json.group_action_id as string | undefined
      setTimeout(() => {
        router.push(id ? `/teen/rides/groups/${id}` : "/teen/rides/groups")
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
          <Label htmlFor="title">Nom de la sortie</Label>
          <Input
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Concert au stade, sortie ciné…"
            maxLength={120}
          />
        </div>

        <div className="space-y-2">
          <span className="flex items-center gap-2 text-sm font-medium leading-none text-ink">
            Inviter des amis
          </span>
          {friends.length === 0 ? (
            <p className="text-sm text-mute">
              Tu n&apos;as pas encore d&apos;amis à inviter. Tu peux quand même créer
              la sortie et ajouter des amis plus tard.
            </p>
          ) : (
            <div className="grid max-h-56 grid-cols-1 gap-2 overflow-y-auto sm:grid-cols-2">
              {friends.map((f) => {
                const checked = selected.has(f.id)
                return (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => toggle(f.id)}
                    aria-pressed={checked}
                    className={`flex items-center gap-2 rounded-xl border-2 border-ink px-3 py-2 text-left text-sm font-semibold transition-all ${
                      checked ? "bg-pink/20 text-ink" : "bg-white text-ink hover:bg-muted"
                    }`}
                  >
                    <span
                      aria-hidden
                      className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border-2 border-ink font-mono text-[11px] ${
                        checked ? "bg-pink text-ink" : "bg-white"
                      }`}
                    >
                      {checked ? "✓" : ""}
                    </span>
                    <span className="truncate">{f.name}</span>
                  </button>
                )
              })}
            </div>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="extraIds">
            Autres amis (identifiants, séparés par des virgules — optionnel)
          </Label>
          <Input
            id="extraIds"
            value={extraIds}
            onChange={(e) => setExtraIds(e.target.value)}
            placeholder="id1, id2"
          />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="maxSize">Taille maximale</Label>
            <Input
              id="maxSize"
              type="number"
              min={2}
              max={8}
              inputMode="numeric"
              value={maxSize}
              onChange={(e) => setMaxSize(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="deadline">Date limite (optionnel)</Label>
            <Input
              id="deadline"
              type="datetime-local"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
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
          {success ? "Créée !" : submitting ? "Création…" : "Créer la sortie"}
        </PremiumButton>
      </form>
    </StickerCard>
  )
}
