import { NextResponse } from "next/server"
import { getTeenDashboardData } from "@/lib/server/teen-dashboard"

export async function GET() {
  try {
    const data = await getTeenDashboardData()

    if (!data) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
    }

    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error("Error fetching teen dashboard data:", error)
    return NextResponse.json({ success: false, error: "Failed to load dashboard" }, { status: 500 })
  }
}




