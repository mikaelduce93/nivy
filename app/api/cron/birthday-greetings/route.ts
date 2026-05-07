/**
 * W-D.11 — Birthday greetings cron.
 *
 * Schedule: 09:00 Africa/Casablanca (= 08:00 UTC).
 * For every teen whose date_of_birth month+day matches today, inserts an
 * in-app `user_notifications` row and grants 50 XP via `add_xp_to_user`.
 *
 * Idempotency: keyed on (teen_id, current_year). We check if an XP transaction
 * with source_type='birthday' already exists for today before inserting.
 * Optionally writes to `anniv_celebrations` if that table exists (not yet
 * present on staging — we degrade gracefully).
 *
 * Auth: Vercel cron header OR Bearer CRON_SECRET, fail-CLOSED.
 */

import { NextRequest, NextResponse } from "next/server"
import { createServiceRoleClient } from "@/lib/supabase/service-role"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export async function GET(request: NextRequest) {
  const isVercelCron = request.headers.get("x-vercel-cron") !== null
  const authHeader = request.headers.get("authorization")
  const cronSecret = process.env.CRON_SECRET
  const hasValidBearer =
    typeof cronSecret === "string" &&
    cronSecret.length > 0 &&
    authHeader === `Bearer ${cronSecret}`
  if (!isVercelCron && !hasValidBearer) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const startedAt = Date.now()
  const supabase = createServiceRoleClient()

  // Compute "today" in Casa local (UTC+1) so a 08:00 UTC run lines up with the
  // local calendar date.
  const nowUtc = new Date()
  const casaLocal = new Date(nowUtc.getTime() + 60 * 60 * 1000)
  const month = casaLocal.getUTCMonth() + 1 // 1..12
  const day = casaLocal.getUTCDate()
  const year = casaLocal.getUTCFullYear()

  // Pull all teens with a DOB; filter month/day in JS (date_part on date is
  // straightforward but the array is bounded by user count, fine).
  const { data: teens, error: teensErr } = await supabase
    .from("teens")
    .select("id, first_name, date_of_birth")
    .not("date_of_birth", "is", null)

  if (teensErr) {
    console.error("[cron/birthday-greetings] teens query failed:", teensErr)
    return NextResponse.json(
      { error: "Failed to query teens", detail: teensErr.message },
      { status: 500 },
    )
  }

  const todayBirthdays = (teens ?? []).filter((t) => {
    if (!t.date_of_birth) return false
    const d = new Date(t.date_of_birth as string)
    return d.getUTCMonth() + 1 === month && d.getUTCDate() === day
  })

  // Has anniv_celebrations table?
  const { error: annivProbe } = await supabase
    .from("anniv_celebrations")
    .select("teen_id")
    .limit(1)
  const hasAnnivTable = !annivProbe

  let celebrated = 0
  let skippedAlreadyDone = 0
  const errors: Array<{ teen_id: string; error: string }> = []

  for (const teen of todayBirthdays) {
    try {
      // Idempotency check — look for any 'birthday' xp_transaction this year.
      const yearStart = new Date(Date.UTC(year, 0, 1)).toISOString()
      const { data: alreadyXp } = await supabase
        .from("xp_transactions")
        .select("id")
        .eq("teen_id", teen.id)
        .eq("source_type", "birthday")
        .gte("created_at", yearStart)
        .limit(1)

      if (alreadyXp && alreadyXp.length > 0) {
        skippedAlreadyDone++
        continue
      }

      // Grant XP.
      const { error: xpErr } = await supabase.rpc("add_xp_to_user", {
        p_teen_id: teen.id,
        p_xp_amount: 50,
        p_source_type: "birthday",
        p_source_category: "celebration",
        p_source_id: teen.id,
        p_description: `Bon anniversaire ${teen.first_name ?? ""}!`.trim(),
      })
      if (xpErr) throw xpErr

      // Insert in-app notification (push fan-out cron will deliver it).
      await supabase.from("user_notifications").insert({
        user_id: teen.id,
        title: "Bon anniversaire 🎉",
        body: `Joyeux anniversaire ${teen.first_name ?? ""}! +50 XP cadeau de Nivy.`.trim(),
        priority: "high",
        emoji: "🎂",
        xp_reward: 50,
        action_url: "/teen/profile",
      })

      // Anniv_celebrations row if the table exists.
      if (hasAnnivTable) {
        await supabase
          .from("anniv_celebrations")
          .insert({
            teen_id: teen.id,
            ann_year: year,
            celebrated_at: nowUtc.toISOString(),
          })
          .select()
          .maybeSingle()
      }

      celebrated++
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e)
      errors.push({ teen_id: teen.id, error: msg })
      console.error(
        `[cron/birthday-greetings] teen ${teen.id} failed:`,
        msg,
      )
    }
  }

  return NextResponse.json({
    today: `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`,
    candidates: todayBirthdays.length,
    celebrated,
    skipped_already_done: skippedAlreadyDone,
    errors,
    has_anniv_table: hasAnnivTable,
    duration_ms: Date.now() - startedAt,
  })
}
