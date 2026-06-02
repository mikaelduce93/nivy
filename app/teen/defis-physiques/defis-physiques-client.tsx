"use client"

import { useState } from "react"
import { Dumbbell, Zap, Trophy, Check, Target, Heart, Star } from "lucide-react"
import { StickerCard } from "@/components/ui/sticker-card"
import { SegmentedProgress } from "@/components/ui/progress"
import { StickerTabs } from "@/components/brand/sticker-tab"
import { Niv, NivCoach, NivEmpty, NivCelebration } from "@/components/brand"
import { DefiCard } from "@/components/teen/defi-card"
import { PhysicalChallengeActions } from "@/components/teen/physical-challenge-actions"

export type ApiChallenge = {
  id: string
  // The DB column is `name` (not `title`). Kept both during migration so the
  // server mapping in page.tsx can pass either; we prefer `name` here.
  name?: string
  title?: string
  description: string | null
  challenge_type: string
  sport_category: string | null
  xp_reward: number
  objective_value: number
  duration_days?: number | null
  difficulty?: string | null
  icon?: string | null
  image_url?: string | null
  // Canonical interest_taxonomy tags (e.g. "lifestyle_fitness",
  // "sport_running"). Backfilled by migration 072 — every active row
  // is guaranteed ≥1 tag. Used both for personalization scoring on the
  // server and for the tag-chip strip rendered above each card here.
  tags?: string[] | null
  is_started: boolean
  is_completed: boolean
  pending_validation: boolean
  progress: {
    id: string
    progress_percent: number
    current_value: number
    completed: boolean
    validated: boolean
  } | null
}

export type ApiStats = {
  total: number
  started: number
  completed: number
  totalXpEarned: number
}

// CATEGORIES is a UI catalogue (filter chips), not a data array
const CATEGORIES = [
  { value: "all", label: "Tous", icon: <Dumbbell /> },
  { value: "strength", label: "Force", icon: <Target /> },
  { value: "cardio", label: "Cardio", icon: <Heart /> },
  { value: "core", label: "Core", icon: <Star /> },
]

// Human-readable label for canonical interest_taxonomy tags. Keeps the
// closed taxonomy on the server while letting the UI show readable FR
// chips. Anything not in the map falls back to a sensible derived label
// (e.g. `sport_basketball` -> "basketball").
const TAG_LABELS_FR: Record<string, string> = {
  lifestyle_fitness: "Fitness",
  lifestyle_wellness: "Bien-être",
  sport_running: "Course",
  sport_football: "Football",
  sport_basketball: "Basket",
  sport_swimming: "Natation",
  sport_cycling: "Vélo",
  sport_martial_arts: "Arts martiaux",
}

function tagToLabel(tag: string): string {
  if (TAG_LABELS_FR[tag]) return TAG_LABELS_FR[tag]
  // strip the `sport_` / `lifestyle_` prefix and capitalise.
  const rest = tag.replace(/^(sport_|lifestyle_)/, "").replace(/_/g, " ")
  return rest.charAt(0).toUpperCase() + rest.slice(1)
}

interface Props {
  teenId: string
  challenges: ApiChallenge[]
  stats: ApiStats
}

/**
 * Map an API physical challenge to the unified <DefiCard /> contract.
 * - title    ← challenge.name (DB column) || challenge.title (legacy alias)
 * - target   ← challenge.objective_value (DB schema; no `target_count` column exists)
 * - current  ← challenge.progress.current_value (DB schema; no `current_count` column)
 * - status   ← is_completed ? "completed" : "active"
 * - imageUrl ← challenge.image_url (added by migration 066, served from the
 *              public `physical-challenge-images` bucket — undefined when null)
 *
 * The icon column may store an emoji ("💪") or non-lucide name, so we leave
 * iconName unset and rely on the variant's default Dumbbell icon.
 */
function challengeToDefiProps(challenge: ApiChallenge) {
  const title = challenge.name ?? challenge.title ?? ""
  const target = Math.max(0, challenge.objective_value || 0)
  const current = Math.max(
    0,
    challenge.progress?.current_value ?? 0,
  )
  return {
    title,
    description: challenge.description ?? undefined,
    imageUrl: challenge.image_url ?? undefined,
    xpReward: challenge.xp_reward || 0,
    status: (challenge.is_completed ? "completed" : "active") as
      | "completed"
      | "active",
    progress: target > 0 ? { current, target } : undefined,
  }
}

export function DefisPhysiquesClient({ teenId, challenges, stats }: Props) {
  const [category, setCategory] = useState("all")
  const loading = false

  const dailyChallenges = challenges.filter((c) => c.challenge_type === "daily")
  const programs = challenges.filter((c) => c.challenge_type !== "daily")

  const filteredChallenges =
    category === "all" ? dailyChallenges : dailyChallenges.filter((c) => c.sport_category === category)

  const completedToday = dailyChallenges.filter((c) => c.is_completed).length
  const totalToday = dailyChallenges.length
  const allDoneToday = totalToday > 0 && completedToday === totalToday

  // Seules les métriques réellement câblées via getSportChallenges.
  const totalCompleted = stats.completed
  const totalXPEarned = stats.totalXpEarned

  return (
    <div className="min-h-screen space-y-8 pb-32 pt-6">
      {/* Header éditorial */}
      <header className="space-y-6">
        <div className="flex items-center gap-4">
          <Niv mood="hype" size={72} className="shrink-0" />
          <div>
            <p className="eyebrow tracking-[0.16em]">Bouge · Défis</p>
            <h1 className="font-display text-4xl font-extrabold tracking-tight">
              Bouge, gagne des <em className="font-semibold italic text-pink">XP</em>
            </h1>
            <p className="text-sm text-mute">Relève les défis physiques et grimpe en XP.</p>
          </div>
        </div>

        <NivCoach mood="hype" message="Un défi à la fois. Termine ta journée et reviens demain pour la suite !" />

        {/* Stats réelles — pills sticker mono */}
        <div className="grid grid-cols-3 gap-3">
          <StickerCard className="items-center gap-1 p-4 text-center">
            <span className="flex items-center gap-1.5 font-display text-2xl font-extrabold tabular-nums text-pink">
              <Trophy className="size-4 text-pink" aria-hidden="true" />
              {totalCompleted}
            </span>
            <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-mute">Défis réussis</span>
          </StickerCard>

          <StickerCard className="items-center gap-1 p-4 text-center">
            <span className="flex items-center gap-1.5 font-display text-xl sm:text-2xl font-extrabold tabular-nums text-gold">
              <Zap className="size-4 text-gold" aria-hidden="true" />
              {totalXPEarned.toLocaleString()}
            </span>
            <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-mute">XP total</span>
          </StickerCard>

          <StickerCard className="items-center gap-1 p-4 text-center">
            <span className="flex items-center gap-1.5 font-display text-2xl font-extrabold tabular-nums text-teal">
              <Check className="size-4 text-teal" aria-hidden="true" />
              {completedToday}/{totalToday}
            </span>
            <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-mute">Aujourd'hui</span>
          </StickerCard>
        </div>
      </header>

      {/* Progression du jour */}
      {allDoneToday ? (
        <NivCelebration
          tone="lime"
          palette="levelup"
          title="Journée complète"
          value={`${completedToday}/${totalToday}`}
          caption="Bravo ! Tu as terminé tous les défis du jour."
        />
      ) : (
        <StickerCard className="gap-4 p-6">
          <div className="flex items-center justify-between">
            <p className="eyebrow tracking-[0.16em]">Progression du jour</p>
            <span className="font-mono text-sm font-bold text-pink tabular-nums">
              {completedToday}/{totalToday}
            </span>
          </div>
          <SegmentedProgress steps={Math.max(1, totalToday)} current={completedToday} size="md" />
          <p className="text-sm text-mute">
            {totalToday > 0
              ? `${Math.max(0, totalToday - completedToday)} défis restants pour compléter ta journée`
              : "Aucun défi du jour pour l'instant."}
          </p>
        </StickerCard>
      )}

      {/* Filtres */}
      <StickerTabs
        ariaLabel="Catégories de défis"
        value={category}
        onValueChange={setCategory}
        tabs={CATEGORIES}
      />

      {/* Défis du jour — unified <DefiCard type="physical" /> */}
      <section className="space-y-4">
        <p className="eyebrow tracking-[0.16em]">Défis du jour</p>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {filteredChallenges.map((challenge) => {
            const props = challengeToDefiProps(challenge)
            const tags = (challenge.tags ?? []).slice(0, 3)
            return (
              <div key={challenge.id} className="space-y-2">
                {tags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 px-1" aria-label="Tags du défi">
                    {tags.map((t) => (
                      <span
                        key={t}
                        className="rounded-full border-2 border-ink bg-paper-2 px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wider text-ink"
                      >
                        {tagToLabel(t)}
                      </span>
                    ))}
                  </div>
                )}
                <DefiCard type="physical" {...props} />
                <PhysicalChallengeActions
                  teenId={teenId}
                  challengeId={challenge.id}
                  progressId={challenge.progress?.id ?? null}
                  isStarted={challenge.is_started}
                  isCompleted={challenge.is_completed}
                  pendingValidation={challenge.pending_validation}
                  currentValue={challenge.progress?.current_value ?? 0}
                  objectiveValue={challenge.objective_value}
                />
              </div>
            )
          })}
        </div>
      </section>

      {/* Programmes — unified <DefiCard type="physical" /> */}
      <section className="space-y-4">
        <p className="eyebrow tracking-[0.16em]">Programmes</p>

        {programs.length === 0 && !loading && (
          <NivEmpty
            mood="calm"
            title="Pas de programme pour l'instant"
            description="Aucun programme physique disponible. Reviens bientôt pour de nouveaux défis !"
          />
        )}

        <div className="space-y-4">
          {programs.map((program) => {
            const props = challengeToDefiProps(program)
            const tags = (program.tags ?? []).slice(0, 3)
            return (
              <div key={program.id} className="space-y-2">
                {tags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 px-1" aria-label="Tags du programme">
                    {tags.map((t) => (
                      <span
                        key={t}
                        className="rounded-full border-2 border-ink bg-paper-2 px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wider text-ink"
                      >
                        {tagToLabel(t)}
                      </span>
                    ))}
                  </div>
                )}
                <DefiCard type="physical" {...props} />
                <PhysicalChallengeActions
                  teenId={teenId}
                  challengeId={program.id}
                  progressId={program.progress?.id ?? null}
                  isStarted={program.is_started}
                  isCompleted={program.is_completed}
                  pendingValidation={program.pending_validation}
                  currentValue={program.progress?.current_value ?? 0}
                  objectiveValue={program.objective_value}
                />
              </div>
            )
          })}
        </div>
      </section>
    </div>
  )
}
