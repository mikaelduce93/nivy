import Stripe from "stripe"
import { createClient } from "@/lib/supabase/server"
import { formatPriceFromStripe } from "@/lib/stripe"

/**
 * ⚠️ INACTIF — Stripe n'est pas le PSP actif (CMI / hybride est canonique au Maroc).
 * Ce dispatcher n'est pas câblé en production.
 *
 * Câblé sur le schéma réel (C4/#252) : handleCoinTopup crédite désormais le wallet
 * via la RPC add_coins_to_user (user_coins.balance + coin_transactions) et notifie
 * via user_notifications.
 *
 * Drift résiduel ASSUMÉ (code mort, hors périmètre C4) : les autres handlers visent
 * encore une table `notifications` inexistante et un schéma `bookings` plus riche
 * (stripe_session_id, stripe_payment_intent, parent_id) / `payment_logs` non vérifiés
 * en live. À réaligner (user_notifications, bookings.user_id) SI Stripe est activé.
 */

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
    const { teenId, coins, bonus } = session.metadata || {}
    if (!teenId || !coins) return

    const totalCoins = parseInt(coins) + parseInt(bonus || "0")

    // Créditer le wallet user_coins atomiquement (met aussi à jour coin_transactions).
    await supabase.rpc("add_coins_to_user", {
      p_teen_id: teenId,
      p_amount: totalCoins,
      p_transaction_type: "topup",
      p_source_type: "stripe_topup",
      p_source_id: null,
      p_description: `Recharge de ${coins} coins${bonus ? ` + ${bonus} bonus` : ""}`,
    })

    await supabase.from("user_notifications").insert({
      user_id: teenId,
      title: "Coins reçus !",
      body: `Tu as reçu ${totalCoins} coins sur ton compte.`,
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
    const subscriptionItem = subscription.items.data[0]
    const periodStart = subscriptionItem?.current_period_start ?? subscription.created
    const periodEnd = subscriptionItem?.current_period_end ?? subscription.cancel_at ?? subscription.created

    await supabase.from("partner_subscriptions").upsert({
      partner_id: partnerId,
      stripe_subscription_id: subscription.id,
      stripe_customer_id: subscription.customer as string,
      status: subscription.status,
      current_period_start: new Date(periodStart * 1000).toISOString(),
      current_period_end: new Date(periodEnd * 1000).toISOString(),
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
