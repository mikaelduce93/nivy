/**
 * V6 — Teen events + group booking (issue #237).
 *
 * GET  /api/teen/events/groups
 *   Returns:
 *   - events:    events the teen can book in group — the teen's own created
 *                events (events.created_by === user.id) plus public published
 *                events with a future date.
 *   - organized: the teen's `event` group_actions where they are organizer
 *   - invited:   the teen's `event` group_actions where they are an invitee
 *   Each group_action is enriched with its invite roster.
 *
 * POST /api/teen/events/groups
 *   Dispatches to the live RPCs by `action`:
 *   - 'createEvent' → create_teen_event           (teen creates an event)
 *   - 'create'      → create_group_action          (organizer opens a group booking)
 *   - 'respond'     → respond_to_group_invite        (invitee accepts/declines)
 *   - 'preview'     → unlock_group_size_rewards      (size-discount preview)
 *   - 'finalize'    → finalize_group_event_booking   (organizer books + splits)
 *
 * Auth: the teen's id === auth.uid() (per the RPC contract), so we use
 * `user.id` as the teen_id throughout. RPCs return jsonb { success, error?, ... }
 * which we forward honestly (no fabricated success).
 */
import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export const dynamic = "force-dynamic"

// Live RPCs return jsonb { success, error?, ... }; cast at the boundary.
type RpcResult = { success?: boolean } | null

// ---------------------------------------------------------------------------
// GET — bookable events + the teen's event group_actions (organized + invited)
// ---------------------------------------------------------------------------
export async function GET() {
  try {
    const supabase = await createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const nowIso = new Date().toISOString()

    // Public published events the teen can book (future-dated)…
    const { data: publicEvents } = await supabase
      .from("events")
      .select("id, title, starts_at, event_date, city, price_coins, capacity, created_by, status")
      .eq("status", "published")
      .gte("event_date", nowIso)
      .order("event_date", { ascending: true })
      .limit(50)

    // …plus the teen's own created events (any status, so they can book before
    // moderation completes — the RPC still gates the actual booking).
    const { data: ownEvents } = await supabase
      .from("events")
      .select("id, title, starts_at, event_date, city, price_coins, capacity, created_by, status")
      .eq("created_by", user.id)
      .order("created_at", { ascending: false })
      .limit(50)

    const byId = new Map<string, NonNullable<typeof publicEvents>[number]>()
    for (const e of [...(ownEvents ?? []), ...(publicEvents ?? [])]) {
      if (!byId.has(e.id)) byId.set(e.id, e)
    }
    const events = Array.from(byId.values())

    // Group actions the teen is involved in, via their invite rows.
    const { data: myInvites, error: invErr } = await supabase
      .from("group_action_invites")
      .select("group_action_id")
      .eq("teen_id", user.id)

    if (invErr) {
      console.error("Error fetching group invites:", invErr)
      return NextResponse.json({ error: "Failed to fetch group invites" }, { status: 500 })
    }

    const actionIds = Array.from(
      new Set((myInvites ?? []).map((i) => i.group_action_id).filter(Boolean))
    ) as string[]

    if (actionIds.length === 0) {
      return NextResponse.json({ success: true, events, organized: [], invited: [] })
    }

    const { data: actions, error: actErr } = await supabase
      .from("group_actions")
      .select(
        "id, organizer_id, action_type, title, status, max_size, total_coins, resource_id, deadline, created_at"
      )
      .in("id", actionIds)
      .eq("action_type", "event")
      .order("created_at", { ascending: false })

    if (actErr) {
      console.error("Error fetching group actions:", actErr)
      return NextResponse.json({ error: "Failed to fetch group bookings" }, { status: 500 })
    }

    const { data: roster } = await supabase
      .from("group_action_invites")
      .select("id, group_action_id, teen_id, status, is_organizer, share_coins, expires_at")
      .in("group_action_id", actionIds)

    const rosterByAction = new Map<string, NonNullable<typeof roster>>()
    for (const r of roster ?? []) {
      const list = rosterByAction.get(r.group_action_id) ?? []
      list.push(r)
      rosterByAction.set(r.group_action_id, list)
    }

    const enriched = (actions ?? []).map((a) => {
      const invites = rosterByAction.get(a.id) ?? []
      const accepted = invites.filter((i) => i.status === "accepted").length
      return {
        ...a,
        is_organizer: a.organizer_id === user.id,
        invites,
        stats: {
          total: invites.length,
          accepted,
          pending: invites.filter((i) => i.status === "pending").length,
        },
      }
    })

    return NextResponse.json({
      success: true,
      events,
      organized: enriched.filter((a) => a.is_organizer),
      invited: enriched.filter((a) => !a.is_organizer),
    })
  } catch (error) {
    console.error("Unexpected error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// ---------------------------------------------------------------------------
// POST — dispatch to the live event RPCs
// ---------------------------------------------------------------------------
interface PostBody {
  action?: "createEvent" | "create" | "respond" | "preview" | "finalize"
  // createEvent
  title?: string
  description?: string
  startsAt?: string | null
  city?: string
  address?: string
  capacity?: number | null
  priceCoins?: number
  // create (group_action)
  eventId?: string
  inviteeIds?: string[]
  maxSize?: number
  deadline?: string | null
  // respond / preview / finalize
  groupActionId?: string
  // respond
  response?: "accept" | "decline"
  // preview
  partnerId?: string | null
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

    // --- Create an event (teen-created, pending moderation) ------------------
    if (action === "createEvent") {
      const { title, description, startsAt, city, address, capacity, priceCoins } = body
      if (!title || title.trim().length === 0) {
        return NextResponse.json({ error: "title is required" }, { status: 400 })
      }
      const { data, error } = await supabase.rpc("create_teen_event", {
        p_title: title.trim(),
        p_description: description?.trim() || undefined,
        p_starts_at: startsAt ?? undefined,
        p_city: city?.trim() || undefined,
        p_address: address?.trim() || undefined,
        p_capacity: capacity ?? undefined,
        p_price_coins: priceCoins ?? 0,
      })
      if (error) {
        return NextResponse.json({ success: false, error: error.message }, { status: 400 })
      }
      return NextResponse.json(data, { status: (data as RpcResult)?.success ? 200 : 400 })
    }

    // --- Open a group booking for a chosen event -----------------------------
    if (action === "create") {
      const { title, eventId, inviteeIds, maxSize, deadline } = body
      if (!title || title.trim().length === 0) {
        return NextResponse.json({ error: "title is required" }, { status: 400 })
      }
      if (!eventId) {
        return NextResponse.json({ error: "eventId is required" }, { status: 400 })
      }
      const { data, error } = await supabase.rpc("create_group_action", {
        p_action_type: "event",
        p_resource_id: eventId,
        p_invitee_ids: inviteeIds ?? [],
        p_title: title.trim(),
        p_max_size: maxSize ?? undefined,
        p_deadline: deadline ?? undefined,
      })
      if (error) {
        return NextResponse.json({ success: false, error: error.message }, { status: 400 })
      }
      return NextResponse.json(data, { status: (data as RpcResult)?.success ? 200 : 400 })
    }

    // --- Invitee accepts / declines ------------------------------------------
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
      return NextResponse.json(data, { status: (data as RpcResult)?.success ? 200 : 400 })
    }

    // --- Size-discount preview -----------------------------------------------
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
      return NextResponse.json(data, { status: (data as RpcResult)?.success ? 200 : 400 })
    }

    // --- Finalize the group booking (organizer) ------------------------------
    if (action === "finalize") {
      const { groupActionId, eventId } = body
      if (!groupActionId || !eventId) {
        return NextResponse.json(
          { error: "groupActionId and eventId are required" },
          { status: 400 }
        )
      }
      const { data, error } = await supabase.rpc("finalize_group_event_booking", {
        p_group_action_id: groupActionId,
        p_event_id: eventId,
      })
      if (error) {
        return NextResponse.json({ success: false, error: error.message }, { status: 400 })
      }
      return NextResponse.json(data, { status: (data as RpcResult)?.success ? 200 : 400 })
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 })
  } catch (error) {
    console.error("Unexpected error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
