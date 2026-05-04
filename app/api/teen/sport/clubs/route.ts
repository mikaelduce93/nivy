import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

/**
 * GET /api/teen/sport/clubs
 * Fetch clubs and memberships for a teen
 *
 * Query params:
 * - teenId: UUID of the teen (required)
 * - includeAll: Include all clubs or just memberships (default: false)
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const teenId = searchParams.get("teenId")
    const includeAll = searchParams.get("includeAll") === "true"

    if (!teenId) {
      return NextResponse.json(
        { error: "teenId is required" },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // Verify authentication
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    // Get teen's memberships
    const { data: memberships, error: membershipError } = await supabase
      .from("teen_club_memberships")
      .select(`
        *,
        sport_clubs (*)
      `)
      .eq("teen_id", teenId)

    if (membershipError) {
      console.error("Error fetching memberships:", membershipError)
      return NextResponse.json(
        { error: "Failed to fetch memberships" },
        { status: 500 }
      )
    }

    // Get attendance stats for each club
    const clubsWithStats = await Promise.all(
      (memberships || []).map(async (membership) => {
        const club = membership.sport_clubs

        // Get attendance for this month
        const startOfMonth = new Date()
        startOfMonth.setDate(1)
        startOfMonth.setHours(0, 0, 0, 0)

        const { data: attendance, error: attendanceError } = await supabase
          .from("club_attendance")
          .select("*")
          .eq("teen_id", teenId)
          .eq("club_id", club.id)
          .gte("attendance_date", startOfMonth.toISOString().split("T")[0])
          .order("attendance_date", { ascending: false })

        // Get all-time attendance
        const { count: totalAttendance } = await supabase
          .from("club_attendance")
          .select("*", { count: "exact", head: true })
          .eq("teen_id", teenId)
          .eq("club_id", club.id)

        // Calculate streak (consecutive days/sessions)
        let currentStreak = 0
        if (attendance && attendance.length > 0) {
          const sortedDates = attendance.map((a) => a.attendance_date).sort().reverse()
          const today = new Date().toISOString().split("T")[0]

          // Check if attended today or yesterday
          const lastDate = new Date(sortedDates[0])
          const daysDiff = Math.floor((Date.now() - lastDate.getTime()) / (1000 * 60 * 60 * 24))

          if (daysDiff <= 7) {
            currentStreak = 1
            for (let i = 1; i < sortedDates.length; i++) {
              const prevDate = new Date(sortedDates[i - 1])
              const currDate = new Date(sortedDates[i])
              const diff = Math.floor((prevDate.getTime() - currDate.getTime()) / (1000 * 60 * 60 * 24))
              if (diff <= 7) {
                currentStreak++
              } else {
                break
              }
            }
          }
        }

        return {
          membership: {
            id: membership.id,
            status: membership.status,
            joined_at: membership.joined_at,
          },
          club,
          stats: {
            attendance_this_month: attendance?.length || 0,
            total_attendance: totalAttendance || 0,
            current_streak: currentStreak,
            last_attendance: attendance?.[0]?.attendance_date || null,
            recent_attendance: attendance?.slice(0, 5) || [],
          },
        }
      })
    )

    // Get all available clubs if requested
    let allClubs = null
    if (includeAll) {
      const { data: clubs } = await supabase
        .from("sport_clubs")
        .select("*")
        .eq("is_active", true)
        .order("name")

      // Mark clubs that teen is already a member of
      const memberClubIds = memberships?.map((m) => m.sport_clubs?.id) || []
      allClubs = clubs?.map((club) => ({
        ...club,
        is_member: memberClubIds.includes(club.id),
      }))
    }

    // Calculate overall stats
    const overallStats = {
      total_clubs: clubsWithStats.length,
      total_attendance_this_month: clubsWithStats.reduce(
        (sum, c) => sum + c.stats.attendance_this_month,
        0
      ),
      total_attendance_all_time: clubsWithStats.reduce(
        (sum, c) => sum + c.stats.total_attendance,
        0
      ),
      best_streak: Math.max(...clubsWithStats.map((c) => c.stats.current_streak), 0),
    }

    return NextResponse.json({
      success: true,
      clubs: clubsWithStats,
      allClubs,
      stats: overallStats,
    })
  } catch (error) {
    console.error("Unexpected error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

/**
 * POST /api/teen/sport/clubs
 * Join a club or check-in to attendance
 *
 * Body:
 * - teenId: UUID of the teen
 * - action: 'join' | 'leave' | 'checkin'
 * - clubId: UUID of the club
 * - attendanceDate: Date for check-in (optional, defaults to today)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { teenId, action, clubId, attendanceDate } = body

    if (!teenId || !action || !clubId) {
      return NextResponse.json(
        { error: "teenId, action, and clubId are required" },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // Verify authentication
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    // Verify club exists
    const { data: club, error: clubError } = await supabase
      .from("sport_clubs")
      .select("*")
      .eq("id", clubId)
      .single()

    if (clubError || !club) {
      return NextResponse.json(
        { error: "Club not found" },
        { status: 404 }
      )
    }

    if (action === "join") {
      // Check if already a member
      const { data: existing } = await supabase
        .from("teen_club_memberships")
        .select("id, status")
        .eq("teen_id", teenId)
        .eq("club_id", clubId)
        .single()

      if (existing) {
        if (existing.status === "active") {
          return NextResponse.json(
            { error: "Already a member of this club" },
            { status: 400 }
          )
        }

        // Reactivate membership
        const { error } = await supabase
          .from("teen_club_memberships")
          .update({
            status: "active",
            updated_at: new Date().toISOString(),
          })
          .eq("id", existing.id)

        if (error) {
          console.error("Error reactivating membership:", error)
          return NextResponse.json(
            { error: "Failed to rejoin club" },
            { status: 500 }
          )
        }

        return NextResponse.json({
          success: true,
          message: "Membership reactivated",
        })
      }

      // Create new membership
      const { data: membership, error } = await supabase
        .from("teen_club_memberships")
        .insert({
          teen_id: teenId,
          club_id: clubId,
          status: "active",
          joined_at: new Date().toISOString().split("T")[0],
        })
        .select()
        .single()

      if (error) {
        console.error("Error joining club:", error)
        return NextResponse.json(
          { error: "Failed to join club" },
          { status: 500 }
        )
      }

      // Award XP for joining
      await supabase.rpc("add_xp_to_user", {
        p_teen_id: teenId,
        p_xp_amount: 25,
        p_source_type: "club_join",
        p_source_id: clubId,
        p_description: `Inscription au club: ${club.name}`,
      })

      return NextResponse.json({
        success: true,
        message: "Club joined successfully",
        membership,
        xpEarned: 25,
      })
    }

    if (action === "leave") {
      const { error } = await supabase
        .from("teen_club_memberships")
        .update({
          status: "inactive",
          left_at: new Date().toISOString().split("T")[0],
          updated_at: new Date().toISOString(),
        })
        .eq("teen_id", teenId)
        .eq("club_id", clubId)

      if (error) {
        console.error("Error leaving club:", error)
        return NextResponse.json(
          { error: "Failed to leave club" },
          { status: 500 }
        )
      }

      return NextResponse.json({
        success: true,
        message: "Left club successfully",
      })
    }

    if (action === "checkin") {
      // Verify membership
      const { data: membership } = await supabase
        .from("teen_club_memberships")
        .select("id, status")
        .eq("teen_id", teenId)
        .eq("club_id", clubId)
        .single()

      if (!membership || membership.status !== "active") {
        return NextResponse.json(
          { error: "Not a member of this club" },
          { status: 400 }
        )
      }

      const checkDate = attendanceDate || new Date().toISOString().split("T")[0]

      // Check if already checked in today
      const { data: existingCheckin } = await supabase
        .from("club_attendance")
        .select("id")
        .eq("teen_id", teenId)
        .eq("club_id", clubId)
        .eq("attendance_date", checkDate)
        .single()

      if (existingCheckin) {
        return NextResponse.json({
          success: true,
          message: "Already checked in for this date",
          alreadyCheckedIn: true,
        })
      }

      // Create attendance record
      const { data: attendance, error } = await supabase
        .from("club_attendance")
        .insert({
          teen_id: teenId,
          club_id: clubId,
          attendance_date: checkDate,
          check_in_time: new Date().toTimeString().split(" ")[0],
          verified: false,
          verification_method: "manual",
          xp_awarded: 20,
        })
        .select()
        .single()

      if (error) {
        console.error("Error checking in:", error)
        return NextResponse.json(
          { error: "Failed to check in" },
          { status: 500 }
        )
      }

      // Award XP
      await supabase.rpc("add_xp_to_user", {
        p_teen_id: teenId,
        p_xp_amount: 20,
        p_source_type: "club_attendance",
        p_source_id: attendance.id,
        p_description: `Presence au club: ${club.name}`,
      })

      return NextResponse.json({
        success: true,
        message: "Checked in successfully",
        attendance,
        xpEarned: 20,
      })
    }

    return NextResponse.json(
      { error: "Invalid action" },
      { status: 400 }
    )
  } catch (error) {
    console.error("Unexpected error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
