import type { ReactNode } from "react"
import { Card } from "@/components/ui/card"
import { cn } from "@/lib/utils"

interface StatCardProps {
  label: string
  value: string | number
  icon: ReactNode
  trend?: string
  trendUp?: boolean
  className?: string
}

export function StatCard({ label, value, icon, trend, trendUp, className }: StatCardProps) {
  return (
    <Card className={cn("p-6", className)}>
      <div className="flex items-start justify-between mb-4">
        <div className="p-3 rounded-xl bg-gradient-to-br from-primary/20 to-accent/20">{icon}</div>
        {trend && (
          <span className={cn("text-sm font-medium", trendUp ? "text-green-500" : "text-red-500")}>{trend}</span>
        )}
      </div>
      <p className="text-3xl font-bold mb-1">{value}</p>
      <p className="text-sm text-muted-foreground">{label}</p>
    </Card>
  )
}
