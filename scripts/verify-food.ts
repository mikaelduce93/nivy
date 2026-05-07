/**
 * W3.2 — Food delivery verification.
 *
 * Spec: docs/vision/food-delivery-restaurants.md
 *
 * Steps:
 *  1. Promote partner.pending → active, sub_category='restaurant', ensure partner_staff
 *  2. Create 3 menu_items: halal+healthy 50DH, fast_food 70DH 800kcal halal, vegetarian non-halal
 *  3. Teen.amine orders the halal+healthy item → autonomous (no challenge yet, ample ceiling) → status='pending'
 *  4. Verify food_orders + food_order_items + coin debit + cashback XP recorded
 *  5. Partner accepts → status='accepted' + partner_transactions row inserted
 *  6. Order non-halal item without parent override → status='pending_approval' (parental_approvals enqueued)
 *  7. Parent creates nutrition_challenge {halal_only=true, max_calories_per_meal=600} → fast_food order blocked → pending_approval
 *
 * Run:  npx tsx scripts/verify-food.ts
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

const TEEN_ID = "37ff4a09-25ca-44c2-a313-141ab6d7e1b9" // teen.amine
const PARENT_ID = "69a068cd-df5b-4165-98b8-33fb93e41117" // parent.test
const PARTNER_ID = "79ff488b-9251-4e7f-aed4-3a79be5497bf" // partner.pending

const sb = createClient(SUPABASE_URL, SERVICE_ROLE, {
  auth: { persistSession: false, autoRefreshToken: false },
})

function fmt(label: string, ok: boolean, details?: string) {
  return `  [${ok ? "PASS" : "FAIL"}] ${label}${details ? ` — ${details}` : ""}`
}

async function main() {
  const lines: string[] = []
  let allOk = true

  console.log("W3.2 food delivery verification")
  console.log("================================")

  // ---- 1. Promote partner ----
  await sb
    .from("partners")
    .update({ status: "active", sub_category: "restaurant" })
    .eq("id", PARTNER_ID)

  // Ensure partner_staff exists for the parent (use parent as staff for the test)
  await sb
    .from("partner_staff")
    .upsert(
      { partner_id: PARTNER_ID, user_id: PARENT_ID, role: "owner", is_active: true },
      { onConflict: "partner_id,user_id" }
    )
  lines.push(fmt("partner promoted to active+restaurant", true, PARTNER_ID))

  // Autonomous mode + high ceiling (~10000 coins) so 5000-coin order does not require approval
  await sb
    .from("teen_budget_limits")
    .upsert(
      { teen_id: TEEN_ID, parent_id: PARENT_ID, mode: "autonomous", max_per_transaction_coins: 100000 },
      { onConflict: "parent_id,teen_id" }
    )

  // Disable any prior nutrition_challenge for clean state
  await sb.from("nutrition_challenges").update({ is_active: false }).eq("teen_id", TEEN_ID)

  // ---- 2. Create 3 menu_items ----
  await sb.from("menu_items").delete().eq("partner_id", PARTNER_ID)

  const { data: menuRows, error: insErr } = await sb
    .from("menu_items")
    .insert([
      {
        partner_id: PARTNER_ID,
        name: "Salade Quinoa Halal",
        category: "main",
        price_dh: 50,
        price_coins: 5000,
        calories: 450,
        nutrition_tags: ["healthy", "halal", "vegetarian"],
        is_halal: true,
      },
      {
        partner_id: PARTNER_ID,
        name: "Big Burger Combo",
        category: "main",
        price_dh: 70,
        price_coins: 7000,
        calories: 800,
        nutrition_tags: ["fast_food"],
        is_halal: true,
      },
      {
        partner_id: PARTNER_ID,
        name: "Wine-glazed Pasta (non-halal)",
        category: "main",
        price_dh: 60,
        price_coins: 6000,
        calories: 700,
        nutrition_tags: ["vegetarian"],
        is_halal: false,
      },
    ])
    .select("id, name")
  if (insErr || !menuRows || menuRows.length !== 3) {
    console.error("menu_items insert failed:", insErr)
    process.exit(1)
  }
  const HALAL = menuRows[0].id
  const FASTFOOD = menuRows[1].id
  const NONHALAL = menuRows[2].id
  lines.push(fmt("3 menu_items created", true))

  // Snapshots
  const { data: preCoins } = await sb.from("user_coins").select("balance").eq("teen_id", TEEN_ID).maybeSingle()
  const preBalance = preCoins?.balance ?? 0
  const { data: preXp } = await sb.from("user_xp").select("total_xp").eq("teen_id", TEEN_ID).maybeSingle()
  const preXpTotal = preXp?.total_xp ?? 0

  // ---- 3. Teen orders the halal+healthy item (5000 coins) ----
  const { data: orderRes, error: orderErr } = await sb.rpc("place_food_order", {
    p_teen_id: TEEN_ID,
    p_partner_id: PARTNER_ID,
    p_delivery_type: "pickup",
    p_items: [{ menu_item_id: HALAL, qty: 1 }],
    p_payment_method: "coins",
  })
  type Rpc = { success?: boolean; status?: string; order_id?: string; total_coins?: number; cashback_xp?: number; error?: string; reason?: string; parent_approval_id?: string }
  const r1 = orderRes as Rpc | null
  const ok1 = !orderErr && r1?.success && r1.status === "pending"
  lines.push(fmt("place_food_order halal+healthy → pending (autonomous)", !!ok1, JSON.stringify(r1 ?? orderErr?.message)))
  if (!ok1) allOk = false
  const orderId = r1?.order_id

  // ---- 4. Verify rows + debit + cashback ----
  if (orderId) {
    const { data: orderRow } = await sb.from("food_orders").select("*").eq("id", orderId).maybeSingle()
    const { data: items } = await sb.from("food_order_items").select("*").eq("order_id", orderId)
    lines.push(fmt("food_orders row", !!orderRow, orderRow?.status ?? "?"))
    lines.push(fmt("food_order_items row(s)", (items?.length ?? 0) === 1, `n=${items?.length}`))

    const { data: postCoins } = await sb.from("user_coins").select("balance").eq("teen_id", TEEN_ID).maybeSingle()
    const debited = (preBalance - (postCoins?.balance ?? 0)) === 5000
    lines.push(fmt("teen coin debit 5000", debited, `pre=${preBalance} post=${postCoins?.balance}`))
    if (!debited) allOk = false

    const { data: postXp } = await sb.from("user_xp").select("total_xp").eq("teen_id", TEEN_ID).maybeSingle()
    const xpDelta = (postXp?.total_xp ?? 0) - preXpTotal
    // 10% cashback on 5000 coins = 500 XP
    const xpOk = xpDelta === 500
    lines.push(fmt("cashback +500 XP (10% of 5000)", xpOk, `delta=${xpDelta}`))
    if (!xpOk) allOk = false

    // ---- 5. Partner accepts ----
    const { data: acceptRes, error: acceptErr } = await sb.rpc("partner_accept_food_order", {
      p_order_id: orderId,
      p_partner_user_id: PARENT_ID, // partner_staff for this test
    })
    const ar = acceptRes as Rpc | null
    const okA = !acceptErr && ar?.success && ar.status === "accepted"
    lines.push(fmt("partner_accept_food_order → accepted", !!okA, JSON.stringify(ar ?? acceptErr?.message)))
    if (!okA) allOk = false

    const { data: ptx } = await sb
      .from("partner_transactions")
      .select("id, amount_coins, status")
      .eq("partner_id", PARTNER_ID)
      .eq("teen_id", TEEN_ID)
      .order("created_at", { ascending: false })
      .limit(1)
    const ptxOk = (ptx?.[0]?.amount_coins ?? 0) === 5000 && ptx?.[0]?.status === "succeeded"
    lines.push(fmt("partner_transactions row inserted", ptxOk, JSON.stringify(ptx?.[0] ?? null)))
    if (!ptxOk) allOk = false
  }

  // ---- 6. Try non-halal item without override → should enqueue approval ----
  const { data: nhRes } = await sb.rpc("place_food_order", {
    p_teen_id: TEEN_ID,
    p_partner_id: PARTNER_ID,
    p_delivery_type: "pickup",
    p_items: [{ menu_item_id: NONHALAL, qty: 1 }],
    p_payment_method: "coins",
  })
  const nh = nhRes as Rpc | null
  const okNH = nh?.success && nh.status === "pending_approval" && (nh.reason === "non_halal_item" || nh.reason === "challenge_halal_only")
  lines.push(fmt("non-halal item → pending_approval (halal-by-default)", !!okNH, JSON.stringify(nh)))
  if (!okNH) allOk = false
  if (nh?.parent_approval_id) {
    const { data: app } = await sb
      .from("parental_approvals")
      .select("id, action_type, status")
      .eq("id", nh.parent_approval_id)
      .maybeSingle()
    lines.push(fmt("parental_approvals row created", !!app && app.status === "pending", JSON.stringify(app)))
  }

  // ---- 7. Parent creates nutrition_challenge → fast food blocked ----
  await sb.from("nutrition_challenges").update({ is_active: false }).eq("teen_id", TEEN_ID)
  const { data: ch, error: chErr } = await sb
    .from("nutrition_challenges")
    .insert({
      parent_id: PARENT_ID,
      teen_id: TEEN_ID,
      title: "Halal only + 600 kcal max",
      nutrition_targets: { halal_only: true, max_calories_per_meal: 600 },
      is_active: true,
    })
    .select("id")
    .single()
  if (chErr) {
    lines.push(fmt("create nutrition_challenge", false, chErr.message))
    allOk = false
  } else {
    lines.push(fmt("nutrition_challenge created (halal_only + max_calories=600)", true, ch.id))
  }

  const { data: ffRes } = await sb.rpc("place_food_order", {
    p_teen_id: TEEN_ID,
    p_partner_id: PARTNER_ID,
    p_delivery_type: "pickup",
    p_items: [{ menu_item_id: FASTFOOD, qty: 1 }],
    p_payment_method: "coins",
  })
  const ff = ffRes as Rpc | null
  const okFF = ff?.success && ff.status === "pending_approval" && (ff.reason === "challenge_max_calories" || ff.reason === "challenge_halal_only")
  lines.push(fmt("fast_food (800 kcal) under challenge → pending_approval (max_calories)", !!okFF, JSON.stringify(ff)))
  if (!okFF) allOk = false

  // ---- Cleanup: deactivate challenge to avoid contaminating future runs ----
  await sb.from("nutrition_challenges").update({ is_active: false }).eq("teen_id", TEEN_ID)

  console.log("")
  for (const l of lines) console.log(l)
  console.log("")
  console.log(allOk ? "RESULT: PASS" : "RESULT: FAIL")
  process.exit(allOk ? 0 : 1)
}

main().catch((e) => {
  console.error("verify-food crashed:", e)
  process.exit(1)
})
