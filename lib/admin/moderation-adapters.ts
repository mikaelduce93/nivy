/**
 * Wave 4A — moderation content adapters.
 *
 * Per canon §3, every queue item resolves to a real content adapter that
 * knows how to apply the moderation decision to the source row. Decisions
 * for content_types not listed here MUST return 409 unsupported_action —
 * never a fake success (canon §10 FORBIDDEN #6).
 *
 * The adapter map is the single source of truth for "what can the moderation
 * inbox actually act on?". Adding a new content_type means adding both the
 * source-table mapping AND the per-decision SQL.
 */

import "server-only"

export type ModerationDecision =
  | "dismiss"
  | "hide"
  | "delete"
  | "restore"
  | "escalate"
  | "warn"
  | "suspend"

export const DECISIONS_REQUIRING_REASON: ReadonlySet<ModerationDecision> = new Set([
  "delete",
  "warn",
  "suspend",
])

export interface ContentAdapter {
  /** Display label used in admin UI / error messages. */
  label: string
  /** Source table name. */
  table: string
  /** Owner column name (used for notifications). */
  ownerCol: string
  /**
   * Map a decision to the SQL UPDATE payload to apply on the source row.
   * Return `null` if the decision is unsupported for this content type;
   * the route will respond with 409 unsupported_action.
   */
  effectFor(decision: ModerationDecision): Record<string, unknown> | null
}

const FEED_POST_ADAPTER: ContentAdapter = {
  label: "post du feed",
  table: "feed_posts",
  ownerCol: "user_id",
  effectFor(decision) {
    switch (decision) {
      case "dismiss":
        return { is_hidden: false }
      case "hide":
        return { is_hidden: true, status: "hidden" }
      case "delete":
        return { is_hidden: true, status: "removed" }
      case "restore":
        return { is_hidden: false, status: "published" }
      case "escalate":
        return { is_hidden: true, status: "escalated" }
      // warn / suspend operate on the user, not the content row.
      case "warn":
      case "suspend":
        return null
    }
  },
}

const MARKETPLACE_LISTING_ADAPTER: ContentAdapter = {
  label: "annonce marketplace",
  table: "marketplace_listings",
  ownerCol: "seller_user_id",
  effectFor(decision) {
    switch (decision) {
      case "dismiss":
        return { status: "active" }
      case "hide":
        return { status: "hidden" }
      case "delete":
        return { status: "removed" }
      case "restore":
        return { status: "active" }
      case "escalate":
        return { status: "escalated" }
      case "warn":
      case "suspend":
        return null
    }
  },
}

const PARTNER_OFFER_ADAPTER: ContentAdapter = {
  label: "offre partenaire",
  table: "partner_offers",
  ownerCol: "partner_id",
  effectFor(decision) {
    switch (decision) {
      case "dismiss":
        return { status: "approved", is_active: true }
      case "hide":
      case "delete":
        return { status: "rejected", is_active: false }
      case "restore":
        return { status: "approved", is_active: true }
      case "escalate":
        return { status: "rejected", is_active: false }
      case "warn":
      case "suspend":
        return null
    }
  },
}

const ADAPTERS: Record<string, ContentAdapter> = {
  feed_post: FEED_POST_ADAPTER,
  marketplace_listing: MARKETPLACE_LISTING_ADAPTER,
  partner_offer: PARTNER_OFFER_ADAPTER,
}

export function adapterFor(contentType: string): ContentAdapter | null {
  return ADAPTERS[contentType] ?? null
}

export function listSupportedContentTypes(): string[] {
  return Object.keys(ADAPTERS)
}
