"use client"

/**
 * MenuCartClient — TICKET-042 [forms] (W2-A13) over TICKET-031 (W2-A18).
 *
 * - Cart UI + optimistic order runner are preserved verbatim from W2-A18.
 * - Checkout block is now a react-hook-form + zod form (deliveryType,
 *   deliveryAddress when delivery, notes, paymentMethod) inside a
 *   <FormKeyboardAware>, with a <PremiumButton> for loading/success state.
 * - First field auto-focused; field-level inline validation on blur.
 */

import { useEffect, useMemo, useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { StatusBadge } from "@/components/ui/status-badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { PremiumButton } from "@/components/ui/button"
import { FormKeyboardAware } from "@/lib/hooks/use-keyboard-aware"
import { useOptimisticRunner } from "@/lib/hooks/use-optimistic-mutation"
import { toast } from "@/lib/utils/toast"
import { useJuice } from "@/lib/hooks/use-juice"

interface MenuItem {
  id: string
  name: string
  description?: string | null
  category?: string | null
  price_dh: number
  price_coins: number | null
  calories?: number | null
  nutrition_tags?: string[] | null
  allergens?: string[] | null
  is_halal: boolean
  prep_time_minutes?: number | null
}

const FILTER_LABELS: Record<"all" | "halal" | "vegetarian" | "healthy", string> = {
  all: "Tous",
  halal: "Halal",
  vegetarian: "Végétarien",
  healthy: "Healthy",
}

const checkoutSchema = z
  .object({
    deliveryType: z.enum(["pickup", "delivery"]),
    deliveryAddress: z.string().max(300, "Adresse trop longue").optional(),
    notes: z.string().max(500, "Notes trop longues").optional(),
    paymentMethod: z.enum(["coins", "dh"]),
  })
  .refine(
    (v) =>
      v.deliveryType !== "delivery" ||
      (v.deliveryAddress && v.deliveryAddress.trim().length >= 5),
    {
      path: ["deliveryAddress"],
      message: "Adresse de livraison requise",
    }
  )

type CheckoutValues = z.infer<typeof checkoutSchema>

export default function MenuCartClient({
  partnerId,
  items,
}: {
  partnerId: string
  items: MenuItem[]
}) {
  const [cart, setCart] = useState<Record<string, number>>({})
  const [filter, setFilter] = useState<"all" | "halal" | "vegetarian" | "healthy">("all")
  const [orderResult, setOrderResult] = useState<{
    ok: boolean
    message: string
    orderId?: string
  } | null>(null)
  const [success, setSuccess] = useState(false)
  const { play: playJuice } = useJuice()

  const {
    register,
    handleSubmit,
    watch,
    setFocus,
    formState: { errors },
  } = useForm<CheckoutValues>({
    resolver: zodResolver(checkoutSchema),
    mode: "onBlur",
    defaultValues: {
      deliveryType: "pickup",
      deliveryAddress: "",
      notes: "",
      paymentMethod: "coins",
    },
  })

  const deliveryType = watch("deliveryType")

  useEffect(() => {
    setFocus("deliveryType")
  }, [setFocus])

  const filtered = useMemo(() => {
    if (filter === "all") return items
    if (filter === "halal") return items.filter((i) => i.is_halal)
    return items.filter((i) => (i.nutrition_tags ?? []).includes(filter))
  }, [items, filter])

  const totalCoins = useMemo(
    () =>
      Object.entries(cart).reduce((sum, [id, qty]) => {
        const it = items.find((x) => x.id === id)
        const coins = it?.price_coins ?? Math.round((it?.price_dh ?? 0) * 100)
        return sum + coins * qty
      }, 0),
    [cart, items]
  )

  // TICKET-031 (W2-A18): cart add/remove fires a `pop` haptic+sound so the
  // tap feels instantaneous — quantities are local state but the juice cue
  // is what makes it feel optimistic. The state itself updates synchronously.
  const addToCart = (itemId: string) => {
    setCart((c) => ({ ...c, [itemId]: (c[itemId] ?? 0) + 1 }))
    playJuice("pop")
  }

  const removeFromCart = (itemId: string) => {
    setCart((c) => ({ ...c, [itemId]: Math.max(0, (c[itemId] ?? 0) - 1) }))
    playJuice("tap")
  }

  // TICKET-031 (W2-A18): food-order-place — surface the success banner and
  // empty the cart instantly. On error we restore the cart, drop the banner
  // back to the failure state, and surface a juicy toast for retry.
  const orderRunner = useOptimisticRunner<
    CheckoutValues,
    { orderId?: string },
    { previousCart: Record<string, number>; previousResult: typeof orderResult }
  >(
    async (values) => {
      const itemsPayload = Object.entries(cart)
        .filter(([, q]) => q > 0)
        .map(([id, qty]) => ({ menuItemId: id, qty }))
      const res = await fetch("/api/teen/food/order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          partnerId,
          deliveryType: values.deliveryType,
          deliveryAddress:
            values.deliveryType === "delivery"
              ? values.deliveryAddress?.trim() || undefined
              : undefined,
          notes: values.notes?.trim() || undefined,
          items: itemsPayload,
          paymentMethod: values.paymentMethod,
        }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok || !json?.success) {
        const message =
          (typeof json?.error === "string" && json.error) ||
          "Erreur lors de la commande."
        throw new Error(message)
      }
      return { orderId: json?.data?.orderId ?? json?.orderId }
    },
    {
      onMutate: () => {
        const ctx = { previousCart: cart, previousResult: orderResult }
        // Optimistic: show success banner and clear cart immediately.
        setOrderResult({ ok: true, message: "Commande envoyée avec succès." })
        setCart({})
        return ctx
      },
      onError: (err, _input, ctx) => {
        // Rollback: restore the cart so the user can retry without re-typing.
        if (ctx) {
          setCart(ctx.previousCart)
        }
        const message = err.message || "Erreur réseau."
        setOrderResult({ ok: false, message })
        setSuccess(false)
        toast.error(message)
      },
      onSuccess: (output) => {
        setOrderResult({
          ok: true,
          message: "Commande envoyée avec succès.",
          orderId: output.orderId,
        })
        setSuccess(true)
        toast.success("Commande envoyée !")
      },
    },
  )

  const submitting = orderRunner.isPending

  const cartCount = useMemo(
    () => Object.values(cart).reduce((s, q) => s + q, 0),
    [cart]
  )

  const onSubmit = (values: CheckoutValues) => {
    if (submitting || cartCount === 0) return
    setOrderResult(null)
    setSuccess(false)
    void orderRunner.mutate(values)
  }

  return (
    <div>
      <div
        role="group"
        aria-label="Filtres du menu"
        className="mb-4 flex flex-wrap gap-2 text-sm"
      >
        {(["all", "halal", "vegetarian", "healthy"] as const).map((f) => {
          const active = filter === f
          return (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              aria-pressed={active}
              className={`rounded border border-border px-3 py-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                active
                  ? "bg-primary text-primary-foreground"
                  : "bg-card text-foreground"
              }`}
            >
              {FILTER_LABELS[f]}
            </button>
          )
        })}
      </div>

      <ul className="space-y-3">
        {filtered.map((it) => {
          const qty = cart[it.id] ?? 0
          const coins = it.price_coins ?? Math.round(it.price_dh * 100)
          return (
            <li
              key={it.id}
              className="rounded border border-border bg-card p-3 flex justify-between gap-4"
            >
              <div className="flex-1">
                <h3 className="font-medium text-base m-0 text-foreground">
                  {it.name}{" "}
                  {!it.is_halal && (
                    <StatusBadge
                      variant="danger"
                      size="sm"
                      label="non-halal"
                      icon={false}
                      className="ml-1"
                    />
                  )}
                </h3>
                {it.description && (
                  <div className="text-xs text-muted-foreground">{it.description}</div>
                )}
                <div className="text-xs text-muted-foreground mt-1">
                  {coins} coins · {it.price_dh} DH
                  {it.calories ? ` · ${it.calories} kcal` : ""}
                  {it.prep_time_minutes ? ` · ${it.prep_time_minutes} min` : ""}
                </div>
                {(it.nutrition_tags ?? []).length > 0 && (
                  <div className="text-xs text-info mt-1">
                    {(it.nutrition_tags ?? []).join(" · ")}
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => removeFromCart(it.id)}
                  aria-label={`Diminuer la quantité de ${it.name}`}
                  className="rounded bg-muted px-2 py-1 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <span aria-hidden="true">−</span>
                </button>
                <span
                  className="w-6 text-center text-sm text-foreground"
                  aria-label={`Quantité de ${it.name}: ${qty}`}
                  aria-live="polite"
                >
                  {qty}
                </span>
                <button
                  type="button"
                  onClick={() => addToCart(it.id)}
                  aria-label={`Augmenter la quantité de ${it.name}`}
                  className="rounded bg-muted px-2 py-1 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <span aria-hidden="true">+</span>
                </button>
              </div>
            </li>
          )
        })}
      </ul>

      <FormKeyboardAware
        onSubmit={handleSubmit(onSubmit)}
        className="mt-6 space-y-4 rounded-lg border border-border bg-card p-4"
        aria-label="Finaliser la commande"
      >
        <h2 className="text-base font-semibold text-foreground">
          Finaliser la commande
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label htmlFor="deliveryType">Type</Label>
            <select
              id="deliveryType"
              className="w-full border border-border bg-background text-foreground rounded px-2 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              {...register("deliveryType")}
            >
              <option value="pickup">À emporter</option>
              <option value="delivery">Livraison</option>
            </select>
          </div>

          <div className="space-y-1">
            <Label htmlFor="paymentMethod">Paiement</Label>
            <select
              id="paymentMethod"
              className="w-full border border-border bg-background text-foreground rounded px-2 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              {...register("paymentMethod")}
            >
              <option value="coins">Coins</option>
              <option value="dh">DH</option>
            </select>
          </div>
        </div>

        {deliveryType === "delivery" && (
          <div className="space-y-1">
            <Label htmlFor="deliveryAddress">Adresse de livraison</Label>
            <Input
              id="deliveryAddress"
              autoComplete="street-address"
              aria-invalid={!!errors.deliveryAddress}
              {...register("deliveryAddress")}
            />
            {errors.deliveryAddress && (
              <p role="alert" className="text-sm text-destructive">
                {errors.deliveryAddress.message}
              </p>
            )}
          </div>
        )}

        <div className="space-y-1">
          <Label htmlFor="notes">Notes (optionnel)</Label>
          <Textarea
            id="notes"
            placeholder="Allergies, préférences…"
            autoComplete="off"
            aria-invalid={!!errors.notes}
            {...register("notes")}
          />
          {errors.notes && (
            <p role="alert" className="text-sm text-destructive">
              {errors.notes.message}
            </p>
          )}
        </div>

        <div className="sticky bottom-0 flex items-center justify-between rounded-lg bg-info-soft/15 border border-info/20 p-3">
          <div className="text-sm text-foreground">
            Total: <strong>{totalCoins} coins</strong>
          </div>
          <PremiumButton
            type="submit"
            loading={submitting}
            success={success}
            disabled={submitting || success || cartCount === 0}
          >
            {success
              ? "Envoyée !"
              : submitting
                ? "Envoi..."
                : "Commander"}
          </PremiumButton>
        </div>
      </FormKeyboardAware>

      {orderResult && (
        <div
          role={orderResult.ok ? "status" : "alert"}
          aria-live={orderResult.ok ? "polite" : "assertive"}
          className={`mt-4 rounded p-3 text-sm ${
            orderResult.ok
              ? "bg-success-soft/15 text-success border border-success/30"
              : "bg-destructive/10 text-destructive border border-destructive/30"
          }`}
        >
          <p className="font-medium">{orderResult.message}</p>
          {orderResult.orderId && (
            <p className="mt-1 text-xs opacity-80">
              Commande #{orderResult.orderId.slice(0, 8)}
            </p>
          )}
        </div>
      )}

    </div>
  )
}
