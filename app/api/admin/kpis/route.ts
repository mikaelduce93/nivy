import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import { getUserRole } from "@/lib/auth/get-user-role"

export async function GET(request: Request) {
  try {
    const supabase = await createClient()
    const userInfo = await getUserRole()

    if (!userInfo || userInfo.role !== "admin") {
      return NextResponse.json(
        { success: false, error: "Non autorisé" },
        { status: 401 }
      )
    }

    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0)

    // Users stats
    const { count: totalUsers } = await supabase
      .from("profiles")
      .select("*", { count: "exact", head: true })

    const { count: todayUsers } = await supabase
      .from("profiles")
      .select("*", { count: "exact", head: true })
      .gte("created_at", today.toISOString())

    const { count: monthlyUsers } = await supabase
      .from("profiles")
      .select("*", { count: "exact", head: true })
      .gte("created_at", startOfMonth.toISOString())

    const { count: lastMonthUsers } = await supabase
      .from("profiles")
      .select("*", { count: "exact", head: true })
      .gte("created_at", startOfLastMonth.toISOString())
      .lt("created_at", startOfMonth.toISOString())

    // Teens stats
    const { count: totalTeens } = await supabase
      .from("profiles")
      .select("*", { count: "exact", head: true })
      .eq("role", "teen")

    // Active users today (from activity logs)
    const { data: activeUsersData } = await supabase
      .from("activity_logs")
      .select("user_id")
      .gte("created_at", today.toISOString())

    const uniqueActiveUsers = new Set(activeUsersData?.map(a => a.user_id) || [])
    const activeTeens = uniqueActiveUsers.size

    // Revenue stats
    const { data: monthlyBookings } = await supabase
      .from("bookings")
      .select("total_price")
      .gte("created_at", startOfMonth.toISOString())

    const monthlyRevenue = monthlyBookings?.reduce((sum, b) => sum + (b.total_price || 0), 0) || 0

    const { data: lastMonthBookings } = await supabase
      .from("bookings")
      .select("total_price")
      .gte("created_at", startOfLastMonth.toISOString())
      .lt("created_at", startOfMonth.toISOString())

    const lastMonthRevenue = lastMonthBookings?.reduce((sum, b) => sum + (b.total_price || 0), 0) || 0

    // Events stats
    const { count: totalEvents } = await supabase
      .from("events")
      .select("*", { count: "exact", head: true })

    const { count: upcomingEvents } = await supabase
      .from("events")
      .select("*", { count: "exact", head: true })
      .gte("date", now.toISOString())
      .eq("status", "published")

    // Calculate growth percentages
    const userGrowth = lastMonthUsers && lastMonthUsers > 0
      ? Math.round(((monthlyUsers || 0) - lastMonthUsers) / lastMonthUsers * 100)
      : 0

    const revenueGrowth = lastMonthRevenue > 0
      ? Math.round((monthlyRevenue - lastMonthRevenue) / lastMonthRevenue * 100)
      : 0

    return NextResponse.json({
      success: true,
      data: {
        users: {
          total: totalUsers || 0,
          today: todayUsers || 0,
          monthly: monthlyUsers || 0,
          growth: userGrowth
        },
        teens: {
          total: totalTeens || 0,
          active: activeTeens
        },
        revenue: {
          monthly: monthlyRevenue,
          lastMonth: lastMonthRevenue,
          growth: revenueGrowth
        },
        events: {
          total: totalEvents || 0,
          upcoming: upcomingEvents || 0
        }
      },
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error("KPIs API error:", error)
    return NextResponse.json(
      { success: false, error: "Erreur serveur" },
      { status: 500 }
    )
  }
}
