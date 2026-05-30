import type { Metadata } from "next"
import Link from "next/link"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"

export const metadata: Metadata = { title: "Détail réservation — Admin" }

// Refonte V1.5 (#107) — détail réservation (lien cassé corrigé).
export default async function AdminReservationDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return (
    <div className="space-y-6 max-w-3xl">
      <Button asChild variant="ghost" size="sm"><Link href="/admin/reservations"><ArrowLeft className="w-4 h-4 mr-1" />Réservations</Link></Button>
      <header className="space-y-2">
        <p className="eyebrow">Réservation</p>
        <h1 className="text-3xl font-extrabold tracking-tight">Détail</h1>
        <p className="font-mono text-sm text-mute">ID : {id}</p>
      </header>
      <Card className="p-6"><div className="px-6 text-mute">Événement, ado, paiement, statut d'approbation parentale et check-in.</div></Card>
    </div>
  )
}
