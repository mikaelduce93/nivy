"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  Users,
  TrendingUp,
  DollarSign,
  Activity,
  ArrowUpRight,
  ArrowDownRight,
  RefreshCw,
  Zap,
  Clock,
  UserPlus,
  ShoppingCart,
  Calendar
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

  return (
    <div className="space-y-6 mb-8">
      {/* Live Status Bar */}
      <div className="flex items-center justify-between p-4 bg-zinc-900 rounded-xl border border-zinc-800">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className={`h-3 w-3 rounded-full ${isLive ? "bg-emerald-500 animate-pulse" : "bg-zinc-500"}`} />
            <span className={`text-sm font-medium ${isLive ? "text-emerald-400" : "text-zinc-400"}`}>
              {isLive ? "Live" : "Pause"}
            </span>
          </div>
          <div className="flex items-center gap-2 text-xs text-zinc-500">
            <Clock className="h-3 w-3" />
            Dernière MAJ: {formatTime(lastUpdate)}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsLive(!isLive)}
            className={`text-xs ${isLive ? "text-amber-400" : "text-emerald-400"}`}
          >
            {isLive ? "Pause" : "Reprendre"}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleManualRefresh}
            disabled={loading}
            className="border-zinc-700 text-zinc-300"
          >
            <RefreshCw className={`h-3 w-3 mr-1 ${loading ? "animate-spin" : ""}`} />
            Rafraîchir
          </Button>
        </div>
      </div>

      {/* Live KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Online Users */}
        <Card className="bg-gradient-to-br from-emerald-500/10 to-teal-500/10 border-emerald-500/30 bg-zinc-900 relative overflow-hidden">
          <div className="absolute top-2 right-2">
            <span className="flex items-center gap-1 text-xs bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full">
              <Zap className="h-3 w-3" />
              Live
            </span>
          </div>
          <CardContent className="p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="h-10 w-10 rounded-full bg-emerald-500/20 flex items-center justify-center">
                <Activity className="h-5 w-5 text-emerald-400" />
              </div>
            </div>
            <p className="text-3xl font-black text-white">{data.teens.active}</p>
            <p className="text-xs text-emerald-400">Utilisateurs actifs</p>
          </CardContent>
        </Card>

        {/* New Users Today */}
        <Card className="bg-gradient-to-br from-blue-500/10 to-cyan-500/10 border-blue-500/30 bg-zinc-900">
          <CardContent className="p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="h-10 w-10 rounded-full bg-blue-500/20 flex items-center justify-center">
                <UserPlus className="h-5 w-5 text-blue-400" />
              </div>
            </div>
            <p className="text-3xl font-black text-white">+{data.users.today}</p>
            <p className="text-xs text-blue-400">Nouveaux aujourd'hui</p>
          </CardContent>
        </Card>

        {/* Monthly Revenue */}
        <Card className="bg-gradient-to-br from-green-500/10 to-emerald-500/10 border-green-500/30 bg-zinc-900">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="h-10 w-10 rounded-full bg-green-500/20 flex items-center justify-center">
                <DollarSign className="h-5 w-5 text-green-400" />
              </div>
              <div className={`flex items-center gap-1 text-xs ${data.revenue.growth >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                {data.revenue.growth >= 0 ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                {Math.abs(data.revenue.growth)}%
              </div>
            </div>
            <p className="text-3xl font-black text-white">{data.revenue.monthly.toLocaleString()}</p>
            <p className="text-xs text-green-400">DH ce mois</p>
          </CardContent>
        </Card>

        {/* Upcoming Events */}
        <Card className="bg-gradient-to-br from-purple-500/10 to-pink-500/10 border-purple-500/30 bg-zinc-900">
          <CardContent className="p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="h-10 w-10 rounded-full bg-purple-500/20 flex items-center justify-center">
                <Calendar className="h-5 w-5 text-purple-400" />
              </div>
            </div>
            <p className="text-3xl font-black text-white">{data.events.upcoming}</p>
            <p className="text-xs text-purple-400">Events à venir</p>
          </CardContent>
        </Card>
      </div>

      {/* Growth Indicators */}
      <div className="grid md:grid-cols-3 gap-4">
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-zinc-400">Croissance utilisateurs</p>
                <p className="text-2xl font-black text-white">
                  {data.users.growth >= 0 ? "+" : ""}{data.users.growth}%
                </p>
              </div>
              <div className={`h-12 w-12 rounded-full flex items-center justify-center ${
                data.users.growth >= 0 ? "bg-emerald-500/20" : "bg-red-500/20"
              }`}>
                {data.users.growth >= 0 ? (
                  <TrendingUp className="h-6 w-6 text-emerald-400" />
                ) : (
                  <ArrowDownRight className="h-6 w-6 text-red-400" />
                )}
              </div>
            </div>
            <p className="text-xs text-zinc-500 mt-2">vs mois dernier</p>
          </CardContent>
        </Card>

        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-zinc-400">Croissance revenus</p>
                <p className="text-2xl font-black text-white">
                  {data.revenue.growth >= 0 ? "+" : ""}{data.revenue.growth}%
                </p>
              </div>
              <div className={`h-12 w-12 rounded-full flex items-center justify-center ${
                data.revenue.growth >= 0 ? "bg-emerald-500/20" : "bg-red-500/20"
              }`}>
                {data.revenue.growth >= 0 ? (
                  <TrendingUp className="h-6 w-6 text-emerald-400" />
                ) : (
                  <ArrowDownRight className="h-6 w-6 text-red-400" />
                )}
              </div>
            </div>
            <p className="text-xs text-zinc-500 mt-2">vs mois dernier</p>
          </CardContent>
        </Card>

        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-zinc-400">Taux d'activité teens</p>
                <p className="text-2xl font-black text-white">
                  {data.teens.total > 0 ? Math.round((data.teens.active / data.teens.total) * 100) : 0}%
                </p>
              </div>
              <div className="h-12 w-12 rounded-full bg-blue-500/20 flex items-center justify-center">
                <Activity className="h-6 w-6 text-blue-400" />
              </div>
            </div>
            <p className="text-xs text-zinc-500 mt-2">{data.teens.active} sur {data.teens.total}</p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
