import { redirect } from "next/navigation"
import { getUserRole } from "@/lib/auth/get-user-role"
import { Suspense } from "react"
import { CalendarClient } from "./calendar-client"
import { getTeenDashboardData } from "@/lib/server/teen-dashboard"

export default async function CalendarPage() {
  const userInfo = await getUserRole()

  if (!userInfo || userInfo.role !== "teen") {
    redirect("/auth/redirect")
  }

  // Fetch upcoming events via the canonical loader (fetches up to 30 events)
  const dashboard = await getTeenDashboardData({ eventsLimit: 30 }).catch(() => null)

  const upcomingEvents = (dashboard?.upcomingEvents ?? []).map((event) => ({
    id: event.id,
    title: event.title,
    date: event.date ? event.date.split("T")[0] : "",
    time: event.time ?? null,
    location: event.city ?? event.venue ?? null,
    type: event.category ?? "event",
    xpReward: 0, // xpReward not stored on events directly; show 0 if unavailable
    registered: event.rsvpStatus === "confirmed" || event.rsvpStatus === "pending",
    rsvpLabel: event.rsvpLabel,
    attendees: null as number | null,
  }))

  const props = JSON.parse(JSON.stringify({ upcomingEvents }))

  return (
    <div className="min-h-screen pb-32">
      <Suspense fallback={<CalendarSkeleton />}>
        <CalendarClient upcomingEvents={props.upcomingEvents} />
      </Suspense>
    </div>
  )
}

function CalendarSkeleton() {
  return (
    <div className="space-y-8 pt-6 animate-pulse">
      <div className="h-14 bg-zinc-800/50 rounded-2xl w-64" />
      <div className="grid grid-cols-1 lg:grid-cols-[1fr,380px] gap-6">
        <div className="h-96 bg-zinc-800/30 rounded-3xl" />
        <div className="h-96 bg-zinc-800/30 rounded-3xl" />
      </div>
    </div>
  )
}
