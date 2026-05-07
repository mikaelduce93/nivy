"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { CheckCircle2, Clock, XCircle, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"

export type MentorSessionRow = {
  id: string
  mentor_id: string
  mentee_user_id: string
  scheduled_for: string
  duration_minutes: number
  meeting_url: string | null
  meeting_provider: string | null
  status: string
  amount_dh: number | null
  amount_coins: number | null
  is_intro: boolean
  parent_attended: boolean
  recorded: boolean
  rating_by_mentee: number | null
  rating_by_mentor: number | null
  notes: string | null
  created_at: string
  completed_at: string | null
  cancelled_at: string | null
}

type Filter = "pending_approval" | "approved" | "completed" | "denied"

const FILTER_LABELS: Record<Filter, string> = {
  pending_approval: "En attente parent",
  approved: "À venir",
  completed: "Terminées",
  denied: "Refusées",
}

const FILTER_ICONS: Record<Filter, React.ComponentType<{ className?: string }>> = {
  pending_approval: Clock,
  approved: CheckCircle2,
  completed: CheckCircle2,
  denied: XCircle,
}

export function MentorSessionsClient({
  initialSessions,
  initialFilter,
}: {
  initialSessions: MentorSessionRow[]
  initialFilter: Filter
}) {
  const router = useRouter()
  const [filter, setFilter] = useState<Filter>(initialFilter)
  const [sessions, setSessions] = useState(initialSessions)
  const [isPending, startTransition] = useTransition()
  const [busyId, setBusyId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleFilter = (f: Filter) => {
    setFilter(f)
    startTransition(() => {
      router.replace(`/mentor/sessions?status=${f}`)
    })
  }

  const handleComplete = async (id: string) => {
    setBusyId(id)
    setError(null)
    try {
      const res = await fetch(`/api/mentor/sessions/${id}/complete`, { method: "POST" })
      const json = await res.json()
      if (!res.ok || !json?.success) {
        setError(json?.error || "Échec — la finalisation peut nécessiter une RPC backend (voir TODO).")
      } else {
        setSessions((prev) => prev.filter((s) => s.id !== id))
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur réseau")
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2">
        {(Object.keys(FILTER_LABELS) as Filter[]).map((f) => {
          const Icon = FILTER_ICONS[f]
          const active = f === filter
          return (
            <button
              key={f}
              type="button"
              onClick={() => handleFilter(f)}
              disabled={isPending}
              className={cn(
                "px-4 py-2 rounded-2xl border text-xs font-black uppercase tracking-wider inline-flex items-center gap-2 transition-colors",
                active
                  ? "bg-purple-500/20 border-purple-500/40 text-purple-200"
                  : "bg-white/5 border-white/10 text-zinc-400 hover:bg-white/10 hover:text-white",
              )}
            >
              <Icon className="w-3.5 h-3.5" />
              {FILTER_LABELS[f]}
            </button>
          )
        })}
      </div>

      {error && (
        <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">
          {error}
        </div>
      )}

      {sessions.length === 0 ? (
        <div className="rounded-3xl border border-white/5 bg-zinc-900/40 p-10 text-center">
          <p className="text-zinc-300 font-bold">Aucune session dans cette catégorie.</p>
          <p className="text-zinc-500 text-sm mt-2">
            Les nouvelles demandes apparaîtront ici dès qu'un teen vous réserve.
          </p>
        </div>
      ) : (
        <ul className="space-y-3">
          {sessions.map((s) => (
            <li
              key={s.id}
              className="rounded-3xl border border-white/5 bg-zinc-900/40 p-5 flex flex-col md:flex-row md:items-center md:justify-between gap-4"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-base font-black text-white">
                    {new Date(s.scheduled_for).toLocaleString("fr-FR", {
                      dateStyle: "medium",
                      timeStyle: "short",
                    })}
                  </span>
                  {s.is_intro && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-blue-500/15 border border-blue-500/30 text-blue-200 uppercase tracking-wider">
                      Intro
                    </span>
                  )}
                </div>
                <div className="text-xs text-zinc-500 font-bold uppercase tracking-tight space-x-2">
                  <span>{s.duration_minutes} min</span>
                  <span>•</span>
                  <span>
                    {Number(s.amount_dh) > 0
                      ? `${Number(s.amount_dh).toFixed(2)} DH`
                      : "Gratuit"}
                  </span>
                  <span>•</span>
                  <span>Mentee: {s.mentee_user_id.slice(0, 8)}…</span>
                </div>
                {s.notes && (
                  <p className="mt-2 text-xs text-zinc-400 line-clamp-2">{s.notes}</p>
                )}
              </div>

              <div className="flex items-center gap-3">
                {s.meeting_url && (
                  <a
                    href={s.meeting_url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs font-bold text-purple-300 hover:text-purple-200 underline underline-offset-2"
                  >
                    Lien meeting
                  </a>
                )}

                {filter === "approved" && (
                  <button
                    type="button"
                    onClick={() => handleComplete(s.id)}
                    disabled={busyId === s.id}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-200 text-xs font-black uppercase tracking-wider disabled:opacity-50"
                  >
                    {busyId === s.id ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <CheckCircle2 className="w-3.5 h-3.5" />
                    )}
                    Marquer terminée
                  </button>
                )}

                <span
                  className={cn(
                    "text-[10px] font-black uppercase tracking-wider px-2 py-1 rounded-full border",
                    s.status === "approved" && "bg-emerald-500/10 border-emerald-500/30 text-emerald-300",
                    s.status === "pending_approval" && "bg-amber-500/10 border-amber-500/30 text-amber-300",
                    s.status === "completed" && "bg-blue-500/10 border-blue-500/30 text-blue-300",
                    s.status === "denied" && "bg-red-500/10 border-red-500/30 text-red-300",
                    s.status === "cancelled" && "bg-zinc-500/10 border-zinc-500/30 text-zinc-300",
                  )}
                >
                  {s.status}
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
