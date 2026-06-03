
'use client'

import { useEffect, useState } from 'react'
import { getLiveScorecard, type ScorecardMetrics } from '@/lib/analytics/scorecard'
import { StatCard } from '@/components/admin/stat-card'
import { SegmentedProgress } from '@/components/ui/progress'
import { NivCoach } from '@/components/brand'
import BackButton from '@/components/admin/BackButton'
import { TrendingUp, Users, Zap, DollarSign } from 'lucide-react'

export default function AdminScorecardPage() {
  const [metrics, setMetrics] = useState<ScorecardMetrics | null>(null)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    let active = true
    async function load() {
      try {
        const data = await getLiveScorecard()
        if (active) setMetrics(data)
      } catch {
        if (active) setMetrics(null)
      } finally {
        if (active) setLoaded(true)
      }
    }
    load()
    return () => {
      active = false
    }
  }, [])

  if (!loaded) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-6 py-12 md:py-32">
          <NivCoach mood="calm" message="Je calcule le pouls de la plateforme…" className="max-w-md" />
        </div>
      </div>
    )
  }

  if (!metrics) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-6 py-12 md:py-32">
          <NivCoach
            mood="calm"
            message="Données indisponibles pour le moment — réessaie dans un instant."
            className="max-w-md"
          />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-6 py-12 md:py-32">
        <BackButton href="/admin" label="Retour au dashboard" />

        <header className="mb-8 space-y-2">
          <p className="eyebrow">Gamification · Pulse</p>
          <h1 className="font-display text-3xl font-extrabold tracking-tight text-ink">
            Pouls <em className="font-semibold italic text-pink">en direct</em>
          </h1>
          <p className="text-mute">Les KPIs critiques de la plateforme, en temps réel.</p>
        </header>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
          {/* Rétention D1 — objectif 45-60% */}
          <StatCard
            label="Rétention D1"
            value={`${metrics.retention.d1}%`}
            tone="lime"
            icon={<TrendingUp className="h-5 w-5" />}
            hint={
              <span className="block space-y-1">
                <span className="text-mute">Objectif 45–60 %</span>
                <SegmentedProgress
                  steps={6}
                  current={Math.min(Math.round((metrics.retention.d1 / 60) * 6), 6)}
                />
              </span>
            }
          />

          {/* Sessions / jour — objectif 2-4 */}
          <StatCard
            label="Sessions / jour"
            value={metrics.engagement.avgSessionsPerDay}
            tone="gold"
            icon={<Zap className="h-5 w-5" />}
            hint={
              <span className="block space-y-1">
                <span className="text-mute">Objectif 2–4</span>
                <SegmentedProgress
                  steps={4}
                  current={Math.min(Math.round(metrics.engagement.avgSessionsPerDay), 4)}
                />
              </span>
            }
          />

          {/* Actions sociales — objectif > 40% */}
          <StatCard
            label="Actions sociales"
            value={`${metrics.gamification.socialActionRate.toFixed(1)}%`}
            tone="coral"
            icon={<Users className="h-5 w-5" />}
            hint={
              <span className="block space-y-1">
                <span className="text-mute">Objectif &gt; 40 %</span>
                <SegmentedProgress
                  steps={5}
                  current={Math.min(Math.round((metrics.gamification.socialActionRate / 40) * 5), 5)}
                />
              </span>
            }
          />

          {/* Conversion — objectif 4-8% */}
          <StatCard
            label="Conversion"
            value={`${metrics.monetization.conversionRate}%`}
            tone="teal"
            icon={<DollarSign className="h-5 w-5" />}
            hint={
              <span className="block space-y-1">
                <span className="text-mute">Objectif 4–8 %</span>
                <SegmentedProgress
                  steps={8}
                  current={Math.min(Math.round(metrics.monetization.conversionRate), 8)}
                />
              </span>
            }
          />
        </div>
      </div>
    </div>
  )
}
