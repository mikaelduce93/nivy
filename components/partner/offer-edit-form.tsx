"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { FieldInput } from "@/components/ui/field-input"
import { SelectSticker, SelectStickerItem } from "@/components/ui/select-sticker"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Loader2, Save, Percent, Gift, Truck } from "lucide-react"
import { toast } from "sonner"
import { useRouter } from "next/navigation"

interface OfferEditFormProps {
  offerId: string
  partnerId: string
  initialData: {
    title: string
    description: string
    offerType: string
    discountValue: number
    minPurchaseAmount: number
    maxTotalUses: number | null
    maxUsesPerUser: number | null
    requiresVip: boolean
    minVipLevel: string
    validFrom: string
    validUntil: string
    status: string
  }
}

// #167 — ids/labels unifiés avec la page « nouvelle offre ».
const offerTypes = [
  { id: "reduction", name: "Réduction", icon: Percent },
  { id: "gift", name: "Cadeau", icon: Gift },
  { id: "service", name: "Service", icon: Truck },
]

const vipLevels = [
  { id: "silver", name: "Argent" },
  { id: "gold", name: "Or" },
  { id: "platinum", name: "Platine" },
]

// #50 — partner-settable subset of partner_offers.status. Approval
// (status='approved' / going live) is reserved for admin moderation (#58).
const STATUS_OPTIONS = [
  { id: "pending_approval", name: "Soumettre à modération" },
  { id: "paused", name: "Mettre en pause" },
  { id: "draft", name: "Brouillon" },
] as const

const PARTNER_STATUSES = new Set<string>(STATUS_OPTIONS.map((s) => s.id))

export function OfferEditForm({ offerId, partnerId, initialData }: OfferEditFormProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    title: initialData.title,
    description: initialData.description,
    offerType: initialData.offerType,
    discountValue: initialData.discountValue,
    minPurchaseAmount: initialData.minPurchaseAmount,
    maxTotalUses: initialData.maxTotalUses ?? "",
    maxUsesPerUser: initialData.maxUsesPerUser ?? "",
    requiresVip: initialData.requiresVip,
    minVipLevel: initialData.minVipLevel || "silver",
    validFrom: initialData.validFrom?.split("T")[0] || "",
    validUntil: initialData.validUntil?.split("T")[0] || "",
    // Seed with a partner-settable status; an approved/rejected offer being
    // edited re-enters moderation.
    status: PARTNER_STATUSES.has(initialData.status) ? initialData.status : "pending_approval",
  })

  const handleChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.title.trim()) {
      toast.error("Le nom de l'offre est requis")
      return
    }

    setLoading(true)
    try {
      const response = await fetch(`/api/partner/offers/${offerId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          partnerId,
          title: formData.title,
          description: formData.description,
          offerType: formData.offerType,
          discountValue: formData.discountValue,
          minPurchaseAmount: formData.minPurchaseAmount || null,
          maxTotalUses: formData.maxTotalUses ? Number(formData.maxTotalUses) : null,
          maxUsesPerUser: formData.maxUsesPerUser ? Number(formData.maxUsesPerUser) : null,
          requiresVip: formData.requiresVip,
          minVipLevel: formData.requiresVip ? formData.minVipLevel : null,
          validFrom: formData.validFrom || null,
          validUntil: formData.validUntil || null,
          status: formData.status,
        }),
      })

      const result = await response.json()

      if (result.success) {
        toast.success("Offre mise à jour — en attente de modération")
        router.push("/partner/offers")
        router.refresh()
      } else {
        toast.error(result.error || "Erreur lors de la mise à jour")
      }
    } catch (err) {
      toast.error("Une erreur est survenue")
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Offer Type — option active = fond ink + texte paper + ombre rose */}
      <div className="space-y-2">
        <p className="eyebrow tracking-[0.16em]">Type d&apos;offre</p>
        <div className="grid grid-cols-3 gap-3">
          {offerTypes.map((type) => {
            const isActive = formData.offerType === type.id
            return (
              <button
                key={type.id}
                type="button"
                onClick={() => handleChange("offerType", type.id)}
                aria-pressed={isActive}
                className={`rounded-xl border-2 border-ink p-3 text-center transition-all motion-reduce:translate-x-0 motion-reduce:translate-y-0 ${
                  isActive
                    ? "-translate-x-0.5 -translate-y-0.5 bg-ink text-paper shadow-stkr-pink"
                    : "bg-white text-ink hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-stkr-md"
                }`}
              >
                <type.icon
                  className={`mx-auto mb-1 size-6 ${
                    isActive ? "text-paper" : "text-mute"
                  }`}
                  aria-hidden="true"
                />
                <p className="text-sm font-medium">{type.name}</p>
              </button>
            )
          })}
        </div>
      </div>

      {/* Title */}
      <FieldInput
        label="Nom de l'offre"
        value={formData.title}
        onChange={(e) => handleChange("title", e.target.value)}
        placeholder="Ex : -15% sur tout le magasin"
        maxLength={100}
      />

      {/* Description */}
      <div className="space-y-1.5">
        <Label htmlFor="edit-description" className="eyebrow tracking-[0.16em]">
          Description
        </Label>
        <Textarea
          id="edit-description"
          value={formData.description}
          onChange={(e) => handleChange("description", e.target.value)}
          placeholder="Décris ton offre en détail…"
          className="min-h-[100px] border-2 border-input focus-visible:border-ink focus-visible:ring-0"
          maxLength={500}
        />
      </div>

      {/* Value & Min Purchase */}
      <div className="grid gap-4 sm:grid-cols-2">
        <FieldInput
          type="number"
          label={formData.offerType === "reduction" ? "Valeur (%)" : "Valeur (DH)"}
          value={formData.discountValue}
          onChange={(e) => handleChange("discountValue", parseFloat(e.target.value) || 0)}
          placeholder="15"
          min={0}
        />
        <FieldInput
          type="number"
          label="Achat minimum (DH)"
          value={formData.minPurchaseAmount}
          onChange={(e) => handleChange("minPurchaseAmount", parseFloat(e.target.value) || 0)}
          placeholder="0"
          min={0}
        />
      </div>

      {/* Usage Limits */}
      <div className="grid gap-4 sm:grid-cols-2">
        <FieldInput
          type="number"
          label="Max par utilisateur (optionnel)"
          value={formData.maxUsesPerUser}
          onChange={(e) => handleChange("maxUsesPerUser", e.target.value)}
          placeholder="Illimité"
          min={1}
        />
        <FieldInput
          type="number"
          label="Max total (optionnel)"
          value={formData.maxTotalUses}
          onChange={(e) => handleChange("maxTotalUses", e.target.value)}
          placeholder="Illimité"
          min={1}
        />
      </div>

      {/* Validity Period */}
      <div className="grid gap-4 sm:grid-cols-2">
        <FieldInput
          type="date"
          label="Valide à partir du"
          value={formData.validFrom}
          onChange={(e) => handleChange("validFrom", e.target.value)}
        />
        <FieldInput
          type="date"
          label="Valide jusqu'au"
          value={formData.validUntil}
          onChange={(e) => handleChange("validUntil", e.target.value)}
        />
      </div>

      {/* Status */}
      <div className="space-y-1.5">
        <SelectSticker
          label="Statut"
          value={formData.status}
          onValueChange={(v) => handleChange("status", v)}
        >
          {STATUS_OPTIONS.map((s) => (
            <SelectStickerItem key={s.id} value={s.id}>
              {s.name}
            </SelectStickerItem>
          ))}
        </SelectSticker>
        <p className="text-xs text-mute">
          La mise en ligne d&apos;une offre est validée par l&apos;équipe de modération.
        </p>
      </div>

      {/* VIP Settings */}
      <div className="space-y-3">
        <div className="flex items-center justify-between rounded-xl border-2 border-line bg-paper-2 p-4">
          <div>
            <p className="font-medium text-ink">Réservé aux membres VIP</p>
            <p className="text-xs text-mute">
              Seuls les détenteurs d&apos;une carte VIP pourront en profiter
            </p>
          </div>
          <Switch
            checked={formData.requiresVip}
            onCheckedChange={(v) => handleChange("requiresVip", v)}
          />
        </div>

        {formData.requiresVip && (
          <div className="space-y-2">
            <p className="eyebrow tracking-[0.16em]">Niveau VIP minimum</p>
            <div className="grid grid-cols-3 gap-3">
              {vipLevels.map((level) => {
                const isActive = formData.minVipLevel === level.id
                return (
                  <button
                    key={level.id}
                    type="button"
                    onClick={() => handleChange("minVipLevel", level.id)}
                    aria-pressed={isActive}
                    className={`rounded-xl border-2 border-ink px-3 py-2 text-center text-sm font-medium transition-all motion-reduce:translate-x-0 motion-reduce:translate-y-0 ${
                      isActive
                        ? "-translate-x-0.5 -translate-y-0.5 bg-ink text-paper shadow-stkr-pink"
                        : "bg-white text-ink hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-stkr-md"
                    }`}
                  >
                    {level.name}
                  </button>
                )
              })}
            </div>
          </div>
        )}
      </div>

      {/* Submit */}
      <div className="flex gap-3 pt-4">
        <Button
          type="button"
          variant="outline"
          className="flex-1"
          onClick={() => router.back()}
        >
          Annuler
        </Button>
        <Button
          type="submit"
          variant="pink"
          disabled={loading}
          className="flex-1"
        >
          {loading ? (
            <>
              <Loader2 className="size-4 animate-spin" aria-hidden="true" />
              Enregistrement…
            </>
          ) : (
            <>
              <Save className="size-4" aria-hidden="true" />
              Enregistrer
            </>
          )}
        </Button>
      </div>
    </form>
  )
}
