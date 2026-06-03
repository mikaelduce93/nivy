/**
 * Wave V1.2-F — Partner payouts (read-only).
 *
 * RSC. Reads `partner_payouts` (created monthly by Wave D.11
 * partner-payout-monthly cron). RLS on this table requires a partner_staff
 * row with role='owner', so we use the service-role client and filter
 * explicitly by `partner_id = userInfo.partnerData.id`.
 */
import { StickerCard } from "@/components/ui/sticker-card"
import { StatHero, NivEmpty } from "@/components/brand"
import { Clock, XCircle } from "lucide-react"
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

/** Pill mono UPPERCASE bordure ink — palette charte par statut. */
function statusBadge(status: string) {
  const map: Record<string, { label: string; tint: string }> = {
    paid: { label: "Payé", tint: "bg-lime/20" },
    completed: { label: "Payé", tint: "bg-lime/20" },
    pending: { label: "En attente", tint: "bg-gold/20" },
    processing: { label: "Traitement", tint: "bg-gold/20" },
    failed: { label: "Échoué", tint: "bg-coral/20" },
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

export default async function PartnerPayoutsPage() {
  const userInfo = await getUserRole()
  if (!userInfo) redirect("/auth/login")

  if (userInfo.role !== "partner") {
    return (
      <div className="space-y-6">
        <div>
          <p className="eyebrow tracking-[0.16em] text-mute">Ton cash</p>
          <h1 className="font-display text-3xl font-extrabold tracking-tight text-ink">
            Tes <em className="font-semibold italic text-pink">virements</em>
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
          <p className="eyebrow tracking-[0.16em] text-mute">Ton cash</p>
          <h1 className="font-display text-3xl font-extrabold tracking-tight text-ink">
            Tes <em className="font-semibold italic text-pink">virements</em>
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
        <p className="eyebrow tracking-[0.16em] text-mute">Ton cash</p>
        <h1 className="font-display text-3xl font-extrabold tracking-tight text-ink">
          Tes <em className="font-semibold italic text-pink">virements</em>
        </h1>
        <p className="text-mute">
          Tes virements générés par Nivy (mensuel, le 1er de chaque mois)
        </p>
      </div>

      {/* Stats — hiérarchie 1-2-3 : le total payé domine en surface sombre */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatHero
          eyebrow="Total payé"
          value={Math.round(totalPaid).toLocaleString()}
          unit="DH"
          tone="lime"
          className="sm:col-span-2"
          meta="encaissé sur ton compte"
        />
        <StickerCard className="justify-center gap-1 p-5">
          <p className="flex items-center gap-1.5 eyebrow tracking-[0.16em] text-mute">
            <Clock className="size-3.5" aria-hidden="true" />
            En attente
          </p>
          <p className="font-display text-3xl font-extrabold tabular-nums text-gold">
            {Math.round(totalPending).toLocaleString()}
            <span className="ml-1 font-mono text-sm text-mute">DH</span>
          </p>
        </StickerCard>
        <StickerCard className="justify-center gap-1 p-5">
          <p className="flex items-center gap-1.5 eyebrow tracking-[0.16em] text-mute">
            <XCircle className="size-3.5" aria-hidden="true" />
            Échoués
          </p>
          <p className="font-display text-3xl font-extrabold tabular-nums text-coral">
            {Math.round(totalFailed).toLocaleString()}
            <span className="ml-1 font-mono text-sm text-mute">DH</span>
          </p>
        </StickerCard>
      </div>

      {/* Payout list */}
      <div className="space-y-2">
        <p className="eyebrow tracking-[0.16em] text-mute">Historique des virements</p>
        {payouts.length === 0 ? (
          <NivEmpty
            mood="calm"
            title="Ton premier virement arrive bientôt"
            description="Après le 1er cycle de versement, tes virements s'affichent ici. T'inquiète."
          />
        ) : (
          <div className="space-y-3">
            {payouts.map((p) => (
              <StickerCard key={p.id} variant="hover" className="p-4">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div className="min-w-0">
                    <p className="font-display text-lg font-extrabold tabular-nums text-ink">
                      {Math.round(num(p.total_dh)).toLocaleString()}
                      <span className="ml-1 font-mono text-sm text-mute">DH</span>
                    </p>
                    <p className="font-mono text-xs text-mute">
                      {formatPeriod(p.period_start, p.period_end)}
                      {p.reference ? ` · ${p.reference}` : ""}
                    </p>
                  </div>
                  <div className="text-right">
                    {statusBadge(p.status)}
                    <p className="mt-1 font-mono text-xs text-mute">
                      {p.paid_at
                        ? `Payé le ${formatDate(p.paid_at)}`
                        : `Créé le ${formatDate(p.created_at)}`}
                    </p>
                  </div>
                </div>
              </StickerCard>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
