import type { Metadata } from "next"
import { NivEmpty } from "@/components/brand"
import { Cake } from "lucide-react"

export const metadata: Metadata = { title: "Anniversaires — Partenaire" }

// Refonte V1.5 (#101) — file des commandes d'anniversaire (anniv_orders) pour
// partenaires venue/food accepts_birthday.
export default function PartnerAnniversairesPage() {
  return (
    <div className="space-y-6 pt-6">
      <header className="space-y-2">
        <p className="eyebrow">Réservations</p>
        <h1 className="font-display text-4xl font-extrabold tracking-tight flex items-center gap-2">
          <Cake className="w-8 h-8 text-pink" /> <span>Anni<em className="font-semibold italic text-pink">versaires</em></span>
        </h1>
        <p className="text-mute max-w-md">Les demandes de packs anniversaire à accepter ou décliner.</p>
      </header>
      <NivEmpty
        mood="happy"
        title="Aucune demande pour l'instant"
        description="Dès qu'un ado réserve un pack anniversaire chez toi, sa demande débarque ici. Tu n'as plus qu'à dire oui."
      />
    </div>
  )
}
