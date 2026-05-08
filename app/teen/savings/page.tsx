import { getUserRole } from "@/lib/auth/get-user-role"
import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import Link from "next/link"
import { Plus, Coins, Lock, PiggyBank } from "lucide-react"
import { GoalLockButton } from "@/components/teen/goal-lock-button"
import { EmptyState } from "@/components/ui/states/empty-state"

export const dynamic = "force-dynamic"

export default async function TeenSavingsPage() {
  const userInfo = await getUserRole()
  if (!userInfo || userInfo.role !== "teen") redirect("/login")

  const supabase = await createClient()

  const [{ data: goals }, { data: spendable }] = await Promise.all([
    supabase
      .from("savings_goals")
      .select("*")
      .eq("teen_id", userInfo.profileId)
      .order("created_at", { ascending: false }),
    supabase
      .from("user_coins_spendable")
      .select("total, locked_in_goals, spendable")
      .eq("teen_id", userInfo.profileId)
      .maybeSingle(),
  ])

  return (
    <div className="container mx-auto p-4 md:p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Mes objectifs d&apos;épargne</h1>
          <p className="text-muted-foreground text-sm">
            Mets de côté tes coins pour atteindre ce qui te tient à cœur.
          </p>
        </div>
        <Link href="/teen/savings/new">
          <Button><Plus className="w-4 h-4 mr-2" /> Nouvel objectif</Button>
        </Link>
      </div>

      <Card>
        <CardContent className="p-4 grid grid-cols-3 gap-4 text-center">
          <div>
            <div className="text-xs text-muted-foreground">Total</div>
            <div className="text-xl font-bold">{spendable?.total ?? 0}</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">Locked</div>
            <div className="text-xl font-bold">{spendable?.locked_in_goals ?? 0}</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">Spendable</div>
            <div className="text-xl font-bold text-primary">{spendable?.spendable ?? 0}</div>
          </div>
        </CardContent>
      </Card>

      {(goals ?? []).length === 0 ? (
        <EmptyState
          icon={PiggyBank}
          title="Aucun objectif d'épargne"
          description="Crée ton premier objectif et commence à mettre tes coins de côté pour ce qui compte."
          action={{ label: "Créer un objectif", href: "/teen/savings/new" }}
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {(goals ?? []).map((g) => {
            const pct = Math.min(100, Math.round((g.current_saved_coins / g.target_coins) * 100))
            return (
              <Card key={g.id}>
                <CardHeader className="flex-row items-center justify-between">
                  <CardTitle className="text-base">{g.title}</CardTitle>
                  <Badge variant={g.status === "achieved" ? "default" : "secondary"}>
                    {g.status}
                  </Badge>
                </CardHeader>
                <CardContent className="space-y-3">
                  {g.description && (
                    <p className="text-sm text-muted-foreground">{g.description}</p>
                  )}
                  <div className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span>{g.current_saved_coins} / {g.target_coins} coins</span>
                      <span>{pct}%</span>
                    </div>
                    <Progress value={pct} />
                  </div>
                  {g.parent_match_pct > 0 && (
                    <Badge variant="outline">
                      Match parent {g.parent_match_pct}%
                      {g.parent_match_cap_coins
                        ? ` (cap ${g.parent_match_cap_coins})`
                        : ""}
                    </Badge>
                  )}
                  {g.status === "active" && (
                    <GoalLockButton
                      goalId={g.id}
                      spendable={spendable?.spendable ?? 0}
                      currentSavedCoins={g.current_saved_coins}
                      targetCoins={g.target_coins}
                    />
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
