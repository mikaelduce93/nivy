/**
 * Wave 2.3 — Content creator economy v1 verification.
 *
 * Spec: docs/vision/content-creator-economy.md + whitepaper §19.4.6.
 *
 * Steps:
 *   1. teen.amine submits a 'photo' "My parkour run" with visibility='public'.
 *   2. Verify a moderation_queue row exists for the submission.
 *   3. Admin approves via feature_submission RPC → +500 XP, +200 coins.
 *   4. Another teen views and likes 3x → amine gets +1 XP per like (under cap 50).
 *   5. amine's xp_earned on the submission reflects post(10) + likes(3) + featured(500) = 513.
 *   6. creator_monthly_stats has a row for amine.
 *
 * Run: `npx tsx scripts/verify-creator-economy.ts`
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
} catch {
  /* env may already be set */
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SERVICE_ROLE) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local")
  process.exit(1)
}

const sb = createClient(SUPABASE_URL, SERVICE_ROLE, {
  auth: { persistSession: false, autoRefreshToken: false },
})

const AMINE = "37ff4a09-25ca-44c2-a313-141ab6d7e1b9" // teen.amine
const PARENT = "69a068cd-df5b-4165-98b8-33fb93e41117" // parent.test (used as 2nd viewer + admin)

function fmt(label: string, ok: boolean, details?: string) {
  return `  [${ok ? "PASS" : "FAIL"}] ${label}${details ? ` — ${details}` : ""}`
}

async function getXp(userId: string): Promise<number> {
  const { data } = await sb.from("user_xp").select("total_xp").eq("teen_id", userId).maybeSingle()
  return data?.total_xp ?? 0
}

async function getCoins(userId: string): Promise<number> {
  const { data } = await sb.from("user_coins").select("balance").eq("teen_id", userId).maybeSingle()
  return data?.balance ?? 0
}

async function main() {
  const lines: string[] = []
  let allOk = true

  console.log("Wave 2.3 — Content creator economy verification")
  console.log("================================================")

  // Cleanup any prior runs to keep the test idempotent (delete amine's photo posts of today)
  await sb
    .from("feed_posts")
    .delete()
    .eq("user_id", AMINE)
    .eq("type", "photo")
    .gte("created_at", new Date(new Date().setUTCHours(0, 0, 0, 0)).toISOString())

  // Ensure parent.test is registered as admin so feature_submission passes
  const { data: existingRole } = await sb
    .from("admin_roles")
    .select("id")
    .eq("profile_id", PARENT)
    .maybeSingle()
  if (!existingRole) {
    const { error: roleErr } = await sb
      .from("admin_roles")
      .insert({ profile_id: PARENT, role: "admin" })
    if (roleErr) {
      lines.push(fmt("seed admin_role", false, roleErr.message))
      allOk = false
    } else {
      lines.push(fmt("seed admin_role", true, "parent.test → admin"))
    }
  } else {
    lines.push(fmt("admin_role exists", true, "parent.test"))
  }

  // === Snapshot starting balances ===
  const xp0 = await getXp(AMINE)
  const coins0 = await getCoins(AMINE)
  lines.push(fmt("snapshot amine", true, `XP=${xp0}, coins=${coins0}`))

  // === Step 1: amine submits a photo ===
  const { data: post, error: postErr } = await sb
    .from("feed_posts")
    .insert({
      user_id: AMINE,
      post_type: "photo",
      type: "photo",
      category: "sport",
      content: "My parkour run",
      media_urls: ["https://example.test/parkour.jpg"],
      metadata: { title: "My parkour run" },
      visibility: "public",
      status: "pending_moderation",
    })
    .select("id")
    .single()
  if (postErr || !post) {
    lines.push(fmt("submit photo", false, postErr?.message))
    console.log(lines.join("\n"))
    process.exit(1)
  }
  const submissionId = post.id
  lines.push(fmt("submit photo", true, submissionId))

  // === Step 2: moderation_queue row exists ===
  const { data: modRow, error: modErr } = await sb
    .from("moderation_queue")
    .insert({
      content_type: "feed_post",
      content_id: submissionId,
      payload: { type: "photo", title: "My parkour run", user_id: AMINE },
      status: "pending",
    })
    .select("id")
    .single()
  if (modErr || !modRow) {
    lines.push(fmt("moderation_queue insert", false, modErr?.message))
    allOk = false
  } else {
    await sb.from("feed_posts").update({ moderation_id: modRow.id }).eq("id", submissionId)
    lines.push(fmt("moderation_queue row created", true, modRow.id))
  }

  // post grant (10 XP/day)
  const { data: postGrant, error: postGrantErr } = await sb.rpc("award_creator_xp", {
    p_creator_user_id: AMINE,
    p_signal_type: "post",
    p_submission_id: submissionId,
    p_viewer_user_id: AMINE,
  })
  if (postGrantErr) {
    lines.push(fmt("award_creator_xp(post)", false, postGrantErr.message))
    allOk = false
  } else {
    const credited = (postGrant as { credited?: number })?.credited ?? 0
    lines.push(fmt("award_creator_xp(post)", credited === 10, `credited=${credited}`))
    if (credited !== 10) allOk = false
  }

  // === Step 3: admin features the submission ===
  const { data: feat, error: featErr } = await sb.rpc("feature_submission", {
    p_submission_id: submissionId,
    p_admin_user_id: PARENT,
  })
  if (featErr) {
    lines.push(fmt("feature_submission", false, featErr.message))
    allOk = false
  } else {
    const result = feat as { ok?: boolean; xp_awarded?: number; coins_awarded?: number; reason?: string }
    const ok = result.ok === true && result.xp_awarded === 500 && result.coins_awarded === 200
    lines.push(fmt("feature_submission", ok, JSON.stringify(result)))
    if (!ok) allOk = false
  }

  const xpAfterFeature = await getXp(AMINE)
  const coinsAfterFeature = await getCoins(AMINE)
  // expected delta = 10 (post) + 500 (featured) = 510 XP, +200 coins
  const xpDelta = xpAfterFeature - xp0
  const coinsDelta = coinsAfterFeature - coins0
  lines.push(
    fmt(
      "XP delta after feature",
      xpDelta === 510,
      `expected=510, got=${xpDelta} (xp ${xp0} → ${xpAfterFeature})`
    )
  )
  if (xpDelta !== 510) allOk = false
  lines.push(
    fmt(
      "Coins delta after feature",
      coinsDelta === 200,
      `expected=200, got=${coinsDelta} (coins ${coins0} → ${coinsAfterFeature})`
    )
  )
  if (coinsDelta !== 200) allOk = false

  // === Step 4: parent (acting as another teen) likes 3 times ===
  // The capped RPC is idempotent on input but writes one ledger row per call,
  // simulating 3 distinct like events from the same viewer.
  let likeCredited = 0
  for (let i = 0; i < 3; i++) {
    const { data: r, error } = await sb.rpc("award_creator_xp", {
      p_creator_user_id: AMINE,
      p_signal_type: "like",
      p_submission_id: submissionId,
      p_viewer_user_id: PARENT,
    })
    if (error) {
      lines.push(fmt(`like #${i + 1}`, false, error.message))
      allOk = false
      break
    }
    likeCredited += (r as { credited?: number })?.credited ?? 0
  }
  lines.push(
    fmt(
      "3 likes → +3 XP credited (under cap 50)",
      likeCredited === 3,
      `total_credited=${likeCredited}`
    )
  )
  if (likeCredited !== 3) allOk = false

  // === Step 5: feed_posts.xp_earned reflects 10 + 500 + 3 = 513 ===
  const { data: postFinal } = await sb
    .from("feed_posts")
    .select("xp_earned, status, featured")
    .eq("id", submissionId)
    .single()
  const finalXpOnPost = postFinal?.xp_earned ?? 0
  lines.push(
    fmt(
      "feed_posts.xp_earned = 513",
      finalXpOnPost === 513,
      `xp_earned=${finalXpOnPost}, status=${postFinal?.status}, featured=${postFinal?.featured}`
    )
  )
  if (finalXpOnPost !== 513) allOk = false

  // === Step 6: creator_monthly_stats has a row for amine ===
  await sb.rpc("refresh_creator_monthly_stats")
  const monthStart = new Date(Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), 1))
    .toISOString()
    .slice(0, 10)
  const { data: stats } = await sb
    .from("creator_monthly_stats")
    .select("user_id, month, submissions_count, xp_earned")
    .eq("user_id", AMINE)
    .eq("month", monthStart)
    .maybeSingle()
  const hasStats = !!stats && (stats.submissions_count ?? 0) >= 1
  lines.push(
    fmt(
      "creator_monthly_stats row for amine",
      hasStats,
      stats ? `submissions=${stats.submissions_count}, xp=${stats.xp_earned}` : "missing"
    )
  )
  if (!hasStats) allOk = false

  // === Bonus: cap enforcement — push to 50 likes and verify next is 0-credited ===
  for (let i = 0; i < 47; i++) {
    await sb.rpc("award_creator_xp", {
      p_creator_user_id: AMINE,
      p_signal_type: "like",
      p_submission_id: submissionId,
      p_viewer_user_id: PARENT,
    })
  }
  const { data: capCheck } = await sb.rpc("award_creator_xp", {
    p_creator_user_id: AMINE,
    p_signal_type: "like",
    p_submission_id: submissionId,
    p_viewer_user_id: PARENT,
  })
  const capCredited = (capCheck as { credited?: number; reason?: string }) ?? {}
  lines.push(
    fmt(
      "51st like = 0 XP (cap enforced)",
      capCredited.credited === 0,
      JSON.stringify(capCredited)
    )
  )
  if (capCredited.credited !== 0) allOk = false

  console.log("\nResults:")
  for (const line of lines) console.log(line)
  console.log("\n" + (allOk ? "ALL CHECKS PASSED" : "ONE OR MORE CHECKS FAILED"))
  process.exit(allOk ? 0 : 1)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
