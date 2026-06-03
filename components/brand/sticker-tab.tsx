"use client"

import * as React from "react"

import { cn } from "@/lib/utils"

export interface StickerTabItem {
  value: string
  label: React.ReactNode
  /** Icône Lucide (décorative). */
  icon?: React.ReactNode
  /** Pastille (rond bordure ink + bg-pink mono). */
  badge?: React.ReactNode
}

export interface StickerTabsProps {
  tabs: StickerTabItem[]
  /** Onglet actif (controlled). */
  value: string
  onValueChange: (value: string) => void
  ariaLabel?: string
  className?: string
}

/**
 * StickerTabs — onglets charte (controlled). Onglet actif = **fond ink + texte
 * paper + ombre sticker rose + translate(-2,-2)** ; conteneur bordure 2px ink
 * sur `#fff`. Label en mono UPPERCASE. A11y `role="tablist"` + roving tabindex
 * + clavier (←/→/Home/End/Enter/Espace). Remplace Tabs shadcn & pills soft.
 */
export function StickerTabs({
  tabs,
  value,
  onValueChange,
  ariaLabel,
  className,
}: StickerTabsProps) {
  const refs = React.useRef<(HTMLButtonElement | null)[]>([])
  const selectedIdx = Math.max(
    0,
    tabs.findIndex((t) => t.value === value),
  )
  // Index ayant le focus clavier (roving). Distinct de la sélection : flèches
  // déplacent le focus (WAI-ARIA « manual activation »), Enter/Espace activent.
  const [focusIdx, setFocusIdx] = React.useState(selectedIdx)

  // Le focus roving suit la sélection quand l'onglet actif change depuis l'extérieur.
  React.useEffect(() => {
    setFocusIdx(selectedIdx)
  }, [selectedIdx])

  const moveFocus = (next: number) => {
    setFocusIdx(next)
    refs.current[next]?.focus()
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const current = focusIdx
    if (e.key === "ArrowRight") {
      e.preventDefault()
      moveFocus((current + 1) % tabs.length)
    } else if (e.key === "ArrowLeft") {
      e.preventDefault()
      moveFocus((current - 1 + tabs.length) % tabs.length)
    } else if (e.key === "Home") {
      e.preventDefault()
      moveFocus(0)
    } else if (e.key === "End") {
      e.preventDefault()
      moveFocus(tabs.length - 1)
    } else if (e.key === "Enter" || e.key === " ") {
      e.preventDefault()
      onValueChange(tabs[current].value)
    }
  }

  return (
    <div
      role="tablist"
      aria-orientation="horizontal"
      aria-label={ariaLabel}
      // Le focus vit sur les onglets (tabindex roving) ; -1 rend le conteneur
      // focusable programmatiquement sans l'insérer dans l'ordre de tabulation
      // (satisfait jsx-a11y/interactive-supports-focus pour le role tablist).
      tabIndex={-1}
      onKeyDown={handleKeyDown}
      className={cn(
        "inline-flex gap-1 overflow-x-auto rounded-2xl border-2 border-ink bg-white p-1.5",
        "[scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
        className,
      )}
    >
      {tabs.map((t, i) => {
        const active = t.value === value
        return (
          <button
            key={t.value}
            ref={(el) => {
              refs.current[i] = el
            }}
            role="tab"
            type="button"
            aria-selected={active}
            tabIndex={i === focusIdx ? 0 : -1}
            onClick={() => onValueChange(t.value)}
            onFocus={() => setFocusIdx(i)}
            className={cn(
              "inline-flex min-h-touch items-center gap-2 whitespace-nowrap rounded-xl px-4 py-2.5 font-mono text-[12px] font-bold uppercase tracking-[0.12em] transition-[color,box-shadow,transform] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2 focus-visible:ring-offset-white motion-reduce:transition-none",
              active
                ? "-translate-x-0.5 -translate-y-0.5 bg-ink text-paper shadow-stkr-pink motion-reduce:translate-x-0 motion-reduce:translate-y-0"
                : "text-mute hover:text-ink",
            )}
          >
            {t.icon ? (
              <span aria-hidden="true" className="[&_svg]:size-4">
                {t.icon}
              </span>
            ) : null}
            <span>{t.label}</span>
            {t.badge != null ? (
              <span className="grid min-w-5 place-items-center rounded-full border-2 border-ink bg-pink px-1 font-mono text-[10px] font-bold text-ink">
                {t.badge}
              </span>
            ) : null}
          </button>
        )
      })}
    </div>
  )
}

export interface SegmentedSwitcherProps
  extends Omit<StickerTabsProps, "value" | "onValueChange"> {
  value?: string
  defaultValue?: string
  onValueChange?: (value: string) => void
}

/**
 * SegmentedSwitcher — même rendu sticker, API uncontrolled simple
 * (`value`/`defaultValue`/`onValueChange`) pour les usages locaux à 2-3 options
 * sans URL (passions, academic, djs, ambassador).
 */
export function SegmentedSwitcher({
  tabs,
  value,
  defaultValue,
  onValueChange,
  ...rest
}: SegmentedSwitcherProps) {
  const [internal, setInternal] = React.useState(
    defaultValue ?? tabs[0]?.value,
  )
  const current = value ?? internal
  return (
    <StickerTabs
      tabs={tabs}
      value={current}
      onValueChange={(v) => {
        if (value === undefined) setInternal(v)
        onValueChange?.(v)
      }}
      {...rest}
    />
  )
}

export default StickerTabs
