import { getUserRole } from "@/lib/auth/get-user-role"
import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Bell,
  BellOff,
  Clock,
  ArrowLeft,
  Settings as SettingsIcon,
  CheckCheck,
} from "lucide-react"
import Link from "next/link"

// Server-rendered notifications inbox.
// Whitepaper §16: reads `user_notifications` (not bespoke mock arrays).
// Quiet-hours indicator + per-channel toggles will land with WaveD.

async function getParentNotifications(parentId: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("user_notifications")
    .select(
      "id, title, body, icon, color, emoji, action_url, action_label, is_read, read_at, created_at, priority"
    )
    .eq("user_id", parentId)
    .order("created_at", { ascending: false })
    .limit(50)

  if (error) {
    // Table missing or RLS blocked -> empty state, no crash.
    console.warn("[parent/notifications] user_notifications unavailable:", error.message)
    return []
  }
  return data ?? []
}

function formatRelative(iso: string | null): string {
  if (!iso) return ""
  const d = new Date(iso)
  const diffMs = Date.now() - d.getTime()
  const min = Math.floor(diffMs / 60_000)
  if (min < 1) return "à l'instant"
  if (min < 60) return `il y a ${min} min`
  const hr = Math.floor(min / 60)
  if (hr < 24) return `il y a ${hr} h`
  const day = Math.floor(hr / 24)
  if (day < 7) return `il y a ${day} j`
  return d.toLocaleDateString("fr-FR", { day: "numeric", month: "short" })
}

export default async function ParentNotificationsPage() {
  const userInfo = await getUserRole()
  if (!userInfo || userInfo.role !== "parent") {
    redirect("/auth/redirect")
  }

  const notifications = await getParentNotifications(userInfo.profileId)
  const unreadCount = notifications.filter((n: any) => !n.is_read).length

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <div className="container mx-auto px-6 py-32 max-w-5xl">
        <Button asChild variant="ghost" className="mb-6 text-zinc-400 hover:text-white">
          <Link href="/parent">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Retour au dashboard
          </Link>
        </Button>

        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-black text-white flex items-center gap-3">
              <Bell className="w-8 h-8 text-emerald-400" />
              Notifications
              {unreadCount > 0 && (
                <Badge className="bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                  {unreadCount} non lue{unreadCount > 1 ? "s" : ""}
                </Badge>
              )}
            </h1>
            <p className="text-zinc-400 mt-1">
              Activité de vos teens, approbations et alertes Nivy
            </p>
          </div>
          <Button asChild variant="outline" className="border-zinc-700 text-zinc-200">
            <Link href="/parent/settings">
              <SettingsIcon className="w-4 h-4 mr-2" />
              Préférences
            </Link>
          </Button>
        </div>

        {notifications.length === 0 ? (
          <Card className="bg-zinc-900 border-zinc-800">
            <CardContent className="py-16 text-center">
              <BellOff className="w-12 h-12 mx-auto mb-4 text-zinc-600" />
              <p className="text-white font-bold">Aucune notification</p>
              <p className="text-zinc-400 mt-1 max-w-md mx-auto">
                Quand votre teen demandera une approbation, fera un check-in
                ou quand un paiement sera confirmé, le message apparaîtra ici.
              </p>
              <div className="mt-6 flex items-center justify-center gap-3">
                <Button asChild variant="outline" className="border-zinc-700 text-zinc-200">
                  <Link href="/parent/approvals">Voir les approbations</Link>
                </Button>
                <Button asChild className="bg-emerald-500 hover:bg-emerald-600 text-zinc-950 font-bold">
                  <Link href="/parent/settings">Régler les préférences</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {unreadCount > 0 && (
              <div className="flex items-center justify-end mb-2 text-xs text-zinc-500">
                <CheckCheck className="w-3 h-3 mr-1" />
                Marquage automatique au clic
              </div>
            )}
            {notifications.map((n: any) => (
              <Card
                key={n.id}
                className={`bg-zinc-900 border-zinc-800 transition-all ${
                  !n.is_read ? "border-l-4 border-l-cyan-500" : ""
                }`}
              >
                <CardContent className="p-4">
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center flex-shrink-0 text-lg">
                      {n.emoji || "🔔"}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3
                          className={`font-bold ${
                            n.is_read ? "text-zinc-400" : "text-white"
                          }`}
                        >
                          {n.title}
                        </h3>
                        {n.priority === "high" && (
                          <Badge className="bg-amber-500/20 text-amber-300 text-xs">
                            Important
                          </Badge>
                        )}
                      </div>
                      <p className={`text-sm ${n.is_read ? "text-zinc-500" : "text-zinc-300"}`}>
                        {n.body}
                      </p>
                      <div className="flex items-center gap-4 mt-2">
                        <span className="text-xs text-zinc-500 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {formatRelative(n.created_at)}
                        </span>
                        {n.action_url && (
                          <Link
                            href={n.action_url}
                            className="text-xs text-cyan-400 hover:underline"
                          >
                            {n.action_label || "Voir détails"} →
                          </Link>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
