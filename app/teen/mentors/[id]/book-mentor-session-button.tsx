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
import { Button } from "@/components/ui/button"
import { StickerCard } from "@/components/ui/sticker-card"
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
        const message = translateError(json?.error) ?? "Réservation impossible. Réessaie."
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
        const message = err.message || "Erreur réseau. Réessaie."
        setError(message)
        toast.error(message)
      },
      onSuccess: () => {
        toast.success("Demande envoyée à ton parent !")
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
      setError("La date doit être dans le futur.")
      return
    }
    if (!consentRecorded) {
      setError("Tu dois accepter l'enregistrement de la session pour réserver.")
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
        <Button
          type="button"
          onClick={() => setOpen(true)}
          variant="pink"
          size="lg"
          className="w-full"
        >
          <Calendar className="h-5 w-5" />
          Réserver une session
          {freeIntro ? (
            <span className="ml-2 rounded-full border-2 border-ink bg-paper px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-[0.12em] text-ink">
              Première offerte
            </span>
          ) : null}
        </Button>
      </>
    )
  }

  if (success) {
    return (
      <>
        {celebrateNode}
        <StickerCard variant="panel" className="gap-0 p-6 bg-lime/15">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="h-6 w-6 text-ink shrink-0" />
            <div>
              <H3 className="font-display text-lg font-bold text-ink">Demande envoyée !</H3>
              <p className="text-sm text-ink/80 mt-1">
                Ton parent doit approuver la session avant qu'elle ne soit
                confirmée. On t'emmène vers tes sessions...
              </p>
            </div>
          </div>
        </StickerCard>
      </>
    )
  }

  return (
    <>
      {celebrateNode}
      <StickerCard className="gap-0 p-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <H3 className="font-display text-lg font-bold text-ink">Nouvelle session</H3>
            <p className="text-sm text-mute mt-1">
              La demande sera envoyée à ton parent pour approbation.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1">
              <label className="font-mono text-[10px] font-bold uppercase tracking-[0.12em] text-mute">
                Date et heure
              </label>
              <input
                type="datetime-local"
                value={scheduledFor || defaultDate}
                onChange={(e) => setScheduledFor(e.target.value)}
                min={formatDatetimeLocal(new Date(Date.now() + 60_000))}
                required
                className="rounded-xl border-2 border-ink bg-paper px-3 py-2 text-sm text-ink focus:outline-none focus-visible:ring-[3px] focus-visible:ring-pink/40"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="font-mono text-[10px] font-bold uppercase tracking-[0.12em] text-mute">
                Durée
              </label>
              <select
                value={duration}
                onChange={(e) => setDuration(Number(e.target.value))}
                className="rounded-xl border-2 border-ink bg-paper px-3 py-2 text-sm text-ink focus:outline-none focus-visible:ring-[3px] focus-visible:ring-pink/40"
              >
                {DURATIONS.map((d) => (
                  <option key={d.value} value={d.value}>
                    {d.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex items-center justify-between text-sm text-ink rounded-xl border-2 border-ink bg-paper p-3">
            <span className="inline-flex items-center gap-2">
              <Clock className="h-4 w-4 text-teal" />
              Estimation
            </span>
            <span className="font-mono font-bold tabular-nums text-ink">
              {freeIntro
                ? "Première session gratuite"
                : `${Math.round((hourlyDh * duration) / 60)} DH`}
            </span>
          </div>

          {/* V1.2-A: explicit recording-consent gate.
              consent_recorded defaults to FALSE in mentor_session_recordings;
              recording cannot start until both teen and mentor opt in. */}
          <label
            className={cn(
              "flex items-start gap-3 rounded-xl border-2 p-3 cursor-pointer transition-colors",
              consentRecorded
                ? "border-ink bg-teal/15"
                : "border-ink bg-paper hover:bg-ink/5"
            )}
          >
            <input
              type="checkbox"
              checked={consentRecorded}
              onChange={(e) => setConsentRecorded(e.target.checked)}
              className="mt-1 h-4 w-4 rounded border-2 border-ink bg-paper accent-pink"
            />
            <span className="text-sm text-ink leading-snug">
              <ShieldCheck className="h-4 w-4 text-teal inline-block mr-1 -mt-0.5" />
              J&apos;accepte que la session soit enregistrée pour des raisons de
              sécurité (90 jours de conservation). Mon parent et le mentor seront
              informés ; l&apos;enregistrement sera supprimé automatiquement.
            </span>
          </label>

          {error ? (
            <div className="rounded-xl border-2 border-ink bg-coral/15 p-3 flex gap-2 items-start text-sm text-ink">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-coral" />
              <span>{error}</span>
            </div>
          ) : null}

          <div className="flex gap-2 pt-2">
            <Button
              type="button"
              onClick={() => setOpen(false)}
              disabled={isPending}
              variant="outline"
              className="flex-1"
            >
              Annuler
            </Button>
            <Button
              type="submit"
              disabled={isPending || !consentRecorded}
              variant="pink"
              className="flex-1"
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
            </Button>
          </div>
        </form>
      </StickerCard>
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
      return "La vérification de ce mentor est incomplète."
    case "age_out_of_range":
      return "Ce mentor accompagne une autre tranche d'âge."
    case "no_parent_link":
      return "Aucun parent n'est lié à ton compte. Contacte le support."
    case "scheduled_in_past":
      return "La date doit être dans le futur."
    default:
      return null
  }
}
