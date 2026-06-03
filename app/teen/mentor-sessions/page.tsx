/**
 * /teen/mentor-sessions — My mentor sessions (V1.1 P2.5).
 *
 * Lists upcoming + past sessions. Each row exposes status, parental approval
 * status, mentor expertise, scheduled date, amount.
 *
 * Server component. RLS policy mentor_sessions_visibility scopes rows to
 * mentee_user_id = auth.uid() (plus mentors / linked parents / admin) so the
 * direct query is safe.
 */

import { getUserRole } from "@/lib/auth/get-user-role"
import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import Link from "next/link"
import {
  ArrowLeft,
  Calendar,
  CheckCircle2,
  Clock,
  XCircle,
  Hourglass,
  Sparkles,
  GraduationCap,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { StickerCard } from "@/components/ui/sticker-card"
import { Button } from "@/components/ui/button"
import { NivEmpty } from "@/components/brand"

export const dynamic = "force-dynamic"

interface SessionRow {
  id: string
  mentor_id: string
  scheduled_for: string
  duration_minutes: number
  status: string
  amount_dh: number | null
  amount_coins: number | null
  is_intro: boolean
  parent_attended: boolean
  rating_by_mentee: number | null
  parent_approval_id: string | null
  meeting_url: string | null
  meeting_provider: string | null
  mentors?: {
    id: string
    expertise_tags: string[] | null
    bio: string | null
  } | null
}

const STATUS_TOKENS: Record<
  string,
  { label: string; tone: string; icon: React.ReactNode }
> = {
  pending_approval: {
    label: "En attente parent",
    tone: "bg-gold/15 text-ink ring-ink",
    icon: <Hourglass className="h-3 w-3" aria-hidden />,
  },
  approved: {
    label: "Approuvée",
    tone: "bg-teal/15 text-ink ring-ink",
    icon: <CheckCircle2 className="h-3 w-3" aria-hidden />,
  },
  dispatched: {
    label: "En cours",
    tone: "bg-lime/15 text-ink ring-ink",
    icon: <Sparkles className="h-3 w-3" aria-hidden />,
  },
  completed: {
    label: "Terminée",
    tone: "bg-lime/15 text-ink ring-ink",
    icon: <CheckCircle2 className="h-3 w-3" aria-hidden />,
  },
  denied: {
    label: "Refusée par parent",
    tone: "bg-destructive/15 text-destructive ring-ink",
    icon: <XCircle className="h-3 w-3" aria-hidden />,
  },
  cancelled: {
    label: "Annulée",
    tone: "bg-muted text-mute ring-ink",
    icon: <XCircle className="h-3 w-3" aria-hidden />,
  },
  no_show: {
    label: "Non présentée",
    tone: "bg-muted text-mute ring-ink",
    icon: <XCircle className="h-3 w-3" aria-hidden />,
  },
}

export default async function TeenMentorSessionsPage() {
  const userInfo = await getUserRole()
  if (!userInfo) redirect("/auth/login")
  if (userInfo.role !== "teen") redirect("/auth/redirect")

  const supabase = await createClient()
  const { data, error } = await supabase
    .from("mentor_sessions")
    .select(
      "id, mentor_id, scheduled_for, duration_minutes, status, amount_dh, amount_coins, is_intro, parent_attended, rating_by_mentee, parent_approval_id, meeting_url, meeting_provider, mentors:mentors(id, expertise_tags, bio)"
    )
    .eq("mentee_user_id", userInfo.profileId)
    .order("scheduled_for", { ascending: false })
    .limit(100)

  const rows = ((data ?? []) as unknown as SessionRow[]) || []
  const now = Date.now()
  const upcoming = rows.filter(
    (r) =>
      new Date(r.scheduled_for).getTime() >= now &&
      !["completed", "cancelled", "denied", "no_show"].includes(r.status)
  )
  const history = rows.filter((r) => !upcoming.includes(r))

  return (
    <div className="min-h-screen bg-paper">
      <div className="container mx-auto px-6 py-10 md:py-12 max-w-3xl">
        <Link
          href="/teen"
          className="inline-flex items-center gap-2 text-sm text-mute hover:text-ink mb-6"
        >
          <ArrowLeft className="h-4 w-4" />
          Retour
        </Link>

        <header className="mb-8 flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl border-2 border-ink bg-teal/20">
              <Calendar className="h-7 w-7 text-ink" />
            </div>
            <div>
              <p className="eyebrow tracking-[0.16em]">Mes RDV</p>
              <h1 className="font-display text-3xl font-extrabold tracking-tight text-ink">
                Tes <em className="font-semibold italic text-pink">sessions</em>
              </h1>
              <p className="text-sm text-mute">
                Tes rendez-vous avec tes mentors.
              </p>
            </div>
          </div>
          <Button asChild variant="outline" className="min-h-11">
            <Link href="/teen/mentors">
              <GraduationCap className="h-4 w-4" />
              Trouver un mentor
            </Link>
          </Button>
        </header>

        {error ? (
          <div className="mb-6 rounded-2xl border-2 border-ink bg-destructive/10 p-4 text-sm text-destructive">
            Impossible de charger tes sessions pour le moment.
          </div>
        ) : null}

        <Section title="À venir">
          {upcoming.length === 0 ? (
            <NivEmpty
              mood="calm"
              title="Aucune session à venir"
              description="Réserve une session avec un mentor pour faire avancer ton chemin."
              action={
                <Button asChild variant="pink" className="min-h-11">
                  <Link href="/teen/mentors">Voir les mentors</Link>
                </Button>
              }
            />
          ) : (
            <div className="space-y-3">
              {upcoming.map((s) => (
                <SessionRowCard key={s.id} session={s} />
              ))}
            </div>
          )}
        </Section>

        <div className="h-8" />

        <Section title="Historique">
          {history.length === 0 ? (
            <NivEmpty
              mood="calm"
              title="Pas encore de session terminée"
              description="Tes sessions passées apparaîtront ici."
            />
          ) : (
            <div className="space-y-3">
              {history.map((s) => (
                <SessionRowCard key={s.id} session={s} />
              ))}
            </div>
          )}
        </Section>
      </div>
    </div>
  )
}

function Section({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <section>
      <h2 className="mb-3 font-mono text-[12px] font-bold uppercase tracking-[0.16em] text-mute">
        {title}
      </h2>
      {children}
    </section>
  )
}

function SessionRowCard({ session }: { session: SessionRow }) {
  const tokens = STATUS_TOKENS[session.status] ?? {
    label: session.status,
    tone: "bg-muted text-mute ring-ink",
    icon: <Clock className="h-3 w-3" aria-hidden />,
  }
  const dt = new Date(session.scheduled_for)
  const formatted = dt.toLocaleString("fr-FR", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  })
  const tags = session.mentors?.expertise_tags ?? []
  const mentorTitle =
    tags.length > 0 ? tags.slice(0, 2).join(" / ") : "Mentor Nivy"
  const amountDh = Number(session.amount_dh ?? 0)
  const amountCoins = Number(session.amount_coins ?? 0)
  const isFree = session.is_intro || (amountDh === 0 && amountCoins === 0)

  return (
    <Link
      href={`/teen/mentors/${session.mentor_id}`}
      className="block rounded-2xl focus-visible:outline-none"
    >
      <StickerCard variant="hover" className="gap-0 p-5">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="flex items-start gap-3 min-w-0">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border-2 border-ink bg-teal/15">
              <GraduationCap className="h-5 w-5 text-ink" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span
                  className={cn(
                    "inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-[0.1em] ring-1",
                    tokens.tone
                  )}
                >
                  {tokens.icon}
                  {tokens.label}
                </span>
                {session.is_intro ? (
                  <span className="rounded-full bg-gold/15 px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-[0.1em] text-ink ring-1 ring-ink">
                    Intro gratuite
                  </span>
                ) : null}
                {session.parent_attended ? (
                  <span className="rounded-full bg-lime/15 px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-[0.1em] text-ink ring-1 ring-ink">
                    Parent présent
                  </span>
                ) : null}
              </div>
              <h3 className="mt-2 truncate font-display text-base font-bold text-ink">
                {mentorTitle}
              </h3>
              <p className="mt-0.5 font-mono text-xs text-mute">
                {formatted} · {session.duration_minutes} min
                {session.meeting_provider
                  ? ` · ${session.meeting_provider}`
                  : ""}
              </p>
            </div>
          </div>
          <div className="text-right shrink-0">
            <div className="font-mono text-[10px] font-bold uppercase tracking-[0.12em] text-mute">
              Montant
            </div>
            {isFree ? (
              <div className="font-mono text-sm font-bold tabular-nums text-lime">
                Gratuit
              </div>
            ) : (
              <div className="font-mono text-sm font-bold tabular-nums">
                {amountCoins > 0 ? (
                  <span className="text-coral">⊙ {amountCoins}</span>
                ) : null}
                {amountDh > 0 ? (
                  <span className="ml-1 text-mute">{amountDh.toFixed(0)} DH</span>
                ) : null}
              </div>
            )}
          </div>
        </div>
      </StickerCard>
    </Link>
  )
}
