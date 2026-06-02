"use client"

import { useState } from "react"
import { CheckCircle, XCircle, Loader2, Database, Play, AlertTriangle } from "lucide-react"
import { StickerCard } from "@/components/ui/sticker-card"
import { DarkSurface } from "@/components/brand"
import { SegmentedProgress } from "@/components/ui/progress"
import { Button } from "@/components/ui/button"
import BackButton from "@/components/admin/BackButton"

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
      // NB gouvernance : ce endpoint exécute du SQL depuis l'app, ce que
      // /admin/scripts-sql interdit explicitement. Redondance signalée mais
      // non résolue ici (hors périmètre iso de la refonte #179).
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
        return <Loader2 className="w-5 h-5 text-teal animate-spin" />
      case "success":
        return <CheckCircle className="w-5 h-5 text-lime" />
      case "error":
        return <XCircle className="w-5 h-5 text-coral" />
      default:
        return <div className="w-5 h-5 rounded-full border-2 border-ink" />
    }
  }

  const completedCount = Object.values(statuses).filter(s => s === "success").length
  const errorCount = Object.values(statuses).filter(s => s === "error").length

  return (
    <div className="min-h-screen bg-background text-ink">
      <div className="container mx-auto max-w-4xl px-6 py-12 md:py-32">
        <BackButton href="/admin" label="Retour au dashboard" />

        {/* Header */}
        <header className="mb-8 space-y-2">
          <p className="eyebrow">Système · Migrations</p>
          <h1 className="font-display text-3xl font-extrabold tracking-tight text-ink flex items-center gap-3">
            <Database className="h-8 w-8 text-teal" />
            Configuration <em className="font-semibold italic text-pink">gamification</em>
          </h1>
          <p className="text-mute">Configure la base de données du système de gamification.</p>
        </header>

        {/* Warning */}
        <StickerCard variant="panel" className="mb-6 gap-2 p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 h-5 w-5 text-gold" />
            <div>
              <h3 className="font-display font-bold text-ink">Important</h3>
              <p className="text-sm text-mute">
                Ces migrations vont créer les tables et données initiales du système de gamification.
                Assure-toi d&apos;avoir les droits admin sur Supabase.
              </p>
            </div>
          </div>
        </StickerCard>

        {/* Progress */}
        {(completedCount > 0 || errorCount > 0) && (
          <StickerCard className="mb-6 gap-3 p-4">
            <div className="flex items-center justify-between">
              <span className="eyebrow tracking-[0.14em] text-mute">Progression</span>
              <span className="font-mono text-sm font-bold text-ink">
                {completedCount}/{MIGRATIONS.length} complétées
                {errorCount > 0 && <span className="ml-2 text-coral">({errorCount} erreurs)</span>}
              </span>
            </div>
            <SegmentedProgress steps={MIGRATIONS.length} current={completedCount} />
          </StickerCard>
        )}

        {/* Zone sensible — exécuter tout */}
        <DarkSurface tone="coral" shadow className="mb-6 p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-start gap-3">
              <AlertTriangle className="mt-0.5 h-6 w-6 text-coral" />
              <div>
                <h2 className="font-display text-lg font-extrabold tracking-tight text-paper">Zone sensible</h2>
                <p className="mt-1 text-sm text-paper/70">
                  Exécute l&apos;ensemble des migrations à la suite. À manipuler avec prudence.
                </p>
              </div>
            </div>
            <span className="rounded-full border-2 border-paper/40 px-3 py-1 font-mono text-[10px] font-bold uppercase tracking-[0.12em] text-paper">
              Critique
            </span>
          </div>
          <Button
            variant="default"
            onClick={runAllMigrations}
            disabled={isRunning}
            className="mt-5 w-full"
          >
            {isRunning ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Exécution en cours…
              </>
            ) : (
              <>
                <Play className="mr-2 h-5 w-5" />
                Exécuter toutes les migrations
              </>
            )}
          </Button>
        </DarkSurface>

        {/* Migrations List */}
        <div className="space-y-2">
          {MIGRATIONS.map((migration) => {
            const status = statuses[migration.id]
            const accent =
              status === "running"
                ? "border-teal"
                : status === "success"
                ? "border-lime"
                : status === "error"
                ? "border-coral shadow-stkr-pink"
                : "border-ink"
            return (
              <StickerCard
                key={migration.id}
                variant="panel"
                className={`gap-2 p-4 ${accent}`}
              >
                <div className="flex items-center gap-4">
                  {getStatusIcon(status)}
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs text-mute">{migration.id}</span>
                      <span className="font-medium text-ink">{migration.name}</span>
                    </div>
                    <p className="font-mono text-xs text-mute">{migration.file}</p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => runMigration(migration.id)}
                    disabled={isRunning || status === "running"}
                  >
                    Exécuter
                  </Button>
                </div>
                {errors[migration.id] && (
                  <div className="mt-1 rounded-md border-2 border-coral/40 bg-coral/10 p-2 font-mono text-xs text-coral">
                    {errors[migration.id]}
                  </div>
                )}
              </StickerCard>
            )
          })}
        </div>

        {/* Instructions */}
        <StickerCard className="mt-8 gap-4 p-6">
          <h3 className="font-display text-lg font-bold tracking-tight text-ink">Instructions alternatives</h3>
          <p className="text-sm text-mute">
            Si l&apos;exécution automatique ne fonctionne pas, tu peux exécuter les migrations manuellement :
          </p>
          <ol className="list-inside list-decimal space-y-2 text-sm text-mute">
            <li>Va sur <a href="https://supabase.com/dashboard" target="_blank" className="text-teal hover:underline">Supabase Dashboard</a></li>
            <li>Sélectionne ton projet</li>
            <li>Va dans <strong>SQL Editor</strong></li>
            <li>Copie-colle le contenu de chaque fichier .sql dans l&apos;ordre</li>
            <li>Clique sur <strong>Run</strong> pour chaque fichier</li>
          </ol>
          <p className="text-sm text-mute">
            Les fichiers sont dans :{" "}
            <code className="font-mono text-ink-2">gamification-system/database/migrations/</code>
          </p>
        </StickerCard>
      </div>
    </div>
  )
}
