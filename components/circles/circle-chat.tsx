"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import NextImage from "next/image"
import { motion, AnimatePresence } from "framer-motion"
import {
  Send,
  Image as ImageIcon,
  Smile,
  MoreVertical,
  Reply,
  Pin,
  Trash2,
  Edit3,
  ChevronLeft,
  Users,
  Settings,
  Bell,
  BellOff,
  Info,
  X,
  Check,
  ArrowDown,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

/* ==========================================================================
   TYPES
   ========================================================================== */

interface Message {
  id: string
  circle_id: string
  sender_id: string
  content: string
  message_type: "text" | "image" | "video" | "audio" | "file" | "system" | "poll"
  media_url?: string
  reply_to_id?: string
  reactions: Record<string, string[]>
  is_edited: boolean
  edited_at?: string
  is_pinned: boolean
  created_at: string
  sender?: {
    id: string
    first_name: string
    avatar_url?: string
  }
  reply_to?: {
    id: string
    content: string
    sender?: {
      id: string
      first_name: string
    }
  }
}

interface CircleInfo {
  id: string
  name: string
  description?: string
  avatar_url?: string
  theme_color: string
  emoji?: string
  member_count: number
}

/* ==========================================================================
   EMOJI PICKER (Simple version)
   ========================================================================== */

const COMMON_EMOJIS = ["❤️", "😂", "😮", "😢", "😡", "👍", "👎", "🔥", "💯", "🎉"]

interface EmojiPickerProps {
  onSelect: (emoji: string) => void
  onClose: () => void
}

function EmojiPicker({ onSelect, onClose }: EmojiPickerProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="absolute bottom-full mb-2 right-0 bg-zinc-800 rounded-xl p-2 border border-zinc-700 z-10"
    >
      <div className="flex gap-1">
        {COMMON_EMOJIS.map((emoji) => (
          <button
            key={emoji}
            onClick={() => {
              onSelect(emoji)
              onClose()
            }}
            className="w-8 h-8 flex items-center justify-center hover:bg-zinc-700 rounded-lg transition-colors"
          >
            {emoji}
          </button>
        ))}
      </div>
    </motion.div>
  )
}

/* ==========================================================================
   MESSAGE BUBBLE
   ========================================================================== */

interface MessageBubbleProps {
  message: Message
  isOwn: boolean
  teenId: string
  onReply: () => void
  onReact: (emoji: string) => void
  onDelete?: () => void
  onPin?: () => void
  showSender: boolean
  themeColor: string
}

function MessageBubble({
  message,
  isOwn,
  teenId,
  onReply,
  onReact,
  onDelete,
  onPin,
  showSender,
  themeColor,
}: MessageBubbleProps) {
  const [showMenu, setShowMenu] = useState(false)
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)

  // Format time
  const formatTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleTimeString("fr-FR", {
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  // System message
  if (message.message_type === "system") {
    return (
      <div className="flex justify-center my-4">
        <span className="text-xs text-zinc-500 bg-zinc-800/50 px-3 py-1 rounded-full">
          {message.sender?.first_name} {message.content}
        </span>
      </div>
    )
  }

  // Get reaction counts
  const reactionCounts: { emoji: string; count: number; hasReacted: boolean }[] = []
  Object.entries(message.reactions || {}).forEach(([emoji, users]) => {
    if (users.length > 0) {
      reactionCounts.push({
        emoji,
        count: users.length,
        hasReacted: users.includes(teenId),
      })
    }
  })

  return (
    <div className={cn(
      "flex gap-3 group",
      isOwn ? "flex-row-reverse" : "flex-row"
    )}>
      {/* Avatar */}
      {!isOwn && (
        <div className="flex-shrink-0">
          {showSender ? (
            <div className="relative w-8 h-8 rounded-full bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center overflow-hidden">
              {message.sender?.avatar_url ? (
                <NextImage
                  src={message.sender.avatar_url}
                  alt={message.sender.first_name}
                  fill
                  sizes="32px"
                  className="object-cover"
                />
              ) : (
                <span className="text-xs text-white font-bold">
                  {message.sender?.first_name?.[0] || "?"}
                </span>
              )}
            </div>
          ) : (
            <div className="w-8" />
          )}
        </div>
      )}

      {/* Message content */}
      <div className={cn("max-w-[75%] relative", isOwn && "items-end")}>
        {/* Sender name */}
        {showSender && !isOwn && (
          <p className="text-xs text-zinc-500 mb-1 ml-1">
            {message.sender?.first_name}
          </p>
        )}

        {/* Reply preview */}
        {message.reply_to && (
          <div className={cn(
            "text-xs text-zinc-500 px-3 py-1.5 rounded-t-xl border-l-2 mb-0.5",
            isOwn
              ? "bg-zinc-700/50 border-cyan-400"
              : "bg-zinc-800/50 border-zinc-600"
          )}>
            <span className="font-medium">{message.reply_to.sender?.first_name}</span>
            <p className="truncate">{message.reply_to.content}</p>
          </div>
        )}

        {/* Bubble */}
        <div
          className={cn(
            "relative px-4 py-2 rounded-2xl",
            isOwn
              ? `bg-gradient-to-r from-${themeColor}-500 to-${themeColor}-600 text-white`
              : "bg-zinc-800 text-white",
            message.reply_to && "rounded-tl-md"
          )}
          style={isOwn ? {
            background: `linear-gradient(135deg, var(--${themeColor}-500, #06b6d4), var(--${themeColor}-600, #0891b2))`
          } : undefined}
        >
          {/* Media */}
          {message.media_url && message.message_type === "image" && (
            <NextImage
              src={message.media_url}
              alt=""
              width={400}
              height={400}
              sizes="(max-width: 640px) 75vw, 400px"
              className="rounded-lg max-w-full h-auto mb-2"
            />
          )}

          {/* Text content */}
          <p className="whitespace-pre-wrap break-words">{message.content}</p>

          {/* Time and edit indicator */}
          <div className={cn(
            "flex items-center gap-1 mt-1",
            isOwn ? "justify-end" : "justify-start"
          )}>
            <span className={cn(
              "text-[10px]",
              isOwn ? "text-white/60" : "text-zinc-500"
            )}>
              {formatTime(message.created_at)}
            </span>
            {message.is_edited && (
              <span className={cn(
                "text-[10px]",
                isOwn ? "text-white/60" : "text-zinc-500"
              )}>
                (modifie)
              </span>
            )}
            {message.is_pinned && (
              <Pin className={cn(
                "w-3 h-3",
                isOwn ? "text-white/60" : "text-zinc-500"
              )} />
            )}
          </div>

          {/* Actions (visible on hover) */}
          <div className={cn(
            "absolute top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1",
            isOwn ? "-left-20" : "-right-20"
          )}>
            <button
              onClick={() => setShowEmojiPicker(!showEmojiPicker)}
              className="p-1.5 rounded-full bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white"
            >
              <Smile className="w-4 h-4" />
            </button>
            <button
              onClick={onReply}
              className="p-1.5 rounded-full bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white"
            >
              <Reply className="w-4 h-4" />
            </button>
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="p-1.5 rounded-full bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white"
            >
              <MoreVertical className="w-4 h-4" />
            </button>
          </div>

          {/* Emoji picker */}
          <AnimatePresence>
            {showEmojiPicker && (
              <EmojiPicker
                onSelect={onReact}
                onClose={() => setShowEmojiPicker(false)}
              />
            )}
          </AnimatePresence>

          {/* Context menu */}
          <AnimatePresence>
            {showMenu && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className={cn(
                  "absolute top-full mt-1 w-36 bg-zinc-800 rounded-xl border border-zinc-700 overflow-hidden z-10",
                  isOwn ? "right-0" : "left-0"
                )}
              >
                <button
                  onClick={() => {
                    onReply()
                    setShowMenu(false)
                  }}
                  className="w-full px-4 py-2 text-left text-sm text-zinc-300 hover:bg-zinc-700 flex items-center gap-2"
                >
                  <Reply className="w-4 h-4" />
                  Repondre
                </button>
                {onPin && (
                  <button
                    onClick={() => {
                      onPin()
                      setShowMenu(false)
                    }}
                    className="w-full px-4 py-2 text-left text-sm text-zinc-300 hover:bg-zinc-700 flex items-center gap-2"
                  >
                    <Pin className="w-4 h-4" />
                    {message.is_pinned ? "Desepingler" : "Epingler"}
                  </button>
                )}
                {isOwn && onDelete && (
                  <button
                    onClick={() => {
                      onDelete()
                      setShowMenu(false)
                    }}
                    className="w-full px-4 py-2 text-left text-sm text-red-400 hover:bg-zinc-700 flex items-center gap-2"
                  >
                    <Trash2 className="w-4 h-4" />
                    Supprimer
                  </button>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Reactions */}
        {reactionCounts.length > 0 && (
          <div className={cn(
            "flex gap-1 mt-1 flex-wrap",
            isOwn ? "justify-end" : "justify-start"
          )}>
            {reactionCounts.map(({ emoji, count, hasReacted }) => (
              <button
                key={emoji}
                onClick={() => onReact(emoji)}
                className={cn(
                  "px-2 py-0.5 rounded-full text-xs flex items-center gap-1 transition-colors",
                  hasReacted
                    ? "bg-cyan-500/20 text-cyan-400"
                    : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
                )}
              >
                <span>{emoji}</span>
                <span>{count}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

/* ==========================================================================
   CIRCLE CHAT
   ========================================================================== */

interface CircleChatProps {
  circleId: string
  teenId: string
  circleInfo: CircleInfo
  onBack: () => void
  onOpenSettings?: () => void
  onOpenMembers?: () => void
}

export function CircleChat({
  circleId,
  teenId,
  circleInfo,
  onBack,
  onOpenSettings,
  onOpenMembers,
}: CircleChatProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [pinnedMessages, setPinnedMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(true)
  const [inputValue, setInputValue] = useState("")
  const [replyTo, setReplyTo] = useState<Message | null>(null)
  const [showScrollButton, setShowScrollButton] = useState(false)
  const [hasMore, setHasMore] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const messagesContainerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Fetch messages
  const fetchMessages = useCallback(async (before?: string) => {
    if (before) {
      setLoadingMore(true)
    } else {
      setLoading(true)
    }

    try {
      let url = `/api/teen/circles/messages?circleId=${circleId}&teenId=${teenId}`
      if (before) url += `&before=${before}`

      const response = await fetch(url)
      const data = await response.json()

      if (data.success) {
        if (before) {
          setMessages((prev) => [...data.messages, ...prev])
        } else {
          setMessages(data.messages)
          setPinnedMessages(data.pinnedMessages || [])
        }
        setHasMore(data.hasMore)
      }
    } catch (error) {
      console.error("Error fetching messages:", error)
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }, [circleId, teenId])

  useEffect(() => {
    fetchMessages()
  }, [fetchMessages])

  // Scroll to bottom on new messages
  useEffect(() => {
    if (!loading && messages.length > 0) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
    }
  }, [loading, messages.length])

  // Handle scroll for "scroll to bottom" button
  const handleScroll = () => {
    const container = messagesContainerRef.current
    if (container) {
      const { scrollTop, scrollHeight, clientHeight } = container
      const isNearBottom = scrollHeight - scrollTop - clientHeight < 100
      setShowScrollButton(!isNearBottom)
    }
  }

  // Send message
  const sendMessage = async () => {
    if (!inputValue.trim()) return

    const tempId = `temp-${Date.now()}`
    const tempMessage: Message = {
      id: tempId,
      circle_id: circleId,
      sender_id: teenId,
      content: inputValue.trim(),
      message_type: "text",
      reactions: {},
      is_edited: false,
      is_pinned: false,
      created_at: new Date().toISOString(),
      sender: { id: teenId, first_name: "Moi" },
      reply_to_id: replyTo?.id,
      reply_to: replyTo ? {
        id: replyTo.id,
        content: replyTo.content,
        sender: replyTo.sender,
      } : undefined,
    }

    // Optimistic update
    setMessages((prev) => [...prev, tempMessage])
    setInputValue("")
    setReplyTo(null)

    try {
      const response = await fetch("/api/teen/circles/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          teenId,
          circleId,
          action: "send",
          content: inputValue.trim(),
          replyToId: replyTo?.id,
        }),
      })

      const data = await response.json()
      if (data.success) {
        // Replace temp message with real one
        setMessages((prev) =>
          prev.map((m) => (m.id === tempId ? data.message : m))
        )
      }
    } catch (error) {
      console.error("Error sending message:", error)
      // Remove temp message on error
      setMessages((prev) => prev.filter((m) => m.id !== tempId))
    }
  }

  // Handle reactions
  const handleReact = async (messageId: string, emoji: string) => {
    const message = messages.find((m) => m.id === messageId)
    if (!message) return

    const hasReacted = message.reactions?.[emoji]?.includes(teenId)

    try {
      await fetch("/api/teen/circles/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          teenId,
          circleId,
          action: hasReacted ? "unreact" : "react",
          messageId,
          emoji,
        }),
      })

      // Update locally
      setMessages((prev) =>
        prev.map((m) => {
          if (m.id !== messageId) return m

          const newReactions = { ...m.reactions }
          if (hasReacted) {
            newReactions[emoji] = (newReactions[emoji] || []).filter(
              (id) => id !== teenId
            )
            if (newReactions[emoji].length === 0) {
              delete newReactions[emoji]
            }
          } else {
            newReactions[emoji] = [...(newReactions[emoji] || []), teenId]
          }

          return { ...m, reactions: newReactions }
        })
      )
    } catch (error) {
      console.error("Error reacting:", error)
    }
  }

  // Handle delete
  const handleDelete = async (messageId: string) => {
    if (!confirm("Supprimer ce message ?")) return

    try {
      await fetch("/api/teen/circles/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          teenId,
          circleId,
          action: "delete",
          messageId,
        }),
      })

      setMessages((prev) => prev.filter((m) => m.id !== messageId))
    } catch (error) {
      console.error("Error deleting:", error)
    }
  }

  // Group messages by date
  const groupedMessages: { date: string; messages: Message[] }[] = []
  let currentDate = ""

  messages.forEach((message) => {
    const messageDate = new Date(message.created_at).toLocaleDateString("fr-FR", {
      weekday: "long",
      day: "numeric",
      month: "long",
    })

    if (messageDate !== currentDate) {
      currentDate = messageDate
      groupedMessages.push({ date: messageDate, messages: [message] })
    } else {
      groupedMessages[groupedMessages.length - 1].messages.push(message)
    }
  })

  // Check if should show sender (different from previous message)
  const shouldShowSender = (index: number, messages: Message[]) => {
    if (index === 0) return true
    const prevMessage = messages[index - 1]
    const currentMessage = messages[index]

    if (prevMessage.sender_id !== currentMessage.sender_id) return true

    // Show sender if more than 5 minutes apart
    const timeDiff = new Date(currentMessage.created_at).getTime() -
      new Date(prevMessage.created_at).getTime()
    return timeDiff > 5 * 60 * 1000
  }

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-cyan-500 border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col bg-zinc-950">
      {/* Header */}
      <div className="flex items-center gap-3 p-4 border-b border-zinc-800 bg-zinc-900">
        <button
          onClick={onBack}
          className="p-2 rounded-xl hover:bg-zinc-800 transition-colors"
        >
          <ChevronLeft className="w-5 h-5 text-zinc-400" />
        </button>

        <div
          className={cn(
            "w-10 h-10 rounded-xl flex items-center justify-center text-lg",
            "bg-gradient-to-br from-cyan-500 to-blue-500"
          )}
        >
          {circleInfo.emoji || <Users className="w-5 h-5 text-white" />}
        </div>

        <div className="flex-1 min-w-0">
          <h2 className="font-bold text-white truncate">{circleInfo.name}</h2>
          <p className="text-xs text-zinc-500">{circleInfo.member_count} membres</p>
        </div>

        <button
          onClick={onOpenMembers}
          className="p-2 rounded-xl hover:bg-zinc-800 transition-colors"
        >
          <Users className="w-5 h-5 text-zinc-400" />
        </button>
        <button
          onClick={onOpenSettings}
          className="p-2 rounded-xl hover:bg-zinc-800 transition-colors"
        >
          <Settings className="w-5 h-5 text-zinc-400" />
        </button>
      </div>

      {/* Pinned messages */}
      {pinnedMessages.length > 0 && (
        <div className="p-2 bg-yellow-500/10 border-b border-yellow-500/20">
          <div className="flex items-center gap-2 text-yellow-400 text-sm">
            <Pin className="w-4 h-4" />
            <span className="font-medium">
              {pinnedMessages.length} message{pinnedMessages.length > 1 ? "s" : ""} epingle{pinnedMessages.length > 1 ? "s" : ""}
            </span>
          </div>
        </div>
      )}

      {/* Messages */}
      <div
        ref={messagesContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto p-4 space-y-4"
      >
        {/* Load more button */}
        {hasMore && (
          <div className="text-center">
            <Button
              onClick={() => fetchMessages(messages[0]?.id)}
              disabled={loadingMore}
              variant="outline"
              size="sm"
              className="border-zinc-700"
            >
              {loadingMore ? "Chargement..." : "Charger plus"}
            </Button>
          </div>
        )}

        {/* Messages grouped by date */}
        {groupedMessages.map((group) => (
          <div key={group.date}>
            {/* Date separator */}
            <div className="flex items-center gap-4 my-4">
              <div className="flex-1 h-px bg-zinc-800" />
              <span className="text-xs text-zinc-500 capitalize">{group.date}</span>
              <div className="flex-1 h-px bg-zinc-800" />
            </div>

            {/* Messages */}
            <div className="space-y-2">
              {group.messages.map((message, index) => (
                <MessageBubble
                  key={message.id}
                  message={message}
                  isOwn={message.sender_id === teenId}
                  teenId={teenId}
                  onReply={() => {
                    setReplyTo(message)
                    inputRef.current?.focus()
                  }}
                  onReact={(emoji) => handleReact(message.id, emoji)}
                  onDelete={() => handleDelete(message.id)}
                  showSender={shouldShowSender(index, group.messages)}
                  themeColor={circleInfo.theme_color}
                />
              ))}
            </div>
          </div>
        ))}

        <div ref={messagesEndRef} />
      </div>

      {/* Scroll to bottom button */}
      <AnimatePresence>
        {showScrollButton && (
          <motion.button
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            onClick={() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })}
            className="absolute bottom-24 right-4 p-3 rounded-full bg-zinc-800 border border-zinc-700 shadow-lg"
          >
            <ArrowDown className="w-5 h-5 text-zinc-400" />
          </motion.button>
        )}
      </AnimatePresence>

      {/* Reply preview */}
      <AnimatePresence>
        {replyTo && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="px-4 pt-2 bg-zinc-900 border-t border-zinc-800"
          >
            <div className="flex items-center gap-2 p-2 bg-zinc-800 rounded-lg">
              <Reply className="w-4 h-4 text-cyan-400" />
              <div className="flex-1 min-w-0">
                <p className="text-xs text-cyan-400">{replyTo.sender?.first_name}</p>
                <p className="text-sm text-zinc-400 truncate">{replyTo.content}</p>
              </div>
              <button
                onClick={() => setReplyTo(null)}
                className="p-1 hover:bg-zinc-700 rounded"
              >
                <X className="w-4 h-4 text-zinc-500" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Input */}
      <div className="p-4 bg-zinc-900 border-t border-zinc-800">
        <div className="flex items-center gap-2">
          <button className="p-2 rounded-xl hover:bg-zinc-800 transition-colors">
            <ImageIcon className="w-5 h-5 text-zinc-400" />
          </button>

          <div className="flex-1 relative">
            <input
              ref={inputRef}
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && sendMessage()}
              placeholder="Message..."
              className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-2.5 text-white pr-12"
            />
            <button className="absolute right-3 top-1/2 -translate-y-1/2">
              <Smile className="w-5 h-5 text-zinc-500" />
            </button>
          </div>

          <Button
            onClick={sendMessage}
            disabled={!inputValue.trim()}
            className="bg-gradient-to-r from-cyan-500 to-blue-500 p-2.5"
          >
            <Send className="w-5 h-5" />
          </Button>
        </div>
      </div>
    </div>
  )
}
