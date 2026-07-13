/**
 * V6 — Collective birthday (issue #240).
 *
 * GET  /api/teen/birthday/group
 *   Returns, for the authenticated teen:
 *   - orders:       their own anniv_orders (id, party_date, total_dh, status)
 *   - organized:    their `anniv` group_actions where they are the organizer
 *   - invited:      their `anniv` group_actions where they are a non-organizer invitee
 *   Each group_action is enriched with its invite roster (group_action_invites)
 *   and, when finalized, its attendees (anniv_order_attendees).
 *
 * POST /api/teen/birthday/group
 *   Dispatches to the live RPCs by `action`:
 *   - 'create'   → create_group_action     (organizer opens a forming anniv,
 *                  resource_id = the chosen anniv_order_id)
 *   - 'respond'  → respond_to_group_invite  (invitee accepts/declines)
 *   - 'preview'  → unlock_group_size_rewards (size-discount preview)
 *   - 'finalize' → finalize_group_anniv      (organizer splits the contributions)
 *
 * Auth: the teen's id === auth.uid() (per the RPC contract), so we use
 * `user.id` as the teen_id throughout. RPCs return jsonb { success, error?, ... }
 * which we forward honestly (no fabricated success).
 */
import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export const dynamic = "force-dynamic"

// The collective-birthday RPCs return jsonb { success, error?, ... }; typed as
// `Json` by the generated types, so we cast at the frontier to read `success`.
type RpcResult = { success?: boolean } | null

// ---------------------------------------------------------------------------
// GET — the teen's anniv_orders + their `anniv` group_actions (+ attendees)
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

    // The teen's own birthday orders (lean schema: id, party_date, total_dh, status).
    const { data: orders, error: ordErr } = await supabase
      .from("anniv_orders")
      .select("id, party_date, total_dh, status")
      .eq("teen_id", user.id)
      .order("party_date", { ascending: false })

    if (ordErr) {
      console.error("Error fetching anniv orders:", ordErr)
      return NextResponse.json({ error: "Failed to fetch birthday orders" }, { status: 500 })
    }

    // Group actions the teen is involved in, via their invite rows (RLS lets the
    // teen read their own invites; organizer auto-gets an is_organizer invite).
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
      return NextResponse.json({
        success: true,
        orders: orders ?? [],
        organized: [],
        invited: [],
      })
    }

    // Fetch the `anniv` group_actions themselves…
    const { data: actions, error: actErr } = await supabase
      .from("group_actions")
      .select(
        "id, organizer_id, action_type, resource_id, title, status, max_size, total_coins, deadline, created_at"
      )
      .in("id", actionIds)
      .eq("action_type", "anniv")
      .order("created_at", { ascending: false })

    if (actErr) {
      console.error("Error fetching group actions:", actErr)
      return NextResponse.json({ error: "Failed to fetch group birthdays" }, { status: 500 })
    }

    const annivActionIds = (actions ?? []).map((a) => a.id)

    if (annivActionIds.length === 0) {
      return NextResponse.json({
        success: true,
        orders: orders ?? [],
        organized: [],
        invited: [],
      })
    }

    // …the full roster of invites for those actions (to show accepted/pending)…
    const { data: roster } = await supabase
      .from("group_action_invites")
      .select("id, group_action_id, teen_id, status, is_organizer, share_coins, expires_at")
      .in("group_action_id", annivActionIds)

    // …and the attendees (contributions) for any finalized anniv.
    const { data: attendees } = await supabase
      .from("anniv_order_attendees")
      .select("id, anniv_order_id, group_action_id, teen_id, contribution_coins, status")
      .in("group_action_id", annivActionIds)

    const rosterByAction = new Map<string, NonNullable<typeof roster>>()
    for (const r of roster ?? []) {
      const list = rosterByAction.get(r.group_action_id) ?? []
      list.push(r)
      rosterByAction.set(r.group_action_id, list)
    }

    const attendeesByAction = new Map<string, NonNullable<typeof attendees>>()
    for (const a of attendees ?? []) {
      if (!a.group_action_id) continue
      const list = attendeesByAction.get(a.group_action_id) ?? []
      list.push(a)
      attendeesByAction.set(a.group_action_id, list)
    }

    const enriched = (actions ?? []).map((a) => {
      const invites = rosterByAction.get(a.id) ?? []
      const accepted = invites.filter((i) => i.status === "accepted").length
      return {
        ...a,
        is_organizer: a.organizer_id === user.id,
        invites,
        attendees: attendeesByAction.get(a.id) ?? [],
        stats: {
          total: invites.length,
          accepted,
          pending: invites.filter((i) => i.status === "pending").length,
        },
      }
    })

    return NextResponse.json({
      success: true,
      orders: orders ?? [],
      organized: enriched.filter((a) => a.is_organizer),
      invited: enriched.filter((a) => !a.is_organizer),
    })
  } catch (error) {
    console.error("Unexpected error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// ---------------------------------------------------------------------------
// POST — dispatch to the live collective-birthday RPCs
// ---------------------------------------------------------------------------
interface PostBody {
  action?: "create" | "respond" | "preview" | "finalize"
  // create
  title?: string
  annivOrderId?: string
  inviteeIds?: string[]
  maxSize?: number
  deadline?: string | null
  // respond / preview / finalize
  groupActionId?: string
  // respond
  response?: "accept" | "decline"
  // preview
  partnerId?: string | null
  // finalize
  totalDh?: number
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
      const { title, annivOrderId, inviteeIds, maxSize, deadline } = body
      if (!title || title.trim().length === 0) {
        return NextResponse.json({ error: "title is required" }, { status: 400 })
      }
      if (!annivOrderId) {
        return NextResponse.json({ error: "annivOrderId is required" }, { status: 400 })
      }
      const { data, error } = await supabase.rpc("create_group_action", {
        p_action_type: "anniv",
        p_resource_id: annivOrderId,
        p_invitee_ids: inviteeIds ?? [],
        p_title: title.trim(),
        p_max_size: maxSize ?? undefined,
        p_deadline: deadline ?? undefined,
      })
      if (error) {
        return NextResponse.json({ success: false, error: error.message }, { status: 400 })
      }
      // RPC returns { success, error?, ... } — forward it honestly.
      return NextResponse.json(data, { status: (data as RpcResult)?.success ? 200 : 400 })
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
      return NextResponse.json(data, { status: (data as RpcResult)?.success ? 200 : 400 })
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
      return NextResponse.json(data, { status: (data as RpcResult)?.success ? 200 : 400 })
    }

    if (action === "finalize") {
      const { groupActionId, annivOrderId, totalDh } = body
      if (!groupActionId || !annivOrderId) {
        return NextResponse.json(
          { error: "groupActionId and annivOrderId are required" },
          { status: 400 }
        )
      }
      const { data, error } = await supabase.rpc("finalize_group_anniv", {
        p_group_action_id: groupActionId,
        p_anniv_order_id: annivOrderId,
        p_total_dh: totalDh ?? 0,
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
