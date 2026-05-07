/**
 * Wave 1.2 — Behavioral signal capture verification.
 *
 * Per docs/vision/PRODUCT_WHITEPAPER.md §19.5 + docs/vision/personalization-engine.md.
 *
 * Test plan:
 *   1. Snapshot current behavioral_signals row count for teen.amine.
 *   2. Call record_signal once for each of the 5 spec target_types
 *      (quiz, mission, event, partner_offer, friend_profile).
 *   3. Read back behavioral_signals — should have ≥5 fresh rows for amine
 *      (post-snapshot) and total > 0.
 *
 * Run: `npx tsx scripts/verify-signal-capture.ts`
 */

import { createClient } from "@supabase/supabase-js"
import { readFileSync } from "node:fs"
import { randomUUID } from "node:crypto"

// Tiny .env.local loader (mirrors verify-coin-pipeline.ts).
try {
  const raw = readFileSync(".env.local", "utf8")
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith("#")) continue
    const eq = trimmed.indexOf("=")
    if (eq === -1) continue
    const key = trimmed.slice(0, eq).trim()
    let value = trimmed.slice(eq + 1).trim()
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1)
    }
    if (!process.env[key]) process.env[key] = value
  }
} catch {
  /* env may already be set */
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SERVICE_ROLE) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local")
  process.exit(1)
}

// teen.amine — same as verify-coin-pipeline.ts.
const TEEN_ID = "37ff4a09-25ca-44c2-a313-141ab6d7e1b9"

const sb = createClient(SUPABASE_URL, SERVICE_ROLE, {
  auth: { persistSession: false, autoRefreshToken: false },
})

interface Probe {
  signal_type:
    | "view"
    | "click"
    | "start"
    | "complete"
    | "abandon"
    | "share"
    | "favorite"
    | "dismiss"
    | "report"
  target_type:
    | "quiz"
    | "defi"
    | "event"
    | "partner_offer"
    | "friend_profile"
    | "quest"
    | "mission"
    | "reward"
    | "feed_post"
    | "mentor"
    | "partner"
  expected_default_weight: number
}

const PROBES: Probe[] = [
  { signal_type: "complete", target_type: "quiz",           expected_default_weight: 3 },
  { signal_type: "complete", target_type: "mission",        expected_default_weight: 3 },
  { signal_type: "view",     target_type: "event",          expected_default_weight: 1 },
  { signal_type: "click",    target_type: "partner_offer",  expected_default_weight: 2 },
  { signal_type: "favorite", target_type: "friend_profile", expected_default_weight: 2 },
]

function fmt(label: string, ok: boolean, details?: string) {
  return `  [${ok ? "PASS" : "FAIL"}] ${label}${details ? ` — ${details}` : ""}`
}

async function main() {
  console.log("W1.2 signal-capture verification")
  console.log("================================")

  const lines: string[] = []
  let allOk = true

  // Snapshot pre-state.
  const { count: preCount, error: preErr } = await sb
    .from("behavioral_signals")
    .select("*", { count: "exact", head: true })
    .eq("teen_id", TEEN_ID)

  if (preErr) {
    console.error("Failed to read pre-state count:", preErr.message)
    process.exit(1)
  }
  const startingCount = preCount ?? 0
  console.log(`Pre-state: ${startingCount} signal rows for teen.amine`)

  const insertedIds: number[] = []
  const runTag = `verify-${Date.now()}-${randomUUID().slice(0, 8)}`

  for (const probe of PROBES) {
    const fakeTargetId = randomUUID()
    const res = await sb.rpc("record_signal", {
      p_teen_id: TEEN_ID,
      p_signal_type: probe.signal_type,
      p_target_type: probe.target_type,
      p_target_id: fakeTargetId,
      p_weight: null,
      p_metadata: { source: "verify-signal-capture", run_tag: runTag, probe: probe.target_type },
    })

    if (res.error) {
      lines.push(
        fmt(
          `record_signal(${probe.signal_type}, ${probe.target_type})`,
          false,
          res.error.message
        )
      )
      allOk = false
      continue
    }

    const id = typeof res.data === "number" ? res.data : Number(res.data)
    insertedIds.push(id)
    lines.push(
      fmt(
        `record_signal(${probe.signal_type}, ${probe.target_type})`,
        true,
        `id=${id}`
      )
    )
  }

  // Read back the rows we just inserted and check default weights.
  if (insertedIds.length > 0) {
    const { data: rows, error: readErr } = await sb
      .from("behavioral_signals")
      .select("id, signal_type, target_type, weight, teen_id")
      .in("id", insertedIds)

    if (readErr) {
      lines.push(fmt("read back inserted rows", false, readErr.message))
      allOk = false
    } else {
      const allOwnedByAmine = (rows ?? []).every((r) => r.teen_id === TEEN_ID)
      lines.push(
        fmt(
          "all inserted rows owned by teen.amine",
          allOwnedByAmine,
          `${rows?.length ?? 0}/${insertedIds.length} rows`
        )
      )
      if (!allOwnedByAmine) allOk = false

      for (const probe of PROBES) {
        const row = rows?.find(
          (r) => r.signal_type === probe.signal_type && r.target_type === probe.target_type
        )
        const weightOk = row != null && Number(row.weight) === probe.expected_default_weight
        lines.push(
          fmt(
            `default weight for (${probe.signal_type}, ${probe.target_type}) == ${probe.expected_default_weight}`,
            weightOk,
            row ? `weight=${row.weight}` : "row missing"
          )
        )
        if (!weightOk) allOk = false
      }
    }
  }

  // Confirm fresh row count grew by ≥5.
  const { count: postCount, error: postErr } = await sb
    .from("behavioral_signals")
    .select("*", { count: "exact", head: true })
    .eq("teen_id", TEEN_ID)

  if (postErr) {
    lines.push(fmt("read post-state count", false, postErr.message))
    allOk = false
  } else {
    const finalCount = postCount ?? 0
    const delta = finalCount - startingCount
    const deltaOk = delta >= PROBES.length
    lines.push(
      fmt(
        `behavioral_signals delta ≥ ${PROBES.length} for teen.amine`,
        deltaOk,
        `pre=${startingCount}, post=${finalCount}, delta=+${delta}`
      )
    )
    if (!deltaOk) allOk = false

    // Also verify the global table is non-empty (defensive).
    const { count: totalCount } = await sb
      .from("behavioral_signals")
      .select("*", { count: "exact", head: true })
    const totalOk = (totalCount ?? 0) > 0
    lines.push(
      fmt("behavioral_signals total rows > 0", totalOk, `total=${totalCount ?? 0}`)
    )
    if (!totalOk) allOk = false

    console.log(lines.join("\n"))
    console.log("================================")
    console.log(
      `VERIFY_COUNT teen.amine pre=${startingCount} post=${finalCount} delta=+${delta} total=${totalCount ?? 0}`
    )
    console.log(allOk ? "RESULT: ALL CHECKS PASS" : "RESULT: FAILURES present (see above)")
    process.exit(allOk ? 0 : 1)
  }

  console.log(lines.join("\n"))
  process.exit(allOk ? 0 : 1)
}

main().catch((err) => {
  console.error("verify-signal-capture crashed:", err)
  process.exit(2)
})
