/**
 * Parent Dashboard loading state — TICKET-032 (W3-A10).
 *
 * Replaces the generic spinner-only Loading with a bespoke silhouette
 * that mirrors `app/parent/page.tsx` byte-for-byte (sponsor cockpit
 * header + 12-col evolution grid + financial pilot column) so the
 * swap on hydration produces zero CLS.
 */

import { ParentDashboardSkeleton } from "@/components/ui/skeletons/page-skeletons/parent-dashboard-skeleton"

export default function ParentLoading() {
  return <ParentDashboardSkeleton />
}
