/**
 * /api/admin/execute-sql — RING-FENCED.
 *
 * Canon: docs/canon/admin-moderation.locked.md §10 FORBIDDEN #2 + §12.D3.
 *
 * Both gates required:
 *   - super_admin sub-role (via getAdminInfo).
 *   - process.env.ENABLE_ADMIN_SQL_CONSOLE === 'true' (Wave 1C canonical name)
 *     OR legacy process.env.ENABLE_ADMIN_SQL_EXECUTION === 'true' (back-compat).
 *
 * On any failure path (auth missing, wrong sub-role, env disabled): return
 * 404 (not 403) per Wave 1C ring-fence policy. Every attempt — allowed or
 * denied — writes to audit_log with `action='sql_execute'`.
 */
import { NextRequest, NextResponse } from "next/server"
import fs from "fs/promises"
import path from "path"
import { withSecurity } from "@/lib/security/api-middleware"
import { createServiceRoleClient } from "@/lib/supabase/service-role"
import { splitSqlStatements } from "@/lib/utils/sql"
import { getAdminInfo, logAdminAction } from "@/lib/auth/admin-permissions"

function isSqlConsoleEnabled(): boolean {
  return (
    process.env.ENABLE_ADMIN_SQL_CONSOLE === "true" ||
    // back-compat with the pre-Wave-1C name
    process.env.ENABLE_ADMIN_SQL_EXECUTION === "true"
  )
}

export const POST = withSecurity(
  async (request: NextRequest) => {
    const admin = await getAdminInfo()
    const envEnabled = isSqlConsoleEnabled()
    const isSuperAdmin = admin?.subRole === "super_admin"

    // Audit the attempt — even denials. throws on failure.
    if (admin) {
      await logAdminAction({
        actor_id: admin.profileId,
        actor_role: admin.subRole,
        action: "sql_execute",
        resource_type: "system",
        resource_id: "execute-sql",
        description: `SQL execute attempt (super_admin=${isSuperAdmin}, env_enabled=${envEnabled})`,
        metadata: {
          subRole: admin.subRole,
          env_enabled: envEnabled,
          allowed: isSuperAdmin && envEnabled,
        },
      })
    }

    // Fail closed: 404 obscures the surface from non-super_admins.
    if (!admin || !isSuperAdmin || !envEnabled) {
      return NextResponse.json({ error: "Not Found" }, { status: 404 })
    }

    let scriptId: string | undefined
    try {
      const body = await request.json()
      scriptId = body?.scriptId
    } catch {
      return NextResponse.json({ error: "Invalid body" }, { status: 400 })
    }

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
    const service = createServiceRoleClient()
    const statements = splitSqlStatements(sqlContent)

    const startedAt = Date.now()
    let stmtCount = 0
    for (const statement of statements) {
      if (statement.trim()) {
        const { error } = await service.rpc("exec_sql", { sql: statement })
        if (error) {
          await logAdminAction({
            actor_id: admin.profileId,
            actor_role: admin.subRole,
            action: "sql_execute_failed",
            resource_type: "system",
            resource_id: scriptFile,
            description: `SQL execution failed at statement ${stmtCount + 1}`,
            metadata: { script: scriptFile, statementCount: stmtCount, error: error.message },
          })
          return NextResponse.json(
            { error: `Erreur SQL: ${error.message}`, statement: statement.substring(0, 100) + "..." },
            { status: 500 }
          )
        }
        stmtCount++
      }
    }

    await logAdminAction({
      actor_id: admin.profileId,
      actor_role: admin.subRole,
      action: "sql_execute_success",
      resource_type: "system",
      resource_id: scriptFile,
      description: `SQL execution succeeded (${stmtCount} statements)`,
      metadata: {
        script: scriptFile,
        statementCount: stmtCount,
        durationMs: Date.now() - startedAt,
      },
    })

    return NextResponse.json({
      success: true,
      message: `Script ${scriptId} exécuté avec succès`,
      statementsExecuted: stmtCount,
    })
  },
  { rateLimit: "api" }
)
