/**
 * POST /api/teen/spend — W3.1 canonical coin spend endpoint.
 *
 * Per docs/vision/PRODUCT_WHITEPAPER.md §5:
 *   Body: { rewardId?: uuid, offerId?: uuid, amountCoins: number, partnerId?: uuid }
 *
 * Branching:
 *   1. Look up teen's user_coins.balance + teen_budget_limits.
 *   2. If mode='validation' OR amountCoins > max_per_transaction_coins:
 *        → enqueue parental_approvals(action_type='purchase_above_ceiling', status='pending')
 *        → return { pending_approval_id, status: 'pending' }
 *   3. Else (autonomous + within ceiling):
 *        → atomic via RPC `spend_teen_coins`: debit balance,
 *          insert coin_transactions/escrow_ledger/partner_transactions,
 *          call add_xp_to_user (cashback in same DB tx — invariant §29.3).
 *        → return { status: 'succeeded', new_balance, xp_earned }
 *
 * Invariants (§29):
 *   (1) No XP↔coins conversion path.
 *   (2) Every coin debit has a paired coin_transactions row.
 *   (3) Every successful coin debit triggers XP cashback in the same tx.
 *  (15) Money writes go through service_role.
 */

import { NextResponse } from "next/server"
import { getUserRole } from "@/lib/auth/get-user-role"
import { createServiceRoleClient } from "@/lib/supabase/service-role"
import { recordSignalAsync } from "@/lib/analytics/signals"

interface SpendBody {
  rewardId?: string
  offerId?: string
  partnerId?: string
  amountCoins?: number
}

export async function POST(request: Request) {
  try {
    const userInfo = await getUserRole()
    if (!userInfo || userInfo.role !== "teen") {
      return NextResponse.json({ success: false, error: "Non autorisé" }, { status: 401 })
    }

    const teenId = userInfo.teenData?.id || userInfo.profileId
    if (!teenId) {
      return NextResponse.json({ success: false, error: "Profil teen introuvable" }, { status: 400 })
    }

    const body = (await request.json()) as SpendBody
    const amountCoins = Number(body.amountCoins)
    if (!Number.isFinite(amountCoins) || amountCoins <= 0) {
      return NextResponse.json(
        { success: false, error: "amountCoins requis (entier positif)" },
        { status: 400 }
      )
    }

    const admin = createServiceRoleClient()

    // Read the wallet balance.
    const { data: wallet } = await admin
      .from("user_coins")
      .select("balance")
      .eq("teen_id", teenId)
      .maybeSingle()

    const balance = wallet?.balance ?? 0
    if (balance < amountCoins) {
      return NextResponse.json(
        { success: false, error: "insufficient_balance", balance },
        { status: 400 }
      )
    }

    // Read budget limits / mode (per-teen). Default to 'validation' mode if no row
    // (whitepaper §27 default-12: "Validation mode for new families").
    const { data: limits } = await admin
      .from("teen_budget_limits")
      .select("mode, max_per_transaction_coins, parent_id")
      .eq("teen_id", teenId)
      .limit(1)
      .maybeSingle()

    const mode = (limits?.mode as string | undefined) ?? "validation"
    const maxPerTx = limits?.max_per_transaction_coins ?? null

    const exceedsCeiling = maxPerTx !== null && amountCoins > maxPerTx
    const requiresApproval = mode === "validation" || exceedsCeiling

    if (requiresApproval) {
      // Resolve parent_id: from limits row, else from parent_teen_links.
      let parentId = limits?.parent_id as string | null | undefined
      if (!parentId) {
        const { data: link } = await admin
          .from("parent_teen_links")
          .select("parent_id")
          .eq("teen_id", teenId)
          .order("created_at", { ascending: true })
          .limit(1)
          .maybeSingle()
        parentId = link?.parent_id || null
      }

      if (!parentId) {
        return NextResponse.json(
          { success: false, error: "no_parent_linked" },
          { status: 400 }
        )
      }

      const { data: approval, error: approvalError } = await admin
        .from("parental_approvals")
        .insert({
          parent_id: parentId,
          teen_id: teenId,
          action_type: "purchase_above_ceiling",
          resource_type: body.rewardId ? "reward" : body.offerId ? "offer" : "coin_spend",
          resource_id: body.rewardId || body.offerId || null,
          amount: amountCoins,
          details: {
            amount_coins: amountCoins,
            partner_id: body.partnerId || null,
            reward_id: body.rewardId || null,
            offer_id: body.offerId || null,
            reason: exceedsCeiling ? "exceeds_ceiling" : "validation_mode",
          },
          status: "pending",
        })
        .select("id")
        .single()

      if (approvalError) {
        console.error("[spend] parental_approval insert failed:", approvalError)
        return NextResponse.json(
          { success: false, error: approvalError.message },
          { status: 500 }
        )
      }

      // Wave 1.2 — capture click signal on partner_offer/reward (best-effort).
      const targetId = body.offerId || body.rewardId || null
      if (targetId) {
        recordSignalAsync({
          teenId,
          signalType: "click",
          targetType: body.offerId ? "partner_offer" : "reward",
          targetId,
          metadata: {
            amount_coins: amountCoins,
            partner_id: body.partnerId || null,
            outcome: "pending_approval",
          },
        })
      }

      return NextResponse.json({
        success: true,
        status: "pending",
        pending_approval_id: approval.id,
      })
    }

    // Autonomous path — atomic RPC.
    const { data, error } = await admin.rpc("spend_teen_coins", {
      p_teen_id: teenId,
      p_amount_coins: amountCoins,
      p_partner_id: body.partnerId || null,
      p_reward_id: body.rewardId || null,
    })

    if (error) {
      console.error("[spend] RPC error:", error)
      return NextResponse.json(
        { success: false, error: error.message || "Erreur serveur" },
        { status: 500 }
      )
    }

    if (!data?.success) {
      return NextResponse.json(
        { success: false, error: data?.error || "Dépense impossible", details: data },
        { status: 400 }
      )
    }

    // Wave 1.2 — capture click signal on partner_offer/reward (best-effort).
    const targetId = body.offerId || body.rewardId || null
    if (targetId) {
      recordSignalAsync({
        teenId,
        signalType: "click",
        targetType: body.offerId ? "partner_offer" : "reward",
        targetId,
        metadata: {
          amount_coins: amountCoins,
          partner_id: body.partnerId || null,
          outcome: "succeeded",
        },
      })
    }

    return NextResponse.json({
      success: true,
      status: "succeeded",
      new_balance: data.new_balance,
      xp_earned: data.xp_earned,
    })
  } catch (error) {
    console.error("[spend] unexpected error:", error)
    return NextResponse.json({ success: false, error: "Erreur serveur" }, { status: 500 })
  }
}
