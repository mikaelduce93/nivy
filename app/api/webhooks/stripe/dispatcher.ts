import Stripe from "stripe"
import { createClient } from "@/lib/supabase/server"
import { formatPriceFromStripe } from "@/lib/stripe"

/**
 * Stripe Event Handlers
 */
export const StripeHandlers = {
  async handleCheckoutCompleted(session: Stripe.Checkout.Session) {
    const supabase = await createClient()
    const type = session.metadata?.type

    switch (type) {
      case "event_booking":
        await this.handleBookingPayment(session, supabase)
        break
      case "coin_topup":
        await this.handleCoinTopup(session, supabase)
        break
      default:
        console.warn(`[Stripe Webhook] Unhandled checkout type: ${type}`)
    }
  },

  async handleBookingPayment(session: Stripe.Checkout.Session, supabase: any) {
    const { bookingId, userId, xpUsed, xpValue, type } = session.metadata || {}
    const isHybrid = type === "hybrid_payment"
    const paymentMethod = isHybrid && parseInt(xpUsed || "0") > 0 ? "hybrid_stripe" : "stripe"

    if (!bookingId) return

    await supabase.from("bookings").update({
      payment_status: "paid",
      payment_method: paymentMethod,
      stripe_session_id: session.id,
      stripe_payment_intent: session.payment_intent,
      paid_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      ...(parseInt(xpUsed || "0") > 0 && { xp_used: parseInt(xpUsed!), xp_value: parseFloat(xpValue!) }),
    }).eq("id", bookingId)

    if (userId) {
      await supabase.from("notifications").insert({
        user_id: userId,
        type: "payment_success",
        title: isHybrid ? "Paiement hybride confirmé" : "Paiement confirmé",
        message: isHybrid ? `Paiement confirmé : ${xpUsed} XP utilisés + carte.` : "Votre réservation est validée.",
        resource_type: "booking",
        resource_id: bookingId,
      })
    }

    await supabase.from("payment_logs").insert({
      booking_id: bookingId,
      user_id: userId,
      stripe_session_id: session.id,
      stripe_payment_intent: session.payment_intent,
      amount: formatPriceFromStripe(session.amount_total || 0),
      currency: session.currency,
      status: "succeeded",
      type: isHybrid ? "hybrid_payment" : "event_booking",
      xp_used: xpUsed || null,
      xp_value: xpValue || null,
    })
  },

  async handleCoinTopup(session: Stripe.Checkout.Session, supabase: any) {
    const { teenId, parentId, coins, bonus } = session.metadata || {}
    if (!teenId || !coins) return

    const totalCoins = parseInt(coins) + parseInt(bonus || "0")
    const { data: teen } = await supabase.from("profiles").select("coins").eq("id", teenId).single()

    await supabase.from("profiles").update({
      coins: (teen?.coins || 0) + totalCoins,
      updated_at: new Date().toISOString()
    }).eq("id", teenId)

    await supabase.from("coin_transactions").insert({
      teen_id: teenId,
      parent_id: parentId,
      amount: totalCoins,
      type: "topup",
      description: `Recharge de ${coins} coins${bonus ? ` + ${bonus} bonus` : ""}`,
      stripe_session_id: session.id,
    })

    await supabase.from("notifications").insert({
      user_id: teenId,
      type: "coins_received",
      title: "Coins reçus !",
      message: `Tu as reçu ${totalCoins} coins sur ton compte.`,
    })
  },

  async handlePaymentSucceeded(paymentIntent: Stripe.PaymentIntent) {
    const supabase = await createClient()
    await supabase.from("payment_logs").update({
      status: "succeeded",
      updated_at: new Date().toISOString()
    }).eq("stripe_payment_intent", paymentIntent.id)
  },

  async handlePaymentFailed(paymentIntent: Stripe.PaymentIntent) {
    const supabase = await createClient()
    const { bookingId, userId } = paymentIntent.metadata || {}

    if (bookingId) {
      await supabase.from("bookings").update({
        payment_status: "failed",
        updated_at: new Date().toISOString()
      }).eq("id", bookingId)

      if (userId) {
        await supabase.from("notifications").insert({
          user_id: userId,
          type: "payment_failed",
          title: "Paiement échoué",
          message: "Votre paiement n'a pas pu être traité.",
          resource_type: "booking",
          resource_id: bookingId,
        })
      }
    }

    await supabase.from("payment_logs").insert({
      booking_id: bookingId,
      user_id: userId,
      stripe_payment_intent: paymentIntent.id,
      amount: formatPriceFromStripe(paymentIntent.amount || 0),
      currency: paymentIntent.currency,
      status: "failed",
      error_message: paymentIntent.last_payment_error?.message,
    })
  },

  async handleChargeRefunded(charge: Stripe.Charge) {
    const supabase = await createClient()
    const { data: booking } = await supabase.from("bookings").select("id, parent_id").eq("stripe_payment_intent", charge.payment_intent).single()

    if (booking) {
      await supabase.from("bookings").update({
        payment_status: "refunded",
        status: "cancelled",
        updated_at: new Date().toISOString()
      }).eq("id", booking.id)

      if (booking.parent_id) {
        await supabase.from("notifications").insert({
          user_id: booking.parent_id,
          type: "payment_refunded",
          title: "Remboursement effectué",
          message: "Votre remboursement a été traité avec succès.",
          resource_type: "booking",
          resource_id: booking.id,
        })
      }
    }
  },

  async handleSubscriptionUpdate(subscription: Stripe.Subscription) {
    const supabase = await createClient()
    const partnerId = subscription.metadata?.partnerId
    if (!partnerId) return

    await supabase.from("partner_subscriptions").upsert({
      partner_id: partnerId,
      stripe_subscription_id: subscription.id,
      stripe_customer_id: subscription.customer as string,
      status: subscription.status,
      current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
      current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
      cancel_at_period_end: subscription.cancel_at_period_end,
      updated_at: new Date().toISOString()
    })
  },

  async handleSubscriptionDeleted(subscription: Stripe.Subscription) {
    const supabase = await createClient()
    await supabase.from("partner_subscriptions").update({
      status: "cancelled",
      cancelled_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }).eq("stripe_subscription_id", subscription.id)
  }
}

/**
 * Event Dispatcher
 */
export async function dispatchStripeEvent(event: Stripe.Event) {
  switch (event.type) {
    case "checkout.session.completed":
      await StripeHandlers.handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session)
      break
    case "payment_intent.succeeded":
      await StripeHandlers.handlePaymentSucceeded(event.data.object as Stripe.PaymentIntent)
      break
    case "payment_intent.payment_failed":
      await StripeHandlers.handlePaymentFailed(event.data.object as Stripe.PaymentIntent)
      break
    case "charge.refunded":
      await StripeHandlers.handleChargeRefunded(event.data.object as Stripe.Charge)
      break
    case "customer.subscription.created":
    case "customer.subscription.updated":
      await StripeHandlers.handleSubscriptionUpdate(event.data.object as Stripe.Subscription)
      break
    case "customer.subscription.deleted":
      await StripeHandlers.handleSubscriptionDeleted(event.data.object as Stripe.Subscription)
      break
    default:
      console.log(`[Stripe Webhook] Unhandled event type: ${event.type}`)
  }
}
