/**
 * TEENS PARTY MOROCCO - Activity Chart Component
 * ===============================================
 *
 * Graphiques d'activité pour le dashboard.
 */

"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import {
  Calendar,
  TrendingUp,
  Zap,
  Target,
  Gamepad2,
  ChevronLeft,
  ChevronRight,
} from "lucide-react"
import {
  type DailyActivity,
  type ActivityStats,
  type StatPeriod,
  formatLargeNumber,
} from "../../features/stats-dashboard"

/* ==========================================================================
   ACTIVITY CHART
   ========================================================================== */

interface ActivityChartProps {
  data: Array<{
    date: string
    xp: number
    events: number
    challenges: number
    games: number
  }>
  period?: StatPeriod
}

export function ActivityChart({ data, period = "week" }: ActivityChartProps) {
  const [metric, setMetric] = useState<"xp" | "events" | "challenges" | "games">(
    "xp"
  )

  const metrics = [
    { key: "xp" as const, label: "XP", icon: Zap, color: "bg-yellow-500" },
    {
      key: "events" as const,
      label: "Events",
      icon: Calendar,
      color: "bg-purple-500",
    },
    {
      key: "challenges" as const,
      label: "Défis",
      icon: Target,
      color: "bg-cyan-500",
    },
    {
      key: "games" as const,
      label: "Jeux",
      icon: Gamepad2,
      color: "bg-green-500",
    },
  ]

  const selectedMetric = metrics.find((m) => m.key === metric)!
  const maxValue = Math.max(...data.map((d) => d[metric]), 1)
  const total = data.reduce((sum, d) => sum + d[metric], 0)

  return (
    <div className="p-4 rounded-2xl bg-zinc-900 border border-zinc-800">
      {/* Header avec sélecteur de métrique */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-bold text-white flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-cyan-400" />
          Activité
        </h3>
        <div className="flex gap-1">
          {metrics.map((m) => (
            <button
              key={m.key}
              onClick={() => setMetric(m.key)}
              className={`p-2 rounded-lg transition-colors ${
                metric === m.key
                  ? `${m.color} text-white`
                  : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
              }`}
            >
              <m.icon className="w-4 h-4" />
            </button>
          ))}
        </div>
      </div>

      {/* Total */}
      <div className="mb-4">
        <p className="text-3xl font-bold text-white">
          {formatLargeNumber(total)}
        </p>
        <p className="text-sm text-zinc-400">
          {selectedMetric.label} sur la période
        </p>
      </div>

      {/* Graphique en barres */}
      <div className="flex items-end gap-1 h-32 mb-2">
        {data.map((day, idx) => {
          const height = (day[metric] / maxValue) * 100
          const date = new Date(day.date)
          const dayName = date.toLocaleDateString("fr-FR", { weekday: "short" })

          return (
            <div key={day.date} className="flex-1 flex flex-col items-center">
              <motion.div
                initial={{ height: 0 }}
                animate={{ height: `${height}%` }}
                transition={{ duration: 0.5, delay: idx * 0.05 }}
                className={`w-full rounded-t-lg ${selectedMetric.color} opacity-80 hover:opacity-100 cursor-pointer relative group min-h-[4px]`}
              >
                {/* Tooltip */}
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-black rounded text-xs text-white opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                  {day[metric]} {selectedMetric.label}
                </div>
              </motion.div>
            </div>
          )
        })}
      </div>

      {/* Labels des jours */}
      <div className="flex gap-1">
        {data.map((day) => {
          const date = new Date(day.date)
          const dayName = date.toLocaleDateString("fr-FR", { weekday: "short" })
          return (
            <div key={day.date} className="flex-1 text-center">
              <span className="text-xs text-zinc-500">{dayName}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

/* ==========================================================================
   HEATMAP CALENDAR
   ========================================================================== */

interface HeatmapCalendarProps {
  data: DailyActivity[]
  metric?: "xp" | "events" | "challenges"
}

export function HeatmapCalendar({
  data,
  metric = "xp",
}: HeatmapCalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date())

  // Générer les jours du mois
  const year = currentMonth.getFullYear()
  const month = currentMonth.getMonth()
  const firstDay = new Date(year, month, 1)
  const lastDay = new Date(year, month + 1, 0)
  const daysInMonth = lastDay.getDate()
  const startingDay = firstDay.getDay()

  // Créer une map des données par date
  const dataMap = new Map(
    data.map((d) => [d.activity_date, d])
  )

  // Calculer le max pour l'échelle de couleur
  const values = data.map((d) => {
    switch (metric) {
      case "xp":
        return d.xp_earned
      case "events":
        return d.events_attended
      case "challenges":
        return d.challenges_completed
      default:
        return 0
    }
  })
  const maxValue = Math.max(...values, 1)

  const getIntensity = (value: number): string => {
    if (value === 0) return "bg-zinc-800"
    const percent = value / maxValue
    if (percent < 0.25) return "bg-cyan-900"
    if (percent < 0.5) return "bg-cyan-700"
    if (percent < 0.75) return "bg-cyan-500"
    return "bg-cyan-400"
  }

  const days = []
  // Jours vides au début
  for (let i = 0; i < startingDay; i++) {
    days.push(<div key={`empty-${i}`} className="w-8 h-8" />)
  }
  // Jours du mois
  for (let day = 1; day <= daysInMonth; day++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(
      day
    ).padStart(2, "0")}`
    const dayData = dataMap.get(dateStr)
    const value = dayData
      ? metric === "xp"
        ? dayData.xp_earned
        : metric === "events"
        ? dayData.events_attended
        : dayData.challenges_completed
      : 0

    days.push(
      <div
        key={dateStr}
        className={`w-8 h-8 rounded ${getIntensity(
          value
        )} flex items-center justify-center text-xs cursor-pointer hover:ring-2 hover:ring-white/30 transition-all group relative`}
      >
        <span className={value > 0 ? "text-white" : "text-zinc-500"}>{day}</span>
        {/* Tooltip */}
        {value > 0 && (
          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-1 bg-black rounded text-xs text-white opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-10">
            {value} {metric === "xp" ? "XP" : metric === "events" ? "events" : "défis"}
          </div>
        )}
      </div>
    )
  }

  const prevMonth = () => {
    setCurrentMonth(new Date(year, month - 1, 1))
  }

  const nextMonth = () => {
    setCurrentMonth(new Date(year, month + 1, 1))
  }

  const monthName = currentMonth.toLocaleDateString("fr-FR", {
    month: "long",
    year: "numeric",
  })

  return (
    <div className="p-4 rounded-2xl bg-zinc-900 border border-zinc-800">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-bold text-white flex items-center gap-2">
          <Calendar className="w-5 h-5 text-cyan-400" />
          Calendrier d'activité
        </h3>
        <div className="flex items-center gap-2">
          <button
            onClick={prevMonth}
            className="p-1 rounded hover:bg-zinc-800 text-zinc-400"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <span className="text-sm text-zinc-300 min-w-[120px] text-center capitalize">
            {monthName}
          </span>
          <button
            onClick={nextMonth}
            className="p-1 rounded hover:bg-zinc-800 text-zinc-400"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Jours de la semaine */}
      <div className="grid grid-cols-7 gap-1 mb-2">
        {["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"].map((d) => (
          <div key={d} className="w-8 text-center text-xs text-zinc-500">
            {d}
          </div>
        ))}
      </div>

      {/* Grille des jours */}
      <div className="grid grid-cols-7 gap-1">{days}</div>

      {/* Légende */}
      <div className="flex items-center justify-center gap-2 mt-4 text-xs text-zinc-500">
        <span>Moins</span>
        <div className="flex gap-1">
          <div className="w-4 h-4 rounded bg-zinc-800" />
          <div className="w-4 h-4 rounded bg-cyan-900" />
          <div className="w-4 h-4 rounded bg-cyan-700" />
          <div className="w-4 h-4 rounded bg-cyan-500" />
          <div className="w-4 h-4 rounded bg-cyan-400" />
        </div>
        <span>Plus</span>
      </div>
    </div>
  )
}

/* ==========================================================================
   STATS SUMMARY WIDGET
   ========================================================================== */

interface StatsSummaryWidgetProps {
  stats: ActivityStats
  period: string
}

export function StatsSummaryWidget({ stats, period }: StatsSummaryWidgetProps) {
  return (
    <div className="p-4 rounded-xl bg-gradient-to-br from-zinc-800 to-zinc-900 border border-zinc-700">
      <p className="text-sm text-zinc-400 mb-2">{period}</p>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <p className="text-2xl font-bold text-yellow-400">
            {formatLargeNumber(stats.total_xp)}
          </p>
          <p className="text-xs text-zinc-500">XP gagnés</p>
        </div>
        <div>
          <p className="text-2xl font-bold text-purple-400">
            {stats.total_events}
          </p>
          <p className="text-xs text-zinc-500">Événements</p>
        </div>
        <div>
          <p className="text-2xl font-bold text-cyan-400">
            {stats.total_challenges}
          </p>
          <p className="text-xs text-zinc-500">Défis</p>
        </div>
        <div>
          <p className="text-2xl font-bold text-green-400">
            {stats.active_days}
          </p>
          <p className="text-xs text-zinc-500">Jours actifs</p>
        </div>
      </div>

      {stats.best_day && (
        <div className="mt-4 pt-4 border-t border-zinc-700">
          <p className="text-xs text-zinc-500 mb-1">Meilleur jour</p>
          <div className="flex items-center justify-between">
            <span className="text-sm text-zinc-300">
              {new Date(stats.best_day.date).toLocaleDateString("fr-FR", {
                weekday: "long",
                day: "numeric",
                month: "short",
              })}
            </span>
            <span className="text-yellow-400 font-bold">
              {stats.best_day.xp} XP
            </span>
          </div>
        </div>
      )}
    </div>
  )
}

/* ==========================================================================
   TREND INDICATOR
   ========================================================================== */

interface TrendIndicatorProps {
  current: number
  previous: number
  label: string
  format?: "number" | "percent"
}

export function TrendIndicator({
  current,
  previous,
  label,
  format = "number",
}: TrendIndicatorProps) {
  const diff = current - previous
  const percentChange =
    previous === 0 ? (current > 0 ? 100 : 0) : Math.round((diff / previous) * 100)

  const isUp = diff > 0
  const isStable = diff === 0

  return (
    <div className="flex items-center gap-3 p-3 rounded-lg bg-zinc-800/50">
      <div className="flex-1">
        <p className="text-xs text-zinc-500">{label}</p>
        <p className="text-lg font-bold text-white">
          {format === "percent" ? `${current}%` : formatLargeNumber(current)}
        </p>
      </div>

      {!isStable && (
        <div
          className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs ${
            isUp ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"
          }`}
        >
          {isUp ? (
            <TrendingUp className="w-3 h-3" />
          ) : (
            <TrendingUp className="w-3 h-3 rotate-180" />
          )}
          <span>{Math.abs(percentChange)}%</span>
        </div>
      )}
    </div>
  )
}

/* ==========================================================================
   MINI ACTIVITY SPARKLINE
   ========================================================================== */

interface SparklineProps {
  data: number[]
  color?: string
  height?: number
}

export function Sparkline({
  data,
  color = "#06B6D4",
  height = 30,
}: SparklineProps) {
  const max = Math.max(...data, 1)
  const points = data
    .map((value, idx) => {
      const x = (idx / (data.length - 1)) * 100
      const y = height - (value / max) * height
      return `${x},${y}`
    })
    .join(" ")

  return (
    <svg
      viewBox={`0 0 100 ${height}`}
      preserveAspectRatio="none"
      className="w-full"
      style={{ height }}
    >
      <polyline
        fill="none"
        stroke={color}
        strokeWidth="2"
        points={points}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}
