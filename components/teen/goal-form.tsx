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
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { PremiumButton } from "@/components/ui/button"
import { FormKeyboardAware } from "@/lib/hooks/use-keyboard-aware"

const goalSchema = z.object({
  title: z
    .string()
    .trim()
    .min(2, "Le titre doit faire au moins 2 caractères")
    .max(120, "Le titre est trop long"),
  description: z.string().max(2000, "Description trop longue").optional().or(z.literal("")),
  imageUrl: z.string().url("URL invalide").optional().or(z.literal("")),
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
    }, 600)
  }

  return (
    <FormKeyboardAware onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-1">
        <Label htmlFor="goal-title">Titre</Label>
        <Input
          id="goal-title"
          aria-invalid={!!errors.title}
          aria-describedby={errors.title ? "goal-title-err" : undefined}
          {...register("title")}
        />
        {errors.title && (
          <p id="goal-title-err" role="alert" className="text-sm text-destructive">
            {errors.title.message}
          </p>
        )}
      </div>

      <div className="space-y-1">
        <Label htmlFor="goal-description">Description (optionnel)</Label>
        <Textarea
          id="goal-description"
          aria-invalid={!!errors.description}
          {...register("description")}
        />
        {errors.description && (
          <p role="alert" className="text-sm text-destructive">
            {errors.description.message}
          </p>
        )}
      </div>

      <div className="space-y-1">
        <Label htmlFor="goal-image">URL image (optionnel)</Label>
        <Input
          id="goal-image"
          type="url"
          aria-invalid={!!errors.imageUrl}
          {...register("imageUrl")}
        />
        {errors.imageUrl && (
          <p role="alert" className="text-sm text-destructive">
            {errors.imageUrl.message}
          </p>
        )}
      </div>

      <div className="space-y-1">
        <Label htmlFor="goal-coins">Objectif en coins</Label>
        <Input
          id="goal-coins"
          type="number"
          min={1}
          inputMode="numeric"
          aria-invalid={!!errors.targetCoins}
          {...register("targetCoins", { valueAsNumber: true })}
        />
        {errors.targetCoins && (
          <p role="alert" className="text-sm text-destructive">
            {errors.targetCoins.message}
          </p>
        )}
      </div>

      <div className="space-y-1">
        <Label htmlFor="goal-date">Date cible (optionnel)</Label>
        <Input
          id="goal-date"
          type="date"
          aria-invalid={!!errors.targetDate}
          {...register("targetDate")}
        />
      </div>

      {globalError && (
        <p role="alert" aria-live="polite" className="text-sm text-destructive">
          {globalError}
        </p>
      )}

      <PremiumButton
        type="submit"
        loading={isSubmitting}
        success={success}
        disabled={isSubmitting || success}
      >
        {success ? "Créé !" : isSubmitting ? "Création..." : "Créer l'objectif"}
      </PremiumButton>
    </FormKeyboardAware>
  )
}
