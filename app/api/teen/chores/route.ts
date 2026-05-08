/**
 * GET /api/teen/chores — list active chores assigned to the calling teen.
 */

import { NextResponse } from "next/server"
import { getUserRole } from "@/lib/auth/get-user-role"
import { createClient } from "@/lib/supabase/server"

export async function GET() {
  try {
    const userInfo = await getUserRole()
    if (!userInfo || userInfo.role !== "teen") {
      return NextResponse.json(
        { success: false, error: "Non autorisé" },
        { status: 401 }
      )
    }

    const supabase = await createClient()
    const teenId = userInfo.profileId

    // Wave 3 / TICKET-016 — sibling fan-out. Chores assigned to this teen
    // can come either via the legacy direct `parent_chores.teen_id` link or
    // via the new `chore_targets` junction. Pull both in parallel and union
    // by id (RLS still enforces visibility on each side).
    const [direct, viaTargets] = await Promise.all([
      supabase
        .from("parent_chores")
        .select("*")
        .eq("teen_id", teenId)
        .eq("is_active", true),
      supabase
        .from("chore_targets")
        .select("parent_chores!inner(*)")
        .eq("teen_id", teenId)
        .eq("parent_chores.is_active", true),
    ])

    if (direct.error) {
      return NextResponse.json(
        { success: false, error: direct.error.message },
        { status: 500 }
      )
    }
    if (viaTargets.error) {
      return NextResponse.json(
        { success: false, error: viaTargets.error.message },
        { status: 500 }
      )
    }

    type Chore = { id: string; created_at: string } & Record<string, unknown>
    const byId = new Map<string, Chore>()
    for (const c of (direct.data ?? []) as Chore[]) byId.set(c.id, c)
    for (const row of viaTargets.data ?? []) {
      const c = (row as { parent_chores: Chore | Chore[] | null }).parent_chores
      if (!c) continue
      const arr = Array.isArray(c) ? c : [c]
      for (const item of arr) byId.set(item.id, item)
    }
    const chores = Array.from(byId.values()).sort((a, b) =>
      String(b.created_at).localeCompare(String(a.created_at))
    )

    return NextResponse.json({ success: true, chores })
  } catch (err) {
    console.error("[teen/chores] error:", err)
    return NextResponse.json(
      { success: false, error: "Erreur serveur" },
      { status: 500 }
    )
  }
}
