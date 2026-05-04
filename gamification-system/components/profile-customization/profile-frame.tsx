/**
 * TEENS PARTY MOROCCO - Profile Frame Components
 * ===============================================
 *
 * Composants pour les cadres de profil.
 */

"use client"

import { motion } from "framer-motion"
import { Lock, Check, Sparkles } from "lucide-react"
import {
  type ProfileFrame,
  type ProfileFrameWithUnlock,
  type Rarity,
  getFrameStyle,
  RARITY_CONFIG,
} from "../../features/profile-customization"

/* ==========================================================================
   PROFILE AVATAR WITH FRAME
   ========================================================================== */

interface ProfileAvatarWithFrameProps {
  avatarUrl?: string
  frame?: ProfileFrame | null
  size?: "sm" | "md" | "lg" | "xl"
  showLevel?: boolean
  level?: number
  onClick?: () => void
}

export function ProfileAvatarWithFrame({
  avatarUrl,
  frame,
  size = "md",
  showLevel = false,
  level,
  onClick,
}: ProfileAvatarWithFrameProps) {
  const sizeClasses = {
    sm: "w-10 h-10",
    md: "w-16 h-16",
    lg: "w-24 h-24",
    xl: "w-32 h-32",
  }

  const frameStyle = frame ? getFrameStyle(frame) : {}
  const isAnimated = frame?.frame_type === "animated"

  return (
    <div
      className={`relative ${sizeClasses[size]} cursor-pointer`}
      onClick={onClick}
    >
      {/* Frame container */}
      <div
        className={`absolute inset-0 rounded-full ${
          isAnimated ? frame?.animation_class || "" : ""
        }`}
        style={{
          ...frameStyle,
          padding: size === "sm" ? "2px" : size === "md" ? "3px" : "4px",
        }}
      >
        {/* Avatar */}
        <div
          className={`w-full h-full rounded-full overflow-hidden bg-zinc-800 ${
            frame?.gradient_colors && frame.gradient_colors.length >= 2
              ? ""
              : "border-2 border-zinc-700"
          }`}
        >
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt="Avatar"
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-zinc-500">
              <span className="text-2xl">👤</span>
            </div>
          )}
        </div>
      </div>

      {/* Level badge */}
      {showLevel && level !== undefined && (
        <div className="absolute -bottom-1 -right-1 px-2 py-0.5 rounded-full bg-cyan-500 text-white text-xs font-bold">
          {level}
        </div>
      )}
    </div>
  )
}

/* ==========================================================================
   FRAME SELECTOR
   ========================================================================== */

interface FrameSelectorProps {
  frames: ProfileFrameWithUnlock[]
  selectedId?: string | null
  equippedId?: string | null
  onSelect: (frameId: string) => void
}

export function FrameSelector({
  frames,
  selectedId,
  equippedId,
  onSelect,
}: FrameSelectorProps) {
  // Grouper par rareté
  const groupedFrames = frames.reduce(
    (acc, frame) => {
      if (!acc[frame.rarity]) {
        acc[frame.rarity] = []
      }
      acc[frame.rarity].push(frame)
      return acc
    },
    {} as Record<Rarity, ProfileFrameWithUnlock[]>
  )

  const rarityOrder: Rarity[] = ["common", "uncommon", "rare", "epic", "legendary"]

  return (
    <div className="space-y-6">
      {rarityOrder.map(
        (rarity) =>
          groupedFrames[rarity] &&
          groupedFrames[rarity].length > 0 && (
            <div key={rarity}>
              <h4
                className={`text-sm font-medium mb-3 ${RARITY_CONFIG[rarity].color}`}
              >
                {RARITY_CONFIG[rarity].name}
              </h4>
              <div className="grid grid-cols-4 gap-3">
                {groupedFrames[rarity].map((frame) => (
                  <FramePreviewCard
                    key={frame.id}
                    frame={frame}
                    isSelected={selectedId === frame.id}
                    isEquipped={equippedId === frame.id}
                    onSelect={() => frame.unlocked && onSelect(frame.id)}
                  />
                ))}
              </div>
            </div>
          )
      )}
    </div>
  )
}

/* ==========================================================================
   FRAME PREVIEW CARD
   ========================================================================== */

interface FramePreviewCardProps {
  frame: ProfileFrameWithUnlock
  isSelected?: boolean
  isEquipped?: boolean
  onSelect?: () => void
}

export function FramePreviewCard({
  frame,
  isSelected,
  isEquipped,
  onSelect,
}: FramePreviewCardProps) {
  const frameStyle = getFrameStyle(frame)
  const rarityConfig = RARITY_CONFIG[frame.rarity]

  return (
    <motion.button
      whileHover={frame.unlocked ? { scale: 1.05 } : {}}
      whileTap={frame.unlocked ? { scale: 0.95 } : {}}
      onClick={onSelect}
      disabled={!frame.unlocked}
      className={`relative p-2 rounded-xl border transition-all ${
        isSelected
          ? `${rarityConfig.borderColor} ${rarityConfig.bgColor}`
          : frame.unlocked
          ? "border-zinc-700 bg-zinc-800/50 hover:border-zinc-600"
          : "border-zinc-800 bg-zinc-900/50 opacity-50"
      }`}
    >
      {/* Frame preview */}
      <div
        className="w-12 h-12 mx-auto rounded-full bg-zinc-700 flex items-center justify-center"
        style={{
          ...frameStyle,
          padding: "3px",
        }}
      >
        <div className="w-full h-full rounded-full bg-zinc-800 flex items-center justify-center">
          👤
        </div>
      </div>

      {/* Name */}
      <p className="text-xs text-white mt-2 truncate text-center">{frame.name}</p>

      {/* Locked overlay */}
      {!frame.unlocked && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-xl">
          <Lock className="w-4 h-4 text-zinc-500" />
        </div>
      )}

      {/* Equipped indicator */}
      {isEquipped && (
        <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-green-500 flex items-center justify-center">
          <Check className="w-3 h-3 text-white" />
        </div>
      )}

      {/* Rarity indicator */}
      {frame.rarity === "legendary" && frame.unlocked && (
        <Sparkles className="absolute -top-1 -left-1 w-4 h-4 text-yellow-400" />
      )}
    </motion.button>
  )
}

/* ==========================================================================
   FRAME DETAIL CARD
   ========================================================================== */

interface FrameDetailCardProps {
  frame: ProfileFrame
  isUnlocked: boolean
  isEquipped: boolean
  onEquip?: () => void
  onPurchase?: () => void
}

export function FrameDetailCard({
  frame,
  isUnlocked,
  isEquipped,
  onEquip,
  onPurchase,
}: FrameDetailCardProps) {
  const frameStyle = getFrameStyle(frame)
  const rarityConfig = RARITY_CONFIG[frame.rarity]

  return (
    <div
      className={`p-4 rounded-2xl border ${rarityConfig.borderColor} ${rarityConfig.bgColor}`}
    >
      <div className="flex items-center gap-4">
        {/* Preview */}
        <div
          className="w-20 h-20 rounded-full bg-zinc-700 flex items-center justify-center"
          style={{
            ...frameStyle,
            padding: "4px",
          }}
        >
          <div className="w-full h-full rounded-full bg-zinc-800 flex items-center justify-center text-2xl">
            👤
          </div>
        </div>

        {/* Info */}
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-bold text-white">{frame.name}</h3>
            <span className={`text-xs px-2 py-0.5 rounded-full ${rarityConfig.bgColor} ${rarityConfig.color}`}>
              {rarityConfig.name}
            </span>
          </div>
          <p className="text-sm text-zinc-400">{frame.description}</p>
        </div>
      </div>

      {/* Action buttons */}
      <div className="mt-4 flex gap-2">
        {isUnlocked ? (
          <button
            onClick={onEquip}
            disabled={isEquipped}
            className={`flex-1 py-2 rounded-xl font-medium transition-colors ${
              isEquipped
                ? "bg-green-500/20 text-green-400"
                : "bg-cyan-500 text-white hover:bg-cyan-600"
            }`}
          >
            {isEquipped ? "Équipé" : "Équiper"}
          </button>
        ) : frame.unlock_type === "purchase" ? (
          <button
            onClick={onPurchase}
            className="flex-1 py-2 rounded-xl bg-yellow-500 text-black font-medium hover:bg-yellow-400"
          >
            Acheter - {(frame.unlock_requirement as any).coins} coins
          </button>
        ) : (
          <div className="flex-1 py-2 rounded-xl bg-zinc-800 text-zinc-400 text-center text-sm">
            <Lock className="w-4 h-4 inline mr-1" />
            {frame.unlock_type === "level"
              ? `Niveau ${(frame.unlock_requirement as any).level}`
              : frame.unlock_type === "achievement"
              ? "Succès requis"
              : frame.unlock_type === "vip"
              ? "VIP requis"
              : "Verrouillé"}
          </div>
        )}
      </div>
    </div>
  )
}

/* ==========================================================================
   ANIMATED FRAME EFFECTS
   ========================================================================== */

interface AnimatedFrameProps {
  children: React.ReactNode
  animationType: "glow" | "pulse" | "rainbow" | "fire" | "sparkle"
  colors?: string[]
}

export function AnimatedFrame({
  children,
  animationType,
  colors = ["#06b6d4", "#8b5cf6"],
}: AnimatedFrameProps) {
  const getAnimation = () => {
    switch (animationType) {
      case "glow":
        return (
          <motion.div
            className="absolute inset-0 rounded-full"
            animate={{
              boxShadow: [
                `0 0 20px ${colors[0]}50`,
                `0 0 40px ${colors[0]}80`,
                `0 0 20px ${colors[0]}50`,
              ],
            }}
            transition={{ duration: 2, repeat: Infinity }}
          />
        )
      case "pulse":
        return (
          <motion.div
            className="absolute inset-0 rounded-full border-2"
            style={{ borderColor: colors[0] }}
            animate={{ scale: [1, 1.1, 1], opacity: [1, 0.5, 1] }}
            transition={{ duration: 1.5, repeat: Infinity }}
          />
        )
      case "rainbow":
        return (
          <motion.div
            className="absolute inset-0 rounded-full"
            style={{
              background: `conic-gradient(from 0deg, ${colors.join(", ")}, ${colors[0]})`,
              padding: "3px",
            }}
            animate={{ rotate: [0, 360] }}
            transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
          />
        )
      default:
        return null
    }
  }

  return (
    <div className="relative">
      {getAnimation()}
      {children}
    </div>
  )
}
