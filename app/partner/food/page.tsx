import type { Metadata } from "next"
import Link from "next/link"
import { Card } from "@/components/ui/card"
import { UtensilsCrossed, ClipboardList, ChefHat } from "lucide-react"

export const metadata: Metadata = { title: "Restaurant — Partenaire" }

// Refonte V1.5 (#101) — workspace restaurant type-aware (food). Remplace le
// namespace /partner/restaurant non lié à la sidebar (partner-ecosystem D10).
export default function PartnerFoodDashboard() {
  return (
    <div className="space-y-8 pt-6">
      <header className="space-y-2">
        <p className="eyebrow">Restaurant</p>
        <h1 className="text-4xl font-extrabold tracking-tight">
          Ton <span className="text-pink italic">resto</span> sur Nivy
        </h1>
        <p className="text-mute max-w-md">Gère ton menu et tes commandes en un endroit.</p>
      </header>
      <div className="grid gap-4 sm:grid-cols-3">
        <Link href="/partner/food/menu"><Card className="gap-2 h-full hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-stkr"><div className="px-6 flex items-center gap-2 text-ink font-bold"><ChefHat className="w-5 h-5 text-coral" />Menu</div><p className="px-6 text-sm text-mute">Plats, prix, disponibilité.</p></Card></Link>
        <Link href="/partner/food/orders"><Card className="gap-2 h-full hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-stkr"><div className="px-6 flex items-center gap-2 text-ink font-bold"><ClipboardList className="w-5 h-5 text-teal" />Commandes</div><p className="px-6 text-sm text-mute">Ticker cuisine en temps réel.</p></Card></Link>
        <Card className="gap-2"><div className="px-6 flex items-center gap-2 text-ink font-bold"><UtensilsCrossed className="w-5 h-5 text-gold" />Stats</div><p className="px-6 text-sm text-mute">CA et plats populaires.</p></Card>
      </div>
    </div>
  )
}
