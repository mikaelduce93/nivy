import { createClient } from "@/lib/supabase/server"
import { NextRequest, NextResponse } from "next/server"
import { withSecurity } from "@/lib/security/api-middleware"
import fs from "fs/promises"
import path from "path"
import { createServiceRoleClient } from "@/lib/supabase/service-role"
import { splitSqlStatements } from "@/lib/utils/sql"

export const POST = withSecurity(async (request: NextRequest) => {
  try {
    if (process.env.ENABLE_ADMIN_SQL_EXECUTION !== "true") {
      return NextResponse.json(
        { error: "Exécution SQL désactivée (ENABLE_ADMIN_SQL_EXECUTION != true)" },
        { status: 403 }
      )
    }

    const supabase = await createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 })
    }

    const { data: adminRole } = await supabase.from("admin_roles").select("*").eq("profile_id", user.id).single()

    if (!adminRole || !["super_admin", "admin"].includes(adminRole.role)) {
      return NextResponse.json({ error: "Accès refusé" }, { status: 403 })
    }

    const { scriptId } = await request.json()

    if (!scriptId) {
      return NextResponse.json({ error: "Script ID manquant" }, { status: 400 })
    }

    if (!/^\d{3}$/.test(String(scriptId))) {
      return NextResponse.json({ error: "Script ID invalide" }, { status: 400 })
    }

    // Allow-list for production safety
    const allowedScriptIds = new Set(["105", "106", "107", "108", "109"])
    if (!allowedScriptIds.has(String(scriptId))) {
      return NextResponse.json({ error: "Script non autorisé" }, { status: 403 })
    }

    const scriptsDir = path.join(process.cwd(), "scripts")
    const files = await fs.readdir(scriptsDir)
    const scriptFile = files.find((f) => f.startsWith(`${scriptId}_`))

    if (!scriptFile) {
      return NextResponse.json({ error: `Script ${scriptId} non trouvé` }, { status: 404 })
    }

    const fullPath = path.join(scriptsDir, scriptFile)
    const sqlContent = await fs.readFile(fullPath, "utf-8")

    // Execute using service role (server-only)
    const service = createServiceRoleClient()

    // Split SQL safely (handles $$...$$, quotes, comments)
    const statements = splitSqlStatements(sqlContent)

    for (const statement of statements) {
      if (statement.trim()) {
        const { error } = await service.rpc("exec_sql", { sql: statement })
        
        if (error) {
          console.error("[v0] SQL execution error:", error)
          return NextResponse.json({ 
            error: `Erreur SQL: ${error.message}`,
            statement: statement.substring(0, 100) + '...'
          }, { status: 500 })
        }
      }
    }

    return NextResponse.json({ 
      success: true, 
      message: `Script ${scriptId} exécuté avec succès`,
      statementsExecuted: statements.length,
    })
  } catch (error: any) {
    console.error("[v0] Execute SQL error:", error)
    return NextResponse.json({ error: error.message || "Erreur serveur" }, { status: 500 })
  }
}, { rateLimit: 'api' })
