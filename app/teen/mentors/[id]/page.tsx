/**
 * /teen/mentors/[id] — Mentor profile + book session (V1.1 P2.5).
 *
 * Server component fetches the mentor row (RLS lets only active+approved
 * mentors leak through, plus self/admin); Client component handles the
 * "Reserver une session" interaction and POSTs to /api/teen/mentor-sessions/book
 * which wraps the book_mentor_session RPC.
 */

import { getUserRole } from "@/lib/auth/get-user-role"
import { redirect, notFound } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import Link from "next/link"
import {
  ArrowLeft,
  GraduationCap,
  Star,
  Sparkles,
  CheckCircle2,
  Users,
  Coins,
  ShieldCheck,
} from "lucide-react"
import { BookMentorSessionButton } from "./book-mentor-session-button"

export const dynamic = "force-dynamic"

interface MentorDetail {
  id: string
  expertise_tags: string[] | null
  years_experience: number | null
  bio: string | null
  intro_video_url: string | null
  hourly_rate_dh: number | null
  free_intro_session: boolean | null
  status: string
  kyc_status: string
  age_min_mentee: number | null
  age_max_mentee: number | null
  rating: number | null
  sessions_count: number | null
}

const EXPERTISE_LABELS: Record<string, string> = {
  medicine: "Medecine",
  engineering: "Ingenierie",
  coding: "Code / Tech",
  arts: "Arts",
  business: "Business",
  law: "Droit",
  sport: "Sport",
  music: "Musique",
}

export default async function TeenMentorDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const userInfo = await getUserRole()
  if (!userInfo) redirect("/auth/login")
  if (userInfo.role !== "teen") redirect("/auth/redirect")

  const { id } = await params
  const supabase = await createClient()

  const { data, error } = await supabase
    .from("mentors")
    .select(
      "id, expertise_tags, years_experience, bio, intro_video_url, hourly_rate_dh, free_intro_session, status, kyc_status, age_min_mentee, age_max_mentee, rating, sessions_count"
    )
    .eq("id", id)
    .maybeSingle()

  if (error || !data) notFound()
  const mentor = data as MentorDetail

  // Defensive — RLS already filters but double-check before booking exposure.
  const isBookable =
    mentor.status === "active" && mentor.kyc_status === "approved"

  const tags = (mentor.expertise_tags ?? []).map(
    (t) => EXPERTISE_LABELS[t] ?? t
  )
  const rating = typeof mentor.rating === "number" ? mentor.rating : null
  const sessions = mentor.sessions_count ?? 0
  const hourly = Number(mentor.hourly_rate_dh ?? 0)
  const freeIntro = !!mentor.free_intro_session
  const ageMin = mentor.age_min_mentee ?? 13
  const ageMax = mentor.age_max_mentee ?? 17

  return (
    <div className="min-h-screen bg-zinc-950">
      <div className="container mx-auto px-6 py-32 max-w-3xl">
        <Link
          href="/teen/mentors"
          className="inline-flex items-center gap-2 text-sm text-zinc-400 hover:text-white mb-6"
        >
          <ArrowLeft className="h-4 w-4" />
          Retour aux mentors
        </Link>

        {/* Hero card */}
        <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-cyan-500/10 via-cyan-500/[0.03] to-transparent backdrop-blur-md p-6 sm:p-8 mb-6">
          <div
            aria-hidden
            className="pointer-events-none absolute -right-12 -top-12 h-48 w-48 rounded-full blur-3xl bg-cyan-500/40 opacity-50"
          />
          <div className="relative">
            <div className="flex items-start gap-4 flex-wrap">
              <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-cyan-500 to-emerald-500 flex items-center justify-center shrink-0">
                <GraduationCap className="h-8 w-8 text-black" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[10px] font-black uppercase tracking-[0.18em] text-cyan-300">
                    Mentor Nivy
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-emerald-300 ring-1 ring-emerald-400/30">
                    <CheckCircle2 className="h-3 w-3" aria-hidden />
                    KYC {mentor.kyc_status}
                  </span>
                  {freeIntro ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-amber-300 ring-1 ring-amber-400/30">
                      <Sparkles className="h-3 w-3" aria-hidden />
                      Premiere session offerte
                    </span>
                  ) : null}
                </div>
                <h1 className="mt-2 text-2xl sm:text-3xl font-black tracking-tight text-white leading-tight">
                  {tags.length > 0 ? tags.join(" / ") : "Mentor Nivy"}
                </h1>
                <div className="mt-3 flex items-center gap-4 text-sm text-zinc-400 flex-wrap">
                  {rating !== null ? (
                    <span className="inline-flex items-center gap-1 text-amber-300 font-black">
                      <Star className="h-4 w-4" aria-hidden />
                      {rating.toFixed(1)}
                    </span>
                  ) : (
                    <span className="text-zinc-500 font-semibold">Nouveau mentor</span>
                  )}
                  <span className="inline-flex items-center gap-1">
                    <Users className="h-4 w-4" aria-hidden />
                    {sessions} session{sessions > 1 ? "s" : ""}
                  </span>
                  {mentor.years_experience ? (
                    <span>{mentor.years_experience} ans d'experience</span>
                  ) : null}
                </div>
              </div>
              <div className="text-right shrink-0">
                <div className="text-[10px] font-black uppercase tracking-wider text-zinc-500">
                  Tarif horaire
                </div>
                <div className="text-2xl font-black tabular-nums text-white mt-0.5">
                  {hourly > 0 ? `${hourly.toFixed(0)} DH` : "Volontaire"}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Bio */}
        <section className="rounded-3xl border border-white/10 bg-white/[0.02] backdrop-blur-md p-6 mb-6">
          <h2 className="text-sm font-black uppercase tracking-wider text-zinc-300 mb-3">
            Bio
          </h2>
          <p className="text-zinc-300 leading-relaxed whitespace-pre-line">
            {mentor.bio ?? "Ce mentor n'a pas encore renseigne de bio."}
          </p>
          {mentor.intro_video_url ? (
            <a
              href={mentor.intro_video_url}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 inline-flex items-center gap-2 text-cyan-300 hover:text-cyan-200 text-sm font-black"
            >
              <Sparkles className="h-4 w-4" />
              Voir la video d'introduction
            </a>
          ) : null}
        </section>

        {/* Stats / details */}
        <section className="grid gap-3 sm:grid-cols-3 mb-6">
          <StatTile
            label="Tranche d'age"
            value={`${ageMin} - ${ageMax} ans`}
            icon={<Users className="h-4 w-4" />}
          />
          <StatTile
            label="Sessions realisees"
            value={`${sessions}`}
            icon={<GraduationCap className="h-4 w-4" />}
          />
          <StatTile
            label="Premiere session"
            value={freeIntro ? "Gratuite" : `${hourly.toFixed(0)} DH`}
            icon={<Coins className="h-4 w-4" />}
          />
        </section>

        {/* Trust & safety */}
        <section className="rounded-3xl border border-emerald-500/20 bg-emerald-500/5 p-5 mb-6 flex gap-3 items-start">
          <ShieldCheck className="h-5 w-5 text-emerald-300 shrink-0 mt-0.5" />
          <div className="text-sm text-emerald-100/90 leading-relaxed">
            <strong className="font-black text-emerald-200">
              Securite Nivy.
            </strong>{" "}
            Toute reservation passe par l'accord de ton parent. La premiere
            session est gratuite, accompagnee et enregistree pour ta
            protection. Tu peux signaler n'importe quel comportement
            inapproprie en un tap.
          </div>
        </section>

        {/* Booking CTA */}
        {isBookable ? (
          <BookMentorSessionButton
            mentorId={mentor.id}
            freeIntro={freeIntro}
            hourlyDh={hourly}
          />
        ) : (
          <div className="rounded-3xl border border-amber-500/20 bg-amber-500/5 p-5 text-sm text-amber-200">
            Ce mentor n'est pas disponible pour des reservations actuellement.
          </div>
        )}
      </div>
    </div>
  )
}

function StatTile({
  label,
  value,
  icon,
}: {
  label: string
  value: string
  icon: React.ReactNode
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.02] backdrop-blur-md p-4">
      <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-wider text-zinc-500">
        <span className="text-cyan-300">{icon}</span>
        {label}
      </div>
      <div className="mt-1 text-lg font-black text-white tabular-nums">
        {value}
      </div>
    </div>
  )
}
