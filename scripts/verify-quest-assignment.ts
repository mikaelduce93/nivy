/**
 * W3.2 verification script.
 *
 * 1. Calls assign_missions_for_teen(amine_id)
 * 2. Counts active user_missions grouped by mission_templates.mission_type
 * 3. Asserts: >=3 daily, >=3 weekly, >=3 monthly, >=1 seasonal active
 *
 * Run:  npx tsx scripts/verify-quest-assignment.ts
 *
 * Reads SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY from .env.local.
 */

import { createClient } from "@supabase/supabase-js"
import { readFileSync } from "node:fs"

// ---- Minimal .env.local loader (no dotenv dep) ---------------------------
try {
  const raw = readFileSync(".env.local", "utf8")
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith("#")) continue
    const eq = trimmed.indexOf("=")
    if (eq === -1) continue
    const key = trimmed.slice(0, eq).trim()
    let value = trimmed.slice(eq + 1).trim()
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1)
    }
    if (!process.env[key]) process.env[key] = value
  }
} catch {
  /* .env.local optional */
}

const AMINE_ID = "37ff4a09-25ca-44c2-a313-141ab6d7e1b9"

const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!url) throw new Error("Missing SUPABASE_URL / NEXT_PUBLIC_SUPABASE_URL")
if (!serviceKey) throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY")

const supabase = createClient(url, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
})

async function main() {
  // 1. Call the RPC
  const { data: insertedRaw, error: rpcErr } = await supabase.rpc(
    "assign_missions_for_teen",
    { p_teen_id: AMINE_ID }
  )
  if (rpcErr) {
    console.error("RPC failed:", rpcErr)
    process.exit(1)
  }
  const inserted = typeof insertedRaw === "number" ? insertedRaw : Number(insertedRaw ?? 0)
  console.log(`assign_missions_for_teen inserted: ${inserted}`)

  // 2. Count active user_missions per cadence (Casablanca tz day boundary).
  //    A direct PostgREST aggregation isn't trivial across tables; do it
  //    in a single SQL call via rpc-able helper... but we don't have one.
  //    Use two queries: pull active rows joined client-side.
  const { data: rows, error: qErr } = await supabase
    .from("user_missions")
    .select(
      "id, status, period_start, period_end, mission:mission_templates!inner(mission_type)"
    )
    .eq("teen_id", AMINE_ID)
    .eq("status", "active")

  if (qErr) {
    console.error("Query failed:", qErr)
    process.exit(1)
  }

  // Filter active = period_end > today (Africa/Casablanca).
  // Use UTC date — close enough for a >today boundary check.
  const today = new Date()
  // Africa/Casablanca is UTC+1 year-round (no DST since 2018, except Ramadan).
  // Use a permissive boundary: today's date in Casablanca.
  const casablancaMidnight = new Date(today.getTime() + 60 * 60 * 1000)
  const todayStr = casablancaMidnight.toISOString().slice(0, 10)

  const counts: Record<string, number> = {
    daily: 0,
    weekly: 0,
    monthly: 0,
    seasonal: 0,
  }

  type Row = {
    period_end: string
    mission: { mission_type: string } | { mission_type: string }[]
  }
  for (const row of (rows ?? []) as Row[]) {
    if (!row.period_end || row.period_end <= todayStr) continue
    const m = Array.isArray(row.mission) ? row.mission[0] : row.mission
    const t = m?.mission_type
    if (t && t in counts) counts[t]! += 1
  }

  console.log("Active user_missions for amine:")
  console.log(`  daily    = ${counts.daily}`)
  console.log(`  weekly   = ${counts.weekly}`)
  console.log(`  monthly  = ${counts.monthly}`)
  console.log(`  seasonal = ${counts.seasonal}`)

  // 3. Assert
  const failures: string[] = []
  if (counts.daily! < 3) failures.push(`daily=${counts.daily} (<3)`)
  if (counts.weekly! < 3) failures.push(`weekly=${counts.weekly} (<3)`)
  if (counts.monthly! < 3) failures.push(`monthly=${counts.monthly} (<3)`)
  if (counts.seasonal! < 1) failures.push(`seasonal=${counts.seasonal} (<1)`)

  if (failures.length) {
    console.error("FAIL:", failures.join(", "))
    process.exit(1)
  }
  console.log(
    `OK  daily=${counts.daily} weekly=${counts.weekly} monthly=${counts.monthly} seasonal=${counts.seasonal}`
  )
}

main().catch((err) => {
  console.error("Unexpected error:", err)
  process.exit(1)
})
