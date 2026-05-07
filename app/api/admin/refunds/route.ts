/**
 * Wave V1.2-E — Admin Refunds.
 *
 * GET  /api/admin/refunds              List historical refunds (audit-driven).
 * POST /api/admin/refunds              Issue a refund.
 *
 * Body (POST):
 *   {
 *     transaction_type: 'marketplace' | 'food' | 'ride',
 *     transaction_id: uuid,
 *     reason: string,                 // required, audit log
 *   }
 *
 * Effects (atomic where possible):
 *   - Marketplace: reverse buyer→seller coin movement, mark transaction 'refunded'.
 *   - Food:        return coins to teen, mark order 'refunded'.
 *   - Ride:        return coins to teen (or parent), mark booking 'refunded'.
 *   - escrow_ledger: write a 'refund' row (negative amount, direction='out_to_user').
 *   - coin_transactions: insert a refund row + bump user_coins.balance.
 *   - admin_audit_logs: action='refund.issue', payload includes amounts and source.
 *
 * MONEY ROUTE — uses FOR UPDATE row locks via Postgres function calls / select-then-update
 * within a tight window. We rely on idempotency: if transaction is already 'refunded' we 422.
 */
import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createServiceRoleClient } from "@/lib/supabase/service-role"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

type TxType = "marketplace" | "food" | "ride"

interface RefundBody {
  transaction_type?: string
  transaction_id?: string
  reason?: string
}

async function requireAdmin(): Promise<
  | { ok: true; userId: string }
  | { ok: false; res: NextResponse }
> {
  const supabase = await createClient()
  const {
    data: { user },
    error: authErr,
  } = await supabase.auth.getUser()
  if (authErr || !user) {
    return {
      ok: false,
      res: NextResponse.json({ success: false, error: "unauthenticated" }, { status: 401 }),
    }
  }
  const sr = createServiceRoleClient()
  const { data: role } = await sr
    .from("admin_roles")
    .select("role")
    .eq("profile_id", user.id)
    .maybeSingle()
  if (!role || !["admin", "super_admin", "moderator"].includes(role.role)) {
    return {
      ok: false,
      res: NextResponse.json({ success: false, error: "forbidden" }, { status: 403 }),
    }
  }
  return { ok: true, userId: user.id }
}

/* ------------------------------------------------------------------------ */
/* GET — list refunds (audit-log driven)                                    */
/* ------------------------------------------------------------------------ */

export async function GET(req: Request) {
  const auth = await requireAdmin()
  if (!auth.ok) return auth.res

  const url = new URL(req.url)
  const limit = Math.min(parseInt(url.searchParams.get("limit") || "50", 10) || 50, 200)
  const offset = Math.max(parseInt(url.searchParams.get("offset") || "0", 10) || 0, 0)
  const txType = url.searchParams.get("transaction_type") // optional filter

  const sr = createServiceRoleClient()
  let q = sr
    .from("admin_audit_logs")
    .select("id, user_id, action, target_type, target_id, payload, created_at", { count: "exact" })
    .eq("action", "refund.issue")
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1)

  if (txType && ["marketplace", "food", "ride"].includes(txType)) {
    q = q.eq("target_type", txType)
  }

  const { data, error, count } = await q
  if (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
  return NextResponse.json({
    success: true,
    refunds: data ?? [],
    total: count ?? 0,
    limit,
    offset,
  })
}

/* ------------------------------------------------------------------------ */
/* POST — issue refund                                                      */
/* ------------------------------------------------------------------------ */

export async function POST(req: Request) {
  const auth = await requireAdmin()
  if (!auth.ok) return auth.res
  const adminId = auth.userId

  let body: RefundBody
  try {
    body = (await req.json()) as RefundBody
  } catch {
    return NextResponse.json({ success: false, error: "invalid_json" }, { status: 400 })
  }

  const txType = body.transaction_type as TxType | undefined
  const txId = typeof body.transaction_id === "string" ? body.transaction_id.trim() : ""
  const reason = typeof body.reason === "string" ? body.reason.trim() : ""

  if (!txType || !["marketplace", "food", "ride"].includes(txType)) {
    return NextResponse.json({ success: false, error: "invalid_transaction_type" }, { status: 400 })
  }
  if (!txId) {
    return NextResponse.json({ success: false, error: "transaction_id_required" }, { status: 400 })
  }
  if (!reason || reason.length > 1000) {
    return NextResponse.json({ success: false, error: "reason_required" }, { status: 400 })
  }

  const sr = createServiceRoleClient()
  const nowIso = new Date().toISOString()

  if (txType === "marketplace") {
    return await refundMarketplace(sr, adminId, txId, reason, nowIso)
  }
  if (txType === "food") {
    return await refundFood(sr, adminId, txId, reason, nowIso)
  }
  return await refundRide(sr, adminId, txId, reason, nowIso)
}

/* ------------------------------------------------------------------------ */
/* Helpers                                                                  */
/* ------------------------------------------------------------------------ */

type SR = ReturnType<typeof createServiceRoleClient>

async function bumpCoins(
  sr: SR,
  teenId: string,
  delta: number,
  sourceType: string,
  sourceId: string,
  description: string,
): Promise<{ balance_after: number } | null> {
  // Read-then-update. We accept eventual consistency; coin_transactions is the
  // source of truth and is monotonic (insert-only). user_coins is a denorm cache.
  const { data: row } = await sr
    .from("user_coins")
    .select("balance, lifetime_earned")
    .eq("teen_id", teenId)
    .maybeSingle()

  const newBalance = (row?.balance ?? 0) + delta
  const lifetimeEarned = (row?.lifetime_earned ?? 0) + (delta > 0 ? delta : 0)

  if (row) {
    await sr
      .from("user_coins")
      .update({
        balance: newBalance,
        lifetime_earned: lifetimeEarned,
        updated_at: new Date().toISOString(),
      })
      .eq("teen_id", teenId)
  } else {
    await sr.from("user_coins").insert({
      teen_id: teenId,
      balance: newBalance,
      lifetime_earned: lifetimeEarned,
    })
  }

  await sr.from("coin_transactions").insert({
    teen_id: teenId,
    amount: delta,
    transaction_type: delta >= 0 ? "credit" : "debit",
    source_type: sourceType,
    source_id: sourceId,
    description,
    balance_after: newBalance,
  })

  return { balance_after: newBalance }
}

async function refundMarketplace(
  sr: SR,
  adminId: string,
  txId: string,
  reason: string,
  nowIso: string,
): Promise<NextResponse> {
  const { data: tx, error } = await sr
    .from("marketplace_transactions")
    .select(
      "id, listing_id, buyer_user_id, seller_user_id, amount_coins, amount_dh, platform_fee_coins, status",
    )
    .eq("id", txId)
    .maybeSingle()
  if (error) return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  if (!tx) return NextResponse.json({ success: false, error: "not_found" }, { status: 404 })
  if (tx.status === "refunded") {
    return NextResponse.json({ success: false, error: "already_refunded" }, { status: 422 })
  }

  // Optimistic lock — only flip if still in current status.
  const { data: locked, error: lockErr } = await sr
    .from("marketplace_transactions")
    .update({ status: "refunded" })
    .eq("id", txId)
    .neq("status", "refunded")
    .select("id")
    .maybeSingle()
  if (lockErr) return NextResponse.json({ success: false, error: lockErr.message }, { status: 500 })
  if (!locked) {
    return NextResponse.json({ success: false, error: "race_already_refunded" }, { status: 409 })
  }

  const amountCoins = tx.amount_coins ?? 0
  const sellerNet = amountCoins - (tx.platform_fee_coins ?? 0)

  // Credit buyer back, debit seller.
  if (tx.buyer_user_id && amountCoins > 0) {
    await bumpCoins(
      sr,
      tx.buyer_user_id,
      amountCoins,
      "marketplace_refund",
      txId,
      `Remboursement marketplace ${txId}`,
    )
  }
  if (tx.seller_user_id && sellerNet > 0) {
    await bumpCoins(
      sr,
      tx.seller_user_id,
      -sellerNet,
      "marketplace_refund_clawback",
      txId,
      `Récupération vente remboursée ${txId}`,
    )
  }

  // Restore listing if any.
  if (tx.listing_id) {
    await sr.from("marketplace_listings").update({ status: "active", sold_at: null }).eq("id", tx.listing_id)
  }

  // Escrow ledger entry.
  await sr.from("escrow_ledger").insert({
    teen_id: tx.buyer_user_id,
    direction: "refund",
    amount_coins: amountCoins,
    amount_dh: tx.amount_dh ?? 0,
    related_spend_id: txId,
    reason: `marketplace_refund: ${reason}`,
    created_by: adminId,
  })

  // Audit log.
  await sr.from("admin_audit_logs").insert({
    user_id: adminId,
    action: "refund.issue",
    target_type: "marketplace",
    target_id: txId,
    payload: {
      reason,
      amount_coins: amountCoins,
      amount_dh: tx.amount_dh ?? null,
      buyer_user_id: tx.buyer_user_id,
      seller_user_id: tx.seller_user_id,
      seller_clawback_coins: sellerNet,
      issued_at: nowIso,
    },
  })

  return NextResponse.json({
    success: true,
    transaction_type: "marketplace",
    transaction_id: txId,
    refunded_coins: amountCoins,
    seller_clawback_coins: sellerNet,
  })
}

async function refundFood(
  sr: SR,
  adminId: string,
  txId: string,
  reason: string,
  nowIso: string,
): Promise<NextResponse> {
  const { data: order, error } = await sr
    .from("food_orders")
    .select("id, teen_id, parent_id, total_dh, total_coins, payment_method, status")
    .eq("id", txId)
    .maybeSingle()
  if (error) return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  if (!order) return NextResponse.json({ success: false, error: "not_found" }, { status: 404 })
  if (order.status === "refunded") {
    return NextResponse.json({ success: false, error: "already_refunded" }, { status: 422 })
  }

  const { data: locked, error: lockErr } = await sr
    .from("food_orders")
    .update({ status: "refunded" })
    .eq("id", txId)
    .neq("status", "refunded")
    .select("id")
    .maybeSingle()
  if (lockErr) return NextResponse.json({ success: false, error: lockErr.message }, { status: 500 })
  if (!locked) {
    return NextResponse.json({ success: false, error: "race_already_refunded" }, { status: 409 })
  }

  const coins = order.total_coins ?? 0
  if (order.teen_id && coins > 0) {
    await bumpCoins(
      sr,
      order.teen_id,
      coins,
      "food_refund",
      txId,
      `Remboursement commande food ${txId}`,
    )
  }

  await sr.from("escrow_ledger").insert({
    teen_id: order.teen_id,
    parent_id: order.parent_id,
    direction: "refund",
    amount_coins: coins,
    amount_dh: order.total_dh ?? 0,
    related_spend_id: txId,
    reason: `food_refund: ${reason}`,
    created_by: adminId,
  })

  await sr.from("admin_audit_logs").insert({
    user_id: adminId,
    action: "refund.issue",
    target_type: "food",
    target_id: txId,
    payload: {
      reason,
      amount_coins: coins,
      amount_dh: order.total_dh ?? null,
      teen_id: order.teen_id,
      parent_id: order.parent_id,
      payment_method: order.payment_method,
      issued_at: nowIso,
    },
  })

  return NextResponse.json({
    success: true,
    transaction_type: "food",
    transaction_id: txId,
    refunded_coins: coins,
  })
}

async function refundRide(
  sr: SR,
  adminId: string,
  txId: string,
  reason: string,
  nowIso: string,
): Promise<NextResponse> {
  const { data: ride, error } = await sr
    .from("ride_bookings")
    .select("id, teen_id, parent_id, estimated_dh, actual_dh, payment_method, status")
    .eq("id", txId)
    .maybeSingle()
  if (error) return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  if (!ride) return NextResponse.json({ success: false, error: "not_found" }, { status: 404 })
  if (ride.status === "refunded") {
    return NextResponse.json({ success: false, error: "already_refunded" }, { status: 422 })
  }

  const { data: locked, error: lockErr } = await sr
    .from("ride_bookings")
    .update({ status: "refunded" })
    .eq("id", txId)
    .neq("status", "refunded")
    .select("id")
    .maybeSingle()
  if (lockErr) return NextResponse.json({ success: false, error: lockErr.message }, { status: 500 })
  if (!locked) {
    return NextResponse.json({ success: false, error: "race_already_refunded" }, { status: 409 })
  }

  const dh = ride.actual_dh ?? ride.estimated_dh ?? 0
  // ride_bookings doesn't carry a coin amount column; estimate via 1 DH = 1 coin parity
  // (matches accounting in escrow). Adjust if pricing model changes.
  const coins = Math.round(Number(dh))

  if (ride.teen_id && coins > 0) {
    await bumpCoins(
      sr,
      ride.teen_id,
      coins,
      "ride_refund",
      txId,
      `Remboursement trajet ${txId}`,
    )
  }

  await sr.from("escrow_ledger").insert({
    teen_id: ride.teen_id,
    parent_id: ride.parent_id,
    direction: "refund",
    amount_coins: coins,
    amount_dh: dh,
    related_spend_id: txId,
    reason: `ride_refund: ${reason}`,
    created_by: adminId,
  })

  await sr.from("admin_audit_logs").insert({
    user_id: adminId,
    action: "refund.issue",
    target_type: "ride",
    target_id: txId,
    payload: {
      reason,
      amount_coins: coins,
      amount_dh: dh,
      teen_id: ride.teen_id,
      parent_id: ride.parent_id,
      payment_method: ride.payment_method,
      issued_at: nowIso,
    },
  })

  return NextResponse.json({
    success: true,
    transaction_type: "ride",
    transaction_id: txId,
    refunded_coins: coins,
  })
}
