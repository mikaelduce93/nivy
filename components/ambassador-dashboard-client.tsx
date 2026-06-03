"use client"

import { TrendingUp, Users, DollarSign, Calendar, Copy } from "lucide-react"
import { Button } from "@/components/ui/button"
// Use the lazy wrapper so recharts isn't pulled into the initial JS payload.
import { AnalyticsChart } from "@/components/analytics-chart-lazy"
import { toast } from "sonner"

interface AmbassadorDashboardClientProps {
  ambassador: any
  referrals: any[]
}

export function AmbassadorDashboardClient({ ambassador, referrals }: AmbassadorDashboardClientProps) {
  const totalEarnings = referrals.reduce((sum, ref) => sum + (ref.commission_amount || 0), 0)
  const pendingEarnings = referrals
    .filter((r) => r.bookings?.payment_status === "pending")
    .reduce((sum, ref) => sum + (ref.commission_amount || 0), 0)
  const paidEarnings = referrals
    .filter((r) => r.bookings?.payment_status === "paid")
    .reduce((sum, ref) => sum + (ref.commission_amount || 0), 0)

  // Prepare earnings chart data (last 6 months)
  const earningsByMonth =
    referrals
      .reduce(
        (acc, referral) => {
          const month = new Date(referral.created_at).toLocaleDateString("fr-FR", {
            month: "short",
            year: "numeric",
          })
          const existing = acc.find((item: { name: string; gains: number }) => item.name === month)
          if (existing) {
            existing.gains += referral.commission_amount || 0
          } else {
            acc.push({ name: month, gains: referral.commission_amount || 0 })
          }
          return acc
        },
        [] as { name: string; gains: number }[],
      )
      .slice(-6) || []

  // Prepare referrals by status
  const referralsByStatus = [
    { name: "Payés", value: referrals.filter((r) => r.bookings?.payment_status === "paid").length },
    { name: "En attente", value: referrals.filter((r) => r.bookings?.payment_status === "pending").length },
    { name: "Annulés", value: referrals.filter((r) => r.bookings?.payment_status === "cancelled").length },
  ].filter((item) => item.value > 0)

  const handleCopyPromoCode = () => {
    navigator.clipboard.writeText(ambassador.promo_code)
    toast.success("Code promo copié!")
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-6 py-32">
        <div className="mb-12">
          <h1 className="text-4xl md:text-6xl font-black text-ink mb-4">Dashboard Ambassadeur</h1>
          <p className="text-mute">Bienvenue {ambassador.stage_name || "ambassadeur"}</p>
        </div>

        {/* Stats Cards */}
        <div className="grid md:grid-cols-4 gap-6 mb-12">
          <div className="bg-gradient-to-br from-paper-2 to-card rounded-2xl p-6 border border-ink">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-lg bg-teal/20 flex items-center justify-center">
                <Users className="w-5 h-5 text-teal" />
              </div>
              <p className="text-mute text-sm">Total Référés</p>
            </div>
            <p className="text-4xl font-black text-ink">{ambassador.total_referrals}</p>
          </div>

          <div className="bg-gradient-to-br from-paper-2 to-card rounded-2xl p-6 border border-ink">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-lg bg-lime/20 flex items-center justify-center">
                <DollarSign className="w-5 h-5 text-lime" />
              </div>
              <p className="text-mute text-sm">Gains Totaux</p>
            </div>
            <p className="text-4xl font-black text-ink">{totalEarnings.toFixed(2)} DH</p>
          </div>

          <div className="bg-gradient-to-br from-paper-2 to-card rounded-2xl p-6 border border-ink">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-lg bg-gold/20 flex items-center justify-center">
                <Calendar className="w-5 h-5 text-gold" />
              </div>
              <p className="text-mute text-sm">En Attente</p>
            </div>
            <p className="text-4xl font-black text-ink">{pendingEarnings.toFixed(2)} DH</p>
          </div>

          <div className="bg-gradient-to-br from-paper-2 to-card rounded-2xl p-6 border border-ink">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-lg bg-pink/20 flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-pink" />
              </div>
              <p className="text-mute text-sm">Commission</p>
            </div>
            <p className="text-4xl font-black text-ink">{ambassador.commission_rate}%</p>
          </div>
        </div>

        {/* Promo Code */}
        <div className="bg-gradient-to-br from-teal/10 to-teal/10 rounded-2xl p-8 border border-teal/30 mb-12">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-mute text-sm mb-2">Ton code promo personnel</p>
              <p className="text-4xl font-black text-teal">{ambassador.promo_code}</p>
              <p className="text-mute text-sm mt-2">
                Partage ce code pour gagner {ambassador.commission_rate}% sur chaque réservation
              </p>
            </div>
            <Button className="bg-teal hover:bg-teal text-ink border-0" onClick={handleCopyPromoCode}>
              <Copy className="w-5 h-5" />
            </Button>
          </div>
        </div>

        {/* Analytics Charts */}
        {earningsByMonth.length > 0 && (
          <div className="grid lg:grid-cols-2 gap-8 mb-8">
            <AnalyticsChart
              data={earningsByMonth}
              type="area"
              dataKey="gains"
              xAxisKey="name"
              title="Évolution des gains"
              description="Commissions gagnées au cours des 6 derniers mois"
              color="#10b981"
            />

            {referralsByStatus.length > 0 && (
              <AnalyticsChart
                data={referralsByStatus}
                type="pie"
                dataKey="value"
                title="Statut des référencements"
                description="Répartition des référencements par statut"
              />
            )}
          </div>
        )}

        {/* Recent Referrals */}
        <div className="bg-gradient-to-br from-paper-2 to-card rounded-2xl p-8 border border-ink">
          <h2 className="text-2xl font-bold text-ink mb-6">Tes Référencements Récents</h2>

          {referrals && referrals.length > 0 ? (
            <div className="space-y-4">
              {referrals.map((referral) => (
                <div
                  key={referral.id}
                  className="bg-card rounded-2xl p-6 border border-ink flex items-center justify-between"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <p className="text-ink font-bold">{referral.bookings?.booking_reference}</p>
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-semibold ${
                          referral.bookings?.payment_status === "paid"
                            ? "bg-lime/20 text-lime"
                            : referral.bookings?.payment_status === "pending"
                              ? "bg-gold/20 text-gold"
                              : "bg-destructive/20 text-destructive"
                        }`}
                      >
                        {referral.bookings?.payment_status === "paid"
                          ? "Payée"
                          : referral.bookings?.payment_status === "pending"
                            ? "En attente"
                            : "Annulée"}
                      </span>
                    </div>
                    <p className="text-mute text-sm">
                      {referral.bookings?.events?.title} - {referral.bookings?.events?.city}
                    </p>
                    <p className="text-xs text-mute mt-1">
                      {new Date(referral.created_at).toLocaleDateString("fr-FR")}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-black text-teal">{referral.commission_amount?.toFixed(2)} DH</p>
                    <p className="text-xs text-mute">Commission</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <Users className="w-16 h-16 text-ink mx-auto mb-4" />
              <p className="text-mute">Aucun référencement pour le moment</p>
              <p className="text-sm text-mute mt-2">Partage ton code promo pour commencer à gagner</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
