import { StickerCard } from "@/components/ui/sticker-card"
import { StatHero, NivEmpty } from "@/components/brand"
import { getUserRole } from "@/lib/auth/get-user-role"
import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"

type PartnerTransactionRow = {
  id: string
  partner_id: string | null
  teen_id: string | null
  amount_dh: number | null
  amount_coins: number | null
  cashback_xp: number | null
  commission_dh: number | null
  status: string | null
  scanner_user_id: string | null
  scanned_at: string | null
  created_at: string | null
}

const DATE_FMT = new Intl.DateTimeFormat("fr-FR", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
})

function formatDate(value: string | null): string {
  if (!value) return ""
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return ""
  return DATE_FMT.format(d)
}

function maskTeenId(teenId: string | null): string {
  if (!teenId) return "Membre"
  // Short, anonymous reference (privacy-friendly; matches existing "Teen #..." UX).
  return `Teen #${teenId.replace(/-/g, "").slice(0, 4).toUpperCase()}`
}

/** Pill mono UPPERCASE bordure ink — palette charte par statut. */
function StatusPill({ status }: { status: string | null }) {
  const map: Record<string, { label: string; tint: string }> = {
    succeeded: { label: "Validée", tint: "bg-lime/20" },
    pending: { label: "En attente", tint: "bg-gold/20" },
    refunded: { label: "Remboursée", tint: "bg-teal/20" },
    failed: { label: "Échec", tint: "bg-coral/20" },
  }
  const cfg = status ? map[status] : undefined
  return (
    <span
      className={`inline-block rounded-full border-2 border-ink px-2.5 py-0.5 font-mono text-[11px] font-bold uppercase tracking-[0.08em] text-ink ${
        cfg?.tint ?? "bg-white"
      }`}
    >
      {cfg?.label ?? status ?? "—"}
    </span>
  )
}

export default async function PartnerTransactionsPage() {
  const userInfo = await getUserRole()

  if (!userInfo) {
    redirect("/auth/login")
  }

  const partnerId = userInfo.role === "partner" ? userInfo.partnerData?.id : null

  if (!partnerId) {
    return (
      <div className="space-y-6">
        <div>
          <p className="eyebrow tracking-[0.16em] text-mute">Tes ventes</p>
          <h1 className="font-display text-3xl font-extrabold tracking-tight text-ink">
            Tes <em className="font-semibold italic text-pink">transactions</em>
          </h1>
          <p className="text-mute">L'historique de tes encaissements Teen Club</p>
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

  const supabase = await createClient()

  // Month-to-date window for the KPI cards.
  const startOfMonth = new Date()
  startOfMonth.setDate(1)
  startOfMonth.setHours(0, 0, 0, 0)

  // Polish-F: wrap with try/catch so a thrown query degrades to zeroed KPIs
  // and an inline banner instead of 500-ing the route.
  let monthRows: Pick<
    PartnerTransactionRow,
    "id" | "amount_dh" | "commission_dh" | "status"
  >[] = []
  let loadError: string | null = null
  try {
    const { data: monthData, error } = await supabase
      .from("partner_transactions")
      .select("id, amount_dh, commission_dh, status")
      .eq("partner_id", partnerId)
      .gte("created_at", startOfMonth.toISOString())
    if (error) {
      console.error("[partner/transactions] month error:", error)
      loadError = "Impossible de charger les statistiques du mois."
    } else {
      monthRows = (monthData ?? []) as typeof monthRows
    }
  } catch (err) {
    console.error("[partner/transactions] month threw:", err)
    loadError = "Impossible de charger les statistiques du mois."
  }

  const monthCount = monthRows.length
  const monthRevenue = monthRows.reduce((s, r) => s + Number(r.amount_dh || 0), 0)
  const monthCommission = monthRows.reduce((s, r) => s + Number(r.commission_dh || 0), 0)
  const monthAverage = monthCount > 0 ? Math.round(monthRevenue / monthCount) : 0

  // Latest 50 transactions, regardless of date, for the history list.
  let transactions: PartnerTransactionRow[] = []
  try {
    const { data: recentData, error } = await supabase
      .from("partner_transactions")
      .select(
        "id, partner_id, teen_id, amount_dh, amount_coins, cashback_xp, commission_dh, status, scanner_user_id, scanned_at, created_at"
      )
      .eq("partner_id", partnerId)
      .order("created_at", { ascending: false })
      .limit(50)
    if (error) {
      console.error("[partner/transactions] recent error:", error)
      loadError = loadError ?? "Impossible de charger l'historique."
    } else {
      transactions = (recentData ?? []) as PartnerTransactionRow[]
    }
  } catch (err) {
    console.error("[partner/transactions] recent threw:", err)
    loadError = loadError ?? "Impossible de charger l'historique."
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <p className="eyebrow tracking-[0.16em] text-mute">Tes ventes</p>
        <h1 className="font-display text-3xl font-extrabold tracking-tight text-ink">
          Tes <em className="font-semibold italic text-pink">transactions</em>
        </h1>
        <p className="text-mute">L'historique de tes encaissements Teen Club</p>
      </div>

      {loadError && (
        <div
          role="alert"
          className="rounded-xl border-2 border-coral bg-coral/10 px-4 py-3 text-sm font-medium text-ink"
        >
          {loadError}
        </div>
      )}

      {/* Stats — hiérarchie 1-2-3 : le CA domine en surface sombre */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatHero
          eyebrow="CA total (ce mois)"
          value={Math.round(monthRevenue).toLocaleString()}
          unit="DH"
          tone="lime"
          className="sm:col-span-2"
          meta={`${monthCount} transaction${monthCount > 1 ? "s" : ""} ce mois`}
        />
        <StickerCard className="justify-center gap-1 p-5">
          <p className="eyebrow tracking-[0.16em] text-mute">Ce mois</p>
          <p className="font-display text-3xl font-extrabold tabular-nums text-ink">
            {monthCount}
          </p>
          <p className="font-mono text-xs text-mute">transactions</p>
        </StickerCard>
        <StickerCard className="justify-center gap-1 p-5">
          <p className="eyebrow tracking-[0.16em] text-mute">Commission Nivy</p>
          <p className="font-display text-3xl font-extrabold tabular-nums text-gold">
            {Math.round(monthCommission).toLocaleString()}
            <span className="ml-1 font-mono text-sm text-mute">DH</span>
          </p>
          <p className="font-mono text-xs text-mute">prélevée ce mois</p>
        </StickerCard>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StickerCard className="justify-center gap-1 p-5 sm:col-span-2 lg:col-span-1">
          <p className="eyebrow tracking-[0.16em] text-mute">Panier moyen</p>
          <p className="font-display text-3xl font-extrabold tabular-nums text-ink">
            {monthAverage.toLocaleString()}
            <span className="ml-1 font-mono text-sm text-mute">DH</span>
          </p>
        </StickerCard>
      </div>

      {/* Transactions List */}
      <div className="space-y-2">
        <p className="eyebrow tracking-[0.16em] text-mute">Historique</p>
        {transactions.length === 0 ? (
          <NivEmpty
            mood="calm"
            title="Rien pour le moment"
            description="Dès qu'un crew scanne ton QR code, l'opération pop ici en direct."
          />
        ) : (
          <div className="space-y-2">
            {transactions.map((tx) => {
              const display = maskTeenId(tx.teen_id)
              const initial = display.replace(/[^A-Z0-9]/gi, "").charAt(0) || "T"
              return (
                <StickerCard key={tx.id} variant="hover" className="p-4">
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="grid size-11 place-items-center rounded-xl border-2 border-ink bg-paper font-mono text-base font-bold text-ink">
                        {initial}
                      </div>
                      <div className="min-w-0">
                        <p className="font-display font-bold text-ink">{display}</p>
                        <p className="font-mono text-xs text-mute">
                          {formatDate(tx.created_at)}
                        </p>
                      </div>
                    </div>
                    <StatusPill status={tx.status} />
                    <div className="text-right">
                      <p className="font-display text-lg font-extrabold tabular-nums text-ink">
                        {Math.round(Number(tx.amount_dh || 0)).toLocaleString()}
                        <span className="ml-1 font-mono text-sm text-mute">DH</span>
                      </p>
                      {Number(tx.cashback_xp || 0) > 0 && (
                        <p className="font-mono text-xs text-gold">
                          +{tx.cashback_xp} XP cashback
                        </p>
                      )}
                    </div>
                  </div>
                </StickerCard>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
