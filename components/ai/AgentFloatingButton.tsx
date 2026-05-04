"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Sparkles, Shield, TrendingUp, Zap, Terminal } from "lucide-react" // Ensure icons are imported or use placeholders
import { cn } from "@/lib/utils"
import { AgentSheet } from "./AgentSheet"

interface AgentFloatingButtonProps {
  role: "teen" | "parent" | "ambassador" | "partner" | "admin"
  context?: any
}

export function AgentFloatingButton({ role, context }: AgentFloatingButtonProps) {
  // Agent configuration per role
  const agentConfig = {
    teen: { name: "Kai", color: "bg-cyan-500", icon: Sparkles },
    parent: { name: "Aura", color: "bg-indigo-500", icon: Shield },
    partner: { name: "Biz", color: "bg-emerald-500", icon: TrendingUp },
    ambassador: { name: "Hype", color: "bg-amber-500", icon: Zap },
    admin: { name: "Ops", color: "bg-slate-800", icon: Terminal },
  }

  const config = agentConfig[role as keyof typeof agentConfig] || agentConfig.teen
  const Icon = config.icon

  return (
    <div className="fixed bottom-6 right-6 z-50">
      <AgentSheet role={role} context={context}>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className={cn(
            "w-14 h-14 rounded-full shadow-xl flex items-center justify-center text-white transition-colors",
            config.color
          )}
        >
          <Icon className="w-6 h-6" />
        </motion.button>
      </AgentSheet>
    </div>
  )
}
