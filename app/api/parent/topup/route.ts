/**
 * POST /api/parent/topup — W3.1 canonical top-up endpoint.
 *
 * Per docs/vision/PRODUCT_WHITEPAPER.md §5:
 *   - Locked rate: 1 DH = 100 coins.
 *   - Pipeline (atomic via RPC `top_up_teen`):
 *       payment_transactions (pending → succeeded, psp_provider='manual')
 *     + escrow_ledger (direction='top_up', related_payment_id)
 *     + user_coins.balance += amount_coins (upsert)
 *     + coin_transactions (transaction_type='topup')
 *
 * Invariants enforced (§29):
 *   (4) Coin top-ups never bypass payment_transactions + escrow_ledger.
 *   (15) Money-related writes go through service_role.
 *
 * The PSP integration (Cash Plus / Stripe / CMI) is mocked at status='succeeded'
 * for the MVP. When a real PSP webhook is wired, it should call the same RPC
 * after verifying the charge.
 */

import { NextResponse } from "next/server"
import { getUserRole } from "@/lib/auth/get-user-role"
import { createClient } from "@/lib/supabase/server"
import { createServiceRoleClient } from "@/lib/supabase/service-role"

interface TopupBody {
  teenId?: string
  amount_dh?: number
  // Backward-compat with the old contract from the legacy mock UI.
  amountDh?: number
  packageId?: string
}

export async function POST(request: Request) {
  try {
    const userInfo = await getUserRole()
    if (!userInfo || userInfo.role !== "parent") {
      return NextResponse.json({ success: false, error: "Non autorisé" }, { status: 401 })
    }

    const body = (await request.json()) as TopupBody
    const teenId = body.teenId
    const amountDh = Number(body.amount_dh ?? body.amountDh)

    if (!teenId || !Number.isFinite(amountDh) || amountDh <= 0) {
      return NextResponse.json(
        { success: false, error: "Données manquantes (teenId, amount_dh)" },
        { status: 400 }
      )
    }

    const supabase = await createClient()
    const parentId = userInfo.profileId

    // Verify parent-teen link.
    const { data: link } = await supabase
      .from("parent_teen_links")
      .select("id")
      .eq("parent_id", parentId)
      .eq("teen_id", teenId)
      .limit(1)
      .maybeSingle()

    if (!link) {
      return NextResponse.json(
        { success: false, error: "Teen non lié à ce compte parent" },
        { status: 400 }
      )
    }

    // E-signature gate (§10 invariant).
    const { data: signature } = await supabase
      .from("e_signatures")
      .select("id")
      .eq("parent_id", parentId)
      .eq("terms_accepted", true)
      .limit(1)
      .maybeSingle()

    if (!signature) {
      return NextResponse.json(
        {
          success: false,
          error: "Autorisation parentale requise",
          requiresSignature: true,
        },
        { status: 403 }
      )
    }

    // Atomic pipeline via service_role RPC (§29.15 — money is server-side only).
    const admin = createServiceRoleClient()
    const { data, error } = await admin.rpc("top_up_teen", {
      p_parent_id: parentId,
      p_teen_id: teenId,
      p_amount_dh: amountDh,
    })

    if (error) {
      console.error("[topup] RPC error:", error)
      return NextResponse.json(
        { success: false, error: error.message || "Erreur serveur" },
        { status: 500 }
      )
    }

    if (!data?.success) {
      return NextResponse.json(
        { success: false, error: data?.error || "Recharge impossible" },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      message: "Recharge effectuée avec succès",
      data: {
        paymentId: data.payment_id,
        amountCoins: data.amount_coins,
        newBalance: data.new_balance,
      },
    })
  } catch (error) {
    console.error("[topup] unexpected error:", error)
    return NextResponse.json(
      { success: false, error: "Erreur serveur" },
      { status: 500 }
    )
  }
}
