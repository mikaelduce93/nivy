import { createClient } from "@/lib/supabase/server"

export interface BudgetCheckResult {
  allowed: boolean
  reason?: string
  requiresApproval: boolean
  budgetInfo: {
    monthlyLimit: number
    perEventLimit: number
    monthlySpent: number
    remaining: number
  } | null
}

/**
 * Check if a booking is within budget limits for a teen
 */
export async function checkTeenBudget(
  teenId: string,
  parentId: string,
  eventPrice: number
): Promise<BudgetCheckResult> {
  const supabase = await createClient()

  // Get budget limits for this teen
  const { data: budgetLimits } = await supabase
    .from("teen_budget_limits")
    .select("*")
    .eq("teen_id", teenId)
    .eq("parent_id", parentId)
    .single()

  // No budget limits set = allowed
  if (!budgetLimits) {
    return {
      allowed: true,
      requiresApproval: false,
      budgetInfo: null,
    }
  }

  // Calculate monthly spending
  const startOfMonth = new Date()
  startOfMonth.setDate(1)
  startOfMonth.setHours(0, 0, 0, 0)

  const { data: monthlyBookings } = await supabase
    .from("bookings")
    .select("total_amount")
    .eq("parent_id", parentId)
    .gte("created_at", startOfMonth.toISOString())
    .in("payment_status", ["paid", "pending"])

  const monthlySpent = (monthlyBookings || []).reduce(
    (sum, b) => sum + (b.total_amount || 0),
    0
  )

  const remaining = budgetLimits.monthly_limit - monthlySpent
  const { monthly_limit, per_event_limit, requires_approval } = budgetLimits

  const budgetInfo = {
    monthlyLimit: monthly_limit,
    perEventLimit: per_event_limit,
    monthlySpent,
    remaining,
  }

  // Check per-event limit
  if (per_event_limit > 0 && eventPrice > per_event_limit) {
    if (requires_approval) {
      return {
        allowed: false,
        reason: `Cette réservation (${eventPrice} DH) dépasse la limite par event (${per_event_limit} DH). Approbation parentale requise.`,
        requiresApproval: true,
        budgetInfo,
      }
    }
    return {
      allowed: false,
      reason: `Cette réservation (${eventPrice} DH) dépasse la limite par event (${per_event_limit} DH).`,
      requiresApproval: false,
      budgetInfo,
    }
  }

  // Check monthly limit
  if (monthly_limit > 0 && monthlySpent + eventPrice > monthly_limit) {
    if (requires_approval) {
      return {
        allowed: false,
        reason: `Cette réservation dépasserait le budget mensuel (${monthlySpent}/${monthly_limit} DH déjà dépensés). Approbation parentale requise.`,
        requiresApproval: true,
        budgetInfo,
      }
    }
    return {
      allowed: false,
      reason: `Budget mensuel dépassé. ${monthlySpent}/${monthly_limit} DH déjà dépensés ce mois.`,
      requiresApproval: false,
      budgetInfo,
    }
  }

  // All checks passed but may still require approval
  if (requires_approval) {
    return {
      allowed: false,
      reason: "Approbation parentale requise pour toutes les réservations.",
      requiresApproval: true,
      budgetInfo,
    }
  }

  return {
    allowed: true,
    requiresApproval: false,
    budgetInfo,
  }
}

/**
 * Get budget summary for a teen
 */
export async function getTeenBudgetSummary(
  teenId: string,
  parentId: string
): Promise<{
  limits: {
    monthly: number
    perEvent: number
    requiresApproval: boolean
  } | null
  spending: {
    thisMonth: number
    thisWeek: number
    lastBookingDate: string | null
    bookingsCount: number
  }
  remaining: number
}> {
  const supabase = await createClient()

  // Get budget limits
  const { data: budgetLimits } = await supabase
    .from("teen_budget_limits")
    .select("monthly_limit, per_event_limit, requires_approval")
    .eq("teen_id", teenId)
    .eq("parent_id", parentId)
    .single()

  // Get this month's spending
  const startOfMonth = new Date()
  startOfMonth.setDate(1)
  startOfMonth.setHours(0, 0, 0, 0)

  const startOfWeek = new Date()
  startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay())
  startOfWeek.setHours(0, 0, 0, 0)

  const { data: monthlyBookings } = await supabase
    .from("bookings")
    .select("total_amount, created_at")
    .eq("parent_id", parentId)
    .gte("created_at", startOfMonth.toISOString())
    .in("payment_status", ["paid", "pending"])
    .order("created_at", { ascending: false })

  const thisMonth = (monthlyBookings || []).reduce(
    (sum, b) => sum + (b.total_amount || 0),
    0
  )

  const thisWeek = (monthlyBookings || [])
    .filter((b) => new Date(b.created_at) >= startOfWeek)
    .reduce((sum, b) => sum + (b.total_amount || 0), 0)

  const lastBookingDate =
    monthlyBookings && monthlyBookings.length > 0
      ? monthlyBookings[0].created_at
      : null

  return {
    limits: budgetLimits
      ? {
          monthly: budgetLimits.monthly_limit,
          perEvent: budgetLimits.per_event_limit,
          requiresApproval: budgetLimits.requires_approval,
        }
      : null,
    spending: {
      thisMonth,
      thisWeek,
      lastBookingDate,
      bookingsCount: (monthlyBookings || []).length,
    },
    remaining: budgetLimits
      ? Math.max(0, budgetLimits.monthly_limit - thisMonth)
      : Infinity,
  }
}
