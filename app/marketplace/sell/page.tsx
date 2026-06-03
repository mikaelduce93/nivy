/**
 * /marketplace/sell — create listing form.
 */

import { ShieldAlert } from "lucide-react"
import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { SellForm } from "./sell-form"

export const dynamic = "force-dynamic"

export default function SellPage() {
  return (
    <div className="min-h-screen bg-paper">
      <Navbar />
      <main className="mx-auto max-w-2xl px-4 pb-20 pt-24">
        <header className="mb-6">
          <p className="eyebrow tracking-[0.18em] text-mute">Marketplace Nivy</p>
          <h1 className="mt-2 font-display text-3xl font-extrabold tracking-tight sm:text-4xl">
            Mets ton article <em className="font-semibold italic text-pink">en vente</em>
          </h1>
        </header>

        {/* Consigne sécurité — carte d'alerte charte (gold 2px ink) */}
        <div className="mb-6 flex items-start gap-3 rounded-2xl border-2 border-ink bg-white p-4 shadow-stkr-sm">
          <span className="grid size-9 shrink-0 place-items-center rounded-xl border-2 border-ink bg-gold/20">
            <ShieldAlert className="size-5 text-ink" aria-hidden="true" />
          </span>
          <div className="text-sm">
            <p className="font-display font-bold text-ink">Toutes les annonces sont validées avant publication</p>
            <p className="mt-1 text-mute">
              Pas de coordonnées (téléphone, email, IG/WhatsApp) dans le titre ou la description —
              elles seront rejetées automatiquement.
            </p>
          </div>
        </div>

        <SellForm />
      </main>
      <Footer />
    </div>
  )
}
