import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { Bell, Check, Trash2, Settings } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import Link from "next/link"

export default async function NotificationsPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login?redirect=/notifications")
  }

  const { data: notifications } = await supabase
    .from("notifications")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(50)

  const unreadCount = notifications?.filter((n) => !n.read).length || 0

  return (
    <div className="min-h-screen bg-zinc-950">
      <div className="container mx-auto px-6 py-32">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-4xl font-black text-white mb-2">Notifications</h1>
              <p className="text-zinc-400">
                {unreadCount > 0 ? `${unreadCount} non lue${unreadCount > 1 ? "s" : ""}` : "Tout est lu"}
              </p>
            </div>
            <div className="flex gap-2">
              {unreadCount > 0 && (
                <form action="/api/notifications/mark-all-read" method="POST">
                  <Button type="submit" variant="outline" className="bg-transparent border-green-500 text-green-400">
                    <Check className="w-4 h-4 mr-2" />
                    Tout marquer lu
                  </Button>
                </form>
              )}
              <Button asChild variant="outline" className="bg-transparent border-cyan-500 text-cyan-400">
                <Link href="/notifications/preferences">
                  <Settings className="w-4 h-4 mr-2" />
                  Préférences
                </Link>
              </Button>
            </div>
          </div>

          {notifications && notifications.length > 0 ? (
            <div className="space-y-3">
              {notifications.map((notification) => {
                const isUnread = !notification.read

                return (
                  <Card
                    key={notification.id}
                    className={`p-6 transition-all ${
                      isUnread ? "bg-cyan-500/10 border-cyan-500/30" : "bg-zinc-900 border-zinc-800"
                    }`}
                  >
                    <div className="flex items-start gap-4">
                      {isUnread && <div className="w-2 h-2 rounded-full bg-cyan-400 mt-2 flex-shrink-0" />}

                      <div className="flex-1">
                        <div className="flex items-start justify-between mb-2">
                          <h3 className="font-semibold text-white">{notification.title}</h3>
                          <span className="text-xs text-zinc-500">
                            {new Date(notification.created_at).toLocaleDateString("fr-FR", {
                              day: "numeric",
                              month: "short",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        </div>
                        <p className="text-zinc-400 text-sm mb-3">{notification.message}</p>

                        {notification.action_url && (
                          <Button
                            asChild
                            size="sm"
                            variant="outline"
                            className="bg-transparent border-cyan-500 text-cyan-400"
                          >
                            <Link href={notification.action_url}>Voir les détails</Link>
                          </Button>
                        )}
                      </div>

                      <div className="flex gap-2">
                        {isUnread && (
                          <form action="/api/notifications/mark-read" method="POST">
                            <input type="hidden" name="notificationId" value={notification.id} />
                            <Button
                              type="submit"
                              size="sm"
                              variant="ghost"
                              className="text-green-400 hover:text-green-300 hover:bg-green-500/10"
                            >
                              <Check className="w-4 h-4" />
                            </Button>
                          </form>
                        )}
                        <form action="/api/notifications/delete" method="POST">
                          <input type="hidden" name="notificationId" value={notification.id} />
                          <Button
                            type="submit"
                            size="sm"
                            variant="ghost"
                            className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </form>
                      </div>
                    </div>
                  </Card>
                )
              })}
            </div>
          ) : (
            <Card className="p-12 text-center bg-zinc-900 border-zinc-800">
              <Bell className="w-16 h-16 text-zinc-700 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-white mb-2">Aucune notification</h3>
              <p className="text-zinc-400">Vous serez notifié des événements importants</p>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
