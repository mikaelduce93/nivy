/**
 * W2.4 — Marketplace C2C verification.
 *
 * Spec: docs/vision/marketplace-c2c.md
 *
 * Steps:
 *   1. teen.amine creates a listing "Used jacket — 200 coins" → moderation_queue
 *   2. Admin (service role) approves → listing.status='active'
 *   3. Ephemeral teen2 buyer (created here) buys → escrow held; coin debit + tx
 *   4. confirm_receipt → seller (amine) credited 184 coins (200 - 8% fee),
 *                        buyer earns 20 XP cashback (10% of 200)
 *   5. Re-buy on same listing → fails (status='sold')
 *   6. Cleanup ephemeral buyer + revert amine state.
 *
 * Run:  npx tsx scripts/verify-marketplace.ts
 *
 * P2 TODO: AML 1000 DH/month/teen seller hard cap is not enforced atomically
 * yet (warn at 800 DH/month, hard cap at 1000 DH/month). Track in
 * docs/vision/marketplace-c2c.md acceptance + invariants once implemented.
 */

import { createClient } from "@supabase/supabase-js"
import { readFileSync } from "node:fs"

try {
  const raw = readFileSync(".env.local", "utf8")
  for (const line of raw.split(/\r?\n/)) {
    const t = line.trim()
    if (!t || t.startsWith("#")) continue
    const eq = t.indexOf("=")
    if (eq === -1) continue
    const k = t.slice(0, eq).trim()
    let v = t.slice(eq + 1).trim()
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1)
    if (!process.env[k]) process.env[k] = v
  }
} catch {
  // ignore
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!SUPABASE_URL || !SERVICE_ROLE) {
  console.error("Missing SUPABASE creds in .env.local")
  process.exit(1)
}

const SELLER_ID = "37ff4a09-25ca-44c2-a313-141ab6d7e1b9" // teen.amine
const PARENT_ID = "69a068cd-df5b-4165-98b8-33fb93e41117" // parent.test

const sb = createClient(SUPABASE_URL, SERVICE_ROLE, {
  auth: { persistSession: false, autoRefreshToken: false },
})

function fmt(label: string, ok: boolean, details?: string) {
  return `  [${ok ? "PASS" : "FAIL"}] ${label}${details ? ` — ${details}` : ""}`
}

async function main() {
  const lines: string[] = []
  let allOk = true

  console.log("W2.4 marketplace verification")
  console.log("=============================")

  // -------- Setup: ephemeral teen2 buyer --------
  const buyerEmail = `teen.buyer.${Date.now()}@teenclub.local`
  const { data: created, error: createErr } = await sb.auth.admin.createUser({
    email: buyerEmail,
    password: "Test123!",
    email_confirm: true,
  })
  if (createErr || !created.user) {
    console.error("Failed to create ephemeral buyer:", createErr?.message)
    process.exit(1)
  }
  const BUYER_ID = created.user.id

  await sb.from("users").upsert({ id: BUYER_ID, email: buyerEmail }, { onConflict: "id" })
  await sb.from("teens").upsert(
    { id: BUYER_ID, parent_id: PARENT_ID, first_name: "Buyer", last_name: "Test" },
    { onConflict: "id" }
  )
  // Link buyer to parent.test (so buy_listing can find a parent if needed)
  await sb.from("parent_teen_links").upsert(
    { parent_id: PARENT_ID, teen_id: BUYER_ID },
    { onConflict: "parent_id,teen_id" }
  )
  // Autonomous mode + ample ceiling so no parental approval is required for 200-coin buy
  await sb.from("teen_budget_limits").upsert(
    { teen_id: BUYER_ID, parent_id: PARENT_ID, mode: "autonomous", max_per_transaction_coins: 1000 },
    { onConflict: "parent_id,teen_id" }
  )
  // Wallet: 500 coins so 200-coin spend is funded
  await sb.from("user_coins").delete().eq("teen_id", BUYER_ID)
  await sb.from("user_coins").insert({ teen_id: BUYER_ID, balance: 500, lifetime_earned: 500, lifetime_spent: 0 })

  lines.push(fmt("seed ephemeral teen2 buyer", true, BUYER_ID))

  // Snapshot amine's pre-state
  const { data: preSeller } = await sb.from("user_coins").select("balance").eq("teen_id", SELLER_ID).maybeSingle()
  const preSellerBalance = preSeller?.balance ?? 0
  const { data: preXp } = await sb.from("user_xp").select("total_xp").eq("teen_id", BUYER_ID).maybeSingle()
  const preBuyerXp = preXp?.total_xp ?? 0

  // -------- 1. Create listing --------
  const { data: createRes, error: createListingErr } = await sb.rpc("create_listing", {
    p_seller_id: SELLER_ID,
    p_params: {
      title: "Used jacket — verify run",
      description: "Veste polaire en bon etat. Taille M.",
      category: "clothing",
      price_coins: "200",
      condition: "good",
      city: "Casablanca",
    },
  })
  if (createListingErr || !createRes || !(createRes as { success?: boolean }).success) {
    lines.push(fmt("teen.amine creates listing", false, JSON.stringify(createRes ?? createListingErr?.message)))
    allOk = false
  }
  const listingId = (createRes as { listing_id?: string } | null)?.listing_id
  const moderationId = (createRes as { moderation_id?: string } | null)?.moderation_id
  if (!listingId) {
    console.error("No listing created, aborting:", JSON.stringify(createRes), createListingErr?.message)
    process.exit(1)
  }
  lines.push(fmt("listing created (pending_moderation)", true, listingId))
  lines.push(fmt("moderation_queue row inserted", !!moderationId, moderationId ?? ""))

  // -------- 2. Admin approves --------
  const { error: modErr } = await sb
    .from("marketplace_listings")
    .update({ status: "active" })
    .eq("id", listingId)
  if (moderationId) {
    await sb
      .from("moderation_queue")
      .update({ status: "approved", reviewed_at: new Date().toISOString() })
      .eq("id", moderationId)
  }
  lines.push(fmt("admin approve → status='active'", !modErr, modErr?.message))

  // -------- 3. Buyer buys --------
  const { data: buyRes, error: buyErr } = await sb.rpc("buy_listing", {
    p_listing_id: listingId,
    p_buyer_id: BUYER_ID,
    p_meet_method: "school",
    p_meet_location_partner_id: null,
  })
  const buyJson = buyRes as { success?: boolean; status?: string; transaction_id?: string; error?: string } | null
  const buyOk = !buyErr && !!buyJson?.success && buyJson?.status === "escrow"
  lines.push(fmt("buy → escrow held", buyOk, JSON.stringify(buyJson)))
  if (!buyOk) allOk = false
  const txId = buyJson?.transaction_id
  if (!txId) {
    console.error("No tx, aborting. Lines so far:")
    for (const l of lines) console.log(l)
    process.exit(1)
  }

  // Buyer balance debited
  const { data: postBuyer } = await sb.from("user_coins").select("balance").eq("teen_id", BUYER_ID).maybeSingle()
  const buyerBalance = postBuyer?.balance ?? 0
  lines.push(fmt("buyer balance = 500 - 200 = 300", buyerBalance === 300, `balance=${buyerBalance}`))
  if (buyerBalance !== 300) allOk = false

  // Listing status sold
  const { data: postListing } = await sb.from("marketplace_listings").select("status").eq("id", listingId).maybeSingle()
  lines.push(fmt("listing status='sold'", postListing?.status === "sold", postListing?.status ?? "?"))
  if (postListing?.status !== "sold") allOk = false

  // -------- 4. confirm_receipt --------
  const { data: confirmRes, error: confirmErr } = await sb.rpc("confirm_receipt", {
    p_transaction_id: txId,
    p_buyer_id: BUYER_ID,
  })
  const confirmJson = confirmRes as {
    success?: boolean; status?: string; seller_credit_coins?: number; platform_fee_coins?: number; cashback_xp?: number
  } | null
  const confirmOk = !confirmErr && confirmJson?.success && confirmJson.status === "completed"
    && confirmJson.seller_credit_coins === 184 && confirmJson.platform_fee_coins === 16 && confirmJson.cashback_xp === 20
  lines.push(fmt("confirm_receipt: 184 credit / 16 fee / 20 XP cashback", !!confirmOk, JSON.stringify(confirmJson)))
  if (!confirmOk) allOk = false

  // Seller credit reflected in user_coins
  const { data: postSeller } = await sb.from("user_coins").select("balance").eq("teen_id", SELLER_ID).maybeSingle()
  const sellerCredited = (postSeller?.balance ?? 0) === preSellerBalance + 184
  lines.push(fmt("seller user_coins +184", sellerCredited,
    `pre=${preSellerBalance} post=${postSeller?.balance}`))
  if (!sellerCredited) allOk = false

  // Buyer XP cashback reflected
  const { data: postBuyerXp } = await sb.from("user_xp").select("total_xp").eq("teen_id", BUYER_ID).maybeSingle()
  const xpDelta = (postBuyerXp?.total_xp ?? 0) - preBuyerXp
  lines.push(fmt("buyer XP +20 cashback", xpDelta === 20, `delta=${xpDelta}`))
  if (xpDelta !== 20) allOk = false

  // -------- 5. Re-buy fails --------
  const { data: rebuyRes } = await sb.rpc("buy_listing", {
    p_listing_id: listingId,
    p_buyer_id: BUYER_ID,
    p_meet_method: "school",
    p_meet_location_partner_id: null,
  })
  const rebuyJson = rebuyRes as { success?: boolean; error?: string } | null
  const rebuyOk = !!rebuyJson && rebuyJson.success === false
  lines.push(fmt("re-buy on sold listing fails", rebuyOk, rebuyJson?.error ?? "?"))
  if (!rebuyOk) allOk = false

  // -------- 6. Safety regex test (bonus invariants) --------
  const { data: phoneRes } = await sb.rpc("create_listing", {
    p_seller_id: SELLER_ID,
    p_params: {
      title: "Bike",
      description: "Call me at 0612345678 to negotiate",
      category: "sport",
      price_coins: "100",
      condition: "good",
      city: "Casa",
    },
  })
  const phoneOk = (phoneRes as { error?: string } | null)?.error === "contact_info_blocked"
  lines.push(fmt("phone-number regex blocks listing", phoneOk,
    JSON.stringify(phoneRes)))
  if (!phoneOk) allOk = false

  const { data: weaponRes } = await sb.rpc("create_listing", {
    p_seller_id: SELLER_ID,
    p_params: {
      title: "Old hunting knife",
      description: "Used but sharp",
      category: "other",
      price_coins: "50",
      condition: "fair",
      city: "Casa",
    },
  })
  const weaponOk = (weaponRes as { error?: string } | null)?.error === "blocked_category"
  lines.push(fmt("weapon-keyword blocks listing", weaponOk, JSON.stringify(weaponRes)))
  if (!weaponOk) allOk = false

  // -------- Cleanup ephemeral buyer + listing --------
  await sb.from("marketplace_disputes").delete().eq("transaction_id", txId)
  await sb.from("marketplace_transactions").delete().eq("id", txId)
  await sb.from("marketplace_listings").delete().eq("id", listingId)
  await sb.from("coin_transactions").delete().eq("teen_id", BUYER_ID)
  await sb.from("xp_transactions").delete().eq("teen_id", BUYER_ID)
  await sb.from("user_xp").delete().eq("teen_id", BUYER_ID)
  await sb.from("user_coins").delete().eq("teen_id", BUYER_ID)
  await sb.from("teen_budget_limits").delete().eq("teen_id", BUYER_ID)
  await sb.from("parent_teen_links").delete().eq("teen_id", BUYER_ID)
  await sb.from("teens").delete().eq("id", BUYER_ID)
  await sb.from("users").delete().eq("id", BUYER_ID)
  await sb.auth.admin.deleteUser(BUYER_ID)
  // Revert seller credit to keep verify idempotent
  await sb.from("user_coins").update({ balance: preSellerBalance }).eq("teen_id", SELLER_ID)
  await sb.from("coin_transactions").delete().eq("teen_id", SELLER_ID).eq("source_type", "marketplace_sale")
  await sb.from("user_seller_stats").delete().eq("user_id", SELLER_ID)

  console.log("\nResults:")
  for (const l of lines) console.log(l)
  console.log("\n" + (allOk ? "ALL CHECKS PASSED" : "ONE OR MORE CHECKS FAILED"))
  process.exit(allOk ? 0 : 1)
}

main().catch((e) => { console.error(e); process.exit(1) })
