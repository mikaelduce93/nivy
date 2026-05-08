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
  Users,
  CheckCircle2,
  Search,
} from "lucide-react"
import { cn } from "@/lib/utils"

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
    "min-h-11 rounded-xl bg-zinc-900 border border-white/10 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-primary/40"

  return (
    <div className="-m-4 md:-m-6 min-h-screen bg-zinc-950">
      <div className="container mx-auto max-w-5xl px-4 sm:px-6 pt-6 pb-32 md:pt-12 md:pb-12">
        <Link
          href="/teen"
          className="inline-flex min-h-11 items-center gap-2 text-sm text-zinc-400 hover:text-white mb-4"
        >
          <ArrowLeft className="h-4 w-4" />
          Retour
        </Link>

        <header className="mb-8">
          <div className="flex items-start gap-3">
            <div className="h-12 w-12 shrink-0 rounded-2xl bg-gradient-to-br from-gen-z-sky to-gen-z-mint flex items-center justify-center">
              <GraduationCap className="h-6 w-6 text-black" aria-hidden />
            </div>
            <div className="min-w-0">
              <h1 className="text-4xl font-black tracking-tighter uppercase italic text-white leading-none">
                Mentors
              </h1>
              <p className="mt-1 text-zinc-500 text-sm font-medium">
                Trouve un mentor verifie pour t'accompagner sur ton chemin.
              </p>
            </div>
          </div>
        </header>

        {error ? (
          <div className="mb-6 rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">
            Impossible de charger les mentors pour le moment.
          </div>
        ) : null}

        {/* Filters */}
        <form
          method="GET"
          className="mb-8 rounded-3xl border border-white/10 bg-white/[0.02] backdrop-blur-md p-4 flex flex-wrap gap-3 items-end"
        >
          <div className="flex min-w-0 flex-1 flex-col gap-1 sm:flex-none">
            <label className="text-[10px] font-black uppercase tracking-wider text-zinc-500">
              Domaine
            </label>
            <select name="tag" defaultValue={tag} className={`${selectClass} w-full sm:w-auto`}>
              <option value="">Tous les domaines</option>
              {EXPERTISE_PRESETS.map((p) => (
                <option key={p.slug} value={p.slug}>
                  {p.label}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-black uppercase tracking-wider text-zinc-500">
              Mon age
            </label>
            <input
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
            <label className="text-[10px] font-black uppercase tracking-wider text-zinc-500">
              Note min.
            </label>
            <select
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
            className="ml-auto inline-flex min-h-11 items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-black text-black hover:bg-white/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
          >
            <Search className="h-4 w-4" />
            Filtrer
          </button>
        </form>

        {/* Grid */}
        {list.length === 0 ? (
          <div className="rounded-3xl border border-white/10 bg-white/[0.02] backdrop-blur-md p-12 text-center">
            <div className="mx-auto mb-4 h-14 w-14 rounded-2xl bg-cyan-500/15 flex items-center justify-center">
              <Users className="h-7 w-7 text-cyan-300" />
            </div>
            <h3 className="text-lg font-black text-white">
              Aucun mentor disponible pour le moment
            </h3>
            <p className="mt-1 text-sm text-zinc-400">
              Reviens bientot — l'equipe Nivy onboarde de nouveaux mentors chaque
              semaine.
            </p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {list.map((m) => (
              <MentorCard key={m.id} mentor={m} />
            ))}
          </div>
        )}
      </div>
    </div>
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
      className={cn(
        "group relative block overflow-hidden rounded-3xl border backdrop-blur-md transition-all duration-300",
        "border-white/10 bg-gradient-to-br from-cyan-500/10 via-cyan-500/[0.03] to-transparent",
        "hover:-translate-y-0.5 hover:border-white/20 hover:shadow-2xl hover:shadow-black/40",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/40"
      )}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute -right-12 -top-12 h-36 w-36 rounded-full blur-3xl bg-cyan-500/40 opacity-50 transition-opacity duration-300 group-hover:opacity-80"
      />
      <div className="relative p-5 sm:p-6">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-500/15">
              <GraduationCap className="h-5 w-5 text-cyan-300" aria-hidden />
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] font-black uppercase tracking-[0.18em] text-cyan-300">
                Mentor
              </span>
              <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider text-emerald-300">
                <CheckCircle2 className="h-3 w-3" aria-hidden />
                KYC verifie
              </span>
            </div>
          </div>
          <div className="flex flex-col items-end gap-1">
            {rating !== null ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-2 py-0.5 text-[11px] font-black tabular-nums text-amber-300 ring-1 ring-amber-400/30">
                <Star className="h-3 w-3" aria-hidden />
                {rating.toFixed(1)}
              </span>
            ) : (
              <span className="rounded-full bg-zinc-800/60 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-zinc-400 ring-1 ring-zinc-700/40">
                Nouveau
              </span>
            )}
            {freeIntro ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-emerald-300 ring-1 ring-emerald-400/30">
                <Sparkles className="h-3 w-3" aria-hidden />
                Intro gratuite
              </span>
            ) : null}
          </div>
        </div>

        <h3 className="text-base font-black leading-snug text-white sm:text-lg">
          {tags.length > 0 ? tags.map(prettyTag).join(" / ") : "Mentor Nivy"}
        </h3>
        {mentor.bio ? (
          <p className="mt-1 line-clamp-2 text-sm leading-snug text-zinc-400">
            {mentor.bio}
          </p>
        ) : null}

        <div className="mt-4 flex items-center justify-between gap-3 text-[11px] font-semibold text-zinc-400">
          <span>
            {ageMin}-{ageMax} ans
          </span>
          <span>
            {sessions} session{sessions > 1 ? "s" : ""}
          </span>
          <span className="font-black tabular-nums text-white">
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
