import type { Metadata } from "next"
import { CandidatureForm } from "@/components/forms/candidature-form"

export const metadata: Metadata = { title: "Devenir DJ — candidature" }

// Refonte V1.5 (#102) — candidature DJ (migration depuis /djs/candidature ;
// partner_type='event_talent').
export default function DevenirDjCandidature() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-12 space-y-8">
      <header className="text-center space-y-2">
        <p className="eyebrow">Devenir DJ</p>
        <h1 className="text-4xl font-extrabold tracking-tight">
          Mixe sur les <span className="text-pink italic">events</span> Nivy
        </h1>
        <p className="text-mute">Rejoins notre pool de DJ et performers pour les soirées ados.</p>
      </header>
      <CandidatureForm endpoint="/api/partner/talent/apply" role="DJ" />
    </div>
  )
}
