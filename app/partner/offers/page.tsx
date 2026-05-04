import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Plus, Tag, Edit, Trash2, ToggleLeft, ToggleRight } from "lucide-react"
import Link from "next/link"

export default function PartnerOffersPage() {
  const offers = [
    { id: 1, name: "-15% pour membres Gold/Platinum", type: "Réduction", uses: 34, active: true, created: "15 Jan 2024" },
    { id: 2, name: "Boisson offerte dès 100 DH", type: "Cadeau", uses: 28, active: true, created: "10 Jan 2024" },
    { id: 3, name: "2ème article à -50%", type: "Promo", uses: 12, active: true, created: "5 Jan 2024" },
    { id: 4, name: "Livraison gratuite", type: "Service", uses: 45, active: false, created: "1 Jan 2024" },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black text-white">Mes Offres</h1>
          <p className="text-zinc-400">Gérez vos offres exclusives Teen Club</p>
        </div>
        <Button asChild className="bg-emerald-500 hover:bg-emerald-600 text-white">
          <Link href="/partner/offers/new">
            <Plus className="h-4 w-4 mr-2" />
            Nouvelle offre
          </Link>
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="p-4 text-center">
            <p className="text-3xl font-black text-white">{offers.filter(o => o.active).length}</p>
            <p className="text-sm text-zinc-400">Offres actives</p>
          </CardContent>
        </Card>
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="p-4 text-center">
            <p className="text-3xl font-black text-emerald-400">{offers.reduce((sum, o) => sum + o.uses, 0)}</p>
            <p className="text-sm text-zinc-400">Utilisations totales</p>
          </CardContent>
        </Card>
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="p-4 text-center">
            <p className="text-3xl font-black text-white">{offers.length}</p>
            <p className="text-sm text-zinc-400">Total offres</p>
          </CardContent>
        </Card>
      </div>

      {/* Offers List */}
      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader>
          <CardTitle className="text-white">Toutes les offres</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {offers.map((offer) => (
            <div
              key={offer.id}
              className={`flex items-center justify-between p-4 rounded-xl border transition-all ${
                offer.active
                  ? "bg-zinc-900 border-zinc-800 hover:border-emerald-500/30"
                  : "bg-zinc-950 border-zinc-900 opacity-60"
              }`}
            >
              <div className="flex items-center gap-4">
                <div className={`h-12 w-12 rounded-xl flex items-center justify-center ${
                  offer.active ? "bg-emerald-500/20" : "bg-zinc-800"
                }`}>
                  <Tag className={`h-6 w-6 ${offer.active ? "text-emerald-400" : "text-zinc-500"}`} />
                </div>
                <div>
                  <p className="font-semibold text-white">{offer.name}</p>
                  <div className="flex items-center gap-3 text-xs text-zinc-400">
                    <span className="px-2 py-0.5 rounded bg-zinc-800">{offer.type}</span>
                    <span>{offer.uses} utilisations</span>
                    <span>Créée le {offer.created}</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="icon" className="text-zinc-400 hover:text-white">
                  {offer.active ? <ToggleRight className="h-5 w-5 text-emerald-400" /> : <ToggleLeft className="h-5 w-5" />}
                </Button>
                <Button variant="ghost" size="icon" className="text-zinc-400 hover:text-white">
                  <Edit className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" className="text-zinc-400 hover:text-red-400">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}
