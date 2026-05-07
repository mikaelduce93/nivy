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
  const { data: links } = await supabase
    .from("parent_teen_links")
    .select("teen_id")
    .eq("parent_id", userInfo.profileId)

  const teenIds = (links ?? []).map((l) => l.teen_id as string)

  const { data: goals } = await supabase
    .from("savings_goals")
    .select("*, profile:teen_id(full_name)")
    .in("teen_id", teenIds.length > 0 ? teenIds : ["00000000-0000-0000-0000-000000000000"])
    .order("created_at", { ascending: false })

  return (
    <div className="container mx-auto p-4 md:p-8 space-y-6">
      <h1 className="text-2xl font-bold">Objectifs d&apos;épargne — vue parent</h1>

      {(goals ?? []).length === 0 ? (
        <Card>
          <CardContent className="p-8 text-muted-foreground text-center">
            Aucun objectif créé par tes ados pour le moment.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {(goals ?? []).map((g) => {
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
