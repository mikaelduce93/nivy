import type { Metadata } from "next"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Check } from "lucide-react"
import { cn } from "@/lib/utils"

export const metadata: Metadata = { title: "Plan famille" }

const PLANS = [
  { id: "free", name: "Free", price: "0", per: "DH", feats: ["1 ado", "Plafonds de base", "Suivi des dépenses"], popular: false },
  { id: "family", name: "Family", price: "49", per: "DH/mois", feats: ["Jusqu'à 4 ados", "Plafonds avancés", "Multi-parent", "Support prioritaire"], popular: true },
  { id: "family-plus", name: "Family+", price: "89", per: "DH/mois", feats: ["Ados illimités", "Tout Family", "Rapports mensuels", "Conseiller dédié"], popular: false },
]

// Refonte V1.5 (#106) — plan famille multi-enfants (spec §10 / economy).
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

      <div className="grid gap-4 md:grid-cols-3">
        {PLANS.map((p) => (
          <Card key={p.id} className={cn("relative", p.popular && "shadow-stkr -translate-y-1")}>
            {p.popular && (
              <span className="absolute -top-3 left-6 rounded-lg border-2 border-ink bg-pink px-3 py-0.5 text-[10px] font-black uppercase tracking-wider text-ink">
                Populaire
              </span>
            )}
            <div className="px-6 space-y-3">
              <p className="eyebrow">{p.name}</p>
              <p className="font-display text-4xl font-extrabold tracking-tight text-ink">
                {p.price}<span className="text-base text-mute font-medium ml-1">{p.per}</span>
              </p>
              <ul className="space-y-2 text-sm">
                {p.feats.map((f) => (
                  <li key={f} className="flex items-center gap-2 text-ink-2">
                    <span className="grid place-items-center w-4 h-4 rounded-full bg-lime"><Check className="w-3 h-3 text-ink" strokeWidth={3} /></span>
                    {f}
                  </li>
                ))}
              </ul>
              <Button variant={p.popular ? "pink" : "outline"} className="w-full">Choisir</Button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  )
}
