import "server-only"

import Stripe from "stripe"

// Lazy-initialize Stripe client to avoid build failures when env var is missing
let _stripe: Stripe | null = null

function getStripeClient(): Stripe {
  if (!_stripe) {
    const secretKey = process.env.STRIPE_SECRET_KEY
    if (!secretKey) {
      throw new Error("STRIPE_SECRET_KEY is not defined in environment variables")
    }

    const isProduction = process.env.NODE_ENV === "production"
    const isLiveKey = secretKey.startsWith("sk_live_")

    // Warn if using test key in production
    if (isProduction && !isLiveKey) {
      console.warn("[Stripe] Warning: Using test key in production environment")
    }

    _stripe = new Stripe(secretKey, {
      apiVersion: "2025-10-29.clover",
      typescript: true,
      appInfo: {
        name: "TeensParty Morocco",
        version: "1.0.0",
        url: process.env.NEXT_PUBLIC_APP_URL,
      },
    })
  }
  return _stripe
}

// Export getter for stripe client
export const stripe = new Proxy({} as Stripe, {
  get(_, prop) {
    return (getStripeClient() as any)[prop]
  },
})

// Helper to verify webhook signature
export async function verifyWebhookSignature(
  payload: string | Buffer,
  signature: string
): Promise<Stripe.Event | null> {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET

  if (!webhookSecret) {
    console.error("[Stripe] STRIPE_WEBHOOK_SECRET is not defined")
    return null
  }

  try {
    return getStripeClient().webhooks.constructEvent(payload, signature, webhookSecret)
  } catch (err) {
    console.error("[Stripe] Webhook signature verification failed:", err)
    return null
  }
}

// Stripe price formatting for MAD (Moroccan Dirham)
export function formatPriceToStripe(amountInDirhams: number): number {
  // Stripe uses smallest currency unit (centimes for MAD)
  return Math.round(amountInDirhams * 100)
}

export function formatPriceFromStripe(amountInCentimes: number): number {
  return amountInCentimes / 100
}

// Create customer portal session
export async function createCustomerPortalSession(
  customerId: string,
  returnUrl: string
): Promise<Stripe.BillingPortal.Session> {
  return getStripeClient().billingPortal.sessions.create({
    customer: customerId,
    return_url: returnUrl,
  })
}

// Get or create Stripe customer for a user
export async function getOrCreateStripeCustomer(
  email: string,
  name: string,
  metadata?: Record<string, string>
): Promise<Stripe.Customer> {
  const client = getStripeClient()

  // Search for existing customer
  const existingCustomers = await client.customers.list({
    email,
    limit: 1,
  })

  if (existingCustomers.data.length > 0) {
    return existingCustomers.data[0]
  }

  // Create new customer
  return client.customers.create({
    email,
    name,
    metadata: {
      platform: "teensparty_morocco",
      ...metadata,
    },
  })
}

// Stripe product types for our platform
export type StripeProductType =
  | "event_booking"
  | "coin_topup"
  | "ambassador_payout"
  | "partner_subscription"

// Create checkout session with standard options
export interface CreateCheckoutOptions {
  customerId?: string
  customerEmail?: string
  productType: StripeProductType
  items: {
    name: string
    description?: string
    amount: number // in dirhams
    quantity: number
    imageUrl?: string
  }[]
  metadata: Record<string, string>
  successUrl: string
  cancelUrl: string
  allowPromotionCodes?: boolean
}

export async function createCheckoutSession(
  options: CreateCheckoutOptions
): Promise<Stripe.Checkout.Session> {
  return getStripeClient().checkout.sessions.create({
    mode: "payment",
    customer: options.customerId,
    customer_email: options.customerId ? undefined : options.customerEmail,
    line_items: options.items.map((item) => ({
      price_data: {
        currency: "mad",
        product_data: {
          name: item.name,
          description: item.description,
          images: item.imageUrl ? [item.imageUrl] : undefined,
        },
        unit_amount: formatPriceToStripe(item.amount),
      },
      quantity: item.quantity,
    })),
    metadata: {
      type: options.productType,
      ...options.metadata,
    },
    success_url: options.successUrl,
    cancel_url: options.cancelUrl,
    allow_promotion_codes: options.allowPromotionCodes,
    payment_intent_data: {
      metadata: {
        type: options.productType,
        ...options.metadata,
      },
    },
  })
}

// Check Stripe connection
export async function checkStripeConnection(): Promise<{
  connected: boolean
  mode: "live" | "test"
  error?: string
}> {
  try {
    const client = getStripeClient()
    await client.balance.retrieve()
    const isLiveKey = process.env.STRIPE_SECRET_KEY?.startsWith("sk_live_") || false
    return {
      connected: true,
      mode: isLiveKey ? "live" : "test",
    }
  } catch (error: any) {
    const isLiveKey = process.env.STRIPE_SECRET_KEY?.startsWith("sk_live_") || false
    return {
      connected: false,
      mode: isLiveKey ? "live" : "test",
      error: error.message,
    }
  }
}
