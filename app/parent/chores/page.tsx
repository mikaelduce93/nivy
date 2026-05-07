import { getUserRole } from "@/lib/auth/get-user-role"
import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  ArrowLeft,
  ListChecks,
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

async function getChores(parentId: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("parent_chores")
    .select("*")
    .eq("parent_id", parentId)
    .order("created_at", { ascending: false })
  if (error) {
    console.error("Error fetching chores:", error)
    return []
  }
  return (data ?? []) as Chore[]
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
      coins: (t.total_coins as number) ?? 0,
    })
  }
  return map
}

export default async function ParentChoresPage() {
  const userInfo = await getUserRole()
  if (!userInfo || userInfo.role !== "parent") {
    redirect("/auth/redirect")
  }

  const chores = await getChores(userInfo.profileId)
  const stats = await getCompletionStats(chores.map((c) => c.id))
  const teens = await getTeensMap(userInfo.profileId)

  const active = chores.filter((c) => c.is_active)
  const archived = chores.filter((c) => !c.is_active)

  return (
    <div className="min-h-screen bg-zinc-950">
      <div className="container mx-auto px-6 py-32">
        <Button variant="ghost" asChild className="mb-6 text-zinc-400 hover:text-white">
          <Link href="/parent">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Retour au dashboard
          </Link>
        </Button>

        <div className="mb-8 flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-3xl font-black text-white flex items-center gap-2">
              <ListChecks className="h-7 w-7 text-emerald-400" />
              Corvées
            </h1>
            <p className="text-zinc-400 mt-1">
              Créez des missions familiales avec récompense (DH + XP) pour vos teens.
            </p>
          </div>
          <Button asChild className="bg-emerald-500 hover:bg-emerald-600 text-white">
            <Link href="/parent/chores/new">
              <Plus className="h-4 w-4 mr-2" />
              Nouvelle corvée
            </Link>
          </Button>
        </div>

        {chores.length === 0 ? (
          <Card className="bg-gradient-to-br from-zinc-900 to-zinc-950 border-zinc-800">
            <CardContent className="py-16 text-center">
              <ListChecks className="h-16 w-16 mx-auto mb-4 text-zinc-700" />
              <h3 className="text-xl font-bold text-white mb-2">Aucune corvée pour l'instant</h3>
              <p className="text-zinc-400 mb-6">
                Créez votre première corvée pour récompenser une habitude positive.
              </p>
              <Button asChild className="bg-emerald-500 hover:bg-emerald-600 text-white">
                <Link href="/parent/chores/new">
                  <Plus className="h-4 w-4 mr-2" />
                  Nouvelle corvée
                </Link>
              </Button>
            </CardContent>
          </Card>
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
      <h2 className={`text-xl font-bold mb-4 ${muted ? "text-zinc-500" : "text-white"}`}>{title}</h2>
      {chores.length === 0 ? (
        <p className="text-sm text-zinc-500">{emptyMessage}</p>
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {chores.map((c) => {
            const s = stats.get(c.id) ?? { total: 0, pending: 0, verified: 0 }
            const teen = teens.get(c.teen_id)
            return (
              <Card
                key={c.id}
                className="bg-gradient-to-br from-zinc-900 to-zinc-950 border-zinc-800 hover:border-emerald-500/40 transition"
              >
                <CardHeader>
                  <CardTitle className="text-white flex items-start justify-between gap-2">
                    <span>{c.title}</span>
                    {!c.is_active && (
                      <span className="text-xs font-normal px-2 py-1 rounded bg-zinc-800 text-zinc-400">
                        Archivée
                      </span>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {c.description && (
                    <p className="text-sm text-zinc-400">{c.description}</p>
                  )}
                  <div className="flex flex-wrap gap-2 text-xs">
                    <span className="px-2 py-1 rounded bg-emerald-500/10 text-emerald-400 flex items-center gap-1">
                      <Coins className="h-3 w-3" /> {c.reward_dh} DH
                    </span>
                    <span className="px-2 py-1 rounded bg-purple-500/10 text-purple-400 flex items-center gap-1">
                      <Sparkles className="h-3 w-3" /> {c.reward_xp} XP
                    </span>
                    <span className="px-2 py-1 rounded bg-zinc-800 text-zinc-300">
                      {c.recurrence}
                    </span>
                    <span className="px-2 py-1 rounded bg-zinc-800 text-zinc-300">
                      {s.verified}/{c.required_completions} validées
                    </span>
                  </div>
                  <div className="flex items-center justify-between pt-2 border-t border-zinc-800">
                    <div className="text-xs text-zinc-500">
                      Pour <span className="text-zinc-300">{teen?.name ?? "Teen"}</span>
                    </div>
                    <div className="flex items-center gap-3 text-xs">
                      {s.pending > 0 && (
                        <span className="text-amber-400 flex items-center gap-1">
                          <Clock className="h-3 w-3" /> {s.pending} en attente
                        </span>
                      )}
                      {s.verified > 0 && (
                        <span className="text-emerald-400 flex items-center gap-1">
                          <CheckCircle className="h-3 w-3" /> {s.verified}
                        </span>
                      )}
                    </div>
                  </div>
                  <Button
                    asChild
                    variant="outline"
                    className="w-full border-zinc-700 text-zinc-200 hover:bg-zinc-800"
                  >
                    <Link href={`/parent/chores/${c.id}`}>Détails</Link>
                  </Button>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </section>
  )
}
