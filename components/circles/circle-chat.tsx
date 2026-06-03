"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import NextImage from "next/image"
import { confirmToast } from "@/lib/ui/confirm-toast"
import {
  Send,
  Smile,
  MoreVertical,
  Reply,
  Pin,
  Trash2,
  ChevronLeft,
  Users,
  Settings,
  X,
  ArrowDown,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { DarkSurface, NivEmpty } from "@/components/brand"

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
   THEME COLOR → token charte (set fixe, jamais de classe dynamique)
   ========================================================================== */

import type { DarkTone } from "@/components/brand/niv"

const THEME_TONE: Record<string, DarkTone> = {
  cyan: "teal",
  blue: "teal",
  teal: "teal",
  green: "lime",
  lime: "lime",
  yellow: "gold",
  gold: "gold",
  orange: "coral",
  coral: "coral",
  red: "coral",
  purple: "pink",
  pink: "pink",
}

function toTone(themeColor: string): DarkTone {
  return THEME_TONE[themeColor] ?? "teal"
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
    <div className="absolute bottom-full mb-2 right-0 bg-white rounded-xl p-2 border-2 border-ink shadow-stkr-sm z-10">
      <div className="flex gap-1">
        {COMMON_EMOJIS.map((emoji) => (
          <button
            key={emoji}
            onClick={() => {
              onSelect(emoji)
              onClose()
            }}
            className="w-8 h-8 flex items-center justify-center hover:bg-muted rounded-lg transition-colors"
          >
            {emoji}
          </button>
        ))}
      </div>
    </div>
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
  tone: DarkTone
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
  tone,
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
        <span className="text-xs text-mute bg-white border-2 border-ink px-3 py-1 rounded-full">
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
            <div className="relative w-8 h-8 rounded-full border-2 border-ink bg-paper flex items-center justify-center overflow-hidden">
              {message.sender?.avatar_url ? (
                <NextImage
                  src={message.sender.avatar_url}
                  alt={message.sender.first_name}
                  fill
                  sizes="32px"
                  className="object-cover"
                />
              ) : (
                <span className="text-xs text-ink font-bold">
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
          <p className="text-xs text-mute mb-1 ml-1">
            {message.sender?.first_name}
          </p>
        )}

        {/* Reply preview */}
        {message.reply_to && (
          <div className={cn(
            "text-xs text-mute px-3 py-1.5 rounded-t-xl border-l-2 mb-0.5",
            isOwn
              ? "bg-muted border-ink"
              : "bg-white border-ink"
          )}>
            <span className="font-medium">{message.reply_to.sender?.first_name}</span>
            <p className="truncate">{message.reply_to.content}</p>
          </div>
        )}

        {/* Bubble — moi = surface sombre ; autre = sticker blanc bordure ink */}
        {isOwn ? (
          <DarkSurface
            tone={tone}
            className={cn("px-4 py-2", message.reply_to && "rounded-tl-md")}
          >
            <BubbleBody message={message} isOwn formatTime={formatTime} />
            <BubbleActions
              isOwn
              showEmojiPicker={showEmojiPicker}
              setShowEmojiPicker={setShowEmojiPicker}
              showMenu={showMenu}
              setShowMenu={setShowMenu}
              onReply={onReply}
              onReact={onReact}
              onDelete={onDelete}
              onPin={onPin}
              isPinned={message.is_pinned}
            />
          </DarkSurface>
        ) : (
          <div
            className={cn(
              "relative px-4 py-2 rounded-2xl border-2 border-ink bg-white text-ink",
              message.reply_to && "rounded-tl-md"
            )}
          >
            <BubbleBody message={message} isOwn={false} formatTime={formatTime} />
            <BubbleActions
              isOwn={false}
              showEmojiPicker={showEmojiPicker}
              setShowEmojiPicker={setShowEmojiPicker}
              showMenu={showMenu}
              setShowMenu={setShowMenu}
              onReply={onReply}
              onReact={onReact}
              onDelete={onDelete}
              onPin={onPin}
              isPinned={message.is_pinned}
            />
          </div>
        )}

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
                  "px-2 py-0.5 rounded-full border-2 border-ink text-xs flex items-center gap-1 transition-colors",
                  hasReacted
                    ? "bg-pink text-ink"
                    : "bg-white text-mute hover:bg-muted"
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

/** Corps de bulle (média + texte + heure/édité/épinglé). */
function BubbleBody({
  message,
  isOwn,
  formatTime,
}: {
  message: Message
  isOwn: boolean
  formatTime: (s: string) => string
}) {
  return (
    <>
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
        <span className={cn("text-[10px]", isOwn ? "text-paper/60" : "text-mute")}>
          {formatTime(message.created_at)}
        </span>
        {message.is_edited && (
          <span className={cn("text-[10px]", isOwn ? "text-paper/60" : "text-mute")}>
            (modifié)
          </span>
        )}
        {message.is_pinned && (
          <Pin className={cn("w-3 h-3", isOwn ? "text-paper/60" : "text-mute")} />
        )}
      </div>
    </>
  )
}

/** Actions au survol + menu contextuel + emoji picker. */
function BubbleActions({
  isOwn,
  showEmojiPicker,
  setShowEmojiPicker,
  showMenu,
  setShowMenu,
  onReply,
  onReact,
  onDelete,
  onPin,
  isPinned,
}: {
  isOwn: boolean
  showEmojiPicker: boolean
  setShowEmojiPicker: (v: boolean) => void
  showMenu: boolean
  setShowMenu: (v: boolean) => void
  onReply: () => void
  onReact: (emoji: string) => void
  onDelete?: () => void
  onPin?: () => void
  isPinned: boolean
}) {
  return (
    <>
      <div className={cn(
        "absolute top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1",
        isOwn ? "-left-20" : "-right-20"
      )}>
        <button
          onClick={() => setShowEmojiPicker(!showEmojiPicker)}
          className="p-1.5 rounded-full bg-white border-2 border-ink hover:bg-muted text-mute hover:text-ink"
        >
          <Smile className="w-4 h-4" />
        </button>
        <button
          onClick={onReply}
          className="p-1.5 rounded-full bg-white border-2 border-ink hover:bg-muted text-mute hover:text-ink"
        >
          <Reply className="w-4 h-4" />
        </button>
        <button
          onClick={() => setShowMenu(!showMenu)}
          className="p-1.5 rounded-full bg-white border-2 border-ink hover:bg-muted text-mute hover:text-ink"
        >
          <MoreVertical className="w-4 h-4" />
        </button>
      </div>

      {/* Emoji picker */}
      {showEmojiPicker && (
        <EmojiPicker
          onSelect={onReact}
          onClose={() => setShowEmojiPicker(false)}
        />
      )}

      {/* Context menu */}
      {showMenu && (
        <div className={cn(
          "absolute top-full mt-1 w-36 bg-white rounded-xl border-2 border-ink overflow-hidden shadow-stkr-sm z-10",
          isOwn ? "right-0" : "left-0"
        )}>
          <button
            onClick={() => {
              onReply()
              setShowMenu(false)
            }}
            className="w-full px-4 py-2 text-left text-sm text-ink-2 hover:bg-muted flex items-center gap-2"
          >
            <Reply className="w-4 h-4" />
            Répondre
          </button>
          {onPin && (
            <button
              onClick={() => {
                onPin()
                setShowMenu(false)
              }}
              className="w-full px-4 py-2 text-left text-sm text-ink-2 hover:bg-muted flex items-center gap-2"
            >
              <Pin className="w-4 h-4" />
              {isPinned ? "Désépingler" : "Épingler"}
            </button>
          )}
          {isOwn && onDelete && (
            <button
              onClick={() => {
                onDelete()
                setShowMenu(false)
              }}
              className="w-full px-4 py-2 text-left text-sm text-destructive hover:bg-muted flex items-center gap-2"
            >
              <Trash2 className="w-4 h-4" />
              Supprimer
            </button>
          )}
        </div>
      )}
    </>
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

  const tone = toTone(circleInfo.theme_color)

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
    if (!(await confirmToast({ message: "Supprimer ce message ?", destructive: true }))) return

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
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-pink border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="h-[calc(100dvh-4rem-2rem)] md:h-full flex flex-col bg-background">
      {/* Header */}
      <div className="flex items-center gap-3 p-4 border-b-2 border-ink bg-white">
        <button
          onClick={onBack}
          className="p-2 rounded-xl hover:bg-muted transition-colors"
        >
          <ChevronLeft className="w-5 h-5 text-mute" />
        </button>

        <div className="w-10 h-10 rounded-xl border-2 border-ink bg-paper flex items-center justify-center text-lg">
          {circleInfo.emoji || <Users className="w-5 h-5 text-ink" />}
        </div>

        <div className="flex-1 min-w-0">
          <h2 className="font-bold text-ink truncate">{circleInfo.name}</h2>
          <p className="text-xs text-mute">{circleInfo.member_count} membres</p>
        </div>

        <button
          onClick={onOpenMembers}
          className="p-2 rounded-xl hover:bg-muted transition-colors"
        >
          <Users className="w-5 h-5 text-mute" />
        </button>
        <button
          onClick={onOpenSettings}
          className="p-2 rounded-xl hover:bg-muted transition-colors"
        >
          <Settings className="w-5 h-5 text-mute" />
        </button>
      </div>

      {/* Pinned messages */}
      {pinnedMessages.length > 0 && (
        <div className="p-2 bg-gold/10 border-b-2 border-ink">
          <div className="flex items-center gap-2 text-gold text-sm">
            <Pin className="w-4 h-4" />
            <span className="font-medium">
              {pinnedMessages.length} message{pinnedMessages.length > 1 ? "s" : ""} épinglé{pinnedMessages.length > 1 ? "s" : ""}
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
        {/* Empty state */}
        {groupedMessages.length === 0 && (
          <div className="flex h-full items-center justify-center py-12">
            <NivEmpty
              mood="happy"
              title="Dis salam à ton cercle"
              description="Aucun message pour l'instant. Lance la discussion !"
            />
          </div>
        )}

        {/* Load more button */}
        {hasMore && (
          <div className="text-center">
            <Button
              onClick={() => fetchMessages(messages[0]?.id)}
              disabled={loadingMore}
              variant="outline"
              size="sm"
            >
              {loadingMore ? "Chargement…" : "Charger plus"}
            </Button>
          </div>
        )}

        {/* Messages grouped by date */}
        {groupedMessages.map((group) => (
          <div key={group.date}>
            {/* Date separator */}
            <div className="flex items-center gap-4 my-4">
              <div className="flex-1 h-px bg-ink/20" />
              <span className="rounded-full border-2 border-ink bg-white px-3 py-0.5 font-mono text-[10px] uppercase tracking-[0.1em] text-mute">{group.date}</span>
              <div className="flex-1 h-px bg-ink/20" />
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
                  tone={tone}
                />
              ))}
            </div>
          </div>
        ))}

        <div ref={messagesEndRef} />
      </div>

      {/* Scroll to bottom button */}
      {showScrollButton && (
        <button
          onClick={() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })}
          className="absolute bottom-24 right-4 p-3 rounded-full bg-white border-2 border-ink shadow-stkr-sm"
        >
          <ArrowDown className="w-5 h-5 text-mute" />
        </button>
      )}

      {/* Reply preview */}
      {replyTo && (
        <div className="px-4 pt-2 bg-white border-t-2 border-ink">
          <div className="flex items-center gap-2 p-2 bg-paper border-2 border-ink rounded-lg">
            <Reply className="w-4 h-4 text-pink" />
            <div className="flex-1 min-w-0">
              <p className="text-xs text-pink">{replyTo.sender?.first_name}</p>
              <p className="text-sm text-mute truncate">{replyTo.content}</p>
            </div>
            <button
              onClick={() => setReplyTo(null)}
              className="p-1 hover:bg-muted rounded"
            >
              <X className="w-4 h-4 text-mute" />
            </button>
          </div>
        </div>
      )}

      {/* Input */}
      <div className="p-4 bg-white border-t-2 border-ink">
        <div className="flex items-center gap-2">
          <div className="flex-1 relative">
            <input
              ref={inputRef}
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && sendMessage()}
              placeholder="Message…"
              className="w-full bg-white border-2 border-ink rounded-xl px-4 py-2.5 text-ink transition-colors focus:border-pink focus:outline-none"
            />
          </div>

          <Button
            onClick={sendMessage}
            disabled={!inputValue.trim()}
            variant="pink"
            size="icon"
          >
            <Send className="w-5 h-5" />
          </Button>
        </div>
      </div>
    </div>
  )
}
