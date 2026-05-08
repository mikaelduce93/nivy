/**
 * /admin/scripts-sql — RING-FENCED.
 *
 * Canon: docs/canon/admin-moderation.locked.md §10 FORBIDDEN #2 + §12.D3 +
 * docs/canon/roles-permissions.locked.md §2 (system.sql = super_admin only).
 *
 * Access requires ALL of:
 *   1. Authenticated user (`getAdminInfo()` returns non-null).
 *   2. Top-level role `profiles.role = 'admin'` (enforced inside getAdminInfo).
 *   3. Admin sub-role `super_admin` (NOT admin / moderator / support).
 *   4. `process.env.ENABLE_ADMIN_SQL_CONSOLE === 'true'`.
 *
 * Failure mode is `notFound()` (HTTP 404), NOT 403 — fewer probe leaks.
 * Every access attempt (allowed or denied) writes an audit_log row with
 * `action='sql_console_access'`.
 */

import { notFound } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { AlertCircle, CheckCircle2, Database, ExternalLink, FileText } from "lucide-react"
import Link from "next/link"
import BackButton from "@/components/admin/BackButton"
import { getAdminInfo, logAdminAction } from "@/lib/auth/admin-permissions"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

const SCRIPTS = [
  { id: "105", name: "105_create_djs_and_campaigns.sql", description: "Tables DJs, Galerie, Blog, FAQ, Témoignages" },
  { id: "106", name: "106_seed_djs_and_content.sql", description: "Données de démonstration (4 DJs, blog, FAQ)" },
  { id: "107", name: "107_add_critical_rls_policies.sql", description: "Policies RLS sécurité critiques" },
  { id: "108", name: "108_add_operational_features.sql", description: "Check-in amélioré, E-signature, Purge RGPD" },
  { id: "109", name: "109_add_morocco_payments.sql", description: "CMI, Mobile Money, Cash ambassadeurs" },
] as const

function isSqlConsoleEnabled(): boolean {
  return process.env.ENABLE_ADMIN_SQL_CONSOLE === "true"
}

function resolveSupabaseSqlEditorUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_SUPABASE_PROJECT_ID
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  let projectId: string | null = explicit ?? null
  if (!projectId && url) {
    const match = url.match(/^https?:\/\/([^.]+)\.supabase\.co/i)
    projectId = match ? match[1] : null
  }
  return projectId
    ? `https://supabase.com/dashboard/project/${projectId}/sql/new`
    : "https://supabase.com/dashboard"
}

export default async function SQLScriptsPage() {
  const admin = await getAdminInfo()
  const envEnabled = isSqlConsoleEnabled()
  const isSuperAdmin = admin?.subRole === "super_admin"

  // Audit every access attempt — allowed or denied — for ops visibility on
  // who is poking at the SQL console. throws on failure (canon §10 #9).
  if (admin) {
    try {
      await logAdminAction({
        actor_id: admin.profileId,
        actor_role: admin.subRole,
        action: "sql_console_access",
        resource_type: "system",
        resource_id: "scripts-sql",
        description: `SQL console access attempt (super_admin=${isSuperAdmin}, env_enabled=${envEnabled})`,
        metadata: {
          subRole: admin.subRole,
          env_enabled: envEnabled,
          allowed: isSuperAdmin && envEnabled,
        },
      })
    } catch (e) {
      // Audit MUST land. If it doesn't, fail closed.
      console.error("[scripts-sql] audit_log write failed:", e)
      notFound()
    }
  }

  // Fail closed: anything less than super_admin + env flag = 404.
  if (!admin || !isSuperAdmin || !envEnabled) {
    notFound()
  }

  const sqlEditorUrl = resolveSupabaseSqlEditorUrl()

  return (
    <div className="min-h-screen bg-zinc-950">
      <div className="container mx-auto px-6 py-32">
        <BackButton href="/admin" label="Retour au dashboard" />
        <div className="mb-12">
          <h1 className="text-4xl md:text-5xl font-black text-white mb-4 flex items-center gap-4">
            <Database className="w-12 h-12 text-cyan-400" />
            Scripts SQL — super_admin
          </h1>
          <p className="text-zinc-400 text-lg">
            Console réservée aux super-admins ; chaque accès est journalisé dans <code>audit_log</code>.
          </p>
        </div>

        <Card className="bg-gradient-to-br from-blue-900/20 to-cyan-900/20 border-blue-500/30 mb-8">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-3">
              <AlertCircle className="w-6 h-6 text-blue-400" />
              Pourquoi exécuter manuellement ?
            </CardTitle>
          </CardHeader>
          <CardContent className="text-zinc-300 space-y-3">
            <p>
              Pour des raisons de sécurité, l&apos;exécution de SQL arbitraire n&apos;est pas autorisée depuis l&apos;application. Les
              scripts doivent être exécutés via le SQL Editor Supabase.
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-zinc-900 to-zinc-950 border-zinc-800 mb-8">
          <CardHeader>
            <CardTitle className="text-white">Accéder au SQL Editor</CardTitle>
            <CardDescription>Ouvrez le SQL Editor Supabase pour exécuter les scripts</CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              asChild
              size="lg"
              className="w-full bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white h-14"
            >
              <a href={sqlEditorUrl} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="w-5 h-5 mr-3" />
                Ouvrir Supabase SQL Editor
              </a>
            </Button>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-zinc-900 to-zinc-950 border-zinc-800 mb-8">
          <CardHeader>
            <CardTitle className="text-white">Scripts à exécuter dans l&apos;ordre</CardTitle>
            <CardDescription>Copiez le contenu de chaque script et collez-le dans le SQL Editor</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {SCRIPTS.map((script, index) => (
                <div key={script.id} className="p-4 bg-zinc-900 rounded-xl border border-zinc-800">
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-cyan-500/20 flex items-center justify-center">
                      <span className="text-cyan-400 font-bold">{index + 1}</span>
                    </div>
                    <div className="flex-1">
                      <h3 className="text-white font-semibold flex items-center gap-2">
                        <FileText className="w-4 h-4" />
                        {script.name}
                      </h3>
                      <p className="text-zinc-400 text-sm mt-1">{script.description}</p>
                      <p className="text-zinc-500 text-xs mt-2 font-mono">Fichier: scripts/{script.name}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-zinc-900 to-zinc-950 border-zinc-800">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <CheckCircle2 className="w-6 h-6 text-green-400" />
              Instructions étape par étape
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <ol className="text-zinc-300 space-y-3 list-decimal list-inside">
              <li>Cliquez sur &quot;Ouvrir Supabase SQL Editor&quot; ci-dessus</li>
              <li>Copiez le contenu du fichier souhaité</li>
              <li>Collez-le dans l&apos;éditeur SQL et cliquez sur &quot;Run&quot;</li>
              <li>Attendez la confirmation</li>
              <li>Répétez dans l&apos;ordre</li>
            </ol>
            <div className="mt-6">
              <Link href="/docs/EXECUTER_SCRIPTS_SQL.md">
                <Button variant="outline" className="border-zinc-700 text-zinc-300">
                  <FileText className="w-4 h-4 mr-2" />
                  Voir le guide complet
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
