import * as React from "react"

import { cn } from "@/lib/utils"

export interface MeshBackgroundProps
  extends React.HTMLAttributes<HTMLDivElement> {
  /** `paper` = mesh sur fond crème ; `dark` = mesh sur dégradé night. */
  variant?: "paper" | "dark"
  /** Multiplie l'alpha des spots (0–1+, défaut 1). */
  intensity?: number
}

/**
 * MeshBackground — fond mesh radial conforme charte (§3) : spots `--pink` /
 * `--teal` **subtils** en `radial-gradient`, **sans aucun blur / backdrop /
 * filter** (le pendant légal de `MeshGradient`/`GlowBlob`, qui sont bannis).
 *
 * Statique par construction : rien à animer, donc rien à neutraliser sous
 * `prefers-reduced-motion`.
 */
export function MeshBackground({
  variant = "paper",
  intensity = 1,
  className,
  style,
  ...props
}: MeshBackgroundProps) {
  const a = (pct: number) => Math.max(0, Math.round(pct * intensity))
  const spots = [
    `radial-gradient(700px 380px at 88% 18%, color-mix(in oklch, var(--pink) ${a(22)}%, transparent), transparent 70%)`,
    `radial-gradient(620px 320px at 8% 62%, color-mix(in oklch, var(--teal) ${a(16)}%, transparent), transparent 70%)`,
    `radial-gradient(520px 300px at 50% 100%, color-mix(in oklch, var(--pink) ${a(10)}%, transparent), transparent 70%)`,
  ].join(",")

  const backgroundImage =
    variant === "dark"
      ? `${spots}, linear-gradient(135deg, var(--night-2), var(--night))`
      : spots

  return (
    <div
      aria-hidden="true"
      data-slot="mesh-background"
      className={cn(
        "pointer-events-none absolute inset-0 overflow-hidden",
        className,
      )}
      style={{
        backgroundColor: variant === "dark" ? undefined : "var(--paper)",
        backgroundImage,
        ...style,
      }}
      {...props}
    />
  )
}

export default MeshBackground
