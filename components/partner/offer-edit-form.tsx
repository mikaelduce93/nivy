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
    name: string
    description: string
    offerType: string
    value: number
    minPurchase: number
    maxUsage: number | null
    validFrom: string
    validUntil: string
    status: string
    eligibleLevels: string[]
  }
}

const offerTypes = [
  { id: "reduction", name: "Réduction", icon: Percent },
  { id: "gift", name: "Cadeau", icon: Gift },
  { id: "service", name: "Service", icon: Truck },
]

const levels = ["Bronze", "Silver", "Gold", "Platinum"]

export function OfferEditForm({ offerId, partnerId, initialData }: OfferEditFormProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    name: initialData.name,
    description: initialData.description,
    offerType: initialData.offerType,
    value: initialData.value,
    minPurchase: initialData.minPurchase,
    maxUsage: initialData.maxUsage || "",
    validFrom: initialData.validFrom?.split("T")[0] || "",
    validUntil: initialData.validUntil?.split("T")[0] || "",
    status: initialData.status,
    eligibleLevels: initialData.eligibleLevels || []
  })

  const handleChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const toggleLevel = (level: string) => {
    setFormData(prev => ({
      ...prev,
      eligibleLevels: prev.eligibleLevels.includes(level)
        ? prev.eligibleLevels.filter(l => l !== level)
        : [...prev.eligibleLevels, level]
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.name.trim()) {
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
          name: formData.name,
          description: formData.description,
          offerType: formData.offerType,
          discountValue: formData.value,
          minPurchase: formData.minPurchase,
          maxUsage: formData.maxUsage || null,
          validFrom: formData.validFrom || null,
          validUntil: formData.validUntil || null,
          status: formData.status,
          eligibleLevels: formData.eligibleLevels
        }),
      })

      const result = await response.json()

      if (result.success) {
        toast.success("Offre mise à jour avec succès")
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
        <Label className="text-zinc-300">Type d'offre</Label>
        <div className="grid grid-cols-3 gap-3">
          {offerTypes.map((type) => (
            <button
              key={type.id}
              type="button"
              onClick={() => handleChange("offerType", type.id)}
              className={`p-3 rounded-xl border text-center transition-all ${
                formData.offerType === type.id
                  ? "bg-emerald-500/20 border-emerald-500/50"
                  : "bg-zinc-800 border-zinc-700 hover:border-zinc-600"
              }`}
            >
              <type.icon className={`h-6 w-6 mx-auto mb-1 ${
                formData.offerType === type.id ? "text-emerald-400" : "text-zinc-400"
              }`} />
              <p className="text-sm font-medium text-white">{type.name}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Name */}
      <div className="space-y-2">
        <Label className="text-zinc-300">Nom de l'offre</Label>
        <Input
          value={formData.name}
          onChange={(e) => handleChange("name", e.target.value)}
          placeholder="Ex: -15% sur tout le magasin"
          className="bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500"
          maxLength={100}
        />
      </div>

      {/* Description */}
      <div className="space-y-2">
        <Label className="text-zinc-300">Description</Label>
        <Textarea
          value={formData.description}
          onChange={(e) => handleChange("description", e.target.value)}
          placeholder="Décrivez votre offre en détail..."
          className="bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500 min-h-[100px]"
          maxLength={500}
        />
      </div>

      {/* Value & Min Purchase */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label className="text-zinc-300">
            {formData.offerType === "reduction" ? "Valeur (%)" : "Valeur (DH)"}
          </Label>
          <Input
            type="number"
            value={formData.value}
            onChange={(e) => handleChange("value", parseFloat(e.target.value) || 0)}
            placeholder="15"
            className="bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500"
            min={0}
          />
        </div>
        <div className="space-y-2">
          <Label className="text-zinc-300">Achat minimum (DH)</Label>
          <Input
            type="number"
            value={formData.minPurchase}
            onChange={(e) => handleChange("minPurchase", parseFloat(e.target.value) || 0)}
            placeholder="0"
            className="bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500"
            min={0}
          />
        </div>
      </div>

      {/* Max Usage */}
      <div className="space-y-2">
        <Label className="text-zinc-300">Nombre d'utilisations max (optionnel)</Label>
        <Input
          type="number"
          value={formData.maxUsage}
          onChange={(e) => handleChange("maxUsage", e.target.value ? parseInt(e.target.value) : "")}
          placeholder="Illimité"
          className="bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500"
          min={1}
        />
      </div>

      {/* Validity Period */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label className="text-zinc-300">Valide à partir du</Label>
          <Input
            type="date"
            value={formData.validFrom}
            onChange={(e) => handleChange("validFrom", e.target.value)}
            className="bg-zinc-800 border-zinc-700 text-white"
          />
        </div>
        <div className="space-y-2">
          <Label className="text-zinc-300">Valide jusqu'au</Label>
          <Input
            type="date"
            value={formData.validUntil}
            onChange={(e) => handleChange("validUntil", e.target.value)}
            className="bg-zinc-800 border-zinc-700 text-white"
          />
        </div>
      </div>

      {/* Status */}
      <div className="space-y-2">
        <Label className="text-zinc-300">Statut</Label>
        <Select value={formData.status} onValueChange={(v) => handleChange("status", v)}>
          <SelectTrigger className="bg-zinc-800 border-zinc-700 text-white">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-zinc-800 border-zinc-700">
            <SelectItem value="active" className="text-white hover:bg-zinc-700">Active</SelectItem>
            <SelectItem value="inactive" className="text-white hover:bg-zinc-700">Inactive</SelectItem>
            <SelectItem value="pending" className="text-white hover:bg-zinc-700">En attente</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Eligible Levels */}
      <div className="space-y-2">
        <Label className="text-zinc-300">Niveaux éligibles</Label>
        <div className="flex gap-2">
          {levels.map((level) => (
            <Button
              key={level}
              type="button"
              variant="outline"
              size="sm"
              onClick={() => toggleLevel(level)}
              className={`${
                formData.eligibleLevels.includes(level)
                  ? "bg-emerald-500/20 border-emerald-500/50 text-emerald-400"
                  : "border-zinc-700 text-zinc-300 hover:bg-zinc-800"
              }`}
            >
              {level}
            </Button>
          ))}
        </div>
        <p className="text-xs text-zinc-500">
          {formData.eligibleLevels.length === 0
            ? "Tous les niveaux sont éligibles"
            : `${formData.eligibleLevels.length} niveau(x) sélectionné(s)`}
        </p>
      </div>

      {/* Submit */}
      <div className="flex gap-3 pt-4">
        <Button
          type="button"
          variant="outline"
          className="flex-1 border-zinc-700 text-zinc-300"
          onClick={() => router.back()}
        >
          Annuler
        </Button>
        <Button
          type="submit"
          disabled={loading}
          className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white"
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
