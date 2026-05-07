/**
 * /teen/pathways — Career pathways hub (V1.1 P2.5).
 *
 * Lists active career_pathways + the teen's per-pathway progress. Declaring
 * a pathway calls POST /api/teen/pathways/:slug/declare which upserts
 * teen_pathway_progress.
 */

import { getUserRole } from "@/lib/auth/get-user-role"
import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import Link from "next/link"
import {
  ArrowLeft,
  Compass,
  GraduationCap,
  Briefcase,
  Stethoscope,
  Wrench,
  Palette,
  Scale,
  Sparkles,
  CheckCircle2,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { DeclarePathwayButton } from "./declare-pathway-button"

export const dynamic = "force-dynamic"

interface Pathway {
  id: string
  slug: string
  title: string
  description: string | null
  icon: string | null
  category: string | null
  recommended_mentor_tags: string[] | null
}

interface ProgressRow {
  pathway_id: string
  milestones_completed: number
  total_milestones: number
  declared_interest_at: string
  last_active_at: string | null
}

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  stethoscope: Stethoscope,
  wrench: Wrench,
  palette: Palette,
  briefcase: Briefcase,
  scale: Scale,
}

export default async function TeenPathwaysPage() {
  const userInfo = await getUserRole()
  if (!userInfo) redirect("/auth/login")
  if (userInfo.role !== "teen") redirect("/auth/redirect")

  const supabase = await createClient()
  const [pathwaysRes, progressRes] = await Promise.all([
    supabase
      .from("career_pathways")
      .select(
        "id, slug, title, description, icon, category, recommended_mentor_tags"
      )
      .eq("is_active", true)
      .order("title"),
    supabase
      .from("teen_pathway_progress")
      .select(
        "pathway_id, milestones_completed, total_milestones, declared_interest_at, last_active_at"
      )
      .eq("teen_id", userInfo.profileId),
  ])

  const pathways = (pathwaysRes.data ?? []) as Pathway[]
  const progress = (progressRes.data ?? []) as ProgressRow[]
  const progressById = new Map(progress.map((p) => [p.pathway_id, p]))

  const declared = pathways.filter((p) => progressById.has(p.id))
  const undeclared = pathways.filter((p) => !progressById.has(p.id))

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
            <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-cyan-500 to-emerald-500 flex items-center justify-center">
              <Compass className="h-6 w-6 text-black" />
            </div>
            <div>
              <h1 className="text-3xl font-black tracking-tighter uppercase italic text-white">
                Mes parcours
              </h1>
              <p className="text-zinc-500 text-sm font-medium">
                Choisis un metier qui t'interesse et avance pas a pas.
              </p>
            </div>
          </div>
        </header>

        {pathwaysRes.error ? (
          <div className="mb-6 rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">
            Impossible de charger les parcours pour le moment.
          </div>
        ) : null}

        {/* Declared / in progress */}
        <section className="mb-10">
          <h2 className="text-sm font-black uppercase tracking-wider text-zinc-300 mb-3">
            En exploration
          </h2>
          {declared.length === 0 ? (
            <div className="rounded-3xl border border-white/10 bg-white/[0.02] backdrop-blur-md p-8 text-center">
              <div className="mx-auto mb-3 h-12 w-12 rounded-2xl bg-cyan-500/15 flex items-center justify-center">
                <Compass className="h-6 w-6 text-cyan-300" />
              </div>
              <h3 className="text-base font-black text-white">
                Tu n'as pas encore declare de parcours
              </h3>
              <p className="mt-1 text-sm text-zinc-400">
                Choisis ci-dessous celui qui t'attire et commence ton aventure.
              </p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {declared.map((p) => (
                <PathwayCard
                  key={p.id}
                  pathway={p}
                  progress={progressById.get(p.id) ?? null}
                />
              ))}
            </div>
          )}
        </section>

        {/* Catalogue */}
        <section>
          <h2 className="text-sm font-black uppercase tracking-wider text-zinc-300 mb-3">
            Decouvrir
          </h2>
          {undeclared.length === 0 ? (
            <div className="rounded-3xl border border-white/10 bg-white/[0.02] backdrop-blur-md p-8 text-center text-sm text-zinc-400">
              Tu as deja declare tous les parcours disponibles. Bravo !
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {undeclared.map((p) => (
                <PathwayCard key={p.id} pathway={p} progress={null} />
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  )
}

function PathwayCard({
  pathway,
  progress,
}: {
  pathway: Pathway
  progress: ProgressRow | null
}) {
  const Icon = ICON_MAP[pathway.icon ?? ""] ?? GraduationCap
  const isDeclared = progress !== null
  const pct = progress
    ? Math.min(
        100,
        Math.round(
          (progress.milestones_completed / Math.max(1, progress.total_milestones)) *
            100
        )
      )
    : 0
  const tags = (pathway.recommended_mentor_tags ?? []).slice(0, 3)

  return (
    <div
      className={cn(
        "group relative overflow-hidden rounded-3xl border backdrop-blur-md p-5 sm:p-6 transition-all",
        isDeclared
          ? "border-emerald-400/20 bg-gradient-to-br from-emerald-500/10 via-emerald-500/[0.03] to-transparent"
          : "border-white/10 bg-gradient-to-br from-cyan-500/10 via-cyan-500/[0.03] to-transparent",
        "hover:border-white/20 hover:shadow-2xl hover:shadow-black/40"
      )}
    >
      <div
        aria-hidden
        className={cn(
          "pointer-events-none absolute -right-12 -top-12 h-36 w-36 rounded-full blur-3xl opacity-50",
          isDeclared ? "bg-emerald-500/40" : "bg-cyan-500/40"
        )}
      />
      <div className="relative">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div
            className={cn(
              "h-10 w-10 rounded-xl flex items-center justify-center",
              isDeclared ? "bg-emerald-500/15" : "bg-cyan-500/15"
            )}
          >
            <Icon
              className={cn(
                "h-5 w-5",
                isDeclared ? "text-emerald-300" : "text-cyan-300"
              )}
            />
          </div>
          {isDeclared ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-emerald-300 ring-1 ring-emerald-400/30">
              <CheckCircle2 className="h-3 w-3" />
              Declare
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 rounded-full bg-cyan-500/15 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-cyan-300 ring-1 ring-cyan-400/30">
              <Sparkles className="h-3 w-3" />
              Decouvrir
            </span>
          )}
        </div>

        <h3 className="text-lg font-black leading-snug text-white">
          {pathway.title}
        </h3>
        {pathway.description ? (
          <p className="mt-1 line-clamp-2 text-sm leading-snug text-zinc-400">
            {pathway.description}
          </p>
        ) : null}

        {tags.length > 0 ? (
          <div className="mt-3 flex flex-wrap gap-1">
            {tags.map((t) => (
              <span
                key={t}
                className="rounded-full bg-white/[0.04] border border-white/10 px-2 py-0.5 text-[10px] font-bold text-zinc-300"
              >
                #{t}
              </span>
            ))}
          </div>
        ) : null}

        {isDeclared && progress ? (
          <div className="mt-4">
            <div className="mb-1 flex items-center justify-between text-[10px]">
              <span className="font-bold uppercase tracking-wider text-zinc-500">
                Progression
              </span>
              <span className="font-black tabular-nums text-zinc-300">
                {progress.milestones_completed} / {progress.total_milestones}
                <span className="ml-1 text-zinc-500">({pct}%)</span>
              </span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-white/5">
              <div
                className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-cyan-400 transition-[width] duration-500 ease-out"
                style={{ width: `${pct}%` }}
                aria-hidden
              />
            </div>
          </div>
        ) : null}

        <div className="mt-4 flex items-center justify-between gap-3">
          {isDeclared ? (
            <Link
              href={`/teen/mentors${tags[0] ? `?tag=${encodeURIComponent(tags[0])}` : ""}`}
              className="inline-flex items-center gap-1 rounded-full bg-white px-3 py-1.5 text-[11px] font-black text-black hover:bg-white/90"
            >
              <GraduationCap className="h-3 w-3" />
              Voir les mentors
            </Link>
          ) : (
            <DeclarePathwayButton slug={pathway.slug} title={pathway.title} />
          )}
          <Link
            href={`/teen/internships${tags[0] ? `?tag=${encodeURIComponent(tags[0])}` : ""}`}
            className="inline-flex items-center gap-1 text-[11px] font-black text-zinc-400 hover:text-white"
          >
            <Briefcase className="h-3 w-3" />
            Stages
          </Link>
        </div>
      </div>
    </div>
  )
}
