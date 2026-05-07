/**
 * Wave V1.2-F — Partner payouts (read-only).
 *
 * RSC. Reads `partner_payouts` (created monthly by Wave D.11
 * partner-payout-monthly cron). RLS on this table requires a partner_staff
 * row with role='owner', so we use the service-role client and filter
 * explicitly by `partner_id = userInfo.partnerData.id`.
 */
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Wallet,
  Clock,
  CheckCircle2,
  XCircle,
  TrendingUp,
  RefreshCw,
} from "lucide-react"
import { redirect } from "next/navigation"
import { getUserRole } from "@/lib/auth/get-user-role"
import { createServiceRoleClient } from "@/lib/supabase/service-role"

export const dynamic = "force-dynamic"

const DATE_FMT = new Intl.DateTimeFormat("fr-FR", {
  day: "2-digit",
  month: "short",
  year: "numeric",
})

function formatDate(value: string | null): string {
  if (!value) return ""
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return ""
  return DATE_FMT.format(d)
}

function formatPeriod(start: string, end: string): string {
  return `${formatDate(start)} → ${formatDate(end)}`
}

function statusBadge(status: string) {
  switch (status) {
    case "paid":
    case "completed":
      return (
        <Badge className="bg-green-500/20 text-green-400">
          <CheckCircle2 className="w-3 h-3 mr-1" />
          Payé
        </Badge>
      )
    case "pending":
      return (
        <Badge className="bg-yellow-500/20 text-yellow-400">
          <Clock className="w-3 h-3 mr-1" />
          En attente
        </Badge>
      )
    case "processing":
      return (
        <Badge className="bg-blue-500/20 text-blue-400">
          <RefreshCw className="w-3 h-3 mr-1 animate-spin" />
          Traitement
        </Badge>
      )
    case "failed":
      return (
        <Badge className="bg-red-500/20 text-red-400">
          <XCircle className="w-3 h-3 mr-1" />
          Échoué
        </Badge>
      )
    default:
      return <Badge variant="outline">{status}</Badge>
  }
}

export default async function PartnerPayoutsPage() {
  const userInfo = await getUserRole()
  if (!userInfo) redirect("/auth/login")

  if (userInfo.role !== "partner") {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-black text-white">Mes Paiements</h1>
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="p-10 text-center text-red-400">
            Accès refusé — espace réservé aux partenaires.
          </CardContent>
        </Card>
      </div>
    )
  }

  const partnerId = userInfo.partnerData?.id
  if (!partnerId) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-black text-white">Mes Paiements</h1>
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="p-10 text-center">
            <p className="text-zinc-300 font-semibold">Profil partenaire introuvable</p>
            <p className="text-sm text-zinc-500 mt-2">
              Votre compte n'est pas encore lié à une fiche partenaire active.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  const sr = createServiceRoleClient()

  const { data: payoutsRaw } = await sr
    .from("partner_payouts")
    .select("id, period_start, period_end, total_dh, status, paid_at, reference, created_at")
    .eq("partner_id", partnerId)
    .order("created_at", { ascending: false })
    .limit(100)

  const payouts = (payoutsRaw ?? []) as Array<{
    id: string
    period_start: string
    period_end: string
    total_dh: number | string
    status: string
    paid_at: string | null
    reference: string | null
    created_at: string
  }>

  const num = (v: number | string) => Number(v || 0)

  const totalPaid = payouts
    .filter((p) => p.status === "paid" || p.status === "completed")
    .reduce((s, p) => s + num(p.total_dh), 0)
  const totalPending = payouts
    .filter((p) => p.status === "pending" || p.status === "processing")
    .reduce((s, p) => s + num(p.total_dh), 0)
  const totalFailed = payouts
    .filter((p) => p.status === "failed")
    .reduce((s, p) => s + num(p.total_dh), 0)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-black text-white flex items-center gap-3">
          <Wallet className="w-7 h-7 text-green-400" />
          Mes Paiements
        </h1>
        <p className="text-zinc-400 mt-1">
          Historique des virements générés par Nivy (mensuel, le 1er de chaque mois)
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-green-400 font-medium">Total payé</p>
                <p className="text-2xl font-black text-white">
                  {Math.round(totalPaid).toLocaleString()} DH
                </p>
              </div>
              <TrendingUp className="h-6 w-6 text-green-400" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-yellow-400 font-medium">En attente</p>
                <p className="text-2xl font-black text-white">
                  {Math.round(totalPending).toLocaleString()} DH
                </p>
              </div>
              <Clock className="h-6 w-6 text-yellow-400" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-red-400 font-medium">Échoués</p>
                <p className="text-2xl font-black text-white">
                  {Math.round(totalFailed).toLocaleString()} DH
                </p>
              </div>
              <XCircle className="h-6 w-6 text-red-400" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Payout list */}
      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader>
          <CardTitle className="text-white">Historique des paiements</CardTitle>
        </CardHeader>
        <CardContent>
          {payouts.length === 0 ? (
            <div className="p-10 text-center">
              <Wallet className="w-12 h-12 mx-auto mb-4 text-zinc-700" />
              <p className="text-zinc-300 font-semibold">Aucun paiement</p>
              <p className="text-sm text-zinc-500 mt-2">
                Vos virements apparaîtront ici une fois le premier cycle de versement clôturé.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {payouts.map((p) => (
                <div
                  key={p.id}
                  className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-lg bg-zinc-800/50 border border-zinc-800"
                >
                  <div className="min-w-0">
                    <p className="font-bold text-white">
                      {Math.round(num(p.total_dh)).toLocaleString()} DH
                    </p>
                    <p className="text-xs text-zinc-500">
                      Période {formatPeriod(p.period_start, p.period_end)}
                      {p.reference ? ` · ${p.reference}` : ""}
                    </p>
                  </div>
                  <div className="text-right">
                    {statusBadge(p.status)}
                    <p className="text-xs text-zinc-500 mt-1">
                      {p.paid_at
                        ? `Payé le ${formatDate(p.paid_at)}`
                        : `Créé le ${formatDate(p.created_at)}`}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
