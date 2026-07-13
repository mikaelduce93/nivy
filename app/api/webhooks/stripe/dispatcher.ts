import Stripe from "stripe"
import { createClient } from "@/lib/supabase/server"

/**
 * ⚠️ INACTIF — Stripe n'est pas le PSP actif (CMI / hybride est canonique au Maroc).
 * Ce dispatcher n'est pas câblé en production ; il existe pour qu'un paiement
 * Stripe (test ou live) confirme correctement une réservation si/quand il est
 * activé (#342). Cette réactivation NE change PAS le PSP canonique.
 *
 * Câblé sur le schéma réel (types/supabase.ts) :
 * - handleBookingPayment (checkout.session.completed / event_booking) confirme
 *   la réservation via bookings.payment_status/status. `bookings` n'a PAS de
 *   colonnes stripe_session_id / stripe_payment_intent ni parent_id — ces
 *   écritures ont été supprimées plutôt que d'écrire sur des colonnes
 *   fantômes (cf. audit reservation.md N6). Notifie via `user_notifications`
 *   (canon), pas `notifications` (table fantôme). Idempotent : cf. commentaire
 *   dans handleBookingPayment.
 * - handleCoinTopup (coin_topup, C4/#252) crédite le wallet via la RPC
 *   add_coins_to_user (user_coins.balance + coin_transactions) et notifie via
 *   user_notifications. Inchangé (déjà aligné schéma réel).
 * - handlePaymentFailed notifie via user_notifications (même correction).
 *
 * Drift résiduel ASSUMÉ (hors périmètre #342) :
 * - `payment_logs` et `partner_subscriptions` ne sont pas des tables réelles
 *   (jamais créées — migration 109 documente la décision "REWIRE
 *   payment_logs→payment_transactions" comme non faite ; cf. aussi #42 dans
 *   app/api/payments/hybrid/route.ts qui a déjà supprimé ces écritures pour
 *   la même raison). handleSubscriptionUpdate/handleSubscriptionDeleted
 *   (Stripe customer.subscription.*, feature "abonnement partenaire" — hors
 *   scope réservation/topup) écrivaient sur la table fantôme
 *   `partner_subscriptions` (absente du schéma live) : écritures mortes
 *   supprimées, les handlers loguent désormais pour traitement manuel.
 * - handleChargeRefunded ne peut pas corréler un remboursement Stripe à une
 *   réservation sous le schéma réel (aucune colonne de référence Stripe sur
 *   `bookings`, et en ajouter nécessiterait une migration — hors scope). Il
 *   logue pour réconciliation manuelle plutôt que d'interroger une colonne
 *   fantôme.
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

    // #342 idempotency guard: Stripe redelivers checkout.session.completed on
    // retries / duplicate deliveries. `bookings` has no stripe_session_id
    // column to dedupe against (types/supabase.ts), so the guard is a
    // payment_status check: a booking already marked "paid" is not
    // re-confirmed and does not re-notify the user.
    const { data: existingBooking } = await supabase
      .from("bookings")
      .select("payment_status")
      .eq("id", bookingId)
      .maybeSingle()

    if (existingBooking?.payment_status === "paid") {
      return
    }

    // #342 — bookings has no stripe_session_id / stripe_payment_intent
    // columns (types/supabase.ts); only real columns are written. The
    // `.neq("payment_status", "paid")` filter is a second, DB-level
    // idempotency guard against a race between the read above and this write
    // (e.g. two redelivered events processed concurrently) — only rows
    // returned by `.select("id")` below were actually (re-)confirmed here.
    const { data: updatedRows } = await supabase
      .from("bookings")
      .update({
        payment_status: "paid",
        status: "confirmed",
        payment_method: paymentMethod,
        paid_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        ...(parseInt(xpUsed || "0") > 0 && { xp_used: parseInt(xpUsed!), xp_value: parseFloat(xpValue!) }),
      })
      .eq("id", bookingId)
      .neq("payment_status", "paid")
      .select("id")

    if (userId && updatedRows && updatedRows.length > 0) {
      // #342 — canon is `user_notifications` (`notifications` is a phantom
      // table, cf. audit reservation.md N6); only real columns are written.
      await supabase.from("user_notifications").insert({
        user_id: userId,
        title: isHybrid ? "Paiement hybride confirmé" : "Paiement confirmé",
        body: isHybrid
          ? `Paiement confirmé : ${xpUsed} XP utilisés + carte.`
          : "Votre réservation est validée.",
      })
    }

    // #342 — removed the `payment_logs` insert: that table does not exist in
    // the live schema (never created — migration 109 documents the "REWIRE
    // payment_logs→payment_transactions" decision as not done; same
    // reasoning already applied in app/api/payments/hybrid/route.ts #42).
    // The booking row above (payment_status/status/paid_at) is the source of
    // truth for a Stripe-confirmed booking.
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

  async handlePaymentSucceeded(_paymentIntent: Stripe.PaymentIntent) {
    // #342 — no-op: this previously updated a `payment_logs` row, but that
    // table does not exist in the live schema (see top-of-file docstring).
    // Booking confirmation for the Checkout flow is handled by
    // handleBookingPayment on `checkout.session.completed`, which is the
    // authoritative event for this dispatcher's booking path.
  },

  async handlePaymentFailed(paymentIntent: Stripe.PaymentIntent) {
    const supabase = await createClient()
    const { bookingId, userId } = paymentIntent.metadata || {}

    if (bookingId) {
      // #342 idempotency: don't re-notify a booking already marked failed.
      const { data: updatedRows } = await supabase
        .from("bookings")
        .update({
          payment_status: "failed",
          updated_at: new Date().toISOString()
        })
        .eq("id", bookingId)
        .neq("payment_status", "failed")
        .select("id")

      if (userId && updatedRows && updatedRows.length > 0) {
        // #342 — canon is `user_notifications` (`notifications` is phantom).
        await supabase.from("user_notifications").insert({
          user_id: userId,
          title: "Paiement échoué",
          body: "Votre paiement n'a pas pu être traité.",
        })
      }
    }

    // #342 — `payment_logs` removed here too (phantom table, see docstring).
  },

  async handleChargeRefunded(charge: Stripe.Charge) {
    // #342 — bookings has no stripe_session_id/stripe_payment_intent column
    // (types/supabase.ts) to correlate a Stripe charge back to a booking, and
    // no `parent_id` column either. Adding a reference column would require a
    // migration, which is out of scope here. Rather than query phantom
    // columns (silent Postgrest error, no-op), log for manual reconciliation.
    console.warn(
      `[Stripe Webhook] charge.refunded received for payment_intent=${charge.payment_intent}; ` +
      `bookings cannot be correlated under the current schema (no stripe reference column). ` +
      `Manual reconciliation required.`
    )
  },

  async handleSubscriptionUpdate(subscription: Stripe.Subscription) {
    // #342 — `partner_subscriptions` n'existe PAS dans le schéma live
    // (absente des migrations ET de types/supabase.ts) : l'upsert écrivait sur
    // une table fantôme et échouait silencieusement (Postgrest no-op), au même
    // titre que `payment_logs` supprimé plus haut. On retire l'écriture morte
    // et on logue pour traitement manuel de la feature "abonnement partenaire"
    // (distincte réservation/topup) si/quand la table sera réellement créée.
    console.warn(
      `[Stripe Webhook] customer.subscription.* reçu pour subscription=${subscription.id} ` +
      `(status=${subscription.status}) ; \`partner_subscriptions\` n'existe pas dans le schéma live. ` +
      `Aucune persistance. Traitement manuel requis.`
    )
  },

  async handleSubscriptionDeleted(subscription: Stripe.Subscription) {
    // #342 — cf. handleSubscriptionUpdate : table fantôme `partner_subscriptions`,
    // écriture morte supprimée, log pour réconciliation manuelle.
    console.warn(
      `[Stripe Webhook] customer.subscription.deleted reçu pour subscription=${subscription.id} ; ` +
      `\`partner_subscriptions\` n'existe pas dans le schéma live. Aucune persistance. ` +
      `Traitement manuel requis.`
    )
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
