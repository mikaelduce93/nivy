import { getUserRole } from "@/lib/auth/get-user-role"
import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ArrowLeft, ListChecks, Coins, Sparkles } from "lucide-react"
import Link from "next/link"
import { TeenChoreCompleteButton } from "@/components/teen/teen-chore-complete-button"

interface Chore {
  id: string
  title: string
  description: string | null
  reward_dh: number
  reward_xp: number
  recurrence: string
  required_completions: number
  evidence_required: boolean
  is_active: boolean
}

interface Completion {
  id: string
  chore_id: string
  parent_verified: boolean | null
  rejection_reason: string | null
  paid_at: string | null
  completed_at: string
}

export default async function TeenChoresPage() {
  const userInfo = await getUserRole()
  if (!userInfo || userInfo.role !== "teen") {
    redirect("/auth/redirect")
  }
  const supabase = await createClient()
  const teenId = userInfo.profileId

  const { data: choresData } = await supabase
    .from("parent_chores")
    .select("*")
    .eq("teen_id", teenId)
    .eq("is_active", true)
    .order("created_at", { ascending: false })

  const chores = (choresData ?? []) as Chore[]

  const { data: comps } = await supabase
    .from("parent_chore_completions")
    .select("id, chore_id, parent_verified, rejection_reason, paid_at, completed_at")
    .eq("teen_id", teenId)

  const completions = (comps ?? []) as Completion[]
  const byChore = new Map<string, Completion[]>()
  for (const c of completions) {
    const arr = byChore.get(c.chore_id) ?? []
    arr.push(c)
    byChore.set(c.chore_id, arr)
  }

  return (
    <div className="min-h-screen bg-zinc-950">
      <div className="container mx-auto px-6 py-32 max-w-3xl">
        <Button variant="ghost" asChild className="mb-6 text-zinc-400 hover:text-white">
          <Link href="/teen">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Retour
          </Link>
        </Button>

        <div className="mb-8">
          <h1 className="text-3xl font-black text-white flex items-center gap-2">
            <ListChecks className="h-7 w-7 text-emerald-400" />
            Mes corvées
          </h1>
          <p className="text-zinc-400 mt-1">
            Termine tes missions familiales pour gagner des coins et de l'XP.
          </p>
        </div>

        {chores.length === 0 ? (
          <Card className="bg-gradient-to-br from-zinc-900 to-zinc-950 border-zinc-800">
            <CardContent className="py-16 text-center">
              <ListChecks className="h-16 w-16 mx-auto mb-4 text-zinc-700" />
              <h3 className="text-xl font-bold text-white mb-2">Aucune corvée</h3>
              <p className="text-zinc-400">
                Aucune corvée n'a été créée pour le moment.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {chores.map((c) => {
              const list = byChore.get(c.id) ?? []
              const verified = list.filter((x) => x.parent_verified).length
              const pending = list.filter(
                (x) => !x.parent_verified && !x.rejection_reason
              ).length
              const lastRejection = list.find((x) => x.rejection_reason)
              return (
                <Card
                  key={c.id}
                  className="bg-gradient-to-br from-zinc-900 to-zinc-950 border-zinc-800"
                >
                  <CardHeader>
                    <CardTitle className="text-white">{c.title}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
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
                        {verified}/{c.required_completions} validées
                      </span>
                      {pending > 0 && (
                        <span className="px-2 py-1 rounded bg-amber-500/10 text-amber-400">
                          {pending} en attente
                        </span>
                      )}
                    </div>
                    {lastRejection?.rejection_reason && (
                      <p className="text-xs text-red-400">
                        Dernier refus: {lastRejection.rejection_reason}
                      </p>
                    )}
                    <TeenChoreCompleteButton
                      choreId={c.id}
                      evidenceRequired={c.evidence_required}
                    />
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
