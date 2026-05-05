import { createClient } from "@/lib/supabase/server"
import { randomBytes } from "node:crypto"
import { APIResponse } from "../../lib/responses"

export const SubscriptionHandlers = {
  // GET Handlers
  async current(userId: string) {
    const supabase = await createClient()
    const { data: plan, error } = await supabase.rpc("get_user_plan", { p_user_id: userId })
    if (error) return APIResponse.serverError("Failed to fetch plan", error)
    return APIResponse.success({ plan: plan?.[0] || null })
  },

  async plans() {
    const supabase = await createClient()
    const { data: plans, error } = await supabase.from("subscription_plans").select("*").eq("is_active", true).order("sort_order", { ascending: true })
    if (error) return APIResponse.serverError("Failed to fetch plans", error)
    return APIResponse.success({ plans: plans || [] })
  },

  async history(userId: string) {
    const supabase = await createClient()
    const { data: subscriptions, error } = await supabase.from("user_subscriptions").select(`*, plan:subscription_plans (id, code, name, plan_type)`).eq("user_id", userId).order("created_at", { ascending: false })
    if (error) return APIResponse.serverError("Failed to fetch history", error)
    return APIResponse.success({ subscriptions: subscriptions || [] })
  },

  async payments(userId: string, limit: number) {
    const supabase = await createClient()
    const { data: payments, error } = await supabase.from("subscription_payments").select(`*, plan:subscription_plans (id, code, name)`).eq("user_id", userId).order("created_at", { ascending: false }).limit(limit)
    if (error) return APIResponse.serverError("Failed to fetch payments", error)
    return APIResponse.success({ payments: payments || [] })
  },

  async checkFeature(userId: string, code: string) {
    const supabase = await createClient()
    const { data: access, error } = await supabase.rpc("check_feature_access", { p_user_id: userId, p_feature_code: code })
    if (error) return APIResponse.serverError("Failed to check access", error)
    return APIResponse.success({ access })
  },

  async features() {
    const supabase = await createClient()
    const { data: features, error } = await supabase.from("premium_features").select("*").eq("is_active", true).order("category")
    if (error) return APIResponse.serverError("Failed to fetch features", error)
    return APIResponse.success({ features: features || [] })
  },

  async requests(userId: string) {
    const supabase = await createClient()
    const { data: requests, error } = await supabase.from("payment_requests").select(`*, plan:subscription_plans (id, code, name, price_monthly, price_quarterly, price_yearly)`).eq("user_id", userId).order("created_at", { ascending: false }).limit(10)
    if (error) return APIResponse.serverError("Failed to fetch requests", error)
    return APIResponse.success({ requests: requests || [] })
  },

  async family(userId: string) {
    const supabase = await createClient()
    const { data: family, error } = await supabase.from("family_subscriptions").select(`*, members:family_members (id, user_id, role, status, invited_at, accepted_at, user:users!user_id (id, username, display_name, avatar_url))`).eq("owner_id", userId).single()
    if (error && error.code !== "PGRST116") return APIResponse.serverError("Failed to fetch family", error)
    return APIResponse.success({ family: family || null })
  },

  async validatePromo(userId: string, code: string, planId?: string) {
    const supabase = await createClient()
    const { data: promo, error } = await supabase.from("promo_codes").select("*").eq("code", code.toUpperCase()).eq("is_active", true).single()
    if (error || !promo) return APIResponse.success({ valid: false, error: "Code invalide ou expiré" })

    if (promo.valid_until && new Date(promo.valid_until) < new Date()) return APIResponse.success({ valid: false, error: "Code expiré" })
    if (promo.max_uses && promo.current_uses >= promo.max_uses) return APIResponse.success({ valid: false, error: "Code épuisé" })

    const { data: used } = await supabase.from("promo_code_uses").select("id").eq("promo_code_id", promo.id).eq("user_id", userId).single()
    if (used) return APIResponse.success({ valid: false, error: "Tu as déjà utilisé ce code" })

    if (planId && promo.applicable_plans && !promo.applicable_plans.includes(planId)) return APIResponse.success({ valid: false, error: "Code non applicable à ce forfait" })

    return APIResponse.success({ valid: true, promo: { code: promo.code, discount_type: promo.discount_type, discount_value: promo.discount_value, description: promo.description } })
  },

  // POST Handlers
  async subscribe(userId: string, body: any) {
    const { plan_id, billing_cycle, payment_method, promo_code } = body
    if (!plan_id || !billing_cycle || !payment_method) return APIResponse.error("plan_id, billing_cycle et payment_method requis")

    const supabase = await createClient()
    const { data: plan } = await supabase.from("subscription_plans").select("*").eq("id", plan_id).eq("is_active", true).single()
    if (!plan) return APIResponse.error("Forfait invalide")

    if (["card", "paypal", "mobile_money"].includes(payment_method)) {
      const amount = billing_cycle === "monthly" ? plan.price_monthly : billing_cycle === "quarterly" ? plan.price_quarterly : billing_cycle === "yearly" ? plan.price_yearly : plan.price_lifetime
      return APIResponse.success({ requires_payment: true, payment_session: { id: `pay_${Date.now()}`, plan_id, billing_cycle, amount, currency: plan.currency, return_url: `${process.env.NEXT_PUBLIC_APP_URL}/subscription/confirm`, cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/subscription/cancel` } })
    }

    const { data: result, error } = await supabase.rpc("create_subscription", { p_user_id: userId, p_plan_id: plan_id, p_billing_cycle: billing_cycle, p_payment_method: payment_method, p_promo_code: promo_code })
    if (error) return APIResponse.serverError("Failed to create subscription", error)
    return APIResponse.success(result)
  },

  async cancel(userId: string, body: any) {
    const { reason, immediate = false } = body
    const supabase = await createClient()
    const { data: result, error } = await supabase.rpc("cancel_subscription", { p_user_id: userId, p_reason: reason, p_immediate: immediate })
    if (error) return APIResponse.serverError("Failed to cancel subscription", error)
    return APIResponse.success(result)
  },

  async changePlan(userId: string, body: any) {
    const { plan_id, billing_cycle } = body
    if (!plan_id) return APIResponse.error("plan_id requis")
    const supabase = await createClient()
    const { data: currentSub } = await supabase.from("user_subscriptions").select("*").eq("user_id", userId).in("status", ["active", "trial"]).single()
    if (!currentSub) return APIResponse.error("Aucun abonnement actif")

    const { error } = await supabase.from("user_subscriptions").update({ plan_id, billing_cycle: billing_cycle || currentSub.billing_cycle, updated_at: new Date().toISOString() }).eq("id", currentSub.id)
    if (error) return APIResponse.serverError("Failed to change plan", error)
    return APIResponse.success()
  },

  async pause(userId: string) {
    const supabase = await createClient()
    const { data: currentSub } = await supabase.from("user_subscriptions").select("*").eq("user_id", userId).eq("status", "active").single()
    if (!currentSub) return APIResponse.error("Aucun abonnement actif")

    const { error } = await supabase.from("user_subscriptions").update({ status: "paused", updated_at: new Date().toISOString() }).eq("id", currentSub.id)
    if (error) return APIResponse.serverError("Failed to pause subscription", error)
    return APIResponse.success()
  },

  async resume(userId: string) {
    const supabase = await createClient()
    const { data: currentSub } = await supabase.from("user_subscriptions").select("*").eq("user_id", userId).eq("status", "paused").single()
    if (!currentSub) return APIResponse.error("Aucun abonnement en pause")

    const { error } = await supabase.from("user_subscriptions").update({ status: "active", updated_at: new Date().toISOString() }).eq("id", currentSub.id)
    if (error) return APIResponse.serverError("Failed to resume subscription", error)
    return APIResponse.success()
  },

  async requestPayment(userId: string, body: any) {
    const { plan_id, billing_cycle, request_type, approver_email, approver_phone } = body
    if (!plan_id || !billing_cycle || !request_type) return APIResponse.error("plan_id, billing_cycle et request_type requis")

    const supabase = await createClient()
    const { data: plan } = await supabase.from("subscription_plans").select("*").eq("id", plan_id).single()
    if (!plan) return APIResponse.error("Forfait invalide")

    const amount = billing_cycle === "monthly" ? plan.price_monthly : billing_cycle === "quarterly" ? plan.price_quarterly : billing_cycle === "yearly" ? plan.price_yearly : plan.price_lifetime
    // Approval token is sent to a parent and used as the only credential to
    // authorize a payment request, so it MUST be cryptographically unguessable.
    // 32 random bytes -> 64 hex chars, prefixed for traceability.
    const approvalToken = request_type === "parent_approval" ? `parent_${randomBytes(32).toString("hex")}` : null

    const { data: paymentRequest, error } = await supabase.from("payment_requests").insert({ user_id: userId, plan_id, request_type, amount, billing_cycle, approver_email, approver_phone, approval_token: approvalToken }).select().single()
    if (error) return APIResponse.serverError("Failed to request payment", error)

    return APIResponse.success({ request: paymentRequest, approval_url: approvalToken ? `${process.env.NEXT_PUBLIC_APP_URL}/approve/${approvalToken}` : null })
  },

  async toggleAutoRenew(userId: string, enabled: boolean) {
    const supabase = await createClient()
    const { error } = await supabase.from("user_subscriptions").update({ auto_renew: enabled, cancel_at_period_end: !enabled, updated_at: new Date().toISOString() }).eq("user_id", userId).in("status", ["active", "trial"])
    if (error) return APIResponse.serverError(`Failed to ${enabled ? 'enable' : 'disable'} auto renew`, error)
    return APIResponse.success()
  },

  async inviteFamilyMember(userId: string, body: any) {
    const { email, username } = body
    if (!email && !username) return APIResponse.error("email ou username requis")
    const supabase = await createClient()
    const { data: family } = await supabase.from("family_subscriptions").select("*, members:family_members(count)").eq("owner_id", userId).single()
    if (!family) return APIResponse.error("Tu n'as pas d'abonnement familial")

    const memberCount = family.members?.[0]?.count || 0
    if (memberCount >= family.max_members) return APIResponse.error("Nombre maximum de membres atteint")

    let query = supabase.from("users").select("id, email, username")
    if (email) query = query.eq("email", email)
    else query = query.eq("username", username)

    const { data: invitee } = await query.single()
    if (!invitee) return APIResponse.error("Utilisateur non trouvé", 404)

    const { error } = await supabase.from("family_members").insert({ family_id: family.id, user_id: invitee.id, invited_by: userId, role: "member", status: "pending" })
    if (error) {
      if (error.code === "23505") return APIResponse.error("Cet utilisateur est déjà invité")
      return APIResponse.serverError("Failed to invite member", error)
    }

    await supabase.from("notifications").insert({ user_id: invitee.id, type: "family_invite", title: "Invitation familiale", message: `Tu as été invité à rejoindre l'abonnement famille`, data: { family_id: family.id, inviter_id: userId } })
    return APIResponse.success()
  },

  async respondFamilyInvite(userId: string, body: any) {
    const { family_id, accept } = body
    if (!family_id) return APIResponse.error("family_id requis")
    const supabase = await createClient()

    if (accept) {
      const { error } = await supabase.from("family_members").update({ status: "active", accepted_at: new Date().toISOString() }).eq("family_id", family_id).eq("user_id", userId).eq("status", "pending")
      if (error) return APIResponse.serverError("Failed to accept invite", error)
    } else {
      const { error } = await supabase.from("family_members").delete().eq("family_id", family_id).eq("user_id", userId).eq("status", "pending")
      if (error) return APIResponse.serverError("Failed to refuse invite", error)
    }
    return APIResponse.success()
  },
}
