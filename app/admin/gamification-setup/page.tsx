"use client"

import { useState } from "react"
import { CheckCircle, XCircle, Loader2, Database, Play, AlertTriangle } from "lucide-react"

const MIGRATIONS = [
  { id: "001", name: "Achievements System", file: "001_achievements_system.sql" },
  { id: "002", name: "Leaderboard System", file: "002_leaderboard_system.sql" },
  { id: "003", name: "Missions System", file: "003_missions_system.sql" },
  { id: "004", name: "Rewards Shop", file: "004_rewards_shop.sql" },
  { id: "005", name: "Fortune Wheel", file: "005_fortune_wheel.sql" },
  { id: "006", name: "Friend Challenges", file: "006_friend_challenges.sql" },
  { id: "007", name: "Crews System", file: "007_crews_system.sql" },
  { id: "008", name: "Special Challenges", file: "008_special_challenges.sql" },
  { id: "009", name: "Event Challenges", file: "009_event_challenges.sql" },
  { id: "010", name: "Seasonal Challenges", file: "010_seasonal_challenges.sql" },
  { id: "011", name: "Mini Games", file: "011_mini_games.sql" },
  { id: "012", name: "Stats Dashboard", file: "012_user_stats_dashboard.sql" },
  { id: "013", name: "Annual Wrapped", file: "013_annual_wrapped.sql" },
  { id: "014", name: "Profile Customization", file: "014_profile_customization.sql" },
  { id: "015", name: "Collections", file: "015_collections.sql" },
  { id: "016", name: "Notifications", file: "016_gamified_notifications.sql" },
  { id: "017", name: "VIP System", file: "017_vip_system.sql" },
  { id: "018", name: "Activity Feed", file: "018_activity_feed.sql" },
  { id: "019", name: "Social Sharing", file: "019_social_sharing.sql" },
]

type MigrationStatus = "pending" | "running" | "success" | "error"

export default function GamificationSetupPage() {
  const [statuses, setStatuses] = useState<Record<string, MigrationStatus>>({})
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isRunning, setIsRunning] = useState(false)
  const [currentMigration, setCurrentMigration] = useState<string | null>(null)

  const runMigration = async (migrationId: string) => {
    setStatuses(prev => ({ ...prev, [migrationId]: "running" }))
    setCurrentMigration(migrationId)

    try {
      const response = await fetch("/api/admin/run-migration", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ migrationId }),
      })

      const result = await response.json()

      if (result.success) {
        setStatuses(prev => ({ ...prev, [migrationId]: "success" }))
      } else {
        setStatuses(prev => ({ ...prev, [migrationId]: "error" }))
        setErrors(prev => ({ ...prev, [migrationId]: result.error }))
      }
    } catch (err: any) {
      setStatuses(prev => ({ ...prev, [migrationId]: "error" }))
      setErrors(prev => ({ ...prev, [migrationId]: err.message }))
    }

    setCurrentMigration(null)
  }

  const runAllMigrations = async () => {
    setIsRunning(true)
    setStatuses({})
    setErrors({})

    for (const migration of MIGRATIONS) {
      await runMigration(migration.id)
      // Pause entre migrations
      await new Promise(resolve => setTimeout(resolve, 500))
    }

    setIsRunning(false)
  }

  const getStatusIcon = (status: MigrationStatus | undefined) => {
    switch (status) {
      case "running":
        return <Loader2 className="w-5 h-5 text-blue-400 animate-spin" />
      case "success":
        return <CheckCircle className="w-5 h-5 text-green-400" />
      case "error":
        return <XCircle className="w-5 h-5 text-red-400" />
      default:
        return <div className="w-5 h-5 rounded-full border-2 border-zinc-600" />
    }
  }

  const completedCount = Object.values(statuses).filter(s => s === "success").length
  const errorCount = Object.values(statuses).filter(s => s === "error").length

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-4 mb-8">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-500 to-purple-500 flex items-center justify-center">
            <Database className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Gamification Setup</h1>
            <p className="text-zinc-400">Configure la base de données pour le système de gamification</p>
          </div>
        </div>

        {/* Warning */}
        <div className="p-4 rounded-xl bg-yellow-500/10 border border-yellow-500/30 mb-6">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-yellow-400 mt-0.5" />
            <div>
              <h3 className="font-medium text-yellow-400">Important</h3>
              <p className="text-sm text-zinc-400">
                Ces migrations vont créer les tables et données initiales pour le système de gamification.
                Assure-toi d'avoir les droits admin sur Supabase.
              </p>
            </div>
          </div>
        </div>

        {/* Progress */}
        {(completedCount > 0 || errorCount > 0) && (
          <div className="p-4 rounded-xl bg-zinc-800/50 border border-zinc-700/50 mb-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-zinc-400">Progression</span>
              <span className="text-sm font-medium">
                {completedCount}/{MIGRATIONS.length} complétées
                {errorCount > 0 && <span className="text-red-400 ml-2">({errorCount} erreurs)</span>}
              </span>
            </div>
            <div className="h-2 rounded-full bg-zinc-700 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${errorCount > 0 ? "bg-yellow-500" : "bg-green-500"}`}
                style={{ width: `${(completedCount / MIGRATIONS.length) * 100}%` }}
              />
            </div>
          </div>
        )}

        {/* Run All Button */}
        <button
          onClick={runAllMigrations}
          disabled={isRunning}
          className="w-full mb-6 p-4 rounded-xl bg-gradient-to-r from-cyan-500 to-purple-500 text-white font-bold flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isRunning ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Exécution en cours...
            </>
          ) : (
            <>
              <Play className="w-5 h-5" />
              Exécuter toutes les migrations
            </>
          )}
        </button>

        {/* Migrations List */}
        <div className="space-y-2">
          {MIGRATIONS.map((migration) => (
            <div
              key={migration.id}
              className={`p-4 rounded-xl border transition-colors ${
                statuses[migration.id] === "running"
                  ? "bg-blue-500/10 border-blue-500/30"
                  : statuses[migration.id] === "success"
                  ? "bg-green-500/10 border-green-500/30"
                  : statuses[migration.id] === "error"
                  ? "bg-red-500/10 border-red-500/30"
                  : "bg-zinc-800/50 border-zinc-700/50"
              }`}
            >
              <div className="flex items-center gap-4">
                {getStatusIcon(statuses[migration.id])}
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono text-zinc-500">{migration.id}</span>
                    <span className="font-medium">{migration.name}</span>
                  </div>
                  <p className="text-xs text-zinc-500">{migration.file}</p>
                </div>
                <button
                  onClick={() => runMigration(migration.id)}
                  disabled={isRunning || statuses[migration.id] === "running"}
                  className="px-3 py-1 rounded-lg bg-zinc-700 text-sm hover:bg-zinc-600 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Exécuter
                </button>
              </div>
              {errors[migration.id] && (
                <div className="mt-2 p-2 rounded bg-red-500/20 text-xs text-red-300 font-mono">
                  {errors[migration.id]}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Instructions */}
        <div className="mt-8 p-6 rounded-xl bg-zinc-800/50 border border-zinc-700/50">
          <h3 className="font-bold mb-4">Instructions alternatives</h3>
          <p className="text-sm text-zinc-400 mb-4">
            Si l'exécution automatique ne fonctionne pas, tu peux exécuter les migrations manuellement:
          </p>
          <ol className="list-decimal list-inside space-y-2 text-sm text-zinc-400">
            <li>Va sur <a href="https://supabase.com/dashboard" target="_blank" className="text-cyan-400 hover:underline">Supabase Dashboard</a></li>
            <li>Sélectionne ton projet</li>
            <li>Va dans <strong>SQL Editor</strong></li>
            <li>Copie-colle le contenu de chaque fichier .sql dans l'ordre</li>
            <li>Clique sur <strong>Run</strong> pour chaque fichier</li>
          </ol>
          <p className="text-sm text-zinc-500 mt-4">
            Les fichiers sont dans: <code className="bg-zinc-900 px-2 py-1 rounded">gamification-system/database/migrations/</code>
          </p>
        </div>
      </div>
    </div>
  )
}
