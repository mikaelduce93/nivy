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
import { Button } from "@/components/ui/button"
import { StickerCard } from "@/components/ui/sticker-card"
import { DarkSurface } from "@/components/brand"
import { AlertCircle, CheckCircle2, Database, ExternalLink, FileText, ShieldCheck } from "lucide-react"
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
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-6 py-32">
        <BackButton href="/admin" label="Retour au dashboard" />

        {/* Header */}
        <header className="mb-8 space-y-2">
          <p className="eyebrow">Super Admin · SQL</p>
          <h1 className="font-display text-3xl font-extrabold tracking-tight text-ink flex items-center gap-3">
            <Database className="h-8 w-8 text-teal" />
            Console <em className="font-semibold italic text-pink">SQL</em>
          </h1>
          <p className="text-mute">Réservée aux super-admins.</p>
        </header>

        {/* Bandeau sombre : zone auditée */}
        <DarkSurface tone="coral" shadow className="mb-8 p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <ShieldCheck className="mt-0.5 h-6 w-6 text-coral" />
              <div>
                <h2 className="font-display text-lg font-extrabold tracking-tight text-paper">
                  Chaque accès est journalisé
                </h2>
                <p className="mt-1 text-sm text-paper/70">
                  Toute ouverture de cette console écrit une entrée dans{" "}
                  <code className="font-mono text-paper">audit_log</code> (action{" "}
                  <code className="font-mono text-paper">sql_console_access</code>).
                </p>
              </div>
            </div>
            <span className="rounded-full border-2 border-paper/40 px-3 py-1 font-mono text-[10px] font-bold uppercase tracking-[0.12em] text-paper">
              Audité
            </span>
          </div>
        </DarkSurface>

        {/* Pourquoi manuellement */}
        <StickerCard className="mb-8 gap-3 p-6">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-teal" />
            <h2 className="font-display text-lg font-bold tracking-tight text-ink">
              Pourquoi exécuter manuellement ?
            </h2>
          </div>
          <p className="text-ink-2">
            Pour des raisons de sécurité, l&apos;exécution de SQL arbitraire n&apos;est pas autorisée depuis
            l&apos;application. Les scripts doivent être exécutés via le SQL Editor Supabase.
          </p>
        </StickerCard>

        {/* Accès SQL Editor */}
        <StickerCard className="mb-8 gap-4 p-6">
          <div>
            <h2 className="font-display text-lg font-bold tracking-tight text-ink">Accéder au SQL Editor</h2>
            <p className="text-sm text-mute">Ouvrez le SQL Editor Supabase pour exécuter les scripts.</p>
          </div>
          <Button asChild variant="default" size="lg" className="h-14 w-full">
            <a href={sqlEditorUrl} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="mr-3 h-5 w-5" />
              Ouvrir Supabase SQL Editor
            </a>
          </Button>
        </StickerCard>

        {/* Liste des scripts */}
        <StickerCard className="mb-8 gap-4 p-6">
          <div>
            <h2 className="font-display text-lg font-bold tracking-tight text-ink">
              Scripts à exécuter dans l&apos;ordre
            </h2>
            <p className="text-sm text-mute">Copiez le contenu de chaque script et collez-le dans le SQL Editor.</p>
          </div>
          <div className="space-y-3">
            {SCRIPTS.map((script, index) => (
              <div
                key={script.id}
                className="flex items-start gap-4 rounded-xl border-2 border-ink bg-white p-4 shadow-stkr-sm"
              >
                <span className="grid h-8 w-8 flex-shrink-0 place-items-center rounded-full border-2 border-ink bg-ink font-mono text-sm font-bold text-paper">
                  {index + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <h3 className="flex items-center gap-2 font-mono text-sm font-bold text-ink">
                    <FileText className="h-4 w-4" />
                    {script.name}
                  </h3>
                  <p className="mt-1 text-sm text-mute">{script.description}</p>
                  <p className="mt-2 font-mono text-xs text-mute">scripts/{script.name}</p>
                </div>
              </div>
            ))}
          </div>
        </StickerCard>

        {/* Instructions */}
        <StickerCard className="gap-4 p-6">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-lime" />
            <h2 className="font-display text-lg font-bold tracking-tight text-ink">Instructions étape par étape</h2>
          </div>
          <ol className="list-inside list-decimal space-y-2 text-ink-2">
            <li>Cliquez sur « Ouvrir Supabase SQL Editor » ci-dessus</li>
            <li>Copiez le contenu du fichier souhaité</li>
            <li>Collez-le dans l&apos;éditeur SQL et cliquez sur « Run »</li>
            <li>Attendez la confirmation</li>
            <li>Répétez dans l&apos;ordre</li>
          </ol>
        </StickerCard>
      </div>
    </div>
  )
}
