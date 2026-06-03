"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { StatCard } from "@/components/admin/stat-card"
import {
  Users,
  TrendingUp,
  Activity,
  ArrowDownRight,
  RefreshCw,
  UserPlus,
  Calendar,
} from "lucide-react"

interface KPIData {
  users: {
    total: number
    today: number
    monthly: number
    growth: number
  }
  teens: {
    total: number
    active: number
  }
  revenue: {
    monthly: number
    lastMonth: number
    growth: number
  }
  events: {
    total: number
    upcoming: number
  }
}

interface RealtimeKPIsProps {
  initialData: KPIData
}

export function RealtimeKPIs({ initialData }: RealtimeKPIsProps) {
  const [data, setData] = useState<KPIData>(initialData)
  const [loading, setLoading] = useState(false)
  const [lastUpdate, setLastUpdate] = useState(new Date())
  const [isLive, setIsLive] = useState(true)

  const fetchData = async () => {
    try {
      const response = await fetch("/api/admin/kpis")
      const result = await response.json()
      if (result.success) {
        setData(result.data)
        setLastUpdate(new Date())
      }
    } catch (error) {
      console.error("Error fetching KPIs:", error)
    }
  }

  useEffect(() => {
    let interval: NodeJS.Timeout

    if (isLive) {
      interval = setInterval(fetchData, 30000) // Refresh every 30 seconds
    }

    return () => {
      if (interval) clearInterval(interval)
    }
  }, [isLive])

  const handleManualRefresh = async () => {
    setLoading(true)
    await fetchData()
    setLoading(false)
  }

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('fr-FR', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    })
  }

  const teensActivityRate =
    data.teens.total > 0 ? Math.round((data.teens.active / data.teens.total) * 100) : 0

  return (
    <div className="space-y-6 mb-8">
      {/* Barre de statut live — accent unique : pill mono + point lime pulsant */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border-2 border-ink bg-white p-4 shadow-stkr-sm">
        <div className="flex items-center gap-4">
          <span className="inline-flex items-center gap-2 rounded-full border-2 border-ink bg-ink px-3 py-1">
            <span
              className={`h-2 w-2 rounded-full ${isLive ? "bg-lime animate-pulse" : "bg-mute"}`}
            />
            <span className="font-mono text-[11px] font-bold uppercase tracking-[0.16em] text-paper">
              {isLive ? "En direct" : "En pause"}
            </span>
          </span>
          <span className="font-mono text-xs text-mute">
            Dernière MAJ : {formatTime(lastUpdate)}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsLive(!isLive)}
            className="text-xs"
          >
            {isLive ? "Mettre en pause" : "Reprendre"}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleManualRefresh}
            disabled={loading}
            className="border-2 border-ink text-ink"
          >
            <RefreshCw className={`h-3 w-3 mr-1 ${loading ? "animate-spin" : ""}`} />
            Rafraîchir
          </Button>
        </div>
      </div>

      {/* Rail KPI unique — cartes sticker charte */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          label="Actifs aujourd'hui"
          value={data.teens.active}
          tone="lime"
          icon={<Activity className="h-5 w-5" />}
          hint="Ados connectés"
        />
        <StatCard
          label="Nouveaux du jour"
          value={`+${data.users.today}`}
          tone="teal"
          icon={<UserPlus className="h-5 w-5" />}
          hint="Inscriptions"
        />
        <StatCard
          label="Revenus du mois"
          value={data.revenue.monthly.toLocaleString("fr-FR")}
          tone="lime"
          mono
          icon={<TrendingUp className="h-5 w-5" />}
          hint={
            <span className={data.revenue.growth >= 0 ? "text-lime" : "text-coral"}>
              {data.revenue.growth >= 0 ? "+" : ""}
              {data.revenue.growth}% · DH
            </span>
          }
        />
        <StatCard
          label="Events à venir"
          value={data.events.upcoming}
          tone="coral"
          icon={<Calendar className="h-5 w-5" />}
          hint="Programmés"
        />
      </div>

      {/* Indicateurs de croissance — même rail, cartes sticker */}
      <div className="grid md:grid-cols-3 gap-4">
        <StatCard
          label="Croissance utilisateurs"
          value={`${data.users.growth >= 0 ? "+" : ""}${data.users.growth}%`}
          tone={data.users.growth >= 0 ? "lime" : "coral"}
          icon={
            data.users.growth >= 0 ? (
              <TrendingUp className="h-5 w-5" />
            ) : (
              <ArrowDownRight className="h-5 w-5" />
            )
          }
          hint="vs mois dernier"
        />
        <StatCard
          label="Croissance revenus"
          value={`${data.revenue.growth >= 0 ? "+" : ""}${data.revenue.growth}%`}
          tone={data.revenue.growth >= 0 ? "lime" : "coral"}
          icon={
            data.revenue.growth >= 0 ? (
              <TrendingUp className="h-5 w-5" />
            ) : (
              <ArrowDownRight className="h-5 w-5" />
            )
          }
          hint="vs mois dernier"
        />
        <StatCard
          label="Taux d'activité ados"
          value={`${teensActivityRate}%`}
          tone="teal"
          icon={<Users className="h-5 w-5" />}
          hint={`${data.teens.active} sur ${data.teens.total}`}
        />
      </div>
    </div>
  )
}
