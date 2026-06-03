"use client"

/**
 * VenueReserveActions — V6 partner venue group booking (issue #238).
 *
 * Single-page group-reserve flow for a venue:
 *  1. The teen picks a slot, names the outing, and invites friends → creates a
 *     'venue_booking' group_action (the teen is organizer + auto-accepted).
 *  2. Once a group is forming, the organizer can preview the size discount
 *     (unlock_group_size_rewards) and, when friends have accepted, reserve the
 *     chosen slot for the whole group (reserve_group_venue_slot).
 *
 * All calls go through POST /api/teen/venues and honestly surface the RPC's
 * { success, error } result — no fabricated success.
 */
import { useState } from "react"
import { useRouter } from "next/navigation"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { StickerCard } from "@/components/ui/sticker-card"
import { NivEmpty } from "@/components/brand"
import { Button, PremiumButton } from "@/components/ui/button"

export interface FriendOption {
  id: string
  name: string
  avatar_url: string | null
}

export interface SlotOption {
  id: string
  title: string | null
  starts_at: string
  capacity: number
  booked: number
  price_coins: number
}

interface Props {
  slots: SlotOption[]
  friends: FriendOption[]
}

interface PreviewResult {
  group_size: number
  discount_pct: number
  bonus_xp: number
}

interface ReserveResult {
  participant_count: number
  share_coins: number
  discount_pct: number
}

function formatSlot(s: SlotOption) {
  try {
    return new Date(s.starts_at).toLocaleString("fr-FR", {
      weekday: "short",
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    })
  } catch {
    return s.starts_at
  }
}

export function VenueReserveActions({ slots, friends }: Props) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Create-group state.
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null)
  const [title, setTitle] = useState("")
  const [selectedFriends, setSelectedFriends] = useState<Set<string>>(new Set())

  // Once a group is created we keep its id to preview / reserve.
  const [groupActionId, setGroupActionId] = useState<string | null>(null)
  const [preview, setPreview] = useState<PreviewResult | null>(null)
  const [reserved, setReserved] = useState<ReserveResult | null>(null)

  const post = async (payload: Record<string, unknown>) => {
    const res = await fetch("/api/teen/venues", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    })
    const json = await res.json()
    return { ok: res.ok && json?.success === true, json }
  }

  const toggleFriend = (id: string) => {
    setSelectedFriends((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const chosenSlot = slots.find((s) => s.id === selectedSlot) ?? null

  // --- 1. Create the group ('venue_booking') ------------------------------
  const createGroup = async () => {
    setError(null)
    if (!selectedSlot) {
      setError("Choisis d'abord un créneau.")
      return
    }
    if (title.trim().length < 3) {
      setError("Donne un nom à ta réservation (3 caractères min).")
      return
    }
    setBusy(true)
    const { ok, json } = await post({
      action: "create",
      title: title.trim(),
      inviteeIds: Array.from(selectedFriends),
      maxSize: chosenSlot ? Math.max(2, chosenSlot.capacity - chosenSlot.booked) : 4,
    })
    setBusy(false)
    if (!ok) {
      setError(json?.error || "Échec de la création du groupe")
      return
    }
    setGroupActionId((json.group_action_id as string) ?? null)
  }

  // --- 2. Preview the size discount ---------------------------------------
  const loadPreview = async () => {
    if (!groupActionId) return
    setError(null)
    setBusy(true)
    const { ok, json } = await post({ action: "preview", groupActionId })
    setBusy(false)
    if (!ok) {
      setError(json?.error || "Aperçu indisponible")
      return
    }
    setPreview({
      group_size: json.group_size ?? 0,
      discount_pct: json.discount_pct ?? 0,
      bonus_xp: json.bonus_xp ?? 0,
    })
  }

  // --- 3. Reserve the slot for the group ----------------------------------
  const reserve = async () => {
    if (!groupActionId || !selectedSlot) return
    setError(null)
    setBusy(true)
    const { ok, json } = await post({
      action: "reserve",
      groupActionId,
      slotId: selectedSlot,
    })
    setBusy(false)
    if (!ok) {
      setError(json?.error || "Échec de la réservation")
      return
    }
    setReserved({
      participant_count: json.participant_count ?? 0,
      share_coins: json.share_coins ?? 0,
      discount_pct: json.discount_pct ?? 0,
    })
    router.refresh()
  }

  // No slots yet → graceful empty state (expected when nothing is seeded).
  if (slots.length === 0) {
    return (
      <NivEmpty
        mood="calm"
        title="Aucun créneau disponible"
        description="Ce lieu n'a pas encore publié de créneaux réservables. Reviens bientôt pour réserver avec tes amis."
      />
    )
  }

  // Reservation confirmed.
  if (reserved) {
    return (
      <StickerCard variant="panel" className="gap-1 p-4">
        <p className="font-display text-lg font-extrabold text-ink">Réservation confirmée !</p>
        <p className="font-mono text-sm text-ink">
          {reserved.participant_count} participants · remise -{reserved.discount_pct}%
        </p>
        <p className="font-mono text-sm text-ink">
          Part par tête :{" "}
          <strong className="text-pink">{reserved.share_coins} coins ⊙</strong>
        </p>
        <p className="mt-1 text-xs text-mute">
          Chaque participant paie sa part en coins et son parent peut s&apos;y opposer.
        </p>
      </StickerCard>
    )
  }

  return (
    <div className="space-y-6">
      {error && (
        <p role="alert" aria-live="polite" className="text-sm text-destructive">
          {error}
        </p>
      )}

      {/* Slots */}
      <section className="space-y-3">
        <h2 className="font-mono text-[12px] font-bold uppercase tracking-[0.16em] text-mute">
          Créneaux
        </h2>
        <div className="space-y-2">
          {slots.map((s) => {
            const remaining = Math.max(0, s.capacity - s.booked)
            const full = remaining === 0
            const checked = selectedSlot === s.id
            const locked = groupActionId !== null
            return (
              <button
                key={s.id}
                type="button"
                disabled={full || locked}
                onClick={() => setSelectedSlot(s.id)}
                aria-pressed={checked}
                className={`flex w-full items-center justify-between gap-3 rounded-2xl border-2 border-ink p-4 text-left transition-all disabled:cursor-not-allowed disabled:opacity-60 ${
                  checked ? "bg-pink/20" : "bg-white hover:bg-muted"
                }`}
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-ink">
                    {s.title || "Créneau"}
                  </p>
                  <p className="font-mono text-xs text-mute">{formatSlot(s)}</p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="font-mono text-sm font-bold text-ink">{s.price_coins} ⊙</p>
                  <p className="font-mono text-[11px] text-mute">
                    {full ? "complet" : `${remaining} place${remaining > 1 ? "s" : ""}`}
                  </p>
                </div>
              </button>
            )
          })}
        </div>
      </section>

      {/* Step 1 — name + invite + create group (before a group exists) */}
      {!groupActionId && (
        <section className="space-y-3">
          <h2 className="font-mono text-[12px] font-bold uppercase tracking-[0.16em] text-mute">
            Réserver à plusieurs
          </h2>
          <StickerCard className="space-y-5 p-6">
            <div className="space-y-2">
              <Label htmlFor="venue-title">Nom de la réservation</Label>
              <Input
                id="venue-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Anniv, sortie entre amis…"
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
                  le groupe et inviter plus tard.
                </p>
              ) : (
                <div className="grid max-h-56 grid-cols-1 gap-2 overflow-y-auto sm:grid-cols-2">
                  {friends.map((f) => {
                    const checked = selectedFriends.has(f.id)
                    return (
                      <button
                        key={f.id}
                        type="button"
                        onClick={() => toggleFriend(f.id)}
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

            <PremiumButton
              type="button"
              onClick={createGroup}
              loading={busy}
              disabled={busy || !selectedSlot}
            >
              Créer le groupe
            </PremiumButton>
            <p className="text-xs text-mute">
              Tes amis reçoivent une invitation à accepter. Une fois le groupe formé,
              tu finalises la réservation du créneau.
            </p>
          </StickerCard>
        </section>
      )}

      {/* Step 2 + 3 — preview discount + reserve (group exists) */}
      {groupActionId && (
        <>
          <section className="space-y-3">
            <h2 className="font-mono text-[12px] font-bold uppercase tracking-[0.16em] text-mute">
              Remise selon la taille
            </h2>
            <StickerCard variant="panel" className="gap-2 p-4">
              {preview ? (
                <div className="font-mono text-sm text-ink">
                  <p>
                    Groupe : <strong>{preview.group_size}</strong> participants
                  </p>
                  <p>
                    Remise : <strong className="text-pink">-{preview.discount_pct}%</strong>
                  </p>
                  <p>
                    Bonus XP : <strong>{preview.bonus_xp}</strong>
                  </p>
                </div>
              ) : (
                <p className="text-sm text-mute">
                  Plus vous êtes nombreux à accepter, plus la remise est grande. Affiche
                  un aperçu avant de réserver.
                </p>
              )}
              <Button
                variant="outline"
                className="mt-1 min-h-11"
                disabled={busy}
                onClick={loadPreview}
              >
                {preview ? "Actualiser l'aperçu" : "Voir la remise"}
              </Button>
            </StickerCard>
          </section>

          <section className="space-y-3">
            <h2 className="font-mono text-[12px] font-bold uppercase tracking-[0.16em] text-mute">
              Finaliser la réservation
            </h2>
            <StickerCard className="gap-3 p-6">
              <p className="text-sm text-mute">
                Une fois tes amis ayant accepté, réserve le créneau pour tout le groupe.
                La note est répartie entre les participants confirmés.
              </p>
              <PremiumButton type="button" onClick={reserve} loading={busy} disabled={busy}>
                Réserver le créneau
              </PremiumButton>
            </StickerCard>
          </section>
        </>
      )}
    </div>
  )
}
