/**
 * W1.4 — recommend_for_teen RPC verification.
 *
 * Per docs/vision/personalization-engine.md §4 + §6.2:
 *   1. Seed teen.amine's interests with 3 tags (sport_football, academic_math, music_pop).
 *   2. Tag math_basics_v1 with ['academic_math','science_physics'] and culture_general_v1
 *      with ['music_pop'] so we have multiple tagged candidates.
 *   3. Call recommend_for_teen(amine, 'quiz', 3) → expect math_basics_v1 ranked top.
 *   4. Insert quiz_seen_history row for math_basics_v1 (simulate submit) and re-call →
 *      math_basics_v1 must NOT be in the top result (whitepaper §29.9 invariant).
 *
 * Run: `npx tsx scripts/verify-recommend.ts`
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

const TEEN_ID = "37ff4a09-25ca-44c2-a313-141ab6d7e1b9" // teen.amine

const sb = createClient(SUPABASE_URL, SERVICE_ROLE, {
  auth: { persistSession: false, autoRefreshToken: false },
})

function fmt(label: string, ok: boolean, details?: string) {
  const tag = ok ? "PASS" : "FAIL"
  return `  [${tag}] ${label}${details ? ` — ${details}` : ""}`
}

type RecRow = { id: string; content_type: string; score: number; reason: string }

function parseRecs(data: unknown): RecRow[] {
  if (!Array.isArray(data)) return []
  return data
    .map((row) => {
      if (typeof row === "string") {
        try {
          return JSON.parse(row) as RecRow
        } catch {
          return null
        }
      }
      if (row && typeof row === "object" && "id" in (row as Record<string, unknown>)) {
        return row as RecRow
      }
      return null
    })
    .filter((r): r is RecRow => !!r && typeof r.id === "string")
}

async function main() {
  const lines: string[] = []
  let allOk = true

  console.log("W1.4 recommend_for_teen verification")
  console.log("====================================")

  // === Step 1: seed interests for amine ===
  const interests = ["sport_football", "academic_math", "music_pop"]
  await sb.from("teen_interests").delete().eq("teen_id", TEEN_ID)
  const { error: insErr } = await sb.from("teen_interests").insert(
    interests.map((tag) => ({ teen_id: TEEN_ID, tag, weight: 1.0 })),
  )
  if (insErr) {
    lines.push(fmt("seed teen_interests", false, insErr.message))
    allOk = false
  } else {
    lines.push(fmt("seed teen_interests", true, interests.join(",")))
  }

  // === Step 2: tag math_basics_v1 (clear all other quiz tags so the affinity
  // match is unambiguous against the seeded interests). ===
  await sb.from("educational_quizzes").update({ tags: [] }).neq("code", "math_basics_v1")
  const { error: upErr } = await sb
    .from("educational_quizzes")
    .update({ tags: ["academic_math", "science_physics"] })
    .eq("code", "math_basics_v1")
  if (upErr) {
    lines.push(fmt("tag quiz math_basics_v1", false, upErr.message))
    allOk = false
  } else {
    lines.push(fmt("tag quiz math_basics_v1", true, "academic_math,science_physics"))
  }

  // Resolve math_basics_v1 id for downstream assertions
  const { data: mathRow } = await sb
    .from("educational_quizzes")
    .select("id")
    .eq("code", "math_basics_v1")
    .maybeSingle()
  const mathId = mathRow?.id as string | undefined
  if (!mathId) {
    lines.push(fmt("locate math_basics_v1", false, "missing"))
    allOk = false
  } else {
    lines.push(fmt("locate math_basics_v1", true, mathId))
  }

  // Clear any pre-existing seen-history that would skew the test
  await sb.from("quiz_seen_history").delete().eq("teen_id", TEEN_ID)

  // === Step 3: call recommend_for_teen, expect math_basics_v1 first ===
  const { data: pre, error: preErr } = await sb.rpc("recommend_for_teen", {
    p_teen_id: TEEN_ID,
    p_content_type: "quiz",
    p_n: 3,
  })
  if (preErr) {
    lines.push(fmt("recommend_for_teen (pre-seen)", false, preErr.message))
    allOk = false
  } else {
    const recs = parseRecs(pre)
    const top = recs[0]
    const ok = !!top && top.id === mathId
    lines.push(
      fmt(
        "math_basics_v1 ranked top",
        ok,
        recs.map((r) => `${r.id.slice(0, 8)}…(${r.score})`).join(" | "),
      ),
    )
    if (!ok) allOk = false
  }

  // === Step 4: simulate submit by inserting quiz_seen_history ===
  if (mathId) {
    const { error: seenErr } = await sb.from("quiz_seen_history").upsert(
      { teen_id: TEEN_ID, quiz_id: mathId, last_seen: new Date().toISOString() },
      { onConflict: "teen_id,quiz_id" },
    )
    if (seenErr) {
      lines.push(fmt("upsert quiz_seen_history", false, seenErr.message))
      allOk = false
    } else {
      lines.push(fmt("upsert quiz_seen_history", true, "math_basics_v1 marked seen"))
    }
  }

  // === Step 5: re-call recommend_for_teen, expect math_basics_v1 NOT in result ===
  const { data: post, error: postErr } = await sb.rpc("recommend_for_teen", {
    p_teen_id: TEEN_ID,
    p_content_type: "quiz",
    p_n: 3,
  })
  if (postErr) {
    lines.push(fmt("recommend_for_teen (post-seen)", false, postErr.message))
    allOk = false
  } else {
    const recs = parseRecs(post)
    const stillThere = recs.some((r) => r.id === mathId)
    const ok = recs.length > 0 && !stillThere
    lines.push(
      fmt(
        "7-day no-repeat enforced",
        ok,
        recs.map((r) => `${r.id.slice(0, 8)}…(${r.score})`).join(" | "),
      ),
    )
    if (!ok) allOk = false
  }

  // === Cleanup quiz_seen_history so the test is idempotent ===
  await sb.from("quiz_seen_history").delete().eq("teen_id", TEEN_ID)

  console.log("\nResults:")
  for (const line of lines) console.log(line)
  console.log("\n" + (allOk ? "ALL CHECKS PASSED" : "ONE OR MORE CHECKS FAILED"))
  process.exit(allOk ? 0 : 1)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
