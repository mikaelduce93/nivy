/**
 * Wave 1.5 verification script.
 *
 * 1. Tags 1 quiz, 1 event, 1 partner_offer with three distinct tags
 *    (creating event/offer test rows when the tables are empty).
 * 2. Records ~10 behavioral_signals for teen.amine spread across the
 *    three tags (mix of view/complete/favorite) via record_signal RPC.
 *    The "academic_math" tag gets the most signals -> should rank highest.
 * 3. Calls update_affinity_scores(amine.id).
 * 4. Reads affinity_scores for amine; asserts >=3 tag rows with score>0
 *    and that academic_math is the top-ranked tag.
 *
 * Run:  npx tsx scripts/verify-evolve-profiles.ts
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

const TAG_QUIZ = "academic_math"
const TAG_EVENT = "sport_football"
const TAG_OFFER = "music_pop"

const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!url) throw new Error("Missing SUPABASE_URL / NEXT_PUBLIC_SUPABASE_URL")
if (!serviceKey) throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY")

const supabase = createClient(url, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
})

async function main() {
  // ---- 1. Pick / tag the three target rows ------------------------------
  // 1a. Quiz: pick first row, ensure tags include TAG_QUIZ.
  const { data: quiz, error: quizErr } = await supabase
    .from("educational_quizzes")
    .select("id, tags")
    .order("created_at", { ascending: true })
    .limit(1)
    .single()
  if (quizErr || !quiz) {
    console.error("Failed to load a quiz:", quizErr)
    process.exit(1)
  }
  const quizTags = Array.from(new Set([...(quiz.tags ?? []), TAG_QUIZ]))
  await supabase
    .from("educational_quizzes")
    .update({ tags: quizTags })
    .eq("id", quiz.id)
  console.log(`quiz ${quiz.id} tagged -> [${quizTags.join(", ")}]`)

  // 1b. Event: ensure at least one tagged event exists. Insert if empty.
  let eventId: string | null = null
  const { data: existingEvent } = await supabase
    .from("events")
    .select("id, tags")
    .limit(1)
    .maybeSingle()
  if (existingEvent) {
    eventId = existingEvent.id
    const tags = Array.from(new Set([...(existingEvent.tags ?? []), TAG_EVENT]))
    await supabase.from("events").update({ tags }).eq("id", existingEvent.id)
  } else {
    const { data: partner } = await supabase
      .from("partners")
      .select("id")
      .limit(1)
      .single()
    const insert = await supabase
      .from("events")
      .insert({
        slug: `verify-evolve-event-${Date.now()}`,
        title: "Verify Evolve Event",
        description: "Synthetic event for evolve-teen-profiles verification.",
        status: "draft",
        partner_id: partner?.id ?? null,
        category: "sport",
        tags: [TAG_EVENT],
      })
      .select("id")
      .single()
    if (insert.error || !insert.data) {
      console.error("Failed to insert test event:", insert.error)
      process.exit(1)
    }
    eventId = insert.data.id
  }
  console.log(`event ${eventId} tagged -> [${TAG_EVENT}]`)

  // 1c. Partner offer: ensure at least one tagged offer exists.
  let offerId: string | null = null
  const { data: existingOffer } = await supabase
    .from("partner_offers")
    .select("id, tags")
    .limit(1)
    .maybeSingle()
  if (existingOffer) {
    offerId = existingOffer.id
    const tags = Array.from(new Set([...(existingOffer.tags ?? []), TAG_OFFER]))
    await supabase
      .from("partner_offers")
      .update({ tags })
      .eq("id", existingOffer.id)
  } else {
    const { data: partner } = await supabase
      .from("partners")
      .select("id")
      .limit(1)
      .single()
    if (!partner) {
      console.error("No partners row available to attach an offer.")
      process.exit(1)
    }
    const insert = await supabase
      .from("partner_offers")
      .insert({
        partner_id: partner.id,
        title: "Verify Evolve Offer",
        description: "Synthetic offer for evolve-teen-profiles verification.",
        offer_type: "discount",
        is_active: true,
        tags: [TAG_OFFER],
      })
      .select("id")
      .single()
    if (insert.error || !insert.data) {
      console.error("Failed to insert test partner_offer:", insert.error)
      process.exit(1)
    }
    offerId = insert.data.id
  }
  console.log(`partner_offer ${offerId} tagged -> [${TAG_OFFER}]`)

  // ---- 2. Wipe prior synthetic state for idempotency --------------------
  await supabase.from("affinity_scores").delete().eq("teen_id", AMINE_ID)
  // Remove only signals targeting our 3 test rows so the script is repeatable.
  await supabase
    .from("behavioral_signals")
    .delete()
    .eq("teen_id", AMINE_ID)
    .in("target_id", [quiz.id, eventId!, offerId!])

  // ---- 3. Record ~10 signals via record_signal RPC ----------------------
  const signals: Array<{
    signal_type: string
    target_type: string
    target_id: string
  }> = [
    // 5 signals on quiz (academic_math) — should rank highest
    { signal_type: "view", target_type: "quiz", target_id: quiz.id },
    { signal_type: "view", target_type: "quiz", target_id: quiz.id },
    { signal_type: "start", target_type: "quiz", target_id: quiz.id },
    { signal_type: "complete", target_type: "quiz", target_id: quiz.id },
    { signal_type: "favorite", target_type: "quiz", target_id: quiz.id },

    // 3 signals on event (sport_football)
    { signal_type: "view", target_type: "event", target_id: eventId! },
    { signal_type: "click", target_type: "event", target_id: eventId! },
    { signal_type: "favorite", target_type: "event", target_id: eventId! },

    // 2 signals on partner_offer (music_pop)
    { signal_type: "view", target_type: "partner_offer", target_id: offerId! },
    {
      signal_type: "favorite",
      target_type: "partner_offer",
      target_id: offerId!,
    },
  ]

  for (const s of signals) {
    const { error } = await supabase.rpc("record_signal", {
      p_teen_id: AMINE_ID,
      p_signal_type: s.signal_type,
      p_target_type: s.target_type,
      p_target_id: s.target_id,
    })
    if (error) {
      console.error("record_signal failed:", s, error)
      process.exit(1)
    }
  }
  console.log(`recorded ${signals.length} behavioral_signals for amine`)

  // ---- 4. Run update_affinity_scores ------------------------------------
  const { data: rowsUpserted, error: rpcErr } = await supabase.rpc(
    "update_affinity_scores",
    { p_teen_id: AMINE_ID }
  )
  if (rpcErr) {
    console.error("update_affinity_scores failed:", rpcErr)
    process.exit(1)
  }
  const upserted = typeof rowsUpserted === "number" ? rowsUpserted : Number(rowsUpserted ?? 0)
  console.log(`update_affinity_scores upserted: ${upserted} row(s)`)

  // ---- 5. Idempotency check: re-run, expect same row count -------------
  const { data: rerunRows } = await supabase.rpc("update_affinity_scores", {
    p_teen_id: AMINE_ID,
  })
  const rerunCount = typeof rerunRows === "number" ? rerunRows : Number(rerunRows ?? 0)
  if (rerunCount !== upserted) {
    console.error(
      `FAIL: not idempotent. first=${upserted} rerun=${rerunCount}`
    )
    process.exit(1)
  }
  console.log(`idempotency OK (rerun upserted=${rerunCount})`)

  // ---- 6. Read back affinity_scores -------------------------------------
  const { data: scores, error: readErr } = await supabase
    .from("affinity_scores")
    .select("tag, score, signal_count")
    .eq("teen_id", AMINE_ID)
    .order("score", { ascending: false })
  if (readErr || !scores) {
    console.error("read affinity_scores failed:", readErr)
    process.exit(1)
  }

  console.log("affinity_scores for amine:")
  for (const r of scores) {
    console.log(
      `  ${r.tag.padEnd(20)} score=${Number(r.score).toFixed(3)}  signals=${r.signal_count}`
    )
  }

  // Filter to rows from our test tags with positive score.
  const testTags = [TAG_QUIZ, TAG_EVENT, TAG_OFFER]
  const positiveTestRows = scores.filter(
    (r) => testTags.includes(r.tag) && Number(r.score) > 0
  )
  if (positiveTestRows.length < 3) {
    console.error(
      `FAIL: expected >=3 test-tag rows with positive score, got ${positiveTestRows.length}`
    )
    process.exit(1)
  }

  // Top tag among test tags should be academic_math (5 signals incl. complete+favorite).
  const topTestTag = positiveTestRows[0]!.tag
  if (topTestTag !== TAG_QUIZ) {
    console.error(
      `FAIL: expected top tag=${TAG_QUIZ}, got ${topTestTag}`
    )
    process.exit(1)
  }

  console.log(
    `OK  test_tag_rows=${positiveTestRows.length} top=${topTestTag} upserted=${upserted}`
  )
}

main().catch((err) => {
  console.error("Unexpected error:", err)
  process.exit(1)
})
