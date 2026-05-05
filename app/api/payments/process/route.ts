import { createClient } from "@/lib/supabase/server"
import { NextResponse, NextRequest } from "next/server"
import { withSecurity } from "@/lib/security/api-middleware"
import { withSupabaseTimeout } from "@/lib/supabase/wrapper"
import { sendPaymentConfirmation } from "@/lib/emails"
import { isResendConfigured } from "@/lib/resend"
import crypto from "crypto"

/**
 * /api/payments/process
 *
 * Cette route est conservee pour les flux non-XP (paiement direct par formData).
 * Elle ne possede pas d'integration gateway directe et delegue normalement le
 * paiement carte a `/api/payments/hybrid` (Stripe/CMI). Tant qu'un canal n'est
 * pas actif, on retourne 503 plutot que de mentir avec un statut "paid".
 *
 * Comportement:
 *  - card             -> 503 Service Unavailable (utiliser /api/payments/hybrid)
 *  - mobile_money     -> redirige vers la page reservation en statut pending
 *  - bank_transfer    -> idem (statut pending, instructions cote UI)
 *  - ambassador       -> idem
 */

const CARD_GATEWAY_AVAILABLE = false // toggled when gateway wired

function buildPaymentReference(): string {
  // Reference non sensible mais imprevisible
  const ts = Date.now().toString(36).toUpperCase()
  const rnd = crypto.randomBytes(3).toString("hex").toUpperCase()
  return `PAY${ts}${rnd}`
}

export const POST = withSecurity(async (request: NextRequest) => {
  let bookingId: string | null = null
  try {
    const supabase = await createClient()
    const formData = await request.formData()

    const {
      data: { user },
    } = await withSupabaseTimeout(supabase.auth.getUser(), "auth.getUser", 10000)

    if (!user) {
      return NextResponse.redirect(new URL("/auth/login", request.url))
    }

    bookingId = formData.get("bookingId") as string
    const paymentMethod = formData.get("paymentMethod") as string

    if (!bookingId || !paymentMethod) {
      return NextResponse.json(
        {
          success: false,
          error: "Parametres manquants (bookingId, paymentMethod)",
        },
        { status: 400 }
      )
    }

    // Refus immediat si paiement carte demande sans gateway active
    if (paymentMethod === "card" && !CARD_GATEWAY_AVAILABLE) {
      return NextResponse.json(
        {
          success: false,
          code: "PAYMENT_GATEWAY_UNAVAILABLE",
          error:
            "Paiement temporairement indisponible. Contactez le support ou utilisez une autre methode (Mobile Money, virement).",
        },
        { status: 503 }
      )
    }

    // Get booking details
    const { data: booking } = await withSupabaseTimeout(
      supabase
        .from("bookings")
        .select("*, events(title, event_date, venue_name)")
        .eq("id", bookingId)
        .eq("parent_id", user.id)
        .single(),
      `from('bookings').select()`,
      10000
    )

    if (!booking) {
      return NextResponse.json(
        { success: false, error: "Reservation introuvable" },
        { status: 404 }
      )
    }

    // Pour tous les autres modes (mobile_money, bank_transfer, ambassador),
    // on enregistre une intention de paiement au statut "pending" sans
    // pretendre que la transaction est validee.
    const paymentStatus = "pending"
    const paymentReference = buildPaymentReference()

    const { error: updateError } = await withSupabaseTimeout(
      supabase
        .from("bookings")
        .update({
          payment_status: paymentStatus,
          payment_method: paymentMethod,
          payment_reference: paymentReference,
          status: "pending_payment",
        })
        .eq("id", bookingId),
      `from('bookings').update()`,
      10000
    )

    if (updateError) {
      console.error("[payments/process] update booking failed:", updateError)
      return NextResponse.redirect(
        new URL(
          `/mes-reservations?error=payment_failed&message=${encodeURIComponent(
            "Votre paiement n'a pas pu etre enregistre. Reessayez ou contactez le support."
          )}`,
          request.url
        )
      )
    }

    return NextResponse.redirect(
      new URL(`/mes-reservations/${bookingId}?payment=pending`, request.url)
    )
  } catch (error) {
    console.error("[payments/process] error:", error)
    return NextResponse.redirect(
      new URL(
        `/mes-reservations${
          bookingId ? `/${bookingId}` : ""
        }?error=payment_failed&message=${encodeURIComponent(
          "Votre paiement n'a pas pu etre traite. Verifiez vos informations ou essayez une autre methode."
        )}`,
        request.url
      )
    )
  }
}, { rateLimit: "api" })

/**
 * Helper interne: envoi d'email de confirmation paiement.
 * Utilise lorsque le statut passe a "paid" via un autre flux (webhook, callback CMI, etc.).
 * Renvoie un boolean pour que l'appelant puisse retourner `email_sent` honnetement.
 */
export async function notifyPaymentSuccess(params: {
  to: string
  parentName: string
  amount: number
  description: string
  transactionId: string
  paymentMethod: string
}): Promise<boolean> {
  if (!isResendConfigured()) {
    console.warn("[payments/process] Resend non configure - email non envoye")
    return false
  }
  try {
    const result = await sendPaymentConfirmation({
      to: params.to,
      parentName: params.parentName,
      paymentType: "booking",
      amount: params.amount,
      description: params.description,
      transactionId: params.transactionId,
      paymentMethod: params.paymentMethod,
      paidAt: new Date().toISOString(),
    })
    return Boolean(result.success)
  } catch (error) {
    console.error("[payments/process] notifyPaymentSuccess error:", error)
    return false
  }
}
