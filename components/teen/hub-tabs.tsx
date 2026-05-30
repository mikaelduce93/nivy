"use client"

import * as React from "react"
import { useSearchParams, useRouter, usePathname } from "next/navigation"
import type { LucideIcon } from "lucide-react"

import { StickerTabs, type StickerTabItem } from "@/components/brand/sticker-tab"

export interface HubTab {
  id: string
  label: string
  icon?: LucideIcon
  badge?: number
  /** @deprecated Conservé pour compat ; l'actif est désormais charte (ink). */
  color?: string
}

interface HubTabsProps {
  tabs: HubTab[]
  defaultTab?: string
  className?: string
  onChange?: (tabId: string) => void
  ariaLabel?: string
}

/**
 * HubTabs — switcher URL-driven des hubs ado. Wrapper mince au-dessus de
 * `<StickerTabs>` (F6) : conserve l'API (`?tab=`, `router.push(..., { scroll:
 * false })`, `onChange`, badges) — ISO-comportement pour wallet/social/quests/
 * profile — mais le rendu passe charte (actif = fond ink + texte paper + ombre
 * rose + translate) avec a11y tablist + clavier.
 */
export function HubTabs({ tabs, defaultTab, className, onChange, ariaLabel }: HubTabsProps) {
  const searchParams = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()

  const currentTab = searchParams.get("tab") || defaultTab || tabs[0]?.id

  const handleTabChange = (tabId: string) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set("tab", tabId)
    router.push(`${pathname}?${params.toString()}`, { scroll: false })
    onChange?.(tabId)
  }

  const items: StickerTabItem[] = tabs.map((tab) => {
    const Icon = tab.icon
    return {
      value: tab.id,
      label: tab.label,
      icon: Icon ? <Icon className="size-4" /> : undefined,
      badge:
        tab.badge !== undefined && tab.badge > 0
          ? tab.badge > 99
            ? "99+"
            : tab.badge
          : undefined,
    }
  })

  return (
    <StickerTabs
      tabs={items}
      value={currentTab}
      onValueChange={handleTabChange}
      ariaLabel={ariaLabel}
      className={className}
    />
  )
}

// Hook to get current tab
export function useHubTab(defaultTab: string): string {
  const searchParams = useSearchParams()
  return searchParams.get("tab") || defaultTab
}
