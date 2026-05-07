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
    tone: "bg-amber-500/15 text-amber-300 ring-amber-400/30",
    icon: <Hourglass className="h-3 w-3" aria-hidden />,
  },
  approved: {
    label: "Approuvee",
    tone: "bg-cyan-500/15 text-cyan-300 ring-cyan-400/30",
    icon: <CheckCircle2 className="h-3 w-3" aria-hidden />,
  },
  dispatched: {
    label: "En cours",
    tone: "bg-emerald-500/15 text-emerald-300 ring-emerald-400/30",
    icon: <Sparkles className="h-3 w-3" aria-hidden />,
  },
  completed: {
    label: "Terminee",
    tone: "bg-emerald-500/15 text-emerald-300 ring-emerald-400/30",
    icon: <CheckCircle2 className="h-3 w-3" aria-hidden />,
  },
  denied: {
    label: "Refusee par parent",
    tone: "bg-red-500/15 text-red-300 ring-red-400/30",
    icon: <XCircle className="h-3 w-3" aria-hidden />,
  },
  cancelled: {
    label: "Annulee",
    tone: "bg-zinc-700/40 text-zinc-300 ring-zinc-500/30",
    icon: <XCircle className="h-3 w-3" aria-hidden />,
  },
  no_show: {
    label: "Non presentee",
    tone: "bg-zinc-700/40 text-zinc-300 ring-zinc-500/30",
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
    <div className="min-h-screen bg-zinc-950">
      <div className="container mx-auto px-6 py-32 max-w-3xl">
        <Link
          href="/teen"
          className="inline-flex items-center gap-2 text-sm text-zinc-400 hover:text-white mb-6"
        >
          <ArrowLeft className="h-4 w-4" />
          Retour
        </Link>

        <header className="mb-8 flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-cyan-500 to-emerald-500 flex items-center justify-center">
              <Calendar className="h-6 w-6 text-black" />
            </div>
            <div>
              <h1 className="text-3xl font-black tracking-tighter uppercase italic text-white">
                Mes sessions
              </h1>
              <p className="text-zinc-500 text-sm font-medium">
                Tes rendez-vous avec tes mentors.
              </p>
            </div>
          </div>
          <Link
            href="/teen/mentors"
            className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-black text-black hover:bg-white/90"
          >
            <GraduationCap className="h-4 w-4" />
            Trouver un mentor
          </Link>
        </header>

        {error ? (
          <div className="mb-6 rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">
            Impossible de charger tes sessions pour le moment.
          </div>
        ) : null}

        <Section title="A venir">
          {upcoming.length === 0 ? (
            <EmptySection
              title="Aucune session a venir"
              description="Reserve une session avec un mentor pour faire avancer ton chemin."
              ctaHref="/teen/mentors"
              ctaLabel="Voir les mentors"
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
            <EmptySection
              title="Tu n'as pas encore de session terminee"
              description="Tes sessions passees apparaitront ici."
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
      <h2 className="text-sm font-black uppercase tracking-wider text-zinc-300 mb-3">
        {title}
      </h2>
      {children}
    </section>
  )
}

function EmptySection({
  title,
  description,
  ctaHref,
  ctaLabel,
}: {
  title: string
  description: string
  ctaHref?: string
  ctaLabel?: string
}) {
  return (
    <div className="rounded-3xl border border-white/10 bg-white/[0.02] backdrop-blur-md p-8 text-center">
      <div className="mx-auto mb-3 h-12 w-12 rounded-2xl bg-cyan-500/15 flex items-center justify-center">
        <Calendar className="h-6 w-6 text-cyan-300" />
      </div>
      <h3 className="text-base font-black text-white">{title}</h3>
      <p className="mt-1 text-sm text-zinc-400">{description}</p>
      {ctaHref && ctaLabel ? (
        <Link
          href={ctaHref}
          className="mt-4 inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-black text-black hover:bg-white/90"
        >
          {ctaLabel}
        </Link>
      ) : null}
    </div>
  )
}

function SessionRowCard({ session }: { session: SessionRow }) {
  const tokens = STATUS_TOKENS[session.status] ?? {
    label: session.status,
    tone: "bg-zinc-700/40 text-zinc-300 ring-zinc-500/30",
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
  const amount = Number(session.amount_dh ?? 0)

  return (
    <Link
      href={`/teen/mentors/${session.mentor_id}`}
      className={cn(
        "group relative block overflow-hidden rounded-3xl border border-white/10 bg-white/[0.02] backdrop-blur-md p-5",
        "hover:border-white/20 hover:shadow-2xl hover:shadow-black/30 transition-all"
      )}
    >
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="flex items-start gap-3 min-w-0">
          <div className="h-10 w-10 rounded-xl bg-cyan-500/15 flex items-center justify-center shrink-0">
            <GraduationCap className="h-5 w-5 text-cyan-300" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span
                className={cn(
                  "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-black uppercase tracking-wider ring-1",
                  tokens.tone
                )}
              >
                {tokens.icon}
                {tokens.label}
              </span>
              {session.is_intro ? (
                <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-amber-300 ring-1 ring-amber-400/30">
                  Intro gratuite
                </span>
              ) : null}
              {session.parent_attended ? (
                <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-emerald-300 ring-1 ring-emerald-400/30">
                  Parent present
                </span>
              ) : null}
            </div>
            <h3 className="mt-2 text-base font-black text-white truncate">
              {mentorTitle}
            </h3>
            <p className="mt-0.5 text-xs text-zinc-400">
              {formatted} - {session.duration_minutes} min
              {session.meeting_provider
                ? ` - ${session.meeting_provider}`
                : ""}
            </p>
          </div>
        </div>
        <div className="text-right shrink-0">
          <div className="text-[10px] font-black uppercase tracking-wider text-zinc-500">
            Montant
          </div>
          <div className="text-sm font-black tabular-nums text-white">
            {session.is_intro || amount === 0 ? "Gratuit" : `${amount.toFixed(0)} DH`}
          </div>
        </div>
      </div>
    </Link>
  )
}
