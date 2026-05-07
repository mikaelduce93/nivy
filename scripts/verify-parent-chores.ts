/**
 * Wave 2.1 — Parent custom chores verification.
 *
 * Per docs/vision/parent-custom-chores.md acceptance criteria:
 *   1. parent.test creates "Faire la vaisselle 5 fois = 100 DH + 200 XP"
 *      (one_shot, required_completions=5).
 *   2. teen.amine submits 5 completions.
 *   3. parent.test verifies all 5 → payout fires on the 5th approval.
 *   4. user_coins.balance for amine: +10000 vs pre-state.
 *   5. user_xp.total_xp: +200 vs pre-state.
 *   6. parent_chore_completions: 5 rows with paid_at set, payout_payment_id linked.
 *
 * Run: `npx tsx scripts/verify-parent-chores.ts`
 */

import { createClient } from "@supabase/supabase-js"
import { readFileSync } from "node:fs"

// Tiny .env.local loader.
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
  // env may already be set
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SERVICE_ROLE) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY")
  process.exit(1)
}

const PARENT_ID = "69a068cd-df5b-4165-98b8-33fb93e41117" // parent.test
const TEEN_ID = "37ff4a09-25ca-44c2-a313-141ab6d7e1b9"   // teen.amine

const sb = createClient(SUPABASE_URL, SERVICE_ROLE, {
  auth: { persistSession: false, autoRefreshToken: false },
})

function fmt(label: string, ok: boolean, details?: string) {
  return `  [${ok ? "PASS" : "FAIL"}] ${label}${details ? ` — ${details}` : ""}`
}

async function main() {
  const lines: string[] = []
  let allOk = true

  console.log("Wave 2.1 parent-chores verification")
  console.log("===================================")

  // Pre-flight: e_signature for parent (top_up_teen requires it).
  const { data: sig } = await sb
    .from("e_signatures")
    .select("id")
    .eq("parent_id", PARENT_ID)
    .eq("terms_accepted", true)
    .maybeSingle()
  if (!sig) {
    const { error: sigErr } = await sb.from("e_signatures").insert({
      parent_id: PARENT_ID,
      parent_full_name: "Parent Test",
      signature_hash: "verify-chores-" + Date.now(),
      terms_accepted: true,
    })
    if (sigErr) {
      console.error("Could not seed e_signature:", sigErr.message)
      process.exit(1)
    }
    lines.push("  [SETUP] seeded e_signature for parent.test")
  } else {
    lines.push("  [SETUP] e_signature present for parent.test")
  }

  // Snapshot pre-state.
  const { data: preCoins } = await sb
    .from("user_coins")
    .select("balance")
    .eq("teen_id", TEEN_ID)
    .maybeSingle()
  const { data: preXp } = await sb
    .from("user_xp")
    .select("total_xp")
    .eq("teen_id", TEEN_ID)
    .maybeSingle()
  const startBalance = preCoins?.balance ?? 0
  const startXp = preXp?.total_xp ?? 0
  console.log(`Pre-state: balance=${startBalance} coins, total_xp=${startXp}`)

  // === Step 1: parent creates the chore ===
  const choreTitle = `Faire la vaisselle 5 fois (verify ${Date.now()})`
  const { data: chore, error: choreErr } = await sb
    .from("parent_chores")
    .insert({
      parent_id: PARENT_ID,
      teen_id: TEEN_ID,
      title: choreTitle,
      description: "Vérification automatique Wave 2.1",
      reward_dh: 100,
      reward_xp: 200,
      recurrence: "one_shot",
      required_completions: 5,
      evidence_required: false,
    })
    .select("*")
    .single()

  const createOk = !choreErr && !!chore
  lines.push(fmt("create chore (100 DH + 200 XP, 5 reps)", createOk, choreErr?.message))
  if (!createOk || !chore) {
    console.log(lines.join("\n"))
    process.exit(1)
  }

  // === Step 2: teen submits 5 completions ===
  const completionIds: string[] = []
  for (let i = 0; i < 5; i++) {
    const { data: comp, error: cErr } = await sb
      .from("parent_chore_completions")
      .insert({
        chore_id: chore.id,
        teen_id: TEEN_ID,
        parent_verified: false,
      })
      .select("id")
      .single()
    if (cErr || !comp) {
      lines.push(fmt(`completion ${i + 1}/5 inserted`, false, cErr?.message))
      allOk = false
      break
    }
    completionIds.push(comp.id)
  }
  lines.push(
    fmt(
      "5 completions inserted",
      completionIds.length === 5,
      `count=${completionIds.length}`
    )
  )
  if (completionIds.length !== 5) allOk = false

  // === Step 3: parent verifies all 5 (payout fires on the 5th) ===
  let payoutSeen = false
  let payoutPaymentId: string | null = null
  for (let i = 0; i < completionIds.length; i++) {
    const id = completionIds[i]
    const { error: updErr } = await sb
      .from("parent_chore_completions")
      .update({
        parent_verified: true,
        verified_at: new Date().toISOString(),
        verified_by: PARENT_ID,
      })
      .eq("id", id)
    if (updErr) {
      lines.push(fmt(`verify completion ${i + 1}`, false, updErr.message))
      allOk = false
      continue
    }
    const { data: payoutData, error: rpcErr } = await sb.rpc(
      "payout_chore_reward",
      { p_completion_id: id, p_verified_by: PARENT_ID }
    )
    if (rpcErr) {
      lines.push(fmt(`payout RPC for completion ${i + 1}`, false, rpcErr.message))
      allOk = false
      continue
    }
    const result = payoutData as Record<string, unknown>
    if (result?.paid === true) {
      payoutSeen = true
      payoutPaymentId = (result.payment_id as string) ?? null
      lines.push(
        fmt(
          `payout fired at completion ${i + 1}`,
          true,
          `payment_id=${payoutPaymentId}, amount_coins=${result.amount_coins}, xp=${result.xp_awarded}`
        )
      )
    }
  }
  if (!payoutSeen) {
    lines.push(fmt("payout fired on 5th verification", false, "no payout signaled"))
    allOk = false
  }

  // === Step 4: balance delta ===
  const { data: postCoins } = await sb
    .from("user_coins")
    .select("balance")
    .eq("teen_id", TEEN_ID)
    .maybeSingle()
  const endBalance = postCoins?.balance ?? 0
  const balanceDelta = endBalance - startBalance
  const balanceOk = balanceDelta >= 10000
  lines.push(
    fmt(
      "user_coins.balance delta = +10000",
      balanceOk,
      `delta=${balanceDelta} (pre=${startBalance}, post=${endBalance})`
    )
  )
  if (!balanceOk) allOk = false

  // === Step 5: XP delta ===
  const { data: postXp } = await sb
    .from("user_xp")
    .select("total_xp")
    .eq("teen_id", TEEN_ID)
    .maybeSingle()
  const endXp = postXp?.total_xp ?? 0
  const xpDelta = endXp - startXp
  const xpOk = xpDelta >= 200
  lines.push(
    fmt(
      "user_xp.total_xp delta >= 200",
      xpOk,
      `delta=+${xpDelta} (pre=${startXp}, post=${endXp})`
    )
  )
  if (!xpOk) allOk = false

  // === Step 6: completions all linked + paid ===
  const { data: finalComps } = await sb
    .from("parent_chore_completions")
    .select("id, paid_at, payout_payment_id")
    .eq("chore_id", chore.id)
  const allPaid =
    (finalComps?.length ?? 0) === 5 &&
    finalComps!.every((c) => !!c.paid_at && !!c.payout_payment_id)
  lines.push(
    fmt(
      "5 completions paid_at + payout_payment_id linked",
      allPaid,
      `${finalComps?.filter((c) => c.paid_at).length ?? 0}/5 paid`
    )
  )
  if (!allPaid) allOk = false

  // Bonus: chore deactivated for one_shot.
  const { data: finalChore } = await sb
    .from("parent_chores")
    .select("is_active")
    .eq("id", chore.id)
    .maybeSingle()
  const archivedOk = finalChore?.is_active === false
  lines.push(fmt("one_shot chore archived after payout", archivedOk, `is_active=${finalChore?.is_active}`))
  if (!archivedOk) allOk = false

  // Bonus: coin_transactions tagged source_type='chore_payout'.
  if (payoutPaymentId) {
    const { data: ctx } = await sb
      .from("coin_transactions")
      .select("source_type, transaction_type, amount")
      .eq("source_id", payoutPaymentId)
      .maybeSingle()
    const taggedOk = ctx?.source_type === "chore_payout" && ctx?.amount === 10000
    lines.push(
      fmt(
        "coin_transactions tagged chore_payout",
        taggedOk,
        `source_type=${ctx?.source_type}, amount=${ctx?.amount}`
      )
    )
    if (!taggedOk) allOk = false
  }

  console.log(lines.join("\n"))
  console.log("===================================")
  console.log(allOk ? "RESULT: ALL ACCEPTANCE CRITERIA PASS" : "RESULT: FAILURES present")
  process.exit(allOk ? 0 : 1)
}

main().catch((err) => {
  console.error("verify-parent-chores crashed:", err)
  process.exit(2)
})
