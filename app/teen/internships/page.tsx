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
  Building2,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { EmptyState } from "@/components/ui/states/empty-state"
import { H1, H3 } from "@/components/ui/headings"
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
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-6 py-32 max-w-5xl">
        <Link
          href="/teen"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6"
        >
          <ArrowLeft className="h-4 w-4" />
          Retour
        </Link>

        <header className="mb-8">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-success-soft to-info-soft flex items-center justify-center">
              <Briefcase className="h-6 w-6 text-primary-foreground" />
            </div>
            <div>
              <H1 className="uppercase">Stages</H1>
              <p className="text-muted-foreground text-sm font-medium">
                Decouvre des stages chez nos partenaires verifies.
              </p>
            </div>
          </div>
        </header>

        {error ? (
          <div className="mb-6 rounded-2xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
            Impossible de charger les stages pour le moment.
          </div>
        ) : null}

        {/* Filters */}
        <form
          method="GET"
          className="mb-8 rounded-3xl border border-border bg-card/40 backdrop-blur-md p-4 flex flex-wrap gap-3 items-end"
        >
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">
              Mon age
            </label>
            <input
              type="number"
              name="age"
              min={13}
              max={18}
              defaultValue={sp.age ?? ""}
              placeholder="13-18"
              className="rounded-xl bg-card border border-border px-3 py-2 text-sm text-foreground w-24 focus:outline-none focus:ring-2 focus:ring-success/40"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">
              Duree
            </label>
            <select
              name="duration"
              defaultValue={duration}
              className="rounded-xl bg-card border border-border px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-success/40"
            >
              <option value="">Toutes durees</option>
              {Object.entries(DURATION_LABELS).map(([slug, label]) => (
                <option key={slug} value={slug}>
                  {label}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">
              Ville
            </label>
            <input
              type="text"
              name="city"
              defaultValue={city}
              maxLength={120}
              placeholder="Casablanca, Rabat..."
              className="rounded-xl bg-card border border-border px-3 py-2 text-sm text-foreground w-44 focus:outline-none focus:ring-2 focus:ring-success/40"
            />
          </div>
          <label className="text-sm flex items-center gap-2 text-foreground/80">
            <input
              type="checkbox"
              name="paid"
              value="true"
              defaultChecked={paidOnly}
              className="h-4 w-4 rounded bg-card border border-border accent-success"
            />
            Remuneres uniquement
          </label>
          <label className="text-sm flex items-center gap-2 text-foreground/80">
            <input
              type="checkbox"
              name="remote"
              value="true"
              defaultChecked={remoteOnly}
              className="h-4 w-4 rounded bg-card border border-border accent-success"
            />
            A distance
          </label>
          <button
            type="submit"
            className="ml-auto inline-flex items-center gap-2 rounded-full bg-foreground px-4 py-2 text-sm font-black text-background hover:bg-foreground/90"
          >
            <Search className="h-4 w-4" />
            Filtrer
          </button>
        </form>

        {list.length === 0 ? (
          <EmptyState
            icon={Briefcase}
            title="Aucun stage disponible"
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
    <div
      className={cn(
        "group relative overflow-hidden rounded-3xl border border-border backdrop-blur-md p-5 sm:p-6",
        "bg-gradient-to-br from-success-soft/10 via-success-soft/[0.03] to-transparent",
        "hover:border-success/30 hover:shadow-2xl hover:shadow-background/40 transition-all"
      )}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute -right-12 -top-12 h-36 w-36 rounded-full blur-3xl bg-success-soft/40 opacity-50"
      />
      <div className="relative">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-xl bg-success-soft/15 flex items-center justify-center">
              <Briefcase className="h-4 w-4 text-success" />
            </div>
            <div className="flex flex-col gap-0.5">
              <span className="text-[10px] font-black uppercase tracking-[0.18em] text-success">
                Stage
              </span>
              <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider text-foreground/80">
                {DURATION_LABELS[internship.duration] ?? internship.duration}
              </span>
            </div>
          </div>
          <div className="flex flex-col items-end gap-1">
            {internship.paid ? (
              <StatusBadge
                variant="warning"
                size="sm"
                icon={Coins}
                label={stipend > 0 ? `${stipend.toFixed(0)} DH` : "Remunere"}
              />
            ) : (
              <StatusBadge variant="neutral" size="sm" icon={false} label="Non remunere" />
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

        <H3 className="text-base font-black leading-snug text-foreground sm:text-lg">
          {internship.title}
        </H3>
        {internship.description ? (
          <p className="mt-1 line-clamp-2 text-sm leading-snug text-muted-foreground">
            {internship.description}
          </p>
        ) : null}

        {skills.length > 0 ? (
          <div className="mt-3 flex flex-wrap gap-1">
            {skills.map((s) => (
              <span
                key={s}
                className="rounded-full bg-card/40 border border-border px-2 py-0.5 text-[10px] font-bold text-foreground/80"
              >
                {s}
              </span>
            ))}
          </div>
        ) : null}

        <div className="mt-4 flex items-center justify-between gap-3 text-[11px] font-semibold text-muted-foreground flex-wrap">
          <span className="inline-flex items-center gap-1">
            <Users className="h-3 w-3" />
            {internship.age_min}-{internship.age_max} ans
          </span>
          {internship.city || internship.remote_ok ? (
            <span className="inline-flex items-center gap-1">
              <MapPin className="h-3 w-3" />
              {internship.remote_ok && !internship.city
                ? "A distance"
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

        <div className="mt-4 flex justify-end">
          <span
            className={cn(
              "inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-[11px] font-black",
              spotsLeft > 0
                ? "bg-foreground text-background"
                : "bg-muted text-muted-foreground cursor-not-allowed"
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
