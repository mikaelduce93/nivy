"use client"

import { useState, useEffect, useRef } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  Image,
  Video,
  Music,
  FileText,
  Heart,
  MessageCircle,
  Share2,
  MoreHorizontal,
  Upload,
  X,
  Play,
  Pause,
  Trash2,
  Flag,
  Download,
  Sparkles,
  Camera,
  Plus,
  Filter,
  Grid,
  List,
  ChevronLeft,
  ChevronRight,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

/* ==========================================================================
   TYPES
   ========================================================================== */

interface Creation {
  id: string
  teen_id: string
  path_id: string
  title: string
  description?: string
  media_url: string
  media_type: "image" | "video" | "audio" | "document"
  tags?: string[]
  likes_count: number
  is_featured: boolean
  created_at: string
  passion_paths?: {
    id: string
    name: string
    category: string
    icon: string
    color: string
  }
  teens?: {
    id: string
    first_name: string
    avatar_url?: string
  }
  is_liked_by_user?: boolean
}

interface PathInfo {
  id: string
  name: string
  category: string
  icon: string
  color: string
}

/* ==========================================================================
   MEDIA TYPE ICON
   ========================================================================== */

const mediaTypeIcons = {
  image: Image,
  video: Video,
  audio: Music,
  document: FileText,
}

/* ==========================================================================
   CREATION CARD
   ========================================================================== */

interface CreationCardProps {
  creation: Creation
  isOwner: boolean
  onLike: () => void
  onUnlike: () => void
  onDelete?: () => void
  onView: () => void
}

function CreationCard({
  creation,
  isOwner,
  onLike,
  onUnlike,
  onDelete,
  onView,
}: CreationCardProps) {
  const [isLiked, setIsLiked] = useState(creation.is_liked_by_user || false)
  const [likesCount, setLikesCount] = useState(creation.likes_count)
  const [showMenu, setShowMenu] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)

  const handleLikeToggle = async () => {
    if (isLiked) {
      setIsLiked(false)
      setLikesCount((prev) => Math.max(0, prev - 1))
      onUnlike()
    } else {
      setIsLiked(true)
      setLikesCount((prev) => prev + 1)
      onLike()
    }
  }

  const MediaIcon = mediaTypeIcons[creation.media_type]

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

    if (diffDays === 0) return "Aujourd'hui"
    if (diffDays === 1) return "Hier"
    if (diffDays < 7) return `Il y a ${diffDays} jours`
    return date.toLocaleDateString("fr-FR", { day: "numeric", month: "short" })
  }

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
    >
      <Card className="overflow-hidden bg-zinc-900 border-zinc-800 hover:border-zinc-700 transition-colors">
        {/* Media preview */}
        <div
          className="relative aspect-square bg-zinc-800 cursor-pointer group"
          onClick={onView}
        >
          {creation.media_type === "image" && (
            <img
              src={creation.media_url}
              alt={creation.title}
              className="w-full h-full object-cover"
            />
          )}

          {creation.media_type === "video" && (
            <>
              <video
                ref={videoRef}
                src={creation.media_url}
                className="w-full h-full object-cover"
                loop
                muted
                playsInline
              >
                <track kind="captions" srcLang="fr" label="Francais" />
              </video>
              <div className="absolute inset-0 flex items-center justify-center bg-black/30 group-hover:bg-black/50 transition-colors">
                <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur flex items-center justify-center">
                  <Play className="w-6 h-6 text-white" />
                </div>
              </div>
            </>
          )}

          {creation.media_type === "audio" && (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-purple-500/20 to-pink-500/20">
              <div className="text-center">
                <Music className="w-16 h-16 text-purple-400 mx-auto mb-2" />
                <p className="text-sm text-zinc-400">Audio</p>
              </div>
            </div>
          )}

          {creation.media_type === "document" && (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-blue-500/20 to-cyan-500/20">
              <div className="text-center">
                <FileText className="w-16 h-16 text-blue-400 mx-auto mb-2" />
                <p className="text-sm text-zinc-400">Document</p>
              </div>
            </div>
          )}

          {/* Featured badge */}
          {creation.is_featured && (
            <div className="absolute top-2 left-2 px-2 py-1 rounded-full bg-yellow-500 text-black text-xs font-bold flex items-center gap-1">
              <Sparkles className="w-3 h-3" />
              Featured
            </div>
          )}

          {/* Media type badge */}
          <div className="absolute bottom-2 right-2 p-1.5 rounded-lg bg-black/50 backdrop-blur">
            <MediaIcon className="w-4 h-4 text-white" />
          </div>
        </div>

        {/* Content */}
        <div className="p-4">
          {/* Author info */}
          {creation.teens && (
            <div className="flex items-center gap-2 mb-2">
              <div className="w-6 h-6 rounded-full bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center">
                {creation.teens.avatar_url ? (
                  <img
                    src={creation.teens.avatar_url}
                    alt={creation.teens.first_name}
                    className="w-full h-full rounded-full object-cover"
                  />
                ) : (
                  <span className="text-xs text-white font-bold">
                    {creation.teens.first_name[0]}
                  </span>
                )}
              </div>
              <span className="text-xs text-zinc-400">{creation.teens.first_name}</span>
              <span className="text-xs text-zinc-600">•</span>
              <span className="text-xs text-zinc-600">{formatDate(creation.created_at)}</span>
            </div>
          )}

          {/* Title */}
          <h4 className="font-bold text-white line-clamp-1 mb-1">{creation.title}</h4>

          {/* Description */}
          {creation.description && (
            <p className="text-sm text-zinc-500 line-clamp-2 mb-3">{creation.description}</p>
          )}

          {/* Path badge */}
          {creation.passion_paths && (
            <div className="mb-3">
              <span className="text-xs px-2 py-1 rounded-full bg-purple-500/10 text-purple-400">
                {creation.passion_paths.name}
              </span>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  handleLikeToggle()
                }}
                className={cn(
                  "flex items-center gap-1 transition-colors",
                  isLiked ? "text-pink-500" : "text-zinc-400 hover:text-pink-500"
                )}
              >
                <Heart className={cn("w-5 h-5", isLiked && "fill-current")} />
                <span className="text-sm">{likesCount}</span>
              </button>

              <button className="flex items-center gap-1 text-zinc-400 hover:text-cyan-400 transition-colors">
                <Share2 className="w-5 h-5" />
              </button>
            </div>

            {/* More menu */}
            <div className="relative">
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  setShowMenu(!showMenu)
                }}
                className="text-zinc-400 hover:text-white transition-colors"
              >
                <MoreHorizontal className="w-5 h-5" />
              </button>

              <AnimatePresence>
                {showMenu && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="absolute right-0 bottom-8 w-40 bg-zinc-800 rounded-xl border border-zinc-700 overflow-hidden z-10"
                  >
                    <button className="w-full px-4 py-2 text-left text-sm text-zinc-300 hover:bg-zinc-700 flex items-center gap-2">
                      <Download className="w-4 h-4" />
                      Telecharger
                    </button>
                    {isOwner && onDelete && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          onDelete()
                          setShowMenu(false)
                        }}
                        className="w-full px-4 py-2 text-left text-sm text-red-400 hover:bg-zinc-700 flex items-center gap-2"
                      >
                        <Trash2 className="w-4 h-4" />
                        Supprimer
                      </button>
                    )}
                    {!isOwner && (
                      <button className="w-full px-4 py-2 text-left text-sm text-zinc-300 hover:bg-zinc-700 flex items-center gap-2">
                        <Flag className="w-4 h-4" />
                        Signaler
                      </button>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </Card>
    </motion.div>
  )
}

/* ==========================================================================
   UPLOAD MODAL
   ========================================================================== */

interface UploadModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (data: {
    pathId: string
    title: string
    description: string
    mediaUrl: string
    mediaType: string
    tags: string[]
  }) => void
  paths: PathInfo[]
}

function UploadModal({ isOpen, onClose, onSubmit, paths }: UploadModalProps) {
  const [step, setStep] = useState(1)
  const [pathId, setPathId] = useState("")
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [mediaUrl, setMediaUrl] = useState("")
  const [mediaType, setMediaType] = useState<"image" | "video" | "audio" | "document">("image")
  const [tags, setTags] = useState<string[]>([])
  const [tagInput, setTagInput] = useState("")
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Determine media type
    if (file.type.startsWith("image/")) {
      setMediaType("image")
    } else if (file.type.startsWith("video/")) {
      setMediaType("video")
    } else if (file.type.startsWith("audio/")) {
      setMediaType("audio")
    } else {
      setMediaType("document")
    }

    // Create preview
    const url = URL.createObjectURL(file)
    setPreviewUrl(url)

    // Simulate upload - in production, upload to Supabase storage
    setUploading(true)
    await new Promise((resolve) => setTimeout(resolve, 1500))
    setMediaUrl(url) // In production, this would be the uploaded URL
    setUploading(false
    )
  }

  const handleAddTag = () => {
    if (tagInput.trim() && !tags.includes(tagInput.trim())) {
      setTags([...tags, tagInput.trim()])
      setTagInput("")
    }
  }

  const handleRemoveTag = (tag: string) => {
    setTags(tags.filter((t) => t !== tag))
  }

  const handleSubmit = () => {
    if (pathId && title && mediaUrl) {
      onSubmit({
        pathId,
        title,
        description,
        mediaUrl,
        mediaType,
        tags,
      })
      // Reset form
      setStep(1)
      setPathId("")
      setTitle("")
      setDescription("")
      setMediaUrl("")
      setPreviewUrl(null)
      setTags([])
    }
  }

  const reset = () => {
    setStep(1)
    setPathId("")
    setTitle("")
    setDescription("")
    setMediaUrl("")
    setPreviewUrl(null)
    setTags([])
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/80"
        onClick={reset}
      />
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="relative bg-zinc-900 rounded-2xl p-6 max-w-lg w-full border border-zinc-800"
      >
        <button
          onClick={reset}
          className="absolute top-4 right-4 text-zinc-500 hover:text-white"
        >
          <X className="w-5 h-5" />
        </button>

        <h3 className="text-xl font-bold text-white mb-6">
          {step === 1 ? "Choisir un parcours" : step === 2 ? "Ajouter le media" : "Details"}
        </h3>

        {/* Step 1: Select path */}
        {step === 1 && (
          <div className="space-y-3 max-h-64 overflow-y-auto">
            {paths.map((path) => (
              <button
                key={path.id}
                onClick={() => {
                  setPathId(path.id)
                  setStep(2)
                }}
                className={cn(
                  "w-full p-4 rounded-xl text-left transition-all flex items-center gap-3",
                  pathId === path.id
                    ? "bg-purple-500/20 border-2 border-purple-500"
                    : "bg-zinc-800 border-2 border-transparent hover:border-zinc-700"
                )}
              >
                <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center">
                  <Camera className="w-5 h-5 text-purple-400" />
                </div>
                <div>
                  <p className="font-medium text-white">{path.name}</p>
                  <p className="text-sm text-zinc-500 capitalize">{path.category}</p>
                </div>
              </button>
            ))}

            {paths.length === 0 && (
              <div className="text-center py-8">
                <Sparkles className="w-12 h-12 text-zinc-600 mx-auto mb-4" />
                <p className="text-zinc-400">Tu dois d'abord rejoindre un parcours</p>
              </div>
            )}
          </div>
        )}

        {/* Step 2: Upload media */}
        {step === 2 && (
          <div className="space-y-4">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,video/*,audio/*,.pdf,.doc,.docx"
              onChange={handleFileSelect}
              className="hidden"
            />

            {previewUrl ? (
              <div className="relative rounded-xl overflow-hidden">
                {mediaType === "image" && (
                  <img src={previewUrl} alt="Preview" className="w-full h-48 object-cover" />
                )}
                {mediaType === "video" && (
                  <video src={previewUrl} className="w-full h-48 object-cover" controls>
                    <track kind="captions" srcLang="fr" label="Francais" />
                  </video>
                )}
                {mediaType === "audio" && (
                  <div className="w-full h-48 bg-purple-500/10 flex items-center justify-center">
                    <audio src={previewUrl} controls>
                      <track kind="captions" srcLang="fr" label="Francais" />
                    </audio>
                  </div>
                )}
                {mediaType === "document" && (
                  <div className="w-full h-48 bg-blue-500/10 flex items-center justify-center">
                    <FileText className="w-16 h-16 text-blue-400" />
                  </div>
                )}
                <button
                  onClick={() => {
                    setPreviewUrl(null)
                    setMediaUrl("")
                  }}
                  className="absolute top-2 right-2 p-2 bg-black/50 rounded-full"
                >
                  <X className="w-4 h-4 text-white" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="w-full h-48 border-2 border-dashed border-zinc-700 rounded-xl flex flex-col items-center justify-center gap-3 hover:border-purple-500/50 transition-colors"
              >
                {uploading ? (
                  <div className="animate-spin rounded-full h-8 w-8 border-2 border-purple-500 border-t-transparent" />
                ) : (
                  <>
                    <Upload className="w-12 h-12 text-zinc-400" />
                    <p className="text-sm text-zinc-500">Clique pour uploader</p>
                    <p className="text-xs text-zinc-600">Image, video, audio ou document</p>
                  </>
                )}
              </button>
            )}

            <div className="flex gap-3">
              <Button
                onClick={() => setStep(1)}
                variant="outline"
                className="flex-1 border-zinc-700"
              >
                <ChevronLeft className="w-4 h-4 mr-2" />
                Retour
              </Button>
              <Button
                onClick={() => setStep(3)}
                disabled={!mediaUrl}
                className="flex-1 bg-gradient-to-r from-purple-500 to-pink-500"
              >
                Continuer
                <ChevronRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </div>
        )}

        {/* Step 3: Details */}
        {step === 3 && (
          <div className="space-y-4">
            <div>
              <label className="text-sm text-zinc-400 mb-2 block">Titre *</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Donne un titre a ta creation"
                className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-white"
              />
            </div>

            <div>
              <label className="text-sm text-zinc-400 mb-2 block">Description</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Decris ta creation..."
                rows={3}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-white resize-none"
              />
            </div>

            <div>
              <label className="text-sm text-zinc-400 mb-2 block">Tags</label>
              <div className="flex gap-2 mb-2 flex-wrap">
                {tags.map((tag) => (
                  <span
                    key={tag}
                    className="px-3 py-1 rounded-full bg-purple-500/10 text-purple-400 text-sm flex items-center gap-1"
                  >
                    #{tag}
                    <button onClick={() => handleRemoveTag(tag)}>
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyPress={(e) => e.key === "Enter" && handleAddTag()}
                  placeholder="Ajouter un tag"
                  className="flex-1 bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-2 text-white text-sm"
                />
                <Button onClick={handleAddTag} variant="outline" className="border-zinc-700">
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
            </div>

            <div className="flex gap-3 pt-4">
              <Button
                onClick={() => setStep(2)}
                variant="outline"
                className="flex-1 border-zinc-700"
              >
                <ChevronLeft className="w-4 h-4 mr-2" />
                Retour
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={!title}
                className="flex-1 bg-gradient-to-r from-purple-500 to-pink-500"
              >
                <Upload className="w-4 h-4 mr-2" />
                Publier
              </Button>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  )
}

/* ==========================================================================
   CREATION VIEWER MODAL
   ========================================================================== */

interface CreationViewerProps {
  creation: Creation | null
  onClose: () => void
  onLike: () => void
  onUnlike: () => void
}

function CreationViewer({ creation, onClose, onLike, onUnlike }: CreationViewerProps) {
  const [isLiked, setIsLiked] = useState(creation?.is_liked_by_user || false)

  if (!creation) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/90"
        onClick={onClose}
      />
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="relative max-w-4xl w-full max-h-[90vh] overflow-hidden rounded-2xl"
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 p-2 bg-black/50 rounded-full text-white hover:bg-black/70"
        >
          <X className="w-6 h-6" />
        </button>

        {/* Media */}
        <div className="bg-black flex items-center justify-center min-h-[50vh]">
          {creation.media_type === "image" && (
            <img
              src={creation.media_url}
              alt={creation.title}
              className="max-w-full max-h-[70vh] object-contain"
            />
          )}
          {creation.media_type === "video" && (
            <video
              src={creation.media_url}
              className="max-w-full max-h-[70vh]"
              controls
              autoPlay
            >
              <track kind="captions" srcLang="fr" label="Francais" />
            </video>
          )}
          {creation.media_type === "audio" && (
            <div className="p-8">
              <Music className="w-24 h-24 text-purple-400 mx-auto mb-4" />
              <audio src={creation.media_url} controls className="w-full">
                <track kind="captions" srcLang="fr" label="Francais" />
              </audio>
            </div>
          )}
        </div>

        {/* Info */}
        <div className="bg-zinc-900 p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-xl font-bold text-white">{creation.title}</h3>
              {creation.passion_paths && (
                <span className="text-sm text-purple-400">{creation.passion_paths.name}</span>
              )}
            </div>
            <button
              onClick={() => {
                if (isLiked) {
                  setIsLiked(false)
                  onUnlike()
                } else {
                  setIsLiked(true)
                  onLike()
                }
              }}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-full transition-colors",
                isLiked ? "bg-pink-500 text-white" : "bg-zinc-800 text-zinc-400 hover:bg-pink-500/20"
              )}
            >
              <Heart className={cn("w-5 h-5", isLiked && "fill-current")} />
              {creation.likes_count}
            </button>
          </div>
          {creation.description && (
            <p className="text-zinc-400">{creation.description}</p>
          )}
        </div>
      </motion.div>
    </div>
  )
}

/* ==========================================================================
   CREATIONS GALLERY
   ========================================================================== */

interface CreationsGalleryProps {
  teenId: string
  pathId?: string
  showFeed?: boolean
}

export function CreationsGallery({ teenId, pathId, showFeed = false }: CreationsGalleryProps) {
  const [creations, setCreations] = useState<Creation[]>([])
  const [paths, setPaths] = useState<PathInfo[]>([])
  const [loading, setLoading] = useState(true)
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid")
  const [filterPath, setFilterPath] = useState(pathId || "")
  const [showUploadModal, setShowUploadModal] = useState(false)
  const [selectedCreation, setSelectedCreation] = useState<Creation | null>(null)
  const [hasMore, setHasMore] = useState(false)
  const [offset, setOffset] = useState(0)

  const fetchCreations = async (reset = false) => {
    const newOffset = reset ? 0 : offset
    setLoading(true)

    try {
      let url = `/api/teen/creativity/creations?teenId=${teenId}&limit=20&offset=${newOffset}`
      if (filterPath) url += `&pathId=${filterPath}`
      if (showFeed) url += `&feed=true`

      const response = await fetch(url)
      const data = await response.json()

      if (data.success) {
        if (reset) {
          setCreations(data.creations)
        } else {
          setCreations((prev) => [...prev, ...data.creations])
        }
        setHasMore(data.pagination.hasMore)
        setOffset(newOffset + 20)
      }
    } catch (error) {
      console.error("Error fetching creations:", error)
    } finally {
      setLoading(false)
    }
  }

  const fetchPaths = async () => {
    try {
      const response = await fetch(`/api/teen/creativity/paths?teenId=${teenId}&includeAll=false`)
      const data = await response.json()
      if (data.success) {
        setPaths(data.enrolledPaths.map((p: { path: PathInfo }) => p.path))
      }
    } catch (error) {
      console.error("Error fetching paths:", error)
    }
  }

  useEffect(() => {
    fetchCreations(true)
    fetchPaths()
  }, [teenId, filterPath, showFeed])

  const handleUpload = async (data: {
    pathId: string
    title: string
    description: string
    mediaUrl: string
    mediaType: string
    tags: string[]
  }) => {
    try {
      const response = await fetch("/api/teen/creativity/creations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          teenId,
          action: "create",
          ...data,
        }),
      })

      if (response.ok) {
        setShowUploadModal(false)
        fetchCreations(true)
      }
    } catch (error) {
      console.error("Error uploading:", error)
    }
  }

  const handleLike = async (creationId: string) => {
    await fetch("/api/teen/creativity/creations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        teenId,
        action: "like",
        creationId,
      }),
    })
  }

  const handleUnlike = async (creationId: string) => {
    await fetch("/api/teen/creativity/creations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        teenId,
        action: "unlike",
        creationId,
      }),
    })
  }

  const handleDelete = async (creationId: string) => {
    if (!confirm("Supprimer cette creation ?")) return

    try {
      const response = await fetch("/api/teen/creativity/creations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          teenId,
          action: "delete",
          creationId,
        }),
      })

      if (response.ok) {
        setCreations((prev) => prev.filter((c) => c.id !== creationId))
      }
    } catch (error) {
      console.error("Error deleting:", error)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setFilterPath("")}
            className={cn(
              "px-4 py-2 rounded-xl text-sm font-medium transition-all",
              !filterPath
                ? "bg-purple-500 text-white"
                : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
            )}
          >
            Toutes
          </button>
          {paths.map((path) => (
            <button
              key={path.id}
              onClick={() => setFilterPath(path.id)}
              className={cn(
                "px-4 py-2 rounded-xl text-sm font-medium transition-all",
                filterPath === path.id
                  ? "bg-purple-500 text-white"
                  : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
              )}
            >
              {path.name}
            </button>
          ))}
        </div>

        <div className="flex gap-2">
          <Button
            onClick={() => setViewMode(viewMode === "grid" ? "list" : "grid")}
            variant="outline"
            size="sm"
            className="border-zinc-700"
          >
            {viewMode === "grid" ? <List className="w-4 h-4" /> : <Grid className="w-4 h-4" />}
          </Button>
          <Button
            onClick={() => setShowUploadModal(true)}
            className="bg-gradient-to-r from-purple-500 to-pink-500"
          >
            <Plus className="w-4 h-4 mr-2" />
            Creer
          </Button>
        </div>
      </div>

      {/* Grid */}
      {loading && creations.length === 0 ? (
        <div className={cn(
          "gap-4",
          viewMode === "grid" ? "grid grid-cols-2 md:grid-cols-3" : "space-y-4"
        )}>
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="aspect-square bg-zinc-800 rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : (
        <>
          <div className={cn(
            "gap-4",
            viewMode === "grid" ? "grid grid-cols-2 md:grid-cols-3" : "space-y-4"
          )}>
            {creations.map((creation) => (
              <CreationCard
                key={creation.id}
                creation={creation}
                isOwner={creation.teen_id === teenId}
                onLike={() => handleLike(creation.id)}
                onUnlike={() => handleUnlike(creation.id)}
                onDelete={() => handleDelete(creation.id)}
                onView={() => setSelectedCreation(creation)}
              />
            ))}
          </div>

          {/* Load more */}
          {hasMore && (
            <div className="text-center">
              <Button
                onClick={() => fetchCreations()}
                variant="outline"
                className="border-zinc-700"
                disabled={loading}
              >
                {loading ? "Chargement..." : "Charger plus"}
              </Button>
            </div>
          )}
        </>
      )}

      {/* Empty state */}
      {!loading && creations.length === 0 && (
        <Card className="p-8 bg-zinc-900 border-zinc-800 text-center">
          <Camera className="w-12 h-12 text-zinc-600 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-white mb-2">Aucune creation</h3>
          <p className="text-zinc-400 mb-4">
            Partage tes creations avec la communaute !
          </p>
          <Button
            onClick={() => setShowUploadModal(true)}
            className="bg-gradient-to-r from-purple-500 to-pink-500"
          >
            <Plus className="w-4 h-4 mr-2" />
            Ma premiere creation
          </Button>
        </Card>
      )}

      {/* Upload modal */}
      <UploadModal
        isOpen={showUploadModal}
        onClose={() => setShowUploadModal(false)}
        onSubmit={handleUpload}
        paths={paths}
      />

      {/* Viewer modal */}
      <AnimatePresence>
        {selectedCreation && (
          <CreationViewer
            creation={selectedCreation}
            onClose={() => setSelectedCreation(null)}
            onLike={() => handleLike(selectedCreation.id)}
            onUnlike={() => handleUnlike(selectedCreation.id)}
          />
        )}
      </AnimatePresence>
    </div>
  )
}

/* ==========================================================================
   CREATIONS WIDGET
   ========================================================================== */

interface CreationsWidgetProps {
  teenId: string
  limit?: number
  onSeeAll?: () => void
}

export function CreationsWidget({ teenId, limit = 4, onSeeAll }: CreationsWidgetProps) {
  const [creations, setCreations] = useState<Creation[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchCreations = async () => {
      try {
        const response = await fetch(
          `/api/teen/creativity/creations?teenId=${teenId}&limit=${limit}`
        )
        const data = await response.json()
        if (data.success) {
          setCreations(data.creations)
        }
      } catch (error) {
        console.error("Error fetching creations:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchCreations()
  }, [teenId, limit])

  if (loading) {
    return (
      <div className="grid grid-cols-2 gap-2 animate-pulse">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="aspect-square bg-zinc-800 rounded-xl" />
        ))}
      </div>
    )
  }

  if (creations.length === 0) {
    return null
  }

  return (
    <Card className="p-4 bg-zinc-900 border-zinc-800">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-bold text-white flex items-center gap-2">
          <Camera className="w-4 h-4 text-purple-400" />
          Mes creations
        </h3>
        {onSeeAll && (
          <button
            onClick={onSeeAll}
            className="text-sm text-purple-400 hover:underline"
          >
            Voir tout
          </button>
        )}
      </div>

      <div className="grid grid-cols-2 gap-2">
        {creations.map((creation) => (
          <div
            key={creation.id}
            className="aspect-square rounded-xl overflow-hidden bg-zinc-800"
          >
            {creation.media_type === "image" && (
              <img
                src={creation.media_url}
                alt={creation.title}
                className="w-full h-full object-cover"
              />
            )}
            {creation.media_type === "video" && (
              <div className="w-full h-full flex items-center justify-center bg-purple-500/10">
                <Video className="w-8 h-8 text-purple-400" />
              </div>
            )}
            {creation.media_type === "audio" && (
              <div className="w-full h-full flex items-center justify-center bg-pink-500/10">
                <Music className="w-8 h-8 text-pink-400" />
              </div>
            )}
          </div>
        ))}
      </div>
    </Card>
  )
}
