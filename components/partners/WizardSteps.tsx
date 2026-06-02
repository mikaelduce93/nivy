'use client'

import type { LucideIcon } from 'lucide-react'

export type WizardStep = { id: number; title: string; icon: LucideIcon }

// Literal lookup so Tailwind JIT sees the full class names.
// teal/pink/lime are charte-allowed bare tokens (no numeric shade).
const ACCENT = {
  teal: { on: 'bg-teal border-teal text-ink', label: 'text-teal', line: 'bg-teal' },
  pink: { on: 'bg-pink border-pink text-ink', label: 'text-pink', line: 'bg-pink' },
  lime: { on: 'bg-lime border-lime text-ink', label: 'text-lime', line: 'bg-lime' },
} as const

export function WizardSteps({
  steps,
  currentStep,
  accent = 'teal',
}: {
  steps: WizardStep[]
  currentStep: number
  accent?: 'teal' | 'pink' | 'lime'
}) {
  const a = ACCENT[accent]

  return (
    <div className="mb-8">
      <p className="sm:hidden text-center text-sm font-bold mb-3">
        Étape {currentStep}/{steps.length} — {steps[currentStep - 1].title}
      </p>
      <div className="flex items-center justify-between">
        {steps.map((step, index) => (
          <div key={step.id} className="flex items-center flex-1">
            <div className="flex flex-col items-center flex-1">
              <div className={`w-9 h-9 sm:w-12 sm:h-12 rounded-full flex items-center justify-center border-2 transition-all ${
                currentStep >= step.id
                  ? a.on
                  : 'bg-card border-ink text-mute'
              }`}>
                <step.icon className="w-5 h-5 sm:w-6 sm:h-6" />
              </div>
              <span className={`hidden sm:block text-xs mt-2 text-center ${
                currentStep >= step.id ? a.label : 'text-mute'
              }`}>
                {step.title}
              </span>
            </div>
            {index < steps.length - 1 && (
              <div className={`h-0.5 flex-1 mx-2 transition-all ${
                currentStep > step.id ? a.line : 'bg-card'
              }`} />
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
