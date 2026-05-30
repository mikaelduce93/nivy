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
import { Button } from "@/components/ui/button"
import { StickerCard } from "@/components/ui/sticker-card"
import { FieldInput } from "@/components/ui/field-input"
import { SelectSticker, SelectStickerItem } from "@/components/ui/select-sticker"
import { CheckRound } from "@/components/ui/check-round"
import { SegmentedProgress } from "@/components/ui/progress"
import { NivCelebration } from "@/components/brand"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import {
  ArrowLeft,
  Tag,
  Percent,
  Gift,
  Truck,
  Loader2,
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
  { id: "silver" as const, name: "Argent", discount: "10%" },
  { id: "gold" as const, name: "Or", discount: "20%" },
  { id: "platinum" as const, name: "Platine", discount: "30%" },
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
      <div className="flex min-h-[60vh] items-center justify-center">
        <NivCelebration
          tone="lime"
          trigger={success}
          palette="reward"
          title="C'est parti !"
          caption="Ton deal passe en modération, on te ping dès que c'est live."
          className="max-w-md"
        />
      </div>
    )
  }

  return (
    <div className="max-w-2xl space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/partner/offers" aria-label="Retour aux offres">
            <ArrowLeft className="size-5" aria-hidden="true" />
          </Link>
        </Button>
        <div>
          <p className="eyebrow tracking-[0.16em] text-mute">Nouvelle offre</p>
          <h1 className="font-display text-3xl font-extrabold tracking-tight text-ink">
            Crée ton <em className="font-semibold italic text-pink">deal</em>
          </h1>
          <p className="text-mute">
            Une offre exclusive pour les membres Nivy
          </p>
        </div>
      </div>

      {/* Progression du flow */}
      <SegmentedProgress
        steps={5}
        current={0}
        showLabel
        label="Type · Détails · VIP · Limites · Dates"
      />

      {error && (
        <div
          role="alert"
          aria-live="polite"
          className="rounded-xl border-2 border-coral bg-coral/10 px-4 py-3 text-sm font-medium text-ink"
        >
          {error}
        </div>
      )}

      <FormKeyboardAware
        onSubmit={handleSubmit(onSubmit)}
        className="space-y-6 pb-24 sm:pb-0"
      >
        {/* Offer Type Selection */}
        <StickerCard className="gap-4 p-5">
          <div>
            <h2 className="font-display text-lg font-bold text-ink">
              Type d&apos;offre
            </h2>
            <p className="text-sm text-mute">
              Choisis le type d&apos;offre que tu veux créer
            </p>
          </div>
          <div className="grid grid-cols-3 gap-3">
            {offerTypes.map((type) => {
              const isActive = selectedType === type.id
              return (
                <button
                  key={type.id}
                  type="button"
                  onClick={() =>
                    setValue("selectedType", type.id, { shouldValidate: true })
                  }
                  aria-pressed={isActive}
                  className={`rounded-xl border-2 border-ink p-4 text-left transition-all motion-reduce:translate-x-0 motion-reduce:translate-y-0 ${
                    isActive
                      ? "-translate-x-0.5 -translate-y-0.5 bg-ink text-paper shadow-stkr-pink"
                      : "bg-white text-ink hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-stkr-md"
                  }`}
                >
                  <type.icon
                    className={`mb-3 size-8 ${
                      isActive ? "text-paper" : "text-mute"
                    }`}
                    aria-hidden="true"
                  />
                  <p className="font-display font-bold">{type.name}</p>
                  <p
                    className={`mt-1 text-xs ${
                      isActive ? "text-paper/70" : "text-mute"
                    }`}
                  >
                    {type.description}
                  </p>
                </button>
              )
            })}
          </div>
        </StickerCard>

        {/* Offer Details */}
        <StickerCard className="gap-4 p-5">
          <h2 className="font-display text-lg font-bold text-ink">
            Détails de l&apos;offre
          </h2>

          <FieldInput
            id="name"
            label="Nom de l'offre *"
            placeholder="Ex : -15% sur tout le magasin"
            error={errors.name?.message}
            {...register("name")}
          />

          <div className="space-y-1.5">
            <Label htmlFor="description" className="eyebrow tracking-[0.16em]">
              Description
            </Label>
            <Textarea
              id="description"
              placeholder="Décris ton offre en détail…"
              aria-invalid={!!errors.description}
              className="min-h-[100px] border-2 border-input focus-visible:border-ink focus-visible:ring-0"
              {...register("description")}
            />
            {errors.description && (
              <p role="alert" className="text-xs font-medium text-coral">
                {errors.description.message}
              </p>
            )}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Controller
              control={control}
              name="discountType"
              render={({ field }) => (
                <SelectSticker
                  label="Type de réduction"
                  value={field.value}
                  onValueChange={(v) =>
                    field.onChange(v as "percentage" | "fixed_amount")
                  }
                >
                  <SelectStickerItem value="percentage">
                    Pourcentage (%)
                  </SelectStickerItem>
                  <SelectStickerItem value="fixed_amount">
                    Montant fixe (DH)
                  </SelectStickerItem>
                </SelectSticker>
              )}
            />
            <FieldInput
              id="value"
              type="number"
              inputMode="decimal"
              min="0"
              max={discountType === "percentage" ? "100" : undefined}
              step={discountType === "percentage" ? "1" : "0.01"}
              label={`Valeur ${discountType === "percentage" ? "(%)" : "(DH)"} *`}
              placeholder={discountType === "percentage" ? "15" : "50"}
              error={errors.discountValue?.message}
              {...register("discountValue")}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <FieldInput
              id="min"
              type="number"
              inputMode="decimal"
              min="0"
              step="0.01"
              label="Achat minimum (DH)"
              placeholder="0"
              {...register("minPurchase")}
            />
            <FieldInput
              id="max"
              type="number"
              inputMode="decimal"
              min="0"
              step="0.01"
              label="Réduction max (DH)"
              placeholder="Illimité"
              {...register("maxDiscount")}
            />
          </div>
        </StickerCard>

        {/* VIP Settings */}
        <StickerCard className="gap-4 p-5">
          <div>
            <h2 className="font-display text-lg font-bold text-ink">
              Paramètres VIP
            </h2>
            <p className="text-sm text-mute">
              Définis les conditions d&apos;éligibilité
            </p>
          </div>

          <div className="flex items-center justify-between rounded-xl border-2 border-line bg-paper-2 p-4">
            <div>
              <p className="font-medium text-ink">Réservé aux membres VIP</p>
              <p className="text-xs text-mute">
                Seuls les détenteurs d&apos;une carte VIP pourront en profiter
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
              <p className="eyebrow tracking-[0.16em]">Niveau VIP minimum</p>
              <div className="grid grid-cols-3 gap-3">
                {vipLevels.map((level) => {
                  const isActive = minVipLevel === level.id
                  return (
                    <button
                      key={level.id}
                      type="button"
                      onClick={() =>
                        setValue("minVipLevel", level.id, {
                          shouldValidate: true,
                        })
                      }
                      aria-pressed={isActive}
                      className={`rounded-xl border-2 border-ink p-3 text-center transition-all motion-reduce:translate-x-0 motion-reduce:translate-y-0 ${
                        isActive
                          ? "-translate-x-0.5 -translate-y-0.5 bg-ink text-paper shadow-stkr-pink"
                          : "bg-white text-ink hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-stkr-md"
                      }`}
                    >
                      <p className="font-display font-bold">{level.name}</p>
                      <p
                        className={`text-xs ${
                          isActive ? "text-paper/70" : "text-mute"
                        }`}
                      >
                        {level.discount} de base
                      </p>
                    </button>
                  )
                })}
              </div>
            </div>
          )}
        </StickerCard>

        {/* Usage Limits */}
        <StickerCard className="gap-4 p-5">
          <h2 className="font-display text-lg font-bold text-ink">
            Limites d&apos;utilisation
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <FieldInput
              id="maxUser"
              type="number"
              inputMode="numeric"
              min="1"
              label="Max par utilisateur"
              placeholder="Illimité"
              {...register("maxUsesPerUser")}
            />
            <FieldInput
              id="maxTotal"
              type="number"
              inputMode="numeric"
              min="1"
              label="Max total"
              placeholder="Illimité"
              {...register("maxTotalUses")}
            />
          </div>
        </StickerCard>

        {/* Validity Period */}
        <StickerCard className="gap-4 p-5">
          <h2 className="font-display text-lg font-bold text-ink">
            Période de validité
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <FieldInput
              id="validFrom"
              type="date"
              label="Date de début *"
              error={errors.validFrom?.message}
              {...register("validFrom")}
            />
            <FieldInput
              id="validUntil"
              type="date"
              label="Date de fin *"
              error={errors.validUntil?.message}
              {...register("validUntil")}
            />
          </div>
        </StickerCard>

        {/* Terms */}
        <StickerCard className="gap-4 p-5">
          <h2 className="font-display text-lg font-bold text-ink">Conditions</h2>
          <div className="space-y-1.5">
            <Label htmlFor="terms" className="eyebrow tracking-[0.16em]">
              Conditions d&apos;utilisation
            </Label>
            <Textarea
              id="terms"
              placeholder="Ex : Non cumulable avec d'autres offres. Valable en magasin uniquement…"
              aria-invalid={!!errors.termsAndConditions}
              className="min-h-[80px] border-2 border-input focus-visible:border-ink focus-visible:ring-0"
              {...register("termsAndConditions")}
            />
            {errors.termsAndConditions && (
              <p role="alert" className="text-xs font-medium text-coral">
                {errors.termsAndConditions.message}
              </p>
            )}
          </div>
        </StickerCard>

        {/* Actions — barre sticky sur mobile, inline sur desktop */}
        <div className="fixed inset-x-0 bottom-0 z-30 flex gap-3 border-t-2 border-ink bg-paper p-4 sm:static sm:border-0 sm:bg-transparent sm:p-0">
          <Button type="button" variant="outline" asChild className="flex-1 sm:flex-none">
            <Link href="/partner/offers">Annuler</Link>
          </Button>
          <Button
            type="submit"
            variant="pink"
            disabled={isSubmitting || success}
            className="flex-1"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                Création en cours…
              </>
            ) : (
              <>
                <Tag className="size-4" aria-hidden="true" />
                Créer l&apos;offre
              </>
            )}
          </Button>
        </div>
      </FormKeyboardAware>
    </div>
  )
}
