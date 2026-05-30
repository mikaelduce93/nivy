import { getUserRole } from "@/lib/auth/get-user-role"
import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { Button } from "@/components/ui/button"
import { StickerCard } from "@/components/ui/sticker-card"
import { StatusBadge, type StatusVariant } from "@/components/ui/status-badge"
import { StatHero, NivEmpty } from "@/components/brand"
import { Wallet, ArrowDownToLine, Clock, AlertCircle, ArrowLeft } from "lucide-react"
import Link from "next/link"
import { WithdrawalForm } from "@/components/ambassador/withdrawal-form"

async function getWithdrawalData(profileId: string) {
  const supabase = await createClient()

  // #29 — ambassadors keyed on user_id; the row no longer stores totals.
  const { data: ambassador } = await supabase
    .from("ambassadors")
    .select("id")
    .eq("user_id", profileId)
    .maybeSingle()

  if (!ambassador) return null

  // #29 — balances recomputed from ambassador_commissions (credits) and
  // ambassador_payouts (debits). ambassador_withdrawals never existed.
  const [{ data: commissionRows }, { data: payoutRows }] = await Promise.all([
    supabase
      .from("ambassador_commissions")
      .select("amount_dh")
      .eq("ambassador_id", ambassador.id),
    supabase
      .from("ambassador_payouts")
      .select("id, amount_dh, status, method, created_at")
      .eq("ambassador_id", ambassador.id)
      .order("created_at", { ascending: false }),
  ])

  const payouts = payoutRows || []
  const totalEarnings = (commissionRows || []).reduce((s, c) => s + (Number(c.amount_dh) || 0), 0)
  // ambassador_payouts.status ∈ {pending, paid, failed}.
  const pendingWithdrawals = payouts
    .filter((p) => p.status === "pending")
    .reduce((s, p) => s + (Number(p.amount_dh) || 0), 0)
  const withdrawnAmount = payouts
    .filter((p) => p.status === "paid")
    .reduce((s, p) => s + (Number(p.amount_dh) || 0), 0)
  const availableBalance = totalEarnings - pendingWithdrawals - withdrawnAmount

  return {
    ambassadorId: ambassador.id,
    totalEarnings,
    pendingWithdrawals,
    withdrawnAmount,
    availableBalance,
    withdrawals: payouts.slice(0, 10),
  }
}

export default async function AmbassadorWithdrawalsPage() {
  const userInfo = await getUserRole()

  if (!userInfo || userInfo.role !== "ambassador") {
    redirect("/auth/redirect")
  }

  const data = await getWithdrawalData(userInfo.profileId)

  if (!data) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-paper p-6">
        <NivEmpty
          title="Compte non trouvé"
          description="Impossible de charger tes infos d'ambassadeur."
          action={
            <Button asChild variant="pink">
              <Link href="/ambassador">Retour au dashboard</Link>
            </Button>
          }
        />
      </div>
    )
  }

  const { ambassadorId, totalEarnings, pendingWithdrawals, withdrawnAmount, availableBalance, withdrawals } = data
  const minimumWithdrawal = 100 // 100 DH minimum

  // ambassador_payouts.status ∈ {pending, paid, failed} → StatusBadge charte.
  const getStatus = (status: string): { variant: StatusVariant; label: string } => {
    switch (status) {
      case "paid":
        return { variant: "success", label: "Effectué" }
      case "pending":
        return { variant: "pending", label: "En attente" }
      case "failed":
        return { variant: "danger", label: "Refusé" }
      default:
        return { variant: "neutral", label: "Inconnu" }
    }
  }

  return (
    <div className="min-h-screen bg-paper">
      <div className="container mx-auto px-6 py-32">
        {/* Back button */}
        <Button variant="ghost" asChild className="mb-6">
          <Link href="/ambassador">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Retour au dashboard
          </Link>
        </Button>

        {/* Header éditorial */}
        <div className="mb-8">
          <span className="eyebrow tracking-[0.16em] text-pink">Mes retraits</span>
          <h1 className="mt-2 font-display text-3xl font-extrabold tracking-tight text-ink">
            Récupère ton <em className="font-semibold italic text-pink">cash</em>, quand tu veux.
          </h1>
          <p className="mt-2 text-mute">Gère tes gains et demande un retrait.</p>
        </div>

        {/* Hiérarchie 1-2-3 : Disponible dominant + 3 soldes sticker */}
        <div className="mb-8 grid gap-4 lg:grid-cols-[1.2fr_2fr]">
          {/* Disponible — StatHero (montant retirable) */}
          <StatHero
            eyebrow="Disponible"
            value={availableBalance.toLocaleString()}
            unit="DH"
            tone="lime"
            icon={<Wallet className="h-5 w-5" />}
          />

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <StickerCard className="p-5">
              <div className="flex items-center justify-between">
                <span className="eyebrow tracking-[0.16em] text-mute">En attente</span>
                <Clock className="h-4 w-4 text-gold" />
              </div>
              <p className="mt-1 font-mono text-2xl font-bold tabular-nums text-ink">{pendingWithdrawals.toLocaleString()} DH</p>
            </StickerCard>

            <StickerCard className="p-5">
              <div className="flex items-center justify-between">
                <span className="eyebrow tracking-[0.16em] text-mute">Total retiré</span>
                <ArrowDownToLine className="h-4 w-4 text-teal" />
              </div>
              <p className="mt-1 font-mono text-2xl font-bold tabular-nums text-ink">{withdrawnAmount.toLocaleString()} DH</p>
            </StickerCard>

            <StickerCard className="p-5">
              <div className="flex items-center justify-between">
                <span className="eyebrow tracking-[0.16em] text-mute">Total gagné</span>
                <Wallet className="h-4 w-4 text-pink" />
              </div>
              <p className="mt-1 font-mono text-2xl font-bold tabular-nums text-ink">{totalEarnings.toLocaleString()} DH</p>
            </StickerCard>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Withdrawal Form */}
          <StickerCard className="p-6">
            <h2 className="mb-4 flex items-center gap-2 font-display text-lg font-extrabold text-ink">
              <ArrowDownToLine className="h-5 w-5 text-lime" />
              Demander un retrait
            </h2>
            {availableBalance >= minimumWithdrawal ? (
              <WithdrawalForm
                ambassadorId={ambassadorId}
                availableBalance={availableBalance}
                minimumWithdrawal={minimumWithdrawal}
              />
            ) : (
              <div className="py-8 text-center">
                <AlertCircle className="mx-auto mb-4 h-16 w-16 text-ink" />
                <h3 className="mb-2 font-display text-lg font-extrabold text-ink">Solde insuffisant</h3>
                <p className="mb-4 text-sm text-mute">
                  Il te faut au moins {minimumWithdrawal} DH de solde disponible pour demander un retrait.
                </p>
                <div className="rounded-xl border-2 border-line bg-white p-4">
                  <span className="eyebrow tracking-[0.16em] text-mute">Ton solde actuel</span>
                  <p className="mt-1 font-mono text-2xl font-bold tabular-nums text-ink">{availableBalance.toLocaleString()} DH</p>
                  <p className="mt-1 font-mono text-xs text-mute">
                    Il te manque {(minimumWithdrawal - availableBalance).toLocaleString()} DH
                  </p>
                </div>
              </div>
            )}
          </StickerCard>

          {/* Withdrawal History */}
          <StickerCard className="p-6">
            <h2 className="mb-4 flex items-center gap-2 font-display text-lg font-extrabold text-ink">
              <Clock className="h-5 w-5 text-gold" />
              Historique des retraits
            </h2>
            <div className="space-y-3">
              {withdrawals.length > 0 ? (
                withdrawals.map((withdrawal: any) => {
                  const status = getStatus(withdrawal.status)
                  const date = new Date(withdrawal.created_at)
                  const dateText = date.toLocaleDateString('fr-FR', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric'
                  })

                  return (
                    <div
                      key={withdrawal.id}
                      className="flex items-center justify-between rounded-xl border-2 border-line bg-white p-4"
                    >
                      <div>
                        <p className="font-mono text-lg font-bold tabular-nums text-ink">{Number(withdrawal.amount_dh).toLocaleString()} DH</p>
                        <p className="font-mono text-xs text-mute">{dateText}</p>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <StatusBadge variant={status.variant} label={status.label} />
                        {withdrawal.method && (
                          <p className="font-mono text-[11px] capitalize text-mute">{withdrawal.method}</p>
                        )}
                      </div>
                    </div>
                  )
                })
              ) : (
                <NivEmpty
                  title="Aucun retrait effectué"
                  description="Tes retraits apparaîtront ici une fois demandés."
                />
              )}
            </div>
          </StickerCard>
        </div>
      </div>
    </div>
  )
}
