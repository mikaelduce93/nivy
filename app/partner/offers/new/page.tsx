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
        <Card className="bg-card border-ink max-w-md w-full">
          <CardContent className="pt-8 pb-8 text-center">
            <div className="h-16 w-16 rounded-full bg-lime/20 flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="h-8 w-8 text-lime" />
            </div>
            <h2 className="text-2xl font-bold text-ink mb-2">Offre soumise !</h2>
            <p className="text-mute">
              {/* #53 — offers are NEVER live on create (status='pending_approval',
                  is_active=false). Tell the truth: it awaits moderation. */}
              Votre offre est en attente de validation par l&apos;équipe Nivy.
              Elle sera visible une fois approuvée.
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
          className="text-mute hover:text-ink"
        >
          <Link href="/partner/offers">
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-black text-ink">Nouvelle offre</h1>
          <p className="text-mute">
            Créez une offre exclusive pour les membres Nivy
          </p>
        </div>
      </div>

      {error && (
        <Card className="bg-destructive/10 border-destructive/30">
          <CardContent className="pt-4 pb-4">
            <p role="alert" aria-live="polite" className="text-destructive">
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
        <Card className="bg-card border-ink">
          <CardHeader>
            <CardTitle className="text-ink">Type d&apos;offre</CardTitle>
            <CardDescription className="text-mute">
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
                    ? "bg-lime/20 border-lime/50"
                    : "bg-card border-ink hover:border-ink"
                }`}
              >
                <type.icon
                  className={`h-8 w-8 mb-3 ${
                    selectedType === type.id
                      ? "text-lime"
                      : "text-mute"
                  }`}
                />
                <p className="font-semibold text-ink">{type.name}</p>
                <p className="text-xs text-mute mt-1">{type.description}</p>
              </button>
            ))}
          </CardContent>
        </Card>

        {/* Offer Details */}
        <Card className="bg-card border-ink">
          <CardHeader>
            <CardTitle className="text-ink">Détails de l&apos;offre</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name" className="text-ink-2">
                Nom de l&apos;offre <span className="text-destructive">*</span>
              </Label>
              <Input
                id="name"
                placeholder="Ex: -15% sur tout le magasin"
                aria-invalid={!!errors.name}
                className="bg-card border-ink text-ink placeholder:text-mute"
                {...register("name")}
              />
              {errors.name && (
                <p role="alert" className="text-sm text-destructive">
                  {errors.name.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="description" className="text-ink-2">
                Description
              </Label>
              <Textarea
                id="description"
                placeholder="Décrivez votre offre en détail..."
                aria-invalid={!!errors.description}
                className="bg-card border-ink text-ink placeholder:text-mute min-h-[100px]"
                {...register("description")}
              />
              {errors.description && (
                <p role="alert" className="text-sm text-destructive">
                  {errors.description.message}
                </p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-ink-2">Type de réduction</Label>
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
                      <SelectTrigger className="bg-card border-ink text-ink">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-card border-ink">
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
                <Label htmlFor="value" className="text-ink-2">
                  Valeur {discountType === "percentage" ? "(%)" : "(DH)"}{" "}
                  <span className="text-destructive">*</span>
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
                  className="bg-card border-ink text-ink placeholder:text-mute"
                  {...register("discountValue")}
                />
                {errors.discountValue && (
                  <p role="alert" className="text-sm text-destructive">
                    {errors.discountValue.message}
                  </p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="min" className="text-ink-2">
                  Achat minimum (DH)
                </Label>
                <Input
                  id="min"
                  type="number"
                  inputMode="decimal"
                  min="0"
                  step="0.01"
                  placeholder="0"
                  className="bg-card border-ink text-ink placeholder:text-mute"
                  {...register("minPurchase")}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="max" className="text-ink-2">
                  Réduction max (DH)
                </Label>
                <Input
                  id="max"
                  type="number"
                  inputMode="decimal"
                  min="0"
                  step="0.01"
                  placeholder="Illimité"
                  className="bg-card border-ink text-ink placeholder:text-mute"
                  {...register("maxDiscount")}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* VIP Settings */}
        <Card className="bg-card border-ink">
          <CardHeader>
            <CardTitle className="text-ink">Paramètres VIP</CardTitle>
            <CardDescription className="text-mute">
              Définissez les conditions d&apos;éligibilité
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-card rounded-xl">
              <div>
                <p className="font-medium text-ink">Réservé aux membres VIP</p>
                <p className="text-xs text-mute">
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
                <Label className="text-ink-2">Niveau VIP minimum</Label>
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
                            ? "bg-muted border-line"
                            : level.id === "gold"
                              ? "bg-gold/20 border-gold"
                              : "bg-pink/20 border-pink"
                          : "bg-card border-ink hover:border-ink"
                      }`}
                    >
                      <p
                        className={`font-semibold ${
                          level.id === "silver"
                            ? "text-ink-2"
                            : level.id === "gold"
                              ? "text-gold"
                              : "text-pink"
                        }`}
                      >
                        {level.name}
                      </p>
                      <p className="text-xs text-mute">
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
        <Card className="bg-card border-ink">
          <CardHeader>
            <CardTitle className="text-ink">
              Limites d&apos;utilisation
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="maxUser" className="text-ink-2">
                  Max par utilisateur
                </Label>
                <Input
                  id="maxUser"
                  type="number"
                  inputMode="numeric"
                  min="1"
                  placeholder="Illimité"
                  className="bg-card border-ink text-ink placeholder:text-mute"
                  {...register("maxUsesPerUser")}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="maxTotal" className="text-ink-2">
                  Max total
                </Label>
                <Input
                  id="maxTotal"
                  type="number"
                  inputMode="numeric"
                  min="1"
                  placeholder="Illimité"
                  className="bg-card border-ink text-ink placeholder:text-mute"
                  {...register("maxTotalUses")}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Validity Period */}
        <Card className="bg-card border-ink">
          <CardHeader>
            <CardTitle className="text-ink">Période de validité</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="validFrom" className="text-ink-2">
                  Date de début <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="validFrom"
                  type="date"
                  aria-invalid={!!errors.validFrom}
                  className="bg-card border-ink text-ink"
                  {...register("validFrom")}
                />
                {errors.validFrom && (
                  <p role="alert" className="text-sm text-destructive">
                    {errors.validFrom.message}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="validUntil" className="text-ink-2">
                  Date de fin <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="validUntil"
                  type="date"
                  aria-invalid={!!errors.validUntil}
                  className="bg-card border-ink text-ink"
                  {...register("validUntil")}
                />
                {errors.validUntil && (
                  <p role="alert" className="text-sm text-destructive">
                    {errors.validUntil.message}
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Terms */}
        <Card className="bg-card border-ink">
          <CardHeader>
            <CardTitle className="text-ink">Conditions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Label htmlFor="terms" className="text-ink-2">
                Conditions d&apos;utilisation
              </Label>
              <Textarea
                id="terms"
                placeholder="Ex: Non cumulable avec d'autres offres. Valable en magasin uniquement..."
                aria-invalid={!!errors.termsAndConditions}
                className="bg-card border-ink text-ink placeholder:text-mute min-h-[80px]"
                {...register("termsAndConditions")}
              />
              {errors.termsAndConditions && (
                <p role="alert" className="text-sm text-destructive">
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
            className="border-ink text-ink-2"
            asChild
          >
            <Link href="/partner/offers">Annuler</Link>
          </Button>
          <PremiumButton
            type="submit"
            loading={isSubmitting}
            success={success}
            disabled={isSubmitting || success}
            className="bg-lime hover:bg-lime text-ink flex-1"
          >
            {success ? (
              <>
                <CheckCircle className="h-4 w-4 mr-2" />
                Soumise !
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
