
'use client'

import { useEffect, useState } from 'react'
import { getLiveScorecard, type ScorecardMetrics } from '@/lib/analytics/scorecard'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { TrendingUp, Users, Zap, DollarSign } from 'lucide-react'

export default function AdminScorecardPage() {
  const [metrics, setMetrics] = useState<ScorecardMetrics | null>(null)

  useEffect(() => {
    async function load() {
      const data = await getLiveScorecard()
      setMetrics(data)
    }
    load()
  }, [])

  if (!metrics) return <div>Chargement du Live Pulse...</div>

  return (
    <div className="p-8 space-y-8 bg-black min-h-screen text-white">
      <h1 className="text-3xl font-bold bg-gradient-to-r from-cyan-400 to-blue-600 bg-clip-text text-transparent">
        Live Pulse 10/10 🚀
      </h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Retention */}
        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-zinc-400">Rétention D1</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{metrics.retention.d1}%</div>
            <p className="text-xs text-zinc-500">Target: 45-60%</p>
          </CardContent>
        </Card>

        {/* Engagement */}
        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-zinc-400">Sessions / Jour</CardTitle>
            <Zap className="h-4 w-4 text-yellow-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{metrics.engagement.avgSessionsPerDay}</div>
            <p className="text-xs text-zinc-500">Target: 2-4</p>
          </CardContent>
        </Card>

        {/* Social */}
        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-zinc-400">Actions Sociales</CardTitle>
            <Users className="h-4 w-4 text-pink-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{metrics.gamification.socialActionRate.toFixed(1)}%</div>
            <p className="text-xs text-zinc-500">Target: {'>'}40%</p>
          </CardContent>
        </Card>

        {/* Monetization */}
        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-zinc-400">Conversion</CardTitle>
            <DollarSign className="h-4 w-4 text-emerald-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{metrics.monetization.conversionRate}%</div>
            <p className="text-xs text-zinc-500">Target: 4-8%</p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}



