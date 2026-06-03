/**
 * POST /api/teen/events/book — réservation event côté ADO (modèle opt-out).
 *
 * L'ado réserve directement : le booking est créé `confirmed` (pas d'attente).
 * Pour CHAQUE parent lié, une ligne `parental_approvals` (action_type
 * 'event_booking', status 'pending') est créée = sa fenêtre d'OPPOSITION.
 * S'il s'oppose (deny via /api/parent/approvals → RPC parent_deny_booking,
 * migration 129), le booking passe `cancelled`.
 *
 * Évènements payants : hors de ce flux gratuit → renvoie `needsPayment` (le
 * parcours paiement existant /api/bookings/create + /reservation reste la voie).
 */
import { NextResponse } from "next/server"
import { getUserRole } from "@/lib/auth/get-user-role"
import { createServiceRoleClient } from "@/lib/supabase/service-role"
import { randomBytes } from "node:crypto"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function POST(request: Request) {
  try {
    const userInfo = await getUserRole()
    if (!userInfo || userInfo.role !== "teen" || !userInfo.teenData?.id) {
      return NextResponse.json({ success: false, error: "unauthorized" }, { status: 401 })
    }
    const teenId = userInfo.teenData.id

    const body = (await request.json().catch(() => null)) as { eventId?: string } | null
    const eventId = body?.eventId
    if (!eventId) {
      return NextResponse.json({ success: false, error: "eventId requis" }, { status: 400 })
    }

    const sr = createServiceRoleClient()

    // Évènement existant + à venir.
    const { data: event } = await sr
      .from("events")
      .select("id, title, event_date, price_coins, price_dh")
      .eq("id", eventId)
      .maybeSingle()
    if (!event) {
      return NextResponse.json({ success: false, error: "event_introuvable" }, { status: 404 })
    }

    // Idempotence : pas de double réservation active.
    const { data: existing } = await sr
      .from("bookings")
      .select("id, status")
      .eq("user_id", teenId)
      .eq("event_id", eventId)
      .neq("status", "cancelled")
      .maybeSingle()
    if (existing) {
      return NextResponse.json({ success: true, already_booked: true, booking_id: existing.id })
    }

    // Payant → renvoyer vers le parcours paiement existant (hors opt-out gratuit).
    const priceDh = Number(event.price_dh ?? 0)
    const priceCoins = Number(event.price_coins ?? 0)
    if (priceDh > 0 || priceCoins > 0) {
      return NextResponse.json({ success: false, error: "payment_required", needsPayment: true })
    }

    // Booking confirmé immédiatement (modèle opt-out : l'ado n'attend pas le parent).
    const ref = `TP${Date.now().toString(36).toUpperCase()}${randomBytes(3).toString("hex").toUpperCase()}`
    const { data: booking, error: bErr } = await sr
      .from("bookings")
      .insert({
        user_id: teenId,
        event_id: eventId,
        booking_reference: ref,
        status: "confirmed",
        payment_status: "free",
        total_amount: 0,
      })
      .select("id")
      .single()
    if (bErr || !booking) {
      console.error("[teen/events/book] booking insert error:", bErr)
      return NextResponse.json(
        { success: false, error: "booking_failed", details: bErr?.message },
        { status: 500 }
      )
    }

    // Fenêtre d'OPPOSITION pour chaque parent lié (pas une validation préalable).
    const { data: links } = await sr
      .from("parent_teen_links")
      .select("parent_id")
      .eq("teen_id", teenId)
      .eq("status", "active")

    for (const l of (links ?? []) as { parent_id: string }[]) {
      await sr.from("parental_approvals").insert({
        parent_id: l.parent_id,
        teen_id: teenId,
        action_type: "event_booking",
        resource_type: "booking",
        resource_id: booking.id,
        amount: 0,
        status: "pending",
        details: {
          mode: "objection",
          auto_confirmed: true,
          event_id: eventId,
          event_title: event.title,
        },
        expires_at: event.event_date ?? new Date(Date.now() + 7 * 86400000).toISOString(),
      })
    }

    return NextResponse.json({
      success: true,
      booking_id: booking.id,
      status: "confirmed",
      can_be_opposed: (links?.length ?? 0) > 0,
    })
  } catch (err) {
    console.error("[teen/events/book] unexpected:", err)
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : "server_error" },
      { status: 500 }
    )
  }
}
