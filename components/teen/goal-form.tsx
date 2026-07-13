"use client"

/**
 * GoalForm — TICKET-042 [forms]
 * react-hook-form + zod + FormKeyboardAware + PremiumButton (loading/success).
 * First field auto-focused; field-level validation on blur.
 */

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { PremiumButton } from "@/components/ui/button"
import { FieldInput } from "@/components/ui/field-input"
import { FormKeyboardAware } from "@/lib/hooks/use-keyboard-aware"
import { StickerCard } from "@/components/ui/sticker-card"
import { NivCoach } from "@/components/brand"
import { Confetti } from "@/components/ui/effects/confetti"
import { cn } from "@/lib/utils"

// Presets visuels — remplacent la saisie d'URL brute (friction mobile ado).
// La valeur (emoji) est stockée telle quelle dans `image_url` (champ cosmétique).
const IMAGE_PRESETS = [
  "🎯", "🎮", "👟", "🎧", "📱", "🚲", "🎸", "📚", "✈️", "🎨", "⚽", "🛹",
]

const goalSchema = z.object({
  title: z
    .string()
    .trim()
    .min(2, "Le titre doit faire au moins 2 caractères")
    .max(120, "Le titre est trop long"),
  description: z.string().max(2000, "Description trop longue").optional().or(z.literal("")),
  imageUrl: z.string().max(40).optional().or(z.literal("")),
  targetCoins: z
    .number({ invalid_type_error: "Doit être un nombre" })
    .int("Doit être un entier")
    .positive("Doit être supérieur à 0"),
  targetDate: z.string().optional().or(z.literal("")),
})

type GoalValues = z.infer<typeof goalSchema>

export function GoalForm() {
  const router = useRouter()
  const [globalError, setGlobalError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const {
    register,
    handleSubmit,
    setFocus,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<GoalValues>({
    resolver: zodResolver(goalSchema),
    mode: "onBlur",
    defaultValues: {
      title: "",
      description: "",
      imageUrl: "",
      targetCoins: 5000,
      targetDate: "",
    },
  })

  useEffect(() => {
    setFocus("title")
  }, [setFocus])

  const selectedImage = watch("imageUrl")
  const targetCoins = watch("targetCoins")
  // Équivalent DH live : canon 1 DH = 100 coins (cf. wallet/allowance).
  const coinsDH =
    Number.isFinite(targetCoins) && targetCoins > 0
      ? (targetCoins / 100).toFixed(2)
      : null

  const onSubmit = async (values: GoalValues) => {
    setGlobalError(null)
    const res = await fetch("/api/teen/savings/goals", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: values.title,
        description: values.description || undefined,
        image_url: values.imageUrl || undefined,
        target_coins: values.targetCoins,
        target_date: values.targetDate || undefined,
      }),
    })
    const json = await res.json()
    if (!res.ok || !json?.success) {
      setGlobalError(json?.error ?? "Erreur")
      return
    }
    setSuccess(true)
    setTimeout(() => {
      router.push("/teen/savings")
      router.refresh()
      // I2/I10 — resynchronise le header (solde) et l'onglet Épargne.
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("nivy:wallet:refresh"))
      }
    }, 600)
  }

  return (
    <StickerCard variant="default" className="p-5 sm:p-6">
      <Confetti trigger={success} palette="reward" />
      <NivCoach
        mood="happy"
        message="Choisis un objectif clair et un montant atteignable — je te suis !"
        className="mb-6"
      />

      <FormKeyboardAware
        onSubmit={handleSubmit(onSubmit)}
        className="space-y-5"
        autoComplete="off"
      >
        <FieldInput
          id="goal-title"
          label="Titre"
          error={errors.title?.message}
          {...register("title")}
        />

        <div className="flex flex-col gap-1.5">
          <label htmlFor="goal-description" className="eyebrow tracking-[0.16em]">
            Description (optionnel)
          </label>
          <Textarea
            id="goal-description"
            aria-invalid={!!errors.description}
            className="rounded-xl border-2 border-ink focus-visible:border-ink focus-visible:ring-0"
            {...register("description")}
          />
          {errors.description && (
            <p role="alert" className="text-xs font-medium text-coral">
              {errors.description.message}
            </p>
          )}
        </div>

        {/* Presets visuels — remplacent la saisie d'URL brute */}
        <div className="flex flex-col gap-2">
          <span className="eyebrow tracking-[0.16em]">Visuel (optionnel)</span>
          <div className="grid grid-cols-6 gap-2">
            {IMAGE_PRESETS.map((emoji) => {
              const active = selectedImage === emoji
              return (
                <button
                  key={emoji}
                  type="button"
                  aria-pressed={active}
                  onClick={() =>
                    setValue("imageUrl", active ? "" : emoji, { shouldValidate: true })
                  }
                  className={cn(
                    "grid aspect-square place-items-center rounded-xl border-2 border-ink text-2xl transition-all",
                    active
                      ? "-translate-x-0.5 -translate-y-0.5 bg-pink shadow-stkr-pink motion-reduce:translate-x-0 motion-reduce:translate-y-0"
                      : "bg-white hover:bg-paper-2",
                  )}
                >
                  {emoji}
                </button>
              )
            })}
          </div>
        </div>

        {/* Objectif en coins — suffixe ⊙ corail + équivalent DH live */}
        <div className="flex flex-col gap-1.5">
          <label htmlFor="goal-coins" className="eyebrow tracking-[0.16em]">
            Objectif en coins
          </label>
          <div className="relative">
            <Input
              id="goal-coins"
              type="number"
              min={1}
              inputMode="numeric"
              aria-invalid={!!errors.targetCoins}
              className="pr-10 focus-visible:border-ink focus-visible:ring-0"
              {...register("targetCoins", { valueAsNumber: true })}
            />
            <span
              aria-hidden="true"
              className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 font-display text-lg font-bold text-coral"
            >
              ⊙
            </span>
          </div>
          {errors.targetCoins ? (
            <p role="alert" className="text-xs font-medium text-coral">
              {errors.targetCoins.message}
            </p>
          ) : coinsDH ? (
            <p className="font-mono text-xs tabular-nums text-mute">
              {targetCoins.toLocaleString()} coins ≈ {coinsDH} DH
            </p>
          ) : null}
        </div>

        <FieldInput
          id="goal-date"
          type="date"
          label="Date cible (optionnel)"
          error={errors.targetDate?.message}
          {...register("targetDate")}
        />

        {globalError && (
          <p role="alert" aria-live="polite" className="text-sm font-medium text-coral">
            {globalError}
          </p>
        )}

        <PremiumButton
          type="submit"
          variant="pink"
          loading={isSubmitting}
          success={success}
          disabled={isSubmitting || success}
          className="w-full"
        >
          {success ? "Créé !" : isSubmitting ? "Création..." : "Créer l'objectif"}
        </PremiumButton>
      </FormKeyboardAware>
    </StickerCard>
  )
}
