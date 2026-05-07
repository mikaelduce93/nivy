/**
 * Wave V1.2-F — Partner invoices.
 *
 * The dedicated `partner_invoices` table does NOT exist in the schema (verified
 * via information_schema). Per V1.2-F spec, treat each `partner_payouts` row
 * AS an invoice (`Facture de payout`). When a real invoices table is added
 * later, swap the source query — the UI shape stays the same.
 *
 * RSC. Service-role read filtered by partner_id (mirrors payouts page).
 */
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  FileText,
  CheckCircle2,
  Clock,
  XCircle,
  AlertTriangle,
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

function invoiceNumber(payout: {
  reference: string | null
  created_at: string
  id: string
}): string {
  if (payout.reference) return payout.reference
  // Synthesize an invoice number from the creation date + short id.
  const yr = new Date(payout.created_at).getFullYear()
  const short = payout.id.replace(/-/g, "").slice(0, 6).toUpperCase()
  return `INV-${yr}-${short}`
}

function statusBadge(status: string) {
  switch (status) {
    case "paid":
    case "completed":
      return (
        <Badge className="bg-green-500/20 text-green-400">
          <CheckCircle2 className="w-3 h-3 mr-1" />
          Payée
        </Badge>
      )
    case "pending":
    case "processing":
      return (
        <Badge className="bg-yellow-500/20 text-yellow-400">
          <Clock className="w-3 h-3 mr-1" />
          En attente
        </Badge>
      )
    case "failed":
      return (
        <Badge className="bg-red-500/20 text-red-400">
          <XCircle className="w-3 h-3 mr-1" />
          Échouée
        </Badge>
      )
    default:
      return <Badge variant="outline">{status}</Badge>
  }
}

export default async function PartnerInvoicesPage() {
  const userInfo = await getUserRole()
  if (!userInfo) redirect("/auth/login")

  if (userInfo.role !== "partner") {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-black text-white">Mes Factures</h1>
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
        <h1 className="text-3xl font-black text-white">Mes Factures</h1>
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

  // Each payout = one "Facture de payout" invoice line.
  const { data: payoutsRaw } = await sr
    .from("partner_payouts")
    .select("id, period_start, period_end, total_dh, status, paid_at, reference, created_at")
    .eq("partner_id", partnerId)
    .order("created_at", { ascending: false })
    .limit(100)

  const invoices = (payoutsRaw ?? []) as Array<{
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
  const totalInvoiced = invoices.reduce((s, i) => s + num(i.total_dh), 0)
  const totalPaid = invoices
    .filter((i) => i.status === "paid" || i.status === "completed")
    .reduce((s, i) => s + num(i.total_dh), 0)
  const totalPending = invoices
    .filter((i) => i.status === "pending" || i.status === "processing")
    .reduce((s, i) => s + num(i.total_dh), 0)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-black text-white flex items-center gap-3">
          <FileText className="w-7 h-7 text-purple-400" />
          Mes Factures
        </h1>
        <p className="text-zinc-400 mt-1">
          Chaque virement Nivy génère une facture de payout. La facture PDF est disponible sur
          demande auprès du support.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="p-5">
            <p className="text-xs text-purple-400 font-medium">Total facturé</p>
            <p className="text-2xl font-black text-white">
              {Math.round(totalInvoiced).toLocaleString()} DH
            </p>
          </CardContent>
        </Card>
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="p-5">
            <p className="text-xs text-green-400 font-medium">Total payé</p>
            <p className="text-2xl font-black text-white">
              {Math.round(totalPaid).toLocaleString()} DH
            </p>
          </CardContent>
        </Card>
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="p-5">
            <p className="text-xs text-yellow-400 font-medium">En attente</p>
            <p className="text-2xl font-black text-white">
              {Math.round(totalPending).toLocaleString()} DH
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Notice */}
      <Card className="bg-blue-500/10 border-blue-500/20">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-blue-400 mt-0.5" />
            <p className="text-sm text-zinc-300">
              <span className="font-medium text-blue-400">Facturation mensuelle —</span>{" "}
              chaque ligne ci-dessous correspond au cycle de versement (cron mensuel
              partner-payout-monthly).
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Invoices table */}
      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader>
          <CardTitle className="text-white">Factures de payout</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {invoices.length === 0 ? (
            <div className="p-10 text-center">
              <FileText className="w-12 h-12 mx-auto mb-4 text-zinc-700" />
              <p className="text-zinc-300 font-semibold">Aucune facture</p>
              <p className="text-sm text-zinc-500 mt-2">
                Vos factures de payout apparaîtront ici dès le premier cycle de versement.
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-zinc-800">
                  <TableHead className="text-zinc-400">Numéro</TableHead>
                  <TableHead className="text-zinc-400">Période</TableHead>
                  <TableHead className="text-zinc-400">Date</TableHead>
                  <TableHead className="text-zinc-400">Montant</TableHead>
                  <TableHead className="text-zinc-400">Statut</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoices.map((inv) => (
                  <TableRow key={inv.id} className="border-zinc-800 hover:bg-zinc-800/50">
                    <TableCell className="font-mono font-bold text-purple-400">
                      {invoiceNumber(inv)}
                    </TableCell>
                    <TableCell className="text-white">
                      {formatPeriod(inv.period_start, inv.period_end)}
                    </TableCell>
                    <TableCell className="text-zinc-400">
                      {formatDate(inv.paid_at || inv.created_at)}
                    </TableCell>
                    <TableCell className="font-bold text-white">
                      {Math.round(num(inv.total_dh)).toLocaleString()} DH
                    </TableCell>
                    <TableCell>{statusBadge(inv.status)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
