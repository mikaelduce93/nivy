"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  Trophy,
  TrendingUp,
  TrendingDown,
  Dumbbell,
  Timer,
  Flame,
  Zap,
  Activity,
  Move,
  Target,
  Plus,
  ChevronDown,
  ChevronUp,
  Award,
  Calendar,
  Sparkles,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

/* ==========================================================================
   TYPES
   ========================================================================== */

interface RecordType {
  id: string
  label: string
  category: string
  unit: string
  icon: string
}

interface PersonalRecord {
  id: string
  teen_id: string
  record_type: string
  record_category: string
  value: number
  unit: string
  previous_value?: number
  improvement_percent?: number
  proof_url?: string
  verified: boolean
  xp_awarded?: number
  achieved_at: string
  type_info: RecordType
}

interface RecordHistory {
  [recordType: string]: Array<{ value: number; date: string }>
}

interface RecordStats {
  total_records: number
  recent_improvements: number
  total_xp_earned: number
  by_category: Array<{ category: string; count: number }>
}

/* ==========================================================================
   ICON MAPPING
   ========================================================================== */

const iconMap: Record<string, React.ElementType> = {
  dumbbell: Dumbbell,
  timer: Timer,
  flame: Flame,
  run: Activity,
  activity: Activity,
  stretch: Move,
  zap: Zap,
  move: Move,
  "trending-up": TrendingUp,
  target: Target,
}

/* ==========================================================================
   MINI CHART COMPONENT
   ========================================================================== */

interface MiniChartProps {
  data: Array<{ value: number; date: string }>
  isTimeBased?: boolean
}

function MiniChart({ data, isTimeBased = false }: MiniChartProps) {
  if (!data || data.length < 2) {
    return (
      <div className="h-12 flex items-center justify-center text-xs text-zinc-600">
        Pas assez de donnees
      </div>
    )
  }

  // Sort by date
  const sortedData = [...data].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  )

  const values = sortedData.map((d) => d.value)
  const min = Math.min(...values)
  const max = Math.max(...values)
  const range = max - min || 1

  const points = sortedData.map((d, i) => {
    const x = (i / (sortedData.length - 1)) * 100
    const y = 100 - ((d.value - min) / range) * 100
    return `${x},${y}`
  }).join(" ")

  // For time-based records, improvement is shown differently (lower is better)
  const firstValue = values[0]
  const lastValue = values[values.length - 1]
  const improved = isTimeBased ? lastValue < firstValue : lastValue > firstValue

  return (
    <div className="h-12 relative">
      <svg
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        className="w-full h-full"
      >
        <defs>
          <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
            <stop
              offset="0%"
              stopColor={improved ? "rgb(34, 197, 94)" : "rgb(239, 68, 68)"}
              stopOpacity="0.3"
            />
            <stop
              offset="100%"
              stopColor={improved ? "rgb(34, 197, 94)" : "rgb(239, 68, 68)"}
              stopOpacity="0"
            />
          </linearGradient>
        </defs>
        <polygon
          points={`0,100 ${points} 100,100`}
          fill="url(#chartGradient)"
        />
        <polyline
          points={points}
          fill="none"
          stroke={improved ? "rgb(34, 197, 94)" : "rgb(239, 68, 68)"}
          strokeWidth="2"
          vectorEffect="non-scaling-stroke"
        />
      </svg>
    </div>
  )
}

/* ==========================================================================
   RECORD CARD
   ========================================================================== */

interface RecordCardProps {
  record: PersonalRecord
  history?: Array<{ value: number; date: string }>
  onEdit?: () => void
}

function RecordCard({ record, history, onEdit }: RecordCardProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  const Icon = iconMap[record.type_info.icon] || Target
  const isTimeBased = ["minutes", "seconds"].includes(record.unit)

  const categoryColors: Record<string, { bg: string; text: string; border: string }> = {
    strength: { bg: "bg-red-500/10", text: "text-red-400", border: "border-red-500/30" },
    cardio: { bg: "bg-blue-500/10", text: "text-blue-400", border: "border-blue-500/30" },
    flexibility: { bg: "bg-purple-500/10", text: "text-purple-400", border: "border-purple-500/30" },
    speed: { bg: "bg-yellow-500/10", text: "text-yellow-400", border: "border-yellow-500/30" },
    power: { bg: "bg-orange-500/10", text: "text-orange-400", border: "border-orange-500/30" },
  }

  const colors = categoryColors[record.record_category] || categoryColors.strength

  const formatValue = (value: number, unit: string) => {
    if (unit === "minutes") {
      const mins = Math.floor(value)
      const secs = Math.round((value - mins) * 60)
      return `${mins}:${secs.toString().padStart(2, "0")}`
    }
    if (unit === "seconds") {
      return `${value.toFixed(1)}s`
    }
    if (unit === "meters") {
      return `${value.toFixed(2)}m`
    }
    if (unit === "cm") {
      return `${value}cm`
    }
    return `${value}`
  }

  const improvementSign = record.improvement_percent
    ? record.improvement_percent > 0
      ? "+"
      : ""
    : ""

  return (
    <motion.div layout>
      <Card
        className={cn(
          "overflow-hidden transition-all cursor-pointer hover:border-zinc-700",
          "bg-zinc-900 border-zinc-800"
        )}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="p-4">
          <div className="flex items-center gap-4">
            {/* Icon */}
            <div className={cn(
              "w-14 h-14 rounded-2xl flex items-center justify-center",
              colors.bg
            )}>
              <Icon className={cn("w-7 h-7", colors.text)} />
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className={cn(
                  "text-xs font-medium px-2 py-0.5 rounded-full capitalize",
                  colors.bg, colors.text
                )}>
                  {record.record_category}
                </span>
                {record.verified && (
                  <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-green-500/10 text-green-400">
                    Verifie
                  </span>
                )}
              </div>

              <h3 className="font-bold text-white">{record.type_info.label}</h3>

              <div className="flex items-center gap-3 mt-1">
                <span className="text-2xl font-bold text-white">
                  {formatValue(record.value, record.unit)}
                </span>
                {record.improvement_percent !== undefined && record.improvement_percent !== 0 && (
                  <span className={cn(
                    "flex items-center gap-1 text-sm font-medium",
                    record.improvement_percent > 0 ? "text-green-400" : "text-red-400"
                  )}>
                    {record.improvement_percent > 0 ? (
                      <TrendingUp className="w-4 h-4" />
                    ) : (
                      <TrendingDown className="w-4 h-4" />
                    )}
                    {improvementSign}{Math.abs(record.improvement_percent).toFixed(1)}%
                  </span>
                )}
              </div>
            </div>

            {/* Mini chart */}
            <div className="w-24 hidden sm:block">
              <MiniChart data={history || []} isTimeBased={isTimeBased} />
            </div>

            {/* Expand indicator */}
            <div className="text-zinc-600">
              {isExpanded ? (
                <ChevronUp className="w-5 h-5" />
              ) : (
                <ChevronDown className="w-5 h-5" />
              )}
            </div>
          </div>
        </div>

        {/* Expanded details */}
        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="px-4 pb-4 border-t border-zinc-800 pt-4">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
                  <div className="text-center p-3 bg-zinc-800/50 rounded-xl">
                    <p className="text-xs text-zinc-500 mb-1">Record actuel</p>
                    <p className="font-bold text-white">
                      {formatValue(record.value, record.unit)}
                    </p>
                  </div>
                  {record.previous_value && (
                    <div className="text-center p-3 bg-zinc-800/50 rounded-xl">
                      <p className="text-xs text-zinc-500 mb-1">Precedent</p>
                      <p className="font-bold text-zinc-400">
                        {formatValue(record.previous_value, record.unit)}
                      </p>
                    </div>
                  )}
                  <div className="text-center p-3 bg-zinc-800/50 rounded-xl">
                    <p className="text-xs text-zinc-500 mb-1">XP gagnes</p>
                    <p className="font-bold text-cyan-400">
                      +{record.xp_awarded || 0} XP
                    </p>
                  </div>
                  <div className="text-center p-3 bg-zinc-800/50 rounded-xl">
                    <p className="text-xs text-zinc-500 mb-1">Date</p>
                    <p className="font-bold text-white">
                      {new Date(record.achieved_at).toLocaleDateString("fr-FR", {
                        day: "numeric",
                        month: "short",
                      })}
                    </p>
                  </div>
                </div>

                {/* Full chart */}
                <div className="h-32 bg-zinc-800/50 rounded-xl p-4">
                  <p className="text-xs text-zinc-500 mb-2">Evolution</p>
                  <div className="h-20">
                    <MiniChart data={history || []} isTimeBased={isTimeBased} />
                  </div>
                </div>

                {onEdit && (
                  <Button
                    onClick={(e) => {
                      e.stopPropagation()
                      onEdit()
                    }}
                    className="w-full mt-4 bg-gradient-to-r from-cyan-500 to-blue-500"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Ajouter un nouveau record
                  </Button>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </Card>
    </motion.div>
  )
}

/* ==========================================================================
   ADD RECORD MODAL
   ========================================================================== */

interface AddRecordModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (recordType: string, value: number, proofUrl?: string) => void
  recordTypes: RecordType[]
  selectedType?: string
}

function AddRecordModal({
  isOpen,
  onClose,
  onSubmit,
  recordTypes,
  selectedType,
}: AddRecordModalProps) {
  const [recordType, setRecordType] = useState(selectedType || "")
  const [value, setValue] = useState("")
  const [category, setCategory] = useState("")

  const categories = [...new Set(recordTypes.map((r) => r.category))]
  const filteredTypes = category
    ? recordTypes.filter((r) => r.category === category)
    : recordTypes

  const selectedTypeInfo = recordTypes.find((r) => r.id === recordType)

  const handleSubmit = () => {
    if (recordType && value) {
      onSubmit(recordType, parseFloat(value))
      onClose()
      setRecordType("")
      setValue("")
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/80"
        onClick={onClose}
      />
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="relative bg-zinc-900 rounded-2xl p-6 max-w-md w-full border border-zinc-800 max-h-[90vh] overflow-y-auto"
      >
        <h3 className="text-xl font-bold text-white mb-6">Nouveau record personnel</h3>

        {/* Category filter */}
        <div className="mb-4">
          <label className="text-sm text-zinc-400 mb-2 block">Categorie</label>
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => setCategory("")}
              className={cn(
                "px-3 py-1.5 rounded-lg text-sm font-medium transition-all",
                !category
                  ? "bg-cyan-500 text-white"
                  : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
              )}
            >
              Toutes
            </button>
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setCategory(cat)}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-sm font-medium capitalize transition-all",
                  category === cat
                    ? "bg-cyan-500 text-white"
                    : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
                )}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Record type selection */}
        <div className="mb-4">
          <label className="text-sm text-zinc-400 mb-2 block">Type de record</label>
          <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto">
            {filteredTypes.map((type) => {
              const Icon = iconMap[type.icon] || Target
              return (
                <button
                  key={type.id}
                  onClick={() => setRecordType(type.id)}
                  className={cn(
                    "p-3 rounded-xl flex items-center gap-2 transition-all text-left",
                    recordType === type.id
                      ? "bg-cyan-500/20 border-2 border-cyan-500"
                      : "bg-zinc-800 border-2 border-transparent hover:border-zinc-700"
                  )}
                >
                  <Icon className={cn(
                    "w-5 h-5 flex-shrink-0",
                    recordType === type.id ? "text-cyan-400" : "text-zinc-400"
                  )} />
                  <span className={cn(
                    "text-sm truncate",
                    recordType === type.id ? "text-cyan-400" : "text-zinc-400"
                  )}>
                    {type.label}
                  </span>
                </button>
              )
            })}
          </div>
        </div>

        {/* Value input */}
        <div className="mb-6">
          <label className="text-sm text-zinc-400 mb-2 block">
            Valeur {selectedTypeInfo && `(${selectedTypeInfo.unit})`}
          </label>
          <input
            type="number"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder={selectedTypeInfo ? `Ex: 50 ${selectedTypeInfo.unit}` : "Entrez votre record"}
            className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-white text-lg"
            step="any"
          />
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <Button
            onClick={onClose}
            variant="outline"
            className="flex-1 border-zinc-700"
          >
            Annuler
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!recordType || !value}
            className="flex-1 bg-gradient-to-r from-cyan-500 to-blue-500"
          >
            <Plus className="w-4 h-4 mr-2" />
            Enregistrer
          </Button>
        </div>
      </motion.div>
    </div>
  )
}

/* ==========================================================================
   PERSONAL RECORDS DASHBOARD
   ========================================================================== */

interface PersonalRecordsDashboardProps {
  teenId: string
}

export function PersonalRecordsDashboard({ teenId }: PersonalRecordsDashboardProps) {
  const [records, setRecords] = useState<PersonalRecord[]>([])
  const [recordTypes, setRecordTypes] = useState<RecordType[]>([])
  const [history, setHistory] = useState<RecordHistory>({})
  const [stats, setStats] = useState<RecordStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [filterCategory, setFilterCategory] = useState("")
  const [showAddModal, setShowAddModal] = useState(false)
  const [selectedTypeForEdit, setSelectedTypeForEdit] = useState<string | undefined>()

  const fetchRecords = async () => {
    setLoading(true)
    try {
      let url = `/api/teen/sport/records?teenId=${teenId}`
      if (filterCategory) url += `&category=${filterCategory}`

      const response = await fetch(url)
      const data = await response.json()

      if (data.success) {
        setRecords(data.records)
        setRecordTypes(data.recordTypes)
        setHistory(data.history)
        setStats(data.stats)
      }
    } catch (error) {
      console.error("Error fetching records:", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchRecords()
  }, [teenId, filterCategory])

  const handleAddRecord = async (recordType: string, value: number, proofUrl?: string) => {
    try {
      const response = await fetch("/api/teen/sport/records", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          teenId,
          recordType,
          value,
          proofUrl,
        }),
      })

      const data = await response.json()
      if (data.success) {
        fetchRecords()
      }
    } catch (error) {
      console.error("Error adding record:", error)
    }
  }

  const categories = [...new Set(recordTypes.map((r) => r.category))]

  if (loading) {
    return (
      <div className="space-y-4 animate-pulse">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-24 bg-zinc-800 rounded-2xl" />
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Stats header */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <Card className="p-4 bg-zinc-900 border-zinc-800 text-center">
            <Trophy className="w-6 h-6 text-yellow-400 mx-auto mb-2" />
            <p className="text-2xl font-bold text-white">{stats.total_records}</p>
            <p className="text-xs text-zinc-500">Records</p>
          </Card>
          <Card className="p-4 bg-zinc-900 border-zinc-800 text-center">
            <TrendingUp className="w-6 h-6 text-green-400 mx-auto mb-2" />
            <p className="text-2xl font-bold text-white">{stats.recent_improvements}</p>
            <p className="text-xs text-zinc-500">Ameliorations</p>
          </Card>
          <Card className="p-4 bg-zinc-900 border-zinc-800 text-center">
            <Zap className="w-6 h-6 text-cyan-400 mx-auto mb-2" />
            <p className="text-2xl font-bold text-white">{stats.total_xp_earned}</p>
            <p className="text-xs text-zinc-500">XP gagnes</p>
          </Card>
          <Card className="p-4 bg-zinc-900 border-zinc-800 text-center">
            <Award className="w-6 h-6 text-purple-400 mx-auto mb-2" />
            <p className="text-2xl font-bold text-white">{stats.by_category.length}</p>
            <p className="text-xs text-zinc-500">Categories</p>
          </Card>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        {/* Category filter */}
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setFilterCategory("")}
            className={cn(
              "px-4 py-2 rounded-xl text-sm font-medium transition-all",
              !filterCategory
                ? "bg-cyan-500 text-white"
                : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
            )}
          >
            Toutes
          </button>
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setFilterCategory(cat)}
              className={cn(
                "px-4 py-2 rounded-xl text-sm font-medium capitalize transition-all",
                filterCategory === cat
                  ? "bg-cyan-500 text-white"
                  : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
              )}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Add button */}
        <Button
          onClick={() => {
            setSelectedTypeForEdit(undefined)
            setShowAddModal(true)
          }}
          className="bg-gradient-to-r from-cyan-500 to-blue-500"
        >
          <Plus className="w-4 h-4 mr-2" />
          Nouveau record
        </Button>
      </div>

      {/* Records list */}
      <div className="space-y-4">
        {records.map((record) => (
          <RecordCard
            key={record.id}
            record={record}
            history={history[record.record_type]}
            onEdit={() => {
              setSelectedTypeForEdit(record.record_type)
              setShowAddModal(true)
            }}
          />
        ))}
      </div>

      {/* Empty state */}
      {records.length === 0 && (
        <Card className="p-8 bg-zinc-900 border-zinc-800 text-center">
          <Trophy className="w-12 h-12 text-zinc-600 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-white mb-2">Aucun record</h3>
          <p className="text-zinc-400 mb-4">
            Commence a enregistrer tes performances personnelles !
          </p>
          <Button
            onClick={() => setShowAddModal(true)}
            className="bg-gradient-to-r from-cyan-500 to-blue-500"
          >
            <Plus className="w-4 h-4 mr-2" />
            Ajouter mon premier record
          </Button>
        </Card>
      )}

      {/* Add record modal */}
      <AddRecordModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSubmit={handleAddRecord}
        recordTypes={recordTypes}
        selectedType={selectedTypeForEdit}
      />
    </div>
  )
}

/* ==========================================================================
   RECORDS WIDGET
   ========================================================================== */

interface RecordsWidgetProps {
  teenId: string
  limit?: number
  onSeeAll?: () => void
}

export function RecordsWidget({ teenId, limit = 3, onSeeAll }: RecordsWidgetProps) {
  const [records, setRecords] = useState<PersonalRecord[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchRecords = async () => {
      try {
        const response = await fetch(`/api/teen/sport/records?teenId=${teenId}`)
        const data = await response.json()
        if (data.success) {
          // Get most recent records
          const sorted = data.records.sort(
            (a: PersonalRecord, b: PersonalRecord) =>
              new Date(b.achieved_at).getTime() - new Date(a.achieved_at).getTime()
          )
          setRecords(sorted.slice(0, limit))
        }
      } catch (error) {
        console.error("Error fetching records:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchRecords()
  }, [teenId, limit])

  if (loading) {
    return (
      <div className="space-y-3 animate-pulse">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-16 bg-zinc-800 rounded-xl" />
        ))}
      </div>
    )
  }

  if (records.length === 0) {
    return null
  }

  return (
    <Card className="p-4 bg-zinc-900 border-zinc-800">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-bold text-white flex items-center gap-2">
          <Trophy className="w-4 h-4 text-yellow-400" />
          Records personnels
        </h3>
        {onSeeAll && (
          <button
            onClick={onSeeAll}
            className="text-sm text-cyan-400 hover:underline"
          >
            Voir tout
          </button>
        )}
      </div>

      <div className="space-y-3">
        {records.map((record) => {
          const Icon = iconMap[record.type_info.icon] || Target
          return (
            <div
              key={record.id}
              className="flex items-center gap-3 p-2 rounded-lg hover:bg-zinc-800/50 transition-colors"
            >
              <div className="w-10 h-10 rounded-xl bg-yellow-500/10 flex items-center justify-center">
                <Icon className="w-5 h-5 text-yellow-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-white font-medium truncate">
                  {record.type_info.label}
                </p>
                <p className="text-xs text-zinc-500">
                  {record.value} {record.unit}
                </p>
              </div>
              {record.improvement_percent !== undefined && record.improvement_percent > 0 && (
                <span className="flex items-center gap-1 text-xs text-green-400">
                  <TrendingUp className="w-3 h-3" />
                  +{record.improvement_percent.toFixed(0)}%
                </span>
              )}
            </div>
          )
        })}
      </div>
    </Card>
  )
}
