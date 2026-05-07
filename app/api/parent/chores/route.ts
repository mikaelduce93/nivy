/**
 * GET /api/parent/chores — list parent's chores with completion stats.
 */

import { NextResponse } from "next/server"
import { getUserRole } from "@/lib/auth/get-user-role"
import { createClient } from "@/lib/supabase/server"

export async function GET() {
  try {
    const userInfo = await getUserRole()
    if (!userInfo || userInfo.role !== "parent") {
      return NextResponse.json(
        { success: false, error: "Non autorisé" },
        { status: 401 }
      )
    }

    const supabase = await createClient()
    const { data: chores, error } = await supabase
      .from("parent_chores")
      .select("*")
      .eq("parent_id", userInfo.profileId)
      .order("created_at", { ascending: false })

    if (error) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true, chores: chores ?? [] })
  } catch (err) {
    console.error("[chores] error:", err)
    return NextResponse.json(
      { success: false, error: "Erreur serveur" },
      { status: 500 }
    )
  }
}
