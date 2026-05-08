"use client"

import { useState, useEffect, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { AlertTriangle, TrendingDown, Lightbulb, ArrowRight, RefreshCw, Loader2, TrendingUp, Shield, Wallet, Clock, CheckCircle, Brain } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface InsightAlert {
  id: string
  type: "warning" | "info" | "success" | "ai"
  priority: number
  message: string
  detail?: string
  action?: {
    label: string
    href: string
  }
  createdAt?: string
}

interface SmartInsightsProps {
  parentId: string
  initialAlerts?: InsightAlert[]
}

const typeIcons = {
  warning: AlertTriangle,
  info: Lightbulb,
  success: CheckCircle,
  ai: Brain,
}

const typeStyles = {
  warning: "bg-red-500/10 border-red-500/20 text-red-200",
  info: "bg-blue-500/10 border-blue-500/20 text-blue-200",
  success: "bg-emerald-500/10 border-emerald-500/20 text-emerald-200",
  ai: "bg-brand-soft/10 border-brand-soft/20 text-brand-soft",
}

const iconStyles = {
  warning: "text-red-400",
  info: "text-blue-400",
  success: "text-emerald-400",
  ai: "text-brand-soft",
}

export function SmartInsights({ parentId, initialAlerts = [] }: SmartInsightsProps) {
  const [alerts, setAlerts] = useState<InsightAlert[]>(initialAlerts)
  const [loading, setLoading] = useState(initialAlerts.length === 0)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchInsights = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true)
    else setLoading(true)
    
    try {
      const response = await fetch('/api/parent/insights')
      
      if (!response.ok) {
        throw new Error('Failed to fetch insights')
      }
      
      const data = await response.json()
      setAlerts(data.insights || [])
      setError(null)
    } catch (err) {
      console.error('[SmartInsights] Error:', err)
      setError('Impossible de charger les insights')
      
      // Fallback to generated insights based on common patterns
      if (alerts.length === 0) {
        setAlerts([
          {
            id: 'tip-1',
            type: 'info',
            priority: 1,
            message: 'Conseil: Définissez des limites de dépenses par catégorie',
            action: { label: 'Configurer', href: '/parent/settings/budget' }
          }
        ])
      }
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [alerts.length])

  useEffect(() => {
    if (initialAlerts.length === 0) {
      fetchInsights()
    }
  }, [initialAlerts.length, fetchInsights])

  // Sort by priority (higher = more important)
  const sortedAlerts = [...alerts].sort((a, b) => (b.priority || 0) - (a.priority || 0))

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-zinc-500" />
      </div>
    )
  }

  if (sortedAlerts.length === 0 && !error) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col items-center justify-center py-8 text-center"
      >
        <CheckCircle className="h-8 w-8 text-emerald-500 mb-2" />
        <p className="text-sm text-zinc-400">Tout va bien ! Aucune alerte pour le moment.</p>
      </motion.div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header with refresh */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-2">
          <Brain className="h-4 w-4 text-brand-soft" />
          Insights Intelligents
        </h3>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => fetchInsights(true)}
          disabled={refreshing}
          className="h-7 px-2 text-zinc-500 hover:text-white"
        >
          <RefreshCw className={cn("h-3.5 w-3.5", refreshing && "animate-spin")} />
        </Button>
      </div>

      {/* Error state */}
      {error && (
        <div className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg p-3">
          {error}
        </div>
      )}

      {/* Alerts list */}
      <div className="space-y-3">
        <AnimatePresence mode="popLayout">
          {sortedAlerts.map((alert, idx) => {
            const Icon = typeIcons[alert.type] || Lightbulb
            
            return (
              <motion.div
                key={alert.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ delay: idx * 0.05 }}
                className={cn(
                  "flex items-start justify-between p-4 rounded-xl border transition-all hover:scale-[1.01]",
                  typeStyles[alert.type]
                )}
              >
                <div className="flex items-start gap-3 flex-1">
                  <div className={cn("mt-0.5", iconStyles[alert.type])}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium leading-snug">{alert.message}</p>
                    {alert.detail && (
                      <p className="text-xs opacity-70 mt-1">{alert.detail}</p>
                    )}
                  </div>
                </div>
                {alert.action && (
                  <Link 
                    href={alert.action.href}
                    className="flex items-center gap-1 text-xs font-bold hover:underline shrink-0 ml-3"
                  >
                    {alert.action.label}
                    <ArrowRight className="h-3 w-3" />
                  </Link>
                )}
              </motion.div>
            )
          })}
        </AnimatePresence>
      </div>

      {/* AI suggestion prompt */}
      {sortedAlerts.length > 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="pt-3 border-t border-white/5"
        >
          <Link
            href="/parent/ai-assistant"
            className="flex items-center gap-2 text-xs text-zinc-500 hover:text-brand-soft transition-colors group"
          >
            <Brain className="h-3.5 w-3.5 group-hover:animate-pulse" />
            <span>Demander des conseils à l'assistant IA</span>
            <ArrowRight className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
          </Link>
        </motion.div>
      )}
    </div>
  )
}

// Standalone fetch function for server-side use
export async function fetchParentInsights(parentId: string): Promise<InsightAlert[]> {
  // This would be used server-side
  return []
}

export default SmartInsights
