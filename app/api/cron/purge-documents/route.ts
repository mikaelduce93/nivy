import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get("authorization")
    const cronSecret = process.env.CRON_SECRET
    
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 })
    }

    const supabase = await createClient()

    const { data, error } = await supabase.rpc("execute_document_purge")

    if (error) throw error

    console.log("[v0] Document purge completed:", data)

    return NextResponse.json({
      success: true,
      purgedCount: data,
      message: `${data} document(s) purgé(s) avec succès`,
    })
  } catch (error) {
    console.error("[v0] Document purge error:", error)
    return NextResponse.json(
      { error: "Erreur lors de la purge des documents" },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single()

    if (profile?.role !== "admin") {
      return NextResponse.json({ error: "Non autorisé" }, { status: 403 })
    }

    const { data, error } = await supabase.rpc("execute_document_purge")

    if (error) throw error

    return NextResponse.json({
      success: true,
      purgedCount: data,
      message: `${data} document(s) purgé(s) avec succès`,
    })
  } catch (error) {
    console.error("[v0] Manual document purge error:", error)
    return NextResponse.json(
      { error: "Erreur lors de la purge manuelle" },
      { status: 500 }
    )
  }
}
