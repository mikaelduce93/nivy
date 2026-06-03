"use client"

/**
 * GroupEventActions — V6 group event booking (issue #237).
 *
 * Interactive controls on the booking detail page:
 * - Invitee (status='pending'): Accept / Decline → respond_to_group_invite.
 * - Anyone (status='forming'): size-discount preview → unlock_group_size_rewards.
 * - Organizer (status='forming'): « Finaliser la réservation » →
 *   finalize_group_event_booking, which books each accepted participant, splits
 *   the per-place price (size-discounted) and shows the per-head share.
 *
 * All calls go through POST /api/teen/events/groups and honestly surface the
 * RPC's { success, error } result.
 */
import { useState } from "react"
import { useRouter } from "next/navigation"
import { StickerCard } from "@/components/ui/sticker-card"
import { Button, PremiumButton } from "@/components/ui/button"

interface Props {
  groupActionId: string
  eventId: string | null
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
  share_coins: number
  discount_pct: number
}

export function GroupEventActions({
  groupActionId,
  eventId,
  status,
  isOrganizer,
  myInviteStatus,
  acceptedCount,
}: Props) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const post = async (payload: Record<string, unknown>) => {
    const res = await fetch("/api/teen/events/groups", {
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
  const [finalized, setFinalized] = useState<FinalizeResult | null>(null)
  const finalize = async () => {
    setError(null)
    if (!eventId) {
      setError("Aucun évènement rattaché à cette réservation.")
      return
    }
    if (acceptedCount === 0) {
      setError("Personne n'a encore accepté — attends au moins un participant.")
      return
    }
    setBusy(true)
    const { ok, json } = await post({ action: "finalize", groupActionId, eventId })
    setBusy(false)
    if (!ok) {
      setError(json?.error || "Échec de la finalisation")
      return
    }
    setFinalized({
      participant_count: json.participant_count ?? 0,
      share_coins: json.share_coins ?? 0,
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

      {!isOrganizer && myInviteStatus === "accepted" && isForming && (
        <p className="text-sm text-mute">
          Tu as accepté cette réservation. L&apos;organisateur la finalisera et ta
          place sera réservée — ton parent peut s&apos;y opposer.
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
                Plus vous êtes nombreux, plus la place est remisée. Affiche un aperçu
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
            Finaliser la réservation
          </h2>
          <StickerCard className="gap-3 p-6">
            <p className="text-sm text-mute">
              Chaque participant ayant accepté réserve sa place au prix remisé. La
              part en coins est prélevée à chacun et son parent peut s&apos;y opposer.
            </p>
            <PremiumButton
              type="button"
              loading={busy}
              disabled={busy || acceptedCount === 0}
              onClick={finalize}
            >
              Réserver pour le groupe
            </PremiumButton>
            {acceptedCount === 0 && (
              <p className="text-xs text-mute">
                Attends qu&apos;au moins un ami accepte avant de finaliser.
              </p>
            )}
          </StickerCard>
        </section>
      )}

      {/* Finalize result */}
      {finalized && (
        <StickerCard variant="panel" className="gap-1 p-4">
          <p className="font-display text-lg font-extrabold text-ink">
            Réservation confirmée !
          </p>
          <p className="font-mono text-sm text-ink">
            {finalized.participant_count} places · remise -{finalized.discount_pct}%
          </p>
          <p className="font-mono text-sm text-ink">
            Part par tête :{" "}
            <strong className="text-pink">{finalized.share_coins} coins ⊙</strong>
          </p>
        </StickerCard>
      )}

      {!isForming && !finalized && (
        <p className="text-sm text-mute">
          Cette réservation n&apos;est plus en préparation
          {status === "completed" ? " — les places ont été réservées." : "."}
        </p>
      )}
    </div>
  )
}
