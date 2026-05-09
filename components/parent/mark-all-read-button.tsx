"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { CheckCheck } from "lucide-react"
import { toast } from "sonner"

/**
 * Wave 6D — calls /api/parent/notifications/mark-all-read for the
 * calling parent. No-op if zero unread.
 */
export function MarkAllReadButton({ unreadCount }: { unreadCount: number }) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [, startTransition] = useTransition()

  if (unreadCount === 0) return null

  const onClick = async () => {
    if (busy) return
    setBusy(true)
    try {
      const res = await fetch("/api/parent/notifications/mark-all-read", {
        method: "POST",
      })
      const j = (await res.json().catch(() => ({}))) as { success?: boolean; marked?: number; error?: string }
      if (!res.ok || !j.success) {
        toast.error(j.error || "Échec du marquage")
        return
      }
      if (j.marked && j.marked > 0) {
        toast.success(`${j.marked} notification${j.marked > 1 ? "s" : ""} marquée${j.marked > 1 ? "s" : ""} lue${j.marked > 1 ? "s" : ""}`)
      }
      startTransition(() => router.refresh())
    } catch (err) {
      toast.error("Erreur réseau")
    } finally {
      setBusy(false)
    }
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={onClick}
      disabled={busy}
      className="border-zinc-700 text-zinc-200 hover:border-emerald-500/50 hover:text-emerald-400"
    >
      <CheckCheck className="w-4 h-4 mr-2" aria-hidden="true" />
      {busy ? "Marquage…" : "Tout marquer lu"}
    </Button>
  )
}
