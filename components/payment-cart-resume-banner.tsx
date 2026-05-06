'use client'

/**
 * NIVY - Cart resume banner
 * ==========================
 *
 * Shown on /reservation to surface a previously persisted (but
 * non-finalised) booking after a payment session has expired.
 * The actual cart object lives in localStorage (`nivy.cart`) and is
 * managed by `components/payment-cart-persistence.tsx`.
 */

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { AlertTriangle, X } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  readNivyCart,
  clearNivyCart,
  type NivyCart,
} from '@/components/payment-cart-persistence'

export function PaymentCartResumeBanner() {
  const [cart, setCart] = useState<NivyCart | null>(null)

  useEffect(() => {
    setCart(readNivyCart())
  }, [])

  if (!cart) return null

  const minutesAgo = Math.max(1, Math.round((Date.now() - cart.savedAt) / 60000))

  return (
    <Card className="mb-6 p-4 border-orange-500/40 bg-orange-500/10 flex items-start gap-3">
      <AlertTriangle className="w-5 h-5 text-orange-500 mt-0.5 shrink-0" />
      <div className="flex-1">
        <p className="font-semibold text-sm text-foreground">
          Réservation en attente de paiement
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          {cart.eventTitle ? <>« {cart.eventTitle} » — </> : null}
          tu as commencé une réservation il y a {minutesAgo} min
          {cart.totalAmount ? <> ({cart.totalAmount} DH)</> : null}. Tu peux
          reprendre le paiement maintenant.
        </p>
        <div className="flex items-center gap-2 mt-3">
          <Button asChild size="sm" variant="default">
            <Link href={`/reservation/paiement?booking=${cart.bookingId}`}>
              Reprendre le paiement
            </Link>
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              clearNivyCart()
              setCart(null)
            }}
            aria-label="Ignorer le panier sauvegardé"
          >
            <X className="w-4 h-4 mr-1" />
            Ignorer
          </Button>
        </div>
      </div>
    </Card>
  )
}
