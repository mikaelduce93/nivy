/**
 * V6 — Group food orders (issue #236).
 *
 * GET  /api/teen/food/groups
 *   Lists the teen's `food` group_actions, split into:
 *   - organized: groups where the teen is the organizer
 *   - invited:   groups where the teen is a non-organizer invitee
 *   Each entry is enriched with its invite roster (group_action_invites).
 *
 * POST /api/teen/food/groups
 *   Dispatches to the live RPCs by `action`:
 *   - 'create'   → create_group_action        (organizer creates a forming order)
 *   - 'respond'  → respond_to_group_invite     (invitee accepts/declines)
 *   - 'preview'  → unlock_group_size_rewards   (size-discount preview)
 *   - 'finalize' → finalize_group_food_order   (organizer locks + splits the bill)
 *
 * Auth: the teen's id === auth.uid() (per the RPC contract), so we use
 * `user.id` as the teen_id throughout. RPCs return jsonb { success, error?, ... }
 * which we forward honestly (no fabricated success).
 */
import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export const dynamic = "force-dynamic"

// ---------------------------------------------------------------------------
// GET — list the teen's food group_actions (organized + invited)
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

    // Group actions the teen is involved in, via their invite rows (RLS lets the
    // teen read their own invites; organizer auto-gets an is_organizer invite).
    const { data: myInvites, error: invErr } = await supabase
      .from("group_action_invites")
      .select("id, group_action_id, status, is_organizer, share_coins, expires_at")
      .eq("teen_id", user.id)

    if (invErr) {
      console.error("Error fetching group invites:", invErr)
      return NextResponse.json({ error: "Failed to fetch group invites" }, { status: 500 })
    }

    const actionIds = Array.from(
      new Set((myInvites ?? []).map((i) => i.group_action_id).filter(Boolean))
    ) as string[]

    if (actionIds.length === 0) {
      return NextResponse.json({ success: true, organized: [], invited: [] })
    }

    // Fetch the food group_actions themselves…
    const { data: actions, error: actErr } = await supabase
      .from("group_actions")
      .select(
        "id, organizer_id, action_type, title, status, max_size, total_coins, deadline, created_at"
      )
      .in("id", actionIds)
      .eq("action_type", "food")
      .order("created_at", { ascending: false })

    if (actErr) {
      console.error("Error fetching group actions:", actErr)
      return NextResponse.json({ error: "Failed to fetch group orders" }, { status: 500 })
    }

    // …and the full roster of invites for those actions (to show accepted/pending).
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
      organized: enriched.filter((a) => a.is_organizer),
      invited: enriched.filter((a) => !a.is_organizer),
    })
  } catch (error) {
    console.error("Unexpected error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// ---------------------------------------------------------------------------
// POST — dispatch to the live group-food RPCs
// ---------------------------------------------------------------------------
interface FoodItem {
  menu_item_id?: string
  qty?: number
  unit_price_coins?: number
  unit_price_dh?: number
}

interface PostBody {
  action?: "create" | "respond" | "preview" | "finalize"
  // create
  title?: string
  inviteeIds?: string[]
  maxSize?: number
  deadline?: string | null
  resourceId?: string | null
  // respond / preview / finalize
  groupActionId?: string
  // respond
  response?: "accept" | "decline"
  // preview / finalize
  partnerId?: string | null
  // finalize
  deliveryType?: "delivery" | "pickup" | "dine_in"
  items?: FoodItem[]
  address?: string | null
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
      const { title, inviteeIds, maxSize, deadline, resourceId } = body
      if (!title || title.trim().length === 0) {
        return NextResponse.json({ error: "title is required" }, { status: 400 })
      }
      const { data, error } = await supabase.rpc("create_group_action", {
        p_action_type: "food",
        p_resource_id: resourceId ?? null,
        p_invitee_ids: inviteeIds ?? [],
        p_title: title.trim(),
        p_max_size: maxSize ?? 6,
        p_deadline: deadline ?? null,
      })
      if (error) {
        return NextResponse.json({ success: false, error: error.message }, { status: 400 })
      }
      // RPC returns { success, error?, ... } — forward it honestly.
      return NextResponse.json(data, { status: data?.success ? 200 : 400 })
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
      return NextResponse.json(data, { status: data?.success ? 200 : 400 })
    }

    if (action === "preview") {
      const { groupActionId, partnerId } = body
      if (!groupActionId) {
        return NextResponse.json({ error: "groupActionId is required" }, { status: 400 })
      }
      const { data, error } = await supabase.rpc("unlock_group_size_rewards", {
        p_group_action_id: groupActionId,
        p_partner_id: partnerId ?? null,
      })
      if (error) {
        return NextResponse.json({ success: false, error: error.message }, { status: 400 })
      }
      return NextResponse.json(data, { status: data?.success ? 200 : 400 })
    }

    if (action === "finalize") {
      const { groupActionId, partnerId, deliveryType, items, address } = body
      if (!groupActionId || !partnerId || !deliveryType) {
        return NextResponse.json(
          { error: "groupActionId, partnerId and deliveryType are required" },
          { status: 400 }
        )
      }
      if (
        deliveryType !== "delivery" &&
        deliveryType !== "pickup" &&
        deliveryType !== "dine_in"
      ) {
        return NextResponse.json({ error: "Invalid deliveryType" }, { status: 400 })
      }
      if (!Array.isArray(items) || items.length === 0) {
        return NextResponse.json({ error: "items is required" }, { status: 400 })
      }
      if (deliveryType === "delivery" && (!address || address.trim().length < 5)) {
        return NextResponse.json(
          { error: "address is required for delivery" },
          { status: 400 }
        )
      }
      const { data, error } = await supabase.rpc("finalize_group_food_order", {
        p_group_action_id: groupActionId,
        p_partner_id: partnerId,
        p_delivery_type: deliveryType,
        p_items: items,
        p_address: deliveryType === "delivery" ? address?.trim() ?? null : null,
      })
      if (error) {
        return NextResponse.json({ success: false, error: error.message }, { status: 400 })
      }
      return NextResponse.json(data, { status: data?.success ? 200 : 400 })
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 })
  } catch (error) {
    console.error("Unexpected error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
