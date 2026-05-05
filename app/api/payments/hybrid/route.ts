/**
 * Hybrid Payment API - XP + DH
 * ============================
 * Endpoint for processing hybrid payments combining XP and cash (Stripe/CMI)
 *
 * POST /api/payments/hybrid
 * Body: { bookingId, xpAmount, cashAmount, paymentMethod }
 */

import { createClient } from "@/lib/supabase/server"
import { NextRequest, NextResponse } from "next/server"
import { withSecurity, errorResponse, jsonResponse } from "@/lib/security/api-middleware"
import {
  calculateHybridPayment,
  convertXPToDH,
  PARENTAL_APPROVAL_THRESHOLD_XP,
  MIN_XP_FOR_PAYMENT,
} from "@/lib/payments/xp-converter"
import { createCheckoutSession, formatPriceToStripe } from "@/lib/stripe"
import { getAppUrl } from "@/lib/config/app-config"
import { z } from "zod"

// Request validation schema
const hybridPaymentSchema = z.object({
  bookingId: z.string().uuid("ID de réservation invalide"),
  xpAmount: z.number().int().min(0, "Le montant XP ne peut pas être négatif"),
  teenId: z.string().uuid("ID teen invalide"),
  paymentMethod: z.enum(["stripe", "cmi", "mobile_money"]).optional().default("stripe"),
})

export const POST = withSecurity(
  async (request: NextRequest) => {
    try {
      const supabase = await createClient()

      // Verify authentication
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        return errorResponse("Non authentifié", 401)
      }

      // Parse and validate request body
      const body = await request.json()
      const validation = hybridPaymentSchema.safeParse(body)

      if (!validation.success) {
        return errorResponse(
          validation.error.errors[0]?.message || "Données invalides",
          400,
          { errors: validation.error.errors }
        )
      }

      const { bookingId, xpAmount, teenId, paymentMethod } = validation.data

      // Get user profile to check role
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single()

      // Get booking details
      const { data: booking, error: bookingError } = await supabase
        .from("bookings")
        .select(`
          *,
          events (id, title, date, image_url),
          booking_tickets (child_id)
        `)
        .eq("id", bookingId)
        .single()

      if (bookingError || !booking) {
        return errorResponse("Réservation introuvable", 404)
      }

      // Verify user owns this booking or is admin
      if (booking.parent_id !== user.id && profile?.role !== "admin") {
        return errorResponse("Vous n'êtes pas autorisé à payer cette réservation", 403)
      }

      // Check booking status
      if (booking.payment_status === "paid") {
        return errorResponse("Cette réservation est déjà payée", 400)
      }

      if (booking.status === "cancelled") {
        return errorResponse("Cette réservation a été annulée", 400)
      }

      // Get teen's XP balance
      const { data: userXP, error: xpError } = await supabase
        .from("user_xp")
        .select("total_xp, available_xp")
        .eq("teen_id", teenId)
        .single()

      // If no XP record exists, use 0
      const availableXP = userXP?.total_xp || 0

      // Calculate payment breakdown
      const paymentResult = calculateHybridPayment(
        booking.total_amount,
        xpAmount,
        availableXP
      )

      if (!paymentResult.isValid) {
        return errorResponse(paymentResult.errorMessage || "Calcul de paiement invalide", 400, {
          code: paymentResult.errorCode,
        })
      }

      // Check if parental approval is required
      if (paymentResult.requiresParentalApproval && profile?.role === "teen") {
        // Create parental approval request
        const { data: approvalRequest, error: approvalError } = await supabase
          .from("parental_approvals")
          .insert({
            teen_id: teenId,
            parent_id: booking.parent_id,
            type: "xp_payment",
            amount: xpAmount,
            amount_dh: paymentResult.xpValueDH,
            booking_id: bookingId,
            status: "pending",
            created_at: new Date().toISOString(),
          })
          .select()
          .single()

        if (approvalError) {
          console.error("[Hybrid Payment] Failed to create approval request:", approvalError)
          return errorResponse("Impossible de créer la demande d'approbation", 500)
        }

        // Send notification to parent
        await supabase.from("notifications").insert({
          user_id: booking.parent_id,
          type: "xp_approval_request",
          title: "Approbation requise",
          message: `Votre enfant souhaite utiliser ${xpAmount} XP (${paymentResult.xpValueDH} DH) pour payer une réservation.`,
          read: false,
          resource_type: "parental_approval",
          resource_id: approvalRequest.id,
          created_at: new Date().toISOString(),
        })

        return jsonResponse({
          success: true,
          status: "pending_approval",
          approvalId: approvalRequest.id,
          message: `Approbation parentale requise pour utiliser ${xpAmount} XP (${paymentResult.xpValueDH} DH)`,
        })
      }

      // Process XP deduction if any XP is being used
      if (xpAmount > 0) {
        // Deduct XP from user
        const { error: deductError } = await supabase
          .from("user_xp")
          .update({
            total_xp: availableXP - paymentResult.xpAmount,
            updated_at: new Date().toISOString(),
          })
          .eq("teen_id", teenId)

        if (deductError) {
          console.error("[Hybrid Payment] Failed to deduct XP:", deductError)
          return errorResponse("Erreur lors de la déduction des XP", 500)
        }

        // Record XP transaction in ledger
        await supabase.from("xp_transactions").insert({
          teen_id: teenId,
          amount: -paymentResult.xpAmount,
          type: "purchase",
          description: `Paiement réservation ${booking.booking_reference}`,
          reference_type: "booking",
          reference_id: bookingId,
          created_at: new Date().toISOString(),
        })

        // Update booking with XP info
        await supabase
          .from("bookings")
          .update({
            xp_used: paymentResult.xpAmount,
            xp_value: paymentResult.xpValueDH,
            amount_after_xp: paymentResult.cashAmountDH,
            updated_at: new Date().toISOString(),
          })
          .eq("id", bookingId)
      }

      // If no cash payment needed, complete the payment
      if (paymentResult.cashAmountDH === 0) {
        // Fully paid with XP
        await supabase
          .from("bookings")
          .update({
            payment_status: "paid",
            payment_method: "xp",
            status: "confirmed",
            paid_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq("id", bookingId)

        // Log payment
        await supabase.from("payment_logs").insert({
          booking_id: bookingId,
          user_id: user.id,
          amount: 0,
          xp_used: paymentResult.xpAmount,
          xp_value: paymentResult.xpValueDH,
          currency: "MAD",
          status: "succeeded",
          type: "xp_only",
          created_at: new Date().toISOString(),
        })

        // Create notification for parent
        await supabase.from("notifications").insert({
          user_id: booking.parent_id,
          type: "payment_success",
          title: "Paiement XP confirmé",
          message: `Réservation ${booking.booking_reference} payée avec ${paymentResult.xpAmount} XP`,
          read: false,
          resource_type: "booking",
          resource_id: bookingId,
          created_at: new Date().toISOString(),
        })

        return jsonResponse({
          success: true,
          status: "completed",
          xpUsed: paymentResult.xpAmount,
          xpValue: paymentResult.xpValueDH,
          cashAmount: 0,
          totalAmount: paymentResult.totalPriceDH,
          savings: paymentResult.savings,
          newXPBalance: availableXP - paymentResult.xpAmount,
          message: "Paiement effectué à 100% avec XP",
        })
      }

      // Cash payment needed - create payment session
      // URL canonique resolue via lib/config/app-config (strict en production).
      const appUrl = getAppUrl()

      if (paymentMethod === "stripe") {
        // Create Stripe checkout session
        const session = await createCheckoutSession({
          customerEmail: user.email || undefined,
          productType: "event_booking",
          items: [
            {
              name: booking.events?.title || "Réservation événement",
              description: xpAmount > 0
                ? `Montant après ${paymentResult.xpAmount} XP utilisés (économie: ${paymentResult.xpValueDH} DH)`
                : "Paiement réservation",
              amount: paymentResult.cashAmountDH,
              quantity: 1,
              imageUrl: booking.events?.image_url,
            },
          ],
          metadata: {
            bookingId,
            userId: user.id,
            teenId,
            xpUsed: paymentResult.xpAmount.toString(),
            xpValue: paymentResult.xpValueDH.toString(),
            type: "hybrid_payment",
          },
          successUrl: `${appUrl}/mes-reservations/${bookingId}?payment=success`,
          cancelUrl: `${appUrl}/mes-reservations/${bookingId}?payment=cancelled`,
        })

        // Update booking with payment method
        await supabase
          .from("bookings")
          .update({
            payment_status: "pending",
            payment_method: "hybrid_stripe",
            stripe_session_id: session.id,
            updated_at: new Date().toISOString(),
          })
          .eq("id", bookingId)

        return jsonResponse({
          success: true,
          status: "redirect",
          redirectUrl: session.url,
          sessionId: session.id,
          xpUsed: paymentResult.xpAmount,
          xpValue: paymentResult.xpValueDH,
          cashAmount: paymentResult.cashAmountDH,
          totalAmount: paymentResult.totalPriceDH,
          savings: paymentResult.savings,
        })
      } else if (paymentMethod === "cmi") {
        // Vérifier que le feature flag CMI est activé
        const { getFeatureFlag } = await import("@/lib/features/flags")
        const cmiEnabled = await getFeatureFlag("cmi_payment")
        if (!cmiEnabled) {
          return errorResponse("CMI payment is not available", 403)
        }

        // CMI payment
        const { CMIPaymentGateway } = await import("@/lib/payments/cmi")
        const cmiGateway = new CMIPaymentGateway()

        const cmiPayment = await cmiGateway.createPayment({
          amount: paymentResult.cashAmountDH,
          orderId: booking.booking_reference,
          customerEmail: user.email || "",
          description: xpAmount > 0
            ? `Réservation ${booking.booking_reference} (${paymentResult.xpAmount} XP utilisés)`
            : `Réservation ${booking.booking_reference}`,
          callbackUrl: `${appUrl}/api/payments/cmi/callback`,
          bookingId,
          xpUsed: paymentResult.xpAmount,
        })

        if (!cmiPayment.success) {
          // Rollback XP deduction if CMI fails
          if (xpAmount > 0) {
            await supabase
              .from("user_xp")
              .update({ total_xp: availableXP })
              .eq("teen_id", teenId)
          }
          return errorResponse(cmiPayment.error || "Erreur CMI", 500)
        }

        return jsonResponse({
          success: true,
          status: "redirect_cmi",
          formHtml: cmiPayment.formHtml,
          xpUsed: paymentResult.xpAmount,
          xpValue: paymentResult.xpValueDH,
          cashAmount: paymentResult.cashAmountDH,
          savings: paymentResult.savings,
        })
      } else {
        // Vérifier que le feature flag Mobile Money est activé
        const { getFeatureFlag } = await import("@/lib/features/flags")
        const mobileMoneyEnabled = await getFeatureFlag("mobile_money_payment")
        if (!mobileMoneyEnabled) {
          return errorResponse("Mobile Money payment is not available", 403)
        }

        // Mobile Money
        const { mobileMoneyService } = await import("@/lib/payments/mobile-money")

        const mmPayment = await mobileMoneyService.initiatePayment({
          operator: "orange_money", // Default, should be passed from frontend
          phone: "", // Should be passed from frontend
          amount: paymentResult.cashAmountDH,
          reference: booking.booking_reference,
          description: `Réservation ${booking.booking_reference}`,
          bookingId,
          xpUsed: paymentResult.xpAmount,
        })

        if (!mmPayment.success) {
          // Rollback XP deduction if MM fails
          if (xpAmount > 0) {
            await supabase
              .from("user_xp")
              .update({ total_xp: availableXP })
              .eq("teen_id", teenId)
          }
          return errorResponse(mmPayment.error || "Erreur Mobile Money", 500)
        }

        return jsonResponse({
          success: true,
          status: "mobile_money_pending",
          paymentId: mmPayment.paymentId,
          code: mmPayment.code,
          instructions: mmPayment.instructions,
          expiresAt: mmPayment.expiresAt,
          xpUsed: paymentResult.xpAmount,
          xpValue: paymentResult.xpValueDH,
          cashAmount: paymentResult.cashAmountDH,
          savings: paymentResult.savings,
        })
      }
    } catch (error: any) {
      console.error("[Hybrid Payment] Error:", error)
      return errorResponse(
        error.message || "Erreur lors du traitement du paiement",
        500
      )
    }
  },
  { rateLimit: "booking" }
)

// GET endpoint to calculate payment preview
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return errorResponse("Non authentifié", 401)
    }

    const { searchParams } = new URL(request.url)
    const bookingId = searchParams.get("bookingId")
    const teenId = searchParams.get("teenId")
    const xpAmount = parseInt(searchParams.get("xpAmount") || "0")

    if (!bookingId || !teenId) {
      return errorResponse("Paramètres manquants", 400)
    }

    // Get booking
    const { data: booking } = await supabase
      .from("bookings")
      .select("total_amount, payment_status")
      .eq("id", bookingId)
      .single()

    if (!booking) {
      return errorResponse("Réservation introuvable", 404)
    }

    // Get teen's XP balance
    const { data: userXP } = await supabase
      .from("user_xp")
      .select("total_xp")
      .eq("teen_id", teenId)
      .single()

    const availableXP = userXP?.total_xp || 0

    // Calculate payment breakdown
    const paymentResult = calculateHybridPayment(
      booking.total_amount,
      xpAmount,
      availableXP
    )

    return jsonResponse({
      ...paymentResult,
      availableXP,
      minXPRequired: MIN_XP_FOR_PAYMENT,
      parentalApprovalThreshold: PARENTAL_APPROVAL_THRESHOLD_XP,
    })
  } catch (error) {
    console.error("[Hybrid Payment Preview] Error:", error)
    return errorResponse("Erreur serveur", 500)
  }
}
