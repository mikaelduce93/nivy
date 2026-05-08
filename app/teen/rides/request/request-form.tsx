"use client"

/**
 * RequestRideForm — TICKET-042 [forms]
 * react-hook-form + zod + FormKeyboardAware + PremiumButton (loading/success).
 */

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent } from "@/components/ui/card"
import { PremiumButton } from "@/components/ui/button"
import { FormKeyboardAware } from "@/lib/hooks/use-keyboard-aware"

interface Props {
  eventId: string | null
}

const rideSchema = z.object({
  pickupAddress: z
    .string()
    .trim()
    .min(3, "Adresse de prise en charge requise")
    .max(200, "Trop long"),
  dropoffAddress: z
    .string()
    .trim()
    .min(3, "Destination requise")
    .max(200, "Trop long"),
  scheduledFor: z
    .string()
    .min(1, "Date et heure requises")
    .refine((v) => !Number.isNaN(new Date(v).getTime()), "Date invalide"),
  estimatedDh: z.string().optional(),
  paymentMethod: z.enum(["coins", "dh", "split_with_parent"]),
})

type RideValues = z.infer<typeof rideSchema>

export function RequestRideForm({ eventId }: Props) {
  const router = useRouter()
  const [globalError, setGlobalError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const {
    register,
    handleSubmit,
    setFocus,
    formState: { errors, isSubmitting },
  } = useForm<RideValues>({
    resolver: zodResolver(rideSchema),
    mode: "onBlur",
    defaultValues: {
      pickupAddress: "",
      dropoffAddress: "",
      scheduledFor: "",
      estimatedDh: "",
      paymentMethod: "coins",
    },
  })

  useEffect(() => {
    setFocus("pickupAddress")
  }, [setFocus])

  const onSubmit = async (values: RideValues) => {
    setGlobalError(null)
    try {
      const estimated =
        !values.estimatedDh || values.estimatedDh.trim() === ""
          ? null
          : Number(values.estimatedDh)
      const res = await fetch("/api/teen/rides/request", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          pickupAddress: values.pickupAddress,
          dropoffAddress: values.dropoffAddress,
          scheduledFor: new Date(values.scheduledFor).toISOString(),
          eventId,
          paymentMethod: values.paymentMethod,
          estimatedDh: estimated,
        }),
      })
      const json = await res.json()
      if (!res.ok || !json?.success) {
        setGlobalError(json?.error || "Échec de la demande")
        return
      }
      setSuccess(true)
      setTimeout(() => router.push("/teen/rides"), 600)
    } catch (err) {
      setGlobalError(err instanceof Error ? err.message : "Erreur réseau")
    }
  }

  return (
    <Card>
      <CardContent className="p-6">
        <FormKeyboardAware
          onSubmit={handleSubmit(onSubmit)}
          className="space-y-4"
        >
          <div className="space-y-2">
            <Label htmlFor="pickup">Lieu de prise en charge</Label>
            <Input
              id="pickup"
              autoComplete="street-address"
              aria-invalid={!!errors.pickupAddress}
              {...register("pickupAddress")}
            />
            {errors.pickupAddress && (
              <p role="alert" className="text-sm text-destructive">
                {errors.pickupAddress.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="dropoff">Destination</Label>
            <Input
              id="dropoff"
              autoComplete="street-address"
              aria-invalid={!!errors.dropoffAddress}
              {...register("dropoffAddress")}
            />
            {errors.dropoffAddress && (
              <p role="alert" className="text-sm text-destructive">
                {errors.dropoffAddress.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="scheduledFor">Date et heure</Label>
            <Input
              id="scheduledFor"
              type="datetime-local"
              aria-invalid={!!errors.scheduledFor}
              {...register("scheduledFor")}
            />
            {errors.scheduledFor && (
              <p role="alert" className="text-sm text-destructive">
                {errors.scheduledFor.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="estimated">Coût estimé (DH)</Label>
            <Input
              id="estimated"
              type="number"
              min={0}
              inputMode="decimal"
              aria-invalid={!!errors.estimatedDh}
              {...register("estimatedDh")}
            />
            {errors.estimatedDh && (
              <p role="alert" className="text-sm text-destructive">
                {errors.estimatedDh.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="payment">Méthode de paiement</Label>
            <select
              id="payment"
              className="w-full border border-border bg-background text-foreground rounded px-2 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              {...register("paymentMethod")}
            >
              <option value="coins">Coins</option>
              <option value="dh">DH</option>
              <option value="split_with_parent">Partagé avec le parent</option>
            </select>
          </div>

          {globalError && (
            <p
              role="alert"
              aria-live="polite"
              className="text-sm text-destructive"
            >
              {globalError}
            </p>
          )}

          <PremiumButton
            type="submit"
            loading={isSubmitting}
            success={success}
            disabled={isSubmitting || success}
          >
            {success ? "Envoyé !" : isSubmitting ? "Envoi…" : "Demander le trajet"}
          </PremiumButton>
        </FormKeyboardAware>
      </CardContent>
    </Card>
  )
}
