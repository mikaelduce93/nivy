"use client"

/**
 * POST COMPOSER COMPONENT
 * =======================
 * Composant pour créer de nouveaux posts
 */

import { useState, useRef } from "react"
import Image from "next/image"
import { motion, AnimatePresence } from "framer-motion"
import {
  Image as ImageIcon,
  Video,
  Smile,
  MapPin,
  Users,
  Globe,
  Lock,
  ChevronDown,
  X,
  Send,
  Hash,
  AtSign,
  Loader2,
} from "lucide-react"
import { toast } from "sonner"

interface PostComposerProps {
  onPost?: (post: unknown) => void
  circleId?: string
  circleName?: string
}

const VISIBILITY_OPTIONS = [
  { key: "public", label: "Public", icon: Globe, description: "Visible par tous" },
  { key: "friends", label: "Amis", icon: Users, description: "Amis seulement" },
  { key: "private", label: "Privé", icon: Lock, description: "Moi seulement" },
]

const EMOJIS = [
  "😀", "😂", "🥰", "😎", "🤩", "😤", "🥳", "😴",
  "❤️", "🔥", "⭐", "🎉", "💪", "🏆", "🎯", "✨",
  "👍", "👏", "🙌", "💯", "🚀", "⚡", "🌟", "💎",
]

export function PostComposer({ onPost, circleId, circleName }: PostComposerProps) {
  const [content, setContent] = useState("")
  const [visibility, setVisibility] = useState(circleId ? "circle" : "friends")
  const [showVisibility, setShowVisibility] = useState(false)
  const [showEmojis, setShowEmojis] = useState(false)
  const [mediaFiles, setMediaFiles] = useState<File[]>([])
  const [mediaPreviews, setMediaPreviews] = useState<string[]>([])
  const [isPosting, setIsPosting] = useState(false)
  const [isFocused, setIsFocused] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const handleMediaSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (files.length + mediaFiles.length > 4) {
      toast.error("Maximum 4 médias par post")
      return
    }

    const newPreviews = files.map((file) => URL.createObjectURL(file))
    setMediaFiles([...mediaFiles, ...files])
    setMediaPreviews([...mediaPreviews, ...newPreviews])
  }

  const removeMedia = (index: number) => {
    URL.revokeObjectURL(mediaPreviews[index])
    setMediaFiles(mediaFiles.filter((_, i) => i !== index))
    setMediaPreviews(mediaPreviews.filter((_, i) => i !== index))
  }

  const insertEmoji = (emoji: string) => {
    const textarea = textareaRef.current
    if (textarea) {
      const start = textarea.selectionStart
      const end = textarea.selectionEnd
      const newContent = content.substring(0, start) + emoji + content.substring(end)
      setContent(newContent)
      setTimeout(() => {
        textarea.focus()
        textarea.setSelectionRange(start + emoji.length, start + emoji.length)
      }, 0)
    } else {
      setContent(content + emoji)
    }
    setShowEmojis(false)
  }

  const handlePost = async () => {
    if (!content.trim() && mediaFiles.length === 0) return

    setIsPosting(true)
    try {
      // Upload des médias si présents
      let mediaUrls: string[] = []
      if (mediaFiles.length > 0) {
        // Pour l'instant, on simule l'upload
        // En production, on uploaderait vers Supabase Storage
        mediaUrls = mediaPreviews
      }

      const res = await fetch("/api/teen/feed", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create",
          post_type: mediaFiles.length > 0 ? "photo" : "status",
          content: content.trim(),
          media_urls: mediaUrls,
          visibility: circleId ? "circle" : visibility,
          circle_id: circleId,
        }),
      })

      const data = await res.json()
      if (data.success && data.post) {
        onPost?.(data.post)
        setContent("")
        setMediaFiles([])
        setMediaPreviews([])
        setIsFocused(false)
      }
    } catch (err) {
      console.error("Error posting:", err)
    } finally {
      setIsPosting(false)
    }
  }

  const visibilityOption = VISIBILITY_OPTIONS.find((v) => v.key === visibility)

  return (
    <div className="bg-card rounded-xl border border-ink overflow-hidden">
      <div className="p-4">
        {/* Input area */}
        <div className="flex gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-teal to-teal
            flex items-center justify-center text-ink font-bold flex-shrink-0">
            M
          </div>

          <div className="flex-1">
            <textarea
              ref={textareaRef}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              onFocus={() => setIsFocused(true)}
              placeholder={
                circleName
                  ? `Partager avec ${circleName}...`
                  : "Quoi de neuf ?"
              }
              className="w-full bg-transparent text-ink placeholder:text-mute
                resize-none focus:outline-none min-h-[60px]"
              rows={isFocused ? 3 : 1}
            />

            {/* Media previews */}
            {mediaPreviews.length > 0 && (
              <div className={`grid gap-2 mt-3 ${
                mediaPreviews.length === 1 ? "grid-cols-1" :
                mediaPreviews.length === 2 ? "grid-cols-2" :
                "grid-cols-2"
              }`}>
                {mediaPreviews.map((preview, idx) => (
                  <div key={idx} className="relative aspect-video bg-card rounded-lg overflow-hidden">
                    <Image
                      src={preview}
                      alt=""
                      fill
                      sizes="(max-width: 768px) 50vw, 25vw"
                      className="object-cover"
                      unoptimized
                    />
                    <button
                      onClick={() => removeMedia(idx)}
                      className="absolute top-2 right-2 p-1 bg-ink/50 rounded-full
                        hover:bg-ink/70 transition-colors"
                    >
                      <X className="w-4 h-4 text-ink" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Actions bar */}
        <AnimatePresence>
          {(isFocused || content || mediaFiles.length > 0) && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="mt-4 pt-4 border-t border-ink"
            >
              <div className="flex items-center justify-between">
                {/* Media buttons */}
                <div className="flex items-center gap-1">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*,video/*"
                    multiple
                    onChange={handleMediaSelect}
                    className="hidden"
                  />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="p-2 hover:bg-card rounded-lg transition-colors text-mute
                      hover:text-teal"
                    title="Ajouter une image"
                  >
                    <ImageIcon className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="p-2 hover:bg-card rounded-lg transition-colors text-mute
                      hover:text-pink"
                    title="Ajouter une vidéo"
                  >
                    <Video className="w-5 h-5" />
                  </button>

                  {/* Emoji picker */}
                  <div className="relative">
                    <button
                      onClick={() => setShowEmojis(!showEmojis)}
                      className="p-2 hover:bg-card rounded-lg transition-colors text-mute
                        hover:text-gold"
                      title="Ajouter un emoji"
                    >
                      <Smile className="w-5 h-5" />
                    </button>

                    <AnimatePresence>
                      {showEmojis && (
                        <motion.div
                          initial={{ opacity: 0, scale: 0.95 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.95 }}
                          className="absolute left-0 bottom-full mb-2 p-2 bg-card rounded-lg
                            border border-ink shadow-xl grid grid-cols-8 gap-1 z-10"
                        >
                          {EMOJIS.map((emoji) => (
                            <button
                              key={emoji}
                              onClick={() => insertEmoji(emoji)}
                              className="p-1.5 text-lg hover:bg-muted rounded transition-colors"
                            >
                              {emoji}
                            </button>
                          ))}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  <div className="w-px h-6 bg-muted mx-2" />

                  {/* Visibility selector */}
                  {!circleId && (
                    <div className="relative">
                      <button
                        onClick={() => setShowVisibility(!showVisibility)}
                        className="flex items-center gap-2 px-3 py-1.5 bg-card rounded-lg
                          hover:bg-muted transition-colors text-sm"
                      >
                        {visibilityOption && (
                          <>
                            <visibilityOption.icon className="w-4 h-4 text-mute" />
                            <span className="text-ink-2">{visibilityOption.label}</span>
                          </>
                        )}
                        <ChevronDown className="w-4 h-4 text-mute" />
                      </button>

                      <AnimatePresence>
                        {showVisibility && (
                          <motion.div
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className="absolute left-0 top-full mt-1 w-48 bg-card rounded-lg
                              border border-ink shadow-xl py-1 z-10"
                          >
                            {VISIBILITY_OPTIONS.map((option) => (
                              <button
                                key={option.key}
                                onClick={() => {
                                  setVisibility(option.key)
                                  setShowVisibility(false)
                                }}
                                className={`w-full px-3 py-2 flex items-center gap-3 hover:bg-muted
                                  transition-colors ${
                                    visibility === option.key ? "bg-muted" : ""
                                  }`}
                              >
                                <option.icon className="w-4 h-4 text-mute" />
                                <div className="text-left">
                                  <p className="text-sm text-ink">{option.label}</p>
                                  <p className="text-xs text-mute">{option.description}</p>
                                </div>
                              </button>
                            ))}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  )}

                  {circleId && circleName && (
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-teal/10 rounded-lg
                      text-sm text-teal">
                      <Users className="w-4 h-4" />
                      <span>{circleName}</span>
                    </div>
                  )}
                </div>

                {/* Post button */}
                <button
                  onClick={handlePost}
                  disabled={isPosting || (!content.trim() && mediaFiles.length === 0)}
                  className="px-4 py-2 bg-gradient-to-r from-teal to-teal text-ink
                    rounded-lg font-medium hover:from-teal hover:to-teal
                    disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2
                    transition-all"
                >
                  {isPosting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                  <span>Publier</span>
                </button>
              </div>

              {/* Character count */}
              <div className="mt-2 flex justify-end">
                <span className={`text-xs ${
                  content.length > 500 ? "text-destructive" : "text-mute"
                }`}>
                  {content.length}/500
                </span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}

// Trending Hashtags Widget
export function TrendingHashtags() {
  const [hashtags, setHashtags] = useState<Array<{
    hashtag_id: string
    tag: string
    posts_count: number
    trending_score: number
  }>>([])
  const [loading, setLoading] = useState(true)

  useState(() => {
    const loadTrending = async () => {
      try {
        const res = await fetch("/api/teen/feed?type=trending&limit=5")
        const data = await res.json()
        if (data.hashtags) setHashtags(data.hashtags)
      } catch (err) {
        console.error("Error loading trending:", err)
      } finally {
        setLoading(false)
      }
    }
    loadTrending()
  })

  if (loading) {
    return (
      <div className="bg-card rounded-xl border border-ink p-4">
        <div className="flex items-center gap-2 mb-4">
          <Hash className="w-5 h-5 text-teal" />
          <h3 className="font-semibold text-ink">Tendances</h3>
        </div>
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="animate-pulse">
              <div className="h-4 bg-card rounded w-2/3 mb-1" />
              <div className="h-3 bg-card rounded w-1/3" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (hashtags.length === 0) {
    return null
  }

  return (
    <div className="bg-card rounded-xl border border-ink p-4">
      <div className="flex items-center gap-2 mb-4">
        <Hash className="w-5 h-5 text-teal" />
        <h3 className="font-semibold text-ink">Tendances</h3>
      </div>

      <div className="space-y-3">
        {hashtags.map((hashtag, idx) => (
          <a
            key={hashtag.hashtag_id}
            href={`/feed?hashtag=${hashtag.tag}`}
            className="block hover:bg-card rounded-lg p-2 -mx-2 transition-colors"
          >
            <div className="flex items-start gap-3">
              <span className="text-mute text-sm font-medium">{idx + 1}</span>
              <div className="flex-1">
                <p className="text-ink font-medium">#{hashtag.tag}</p>
                <p className="text-xs text-mute">
                  {hashtag.posts_count} post{hashtag.posts_count > 1 ? "s" : ""}
                </p>
              </div>
              {idx < 3 && (
                <span className="text-coral text-xs flex items-center gap-1">
                  <span className="w-1.5 h-1.5 bg-coral rounded-full animate-pulse" />
                  Hot
                </span>
              )}
            </div>
          </a>
        ))}
      </div>

      <a
        href="/explore/hashtags"
        className="block mt-4 text-center text-sm text-teal hover:underline"
      >
        Voir plus
      </a>
    </div>
  )
}
