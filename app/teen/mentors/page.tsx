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
import { PullToRefresh } from "@/components/teen/pull-to-refresh"
import { StickerCard } from "@/components/ui/sticker-card"
import { NivEmpty } from "@/components/brand"
import { H3 } from "@/components/ui/headings"
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
  { slug: "medicine", label: "Médecine" },
  { slug: "engineering", label: "Ingénierie" },
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

  // Champ de filtre charte : bordure 2px ink + focus rose.
  const selectClass =
    "min-h-11 rounded-xl border-2 border-ink bg-white px-3 py-2 text-sm text-ink focus:outline-none focus-visible:ring-[3px] focus-visible:ring-pink/40"

  return (
    <PullToRefresh>
    <div className="-m-4 md:-m-6 min-h-screen bg-paper">
      <div className="container mx-auto max-w-5xl px-4 sm:px-6 pt-6 pb-32 md:pt-12 md:pb-12">
        <Link
          href="/teen"
          className="inline-flex min-h-11 items-center gap-2 text-sm text-mute hover:text-ink mb-4"
        >
          <ArrowLeft className="h-4 w-4" />
          Retour
        </Link>

        <header className="mb-8 flex items-start gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border-2 border-ink bg-teal/20">
            <GraduationCap className="h-7 w-7 text-ink" aria-hidden />
          </div>
          <div className="min-w-0">
            <p className="eyebrow tracking-[0.16em]">Mentorat</p>
            <h1 className="font-display text-4xl font-extrabold tracking-tight">
              Tes <em className="font-semibold italic text-pink">mentors</em>
            </h1>
            <p className="mt-1 text-sm text-mute">
              Trouve un mentor vérifié pour t'accompagner sur ton chemin.
            </p>
          </div>
        </header>

        {error ? (
          <div
            role="alert"
            aria-live="assertive"
            className="mb-6 rounded-2xl border-2 border-ink bg-destructive/15 p-4 text-sm text-destructive"
          >
            Impossible de charger les mentors pour le moment.
          </div>
        ) : null}

        {/* Filters */}
        <form
          method="GET"
          aria-label="Filtres mentors"
          className="mb-8 flex flex-wrap items-end gap-3 rounded-2xl border-2 border-ink bg-white p-4 shadow-stkr-sm"
        >
          <div className="flex min-w-0 flex-1 flex-col gap-1 sm:flex-none">
            <label
              htmlFor="mentor-tag"
              className="font-mono text-xs font-bold uppercase tracking-[0.12em] text-mute"
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
              className="font-mono text-xs font-bold uppercase tracking-[0.12em] text-mute"
            >
              Mon âge
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
              className="font-mono text-xs font-bold uppercase tracking-[0.12em] text-mute"
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
            className="ml-auto inline-flex min-h-11 items-center gap-2 rounded-xl border-2 border-ink bg-pink px-4 py-2 text-sm font-bold text-ink transition-all hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-stkr-md focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-pink/40"
          >
            <Search className="h-4 w-4" />
            Filtrer
          </button>
        </form>

        {/* Grid */}
        {list.length === 0 ? (
          <NivEmpty
            mood="proud"
            title="Aucun mentor dispo pour l'instant"
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
      className="block rounded-2xl focus-visible:outline-none"
    >
      <StickerCard variant="hover" className="h-full gap-0 p-5 sm:p-6">
        <div className="mb-3 flex items-start justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl border-2 border-ink bg-teal/15">
              <GraduationCap className="h-5 w-5 text-ink" aria-hidden />
            </div>
            <div className="flex flex-col gap-1">
              <span className="font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-teal">
                Mentor
              </span>
              <StatusBadge
                variant="success"
                size="sm"
                icon={CheckCircle2}
                label="KYC vérifié"
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

        <H3 className="font-display text-base font-bold leading-snug text-ink sm:text-lg">
          {tags.length > 0 ? tags.map(prettyTag).join(" / ") : "Mentor Nivy"}
        </H3>
        {mentor.bio ? (
          <p className="mt-1 line-clamp-2 text-sm leading-snug text-mute">
            {mentor.bio}
          </p>
        ) : null}

        <div className="mt-4 flex items-center justify-between gap-3 font-mono text-[11px] font-semibold text-mute">
          <span>
            {ageMin}-{ageMax} ans
          </span>
          <span>
            {sessions} session{sessions > 1 ? "s" : ""}
          </span>
          <span className="font-bold tabular-nums text-ink">
            {hourly > 0 ? `${hourly.toFixed(0)} DH/h` : "Volontaire"}
          </span>
        </div>
      </StickerCard>
    </Link>
  )
}

function prettyTag(slug: string): string {
  const found = EXPERTISE_PRESETS.find((p) => p.slug === slug)
  return found?.label ?? slug
}
