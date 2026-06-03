/**
 * @deprecated Surface « logs produit » historique. Le journal canonique de
 * conformité (rétention 7 ans, spec §18/§29 inv.8) est `/admin/audit-log`.
 * Route conservée pour compat ; préférer l'audit-log pour toute nouvelle
 * exploitation (routing refonte §6 #2).
 */
import { getUserRole } from "@/lib/auth/get-user-role"
import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { StickerCard } from "@/components/ui/sticker-card"
import { StatCard } from "@/components/admin/stat-card"
import { NivEmpty } from "@/components/brand"
import BackButton from "@/components/admin/BackButton"
import {
  Activity,
  Calendar,
  User,
  LogIn,
  LogOut,
  Edit,
  Trash2,
  Plus,
  ShieldCheck,
  CreditCard,
  Users
} from "lucide-react"

async function getActivityLogs() {
  const supabase = await createClient()

  // Get activity logs - using a generic activity_logs table
  const { data: logs, error } = await supabase
    .from("activity_logs")
    .select(`
      *,
      user:user_id (
        full_name,
        email
      )
    `)
    .order("created_at", { ascending: false })
    .limit(100)

  if (error) {
    console.error("Error fetching logs:", error)
    return []
  }

  return logs || []
}

export default async function AdminLogsPage() {
  const userInfo = await getUserRole()

  if (!userInfo || userInfo.role !== "admin") {
    redirect("/auth/redirect")
  }

  const logs = await getActivityLogs()

  const getActionIcon = (action: string) => {
    switch (action) {
      case "login":
        return <LogIn className="h-4 w-4 text-lime" />
      case "logout":
        return <LogOut className="h-4 w-4 text-mute" />
      case "create":
        return <Plus className="h-4 w-4 text-teal" />
      case "update":
        return <Edit className="h-4 w-4 text-gold" />
      case "delete":
        return <Trash2 className="h-4 w-4 text-coral" />
      case "permission":
        return <ShieldCheck className="h-4 w-4 text-pink" />
      case "payment":
        return <CreditCard className="h-4 w-4 text-lime" />
      case "user":
        return <Users className="h-4 w-4 text-teal" />
      default:
        return <Activity className="h-4 w-4 text-mute" />
    }
  }

  // Pastille d'action colorée charte (bordure ink + accent token).
  const getActionDot = (action: string) => {
    switch (action) {
      case "login":
      case "payment":
        return "bg-lime/15 text-lime"
      case "create":
      case "user":
        return "bg-teal/15 text-teal"
      case "update":
        return "bg-gold/15 text-gold"
      case "delete":
        return "bg-coral/15 text-coral"
      case "permission":
        return "bg-pink/15 text-pink"
      default:
        return "bg-ink/5 text-mute"
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  // Stats
  const todayLogs = logs.filter((log: any) => {
    const logDate = new Date(log.created_at)
    const today = new Date()
    return logDate.toDateString() === today.toDateString()
  })

  const uniqueUsers = new Set(logs.map((log: any) => log.user_id)).size
  const loginCount = logs.filter((log: any) => log.action === "login").length

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-6 py-12 md:py-32">
        <BackButton href="/admin" label="Retour au dashboard" />

        {/* Header */}
        <header className="mb-8 space-y-2">
          <p className="eyebrow">Système · Logs</p>
          <h1 className="font-display text-3xl font-extrabold tracking-tight text-ink">
            Logs d&apos;<em className="font-semibold italic text-pink">activité</em>
          </h1>
          <p className="text-mute">
            Surveillez toutes les actions sur la plateforme. Journal canonique de conformité :{" "}
            <span className="font-mono text-ink-2">/admin/audit-log</span>.
          </p>
        </header>

        {/* Stats */}
        <div className="mb-8 grid grid-cols-2 gap-4 md:grid-cols-4">
          <StatCard label="Total logs" value={logs.length} tone="lime" icon={<Activity className="h-5 w-5" />} />
          <StatCard label="Aujourd'hui" value={todayLogs.length} tone="teal" icon={<Calendar className="h-5 w-5" />} />
          <StatCard label="Utilisateurs" value={uniqueUsers} tone="coral" icon={<User className="h-5 w-5" />} />
          <StatCard label="Connexions" value={loginCount} tone="gold" icon={<LogIn className="h-5 w-5" />} />
        </div>

        {/* Activity Log List — timeline éditoriale */}
        <StickerCard className="gap-4 p-6">
          <div className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-lime" />
            <h2 className="font-display text-lg font-bold tracking-tight text-ink">Journal d&apos;activité</h2>
          </div>

          {logs.length > 0 ? (
            <ol className="relative space-y-3 border-l-2 border-ink/15 pl-5">
              {logs.map((log: any) => (
                <li key={log.id} className="relative">
                  <span
                    className={`absolute -left-[27px] grid h-8 w-8 place-items-center rounded-full border-2 border-ink ${getActionDot(
                      log.action
                    )}`}
                  >
                    {getActionIcon(log.action)}
                  </span>
                  <div className="flex flex-wrap items-start justify-between gap-2 rounded-xl border-2 border-ink bg-white px-4 py-3 shadow-stkr-sm">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-semibold text-ink">{log.description || log.action}</p>
                        <span className="rounded-full border-2 border-ink px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-[0.1em] text-ink">
                          {log.action}
                        </span>
                      </div>
                      <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-mute">
                        <User className="h-3 w-3" />
                        <span>{log.user?.full_name || log.user?.email || "Système"}</span>
                        {log.user_id ? (
                          <span className="font-mono text-[11px]">#{String(log.user_id).slice(0, 8)}</span>
                        ) : null}
                        {log.resource_type && (
                          <>
                            <span>•</span>
                            <span className="font-mono">{log.resource_type}</span>
                          </>
                        )}
                      </div>
                    </div>
                    <span className="font-mono text-xs text-mute">{formatDate(log.created_at)}</span>
                  </div>
                </li>
              ))}
            </ol>
          ) : (
            <NivEmpty
              title="Aucun log"
              description="Les logs d'activité apparaîtront ici."
            />
          )}
        </StickerCard>
      </div>
    </div>
  )
}
