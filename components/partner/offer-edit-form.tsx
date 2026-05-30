"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
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

const offerTypes = [
  { id: "reduction", name: "Réduction", icon: Percent },
  { id: "discount", name: "Remise", icon: Gift },
  { id: "challenge", name: "Défi", icon: Truck },
]

const vipLevels = ["silver", "gold", "platinum"]

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
      {/* Offer Type */}
      <div className="space-y-2">
        <Label className="text-ink-2">Type d'offre</Label>
        <div className="grid grid-cols-3 gap-3">
          {offerTypes.map((type) => (
            <button
              key={type.id}
              type="button"
              onClick={() => handleChange("offerType", type.id)}
              className={`p-3 rounded-xl border text-center transition-all ${
                formData.offerType === type.id
                  ? "bg-lime/20 border-lime/50"
                  : "bg-card border-ink hover:border-ink"
              }`}
            >
              <type.icon className={`h-6 w-6 mx-auto mb-1 ${
                formData.offerType === type.id ? "text-lime" : "text-mute"
              }`} />
              <p className="text-sm font-medium text-ink">{type.name}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Title */}
      <div className="space-y-2">
        <Label className="text-ink-2">Nom de l'offre</Label>
        <Input
          value={formData.title}
          onChange={(e) => handleChange("title", e.target.value)}
          placeholder="Ex: -15% sur tout le magasin"
          className="bg-card border-ink text-ink placeholder:text-mute"
          maxLength={100}
        />
      </div>

      {/* Description */}
      <div className="space-y-2">
        <Label className="text-ink-2">Description</Label>
        <Textarea
          value={formData.description}
          onChange={(e) => handleChange("description", e.target.value)}
          placeholder="Décrivez votre offre en détail..."
          className="bg-card border-ink text-ink placeholder:text-mute min-h-[100px]"
          maxLength={500}
        />
      </div>

      {/* Value & Min Purchase */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label className="text-ink-2">
            {formData.offerType === "reduction" ? "Valeur (%)" : "Valeur (DH)"}
          </Label>
          <Input
            type="number"
            value={formData.discountValue}
            onChange={(e) => handleChange("discountValue", parseFloat(e.target.value) || 0)}
            placeholder="15"
            className="bg-card border-ink text-ink placeholder:text-mute"
            min={0}
          />
        </div>
        <div className="space-y-2">
          <Label className="text-ink-2">Achat minimum (DH)</Label>
          <Input
            type="number"
            value={formData.minPurchaseAmount}
            onChange={(e) => handleChange("minPurchaseAmount", parseFloat(e.target.value) || 0)}
            placeholder="0"
            className="bg-card border-ink text-ink placeholder:text-mute"
            min={0}
          />
        </div>
      </div>

      {/* Usage Limits */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label className="text-ink-2">Max par utilisateur (optionnel)</Label>
          <Input
            type="number"
            value={formData.maxUsesPerUser}
            onChange={(e) => handleChange("maxUsesPerUser", e.target.value)}
            placeholder="Illimité"
            className="bg-card border-ink text-ink placeholder:text-mute"
            min={1}
          />
        </div>
        <div className="space-y-2">
          <Label className="text-ink-2">Max total (optionnel)</Label>
          <Input
            type="number"
            value={formData.maxTotalUses}
            onChange={(e) => handleChange("maxTotalUses", e.target.value)}
            placeholder="Illimité"
            className="bg-card border-ink text-ink placeholder:text-mute"
            min={1}
          />
        </div>
      </div>

      {/* Validity Period */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label className="text-ink-2">Valide à partir du</Label>
          <Input
            type="date"
            value={formData.validFrom}
            onChange={(e) => handleChange("validFrom", e.target.value)}
            className="bg-card border-ink text-ink"
          />
        </div>
        <div className="space-y-2">
          <Label className="text-ink-2">Valide jusqu'au</Label>
          <Input
            type="date"
            value={formData.validUntil}
            onChange={(e) => handleChange("validUntil", e.target.value)}
            className="bg-card border-ink text-ink"
          />
        </div>
      </div>

      {/* Status */}
      <div className="space-y-2">
        <Label className="text-ink-2">Statut</Label>
        <Select value={formData.status} onValueChange={(v) => handleChange("status", v)}>
          <SelectTrigger className="bg-card border-ink text-ink">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-card border-ink">
            {STATUS_OPTIONS.map((s) => (
              <SelectItem key={s.id} value={s.id} className="text-ink hover:bg-muted">
                {s.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-xs text-mute">
          La mise en ligne d'une offre est validée par l'équipe de modération.
        </p>
      </div>

      {/* VIP Settings */}
      <div className="space-y-3">
        <div className="flex items-center justify-between p-4 bg-card rounded-xl">
          <div>
            <p className="font-medium text-ink">Réservé aux membres VIP</p>
            <p className="text-xs text-mute">
              Seuls les détenteurs de carte VIP pourront utiliser cette offre
            </p>
          </div>
          <Switch
            checked={formData.requiresVip}
            onCheckedChange={(v) => handleChange("requiresVip", v)}
          />
        </div>

        {formData.requiresVip && (
          <div className="space-y-2">
            <Label className="text-ink-2">Niveau VIP minimum</Label>
            <div className="flex gap-2">
              {vipLevels.map((level) => (
                <Button
                  key={level}
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleChange("minVipLevel", level)}
                  className={`capitalize ${
                    formData.minVipLevel === level
                      ? "bg-lime/20 border-lime/50 text-lime"
                      : "border-ink text-ink-2 hover:bg-card"
                  }`}
                >
                  {level}
                </Button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Submit */}
      <div className="flex gap-3 pt-4">
        <Button
          type="button"
          variant="outline"
          className="flex-1 border-ink text-ink-2"
          onClick={() => router.back()}
        >
          Annuler
        </Button>
        <Button
          type="submit"
          disabled={loading}
          className="flex-1 bg-lime hover:bg-lime text-ink"
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
              Enregistrement...
            </>
          ) : (
            <>
              <Save className="h-4 w-4 mr-2" />
              Enregistrer
            </>
          )}
        </Button>
      </div>
    </form>
  )
}
