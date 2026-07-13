/**
 * Teen-organized clubs (issue #239).
 *
 * GET  /api/teen/clubs
 *   - no `id`  → lists active clubs (teen_clubs WHERE is_active).
 *   - `?id=…`  → one club enriched with its active members + sessions.
 *
 * POST /api/teen/clubs
 *   Dispatches to the live RPCs by `action`:
 *   - 'create'     → create_teen_club   (organizer creates a club)
 *   - 'join'       → join_teen_club      (debits the joiner's cotisation)
 *   - 'addSession' → add_club_session    (owner adds a session)
 *
 * Auth: the teen's id === auth.uid() (per the RPC contract). RPCs return jsonb
 * { success, error?, ... } which we forward honestly (no fabricated success).
 *
 * NB: unlike the group-action pillars, clubs do NOT use group_actions/split —
 * they have their own simpler RPCs.
 */
import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export const dynamic = "force-dynamic"

// ---------------------------------------------------------------------------
// GET — list active clubs, or one club with its members + sessions
// ---------------------------------------------------------------------------
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const id = request.nextUrl.searchParams.get("id")

    if (id) {
      // One club + roster + sessions.
      const { data: club, error: clubErr } = await supabase
        .from("teen_clubs")
        .select(
          "id, name, description, cotisation_coins, max_members, owner_id, is_active, created_at"
        )
        .eq("id", id)
        .maybeSingle()

      if (clubErr) {
        console.error("Error fetching club:", clubErr)
        return NextResponse.json({ error: "Failed to fetch club" }, { status: 500 })
      }
      if (!club) {
        return NextResponse.json({ error: "Club not found" }, { status: 404 })
      }

      const { data: members } = await supabase
        .from("club_members")
        .select("id, teen_id, status, joined_at")
        .eq("club_id", id)
        .eq("status", "active")

      const { data: sessions } = await supabase
        .from("club_sessions")
        .select("id, title, starts_at, location")
        .eq("club_id", id)
        .order("starts_at", { ascending: true })

      return NextResponse.json({
        success: true,
        club,
        members: members ?? [],
        sessions: sessions ?? [],
        isOwner: club.owner_id === user.id,
      })
    }

    // List of active clubs.
    const { data: clubs, error } = await supabase
      .from("teen_clubs")
      .select("id, name, description, cotisation_coins, max_members, owner_id")
      .eq("is_active", true)
      .order("created_at", { ascending: false })

    if (error) {
      console.error("Error fetching clubs:", error)
      return NextResponse.json({ error: "Failed to fetch clubs" }, { status: 500 })
    }

    return NextResponse.json({ success: true, clubs: clubs ?? [] })
  } catch (error) {
    console.error("Unexpected error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// ---------------------------------------------------------------------------
// POST — dispatch to the live club RPCs
// ---------------------------------------------------------------------------
interface PostBody {
  action?: "create" | "join" | "addSession"
  // create
  name?: string
  description?: string
  cotisationCoins?: number
  maxMembers?: number
  // join / addSession
  clubId?: string
  // addSession
  title?: string
  startsAt?: string
  location?: string
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as PostBody
    const { action } = body

    if (!action) {
      return NextResponse.json({ error: "action is required" }, { status: 400 })
    }

    const supabase = await createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    if (action === "create") {
      const { name, description, cotisationCoins, maxMembers } = body
      if (!name || name.trim().length === 0) {
        return NextResponse.json({ error: "name is required" }, { status: 400 })
      }
      const { data, error } = await supabase.rpc("create_teen_club", {
        p_name: name.trim(),
        p_description: (description ?? "").trim(),
        p_cotisation_coins: cotisationCoins ?? 0,
        p_max_members: maxMembers ?? 0,
      })
      if (error) {
        return NextResponse.json({ success: false, error: error.message }, { status: 400 })
      }
      // RPC returns jsonb { success, error?, ... } — forward it honestly.
      const result = data as { success?: boolean } | null
      return NextResponse.json(data, { status: result?.success ? 200 : 400 })
    }

    if (action === "join") {
      const { clubId } = body
      if (!clubId) {
        return NextResponse.json({ error: "clubId is required" }, { status: 400 })
      }
      const { data, error } = await supabase.rpc("join_teen_club", {
        p_club_id: clubId,
      })
      if (error) {
        return NextResponse.json({ success: false, error: error.message }, { status: 400 })
      }
      const result = data as { success?: boolean } | null
      return NextResponse.json(data, { status: result?.success ? 200 : 400 })
    }

    if (action === "addSession") {
      const { clubId, title, startsAt, location } = body
      if (!clubId || !title || !startsAt) {
        return NextResponse.json(
          { error: "clubId, title and startsAt are required" },
          { status: 400 }
        )
      }
      const { data, error } = await supabase.rpc("add_club_session", {
        p_club_id: clubId,
        p_title: title.trim(),
        p_starts_at: startsAt,
        p_location: (location ?? "").trim(),
      })
      if (error) {
        return NextResponse.json({ success: false, error: error.message }, { status: 400 })
      }
      const result = data as { success?: boolean } | null
      return NextResponse.json(data, { status: result?.success ? 200 : 400 })
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 })
  } catch (error) {
    console.error("Unexpected error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
