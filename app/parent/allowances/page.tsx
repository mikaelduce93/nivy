import { getUserRole } from "@/lib/auth/get-user-role"
import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"
import { Plus, CalendarDays, PauseCircle, PlayCircle, Trash2 } from "lucide-react"
import { AllowanceRowActions } from "@/components/parent/allowance-row-actions"

export const dynamic = "force-dynamic"

interface AllowanceRow {
  id: string
  teen_id: string
  amount_dh: number
  cadence: string
  is_active: boolean
  paused_until: string | null
  next_disbursement_at: string
  conditional: boolean
}

export default async function ParentAllowancesPage() {
  const userInfo = await getUserRole()
  if (!userInfo || userInfo.role !== "parent") redirect("/login")

  const supabase = await createClient()
  const { data: rows } = await supabase
    .from("parent_allowances")
    .select("*")
    .eq("parent_id", userInfo.profileId)
    .order("created_at", { ascending: false })

  const allowances = (rows ?? []) as AllowanceRow[]

  const { data: teens } = await supabase
    .from("parent_teen_links")
    .select("teen_id, profiles:teen_id (full_name)")
    .eq("parent_id", userInfo.profileId)

  const teenName = (id: string): string => {
    const row = (teens ?? []).find((t) => t.teen_id === id) as
      | { profiles?: { full_name?: string } | null }
      | undefined
    return row?.profiles?.full_name ?? id.slice(0, 8)
  }

  return (
    <div className="container mx-auto p-4 md:p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Allowance — argent de poche</h1>
          <p className="text-muted-foreground text-sm">
            Programme un top-up récurrent pour ton ado.
          </p>
        </div>
        <Link href="/parent/allowances/new">
          <Button>
            <Plus className="w-4 h-4 mr-2" /> Nouvelle allowance
          </Button>
        </Link>
      </div>

      {allowances.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">
            Aucune allowance configurée. Crée la première pour automatiser
            l&apos;argent de poche.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {allowances.map((a) => {
            const isPaused =
              a.paused_until && new Date(a.paused_until) > new Date()
            return (
              <Card key={a.id}>
                <CardHeader className="flex-row items-center justify-between">
                  <CardTitle className="text-base">
                    {teenName(a.teen_id)} — {a.amount_dh} DH / {a.cadence}
                  </CardTitle>
                  {a.is_active && !isPaused ? (
                    <Badge>Actif</Badge>
                  ) : isPaused ? (
                    <Badge variant="secondary">Pause</Badge>
                  ) : (
                    <Badge variant="outline">Inactif</Badge>
                  )}
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <div className="flex items-center gap-2">
                    <CalendarDays className="w-4 h-4" />
                    <span>
                      Prochain : {new Date(a.next_disbursement_at).toLocaleString("fr-MA")}
                    </span>
                  </div>
                  {a.conditional ? (
                    <Badge variant="outline">Conditionnel</Badge>
                  ) : null}
                  <AllowanceRowActions allowanceId={a.id} isPaused={!!isPaused} />
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
