import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const body = await request.json()

    const { ambassadorId, amount, paymentMethod, paymentDetails } = body

    // Validate input
    if (!ambassadorId || !amount || !paymentMethod || !paymentDetails) {
      return NextResponse.json(
        { success: false, error: "Données manquantes" },
        { status: 400 }
      )
    }

    // Verify ambassador exists.
    // NOTE (#57): this endpoint is not yet session-gated — issue #57 owns
    // adding auth.getUser() + verifying ambassadors.user_id === user.id.
    const { data: ambassador, error: ambassadorError } = await supabase
      .from("ambassadors")
      .select("id")
      .eq("id", ambassadorId)
      .single()

    if (ambassadorError || !ambassador) {
      return NextResponse.json(
        { success: false, error: "Ambassadeur non trouvé" },
        { status: 404 }
      )
    }

    // #29 — available balance is derived from the real ledger:
    // SUM(ambassador_commissions.amount_dh) - SUM(non-failed ambassador_payouts.amount_dh).
    // The ambassadors row no longer stores total_earnings/pending/withdrawn.
    const [{ data: commissionRows }, { data: payoutRows }] = await Promise.all([
      supabase
        .from("ambassador_commissions")
        .select("amount_dh")
        .eq("ambassador_id", ambassadorId),
      supabase
        .from("ambassador_payouts")
        .select("amount_dh, status")
        .eq("ambassador_id", ambassadorId),
    ])

    const totalEarnings = (commissionRows || []).reduce(
      (s, c) => s + (Number(c.amount_dh) || 0),
      0,
    )
    // ambassador_payouts.status ∈ {pending, paid, failed}; pending + paid both
    // consume the balance, failed does not.
    const committedPayouts = (payoutRows || [])
      .filter((p) => p.status === "pending" || p.status === "paid")
      .reduce((s, p) => s + (Number(p.amount_dh) || 0), 0)
    const availableBalance = totalEarnings - committedPayouts

    // Check minimum amount
    const minimumWithdrawal = 100
    if (amount < minimumWithdrawal) {
      return NextResponse.json(
        { success: false, error: `Montant minimum: ${minimumWithdrawal} DH` },
        { status: 400 }
      )
    }

    // Check available balance
    if (amount > availableBalance) {
      return NextResponse.json(
        { success: false, error: "Solde insuffisant" },
        { status: 400 }
      )
    }

    // Create the payout request. ambassador_payouts has no payment_details
    // column; the destination (RIB / phone) is stored in `iban`.
    const { data: withdrawal, error: withdrawalError } = await supabase
      .from("ambassador_payouts")
      .insert({
        ambassador_id: ambassadorId,
        amount_dh: amount,
        method: paymentMethod,
        iban: paymentDetails,
        status: "pending",
      })
      .select()
      .single()

    if (withdrawalError) {
      console.error("Withdrawal creation error:", withdrawalError)
      return NextResponse.json(
        { success: false, error: "Erreur lors de la création de la demande" },
        { status: 500 }
      )
    }

    // No ambassadors-row counters to update: the new pending payout is itself
    // part of the balance computation above on the next read.

    return NextResponse.json({
      success: true,
      data: {
        withdrawalId: withdrawal.id,
        message: "Demande de retrait créée avec succès",
      },
    })
  } catch (error) {
    console.error("Withdrawal API error:", error)
    return NextResponse.json(
      { success: false, error: "Erreur serveur" },
      { status: 500 }
    )
  }
}

export async function GET(request: Request) {
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)
    const ambassadorId = searchParams.get("ambassadorId")

    if (!ambassadorId) {
      return NextResponse.json(
        { success: false, error: "ID ambassadeur requis" },
        { status: 400 }
      )
    }

    const { data: withdrawals, error } = await supabase
      .from("ambassador_payouts")
      .select("*")
      .eq("ambassador_id", ambassadorId)
      .order("created_at", { ascending: false })

    if (error) {
      return NextResponse.json(
        { success: false, error: "Erreur lors de la récupération" },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: withdrawals,
    })
  } catch (error) {
    console.error("Withdrawal GET API error:", error)
    return NextResponse.json(
      { success: false, error: "Erreur serveur" },
      { status: 500 }
    )
  }
}
