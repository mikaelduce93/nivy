/**
 * Partner space loading state — TICKET-032 (W3-A10).
 *
 * `app/partner/page.tsx` is the live business dashboard (hero + bento).
 * The partner-dashboard-skeleton silhouette is close enough for both
 * the `/partner` and `/partner/dashboard` routes, and reusing it keeps
 * the byte-for-byte CLS guarantee on the most-trafficked partner entry.
 */

import { PartnerDashboardSkeleton } from "@/components/ui/skeletons/page-skeletons/partner-dashboard-skeleton"

export default function PartnerLoading() {
  return <PartnerDashboardSkeleton />
}
