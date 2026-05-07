/**
 * POST /api/teen/chores/:id/complete
 *
 * Teen submits a completion. Optional photo evidence may be uploaded
 * separately to the private `defi-proofs` Supabase bucket; the route
 * only stores the resulting object path / signed-URL key.
 *
 * Body: { evidence_url?: string }
 *
 * Server-side validates that the chore is active and assigned to the
 * calling teen. Also enforced by RLS.
 */

import { NextResponse } from "next/server"
import { getUserRole } from "@/lib/auth/get-user-role"
import { createClient } from "@/lib/supabase/server"

interface CompleteBody {
  evidence_url?: string | null
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userInfo = await getUserRole()
    if (!userInfo || userInfo.role !== "teen") {
      return NextResponse.json(
        { success: false, error: "Non autorisé" },
        { status: 401 }
      )
    }

    const { id: choreId } = await params
    const body = (await request.json().catch(() => ({}))) as CompleteBody

    const supabase = await createClient()
    const teenId = userInfo.profileId

    // Validate the chore is active and assigned to this teen.
    const { data: chore } = await supabase
      .from("parent_chores")
      .select("id, teen_id, evidence_required, is_active")
      .eq("id", choreId)
      .eq("teen_id", teenId)
      .maybeSingle()

    if (!chore || !chore.is_active) {
      return NextResponse.json(
        { success: false, error: "Corvée introuvable ou inactive" },
        { status: 404 }
      )
    }

    if (chore.evidence_required && !body.evidence_url) {
      return NextResponse.json(
        { success: false, error: "Preuve photo requise" },
        { status: 400 }
      )
    }

    const { data: completion, error } = await supabase
      .from("parent_chore_completions")
      .insert({
        chore_id: choreId,
        teen_id: teenId,
        evidence_url: body.evidence_url ?? null,
        parent_verified: false,
      })
      .select("*")
      .single()

    if (error) {
      console.error("[teen/chores/complete] insert error:", error)
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true, completion })
  } catch (err) {
    console.error("[teen/chores/complete] unexpected:", err)
    return NextResponse.json(
      { success: false, error: "Erreur serveur" },
      { status: 500 }
    )
  }
}
