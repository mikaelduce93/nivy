import * as React from "react"

import { cn } from "@/lib/utils"

export interface StickerCardProps extends React.HTMLAttributes<HTMLDivElement> {
  /**
   * `default`/`panel` = carte statique ; `hover` = hover-lift charte
   * (translate -2/-2 + ombre qui passe rose). `panel` allège l'ombre pour
   * les conteneurs internes.
   */
  variant?: "default" | "hover" | "panel"
  /**
   * @deprecated No-op — le glassmorphism est banni par la charte (§3).
   * Accepté uniquement pour rester drop-in avec `GlassCard` ; aucun effet.
   */
  intensity?: "low" | "medium" | "high"
  /**
   * @deprecated No-op — le néon est banni par la charte (§3). Accepté
   * uniquement pour rester drop-in avec `GlassCard` ; aucun effet.
   */
  neon?: "none" | "party" | "vitality" | "intellect" | "creativity" | "prestige"
}

const VARIANTS: Record<NonNullable<StickerCardProps["variant"]>, string> = {
  default: "shadow-stkr-md",
  panel: "shadow-stkr-sm",
  hover:
    "shadow-stkr-md cursor-pointer hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-stkr-pink motion-reduce:translate-x-0 motion-reduce:translate-y-0",
}

/**
 * StickerCard — carte « sticker » néo-brutaliste (charte paper §3).
 *
 * Remplaçant 1:1 et DROP-IN de `GlassCard` : `#fff` + bordure 2px ink + ombre
 * dure décalée (tokens `--shadow-stkr*`), radius 16px. Jamais glass/flou/néon.
 * S'aligne sur la base sticker de `components/ui/card.tsx` (source de vérité).
 */
export const StickerCard = React.forwardRef<HTMLDivElement, StickerCardProps>(
  (
    { className, variant = "default", intensity: _intensity, neon: _neon, ...props },
    ref,
  ) => (
    <div
      ref={ref}
      data-slot="sticker-card"
      className={cn(
        "flex flex-col rounded-2xl border-2 border-ink bg-white text-ink transition-all duration-200 ease-out",
        VARIANTS[variant],
        className,
      )}
      {...props}
    />
  ),
)
StickerCard.displayName = "StickerCard"

export default StickerCard
