import { SegmentedProgress } from "@/components/ui/progress"

const STEPS = ["Détails", "Paiement", "Confirmation"] as const

/**
 * ReservationStepper — stepper unique du tunnel de réservation (charte §3, F5).
 *
 * Remplace les deux blocs « ronds 1-2-3 » dupliqués (`/reservation` et
 * `/reservation/paiement`) par une jauge `<SegmentedProgress>` : 3 segments
 * (ink franchis, rose actif) + labels mono UPPERCASE. `step` est l'index
 * 0-based de l'étape en cours.
 */
export function ReservationStepper({ step }: { step: 0 | 1 | 2 }) {
  return (
    <div className="mb-12">
      <SegmentedProgress steps={STEPS.length} current={step} />
      <div className="mt-3 flex items-center justify-between">
        {STEPS.map((label, index) => (
          <span
            key={label}
            className={
              "font-mono text-[11px] font-bold uppercase tracking-[0.16em] " +
              (index === step ? "text-pink" : index < step ? "text-ink" : "text-mute")
            }
          >
            {label}
          </span>
        ))}
      </div>
    </div>
  )
}

export default ReservationStepper
