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
  const idx = Math.max(
    0,
    tabs.findIndex((t) => t.value === value),
  )

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    let next = idx
    if (e.key === "ArrowRight") next = (idx + 1) % tabs.length
    else if (e.key === "ArrowLeft") next = (idx - 1 + tabs.length) % tabs.length
    else if (e.key === "Home") next = 0
    else if (e.key === "End") next = tabs.length - 1
    else return
    e.preventDefault()
    onValueChange(tabs[next].value)
    refs.current[next]?.focus()
  }

  return (
    <div
      role="tablist"
      aria-orientation="horizontal"
      aria-label={ariaLabel}
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
            tabIndex={active ? 0 : -1}
            onClick={() => onValueChange(t.value)}
            className={cn(
              "inline-flex items-center gap-2 whitespace-nowrap rounded-xl px-4 py-2.5 font-mono text-[12px] font-bold uppercase tracking-[0.12em] transition-all",
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
