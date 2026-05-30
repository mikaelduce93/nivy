import type { Metadata } from "next"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Download, ShieldCheck, FileJson } from "lucide-react"

export const metadata: Metadata = { title: "Exporter mes données" }

// Refonte V1.5 (#108) — export des données personnelles (droit d'accès, CNDP loi 09-08).
export default function AccountExportPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-12 space-y-8">
      <header className="space-y-2">
        <p className="eyebrow">Confidentialité · CNDP</p>
        <h1 className="text-4xl font-extrabold tracking-tight">
          Exporter mes <span className="text-pink italic">données</span>
        </h1>
        <p className="text-mute">Reçois une copie complète de tes données personnelles.</p>
      </header>

      <Card className="gap-4 p-6">
        <div className="flex items-start gap-3">
          <div className="w-11 h-11 rounded-2xl border-2 border-ink bg-info-soft grid place-items-center shrink-0">
            <FileJson className="w-5 h-5 text-teal" />
          </div>
          <div>
            <h2 className="font-display font-bold text-ink">Archive complète</h2>
            <p className="text-sm text-mute">Profil, transactions, XP, contenus — au format lisible (JSON/CSV), envoyé par e-mail sous 30 jours.</p>
          </div>
        </div>
        <Button variant="pink" className="w-fit"><Download className="w-4 h-4 mr-2" />Demander l'export</Button>
      </Card>

      <p className="flex items-center gap-2 text-xs text-mute">
        <ShieldCheck className="w-4 h-4 text-lime" /> Conforme à la loi 09-08 (CNDP). Tes données ne sont jamais revendues.
      </p>
    </div>
  )
}
