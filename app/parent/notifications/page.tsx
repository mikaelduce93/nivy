import { getUserRole } from "@/lib/auth/get-user-role"
import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Bell,
  BellOff,
  ArrowLeft,
  Settings as SettingsIcon,
} from "lucide-react"
import Link from "next/link"
import { EmptyState } from "@/components/ui/states/empty-state"
import { ParentNotificationRow } from "@/components/parent/notification-row"
import { MarkAllReadButton } from "@/components/parent/mark-all-read-button"

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

// Wave 6D — formatRelative + per-row UI moved to
// components/parent/notification-row.tsx so the page can render real
// click-to-mark-read interactions instead of advertising auto-mark
// behaviour the page didn't implement.

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
          <div className="flex items-center gap-2">
            <MarkAllReadButton unreadCount={unreadCount} />
            <Button asChild variant="outline" className="border-zinc-700 text-zinc-200">
              <Link href="/parent/settings">
                <SettingsIcon className="w-4 h-4 mr-2" />
                Préférences
              </Link>
            </Button>
          </div>
        </div>

        {notifications.length === 0 ? (
          <EmptyState
            icon={BellOff}
            title="Aucune notification"
            description="Quand votre teen demandera une approbation, fera un check-in ou quand un paiement sera confirmé, le message apparaîtra ici."
            action={{ label: "Voir les approbations", href: "/parent/approvals", variant: "outline" }}
            secondaryAction={{ label: "Régler les préférences", href: "/parent/settings" }}
          />
        ) : (
          <div className="space-y-3">
            {notifications.map((n: any) => (
              <ParentNotificationRow key={n.id} notification={n} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
