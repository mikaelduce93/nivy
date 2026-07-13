/**
 * V6 — Partner venue group booking (issue #238).
 *
 * GET  /api/teen/venues
 *   - no params           → lists partner venues (partners WHERE partner_type='venue', active)
 *   - ?venueId=<uuid>     → one venue + its active slots (venue_slots)
 *
 * POST /api/teen/venues
 *   Dispatches to the live RPCs by `action`:
 *   - 'create'  → create_group_action      (action_type 'venue_booking')
 *   - 'respond' → respond_to_group_invite   (invitee accepts/declines)
 *   - 'preview' → unlock_group_size_rewards  (size-discount preview)
 *   - 'reserve' → reserve_group_venue_slot   (organizer locks a slot for the group)
 *
 * Auth: the teen's id === auth.uid() (per the RPC contract), so we use
 * `user.id` as the teen_id throughout. Group RPCs return jsonb
 * { success, error?, ... } which we forward honestly (no fabricated success).
 */
import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export const dynamic = "force-dynamic"

// ---------------------------------------------------------------------------
// GET — list partner venues, or one venue with its active slots
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

    const venueId = request.nextUrl.searchParams.get("venueId")

    if (venueId) {
      // One venue + its active slots.
      const { data: venue, error: venueErr } = await supabase
        .from("partners")
        .select("id, company_name, description, sub_category")
        .eq("id", venueId)
        .eq("partner_type", "venue")
        .eq("status", "active")
        .maybeSingle()

      if (venueErr) {
        console.error("Error fetching venue:", venueErr)
        return NextResponse.json({ error: "Failed to fetch venue" }, { status: 500 })
      }
      if (!venue) {
        return NextResponse.json({ error: "Venue not found" }, { status: 404 })
      }

      // venue_slots may legitimately have no rows yet → empty array is correct.
      const { data: slots, error: slotErr } = await supabase
        .from("venue_slots")
        .select("id, title, starts_at, capacity, booked, price_coins")
        .eq("partner_id", venueId)
        .eq("is_active", true)
        .order("starts_at", { ascending: true })

      if (slotErr) {
        console.error("Error fetching venue slots:", slotErr)
        return NextResponse.json({ error: "Failed to fetch slots" }, { status: 500 })
      }

      return NextResponse.json({ success: true, venue, slots: slots ?? [] })
    }

    // Venue list.
    const { data: venues, error: listErr } = await supabase
      .from("partners")
      .select("id, company_name, description, sub_category")
      .eq("partner_type", "venue")
      .eq("status", "active")
      .order("company_name", { ascending: true })

    if (listErr) {
      console.error("Error fetching venues:", listErr)
      return NextResponse.json({ error: "Failed to fetch venues" }, { status: 500 })
    }

    return NextResponse.json({ success: true, venues: venues ?? [] })
  } catch (error) {
    console.error("Unexpected error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// ---------------------------------------------------------------------------
// POST — dispatch to the live venue group-booking RPCs
// ---------------------------------------------------------------------------
interface PostBody {
  action?: "create" | "respond" | "preview" | "reserve"
  // create
  title?: string
  inviteeIds?: string[]
  maxSize?: number
  deadline?: string | null
  // respond / preview / reserve
  groupActionId?: string
  // respond
  response?: "accept" | "decline"
  // preview
  partnerId?: string | null
  // reserve
  slotId?: string
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
      const { title, inviteeIds, maxSize, deadline } = body
      if (!title || title.trim().length === 0) {
        return NextResponse.json({ error: "title is required" }, { status: 400 })
      }
      const { data, error } = await supabase.rpc("create_group_action", {
        p_action_type: "venue_booking",
        p_invitee_ids: inviteeIds ?? [],
        p_title: title.trim(),
        p_max_size: maxSize ?? 4,
        p_deadline: deadline ?? undefined,
      })
      if (error) {
        return NextResponse.json({ success: false, error: error.message }, { status: 400 })
      }
      // RPC returns jsonb { success, error?, ... } (typed Json) — forward it honestly.
      const result = data as { success?: boolean } | null
      return NextResponse.json(data, { status: result?.success ? 200 : 400 })
    }

    if (action === "respond") {
      const { groupActionId, response } = body
      if (!groupActionId || !response) {
        return NextResponse.json(
          { error: "groupActionId and response are required" },
          { status: 400 }
        )
      }
      if (response !== "accept" && response !== "decline") {
        return NextResponse.json({ error: "Invalid response" }, { status: 400 })
      }
      const { data, error } = await supabase.rpc("respond_to_group_invite", {
        p_group_action_id: groupActionId,
        p_response: response,
      })
      if (error) {
        return NextResponse.json({ success: false, error: error.message }, { status: 400 })
      }
      const result = data as { success?: boolean } | null
      return NextResponse.json(data, { status: result?.success ? 200 : 400 })
    }

    if (action === "preview") {
      const { groupActionId, partnerId } = body
      if (!groupActionId) {
        return NextResponse.json({ error: "groupActionId is required" }, { status: 400 })
      }
      const { data, error } = await supabase.rpc("unlock_group_size_rewards", {
        p_group_action_id: groupActionId,
        p_partner_id: partnerId ?? undefined,
      })
      if (error) {
        return NextResponse.json({ success: false, error: error.message }, { status: 400 })
      }
      const result = data as { success?: boolean } | null
      return NextResponse.json(data, { status: result?.success ? 200 : 400 })
    }

    if (action === "reserve") {
      const { groupActionId, slotId } = body
      if (!groupActionId || !slotId) {
        return NextResponse.json(
          { error: "groupActionId and slotId are required" },
          { status: 400 }
        )
      }
      const { data, error } = await supabase.rpc("reserve_group_venue_slot", {
        p_group_action_id: groupActionId,
        p_slot_id: slotId,
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
