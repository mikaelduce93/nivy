import type { Metadata } from "next"
import { CandidatureForm } from "@/components/forms/candidature-form"

export const metadata: Metadata = { title: "Devenir mentor — candidature" }

// Refonte V1.5 (#102) — façade de candidature mentor (API /api/mentor/apply existe).
export default function DevenirMentorCandidature() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-12 space-y-8">
      <header className="text-center space-y-2">
        <p className="eyebrow">Devenir mentor</p>
        <h1 className="text-4xl font-extrabold tracking-tight">
          Rejoins les <span className="text-pink italic">mentors</span> Nivy
        </h1>
        <p className="text-mute">Accompagne des ados sur leur parcours. Première session offerte.</p>
      </header>
      <CandidatureForm endpoint="/api/mentor/apply" role="mentor" />
    </div>
  )
}
