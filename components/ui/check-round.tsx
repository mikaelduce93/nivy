"use client"

import * as React from "react"
import * as CheckboxPrimitive from "@radix-ui/react-checkbox"
import { Check } from "lucide-react"

import { cn } from "@/lib/utils"

export interface CheckRoundProps
  extends React.ComponentProps<typeof CheckboxPrimitive.Root> {
  /** Si fourni, rend une ligne sticker cliquable (label à droite du rond). */
  label?: React.ReactNode
}

/**
 * CheckRound — checkbox charte : **rond** bordure 2px ink, état coché = rond
 * **lime ✓** (check ink). Pensé pour les lignes sticker (CGV, newsletter,
 * opt-ins onboarding). Rhabille `Checkbox` (Radix).
 */
export function CheckRound({ className, label, id, ...props }: CheckRoundProps) {
  const reactId = React.useId()
  const cid = id ?? reactId

  const box = (
    <CheckboxPrimitive.Root
      id={cid}
      data-slot="check-round"
      // tap-target : zone cliquable ≥44×44 (a11y) ; le rond visuel reste à 24px.
      className={cn(
        "peer group tap-target grid shrink-0 place-items-center rounded-full outline-none",
        "focus-visible:ring-[3px] focus-visible:ring-pink/40",
        "disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      {...props}
    >
      <span className="grid size-6 place-items-center rounded-full border-2 border-ink bg-white transition-colors group-data-[state=checked]:border-lime group-data-[state=checked]:bg-lime">
        <CheckboxPrimitive.Indicator className="text-ink">
          <Check className="size-3.5" strokeWidth={4} />
        </CheckboxPrimitive.Indicator>
      </span>
    </CheckboxPrimitive.Root>
  )

  if (!label) return box

  return (
    <label
      htmlFor={cid}
      className="flex cursor-pointer items-start gap-3 rounded-xl border-2 border-line bg-white p-3 transition-colors has-[:checked]:border-ink"
    >
      {box}
      <span className="text-sm leading-snug text-ink-2">{label}</span>
    </label>
  )
}

export default CheckRound
