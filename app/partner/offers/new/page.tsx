"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ArrowLeft, Tag, Percent, Gift, Truck, Loader2, CheckCircle } from "lucide-react"
import Link from "next/link"

const offerTypes = [
  { id: "reduction", name: "Réduction", icon: Percent, description: "Pourcentage ou montant fixe" },
  { id: "gift", name: "Cadeau", icon: Gift, description: "Article ou service offert" },
  { id: "service", name: "Service", icon: Truck, description: "Livraison, installation, etc." },
]

const vipLevels = [
  { id: "silver", name: "Silver", discount: "10%" },
  { id: "gold", name: "Gold", discount: "20%" },
  { id: "platinum", name: "Platinum", discount: "30%" },
]

export default function NewOfferPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  // Form state
  const [selectedType, setSelectedType] = useState<string>("reduction")
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [discountType, setDiscountType] = useState<"percentage" | "fixed_amount">("percentage")
  const [discountValue, setDiscountValue] = useState("")
  const [minPurchase, setMinPurchase] = useState("")
  const [maxDiscount, setMaxDiscount] = useState("")
  const [requiresVip, setRequiresVip] = useState(true)
  const [minVipLevel, setMinVipLevel] = useState("silver")
  const [maxUsesPerUser, setMaxUsesPerUser] = useState("")
  const [maxTotalUses, setMaxTotalUses] = useState("")
  const [validFrom, setValidFrom] = useState("")
  const [validUntil, setValidUntil] = useState("")
  const [termsAndConditions, setTermsAndConditions] = useState("")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch("/api/partner/offers", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name,
          description,
          offerType: selectedType,
          discountType,
          discountValue,
          minPurchase,
          maxDiscount,
          requiresVip,
          minVipLevel: requiresVip ? minVipLevel : null,
          maxUsesPerUser,
          maxTotalUses,
          validFrom,
          validUntil,
          termsAndConditions,
        }),
      })

      const data = await response.json()

      if (!response.ok || !data.success) {
        throw new Error(data.error || "Erreur lors de la création")
      }

      setSuccess(true)
      setTimeout(() => {
        router.push("/partner/offers")
        router.refresh()
      }, 1500)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur lors de la création")
    } finally {
      setIsLoading(false)
    }
  }

  if (success) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Card className="bg-zinc-900 border-zinc-800 max-w-md w-full">
          <CardContent className="pt-8 pb-8 text-center">
            <div className="h-16 w-16 rounded-full bg-emerald-500/20 flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="h-8 w-8 text-emerald-400" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">Offre créée !</h2>
            <p className="text-zinc-400">Votre offre est maintenant active pour les membres Nivy.</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild className="text-zinc-400 hover:text-white">
          <Link href="/partner/offers">
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-black text-white">Nouvelle offre</h1>
          <p className="text-zinc-400">Créez une offre exclusive pour les membres Nivy</p>
        </div>
      </div>

      {error && (
        <Card className="bg-red-500/10 border-red-500/30">
          <CardContent className="pt-4 pb-4">
            <p className="text-red-400">{error}</p>
          </CardContent>
        </Card>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Offer Type Selection */}
        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader>
            <CardTitle className="text-white">Type d'offre</CardTitle>
            <CardDescription className="text-zinc-400">Sélectionnez le type d'offre que vous souhaitez créer</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-3 gap-4">
            {offerTypes.map((type) => (
              <button
                key={type.id}
                type="button"
                onClick={() => setSelectedType(type.id)}
                className={`p-4 rounded-xl border text-left transition-all ${
                  selectedType === type.id
                    ? "bg-emerald-500/20 border-emerald-500/50"
                    : "bg-zinc-800 border-zinc-700 hover:border-zinc-600"
                }`}
              >
                <type.icon className={`h-8 w-8 mb-3 ${selectedType === type.id ? "text-emerald-400" : "text-zinc-400"}`} />
                <p className="font-semibold text-white">{type.name}</p>
                <p className="text-xs text-zinc-400 mt-1">{type.description}</p>
              </button>
            ))}
          </CardContent>
        </Card>

        {/* Offer Details */}
        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader>
            <CardTitle className="text-white">Détails de l'offre</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name" className="text-zinc-300">Nom de l'offre <span className="text-red-400">*</span></Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex: -15% sur tout le magasin"
                className="bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description" className="text-zinc-300">Description</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Décrivez votre offre en détail..."
                className="bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500 min-h-[100px]"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-zinc-300">Type de réduction</Label>
                <Select value={discountType} onValueChange={(v) => setDiscountType(v as "percentage" | "fixed_amount")}>
                  <SelectTrigger className="bg-zinc-800 border-zinc-700 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-900 border-zinc-700">
                    <SelectItem value="percentage">Pourcentage (%)</SelectItem>
                    <SelectItem value="fixed_amount">Montant fixe (DH)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="value" className="text-zinc-300">
                  Valeur {discountType === "percentage" ? "(%)" : "(DH)"} <span className="text-red-400">*</span>
                </Label>
                <Input
                  id="value"
                  type="number"
                  min="0"
                  max={discountType === "percentage" ? "100" : undefined}
                  step={discountType === "percentage" ? "1" : "0.01"}
                  value={discountValue}
                  onChange={(e) => setDiscountValue(e.target.value)}
                  placeholder={discountType === "percentage" ? "15" : "50"}
                  className="bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="min" className="text-zinc-300">Achat minimum (DH)</Label>
                <Input
                  id="min"
                  type="number"
                  min="0"
                  step="0.01"
                  value={minPurchase}
                  onChange={(e) => setMinPurchase(e.target.value)}
                  placeholder="0"
                  className="bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="max" className="text-zinc-300">Réduction max (DH)</Label>
                <Input
                  id="max"
                  type="number"
                  min="0"
                  step="0.01"
                  value={maxDiscount}
                  onChange={(e) => setMaxDiscount(e.target.value)}
                  placeholder="Illimité"
                  className="bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* VIP Settings */}
        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader>
            <CardTitle className="text-white">Paramètres VIP</CardTitle>
            <CardDescription className="text-zinc-400">Définissez les conditions d'éligibilité</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-zinc-800 rounded-xl">
              <div>
                <p className="font-medium text-white">Réservé aux membres VIP</p>
                <p className="text-xs text-zinc-400">Seuls les détenteurs de carte VIP pourront utiliser cette offre</p>
              </div>
              <Switch
                checked={requiresVip}
                onCheckedChange={setRequiresVip}
              />
            </div>

            {requiresVip && (
              <div className="space-y-2">
                <Label className="text-zinc-300">Niveau VIP minimum</Label>
                <div className="grid grid-cols-3 gap-3">
                  {vipLevels.map((level) => (
                    <button
                      key={level.id}
                      type="button"
                      onClick={() => setMinVipLevel(level.id)}
                      className={`p-3 rounded-xl border text-center transition-all ${
                        minVipLevel === level.id
                          ? level.id === "silver" ? "bg-gray-500/20 border-gray-400" :
                            level.id === "gold" ? "bg-yellow-500/20 border-yellow-400" :
                            "bg-purple-500/20 border-purple-400"
                          : "bg-zinc-800 border-zinc-700 hover:border-zinc-600"
                      }`}
                    >
                      <p className={`font-semibold ${
                        level.id === "silver" ? "text-gray-300" :
                        level.id === "gold" ? "text-yellow-400" :
                        "text-purple-400"
                      }`}>{level.name}</p>
                      <p className="text-xs text-zinc-400">{level.discount} de base</p>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Usage Limits */}
        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader>
            <CardTitle className="text-white">Limites d'utilisation</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="maxUser" className="text-zinc-300">Max par utilisateur</Label>
                <Input
                  id="maxUser"
                  type="number"
                  min="1"
                  value={maxUsesPerUser}
                  onChange={(e) => setMaxUsesPerUser(e.target.value)}
                  placeholder="Illimité"
                  className="bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="maxTotal" className="text-zinc-300">Max total</Label>
                <Input
                  id="maxTotal"
                  type="number"
                  min="1"
                  value={maxTotalUses}
                  onChange={(e) => setMaxTotalUses(e.target.value)}
                  placeholder="Illimité"
                  className="bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Validity Period */}
        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader>
            <CardTitle className="text-white">Période de validité</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="validFrom" className="text-zinc-300">Date de début <span className="text-red-400">*</span></Label>
                <Input
                  id="validFrom"
                  type="date"
                  value={validFrom}
                  onChange={(e) => setValidFrom(e.target.value)}
                  className="bg-zinc-800 border-zinc-700 text-white"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="validUntil" className="text-zinc-300">Date de fin <span className="text-red-400">*</span></Label>
                <Input
                  id="validUntil"
                  type="date"
                  value={validUntil}
                  onChange={(e) => setValidUntil(e.target.value)}
                  className="bg-zinc-800 border-zinc-700 text-white"
                  required
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Terms */}
        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader>
            <CardTitle className="text-white">Conditions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Label htmlFor="terms" className="text-zinc-300">Conditions d'utilisation</Label>
              <Textarea
                id="terms"
                value={termsAndConditions}
                onChange={(e) => setTermsAndConditions(e.target.value)}
                placeholder="Ex: Non cumulable avec d'autres offres. Valable en magasin uniquement..."
                className="bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500 min-h-[80px]"
              />
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex gap-4">
          <Button
            type="button"
            variant="outline"
            className="border-zinc-700 text-zinc-300"
            asChild
          >
            <Link href="/partner/offers">Annuler</Link>
          </Button>
          <Button
            type="submit"
            disabled={isLoading}
            className="bg-emerald-500 hover:bg-emerald-600 text-white flex-1"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Création en cours...
              </>
            ) : (
              <>
                <Tag className="h-4 w-4 mr-2" />
                Créer l'offre
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  )
}
