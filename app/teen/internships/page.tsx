/**
 * /teen/internships — Browse internships (V1.1 P2.5).
 *
 * Filters: ?age=15&duration=summer&paid=true&city=Casablanca&remote=true.
 * Migration 066 added internships.city + internships.remote_ok.
 *
 * Server component — RLS internships_authenticated_read covers status='open'.
 */

import { getUserRole } from "@/lib/auth/get-user-role"
import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import Link from "next/link"
import {
  ArrowLeft,
  Briefcase,
  MapPin,
  Calendar,
  Coins,
  Users,
  Search,
} from "lucide-react"
import { StickerCard } from "@/components/ui/sticker-card"
import { NivEmpty } from "@/components/brand"
import { H3 } from "@/components/ui/headings"
import { StatusBadge } from "@/components/ui/status-badge"

export const dynamic = "force-dynamic"

interface Internship {
  id: string
  partner_id: string | null
  title: string
  description: string | null
  duration: string
  age_min: number
  age_max: number
  application_deadline: string | null
  spots_total: number
  spots_taken: number
  paid: boolean
  stipend_dh: number | null
  required_skills: string[] | null
  status: string
  city: string | null
  remote_ok: boolean
}

const DURATION_LABELS: Record<string, string> = {
  "1_day": "1 jour",
  "1_week": "1 semaine",
  "2_weeks": "2 semaines",
  summer: "Été",
  part_time_school_year: "Année scolaire",
}

export default async function TeenInternshipsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>
}) {
  const userInfo = await getUserRole()
  if (!userInfo) redirect("/auth/login")
  if (userInfo.role !== "teen") redirect("/auth/redirect")

  const sp = await searchParams
  const age = sp.age ? Number(sp.age) : null
  const duration = sp.duration?.trim() || ""
  const paidOnly = sp.paid === "true"
  const city = sp.city?.trim() || ""
  const remoteOnly = sp.remote === "true"

  const supabase = await createClient()
  let q = supabase
    .from("internships")
    .select(
      "id, partner_id, title, description, duration, age_min, age_max, application_deadline, spots_total, spots_taken, paid, stipend_dh, required_skills, status, city, remote_ok"
    )
    .eq("status", "open")
    .order("application_deadline", { ascending: true, nullsFirst: false })
    .limit(50)

  if (age && Number.isFinite(age)) {
    q = q.lte("age_min", age).gte("age_max", age)
  }
  if (duration) q = q.eq("duration", duration)
  if (paidOnly) q = q.eq("paid", true)
  if (city) q = q.ilike("city", city)
  if (remoteOnly) q = q.eq("remote_ok", true)

  const { data, error } = await q
  const list = (data ?? []) as Internship[]

  return (
    <div className="min-h-screen bg-paper">
      <div className="container mx-auto px-6 py-10 md:py-12 max-w-5xl">
        <Link
          href="/teen"
          className="inline-flex items-center gap-2 text-sm text-mute hover:text-ink mb-6"
        >
          <ArrowLeft className="h-4 w-4" />
          Retour
        </Link>

        <header className="mb-8 flex items-start gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border-2 border-ink bg-lime/20">
            <Briefcase className="h-7 w-7 text-ink" />
          </div>
          <div>
            <p className="eyebrow tracking-[0.16em]">Stages partenaires</p>
            <h1 className="font-display text-4xl font-extrabold tracking-tight">
              Tes <em className="font-semibold italic text-pink">stages</em>
            </h1>
            <p className="mt-1 text-sm text-mute">
              Découvre des stages chez nos partenaires vérifiés.
            </p>
          </div>
        </header>

        {error ? (
          <div className="mb-6 rounded-2xl border-2 border-ink bg-destructive/10 p-4 text-sm text-destructive">
            Impossible de charger les stages pour le moment.
          </div>
        ) : null}

        {/* Filters */}
        <form
          method="GET"
          className="mb-8 flex flex-wrap items-end gap-3 rounded-2xl border-2 border-ink bg-white p-4 shadow-stkr-sm"
        >
          <div className="flex flex-col gap-1">
            <label className="font-mono text-[10px] font-bold uppercase tracking-[0.12em] text-mute">
              Mon âge
            </label>
            <input
              type="number"
              name="age"
              min={13}
              max={18}
              defaultValue={sp.age ?? ""}
              placeholder="13-18"
              className="w-24 rounded-xl border-2 border-ink bg-white px-3 py-2 text-sm text-ink focus:outline-none focus-visible:ring-[3px] focus-visible:ring-pink/40"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="font-mono text-[10px] font-bold uppercase tracking-[0.12em] text-mute">
              Durée
            </label>
            <select
              name="duration"
              defaultValue={duration}
              className="rounded-xl border-2 border-ink bg-white px-3 py-2 text-sm text-ink focus:outline-none focus-visible:ring-[3px] focus-visible:ring-pink/40"
            >
              <option value="">Toutes les durées</option>
              {Object.entries(DURATION_LABELS).map(([slug, label]) => (
                <option key={slug} value={slug}>
                  {label}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="font-mono text-[10px] font-bold uppercase tracking-[0.12em] text-mute">
              Ville
            </label>
            <input
              type="text"
              name="city"
              defaultValue={city}
              maxLength={120}
              placeholder="Casablanca, Rabat..."
              className="w-44 rounded-xl border-2 border-ink bg-white px-3 py-2 text-sm text-ink focus:outline-none focus-visible:ring-[3px] focus-visible:ring-pink/40"
            />
          </div>
          <label className="flex items-center gap-2 text-sm text-ink">
            <input
              type="checkbox"
              name="paid"
              value="true"
              defaultChecked={paidOnly}
              className="h-4 w-4 rounded border-2 border-ink bg-white accent-pink"
            />
            Rémunérés uniquement
          </label>
          <label className="flex items-center gap-2 text-sm text-ink">
            <input
              type="checkbox"
              name="remote"
              value="true"
              defaultChecked={remoteOnly}
              className="h-4 w-4 rounded border-2 border-ink bg-white accent-pink"
            />
            À distance
          </label>
          <button
            type="submit"
            className="ml-auto inline-flex items-center gap-2 rounded-xl border-2 border-ink bg-pink px-4 py-2 text-sm font-bold text-ink transition-all hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-stkr-md focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-pink/40"
          >
            <Search className="h-4 w-4" />
            Filtrer
          </button>
        </form>

        {list.length === 0 ? (
          <NivEmpty
            mood="proud"
            title="Aucun stage dispo pour l'instant"
            description="De nouvelles offres seront publiées bientôt par nos partenaires. Reviens vite !"
          />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {list.map((i) => (
              <InternshipCard key={i.id} internship={i} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function InternshipCard({ internship }: { internship: Internship }) {
  const spotsLeft = Math.max(0, internship.spots_total - internship.spots_taken)
  const deadline = internship.application_deadline
    ? new Date(internship.application_deadline)
    : null
  const daysLeft = deadline
    ? Math.max(
        0,
        Math.ceil((deadline.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
      )
    : null
  const stipend = Number(internship.stipend_dh ?? 0)
  const skills = (internship.required_skills ?? []).slice(0, 3)

  return (
    <StickerCard className="gap-0 p-5 sm:p-6">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl border-2 border-ink bg-lime/15">
            <Briefcase className="h-4 w-4 text-ink" />
          </div>
          <div className="flex flex-col gap-0.5">
            <span className="font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-lime">
              Stage
            </span>
            <span className="font-mono text-[10px] font-bold uppercase tracking-[0.12em] text-ink">
              {DURATION_LABELS[internship.duration] ?? internship.duration}
            </span>
          </div>
        </div>
        <div className="flex flex-col items-end gap-1.5">
          {internship.paid ? (
            <span className="inline-flex items-center gap-1 rounded-full border-2 border-ink bg-gold/20 px-2.5 py-0.5 font-mono text-[11px] font-bold tabular-nums text-ink">
              <Coins className="h-3 w-3" aria-hidden />
              {stipend > 0 ? `${stipend.toFixed(0)} DH` : "Rémunéré"}
            </span>
          ) : (
            <StatusBadge variant="neutral" size="sm" icon={false} label="Non rémunéré" />
          )}
          {daysLeft !== null ? (
            <StatusBadge
              variant={daysLeft <= 7 ? "danger" : "neutral"}
              size="sm"
              icon={false}
              label={daysLeft === 0 ? "Dernier jour" : `${daysLeft}j restants`}
            />
          ) : null}
        </div>
      </div>

      <H3 className="font-display text-base font-bold leading-snug text-ink sm:text-lg">
        {internship.title}
      </H3>
      {internship.description ? (
        <p className="mt-1 line-clamp-2 text-sm leading-snug text-mute">
          {internship.description}
        </p>
      ) : null}

      {skills.length > 0 ? (
        <div className="mt-3 flex flex-wrap gap-1">
          {skills.map((s) => (
            <span
              key={s}
              className="rounded-full border-2 border-ink bg-paper-2 px-2 py-0.5 font-mono text-[10px] font-bold text-ink"
            >
              {s}
            </span>
          ))}
        </div>
      ) : null}

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 font-mono text-[11px] font-semibold text-mute">
        <span className="inline-flex items-center gap-1">
          <Users className="h-3 w-3" />
          {internship.age_min}-{internship.age_max} ans
        </span>
        {internship.city || internship.remote_ok ? (
          <span className="inline-flex items-center gap-1">
            <MapPin className="h-3 w-3" />
            {internship.remote_ok && !internship.city
              ? "À distance"
              : internship.remote_ok
                ? `${internship.city} / Distance`
                : internship.city}
          </span>
        ) : null}
        <span className="inline-flex items-center gap-1">
          <MapPin className="h-3 w-3" />
          {spotsLeft > 0
            ? `${spotsLeft} place${spotsLeft > 1 ? "s" : ""} libre${spotsLeft > 1 ? "s" : ""}`
            : "Complet"}
        </span>
        {deadline ? (
          <span className="inline-flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            {deadline.toLocaleDateString("fr-FR", {
              day: "2-digit",
              month: "short",
            })}
          </span>
        ) : null}
      </div>
    </StickerCard>
  )
}
