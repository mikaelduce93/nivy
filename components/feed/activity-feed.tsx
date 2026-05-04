"use client"

/**
 * ACTIVITY FEED COMPONENTS
 * ========================
 * Fil d'actualités des amis et cercles
 */

import { useState, useEffect, useCallback, useRef } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  Heart,
  MessageCircle,
  Share2,
  Bookmark,
  BookmarkCheck,
  MoreHorizontal,
  Image as ImageIcon,
  Video,
  Trophy,
  Star,
  Flame,
  Target,
  Users,
  Palette,
  TrendingUp,
  Clock,
  Send,
  X,
  ChevronDown,
  ChevronUp,
  Flag,
  EyeOff,
  VolumeX,
  Trash2,
  Edit3,
  AtSign,
  Hash,
  Sparkles,
  Zap,
  Award,
  Medal,
} from "lucide-react"

// Types
interface Author {
  id: string
  username: string
  display_name: string
  avatar_url: string | null
  level: number
}

interface FeedPost {
  post_id: string
  post_type: string
  content: string | null
  media_urls: string[]
  metadata: Record<string, unknown>
  visibility: string
  likes_count: number
  comments_count: number
  shares_count: number
  is_pinned: boolean
  created_at: string
  author_id: string
  author_username: string
  author_display_name: string
  author_avatar_url: string | null
  author_level: number
  user_reaction: string | null
  is_bookmarked: boolean
  circle_id: string | null
  circle_name: string | null
}

interface Comment {
  comment_id: string
  content: string
  media_url: string | null
  likes_count: number
  replies_count: number
  is_edited: boolean
  created_at: string
  parent_id: string | null
  author_id: string
  author_username: string
  author_display_name: string
  author_avatar_url: string | null
  user_liked: boolean
}

// Icône selon le type de post
const getPostTypeIcon = (type: string) => {
  const icons: Record<string, React.ReactNode> = {
    status: null,
    achievement: <Trophy className="w-4 h-4 text-yellow-400" />,
    level_up: <Star className="w-4 h-4 text-purple-400" />,
    challenge_complete: <Target className="w-4 h-4 text-green-400" />,
    creation: <Palette className="w-4 h-4 text-pink-400" />,
    record: <Medal className="w-4 h-4 text-orange-400" />,
    streak: <Flame className="w-4 h-4 text-red-400" />,
    club_join: <Users className="w-4 h-4 text-blue-400" />,
    circle_create: <Sparkles className="w-4 h-4 text-cyan-400" />,
    friendship: <Heart className="w-4 h-4 text-pink-400" />,
    milestone: <Award className="w-4 h-4 text-yellow-400" />,
    photo: <ImageIcon className="w-4 h-4 text-blue-400" />,
    video: <Video className="w-4 h-4 text-purple-400" />,
  }
  return icons[type] || null
}

// Label du type de post
const getPostTypeLabel = (type: string) => {
  const labels: Record<string, string> = {
    status: "",
    achievement: "a débloqué un badge",
    level_up: "est monté de niveau",
    challenge_complete: "a terminé un défi",
    creation: "a partagé une création",
    record: "a battu un record",
    streak: "a atteint une série",
    club_join: "a rejoint un club",
    circle_create: "a créé un cercle",
    friendship: "a un nouvel ami",
    milestone: "a atteint un objectif",
    photo: "a partagé une photo",
    video: "a partagé une vidéo",
  }
  return labels[type] || ""
}

// Réactions disponibles
const REACTIONS = [
  { type: "like", emoji: "❤️", label: "J'aime" },
  { type: "love", emoji: "😍", label: "J'adore" },
  { type: "haha", emoji: "😂", label: "Haha" },
  { type: "wow", emoji: "😮", label: "Wow" },
  { type: "fire", emoji: "🔥", label: "En feu" },
  { type: "clap", emoji: "👏", label: "Bravo" },
]

// Composant Avatar
function Avatar({
  src,
  name,
  size = "md",
  level,
}: {
  src: string | null
  name: string
  size?: "sm" | "md" | "lg"
  level?: number
}) {
  const sizes = {
    sm: "w-8 h-8 text-xs",
    md: "w-10 h-10 text-sm",
    lg: "w-12 h-12 text-base",
  }

  return (
    <div className="relative">
      {src ? (
        <img
          src={src}
          alt={name}
          className={`${sizes[size]} rounded-full object-cover border-2 border-zinc-700`}
        />
      ) : (
        <div
          className={`${sizes[size]} rounded-full bg-gradient-to-br from-cyan-500 to-blue-600
            flex items-center justify-center font-bold text-white border-2 border-zinc-700`}
        >
          {name.charAt(0).toUpperCase()}
        </div>
      )}
      {level && (
        <div
          className="absolute -bottom-1 -right-1 bg-zinc-800 rounded-full px-1.5 py-0.5
          text-[10px] font-bold text-cyan-400 border border-zinc-700"
        >
          {level}
        </div>
      )}
    </div>
  )
}

// Composant Post Card
function PostCard({
  post,
  onLike,
  onComment,
  onShare,
  onBookmark,
  onHide,
  onMute,
  onDelete,
}: {
  post: FeedPost
  onLike: (postId: string, reaction?: string) => void
  onComment: (postId: string) => void
  onShare: (postId: string) => void
  onBookmark: (postId: string, isBookmarked: boolean) => void
  onHide: (postId: string) => void
  onMute: (userId: string) => void
  onDelete?: (postId: string) => void
}) {
  const [showReactions, setShowReactions] = useState(false)
  const [showMenu, setShowMenu] = useState(false)
  const [showComments, setShowComments] = useState(false)
  const [comments, setComments] = useState<Comment[]>([])
  const [newComment, setNewComment] = useState("")
  const [loadingComments, setLoadingComments] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  const timeAgo = (date: string) => {
    const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000)
    if (seconds < 60) return "à l'instant"
    const minutes = Math.floor(seconds / 60)
    if (minutes < 60) return `${minutes}min`
    const hours = Math.floor(minutes / 60)
    if (hours < 24) return `${hours}h`
    const days = Math.floor(hours / 24)
    if (days < 7) return `${days}j`
    return new Date(date).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })
  }

  const loadComments = async () => {
    if (loadingComments) return
    setLoadingComments(true)
    try {
      const res = await fetch(`/api/teen/feed/comments?post_id=${post.post_id}`)
      const data = await res.json()
      if (data.comments) {
        setComments(data.comments)
      }
    } catch (err) {
      console.error("Error loading comments:", err)
    } finally {
      setLoadingComments(false)
    }
  }

  const handleToggleComments = () => {
    if (!showComments && comments.length === 0) {
      loadComments()
    }
    setShowComments(!showComments)
  }

  const handleSubmitComment = async () => {
    if (!newComment.trim()) return

    try {
      const res = await fetch("/api/teen/feed/comments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create",
          post_id: post.post_id,
          content: newComment,
        }),
      })

      const data = await res.json()
      if (data.comment) {
        setComments([...comments, data.comment])
        setNewComment("")
      }
    } catch (err) {
      console.error("Error posting comment:", err)
    }
  }

  const typeIcon = getPostTypeIcon(post.post_type)
  const typeLabel = getPostTypeLabel(post.post_type)
  const currentReaction = REACTIONS.find((r) => r.type === post.user_reaction)

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-zinc-900/50 rounded-xl border border-zinc-800 overflow-hidden"
    >
      {/* Header */}
      <div className="p-4 flex items-start gap-3">
        <Avatar
          src={post.author_avatar_url}
          name={post.author_display_name}
          level={post.author_level}
        />

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-white">{post.author_display_name}</span>
            <span className="text-zinc-500">@{post.author_username}</span>
            {typeIcon && (
              <span className="flex items-center gap-1 text-sm text-zinc-400">
                {typeIcon}
                {typeLabel}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 text-xs text-zinc-500">
            <Clock className="w-3 h-3" />
            <span>{timeAgo(post.created_at)}</span>
            {post.circle_name && (
              <>
                <span>•</span>
                <span className="text-cyan-400">🔵 {post.circle_name}</span>
              </>
            )}
          </div>
        </div>

        {/* Menu */}
        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="p-2 hover:bg-zinc-800 rounded-full transition-colors"
          >
            <MoreHorizontal className="w-5 h-5 text-zinc-400" />
          </button>

          <AnimatePresence>
            {showMenu && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="absolute right-0 top-full mt-1 w-48 bg-zinc-800 rounded-lg border border-zinc-700
                  shadow-xl z-20 py-1 overflow-hidden"
              >
                <button
                  onClick={() => {
                    onBookmark(post.post_id, post.is_bookmarked)
                    setShowMenu(false)
                  }}
                  className="w-full px-4 py-2 flex items-center gap-3 hover:bg-zinc-700 text-left"
                >
                  {post.is_bookmarked ? (
                    <BookmarkCheck className="w-4 h-4 text-cyan-400" />
                  ) : (
                    <Bookmark className="w-4 h-4" />
                  )}
                  <span>{post.is_bookmarked ? "Retirer" : "Enregistrer"}</span>
                </button>
                <button
                  onClick={() => {
                    onHide(post.post_id)
                    setShowMenu(false)
                  }}
                  className="w-full px-4 py-2 flex items-center gap-3 hover:bg-zinc-700 text-left"
                >
                  <EyeOff className="w-4 h-4" />
                  <span>Masquer</span>
                </button>
                <button
                  onClick={() => {
                    onMute(post.author_id)
                    setShowMenu(false)
                  }}
                  className="w-full px-4 py-2 flex items-center gap-3 hover:bg-zinc-700 text-left"
                >
                  <VolumeX className="w-4 h-4" />
                  <span>Masquer {post.author_display_name}</span>
                </button>
                <div className="border-t border-zinc-700 my-1" />
                <button
                  onClick={() => setShowMenu(false)}
                  className="w-full px-4 py-2 flex items-center gap-3 hover:bg-zinc-700 text-left text-red-400"
                >
                  <Flag className="w-4 h-4" />
                  <span>Signaler</span>
                </button>
                {onDelete && (
                  <button
                    onClick={() => {
                      onDelete(post.post_id)
                      setShowMenu(false)
                    }}
                    className="w-full px-4 py-2 flex items-center gap-3 hover:bg-zinc-700 text-left text-red-400"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>Supprimer</span>
                  </button>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Content */}
      {post.content && (
        <div className="px-4 pb-3">
          <p className="text-white whitespace-pre-wrap">{post.content}</p>
        </div>
      )}

      {/* Media */}
      {post.media_urls && post.media_urls.length > 0 && (
        <div
          className={`grid gap-1 ${
            post.media_urls.length === 1
              ? "grid-cols-1"
              : post.media_urls.length === 2
              ? "grid-cols-2"
              : "grid-cols-2"
          }`}
        >
          {post.media_urls.slice(0, 4).map((url, idx) => (
            <div key={idx} className="relative aspect-square bg-zinc-800">
              <img src={url} alt="" className="w-full h-full object-cover" />
              {idx === 3 && post.media_urls.length > 4 && (
                <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                  <span className="text-2xl font-bold text-white">
                    +{post.media_urls.length - 4}
                  </span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Achievement/Special Card */}
      {post.post_type === "achievement" && post.metadata && (
        <div className="mx-4 mb-3 p-3 bg-gradient-to-r from-yellow-500/10 to-orange-500/10
          rounded-lg border border-yellow-500/20">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-yellow-500/20 rounded-full flex items-center justify-center">
              <Trophy className="w-6 h-6 text-yellow-400" />
            </div>
            <div>
              <p className="font-semibold text-yellow-400">
                {(post.metadata as { badge_name?: string }).badge_name || "Badge débloqué"}
              </p>
              <p className="text-sm text-zinc-400">
                +{(post.metadata as { xp?: number }).xp || 100} XP
              </p>
            </div>
          </div>
        </div>
      )}

      {post.post_type === "level_up" && post.metadata && (
        <div className="mx-4 mb-3 p-3 bg-gradient-to-r from-purple-500/10 to-pink-500/10
          rounded-lg border border-purple-500/20">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-purple-500/20 rounded-full flex items-center justify-center">
              <Zap className="w-6 h-6 text-purple-400" />
            </div>
            <div>
              <p className="font-semibold text-purple-400">
                Niveau {(post.metadata as { new_level?: number }).new_level || "?"}
              </p>
              <p className="text-sm text-zinc-400">Félicitations !</p>
            </div>
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="px-4 py-2 flex items-center gap-4 text-sm text-zinc-500 border-t border-zinc-800/50">
        {post.likes_count > 0 && (
          <span className="flex items-center gap-1">
            <Heart className="w-4 h-4 text-red-400 fill-current" />
            {post.likes_count}
          </span>
        )}
        {post.comments_count > 0 && (
          <span>{post.comments_count} commentaire{post.comments_count > 1 ? "s" : ""}</span>
        )}
        {post.shares_count > 0 && (
          <span>{post.shares_count} partage{post.shares_count > 1 ? "s" : ""}</span>
        )}
      </div>

      {/* Actions */}
      <div className="px-2 py-1 flex items-center border-t border-zinc-800">
        {/* Like button with reactions */}
        <div className="relative flex-1">
          <button
            onClick={() => onLike(post.post_id)}
            onMouseEnter={() => setShowReactions(true)}
            onMouseLeave={() => setShowReactions(false)}
            className={`w-full py-2 flex items-center justify-center gap-2 rounded-lg
              hover:bg-zinc-800 transition-colors ${
                post.user_reaction ? "text-red-400" : "text-zinc-400"
              }`}
          >
            {currentReaction ? (
              <span className="text-lg">{currentReaction.emoji}</span>
            ) : (
              <Heart className={`w-5 h-5 ${post.user_reaction ? "fill-current" : ""}`} />
            )}
            <span className="hidden sm:inline">
              {currentReaction ? currentReaction.label : "J'aime"}
            </span>
          </button>

          {/* Reactions popup */}
          <AnimatePresence>
            {showReactions && (
              <motion.div
                initial={{ opacity: 0, y: 10, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.9 }}
                onMouseEnter={() => setShowReactions(true)}
                onMouseLeave={() => setShowReactions(false)}
                className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1
                  bg-zinc-800 rounded-full border border-zinc-700 shadow-xl flex gap-1"
              >
                {REACTIONS.map((reaction) => (
                  <button
                    key={reaction.type}
                    onClick={() => {
                      onLike(post.post_id, reaction.type)
                      setShowReactions(false)
                    }}
                    className="p-1.5 text-xl hover:scale-125 transition-transform"
                    title={reaction.label}
                  >
                    {reaction.emoji}
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Comment button */}
        <button
          onClick={handleToggleComments}
          className="flex-1 py-2 flex items-center justify-center gap-2 text-zinc-400
            rounded-lg hover:bg-zinc-800 transition-colors"
        >
          <MessageCircle className="w-5 h-5" />
          <span className="hidden sm:inline">Commenter</span>
        </button>

        {/* Share button */}
        <button
          onClick={() => onShare(post.post_id)}
          className="flex-1 py-2 flex items-center justify-center gap-2 text-zinc-400
            rounded-lg hover:bg-zinc-800 transition-colors"
        >
          <Share2 className="w-5 h-5" />
          <span className="hidden sm:inline">Partager</span>
        </button>
      </div>

      {/* Comments section */}
      <AnimatePresence>
        {showComments && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="border-t border-zinc-800 overflow-hidden"
          >
            <div className="p-4 space-y-4">
              {/* Comment input */}
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600
                  flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                  M
                </div>
                <div className="flex-1 flex gap-2">
                  <input
                    type="text"
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSubmitComment()}
                    placeholder="Écrire un commentaire..."
                    className="flex-1 bg-zinc-800 rounded-full px-4 py-2 text-sm text-white
                      placeholder:text-zinc-500 border border-zinc-700 focus:border-cyan-500
                      focus:outline-none"
                  />
                  <button
                    onClick={handleSubmitComment}
                    disabled={!newComment.trim()}
                    className="p-2 bg-cyan-500 rounded-full text-white disabled:opacity-50
                      disabled:cursor-not-allowed hover:bg-cyan-600 transition-colors"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Comments list */}
              {loadingComments ? (
                <div className="flex justify-center py-4">
                  <div className="w-6 h-6 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
                </div>
              ) : comments.length > 0 ? (
                <div className="space-y-3">
                  {comments.map((comment) => (
                    <CommentItem key={comment.comment_id} comment={comment} />
                  ))}
                </div>
              ) : (
                <p className="text-center text-zinc-500 py-4">
                  Aucun commentaire. Soyez le premier !
                </p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

// Composant Comment
function CommentItem({ comment }: { comment: Comment }) {
  const [liked, setLiked] = useState(comment.user_liked)
  const [likesCount, setLikesCount] = useState(comment.likes_count)

  const handleLike = async () => {
    try {
      await fetch("/api/teen/feed/comments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: liked ? "unlike" : "like",
          comment_id: comment.comment_id,
        }),
      })
      setLiked(!liked)
      setLikesCount(liked ? likesCount - 1 : likesCount + 1)
    } catch (err) {
      console.error("Error toggling like:", err)
    }
  }

  const timeAgo = (date: string) => {
    const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000)
    if (seconds < 60) return "à l'instant"
    const minutes = Math.floor(seconds / 60)
    if (minutes < 60) return `${minutes}min`
    const hours = Math.floor(minutes / 60)
    if (hours < 24) return `${hours}h`
    return `${Math.floor(hours / 24)}j`
  }

  return (
    <div className="flex gap-3">
      <Avatar src={comment.author_avatar_url} name={comment.author_display_name} size="sm" />
      <div className="flex-1">
        <div className="bg-zinc-800 rounded-2xl px-3 py-2">
          <p className="font-semibold text-sm text-white">{comment.author_display_name}</p>
          <p className="text-sm text-zinc-300">{comment.content}</p>
        </div>
        <div className="flex items-center gap-3 mt-1 px-2 text-xs text-zinc-500">
          <span>{timeAgo(comment.created_at)}</span>
          <button
            onClick={handleLike}
            className={`font-semibold hover:underline ${liked ? "text-red-400" : ""}`}
          >
            {liked ? "Aimé" : "J'aime"} {likesCount > 0 && `(${likesCount})`}
          </button>
          <button className="font-semibold hover:underline">Répondre</button>
          {comment.is_edited && <span>(modifié)</span>}
        </div>
      </div>
    </div>
  )
}

// Composant principal Activity Feed
export function ActivityFeed() {
  const [posts, setPosts] = useState<FeedPost[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState("all")
  const [hasMore, setHasMore] = useState(true)
  const [offset, setOffset] = useState(0)
  const observerRef = useRef<IntersectionObserver | null>(null)
  const loadMoreRef = useRef<HTMLDivElement>(null)

  const filters = [
    { key: "all", label: "Tout", icon: Sparkles },
    { key: "friends", label: "Amis", icon: Users },
    { key: "achievements", label: "Succès", icon: Trophy },
    { key: "challenges", label: "Défis", icon: Target },
    { key: "creations", label: "Créations", icon: Palette },
    { key: "circles", label: "Cercles", icon: Users },
  ]

  const loadPosts = useCallback(
    async (reset = false) => {
      try {
        const currentOffset = reset ? 0 : offset
        const res = await fetch(
          `/api/teen/feed?type=feed&filter=${filter}&limit=10&offset=${currentOffset}`
        )
        const data = await res.json()

        if (data.posts) {
          setPosts((prev) => (reset ? data.posts : [...prev, ...data.posts]))
          setHasMore(data.has_more)
          setOffset(currentOffset + data.posts.length)
        }
      } catch (err) {
        console.error("Error loading feed:", err)
      } finally {
        setLoading(false)
      }
    },
    [filter, offset]
  )

  useEffect(() => {
    setLoading(true)
    setOffset(0)
    loadPosts(true)
  }, [filter])

  // Infinite scroll
  useEffect(() => {
    if (loadMoreRef.current && hasMore && !loading) {
      observerRef.current = new IntersectionObserver(
        (entries) => {
          if (entries[0].isIntersecting) {
            loadPosts()
          }
        },
        { threshold: 0.5 }
      )
      observerRef.current.observe(loadMoreRef.current)
    }

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect()
      }
    }
  }, [hasMore, loading, loadPosts])

  const handleLike = async (postId: string, reaction = "like") => {
    try {
      await fetch("/api/teen/feed", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "like", post_id: postId, reaction_type: reaction }),
      })

      setPosts((prev) =>
        prev.map((p) =>
          p.post_id === postId
            ? {
                ...p,
                user_reaction: p.user_reaction === reaction ? null : reaction,
                likes_count: p.user_reaction ? p.likes_count - 1 : p.likes_count + 1,
              }
            : p
        )
      )
    } catch (err) {
      console.error("Error liking post:", err)
    }
  }

  const handleBookmark = async (postId: string, isBookmarked: boolean) => {
    try {
      await fetch("/api/teen/feed", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: isBookmarked ? "unbookmark" : "bookmark",
          post_id: postId,
        }),
      })

      setPosts((prev) =>
        prev.map((p) => (p.post_id === postId ? { ...p, is_bookmarked: !isBookmarked } : p))
      )
    } catch (err) {
      console.error("Error bookmarking:", err)
    }
  }

  const handleHide = async (postId: string) => {
    try {
      await fetch("/api/teen/feed", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "hide", post_id: postId }),
      })

      setPosts((prev) => prev.filter((p) => p.post_id !== postId))
    } catch (err) {
      console.error("Error hiding post:", err)
    }
  }

  const handleMute = async (userId: string) => {
    try {
      await fetch("/api/teen/feed", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "mute_user", target_user_id: userId }),
      })

      setPosts((prev) => prev.filter((p) => p.author_id !== userId))
    } catch (err) {
      console.error("Error muting user:", err)
    }
  }

  return (
    <div className="max-w-2xl mx-auto p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">Fil d'actualités</h1>
        <button className="p-2 bg-zinc-800 rounded-lg hover:bg-zinc-700 transition-colors">
          <TrendingUp className="w-5 h-5 text-cyan-400" />
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
        {filters.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-full whitespace-nowrap transition-all ${
              filter === f.key
                ? "bg-cyan-500 text-white"
                : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
            }`}
          >
            <f.icon className="w-4 h-4" />
            <span className="text-sm font-medium">{f.label}</span>
          </button>
        ))}
      </div>

      {/* Posts */}
      {loading && posts.length === 0 ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-zinc-900/50 rounded-xl border border-zinc-800 p-4 animate-pulse">
              <div className="flex gap-3">
                <div className="w-10 h-10 bg-zinc-800 rounded-full" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-zinc-800 rounded w-1/3" />
                  <div className="h-3 bg-zinc-800 rounded w-1/4" />
                </div>
              </div>
              <div className="mt-4 h-20 bg-zinc-800 rounded" />
            </div>
          ))}
        </div>
      ) : posts.length > 0 ? (
        <div className="space-y-4">
          {posts.map((post) => (
            <PostCard
              key={post.post_id}
              post={post}
              onLike={handleLike}
              onComment={() => {}}
              onShare={() => {}}
              onBookmark={handleBookmark}
              onHide={handleHide}
              onMute={handleMute}
            />
          ))}

          {/* Load more trigger */}
          {hasMore && (
            <div ref={loadMoreRef} className="flex justify-center py-4">
              <div className="w-6 h-6 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
            </div>
          )}
        </div>
      ) : (
        <div className="text-center py-12">
          <Sparkles className="w-12 h-12 text-zinc-600 mx-auto mb-4" />
          <p className="text-zinc-400">Aucune activité pour le moment</p>
          <p className="text-sm text-zinc-500 mt-1">
            Ajoutez des amis pour voir leur activité !
          </p>
        </div>
      )}
    </div>
  )
}

// Widget compact pour dashboard
export function FeedWidget() {
  const [posts, setPosts] = useState<FeedPost[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadPosts = async () => {
      try {
        const res = await fetch("/api/teen/feed?type=feed&limit=3")
        const data = await res.json()
        if (data.posts) setPosts(data.posts)
      } catch (err) {
        console.error("Error loading feed widget:", err)
      } finally {
        setLoading(false)
      }
    }
    loadPosts()
  }, [])

  return (
    <div className="bg-zinc-900/50 rounded-xl border border-zinc-800 p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-white flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-cyan-400" />
          Activité récente
        </h3>
        <a href="/feed" className="text-sm text-cyan-400 hover:underline">
          Voir tout
        </a>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex gap-3 animate-pulse">
              <div className="w-8 h-8 bg-zinc-800 rounded-full flex-shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-3 bg-zinc-800 rounded w-3/4" />
                <div className="h-3 bg-zinc-800 rounded w-1/2" />
              </div>
            </div>
          ))}
        </div>
      ) : posts.length > 0 ? (
        <div className="space-y-3">
          {posts.map((post) => (
            <div key={post.post_id} className="flex gap-3">
              <Avatar src={post.author_avatar_url} name={post.author_display_name} size="sm" />
              <div className="flex-1 min-w-0">
                <p className="text-sm text-white">
                  <span className="font-semibold">{post.author_display_name}</span>
                  {getPostTypeLabel(post.post_type) && (
                    <span className="text-zinc-400"> {getPostTypeLabel(post.post_type)}</span>
                  )}
                </p>
                {post.content && (
                  <p className="text-xs text-zinc-500 truncate">{post.content}</p>
                )}
              </div>
              {getPostTypeIcon(post.post_type)}
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-zinc-500 text-center py-4">Aucune activité récente</p>
      )}
    </div>
  )
}
