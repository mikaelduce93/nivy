/**
 * Teen Dashboard loading state — TICKET-032 (W3-A10).
 *
 * Replaces the generic <DashboardSkeleton/> with a bespoke silhouette
 * that mirrors `app/teen/page.tsx` byte-for-byte (avatar coach +
 * twin-currency gauge + hero + bento grid + mobile dock spacer) so the
 * swap on hydration produces zero CLS.
 */

import { TeenDashboardSkeleton } from '@/components/ui/skeletons/page-skeletons/teen-dashboard-skeleton'

export default function TeenDashboardLoading() {
  return <TeenDashboardSkeleton />
}
