"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { CheckCircle2, Clock, XCircle, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { StickerCard } from "@/components/ui/sticker-card"
import { StickerTabs } from "@/components/brand/sticker-tab"
import { NivEmpty } from "@/components/brand"

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

// Libellés FR pour le badge-ligne (étend FILTER_LABELS au statut `cancelled`).
const STATUS_LABELS: Record<string, string> = {
  ...FILTER_LABELS,
  cancelled: "Annulée",
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
        setError(json?.error || "On n'a pas pu clôturer la session. Réessaie dans un instant.")
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
      <StickerTabs
        ariaLabel="Filtrer les sessions"
        value={filter}
        onValueChange={(v) => handleFilter(v as Filter)}
        tabs={(Object.keys(FILTER_LABELS) as Filter[]).map((f) => {
          const Icon = FILTER_ICONS[f]
          return {
            value: f,
            label: FILTER_LABELS[f],
            icon: <Icon className="size-4" />,
          }
        })}
      />

      {error && (
        <div className="rounded-2xl border-2 border-coral bg-coral/10 p-4 text-sm font-medium text-coral">
          {error}
        </div>
      )}

      {sessions.length === 0 ? (
        <NivEmpty
          title="Aucune session ici"
          description="Les nouvelles demandes s'affichent dès qu'un teen te réserve. Reste prêt, coach."
        />
      ) : (
        <ul className="space-y-3">
          {sessions.map((s) => (
            <li key={s.id}>
              <StickerCard className="p-5">
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div className="min-w-0 flex-1">
                  <div className="mb-1 flex items-center gap-2">
                    <span className="font-mono text-base font-bold text-ink">
                      {new Date(s.scheduled_for).toLocaleString("fr-FR", {
                        dateStyle: "medium",
                        timeStyle: "short",
                      })}
                    </span>
                    {s.is_intro && (
                      <span className="rounded-full border-2 border-ink bg-teal/15 px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-[0.12em] text-teal">
                        Intro
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1 font-mono text-xs font-bold uppercase tracking-[0.08em] text-mute">
                    <span>{s.duration_minutes} min</span>
                    <span aria-hidden="true">•</span>
                    <span className={Number(s.amount_dh) > 0 ? "text-coral" : undefined}>
                      {Number(s.amount_dh) > 0
                        ? `⊙ ${Number(s.amount_dh).toFixed(2)} DH`
                        : "Gratuit"}
                    </span>
                  </div>
                  {s.notes && (
                    <p className="mt-2 line-clamp-2 text-xs text-mute">{s.notes}</p>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  {s.meeting_url && (
                    <a
                      href={s.meeting_url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs font-bold text-pink underline underline-offset-2 hover:text-pink"
                    >
                      Lien meeting
                    </a>
                  )}

                  {filter === "approved" && (
                    <button
                      type="button"
                      onClick={() => handleComplete(s.id)}
                      disabled={busyId === s.id}
                      className="inline-flex min-h-touch items-center gap-2 rounded-xl border-2 border-ink bg-lime px-4 py-2 font-mono text-xs font-bold uppercase tracking-[0.1em] text-ink shadow-stkr-sm transition-all hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-stkr-md disabled:opacity-50 motion-reduce:translate-x-0 motion-reduce:translate-y-0"
                    >
                      {busyId === s.id ? (
                        <Loader2 className="size-3.5 animate-spin" />
                      ) : (
                        <CheckCircle2 className="size-3.5" />
                      )}
                      Marquer terminée
                    </button>
                  )}

                  <span
                    className={cn(
                      "rounded-full border-2 border-ink px-2.5 py-1 font-mono text-[10px] font-bold uppercase tracking-[0.12em]",
                      s.status === "approved" && "bg-lime/15 text-lime",
                      s.status === "pending_approval" && "bg-gold/15 text-gold",
                      s.status === "completed" && "bg-teal/15 text-teal",
                      s.status === "denied" && "bg-coral/15 text-coral",
                      s.status === "cancelled" && "bg-paper-2 text-ink-2",
                    )}
                  >
                    {STATUS_LABELS[s.status] ?? s.status}
                  </span>
                </div>
                </div>
              </StickerCard>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
