import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { TrendingUp, TrendingDown, Users, ShoppingBag, Tag, Calendar, Download } from "lucide-react"

export default function PartnerStatsPage() {
  const monthlyStats = [
    { month: "Janvier", transactions: 156, revenue: 12450, newCustomers: 23 },
    { month: "Décembre", transactions: 142, revenue: 11200, newCustomers: 19 },
    { month: "Novembre", transactions: 128, revenue: 9800, newCustomers: 15 },
    { month: "Octobre", transactions: 115, revenue: 8500, newCustomers: 12 },
  ]

  const topOffers = [
    { name: "-15% Gold/Platinum", uses: 89, revenue: 5200 },
    { name: "Boisson offerte", uses: 67, revenue: 3400 },
    { name: "2ème article -50%", uses: 45, revenue: 2800 },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black text-white">Statistiques</h1>
          <p className="text-zinc-400">Analysez vos performances Teen Club</p>
        </div>
        <Button variant="outline" className="border-zinc-700 text-zinc-300 hover:text-white">
          <Download className="h-4 w-4 mr-2" />
          Rapport PDF
        </Button>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-emerald-500/20 to-teal-500/20 border-emerald-500/30 bg-zinc-900">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-2">
              <ShoppingBag className="h-6 w-6 text-emerald-400" />
              <div className="flex items-center text-emerald-400 text-xs">
                <TrendingUp className="h-3 w-3 mr-1" />
                +12%
              </div>
            </div>
            <p className="text-3xl font-black text-white">541</p>
            <p className="text-sm text-zinc-400">Transactions totales</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-500/20 to-cyan-500/20 border-blue-500/30 bg-zinc-900">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-2">
              <Users className="h-6 w-6 text-blue-400" />
              <div className="flex items-center text-emerald-400 text-xs">
                <TrendingUp className="h-3 w-3 mr-1" />
                +8%
              </div>
            </div>
            <p className="text-3xl font-black text-white">89</p>
            <p className="text-sm text-zinc-400">Clients uniques</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-500/20 to-pink-500/20 border-purple-500/30 bg-zinc-900">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-2">
              <TrendingUp className="h-6 w-6 text-purple-400" />
              <div className="flex items-center text-emerald-400 text-xs">
                <TrendingUp className="h-3 w-3 mr-1" />
                +15%
              </div>
            </div>
            <p className="text-3xl font-black text-white">41,950 DH</p>
            <p className="text-sm text-zinc-400">Chiffre d'affaires</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-amber-500/20 to-orange-500/20 border-amber-500/30 bg-zinc-900">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-2">
              <Tag className="h-6 w-6 text-amber-400" />
            </div>
            <p className="text-3xl font-black text-white">201</p>
            <p className="text-sm text-zinc-400">Offres utilisées</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Section */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Monthly Evolution */}
        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Calendar className="h-5 w-5 text-emerald-400" />
              Évolution mensuelle
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {monthlyStats.map((stat, i) => (
                <div key={stat.month} className="flex items-center gap-4">
                  <div className="w-20 text-sm text-zinc-400">{stat.month}</div>
                  <div className="flex-1">
                    <div className="h-8 bg-zinc-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full flex items-center justify-end pr-3"
                        style={{ width: `${(stat.revenue / 15000) * 100}%` }}
                      >
                        <span className="text-xs font-bold text-white">{stat.revenue.toLocaleString()} DH</span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-white">{stat.transactions}</p>
                    <p className="text-xs text-zinc-500">transactions</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Top Offers */}
        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Tag className="h-5 w-5 text-amber-400" />
              Top offres
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {topOffers.map((offer, i) => (
              <div
                key={offer.name}
                className="flex items-center justify-between p-4 rounded-xl bg-zinc-800 border border-zinc-700"
              >
                <div className="flex items-center gap-3">
                  <div className={`h-10 w-10 rounded-full flex items-center justify-center font-bold text-white ${
                    i === 0 ? "bg-yellow-500" : i === 1 ? "bg-zinc-400" : "bg-amber-700"
                  }`}>
                    {i + 1}
                  </div>
                  <div>
                    <p className="font-semibold text-white">{offer.name}</p>
                    <p className="text-xs text-zinc-400">{offer.uses} utilisations</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-black text-emerald-400">{offer.revenue.toLocaleString()} DH</p>
                  <p className="text-xs text-zinc-500">générés</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Customer Breakdown */}
      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader>
          <CardTitle className="text-white">Répartition par niveau</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-4 gap-4">
            {[
              { level: "Platinum", count: 12, color: "from-violet-500 to-purple-500" },
              { level: "Gold", count: 28, color: "from-yellow-500 to-amber-500" },
              { level: "Silver", count: 35, color: "from-gray-400 to-gray-500" },
              { level: "Bronze", count: 14, color: "from-orange-600 to-orange-700" },
            ].map((item) => (
              <div key={item.level} className="text-center p-4 rounded-xl bg-zinc-800">
                <div className={`h-16 w-16 mx-auto rounded-full bg-gradient-to-br ${item.color} flex items-center justify-center mb-3`}>
                  <span className="text-2xl font-black text-white">{item.count}</span>
                </div>
                <p className="font-semibold text-white">{item.level}</p>
                <p className="text-xs text-zinc-400">clients</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
