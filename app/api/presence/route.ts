import { NextRequest } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { APIResponse } from "../lib/responses"

// Rate limiting: Track last update per user to prevent spam
const lastUpdateMap = new Map<string, number>()
const THROTTLE_MS = 5000 // Minimum 5 seconds between heartbeats

/**
 * GET /api/presence
 * 
 * Get presence data for friends or self
 * Query params:
 *   - type: 'friends' | 'self' (default: 'friends')
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) return APIResponse.unauthorized()

    const searchParams = request.nextUrl.searchParams
    const type = searchParams.get("type") || "friends"

    if (type === "self") {
      // Get own presence
      const { data, error } = await supabase
        .from("user_presence")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle()

      if (error) {
        console.error("Error fetching self presence:", error)
        return APIResponse.serverError("Failed to fetch presence")
      }

      return APIResponse.success({ presence: data || { status: "offline" } })
    }

    // Get friends presence using RPC function
    const { data, error } = await supabase.rpc("get_friends_presence", {
      p_user_id: user.id
    })

    if (error) {
      console.error("Error fetching friends presence:", error)
      return APIResponse.serverError("Failed to fetch friends presence")
    }

    return APIResponse.success({ 
      friends: data || [],
      count: data?.length || 0
    })
  } catch (error) {
    return APIResponse.serverError("Internal server error", error)
  }
}

/**
 * POST /api/presence
 * 
 * Update user presence (heartbeat)
 * Body:
 *   - status: 'online' | 'away' | 'playing' | 'busy' | 'offline'
 *   - activity: string (optional) - current activity context
 *   - page: string (optional) - current page/route
 *   - deviceId: string (optional) - device identifier
 *   - deviceType: 'mobile' | 'tablet' | 'desktop' (optional)
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) return APIResponse.unauthorized()

    // Throttle check
    const lastUpdate = lastUpdateMap.get(user.id)
    const now = Date.now()
    
    if (lastUpdate && now - lastUpdate < THROTTLE_MS) {
      return APIResponse.success({ throttled: true, message: "Rate limited" })
    }
    
    lastUpdateMap.set(user.id, now)

    const body = await request.json()
    const { 
      status = "online", 
      activity = null, 
      page = null,
      deviceId = null,
      deviceType = "unknown"
    } = body

    // Validate status
    const validStatuses = ["online", "away", "playing", "busy", "offline"]
    if (!validStatuses.includes(status)) {
      return APIResponse.error("Invalid status. Must be one of: " + validStatuses.join(", "))
    }

    // Call RPC function to upsert presence
    const { data, error } = await supabase.rpc("update_user_presence", {
      p_status: status,
      p_activity: activity,
      p_page: page,
      p_device_id: deviceId,
      p_device_type: deviceType
    })

    if (error) {
      console.error("Error updating presence:", error)
      return APIResponse.serverError("Failed to update presence")
    }

    return APIResponse.success({ 
      presence: data,
      updated: true
    })
  } catch (error) {
    return APIResponse.serverError("Internal server error", error)
  }
}

/**
 * DELETE /api/presence
 * 
 * Mark user as offline (logout/session end)
 */
export async function DELETE() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) return APIResponse.unauthorized()

    // Call RPC to mark offline
    const { error } = await supabase.rpc("mark_user_offline")

    if (error) {
      console.error("Error marking offline:", error)
      return APIResponse.serverError("Failed to update presence")
    }

    // Clean up throttle map
    lastUpdateMap.delete(user.id)

    return APIResponse.success({ 
      status: "offline",
      message: "Marked as offline"
    })
  } catch (error) {
    return APIResponse.serverError("Internal server error", error)
  }
}
