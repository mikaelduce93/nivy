"use client"

/**
 * CollectiveBirthday — V6 collective birthday (issue #240).
 *
 * Single-page flow (no detail route — this is the smallest pillar):
 * 1. Pick one of the teen's existing anniv_orders (or, if none, an empty state
 *    pointing to /teen/birthday to create a birthday order first).
 * 2. Invite friends (checkbox picker) → POST { action:'create' }
 *    (create_group_action 'anniv', resource_id = the chosen anniv_order_id).
 * 3. Existing groups list: invitees Accept/Decline, anyone previews the size
 *    discount, the organizer finalizes (finalize_group_anniv) which splits the
 *    contributions. Each guest's contribution share is shown after finalize.
 *
 * All writes go through POST /api/teen/birthday/group and honestly surface the
 * RPC's { success, error } result. Charte paper UI kit only.
 */
import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { StickerCard } from "@/components/ui/sticker-card"
import { Button, PremiumButton } from "@/components/ui/button"
import { NivCoach, NivEmpty } from "@/components/brand"

export interface AnnivOrderOption {
  id: string
  party_date: string | null
  total_dh: number | null
  status: string | null
}

export interface FriendOption {
  id: string
  name: string
  avatar_url: string | null
}

export interface GroupInvite {
  id: string
  teen_id: string
  status: string
  is_organizer: boolean
  share_coins: number | null
  name: string
}

export interface GroupAttendee {
  teen_id: string
  contribution_coins: number
  status: string
}

export interface GroupActionView {
  id: string
  title: string | null
  status: string
  max_size: number | null
  resource_id: string | null
  total_coins: number | null
  is_organizer: boolean
  my_status: string | null
  invites: GroupInvite[]
  attendees: GroupAttendee[]
}

interface Props {
  orders: AnnivOrderOption[]
  friends: FriendOption[]
  groups: GroupActionView[]
}

// 100 coins = 1 DH.
const COINS_PER_DH = 100

const ORDER_STATUS: Record<string, string> = {
  pending: "En attente",
  confirmed: "Confirmée",
  paid: "Payée",
  cancelled: "Annulée",
}

const GROUP_STATUS: Record<string, { label: string; cls: string }> = {
  draft: { label: "Brouillon", cls: "bg-muted text-mute border-ink" },
  forming: { label: "En préparation", cls: "bg-gold/15 text-ink border-ink" },
  confirmed: { label: "Confirmée", cls: "bg-teal/15 text-ink border-ink" },
  completed: { label: "Terminée", cls: "bg-lime/15 text-ink border-ink" },
  cancelled: { label: "Annulée", cls: "bg-muted text-mute border-ink" },
}

const INVITE_STATUS: Record<string, { label: string; cls: string }> = {
  accepted: { label: "Confirmé", cls: "bg-lime/15 text-ink border-ink" },
  pending: { label: "En attente", cls: "bg-gold/15 text-ink border-ink" },
  declined: { label: "Refusé", cls: "bg-muted text-mute border-ink" },
  expired: { label: "Expiré", cls: "bg-muted text-mute border-ink" },
}

function formatDate(value: string | null): string {
  if (!value) return "Date à définir"
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return value
  return d.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })
}

export function CollectiveBirthday({ orders, friends, groups }: Props) {
  if (orders.length === 0) {
    return (
      <NivEmpty
        mood="calm"
        title="Aucune réservation d'anniversaire"
        description="Pour organiser une participation collective, crée d'abord une réservation d'anniversaire. Tu pourras ensuite inviter tes amis à partager la note."
        action={
          <Button asChild variant="pink" className="min-h-11">
            <Link href="/teen/birthday">Réserver mon anniversaire</Link>
          </Button>
        }
      />
    )
  }

  return (
    <div className="space-y-8">
      <CreateGroupSection orders={orders} friends={friends} />
      <GroupsSection orders={orders} groups={groups} />
    </div>
  )
}

// ---------------------------------------------------------------------------
// Create — pick an order + invite friends → create_group_action('anniv')
// ---------------------------------------------------------------------------
function CreateGroupSection({
  orders,
  friends,
}: {
  orders: AnnivOrderOption[]
  friends: FriendOption[]
}) {
  const router = useRouter()
  const [orderId, setOrderId] = useState(orders[0]?.id ?? "")
  const [title, setTitle] = useState("")
  const [selected, setSelected] = useState<Set<string>>(new Set())
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
    if (!orderId) {
      setError("Choisis une réservation d'anniversaire.")
      return
    }
    if (title.trim().length < 3) {
      setError("Donne un titre à ta participation (3 caractères min).")
      return
    }
    const inviteeIds = Array.from(selected)

    setSubmitting(true)
    try {
      const res = await fetch("/api/teen/birthday/group", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          action: "create",
          title: title.trim(),
          annivOrderId: orderId,
          inviteeIds,
        }),
      })
      const json = await res.json()
      if (!res.ok || !json?.success) {
        setError(json?.error || "Échec de la création")
        setSubmitting(false)
        return
      }
      setSuccess(true)
      setTimeout(() => router.refresh(), 600)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur réseau")
      setSubmitting(false)
    }
  }

  return (
    <section className="space-y-3">
      <h2 className="font-mono text-[12px] font-bold uppercase tracking-[0.16em] text-mute">
        Lancer une participation collective
      </h2>
      <NivCoach
        mood="happy"
        message="Choisis une de tes réservations, coche les amis à inviter. Ils acceptent de participer, puis tu finalises pour répartir la note avec la remise de groupe."
      />
      <StickerCard className="p-6">
        <form onSubmit={onSubmit} className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="order">Réservation d&apos;anniversaire</Label>
            <select
              id="order"
              value={orderId}
              onChange={(e) => setOrderId(e.target.value)}
              className="w-full rounded-xl border-2 border-ink bg-white px-3 py-2.5 text-sm font-semibold text-ink"
            >
              {orders.map((o) => (
                <option key={o.id} value={o.id}>
                  {formatDate(o.party_date)}
                  {o.total_dh != null ? ` · ${o.total_dh} DH` : ""}
                  {o.status ? ` · ${ORDER_STATUS[o.status] ?? o.status}` : ""}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="title">Nom de la participation</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Anniv de Sami, on partage…"
              maxLength={120}
            />
          </div>

          <div className="space-y-2">
            <span className="flex items-center gap-2 text-sm font-medium leading-none text-ink">
              Inviter des amis
            </span>
            {friends.length === 0 ? (
              <p className="text-sm text-mute">
                Tu n&apos;as pas encore d&apos;amis à inviter. Tu peux quand même lancer
                la participation et ajouter des amis plus tard.
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
            {success ? "Lancée !" : submitting ? "Création…" : "Lancer la participation"}
          </PremiumButton>
        </form>
      </StickerCard>
    </section>
  )
}

// ---------------------------------------------------------------------------
// Groups — existing `anniv` group_actions (organized + invited)
// ---------------------------------------------------------------------------
function GroupsSection({
  orders,
  groups,
}: {
  orders: AnnivOrderOption[]
  groups: GroupActionView[]
}) {
  if (groups.length === 0) {
    return (
      <section className="space-y-3">
        <h2 className="font-mono text-[12px] font-bold uppercase tracking-[0.16em] text-mute">
          Mes participations
        </h2>
        <NivEmpty
          mood="calm"
          title="Aucune participation en cours"
          description="Lance une participation collective ci-dessus, ou attends qu'un ami t'invite à partager la note d'un anniversaire."
        />
      </section>
    )
  }

  return (
    <section className="space-y-3">
      <h2 className="font-mono text-[12px] font-bold uppercase tracking-[0.16em] text-mute">
        Mes participations
      </h2>
      <div className="space-y-4">
        {groups.map((g) => (
          <GroupCard key={g.id} group={g} orders={orders} />
        ))}
      </div>
    </section>
  )
}

interface PreviewResult {
  group_size: number
  discount_pct: number
  bonus_xp: number
}

function GroupCard({ group, orders }: { group: GroupActionView; orders: AnnivOrderOption[] }) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [preview, setPreview] = useState<PreviewResult | null>(null)

  const order = orders.find((o) => o.id === group.resource_id) ?? null
  const status = GROUP_STATUS[group.status] ?? {
    label: group.status,
    cls: "bg-muted text-mute border-ink",
  }
  const isForming = group.status === "forming"
  const accepted = group.invites.filter((i) => i.status === "accepted").length
  const canRespond = !group.is_organizer && group.my_status === "pending" && isForming
  const isFinalized = group.status === "completed" || group.attendees.length > 0

  const post = async (payload: Record<string, unknown>) => {
    const res = await fetch("/api/teen/birthday/group", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    })
    const json = await res.json()
    return { ok: res.ok && json?.success === true, json }
  }

  const respond = async (response: "accept" | "decline") => {
    setError(null)
    setBusy(true)
    const { ok, json } = await post({ action: "respond", groupActionId: group.id, response })
    setBusy(false)
    if (!ok) {
      setError(json?.error || "Échec de la réponse")
      return
    }
    router.refresh()
  }

  const loadPreview = async () => {
    setError(null)
    setBusy(true)
    const { ok, json } = await post({ action: "preview", groupActionId: group.id })
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

  const finalize = async () => {
    setError(null)
    if (!group.resource_id) {
      setError("Réservation introuvable pour cette participation.")
      return
    }
    setBusy(true)
    const { ok, json } = await post({
      action: "finalize",
      groupActionId: group.id,
      annivOrderId: group.resource_id,
      totalDh: order?.total_dh ?? 0,
    })
    setBusy(false)
    if (!ok) {
      setError(json?.error || "Échec de la finalisation")
      return
    }
    router.refresh()
  }

  return (
    <StickerCard className="gap-4 p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="line-clamp-2 break-words text-sm font-bold text-ink">
            {group.title || "Participation sans titre"}
          </p>
          <p className="mt-1 font-mono text-xs text-mute">
            {[
              group.is_organizer ? "Organisateur" : "Invité",
              `${accepted}/${group.invites.length} confirmés`,
              order ? formatDate(order.party_date) : null,
            ]
              .filter(Boolean)
              .join(" · ")}
          </p>
        </div>
        <span
          className={`inline-flex shrink-0 items-center rounded-full border-2 px-2.5 py-0.5 font-mono text-[10px] font-bold uppercase tracking-[0.1em] ${status.cls}`}
        >
          {status.label}
        </span>
      </div>

      {/* Roster */}
      <ul className="space-y-1.5">
        {group.invites.map((inv) => {
          const st = INVITE_STATUS[inv.status] ?? {
            label: inv.status,
            cls: "bg-muted text-mute border-ink",
          }
          const attendee = group.attendees.find((a) => a.teen_id === inv.teen_id)
          const shareCoins = attendee?.contribution_coins ?? inv.share_coins ?? null
          return (
            <li key={inv.id} className="flex items-center justify-between gap-3 text-sm">
              <span className="min-w-0 truncate font-semibold text-ink">
                {inv.name}
                {inv.is_organizer ? (
                  <span className="ml-2 font-mono text-[10px] uppercase tracking-[0.1em] text-pink">
                    organisateur
                  </span>
                ) : null}
              </span>
              <span className="flex shrink-0 items-center gap-2">
                {shareCoins != null ? (
                  <span className="font-mono text-xs text-mute">
                    {shareCoins} ⊙ ({(shareCoins / COINS_PER_DH).toFixed(2)} DH)
                  </span>
                ) : null}
                <span
                  className={`inline-flex items-center rounded-full border-2 px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-[0.1em] ${st.cls}`}
                >
                  {st.label}
                </span>
              </span>
            </li>
          )
        })}
      </ul>

      {error && (
        <p role="alert" aria-live="polite" className="text-sm text-destructive">
          {error}
        </p>
      )}

      {/* Invitee response */}
      {canRespond && (
        <div className="flex gap-3">
          <Button
            variant="pink"
            className="min-h-11 flex-1"
            disabled={busy}
            onClick={() => respond("accept")}
          >
            Accepter
          </Button>
          <Button
            variant="outline"
            className="min-h-11 flex-1"
            disabled={busy}
            onClick={() => respond("decline")}
          >
            Refuser
          </Button>
        </div>
      )}

      {!group.is_organizer && group.my_status === "accepted" && !isFinalized && (
        <p className="text-sm text-mute">
          Tu participes à cet anniversaire. L&apos;organisateur finalisera la
          répartition de la note.
        </p>
      )}

      {/* Size-discount preview — while forming */}
      {isForming && (
        <div className="space-y-2">
          {preview ? (
            <div className="rounded-xl border-2 border-ink bg-white p-3 font-mono text-sm text-ink">
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
          ) : null}
          <Button
            variant="outline"
            className="min-h-11"
            disabled={busy}
            onClick={loadPreview}
          >
            {preview ? "Actualiser l'aperçu" : "Voir la remise de groupe"}
          </Button>
        </div>
      )}

      {/* Finalize — organizer only, while forming */}
      {group.is_organizer && isForming && (
        <div className="space-y-2">
          <PremiumButton type="button" loading={busy} disabled={busy} onClick={finalize}>
            Finaliser et répartir la note
          </PremiumButton>
          <p className="text-xs text-mute">
            La note ({order?.total_dh != null ? `${order.total_dh} DH` : "totale"}) est
            répartie entre les participants ayant accepté, après remise de groupe.
            Chacun paie sa part en coins et son parent peut s&apos;y opposer.
          </p>
        </div>
      )}

      {/* Finalized summary */}
      {isFinalized && (
        <div className="rounded-xl border-2 border-ink bg-lime/10 p-3">
          <p className="font-display text-sm font-extrabold text-ink">
            Participation finalisée
          </p>
          <p className="mt-1 font-mono text-xs text-ink">
            {group.attendees.length} participants · total{" "}
            {group.total_coins != null
              ? `${group.total_coins} ⊙ (${(group.total_coins / COINS_PER_DH).toFixed(2)} DH)`
              : "réparti"}
          </p>
        </div>
      )}
    </StickerCard>
  )
}
