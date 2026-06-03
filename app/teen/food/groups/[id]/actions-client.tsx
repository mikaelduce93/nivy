"use client"

/**
 * GroupFoodActions — V6 group food orders (issue #236).
 *
 * Interactive controls on the group-food detail page:
 * - Invitee (status='pending'): Accept / Decline → respond_to_group_invite.
 * - Anyone (status='forming'): size-discount preview → unlock_group_size_rewards.
 * - Organizer (status='forming'): finalize flow — pick a partner restaurant,
 *   build an item cart from its menu_items (fetched from the existing
 *   GET /api/teen/food/menu/:partner_id route), choose a delivery type, then
 *   finalize → finalize_group_food_order (splits the bill per head).
 *
 * All mutations go through POST /api/teen/food/groups and honestly surface the
 * RPC's { success, error } result.
 */
import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { StickerCard } from "@/components/ui/sticker-card"
import { Button, PremiumButton } from "@/components/ui/button"

export interface PartnerOption {
  id: string
  name: string
  sub_category: string | null
}

interface ExistingOrder {
  id: string
  total_coins: number
  status: string
  delivery_type: string
}

interface Props {
  groupActionId: string
  status: string
  isOrganizer: boolean
  myInviteStatus: string | null
  acceptedCount: number
  pendingCount: number
  partners: PartnerOption[]
  existingOrder: ExistingOrder | null
}

interface PreviewResult {
  group_size: number
  discount_pct: number
  bonus_xp: number
}

interface FinalizeResult {
  food_order_id: string
  participant_count: number
  total_coins: number
  discount_pct: number
}

interface MenuItem {
  id: string
  name: string
  description: string | null
  price_dh: number
  price_coins: number | null
  is_halal: boolean
}

type DeliveryType = "delivery" | "pickup" | "dine_in"

const DELIVERY_LABELS: Record<DeliveryType, string> = {
  pickup: "À emporter",
  delivery: "Livraison",
  dine_in: "Sur place",
}

export function GroupFoodActions({
  groupActionId,
  status,
  isOrganizer,
  myInviteStatus,
  acceptedCount,
  partners,
  existingOrder,
}: Props) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const post = async (payload: Record<string, unknown>) => {
    const res = await fetch("/api/teen/food/groups", {
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
  const loadPreview = async (partnerId?: string | null) => {
    setError(null)
    setBusy(true)
    const { ok, json } = await post({
      action: "preview",
      groupActionId,
      partnerId: partnerId ?? null,
    })
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

  // --- Finalize (organizer): resto picker + menu cart ----------------------
  const [partnerId, setPartnerId] = useState("")
  const [menu, setMenu] = useState<MenuItem[]>([])
  const [menuLoading, setMenuLoading] = useState(false)
  const [cart, setCart] = useState<Record<string, number>>({})
  const [deliveryType, setDeliveryType] = useState<DeliveryType>("pickup")
  const [address, setAddress] = useState("")
  const [finalized, setFinalized] = useState<FinalizeResult | null>(null)

  const onPickPartner = async (id: string) => {
    setPartnerId(id)
    setCart({})
    setMenu([])
    if (!id) return
    setError(null)
    setMenuLoading(true)
    try {
      const res = await fetch(`/api/teen/food/menu/${id}`)
      const json = await res.json()
      if (!res.ok || !json?.success) {
        setError(json?.error || "Menu indisponible pour ce resto")
        setMenuLoading(false)
        return
      }
      setMenu((json.data ?? []) as MenuItem[])
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur réseau")
    }
    setMenuLoading(false)
  }

  const addToCart = (itemId: string) =>
    setCart((c) => ({ ...c, [itemId]: (c[itemId] ?? 0) + 1 }))
  const removeFromCart = (itemId: string) =>
    setCart((c) => ({ ...c, [itemId]: Math.max(0, (c[itemId] ?? 0) - 1) }))

  const coinsOf = (it: MenuItem) =>
    it.price_coins ?? Math.round((it.price_dh ?? 0) * 100)

  const totalCoins = useMemo(
    () =>
      Object.entries(cart).reduce((sum, [id, qty]) => {
        const it = menu.find((x) => x.id === id)
        return sum + (it ? coinsOf(it) * qty : 0)
      }, 0),
    [cart, menu]
  )

  const cartCount = useMemo(
    () => Object.values(cart).reduce((s, q) => s + q, 0),
    [cart]
  )

  const finalize = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    if (!partnerId) {
      setError("Choisis un restaurant.")
      return
    }
    const items = Object.entries(cart)
      .filter(([, qty]) => qty > 0)
      .map(([menu_item_id, qty]) => {
        const it = menu.find((x) => x.id === menu_item_id)
        return {
          menu_item_id,
          qty,
          unit_price_coins: it ? coinsOf(it) : 0,
          unit_price_dh: it?.price_dh ?? 0,
        }
      })
    if (items.length === 0) {
      setError("Ajoute au moins un article au panier.")
      return
    }
    if (deliveryType === "delivery" && address.trim().length < 5) {
      setError("Indique l'adresse de livraison.")
      return
    }
    setBusy(true)
    const { ok, json } = await post({
      action: "finalize",
      groupActionId,
      partnerId,
      deliveryType,
      items,
      address: deliveryType === "delivery" ? address.trim() : null,
    })
    setBusy(false)
    if (!ok) {
      setError(json?.error || "Échec de la finalisation")
      return
    }
    setFinalized({
      food_order_id: json.food_order_id ?? "",
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
          Tu as accepté cette commande. L&apos;organisateur choisit le resto, le menu
          et le partage de la note.
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
              onClick={() => loadPreview(partnerId || null)}
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
            Choisir le resto et finaliser
          </h2>
          <StickerCard className="p-6">
            <form onSubmit={finalize} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="partner">Restaurant</Label>
                {partners.length === 0 ? (
                  <p className="text-sm text-mute">
                    Aucun resto partenaire disponible pour l&apos;instant. Reviens
                    quand un resto est en ligne pour finaliser la commande.
                  </p>
                ) : (
                  <select
                    id="partner"
                    value={partnerId}
                    onChange={(e) => onPickPartner(e.target.value)}
                    className="min-h-11 w-full rounded-xl border-2 border-ink bg-white px-3 py-2 text-sm text-ink focus:outline-none focus-visible:ring-[3px] focus-visible:ring-pink/40"
                  >
                    <option value="">Choisis un resto…</option>
                    {partners.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {partnerId && (
                <div className="space-y-2">
                  <span className="text-sm font-medium leading-none text-ink">
                    Menu
                  </span>
                  {menuLoading ? (
                    <p className="text-sm text-mute">Chargement du menu…</p>
                  ) : menu.length === 0 ? (
                    <p className="text-sm text-mute">
                      Ce resto n&apos;a pas encore d&apos;articles au menu.
                    </p>
                  ) : (
                    <ul className="space-y-2">
                      {menu.map((it) => {
                        const qty = cart[it.id] ?? 0
                        const coins = coinsOf(it)
                        return (
                          <li
                            key={it.id}
                            className="flex items-center justify-between gap-3 rounded-xl border-2 border-ink bg-white p-3"
                          >
                            <div className="min-w-0">
                              <p className="truncate text-sm font-bold text-ink">
                                {it.name}
                              </p>
                              <p className="font-mono text-xs text-mute">
                                <span className="font-bold text-coral">⊙ {coins}</span>{" "}
                                · {it.price_dh} DH
                              </p>
                            </div>
                            <div className="flex shrink-0 items-center gap-2">
                              <button
                                type="button"
                                onClick={() => removeFromCart(it.id)}
                                aria-label={`Diminuer ${it.name}`}
                                className="grid h-9 w-9 place-items-center rounded-lg border-2 border-ink bg-white text-base font-bold text-ink"
                              >
                                <span aria-hidden>−</span>
                              </button>
                              <span
                                className="w-6 text-center font-mono text-sm font-bold tabular-nums text-ink"
                                aria-label={`Quantité ${it.name}: ${qty}`}
                                aria-live="polite"
                              >
                                {qty}
                              </span>
                              <button
                                type="button"
                                onClick={() => addToCart(it.id)}
                                aria-label={`Augmenter ${it.name}`}
                                className="grid h-9 w-9 place-items-center rounded-lg border-2 border-ink bg-pink text-base font-bold text-ink"
                              >
                                <span aria-hidden>+</span>
                              </button>
                            </div>
                          </li>
                        )
                      })}
                    </ul>
                  )}
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="deliveryType">Type de réception</Label>
                <select
                  id="deliveryType"
                  value={deliveryType}
                  onChange={(e) => setDeliveryType(e.target.value as DeliveryType)}
                  className="min-h-11 w-full rounded-xl border-2 border-ink bg-white px-3 py-2 text-sm text-ink focus:outline-none focus-visible:ring-[3px] focus-visible:ring-pink/40"
                >
                  {(Object.keys(DELIVERY_LABELS) as DeliveryType[]).map((d) => (
                    <option key={d} value={d}>
                      {DELIVERY_LABELS[d]}
                    </option>
                  ))}
                </select>
              </div>

              {deliveryType === "delivery" && (
                <div className="space-y-2">
                  <Label htmlFor="address">Adresse de livraison</Label>
                  <Input
                    id="address"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    autoComplete="street-address"
                  />
                </div>
              )}

              <div className="flex items-center justify-between rounded-xl border-2 border-ink bg-coral/10 p-3">
                <div className="text-sm text-ink">
                  Total :{" "}
                  <strong className="font-mono text-base font-bold tabular-nums text-coral">
                    ⊙ {totalCoins}
                  </strong>
                </div>
                <span className="font-mono text-xs text-mute">
                  {cartCount} article{cartCount > 1 ? "s" : ""}
                </span>
              </div>

              <PremiumButton
                type="submit"
                loading={busy}
                disabled={busy || cartCount === 0}
              >
                Finaliser et répartir la note
              </PremiumButton>
              <p className="text-xs text-mute">
                La note est répartie entre les participants ayant accepté
                {acceptedCount > 0 ? ` (${acceptedCount} confirmés)` : ""}. Chacun paie
                sa part en coins et son parent peut s&apos;y opposer.
              </p>
            </form>
          </StickerCard>
        </section>
      )}

      {/* Finalize result */}
      {finalized && (
        <StickerCard variant="panel" className="gap-1 p-4">
          <p className="font-display text-lg font-extrabold text-ink">
            Commande finalisée !
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

      {/* Already finalized (loaded server-side on a confirmed order) */}
      {!finalized && existingOrder && (
        <StickerCard variant="panel" className="gap-1 p-4">
          <p className="font-display text-lg font-extrabold text-ink">
            Commande finalisée
          </p>
          <p className="font-mono text-sm text-ink">
            Total : {existingOrder.total_coins} coins ⊙
            {existingOrder.delivery_type
              ? ` · ${
                  DELIVERY_LABELS[existingOrder.delivery_type as DeliveryType] ??
                  existingOrder.delivery_type
                }`
              : ""}
          </p>
        </StickerCard>
      )}

      {!isForming && !finalized && !existingOrder && (
        <p className="text-sm text-mute">
          Cette commande n&apos;est plus en préparation
          {status === "confirmed" ? " — elle a été finalisée." : "."}
        </p>
      )}
    </div>
  )
}
