import { getUserRole } from "@/lib/auth/get-user-role"
import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { CalendarDays, Coins, Wallet } from "lucide-react"
import { EmptyState } from "@/components/ui/states/empty-state"

export const dynamic = "force-dynamic"

export default async function TeenAllowancePage() {
  const userInfo = await getUserRole()
  if (!userInfo || userInfo.role !== "teen") redirect("/login")

  const supabase = await createClient()

  const { data: allowances } = await supabase
    .from("parent_allowances")
    .select("*")
    .eq("teen_id", userInfo.profileId)
    .eq("is_active", true)
    .order("next_disbursement_at", { ascending: true })

  const { data: history } = await supabase
    .from("allowance_disbursements")
    .select("*, parent_allowances!inner(teen_id)")
    .eq("parent_allowances.teen_id", userInfo.profileId)
    .order("created_at", { ascending: false })
    .limit(10)

  const next = allowances?.[0]
  const nextDate = next ? new Date(next.next_disbursement_at) : null
  const daysUntil = nextDate
    ? Math.max(0, Math.ceil((nextDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : null

  return (
    <div className="container mx-auto p-4 md:p-8 space-y-6">
      <h1 className="text-2xl font-bold">Mon argent de poche</h1>

      {next ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CalendarDays className="w-5 h-5" />
              Prochaine allowance
            </CardTitle>
          </CardHeader>
          <CardContent className="text-lg">
            <span className="font-semibold">{next.amount_dh} DH</span>{" "}
            <span className="text-muted-foreground">
              ({Math.round(Number(next.amount_dh) * 100)} coins)
            </span>{" "}
            — {nextDate?.toLocaleDateString("fr-MA", { weekday: "long", day: "numeric", month: "long" })}{" "}
            {daysUntil !== null ? `(dans ${daysUntil} jour${daysUntil > 1 ? "s" : ""})` : ""}
          </CardContent>
        </Card>
      ) : (
        <EmptyState
          size="small"
          icon={Wallet}
          title="Aucune allowance active"
          description="Demande à ton parent d'en configurer une depuis son espace pour recevoir tes coins automatiquement."
        />
      )}

      <Card>
        <CardHeader>
          <CardTitle>Historique</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          {(history ?? []).length === 0 ? (
            <EmptyState
              size="small"
              icon={CalendarDays}
              title="Pas encore de disbursement"
              description="Tes versements d'argent de poche apparaîtront ici dès le premier."
            />
          ) : (
            (history ?? []).map((h) => (
              <div key={h.id} className="flex items-center justify-between border-b pb-2 last:border-b-0">
                <span>
                  {new Date(h.scheduled_at).toLocaleDateString("fr-MA")} —{" "}
                  <span className="font-medium">{h.amount_dh} DH</span>
                </span>
                <Badge
                  variant={
                    h.status === "succeeded"
                      ? "default"
                      : h.status === "skipped"
                      ? "secondary"
                      : "destructive"
                  }
                >
                  {h.status}
                </Badge>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  )
}
