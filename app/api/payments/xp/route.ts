import { createClient } from "@/lib/supabase/server"
import { NextRequest, NextResponse } from "next/server"
import {
  xpToDH,
  calculateMaxXPUsable,
  MIN_XP_FOR_PAYMENT,
  XP_TO_DH_RATE,
  MAX_XP_PAYMENT_PERCENTAGE,
} from "@/lib/xp-payment"
import { getServerAppConfig } from "@/lib/config/app-config"

// ============================================================================
// GET: Récupérer les stats XP et transactions
// ============================================================================
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const type = searchParams.get("type") || "stats"

    // Get teen profile
    const { data: teen } = await supabase
      .from("teens")
      .select("id")
      .eq("user_id", user.id)
      .single()

    const teenId = teen?.id || user.id

    switch (type) {
      // Stats XP principales
      case "stats":
      default: {
        // Get XP balance
        const { data: userXP } = await supabase
          .from("user_xp")
          .select("total_xp, lifetime_earned, lifetime_spent")
          .eq("teen_id", teenId)
          .single()

        // Calculate total savings from XP payments
        const { data: xpPayments } = await supabase
          .from("xp_transactions")
          .select("amount")
          .eq("teen_id", teenId)
          .eq("type", "payment")

        const totalSpent = xpPayments?.reduce((sum, tx) => sum + Math.abs(tx.amount), 0) || 0
        const totalSavings = xpToDH(totalSpent)

        return NextResponse.json({
          total_xp: userXP?.total_xp || 0,
          xp_value: xpToDH(userXP?.total_xp || 0),
          lifetime_earned: userXP?.lifetime_earned || 0,
          lifetime_spent: userXP?.lifetime_spent || 0,
          xp_rate: XP_TO_DH_RATE,
          max_percentage: MAX_XP_PAYMENT_PERCENTAGE,
          total_savings: totalSavings,
        })
      }

      // Historique des transactions XP
      case "transactions": {
        const limit = parseInt(searchParams.get("limit") || "50")
        const offset = parseInt(searchParams.get("offset") || "0")

        const { data: transactions, error } = await supabase
          .from("xp_transactions")
          .select("*")
          .eq("teen_id", teenId)
          .order("created_at", { ascending: false })
          .range(offset, offset + limit - 1)

        if (error) throw error

        return NextResponse.json({
          transactions: transactions || [],
          has_more: (transactions?.length || 0) === limit,
        })
      }

      // Résumé mensuel
      case "monthly": {
        const { data: monthlyStats } = await supabase
          .from("xp_transactions")
          .select("amount, type, created_at")
          .eq("teen_id", teenId)
          .gte("created_at", new Date(new Date().setMonth(new Date().getMonth() - 6)).toISOString())
          .order("created_at", { ascending: true })

        // Group by month
        const monthlyData: Record<string, { earned: number; spent: number }> = {}
        monthlyStats?.forEach((tx) => {
          const month = new Date(tx.created_at).toLocaleDateString("fr-FR", { month: "short", year: "numeric" })
          if (!monthlyData[month]) {
            monthlyData[month] = { earned: 0, spent: 0 }
          }
          if (tx.amount > 0) {
            monthlyData[month].earned += tx.amount
          } else {
            monthlyData[month].spent += Math.abs(tx.amount)
          }
        })

        return NextResponse.json({
          monthly: Object.entries(monthlyData).map(([month, data]) => ({
            month,
            earned: data.earned,
            spent: data.spent,
            net: data.earned - data.spent,
          })),
        })
      }
    }
  } catch (error) {
    console.error("XP stats error:", error)
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  }
}

// ============================================================================
// POST: Traiter un paiement XP
// ============================================================================
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Verify authentication
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json(
        { error: "Non authentifié" },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { bookingId, xpAmount, teenId } = body

    if (!bookingId || !xpAmount || !teenId) {
      return NextResponse.json(
        { error: "Paramètres manquants" },
        { status: 400 }
      )
    }

    // Get teen's XP balance
    const { data: userXP, error: xpError } = await supabase
      .from("user_xp")
      .select("total_xp")
      .eq("teen_id", teenId)
      .single()

    if (xpError || !userXP) {
      return NextResponse.json(
        { error: "Impossible de récupérer le solde XP" },
        { status: 400 }
      )
    }

    // Validate XP amount
    if (userXP.total_xp < xpAmount) {
      return NextResponse.json(
        { error: "Solde XP insuffisant" },
        { status: 400 }
      )
    }

    if (xpAmount < MIN_XP_FOR_PAYMENT) {
      return NextResponse.json(
        { error: `Minimum ${MIN_XP_FOR_PAYMENT} XP requis` },
        { status: 400 }
      )
    }

    // Get booking details
    const { data: booking, error: bookingError } = await supabase
      .from("bookings")
      .select("*, booking_tickets(child_id)")
      .eq("id", bookingId)
      .single()

    if (bookingError || !booking) {
      return NextResponse.json(
        { error: "Réservation introuvable" },
        { status: 404 }
      )
    }

    // Verify the teen is associated with this booking
    const bookingTeenIds = booking.booking_tickets?.map((t: any) => t.child_id) || []
    if (!bookingTeenIds.includes(teenId)) {
      return NextResponse.json(
        { error: "Cet enfant n'est pas associé à cette réservation" },
        { status: 403 }
      )
    }

    // Validate max XP usable
    const maxXPUsable = calculateMaxXPUsable(booking.total_amount, userXP.total_xp)
    if (xpAmount > maxXPUsable) {
      return NextResponse.json(
        { error: `Maximum ${maxXPUsable} XP utilisables pour cette réservation` },
        { status: 400 }
      )
    }

    // Calculate XP value
    const xpValue = xpToDH(xpAmount)
    const remainingAmount = booking.total_amount - xpValue

    // Start transaction: deduct XP and update booking
    // Deduct XP from user
    const { error: deductError } = await supabase
      .from("user_xp")
      .update({
        total_xp: userXP.total_xp - xpAmount,
      })
      .eq("teen_id", teenId)

    if (deductError) {
      return NextResponse.json(
        { error: "Erreur lors de la déduction des XP" },
        { status: 500 }
      )
    }

    // Record XP transaction
    await supabase.from("xp_transactions").insert({
      teen_id: teenId,
      amount: -xpAmount,
      type: "payment",
      description: `Paiement réservation ${booking.booking_reference}`,
      reference_type: "booking",
      reference_id: bookingId,
    })

    // Update booking with XP payment info
    const newPaymentStatus = remainingAmount === 0 ? "paid" : "partial_xp"
    const newStatus = remainingAmount === 0 ? "confirmed" : "pending_payment"

    const { error: bookingUpdateError } = await supabase
      .from("bookings")
      .update({
        xp_used: xpAmount,
        xp_value: xpValue,
        amount_after_xp: remainingAmount,
        payment_status: newPaymentStatus,
        status: newStatus,
        ...(remainingAmount === 0 && {
          paid_at: new Date().toISOString(),
        }),
      })
      .eq("id", bookingId)

    if (bookingUpdateError) {
      // Rollback XP deduction
      await supabase
        .from("user_xp")
        .update({
          total_xp: userXP.total_xp,
        })
        .eq("teen_id", teenId)

      return NextResponse.json(
        { error: "Erreur lors de la mise à jour de la réservation" },
        { status: 500 }
      )
    }

    // If fully paid with XP, send confirmation email
    if (remainingAmount === 0) {
      // Fetch complete booking info for email
      const { data: fullBooking } = await supabase
        .from("bookings")
        .select(`
          *,
          events (*),
          profiles:parent_id (full_name, email)
        `)
        .eq("id", bookingId)
        .single()

      if (fullBooking?.profiles?.email) {
        // Send confirmation email (async)
        sendXPPaymentConfirmation(fullBooking).catch(console.error)
      }
    }

    return NextResponse.json({
      success: true,
      xpUsed: xpAmount,
      xpValue,
      remainingAmount,
      newBalance: userXP.total_xp - xpAmount,
      isFullyPaid: remainingAmount === 0,
    })
  } catch (error) {
    console.error("XP payment error:", error)
    return NextResponse.json(
      { error: "Erreur serveur" },
      { status: 500 }
    )
  }
}

async function sendXPPaymentConfirmation(booking: any) {
  try {
    // Vérifier si Resend est configuré
    if (!process.env.RESEND_API_KEY) {
      console.warn("[Resend] Not configured - XP payment confirmation email not sent")
      return
    }

    const { Resend } = await import("resend")
    const resend = new Resend(process.env.RESEND_API_KEY)

    await resend.emails.send({
      from: getServerAppConfig().emailFrom,
      to: booking.profiles.email,
      subject: `Paiement XP confirmé - ${booking.booking_reference}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #09090b; color: #fff; padding: 40px 20px; }
            .container { max-width: 600px; margin: 0 auto; background: #18181b; border-radius: 16px; padding: 40px; }
            h1 { color: #a855f7; margin: 0 0 20px; font-size: 24px; }
            p { color: #a1a1aa; line-height: 1.6; margin: 0 0 16px; }
            .highlight { color: #fff; font-weight: bold; }
            .xp-badge { display: inline-flex; align-items: center; gap: 8px; background: linear-gradient(135deg, #a855f7 0%, #ec4899 100%); color: white; padding: 8px 16px; border-radius: 9999px; font-weight: bold; }
            .details { background: #27272a; border-radius: 12px; padding: 20px; margin: 24px 0; }
            .detail-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #3f3f46; }
            .detail-row:last-child { border-bottom: none; }
            .footer { text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #3f3f46; color: #71717a; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>Paiement XP confirmé!</h1>
            <p>Bonjour <span class="highlight">${booking.profiles.full_name}</span>,</p>
            <p>Votre réservation a été payée avec vos XP!</p>

            <div style="text-align: center; margin: 24px 0;">
              <span class="xp-badge">
                ✨ ${booking.xp_used} XP utilisés
              </span>
            </div>

            <div class="details">
              <div class="detail-row">
                <span>Événement</span>
                <span class="highlight">${booking.events?.title || "Événement"}</span>
              </div>
              <div class="detail-row">
                <span>Référence</span>
                <span class="highlight">${booking.booking_reference}</span>
              </div>
              <div class="detail-row">
                <span>Montant initial</span>
                <span>${booking.total_amount} DH</span>
              </div>
              <div class="detail-row">
                <span style="color: #a855f7">XP utilisés</span>
                <span style="color: #a855f7">-${booking.xp_value} DH</span>
              </div>
              <div class="detail-row">
                <span class="highlight">Total payé</span>
                <span class="highlight">0 DH (100% XP)</span>
              </div>
            </div>

            <p style="color: #22c55e; text-align: center; font-weight: bold;">
              ✓ Votre billet est confirmé!
            </p>

            <div class="footer">
              <p>Teens Party Morocco</p>
              <p>Merci d'utiliser vos XP!</p>
            </div>
          </div>
        </body>
        </html>
      `,
    })
  } catch (error) {
    console.error("Failed to send XP payment confirmation:", error)
  }
}
