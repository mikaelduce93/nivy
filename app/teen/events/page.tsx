import { getUserRole } from "@/lib/auth/get-user-role"
import { redirect } from "next/navigation"
import { getTeenDashboardData } from "@/lib/server/teen-dashboard"
import { TeenEventsClient } from "./events-client"
import { recordSignalAsync } from "@/lib/analytics/signals"

// TODO(wave 1.2): once a per-event detail page exists at /teen/events/[id],
// move this `view` capture there so weight is per actual event-detail visit
// rather than per list impression. For now the events list IS the canonical
// event-viewing surface, so we emit one view signal per surfaced event.
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export default async function TeenEventsPage() {
  const userInfo = await getUserRole()
  if (!userInfo || userInfo.role !== "teen") {
    redirect("/auth/redirect")
  }

  const dashboardData = await getTeenDashboardData({ eventsLimit: 50 })
  const events = dashboardData?.upcomingEvents || []

  // Wave 1.2 — capture event view signals (best-effort, non-blocking).
  const teenId = userInfo.teenData?.id
  if (teenId) {
    for (const ev of events) {
      const eventId = (ev as { id?: string } | null)?.id
      if (eventId && UUID_RE.test(eventId)) {
        recordSignalAsync({
          teenId,
          signalType: "view",
          targetType: "event",
          targetId: eventId,
          metadata: { surface: "teen_events_list" },
        })
      }
    }
  }

  return <TeenEventsClient initialEvents={events} />
}
