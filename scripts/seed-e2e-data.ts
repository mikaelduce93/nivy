/**
 * Idempotent E2E data seeder.
 *
 * Provisions everything the 6 currently-skipped Playwright specs need:
 *   1. 6 educational_quizzes (covers quiz hub click-through + daily quiz card)
 *   2. 1 reward_category + 2 shop_rewards with low xp_cost (covers shop click)
 *   3. 1 pending booking for teen.amine (covers checkout summary + submit)
 *   4. 1 partner account with status='pending' (covers partner banner)
 *
 * After running, prints the env vars to add to .env.local.
 *
 * Run:  npx tsx scripts/seed-e2e-data.ts
 */

import { createClient } from "@supabase/supabase-js"
import { readFileSync, existsSync, writeFileSync } from "node:fs"

// .env.local loader (no dotenv dep)
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
  console.error("Could not read .env.local")
  process.exit(1)
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY")
  process.exit(1)
}

if (SUPABASE_URL.includes("teensparty.ma") && process.env.SEED_ALLOW_PRODUCTION !== "1") {
  console.error("Refusing to seed against teensparty.ma without SEED_ALLOW_PRODUCTION=1")
  process.exit(1)
}

const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

// ----------------------------------------------------------------------------
// 1. QUIZ CONTENT (mirrors migration 038)
// ----------------------------------------------------------------------------
const QUIZZES = [
  {
    code: "math_basics_v1",
    title: "Maths - Bases",
    description: "Cinq questions pour reviser les fondamentaux",
    subject: "math",
    difficulty: "easy",
    grade_level: "6eme",
    questions: [
      { question: "Combien font 7 x 8 ?", options: ["48", "54", "56", "64"], correct: 2, type: "mcq" },
      { question: "Quelle est la racine carree de 81 ?", options: ["7", "8", "9", "11"], correct: 2, type: "mcq" },
      { question: "Combien font 15% de 200 ?", options: ["20", "25", "30", "35"], correct: 2, type: "mcq" },
      { question: "Si x + 5 = 12, x = ?", options: ["5", "6", "7", "8"], correct: 2, type: "mcq" },
      { question: "Combien y a-t-il de cotes dans un hexagone ?", options: ["5", "6", "7", "8"], correct: 1, type: "mcq" },
    ],
    time_limit_minutes: 10,
    passing_score: 60,
    xp_reward: 50,
    icon: "calculator",
    is_active: true,
  },
  {
    code: "science_solar_system_v1",
    title: "Sciences - Systeme Solaire",
    description: "Decouvre les planetes du systeme solaire",
    subject: "science",
    difficulty: "easy",
    grade_level: "5eme",
    questions: [
      { question: "Quelle est la planete la plus proche du Soleil ?", options: ["Venus", "Mercure", "Mars", "Terre"], correct: 1, type: "mcq" },
      { question: "Combien y a-t-il de planetes dans notre systeme solaire ?", options: ["7", "8", "9", "10"], correct: 1, type: "mcq" },
      { question: "Quelle planete est appelee la planete rouge ?", options: ["Jupiter", "Mars", "Saturne", "Venus"], correct: 1, type: "mcq" },
      { question: "Quel est le satellite naturel de la Terre ?", options: ["Mars", "Phobos", "Lune", "Europe"], correct: 2, type: "mcq" },
      { question: "Quelle est la plus grande planete du systeme solaire ?", options: ["Saturne", "Jupiter", "Neptune", "Uranus"], correct: 1, type: "mcq" },
    ],
    time_limit_minutes: 10,
    passing_score: 60,
    xp_reward: 50,
    icon: "beaker",
    is_active: true,
  },
  {
    code: "history_morocco_independence_v1",
    title: "Histoire - Independance du Maroc",
    description: "Les grandes dates de l'histoire marocaine",
    subject: "history",
    difficulty: "normal",
    grade_level: "4eme",
    questions: [
      { question: "En quelle annee le Maroc a-t-il obtenu son independance ?", options: ["1944", "1956", "1960", "1962"], correct: 1, type: "mcq" },
      { question: "Qui etait le premier roi du Maroc independant ?", options: ["Hassan II", "Mohammed V", "Mohammed VI", "Moulay Ismail"], correct: 1, type: "mcq" },
      { question: "Quelle puissance a etabli le Protectorat sur le Maroc en 1912 ?", options: ["Espagne", "Royaume-Uni", "France", "Allemagne"], correct: 2, type: "mcq" },
      { question: "Comment s'appelle la Marche organisee en 1975 pour le Sahara ?", options: ["Marche Bleue", "Marche Verte", "Marche Rouge", "Marche Royale"], correct: 1, type: "mcq" },
      { question: "Hassan II a regne de 1961 jusqu'en quelle annee ?", options: ["1989", "1995", "1999", "2003"], correct: 2, type: "mcq" },
    ],
    time_limit_minutes: 12,
    passing_score: 60,
    xp_reward: 60,
    icon: "history",
    is_active: true,
  },
  {
    code: "geography_morocco_v1",
    title: "Geographie - Le Maroc",
    description: "Connais-tu bien la geographie marocaine ?",
    subject: "geography",
    difficulty: "easy",
    grade_level: "6eme",
    questions: [
      { question: "Quelle est la capitale du Maroc ?", options: ["Casablanca", "Rabat", "Marrakech", "Fes"], correct: 1, type: "mcq" },
      { question: "Quelle est la chaine de montagnes la plus haute du Maroc ?", options: ["Le Rif", "Le Haut Atlas", "L'Anti-Atlas", "Le Moyen Atlas"], correct: 1, type: "mcq" },
      { question: "Le Maroc est borde par quels deux ocean/mer ?", options: ["Atlantique et Mediterranee", "Atlantique et Mer Rouge", "Pacifique et Mediterranee", "Indien et Atlantique"], correct: 0, type: "mcq" },
      { question: "Quelle est la plus grande ville du Maroc ?", options: ["Rabat", "Marrakech", "Casablanca", "Tanger"], correct: 2, type: "mcq" },
      { question: "Quel desert se trouve dans le sud-est du Maroc ?", options: ["Sahara", "Kalahari", "Gobi", "Atacama"], correct: 0, type: "mcq" },
    ],
    time_limit_minutes: 10,
    passing_score: 60,
    xp_reward: 50,
    icon: "globe",
    is_active: true,
  },
  {
    code: "french_grammaire_v1",
    title: "Francais - Grammaire",
    description: "Reviser les bases de la grammaire francaise",
    subject: "french",
    difficulty: "normal",
    grade_level: "4eme",
    questions: [
      { question: "Quel est le pluriel de \"cheval\" ?", options: ["chevals", "chevaux", "chevales", "cheveaux"], correct: 1, type: "mcq" },
      { question: "Dans la phrase \"Je mange une pomme\", quel est le COD ?", options: ["Je", "mange", "une pomme", "aucun"], correct: 2, type: "mcq" },
      { question: "Quel temps : \"J'aurai mange\" ?", options: ["Futur simple", "Futur anterieur", "Passe compose", "Conditionnel"], correct: 1, type: "mcq" },
      { question: "Le contraire de \"genereux\" est :", options: ["aimable", "avare", "gentil", "simple"], correct: 1, type: "mcq" },
      { question: "Quel mot est un adverbe ?", options: ["rapide", "rapidement", "rapidite", "rapidi"], correct: 1, type: "mcq" },
    ],
    time_limit_minutes: 12,
    passing_score: 60,
    xp_reward: 60,
    icon: "book-open",
    is_active: true,
  },
  {
    code: "culture_general_v1",
    title: "Culture Generale",
    description: "Cinq questions de culture generale",
    subject: "culture",
    difficulty: "normal",
    grade_level: "3eme",
    questions: [
      { question: "Qui a peint la Joconde ?", options: ["Picasso", "Van Gogh", "Leonard de Vinci", "Monet"], correct: 2, type: "mcq" },
      { question: "Quelle est la langue officielle du Bresil ?", options: ["Espagnol", "Portugais", "Anglais", "Francais"], correct: 1, type: "mcq" },
      { question: "Combien de continents y a-t-il sur Terre ?", options: ["5", "6", "7", "8"], correct: 2, type: "mcq" },
      { question: "Quel element chimique a pour symbole \"Au\" ?", options: ["Argent", "Or", "Aluminium", "Aurium"], correct: 1, type: "mcq" },
      { question: "En quelle annee l'homme a-t-il marche sur la Lune pour la premiere fois ?", options: ["1965", "1969", "1972", "1975"], correct: 1, type: "mcq" },
    ],
    time_limit_minutes: 10,
    passing_score: 60,
    xp_reward: 50,
    icon: "star",
    is_active: true,
  },
]

async function seedQuizzes() {
  console.log("\n[1/4] Quizzes")
  // Upsert by code (relies on UNIQUE constraint educational_quizzes_code_key
  // from migration 038's first block — supabase-js will surface a clear error
  // if it does not exist and you'll need to add it manually).
  const { error, count } = await admin
    .from("educational_quizzes")
    .upsert(QUIZZES, { onConflict: "code", ignoreDuplicates: true, count: "exact" })
  if (error) throw error
  console.log(`  upserted ${QUIZZES.length} rows (${count ?? "?"} actually inserted)`)
}

// ----------------------------------------------------------------------------
// 2. SHOP REWARDS (1 category + 2 cheap rewards)
// ----------------------------------------------------------------------------
async function seedShopRewards() {
  console.log("\n[2/4] Shop rewards")

  const { data: catData, error: catErr } = await admin
    .from("reward_categories")
    .upsert(
      { name: "E2E Test Goodies", slug: "e2e-test", description: "Seeded for Playwright", icon: "gift", color: "cyan", display_order: 999, is_active: true },
      { onConflict: "slug" },
    )
    .select("id")
    .single()
  if (catErr) throw catErr
  const categoryId = catData!.id
  console.log(`  reward_categories: ${categoryId}`)

  // No unique constraint on `name`, so lookup-then-insert.
  const e2eRewards = [
    { name: "E2E Sticker Pack", description: "Pack de stickers pour valider le flow shop.", short_description: "Stickers Playwright", icon: "sticker", xp_cost: 10, reward_type: "digital_item" },
    { name: "E2E Badge Test", description: "Badge symbolique pour valider achat.", short_description: "Badge E2E", icon: "award", xp_cost: 25, reward_type: "digital_item" },
  ]
  for (const r of e2eRewards) {
    const { data: existing } = await admin.from("shop_rewards").select("id").eq("name", r.name).maybeSingle()
    if (existing) {
      console.log(`  shop_rewards: ${r.name} exists (${existing.id})`)
      continue
    }
    const { error } = await admin.from("shop_rewards").insert({ ...r, category_id: categoryId, stock_type: "unlimited", is_active: true })
    if (error) throw error
    console.log(`  shop_rewards: ${r.name} inserted`)
  }
}

// ----------------------------------------------------------------------------
// 3. PENDING BOOKING for teen.amine
// ----------------------------------------------------------------------------
async function seedPendingBooking(): Promise<string> {
  console.log("\n[3/4] Pending booking")

  // Find teen.amine user id
  const { data: list } = await admin.auth.admin.listUsers({ perPage: 200 })
  const amine = list.users.find((u) => u.email?.toLowerCase() === "teen.amine@teenclub.ma")
  if (!amine) throw new Error("teen.amine@teenclub.ma not found — run scripts/seed-test-accounts.ts first")

  // Reuse an existing E2E booking if present, else create one.
  const ref = "E2E-PENDING-AMINE"
  const { data: existing } = await admin
    .from("bookings")
    .select("id")
    .eq("booking_reference", ref)
    .maybeSingle()

  if (existing) {
    console.log(`  bookings: reusing ${existing.id}`)
    return existing.id
  }

  // Find any event to attach (events table requires a row OR we leave event_id null since FK is ON DELETE SET NULL).
  const { data: anyEvent } = await admin.from("events").select("id").limit(1).maybeSingle()

  const { data: created, error } = await admin
    .from("bookings")
    .insert({
      user_id: amine.id,
      event_id: anyEvent?.id ?? null,
      booking_reference: ref,
      status: "pending",
      payment_status: "pending",
      total_amount: 100,
      payment_method: "hybrid",
    })
    .select("id")
    .single()
  if (error) throw error
  console.log(`  bookings: created ${created!.id}`)
  return created!.id
}

// ----------------------------------------------------------------------------
// 4. PARTNER PENDING account
// ----------------------------------------------------------------------------
const PARTNER_PENDING_EMAIL = "partner.pending@teenclub.ma"
const PARTNER_PENDING_PASSWORD = "Test123!"

async function seedPartnerPending(): Promise<void> {
  console.log("\n[4/4] Partner pending")

  // Auth user
  const { data: created, error: createErr } = await admin.auth.admin.createUser({
    email: PARTNER_PENDING_EMAIL,
    password: PARTNER_PENDING_PASSWORD,
    email_confirm: true,
    user_metadata: { full_name: "Partner Pending Test", role: "partner" },
  })

  let userId: string
  if (createErr) {
    if (!/already.*registered|already.*exists|duplicate/i.test(createErr.message)) throw createErr
    const { data: list } = await admin.auth.admin.listUsers({ perPage: 200 })
    userId = list.users.find((u) => u.email?.toLowerCase() === PARTNER_PENDING_EMAIL)!.id
    console.log(`  auth.users: existing ${userId}`)
  } else {
    userId = created.user!.id
    console.log(`  auth.users: created ${userId}`)
  }

  // Profile
  await admin
    .from("profiles")
    .upsert({ id: userId, email: PARTNER_PENDING_EMAIL, full_name: "Partner Pending Test", role: "partner" }, { onConflict: "id" })
  console.log("  profiles: role=partner")

  // Partners row (lookup by email per app/partner/page.tsx)
  await admin
    .from("partners")
    .upsert(
      { email: PARTNER_PENDING_EMAIL, company_name: "E2E Pending Partner", partner_type: "venue", status: "pending" },
      { onConflict: "email" },
    )
  console.log("  partners: status=pending")
}

// ----------------------------------------------------------------------------
// 5. WRITE env vars back to .env.local
// ----------------------------------------------------------------------------
function upsertEnvLocal(updates: Record<string, string>): void {
  const path = ".env.local"
  let content = existsSync(path) ? readFileSync(path, "utf8") : ""
  for (const [key, value] of Object.entries(updates)) {
    const re = new RegExp(`^${key.replace(/[$.]/g, "\\$&")}=.*$`, "m")
    const line = `${key}=${value}`
    content = re.test(content) ? content.replace(re, line) : (content.endsWith("\n") || content.length === 0 ? content + line + "\n" : content + "\n" + line + "\n")
  }
  writeFileSync(path, content)
}

async function main() {
  console.log(`Seeding E2E data against ${SUPABASE_URL}`)

  await seedQuizzes()
  await seedShopRewards()
  const bookingId = await seedPendingBooking()
  await seedPartnerPending()

  upsertEnvLocal({
    E2E_PENDING_BOOKING_ID: bookingId,
    E2E_PARTNER_PENDING_EMAIL: PARTNER_PENDING_EMAIL,
    E2E_PARTNER_PENDING_PASSWORD: PARTNER_PENDING_PASSWORD,
  })
  console.log("\n.env.local updated with E2E_PENDING_BOOKING_ID + E2E_PARTNER_PENDING_*")
  console.log("\nRun: E2E_USE_SEEDED_DEFAULTS=1 npx playwright test --workers=1 --timeout=120000")
}

main().catch((err) => {
  console.error("\nSeed failed:", err.message ?? err)
  process.exit(1)
})
