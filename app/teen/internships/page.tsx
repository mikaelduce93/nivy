/**
 * /teen/internships — Browse internships (V1.1 P2.5).
 *
 * Filters: ?age=15&duration=summer&paid=true.
 * NOTE: the spec mentions city/remote filters but migration 059 ships
 *       neither column today, so they're not exposed. Add when schema lands.
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
  Building2,
} from "lucide-react"
import { cn } from "@/lib/utils"

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
}

const DURATION_LABELS: Record<string, string> = {
  "1_day": "1 jour",
  "1_week": "1 semaine",
  "2_weeks": "2 semaines",
  summer: "Ete",
  part_time_school_year: "Annee scolaire",
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

  const supabase = await createClient()
  let q = supabase
    .from("internships")
    .select(
      "id, partner_id, title, description, duration, age_min, age_max, application_deadline, spots_total, spots_taken, paid, stipend_dh, required_skills, status"
    )
    .eq("status", "open")
    .order("application_deadline", { ascending: true, nullsFirst: false })
    .limit(50)

  if (age && Number.isFinite(age)) {
    q = q.lte("age_min", age).gte("age_max", age)
  }
  if (duration) q = q.eq("duration", duration)
  if (paidOnly) q = q.eq("paid", true)

  const { data, error } = await q
  const list = (data ?? []) as Internship[]

  return (
    <div className="min-h-screen bg-zinc-950">
      <div className="container mx-auto px-6 py-32 max-w-5xl">
        <Link
          href="/teen"
          className="inline-flex items-center gap-2 text-sm text-zinc-400 hover:text-white mb-6"
        >
          <ArrowLeft className="h-4 w-4" />
          Retour
        </Link>

        <header className="mb-8">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-emerald-500 to-cyan-500 flex items-center justify-center">
              <Briefcase className="h-6 w-6 text-black" />
            </div>
            <div>
              <h1 className="text-3xl font-black tracking-tighter uppercase italic text-white">
                Stages
              </h1>
              <p className="text-zinc-500 text-sm font-medium">
                Decouvre des stages chez nos partenaires verifies.
              </p>
            </div>
          </div>
        </header>

        {error ? (
          <div className="mb-6 rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">
            Impossible de charger les stages pour le moment.
          </div>
        ) : null}

        {/* Filters */}
        <form
          method="GET"
          className="mb-8 rounded-3xl border border-white/10 bg-white/[0.02] backdrop-blur-md p-4 flex flex-wrap gap-3 items-end"
        >
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-black uppercase tracking-wider text-zinc-500">
              Mon age
            </label>
            <input
              type="number"
              name="age"
              min={13}
              max={18}
              defaultValue={sp.age ?? ""}
              placeholder="13-18"
              className="rounded-xl bg-zinc-900 border border-white/10 px-3 py-2 text-sm text-white w-24 focus:outline-none focus:ring-2 focus:ring-emerald-400/40"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-black uppercase tracking-wider text-zinc-500">
              Duree
            </label>
            <select
              name="duration"
              defaultValue={duration}
              className="rounded-xl bg-zinc-900 border border-white/10 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-400/40"
            >
              <option value="">Toutes durees</option>
              {Object.entries(DURATION_LABELS).map(([slug, label]) => (
                <option key={slug} value={slug}>
                  {label}
                </option>
              ))}
            </select>
          </div>
          <label className="text-sm flex items-center gap-2 text-zinc-300">
            <input
              type="checkbox"
              name="paid"
              value="true"
              defaultChecked={paidOnly}
              className="h-4 w-4 rounded bg-zinc-900 border border-white/10 accent-emerald-500"
            />
            Remuneres uniquement
          </label>
          <button
            type="submit"
            className="ml-auto inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-black text-black hover:bg-white/90"
          >
            <Search className="h-4 w-4" />
            Filtrer
          </button>
        </form>

        {list.length === 0 ? (
          <div className="rounded-3xl border border-white/10 bg-white/[0.02] backdrop-blur-md p-12 text-center">
            <div className="mx-auto mb-4 h-14 w-14 rounded-2xl bg-emerald-500/15 flex items-center justify-center">
              <Briefcase className="h-7 w-7 text-emerald-300" />
            </div>
            <h3 className="text-lg font-black text-white">
              Aucun stage disponible pour le moment
            </h3>
            <p className="mt-1 text-sm text-zinc-400">
              De nouvelles offres seront publiees bientot par nos partenaires.
            </p>
          </div>
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
    <div
      className={cn(
        "group relative overflow-hidden rounded-3xl border border-white/10 backdrop-blur-md p-5 sm:p-6",
        "bg-gradient-to-br from-emerald-500/10 via-emerald-500/[0.03] to-transparent",
        "hover:border-white/20 hover:shadow-2xl hover:shadow-black/40 transition-all"
      )}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute -right-12 -top-12 h-36 w-36 rounded-full blur-3xl bg-emerald-500/40 opacity-50"
      />
      <div className="relative">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-xl bg-emerald-500/15 flex items-center justify-center">
              <Briefcase className="h-4 w-4 text-emerald-300" />
            </div>
            <div className="flex flex-col gap-0.5">
              <span className="text-[10px] font-black uppercase tracking-[0.18em] text-emerald-300">
                Stage
              </span>
              <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider text-zinc-300">
                {DURATION_LABELS[internship.duration] ?? internship.duration}
              </span>
            </div>
          </div>
          <div className="flex flex-col items-end gap-1">
            {internship.paid ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-2 py-0.5 text-[11px] font-black tabular-nums text-amber-300 ring-1 ring-amber-400/30">
                <Coins className="h-3 w-3" />
                {stipend > 0 ? `${stipend.toFixed(0)} DH` : "Remunere"}
              </span>
            ) : (
              <span className="rounded-full bg-zinc-700/40 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-zinc-300 ring-1 ring-zinc-500/30">
                Non remunere
              </span>
            )}
            {daysLeft !== null ? (
              <span
                className={cn(
                  "rounded-full px-2 py-0.5 text-[10px] font-black uppercase tracking-wider ring-1",
                  daysLeft <= 7
                    ? "bg-red-500/15 text-red-300 ring-red-400/30"
                    : "bg-zinc-700/40 text-zinc-300 ring-zinc-500/30"
                )}
              >
                {daysLeft === 0 ? "Dernier jour" : `${daysLeft}j restants`}
              </span>
            ) : null}
          </div>
        </div>

        <h3 className="text-base font-black leading-snug text-white sm:text-lg">
          {internship.title}
        </h3>
        {internship.description ? (
          <p className="mt-1 line-clamp-2 text-sm leading-snug text-zinc-400">
            {internship.description}
          </p>
        ) : null}

        {skills.length > 0 ? (
          <div className="mt-3 flex flex-wrap gap-1">
            {skills.map((s) => (
              <span
                key={s}
                className="rounded-full bg-white/[0.04] border border-white/10 px-2 py-0.5 text-[10px] font-bold text-zinc-300"
              >
                {s}
              </span>
            ))}
          </div>
        ) : null}

        <div className="mt-4 flex items-center justify-between gap-3 text-[11px] font-semibold text-zinc-400 flex-wrap">
          <span className="inline-flex items-center gap-1">
            <Users className="h-3 w-3" />
            {internship.age_min}-{internship.age_max} ans
          </span>
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

        <div className="mt-4 flex justify-end">
          <span
            className={cn(
              "inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-[11px] font-black",
              spotsLeft > 0
                ? "bg-white text-black"
                : "bg-zinc-800 text-zinc-500 cursor-not-allowed"
            )}
            aria-disabled={spotsLeft === 0}
          >
            <Building2 className="h-3 w-3" />
            {spotsLeft > 0 ? "Voir les details" : "Complet"}
          </span>
        </div>
      </div>
    </div>
  )
}
