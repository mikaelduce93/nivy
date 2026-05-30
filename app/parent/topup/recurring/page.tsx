import type { Metadata } from "next"
import Link from "next/link"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Repeat, CalendarClock, Info } from "lucide-react"

export const metadata: Metadata = { title: "Recharge récurrente" }

const CADENCES = [
  { id: "weekly", label: "Hebdo", desc: "Chaque lundi" },
  { id: "biweekly", label: "Bi-mensuel", desc: "1 & 15 du mois" },
  { id: "monthly", label: "Mensuel", desc: "Le 1er du mois" },
]

// Refonte V1.5 (#106) — configuration d'une recharge récurrente (cadence).
// Complète /parent/topup + /parent/topup/manual. Auto-topup PSP désactivé au
// lancement (décision F5) → planification manuelle confirmée.
export default function RecurringTopupPage() {
  return (
    <div className="space-y-8 pt-6 max-w-2xl">
      <header className="space-y-2">
        <p className="eyebrow">Budget</p>
        <h1 className="text-4xl font-extrabold tracking-tight">
          Recharge <span className="text-pink italic">récurrente</span>
        </h1>
        <p className="text-mute">Programme un rechargement automatique du solde de ton ado.</p>
      </header>

      <section className="space-y-3">
        <p className="eyebrow">Cadence</p>
        <div className="grid gap-3 sm:grid-cols-3">
          {CADENCES.map((c) => (
            <Card key={c.id} className="gap-1 cursor-pointer hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-stkr">
              <div className="px-6 flex items-center gap-2 text-ink font-bold"><CalendarClock className="w-4 h-4 text-teal" />{c.label}</div>
              <p className="px-6 text-sm text-mute">{c.desc}</p>
            </Card>
          ))}
        </div>
      </section>

      <Card className="bg-info-soft border-ink flex-row items-start gap-3 px-6 py-4">
        <Info className="w-5 h-5 text-teal shrink-0 mt-0.5" />
        <p className="text-sm text-ink-2">
          Au lancement, la recharge auto par carte est désactivée : on te rappelle de confirmer chaque échéance (Cash Plus / virement). Tu gardes le contrôle.
        </p>
      </Card>

      <div className="flex gap-3">
        <Button variant="pink"><Repeat className="w-4 h-4 mr-2" />Activer la récurrence</Button>
        <Button asChild variant="outline"><Link href="/parent/topup">Recharge ponctuelle</Link></Button>
      </div>
    </div>
  )
}
