/**
 * Reality Fix P0.1 — beta pivot seeder (schema-adaptive rewrite).
 *
 * Run AFTER `seed-all-test-accounts.ts`. Creates the per-role pivot rows
 * the dashboards actually need to surface anything:
 *
 *   profiles            → flip is_onboarded=true on every test account
 *   teens               → row per teen profile (canonical teen_id)
 *   parent_teen_links   → links so parents see their teen
 *                         (no DB unique constraint — select-then-insert)
 *   user_xp + user_coins→ initial 0-balance rows so wallet/leaderboard
 *                         queries don't return null
 *   partners            → status='active' row per partner profile
 *   partner_staff       → owner row so partner_id resolves from email
 *   ambassadors         → status='active' row for ambassador.test
 *   mentors             → kyc_status='approved' row for mentor.test
 *
 * Idempotent — safe to re-run. Fails per row, prints which writes
 * succeeded so a missing column / missing migration is loud, not silent.
 *
 * Schema-adaptive choices (from a live information_schema audit done
 * 2026-05-09 against the nivy project; see
 * docs/compliance/product-reality-pass.md §11):
 *
 *   - parent_teen_links has only PK(id), no UNIQUE(parent_id, teen_id).
 *     Use select-first-then-insert; do NOT rely on onConflict here. The
 *     missing UNIQUE is documented as a follow-up canonical migration.
 *   - partners has no `approved_at`. Seed (email, company_name,
 *     partner_type, status, sub_category, description) only.
 *   - ambassadors columns are `user_id` (NOT profile_id), `commission_pct`
 *     (NOT commission_rate), and a NOT NULL `code` (UNIQUE). Seed all.
 *   - partner_staff column is `joined_at` (NOT accepted_at).
 *   - mentors `user_id` is correct; `kyc_status='approved'` flips the
 *     "KYC pending" gate.
 *
 * THESE ARE BETA FIXTURES. Refuses to run against teensparty.ma unless
 * SEED_ALLOW_PRODUCTION=1.
 *
 * Run:  npm run seed:beta-pivots   (or: npx tsx scripts/seed-beta-pivots.ts)
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
} catch (err) {
  console.error("Could not read .env.local:", err)
  process.exit(1)
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local")
  process.exit(1)
}
if (SUPABASE_URL.includes("teensparty.ma") && process.env.SEED_ALLOW_PRODUCTION !== "1") {
  console.error("Refusing to seed against teensparty.ma without SEED_ALLOW_PRODUCTION=1")
  process.exit(1)
}

const sb = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

// ---------------------------------------------------------------------------
// Account map (mirrors seed-all-test-accounts.ts).
// ---------------------------------------------------------------------------
const PARENT_EMAILS = [
  "parent.test@teenclub.ma",
  "parent.silver@teenclub.ma",
  "parent.gold@teenclub.ma",
  "parent.platinum@teenclub.ma",
]
const TEEN_EMAILS = [
  "teen.amine@teenclub.ma",
  "teen.sara@teenclub.ma",
]
const AMBASSADOR_EMAIL = "ambassador.test@teenclub.ma"
const MENTOR_EMAIL = "mentor.test@teenclub.ma"
const PARTNER_DEFS = [
  { email: "retail.partner@teenclub.ma",    company: "TechStore Morocco",   type: "retail"    as const },
  { email: "venue.partner@teenclub.ma",     company: "Le Rooftop Teen",     type: "venue"     as const },
  { email: "club.partner@teenclub.ma",      company: "Teen Fitness Academy", type: "club"     as const },
  { email: "education.partner@teenclub.ma", company: "Code Academy Junior", type: "education" as const },
]

const PARENT_TEEN_PAIRS: Array<{ parent: string; teen: string }> = [
  { parent: "parent.test@teenclub.ma",   teen: "teen.amine@teenclub.ma" },
  { parent: "parent.silver@teenclub.ma", teen: "teen.sara@teenclub.ma"  },
]

// #318 — parent VIP tier fixtures. The parent sidebar reads the tier from
// `parent_subscription_view` (migration 063), which joins
// family_subscriptions.owner_id -> user_subscriptions -> subscription_plans.tier.
// Without these pivot rows every beta parent renders as "Free". Map each beta
// parent email to the plan tier its name advertises.
const PARENT_TIER_FIXTURES: Array<{ email: string; tier: string }> = [
  { email: "parent.silver@teenclub.ma",   tier: "silver" },
  { email: "parent.gold@teenclub.ma",     tier: "gold" },
  { email: "parent.platinum@teenclub.ma", tier: "platinum" },
]

const ALL_ONBOARDED_EMAILS = [
  ...PARENT_EMAILS,
  ...TEEN_EMAILS,
  AMBASSADOR_EMAIL,
  MENTOR_EMAIL,
  ...PARTNER_DEFS.map((p) => p.email),
]

// ---------------------------------------------------------------------------
// Helpers.
// ---------------------------------------------------------------------------
type Outcome = "ok" | "noop" | "skip" | "fail"
const counts: Record<Outcome, number> = { ok: 0, noop: 0, skip: 0, fail: 0 }
function log(stage: string, target: string, outcome: Outcome, detail?: string) {
  counts[outcome]++
  const tag = outcome === "ok" ? "✓" : outcome === "noop" ? "·" : outcome === "skip" ? "○" : "✗"
  process.stdout.write(`  ${tag} ${stage.padEnd(28)} ${target.padEnd(38)}`)
  if (detail) process.stdout.write(` — ${detail}`)
  process.stdout.write("\n")
}

async function profileIdByEmail(email: string): Promise<string | null> {
  const { data, error } = await sb
    .from("profiles")
    .select("id")
    .eq("email", email)
    .maybeSingle()
  if (error) return null
  return (data?.id as string | undefined) ?? null
}

// ---------------------------------------------------------------------------
// Steps.
// ---------------------------------------------------------------------------
async function flipIsOnboarded() {
  console.log("\n[1/8] is_onboarded=true on every test account")
  for (const email of ALL_ONBOARDED_EMAILS) {
    const { data, error } = await sb
      .from("profiles")
      .update({ is_onboarded: true, updated_at: new Date().toISOString() })
      .eq("email", email)
      .select("id")
    if (error) {
      log("is_onboarded", email, "fail", error.message)
      continue
    }
    log(
      "is_onboarded",
      email,
      data && data.length > 0 ? "ok" : "skip",
      data?.length ? `${data.length} row` : "no profile row",
    )
  }
}

async function ensureTeensRows() {
  console.log("\n[2/8] teens row per teen profile")
  for (const email of TEEN_EMAILS) {
    const id = await profileIdByEmail(email)
    if (!id) {
      log("teens", email, "skip", "no profile")
      continue
    }
    const { data: existing } = await sb
      .from("teens")
      .select("id")
      .eq("id", id)
      .maybeSingle()
    if (existing) {
      log("teens", email, "noop", "already present")
      continue
    }
    const localPart = email.split("@")[0] ?? "teen"
    const { error } = await sb.from("teens").insert({
      id,
      pseudo: localPart.replace(/\./g, "_").slice(0, 24),
      first_name: localPart.split(".")[1] ?? "Beta",
      last_name: "Test",
    })
    if (error) {
      log("teens", email, "fail", error.message)
    } else {
      log("teens", email, "ok")
    }
  }
}

async function ensureWalletRows() {
  console.log("\n[3/8] user_xp + user_coins (initial 0-balance) per teen")
  for (const email of TEEN_EMAILS) {
    const id = await profileIdByEmail(email)
    if (!id) {
      log("user_xp+coins", email, "skip", "no profile")
      continue
    }
    const xp = await sb
      .from("user_xp")
      .upsert(
        { teen_id: id, total_xp: 0, current_level: 1 },
        { onConflict: "teen_id", ignoreDuplicates: true },
      )
    if (xp.error) {
      log("user_xp", email, "fail", xp.error.message)
    } else {
      log("user_xp", email, "ok")
    }
    const coins = await sb
      .from("user_coins")
      .upsert(
        { teen_id: id, balance: 0, lifetime_earned: 0, lifetime_spent: 0 },
        { onConflict: "teen_id", ignoreDuplicates: true },
      )
    if (coins.error) {
      log("user_coins", email, "fail", coins.error.message)
    } else {
      log("user_coins", email, "ok")
    }
  }
}

async function linkParentsToTeens() {
  console.log("\n[4/8] parent_teen_links (no UNIQUE — select-then-insert)")
  for (const pair of PARENT_TEEN_PAIRS) {
    const parentId = await profileIdByEmail(pair.parent)
    const teenId = await profileIdByEmail(pair.teen)
    if (!parentId || !teenId) {
      log("parent_teen_links", `${pair.parent}↔${pair.teen}`, "skip", "missing profile")
      continue
    }

    // No UNIQUE(parent_id, teen_id) on this table — DON'T use upsert here,
    // it would no-op silently or raise. Select first.
    const { data: existing, error: selErr } = await sb
      .from("parent_teen_links")
      .select("id, status")
      .eq("parent_id", parentId)
      .eq("teen_id", teenId)
      .maybeSingle()

    if (selErr) {
      log("parent_teen_links", `${pair.parent}↔${pair.teen}`, "fail", selErr.message)
      continue
    }

    if (existing) {
      if ((existing as { status?: string }).status !== "active") {
        const { error } = await sb
          .from("parent_teen_links")
          .update({ status: "active" })
          .eq("id", (existing as { id: string }).id)
        if (error) {
          log("parent_teen_links", `${pair.parent}↔${pair.teen}`, "fail", error.message)
          continue
        }
        log("parent_teen_links", `${pair.parent}↔${pair.teen}`, "ok", "flipped to active")
      } else {
        log("parent_teen_links", `${pair.parent}↔${pair.teen}`, "noop", "already active")
      }
    } else {
      const { error } = await sb
        .from("parent_teen_links")
        .insert({ parent_id: parentId, teen_id: teenId, status: "active" })
      if (error) {
        log("parent_teen_links", `${pair.parent}↔${pair.teen}`, "fail", error.message)
        continue
      }
      log("parent_teen_links", `${pair.parent}↔${pair.teen}`, "ok", "inserted active")
    }

    // Mirror onto teens.parent_id so legacy reads via teens.parent_id work too.
    const { error: mirrorErr } = await sb
      .from("teens")
      .update({ parent_id: parentId })
      .eq("id", teenId)
    if (mirrorErr) {
      log("teens.parent_id", `${pair.parent}↔${pair.teen}`, "fail", mirrorErr.message)
    } else {
      log("teens.parent_id", `${pair.parent}↔${pair.teen}`, "ok")
    }
  }
}

// #318 — seed the subscription pivot chain so the parent sidebar shows the
// real VIP tier instead of "Free". Reuses the existing schema (migration 027 +
// 063); creates NO new table. Chain per parent:
//   subscription_plans (by tier)  ->  user_subscriptions (active)
//   user_subscriptions            ->  family_subscriptions (owner_id = parent)
// parent_subscription_view then resolves (parent_id, tier, status='active').
// Neither user_subscriptions nor family_subscriptions has a natural UNIQUE we
// can onConflict on, so we select-then-insert (same pattern as parent_teen_links).
async function ensureParentSubscriptions() {
  console.log("\n[5/9] parent subscriptions (family_subscriptions -> user_subscriptions -> plan)")
  for (const fixture of PARENT_TIER_FIXTURES) {
    const ownerId = await profileIdByEmail(fixture.email)
    if (!ownerId) {
      log("parent_subscription", `${fixture.email} (${fixture.tier})`, "skip", "no profile")
      continue
    }

    // Resolve the plan for this tier.
    const { data: plan, error: planErr } = await sb
      .from("subscription_plans")
      .select("id")
      .eq("tier", fixture.tier)
      .eq("is_active", true)
      .limit(1)
      .maybeSingle()
    if (planErr || !plan) {
      log("parent_subscription", `${fixture.email} (${fixture.tier})`, "fail", planErr?.message ?? "no active plan for tier")
      continue
    }
    const planId = (plan as { id: string }).id

    // Does an active family subscription already resolve for this parent?
    const { data: existingFam } = await sb
      .from("family_subscriptions")
      .select("id, subscription_id")
      .eq("owner_id", ownerId)
      .limit(1)
      .maybeSingle()

    if (existingFam) {
      // Re-point its user_subscription to the right plan + active status so a
      // re-run with a corrected tier converges.
      const subId = (existingFam as { subscription_id: string }).subscription_id
      const { error: updErr } = await sb
        .from("user_subscriptions")
        .update({ plan_id: planId, status: "active" })
        .eq("id", subId)
      if (updErr) {
        log("parent_subscription", `${fixture.email} (${fixture.tier})`, "fail", updErr.message)
      } else {
        log("parent_subscription", `${fixture.email} (${fixture.tier})`, "noop", "already present, synced plan")
      }
      continue
    }

    // Create the user_subscriptions row (billing_cycle is NOT NULL).
    const { data: sub, error: subErr } = await sb
      .from("user_subscriptions")
      .insert({
        user_id: ownerId,
        plan_id: planId,
        status: "active",
        billing_cycle: "monthly",
      })
      .select("id")
      .maybeSingle()
    if (subErr || !sub) {
      log("user_subscriptions", `${fixture.email} (${fixture.tier})`, "fail", subErr?.message ?? "no row returned")
      continue
    }

    // Create the family_subscriptions row (owner_id = parent, links the view).
    const { error: famErr } = await sb
      .from("family_subscriptions")
      .insert({
        owner_id: ownerId,
        subscription_id: (sub as { id: string }).id,
        family_name: "Beta Family",
      })
    if (famErr) {
      log("family_subscriptions", `${fixture.email} (${fixture.tier})`, "fail", famErr.message)
    } else {
      log("parent_subscription", `${fixture.email} (${fixture.tier})`, "ok", `tier=${fixture.tier}`)
    }
  }
}

async function ensurePartnersRows() {
  console.log("\n[6/9] partners + partner_staff (status=active, role=owner)")
  for (const def of PARTNER_DEFS) {
    const profileId = await profileIdByEmail(def.email)
    if (!profileId) {
      log("partners", def.email, "skip", "no profile")
      continue
    }

    // Upsert by email — partners.email is UNIQUE.
    const { data: existing } = await sb
      .from("partners")
      .select("id, status")
      .eq("email", def.email)
      .maybeSingle()

    let partnerId: string | null = (existing as { id?: string } | null)?.id ?? null

    if (!partnerId) {
      // partners has NO approved_at column — only canonical fields.
      const { data: ins, error } = await sb
        .from("partners")
        .insert({
          email: def.email,
          company_name: def.company,
          partner_type: def.type,
          status: "active",
          description: `Beta fixture for ${def.type} partner`,
        })
        .select("id")
        .maybeSingle()
      if (error || !ins) {
        log("partners", def.email, "fail", error?.message ?? "no row returned")
        continue
      }
      partnerId = ins.id as string
      log("partners", def.email, "ok", `${def.type} active`)
    } else if (existing && (existing as { status?: string }).status !== "active") {
      const { error } = await sb
        .from("partners")
        .update({ status: "active" })
        .eq("id", partnerId)
      if (error) {
        log("partners", def.email, "fail", error.message)
        continue
      }
      log("partners", def.email, "ok", "flipped to active")
    } else {
      log("partners", def.email, "noop", "already active")
    }

    if (!partnerId) continue

    // partner_staff: real columns are (partner_id, user_id, role, is_active,
    // invited_at, joined_at) — NOT accepted_at. UNIQUE(partner_id, user_id)
    // exists, so onConflict works here.
    const { error: staffErr } = await sb
      .from("partner_staff")
      .upsert(
        {
          partner_id: partnerId,
          user_id: profileId,
          role: "owner",
          is_active: true,
          joined_at: new Date().toISOString(),
        },
        { onConflict: "partner_id,user_id", ignoreDuplicates: false },
      )
    if (staffErr) {
      log("partner_staff", def.email, "fail", staffErr.message)
    } else {
      log("partner_staff", def.email, "ok")
    }
  }
}

async function ensureAmbassadorRow() {
  console.log("\n[7/9] ambassadors row (status=active)")
  const id = await profileIdByEmail(AMBASSADOR_EMAIL)
  if (!id) {
    log("ambassadors", AMBASSADOR_EMAIL, "skip", "no profile")
    return
  }
  // Real columns: user_id (UNIQUE), code (NOT NULL UNIQUE), commission_pct
  // (NOT commission_rate). Check constraints on (status, tier, track):
  //   status ∈ {pending, active, suspended, rejected}
  //   tier   ∈ {bronze, silver, gold}
  //   track  ∈ {cash, xp_only}
  // Stable code derived from the email so re-runs are idempotent on the
  // UNIQUE(code) constraint too.
  const code = "BETA-" + (AMBASSADOR_EMAIL.split("@")[0] ?? "AMB").replace(/\./g, "-").toUpperCase()
  const { error } = await sb
    .from("ambassadors")
    .upsert(
      {
        user_id: id,
        code,
        status: "active",
        track: "cash",
        tier: "bronze",
        commission_pct: 10,
      },
      { onConflict: "user_id", ignoreDuplicates: false },
    )
  if (error) {
    log("ambassadors", AMBASSADOR_EMAIL, "fail", error.message)
  } else {
    log("ambassadors", AMBASSADOR_EMAIL, "ok", `code=${code}`)
  }
}

async function ensureMentorRow() {
  console.log("\n[8/9] mentors row (status=active, kyc_status=approved)")
  const id = await profileIdByEmail(MENTOR_EMAIL)
  if (!id) {
    log("mentors", MENTOR_EMAIL, "skip", "no profile")
    return
  }
  // expertise_tags / age_min/max_mentee / hourly_rate_dh / free_intro_session
  // / sessions_count all have sensible DB defaults; we only set what we
  // need to flip the "KYC pending" gate.
  const { error } = await sb
    .from("mentors")
    .upsert(
      {
        user_id: id,
        kyc_status: "approved",
        status: "active",
        approved_at: new Date().toISOString(),
        bio: "Beta mentor fixture",
      },
      { onConflict: "user_id", ignoreDuplicates: false },
    )
  if (error) {
    log("mentors", MENTOR_EMAIL, "fail", error.message)
  } else {
    log("mentors", MENTOR_EMAIL, "ok")
  }
}

async function summary() {
  console.log("\n[9/9] summary")
  console.log(`  ok=${counts.ok}  noop=${counts.noop}  skip=${counts.skip}  fail=${counts.fail}`)
  if (counts.fail > 0) {
    console.log("\nSome writes failed — re-run after diagnosing the schema gap.")
    console.log("Common causes: missing migration locally, column rename, RLS policy,")
    console.log("stale trigger on the target table (see migration 103 for one such fix).")
    process.exit(1)
  }
  console.log("\nBeta pivots ready. Verify with the runbook:")
  console.log("  docs/compliance/beta-smoke-runbook.md")
}

async function main() {
  console.log(`Seeding beta pivots against ${SUPABASE_URL}`)
  await flipIsOnboarded()
  await ensureTeensRows()
  await ensureWalletRows()
  await linkParentsToTeens()
  await ensureParentSubscriptions()
  await ensurePartnersRows()
  await ensureAmbassadorRow()
  await ensureMentorRow()
  await summary()
}

main().catch((err) => {
  console.error("\nseed-beta-pivots failed:", err)
  process.exit(1)
})
