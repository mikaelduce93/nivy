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

    // Verify ambassador exists and get balance
    const { data: ambassador, error: ambassadorError } = await supabase
      .from("ambassadors")
      .select("id, total_earnings, pending_withdrawals, withdrawn_amount")
      .eq("id", ambassadorId)
      .single()

    if (ambassadorError || !ambassador) {
      return NextResponse.json(
        { success: false, error: "Ambassadeur non trouvé" },
        { status: 404 }
      )
    }

    // Calculate available balance
    const availableBalance =
      (ambassador.total_earnings || 0) -
      (ambassador.pending_withdrawals || 0) -
      (ambassador.withdrawn_amount || 0)

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

    // Create withdrawal request
    const { data: withdrawal, error: withdrawalError } = await supabase
      .from("ambassador_withdrawals")
      .insert({
        ambassador_id: ambassadorId,
        amount: amount,
        payment_method: paymentMethod,
        payment_details: paymentDetails,
        status: "pending",
        created_at: new Date().toISOString(),
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

    // Update ambassador pending withdrawals
    const { error: updateError } = await supabase
      .from("ambassadors")
      .update({
        pending_withdrawals: (ambassador.pending_withdrawals || 0) + amount,
      })
      .eq("id", ambassadorId)

    if (updateError) {
      console.error("Ambassador update error:", updateError)
      // Rollback withdrawal
      await supabase
        .from("ambassador_withdrawals")
        .delete()
        .eq("id", withdrawal.id)

      return NextResponse.json(
        { success: false, error: "Erreur lors de la mise à jour du solde" },
        { status: 500 }
      )
    }

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
      .from("ambassador_withdrawals")
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
