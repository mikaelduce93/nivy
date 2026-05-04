/**
 * TEENS PARTY MOROCCO - Activity Card Components
 * ===============================================
 *
 * Composants pour l'affichage des cartes d'activité.
 */

"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  Heart,
  MessageCircle,
  Share2,
  MoreHorizontal,
  Pin,
  Eye,
  EyeOff,
  Trash2,
  Flag,
  Globe,
  Users,
  Lock,
  ChevronDown,
  ChevronUp,
  Send,
  Edit2,
  X,
} from "lucide-react"
import {
  type ActivityWithUser,
  type CommentWithUser,
  type ReactionType,
  type ActivityVisibility,
  getCategoryConfig,
  getReactionConfig,
  formatRelativeTime,
  REACTION_CONFIG,
} from "../../features/activity-feed"

/* ==========================================================================
   ACTIVITY CARD
   ========================================================================== */

interface ActivityCardProps {
  activity: ActivityWithUser
  onReact?: (activityId: string, reaction: ReactionType) => void
  onComment?: (activityId: string) => void
  onShare?: (activityId: string) => void
  onPin?: (activityId: string) => void
  onHide?: (activityId: string) => void
  onDelete?: (activityId: string) => void
  onChangeVisibility?: (activityId: string, visibility: ActivityVisibility) => void
  onUserClick?: (userId: string) => void
  isOwner?: boolean
  showComments?: boolean
  comments?: CommentWithUser[]
  onAddComment?: (activityId: string, content: string, parentId?: string) => void
}

export function ActivityCard({
  activity,
  onReact,
  onComment,
  onShare,
  onPin,
  onHide,
  onDelete,
  onChangeVisibility,
  onUserClick,
  isOwner = false,
  showComments = false,
  comments = [],
  onAddComment,
}: ActivityCardProps) {
  const [showMenu, setShowMenu] = useState(false)
  const [showReactions, setShowReactions] = useState(false)
  const [showCommentsSection, setShowCommentsSection] = useState(showComments)
  const [newComment, setNewComment] = useState("")
  const [replyingTo, setReplyingTo] = useState<string | null>(null)

  const categoryConfig = getCategoryConfig(activity.activity_type.category)
  const myReactionConfig = activity.my_reaction
    ? getReactionConfig(activity.my_reaction)
    : null

  const handleSubmitComment = () => {
    if (newComment.trim() && onAddComment) {
      onAddComment(activity.id, newComment, replyingTo || undefined)
      setNewComment("")
      setReplyingTo(null)
    }
  }

  const visibilityIcons: Record<ActivityVisibility, typeof Globe> = {
    public: Globe,
    friends: Users,
    private: Lock,
  }
  const VisibilityIcon = visibilityIcons[activity.visibility]

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`rounded-2xl border transition-colors ${
        activity.is_pinned
          ? "bg-cyan-500/5 border-cyan-500/30"
          : activity.is_highlighted
          ? `${categoryConfig.bgColor} ${categoryConfig.color.replace("text", "border")}/30`
          : "bg-zinc-900/50 border-zinc-800/50"
      }`}
    >
      {/* Header */}
      <div className="p-4 pb-0">
        <div className="flex items-start gap-3">
          {/* Avatar */}
          <button
            onClick={() => onUserClick?.(activity.user.id)}
            className="relative flex-shrink-0"
          >
            {activity.user.avatar_url ? (
              <img
                src={activity.user.avatar_url}
                alt={activity.user.username}
                className="w-10 h-10 rounded-full object-cover"
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-zinc-700 flex items-center justify-center">
                <span className="text-sm font-bold text-zinc-400">
                  {activity.user.username[0].toUpperCase()}
                </span>
              </div>
            )}
            {activity.user.vip_tier && activity.user.vip_tier !== "standard" && (
              <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-gradient-to-r from-yellow-400 to-orange-500 flex items-center justify-center">
                <span className="text-[8px]">VIP</span>
              </div>
            )}
          </button>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={() => onUserClick?.(activity.user.id)}
                className="font-semibold text-white hover:underline"
              >
                {activity.user.username}
              </button>
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] ${categoryConfig.bgColor} ${categoryConfig.color}`}
              >
                {categoryConfig.name}
              </span>
              {activity.is_pinned && (
                <Pin className="w-3 h-3 text-cyan-400" />
              )}
            </div>
            <div className="flex items-center gap-2 text-xs text-zinc-500">
              <span>{formatRelativeTime(activity.created_at || "")}</span>
              <VisibilityIcon className="w-3 h-3" />
            </div>
          </div>

          {/* Menu */}
          <div className="relative">
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="p-2 hover:bg-zinc-800 rounded-lg transition-colors"
            >
              <MoreHorizontal className="w-4 h-4 text-zinc-400" />
            </button>

            <AnimatePresence>
              {showMenu && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: -10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: -10 }}
                  className="absolute right-0 top-full mt-1 w-48 bg-zinc-800 border border-zinc-700 rounded-xl shadow-xl z-10 overflow-hidden"
                >
                  {isOwner ? (
                    <>
                      <button
                        onClick={() => {
                          onPin?.(activity.id)
                          setShowMenu(false)
                        }}
                        className="w-full flex items-center gap-3 px-4 py-3 text-sm text-zinc-300 hover:bg-zinc-700 transition-colors"
                      >
                        <Pin className="w-4 h-4" />
                        {activity.is_pinned ? "Désépingler" : "Épingler"}
                      </button>
                      <button
                        onClick={() => {
                          const newVisibility =
                            activity.visibility === "public"
                              ? "friends"
                              : activity.visibility === "friends"
                              ? "private"
                              : "public"
                          onChangeVisibility?.(activity.id, newVisibility)
                          setShowMenu(false)
                        }}
                        className="w-full flex items-center gap-3 px-4 py-3 text-sm text-zinc-300 hover:bg-zinc-700 transition-colors"
                      >
                        <Eye className="w-4 h-4" />
                        Changer visibilité
                      </button>
                      <button
                        onClick={() => {
                          onHide?.(activity.id)
                          setShowMenu(false)
                        }}
                        className="w-full flex items-center gap-3 px-4 py-3 text-sm text-zinc-300 hover:bg-zinc-700 transition-colors"
                      >
                        <EyeOff className="w-4 h-4" />
                        Cacher
                      </button>
                      <button
                        onClick={() => {
                          onDelete?.(activity.id)
                          setShowMenu(false)
                        }}
                        className="w-full flex items-center gap-3 px-4 py-3 text-sm text-red-400 hover:bg-zinc-700 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                        Supprimer
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={() => setShowMenu(false)}
                        className="w-full flex items-center gap-3 px-4 py-3 text-sm text-zinc-300 hover:bg-zinc-700 transition-colors"
                      >
                        <EyeOff className="w-4 h-4" />
                        Masquer
                      </button>
                      <button
                        onClick={() => setShowMenu(false)}
                        className="w-full flex items-center gap-3 px-4 py-3 text-sm text-red-400 hover:bg-zinc-700 transition-colors"
                      >
                        <Flag className="w-4 h-4" />
                        Signaler
                      </button>
                    </>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        <p className="text-white">{activity.title}</p>
        {activity.description && (
          <p className="text-sm text-zinc-400 mt-1">{activity.description}</p>
        )}

        {/* Image */}
        {activity.image_url && (
          <div className="mt-3 rounded-xl overflow-hidden">
            <img
              src={activity.image_url}
              alt=""
              className="w-full max-h-80 object-cover"
            />
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="px-4 pb-4">
        <div className="flex items-center justify-between pt-3 border-t border-zinc-800/50">
          {/* Reactions */}
          <div className="relative">
            <button
              onMouseEnter={() => setShowReactions(true)}
              onMouseLeave={() => setShowReactions(false)}
              onClick={() => onReact?.(activity.id, activity.my_reaction || "like")}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${
                activity.liked_by_me
                  ? myReactionConfig?.color || "text-cyan-400"
                  : "text-zinc-400 hover:text-zinc-300 hover:bg-zinc-800"
              }`}
            >
              {activity.liked_by_me && myReactionConfig ? (
                <span className="text-lg">{myReactionConfig.emoji}</span>
              ) : (
                <Heart className="w-5 h-5" />
              )}
              {activity.likes_count > 0 && (
                <span className="text-sm">{activity.likes_count}</span>
              )}
            </button>

            {/* Reaction picker */}
            <AnimatePresence>
              {showReactions && (
                <motion.div
                  initial={{ opacity: 0, y: 10, scale: 0.9 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.9 }}
                  onMouseEnter={() => setShowReactions(true)}
                  onMouseLeave={() => setShowReactions(false)}
                  className="absolute bottom-full left-0 mb-2 flex gap-1 p-2 bg-zinc-800 border border-zinc-700 rounded-xl shadow-xl"
                >
                  {(Object.keys(REACTION_CONFIG) as ReactionType[]).map(
                    (reaction) => {
                      const config = REACTION_CONFIG[reaction]
                      return (
                        <motion.button
                          key={reaction}
                          whileHover={{ scale: 1.2 }}
                          whileTap={{ scale: 0.9 }}
                          onClick={() => {
                            onReact?.(activity.id, reaction)
                            setShowReactions(false)
                          }}
                          className="p-2 rounded-lg hover:bg-zinc-700 transition-colors"
                          title={config.label}
                        >
                          <span className="text-xl">{config.emoji}</span>
                        </motion.button>
                      )
                    }
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Comments */}
          <button
            onClick={() => {
              setShowCommentsSection(!showCommentsSection)
              onComment?.(activity.id)
            }}
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-zinc-400 hover:text-zinc-300 hover:bg-zinc-800 transition-colors"
          >
            <MessageCircle className="w-5 h-5" />
            {activity.comments_count > 0 && (
              <span className="text-sm">{activity.comments_count}</span>
            )}
          </button>

          {/* Share */}
          <button
            onClick={() => onShare?.(activity.id)}
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-zinc-400 hover:text-zinc-300 hover:bg-zinc-800 transition-colors"
          >
            <Share2 className="w-5 h-5" />
            {activity.shares_count > 0 && (
              <span className="text-sm">{activity.shares_count}</span>
            )}
          </button>
        </div>

        {/* Comments section */}
        <AnimatePresence>
          {showCommentsSection && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-4 pt-4 border-t border-zinc-800/50"
            >
              {/* Comments list */}
              {comments.length > 0 && (
                <div className="space-y-3 mb-4">
                  {comments.map((comment) => (
                    <CommentItem
                      key={comment.id}
                      comment={comment}
                      onReply={(id) => setReplyingTo(id)}
                    />
                  ))}
                </div>
              )}

              {/* New comment input */}
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  onKeyPress={(e) => e.key === "Enter" && handleSubmitComment()}
                  placeholder={
                    replyingTo ? "Répondre..." : "Écrire un commentaire..."
                  }
                  className="flex-1 bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-2 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-cyan-500"
                />
                {replyingTo && (
                  <button
                    onClick={() => setReplyingTo(null)}
                    className="p-2 text-zinc-400 hover:text-white"
                  >
                    <X className="w-5 h-5" />
                  </button>
                )}
                <button
                  onClick={handleSubmitComment}
                  disabled={!newComment.trim()}
                  className="p-2 rounded-xl bg-cyan-500 text-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-cyan-600 transition-colors"
                >
                  <Send className="w-5 h-5" />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  )
}

/* ==========================================================================
   COMMENT ITEM
   ========================================================================== */

interface CommentItemProps {
  comment: CommentWithUser
  onReply?: (commentId: string) => void
  onEdit?: (commentId: string, content: string) => void
  onDelete?: (commentId: string) => void
  isOwner?: boolean
}

function CommentItem({
  comment,
  onReply,
  onEdit,
  onDelete,
  isOwner = false,
}: CommentItemProps) {
  const [showReplies, setShowReplies] = useState(false)

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        {/* Avatar */}
        {comment.user.avatar_url ? (
          <img
            src={comment.user.avatar_url}
            alt={comment.user.username}
            className="w-8 h-8 rounded-full object-cover flex-shrink-0"
          />
        ) : (
          <div className="w-8 h-8 rounded-full bg-zinc-700 flex items-center justify-center flex-shrink-0">
            <span className="text-xs font-bold text-zinc-400">
              {comment.user.username[0].toUpperCase()}
            </span>
          </div>
        )}

        {/* Content */}
        <div className="flex-1">
          <div className="bg-zinc-800 rounded-xl px-3 py-2">
            <span className="font-medium text-sm text-white">
              {comment.user.username}
            </span>
            <p className="text-sm text-zinc-300">{comment.content}</p>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3 mt-1 px-2">
            <span className="text-xs text-zinc-500">
              {formatRelativeTime(comment.created_at || "")}
            </span>
            {comment.is_edited && (
              <span className="text-xs text-zinc-600">(modifié)</span>
            )}
            <button
              onClick={() => onReply?.(comment.id)}
              className="text-xs text-zinc-400 hover:text-cyan-400"
            >
              Répondre
            </button>
            {isOwner && (
              <>
                <button
                  onClick={() => onEdit?.(comment.id, comment.content)}
                  className="text-xs text-zinc-400 hover:text-cyan-400"
                >
                  Modifier
                </button>
                <button
                  onClick={() => onDelete?.(comment.id)}
                  className="text-xs text-zinc-400 hover:text-red-400"
                >
                  Supprimer
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Replies */}
      {comment.replies && comment.replies.length > 0 && (
        <div className="pl-10">
          <button
            onClick={() => setShowReplies(!showReplies)}
            className="flex items-center gap-1 text-xs text-cyan-400 hover:underline"
          >
            {showReplies ? (
              <>
                <ChevronUp className="w-3 h-3" />
                Masquer les réponses
              </>
            ) : (
              <>
                <ChevronDown className="w-3 h-3" />
                Voir {comment.replies.length} réponse
                {comment.replies.length > 1 ? "s" : ""}
              </>
            )}
          </button>

          <AnimatePresence>
            {showReplies && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-2 space-y-2"
              >
                {comment.replies.map((reply) => (
                  <CommentItem key={reply.id} comment={reply} onReply={onReply} />
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </div>
  )
}

/* ==========================================================================
   MINI ACTIVITY CARD
   ========================================================================== */

interface MiniActivityCardProps {
  activity: ActivityWithUser
  onClick?: () => void
}

export function MiniActivityCard({ activity, onClick }: MiniActivityCardProps) {
  const categoryConfig = getCategoryConfig(activity.activity_type.category)

  return (
    <motion.button
      whileHover={{ scale: 1.02 }}
      onClick={onClick}
      className="w-full flex items-center gap-3 p-3 rounded-xl bg-zinc-800/50 border border-zinc-700/50 text-left transition-colors hover:bg-zinc-800"
    >
      {/* Avatar */}
      {activity.user.avatar_url ? (
        <img
          src={activity.user.avatar_url}
          alt={activity.user.username}
          className="w-10 h-10 rounded-full object-cover"
        />
      ) : (
        <div className="w-10 h-10 rounded-full bg-zinc-700 flex items-center justify-center">
          <span className="text-sm font-bold text-zinc-400">
            {activity.user.username[0].toUpperCase()}
          </span>
        </div>
      )}

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className="text-sm text-white truncate">{activity.title}</p>
        <p className="text-xs text-zinc-500">
          {formatRelativeTime(activity.created_at || "")}
        </p>
      </div>

      {/* Category icon */}
      <div
        className={`w-8 h-8 rounded-lg flex items-center justify-center ${categoryConfig.bgColor}`}
      >
        <span className="text-sm">{activity.activity_type.emoji}</span>
      </div>
    </motion.button>
  )
}

/* ==========================================================================
   ACTIVITY SKELETON
   ========================================================================== */

export function ActivityCardSkeleton() {
  return (
    <div className="rounded-2xl bg-zinc-900/50 border border-zinc-800/50 animate-pulse">
      <div className="p-4 pb-0">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-full bg-zinc-800" />
          <div className="flex-1 space-y-2">
            <div className="h-4 w-32 bg-zinc-800 rounded" />
            <div className="h-3 w-24 bg-zinc-800 rounded" />
          </div>
        </div>
      </div>
      <div className="p-4">
        <div className="h-4 w-full bg-zinc-800 rounded mb-2" />
        <div className="h-4 w-3/4 bg-zinc-800 rounded" />
      </div>
      <div className="px-4 pb-4">
        <div className="flex items-center gap-4 pt-3 border-t border-zinc-800/50">
          <div className="h-8 w-16 bg-zinc-800 rounded" />
          <div className="h-8 w-16 bg-zinc-800 rounded" />
          <div className="h-8 w-16 bg-zinc-800 rounded" />
        </div>
      </div>
    </div>
  )
}
