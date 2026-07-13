import * as React from "react"

import { cn } from "@/lib/utils"

/**
 * Niv — mascotte canonique de Nivy (charte refonte V1.5).
 *
 * Panda à hoodie rose, dessiné en SVG inline. Fil rouge de marque : onboarding,
 * coach, heros, level-up, états vides, daily. Source visuelle : handoff Claude
 * Design (`onboarding-ado.html` nivMini + `shared/niv.jsx`).
 *
 * Compagnon IA unique depuis le cleanup de 2026-07 (les anciens prototypes
 * dépréciés `PandaMascot`, `EliteAICompanion` et `ai-companion` ont été
 * supprimés — Niv est désormais le seul coach). Le logo de marque reste
 * `PandaLogo`.
 *
 * Couleurs : littéraux HEX de la charte (asset illustratif, comme le favicon —
 * hors périmètre de la règle "pas de palette brute en utilitaire").
 */

export type NivMood = "happy" | "wink" | "hype" | "calm" | "proud"

const MOUTHS: Record<NivMood, string> = {
  happy: "M88 128 Q100 135 112 128",
  wink: "M90 128 Q100 134 110 128",
  hype: "M86 125 Q100 142 114 125",
  calm: "M92 129 Q100 132 108 129",
  proud: "M88 127 Q100 134 112 127",
}

export interface NivProps extends React.HTMLAttributes<HTMLSpanElement> {
  /** Largeur en px (le SVG est carré). */
  size?: number
  /** Expression du visage. */
  mood?: NivMood
  /** Anime un léger flottement (coupé si prefers-reduced-motion). */
  float?: boolean
  /** Label accessible (rendu en role=img). */
  label?: string
}

export function Niv({
  size = 120,
  mood = "happy",
  float = false,
  label = "Niv, le panda coach de Nivy",
  className,
  ...props
}: NivProps) {
  const blush = mood === "hype" || mood === "proud"
  const winking = mood === "wink"
  return (
    <span
      role="img"
      aria-label={label}
      className={cn(
        "inline-block leading-none",
        float && "motion-safe:animate-bounce-subtle",
        className,
      )}
      {...props}
    >
      <svg viewBox="0 0 200 200" width={size} height={size} xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="niv-hood" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0" stopColor="#2a2538" />
            <stop offset="1" stopColor="#0e0c1a" />
          </linearGradient>
        </defs>
        {/* Capuche (corps) */}
        <path
          d="M40 110 Q30 60 70 42 Q100 30 130 42 Q170 60 160 110 Q160 140 140 150 L60 150 Q40 140 40 110 Z"
          fill="url(#niv-hood)"
          stroke="#0e0c1a"
          strokeWidth="3.5"
          strokeLinejoin="round"
        />
        {/* Oreilles */}
        <circle cx="60" cy="60" r="10" fill="#0e0c1a" stroke="#0e0c1a" strokeWidth="3.5" />
        <circle cx="140" cy="60" r="10" fill="#0e0c1a" stroke="#0e0c1a" strokeWidth="3.5" />
        {/* Visage */}
        <path
          d="M62 96 Q62 64 100 64 Q138 64 138 96 Q138 132 100 136 Q62 132 62 96 Z"
          fill="#f4ede0"
          stroke="#0e0c1a"
          strokeWidth="3.5"
        />
        {/* Taches des yeux */}
        <path d="M64 88 Q64 80 78 80 L96 80 Q98 80 98 88 L98 100 Q98 106 92 106 L74 106 Q64 106 64 96 Z" fill="#0e0c1a" />
        <path d="M136 88 Q136 80 122 80 L104 80 Q102 80 102 88 L102 100 Q102 106 108 106 L126 106 Q136 106 136 96 Z" fill="#0e0c1a" />
        {/* Yeux (clin d'œil sur 'wink') */}
        {winking ? (
          <path d="M70 90 Q78 86 86 90" stroke="#f4ede0" strokeWidth="3" strokeLinecap="round" fill="none" />
        ) : (
          <ellipse cx="78" cy="89" rx="6" ry={mood === "hype" ? 6 : 4} fill="#ff3d80" opacity=".55" />
        )}
        <ellipse cx="122" cy="89" rx="6" ry={mood === "hype" ? 6 : 4} fill="#ff3d80" opacity=".55" />
        {/* Nez */}
        <path d="M94 116 Q100 112 106 116 Q108 120 100 122 Q92 120 94 116 Z" fill="#0e0c1a" />
        {/* Bouche (selon l'humeur) */}
        <path d={MOUTHS[mood]} stroke="#0e0c1a" strokeWidth="3" strokeLinecap="round" fill="none" />
        {/* Haut de capuche rose */}
        <path
          d="M58 76 Q62 38 100 36 Q138 38 142 76 Q142 80 132 80 L68 80 Q58 80 58 76 Z"
          fill="#ff3d80"
          stroke="#0e0c1a"
          strokeWidth="3.5"
        />
        {/* Étiquette « NIV » */}
        <rect x="86" y="46" width="28" height="14" rx="3" fill="#0e0c1a" />
        <text x="100" y="56" textAnchor="middle" fontFamily="var(--font-display), 'Bricolage Grotesque', sans-serif" fontSize="9" fontWeight="800" fill="#ff3d80">
          NIV
        </text>
        {/* Joues */}
        <ellipse cx="74" cy="116" rx="7" ry="4" fill="#ff3d80" opacity={blush ? 0.7 : 0.5} />
        <ellipse cx="126" cy="116" rx="7" ry="4" fill="#ff3d80" opacity={blush ? 0.7 : 0.5} />
      </svg>
    </span>
  )
}

/** Tons économiques pilotant le halo/chiffre des surfaces sombres. */
export type DarkTone = "pink" | "gold" | "coral" | "teal" | "lime"

/**
 * DarkSurface — îlot sombre ponctuel de la charte (coach Niv, carte solde,
 * level-up, scanner QR). Dégradé night + texte crème, dans un thème clair.
 * Factorise le « dark en dur » dispersé (charte §1/§3).
 */
export interface DarkSurfaceProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Halo radial décoratif en coin (par défaut activé). */
  glow?: boolean
  /** Couleur du halo (token économique). Défaut `pink`. */
  tone?: DarkTone
  /** Ajoute l'ombre sticker `--shadow-stkr-md`. */
  shadow?: boolean
}

export function DarkSurface({
  glow = true,
  tone = "pink",
  shadow = false,
  className,
  children,
  ...props
}: DarkSurfaceProps) {
  return (
    <div
      data-slot="dark-surface"
      style={{ "--focus-ring-color": "var(--paper)" } as React.CSSProperties}
      className={cn(
        "relative overflow-hidden rounded-2xl border-2 border-ink text-paper",
        "bg-[linear-gradient(135deg,var(--night-2),var(--night))]",
        shadow && "shadow-stkr-md",
        className,
      )}
      {...props}
    >
      {glow && (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute -right-10 -top-10 size-32 rounded-full"
          style={{
            background: `radial-gradient(circle, color-mix(in oklch, var(--${tone}) 45%, transparent), transparent 70%)`,
          }}
        />
      )}
      <div className="relative">{children}</div>
    </div>
  )
}

const TONE_TEXT: Record<DarkTone, string> = {
  pink: "text-pink",
  gold: "text-gold",
  coral: "text-coral",
  teal: "text-teal",
  lime: "text-lime",
}

const VALUE_SIZE = {
  sm: "text-[34px]",
  md: "text-[clamp(2.5rem,8vw,3.25rem)]",
  lg: "text-[clamp(3.5rem,11vw,5.5rem)]",
} as const

/**
 * StatHero — la carte « un chiffre qui compte », bâtie au-dessus de
 * `<DarkSurface>` : eyebrow mono UPPERCASE + chiffre clé Bricolage géant
 * (34–88px) coloré par token économique (XP gold / coins coral / niveau teal).
 * Généralise le hero réussi emprisonné dans `TwinCurrencyGauge`.
 */
export interface StatHeroProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Label mono UPPERCASE au-dessus du chiffre. */
  eyebrow: string
  /** Le chiffre clé. */
  value: React.ReactNode
  /** Unité accolée (DH, XP…). */
  unit?: string
  /** Token économique : pilote la couleur du chiffre ET du halo. */
  tone?: DarkTone
  size?: "sm" | "md" | "lg"
  icon?: React.ReactNode
  /** Sous-ligne méta (équivalent DH, « vers niveau N+1 »…). */
  meta?: React.ReactNode
}

export function StatHero({
  eyebrow,
  value,
  unit,
  tone = "coral",
  size = "md",
  icon,
  meta,
  className,
  children,
  ...props
}: StatHeroProps) {
  return (
    <DarkSurface tone={tone} shadow className={cn("p-5 sm:p-6", className)} {...props}>
      <div className="flex items-start justify-between gap-3">
        <span className="eyebrow tracking-[0.16em] text-paper/60">{eyebrow}</span>
        {icon ? <span className="text-paper/70">{icon}</span> : null}
      </div>
      <p
        className={cn(
          "mt-2 font-display font-black leading-none tabular-nums",
          VALUE_SIZE[size],
          TONE_TEXT[tone],
        )}
      >
        {value}
        {unit ? (
          <span className="ml-1.5 align-baseline font-mono text-base font-medium text-paper/60">
            {unit}
          </span>
        ) : null}
      </p>
      {meta ?? children ? (
        <div className="mt-2 text-sm text-paper/60">{meta ?? children}</div>
      ) : null}
    </DarkSurface>
  )
}

export default Niv
