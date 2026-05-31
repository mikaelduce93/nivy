/**
 * NIVY - centralized status-enum → FR label helpers
 * ==================================================
 *
 * DB status enums (food orders, rides, shop purchases) are technical English
 * slugs (`out_for_delivery`, `in_progress`, …). Rendering them raw to a teen
 * breaks the FR Gen-Z charte. These helpers map each enum to a human FR label
 * backed by the `status.*` keys in `messages/fr.json`, so the copy lives in the
 * i18n bundle instead of scattered inline maps across `app/teen/**`.
 *
 * Each helper takes an optional `Translator` (`getT()` on the server,
 * `useT()` on the client). When omitted it falls back to the FR default bundle
 * via `translate()` — matching the V1 FR-only policy while keeping the dotted
 * keys as the single source of truth. Unknown enum values return the raw value
 * (never a blank), so a new DB status degrades gracefully instead of vanishing.
 */

import { translate } from './translate'
import { DEFAULT_LOCALE, type Translator } from './types'

/** Default translator bound to the FR bundle (used when no `t` is supplied). */
const frT: Translator = (key, params) => translate(DEFAULT_LOCALE, key, params)

/** Known food-order statuses (mirrors the DB enum surfaced to teens). */
const FOOD_ORDER_STATUSES = [
  'pending',
  'accepted',
  'preparing',
  'ready',
  'out_for_delivery',
  'delivered',
  'rejected',
  'cancelled',
] as const

/** Known ride statuses. */
const RIDE_STATUSES = [
  'requested',
  'pending',
  'approved',
  'dispatched',
  'in_progress',
  'completed',
  'cancelled',
  'denied',
] as const

/** Known shop-purchase statuses. */
const PURCHASE_STATUSES = [
  'pending',
  'ready',
  'used',
  'claimed',
  'expired',
] as const

function isKnown<T extends readonly string[]>(
  list: T,
  value: string,
): value is T[number] {
  return (list as readonly string[]).includes(value)
}

/** FR label for a food-order status (e.g. `out_for_delivery` → "En route"). */
export function foodOrderStatusLabel(status: string, t: Translator = frT): string {
  if (!isKnown(FOOD_ORDER_STATUSES, status)) return status
  return t(`status.foodOrder.${status}`)
}

/** FR label for a ride status (e.g. `in_progress` → "En cours"). */
export function rideStatusLabel(status: string, t: Translator = frT): string {
  if (!isKnown(RIDE_STATUSES, status)) return status
  return t(`status.ride.${status}`)
}

/** FR label for a shop-purchase status (e.g. `claimed` → "Utilisé"). */
export function purchaseStatusLabel(status: string, t: Translator = frT): string {
  if (!isKnown(PURCHASE_STATUSES, status)) return status
  return t(`status.purchase.${status}`)
}
