"use client"

/**
 * <BookMentorSessionButton> — V1.1 P2.5 client component.
 *
 * Wraps the booking dialog. POSTs to /api/teen/mentor-sessions/book which
 * calls the book_mentor_session RPC server-side. The session is created with
 * status='pending_approval' and a parental_authorizations row — the parent
 * receives a notification and must approve before it moves to 'approved'.
 */

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Calendar, Clock, Loader2, CheckCircle2, AlertCircle, ShieldCheck } from "lucide-react"
import { cn } from "@/lib/utils"
import { useOptimisticRunner } from "@/lib/hooks/use-optimistic-mutation"
import { toast } from "@/lib/utils/toast"
import { H3 } from "@/components/ui/headings"
import { Celebrate } from "@/components/ui/celebrate"
import { useAnnounce } from "@/components/a11y/announce-region"

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
  const [consentRecorded, setConsentRecorded] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  // Wave 3 / TICKET-022 — fire <Celebrate> when the booking submission is
  // accepted (the teen-side "session confirmed" moment). Edge-triggered.
  const [celebrate, setCelebrate] = useState(false)
  // Wave 3 / TICKET-050 — paired SR announcement on the same trigger.
  const announce = useAnnounce()

  // Default schedule: tomorrow at 18:00 local time. Computed lazily once.
  const defaultDate = (() => {
    const d = new Date()
    d.setDate(d.getDate() + 1)
    d.setHours(18, 0, 0, 0)
    return formatDatetimeLocal(d)
  })()

  // TICKET-031 (W2-A18): mentor-session-book — optimistically flip to the
  // success card the instant the user confirms. The success card already
  // says the request awaits parental approval, so the optimistic state is
  // safe even before the server responds. On error we roll back the success
  // banner, restore an inline error, and surface a juicy toast.
  const bookRunner = useOptimisticRunner<
    { iso: string },
    { success: true },
    { previousSuccess: boolean }
  >(
    async ({ iso }) => {
      const res = await fetch("/api/teen/mentor-sessions/book", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mentor_id: mentorId,
          scheduled_for: iso,
          duration_minutes: duration,
          consent_recorded: consentRecorded,
        }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok || json?.success === false) {
        const message = translateError(json?.error) ?? "Reservation impossible. Reessaye."
        throw new Error(message)
      }
      return { success: true as const }
    },
    {
      onMutate: () => {
        const ctx = { previousSuccess: success }
        setSuccess(true)
        setError(null)
        return ctx
      },
      onError: (err, _input, ctx) => {
        if (ctx) setSuccess(ctx.previousSuccess)
        const message = err.message || "Erreur reseau. Reessaye."
        setError(message)
        toast.error(message)
      },
      onSuccess: () => {
        toast.success("Demande envoyee a ton parent !")
        setCelebrate(true)
        announce("Session mentor confirmée!")
        // Refresh server data + push to sessions hub after a beat.
        setTimeout(() => {
          router.push("/teen/mentor-sessions")
          router.refresh()
        }, 1200)
      },
    },
  )

  const isPending = bookRunner.isPending

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
    if (!consentRecorded) {
      setError("Tu dois accepter l'enregistrement de la session pour reserver.")
      return
    }

    void bookRunner.mutate({ iso })
  }

  const celebrateNode = (
    <Celebrate
      trigger={celebrate}
      variant="sparkles"
      onComplete={() => setCelebrate(false)}
    />
  )

  if (!open) {
    return (
      <>
        {celebrateNode}
        <button
          type="button"
          onClick={() => setOpen(true)}
          className={cn(
            "w-full inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-info to-success px-6 py-4 text-base font-black text-primary-foreground",
            "hover:brightness-110 transition-all duration-200 shadow-lg shadow-info/20",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-info/60"
          )}
        >
          <Calendar className="h-5 w-5" />
          Reserver une session
          {freeIntro ? (
            <span className="ml-2 rounded-full bg-background/20 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider">
              Premiere offerte
            </span>
          ) : null}
        </button>
      </>
    )
  }

  if (success) {
    return (
      <>
        {celebrateNode}
        <div className="rounded-3xl border border-success/30 bg-success-soft/10 p-6 flex gap-3 items-start">
          <CheckCircle2 className="h-6 w-6 text-success shrink-0" />
          <div>
            <H3 className="font-black text-foreground">Demande envoyee !</H3>
            <p className="text-sm text-foreground/80 mt-1">
              Ton parent doit approuver la session avant qu'elle ne soit
              confirmee. On t'emmene vers tes sessions...
            </p>
          </div>
        </div>
      </>
    )
  }

  return (
    <>
      {celebrateNode}
      <form
        onSubmit={handleSubmit}
        className="rounded-3xl border border-border bg-card/40 backdrop-blur-md p-6 space-y-4"
      >
      <div>
        <H3 className="text-lg font-black text-foreground">Nouvelle session</H3>
        <p className="text-sm text-muted-foreground mt-1">
          La demande sera envoyee a ton parent pour approbation.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">
            Date et heure
          </label>
          <input
            type="datetime-local"
            value={scheduledFor || defaultDate}
            onChange={(e) => setScheduledFor(e.target.value)}
            min={formatDatetimeLocal(new Date(Date.now() + 60_000))}
            required
            className="rounded-xl bg-card border border-border px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-info/40"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">
            Duree
          </label>
          <select
            value={duration}
            onChange={(e) => setDuration(Number(e.target.value))}
            className="rounded-xl bg-card border border-border px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-info/40"
          >
            {DURATIONS.map((d) => (
              <option key={d.value} value={d.value}>
                {d.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex items-center justify-between text-sm text-foreground rounded-2xl border border-border bg-card/40 p-3">
        <span className="inline-flex items-center gap-2">
          <Clock className="h-4 w-4 text-info" />
          Estimation
        </span>
        <span className="font-black tabular-nums text-foreground">
          {freeIntro
            ? "Premiere session gratuite"
            : `${Math.round((hourlyDh * duration) / 60)} DH`}
        </span>
      </div>

      {/* V1.2-A: explicit recording-consent gate.
          consent_recorded defaults to FALSE in mentor_session_recordings;
          recording cannot start until both teen and mentor opt in. */}
      <label
        className={cn(
          "flex items-start gap-3 rounded-2xl border p-3 cursor-pointer transition-colors",
          consentRecorded
            ? "border-info/40 bg-info-soft/5"
            : "border-border bg-card/40 hover:bg-card/60"
        )}
      >
        <input
          type="checkbox"
          checked={consentRecorded}
          onChange={(e) => setConsentRecorded(e.target.checked)}
          className="mt-1 h-4 w-4 rounded border-border bg-card accent-info"
        />
        <span className="text-sm text-foreground leading-snug">
          <ShieldCheck className="h-4 w-4 text-info inline-block mr-1 -mt-0.5" />
          J&apos;accepte que la session soit enregistree pour des raisons de
          securite (90 jours de conservation). Mon parent et le mentor seront
          informes; l&apos;enregistrement sera supprime automatiquement.
        </span>
      </label>

      {error ? (
        <div className="rounded-2xl border border-destructive/30 bg-destructive/10 p-3 flex gap-2 items-start text-sm text-destructive">
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      ) : null}

      <div className="flex gap-2 pt-2">
        <button
          type="button"
          onClick={() => setOpen(false)}
          disabled={isPending}
          className="flex-1 rounded-2xl border border-border bg-card/40 px-4 py-3 text-sm font-black text-muted-foreground hover:bg-card/60 disabled:opacity-50"
        >
          Annuler
        </button>
        <button
          type="submit"
          disabled={isPending || !consentRecorded}
          className={cn(
            "flex-1 inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-info to-success px-4 py-3 text-sm font-black text-primary-foreground",
            "hover:brightness-110 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
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
    </>
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
