/**
 * #64 — Lifestyle offer seeder (mentors, internships, restaurants+menus, drivers).
 *
 * The four lifestyle pipelines are fully coded/wired but empty of data, so every
 * teen surface falls back to its EmptyState. This seeds a representative supply.
 * No tables or features are created — data only.
 *
 * Mirrors scripts/seed-beta-pivots.ts conventions: reads .env.local, refuses to
 * run against teensparty.ma without SEED_ALLOW_PRODUCTION=1, uses the
 * service-role client, logs ok/noop/skip/fail per row, idempotent (re-run = noop)
 * via natural keys (partner email, menu name, internship title, mentor bio tag,
 * driver phone).
 *
 * mentors.user_id and nivy_drivers.user_id are NULLABLE in the live schema, so
 * fixtures need no auth users (the teen surfaces don't join user_id for display).
 *
 * Run:  npm run seed:lifestyle   (or: npx tsx scripts/seed-lifestyle-offer.ts)
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

type Outcome = "ok" | "noop" | "skip" | "fail"
const counts: Record<Outcome, number> = { ok: 0, noop: 0, skip: 0, fail: 0 }
function log(stage: string, target: string, outcome: Outcome, detail?: string) {
  counts[outcome]++
  const tag = outcome === "ok" ? "✓" : outcome === "noop" ? "·" : outcome === "skip" ? "○" : "✗"
  process.stdout.write(`  ${tag} ${stage.padEnd(16)} ${target.padEnd(40)}`)
  if (detail) process.stdout.write(` — ${detail}`)
  process.stdout.write("\n")
}

const CITIES = ["Casablanca", "Rabat", "Marrakech", "Tanger"]

// ---------------------------------------------------------------------------
// Restaurants (partners + menu_items)
// ---------------------------------------------------------------------------
const RESTAURANTS = [
  { email: "resto.greenbowl@lifestyle.nivy", company: "Green Bowl", sub: "restaurant", city: "Casablanca" },
  { email: "resto.cafelumiere@lifestyle.nivy", company: "Café Lumière", sub: "cafe", city: "Rabat" },
  { email: "resto.boulangerie@lifestyle.nivy", company: "Boulangerie du Coin", sub: "bakery", city: "Casablanca" },
  { email: "resto.burgerlab@lifestyle.nivy", company: "Burger Lab", sub: "fast_food", city: "Marrakech" },
  { email: "resto.freshmarket@lifestyle.nivy", company: "Fresh Market", sub: "grocery", city: "Tanger" },
]

const MENU_BY_RESTAURANT: Record<string, Array<Record<string, unknown>>> = {
  "Green Bowl": [
    { name: "Buddha Bowl", category: "main", price_dh: 65, price_coins: 130, calories: 520, is_halal: true, nutrition_tags: ["healthy", "vegetarian"], allergens: ["sesame"] },
    { name: "Vegan Wrap", category: "main", price_dh: 55, price_coins: 110, calories: 440, is_halal: true, nutrition_tags: ["vegan", "healthy"], allergens: ["gluten"] },
    { name: "Smoothie Détox", category: "drink", price_dh: 35, price_coins: 70, calories: 180, is_halal: true, nutrition_tags: ["vegan", "gluten_free"], allergens: [] },
  ],
  "Café Lumière": [
    { name: "Cappuccino", category: "drink", price_dh: 25, price_coins: 50, calories: 120, is_halal: true, nutrition_tags: ["vegetarian"], allergens: ["milk"] },
    { name: "Cheesecake", category: "dessert", price_dh: 40, price_coins: 80, calories: 410, is_halal: true, nutrition_tags: ["vegetarian"], allergens: ["milk", "gluten", "eggs"] },
  ],
  "Boulangerie du Coin": [
    { name: "Pain Complet", category: "bakery", price_dh: 12, price_coins: 24, calories: 250, is_halal: true, nutrition_tags: ["vegetarian"], allergens: ["gluten"] },
    { name: "Croissant", category: "bakery", price_dh: 8, price_coins: 16, calories: 300, is_halal: true, nutrition_tags: ["vegetarian"], allergens: ["gluten", "milk"] },
  ],
  "Burger Lab": [
    { name: "Classic Burger", category: "main", price_dh: 60, price_coins: 120, calories: 720, is_halal: true, nutrition_tags: [], allergens: ["gluten", "milk"] },
    { name: "Veggie Burger", category: "main", price_dh: 55, price_coins: 110, calories: 560, is_halal: true, nutrition_tags: ["vegetarian"], allergens: ["gluten"] },
    { name: "Salade César", category: "main", price_dh: 45, price_coins: 90, calories: 380, is_halal: true, nutrition_tags: ["healthy"], allergens: ["milk", "eggs"] },
  ],
  "Fresh Market": [
    { name: "Box Fruits Frais", category: "snack", price_dh: 30, price_coins: 60, calories: 150, is_halal: true, nutrition_tags: ["vegan", "gluten_free", "healthy"], allergens: [] },
    { name: "Yaourt Grec", category: "snack", price_dh: 18, price_coins: 36, calories: 130, is_halal: true, nutrition_tags: ["vegetarian", "gluten_free"], allergens: ["milk"] },
  ],
}

async function seedRestaurants(): Promise<string[]> {
  console.log("\nRestaurants (partners + menu_items)")
  const partnerIds: string[] = []
  for (const r of RESTAURANTS) {
    const { data: existing } = await sb.from("partners").select("id").eq("email", r.email).maybeSingle()
    let partnerId = existing?.id as string | undefined
    if (partnerId) {
      await sb.from("partners").update({ status: "active", sub_category: r.sub }).eq("id", partnerId)
      log("partner", r.company, "noop", "exists → active")
    } else {
      const { data, error } = await sb
        .from("partners")
        .insert({
          email: r.email,
          company_name: r.company,
          partner_type: "venue",
          sub_category: r.sub,
          status: "active",
          description: `${r.company} (${r.city}) — partenaire lifestyle Nivy`,
        })
        .select("id")
        .single()
      if (error || !data) {
        log("partner", r.company, "fail", error?.message)
        continue
      }
      partnerId = data.id
      log("partner", r.company, "ok")
    }
    if (!partnerId) continue
    partnerIds.push(partnerId)

    for (const item of MENU_BY_RESTAURANT[r.company] ?? []) {
      const { data: ex } = await sb
        .from("menu_items")
        .select("id")
        .eq("partner_id", partnerId)
        .eq("name", item.name as string)
        .maybeSingle()
      if (ex) {
        log("menu_item", `${r.company} / ${item.name}`, "noop")
        continue
      }
      const { error: mErr } = await sb
        .from("menu_items")
        .insert({ partner_id: partnerId, is_active: true, ...item })
      log("menu_item", `${r.company} / ${item.name}`, mErr ? "fail" : "ok", mErr?.message)
    }
  }
  return partnerIds
}

// ---------------------------------------------------------------------------
// Internships
// ---------------------------------------------------------------------------
const DURATIONS = ["1_day", "1_week", "2_weeks", "summer", "part_time_school_year"]
const INTERNSHIP_TITLES = [
  "Découverte du code (web)",
  "Initiation au design graphique",
  "Stage marketing digital",
  "Assistant cuisine & nutrition",
  "Photographie événementielle",
  "Initiation à la robotique",
  "Stage communication réseaux sociaux",
  "Découverte du métier d'architecte",
  "Atelier journalisme junior",
  "Stage gestion d'événements",
  "Initiation à la finance personnelle",
  "Stage développement durable",
]

async function seedInternships(partnerIds: string[]) {
  console.log("\nInternships")
  if (partnerIds.length === 0) {
    log("internship", "(no partner)", "skip", "no partner ids available")
    return
  }
  const futureDeadline = (days: number) => {
    const d = new Date()
    d.setDate(d.getDate() + days)
    return d.toISOString().slice(0, 10)
  }
  for (let i = 0; i < INTERNSHIP_TITLES.length; i++) {
    const title = INTERNSHIP_TITLES[i]
    const partnerId = partnerIds[i % partnerIds.length]
    const { data: ex } = await sb
      .from("internships")
      .select("id")
      .eq("partner_id", partnerId)
      .eq("title", title)
      .maybeSingle()
    if (ex) {
      log("internship", title, "noop")
      continue
    }
    const paid = i % 3 === 0
    const { error } = await sb.from("internships").insert({
      partner_id: partnerId,
      title,
      description: `${title} — stage d'initiation encadré pour ados (13-18 ans).`,
      duration: DURATIONS[i % DURATIONS.length],
      age_min: 13,
      age_max: 18,
      spots_total: 5 + (i % 6),
      spots_taken: i % 3,
      paid,
      stipend_dh: paid ? 500 + (i % 4) * 250 : 0,
      required_skills: i % 2 === 0 ? ["motivation"] : ["motivation", "anglais"],
      application_form: {},
      status: "open",
      city: CITIES[i % CITIES.length],
      remote_ok: i % 4 === 0,
      application_deadline: futureDeadline(30 + i * 3),
    })
    log("internship", title, error ? "fail" : "ok", error?.message)
  }
}

// ---------------------------------------------------------------------------
// Mentors (user_id nullable → no auth user needed)
// ---------------------------------------------------------------------------
const MENTORS = [
  { slug: "med1", tags: ["medicine", "science"], exp: 8, rate: 200, name: "Dr. Salma" },
  { slug: "eng1", tags: ["engineering", "coding"], exp: 6, rate: 180, name: "Youssef" },
  { slug: "code1", tags: ["coding"], exp: 4, rate: 150, name: "Imane" },
  { slug: "arts1", tags: ["arts", "music"], exp: 10, rate: 120, name: "Karim" },
  { slug: "biz1", tags: ["business"], exp: 12, rate: 250, name: "Nadia" },
  { slug: "law1", tags: ["law"], exp: 9, rate: 220, name: "Omar" },
  { slug: "sport1", tags: ["sport"], exp: 7, rate: 130, name: "Hicham" },
  { slug: "music1", tags: ["music", "arts"], exp: 5, rate: 110, name: "Lina" },
  { slug: "code2", tags: ["coding", "engineering"], exp: 3, rate: 100, name: "Mehdi" },
  { slug: "med2", tags: ["medicine"], exp: 15, rate: 300, name: "Dr. Fatima" },
]

async function seedMentors() {
  console.log("\nMentors")
  for (const m of MENTORS) {
    const marker = `[seed:mentor-${m.slug}]`
    const { data: ex } = await sb
      .from("mentors")
      .select("id")
      .ilike("bio", `%${marker}%`)
      .maybeSingle()
    if (ex) {
      log("mentor", m.name, "noop")
      continue
    }
    const { error } = await sb.from("mentors").insert({
      expertise_tags: m.tags,
      years_experience: m.exp,
      bio: `${m.name} — mentor·e ${m.tags.join("/")}, ${m.exp} ans d'expérience. ${marker}`,
      hourly_rate_dh: m.rate,
      free_intro_session: true,
      status: "active",
      kyc_status: "approved",
      approved_at: new Date().toISOString(),
      age_min_mentee: 13,
      age_max_mentee: 17,
      rating: 4 + (m.exp % 10) / 10,
      sessions_count: m.exp,
    })
    log("mentor", m.name, error ? "fail" : "ok", error?.message)
  }
}

// ---------------------------------------------------------------------------
// Drivers (user_id nullable → no auth user needed)
// ---------------------------------------------------------------------------
const DRIVERS = [
  { name: "Abdellah B.", phone: "+212600000101", make: "Dacia", model: "Logan", plate: "12345-A-1", cities: ["Casablanca", "Rabat"] },
  { name: "Rachid M.", phone: "+212600000102", make: "Renault", model: "Clio", plate: "23456-B-2", cities: ["Casablanca"] },
  { name: "Said T.", phone: "+212600000103", make: "Hyundai", model: "Accent", plate: "34567-C-3", cities: ["Rabat", "Salé"] },
  { name: "Khalid E.", phone: "+212600000104", make: "Toyota", model: "Yaris", plate: "45678-D-4", cities: ["Marrakech"] },
  { name: "Mohammed A.", phone: "+212600000105", make: "Peugeot", model: "208", plate: "56789-E-5", cities: ["Tanger", "Tétouan"] },
  { name: "Yassine K.", phone: "+212600000106", make: "Dacia", model: "Sandero", plate: "67890-F-6", cities: ["Casablanca", "Mohammedia"] },
]

async function seedDrivers() {
  console.log("\nDrivers")
  for (const d of DRIVERS) {
    const { data: ex } = await sb.from("nivy_drivers").select("id").eq("phone", d.phone).maybeSingle()
    if (ex) {
      await sb.from("nivy_drivers").update({ kyc_status: "approved", is_active: true }).eq("id", ex.id)
      log("driver", d.name, "noop", "exists → approved/active")
      continue
    }
    const { error } = await sb.from("nivy_drivers").insert({
      full_name: d.name,
      phone: d.phone,
      vehicle_make: d.make,
      vehicle_model: d.model,
      vehicle_plate: d.plate,
      kyc_status: "approved",
      is_active: true,
      rating: 4.5,
      service_cities: d.cities,
    })
    log("driver", d.name, error ? "fail" : "ok", error?.message)
  }
}

async function main() {
  console.log(`Seeding lifestyle offer against ${SUPABASE_URL}`)
  const partnerIds = await seedRestaurants()
  await seedInternships(partnerIds)
  await seedMentors()
  await seedDrivers()
  console.log(
    `\nDone — ok:${counts.ok} noop:${counts.noop} skip:${counts.skip} fail:${counts.fail}`,
  )
  if (counts.fail > 0) process.exit(1)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
