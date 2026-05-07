/**
 * POST /api/teen/avatar
 *
 * Tiny endpoint backing AvatarCoach v1 client interactions.
 * Two actions:
 *   - { action: "dismiss", messageId }  → marks an avatar_message as dismissed
 *   - { action: "set_mood", mood }      → updates avatars.mood for the teen
 *
 * No LLM, no message creation here. Message creation lives in lib/ai/* +
 * server-side hooks. This route is read-write but scoped to two columns.
 */

import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

const ALLOWED_MOODS = new Set([
  "neutral",
  "happy",
  "celebrating",
  "sad",
  "tired",
  "focused",
])

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json(
        { success: false, error: "Non autorisé" },
        { status: 401 },
      )
    }

    const body = await request.json().catch(() => null)
    if (!body || typeof body !== "object") {
      return NextResponse.json(
        { success: false, error: "Payload invalide" },
        { status: 400 },
      )
    }

    const action = String((body as Record<string, unknown>).action || "")

    if (action === "dismiss") {
      const messageId = String((body as Record<string, unknown>).messageId || "")
      if (!messageId) {
        return NextResponse.json(
          { success: false, error: "messageId requis" },
          { status: 400 },
        )
      }

      const { error } = await supabase
        .from("avatar_messages")
        .update({ dismissed_at: new Date().toISOString() })
        .eq("id", messageId)
        .eq("teen_id", user.id)

      if (error) {
        return NextResponse.json(
          { success: false, error: "Échec de la mise à jour" },
          { status: 500 },
        )
      }

      return NextResponse.json({ success: true })
    }

    if (action === "set_mood") {
      const mood = String((body as Record<string, unknown>).mood || "").toLowerCase()
      if (!ALLOWED_MOODS.has(mood)) {
        return NextResponse.json(
          { success: false, error: "Humeur invalide" },
          { status: 400 },
        )
      }

      // Upsert so the row is created on first use.
      const { error } = await supabase
        .from("avatars")
        .upsert(
          {
            teen_id: user.id,
            mood,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "teen_id" },
        )

      if (error) {
        return NextResponse.json(
          { success: false, error: "Échec de la mise à jour" },
          { status: 500 },
        )
      }

      return NextResponse.json({ success: true })
    }

    return NextResponse.json(
      { success: false, error: "Action inconnue" },
      { status: 400 },
    )
  } catch (err) {
    console.error("/api/teen/avatar error:", err)
    return NextResponse.json(
      { success: false, error: "Erreur serveur" },
      { status: 500 },
    )
  }
}
