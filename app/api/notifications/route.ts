import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

// All handlers bind to auth.getUser(). Per Wave-A audit: never trust a
// client-supplied userId (was an open IDOR/impersonation vector).
// System-side or cross-user notification writes must use the service role
// from a trusted server caller, not this route.

async function authedUser() {
  const supabase = await createClient()
  const { data, error } = await supabase.auth.getUser()
  if (error || !data.user) return { supabase, user: null as null }
  return { supabase, user: data.user }
}

export async function GET() {
  try {
    const { supabase, user } = await authedUser()
    if (!user) {
      return NextResponse.json({ success: false, error: "Non authentifié" }, { status: 401 })
    }

    // #70 — canonical table is user_notifications (the `notifications` table
    // does not exist). Columns: is_read/body/data (not read/message/type).
    const { data: notifications, error } = await supabase
      .from("user_notifications")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(20)

    if (error) {
      console.error("Notifications fetch error:", error)
      return NextResponse.json(
        { success: false, error: "Erreur de récupération" },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true, data: notifications || [] })
  } catch (error) {
    console.error("Notifications API error:", error)
    return NextResponse.json({ success: false, error: "Erreur serveur" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const { supabase, user } = await authedUser()
    if (!user) {
      return NextResponse.json({ success: false, error: "Non authentifié" }, { status: 401 })
    }

    const reqBody = await request.json()
    const { type, title, message, link } = reqBody

    if (!title || !message) {
      return NextResponse.json(
        { success: false, error: "Données manquantes" },
        { status: 400 }
      )
    }

    // #70 — user_notifications schema: body (not message), is_read (not read),
    // action_url (not link); type/category live in the data jsonb.
    const { data, error } = await supabase
      .from("user_notifications")
      .insert({
        user_id: user.id,
        title,
        body: message,
        action_url: link ?? null,
        is_read: false,
        data: { type: type || "system" },
      })
      .select()
      .single()

    if (error) {
      console.error("Notification create error:", error)
      return NextResponse.json(
        { success: false, error: "Erreur de création" },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error("Notifications POST API error:", error)
    return NextResponse.json({ success: false, error: "Erreur serveur" }, { status: 500 })
  }
}

export async function PATCH(request: Request) {
  try {
    const { supabase, user } = await authedUser()
    if (!user) {
      return NextResponse.json({ success: false, error: "Non authentifié" }, { status: 401 })
    }

    const reqBody = await request.json()
    const { notificationId, markAllRead, read } = reqBody

    if (markAllRead) {
      const { error } = await supabase
        .from("user_notifications")
        .update({ is_read: true })
        .eq("user_id", user.id)
        .eq("is_read", false)

      if (error) {
        console.error("Mark all read error:", error)
        return NextResponse.json(
          { success: false, error: "Erreur de mise à jour" },
          { status: 500 }
        )
      }

      return NextResponse.json({ success: true })
    }

    if (notificationId) {
      const { error } = await supabase
        .from("user_notifications")
        .update({ is_read: read ?? true })
        .eq("id", notificationId)
        .eq("user_id", user.id)

      if (error) {
        console.error("Mark read error:", error)
        return NextResponse.json(
          { success: false, error: "Erreur de mise à jour" },
          { status: 500 }
        )
      }

      return NextResponse.json({ success: true })
    }

    return NextResponse.json(
      { success: false, error: "Paramètres invalides" },
      { status: 400 }
    )
  } catch (error) {
    console.error("Notifications PATCH API error:", error)
    return NextResponse.json({ success: false, error: "Erreur serveur" }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  try {
    const { supabase, user } = await authedUser()
    if (!user) {
      return NextResponse.json({ success: false, error: "Non authentifié" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const notificationId = searchParams.get("id")

    if (!notificationId) {
      return NextResponse.json(
        { success: false, error: "ID notification requis" },
        { status: 400 }
      )
    }

    const { error } = await supabase
      .from("user_notifications")
      .delete()
      .eq("id", notificationId)
      .eq("user_id", user.id)

    if (error) {
      console.error("Notification delete error:", error)
      return NextResponse.json(
        { success: false, error: "Erreur de suppression" },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Notifications DELETE API error:", error)
    return NextResponse.json({ success: false, error: "Erreur serveur" }, { status: 500 })
  }
}
