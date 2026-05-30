import type { Metadata } from "next"
import { Niv } from "@/components/brand/niv"
import { Card } from "@/components/ui/card"
import { RotateCcw } from "lucide-react"

export const metadata: Metadata = { title: "Remboursements — Admin" }

// Refonte V1.5 (#107) — file des remboursements (admin-moderation §18/§22).
export default function AdminRefundsPage() {
  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <p className="eyebrow">Modération · Finances</p>
        <h1 className="text-3xl font-extrabold tracking-tight flex items-center gap-2">
          <RotateCcw className="w-7 h-7 text-pink" /> Remboursements
        </h1>
        <p className="text-mute">File des demandes de remboursement à traiter.</p>
      </header>
      <Card className="items-center text-center py-16">
        <Niv size={80} mood="calm" />
        <h3 className="text-lg font-black text-ink mt-4">Aucune demande en attente</h3>
        <p className="text-mute max-w-sm">Les demandes de remboursement apparaîtront ici pour validation.</p>
      </Card>
    </div>
  )
}
