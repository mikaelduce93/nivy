import * as React from "react"

import { cn } from "@/lib/utils"

const SPEED: Record<NonNullable<MarqueeProps["speed"]>, string> = {
  slow: "[animation-duration:48s]",
  normal: "[animation-duration:32s]",
  fast: "[animation-duration:20s]",
}

export interface MarqueeProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Noms (partenaires) défilants. */
  items: string[]
  /** Séparateur entre les noms (défaut `✦` rose). */
  separator?: React.ReactNode
  speed?: "slow" | "normal" | "fast"
}

/**
 * Marquee — barre `--ink` défilante : noms Bricolage 22px séparés par des
 * étoiles `✦` roses (signature charte §3, handoff `index.html`).
 *
 * Boucle sans couture (liste dupliquée, clone `aria-hidden`). Sous
 * `prefers-reduced-motion`, le défilement est figé (noms intégralement
 * lisibles), pas un fragment tronqué.
 */
export function Marquee({
  items,
  separator = "✦",
  speed = "normal",
  className,
  ...props
}: MarqueeProps) {
  const Track = ({ clone = false }: { clone?: boolean }) => (
    <span
      aria-hidden={clone || undefined}
      className="flex shrink-0 items-center"
    >
      {items.map((it, i) => (
        <span key={i} className="flex items-center">
          <span className="font-display text-[22px] font-bold leading-none tracking-[-0.5px]">
            {it}
          </span>
          <span className="mx-6 text-[22px] text-pink" aria-hidden="true">
            {separator}
          </span>
        </span>
      ))}
    </span>
  )

  return (
    <div
      className={cn(
        "overflow-hidden border-y-2 border-ink bg-ink py-3.5 text-paper",
        className,
      )}
      {...props}
    >
      <div
        className={cn(
          "flex w-max items-center animate-marquee motion-reduce:animate-none",
          SPEED[speed],
        )}
      >
        <Track />
        <Track clone />
      </div>
    </div>
  )
}

export default Marquee
