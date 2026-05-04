import { getUserRole } from "@/lib/auth/get-user-role"
import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  Activity,
  Clock,
  User,
  Calendar,
  Filter,
  Download,
  ArrowLeft,
  LogIn,
  LogOut,
  Edit,
  Trash2,
  Plus,
  ShieldCheck,
  CreditCard,
  Users
} from "lucide-react"
import Link from "next/link"

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
        return <LogIn className="h-4 w-4 text-emerald-400" />
      case "logout":
        return <LogOut className="h-4 w-4 text-zinc-400" />
      case "create":
        return <Plus className="h-4 w-4 text-blue-400" />
      case "update":
        return <Edit className="h-4 w-4 text-amber-400" />
      case "delete":
        return <Trash2 className="h-4 w-4 text-red-400" />
      case "permission":
        return <ShieldCheck className="h-4 w-4 text-purple-400" />
      case "payment":
        return <CreditCard className="h-4 w-4 text-emerald-400" />
      case "user":
        return <Users className="h-4 w-4 text-blue-400" />
      default:
        return <Activity className="h-4 w-4 text-zinc-400" />
    }
  }

  const getActionBadge = (action: string) => {
    switch (action) {
      case "login":
        return "bg-emerald-500/20 text-emerald-400"
      case "logout":
        return "bg-zinc-500/20 text-zinc-400"
      case "create":
        return "bg-blue-500/20 text-blue-400"
      case "update":
        return "bg-amber-500/20 text-amber-400"
      case "delete":
        return "bg-red-500/20 text-red-400"
      case "permission":
        return "bg-purple-500/20 text-purple-400"
      case "payment":
        return "bg-emerald-500/20 text-emerald-400"
      default:
        return "bg-zinc-500/20 text-zinc-400"
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
    <div className="min-h-screen bg-zinc-950">
      <div className="container mx-auto px-6 py-32">
        {/* Back button */}
        <Button variant="ghost" asChild className="mb-6 text-zinc-400 hover:text-white">
          <Link href="/admin">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Retour au dashboard
          </Link>
        </Button>

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-black text-white">Logs d'Activité</h1>
            <p className="text-zinc-400">Surveillez toutes les actions sur la plateforme</p>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" className="border-zinc-700 text-zinc-300">
              <Filter className="h-4 w-4 mr-2" />
              Filtrer
            </Button>
            <Button variant="outline" className="border-zinc-700 text-zinc-300">
              <Download className="h-4 w-4 mr-2" />
              Exporter
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Card className="bg-gradient-to-br from-emerald-500/20 to-green-500/20 border-emerald-500/30 bg-zinc-900">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-emerald-400 font-medium">Total Logs</p>
                  <p className="text-3xl font-black text-white">{logs.length}</p>
                </div>
                <div className="h-12 w-12 rounded-full bg-emerald-500/20 flex items-center justify-center">
                  <Activity className="h-6 w-6 text-emerald-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-blue-500/20 to-cyan-500/20 border-blue-500/30 bg-zinc-900">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-blue-400 font-medium">Aujourd'hui</p>
                  <p className="text-3xl font-black text-white">{todayLogs.length}</p>
                </div>
                <div className="h-12 w-12 rounded-full bg-blue-500/20 flex items-center justify-center">
                  <Calendar className="h-6 w-6 text-blue-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-500/20 to-pink-500/20 border-purple-500/30 bg-zinc-900">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-purple-400 font-medium">Utilisateurs</p>
                  <p className="text-3xl font-black text-white">{uniqueUsers}</p>
                </div>
                <div className="h-12 w-12 rounded-full bg-purple-500/20 flex items-center justify-center">
                  <User className="h-6 w-6 text-purple-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-amber-500/20 to-orange-500/20 border-amber-500/30 bg-zinc-900">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-amber-400 font-medium">Connexions</p>
                  <p className="text-3xl font-black text-white">{loginCount}</p>
                </div>
                <div className="h-12 w-12 rounded-full bg-amber-500/20 flex items-center justify-center">
                  <LogIn className="h-6 w-6 text-amber-400" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Activity Log List */}
        <Card className="bg-gradient-to-br from-zinc-900 to-zinc-950 border-zinc-800">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Activity className="h-5 w-5 text-emerald-400" />
              Journal d'activité
            </CardTitle>
          </CardHeader>
          <CardContent>
            {logs.length > 0 ? (
              <div className="space-y-2">
                {logs.map((log: any) => (
                  <div
                    key={log.id}
                    className="flex items-center justify-between p-4 rounded-xl bg-zinc-900 border border-zinc-800 hover:border-zinc-700 transition-all"
                  >
                    <div className="flex items-center gap-4">
                      <div className="h-10 w-10 rounded-xl bg-zinc-800 flex items-center justify-center">
                        {getActionIcon(log.action)}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-white">{log.description || log.action}</p>
                          <span className={`text-xs px-2 py-0.5 rounded-full ${getActionBadge(log.action)}`}>
                            {log.action}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-zinc-400">
                          <User className="h-3 w-3" />
                          <span>{log.user?.full_name || log.user?.email || "Système"}</span>
                          {log.resource_type && (
                            <>
                              <span>•</span>
                              <span>{log.resource_type}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 text-zinc-500">
                      <Clock className="h-4 w-4" />
                      <span className="text-sm">{formatDate(log.created_at)}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <Activity className="h-16 w-16 mx-auto mb-4 text-zinc-700" />
                <h3 className="text-xl font-bold text-white mb-2">Aucun log</h3>
                <p className="text-zinc-400">Les logs d'activité apparaîtront ici</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
