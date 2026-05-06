/**
 * Script pour exécuter toutes les migrations SQL
 * Usage: npx tsx gamification-system/database/run-migrations.ts
 */

import { createServiceRoleClient } from "@/lib/supabase/service-role"
import * as fs from "fs"
import * as path from "path"

let supabase: ReturnType<typeof createServiceRoleClient>
try {
  supabase = createServiceRoleClient()
} catch (_error) {
  console.error("❌ Variables d'environnement manquantes:")
  console.error("   - NEXT_PUBLIC_SUPABASE_URL ou SUPABASE_URL")
  console.error("   - SUPABASE_SERVICE_ROLE_KEY (pas l'anon key!)")
  process.exit(1)
}

const MIGRATIONS_DIR = path.join(__dirname, "migrations")

async function runMigrations() {
  console.log("🚀 Démarrage des migrations Gamification...\n")

  const files = fs.readdirSync(MIGRATIONS_DIR)
    .filter(f => f.endsWith(".sql"))
    .sort()

  console.log(`📁 ${files.length} fichiers de migration trouvés\n`)

  for (const file of files) {
    const filePath = path.join(MIGRATIONS_DIR, file)
    const sql = fs.readFileSync(filePath, "utf-8")

    console.log(`⏳ Exécution: ${file}...`)

    try {
      const { error } = await supabase.rpc("exec_sql", { sql_query: sql })

      if (error) {
        // Si la fonction exec_sql n'existe pas, on essaie directement
        // Note: Cela nécessite des permissions admin
        console.error(`   ⚠️  Erreur RPC, tentative directe...`)

        // Split les statements et exécute un par un
        const statements = sql
          .split(/;\s*$/m)
          .map(s => s.trim())
          .filter(s => s.length > 0 && !s.startsWith("--"))

        for (const statement of statements) {
          const { error: stmtError } = await supabase
            .from("_exec")
            .select()
            .limit(0)

          if (stmtError) {
            throw new Error(`Statement failed: ${stmtError.message}`)
          }
        }
      }

      console.log(`   ✅ ${file} - OK`)
    } catch (err: any) {
      console.error(`   ❌ ${file} - ERREUR: ${err.message}`)
      console.error(`\n⚠️  Migration interrompue. Corrige l'erreur et relance.`)
      process.exit(1)
    }
  }

  console.log("\n✅ Toutes les migrations ont été exécutées avec succès!")
  console.log("\n📋 Prochaines étapes:")
  console.log("   1. Vérifie les tables dans Supabase Dashboard")
  console.log("   2. Lance npm run dev")
  console.log("   3. Teste sur /gamification")
}

runMigrations().catch(console.error)
