import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import { getUserRole } from "@/lib/auth/get-user-role"

export async function GET(request: Request) {
  try {
    const supabase = await createClient()
    const userInfo = await getUserRole()

    if (!userInfo || userInfo.role !== "teen") {
      return NextResponse.json(
        { success: false, error: "Non autorisé" },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const conversationId = searchParams.get("conversationId")

    if (!conversationId) {
      return NextResponse.json(
        { success: false, error: "ID de conversation manquant" },
        { status: 400 }
      )
    }

    // Get messages for conversation
    const { data: messages, error } = await supabase
      .from("teen_messages")
      .select("*")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true })

    if (error) {
      console.error("Error fetching messages:", error)
      return NextResponse.json(
        { success: false, error: "Erreur de récupération" },
        { status: 500 }
      )
    }

    // Mark messages as read
    const teenId = userInfo.teenData?.id
    if (teenId) {
      await supabase
        .from("teen_messages")
        .update({ is_read: true })
        .eq("conversation_id", conversationId)
        .neq("sender_id", teenId)
        .eq("is_read", false)

      // Update unread count in conversation
      await supabase
        .from("teen_conversations")
        .update({ unread_count: 0 })
        .eq("id", conversationId)
    }

    return NextResponse.json({
      success: true,
      data: messages || []
    })
  } catch (error) {
    console.error("Messages GET API error:", error)
    return NextResponse.json(
      { success: false, error: "Erreur serveur" },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const userInfo = await getUserRole()

    if (!userInfo || userInfo.role !== "teen") {
      return NextResponse.json(
        { success: false, error: "Non autorisé" },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { conversationId, senderId, content } = body

    if (!conversationId || !senderId || !content) {
      return NextResponse.json(
        { success: false, error: "Données manquantes" },
        { status: 400 }
      )
    }

    // Verify sender is current user
    const teenId = userInfo.teenData?.id
    if (senderId !== teenId) {
      return NextResponse.json(
        { success: false, error: "Non autorisé" },
        { status: 401 }
      )
    }

    // Create message
    const { data: message, error: messageError } = await supabase
      .from("teen_messages")
      .insert({
        conversation_id: conversationId,
        sender_id: senderId,
        content: content.trim(),
        is_read: false,
        created_at: new Date().toISOString()
      })
      .select()
      .single()

    if (messageError) {
      console.error("Message creation error:", messageError)
      return NextResponse.json(
        { success: false, error: "Erreur lors de l'envoi" },
        { status: 500 }
      )
    }

    // Update conversation
    await supabase
      .from("teen_conversations")
      .update({
        last_message: content.trim().substring(0, 100),
        last_message_at: new Date().toISOString(),
        unread_count: supabase.rpc('increment', { x: 1 }) // Increment unread
      })
      .eq("id", conversationId)

    // Create notification for recipient
    const { data: conversation } = await supabase
      .from("teen_conversations")
      .select("participant1_id, participant2_id")
      .eq("id", conversationId)
      .single()

    if (conversation) {
      const recipientId = conversation.participant1_id === teenId
        ? conversation.participant2_id
        : conversation.participant1_id

      await supabase.from("notifications").insert({
        user_id: recipientId,
        type: "message",
        title: "Nouveau message",
        message: `${userInfo.fullName} t'a envoyé un message`,
        data: {
          conversation_id: conversationId,
          sender_id: teenId,
          sender_name: userInfo.fullName
        },
        read: false,
        created_at: new Date().toISOString()
      })
    }

    return NextResponse.json({
      success: true,
      data: message
    })
  } catch (error) {
    console.error("Messages POST API error:", error)
    return NextResponse.json(
      { success: false, error: "Erreur serveur" },
      { status: 500 }
    )
  }
}
