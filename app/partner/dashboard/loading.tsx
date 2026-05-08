/**
 * Partner Dashboard loading state — TICKET-032 (W3-A10).
 *
 * Replaces the generic spinner-only Loading with a bespoke silhouette
 * that mirrors `app/partner/dashboard/page.tsx` byte-for-byte (Partner
 * Elite header + 12-col bento grid: scanner + status + 4 KPIs + 2 wide
 * list cards + quick links) so the swap on hydration produces zero CLS.
 */

import { PartnerDashboardSkeleton } from "@/components/ui/skeletons/page-skeletons/partner-dashboard-skeleton"

export default function PartnerDashboardLoading() {
  return <PartnerDashboardSkeleton />
}
