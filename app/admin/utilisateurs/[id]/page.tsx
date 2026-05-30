import type { Metadata } from "next"
import Link from "next/link"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Download, UserX } from "lucide-react"

export const metadata: Metadata = { title: "Détail utilisateur — Admin" }

// Refonte V1.5 (#107) — détail utilisateur (lien cassé corrigé). Doit supporter
// anonymiser / exporter (admin §22).
export default async function AdminUserDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return (
    <div className="space-y-6 max-w-3xl">
      <Button asChild variant="ghost" size="sm"><Link href="/admin/utilisateurs"><ArrowLeft className="w-4 h-4 mr-1" />Utilisateurs</Link></Button>
      <header className="space-y-2">
        <p className="eyebrow">Utilisateur</p>
        <h1 className="text-3xl font-extrabold tracking-tight">Détail</h1>
        <p className="font-mono text-sm text-mute">ID : {id}</p>
      </header>
      <Card className="p-6"><div className="px-6 text-mute">Profil, rôle, transactions et activité de l'utilisateur.</div></Card>
      <div className="flex gap-3">
        <Button variant="outline"><Download className="w-4 h-4 mr-2" />Exporter (CNDP)</Button>
        <Button variant="destructive"><UserX className="w-4 h-4 mr-2" />Anonymiser</Button>
      </div>
    </div>
  )
}
