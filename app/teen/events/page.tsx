import { getUserRole } from "@/lib/auth/get-user-role"
import { redirect } from "next/navigation"
import { getTeenDashboardData } from "@/lib/server/teen-dashboard"
import { TeenEventsClient } from "./events-client"

export default async function TeenEventsPage() {
  const userInfo = await getUserRole()
  if (!userInfo || userInfo.role !== "teen") {
    redirect("/auth/redirect")
  }

  const dashboardData = await getTeenDashboardData({ eventsLimit: 50 })
  const events = dashboardData?.upcomingEvents || []

  return <TeenEventsClient initialEvents={events} />
}
