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
import { StickerCard } from "@/components/ui/sticker-card"
import { StatHero, NivEmpty } from "@/components/brand"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { AlertTriangle } from "lucide-react"
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

/** Pill mono UPPERCASE bordure ink — palette charte par statut. */
function statusBadge(status: string) {
  const map: Record<string, { label: string; tint: string }> = {
    paid: { label: "Payée", tint: "bg-lime/20" },
    completed: { label: "Payée", tint: "bg-lime/20" },
    issued: { label: "Émise", tint: "bg-teal/20" },
    draft: { label: "Brouillon", tint: "bg-white" },
    pending: { label: "En attente", tint: "bg-gold/20" },
    processing: { label: "En attente", tint: "bg-gold/20" },
    failed: { label: "Échouée", tint: "bg-coral/20" },
    cancelled: { label: "Annulée", tint: "bg-coral/20" },
  }
  const cfg = map[status]
  return (
    <span
      className={`inline-block rounded-full border-2 border-ink px-2.5 py-0.5 font-mono text-[11px] font-bold uppercase tracking-[0.08em] text-ink ${
        cfg?.tint ?? "bg-white"
      }`}
    >
      {cfg?.label ?? status}
    </span>
  )
}

const num = (v: number | string | null | undefined): number => Number(v ?? 0)

export default async function PartnerInvoicesPage() {
  const userInfo = await getUserRole()
  if (!userInfo) redirect("/auth/login")

  if (userInfo.role !== "partner") {
    return (
      <div className="space-y-6">
        <div>
          <p className="eyebrow tracking-[0.16em] text-mute">Facturation</p>
          <h1 className="font-display text-3xl font-extrabold tracking-tight text-ink">
            Tes <em className="font-semibold italic text-pink">factures</em>
          </h1>
        </div>
        <StickerCard className="p-10 text-center">
          <p className="font-semibold text-coral">
            Accès refusé — espace réservé aux partenaires.
          </p>
        </StickerCard>
      </div>
    )
  }

  const partnerId = userInfo.partnerData?.id
  if (!partnerId) {
    return (
      <div className="space-y-6">
        <div>
          <p className="eyebrow tracking-[0.16em] text-mute">Facturation</p>
          <h1 className="font-display text-3xl font-extrabold tracking-tight text-ink">
            Tes <em className="font-semibold italic text-pink">factures</em>
          </h1>
        </div>
        <StickerCard className="p-10 text-center">
          <p className="font-display text-lg font-bold text-ink">
            Profil partenaire introuvable
          </p>
          <p className="mt-2 text-sm text-mute">
            Ton compte n'est pas encore lié à une fiche partenaire active.
          </p>
        </StickerCard>
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
        <p className="eyebrow tracking-[0.16em] text-mute">Facturation</p>
        <h1 className="font-display text-3xl font-extrabold tracking-tight text-ink">
          Tes <em className="font-semibold italic text-pink">factures</em>
        </h1>
        <p className="text-mute">
          Chaque virement Nivy génère une facture. Le PDF est dispo sur demande
          auprès du support.
        </p>
      </div>

      {/* Stats — hiérarchie 1-2-3 : le total facturé domine en surface sombre */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatHero
          eyebrow="Total facturé"
          value={Math.round(totalInvoiced).toLocaleString()}
          unit="DH"
          tone="pink"
          className="sm:col-span-2"
          meta={`${invoices.length} facture${invoices.length > 1 ? "s" : ""}`}
        />
        <StickerCard className="justify-center gap-1 p-5">
          <p className="eyebrow tracking-[0.16em] text-mute">Total payé</p>
          <p className="font-display text-3xl font-extrabold tabular-nums text-lime">
            {Math.round(totalPaid).toLocaleString()}
            <span className="ml-1 font-mono text-sm text-mute">DH</span>
          </p>
        </StickerCard>
        <StickerCard className="justify-center gap-1 p-5">
          <p className="eyebrow tracking-[0.16em] text-mute">En attente</p>
          <p className="font-display text-3xl font-extrabold tabular-nums text-gold">
            {Math.round(totalPending).toLocaleString()}
            <span className="ml-1 font-mono text-sm text-mute">DH</span>
          </p>
        </StickerCard>
      </div>

      {/* Notice */}
      <StickerCard variant="panel" className="p-4">
        <div className="flex items-start gap-3">
          <AlertTriangle className="mt-0.5 size-5 shrink-0 text-teal" aria-hidden="true" />
          <p className="text-sm text-ink-2">
            <span className="font-semibold text-teal">Facturation mensuelle —</span>{" "}
            {usedFallback
              ? "vue dérivée (transition) — les factures officielles seront émises au prochain cycle de versement."
              : "chaque ligne ci-dessous correspond à une facture émise par Nivy (cron mensuel partner-payout-monthly)."}
          </p>
        </div>
      </StickerCard>

      {/* Invoices */}
      <div className="space-y-2">
        <p className="eyebrow tracking-[0.16em] text-mute">Factures</p>
        {invoices.length === 0 ? (
          <NivEmpty
            mood="calm"
            title="Pas encore de facture"
            description="Tes factures pop ici dès le premier cycle de versement. Tranquille."
          />
        ) : (
          <>
            {/* Mobile-first : cartes sticker empilées en < md */}
            <div className="space-y-3 md:hidden">
              {invoices.map((inv) => (
                <StickerCard key={inv.id} variant="hover" className="gap-2 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <p className="font-mono text-sm font-bold text-pink">
                      {inv.invoice_number}
                    </p>
                    {statusBadge(inv.status)}
                  </div>
                  <p className="font-mono text-xs text-mute">
                    {formatPeriod(inv.period_start, inv.period_end)}
                  </p>
                  <div className="flex items-end justify-between gap-3">
                    <p className="font-mono text-xs text-mute">
                      {formatDate(inv.paid_at || inv.issued_at || inv.created_at)}
                    </p>
                    <p className="font-display text-lg font-extrabold tabular-nums text-ink">
                      {Math.round(inv.total_dh).toLocaleString()}
                      <span className="ml-1 font-mono text-sm text-mute">DH</span>
                    </p>
                  </div>
                </StickerCard>
              ))}
            </div>

            {/* md+ : table charte (en-têtes mono) */}
            <StickerCard className="hidden overflow-x-auto p-0 md:block">
              <Table>
                <TableHeader>
                  <TableRow className="border-ink">
                    <TableHead className="font-mono text-xs uppercase tracking-[0.08em] text-mute">
                      Numéro
                    </TableHead>
                    <TableHead className="font-mono text-xs uppercase tracking-[0.08em] text-mute">
                      Période
                    </TableHead>
                    <TableHead className="font-mono text-xs uppercase tracking-[0.08em] text-mute">
                      Date
                    </TableHead>
                    <TableHead className="font-mono text-xs uppercase tracking-[0.08em] text-mute">
                      Montant
                    </TableHead>
                    <TableHead className="font-mono text-xs uppercase tracking-[0.08em] text-mute">
                      Statut
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invoices.map((inv) => (
                    <TableRow key={inv.id} className="border-ink">
                      <TableCell className="font-mono font-bold text-pink">
                        {inv.invoice_number}
                      </TableCell>
                      <TableCell className="font-mono text-xs text-ink-2">
                        {formatPeriod(inv.period_start, inv.period_end)}
                      </TableCell>
                      <TableCell className="font-mono text-xs text-mute">
                        {formatDate(inv.paid_at || inv.issued_at || inv.created_at)}
                      </TableCell>
                      <TableCell className="font-display font-extrabold tabular-nums text-ink">
                        {Math.round(inv.total_dh).toLocaleString()} DH
                      </TableCell>
                      <TableCell>{statusBadge(inv.status)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </StickerCard>
          </>
        )}
      </div>
    </div>
  )
}
