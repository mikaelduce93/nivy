"use client"

/**
 * NewOfferPage — TICKET-042 [forms]
 * react-hook-form + zod + FormKeyboardAware + PremiumButton (loading/success).
 * First field auto-focused; field-level inline validation on blur.
 */

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useForm, Controller } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card"
import { Button, PremiumButton } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  ArrowLeft,
  Tag,
  Percent,
  Gift,
  Truck,
  CheckCircle,
} from "lucide-react"
import Link from "next/link"
import { FormKeyboardAware } from "@/lib/hooks/use-keyboard-aware"

const offerTypes = [
  {
    id: "reduction" as const,
    name: "Réduction",
    icon: Percent,
    description: "Pourcentage ou montant fixe",
  },
  {
    id: "gift" as const,
    name: "Cadeau",
    icon: Gift,
    description: "Article ou service offert",
  },
  {
    id: "service" as const,
    name: "Service",
    icon: Truck,
    description: "Livraison, installation, etc.",
  },
]

const vipLevels = [
  { id: "silver" as const, name: "Silver", discount: "10%" },
  { id: "gold" as const, name: "Gold", discount: "20%" },
  { id: "platinum" as const, name: "Platinum", discount: "30%" },
]

const offerSchema = z
  .object({
    selectedType: z.enum(["reduction", "gift", "service"]),
    name: z
      .string()
      .trim()
      .min(2, "Nom trop court")
      .max(120, "Nom trop long"),
    description: z.string().max(2000, "Description trop longue").optional(),
    discountType: z.enum(["percentage", "fixed_amount"]),
    discountValue: z
      .string()
      .min(1, "Valeur requise")
      .refine((v) => !Number.isNaN(Number(v)) && Number(v) >= 0, "Valeur invalide"),
    minPurchase: z.string().optional(),
    maxDiscount: z.string().optional(),
    requiresVip: z.boolean(),
    minVipLevel: z.enum(["silver", "gold", "platinum"]),
    maxUsesPerUser: z.string().optional(),
    maxTotalUses: z.string().optional(),
    validFrom: z.string().min(1, "Date de début requise"),
    validUntil: z.string().min(1, "Date de fin requise"),
    termsAndConditions: z.string().max(2000, "Conditions trop longues").optional(),
  })
  .refine(
    (v) =>
      v.discountType !== "percentage" || Number(v.discountValue) <= 100,
    { path: ["discountValue"], message: "Le pourcentage doit être ≤ 100" }
  )
  .refine(
    (v) => {
      if (!v.validFrom || !v.validUntil) return true
      return new Date(v.validUntil) >= new Date(v.validFrom)
    },
    { path: ["validUntil"], message: "La date de fin doit être après la date de début" }
  )

type OfferValues = z.infer<typeof offerSchema>

export default function NewOfferPage() {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    setFocus,
    formState: { errors, isSubmitting },
  } = useForm<OfferValues>({
    resolver: zodResolver(offerSchema),
    mode: "onBlur",
    defaultValues: {
      selectedType: "reduction",
      name: "",
      description: "",
      discountType: "percentage",
      discountValue: "",
      minPurchase: "",
      maxDiscount: "",
      requiresVip: true,
      minVipLevel: "silver",
      maxUsesPerUser: "",
      maxTotalUses: "",
      validFrom: "",
      validUntil: "",
      termsAndConditions: "",
    },
  })

  const selectedType = watch("selectedType")
  const discountType = watch("discountType")
  const requiresVip = watch("requiresVip")
  const minVipLevel = watch("minVipLevel")

  useEffect(() => {
    setFocus("name")
  }, [setFocus])

  const onSubmit = async (values: OfferValues) => {
    setError(null)
    try {
      const response = await fetch("/api/partner/offers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: values.name,
          description: values.description,
          offerType: values.selectedType,
          discountType: values.discountType,
          discountValue: values.discountValue,
          minPurchase: values.minPurchase,
          maxDiscount: values.maxDiscount,
          requiresVip: values.requiresVip,
          minVipLevel: values.requiresVip ? values.minVipLevel : null,
          maxUsesPerUser: values.maxUsesPerUser,
          maxTotalUses: values.maxTotalUses,
          validFrom: values.validFrom,
          validUntil: values.validUntil,
          termsAndConditions: values.termsAndConditions,
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
            <p className="text-zinc-400">
              Votre offre est maintenant active pour les membres Nivy.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          asChild
          className="text-zinc-400 hover:text-white"
        >
          <Link href="/partner/offers">
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-black text-white">Nouvelle offre</h1>
          <p className="text-zinc-400">
            Créez une offre exclusive pour les membres Nivy
          </p>
        </div>
      </div>

      {error && (
        <Card className="bg-red-500/10 border-red-500/30">
          <CardContent className="pt-4 pb-4">
            <p role="alert" aria-live="polite" className="text-red-400">
              {error}
            </p>
          </CardContent>
        </Card>
      )}

      <FormKeyboardAware
        onSubmit={handleSubmit(onSubmit)}
        className="space-y-6"
      >
        {/* Offer Type Selection */}
        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader>
            <CardTitle className="text-white">Type d&apos;offre</CardTitle>
            <CardDescription className="text-zinc-400">
              Sélectionnez le type d&apos;offre que vous souhaitez créer
            </CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-3 gap-4">
            {offerTypes.map((type) => (
              <button
                key={type.id}
                type="button"
                onClick={() =>
                  setValue("selectedType", type.id, { shouldValidate: true })
                }
                aria-pressed={selectedType === type.id}
                className={`p-4 rounded-xl border text-left transition-all ${
                  selectedType === type.id
                    ? "bg-emerald-500/20 border-emerald-500/50"
                    : "bg-zinc-800 border-zinc-700 hover:border-zinc-600"
                }`}
              >
                <type.icon
                  className={`h-8 w-8 mb-3 ${
                    selectedType === type.id
                      ? "text-emerald-400"
                      : "text-zinc-400"
                  }`}
                />
                <p className="font-semibold text-white">{type.name}</p>
                <p className="text-xs text-zinc-400 mt-1">{type.description}</p>
              </button>
            ))}
          </CardContent>
        </Card>

        {/* Offer Details */}
        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader>
            <CardTitle className="text-white">Détails de l&apos;offre</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name" className="text-zinc-300">
                Nom de l&apos;offre <span className="text-red-400">*</span>
              </Label>
              <Input
                id="name"
                placeholder="Ex: -15% sur tout le magasin"
                aria-invalid={!!errors.name}
                className="bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500"
                {...register("name")}
              />
              {errors.name && (
                <p role="alert" className="text-sm text-red-400">
                  {errors.name.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="description" className="text-zinc-300">
                Description
              </Label>
              <Textarea
                id="description"
                placeholder="Décrivez votre offre en détail..."
                aria-invalid={!!errors.description}
                className="bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500 min-h-[100px]"
                {...register("description")}
              />
              {errors.description && (
                <p role="alert" className="text-sm text-red-400">
                  {errors.description.message}
                </p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-zinc-300">Type de réduction</Label>
                <Controller
                  control={control}
                  name="discountType"
                  render={({ field }) => (
                    <Select
                      value={field.value}
                      onValueChange={(v) =>
                        field.onChange(v as "percentage" | "fixed_amount")
                      }
                    >
                      <SelectTrigger className="bg-zinc-800 border-zinc-700 text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-zinc-900 border-zinc-700">
                        <SelectItem value="percentage">
                          Pourcentage (%)
                        </SelectItem>
                        <SelectItem value="fixed_amount">
                          Montant fixe (DH)
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="value" className="text-zinc-300">
                  Valeur {discountType === "percentage" ? "(%)" : "(DH)"}{" "}
                  <span className="text-red-400">*</span>
                </Label>
                <Input
                  id="value"
                  type="number"
                  inputMode="decimal"
                  min="0"
                  max={discountType === "percentage" ? "100" : undefined}
                  step={discountType === "percentage" ? "1" : "0.01"}
                  placeholder={discountType === "percentage" ? "15" : "50"}
                  aria-invalid={!!errors.discountValue}
                  className="bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500"
                  {...register("discountValue")}
                />
                {errors.discountValue && (
                  <p role="alert" className="text-sm text-red-400">
                    {errors.discountValue.message}
                  </p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="min" className="text-zinc-300">
                  Achat minimum (DH)
                </Label>
                <Input
                  id="min"
                  type="number"
                  inputMode="decimal"
                  min="0"
                  step="0.01"
                  placeholder="0"
                  className="bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500"
                  {...register("minPurchase")}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="max" className="text-zinc-300">
                  Réduction max (DH)
                </Label>
                <Input
                  id="max"
                  type="number"
                  inputMode="decimal"
                  min="0"
                  step="0.01"
                  placeholder="Illimité"
                  className="bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500"
                  {...register("maxDiscount")}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* VIP Settings */}
        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader>
            <CardTitle className="text-white">Paramètres VIP</CardTitle>
            <CardDescription className="text-zinc-400">
              Définissez les conditions d&apos;éligibilité
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-zinc-800 rounded-xl">
              <div>
                <p className="font-medium text-white">Réservé aux membres VIP</p>
                <p className="text-xs text-zinc-400">
                  Seuls les détenteurs de carte VIP pourront utiliser cette offre
                </p>
              </div>
              <Controller
                control={control}
                name="requiresVip"
                render={({ field }) => (
                  <Switch
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                )}
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
                      onClick={() =>
                        setValue("minVipLevel", level.id, {
                          shouldValidate: true,
                        })
                      }
                      aria-pressed={minVipLevel === level.id}
                      className={`p-3 rounded-xl border text-center transition-all ${
                        minVipLevel === level.id
                          ? level.id === "silver"
                            ? "bg-gray-500/20 border-gray-400"
                            : level.id === "gold"
                              ? "bg-yellow-500/20 border-yellow-400"
                              : "bg-purple-500/20 border-purple-400"
                          : "bg-zinc-800 border-zinc-700 hover:border-zinc-600"
                      }`}
                    >
                      <p
                        className={`font-semibold ${
                          level.id === "silver"
                            ? "text-gray-300"
                            : level.id === "gold"
                              ? "text-yellow-400"
                              : "text-purple-400"
                        }`}
                      >
                        {level.name}
                      </p>
                      <p className="text-xs text-zinc-400">
                        {level.discount} de base
                      </p>
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
            <CardTitle className="text-white">
              Limites d&apos;utilisation
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="maxUser" className="text-zinc-300">
                  Max par utilisateur
                </Label>
                <Input
                  id="maxUser"
                  type="number"
                  inputMode="numeric"
                  min="1"
                  placeholder="Illimité"
                  className="bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500"
                  {...register("maxUsesPerUser")}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="maxTotal" className="text-zinc-300">
                  Max total
                </Label>
                <Input
                  id="maxTotal"
                  type="number"
                  inputMode="numeric"
                  min="1"
                  placeholder="Illimité"
                  className="bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500"
                  {...register("maxTotalUses")}
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
                <Label htmlFor="validFrom" className="text-zinc-300">
                  Date de début <span className="text-red-400">*</span>
                </Label>
                <Input
                  id="validFrom"
                  type="date"
                  aria-invalid={!!errors.validFrom}
                  className="bg-zinc-800 border-zinc-700 text-white"
                  {...register("validFrom")}
                />
                {errors.validFrom && (
                  <p role="alert" className="text-sm text-red-400">
                    {errors.validFrom.message}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="validUntil" className="text-zinc-300">
                  Date de fin <span className="text-red-400">*</span>
                </Label>
                <Input
                  id="validUntil"
                  type="date"
                  aria-invalid={!!errors.validUntil}
                  className="bg-zinc-800 border-zinc-700 text-white"
                  {...register("validUntil")}
                />
                {errors.validUntil && (
                  <p role="alert" className="text-sm text-red-400">
                    {errors.validUntil.message}
                  </p>
                )}
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
              <Label htmlFor="terms" className="text-zinc-300">
                Conditions d&apos;utilisation
              </Label>
              <Textarea
                id="terms"
                placeholder="Ex: Non cumulable avec d'autres offres. Valable en magasin uniquement..."
                aria-invalid={!!errors.termsAndConditions}
                className="bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500 min-h-[80px]"
                {...register("termsAndConditions")}
              />
              {errors.termsAndConditions && (
                <p role="alert" className="text-sm text-red-400">
                  {errors.termsAndConditions.message}
                </p>
              )}
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
          <PremiumButton
            type="submit"
            loading={isSubmitting}
            success={success}
            disabled={isSubmitting || success}
            className="bg-emerald-500 hover:bg-emerald-600 text-white flex-1"
          >
            {success ? (
              <>
                <CheckCircle className="h-4 w-4 mr-2" />
                Créée !
              </>
            ) : isSubmitting ? (
              <>Création en cours...</>
            ) : (
              <>
                <Tag className="h-4 w-4 mr-2" />
                Créer l&apos;offre
              </>
            )}
          </PremiumButton>
        </div>
      </FormKeyboardAware>
    </div>
  )
}
