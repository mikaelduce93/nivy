/**
 * Wave 2.2 — Allowance + savings goals verification.
 *
 * Per docs/vision/allowance-savings.md acceptance criteria:
 *   1. parent.test creates a 20 DH/week Friday allowance for amine.
 *   2. Set next_disbursement_at = NOW() and call disburse_allowance manually
 *      → 2000 coins land, allowance_disbursements row inserted.
 *   3. amine creates "Tablette" goal (5000 coins).
 *   4. amine locks 1000 coins → spendable = balance - 1000.
 *   5. parent configures 50% match cap 500 → next lock 200
 *      → trigger fires, parent escrows extra 100, parent_match contribution row.
 *   6. goals.current_saved_coins reflects lock + match.
 *
 * Run: `npx tsx scripts/verify-allowance-savings.ts`
 */

import { createClient } from "@supabase/supabase-js"
import { readFileSync } from "node:fs"

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
} catch {}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SERVICE_ROLE) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local")
  process.exit(1)
}

const PARENT_ID = "69a068cd-df5b-4165-98b8-33fb93e41117"
const TEEN_ID = "37ff4a09-25ca-44c2-a313-141ab6d7e1b9"

const sb = createClient(SUPABASE_URL, SERVICE_ROLE, {
  auth: { persistSession: false, autoRefreshToken: false },
})

function fmt(label: string, ok: boolean, details?: string) {
  return `  [${ok ? "PASS" : "FAIL"}] ${label}${details ? ` — ${details}` : ""}`
}

async function main() {
  const lines: string[] = []
  let allOk = true

  console.log("Wave 2.2 — allowance + savings verification")
  console.log("===========================================")

  // Pre-flight: e_signature.
  const { data: sig } = await sb
    .from("e_signatures")
    .select("id")
    .eq("parent_id", PARENT_ID)
    .eq("terms_accepted", true)
    .maybeSingle()
  if (!sig) {
    await sb.from("e_signatures").insert({
      parent_id: PARENT_ID,
      parent_full_name: "Parent Test",
      signature_hash: "verify-allowance-" + Date.now(),
      terms_accepted: true,
    })
  }

  // Cleanup any prior runs of this script.
  await sb.from("savings_goals").delete().eq("teen_id", TEEN_ID).eq("title", "Tablette")
  await sb.from("parent_allowances").delete().eq("parent_id", PARENT_ID).eq("teen_id", TEEN_ID)

  const { data: preCoins } = await sb
    .from("user_coins")
    .select("balance")
    .eq("teen_id", TEEN_ID)
    .maybeSingle()
  const startingBalance = preCoins?.balance ?? 0
  console.log(`Pre-state: balance=${startingBalance}`)

  // === Step 1: create allowance ===
  const fridayAt9 = new Date()
  fridayAt9.setHours(9, 0, 0, 0)
  // ensure friday in future:
  const dow = fridayAt9.getDay()
  fridayAt9.setDate(fridayAt9.getDate() + ((5 - dow + 7) % 7 || 7))
  const { data: allowance, error: aErr } = await sb
    .from("parent_allowances")
    .insert({
      parent_id: PARENT_ID,
      teen_id: TEEN_ID,
      amount_dh: 20,
      cadence: "weekly",
      cadence_config: { day_of_week: 5, hour: 9 },
      next_disbursement_at: fridayAt9.toISOString(),
    })
    .select("*")
    .single()
  const allowanceOk = !aErr && allowance != null
  lines.push(fmt("create allowance 20DH/weekly Friday", allowanceOk, aErr?.message))
  if (!allowanceOk) {
    console.log(lines.join("\n"))
    process.exit(1)
  }

  // === Step 2: force next_disbursement_at = NOW() and call disburse_allowance ===
  await sb
    .from("parent_allowances")
    .update({ next_disbursement_at: new Date(Date.now() - 1000).toISOString() })
    .eq("id", allowance!.id)

  const disbRes = await sb.rpc("disburse_allowance", { p_allowance_id: allowance!.id })
  const disbOk = !disbRes.error && (disbRes.data as { success?: boolean })?.success === true
  lines.push(
    fmt(
      "disburse_allowance(allowance_id)",
      disbOk,
      disbOk
        ? `status=${(disbRes.data as Record<string, unknown>).status}, payment_id=${(disbRes.data as Record<string, unknown>).payment_id}`
        : disbRes.error?.message || JSON.stringify(disbRes.data)
    )
  )
  if (!disbOk) allOk = false

  // Verify +2000 coins.
  const { data: postDisb } = await sb
    .from("user_coins")
    .select("balance")
    .eq("teen_id", TEEN_ID)
    .maybeSingle()
  const balanceAfterDisb = postDisb?.balance ?? 0
  const balOk = balanceAfterDisb >= startingBalance + 2000
  lines.push(
    fmt(
      "user_coins.balance += 2000 from allowance",
      balOk,
      `balance=${balanceAfterDisb}, expected ≥ ${startingBalance + 2000}`
    )
  )
  if (!balOk) allOk = false

  // Verify allowance_disbursements row.
  const { data: disbRow } = await sb
    .from("allowance_disbursements")
    .select("status")
    .eq("allowance_id", allowance!.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle()
  const disbRowOk = disbRow?.status === "succeeded"
  lines.push(fmt("allowance_disbursements row succeeded", disbRowOk, `status=${disbRow?.status}`))
  if (!disbRowOk) allOk = false

  // Idempotency: call again — should reject (not_due).
  const dupRes = await sb.rpc("disburse_allowance", { p_allowance_id: allowance!.id })
  const dupOk = (dupRes.data as { success?: boolean; error?: string })?.error === "not_due"
  lines.push(fmt("disburse idempotent (second call rejected)", dupOk, JSON.stringify(dupRes.data)))
  if (!dupOk) allOk = false

  // === Step 3: create Tablette goal ===
  const targetDate = new Date()
  targetDate.setMonth(11)
  targetDate.setDate(31)
  const { data: goal, error: gErr } = await sb
    .from("savings_goals")
    .insert({
      teen_id: TEEN_ID,
      title: "Tablette",
      target_coins: 5000,
      target_date: targetDate.toISOString().slice(0, 10),
    })
    .select("*")
    .single()
  const goalOk = !gErr && goal != null
  lines.push(fmt("create savings goal 'Tablette' 5000 coins", goalOk, gErr?.message))
  if (!goalOk) {
    console.log(lines.join("\n"))
    process.exit(1)
  }

  // === Step 4: lock 1000 ===
  const lockRes = await sb.rpc("lock_to_goal", {
    p_teen_id: TEEN_ID,
    p_goal_id: goal!.id,
    p_amount: 1000,
  })
  const lockOk = (lockRes.data as { success?: boolean })?.success === true
  lines.push(
    fmt(
      "lock_to_goal(1000)",
      lockOk,
      lockOk ? `new_saved=${(lockRes.data as Record<string, unknown>).new_saved}` : JSON.stringify(lockRes.data)
    )
  )
  if (!lockOk) allOk = false

  // Spendable = balance - 1000.
  const { data: spend } = await sb
    .from("user_coins_spendable")
    .select("total, locked_in_goals, spendable")
    .eq("teen_id", TEEN_ID)
    .maybeSingle()
  const spendOk = spend?.spendable === (spend?.total ?? 0) - 1000 && spend?.locked_in_goals === 1000
  lines.push(
    fmt(
      "spendable view: total - locked = spendable",
      spendOk,
      `total=${spend?.total} locked=${spend?.locked_in_goals} spendable=${spend?.spendable}`
    )
  )
  if (!spendOk) allOk = false

  // === Step 5: parent configures 50% match cap 500 + amine locks 200 → +100 match ===
  const matchCfg = await sb
    .from("savings_goals")
    .update({
      parent_id: PARENT_ID,
      parent_match_pct: 50,
      parent_match_cap_coins: 500,
    })
    .eq("id", goal!.id)
    .select("*")
    .single()
  const matchCfgOk = !matchCfg.error
  lines.push(fmt("configure parent match 50% cap 500", matchCfgOk, matchCfg.error?.message))

  const lock2 = await sb.rpc("lock_to_goal", {
    p_teen_id: TEEN_ID,
    p_goal_id: goal!.id,
    p_amount: 200,
  })
  const lock2Ok = (lock2.data as { success?: boolean })?.success === true
  lines.push(
    fmt(
      "lock_to_goal(200) triggers parent match",
      lock2Ok,
      lock2Ok ? "ok" : JSON.stringify(lock2.data)
    )
  )
  if (!lock2Ok) allOk = false

  const { data: postGoal } = await sb
    .from("savings_goals")
    .select("current_saved_coins, parent_match_contributed_coins")
    .eq("id", goal!.id)
    .single()
  // Expected: 1000 (initial lock) + 200 (second lock) + 100 (50% match) = 1300
  const goalSavedOk = postGoal?.current_saved_coins === 1300
  const goalMatchOk = postGoal?.parent_match_contributed_coins === 100
  lines.push(
    fmt(
      "goal.current_saved_coins = 1300 (lock+match)",
      goalSavedOk,
      `current_saved=${postGoal?.current_saved_coins}`
    )
  )
  lines.push(
    fmt(
      "goal.parent_match_contributed_coins = 100",
      goalMatchOk,
      `match=${postGoal?.parent_match_contributed_coins}`
    )
  )
  if (!goalSavedOk) allOk = false
  if (!goalMatchOk) allOk = false

  // savings_contributions has source='parent_match' row.
  const { data: pmRow } = await sb
    .from("savings_contributions")
    .select("amount_coins")
    .eq("goal_id", goal!.id)
    .eq("source", "parent_match")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle()
  const pmOk = pmRow?.amount_coins === 100
  lines.push(fmt("savings_contributions source=parent_match (+100)", pmOk, `amount=${pmRow?.amount_coins}`))
  if (!pmOk) allOk = false

  // Cleanup so next run is reproducible.
  await sb.from("savings_goals").delete().eq("id", goal!.id)
  await sb.from("parent_allowances").delete().eq("id", allowance!.id)

  console.log(lines.join("\n"))
  console.log("===========================================")
  console.log(allOk ? "RESULT: ALL ACCEPTANCE CRITERIA PASS" : "RESULT: FAILURES present")
  process.exit(allOk ? 0 : 1)
}

main().catch((err) => {
  console.error("verify-allowance-savings crashed:", err)
  process.exit(2)
})
