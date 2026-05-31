import type { Metadata } from "next"
import { NivEmpty } from "@/components/brand/niv-usage"
import { StatHero } from "@/components/brand/niv"
import { StatCard } from "@/components/admin/stat-card"
import { RotateCcw, Clock } from "lucide-react"

export const metadata: Metadata = { title: "Remboursements — Admin" }

// Refonte V1.5 (#107) — file des remboursements (admin-moderation §18/§22).
export default function AdminRefundsPage() {
  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <p className="eyebrow">Modération · Finances</p>
        <h1 className="font-display text-4xl font-extrabold tracking-tight text-ink">
          File des <em className="font-semibold italic text-pink">remboursements</em>
        </h1>
        <p className="text-mute">Demandes de remboursement à valider, montant par montant.</p>
      </header>

      <section className="grid gap-4 sm:grid-cols-2">
        <StatHero
          eyebrow="En attente"
          value={0}
          tone="coral"
          icon={<Clock className="h-6 w-6" />}
          meta="Aucune demande à traiter"
        />
        <StatCard
          label="Total à rembourser"
          value="0"
          tone="coral"
          mono
          icon={<RotateCcw className="h-5 w-5" />}
          hint="⊙ corail · DH"
        />
      </section>

      <NivEmpty
        mood="calm"
        title="Aucune demande en attente"
        description="Les demandes de remboursement apparaîtront ici pour validation."
      />
    </div>
  )
}
