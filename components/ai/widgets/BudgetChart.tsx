"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { TrendingDown, TrendingUp } from "lucide-react"

interface BudgetChartProps {
  category: string
  current: number
  limit: number
  history: number[]
}

export function BudgetChart({ category, current, limit, history }: BudgetChartProps) {
  const percentage = Math.min((current / limit) * 100, 100)
  const isHigh = percentage > 80

  return (
    <Card className="w-full border-l-4 border-l-indigo-500 shadow-sm">
      <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between">
        <CardTitle className="text-sm font-bold uppercase text-muted-foreground">
          {category}
        </CardTitle>
        <div className={`text-xs font-bold px-2 py-1 rounded ${isHigh ? 'bg-destructive text-destructive' : 'bg-lime text-lime'}`}>
          {percentage.toFixed(0)}% Utilisé
        </div>
      </CardHeader>
      <CardContent className="p-4 pt-2">
        <div className="flex items-baseline gap-1 mb-2">
          <span className="text-2xl font-bold">{current}</span>
          <span className="text-sm text-muted-foreground">/ {limit} MAD</span>
        </div>
        
        <Progress value={percentage} className={`h-2 ${isHigh ? 'bg-destructive' : 'bg-paper-2'}`} />
        
        <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <TrendingUp className="w-3 h-3 text-pink" />
            <span>Moyenne: {(limit * 0.6).toFixed(0)} MAD</span>
          </div>
          <div className="flex gap-1 h-8 items-end">
            {history.map((val, i) => (
              <div 
                key={i} 
                className="w-2 bg-pink rounded-t-sm" 
                style={{ height: `${(val / limit) * 100}%` }} 
              />
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
