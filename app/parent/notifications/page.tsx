import { getUserRole } from "@/lib/auth/get-user-role"
import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { Button } from "@/components/ui/button"
import { Niv } from "@/components/brand"
import {
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
    <div className="min-h-screen bg-background text-ink">
      <div className="container mx-auto px-6 pt-10 pb-20 sm:pt-16 max-w-5xl">
        <Button asChild variant="ghost" className="mb-6 text-mute hover:text-ink">
          <Link href="/parent">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Retour au dashboard
          </Link>
        </Button>

        <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between mb-8">
          <div className="flex items-center gap-4">
            <Niv size={72} mood="wink" />
            <div>
              <p className="eyebrow">Compte · Alertes</p>
              <h1 className="font-display text-3xl sm:text-4xl font-extrabold tracking-tight text-ink">
                Quoi de neuf, <em className="font-semibold italic text-pink">akhouya</em> ?
              </h1>
              <p className="text-mute mt-1 flex items-center gap-2">
                Activité de tes teens, approbations et alertes Nivy
                {unreadCount > 0 && (
                  <span className="rounded-md border-2 border-ink bg-pink px-2 py-0.5 font-mono text-[11px] font-extrabold uppercase tracking-[0.1em] text-ink">
                    {unreadCount} non lue{unreadCount > 1 ? "s" : ""}
                  </span>
                )}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <MarkAllReadButton unreadCount={unreadCount} />
            <Button asChild variant="outline">
              <Link href="/parent/settings">
                <SettingsIcon className="w-4 h-4 mr-2" />
                Préférences
              </Link>
            </Button>
          </div>
        </div>

        {notifications.length === 0 ? (
          <EmptyState
            nivMood="calm"
            title="Aucune notification"
            description="Quand ton teen demandera une approbation, fera un check-in ou quand un paiement sera confirmé, le message apparaîtra ici."
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
