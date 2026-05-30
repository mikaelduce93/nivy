import type { Metadata } from "next"
import { Niv } from "@/components/brand/niv"
import { Card } from "@/components/ui/card"
import { Cake } from "lucide-react"

export const metadata: Metadata = { title: "Anniversaires — Partenaire" }

// Refonte V1.5 (#101) — file des commandes d'anniversaire (anniv_orders) pour
// partenaires venue/food accepts_birthday.
export default function PartnerAnniversairesPage() {
  return (
    <div className="space-y-6 pt-6">
      <header className="space-y-2">
        <p className="eyebrow">Réservations</p>
        <h1 className="text-4xl font-extrabold tracking-tight flex items-center gap-2">
          <Cake className="w-8 h-8 text-pink" /> Anniversaires
        </h1>
        <p className="text-mute max-w-md">Les demandes de packs anniversaire à accepter/décliner.</p>
      </header>
      <Card className="items-center text-center py-16">
        <Niv size={84} mood="happy" />
        <h3 className="text-lg font-black text-ink mt-4">Aucune demande en attente</h3>
        <p className="text-mute max-w-sm">Les commandes d'anniversaire arriveront ici.</p>
      </Card>
    </div>
  )
}
