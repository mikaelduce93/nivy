/**
 * TEENS PARTY MOROCCO - Notification Preferences Components
 * ==========================================================
 *
 * Composants pour la gestion des préférences de notifications.
 */

"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import {
  Bell,
  BellOff,
  Smartphone,
  Mail,
  Volume2,
  VolumeX,
  Moon,
  Clock,
  Trophy,
  Users,
  Calendar,
  Target,
  Gift,
  Settings,
  Save,
  RefreshCw,
} from "lucide-react"
import {
  type NotificationPreferences,
  type NotificationCategory,
  CATEGORY_CONFIG,
} from "../../features/notifications"

/* ==========================================================================
   NOTIFICATION PREFERENCES PANEL
   ========================================================================== */

interface NotificationPreferencesPanelProps {
  preferences: NotificationPreferences
  onSave: (updates: Partial<NotificationPreferences>) => Promise<void>
  isLoading?: boolean
}

export function NotificationPreferencesPanel({
  preferences,
  onSave,
  isLoading = false,
}: NotificationPreferencesPanelProps) {
  const [localPrefs, setLocalPrefs] = useState(preferences)
  const [hasChanges, setHasChanges] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  const updatePref = <K extends keyof NotificationPreferences>(
    key: K,
    value: NotificationPreferences[K]
  ) => {
    setLocalPrefs((prev) => ({ ...prev, [key]: value }))
    setHasChanges(true)
  }

  const handleSave = async () => {
    setIsSaving(true)
    try {
      await onSave(localPrefs)
      setHasChanges(false)
    } finally {
      setIsSaving(false)
    }
  }

  const resetToDefaults = () => {
    setLocalPrefs({
      ...localPrefs,
      push_enabled: true,
      email_enabled: true,
      in_app_enabled: true,
      achievements_enabled: true,
      social_enabled: true,
      events_enabled: true,
      challenges_enabled: true,
      rewards_enabled: true,
      system_enabled: true,
      quiet_hours_enabled: false,
      sounds_enabled: true,
      vibration_enabled: true,
    })
    setHasChanges(true)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-cyan-500/20 flex items-center justify-center">
            <Settings className="w-5 h-5 text-cyan-400" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">
              Préférences de notifications
            </h2>
            <p className="text-sm text-zinc-400">
              Personnalise tes alertes et notifications
            </p>
          </div>
        </div>

        <button
          onClick={resetToDefaults}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          Réinitialiser
        </button>
      </div>

      {/* Channels */}
      <PreferenceSection title="Canaux de notification" icon={<Bell className="w-5 h-5" />}>
        <PreferenceToggle
          label="Notifications push"
          description="Reçois des notifications sur ton appareil"
          icon={<Smartphone className="w-4 h-4" />}
          checked={localPrefs.push_enabled}
          onChange={(v) => updatePref("push_enabled", v)}
        />
        <PreferenceToggle
          label="Notifications email"
          description="Reçois des résumés par email"
          icon={<Mail className="w-4 h-4" />}
          checked={localPrefs.email_enabled}
          onChange={(v) => updatePref("email_enabled", v)}
        />
        <PreferenceToggle
          label="Notifications in-app"
          description="Affiche les notifications dans l'application"
          icon={<Bell className="w-4 h-4" />}
          checked={localPrefs.in_app_enabled}
          onChange={(v) => updatePref("in_app_enabled", v)}
        />
      </PreferenceSection>

      {/* Categories */}
      <PreferenceSection title="Catégories" icon={<Target className="w-5 h-5" />}>
        <CategoryPreference
          category="achievement"
          enabled={localPrefs.achievements_enabled}
          onChange={(v) => updatePref("achievements_enabled", v)}
        />
        <CategoryPreference
          category="social"
          enabled={localPrefs.social_enabled}
          onChange={(v) => updatePref("social_enabled", v)}
        />
        <CategoryPreference
          category="event"
          enabled={localPrefs.events_enabled}
          onChange={(v) => updatePref("events_enabled", v)}
        />
        <CategoryPreference
          category="challenge"
          enabled={localPrefs.challenges_enabled}
          onChange={(v) => updatePref("challenges_enabled", v)}
        />
        <CategoryPreference
          category="reward"
          enabled={localPrefs.rewards_enabled}
          onChange={(v) => updatePref("rewards_enabled", v)}
        />
        <CategoryPreference
          category="system"
          enabled={localPrefs.system_enabled}
          onChange={(v) => updatePref("system_enabled", v)}
        />
      </PreferenceSection>

      {/* Quiet Hours */}
      <PreferenceSection title="Ne pas déranger" icon={<Moon className="w-5 h-5" />}>
        <PreferenceToggle
          label="Heures calmes"
          description="Désactive les notifications pendant certaines heures"
          icon={<BellOff className="w-4 h-4" />}
          checked={localPrefs.quiet_hours_enabled}
          onChange={(v) => updatePref("quiet_hours_enabled", v)}
        />

        {localPrefs.quiet_hours_enabled && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            className="flex items-center gap-4 mt-4 pl-8"
          >
            <div className="flex items-center gap-2">
              <label className="text-sm text-zinc-400">De</label>
              <input
                type="time"
                value={localPrefs.quiet_hours_start || "22:00"}
                onChange={(e) => updatePref("quiet_hours_start", e.target.value)}
                className="px-3 py-1.5 rounded-lg bg-zinc-800 border border-zinc-700 text-white text-sm"
              />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-sm text-zinc-400">à</label>
              <input
                type="time"
                value={localPrefs.quiet_hours_end || "08:00"}
                onChange={(e) => updatePref("quiet_hours_end", e.target.value)}
                className="px-3 py-1.5 rounded-lg bg-zinc-800 border border-zinc-700 text-white text-sm"
              />
            </div>
          </motion.div>
        )}
      </PreferenceSection>

      {/* Digest */}
      <PreferenceSection title="Résumé quotidien" icon={<Clock className="w-5 h-5" />}>
        <PreferenceToggle
          label="Recevoir un résumé"
          description="Reçois un email récapitulatif une fois par jour"
          icon={<Mail className="w-4 h-4" />}
          checked={localPrefs.digest_enabled}
          onChange={(v) => updatePref("digest_enabled", v)}
        />

        {localPrefs.digest_enabled && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            className="flex items-center gap-2 mt-4 pl-8"
          >
            <label className="text-sm text-zinc-400">Heure d'envoi</label>
            <input
              type="time"
              value={localPrefs.digest_time || "18:00"}
              onChange={(e) => updatePref("digest_time", e.target.value)}
              className="px-3 py-1.5 rounded-lg bg-zinc-800 border border-zinc-700 text-white text-sm"
            />
          </motion.div>
        )}
      </PreferenceSection>

      {/* Sound & Vibration */}
      <PreferenceSection title="Sons et vibrations" icon={<Volume2 className="w-5 h-5" />}>
        <PreferenceToggle
          label="Sons"
          description="Jouer un son lors des notifications"
          icon={<Volume2 className="w-4 h-4" />}
          checked={localPrefs.sounds_enabled}
          onChange={(v) => updatePref("sounds_enabled", v)}
        />
        <PreferenceToggle
          label="Vibrations"
          description="Activer les vibrations sur mobile"
          icon={<Smartphone className="w-4 h-4" />}
          checked={localPrefs.vibration_enabled}
          onChange={(v) => updatePref("vibration_enabled", v)}
        />
      </PreferenceSection>

      {/* Push limit */}
      <PreferenceSection title="Limites" icon={<Bell className="w-5 h-5" />}>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-white">
              Maximum de push par jour
            </p>
            <p className="text-xs text-zinc-400">
              Limite le nombre de notifications push quotidiennes
            </p>
          </div>
          <select
            value={localPrefs.max_daily_push}
            onChange={(e) => updatePref("max_daily_push", parseInt(e.target.value))}
            className="px-3 py-1.5 rounded-lg bg-zinc-800 border border-zinc-700 text-white text-sm"
          >
            <option value={5}>5</option>
            <option value={10}>10</option>
            <option value={20}>20</option>
            <option value={50}>50</option>
            <option value={100}>Illimité</option>
          </select>
        </div>
      </PreferenceSection>

      {/* Save button */}
      {hasChanges && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="sticky bottom-4 flex justify-end"
        >
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="flex items-center gap-2 px-6 py-3 rounded-xl bg-cyan-500 text-white font-bold hover:bg-cyan-600 disabled:opacity-50 transition-all shadow-lg shadow-cyan-500/30"
          >
            {isSaving ? (
              <>
                <RefreshCw className="w-5 h-5 animate-spin" />
                Enregistrement...
              </>
            ) : (
              <>
                <Save className="w-5 h-5" />
                Enregistrer les modifications
              </>
            )}
          </button>
        </motion.div>
      )}
    </div>
  )
}

/* ==========================================================================
   PREFERENCE SECTION
   ========================================================================== */

interface PreferenceSectionProps {
  title: string
  icon: React.ReactNode
  children: React.ReactNode
}

function PreferenceSection({ title, icon, children }: PreferenceSectionProps) {
  return (
    <div className="p-4 rounded-2xl bg-zinc-800/50 border border-zinc-700/50">
      <div className="flex items-center gap-2 mb-4 text-zinc-400">
        {icon}
        <h3 className="font-medium">{title}</h3>
      </div>
      <div className="space-y-4">{children}</div>
    </div>
  )
}

/* ==========================================================================
   PREFERENCE TOGGLE
   ========================================================================== */

interface PreferenceToggleProps {
  label: string
  description: string
  icon: React.ReactNode
  checked: boolean
  onChange: (checked: boolean) => void
}

function PreferenceToggle({
  label,
  description,
  icon,
  checked,
  onChange,
}: PreferenceToggleProps) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-zinc-700/50 flex items-center justify-center text-zinc-400">
          {icon}
        </div>
        <div>
          <p className="text-sm font-medium text-white">{label}</p>
          <p className="text-xs text-zinc-400">{description}</p>
        </div>
      </div>

      <ToggleSwitch checked={checked} onChange={onChange} />
    </div>
  )
}

/* ==========================================================================
   CATEGORY PREFERENCE
   ========================================================================== */

interface CategoryPreferenceProps {
  category: NotificationCategory
  enabled: boolean
  onChange: (enabled: boolean) => void
}

function CategoryPreference({
  category,
  enabled,
  onChange,
}: CategoryPreferenceProps) {
  const config = CATEGORY_CONFIG[category]

  // Icon mapping
  const iconMap: Record<NotificationCategory, React.ElementType> = {
    achievement: Trophy,
    social: Users,
    event: Calendar,
    challenge: Target,
    reward: Gift,
    system: Settings,
  }

  const IconComponent = iconMap[category]

  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className={`w-8 h-8 rounded-lg ${config.bgColor} flex items-center justify-center`}>
          <IconComponent className={`w-4 h-4 ${config.color}`} />
        </div>
        <div>
          <p className="text-sm font-medium text-white">{config.name}</p>
          <p className="text-xs text-zinc-400">
            {category === "achievement" && "Level up, badges, records"}
            {category === "social" && "Amis, crews, messages"}
            {category === "event" && "Rappels, nouveaux événements"}
            {category === "challenge" && "Défis, duels, missions"}
            {category === "reward" && "Récompenses, boutique"}
            {category === "system" && "Mises à jour, maintenance"}
          </p>
        </div>
      </div>

      <ToggleSwitch checked={enabled} onChange={onChange} />
    </div>
  )
}

/* ==========================================================================
   TOGGLE SWITCH
   ========================================================================== */

interface ToggleSwitchProps {
  checked: boolean
  onChange: (checked: boolean) => void
}

function ToggleSwitch({ checked, onChange }: ToggleSwitchProps) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className={`relative w-11 h-6 rounded-full transition-colors ${
        checked ? "bg-cyan-500" : "bg-zinc-600"
      }`}
    >
      <motion.div
        animate={{ x: checked ? 20 : 2 }}
        transition={{ type: "spring", stiffness: 500, damping: 30 }}
        className="absolute top-1 w-4 h-4 rounded-full bg-white shadow-sm"
      />
    </button>
  )
}

/* ==========================================================================
   QUICK PREFERENCES CARD
   ========================================================================== */

interface QuickPreferencesCardProps {
  pushEnabled: boolean
  soundsEnabled: boolean
  onTogglePush: () => void
  onToggleSounds: () => void
  onOpenFull: () => void
}

export function QuickPreferencesCard({
  pushEnabled,
  soundsEnabled,
  onTogglePush,
  onToggleSounds,
  onOpenFull,
}: QuickPreferencesCardProps) {
  return (
    <div className="p-4 rounded-2xl bg-zinc-800/50 border border-zinc-700/50">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-medium text-white">Notifications rapides</h3>
        <button
          onClick={onOpenFull}
          className="text-sm text-cyan-400 hover:text-cyan-300"
        >
          Tous les paramètres
        </button>
      </div>

      <div className="flex items-center gap-4">
        <button
          onClick={onTogglePush}
          className={`flex-1 p-3 rounded-xl flex flex-col items-center gap-2 transition-colors ${
            pushEnabled
              ? "bg-cyan-500/20 border border-cyan-500/30"
              : "bg-zinc-700/50 border border-zinc-600/30"
          }`}
        >
          {pushEnabled ? (
            <Bell className="w-5 h-5 text-cyan-400" />
          ) : (
            <BellOff className="w-5 h-5 text-zinc-400" />
          )}
          <span
            className={`text-xs font-medium ${
              pushEnabled ? "text-cyan-400" : "text-zinc-400"
            }`}
          >
            Push {pushEnabled ? "On" : "Off"}
          </span>
        </button>

        <button
          onClick={onToggleSounds}
          className={`flex-1 p-3 rounded-xl flex flex-col items-center gap-2 transition-colors ${
            soundsEnabled
              ? "bg-cyan-500/20 border border-cyan-500/30"
              : "bg-zinc-700/50 border border-zinc-600/30"
          }`}
        >
          {soundsEnabled ? (
            <Volume2 className="w-5 h-5 text-cyan-400" />
          ) : (
            <VolumeX className="w-5 h-5 text-zinc-400" />
          )}
          <span
            className={`text-xs font-medium ${
              soundsEnabled ? "text-cyan-400" : "text-zinc-400"
            }`}
          >
            Sons {soundsEnabled ? "On" : "Off"}
          </span>
        </button>
      </div>
    </div>
  )
}
