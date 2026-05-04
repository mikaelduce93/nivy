import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function GET(request: Request) {
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get("userId")

    if (!userId) {
      return NextResponse.json(
        { success: false, error: "User ID requis" },
        { status: 400 }
      )
    }

    // Get notifications for the user
    const { data: notifications, error } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(20)

    if (error) {
      console.error("Notifications fetch error:", error)
      return NextResponse.json(
        { success: false, error: "Erreur de récupération" },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: notifications || [],
    })
  } catch (error) {
    console.error("Notifications API error:", error)
    return NextResponse.json(
      { success: false, error: "Erreur serveur" },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const body = await request.json()

    const { userId, type, title, message, link } = body

    if (!userId || !title || !message) {
      return NextResponse.json(
        { success: false, error: "Données manquantes" },
        { status: 400 }
      )
    }

    const { data, error } = await supabase
      .from("notifications")
      .insert({
        user_id: userId,
        type: type || "system",
        title,
        message,
        link,
        read: false,
        created_at: new Date().toISOString(),
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

    return NextResponse.json({
      success: true,
      data,
    })
  } catch (error) {
    console.error("Notifications POST API error:", error)
    return NextResponse.json(
      { success: false, error: "Erreur serveur" },
      { status: 500 }
    )
  }
}

export async function PATCH(request: Request) {
  try {
    const supabase = await createClient()
    const body = await request.json()

    const { notificationId, userId, markAllRead, read } = body

    if (markAllRead && userId) {
      // Mark all notifications as read for user
      const { error } = await supabase
        .from("notifications")
        .update({ read: true })
        .eq("user_id", userId)
        .eq("read", false)

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
      // Mark single notification as read
      const { error } = await supabase
        .from("notifications")
        .update({ read: read ?? true })
        .eq("id", notificationId)

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
    return NextResponse.json(
      { success: false, error: "Erreur serveur" },
      { status: 500 }
    )
  }
}

export async function DELETE(request: Request) {
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)
    const notificationId = searchParams.get("id")

    if (!notificationId) {
      return NextResponse.json(
        { success: false, error: "ID notification requis" },
        { status: 400 }
      )
    }

    const { error } = await supabase
      .from("notifications")
      .delete()
      .eq("id", notificationId)

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
    return NextResponse.json(
      { success: false, error: "Erreur serveur" },
      { status: 500 }
    )
  }
}
