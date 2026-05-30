"use client"

import * as React from "react"

import { cn } from "@/lib/utils"
import { Niv, type NivMood } from "@/components/brand/niv"
import { StickerCard } from "@/components/ui/sticker-card"

interface TokenDef {
  key: string
  eyebrow: string
  value: React.ReactNode
  color: string
  /** Angle de placement sur l'orbite (deg, 0 = haut). */
  angle: number
}

export interface OrbitingTokensProps
  extends React.HTMLAttributes<HTMLDivElement> {
  /** XP cumulé (or). */
  xp: React.ReactNode
  /** Solde coins (corail ⊙). */
  coins: React.ReactNode
  /** Niveau (teal). */
  level: React.ReactNode
  /** Streak en jours (rose 🔥). */
  streak: React.ReactNode
  nivMood?: NivMood
  /** Diamètre total de la scène en px. */
  size?: number
}

/**
 * OrbitingTokens — signature visuelle n°1 du hero handoff : `<Niv>` au centre,
 * 4 mini-cartes sticker économie (XP or / Coins corail ⊙ / Niveau teal /
 * Streak rose 🔥) en orbite douce. Purement présentationnel — les valeurs
 * viennent de l'appelant, aucune logique éco.
 *
 * Orbite = `rotate`/`translate` uniquement (jamais blur/glow). Sous
 * `prefers-reduced-motion`, la scène se fige (cartes aux cardinaux, texte
 * droit et lisible) via `motion-reduce:animate-none`.
 */
export function OrbitingTokens({
  xp,
  coins,
  level,
  streak,
  nivMood = "hype",
  size = 360,
  className,
  ...props
}: OrbitingTokensProps) {
  const radius = Math.round(size * 0.42)
  const tokens: TokenDef[] = [
    { key: "xp", eyebrow: "XP", value: xp, color: "text-gold", angle: 0 },
    { key: "coins", eyebrow: "Coins", value: <>⊙ {coins}</>, color: "text-coral", angle: 90 },
    { key: "level", eyebrow: "Niveau", value: level, color: "text-teal", angle: 180 },
    { key: "streak", eyebrow: "Streak", value: <>🔥 {streak}</>, color: "text-pink", angle: 270 },
  ]

  return (
    <div
      className={cn("relative grid place-items-center", className)}
      style={{ width: size, height: size }}
      {...props}
    >
      {/* Anneau en rotation lente continue (figé sous reduced-motion). */}
      <div className="absolute inset-0 motion-safe:animate-[spin_26s_linear_infinite] motion-reduce:animate-none">
        {tokens.map((t) => (
          <div
            key={t.key}
            className="absolute left-1/2 top-1/2"
            // rotate(angle) place la carte au cardinal ; rotate(-angle) la
            // redresse par rapport à l'anneau.
            style={{
              transform: `translate(-50%, -50%) rotate(${t.angle}deg) translateY(-${radius}px) rotate(${-t.angle}deg)`,
            }}
          >
            {/* Contre-rotation : annule la rotation de l'anneau → texte droit. */}
            <div className="motion-safe:animate-[spin_26s_linear_infinite_reverse] motion-reduce:animate-none">
              <StickerCard className="flex flex-col items-center gap-0.5 px-3.5 py-2.5">
                <span className="font-mono text-[9.5px] font-semibold uppercase tracking-[0.14em] text-mute">
                  {t.eyebrow}
                </span>
                <span
                  className={cn(
                    "font-display text-xl font-bold leading-none tracking-[-0.5px] tabular-nums",
                    t.color,
                  )}
                >
                  {t.value}
                </span>
              </StickerCard>
            </div>
          </div>
        ))}
      </div>

      {/* Centre = la mascotte (jamais redessinée localement). */}
      <Niv mood={nivMood} float size={Math.round(size * 0.5)} />
    </div>
  )
}

export default OrbitingTokens
