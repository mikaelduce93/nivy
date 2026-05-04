"use client"

/**
 * SHARE MODAL COMPONENT
 * =====================
 * Modal de partage vers réseaux sociaux
 */

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  X,
  Copy,
  Check,
  Download,
  ExternalLink,
  Share2,
  Loader2,
  Facebook,
  Twitter,
  Instagram,
  Linkedin,
  MessageCircle,
  Send,
  Mail,
  Link2,
  Sparkles,
  Gift,
} from "lucide-react"

// Types
interface ShareModalProps {
  isOpen: boolean
  onClose: () => void
  contentType: string
  contentId?: string
  customData?: {
    title?: string
    description?: string
    image?: string
    url?: string
  }
}

interface Platform {
  id: string
  name: string
  icon: React.ReactNode
  color: string
  bgColor: string
}

// Plateformes de partage
const PLATFORMS: Platform[] = [
  {
    id: "whatsapp",
    name: "WhatsApp",
    icon: <MessageCircle className="w-6 h-6" />,
    color: "text-green-500",
    bgColor: "bg-green-500/10 hover:bg-green-500/20",
  },
  {
    id: "facebook",
    name: "Facebook",
    icon: <Facebook className="w-6 h-6" />,
    color: "text-blue-500",
    bgColor: "bg-blue-500/10 hover:bg-blue-500/20",
  },
  {
    id: "twitter",
    name: "Twitter/X",
    icon: <Twitter className="w-6 h-6" />,
    color: "text-sky-400",
    bgColor: "bg-sky-400/10 hover:bg-sky-400/20",
  },
  {
    id: "instagram",
    name: "Instagram",
    icon: <Instagram className="w-6 h-6" />,
    color: "text-pink-500",
    bgColor: "bg-pink-500/10 hover:bg-pink-500/20",
  },
  {
    id: "telegram",
    name: "Telegram",
    icon: <Send className="w-6 h-6" />,
    color: "text-blue-400",
    bgColor: "bg-blue-400/10 hover:bg-blue-400/20",
  },
  {
    id: "linkedin",
    name: "LinkedIn",
    icon: <Linkedin className="w-6 h-6" />,
    color: "text-blue-600",
    bgColor: "bg-blue-600/10 hover:bg-blue-600/20",
  },
  {
    id: "email",
    name: "Email",
    icon: <Mail className="w-6 h-6" />,
    color: "text-orange-400",
    bgColor: "bg-orange-400/10 hover:bg-orange-400/20",
  },
  {
    id: "copy_link",
    name: "Copier le lien",
    icon: <Link2 className="w-6 h-6" />,
    color: "text-zinc-400",
    bgColor: "bg-zinc-400/10 hover:bg-zinc-400/20",
  },
]

export function ShareModal({
  isOpen,
  onClose,
  contentType,
  contentId,
  customData,
}: ShareModalProps) {
  const [loading, setLoading] = useState(true)
  const [sharing, setSharing] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [shareData, setShareData] = useState<{
    title: string
    description: string
    image?: string
    url?: string
    hashtags: string[]
  } | null>(null)
  const [shareLink, setShareLink] = useState<string | null>(null)
  const [reward, setReward] = useState<{ xp: number; daily_shares: number; daily_limit: number } | null>(null)

  // Charger les données de partage
  useEffect(() => {
    if (!isOpen) return

    const loadShareData = async () => {
      setLoading(true)
      try {
        // Si données custom fournies
        if (customData) {
          setShareData({
            title: customData.title || "Découvre TeensParty!",
            description: customData.description || "",
            image: customData.image,
            url: customData.url,
            hashtags: ["TeensParty"],
          })
          setShareLink(customData.url || window.location.href)
          setLoading(false)
          return
        }

        // Sinon, préparer via l'API
        const res = await fetch("/api/teen/share", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "prepare",
            content_type: contentType,
            content_id: contentId,
          }),
        })

        const data = await res.json()
        if (data.share_data) {
          setShareData(data.share_data)
        }

        // Créer un lien court
        const linkRes = await fetch("/api/teen/share", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "create_link",
            target_type: contentType,
            target_id: contentId,
            target_url: window.location.href,
            og_title: data.share_data?.title,
            og_description: data.share_data?.description,
            og_image: data.share_data?.image,
          }),
        })

        const linkData = await linkRes.json()
        if (linkData.link) {
          setShareLink(linkData.link.full_url)
        }
      } catch (err) {
        console.error("Error loading share data:", err)
        setShareData({
          title: "Découvre TeensParty!",
          description: "La plateforme de gamification pour teens au Maroc",
          hashtags: ["TeensParty"],
        })
        setShareLink(window.location.href)
      } finally {
        setLoading(false)
      }
    }

    loadShareData()
  }, [isOpen, contentType, contentId, customData])

  // Partager sur une plateforme
  const handleShare = async (platform: Platform) => {
    if (!shareData || !shareLink) return

    setSharing(platform.id)

    try {
      // Enregistrer le partage
      const res = await fetch("/api/teen/share", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "share",
          content_type: contentType,
          content_id: contentId,
          platform: platform.id,
          title: shareData.title,
          description: shareData.description,
          hashtags: shareData.hashtags,
        }),
      })

      const data = await res.json()

      if (data.success) {
        setReward({
          xp: data.xp_earned,
          daily_shares: data.daily_shares,
          daily_limit: data.daily_limit,
        })
      }

      // Générer l'URL de partage
      const urlRes = await fetch("/api/teen/share", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "generate_share_url",
          platform: platform.id,
          url: shareLink,
          text: shareData.title,
          title: shareData.title,
          hashtags: shareData.hashtags,
        }),
      })

      const urlData = await urlRes.json()

      if (platform.id === "copy_link") {
        // Copier le lien
        await navigator.clipboard.writeText(shareLink)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      } else if (urlData.share_url) {
        // Ouvrir la fenêtre de partage
        window.open(urlData.share_url, "_blank", "width=600,height=400")
      } else if (urlData.copy_text) {
        // Pour Instagram/TikTok, copier le texte
        await navigator.clipboard.writeText(urlData.copy_text)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
        alert(urlData.instructions)
      }
    } catch (err) {
      console.error("Error sharing:", err)
    } finally {
      setSharing(null)
    }
  }

  // Télécharger l'image
  const handleDownload = async () => {
    if (!shareData?.image) return

    try {
      const response = await fetch(shareData.image)
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `teensparty-${contentType}-${Date.now()}.png`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(url)
    } catch (err) {
      console.error("Error downloading:", err)
    }
  }

  if (!isOpen) return null

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-md bg-zinc-900 rounded-2xl border border-zinc-800 overflow-hidden"
        >
          {/* Header */}
          <div className="p-4 border-b border-zinc-800 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-full
                flex items-center justify-center">
                <Share2 className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="font-semibold text-white">Partager</h2>
                <p className="text-xs text-zinc-500">Gagne des XP en partageant!</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-zinc-800 rounded-full transition-colors"
            >
              <X className="w-5 h-5 text-zinc-400" />
            </button>
          </div>

          {/* Content */}
          <div className="p-4">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-8">
                <Loader2 className="w-8 h-8 text-cyan-500 animate-spin mb-4" />
                <p className="text-zinc-400">Préparation du partage...</p>
              </div>
            ) : (
              <>
                {/* Preview Card */}
                {shareData && (
                  <div className="bg-zinc-800 rounded-xl p-4 mb-4">
                    <div className="flex gap-3">
                      {shareData.image && (
                        <img
                          src={shareData.image}
                          alt=""
                          className="w-20 h-20 rounded-lg object-cover"
                        />
                      )}
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-white line-clamp-2">
                          {shareData.title}
                        </h3>
                        {shareData.description && (
                          <p className="text-sm text-zinc-400 mt-1 line-clamp-2">
                            {shareData.description}
                          </p>
                        )}
                        {shareData.hashtags && shareData.hashtags.length > 0 && (
                          <p className="text-xs text-cyan-400 mt-2">
                            {shareData.hashtags.map((h) => `#${h}`).join(" ")}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Share link */}
                {shareLink && (
                  <div className="flex gap-2 mb-4">
                    <input
                      type="text"
                      value={shareLink}
                      readOnly
                      className="flex-1 bg-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-300
                        border border-zinc-700 focus:outline-none"
                    />
                    <button
                      onClick={() => handleShare(PLATFORMS.find((p) => p.id === "copy_link")!)}
                      className="px-3 py-2 bg-zinc-800 rounded-lg hover:bg-zinc-700 transition-colors
                        flex items-center gap-2"
                    >
                      {copied ? (
                        <Check className="w-4 h-4 text-green-400" />
                      ) : (
                        <Copy className="w-4 h-4 text-zinc-400" />
                      )}
                    </button>
                  </div>
                )}

                {/* Platforms grid */}
                <div className="grid grid-cols-4 gap-3">
                  {PLATFORMS.map((platform) => (
                    <button
                      key={platform.id}
                      onClick={() => handleShare(platform)}
                      disabled={sharing !== null}
                      className={`flex flex-col items-center gap-2 p-3 rounded-xl transition-all
                        ${platform.bgColor} ${platform.color}
                        ${sharing === platform.id ? "scale-95 opacity-70" : ""}`}
                    >
                      {sharing === platform.id ? (
                        <Loader2 className="w-6 h-6 animate-spin" />
                      ) : platform.id === "copy_link" && copied ? (
                        <Check className="w-6 h-6" />
                      ) : (
                        platform.icon
                      )}
                      <span className="text-xs text-zinc-400">{platform.name}</span>
                    </button>
                  ))}
                </div>

                {/* Download button */}
                {shareData?.image && (
                  <button
                    onClick={handleDownload}
                    className="w-full mt-4 py-3 bg-zinc-800 rounded-xl hover:bg-zinc-700
                      transition-colors flex items-center justify-center gap-2 text-zinc-300"
                  >
                    <Download className="w-5 h-5" />
                    <span>Télécharger l'image</span>
                  </button>
                )}

                {/* Reward notification */}
                <AnimatePresence>
                  {reward && (
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                      className="mt-4 p-3 bg-gradient-to-r from-cyan-500/10 to-blue-500/10
                        rounded-xl border border-cyan-500/20"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-cyan-500/20 rounded-full flex items-center justify-center">
                          <Gift className="w-5 h-5 text-cyan-400" />
                        </div>
                        <div className="flex-1">
                          <p className="font-semibold text-cyan-400">
                            +{reward.xp} XP gagnés!
                          </p>
                          <p className="text-xs text-zinc-400">
                            {reward.daily_shares}/{reward.daily_limit} partages aujourd'hui
                          </p>
                        </div>
                        <Sparkles className="w-5 h-5 text-yellow-400" />
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}

// Hook pour utiliser le partage facilement
export function useShare() {
  const [isOpen, setIsOpen] = useState(false)
  const [shareConfig, setShareConfig] = useState<{
    contentType: string
    contentId?: string
    customData?: {
      title?: string
      description?: string
      image?: string
      url?: string
    }
  } | null>(null)

  const openShare = (config: typeof shareConfig) => {
    setShareConfig(config)
    setIsOpen(true)
  }

  const closeShare = () => {
    setIsOpen(false)
    setShareConfig(null)
  }

  const ShareModalComponent = () => {
    if (!shareConfig) return null
    return (
      <ShareModal
        isOpen={isOpen}
        onClose={closeShare}
        contentType={shareConfig.contentType}
        contentId={shareConfig.contentId}
        customData={shareConfig.customData}
      />
    )
  }

  return {
    openShare,
    closeShare,
    ShareModal: ShareModalComponent,
  }
}
