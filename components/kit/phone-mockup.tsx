import * as React from "react"

import { cn } from "@/lib/utils"

export interface PhoneScreenProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Affiche la status bar mono (`9:41` / batterie). Défaut `true`. */
  statusBar?: boolean
  /** Heure affichée à gauche de la status bar. */
  time?: string
}

/**
 * PhoneScreen — la zone écran paper (radius 34) avec status bar mono intégrée.
 * Le contenu (`children`) est full-bleed sous la status bar.
 */
export function PhoneScreen({
  statusBar = true,
  time = "9:41",
  className,
  children,
  ...props
}: PhoneScreenProps) {
  return (
    <div
      className={cn(
        "relative h-full w-full overflow-hidden rounded-[34px] bg-paper",
        className,
      )}
      {...props}
    >
      {statusBar ? (
        <div className="absolute inset-x-0 top-0 z-10 flex items-center justify-between px-6 pt-3.5 font-mono text-[11px] font-semibold text-ink">
          <span>{time}</span>
          <span className="text-[9px]" aria-hidden="true">
            ●●●● 100%
          </span>
        </div>
      ) : null}
      {children}
    </div>
  )
}

export interface PhoneMockupProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Halo rose décoratif derrière le châssis (défaut `true`). */
  glow?: boolean
  /** Largeur du châssis en px (hauteur dérivée du ratio handoff). */
  width?: number
}

/**
 * PhoneMockup — châssis téléphone marketing (charte `index.html`).
 *
 * Cadre ink radius 44, dynamic island, ombre de profondeur du handoff
 * (offsets + inset ink-2 — exception 3D assumée au « jamais blur » : c'est un
 * objet marketing, pas une carte). `children` reçoit un `<PhoneScreen>`.
 */
export function PhoneMockup({
  glow = true,
  width = 312,
  className,
  children,
  ...props
}: PhoneMockupProps) {
  const height = Math.round(width * (632 / 312))
  return (
    <div className={cn("relative flex justify-center", className)}>
      {glow ? (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute -inset-8 -z-10"
          // Glow rose littéral HEX charte (asset illustratif, comme <Niv>).
          style={{
            background:
              "radial-gradient(60% 60% at 50% 40%, rgba(255,61,128,.18), transparent 70%)",
          }}
        />
      ) : null}
      <div
        className="relative shrink-0 rounded-[44px] bg-ink p-2.5"
        style={{
          width,
          height,
          // Ombre de PROFONDEUR du handoff (pas une ombre sticker floue) — objet 3D.
          boxShadow:
            "0 30px 60px -20px rgba(14,12,26,.4), 0 0 0 1px var(--ink-2), inset 0 0 0 2px #2a2538",
        }}
        {...props}
      >
        {/* Dynamic island */}
        <div
          aria-hidden="true"
          className="absolute left-1/2 top-[18px] z-20 h-[26px] w-24 -translate-x-1/2 rounded-full bg-black"
        />
        {children}
      </div>
    </div>
  )
}

export default PhoneMockup
