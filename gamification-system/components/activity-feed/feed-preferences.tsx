/**
 * TEENS PARTY MOROCCO - Feed Preferences Components
 * ==================================================
 *
 * Composants pour les préférences et paramètres du fil d'activité.
 */

"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import {
  Settings,
  Bell,
  Eye,
  EyeOff,
  Users,
  Trophy,
  TrendingUp,
  Calendar,
  Gamepad2,
  Layers,
  MessageCircle,
  Heart,
  AtSign,
  Globe,
  Lock,
  UserCircle,
  Clock,
  SortAsc,
  Save,
  RotateCcw,
} from "lucide-react"
import {
  type FeedPreferences,
  type VisibilitySettings,
  type ActivityVisibility,
  type FeedOrder,
} from "../../features/activity-feed"

/* ==========================================================================
   FEED PREFERENCES PANEL
   ========================================================================== */

interface FeedPreferencesPanelProps {
  preferences: FeedPreferences
  onUpdate: (updates: Partial<FeedPreferences>) => void
  onReset?: () => void
}

export function FeedPreferencesPanel({
  preferences,
  onUpdate,
  onReset,
}: FeedPreferencesPanelProps) {
  const [hasChanges, setHasChanges] = useState(false)

  const handleUpdate = (updates: Partial<FeedPreferences>) => {
    onUpdate(updates)
    setHasChanges(true)
  }

  const contentFilters = [
    {
      key: "show_friends_activities" as const,
      label: "Activités des amis",
      icon: Users,
    },
    {
      key: "show_crew_activities" as const,
      label: "Activités des crews",
      icon: Users,
    },
    {
      key: "show_following_activities" as const,
      label: "Activités des suivis",
      icon: UserCircle,
    },
  ]

  const categoryFilters = [
    { key: "show_achievements" as const, label: "Succès", icon: Trophy },
    { key: "show_level_ups" as const, label: "Montées de niveau", icon: TrendingUp },
    { key: "show_events" as const, label: "Événements", icon: Calendar },
    { key: "show_games" as const, label: "Jeux", icon: Gamepad2 },
    { key: "show_collections" as const, label: "Collections", icon: Layers },
    { key: "show_social" as const, label: "Social", icon: Users },
  ]

  const notificationSettings = [
    { key: "notify_likes" as const, label: "J'aime sur mes activités", icon: Heart },
    {
      key: "notify_comments" as const,
      label: "Commentaires sur mes activités",
      icon: MessageCircle,
    },
    { key: "notify_mentions" as const, label: "Mentions", icon: AtSign },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-cyan-500/20 flex items-center justify-center">
            <Settings className="w-5 h-5 text-cyan-400" />
          </div>
          <div>
            <h3 className="font-bold text-white">Préférences du fil</h3>
            <p className="text-sm text-zinc-400">
              Personnalisez votre expérience
            </p>
          </div>
        </div>

        {onReset && (
          <button
            onClick={onReset}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
            Réinitialiser
          </button>
        )}
      </div>

      {/* Feed Order */}
      <div className="p-4 rounded-xl bg-zinc-800/50 border border-zinc-700/50">
        <div className="flex items-center gap-2 mb-4">
          <SortAsc className="w-4 h-4 text-cyan-400" />
          <h4 className="font-medium text-white">Ordre du fil</h4>
        </div>

        <div className="grid grid-cols-3 gap-2">
          {(["recent", "popular", "relevance"] as FeedOrder[]).map((order) => {
            const labels = {
              recent: "Récent",
              popular: "Populaire",
              relevance: "Pertinent",
            }
            const icons = {
              recent: Clock,
              popular: TrendingUp,
              relevance: Trophy,
            }
            const Icon = icons[order]
            const isSelected = preferences.feed_order === order

            return (
              <button
                key={order}
                onClick={() => handleUpdate({ feed_order: order })}
                className={`flex items-center justify-center gap-2 p-3 rounded-xl transition-colors ${
                  isSelected
                    ? "bg-cyan-500/20 border border-cyan-500/50 text-cyan-400"
                    : "bg-zinc-800 border border-zinc-700 text-zinc-400 hover:text-white"
                }`}
              >
                <Icon className="w-4 h-4" />
                <span className="text-sm font-medium">{labels[order]}</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Content Filters */}
      <div className="p-4 rounded-xl bg-zinc-800/50 border border-zinc-700/50">
        <div className="flex items-center gap-2 mb-4">
          <Eye className="w-4 h-4 text-cyan-400" />
          <h4 className="font-medium text-white">Sources d'activité</h4>
        </div>

        <div className="space-y-3">
          {contentFilters.map((filter) => {
            const Icon = filter.icon
            const value = preferences[filter.key]

            return (
              <label
                key={filter.key}
                className="flex items-center justify-between cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <Icon className="w-4 h-4 text-zinc-400" />
                  <span className="text-sm text-zinc-300">{filter.label}</span>
                </div>
                <ToggleSwitch
                  checked={value}
                  onChange={(checked) =>
                    handleUpdate({ [filter.key]: checked })
                  }
                />
              </label>
            )
          })}
        </div>
      </div>

      {/* Category Filters */}
      <div className="p-4 rounded-xl bg-zinc-800/50 border border-zinc-700/50">
        <div className="flex items-center gap-2 mb-4">
          <Layers className="w-4 h-4 text-cyan-400" />
          <h4 className="font-medium text-white">Types d'activité</h4>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {categoryFilters.map((filter) => {
            const Icon = filter.icon
            const value = preferences[filter.key]

            return (
              <label
                key={filter.key}
                className="flex items-center gap-3 cursor-pointer"
              >
                <ToggleSwitch
                  checked={value}
                  onChange={(checked) =>
                    handleUpdate({ [filter.key]: checked })
                  }
                  size="sm"
                />
                <div className="flex items-center gap-2">
                  <Icon className="w-4 h-4 text-zinc-400" />
                  <span className="text-sm text-zinc-300">{filter.label}</span>
                </div>
              </label>
            )
          })}
        </div>
      </div>

      {/* Notifications */}
      <div className="p-4 rounded-xl bg-zinc-800/50 border border-zinc-700/50">
        <div className="flex items-center gap-2 mb-4">
          <Bell className="w-4 h-4 text-cyan-400" />
          <h4 className="font-medium text-white">Notifications</h4>
        </div>

        <div className="space-y-3">
          {notificationSettings.map((setting) => {
            const Icon = setting.icon
            const value = preferences[setting.key]

            return (
              <label
                key={setting.key}
                className="flex items-center justify-between cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <Icon className="w-4 h-4 text-zinc-400" />
                  <span className="text-sm text-zinc-300">{setting.label}</span>
                </div>
                <ToggleSwitch
                  checked={value}
                  onChange={(checked) =>
                    handleUpdate({ [setting.key]: checked })
                  }
                />
              </label>
            )
          })}
        </div>
      </div>
    </div>
  )
}

/* ==========================================================================
   VISIBILITY SETTINGS PANEL
   ========================================================================== */

interface VisibilitySettingsPanelProps {
  settings: VisibilitySettings
  onUpdate: (updates: Partial<VisibilitySettings>) => void
}

export function VisibilitySettingsPanel({
  settings,
  onUpdate,
}: VisibilitySettingsPanelProps) {
  const autoPublishSettings = [
    { key: "auto_publish_badges" as const, label: "Badges gagnés" },
    { key: "auto_publish_level_ups" as const, label: "Montées de niveau" },
    {
      key: "auto_publish_event_attendance" as const,
      label: "Participation aux événements",
    },
    { key: "auto_publish_challenges" as const, label: "Défis complétés" },
    { key: "auto_publish_collections" as const, label: "Collections complétées" },
    { key: "auto_publish_crew_joins" as const, label: "Rejoindre un crew" },
  ]

  const interactionSettings = [
    { key: "allow_comments" as const, label: "Autoriser les commentaires" },
    { key: "allow_likes" as const, label: "Autoriser les j'aime" },
    { key: "allow_shares" as const, label: "Autoriser les partages" },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-purple-500/20 flex items-center justify-center">
          <Eye className="w-5 h-5 text-purple-400" />
        </div>
        <div>
          <h3 className="font-bold text-white">Paramètres de visibilité</h3>
          <p className="text-sm text-zinc-400">
            Contrôlez ce que les autres voient
          </p>
        </div>
      </div>

      {/* Default Visibility */}
      <div className="p-4 rounded-xl bg-zinc-800/50 border border-zinc-700/50">
        <h4 className="font-medium text-white mb-4">Visibilité par défaut</h4>

        <div className="grid grid-cols-3 gap-2">
          {(["public", "friends", "private"] as ActivityVisibility[]).map(
            (visibility) => {
              const configs = {
                public: {
                  label: "Public",
                  icon: Globe,
                  description: "Tout le monde",
                },
                friends: {
                  label: "Amis",
                  icon: Users,
                  description: "Vos amis uniquement",
                },
                private: {
                  label: "Privé",
                  icon: Lock,
                  description: "Vous uniquement",
                },
              }
              const config = configs[visibility]
              const Icon = config.icon
              const isSelected = settings.default_visibility === visibility

              return (
                <button
                  key={visibility}
                  onClick={() =>
                    onUpdate({ default_visibility: visibility })
                  }
                  className={`p-3 rounded-xl transition-colors text-center ${
                    isSelected
                      ? "bg-purple-500/20 border border-purple-500/50"
                      : "bg-zinc-800 border border-zinc-700 hover:border-zinc-600"
                  }`}
                >
                  <Icon
                    className={`w-5 h-5 mx-auto mb-2 ${
                      isSelected ? "text-purple-400" : "text-zinc-400"
                    }`}
                  />
                  <p
                    className={`text-sm font-medium ${
                      isSelected ? "text-purple-400" : "text-zinc-300"
                    }`}
                  >
                    {config.label}
                  </p>
                  <p className="text-xs text-zinc-500">{config.description}</p>
                </button>
              )
            }
          )}
        </div>
      </div>

      {/* Auto-publish Settings */}
      <div className="p-4 rounded-xl bg-zinc-800/50 border border-zinc-700/50">
        <h4 className="font-medium text-white mb-4">Publication automatique</h4>
        <p className="text-sm text-zinc-400 mb-4">
          Choisissez ce qui est publié automatiquement dans votre fil
        </p>

        <div className="space-y-3">
          {autoPublishSettings.map((setting) => {
            const value = settings[setting.key]

            return (
              <label
                key={setting.key}
                className="flex items-center justify-between cursor-pointer"
              >
                <span className="text-sm text-zinc-300">{setting.label}</span>
                <ToggleSwitch
                  checked={value}
                  onChange={(checked) => onUpdate({ [setting.key]: checked })}
                />
              </label>
            )
          })}
        </div>
      </div>

      {/* Interaction Settings */}
      <div className="p-4 rounded-xl bg-zinc-800/50 border border-zinc-700/50">
        <h4 className="font-medium text-white mb-4">Interactions</h4>
        <p className="text-sm text-zinc-400 mb-4">
          Gérez comment les autres peuvent interagir avec vos activités
        </p>

        <div className="space-y-3">
          {interactionSettings.map((setting) => {
            const value = settings[setting.key]

            return (
              <label
                key={setting.key}
                className="flex items-center justify-between cursor-pointer"
              >
                <span className="text-sm text-zinc-300">{setting.label}</span>
                <ToggleSwitch
                  checked={value}
                  onChange={(checked) => onUpdate({ [setting.key]: checked })}
                />
              </label>
            )
          })}
        </div>
      </div>
    </div>
  )
}

/* ==========================================================================
   QUICK FEED SETTINGS
   ========================================================================== */

interface QuickFeedSettingsProps {
  feedOrder: FeedOrder
  onOrderChange: (order: FeedOrder) => void
}

export function QuickFeedSettings({
  feedOrder,
  onOrderChange,
}: QuickFeedSettingsProps) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-zinc-500">Trier:</span>
      <div className="flex bg-zinc-800 rounded-lg p-1">
        {(["recent", "popular", "relevance"] as FeedOrder[]).map((order) => {
          const labels = { recent: "Récent", popular: "Top", relevance: "Pour toi" }
          const isSelected = feedOrder === order

          return (
            <button
              key={order}
              onClick={() => onOrderChange(order)}
              className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                isSelected
                  ? "bg-cyan-500 text-white"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              {labels[order]}
            </button>
          )
        })}
      </div>
    </div>
  )
}

/* ==========================================================================
   TOGGLE SWITCH
   ========================================================================== */

interface ToggleSwitchProps {
  checked: boolean
  onChange: (checked: boolean) => void
  size?: "sm" | "md"
}

function ToggleSwitch({ checked, onChange, size = "md" }: ToggleSwitchProps) {
  const sizes = {
    sm: {
      track: "w-8 h-4",
      thumb: "w-3 h-3",
      translate: "translate-x-4",
    },
    md: {
      track: "w-10 h-5",
      thumb: "w-4 h-4",
      translate: "translate-x-5",
    },
  }

  const s = sizes[size]

  return (
    <button
      onClick={() => onChange(!checked)}
      className={`relative ${s.track} rounded-full transition-colors ${
        checked ? "bg-cyan-500" : "bg-zinc-700"
      }`}
    >
      <motion.div
        animate={{ x: checked ? (size === "sm" ? 16 : 20) : 2 }}
        transition={{ type: "spring", stiffness: 500, damping: 30 }}
        className={`absolute top-0.5 left-0 ${s.thumb} rounded-full bg-white shadow-sm`}
      />
    </button>
  )
}
