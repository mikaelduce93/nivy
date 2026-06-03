/**
 * Stripe Checkout session for a reservation (issue #42).
 *
 * The payment selector handles any XP discount separately (/api/payments/xp)
 * and then charges the remaining DH here. This route just creates a Stripe
 * Checkout session for `amount` (the post-XP balance) via the shared
 * createCheckoutSession helper — it does NOT touch XP (so no double-spend with
 * the selector's XP step). Replaces the 404 the selector hit on the default
 * card method.
 */
import { createClient } from "@/lib/supabase/server"
import { NextRequest } from "next/server"
import { withSecurity, errorResponse, jsonResponse } from "@/lib/security/api-middleware"
import { createCheckoutSession } from "@/lib/stripe"
import { getAppUrl } from "@/lib/config/app-config"
import { z } from "zod"

const schema = z.object({
  bookingId: z.string().uuid("ID de réservation invalide"),
  amount: z.number().min(0, "Montant invalide"),
  xpUsed: z.number().int().min(0).optional().default(0),
})

export const POST = withSecurity(
  async (request: NextRequest) => {
    try {
      const supabase = await createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) return errorResponse("Non authentifié", 401)

      const body = await request.json()
      const v = schema.safeParse(body)
      if (!v.success) {
        return errorResponse(v.error.errors[0]?.message || "Données invalides", 400)
      }
      const { bookingId, amount, xpUsed } = v.data

      // #42 — bookings owner column is user_id (no parent_id).
      const { data: booking, error: bookingError } = await supabase
        .from("bookings")
        .select("id, user_id, total_amount, payment_status, status, booking_reference, events(title, image_url)")
        .eq("id", bookingId)
        .single()

      if (bookingError || !booking) return errorResponse("Réservation introuvable", 404)

      if (booking.user_id !== user.id) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", user.id)
          .single()
        if (profile?.role !== "admin") {
          return errorResponse("Vous n'êtes pas autorisé à payer cette réservation", 403)
        }
      }
      if (booking.payment_status === "paid") return errorResponse("Cette réservation est déjà payée", 400)
      if (booking.status === "cancelled") return errorResponse("Cette réservation a été annulée", 400)

      const appUrl = getAppUrl()
      const event = Array.isArray(booking.events) ? booking.events[0] : booking.events
      const session = await createCheckoutSession({
        customerEmail: user.email || undefined,
        productType: "event_booking",
        items: [
          {
            name: event?.title || "Réservation événement",
            description: xpUsed > 0 ? `Solde après ${xpUsed} XP utilisés` : "Paiement réservation",
            amount,
            quantity: 1,
            imageUrl: event?.image_url,
          },
        ],
        metadata: {
          bookingId,
          userId: user.id,
          xpUsed: String(xpUsed),
          type: "booking_stripe",
        },
        successUrl: `${appUrl}/reservation/confirmation?booking=${bookingId}&payment=success`,
        cancelUrl: `${appUrl}/reservation/paiement?booking=${bookingId}&payment=cancelled`,
      })

      await supabase
        .from("bookings")
        .update({
          payment_status: "pending",
          payment_method: "stripe",
          updated_at: new Date().toISOString(),
        })
        .eq("id", bookingId)

      return jsonResponse({ url: session.url, sessionId: session.id })
    } catch (error: any) {
      console.error("[Stripe create-session] Error:", error)
      return errorResponse(error.message || "Erreur lors de la création de la session", 500)
    }
  },
  { rateLimit: "booking" }
)
