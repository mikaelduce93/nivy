import type { Metadata } from "next"
import { PricingSticker, PricingGrid } from "@/components/sticker/pricing-sticker"
import { ShieldCheck } from "lucide-react"

export const metadata: Metadata = { title: "Plan famille" }

const PLANS = [
  { id: "free", name: "Free", price: "0", per: "DH", feats: ["1 ado", "Plafonds de base", "Suivi des dépenses"], popular: false },
  { id: "family", name: "Family", price: "49", per: "DH/mois", feats: ["Jusqu'à 4 ados", "Plafonds avancés", "Multi-parent", "Support prioritaire"], popular: true },
  { id: "family-plus", name: "Family+", price: "89", per: "DH/mois", feats: ["Ados illimités", "Tout Family", "Rapports mensuels", "Conseiller dédié"], popular: false },
]

// Refonte V1.5 (#106) — plan famille multi-enfants (spec §10 / economy).
// V2 (#120) — consomme <PricingSticker> (kit F10) au lieu du JSX inline.
export default function FamilyPlanPage() {
  return (
    <div className="space-y-8 pt-6">
      <header className="space-y-2">
        <p className="eyebrow">Abonnement</p>
        <h1 className="text-4xl font-extrabold tracking-tight">
          Plan <span className="text-pink italic">famille</span>
        </h1>
        <p className="text-mute max-w-md">Un seul abonnement pour toute la fratrie.</p>
      </header>

      <PricingGrid>
        {PLANS.map((p) => (
          <PricingSticker
            key={p.id}
            name={p.name}
            price={p.price}
            per={p.per}
            features={p.feats}
            popular={p.popular}
            niv={p.popular ? "proud" : undefined}
            cta={{ label: "Choisir", href: `/carte-vip/souscrire?plan=${p.id}` }}
          />
        ))}
      </PricingGrid>

      <p className="flex items-center gap-2 text-sm text-mute">
        <ShieldCheck className="h-4 w-4 text-lime" />
        Sans engagement, annulable quand tu veux.
      </p>
    </div>
  )
}
