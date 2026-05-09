"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Clock } from "lucide-react"
import { cn } from "@/lib/utils"

/**
 * Wave 6D — clickable notification row that actually marks the
 * user_notifications row as read when activated. Replaces the
 * static read-only card that used to advertise auto-mark behavior
 * the page didn't implement.
 *
 * Optimistic local state + server confirmation via
 * /api/parent/notifications/mark-read. On error, the row reverts and
 * stays unread so the user notices.
 */
interface ParentNotification {
  id: string
  title: string
  body: string | null
  emoji: string | null
  action_url: string | null
  action_label: string | null
  is_read: boolean
  priority: string | null
  created_at: string
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

export function ParentNotificationRow({ notification }: { notification: ParentNotification }) {
  const router = useRouter()
  const [isRead, setIsRead] = useState(notification.is_read)
  const [, startTransition] = useTransition()

  const onActivate = async () => {
    if (isRead) return
    setIsRead(true) // optimistic
    try {
      const res = await fetch("/api/parent/notifications/mark-read", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id: notification.id }),
      })
      if (!res.ok) {
        setIsRead(false)
        return
      }
      // Refresh unread badge in parent header etc.
      startTransition(() => router.refresh())
    } catch {
      setIsRead(false)
    }
  }

  return (
    <Card
      className={cn(
        "bg-zinc-900 border-zinc-800 transition-all cursor-pointer hover:border-zinc-700",
        !isRead && "border-l-4 border-l-cyan-500",
      )}
      onClick={onActivate}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault()
          void onActivate()
        }
      }}
      role="button"
      tabIndex={0}
      aria-label={isRead ? `Notification: ${notification.title}` : `Notification non lue: ${notification.title}`}
    >
      <CardContent className="p-4">
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center flex-shrink-0 text-lg" aria-hidden="true">
            {notification.emoji || "🔔"}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className={cn("font-bold", isRead ? "text-zinc-400" : "text-white")}>
                {notification.title}
              </h3>
              {notification.priority === "high" && (
                <Badge className="bg-amber-500/20 text-amber-300 text-xs">Important</Badge>
              )}
            </div>
            {notification.body && (
              <p className={cn("text-sm", isRead ? "text-zinc-500" : "text-zinc-300")}>
                {notification.body}
              </p>
            )}
            <div className="flex items-center gap-4 mt-2">
              <span className="text-xs text-zinc-500 flex items-center gap-1">
                <Clock className="w-3 h-3" aria-hidden="true" />
                {formatRelative(notification.created_at)}
              </span>
              {notification.action_url && (
                <Link
                  href={notification.action_url}
                  className="text-xs text-cyan-400 hover:underline"
                  onClick={(e) => e.stopPropagation()}
                >
                  {notification.action_label || "Voir détails"} →
                </Link>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
