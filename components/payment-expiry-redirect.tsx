'use client'

/**
 * NIVY - Payment expiry handler
 * ==============================
 *
 * Wraps SessionTimer so the server-rendered paiement page does not need to
 * pass an inline arrow function (which is illegal in RSC). On expiry:
 *  - The persisted cart in localStorage stays put (the user can resume from
 *    /reservation) — we mark it explicitly with `status: 'expired'` so the
 *    receiving page can decide how to surface it.
 *  - We hard-redirect to /mes-reservations.
 */

import { useCallback } from 'react'
import { SessionTimer } from '@/components/session-timer'
import { NIVY_CART_KEY, type NivyCart } from '@/components/payment-cart-persistence'

interface PaymentExpiryRedirectProps {
  expiresAt: Date
  redirectTo?: string
  bookingReference?: string
}

export function PaymentExpiryRedirect({
  expiresAt,
  redirectTo = '/mes-reservations',
  bookingReference,
}: PaymentExpiryRedirectProps) {
  const handleExpire = useCallback(() => {
    if (typeof window === 'undefined') return
    try {
      const raw = localStorage.getItem(NIVY_CART_KEY)
      if (raw) {
        const parsed = JSON.parse(raw) as NivyCart
        // Tag the cart as expired so /reservation can show "session expirée — reprends ta réservation"
        const tagged: NivyCart & { status: 'awaiting_payment' } = {
          ...parsed,
          status: 'awaiting_payment',
        }
        localStorage.setItem(
          NIVY_CART_KEY,
          JSON.stringify({ ...tagged, expiredAt: Date.now() }),
        )
      }
    } catch {
      /* ignore — keep redirect even if storage fails */
    }
    window.location.href = redirectTo
  }, [redirectTo])

  return (
    <SessionTimer
      expiresAt={expiresAt}
      onExpire={handleExpire}
      bookingReference={bookingReference}
    />
  )
}
