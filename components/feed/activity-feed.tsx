"use client"

/**
 * ACTIVITY FEED COMPONENTS
 * ========================
 * Fil d'actualités des amis et cercles
 */

import { useState, useEffect, useCallback, useRef } from "react"
import Image from "next/image"
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
    achievement: <Trophy className="w-4 h-4 text-gold" />,
    level_up: <Star className="w-4 h-4 text-pink" />,
    challenge_complete: <Target className="w-4 h-4 text-lime" />,
    creation: <Palette className="w-4 h-4 text-pink" />,
    record: <Medal className="w-4 h-4 text-coral" />,
    streak: <Flame className="w-4 h-4 text-destructive" />,
    club_join: <Users className="w-4 h-4 text-teal" />,
    circle_create: <Sparkles className="w-4 h-4 text-teal" />,
    friendship: <Heart className="w-4 h-4 text-pink" />,
    milestone: <Award className="w-4 h-4 text-gold" />,
    photo: <ImageIcon className="w-4 h-4 text-teal" />,
    video: <Video className="w-4 h-4 text-pink" />,
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

  const dimension = size === 'sm' ? 32 : size === 'md' ? 40 : 48

  return (
    <div className="relative">
      {src ? (
        <div className={`relative ${sizes[size]} rounded-full overflow-hidden border-2 border-ink`}>
          <Image
            src={src}
            alt={name}
            fill
            sizes={`${dimension}px`}
            className="object-cover"
            unoptimized
          />
        </div>
      ) : (
        <div
          className={`${sizes[size]} rounded-full bg-gradient-to-br from-teal to-teal
            flex items-center justify-center font-bold text-ink border-2 border-ink`}
        >
          {name.charAt(0).toUpperCase()}
        </div>
      )}
      {level && (
        <div
          className="absolute -bottom-1 -right-1 bg-card rounded-full px-1.5 py-0.5
          text-[10px] font-bold text-teal border border-ink"
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
      className="bg-card rounded-xl border border-ink overflow-hidden"
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
            <span className="font-semibold text-ink">{post.author_display_name}</span>
            <span className="text-mute">@{post.author_username}</span>
            {typeIcon && (
              <span className="flex items-center gap-1 text-sm text-mute">
                {typeIcon}
                {typeLabel}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 text-xs text-mute">
            <Clock className="w-3 h-3" />
            <span>{timeAgo(post.created_at)}</span>
            {post.circle_name && (
              <>
                <span>•</span>
                <span className="text-teal">🔵 {post.circle_name}</span>
              </>
            )}
          </div>
        </div>

        {/* Menu */}
        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="p-2 hover:bg-card rounded-full transition-colors"
          >
            <MoreHorizontal className="w-5 h-5 text-mute" />
          </button>

          <AnimatePresence>
            {showMenu && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="absolute right-0 top-full mt-1 w-48 bg-card rounded-lg border border-ink
                  shadow-xl z-20 py-1 overflow-hidden"
              >
                <button
                  onClick={() => {
                    onBookmark(post.post_id, post.is_bookmarked)
                    setShowMenu(false)
                  }}
                  className="w-full px-4 py-2 flex items-center gap-3 hover:bg-muted text-left"
                >
                  {post.is_bookmarked ? (
                    <BookmarkCheck className="w-4 h-4 text-teal" />
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
                  className="w-full px-4 py-2 flex items-center gap-3 hover:bg-muted text-left"
                >
                  <EyeOff className="w-4 h-4" />
                  <span>Masquer</span>
                </button>
                <button
                  onClick={() => {
                    onMute(post.author_id)
                    setShowMenu(false)
                  }}
                  className="w-full px-4 py-2 flex items-center gap-3 hover:bg-muted text-left"
                >
                  <VolumeX className="w-4 h-4" />
                  <span>Masquer {post.author_display_name}</span>
                </button>
                <div className="border-t border-ink my-1" />
                <button
                  onClick={() => setShowMenu(false)}
                  className="w-full px-4 py-2 flex items-center gap-3 hover:bg-muted text-left text-destructive"
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
                    className="w-full px-4 py-2 flex items-center gap-3 hover:bg-muted text-left text-destructive"
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
          <p className="text-ink whitespace-pre-wrap">{post.content}</p>
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
            <div key={idx} className="relative aspect-square bg-card">
              <Image
                src={url}
                alt=""
                fill
                sizes="(max-width: 768px) 50vw, 25vw"
                className="object-cover"
                unoptimized
              />
              {idx === 3 && post.media_urls.length > 4 && (
                <div className="absolute inset-0 bg-ink/60 flex items-center justify-center">
                  <span className="text-2xl font-bold text-ink">
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
        <div className="mx-4 mb-3 p-3 bg-gradient-to-r from-gold/10 to-coral/10
          rounded-lg border border-gold/20">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gold/20 rounded-full flex items-center justify-center">
              <Trophy className="w-6 h-6 text-gold" />
            </div>
            <div>
              <p className="font-semibold text-gold">
                {(post.metadata as { badge_name?: string }).badge_name || "Badge débloqué"}
              </p>
              <p className="text-sm text-mute">
                +{(post.metadata as { xp?: number }).xp || 100} XP
              </p>
            </div>
          </div>
        </div>
      )}

      {post.post_type === "level_up" && post.metadata && (
        <div className="mx-4 mb-3 p-3 bg-gradient-to-r from-pink/10 to-pink/10
          rounded-lg border border-pink/20">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-pink/20 rounded-full flex items-center justify-center">
              <Zap className="w-6 h-6 text-pink" />
            </div>
            <div>
              <p className="font-semibold text-pink">
                Niveau {(post.metadata as { new_level?: number }).new_level || "?"}
              </p>
              <p className="text-sm text-mute">Félicitations !</p>
            </div>
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="px-4 py-2 flex items-center gap-4 text-sm text-mute border-t border-ink">
        {post.likes_count > 0 && (
          <span className="flex items-center gap-1">
            <Heart className="w-4 h-4 text-destructive fill-current" />
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
      <div className="px-2 py-1 flex items-center border-t border-ink">
        {/* Like button with reactions */}
        <div className="relative flex-1">
          <button
            onClick={() => onLike(post.post_id)}
            onMouseEnter={() => setShowReactions(true)}
            onMouseLeave={() => setShowReactions(false)}
            className={`w-full py-2 flex items-center justify-center gap-2 rounded-lg
              hover:bg-card transition-colors ${
                post.user_reaction ? "text-destructive" : "text-mute"
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
                  bg-card rounded-full border border-ink shadow-xl flex gap-1"
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
          className="flex-1 py-2 flex items-center justify-center gap-2 text-mute
            rounded-lg hover:bg-card transition-colors"
        >
          <MessageCircle className="w-5 h-5" />
          <span className="hidden sm:inline">Commenter</span>
        </button>

        {/* Share button */}
        <button
          onClick={() => onShare(post.post_id)}
          className="flex-1 py-2 flex items-center justify-center gap-2 text-mute
            rounded-lg hover:bg-card transition-colors"
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
            className="border-t border-ink overflow-hidden"
          >
            <div className="p-4 space-y-4">
              {/* Comment input */}
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-teal to-teal
                  flex items-center justify-center text-ink text-sm font-bold flex-shrink-0">
                  M
                </div>
                <div className="flex-1 flex gap-2">
                  <input
                    type="text"
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSubmitComment()}
                    placeholder="Écrire un commentaire..."
                    className="flex-1 bg-card rounded-full px-4 py-2 text-sm text-ink
                      placeholder:text-mute border border-ink focus:border-teal
                      focus:outline-none"
                  />
                  <button
                    onClick={handleSubmitComment}
                    disabled={!newComment.trim()}
                    className="p-2 bg-teal rounded-full text-ink disabled:opacity-50
                      disabled:cursor-not-allowed hover:bg-teal transition-colors"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Comments list */}
              {loadingComments ? (
                <div className="flex justify-center py-4">
                  <div className="w-6 h-6 border-2 border-teal border-t-transparent rounded-full animate-spin" />
                </div>
              ) : comments.length > 0 ? (
                <div className="space-y-3">
                  {comments.map((comment) => (
                    <CommentItem key={comment.comment_id} comment={comment} />
                  ))}
                </div>
              ) : (
                <p className="text-center text-mute py-4">
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
        <div className="bg-card rounded-2xl px-3 py-2">
          <p className="font-semibold text-sm text-ink">{comment.author_display_name}</p>
          <p className="text-sm text-ink-2">{comment.content}</p>
        </div>
        <div className="flex items-center gap-3 mt-1 px-2 text-xs text-mute">
          <span>{timeAgo(comment.created_at)}</span>
          <button
            onClick={handleLike}
            className={`font-semibold hover:underline ${liked ? "text-destructive" : ""}`}
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
        <h1 className="text-2xl font-bold text-ink">Fil d'actualités</h1>
        <button className="p-2 bg-card rounded-lg hover:bg-muted transition-colors">
          <TrendingUp className="w-5 h-5 text-teal" />
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
                ? "bg-teal text-ink"
                : "bg-card text-mute hover:bg-muted"
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
            <div key={i} className="bg-card rounded-xl border border-ink p-4 animate-pulse">
              <div className="flex gap-3">
                <div className="w-10 h-10 bg-card rounded-full" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-card rounded w-1/3" />
                  <div className="h-3 bg-card rounded w-1/4" />
                </div>
              </div>
              <div className="mt-4 h-20 bg-card rounded" />
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
              <div className="w-6 h-6 border-2 border-teal border-t-transparent rounded-full animate-spin" />
            </div>
          )}
        </div>
      ) : (
        <div className="text-center py-12">
          <Sparkles className="w-12 h-12 text-mute mx-auto mb-4" />
          <p className="text-mute">Aucune activité pour le moment</p>
          <p className="text-sm text-mute mt-1">
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
    <div className="bg-card rounded-xl border border-ink p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-ink flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-teal" />
          Activité récente
        </h3>
        <a href="/feed" className="text-sm text-teal hover:underline">
          Voir tout
        </a>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex gap-3 animate-pulse">
              <div className="w-8 h-8 bg-card rounded-full flex-shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-3 bg-card rounded w-3/4" />
                <div className="h-3 bg-card rounded w-1/2" />
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
                <p className="text-sm text-ink">
                  <span className="font-semibold">{post.author_display_name}</span>
                  {getPostTypeLabel(post.post_type) && (
                    <span className="text-mute"> {getPostTypeLabel(post.post_type)}</span>
                  )}
                </p>
                {post.content && (
                  <p className="text-xs text-mute truncate">{post.content}</p>
                )}
              </div>
              {getPostTypeIcon(post.post_type)}
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-mute text-center py-4">Aucune activité récente</p>
      )}
    </div>
  )
}
