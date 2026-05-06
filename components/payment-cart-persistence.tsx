'use client'

/**
 * NIVY - Payment cart persistence
 * ================================
 *
 * Persists the current booking summary in localStorage so that, if the
 * payment session timer expires (10min) and the user is bounced back to
 * /mes-reservations, /reservation can detect the stashed cart and resume
 * the user's flow instead of silently losing their selection.
 *
 * Storage key: `nivy.cart`
 *
 * Shape (intentionally small + JSON-safe):
 *   {
 *     bookingId: string,
 *     reference?: string,
 *     eventTitle?: string,
 *     totalAmount?: number,
 *     savedAt: number, // Date.now()
 *     status: 'awaiting_payment'
 *   }
 */

import { useEffect } from 'react'

export const NIVY_CART_KEY = 'nivy.cart'
export const NIVY_CART_TTL_MS = 24 * 60 * 60 * 1000 // 24h — well beyond the 10min session

export interface NivyCart {
  bookingId: string
  reference?: string
  eventTitle?: string
  totalAmount?: number
  savedAt: number
  status: 'awaiting_payment'
}

interface PaymentCartPersistenceProps {
  bookingId: string
  reference?: string
  eventTitle?: string
  totalAmount?: number
}

export function PaymentCartPersistence({
  bookingId,
  reference,
  eventTitle,
  totalAmount,
}: PaymentCartPersistenceProps) {
  useEffect(() => {
    if (typeof window === 'undefined') return
    try {
      const cart: NivyCart = {
        bookingId,
        reference,
        eventTitle,
        totalAmount,
        savedAt: Date.now(),
        status: 'awaiting_payment',
      }
      localStorage.setItem(NIVY_CART_KEY, JSON.stringify(cart))
    } catch {
      // localStorage may be unavailable (private mode, quota) — silent.
    }
  }, [bookingId, reference, eventTitle, totalAmount])

  return null
}

/**
 * Read the persisted cart, returning null if missing/expired/malformed.
 * Safe to call from both server-effect-free clients and SSR (returns null).
 */
export function readNivyCart(): NivyCart | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(NIVY_CART_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as NivyCart
    if (!parsed?.bookingId) return null
    if (Date.now() - parsed.savedAt > NIVY_CART_TTL_MS) {
      localStorage.removeItem(NIVY_CART_KEY)
      return null
    }
    return parsed
  } catch {
    return null
  }
}

export function clearNivyCart(): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.removeItem(NIVY_CART_KEY)
  } catch {
    /* ignore */
  }
}
