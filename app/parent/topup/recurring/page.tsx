import type { Metadata } from "next"
import Link from "next/link"
import { StickerCard } from "@/components/ui/sticker-card"
import { Button } from "@/components/ui/button"
import { NivCoach } from "@/components/brand"
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
//
// État de sélection charte sans JS : radios `peer` → l'option cochée passe en
// fond ink + texte paper + ombre rose (pattern « option active »). La page
// reste un Server Component (metadata conservée).
export default function RecurringTopupPage() {
  return (
    <div className="space-y-8 pt-6 max-w-2xl">
      <header className="space-y-2">
        <p className="eyebrow">Budget</p>
        <h1 className="font-display text-4xl font-extrabold tracking-tight">
          Recharge <em className="font-semibold italic text-pink">récurrente</em>
        </h1>
        <p className="text-mute">Programme un rechargement régulier du solde de ton ado.</p>
      </header>

      <NivCoach
        mood="hype"
        message="Programme une fois, je te rappelle à chaque échéance. Tu gardes le contrôle."
      />

      <section className="space-y-3">
        <p className="eyebrow">Cadence</p>
        <fieldset className="grid gap-3 sm:grid-cols-3">
          <legend className="sr-only">Choisir la cadence</legend>
          {CADENCES.map((c, i) => (
            <label
              key={c.id}
              className="block cursor-pointer rounded-2xl border-2 border-ink bg-white p-4 shadow-stkr-md transition-all has-[:checked]:-translate-x-0.5 has-[:checked]:-translate-y-0.5 has-[:checked]:bg-ink has-[:checked]:text-paper has-[:checked]:shadow-stkr-pink motion-reduce:transition-none"
            >
              <input
                type="radio"
                name="cadence"
                value={c.id}
                defaultChecked={i === 0}
                className="peer sr-only"
              />
              <span className="flex items-center gap-2 font-display font-bold peer-checked:text-paper">
                <CalendarClock className="w-4 h-4 text-teal" />
                {c.label}
              </span>
              <span className="mt-1 block text-sm text-mute peer-checked:text-paper/70">{c.desc}</span>
            </label>
          ))}
        </fieldset>
      </section>

      <StickerCard className="flex-row items-start gap-3 bg-info-soft p-5">
        <Info className="w-5 h-5 text-teal shrink-0 mt-0.5" />
        <p className="text-sm text-ink-2">
          Au lancement, la recharge auto par carte est désactivée : on te rappelle de confirmer chaque échéance (Cash Plus / virement). Tu gardes le contrôle.
        </p>
      </StickerCard>

      <div className="flex flex-wrap gap-3">
        <Button variant="pink" disabled>
          <Repeat className="w-4 h-4 mr-2" />Activer la récurrence (bientôt)
        </Button>
        <Button asChild variant="outline"><Link href="/parent/topup">Recharge ponctuelle</Link></Button>
      </div>
    </div>
  )
}
