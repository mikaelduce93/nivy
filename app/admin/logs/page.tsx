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
        return <LogIn className="h-4 w-4 text-lime" />
      case "logout":
        return <LogOut className="h-4 w-4 text-mute" />
      case "create":
        return <Plus className="h-4 w-4 text-teal" />
      case "update":
        return <Edit className="h-4 w-4 text-gold" />
      case "delete":
        return <Trash2 className="h-4 w-4 text-destructive" />
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

  const getActionBadge = (action: string) => {
    switch (action) {
      case "login":
        return "bg-lime/20 text-lime"
      case "logout":
        return "bg-muted text-mute"
      case "create":
        return "bg-teal/20 text-teal"
      case "update":
        return "bg-gold/20 text-gold"
      case "delete":
        return "bg-destructive/20 text-destructive"
      case "permission":
        return "bg-pink/20 text-pink"
      case "payment":
        return "bg-lime/20 text-lime"
      default:
        return "bg-muted text-mute"
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
      <div className="container mx-auto px-6 py-32">
        {/* Back button */}
        <Button variant="ghost" asChild className="mb-6 text-mute hover:text-ink">
          <Link href="/admin">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Retour au dashboard
          </Link>
        </Button>

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-black text-ink">Logs d'Activité</h1>
            <p className="text-mute">Surveillez toutes les actions sur la plateforme</p>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" className="border-ink text-ink-2">
              <Filter className="h-4 w-4 mr-2" />
              Filtrer
            </Button>
            <Button variant="outline" className="border-ink text-ink-2">
              <Download className="h-4 w-4 mr-2" />
              Exporter
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Card className="bg-gradient-to-br from-lime/20 to-lime/20 border-lime/30 bg-card">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-lime font-medium">Total Logs</p>
                  <p className="text-3xl font-black text-ink">{logs.length}</p>
                </div>
                <div className="h-12 w-12 rounded-full bg-lime/20 flex items-center justify-center">
                  <Activity className="h-6 w-6 text-lime" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-teal/20 to-teal/20 border-teal/30 bg-card">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-teal font-medium">Aujourd'hui</p>
                  <p className="text-3xl font-black text-ink">{todayLogs.length}</p>
                </div>
                <div className="h-12 w-12 rounded-full bg-teal/20 flex items-center justify-center">
                  <Calendar className="h-6 w-6 text-teal" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-pink/20 to-pink/20 border-pink/30 bg-card">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-pink font-medium">Utilisateurs</p>
                  <p className="text-3xl font-black text-ink">{uniqueUsers}</p>
                </div>
                <div className="h-12 w-12 rounded-full bg-pink/20 flex items-center justify-center">
                  <User className="h-6 w-6 text-pink" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-gold/20 to-coral/20 border-gold/30 bg-card">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gold font-medium">Connexions</p>
                  <p className="text-3xl font-black text-ink">{loginCount}</p>
                </div>
                <div className="h-12 w-12 rounded-full bg-gold/20 flex items-center justify-center">
                  <LogIn className="h-6 w-6 text-gold" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Activity Log List */}
        <Card className="bg-gradient-to-br from-paper-2 to-card border-ink">
          <CardHeader>
            <CardTitle className="text-ink flex items-center gap-2">
              <Activity className="h-5 w-5 text-lime" />
              Journal d'activité
            </CardTitle>
          </CardHeader>
          <CardContent>
            {logs.length > 0 ? (
              <div className="space-y-2">
                {logs.map((log: any) => (
                  <div
                    key={log.id}
                    className="flex items-center justify-between p-4 rounded-xl bg-card border border-ink hover:border-ink transition-all"
                  >
                    <div className="flex items-center gap-4">
                      <div className="h-10 w-10 rounded-xl bg-card flex items-center justify-center">
                        {getActionIcon(log.action)}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-ink">{log.description || log.action}</p>
                          <span className={`text-xs px-2 py-0.5 rounded-full ${getActionBadge(log.action)}`}>
                            {log.action}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-mute">
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
                    <div className="flex items-center gap-3 text-mute">
                      <Clock className="h-4 w-4" />
                      <span className="text-sm">{formatDate(log.created_at)}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <Activity className="h-16 w-16 mx-auto mb-4 text-ink" />
                <h3 className="text-xl font-bold text-ink mb-2">Aucun log</h3>
                <p className="text-mute">Les logs d'activité apparaîtront ici</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
