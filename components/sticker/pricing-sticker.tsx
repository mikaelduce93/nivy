import * as React from "react"
import Link from "next/link"
import { Check } from "lucide-react"

import { cn } from "@/lib/utils"
import { StickerCard } from "@/components/ui/sticker-card"
import { Button } from "@/components/ui/button"
import { Niv, type NivMood } from "@/components/brand/niv"

export interface PricingCta {
  label: string
  href?: string
  onClick?: () => void
  disabled?: boolean
}

export interface PricingStickerProps {
  /** Nom du plan (eyebrow mono UPPERCASE). */
  name: string
  /** Prix (Bricolage géant). */
  price: string
  /** Unité (« DH/mois »…), rendue en mono discret. */
  per?: string
  features: string[]
  /** Plan vedette : badge « Populaire » + mise en avant. */
  popular?: boolean
  /** `lift` = surélevé + ombre rose ; `ink` = surface sombre ponctuelle. */
  featured?: "lift" | "ink"
  cta: PricingCta
  /** Pose Niv affichée à côté du plan vedette. */
  niv?: NivMood
  className?: string
}

/**
 * PricingSticker — carte tarif sticker (charte) : eyebrow mono, prix Bricolage,
 * features check rond lime, badge « Populaire » rose, plan vedette en lift ou
 * en surface ink + ombre rose. Bâti sur `<StickerCard>` (F1) + `<Button>`.
 * Extrait du one-off réussi de `/parent/family-plan`.
 */
export function PricingSticker({
  name,
  price,
  per,
  features,
  popular = false,
  featured = "lift",
  cta,
  niv,
  className,
}: PricingStickerProps) {
  const isInk = popular && featured === "ink"

  // Inline style => override déterministe du bg-white / shadow de StickerCard
  // pour le plan vedette (évite les conflits de classes Tailwind concurrentes).
  const featuredStyle: React.CSSProperties = isInk
    ? {
        background: "var(--ink)",
        color: "var(--paper)",
        boxShadow: "6px 6px 0 var(--pink)",
      }
    : popular
      ? { boxShadow: "6px 6px 0 var(--pink)" }
      : {}

  return (
    <StickerCard
      style={featuredStyle}
      className={cn(
        "relative flex flex-col gap-4 p-6",
        popular && "-translate-y-1 motion-reduce:translate-y-0",
        className,
      )}
    >
      {niv && popular ? (
        <Niv
          mood={niv}
          size={64}
          className="pointer-events-none absolute -right-3 -top-8 hidden sm:block"
        />
      ) : null}

      {popular ? (
        <span className="absolute -top-3 left-6 rounded-lg border-2 border-ink bg-pink px-3 py-0.5 font-mono text-[10px] font-extrabold uppercase tracking-[0.12em] text-ink">
          Populaire
        </span>
      ) : null}

      <p
        className={cn(
          "eyebrow tracking-[0.16em]",
          isInk && "text-gold",
        )}
      >
        {name}
      </p>

      <p className="font-display text-[44px] font-extrabold leading-none tracking-tight">
        {price}
        {per ? (
          <span
            className={cn(
              "ml-1.5 font-mono text-sm font-medium",
              isInk ? "text-paper/60" : "text-mute",
            )}
          >
            {per}
          </span>
        ) : null}
      </p>

      <ul className="flex-1 space-y-2 text-sm">
        {features.map((f) => (
          <li
            key={f}
            className={cn(
              "flex items-start gap-2.5",
              isInk ? "text-paper/90" : "text-ink-2",
            )}
          >
            <span className="mt-0.5 grid size-4 shrink-0 place-items-center rounded-full bg-lime">
              <Check className="size-3 text-ink" strokeWidth={3} />
            </span>
            {f}
          </li>
        ))}
      </ul>

      {cta.href ? (
        <Button
          asChild
          variant={popular ? "pink" : "outline"}
          className="w-full"
        >
          <Link href={cta.href}>{cta.label}</Link>
        </Button>
      ) : (
        <Button
          variant={popular ? "pink" : "outline"}
          className="w-full"
          onClick={cta.onClick}
          disabled={cta.disabled}
        >
          {cta.label}
        </Button>
      )}
    </StickerCard>
  )
}

export interface PricingGridProps {
  children: React.ReactNode
  className?: string
}

/** PricingGrid — pose la grille standard `gap-4 md:grid-cols-3`. */
export function PricingGrid({ children, className }: PricingGridProps) {
  return (
    <div className={cn("grid gap-4 md:grid-cols-3", className)}>{children}</div>
  )
}

export default PricingSticker
