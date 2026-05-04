import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Search, Download, Filter, ArrowUpRight, ArrowDownRight } from "lucide-react"

export default function PartnerTransactionsPage() {
  const transactions = [
    { id: 1, customer: "Ahmed K.", amount: 250, discount: 25, date: "15 Jan 2024, 14:30", offer: "-15% Gold", status: "completed" },
    { id: 2, customer: "Sara M.", amount: 180, discount: 36, date: "15 Jan 2024, 11:15", offer: "Boisson offerte", status: "completed" },
    { id: 3, customer: "Youssef B.", amount: 320, discount: 32, date: "14 Jan 2024, 18:45", offer: "2ème à -50%", status: "completed" },
    { id: 4, customer: "Fatima Z.", amount: 150, discount: 15, date: "14 Jan 2024, 10:00", offer: "-15% Gold", status: "completed" },
    { id: 5, customer: "Omar L.", amount: 420, discount: 42, date: "13 Jan 2024, 16:20", offer: "-15% Platinum", status: "completed" },
    { id: 6, customer: "Nadia R.", amount: 95, discount: 0, date: "13 Jan 2024, 09:30", offer: "Boisson offerte", status: "pending" },
  ]

  const totalAmount = transactions.reduce((sum, t) => sum + t.amount, 0)
  const totalDiscount = transactions.reduce((sum, t) => sum + t.discount, 0)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black text-white">Transactions</h1>
          <p className="text-zinc-400">Historique des transactions Teen Club</p>
        </div>
        <Button variant="outline" className="border-zinc-700 text-zinc-300 hover:text-white">
          <Download className="h-4 w-4 mr-2" />
          Exporter CSV
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-zinc-400">Ce mois</p>
                <p className="text-2xl font-black text-white">{transactions.length}</p>
              </div>
              <ArrowUpRight className="h-5 w-5 text-emerald-400" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-zinc-400">CA Total</p>
                <p className="text-2xl font-black text-white">{totalAmount.toLocaleString()} DH</p>
              </div>
              <ArrowUpRight className="h-5 w-5 text-emerald-400" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-zinc-400">Remises accordées</p>
                <p className="text-2xl font-black text-amber-400">{totalDiscount.toLocaleString()} DH</p>
              </div>
              <ArrowDownRight className="h-5 w-5 text-amber-400" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-zinc-400">Panier moyen</p>
                <p className="text-2xl font-black text-white">{Math.round(totalAmount / transactions.length)} DH</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search & Filters */}
      <div className="flex gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
          <Input
            placeholder="Rechercher par client, offre..."
            className="pl-10 bg-zinc-900 border-zinc-800 text-white placeholder:text-zinc-500"
          />
        </div>
        <Button variant="outline" className="border-zinc-700 text-zinc-300">
          <Filter className="h-4 w-4 mr-2" />
          Filtrer
        </Button>
      </div>

      {/* Transactions List */}
      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader>
          <CardTitle className="text-white">Historique</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {transactions.map((tx) => (
              <div
                key={tx.id}
                className="flex items-center justify-between p-4 rounded-xl bg-zinc-950 border border-zinc-800 hover:border-zinc-700 transition-all"
              >
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-full bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center text-white font-bold">
                    {tx.customer.charAt(0)}
                  </div>
                  <div>
                    <p className="font-semibold text-white">{tx.customer}</p>
                    <p className="text-xs text-zinc-400">{tx.date}</p>
                  </div>
                </div>
                <div className="text-center">
                  <p className="text-xs text-zinc-500">Offre utilisée</p>
                  <p className="text-sm text-zinc-300">{tx.offer}</p>
                </div>
                <div className="text-right">
                  <p className="font-black text-white">{tx.amount} DH</p>
                  {tx.discount > 0 && (
                    <p className="text-xs text-emerald-400">-{tx.discount} DH remise</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
