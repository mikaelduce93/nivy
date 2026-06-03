"use client"

import * as React from "react"

import { DarkSurface, Niv, type NivMood } from "@/components/brand"
import { cn } from "@/lib/utils"

export interface DarkScannerShellProps {
  /** Eyebrow mono UPPERCASE. */
  eyebrow: string
  /** Titre (Bricolage). */
  title: string
  /** Mot emphasé en rose à la suite du titre. */
  titleEm?: string
  /** Humeur de Niv (calm = focus scanner, happy = accueil, hype = succès). */
  nivMood?: NivMood
  children: React.ReactNode
  className?: string
}

/**
 * DarkScannerShell — encadre le scanner partenaire et ses vues (membre/succès)
 * sur une **surface sombre ponctuelle** charte (`#1a1530→#0e0c1a`, texte crème),
 * avec Niv + eyebrow mono + titre Bricolage. Les sous-cartes de données restent
 * des `<StickerCard>` blanches (contraste sticker sur le fond sombre).
 */
export function DarkScannerShell({
  eyebrow,
  title,
  titleEm,
  nivMood = "calm",
  children,
  className,
}: DarkScannerShellProps) {
  return (
    <DarkSurface shadow className={cn("mx-auto max-w-2xl p-6 sm:p-8", className)}>
      <div className="flex flex-col items-center gap-3 text-center">
        <Niv mood={nivMood} size={88} />
        <p className="eyebrow tracking-[0.16em] text-paper/60">{eyebrow}</p>
        <h1 className="font-display text-3xl font-extrabold tracking-tight text-paper">
          {title}
          {titleEm ? (
            <>
              {" "}
              <em className="font-semibold italic text-pink">{titleEm}</em>
            </>
          ) : null}
        </h1>
      </div>
      <div className="mt-6 space-y-4">{children}</div>
    </DarkSurface>
  )
}
