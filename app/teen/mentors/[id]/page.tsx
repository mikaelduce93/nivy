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
import { H1, H2 } from "@/components/ui/headings"
import { StatusBadge } from "@/components/ui/status-badge"
import { StickerCard } from "@/components/ui/sticker-card"
import { NivCoach } from "@/components/brand"

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
  medicine: "Médecine",
  engineering: "Ingénierie",
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
    <div className="min-h-screen bg-paper">
      <div className="container mx-auto px-6 py-10 md:py-12 max-w-3xl">
        <Link
          href="/teen/mentors"
          className="inline-flex items-center gap-2 text-sm text-mute hover:text-ink mb-6"
        >
          <ArrowLeft className="h-4 w-4" />
          Retour aux mentors
        </Link>

        {/* Hero card */}
        {/* TICKET-024 — destination half of the View Transitions morph.
            Pairs with the MentorCard on /teen/mentors. */}
        <StickerCard
          className="gap-0 p-6 sm:p-8 mb-6"
          style={{ viewTransitionName: `vt-mentor-${mentor.id}` }}
        >
          <div className="flex items-start gap-4 flex-wrap">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl border-2 border-ink bg-teal/20">
              <GraduationCap className="h-8 w-8 text-ink" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-teal">
                  Mentor Nivy
                </span>
                <StatusBadge
                  variant="success"
                  size="sm"
                  icon={CheckCircle2}
                  label="KYC approuvé"
                />
                {freeIntro ? (
                  <StatusBadge
                    variant="warning"
                    size="sm"
                    icon={Sparkles}
                    label="Première session offerte"
                  />
                ) : null}
              </div>
              <H1 className="mt-2 font-display text-2xl sm:text-3xl font-extrabold tracking-tight text-ink leading-tight">
                {tags.length > 0 ? tags.join(" / ") : "Mentor Nivy"}
              </H1>
              <div className="mt-3 flex items-center gap-4 text-sm text-mute flex-wrap">
                {rating !== null ? (
                  <span className="inline-flex items-center gap-1 font-mono font-bold text-gold">
                    <Star className="h-4 w-4" aria-hidden />
                    {rating.toFixed(1)}
                  </span>
                ) : (
                  <span className="font-semibold text-mute">Nouveau mentor</span>
                )}
                <span className="inline-flex items-center gap-1">
                  <Users className="h-4 w-4" aria-hidden />
                  {sessions} session{sessions > 1 ? "s" : ""}
                </span>
                {mentor.years_experience ? (
                  <span>{mentor.years_experience} ans d'expérience</span>
                ) : null}
              </div>
            </div>
            <div className="text-right shrink-0">
              <div className="font-mono text-[10px] font-bold uppercase tracking-[0.12em] text-mute">
                Tarif horaire
              </div>
              <div className="mt-0.5 font-mono text-2xl font-bold tabular-nums text-ink">
                {hourly > 0 ? `${hourly.toFixed(0)} DH` : "Volontaire"}
              </div>
            </div>
          </div>
        </StickerCard>

        {/* Bio */}
        <StickerCard className="gap-0 p-6 mb-6">
          <H2 className="font-mono text-sm font-bold uppercase tracking-[0.12em] text-ink mb-3">
            Bio
          </H2>
          <p className="text-ink/90 leading-relaxed whitespace-pre-line">
            {mentor.bio ?? "Ce mentor n'a pas encore renseigné de bio."}
          </p>
          {mentor.intro_video_url ? (
            <a
              href={mentor.intro_video_url}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 inline-flex items-center gap-2 text-pink hover:text-pink/80 text-sm font-bold"
            >
              <Sparkles className="h-4 w-4" />
              Voir la vidéo d'introduction
            </a>
          ) : null}
        </StickerCard>

        {/* Stats / details */}
        <section className="grid gap-3 sm:grid-cols-3 mb-6">
          <StatTile
            label="Tranche d'âge"
            value={`${ageMin} - ${ageMax} ans`}
            icon={<Users className="h-4 w-4" />}
          />
          <StatTile
            label="Sessions réalisées"
            value={`${sessions}`}
            icon={<GraduationCap className="h-4 w-4" />}
          />
          <StatTile
            label="Première session"
            value={freeIntro ? "Gratuite" : `${hourly.toFixed(0)} DH`}
            icon={<Coins className="h-4 w-4" />}
          />
        </section>

        {/* Trust & safety — coach Niv incarne la réassurance parentale */}
        <NivCoach
          mood="calm"
          className="mb-6"
          message={
            <>
              <strong className="font-bold text-paper">Sécurité Nivy.</strong>{" "}
              Toute réservation passe par l'accord de ton parent. La première
              session est gratuite, accompagnée et enregistrée pour ta
              protection. Tu peux signaler n'importe quel comportement
              inapproprié en un tap.
            </>
          }
        />

        {/* Booking CTA */}
        {isBookable ? (
          <BookMentorSessionButton
            mentorId={mentor.id}
            freeIntro={freeIntro}
            hourlyDh={hourly}
          />
        ) : (
          <div className="rounded-2xl border-2 border-ink bg-warning/10 p-5 text-sm text-ink">
            Ce mentor n'est pas disponible pour des réservations actuellement.
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
    <StickerCard className="gap-0 p-4">
      <div className="flex items-center gap-2 font-mono text-[10px] font-bold uppercase tracking-[0.12em] text-mute">
        <span className="text-teal">{icon}</span>
        {label}
      </div>
      <div className="mt-1 font-mono text-lg font-bold text-ink tabular-nums">
        {value}
      </div>
    </StickerCard>
  )
}
