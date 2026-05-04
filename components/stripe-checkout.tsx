"use client"

import { useCallback, useState } from "react"
import { EmbeddedCheckout, EmbeddedCheckoutProvider } from "@stripe/react-stripe-js"
import { loadStripe } from "@stripe/stripe-js"
import { Card } from "@/components/ui/card"
import { Loader2 } from "lucide-react"

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!)

interface StripeCheckoutProps {
  bookingId: string
  clientSecretFetcher: () => Promise<string>
  onComplete?: () => void
}

export function StripeCheckout({ bookingId, clientSecretFetcher, onComplete }: StripeCheckoutProps) {
  const [loading, setLoading] = useState(true)

  const handleComplete = useCallback(() => {
    setLoading(false)
    onComplete?.()
  }, [onComplete])

  return (
    <Card className="p-6">
      {loading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-cyan-500" />
        </div>
      )}
      <div id="checkout" className={loading ? "hidden" : ""}>
        <EmbeddedCheckoutProvider
          stripe={stripePromise}
          options={{
            fetchClientSecret: clientSecretFetcher,
            onComplete: handleComplete,
          }}
        >
          <EmbeddedCheckout />
        </EmbeddedCheckoutProvider>
      </div>
    </Card>
  )
}
