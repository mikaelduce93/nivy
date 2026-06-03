"use client"

/**
 * StartGroupBooking — V6 group event booking (issue #237, Flow B).
 *
 * Picks an event (the teen's own or a public one), names the booking, picks
 * friends to invite, and sets an optional max size / deadline. On submit →
 * POST /api/teen/events/groups { action:'create' } → create_group_action with
 * action_type='event' + resource_id=eventId. Redirects to the new booking's
 * detail page so friends can accept and the organizer can finalize.
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
}

export interface BookableEvent {
  id: string
  title: string
  when: string | null
  city: string | null
  price_coins: number
  mine: boolean
}

interface Props {
  events: BookableEvent[]
  friends: FriendOption[]
}

const fmtWhen = (iso: string | null) => {
  if (!iso) return null
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return null
  return d.toLocaleDateString("fr-FR", { day: "numeric", month: "short" })
}

export function StartGroupBooking({ events, friends }: Props) {
  const router = useRouter()
  const [eventId, setEventId] = useState<string>("")
  const [title, setTitle] = useState("")
  const [maxSize, setMaxSize] = useState("")
  const [deadline, setDeadline] = useState("")
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)

  const chosen = events.find((e) => e.id === eventId) ?? null

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

    if (!eventId) {
      setError("Choisis un évènement à réserver.")
      return
    }
    const effectiveTitle = title.trim() || chosen?.title || "Réservation groupée"
    if (effectiveTitle.length < 3) {
      setError("Donne un nom à ta réservation (3 caractères min).")
      return
    }
    let max: number | null = null
    if (maxSize.trim()) {
      max = Number(maxSize)
      if (!Number.isInteger(max) || max < 2) {
        setError("La taille maximale doit être d'au moins 2.")
        return
      }
    }

    setSubmitting(true)
    try {
      const res = await fetch("/api/teen/events/groups", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          action: "create",
          eventId,
          title: effectiveTitle,
          inviteeIds: Array.from(selected),
          maxSize: max,
          deadline: deadline ? new Date(deadline).toISOString() : null,
        }),
      })
      const json = await res.json()
      if (!res.ok || !json?.success) {
        setError(json?.error || "Échec de l'ouverture de la réservation")
        setSubmitting(false)
        return
      }
      setSuccess(true)
      const id = json.group_action_id as string | undefined
      setTimeout(() => {
        router.push(id ? `/teen/events/groups/${id}` : "/teen/events/groups")
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
          <span className="flex items-center gap-2 text-sm font-medium leading-none text-ink">
            Évènement à réserver
          </span>
          <div className="grid max-h-64 grid-cols-1 gap-2 overflow-y-auto">
            {events.map((ev) => {
              const checked = ev.id === eventId
              const when = fmtWhen(ev.when)
              return (
                <button
                  key={ev.id}
                  type="button"
                  onClick={() => setEventId(ev.id)}
                  aria-pressed={checked}
                  className={`flex items-start justify-between gap-3 rounded-xl border-2 border-ink px-3 py-2 text-left transition-all ${
                    checked ? "bg-pink/20" : "bg-white hover:bg-muted"
                  }`}
                >
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-bold text-ink">
                      {ev.title}
                      {ev.mine ? (
                        <span className="ml-2 font-mono text-[10px] uppercase tracking-[0.1em] text-pink">
                          le tien
                        </span>
                      ) : null}
                    </span>
                    <span className="block font-mono text-xs text-mute">
                      {[when, ev.city].filter(Boolean).join(" · ") || "Date à venir"}
                    </span>
                  </span>
                  <span className="shrink-0 font-mono text-xs text-ink">
                    {ev.price_coins > 0 ? `${ev.price_coins} ⊙` : "Gratuit"}
                  </span>
                </button>
              )
            })}
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="title">Nom de la réservation</Label>
          <Input
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={chosen ? chosen.title : "Sortie entre amis"}
            maxLength={120}
          />
        </div>

        <div className="space-y-2">
          <span className="flex items-center gap-2 text-sm font-medium leading-none text-ink">
            Inviter des amis
          </span>
          {friends.length === 0 ? (
            <p className="text-sm text-mute">
              Tu n&apos;as pas encore d&apos;amis à inviter. Tu peux ouvrir la
              réservation et inviter plus tard.
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

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="maxSize">Taille maximale (optionnel)</Label>
            <Input
              id="maxSize"
              type="number"
              min={2}
              max={20}
              inputMode="numeric"
              value={maxSize}
              onChange={(e) => setMaxSize(e.target.value)}
              placeholder="Illimitée"
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
          disabled={submitting || success || !eventId}
        >
          {success ? "Ouverte !" : submitting ? "Ouverture…" : "Ouvrir la réservation"}
        </PremiumButton>
      </form>
    </StickerCard>
  )
}
