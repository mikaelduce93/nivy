import { createClient } from "@/lib/supabase/server"
import { NextRequest, NextResponse } from "next/server"

export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const eventId = searchParams.get("eventId")

    if (!eventId) {
      return NextResponse.json(
        { error: "Event ID requis" },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // Verify admin access
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Non authentifie" }, { status: 401 })
    }

    const { data: adminRole } = await supabase
      .from("admin_roles")
      .select("*")
      .eq("profile_id", user.id)
      .single()

    if (!adminRole) {
      return NextResponse.json({ error: "Non autorise" }, { status: 403 })
    }

    // Get event details
    const { data: event } = await supabase
      .from("events")
      .select("id, title, capacity, event_date")
      .eq("id", eventId)
      .single()

    if (!event) {
      return NextResponse.json({ error: "Evenement non trouve" }, { status: 404 })
    }

    // Get total bookings for event
    const { count: totalBookings } = await supabase
      .from("bookings")
      .select("*", { count: "exact", head: true })
      .eq("event_id", eventId)
      .eq("status", "confirmed")

    // Get check-in stats
    const { data: checkIns } = await supabase
      .from("event_check_ins")
      .select("id, checked_in_at, checked_out_at, teen_id")
      .eq("event_id", eventId)

    const totalCheckedIn = checkIns?.length || 0
    const currentlyInside = checkIns?.filter(c => c.checked_in_at && !c.checked_out_at).length || 0
    const checkedOut = checkIns?.filter(c => c.checked_out_at).length || 0

    // Get recent check-ins (last 10)
    const { data: recentCheckIns } = await supabase
      .from("event_check_ins")
      .select(`
        id,
        checked_in_at,
        checked_out_at,
        teen:teen_id(full_name, pseudo)
      `)
      .eq("event_id", eventId)
      .order("checked_in_at", { ascending: false })
      .limit(10)

    // Get check-ins by hour for chart
    const hourlyData: { hour: string; count: number }[] = []
    if (checkIns && checkIns.length > 0) {
      const hourCounts = new Map<string, number>()

      checkIns.forEach(checkIn => {
        if (checkIn.checked_in_at) {
          const hour = new Date(checkIn.checked_in_at).getHours()
          const hourKey = `${hour}:00`
          hourCounts.set(hourKey, (hourCounts.get(hourKey) || 0) + 1)
        }
      })

      // Sort by hour
      Array.from(hourCounts.entries())
        .sort((a, b) => parseInt(a[0]) - parseInt(b[0]))
        .forEach(([hour, count]) => {
          hourlyData.push({ hour, count })
        })
    }

    return NextResponse.json({
      event: {
        id: event.id,
        title: event.title,
        capacity: event.capacity,
        date: event.event_date
      },
      stats: {
        totalBookings: totalBookings || 0,
        totalCheckedIn,
        currentlyInside,
        checkedOut,
        capacityPercentage: event.capacity
          ? Math.round((currentlyInside / event.capacity) * 100)
          : 0
      },
      recentCheckIns: recentCheckIns?.map(c => {
        const teen = c.teen as unknown as { pseudo?: string; full_name?: string } | null
        return {
          id: c.id,
          teenName: teen?.pseudo || teen?.full_name || "Inconnu",
          checkedInAt: c.checked_in_at,
          checkedOutAt: c.checked_out_at,
          status: c.checked_out_at ? "out" : "in"
        }
      }) || [],
      hourlyData
    })
  } catch (error) {
    console.error("[Check-in Stats] Error:", error)
    return NextResponse.json(
      { error: "Erreur lors de la recuperation des stats" },
      { status: 500 }
    )
  }
}
