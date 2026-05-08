import { getUserRole } from "@/lib/auth/get-user-role"
import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { GoalMatchForm } from "@/components/parent/goal-match-form"

export const dynamic = "force-dynamic"

export default async function ParentSavingsPage() {
  const userInfo = await getUserRole()
  if (!userInfo || userInfo.role !== "parent") redirect("/login")

  const supabase = await createClient()

  // Polish-F: drop the sentinel UUID hack (`["00000000-..."]`). Branch on
  // teenIds.length and surface load failures via a banner rather than
  // masking them as "Aucun objectif…".
  type GoalRow = {
    id: string
    title: string
    target_coins: number
    current_saved_coins: number
    parent_match_pct: number | string | null
    parent_match_cap_coins: number | null
    parent_match_contributed_coins: number
    status: string
    profile?: { full_name?: string } | null
  }
  let goals: GoalRow[] = []
  let loadError: string | null = null
  try {
    const { data: links, error: linksErr } = await supabase
      .from("parent_teen_links")
      .select("teen_id")
      .eq("parent_id", userInfo.profileId)
    if (linksErr) {
      console.error("[parent/savings] parent_teen_links error:", linksErr)
      loadError = "Impossible de charger les ados liés."
    }
    const teenIds = (links ?? []).map((l) => l.teen_id as string)
    if (teenIds.length > 0) {
      const { data, error } = await supabase
        .from("savings_goals")
        .select("*, profile:teen_id(full_name)")
        .in("teen_id", teenIds)
        .order("created_at", { ascending: false })
      if (error) {
        console.error("[parent/savings] savings_goals error:", error)
        loadError = loadError ?? "Impossible de charger les objectifs."
      } else {
        goals = (data ?? []) as GoalRow[]
      }
    }
  } catch (err) {
    console.error("[parent/savings] queries threw:", err)
    loadError = "Une erreur est survenue lors du chargement."
  }

  return (
    <div className="container mx-auto p-4 md:p-8 space-y-6">
      <h1 className="text-2xl font-bold">Objectifs d&apos;épargne — vue parent</h1>

      {loadError && (
        <div
          role="alert"
          className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200"
        >
          {loadError}
        </div>
      )}

      {goals.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-muted-foreground text-center space-y-3">
            <p>Aucun objectif créé par tes ados pour le moment.</p>
            <a
              href="/parent/teens"
              className="inline-block text-sm text-emerald-400 hover:underline"
            >
              Inviter un teen à créer son premier objectif →
            </a>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {goals.map((g) => {
            const teenName = (g as { profile?: { full_name?: string } }).profile?.full_name ?? "Ado"
            const pct = Math.min(100, Math.round((g.current_saved_coins / g.target_coins) * 100))
            return (
              <Card key={g.id}>
                <CardHeader className="flex-row items-center justify-between">
                  <CardTitle className="text-base">
                    {teenName} — {g.title}
                  </CardTitle>
                  <Badge variant={g.status === "achieved" ? "default" : "secondary"}>
                    {g.status}
                  </Badge>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <div className="flex justify-between text-sm">
                      <span>{g.current_saved_coins} / {g.target_coins} coins</span>
                      <span>{pct}%</span>
                    </div>
                    <Progress value={pct} />
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Match déjà versé :{" "}
                    {g.parent_match_contributed_coins} coins
                  </div>
                  <GoalMatchForm
                    goalId={g.id}
                    initialPct={Number(g.parent_match_pct ?? 0)}
                    initialCap={g.parent_match_cap_coins ?? null}
                  />
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
