"use client"

/**
 * Deferred push permission prompt (TICKET-044, V1.2 Wave 3).
 *
 * Per whitepaper §16: do NOT ask for notification permission on signup.
 * Defer the prompt until the teen has demonstrated engagement — first
 * quiz completion or first chore completion. After that we show a soft
 * in-app banner with "Activer notifications" / "Plus tard" buttons.
 *
 * Triggers (any of):
 *   - `localStorage["nivy:push:trigger"] === "1"` set by quiz/chore success
 *   - `window.dispatchEvent(new CustomEvent("nivy:push:trigger"))`
 *   - prop `forceShow={true}` (settings page)
 *
 * Suppression rules:
 *   - Notification.permission !== "default" (already granted/denied) → hide
 *   - localStorage["nivy:push:dismissed-until"] in the future → hide
 *   - PushManager / Notification API unsupported → hide
 *
 * NOTE: This component does NOT touch the service worker (U2's lane in
 * Wave 2). It posts to `/api/notifications/subscribe` (canonical route
 * owned by this ticket).
 */

import { useCallback, useEffect, useMemo, useState } from "react"
import { Bell, BellOff, Loader2, X } from "lucide-react"
import { toast } from "sonner"

const TRIGGER_KEY = "nivy:push:trigger"
const DISMISS_KEY = "nivy:push:dismissed-until"
const DISMISS_DAYS = 7
const TRIGGER_EVENT = "nivy:push:trigger"

function urlBase64ToUint8Array(base64: string): Uint8Array {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4)
  const b64 = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/")
  const raw = window.atob(b64)
  const out = new Uint8Array(raw.length)
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i)
  return out
}

interface PushPermissionPromptProps {
  /** Skip engagement gate — show as soon as conditions allow. */
  forceShow?: boolean
  /** Optional: caller can be notified once subscribed. */
  onSubscribed?: () => void
}

export function PushPermissionPrompt({
  forceShow = false,
  onSubscribed,
}: PushPermissionPromptProps) {
  const [visible, setVisible] = useState(false)
  const [loading, setLoading] = useState(false)

  const vapidKey = useMemo(
    () => process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || "",
    [],
  )

  const supported =
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window

  const dismissedUntil = useCallback((): number => {
    if (typeof window === "undefined") return 0
    const raw = window.localStorage.getItem(DISMISS_KEY)
    if (!raw) return 0
    const n = Number(raw)
    return Number.isFinite(n) ? n : 0
  }, [])

  const evaluate = useCallback(() => {
    if (!supported || !vapidKey) {
      setVisible(false)
      return
    }
    if (Notification.permission !== "default") {
      setVisible(false)
      return
    }
    if (dismissedUntil() > Date.now()) {
      setVisible(false)
      return
    }
    if (forceShow) {
      setVisible(true)
      return
    }
    const triggered = window.localStorage.getItem(TRIGGER_KEY) === "1"
    setVisible(triggered)
  }, [supported, vapidKey, dismissedUntil, forceShow])

  useEffect(() => {
    evaluate()
    if (typeof window === "undefined") return
    const handler = () => {
      window.localStorage.setItem(TRIGGER_KEY, "1")
      evaluate()
    }
    window.addEventListener(TRIGGER_EVENT, handler)
    // Also re-check when the tab regains focus (the teen may have just
    // completed a quiz on another tab/window).
    window.addEventListener("focus", evaluate)
    return () => {
      window.removeEventListener(TRIGGER_EVENT, handler)
      window.removeEventListener("focus", evaluate)
    }
  }, [evaluate])

  const handleDismiss = useCallback(() => {
    const until = Date.now() + DISMISS_DAYS * 24 * 60 * 60 * 1000
    window.localStorage.setItem(DISMISS_KEY, String(until))
    window.localStorage.removeItem(TRIGGER_KEY)
    setVisible(false)
  }, [])

  const handleEnable = useCallback(async () => {
    if (!supported || !vapidKey) return
    setLoading(true)
    try {
      const perm = await Notification.requestPermission()
      if (perm !== "granted") {
        if (perm === "denied") {
          toast.error("Notifications bloquées par le navigateur.")
        }
        // Snooze the prompt regardless to avoid nagging.
        handleDismiss()
        return
      }

      const reg = await navigator.serviceWorker.ready
      let sub = await reg.pushManager.getSubscription()
      if (!sub) {
        sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(
            vapidKey,
          ) as unknown as BufferSource,
        })
      }

      const res = await fetch("/api/notifications/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subscription: sub.toJSON(),
          userAgent: navigator.userAgent,
          sendTest: true,
        }),
        credentials: "include",
      })

      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        throw new Error(j?.error || "Subscribe failed")
      }

      toast.success("Notifications activées")
      window.localStorage.removeItem(TRIGGER_KEY)
      window.localStorage.setItem(DISMISS_KEY, String(Number.MAX_SAFE_INTEGER))
      setVisible(false)
      onSubscribed?.()
    } catch (e) {
      console.error("[push-permission-prompt] enable failed:", e)
      toast.error("Activation impossible. Réessaie plus tard.")
    } finally {
      setLoading(false)
    }
  }, [supported, vapidKey, handleDismiss, onSubscribed])

  if (!visible) return null

  return (
    <div
      role="dialog"
      aria-live="polite"
      aria-label="Activer les notifications"
      className="fixed inset-x-3 bottom-3 z-50 mx-auto max-w-md rounded-2xl border border-white/10 bg-slate-900/95 p-4 text-white shadow-xl backdrop-blur md:inset-x-auto md:right-6 md:bottom-6"
    >
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-300">
          <Bell className="h-5 w-5" aria-hidden />
        </div>
        <div className="flex-1">
          <p className="text-sm font-semibold">Active tes rappels</p>
          <p className="mt-1 text-xs text-slate-300">
            Reçois un ping pour tes prochains quizz et tâches — rien de
            spammy, jamais entre 22h et 7h.
          </p>
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              onClick={handleEnable}
              disabled={loading}
              className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-400 disabled:opacity-60"
            >
              {loading ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
              ) : (
                <Bell className="h-3.5 w-3.5" aria-hidden />
              )}
              Activer
            </button>
            <button
              type="button"
              onClick={handleDismiss}
              disabled={loading}
              className="inline-flex items-center gap-1.5 rounded-lg bg-white/5 px-3 py-1.5 text-xs font-medium text-slate-200 hover:bg-white/10 disabled:opacity-60"
            >
              <BellOff className="h-3.5 w-3.5" aria-hidden />
              Plus tard
            </button>
          </div>
        </div>
        <button
          type="button"
          onClick={handleDismiss}
          aria-label="Fermer"
          className="-mr-1 -mt-1 rounded-md p-1 text-slate-400 hover:bg-white/10 hover:text-white"
        >
          <X className="h-4 w-4" aria-hidden />
        </button>
      </div>
    </div>
  )
}

/**
 * Helper for engagement surfaces (quiz hub, chore complete) to mark the
 * push prompt as eligible. Safe to call anywhere on the client.
 */
export function markPushPromptEligible(): void {
  if (typeof window === "undefined") return
  try {
    window.localStorage.setItem(TRIGGER_KEY, "1")
    window.dispatchEvent(new CustomEvent(TRIGGER_EVENT))
  } catch {
    /* localStorage unavailable — noop */
  }
}

export default PushPermissionPrompt
