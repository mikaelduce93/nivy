/**
 * Wave 1.2 — Behavioral signal capture helpers.
 *
 * Per docs/vision/PRODUCT_WHITEPAPER.md §19.5 + docs/vision/personalization-engine.md.
 *
 * All capture sites in the app should funnel through `recordSignal` so that:
 *   - the RPC stays the single insert path (validation + default weights),
 *   - failures NEVER break the user-facing operation (signals are best-effort),
 *   - we have one place to swap in batching / dead-letter / sampling later,
 *   - anti-manipulation caps + burst detection live in exactly one spot
 *     (Wave 3 — TICKET-039 / personalization-engine §13).
 *
 * Anti-manipulation contract (TICKET-039)
 * ---------------------------------------
 *   1. Per-target burst guard: > BURST_THRESHOLD signals on the same
 *      `target_id` from the same teen within BURST_WINDOW_MS → drop the
 *      signal with `reason = "burst_detected"` and emit one row to
 *      `admin_audit_logs` (rate-limit metric for ops).
 *   2. Per-tag-per-day cap: once a teen has accumulated CAP_PER_TAG_PER_DAY
 *      raw signals on any tag in `metadata.tags` (UTC day), additional
 *      signals on that tag are still stored — but with `weight = 0`. This
 *      keeps the audit trail intact while neutralising the gaming effect on
 *      affinity scores. The first time a tag crosses the cap on a given
 *      day, an audit row is logged.
 *
 * The original 100-signals-per-minute HTTP rate-limit on
 * `app/api/teen/signals/record/route.ts` is unchanged — it operates at a
 * different layer (transport) and protects against runaway clients before
 * we ever reach this module.
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

// --- Anti-manipulation tunables (TICKET-039) --------------------------------

/** Max raw signals a single teen may accumulate on a single tag per UTC day. */
export const CAP_PER_TAG_PER_DAY = 100

/** Sliding window for burst detection on the same (teen, target). */
export const BURST_WINDOW_MS = 60_000

/** > this many signals from the same teen on the same target inside the
 *  window → drop the signal and audit. */
export const BURST_THRESHOLD = 20

// ---------------------------------------------------------------------------

/**
 * Pull the canonical tag list out of an arbitrary metadata blob.
 * Sites that pass `metadata.tags = string[]` will be subject to per-tag caps;
 * sites that don't are still subject to burst detection.
 */
function extractTags(metadata: Record<string, unknown> | undefined): string[] {
  if (!metadata) return []
  const raw = (metadata as { tags?: unknown }).tags
  if (!Array.isArray(raw)) return []
  const out: string[] = []
  for (const t of raw) {
    if (typeof t === "string" && t.trim().length > 0) {
      out.push(t.trim().toLowerCase())
    }
  }
  return out
}

/** Start-of-UTC-day ISO timestamp. */
function startOfUtcDay(now: Date = new Date()): string {
  const d = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
  )
  return d.toISOString()
}

/**
 * Best-effort audit log writer — never throws.
 * `admin_audit_logs` is the canonical table for ops-visible events.
 */
async function logAudit(
  sb: SupabaseClient,
  action: string,
  payload: Record<string, unknown>,
  targetId: string | null
): Promise<void> {
  try {
    await sb.from("admin_audit_logs").insert({
      user_id: null,
      action,
      target_type: "behavioral_signal",
      target_id: targetId,
      payload,
    })
  } catch (err) {
    // never let audit writes mask the user-facing op
    console.warn("[signals] admin_audit_logs insert failed:", err)
  }
}

/**
 * Detect a same-target burst from the same teen.
 * Returns `true` if the *current* signal would push the count over
 * BURST_THRESHOLD inside BURST_WINDOW_MS — i.e. the caller should drop it.
 */
async function isBurst(
  sb: SupabaseClient,
  teenId: string,
  targetId: string
): Promise<boolean> {
  const since = new Date(Date.now() - BURST_WINDOW_MS).toISOString()
  const { count, error } = await sb
    .from("behavioral_signals")
    .select("id", { head: true, count: "exact" })
    .eq("teen_id", teenId)
    .eq("target_id", targetId)
    .gte("created_at", since)
  if (error) {
    // Fail open — anti-manipulation must never break signal capture.
    console.warn("[signals] burst probe failed:", error.message)
    return false
  }
  return (count ?? 0) >= BURST_THRESHOLD
}

/**
 * Returns the subset of `tags` that have already met or exceeded
 * CAP_PER_TAG_PER_DAY today (UTC) for this teen. If any tag is over cap,
 * the caller MUST force `weight = 0` on the new signal.
 *
 * The probe runs one count per tag — we expect a small tag list (≤ ~10) and
 * a partial index on `(teen_id, created_at)` already exists. If this becomes
 * a hot path it can move to a single `metadata->'tags' && ARRAY[...]` query.
 */
async function tagsOverCap(
  sb: SupabaseClient,
  teenId: string,
  tags: string[]
): Promise<string[]> {
  if (tags.length === 0) return []
  const dayStart = startOfUtcDay()
  const over: string[] = []

  for (const tag of tags) {
    const { count, error } = await sb
      .from("behavioral_signals")
      .select("id", { head: true, count: "exact" })
      .eq("teen_id", teenId)
      .gte("created_at", dayStart)
      .contains("metadata", { tags: [tag] })
    if (error) {
      // Fail open per tag — never break capture.
      console.warn("[signals] tag-cap probe failed:", error.message, { tag })
      continue
    }
    if ((count ?? 0) >= CAP_PER_TAG_PER_DAY) {
      over.push(tag)
    }
  }
  return over
}

/**
 * Best-effort signal insert — never throws, never propagates Supabase errors.
 *
 * Returns the inserted signal id, or `null` on any failure / dropped burst.
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

    // 1) Burst guard — drop entirely if a teen is hammering one target.
    if (await isBurst(sb, teenId, targetId)) {
      await logAudit(
        sb,
        "signals.burst_detected",
        {
          reason: "burst_detected",
          teen_id: teenId,
          signal_type: signalType,
          target_type: targetType,
          target_id: targetId,
          window_ms: BURST_WINDOW_MS,
          threshold: BURST_THRESHOLD,
        },
        targetId
      )
      return null
    }

    // 2) Per-tag-per-day cap — store, but neutralise the weight.
    const tags = extractTags(metadata)
    const capped = tags.length > 0 ? await tagsOverCap(sb, teenId, tags) : []
    let effectiveWeight = weight
    let cappedMetadata = metadata
    if (capped.length > 0) {
      effectiveWeight = 0
      cappedMetadata = {
        ...(metadata ?? {}),
        cap_applied: true,
        capped_tags: capped,
      }
      // One audit row per (teen, day, tag) would require dedup state we
      // don't have here; logging on every capped insert is fine — the row
      // count itself is the rate-limit metric ops care about.
      await logAudit(
        sb,
        "signals.tag_cap_exceeded",
        {
          reason: "tag_cap_exceeded",
          teen_id: teenId,
          signal_type: signalType,
          target_type: targetType,
          target_id: targetId,
          capped_tags: capped,
          cap_per_tag_per_day: CAP_PER_TAG_PER_DAY,
        },
        targetId
      )
    }

    const { data, error } = await sb.rpc("record_signal", {
      p_teen_id: teenId,
      p_signal_type: signalType,
      p_target_type: targetType,
      p_target_id: targetId,
      p_weight: effectiveWeight ?? null,
      p_metadata: cappedMetadata ?? {},
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
