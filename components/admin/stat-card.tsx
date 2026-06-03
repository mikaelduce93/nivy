import * as React from "react"

import { cn } from "@/lib/utils"
import { StickerCard } from "@/components/ui/sticker-card"

/**
 * StatCard — carte KPI unifiée de l'admin (charte paper néo-brutaliste §3).
 *
 * Source de vérité partagée pour toutes les petites cartes « label + valeur »
 * du back-office (dashboard, modération, partenaires, mentors…). Bâtie sur
 * `<StickerCard>` : fond blanc + bordure 2px ink + ombre sticker décalée.
 * Valeur en Bricolage (font-display), label en eyebrow mono UPPERCASE, accent
 * piloté par un `tone` pastel économique.
 *
 * Remplace les copies locales `StatCard` dispersées (proofs/partners/mentors/
 * internships/content-review) — importer d'ici plutôt que redéfinir.
 */
export type StatCardTone = "paper" | "teal" | "gold" | "lime" | "coral"

const TONE_ACCENT: Record<StatCardTone, string> = {
  paper: "text-ink",
  teal: "text-teal",
  gold: "text-gold",
  lime: "text-lime",
  coral: "text-coral",
}

export interface StatCardProps {
  /** Libellé en eyebrow mono UPPERCASE. */
  label: string
  /** La valeur clé (chiffre, montant…). */
  value: React.ReactNode
  /** Token économique : pilote la couleur de la valeur et de l'icône. */
  tone?: StatCardTone
  /** Icône optionnelle affichée en tête de carte. */
  icon?: React.ReactNode
  /** Ligne méta secondaire (ex. « Total inscrits »). */
  hint?: React.ReactNode
  /** Force la valeur en JetBrains Mono (montants DH, ids…). */
  mono?: boolean
  className?: string
}

export function StatCard({
  label,
  value,
  tone = "paper",
  icon,
  hint,
  mono = false,
  className,
}: StatCardProps) {
  return (
    <StickerCard className={cn("gap-2 p-6", className)}>
      <div className="flex items-center justify-between">
        <span className="eyebrow tracking-[0.14em]">{label}</span>
        {icon ? <span className={TONE_ACCENT[tone]}>{icon}</span> : null}
      </div>
      <p
        className={cn(
          "text-[40px] font-extrabold leading-none tabular-nums",
          mono ? "font-mono" : "font-display",
          TONE_ACCENT[tone],
        )}
      >
        {value}
      </p>
      {hint ? <p className="text-sm text-mute">{hint}</p> : null}
    </StickerCard>
  )
}

export default StatCard
