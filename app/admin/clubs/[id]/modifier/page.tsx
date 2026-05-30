import type { Metadata } from "next"
import Link from "next/link"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { FormField } from "@/components/ui/field"
import { ArrowLeft, Save } from "lucide-react"

export const metadata: Metadata = { title: "Modifier le club — Admin" }

// Refonte V1.5 (#107) — édition club (lien cassé corrigé). NB: routing §6 #12
// recommande à terme la fusion clubs → /admin/partners?type=venue.
export default async function AdminClubEdit({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return (
    <div className="space-y-6 max-w-2xl">
      <Button asChild variant="ghost" size="sm"><Link href="/admin/clubs"><ArrowLeft className="w-4 h-4 mr-1" />Clubs</Link></Button>
      <header className="space-y-2">
        <p className="eyebrow">Club</p>
        <h1 className="text-3xl font-extrabold tracking-tight">Modifier</h1>
        <p className="font-mono text-sm text-mute">ID : {id}</p>
      </header>
      <Card className="p-6">
        <div className="px-6 space-y-4">
          <FormField label="Nom du club"><Input placeholder="Nom" /></FormField>
          <FormField label="Ville"><Input placeholder="Casablanca" /></FormField>
          <Button variant="pink"><Save className="w-4 h-4 mr-2" />Enregistrer</Button>
        </div>
      </Card>
    </div>
  )
}
