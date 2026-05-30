"use client"

import * as React from "react"

import { cn } from "@/lib/utils"
import { Niv, DarkSurface, type NivMood, type DarkTone } from "@/components/brand/niv"
import { Confetti } from "@/components/ui/effects/confetti"

const TONE_TEXT: Record<DarkTone, string> = {
  pink: "text-pink",
  gold: "text-gold",
  coral: "text-coral",
  teal: "text-teal",
  lime: "text-lime",
}

/* ============================ NivCoach ============================ */

export interface NivCoachProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Message du coach (alternative à `children`). */
  message?: React.ReactNode
  mood?: NivMood
  /** `dark` = surface sombre ponctuelle ; `paper` = bulle claire bordure ink. */
  tone?: "dark" | "paper"
  size?: number
}

/**
 * NivCoach — bulle coach : Niv à gauche, label eyebrow mono rose `Niv`, message
 * à droite. Cible : centre d'aide, candidature partenaire, KYC parent,
 * aide-scolaire.
 */
export function NivCoach({
  message,
  mood = "happy",
  tone = "dark",
  size = 64,
  className,
  children,
  ...props
}: NivCoachProps) {
  const body = (
    <div className="flex items-start gap-3">
      <Niv mood={mood} size={size} className="shrink-0" />
      <div className="min-w-0">
        <span className="eyebrow tracking-[0.14em] text-pink">Niv</span>
        <div
          className={cn(
            "mt-1 text-sm leading-snug",
            tone === "dark" ? "text-paper/90" : "text-ink-2",
          )}
        >
          {message ?? children}
        </div>
      </div>
    </div>
  )

  if (tone === "paper") {
    return (
      <div
        className={cn(
          "rounded-2xl border-2 border-ink bg-white p-4 shadow-stkr-sm",
          className,
        )}
        {...props}
      >
        {body}
      </div>
    )
  }

  return (
    <DarkSurface shadow className={cn("p-4", className)} {...props}>
      {body}
    </DarkSurface>
  )
}

/* ============================ NivEmpty ============================ */

export interface NivEmptyProps extends React.HTMLAttributes<HTMLDivElement> {
  title: string
  description?: React.ReactNode
  mood?: NivMood
  /** CTA optionnel (bouton rose en général). */
  action?: React.ReactNode
}

/**
 * NivEmpty — état vide canonique (destiné à devenir le défaut des EmptyState) :
 * carte sticker centrée, `<Niv mood="calm">`, titre Bricolage, description
 * `text-mute`, slot CTA. `role="status"`. Jamais glass/blur/glow.
 */
export function NivEmpty({
  title,
  description,
  mood = "calm",
  action,
  className,
  ...props
}: NivEmptyProps) {
  return (
    <div
      role="status"
      aria-label={title}
      className={cn(
        "flex flex-col items-center gap-3 rounded-2xl border-2 border-ink bg-white p-8 text-center shadow-stkr-sm",
        className,
      )}
      {...props}
    >
      <Niv mood={mood} size={80} />
      <h3 className="font-display text-xl font-extrabold tracking-tight text-ink">
        {title}
      </h3>
      {description ? (
        <p className="max-w-sm text-sm text-mute">{description}</p>
      ) : null}
      {action ? <div className="mt-1">{action}</div> : null}
    </div>
  )
}

/* ========================= NivCelebration ========================= */

export interface NivCelebrationProps extends React.HTMLAttributes<HTMLDivElement> {
  title: string
  /** Chiffre clé (level-up, gain XP…). */
  value?: React.ReactNode
  caption?: React.ReactNode
  /** Token économique du chiffre/halo. */
  tone?: DarkTone
  /** Édge-trigger : un passage false→true rejoue les confettis. */
  trigger?: boolean
  /** Palette confettis charte. */
  palette?: "default" | "reward" | "xp" | "levelup"
  action?: React.ReactNode
}

/**
 * NivCelebration — moment de pic plein écran sombre : `<Niv mood="hype" float>`,
 * chiffre Bricolage géant, confettis charte déclenchés à l'apparition (coupés
 * sous `prefers-reduced-motion` — géré par `<Confetti>`).
 */
export function NivCelebration({
  title,
  value,
  caption,
  tone = "pink",
  trigger = true,
  palette = "levelup",
  action,
  className,
  ...props
}: NivCelebrationProps) {
  return (
    <DarkSurface
      tone={tone}
      shadow
      className={cn("flex flex-col items-center gap-4 p-8 text-center", className)}
      {...props}
    >
      <Confetti trigger={trigger} palette={palette} />
      <Niv mood="hype" float size={144} />
      <span className="eyebrow tracking-[0.16em] text-paper/60">{title}</span>
      {value != null ? (
        <p
          className={cn(
            "font-display text-[clamp(3.5rem,11vw,5.5rem)] font-black leading-none tabular-nums",
            TONE_TEXT[tone],
          )}
        >
          {value}
        </p>
      ) : null}
      {caption ? <p className="max-w-sm text-sm text-paper/70">{caption}</p> : null}
      {action ? <div className="mt-1">{action}</div> : null}
    </DarkSurface>
  )
}

export default NivCoach
