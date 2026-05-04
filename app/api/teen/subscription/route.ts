import { NextRequest } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { APIResponse } from "../../lib/responses"
import { SubscriptionHandlers } from "./handlers"

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return APIResponse.unauthorized()

    const { searchParams } = new URL(request.url)
    const type = searchParams.get("type") || "current"

    switch (type) {
      case "current": return await SubscriptionHandlers.current(user.id)
      case "plans": return await SubscriptionHandlers.plans()
      case "history": return await SubscriptionHandlers.history(user.id)
      case "payments": return await SubscriptionHandlers.payments(user.id, parseInt(searchParams.get("limit") || "20"))
      case "feature": return await SubscriptionHandlers.checkFeature(user.id, searchParams.get("code") || "")
      case "features": return await SubscriptionHandlers.features()
      case "requests": return await SubscriptionHandlers.requests(user.id)
      case "family": return await SubscriptionHandlers.family(user.id)
      case "validate_promo": return await SubscriptionHandlers.validatePromo(user.id, searchParams.get("code") || "", searchParams.get("plan_id") || undefined)
      default: return APIResponse.error("Type invalide")
    }
  } catch (error) {
    return APIResponse.serverError("Internal server error", error)
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return APIResponse.unauthorized()

    const body = await request.json()
    const { action } = body

    switch (action) {
      case "subscribe": return await SubscriptionHandlers.subscribe(user.id, body)
      case "cancel": return await SubscriptionHandlers.cancel(user.id, body)
      case "change_plan": return await SubscriptionHandlers.changePlan(user.id, body)
      case "pause": return await SubscriptionHandlers.pause(user.id)
      case "resume": return await SubscriptionHandlers.resume(user.id)
      case "request_payment": return await SubscriptionHandlers.requestPayment(user.id, body)
      case "enable_auto_renew": return await SubscriptionHandlers.toggleAutoRenew(user.id, true)
      case "disable_auto_renew": return await SubscriptionHandlers.toggleAutoRenew(user.id, false)
      case "invite_family_member": return await SubscriptionHandlers.inviteFamilyMember(user.id, body)
      case "respond_family_invite": return await SubscriptionHandlers.respondFamilyInvite(user.id, body)
      default: return APIResponse.error("Action invalide")
    }
  } catch (error) {
    return APIResponse.serverError("Internal server error", error)
  }
}
