import type { Metadata } from "next"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { AlertTriangle, Trash2 } from "lucide-react"

export const metadata: Metadata = { title: "Supprimer mon compte" }

// Refonte V1.5 (#108) — suppression de compte (droit à l'effacement, CNDP loi 09-08).
export default function AccountDeletePage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-12 space-y-8">
      <header className="space-y-2">
        <p className="eyebrow">Confidentialité · CNDP</p>
        <h1 className="text-4xl font-extrabold tracking-tight">
          Supprimer mon <span className="text-pink italic">compte</span>
        </h1>
        <p className="text-mute">Efface définitivement ton compte et tes données.</p>
      </header>

      <Card className="border-destructive bg-danger-soft gap-4 p-6">
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-6 h-6 text-destructive shrink-0" />
          <div>
            <h2 className="font-display font-bold text-ink">Action irréversible</h2>
            <p className="text-sm text-ink-2">
              Ton profil, ton solde, ton historique et tes contenus seront supprimés sous 30 jours. Un solde de coins restant sera remboursé selon les CGV.
            </p>
          </div>
        </div>
        <Button variant="destructive" className="w-fit"><Trash2 className="w-4 h-4 mr-2" />Demander la suppression</Button>
      </Card>

      <p className="text-xs text-mute">
        Tu peux aussi <a href="/account/export" className="text-pink underline underline-offset-2">exporter tes données</a> avant de partir.
      </p>
    </div>
  )
}
