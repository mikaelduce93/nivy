import { createClient } from "@/lib/supabase/server"
import { NextRequest, NextResponse } from "next/server"

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()

    // Verify authentication
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json(
        { error: "Non authentifié" },
        { status: 401 }
      )
    }

    // Verify admin role
    const { data: adminRole } = await supabase
      .from("admin_roles")
      .select("role")
      .eq("profile_id", user.id)
      .single()

    if (!adminRole || (adminRole.role !== "admin" && adminRole.role !== "super_admin")) {
      return NextResponse.json(
        { error: "Accès refusé" },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { status, payment_status, deposit_amount } = body

    // Build update object
    const updateData: Record<string, any> = {}

    if (status) {
      updateData.status = status

      // Add timestamp based on status
      if (status === "confirmed") {
        updateData.confirmed_at = new Date().toISOString()
        updateData.confirmed_by = user.id
      } else if (status === "cancelled") {
        updateData.cancelled_at = new Date().toISOString()
        updateData.cancelled_by = user.id
      } else if (status === "completed") {
        updateData.completed_at = new Date().toISOString()
      }
    }

    if (payment_status) {
      updateData.payment_status = payment_status

      if (payment_status === "paid") {
        updateData.paid_at = new Date().toISOString()
      }
    }

    if (deposit_amount !== undefined) {
      updateData.deposit_amount = deposit_amount
    }

    // Update the order
    const { data, error } = await supabase
      .from("anniv_orders")
      .update(updateData)
      .eq("id", id)
      .select()
      .single()

    if (error) {
      console.error("Error updating order:", error)
      return NextResponse.json(
        { error: "Erreur lors de la mise à jour" },
        { status: 500 }
      )
    }

    // If status changed to confirmed or cancelled, send notification email
    if (status === "confirmed" || status === "cancelled") {
      // Fetch order details for email
      const { data: orderDetails } = await supabase
        .from("anniv_orders")
        .select(`
          *,
          teen:teen_id (first_name, last_name),
          parent:parent_id (full_name, email),
          pack:pack_id (name)
        `)
        .eq("id", id)
        .single()

      if (orderDetails?.parent?.email) {
        // Send email notification (async, don't wait)
        sendStatusUpdateEmail(orderDetails, status).catch(console.error)
      }
    }

    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error("Admin anniversaires API error:", error)
    return NextResponse.json(
      { error: "Erreur serveur" },
      { status: 500 }
    )
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()

    // Verify authentication
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json(
        { error: "Non authentifié" },
        { status: 401 }
      )
    }

    // Verify admin role
    const { data: adminRole } = await supabase
      .from("admin_roles")
      .select("role")
      .eq("profile_id", user.id)
      .single()

    if (!adminRole || (adminRole.role !== "admin" && adminRole.role !== "super_admin")) {
      return NextResponse.json(
        { error: "Accès refusé" },
        { status: 403 }
      )
    }

    const { data, error } = await supabase
      .from("anniv_orders")
      .select(`
        *,
        teen:teen_id (id, first_name, last_name, pseudo, birth_date, avatar_url),
        pack:pack_id (id, name, pack_type, base_price, description),
        parent:parent_id (id, full_name, email, phone),
        extras:anniv_order_extras (
          id,
          quantity,
          unit_price,
          extra:extra_id (id, name, unit, price_per_unit)
        )
      `)
      .eq("id", id)
      .single()

    if (error) {
      console.error("Error fetching order:", error)
      return NextResponse.json(
        { error: "Commande non trouvée" },
        { status: 404 }
      )
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error("Admin anniversaires API error:", error)
    return NextResponse.json(
      { error: "Erreur serveur" },
      { status: 500 }
    )
  }
}

// Helper function to send status update email
async function sendStatusUpdateEmail(order: any, newStatus: string) {
  // Vérifier si Resend est configuré
  if (!process.env.RESEND_API_KEY) {
    console.warn("[Resend] Not configured - status update email not sent")
    return
  }

  const { Resend } = await import("resend")
  const resend = new Resend(process.env.RESEND_API_KEY)

  const statusMessages: Record<string, { subject: string; title: string; message: string }> = {
    confirmed: {
      subject: `Anniversaire confirmé - ${order.booking_reference}`,
      title: "Votre réservation est confirmée !",
      message: `Bonne nouvelle ! L'anniversaire de ${order.teen?.first_name || "votre enfant"} est confirmé pour le ${new Date(order.celebration_date).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })}.`,
    },
    cancelled: {
      subject: `Anniversaire annulé - ${order.booking_reference}`,
      title: "Réservation annulée",
      message: `Nous sommes désolés de vous informer que la réservation anniversaire (${order.booking_reference}) a été annulée. Si vous avez des questions, n'hésitez pas à nous contacter.`,
    },
  }

  const content = statusMessages[newStatus]
  if (!content) return

  try {
    await resend.emails.send({
      from: "Teens Party Morocco <noreply@teensparty.ma>",
      to: order.parent.email,
      subject: content.subject,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #09090b; color: #fff; padding: 40px 20px; }
            .container { max-width: 600px; margin: 0 auto; background: #18181b; border-radius: 16px; padding: 40px; }
            .logo { text-align: center; margin-bottom: 30px; }
            h1 { color: #ec4899; margin: 0 0 20px; font-size: 24px; }
            p { color: #a1a1aa; line-height: 1.6; margin: 0 0 16px; }
            .highlight { color: #fff; font-weight: bold; }
            .details { background: #27272a; border-radius: 12px; padding: 20px; margin: 24px 0; }
            .detail-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #3f3f46; }
            .detail-row:last-child { border-bottom: none; }
            .footer { text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #3f3f46; color: #71717a; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="logo">
              <img src="https://teensparty.ma/logo.png" alt="Teens Party" height="40">
            </div>
            <h1>${content.title}</h1>
            <p>Bonjour <span class="highlight">${order.parent.full_name}</span>,</p>
            <p>${content.message}</p>
            <div class="details">
              <div class="detail-row">
                <span>Référence</span>
                <span class="highlight">${order.booking_reference}</span>
              </div>
              <div class="detail-row">
                <span>Formule</span>
                <span class="highlight">${order.pack?.name || "-"}</span>
              </div>
              <div class="detail-row">
                <span>Nombre d'invités</span>
                <span class="highlight">${order.guest_count} personnes</span>
              </div>
              <div class="detail-row">
                <span>Total</span>
                <span class="highlight">${order.total_price?.toLocaleString()} DH</span>
              </div>
            </div>
            <div class="footer">
              <p>Teens Party Morocco</p>
              <p>Des questions ? Contactez-nous à contact@teensparty.ma</p>
            </div>
          </div>
        </body>
        </html>
      `,
    })
  } catch (error) {
    console.error("Failed to send status update email:", error)
  }
}
