'use client'

/**
 * NIVY - Clear persisted cart on mount
 * =====================================
 *
 * Mounted on /reservation/confirmation so a successful payment removes the
 * `nivy.cart` entry left behind by the paiement page. Server-side noop.
 */

import { useEffect } from 'react'
import { clearNivyCart } from '@/components/payment-cart-persistence'

export function PaymentCartClearOnMount() {
  useEffect(() => {
    clearNivyCart()
  }, [])
  return null
}
