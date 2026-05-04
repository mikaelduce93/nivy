/**
 * TEENS PARTY MOROCCO - Share Button Components
 * ==============================================
 *
 * Composants pour les boutons de partage.
 */

"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  Share2,
  Instagram,
  Facebook,
  Twitter,
  MessageCircle,
  Link,
  Check,
  Music2,
  Ghost,
  X,
  Sparkles,
} from "lucide-react"
import {
  type PlatformSlug,
  type ShareContent,
  type ShareResult,
  PLATFORM_CONFIG,
  getPlatformConfig,
  buildShareUrl,
  copyToClipboard,
  nativeShare,
  isNativeShareSupported,
  getPopularPlatforms,
} from "../../features/social-sharing"

/* ==========================================================================
   SHARE BUTTON
   ========================================================================== */

interface ShareButtonProps {
  content: ShareContent
  onShare?: (platform: PlatformSlug, result: ShareResult) => void
  variant?: "icon" | "full" | "compact"
  size?: "sm" | "md" | "lg"
  showLabel?: boolean
  className?: string
}

export function ShareButton({
  content,
  onShare,
  variant = "icon",
  size = "md",
  showLabel = true,
  className = "",
}: ShareButtonProps) {
  const [showMenu, setShowMenu] = useState(false)
  const [sharing, setSharing] = useState(false)
  const [lastResult, setLastResult] = useState<ShareResult | null>(null)

  const sizes = {
    sm: "w-8 h-8",
    md: "w-10 h-10",
    lg: "w-12 h-12",
  }

  const iconSizes = {
    sm: 16,
    md: 20,
    lg: 24,
  }

  const handleShare = async (platform: PlatformSlug) => {
    setSharing(true)

    try {
      const config = getPlatformConfig(platform)
      let success = false

      if (platform === "copy_link") {
        const url = buildShareUrl(platform, content)
        success = await copyToClipboard(url)
      } else if (config.shareType === "url") {
        const url = buildShareUrl(platform, content)
        window.open(url, "_blank", "noopener,noreferrer")
        success = true
      } else if (config.shareType === "native" && isNativeShareSupported()) {
        success = await nativeShare({
          title: content.title,
          text: content.description || content.title,
          url: buildShareUrl("copy_link", content),
        })
      } else {
        // Fallback: copier le lien
        const url = buildShareUrl("copy_link", content)
        success = await copyToClipboard(url)
      }

      const result: ShareResult = { success }
      setLastResult(result)
      onShare?.(platform, result)

      // Reset après animation
      setTimeout(() => {
        setLastResult(null)
        setShowMenu(false)
      }, 2000)
    } finally {
      setSharing(false)
    }
  }

  if (variant === "icon") {
    return (
      <div className="relative">
        <button
          onClick={() => setShowMenu(!showMenu)}
          className={`${sizes[size]} rounded-full bg-zinc-800 hover:bg-zinc-700 flex items-center justify-center transition-colors ${className}`}
        >
          <Share2 size={iconSizes[size]} className="text-zinc-400" />
        </button>

        <AnimatePresence>
          {showMenu && (
            <ShareMenu
              onSelect={handleShare}
              onClose={() => setShowMenu(false)}
              lastResult={lastResult}
            />
          )}
        </AnimatePresence>
      </div>
    )
  }

  if (variant === "compact") {
    return (
      <div className="relative">
        <button
          onClick={() => setShowMenu(!showMenu)}
          className={`flex items-center gap-2 px-3 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 transition-colors ${className}`}
        >
          <Share2 size={iconSizes[size]} className="text-cyan-400" />
          {showLabel && (
            <span className="text-sm text-zinc-300">Partager</span>
          )}
        </button>

        <AnimatePresence>
          {showMenu && (
            <ShareMenu
              onSelect={handleShare}
              onClose={() => setShowMenu(false)}
              lastResult={lastResult}
            />
          )}
        </AnimatePresence>
      </div>
    )
  }

  // Full variant
  return (
    <div className={`space-y-3 ${className}`}>
      <div className="flex items-center justify-between">
        <h4 className="font-medium text-white">Partager</h4>
        {lastResult?.success && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex items-center gap-1 text-green-400 text-sm"
          >
            <Check className="w-4 h-4" />
            Partagé !
          </motion.div>
        )}
      </div>

      <div className="flex gap-2">
        {getPopularPlatforms().map((platform) => (
          <PlatformButton
            key={platform}
            platform={platform}
            onClick={() => handleShare(platform)}
            disabled={sharing}
            size={size}
          />
        ))}
        <PlatformButton
          platform="copy_link"
          onClick={() => handleShare("copy_link")}
          disabled={sharing}
          size={size}
        />
      </div>
    </div>
  )
}

/* ==========================================================================
   SHARE MENU
   ========================================================================== */

interface ShareMenuProps {
  onSelect: (platform: PlatformSlug) => void
  onClose: () => void
  lastResult: ShareResult | null
}

function ShareMenu({ onSelect, onClose, lastResult }: ShareMenuProps) {
  const platforms: PlatformSlug[] = [
    "instagram",
    "whatsapp",
    "snapchat",
    "tiktok",
    "facebook",
    "twitter",
    "copy_link",
  ]

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95, y: 10 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95, y: 10 }}
      className="absolute right-0 top-full mt-2 p-3 bg-zinc-900 border border-zinc-700 rounded-2xl shadow-xl z-50 min-w-[280px]"
    >
      <div className="flex items-center justify-between mb-3">
        <h4 className="font-medium text-white">Partager sur</h4>
        <button
          onClick={onClose}
          className="p-1 hover:bg-zinc-800 rounded-lg transition-colors"
        >
          <X className="w-4 h-4 text-zinc-400" />
        </button>
      </div>

      <div className="grid grid-cols-4 gap-2">
        {platforms.map((platform) => (
          <PlatformButton
            key={platform}
            platform={platform}
            onClick={() => onSelect(platform)}
            size="md"
            showLabel
          />
        ))}
      </div>

      {lastResult?.success && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-3 p-2 rounded-lg bg-green-500/20 text-center"
        >
          <div className="flex items-center justify-center gap-2 text-green-400">
            <Check className="w-4 h-4" />
            <span className="text-sm">Partagé avec succès !</span>
          </div>
          {lastResult.xpEarned && (
            <p className="text-xs text-green-300 mt-1">
              +{lastResult.xpEarned} XP
            </p>
          )}
        </motion.div>
      )}
    </motion.div>
  )
}

/* ==========================================================================
   PLATFORM BUTTON
   ========================================================================== */

interface PlatformButtonProps {
  platform: PlatformSlug
  onClick: () => void
  disabled?: boolean
  size?: "sm" | "md" | "lg"
  showLabel?: boolean
}

export function PlatformButton({
  platform,
  onClick,
  disabled = false,
  size = "md",
  showLabel = false,
}: PlatformButtonProps) {
  const config = getPlatformConfig(platform)
  const Icon = getPlatformIconComponent(platform)

  const sizes = {
    sm: "w-10 h-10",
    md: "w-12 h-12",
    lg: "w-14 h-14",
  }

  const iconSizes = {
    sm: 18,
    md: 22,
    lg: 26,
  }

  return (
    <motion.button
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
      disabled={disabled}
      className="flex flex-col items-center gap-1"
    >
      <div
        className={`${sizes[size]} rounded-xl ${config.bgColor} flex items-center justify-center ${
          disabled ? "opacity-50" : ""
        }`}
      >
        <Icon size={iconSizes[size]} className={config.color} />
      </div>
      {showLabel && (
        <span className="text-xs text-zinc-400">{config.name}</span>
      )}
    </motion.button>
  )
}

/* ==========================================================================
   SHARE MODAL
   ========================================================================== */

interface ShareModalProps {
  isOpen: boolean
  onClose: () => void
  content: ShareContent
  onShare?: (platform: PlatformSlug, result: ShareResult) => void
}

export function ShareModal({
  isOpen,
  onClose,
  content,
  onShare,
}: ShareModalProps) {
  const [copied, setCopied] = useState(false)

  const handleCopyLink = async () => {
    const url = buildShareUrl("copy_link", content)
    const success = await copyToClipboard(url)
    if (success) {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  if (!isOpen) return null

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          className="bg-zinc-900 border border-zinc-700 rounded-2xl p-6 max-w-md w-full"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-bold text-white">Partager</h3>
            <button
              onClick={onClose}
              className="p-2 hover:bg-zinc-800 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-zinc-400" />
            </button>
          </div>

          {/* Preview */}
          {content.imageUrl && (
            <div className="mb-6 rounded-xl overflow-hidden">
              <img
                src={content.imageUrl}
                alt=""
                className="w-full h-40 object-cover"
              />
            </div>
          )}

          <div className="mb-6">
            <h4 className="font-medium text-white mb-1">{content.title}</h4>
            {content.description && (
              <p className="text-sm text-zinc-400">{content.description}</p>
            )}
          </div>

          {/* Platforms */}
          <ShareButton
            content={content}
            onShare={onShare}
            variant="full"
            size="lg"
          />

          {/* Copy link */}
          <div className="mt-6 pt-6 border-t border-zinc-800">
            <div className="flex gap-2">
              <input
                type="text"
                value={buildShareUrl("copy_link", content)}
                readOnly
                className="flex-1 bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-2 text-sm text-zinc-300"
              />
              <button
                onClick={handleCopyLink}
                className={`px-4 py-2 rounded-xl font-medium transition-colors ${
                  copied
                    ? "bg-green-500 text-white"
                    : "bg-cyan-500 hover:bg-cyan-600 text-white"
                }`}
              >
                {copied ? (
                  <Check className="w-5 h-5" />
                ) : (
                  <Link className="w-5 h-5" />
                )}
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}

/* ==========================================================================
   SHARE SUCCESS TOAST
   ========================================================================== */

interface ShareSuccessToastProps {
  result: ShareResult
  visible: boolean
  onClose: () => void
}

export function ShareSuccessToast({
  result,
  visible,
  onClose,
}: ShareSuccessToastProps) {
  if (!visible || !result.success) return null

  return (
    <motion.div
      initial={{ opacity: 0, y: 50 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 50 }}
      className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50"
    >
      <div className="px-6 py-4 rounded-2xl bg-zinc-900 border border-cyan-500/30 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-cyan-500/20 flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-cyan-400" />
          </div>
          <div>
            <p className="font-medium text-white">Partagé avec succès !</p>
            {(result.xpEarned || result.coinsEarned) && (
              <p className="text-sm text-zinc-400">
                {result.xpEarned && `+${result.xpEarned} XP`}
                {result.xpEarned && result.coinsEarned && " • "}
                {result.coinsEarned && `+${result.coinsEarned} coins`}
              </p>
            )}
            {result.isFirstShare && (
              <p className="text-sm text-yellow-400">Premier partage ! Bonus appliqué</p>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-zinc-800 rounded-lg"
          >
            <X className="w-4 h-4 text-zinc-400" />
          </button>
        </div>
      </div>
    </motion.div>
  )
}

/* ==========================================================================
   HELPERS
   ========================================================================== */

function getPlatformIconComponent(platform: PlatformSlug) {
  const icons: Record<PlatformSlug, typeof Share2> = {
    instagram: Instagram,
    tiktok: Music2,
    snapchat: Ghost,
    whatsapp: MessageCircle,
    facebook: Facebook,
    twitter: Twitter,
    copy_link: Link,
  }
  return icons[platform] || Share2
}
