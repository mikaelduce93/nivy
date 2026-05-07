/**
 * W3.1 — Coin pipeline verification.
 *
 * Per docs/vision/PRODUCT_WHITEPAPER.md §5 acceptance criteria:
 *   1. parent.test tops up 50 DH → teen.amine sees +5000 coins, payment + ledger rows.
 *   2. teen.amine spends 100 coins → balance -100, XP +10 cashback, ledger rows.
 *
 * Run: `npx tsx scripts/verify-coin-pipeline.ts`
 */

import { createClient } from "@supabase/supabase-js"
import { readFileSync } from "node:fs"

// Tiny .env.local loader (no extra dep).
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
  // env may already be set; silently fall through
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SERVICE_ROLE) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local")
  process.exit(1)
}

const PARENT_ID = "69a068cd-df5b-4165-98b8-33fb93e41117" // parent.test
const TEEN_ID = "37ff4a09-25ca-44c2-a313-141ab6d7e1b9" // teen.amine

const sb = createClient(SUPABASE_URL, SERVICE_ROLE, {
  auth: { persistSession: false, autoRefreshToken: false },
})

function fmt(label: string, ok: boolean, details?: string) {
  const tag = ok ? "PASS" : "FAIL"
  return `  [${tag}] ${label}${details ? ` — ${details}` : ""}`
}

async function main() {
  const lines: string[] = []
  let allOk = true

  console.log("W3.1 coin-pipeline verification")
  console.log("===============================")

  // Pre-flight: ensure e_signature exists (required by top_up_teen gate).
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
      signature_hash: "verify-script-" + Date.now(),
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

  // Snapshot starting state.
  const { data: pre } = await sb
    .from("user_coins")
    .select("balance, lifetime_earned, lifetime_spent")
    .eq("teen_id", TEEN_ID)
    .maybeSingle()
  const { data: preXp } = await sb
    .from("user_xp")
    .select("total_xp")
    .eq("teen_id", TEEN_ID)
    .maybeSingle()
  const startingBalance = pre?.balance ?? 0
  const startingXp = preXp?.total_xp ?? 0
  console.log(`Pre-state: balance=${startingBalance} coins, total_xp=${startingXp}`)

  // === Step 1: top_up_teen(parent, teen, 50) ===
  const topupRes = await sb.rpc("top_up_teen", {
    p_parent_id: PARENT_ID,
    p_teen_id: TEEN_ID,
    p_amount_dh: 50,
  })
  const topupOk = !topupRes.error && (topupRes.data as { success?: boolean })?.success === true
  lines.push(
    fmt(
      "top_up_teen(parent.test, amine, 50 DH)",
      topupOk,
      topupOk
        ? `payment_id=${(topupRes.data as Record<string, unknown>).payment_id}, +${(topupRes.data as Record<string, unknown>).amount_coins} coins`
        : topupRes.error?.message || JSON.stringify(topupRes.data)
    )
  )
  if (!topupOk) allOk = false

  // Read back balance.
  const { data: postTopup } = await sb
    .from("user_coins")
    .select("balance, lifetime_earned")
    .eq("teen_id", TEEN_ID)
    .maybeSingle()
  const balanceAfterTopup = postTopup?.balance ?? 0
  const expectMin = startingBalance + 5000
  const balanceOk = balanceAfterTopup >= expectMin
  lines.push(
    fmt(
      "user_coins.balance >= +5000",
      balanceOk,
      `balance=${balanceAfterTopup}, expected ≥ ${expectMin}`
    )
  )
  if (!balanceOk) allOk = false

  // Verify payment_transactions row exists with status='succeeded'.
  const paymentId = (topupRes.data as Record<string, unknown> | null)?.payment_id as string | undefined
  if (paymentId) {
    const { data: payment } = await sb
      .from("payment_transactions")
      .select("status, amount_dh, amount_coins")
      .eq("id", paymentId)
      .single()
    const payOk = payment?.status === "succeeded" && payment?.amount_coins === 5000
    lines.push(
      fmt(
        "payment_transactions row succeeded",
        payOk,
        `status=${payment?.status}, amount_dh=${payment?.amount_dh}, coins=${payment?.amount_coins}`
      )
    )
    if (!payOk) allOk = false

    const { data: ledger } = await sb
      .from("escrow_ledger")
      .select("direction, amount_coins")
      .eq("related_payment_id", paymentId)
      .maybeSingle()
    const ledgerOk = ledger?.direction === "top_up" && ledger?.amount_coins === 5000
    lines.push(fmt("escrow_ledger top_up row paired", ledgerOk, `direction=${ledger?.direction}`))
    if (!ledgerOk) allOk = false

    const { data: coinTx } = await sb
      .from("coin_transactions")
      .select("transaction_type, amount")
      .eq("source_id", paymentId)
      .maybeSingle()
    const coinTxOk = coinTx?.transaction_type === "topup" && coinTx?.amount === 5000
    lines.push(
      fmt("coin_transactions topup row", coinTxOk, `type=${coinTx?.transaction_type}, amount=${coinTx?.amount}`)
    )
    if (!coinTxOk) allOk = false
  }

  // === Step 2: spend_teen_coins(amine, 100, NULL, NULL) ===
  const spendRes = await sb.rpc("spend_teen_coins", {
    p_teen_id: TEEN_ID,
    p_amount_coins: 100,
    p_partner_id: null,
    p_reward_id: null,
  })
  const spendOk = !spendRes.error && (spendRes.data as { success?: boolean })?.success === true
  lines.push(
    fmt(
      "spend_teen_coins(amine, 100)",
      spendOk,
      spendOk
        ? `new_balance=${(spendRes.data as Record<string, unknown>).new_balance}, xp=+${(spendRes.data as Record<string, unknown>).xp_earned}`
        : spendRes.error?.message || JSON.stringify(spendRes.data)
    )
  )
  if (!spendOk) allOk = false

  // Verify decrement.
  const { data: postSpend } = await sb
    .from("user_coins")
    .select("balance, lifetime_spent")
    .eq("teen_id", TEEN_ID)
    .maybeSingle()
  const balanceAfterSpend = postSpend?.balance ?? 0
  const expectAfter = balanceAfterTopup - 100
  const decOk = balanceAfterSpend === expectAfter
  lines.push(fmt("balance decremented by 100", decOk, `balance=${balanceAfterSpend}, expected=${expectAfter}`))
  if (!decOk) allOk = false

  // Verify XP cashback +10.
  const { data: postXp } = await sb.from("user_xp").select("total_xp").eq("teen_id", TEEN_ID).maybeSingle()
  const xpAfter = postXp?.total_xp ?? 0
  const xpDelta = xpAfter - startingXp
  const xpOk = xpDelta >= 10
  lines.push(fmt("user_xp.total_xp gained ≥ 10 (10% cashback)", xpOk, `delta=+${xpDelta}, total=${xpAfter}`))
  if (!xpOk) allOk = false

  // Verify spend ledger rows.
  const { data: spendCoinTx } = await sb
    .from("coin_transactions")
    .select("transaction_type, amount, balance_after, created_at")
    .eq("teen_id", TEEN_ID)
    .eq("transaction_type", "spend")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle()
  const spendCoinOk = spendCoinTx?.amount === -100
  lines.push(
    fmt("coin_transactions spend row (-100)", spendCoinOk, `amount=${spendCoinTx?.amount}, balance_after=${spendCoinTx?.balance_after}`)
  )
  if (!spendCoinOk) allOk = false

  const { data: spendLedger } = await sb
    .from("escrow_ledger")
    .select("direction, amount_coins, created_at")
    .eq("teen_id", TEEN_ID)
    .eq("direction", "spend")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle()
  const spendLedgerOk = spendLedger?.amount_coins === 100
  lines.push(fmt("escrow_ledger spend row", spendLedgerOk, `direction=${spendLedger?.direction}, coins=${spendLedger?.amount_coins}`))
  if (!spendLedgerOk) allOk = false

  console.log(lines.join("\n"))
  console.log("===============================")
  console.log(allOk ? "RESULT: ALL ACCEPTANCE CRITERIA PASS" : "RESULT: FAILURES present (see above)")
  process.exit(allOk ? 0 : 1)
}

main().catch((err) => {
  console.error("verify-coin-pipeline crashed:", err)
  process.exit(2)
})
