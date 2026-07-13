/**
 * GET/DELETE /api/teen/coach-memory — Transparence mémoire du coach Niv.
 *
 * #Transparency — RGPD/CNDP droit d'accès + droit d'effacement sur la mémoire
 * long terme du coach (coach_profile, coach_goals, coach_facts,
 * coach_conversation_summaries). L'ado peut voir ce que Niv retient de lui et
 * tout effacer d'un clic.
 *
 * Contract :
 *   GET    200 : { summary, goals[], facts[], isEmpty }
 *   DELETE 200 : { cleared: true }
 *   401 : non authentifié
 *
 * RLS : le client serveur du teen ne lit/écrit que ses propres lignes
 * (teen_id = auth.uid()). Aucune donnée d'un autre teen n'est accessible.
 */

import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { getCoachMemoryForDisplay, clearCoachMemory } from "@/lib/ai/coach-memory"

export async function GET() {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 })
    }

    const memory = await getCoachMemoryForDisplay(supabase, user.id)
    return NextResponse.json(memory)
  } catch (err) {
    console.error("[coach-memory] GET error:", err)
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  }
}

export async function DELETE() {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 })
    }

    const ok = await clearCoachMemory(supabase, user.id)
    if (!ok) {
      // Partial failure — on informe mais sans casser l'UX (une partie a été effacée).
      return NextResponse.json(
        { cleared: false, warning: "Une partie de la mémoire n'a pas pu être effacée." },
        { status: 207 },
      )
    }
    return NextResponse.json({ cleared: true })
  } catch (err) {
    console.error("[coach-memory] DELETE error:", err)
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  }
}
