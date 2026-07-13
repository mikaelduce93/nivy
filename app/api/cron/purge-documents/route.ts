import { createClient } from "@/lib/supabase/server"
import type { SupabaseClient } from "@supabase/supabase-js"
import { NextResponse } from "next/server"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get("authorization")
    const cronSecret = process.env.CRON_SECRET
    const isVercelCron = request.headers.get("x-vercel-cron") !== null

    // Fail-closed: if CRON_SECRET is unset, no caller can authenticate.
    // Wave-A audit found this gated `if (cronSecret && ...)` which silently
    // bypassed auth when the env var was missing.
    if (!isVercelCron) {
      if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
        return NextResponse.json({ error: "Non autorisé" }, { status: 401 })
      }
    }

    const supabase = await createClient()

    // `execute_document_purge` est absent des types régénérés depuis la base
    // LIVE (2026-07-12) : ni la fonction ni les tables documents /
    // document_purge_queue ne sont déployées (définies seulement dans
    // docs/P0_OPERATIONAL_FEATURES.md ; route orpheline —
    // docs/vision/audit-prelaunch/06-cron-jobs.md). Cast vers le
    // SupabaseClient de base (même pattern que app/api/admin/execute-sql)
    // pour lever l'erreur tsc SANS changer le runtime : tant que la fonction
    // n'est pas déployée, l'appel tombe dans `if (error)` → 500, sémantique
    // préservée.
    const { data, error } = await (supabase as unknown as SupabaseClient).rpc(
      "execute_document_purge"
    )

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

    // Voir la note du handler GET : `execute_document_purge` n'est pas dans
    // les types LIVE (2026-07-12), cast de frontière sans changement runtime.
    const { data, error } = await (supabase as unknown as SupabaseClient).rpc(
      "execute_document_purge"
    )

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
