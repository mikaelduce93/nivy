import { getUserRole } from "@/lib/auth/get-user-role"
import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { Button } from "@/components/ui/button"
import { StickerCard } from "@/components/ui/sticker-card"
import { SegmentedProgress } from "@/components/ui/progress"
import { NivEmpty } from "@/components/brand"
import {
  ArrowLeft,
  Plus,
  Clock,
  CheckCircle,
  Coins,
  Sparkles,
} from "lucide-react"
import Link from "next/link"

interface Chore {
  id: string
  title: string
  description: string | null
  reward_dh: number
  reward_xp: number
  recurrence: string
  required_completions: number
  is_active: boolean
  teen_id: string
  created_at: string
}

const RECURRENCE_LABELS: Record<string, string> = {
  one_shot: "Une fois",
  daily: "Quotidienne",
  weekly: "Hebdomadaire",
  monthly: "Mensuelle",
  custom_days: "Jours perso",
}

const recurrenceLabel = (r: string) => RECURRENCE_LABELS[r] ?? r

// Polish-F: return both rows and an error string so the page can surface a
// banner instead of silently rendering "Aucune corvée" on RLS / network
// failure (the previous behaviour masked the bug as an empty state).
async function getChores(parentId: string): Promise<{ rows: Chore[]; error: string | null }> {
  const supabase = await createClient()
  try {
    const { data, error } = await supabase
      .from("parent_chores")
      .select("*")
      .eq("parent_id", parentId)
      .order("created_at", { ascending: false })
    if (error) {
      console.error("Error fetching chores:", error)
      return { rows: [], error: "Impossible de charger les corvées pour le moment." }
    }
    return { rows: (data ?? []) as Chore[], error: null }
  } catch (err) {
    console.error("Error fetching chores (threw):", err)
    return { rows: [], error: "Impossible de charger les corvées pour le moment." }
  }
}

async function getCompletionStats(choreIds: string[]) {
  if (choreIds.length === 0) return new Map<string, { total: number; pending: number; verified: number }>()
  const supabase = await createClient()
  const { data } = await supabase
    .from("parent_chore_completions")
    .select("chore_id, parent_verified, paid_at")
    .in("chore_id", choreIds)

  const stats = new Map<string, { total: number; pending: number; verified: number }>()
  for (const id of choreIds) stats.set(id, { total: 0, pending: 0, verified: 0 })
  for (const row of data ?? []) {
    const s = stats.get(row.chore_id as string)
    if (!s) continue
    s.total += 1
    if (row.parent_verified) s.verified += 1
    else s.pending += 1
  }
  return stats
}

async function getTeensMap(parentId: string) {
  const supabase = await createClient()
  const { data } = await supabase
    .from("parent_teens_overview")
    .select("*")
    .eq("parent_id", parentId)
  const map = new Map<string, { name: string; coins: number }>()
  for (const t of data ?? []) {
    map.set(t.teen_id as string, {
      name: (t.teen_name as string) ?? "Teen",
      coins: t.coins ?? 0,
    })
  }
  return map
}

export default async function ParentChoresPage() {
  const userInfo = await getUserRole()
  if (!userInfo || userInfo.role !== "parent") {
    redirect("/auth/redirect")
  }

  const { rows: chores, error: choresError } = await getChores(userInfo.profileId)
  const stats = await getCompletionStats(chores.map((c) => c.id))
  const teens = await getTeensMap(userInfo.profileId)

  const active = chores.filter((c) => c.is_active)
  const archived = chores.filter((c) => !c.is_active)

  return (
    <div className="min-h-screen bg-paper">
      <div className="container mx-auto px-6 py-32">
        <Button variant="ghost" asChild className="mb-6 text-mute hover:text-ink">
          <Link href="/parent">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Retour au dashboard
          </Link>
        </Button>

        <div className="mb-8 flex items-start justify-between gap-4 flex-wrap">
          <div>
            <p className="eyebrow text-pink">Missions famille</p>
            <h1 className="mt-2 font-display text-4xl font-extrabold tracking-tight text-ink">
              Les <em className="font-semibold italic text-pink">corvées</em> du crew
            </h1>
            <p className="mt-2 text-mute">
              Crée des missions familiales avec récompense (DH + XP) pour tes teens.
            </p>
          </div>
          <Button asChild>
            <Link href="/parent/chores/new">
              <Plus className="h-4 w-4 mr-2" />
              Nouvelle corvée
            </Link>
          </Button>
        </div>

        {choresError && (
          <div
            role="alert"
            className="mb-6 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive"
          >
            {choresError}
          </div>
        )}

        {chores.length === 0 ? (
          <NivEmpty
            mood="calm"
            title="Aucune corvée pour l'instant"
            description="Crée ta première mission, je motive ton ado à la réaliser."
            action={
              <Button asChild>
                <Link href="/parent/chores/new">
                  <Plus className="h-4 w-4 mr-2" />
                  Nouvelle corvée
                </Link>
              </Button>
            }
          />
        ) : (
          <div className="space-y-8">
            <ChoreList
              title="Corvées actives"
              chores={active}
              stats={stats}
              teens={teens}
              emptyMessage="Aucune corvée active."
            />
            {archived.length > 0 && (
              <ChoreList
                title="Archivées"
                chores={archived}
                stats={stats}
                teens={teens}
                emptyMessage=""
                muted
              />
            )}
          </div>
        )}
      </div>
    </div>
  )
}

function ChoreList({
  title,
  chores,
  stats,
  teens,
  emptyMessage,
  muted,
}: {
  title: string
  chores: Chore[]
  stats: Map<string, { total: number; pending: number; verified: number }>
  teens: Map<string, { name: string; coins: number }>
  emptyMessage: string
  muted?: boolean
}) {
  return (
    <section>
      <h2 className={`font-display text-xl font-extrabold mb-4 ${muted ? "text-mute" : "text-ink"}`}>{title}</h2>
      {chores.length === 0 ? (
        <p className="text-sm text-mute">{emptyMessage}</p>
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {chores.map((c) => {
            const s = stats.get(c.id) ?? { total: 0, pending: 0, verified: 0 }
            const teen = teens.get(c.teen_id)
            return (
              <StickerCard key={c.id} variant="hover" className="p-5">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-display text-lg font-extrabold text-ink">{c.title}</h3>
                  {!c.is_active && (
                    <span className="font-mono text-[11px] uppercase tracking-wide px-2 py-1 rounded-md border-2 border-ink text-mute">
                      Archivée
                    </span>
                  )}
                </div>
                <div className="mt-3 space-y-3">
                  {c.description && (
                    <p className="text-sm text-mute">{c.description}</p>
                  )}
                  <div className="flex flex-wrap gap-2 text-xs">
                    <span className="px-2 py-1 rounded-md border-2 border-ink text-coral font-mono flex items-center gap-1">
                      <Coins className="h-3 w-3" /> ⊙ {c.reward_dh} DH
                    </span>
                    <span className="px-2 py-1 rounded-md border-2 border-ink text-gold font-mono flex items-center gap-1">
                      <Sparkles className="h-3 w-3" /> {c.reward_xp} XP
                    </span>
                    <span className="px-2 py-1 rounded-md border-2 border-ink text-ink font-mono uppercase tracking-wide">
                      {recurrenceLabel(c.recurrence)}
                    </span>
                  </div>
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs font-mono">
                      <span className="text-mute uppercase tracking-wide">Validations</span>
                      <span className="text-ink">{s.verified}/{c.required_completions}</span>
                    </div>
                    <SegmentedProgress steps={c.required_completions} current={s.verified} />
                  </div>
                  <div className="flex items-center justify-between pt-2 border-t-2 border-ink/10">
                    <div className="text-xs text-mute">
                      Pour <span className="text-ink-2 font-medium">{teen?.name ?? "Teen"}</span>
                    </div>
                    <div className="flex items-center gap-3 text-xs">
                      {s.pending > 0 && (
                        <span className="text-gold font-mono flex items-center gap-1">
                          <Clock className="h-3 w-3" /> {s.pending} en attente
                        </span>
                      )}
                      {s.verified > 0 && (
                        <span className="text-lime font-mono flex items-center gap-1">
                          <CheckCircle className="h-3 w-3" /> {s.verified}
                        </span>
                      )}
                    </div>
                  </div>
                  <Button asChild variant="outline" className="w-full">
                    <Link href={`/parent/chores/${c.id}`}>Détails</Link>
                  </Button>
                </div>
              </StickerCard>
            )
          })}
        </div>
      )}
    </section>
  )
}
