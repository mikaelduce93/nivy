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
import { H2, H3 } from "@/components/ui/headings"
import { StatusBadge } from "@/components/ui/status-badge"
import { StickerCard } from "@/components/ui/sticker-card"
import { SegmentedProgress } from "@/components/ui/progress"
import { NivEmpty } from "@/components/brand"

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
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border-2 border-ink bg-teal/20">
            <Compass className="h-7 w-7 text-ink" />
          </div>
          <div>
            <p className="eyebrow tracking-[0.16em]">Orientation</p>
            <h1 className="font-display text-4xl font-extrabold tracking-tight">
              Tes <em className="font-semibold italic text-pink">parcours</em>
            </h1>
            <p className="mt-1 text-sm text-mute">
              Choisis un métier qui t'intéresse et avance pas à pas.
            </p>
          </div>
        </header>

        {pathwaysRes.error ? (
          <div className="mb-6 rounded-2xl border-2 border-ink bg-destructive/10 p-4 text-sm text-destructive">
            Impossible de charger les parcours pour le moment.
          </div>
        ) : null}

        {/* Declared / in progress */}
        <section className="mb-10">
          <H2 className="mb-3 font-mono text-[12px] font-bold uppercase tracking-[0.16em] text-mute">
            En exploration
          </H2>
          {declared.length === 0 ? (
            <NivEmpty
              mood="proud"
              title="Pas encore de parcours déclaré"
              description="Choisis ci-dessous celui qui t'attire et commence ton aventure."
            />
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
          <H2 className="mb-3 font-mono text-[12px] font-bold uppercase tracking-[0.16em] text-mute">
            Découvrir
          </H2>
          {undeclared.length === 0 ? (
            <StickerCard className="p-8 text-center text-sm text-mute">
              Tu as déjà déclaré tous les parcours disponibles. Bravo !
            </StickerCard>
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
  const totalMilestones = progress ? Math.max(1, progress.total_milestones) : 1
  const tags = (pathway.recommended_mentor_tags ?? []).slice(0, 3)

  return (
    <StickerCard className="gap-0 p-5 sm:p-6">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div
          className={cn(
            "flex h-10 w-10 items-center justify-center rounded-xl border-2 border-ink",
            isDeclared ? "bg-lime/15" : "bg-teal/15"
          )}
        >
          <Icon className="h-5 w-5 text-ink" />
        </div>
        {isDeclared ? (
          <StatusBadge
            variant="success"
            size="sm"
            icon={CheckCircle2}
            label="Déclaré"
          />
        ) : (
          <StatusBadge
            variant="info"
            size="sm"
            icon={Sparkles}
            label="Découvrir"
          />
        )}
      </div>

      <H3 className="font-display text-lg font-bold leading-snug text-ink">
        {pathway.title}
      </H3>
      {pathway.description ? (
        <p className="mt-1 line-clamp-2 text-sm leading-snug text-mute">
          {pathway.description}
        </p>
      ) : null}

      {tags.length > 0 ? (
        <div className="mt-3 flex flex-wrap gap-1">
          {tags.map((t) => (
            <span
              key={t}
              className="rounded-full border-2 border-ink bg-paper-2 px-2 py-0.5 font-mono text-[10px] font-bold text-ink"
            >
              #{t}
            </span>
          ))}
        </div>
      ) : null}

      {isDeclared && progress ? (
        <div className="mt-4">
          <div className="mb-1.5 flex items-center justify-between text-[10px]">
            <span className="font-mono font-bold uppercase tracking-[0.12em] text-mute">
              Progression
            </span>
            <span className="font-mono font-bold tabular-nums text-gold">
              {progress.milestones_completed} / {progress.total_milestones} XP
            </span>
          </div>
          <SegmentedProgress
            steps={totalMilestones}
            current={Math.min(
              progress.milestones_completed,
              totalMilestones
            )}
          />
        </div>
      ) : null}

      <div className="mt-4 flex items-center justify-between gap-3">
        {isDeclared ? (
          <Link
            href={`/teen/mentors${tags[0] ? `?tag=${encodeURIComponent(tags[0])}` : ""}`}
            className="inline-flex items-center gap-1 rounded-full border-2 border-ink bg-ink px-3 py-1.5 font-mono text-[11px] font-bold text-paper transition-all hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-stkr-pink"
          >
            <GraduationCap className="h-3 w-3" />
            Voir les mentors
          </Link>
        ) : (
          <DeclarePathwayButton slug={pathway.slug} title={pathway.title} />
        )}
        <Link
          href={`/teen/internships${tags[0] ? `?tag=${encodeURIComponent(tags[0])}` : ""}`}
          className="inline-flex items-center gap-1 font-mono text-[11px] font-bold text-mute hover:text-ink"
        >
          <Briefcase className="h-3 w-3" />
          Stages
        </Link>
      </div>
    </StickerCard>
  )
}
