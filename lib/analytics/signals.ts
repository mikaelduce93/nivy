/**
 * Wave 1.2 — Behavioral signal capture helpers.
 *
 * Per docs/vision/PRODUCT_WHITEPAPER.md §19.5 + docs/vision/personalization-engine.md.
 *
 * All capture sites in the app should funnel through `recordSignal` so that:
 *   - the RPC stays the single insert path (validation + default weights),
 *   - failures NEVER break the user-facing operation (signals are best-effort),
 *   - we have one place to swap in batching / dead-letter / sampling later.
 */
import type { SupabaseClient } from "@supabase/supabase-js"
import { createServiceRoleClient } from "@/lib/supabase/service-role"

export type SignalType =
  | "view"
  | "click"
  | "start"
  | "complete"
  | "abandon"
  | "share"
  | "favorite"
  | "dismiss"
  | "report"

export type SignalTargetType =
  | "quiz"
  | "defi"
  | "event"
  | "partner_offer"
  | "friend_profile"
  | "quest"
  | "mission"
  | "reward"
  | "feed_post"
  | "mentor"
  | "partner"

export interface RecordSignalInput {
  teenId: string
  signalType: SignalType
  targetType: SignalTargetType
  targetId: string
  /** Override the default weight from the RPC (rarely needed). */
  weight?: number
  metadata?: Record<string, unknown>
  /**
   * Optional Supabase client. Defaults to a service-role client (which is
   * trusted by the RPC's auth.uid() check) so that capture sites can record
   * a signal without coupling to whichever client they happen to hold.
   */
  client?: SupabaseClient
}

/**
 * Best-effort signal insert — never throws, never propagates Supabase errors.
 *
 * Returns the inserted signal id, or `null` on any failure.
 */
export async function recordSignal(input: RecordSignalInput): Promise<number | null> {
  const {
    teenId,
    signalType,
    targetType,
    targetId,
    weight,
    metadata,
    client,
  } = input

  if (!teenId || !targetId) return null

  try {
    const sb = client ?? createServiceRoleClient()
    const { data, error } = await sb.rpc("record_signal", {
      p_teen_id: teenId,
      p_signal_type: signalType,
      p_target_type: targetType,
      p_target_id: targetId,
      p_weight: weight ?? null,
      p_metadata: metadata ?? {},
    })

    if (error) {
      console.warn("[signals] record_signal failed:", error.message, {
        signalType,
        targetType,
      })
      return null
    }
    return typeof data === "number" ? data : null
  } catch (err) {
    console.warn("[signals] record_signal threw:", err)
    return null
  }
}

/**
 * Fire-and-forget variant for hot paths where we don't want to await the
 * round-trip (e.g. RSC fetches, success-response paths). Errors are swallowed.
 */
export function recordSignalAsync(input: RecordSignalInput): void {
  // Intentionally not awaited.
  void recordSignal(input).catch(() => {
    /* swallowed: recordSignal already logs */
  })
}
