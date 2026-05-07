"use client"

/**
 * <BookMentorSessionButton> — V1.1 P2.5 client component.
 *
 * Wraps the booking dialog. POSTs to /api/teen/mentor-sessions/book which
 * calls the book_mentor_session RPC server-side. The session is created with
 * status='pending_approval' and a parental_authorizations row — the parent
 * receives a notification and must approve before it moves to 'approved'.
 */

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Calendar, Clock, Loader2, CheckCircle2, AlertCircle } from "lucide-react"
import { cn } from "@/lib/utils"

interface Props {
  mentorId: string
  freeIntro: boolean
  hourlyDh: number
}

const DURATIONS = [
  { value: 30, label: "30 minutes" },
  { value: 45, label: "45 minutes" },
  { value: 60, label: "1 heure" },
] as const

export function BookMentorSessionButton({
  mentorId,
  freeIntro,
  hourlyDh,
}: Props) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [scheduledFor, setScheduledFor] = useState("")
  const [duration, setDuration] = useState<number>(30)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [isPending, startTransition] = useTransition()

  // Default schedule: tomorrow at 18:00 local time. Computed lazily once.
  const defaultDate = (() => {
    const d = new Date()
    d.setDate(d.getDate() + 1)
    d.setHours(18, 0, 0, 0)
    return formatDatetimeLocal(d)
  })()

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    const dt = scheduledFor || defaultDate
    const iso = new Date(dt).toISOString()
    if (Number.isNaN(new Date(dt).getTime())) {
      setError("Date invalide.")
      return
    }
    if (new Date(dt).getTime() < Date.now()) {
      setError("La date doit etre dans le futur.")
      return
    }

    startTransition(async () => {
      try {
        const res = await fetch("/api/teen/mentor-sessions/book", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            mentor_id: mentorId,
            scheduled_for: iso,
            duration_minutes: duration,
          }),
        })
        const json = await res.json().catch(() => ({}))
        if (!res.ok || json?.success === false) {
          setError(
            translateError(json?.error) ?? "Reservation impossible. Reessaye."
          )
          return
        }
        setSuccess(true)
        // Refresh server data + push to sessions hub after a beat.
        setTimeout(() => {
          router.push("/teen/mentor-sessions")
          router.refresh()
        }, 1200)
      } catch (err) {
        console.error(err)
        setError("Erreur reseau. Reessaye.")
      }
    })
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          "w-full inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-cyan-500 to-emerald-500 px-6 py-4 text-base font-black text-black",
          "hover:brightness-110 transition-all duration-200 shadow-lg shadow-cyan-500/20",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/60"
        )}
      >
        <Calendar className="h-5 w-5" />
        Reserver une session
        {freeIntro ? (
          <span className="ml-2 rounded-full bg-black/20 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider">
            Premiere offerte
          </span>
        ) : null}
      </button>
    )
  }

  if (success) {
    return (
      <div className="rounded-3xl border border-emerald-500/30 bg-emerald-500/10 p-6 flex gap-3 items-start">
        <CheckCircle2 className="h-6 w-6 text-emerald-300 shrink-0" />
        <div>
          <h3 className="font-black text-white">Demande envoyee !</h3>
          <p className="text-sm text-emerald-100/90 mt-1">
            Ton parent doit approuver la session avant qu'elle ne soit
            confirmee. On t'emmene vers tes sessions...
          </p>
        </div>
      </div>
    )
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-3xl border border-white/10 bg-white/[0.02] backdrop-blur-md p-6 space-y-4"
    >
      <div>
        <h3 className="text-lg font-black text-white">Nouvelle session</h3>
        <p className="text-sm text-zinc-400 mt-1">
          La demande sera envoyee a ton parent pour approbation.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-black uppercase tracking-wider text-zinc-500">
            Date et heure
          </label>
          <input
            type="datetime-local"
            value={scheduledFor || defaultDate}
            onChange={(e) => setScheduledFor(e.target.value)}
            min={formatDatetimeLocal(new Date(Date.now() + 60_000))}
            required
            className="rounded-xl bg-zinc-900 border border-white/10 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-cyan-400/40"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-black uppercase tracking-wider text-zinc-500">
            Duree
          </label>
          <select
            value={duration}
            onChange={(e) => setDuration(Number(e.target.value))}
            className="rounded-xl bg-zinc-900 border border-white/10 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-cyan-400/40"
          >
            {DURATIONS.map((d) => (
              <option key={d.value} value={d.value}>
                {d.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex items-center justify-between text-sm text-zinc-300 rounded-2xl border border-white/10 bg-white/[0.02] p-3">
        <span className="inline-flex items-center gap-2">
          <Clock className="h-4 w-4 text-cyan-300" />
          Estimation
        </span>
        <span className="font-black tabular-nums text-white">
          {freeIntro
            ? "Premiere session gratuite"
            : `${Math.round((hourlyDh * duration) / 60)} DH`}
        </span>
      </div>

      {error ? (
        <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-3 flex gap-2 items-start text-sm text-red-200">
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      ) : null}

      <div className="flex gap-2 pt-2">
        <button
          type="button"
          onClick={() => setOpen(false)}
          disabled={isPending}
          className="flex-1 rounded-2xl border border-white/10 bg-white/[0.02] px-4 py-3 text-sm font-black text-zinc-300 hover:bg-white/[0.05] disabled:opacity-50"
        >
          Annuler
        </button>
        <button
          type="submit"
          disabled={isPending}
          className={cn(
            "flex-1 inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-cyan-500 to-emerald-500 px-4 py-3 text-sm font-black text-black",
            "hover:brightness-110 transition-all disabled:opacity-50"
          )}
        >
          {isPending ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Envoi...
            </>
          ) : (
            <>
              <Calendar className="h-4 w-4" />
              Confirmer la demande
            </>
          )}
        </button>
      </div>
    </form>
  )
}

function formatDatetimeLocal(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0")
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours()
  )}:${pad(d.getMinutes())}`
}

function translateError(code: unknown): string | null {
  if (typeof code !== "string") return null
  switch (code) {
    case "mentor_not_active":
      return "Ce mentor n'est plus disponible."
    case "mentor_kyc_not_approved":
      return "La verification de ce mentor est incomplete."
    case "age_out_of_range":
      return "Ce mentor accompagne une autre tranche d'age."
    case "no_parent_link":
      return "Aucun parent n'est lie a ton compte. Contacte le support."
    case "scheduled_in_past":
      return "La date doit etre dans le futur."
    default:
      return null
  }
}
