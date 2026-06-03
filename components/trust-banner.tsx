import { Shield, Award, Lock } from 'lucide-react'
import { getEscrowConfig } from '@/lib/config/app-config'

// Bandeau de réassurance — charte paper néo-brutaliste : fond crème, bordure 2px
// ink, pas de dégradé. Chaque claim est vérifiable (politique produit), aucun
// chiffre de notoriété non sourcé. L'affirmation d'escrow vient de la source
// unique (#289), conditionnelle tant que le tiers e-money n'est pas nommé.
const ITEMS = [
  { icon: Shield, title: '13–17 ans uniquement', sub: "Contrôle d'âge" },
  { icon: Award, title: 'BAM-conforme', sub: getEscrowConfig().short },
  { icon: Lock, title: 'CNDP loi 09-08', sub: 'Données protégées' },
] as const

export function TrustBanner() {
  return (
    <div className="border-y-2 border-ink bg-paper-2">
      <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {ITEMS.map(({ icon: Icon, title, sub }) => (
            <div key={title} className="flex items-center gap-3">
              <span className="grid size-10 shrink-0 place-items-center rounded-lg border-2 border-ink bg-white text-ink" aria-hidden="true">
                <Icon className="size-5" />
              </span>
              <div>
                <p className="text-sm font-semibold text-ink">{title}</p>
                <p className="text-xs text-mute">{sub}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
