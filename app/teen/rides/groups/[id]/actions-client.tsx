"use client"

/**
 * GroupRideActions — V6 group rides (issue #235).
 *
 * Interactive controls on the group-ride detail page:
 * - Invitee (status='pending'): Accept / Decline → respond_to_group_invite.
 * - Anyone (status='forming'): size-discount preview → unlock_group_size_rewards.
 * - Organizer (status='forming'): finalize form (pickup/dropoff/time/total DH)
 *   → finalize_group_ride, which splits the cost and shows the per-head share.
 *
 * All calls go through POST /api/teen/rides/groups and honestly surface the
 * RPC's { success, error } result.
 */
import { useState } from "react"
import { useRouter } from "next/navigation"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { StickerCard } from "@/components/ui/sticker-card"
import { Button, PremiumButton } from "@/components/ui/button"

interface Props {
  groupActionId: string
  status: string
  isOrganizer: boolean
  myInviteStatus: string | null
  acceptedCount: number
  pendingCount: number
}

interface PreviewResult {
  group_size: number
  discount_pct: number
  bonus_xp: number
}

interface FinalizeResult {
  participant_count: number
  total_coins: number
  discount_pct: number
}

export function GroupRideActions({
  groupActionId,
  status,
  isOrganizer,
  myInviteStatus,
}: Props) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const post = async (payload: Record<string, unknown>) => {
    const res = await fetch("/api/teen/rides/groups", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    })
    const json = await res.json()
    return { ok: res.ok && json?.success === true, json }
  }

  // --- Accept / decline (invitee) -----------------------------------------
  const respond = async (response: "accept" | "decline") => {
    setError(null)
    setBusy(true)
    const { ok, json } = await post({ action: "respond", groupActionId, response })
    setBusy(false)
    if (!ok) {
      setError(json?.error || "Échec de la réponse")
      return
    }
    router.refresh()
  }

  // --- Size-discount preview ----------------------------------------------
  const [preview, setPreview] = useState<PreviewResult | null>(null)
  const loadPreview = async () => {
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

  // --- Finalize (organizer) -----------------------------------------------
  const [pickup, setPickup] = useState("")
  const [dropoff, setDropoff] = useState("")
  const [scheduledFor, setScheduledFor] = useState("")
  const [totalDh, setTotalDh] = useState("")
  const [finalized, setFinalized] = useState<FinalizeResult | null>(null)

  const finalize = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    if (pickup.trim().length < 3 || dropoff.trim().length < 3) {
      setError("Indique le point de départ et la destination.")
      return
    }
    if (!scheduledFor) {
      setError("Choisis une date et une heure.")
      return
    }
    setBusy(true)
    const { ok, json } = await post({
      action: "finalize",
      groupActionId,
      pickup: pickup.trim(),
      dropoff: dropoff.trim(),
      scheduledFor: new Date(scheduledFor).toISOString(),
      totalDh: totalDh ? Number(totalDh) : 0,
    })
    setBusy(false)
    if (!ok) {
      setError(json?.error || "Échec de la finalisation")
      return
    }
    setFinalized({
      participant_count: json.participant_count ?? 0,
      total_coins: json.total_coins ?? 0,
      discount_pct: json.discount_pct ?? 0,
    })
    router.refresh()
  }

  const isForming = status === "forming"
  const canRespond = !isOrganizer && myInviteStatus === "pending" && isForming

  return (
    <div className="space-y-6">
      {error && (
        <p role="alert" aria-live="polite" className="text-sm text-destructive">
          {error}
        </p>
      )}

      {/* Invitee response */}
      {canRespond && (
        <section className="space-y-3">
          <h2 className="font-mono text-[12px] font-bold uppercase tracking-[0.16em] text-mute">
            Ta réponse
          </h2>
          <div className="flex gap-3">
            <Button
              variant="pink"
              className="flex-1 min-h-11"
              disabled={busy}
              onClick={() => respond("accept")}
            >
              Accepter
            </Button>
            <Button
              variant="outline"
              className="flex-1 min-h-11"
              disabled={busy}
              onClick={() => respond("decline")}
            >
              Refuser
            </Button>
          </div>
        </section>
      )}

      {!isOrganizer && myInviteStatus === "accepted" && (
        <p className="text-sm text-mute">
          Tu as accepté cette sortie. L&apos;organisateur finalisera le trajet et le
          partage de la note.
        </p>
      )}

      {/* Size-discount preview — available while forming */}
      {isForming && (
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
                Plus vous êtes nombreux, plus la remise est grande. Affiche un aperçu
                avant de finaliser.
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
      )}

      {/* Finalize — organizer only, while forming */}
      {isOrganizer && isForming && !finalized && (
        <section className="space-y-3">
          <h2 className="font-mono text-[12px] font-bold uppercase tracking-[0.16em] text-mute">
            Finaliser la course
          </h2>
          <StickerCard className="p-6">
            <form onSubmit={finalize} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="pickup">Lieu de prise en charge</Label>
                <Input
                  id="pickup"
                  value={pickup}
                  onChange={(e) => setPickup(e.target.value)}
                  autoComplete="street-address"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="dropoff">Destination</Label>
                <Input
                  id="dropoff"
                  value={dropoff}
                  onChange={(e) => setDropoff(e.target.value)}
                  autoComplete="street-address"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="scheduledFor">Date et heure</Label>
                <Input
                  id="scheduledFor"
                  type="datetime-local"
                  value={scheduledFor}
                  onChange={(e) => setScheduledFor(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="totalDh">Coût total estimé (DH)</Label>
                <Input
                  id="totalDh"
                  type="number"
                  min={0}
                  inputMode="decimal"
                  value={totalDh}
                  onChange={(e) => setTotalDh(e.target.value)}
                />
              </div>
              <PremiumButton type="submit" loading={busy} disabled={busy}>
                Finaliser et répartir la note
              </PremiumButton>
              <p className="text-xs text-mute">
                La note est répartie entre les participants ayant accepté. Chacun
                paie sa part en coins et son parent peut s&apos;y opposer.
              </p>
            </form>
          </StickerCard>
        </section>
      )}

      {/* Finalize result */}
      {finalized && (
        <StickerCard variant="panel" className="gap-1 p-4">
          <p className="font-display text-lg font-extrabold text-ink">
            Course finalisée !
          </p>
          <p className="font-mono text-sm text-ink">
            {finalized.participant_count} participants · remise -{finalized.discount_pct}%
          </p>
          <p className="font-mono text-sm text-ink">
            Total : {finalized.total_coins} coins ⊙ · part par tête :{" "}
            <strong className="text-pink">
              {finalized.participant_count > 0
                ? Math.round(finalized.total_coins / finalized.participant_count)
                : finalized.total_coins}{" "}
              coins ⊙
            </strong>
          </p>
        </StickerCard>
      )}

      {!isForming && !finalized && (
        <p className="text-sm text-mute">
          Cette sortie n&apos;est plus en préparation
          {status === "confirmed" ? " — la course a été finalisée." : "."}
        </p>
      )}
    </div>
  )
}
