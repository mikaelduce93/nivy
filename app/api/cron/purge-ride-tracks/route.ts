import { createServiceRoleClient } from "@/lib/supabase/service-role"
import { NextResponse } from "next/server"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

/**
 * Cron: purge ride GPS location pings older than the retention window
 * (loi 09-08/CNDP data-minimisation — minors' location is sensitive). The
 * driver writes ride_tracks during an active ride; once a ride is long over
 * the pings serve no purpose and must be deleted. Default 30 days.
 *
 * Auth: Vercel cron header OR `Authorization: Bearer <CRON_SECRET>` (fail-closed).
 */
const RETENTION_DAYS = Number(process.env.RIDE_TRACKS_RETENTION_DAYS) || 30

export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get("authorization")
    const cronSecret = process.env.CRON_SECRET
    const isVercelCron = request.headers.get("x-vercel-cron") !== null

    if (!isVercelCron) {
      if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
        return NextResponse.json({ error: "Non autorisé" }, { status: 401 })
      }
    }

    const cutoff = new Date(Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000).toISOString()
    const sr = createServiceRoleClient()
    const { count, error } = await sr
      .from("ride_tracks")
      .delete({ count: "exact" })
      .lt("captured_at", cutoff)

    if (error) throw error

    console.warn(`[purge-ride-tracks] deleted ${count ?? 0} ping(s) older than ${RETENTION_DAYS}d`)
    return NextResponse.json({
      success: true,
      purgedCount: count ?? 0,
      retentionDays: RETENTION_DAYS,
    })
  } catch (error) {
    console.error("[purge-ride-tracks] error:", error)
    return NextResponse.json({ error: "Erreur lors de la purge des positions" }, { status: 500 })
  }
}
