/**
 * TEENS PARTY MOROCCO - Customization Panel Components
 * =====================================================
 *
 * Panneau complet de personnalisation de profil.
 */

"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  Palette,
  Image,
  Crown,
  Award,
  Settings,
  Check,
  Lock,
  ChevronRight,
  Sparkles,
  Edit2,
  X,
} from "lucide-react"
import {
  type ProfileFrame,
  type ProfileTitle,
  type ProfileColor,
  type ProfileBackground,
  type UserCustomizationItems,
  type ItemType,
  type Rarity,
  RARITY_CONFIG,
  getTitleStyle,
  getBackgroundStyle,
} from "../../features/profile-customization"
import { ProfileAvatarWithFrame, FrameSelector } from "./profile-frame"

/* ==========================================================================
   CUSTOMIZATION PANEL
   ========================================================================== */

interface CustomizationPanelProps {
  items: UserCustomizationItems
  allFrames: ProfileFrame[]
  allTitles: ProfileTitle[]
  allColors: ProfileColor[]
  allBackgrounds: ProfileBackground[]
  onEquipItem: (type: ItemType, id: string) => Promise<void>
  onUnequipItem: (type: ItemType) => Promise<void>
  onPurchaseItem?: (type: ItemType, id: string, price: number) => Promise<void>
}

export function CustomizationPanel({
  items,
  allFrames,
  allTitles,
  allColors,
  allBackgrounds,
  onEquipItem,
  onUnequipItem,
  onPurchaseItem,
}: CustomizationPanelProps) {
  const [activeTab, setActiveTab] = useState<"frames" | "titles" | "colors" | "backgrounds">("frames")
  const [isLoading, setIsLoading] = useState(false)

  const tabs = [
    { key: "frames" as const, label: "Cadres", icon: Award, count: items.frames.length },
    { key: "titles" as const, label: "Titres", icon: Crown, count: items.titles.length },
    { key: "colors" as const, label: "Couleurs", icon: Palette, count: items.colors.length },
    { key: "backgrounds" as const, label: "Fonds", icon: Image, count: items.backgrounds.length },
  ]

  const handleEquip = async (type: ItemType, id: string) => {
    setIsLoading(true)
    await onEquipItem(type, id)
    setIsLoading(false)
  }

  // Créer les listes avec unlock status
  const framesWithUnlock = allFrames.map((f) => ({
    ...f,
    unlocked: items.frames.some((uf) => uf.id === f.id),
    unlocked_at: items.frames.find((uf) => uf.id === f.id)?.unlocked_at,
  }))

  const titlesWithUnlock = allTitles.map((t) => ({
    ...t,
    unlocked: items.titles.some((ut) => ut.id === t.id),
    unlocked_at: items.titles.find((ut) => ut.id === t.id)?.unlocked_at,
  }))

  const colorsWithUnlock = allColors.map((c) => ({
    ...c,
    unlocked: items.colors.some((uc) => uc.id === c.id),
    unlocked_at: items.colors.find((uc) => uc.id === c.id)?.unlocked_at,
  }))

  const backgroundsWithUnlock = allBackgrounds.map((b) => ({
    ...b,
    unlocked: items.backgrounds.some((ub) => ub.id === b.id),
    unlocked_at: items.backgrounds.find((ub) => ub.id === b.id)?.unlocked_at,
  }))

  return (
    <div className="space-y-6">
      {/* Preview section */}
      <div className="p-4 rounded-2xl bg-zinc-900 border border-zinc-800">
        <h3 className="text-sm font-medium text-zinc-400 mb-4">Aperçu</h3>
        <div className="flex items-center gap-4">
          <ProfileAvatarWithFrame
            frame={items.equipped?.frame}
            size="lg"
            showLevel
            level={25}
          />
          <div>
            {items.equipped?.title && (
              <div
                className="text-lg font-bold mb-1"
                style={getTitleStyle(items.equipped.title)}
              >
                {items.equipped.title.emoji} {items.equipped.title.display_text}
              </div>
            )}
            <p className="text-sm text-zinc-400">
              {items.equipped?.custom_status || "Aucun statut"}
            </p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl font-medium transition-colors whitespace-nowrap ${
              activeTab === tab.key
                ? "bg-cyan-500 text-white"
                : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
            <span className="text-xs opacity-70">({tab.count})</span>
          </button>
        ))}
      </div>

      {/* Content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
        >
          {activeTab === "frames" && (
            <FrameSelector
              frames={framesWithUnlock}
              selectedId={null}
              equippedId={items.equipped?.frame?.id}
              onSelect={(id) => handleEquip("frame", id)}
            />
          )}

          {activeTab === "titles" && (
            <TitleSelector
              titles={titlesWithUnlock}
              equippedId={items.equipped?.title?.id}
              onSelect={(id) => handleEquip("title", id)}
            />
          )}

          {activeTab === "colors" && (
            <ColorSelector
              colors={colorsWithUnlock}
              equippedId={items.equipped?.color?.id}
              onSelect={(id) => handleEquip("color", id)}
            />
          )}

          {activeTab === "backgrounds" && (
            <BackgroundSelector
              backgrounds={backgroundsWithUnlock}
              equippedId={items.equipped?.background?.id}
              onSelect={(id) => handleEquip("background", id)}
            />
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  )
}

/* ==========================================================================
   TITLE SELECTOR
   ========================================================================== */

interface TitleSelectorProps {
  titles: Array<ProfileTitle & { unlocked: boolean; unlocked_at?: string }>
  equippedId?: string | null
  onSelect: (id: string) => void
}

function TitleSelector({ titles, equippedId, onSelect }: TitleSelectorProps) {
  const groupedTitles = titles.reduce(
    (acc, title) => {
      const category = title.category || "special"
      if (!acc[category]) {
        acc[category] = []
      }
      acc[category].push(title)
      return acc
    },
    {} as Record<string, typeof titles>
  )

  const categoryLabels: Record<string, string> = {
    achievement: "Succès",
    event: "Événements",
    social: "Social",
    game: "Jeux",
    special: "Spéciaux",
  }

  return (
    <div className="space-y-6">
      {Object.entries(groupedTitles).map(([category, categoryTitles]) => (
        <div key={category}>
          <h4 className="text-sm font-medium text-zinc-400 mb-3">
            {categoryLabels[category] || category}
          </h4>
          <div className="space-y-2">
            {categoryTitles.map((title) => (
              <TitleCard
                key={title.id}
                title={title}
                isEquipped={equippedId === title.id}
                onSelect={() => title.unlocked && onSelect(title.id)}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

interface TitleCardProps {
  title: ProfileTitle & { unlocked: boolean }
  isEquipped: boolean
  onSelect: () => void
}

function TitleCard({ title, isEquipped, onSelect }: TitleCardProps) {
  const rarityConfig = RARITY_CONFIG[title.rarity]

  return (
    <button
      onClick={onSelect}
      disabled={!title.unlocked}
      className={`w-full p-3 rounded-xl border text-left transition-all ${
        isEquipped
          ? `${rarityConfig.borderColor} ${rarityConfig.bgColor}`
          : title.unlocked
          ? "border-zinc-700 bg-zinc-800/50 hover:border-zinc-600"
          : "border-zinc-800 bg-zinc-900/50 opacity-50"
      }`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-2xl">{title.emoji}</span>
          <div>
            <p
              className="font-bold"
              style={title.unlocked ? getTitleStyle(title) : { color: "#71717a" }}
            >
              {title.display_text}
            </p>
            <p className="text-xs text-zinc-500">{title.description}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className={`text-xs ${rarityConfig.color}`}>
            {rarityConfig.name}
          </span>
          {!title.unlocked && <Lock className="w-4 h-4 text-zinc-600" />}
          {isEquipped && <Check className="w-4 h-4 text-green-400" />}
        </div>
      </div>
    </button>
  )
}

/* ==========================================================================
   COLOR SELECTOR
   ========================================================================== */

interface ColorSelectorProps {
  colors: Array<ProfileColor & { unlocked: boolean; unlocked_at?: string }>
  equippedId?: string | null
  onSelect: (id: string) => void
}

function ColorSelector({ colors, equippedId, onSelect }: ColorSelectorProps) {
  return (
    <div className="grid grid-cols-2 gap-3">
      {colors.map((color) => (
        <ColorCard
          key={color.id}
          color={color}
          isEquipped={equippedId === color.id}
          onSelect={() => color.unlocked && onSelect(color.id)}
        />
      ))}
    </div>
  )
}

interface ColorCardProps {
  color: ProfileColor & { unlocked: boolean }
  isEquipped: boolean
  onSelect: () => void
}

function ColorCard({ color, isEquipped, onSelect }: ColorCardProps) {
  const rarityConfig = RARITY_CONFIG[color.rarity]

  return (
    <button
      onClick={onSelect}
      disabled={!color.unlocked}
      className={`relative p-4 rounded-xl border overflow-hidden transition-all ${
        isEquipped
          ? "ring-2 ring-cyan-500 border-transparent"
          : color.unlocked
          ? "border-zinc-700 hover:border-zinc-600"
          : "border-zinc-800 opacity-50"
      }`}
      style={{
        background: color.background_gradient || `linear-gradient(135deg, ${color.primary_color}, ${color.secondary_color || color.primary_color})`,
      }}
    >
      {/* Overlay for locked */}
      {!color.unlocked && (
        <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
          <Lock className="w-5 h-5 text-zinc-500" />
        </div>
      )}

      {/* Content */}
      <div className="relative z-10">
        <p className="font-bold text-white text-shadow">{color.name}</p>
        <div className="flex items-center gap-2 mt-2">
          <div
            className="w-4 h-4 rounded-full border border-white/30"
            style={{ backgroundColor: color.primary_color }}
          />
          {color.secondary_color && (
            <div
              className="w-4 h-4 rounded-full border border-white/30"
              style={{ backgroundColor: color.secondary_color }}
            />
          )}
          {color.accent_color && (
            <div
              className="w-4 h-4 rounded-full border border-white/30"
              style={{ backgroundColor: color.accent_color }}
            />
          )}
        </div>
      </div>

      {/* Equipped indicator */}
      {isEquipped && (
        <div className="absolute top-2 right-2 w-6 h-6 rounded-full bg-cyan-500 flex items-center justify-center">
          <Check className="w-4 h-4 text-white" />
        </div>
      )}

      {/* Rarity badge */}
      <div className={`absolute bottom-2 right-2 text-xs px-2 py-0.5 rounded-full bg-black/50 ${rarityConfig.color}`}>
        {rarityConfig.name}
      </div>
    </button>
  )
}

/* ==========================================================================
   BACKGROUND SELECTOR
   ========================================================================== */

interface BackgroundSelectorProps {
  backgrounds: Array<ProfileBackground & { unlocked: boolean; unlocked_at?: string }>
  equippedId?: string | null
  onSelect: (id: string) => void
}

function BackgroundSelector({
  backgrounds,
  equippedId,
  onSelect,
}: BackgroundSelectorProps) {
  return (
    <div className="grid grid-cols-2 gap-3">
      {backgrounds.map((bg) => (
        <BackgroundCard
          key={bg.id}
          background={bg}
          isEquipped={equippedId === bg.id}
          onSelect={() => bg.unlocked && onSelect(bg.id)}
        />
      ))}
    </div>
  )
}

interface BackgroundCardProps {
  background: ProfileBackground & { unlocked: boolean }
  isEquipped: boolean
  onSelect: () => void
}

function BackgroundCard({ background, isEquipped, onSelect }: BackgroundCardProps) {
  const rarityConfig = RARITY_CONFIG[background.rarity]
  const bgStyle = getBackgroundStyle(background)

  return (
    <button
      onClick={onSelect}
      disabled={!background.unlocked}
      className={`relative h-24 rounded-xl border overflow-hidden transition-all ${
        isEquipped
          ? "ring-2 ring-cyan-500 border-transparent"
          : background.unlocked
          ? "border-zinc-700 hover:border-zinc-600"
          : "border-zinc-800 opacity-50"
      }`}
      style={bgStyle}
    >
      {/* Overlay for locked */}
      {!background.unlocked && (
        <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
          <Lock className="w-5 h-5 text-zinc-500" />
        </div>
      )}

      {/* Content */}
      <div className="absolute inset-0 flex items-end p-3">
        <div className="flex items-center justify-between w-full">
          <p className="font-medium text-white text-sm text-shadow">
            {background.name}
          </p>
          <span className={`text-xs px-2 py-0.5 rounded-full bg-black/50 ${rarityConfig.color}`}>
            {rarityConfig.name}
          </span>
        </div>
      </div>

      {/* Equipped indicator */}
      {isEquipped && (
        <div className="absolute top-2 right-2 w-6 h-6 rounded-full bg-cyan-500 flex items-center justify-center">
          <Check className="w-4 h-4 text-white" />
        </div>
      )}

      {/* Animated indicator */}
      {background.background_type === "animated" && background.unlocked && (
        <Sparkles className="absolute top-2 left-2 w-4 h-4 text-yellow-400" />
      )}
    </button>
  )
}

/* ==========================================================================
   PROFILE PREFERENCES
   ========================================================================== */

interface ProfilePreferencesProps {
  preferences: ProfilePreferencesState
  onUpdate: (prefs: Partial<ProfilePreferencesState>) => Promise<void>
}

type ProfilePreferencesState = {
  show_level: boolean
  show_xp: boolean
  show_badges_count: boolean
  show_events_count: boolean
  show_friends_count: boolean
  show_crew: boolean
}

export function ProfilePreferences({
  preferences,
  onUpdate,
}: ProfilePreferencesProps) {
  const items = [
    { key: "show_level" as const, label: "Afficher mon niveau" },
    { key: "show_xp" as const, label: "Afficher mon XP" },
    { key: "show_badges_count" as const, label: "Afficher le nombre de badges" },
    { key: "show_events_count" as const, label: "Afficher le nombre d'événements" },
    { key: "show_friends_count" as const, label: "Afficher le nombre d'amis" },
    { key: "show_crew" as const, label: "Afficher mon crew" },
  ]

  return (
    <div className="space-y-2">
      <h3 className="font-bold text-white flex items-center gap-2 mb-4">
        <Settings className="w-5 h-5 text-zinc-400" />
        Préférences d'affichage
      </h3>

      {items.map((item) => (
        <label
          key={item.key}
          className="flex items-center justify-between p-3 rounded-xl bg-zinc-800/50 border border-zinc-700 cursor-pointer hover:bg-zinc-800"
        >
          <span className="text-zinc-300">{item.label}</span>
          <div className="relative">
            <input
              type="checkbox"
              checked={preferences[item.key]}
              onChange={(e) => onUpdate({ [item.key]: e.target.checked })}
              className="sr-only"
            />
            <div
              className={`w-10 h-6 rounded-full transition-colors ${
                preferences[item.key] ? "bg-cyan-500" : "bg-zinc-600"
              }`}
            >
              <div
                className={`w-4 h-4 rounded-full bg-white absolute top-1 transition-transform ${
                  preferences[item.key] ? "translate-x-5" : "translate-x-1"
                }`}
              />
            </div>
          </div>
        </label>
      ))}
    </div>
  )
}

/* ==========================================================================
   BIO EDITOR
   ========================================================================== */

interface BioEditorProps {
  currentBio?: string | null
  currentEmoji?: string | null
  onSave: (bio: string, emoji?: string) => Promise<void>
}

export function BioEditor({ currentBio, currentEmoji, onSave }: BioEditorProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [bio, setBio] = useState(currentBio || "")
  const [emoji, setEmoji] = useState(currentEmoji || "")
  const [isSaving, setIsSaving] = useState(false)

  const handleSave = async () => {
    setIsSaving(true)
    await onSave(bio, emoji || undefined)
    setIsSaving(false)
    setIsEditing(false)
  }

  const commonEmojis = ["✨", "🎉", "🎮", "🎵", "💖", "🔥", "⭐", "🚀"]

  return (
    <div className="p-4 rounded-xl bg-zinc-800/50 border border-zinc-700">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-medium text-white">Bio</h3>
        {!isEditing && (
          <button
            onClick={() => setIsEditing(true)}
            className="p-1.5 rounded-lg bg-zinc-700 text-zinc-400 hover:text-white"
          >
            <Edit2 className="w-4 h-4" />
          </button>
        )}
      </div>

      {isEditing ? (
        <div className="space-y-3">
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            maxLength={150}
            placeholder="Écris quelque chose sur toi..."
            className="w-full p-3 rounded-lg bg-zinc-900 border border-zinc-700 text-white placeholder-zinc-500 resize-none"
            rows={3}
          />

          <div>
            <p className="text-xs text-zinc-500 mb-2">Emoji</p>
            <div className="flex gap-2 flex-wrap">
              {commonEmojis.map((e) => (
                <button
                  key={e}
                  onClick={() => setEmoji(e)}
                  className={`p-2 rounded-lg transition-colors ${
                    emoji === e
                      ? "bg-cyan-500/20 border border-cyan-500"
                      : "bg-zinc-800 hover:bg-zinc-700"
                  }`}
                >
                  {e}
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => setIsEditing(false)}
              className="flex-1 py-2 rounded-lg bg-zinc-700 text-zinc-300"
            >
              Annuler
            </button>
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="flex-1 py-2 rounded-lg bg-cyan-500 text-white font-medium"
            >
              {isSaving ? "..." : "Sauvegarder"}
            </button>
          </div>
        </div>
      ) : (
        <div className="flex items-start gap-2">
          {currentEmoji && <span className="text-xl">{currentEmoji}</span>}
          <p className="text-zinc-400">
            {currentBio || "Aucune bio définie"}
          </p>
        </div>
      )}
    </div>
  )
}
