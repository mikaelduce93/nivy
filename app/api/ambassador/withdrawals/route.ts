import { createClient } from "@/lib/supabase/server"
import { createServiceRoleClient } from "@/lib/supabase/service-role"
import { NextResponse } from "next/server"

/**
 * #57 — session-gated ambassador withdrawals. The ambassador is resolved from
 * the authenticated session (ambassadors.user_id === auth user, status
 * 'approved'); any client-supplied ambassadorId is ignored. Money reads/writes
 * use the service-role client with the SESSION-derived ambassador.id (no IDOR).
 */
async function resolveSessionAmbassador() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: "Non authentifié", status: 401 as const, id: null }

  // #57 — the ambassadors.status enum is {pending, active, suspended, rejected}
  // (verified live); 'active' is the approved/usable state. The issue's
  // 'approved' value does not exist on this table.
  const { data: ambassador } = await supabase
    .from("ambassadors")
    .select("id")
    .eq("user_id", user.id)
    .eq("status", "active")
    .maybeSingle()

  if (!ambassador) return { error: "Ambassadeur non autorisé", status: 403 as const, id: null }
  return { error: null, status: 200 as const, id: ambassador.id as string }
}

export async function POST(request: Request) {
  try {
    const session = await resolveSessionAmbassador()
    if (!session.id) {
      return NextResponse.json({ success: false, error: session.error }, { status: session.status })
    }
    const ambassadorId = session.id

    const body = await request.json()
    // #57 — ambassadorId is NEVER read from the client; it comes from the session.
    const { amount, paymentMethod, paymentDetails } = body

    // Validate input
    if (!amount || !paymentMethod || !paymentDetails) {
      return NextResponse.json(
        { success: false, error: "Données manquantes" },
        { status: 400 }
      )
    }

    // #29 — balance from the real ledger; #57 — money ops via service-role with
    // the session-derived ambassador id.
    const sr = createServiceRoleClient()
    const [{ data: commissionRows }, { data: payoutRows }] = await Promise.all([
      sr
        .from("ambassador_commissions")
        .select("amount_dh")
        .eq("ambassador_id", ambassadorId),
      sr
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

    // Check minimum amount — canon partner-ecosystem.locked.md:524 (#353).
    const minimumWithdrawal = 500
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
    const { data: withdrawal, error: withdrawalError } = await sr
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

export async function GET() {
  try {
    // #57 — only the session ambassador's history; any client ambassadorId is
    // ignored (was an IDOR leaking others' payout details).
    const session = await resolveSessionAmbassador()
    if (!session.id) {
      return NextResponse.json({ success: false, error: session.error }, { status: session.status })
    }

    const sr = createServiceRoleClient()
    const { data: withdrawals, error } = await sr
      .from("ambassador_payouts")
      .select("*")
      .eq("ambassador_id", session.id)
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
