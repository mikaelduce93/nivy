/**
 * Wave Polish-D — Partner invoices.
 *
 * Reads from the real `partner_invoices` table (migration 091). When the
 * partner has no rows yet (transitional state — invoices are auto-materialised
 * by the trigger on partner_payouts succeeded), falls back to the V1.2-F
 * derivative view that synthesises one invoice per payout. The fallback is
 * read-only and goes away naturally as the trigger backfills new payouts.
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
  FileEdit,
} from "lucide-react"
import { redirect } from "next/navigation"
import { getUserRole } from "@/lib/auth/get-user-role"
import { createServiceRoleClient } from "@/lib/supabase/service-role"
import { EmptyState } from "@/components/ui/states/empty-state"

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

/** Unified invoice shape rendered by the table (real or derivative). */
type InvoiceRow = {
  id: string
  invoice_number: string
  period_start: string
  period_end: string
  total_dh: number
  status: string
  issued_at: string | null
  paid_at: string | null
  created_at: string
  source: "real" | "derived"
}

function syntheticInvoiceNumber(payout: {
  reference: string | null
  created_at: string
  id: string
}): string {
  if (payout.reference && !payout.reference.trim().startsWith("{")) {
    return payout.reference
  }
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
    case "issued":
      return (
        <Badge className="bg-blue-500/20 text-blue-400">
          <FileText className="w-3 h-3 mr-1" />
          Émise
        </Badge>
      )
    case "draft":
      return (
        <Badge className="bg-zinc-500/20 text-zinc-400">
          <FileEdit className="w-3 h-3 mr-1" />
          Brouillon
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
    case "cancelled":
      return (
        <Badge className="bg-red-500/20 text-red-400">
          <XCircle className="w-3 h-3 mr-1" />
          {status === "cancelled" ? "Annulée" : "Échouée"}
        </Badge>
      )
    default:
      return <Badge variant="outline">{status}</Badge>
  }
}

const num = (v: number | string | null | undefined): number => Number(v ?? 0)

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

  // Primary: real partner_invoices.
  const { data: realRaw, error: realErr } = await sr
    .from("partner_invoices")
    .select(
      "id, invoice_number, period_start, period_end, total_dh, status, issued_at, paid_at, created_at",
    )
    .eq("partner_id", partnerId)
    .order("created_at", { ascending: false })
    .limit(100)

  let invoices: InvoiceRow[] = []
  let usedFallback = false

  if (!realErr && realRaw && realRaw.length > 0) {
    invoices = realRaw.map((r) => ({
      id: r.id as string,
      invoice_number: (r.invoice_number as string | null) ?? "—",
      period_start: r.period_start as string,
      period_end: r.period_end as string,
      total_dh: num(r.total_dh as number | string | null),
      status: r.status as string,
      issued_at: (r.issued_at as string | null) ?? null,
      paid_at: (r.paid_at as string | null) ?? null,
      created_at: r.created_at as string,
      source: "real",
    }))
  } else {
    // Fallback: synthesise from partner_payouts (transitional / pre-trigger).
    usedFallback = true
    const { data: payoutsRaw } = await sr
      .from("partner_payouts")
      .select("id, period_start, period_end, total_dh, status, paid_at, reference, created_at")
      .eq("partner_id", partnerId)
      .order("created_at", { ascending: false })
      .limit(100)

    invoices = ((payoutsRaw ?? []) as Array<{
      id: string
      period_start: string
      period_end: string
      total_dh: number | string
      status: string
      paid_at: string | null
      reference: string | null
      created_at: string
    }>).map((p) => ({
      id: p.id,
      invoice_number: syntheticInvoiceNumber(p),
      period_start: p.period_start,
      period_end: p.period_end,
      total_dh: num(p.total_dh),
      status: p.status,
      issued_at: null,
      paid_at: p.paid_at,
      created_at: p.created_at,
      source: "derived",
    }))
  }

  const totalInvoiced = invoices.reduce((s, i) => s + i.total_dh, 0)
  const totalPaid = invoices
    .filter((i) => i.status === "paid" || i.status === "completed")
    .reduce((s, i) => s + i.total_dh, 0)
  const totalPending = invoices
    .filter(
      (i) =>
        i.status === "pending" ||
        i.status === "processing" ||
        i.status === "draft" ||
        i.status === "issued",
    )
    .reduce((s, i) => s + i.total_dh, 0)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-black text-white flex items-center gap-3">
          <FileText className="w-7 h-7 text-purple-400" />
          Mes Factures
        </h1>
        <p className="text-zinc-400 mt-1">
          Chaque virement Nivy génère une facture. La facture PDF est disponible sur
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
              {usedFallback
                ? "vue dérivée (transition) — les factures officielles seront émises au prochain cycle de versement."
                : "chaque ligne ci-dessous correspond à une facture émise par Nivy (cron mensuel partner-payout-monthly)."}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Invoices table */}
      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader>
          <CardTitle className="text-white">Factures</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {invoices.length === 0 ? (
            <EmptyState
              icon={FileText}
              title="Aucune facture"
              description="Vos factures apparaîtront ici dès le premier cycle de versement."
            />
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
                      {inv.invoice_number}
                    </TableCell>
                    <TableCell className="text-white">
                      {formatPeriod(inv.period_start, inv.period_end)}
                    </TableCell>
                    <TableCell className="text-zinc-400">
                      {formatDate(inv.paid_at || inv.issued_at || inv.created_at)}
                    </TableCell>
                    <TableCell className="font-bold text-white">
                      {Math.round(inv.total_dh).toLocaleString()} DH
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
