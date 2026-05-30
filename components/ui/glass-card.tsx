import * as React from "react"
import { StickerCard, type StickerCardProps } from "@/components/ui/sticker-card"

type GlassCardProps = StickerCardProps

/**
 * @deprecated Refonte V1.5 (#81) / V2 (#111) — le glassmorphism est banni par
 * la charte paper (§3). `GlassCard` n'est plus qu'un **alias de compat** de
 * `<StickerCard>` (#fff + bordure encre + ombre sticker) : les props héritées
 * `intensity`/`neon` sont acceptées mais **no-op**. Ne pas utiliser dans le
 * nouveau code — importer `<StickerCard>` (ou `<Card>`) directement.
 */
const GlassCard = React.forwardRef<HTMLDivElement, GlassCardProps>(
  (props, ref) => <StickerCard ref={ref} {...props} />,
)
GlassCard.displayName = "GlassCard"

export { GlassCard }












