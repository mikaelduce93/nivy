import type { Metadata } from "next"
import Link from "next/link"
import { Niv } from "@/components/brand/niv"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Mail } from "lucide-react"

export const metadata: Metadata = { title: "Candidature reçue" }

// Refonte V1.5 (#102) — page « merci » canonique avec réf. d'application persistée
// (remplace le placebo /partenaires/merci, partner-ecosystem D3).
export default async function DevenirPartenaireMerci({ searchParams }: { searchParams: Promise<{ ref?: string }> }) {
  const { ref } = await searchParams
  return (
    <div className="min-h-[70vh] flex items-center justify-center p-6">
      <Card className="w-full max-w-lg items-center text-center py-12 px-8">
        <Niv size={120} mood="proud" float />
        <p className="eyebrow mt-4">Candidature partenaire</p>
        <h1 className="text-3xl font-extrabold tracking-tight">
          Merci, c'est <span className="text-pink italic">reçu</span> !
        </h1>
        <p className="text-mute max-w-sm mt-2">
          Notre équipe étudie ta candidature. On te recontacte pour la suite (KYC + activation).
        </p>
        {ref && (
          <p className="mt-4 font-mono text-xs text-mute">
            Référence : <span className="text-ink font-bold">{ref}</span>
          </p>
        )}
        <div className="flex gap-3 mt-8">
          <Button asChild variant="pink"><Link href="/"><Mail className="w-4 h-4 mr-2" />Retour à l'accueil</Link></Button>
          <Button asChild variant="outline"><Link href="/aide">Une question ?</Link></Button>
        </div>
      </Card>
    </div>
  )
}
