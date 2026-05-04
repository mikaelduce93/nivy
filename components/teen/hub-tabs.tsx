"use client"

import { motion } from "framer-motion"
import { useSearchParams, useRouter, usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import type { LucideIcon } from "lucide-react"

export interface HubTab {
  id: string
  label: string
  icon?: LucideIcon
  badge?: number
  color?: string
}

interface HubTabsProps {
  tabs: HubTab[]
  defaultTab?: string
  className?: string
  onChange?: (tabId: string) => void
}

export function HubTabs({ tabs, defaultTab, className, onChange }: HubTabsProps) {
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

  return (
    <div className={cn("relative", className)}>
      <div className="flex items-center gap-2 p-1.5 rounded-2xl bg-zinc-900/80 backdrop-blur-xl border border-white/5 overflow-x-auto no-scrollbar">
        {tabs.map((tab) => {
          const isActive = currentTab === tab.id
          const Icon = tab.icon

          return (
            <button
              key={tab.id}
              onClick={() => handleTabChange(tab.id)}
              className={cn(
                "relative flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm uppercase tracking-wider transition-all whitespace-nowrap",
                isActive 
                  ? "text-white" 
                  : "text-zinc-500 hover:text-zinc-300 hover:bg-white/5"
              )}
            >
              {/* Active background */}
              {isActive && (
                <motion.div
                  layoutId="hub-tab-active"
                  className={cn(
                    "absolute inset-0 rounded-xl",
                    tab.color || "bg-gradient-to-r from-gen-z-lavender/20 to-gen-z-sky/20 border border-white/10"
                  )}
                  transition={{ type: "spring", duration: 0.5 }}
                />
              )}

              {/* Icon */}
              {Icon && (
                <Icon className={cn(
                  "relative z-10 w-4 h-4 transition-colors",
                  isActive ? "text-white" : ""
                )} />
              )}

              {/* Label */}
              <span className="relative z-10">{tab.label}</span>

              {/* Badge */}
              {tab.badge !== undefined && tab.badge > 0 && (
                <span className="relative z-10 min-w-5 h-5 flex items-center justify-center px-1.5 rounded-full bg-gen-z-coral text-white text-[10px] font-black">
                  {tab.badge > 99 ? "99+" : tab.badge}
                </span>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}

// Hook to get current tab
export function useHubTab(defaultTab: string): string {
  const searchParams = useSearchParams()
  return searchParams.get("tab") || defaultTab
}
