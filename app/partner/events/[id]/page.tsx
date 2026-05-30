import type { Metadata } from "next"
import Link from "next/link"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"

export const metadata: Metadata = { title: "Éditer l'événement — Partenaire" }

// Refonte V1.5 (#101) — édition d'un événement organisateur.
export default async function PartnerEventEdit({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return (
    <div className="space-y-6 pt-6 max-w-2xl">
      <Button asChild variant="ghost" size="sm"><Link href="/partner/events"><ArrowLeft className="w-4 h-4 mr-1" />Événements</Link></Button>
      <header className="space-y-2">
        <p className="eyebrow">Organisateur</p>
        <h1 className="text-4xl font-extrabold tracking-tight">Éditer l'événement</h1>
        <p className="font-mono text-sm text-mute">ID : {id}</p>
      </header>
      <Card className="p-6"><div className="px-6 text-mute">Détails, billetterie, statut de modération et check-in à la porte.</div></Card>
    </div>
  )
}
