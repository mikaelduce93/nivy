/**
 * /teen/mentors — Discover mentors (V1.1 P2.5).
 *
 * Browse active + KYC-approved mentors. Filters via URL search params:
 *   ?tag=medicine&min_rating=4&age=15&lang=fr
 *
 * Server component. Fetches directly through the authenticated supabase client
 * (RLS policy mentors_active_read enforces status='active'). Booking flow lives
 * on the per-mentor detail page.
 */

import { getUserRole } from "@/lib/auth/get-user-role"
import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import Link from "next/link"
import {
  ArrowLeft,
  GraduationCap,
  Star,
  Sparkles,
  CheckCircle2,
  Search,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { PullToRefresh } from "@/components/teen/pull-to-refresh"
import { EmptyState } from "@/components/ui/states/empty-state"
import { H1, H3 } from "@/components/ui/headings"
import { StatusBadge } from "@/components/ui/status-badge"

export const dynamic = "force-dynamic"

interface MentorRow {
  id: string
  expertise_tags: string[] | null
  years_experience: number | null
  bio: string | null
  hourly_rate_dh: number | null
  free_intro_session: boolean | null
  age_min_mentee: number | null
  age_max_mentee: number | null
  rating: number | null
  sessions_count: number | null
}

const EXPERTISE_PRESETS = [
  { slug: "medicine", label: "Medecine" },
  { slug: "engineering", label: "Ingenierie" },
  { slug: "coding", label: "Code / Tech" },
  { slug: "arts", label: "Arts" },
  { slug: "business", label: "Business" },
  { slug: "law", label: "Droit" },
  { slug: "sport", label: "Sport" },
  { slug: "music", label: "Musique" },
] as const

export default async function TeenMentorsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>
}) {
  const userInfo = await getUserRole()
  if (!userInfo) redirect("/auth/login")
  if (userInfo.role !== "teen") redirect("/auth/redirect")

  const sp = await searchParams
  const tag = sp.tag?.trim() || ""
  const minRating = sp.min_rating ? Number(sp.min_rating) : null
  const age = sp.age ? Number(sp.age) : null

  const supabase = await createClient()
  let q = supabase
    .from("mentors")
    .select(
      "id, expertise_tags, years_experience, bio, hourly_rate_dh, free_intro_session, age_min_mentee, age_max_mentee, rating, sessions_count"
    )
    .eq("status", "active")
    .eq("kyc_status", "approved")

  if (tag) q = q.contains("expertise_tags", [tag])
  if (minRating && Number.isFinite(minRating)) q = q.gte("rating", minRating)
  if (age && Number.isFinite(age)) {
    q = q.lte("age_min_mentee", age).gte("age_max_mentee", age)
  }

  const { data: mentors, error } = await q
    .order("rating", { ascending: false, nullsFirst: false })
    .limit(50)

  const list = (mentors ?? []) as MentorRow[]

  // V1.3-B: shared control class — 44px min-height for WCAG AAA touch.
  const selectClass =
    "min-h-11 rounded-xl bg-card border border-border px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"

  return (
    <PullToRefresh>
    <div className="-m-4 md:-m-6 min-h-screen bg-background">
      <div className="container mx-auto max-w-5xl px-4 sm:px-6 pt-6 pb-32 md:pt-12 md:pb-12">
        <Link
          href="/teen"
          className="inline-flex min-h-11 items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-4"
        >
          <ArrowLeft className="h-4 w-4" />
          Retour
        </Link>

        <header className="mb-8">
          <div className="flex items-start gap-3">
            <div className="h-12 w-12 shrink-0 rounded-2xl bg-gradient-to-br from-info-soft to-success-soft flex items-center justify-center">
              <GraduationCap className="h-6 w-6 text-primary-foreground" aria-hidden />
            </div>
            <div className="min-w-0">
              <H1 className="uppercase leading-none">Mentors</H1>
              <p className="mt-1 text-muted-foreground text-sm font-medium">
                Trouve un mentor verifie pour t'accompagner sur ton chemin.
              </p>
            </div>
          </div>
        </header>

        {error ? (
          <div
            role="alert"
            aria-live="assertive"
            className="mb-6 rounded-2xl border border-destructive/40 bg-destructive/15 p-4 text-sm text-destructive"
          >
            Impossible de charger les mentors pour le moment.
          </div>
        ) : null}

        {/* Filters */}
        <form
          method="GET"
          aria-label="Filtres mentors"
          className="mb-8 rounded-3xl border border-border bg-card/40 backdrop-blur-md p-4 flex flex-wrap gap-3 items-end"
        >
          <div className="flex min-w-0 flex-1 flex-col gap-1 sm:flex-none">
            <label
              htmlFor="mentor-tag"
              className="text-xs font-black uppercase tracking-wider text-muted-foreground"
            >
              Domaine
            </label>
            <select
              id="mentor-tag"
              name="tag"
              defaultValue={tag}
              className={`${selectClass} w-full sm:w-auto`}
            >
              <option value="">Tous les domaines</option>
              {EXPERTISE_PRESETS.map((p) => (
                <option key={p.slug} value={p.slug}>
                  {p.label}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label
              htmlFor="mentor-age"
              className="text-xs font-black uppercase tracking-wider text-muted-foreground"
            >
              Mon age
            </label>
            <input
              id="mentor-age"
              type="number"
              name="age"
              min={13}
              max={17}
              defaultValue={sp.age ?? ""}
              placeholder="13-17"
              className={`${selectClass} w-24`}
            />
          </div>
          <div className="flex flex-col gap-1">
            <label
              htmlFor="mentor-min-rating"
              className="text-xs font-black uppercase tracking-wider text-muted-foreground"
            >
              Note min.
            </label>
            <select
              id="mentor-min-rating"
              name="min_rating"
              defaultValue={sp.min_rating ?? ""}
              className={selectClass}
            >
              <option value="">Toutes</option>
              <option value="4">4+</option>
              <option value="4.5">4.5+</option>
            </select>
          </div>
          <button
            type="submit"
            className="ml-auto inline-flex min-h-11 items-center gap-2 rounded-full bg-foreground px-4 py-2 text-sm font-black text-background hover:bg-foreground/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Search className="h-4 w-4" />
            Filtrer
          </button>
        </form>

        {/* Grid */}
        {list.length === 0 ? (
          <EmptyState
            icon={GraduationCap}
            title="Aucun mentor disponible"
            description="Reviens bientôt — l'équipe Nivy onboarde de nouveaux mentors chaque semaine."
          />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {list.map((m) => (
              <MentorCard key={m.id} mentor={m} />
            ))}
          </div>
        )}
      </div>
    </div>
    </PullToRefresh>
  )
}

function MentorCard({ mentor }: { mentor: MentorRow }) {
  const tags = (mentor.expertise_tags ?? []).slice(0, 3)
  const rating = typeof mentor.rating === "number" ? mentor.rating : null
  const sessions = mentor.sessions_count ?? 0
  const hourly = Number(mentor.hourly_rate_dh ?? 0)
  const freeIntro = !!mentor.free_intro_session
  const ageMin = mentor.age_min_mentee ?? 13
  const ageMax = mentor.age_max_mentee ?? 17

  return (
    <Link
      href={`/teen/mentors/${mentor.id}`}
      // TICKET-024 — origin half of the View Transitions morph. The detail
      // page assigns the same `vt-mentor-${id}` to its hero card so the
      // browser auto-tweens the bounding box + opacity.
      style={{ viewTransitionName: `vt-mentor-${mentor.id}` }}
      className={cn(
        "group relative block overflow-hidden rounded-3xl border backdrop-blur-md transition-all duration-300",
        "border-border bg-gradient-to-br from-info-soft/10 via-info-soft/[0.03] to-transparent",
        "hover:-translate-y-0.5 hover:border-info/30 hover:shadow-2xl hover:shadow-background/40",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-info/40"
      )}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute -right-12 -top-12 h-36 w-36 rounded-full blur-3xl bg-info-soft/40 opacity-50 transition-opacity duration-300 group-hover:opacity-80"
      />
      <div className="relative p-5 sm:p-6">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-info-soft/15">
              <GraduationCap className="h-5 w-5 text-info" aria-hidden />
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-[10px] font-black uppercase tracking-[0.18em] text-info">
                Mentor
              </span>
              <StatusBadge
                variant="success"
                size="sm"
                icon={CheckCircle2}
                label="KYC verifie"
              />
            </div>
          </div>
          <div className="flex flex-col items-end gap-1">
            {rating !== null ? (
              <StatusBadge
                variant="warning"
                size="sm"
                icon={Star}
                label={rating.toFixed(1)}
              />
            ) : (
              <StatusBadge variant="neutral" size="sm" icon={false} label="Nouveau" />
            )}
            {freeIntro ? (
              <StatusBadge
                variant="success"
                size="sm"
                icon={Sparkles}
                label="Intro gratuite"
              />
            ) : null}
          </div>
        </div>

        <H3 className="text-base font-black leading-snug text-foreground sm:text-lg">
          {tags.length > 0 ? tags.map(prettyTag).join(" / ") : "Mentor Nivy"}
        </H3>
        {mentor.bio ? (
          <p className="mt-1 line-clamp-2 text-sm leading-snug text-muted-foreground">
            {mentor.bio}
          </p>
        ) : null}

        <div className="mt-4 flex items-center justify-between gap-3 text-[11px] font-semibold text-muted-foreground">
          <span>
            {ageMin}-{ageMax} ans
          </span>
          <span>
            {sessions} session{sessions > 1 ? "s" : ""}
          </span>
          <span className="font-black tabular-nums text-foreground">
            {hourly > 0 ? `${hourly.toFixed(0)} DH/h` : "Volontaire"}
          </span>
        </div>
      </div>
    </Link>
  )
}

function prettyTag(slug: string): string {
  const found = EXPERTISE_PRESETS.find((p) => p.slug === slug)
  return found?.label ?? slug
}
