import { createClient } from "@supabase/supabase-js"
import { readFileSync } from "node:fs"

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

const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
  auth: { autoRefreshToken: false, persistSession: false },
})

async function main() {
  const tables = ["educational_quizzes", "quiz_attempts", "shop_rewards", "reward_categories", "partners", "bookings", "events", "profiles"]
  for (const t of tables) {
    const { error, count } = await admin.from(t).select("*", { count: "exact", head: true })
    console.log(`${t.padEnd(25)} ${error ? "MISSING (" + error.code + ": " + error.message.slice(0, 60) + ")" : `OK (${count ?? 0} rows)`}`)
  }
}
main()
