import { getUserRole } from "@/lib/auth/get-user-role"
import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { Button } from "@/components/ui/button"
import { ArrowLeft, ListChecks } from "lucide-react"
import Link from "next/link"
import { EmptyState } from "@/components/ui/states/empty-state"
// TICKET-026 (Wave 3 / W3-A9) — FLIP animations on chore reorder. The
// row-rendering moves into a client component so the list can sit inside
// an <AnimatePresence mode="popLayout"> tree.
import { ChoresList, type ChoresListChore, type ChoresListCompletion } from "./chores-list"

type Chore = ChoresListChore
type Completion = ChoresListCompletion

export default async function TeenChoresPage() {
  const userInfo = await getUserRole()
  if (!userInfo || userInfo.role !== "teen") {
    redirect("/auth/redirect")
  }
  const supabase = await createClient()
  const teenId = userInfo.profileId

  // Wave 3 / TICKET-016 — sibling fan-out. Pull chores assigned both via
  // the legacy direct `parent_chores.teen_id` and via the new
  // `chore_targets` junction, then de-dupe by id.
  const [directRes, junctionRes] = await Promise.all([
    supabase
      .from("parent_chores")
      .select("*")
      .eq("teen_id", teenId)
      .eq("is_active", true),
    supabase
      .from("chore_targets")
      .select("parent_chores!inner(*)")
      .eq("teen_id", teenId)
      .eq("parent_chores.is_active", true),
  ])

  const choresMap = new Map<string, Chore>()
  for (const c of (directRes.data ?? []) as Chore[]) choresMap.set(c.id, c)
  for (const row of junctionRes.data ?? []) {
    const linked = (row as { parent_chores: Chore | Chore[] | null })
      .parent_chores
    if (!linked) continue
    const arr = Array.isArray(linked) ? linked : [linked]
    for (const item of arr) choresMap.set(item.id, item)
  }
  const chores = Array.from(choresMap.values()).sort((a, b) =>
    String(b.created_at ?? "").localeCompare(String(a.created_at ?? ""))
  )

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
          <EmptyState
            icon={ListChecks}
            title="Aucune corvée"
            description="Aucune corvée n'a été créée pour le moment. Demande à tes parents de t'en assigner pour gagner des coins et de l'XP."
          />
        ) : (
          <ChoresList
            chores={chores}
            completionsByChore={Object.fromEntries(byChore)}
          />
        )}
      </div>
    </div>
  )
}
